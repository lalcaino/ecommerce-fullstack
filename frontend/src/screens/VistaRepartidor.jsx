import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getToken, getUsuario, logout } from '../services/authService'

const BASE_URL     = import.meta.env.VITE_API_URL    || 'http://localhost:8000/api'
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || ''

const BODEGA_CENTRAL = { lon: -70.6506, lat: -33.4372 }

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

const ROUTE_COLORS = ['#408A71', '#3b82f6', '#f97316', '#8b5cf6', '#ec4899', '#14b8a6']

async function apiBFF(path, options = {}) {
  const token = getToken()
  const res   = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, ...options.headers },
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
  const [foto,    setFoto]    = useState(null)
  const [preview, setPreview] = useState(null)
  const [error,   setError]   = useState('')
  const inputRef = useRef(null)

  const handleFoto = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!['image/jpeg','image/png','image/webp'].includes(file.type)) { setError('Solo JPG, PNG o WebP.'); return }
    if (file.size > 10 * 1024 * 1024) { setError('Máximo 10MB.'); return }
    setError('')
    setFoto(file)
    setPreview(URL.createObjectURL(file))
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div style={{ background: C.white, borderRadius: '20px 20px 0 0', padding: '24px 20px 40px', width: '100%', maxWidth: 480 }}>
        <h3 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 800, color: C.gray800 }}>📸 Confirmar Entrega</h3>
        <p style={{ margin: '0 0 20px', fontSize: 14, color: C.gray500 }}>Envío #{envio.id} — {envio.destino_nombre}</p>

        <div onClick={() => inputRef.current?.click()} style={{
          border: `2px dashed ${preview ? C.brand : C.gray200}`, borderRadius: 14,
          padding: 20, textAlign: 'center', cursor: 'pointer', marginBottom: 16,
          background: preview ? C.brandLight : C.gray100,
        }}>
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

        <input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={handleFoto} style={{ display: 'none' }} />
        {error && <p style={{ color: C.error, fontSize: 13, fontWeight: 600, marginBottom: 12 }}>⚠️ {error}</p>}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => { if (!foto) { setError('Debes tomar o seleccionar una foto.'); return } onConfirmar(foto) }}
            disabled={cargando}
            style={{ flex: 1, background: foto && !cargando ? C.success : C.gray200, color: foto && !cargando ? '#fff' : C.gray400, border: 'none', borderRadius: 12, padding: '14px 0', fontSize: 16, fontWeight: 700, cursor: foto && !cargando ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
            {cargando ? 'Confirmando...' : '✅ Confirmar Entrega'}
          </button>
          <button onClick={onCancelar} disabled={cargando}
            style={{ background: C.gray100, color: C.gray700, border: `1px solid ${C.gray200}`, borderRadius: 12, padding: '14px 20px', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Card de envío ────────────────────────────────────────────────────────────
function EnvioCard({ envio, idx, seleccionado, onSelect, onIniciarEntrega, onAbrirWaze }) {
  const meta  = ESTADO_META[envio.estado] || ESTADO_META.PENDIENTE
  const color = ROUTE_COLORS[idx % ROUTE_COLORS.length]

  return (
    <div onClick={() => onSelect(envio)} style={{
      background: C.white, borderRadius: 14,
      border: `2px solid ${seleccionado ? C.brand : C.gray200}`,
      borderLeft: `4px solid ${color}`,
      padding: '14px 16px', marginBottom: 10, cursor: 'pointer',
      boxShadow: seleccionado ? '0 4px 16px rgba(64,138,113,0.15)' : 'none',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 24, height: 24, borderRadius: '50%', background: color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>
            {idx + 1}
          </div>
          <div>
            <span style={{ fontWeight: 800, fontSize: 15, color: C.gray800 }}>Envío #{envio.id}</span>
            <span style={{ fontSize: 12, color: C.gray400, marginLeft: 8 }}>Pedido #{envio.pedido_id}</span>
          </div>
        </div>
        <span style={{ background: meta.color + '18', color: meta.color, border: `1px solid ${meta.color}30`, borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>
          {meta.icon} {meta.label}
        </span>
      </div>

      <p style={{ margin: '0 0 4px', fontSize: 13, color: C.gray700 }}>📍 {envio.destino_nombre}</p>

      {(envio.distancia_km || envio.duracion_min) && (
        <p style={{ margin: '0 0 8px', fontSize: 12, color: C.gray500 }}>
          {envio.distancia_km && `🛣 ${parseFloat(envio.distancia_km).toFixed(1)} km`}
          {envio.distancia_km && envio.duracion_min && ' · '}
          {envio.duracion_min && `⏱ ~${envio.duracion_min} min`}
        </p>
      )}

      {seleccionado && envio.estado !== 'COMPLETADO' && envio.estado !== 'CANCELADO' && (
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }} onClick={e => e.stopPropagation()}>
          <button onClick={() => onAbrirWaze(envio)} style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            background: '#00D8FF18', color: '#00A8CC', border: '1.5px solid #00D8FF40',
            borderRadius: 10, padding: '10px 0', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}>🗺️ Waze</button>
          {envio.estado === 'EN_RUTA' && (
            <button onClick={() => onIniciarEntrega(envio)} style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              background: C.success + '18', color: C.success, border: `1.5px solid ${C.success}40`,
              borderRadius: 10, padding: '10px 0', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            }}>📸 Confirmar</button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function VistaRepartidor() {
  const navigate = useNavigate()
  const usuario  = getUsuario()

  const mapRef          = useRef(null)
  const mapContainerRef = useRef(null)
  const markersRef      = useRef([])

  const [envios,         setEnvios]         = useState([])
  const [loading,        setLoading]        = useState(true)
  const [error,          setError]          = useState(null)
  const [seleccionado,   setSeleccionado]   = useState(null)
  const [modalEntrega,   setModalEntrega]   = useState(null)
  const [confirmando,    setConfirmando]    = useState(false)
  const [panelAbierto,   setPanelAbierto]   = useState(true)
  const [toast,          setToast]          = useState(null)
  const [modoRuta,       setModoRuta]       = useState(false)
  const [rutaInfo,       setRutaInfo]       = useState(null)  // { distanciaTotal, duracionTotal }
  const [calculandoRuta, setCalculandoRuta] = useState(false)

  const mostrarToast = (msg, color = C.success) => {
    setToast({ msg, color })
    setTimeout(() => setToast(null), 3500)
  }

  const fetchEnvios = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data   = await apiBFF('/envios/')
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

  // ── Inicializar mapa ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!MAPBOX_TOKEN || mapRef.current || !mapContainerRef.current) return
    import('mapbox-gl').then(mod => {
      const mapboxgl        = mod.default
      mapboxgl.accessToken  = MAPBOX_TOKEN
      mapRef.current        = new mapboxgl.Map({
        container: mapContainerRef.current,
        style:     'mapbox://styles/mapbox/streets-v12',
        center:    [BODEGA_CENTRAL.lon, BODEGA_CENTRAL.lat],
        zoom:      12,
        attributionControl: false,
      })
      mapRef.current.addControl(
        new mapboxgl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true, showUserHeading: true }),
        'bottom-right'
      )
      mapRef.current.addControl(new mapboxgl.NavigationControl(), 'bottom-right')

      // Marker bodega central
      const el        = document.createElement('div')
      el.style.cssText = `width:32px;height:32px;border-radius:50%;background:#2e6b57;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;font-size:16px;`
      el.innerHTML     = '🏭'
      new mapboxgl.Marker({ element: el }).setLngLat([BODEGA_CENTRAL.lon, BODEGA_CENTRAL.lat]).addTo(mapRef.current)
    }).catch(() => {})
  }, [])

  // ── Dibujar marcadores individuales ──────────────────────────────────────
  const dibujarMarcadores = useCallback(async () => {
    const map = mapRef.current
    if (!map || modoRuta) return
    let mapboxgl
    try { mapboxgl = (await import('mapbox-gl')).default } catch { return }

    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    const bounds = new mapboxgl.LngLatBounds()
    bounds.extend([BODEGA_CENTRAL.lon, BODEGA_CENTRAL.lat])

    envios.forEach((envio, idx) => {
      const lon   = parseFloat(envio.destino_lon)
      const lat   = parseFloat(envio.destino_lat)
      if (isNaN(lon) || isNaN(lat)) return
      bounds.extend([lon, lat])

      const color = ROUTE_COLORS[idx % ROUTE_COLORS.length]
      const meta  = ESTADO_META[envio.estado] || ESTADO_META.PENDIENTE
      const el    = document.createElement('div')
      el.style.cssText = `width:36px;height:36px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;font-size:15px;cursor:pointer;font-weight:800;color:#fff;`
      el.innerHTML     = idx + 1

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([lon, lat])
        .setPopup(new mapboxgl.Popup({ offset: 20 }).setHTML(`
          <div style="font-size:13px;font-weight:700">Envío #${envio.id}</div>
          <div style="font-size:12px;color:#6b7280">📍 ${envio.destino_nombre}</div>
          <div style="margin-top:4px">
            <span style="background:${meta.color}18;color:${meta.color};border-radius:20px;padding:2px 8px;font-size:11px;font-weight:700">${meta.icon} ${meta.label}</span>
          </div>
        `))
        .addTo(map)
      markersRef.current.push(marker)
    })

    if (!bounds.isEmpty() && envios.length > 0) {
      map.fitBounds(bounds, { padding: 80, maxZoom: 14, duration: 800 })
    }
  }, [envios, modoRuta])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (map.isStyleLoaded()) dibujarMarcadores()
    else map.once('load', dibujarMarcadores)
  }, [dibujarMarcadores])

  // ── Ruta acumulada ────────────────────────────────────────────────────────
  const calcularRutaAcumulada = useCallback(async () => {
    const map = mapRef.current
    if (!map || !MAPBOX_TOKEN || envios.length === 0) return

    setCalculandoRuta(true)
    let mapboxgl
    try { mapboxgl = (await import('mapbox-gl')).default } catch { setCalculandoRuta(false); return }

    // Limpiar marcadores anteriores
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    // Limpiar capas anteriores
    const style = map.getStyle()
    if (style) {
      style.layers?.forEach(l => {
        if (l.id.startsWith('ruta-acumulada')) {
          try { map.removeLayer(l.id) } catch {}
        }
      })
      Object.keys(style.sources || {}).forEach(id => {
        if (id.startsWith('ruta-acumulada')) {
          try { map.removeSource(id) } catch {}
        }
      })
    }

    // Armar waypoints: bodega → envío1 → envío2 → ... → envíoN
    const puntos = [BODEGA_CENTRAL]
    const enviosValidos = envios.filter(e => {
      const lon = parseFloat(e.destino_lon)
      const lat = parseFloat(e.destino_lat)
      return !isNaN(lon) && !isNaN(lat)
    })

    enviosValidos.forEach(e => puntos.push({ lon: parseFloat(e.destino_lon), lat: parseFloat(e.destino_lat) }))

    if (puntos.length < 2) { setCalculandoRuta(false); return }

    const waypointsStr = puntos.map(p => `${p.lon},${p.lat}`).join(';')

    try {
      const url  = `https://api.mapbox.com/directions/v5/mapbox/driving/${waypointsStr}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`
      const res  = await fetch(url)
      const data = await res.json()

      if (!data.routes?.length) throw new Error('Sin ruta disponible')

      const route        = data.routes[0]
      const distanciaKm  = (route.distance / 1000).toFixed(1)
      const duracionMin  = Math.round(route.duration / 60)
      setRutaInfo({ distanciaKm, duracionMin, total: enviosValidos.length })

      // Dibujar ruta
      map.addSource('ruta-acumulada-src', { type: 'geojson', data: { type: 'Feature', geometry: route.geometry } })
      map.addLayer({ id: 'ruta-acumulada-outline', type: 'line', source: 'ruta-acumulada-src', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#ffffff', 'line-width': 9, 'line-opacity': .6 } })
      map.addLayer({ id: 'ruta-acumulada-line',    type: 'line', source: 'ruta-acumulada-src', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': C.brand,   'line-width': 5 } })

      // Marcadores numerados
      const bounds = new mapboxgl.LngLatBounds()
      puntos.forEach((p, idx) => {
        bounds.extend([p.lon, p.lat])
        const el        = document.createElement('div')
        const color     = idx === 0 ? C.brandDark : ROUTE_COLORS[(idx - 1) % ROUTE_COLORS.length]
        el.style.cssText = `width:34px;height:34px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:#fff;`
        el.innerHTML     = idx === 0 ? '🏭' : idx

        const envio = idx > 0 ? enviosValidos[idx - 1] : null
        const popup = new mapboxgl.Popup({ offset: 20 }).setHTML(
          idx === 0
            ? `<div style="font-size:13px;font-weight:700">Bodega Central</div><div style="font-size:11px;color:#6b7280">Punto de partida</div>`
            : `<div style="font-size:13px;font-weight:700">Parada ${idx} — Envío #${envio.id}</div><div style="font-size:12px;color:#6b7280">📍 ${envio.destino_nombre}</div>`
        )
        markersRef.current.push(new mapboxgl.Marker({ element: el }).setLngLat([p.lon, p.lat]).setPopup(popup).addTo(map))
      })

      map.fitBounds(bounds, { padding: 80, maxZoom: 13, duration: 1000 })

    } catch (err) {
      mostrarToast('No se pudo calcular la ruta: ' + err.message, C.error)
    } finally {
      setCalculandoRuta(false)
    }
  }, [envios])

  const toggleModoRuta = () => {
    if (!modoRuta) {
      setModoRuta(true)
      calcularRutaAcumulada()
    } else {
      // Volver a modo individual
      setModoRuta(false)
      setRutaInfo(null)
      // Limpiar capas de ruta
      const map = mapRef.current
      if (map) {
        ['ruta-acumulada-outline', 'ruta-acumulada-line'].forEach(id => { try { map.removeLayer(id) } catch {} })
        try { map.removeSource('ruta-acumulada-src') } catch {}
      }
    }
  }

  // Volar al envío seleccionado
  useEffect(() => {
    if (!seleccionado || !mapRef.current || modoRuta) return
    const lon = parseFloat(seleccionado.destino_lon)
    const lat = parseFloat(seleccionado.destino_lat)
    if (!isNaN(lon) && !isNaN(lat)) {
      mapRef.current.flyTo({ center: [lon, lat], zoom: 15, duration: 800 })
    }
  }, [seleccionado, modoRuta])

  const handleAbrirWaze = (envio) => {
    const lat = parseFloat(envio.destino_lat)
    const lon = parseFloat(envio.destino_lon)
    if (isNaN(lat) || isNaN(lon)) {
      window.open(`https://waze.com/ul?q=${encodeURIComponent(envio.destino_nombre)}&navigate=yes`, '_blank')
    } else {
      window.open(`https://waze.com/ul?ll=${lat},${lon}&navigate=yes`, '_blank')
    }
  }

  const handleConfirmarEntrega = async (foto) => {
    if (!modalEntrega) return
    setConfirmando(true)
    try {
      const formData = new FormData()
      formData.append('foto', foto)
      const token = getToken()
      const res   = await fetch(`${BASE_URL}/envios/${modalEntrega.id}/foto-entrega/`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Error al confirmar entrega')
      setEnvios(prev => prev.filter(e => e.id !== modalEntrega.id))
      setModalEntrega(null)
      setSeleccionado(null)
      if (modoRuta) { setModoRuta(false); setRutaInfo(null) }
      mostrarToast(`✅ Entrega del Envío #${modalEntrega.id} confirmada.`)
    } catch (err) {
      mostrarToast(err.message, C.error)
    } finally {
      setConfirmando(false)
    }
  }

  const enviosEnRuta      = envios.filter(e => e.estado === 'EN_RUTA')
  const enviosPendientes  = envios.filter(e => e.estado === 'PENDIENTE')

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative', fontFamily: "'Khula', sans-serif" }}>

      {/* Mapa fullscreen */}
      <div ref={mapContainerRef} style={{ position: 'absolute', inset: 0 }}>
        {!MAPBOX_TOKEN && (
          <div style={{ position: 'absolute', inset: 0, background: C.gray100, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 40 }}>🗺️</span>
            <p style={{ color: C.gray500, fontWeight: 600 }}>Configura VITE_MAPBOX_TOKEN</p>
          </div>
        )}
      </div>

      {/* Header */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
        background: C.brand, padding: '12px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>🚚</span>
          <div>
            <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: '#fff' }}>{usuario?.nombre || 'Repartidor'}</p>
            <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>
              {enviosEnRuta.length} en ruta · {enviosPendientes.length} pendiente{enviosPendientes.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Botón ruta acumulada */}
          {envios.length > 1 && MAPBOX_TOKEN && (
            <button onClick={toggleModoRuta} disabled={calculandoRuta} style={{
              background: modoRuta ? '#fff' : 'rgba(255,255,255,0.2)',
              color: modoRuta ? C.brand : '#fff',
              border: modoRuta ? 'none' : '1.5px solid rgba(255,255,255,0.4)',
              borderRadius: 8, padding: '6px 12px',
              fontSize: 13, fontWeight: 700, cursor: calculandoRuta ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4,
            }}>
              {calculandoRuta ? '⏳' : modoRuta ? '📍 Ver individual' : '🗺️ Ruta completa'}
            </button>
          )}

          <button onClick={() => { logout(); navigate('/login') }}
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, padding: '6px 12px', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Salir
          </button>
        </div>
      </div>

      {/* Info ruta acumulada */}
      {modoRuta && rutaInfo && (
        <div style={{
          position: 'absolute', top: 66, left: '50%', transform: 'translateX(-50%)',
          zIndex: 100, background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(8px)', borderRadius: 12,
          padding: '10px 20px', boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          display: 'flex', gap: 20, alignItems: 'center',
        }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.gray800 }}>{rutaInfo.distanciaKm} km</p>
            <p style={{ margin: 0, fontSize: 11, color: C.gray500 }}>Distancia total</p>
          </div>
          <div style={{ width: 1, height: 36, background: C.gray200 }} />
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.gray800 }}>{rutaInfo.duracionMin} min</p>
            <p style={{ margin: 0, fontSize: 11, color: C.gray500 }}>Tiempo estimado</p>
          </div>
          <div style={{ width: 1, height: 36, background: C.gray200 }} />
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.brand }}>{rutaInfo.total}</p>
            <p style={{ margin: 0, fontSize: 11, color: C.gray500 }}>Paradas</p>
          </div>
        </div>
      )}

      {/* Panel inferior */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 100,
        background: C.white, borderRadius: '20px 20px 0 0',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
        maxHeight: panelAbierto ? '60vh' : '72px',
        transition: 'max-height .35s ease',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
      }}>
        {/* Handle */}
        <div onClick={() => setPanelAbierto(v => !v)} style={{ padding: '12px 16px', cursor: 'pointer', flexShrink: 0 }}>
          <div style={{ width: 40, height: 4, background: C.gray200, borderRadius: 2, margin: '0 auto 10px' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.gray800 }}>
              {modoRuta ? '🗺️ Ruta del día' : 'Mis Envíos'}
            </h3>
            <span style={{ fontSize: 18, color: C.gray400 }}>{panelAbierto ? '⌄' : '⌃'}</span>
          </div>
        </div>

        {/* Lista */}
        <div style={{ overflowY: 'auto', padding: '0 16px 20px', flex: 1 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 24, color: C.gray400 }}>Cargando envíos...</div>
          ) : error ? (
            <div style={{ color: C.error, fontSize: 13, padding: 12 }}>⚠️ {error}</div>
          ) : envios.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: C.gray400 }}>
              <p style={{ fontSize: 32, marginBottom: 8 }}>🎉</p>
              <p style={{ fontWeight: 600 }}>Sin envíos pendientes</p>
            </div>
          ) : (
            <>
              {enviosEnRuta.length > 0 && (
                <>
                  <p style={{ fontSize: 11, fontWeight: 700, color: C.info, textTransform: 'uppercase', letterSpacing: '.5px', margin: '8px 0 8px' }}>
                    🚚 En ruta ({enviosEnRuta.length})
                  </p>
                  {enviosEnRuta.map((e, idx) => (
                    <EnvioCard key={e.id} envio={e} idx={idx}
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
                  {enviosPendientes.map((e, idx) => (
                    <EnvioCard key={e.id} envio={e} idx={enviosEnRuta.length + idx}
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

      {/* Modal foto entrega */}
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
          borderRadius: 10, padding: '12px 20px', fontSize: 14, fontWeight: 700,
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)', maxWidth: '90vw', textAlign: 'center',
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}