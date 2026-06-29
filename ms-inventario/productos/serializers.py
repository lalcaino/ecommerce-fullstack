from rest_framework import serializers
from .models import Producto, Bodega


class BodegaSerializer(serializers.ModelSerializer):
    total_productos      = serializers.SerializerMethodField()
    volumen_ocupado_cm3  = serializers.FloatField(read_only=True)
    volumen_disponible_cm3 = serializers.FloatField(read_only=True)

    class Meta:
        model = Bodega
        fields = ['id', 'empresa_rut', 'nombre', 'direccion', 'latitud', 'longitud',
                  'capacidad', 'capacidad_volumen_cm3', 'volumen_ocupado_cm3',
                  'volumen_disponible_cm3', 'activa', 'creado_en', 'total_productos']
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
            'peso_kg', 'volumen_cm3', 'url_descarga', 'duracion_dias', 'imagen_url',
            'activo', 'bodega', 'bodega_nombre',
            'creado_en', 'actualizado_en',
        ]
        read_only_fields = ['id', 'creado_en', 'actualizado_en', 'bajo_stock']
        extra_kwargs = {
            'empresa_rut': {'required': False, 'allow_blank': True},
        }