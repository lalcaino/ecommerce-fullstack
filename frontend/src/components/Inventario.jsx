/**
 * Inventario.jsx - CRUD de productos (rediseñado)
 * Mantiene useInventario hook y Factory Method pattern original.
 */
import { useState } from 'react'
import { useInventario } from '../hooks/useInventario'
import { FiImage, FiEdit2, FiTrash2 } from 'react-icons/fi'

const C = {
  brand: '#408A71', brandLight: '#e8f5f0',
  white: '#ffffff', bg: '#f4f7f6',
  gray100: '#f3f4f6', gray200: '#e5e7eb', gray400: '#9ca3af',
  gray500: '#6b7280', gray700: '#374151', gray800: '#1f2937',
  success: '#10b981', warning: '#f59e0b', error: '#ef4444', info: '#3b82f6',
}

// ─── Factory Method original preservado ─────────────────────────────────────
function ProductoFactory(tipo) {
  const base = { nombre: '', descripcion: '', precio: '', stock: 0 }
  const tipos = {
    FISICO:   { ...base, tipo: 'FISICO',   peso_kg: 0 },
    DIGITAL:  { ...base, tipo: 'DIGITAL',  url_descarga: '' },
    SERVICIO: { ...base, tipo: 'SERVICIO', duracion_dias: 0 },
  }
  return tipos[tipo] || tipos['FISICO']
}

const TIPO_ICON = { FISICO: '', DIGITAL: '', SERVICIO: '' }

function Badge({ color, children }) {
  return (
    <span style={{
      background: color + '18', color, border: `1px solid ${color}30`,
      borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 700,
    }}>{children}</span>
  )
}

function Btn({ onClick, children, variant = 'primary', small = false }) {
  const styles = {
    primary: { background: C.brand, color: '#fff', border: 'none' },
    secondary: { background: C.gray100, color: C.gray700, border: `1px solid ${C.gray200}` },
    danger: { background: C.error + '18', color: C.error, border: `1px solid ${C.error}30` },
    success: { background: C.success + '18', color: C.success, border: `1px solid ${C.success}30` },
  }
  return (
    <button onClick={onClick} style={{
      ...styles[variant], borderRadius: 8, cursor: 'pointer',
      fontFamily: 'inherit', fontWeight: 600,
      padding: small ? '5px 12px' : '9px 18px',
      fontSize: small ? 12 : 14,
    }}>{children}</button>
  )
}

function InputField({ label, name, value, onChange, type = 'text' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: C.gray500, textTransform: 'uppercase', letterSpacing: '.5px' }}>{label}</label>
      <input
        type={type} name={name} value={value} onChange={onChange}
        style={{ border: `1.5px solid ${C.gray200}`, borderRadius: 8, padding: '8px 12px', fontSize: 14, fontFamily: 'inherit', color: C.gray800, outline: 'none', width: '100%', boxSizing: 'border-box' }}
      />
    </div>
  )
}

function NuevoItemForm({ onSubmit, onCancel }) {
  const [tipo, setTipo] = useState('FISICO')
  const [form, setForm] = useState(ProductoFactory('FISICO'))
  const [imagenFile, setImagenFile] = useState(null)

  const handleTipo = (e) => {
    setTipo(e.target.value)
    setForm(ProductoFactory(e.target.value))
  }
  const change = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }))

  const fieldLabel = { nombre: 'Nombre', descripcion: 'Descripción', precio: 'Precio ($)', stock: 'Stock', peso_kg: 'Peso (kg)', url_descarga: 'URL descarga', duracion_dias: 'Duración (días)' }

  return (
    <div style={{ background: C.white, borderRadius: 14, border: `1px solid ${C.gray200}`, padding: 24, marginBottom: 20 }}>
      <h3 style={{ margin: '0 0 18px', fontSize: 16, fontWeight: 700, color: C.gray800 }}>Nuevo Producto</h3>
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: C.gray500, textTransform: 'uppercase', letterSpacing: '.5px', display: 'block', marginBottom: 4 }}>Tipo</label>
        <select value={tipo} onChange={handleTipo} style={{ border: `1.5px solid ${C.gray200}`, borderRadius: 8, padding: '8px 12px', fontSize: 14, fontFamily: 'inherit', outline: 'none' }}>
          <option value="FISICO"> Físico</option>
          <option value="DIGITAL"> Digital</option>
          <option value="SERVICIO"> Servicio</option>
        </select>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: 12 }}>
        {Object.keys(form).filter(k => k !== 'tipo').map(k => (
          <InputField key={k} label={fieldLabel[k] || k} name={k} value={form[k]} onChange={change}
            type={['precio','stock','peso_kg','duracion_dias'].includes(k) ? 'number' : 'text'}
          />
        ))}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: C.gray500, textTransform: 'uppercase', letterSpacing: '.5px' }}>Imagen (opcional)</label>
          <input type="file" accept="image/*" onChange={e => setImagenFile(e.target.files[0])}
            style={{ border: `1.5px solid ${C.gray200}`, borderRadius: 8, padding: '6px 12px', fontSize: 13, fontFamily: 'inherit' }}
          />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
        <Btn variant="success" onClick={() => onSubmit({ ...form, tipo }, imagenFile)}>✓ Crear Producto</Btn>
        <Btn variant="secondary" onClick={onCancel}>Cancelar</Btn>
      </div>
    </div>
  )
}

