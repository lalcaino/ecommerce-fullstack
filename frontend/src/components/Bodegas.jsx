import { useState } from 'react'
import { useBodegas } from '../hooks/useBodegas'
import GeocoderInput from './GeocoderInput'

const C = {
  brand: '#408A71', brandLight: '#e8f5f0',
  white: '#ffffff', bg: '#f4f7f6',
  gray100: '#f3f4f6', gray200: '#e5e7eb', gray400: '#9ca3af',
  gray500: '#6b7280', gray700: '#374151', gray800: '#1f2937',
  success: '#10b981', error: '#ef4444', info: '#3b82f6',
}

// Estilos de animación globales inyectados una vez
const style = document.createElement('style')
style.textContent = `
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  .bodega-card {
    animation: fadeInUp 0.35s ease both;
    transition: box-shadow 0.2s, transform 0.2s;
  }
  .bodega-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(64,138,113,0.15);
  }
  .btn-primary { transition: background 0.2s, transform 0.1s; }
  .btn-primary:hover { background: #2e6b57 !important; transform: scale(1.03); }
  .btn-danger:hover  { opacity: 0.8; transform: scale(1.03); }
`
if (!document.head.querySelector('#bodega-styles')) {
  style.id = 'bodega-styles'
  document.head.appendChild(style)
}

function Btn({ onClick, children, variant = 'primary', small = false }) {
  const styles = {
    primary:   { background: C.brand,         color: '#fff',    border: 'none' },
    secondary: { background: C.gray100,        color: C.gray700, border: `1px solid ${C.gray200}` },
    danger:    { background: C.error + '18',   color: C.error,   border: `1px solid ${C.error}30` },
    success:   { background: C.success + '18', color: C.success, border: `1px solid ${C.success}30` },
  }
  return (
    <button
      onClick={onClick}
      className={variant === 'primary' ? 'btn-primary' : variant === 'danger' ? 'btn-danger' : ''}
      style={{
        ...styles[variant], borderRadius: 8, cursor: 'pointer',
        fontFamily: 'inherit', fontWeight: 600,
        padding: small ? '5px 12px' : '9px 18px',
        fontSize: small ? 12 : 14,
      }}
    >
      {children}
    </button>
  )
}

function BodegaCard({ bodega, onDelete, onEdit }) {
  const coords = bodega.latitud && bodega.longitud
    ? `${parseFloat(bodega.latitud).toFixed(4)}, ${parseFloat(bodega.longitud).toFixed(4)}`
    : null
  return (
    <div className="bodega-card" style={{
      background: C.white, borderRadius: 16,
      border: `1px solid ${C.gray200}`, borderLeft: `4px solid ${C.brand}`,
      padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <span style={{ fontSize: 22 }}></span>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.gray800 }}>{bodega.nombre}</h3>
        </div>
        <p style={{ margin: '2px 0', fontSize: 13, color: C.gray500 }}> {bodega.direccion}</p>
        <p style={{ margin: '2px 0', fontSize: 13, color: C.gray500 }}>
           Capacidad: <strong style={{ color: C.brand }}>{bodega.capacidad}</strong> unidades
        </p>
        <p style={{ margin: '2px 0', fontSize: 13, color: C.gray500 }}>
           Volumen: <strong style={{ color: C.info }}>{(bodega.capacidad_volumen_cm3 || 0).toLocaleString('es-CL')}</strong> cm³
        </p>
        <p style={{ margin: '2px 0', fontSize: 13, color: C.gray500 }}>
           Ocupado: <strong>{(bodega.volumen_ocupado_cm3 || 0).toLocaleString('es-CL')}</strong> cm³
           {bodega.capacidad_volumen_cm3 > 0 && (
             <span style={{ color: C.gray400 }}> ({bodega.porcentaje_ocupado || Math.round((bodega.volumen_ocupado_cm3 || 0) / bodega.capacidad_volumen_cm3 * 100)}%)</span>
           )}
        </p>
        {coords && (
          <p style={{ margin: '2px 0', fontSize: 12, color: C.gray400 }}>
           {coords}
          </p>
        )}
        <p style={{ margin: '6px 0 0', fontSize: 12, color: C.gray400 }}>
          Productos almacenados: <strong>{bodega.total_productos ?? 0}</strong>
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Btn small variant="secondary" onClick={() => onEdit(bodega)}> Editar</Btn>
        <Btn small variant="danger" onClick={() => onDelete(bodega.id)}> Eliminar</Btn>
      </div>
    </div>
  )
}

