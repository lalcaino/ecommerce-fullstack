import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getToken, getUsuario, logout } from '../services/authService'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || ''

const C = {
  brand: '#408A71', brandDark: '#2e6b57', brandLight: '#e8f5f0',
  white: '#ffffff', bg: '#f4f7f6',
  gray100: '#f3f4f6', gray200: '#e5e7eb', gray400: '#9ca3af',
  gray500: '#6b7280', gray700: '#374151', gray800: '#1f2937',
  success: '#10b981', warning: '#f59e0b', error: '#ef4444', info: '#3b82f6',
}

const ESTADO_META = {
  PENDIENTE:  { color: C.warning, icon: '⏳', label: 'Disponible' },
  EN_RUTA:    { color: C.info,    icon: '🚚', label: 'En ruta' },
  COMPLETADO: { color: C.success, icon: '✅', label: 'Completado' },
  FALLIDO:    { color: C.error,   icon: '❌', label: 'Fallido' },
  CANCELADO:  { color: C.gray400, icon: '🚫', label: 'Cancelado' },
}

async function apiBFF(path, options = {}) {
  const token = getToken()
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...options.headers },
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.detail || 'Error en la solicitud')
  }
  if (res.status === 204) return null
  return res.json()
}

function formatDist(km) {
  if (!km) return ''
  const d = parseFloat(km)
  return d < 1 ? `${Math.round(d * 1000)} m` : `${d.toFixed(1)} km`
}

