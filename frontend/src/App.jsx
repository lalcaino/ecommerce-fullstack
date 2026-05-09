import React from 'react'
import { Helmet } from 'react-helmet'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

import Dashboard  from './components/Dashboard'
import Inventario from './components/Inventario'
import Pedidos    from './components/Pedidos'
import Bodegas    from './components/Bodegas'
import Tiendas    from './components/Tiendas'
import Sidebar    from './components/Sidebar'
import Landing    from './screens/Landing'
import Registro   from './screens/Registro'
import Login      from './screens/Login'

import './style/index.css'

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
          <Route path="/"         element={<Landing />}  />
          <Route path="/login"    element={<Login />}    />
          <Route path="/registro" element={<Registro />} />
          <Route path="/*"        element={<AppLayout />} />
        </Routes>
      </BrowserRouter>
    </>
  )
}