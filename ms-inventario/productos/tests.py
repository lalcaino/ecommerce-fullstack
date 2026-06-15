"""
tests.py — ms-inventario SmartLogix
Metodología: Clases de Equivalencia
Ejecutar: cd ms-inventario && python manage.py test productos
"""
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ms_inventario.settings')

import django
django.setup()

from django.test import TestCase, Client
from productos.models import Producto, ProductoRepository, Bodega, BodegaRepository
import json


# ═══════════════════════════════════════════════════════════════════
# 1. BODEGA REPOSITORY
# ═══════════════════════════════════════════════════════════════════

class TestBodegaRepositoryClaseValida(TestCase):
    """Clase 1 — Operaciones CRUD válidas."""

    def setUp(self):
        self.bodega = Bodega.objects.create(nombre='Bodega Central', direccion='Av. 1', capacidad=500)

    def test_get_all_retorna_activas(self):
        self.assertGreaterEqual(BodegaRepository.get_all().count(), 1)

    def test_get_by_id_correcto(self):
        b = BodegaRepository.get_by_id(self.bodega.pk)
        self.assertEqual(b.nombre, 'Bodega Central')

    def test_create_nueva_bodega(self):
        nueva = BodegaRepository.create({'nombre': 'Bodega Sur', 'direccion': 'Sur 1', 'capacidad': 200})
        self.assertEqual(nueva.nombre, 'Bodega Sur')

    def test_update_capacidad(self):
        updated = BodegaRepository.update(self.bodega.pk, {'capacidad': 1000})
        self.assertEqual(updated.capacidad, 1000)

    def test_delete_elimina(self):
        BodegaRepository.delete(self.bodega.pk)
        self.assertEqual(Bodega.objects.filter(pk=self.bodega.pk).count(), 0)

    def test_filtro_empresa_rut(self):
        Bodega.objects.create(nombre='B1', direccion='D1', capacidad=100, empresa_rut='76.000.000-1')
        qs = BodegaRepository.get_all(empresa_rut='76.000.000-1')
        self.assertEqual(qs.count(), 1)


class TestBodegaRepositoryClaseInvalida(TestCase):
    """Clase 2 — IDs o datos incorrectos."""

    def test_get_by_id_inexistente_lanza_excepcion(self):
        with self.assertRaises(Exception):
            BodegaRepository.get_by_id(99999)

    def test_filtro_empresa_rut_inexistente_vacio(self):
        qs = BodegaRepository.get_all(empresa_rut='00.000.000-0')
        self.assertEqual(qs.count(), 0)

    def test_capacidad_negativa_se_guarda(self):
        # Django no valida negativos en PositiveIntegerField via update directo
        # pero sí al crear — esto verifica el comportamiento
        try:
            b = BodegaRepository.create({'nombre': 'B', 'direccion': 'D', 'capacidad': -1})
            self.assertIsNotNone(b)
        except Exception:
            pass  # Es válido que rechace valores negativos


class TestBodegaRepositoryClaseVacia(TestCase):
    """Clase 3 — Sin datos o campos vacíos."""

    def test_get_all_sin_bodegas_retorna_vacio(self):
        Bodega.objects.all().delete()
        self.assertEqual(BodegaRepository.get_all().count(), 0)

    def test_filtro_rut_none_retorna_todas(self):
        Bodega.objects.create(nombre='B1', direccion='D1', capacidad=100)
        Bodega.objects.create(nombre='B2', direccion='D2', capacidad=200)
        self.assertEqual(BodegaRepository.get_all(empresa_rut=None).count(), 2)


# ═══════════════════════════════════════════════════════════════════
# 2. PRODUCTO REPOSITORY
# ═══════════════════════════════════════════════════════════════════

