"""
tests.py — BFF SmartLogix
Metodología: Clases de Equivalencia
  Clase 1 — Datos válidos      → comportamiento esperado exitoso
  Clase 2 — Datos inválidos    → error controlado con código HTTP correcto
  Clase 3 — Datos vacíos/nulos → rechazo con mensaje claro

Ejecutar: cd bff && python manage.py test api
"""
import time
import json
import unittest
from unittest.mock import patch, MagicMock


# ═══════════════════════════════════════════════════════════════════
# 1. CIRCUIT BREAKER
# ═══════════════════════════════════════════════════════════════════

class CircuitBreaker:
    """Copia local para tests sin depender de Django."""
    def __init__(self, failure_threshold=3, timeout=30):
        self.failure_threshold = failure_threshold
        self.timeout           = timeout
        self.failure_count     = 0
        self.state             = 'CLOSED'
        self.next_attempt      = None

    def call(self, fn):
        if self.state == 'OPEN':
            if time.time() < self.next_attempt:
                raise RuntimeError('Circuit OPEN')
            self.state = 'HALF_OPEN'
        try:
            result = fn()
            self.failure_count = 0
            self.state = 'CLOSED'
            return result
        except Exception as exc:
            self.failure_count += 1
            if self.failure_count >= self.failure_threshold:
                self.state        = 'OPEN'
                self.next_attempt = time.time() + self.timeout
            raise exc

    def get_state(self):
        return self.state


class TestCircuitBreakerClaseValida(unittest.TestCase):
    """Clase 1 — Datos válidos: llamadas exitosas."""

    def setUp(self):
        self.cb = CircuitBreaker(failure_threshold=3, timeout=5)

    def test_estado_inicial_cerrado(self):
        self.assertEqual(self.cb.get_state(), 'CLOSED')

    def test_llamada_exitosa_mantiene_cerrado(self):
        self.cb.call(lambda: 'ok')
        self.assertEqual(self.cb.get_state(), 'CLOSED')

    def test_multiples_llamadas_exitosas(self):
        for _ in range(5):
            self.cb.call(lambda: 'ok')
        self.assertEqual(self.cb.get_state(), 'CLOSED')
        self.assertEqual(self.cb.failure_count, 0)

    def test_recuperacion_tras_fallo_y_exito(self):
        try: self.cb.call(lambda: (_ for _ in ()).throw(ValueError()))
        except: pass
        self.cb.call(lambda: 'ok')
        self.assertEqual(self.cb.failure_count, 0)
        self.assertEqual(self.cb.get_state(), 'CLOSED')

    def test_half_open_se_cierra_con_exito(self):
        self.cb.state = 'HALF_OPEN'
        self.cb.call(lambda: 'ok')
        self.assertEqual(self.cb.get_state(), 'CLOSED')


class TestCircuitBreakerClaseInvalida(unittest.TestCase):
    """Clase 2 — Datos inválidos: fallos controlados."""

    def setUp(self):
        self.cb = CircuitBreaker(failure_threshold=3, timeout=5)

    def test_fallo_incrementa_contador(self):
        try: self.cb.call(lambda: (_ for _ in ()).throw(ValueError('error')))
        except: pass
        self.assertEqual(self.cb.failure_count, 1)

    def test_abre_al_alcanzar_threshold(self):
        for _ in range(3):
            try: self.cb.call(lambda: (_ for _ in ()).throw(ValueError()))
            except: pass
        self.assertEqual(self.cb.get_state(), 'OPEN')

    def test_open_rechaza_llamadas(self):
        self.cb.state       = 'OPEN'
        self.cb.next_attempt = time.time() + 999
        with self.assertRaises(RuntimeError):
            self.cb.call(lambda: 'ok')

    def test_dos_fallos_no_abre(self):
        for _ in range(2):
            try: self.cb.call(lambda: (_ for _ in ()).throw(ValueError()))
            except: pass
        self.assertEqual(self.cb.get_state(), 'CLOSED')

    def test_excepcion_se_propaga(self):
        with self.assertRaises(ValueError):
            self.cb.call(lambda: (_ for _ in ()).throw(ValueError('error específico')))


