import random
from django.contrib.auth.models import User
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from .models import Empresa, PerfilUsuario


TERMINOS_ETICOS = """
Términos Éticos — SmartLogix

Al usar SmartLogix usted declara y garantiza que:

1. No comercializará productos ilícitos, prohibidos por ley, o que promuevan violencia, discriminación o actividades ilegales.
2. Cumplirá con todas las leyes y regulaciones aplicables a su actividad comercial.
3. No utilizará la plataforma para actividades fraudulentas o engañosas.
4. Respetará los derechos de propiedad intelectual de terceros.
5. SmartLogix se reserva el derecho de suspender o deshabilitar cuentas que violen estos términos.
"""


def generar_codigo_validacion():
    return ''.join(str(random.randint(0, 9)) for _ in range(6))


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


def verificar_empresa_activa(user):
    try:
        perfil = user.perfil
        if perfil.empresa and not perfil.empresa.activo:
            return False
    except PerfilUsuario.DoesNotExist:
        pass
    return True


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
        acepto_terminos      = request.data.get('acepto_terminos', False)

        if not nombre or not email or not password:
            return Response(
                {'detail': 'nombre, email y password son requeridos.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not acepto_terminos:
            return Response(
                {'detail': 'Debes aceptar los términos y condiciones.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if User.objects.filter(username=email).exists():
            return Response(
                {'detail': 'Ya existe una cuenta con ese correo.'},
                status=status.HTTP_409_CONFLICT
            )

        # Validar RUT único
        if rut and Empresa.objects.filter(rut=rut).exists():
            return Response(
                {'detail': 'Ya existe una empresa registrada con ese RUT.'},
                status=status.HTTP_409_CONFLICT
            )

        # Validar razón social única
        if razon_social and Empresa.objects.filter(razon_social=razon_social).exists():
            return Response(
                {'detail': 'Ya existe una empresa registrada con esa razón social.'},
                status=status.HTTP_409_CONFLICT
            )

        # Crear empresa
        empresa = None
        if rut:
            empresa = Empresa.objects.create(
                rut=rut,
                razon_social=razon_social,
                nombre_comercial=nombre_comercial,
                giro=giro,
                giro_codigo=giro_codigo,
                region=region,
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
            acepto_terminos=acepto_terminos,
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

        if not verificar_empresa_activa(user):
            return Response(
                {'detail': 'Su cuenta ha sido deshabilitada. Contacte al administrador.'},
                status=status.HTTP_403_FORBIDDEN
            )

        return Response(get_tokens(user), status=status.HTTP_200_OK)


class PerfilView(APIView):
    """GET/PUT /api/auth/perfil/ — datos del perfil del usuario logueado"""
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
            'acepto_terminos':      perfil.acepto_terminos,
            'terminos_eticos':      TERMINOS_ETICOS,
            'empresa': {
                'id':               empresa.id               if empresa else None,
                'rut':              empresa.rut              if empresa else '',
                'razon_social':     empresa.razon_social     if empresa else '',
                'nombre_comercial': empresa.nombre_comercial if empresa else '',
                'giro':             empresa.giro             if empresa else '',
                'region':           empresa.region           if empresa else '',
                'activo':           empresa.activo           if empresa else True,
            }
        })

    def put(self, request):
        try:
            perfil  = request.user.perfil
            empresa = perfil.empresa
        except PerfilUsuario.DoesNotExist:
            return Response({'detail': 'Perfil no encontrado'}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        if 'nombre' in request.data:
            user.first_name = request.data['nombre']
        if 'email' in request.data:
            user.email = request.data['email']
            user.username = request.data['email']
        user.save()

        if 'nombre_representante' in request.data:
            perfil.nombre_representante = request.data['nombre_representante']
        perfil.save()

        if empresa:
            if 'razon_social' in request.data:
                empresa.razon_social = request.data['razon_social']
            if 'nombre_comercial' in request.data:
                empresa.nombre_comercial = request.data['nombre_comercial']
            empresa.save()

        return self.get(request)


class SuperAdminEmpresasListView(APIView):
    """GET /api/auth/superadmin/empresas/ — lista todas las empresas (solo superadmin)"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.perfil.rol != 'superadmin':
            return Response({'detail': 'No autorizado'}, status=status.HTTP_403_FORBIDDEN)
        empresas = Empresa.objects.all().order_by('-creado_en')
        data = []
        for e in empresas:
            admin_perfil = e.usuarios.filter(rol='admin').first()
            data.append({
                'id': e.id,
                'rut': e.rut,
                'razon_social': e.razon_social,
                'nombre_comercial': e.nombre_comercial,
                'giro': e.giro,
                'region': e.region,
                'activo': e.activo,
                'admin_email': admin_perfil.user.email if admin_perfil else '',
                'admin_nombre': admin_perfil.user.first_name if admin_perfil else '',
                'total_usuarios': e.usuarios.count(),
                'creado_en': e.creado_en.isoformat(),
            })
        return Response(data)


class SuperAdminEmpresaDetailView(APIView):
    """PUT /api/auth/superadmin/empresas/<pk>/ — toggle activo, etc."""
    permission_classes = [IsAuthenticated]

    def put(self, request, pk):
        if request.user.perfil.rol != 'superadmin':
            return Response({'detail': 'No autorizado'}, status=status.HTTP_403_FORBIDDEN)
        try:
            empresa = Empresa.objects.get(pk=pk)
        except Empresa.DoesNotExist:
            return Response({'detail': 'Empresa no encontrada'}, status=status.HTTP_404_NOT_FOUND)
        if 'activo' in request.data:
            empresa.activo = request.data['activo']
        empresa.save()
        return Response({'detail': 'Empresa actualizada', 'activo': empresa.activo})