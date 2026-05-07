/**
 * useInventario.js - Hook personalizado para gestión de inventario
 * Patrón: separa lógica de negocio de la capa de presentación.
 */
import { useState, useEffect, useCallback } from 'react'
import { InventarioRepository } from '../services/api'

export function useInventario() {
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await InventarioRepository.getAll()
      setItems(data)
    } catch (err) {
      setError(err.detail || 'Error al cargar inventario')
    } finally {
      setLoading(false)
    }
  }, [])

  const createItem = useCallback(async (payload) => {
    setLoading(true)
    try {
      const nuevo = await InventarioRepository.create(payload)
      setItems(prev => [...prev, nuevo])
      return { ok: true }
    } catch (err) {
      setError(err.detail || 'Error al crear ítem')
      return { ok: false, error: err }
    } finally {
      setLoading(false)
    }
  }, [])

  const updateItem = useCallback(async (id, payload) => {
    try {
      const updated = await InventarioRepository.update(id, payload)
      setItems(prev => prev.map(i => i.id === id ? updated : i))
      return { ok: true }
    } catch (err) {
      setError(err.detail || 'Error al actualizar ítem')
      return { ok: false }
    }
  }, [])

  const deleteItem = useCallback(async (id) => {
    try {
      await InventarioRepository.delete(id)
      setItems(prev => prev.filter(i => i.id !== id))
      return { ok: true }
    } catch (err) {
      setError(err.detail || 'Error al eliminar ítem')
      return { ok: false }
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  return { items, loading, error, fetchAll, createItem, updateItem, deleteItem }
}
