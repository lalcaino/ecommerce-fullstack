"""
views.py — Microservicio de Pedidos SmartLogix
Usa PedidoRepository (Repository Pattern) y PedidoFactory (Factory Method).
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import PedidoRepository, PedidoFactory
from .serializers import PedidoSerializer, EstadoUpdateSerializer


class PedidoListView(APIView):
    def get(self, request):
        pedidos = PedidoRepository.get_all()
        return Response(PedidoSerializer(pedidos, many=True).data)

    def post(self, request):
        """
        Acepta un campo opcional 'tipo_pedido' (estandar|express|corporativo)
        para usar el Factory Method en la creación del pedido.
        """
        tipo = request.data.get('tipo_pedido', 'estandar')
        data = dict(request.data)
        data.pop('tipo_pedido', None)

        if 'cliente' in data and 'email_cliente' in data and not data.get('estado'):
            factory_defaults = PedidoFactory.crear(
                tipo,
                cliente=data['cliente'],
                email=data['email_cliente'],
                notas=data.get('notas', ''),
            )
            data.update({k: v for k, v in factory_defaults.items() if k not in data})

        serializer = PedidoSerializer(data=data)
        if serializer.is_valid():
            pedido = PedidoRepository.create(serializer.validated_data)
            return Response(PedidoSerializer(pedido).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PedidoDetailView(APIView):
    def _get(self, pk):
        try:
            return PedidoRepository.get_by_id(pk), None
        except Exception:
            return None, Response({'detail': 'Pedido no encontrado'}, status=status.HTTP_404_NOT_FOUND)

    def get(self, request, pk):
        pedido, err = self._get(pk)
        if err: return err
        return Response(PedidoSerializer(pedido).data)

    def patch(self, request, pk):
        pedido, err = self._get(pk)
        if err: return err
        serializer = EstadoUpdateSerializer(data=request.data)
        if serializer.is_valid():
            updated = PedidoRepository.update_estado(pk, serializer.validated_data['estado'])
            return Response(PedidoSerializer(updated).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        _, err = self._get(pk)
        if err: return err
        PedidoRepository.delete(pk)
        return Response(status=status.HTTP_204_NO_CONTENT)


class PedidosPorEstadoView(APIView):
    def get(self, request, estado):
        pedidos = PedidoRepository.get_by_estado(estado.upper())
        return Response(PedidoSerializer(pedidos, many=True).data)
