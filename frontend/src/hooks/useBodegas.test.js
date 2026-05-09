import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useBodegas } from '../hooks/useBodegas'

// Mock del repositorio
vi.mock('../services/api', () => ({
  BodegasRepository: {
    getAll:  vi.fn(),
    create:  vi.fn(),
    update:  vi.fn(),
    delete:  vi.fn(),
  },
}))

import { BodegasRepository } from '../services/api'

const bodegasMock = [
  { id: 1, nombre: 'Bodega Central', direccion: 'Av. 1', capacidad: 500, activa: true },
  { id: 2, nombre: 'Bodega Norte',   direccion: 'Calle 2', capacidad: 200, activa: true },
]

describe('useBodegas', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    BodegasRepository.getAll.mockResolvedValue(bodegasMock)
  })

  it('carga bodegas al montar', async () => {
    const { result } = renderHook(() => useBodegas())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.bodegas).toHaveLength(2)
    expect(result.current.error).toBeNull()
  })

  it('crea una bodega y la agrega al estado', async () => {
    const nueva = { id: 3, nombre: 'Bodega Sur', direccion: 'Sur 3', capacidad: 100, activa: true }
    BodegasRepository.create.mockResolvedValue(nueva)

    const { result } = renderHook(() => useBodegas())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.createBodega({ nombre: 'Bodega Sur', direccion: 'Sur 3', capacidad: 100 })
    })

    expect(result.current.bodegas).toHaveLength(3)
    expect(result.current.bodegas[2].nombre).toBe('Bodega Sur')
  })

  it('elimina una bodega del estado', async () => {
    BodegasRepository.delete.mockResolvedValue({})

    const { result } = renderHook(() => useBodegas())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.deleteBodega(1)
    })

    expect(result.current.bodegas).toHaveLength(1)
    expect(result.current.bodegas[0].id).toBe(2)
  })

  it('actualiza una bodega en el estado', async () => {
    const actualizada = { ...bodegasMock[0], capacidad: 1000 }
    BodegasRepository.update.mockResolvedValue(actualizada)

    const { result } = renderHook(() => useBodegas())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.updateBodega(1, { capacidad: 1000 })
    })

    expect(result.current.bodegas[0].capacidad).toBe(1000)
  })

  it('maneja error al cargar bodegas', async () => {
    BodegasRepository.getAll.mockRejectedValue({ detail: 'Error de conexión' })

    const { result } = renderHook(() => useBodegas())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBe('Error de conexión')
    expect(result.current.bodegas).toHaveLength(0)
  })
})