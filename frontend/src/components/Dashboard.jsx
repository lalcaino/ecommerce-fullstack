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

// Estilos de animación
const style = document.createElement('style')
style.textContent = `
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes countUp {
    from { opacity: 0; transform: scale(0.8); }
    to   { opacity: 1; transform: scale(1); }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.6; }
  }
  .metric-card {
    animation: fadeInUp 0.4s ease both;
    transition: box-shadow 0.2s, transform 0.2s;
  }
  .metric-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
  }
  .metric-value {
    animation: countUp 0.5s ease both;
  }
  .dashboard-section {
    animation: fadeInUp 0.5s ease both;
  }
`
if (!document.head.querySelector('#dashboard-styles')) {
  style.id = 'dashboard-styles'
  document.head.appendChild(style)
}

function MetricCard({ title, value, subtitle, color, icon, delay = 0 }) {
  return (
    <div className="metric-card" style={{
      background: C.white, borderRadius: 14, padding: '20px 22px',
      border: `1px solid ${C.gray200}`, borderTop: `4px solid ${color}`,
      display: 'flex', alignItems: 'center', gap: 16,
      animationDelay: `${delay}s`,
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: 14,
        background: color + '18', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        fontSize: 24, flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <p style={{
          margin: 0, fontSize: 11, color: C.gray500,
          fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px',
        }}>
          {title}
        </p>
        <p className="metric-value" style={{
          margin: '4px 0 2px', fontSize: 30, fontWeight: 800,
          color: C.gray800, lineHeight: 1,
        }}>
          {value ?? 0}
        </p>
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
      background: color + '18', color,
      border: `1px solid ${color}30`,
      borderRadius: 20, padding: '4px 14px',
      fontSize: 12, fontWeight: 700,
      animation: state === 'OPEN' ? 'pulse 1.5s infinite' : 'none',
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
            width: '100%', borderRadius: '4px 4px 0 0', minHeight: 3,
            height: `${(v / max) * 100}%`,
            background: `linear-gradient(to top, ${C.brand}, ${C.brandLight})`,
            opacity: 0.5 + (v / max) * 0.5,
            transition: 'height 0.5s ease',
          }} title={`${v}`} />
          <span style={{ fontSize: 9, color: C.gray400 }}>{labels[i]}</span>
        </div>
      ))}
    </div>
  )
}

