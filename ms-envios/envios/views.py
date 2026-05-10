from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import (
    EnvioRepository, ParadaRepository, ConductorRepository,
    EnvioFactory, Parada,
)
from .serializers import (
    EnvioSerializer, EnvioListSerializer,
    PosicionUpdateSerializer, EstadoUpdateSerializer, RutaUpdateSerializer,
    ParadaSerializer, ConductorSerializer,
)


# ─── Conductores ─────────────────────────────────────────────────────────────

class ConductorListView(APIView):
    def get(self, request):
        solo_disponibles = request.query_params.get('disponibles') == 'true'
        qs = ConductorRepository.get_disponibles() if solo_disponibles else ConductorRepository.get_all()
        return Response(ConductorSerializer(qs, many=True).data)

    def post(self, request):
        s = ConductorSerializer(data=request.data)
        if s.is_valid():
            conductor = ConductorRepository.create(s.validated_data)
            return Response(ConductorSerializer(conductor).data, status=status.HTTP_201_CREATED)
        return Response(s.errors, status=status.HTTP_400_BAD_REQUEST)


class ConductorDetailView(APIView):
    def _get(self, pk):
        try:
            return ConductorRepository.get_by_id(pk), None
        except Exception:
            return None, Response({'detail': 'Conductor no encontrado'}, status=status.HTTP_404_NOT_FOUND)

    def get(self, request, pk):
        obj, err = self._get(pk)
        if err: return err
        return Response(ConductorSerializer(obj).data)

    def put(self, request, pk):
        obj, err = self._get(pk)
        if err: return err
        s = ConductorSerializer(obj, data=request.data, partial=True)
        if s.is_valid():
            updated = ConductorRepository.update(pk, s.validated_data)
            return Response(ConductorSerializer(updated).data)
        return Response(s.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        _, err = self._get(pk)
        if err: return err
        ConductorRepository.delete(pk)
        return Response(status=status.HTTP_204_NO_CONTENT)


# ─── Envíos ───────────────────────────────────────────────────────────────────

class EnvioListView(APIView):
    def get(self, request):
        envios = EnvioRepository.get_all()
        return Response(EnvioListSerializer(envios, many=True).data)

    def post(self, request):
        tipo = request.data.get('tipo_envio', 'estandar')
        data = dict(request.data)
        data.pop('tipo_envio', None)
        paradas_data = data.pop('paradas', [])

        # Aplicar factory si no trae estado explícito
        if 'estado' not in data:
            factory_fields = EnvioFactory.crear(tipo, **{
                k: data[k] for k in [
                    'pedido_id', 'origen_lat', 'origen_lon',
                    'destino_nombre', 'destino_lat', 'destino_lon',
                ] if k in data
            })
            data.update({k: v for k, v in factory_fields.items() if k not in data})

        data['paradas'] = paradas_data
        s = EnvioSerializer(data=data)
        if s.is_valid():
            envio = s.save()
            return Response(EnvioSerializer(envio).data, status=status.HTTP_201_CREATED)
        return Response(s.errors, status=status.HTTP_400_BAD_REQUEST)


class EnvioDetailView(APIView):
    def _get(self, pk):
        try:
            return EnvioRepository.get_by_id(pk), None
        except Exception:
            return None, Response({'detail': 'Envío no encontrado'}, status=status.HTTP_404_NOT_FOUND)

    def get(self, request, pk):
        envio, err = self._get(pk)
        if err: return err
        return Response(EnvioSerializer(envio).data)

    def delete(self, request, pk):
        _, err = self._get(pk)
        if err: return err
        EnvioRepository.delete(pk)
        return Response(status=status.HTTP_204_NO_CONTENT)


class EnvioEstadoView(APIView):
    """PATCH /api/envios/<pk>/estado/  → cambia estado del envío"""
    def patch(self, request, pk):
        try:
            EnvioRepository.get_by_id(pk)
        except Exception:
            return Response({'detail': 'Envío no encontrado'}, status=status.HTTP_404_NOT_FOUND)
        s = EstadoUpdateSerializer(data=request.data)
        if s.is_valid():
            envio = EnvioRepository.update_estado(pk, s.validated_data['estado'])
            return Response(EnvioListSerializer(envio).data)
        return Response(s.errors, status=status.HTTP_400_BAD_REQUEST)


class EnvioPosicionView(APIView):
    """PATCH /api/envios/<pk>/posicion/  → actualiza GPS del conductor"""
    def patch(self, request, pk):
        try:
            EnvioRepository.get_by_id(pk)
        except Exception:
            return Response({'detail': 'Envío no encontrado'}, status=status.HTTP_404_NOT_FOUND)
        s = PosicionUpdateSerializer(data=request.data)
        if s.is_valid():
            envio = EnvioRepository.update_posicion(pk, s.validated_data['lat'], s.validated_data['lon'])
            return Response(EnvioListSerializer(envio).data)
        return Response(s.errors, status=status.HTTP_400_BAD_REQUEST)


class EnvioRutaView(APIView):
    """PATCH /api/envios/<pk>/ruta/  → persiste la ruta GeoJSON calculada por Mapbox"""
    def patch(self, request, pk):
        try:
            EnvioRepository.get_by_id(pk)
        except Exception:
            return Response({'detail': 'Envío no encontrado'}, status=status.HTTP_404_NOT_FOUND)
        s = RutaUpdateSerializer(data=request.data)
        if s.is_valid():
            envio = EnvioRepository.update_ruta(
                pk,
                s.validated_data['ruta_geojson'],
                s.validated_data['distancia_km'],
                s.validated_data['duracion_min'],
            )
            return Response(EnvioSerializer(envio).data)
        return Response(s.errors, status=status.HTTP_400_BAD_REQUEST)


class EnvioEnCursoView(APIView):
    """GET /api/envios/en-curso/  → envíos activos para mapa en tiempo real"""
    def get(self, request):
        envios = EnvioRepository.get_en_curso()
        return Response(EnvioListSerializer(envios, many=True).data)


class EnvioPorPedidoView(APIView):
    """GET /api/envios/pedido/<pedido_id>/  → envío asociado a un pedido"""
    def get(self, request, pedido_id):
        envio = EnvioRepository.get_by_pedido(pedido_id)
        if not envio:
            return Response({'detail': 'No hay envío para este pedido'}, status=status.HTTP_404_NOT_FOUND)
        return Response(EnvioListSerializer(envio).data)


# ─── Paradas ─────────────────────────────────────────────────────────────────

class ParadaEstadoView(APIView):
    """PATCH /api/paradas/<pk>/estado/  → actualiza estado de una parada"""
    def patch(self, request, pk):
        try:
            Parada.objects.get(pk=pk)
        except Parada.DoesNotExist:
            return Response({'detail': 'Parada no encontrada'}, status=status.HTTP_404_NOT_FOUND)
        estado = request.data.get('estado')
        if not estado:
            return Response({'detail': 'Se requiere estado'}, status=status.HTTP_400_BAD_REQUEST)
        parada = ParadaRepository.update_estado(pk, estado)
        return Response(ParadaSerializer(parada).data)
