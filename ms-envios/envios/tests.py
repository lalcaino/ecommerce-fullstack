import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ms_envios.settings')

import django
django.setup()

from django.test import TestCase, Client
from envios.models import (
    Conductor, Envio, Parada, EventoRuta,
    ConductorRepository, EnvioRepository, ParadaRepository, EnvioFactory,
)
import json


class TestEnvioFactory(TestCase):

    def test_factory_estandar(self):
        data = EnvioFactory.crear(
            'estandar',
            pedido_id=1, origen_lat=-33.4, origen_lon=-70.6,
            destino_nombre='Cliente A', destino_lat=-33.5, destino_lon=-70.7,
        )
        self.assertEqual(data['tipo'], 'ESTANDAR')
        self.assertEqual(data['estado'], 'PENDIENTE')

    def test_factory_express(self):
        data = EnvioFactory.crear(
            'express',
            pedido_id=2, origen_lat=-33.4, origen_lon=-70.6,
            destino_nombre='Cliente B', destino_lat=-33.5, destino_lon=-70.7,
        )
        self.assertEqual(data['tipo'], 'EXPRESS')
        self.assertIn('express', data['notas'].lower())

    def test_factory_programado(self):
        from django.utils import timezone
        data = EnvioFactory.crear(
            'programado',
            pedido_id=3, origen_lat=-33.4, origen_lon=-70.6,
            destino_nombre='Cliente C', destino_lat=-33.5, destino_lon=-70.7,
            fecha_estimada=timezone.now(),
        )
        self.assertEqual(data['tipo'], 'PROGRAMADO')
        self.assertIsNotNone(data['fecha_estimada'])

    def test_factory_tipo_desconocido_usa_estandar(self):
        data = EnvioFactory.crear(
            'desconocido',
            pedido_id=4, origen_lat=-33.4, origen_lon=-70.6,
            destino_nombre='Cliente D', destino_lat=-33.5, destino_lon=-70.7,
        )
        self.assertEqual(data['tipo'], 'ESTANDAR')


class TestConductorRepository(TestCase):

    def setUp(self):
        self.conductor = Conductor.objects.create(
            nombre='Pedro Soto', telefono='+56912345678', patente='ABCD12'
        )

    def test_get_all(self):
        self.assertEqual(ConductorRepository.get_all().count(), 1)

    def test_get_disponibles(self):
        self.assertEqual(ConductorRepository.get_disponibles().count(), 1)
        self.conductor.disponible = False
        self.conductor.save()
        self.assertEqual(ConductorRepository.get_disponibles().count(), 0)

    def test_create(self):
        c = ConductorRepository.create({'nombre': 'Ana López', 'telefono': '+56987654321', 'patente': 'XY1234'})
        self.assertEqual(c.nombre, 'Ana López')
        self.assertEqual(Conductor.objects.count(), 2)

    def test_update(self):
        updated = ConductorRepository.update(self.conductor.pk, {'patente': 'ZZ9999'})
        self.assertEqual(updated.patente, 'ZZ9999')

    def test_delete(self):
        ConductorRepository.delete(self.conductor.pk)
        self.assertEqual(Conductor.objects.count(), 0)


class TestEnvioRepository(TestCase):

    def setUp(self):
        self.conductor = Conductor.objects.create(
            nombre='Juan Ruta', telefono='+56911111111', patente='JR1234'
        )
        self.envio_data = {
            'pedido_id':      1,
            'tipo':           'ESTANDAR',
            'estado':         'PENDIENTE',
            'origen_nombre':  'Bodega Central',
            'origen_lat':     -33.4372,
            'origen_lon':     -70.6506,
            'destino_nombre': 'Cliente Test',
            'destino_lat':    -33.5000,
            'destino_lon':    -70.7000,
        }

    def test_create_envio(self):
        envio = EnvioRepository.create(dict(self.envio_data))
        self.assertEqual(envio.pedido_id, 1)
        self.assertEqual(envio.estado, 'PENDIENTE')

    def test_create_envio_con_paradas(self):
        data = dict(self.envio_data)
        data['paradas'] = [
            {'orden': 1, 'nombre': 'Parada 1', 'direccion': 'Calle 1', 'lat': -33.45, 'lon': -70.62},
            {'orden': 2, 'nombre': 'Parada 2', 'direccion': 'Calle 2', 'lat': -33.46, 'lon': -70.63},
        ]
        envio = EnvioRepository.create(data)
        self.assertEqual(envio.paradas.count(), 2)

    def test_update_estado(self):
        envio = EnvioRepository.create(dict(self.envio_data))
        updated = EnvioRepository.update_estado(envio.pk, 'EN_RUTA')
        self.assertEqual(updated.estado, 'EN_RUTA')
        # Verifica que se creó evento
        self.assertEqual(updated.eventos.filter(tipo='ESTADO').count(), 1)

    def test_update_posicion(self):
        envio = EnvioRepository.create(dict(self.envio_data))
        updated = EnvioRepository.update_posicion(envio.pk, -33.46, -70.64)
        self.assertAlmostEqual(float(updated.pos_lat), -33.46, places=2)
        self.assertEqual(updated.eventos.filter(tipo='POSICION').count(), 1)

    def test_update_ruta(self):
        envio = EnvioRepository.create(dict(self.envio_data))
        geojson = {'type': 'LineString', 'coordinates': [[-70.65, -33.43], [-70.70, -33.50]]}
        updated = EnvioRepository.update_ruta(envio.pk, geojson, 12.5, 25)
        self.assertEqual(float(updated.distancia_km), 12.5)
        self.assertEqual(updated.duracion_min, 25)

    def test_get_en_curso(self):
        envio = EnvioRepository.create(dict(self.envio_data))
        EnvioRepository.update_estado(envio.pk, 'EN_RUTA')
        self.assertEqual(EnvioRepository.get_en_curso().count(), 1)

    def test_get_by_pedido(self):
        EnvioRepository.create(dict(self.envio_data))
        envio = EnvioRepository.get_by_pedido(1)
        self.assertIsNotNone(envio)
        self.assertEqual(envio.pedido_id, 1)

    def test_delete(self):
        envio = EnvioRepository.create(dict(self.envio_data))
        EnvioRepository.delete(envio.pk)
        self.assertEqual(Envio.objects.count(), 0)


