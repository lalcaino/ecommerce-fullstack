# SmartLogix — Frontend (React + Vite)

## Descripción
Interfaz de usuario para la Plataforma de Gestión Logística SmartLogix.
Empaquetado como módulo NPM reutilizable.

## Patrones de diseño implementados
- **Repository Pattern** (`src/services/api.js`): abstrae todos los accesos HTTP.
- **Circuit Breaker** (`src/services/api.js`): protege al frontend de fallos en cascada.
- **Custom Hooks** (`src/hooks/`): separan la lógica de estado de los componentes UI.
- **Factory Method** (`src/components/Inventario.jsx`): `ProductoFactory` crea estructuras según tipo de producto.

## Instalación

```bash
npm install
```

## Ejecución en desarrollo

```bash
npm run dev
# → http://localhost:3000
```

## Build para producción

```bash
npm run build
```

## Pruebas unitarias

```bash
# Ejecutar pruebas
npm test

# Pruebas con cobertura de código (mínimo 60%)
npm run test:coverage
```

## Variables de entorno

Crear `.env.local`:
```
VITE_API_URL=http://localhost:8000/api
```

## Estructura

```
src/
├── components/
│   ├── Dashboard.jsx    # Panel principal (datos del BFF)
│   ├── Inventario.jsx   # CRUD de productos
│   └── Pedidos.jsx      # Gestión de pedidos
├── hooks/
│   ├── useInventario.js # Hook para inventario
│   └── usePedidos.js    # Hook para pedidos
├── services/
│   ├── api.js           # Repository + Circuit Breaker
│   └── api.test.js      # Pruebas unitarias
└── App.jsx              # Router principal
```
