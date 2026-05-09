import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ms_inventario.settings')

import django
django.setup()

from django.test import TestCase, Client
from productos.models import Producto, ProductoRepository, Bodega, BodegaRepository
import json


class TestBodegaRepository(TestCase):

    def setUp(self):
        self.bodega = Bodega.objects.create(
            nombre='Bodega Central',
            direccion='Av. Principal 123',
            capacidad=500,
        )

    def test_get_all_retorna_bodegas_activas(self):
        bodegas = BodegaRepository.get_all()
        self.assertEqual(bodegas.count(), 1)

    def test_get_by_id_retorna_bodega_correcta(self):
        b = BodegaRepository.get_by_id(self.bodega.pk)
        self.assertEqual(b.nombre, 'Bodega Central')

    def test_create_crea_nueva_bodega(self):
        data = {'nombre': 'Bodega Norte', 'direccion': 'Calle 2', 'capacidad': 200}
        nueva = BodegaRepository.create(data)
        self.assertEqual(nueva.nombre, 'Bodega Norte')
        self.assertEqual(Bodega.objects.count(), 2)

    def test_update_modifica_bodega(self):
        updated = BodegaRepository.update(self.bodega.pk, {'capacidad': 1000})
        self.assertEqual(updated.capacidad, 1000)

    def test_delete_elimina_bodega(self):
        BodegaRepository.delete(self.bodega.pk)
        self.assertEqual(Bodega.objects.filter(pk=self.bodega.pk).count(), 0)


class TestBodegaAPI(TestCase):

    def setUp(self):
        self.client = Client()
        self.bodega = Bodega.objects.create(
            nombre='Bodega Test',
            direccion='Test 456',
            capacidad=100,
        )

    def test_get_lista_bodegas(self):
        response = self.client.get('/api/bodegas/')
        self.assertEqual(response.status_code, 200)

    def test_post_crea_bodega(self):
        data = {'nombre': 'Bodega Sur', 'direccion': 'Sur 789', 'capacidad': 300}
        response = self.client.post(
            '/api/bodegas/', json.dumps(data), content_type='application/json'
        )
        self.assertEqual(response.status_code, 201)

    def test_get_detalle_bodega(self):
        response = self.client.get(f'/api/bodegas/{self.bodega.pk}/')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)
        self.assertEqual(data['nombre'], 'Bodega Test')

    def test_delete_bodega(self):
        response = self.client.delete(f'/api/bodegas/{self.bodega.pk}/')
        self.assertEqual(response.status_code, 204)

    def test_get_bodega_inexistente(self):
        response = self.client.get('/api/bodegas/9999/')
        self.assertEqual(response.status_code, 404)


class TestProductoRepository(TestCase):

    def setUp(self):
        self.bodega = Bodega.objects.create(
            nombre='Bodega Principal', direccion='Av. 1', capacidad=200
        )
        self.p1 = Producto.objects.create(
            nombre='Teclado Mecánico', tipo='FISICO',
            precio=49990, stock=20, stock_minimo=5,
            peso_kg=1.2, bodega=self.bodega
        )
        self.p2 = Producto.objects.create(
            nombre='Software ERP', tipo='DIGITAL',
            precio=199990, stock=3, stock_minimo=5,
            url_descarga='http://ejemplo.com'
        )

    def test_get_all_retorna_productos_activos(self):
        self.assertEqual(ProductoRepository.get_all().count(), 2)

    def test_get_by_id_retorna_producto_correcto(self):
        p = ProductoRepository.get_by_id(self.p1.pk)
        self.assertEqual(p.nombre, 'Teclado Mecánico')

    def test_create_crea_nuevo_producto(self):
        data = {
            'nombre': 'Mouse', 'tipo': 'FISICO',
            'precio': 19990, 'stock': 50, 'stock_minimo': 10, 'peso_kg': 0.3
        }
        nuevo = ProductoRepository.create(data)
        self.assertEqual(nuevo.nombre, 'Mouse')
        self.assertEqual(Producto.objects.count(), 3)

    def test_update_modifica_producto(self):
        updated = ProductoRepository.update(self.p1.pk, {'stock': 100})
        self.assertEqual(updated.stock, 100)

    def test_delete_elimina_producto(self):
        ProductoRepository.delete(self.p1.pk)
        self.assertEqual(Producto.objects.filter(pk=self.p1.pk).count(), 0)

    def test_get_bajo_stock_filtra_correctamente(self):
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

    def test_producto_vinculado_a_bodega(self):
        p = ProductoRepository.get_by_id(self.p1.pk)
        self.assertEqual(p.bodega.nombre, 'Bodega Principal')


class TestProductoBajoStock(TestCase):

    def test_bajo_stock_true(self):
        p = Producto(stock=2, stock_minimo=5)
        self.assertTrue(p.bajo_stock)

    def test_bajo_stock_false(self):
        p = Producto(stock=10, stock_minimo=5)
        self.assertFalse(p.bajo_stock)

    def test_bajo_stock_igual_al_minimo(self):
        p = Producto(stock=5, stock_minimo=5)
        self.assertTrue(p.bajo_stock)


class TestProductoAPI(TestCase):

    def setUp(self):
        self.client = Client()
        self.p = Producto.objects.create(
            nombre='Monitor 4K', tipo='FISICO',
            precio=399990, stock=8, stock_minimo=3
        )

    def test_get_lista_productos(self):
        self.assertEqual(self.client.get('/api/productos/').status_code, 200)

    def test_post_crea_producto(self):
        data = {'nombre': 'Silla', 'tipo': 'FISICO', 'precio': '89990', 'stock': 15, 'stock_minimo': 2}
        response = self.client.post('/api/productos/', json.dumps(data), content_type='application/json')
        self.assertEqual(response.status_code, 201)

    def test_get_detalle_producto(self):
        response = self.client.get(f'/api/productos/{self.p.pk}/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(json.loads(response.content)['nombre'], 'Monitor 4K')

    def test_delete_producto(self):
        self.assertEqual(self.client.delete(f'/api/productos/{self.p.pk}/').status_code, 204)

    def test_get_producto_inexistente(self):
        self.assertEqual(self.client.get('/api/productos/9999/').status_code, 404)