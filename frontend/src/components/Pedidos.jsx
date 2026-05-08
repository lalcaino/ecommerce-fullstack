/**
 * Pedidos.jsx - Gestión de pedidos (rediseñado)
 * Mantiene usePedidos hook y lógica original.
 */
import { useState } from 'react'
import { usePedidos } from '../hooks/usePedidos'

const C = {
  brand: '#408A71', brandLight: '#e8f5f0',
  white: '#ffffff', bg: '#f4f7f6',
  gray100: '#f3f4f6', gray200: '#e5e7eb', gray400: '#9ca3af',
  gray500: '#6b7280', gray700: '#374151', gray800: '#1f2937',
  success: '#10b981', warning: '#f59e0b', error: '#ef4444', info: '#3b82f6',
}

const ESTADOS = ['PENDIENTE', 'PROCESANDO', 'ENVIADO', 'ENTREGADO', 'CANCELADO']
const ESTADO_COLOR = {
  PENDIENTE: C.warning, PROCESANDO: C.info,
  ENVIADO: '#8b5cf6', ENTREGADO: C.success, CANCELADO: C.error,
}
const ESTADO_ICON = {
  PENDIENTE: '⏳', PROCESANDO: '⚙️', ENVIADO: '🚚', ENTREGADO: '✅', CANCELADO: '❌',
}

function Badge({ color, children }) {
  return (
    <span style={{
      background: color + '18', color, border: `1px solid ${color}30`,
      borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700,
    }}>{children}</span>
  )
}

function Btn({ onClick, children, variant = 'primary', small = false, active = false }) {
  const styles = {
    primary:   { background: C.brand,           color: '#fff',     border: 'none' },
    secondary: { background: C.gray100,          color: C.gray700,  border: `1px solid ${C.gray200}` },
    danger:    { background: C.error + '18',     color: C.error,    border: `1px solid ${C.error}30` },
    success:   { background: C.success + '18',   color: C.success,  border: `1px solid ${C.success}30` },
    filter:    { background: active ? C.brand : C.white, color: active ? '#fff' : C.gray700, border: `1.5px solid ${active ? C.brand : C.gray200}` },
  }
  return (
    <button onClick={onClick} style={{
      ...styles[variant], borderRadius: 8, cursor: 'pointer',
      fontFamily: 'inherit', fontWeight: 600,
      padding: small ? '5px 12px' : '9px 18px',
      fontSize: small ? 12 : 14,
    }}>{children}</button>
  )
}

function NuevoPedidoForm({ onSubmit, onCancel }) {
  const [form, setForm] = useState({ cliente: '', email_cliente: '', items: '[]' })
  const change = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }))

  return (
    <div style={{ background: C.white, borderRadius: 14, border: `1px solid ${C.gray200}`, padding: 24, marginBottom: 20 }}>
      <h3 style={{ margin: '0 0 18px', fontSize: 16, fontWeight: 700, color: C.gray800 }}>Nuevo Pedido</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {[['cliente','Cliente'],['email_cliente','Email cliente']].map(([k, label]) => (
          <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.gray500, textTransform: 'uppercase', letterSpacing: '.5px' }}>{label}</label>
            <input name={k} value={form[k]} onChange={change}
              style={{ border: `1.5px solid ${C.gray200}`, borderRadius: 8, padding: '8px 12px', fontSize: 14, fontFamily: 'inherit', outline: 'none' }}
            />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
        <Btn variant="success" onClick={() => onSubmit(form)}>✓ Crear Pedido</Btn>
        <Btn variant="secondary" onClick={onCancel}>Cancelar</Btn>
      </div>
    </div>
  )
}

