from rest_framework import serializers
from .models import Producto, Bodega


class BodegaSerializer(serializers.ModelSerializer):
    total_productos = serializers.SerializerMethodField()

    class Meta:
        model = Bodega
        fields = ['id', 'empresa_rut', 'nombre', 'direccion', 'capacidad', 'activa', 'creado_en', 'total_productos']
        read_only_fields = ['id', 'creado_en']
        extra_kwargs = {
            'empresa_rut': {'required': False, 'allow_blank': True},
        }

    def get_total_productos(self, obj):
        return obj.productos.count()


class ProductoSerializer(serializers.ModelSerializer):
    bajo_stock = serializers.BooleanField(read_only=True)
    bodega_nombre = serializers.CharField(source='bodega.nombre', read_only=True)

    class Meta:
        model = Producto
        fields = [
            'id', 'empresa_rut', 'nombre', 'descripcion', 'tipo', 'precio',
            'stock', 'stock_minimo', 'bajo_stock',
            'peso_kg', 'url_descarga', 'duracion_dias', 'imagen_url',
            'activo', 'bodega', 'bodega_nombre',
            'creado_en', 'actualizado_en',
        ]
        read_only_fields = ['id', 'creado_en', 'actualizado_en', 'bajo_stock']
        extra_kwargs = {
            'empresa_rut': {'required': False, 'allow_blank': True},
        }