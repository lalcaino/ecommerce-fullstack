import { useState, useEffect, useCallback } from 'react'
import { getToken, getUsuario } from '../services/authService'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

const C = {
  brand: '#408A71', brandLight: '#e8f5f0',
  white: '#ffffff', bg: '#f4f7f6',
  gray100: '#f3f4f6', gray200: '#e5e7eb', gray400: '#9ca3af',
  gray500: '#6b7280', gray700: '#374151', gray800: '#1f2937',
  success: '#10b981', error: '#ef4444', warning: '#f59e0b',
}

async function apiBFF(path, options = {}) {
  const token = getToken()
  const res   = await fetch(`${BASE_URL}/auth${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization:  `Bearer ${token}`,
      ...options.headers,
    },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Error en la solicitud')
  return data
}

function Btn({ onClick, children, variant = 'primary', small, disabled }) {
  const variants = {
    primary:  { bg: C.brand,        color: '#fff',    border: 'none' },
    danger:   { bg: C.error + '18', color: C.error,   border: `1px solid ${C.error}30` },
    secondary:{ bg: C.gray100,      color: C.gray700, border: `1px solid ${C.gray200}` },
    success:  { bg: C.success+'18', color: C.success, border: `1px solid ${C.success}30` },
  }
  const v = variants[variant]
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: disabled ? C.gray200 : v.bg,
      color:      disabled ? C.gray400 : v.color,
      border: v.border, borderRadius: 8,
      padding: small ? '5px 12px' : '9px 18px',
      fontSize: small ? 12 : 14, fontWeight: 600,
      cursor: disabled ? 'not-allowed' : 'pointer',
      fontFamily: 'inherit',
    }}>
      {children}
    </button>
  )
}

export default function Empleados() {
  const usuario  = getUsuario()
  const [empleados, setEmpleados] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [showForm,  setShowForm]  = useState(false)
  const [form,      setForm]      = useState({ nombre: '', email: '', password: '' })
  const [formError, setFormError] = useState('')
  const [saving,    setSaving]    = useState(false)

  // Solo admins pueden ver esta sección
  if (usuario?.rol !== 'admin') {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: C.gray500 }}>
        <p style={{ fontSize: 16 }}>Sin acceso a esta sección.</p>
      </div>
    )
  }

  const fetchEmpleados = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiBFF('/empleados/')
      setEmpleados(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchEmpleados() }, [fetchEmpleados])

  const handleCrear = async () => {
    if (!form.nombre || !form.email || !form.password) {
      setFormError('Todos los campos son requeridos.')
      return
    }
    if (form.password.length < 6) {
      setFormError('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    setSaving(true)
    setFormError('')
    try {
      const nuevo = await apiBFF('/empleados/', {
        method: 'POST',
        body:   JSON.stringify(form),
      })
      setEmpleados(prev => [...prev, nuevo])
      setForm({ nombre: '', email: '', password: '' })
      setShowForm(false)
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActivo = async (emp) => {
    try {
      const updated = await apiBFF(`/empleados/${emp.id}/`, {
        method: 'PATCH',
        body:   JSON.stringify({ activo: !emp.activo }),
      })
      setEmpleados(prev => prev.map(e => e.id === emp.id ? updated : e))
    } catch (err) {
      alert(err.message)
    }
  }

  const handleEliminar = async (id) => {
    if (!confirm('¿Eliminar este repartidor?')) return
    try {
      await apiBFF(`/empleados/${id}/`, { method: 'DELETE' })
      setEmpleados(prev => prev.filter(e => e.id !== id))
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <div style={{ padding: '28px 24px', background: C.bg, minHeight: '100vh' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: C.gray800 }}>
              👷 Empleados
            </h1>
            <p style={{ margin: '4px 0 0', color: C.gray500, fontSize: 14 }}>
              {empleados.length} repartidor{empleados.length !== 1 ? 'es' : ''} registrado{empleados.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Btn onClick={() => setShowForm(v => !v)}>
            {showForm ? '✕ Cerrar' : '＋ Nuevo Repartidor'}
          </Btn>
        </div>

        {/* Formulario crear */}
        {showForm && (
          <div style={{
            background: C.white, borderRadius: 14, border: `1px solid ${C.gray200}`,
            padding: 24, marginBottom: 20,
          }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: C.gray800 }}>
              Nuevo Repartidor
            </h3>

            {formError && (
              <div style={{ background: C.error + '12', border: `1px solid ${C.error}30`, borderRadius: 8, padding: '10px 14px', marginBottom: 14, color: C.error, fontSize: 13, fontWeight: 600 }}>
                ⚠️ {formError}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {[
                { name: 'nombre',   label: 'Nombre completo', placeholder: 'Juan Pérez',         type: 'text' },
                { name: 'email',    label: 'Correo',          placeholder: 'juan@empresa.cl',     type: 'email' },
                { name: 'password', label: 'Contraseña',      placeholder: 'Mínimo 6 caracteres', type: 'password' },
              ].map(({ name, label, placeholder, type }) => (
                <div key={name} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.gray500, textTransform: 'uppercase', letterSpacing: '.5px' }}>
                    {label}
                  </label>
                  <input
                    type={type}
                    value={form[name]}
                    onChange={e => setForm(p => ({ ...p, [name]: e.target.value }))}
                    placeholder={placeholder}
                    style={{
                      border: `1.5px solid ${C.gray200}`, borderRadius: 8,
                      padding: '8px 12px', fontSize: 14, fontFamily: 'inherit',
                      color: C.gray800, outline: 'none',
                    }}
                  />
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <Btn variant="success" onClick={handleCrear} disabled={saving}>
                {saving ? 'Creando...' : '✓ Crear Repartidor'}
              </Btn>
              <Btn variant="secondary" onClick={() => { setShowForm(false); setFormError('') }}>
                Cancelar
              </Btn>
            </div>
          </div>
        )}

        {error && (
          <div style={{ background: C.error + '12', border: `1px solid ${C.error}30`, borderRadius: 12, padding: '12px 16px', marginBottom: 20, color: C.error, fontSize: 14, fontWeight: 600 }}>
            ⚠️ {error}
          </div>
        )}

        {/* Lista */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: C.gray400 }}>Cargando...</div>
        ) : empleados.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: C.gray400, background: C.white, borderRadius: 14, border: `1px solid ${C.gray200}` }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>👷</div>
            <p>No hay repartidores registrados.</p>
            <p style={{ fontSize: 13 }}>Crea el primero con el botón de arriba.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {empleados.map(emp => (
              <div key={emp.id} style={{
                background: C.white, borderRadius: 14,
                border: `1px solid ${C.gray200}`,
                borderLeft: `4px solid ${emp.activo ? C.brand : C.gray300}`,
                padding: '16px 20px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                opacity: emp.activo ? 1 : 0.6,
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <span style={{ fontSize: 20 }}>🚚</span>
                    <span style={{ fontWeight: 700, fontSize: 15, color: C.gray800 }}>{emp.nombre}</span>
                    <span style={{
                      background: emp.activo ? C.success + '18' : C.gray200,
                      color: emp.activo ? C.success : C.gray400,
                      border: `1px solid ${emp.activo ? C.success + '30' : C.gray300}`,
                      borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 700,
                    }}>
                      {emp.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: C.gray500 }}>{emp.email}</p>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <Btn small variant={emp.activo ? 'secondary' : 'success'} onClick={() => handleToggleActivo(emp)}>
                    {emp.activo ? 'Desactivar' : 'Activar'}
                  </Btn>
                  <Btn small variant="danger" onClick={() => handleEliminar(emp.id)}>
                    🗑
                  </Btn>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}