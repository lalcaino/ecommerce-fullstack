/**
 * api.test.js — Frontend SmartLogix
 * Metodología: Clases de Equivalencia
 *   Clase 1 — Datos válidos      → comportamiento esperado exitoso
 *   Clase 2 — Datos inválidos    → error controlado
 *   Clase 3 — Datos vacíos/nulos → manejo de casos límite
 *
 * Ejecutar: cd frontend && npm test
 */
import { describe, it, expect, beforeEach } from 'vitest'

// ─── CircuitBreaker (aislado) ─────────────────────────────────────────────────
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

// ─── ProductoFactory ──────────────────────────────────────────────────────────
function ProductoFactory(tipo) {
  const base = { nombre: '', descripcion: '', precio: '', stock: 0 }
  const tipos = {
    FISICO:   { ...base, tipo: 'FISICO',   peso_kg: 0 },
    DIGITAL:  { ...base, tipo: 'DIGITAL',  url_descarga: '' },
    SERVICIO: { ...base, tipo: 'SERVICIO', duracion_dias: 0 },
  }
  return tipos[tipo] || tipos['FISICO']
}

// ─── Helpers de lógica de negocio ─────────────────────────────────────────────
function calcularTotalItems(items) {
  return items.reduce((sum, i) => sum + (i.precio_unitario * i.cantidad), 0)
}

function filtrarPedidos(pedidos, estado) {
  if (estado === 'TODOS') return pedidos
  return pedidos.filter(p => p.estado === estado)
}

function filtrarProductos(productos, busqueda) {
  if (!busqueda) return productos
  return productos.filter(p =>
    p.nombre?.toLowerCase().includes(busqueda.toLowerCase())
  )
}

function validarFormRegistro({ nombre, email, password, confirmPassword }) {
  const errores = {}
  if (!nombre?.trim())               errores.nombre          = 'Ingresa tu nombre'
  if (!email?.trim())                errores.email           = 'Ingresa tu correo'
  if (!password)                     errores.password        = 'Ingresa una contraseña'
  if (password && password.length < 8) errores.password     = 'Mínimo 8 caracteres'
  if (password !== confirmPassword)  errores.confirmPassword = 'Las contraseñas no coinciden'
  return errores
}

function validarFormEmpleado({ nombre, email, password }) {
  const errores = {}
  if (!nombre?.trim()) errores.nombre   = 'requerido'
  if (!email?.trim())  errores.email    = 'requerido'
  if (!password?.trim()) errores.password = 'requerido'
  if (password && password.length < 6) errores.password = 'mínimo 6 caracteres'
  return errores
}

function getUsuarioDesdeToken(token) {
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return {
      nombre:         payload.first_name   || '',
      email:          payload.username     || '',
      rol:            payload.rol          || 'admin',
      empresa_rut:    payload.empresa_rut  || '',
      empresa_nombre: payload.empresa_nombre || '',
    }
  } catch {
    return null
  }
}


// ═══════════════════════════════════════════════════════════════════════════════
// 1. CIRCUIT BREAKER
// ═══════════════════════════════════════════════════════════════════════════════

describe('CircuitBreaker — Clase 1: Datos válidos', () => {
  let cb

  beforeEach(() => { cb = new CircuitBreaker(3, 5000) })

  it('empieza en estado CLOSED', () => {
    expect(cb.getState()).toBe('CLOSED')
  })

  it('llamada exitosa mantiene CLOSED', async () => {
    await cb.call(async () => 'ok')
    expect(cb.getState()).toBe('CLOSED')
  })

  it('múltiples exitosas no incrementan fallos', async () => {
    for (let i = 0; i < 5; i++) await cb.call(async () => 'ok')
    expect(cb.failureCount).toBe(0)
  })

  it('se recupera a CLOSED desde HALF_OPEN con éxito', async () => {
    cb.state = 'HALF_OPEN'
    await cb.call(async () => 'ok')
    expect(cb.getState()).toBe('CLOSED')
    expect(cb.failureCount).toBe(0)
  })

  it('retorna el valor de la función', async () => {
    const result = await cb.call(async () => 42)
    expect(result).toBe(42)
  })
})

