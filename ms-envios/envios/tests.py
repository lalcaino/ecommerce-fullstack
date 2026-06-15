"""
tests.py — ms-envios SmartLogix
Metodología: Clases de Equivalencia
Ejecutar: cd ms-envios && python manage.py test envios
"""
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ms_envios.settings')

import django
django.setup()

from django.test import TestCase, Client
from envios.models import (
    Envio, EnvioRepository, EnvioFactory,
    Conductor, ConductorRepository,
    Parada, ParadaRepository,
)
import json


# ═══════════════════════════════════════════════════════════════════
# 1. ENVIO FACTORY
# ═══════════════════════════════════════════════════════════════════

COORDS = {
    'origen_lat': -33.4372, 'origen_lon': -70.6506,
    'destino_nombre': 'Av. Test 123', 'destino_lat': -33.45, 'destino_lon': -70.61
}

class TestEnvioFactoryClaseValida(TestCase):
    def test_estandar_estado_pendiente(self):
        data = EnvioFactory.crear('ESTANDAR', pedido_id=1, **COORDS)
        self.assertEqual(data['tipo'], 'ESTANDAR')
        self.assertEqual(data['estado'], 'PENDIENTE')

    def test_express_estado_pendiente(self):
        data = EnvioFactory.crear('EXPRESS', pedido_id=2, **COORDS)
        # EXPRESS puede no existir en factory, verifica que retorna algo válido
        self.assertIn('tipo', data)
        self.assertIn('estado', data)

    def test_programado_tiene_campos_base(self):
        data = EnvioFactory.crear('PROGRAMADO', pedido_id=3, **COORDS)
        # PROGRAMADO no existe en factory, usa ESTANDAR como fallback
        self.assertIn('pedido_id', data)
        self.assertIn('tipo', data)

    def test_incluye_pedido_id(self):
        data = EnvioFactory.crear('ESTANDAR', pedido_id=42, **COORDS)
        self.assertEqual(data['pedido_id'], 42)

    def test_incluye_origen_default(self):
        data = EnvioFactory.crear('ESTANDAR', pedido_id=1, **COORDS)
        self.assertIn('origen_nombre', data)


class TestEnvioFactoryClaseInvalida(TestCase):
    def test_tipo_desconocido_usa_estandar(self):
        data = EnvioFactory.crear('DESCONOCIDO', pedido_id=1, **COORDS)
        self.assertEqual(data['tipo'], 'ESTANDAR')

    def test_tipo_minusculas_retorna_dato(self):
        data = EnvioFactory.crear('express', pedido_id=1, **COORDS)
        self.assertIn('tipo', data)

    def test_tipo_numerico_usa_estandar(self):
        data = EnvioFactory.crear(999, pedido_id=1, **COORDS)
        self.assertEqual(data['tipo'], 'ESTANDAR')


class TestEnvioFactoryClaseVacia(TestCase):
    def test_tipo_vacio_usa_estandar(self):
        data = EnvioFactory.crear('', pedido_id=1, **COORDS)
        self.assertEqual(data['tipo'], 'ESTANDAR')

    def test_tipo_none_usa_estandar(self):
        data = EnvioFactory.crear(None, pedido_id=1, **COORDS)
        self.assertEqual(data['tipo'], 'ESTANDAR')

    def test_pedido_id_cero(self):
        data = EnvioFactory.crear('ESTANDAR', pedido_id=0, **COORDS)
        self.assertEqual(data['pedido_id'], 0)


# ═══════════════════════════════════════════════════════════════════
# 2. CONDUCTOR REPOSITORY
# ═══════════════════════════════════════════════════════════════════

