"""
tests.py — Microservicio de Pedidos SmartLogix
Pruebas unitarias del Repository Pattern y Factory Method.
"""
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ms_pedidos.settings')

import django
django.setup()

from django.test import TestCase, Client
from pedidos.models import Pedido, ItemPedido, PedidoRepository, PedidoFactory
import json


class TestPedidoFactory(TestCase):
    """Verifica que el Factory Method crea pedidos con la estructura correcta."""

    def test_factory_estandar(self):
        data = PedidoFactory.crear('estandar', cliente='Juan', email='juan@mail.com')
        self.assertEqual(data['estado'], 'PENDIENTE')
        self.assertEqual(data['cliente'], 'Juan')

    def test_factory_express_inicia_procesando(self):
        data = PedidoFactory.crear('express', cliente='Ana', email='ana@mail.com')
        self.assertEqual(data['estado'], 'PROCESANDO')

    def test_factory_corporativo(self):
        data = PedidoFactory.crear('corporativo', cliente='Corp SA', email='corp@mail.com')
        self.assertEqual(data['estado'], 'PENDIENTE')
        self.assertIn('corporativo', data['notas'].lower())

    def test_factory_tipo_desconocido_usa_estandar(self):
        data = PedidoFactory.crear('desconocido', cliente='Test', email='t@t.com')
        self.assertEqual(data['estado'], 'PENDIENTE')

    def test_factory_incluye_email(self):
        data = PedidoFactory.crear('estandar', cliente='Test', email='test@mail.com')
        self.assertEqual(data['email_cliente'], 'test@mail.com')


class TestPedidoRepository(TestCase):

    def setUp(self):
        self.pedido = Pedido.objects.create(
            cliente='María González',
            email_cliente='maria@mail.com',
            estado='PENDIENTE',
            total=59990,
        )
        ItemPedido.objects.create(
            pedido=self.pedido,
            producto_id=1,
            nombre_producto='Teclado',
            cantidad=2,
            precio_unitario=29995,
        )

    def test_get_all_retorna_pedidos(self):
        pedidos = PedidoRepository.get_all()
        self.assertEqual(pedidos.count(), 1)

    def test_get_by_id_retorna_pedido_correcto(self):
        pedido = PedidoRepository.get_by_id(self.pedido.pk)
        self.assertEqual(pedido.cliente, 'María González')

    def test_get_by_id_incluye_items(self):
        pedido = PedidoRepository.get_by_id(self.pedido.pk)
        self.assertEqual(pedido.items.count(), 1)

    def test_update_estado_cambia_estado(self):
        actualizado = PedidoRepository.update_estado(self.pedido.pk, 'ENVIADO')
        self.assertEqual(actualizado.estado, 'ENVIADO')

    def test_get_by_estado_filtra(self):
        pendientes = PedidoRepository.get_by_estado('PENDIENTE')
        self.assertEqual(pendientes.count(), 1)
        enviados = PedidoRepository.get_by_estado('ENVIADO')
        self.assertEqual(enviados.count(), 0)

    def test_delete_elimina_pedido(self):
        PedidoRepository.delete(self.pedido.pk)
        self.assertEqual(Pedido.objects.count(), 0)


class TestItemPedidoSubtotal(TestCase):

    def test_subtotal_calcula_correctamente(self):
        pedido = Pedido.objects.create(
            cliente='Test', email_cliente='t@t.com', estado='PENDIENTE', total=0
        )
        item = ItemPedido(
            pedido=pedido, producto_id=1,
            nombre_producto='Monitor', cantidad=2, precio_unitario=150000
        )
        self.assertEqual(item.subtotal, 300000)


class TestPedidoAPI(TestCase):

    def setUp(self):
        self.client = Client()
        self.pedido = Pedido.objects.create(
            cliente='Carlos', email_cliente='carlos@mail.com',
            estado='PENDIENTE', total=0
        )

    def test_get_lista_pedidos(self):
        response = self.client.get('/api/pedidos/')
        self.assertEqual(response.status_code, 200)

    def test_patch_estado_pedido(self):
        response = self.client.patch(
            f'/api/pedidos/{self.pedido.pk}/',
            json.dumps({'estado': 'PROCESANDO'}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)
        self.assertEqual(data['estado'], 'PROCESANDO')

    def test_patch_estado_invalido(self):
        response = self.client.patch(
            f'/api/pedidos/{self.pedido.pk}/',
            json.dumps({'estado': 'INVALIDO'}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)