describe('CircuitBreaker — Clase 2: Datos inválidos', () => {
  let cb

  beforeEach(() => { cb = new CircuitBreaker(3, 5000) })

  it('acumula fallos sin abrir antes del threshold', async () => {
    for (let i = 0; i < 2; i++) {
      await cb.call(async () => { throw new Error('fallo') }).catch(() => {})
    }
    expect(cb.getState()).toBe('CLOSED')
    expect(cb.failureCount).toBe(2)
  })

  it('abre al alcanzar threshold', async () => {
    for (let i = 0; i < 3; i++) {
      await cb.call(async () => { throw new Error('fallo') }).catch(() => {})
    }
    expect(cb.getState()).toBe('OPEN')
  })

  it('OPEN rechaza llamadas sin ejecutar fn', async () => {
    cb.state       = 'OPEN'
    cb.nextAttempt = Date.now() + 9999
    await expect(cb.call(async () => 'ok')).rejects.toThrow('Circuit OPEN')
  })

  it('propaga la excepción original', async () => {
    await expect(
      cb.call(async () => { throw new TypeError('tipo incorrecto') })
    ).rejects.toThrow('tipo incorrecto')
  })

  it('circuit breakers independientes no se afectan entre sí', () => {
    const cb1 = new CircuitBreaker(3, 5000)
    const cb2 = new CircuitBreaker(3, 5000)
    cb1.state = 'OPEN'
    expect(cb2.getState()).toBe('CLOSED')
  })
})

describe('CircuitBreaker — Clase 3: Datos vacíos/nulos', () => {
  let cb

  beforeEach(() => { cb = new CircuitBreaker(3, 5000) })

  it('fn que retorna null no falla', async () => {
    const result = await cb.call(async () => null)
    expect(result).toBeNull()
  })

  it('fn que retorna array vacío no falla', async () => {
    const result = await cb.call(async () => [])
    expect(result).toEqual([])
  })

  it('fn que retorna string vacío no falla', async () => {
    const result = await cb.call(async () => '')
    expect(result).toBe('')
  })

  it('threshold 1 abre inmediatamente con primer fallo', async () => {
    const cb1 = new CircuitBreaker(1, 5000)
    await cb1.call(async () => { throw new Error('fallo') }).catch(() => {})
    expect(cb1.getState()).toBe('OPEN')
  })

  it('OPEN pasa a HALF_OPEN tras timeout', async () => {
    cb.state       = 'OPEN'
    cb.nextAttempt = Date.now() - 1
    await cb.call(async () => 'ok').catch(() => {})
    expect(['CLOSED', 'HALF_OPEN']).toContain(cb.getState())
  })
})


// ═══════════════════════════════════════════════════════════════════════════════
// 2. PRODUCTOFACTORY
// ═══════════════════════════════════════════════════════════════════════════════

describe('ProductoFactory — Clase 1: Tipos válidos', () => {
  it('FISICO tiene peso_kg', () => {
    const p = ProductoFactory('FISICO')
    expect(p.tipo).toBe('FISICO')
    expect(p).toHaveProperty('peso_kg')
  })

  it('DIGITAL tiene url_descarga', () => {
    const p = ProductoFactory('DIGITAL')
    expect(p.tipo).toBe('DIGITAL')
    expect(p).toHaveProperty('url_descarga')
    expect(p).not.toHaveProperty('peso_kg')
  })

  it('SERVICIO tiene duracion_dias', () => {
    const p = ProductoFactory('SERVICIO')
    expect(p.tipo).toBe('SERVICIO')
    expect(p).toHaveProperty('duracion_dias')
  })

  it('todos los tipos tienen campos base', () => {
    ['FISICO', 'DIGITAL', 'SERVICIO'].forEach(tipo => {
      const p = ProductoFactory(tipo)
      expect(p).toHaveProperty('nombre')
      expect(p).toHaveProperty('precio')
      expect(p).toHaveProperty('stock')
    })
  })

  it('campos base parten vacíos o en cero', () => {
    const p = ProductoFactory('FISICO')
    expect(p.nombre).toBe('')
    expect(p.stock).toBe(0)
    expect(p.precio).toBe('')
  })
})

