import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { registroRequest } from '../services/authService'

function formatRut(value) {
  const clean = value.replace(/[^0-9kK]/g, '').toUpperCase()
  if (clean.length <= 1) return clean
  const body = clean.slice(0, -1)
  const dv   = clean.slice(-1)
  const formatted = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${formatted}-${dv}`
}

function validarRut(rut) {
  const clean = rut.replace(/[^0-9kK]/g, '').toUpperCase()
  if (clean.length < 2) return false
  const body = clean.slice(0, -1)
  const dv   = clean.slice(-1)
  let sum = 0, mul = 2
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i]) * mul
    mul = mul === 7 ? 2 : mul + 1
  }
  const expected = 11 - (sum % 11)
  const dvCalc = expected === 11 ? '0' : expected === 10 ? 'K' : String(expected)
  return dv === dvCalc
}

export function useRegistroForm() {
  const navigate = useNavigate()

  // ── Paso 1: datos empresa ─────────────────────────────────────────────────
  const [rut,       setRut]       = useState('')
  const [rutValido, setRutValido] = useState(null)
  const [buscando,  setBuscando]  = useState(false)
  const [empresa,   setEmpresa]   = useState(null)
  const [giro,      setGiro]      = useState({ codigo: '', descripcion: '', afectaIva: false })
  const [region,    setRegion]    = useState('')
  const [errRut,    setErrRut]    = useState('')

  // ── Paso 2: datos cuenta ──────────────────────────────────────────────────
  const [form, setForm] = useState({
    nombre:               '',
    nombre_representante: '',
    email:                '',
    password:             '',
    confirmPassword:      '',
  })
  const [errors,  setErrors]  = useState({})
  const [loading, setLoading] = useState(false)

  // ── RUT handlers ──────────────────────────────────────────────────────────
  const handleRutChange = (e) => {
    const formatted = formatRut(e.target.value)
    setRut(formatted)
    setErrRut('')
    setRutValido(null)
    setEmpresa(null)
  }

  const handleKeyRut = (e) => {
    if (e.key === 'Enter') handleBuscarRut()
  }

  const handleBuscarRut = async () => {
    if (!rut) { setErrRut('Ingresa el RUT'); return }
    if (!validarRut(rut)) { setErrRut('RUT inválido'); setRutValido(false); return }

    setBuscando(true)
    setErrRut('')
    try {
      const clean = rut.replace(/[^0-9kK]/g, '').toUpperCase()
      const res   = await fetch(`https://api.rutify.cl/rut/${clean}`)
      if (res.ok) {
        const data = await res.json()
        setEmpresa({
          razonSocial:      data.razon_social || data.nombre || '',
          nombre_comercial: '',
        })
      } else {
        setEmpresa({ razonSocial: '', nombre_comercial: '' })
      }
      setRutValido(true)
    } catch {
      setEmpresa({ razonSocial: '', nombre_comercial: '' })
      setRutValido(true)
    } finally {
      setBuscando(false)
    }
  }

  // ── Giro handlers ─────────────────────────────────────────────────────────
  const handleGiroSelect = (actividad) => {
    setGiro({ codigo: actividad.codigo, descripcion: actividad.descripcion, afectaIva: actividad.afectaIva })
  }

  const handleGiroChange = (texto) => {
    if (texto !== giro.descripcion) {
      setGiro({ codigo: '', descripcion: texto, afectaIva: false })
    }
  }

  // ── Validación paso 1 ─────────────────────────────────────────────────────
  const canAdvance = (
    empresa !== null &&
    rutValido === true &&
    empresa.razonSocial.trim() !== '' &&
    region !== ''
  )

  // ── Form paso 2 ───────────────────────────────────────────────────────────
  const changeForm = (e) => {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }))
    setErrors(p => ({ ...p, [e.target.name]: '' }))
  }

  const validateForm = () => {
    const e = {}
    if (!form.nombre.trim())               e.nombre               = 'Ingresa tu nombre'
    if (!form.nombre_representante.trim()) e.nombre_representante = 'Ingresa el nombre del representante'
    if (!form.email.trim())                e.email                = 'Ingresa tu correo'
    if (!form.password)                    e.password             = 'Ingresa una contraseña'
    if (form.password.length < 8)          e.password             = 'Mínimo 8 caracteres'
    if (form.password !== form.confirmPassword) e.confirmPassword  = 'Las contraseñas no coinciden'
    return e
  }

  const submit = async () => {
    const e = validateForm()
    if (Object.keys(e).length) { setErrors(e); return }
    setLoading(true)
    setErrors({})
    try {
      await registroRequest({
        nombre:               form.nombre,
        nombre_representante: form.nombre_representante,
        email:                form.email,
        password:             form.password,
        rut,
        razonSocial:          empresa?.razonSocial      || '',
        nombre_comercial:     empresa?.nombre_comercial || '',
        giro:                 giro.descripcion,
        giro_codigo:          giro.codigo,
        region,
      })
      navigate('/dashboard')
    } catch (err) {
      setErrors({ general: err.message })
    } finally {
      setLoading(false)
    }
  }

  return {
    rut, rutValido, buscando, empresa, giro, region, errRut,
    setEmpresa, setRegion,
    handleRutChange, handleBuscarRut, handleKeyRut,
    handleGiroSelect, handleGiroChange,
    canAdvance,
    form, errors, loading, changeForm, submit,
  }
}