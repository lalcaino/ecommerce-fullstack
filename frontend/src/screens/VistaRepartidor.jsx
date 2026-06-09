import { useState, useEffect, useRef, useCallback } from 'react'
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
  PENDIENTE:  { color: C.warning, icon: '⏳', label: 'Pendiente'  },
  EN_RUTA:    { color: C.info,    icon: '🚚', label: 'En ruta'    },
  COMPLETADO: { color: C.success, icon: '✅', label: 'Completado' },
  FALLIDO:    { color: C.error,   icon: '❌', label: 'Fallido'    },
  CANCELADO:  { color: C.gray400, icon: '🚫', label: 'Cancelado'  },
}

async function apiBFF(path, options = {}) {
  const token = getToken()
  const res   = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.detail || 'Error en la solicitud')
  }
  if (res.status === 204) return null
  return res.json()
}

// ─── Modal foto de entrega ────────────────────────────────────────────────────
function ModalFotoEntrega({ envio, onConfirmar, onCancelar, cargando }) {
  const [foto,     setFoto]     = useState(null)
  const [preview,  setPreview]  = useState(null)
  const [error,    setError]    = useState('')
  const inputRef = useRef(null)

  const handleFoto = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const tipos = ['image/jpeg', 'image/png', 'image/webp']
    if (!tipos.includes(file.type)) { setError('Solo JPG, PNG o WebP.'); return }
    if (file.size > 10 * 1024 * 1024) { setError('Máximo 10MB.'); return }
    setError('')
    setFoto(file)
    setPreview(URL.createObjectURL(file))
  }

  const handleConfirmar = () => {
    if (!foto) { setError('Debes tomar o seleccionar una foto.'); return }
    onConfirmar(foto)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div style={{
        background: C.white, borderRadius: '20px 20px 0 0',
        padding: '24px 20px 40px', width: '100%', maxWidth: 480,
      }}>
        <h3 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 800, color: C.gray800 }}>
          📸 Confirmar Entrega
        </h3>
        <p style={{ margin: '0 0 20px', fontSize: 14, color: C.gray500 }}>
          Envío #{envio.id} — {envio.destino_nombre}
        </p>

        {/* Zona de foto */}
        <div
          onClick={() => inputRef.current?.click()}
          style={{
            border: `2px dashed ${preview ? C.brand : C.gray200}`,
            borderRadius: 14, padding: 20, textAlign: 'center',
            cursor: 'pointer', marginBottom: 16,
            background: preview ? C.brandLight : C.gray100,
            transition: 'all .2s',
          }}
        >
          {preview ? (
            <img src={preview} alt="preview" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 10 }} />
          ) : (
            <>
              <div style={{ fontSize: 40, marginBottom: 8 }}>📷</div>
              <p style={{ margin: 0, fontWeight: 700, color: C.gray700 }}>Toca para tomar foto</p>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: C.gray400 }}>o seleccionar de la galería</p>
            </>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFoto}
          style={{ display: 'none' }}
        />

        {error && (
          <p style={{ color: C.error, fontSize: 13, fontWeight: 600, marginBottom: 12 }}>⚠️ {error}</p>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handleConfirmar}
            disabled={!foto || cargando}
            style={{
              flex: 1, background: foto && !cargando ? C.success : C.gray200,
              color: foto && !cargando ? '#fff' : C.gray400,
              border: 'none', borderRadius: 12, padding: '14px 0',
              fontSize: 16, fontWeight: 700, cursor: foto && !cargando ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit',
            }}
          >
            {cargando ? 'Confirmando...' : '✅ Confirmar Entrega'}
          </button>
          <button
            onClick={onCancelar}
            disabled={cargando}
            style={{
              background: C.gray100, color: C.gray700,
              border: `1px solid ${C.gray200}`, borderRadius: 12,
              padding: '14px 20px', fontSize: 16, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Card de envío ────────────────────────────────────────────────────────────
function EnvioCard({ envio, seleccionado, onSelect, onIniciarEntrega, onAbrirWaze }) {
  const meta = ESTADO_META[envio.estado] || ESTADO_META.PENDIENTE

  return (
    <div
      onClick={() => onSelect(envio)}
      style={{
        background: C.white, borderRadius: 14,
        border: `2px solid ${seleccionado ? C.brand : C.gray200}`,
        borderLeft: `4px solid ${meta.color}`,
        padding: '14px 16px', marginBottom: 10, cursor: 'pointer',
        boxShadow: seleccionado ? '0 4px 16px rgba(64,138,113,0.15)' : 'none',
        transition: 'all .2s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <span style={{ fontWeight: 800, fontSize: 15, color: C.gray800 }}>Envío #{envio.id}</span>
          <span style={{ fontSize: 12, color: C.gray400, marginLeft: 8 }}>Pedido #{envio.pedido_id}</span>
        </div>
        <span style={{
          background: meta.color + '18', color: meta.color,
          border: `1px solid ${meta.color}30`,
          borderRadius: 20, padding: '3px 10px',
          fontSize: 12, fontWeight: 700,
        }}>
          {meta.icon} {meta.label}
        </span>
      </div>

      <p style={{ margin: '0 0 4px', fontSize: 13, color: C.gray700 }}>
        📍 {envio.destino_nombre}
      </p>

      {(envio.distancia_km || envio.duracion_min) && (
        <p style={{ margin: '0 0 8px', fontSize: 12, color: C.gray500 }}>
          {envio.distancia_km && `🛣 ${parseFloat(envio.distancia_km).toFixed(1)} km`}
          {envio.distancia_km && envio.duracion_min && ' · '}
          {envio.duracion_min && `⏱ ~${envio.duracion_min} min`}
        </p>
      )}

      {/* Acciones — solo visible cuando está seleccionado */}
      {seleccionado && envio.estado !== 'COMPLETADO' && envio.estado !== 'CANCELADO' && (
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }} onClick={e => e.stopPropagation()}>
          {/* Botón Waze */}
          <button
            onClick={() => onAbrirWaze(envio)}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              background: '#00D8FF18', color: '#00A8CC',
              border: '1.5px solid #00D8FF40',
              borderRadius: 10, padding: '10px 0',
              fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            🗺️ Abrir en Waze
          </button>

          {/* Botón confirmar entrega */}
          {envio.estado === 'EN_RUTA' && (
            <button
              onClick={() => onIniciarEntrega(envio)}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                background: C.success + '18', color: C.success,
                border: `1.5px solid ${C.success}40`,
                borderRadius: 10, padding: '10px 0',
                fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              📸 Confirmar Entrega
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function VistaRepartidor() {
  const navigate  = useNavigate()
  const usuario   = getUsuario()
  const mapRef    = useRef(null)
  const mapContainerRef = useRef(null)

  const [envios,        setEnvios]        = useState([])
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState(null)
  const [seleccionado,  setSeleccionado]  = useState(null)
  const [modalEntrega,  setModalEntrega]  = useState(null)
  const [confirmando,   setConfirmando]   = useState(false)
  const [panelAbierto,  setPanelAbierto]  = useState(true)
  const [toast,         setToast]         = useState(null)

  // Mostrar toast temporal
  const mostrarToast = (msg, color = C.success) => {
    setToast({ msg, color })
    setTimeout(() => setToast(null), 3500)
  }

  // Cargar envíos del repartidor (EN_RUTA y PENDIENTE)
  const fetchEnvios = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiBFF('/envios/')
      const activos = (Array.isArray(data) ? data : []).filter(
        e => ['PENDIENTE', 'EN_RUTA'].includes(e.estado)
      )
      setEnvios(activos)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchEnvios() }, [fetchEnvios])

  // Inicializar mapa Mapbox
  useEffect(() => {
    if (!MAPBOX_TOKEN || mapRef.current || !mapContainerRef.current) return
    import('mapbox-gl').then(mod => {
      const mapboxgl = mod.default
      mapboxgl.accessToken = MAPBOX_TOKEN
      mapRef.current = new mapboxgl.Map({
        container: mapContainerRef.current,
        style:     'mapbox://styles/mapbox/streets-v12',
        center:    [-70.6506, -33.4372],
        zoom:      12,
        attributionControl: false,
      })
      mapRef.current.addControl(
        new mapboxgl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true, showUserHeading: true }),
        'bottom-right'
      )
      mapRef.current.addControl(new mapboxgl.NavigationControl(), 'bottom-right')
    }).catch(() => {})
  }, [])

  // Volar al envío seleccionado
  useEffect(() => {
    if (!seleccionado || !mapRef.current) return
    const lon = parseFloat(seleccionado.destino_lon)
    const lat = parseFloat(seleccionado.destino_lat)
    if (!isNaN(lon) && !isNaN(lat)) {
      mapRef.current.flyTo({ center: [lon, lat], zoom: 15, duration: 800 })
    }
  }, [seleccionado])

  // Abrir Waze con destino del envío
  const handleAbrirWaze = (envio) => {
    const lat = parseFloat(envio.destino_lat)
    const lon = parseFloat(envio.destino_lon)
    if (isNaN(lat) || isNaN(lon)) {
      // Si no hay coords, buscar por nombre
      const nombre = encodeURIComponent(envio.destino_nombre)
      window.open(`https://waze.com/ul?q=${nombre}&navigate=yes`, '_blank')
    } else {
      window.open(`https://waze.com/ul?ll=${lat},${lon}&navigate=yes`, '_blank')
    }
  }

  // Confirmar entrega con foto
  const handleConfirmarEntrega = async (foto) => {
    if (!modalEntrega) return
    setConfirmando(true)
    try {
      const formData = new FormData()
      formData.append('foto', foto)
      const token = getToken()
      const res   = await fetch(`${BASE_URL}/envios/${modalEntrega.id}/foto-entrega/`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}` },
        body:    formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Error al confirmar entrega')

      setEnvios(prev => prev.filter(e => e.id !== modalEntrega.id))
      setModalEntrega(null)
      setSeleccionado(null)
      mostrarToast(`✅ Entrega del Envío #${modalEntrega.id} confirmada.`)
    } catch (err) {
      mostrarToast(err.message, C.error)
    } finally {
      setConfirmando(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const enviosPendientes  = envios.filter(e => e.estado === 'PENDIENTE')
  const enviosEnRuta      = envios.filter(e => e.estado === 'EN_RUTA')

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative', fontFamily: "'Khula', sans-serif" }}>

      {/* Mapa fullscreen */}
      <div ref={mapContainerRef} style={{ position: 'absolute', inset: 0 }}>
        {!MAPBOX_TOKEN && (
          <div style={{
            position: 'absolute', inset: 0, background: C.gray100,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: 8,
          }}>
            <span style={{ fontSize: 40 }}>🗺️</span>
            <p style={{ color: C.gray500, fontWeight: 600 }}>Configura VITE_MAPBOX_TOKEN</p>
          </div>
        )}
      </div>

      {/* Header top bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
        background: C.brand, padding: '12px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>🚚</span>
          <div>
            <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: '#fff' }}>
              {usuario?.nombre || 'Repartidor'}
            </p>
            <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>
              {enviosEnRuta.length} en ruta · {enviosPendientes.length} pendiente{enviosPendientes.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, padding: '6px 12px', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          Salir
        </button>
      </div>

      {/* Panel inferior de envíos */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 100,
        background: C.white,
        borderRadius: panelAbierto ? '20px 20px 0 0' : '20px 20px 0 0',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
        maxHeight: panelAbierto ? '65vh' : '72px',
        transition: 'max-height .35s ease',
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Handle para abrir/cerrar */}
        <div
          onClick={() => setPanelAbierto(v => !v)}
          style={{ padding: '12px 16px', cursor: 'pointer', flexShrink: 0 }}
        >
          <div style={{ width: 40, height: 4, background: C.gray200, borderRadius: 2, margin: '0 auto 10px' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.gray800 }}>
              Mis Envíos
            </h3>
            <span style={{ fontSize: 18, color: C.gray400 }}>
              {panelAbierto ? '⌄' : '⌃'}
            </span>
          </div>
        </div>

        {/* Lista scrollable */}
        <div style={{ overflowY: 'auto', padding: '0 16px 20px', flex: 1 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 24, color: C.gray400 }}>
              Cargando envíos...
            </div>
          ) : error ? (
            <div style={{ color: C.error, fontSize: 13, padding: 12 }}>⚠️ {error}</div>
          ) : envios.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: C.gray400 }}>
              <p style={{ fontSize: 32, marginBottom: 8 }}>🎉</p>
              <p style={{ fontWeight: 600 }}>Sin envíos pendientes</p>
              <p style={{ fontSize: 13 }}>No tienes entregas asignadas por ahora.</p>
            </div>
          ) : (
            <>
              {enviosEnRuta.length > 0 && (
                <>
                  <p style={{ fontSize: 11, fontWeight: 700, color: C.info, textTransform: 'uppercase', letterSpacing: '.5px', margin: '8px 0 8px' }}>
                    🚚 En ruta ({enviosEnRuta.length})
                  </p>
                  {enviosEnRuta.map(e => (
                    <EnvioCard
                      key={e.id} envio={e}
                      seleccionado={seleccionado?.id === e.id}
                      onSelect={env => setSeleccionado(prev => prev?.id === env.id ? null : env)}
                      onIniciarEntrega={env => setModalEntrega(env)}
                      onAbrirWaze={handleAbrirWaze}
                    />
                  ))}
                </>
              )}

              {enviosPendientes.length > 0 && (
                <>
                  <p style={{ fontSize: 11, fontWeight: 700, color: C.warning, textTransform: 'uppercase', letterSpacing: '.5px', margin: '12px 0 8px' }}>
                    ⏳ Pendientes ({enviosPendientes.length})
                  </p>
                  {enviosPendientes.map(e => (
                    <EnvioCard
                      key={e.id} envio={e}
                      seleccionado={seleccionado?.id === e.id}
                      onSelect={env => setSeleccionado(prev => prev?.id === env.id ? null : env)}
                      onIniciarEntrega={env => setModalEntrega(env)}
                      onAbrirWaze={handleAbrirWaze}
                    />
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal foto de entrega */}
      {modalEntrega && (
        <ModalFotoEntrega
          envio={modalEntrega}
          onConfirmar={handleConfirmarEntrega}
          onCancelar={() => setModalEntrega(null)}
          cargando={confirmando}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 70, left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, background: toast.color, color: '#fff',
          borderRadius: 10, padding: '12px 20px',
          fontSize: 14, fontWeight: 700,
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          maxWidth: '90vw', textAlign: 'center',
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}