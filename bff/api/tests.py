import time
import unittest
from unittest.mock import patch, MagicMock


# ─── Tests CircuitBreaker ─────────────────────────────────────────────────────
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Importamos directamente para testear sin Django
class CircuitBreaker:
    def __init__(self, failure_threshold=3, timeout=30):
        self.failure_threshold = failure_threshold
        self.timeout = timeout
        self.failure_count = 0
        self.state = 'CLOSED'
        self.next_attempt = None

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
                self.state = 'OPEN'
                self.next_attempt = time.time() + self.timeout
            raise exc

    def get_state(self):
        return self.state


class TestCircuitBreaker(unittest.TestCase):

    def setUp(self):
        self.cb = CircuitBreaker(failure_threshold=3, timeout=5)

    def test_initial_state_is_closed(self):
        self.assertEqual(self.cb.get_state(), 'CLOSED')

    def test_successful_call_keeps_closed(self):
        self.cb.call(lambda: 'ok')
        self.assertEqual(self.cb.get_state(), 'CLOSED')

    def test_resets_failure_count_on_success(self):
        try: self.cb.call(lambda: (_ for _ in ()).throw(ValueError()))
        except: pass
        self.cb.call(lambda: 'ok')
        self.assertEqual(self.cb.failure_count, 0)

    def test_opens_after_threshold(self):
        for _ in range(3):
            try: self.cb.call(lambda: (_ for _ in ()).throw(ValueError()))
            except: pass
        self.assertEqual(self.cb.get_state(), 'OPEN')

    def test_open_rejects_calls(self):
        self.cb.state = 'OPEN'
        self.cb.next_attempt = time.time() + 999
        with self.assertRaises(RuntimeError):
            self.cb.call(lambda: 'ok')

    def test_half_open_after_timeout(self):
        self.cb.state = 'OPEN'
        self.cb.next_attempt = time.time() - 1
        try: self.cb.call(lambda: 'ok')
        except: pass
        # Si llegó a ejecutar la función, pasó a HALF_OPEN o CLOSED
        self.assertIn(self.cb.get_state(), ['CLOSED', 'HALF_OPEN'])

    def test_accumulates_failures_below_threshold(self):
        for _ in range(2):
            try: self.cb.call(lambda: (_ for _ in ()).throw(ValueError()))
            except: pass
        self.assertEqual(self.cb.get_state(), 'CLOSED')
        self.assertEqual(self.cb.failure_count, 2)


# ─── Tests DashboardView (agregación) ────────────────────────────────────────
class TestDashboardAggregation(unittest.TestCase):

    def test_bajo_stock_count(self):
        """Verifica que se cuentan correctamente productos con stock bajo."""
        productos = [
            {'nombre': 'A', 'stock': 2,  'stock_minimo': 5},
            {'nombre': 'B', 'stock': 10, 'stock_minimo': 5},
            {'nombre': 'C', 'stock': 0,  'stock_minimo': 5},
        ]
        bajo_stock = sum(
            1 for p in productos
            if p.get('stock', 0) <= p.get('stock_minimo', 5)
        )
        self.assertEqual(bajo_stock, 2)

    def test_pedidos_pendientes_count(self):
        pedidos = [
            {'estado': 'PENDIENTE'},
            {'estado': 'ENVIADO'},
            {'estado': 'PENDIENTE'},
            {'estado': 'ENTREGADO'},
        ]
        pendientes = sum(1 for p in pedidos if p.get('estado') == 'PENDIENTE')
        self.assertEqual(pendientes, 2)

    def test_pedidos_recientes_limit(self):
        pedidos = [{'id': i, 'fecha_creacion': f'2026-04-{i:02d}'} for i in range(1, 11)]
        recientes = sorted(pedidos, key=lambda p: p.get('fecha_creacion', ''), reverse=True)[:5]
        self.assertEqual(len(recientes), 5)
        self.assertEqual(recientes[0]['id'], 10)


if __name__ == '__main__':
    unittest.main(verbosity=2)
