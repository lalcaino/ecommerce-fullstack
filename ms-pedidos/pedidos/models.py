from django.db import models
from decimal import Decimal
from decimal import Decimal


ESTADO_CHOICES = [
    ('PENDIENTE',  'Pendiente'),
    ('PROCESANDO', 'Procesando'),
    ('ENVIADO',    'Enviado'),
    ('ENTREGADO',  'Entregado'),
    ('CANCELADO',  'Cancelado'),
]


class Tienda(models.Model):
    empresa_rut = models.CharField(max_length=20, blank=True, db_index=True)
    nombre      = models.CharField(max_length=200)
    direccion   = models.CharField(max_length=300)
    ciudad      = models.CharField(max_length=100)
    bodega_id   = models.PositiveIntegerField(null=True, blank=True)
    activa      = models.BooleanField(default=True)
    creado_en   = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['nombre']

    def __str__(self):
        return f'{self.nombre} — {self.ciudad}'


class Pedido(models.Model):
    ORIGEN_CHOICES = [
        ('tienda', 'Despacho desde tienda'),
        ('bodega', 'Despacho desde bodega'),
    ]

    empresa_rut       = models.CharField(max_length=20, blank=True, db_index=True)
    cliente           = models.CharField(max_length=200)
    email_cliente     = models.EmailField()
    telefono_cliente  = models.CharField(max_length=20, blank=True)
    direccion_entrega = models.CharField(max_length=300, blank=True)
    latitud_entrega   = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    longitud_entrega  = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    estado            = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='PENDIENTE')
    total             = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    notas             = models.TextField(blank=True)
    tienda            = models.ForeignKey(Tienda, null=True, blank=True, on_delete=models.SET_NULL, related_name='pedidos')
    origen_despacho   = models.CharField(max_length=10, choices=ORIGEN_CHOICES, default='tienda')
    bodega_origen_id  = models.PositiveIntegerField(null=True, blank=True, help_text='ID de bodega si origen_despacho=bodega')
    codigo_validacion = models.CharField(max_length=6, blank=True, help_text='Código de 6 dígitos para retirar en tienda/bodega')
    fecha_creacion    = models.DateTimeField(auto_now_add=True)
    fecha_update      = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-fecha_creacion']

    def __str__(self):
        return f'Pedido #{self.id} — {self.cliente} [{self.estado}]'


class ItemPedido(models.Model):
    pedido          = models.ForeignKey(Pedido, related_name='items', on_delete=models.CASCADE)
    producto_id     = models.PositiveIntegerField()
    nombre_producto = models.CharField(max_length=200)
    cantidad        = models.PositiveIntegerField(default=1)
    precio_unitario = models.DecimalField(max_digits=12, decimal_places=2)

    @property
    def subtotal(self):
        return self.cantidad * self.precio_unitario

    def __str__(self):
        return f'{self.nombre_producto} x{self.cantidad}'


class TiendaRepository:
    @staticmethod
    def get_all(empresa_rut=None):
        qs = Tienda.objects.filter(activa=True)
        if empresa_rut:
            qs = qs.filter(empresa_rut=empresa_rut)
        return qs

    @staticmethod
    def get_by_id(pk):
        return Tienda.objects.get(pk=pk)

    @staticmethod
    def get_by_bodega(bodega_id, empresa_rut=None):
        qs = Tienda.objects.filter(bodega_id=bodega_id, activa=True)
        if empresa_rut:
            qs = qs.filter(empresa_rut=empresa_rut)
        return qs

    @staticmethod
    def create(data):
        return Tienda.objects.create(**data)

    @staticmethod
    def update(pk, data):
        Tienda.objects.filter(pk=pk).update(**data)
        return Tienda.objects.get(pk=pk)

    @staticmethod
    def delete(pk):
        Tienda.objects.filter(pk=pk).delete()


class PedidoRepository:
    @staticmethod
    def get_all(empresa_rut=None):
        qs = Pedido.objects.prefetch_related('items').select_related('tienda').all()
        if empresa_rut:
            qs = qs.filter(empresa_rut=empresa_rut)
        return qs

    @staticmethod
    def get_by_id(pk):
        return Pedido.objects.prefetch_related('items').select_related('tienda').get(pk=pk)

    @staticmethod
    def get_by_tienda(tienda_id, empresa_rut=None):
        qs = Pedido.objects.filter(tienda_id=tienda_id).prefetch_related('items')
        if empresa_rut:
            qs = qs.filter(empresa_rut=empresa_rut)
        return qs

    @staticmethod
    def create(data):
        items_data = data.pop('items', [])
        pedido = Pedido.objects.create(**data)
        total = Decimal('0.00')
        for item in items_data:
            item_obj = ItemPedido.objects.create(pedido=pedido, **item)
            total += item_obj.subtotal
        if items_data:
            pedido.total = total
            pedido.save(update_fields=['total'])
        return pedido

    @staticmethod
    def update_estado(pk, estado):
        Pedido.objects.filter(pk=pk).update(estado=estado)
        return Pedido.objects.get(pk=pk)

    @staticmethod
    def get_by_estado(estado, empresa_rut=None):
        qs = Pedido.objects.filter(estado=estado)
        if empresa_rut:
            qs = qs.filter(empresa_rut=empresa_rut)
        return qs

    @staticmethod
    def delete(pk):
        Pedido.objects.filter(pk=pk).delete()


class PedidoFactory:
    @staticmethod
    def crear_pedido_estandar(cliente, email, notas=''):
        return {
            'cliente':       cliente,
            'email_cliente': email,
            'estado':        'PENDIENTE',
            'notas':         notas or 'Pedido estándar',
        }

    @staticmethod
    def crear_pedido_express(cliente, email):
        return {
            'cliente':       cliente,
            'email_cliente': email,
            'estado':        'PROCESANDO',
            'notas':         'Pedido express — procesamiento prioritario',
        }

    @staticmethod
    def crear_pedido_corporativo(cliente, email, notas=''):
        return {
            'cliente':       cliente,
            'email_cliente': email,
            'estado':        'PENDIENTE',
            'notas':         notas or 'Pedido corporativo — requiere validación adicional',
        }

    @classmethod
    def crear(cls, tipo, **kwargs):
        metodos = {
            'estandar':    cls.crear_pedido_estandar,
            'express':     cls.crear_pedido_express,
            'corporativo': cls.crear_pedido_corporativo,
        }
        return metodos.get(tipo, cls.crear_pedido_estandar)(**kwargs)