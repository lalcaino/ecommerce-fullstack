from django.urls import path
from .views import (
    PedidoListView, PedidoDetailView, PedidosPorEstadoView,
    TiendaListView, TiendaDetailView,
)

urlpatterns = [
    path('pedidos/', PedidoListView.as_view()),
    path('pedidos/<int:pk>/', PedidoDetailView.as_view()),
    path('pedidos/estado/<str:estado>/', PedidosPorEstadoView.as_view()),
    path('tiendas/', TiendaListView.as_view()),
    path('tiendas/<int:pk>/', TiendaDetailView.as_view()),
]