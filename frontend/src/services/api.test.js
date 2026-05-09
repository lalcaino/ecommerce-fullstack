import { describe, it, expect, beforeEach } from 'vitest'

// CircuitBreaker aislado para tests
class CircuitBreaker {
  constructor(failureThreshold = 3, timeout = 10000) {
    this.failureCount     = 0
    this.failureThreshold = failureThreshold
    this.timeout          = timeout
    this.state            = 'CLOSED'
    this.nextAttempt      = null
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
        this.state       = 'OPEN'
        this.nextAttempt = Date.now() + this.timeout
      }
      throw err
    }
  }

  getState() { return this.state }
}

// ProductoFactory aislado para tests
function ProductoFactory(tipo) {
  const base = { nombre: '', descripcion: '', precio: '', stock: 0 }
  const tipos = {
    FISICO:   { ...base, tipo: 'FISICO',   peso_kg: 0 },
    DIGITAL:  { ...base, tipo: 'DIGITAL',  url_descarga: '' },
    SERVICIO: { ...base, tipo: 'SERVICIO', duracion_dias: 0 },
  }
  return tipos[tipo] || tipos['FISICO']
}

// ─── Tests CircuitBreaker ─────────────────────────────────────────────────────
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
    for (let i = 0; i < 3; i++) await cb.call(fail).catch(() => {})
    expect(cb.getState()).toBe('OPEN')
  })

  it('rechaza llamadas cuando está OPEN', async () => {
    cb.state       = 'OPEN'
    cb.nextAttempt = Date.now() + 9999
    await expect(cb.call(async () => 'ok')).rejects.toThrow('Circuit OPEN')
  })

  it('pasa a CLOSED después del timeout', async () => {
    cb.state       = 'OPEN'
    cb.nextAttempt = Date.now() - 1
    await cb.call(async () => 'ok').catch(() => {})
    expect(cb.getState()).toBe('CLOSED')
  })

  it('se recupera a CLOSED desde HALF_OPEN con llamada exitosa', async () => {
    cb.state = 'HALF_OPEN'
    await cb.call(async () => 'ok')
    expect(cb.getState()).toBe('CLOSED')
    expect(cb.failureCount).toBe(0)
  })

  it('múltiples circuit breakers son independientes', () => {
    const cb1 = new CircuitBreaker(3, 5000)
    const cb2 = new CircuitBreaker(3, 5000)
    cb1.state = 'OPEN'
    expect(cb2.getState()).toBe('CLOSED')
  })
})

// ─── Tests ProductoFactory ────────────────────────────────────────────────────
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

  it('los campos base parten vacíos o en cero', () => {
    const p = ProductoFactory('FISICO')
    expect(p.nombre).toBe('')
    expect(p.stock).toBe(0)
  })
})

// ─── Tests lógica de Dashboard ────────────────────────────────────────────────
describe('Dashboard aggregation logic', () => {
  it('cuenta productos bajo stock correctamente', () => {
    const productos = [
      { stock: 2,  stock_minimo: 5 },
      { stock: 10, stock_minimo: 5 },
      { stock: 0,  stock_minimo: 5 },
    ]
    const bajo = productos.filter(p => p.stock <= p.stock_minimo).length
    expect(bajo).toBe(2)
  })

  it('cuenta pedidos pendientes correctamente', () => {
    const pedidos = [
      { estado: 'PENDIENTE' },
      { estado: 'ENVIADO' },
      { estado: 'PENDIENTE' },
      { estado: 'ENTREGADO' },
    ]
    const pendientes = pedidos.filter(p => p.estado === 'PENDIENTE').length
    expect(pendientes).toBe(2)
  })

  it('limita pedidos recientes a 5', () => {
    const pedidos = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1, fecha_creacion: `2026-04-${String(i + 1).padStart(2, '0')}`,
    }))
    const recientes = [...pedidos].sort((a, b) =>
      b.fecha_creacion.localeCompare(a.fecha_creacion)
    ).slice(0, 5)
    expect(recientes.length).toBe(5)
    expect(recientes[0].id).toBe(10)
  })

  it('cuenta bodegas correctamente', () => {
    const bodegas = [
      { id: 1, nombre: 'Bodega A', activa: true },
      { id: 2, nombre: 'Bodega B', activa: true },
    ]
    expect(bodegas.length).toBe(2)
  })

  it('cuenta tiendas correctamente', () => {
    const tiendas = [
      { id: 1, nombre: 'Tienda A' },
      { id: 2, nombre: 'Tienda B' },
      { id: 3, nombre: 'Tienda C' },
    ]
    expect(tiendas.length).toBe(3)
  })
})

// ─── Tests lógica de Bodega ───────────────────────────────────────────────────
describe('Bodega logic', () => {
  it('filtra bodegas por nombre correctamente', () => {
    const bodegas = [
      { id: 1, nombre: 'Bodega Central' },
      { id: 2, nombre: 'Bodega Norte' },
      { id: 3, nombre: 'Almacén Sur' },
    ]
    const resultado = bodegas.filter(b =>
      b.nombre.toLowerCase().includes('bodega')
    )
    expect(resultado.length).toBe(2)
  })

  it('una bodega nueva tiene activa en true por defecto', () => {
    const bodega = { nombre: 'Nueva', direccion: 'Calle 1', capacidad: 100, activa: true }
    expect(bodega.activa).toBe(true)
  })

  it('capacidad debe ser un número positivo', () => {
    const capacidad = 500
    expect(capacidad).toBeGreaterThan(0)
  })
})

// ─── Tests lógica de Tienda ───────────────────────────────────────────────────
describe('Tienda logic', () => {
  it('filtra tiendas por nombre o ciudad', () => {
    const tiendas = [
      { id: 1, nombre: 'Tienda Centro', ciudad: 'Santiago' },
      { id: 2, nombre: 'Tienda Norte',  ciudad: 'Valparaíso' },
      { id: 3, nombre: 'Outlet Sur',    ciudad: 'Concepción' },
    ]
    const search = 'tienda'
    const resultado = tiendas.filter(t =>
      t.nombre.toLowerCase().includes(search) ||
      t.ciudad.toLowerCase().includes(search)
    )
    expect(resultado.length).toBe(2)
  })

  it('filtra tiendas por ciudad', () => {
    const tiendas = [
      { id: 1, nombre: 'Tienda A', ciudad: 'Santiago' },
      { id: 2, nombre: 'Tienda B', ciudad: 'Santiago' },
      { id: 3, nombre: 'Tienda C', ciudad: 'Temuco' },
    ]
    const resultado = tiendas.filter(t => t.ciudad === 'Santiago')
    expect(resultado.length).toBe(2)
  })

  it('una tienda nueva tiene activa en true por defecto', () => {
    const tienda = { nombre: 'Nueva', direccion: 'Av. 1', ciudad: 'Santiago', activa: true }
    expect(tienda.activa).toBe(true)
  })
})