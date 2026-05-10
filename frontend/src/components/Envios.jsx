import { useState, useEffect, useRef, useCallback } from 'react'
import { useEnvios } from '../hooks/useEnvios'

// ─── Token Mapbox ─────────────────────────────────────────────────────────────
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || ''

// ─── Coordenadas bodega central ───────────────────────────────────────────────
const BODEGA_CENTRAL = { lon: -70.6506, lat: -33.4372, nombre: 'Bodega Central SmartLogix' }

// ─── Paleta de colores ────────────────────────────────────────────────────────
const C = {
  brand: '#408A71', brandDark: '#2e6b57', brandLight: '#e8f5f0',
  white: '#ffffff', bg: '#f4f7f6',
  gray100: '#f3f4f6', gray200: '#e5e7eb', gray300: '#d1d5db',
  gray400: '#9ca3af', gray500: '#6b7280', gray700: '#374151', gray800: '#1f2937',
  success: '#10b981', warning: '#f59e0b', error: '#ef4444',
  info: '#3b82f6', purple: '#8b5cf6',
}

const ESTADO_ENVIO = {
  PENDIENTE:  { color: C.warning,  icon: '⏳', label: 'Pendiente'  },
  EN_RUTA:    { color: C.info,     icon: '🚚', label: 'En ruta'    },
  COMPLETADO: { color: C.success,  icon: '✅', label: 'Completado' },
  FALLIDO:    { color: C.error,    icon: '❌', label: 'Fallido'    },
  CANCELADO:  { color: C.gray400,  icon: '🚫', label: 'Cancelado'  },
}

const TIPO_ENVIO = {
  ESTANDAR:   { color: C.brand,   label: 'Estándar'   },
  EXPRESS:    { color: '#f97316', label: 'Express'    },
  PROGRAMADO: { color: C.purple,  label: 'Programado' },
}

const ROUTE_COLORS = ['#408A71','#3b82f6','#f97316','#8b5cf6','#ec4899','#14b8a6']

// ─── Estilos globales ─────────────────────────────────────────────────────────
const injectStyles = () => {
  if (document.getElementById('envios-styles')) return
  const s = document.createElement('style')
  s.id = 'envios-styles'
  s.textContent = `
    @keyframes fadeUp   { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:none } }
    @keyframes pulse    { 0%,100% { opacity:1 } 50% { opacity:.5 } }
    @keyframes spin     { to { transform:rotate(360deg) } }
    @keyframes ripple   { 0% { transform:scale(1); opacity:.8 } 100% { transform:scale(2.5); opacity:0 } }
    .envio-card         { animation:fadeUp .3s ease both; transition:box-shadow .18s, transform .18s; }
    .envio-card:hover   { transform:translateY(-3px); box-shadow:0 8px 24px rgba(64,138,113,.15); }
    .envio-card.selected{ border-color:${C.brand} !important; background:${C.brandLight} !important; }
    .mapboxgl-map       { font-family:inherit !important; }
    .mapboxgl-ctrl-logo { display:none !important; }
    .envio-marker       { width:32px; height:32px; border-radius:50%; border:3px solid #fff;
                          box-shadow:0 2px 8px rgba(0,0,0,.35); display:flex; align-items:center;
                          justify-content:center; font-size:14px; cursor:pointer; position:relative; }
    .envio-marker .ripple-ring { position:absolute; inset:-4px; border-radius:50%;
                          border:2px solid currentColor; animation:ripple 1.8s ease-out infinite; }
    .map-popup          { font-family:inherit; }
    .map-popup .mapboxgl-popup-content { border-radius:12px; padding:14px 16px;
                          box-shadow:0 8px 30px rgba(0,0,0,.18); border:1px solid ${C.gray200}; }
    .map-popup .mapboxgl-popup-tip     { border-top-color:#fff; }
    .geocoder-suggestion:hover { background: ${C.gray100} !important; }
  `
  document.head.appendChild(s)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function Badge({ color, children, small }) {
  return (
    <span style={{
      background: color + '18', color, border: `1px solid ${color}30`,
      borderRadius: 20, padding: small ? '2px 8px' : '3px 10px',
      fontSize: small ? 11 : 12, fontWeight: 700, whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  )
}

function Btn({ onClick, children, variant = 'primary', small, disabled }) {
  const variants = {
    primary:   { bg: C.brand,        color: '#fff',    border: 'none' },
    secondary: { bg: C.gray100,      color: C.gray700, border: `1px solid ${C.gray200}` },
    danger:    { bg: C.error + '18', color: C.error,   border: `1px solid ${C.error}30` },
    success:   { bg: C.success+'18', color: C.success, border: `1px solid ${C.success}30` },
    ghost:     { bg: 'transparent',  color: C.brand,   border: `1.5px solid ${C.brand}` },
  }
  const v = variants[variant] || variants.primary
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: disabled ? C.gray200 : v.bg,
      color: disabled ? C.gray400 : v.color,
      border: v.border, borderRadius: 8,
      padding: small ? '5px 12px' : '9px 18px',
      fontSize: small ? 12 : 14, fontWeight: 600,
      cursor: disabled ? 'not-allowed' : 'pointer',
      fontFamily: 'inherit', transition: 'opacity .15s',
    }}>
      {children}
    </button>
  )
}

