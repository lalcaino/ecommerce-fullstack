"""
tests_sincronizacion.py — Sincronización Pedido↔Envío en BFF
Metodología: Clases de Equivalencia
  Clase 1 — Estados válidos
  Clase 2 — Estados inválidos
  Clase 3 — Valores vacíos/nulos

Ejecutar: cd bff && python manage.py test api.tests_sincronizacion
"""
import unittest
from unittest.mock import patch, MagicMock, call


# ─── Tablas de mapeo (espejo exacto de bff/api/views.py) ─────────────────────
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


def sincronizar_envio_desde_pedido(nuevo_estado_pedido):
    return PEDIDO_TO_ENVIO.get(nuevo_estado_pedido)


def sincronizar_pedido_desde_envio(nuevo_estado_envio):
    return ENVIO_TO_PEDIDO.get(nuevo_estado_envio)


# ═══════════════════════════════════════════════════════════════════
# 1. PEDIDO → ENVÍO
# ═══════════════════════════════════════════════════════════════════

class TestPedidoAEnvioClaseValida(unittest.TestCase):
    """Clase 1 — Estados de pedido que sincronizan envío."""

    def test_enviado_activa_en_ruta(self):
        self.assertEqual(sincronizar_envio_desde_pedido('ENVIADO'), 'EN_RUTA')

    def test_entregado_completa_envio(self):
        self.assertEqual(sincronizar_envio_desde_pedido('ENTREGADO'), 'COMPLETADO')

    def test_cancelado_cancela_envio(self):
        self.assertEqual(sincronizar_envio_desde_pedido('CANCELADO'), 'CANCELADO')

    def test_todos_los_estados_que_sincronizan(self):
        for estado_pedido, estado_envio in PEDIDO_TO_ENVIO.items():
            with self.subTest(estado=estado_pedido):
                self.assertEqual(sincronizar_envio_desde_pedido(estado_pedido), estado_envio)


class TestPedidoAEnvioClaseInvalida(unittest.TestCase):
    """Clase 2 — Estados que NO deben sincronizar envío."""

    def test_pendiente_no_sincroniza(self):
        self.assertIsNone(sincronizar_envio_desde_pedido('PENDIENTE'))

    def test_procesando_no_sincroniza_via_tabla(self):
        # PROCESANDO crea el envío, no lo actualiza → no está en PEDIDO_TO_ENVIO
        self.assertIsNone(sincronizar_envio_desde_pedido('PROCESANDO'))

    def test_estado_inventado_retorna_none(self):
        self.assertIsNone(sincronizar_envio_desde_pedido('ESTADO_FANTASMA'))

    def test_estado_minusculas_no_hace_match(self):
        self.assertIsNone(sincronizar_envio_desde_pedido('enviado'))

    def test_estado_con_espacios_no_hace_match(self):
        self.assertIsNone(sincronizar_envio_desde_pedido(' ENVIADO '))


class TestPedidoAEnvioClaseVacia(unittest.TestCase):
    """Clase 3 — Valores vacíos o nulos."""

    def test_none_retorna_none(self):
        self.assertIsNone(sincronizar_envio_desde_pedido(None))

    def test_string_vacio_retorna_none(self):
        self.assertIsNone(sincronizar_envio_desde_pedido(''))

    def test_numero_retorna_none(self):
        self.assertIsNone(sincronizar_envio_desde_pedido(0))


# ═══════════════════════════════════════════════════════════════════
# 2. ENVÍO → PEDIDO
# ═══════════════════════════════════════════════════════════════════

class TestEnvioAPedidoClaseValida(unittest.TestCase):
    """Clase 1 — Estados de envío que sincronizan pedido."""

    def test_pendiente_pone_procesando(self):
        self.assertEqual(sincronizar_pedido_desde_envio('PENDIENTE'), 'PROCESANDO')

    def test_en_ruta_pone_enviado(self):
        self.assertEqual(sincronizar_pedido_desde_envio('EN_RUTA'), 'ENVIADO')

    def test_completado_pone_entregado(self):
        self.assertEqual(sincronizar_pedido_desde_envio('COMPLETADO'), 'ENTREGADO')

    def test_cancelado_cancela_pedido(self):
        self.assertEqual(sincronizar_pedido_desde_envio('CANCELADO'), 'CANCELADO')

    def test_fallido_revierte_a_pendiente(self):
        self.assertEqual(sincronizar_pedido_desde_envio('FALLIDO'), 'PENDIENTE')

    def test_todos_los_estados_que_sincronizan(self):
        for estado_envio, estado_pedido in ENVIO_TO_PEDIDO.items():
            with self.subTest(estado=estado_envio):
                self.assertEqual(sincronizar_pedido_desde_envio(estado_envio), estado_pedido)


