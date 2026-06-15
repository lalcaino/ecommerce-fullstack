# Persistencia de Datos - SmartLogix

## 1. Motor de Base de Datos

**PostgreSQL 15** — Base de datos relacional única con aislamiento por **schemas**.

## 2. Esquemas y Modelos

### Schema `public` (BFF — Autenticación y Empresas)
```sql
CREATE SCHEMA public;

Empresa {
  rut: VARCHAR PK           -- RUT empresa (ej: 76.123.456-7)
  razon_social: VARCHAR
  nombre_comercial: VARCHAR
  giro: VARCHAR
  giro_codigo: VARCHAR      -- Código SII de actividad económica
  region: VARCHAR
}

PerfilUsuario {
  user_id: FK -> auth.User  -- 1:1 con usuario Django
  empresa_id: FK -> Empresa
  nombre_representante: VARCHAR
  rol: VARCHAR              -- 'admin' | 'repartidor'
}
```

### Schema `inventario` (ms-inventario)
```sql
CREATE SCHEMA inventario;

Bodega {
  id: BIGINT PK
  nombre: VARCHAR
  direccion: VARCHAR
  capacidad: INTEGER
  activa: BOOLEAN
  empresa_rut: VARCHAR      -- Filtro multi-empresa
}

Producto {
  id: BIGINT PK
  nombre: VARCHAR
  descripcion: TEXT
  tipo: VARCHAR             -- FISICO | DIGITAL | SERVICIO
  precio: DECIMAL
  stock: INTEGER
  stock_minimo: INTEGER
  peso_kg: DECIMAL          -- Solo FISICO
  url_descarga: VARCHAR     -- Solo DIGITAL
  duracion_dias: INTEGER    -- Solo SERVICIO
  activo: BOOLEAN
  bodega_id: FK -> Bodega
  empresa_rut: VARCHAR
}
```

### Schema `pedidos` (ms-pedidos)
```sql
CREATE SCHEMA pedidos;

Tienda {
  id: BIGINT PK
  nombre: VARCHAR
  direccion: VARCHAR
  ciudad: VARCHAR
  bodega_id: INTEGER        -- FK lógica a inventario.Bodega
  activa: BOOLEAN
  empresa_rut: VARCHAR
}

Pedido {
  id: BIGINT PK
  cliente: VARCHAR
  email_cliente: VARCHAR
  telefono_cliente: VARCHAR
  direccion_entrega: VARCHAR
  estado: VARCHAR           -- PENDIENTE | PROCESANDO | ENVIADO | ENTREGADO | CANCELADO
  total: DECIMAL
  notas: TEXT
  tienda_id: FK -> Tienda
  empresa_rut: VARCHAR
}

ItemPedido {
  id: BIGINT PK
  pedido_id: FK -> Pedido
  producto_id: INTEGER
  nombre_producto: VARCHAR
  cantidad: INTEGER
  precio_unitario: DECIMAL
  subtotal: DECIMAL         -- Propiedad calculada: cantidad * precio_unitario
}
```

### Schema `envios` (ms-envios)
```sql
CREATE SCHEMA envios;

Conductor {
  id: BIGINT PK
  nombre: VARCHAR
  telefono: VARCHAR
  patente: VARCHAR
  disponible: BOOLEAN
  empresa_rut: VARCHAR
}

Envio {
  id: BIGINT PK
  pedido_id: INTEGER
  conductor_id: FK -> Conductor
  tipo: VARCHAR             -- ESTANDAR | EXPRESS | PROGRAMADO
  estado: VARCHAR           -- PENDIENTE | EN_RUTA | COMPLETADO | FALLIDO | CANCELADO
  origen_lat: DECIMAL
  origen_lon: DECIMAL
  destino_lat: DECIMAL
  destino_lon: DECIMAL
  pos_lat: DECIMAL          -- GPS en tiempo real
  pos_lon: DECIMAL
  ruta_geojson: JSONB       -- GeoJSON de Mapbox Directions API
  distancia_km: DECIMAL
  duracion_min: INTEGER
  fecha_estimada: DATETIME
  empresa_rut: VARCHAR
}

Parada {
  id: BIGINT PK
  envio_id: FK -> Envio
  orden: INTEGER
  pedido_id: INTEGER
  nombre: VARCHAR
  direccion: VARCHAR
  lat: DECIMAL
  lon: DECIMAL
  estado: VARCHAR           -- PENDIENTE | COMPLETADO
  llegada_real: DATETIME
}

EventoRuta {
  id: BIGINT PK
  envio_id: FK -> Envio
  tipo: VARCHAR             -- POSICION | ESTADO | INCIDENTE | NOTA
  lat: DECIMAL
  lon: DECIMAL
  mensaje: TEXT
  creado: DATETIME
}
```

## 3. ORM y Migraciones

Usamos **Django ORM** (Object-Relational Mapping), equivalente a JPA en Java.

Cada modelo es una clase Python que hereda de `django.db.models.Model`. Django genera automáticamente las tablas SQL y las migraciones:

```bash
# Crear migraciones (detecta cambios en modelos)
python manage.py makemigrations

# Aplicar migraciones a la BD
python manage.py migrate
```

### Enrutador de Schemas (`db_router.py` en BFF)

```python
class SchemaRouter:
    """Aísla cada microservicio en su schema de PostgreSQL."""
    
    route_map = {
        'inventario': ['Producto', 'Bodega'],
        'pedidos': ['Pedido', 'ItemPedido', 'Tienda'],
        'envios': ['Envio', 'Conductor', 'Parada', 'EventoRuta'],
    }

    def db_for_read(self, model, **hints):
        return self._get_schema(model._meta.model_name)

    def db_for_write(self, model, **hints):
        return self._get_schema(model._meta.model_name)

    def _get_schema(self, model_name):
        for schema, models in self.route_map.items():
            if model_name in models:
                return schema
        return 'public'
```

## 4. Estrategias de Persistencia

### Ajuste de Stock Atómico
```python
# Usa F() para evitar race conditions
Producto.objects.filter(id=producto_id).update(
    stock=F('stock') + cantidad
)
```

### Sincronización de Estados (BFF)
Cuando cambia el estado de un pedido, el BFF actualiza automáticamente el envío asociado, y viceversa. Esto se hace a nivel de aplicación (no con triggers SQL).

### Multi-tenencia
Cada tabla incluye `empresa_rut` como filtro. El BFF extrae este dato del token JWT y lo pasa como parámetro en las consultas.

## 5. Resumen

| Componente | ORM | Motor BD | Estrategia |
|------------|-----|----------|------------|
| BFF | Django ORM | PostgreSQL (public) | Tablas propias de auth + empresa |
| ms-inventario | Django ORM | PostgreSQL (inventario) | Ajuste atómico con F() |
| ms-pedidos | Django ORM | PostgreSQL (pedidos) | Estado con sincronización |
| ms-envios | Django ORM | PostgreSQL (envios) | GeoJSON en JSONB + eventos |
