from rest_framework import serializers
from .models import Pedido, ItemPedido, Tienda


class TiendaSerializer(serializers.ModelSerializer):
    total_pedidos = serializers.SerializerMethodField()

    class Meta:
        model = Tienda
        fields = ['id', 'nombre', 'direccion', 'ciudad', 'activa', 'creado_en', 'total_pedidos']
        read_only_fields = ['id', 'creado_en']

    def get_total_pedidos(self, obj):
        return obj.pedidos.count()


class ItemPedidoSerializer(serializers.ModelSerializer):
    subtotal = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model = ItemPedido
        fields = ['id', 'producto_id', 'nombre_producto', 'cantidad', 'precio_unitario', 'subtotal']


class PedidoSerializer(serializers.ModelSerializer):
    items = ItemPedidoSerializer(many=True, required=False)
    tienda_nombre = serializers.CharField(source='tienda.nombre', read_only=True)

    class Meta:
        model = Pedido
        fields = [
            'id', 'cliente', 'email_cliente', 'estado', 'total',
            'notas', 'items', 'tienda', 'tienda_nombre',
            'fecha_creacion', 'fecha_update',
        ]
        read_only_fields = ['id', 'total', 'fecha_creacion', 'fecha_update']


class EstadoUpdateSerializer(serializers.Serializer):
    estado = serializers.ChoiceField(choices=[
        'PENDIENTE', 'PROCESANDO', 'ENVIADO', 'ENTREGADO', 'CANCELADO'
    ])