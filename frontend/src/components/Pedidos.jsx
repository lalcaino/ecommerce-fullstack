import { useState, useEffect, useCallback } from 'react'
import { usePedidos } from '../hooks/usePedidos'
import { TiendasRepository } from '../services/api'

const C = {
  brand: '#408A71', brandLight: '#e8f5f0',
  white: '#ffffff', bg: '#f4f7f6',
  gray100: '#f3f4f6', gray200: '#e5e7eb', gray300: '#d1d5db',
  gray400: '#9ca3af', gray500: '#6b7280', gray700: '#374151', gray800: '#1f2937',
  success: '#10b981', warning: '#f59e0b', error: '#ef4444', info: '#3b82f6',
}

// ─── Estado unificado pedido↔envío ───────────────────────────────────────────
//
// Cada fila de pedido muestra UN solo estado visual que combina ambos sistemas.
// El selector solo muestra las transiciones válidas desde el estado actual.

const ESTADOS_PEDIDO = ['PENDIENTE', 'PROCESANDO', 'ENVIADO', 'ENTREGADO', 'CANCELADO']

const ESTADO_META = {
  PENDIENTE:  { color: C.gray400,  icon: '', label: 'Pendiente',   envioLabel: null,           desc: 'Esperando procesamiento' },
  PROCESANDO: { color: C.info,     icon: '', label: 'Procesando',  envioLabel: 'Envío listo',  desc: 'Envío creado, preparando despacho' },
  ENVIADO:    { color: '#8b5cf6',  icon: '', label: 'En camino',   envioLabel: 'En ruta',      desc: 'En tránsito hacia el cliente' },
  ENTREGADO:  { color: C.success,  icon: '', label: 'Entregado',   envioLabel: 'Completado',   desc: 'Entregado exitosamente' },
  CANCELADO:  { color: C.error,    icon: '', label: 'Cancelado',   envioLabel: 'Cancelado',    desc: 'Pedido y envío cancelados' },
}

// Transiciones válidas desde cada estado (lo que puede elegir el usuario)
const TRANSICIONES_VALIDAS = {
  PENDIENTE:  ['PENDIENTE', 'PROCESANDO', 'CANCELADO'],
  PROCESANDO: ['PROCESANDO', 'ENVIADO', 'CANCELADO'],
  ENVIADO:    ['ENVIADO', 'ENTREGADO', 'CANCELADO'],
  ENTREGADO:  ['ENTREGADO'],
  CANCELADO:  ['CANCELADO'],
}

// ─── Estilos globales ─────────────────────────────────────────────────────────
const injectStyles = () => {
  if (document.getElementById('pedidos-v2-styles')) return
  const s = document.createElement('style')
  s.id = 'pedidos-v2-styles'
  s.textContent = `
    @keyframes slideInRight {
      from { opacity:0; transform:translateX(120%); }
      to   { opacity:1; transform:translateX(0); }
    }
    @keyframes fadeOutRight {
      from { opacity:1; transform:translateX(0); }
      to   { opacity:0; transform:translateX(120%); }
    }
    @keyframes fadeInRow {
      from { opacity:0; background:#e8f5f0; }
      to   { opacity:1; background:transparent; }
    }
    .pedido-toast       { animation: slideInRight .4s cubic-bezier(.16,1,.3,1) both; }
    .pedido-toast.out   { animation: fadeOutRight .35s ease both; }
    .pedido-row-updated { animation: fadeInRow .8s ease; }
    .pedido-row:hover td { background: #f9fafb; }
  `
  document.head.appendChild(s)
}

// ─── Toast ───────────────────────────────────────────────────────────────────
function Toast({ mensaje, icono = '', color = C.success, onClose }) {
  const [saliendo, setSaliendo] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => { setSaliendo(true); setTimeout(onClose, 350) }, 5000)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div className={`pedido-toast${saliendo ? ' out' : ''}`} style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      background: C.white, borderRadius: 14,
      border: `1px solid ${C.gray200}`, borderLeft: `5px solid ${color}`,
      boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
      padding: '14px 18px', maxWidth: 320,
      display: 'flex', gap: 12, alignItems: 'flex-start',
    }}>
      <span style={{ fontSize: 22, flexShrink: 0 }}>{icono}</span>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: 13, color: C.gray800, lineHeight: 1.5 }}
           dangerouslySetInnerHTML={{ __html: mensaje }} />
      </div>
      <button onClick={() => { setSaliendo(true); setTimeout(onClose, 350) }}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.gray400, fontSize: 18, lineHeight: 1 }}>
        ×
      </button>
    </div>
  )
}

