"""
views.py — BFF SmartLogix
El BFF agrega, transforma y optimiza respuestas para el frontend React.
No contiene lógica de negocio; orquesta llamadas a microservicios.
"""
import logging
from datetime import date
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .gateway import MicroserviceGateway

logger = logging.getLogger(__name__)


def _handle_error(exc, default_msg='Error al comunicarse con el microservicio'):
    logger.error('%s: %s', default_msg, exc)
    return Response({'detail': str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)


# ─── Inventario Proxy Views ───────────────────────────────────────────────────
class InventarioListView(APIView):
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


# ─── Pedidos Proxy Views ──────────────────────────────────────────────────────
class PedidosListView(APIView):
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


from rest_framework.views import APIView
from rest_framework.response import Response
from datetime import date
import logging
import concurrent.futures

logger = logging.getLogger(__name__)


class DashboardView(APIView):
    def get(self, request):

        summary = {
            'total_productos': 0,
            'productos_bajo_stock': 0,
            'pedidos_hoy': 0,
            'pedidos_pendientes': 0,
            'pedidos_recientes': [],
            'circuit_breakers': {},
        }

        # Circuit breakers (siempre rápido)
        try:
            summary['circuit_breakers'] = MicroserviceGateway.get_circuit_states()
        except Exception as e:
            logger.warning("Error circuit breakers: %s", e)

        # 🔥 LLAMADAS EN PARALELO
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
            future_inventario = executor.submit(
                MicroserviceGateway.get_inventario
            )
            future_pedidos = executor.submit(
                MicroserviceGateway.get_pedidos
            )

            # ─── INVENTARIO ─────────────────────────────────────────
            try:
                productos = future_inventario.result(timeout=3) or []

                summary['total_productos'] = len(productos)
                summary['productos_bajo_stock'] = sum(
                    1 for p in productos
                    if p.get('stock', 0) <= p.get('stock_minimo', 5)
                )

            except Exception as exc:
                logger.warning('Dashboard inventario error: %s', exc)

            # ─── PEDIDOS ────────────────────────────────────────────
            try:
                pedidos = future_pedidos.result(timeout=3) or []

                hoy = date.today().isoformat()

                summary['pedidos_hoy'] = sum(
                    1 for p in pedidos
                    if str(p.get('fecha_creacion', ''))[:10] == hoy
                )

                summary['pedidos_pendientes'] = sum(
                    1 for p in pedidos
                    if p.get('estado') == 'PENDIENTE'
                )

                summary['pedidos_recientes'] = sorted(
                    pedidos,
                    key=lambda p: p.get('fecha_creacion', ''),
                    reverse=True
                )[:5]

            except Exception as exc:
                logger.warning('Dashboard pedidos error: %s', exc)

        return Response(summary)