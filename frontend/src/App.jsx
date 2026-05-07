import React from 'react'
import { Helmet } from 'react-helmet'
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'

import Dashboard from './components/Dashboard'
import Inventario from './components/Inventario'
import Pedidos from './components/Pedidos'

import Landing from './screens/Landing.jsx'

import './style/index.css'

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">SmartLogix</div>

      <nav>
        <NavLink
          to="/"
          className={({ isActive }) => (isActive ? 'active' : '')}
        >
          Dashboard
        </NavLink>

        <NavLink
          to="/inventario"
          className={({ isActive }) => (isActive ? 'active' : '')}
        >
          Inventario
        </NavLink>

        <NavLink
          to="/pedidos"
          className={({ isActive }) => (isActive ? 'active' : '')}
        >
          Pedidos
        </NavLink>

        <NavLink
          to="/landing"
          className={({ isActive }) => (isActive ? 'active' : '')}
        >
          Landing
        </NavLink>
      </nav>
    </aside>
  )
}

export default function App() {
  return (
    <>
      <Helmet>
        <link rel="preconnect" href="https://fonts.googleapis.com" />

        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="true"
        />

        <link
          href="https://fonts.googleapis.com/css2?family=Khula:wght@400;600;800&display=swap"
          rel="stylesheet"
        />
      </Helmet>

      <BrowserRouter>
        <div className="app-layout">

          <main className="main-content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/inventario" element={<Inventario />} />
              <Route path="/pedidos" element={<Pedidos />} />
              <Route path="/landing" element={<Landing />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </>
  )
}