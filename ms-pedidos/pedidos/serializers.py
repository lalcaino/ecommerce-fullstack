from rest_framework import serializers
from .models import Pedido, ItemPedido


class ItemPedidoSerializer(serializers.ModelSerializer):
    subtotal = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model  = ItemPedido
        fields = ['id', 'producto_id', 'nombre_producto', 'cantidad', 'precio_unitario', 'subtotal']


class PedidoSerializer(serializers.ModelSerializer):
    items = ItemPedidoSerializer(many=True, required=False)

    class Meta:
        model  = Pedido
        fields = [
            'id', 'cliente', 'email_cliente', 'estado', 'total',
            'notas', 'items', 'fecha_creacion', 'fecha_update',
        ]
        read_only_fields = ['id', 'total', 'fecha_creacion', 'fecha_update']


class EstadoUpdateSerializer(serializers.Serializer):
    estado = serializers.ChoiceField(choices=[
        'PENDIENTE', 'PROCESANDO', 'ENVIADO', 'ENTREGADO', 'CANCELADO'
    ])
