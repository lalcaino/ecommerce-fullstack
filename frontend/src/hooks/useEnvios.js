import { useState, useEffect, useCallback, useRef } from 'react'
import { EnviosRepository, ConductoresRepository } from '../services/api_envios'
import { PedidosRepository } from '../services/api'

// Mapeo local (espejo del backend) para optimistic updates
const ENVIO_A_PEDIDO = {
  PENDIENTE:  'PENDIENTE',
  EN_RUTA:    'ENVIADO',
  COMPLETADO: 'ENTREGADO',
  FALLIDO:    'CANCELADO',
  CANCELADO:  'CANCELADO',
}

/**
 * Enriquece cada envío con el campo `estado_pedido` obtenido de ms-pedidos.
 * Si un pedido no se puede obtener, usa el mapeo local como fallback.
 */
async function enrichConEstadoPedido(envios) {
  if (!envios.length) return envios

  // Obtener todos los pedidos en una sola llamada
  let pedidosMap = {}
  try {
    const pedidos = await PedidosRepository.getAll()
    pedidosMap = Object.fromEntries((pedidos || []).map(p => [p.id, p.estado]))
  } catch {
    // fallback: usamos el mapeo local
  }

  return envios.map(e => ({
    ...e,
    estado_pedido: pedidosMap[e.pedido_id]
      ?? ENVIO_A_PEDIDO[e.estado]
      ?? e.estado,
  }))
}

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
      const raw = Array.isArray(enviosData) ? enviosData : []
      const enriched = await enrichConEstadoPedido(raw)
      setEnvios(enriched)
      setConductores(Array.isArray(conductoresData) ? conductoresData : [])
    } catch (err) {
      setError(err.detail || err.message || 'Error al cargar envíos')
    } finally {
      setLoading(false)
    }
  }, [])

  // Polling de envíos en curso cada 15 segundos
  const startPolling = useCallback(() => {
    if (pollingRef.current) return
    pollingRef.current = setInterval(async () => {
      try {
        const enCurso = await EnviosRepository.getEnCurso()
        if (!Array.isArray(enCurso)) return
        const enriched = await enrichConEstadoPedido(enCurso)
        setEnvios(prev =>
          prev.map(e => {
            const actualizado = enriched.find(ec => ec.id === e.id)
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
      const [enriched] = await enrichConEstadoPedido([nuevo])
      setEnvios(prev => [enriched, ...prev])
      return { ok: true, data: enriched }
    } catch (err) {
      setError(err.detail || 'Error al crear envío')
      return { ok: false }
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Actualiza el estado del envío.
   * El BFF se encarga de propagar el cambio al pedido.
   * Aquí hacemos un optimistic update del estado_pedido en el frontend.
   */
  const updateEstado = useCallback(async (id, estado) => {
    // Optimistic update inmediato
    setEnvios(prev => prev.map(e =>
      e.id === id
        ? { ...e, estado, estado_pedido: ENVIO_A_PEDIDO[estado] ?? estado }
        : e
    ))
    try {
      const updated = await EnviosRepository.updateEstado(id, estado)
      // El BFF devuelve estado_pedido en la respuesta
      const estadoPedido = updated.estado_pedido ?? ENVIO_A_PEDIDO[estado] ?? estado
      setEnvios(prev => prev.map(e =>
        e.id === id ? { ...updated, estado_pedido: estadoPedido } : e
      ))
      return { ok: true }
    } catch (err) {
      // Revertir optimistic update en caso de error
      setEnvios(prev => prev.map(e =>
        e.id === id ? { ...e, estado: e.estado, estado_pedido: e.estado_pedido } : e
      ))
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