function ItemRow({ item, onUpdate, onDelete, onUploadImage }) {
  const [editMode, setEditMode] = useState(false)
  const [form, setForm] = useState({ stock: item.stock, precio: item.precio })
  const [uploading, setUploading] = useState(false)
  const low = item.stock <= item.stock_minimo

  const save = async () => {
    const res = await onUpdate(item.id, form)
    if (res.ok) setEditMode(false)
  }

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    await onUploadImage(item.id, file)
    setUploading(false)
  }

  return (
    <tr style={{ borderBottom: `1px solid ${C.gray100}` }}>
      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 12, color: C.gray500 }}>{item.id}</td>
      <td style={{ padding: '12px 16px', fontWeight: 600, color: C.gray800 }}>
        {TIPO_ICON[item.tipo] || ''} {item.nombre}
      </td>
      <td style={{ padding: '12px 16px', color: C.gray500 }}>{item.tipo}</td>
      <td style={{ padding: '12px 16px', fontWeight: 700, color: low ? C.error : C.gray800 }}>
        {editMode
          ? <input type="number" value={form.stock}
              onChange={e => setForm(p => ({ ...p, stock: +e.target.value }))}
              style={{ width: 70, border: `1.5px solid ${C.gray200}`, borderRadius: 6, padding: '4px 8px', fontFamily: 'inherit' }}
            />
          : item.stock}
      </td>
      <td style={{ padding: '12px 16px', color: C.gray700 }}>
        {editMode
          ? <input type="number" value={form.precio}
              onChange={e => setForm(p => ({ ...p, precio: e.target.value }))}
              style={{ width: 90, border: `1.5px solid ${C.gray200}`, borderRadius: 6, padding: '4px 8px', fontFamily: 'inherit' }}
            />
          : `$${parseFloat(item.precio).toLocaleString('es-CL')}`}
      </td>
      <td style={{ padding: '12px 16px' }}>
        {low ? <Badge color={C.error}>⚠ Stock bajo</Badge> : <Badge color={C.success}>✓ OK</Badge>}
      </td>
      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
        {item.imagen_url
          ? <img src={item.imagen_url} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover' }} />
          : <span style={{ color: C.gray400, fontSize: 12 }}>—</span>
        }
      </td>
      <td style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {editMode ? (
            <>
              <Btn small variant="success" onClick={save}>Guardar</Btn>
              <Btn small variant="secondary" onClick={() => setEditMode(false)}>Cancelar</Btn>
            </>
          ) : (
            <>
              <input type="file" accept="image/*" id={`img-${item.id}`} style={{ display: 'none' }} onChange={handleFile} />
              <label htmlFor={`img-${item.id}`} style={{ cursor: 'pointer' }}>
                <span style={{ background: C.info + '18', color: C.info, border: `1px solid ${C.info}30`, borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>
                  {uploading ? '...' : <FiImage size={14} />}
                </span>
              </label>
              <Btn small variant="secondary" onClick={() => setEditMode(true)}><FiEdit2 size={14} /></Btn>
              <Btn small variant="danger" onClick={() => onDelete(item.id)}><FiTrash2 size={14} /></Btn>
            </>
          )}
        </div>
      </td>
    </tr>
  )
}

export default function Inventario() {
  const { items, loading, error, createItem, updateItem, deleteItem, uploadImage } = useInventario()
  const [showForm, setShowForm] = useState(false)
  const [search,   setSearch]   = useState('')

  const filtered = items.filter(i =>
    i.nombre?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
      <p style={{ color: C.gray500, fontWeight: 600 }}> Cargando inventario...</p>
    </div>
  )

  return (
    <div style={{ padding: '28px 24px', background: C.bg, minHeight: '100vh' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: C.gray800 }}>Gestión de Inventario</h1>
            <p style={{ margin: '4px 0 0', color: C.gray500, fontSize: 14 }}>{items.length} productos registrados</p>
          </div>
          <Btn onClick={() => setShowForm(v => !v)}>
            {showForm ? '✕ Cerrar' : '＋ Nuevo Producto'}
          </Btn>
        </div>

        {error && (
          <div style={{ background: C.error + '12', border: `1px solid ${C.error}30`, borderRadius: 12, padding: '12px 16px', marginBottom: 20, color: C.error, fontSize: 14, fontWeight: 600 }}>⚠️ {error}</div>
        )}

        {showForm && (
          <NuevoItemForm
            onSubmit={async (data, file) => { const res = await createItem(data); if (res.ok) { if (file) await uploadImage(res.id, file); setShowForm(false) } }}
            onCancel={() => setShowForm(false)}
          />
        )}

        {/* Search */}
        <div style={{ marginBottom: 16 }}>
          <input
            placeholder=" Buscar producto..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ border: `1.5px solid ${C.gray200}`, borderRadius: 8, padding: '9px 14px', fontSize: 14, fontFamily: 'inherit', outline: 'none', width: 300 }}
          />
        </div>

        {/* Table */}
        <div style={{ background: C.white, borderRadius: 14, border: `1px solid ${C.gray200}`, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: C.gray100, borderBottom: `1px solid ${C.gray200}` }}>
                {['ID','Nombre','Tipo','Stock','Precio','Estado','Imagen','Acciones'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: C.gray500, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.5px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <ItemRow key={item.id} item={item} onUpdate={updateItem} onDelete={deleteItem} onUploadImage={uploadImage} />
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p style={{ textAlign: 'center', padding: 32, color: C.gray400 }}>Sin resultados</p>
          )}
        </div>
      </div>
    </div>
  )
}