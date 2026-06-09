import logging
from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from .gateway import MicroserviceGateway

logger = logging.getLogger(__name__)

# ─── Configuración Twilio ─────────────────────────────────────────────────────
# Cuando tengas las credenciales, agrégalas al .env del BFF:
#
#   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
#   TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
#   TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
#
# Y descomenta las líneas marcadas con [TWILIO]

# [TWILIO] from django.conf import settings
# [TWILIO] from twilio.rest import Client
# [TWILIO] from twilio.request_validator import RequestValidator


def enviar_whatsapp(to: str, mensaje: str):
    """
    Envía un mensaje WhatsApp via Twilio.
    Descomenta cuando tengas las credenciales.
    """
    # [TWILIO]
    # client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
    # client.messages.create(
    #     from_=settings.TWILIO_WHATSAPP_FROM,
    #     to=f'whatsapp:{to}',
    #     body=mensaje,
    # )
    logger.info('[WhatsApp simulado] → %s: %s', to, mensaje)


# ─── Lógica del chatbot ───────────────────────────────────────────────────────

def _extraer_numero_pedido(texto: str):
    """Extrae el primer número que aparece en el mensaje."""
    import re
    numeros = re.findall(r'\d+', texto)
    return int(numeros[0]) if numeros else None


def _respuesta_estado_pedido(pedido_id: int) -> str:
    """Consulta ms-pedidos y arma la respuesta."""
    ESTADO_EMOJI = {
        'PENDIENTE':  '⏳',
        'PROCESANDO': '📦',
        'ENVIADO':    '🚚',
        'ENTREGADO':  '✅',
        'CANCELADO':  '❌',
    }
    ESTADO_LABEL = {
        'PENDIENTE':  'Pendiente de procesamiento',
        'PROCESANDO': 'En preparación',
        'ENVIADO':    'En camino',
        'ENTREGADO':  'Entregado',
        'CANCELADO':  'Cancelado',
    }
    try:
        pedido = MicroserviceGateway.get_pedido(pedido_id)
        estado = pedido.get('estado', '')
        emoji  = ESTADO_EMOJI.get(estado, '📋')
        label  = ESTADO_LABEL.get(estado, estado)
        fecha  = str(pedido.get('fecha_creacion', ''))[:10]

        respuesta = (
            f"{emoji} *Pedido #{pedido_id}*\n"
            f"Estado: *{label}*\n"
            f"Cliente: {pedido.get('cliente', '-')}\n"
            f"Fecha: {fecha}\n"
        )

        # Si está enviado, intentar agregar info del envío
        if estado == 'ENVIADO':
            try:
                envio = MicroserviceGateway.get_envio_por_pedido(pedido_id)
                if envio:
                    dist = envio.get('distancia_km')
                    dur  = envio.get('duracion_min')
                    dest = envio.get('destino_nombre', '')
                    if dist and dur:
                        respuesta += f"📍 Destino: {dest}\n"
                        respuesta += f"🛣 {dist} km · ⏱ ~{dur} min\n"
            except Exception:
                pass

        return respuesta

    except Exception:
        return (
            f"❌ No encontré el pedido *#{pedido_id}*.\n"
            "Verifica el número e intenta de nuevo."
        )


def _procesar_mensaje(mensaje: str, telefono: str) -> str:
    """
    Lógica principal del chatbot.
    Retorna el texto de respuesta.
    """
    texto = mensaje.strip().lower()

    # ── Saludo ────────────────────────────────────────────────────────────────
    saludos = ['hola', 'hello', 'hi', 'buenas', 'buen día', 'buenos días',
               'buenas tardes', 'buenas noches', 'ola']
    if any(s in texto for s in saludos):
        return (
            "👋 ¡Hola! Soy el asistente de *SmartLogix*.\n\n"
            "Puedo ayudarte con:\n"
            "1️⃣ Consultar estado de tu pedido\n"
            "2️⃣ Ver información de tu envío\n"
            "3️⃣ Reportar un problema\n\n"
            "Escribe el *número de tu pedido* o elige una opción (1, 2 o 3)."
        )

    # ── Opción 1 o "estado" ───────────────────────────────────────────────────
    if texto in ['1', 'estado', 'pedido', 'consultar pedido', 'ver pedido']:
        return (
            "📋 Por favor escribe el *número de tu pedido*.\n"
            "Ejemplo: *42*"
        )

    # ── Opción 2 o "envío" ────────────────────────────────────────────────────
    if texto in ['2', 'envio', 'envío', 'donde esta', 'dónde está', 'tracking']:
        return (
            "🚚 Por favor escribe el *número de tu pedido* para ver el estado del envío.\n"
            "Ejemplo: *42*"
        )

    # ── Opción 3 o "problema" ─────────────────────────────────────────────────
    if texto in ['3', 'problema', 'reclamo', 'queja', 'no llegó', 'no llego', 'ayuda']:
        return (
            "😟 Lamentamos el inconveniente.\n\n"
            "Por favor escribe el *número de tu pedido* y una breve descripción del problema.\n"
            "Ejemplo: *42 — no llegó el pedido*\n\n"
            "Un agente te contactará en menos de 24 horas. 🕐"
        )

    # ── Número de pedido directo ──────────────────────────────────────────────
    pedido_id = _extraer_numero_pedido(mensaje)
    if pedido_id:
        return _respuesta_estado_pedido(pedido_id)

    # ── Agradecimiento / confirmación ─────────────────────────────────────────
    if any(p in texto for p in ['gracias', 'ok', 'listo', 'perfecto', 'entendido']):
        return (
            "😊 ¡De nada! Si necesitas algo más, escríbeme.\n"
            "Recuerda que puedes consultar el estado de tu pedido en cualquier momento."
        )

    # ── Fallback ──────────────────────────────────────────────────────────────
    return (
        "🤔 No entendí tu mensaje.\n\n"
        "Puedes:\n"
        "• Escribir el *número de tu pedido* (ej: *42*)\n"
        "• Escribir *hola* para ver el menú de opciones\n"
        "• Escribir *ayuda* si tienes un problema"
    )


# ─── Webhook ──────────────────────────────────────────────────────────────────

class WhatsAppWebhookView(APIView):
    """
    POST /api/whatsapp/webhook/
    Twilio envía aquí los mensajes entrantes de WhatsApp.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        # Extraer datos del webhook de Twilio
        mensaje  = request.data.get('Body', '').strip()
        telefono = request.data.get('From', '').replace('whatsapp:', '')

        if not mensaje or not telefono:
            return Response({'detail': 'Payload inválido'}, status=status.HTTP_400_BAD_REQUEST)

        logger.info('[WhatsApp] Mensaje de %s: %s', telefono, mensaje)

        # Procesar y generar respuesta
        respuesta = _procesar_mensaje(mensaje, telefono)

        # Enviar respuesta
        enviar_whatsapp(telefono, respuesta)

        # Twilio espera un TwiML response o 200 vacío
        # Respondemos con TwiML para que Twilio no reintente
        twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>{respuesta}</Message>
</Response>"""
        return HttpResponse(twiml, content_type='text/xml', status=200)

    def get(self, request):
        """Health check del webhook."""
        return Response({'status': 'WhatsApp webhook activo ✓'})