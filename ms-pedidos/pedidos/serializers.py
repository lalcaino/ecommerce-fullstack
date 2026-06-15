from rest_framework import serializers
from .models import Pedido, ItemPedido, Tienda


class TiendaSerializer(serializers.ModelSerializer):
    total_pedidos = serializers.SerializerMethodField()

    class Meta:
        model  = Tienda
        fields = [
            'id', 'empresa_rut', 'nombre', 'direccion', 'ciudad',
            'bodega_id', 'activa', 'creado_en', 'total_pedidos',
        ]
        read_only_fields = ['id', 'creado_en']
        extra_kwargs = {
            'empresa_rut': {'required': False, 'allow_blank': True},
        }

    def get_total_pedidos(self, obj):
        return obj.pedidos.count()


class ItemPedidoSerializer(serializers.ModelSerializer):
    subtotal = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model  = ItemPedido
        fields = ['id', 'producto_id', 'nombre_producto', 'cantidad', 'precio_unitario', 'subtotal']


class PedidoSerializer(serializers.ModelSerializer):
    items             = ItemPedidoSerializer(many=True, required=False)
    tienda_nombre     = serializers.CharField(source='tienda.nombre', read_only=True)
    tienda_ciudad     = serializers.CharField(source='tienda.ciudad', read_only=True)
    bodega_id         = serializers.IntegerField(source='tienda.bodega_id', read_only=True)

    class Meta:
        model  = Pedido
        fields = [
            'id', 'empresa_rut', 'cliente', 'email_cliente', 'telefono_cliente',
            'direccion_entrega', 'latitud_entrega', 'longitud_entrega', 'estado', 'total', 'notas',
            'items', 'tienda', 'tienda_nombre', 'tienda_ciudad',
            'bodega_id', 'fecha_creacion', 'fecha_update',
        ]
        read_only_fields = ['id', 'total', 'fecha_creacion', 'fecha_update']
        extra_kwargs = {
            'empresa_rut': {'required': False, 'allow_blank': True},
        }


class EstadoUpdateSerializer(serializers.Serializer):
    estado = serializers.ChoiceField(choices=[
        'PENDIENTE', 'PROCESANDO', 'ENVIADO', 'ENTREGADO', 'CANCELADO'
    ])