function NuevaBodegaForm({ inicial, onSubmit, onCancel }) {
  const [form, setForm] = useState(inicial
    ? { nombre: inicial.nombre, direccion: inicial.direccion || '', capacidad: inicial.capacidad || 0,
        capacidad_volumen_cm3: inicial.capacidad_volumen_cm3 || 0,
        latitud: inicial.latitud || '', longitud: inicial.longitud || '' }
    : { nombre: '', direccion: '', capacidad: 0, capacidad_volumen_cm3: 0, latitud: '', longitud: '' }
  )
  const [direccionTexto, setDireccionTexto] = useState(inicial?.direccion || '')
  const change = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }))

  const handleDireccionSelect = ({ nombre, lat, lon }) => {
    setDireccionTexto(nombre)
    setForm(p => ({ ...p, direccion: nombre, latitud: lat, longitud: lon }))
  }

  const handleDireccionChange = (val) => {
    setDireccionTexto(val)
    setForm(p => ({ ...p, direccion: val }))
  }

  const labelStyle = { fontSize: 11, fontWeight: 700, color: C.gray500, textTransform: 'uppercase', letterSpacing: '.5px' }
  const inputStyle = {
    border: `1.5px solid ${C.gray200}`, borderRadius: 8,
    padding: '8px 12px', fontSize: 14, fontFamily: 'inherit',
    color: C.gray800, outline: 'none', width: '100%', boxSizing: 'border-box',
  }

  return (
    <div style={{
      background: C.white, borderRadius: 16, border: `1px solid ${C.gray200}`,
      padding: 24, marginBottom: 20, animation: 'fadeIn 0.3s ease',
    }}>
      <h3 style={{ margin: '0 0 18px', fontSize: 16, fontWeight: 700, color: C.gray800 }}>
        {inicial ? 'Editar Bodega' : 'Nueva Bodega'}
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={labelStyle}>Nombre</label>
          <input name="nombre" value={form.nombre} onChange={change} style={inputStyle} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={labelStyle}>Capacidad (unidades)</label>
          <input type="number" name="capacidad" value={form.capacidad} onChange={change} style={inputStyle} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={labelStyle}>Capacidad volumen (cm³)</label>
          <input type="number" name="capacidad_volumen_cm3" value={form.capacidad_volumen_cm3} onChange={change} style={inputStyle} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={labelStyle}>Latitud</label>
          <input name="latitud" value={form.latitud} onChange={change} placeholder="Ej: -33.4567" style={inputStyle} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={labelStyle}>Longitud</label>
          <input name="longitud" value={form.longitud} onChange={change} placeholder="Ej: -70.6543" style={inputStyle} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, gridColumn: 'span 2' }}>
          <label style={labelStyle}>Dirección</label>
          <GeocoderInput
            value={direccionTexto}
            onChange={handleDireccionChange}
            onSelect={handleDireccionSelect}
            placeholder="Ej: Av. Providencia 1234, Santiago"
          />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
        <Btn variant="success" onClick={() => onSubmit({
          ...form,
          latitud: form.latitud ? parseFloat(form.latitud) : null,
          longitud: form.longitud ? parseFloat(form.longitud) : null,
          capacidad: parseInt(form.capacidad) || 0,
          capacidad_volumen_cm3: parseFloat(form.capacidad_volumen_cm3) || 0,
        })}>✓ {inicial ? 'Guardar' : 'Crear'}</Btn>
        <Btn variant="secondary" onClick={onCancel}>Cancelar</Btn>
      </div>
    </div>
  )
}

export default function Bodegas() {
  const { bodegas, loading, error, createBodega, updateBodega, deleteBodega } = useBodegas()
  const [showForm,   setShowForm]   = useState(false)
  const [editando,   setEditando]   = useState(null)
  const [search,     setSearch]     = useState('')

  const filtered = bodegas.filter(b =>
    b.nombre?.toLowerCase().includes(search.toLowerCase())
  )

  const handleSubmit = async (data) => {
    if (editando) {
      const res = await updateBodega(editando.id, data)
      if (res.ok) { setEditando(null); setShowForm(false) }
    } else {
      const res = await createBodega(data)
      if (res.ok) setShowForm(false)
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
      <div style={{ textAlign: 'center', animation: 'fadeIn 0.5s ease' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}></div>
        <p style={{ color: C.gray500, fontWeight: 600 }}>Cargando bodegas...</p>
      </div>
    </div>
  )

  return (
    <div style={{ padding: '28px 24px', background: C.bg, minHeight: '100vh' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: C.gray800 }}>
               Gestión de Bodegas
            </h1>
            <p style={{ margin: '4px 0 0', color: C.gray500, fontSize: 14 }}>
              {bodegas.length} bodegas registradas
            </p>
          </div>
          <Btn onClick={() => { setShowForm(v => !v); setEditando(null) }}>
            {showForm ? '✕ Cerrar' : '＋ Nueva Bodega'}
          </Btn>
        </div>

        {error && (
          <div style={{
            background: C.error + '12', border: `1px solid ${C.error}30`,
            borderRadius: 12, padding: '12px 16px', marginBottom: 20,
            color: C.error, fontSize: 14, fontWeight: 600,
          }}>
             {error}
          </div>
        )}

        {(showForm || editando) && (
          <NuevaBodegaForm
            inicial={editando}
            onSubmit={handleSubmit}
            onCancel={() => { setShowForm(false); setEditando(null) }}
          />
        )}

        {/* Buscador */}
        <div style={{ marginBottom: 20 }}>
          <input
            placeholder=" Buscar bodega..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{
              border: `1.5px solid ${C.gray200}`, borderRadius: 8,
              padding: '9px 14px', fontSize: 14, fontFamily: 'inherit',
              outline: 'none', width: 280,
            }}
          />
        </div>

        {/* Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filtered.map((b, i) => (
            <div key={b.id} style={{ animationDelay: `${i * 0.05}s` }}>
              <BodegaCard
                bodega={b}
                onDelete={deleteBodega}
                onEdit={(bodega) => { setEditando(bodega); setShowForm(false) }}
              />
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: 48, color: C.gray400 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}></div>
              <p>No hay bodegas registradas</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}