export default function Pedidos() {
  const { pedidos, loading, error, createPedido, cambiarEstado } = usePedidos()
  const [showForm,     setShowForm]     = useState(false)
  const [filtroEstado, setFiltro]       = useState('TODOS')
  const [search,       setSearch]       = useState('')

  const visible = pedidos
    .filter(p => filtroEstado === 'TODOS' || p.estado === filtroEstado)
    .filter(p => p.cliente?.toLowerCase().includes(search.toLowerCase()))

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
      <p style={{ color: C.gray500, fontWeight: 600 }}>⏳ Cargando pedidos...</p>
    </div>
  )

  return (
    <div style={{ padding: '28px 24px', background: C.bg, minHeight: '100vh' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: C.gray800 }}>Gestión de Pedidos</h1>
            <p style={{ margin: '4px 0 0', color: C.gray500, fontSize: 14 }}>{pedidos.length} pedidos en total</p>
          </div>
          <Btn onClick={() => setShowForm(v => !v)}>
            {showForm ? '✕ Cerrar' : '＋ Nuevo Pedido'}
          </Btn>
        </div>

        {error && (
          <div style={{ background: C.error + '12', border: `1px solid ${C.error}30`, borderRadius: 12, padding: '12px 16px', marginBottom: 20, color: C.error, fontSize: 14, fontWeight: 600 }}>⚠️ {error}</div>
        )}

        {showForm && (
          <NuevoPedidoForm
            onSubmit={async (data) => { const res = await createPedido(data); if (res.ok) setShowForm(false) }}
            onCancel={() => setShowForm(false)}
          />
        )}

        {/* Toolbar */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            placeholder="🔍 Buscar cliente..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ border: `1.5px solid ${C.gray200}`, borderRadius: 8, padding: '9px 14px', fontSize: 14, fontFamily: 'inherit', outline: 'none', width: 220 }}
          />
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['TODOS', ...ESTADOS].map(e => (
              <button key={e} onClick={() => setFiltro(e)} style={{
                padding: '6px 14px', borderRadius: 20, cursor: 'pointer', fontSize: 12, fontWeight: 700,
                border: `1.5px solid ${ESTADO_COLOR[e] || C.brand}`,
                background: filtroEstado === e ? (ESTADO_COLOR[e] || C.brand) : C.white,
                color: filtroEstado === e ? '#fff' : (ESTADO_COLOR[e] || C.gray700),
                fontFamily: 'inherit',
              }}>
                {ESTADO_ICON[e] || '📋'} {e}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div style={{ background: C.white, borderRadius: 14, border: `1px solid ${C.gray200}`, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: C.gray100, borderBottom: `1px solid ${C.gray200}` }}>
                {['ID','Cliente','Total','Estado','Fecha','Cambiar Estado'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: C.gray500, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.5px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((p, i) => {
                const color = ESTADO_COLOR[p.estado] || C.gray500
                return (
                  <tr key={p.id} style={{ borderBottom: i < visible.length - 1 ? `1px solid ${C.gray100}` : 'none' }}>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 12, color: C.brand, fontWeight: 700 }}>{p.id}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: C.gray800 }}>{p.cliente}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: C.gray800 }}>${parseFloat(p.total || 0).toLocaleString('es-CL')}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <Badge color={color}>{ESTADO_ICON[p.estado]} {p.estado}</Badge>
                    </td>
                    <td style={{ padding: '12px 16px', color: C.gray500 }}>
                      {new Date(p.fecha_creacion).toLocaleDateString('es-CL')}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <select
                        value={p.estado}
                        onChange={e => cambiarEstado(p.id, e.target.value)}
                        style={{
                          border: `1.5px solid ${color}40`, borderRadius: 8,
                          padding: '5px 10px', fontSize: 12, fontWeight: 600,
                          color, background: color + '10',
                          outline: 'none', cursor: 'pointer', fontFamily: 'inherit',
                        }}
                      >
                        {ESTADOS.map(e => <option key={e}>{e}</option>)}
                      </select>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {visible.length === 0 && (
            <p style={{ textAlign: 'center', padding: 32, color: C.gray400 }}>Sin resultados</p>
          )}
        </div>
      </div>
    </div>
  )
}
