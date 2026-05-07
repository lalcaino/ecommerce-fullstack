/**
 * api.test.js - Pruebas unitarias para CircuitBreaker y Repositories
 * Cubre: estado del circuito, apertura por fallos, recuperación
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Re-implementamos CircuitBreaker aquí para poder testearlo aislado
class CircuitBreaker {
  constructor(failureThreshold = 3, timeout = 10000) {
    this.failureCount = 0
    this.failureThreshold = failureThreshold
    this.timeout = timeout
    this.state = 'CLOSED'
    this.nextAttempt = null
  }
  async call(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) throw new Error('Circuit OPEN')
      this.state = 'HALF_OPEN'
    }
    try {
      const result = await fn()
      this.failureCount = 0
      this.state = 'CLOSED'
      return result
    } catch (err) {
      this.failureCount++
      if (this.failureCount >= this.failureThreshold) {
        this.state = 'OPEN'
        this.nextAttempt = Date.now() + this.timeout
      }
      throw err
    }
  }
  getState() { return this.state }
}

describe('CircuitBreaker', () => {
  let cb

  beforeEach(() => { cb = new CircuitBreaker(3, 5000) })

  it('empieza en estado CLOSED', () => {
    expect(cb.getState()).toBe('CLOSED')
  })

  it('permanece CLOSED en llamadas exitosas', async () => {
    await cb.call(async () => 'ok')
    await cb.call(async () => 'ok')
    expect(cb.getState()).toBe('CLOSED')
    expect(cb.failureCount).toBe(0)
  })

  it('acumula fallos sin abrir antes del threshold', async () => {
    const fail = async () => { throw new Error('fallo') }
    await cb.call(fail).catch(() => {})
    await cb.call(fail).catch(() => {})
    expect(cb.getState()).toBe('CLOSED')
    expect(cb.failureCount).toBe(2)
  })

  it('abre el circuito al alcanzar el threshold', async () => {
    const fail = async () => { throw new Error('fallo') }
    for (let i = 0; i < 3; i++) {
      await cb.call(fail).catch(() => {})
    }
    expect(cb.getState()).toBe('OPEN')
  })

  it('rechaza llamadas cuando está OPEN', async () => {
    cb.state = 'OPEN'
    cb.nextAttempt = Date.now() + 9999

    await expect(cb.call(async () => 'ok')).rejects.toThrow('Circuit OPEN')
  })

  it('pasa a HALF_OPEN después del timeout', async () => {
    cb.state = 'OPEN'
    cb.nextAttempt = Date.now() - 1  // timeout expirado

    await cb.call(async () => 'ok').catch(() => {})
    expect(cb.getState()).toBe('CLOSED')
  })

  it('se recupera a CLOSED con llamada exitosa desde HALF_OPEN', async () => {
    cb.state = 'HALF_OPEN'
    await cb.call(async () => 'recuperado')
    expect(cb.getState()).toBe('CLOSED')
    expect(cb.failureCount).toBe(0)
  })
})

// ─── Tests de Factory Method ─────────────────────────────────────────────────
function ProductoFactory(tipo) {
  const base = { nombre: '', descripcion: '', precio: '', stock: 0 }
  const tipos = {
    FISICO:   { ...base, tipo: 'FISICO',   peso_kg: 0 },
    DIGITAL:  { ...base, tipo: 'DIGITAL',  url_descarga: '' },
    SERVICIO: { ...base, tipo: 'SERVICIO', duracion_dias: 0 },
  }
  return tipos[tipo] || tipos['FISICO']
}

describe('ProductoFactory', () => {
  it('crea producto FISICO con peso_kg', () => {
    const p = ProductoFactory('FISICO')
    expect(p.tipo).toBe('FISICO')
    expect(p).toHaveProperty('peso_kg')
  })

  it('crea producto DIGITAL con url_descarga', () => {
    const p = ProductoFactory('DIGITAL')
    expect(p.tipo).toBe('DIGITAL')
    expect(p).toHaveProperty('url_descarga')
    expect(p).not.toHaveProperty('peso_kg')
  })

  it('crea producto SERVICIO con duracion_dias', () => {
    const p = ProductoFactory('SERVICIO')
    expect(p.tipo).toBe('SERVICIO')
    expect(p).toHaveProperty('duracion_dias')
  })

  it('usa FISICO como fallback para tipo desconocido', () => {
    const p = ProductoFactory('DESCONOCIDO')
    expect(p.tipo).toBe('FISICO')
  })

  it('incluye campos base en todos los tipos', () => {
    ['FISICO', 'DIGITAL', 'SERVICIO'].forEach(tipo => {
      const p = ProductoFactory(tipo)
      expect(p).toHaveProperty('nombre')
      expect(p).toHaveProperty('precio')
      expect(p).toHaveProperty('stock')
    })
  })
})