describe('ProductoFactory — Clase 2: Tipos inválidos', () => {
  it('tipo desconocido retorna FISICO', () => {
    expect(ProductoFactory('DESCONOCIDO').tipo).toBe('FISICO')
  })

  it('tipo en minúsculas retorna FISICO (case sensitive)', () => {
    expect(ProductoFactory('fisico').tipo).toBe('FISICO')
  })

  it('número como tipo retorna FISICO', () => {
    expect(ProductoFactory(123).tipo).toBe('FISICO')
  })

  it('objeto como tipo retorna FISICO', () => {
    expect(ProductoFactory({}).tipo).toBe('FISICO')
  })
})

describe('ProductoFactory — Clase 3: Valores vacíos/nulos', () => {
  it('tipo undefined retorna FISICO', () => {
    expect(ProductoFactory(undefined).tipo).toBe('FISICO')
  })

  it('tipo null retorna FISICO', () => {
    expect(ProductoFactory(null).tipo).toBe('FISICO')
  })

  it('string vacío retorna FISICO', () => {
    expect(ProductoFactory('').tipo).toBe('FISICO')
  })
})


// ═══════════════════════════════════════════════════════════════════════════════
// 3. LÓGICA DE PEDIDOS — TOTAL Y FILTROS
// ═══════════════════════════════════════════════════════════════════════════════

describe('calcularTotalItems — Clase 1: Datos válidos', () => {
  it('calcula total de un item', () => {
    const items = [{ precio_unitario: 1000, cantidad: 2 }]
    expect(calcularTotalItems(items)).toBe(2000)
  })

  it('calcula total de múltiples items', () => {
    const items = [
      { precio_unitario: 500, cantidad: 3 },
      { precio_unitario: 200, cantidad: 1 },
    ]
    expect(calcularTotalItems(items)).toBe(1700)
  })

  it('cantidad 1 retorna precio unitario', () => {
    const items = [{ precio_unitario: 9990, cantidad: 1 }]
    expect(calcularTotalItems(items)).toBe(9990)
  })
})

describe('calcularTotalItems — Clase 2: Datos inválidos', () => {
  it('precio negativo reduce el total', () => {
    const items = [{ precio_unitario: -100, cantidad: 2 }]
    expect(calcularTotalItems(items)).toBe(-200)
  })

  it('cantidad 0 da subtotal 0', () => {
    const items = [{ precio_unitario: 1000, cantidad: 0 }]
    expect(calcularTotalItems(items)).toBe(0)
  })
})

describe('calcularTotalItems — Clase 3: Listas vacías/nulas', () => {
  it('lista vacía retorna 0', () => {
    expect(calcularTotalItems([])).toBe(0)
  })

  it('item sin precio_unitario usa undefined → NaN', () => {
    const items = [{ cantidad: 2 }]
    expect(isNaN(calcularTotalItems(items))).toBe(true)
  })
})

describe('filtrarPedidos — Clase 1: Filtros válidos', () => {
  const pedidos = [
    { id: 1, estado: 'PENDIENTE' },
    { id: 2, estado: 'ENVIADO' },
    { id: 3, estado: 'PENDIENTE' },
    { id: 4, estado: 'ENTREGADO' },
  ]

  it('TODOS retorna todos', () => {
    expect(filtrarPedidos(pedidos, 'TODOS')).toHaveLength(4)
  })

  it('filtra por PENDIENTE', () => {
    expect(filtrarPedidos(pedidos, 'PENDIENTE')).toHaveLength(2)
  })

  it('filtra por ENVIADO', () => {
    expect(filtrarPedidos(pedidos, 'ENVIADO')).toHaveLength(1)
  })
})

describe('filtrarPedidos — Clase 2: Estados inválidos', () => {
  const pedidos = [{ estado: 'PENDIENTE' }, { estado: 'ENVIADO' }]

  it('estado desconocido retorna vacío', () => {
    expect(filtrarPedidos(pedidos, 'INEXISTENTE')).toHaveLength(0)
  })

  it('estado en minúsculas no hace match', () => {
    expect(filtrarPedidos(pedidos, 'pendiente')).toHaveLength(0)
  })
})