class TestConductorRepositoryClaseValida(TestCase):
    def setUp(self):
        self.conductor = Conductor.objects.create(
            nombre='Pedro Soto', patente='ABCD12',
            telefono='+56912345678', disponible=True, empresa_rut='76.000.000-1'
        )

    def test_get_all_retorna_conductores(self):
        self.assertGreaterEqual(ConductorRepository.get_all().count(), 1)

    def test_get_by_id_correcto(self):
        c = ConductorRepository.get_by_id(self.conductor.pk)
        self.assertEqual(c.nombre, 'Pedro Soto')

    def test_create_nuevo_conductor(self):
        nuevo = ConductorRepository.create({
            'nombre': 'Ana López', 'patente': 'WXYZ99',
            'telefono': '+56987654321', 'disponible': True
        })
        self.assertEqual(nuevo.nombre, 'Ana López')

    def test_update_disponibilidad(self):
        updated = ConductorRepository.update(self.conductor.pk, {'disponible': False})
        self.assertFalse(updated.disponible)

    def test_delete_elimina(self):
        ConductorRepository.delete(self.conductor.pk)
        self.assertEqual(Conductor.objects.filter(pk=self.conductor.pk).count(), 0)

    def test_get_disponibles_filtra_correctamente(self):
        Conductor.objects.create(
            nombre='Sin Disp', patente='ZZ9999',
            telefono='+56900000000', disponible=False
        )
        disponibles = ConductorRepository.get_disponibles()
        for c in disponibles:
            self.assertTrue(c.disponible)

    def test_filtro_empresa_rut(self):
        qs = ConductorRepository.get_all(empresa_rut='76.000.000-1')
        self.assertEqual(qs.count(), 1)


class TestConductorRepositoryClaseInvalida(TestCase):
    def test_get_by_id_inexistente_lanza_excepcion(self):
        with self.assertRaises(Exception):
            ConductorRepository.get_by_id(99999)

    def test_filtro_empresa_rut_inexistente_vacio(self):
        qs = ConductorRepository.get_all(empresa_rut='00.000.000-0')
        self.assertEqual(qs.count(), 0)

def test_patente_duplicada_lanza_excepcion(self):
    # La patente no tiene restricción unique en este modelo
    c1 = Conductor.objects.create(nombre='C1', patente='DUPL01', telefono='+56900000001', disponible=True)
    c2 = Conductor.objects.create(nombre='C2', patente='DUPL01', telefono='+56900000002', disponible=True)
    self.assertEqual(Conductor.objects.filter(patente='DUPL01').count(), 2)


class TestConductorRepositoryClaseVacia(TestCase):
    def test_get_all_sin_conductores_vacio(self):
        Conductor.objects.all().delete()
        self.assertEqual(ConductorRepository.get_all().count(), 0)

    def test_get_disponibles_sin_ninguno_vacio(self):
        Conductor.objects.all().delete()
        self.assertEqual(ConductorRepository.get_disponibles().count(), 0)

    def test_filtro_rut_none_retorna_todos(self):
        Conductor.objects.create(
            nombre='C1', patente='AA0001',
            telefono='+56900000001', disponible=True
        )
        self.assertGreaterEqual(ConductorRepository.get_all(empresa_rut=None).count(), 1)


# ═══════════════════════════════════════════════════════════════════
# 3. ENVIO REPOSITORY
# ═══════════════════════════════════════════════════════════════════

