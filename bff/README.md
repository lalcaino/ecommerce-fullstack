# SmartLogix — BFF (Backend For Frontend)

## Descripción
Componente orquestador que actúa como API Gateway entre el frontend React y los microservicios.
Implementado con **Django REST Framework** en el puerto `8000`.

## Responsabilidades
- Enrutar peticiones a `ms-inventario` (`:8001`) y `ms-pedidos` (`:8002`).
- Agregar datos para el Dashboard (reduce round-trips del frontend).
- Aplicar Circuit Breaker por cada microservicio.
- Transformar/adaptar respuestas para el cliente React.

## Patrones implementados
- **API Gateway**: punto único de entrada para el frontend.
- **Circuit Breaker** (`api/gateway.py`): protege contra fallos en cascada.

## Instalación

```bash
pip install -r requirements.txt
python manage.py migrate
```

## Ejecución

```bash
python manage.py runserver 8000
```

## Variables de entorno (.env)

```
SECRET_KEY=tu-clave-secreta
DEBUG=True
MS_INVENTARIO_URL=http://localhost:8001
MS_PEDIDOS_URL=http://localhost:8002
```

## Endpoints

| Método | Ruta                    | Descripción                          |
|--------|-------------------------|--------------------------------------|
| GET    | /api/dashboard/         | Resumen agregado (BFF)               |
| GET    | /api/inventario/        | Lista de productos (proxy a MS)      |
| POST   | /api/inventario/        | Crear producto                       |
| GET    | /api/inventario/{id}/   | Detalle de producto                  |
| PUT    | /api/inventario/{id}/   | Actualizar producto                  |
| DELETE | /api/inventario/{id}/   | Eliminar producto                    |
| GET    | /api/pedidos/           | Lista de pedidos (proxy a MS)        |
| POST   | /api/pedidos/           | Crear pedido                         |
| GET    | /api/pedidos/{id}/      | Detalle de pedido                    |
| PATCH  | /api/pedidos/{id}/      | Cambiar estado del pedido            |

## Pruebas

```bash
python api/tests.py
```
