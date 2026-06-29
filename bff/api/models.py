from django.db import models
from django.contrib.auth.models import User


class Empresa(models.Model):
    rut              = models.CharField(max_length=20, unique=True)
    razon_social     = models.CharField(max_length=300, unique=True)
    nombre_comercial = models.CharField(max_length=300, blank=True)
    giro             = models.CharField(max_length=300, blank=True)
    giro_codigo      = models.CharField(max_length=20, blank=True)
    region           = models.CharField(max_length=200, blank=True)
    activo           = models.BooleanField(default=True)
    creado_en        = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'empresa'

    def __str__(self):
        return f'{self.nombre_comercial or self.razon_social} ({self.rut})'


class PerfilUsuario(models.Model):
    ROL_CHOICES = [
        ('admin',       'Administrador'),
        ('repartidor',  'Repartidor'),
        ('superadmin',  'Super Administrador'),
    ]

    user                 = models.OneToOneField(User, on_delete=models.CASCADE, related_name='perfil')
    empresa              = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name='usuarios', null=True, blank=True)
    nombre_representante = models.CharField(max_length=200, blank=True)
    rol                  = models.CharField(max_length=20, choices=ROL_CHOICES, default='admin')
    acepto_terminos      = models.BooleanField(default=False)
    creado_en            = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'perfil_usuario'

    def __str__(self):
        return f'{self.user.email} — {self.empresa} [{self.rol}]'