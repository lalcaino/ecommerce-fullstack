# SmartLogix

Plataforma de gestión logística para PyMEs. Permite administrar inventario, pedidos, bodegas, tiendas y envíos desde una interfaz centralizada.

## Arquitectura

```
frontend (React + Vite)  :3000
    |
    v
bff (Django REST)        :8000   <- API Gateway + Auth JWT
    |
    +-- ms-inventario    :8001   <- Productos y bodegas
    +-- ms-pedidos       :8002   <- Pedidos y tiendas
    +-- ms-envios        :8003   <- Envíos, conductores y rutas
```

## Componentes

| Componente | Tecnología | Puerto | Descripción |
|---|---|---|---|
| frontend | React 18 + Vite | 3000 | Interfaz de usuario |
| bff | Django 4.2 + DRF | 8000 | Gateway, auth JWT, agregación de datos |
| ms-inventario | Django 4.2 + DRF | 8001 | Productos, stock y bodegas |
| ms-pedidos | Django 4.2 + DRF | 8002 | Pedidos y tiendas |
| ms-envios | Django 4.2 + DRF | 8003 | Envíos, conductores y seguimiento |

## Requisitos previos

- Python 3.11+
- Node.js 18+
- npm 9+

## Instalación y ejecución

Cada servicio se levanta de forma independiente. Abrir una terminal por componente.

### 1. ms-inventario

```bash
cd ms-inventario
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 8001
```

### 2. ms-pedidos

```bash
cd ms-pedidos
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 8002
```

### 3. ms-envios

```bash
cd ms-envios
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 8003
```

### 4. bff

Crear un archivo `.env` dentro de `bff/`:

```
SECRET_KEY=tu-clave-secreta
DEBUG=True
MS_INVENTARIO_URL=http://localhost:8001
MS_PEDIDOS_URL=http://localhost:8002
MS_ENVIOS_URL=http://localhost:8003
```

```bash
cd bff
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 8000
```

### 5. frontend

Crear un archivo `.env.local` dentro de `frontend/`:

```
VITE_API_URL=http://localhost:8000/api
VITE_MAPBOX_TOKEN=tu-token-mapbox
```

```bash
cd frontend
npm install
npm run dev
```

Acceder en `http://localhost:3000`.

## Variables de entorno

### bff

| Variable | Valor por defecto | Descripción |
|---|---|---|
| SECRET_KEY | dev-secret-key-changeme | Clave secreta Django |
| DEBUG | True | Modo debug |
| MS_INVENTARIO_URL | http://localhost:8001 | URL del microservicio de inventario |
| MS_PEDIDOS_URL | http://localhost:8002 | URL del microservicio de pedidos |
| MS_ENVIOS_URL | http://localhost:8003 | URL del microservicio de envíos |

### frontend

| Variable | Descripción |
|---|---|
| VITE_API_URL | URL base del BFF (default: http://localhost:8000/api) |
| VITE_MAPBOX_TOKEN | Token de Mapbox para el mapa de envíos |

## Pruebas

### Backend (cada microservicio y BFF)

```bash
# ms-inventario
cd ms-inventario && python manage.py test productos

# ms-pedidos
cd ms-pedidos && python manage.py test pedidos

# ms-envios
cd ms-envios && python manage.py test envios

# bff
cd bff && python api/tests.py
```

### Frontend

```bash
cd frontend
npm test                  # pruebas
npm run test:coverage     # con cobertura (minimo 60%)
```

## Patrones de diseño implementados

- **Repository Pattern**: abstraccion de acceso a datos en cada microservicio y en el frontend (`api.js`).
- **Circuit Breaker**: en el BFF (`api/gateway.py`) y en el frontend (`api.js`), protege contra fallos en cascada.
- **API Gateway**: el BFF actua como punto unico de entrada para el frontend.
- **Factory Method**: `PedidoFactory` (ms-pedidos), `EnvioFactory` (ms-envios), `ProductoFactory` (frontend).
- **Custom Hooks**: separacion de logica de estado y UI en el frontend (`src/hooks/`).

## Flujo de estados Pedido / Envio

Cuando el estado de un pedido cambia, el BFF sincroniza automaticamente el envio asociado:

```
Pedido PROCESANDO  ->  crea Envio PENDIENTE
Pedido ENVIADO     ->  Envio EN_RUTA
Pedido ENTREGADO   ->  Envio COMPLETADO
Pedido CANCELADO   ->  Envio CANCELADO
```

La sincronizacion inversa tambien aplica: cambiar el estado del envio desde la seccion Envios actualiza el pedido correspondiente.

## Estructura del repositorio

```
lalcaino-ecommerce-fullstack/
    bff/                  Django REST Framework - API Gateway
    frontend/             React + Vite
    ms-envios/            Microservicio de envios
    ms-inventario/        Microservicio de inventario
    ms-pedidos/           Microservicio de pedidos
```
