import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useTiendas } from '../hooks/useTiendas'

// Mock del repositorio
vi.mock('../services/api', () => ({
  TiendasRepository: {
    getAll:  vi.fn(),
    create:  vi.fn(),
    update:  vi.fn(),
    delete:  vi.fn(),
  },
}))

import { TiendasRepository } from '../services/api'

const tiendasMock = [
  { id: 1, nombre: 'Tienda Centro', direccion: 'Av. 1', ciudad: 'Santiago',   activa: true },
  { id: 2, nombre: 'Tienda Norte',  direccion: 'Calle 2', ciudad: 'Valparaíso', activa: true },
]

describe('useTiendas', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    TiendasRepository.getAll.mockResolvedValue(tiendasMock)
  })

  it('carga tiendas al montar', async () => {
    const { result } = renderHook(() => useTiendas())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.tiendas).toHaveLength(2)
    expect(result.current.error).toBeNull()
  })

  it('crea una tienda y la agrega al estado', async () => {
    const nueva = { id: 3, nombre: 'Tienda Sur', direccion: 'Sur 3', ciudad: 'Temuco', activa: true }
    TiendasRepository.create.mockResolvedValue(nueva)

    const { result } = renderHook(() => useTiendas())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.createTienda({ nombre: 'Tienda Sur', direccion: 'Sur 3', ciudad: 'Temuco' })
    })

    expect(result.current.tiendas).toHaveLength(3)
    expect(result.current.tiendas[2].nombre).toBe('Tienda Sur')
  })

  it('elimina una tienda del estado', async () => {
    TiendasRepository.delete.mockResolvedValue({})

    const { result } = renderHook(() => useTiendas())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.deleteTienda(1)
    })

    expect(result.current.tiendas).toHaveLength(1)
    expect(result.current.tiendas[0].id).toBe(2)
  })

  it('actualiza una tienda en el estado', async () => {
    const actualizada = { ...tiendasMock[0], ciudad: 'Concepción' }
    TiendasRepository.update.mockResolvedValue(actualizada)

    const { result } = renderHook(() => useTiendas())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.updateTienda(1, { ciudad: 'Concepción' })
    })

    expect(result.current.tiendas[0].ciudad).toBe('Concepción')
  })

  it('maneja error al cargar tiendas', async () => {
    TiendasRepository.getAll.mockRejectedValue({ detail: 'Error de conexión' })

    const { result } = renderHook(() => useTiendas())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBe('Error de conexión')
    expect(result.current.tiendas).toHaveLength(0)
  })
})