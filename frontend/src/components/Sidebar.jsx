import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { C } from '../style/theme'
import { getUsuario, logout } from '../services/authService'

const links = [
  { to: '/dashboard',  icon: '📊', label: 'Dashboard'  },
  { to: '/inventario', icon: '📦', label: 'Inventario'  },
  { to: '/pedidos',    icon: '🚚', label: 'Pedidos'     },
  { to: '/bodegas',    icon: '🏭', label: 'Bodegas'     },
  { to: '/tiendas',    icon: '🏪', label: 'Tiendas'     },
  { to: '/envios', icon: '🗺️', label: 'Envíos' }
]

export default function Sidebar() {
  const navigate = useNavigate()
  const usuario  = getUsuario()

  const initials = usuario?.nombre
    ? usuario.nombre.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
    : 'SL'

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <aside style={{
      width: 220, minHeight: '100vh', background: C.white,
      borderRight: `1px solid ${C.gray200}`,
      display: 'flex', flexDirection: 'column',
      position: 'sticky', top: 0, height: '100vh',
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ borderBottom: `1px solid ${C.gray200}`, display: 'flex', justifyContent: 'center' }}>
        <img
          src="/src/assets/img/logo.png"
          alt="SmartLogix"
          style={{ height: 150, objectFit: 'contain', margin: '-10px 0' }}
        />
      </div>

      {/* Nav */}
      <nav style={{ padding: '12px 10px', flex: 1 }}>
        <p style={{
          fontSize: 10, fontWeight: 700, color: C.gray400,
          textTransform: 'uppercase', letterSpacing: '.8px',
          padding: '6px 10px', margin: '0 0 4px',
        }}>
          Menú
        </p>
        {links.map(({ to, icon, label }) => (
          <NavLink key={to} to={to} style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 12px', borderRadius: 10, marginBottom: 2,
            fontWeight: 600, fontSize: 14, textDecoration: 'none',
            background: isActive ? C.brandLight : 'transparent',
            color: isActive ? C.brand : C.gray500,
            transition: 'all .15s',
          })}>
            <span style={{ fontSize: 16 }}>{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer usuario */}
      <div style={{ padding: '14px 16px', borderTop: `1px solid ${C.gray200}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: '50%', background: C.brand,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 800, fontSize: 12, flexShrink: 0,
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              margin: 0, fontSize: 13, fontWeight: 700, color: C.gray800,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {usuario?.nombre || 'Usuario'}
            </p>
            <p style={{
              margin: 0, fontSize: 11, color: C.gray400,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {usuario?.email || ''}
            </p>
          </div>
          <button
            onClick={handleLogout}
            title="Cerrar sesión"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: C.gray400, fontSize: 16, padding: 4, borderRadius: 6,
              flexShrink: 0, transition: 'color .15s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
            onMouseLeave={e => e.currentTarget.style.color = C.gray400}
          >
            ⏻
          </button>
        </div>
      </div>
    </aside>
  )
}