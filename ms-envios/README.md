# SmartLogix — Microservicio de Envíos

## Descripción
Microservicio independiente para la gestión de envíos, rutas y seguimiento en tiempo real.
Puerto: `8003`

## Patrones implementados
- **Repository Pattern** (`envios/models.py`): `EnvioRepository`, `ConductorRepository`, `ParadaRepository`
- **Factory Method** (`envios/models.py`): `EnvioFactory` crea envíos según tipo (`estandar`, `express`, `programado`)

## Modelos
| Modelo        | Descripción                                        |
|---------------|----------------------------------------------------|
| `Conductor`   | Conductor del vehículo de reparto                  |
| `Envio`       | Envío con origen, destino, ruta GeoJSON y posición GPS |
| `Parada`      | Paradas intermedias ordenadas en la ruta           |
| `EventoRuta`  | Historial de posiciones y cambios de estado        |

## Instalación

```bash
pip install -r requirements.txt
python manage.py migrate
```

## Ejecución

```bash
python manage.py runserver 8003
```

## Variables de entorno (.env)

```
SECRET_KEY=envios-secret-key
DEBUG=True
```

## Endpoints

| Método | Ruta                                 | Descripción                              |
|--------|--------------------------------------|------------------------------------------|
| GET    | /api/envios/                         | Listar todos los envíos                  |
| POST   | /api/envios/                         | Crear envío (con Factory Method)         |
| GET    | /api/envios/{id}/                    | Detalle completo con ruta y eventos      |
| DELETE | /api/envios/{id}/                    | Eliminar envío                           |
| PATCH  | /api/envios/{id}/estado/             | Cambiar estado del envío                 |
| PATCH  | /api/envios/{id}/posicion/           | Actualizar posición GPS del conductor    |
| PATCH  | /api/envios/{id}/ruta/               | Persistir ruta GeoJSON calculada         |
| GET    | /api/envios/en-curso/                | Envíos activos (EN_RUTA) para el mapa    |
| GET    | /api/envios/pedido/{pedido_id}/      | Envío asociado a un pedido               |
| PATCH  | /api/paradas/{id}/estado/            | Actualizar estado de una parada          |
| GET    | /api/conductores/                    | Listar conductores                       |
| POST   | /api/conductores/                    | Crear conductor                          |
| GET    | /api/conductores/?disponibles=true   | Solo conductores disponibles             |
| PUT    | /api/conductores/{id}/               | Actualizar conductor                     |
| DELETE | /api/conductores/{id}/               | Eliminar conductor                       |

## Tipos de Envío (Factory Method)

| Tipo         | Estado inicial | Notas                              |
|--------------|----------------|------------------------------------|
| `estandar`   | PENDIENTE      | Flujo normal de despacho           |
| `express`    | PENDIENTE      | Alta prioridad, nota automática    |
| `programado` | PENDIENTE      | Requiere `fecha_estimada`          |

## Ciclo de estados

```
PENDIENTE → EN_RUTA → COMPLETADO
              ↘
           FALLIDO / CANCELADO
```

## Integración con Mapbox

El frontend calcula la ruta óptima con la Mapbox Directions API y la persiste:

```
PATCH /api/envios/{id}/ruta/
{
  "ruta_geojson": { "type": "LineString", "coordinates": [...] },
  "distancia_km": 12.5,
  "duracion_min": 25
}
```

## Pruebas

```bash
python manage.py test envios
```