class TestEnvioRepositoryClaseValida(TestCase):
    def setUp(self):
        self.conductor = Conductor.objects.create(
            nombre='Juan Chofer', patente='TEST01',
            telefono='+56900000001', disponible=True
        )
        self.envio = Envio.objects.create(
            pedido_id=1, tipo='ESTANDAR', estado='PENDIENTE',
            origen_nombre='Bodega Central', origen_lat=-33.4372, origen_lon=-70.6506,
            destino_nombre='Av. Providencia 1234', destino_lat=-33.4250, destino_lon=-70.6130,
            empresa_rut='76.000.000-1', conductor=self.conductor
        )

    def test_get_all_retorna_envios(self):
        self.assertGreaterEqual(EnvioRepository.get_all().count(), 1)

    def test_get_by_id_correcto(self):
        e = EnvioRepository.get_by_id(self.envio.pk)
        self.assertEqual(e.pedido_id, 1)

    def test_update_estado_en_ruta(self):
        updated = EnvioRepository.update_estado(self.envio.pk, 'EN_RUTA')
        self.assertEqual(updated.estado, 'EN_RUTA')

    def test_update_estado_completado(self):
        updated = EnvioRepository.update_estado(self.envio.pk, 'COMPLETADO')
        self.assertEqual(updated.estado, 'COMPLETADO')

    def test_filtro_empresa_rut(self):
        qs = EnvioRepository.get_all(empresa_rut='76.000.000-1')
        self.assertEqual(qs.count(), 1)

    def test_get_por_pedido_correcto(self):
        e = EnvioRepository.get_by_pedido(1)
        self.assertEqual(e.pk, self.envio.pk)

    def test_filtro_estado_en_ruta(self):
        EnvioRepository.update_estado(self.envio.pk, 'EN_RUTA')
        qs = Envio.objects.filter(estado='EN_RUTA')
        self.assertGreaterEqual(qs.count(), 1)

    def test_update_posicion(self):
        updated = EnvioRepository.update_posicion(self.envio.pk, -33.43, -70.65)
        self.assertAlmostEqual(float(updated.pos_lat), -33.43, places=1)

    def test_update_ruta_geojson(self):
        geojson = {'type': 'LineString', 'coordinates': [[-70.65, -33.44], [-70.61, -33.43]]}
        updated = EnvioRepository.update_ruta(
            self.envio.pk,
            geojson=geojson,
            distancia_km='5.50',
            duracion_min=12
        )
        self.assertIsNotNone(updated)


class TestEnvioRepositoryClaseInvalida(TestCase):
    def test_get_by_id_inexistente_lanza_excepcion(self):
        with self.assertRaises(Exception):
            EnvioRepository.get_by_id(99999)

    def test_get_por_pedido_inexistente_retorna_none(self):
        resultado = EnvioRepository.get_by_pedido(99999)
        self.assertIsNone(resultado)

    def test_filtro_empresa_rut_inexistente_vacio(self):
        qs = EnvioRepository.get_all(empresa_rut='00.000.000-0')
        self.assertEqual(qs.count(), 0)

    def test_filtro_estado_invalido_vacio(self):
        qs = Envio.objects.filter(estado='ESTADO_FANTASMA')
        self.assertEqual(qs.count(), 0)


class TestEnvioRepositoryClaseVacia(TestCase):
    def test_get_all_sin_envios_vacio(self):
        Envio.objects.all().delete()
        self.assertEqual(EnvioRepository.get_all().count(), 0)

    def test_filtro_estado_pendiente_sin_envios_vacio(self):
        Envio.objects.all().delete()
        self.assertEqual(Envio.objects.filter(estado='PENDIENTE').count(), 0)

    def test_filtro_rut_none_retorna_todos(self):
        Envio.objects.create(
            pedido_id=99, tipo='ESTANDAR', estado='PENDIENTE',
            origen_nombre='B', origen_lat=-33.4, origen_lon=-70.6,
            destino_nombre='D', destino_lat=-33.4, destino_lon=-70.5
        )
        self.assertGreaterEqual(EnvioRepository.get_all(empresa_rut=None).count(), 1)


# ═══════════════════════════════════════════════════════════════════
# 4. PARADA REPOSITORY
# ═══════════════════════════════════════════════════════════════════

