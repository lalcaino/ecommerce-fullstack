from rest_framework import serializers
from .models import Producto


class ProductoSerializer(serializers.ModelSerializer):
    bajo_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model  = Producto
        fields = [
            'id', 'nombre', 'descripcion', 'tipo', 'precio',
            'stock', 'stock_minimo', 'bajo_stock',
            'peso_kg', 'url_descarga', 'duracion_dias',
            'activo', 'creado_en', 'actualizado_en',
        ]
        read_only_fields = ['id', 'creado_en', 'actualizado_en', 'bajo_stock']
