from rest_framework import serializers
from .models import Conductor, Envio, Parada, EventoRuta


class ConductorSerializer(serializers.ModelSerializer):
    total_envios = serializers.SerializerMethodField()

    class Meta:
        model  = Conductor
        fields = ['id', 'nombre', 'telefono', 'patente', 'disponible', 'creado_en', 'total_envios']
        read_only_fields = ['id', 'creado_en']

    def get_total_envios(self, obj):
        return obj.envios.count()


class ParadaSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Parada
        fields = ['id', 'orden', 'pedido_id', 'nombre', 'direccion',
                  'lat', 'lon', 'estado', 'notas', 'llegada_real', 'creado_en']
        read_only_fields = ['id', 'creado_en']


class EventoRutaSerializer(serializers.ModelSerializer):
    class Meta:
        model  = EventoRuta
        fields = ['id', 'tipo', 'lat', 'lon', 'mensaje', 'creado_en']
        read_only_fields = ['id', 'creado_en']


class EnvioSerializer(serializers.ModelSerializer):
    paradas          = ParadaSerializer(many=True, required=False)
    eventos          = EventoRutaSerializer(many=True, read_only=True)
    conductor_nombre = serializers.CharField(source='conductor.nombre', read_only=True)
    conductor_tel    = serializers.CharField(source='conductor.telefono', read_only=True)

    class Meta:
        model  = Envio
        fields = [
            'id', 'pedido_id', 'conductor', 'conductor_nombre', 'conductor_tel',
            'tipo', 'estado',
            'origen_nombre', 'origen_lat', 'origen_lon',
            'destino_nombre', 'destino_lat', 'destino_lon',
            'pos_lat', 'pos_lon', 'pos_actualizada',
            'ruta_geojson', 'distancia_km', 'duracion_min',
            'paradas', 'eventos',
            'notas', 'fecha_estimada', 'fecha_creacion', 'fecha_update',
        ]
        read_only_fields = ['id', 'fecha_creacion', 'fecha_update', 'eventos']

    def create(self, validated_data):
        from .models import EnvioRepository
        return EnvioRepository.create(validated_data)


class EnvioListSerializer(serializers.ModelSerializer):
    """Versión liviana para listados (sin eventos ni ruta GeoJSON)."""
    conductor_nombre = serializers.CharField(source='conductor.nombre', read_only=True)
    paradas          = ParadaSerializer(many=True, read_only=True)

    class Meta:
        model  = Envio
        fields = [
            'id', 'pedido_id', 'conductor', 'conductor_nombre',
            'tipo', 'estado',
            'origen_nombre', 'origen_lat', 'origen_lon',
            'destino_nombre', 'destino_lat', 'destino_lon',
            'pos_lat', 'pos_lon', 'pos_actualizada',
            'distancia_km', 'duracion_min',
            'paradas', 'fecha_estimada', 'fecha_creacion',
        ]


class PosicionUpdateSerializer(serializers.Serializer):
    lat = serializers.DecimalField(max_digits=10, decimal_places=7)
    lon = serializers.DecimalField(max_digits=10, decimal_places=7)


class EstadoUpdateSerializer(serializers.Serializer):
    estado = serializers.ChoiceField(choices=[
        'PENDIENTE', 'EN_RUTA', 'COMPLETADO', 'FALLIDO', 'CANCELADO'
    ])


class RutaUpdateSerializer(serializers.Serializer):
    ruta_geojson  = serializers.JSONField()
    distancia_km  = serializers.DecimalField(max_digits=8, decimal_places=2)
    duracion_min  = serializers.IntegerField()
