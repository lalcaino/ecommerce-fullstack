import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { registroRequest } from '../services/authService'

export function useRegistroForm() {
  const navigate = useNavigate()

  // Paso 1 — empresa
  const [rut,       setRut]       = useState('')
  const [rutValido, setRutValido] = useState(null)
  const [buscando,  setBuscando]  = useState(false)
  const [empresa,   setEmpresa]   = useState(null)
  const [giro,      setGiro]      = useState('')
  const [region,    setRegion]    = useState('')
  const [errRut,    setErrRut]    = useState('')

  // Paso 2 — cuenta
  const [form,    setForm]    = useState({ nombre: '', email: '', password: '', confirmPassword: '' })
  const [errors,  setErrors]  = useState({})
  const [loading, setLoading] = useState(false)

  // ── Paso 1 ──────────────────────────────────────────────────────────────────

  const handleRutChange = (e) => {
    const limpio = e.target.value.replace(/[^0-9kK\.\-]/g, '')
    setRut(formatRut(limpio.replace(/[\.\-]/g, '')))
    setEmpresa(null)
    setErrRut('')
    setRutValido(null)
  }

  const handleBuscarRut = async () => {
    if (!rut) { setErrRut('Ingresa el RUT'); return }
    if (!validarRut(rut)) {
      setErrRut('RUT inválido, verifica el dígito verificador')
      setRutValido(false)
      return
    }
    setRutValido(true)
    setBuscando(true)
    setErrRut('')
    try {
      const data = await buscarEmpresa(rut)
      setEmpresa(data)
      setGiro(data.giro)
    } catch {
      setErrRut('No se encontró la empresa. Puedes ingresar la razón social manualmente.')
      setEmpresa({ razonSocial: '', giro: '' })
    } finally {
      setBuscando(false)
    }
  }

  const handleKeyRut = (e) => { if (e.key === 'Enter') handleBuscarRut() }

  // ── Paso 2 ──────────────────────────────────────────────────────────────────

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
    setErrors({})
    try {
      await registroRequest({
        nombre:      form.nombre,
        email:       form.email,
        password:    form.password,
        rut,
        razonSocial: empresa?.razonSocial,
        giro,
        region,
      })
      navigate('/dashboard')
    } catch (err) {
      setErrors({ general: err.message })
    } finally {
      setLoading(false)
    }
  }

  const canAdvance = empresa && empresa.razonSocial.trim()

  return {
    // paso 1
    rut, rutValido, buscando, empresa, giro, region, errRut,
    setEmpresa, setGiro, setRegion,
    handleRutChange, handleBuscarRut, handleKeyRut,
    canAdvance,
    // paso 2
    form, errors, loading,
    changeForm, submit,
  }
}

// ── Helpers (fuera del hook) ─────────────────────────────────────────────────

function formatRut(raw) {
  const clean = raw.replace(/[^0-9kK]/g, '')
  if (clean.length < 2) return clean
  const dv        = clean.slice(-1)
  const body      = clean.slice(0, -1)
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
  const dvCalc   = expected === 11 ? '0' : expected === 10 ? 'K' : String(expected)
  return dv === dvCalc
}

async function buscarEmpresa(rut) {
  // TODO: reemplazar con fetch real a API SII o propia
  await new Promise(r => setTimeout(r, 700))
  const MOCK = {
    '76354771': { razonSocial: 'RETAIL CHILE S.A.',          giro: 'Comercio al por menor'     },
    '96874030': { razonSocial: 'LOGISUR LIMITADA',           giro: 'Transporte de carga'        },
    '78432190': { razonSocial: 'DISTRIBUIDORA NORTE S.P.A.', giro: 'Distribución y logística'   },
    '99554120': { razonSocial: 'SUPERMERCADOS CENTRAL S.A.', giro: 'Comercio al por mayor'      },
    '76001234': { razonSocial: 'MEGASTORE EXPRESS LTDA.',    giro: 'Comercio electrónico'       },
  }
  const body = rut.replace(/[^0-9]/g, '').slice(0, -1)
  const found = MOCK[body]
  if (found) return found
  throw new Error('RUT no encontrado en el SII')
}