// ─── Badge de estado unificado ────────────────────────────────────────────────
function EstadoBadge({ estado }) {
  const meta = ESTADO_META[estado] || { color: C.gray500, icon: '•', label: estado }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span style={{
        background: meta.color + '18', color: meta.color,
        border: `1px solid ${meta.color}30`,
        borderRadius: 20, padding: '3px 10px',
        fontSize: 12, fontWeight: 700,
        display: 'inline-flex', alignItems: 'center', gap: 5,
        whiteSpace: 'nowrap',
      }}>
        {meta.icon} {meta.label}
      </span>
      {meta.envioLabel && (
        <span style={{ fontSize: 10, color: meta.color, fontWeight: 600, paddingLeft: 4, opacity: 0.8 }}>
           {meta.envioLabel}
        </span>
      )}
    </div>
  )
}

// ─── Selector de estado con transiciones válidas ──────────────────────────────
function SelectorEstado({ pedido, onCambiar }) {
  const meta        = ESTADO_META[pedido.estado] || {}
  const color       = meta.color || C.gray500
  const transiciones = TRANSICIONES_VALIDAS[pedido.estado] || ESTADOS_PEDIDO

  if (pedido.estado === 'ENTREGADO' || pedido.estado === 'CANCELADO') {
    return (
      <span style={{ fontSize: 11, color: C.gray400, fontStyle: 'italic' }}>
        Estado final
      </span>
    )
  }

  return (
    <select
      value={pedido.estado}
      onChange={e => onCambiar(pedido.id, e.target.value)}
      style={{
        border: `1.5px solid ${color}40`, borderRadius: 8,
        padding: '5px 10px', fontSize: 12, fontWeight: 600,
        color, background: color + '10',
        outline: 'none', cursor: 'pointer', fontFamily: 'inherit',
      }}
    >
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

// ─── Formulario nuevo pedido ──────────────────────────────────────────────────
function NuevoPedidoForm({ tiendas, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    cliente: '', email_cliente: '', telefono_cliente: '',
    direccion_entrega: '', tienda: '', notas: '',
  })
  const change = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }))
  const labelStyle = { fontSize: 11, fontWeight: 700, color: C.gray500, textTransform: 'uppercase', letterSpacing: '.5px' }
  const inputStyle = {
    border: `1.5px solid ${C.gray200}`, borderRadius: 8,
    padding: '8px 12px', fontSize: 14, fontFamily: 'inherit',
    color: C.gray800, background: C.white, outline: 'none',
    width: '100%', boxSizing: 'border-box',
  }

  return (
    <div style={{
      background: C.white, borderRadius: 14, border: `1px solid ${C.gray200}`,
      padding: 24, marginBottom: 20,
    }}>
      <h3 style={{ margin: '0 0 18px', fontSize: 16, fontWeight: 700, color: C.gray800 }}>
        Nuevo Pedido
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {[
          { name: 'cliente',           label: 'Cliente',            type: 'text'  },
          { name: 'email_cliente',     label: 'Email cliente',      type: 'email' },
          { name: 'telefono_cliente',  label: 'Teléfono',           type: 'text', placeholder: '+56 9 1234 5678' },
          { name: 'direccion_entrega', label: 'Dirección entrega',  type: 'text', placeholder: 'Av. Principal 123, Santiago' },
          { name: 'notas',             label: 'Notas',              type: 'text', placeholder: 'Opcional' },
        ].map(({ name, label, type, placeholder }) => (
          <div key={name} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={labelStyle}>{label}</label>
            <input name={name} type={type} value={form[name]}
              onChange={change} placeholder={placeholder}
              style={inputStyle} />
          </div>
        ))}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={labelStyle}>Tienda</label>
          <select name="tienda" value={form.tienda} onChange={change}
            style={{ ...inputStyle, cursor: 'pointer' }}>
            <option value="">Sin tienda asignada</option>
            {tiendas.map(t => (
              <option key={t.id} value={t.id}> {t.nombre} — {t.ciudad}</option>
            ))}
          </select>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
        <button onClick={() => onSubmit({ ...form, tienda: form.tienda ? parseInt(form.tienda) : null })}
          style={{
            background: C.success + '18', color: C.success,
            border: `1px solid ${C.success}30`, borderRadius: 8,
            padding: '9px 18px', fontSize: 14, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
          ✓ Crear Pedido
        </button>
        <button onClick={onCancel} style={{
          background: C.gray100, color: C.gray700,
          border: `1px solid ${C.gray200}`, borderRadius: 8,
          padding: '9px 18px', fontSize: 14, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'inherit',
        }}>
          Cancelar
        </button>
      </div>
    </div>
  )
}

// ─── Leyenda de flujo ─────────────────────────────────────────────────────────
function FlujoBadge() {
  const pasos = [
    { estado: 'PENDIENTE',  envio: '—' },
    { estado: 'PROCESANDO', envio: 'Envío: Pendiente' },
    { estado: 'ENVIADO',    envio: 'Envío: En ruta' },
    { estado: 'ENTREGADO',  envio: 'Envío: Completado' },
  ]
  return (
    <div style={{
      background: C.white, border: `1px solid ${C.gray200}`,
      borderRadius: 12, padding: '12px 18px', marginBottom: 20,
      display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto',
    }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: C.gray500, marginRight: 14, whiteSpace: 'nowrap' }}>
        Flujo:
      </span>
      {pasos.map((p, i) => {
        const meta = ESTADO_META[p.estado]
        return (
          <div key={p.estado} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ textAlign: 'center', padding: '0 6px' }}>
              <div style={{
                background: meta.color + '15', color: meta.color,
                border: `1px solid ${meta.color}30`,
                borderRadius: 8, padding: '4px 10px',
                fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
              }}>
                {meta.icon} {meta.label}
              </div>
              <div style={{ fontSize: 10, color: C.gray400, marginTop: 3, whiteSpace: 'nowrap' }}>
                {p.envio}
              </div>
            </div>
            {i < pasos.length - 1 && (
              <span style={{ color: C.gray300, fontSize: 16, margin: '0 2px' }}>→</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function Pedidos() {
  injectStyles()

  const [toast,        setToast]     = useState(null)
  const [updatedRow,   setUpdatedRow] = useState(null)

  const handleEnvioCreado = useCallback((pedido) => {
    setToast({
      icono: '',
      color: C.brand,
      mensaje: `Pedido <strong>#${pedido?.id}</strong> en procesamiento — envío creado y visible en <strong>🗺️ Envíos</strong>.`,
    })
    setUpdatedRow(pedido?.id)
    setTimeout(() => setUpdatedRow(null), 2000)
  }, [])

  const { pedidos, loading, error, createPedido, cambiarEstado } = usePedidos({
    onEnvioCreado: handleEnvioCreado,
  })

  const [tiendas,  setTiendas]  = useState([])
  const [showForm, setShowForm] = useState(false)
  const [filtro,   setFiltro]   = useState('TODOS')
  const [search,   setSearch]   = useState('')

  useEffect(() => {
    TiendasRepository.getAll().then(setTiendas).catch(() => setTiendas([]))
  }, [])

  const handleCambiarEstado = useCallback(async (id, nuevoEstado) => {
    const res = await cambiarEstado(id, nuevoEstado)
    if (res?.ok) {
      const meta = ESTADO_META[nuevoEstado]
      if (nuevoEstado !== 'PROCESANDO') {   // PROCESANDO ya tiene toast propio via onEnvioCreado
        setToast({
          icono: meta?.icon || '✓',
          color: meta?.color || C.success,
          mensaje: `Pedido <strong>#${id}</strong> actualizado a <strong>${meta?.label || nuevoEstado}</strong>${
            meta?.envioLabel ? ` — Envío: <strong>${meta.envioLabel}</strong>` : ''
          }.`,
        })
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
      <p style={{ color: C.gray500, fontWeight: 600 }}> Cargando pedidos...</p>
    </div>
  )

  return (
    <div style={{ padding: '28px 24px', background: C.bg, minHeight: '100vh' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: C.gray800 }}> Gestión de Pedidos</h1>
            <p style={{ margin: '4px 0 0', color: C.gray500, fontSize: 14 }}>
              {pedidos.length} pedidos · Estados sincronizados con Envíos
            </p>
          </div>
          <button onClick={() => setShowForm(v => !v)} style={{
            background: showForm ? C.gray100 : C.brand,
            color: showForm ? C.gray700 : '#fff',
            border: showForm ? `1px solid ${C.gray200}` : 'none',
            borderRadius: 8, padding: '9px 18px', fontSize: 14,
            fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            {showForm ? '✕ Cerrar' : '＋ Nuevo Pedido'}
          </button>
        </div>

        {error && (
          <div style={{
            background: C.error + '12', border: `1px solid ${C.error}30`,
            borderRadius: 12, padding: '12px 16px', marginBottom: 16,
            color: C.error, fontSize: 14, fontWeight: 600,
          }}> {error}</div>
        )}

        {/* Flujo visual */}
        <FlujoBadge />

        {showForm && (
          <NuevoPedidoForm
            tiendas={tiendas}
            onSubmit={async (data) => {
              const res = await createPedido(data)
              if (res.ok) setShowForm(false)
            }}
            onCancel={() => setShowForm(false)}
          />
        )}

        {/* Filtros */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            placeholder=" Buscar cliente..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{
              border: `1.5px solid ${C.gray200}`, borderRadius: 8,
              padding: '8px 14px', fontSize: 14, fontFamily: 'inherit',
              outline: 'none', width: 220, color: C.gray800,
            }}
          />
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['TODOS', ...ESTADOS_PEDIDO].map(e => {
              const meta   = ESTADO_META[e]
              const active = filtro === e
              const color  = meta?.color || C.brand
              return (
                <button key={e} onClick={() => setFiltro(e)} style={{
                  padding: '5px 12px', borderRadius: 20, cursor: 'pointer',
                  fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
                  border: `1.5px solid ${color}`,
                  background: active ? color : C.white,
                  color: active ? '#fff' : color,
                  transition: 'all .15s',
                }}>
                  {meta?.icon || ''} {meta?.label || e}
                </button>
              )
            })}
          </div>
        </div>

        {/* Tabla */}
        <div style={{ background: C.white, borderRadius: 14, border: `1px solid ${C.gray200}`, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: C.gray100, borderBottom: `1px solid ${C.gray200}` }}>
                {['ID', 'Cliente', 'Teléfono', 'Dirección entrega', 'Total', 'Estado + Envío', 'Tienda', 'Fecha', 'Cambiar estado'].map(h => (
                  <th key={h} style={{
                    padding: '11px 14px', textAlign: 'left', fontWeight: 700,
                    color: C.gray500, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.5px',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((p, i) => (
                <tr
                  key={p.id}
                  className={`pedido-row${updatedRow === p.id ? ' pedido-row-updated' : ''}`}
                  style={{ borderBottom: i < visible.length - 1 ? `1px solid ${C.gray100}` : 'none' }}
                >
                  <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: 12, color: C.brand, fontWeight: 700 }}>
                    #{p.id}
                  </td>
                  <td style={{ padding: '12px 14px', fontWeight: 600, color: C.gray800 }}>
                    {p.cliente}
                  </td>
                  <td style={{ padding: '12px 14px', color: C.gray500, fontSize: 13 }}>
                    {p.telefono_cliente || '—'}
                  </td>
                  <td style={{ padding: '12px 14px', color: C.gray500, fontSize: 13, maxWidth: 180 }}>
                    <span title={p.direccion_entrega} style={{
                      display: 'block', overflow: 'hidden',
                      textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {p.direccion_entrega || '—'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', fontWeight: 700, color: C.gray800 }}>
                    ${parseFloat(p.total || 0).toLocaleString('es-CL')}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <EstadoBadge estado={p.estado} />
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: C.gray500 }}>
                    {p.tienda_nombre ? ` ${p.tienda_nombre}` : '—'}
                  </td>
                  <td style={{ padding: '12px 14px', color: C.gray500, fontSize: 12 }}>
                    {new Date(p.fecha_creacion).toLocaleDateString('es-CL')}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <SelectorEstado pedido={p} onCambiar={handleCambiarEstado} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {visible.length === 0 && (
            <p style={{ textAlign: 'center', padding: 32, color: C.gray400 }}>Sin resultados</p>
          )}
        </div>
      </div>

      {toast && (
        <Toast
          icono={toast.icono}
          color={toast.color}
          mensaje={toast.mensaje}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}