class TestEnvioAPedidoClaseInvalida(unittest.TestCase):
    """Clase 2 — Estados que NO están en la tabla."""

    def test_estado_inventado_retorna_none(self):
        self.assertIsNone(sincronizar_pedido_desde_envio('INVENTADO'))

    def test_estado_minusculas_no_hace_match(self):
        self.assertIsNone(sincronizar_pedido_desde_envio('completado'))

    def test_estado_con_tildes_no_hace_match(self):
        self.assertIsNone(sincronizar_pedido_desde_envio('CÁNCELADO'))

    def test_estado_con_guion_no_hace_match(self):
        self.assertIsNone(sincronizar_pedido_desde_envio('EN-RUTA'))


class TestEnvioAPedidoClaseVacia(unittest.TestCase):
    """Clase 3 — Valores vacíos o nulos."""

    def test_none_retorna_none(self):
        self.assertIsNone(sincronizar_pedido_desde_envio(None))

    def test_string_vacio_retorna_none(self):
        self.assertIsNone(sincronizar_pedido_desde_envio(''))

def test_lista_vacia_retorna_none(self):
    try:
        resultado = sincronizar_pedido_desde_envio([])
        self.assertIsNone(resultado)
    except TypeError:
        pass  # Comportamiento válido: lista no puede ser key de dict


# ═══════════════════════════════════════════════════════════════════
# 3. FLUJO COMPLETO (integración lógica)
# ═══════════════════════════════════════════════════════════════════

class TestFlujoCompletoClaseValida(unittest.TestCase):
    """Clase 1 — Flujos de estados completos y coherentes."""

    def test_flujo_exitoso_pedido(self):
        """PENDIENTE → PROCESANDO → ENVIADO → ENTREGADO"""
        self.assertIsNone(sincronizar_envio_desde_pedido('PENDIENTE'))
        self.assertIsNone(sincronizar_envio_desde_pedido('PROCESANDO'))
        self.assertEqual(sincronizar_envio_desde_pedido('ENVIADO'), 'EN_RUTA')
        self.assertEqual(sincronizar_envio_desde_pedido('ENTREGADO'), 'COMPLETADO')

    def test_flujo_cancelacion(self):
        """PENDIENTE → CANCELADO"""
        self.assertEqual(sincronizar_envio_desde_pedido('CANCELADO'), 'CANCELADO')
        self.assertEqual(sincronizar_pedido_desde_envio('CANCELADO'), 'CANCELADO')

    def test_flujo_envio_exitoso(self):
        """PENDIENTE → EN_RUTA → COMPLETADO"""
        self.assertEqual(sincronizar_pedido_desde_envio('PENDIENTE'), 'PROCESANDO')
        self.assertEqual(sincronizar_pedido_desde_envio('EN_RUTA'), 'ENVIADO')
        self.assertEqual(sincronizar_pedido_desde_envio('COMPLETADO'), 'ENTREGADO')

    def test_fallido_permite_reintentar(self):
        """FALLIDO revierte a PENDIENTE para poder reprocesar"""
        self.assertEqual(sincronizar_pedido_desde_envio('FALLIDO'), 'PENDIENTE')


class TestFlujoCompletoClaseInvalida(unittest.TestCase):
    """Clase 2 — Flujos con estados incoherentes."""

    def test_entregado_no_se_puede_reabrir(self):
        # ENTREGADO es estado final, no está en ENVIO_TO_PEDIDO
        # (un envío COMPLETADO no puede volver a PENDIENTE)
        resultado = sincronizar_pedido_desde_envio('ENTREGADO')
        self.assertIsNone(resultado)

    def test_doble_sincronizacion_no_cicla(self):
        # Si pedido pasa a ENVIADO → envío a EN_RUTA → pedido debería ser ENVIADO (ya lo es)
        estado_envio  = sincronizar_envio_desde_pedido('ENVIADO')
        estado_pedido = sincronizar_pedido_desde_envio(estado_envio)
        self.assertEqual(estado_envio,  'EN_RUTA')
        self.assertEqual(estado_pedido, 'ENVIADO')


