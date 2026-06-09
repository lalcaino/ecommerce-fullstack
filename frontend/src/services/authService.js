const BASE = 'http://localhost:8000/api/auth'

export async function loginRequest({ email, password }) {
  const res = await fetch(`${BASE}/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Error al iniciar sesión')
  localStorage.setItem('access',  data.access)
  localStorage.setItem('refresh', data.refresh)
  return data
}

export async function registroRequest({
  nombre, nombre_representante, email, password,
  rut, razonSocial, nombre_comercial, giro, giro_codigo, region,
}) {
  const res = await fetch(`${BASE}/registro/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nombre,
      nombre_representante,
      email,
      password,
      rut,
      razon_social:     razonSocial,
      nombre_comercial,
      giro,
      giro_codigo,
      region,
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Error al registrarse')
  localStorage.setItem('access',  data.access)
  localStorage.setItem('refresh', data.refresh)
  return data
}

export async function refreshToken() {
  const refresh = localStorage.getItem('refresh')
  if (!refresh) throw new Error('No hay sesión activa')
  const res = await fetch(`${BASE}/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  })
  const data = await res.json()
  if (!res.ok) { logout(); throw new Error('Sesión expirada') }
  localStorage.setItem('access', data.access)
  return data.access
}

export function logout() {
  localStorage.removeItem('access')
  localStorage.removeItem('refresh')
}

export function getToken() {
  return localStorage.getItem('access')
}

export function isAuthenticated() {
  return !!localStorage.getItem('access')
}

export async function apiFetch(url, options = {}) {
  const token = getToken()
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  if (res.status === 401) {
    try {
      const newToken = await refreshToken()
      const retry = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${newToken}`,
          ...options.headers,
        },
      })
      return retry
    } catch {
      logout()
      window.location.href = '/login'
      throw new Error('Sesión expirada')
    }
  }
  return res
}

// Lee los datos del usuario desde el JWT — ahora incluye rol y empresa
export function getUsuario() {
  const token = localStorage.getItem('access')
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return {
      nombre:          payload.first_name   || payload.username || 'Usuario',
      email:           payload.username     || '',
      rol:             payload.rol          || 'admin',
      empresa_rut:     payload.empresa_rut  || '',
      empresa_nombre:  payload.empresa_nombre || '',
    }
  } catch {
    return null
  }
}