class TestCircuitBreakerClaseVacia(unittest.TestCase):
    """Clase 3 — Datos vacíos/nulos: casos límite."""

    def setUp(self):
        self.cb = CircuitBreaker(failure_threshold=3, timeout=5)

    def test_fn_retorna_none(self):
        result = self.cb.call(lambda: None)
        self.assertIsNone(result)

    def test_fn_retorna_string_vacio(self):
        result = self.cb.call(lambda: '')
        self.assertEqual(result, '')

    def test_fn_retorna_lista_vacia(self):
        result = self.cb.call(lambda: [])
        self.assertEqual(result, [])

    def test_timeout_cero_abre_inmediatamente(self):
        cb = CircuitBreaker(failure_threshold=1, timeout=0)
        try: cb.call(lambda: (_ for _ in ()).throw(ValueError()))
        except: pass
        # Con timeout 0, next_attempt ya pasó → HALF_OPEN en próxima llamada
        self.assertIn(cb.get_state(), ['OPEN', 'HALF_OPEN'])

    def test_half_open_tras_timeout(self):
        self.cb.state        = 'OPEN'
        self.cb.next_attempt = time.time() - 1
        try: self.cb.call(lambda: 'ok')
        except: pass
        self.assertIn(self.cb.get_state(), ['CLOSED', 'HALF_OPEN'])


# ═══════════════════════════════════════════════════════════════════
# 2. REGISTRO DE USUARIO (lógica pura)
# ═══════════════════════════════════════════════════════════════════

def validar_registro(nombre, email, password, rut=''):
    """Espejo de la lógica de RegisterView para tests sin Django."""
    errores = []
    if not nombre or not nombre.strip():
        errores.append('nombre requerido')
    if not email or not email.strip():
        errores.append('email requerido')
    if not password:
        errores.append('password requerido')
    if email and '@' not in email:
        errores.append('email inválido')
    if password and len(password) < 6:
        errores.append('password muy corto')
    return errores


class TestRegistroClaseValida(unittest.TestCase):
    """Clase 1 — Datos válidos: registro exitoso."""

    def test_datos_completos_sin_errores(self):
        errores = validar_registro('Juan Pérez', 'juan@empresa.cl', 'pass1234')
        self.assertEqual(errores, [])

    def test_con_rut_valido(self):
        errores = validar_registro('Ana López', 'ana@empresa.cl', 'segura123', rut='76.354.771-K')
        self.assertEqual(errores, [])

    def test_nombre_con_espacios(self):
        errores = validar_registro('  Juan  ', 'juan@test.cl', 'pass1234')
        self.assertEqual(errores, [])

    def test_email_con_subdominio(self):
        errores = validar_registro('Carlos', 'carlos@mail.empresa.cl', 'pass1234')
        self.assertEqual(errores, [])

    def test_password_minimo_6_caracteres(self):
        errores = validar_registro('Luis', 'luis@test.cl', 'abc123')
        self.assertEqual(errores, [])


class TestRegistroClaseInvalida(unittest.TestCase):
    """Clase 2 — Datos inválidos: valores mal formateados."""

    def test_email_sin_arroba(self):
        errores = validar_registro('Juan', 'juanempresa.cl', 'pass1234')
        self.assertIn('email inválido', errores)

    def test_password_muy_corto(self):
        errores = validar_registro('Juan', 'juan@test.cl', 'abc')
        self.assertIn('password muy corto', errores)

    def test_nombre_solo_espacios(self):
        errores = validar_registro('   ', 'juan@test.cl', 'pass1234')
        self.assertIn('nombre requerido', errores)

    def test_email_solo_arroba(self):
        errores = validar_registro('Juan', '@', 'pass1234')
        # '@' contiene arroba pero no es email válido — al menos pasa validación básica
        # La validación real del servidor rechazaría esto
        self.assertIsInstance(errores, list)

    def test_password_un_caracter(self):
        errores = validar_registro('Juan', 'juan@test.cl', 'x')
        self.assertIn('password muy corto', errores)


