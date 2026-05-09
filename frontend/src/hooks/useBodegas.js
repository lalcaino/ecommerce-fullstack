import { useState, useEffect, useCallback } from 'react'
import { BodegasRepository } from '../services/api'

export function useBodegas() {
  const [bodegas,  setBodegas]  = useState([])
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await BodegasRepository.getAll()
      setBodegas(data)
    } catch (err) {
      setError(err.detail || 'Error al cargar bodegas')
    } finally {
      setLoading(false)
    }
  }, [])

  const createBodega = useCallback(async (payload) => {
    setLoading(true)
    try {
      const nueva = await BodegasRepository.create(payload)
      setBodegas(prev => [...prev, nueva])
      return { ok: true }
    } catch (err) {
      setError(err.detail || 'Error al crear bodega')
      return { ok: false }
    } finally {
      setLoading(false)
    }
  }, [])

  const updateBodega = useCallback(async (id, payload) => {
    try {
      const updated = await BodegasRepository.update(id, payload)
      setBodegas(prev => prev.map(b => b.id === id ? updated : b))
      return { ok: true }
    } catch (err) {
      setError(err.detail || 'Error al actualizar bodega')
      return { ok: false }
    }
  }, [])

  const deleteBodega = useCallback(async (id) => {
    try {
      await BodegasRepository.delete(id)
      setBodegas(prev => prev.filter(b => b.id !== id))
      return { ok: true }
    } catch (err) {
      setError(err.detail || 'Error al eliminar bodega')
      return { ok: false }
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  return { bodegas, loading, error, fetchAll, createBodega, updateBodega, deleteBodega }
}