import { NavLink, useNavigate } from 'react-router-dom'
import { C } from '../style/theme'
import { getUsuario, logout } from '../services/authService'

const links = [
  { to: '/dashboard',  icon: '📊', label: 'Dashboard',       roles: ['admin', 'superadmin'] },
  { to: '/inventario', icon: '📋', label: 'Inventario',      roles: ['admin', 'superadmin'] },
  { to: '/pedidos',    icon: '📦', label: 'Pedidos',         roles: ['admin', 'superadmin'] },
  { to: '/bodegas',    icon: '🏭', label: 'Bodegas',         roles: ['admin', 'superadmin'] },
  { to: '/tiendas',    icon: '🏪', label: 'Tiendas',         roles: ['admin', 'superadmin'] },
  { to: '/envios',     icon: '🚚', label: 'Envíos',          roles: ['admin', 'superadmin'] },
  { to: '/empleados',  icon: '👷', label: 'Repartidores',     roles: ['superadmin'] },
  { to: '/superadmin', icon: '⚙️', label: 'SuperAdmin',     roles: ['superadmin'] },
]

export default function Sidebar({ sidebarOpen, toggleSidebar }) {
  const navigate = useNavigate()
  const usuario  = getUsuario()

  const initials = usuario?.nombre
    ? usuario.nombre.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
    : 'SL'

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const contenido = (
    <>
      {/* Logo */}
      <div style={{ borderBottom: `1px solid ${C.gray200}`, display: 'flex', justifyContent: 'center', position: 'relative' }}>
        {toggleSidebar && (
          <button onClick={() => toggleSidebar(false)} style={{
            position: 'absolute', right: 8, top: 8, background: 'none', border: 'none',
            fontSize: 20, cursor: 'pointer', color: C.gray400, display: 'none', padding: '4px 8px',
          }} className="sidebar-close">
            ✕
          </button>
        )}
        <img
          src="/src/assets/img/logo.png"
          alt="SmartLogix"
          style={{ height: 150, objectFit: 'contain', margin: '-10px 0' }}
        />
      </div>

      {/* Empresa */}
      {usuario?.empresa_nombre && (
        <div style={{
          padding: '10px 14px', background: C.brandLight,
          borderBottom: `1px solid ${C.gray200}`,
        }}>
          <p style={{ margin: 0, fontSize: 11, color: C.brand, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px' }}>
            Empresa
          </p>
          <p style={{
            margin: '2px 0 0', fontSize: 13, fontWeight: 700, color: C.gray800,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {usuario.empresa_nombre}
          </p>
        </div>
      )}

      {/* Nav */}
      <nav style={{ padding: '12px 10px', flex: 1 }}>
        <p style={{
          fontSize: 10, fontWeight: 700, color: C.gray400,
          textTransform: 'uppercase', letterSpacing: '.8px',
          padding: '6px 10px', margin: '0 0 4px',
        }}>
          Menú
        </p>
        {links
          .filter(l => !l.roles || l.roles.includes(usuario?.rol))
          .map(({ to, icon, label }) => (
          <NavLink key={to} to={to} onClick={() => toggleSidebar?.(false)} style={({ isActive }) => ({
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
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.gray800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {usuario?.nombre || 'Usuario'}
            </p>
            <p style={{ margin: 0, fontSize: 11, color: C.gray400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {usuario?.email || ''}
            </p>
          </div>
          <button
            onClick={handleLogout}
            title="Cerrar sesión"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.gray400, fontSize: 16, padding: 4, borderRadius: 6, flexShrink: 0 }}
          >
            ⏻
          </button>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .sidebar-close { display: block !important; }
        }
      `}</style>
    </>
  )

  if (toggleSidebar) {
    return (
      <>
        {/* Overlay */}
        {sidebarOpen && (
          <div onClick={() => toggleSidebar(false)} style={{
            position: 'fixed', inset: 0, zIndex: 998, background: 'rgba(0,0,0,0.4)',
          }} className="sidebar-overlay" />
        )}

        {/* Mobile drawer */}
        <aside style={{
          position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 999,
          width: 260, background: C.white,
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform .25s ease',
          display: 'flex', flexDirection: 'column',
          overflowY: 'auto',
        }} className="sidebar-mobile">
          {contenido}
        </aside>

        {/* Desktop sidebar */}
        <aside style={{
          width: 220, minHeight: '100vh', background: C.white,
          borderRight: `1px solid ${C.gray200}`,
          display: 'flex', flexDirection: 'column',
          position: 'sticky', top: 0, height: '100vh',
          flexShrink: 0,
        }} className="sidebar-desktop">
          {contenido}
        </aside>

        <style>{`
          @media (max-width: 768px) {
            .sidebar-desktop { display: none !important; }
            .sidebar-mobile { display: flex !important; }
            .sidebar-overlay { display: block !important; }
          }
          @media (min-width: 769px) {
            .sidebar-mobile { display: none !important; }
            .sidebar-overlay { display: none !important; }
            .sidebar-desktop { display: flex !important; }
          }
        `}</style>
      </>
    )
  }

  // Sin toggle (modo estático original)
  return (
    <aside style={{
      width: 220, minHeight: '100vh', background: C.white,
      borderRight: `1px solid ${C.gray200}`,
      display: 'flex', flexDirection: 'column',
      position: 'sticky', top: 0, height: '100vh',
      flexShrink: 0,
    }}>
      {contenido}
    </aside>
  )
}