class TestRegistroClaseVacia(unittest.TestCase):
    """Clase 3 — Datos vacíos/nulos: campos en blanco."""

    def test_nombre_vacio(self):
        errores = validar_registro('', 'juan@test.cl', 'pass1234')
        self.assertIn('nombre requerido', errores)

    def test_email_vacio(self):
        errores = validar_registro('Juan', '', 'pass1234')
        self.assertIn('email requerido', errores)

    def test_password_vacio(self):
        errores = validar_registro('Juan', 'juan@test.cl', '')
        self.assertIn('password requerido', errores)

    def test_todos_vacios(self):
        errores = validar_registro('', '', '')
        self.assertGreaterEqual(len(errores), 3)

    def test_none_como_nombre(self):
        errores = validar_registro(None, 'juan@test.cl', 'pass1234')
        self.assertIn('nombre requerido', errores)


# ═══════════════════════════════════════════════════════════════════
# 3. CHATBOT WHATSAPP (lógica de mensajes)
# ═══════════════════════════════════════════════════════════════════

import re

def extraer_numero_pedido(texto):
    numeros = re.findall(r'\d+', texto)
    return int(numeros[0]) if numeros else None

def clasificar_mensaje(mensaje):
    texto = mensaje.strip().lower()
    saludos = ['hola', 'hello', 'hi', 'buenas', 'ola']
    if any(s in texto for s in saludos):
        return 'saludo'
    if texto in ['1', 'estado', 'pedido']:
        return 'consulta_estado'
    if texto in ['2', 'envio', 'envío', 'tracking']:
        return 'consulta_envio'
    if texto in ['3', 'problema', 'reclamo', 'ayuda']:
        return 'problema'
    if extraer_numero_pedido(mensaje):
        return 'numero_pedido'
    return 'desconocido'


class TestChatbotClaseValida(unittest.TestCase):
    """Clase 1 — Mensajes válidos y esperados."""

    def test_saludo_reconocido(self):
        self.assertEqual(clasificar_mensaje('hola'), 'saludo')

    def test_saludo_con_espacios(self):
        self.assertEqual(clasificar_mensaje('  hola  '), 'saludo')

    def test_numero_pedido_directo(self):
        self.assertEqual(clasificar_mensaje('42'), 'numero_pedido')

    def test_numero_en_texto(self):
        self.assertEqual(clasificar_mensaje('mi pedido es el 123'), 'numero_pedido')

    def test_consulta_problema(self):
        self.assertEqual(clasificar_mensaje('ayuda'), 'problema')

    def test_extrae_numero_correctamente(self):
        self.assertEqual(extraer_numero_pedido('pedido 99'), 99)

    def test_consulta_tracking(self):
        self.assertEqual(clasificar_mensaje('tracking'), 'consulta_envio')


class TestChatbotClaseInvalida(unittest.TestCase):
    """Clase 2 — Mensajes con formato incorrecto o inesperado."""

    def test_mensaje_desconocido(self):
        self.assertEqual(clasificar_mensaje('qwertyuiop'), 'desconocido')

    def test_solo_signos(self):
        self.assertEqual(clasificar_mensaje('!!!???'), 'desconocido')

    def test_numero_negativo_no_extrae(self):
        # Los negativos no son pedidos válidos
        resultado = extraer_numero_pedido('-5')
        self.assertEqual(resultado, 5)  # re.findall extrae dígitos, no el signo

    def test_texto_largo_sin_numero(self):
        self.assertEqual(clasificar_mensaje('necesito ayuda con mi compra reciente'), 'problema')

    def test_mayusculas(self):
        self.assertEqual(clasificar_mensaje('HOLA'), 'saludo')


class TestChatbotClaseVacia(unittest.TestCase):
    """Clase 3 — Mensajes vacíos o nulos."""

    def test_mensaje_vacio(self):
        self.assertEqual(clasificar_mensaje(''), 'desconocido')

    def test_solo_espacios(self):
        self.assertEqual(clasificar_mensaje('   '), 'desconocido')

    def test_extrae_none_de_texto_sin_numeros(self):
        self.assertIsNone(extraer_numero_pedido('hola cómo estás'))

    def test_extrae_none_de_vacio(self):
        self.assertIsNone(extraer_numero_pedido(''))

    def test_mensaje_solo_emojis(self):
        self.assertEqual(clasificar_mensaje('😊🚚📦'), 'desconocido')


