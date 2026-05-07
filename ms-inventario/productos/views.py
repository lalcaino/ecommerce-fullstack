"""
views.py — Microservicio de Inventario
Las vistas usan ProductoRepository (patrón Repository) en lugar de ORM directo.
Esto desacopla la lógica de acceso a datos de la capa de presentación.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import ProductoRepository
from .serializers import ProductoSerializer


class ProductoListView(APIView):
    def get(self, request):
        productos = ProductoRepository.get_all()
        return Response(ProductoSerializer(productos, many=True).data)

    def post(self, request):
        serializer = ProductoSerializer(data=request.data)
        if serializer.is_valid():
            producto = ProductoRepository.create(serializer.validated_data)
            return Response(ProductoSerializer(producto).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ProductoDetailView(APIView):
    def _get(self, pk):
        try:
            return ProductoRepository.get_by_id(pk), None
        except Exception:
            return None, Response({'detail': 'Producto no encontrado'}, status=status.HTTP_404_NOT_FOUND)

    def get(self, request, pk):
        producto, err = self._get(pk)
        if err: return err
        return Response(ProductoSerializer(producto).data)

    def put(self, request, pk):
        producto, err = self._get(pk)
        if err: return err
        serializer = ProductoSerializer(producto, data=request.data, partial=False)
        if serializer.is_valid():
            updated = ProductoRepository.update(pk, serializer.validated_data)
            return Response(ProductoSerializer(updated).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, pk):
        producto, err = self._get(pk)
        if err: return err
        serializer = ProductoSerializer(producto, data=request.data, partial=True)
        if serializer.is_valid():
            updated = ProductoRepository.update(pk, serializer.validated_data)
            return Response(ProductoSerializer(updated).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        _, err = self._get(pk)
        if err: return err
        ProductoRepository.delete(pk)
        return Response(status=status.HTTP_204_NO_CONTENT)


class StockAjusteView(APIView):
    """Endpoint dedicado para ajuste atómico de stock."""
    def post(self, request, pk):
        cantidad = request.data.get('cantidad')
        if cantidad is None:
            return Response({'detail': 'Se requiere el campo cantidad'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            producto = ProductoRepository.ajustar_stock(pk, int(cantidad))
            return Response(ProductoSerializer(producto).data)
        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class BajoStockView(APIView):
    """Lista de productos que han alcanzado el stock mínimo."""
    def get(self, request):
        productos = ProductoRepository.get_bajo_stock()
        return Response(ProductoSerializer(productos, many=True).data)