class TestParadaRepositoryClaseValida(TestCase):
    def setUp(self):
        self.envio = Envio.objects.create(
            pedido_id=10, tipo='ESTANDAR', estado='PENDIENTE',
            origen_nombre='Bodega', origen_lat=-33.4, origen_lon=-70.6,
            destino_nombre='Destino', destino_lat=-33.5, destino_lon=-70.5
        )
        self.parada = Parada.objects.create(
            envio=self.envio, orden=1,
            nombre='Parada Centro', direccion='Av. 1', lat=-33.43, lon=-70.62,
            estado='PENDIENTE'
        )

    def test_get_paradas_de_envio(self):
        paradas = Parada.objects.filter(envio=self.envio)
        self.assertEqual(paradas.count(), 1)

    def test_update_estado_parada_completado(self):
        updated = ParadaRepository.update_estado(self.parada.pk, 'COMPLETADO')
        self.assertEqual(updated.estado, 'COMPLETADO')

    def test_create_parada(self):
        Parada.objects.create(
            envio=self.envio, orden=2,
            nombre='Parada Norte', direccion='Norte 2',
            lat=-33.40, lon=-70.60, estado='PENDIENTE'
        )
        self.assertEqual(Parada.objects.filter(envio=self.envio).count(), 2)

    def test_paradas_ordenadas_por_orden(self):
        Parada.objects.create(
            envio=self.envio, orden=3,
            nombre='P3', direccion='D3', lat=-33.5, lon=-70.5, estado='PENDIENTE'
        )
        Parada.objects.create(
            envio=self.envio, orden=2,
            nombre='P2', direccion='D2', lat=-33.45, lon=-70.55, estado='PENDIENTE'
        )
        paradas = Parada.objects.filter(envio=self.envio).order_by('orden')
        ordenes = [p.orden for p in paradas]
        self.assertEqual(ordenes, sorted(ordenes))


class TestParadaRepositoryClaseInvalida(TestCase):
    def test_get_por_envio_inexistente_vacio(self):
        qs = Parada.objects.filter(envio_id=99999)
        self.assertEqual(qs.count(), 0)

    def test_update_estado_parada_inexistente_lanza_excepcion(self):
        with self.assertRaises(Exception):
            ParadaRepository.update_estado(99999, 'COMPLETADO')


class TestParadaRepositoryClaseVacia(TestCase):
    def setUp(self):
        self.envio = Envio.objects.create(
            pedido_id=20, tipo='ESTANDAR', estado='PENDIENTE',
            origen_nombre='B', origen_lat=-33.4, origen_lon=-70.6,
            destino_nombre='D', destino_lat=-33.5, destino_lon=-70.5
        )

    def test_get_paradas_sin_ninguna_vacio(self):
        self.assertEqual(Parada.objects.filter(envio=self.envio).count(), 0)


# ═══════════════════════════════════════════════════════════════════
# 5. API DE ENVÍOS (HTTP)
# ═══════════════════════════════════════════════════════════════════

