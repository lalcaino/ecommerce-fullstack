from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='Conductor',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nombre',     models.CharField(max_length=200)),
                ('telefono',   models.CharField(max_length=20)),
                ('patente',    models.CharField(max_length=10)),
                ('disponible', models.BooleanField(default=True)),
                ('creado_en',  models.DateTimeField(auto_now_add=True)),
            ],
            options={'ordering': ['nombre']},
        ),
        migrations.CreateModel(
            name='Envio',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('pedido_id',       models.PositiveIntegerField()),
                ('tipo',            models.CharField(max_length=20, choices=[('ESTANDAR','Estándar'),('EXPRESS','Express'),('PROGRAMADO','Programado')], default='ESTANDAR')),
                ('estado',          models.CharField(max_length=20, choices=[('PENDIENTE','Pendiente'),('EN_RUTA','En ruta'),('COMPLETADO','Completado'),('FALLIDO','Fallido'),('CANCELADO','Cancelado')], default='PENDIENTE')),
                ('origen_nombre',   models.CharField(max_length=300, default='Bodega Central')),
                ('origen_lat',      models.DecimalField(max_digits=10, decimal_places=7)),
                ('origen_lon',      models.DecimalField(max_digits=10, decimal_places=7)),
                ('destino_nombre',  models.CharField(max_length=300)),
                ('destino_lat',     models.DecimalField(max_digits=10, decimal_places=7)),
                ('destino_lon',     models.DecimalField(max_digits=10, decimal_places=7)),
                ('pos_lat',         models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)),
                ('pos_lon',         models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)),
                ('pos_actualizada', models.DateTimeField(null=True, blank=True)),
                ('ruta_geojson',    models.JSONField(null=True, blank=True)),
                ('distancia_km',    models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)),
                ('duracion_min',    models.PositiveIntegerField(null=True, blank=True)),
                ('notas',           models.TextField(blank=True)),
                ('fecha_estimada',  models.DateTimeField(null=True, blank=True)),
                ('fecha_creacion',  models.DateTimeField(auto_now_add=True)),
                ('fecha_update',    models.DateTimeField(auto_now=True)),
                ('conductor',       models.ForeignKey(null=True, blank=True, on_delete=django.db.models.deletion.SET_NULL, related_name='envios', to='envios.conductor')),
            ],
            options={'ordering': ['-fecha_creacion']},
        ),
        migrations.CreateModel(
            name='Parada',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('orden',       models.PositiveSmallIntegerField()),
                ('pedido_id',   models.PositiveIntegerField(null=True, blank=True)),
                ('nombre',      models.CharField(max_length=300)),
                ('direccion',   models.CharField(max_length=400)),
                ('lat',         models.DecimalField(max_digits=10, decimal_places=7)),
                ('lon',         models.DecimalField(max_digits=10, decimal_places=7)),
                ('estado',      models.CharField(max_length=20, choices=[('PENDIENTE','Pendiente'),('EN_CAMINO','En camino'),('LLEGADO','Llegado'),('ENTREGADO','Entregado'),('FALLIDO','Fallido')], default='PENDIENTE')),
                ('notas',       models.TextField(blank=True)),
                ('llegada_real',models.DateTimeField(null=True, blank=True)),
                ('creado_en',   models.DateTimeField(auto_now_add=True)),
                ('envio',       models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='paradas', to='envios.envio')),
            ],
            options={'ordering': ['orden']},
        ),
        migrations.CreateModel(
            name='EventoRuta',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('tipo',      models.CharField(max_length=20, choices=[('POSICION','Actualización de posición'),('ESTADO','Cambio de estado'),('INCIDENTE','Incidente'),('NOTA','Nota')])),
                ('lat',       models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)),
                ('lon',       models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)),
                ('mensaje',   models.TextField(blank=True)),
                ('creado_en', models.DateTimeField(auto_now_add=True)),
                ('envio',     models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='eventos', to='envios.envio')),
            ],
            options={'ordering': ['-creado_en']},
        ),
    ]
