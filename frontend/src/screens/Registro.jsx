import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Logo from '../assets/img/logo.png'
import { useRegistroForm } from '../hooks/useRegistroForm'
import { C } from '../style/theme'
import actividadesData from '../assets/actividades_economicas.json'

const REGIONES = [
  'Región de Arica y Parinacota', 'Región de Tarapacá', 'Región de Antofagasta',
  'Región de Atacama', 'Región de Coquimbo', 'Región de Valparaíso',
  'Región Metropolitana de Santiago', "Región del Libertador Bernardo O'Higgins",
  'Región del Maule', 'Región de Ñuble', 'Región del Biobío',
  'Región de La Araucanía', 'Región de Los Ríos', 'Región de Los Lagos',
  'Región de Aysén del General Carlos Ibáñez del Campo',
  'Región de Magallanes y de la Antártica Chilena',
]

// ── Autocomplete de actividades económicas SII ────────────────────────────────
function AutocompleteGiro({ value, onSelect, onChange }) {
  const [query,       setQuery]       = useState(value?.descripcion || '')
  const [sugerencias, setSugerencias] = useState([])
  const [mostrar,     setMostrar]     = useState(false)
  const [highlightIdx, setHighlight]  = useState(-1)
  const wrapperRef = useRef(null)

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setMostrar(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Sincronizar si el padre limpia el valor
  useEffect(() => {
    if (!value?.descripcion) setQuery('')
  }, [value])

  const handleChange = (e) => {
    const texto = e.target.value
    setQuery(texto)
    onChange(texto)
    setHighlight(-1)

    if (texto.trim().length < 2) {
      setSugerencias([])
      setMostrar(false)
      return
    }

    const upper = texto.toUpperCase()
    const filtradas = actividadesData
      .filter(a => a.descripcion.includes(upper))
      .slice(0, 10)

    setSugerencias(filtradas)
    setMostrar(filtradas.length > 0)
  }

  const handleSelect = (actividad) => {
    setQuery(actividad.descripcion)
    setSugerencias([])
    setMostrar(false)
    setHighlight(-1)
    onSelect(actividad)
  }

  const handleKeyDown = (e) => {
    if (!mostrar) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight(i => Math.min(i + 1, sugerencias.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && highlightIdx >= 0) {
      e.preventDefault()
      handleSelect(sugerencias[highlightIdx])
    } else if (e.key === 'Escape') {
      setMostrar(false)
    }
  }

  const seleccionado = value?.codigo !== ''

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => sugerencias.length > 0 && setMostrar(true)}
          placeholder="Ej: peluquería para animales, transporte de carga..."
          style={{
            width: '100%', boxSizing: 'border-box',
            border: `1.5px solid ${seleccionado ? C.brand : C.gray200}`,
            borderRadius: 10, padding: '11px 38px 11px 14px',
            fontSize: 14, fontFamily: 'inherit',
            color: C.gray800, outline: 'none',
            background: C.white, transition: 'border-color .15s',
          }}
        />
        <div style={{
          position: 'absolute', right: 12, top: '50%',
          transform: 'translateY(-50%)', pointerEvents: 'none',
          fontSize: 14,
        }}>
          {seleccionado ? '✅' : '🔍'}
        </div>
      </div>

      {/* Badge del código SII cuando está seleccionado */}
      {seleccionado && value?.codigo && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: C.brandLight, borderRadius: 6,
          padding: '4px 10px', marginTop: 4,
        }}>
          <span style={{ fontSize: 11, color: C.brand, fontWeight: 700 }}>
            Código SII: {value.codigo}
          </span>
          <span style={{
            fontSize: 10, color: value.afectaIva ? '#f59e0b' : C.gray400,
            fontWeight: 600, marginLeft: 4,
          }}>
            {value.afectaIva ? '• Afecta IVA' : '• No afecta IVA'}
          </span>
        </div>
      )}

      {/* Lista de sugerencias */}
      {mostrar && sugerencias.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          zIndex: 9999, background: C.white,
          border: `1px solid ${C.gray200}`, borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', overflow: 'hidden',
          maxHeight: 280, overflowY: 'auto',
        }}>
          {sugerencias.map((a, i) => (
            <div
              key={a.codigo}
              onMouseDown={() => handleSelect(a)}
              style={{
                padding: '10px 14px', cursor: 'pointer',
                background: i === highlightIdx ? C.brandLight : C.white,
                borderBottom: `1px solid ${C.gray100}`,
                transition: 'background .1s',
              }}
              onMouseEnter={() => setHighlight(i)}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: C.gray800, marginBottom: 2 }}>
                {a.descripcion}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <span style={{ fontSize: 11, color: C.gray400 }}>
                  Código: {a.codigo}
                </span>
                <span style={{
                  fontSize: 11, fontWeight: 600,
                  color: a.afectaIva ? '#f59e0b' : C.gray400,
                }}>
                  {a.afectaIva ? '• Afecta IVA' : '• No afecta IVA'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {query.length >= 2 && sugerencias.length === 0 && !seleccionado && (
        <p style={{ fontSize: 11, color: C.gray400, margin: '4px 0 0 2px' }}>
          Sin resultados — intenta con otras palabras
        </p>
      )}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function Registro() {
  const [step,     setStep]     = useState(1)
  const [showPass, setShowPass] = useState(false)
  const buscarRef = useRef(null)

  const {
    rut, rutValido, buscando, empresa, giro, region, errRut,
    setEmpresa, setRegion,
    handleRutChange, handleBuscarRut, handleKeyRut,
    handleGiroSelect, handleGiroChange,
    canAdvance,
    form, errors, loading, changeForm, submit,
  } = useRegistroForm()

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', fontFamily: "'Khula', sans-serif" }}>

      {/* Panel izquierdo */}
      <div style={{
        width: '40%', background: C.brand,
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center',
        padding: '60px 40px', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -80,   right: -80, width: 280, height: 280, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ position: 'absolute', bottom: -60, left: -60,  width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />

        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <img src={Logo} alt="SmartLogix" style={{ height: 80, objectFit: 'contain', marginBottom: 28, filter: 'brightness(0) invert(1)' }} />
          <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 800, margin: '0 0 14px', lineHeight: 1.3 }}>Registra tu empresa</h1>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, lineHeight: 1.7, maxWidth: 280, margin: '0 auto 36px' }}>
            Solo necesitas tu RUT de empresa y crearemos tu cuenta en minutos.
          </p>

          {/* Stepper */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {[{ n: 1, label: 'Empresa' }, { n: 2, label: 'Cuenta' }].map(({ n, label }, i) => (
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
                {i < 1 && <div style={{ width: 50, height: 2, background: step > 1 ? '#fff' : 'rgba(255,255,255,0.2)', margin: '0 8px 20px', transition: 'background .3s' }} />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Panel derecho */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 48px', overflowY: 'auto' }}>
        <div style={{ width: '100%', maxWidth: 440 }}>

          {/* ── PASO 1 ── */}
          {step === 1 && (
            <>
              <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800, color: C.gray800 }}>Datos de tu empresa</h2>
              <p style={{ margin: '0 0 28px', color: C.gray500, fontSize: 14 }}>Busca tu empresa por RUT para autocompletar la información</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

                {/* RUT */}
                <Field label="RUT de la empresa" error={errRut} hint="Ej: 76.354.771-K">
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      ref={buscarRef} value={rut}
                      onChange={handleRutChange} onKeyDown={handleKeyRut}
                      placeholder="76.354.771-K" maxLength={12}
                      style={{
                        ...inputStyle(errRut), flex: 1,
                        borderColor: rutValido === true ? C.brand : errRut ? '#ef4444' : '#e5e7eb',
                      }}
                    />
                    <button onClick={handleBuscarRut} disabled={buscando} style={{
                      background: C.brand, color: '#fff', border: 'none',
                      borderRadius: 10, padding: '0 18px', fontFamily: 'inherit',
                      fontWeight: 700, fontSize: 14, cursor: buscando ? 'not-allowed' : 'pointer',
                      whiteSpace: 'nowrap', opacity: buscando ? .7 : 1,
                    }}>
                      {buscando ? '...' : ' Buscar'}
                    </button>
                  </div>
                </Field>

                {buscando && (
                  <div style={{ background: C.brandLight, borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 18 }}></span>
                    <span style={{ color: C.brand, fontSize: 14, fontWeight: 600 }}>Consultando el SII...</span>
                  </div>
                )}

                {empresa && !buscando && (
                  <div style={{ background: C.brandLight, border: `1.5px solid ${C.brand}30`, borderRadius: 12, padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 16 }}></span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: C.brand }}>Empresa encontrada</span>
                    </div>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: C.gray800 }}>{empresa.razonSocial || '—'}</p>
                  </div>
                )}

                {empresa !== null && (
                  <Field label="Razón social" hint="Puedes editarla si es necesario">
                    <input value={empresa.razonSocial}
                      onChange={e => setEmpresa(p => ({ ...p, razonSocial: e.target.value }))}
                      placeholder="EMPRESA S.A." style={inputStyle(false)} />
                  </Field>
                )}

                {/* Autocomplete de giro/actividad económica SII */}
                {empresa !== null && (
                  <Field
                    label="Giro / Actividad económica"
                    hint="Escribe para buscar entre las 674 actividades del SII"
                  >
                    <AutocompleteGiro
                      value={giro}
                      onSelect={handleGiroSelect}
                      onChange={handleGiroChange}
                    />
                  </Field>
                )}

                {empresa !== null && (
                  <Field label="Región">
                    <select value={region} onChange={e => setRegion(e.target.value)}
                      style={{ ...inputStyle(false), cursor: 'pointer' }}>
                      <option value="">Selecciona una región</option>
                      {REGIONES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </Field>
                )}

                <button
                  onClick={() => canAdvance && setStep(2)}
                  disabled={!canAdvance}
                  style={{
                    background: canAdvance ? C.brand : '#e5e7eb',
                    color: canAdvance ? '#fff' : '#9ca3af',
                    border: 'none', borderRadius: 10, padding: '13px 0',
                    fontSize: 15, fontWeight: 700,
                    cursor: canAdvance ? 'pointer' : 'not-allowed',
                    width: '100%', fontFamily: 'inherit',
                    transition: 'all .2s', marginTop: 4,
                  }}
                >
                  Continuar →
                </button>
              </div>
            </>
          )}

          {/* ── PASO 2 ── */}
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

              {/* Resumen de giro si fue seleccionado */}
              {giro?.codigo && (
                <div style={{
                  margin: '0 0 16px 36px', background: C.brandLight,
                  borderRadius: 8, padding: '8px 14px',
                  border: `1px solid ${C.brand}30`,
                }}>
                  <p style={{ margin: 0, fontSize: 12, color: C.gray500 }}>Actividad económica</p>
                  <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 700, color: C.gray800 }}>{giro.descripcion}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: C.brand }}>Código SII: {giro.codigo}</p>
                </div>
              )}

              {errors.general && (
<div style={{ background: '#ef444412', border: '1px solid #ef444430', borderRadius: 10, padding: '12px 16px', marginBottom: 20, color: '#ef4444', fontSize: 14, fontWeight: 600 }}>
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
                    <input name="password" type={showPass ? 'text' : 'password'}
                      value={form.password} onChange={changeForm} placeholder="••••••••"
                      style={{ ...inputStyle(errors.password), paddingRight: 44 }} />
                    <button onClick={() => setShowPass(v => !v)} type="button"
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 16 }}>
                      {showPass ? '🙈' : '👁️'}
                    </button>
                  </div>
                  {form.password && <PasswordStrength password={form.password} />}
                </Field>

                <Field label="Confirmar contraseña" error={errors.confirmPassword}>
                  <input name="confirmPassword" type="password" value={form.confirmPassword}
                    onChange={changeForm} placeholder="••••••••" style={inputStyle(errors.confirmPassword)} />
                </Field>

                <p style={{ fontSize: 12, color: '#9ca3af', lineHeight: 1.6, margin: '4px 0 0' }}>
                  Al registrarte aceptas los{' '}
                  <a href="#" style={{ color: C.brand, fontWeight: 600 }}>Términos de Servicio</a>{' '}y la{' '}
                  <a href="#" style={{ color: C.brand, fontWeight: 600 }}>Política de Privacidad</a>.
                </p>

                <button onClick={submit} disabled={loading} style={{
                  background: loading ? '#e5e7eb' : C.brand,
                  color: loading ? '#9ca3af' : '#fff',
                  border: 'none', borderRadius: 10,
                  padding: '13px 0', fontSize: 15, fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  width: '100%', fontFamily: 'inherit', transition: 'background .2s',
                }}>
                  {loading ? 'Creando cuenta...' : 'Crear cuenta'}
                </button>
              </div>
            </>
          )}

          <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: '#6b7280' }}>
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" style={{ color: C.brand, fontWeight: 700, textDecoration: 'none' }}>Iniciar sesión</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

