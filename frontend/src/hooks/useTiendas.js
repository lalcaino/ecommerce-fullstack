import { useState, useEffect, useCallback } from 'react'
import { TiendasRepository } from '../services/api'

export function useTiendas() {
  const [tiendas,  setTiendas]  = useState([])
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await TiendasRepository.getAll()
      setTiendas(data)
    } catch (err) {
      setError(err.detail || 'Error al cargar tiendas')
    } finally {
      setLoading(false)
    }
  }, [])

  const createTienda = useCallback(async (payload) => {
    setLoading(true)
    try {
      const nueva = await TiendasRepository.create(payload)
      setTiendas(prev => [...prev, nueva])
      return { ok: true }
    } catch (err) {
      setError(err.detail || 'Error al crear tienda')
      return { ok: false }
    } finally {
      setLoading(false)
    }
  }, [])

  const updateTienda = useCallback(async (id, payload) => {
    try {
      const updated = await TiendasRepository.update(id, payload)
      setTiendas(prev => prev.map(t => t.id === id ? updated : t))
      return { ok: true }
    } catch (err) {
      setError(err.detail || 'Error al actualizar tienda')
      return { ok: false }
    }
  }, [])

  const deleteTienda = useCallback(async (id) => {
    try {
      await TiendasRepository.delete(id)
      setTiendas(prev => prev.filter(t => t.id !== id))
      return { ok: true }
    } catch (err) {
      setError(err.detail || 'Error al eliminar tienda')
      return { ok: false }
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  return { tiendas, loading, error, fetchAll, createTienda, updateTienda, deleteTienda }
}