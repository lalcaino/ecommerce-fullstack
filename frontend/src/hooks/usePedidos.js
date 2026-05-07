/**
 * usePedidos.js - Hook personalizado para gestión de pedidos
 */
import { useState, useEffect, useCallback } from 'react'
import { PedidosRepository } from '../services/api'

export function usePedidos() {
  const [pedidos,  setPedidos]  = useState([])
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await PedidosRepository.getAll()
      setPedidos(data)
    } catch (err) {
      setError(err.detail || 'Error al cargar pedidos')
    } finally {
      setLoading(false)
    }
  }, [])

  const createPedido = useCallback(async (payload) => {
    setLoading(true)
    try {
      const nuevo = await PedidosRepository.create(payload)
      setPedidos(prev => [...prev, nuevo])
      return { ok: true, data: nuevo }
    } catch (err) {
      setError(err.detail || 'Error al crear pedido')
      return { ok: false }
    } finally {
      setLoading(false)
    }
  }, [])

  const cambiarEstado = useCallback(async (id, estado) => {
    try {
      const updated = await PedidosRepository.updateEstado(id, estado)
      setPedidos(prev => prev.map(p => p.id === id ? updated : p))
      return { ok: true }
    } catch (err) {
      setError(err.detail || 'Error al actualizar estado')
      return { ok: false }
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  return { pedidos, loading, error, fetchAll, createPedido, cambiarEstado }
}