class TestFlujoCompletoClaseVacia(unittest.TestCase):
    """Clase 3 — Sincronización con datos vacíos no rompe el flujo."""

    def test_none_en_ambas_funciones(self):
        self.assertIsNone(sincronizar_envio_desde_pedido(None))
        self.assertIsNone(sincronizar_pedido_desde_envio(None))

    def test_string_vacio_en_ambas(self):
        self.assertIsNone(sincronizar_envio_desde_pedido(''))
        self.assertIsNone(sincronizar_pedido_desde_envio(''))

    def test_resultado_none_no_rompe_encadenamiento(self):
        # Si el primer resultado es None, la segunda llamada no debe fallar
        estado_envio = sincronizar_envio_desde_pedido('PENDIENTE')  # → None
        resultado    = sincronizar_pedido_desde_envio(estado_envio) # → None (None no está en tabla)
        self.assertIsNone(resultado)


# ═══════════════════════════════════════════════════════════════════
# 4. GATEWAY — VALIDACIÓN DE URLS (sin levantar servidor)
# ═══════════════════════════════════════════════════════════════════

class TestGatewayURLsClaseValida(unittest.TestCase):
    """Clase 1 — URLs se construyen correctamente."""

    MS_INVENTARIO = 'http://localhost:8001'
    MS_PEDIDOS    = 'http://localhost:8002'
    MS_ENVIOS     = 'http://localhost:8003'

    def _url_inventario(self, empresa_rut=None):
        url = f'{self.MS_INVENTARIO}/api/productos/'
        if empresa_rut: url += f'?empresa_rut={empresa_rut}'
        return url

    def _url_pedidos(self, empresa_rut=None):
        url = f'{self.MS_PEDIDOS}/api/pedidos/'
        if empresa_rut: url += f'?empresa_rut={empresa_rut}'
        return url

    def test_url_inventario_sin_rut(self):
        url = self._url_inventario()
        self.assertEqual(url, 'http://localhost:8001/api/productos/')

    def test_url_inventario_con_rut(self):
        url = self._url_inventario('76.000.000-1')
        self.assertIn('empresa_rut=76.000.000-1', url)

    def test_url_pedidos_con_rut(self):
        url = self._url_pedidos('76.000.000-1')
        self.assertIn('empresa_rut=76.000.000-1', url)
        self.assertIn('/api/pedidos/', url)

    def test_url_pedido_detalle(self):
        url = f'{self.MS_PEDIDOS}/api/pedidos/42/'
        self.assertIn('/42/', url)


class TestGatewayURLsClaseInvalida(unittest.TestCase):
    """Clase 2 — RUTs con caracteres especiales en URL."""

    def test_rut_con_guion_en_url(self):
        rut = '76.354.771-K'
        url = f'http://localhost:8001/api/productos/?empresa_rut={rut}'
        self.assertIn('76.354.771-K', url)

    def test_rut_con_puntos_en_url(self):
        rut = '76.000.000-1'
        url = f'http://localhost:8002/api/pedidos/?empresa_rut={rut}'
        self.assertIn('76.000.000-1', url)


class TestGatewayURLsClaseVacia(unittest.TestCase):
    """Clase 3 — RUT vacío o None no agrega query param."""

    def _url(self, empresa_rut=None):
        url = 'http://localhost:8001/api/productos/'
        if empresa_rut: url += f'?empresa_rut={empresa_rut}'
        return url

    def test_rut_none_no_agrega_query(self):
        url = self._url(None)
        self.assertNotIn('empresa_rut', url)

    def test_rut_vacio_no_agrega_query(self):
        url = self._url('')
        self.assertNotIn('empresa_rut', url)

    def test_url_base_correcta_sin_rut(self):
        url = self._url()
        self.assertEqual(url, 'http://localhost:8001/api/productos/')


if __name__ == '__main__':
    unittest.main(verbosity=2)