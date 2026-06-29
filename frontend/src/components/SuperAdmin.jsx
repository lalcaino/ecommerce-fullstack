import { useState, useEffect } from 'react'
import { getToken } from '../services/authService'

const C = {
  brand: '#408A71', brandLight: '#e8f5f0',
  white: '#ffffff', bg: '#f4f7f6',
  gray100: '#f3f4f6', gray200: '#e5e7eb', gray400: '#9ca3af',
  gray500: '#6b7280', gray700: '#374151', gray800: '#1f2937',
  success: '#10b981', error: '#ef4444', warning: '#f59e0b',
}

const API = 'http://localhost:8000/api/auth/superadmin/empresas'

async function fetchEmpresas() {
  const res = await fetch(API, {
    headers: { Authorization: `Bearer ${getToken()}` },
  })
  if (!res.ok) throw new Error('Error al cargar empresas')
  return res.json()
}

async function toggleEmpresa(id, activo) {
  const res = await fetch(`${API}/${id}/`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ activo }),
  })
  if (!res.ok) throw new Error('Error al actualizar empresa')
  return res.json()
}

export default function SuperAdmin() {
  const [empresas, setEmpresas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchEmpresas()
      setEmpresas(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleToggle = async (id, activo) => {
    try {
      await toggleEmpresa(id, !activo)
      setEmpresas(prev => prev.map(e => e.id === id ? { ...e, activo: !activo } : e))
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
      <p style={{ color: C.gray500, fontWeight: 600 }}>Cargando empresas...</p>
    </div>
  )

  return (
    <div style={{ padding: '28px 24px', background: C.bg, minHeight: '100vh' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: C.gray800 }}> Panel SuperAdmin</h1>
            <p style={{ margin: '4px 0 0', color: C.gray500, fontSize: 14 }}>{empresas.length} empresas registradas</p>
          </div>
          <button onClick={load} style={{
            background: C.brand, color: '#fff', border: 'none',
            borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}> Recargar</button>
        </div>

        {error && (
          <div style={{ background: C.error + '12', border: `1px solid ${C.error}30`, borderRadius: 12, padding: '12px 16px', marginBottom: 20, color: C.error, fontSize: 14, fontWeight: 600 }}>
             {error}
          </div>
        )}

        <div style={{ background: C.white, borderRadius: 14, border: `1px solid ${C.gray200}`, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: C.gray100, borderBottom: `1px solid ${C.gray200}` }}>
                {['ID', 'RUT', 'Razón Social', 'Nombre Comercial', 'Giro', 'Región', 'Admin', 'Activo', 'Acción'].map(h => (
                  <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontWeight: 700, color: C.gray500, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.5px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {empresas.map((e, i) => (
                <tr key={e.id} style={{ borderBottom: i < empresas.length - 1 ? `1px solid ${C.gray100}` : 'none' }}>
                  <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: 12, color: C.brand, fontWeight: 700 }}>#{e.id}</td>
                  <td style={{ padding: '12px 14px', fontWeight: 600, color: C.gray800 }}>{e.rut}</td>
                  <td style={{ padding: '12px 14px', color: C.gray800 }}>{e.razon_social}</td>
                  <td style={{ padding: '12px 14px', color: C.gray500 }}>{e.nombre_comercial || '—'}</td>
                  <td style={{ padding: '12px 14px', color: C.gray500, fontSize: 13 }}>{e.giro || '—'}</td>
                  <td style={{ padding: '12px 14px', color: C.gray500, fontSize: 13 }}>{e.region || '—'}</td>
                  <td style={{ padding: '12px 14px', fontSize: 13 }}>
                    {e.admin_nombre ? (
                      <div>
                        <div style={{ fontWeight: 600, color: C.gray800 }}>{e.admin_nombre}</div>
                        <div style={{ fontSize: 11, color: C.gray400 }}>{e.admin_email}</div>
                      </div>
                    ) : <span style={{ color: C.gray400 }}>—</span>}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{
                      background: e.activo ? C.success + '18' : C.error + '18',
                      color: e.activo ? C.success : C.error,
                      border: `1px solid ${e.activo ? C.success : C.error}30`,
                      borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700,
                    }}>
                      {e.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <button onClick={() => handleToggle(e.id, e.activo)} style={{
                      background: e.activo ? C.warning + '18' : C.success + '18',
                      color: e.activo ? C.warning : C.success,
                      border: `1px solid ${e.activo ? C.warning : C.success}30`,
                      borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 700,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}>
                      {e.activo ? ' Deshabilitar' : ' Habilitar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {empresas.length === 0 && <p style={{ textAlign: 'center', padding: 32, color: C.gray400 }}>No hay empresas registradas</p>}
        </div>
      </div>
    </div>
  )
}
