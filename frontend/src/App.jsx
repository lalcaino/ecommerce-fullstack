import React from 'react'
import { Helmet } from 'react-helmet'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import Dashboard    from './components/Dashboard'
import Inventario   from './components/Inventario'
import Pedidos      from './components/Pedidos'
import Bodegas      from './components/Bodegas'
import Tiendas      from './components/Tiendas'
import Sidebar      from './components/Sidebar'
import Envios       from './components/Envios'
import Empleados    from './components/Empleados'
import SuperAdmin   from './components/SuperAdmin'
import Landing      from './screens/Landing'
import Registro     from './screens/Registro'
import Login        from './screens/Login'
import VistaRepartidor from './screens/VistaRepartidor'

import { getUsuario, isAuthenticated } from './services/authService'
import './style/index.css'

// Rutas protegidas según rol
function RutaProtegida({ children, soloAdmin = false }) {
  if (!isAuthenticated()) return <Navigate to="/login" replace />
  const usuario = getUsuario()
  // Si es repartidor y quiere acceder a ruta de admin, redirigir a su vista
  if (soloAdmin && usuario?.rol === 'repartidor') {
    return <Navigate to="/repartidor" replace />
  }
  // superadmin puede acceder a todo
  return children
}

function AppLayout() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f4f7f6' }}>
      <Sidebar />
      <main style={{ flex: 1, overflow: 'auto' }}>
        <Routes>
          <Route path="/dashboard"  element={<Dashboard />}  />
          <Route path="/inventario" element={<Inventario />} />
          <Route path="/pedidos"    element={<Pedidos />}    />
          <Route path="/bodegas"    element={<Bodegas />}    />
          <Route path="/tiendas"    element={<Tiendas />}    />
          <Route path="/envios"     element={<Envios />}     />
          <Route path="/empleados"  element={<Empleados />}  />
          <Route path="/superadmin" element={<SuperAdmin />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <>
      <Helmet>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=Khula:wght@400;600;800&display=swap" rel="stylesheet" />
      </Helmet>

      <BrowserRouter>
        <Routes>
          {/* Públicas */}
          <Route path="/"         element={<Landing />}  />
          <Route path="/login"    element={<Login />}    />
          <Route path="/registro" element={<Registro />} />

          {/* Vista repartidor — solo mobile, sin sidebar */}
          <Route path="/repartidor" element={
            <RutaProtegida>
              <VistaRepartidor />
            </RutaProtegida>
          } />

          {/* Dashboard admin — solo para rol admin */}
          <Route path="/*" element={
            <RutaProtegida soloAdmin>
              <AppLayout />
            </RutaProtegida>
          } />
        </Routes>
      </BrowserRouter>
    </>
  )
}