// ─── Geocodificador de direcciones ────────────────────────────────────────────
function GeocoderInput({ value, onChange, onSelect, placeholder }) {
  const [query,       setQuery]       = useState(value || '')
  const [sugerencias, setSugerencias] = useState([])
  const [buscando,    setBuscando]    = useState(false)
  const [mostrar,     setMostrar]     = useState(false)
  const debounceRef = useRef(null)
  const wrapperRef  = useRef(null)

  // Cierra dropdown al hacer clic fuera
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setMostrar(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleChange = (e) => {
    const val = e.target.value
    setQuery(val)
    onChange(val)           // notifica al padre que se borró la selección
    setSugerencias([])
    setMostrar(false)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (val.length < 3) return

    debounceRef.current = setTimeout(async () => {
      if (!MAPBOX_TOKEN) return
      setBuscando(true)
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(val)}.json` +
          `?access_token=${MAPBOX_TOKEN}&country=cl&language=es&limit=5&types=address,place,locality`
        const res  = await fetch(url)
        const data = await res.json()
        setSugerencias(data.features || [])
        setMostrar(true)
      } catch {
        setSugerencias([])
      } finally {
        setBuscando(false)
      }
    }, 380)
  }

  const handleSelect = (feature) => {
    const [lon, lat] = feature.center
    const nombre     = feature.place_name
    setQuery(nombre)
    setSugerencias([])
    setMostrar(false)
    onSelect({ nombre, lat, lon })
  }

  const listo = value && value === query

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => sugerencias.length > 0 && setMostrar(true)}
          placeholder={placeholder || 'Escribe una dirección...'}
          style={{
            width: '100%', boxSizing: 'border-box',
            border: `1.5px solid ${listo ? C.success : C.gray200}`,
            borderRadius: 8, padding: '8px 36px 8px 10px',
            fontSize: 13, fontFamily: 'inherit', outline: 'none',
            color: C.gray800, transition: 'border-color .2s',
          }}
        />

        {/* Spinner o check */}
        <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)' }}>
          {buscando ? (
            <div style={{
              width: 14, height: 14,
              border: `2px solid ${C.gray200}`, borderTopColor: C.brand,
              borderRadius: '50%', animation: 'spin 1s linear infinite',
            }} />
          ) : listo ? (
            <span style={{ color: C.success, fontSize: 14 }}>✓</span>
          ) : (
            <span style={{ color: C.gray400, fontSize: 14 }}>🔍</span>
          )}
        </div>
      </div>

      {/* Dropdown sugerencias */}
      {mostrar && sugerencias.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          zIndex: 9999, background: C.white,
          border: `1px solid ${C.gray200}`, borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', overflow: 'hidden',
        }}>
          {sugerencias.map((f) => (
            <div
              key={f.id}
              className="geocoder-suggestion"
              onMouseDown={() => handleSelect(f)}   // mouseDown para no perder el foco primero
              style={{
                padding: '10px 14px', cursor: 'pointer', fontSize: 13,
                borderBottom: `1px solid ${C.gray100}`,
                transition: 'background .1s',
              }}
            >
              <div style={{ fontWeight: 600, color: C.gray800, marginBottom: 2 }}>
                📍 {f.text}
              </div>
              <div style={{ fontSize: 11, color: C.gray400, lineHeight: 1.4 }}>
                {f.place_name}
              </div>
            </div>
          ))}

          {!MAPBOX_TOKEN && (
            <div style={{ padding: '10px 14px', fontSize: 12, color: C.warning, fontWeight: 600 }}>
              ⚠️ Configura VITE_MAPBOX_TOKEN para buscar direcciones
            </div>
          )}
        </div>
      )}

      {/* Sin token: aviso */}
      {!MAPBOX_TOKEN && query.length > 2 && (
        <div style={{ fontSize: 11, color: C.warning, marginTop: 4, fontWeight: 600 }}>
          ⚠️ Sin VITE_MAPBOX_TOKEN — ingresa lat/lon manualmente
        </div>
      )}
    </div>
  )
}

// ─── Formulario nuevo envío ───────────────────────────────────────────────────
function NuevoEnvioForm({ conductores, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    pedido_id:      '',
    tipo:           'ESTANDAR',
    conductor:      '',
    origen_nombre:  BODEGA_CENTRAL.nombre,
    origen_lat:     String(BODEGA_CENTRAL.lat),
    origen_lon:     String(BODEGA_CENTRAL.lon),
    destino_nombre: '',
    destino_lat:    '',
    destino_lon:    '',
    notas:          '',
  })

  // Texto del buscador (separado del form para saber si ya se seleccionó)
  const [destinoTexto, setDestinoTexto] = useState('')

  const ch = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }))

  const handleDestinoSelect = ({ nombre, lat, lon }) => {
    setDestinoTexto(nombre)
    setForm(p => ({
      ...p,
      destino_nombre: nombre,
      destino_lat:    String(lat),
      destino_lon:    String(lon),
    }))
  }

  const handleDestinoChange = (val) => {
    setDestinoTexto(val)
    // Si el usuario edita el texto, limpiamos las coordenadas
    if (val !== form.destino_nombre) {
      setForm(p => ({ ...p, destino_nombre: '', destino_lat: '', destino_lon: '' }))
    }
  }

  const listo = form.destino_lat && form.destino_lon && form.pedido_id

  const handleSubmit = () => {
    onSubmit({
      pedido_id:      parseInt(form.pedido_id),
      tipo:           form.tipo,
      conductor:      form.conductor ? parseInt(form.conductor) : null,
      origen_nombre:  form.origen_nombre,
      origen_lat:     parseFloat(form.origen_lat),
      origen_lon:     parseFloat(form.origen_lon),
      destino_nombre: form.destino_nombre,
      destino_lat:    parseFloat(form.destino_lat),
      destino_lon:    parseFloat(form.destino_lon),
      notas:          form.notas,
    })
  }

  const inputStyle = {
    border: `1.5px solid ${C.gray200}`, borderRadius: 8,
    padding: '8px 10px', fontSize: 13, fontFamily: 'inherit',
    outline: 'none', color: C.gray800, width: '100%', boxSizing: 'border-box',
  }

  return (
    <div style={{
      background: C.white, borderRadius: 14, border: `1px solid ${C.gray200}`,
      padding: 20, marginBottom: 16, animation: 'fadeUp .25s ease',
    }}>
      <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: C.gray800 }}>
        🗺️ Nuevo Envío
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

        {/* ID Pedido */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: C.gray500, textTransform: 'uppercase', letterSpacing: '.5px' }}>
            ID Pedido *
          </label>
          <input type="number" name="pedido_id" value={form.pedido_id} onChange={ch}
            placeholder="Ej: 1" style={inputStyle} />
        </div>

        {/* Tipo */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: C.gray500, textTransform: 'uppercase', letterSpacing: '.5px' }}>
            Tipo
          </label>
          <select name="tipo" value={form.tipo} onChange={ch} style={inputStyle}>
            <option value="ESTANDAR">📦 Estándar</option>
            <option value="EXPRESS">⚡ Express</option>
            <option value="PROGRAMADO">📅 Programado</option>
          </select>
        </div>

        {/* Conductor */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: C.gray500, textTransform: 'uppercase', letterSpacing: '.5px' }}>
            Conductor
          </label>
          <select name="conductor" value={form.conductor} onChange={ch} style={inputStyle}>
            <option value="">Sin asignar</option>
            {conductores.map(c => (
              <option key={c.id} value={c.id}>{c.nombre} ({c.patente})</option>
            ))}
          </select>
        </div>

        {/* Notas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: C.gray500, textTransform: 'uppercase', letterSpacing: '.5px' }}>
            Notas
          </label>
          <input type="text" name="notas" value={form.notas} onChange={ch}
            placeholder="Opcional" style={inputStyle} />
        </div>

        {/* Buscador de dirección — fila completa */}
        <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: C.gray500, textTransform: 'uppercase', letterSpacing: '.5px' }}>
            📍 Dirección de destino *
          </label>
          <GeocoderInput
            value={destinoTexto}
            onChange={handleDestinoChange}
            onSelect={handleDestinoSelect}
            placeholder="Ej: José Miguel Luis Cerda 5930, Santiago"
          />

          {/* Coordenadas encontradas */}
          {form.destino_lat && form.destino_lon && (
            <div style={{
              display: 'flex', gap: 8, alignItems: 'center',
              background: C.brandLight, borderRadius: 6,
              padding: '5px 10px', marginTop: 2,
            }}>
              <span style={{ fontSize: 12 }}>✅</span>
              <span style={{ fontSize: 11, color: C.brand, fontWeight: 600 }}>
                Coordenadas: {parseFloat(form.destino_lat).toFixed(5)}, {parseFloat(form.destino_lon).toFixed(5)}
              </span>
            </div>
          )}

          {/* Fallback manual si no hay token */}
          {!MAPBOX_TOKEN && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 6 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: 'uppercase' }}>Latitud manual</label>
                <input type="number" name="destino_lat" value={form.destino_lat} onChange={ch}
                  placeholder="-33.4372" style={{ ...inputStyle, fontSize: 12 }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: 'uppercase' }}>Longitud manual</label>
                <input type="number" name="destino_lon" value={form.destino_lon} onChange={ch}
                  placeholder="-70.6506" style={{ ...inputStyle, fontSize: 12 }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Botones */}
      <div style={{ display: 'flex', gap: 8, marginTop: 16, alignItems: 'center' }}>
        <Btn variant="success" onClick={handleSubmit} disabled={!listo}>
          ✓ Crear Envío
        </Btn>
        <Btn variant="secondary" onClick={onCancel}>Cancelar</Btn>
        {!listo && (
          <span style={{ fontSize: 11, color: C.gray400, marginLeft: 4 }}>
            {!form.pedido_id ? 'Falta ID de pedido' : 'Selecciona una dirección del buscador'}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Mapa Mapbox ──────────────────────────────────────────────────────────────
function MapaEnvios({ envios, envioSeleccionado, onEnvioClick, onRutaPersistida }) {
  const mapContainerRef = useRef(null)
  const mapRef          = useRef(null)
  const markersRef      = useRef([])
  const popupsRef       = useRef([])

  const initMap = useCallback(async () => {
    if (mapRef.current || !mapContainerRef.current) return
    let mapboxgl
    try {
      const mod = await import('mapbox-gl')
      mapboxgl = mod.default
      await import('mapbox-gl/dist/mapbox-gl.css')
    } catch {
      mapboxgl = window.mapboxgl
      if (!mapboxgl) return
    }
    mapboxgl.accessToken = MAPBOX_TOKEN
    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style:     'mapbox://styles/mapbox/light-v11',
      center:    [BODEGA_CENTRAL.lon, BODEGA_CENTRAL.lat],
      zoom:      11,
      attributionControl: false,
    })
    mapRef.current.addControl(new mapboxgl.NavigationControl(), 'top-right')
    mapRef.current.addControl(
      new mapboxgl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true }),
      'top-right'
    )
    const el = document.createElement('div')
    el.className = 'envio-marker'
    el.style.background = C.brandDark
    el.innerHTML = '🏭'
    new mapboxgl.Marker({ element: el, anchor: 'center' })
      .setLngLat([BODEGA_CENTRAL.lon, BODEGA_CENTRAL.lat])
      .setPopup(new mapboxgl.Popup({ offset: 20, className: 'map-popup' }).setHTML(
        `<div style="font-size:13px;font-weight:700;color:${C.gray800}">${BODEGA_CENTRAL.nombre}</div>
         <div style="font-size:11px;color:${C.gray500};margin-top:2px">Punto de origen</div>`
      ))
      .addTo(mapRef.current)
  }, [])

  const renderEnvios = useCallback(async () => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return
    let mapboxgl
    try { mapboxgl = (await import('mapbox-gl')).default }
    catch { mapboxgl = window.mapboxgl; if (!mapboxgl) return }

    markersRef.current.forEach(m => m.remove())
    markersRef.current = []
    popupsRef.current.forEach(p => p.remove())
    popupsRef.current = []

    const existingLayers = map.getStyle()?.layers?.map(l => l.id) || []
    existingLayers.filter(id => id.startsWith('route-') || id.startsWith('route-outline-'))
      .forEach(id => { try { map.removeLayer(id) } catch {} })
    Object.keys(map.getStyle()?.sources || {}).filter(id => id.startsWith('route-src-'))
      .forEach(id => { try { map.removeSource(id) } catch {} })

    const bounds = new mapboxgl.LngLatBounds()
    bounds.extend([BODEGA_CENTRAL.lon, BODEGA_CENTRAL.lat])

    for (let i = 0; i < envios.length; i++) {
      const envio = envios[i]
      const color = ROUTE_COLORS[i % ROUTE_COLORS.length]
      const isSelected = envioSeleccionado?.id === envio.id
      const destLon = parseFloat(envio.destino_lon)
      const destLat = parseFloat(envio.destino_lat)
      if (isNaN(destLon) || isNaN(destLat)) continue
      bounds.extend([destLon, destLat])

      const el = document.createElement('div')
      el.className = 'envio-marker'
      el.style.background = color
      el.style.width  = isSelected ? '38px' : '32px'
      el.style.height = isSelected ? '38px' : '32px'
      el.style.border = isSelected ? `3px solid ${C.gray800}` : '3px solid #fff'
      el.innerHTML = `${ESTADO_ENVIO[envio.estado]?.icon || '📦'}
        ${envio.estado === 'EN_RUTA' ? `<div class="ripple-ring" style="color:${color}"></div>` : ''}`

      const popup = new mapboxgl.Popup({ offset: 24, className: 'map-popup' }).setHTML(`
        <div style="min-width:200px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            <span style="font-size:18px">${ESTADO_ENVIO[envio.estado]?.icon || '📦'}</span>
            <div>
              <div style="font-size:13px;font-weight:700;color:${C.gray800}">Envío #${envio.id}</div>
              <div style="font-size:11px;color:${C.gray500}">Pedido #${envio.pedido_id}</div>
            </div>
          </div>
          <div style="font-size:12px;color:${C.gray700};margin-bottom:4px">📍 <strong>${envio.destino_nombre}</strong></div>
          ${envio.distancia_km ? `<div style="font-size:11px;color:${C.gray500}">🛣 ${envio.distancia_km} km · ⏱ ${envio.duracion_min} min</div>` : ''}
          ${envio.conductor_nombre ? `<div style="font-size:11px;color:${C.gray500};margin-top:4px">👤 ${envio.conductor_nombre}</div>` : ''}
          <div style="margin-top:8px;padding:4px 10px;border-radius:20px;display:inline-block;
            background:${(ESTADO_ENVIO[envio.estado]?.color||C.gray500)+'18'};
            color:${ESTADO_ENVIO[envio.estado]?.color||C.gray500};
            font-size:11px;font-weight:700;border:1px solid ${(ESTADO_ENVIO[envio.estado]?.color||C.gray500)+'30'}">
            ${ESTADO_ENVIO[envio.estado]?.label || envio.estado}
          </div>
        </div>
      `)
      popupsRef.current.push(popup)
      const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([destLon, destLat]).setPopup(popup).addTo(map)
      el.addEventListener('click', () => onEnvioClick(envio))
      markersRef.current.push(marker)

      if (Array.isArray(envio.paradas)) {
        for (const parada of envio.paradas) {
          const pLon = parseFloat(parada.lon), pLat = parseFloat(parada.lat)
          if (isNaN(pLon) || isNaN(pLat)) continue
          bounds.extend([pLon, pLat])
          const pEl = document.createElement('div')
          pEl.style.cssText = `width:22px;height:22px;border-radius:50%;background:${color};border:2px solid #fff;
            box-shadow:0 2px 6px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;font-size:10px;cursor:pointer;`
          pEl.innerHTML = parada.orden
          const pMarker = new mapboxgl.Marker({ element: pEl, anchor: 'center' })
            .setLngLat([pLon, pLat])
            .setPopup(new mapboxgl.Popup({ offset: 16, className: 'map-popup' }).setHTML(`
              <div style="font-size:12px;font-weight:700;color:${C.gray800}">Parada ${parada.orden}</div>
              <div style="font-size:11px;color:${C.gray500}">${parada.nombre}</div>
              <div style="font-size:11px;color:${C.gray400}">${parada.direccion}</div>
            `)).addTo(map)
          markersRef.current.push(pMarker)
        }
      }

      const posLon = parseFloat(envio.pos_lon), posLat = parseFloat(envio.pos_lat)
      if (!isNaN(posLon) && !isNaN(posLat) && envio.estado === 'EN_RUTA') {
        bounds.extend([posLon, posLat])
        const cEl = document.createElement('div')
        cEl.style.cssText = `width:36px;height:36px;border-radius:50%;background:${C.warning};border:3px solid #fff;
          box-shadow:0 3px 10px rgba(245,158,11,.5);display:flex;align-items:center;justify-content:center;font-size:18px;`
        cEl.innerHTML = '🚚'
        markersRef.current.push(new mapboxgl.Marker({ element: cEl, anchor: 'center' }).setLngLat([posLon, posLat]).addTo(map))
      }

      if (envio.ruta_geojson) {
        const srcId = `route-src-${envio.id}`, layerId = `route-${envio.id}`, outId = `route-outline-${envio.id}`
        if (!map.getSource(srcId)) map.addSource(srcId, { type: 'geojson', data: { type: 'Feature', geometry: envio.ruta_geojson } })
        if (!map.getLayer(outId))  map.addLayer({ id: outId,   type: 'line', source: srcId, layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#ffffff', 'line-width': isSelected ? 9 : 7, 'line-opacity': .6 } })
        if (!map.getLayer(layerId)) map.addLayer({ id: layerId, type: 'line', source: srcId, layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': color, 'line-width': isSelected ? 5 : 3, 'line-opacity': isSelected ? 1 : .7, 'line-dasharray': envio.estado === 'PENDIENTE' ? [2,2] : [1] } })
      } else if (MAPBOX_TOKEN) {
        fetchAndDrawRoute(map, mapboxgl, envio, i, color, isSelected, onRutaPersistida)
      } else {
        const lineId = `route-src-${envio.id}`, layerId = `route-${envio.id}`
        const oriLon = parseFloat(envio.origen_lon), oriLat = parseFloat(envio.origen_lat)
        if (!map.getSource(lineId)) map.addSource(lineId, { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [[oriLon, oriLat],[destLon, destLat]] } } })
        if (!map.getLayer(layerId)) map.addLayer({ id: layerId, type: 'line', source: lineId, layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': color, 'line-width': 2, 'line-dasharray': [3,2], 'line-opacity': .6 } })
      }
    }

    if (!bounds.isEmpty() && envios.length > 0) {
      map.fitBounds(bounds, { padding: 80, maxZoom: 14, duration: 800 })
    }
  }, [envios, envioSeleccionado, onEnvioClick, onRutaPersistida])

  async function fetchAndDrawRoute(map, mapboxgl, envio, idx, color, isSelected, onRutaPersistida) {
    try {
      const oriLon = parseFloat(envio.origen_lon), oriLat = parseFloat(envio.origen_lat)
      const dstLon = parseFloat(envio.destino_lon), dstLat = parseFloat(envio.destino_lat)
      let waypoints = `${oriLon},${oriLat}`
      if (Array.isArray(envio.paradas) && envio.paradas.length > 0)
        envio.paradas.forEach(p => { waypoints += `;${parseFloat(p.lon)},${parseFloat(p.lat)}` })
      waypoints += `;${dstLon},${dstLat}`
      const url  = `https://api.mapbox.com/directions/v5/mapbox/driving/${waypoints}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`
      const data = await (await fetch(url)).json()
      if (!data.routes?.length) return
      const route = data.routes[0]
      const geojson = route.geometry
      const distanciaKm = (route.distance / 1000).toFixed(2)
      const duracionMin = Math.round(route.duration / 60)
      if (onRutaPersistida) onRutaPersistida(envio.id, { ruta_geojson: geojson, distancia_km: distanciaKm, duracion_min: duracionMin })
      const srcId = `route-src-${envio.id}`, outId = `route-outline-${envio.id}`, layerId = `route-${envio.id}`
      if (map.getSource(srcId)) map.getSource(srcId).setData({ type: 'Feature', geometry: geojson })
      else map.addSource(srcId, { type: 'geojson', data: { type: 'Feature', geometry: geojson } })
      if (!map.getLayer(outId))  map.addLayer({ id: outId,   type: 'line', source: srcId, layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#ffffff', 'line-width': isSelected ? 9 : 7, 'line-opacity': .6 } })
      if (!map.getLayer(layerId)) map.addLayer({ id: layerId, type: 'line', source: srcId, layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': color, 'line-width': isSelected ? 5 : 3, 'line-dasharray': envio.estado === 'PENDIENTE' ? [2,2] : [1] } })
    } catch (e) { console.warn('Error calculando ruta Mapbox:', e) }
  }

  useEffect(() => { injectStyles(); initMap() }, [initMap])
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (map.isStyleLoaded()) renderEnvios()
    else map.once('load', renderEnvios)
  }, [renderEnvios])
  useEffect(() => {
    if (!envioSeleccionado || !mapRef.current) return
    const lon = parseFloat(envioSeleccionado.destino_lon)
    const lat = parseFloat(envioSeleccionado.destino_lat)
    if (!isNaN(lon) && !isNaN(lat)) mapRef.current.flyTo({ center: [lon, lat], zoom: 13, duration: 800 })
  }, [envioSeleccionado])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: 16, overflow: 'hidden' }}>
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
      <div style={{
        position: 'absolute', bottom: 16, left: 16, zIndex: 10,
        background: 'rgba(255,255,255,.92)', backdropFilter: 'blur(8px)',
        borderRadius: 10, padding: '10px 14px', border: `1px solid ${C.gray200}`, fontSize: 12,
      }}>
        <div style={{ fontWeight: 700, color: C.gray700, marginBottom: 6, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.5px' }}>Leyenda</div>
        {Object.entries(ESTADO_ENVIO).map(([k, v]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <span style={{ fontSize: 14 }}>{v.icon}</span>
            <span style={{ color: v.color, fontWeight: 600 }}>{v.label}</span>
          </div>
        ))}
        <div style={{ borderTop: `1px solid ${C.gray200}`, marginTop: 6, paddingTop: 6, color: C.gray500, fontSize: 10 }}>
          🏭 Bodega Central
        </div>
      </div>
      {!MAPBOX_TOKEN && (
        <div style={{
          position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
          background: C.warning + 'ee', borderRadius: 8, padding: '8px 16px',
          fontSize: 12, fontWeight: 600, color: '#7c2d12', zIndex: 20, border: `1px solid ${C.warning}`,
        }}>
          ⚠️ Configura VITE_MAPBOX_TOKEN en .env.local
        </div>
      )}
    </div>
  )
}

// ─── Tarjeta de envío ─────────────────────────────────────────────────────────
function EnvioCard({ envio, seleccionado, onSelect, onEstado, onDelete }) {
  const est  = ESTADO_ENVIO[envio.estado] || { color: C.gray500, icon: '📦', label: envio.estado }
  const tipo = TIPO_ENVIO[envio.tipo]     || { color: C.brand, label: envio.tipo }
  const color = ROUTE_COLORS[envio.id % ROUTE_COLORS.length]

  return (
    <div
      className={`envio-card${seleccionado ? ' selected' : ''}`}
      onClick={() => onSelect(envio)}
      style={{
        background: C.white, borderRadius: 12,
        border: `1.5px solid ${seleccionado ? C.brand : C.gray200}`,
        borderLeft: `4px solid ${color}`,
        padding: '14px 14px 12px', cursor: 'pointer', marginBottom: 8,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <span style={{ fontSize: 13, fontWeight: 800, color: C.gray800 }}>Envío #{envio.id}</span>
          <span style={{ fontSize: 11, color: C.gray400, marginLeft: 6 }}>Pedido #{envio.pedido_id}</span>
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <Badge color={tipo.color} small>{tipo.label}</Badge>
          <span style={{ fontSize: 16 }}>{est.icon}</span>
        </div>
      </div>
      <div style={{ fontSize: 12, marginBottom: 6 }}>
        <span style={{ color: C.gray400 }}>📍</span>{' '}
        <strong style={{ color: C.gray700 }}>{envio.destino_nombre}</strong>
      </div>
      {(envio.distancia_km || envio.duracion_min) && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 6 }}>
          {envio.distancia_km && <span style={{ fontSize: 11, color: C.gray500 }}>🛣 {parseFloat(envio.distancia_km).toFixed(1)} km</span>}
          {envio.duracion_min && <span style={{ fontSize: 11, color: C.gray500 }}>⏱ {envio.duracion_min} min</span>}
        </div>
      )}
      {envio.conductor_nombre && (
        <div style={{ fontSize: 11, color: C.gray500, marginBottom: 6 }}>
          👤 {envio.conductor_nombre}{envio.conductor_tel && <span style={{ marginLeft: 6 }}>· {envio.conductor_tel}</span>}
        </div>
      )}
      {Array.isArray(envio.paradas) && envio.paradas.length > 0 && (
        <div style={{ fontSize: 11, color: C.gray400, marginBottom: 6 }}>
          🗺 {envio.paradas.length} parada{envio.paradas.length > 1 ? 's' : ''}
        </div>
      )}
      {seleccionado && (
        <div style={{ borderTop: `1px solid ${C.gray100}`, paddingTop: 10, marginTop: 4, display: 'flex', gap: 6, flexWrap: 'wrap' }}
          onClick={e => e.stopPropagation()}>
          <select value={envio.estado} onChange={e => onEstado(envio.id, e.target.value)} style={{
            border: `1.5px solid ${est.color}40`, borderRadius: 7, padding: '4px 8px',
            fontSize: 11, fontWeight: 600, color: est.color, background: est.color + '10',
            outline: 'none', cursor: 'pointer', fontFamily: 'inherit',
          }}>
            {Object.entries(ESTADO_ENVIO).map(([k, v]) => (
              <option key={k} value={k}>{v.icon} {v.label}</option>
            ))}
          </select>
          <Btn small variant="danger" onClick={() => onDelete(envio.id)}>🗑</Btn>
        </div>
      )}
    </div>
  )
}

// ─── Stats bar ────────────────────────────────────────────────────────────────
function StatsBar({ envios }) {
  const counts = envios.reduce((acc, e) => { acc[e.estado] = (acc[e.estado] || 0) + 1; return acc }, {})
  const stats = [
    { label: 'Total',       value: envios.length,          color: C.brand,   icon: '🗺️' },
    { label: 'Pendientes',  value: counts.PENDIENTE || 0,  color: C.warning, icon: '⏳' },
    { label: 'En ruta',     value: counts.EN_RUTA   || 0,  color: C.info,    icon: '🚚' },
    { label: 'Completados', value: counts.COMPLETADO || 0, color: C.success, icon: '✅' },
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
      {stats.map((s, i) => (
        <div key={s.label} style={{
          background: C.white, borderRadius: 10, padding: '10px 12px',
          border: `1px solid ${C.gray200}`, borderTop: `3px solid ${s.color}`,
          animation: `fadeUp .35s ease ${i * .07}s both`,
        }}>
          <div style={{ fontSize: 18 }}>{s.icon}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.gray800, lineHeight: 1 }}>{s.value}</div>
          <div style={{ fontSize: 10, color: C.gray400, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px' }}>{s.label}</div>
        </div>
      ))}
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function Envios() {
  const { envios, conductores, loading, error, createEnvio, updateEstado, persistirRuta, deleteEnvio } = useEnvios()
  const [envioSeleccionado, setEnvioSeleccionado] = useState(null)
  const [showForm,          setShowForm]          = useState(false)
  const [filtro,            setFiltro]            = useState('TODOS')
  const [search,            setSearch]            = useState('')

  injectStyles()

  const enviosFiltrados = envios
    .filter(e => filtro === 'TODOS' || e.estado === filtro)
    .filter(e =>
      e.destino_nombre?.toLowerCase().includes(search.toLowerCase()) ||
      String(e.pedido_id).includes(search) ||
      String(e.id).includes(search)
    )

  const handleCreateEnvio = async (data) => {
    const res = await createEnvio(data)
    if (res.ok) setShowForm(false)
  }

  const handleRutaPersistida = useCallback(async (id, rutaData) => {
    await persistirRuta(id, rutaData)
  }, [persistirRuta])

  return (
    <div style={{ display: 'flex', height: '100vh', background: C.bg, overflow: 'hidden' }}>

      {/* ── Panel lateral ── */}
      <div style={{
        width: 380, minWidth: 340, background: C.bg,
        display: 'flex', flexDirection: 'column',
        borderRight: `1px solid ${C.gray200}`, overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 20px 12px', borderBottom: `1px solid ${C.gray200}`, background: C.white }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.gray800 }}>🗺️ Envíos</h1>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: C.gray500 }}>
                {envios.length} envíos · {envios.filter(e => e.estado === 'EN_RUTA').length} en ruta
              </p>
            </div>
            <Btn small onClick={() => setShowForm(v => !v)}>
              {showForm ? '✕ Cerrar' : '＋ Nuevo'}
            </Btn>
          </div>
          <input
            placeholder="🔍 Buscar por destino o ID..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', boxSizing: 'border-box',
              border: `1.5px solid ${C.gray200}`, borderRadius: 8,
              padding: '8px 12px', fontSize: 13, fontFamily: 'inherit',
              outline: 'none', color: C.gray800,
            }}
          />
        </div>

        {/* Filtros */}
        <div style={{ padding: '10px 12px', background: C.white, borderBottom: `1px solid ${C.gray200}`, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {['TODOS', ...Object.keys(ESTADO_ENVIO)].map(k => {
            const est   = ESTADO_ENVIO[k]
            const count = k === 'TODOS' ? envios.length : envios.filter(e => e.estado === k).length
            const active = filtro === k
            return (
              <button key={k} onClick={() => setFiltro(k)} style={{
                padding: '4px 10px', borderRadius: 20, cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 11, fontWeight: 700,
                background: active ? (est?.color || C.brand) : C.white,
                color: active ? '#fff' : (est?.color || C.gray700),
                border: `1.5px solid ${est?.color || C.brand}`,
                transition: 'all .15s',
              }}>
                {est?.icon || '📋'} {k === 'TODOS' ? 'Todos' : est?.label} ({count})
              </button>
            )
          })}
        </div>

        {/* Contenido scrollable */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 20px' }}>
          <StatsBar envios={envios} />

          {showForm && (
            <NuevoEnvioForm
              conductores={conductores}
              onSubmit={handleCreateEnvio}
              onCancel={() => setShowForm(false)}
            />
          )}

          {error && (
            <div style={{
              background: C.error + '12', border: `1px solid ${C.error}30`,
              borderRadius: 10, padding: '10px 14px', marginBottom: 12,
              color: C.error, fontSize: 13, fontWeight: 600,
            }}>⚠️ {error}</div>
          )}

          {loading && (
            <div style={{ textAlign: 'center', padding: 24, color: C.gray400 }}>
              <div style={{ width: 28, height: 28, border: `3px solid ${C.gray200}`, borderTopColor: C.brand, borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 8px' }} />
              <span style={{ fontSize: 13 }}>Cargando envíos...</span>
            </div>
          )}

          {!loading && enviosFiltrados.map(envio => (
            <EnvioCard
              key={envio.id}
              envio={envio}
              seleccionado={envioSeleccionado?.id === envio.id}
              conductores={conductores}
              onSelect={e => setEnvioSeleccionado(prev => prev?.id === e.id ? null : e)}
              onEstado={updateEstado}
              onDelete={deleteEnvio}
            />
          ))}

          {!loading && enviosFiltrados.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: C.gray400 }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🗺️</div>
              <p style={{ fontSize: 13 }}>No hay envíos{filtro !== 'TODOS' ? ` con estado "${ESTADO_ENVIO[filtro]?.label}"` : ''}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Mapa ── */}
      <div style={{ flex: 1, position: 'relative' }}>
        <MapaEnvios
          envios={enviosFiltrados}
          envioSeleccionado={envioSeleccionado}
          onEnvioClick={e => setEnvioSeleccionado(prev => prev?.id === e.id ? null : e)}
          onRutaPersistida={handleRutaPersistida}
        />
        <div style={{
          position: 'absolute', top: 16, right: 16, zIndex: 20,
          background: 'rgba(255,255,255,.92)', backdropFilter: 'blur(8px)',
          borderRadius: 8, padding: '6px 12px', border: `1px solid ${C.gray200}`,
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 12, fontWeight: 600, color: C.gray700,
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: envios.some(e => e.estado === 'EN_RUTA') ? C.success : C.gray300,
            animation: envios.some(e => e.estado === 'EN_RUTA') ? 'pulse 2s infinite' : 'none',
          }} />
          {envios.some(e => e.estado === 'EN_RUTA') ? 'Seguimiento activo · ↺ 15s' : 'Sin envíos en ruta'}
        </div>
      </div>
    </div>
  )
}