function Field({ label, error, hint, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 13, fontWeight: 700, color: '#374151', letterSpacing: '.3px' }}>{label}</label>
      {children}
      {hint  && !error && <span style={{ fontSize: 12, color: '#9ca3af' }}>{hint}</span>}
      {error && <span style={{ fontSize: 12, color: '#ef4444', fontWeight: 600 }}>⚠ {error}</span>}
    </div>
  )
}

function inputStyle(error) {
  return {
    width: '100%', boxSizing: 'border-box',
    border: `1.5px solid ${error ? '#ef4444' : '#e5e7eb'}`,
    borderRadius: 10, padding: '11px 14px', fontSize: 14,
    fontFamily: 'inherit', color: '#1f2937', outline: 'none',
    background: '#ffffff', transition: 'border-color .15s',
  }
}

function PasswordStrength({ password }) {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ]
  const score  = checks.filter(Boolean).length
  const labels = ['', 'Débil', 'Regular', 'Buena', 'Fuerte']
  const colors = ['', '#ef4444', '#f59e0b', '#3b82f6', '#10b981']

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 4 }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= score ? colors[score] : '#e5e7eb', transition: 'background .3s' }} />
        ))}
      </div>
      {score > 0 && <p style={{ fontSize: 11, color: colors[score], fontWeight: 700, margin: '4px 0 0' }}>{labels[score]}</p>}
    </div>
  )
}