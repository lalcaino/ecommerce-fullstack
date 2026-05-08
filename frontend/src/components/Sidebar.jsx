import React from 'react'
import { NavLink } from 'react-router-dom'
import { C } from '../style/theme'

const links = [
  { to: '/dashboard',  icon: '', label: 'Dashboard', end: true },
  { to: '/inventario', icon: '', label: 'Inventario' },
  { to: '/pedidos',    icon: '', label: 'Pedidos'    },
]

export default function Sidebar() {
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
        <p style={{ fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: 'uppercase', letterSpacing: '.8px', padding: '6px 10px', margin: '0 0 4px' }}>Menú</p>
        {links.map(({ to, icon, label, end }) => (
          <NavLink key={to} to={to} end={end} style={({ isActive }) => ({
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

      {/* Footer */}
      <div style={{ padding: '14px 20px', borderTop: `1px solid ${C.gray200}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: C.brand, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 13 }}>SL</div>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.gray800 }}>SmartLogix</p>
            <p style={{ margin: 0, fontSize: 11, color: C.gray400 }}>Admin</p>
          </div>
        </div>
      </div>
    </aside>
  )
}