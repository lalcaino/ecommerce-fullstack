import logging
import concurrent.futures
from datetime import date
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from .gateway import MicroserviceGateway

logger = logging.getLogger(__name__)

# ─── Mapeo canónico de estados ────────────────────────────────────────────────
#
# Pedido → Envío  (cuando cambia el pedido)
# PENDIENTE   → (sin envío aún)
# PROCESANDO  → PENDIENTE     ← crea el envío si no existe
# ENVIADO     → EN_RUTA       ← activa seguimiento en mapa
# ENTREGADO   → COMPLETADO
# CANCELADO   → CANCELADO
#
# Envío → Pedido  (cuando cambia el envío desde la sección Envíos)
# PENDIENTE   → PROCESANDO
# EN_RUTA     → ENVIADO
# COMPLETADO  → ENTREGADO
# CANCELADO   → CANCELADO
# FALLIDO     → PENDIENTE     ← vuelve a re-despachar

PEDIDO_TO_ENVIO = {
    'ENVIADO':   'EN_RUTA',
    'ENTREGADO': 'COMPLETADO',
    'CANCELADO': 'CANCELADO',
}

ENVIO_TO_PEDIDO = {
    'PENDIENTE':  'PROCESANDO',
    'EN_RUTA':    'ENVIADO',
    'COMPLETADO': 'ENTREGADO',
    'CANCELADO':  'CANCELADO',
    'FALLIDO':    'PENDIENTE',
}

BODEGA_CENTRAL_LAT = -33.4372
BODEGA_CENTRAL_LON = -70.6506
SANTIAGO_LAT       = -33.4489
SANTIAGO_LON       = -70.6693


def _handle_error(exc, default_msg='Error al comunicarse con el microservicio'):
    logger.error('%s: %s', default_msg, exc)
    return Response({'detail': str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)


def _get_envio_de_pedido(pedido_id):
    """Retorna el envío asociado a un pedido, o None si no existe o da error."""
    try:
        return MicroserviceGateway.get_envio_por_pedido(pedido_id)
    except Exception:
        return None


def _crear_envio_para_pedido(pedido: dict):
    """Crea un envío PENDIENTE para el pedido. Best-effort."""
    pedido_id      = pedido.get('id')
    destino_nombre = (
        pedido.get('direccion_entrega')
        or f"Pedido #{pedido_id} — {pedido.get('cliente', 'Cliente')}"
    )
    cliente  = pedido.get('cliente', '')
    telefono = pedido.get('telefono_cliente', '')

    envio_data = {
        'pedido_id':      pedido_id,
        'tipo':           'ESTANDAR',
        'estado':         'PENDIENTE',
        'origen_nombre':  'Bodega Central SmartLogix',
        'origen_lat':     str(BODEGA_CENTRAL_LAT),
        'origen_lon':     str(BODEGA_CENTRAL_LON),
        'destino_nombre': destino_nombre,
        'destino_lat':    str(SANTIAGO_LAT),
        'destino_lon':    str(SANTIAGO_LON),
        'notas': (
            f'Pedido de {cliente}'
            + (f' — Tel: {telefono}' if telefono else '')
        ),
    }
    try:
        result = MicroserviceGateway.create_envio(envio_data)
        logger.info('Envío creado para pedido #%s → envío #%s', pedido_id, result.get('id'))
        return result
    except Exception as e:
        logger.warning('No se pudo crear envío para pedido #%s: %s', pedido_id, e)
        return None


def _sincronizar_envio_desde_pedido(pedido_id: int, nuevo_estado_pedido: str, pedido: dict):
    """
    Mantiene el envío en sync cuando cambia el estado del pedido.
    """
    if nuevo_estado_pedido == 'PROCESANDO':
        envio = _get_envio_de_pedido(pedido_id)
        if not envio:
            _crear_envio_para_pedido(pedido)
        elif envio.get('estado') in ('CANCELADO', 'FALLIDO'):
            # Reactivar envío existente
            try:
                MicroserviceGateway.update_estado_envio(envio['id'], {'estado': 'PENDIENTE'})
            except Exception as e:
                logger.warning('No se pudo reactivar envío #%s: %s', envio['id'], e)
        return

    nuevo_estado_envio = PEDIDO_TO_ENVIO.get(nuevo_estado_pedido)
    if not nuevo_estado_envio:
        return  # PENDIENTE u otros sin acción

    envio = _get_envio_de_pedido(pedido_id)
    if not envio:
        return

    try:
        MicroserviceGateway.update_estado_envio(envio['id'], {'estado': nuevo_estado_envio})
        logger.info(
            'Pedido #%s→%s  ∴  Envío #%s→%s',
            pedido_id, nuevo_estado_pedido, envio['id'], nuevo_estado_envio,
        )
    except Exception as e:
        logger.warning('No se pudo sincronizar envío #%s: %s', envio['id'], e)


def _sincronizar_pedido_desde_envio(envio: dict, nuevo_estado_envio: str):
    """
    Mantiene el pedido en sync cuando cambia el estado del envío.
    """
    pedido_id = envio.get('pedido_id')
    if not pedido_id:
        return

    nuevo_estado_pedido = ENVIO_TO_PEDIDO.get(nuevo_estado_envio)
    if not nuevo_estado_pedido:
        return

    try:
        MicroserviceGateway.patch_pedido(pedido_id, {'estado': nuevo_estado_pedido})
        logger.info(
            'Envío #%s→%s  ∴  Pedido #%s→%s',
            envio.get('id'), nuevo_estado_envio, pedido_id, nuevo_estado_pedido,
        )
    except Exception as e:
        logger.warning('No se pudo sincronizar pedido #%s: %s', pedido_id, e)


# ─── Vistas ───────────────────────────────────────────────────────────────────

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
            nuevo_estado = request.data.get('estado', '')

            # 1. Actualizar pedido en ms-pedidos
            pedido_actualizado = MicroserviceGateway.patch_pedido(pk, request.data)

            # 2. Mantener envío en sync (best-effort)
            if nuevo_estado:
                _sincronizar_envio_desde_pedido(pk, nuevo_estado, pedido_actualizado)

            return Response(pedido_actualizado)
        except Exception as exc:
            return _handle_error(exc)


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
            future_pedidos    = executor.submit(MicroserviceGateway.get_pedidos)
            future_bodegas    = executor.submit(MicroserviceGateway.get_bodegas)
            future_tiendas    = executor.submit(MicroserviceGateway.get_tiendas)

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
                    reverse=True,
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


# ── Envíos ────────────────────────────────────────────────────────────────────

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
            nuevo_estado_envio = request.data.get('estado', '')

            # 1. Actualizar estado del envío en ms-envios
            envio_actualizado = MicroserviceGateway.update_estado_envio(pk, request.data)

            # 2. Mantener pedido en sync (best-effort)
            if nuevo_estado_envio:
                _sincronizar_pedido_desde_envio(envio_actualizado, nuevo_estado_envio)

            return Response(envio_actualizado)
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