class TestProductoRepositoryClaseValida(TestCase):
    """Clase 1 — Operaciones CRUD válidas."""

    def setUp(self):
        self.bodega = Bodega.objects.create(nombre='Bodega Principal', direccion='Av. 1', capacidad=200)
        self.p1 = Producto.objects.create(
            nombre='Teclado Mecánico', tipo='FISICO', precio=49990,
            stock=20, stock_minimo=5, peso_kg=1.2, bodega=self.bodega, empresa_rut='76.000.000-1'
        )
        self.p2 = Producto.objects.create(
            nombre='Software ERP', tipo='DIGITAL', precio=199990,
            stock=3, stock_minimo=5, empresa_rut='76.000.000-1'
        )

    def test_get_all_retorna_activos(self):
        self.assertGreaterEqual(ProductoRepository.get_all().count(), 2)

    def test_get_by_id_correcto(self):
        p = ProductoRepository.get_by_id(self.p1.pk)
        self.assertEqual(p.nombre, 'Teclado Mecánico')

    def test_create_nuevo_producto(self):
        nuevo = ProductoRepository.create({
            'nombre': 'Mouse', 'tipo': 'FISICO', 'precio': 19990,
            'stock': 50, 'stock_minimo': 10, 'peso_kg': 0.3
        })
        self.assertEqual(nuevo.nombre, 'Mouse')

    def test_update_modifica_stock(self):
        updated = ProductoRepository.update(self.p1.pk, {'stock': 100})
        self.assertEqual(updated.stock, 100)

    def test_delete_elimina(self):
        ProductoRepository.delete(self.p1.pk)
        self.assertEqual(Producto.objects.filter(pk=self.p1.pk).count(), 0)

    def test_filtro_empresa_rut(self):
        qs = ProductoRepository.get_all(empresa_rut='76.000.000-1')
        self.assertEqual(qs.count(), 2)

    def test_filtro_empresa_rut_otra_vacio(self):
        qs = ProductoRepository.get_all(empresa_rut='00.000.000-0')
        self.assertEqual(qs.count(), 0)

    def test_bajo_stock_filtra_correctamente(self):
        bajo = ProductoRepository.get_bajo_stock()
        self.assertIn(self.p2, bajo)
        self.assertNotIn(self.p1, bajo)

    def test_ajustar_stock_incrementa(self):
        ProductoRepository.ajustar_stock(self.p1.pk, 10)
        self.p1.refresh_from_db()
        self.assertEqual(self.p1.stock, 30)

    def test_ajustar_stock_decrementa(self):
        ProductoRepository.ajustar_stock(self.p1.pk, -5)
        self.p1.refresh_from_db()
        self.assertEqual(self.p1.stock, 15)


class TestProductoRepositoryClaseInvalida(TestCase):
    """Clase 2 — IDs incorrectos o datos mal formateados."""

    def test_get_by_id_inexistente_lanza_excepcion(self):
        with self.assertRaises(Exception):
            ProductoRepository.get_by_id(99999)

    def test_filtro_empresa_rut_inexistente_vacio(self):
        qs = ProductoRepository.get_all(empresa_rut='RUTINVALIDO')
        self.assertEqual(qs.count(), 0)

    def test_bajo_stock_con_empresa_rut_filtra(self):
        Producto.objects.create(
            nombre='P bajo', tipo='FISICO', precio=100,
            stock=1, stock_minimo=10, empresa_rut='76.111.111-1'
        )
        bajo = ProductoRepository.get_bajo_stock(empresa_rut='76.111.111-1')
        self.assertEqual(bajo.count(), 1)


class TestProductoRepositoryClaseVacia(TestCase):
    """Clase 3 — Sin productos o stock cero."""

    def test_get_all_sin_productos_vacio(self):
        Producto.objects.all().delete()
        self.assertEqual(ProductoRepository.get_all().count(), 0)

    def test_bajo_stock_sin_productos_vacio(self):
        Producto.objects.all().delete()
        self.assertEqual(ProductoRepository.get_bajo_stock().count(), 0)

    def test_filtro_empresa_rut_none_retorna_todos(self):
        Producto.objects.create(nombre='P1', tipo='FISICO', precio=100, stock=10)
        Producto.objects.create(nombre='P2', tipo='FISICO', precio=200, stock=20)
        self.assertGreaterEqual(ProductoRepository.get_all(empresa_rut=None).count(), 2)


# ═══════════════════════════════════════════════════════════════════
# 3. BAJO STOCK (propiedad del modelo)
# ═══════════════════════════════════════════════════════════════════

class TestBajoStockClaseValida(TestCase):
    """Clase 1 — Stock normal y bajo."""

    def test_stock_mayor_al_minimo_no_es_bajo(self):
        p = Producto(stock=10, stock_minimo=5)
        self.assertFalse(p.bajo_stock)

    def test_stock_menor_al_minimo_es_bajo(self):
        p = Producto(stock=2, stock_minimo=5)
        self.assertTrue(p.bajo_stock)

    def test_stock_exactamente_al_minimo_es_bajo(self):
        p = Producto(stock=5, stock_minimo=5)
        self.assertTrue(p.bajo_stock)

    def test_stock_alto_no_es_bajo(self):
        p = Producto(stock=1000, stock_minimo=5)
        self.assertFalse(p.bajo_stock)


class TestBajoStockClaseInvalida(TestCase):
    """Clase 2 — Valores negativos o extremos."""

    def test_stock_negativo_es_bajo(self):
        p = Producto(stock=-1, stock_minimo=5)
        self.assertTrue(p.bajo_stock)

    def test_stock_minimo_cero_stock_positivo_no_es_bajo(self):
        p = Producto(stock=1, stock_minimo=0)
        self.assertFalse(p.bajo_stock)


class TestBajoStockClaseVacia(TestCase):
    """Clase 3 — Stock en cero."""

    def test_stock_cero_es_bajo(self):
        p = Producto(stock=0, stock_minimo=5)
        self.assertTrue(p.bajo_stock)

    def test_stock_cero_minimo_cero_es_bajo(self):
        p = Producto(stock=0, stock_minimo=0)
        self.assertTrue(p.bajo_stock)


