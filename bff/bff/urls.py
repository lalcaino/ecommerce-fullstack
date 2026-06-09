from django.urls import path, include

urlpatterns = [
    path('api/',            include('api.urls')),
    path('api/auth/',       include('api.auth_urls')),
    path('api/whatsapp/',   include('api.whatsapp_urls')),
    path('api/exportar/',   include('api.export_urls')),
]