from django.urls import path
from .views import PedidoListView, PedidoDetailView, PedidosPorEstadoView

urlpatterns = [
    path('pedidos/',                      PedidoListView.as_view()),
    path('pedidos/<int:pk>/',             PedidoDetailView.as_view()),
    path('pedidos/estado/<str:estado>/',  PedidosPorEstadoView.as_view()),
]
