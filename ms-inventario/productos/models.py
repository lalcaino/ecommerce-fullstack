from django.db import models


class Bodega(models.Model):
    empresa_rut = models.CharField(max_length=20, blank=True, db_index=True)
    nombre      = models.CharField(max_length=200)
    direccion   = models.CharField(max_length=300)
    capacidad   = models.PositiveIntegerField(default=0)
    activa      = models.BooleanField(default=True)
    creado_en   = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['nombre']

    def __str__(self):
        return self.nombre


class Producto(models.Model):
    TIPO_CHOICES = [
        ('FISICO',   'Producto Físico'),
        ('DIGITAL',  'Producto Digital'),
        ('SERVICIO', 'Servicio'),
    ]

    empresa_rut    = models.CharField(max_length=20, blank=True, db_index=True)
    nombre         = models.CharField(max_length=200)
    descripcion    = models.TextField(blank=True)
    tipo           = models.CharField(max_length=20, choices=TIPO_CHOICES, default='FISICO')
    precio         = models.DecimalField(max_digits=12, decimal_places=2)
    stock          = models.PositiveIntegerField(default=0)
    stock_minimo   = models.PositiveIntegerField(default=5)
    peso_kg        = models.DecimalField(max_digits=8, decimal_places=3, null=True, blank=True)
    url_descarga   = models.URLField(null=True, blank=True)
    duracion_dias  = models.PositiveIntegerField(null=True, blank=True)
    imagen_url     = models.URLField(null=True, blank=True)
    activo         = models.BooleanField(default=True)
    bodega         = models.ForeignKey(Bodega, null=True, blank=True, on_delete=models.SET_NULL, related_name='productos')
    creado_en      = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-creado_en']

    def __str__(self):
        return f'{self.nombre} (stock: {self.stock})'

    @property
    def bajo_stock(self):
        return self.stock <= self.stock_minimo


class BodegaRepository:
    @staticmethod
    def get_all(empresa_rut=None):
        qs = Bodega.objects.filter(activa=True)
        if empresa_rut:
            qs = qs.filter(empresa_rut=empresa_rut)
        return qs

    @staticmethod
    def get_by_id(pk):
        return Bodega.objects.get(pk=pk)

    @staticmethod
    def create(data):
        return Bodega.objects.create(**data)

    @staticmethod
    def update(pk, data):
        Bodega.objects.filter(pk=pk).update(**data)
        return Bodega.objects.get(pk=pk)

    @staticmethod
    def delete(pk):
        Bodega.objects.filter(pk=pk).delete()


class ProductoRepository:
    @staticmethod
    def get_all(activo=True, empresa_rut=None):
        qs = Producto.objects.filter(activo=activo)
        if empresa_rut:
            qs = qs.filter(empresa_rut=empresa_rut)
        return qs

    @staticmethod
    def get_by_id(pk):
        return Producto.objects.get(pk=pk)

    @staticmethod
    def create(data):
        return Producto.objects.create(**data)

    @staticmethod
    def update(pk, data):
        Producto.objects.filter(pk=pk).update(**data)
        return Producto.objects.get(pk=pk)

    @staticmethod
    def delete(pk):
        Producto.objects.filter(pk=pk).delete()

    @staticmethod
    def get_bajo_stock(empresa_rut=None):
        from django.db.models import F
        qs = Producto.objects.filter(stock__lte=F('stock_minimo'), activo=True)
        if empresa_rut:
            qs = qs.filter(empresa_rut=empresa_rut)
        return qs

    @staticmethod
    def ajustar_stock(pk, cantidad):
        from django.db.models import F
        Producto.objects.filter(pk=pk).update(stock=F('stock') + cantidad)
        return Producto.objects.get(pk=pk)