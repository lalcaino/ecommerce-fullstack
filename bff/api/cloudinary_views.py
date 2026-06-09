import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from .gateway import MicroserviceGateway

logger = logging.getLogger(__name__)

# ─── Cloudinary ───────────────────────────────────────────────────────────────
# Cuando tengas las credenciales, agrégalas al .env del BFF:
#
#   CLOUDINARY_CLOUD_NAME=tu_cloud_name
#   CLOUDINARY_API_KEY=tu_api_key
#   CLOUDINARY_API_SECRET=tu_api_secret
#
# Y ejecuta: pip install cloudinary
# Luego descomenta las líneas marcadas con [CLOUDINARY]

# [CLOUDINARY] import cloudinary
# [CLOUDINARY] import cloudinary.uploader
# [CLOUDINARY] from django.conf import settings
# [CLOUDINARY]
# [CLOUDINARY] cloudinary.config(
# [CLOUDINARY]     cloud_name = settings.CLOUDINARY_CLOUD_NAME,
# [CLOUDINARY]     api_key    = settings.CLOUDINARY_API_KEY,
# [CLOUDINARY]     api_secret = settings.CLOUDINARY_API_SECRET,
# [CLOUDINARY] )

CLOUDINARY_READY = False  # Cambiar a True cuando estén las credenciales


def subir_imagen_cloudinary(archivo, carpeta='smartlogix', public_id=None):
    """
    Sube una imagen a Cloudinary y retorna la URL segura.
    Descomenta cuando tengas las credenciales.
    """
    # [CLOUDINARY]
    # result = cloudinary.uploader.upload(
    #     archivo,
    #     folder=carpeta,
    #     public_id=public_id,
    #     overwrite=True,
    #     resource_type='image',
    # )
    # return result.get('secure_url', '')

    # Simulado — retorna URL vacía hasta tener credenciales
    logger.info('[Cloudinary simulado] Archivo recibido: %s', getattr(archivo, 'name', 'unknown'))
    return ''


class FotoEntregaView(APIView):
    """
    POST /api/envios/<pk>/foto-entrega/
    El repartidor sube una foto para confirmar la entrega.
    Solo después de subir la foto se puede marcar como COMPLETADO.
    """
    permission_classes = [IsAuthenticated]
    parser_classes     = [MultiPartParser, FormParser]

    def post(self, request, pk):
        foto = request.FILES.get('foto')

        if not foto:
            return Response(
                {'detail': 'Se requiere una foto para confirmar la entrega.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validar que sea imagen
        tipos_permitidos = ['image/jpeg', 'image/png', 'image/webp']
        if foto.content_type not in tipos_permitidos:
            return Response(
                {'detail': 'Solo se aceptan imágenes JPG, PNG o WebP.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validar tamaño máximo 10MB
        if foto.size > 10 * 1024 * 1024:
            return Response(
                {'detail': 'La imagen no puede superar los 10MB.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verificar que el envío existe
        try:
            envio = MicroserviceGateway.get_envio(pk)
        except Exception:
            return Response({'detail': 'Envío no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        if envio.get('estado') == 'COMPLETADO':
            return Response({'detail': 'Este envío ya fue completado.'}, status=status.HTTP_400_BAD_REQUEST)

        # Subir foto a Cloudinary
        url_foto = subir_imagen_cloudinary(
            foto,
            carpeta='smartlogix/entregas',
            public_id=f'entrega_envio_{pk}',
        )

        # Actualizar estado a COMPLETADO en ms-envios
        try:
            envio_actualizado = MicroserviceGateway.update_estado_envio(pk, {'estado': 'COMPLETADO'})
        except Exception as exc:
            return Response({'detail': f'Error al actualizar estado: {exc}'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        # Sincronizar pedido a ENTREGADO
        try:
            pedido_id = envio.get('pedido_id')
            if pedido_id:
                MicroserviceGateway.patch_pedido(pedido_id, {'estado': 'ENTREGADO'})
        except Exception as e:
            logger.warning('No se pudo sincronizar pedido: %s', e)

        return Response({
            'detail':  'Entrega confirmada exitosamente.',
            'foto_url': url_foto,
            'envio':   envio_actualizado,
        }, status=status.HTTP_200_OK)


class SubirImagenProductoView(APIView):
    """
    POST /api/inventario/<pk>/imagen/
    Sube imagen de un producto al inventario.
    """
    permission_classes = [IsAuthenticated]
    parser_classes     = [MultiPartParser, FormParser]

    def post(self, request, pk):
        imagen = request.FILES.get('imagen')

        if not imagen:
            return Response({'detail': 'Se requiere una imagen.'}, status=status.HTTP_400_BAD_REQUEST)

        tipos_permitidos = ['image/jpeg', 'image/png', 'image/webp']
        if imagen.content_type not in tipos_permitidos:
            return Response({'detail': 'Solo JPG, PNG o WebP.'}, status=status.HTTP_400_BAD_REQUEST)

        if imagen.size > 5 * 1024 * 1024:
            return Response({'detail': 'La imagen no puede superar los 5MB.'}, status=status.HTTP_400_BAD_REQUEST)

        url_imagen = subir_imagen_cloudinary(
            imagen,
            carpeta='smartlogix/productos',
            public_id=f'producto_{pk}',
        )

        return Response({
            'detail':    'Imagen subida exitosamente.',
            'imagen_url': url_imagen,
        }, status=status.HTTP_200_OK)