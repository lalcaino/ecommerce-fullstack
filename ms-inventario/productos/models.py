from django.db import models


class Bodega(models.Model):
    empresa_rut            = models.CharField(max_length=20, blank=True, db_index=True)
    nombre                 = models.CharField(max_length=200)
    direccion              = models.CharField(max_length=300)
    latitud                = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    longitud               = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    capacidad              = models.PositiveIntegerField(default=0)
    capacidad_volumen_cm3  = models.FloatField(default=0, help_text='Capacidad total en cm³')
    activa                 = models.BooleanField(default=True)
    creado_en              = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['nombre']

    def __str__(self):
        return self.nombre

    @property
    def volumen_ocupado_cm3(self):
        from django.db.models import Sum, F
        result = self.productos.aggregate(
            total=Sum(F('volumen_cm3') * F('stock'))
        )['total']
        return result or 0.0

    @property
    def volumen_disponible_cm3(self):
        return self.capacidad_volumen_cm3 - self.volumen_ocupado_cm3


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
    volumen_cm3    = models.FloatField(default=0, help_text='Volumen unitario en cm³ (alto × ancho × largo)')
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
    def _validar_volumen_bodega(bodega_id, volumen_cm3, stock, exclude_pk=None):
        if not bodega_id or not volumen_cm3:
            return
        from django.db.models import Sum, F, Q
        bodega = Bodega.objects.get(pk=bodega_id)
        if not bodega.capacidad_volumen_cm3:
            return
        qs = Producto.objects.filter(bodega_id=bodega_id)
        if exclude_pk:
            qs = qs.exclude(pk=exclude_pk)
        ocupado = qs.aggregate(total=Sum(F('volumen_cm3') * F('stock')))['total'] or 0.0
        nuevo_total = float(ocupado) + (float(volumen_cm3) * int(stock))
        if nuevo_total > bodega.capacidad_volumen_cm3:
            raise ValueError(
                f'El volumen total ({nuevo_total:.0f} cm³) excede la capacidad de la bodega '
                f'({bodega.capacidad_volumen_cm3:.0f} cm³). '
                f'Disponible: {bodega.capacidad_volumen_cm3 - float(ocupado):.0f} cm³'
            )

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
        bodega_id = data.get('bodega')
        volumen_cm3 = data.get('volumen_cm3') or 0
        stock = data.get('stock') or 0
        if bodega_id and volumen_cm3:
            ProductoRepository._validar_volumen_bodega(bodega_id, volumen_cm3, stock)
        return Producto.objects.create(**data)

    @staticmethod
    def update(pk, data):
        old = Producto.objects.get(pk=pk)
        bodega_id = data.get('bodega', old.bodega_id)
        volumen_cm3 = data.get('volumen_cm3', old.volumen_cm3) or 0
        stock = data.get('stock', old.stock) or 0
        if bodega_id and volumen_cm3:
            ProductoRepository._validar_volumen_bodega(bodega_id, volumen_cm3, stock, exclude_pk=pk)
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