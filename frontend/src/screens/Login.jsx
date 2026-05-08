/**
 * Login.jsx — Pantalla de inicio de sesión SmartLogix
 */
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Logo from '../assets/img/logo.png'

const C = {
  brand: '#408A71', brandDark: '#2e6b57', brandLight: '#e8f5f0',
  white: '#ffffff', bg: '#f4f7f6',
  gray100: '#f3f4f6', gray200: '#e5e7eb', gray300: '#d1d5db',
  gray400: '#9ca3af', gray500: '#6b7280', gray700: '#374151', gray800: '#1f2937',
  error: '#ef4444',
}

export default function Login() {
  const navigate = useNavigate()
  const [form, setForm]       = useState({ email: '', password: '' })
  const [errors, setErrors]   = useState({})
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)

  const change = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }))

  const validate = () => {
    const e = {}
    if (!form.email)    e.email    = 'Ingresa tu correo'
    if (!form.password) e.password = 'Ingresa tu contraseña'
    return e
  }

  const submit = async () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setLoading(true)
    setErrors({})
    try {
      // TODO: conectar con API real
      await new Promise(r => setTimeout(r, 800))
      navigate('/')
    } catch {
      setErrors({ general: 'Credenciales incorrectas. Intenta de nuevo.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: C.bg,
      display: 'flex', fontFamily: "'Khula', sans-serif",
    }}>
      {/* Panel izquierdo — decorativo */}
      <div style={{
        width: '45%', background: C.brand,
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center',
        padding: '60px 48px', position: 'relative', overflow: 'hidden',
      }}>
        {/* Círculos decorativos */}
        <div style={{ position: 'absolute', top: -80, right: -80, width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ position: 'absolute', bottom: -60, left: -60, width: 240, height: 240, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ position: 'absolute', top: '40%', left: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />

        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <img src={Logo} alt="SmartLogix" style={{ height: 90, objectFit: 'contain', marginBottom: 32, filter: 'brightness(0) invert(1)' }} />
          <h1 style={{ color: '#fff', fontSize: 28, fontWeight: 800, margin: '0 0 16px', lineHeight: 1.2 }}>
            Gestión logística<br />para tu empresa
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 15, lineHeight: 1.7, maxWidth: 320, margin: '0 auto' }}>
            Controla tu inventario, pedidos y operaciones en un solo lugar. Diseñado para PyMEs chilenas.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 40 }}>
            {[
              { icon: '📦', text: 'Inventario en tiempo real' },
              { icon: '🚚', text: 'Seguimiento de pedidos' },
              { icon: '📊', text: 'Reportes automáticos' },
            ].map(({ icon, text }) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 16px' }}>
                <span style={{ fontSize: 20 }}>{icon}</span>
                <span style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Panel derecho — formulario */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: '40px 48px',
      }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <h2 style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 800, color: C.gray800 }}>Bienvenido de vuelta</h2>
          <p style={{ margin: '0 0 32px', color: C.gray500, fontSize: 15 }}>Ingresa a tu cuenta SmartLogix</p>

          {errors.general && (
            <div style={{ background: C.error + '12', border: `1px solid ${C.error}30`, borderRadius: 10, padding: '12px 16px', marginBottom: 20, color: C.error, fontSize: 14, fontWeight: 600 }}>
              ⚠️ {errors.general}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <Field label="Correo electrónico" error={errors.email}>
              <input
                type="email" name="email" value={form.email} onChange={change}
                placeholder="correo@empresa.cl"
                style={inputStyle(errors.email)}
              />
            </Field>

            <Field label="Contraseña" error={errors.password}>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'} name="password"
                  value={form.password} onChange={change}
                  placeholder="••••••••"
                  style={{ ...inputStyle(errors.password), paddingRight: 44 }}
                />
                <button
                  onClick={() => setShowPass(v => !v)} type="button"
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.gray400, fontSize: 18 }}
                >{showPass ? '🙈' : '👁️'}</button>
              </div>
            </Field>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: -8 }}>
              <a href="#" style={{ fontSize: 13, color: C.brand, fontWeight: 600, textDecoration: 'none' }}>¿Olvidaste tu contraseña?</a>
            </div>

            <button
              onClick={submit} disabled={loading}
              style={{
                background: loading ? C.gray300 : C.brand,
                color: '#fff', border: 'none', borderRadius: 10,
                padding: '13px 0', fontSize: 15, fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                width: '100%', fontFamily: 'inherit',
                transition: 'background .2s',
              }}
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </div>

          <p style={{ textAlign: 'center', marginTop: 28, fontSize: 14, color: C.gray500 }}>
            ¿No tienes cuenta?{' '}
            <Link to="/registro" style={{ color: C.brand, fontWeight: 700, textDecoration: 'none' }}>
              Regístrate aquí
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

function Field({ label, error, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 700, color: '#374151', letterSpacing: '.3px' }}>{label}</label>
      {children}
      {error && <span style={{ fontSize: 12, color: '#ef4444', fontWeight: 600 }}>{error}</span>}
    </div>
  )
}

function inputStyle(error) {
  return {
    width: '100%', boxSizing: 'border-box',
    border: `1.5px solid ${error ? '#ef4444' : '#e5e7eb'}`,
    borderRadius: 10, padding: '11px 14px', fontSize: 14,
    fontFamily: 'inherit', color: '#1f2937', outline: 'none',
    background: '#fff', transition: 'border-color .15s',
  }
}
