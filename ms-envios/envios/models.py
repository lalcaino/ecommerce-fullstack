from django.db import models
from decimal import Decimal


ESTADO_ENVIO_CHOICES = [
    ('PENDIENTE',   'Pendiente'),
    ('EN_RUTA',     'En ruta'),
    ('COMPLETADO',  'Completado'),
    ('FALLIDO',     'Fallido'),
    ('CANCELADO',   'Cancelado'),
]

ESTADO_PARADA_CHOICES = [
    ('PENDIENTE',  'Pendiente'),
    ('EN_CAMINO',  'En camino'),
    ('LLEGADO',    'Llegado'),
    ('ENTREGADO',  'Entregado'),
    ('FALLIDO',    'Fallido'),
]

TIPO_ENVIO_CHOICES = [
    ('ESTANDAR',  'Estándar'),
    ('EXPRESS',   'Express'),
    ('PROGRAMADO','Programado'),
]


class Conductor(models.Model):
    nombre     = models.CharField(max_length=200)
    telefono   = models.CharField(max_length=20)
    patente    = models.CharField(max_length=10)  # patente vehículo
    disponible = models.BooleanField(default=True)
    creado_en  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['nombre']

    def __str__(self):
        return f'{self.nombre} ({self.patente})'


class Envio(models.Model):
    pedido_id        = models.PositiveIntegerField()           # referencia al ms-pedidos
    conductor        = models.ForeignKey(
                           Conductor, null=True, blank=True,
                           on_delete=models.SET_NULL, related_name='envios')
    tipo             = models.CharField(max_length=20, choices=TIPO_ENVIO_CHOICES, default='ESTANDAR')
    estado           = models.CharField(max_length=20, choices=ESTADO_ENVIO_CHOICES, default='PENDIENTE')

    # Origen
    origen_nombre    = models.CharField(max_length=300, default='Bodega Central')
    origen_lat       = models.DecimalField(max_digits=10, decimal_places=7)
    origen_lon       = models.DecimalField(max_digits=10, decimal_places=7)

    # Destino final
    destino_nombre   = models.CharField(max_length=300)
    destino_lat      = models.DecimalField(max_digits=10, decimal_places=7)
    destino_lon      = models.DecimalField(max_digits=10, decimal_places=7)

    # Posición actual del conductor (actualizada en tiempo real)
    pos_lat          = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    pos_lon          = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    pos_actualizada  = models.DateTimeField(null=True, blank=True)

    # Ruta calculada por Mapbox (GeoJSON LineString almacenado como JSON)
    ruta_geojson     = models.JSONField(null=True, blank=True)
    distancia_km     = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    duracion_min     = models.PositiveIntegerField(null=True, blank=True)

    notas            = models.TextField(blank=True)
    fecha_estimada   = models.DateTimeField(null=True, blank=True)
    fecha_creacion   = models.DateTimeField(auto_now_add=True)
    fecha_update     = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-fecha_creacion']

    def __str__(self):
        return f'Envío #{self.id} — Pedido {self.pedido_id} [{self.estado}]'


class Parada(models.Model):
    """
    Parada intermedia dentro de un envío multi-destino.
    Orden define la secuencia en la ruta óptima.
    """
    envio          = models.ForeignKey(Envio, related_name='paradas', on_delete=models.CASCADE)
    orden          = models.PositiveSmallIntegerField()
    pedido_id      = models.PositiveIntegerField(null=True, blank=True)   # pedido asociado a esta parada
    nombre         = models.CharField(max_length=300)
    direccion      = models.CharField(max_length=400)
    lat            = models.DecimalField(max_digits=10, decimal_places=7)
    lon            = models.DecimalField(max_digits=10, decimal_places=7)
    estado         = models.CharField(max_length=20, choices=ESTADO_PARADA_CHOICES, default='PENDIENTE')
    notas          = models.TextField(blank=True)
    llegada_real   = models.DateTimeField(null=True, blank=True)
    creado_en      = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['orden']

    def __str__(self):
        return f'Parada {self.orden} — {self.nombre}'