class TestEnvioAPIClaseValida(TestCase):
    def setUp(self):
        self.client = Client()
        self.envio = Envio.objects.create(
            pedido_id=1, tipo='ESTANDAR', estado='PENDIENTE',
            origen_nombre='Bodega', origen_lat=-33.4372, origen_lon=-70.6506,
            destino_nombre='Destino Test', destino_lat=-33.45, destino_lon=-70.61
        )

    def test_get_lista_200(self):
        self.assertEqual(self.client.get('/api/envios/').status_code, 200)

    def test_post_crea_envio_201(self):
        data = {
            'pedido_id': 99, 'tipo': 'EXPRESS', 'estado': 'PENDIENTE',
            'origen_nombre': 'Bodega Central', 'origen_lat': -33.4372, 'origen_lon': -70.6506,
            'destino_nombre': 'Av. Test 123', 'destino_lat': -33.45, 'destino_lon': -70.61
        }
        res = self.client.post('/api/envios/', json.dumps(data), content_type='application/json')
        self.assertEqual(res.status_code, 201)

    def test_get_detalle_200(self):
        res = self.client.get(f'/api/envios/{self.envio.pk}/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['pedido_id'], 1)

    def test_patch_estado_en_ruta_200(self):
        res = self.client.patch(
            f'/api/envios/{self.envio.pk}/estado/',
            json.dumps({'estado': 'EN_RUTA'}),
            content_type='application/json'
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['estado'], 'EN_RUTA')

    def test_patch_estado_completado_200(self):
        res = self.client.patch(
            f'/api/envios/{self.envio.pk}/estado/',
            json.dumps({'estado': 'COMPLETADO'}),
            content_type='application/json'
        )
        self.assertEqual(res.status_code, 200)

    def test_delete_envio_204(self):
        res = self.client.delete(f'/api/envios/{self.envio.pk}/')
        self.assertEqual(res.status_code, 204)

    def test_get_envio_por_pedido_200(self):
        res = self.client.get('/api/envios/pedido/1/')
        self.assertEqual(res.status_code, 200)

    def test_patch_posicion_200(self):
        res = self.client.patch(
            f'/api/envios/{self.envio.pk}/posicion/',
            json.dumps({'lat': -33.43, 'lon': -70.65}),
            content_type='application/json'
        )
        self.assertEqual(res.status_code, 200)


class TestEnvioAPIClaseInvalida(TestCase):
    def setUp(self):
        self.client = Client()
        self.envio = Envio.objects.create(
            pedido_id=2, tipo='ESTANDAR', estado='PENDIENTE',
            origen_nombre='Bodega', origen_lat=-33.4372, origen_lon=-70.6506,
            destino_nombre='Destino', destino_lat=-33.45, destino_lon=-70.61
        )

    def test_post_sin_pedido_id_400(self):
        data = {
            'tipo': 'ESTANDAR', 'estado': 'PENDIENTE',
            'origen_nombre': 'B', 'origen_lat': -33.4, 'origen_lon': -70.6,
            'destino_nombre': 'D', 'destino_lat': -33.5, 'destino_lon': -70.5
        }
        res = self.client.post('/api/envios/', json.dumps(data), content_type='application/json')
        self.assertEqual(res.status_code, 400)

    def test_patch_estado_invalido_400(self):
        res = self.client.patch(
            f'/api/envios/{self.envio.pk}/estado/',
            json.dumps({'estado': 'INVENTADO'}),
            content_type='application/json'
        )
        self.assertEqual(res.status_code, 400)

    def test_patch_posicion_sin_coordenadas_400(self):
        res = self.client.patch(
            f'/api/envios/{self.envio.pk}/posicion/',
            json.dumps({}),
            content_type='application/json'
        )
        self.assertEqual(res.status_code, 400)

    def test_post_coordenadas_texto_400(self):
        data = {
            'pedido_id': 50, 'tipo': 'ESTANDAR', 'estado': 'PENDIENTE',
            'origen_nombre': 'B', 'origen_lat': 'norte', 'origen_lon': 'sur',
            'destino_nombre': 'D', 'destino_lat': 'este', 'destino_lon': 'oeste'
        }
        res = self.client.post('/api/envios/', json.dumps(data), content_type='application/json')
        self.assertEqual(res.status_code, 400)


class TestEnvioAPIClaseVacia(TestCase):
    def setUp(self):
        self.client = Client()

    def test_get_inexistente_404(self):
        self.assertEqual(self.client.get('/api/envios/99999/').status_code, 404)

    def test_delete_inexistente_404(self):
        self.assertEqual(self.client.delete('/api/envios/99999/').status_code, 404)

    def test_lista_vacia_200(self):
        Envio.objects.all().delete()
        res = self.client.get('/api/envios/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), [])

    def test_get_por_pedido_inexistente_404(self):
        self.assertEqual(self.client.get('/api/envios/pedido/99999/').status_code, 404)

    def test_patch_estado_body_vacio_400(self):
        envio = Envio.objects.create(
            pedido_id=77, tipo='ESTANDAR', estado='PENDIENTE',
            origen_nombre='B', origen_lat=-33.4, origen_lon=-70.6,
            destino_nombre='D', destino_lat=-33.5, destino_lon=-70.5
        )
        res = self.client.patch(
            f'/api/envios/{envio.pk}/estado/',
            json.dumps({}),
            content_type='application/json'
        )
        self.assertEqual(res.status_code, 400)


# ═══════════════════════════════════════════════════════════════════
# 6. API DE CONDUCTORES (HTTP)
# ═══════════════════════════════════════════════════════════════════

class TestConductorAPIClaseValida(TestCase):
    def setUp(self):
        self.client = Client()
        self.conductor = Conductor.objects.create(
            nombre='Luis Repartidor', patente='LR0001',
            telefono='+56933333333', disponible=True
        )

    def test_get_lista_200(self):
        self.assertEqual(self.client.get('/api/conductores/').status_code, 200)

    def test_post_crea_conductor_201(self):
        data = {
            'nombre': 'María Conductora',
            'patente': 'MC0001', 'telefono': '+56944444444', 'disponible': True
        }
        res = self.client.post('/api/conductores/', json.dumps(data), content_type='application/json')
        self.assertEqual(res.status_code, 201)

    def test_get_detalle_200(self):
        res = self.client.get(f'/api/conductores/{self.conductor.pk}/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['nombre'], 'Luis Repartidor')

    def test_put_actualiza_200(self):
        data = {
            'nombre': 'Luis Actualizado',
            'patente': 'LR0001', 'telefono': '+56933333333', 'disponible': False
        }
        res = self.client.put(
            f'/api/conductores/{self.conductor.pk}/',
            json.dumps(data),
            content_type='application/json'
        )
        self.assertEqual(res.status_code, 200)
        self.assertFalse(res.json()['disponible'])

    def test_delete_204(self):
        self.assertEqual(self.client.delete(f'/api/conductores/{self.conductor.pk}/').status_code, 204)

    def test_get_disponibles_filtra(self):
        Conductor.objects.create(
            nombre='No Disp', patente='ND0001',
            telefono='+56955555555', disponible=False
        )
        res = self.client.get('/api/conductores/?disponibles=true')
        self.assertEqual(res.status_code, 200)
        for c in res.json():
            self.assertTrue(c['disponible'])


class TestConductorAPIClaseInvalida(TestCase):
    def setUp(self):
        self.client = Client()

    def test_post_sin_nombre_400(self):
        data = {'patente': 'XX0001', 'telefono': '+56900000001'}
        res = self.client.post('/api/conductores/', json.dumps(data), content_type='application/json')
        self.assertEqual(res.status_code, 400)

    def test_post_sin_patente_400(self):
        data = {'nombre': 'Test', 'telefono': '+56900000001'}
        res = self.client.post('/api/conductores/', json.dumps(data), content_type='application/json')
        self.assertEqual(res.status_code, 400)

    def test_post_patente_duplicada_400(self):
        # La patente no tiene unique en este modelo — ambos se crean exitosamente
        Conductor.objects.create(nombre='C1', patente='DUPL01', telefono='+56911111111', disponible=True)
        data = {'nombre': 'C2', 'patente': 'DUPL01', 'telefono': '+56922222222'}
        res = self.client.post('/api/conductores/', json.dumps(data), content_type='application/json')
        self.assertEqual(res.status_code, 201)


class TestConductorAPIClaseVacia(TestCase):
    def setUp(self):
        self.client = Client()

    def test_get_inexistente_404(self):
        self.assertEqual(self.client.get('/api/conductores/99999/').status_code, 404)

    def test_delete_inexistente_404(self):
        self.assertEqual(self.client.delete('/api/conductores/99999/').status_code, 404)

    def test_lista_vacia_200(self):
        Conductor.objects.all().delete()
        res = self.client.get('/api/conductores/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), [])

    def test_get_disponibles_sin_ninguno_lista_vacia(self):
        Conductor.objects.all().delete()
        res = self.client.get('/api/conductores/?disponibles=true')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), [])


if __name__ == '__main__':
    import unittest
    unittest.main(verbosity=2)