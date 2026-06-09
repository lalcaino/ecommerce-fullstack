from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import PedidoRepository, PedidoFactory, TiendaRepository
from .serializers import PedidoSerializer, EstadoUpdateSerializer, TiendaSerializer


class TiendaListView(APIView):
    def get(self, request):
        empresa_rut = request.query_params.get('empresa_rut')
        bodega_id   = request.query_params.get('bodega_id')
        if bodega_id:
            tiendas = TiendaRepository.get_by_bodega(bodega_id, empresa_rut=empresa_rut)
        else:
            tiendas = TiendaRepository.get_all(empresa_rut=empresa_rut)
        return Response(TiendaSerializer(tiendas, many=True).data)

    def post(self, request):
        serializer = TiendaSerializer(data=request.data)
        if serializer.is_valid():
            tienda = TiendaRepository.create(serializer.validated_data)
            return Response(TiendaSerializer(tienda).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TiendaDetailView(APIView):
    def _get(self, pk):
        try:
            return TiendaRepository.get_by_id(pk), None
        except Exception:
            return None, Response({'detail': 'Tienda no encontrada'}, status=status.HTTP_404_NOT_FOUND)

    def get(self, request, pk):
        tienda, err = self._get(pk)
        if err: return err
        return Response(TiendaSerializer(tienda).data)

    def put(self, request, pk):
        tienda, err = self._get(pk)
        if err: return err
        serializer = TiendaSerializer(tienda, data=request.data, partial=False)
        if serializer.is_valid():
            updated = TiendaRepository.update(pk, serializer.validated_data)
            return Response(TiendaSerializer(updated).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        _, err = self._get(pk)
        if err: return err
        TiendaRepository.delete(pk)
        return Response(status=status.HTTP_204_NO_CONTENT)


class PedidoListView(APIView):
    def get(self, request):
        empresa_rut = request.query_params.get('empresa_rut')
        tienda_id   = request.query_params.get('tienda_id')
        if tienda_id:
            pedidos = PedidoRepository.get_by_tienda(tienda_id, empresa_rut=empresa_rut)
        else:
            pedidos = PedidoRepository.get_all(empresa_rut=empresa_rut)
        return Response(PedidoSerializer(pedidos, many=True).data)

    def post(self, request):
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
        empresa_rut = request.query_params.get('empresa_rut')
        pedidos = PedidoRepository.get_by_estado(estado.upper(), empresa_rut=empresa_rut)
        return Response(PedidoSerializer(pedidos, many=True).data)