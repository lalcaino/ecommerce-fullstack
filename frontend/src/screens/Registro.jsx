/**
 * Registro.jsx — Pantalla de registro de empresa SmartLogix
 * Búsqueda de razón social vía RUT (simulado — conectar con API SII o propia)
 */
import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Logo from '../assets/img/logo.png'

const C = {
  brand: '#408A71', brandDark: '#2e6b57', brandLight: '#e8f5f0',
  white: '#ffffff', bg: '#f4f7f6',
  gray100: '#f3f4f6', gray200: '#e5e7eb', gray300: '#d1d5db',
  gray400: '#9ca3af', gray500: '#6b7280', gray700: '#374151', gray800: '#1f2937',
  error: '#ef4444', success: '#10b981',
}

/* ── Formatea RUT chileno: 12345678 → 12.345.678 ─────────────────────────── */
function formatRut(raw) {
  const clean = raw.replace(/[^0-9kK]/g, '')
  if (clean.length < 2) return clean
  const dv   = clean.slice(-1)
  const body = clean.slice(0, -1)
  const formatted = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${formatted}-${dv}`
}

function validarRut(rut) {
  const clean = rut.replace(/[^0-9kK]/g, '')
  if (clean.length < 7) return false
  const body = clean.slice(0, -1)
  const dv   = clean.slice(-1).toUpperCase()
  let sum = 0, mul = 2
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i]) * mul
    mul = mul === 7 ? 2 : mul + 1
  }
  const expected = 11 - (sum % 11)
  const dvCalc = expected === 11 ? '0' : expected === 10 ? 'K' : String(expected)
  return dv === dvCalc
}

/* ── Mock: simula búsqueda en API SII ────────────────────────────────────── */
const MOCK_EMPRESAS = {
  '76354771': { razonSocial: 'RETAIL CHILE S.A.', giro: 'Comercio al por menor' },
  '96874030': { razonSocial: 'LOGISUR LIMITADA', giro: 'Transporte de carga' },
  '78432190': { razonSocial: 'DISTRIBUIDORA NORTE S.P.A.', giro: 'Distribución y logística' },
  '99554120': { razonSocial: 'SUPERMERCADOS CENTRAL S.A.', giro: 'Comercio al por mayor' },
  '76001234': { razonSocial: 'MEGASTORE EXPRESS LTDA.', giro: 'Comercio electrónico' },
}

async function buscarEmpresa(rut) {
  await new Promise(r => setTimeout(r, 700))
  const body = rut.replace(/[^0-9]/g, '').slice(0, -1)
  const found = MOCK_EMPRESAS[body]
  if (found) return found
  throw new Error('RUT no encontrado en el SII')
}

/* ── Componentes de utilidad ─────────────────────────────────────────────── */
function Field({ label, error, hint, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 13, fontWeight: 700, color: C.gray700, letterSpacing: '.3px' }}>{label}</label>
      {children}
      {hint  && !error && <span style={{ fontSize: 12, color: C.gray400 }}>{hint}</span>}
      {error && <span style={{ fontSize: 12, color: C.error, fontWeight: 600 }}>⚠ {error}</span>}
    </div>
  )
}

function inputStyle(error, disabled) {
  return {
    width: '100%', boxSizing: 'border-box',
    border: `1.5px solid ${error ? C.error : C.gray200}`,
    borderRadius: 10, padding: '11px 14px', fontSize: 14,
    fontFamily: 'inherit', color: C.gray800, outline: 'none',
    background: disabled ? C.gray100 : C.white,
    transition: 'border-color .15s',
    cursor: disabled ? 'not-allowed' : 'text',
  }
}

/* ── Componente principal ─────────────────────────────────────────────────── */
export default function Registro() {
  const navigate = useNavigate()

  const [step, setStep] = useState(1)   // 1 = empresa, 2 = cuenta

  // Paso 1 — datos empresa
  const [rut,         setRut]         = useState('')
  const [rutValido,   setRutValido]   = useState(null)   // null | true | false
  const [buscando,    setBuscando]    = useState(false)
  const [empresa,     setEmpresa]     = useState(null)   // { razonSocial, giro }
  const [errRut,      setErrRut]      = useState('')
  const [giro,        setGiro]        = useState('')

  // Paso 2 — cuenta
  const [form, setForm]       = useState({ nombre: '', email: '', password: '', confirmPassword: '' })
  const [errors, setErrors]   = useState({})
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)

  const buscarRef = useRef(null)

  /* Validar y buscar RUT al salir del input */
  const handleRutChange = (e) => {
    const raw     = e.target.value
    const limpio  = raw.replace(/[^0-9kK\.\-]/g, '')
    setRut(formatRut(limpio.replace(/[\.\-]/g, '')))
    setEmpresa(null)
    setErrRut('')
    setRutValido(null)
  }

  const handleBuscarRut = async () => {
    if (!rut) { setErrRut('Ingresa el RUT'); return }
    const esValido = validarRut(rut)
    if (!esValido) { setErrRut('RUT inválido, verifica el dígito verificador'); setRutValido(false); return }
    setRutValido(true)
    setBuscando(true)
    setErrRut('')
    try {
      const data = await buscarEmpresa(rut)
      setEmpresa(data)
      setGiro(data.giro)
    } catch (err) {
      setErrRut('No se encontró la empresa. Puedes ingresar la razón social manualmente.')
      setEmpresa({ razonSocial: '', giro: '' })
    } finally {
      setBuscando(false)
    }
  }

  const handleKeyRut = (e) => { if (e.key === 'Enter') handleBuscarRut() }

  /* Paso 2 */
  const changeForm = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }))

  const validateStep2 = () => {
    const e = {}
    if (!form.nombre) e.nombre = 'Ingresa tu nombre'
    if (!form.email)  e.email  = 'Ingresa tu correo'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Correo inválido'
    if (!form.password) e.password = 'Ingresa una contraseña'
    else if (form.password.length < 8) e.password = 'Mínimo 8 caracteres'
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Las contraseñas no coinciden'
    return e
  }

  const submit = async () => {
    const e = validateStep2()
    if (Object.keys(e).length) { setErrors(e); return }
    setLoading(true)
    try {
      // TODO: conectar con API real
      await new Promise(r => setTimeout(r, 900))
      navigate('/login')
    } catch {
      setErrors({ general: 'Error al registrar. Intenta de nuevo.' })
    } finally {
      setLoading(false)
    }
  }

  const canAdvance = empresa && empresa.razonSocial.trim()

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', fontFamily: "'Khula', sans-serif" }}>

      {/* Panel izquierdo */}
      <div style={{
        width: '40%', background: C.brand,
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center',
        padding: '60px 40px', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -80, right: -80, width: 280, height: 280, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ position: 'absolute', bottom: -60, left: -60, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />

        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <img src={Logo} alt="SmartLogix" style={{ height: 80, objectFit: 'contain', marginBottom: 28, filter: 'brightness(0) invert(1)' }} />
          <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 800, margin: '0 0 14px', lineHeight: 1.3 }}>
            Registra tu empresa
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, lineHeight: 1.7, maxWidth: 280, margin: '0 auto 36px' }}>
            Solo necesitas tu RUT de empresa y crearemos tu cuenta en minutos.
          </p>

          {/* Stepper visual */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, justifyContent: 'center' }}>
            {[
              { n: 1, label: 'Empresa' },
              { n: 2, label: 'Cuenta' },
            ].map(({ n, label }, i) => (
              <div key={n} style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: step >= n ? '#fff' : 'rgba(255,255,255,0.2)',
                    color: step >= n ? C.brand : 'rgba(255,255,255,0.6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: 15, transition: 'all .3s',
                  }}>
                    {step > n ? '✓' : n}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: step >= n ? '#fff' : 'rgba(255,255,255,0.5)', letterSpacing: '.4px' }}>{label}</span>
                </div>
                {i < 1 && (
                  <div style={{ width: 50, height: 2, background: step > 1 ? '#fff' : 'rgba(255,255,255,0.2)', margin: '0 8px 20px', transition: 'background .3s' }} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Panel derecho — formulario */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 48px', overflowY: 'auto' }}>
        <div style={{ width: '100%', maxWidth: 440 }}>

          {/* ── PASO 1: Datos empresa ── */}
          {step === 1 && (
            <>
              <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800, color: C.gray800 }}>Datos de tu empresa</h2>
              <p style={{ margin: '0 0 28px', color: C.gray500, fontSize: 14 }}>Busca tu empresa por RUT para autocompletar la información</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

                {/* RUT + botón buscar */}
                <Field label="RUT de la empresa" error={errRut} hint="Ej: 76.354.771-K">
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      ref={buscarRef}
                      value={rut} onChange={handleRutChange} onKeyDown={handleKeyRut}
                      placeholder="76.354.771-K"
                      maxLength={12}
                      style={{ ...inputStyle(errRut), flex: 1, borderColor: rutValido === true ? C.success : errRut ? C.error : C.gray200 }}
                    />
                    <button
                      onClick={handleBuscarRut} disabled={buscando}
                      style={{
                        background: C.brand, color: '#fff', border: 'none',
                        borderRadius: 10, padding: '0 18px', fontFamily: 'inherit',
                        fontWeight: 700, fontSize: 14, cursor: buscando ? 'not-allowed' : 'pointer',
                        whiteSpace: 'nowrap', opacity: buscando ? .7 : 1,
                      }}
                    >
                      {buscando ? '...' : '🔍 Buscar'}
                    </button>
                  </div>
                </Field>

                {/* Resultado de búsqueda */}
                {buscando && (
                  <div style={{ background: C.brandLight, borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 18 }}>⏳</span>
                    <span style={{ color: C.brand, fontSize: 14, fontWeight: 600 }}>Consultando el SII...</span>
                  </div>
                )}

                {empresa && !buscando && (
                  <div style={{ background: C.brandLight, border: `1.5px solid ${C.brand}30`, borderRadius: 12, padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 16 }}>🏢</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: C.brand }}>Empresa encontrada</span>
                    </div>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: C.gray800 }}>{empresa.razonSocial || '—'}</p>
                    {empresa.giro && <p style={{ margin: '2px 0 0', fontSize: 13, color: C.gray500 }}>{empresa.giro}</p>}
                  </div>
                )}

                {/* Razón social editable */}
                {empresa !== null && (
                  <Field label="Razón social" hint="Puedes editarla si es necesario">
                    <input
                      value={empresa.razonSocial}
                      onChange={e => setEmpresa(p => ({ ...p, razonSocial: e.target.value }))}
                      placeholder="EMPRESA S.A."
                      style={inputStyle(false)}
                    />
                  </Field>
                )}

                {/* Giro editable */}
                {empresa !== null && (
                  <Field label="Giro o actividad económica">
                    <input
                      value={giro}
                      onChange={e => setGiro(e.target.value)}
                      placeholder="Ej: Comercio al por mayor"
                      style={inputStyle(false)}
                    />
                  </Field>
                )}

                {/* Región */}
                {empresa !== null && (
                  <Field label="Región">
                    <select
                      style={{ ...inputStyle(false), cursor: 'pointer' }}
                    >
                      <option value="">Selecciona una región</option>
                      {[
                        'Región de Arica y Parinacota', 'Región de Tarapacá', 'Región de Antofagasta',
                        'Región de Atacama', 'Región de Coquimbo', 'Región de Valparaíso',
                        'Región Metropolitana de Santiago', "Región del Libertador Bernardo O'Higgins",
                        'Región del Maule', 'Región de Ñuble', 'Región del Biobío',
                        'Región de La Araucanía', 'Región de Los Ríos', 'Región de Los Lagos',
                        'Región de Aysén del General Carlos Ibáñez del Campo',
                        'Región de Magallanes y de la Antártica Chilena',
                      ].map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </Field>
                )}

                <button
                  onClick={() => canAdvance && setStep(2)}
                  disabled={!canAdvance}
                  style={{
                    background: canAdvance ? C.brand : C.gray200,
                    color: canAdvance ? '#fff' : C.gray400,
                    border: 'none', borderRadius: 10, padding: '13px 0',
                    fontSize: 15, fontWeight: 700, cursor: canAdvance ? 'pointer' : 'not-allowed',
                    width: '100%', fontFamily: 'inherit', transition: 'all .2s',
                    marginTop: 4,
                  }}
                >
                  Continuar →
                </button>
              </div>
            </>
          )}

          {/* ── PASO 2: Cuenta de usuario ── */}
          {step === 2 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.gray500, fontSize: 20, padding: 0 }}>←</button>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: C.gray800 }}>Crea tu cuenta</h2>
              </div>
              <p style={{ margin: '0 0 6px 36px', color: C.gray500, fontSize: 14 }}>Cuenta para</p>
              <div style={{ margin: '0 0 24px 36px', background: C.brandLight, borderRadius: 8, padding: '8px 14px', display: 'inline-block' }}>
                <span style={{ color: C.brand, fontWeight: 700, fontSize: 14 }}>🏢 {empresa?.razonSocial}</span>
              </div>

              {errors.general && (
                <div style={{ background: C.error + '12', border: `1px solid ${C.error}30`, borderRadius: 10, padding: '12px 16px', marginBottom: 20, color: C.error, fontSize: 14, fontWeight: 600 }}>
                  ⚠️ {errors.general}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Field label="Nombre completo" error={errors.nombre}>
                  <input name="nombre" value={form.nombre} onChange={changeForm}
                    placeholder="Juan Pérez" style={inputStyle(errors.nombre)} />
                </Field>

                <Field label="Correo electrónico" error={errors.email}>
                  <input name="email" type="email" value={form.email} onChange={changeForm}
                    placeholder="juan@empresa.cl" style={inputStyle(errors.email)} />
                </Field>

                <Field label="Contraseña" error={errors.password} hint="Mínimo 8 caracteres">
                  <div style={{ position: 'relative' }}>
                    <input
                      name="password" type={showPass ? 'text' : 'password'}
                      value={form.password} onChange={changeForm}
                      placeholder="••••••••"
                      style={{ ...inputStyle(errors.password), paddingRight: 44 }}
                    />
                    <button onClick={() => setShowPass(v => !v)} type="button"
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.gray400, fontSize: 16 }}>
                      {showPass ? '🙈' : '👁️'}
                    </button>
                  </div>
                  {/* Barra de fortaleza */}
                  {form.password && (
                    <PasswordStrength password={form.password} />
                  )}
                </Field>

                <Field label="Confirmar contraseña" error={errors.confirmPassword}>
                  <input name="confirmPassword" type="password" value={form.confirmPassword} onChange={changeForm}
                    placeholder="••••••••" style={inputStyle(errors.confirmPassword)} />
                </Field>

                <p style={{ fontSize: 12, color: C.gray400, lineHeight: 1.6, margin: '4px 0 0' }}>
                  Al registrarte aceptas los{' '}
                  <a href="#" style={{ color: C.brand, fontWeight: 600 }}>Términos de Servicio</a>{' '}y la{' '}
                  <a href="#" style={{ color: C.brand, fontWeight: 600 }}>Política de Privacidad</a>.
                </p>

                <button
                  onClick={submit} disabled={loading}
                  style={{
                    background: loading ? C.gray300 : C.brand,
                    color: '#fff', border: 'none', borderRadius: 10,
                    padding: '13px 0', fontSize: 15, fontWeight: 700,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    width: '100%', fontFamily: 'inherit', transition: 'background .2s',
                  }}
                >
                  {loading ? 'Creando cuenta...' : 'Crear cuenta'}
                </button>
              </div>
            </>
          )}

          <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: C.gray500 }}>
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" style={{ color: C.brand, fontWeight: 700, textDecoration: 'none' }}>
              Iniciar sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

/* ── Barra de fortaleza de contraseña ──────────────────────────────────────── */
function PasswordStrength({ password }) {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ]
  const score = checks.filter(Boolean).length
  const labels = ['', 'Débil', 'Regular', 'Buena', 'Fuerte']
  const colors = ['', C.error, '#f59e0b', '#3b82f6', C.success]

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 4 }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= score ? colors[score] : C.gray200, transition: 'background .3s' }} />
        ))}
      </div>
      {score > 0 && <p style={{ fontSize: 11, color: colors[score], fontWeight: 700, margin: '4px 0 0' }}>{labels[score]}</p>}
    </div>
  )
}
