from django.urls import path
from .views import (
    InventarioListView, InventarioDetailView,
    PedidosListView, PedidosDetailView,
    BodegasListView, BodegasDetailView,
    TiendasListView, TiendasDetailView,
    DashboardView,
    EnviosListView, EnviosDetailView,
    EnviosEstadoView, EnviosPosicionView, EnviosRutaView,
    EnviosEnCursoView, EnviosPorPedidoView,
    ParadaEstadoView,
    ConductoresListView, ConductoresDetailView
)

urlpatterns = [
    path('inventario/', InventarioListView.as_view()),
    path('inventario/<pk>/', InventarioDetailView.as_view()),
    path('pedidos/', PedidosListView.as_view()),
    path('pedidos/<pk>/', PedidosDetailView.as_view()),
    path('bodegas/', BodegasListView.as_view()),
    path('bodegas/<pk>/', BodegasDetailView.as_view()),
    path('tiendas/', TiendasListView.as_view()),
    path('tiendas/<pk>/', TiendasDetailView.as_view()),
    path('dashboard/', DashboardView.as_view()),
    path('envios/',                        EnviosListView.as_view()),
    path('envios/<pk>/',                   EnviosDetailView.as_view()),
    path('envios/<pk>/estado/',            EnviosEstadoView.as_view()),
    path('envios/<pk>/posicion/',          EnviosPosicionView.as_view()),
    path('envios/<pk>/ruta/',              EnviosRutaView.as_view()),
    path('envios/en-curso/',               EnviosEnCursoView.as_view()),
    path('envios/pedido/<pedido_id>/',     EnviosPorPedidoView.as_view()),
    path('paradas/<pk>/estado/',           ParadaEstadoView.as_view()),
    path('conductores/',                   ConductoresListView.as_view()),
    path('conductores/<pk>/',              ConductoresDetailView.as_view()),
]