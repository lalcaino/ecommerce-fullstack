/**
 * Inventario.jsx - CRUD de productos en inventario
 * Patrón: Factory Method para crear ítems con distintos tipos de producto
 */
import { useState } from 'react'
import { useInventario } from '../hooks/useInventario'

// ─── Factory Method: crea la estructura base según tipo de producto ──────────
function ProductoFactory(tipo) {
  const base = { nombre: '', descripcion: '', precio: '', stock: 0 }
  const tipos = {
    FISICO:  { ...base, tipo: 'FISICO',  peso_kg: 0 },
    DIGITAL: { ...base, tipo: 'DIGITAL', url_descarga: '' },
    SERVICIO:{ ...base, tipo: 'SERVICIO',duracion_dias: 0 },
  }
  return tipos[tipo] || tipos['FISICO']
}

function ItemRow({ item, onUpdate, onDelete }) {
  const [editMode, setEditMode] = useState(false)
  const [form, setForm]         = useState({ stock: item.stock, precio: item.precio })

  const save = async () => {
    const res = await onUpdate(item.id, form)
    if (res.ok) setEditMode(false)
  }

  return (
    <tr>
      <td>{item.id}</td>
      <td>{item.nombre}</td>
      <td>{item.tipo}</td>
      <td>
        {editMode
          ? <input type="number" value={form.stock}
              onChange={e => setForm(p => ({ ...p, stock: +e.target.value }))}
              style={{ width: 70 }} />
          : item.stock}
      </td>
      <td>
        {editMode
          ? <input type="number" value={form.precio}
              onChange={e => setForm(p => ({ ...p, precio: e.target.value }))}
              style={{ width: 90 }} />
          : `$${parseFloat(item.precio).toLocaleString('es-CL')}`}
      </td>
      <td style={{ color: item.stock <= item.stock_minimo ? '#ef4444' : '#10b981', fontWeight: 700 }}>
        {item.stock <= item.stock_minimo ? '⚠ Bajo' : 'OK'}
      </td>
      <td>
        {editMode
          ? <>
              <button onClick={save} className="btn btn-sm btn-success">Guardar</button>
              <button onClick={() => setEditMode(false)} className="btn btn-sm">Cancelar</button>
            </>
          : <>
              <button onClick={() => setEditMode(true)} className="btn btn-sm">Editar</button>
              <button onClick={() => onDelete(item.id)} className="btn btn-sm btn-danger">Eliminar</button>
            </>}
      </td>
    </tr>
  )
}

function NuevoItemForm({ onSubmit, onCancel }) {
  const [tipo, setTipo] = useState('FISICO')
  const [form, setForm] = useState(ProductoFactory('FISICO'))

  const handleTipo = (e) => {
    setTipo(e.target.value)
    setForm(ProductoFactory(e.target.value))  // Factory Method en acción
  }

  const change = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }))

  return (
    <div className="form-card">
      <h3>Nuevo Producto</h3>
      <div className="form-row">
        <label>Tipo:</label>
        <select value={tipo} onChange={handleTipo}>
          <option value="FISICO">Físico</option>
          <option value="DIGITAL">Digital</option>
          <option value="SERVICIO">Servicio</option>
        </select>
      </div>
      {Object.keys(form).filter(k => k !== 'tipo').map(k => (
        <div className="form-row" key={k}>
          <label>{k}:</label>
          <input name={k} value={form[k]} onChange={change}
            type={['precio','stock','peso_kg','duracion_dias'].includes(k) ? 'number' : 'text'} />
        </div>
      ))}
      <div style={{ marginTop: '0.75rem' }}>
        <button onClick={() => onSubmit({ ...form, tipo })} className="btn btn-success">Crear</button>
        <button onClick={onCancel} className="btn" style={{ marginLeft: '0.5rem' }}>Cancelar</button>
      </div>
    </div>
  )
}

export default function Inventario() {
  const { items, loading, error, createItem, updateItem, deleteItem } = useInventario()
  const [showForm, setShowForm] = useState(false)

  if (loading) return <div className="loading">Cargando inventario...</div>

  return (
    <div className="page">
      <div className="page-header">
        <h1>Gestión de Inventario</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(v => !v)}>
          {showForm ? 'Cerrar' : '+ Nuevo Producto'}
        </button>
      </div>

      {error && <div className="error-box">{error}</div>}

      {showForm && (
        <NuevoItemForm
          onSubmit={async (data) => {
            const res = await createItem(data)
            if (res.ok) setShowForm(false)
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      <table className="data-table">
        <thead>
          <tr>
            <th>ID</th><th>Nombre</th><th>Tipo</th><th>Stock</th><th>Precio</th><th>Estado</th><th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <ItemRow key={item.id} item={item} onUpdate={updateItem} onDelete={deleteItem} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