function LoadingDashboard() {
  return (
    <div style={{ padding: '28px 24px', background: C.bg, minHeight: '100vh' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ height: 28, width: 200, background: C.gray200, borderRadius: 8, marginBottom: 8, animation: 'pulse 1.5s infinite' }} />
          <div style={{ height: 16, width: 140, background: C.gray100, borderRadius: 6, animation: 'pulse 1.5s infinite' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: 16 }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{
              height: 100, background: C.white, borderRadius: 14,
              border: `1px solid ${C.gray200}`, animation: 'pulse 1.5s infinite',
              animationDelay: `${i * 0.1}s`,
            }} />
          ))}
        </div>
      </div>
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
        setError(err.detail || err.message || 'Error al cargar resumen')
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingDashboard />

  const pedidosRecientes = Array.isArray(summary?.pedidos_recientes) ? summary.pedidos_recientes : []
  const circuitBreakers  = summary?.circuit_breakers ?? {}

  return (
    <div style={{ padding: '28px 24px', background: C.bg, minHeight: '100vh' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* Header */}
        <div className="dashboard-section" style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: C.gray800 }}>
            📊 Panel de Control
          </h1>
          <p style={{ margin: '4px 0 0', color: C.gray500, fontSize: 14 }}>
            {new Date().toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {error && (
          <div style={{
            background: C.error + '12', border: `1px solid ${C.error}30`,
            borderRadius: 12, padding: '12px 16px', marginBottom: 20,
            color: C.error, fontSize: 14, fontWeight: 600,
            animation: 'fadeInUp 0.3s ease',
          }}>
            ⚠️ {error} — mostrando datos en caché
          </div>
        )}

        {/* Métricas principales */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))',
          gap: 16, marginBottom: 24,
        }}>
          <MetricCard title="Total Inventario"   value={summary?.total_productos}      subtitle="productos registrados" color={C.info}    icon="📦" delay={0.0} />
          <MetricCard title="Stock Bajo"         value={summary?.productos_bajo_stock} subtitle="requieren reposición" color={C.error}   icon="⚠️" delay={0.1} />
          <MetricCard title="Pedidos Hoy"        value={summary?.pedidos_hoy}          subtitle="nuevos pedidos"       color={C.brand}   icon="🛒" delay={0.2} />
          <MetricCard title="Pedidos Pendientes" value={summary?.pedidos_pendientes}   subtitle="por procesar"         color={C.warning} icon="⏳" delay={0.3} />
          <MetricCard title="Bodegas"            value={summary?.total_bodegas}        subtitle="activas"              color="#8b5cf6"   icon="🏭" delay={0.4} />
          <MetricCard title="Tiendas"            value={summary?.total_tiendas}        subtitle="activas"              color={C.success} icon="🏪" delay={0.5} />
        </div>

        {/* Gráfico + pedidos recientes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 16, marginBottom: 16 }}>

          {/* Mini bar chart */}
          <div className="dashboard-section" style={{
            background: C.white, borderRadius: 14,
            border: `1px solid ${C.gray200}`, padding: '20px 22px',
            animationDelay: '0.3s',
          }}>
            <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: C.gray800 }}>
              📈 Ventas Mensuales
            </h3>
            <p style={{ margin: '0 0 8px', fontSize: 12, color: C.gray500 }}>Resumen anual de actividad</p>
            <MiniBarChart />
          </div>

          {/* Pedidos recientes */}
          <div className="dashboard-section" style={{
            background: C.white, borderRadius: 14,
            border: `1px solid ${C.gray200}`, padding: '20px 22px',
            animationDelay: '0.4s',
          }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: C.gray800 }}>
              🕒 Pedidos Recientes
            </h3>
            {pedidosRecientes.length === 0 ? (
              <p style={{ color: C.gray400, fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
                Sin pedidos recientes
              </p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.gray200}` }}>
                    {['#', 'Cliente', 'Total', 'Estado', 'Fecha'].map(h => (
                      <th key={h} style={{
                        padding: '6px 10px', textAlign: 'left',
                        fontSize: 11, fontWeight: 700, color: C.gray500,
                        textTransform: 'uppercase', letterSpacing: '.4px',
                      }}>
                        {h}
                      </th>
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
                      <tr key={p.id ?? idx} style={{
                        borderBottom: `1px solid ${C.gray100}`,
                        transition: 'background 0.15s',
                      }}
                        onMouseEnter={e => e.currentTarget.style.background = C.gray100}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '8px 10px', color: C.gray500, fontFamily: 'monospace', fontSize: 12 }}>
                          {p.id ?? '-'}
                        </td>
                        <td style={{ padding: '8px 10px', fontWeight: 600, color: C.gray800 }}>
                          {p.cliente ?? '-'}
                        </td>
                        <td style={{ padding: '8px 10px', fontWeight: 700, color: C.gray800 }}>
                          ${isNaN(total) ? '0' : total.toLocaleString('es-CL')}
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <span style={{
                            background: color + '18', color,
                            border: `1px solid ${color}30`,
                            borderRadius: 20, padding: '2px 8px',
                            fontSize: 11, fontWeight: 700,
                          }}>
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
          <div className="dashboard-section" style={{
            background: C.white, borderRadius: 14,
            border: `1px solid ${C.gray200}`, padding: '16px 22px',
            animationDelay: '0.5s',
          }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: C.gray800 }}>
              🔌 Estado Circuit Breakers
            </h3>
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