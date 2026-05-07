"""
tests.py — Microservicio de Inventario
Pruebas unitarias con Django TestCase. Cubre Repository y lógica de negocio.
"""
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ms_inventario.settings')

import django
django.setup()

from django.test import TestCase, Client
from productos.models import Producto, ProductoRepository
import json


class TestProductoRepository(TestCase):

    def setUp(self):
        self.p1 = Producto.objects.create(
            nombre='Teclado Mecánico', tipo='FISICO',
            precio=49990, stock=20, stock_minimo=5, peso_kg=1.2
        )
        self.p2 = Producto.objects.create(
            nombre='Software ERP', tipo='DIGITAL',
            precio=199990, stock=3, stock_minimo=5, url_descarga='http://ejemplo.com'
        )

    def test_get_all_retorna_productos_activos(self):
        productos = ProductoRepository.get_all()
        self.assertEqual(productos.count(), 2)

    def test_get_by_id_retorna_producto_correcto(self):
        producto = ProductoRepository.get_by_id(self.p1.pk)
        self.assertEqual(producto.nombre, 'Teclado Mecánico')

    def test_create_crea_nuevo_producto(self):
        data = {
            'nombre': 'Mouse Inalámbrico', 'tipo': 'FISICO',
            'precio': 19990, 'stock': 50, 'stock_minimo': 10, 'peso_kg': 0.3
        }
        nuevo = ProductoRepository.create(data)
        self.assertEqual(nuevo.nombre, 'Mouse Inalámbrico')
        self.assertEqual(Producto.objects.count(), 3)

    def test_update_modifica_producto(self):
        updated = ProductoRepository.update(self.p1.pk, {'stock': 100})
        self.assertEqual(updated.stock, 100)

    def test_delete_elimina_producto(self):
        ProductoRepository.delete(self.p1.pk)
        self.assertEqual(Producto.objects.filter(pk=self.p1.pk).count(), 0)

    def test_get_bajo_stock_filtra_correctamente(self):
        # p2 tiene stock=3, stock_minimo=5 → bajo stock
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


class TestProductoBajoStock(TestCase):

    def test_propiedad_bajo_stock_true(self):
        p = Producto(stock=2, stock_minimo=5)
        self.assertTrue(p.bajo_stock)

    def test_propiedad_bajo_stock_false(self):
        p = Producto(stock=10, stock_minimo=5)
        self.assertFalse(p.bajo_stock)

    def test_propiedad_bajo_stock_igual_al_minimo(self):
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
        response = self.client.get('/api/productos/')
        self.assertEqual(response.status_code, 200)

    def test_post_crea_producto(self):
        data = {
            'nombre': 'Silla Ergonómica', 'tipo': 'FISICO',
            'precio': '89990', 'stock': 15, 'stock_minimo': 2
        }
        response = self.client.post(
            '/api/productos/', json.dumps(data),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 201)

    def test_get_detalle_producto(self):
        response = self.client.get(f'/api/productos/{self.p.pk}/')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)
        self.assertEqual(data['nombre'], 'Monitor 4K')

    def test_delete_producto(self):
        response = self.client.delete(f'/api/productos/{self.p.pk}/')
        self.assertEqual(response.status_code, 204)
