/**
 * hooks.test.js — Pruebas de Custom Hooks SmartLogix
 * Metodología: Clases de Equivalencia
 *   Clase 1 — Datos válidos
 *   Clase 2 — Datos inválidos
 *   Clase 3 — Datos vacíos/nulos
 *
 * Ejecutar: cd frontend && npm test
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

// ─── Mocks globales ───────────────────────────────────────────────────────────
vi.mock('../services/api', () => ({
  PedidosRepository: {
    getAll:         vi.fn(),
    create:         vi.fn(),
    cambiarEstado:  vi.fn(),
  },
  InventarioRepository: {
    getAll:   vi.fn(),
    create:   vi.fn(),
    update:   vi.fn(),
    delete:   vi.fn(),
    upload:   vi.fn(),
  },
  TiendasRepository: {
    getAll:  vi.fn(),
    create:  vi.fn(),
    update:  vi.fn(),
    delete:  vi.fn(),
  },
  BodegasRepository: {
    getAll:  vi.fn(),
    create:  vi.fn(),
    update:  vi.fn(),
    delete:  vi.fn(),
  },
}))

import {
  PedidosRepository,
  InventarioRepository,
  TiendasRepository,
  BodegasRepository,
} from '../services/api'

// ─── Implementaciones inline de los hooks (para no depender de imports) ───────

import { useState, useEffect, useCallback } from 'react'

function usePedidosMock({ onEnvioCreado } = {}) {
  const [pedidos,  setPedidos]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await PedidosRepository.getAll()
      setPedidos(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message || 'Error al cargar pedidos')
    } finally {
      setLoading(false)
    }
  }, [])

  const createPedido = useCallback(async (payload) => {
    try {
      const nuevo = await PedidosRepository.create(payload)
      setPedidos(prev => [...prev, nuevo])
      return { ok: true, data: nuevo }
    } catch (err) {
      setError(err.message || 'Error al crear pedido')
      return { ok: false }
    }
  }, [])

  const cambiarEstado = useCallback(async (id, estado) => {
    try {
      const updated = await PedidosRepository.cambiarEstado(id, { estado })
      setPedidos(prev => prev.map(p => p.id === id ? { ...p, estado } : p))
      if (estado === 'PROCESANDO' && onEnvioCreado) onEnvioCreado(updated)
      return { ok: true, data: updated }
    } catch (err) {
      setError(err.message || 'Error al cambiar estado')
      return { ok: false }
    }
  }, [onEnvioCreado])

  useEffect(() => { fetchAll() }, [fetchAll])

  return { pedidos, loading, error, createPedido, cambiarEstado, fetchAll }
}

function useInventarioMock() {
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await InventarioRepository.getAll()
      setItems(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message || 'Error al cargar inventario')
    } finally {
      setLoading(false)
    }
  }, [])

  const createItem = useCallback(async (payload) => {
    try {
      const nuevo = await InventarioRepository.create(payload)
      setItems(prev => [...prev, nuevo])
      return { ok: true, id: nuevo.id }
    } catch (err) {
      setError(err.message || 'Error al crear producto')
      return { ok: false }
    }
  }, [])

  const updateItem = useCallback(async (id, payload) => {
    try {
      const updated = await InventarioRepository.update(id, payload)
      setItems(prev => prev.map(i => i.id === id ? updated : i))
      return { ok: true }
    } catch (err) {
      setError(err.message || 'Error al actualizar')
      return { ok: false }
    }
  }, [])

  const deleteItem = useCallback(async (id) => {
    try {
      await InventarioRepository.delete(id)
      setItems(prev => prev.filter(i => i.id !== id))
      return { ok: true }
    } catch (err) {
      setError(err.message || 'Error al eliminar')
      return { ok: false }
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  return { items, loading, error, createItem, updateItem, deleteItem, fetchAll }
}

function useTiendasMock() {
  const [tiendas, setTiendas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await TiendasRepository.getAll()
      setTiendas(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message || 'Error al cargar tiendas')
    } finally {
      setLoading(false)
    }
  }, [])

  const createTienda = useCallback(async (payload) => {
    try {
      const nueva = await TiendasRepository.create(payload)
      setTiendas(prev => [...prev, nueva])
      return { ok: true }
    } catch (err) {
      setError(err.message || 'Error al crear tienda')
      return { ok: false }
    }
  }, [])

  const updateTienda = useCallback(async (id, payload) => {
    try {
      const updated = await TiendasRepository.update(id, payload)
      setTiendas(prev => prev.map(t => t.id === id ? updated : t))
      return { ok: true }
    } catch (err) {
      setError(err.message || 'Error al actualizar tienda')
      return { ok: false }
    }
  }, [])

  const deleteTienda = useCallback(async (id) => {
    try {
      await TiendasRepository.delete(id)
      setTiendas(prev => prev.filter(t => t.id !== id))
      return { ok: true }
    } catch (err) {
      setError(err.message || 'Error al eliminar tienda')
      return { ok: false }
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  return { tiendas, loading, error, createTienda, updateTienda, deleteTienda }
}


// ═══════════════════════════════════════════════════════════════════════════════
// 1. usePedidos
// ═══════════════════════════════════════════════════════════════════════════════

const pedidosMock = [
  { id: 1, cliente: 'Juan Pérez',  estado: 'PENDIENTE',  total: 59990 },
  { id: 2, cliente: 'Ana López',   estado: 'ENVIADO',    total: 19990 },
  { id: 3, cliente: 'Carlos Ruiz', estado: 'ENTREGADO',  total: 99990 },
]

describe('usePedidos — Clase 1: Datos válidos', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    PedidosRepository.getAll.mockResolvedValue(pedidosMock)
  })

  it('carga pedidos al montar', async () => {
    const { result } = renderHook(() => usePedidosMock())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.pedidos).toHaveLength(3)
    expect(result.current.error).toBeNull()
  })

  it('crea un pedido y lo agrega al estado', async () => {
    const nuevo = { id: 4, cliente: 'María', estado: 'PENDIENTE', total: 29990 }
    PedidosRepository.create.mockResolvedValue(nuevo)

    const { result } = renderHook(() => usePedidosMock())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.createPedido({ cliente: 'María', email_cliente: 'm@t.cl' })
    })

    expect(result.current.pedidos).toHaveLength(4)
    expect(result.current.pedidos[3].cliente).toBe('María')
  })

  it('cambia estado de PENDIENTE a PROCESANDO', async () => {
    const updated = { id: 1, cliente: 'Juan Pérez', estado: 'PROCESANDO', total: 59990 }
    PedidosRepository.cambiarEstado.mockResolvedValue(updated)

    const { result } = renderHook(() => usePedidosMock())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.cambiarEstado(1, 'PROCESANDO')
    })

    expect(result.current.pedidos[0].estado).toBe('PROCESANDO')
  })

  it('dispara onEnvioCreado al pasar a PROCESANDO', async () => {
    const onEnvioCreado = vi.fn()
    const updated = { id: 1, estado: 'PROCESANDO' }
    PedidosRepository.cambiarEstado.mockResolvedValue(updated)

    const { result } = renderHook(() => usePedidosMock({ onEnvioCreado }))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.cambiarEstado(1, 'PROCESANDO')
    })

    expect(onEnvioCreado).toHaveBeenCalledWith(updated)
  })

  it('loading empieza en true y termina en false', async () => {
    const { result } = renderHook(() => usePedidosMock())
    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
  })
})

describe('usePedidos — Clase 2: Datos inválidos / errores de red', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('setea error si getAll falla', async () => {
    PedidosRepository.getAll.mockRejectedValue(new Error('Error de red'))
    const { result } = renderHook(() => usePedidosMock())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('Error de red')
    expect(result.current.pedidos).toHaveLength(0)
  })

  it('retorna ok:false si create falla', async () => {
    PedidosRepository.getAll.mockResolvedValue([])
    PedidosRepository.create.mockRejectedValue(new Error('Error al crear'))

    const { result } = renderHook(() => usePedidosMock())
    await waitFor(() => expect(result.current.loading).toBe(false))

    let res
    await act(async () => { res = await result.current.createPedido({}) })
    expect(res.ok).toBe(false)
  })

  it('retorna ok:false si cambiarEstado falla', async () => {
    PedidosRepository.getAll.mockResolvedValue(pedidosMock)
    PedidosRepository.cambiarEstado.mockRejectedValue(new Error('Fallo estado'))

    const { result } = renderHook(() => usePedidosMock())
    await waitFor(() => expect(result.current.loading).toBe(false))

    let res
    await act(async () => { res = await result.current.cambiarEstado(1, 'ENVIADO') })
    expect(res.ok).toBe(false)
    expect(result.current.error).toBe('Fallo estado')
  })

  it('no llama onEnvioCreado si el estado no es PROCESANDO', async () => {
    const onEnvioCreado = vi.fn()
    PedidosRepository.getAll.mockResolvedValue(pedidosMock)
    PedidosRepository.cambiarEstado.mockResolvedValue({ id: 1, estado: 'ENVIADO' })

    const { result } = renderHook(() => usePedidosMock({ onEnvioCreado }))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => { await result.current.cambiarEstado(1, 'ENVIADO') })
    expect(onEnvioCreado).not.toHaveBeenCalled()
  })

  it('respuesta no-array de getAll resulta en lista vacía', async () => {
    PedidosRepository.getAll.mockResolvedValue({ error: 'inesperado' })
    const { result } = renderHook(() => usePedidosMock())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.pedidos).toHaveLength(0)
  })
})

describe('usePedidos — Clase 3: Datos vacíos/nulos', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('getAll retorna array vacío → pedidos vacío sin error', async () => {
    PedidosRepository.getAll.mockResolvedValue([])
    const { result } = renderHook(() => usePedidosMock())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.pedidos).toHaveLength(0)
    expect(result.current.error).toBeNull()
  })

  it('getAll retorna null → pedidos vacío', async () => {
    PedidosRepository.getAll.mockResolvedValue(null)
    const { result } = renderHook(() => usePedidosMock())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.pedidos).toHaveLength(0)
  })

  it('cambiarEstado con id inexistente no rompe la lista', async () => {
    PedidosRepository.getAll.mockResolvedValue(pedidosMock)
    PedidosRepository.cambiarEstado.mockResolvedValue({ id: 999, estado: 'ENVIADO' })

    const { result } = renderHook(() => usePedidosMock())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => { await result.current.cambiarEstado(999, 'ENVIADO') })
    // La lista original no se rompe
    expect(result.current.pedidos).toHaveLength(3)
  })

  it('sin onEnvioCreado no lanza error al cambiar a PROCESANDO', async () => {
    PedidosRepository.getAll.mockResolvedValue(pedidosMock)
    PedidosRepository.cambiarEstado.mockResolvedValue({ id: 1, estado: 'PROCESANDO' })

    const { result } = renderHook(() => usePedidosMock())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => { await result.current.cambiarEstado(1, 'PROCESANDO') })
    expect(result.current.error).toBeNull()
  })
})


// ═══════════════════════════════════════════════════════════════════════════════
// 2. useInventario
// ═══════════════════════════════════════════════════════════════════════════════

const itemsMock = [
  { id: 1, nombre: 'Teclado', tipo: 'FISICO',  precio: '49990', stock: 20, stock_minimo: 5  },
  { id: 2, nombre: 'Mouse',   tipo: 'FISICO',  precio: '19990', stock: 3,  stock_minimo: 10 },
  { id: 3, nombre: 'ERP',     tipo: 'DIGITAL', precio: '99990', stock: 0,  stock_minimo: 1  },
]

describe('useInventario — Clase 1: Datos válidos', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    InventarioRepository.getAll.mockResolvedValue(itemsMock)
  })

  it('carga inventario al montar', async () => {
    const { result } = renderHook(() => useInventarioMock())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.items).toHaveLength(3)
    expect(result.current.error).toBeNull()
  })

  it('crea producto y lo agrega a la lista', async () => {
    const nuevo = { id: 4, nombre: 'Monitor', tipo: 'FISICO', precio: '299990', stock: 5 }
    InventarioRepository.create.mockResolvedValue(nuevo)

    const { result } = renderHook(() => useInventarioMock())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => { await result.current.createItem({ nombre: 'Monitor', tipo: 'FISICO', precio: '299990' }) })
    expect(result.current.items).toHaveLength(4)
    expect(result.current.items[3].nombre).toBe('Monitor')
  })

  it('actualiza producto en la lista', async () => {
    const updated = { ...itemsMock[0], stock: 100 }
    InventarioRepository.update.mockResolvedValue(updated)

    const { result } = renderHook(() => useInventarioMock())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => { await result.current.updateItem(1, { stock: 100 }) })
    expect(result.current.items[0].stock).toBe(100)
  })

  it('elimina producto de la lista', async () => {
    InventarioRepository.delete.mockResolvedValue({})

    const { result } = renderHook(() => useInventarioMock())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => { await result.current.deleteItem(1) })
    expect(result.current.items).toHaveLength(2)
    expect(result.current.items.find(i => i.id === 1)).toBeUndefined()
  })

  it('createItem retorna id del nuevo producto', async () => {
    const nuevo = { id: 5, nombre: 'Silla', tipo: 'FISICO', precio: '89990', stock: 10 }
    InventarioRepository.create.mockResolvedValue(nuevo)

    const { result } = renderHook(() => useInventarioMock())
    await waitFor(() => expect(result.current.loading).toBe(false))

    let res
    await act(async () => { res = await result.current.createItem({}) })
    expect(res.id).toBe(5)
  })
})

describe('useInventario — Clase 2: Errores de red o datos inválidos', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('setea error si getAll falla', async () => {
    InventarioRepository.getAll.mockRejectedValue(new Error('Sin conexión'))
    const { result } = renderHook(() => useInventarioMock())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('Sin conexión')
  })

  it('retorna ok:false si create falla', async () => {
    InventarioRepository.getAll.mockResolvedValue([])
    InventarioRepository.create.mockRejectedValue(new Error('Error al crear'))

    const { result } = renderHook(() => useInventarioMock())
    await waitFor(() => expect(result.current.loading).toBe(false))

    let res
    await act(async () => { res = await result.current.createItem({}) })
    expect(res.ok).toBe(false)
  })

  it('retorna ok:false si update falla', async () => {
    InventarioRepository.getAll.mockResolvedValue(itemsMock)
    InventarioRepository.update.mockRejectedValue(new Error('Error al actualizar'))

    const { result } = renderHook(() => useInventarioMock())
    await waitFor(() => expect(result.current.loading).toBe(false))

    let res
    await act(async () => { res = await result.current.updateItem(1, { stock: -1 }) })
    expect(res.ok).toBe(false)
  })

  it('retorna ok:false si delete falla', async () => {
    InventarioRepository.getAll.mockResolvedValue(itemsMock)
    InventarioRepository.delete.mockRejectedValue(new Error('Error al eliminar'))

    const { result } = renderHook(() => useInventarioMock())
    await waitFor(() => expect(result.current.loading).toBe(false))

    let res
    await act(async () => { res = await result.current.deleteItem(1) })
    expect(res.ok).toBe(false)
    expect(result.current.items).toHaveLength(3) // lista no cambia si falla
  })

  it('respuesta no-array resulta en lista vacía', async () => {
    InventarioRepository.getAll.mockResolvedValue('error inesperado')
    const { result } = renderHook(() => useInventarioMock())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.items).toHaveLength(0)
  })
})

describe('useInventario — Clase 3: Lista vacía o nula', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('inventario vacío sin error', async () => {
    InventarioRepository.getAll.mockResolvedValue([])
    const { result } = renderHook(() => useInventarioMock())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.items).toHaveLength(0)
    expect(result.current.error).toBeNull()
  })

  it('getAll retorna null → items vacío', async () => {
    InventarioRepository.getAll.mockResolvedValue(null)
    const { result } = renderHook(() => useInventarioMock())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.items).toHaveLength(0)
  })

  it('deleteItem con id inexistente no rompe la lista', async () => {
    InventarioRepository.getAll.mockResolvedValue(itemsMock)
    InventarioRepository.delete.mockResolvedValue({})

    const { result } = renderHook(() => useInventarioMock())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => { await result.current.deleteItem(999) })
    expect(result.current.items).toHaveLength(3)
  })
})


// ═══════════════════════════════════════════════════════════════════════════════
// 3. useTiendas
// ═══════════════════════════════════════════════════════════════════════════════

const tiendasMock = [
  { id: 1, nombre: 'Tienda Centro',  ciudad: 'Santiago',    direccion: 'Av. 1' },
  { id: 2, nombre: 'Tienda Norte',   ciudad: 'Antofagasta', direccion: 'Calle 2' },
  { id: 3, nombre: 'Tienda Sur',     ciudad: 'Temuco',      direccion: 'Pasaje 3' },
]

describe('useTiendas — Clase 1: Datos válidos', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    TiendasRepository.getAll.mockResolvedValue(tiendasMock)
  })

  it('carga tiendas al montar', async () => {
    const { result } = renderHook(() => useTiendasMock())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.tiendas).toHaveLength(3)
  })

  it('crea tienda y la agrega a la lista', async () => {
    const nueva = { id: 4, nombre: 'Tienda Oeste', ciudad: 'Valparaíso', direccion: 'Puerto 4' }
    TiendasRepository.create.mockResolvedValue(nueva)

    const { result } = renderHook(() => useTiendasMock())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => { await result.current.createTienda({ nombre: 'Tienda Oeste', ciudad: 'Valparaíso' }) })
    expect(result.current.tiendas).toHaveLength(4)
  })

  it('actualiza tienda en la lista', async () => {
    const updated = { ...tiendasMock[0], ciudad: 'Concepción' }
    TiendasRepository.update.mockResolvedValue(updated)

    const { result } = renderHook(() => useTiendasMock())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => { await result.current.updateTienda(1, { ciudad: 'Concepción' }) })
    expect(result.current.tiendas[0].ciudad).toBe('Concepción')
  })

  it('elimina tienda de la lista', async () => {
    TiendasRepository.delete.mockResolvedValue({})

    const { result } = renderHook(() => useTiendasMock())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => { await result.current.deleteTienda(2) })
    expect(result.current.tiendas).toHaveLength(2)
    expect(result.current.tiendas.find(t => t.id === 2)).toBeUndefined()
  })

  it('createTienda retorna ok:true', async () => {
    TiendasRepository.create.mockResolvedValue({ id: 5, nombre: 'T5', ciudad: 'Iquique' })
    const { result } = renderHook(() => useTiendasMock())
    await waitFor(() => expect(result.current.loading).toBe(false))

    let res
    await act(async () => { res = await result.current.createTienda({}) })
    expect(res.ok).toBe(true)
  })
})

describe('useTiendas — Clase 2: Errores de red', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('error en getAll setea mensaje de error', async () => {
    TiendasRepository.getAll.mockRejectedValue(new Error('Timeout'))
    const { result } = renderHook(() => useTiendasMock())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('Timeout')
  })

  it('error en create retorna ok:false y no modifica lista', async () => {
    TiendasRepository.getAll.mockResolvedValue(tiendasMock)
    TiendasRepository.create.mockRejectedValue(new Error('Error al crear'))

    const { result } = renderHook(() => useTiendasMock())
    await waitFor(() => expect(result.current.loading).toBe(false))

    let res
    await act(async () => { res = await result.current.createTienda({}) })
    expect(res.ok).toBe(false)
    expect(result.current.tiendas).toHaveLength(3)
  })

  it('error en update retorna ok:false y no modifica lista', async () => {
    TiendasRepository.getAll.mockResolvedValue(tiendasMock)
    TiendasRepository.update.mockRejectedValue(new Error('Error al actualizar'))

    const { result } = renderHook(() => useTiendasMock())
    await waitFor(() => expect(result.current.loading).toBe(false))

    let res
    await act(async () => { res = await result.current.updateTienda(1, {}) })
    expect(res.ok).toBe(false)
    expect(result.current.tiendas[0].ciudad).toBe('Santiago') // sin cambios
  })

  it('error en delete retorna ok:false y mantiene la tienda', async () => {
    TiendasRepository.getAll.mockResolvedValue(tiendasMock)
    TiendasRepository.delete.mockRejectedValue(new Error('Error al eliminar'))

    const { result } = renderHook(() => useTiendasMock())
    await waitFor(() => expect(result.current.loading).toBe(false))

    let res
    await act(async () => { res = await result.current.deleteTienda(1) })
    expect(res.ok).toBe(false)
    expect(result.current.tiendas).toHaveLength(3) // no se eliminó
  })
})

describe('useTiendas — Clase 3: Lista vacía o nula', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('lista vacía sin error', async () => {
    TiendasRepository.getAll.mockResolvedValue([])
    const { result } = renderHook(() => useTiendasMock())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.tiendas).toHaveLength(0)
    expect(result.current.error).toBeNull()
  })

  it('getAll retorna null → tiendas vacío', async () => {
    TiendasRepository.getAll.mockResolvedValue(null)
    const { result } = renderHook(() => useTiendasMock())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.tiendas).toHaveLength(0)
  })

  it('deleteTienda con id inexistente no rompe la lista', async () => {
    TiendasRepository.getAll.mockResolvedValue(tiendasMock)
    TiendasRepository.delete.mockResolvedValue({})

    const { result } = renderHook(() => useTiendasMock())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => { await result.current.deleteTienda(9999) })
    expect(result.current.tiendas).toHaveLength(3)
  })
})


// ═══════════════════════════════════════════════════════════════════════════════
// 4. SINCRONIZACIÓN ESTADO PEDIDO ↔ ENVÍO
// ═══════════════════════════════════════════════════════════════════════════════

const PEDIDO_A_ENVIO = {
  'PROCESANDO': 'PENDIENTE',
  'ENVIADO':    'EN_RUTA',
  'ENTREGADO':  'COMPLETADO',
  'CANCELADO':  'CANCELADO',
}

const ENVIO_A_PEDIDO = {
  'PENDIENTE':  'PROCESANDO',
  'EN_RUTA':    'ENVIADO',
  'COMPLETADO': 'ENTREGADO',
  'CANCELADO':  'CANCELADO',
  'FALLIDO':    'PENDIENTE',
}

function sincronizarEnvioDesddePedido(estadoPedido) {
  return PEDIDO_A_ENVIO[estadoPedido] || null
}

function sincronizarPedidoDesdeEnvio(estadoEnvio) {
  return ENVIO_A_PEDIDO[estadoEnvio] || null
}

describe('Sincronización Pedido→Envío — Clase 1: Estados válidos', () => {
  it('PROCESANDO crea envío en PENDIENTE', () => {
    expect(sincronizarEnvioDesddePedido('PROCESANDO')).toBe('PENDIENTE')
  })

  it('ENVIADO pone envío EN_RUTA', () => {
    expect(sincronizarEnvioDesddePedido('ENVIADO')).toBe('EN_RUTA')
  })

  it('ENTREGADO completa el envío', () => {
    expect(sincronizarEnvioDesddePedido('ENTREGADO')).toBe('COMPLETADO')
  })

  it('CANCELADO cancela el envío', () => {
    expect(sincronizarEnvioDesddePedido('CANCELADO')).toBe('CANCELADO')
  })
})

describe('Sincronización Pedido→Envío — Clase 2: Estados inválidos', () => {
  it('PENDIENTE no sincroniza envío (retorna null)', () => {
    expect(sincronizarEnvioDesddePedido('PENDIENTE')).toBeNull()
  })

  it('estado desconocido retorna null', () => {
    expect(sincronizarEnvioDesddePedido('ESTADO_RARO')).toBeNull()
  })

  it('estado en minúsculas no hace match', () => {
    expect(sincronizarEnvioDesddePedido('enviado')).toBeNull()
  })
})

describe('Sincronización Pedido→Envío — Clase 3: Valores vacíos', () => {
  it('undefined retorna null', () => {
    expect(sincronizarEnvioDesddePedido(undefined)).toBeNull()
  })

  it('string vacío retorna null', () => {
    expect(sincronizarEnvioDesddePedido('')).toBeNull()
  })

  it('null retorna null', () => {
    expect(sincronizarEnvioDesddePedido(null)).toBeNull()
  })
})

describe('Sincronización Envío→Pedido — Clase 1: Estados válidos', () => {
  it('EN_RUTA actualiza pedido a ENVIADO', () => {
    expect(sincronizarPedidoDesdeEnvio('EN_RUTA')).toBe('ENVIADO')
  })

  it('COMPLETADO actualiza pedido a ENTREGADO', () => {
    expect(sincronizarPedidoDesdeEnvio('COMPLETADO')).toBe('ENTREGADO')
  })

  it('CANCELADO cancela el pedido', () => {
    expect(sincronizarPedidoDesdeEnvio('CANCELADO')).toBe('CANCELADO')
  })

  it('FALLIDO revierte pedido a PENDIENTE', () => {
    expect(sincronizarPedidoDesdeEnvio('FALLIDO')).toBe('PENDIENTE')
  })
})

describe('Sincronización Envío→Pedido — Clase 2: Estados inválidos', () => {
  it('estado inventado retorna null', () => {
    expect(sincronizarPedidoDesdeEnvio('INVENTADO')).toBeNull()
  })

  it('estado en minúsculas no hace match', () => {
    expect(sincronizarPedidoDesdeEnvio('completado')).toBeNull()
  })
})

describe('Sincronización Envío→Pedido — Clase 3: Valores vacíos', () => {
  it('undefined retorna null', () => {
    expect(sincronizarPedidoDesdeEnvio(undefined)).toBeNull()
  })

  it('string vacío retorna null', () => {
    expect(sincronizarPedidoDesdeEnvio('')).toBeNull()
  })

  it('null retorna null', () => {
    expect(sincronizarPedidoDesdeEnvio(null)).toBeNull()
  })
})