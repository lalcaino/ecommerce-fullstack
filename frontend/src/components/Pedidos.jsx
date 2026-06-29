import { useState, useEffect, useCallback } from 'react'
import { usePedidos } from '../hooks/usePedidos'
import { TiendasRepository, InventarioRepository, BodegasRepository } from '../services/api'
import GeocoderInput from './GeocoderInput'

const C = {
  brand: '#408A71', brandLight: '#e8f5f0',
  white: '#ffffff', bg: '#f4f7f6',
  gray100: '#f3f4f6', gray200: '#e5e7eb', gray300: '#d1d5db',
  gray400: '#9ca3af', gray500: '#6b7280', gray700: '#374151', gray800: '#1f2937',
  success: '#10b981', warning: '#f59e0b', error: '#ef4444', info: '#3b82f6',
}

const ESTADOS_PEDIDO = ['PENDIENTE', 'PROCESANDO', 'ENVIADO', 'ENTREGADO', 'CANCELADO']

const ESTADO_META = {
  PENDIENTE:  { color: C.gray400, icon: '⏳', label: 'Pendiente',  envioLabel: null,          desc: 'Esperando procesamiento' },
  PROCESANDO: { color: C.info,    icon: '📦', label: 'Procesando', envioLabel: 'Envío listo', desc: 'Envío creado, preparando despacho' },
  ENVIADO:    { color: '#8b5cf6', icon: '🚚', label: 'En camino',  envioLabel: 'En ruta',     desc: 'En tránsito hacia el cliente' },
  ENTREGADO:  { color: C.success, icon: '✅', label: 'Entregado',  envioLabel: 'Completado',  desc: 'Entregado exitosamente' },
  CANCELADO:  { color: C.error,   icon: '❌', label: 'Cancelado',  envioLabel: 'Cancelado',   desc: 'Pedido y envío cancelados' },
}

const TRANSICIONES_VALIDAS = {
  PENDIENTE:  ['PENDIENTE', 'PROCESANDO', 'CANCELADO'],
  PROCESANDO: ['PROCESANDO', 'ENVIADO', 'CANCELADO'],
  ENVIADO:    ['ENVIADO', 'ENTREGADO', 'CANCELADO'],
  ENTREGADO:  ['ENTREGADO'],
  CANCELADO:  ['CANCELADO'],
}

const injectStyles = () => {
  if (document.getElementById('pedidos-v3-styles')) return
  const s = document.createElement('style')
  s.id = 'pedidos-v3-styles'
  s.textContent = `
    @keyframes slideInRight { from{opacity:0;transform:translateX(120%)} to{opacity:1;transform:translateX(0)} }
    @keyframes fadeOutRight  { from{opacity:1;transform:translateX(0)}   to{opacity:0;transform:translateX(120%)} }
    @keyframes fadeInRow     { from{opacity:0;background:#e8f5f0}        to{opacity:1;background:transparent} }
    @keyframes spin          { to{transform:rotate(360deg)} }
    .pedido-toast     { animation:slideInRight .4s cubic-bezier(.16,1,.3,1) both; }
    .pedido-toast.out { animation:fadeOutRight .35s ease both; }
    .pedido-row-updated { animation:fadeInRow .8s ease; }
    .pedido-row:hover td { background:#f9fafb; }
    .geocoder-sug:hover { background:#f3f4f6; }
  `
  document.head.appendChild(s)
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ mensaje, icono = '', color = C.success, onClose }) {
  const [saliendo, setSaliendo] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => { setSaliendo(true); setTimeout(onClose, 350) }, 5000)
    return () => clearTimeout(t)
  }, [onClose])
  return (
    <div className={`pedido-toast${saliendo ? ' out' : ''}`} style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      background: C.white, borderRadius: 14, border: `1px solid ${C.gray200}`,
      borderLeft: `5px solid ${color}`, boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
      padding: '14px 18px', maxWidth: 320, display: 'flex', gap: 12, alignItems: 'flex-start',
    }}>
      <span style={{ fontSize: 22, flexShrink: 0 }}>{icono}</span>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: 13, color: C.gray800, lineHeight: 1.5 }}
          dangerouslySetInnerHTML={{ __html: mensaje }} />
      </div>
      <button onClick={() => { setSaliendo(true); setTimeout(onClose, 350) }}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.gray400, fontSize: 18 }}>×</button>
    </div>
  )
}