describe('filtrarPedidos — Clase 3: Lista vacía', () => {
  it('lista vacía retorna vacío', () => {
    expect(filtrarPedidos([], 'PENDIENTE')).toHaveLength(0)
  })

  it('lista vacía con TODOS retorna vacío', () => {
    expect(filtrarPedidos([], 'TODOS')).toHaveLength(0)
  })
})


// ═══════════════════════════════════════════════════════════════════════════════
// 4. FILTRO DE PRODUCTOS
// ═══════════════════════════════════════════════════════════════════════════════

describe('filtrarProductos — Clase 1: Búsquedas válidas', () => {
  const productos = [
    { id: 1, nombre: 'Teclado Mecánico' },
    { id: 2, nombre: 'Mouse Inalámbrico' },
    { id: 3, nombre: 'Monitor 4K' },
  ]

  it('busca por nombre parcial', () => {
    expect(filtrarProductos(productos, 'teclado')).toHaveLength(1)
  })

  it('búsqueda insensible a mayúsculas', () => {
    expect(filtrarProductos(productos, 'MOUSE')).toHaveLength(1)
  })

  it('búsqueda vacía retorna todos', () => {
    expect(filtrarProductos(productos, '')).toHaveLength(3)
  })

  it('busca substring en el medio', () => {
    expect(filtrarProductos(productos, '4K')).toHaveLength(1)
  })
})

describe('filtrarProductos — Clase 2: Búsquedas sin resultados', () => {
  const productos = [{ nombre: 'Teclado' }, { nombre: 'Mouse' }]

  it('término inexistente retorna vacío', () => {
    expect(filtrarProductos(productos, 'ZAPATO')).toHaveLength(0)
  })

  it('caracteres especiales no rompen el filtro', () => {
    expect(filtrarProductos(productos, '@#$%')).toHaveLength(0)
  })
})

describe('filtrarProductos — Clase 3: Casos nulos', () => {
  it('lista vacía retorna vacío', () => {
    expect(filtrarProductos([], 'teclado')).toHaveLength(0)
  })

  it('producto sin nombre no rompe el filtro', () => {
    const productos = [{ id: 1 }, { id: 2, nombre: 'Mouse' }]
    expect(filtrarProductos(productos, 'mouse')).toHaveLength(1)
  })

  it('búsqueda undefined retorna todos', () => {
    const productos = [{ nombre: 'A' }, { nombre: 'B' }]
    expect(filtrarProductos(productos, undefined)).toHaveLength(2)
  })
})


// ═══════════════════════════════════════════════════════════════════════════════
// 5. VALIDACIÓN FORMULARIO REGISTRO
// ═══════════════════════════════════════════════════════════════════════════════

describe('validarFormRegistro — Clase 1: Datos válidos', () => {
  it('todos los campos correctos no da errores', () => {
    const errores = validarFormRegistro({
      nombre: 'Juan Pérez',
      email: 'juan@empresa.cl',
      password: 'segura123',
      confirmPassword: 'segura123',
    })
    expect(Object.keys(errores)).toHaveLength(0)
  })

  it('password de exactamente 8 caracteres es válido', () => {
    const errores = validarFormRegistro({
      nombre: 'Ana',
      email: 'ana@test.cl',
      password: '12345678',
      confirmPassword: '12345678',
    })
    expect(errores.password).toBeUndefined()
  })
})

describe('validarFormRegistro — Clase 2: Datos inválidos', () => {
  it('password menor a 8 caracteres da error', () => {
    const errores = validarFormRegistro({
      nombre: 'Juan',
      email: 'juan@test.cl',
      password: '1234567',
      confirmPassword: '1234567',
    })
    expect(errores.password).toBeDefined()
  })

  it('contraseñas distintas da error', () => {
    const errores = validarFormRegistro({
      nombre: 'Juan',
      email: 'juan@test.cl',
      password: 'pass1234',
      confirmPassword: 'pass5678',
    })
    expect(errores.confirmPassword).toBeDefined()
  })

  it('nombre con solo espacios da error', () => {
    const errores = validarFormRegistro({
      nombre: '   ',
      email: 'juan@test.cl',
      password: 'pass1234',
      confirmPassword: 'pass1234',
    })
    expect(errores.nombre).toBeDefined()
  })
})