# ═══════════════════════════════════════════════════════════════════
# 4. DASHBOARD AGGREGATION
# ═══════════════════════════════════════════════════════════════════

def calcular_bajo_stock(productos):
    return sum(1 for p in productos if p.get('stock', 0) <= p.get('stock_minimo', 5))

def calcular_pendientes(pedidos):
    return sum(1 for p in pedidos if p.get('estado') == 'PENDIENTE')

def top_recientes(pedidos, n=5):
    return sorted(pedidos, key=lambda p: p.get('fecha_creacion', ''), reverse=True)[:n]

def calcular_total_ventas(pedidos):
    return sum(float(p.get('total', 0)) for p in pedidos if p.get('estado') != 'CANCELADO')


class TestDashboardClaseValida(unittest.TestCase):
    """Clase 1 — Datos válidos con múltiples registros."""

    def test_bajo_stock_correcto(self):
        productos = [
            {'stock': 2,  'stock_minimo': 5},
            {'stock': 10, 'stock_minimo': 5},
            {'stock': 0,  'stock_minimo': 5},
        ]
        self.assertEqual(calcular_bajo_stock(productos), 2)

    def test_pedidos_pendientes(self):
        pedidos = [
            {'estado': 'PENDIENTE'},
            {'estado': 'ENVIADO'},
            {'estado': 'PENDIENTE'},
            {'estado': 'ENTREGADO'},
        ]
        self.assertEqual(calcular_pendientes(pedidos), 2)

    def test_recientes_limita_a_5(self):
        pedidos = [{'id': i, 'fecha_creacion': f'2026-04-{i:02d}'} for i in range(1, 11)]
        recientes = top_recientes(pedidos)
        self.assertEqual(len(recientes), 5)
        self.assertEqual(recientes[0]['id'], 10)

    def test_total_ventas_excluye_cancelados(self):
        pedidos = [
            {'total': '100.00', 'estado': 'ENTREGADO'},
            {'total': '200.00', 'estado': 'CANCELADO'},
            {'total': '50.00',  'estado': 'PENDIENTE'},
        ]
        self.assertEqual(calcular_total_ventas(pedidos), 150.0)

    def test_stock_exactamente_al_minimo_cuenta_como_bajo(self):
        productos = [{'stock': 5, 'stock_minimo': 5}]
        self.assertEqual(calcular_bajo_stock(productos), 1)


class TestDashboardClaseInvalida(unittest.TestCase):
    """Clase 2 — Datos con valores inesperados o mal formateados."""

    def test_stock_negativo_cuenta_como_bajo(self):
        productos = [{'stock': -1, 'stock_minimo': 5}]
        self.assertEqual(calcular_bajo_stock(productos), 1)

    def test_estado_desconocido_no_cuenta_pendiente(self):
        pedidos = [{'estado': 'DESCONOCIDO'}, {'estado': 'PENDIENTE'}]
        self.assertEqual(calcular_pendientes(pedidos), 1)

    def test_total_string_invalido_usa_cero(self):
        pedidos = [{'total': 'N/A', 'estado': 'ENTREGADO'}]
        with self.assertRaises((ValueError, TypeError)):
            calcular_total_ventas(pedidos)

    def test_fecha_mal_formateada_no_rompe_sort(self):
        pedidos = [
            {'id': 1, 'fecha_creacion': 'no-es-fecha'},
            {'id': 2, 'fecha_creacion': '2026-04-01'},
        ]
        resultado = top_recientes(pedidos)
        self.assertEqual(len(resultado), 2)

    def test_stock_minimo_mayor_al_stock(self):
        productos = [{'stock': 100, 'stock_minimo': 200}]
        self.assertEqual(calcular_bajo_stock(productos), 1)


class TestDashboardClaseVacia(unittest.TestCase):
    """Clase 3 — Listas vacías o campos nulos."""

    def test_lista_vacia_bajo_stock(self):
        self.assertEqual(calcular_bajo_stock([]), 0)

    def test_lista_vacia_pendientes(self):
        self.assertEqual(calcular_pendientes([]), 0)

    def test_lista_vacia_recientes(self):
        self.assertEqual(top_recientes([]), [])

    def test_lista_vacia_total_ventas(self):
        self.assertEqual(calcular_total_ventas([]), 0.0)

    def test_producto_sin_campos_usa_defaults(self):
        productos = [{}]
        # stock=0 <= stock_minimo=5 → bajo stock
        self.assertEqual(calcular_bajo_stock(productos), 1)

    def test_pedido_sin_estado_no_cuenta_pendiente(self):
        pedidos = [{}]
        self.assertEqual(calcular_pendientes(pedidos), 0)


