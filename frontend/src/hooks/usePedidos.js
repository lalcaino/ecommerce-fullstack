/**
 * usePedidos.js - Hook personalizado para gestión de pedidos
 *
 * Cuando un pedido cambia a PROCESANDO, el BFF crea automáticamente
 * un envío en ms-envios. Este hook expone un callback opcional
 * `onEnvioCreado` para que el componente padre pueda refrescar
 * la lista de envíos sin necesidad de recargar la página.
 */
import { useState, useEffect, useCallback } from 'react'
import { PedidosRepository } from '../services/api'

export function usePedidos({ onEnvioCreado } = {}) {
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

      // Si el nuevo estado es PROCESANDO, el BFF habrá creado un envío
      // automáticamente. Notificamos al padre para que refresque envíos.
      if (estado === 'PROCESANDO' && typeof onEnvioCreado === 'function') {
        // Pequeño delay para dar tiempo al BFF a crear el envío
        setTimeout(() => {
          onEnvioCreado(updated)
        }, 800)
      }

      return { ok: true }
    } catch (err) {
      setError(err.detail || 'Error al actualizar estado')
      return { ok: false }
    }
  }, [onEnvioCreado])

  useEffect(() => { fetchAll() }, [fetchAll])

  return { pedidos, loading, error, fetchAll, createPedido, cambiarEstado }
}