class EventoRuta(models.Model):
    """
    Historial de eventos de la ruta: actualizaciones de posición,
    cambios de estado, incidentes, etc.
    """
    TIPO_CHOICES = [
        ('POSICION',  'Actualización de posición'),
        ('ESTADO',    'Cambio de estado'),
        ('INCIDENTE', 'Incidente'),
        ('NOTA',      'Nota'),
    ]
    envio     = models.ForeignKey(Envio, related_name='eventos', on_delete=models.CASCADE)
    tipo      = models.CharField(max_length=20, choices=TIPO_CHOICES)
    lat       = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    lon       = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    mensaje   = models.TextField(blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-creado_en']

    def __str__(self):
        return f'{self.tipo} — Envío #{self.envio_id} @ {self.creado_en}'


# ─── Repository Pattern ───────────────────────────────────────────────────────

class ConductorRepository:
    @staticmethod
    def get_all():
        return Conductor.objects.all()

    @staticmethod
    def get_disponibles():
        return Conductor.objects.filter(disponible=True)

    @staticmethod
    def get_by_id(pk):
        return Conductor.objects.get(pk=pk)

    @staticmethod
    def create(data):
        return Conductor.objects.create(**data)

    @staticmethod
    def update(pk, data):
        Conductor.objects.filter(pk=pk).update(**data)
        return Conductor.objects.get(pk=pk)

    @staticmethod
    def delete(pk):
        Conductor.objects.filter(pk=pk).delete()


class EnvioRepository:
    @staticmethod
    def get_all():
        return Envio.objects.select_related('conductor').prefetch_related('paradas', 'eventos').all()

    @staticmethod
    def get_by_id(pk):
        return Envio.objects.select_related('conductor').prefetch_related('paradas', 'eventos').get(pk=pk)

    @staticmethod
    def get_by_pedido(pedido_id):
        return Envio.objects.filter(pedido_id=pedido_id).select_related('conductor').first()

    @staticmethod
    def get_en_curso():
        return Envio.objects.filter(estado='EN_RUTA').select_related('conductor').prefetch_related('paradas')

    @staticmethod
    def create(data):
        paradas_data = data.pop('paradas', [])
        envio = Envio.objects.create(**data)
        for i, parada in enumerate(paradas_data):
            parada['orden'] = parada.get('orden', i + 1)
            Parada.objects.create(envio=envio, **parada)
        return EnvioRepository.get_by_id(envio.pk)

    @staticmethod
    def update_estado(pk, estado):
        from django.utils import timezone
        Envio.objects.filter(pk=pk).update(estado=estado)
        EventoRuta.objects.create(
            envio_id=pk,
            tipo='ESTADO',
            mensaje=f'Estado actualizado a {estado}',
        )
        return EnvioRepository.get_by_id(pk)

    @staticmethod
    def update_posicion(pk, lat, lon):
        from django.utils import timezone
        Envio.objects.filter(pk=pk).update(
            pos_lat=lat, pos_lon=lon, pos_actualizada=timezone.now()
        )
        EventoRuta.objects.create(
            envio_id=pk, tipo='POSICION', lat=lat, lon=lon,
        )
        return EnvioRepository.get_by_id(pk)

    @staticmethod
    def update_ruta(pk, geojson, distancia_km, duracion_min):
        Envio.objects.filter(pk=pk).update(
            ruta_geojson=geojson,
            distancia_km=distancia_km,
            duracion_min=duracion_min,
        )
        return EnvioRepository.get_by_id(pk)

    @staticmethod
    def delete(pk):
        Envio.objects.filter(pk=pk).delete()


class ParadaRepository:
    @staticmethod
    def update_estado(pk, estado):
        from django.utils import timezone
        update_data = {'estado': estado}
        if estado == 'LLEGADO':
            update_data['llegada_real'] = timezone.now()
        Parada.objects.filter(pk=pk).update(**update_data)
        return Parada.objects.get(pk=pk)


# ─── Factory Method ───────────────────────────────────────────────────────────

class EnvioFactory:
    @staticmethod
    def crear_estandar(pedido_id, origen_lat, origen_lon, destino_nombre,
                       destino_lat, destino_lon, **kwargs):
        return {
            'pedido_id':      pedido_id,
            'tipo':           'ESTANDAR',
            'estado':         'PENDIENTE',
            'origen_nombre':  kwargs.get('origen_nombre', 'Bodega Central'),
            'origen_lat':     origen_lat,
            'origen_lon':     origen_lon,
            'destino_nombre': destino_nombre,
            'destino_lat':    destino_lat,
            'destino_lon':    destino_lon,
            'notas':          kwargs.get('notas', ''),
        }

    @staticmethod
    def crear_express(pedido_id, origen_lat, origen_lon, destino_nombre,
                      destino_lat, destino_lon, **kwargs):
        return {
            'pedido_id':      pedido_id,
            'tipo':           'EXPRESS',
            'estado':         'PENDIENTE',
            'origen_nombre':  kwargs.get('origen_nombre', 'Bodega Central'),
            'origen_lat':     origen_lat,
            'origen_lon':     origen_lon,
            'destino_nombre': destino_nombre,
            'destino_lat':    destino_lat,
            'destino_lon':    destino_lon,
            'notas':          'Envío express — alta prioridad',
        }

    @staticmethod
    def crear_programado(pedido_id, origen_lat, origen_lon, destino_nombre,
                         destino_lat, destino_lon, fecha_estimada, **kwargs):
        return {
            'pedido_id':      pedido_id,
            'tipo':           'PROGRAMADO',
            'estado':         'PENDIENTE',
            'origen_nombre':  kwargs.get('origen_nombre', 'Bodega Central'),
            'origen_lat':     origen_lat,
            'origen_lon':     origen_lon,
            'destino_nombre': destino_nombre,
            'destino_lat':    destino_lat,
            'destino_lon':    destino_lon,
            'fecha_estimada': fecha_estimada,
            'notas':          kwargs.get('notas', ''),
        }

    @classmethod
    def crear(cls, tipo, **kwargs):
        metodos = {
            'estandar':   cls.crear_estandar,
            'express':    cls.crear_express,
            'programado': cls.crear_programado,
        }
        fn = metodos.get(tipo, cls.crear_estandar)
        return fn(**kwargs)
