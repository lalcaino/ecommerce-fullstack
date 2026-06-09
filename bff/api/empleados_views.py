import secrets
import string
from django.contrib.auth.models import User
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from .models import Empresa, PerfilUsuario


def _get_empresa_rut(request):
    try:
        return request.auth.get('empresa_rut', '') if request.auth else ''
    except Exception:
        return ''


def _get_rol(request):
    try:
        return request.auth.get('rol', '') if request.auth else ''
    except Exception:
        return ''


class EmpleadosListView(APIView):
    """
    GET  /api/auth/empleados/  — lista empleados de la empresa
    POST /api/auth/empleados/  — crea un repartidor
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        empresa_rut = _get_empresa_rut(request)
        if not empresa_rut:
            return Response({'detail': 'Sin empresa asociada.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            empresa = Empresa.objects.get(rut=empresa_rut)
        except Empresa.DoesNotExist:
            return Response({'detail': 'Empresa no encontrada.'}, status=status.HTTP_404_NOT_FOUND)

        perfiles = PerfilUsuario.objects.filter(
            empresa=empresa,
            rol='repartidor'
        ).select_related('user')

        empleados = []
        for p in perfiles:
            empleados.append({
                'id':     p.id,
                'nombre': p.user.first_name,
                'email':  p.user.email,
                'rol':    p.rol,
                'activo': p.user.is_active,
            })

        return Response(empleados)

    def post(self, request):
        empresa_rut = _get_empresa_rut(request)
        rol_usuario = _get_rol(request)

        if not empresa_rut:
            return Response({'detail': 'Sin empresa asociada.'}, status=status.HTTP_403_FORBIDDEN)

        if rol_usuario != 'admin':
            return Response({'detail': 'Solo los administradores pueden crear empleados.'}, status=status.HTTP_403_FORBIDDEN)

        nombre   = request.data.get('nombre', '').strip()
        email    = request.data.get('email', '').strip().lower()
        password = request.data.get('password', '').strip()

        if not nombre or not email or not password:
            return Response({'detail': 'nombre, email y password son requeridos.'}, status=status.HTTP_400_BAD_REQUEST)

        if len(password) < 6:
            return Response({'detail': 'La contraseña debe tener al menos 6 caracteres.'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username=email).exists():
            return Response({'detail': 'Ya existe un usuario con ese correo.'}, status=status.HTTP_409_CONFLICT)

        try:
            empresa = Empresa.objects.get(rut=empresa_rut)
        except Empresa.DoesNotExist:
            return Response({'detail': 'Empresa no encontrada.'}, status=status.HTTP_404_NOT_FOUND)

        user = User.objects.create_user(
            username=email,
            email=email,
            password=password,
            first_name=nombre,
        )

        PerfilUsuario.objects.create(
            user=user,
            empresa=empresa,
            rol='repartidor',
        )

        return Response({
            'id':     user.id,
            'nombre': user.first_name,
            'email':  user.email,
            'rol':    'repartidor',
            'activo': True,
        }, status=status.HTTP_201_CREATED)


class EmpleadoDetailView(APIView):
    """
    DELETE /api/auth/empleados/<id>/  — elimina un repartidor
    PATCH  /api/auth/empleados/<id>/  — activa/desactiva
    """
    permission_classes = [IsAuthenticated]

    def _get_perfil(self, pk, empresa_rut):
        try:
            perfil = PerfilUsuario.objects.select_related('user', 'empresa').get(
                pk=pk, rol='repartidor', empresa__rut=empresa_rut
            )
            return perfil, None
        except PerfilUsuario.DoesNotExist:
            return None, Response({'detail': 'Empleado no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

    def patch(self, request, pk):
        empresa_rut = _get_empresa_rut(request)
        rol_usuario = _get_rol(request)

        if rol_usuario != 'admin':
            return Response({'detail': 'Sin permisos.'}, status=status.HTTP_403_FORBIDDEN)

        perfil, err = self._get_perfil(pk, empresa_rut)
        if err: return err

        activo = request.data.get('activo')
        if activo is not None:
            perfil.user.is_active = bool(activo)
            perfil.user.save(update_fields=['is_active'])

        return Response({
            'id':     perfil.id,
            'nombre': perfil.user.first_name,
            'email':  perfil.user.email,
            'rol':    perfil.rol,
            'activo': perfil.user.is_active,
        })

    def delete(self, request, pk):
        empresa_rut = _get_empresa_rut(request)
        rol_usuario = _get_rol(request)

        if rol_usuario != 'admin':
            return Response({'detail': 'Sin permisos.'}, status=status.HTTP_403_FORBIDDEN)

        perfil, err = self._get_perfil(pk, empresa_rut)
        if err: return err

        perfil.user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)