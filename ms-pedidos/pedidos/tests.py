import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ms_pedidos.settings')

import django
django.setup()

from django.test import TestCase, Client
from pedidos.models import Pedido, ItemPedido, PedidoRepository, PedidoFactory, Tienda, TiendaRepository
import json


class TestTiendaRepository(TestCase):

    def setUp(self):
        self.tienda = Tienda.objects.create(
            nombre='Tienda Centro',
            direccion='Av. Principal 456',
            ciudad='Santiago',
        )

    def test_get_all_retorna_tiendas_activas(self):
        self.assertEqual(TiendaRepository.get_all().count(), 1)

    def test_get_by_id_retorna_tienda_correcta(self):
        t = TiendaRepository.get_by_id(self.tienda.pk)
        self.assertEqual(t.nombre, 'Tienda Centro')

    def test_create_crea_nueva_tienda(self):
        data = {'nombre': 'Tienda Norte', 'direccion': 'Calle 2', 'ciudad': 'Valparaíso'}
        nueva = TiendaRepository.create(data)
        self.assertEqual(nueva.nombre, 'Tienda Norte')
        self.assertEqual(Tienda.objects.count(), 2)

    def test_update_modifica_tienda(self):
        updated = TiendaRepository.update(self.tienda.pk, {'ciudad': 'Concepción'})
        self.assertEqual(updated.ciudad, 'Concepción')

    def test_delete_elimina_tienda(self):
        TiendaRepository.delete(self.tienda.pk)
        self.assertEqual(Tienda.objects.filter(pk=self.tienda.pk).count(), 0)


class TestTiendaAPI(TestCase):

    def setUp(self):
        self.client = Client()
        self.tienda = Tienda.objects.create(
            nombre='Tienda Test',
            direccion='Test 123',
            ciudad='Santiago',
        )

    def test_get_lista_tiendas(self):
        self.assertEqual(self.client.get('/api/tiendas/').status_code, 200)

    def test_post_crea_tienda(self):
        data = {'nombre': 'Tienda Sur', 'direccion': 'Sur 789', 'ciudad': 'Temuco'}
        response = self.client.post('/api/tiendas/', json.dumps(data), content_type='application/json')
        self.assertEqual(response.status_code, 201)

    def test_get_detalle_tienda(self):
        response = self.client.get(f'/api/tiendas/{self.tienda.pk}/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(json.loads(response.content)['nombre'], 'Tienda Test')

    def test_delete_tienda(self):
        self.assertEqual(self.client.delete(f'/api/tiendas/{self.tienda.pk}/').status_code, 204)

    def test_get_tienda_inexistente(self):
        self.assertEqual(self.client.get('/api/tiendas/9999/').status_code, 404)


class TestPedidoFactory(TestCase):

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
        self.tienda = Tienda.objects.create(
            nombre='Tienda Principal', direccion='Av. 1', ciudad='Santiago'
        )
        self.pedido = Pedido.objects.create(
            cliente='María González',
            email_cliente='maria@mail.com',
            estado='PENDIENTE',
            total=59990,
            tienda=self.tienda,
        )
        ItemPedido.objects.create(
            pedido=self.pedido,
            producto_id=1,
            nombre_producto='Teclado',
            cantidad=2,
            precio_unitario=29995,
        )

    def test_get_all_retorna_pedidos(self):
        self.assertEqual(PedidoRepository.get_all().count(), 1)

    def test_get_by_id_retorna_pedido_correcto(self):
        p = PedidoRepository.get_by_id(self.pedido.pk)
        self.assertEqual(p.cliente, 'María González')

    def test_get_by_id_incluye_items(self):
        p = PedidoRepository.get_by_id(self.pedido.pk)
        self.assertEqual(p.items.count(), 1)

    def test_update_estado_cambia_estado(self):
        updated = PedidoRepository.update_estado(self.pedido.pk, 'ENVIADO')
        self.assertEqual(updated.estado, 'ENVIADO')

    def test_get_by_estado_filtra(self):
        self.assertEqual(PedidoRepository.get_by_estado('PENDIENTE').count(), 1)
        self.assertEqual(PedidoRepository.get_by_estado('ENVIADO').count(), 0)

    def test_delete_elimina_pedido(self):
        PedidoRepository.delete(self.pedido.pk)
        self.assertEqual(Pedido.objects.count(), 0)

    def test_pedido_vinculado_a_tienda(self):
        p = PedidoRepository.get_by_id(self.pedido.pk)
        self.assertEqual(p.tienda.nombre, 'Tienda Principal')


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
        self.assertEqual(self.client.get('/api/pedidos/').status_code, 200)

    def test_patch_estado_pedido(self):
        response = self.client.patch(
            f'/api/pedidos/{self.pedido.pk}/',
            json.dumps({'estado': 'PROCESANDO'}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(json.loads(response.content)['estado'], 'PROCESANDO')

    def test_patch_estado_invalido(self):
        response = self.client.patch(
            f'/api/pedidos/{self.pedido.pk}/',
            json.dumps({'estado': 'INVALIDO'}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)

    def test_get_pedido_inexistente(self):
        self.assertEqual(self.client.get('/api/pedidos/9999/').status_code, 404)