describe('validarFormRegistro — Clase 3: Campos vacíos', () => {
  it('nombre vacío da error', () => {
    const errores = validarFormRegistro({ nombre: '', email: 'a@b.cl', password: 'pass1234', confirmPassword: 'pass1234' })
    expect(errores.nombre).toBeDefined()
  })

  it('email vacío da error', () => {
    const errores = validarFormRegistro({ nombre: 'Juan', email: '', password: 'pass1234', confirmPassword: 'pass1234' })
    expect(errores.email).toBeDefined()
  })

  it('todos vacíos da múltiples errores', () => {
    const errores = validarFormRegistro({ nombre: '', email: '', password: '', confirmPassword: '' })
    expect(Object.keys(errores).length).toBeGreaterThanOrEqual(3)
  })

  it('undefined en nombre da error', () => {
    const errores = validarFormRegistro({ nombre: undefined, email: 'a@b.cl', password: 'pass1234', confirmPassword: 'pass1234' })
    expect(errores.nombre).toBeDefined()
  })
})


// ═══════════════════════════════════════════════════════════════════════════════
// 6. VALIDACIÓN FORMULARIO EMPLEADOS
// ═══════════════════════════════════════════════════════════════════════════════

describe('validarFormEmpleado — Clase 1: Datos válidos', () => {
  it('datos completos sin errores', () => {
    const errores = validarFormEmpleado({ nombre: 'Juan', email: 'juan@empresa.cl', password: 'pass12' })
    expect(Object.keys(errores)).toHaveLength(0)
  })

  it('password de 6 caracteres exactos es válido', () => {
    const errores = validarFormEmpleado({ nombre: 'Ana', email: 'ana@test.cl', password: 'abc123' })
    expect(errores.password).toBeUndefined()
  })
})

describe('validarFormEmpleado — Clase 2: Datos inválidos', () => {
  it('password menor a 6 da error', () => {
    const errores = validarFormEmpleado({ nombre: 'Juan', email: 'juan@test.cl', password: 'abc12' })
    expect(errores.password).toBeDefined()
  })

  it('password solo espacios da error', () => {
    const errores = validarFormEmpleado({ nombre: 'Juan', email: 'juan@test.cl', password: '      ' })
    expect(errores.password).toBeDefined()
  })
})

describe('validarFormEmpleado — Clase 3: Campos vacíos', () => {
  it('todos vacíos da múltiples errores', () => {
    const errores = validarFormEmpleado({ nombre: '', email: '', password: '' })
    expect(Object.keys(errores).length).toBeGreaterThanOrEqual(3)
  })

  it('nombre undefined da error', () => {
    const errores = validarFormEmpleado({ nombre: undefined, email: 'a@b.cl', password: 'pass12' })
    expect(errores.nombre).toBeDefined()
  })

  it('password null da error', () => {
    const errores = validarFormEmpleado({ nombre: 'Juan', email: 'a@b.cl', password: null })
    expect(errores.password).toBeDefined()
  })
})


// ═══════════════════════════════════════════════════════════════════════════════
// 7. AUTH SERVICE — getUsuario
// ═══════════════════════════════════════════════════════════════════════════════

// Token JWT de prueba (payload: first_name, email, rol, empresa_rut, empresa_nombre)
function crearTokenFalso(payload) {
  const header  = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body    = btoa(JSON.stringify(payload))
  return `${header}.${body}.firma_falsa`
}

describe('getUsuarioDesdeToken — Clase 1: Token válido', () => {
  it('extrae nombre y email', () => {
    const token = crearTokenFalso({ first_name: 'Juan', username: 'juan@test.cl', rol: 'admin', empresa_rut: '76.000.000-1', empresa_nombre: 'SmartLogix' })
    const usuario = getUsuarioDesdeToken(token)
    expect(usuario.nombre).toBe('Juan')
    expect(usuario.email).toBe('juan@test.cl')
  })

  it('extrae rol admin', () => {
    const token = crearTokenFalso({ first_name: 'Admin', username: 'admin@test.cl', rol: 'admin' })
    const usuario = getUsuarioDesdeToken(token)
    expect(usuario.rol).toBe('admin')
  })

  it('extrae rol repartidor', () => {
    const token = crearTokenFalso({ first_name: 'Juan', username: 'juan@test.cl', rol: 'repartidor' })
    const usuario = getUsuarioDesdeToken(token)
    expect(usuario.rol).toBe('repartidor')
  })

  it('extrae empresa_rut', () => {
    const token = crearTokenFalso({ first_name: 'Ana', username: 'ana@test.cl', rol: 'admin', empresa_rut: '76.354.771-K' })
    const usuario = getUsuarioDesdeToken(token)
    expect(usuario.empresa_rut).toBe('76.354.771-K')
  })

  it('extrae empresa_nombre', () => {
    const token = crearTokenFalso({ first_name: 'Luis', username: 'l@t.cl', rol: 'admin', empresa_nombre: 'Mi Empresa' })
    const usuario = getUsuarioDesdeToken(token)
    expect(usuario.empresa_nombre).toBe('Mi Empresa')
  })
})

