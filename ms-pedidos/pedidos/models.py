"""
models.py — Microservicio de Pedidos SmartLogix
Patrones:
  - Repository: PedidoRepository abstrae todo acceso a datos.
  - Factory Method: PedidoFactory crea pedidos con estructura inicial según tipo de cliente.
"""
from django.db import models
from decimal import Decimal


ESTADO_CHOICES = [
    ('PENDIENTE',   'Pendiente'),
    ('PROCESANDO',  'Procesando'),
    ('ENVIADO',     'Enviado'),
    ('ENTREGADO',   'Entregado'),
    ('CANCELADO',   'Cancelado'),
]


class Pedido(models.Model):
    cliente        = models.CharField(max_length=200)
    email_cliente  = models.EmailField()
    estado         = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='PENDIENTE')
    total          = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    notas          = models.TextField(blank=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_update   = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-fecha_creacion']

    def __str__(self):
        return f'Pedido #{self.id} — {self.cliente} [{self.estado}]'


class ItemPedido(models.Model):
    pedido         = models.ForeignKey(Pedido, related_name='items', on_delete=models.CASCADE)
    producto_id    = models.PositiveIntegerField()
    nombre_producto= models.CharField(max_length=200)
    cantidad       = models.PositiveIntegerField(default=1)
    precio_unitario= models.DecimalField(max_digits=12, decimal_places=2)

    @property
    def subtotal(self):
        return self.cantidad * self.precio_unitario

    def __str__(self):
        return f'{self.nombre_producto} x{self.cantidad}'


# ─── Patrón Repository ────────────────────────────────────────────────────────
class PedidoRepository:
    """
    Abstrae toda la lógica de persistencia de Pedido.
    Las vistas nunca acceden al ORM directamente.
    """

    @staticmethod
    def get_all():
        return Pedido.objects.prefetch_related('items').all()

    @staticmethod
    def get_by_id(pk: int) -> Pedido:
        return Pedido.objects.prefetch_related('items').get(pk=pk)

    @staticmethod
    def create(data: dict) -> Pedido:
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
    def update_estado(pk: int, estado: str) -> Pedido:
        Pedido.objects.filter(pk=pk).update(estado=estado)
        return Pedido.objects.get(pk=pk)

    @staticmethod
    def get_by_estado(estado: str):
        return Pedido.objects.filter(estado=estado)

    @staticmethod
    def delete(pk: int) -> None:
        Pedido.objects.filter(pk=pk).delete()


# ─── Patrón Factory Method ────────────────────────────────────────────────────
class PedidoFactory:
    """
    Crea pedidos con configuración inicial según el tipo de cliente.
    Facilita la extensión futura (e.g., cliente_vip, cliente_corporativo)
    sin modificar el código existente (principio Open/Closed).
    """

    @staticmethod
    def crear_pedido_estandar(cliente: str, email: str, notas: str = '') -> dict:
        return {
            'cliente': cliente,
            'email_cliente': email,
            'estado': 'PENDIENTE',
            'notas': notas or 'Pedido estándar',
        }

    @staticmethod
    def crear_pedido_express(cliente: str, email: str) -> dict:
        return {
            'cliente': cliente,
            'email_cliente': email,
            'estado': 'PROCESANDO',  # inicia directamente en procesamiento
            'notas': 'Pedido express — procesamiento prioritario',
        }

    @staticmethod
    def crear_pedido_corporativo(cliente: str, email: str, notas: str = '') -> dict:
        return {
            'cliente': cliente,
            'email_cliente': email,
            'estado': 'PENDIENTE',
            'notas': notas or 'Pedido corporativo — requiere validación adicional',
        }

    @classmethod
    def crear(cls, tipo: str, **kwargs) -> dict:
        """Método de fábrica principal."""
        metodos = {
            'estandar':    cls.crear_pedido_estandar,
            'express':     cls.crear_pedido_express,
            'corporativo': cls.crear_pedido_corporativo,
        }
        factory_fn = metodos.get(tipo, cls.crear_pedido_estandar)
        return factory_fn(**kwargs)
