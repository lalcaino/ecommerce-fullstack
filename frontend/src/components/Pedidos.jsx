/**
 * Pedidos.jsx - Vista de pedidos con cambio de estado
 */
import { useState } from 'react'
import { usePedidos } from '../hooks/usePedidos'

const ESTADOS = ['PENDIENTE', 'PROCESANDO', 'ENVIADO', 'ENTREGADO', 'CANCELADO']
const ESTADO_COLOR = {
  PENDIENTE: '#f59e0b', PROCESANDO: '#3b82f6',
  ENVIADO: '#8b5cf6', ENTREGADO: '#10b981', CANCELADO: '#ef4444',
}

function NuevoPedidoForm({ onSubmit, onCancel }) {
  const [form, setForm] = useState({ cliente: '', email_cliente: '', items: '[]' })
  const change = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }))

  return (
    <div className="form-card">
      <h3>Nuevo Pedido</h3>
      {['cliente','email_cliente'].map(k => (
        <div className="form-row" key={k}>
          <label>{k}:</label>
          <input name={k} value={form[k]} onChange={change} />
        </div>
      ))}
      <div style={{ marginTop: '0.75rem' }}>
        <button onClick={() => onSubmit(form)} className="btn btn-success">Crear</button>
        <button onClick={onCancel} className="btn" style={{ marginLeft: '0.5rem' }}>Cancelar</button>
      </div>
    </div>
  )
}

export default function Pedidos() {
  const { pedidos, loading, error, createPedido, cambiarEstado } = usePedidos()
  const [showForm,    setShowForm]    = useState(false)
  const [filtroEstado, setFiltro]     = useState('TODOS')

  const visible = filtroEstado === 'TODOS'
    ? pedidos
    : pedidos.filter(p => p.estado === filtroEstado)

  if (loading) return <div className="loading">Cargando pedidos...</div>

  return (
    <div className="page">
      <div className="page-header">
        <h1>Gestión de Pedidos</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(v => !v)}>
          {showForm ? 'Cerrar' : '+ Nuevo Pedido'}
        </button>
      </div>

      {error && <div className="error-box">{error}</div>}

      {showForm && (
        <NuevoPedidoForm
          onSubmit={async (data) => {
            const res = await createPedido(data)
            if (res.ok) setShowForm(false)
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      <div style={{ marginBottom: '1rem' }}>
        {['TODOS', ...ESTADOS].map(e => (
          <button key={e}
            onClick={() => setFiltro(e)}
            style={{
              marginRight: '0.4rem', padding: '4px 12px', borderRadius: '999px',
              border: '1.5px solid', cursor: 'pointer',
              background: filtroEstado === e ? (ESTADO_COLOR[e] || '#3b82f6') : '#fff',
              color:      filtroEstado === e ? '#fff' : '#374151',
              borderColor: ESTADO_COLOR[e] || '#3b82f6',
            }}>
            {e}
          </button>
        ))}
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>ID</th><th>Cliente</th><th>Total</th><th>Estado</th><th>Fecha</th><th>Cambiar Estado</th>
          </tr>
        </thead>
        <tbody>
          {visible.map(p => (
            <tr key={p.id}>
              <td>{p.id}</td>
              <td>{p.cliente}</td>
              <td>${parseFloat(p.total || 0).toLocaleString('es-CL')}</td>
              <td>
                <span style={{ color: ESTADO_COLOR[p.estado], fontWeight: 700 }}>
                  {p.estado}
                </span>
              </td>
              <td>{new Date(p.fecha_creacion).toLocaleDateString('es-CL')}</td>
              <td>
                <select
                  value={p.estado}
                  onChange={e => cambiarEstado(p.id, e.target.value)}
                  style={{ fontSize: '0.85rem', padding: '2px 4px' }}
                >
                  {ESTADOS.map(e => <option key={e}>{e}</option>)}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