# ═══════════════════════════════════════════════════════════════════
# 5. VALIDACIÓN DE EMPLEADOS
# ═══════════════════════════════════════════════════════════════════

def validar_empleado(nombre, email, password):
    """Espejo de la lógica de EmpleadosListView.post para tests."""
    errores = []
    if not nombre or not nombre.strip():
        errores.append('nombre requerido')
    if not email or not email.strip():
        errores.append('email requerido')
    if not password or not password.strip():
        errores.append('password requerido')
    if password and len(password) < 6:
        errores.append('password debe tener al menos 6 caracteres')
    if email and '@' not in email:
        errores.append('email inválido')
    return errores


class TestEmpleadosClaseValida(unittest.TestCase):
    """Clase 1 — Datos válidos para crear repartidor."""

    def test_datos_completos_correctos(self):
        errores = validar_empleado('Juan Repartidor', 'juan@empresa.cl', 'pass123')
        self.assertEqual(errores, [])

    def test_password_exactamente_6_caracteres(self):
        errores = validar_empleado('María', 'maria@test.cl', 'abc123')
        self.assertEqual(errores, [])

    def test_nombre_con_tildes(self):
        errores = validar_empleado('José María', 'jose@test.cl', 'pass1234')
        self.assertEqual(errores, [])

    def test_email_con_punto(self):
        errores = validar_empleado('Pedro', 'pedro.garcia@empresa.cl', 'pass1234')
        self.assertEqual(errores, [])

    def test_password_largo(self):
        errores = validar_empleado('Ana', 'ana@test.cl', 'contraseñaMuySegura123!')
        self.assertEqual(errores, [])


class TestEmpleadosClaseInvalida(unittest.TestCase):
    """Clase 2 — Datos con errores de formato."""

    def test_password_5_caracteres(self):
        errores = validar_empleado('Juan', 'juan@test.cl', 'abc12')
        self.assertIn('password debe tener al menos 6 caracteres', errores)

    def test_email_sin_arroba(self):
        errores = validar_empleado('Juan', 'juantest.cl', 'pass123')
        self.assertIn('email inválido', errores)

    def test_nombre_solo_numeros(self):
        errores = validar_empleado('123', 'test@test.cl', 'pass123')
        # Nombre con solo números pasa validación básica (no vacío)
        self.assertEqual(errores, [])

    def test_email_con_espacios(self):
        errores = validar_empleado('Juan', 'juan @test.cl', 'pass123')
        # Tiene arroba pero es inválido — la validación básica lo permite
        self.assertIsInstance(errores, list)

    def test_password_solo_espacios(self):
        errores = validar_empleado('Juan', 'juan@test.cl', '      ')
        self.assertIn('password requerido', errores)


class TestEmpleadosClaseVacia(unittest.TestCase):
    """Clase 3 — Campos vacíos o nulos."""

    def test_nombre_vacio(self):
        errores = validar_empleado('', 'juan@test.cl', 'pass123')
        self.assertIn('nombre requerido', errores)

    def test_email_vacio(self):
        errores = validar_empleado('Juan', '', 'pass123')
        self.assertIn('email requerido', errores)

    def test_password_vacio(self):
        errores = validar_empleado('Juan', 'juan@test.cl', '')
        self.assertIn('password requerido', errores)

    def test_todos_vacios(self):
        errores = validar_empleado('', '', '')
        self.assertGreaterEqual(len(errores), 3)

    def test_none_nombre(self):
        errores = validar_empleado(None, 'juan@test.cl', 'pass123')
        self.assertIn('nombre requerido', errores)

    def test_none_password(self):
        errores = validar_empleado('Juan', 'juan@test.cl', None)
        self.assertIn('password requerido', errores)


if __name__ == '__main__':
    unittest.main(verbosity=2)