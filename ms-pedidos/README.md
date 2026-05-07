# SmartLogix — Microservicio de Pedidos

## Descripción
Microservicio independiente para el ciclo de vida completo de pedidos (creación, validación, estado).
Puerto: `8002`

## Patrones implementados
- **Repository Pattern** (`pedidos/models.py`): `PedidoRepository` centraliza toda la persistencia.
- **Factory Method** (`pedidos/models.py`): `PedidoFactory` crea pedidos según tipo de cliente.

## Instalación

```bash
pip install -r requirements.txt
python manage.py makemigrations pedidos
python manage.py migrate
```

## Ejecución

```bash
python manage.py runserver 8002
```

## Endpoints

| Método | Ruta                            | Descripción                  |
|--------|---------------------------------|------------------------------|
| GET    | /api/pedidos/                   | Listar todos los pedidos     |
| POST   | /api/pedidos/                   | Crear pedido (con tipo)      |
| GET    | /api/pedidos/{id}/              | Detalle de pedido            |
| PATCH  | /api/pedidos/{id}/              | Cambiar estado               |
| DELETE | /api/pedidos/{id}/              | Eliminar pedido              |
| GET    | /api/pedidos/estado/{estado}/   | Filtrar por estado           |

## Tipos de Pedido (Factory Method)

Enviar `tipo_pedido` en el POST:

| Tipo         | Estado inicial | Notas                            |
|--------------|----------------|----------------------------------|
| `estandar`   | PENDIENTE      | Flujo normal                     |
| `express`    | PROCESANDO     | Procesamiento prioritario        |
| `corporativo`| PENDIENTE      | Requiere validación adicional    |

## Ciclo de estados

```
PENDIENTE → PROCESANDO → ENVIADO → ENTREGADO
                ↘                ↗
              CANCELADO
```

## Pruebas

```bash
python manage.py test pedidos
```
