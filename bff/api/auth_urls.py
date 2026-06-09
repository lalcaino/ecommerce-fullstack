from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .auth_views import LoginView, RegisterView, PerfilView

urlpatterns = [
    path('login/',    LoginView.as_view()),
    path('registro/', RegisterView.as_view()),
    path('refresh/',  TokenRefreshView.as_view()),
    path('perfil/',   PerfilView.as_view()),
]