class TestParadaRepository(TestCase):

    def setUp(self):
        self.envio = Envio.objects.create(
            pedido_id=1, tipo='ESTANDAR', estado='EN_RUTA',
            origen_nombre='Bodega', origen_lat=-33.43, origen_lon=-70.65,
            destino_nombre='Cliente', destino_lat=-33.50, destino_lon=-70.70,
        )
        self.parada = Parada.objects.create(
            envio=self.envio, orden=1, nombre='Parada A',
            direccion='Av. Test 123', lat=-33.45, lon=-70.63,
        )

    def test_update_estado_parada(self):
        updated = ParadaRepository.update_estado(self.parada.pk, 'LLEGADO')
        self.assertEqual(updated.estado, 'LLEGADO')
        self.assertIsNotNone(updated.llegada_real)

    def test_update_estado_entregado(self):
        updated = ParadaRepository.update_estado(self.parada.pk, 'ENTREGADO')
        self.assertEqual(updated.estado, 'ENTREGADO')


class TestEnvioAPI(TestCase):

    def setUp(self):
        self.client = Client()
        self.payload = {
            'pedido_id':      10,
            'tipo':           'ESTANDAR',
            'estado':         'PENDIENTE',
            'origen_nombre':  'Bodega Central',
            'origen_lat':     '-33.4372',
            'origen_lon':     '-70.6506',
            'destino_nombre': 'Av. Providencia 1234',
            'destino_lat':    '-33.4321',
            'destino_lon':    '-70.6000',
        }

    def test_post_crear_envio(self):
        res = self.client.post('/api/envios/', json.dumps(self.payload), content_type='application/json')
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.json()['pedido_id'], 10)

    def test_get_lista_envios(self):
        self.assertEqual(self.client.get('/api/envios/').status_code, 200)

    def test_get_en_curso(self):
        self.assertEqual(self.client.get('/api/envios/en-curso/').status_code, 200)

    def test_patch_estado(self):
        res = self.client.post('/api/envios/', json.dumps(self.payload), content_type='application/json')
        pk = res.json()['id']
        res2 = self.client.patch(
            f'/api/envios/{pk}/estado/',
            json.dumps({'estado': 'EN_RUTA'}),
            content_type='application/json',
        )
        self.assertEqual(res2.status_code, 200)
        self.assertEqual(res2.json()['estado'], 'EN_RUTA')

    def test_patch_posicion(self):
        res = self.client.post('/api/envios/', json.dumps(self.payload), content_type='application/json')
        pk = res.json()['id']
        res2 = self.client.patch(
            f'/api/envios/{pk}/posicion/',
            json.dumps({'lat': '-33.4500', 'lon': '-70.6200'}),
            content_type='application/json',
        )
        self.assertEqual(res2.status_code, 200)

    def test_get_envio_inexistente(self):
        self.assertEqual(self.client.get('/api/envios/9999/').status_code, 404)

    def test_delete_envio(self):
        res = self.client.post('/api/envios/', json.dumps(self.payload), content_type='application/json')
        pk = res.json()['id']
        self.assertEqual(self.client.delete(f'/api/envios/{pk}/').status_code, 204)


class TestConductorAPI(TestCase):

    def setUp(self):
        self.client = Client()

    def test_post_crear_conductor(self):
        data = {'nombre': 'Mario Vargas', 'telefono': '+56922222222', 'patente': 'MV5678'}
        res = self.client.post('/api/conductores/', json.dumps(data), content_type='application/json')
        self.assertEqual(res.status_code, 201)

    def test_get_conductores(self):
        self.assertEqual(self.client.get('/api/conductores/').status_code, 200)

    def test_get_conductores_disponibles(self):
        self.assertEqual(self.client.get('/api/conductores/?disponibles=true').status_code, 200)


if __name__ == '__main__':
    import unittest
    unittest.main(verbosity=2)