// ─── Badge y Selector estado ──────────────────────────────────────────────────
function EstadoBadge({ estado }) {
  const meta = ESTADO_META[estado] || { color: C.gray500, icon: '•', label: estado }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span style={{
        background: meta.color + '18', color: meta.color, border: `1px solid ${meta.color}30`,
        borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700,
        display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
      }}>
        {meta.icon} {meta.label}
      </span>
      {meta.envioLabel && (
        <span style={{ fontSize: 10, color: meta.color, fontWeight: 600, paddingLeft: 4, opacity: 0.8 }}>
          🔗 {meta.envioLabel}
        </span>
      )}
    </div>
  )
}

function SelectorEstado({ pedido, onCambiar }) {
  const meta        = ESTADO_META[pedido.estado] || {}
  const color       = meta.color || C.gray500
  const transiciones = TRANSICIONES_VALIDAS[pedido.estado] || ESTADOS_PEDIDO

  if (['ENTREGADO', 'CANCELADO'].includes(pedido.estado)) {
    return <span style={{ fontSize: 11, color: C.gray400, fontStyle: 'italic' }}>Estado final</span>
  }

  return (
    <select value={pedido.estado} onChange={e => onCambiar(pedido.id, e.target.value)} style={{
      border: `1.5px solid ${color}40`, borderRadius: 8, padding: '5px 10px',
      fontSize: 12, fontWeight: 600, color, background: color + '10',
      outline: 'none', cursor: 'pointer', fontFamily: 'inherit',
    }}>
      {transiciones.map(e => (
        <option key={e} value={e}>
          {ESTADO_META[e]?.icon} {ESTADO_META[e]?.label || e}
          {e === 'PROCESANDO' && pedido.estado === 'PENDIENTE' ? ' (crea envío)' : ''}
          {e === 'ENVIADO' ? ' (activa ruta)' : ''}
        </option>
      ))}
    </select>
  )
}

