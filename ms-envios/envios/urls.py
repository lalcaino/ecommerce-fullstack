from django.urls import path
from .views import (
    EnvioListView, EnvioDetailView,
    EnvioEstadoView, EnvioPosicionView, EnvioRutaView,
    EnvioEnCursoView, EnvioPorPedidoView,
    ParadaEstadoView,
    ConductorListView, ConductorDetailView,
)

urlpatterns = [
    # Envíos
    path('envios/',                           EnvioListView.as_view()),
    path('envios/<int:pk>/',                  EnvioDetailView.as_view()),
    path('envios/<int:pk>/estado/',           EnvioEstadoView.as_view()),
    path('envios/<int:pk>/posicion/',         EnvioPosicionView.as_view()),
    path('envios/<int:pk>/ruta/',             EnvioRutaView.as_view()),
    path('envios/en-curso/',                  EnvioEnCursoView.as_view()),
    path('envios/pedido/<int:pedido_id>/',    EnvioPorPedidoView.as_view()),

    # Paradas
    path('paradas/<int:pk>/estado/',          ParadaEstadoView.as_view()),

    # Conductores
    path('conductores/',                      ConductorListView.as_view()),
    path('conductores/<int:pk>/',             ConductorDetailView.as_view()),
]
