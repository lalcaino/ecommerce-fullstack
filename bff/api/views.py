import logging
import concurrent.futures
from datetime import date
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from .gateway import MicroserviceGateway
from .cloudinary_views import eliminar_imagen_cloudinary

logger = logging.getLogger(__name__)

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


def _get_empresa_rut(request):
    """Extrae el empresa_rut del token JWT del request."""
    try:
        return request.auth.get('empresa_rut', '') if request.auth else ''
    except Exception:
        return ''


def _get_envio_de_pedido(pedido_id):
    try:
        return MicroserviceGateway.get_envio_por_pedido(pedido_id)
    except Exception:
        return None


def _crear_envio_para_pedido(pedido: dict, empresa_rut: str = ''):
    pedido_id      = pedido.get('id')
    destino_nombre = (
        pedido.get('direccion_entrega')
        or f"Pedido #{pedido_id} — {pedido.get('cliente', 'Cliente')}"
    )
    envio_data = {
        'pedido_id':      pedido_id,
        'empresa_rut':    empresa_rut,
        'tipo':           'ESTANDAR',
        'estado':         'PENDIENTE',
        'origen_nombre':  'Bodega Central SmartLogix',
        'origen_lat':     str(BODEGA_CENTRAL_LAT),
        'origen_lon':     str(BODEGA_CENTRAL_LON),
        'destino_nombre': destino_nombre,
        'destino_lat':    str(pedido.get('latitud_entrega') or SANTIAGO_LAT),
        'destino_lon':    str(pedido.get('longitud_entrega') or SANTIAGO_LON),
        'notas': f"Pedido de {pedido.get('cliente', '')}",
    }
    try:
        result = MicroserviceGateway.create_envio(envio_data)
        logger.info('Envío creado para pedido #%s', pedido_id)
        return result
    except Exception as e:
        logger.warning('No se pudo crear envío: %s', e)
        return None


def _sincronizar_envio_desde_pedido(pedido_id, nuevo_estado_pedido, pedido, empresa_rut=''):
    if nuevo_estado_pedido == 'PROCESANDO':
        envio = _get_envio_de_pedido(pedido_id)
        if not envio:
            _crear_envio_para_pedido(pedido, empresa_rut)
        elif envio.get('estado') in ('CANCELADO', 'FALLIDO'):
            try:
                MicroserviceGateway.update_estado_envio(envio['id'], {'estado': 'PENDIENTE'})
            except Exception as e:
                logger.warning('No se pudo reactivar envío: %s', e)
        return
    nuevo_estado_envio = PEDIDO_TO_ENVIO.get(nuevo_estado_pedido)
    if not nuevo_estado_envio:
        return
    envio = _get_envio_de_pedido(pedido_id)
    if not envio:
        return
    try:
        MicroserviceGateway.update_estado_envio(envio['id'], {'estado': nuevo_estado_envio})
    except Exception as e:
        logger.warning('No se pudo sincronizar envío: %s', e)


def _sincronizar_pedido_desde_envio(envio, nuevo_estado_envio):
    pedido_id = envio.get('pedido_id')
    if not pedido_id:
        return
    nuevo_estado_pedido = ENVIO_TO_PEDIDO.get(nuevo_estado_envio)
    if not nuevo_estado_pedido:
        return
    try:
        MicroserviceGateway.patch_pedido(pedido_id, {'estado': nuevo_estado_pedido})
    except Exception as e:
        logger.warning('No se pudo sincronizar pedido: %s', e)


# ─── Vistas ───────────────────────────────────────────────────────────────────

class InventarioListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            empresa_rut = _get_empresa_rut(request)
            return Response(MicroserviceGateway.get_inventario(empresa_rut=empresa_rut))
        except Exception as exc:
            return _handle_error(exc)

    def post(self, request):
        try:
            empresa_rut = _get_empresa_rut(request)
            data = dict(request.data)
            data['empresa_rut'] = empresa_rut
            return Response(MicroserviceGateway.create_producto(data), status=status.HTTP_201_CREATED)
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
            try:
                producto = MicroserviceGateway.get_producto(pk)
                if producto.get('imagen_url'):
                    public_id = f'smartlogix/productos/producto_{pk}'
                    eliminar_imagen_cloudinary(public_id)
            except Exception:
                pass
            MicroserviceGateway.delete_producto(pk)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as exc:
            return _handle_error(exc)


class PedidosListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            empresa_rut = _get_empresa_rut(request)
            return Response(MicroserviceGateway.get_pedidos(empresa_rut=empresa_rut))
        except Exception as exc:
            return _handle_error(exc)

    def post(self, request):
        try:
            empresa_rut = _get_empresa_rut(request)
            data = dict(request.data)
            data['empresa_rut'] = empresa_rut
            return Response(MicroserviceGateway.create_pedido(data), status=status.HTTP_201_CREATED)
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
            empresa_rut    = _get_empresa_rut(request)
            nuevo_estado   = request.data.get('estado', '')
            pedido_actualizado = MicroserviceGateway.patch_pedido(pk, request.data)
            if nuevo_estado:
                _sincronizar_envio_desde_pedido(pk, nuevo_estado, pedido_actualizado, empresa_rut)
            return Response(pedido_actualizado)
        except Exception as exc:
            return _handle_error(exc)


class BodegasListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            empresa_rut = _get_empresa_rut(request)
            return Response(MicroserviceGateway.get_bodegas(empresa_rut=empresa_rut))
        except Exception as exc:
            return _handle_error(exc)

    def post(self, request):
        try:
            empresa_rut = _get_empresa_rut(request)
            data = dict(request.data)
            data['empresa_rut'] = empresa_rut
            return Response(MicroserviceGateway.create_bodega(data), status=status.HTTP_201_CREATED)
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
            empresa_rut = _get_empresa_rut(request)
            return Response(MicroserviceGateway.get_tiendas(empresa_rut=empresa_rut))
        except Exception as exc:
            return _handle_error(exc)

    def post(self, request):
        try:
            empresa_rut = _get_empresa_rut(request)
            data = dict(request.data)
            data['empresa_rut'] = empresa_rut
            return Response(MicroserviceGateway.create_tienda(data), status=status.HTTP_201_CREATED)
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
        empresa_rut = _get_empresa_rut(request)
        summary = {
            'total_productos': 0, 'productos_bajo_stock': 0,
            'pedidos_hoy': 0, 'pedidos_pendientes': 0,
            'pedidos_recientes': [], 'total_bodegas': 0,
            'total_tiendas': 0, 'circuit_breakers': {},
            'empresa_rut': empresa_rut,
        }
        try:
            summary['circuit_breakers'] = MicroserviceGateway.get_circuit_states()
        except Exception as e:
            logger.warning('Error circuit breakers: %s', e)

        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
            future_inventario = executor.submit(MicroserviceGateway.get_inventario, empresa_rut=empresa_rut)
            future_pedidos    = executor.submit(MicroserviceGateway.get_pedidos,    empresa_rut=empresa_rut)
            future_bodegas    = executor.submit(MicroserviceGateway.get_bodegas,    empresa_rut=empresa_rut)
            future_tiendas    = executor.submit(MicroserviceGateway.get_tiendas,    empresa_rut=empresa_rut)

            try:
                productos = future_inventario.result(timeout=3) or []
                summary['total_productos'] = len(productos)
                summary['productos_bajo_stock'] = sum(
                    1 for p in productos if p.get('stock', 0) <= p.get('stock_minimo', 5)
                )
            except Exception as exc:
                logger.warning('Dashboard inventario error: %s', exc)

            try:
                pedidos = future_pedidos.result(timeout=3) or []
                hoy = date.today().isoformat()
                summary['pedidos_hoy'] = sum(
                    1 for p in pedidos if str(p.get('fecha_creacion', ''))[:10] == hoy
                )
                summary['pedidos_pendientes'] = sum(
                    1 for p in pedidos if p.get('estado') == 'PENDIENTE'
                )
                summary['pedidos_recientes'] = sorted(
                    pedidos, key=lambda p: p.get('fecha_creacion', ''), reverse=True
                )[:5]
            except Exception as exc:
                logger.warning('Dashboard pedidos error: %s', exc)

            try:
                summary['total_bodegas'] = len(future_bodegas.result(timeout=3) or [])
            except Exception as exc:
                logger.warning('Dashboard bodegas error: %s', exc)

            try:
                summary['total_tiendas'] = len(future_tiendas.result(timeout=3) or [])
            except Exception as exc:
                logger.warning('Dashboard tiendas error: %s', exc)

        return Response(summary)


class EnviosListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            empresa_rut = _get_empresa_rut(request)
            return Response(MicroserviceGateway.get_envios(empresa_rut=empresa_rut))
        except Exception as exc:
            return _handle_error(exc)

    def post(self, request):
        try:
            empresa_rut = _get_empresa_rut(request)
            data = dict(request.data)
            data['empresa_rut'] = empresa_rut
            return Response(MicroserviceGateway.create_envio(data), status=status.HTTP_201_CREATED)
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
            envio_actualizado  = MicroserviceGateway.update_estado_envio(pk, request.data)
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
            empresa_rut = _get_empresa_rut(request)
            return Response(MicroserviceGateway.get_envios_en_curso(empresa_rut=empresa_rut))
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
            empresa_rut      = _get_empresa_rut(request)
            solo_disponibles = request.query_params.get('disponibles') == 'true'
            return Response(MicroserviceGateway.get_conductores(solo_disponibles, empresa_rut=empresa_rut))
        except Exception as exc:
            return _handle_error(exc)

    def post(self, request):
        try:
            empresa_rut = _get_empresa_rut(request)
            data = dict(request.data)
            data['empresa_rut'] = empresa_rut
            return Response(MicroserviceGateway.create_conductor(data), status=status.HTTP_201_CREATED)
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