// ─── Selector de productos ────────────────────────────────────────────────────
function SelectorProductos({ productos, items, onChange }) {
  const [busqueda, setBusqueda] = useState('')

  const productosFiltrados = productos.filter(p =>
    p.nombre?.toLowerCase().includes(busqueda.toLowerCase())
  )

  const handleAgregar = (producto) => {
    if (items.some(i => i.producto_id === producto.id)) return
    onChange([...items, {
      producto_id:     producto.id,
      nombre_producto: producto.nombre,
      precio_unitario: parseFloat(producto.precio),
      cantidad:        1,
    }])
  }

  const handleCantidad = (producto_id, cantidad) => {
    const cant = Math.max(1, parseInt(cantidad) || 1)
    onChange(items.map(i => i.producto_id === producto_id ? { ...i, cantidad: cant } : i))
  }

  const handleEliminar = (producto_id) => {
    onChange(items.filter(i => i.producto_id !== producto_id))
  }

  const total = items.reduce((sum, i) => sum + i.precio_unitario * i.cantidad, 0)

  const inputStyle = {
    border: `1.5px solid ${C.gray200}`, borderRadius: 8,
    padding: '8px 12px', fontSize: 13, fontFamily: 'inherit',
    color: C.gray800, outline: 'none', width: '100%', boxSizing: 'border-box',
  }

  return (
    <div>
      <input
        placeholder="🔍 Buscar producto..."
        value={busqueda} onChange={e => setBusqueda(e.target.value)}
        style={{ ...inputStyle, marginBottom: 8 }}
      />

      {busqueda && productosFiltrados.length > 0 && (
        <div style={{
          border: `1px solid ${C.gray200}`, borderRadius: 10,
          maxHeight: 180, overflowY: 'auto', marginBottom: 12,
          background: C.white, boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        }}>
          {productosFiltrados.map(p => {
            const yaAgregado = items.some(i => i.producto_id === p.id)
            const sinStock   = p.stock === 0
            return (
              <div key={p.id} onClick={() => !yaAgregado && !sinStock && handleAgregar(p)}
                style={{
                  padding: '10px 14px', cursor: yaAgregado || sinStock ? 'not-allowed' : 'pointer',
                  borderBottom: `1px solid ${C.gray100}`,
                  background: yaAgregado ? C.brandLight : sinStock ? C.gray100 : C.white,
                  opacity: sinStock ? 0.5 : 1,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}
              >
                <div>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: C.gray800 }}>{p.nombre}</p>
                  <p style={{ margin: 0, fontSize: 11, color: C.gray500 }}>
                    Stock: {p.stock} · ${parseFloat(p.precio).toLocaleString('es-CL')}
                  </p>
                </div>
                <span style={{ fontSize: 18 }}>
                  {yaAgregado ? '✅' : sinStock ? '❌' : '＋'}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {busqueda && productosFiltrados.length === 0 && (
        <p style={{ fontSize: 12, color: C.gray400, margin: '0 0 12px' }}>Sin resultados</p>
      )}

      {items.length > 0 && (
        <div style={{ border: `1px solid ${C.gray200}`, borderRadius: 10, overflow: 'hidden', marginTop: 8 }}>
          <div style={{ background: C.gray100, padding: '8px 14px' }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: C.gray500, textTransform: 'uppercase', letterSpacing: '.5px' }}>
              Productos seleccionados
            </p>
          </div>
          {items.map(item => (
            <div key={item.producto_id} style={{
              padding: '10px 14px', borderBottom: `1px solid ${C.gray100}`,
              display: 'flex', alignItems: 'center', gap: 10, background: C.white,
            }}>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: C.gray800 }}>{item.nombre_producto}</p>
                <p style={{ margin: 0, fontSize: 11, color: C.gray500 }}>${item.precio_unitario.toLocaleString('es-CL')} c/u</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button onClick={() => handleCantidad(item.producto_id, item.cantidad - 1)}
                  style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${C.gray200}`, background: C.white, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                <input type="number" min="1" value={item.cantidad}
                  onChange={e => handleCantidad(item.producto_id, e.target.value)}
                  style={{ width: 48, textAlign: 'center', border: `1.5px solid ${C.gray200}`, borderRadius: 6, padding: '4px 0', fontSize: 13, fontFamily: 'inherit' }} />
                <button onClick={() => handleCantidad(item.producto_id, item.cantidad + 1)}
                  style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${C.gray200}`, background: C.white, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>＋</button>
              </div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: C.gray800, minWidth: 70, textAlign: 'right' }}>
                ${(item.precio_unitario * item.cantidad).toLocaleString('es-CL')}
              </p>
              <button onClick={() => handleEliminar(item.producto_id)}
                style={{ background: C.error + '18', border: `1px solid ${C.error}30`, color: C.error, borderRadius: 6, width: 28, height: 28, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
          ))}
          <div style={{ padding: '12px 14px', background: C.brandLight, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: C.brand }}>Total</span>
            <span style={{ fontWeight: 800, fontSize: 16, color: C.brand }}>${total.toLocaleString('es-CL')}</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Formulario nuevo pedido ──────────────────────────────────────────────────
function NuevoPedidoForm({ tiendas, bodegas, productos, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    cliente: '', email_cliente: '', telefono_cliente: '',
    direccion_entrega: '', latitud_entrega: '', longitud_entrega: '',
    tienda: '', origen_despacho: 'tienda', bodega_origen_id: '', notas: '',
  })
  const [items,         setItems]         = useState([])
  const [direccionTexto, setDireccionTexto] = useState('')

  const change = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }))

  const handleDireccionSelect = ({ nombre, lat, lon }) => {
    setDireccionTexto(nombre)
    setForm(p => ({ ...p, direccion_entrega: nombre, latitud_entrega: lat, longitud_entrega: lon }))
  }

  const handleDireccionChange = (val) => {
    setDireccionTexto(val)
    setForm(p => ({ ...p, direccion_entrega: val }))
  }

  const total = items.reduce((sum, i) => sum + i.precio_unitario * i.cantidad, 0)

  const labelStyle = { fontSize: 11, fontWeight: 700, color: C.gray500, textTransform: 'uppercase', letterSpacing: '.5px' }
  const inputStyle = {
    border: `1.5px solid ${C.gray200}`, borderRadius: 8,
    padding: '8px 12px', fontSize: 14, fontFamily: 'inherit',
    color: C.gray800, background: C.white, outline: 'none',
    width: '100%', boxSizing: 'border-box',
  }

  return (
    <div style={{ background: C.white, borderRadius: 14, border: `1px solid ${C.gray200}`, padding: 24, marginBottom: 20 }}>
      <h3 style={{ margin: '0 0 18px', fontSize: 16, fontWeight: 700, color: C.gray800 }}>Nuevo Pedido</h3>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
        {[
          { name: 'cliente',          label: 'Cliente',       type: 'text'  },
          { name: 'email_cliente',    label: 'Email cliente', type: 'email' },
          { name: 'telefono_cliente', label: 'Teléfono',      type: 'text', placeholder: '+56 9 1234 5678' },
          { name: 'notas',            label: 'Notas',         type: 'text', placeholder: 'Opcional' },
        ].map(({ name, label, type, placeholder }) => (
          <div key={name} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={labelStyle}>{label}</label>
            <input name={name} type={type} value={form[name]}
              onChange={change} placeholder={placeholder} style={inputStyle} />
          </div>
        ))}

        {/* Dirección con Mapbox */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, gridColumn: 'span 2' }}>
          <label style={labelStyle}>Dirección de entrega</label>
          <GeocoderInput
            value={direccionTexto}
            onChange={handleDireccionChange}
            onSelect={handleDireccionSelect}
            placeholder="Ej: Av. Providencia 1234, Santiago"
          />
        </div>

        {/* Origen de despacho */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={labelStyle}>Origen despacho</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {['tienda', 'bodega'].map(o => (
              <label key={o} style={{
                flex: 1, display: 'flex', alignItems: 'center', gap: 6,
                border: `1.5px solid ${form.origen_despacho === o ? C.brand : C.gray200}`,
                borderRadius: 8, padding: '8px 12px', cursor: 'pointer',
                background: form.origen_despacho === o ? C.brandLight : C.white,
                fontWeight: 600, fontSize: 13, color: form.origen_despacho === o ? C.brand : C.gray700,
              }}>
                <input type="radio" name="origen_despacho" value={o}
                  checked={form.origen_despacho === o}
                  onChange={change} style={{ accentColor: C.brand }} />
                {o === 'tienda' ? '🏪 Tienda' : '🏭 Bodega'}
              </label>
            ))}
          </div>
        </div>

        {/* Tienda (si origen = tienda) */}
        {form.origen_despacho === 'tienda' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={labelStyle}>Tienda</label>
            <select name="tienda" value={form.tienda} onChange={change}
              style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="">Seleccionar tienda</option>
              {tiendas.map(t => <option key={t.id} value={t.id}>🏪 {t.nombre} — {t.ciudad}</option>)}
            </select>
          </div>
        )}

        {/* Bodega (si origen = bodega) */}
        {form.origen_despacho === 'bodega' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={labelStyle}>Bodega origen</label>
            <select name="bodega_origen_id" value={form.bodega_origen_id} onChange={change}
              style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="">Seleccionar bodega</option>
              {bodegas.map(b => <option key={b.id} value={b.id}>🏭 {b.nombre} — {b.direccion}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Productos */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ ...labelStyle, display: 'block', marginBottom: 8 }}>
          Productos {items.length > 0 && <span style={{ color: C.brand }}>({items.length} agregado{items.length !== 1 ? 's' : ''})</span>}
        </label>
        {productos.length === 0 ? (
          <div style={{ background: C.gray100, borderRadius: 10, padding: '14px 16px', color: C.gray500, fontSize: 13, textAlign: 'center' }}>
            No hay productos en inventario. Agrega productos primero.
          </div>
        ) : (
          <SelectorProductos productos={productos} items={items} onChange={setItems} />
        )}
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button onClick={() => onSubmit({
              ...form,
              latitud_entrega: form.latitud_entrega ? parseFloat(form.latitud_entrega) : null,
              longitud_entrega: form.longitud_entrega ? parseFloat(form.longitud_entrega) : null,
              tienda: form.tienda ? parseInt(form.tienda) : null,
              bodega_origen_id: form.bodega_origen_id ? parseInt(form.bodega_origen_id) : null,
              items: items.map(i => ({ producto_id: i.producto_id, nombre_producto: i.nombre_producto, cantidad: i.cantidad, precio_unitario: i.precio_unitario })),
            })}
          style={{ background: C.success + '18', color: C.success, border: `1px solid ${C.success}30`, borderRadius: 8, padding: '9px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          ✓ Crear Pedido {total > 0 && `— $${total.toLocaleString('es-CL')}`}
        </button>
        <button onClick={onCancel}
          style={{ background: C.gray100, color: C.gray700, border: `1px solid ${C.gray200}`, borderRadius: 8, padding: '9px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          Cancelar
        </button>
      </div>
    </div>
  )
}

// ─── Flujo badge ──────────────────────────────────────────────────────────────
function FlujoBadge() {
  const pasos = [
    { estado: 'PENDIENTE',  envio: '—' },
    { estado: 'PROCESANDO', envio: 'Envío: Pendiente' },
    { estado: 'ENVIADO',    envio: 'Envío: En ruta' },
    { estado: 'ENTREGADO',  envio: 'Envío: Completado' },
  ]
  return (
    <div style={{ background: C.white, border: `1px solid ${C.gray200}`, borderRadius: 12, padding: '12px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto' }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: C.gray500, marginRight: 14, whiteSpace: 'nowrap' }}>Flujo:</span>
      {pasos.map((p, i) => {
        const meta = ESTADO_META[p.estado]
        return (
          <div key={p.estado} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ textAlign: 'center', padding: '0 6px' }}>
              <div style={{ background: meta.color + '15', color: meta.color, border: `1px solid ${meta.color}30`, borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
                {meta.icon} {meta.label}
              </div>
              <div style={{ fontSize: 10, color: C.gray400, marginTop: 3, whiteSpace: 'nowrap' }}>{p.envio}</div>
            </div>
            {i < pasos.length - 1 && <span style={{ color: C.gray300, fontSize: 16, margin: '0 2px' }}>→</span>}
          </div>
        )
      })}
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function Pedidos() {
  injectStyles()

  const [toast,      setToast]      = useState(null)
  const [updatedRow, setUpdatedRow] = useState(null)

  const handleEnvioCreado = useCallback((pedido) => {
    setToast({ icono: '📦', color: C.brand, mensaje: `Pedido <strong>#${pedido?.id}</strong> en procesamiento — envío creado y visible en <strong>🗺️ Envíos</strong>.` })
    setUpdatedRow(pedido?.id)
    setTimeout(() => setUpdatedRow(null), 2000)
  }, [])

  const { pedidos, loading, error, createPedido, cambiarEstado } = usePedidos({ onEnvioCreado: handleEnvioCreado })

  const [tiendas,   setTiendas]   = useState([])
  const [bodegas,   setBodegas]   = useState([])
  const [productos, setProductos] = useState([])
  const [showForm,  setShowForm]  = useState(false)
  const [filtro,    setFiltro]    = useState('TODOS')
  const [search,    setSearch]    = useState('')

  useEffect(() => {
    TiendasRepository.getAll().then(setTiendas).catch(() => setTiendas([]))
    BodegasRepository.getAll().then(setBodegas).catch(() => setBodegas([]))
    InventarioRepository.getAll().then(setProductos).catch(() => setProductos([]))
  }, [])

  const handleCambiarEstado = useCallback(async (id, nuevoEstado) => {
    const res = await cambiarEstado(id, nuevoEstado)
    if (res?.ok) {
      const meta = ESTADO_META[nuevoEstado]
      if (nuevoEstado !== 'PROCESANDO') {
        setToast({ icono: meta?.icon || '✓', color: meta?.color || C.success, mensaje: `Pedido <strong>#${id}</strong> actualizado a <strong>${meta?.label || nuevoEstado}</strong>${meta?.envioLabel ? ` — Envío: <strong>${meta.envioLabel}</strong>` : ''}.` })
      }
      setUpdatedRow(id)
      setTimeout(() => setUpdatedRow(null), 2000)
    }
  }, [cambiarEstado])

  const visible = pedidos
    .filter(p => filtro === 'TODOS' || p.estado === filtro)
    .filter(p => p.cliente?.toLowerCase().includes(search.toLowerCase()))

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
      <p style={{ color: C.gray500, fontWeight: 600 }}>📦 Cargando pedidos...</p>
    </div>
  )

  return (
    <div style={{ padding: '28px 24px', background: C.bg, minHeight: '100vh' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: C.gray800 }}>📦 Gestión de Pedidos</h1>
            <p style={{ margin: '4px 0 0', color: C.gray500, fontSize: 14 }}>{pedidos.length} pedidos · Estados sincronizados con Envíos</p>
          </div>
          <button onClick={() => setShowForm(v => !v)} style={{
            background: showForm ? C.gray100 : C.brand, color: showForm ? C.gray700 : '#fff',
            border: showForm ? `1px solid ${C.gray200}` : 'none', borderRadius: 8,
            padding: '9px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            {showForm ? '✕ Cerrar' : '＋ Nuevo Pedido'}
          </button>
        </div>

        {error && (
          <div style={{ background: C.error + '12', border: `1px solid ${C.error}30`, borderRadius: 12, padding: '12px 16px', marginBottom: 16, color: C.error, fontSize: 14, fontWeight: 600 }}>
            ⚠️ {error}
          </div>
        )}

        <FlujoBadge />

        {showForm && (
          <NuevoPedidoForm
            tiendas={tiendas} bodegas={bodegas} productos={productos}
            onSubmit={async (data) => { const res = await createPedido(data); if (res.ok) setShowForm(false) }}
            onCancel={() => setShowForm(false)}
          />
        )}

        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <input placeholder="🔍 Buscar cliente..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ border: `1.5px solid ${C.gray200}`, borderRadius: 8, padding: '8px 14px', fontSize: 14, fontFamily: 'inherit', outline: 'none', width: 220, color: C.gray800 }} />
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['TODOS', ...ESTADOS_PEDIDO].map(e => {
              const meta = ESTADO_META[e]; const active = filtro === e; const color = meta?.color || C.brand
              return (
                <button key={e} onClick={() => setFiltro(e)} style={{
                  padding: '5px 12px', borderRadius: 20, cursor: 'pointer', fontSize: 12, fontWeight: 700,
                  fontFamily: 'inherit', border: `1.5px solid ${color}`,
                  background: active ? color : C.white, color: active ? '#fff' : color,
                }}>
                  {meta?.icon || ''} {meta?.label || e}
                </button>
              )
            })}
          </div>
        </div>

        <div style={{ background: C.white, borderRadius: 14, border: `1px solid ${C.gray200}`, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: C.gray100, borderBottom: `1px solid ${C.gray200}` }}>
                {['ID', 'Cliente', 'Teléfono', 'Dirección', 'Productos', 'Total', 'Estado', 'Tienda', 'Fecha', 'Cambiar'].map(h => (
                  <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontWeight: 700, color: C.gray500, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.5px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((p, i) => (
                <tr key={p.id} className={`pedido-row${updatedRow === p.id ? ' pedido-row-updated' : ''}`}
                  style={{ borderBottom: i < visible.length - 1 ? `1px solid ${C.gray100}` : 'none' }}>
                  <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: 12, color: C.brand, fontWeight: 700 }}>#{p.id}</td>
                  <td style={{ padding: '12px 14px', fontWeight: 600, color: C.gray800 }}>{p.cliente}</td>
                  <td style={{ padding: '12px 14px', color: C.gray500, fontSize: 13 }}>{p.telefono_cliente || '—'}</td>
                  <td style={{ padding: '12px 14px', color: C.gray500, fontSize: 13, maxWidth: 160 }}>
                    <span title={p.direccion_entrega} style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.direccion_entrega || '—'}</span>
                  </td>
                  <td style={{ padding: '12px 14px', color: C.gray500, fontSize: 12 }}>
                    {Array.isArray(p.items) && p.items.length > 0 ? `${p.items.length} producto${p.items.length !== 1 ? 's' : ''}` : '—'}
                  </td>
                  <td style={{ padding: '12px 14px', fontWeight: 700, color: C.gray800 }}>${parseFloat(p.total || 0).toLocaleString('es-CL')}</td>
                  <td style={{ padding: '12px 14px' }}><EstadoBadge estado={p.estado} /></td>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: C.gray500 }}>{p.tienda_nombre ? `🏪 ${p.tienda_nombre}` : '—'}</td>
                  <td style={{ padding: '12px 14px', color: C.gray500, fontSize: 12 }}>{new Date(p.fecha_creacion).toLocaleDateString('es-CL')}</td>
                  <td style={{ padding: '12px 14px' }}><SelectorEstado pedido={p} onCambiar={handleCambiarEstado} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {visible.length === 0 && <p style={{ textAlign: 'center', padding: 32, color: C.gray400 }}>Sin resultados</p>}
        </div>
      </div>

      {toast && <Toast icono={toast.icono} color={toast.color} mensaje={toast.mensaje} onClose={() => setToast(null)} />}
    </div>
  )
}