/**
 * api.js - Patrón Repository + Circuit Breaker para comunicación con BFF
 * Abstrae todos los accesos HTTP, permitiendo cambiar la implementación sin afectar la UI.
 */
import axios from 'axios'
import { getToken, refreshToken, logout } from './authService'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

// ─── Circuit Breaker ────────────────────────────────────────────────────────
class CircuitBreaker {
  constructor(failureThreshold = 3, timeout = 10000) {
    this.failureCount     = 0
    this.failureThreshold = failureThreshold
    this.timeout          = timeout
    this.state            = 'CLOSED'
    this.nextAttempt      = null
  }

  async call(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit OPEN: servicio no disponible temporalmente')
      }
      this.state = 'HALF_OPEN'
    }
    try {
      const result = await fn()
      this._onSuccess()
      return result
    } catch (err) {
      this._onFailure()
      throw err
    }
  }

  _onSuccess() { this.failureCount = 0; this.state = 'CLOSED' }
  _onFailure() {
    this.failureCount++
    if (this.failureCount >= this.failureThreshold) {
      this.state       = 'OPEN'
      this.nextAttempt = Date.now() + this.timeout
    }
  }

  getState() { return this.state }
}

// ─── HTTP Client base ────────────────────────────────────────────────────────
const http = axios.create({
  baseURL: BASE_URL,
  timeout: 8000,
  headers: { 'Content-Type': 'application/json' },
})

// Inyecta el token en cada request
http.interceptors.request.use(config => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Si el token expiró, intenta renovarlo una vez
let isRefreshing = false
let queue = []

const processQueue = (error, token = null) => {
  queue.forEach(({ resolve, reject }) => error ? reject(error) : resolve(token))
  queue = []
}

http.interceptors.response.use(
  res => res.data,
  async err => {
    const original = err.config

    if (err?.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          queue.push({ resolve, reject })
        }).then(token => {
          original.headers.Authorization = `Bearer ${token}`
          return http(original)
        })
      }

      original._retry  = true
      isRefreshing     = true

      try {
        const newToken = await refreshToken()
        processQueue(null, newToken)
        original.headers.Authorization = `Bearer ${newToken}`
        return http(original)
      } catch (refreshErr) {
        processQueue(refreshErr, null)
        logout()
        window.location.href = '/login'
        return Promise.reject(refreshErr)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(err?.response?.data || err)
  }
)

// ─── Repository: Inventario ─────────────────────────────────────────────────
const inventarioCB = new CircuitBreaker()

export const InventarioRepository = {
  getAll:          ()         => inventarioCB.call(() => http.get('/inventario/')),
  getById:         (id)       => inventarioCB.call(() => http.get(`/inventario/${id}/`)),
  create:          (data)     => inventarioCB.call(() => http.post('/inventario/', data)),
  update:          (id, data) => inventarioCB.call(() => http.put(`/inventario/${id}/`, data)),
  delete:          (id)       => inventarioCB.call(() => http.delete(`/inventario/${id}/`)),
  getCircuitState: ()         => inventarioCB.getState(),
}

// ─── Repository: Pedidos ─────────────────────────────────────────────────────
const pedidosCB = new CircuitBreaker()

export const PedidosRepository = {
  getAll:          ()              => pedidosCB.call(() => http.get('/pedidos/')),
  getById:         (id)            => pedidosCB.call(() => http.get(`/pedidos/${id}/`)),
  create:          (data)          => pedidosCB.call(() => http.post('/pedidos/', data)),
  updateEstado:    (id, estado)    => pedidosCB.call(() => http.patch(`/pedidos/${id}/`, { estado })),
  getCircuitState: ()              => pedidosCB.getState(),
}

// ─── Repository: Dashboard ───────────────────────────────────────────────────
const dashboardCB = new CircuitBreaker()

export const DashboardRepository = {
  getSummary: () => dashboardCB.call(() => http.get('/dashboard/')),
}