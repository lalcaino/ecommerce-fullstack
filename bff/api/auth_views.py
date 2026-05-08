"""
auth_views.py — Registro y login de usuarios SmartLogix
Usa el modelo User de Django + SimpleJWT para tokens.
"""
from django.contrib.auth.models import User
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import RefreshToken


def get_tokens(user):
    refresh = RefreshToken.for_user(user)
    return {
        'access':  str(refresh.access_token),
        'refresh': str(refresh),
    }


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        nombre   = request.data.get('nombre', '').strip()
        email    = request.data.get('email', '').strip().lower()
        password = request.data.get('password', '')

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

        user = User.objects.create_user(
            username=email,
            email=email,
            password=password,
            first_name=nombre,
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