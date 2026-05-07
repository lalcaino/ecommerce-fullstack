# SmartLogix — Microservicio de Inventario

## Descripción
Microservicio independiente para gestión de productos y stock en tiempo real.
Puerto: `8001`

## Patrones implementados
- **Repository Pattern** (`productos/models.py`): `ProductoRepository` abstrae todo el ORM.
- **Factory Method** (frontend): `ProductoFactory` crea estructuras según tipo de producto.

## Instalación

```bash
pip install -r requirements.txt
python manage.py makemigrations productos
python manage.py migrate
```

## Ejecución

```bash
python manage.py runserver 8001
```

## Endpoints

| Método | Ruta                                 | Descripción               |
|--------|--------------------------------------|---------------------------|
| GET    | /api/productos/                      | Listar productos activos  |
| POST   | /api/productos/                      | Crear producto            |
| GET    | /api/productos/{id}/                 | Detalle de producto       |
| PUT    | /api/productos/{id}/                 | Actualizar producto       |
| PATCH  | /api/productos/{id}/                 | Actualización parcial     |
| DELETE | /api/productos/{id}/                 | Eliminar producto         |
| POST   | /api/productos/{id}/ajuste-stock/    | Ajuste atómico de stock   |
| GET    | /api/productos/bajo-stock/           | Productos bajo stock      |

## Pruebas

```bash
python manage.py test productos
```

## Tipos de Producto

| Tipo     | Campos extra            |
|----------|-------------------------|
| FISICO   | `peso_kg`               |
| DIGITAL  | `url_descarga`          |
| SERVICIO | `duracion_dias`         |
