import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import SuperAdmin from './SuperAdmin'

vi.mock('../services/authService', () => ({
  getToken: () => 'mock-token',
}))

const empresasMock = [
  { id: 1, rut: '76.354.771-K', razon_social: 'EMPRESA UNO SA', nombre_comercial: 'Empresa Uno', giro: 'Comercio', region: 'RM', activo: true, admin_nombre: 'Juan', admin_email: 'juan@empresa.cl' },
  { id: 2, rut: '77.123.456-7', razon_social: 'EMPRESA DOS LTDA', nombre_comercial: null, giro: 'Transporte', region: 'V', activo: false, admin_nombre: null, admin_email: '' },
]

describe('SuperAdmin', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  it('muestra loading inicialmente', () => {
    global.fetch.mockResolvedValue({ ok: true, json: () => new Promise(() => {}) })
    render(<SuperAdmin />)
    expect(screen.getByText('Cargando empresas...')).toBeTruthy()
  })

  it('carga y muestra empresas', async () => {
    global.fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(empresasMock) })
    render(<SuperAdmin />)
    await waitFor(() => expect(screen.getByText('EMPRESA UNO SA')).toBeTruthy())
    expect(screen.getByText('76.354.771-K')).toBeTruthy()
    expect(screen.getByText('EMPRESA DOS LTDA')).toBeTruthy()
    const activos = screen.getAllByText('Activo')
    const inactivos = screen.getAllByText('Inactivo')
    expect(activos.length).toBeGreaterThanOrEqual(1)
    expect(inactivos.length).toBeGreaterThanOrEqual(1)
  })

  it('muestra 2 empresas registradas', async () => {
    global.fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(empresasMock) })
    render(<SuperAdmin />)
    await waitFor(() => expect(screen.getByText(/2 empresas registradas/)).toBeTruthy())
  })

  it('maneja error al cargar empresas', async () => {
    global.fetch.mockResolvedValue({ ok: false })
    render(<SuperAdmin />)
    await waitFor(() => expect(screen.getByText(/Error al cargar empresas/)).toBeTruthy())
  })
})
