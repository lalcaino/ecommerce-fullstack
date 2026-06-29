import { useState, useEffect, useRef } from 'react'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || ''

const C = {
  brand: '#408A71', gray100: '#f3f4f6', gray200: '#e5e7eb',
  gray400: '#9ca3af', gray500: '#6b7280', gray800: '#1f2937',
  success: '#10b981',
}

export default function GeocoderInput({ value, onChange, onSelect, placeholder }) {
  const [query, setQuery] = useState(value || '')
  const [sugerencias, setSugerencias] = useState([])
  const [buscando, setBuscando] = useState(false)
  const [mostrar, setMostrar] = useState(false)
  const debounceRef = useRef(null)
  const wrapperRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setMostrar(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleChange = (e) => {
    const val = e.target.value
    setQuery(val)
    onChange(val)
    setSugerencias([])
    setMostrar(false)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (val.length < 3 || !MAPBOX_TOKEN) return
    debounceRef.current = setTimeout(async () => {
      setBuscando(true)
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(val)}.json` +
          `?access_token=${MAPBOX_TOKEN}&country=cl&language=es&limit=5&types=address,place,locality`
        const res = await fetch(url)
        const data = await res.json()
        setSugerencias(data.features || [])
        setMostrar(true)
      } catch { setSugerencias([]) }
      finally { setBuscando(false) }
    }, 380)
  }

  const handleSelect = (feature) => {
    const [lon, lat] = feature.center
    const nombre = feature.place_name
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
          type="text" value={query} onChange={handleChange}
          onFocus={() => sugerencias.length > 0 && setMostrar(true)}
          placeholder={placeholder || 'Escribe una dirección...'}
          style={{
            width: '100%', boxSizing: 'border-box',
            border: `1.5px solid ${listo ? C.success : C.gray200}`,
            borderRadius: 8, padding: '8px 36px 8px 10px',
            fontSize: 13, fontFamily: 'inherit', outline: 'none', color: C.gray800,
          }}
        />
        <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)' }}>
          {buscando ? (
            <div style={{ width: 13, height: 13, border: `2px solid ${C.gray200}`, borderTopColor: C.brand, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          ) : listo ? (
            <span style={{ color: C.success, fontSize: 13 }}>✓</span>
          ) : (
            <span style={{ color: C.gray400, fontSize: 13 }}>📍</span>
          )}
        </div>
      </div>

      {!MAPBOX_TOKEN && (
        <p style={{ fontSize: 11, color: C.gray400, margin: '3px 0 0' }}>
          Configura VITE_MAPBOX_TOKEN para autocompletar direcciones
        </p>
      )}

      {mostrar && sugerencias.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          zIndex: 9999, background: '#fff', border: `1px solid ${C.gray200}`,
          borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', overflow: 'hidden',
        }}>
          {sugerencias.map((f) => (
            <div key={f.id} className="geocoder-sug"
              onMouseDown={() => handleSelect(f)}
              style={{ padding: '10px 14px', cursor: 'pointer', fontSize: 13, borderBottom: `1px solid ${C.gray100}` }}
            >
              <div style={{ fontWeight: 600, color: C.gray800, marginBottom: 2 }}>📍 {f.text}</div>
              <div style={{ fontSize: 11, color: C.gray400 }}>{f.place_name}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
