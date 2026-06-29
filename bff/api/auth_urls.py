from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .auth_views import LoginView, RegisterView, PerfilView, SuperAdminEmpresasListView, SuperAdminEmpresaDetailView
from .empleados_views import EmpleadosListView, EmpleadoDetailView

urlpatterns = [
    path('login/',                        LoginView.as_view()),
    path('registro/',                     RegisterView.as_view()),
    path('refresh/',                      TokenRefreshView.as_view()),
    path('perfil/',                       PerfilView.as_view()),
    path('empleados/',                    EmpleadosListView.as_view()),
    path('empleados/<int:pk>/',           EmpleadoDetailView.as_view()),
    path('superadmin/empresas/',          SuperAdminEmpresasListView.as_view()),
    path('superadmin/empresas/<int:pk>/', SuperAdminEmpresaDetailView.as_view()),
]