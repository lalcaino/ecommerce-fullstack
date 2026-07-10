import time
import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)


class CircuitBreaker:
    def __init__(self, failure_threshold=3, timeout=10):
        self.failure_threshold = failure_threshold
        self.timeout = timeout
        self.failure_count = 0
        self.state = 'CLOSED'
        self.next_attempt = None

    def call(self, fn):
        if self.state == 'OPEN':
            if time.time() < self.next_attempt:
                raise RuntimeError('Circuit OPEN — servicio no disponible')
            self.state = 'HALF_OPEN'
        try:
            result = fn()
            self._on_success()
            return result
        except Exception as exc:
            self._on_failure()
            raise exc

    def _on_success(self):
        self.failure_count = 0
        self.state = 'CLOSED'

    def _on_failure(self):
        self.failure_count += 1
        if self.failure_count >= self.failure_threshold:
            self.state = 'OPEN'
            self.next_attempt = time.time() + self.timeout
            logger.warning('Circuit OPEN — retry en %ds', self.timeout)

    def get_state(self):
        return self.state


_cb_inventario = CircuitBreaker()
_cb_pedidos = CircuitBreaker()
_cb_envios = CircuitBreaker()


def _headers():
    return {'Content-Type': 'application/json', 'Accept': 'application/json'}


def safe_request(method, url, **kwargs):
    try:
        r = requests.request(method, url, headers=_headers(), timeout=2, **kwargs)
        if not r.ok:
            detail = r.json().get('detail', r.reason) if r.text else r.reason
            raise RuntimeError(detail)
        if not r.text:
            return []
        return r.json()
    except requests.exceptions.Timeout:
        raise RuntimeError(f'El servicio no respondió a tiempo ({url})')
    except requests.exceptions.ConnectionError:
        raise RuntimeError(f'No se pudo conectar con el servicio ({url})')
    except RuntimeError:
        raise
    except Exception as e:
        logger.error('Gateway error %s %s → %s', method, url, e)
        raise RuntimeError(str(e))


