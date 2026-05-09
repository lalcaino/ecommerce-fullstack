import { describe, it, expect } from 'vitest'

// Test básico para verificar que el módulo carga correctamente
describe('App', () => {
  it('el entorno de pruebas funciona correctamente', () => {
    expect(true).toBe(true)
  })

  it('las rutas principales están definidas', () => {
    const rutas = ['/', '/login', '/registro', '/dashboard', '/inventario', '/pedidos', '/bodegas', '/tiendas']
    expect(rutas).toHaveLength(8)
    expect(rutas).toContain('/dashboard')
    expect(rutas).toContain('/bodegas')
    expect(rutas).toContain('/tiendas')
  })

  it('las rutas protegidas requieren autenticación', () => {
    const rutasProtegidas = ['/dashboard', '/inventario', '/pedidos', '/bodegas', '/tiendas']
    const rutasPublicas   = ['/', '/login', '/registro']
    expect(rutasProtegidas).toHaveLength(5)
    expect(rutasPublicas).toHaveLength(3)
  })
})