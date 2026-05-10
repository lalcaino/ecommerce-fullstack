import logging
import concurrent.futures
from datetime import date
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from .gateway import MicroserviceGateway

logger = logging.getLogger(__name__)


def _handle_error(exc, default_msg='Error al comunicarse con el microservicio'):
    logger.error('%s: %s', default_msg, exc)
    return Response({'detail': str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)


# Inventario
class InventarioListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            return Response(MicroserviceGateway.get_inventario())
        except Exception as exc:
            return _handle_error(exc)

    def post(self, request):
        try:
            data = MicroserviceGateway.create_producto(request.data)
            return Response(data, status=status.HTTP_201_CREATED)
        except Exception as exc:
            return _handle_error(exc)


class InventarioDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            return Response(MicroserviceGateway.get_producto(pk))
        except Exception as exc:
            return _handle_error(exc)

    def put(self, request, pk):
        try:
            return Response(MicroserviceGateway.update_producto(pk, request.data))
        except Exception as exc:
            return _handle_error(exc)

    def delete(self, request, pk):
        try:
            MicroserviceGateway.delete_producto(pk)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as exc:
            return _handle_error(exc)


# Pedidos
class PedidosListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            return Response(MicroserviceGateway.get_pedidos())
        except Exception as exc:
            return _handle_error(exc)

    def post(self, request):
        try:
            data = MicroserviceGateway.create_pedido(request.data)
            return Response(data, status=status.HTTP_201_CREATED)
        except Exception as exc:
            return _handle_error(exc)


class PedidosDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            return Response(MicroserviceGateway.get_pedido(pk))
        except Exception as exc:
            return _handle_error(exc)

    def patch(self, request, pk):
        try:
            return Response(MicroserviceGateway.patch_pedido(pk, request.data))
        except Exception as exc:
            return _handle_error(exc)


# Bodegas
class BodegasListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            return Response(MicroserviceGateway.get_bodegas())
        except Exception as exc:
            return _handle_error(exc)

    def post(self, request):
        try:
            data = MicroserviceGateway.create_bodega(request.data)
            return Response(data, status=status.HTTP_201_CREATED)
        except Exception as exc:
            return _handle_error(exc)


class BodegasDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            return Response(MicroserviceGateway.get_bodega(pk))
        except Exception as exc:
            return _handle_error(exc)

    def put(self, request, pk):
        try:
            return Response(MicroserviceGateway.update_bodega(pk, request.data))
        except Exception as exc:
            return _handle_error(exc)

    def delete(self, request, pk):
        try:
            MicroserviceGateway.delete_bodega(pk)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as exc:
            return _handle_error(exc)


# Tiendas
class TiendasListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            return Response(MicroserviceGateway.get_tiendas())
        except Exception as exc:
            return _handle_error(exc)

    def post(self, request):
        try:
            data = MicroserviceGateway.create_tienda(request.data)
            return Response(data, status=status.HTTP_201_CREATED)
        except Exception as exc:
            return _handle_error(exc)


class TiendasDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            return Response(MicroserviceGateway.get_tienda(pk))
        except Exception as exc:
            return _handle_error(exc)

    def put(self, request, pk):
        try:
            return Response(MicroserviceGateway.update_tienda(pk, request.data))
        except Exception as exc:
            return _handle_error(exc)

    def delete(self, request, pk):
        try:
            MicroserviceGateway.delete_tienda(pk)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as exc:
            return _handle_error(exc)


# Dashboard
class DashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        summary = {
            'total_productos': 0,
            'productos_bajo_stock': 0,
            'pedidos_hoy': 0,
            'pedidos_pendientes': 0,
            'pedidos_recientes': [],
            'total_bodegas': 0,
            'total_tiendas': 0,
            'circuit_breakers': {},
        }

        try:
            summary['circuit_breakers'] = MicroserviceGateway.get_circuit_states()
        except Exception as e:
            logger.warning('Error circuit breakers: %s', e)

        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
            future_inventario = executor.submit(MicroserviceGateway.get_inventario)
            future_pedidos = executor.submit(MicroserviceGateway.get_pedidos)
            future_bodegas = executor.submit(MicroserviceGateway.get_bodegas)
            future_tiendas = executor.submit(MicroserviceGateway.get_tiendas)

            try:
                productos = future_inventario.result(timeout=3) or []
                summary['total_productos'] = len(productos)
                summary['productos_bajo_stock'] = sum(
                    1 for p in productos
                    if p.get('stock', 0) <= p.get('stock_minimo', 5)
                )
            except Exception as exc:
                logger.warning('Dashboard inventario error: %s', exc)

            try:
                pedidos = future_pedidos.result(timeout=3) or []
                hoy = date.today().isoformat()
                summary['pedidos_hoy'] = sum(
                    1 for p in pedidos
                    if str(p.get('fecha_creacion', ''))[:10] == hoy
                )
                summary['pedidos_pendientes'] = sum(
                    1 for p in pedidos if p.get('estado') == 'PENDIENTE'
                )
                summary['pedidos_recientes'] = sorted(
                    pedidos,
                    key=lambda p: p.get('fecha_creacion', ''),
                    reverse=True
                )[:5]
            except Exception as exc:
                logger.warning('Dashboard pedidos error: %s', exc)

            try:
                bodegas = future_bodegas.result(timeout=3) or []
                summary['total_bodegas'] = len(bodegas)
            except Exception as exc:
                logger.warning('Dashboard bodegas error: %s', exc)

            try:
                tiendas = future_tiendas.result(timeout=3) or []
                summary['total_tiendas'] = len(tiendas)
            except Exception as exc:
                logger.warning('Dashboard tiendas error: %s', exc)

        return Response(summary)
    
class EnviosListView(APIView):
    permission_classes = [IsAuthenticated]
 
    def get(self, request):
        try:
            return Response(MicroserviceGateway.get_envios())
        except Exception as exc:
            return _handle_error(exc)
 
    def post(self, request):
        try:
            data = MicroserviceGateway.create_envio(request.data)
            return Response(data, status=status.HTTP_201_CREATED)
        except Exception as exc:
            return _handle_error(exc)
 
 
class EnviosDetailView(APIView):
    permission_classes = [IsAuthenticated]
 
    def get(self, request, pk):
        try:
            return Response(MicroserviceGateway.get_envio(pk))
        except Exception as exc:
            return _handle_error(exc)
 
    def delete(self, request, pk):
        try:
            MicroserviceGateway.delete_envio(pk)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as exc:
            return _handle_error(exc)
 
 
class EnviosEstadoView(APIView):
    permission_classes = [IsAuthenticated]
 
    def patch(self, request, pk):
        try:
            return Response(MicroserviceGateway.update_estado_envio(pk, request.data))
        except Exception as exc:
            return _handle_error(exc)
 
 
class EnviosPosicionView(APIView):
    permission_classes = [IsAuthenticated]
 
    def patch(self, request, pk):
        try:
            return Response(MicroserviceGateway.update_posicion_envio(pk, request.data))
        except Exception as exc:
            return _handle_error(exc)
 
 
class EnviosRutaView(APIView):
    permission_classes = [IsAuthenticated]
 
    def patch(self, request, pk):
        try:
            return Response(MicroserviceGateway.update_ruta_envio(pk, request.data))
        except Exception as exc:
            return _handle_error(exc)
 
 
class EnviosEnCursoView(APIView):
    permission_classes = [IsAuthenticated]
 
    def get(self, request):
        try:
            return Response(MicroserviceGateway.get_envios_en_curso())
        except Exception as exc:
            return _handle_error(exc)
 
 
class EnviosPorPedidoView(APIView):
    permission_classes = [IsAuthenticated]
 
    def get(self, request, pedido_id):
        try:
            return Response(MicroserviceGateway.get_envio_por_pedido(pedido_id))
        except Exception as exc:
            return _handle_error(exc)
 
 
class ParadaEstadoView(APIView):
    permission_classes = [IsAuthenticated]
 
    def patch(self, request, pk):
        try:
            return Response(MicroserviceGateway.update_estado_parada(pk, request.data))
        except Exception as exc:
            return _handle_error(exc)
 
 
# Conductores
class ConductoresListView(APIView):
    permission_classes = [IsAuthenticated]
 
    def get(self, request):
        try:
            solo_disponibles = request.query_params.get('disponibles') == 'true'
            return Response(MicroserviceGateway.get_conductores(solo_disponibles))
        except Exception as exc:
            return _handle_error(exc)
 
    def post(self, request):
        try:
            data = MicroserviceGateway.create_conductor(request.data)
            return Response(data, status=status.HTTP_201_CREATED)
        except Exception as exc:
            return _handle_error(exc)
 
 
class ConductoresDetailView(APIView):
    permission_classes = [IsAuthenticated]
 
    def put(self, request, pk):
        try:
            return Response(MicroserviceGateway.update_conductor(pk, request.data))
        except Exception as exc:
            return _handle_error(exc)
 
    def delete(self, request, pk):
        try:
            MicroserviceGateway.delete_conductor(pk)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as exc:
            return _handle_error(exc)