class MicroserviceGateway:

    # Inventario
    @staticmethod
    def get_inventario(empresa_rut=None):
        url = f"{settings.MS_INVENTARIO_URL}/api/productos/"
        if empresa_rut:
            url += f"?empresa_rut={empresa_rut}"
        return _cb_inventario.call(lambda: safe_request('GET', url))

    @staticmethod
    def get_producto(pk):
        url = f"{settings.MS_INVENTARIO_URL}/api/productos/{pk}/"
        return _cb_inventario.call(lambda: safe_request('GET', url))

    @staticmethod
    def create_producto(data):
        url = f"{settings.MS_INVENTARIO_URL}/api/productos/"
        return _cb_inventario.call(lambda: safe_request('POST', url, json=data))

    @staticmethod
    def update_producto(pk, data):
        url = f"{settings.MS_INVENTARIO_URL}/api/productos/{pk}/"
        return _cb_inventario.call(lambda: safe_request('PUT', url, json=data))

    @staticmethod
    def patch_producto(pk, data):
        url = f"{settings.MS_INVENTARIO_URL}/api/productos/{pk}/"
        return _cb_inventario.call(lambda: safe_request('PATCH', url, json=data))

    @staticmethod
    def delete_producto(pk):
        url = f"{settings.MS_INVENTARIO_URL}/api/productos/{pk}/"
        return _cb_inventario.call(lambda: safe_request('DELETE', url))

    # Bodegas
    @staticmethod
    def get_bodegas(empresa_rut=None):
        url = f"{settings.MS_INVENTARIO_URL}/api/bodegas/"
        if empresa_rut:
            url += f"?empresa_rut={empresa_rut}"
        return _cb_inventario.call(lambda: safe_request('GET', url))

    @staticmethod
    def get_bodega(pk):
        url = f"{settings.MS_INVENTARIO_URL}/api/bodegas/{pk}/"
        return _cb_inventario.call(lambda: safe_request('GET', url))

    @staticmethod
    def create_bodega(data):
        url = f"{settings.MS_INVENTARIO_URL}/api/bodegas/"
        return _cb_inventario.call(lambda: safe_request('POST', url, json=data))

    @staticmethod
    def update_bodega(pk, data):
        url = f"{settings.MS_INVENTARIO_URL}/api/bodegas/{pk}/"
        return _cb_inventario.call(lambda: safe_request('PUT', url, json=data))

    @staticmethod
    def delete_bodega(pk):
        url = f"{settings.MS_INVENTARIO_URL}/api/bodegas/{pk}/"
        return _cb_inventario.call(lambda: safe_request('DELETE', url))

    # Pedidos
    @staticmethod
    def get_pedidos(empresa_rut=None):
        url = f"{settings.MS_PEDIDOS_URL}/api/pedidos/"
        if empresa_rut:
            url += f"?empresa_rut={empresa_rut}"
        return _cb_pedidos.call(lambda: safe_request('GET', url))

    @staticmethod
    def get_pedido(pk):
        url = f"{settings.MS_PEDIDOS_URL}/api/pedidos/{pk}/"
        return _cb_pedidos.call(lambda: safe_request('GET', url))

    @staticmethod
    def create_pedido(data):
        url = f"{settings.MS_PEDIDOS_URL}/api/pedidos/"
        return _cb_pedidos.call(lambda: safe_request('POST', url, json=data))

    @staticmethod
    def patch_pedido(pk, data):
        url = f"{settings.MS_PEDIDOS_URL}/api/pedidos/{pk}/"
        return _cb_pedidos.call(lambda: safe_request('PATCH', url, json=data))

    # Tiendas
    @staticmethod
    def get_tiendas(empresa_rut=None):
        url = f"{settings.MS_PEDIDOS_URL}/api/tiendas/"
        if empresa_rut:
            url += f"?empresa_rut={empresa_rut}"
        return _cb_pedidos.call(lambda: safe_request('GET', url))

    @staticmethod
    def get_tienda(pk):
        url = f"{settings.MS_PEDIDOS_URL}/api/tiendas/{pk}/"
        return _cb_pedidos.call(lambda: safe_request('GET', url))

    @staticmethod
    def create_tienda(data):
        url = f"{settings.MS_PEDIDOS_URL}/api/tiendas/"
        return _cb_pedidos.call(lambda: safe_request('POST', url, json=data))

    @staticmethod
    def update_tienda(pk, data):
        url = f"{settings.MS_PEDIDOS_URL}/api/tiendas/{pk}/"
        return _cb_pedidos.call(lambda: safe_request('PUT', url, json=data))

    @staticmethod
    def delete_tienda(pk):
        url = f"{settings.MS_PEDIDOS_URL}/api/tiendas/{pk}/"
        return _cb_pedidos.call(lambda: safe_request('DELETE', url))

    # Envíos
    @staticmethod
    def get_envios(empresa_rut=None):
        url = f"{settings.MS_ENVIOS_URL}/api/envios/"
        if empresa_rut:
            url += f"?empresa_rut={empresa_rut}"
        return _cb_envios.call(lambda: safe_request('GET', url))

    @staticmethod
    def get_envio(pk):
        url = f"{settings.MS_ENVIOS_URL}/api/envios/{pk}/"
        return _cb_envios.call(lambda: safe_request('GET', url))

    @staticmethod
    def create_envio(data):
        url = f"{settings.MS_ENVIOS_URL}/api/envios/"
        return _cb_envios.call(lambda: safe_request('POST', url, json=data))

    @staticmethod
    def delete_envio(pk):
        url = f"{settings.MS_ENVIOS_URL}/api/envios/{pk}/"
        return _cb_envios.call(lambda: safe_request('DELETE', url))

    @staticmethod
    def update_estado_envio(pk, data):
        url = f"{settings.MS_ENVIOS_URL}/api/envios/{pk}/estado/"
        return _cb_envios.call(lambda: safe_request('PATCH', url, json=data))

    @staticmethod
    def update_posicion_envio(pk, data):
        url = f"{settings.MS_ENVIOS_URL}/api/envios/{pk}/posicion/"
        return _cb_envios.call(lambda: safe_request('PATCH', url, json=data))

    @staticmethod
    def update_ruta_envio(pk, data):
        url = f"{settings.MS_ENVIOS_URL}/api/envios/{pk}/ruta/"
        return _cb_envios.call(lambda: safe_request('PATCH', url, json=data))

    @staticmethod
    def get_envios_en_curso(empresa_rut=None):
        url = f"{settings.MS_ENVIOS_URL}/api/envios/en-curso/"
        if empresa_rut:
            url += f"?empresa_rut={empresa_rut}"
        return _cb_envios.call(lambda: safe_request('GET', url))

    @staticmethod
    def get_envio_por_pedido(pedido_id):
        url = f"{settings.MS_ENVIOS_URL}/api/envios/pedido/{pedido_id}/"
        return _cb_envios.call(lambda: safe_request('GET', url))

    @staticmethod
    def update_estado_parada(pk, data):
        url = f"{settings.MS_ENVIOS_URL}/api/paradas/{pk}/estado/"
        return _cb_envios.call(lambda: safe_request('PATCH', url, json=data))

    # Conductores
    @staticmethod
    def get_conductores(solo_disponibles=False, empresa_rut=None):
        params = []
        if solo_disponibles:
            params.append('disponibles=true')
        if empresa_rut:
            params.append(f"empresa_rut={empresa_rut}")
        qs = '&'.join(params)
        url = f"{settings.MS_ENVIOS_URL}/api/conductores/"
        if qs:
            url += f"?{qs}"
        return _cb_envios.call(lambda: safe_request('GET', url))

    @staticmethod
    def create_conductor(data):
        url = f"{settings.MS_ENVIOS_URL}/api/conductores/"
        return _cb_envios.call(lambda: safe_request('POST', url, json=data))

    @staticmethod
    def update_conductor(pk, data):
        url = f"{settings.MS_ENVIOS_URL}/api/conductores/{pk}/"
        return _cb_envios.call(lambda: safe_request('PUT', url, json=data))

    @staticmethod
    def delete_conductor(pk):
        url = f"{settings.MS_ENVIOS_URL}/api/conductores/{pk}/"
        return _cb_envios.call(lambda: safe_request('DELETE', url))

    # Inventario — ajustar stock
    @staticmethod
    def ajustar_stock_producto(pk, cantidad):
        url = f"{settings.MS_INVENTARIO_URL}/api/productos/{pk}/ajuste-stock/"
        return _cb_inventario.call(lambda: safe_request('POST', url, json={'cantidad': cantidad}))

    # Bodega espacio
    @staticmethod
    def get_bodega_espacio(pk, empresa_rut=None):
        url = f"{settings.MS_INVENTARIO_URL}/api/bodegas/{pk}/espacio/"
        if empresa_rut:
            url += f"?empresa_rut={empresa_rut}"
        return _cb_inventario.call(lambda: safe_request('GET', url))

    # Envíos cercanos
    @staticmethod
    def get_envios_cercanos(lat, lon, radio_km=10, empresa_rut=None):
        url = f"{settings.MS_ENVIOS_URL}/api/envios/cercanos/?lat={lat}&lon={lon}&radio_km={radio_km}"
        if empresa_rut:
            url += f"&empresa_rut={empresa_rut}"
        return _cb_envios.call(lambda: safe_request('GET', url))

    @staticmethod
    def tomar_envio(pk, data):
        url = f"{settings.MS_ENVIOS_URL}/api/envios/{pk}/tomar/"
        return _cb_envios.call(lambda: safe_request('POST', url, json=data))

    @staticmethod
    def validar_pickup_envio(pk, data):
        url = f"{settings.MS_ENVIOS_URL}/api/envios/{pk}/validar-pickup/"
        return _cb_envios.call(lambda: safe_request('POST', url, json=data))

    @staticmethod
    def completar_entrega_envio(pk, data):
        url = f"{settings.MS_ENVIOS_URL}/api/envios/{pk}/completar/"
        return _cb_envios.call(lambda: safe_request('POST', url, json=data))

    # Estado de los circuit breakers
    @staticmethod
    def get_circuit_states():
        return {
            'inventario': _cb_inventario.get_state(),
            'pedidos': _cb_pedidos.get_state(),
            'envios': _cb_envios.get_state()
        }
