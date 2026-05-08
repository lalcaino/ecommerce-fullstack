import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginRequest } from '../services/authService'

export function useLoginForm() {
  const navigate = useNavigate()
  const [form,    setForm]    = useState({ email: '', password: '' })
  const [errors,  setErrors]  = useState({})
  const [loading, setLoading] = useState(false)

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
      await loginRequest(form)
      navigate('/dashboard')
    } catch (err) {
      setErrors({ general: err.message })
    } finally {
      setLoading(false)
    }
  }

  return { form, errors, loading, change, submit }
}