from django.urls import path
from .views import (
    InventarioListView, InventarioDetailView,
    PedidosListView, PedidosDetailView,
    DashboardView,
)

urlpatterns = [
    path('inventario/',      InventarioListView.as_view()),
    path('inventario/<pk>/', InventarioDetailView.as_view()),
    path('pedidos/',         PedidosListView.as_view()),
    path('pedidos/<pk>/',    PedidosDetailView.as_view()),
    path('dashboard/',       DashboardView.as_view()),
]
