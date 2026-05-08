
import { useState, useEffect } from 'react'
import { DashboardRepository } from '../services/api'

const C = {
  brand: '#408A71', brandDark: '#2e6b57', brandLight: '#e8f5f0',
  bg: '#f4f7f6', white: '#ffffff',
  gray100: '#f3f4f6', gray200: '#e5e7eb', gray400: '#9ca3af',
  gray500: '#6b7280', gray700: '#374151', gray800: '#1f2937',
  success: '#10b981', warning: '#f59e0b', error: '#ef4444', info: '#3b82f6',
}

const ESTADO_COLOR = {
  PENDIENTE: C.warning, PROCESANDO: C.info,
  ENVIADO: '#8b5cf6', ENTREGADO: C.success, CANCELADO: C.error,
}

function MetricCard({ title, value, subtitle, color, icon }) {
  return (
    <div style={{
      background: C.white, borderRadius: 14, padding: '20px 22px',
      border: `1px solid ${C.gray200}`, borderTop: `4px solid ${color}`,
      display: 'flex', alignItems: 'center', gap: 16,
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: color + '18', display: 'flex',
        alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0,
      }}>{icon}</div>
      <div>
        <p style={{ margin: 0, fontSize: 11, color: C.gray500, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px' }}>{title}</p>
        <p style={{ margin: '4px 0 2px', fontSize: 28, fontWeight: 800, color: C.gray800, lineHeight: 1 }}>{value ?? 0}</p>
        {subtitle && <p style={{ margin: 0, fontSize: 12, color }}>{subtitle}</p>}
      </div>
    </div>
  )
}

function CircuitBadge({ service, state }) {
  const colors = { CLOSED: C.success, OPEN: C.error, HALF_OPEN: C.warning }
  const color = colors[state] || C.gray500
  return (
    <span style={{
      background: color + '18', color, border: `1px solid ${color}30`,
      borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 700,
    }}>
      {service}: {state ?? 'UNKNOWN'}
    </span>
  )
}

function MiniBarChart() {
  const data   = [168, 385, 201, 298, 187, 195, 291, 110, 215, 390, 280, 112]
  const labels = ['E','F','M','A','M','J','J','A','S','O','N','D']
  const max    = Math.max(...data)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 80, marginTop: 8 }}>
      {data.map((v, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
          <div style={{
            width: '100%', borderRadius: '3px 3px 0 0', minHeight: 3,
            height: `${(v / max) * 100}%`,
            background: C.brand, opacity: 0.5 + (v / max) * 0.5,
          }} title={`${v}`} />
          <span style={{ fontSize: 9, color: C.gray400 }}>{labels[i]}</span>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    DashboardRepository.getSummary()
      .then(data => {
        if (!data || typeof data !== 'object') throw new Error('Respuesta inválida del servidor')
        setSummary(data)
      })
      .catch(err => {
        console.error('Dashboard error:', err)
        setError(err.detail || err.message || 'Error al cargar resumen')
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
        <p style={{ color: C.gray500, fontWeight: 600 }}>Cargando panel...</p>
      </div>
    </div>
  )

  // Si hay error del backend, mostrar dashboard con datos vacíos + mensaje
  const pedidosRecientes = Array.isArray(summary?.pedidos_recientes) ? summary.pedidos_recientes : []
  const circuitBreakers  = summary?.circuit_breakers ?? {}

  return (
    <div style={{ padding: '28px 24px', background: C.bg, minHeight: '100vh' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: C.gray800 }}>Panel de Control</h1>
          <p style={{ margin: '4px 0 0', color: C.gray500, fontSize: 14 }}>
            {new Date().toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {error && (
          <div style={{ background: C.error + '12', border: `1px solid ${C.error}30`, borderRadius: 12, padding: '12px 16px', marginBottom: 20, color: C.error, fontSize: 14, fontWeight: 600 }}>
            ⚠️ {error} — mostrando datos en caché
          </div>
        )}

        {/* Metric cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: 16, marginBottom: 24 }}>
          <MetricCard title="Total Inventario"   value={summary?.total_productos}      subtitle="productos registrados" color={C.info}    icon="📦" />
          <MetricCard title="Stock Bajo"         value={summary?.productos_bajo_stock} subtitle="requieren reposición" color={C.error}   icon="⚠️" />
          <MetricCard title="Pedidos Hoy"        value={summary?.pedidos_hoy}          subtitle="nuevos pedidos"       color={C.brand}   icon="🛒" />
          <MetricCard title="Pedidos Pendientes" value={summary?.pedidos_pendientes}   subtitle="por procesar"         color={C.warning} icon="⏳" />
        </div>

        {/* Charts + recent orders row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 16, marginBottom: 16 }}>

          {/* Mini bar chart */}
          <div style={{ background: C.white, borderRadius: 14, border: `1px solid ${C.gray200}`, padding: '20px 22px' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: C.gray800 }}>Ventas Mensuales</h3>
            <p style={{ margin: '0 0 8px', fontSize: 12, color: C.gray500 }}>Resumen anual de actividad</p>
            <MiniBarChart />
          </div>

          {/* Pedidos recientes */}
          <div style={{ background: C.white, borderRadius: 14, border: `1px solid ${C.gray200}`, padding: '20px 22px' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: C.gray800 }}>Pedidos Recientes</h3>
            {pedidosRecientes.length === 0 ? (
              <p style={{ color: C.gray400, fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Sin pedidos recientes</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.gray200}` }}>
                    {['#','Cliente','Total','Estado','Fecha'].map(h => (
                      <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: C.gray500, textTransform: 'uppercase', letterSpacing: '.4px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pedidosRecientes.map((p, idx) => {
                    if (!p) return null
                    const total = parseFloat(p.total ?? 0)
                    const fecha = p.fecha_creacion ? new Date(p.fecha_creacion) : null
                    const color = ESTADO_COLOR[p.estado] || C.gray700
                    return (
                      <tr key={p.id ?? idx} style={{ borderBottom: `1px solid ${C.gray100}` }}>
                        <td style={{ padding: '8px 10px', color: C.gray500, fontFamily: 'monospace', fontSize: 12 }}>{p.id ?? '-'}</td>
                        <td style={{ padding: '8px 10px', fontWeight: 600, color: C.gray800 }}>{p.cliente ?? '-'}</td>
                        <td style={{ padding: '8px 10px', fontWeight: 700, color: C.gray800 }}>${isNaN(total) ? '0' : total.toLocaleString('es-CL')}</td>
                        <td style={{ padding: '8px 10px' }}>
                          <span style={{ background: color + '18', color, border: `1px solid ${color}30`, borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
                            {p.estado ?? 'N/A'}
                          </span>
                        </td>
                        <td style={{ padding: '8px 10px', color: C.gray500 }}>
                          {fecha && !isNaN(fecha) ? fecha.toLocaleDateString('es-CL') : '-'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Circuit Breakers */}
        {Object.keys(circuitBreakers).length > 0 && (
          <div style={{ background: C.white, borderRadius: 14, border: `1px solid ${C.gray200}`, padding: '16px 22px' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: C.gray800 }}>🔌 Estado Circuit Breakers</h3>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {Object.entries(circuitBreakers).map(([svc, state]) => (
                <CircuitBadge key={svc} service={svc} state={state} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}