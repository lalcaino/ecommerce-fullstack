from django.urls import path
from .whatsapp_views import WhatsAppWebhookView

urlpatterns = [
    path('webhook/', WhatsAppWebhookView.as_view()),
]