from django.contrib.auth.models import User
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from .models import Empresa, PerfilUsuario


def get_tokens(user):
    refresh = RefreshToken.for_user(user)
    refresh['first_name'] = user.first_name
    refresh['email']      = user.email

    # Agregar datos de empresa y rol al token
    try:
        perfil = user.perfil
        refresh['rol']             = perfil.rol
        refresh['empresa_rut']     = perfil.empresa.rut if perfil.empresa else ''
        refresh['empresa_nombre']  = (
            perfil.empresa.nombre_comercial or perfil.empresa.razon_social
            if perfil.empresa else ''
        )
    except PerfilUsuario.DoesNotExist:
        refresh['rol']            = 'admin'
        refresh['empresa_rut']    = ''
        refresh['empresa_nombre'] = ''

    return {
        'access':  str(refresh.access_token),
        'refresh': str(refresh),
    }


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        nombre               = request.data.get('nombre', '').strip()
        nombre_representante = request.data.get('nombre_representante', '').strip()
        email                = request.data.get('email', '').strip().lower()
        password             = request.data.get('password', '')
        rut                  = request.data.get('rut', '').strip()
        razon_social         = request.data.get('razon_social', '').strip()
        nombre_comercial     = request.data.get('nombre_comercial', '').strip()
        giro                 = request.data.get('giro', '').strip()
        giro_codigo          = request.data.get('giro_codigo', '').strip()
        region               = request.data.get('region', '').strip()

        if not nombre or not email or not password:
            return Response(
                {'detail': 'nombre, email y password son requeridos.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if User.objects.filter(username=email).exists():
            return Response(
                {'detail': 'Ya existe una cuenta con ese correo.'},
                status=status.HTTP_409_CONFLICT
            )

        # Crear o reutilizar empresa por RUT
        empresa = None
        if rut:
            empresa, _ = Empresa.objects.get_or_create(
                rut=rut,
                defaults={
                    'razon_social':     razon_social,
                    'nombre_comercial': nombre_comercial,
                    'giro':             giro,
                    'giro_codigo':      giro_codigo,
                    'region':           region,
                }
            )

        # Crear usuario
        user = User.objects.create_user(
            username=email,
            email=email,
            password=password,
            first_name=nombre,
        )

        # Crear perfil
        PerfilUsuario.objects.create(
            user=user,
            empresa=empresa,
            nombre_representante=nombre_representante,
            rol='admin',
        )

        return Response(get_tokens(user), status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email    = request.data.get('email', '').strip().lower()
        password = request.data.get('password', '')

        try:
            user = User.objects.get(username=email)
        except User.DoesNotExist:
            return Response(
                {'detail': 'Credenciales incorrectas.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not user.check_password(password):
            return Response(
                {'detail': 'Credenciales incorrectas.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        return Response(get_tokens(user), status=status.HTTP_200_OK)


class PerfilView(APIView):
    """GET /api/auth/perfil/ — devuelve datos de la empresa del usuario logueado"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            perfil  = request.user.perfil
            empresa = perfil.empresa
        except PerfilUsuario.DoesNotExist:
            return Response({'detail': 'Perfil no encontrado'}, status=status.HTTP_404_NOT_FOUND)

        return Response({
            'nombre':               request.user.first_name,
            'email':                request.user.email,
            'nombre_representante': perfil.nombre_representante,
            'rol':                  perfil.rol,
            'empresa': {
                'rut':              empresa.rut             if empresa else '',
                'razon_social':     empresa.razon_social    if empresa else '',
                'nombre_comercial': empresa.nombre_comercial if empresa else '',
                'giro':             empresa.giro            if empresa else '',
                'region':           empresa.region          if empresa else '',
            }
        })