describe('getUsuarioDesdeToken — Clase 2: Token malformado', () => {
  it('token sin las 3 partes retorna null', () => {
    expect(getUsuarioDesdeToken('soloUnaParte')).toBeNull()
  })

  it('payload no-base64 retorna null', () => {
    expect(getUsuarioDesdeToken('header.!!!.firma')).toBeNull()
  })

  it('payload sin campos retorna defaults', () => {
    const token = crearTokenFalso({})
    const usuario = getUsuarioDesdeToken(token)
    expect(usuario.nombre).toBe('')
    expect(usuario.rol).toBe('admin')
  })
})

describe('getUsuarioDesdeToken — Clase 3: Token vacío/nulo', () => {
  it('token null retorna null', () => {
    expect(getUsuarioDesdeToken(null)).toBeNull()
  })

  it('token undefined retorna null', () => {
    expect(getUsuarioDesdeToken(undefined)).toBeNull()
  })

  it('string vacío retorna null', () => {
    expect(getUsuarioDesdeToken('')).toBeNull()
  })
})


// ═══════════════════════════════════════════════════════════════════════════════
// 8. RUTAS Y ROLES
// ═══════════════════════════════════════════════════════════════════════════════

function getRutaSegunRol(rol) {
  if (rol === 'repartidor') return '/repartidor'
  return '/dashboard'
}

function puedeAccederRuta(rol, ruta) {
  const rutasAdmin = ['/dashboard', '/inventario', '/pedidos', '/bodegas', '/tiendas', '/envios', '/empleados']
  if (rol === 'repartidor') return ruta === '/repartidor'
  return rutasAdmin.includes(ruta)
}

describe('Rutas por rol — Clase 1: Roles válidos', () => {
  it('admin va al dashboard', () => {
    expect(getRutaSegunRol('admin')).toBe('/dashboard')
  })

  it('repartidor va a su vista', () => {
    expect(getRutaSegunRol('repartidor')).toBe('/repartidor')
  })

  it('admin puede acceder a inventario', () => {
    expect(puedeAccederRuta('admin', '/inventario')).toBe(true)
  })

  it('repartidor solo accede a /repartidor', () => {
    expect(puedeAccederRuta('repartidor', '/repartidor')).toBe(true)
  })

  it('repartidor no accede al dashboard', () => {
    expect(puedeAccederRuta('repartidor', '/dashboard')).toBe(false)
  })
})

describe('Rutas por rol — Clase 2: Roles inválidos', () => {
  it('rol desconocido va a dashboard', () => {
    expect(getRutaSegunRol('desconocido')).toBe('/dashboard')
  })

  it('rol desconocido no accede a /repartidor', () => {
    expect(puedeAccederRuta('desconocido', '/repartidor')).toBe(false)
  })

  it('repartidor no accede a empleados', () => {
    expect(puedeAccederRuta('repartidor', '/empleados')).toBe(false)
  })
})

describe('Rutas por rol — Clase 3: Valores vacíos/nulos', () => {
  it('rol null va a dashboard', () => {
    expect(getRutaSegunRol(null)).toBe('/dashboard')
  })

  it('rol vacío va a dashboard', () => {
    expect(getRutaSegunRol('')).toBe('/dashboard')
  })

  it('ruta vacía no es accesible para nadie', () => {
    expect(puedeAccederRuta('admin', '')).toBe(false)
  })
})