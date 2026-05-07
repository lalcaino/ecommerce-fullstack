import time
import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)


# ─── Circuit Breaker ──────────────────────────────────────────────────────────
class CircuitBreaker:
    def __init__(self, failure_threshold: int = 3, timeout: int = 30):
        self.failure_threshold = failure_threshold
        self.timeout           = timeout
        self.failure_count     = 0
        self.state             = 'CLOSED'
        self.next_attempt      = None

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


# ─── Instancias ───────────────────────────────────────────────────────────────
_cb_inventario = CircuitBreaker()
_cb_pedidos    = CircuitBreaker()


def _headers():
    return {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }


# ─── FUNCIÓN CRÍTICA (FIX PRINCIPAL) ──────────────────────────────────────────
def safe_request(method, url, **kwargs):
    try:
        r = requests.request(
            method,
            url,
            headers=_headers(),
            timeout=2,  # 🔥 más rápido
            **kwargs
        )

        r.raise_for_status()

        if not r.text:
            return []

        return r.json()

    except Exception as e:
        logger.error("Gateway error %s %s → %s", method, url, e)
        raise e

# ─── API Gateway ──────────────────────────────────────────────────────────────
class MicroserviceGateway:

    # ── INVENTARIO ────────────────────────────────────────────────────────────
    @staticmethod
    def get_inventario():
        url = f"{settings.MS_INVENTARIO_URL}/api/productos/"
        return _cb_inventario.call(
            lambda: safe_request("GET", url)
        )

    @staticmethod
    def get_producto(pk):
        url = f"{settings.MS_INVENTARIO_URL}/api/productos/{pk}/"
        return _cb_inventario.call(
            lambda: safe_request("GET", url)
        )

    @staticmethod
    def create_producto(data):
        url = f"{settings.MS_INVENTARIO_URL}/api/productos/"
        return _cb_inventario.call(
            lambda: safe_request("POST", url, json=data)
        )

    @staticmethod
    def update_producto(pk, data):
        url = f"{settings.MS_INVENTARIO_URL}/api/productos/{pk}/"
        return _cb_inventario.call(
            lambda: safe_request("PUT", url, json=data)
        )

    @staticmethod
    def delete_producto(pk):
        url = f"{settings.MS_INVENTARIO_URL}/api/productos/{pk}/"
        return _cb_inventario.call(
            lambda: safe_request("DELETE", url)
        )

    # ── PEDIDOS ───────────────────────────────────────────────────────────────
    @staticmethod
    def get_pedidos():
        url = f"{settings.MS_PEDIDOS_URL}/api/pedidos/"
        return _cb_pedidos.call(
            lambda: safe_request("GET", url)
        )

    @staticmethod
    def get_pedido(pk):
        url = f"{settings.MS_PEDIDOS_URL}/api/pedidos/{pk}/"
        return _cb_pedidos.call(
            lambda: safe_request("GET", url)
        )

    @staticmethod
    def create_pedido(data):
        url = f"{settings.MS_PEDIDOS_URL}/api/pedidos/"
        return _cb_pedidos.call(
            lambda: safe_request("POST", url, json=data)
        )

    @staticmethod
    def patch_pedido(pk, data):
        url = f"{settings.MS_PEDIDOS_URL}/api/pedidos/{pk}/"
        return _cb_pedidos.call(
            lambda: safe_request("PATCH", url, json=data)
        )

    # ── ESTADO DE CIRCUITS ────────────────────────────────────────────────────
    @staticmethod
    def get_circuit_states():
        return {
            'inventario': _cb_inventario.get_state(),
            'pedidos':    _cb_pedidos.get_state(),
        }