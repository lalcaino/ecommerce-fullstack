/**
 * api_envios.js — Repository + Circuit Breaker para ms-envios
 *
 * AÑADIR al final de frontend/src/services/api.js
 * (el cliente `http` y CircuitBreaker ya están definidos allí)
 *
 * O importar desde este archivo si prefieres mantenerlo separado:
 *   import { EnviosRepository, ConductoresRepository } from './api_envios'
 */

import axios from 'axios'
import { getToken, refreshToken, logout } from './authService'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

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
      if (Date.now() < this.nextAttempt) throw new Error('Circuit OPEN: servicio no disponible')
      this.state = 'HALF_OPEN'
    }
    try {
      const result = await fn()
      this.failureCount = 0
      this.state = 'CLOSED'
      return result
    } catch (err) {
      this.failureCount++
      if (this.failureCount >= this.failureThreshold) {
        this.state       = 'OPEN'
        this.nextAttempt = Date.now() + this.timeout
      }
      throw err
    }
  }
  getState() { return this.state }
}

const http = axios.create({
  baseURL: BASE_URL,
  timeout: 8000,
  headers: { 'Content-Type': 'application/json' },
})

http.interceptors.request.use(config => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

http.interceptors.response.use(
  res => res.data,
  async err => {
    const original = err.config
    if (err?.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const newToken = await refreshToken()
        original.headers.Authorization = `Bearer ${newToken}`
        return http(original)
      } catch {
        logout()
        window.location.href = '/login'
      }
    }
    return Promise.reject(err?.response?.data || err)
  }
)

// ── Repository: Envíos ────────────────────────────────────────────────────────
const enviosCB = new CircuitBreaker()

export const EnviosRepository = {
  getAll:         ()             => enviosCB.call(() => http.get('/envios/')),
  getById:        (id)           => enviosCB.call(() => http.get(`/envios/${id}/`)),
  create:         (data)         => enviosCB.call(() => http.post('/envios/', data)),
  delete:         (id)           => enviosCB.call(() => http.delete(`/envios/${id}/`)),
  updateEstado:   (id, estado)   => enviosCB.call(() => http.patch(`/envios/${id}/estado/`, { estado })),
  updatePosicion: (id, lat, lon) => enviosCB.call(() => http.patch(`/envios/${id}/posicion/`, { lat, lon })),
  updateRuta:     (id, data)     => enviosCB.call(() => http.patch(`/envios/${id}/ruta/`, data)),
  getEnCurso:     ()             => enviosCB.call(() => http.get('/envios/en-curso/')),
  getByPedido:    (pedidoId)     => enviosCB.call(() => http.get(`/envios/pedido/${pedidoId}/`)),
  updateParada:   (id, estado)   => enviosCB.call(() => http.patch(`/paradas/${id}/estado/`, { estado })),
  getCircuitState: ()            => enviosCB.getState(),
}

// ── Repository: Conductores ───────────────────────────────────────────────────
const conductoresCB = new CircuitBreaker()

export const ConductoresRepository = {
  getAll:        (soloDisponibles = false) =>
    conductoresCB.call(() => http.get(`/conductores/${soloDisponibles ? '?disponibles=true' : ''}`)),
  create:        (data)     => conductoresCB.call(() => http.post('/conductores/', data)),
  update:        (id, data) => conductoresCB.call(() => http.put(`/conductores/${id}/`, data)),
  delete:        (id)       => conductoresCB.call(() => http.delete(`/conductores/${id}/`)),
}
