from django.urls import path
from .views import (
    InventarioListView, InventarioDetailView,
    PedidosListView, PedidosDetailView,
    BodegasListView, BodegasDetailView,
    TiendasListView, TiendasDetailView,
    DashboardView,
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
]