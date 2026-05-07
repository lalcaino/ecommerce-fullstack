from django.urls import path
from .views import ProductoListView, ProductoDetailView, StockAjusteView, BajoStockView

urlpatterns = [
    path('productos/',              ProductoListView.as_view()),
    path('productos/<int:pk>/',     ProductoDetailView.as_view()),
    path('productos/<int:pk>/ajuste-stock/', StockAjusteView.as_view()),
    path('productos/bajo-stock/',   BajoStockView.as_view()),
]
