/**
 * Dashboard.jsx - Vista principal del sistema SmartLogix (ROBUSTO)
 */
import { useState, useEffect } from 'react'
import { DashboardRepository } from '../services/api'
import './Dashboard.css'

const ESTADO_COLOR = {
  PENDIENTE:  '#f59e0b',
  PROCESANDO: '#3b82f6',
  ENVIADO:    '#8b5cf6',
  ENTREGADO:  '#10b981',
  CANCELADO:  '#ef4444',
}

function StatCard({ title, value, subtitle, color }) {
  return (
    <div className="stat-card" style={{ borderTop: `4px solid ${color}` }}>
      <p className="stat-title">{title}</p>
      <p className="stat-value">{value ?? 0}</p>
      {subtitle && <p className="stat-sub">{subtitle}</p>}
    </div>
  )
}

function CircuitBadge({ service, state }) {
  const colors = { CLOSED: '#10b981', OPEN: '#ef4444', HALF_OPEN: '#f59e0b' }
  return (
    <span style={{
      background: colors[state] || '#6b7280',
      color: '#fff',
      borderRadius: '999px',
      padding: '2px 10px',
      fontSize: '0.75rem',
      fontWeight: 600
    }}>
      {service}: {state ?? 'UNKNOWN'}
    </span>
  )
}

export default function Dashboard() {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    DashboardRepository.getSummary()
      .then(data => {
        if (!data || typeof data !== 'object') {
          throw new Error('Respuesta inválida del servidor')
        }
        setSummary(data)
      })
      .catch(err => {
        console.error('Dashboard error:', err)
        setError(err.detail || err.message || 'Error al cargar resumen')
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading">Cargando panel...</div>
  if (error)   return <div className="error-box">{error}</div>
  if (!summary || typeof summary !== 'object') {
    return <div className="error-box">Datos inválidos del servidor</div>
  }

  const pedidosRecientes = Array.isArray(summary.pedidos_recientes)
    ? summary.pedidos_recientes
    : []

  const circuitBreakers = summary.circuit_breakers ?? {}

  return (
    <div className="dashboard">
      <h1 className="dashboard-title">SmartLogix — Panel de Control</h1>

      <section className="stats-grid">
        <StatCard title="Total Inventario"   value={summary.total_productos}        subtitle="productos registrados" color="#3b82f6" />
        <StatCard title="Stock Bajo"         value={summary.productos_bajo_stock}   subtitle="requieren reposición" color="#ef4444" />
        <StatCard title="Pedidos Hoy"        value={summary.pedidos_hoy}            subtitle="nuevos pedidos"       color="#8b5cf6" />
        <StatCard title="Pedidos Pendientes" value={summary.pedidos_pendientes}     subtitle="por procesar"        color="#f59e0b" />
      </section>

      <section className="section">
        <h2>Pedidos Recientes</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th><th>Cliente</th><th>Total</th><th>Estado</th><th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {pedidosRecientes.map((p, idx) => {
              if (!p) return null

              const total = parseFloat(p.total ?? 0)
              const fecha = p.fecha_creacion
                ? new Date(p.fecha_creacion)
                : null

              return (
                <tr key={p.id ?? idx}>
                  <td>{p.id ?? '-'}</td>
                  <td>{p.cliente ?? '-'}</td>

                  <td>
                    ${isNaN(total)
                      ? '0'
                      : total.toLocaleString('es-CL')}
                  </td>

                  <td>
                    <span style={{
                      color: ESTADO_COLOR[p.estado] || '#374151',
                      fontWeight: 700,
                      fontSize: '0.85rem'
                    }}>
                      {p.estado ?? 'N/A'}
                    </span>
                  </td>

                  <td>
                    {fecha && !isNaN(fecha)
                      ? fecha.toLocaleDateString('es-CL')
                      : '-'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>

      <section className="section">
        <h2>Estado Circuit Breakers</h2>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {Object.entries(circuitBreakers).map(([svc, state]) => (
            <CircuitBadge key={svc} service={svc} state={state} />
          ))}
        </div>
      </section>
    </div>
  )
}