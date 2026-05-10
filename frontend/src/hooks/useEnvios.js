import { useState, useEffect, useCallback, useRef } from 'react'
import { EnviosRepository, ConductoresRepository } from '../services/api_envios'

export function useEnvios() {
  const [envios,      setEnvios]      = useState([])
  const [conductores, setConductores] = useState([])
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState(null)
  const pollingRef = useRef(null)

  const fetchEnvios = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [enviosData, conductoresData] = await Promise.all([
        EnviosRepository.getAll(),
        ConductoresRepository.getAll(),
      ])
      setEnvios(Array.isArray(enviosData) ? enviosData : [])
      setConductores(Array.isArray(conductoresData) ? conductoresData : [])
    } catch (err) {
      setError(err.detail || err.message || 'Error al cargar envíos')
    } finally {
      setLoading(false)
    }
  }, [])

  // Polling de envíos en curso cada 15 segundos para tiempo real
  const startPolling = useCallback(() => {
    if (pollingRef.current) return
    pollingRef.current = setInterval(async () => {
      try {
        const enCurso = await EnviosRepository.getEnCurso()
        if (!Array.isArray(enCurso)) return
        setEnvios(prev =>
          prev.map(e => {
            const actualizado = enCurso.find(ec => ec.id === e.id)
            return actualizado || e
          })
        )
      } catch { /* silencioso en polling */ }
    }, 15000)
  }, [])

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }, [])

  const createEnvio = useCallback(async (payload) => {
    setLoading(true)
    try {
      const nuevo = await EnviosRepository.create(payload)
      setEnvios(prev => [nuevo, ...prev])
      return { ok: true, data: nuevo }
    } catch (err) {
      setError(err.detail || 'Error al crear envío')
      return { ok: false }
    } finally {
      setLoading(false)
    }
  }, [])

  const updateEstado = useCallback(async (id, estado) => {
    try {
      const updated = await EnviosRepository.updateEstado(id, estado)
      setEnvios(prev => prev.map(e => e.id === id ? updated : e))
      return { ok: true }
    } catch (err) {
      setError(err.detail || 'Error al cambiar estado')
      return { ok: false }
    }
  }, [])

  const persistirRuta = useCallback(async (id, rutaData) => {
    try {
      await EnviosRepository.updateRuta(id, rutaData)
      return { ok: true }
    } catch (err) {
      setError(err.detail || 'Error al guardar ruta')
      return { ok: false }
    }
  }, [])

  const updateParada = useCallback(async (paradaId, estado) => {
    try {
      await EnviosRepository.updateParada(paradaId, estado)
      await fetchEnvios()
      return { ok: true }
    } catch (err) {
      setError(err.detail || 'Error al actualizar parada')
      return { ok: false }
    }
  }, [fetchEnvios])

  const deleteEnvio = useCallback(async (id) => {
    try {
      await EnviosRepository.delete(id)
      setEnvios(prev => prev.filter(e => e.id !== id))
      return { ok: true }
    } catch (err) {
      setError(err.detail || 'Error al eliminar envío')
      return { ok: false }
    }
  }, [])

  const createConductor = useCallback(async (payload) => {
    try {
      const nuevo = await ConductoresRepository.create(payload)
      setConductores(prev => [...prev, nuevo])
      return { ok: true, data: nuevo }
    } catch (err) {
      setError(err.detail || 'Error al crear conductor')
      return { ok: false }
    }
  }, [])

  useEffect(() => {
    fetchEnvios()
    startPolling()
    return () => stopPolling()
  }, [fetchEnvios, startPolling, stopPolling])

  return {
    envios, conductores, loading, error,
    fetchEnvios, createEnvio, updateEstado,
    persistirRuta, updateParada, deleteEnvio,
    createConductor, startPolling, stopPolling,
  }
}
