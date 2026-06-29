import random
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import (
    EnvioRepository, ParadaRepository, ConductorRepository,
    EnvioFactory, Parada, Envio, EventoRuta,
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


# ─── Envíos Cercanos ──────────────────────────────────────────────────────────

class EnvioCercanosView(APIView):
    """GET /api/envios/cercanos/?lat=X&lon=Y&radio_km=Z → envíos PENDIENTES sin repartidor cerca de la ubicación"""
    def get(self, request):
        try:
            lat_usuario = float(request.query_params.get('lat', 0))
            lon_usuario = float(request.query_params.get('lon', 0))
            radio_km    = float(request.query_params.get('radio_km', 10))
        except (TypeError, ValueError):
            return Response({'detail': 'lat, lon y radio_km son requeridos'}, status=status.HTTP_400_BAD_REQUEST)

        from django.db.models import Q
        from django.db.models.functions import Radians, Sin, Cos, ACos

        # Envíos PENDIENTES sin repartidor asignado, filtrados por empresa_rut
        empresa_rut = request.query_params.get('empresa_rut', '')
        qs = Envio.objects.filter(
            estado='PENDIENTE',
            repartidor_id__isnull=True,
        )
        if empresa_rut:
            qs = qs.filter(empresa_rut=empresa_rut)

        envios_cercanos = []
        for envio in qs:
            dlat = float(envio.origen_lat) - lat_usuario
            dlon = float(envio.origen_lon) - lon_usuario
            # Aproximación: 1 grado ≈ 111km
            dist_km = ((dlat ** 2 + dlon ** 2) ** 0.5) * 111
            if dist_km <= radio_km:
                envio_data = EnvioListSerializer(envio).data
                envio_data['distancia_km_repartidor'] = round(dist_km, 2)
                envios_cercanos.append(envio_data)

        envios_cercanos.sort(key=lambda e: e['distancia_km_repartidor'])
        return Response(envios_cercanos)


class EnvioTomarView(APIView):
    """POST /api/envios/<pk>/tomar/ → asigna repartidor y genera código de validación"""
    def post(self, request, pk):
        try:
            envio = EnvioRepository.get_by_id(pk)
        except Exception:
            return Response({'detail': 'Envío no encontrado'}, status=status.HTTP_404_NOT_FOUND)

        if envio.estado != 'PENDIENTE':
            return Response({'detail': 'El envío no está disponible'}, status=status.HTTP_400_BAD_REQUEST)
        if envio.repartidor_id:
            return Response({'detail': 'El envío ya tiene un repartidor asignado'}, status=status.HTTP_400_BAD_REQUEST)

        repartidor_id = request.data.get('repartidor_id')
        if not repartidor_id:
            return Response({'detail': 'repartidor_id es requerido'}, status=status.HTTP_400_BAD_REQUEST)

        codigo = ''.join(str(random.randint(0, 9)) for _ in range(6))
        envio.repartidor_id = int(repartidor_id)
        envio.codigo_validacion = codigo
        envio.estado = 'EN_RUTA'
        envio.save(update_fields=['repartidor_id', 'codigo_validacion', 'estado'])
        EventoRuta.objects.create(
            envio=envio, tipo='ESTADO',
            mensaje=f'Repartidor #{repartidor_id} tomó el envío. Código: {codigo}'
        )
        return Response({
            'detail': 'Envío asignado correctamente',
            'codigo_validacion': codigo,
            'envio': EnvioListSerializer(envio).data,
        })


class EnvioValidarPickupView(APIView):
    """POST /api/envios/<pk>/validar-pickup/ → valida código al recoger en tienda/bodega"""
    def post(self, request, pk):
        try:
            envio = EnvioRepository.get_by_id(pk)
        except Exception:
            return Response({'detail': 'Envío no encontrado'}, status=status.HTTP_404_NOT_FOUND)

        codigo = request.data.get('codigo_validacion', '')
        if not codigo:
            return Response({'detail': 'código de validación es requerido'}, status=status.HTTP_400_BAD_REQUEST)
        if envio.codigo_validacion != codigo:
            return Response({'detail': 'Código de validación incorrecto'}, status=status.HTTP_400_BAD_REQUEST)

        # Pedido cambia a ENVIADO cuando el repartidor retira
        envio.estado = 'EN_RUTA'
        envio.save(update_fields=['estado'])
        EventoRuta.objects.create(
            envio=envio, tipo='ESTADO',
            mensaje='Pickup validado — pedido en ruta'
        )
        return Response({
            'detail': 'Pickup validado correctamente. Pedido en ruta.',
            'envio': EnvioListSerializer(envio).data,
        })


class EnvioCompletarEntregaView(APIView):
    """POST /api/envios/<pk>/completar/ → sube foto, cambia estado a COMPLETADO"""
    def post(self, request, pk):
        try:
            envio = EnvioRepository.get_by_id(pk)
        except Exception:
            return Response({'detail': 'Envío no encontrado'}, status=status.HTTP_404_NOT_FOUND)

        foto_url = request.data.get('foto_entrega_url', '')
        if not foto_url:
            return Response({'detail': 'foto_entrega_url es requerida'}, status=status.HTTP_400_BAD_REQUEST)

        envio.foto_entrega_url = foto_url
        envio.estado = 'COMPLETADO'
        envio.save(update_fields=['foto_entrega_url', 'estado'])
        EventoRuta.objects.create(
            envio=envio, tipo='ESTADO',
            mensaje='Entrega completada — foto registrada'
        )
        return Response({
            'detail': 'Entrega completada exitosamente',
            'envio': EnvioListSerializer(envio).data,
        })


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
