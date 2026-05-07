import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import Dashboard  from './components/Dashboard'
import Inventario from './components/Inventario'
import Pedidos    from './components/Pedidos'
import './index.css'

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">SmartLogix</div>
      <nav>
        <NavLink to="/"           className={({isActive}) => isActive ? 'active' : ''}>Dashboard</NavLink>
        <NavLink to="/inventario" className={({isActive}) => isActive ? 'active' : ''}>Inventario</NavLink>
        <NavLink to="/pedidos"    className={({isActive}) => isActive ? 'active' : ''}>Pedidos</NavLink>
      </nav>
    </aside>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/"           element={<Dashboard />} />
            <Route path="/inventario" element={<Inventario />} />
            <Route path="/pedidos"    element={<Pedidos />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