export default function VistaRepartidor() {
  const navigate = useNavigate()
  const usuario = getUsuario()

  const [ubicacion, setUbicacion] = useState(null)
  const [ubicacionError, setUbicacionError] = useState(null)
  const [envios, setEnvios] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [vista, setVista] = useState('lista')
  const [seleccionado, setSeleccionado] = useState(null)
  const [codigoInput, setCodigoInput] = useState('')
  const [codigoError, setCodigoError] = useState('')
  const [confirmando, setConfirmando] = useState(false)
  const [foto, setFoto] = useState(null)
  const [fotoPreview, setFotoPreview] = useState(null)
  const [toast, setToast] = useState(null)
  const [historial, setHistorial] = useState([])
  const [cargandoHistorial, setCargandoHistorial] = useState(false)
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [pedidoInfo, setPedidoInfo] = useState(null)

  const mostrarToast = (msg, color = C.success) => {
    setToast({ msg, color })
    setTimeout(() => setToast(null), 3500)
  }

  // Obtener ubicación GPS
  useEffect(() => {
    if (!navigator.geolocation) {
      setUbicacionError('Geolocalización no soportada')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUbicacion({ lat: pos.coords.latitude, lon: pos.coords.longitude })
      },
      (err) => {
        setUbicacionError('No se pudo obtener ubicación. Usa la app desde tu teléfono.')
        setUbicacion({ lat: -33.4372, lon: -70.6506 })
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  }, [])

  // Cargar envíos cercanos
  const fetchEnviosCercanos = useCallback(async () => {
    if (!ubicacion) return
    setLoading(true)
    setError(null)
    try {
      const data = await apiBFF(`/envios/cercanos/?lat=${ubicacion.lat}&lon=${ubicacion.lon}&radio_km=50`)
      setEnvios(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [ubicacion])

  useEffect(() => { fetchEnviosCercanos() }, [fetchEnviosCercanos])

  // Auto-cargar reparto activo si el repartidor ya tomó uno
  useEffect(() => {
    if (!usuario?.id) return
    apiBFF('/envios/').then(data => {
      const activo = Array.isArray(data) ? data.find(e =>
        e.repartidor_id === usuario.id &&
        e.estado !== 'COMPLETADO' &&
        e.estado !== 'CANCELADO'
      ) : null
      if (activo) {
        setSeleccionado(activo)
        apiBFF(`/pedidos/${activo.pedido_id}/`).then(setPedidoInfo).catch(() => {})
        setVista('mapa')
      }
    }).catch(() => {})
  }, [usuario?.id])

  // Cargar historial del repartidor
  const fetchHistorial = async () => {
    setCargandoHistorial(true)
    try {
      const data = await apiBFF('/envios/')
      const misEnvios = Array.isArray(data)
        ? data.filter(e => e.repartidor_id === usuario?.id)
        : []
      setHistorial(misEnvios.slice(0, 20))
    } catch { }
    finally { setCargandoHistorial(false) }
  }

  // Tomar pedido
  const handleTomar = async (envio) => {
    setConfirmando(true)
    try {
      const data = await apiBFF(`/envios/${envio.id}/tomar/`, {
        method: 'POST',
        body: JSON.stringify({ repartidor_id: usuario?.id }),
      })
      setSeleccionado({ ...envio, ...data.envio })
      apiBFF(`/pedidos/${envio.pedido_id}/`).then(setPedidoInfo).catch(() => {})
      setVista('mapa')
      mostrarToast('Pedido tomado. ¡Dirígete al destino!')
    } catch (err) {
      mostrarToast(err.message, C.error)
    } finally {
      setConfirmando(false)
    }
  }

  // Validar pickup en tienda
  const handleValidarPickup = async () => {
    if (!codigoInput.trim()) { setCodigoError('Ingresa el código'); return }
    setConfirmando(true)
    try {
      const data = await apiBFF(`/envios/${seleccionado.id}/validar-pickup/`, {
        method: 'POST',
        body: JSON.stringify({ codigo_validacion: codigoInput.trim() }),
      })
      setSeleccionado(prev => ({ ...prev, ...data.envio, estado: 'EN_RUTA' }))
      setVista('mapa')
      mostrarToast('Pickup validado. ¡En ruta!')
      setCodigoInput('')
      setCodigoError('')
    } catch (err) {
      setCodigoError(err.message)
    } finally {
      setConfirmando(false)
    }
  }

  // Abrir Waze
  const handleAbrirWaze = () => {
    if (!seleccionado) return
    const lat = parseFloat(seleccionado.destino_lat)
    const lon = parseFloat(seleccionado.destino_lon)
    if (!isNaN(lat) && !isNaN(lon)) {
      window.open(`https://waze.com/ul?ll=${lat},${lon}&navigate=yes`, '_blank')
    } else {
      window.open(`https://waze.com/ul?q=${encodeURIComponent(seleccionado.destino_nombre)}&navigate=yes`, '_blank')
    }
  }

  // Subir foto a Cloudinary via BFF
  const handleFotoChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { mostrarToast('Solo JPG, PNG o WebP', C.error); return }
    if (file.size > 10 * 1024 * 1024) { mostrarToast('Máximo 10MB', C.error); return }
    setFoto(file)
    setFotoPreview(URL.createObjectURL(file))
  }

  const handleCompletar = async () => {
    if (!foto) { mostrarToast('Debes tomar una foto', C.error); return }
    setConfirmando(true)
    try {
      const formData = new FormData()
      formData.append('foto', foto)
      const token = getToken()
      const uploadRes = await fetch(`${BASE_URL}/envios/${seleccionado.id}/foto-entrega/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      const uploadData = await uploadRes.json()
      if (!uploadRes.ok) throw new Error(uploadData.detail || 'Error al subir foto')

      const fotoUrl = uploadData.foto_url || uploadData.url
      const completarRes = await apiBFF(`/envios/${seleccionado.id}/completar/`, {
        method: 'POST',
        body: JSON.stringify({ foto_entrega_url: fotoUrl }),
      })
      setVista('completado')
      mostrarToast('Entrega completada exitosamente')
      setFoto(null)
      setFotoPreview(null)
      fetchEnviosCercanos()
    } catch (err) {
      mostrarToast(err.message, C.error)
    } finally {
      setConfirmando(false)
    }
  }

  const volverALista = () => {
    setSeleccionado(null)
    setPedidoInfo(null)
    setVista('lista')
    setCodigoInput('')
    setCodigoError('')
    setFoto(null)
    setFotoPreview(null)
  }

  // ─── Pantalla: Código de validación ────────────────────────────
  if (vista === 'codigo' && seleccionado) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button onClick={volverALista} style={styles.backBtn}>←</button>
          <span style={styles.headerTitle}>Código de recogida</span>
          <div style={{ width: 40 }} />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
          <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: C.gray800, textAlign: 'center' }}>
            Entrega este código en {seleccionado.origen_nombre || 'la tienda/bodega'}
          </h2>
          <p style={{ margin: '0 0 24px', color: C.gray500, fontSize: 14, textAlign: 'center' }}>
            El encargado ingresará el código para liberar el pedido
          </p>
          <div style={{
            background: C.brandLight, borderRadius: 16, padding: '20px 40px',
            marginBottom: 24, border: `2px dashed ${C.brand}`,
          }}>
            <span style={{ fontSize: 40, fontWeight: 900, letterSpacing: 12, color: C.brand, fontFamily: 'monospace' }}>
              {seleccionado.codigo_validacion || '------'}
            </span>
          </div>
          {seleccionado.estado === 'EN_RUTA' && (
            <button onClick={() => setVista('mapa')} style={{ ...styles.btnPrimary, width: '100%' }}>
              🚚 Ya lo tengo — Ir a destino
            </button>
          )}
        </div>
      </div>
    )
  }

  // ─── Pantalla: Mapa / Entrega ──────────────────────────────────
  if (vista === 'mapa' && seleccionado) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button onClick={volverALista} style={styles.backBtn}>←</button>
          <span style={styles.headerTitle}>Envío #{seleccionado.id}</span>
          <div style={{ width: 40 }} />
        </div>
        <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
          <div style={styles.card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <span style={{ fontSize: 24 }}>📍</span>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: C.gray800 }}>{seleccionado.destino_nombre}</p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: C.gray500 }}>Pedido #{seleccionado.pedido_id}</p>
              </div>
              <span style={{ background: C.info + '18', color: C.info, borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 700 }}>
                🚚 En ruta
              </span>
            </div>

            {seleccionado.origen_nombre && (
              <div style={{ background: C.gray100, borderRadius: 10, padding: 12, marginBottom: 12 }}>
                <p style={{ margin: 0, fontSize: 12, color: C.gray500 }}>Origen</p>
                <p style={{ margin: '2px 0 0', fontWeight: 600, fontSize: 14, color: C.gray800 }}>🏪 {seleccionado.origen_nombre}</p>
              </div>
            )}

            {pedidoInfo && (
              <div style={{ background: '#f0f4ff', borderRadius: 10, padding: 12, marginBottom: 12, border: '1px solid #d0ddf0' }}>
                <p style={{ margin: '0 0 6px', fontSize: 12, color: C.gray500 }}>Cliente</p>
                <p style={{ margin: '0 0 2px', fontWeight: 600, fontSize: 14, color: C.gray800 }}>👤 {pedidoInfo.cliente}</p>
                {pedidoInfo.telefono_cliente && (
                  <p style={{ margin: '0 0 2px', fontSize: 13, color: C.gray700 }}>
                    📞 <a href={`tel:${pedidoInfo.telefono_cliente}`} style={{ color: C.info, textDecoration: 'none' }}>{pedidoInfo.telefono_cliente}</a>
                  </p>
                )}
                {pedidoInfo.email_cliente && (
                  <p style={{ margin: 0, fontSize: 13, color: C.gray700 }}>
                    ✉️ <a href={`mailto:${pedidoInfo.email_cliente}`} style={{ color: C.info, textDecoration: 'none' }}>{pedidoInfo.email_cliente}</a>
                  </p>
                )}
              </div>
            )}

            {seleccionado.distancia_km && (
              <div style={{ background: C.brandLight, borderRadius: 10, padding: 12, marginBottom: 12, display: 'flex', gap: 16 }}>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.brand }}>{formatDist(seleccionado.distancia_km)}</p>
                  <p style={{ margin: 0, fontSize: 11, color: C.gray500 }}>Distancia</p>
                </div>
                {seleccionado.duracion_min && (
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.brand }}>~{seleccionado.duracion_min} min</p>
                    <p style={{ margin: 0, fontSize: 11, color: C.gray500 }}>Tiempo</p>
                  </div>
                )}
              </div>
            )}

            <button onClick={handleAbrirWaze} style={{
              width: '100%', border: 'none', borderRadius: 12, padding: '16px 0', marginBottom: 12,
              background: 'linear-gradient(135deg, #33CCFF 0%, #1A8CFF 100%)',
              color: '#fff', fontSize: 17, fontWeight: 800, cursor: 'pointer',
              fontFamily: 'inherit', boxShadow: '0 4px 16px rgba(51,204,255,0.35)',
              letterSpacing: '.3px',
            }}>
              🛣️ Navegar con Waze
            </button>

            <p style={{ margin: '16px 0 8px', fontWeight: 700, fontSize: 14, color: C.gray800 }}>
              📸 Confirmar entrega
            </p>
            <div onClick={() => document.getElementById('foto-input')?.click()} style={{
              border: `2px dashed ${fotoPreview ? C.success : C.gray200}`,
              borderRadius: 14, padding: 20, textAlign: 'center', cursor: 'pointer',
              background: fotoPreview ? C.brandLight : C.gray100, marginBottom: 12,
            }}>
              {fotoPreview ? (
                <img src={fotoPreview} alt="preview" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 10 }} />
              ) : (
                <>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>📷</div>
                  <p style={{ margin: 0, fontWeight: 700, color: C.gray700 }}>Toca para tomar foto</p>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: C.gray400 }}>de la entrega</p>
                </>
              )}
            </div>
            <input id="foto-input" type="file" accept="image/*" capture="environment" onChange={handleFotoChange} style={{ display: 'none' }} />

            <button onClick={handleCompletar} disabled={!foto || confirmando} style={{
              ...styles.btnPrimary, width: '100%',
              background: foto && !confirmando ? C.success : C.gray200,
              color: foto && !confirmando ? '#fff' : C.gray400,
            }}>
              {confirmando ? 'Completando...' : '✅ Completar entrega'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── Pantalla: Completado ──────────────────────────────────────
  if (vista === 'completado') {
    return (
      <div style={styles.container}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ fontSize: 80, marginBottom: 20 }}>🎉</div>
          <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 800, color: C.success, textAlign: 'center' }}>
            ¡Entrega completada!
          </h2>
          <p style={{ margin: '0 0 32px', color: C.gray500, textAlign: 'center', fontSize: 14 }}>
            Envío #{seleccionado?.id} entregado exitosamente
          </p>
          <button onClick={() => { volverALista(); fetchEnviosCercanos() }} style={{ ...styles.btnPrimary, width: '100%' }}>
            🏠 Volver al inicio
          </button>
        </div>
      </div>
    )
  }

  // ─── Pantalla: Historial ────────────────────────────────────────
  if (vista === 'historial') {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button onClick={() => setVista('lista')} style={styles.backBtn}>←</button>
          <span style={styles.headerTitle}>Historial de entregas</span>
          <div style={{ width: 40 }} />
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
          {cargandoHistorial ? (
            <div style={{ textAlign: 'center', padding: 40, color: C.gray400 }}>Cargando historial...</div>
          ) : historial.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
              <p style={{ fontWeight: 700, fontSize: 16, color: C.gray800, margin: '0 0 4px' }}>Sin entregas aún</p>
              <p style={{ fontSize: 13, color: C.gray500, margin: 0 }}>Las entregas completadas aparecerán aquí</p>
            </div>
          ) : (
            historial.map(envio => {
              const estado = ESTADO_META[envio.estado] || { color: C.gray400, icon: '❓', label: envio.estado }
              return (
                <div key={envio.id} style={{
                  background: C.white, borderRadius: 14, border: `1px solid ${C.gray200}`,
                  borderLeft: `4px solid ${estado.color}`, padding: '14px 16px', marginBottom: 10,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: C.gray800 }}>
                      Envío #{envio.id}
                    </p>
                    <span style={{ background: estado.color + '18', color: estado.color, borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
                      {estado.icon} {estado.label}
                    </span>
                  </div>
                  {envio.destino_nombre && (
                    <p style={{ margin: '0 0 4px', fontSize: 13, color: C.gray600 }}>📍 {envio.destino_nombre}</p>
                  )}
                  {envio.pedido_id && (
                    <p style={{ margin: 0, fontSize: 12, color: C.gray400 }}>Pedido #{envio.pedido_id}</p>
                  )}
                  {envio.fecha_actualizacion && (
                    <p style={{ margin: '4px 0 0', fontSize: 11, color: C.gray400 }}>
                      {new Date(envio.fecha_actualizacion).toLocaleString('es-CL')}
                    </p>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    )
  }

  // ─── Pantalla: Lista principal ──────────────────────────────────
  return (
    <div style={styles.container}>
      {menuAbierto && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999, background: C.white,
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ ...styles.header, background: C.brand }}>
            <button onClick={() => setMenuAbierto(false)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#fff', padding: 0 }}>✕</button>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>Menú</span>
            <div style={{ width: 24 }} />
          </div>
          <div style={{ padding: 24 }}>
            <div style={{ marginBottom: 24, textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: C.brandLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 12px' }}>👤</div>
              <p style={{ margin: 0, fontWeight: 800, fontSize: 18, color: C.gray800 }}>{usuario?.nombre || 'Repartidor'}</p>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: C.gray500 }}>{usuario?.email || ''}</p>
            </div>

            <button onClick={() => { setMenuAbierto(false); fetchHistorial(); setVista('historial') }} style={styles.menuBtn}>
              📋 Historial de entregas
            </button>
            <button onClick={() => { logout(); navigate('/login') }} style={{ ...styles.menuBtn, color: C.error }}>
              🚪 Cerrar sesión
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={styles.header}>
        <button onClick={() => setMenuAbierto(true)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#fff', padding: 0 }}>☰</button>
        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: 0, fontWeight: 800, fontSize: 16, color: '#fff' }}>Pedidos disponibles</p>
          {ubicacion && (
            <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>
              {envios.length} en tu zona
            </p>
          )}
        </div>
        <div style={{ width: 24 }} />
      </div>

      {/* Contenido */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
        {ubicacionError && (
          <div style={{ background: C.warning + '18', borderRadius: 12, padding: '12px 16px', marginBottom: 12, fontSize: 13, color: C.warning, fontWeight: 600 }}>
            📍 {ubicacionError}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: C.gray400 }}>Cargando pedidos cercanos...</div>
        ) : error ? (
          <div style={{ background: C.error + '12', borderRadius: 12, padding: 16, color: C.error, fontSize: 14, fontWeight: 600 }}>
            ⚠️ {error}
          </div>
        ) : envios.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
            <p style={{ fontWeight: 700, fontSize: 16, color: C.gray800, margin: '0 0 4px' }}>Sin pedidos disponibles</p>
            <p style={{ fontSize: 13, color: C.gray500, margin: 0 }}>Nuevos pedidos aparecerán aquí automáticamente</p>
          </div>
        ) : (
          envios.map((envio, idx) => {
            const dist = envio.distancia_km_repartidor
            return (
              <div key={envio.id} style={{
                background: C.white, borderRadius: 14, border: `1px solid ${C.gray200}`,
                borderLeft: `4px solid ${C.brand}`, padding: '14px 16px', marginBottom: 10,
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: C.gray800 }}>
                      Pedido #{envio.pedido_id || envio.id}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: 13, color: C.gray600 }}>📍 {envio.destino_nombre}</p>
                  </div>
                  {dist && (
                    <span style={{ background: C.brandLight, color: C.brand, borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
                      {formatDist(dist)}
                    </span>
                  )}
                </div>

                {envio.origen_nombre && (
                  <div style={{ background: C.gray100, borderRadius: 8, padding: '8px 12px', marginBottom: 10 }}>
                    <p style={{ margin: 0, fontSize: 11, color: C.gray500 }}>Origen</p>
                    <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 600, color: C.gray700 }}>🏪 {envio.origen_nombre}</p>
                  </div>
                )}

                {(envio.distancia_km || envio.duracion_min) && (
                  <p style={{ margin: '0 0 10px', fontSize: 12, color: C.gray400 }}>
                    {envio.distancia_km && `🛣 ${parseFloat(envio.distancia_km).toFixed(1)} km`}
                    {envio.distancia_km && envio.duracion_min && ' · '}
                    {envio.duracion_min && `⏱ ~${envio.duracion_min} min`}
                  </p>
                )}

                <button onClick={() => handleTomar(envio)} disabled={confirmando} style={{
                  width: '100%',
                  background: confirmando ? C.gray200 : C.brand,
                  color: confirmando ? C.gray400 : '#fff',
                  border: 'none', borderRadius: 10, padding: '12px 0',
                  fontSize: 15, fontWeight: 700, cursor: confirmando ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                }}>
                  {confirmando ? 'Asignando...' : '📦 Tomar pedido'}
                </button>
              </div>
            )
          })
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 70, left: '50%', transform: 'translateX(-50%)',
          zIndex: 9998, background: toast.color, color: '#fff',
          borderRadius: 12, padding: '12px 20px', fontSize: 14, fontWeight: 700,
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)', maxWidth: '90vw', textAlign: 'center',
          whiteSpace: 'pre-line',
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}

const styles = {
  container: {
    width: '100vw', height: '100vh', overflow: 'hidden',
    display: 'flex', flexDirection: 'column',
    fontFamily: "'Khula', sans-serif", background: C.bg,
  },
  header: {
    background: C.brand, padding: '14px 16px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    boxShadow: '0 2px 10px rgba(0,0,0,0.2)', zIndex: 100,
    flexShrink: 0,
  },
  headerTitle: {
    fontWeight: 800, fontSize: 16, color: '#fff',
  },
  backBtn: {
    background: 'rgba(255,255,255,0.2)', border: 'none',
    borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
    fontSize: 18, color: '#fff', fontFamily: 'inherit',
  },
  btnPrimary: {
    border: 'none', borderRadius: 10, padding: '14px 0',
    fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
  },
  card: {
    background: C.white, borderRadius: 14, border: `1px solid ${C.gray200}`,
    padding: '16px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  menuBtn: {
    width: '100%', textAlign: 'left', padding: '14px 16px',
    background: C.gray100, border: 'none', borderRadius: 10,
    fontSize: 15, fontWeight: 600, cursor: 'pointer', marginBottom: 8,
    fontFamily: 'inherit', color: C.gray800,
  },
}