import { useState, useEffect } from 'react'
import { useTiendas } from '../hooks/useTiendas'
import { BodegasRepository } from '../services/api'

const C = {
  brand: '#408A71', brandLight: '#e8f5f0',
  white: '#ffffff', bg: '#f4f7f6',
  gray100: '#f3f4f6', gray200: '#e5e7eb', gray400: '#9ca3af',
  gray500: '#6b7280', gray700: '#374151', gray800: '#1f2937',
  success: '#10b981', error: '#ef4444', warning: '#f59e0b',
}

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
  .tienda-card {
    animation: fadeInUp 0.35s ease both;
    transition: box-shadow 0.2s, transform 0.2s;
  }
  .tienda-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(64,138,113,0.15);
  }
`
if (!document.head.querySelector('#tienda-styles')) {
  style.id = 'tienda-styles'
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
    <button onClick={onClick} style={{
      ...styles[variant], borderRadius: 8, cursor: 'pointer',
      fontFamily: 'inherit', fontWeight: 600,
      padding: small ? '5px 12px' : '9px 18px',
      fontSize: small ? 12 : 14,
      transition: 'opacity 0.2s, transform 0.1s',
    }}>
      {children}
    </button>
  )
}

function TiendaCard({ tienda, bodegaNombre, onDelete, onEdit }) {
  return (
    <div className="tienda-card" style={{
      background: C.white, borderRadius: 16,
      border: `1px solid ${C.gray200}`, borderLeft: `4px solid ${C.warning}`,
      padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <span style={{ fontSize: 22 }}>🏪</span>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.gray800 }}>{tienda.nombre}</h3>
        </div>
        <p style={{ margin: '2px 0', fontSize: 13, color: C.gray500 }}>📍 {tienda.direccion}</p>
        <p style={{ margin: '2px 0', fontSize: 13, color: C.gray500 }}>
          🏙 Ciudad: <strong style={{ color: C.gray700 }}>{tienda.ciudad}</strong>
        </p>
        <p style={{ margin: '2px 0', fontSize: 13, color: C.gray500 }}>
          🏭 Bodega: <strong style={{ color: C.brand }}>{bodegaNombre || 'Sin bodega asignada'}</strong>
        </p>
        <p style={{ margin: '6px 0 0', fontSize: 12, color: C.gray400 }}>
          Pedidos asociados: <strong>{tienda.total_pedidos ?? 0}</strong>
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Btn small variant="secondary" onClick={() => onEdit(tienda)}>✏️ Editar</Btn>
        <Btn small variant="danger" onClick={() => onDelete(tienda.id)}>🗑 Eliminar</Btn>
      </div>
    </div>
  )
}

function NuevaTiendaForm({ inicial, bodegas, onSubmit, onCancel }) {
  const [form, setForm] = useState(
    inicial
      ? { nombre: inicial.nombre, direccion: inicial.direccion, ciudad: inicial.ciudad, bodega_id: inicial.bodega_id || '' }
      : { nombre: '', direccion: '', ciudad: '', bodega_id: '' }
  )
  const change = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }))

  return (
    <div style={{
      background: C.white, borderRadius: 16, border: `1px solid ${C.gray200}`,
      padding: 24, marginBottom: 20, animation: 'fadeIn 0.3s ease',
    }}>
      <h3 style={{ margin: '0 0 18px', fontSize: 16, fontWeight: 700, color: C.gray800 }}>
        {inicial ? 'Editar Tienda' : 'Nueva Tienda'}
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {[
          { name: 'nombre',    label: 'Nombre'    },
          { name: 'direccion', label: 'Dirección' },
          { name: 'ciudad',    label: 'Ciudad'    },
        ].map(({ name, label }) => (
          <div key={name} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.gray500, textTransform: 'uppercase', letterSpacing: '.5px' }}>
              {label}
            </label>
            <input
              name={name} value={form[name]} onChange={change}
              style={{
                border: `1.5px solid ${C.gray200}`, borderRadius: 8,
                padding: '8px 12px', fontSize: 14, fontFamily: 'inherit',
                color: C.gray800, outline: 'none',
              }}
            />
          </div>
        ))}

        {/* Desplegable de bodegas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: C.gray500, textTransform: 'uppercase', letterSpacing: '.5px' }}>
            Bodega asignada
          </label>
          <select
            name="bodega_id" value={form.bodega_id} onChange={change}
            style={{
              border: `1.5px solid ${C.gray200}`, borderRadius: 8,
              padding: '8px 12px', fontSize: 14, fontFamily: 'inherit',
              color: C.gray800, outline: 'none', cursor: 'pointer',
              background: C.white,
            }}
          >
            <option value="">Sin bodega asignada</option>
            {bodegas.map(b => (
              <option key={b.id} value={b.id}>
                🏭 {b.nombre} — Cap. {b.capacidad}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
        <Btn variant="success" onClick={() => onSubmit({
          ...form,
          bodega_id: form.bodega_id ? parseInt(form.bodega_id) : null,
        })}>
          ✓ {inicial ? 'Guardar' : 'Crear'}
        </Btn>
        <Btn variant="secondary" onClick={onCancel}>Cancelar</Btn>
      </div>
    </div>
  )
}

export default function Tiendas() {
  const { tiendas, loading, error, createTienda, updateTienda, deleteTienda } = useTiendas()
  const [bodegas,  setBodegas]  = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState(null)
  const [search,   setSearch]   = useState('')

  // Carga bodegas para el desplegable
  useEffect(() => {
    BodegasRepository.getAll()
      .then(data => setBodegas(data))
      .catch(() => setBodegas([]))
  }, [])

  const filtered = tiendas.filter(t =>
    t.nombre?.toLowerCase().includes(search.toLowerCase()) ||
    t.ciudad?.toLowerCase().includes(search.toLowerCase())
  )

  const getBodegaNombre = (bodega_id) => {
    const b = bodegas.find(b => b.id === bodega_id)
    return b ? b.nombre : null
  }

  const handleSubmit = async (data) => {
    if (editando) {
      const res = await updateTienda(editando.id, data)
      if (res.ok) { setEditando(null); setShowForm(false) }
    } else {
      const res = await createTienda(data)
      if (res.ok) setShowForm(false)
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
      <div style={{ textAlign: 'center', animation: 'fadeIn 0.5s ease' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🏪</div>
        <p style={{ color: C.gray500, fontWeight: 600 }}>Cargando tiendas...</p>
      </div>
    </div>
  )

  return (
    <div style={{ padding: '28px 24px', background: C.bg, minHeight: '100vh' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: C.gray800 }}>🏪 Gestión de Tiendas</h1>
            <p style={{ margin: '4px 0 0', color: C.gray500, fontSize: 14 }}>{tiendas.length} tiendas registradas</p>
          </div>
          <Btn onClick={() => { setShowForm(v => !v); setEditando(null) }}>
            {showForm ? '✕ Cerrar' : '＋ Nueva Tienda'}
          </Btn>
        </div>

        {error && (
          <div style={{
            background: C.error + '12', border: `1px solid ${C.error}30`,
            borderRadius: 12, padding: '12px 16px', marginBottom: 20,
            color: C.error, fontSize: 14, fontWeight: 600,
          }}>⚠️ {error}</div>
        )}

        {(showForm || editando) && (
          <NuevaTiendaForm
            inicial={editando}
            bodegas={bodegas}
            onSubmit={handleSubmit}
            onCancel={() => { setShowForm(false); setEditando(null) }}
          />
        )}

        <div style={{ marginBottom: 20 }}>
          <input
            placeholder="🔍 Buscar tienda o ciudad..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{
              border: `1.5px solid ${C.gray200}`, borderRadius: 8,
              padding: '9px 14px', fontSize: 14, fontFamily: 'inherit',
              outline: 'none', width: 300,
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filtered.map((t, i) => (
            <div key={t.id} style={{ animationDelay: `${i * 0.05}s` }}>
              <TiendaCard
                tienda={t}
                bodegaNombre={getBodegaNombre(t.bodega_id)}
                onDelete={deleteTienda}
                onEdit={(tienda) => { setEditando(tienda); setShowForm(false) }}
              />
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: 48, color: C.gray400 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🏪</div>
              <p>No hay tiendas registradas</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}