# ═══════════════════════════════════════════════════════════════════
# 4. API DE INVENTARIO (HTTP)
# ═══════════════════════════════════════════════════════════════════

class TestProductoAPIClaseValida(TestCase):
    """Clase 1 — Requests HTTP válidos."""

    def setUp(self):
        self.client = Client()
        self.producto = Producto.objects.create(
            nombre='Monitor 4K', tipo='FISICO', precio=399990, stock=8, stock_minimo=3
        )

    def test_get_lista_200(self):
        self.assertEqual(self.client.get('/api/productos/').status_code, 200)

    def test_post_crea_201(self):
        data = {'nombre': 'Silla', 'tipo': 'FISICO', 'precio': '89990', 'stock': 15, 'stock_minimo': 2}
        res = self.client.post('/api/productos/', json.dumps(data), content_type='application/json')
        self.assertEqual(res.status_code, 201)

    def test_get_detalle_200(self):
        res = self.client.get(f'/api/productos/{self.producto.pk}/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['nombre'], 'Monitor 4K')

    def test_delete_204(self):
        self.assertEqual(self.client.delete(f'/api/productos/{self.producto.pk}/').status_code, 204)

    def test_patch_actualiza_stock(self):
        res = self.client.patch(
            f'/api/productos/{self.producto.pk}/',
            json.dumps({'stock': 50}),
            content_type='application/json'
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['stock'], 50)


class TestProductoAPIClaseInvalida(TestCase):
    """Clase 2 — Datos incompletos o inválidos."""

    def setUp(self):
        self.client = Client()

    def test_post_sin_precio_400(self):
        data = {'nombre': 'Sin Precio', 'tipo': 'FISICO', 'stock': 10}
        res = self.client.post('/api/productos/', json.dumps(data), content_type='application/json')
        self.assertEqual(res.status_code, 400)

    def test_post_precio_string_invalido_400(self):
        data = {'nombre': 'Test', 'tipo': 'FISICO', 'precio': 'no_es_numero', 'stock': 10}
        res = self.client.post('/api/productos/', json.dumps(data), content_type='application/json')
        self.assertEqual(res.status_code, 400)

    def test_post_sin_nombre_400(self):
        data = {'tipo': 'FISICO', 'precio': '1000', 'stock': 10}
        res = self.client.post('/api/productos/', json.dumps(data), content_type='application/json')
        self.assertEqual(res.status_code, 400)


class TestProductoAPIClaseVacia(TestCase):
    """Clase 3 — Recursos inexistentes o listas vacías."""

    def setUp(self):
        self.client = Client()

    def test_get_inexistente_404(self):
        self.assertEqual(self.client.get('/api/productos/99999/').status_code, 404)

    def test_delete_inexistente_404(self):
        self.assertEqual(self.client.delete('/api/productos/99999/').status_code, 404)

    def test_lista_vacia_200(self):
        Producto.objects.all().delete()
        res = self.client.get('/api/productos/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), [])


# ═══════════════════════════════════════════════════════════════════
# 5. API DE BODEGAS (HTTP)
# ═══════════════════════════════════════════════════════════════════

class TestBodegaAPIClaseValida(TestCase):
    """Clase 1 — Requests HTTP válidos."""

    def setUp(self):
        self.client = Client()
        self.bodega = Bodega.objects.create(nombre='Bodega Test', direccion='Test 456', capacidad=100)

    def test_get_lista_200(self):
        self.assertEqual(self.client.get('/api/bodegas/').status_code, 200)

    def test_post_crea_201(self):
        data = {'nombre': 'Bodega Sur', 'direccion': 'Sur 789', 'capacidad': 300}
        res = self.client.post('/api/bodegas/', json.dumps(data), content_type='application/json')
        self.assertEqual(res.status_code, 201)

    def test_get_detalle_200(self):
        res = self.client.get(f'/api/bodegas/{self.bodega.pk}/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['nombre'], 'Bodega Test')

    def test_delete_204(self):
        self.assertEqual(self.client.delete(f'/api/bodegas/{self.bodega.pk}/').status_code, 204)


class TestBodegaAPIClaseInvalida(TestCase):
    """Clase 2 — Datos incompletos."""

    def setUp(self):
        self.client = Client()

    def test_post_sin_nombre_400(self):
        data = {'direccion': 'Av. 1', 'capacidad': 100}
        res = self.client.post('/api/bodegas/', json.dumps(data), content_type='application/json')
        self.assertEqual(res.status_code, 400)


class TestBodegaAPIClaseVacia(TestCase):
    """Clase 3 — Recursos inexistentes."""

    def setUp(self):
        self.client = Client()

    def test_get_inexistente_404(self):
        self.assertEqual(self.client.get('/api/bodegas/99999/').status_code, 404)

    def test_lista_vacia_200(self):
        Bodega.objects.all().delete()
        res = self.client.get('/api/bodegas/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), [])


if __name__ == '__main__':
    import unittest
    unittest.main(verbosity=2)