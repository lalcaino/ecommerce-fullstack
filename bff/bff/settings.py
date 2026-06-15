import os
from pathlib import Path
from datetime import timedelta
from decouple import config
from dotenv import load_dotenv
import os


# Asegúrate de que BASE_DIR esté definido (usualmente ya viene por defecto)
BASE_DIR = Path(__file__).resolve().parent.parent

# Cargar las variables del archivo .env
load_dotenv(os.path.join(BASE_DIR, '.env'))

DB_SCHEMA = os.environ.get('DB_SCHEMA', 'public')

BASE_DIR = Path(__file__).resolve().parent.parent
SECRET_KEY = config('SECRET_KEY', default='dev-secret-key-changeme')
DEBUG = config('DEBUG', default=True, cast=bool)
ALLOWED_HOSTS = ['*']

INSTALLED_APPS = [
    'django.contrib.contenttypes',
    'django.contrib.auth',
    'rest_framework',
    'corsheaders',
    'drf_spectacular',
    'api',
]

SPECTACULAR_SETTINGS = {
    'TITLE': 'SmartLogix API',
    'DESCRIPTION': 'API Gateway para el sistema de gestión logística SmartLogix',
    'VERSION': '1.0.0',
}

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
]

ROOT_URLCONF = 'bff.urls'
WSGI_APPLICATION = 'bff.wsgi.application'

DATABASES = {
    'default': {
        'ENGINE': os.environ.get('DB_ENGINE', 'django.db.backends.postgresql'),
        'NAME': os.environ.get('DB_NAME', 'smartlogix'),
        'USER': os.environ.get('DB_USER', 'smartlogix'),
        'PASSWORD': os.environ.get('DB_PASSWORD', 'smartlogix123'),
        'HOST': os.environ.get('DB_HOST', 'localhost'),
        'PORT': os.environ.get('DB_PORT', '5432'),
        'OPTIONS': {
            # Esto es la magia: le dice a PostgreSQL que guarde y busque 
            # las tablas de este microservicio exclusivamente en su esquema.
            'options': f'-c search_path={DB_SCHEMA},public'
        }
    }
}

REST_FRAMEWORK = {
    'DEFAULT_RENDERER_CLASSES': ['rest_framework.renderers.JSONRenderer'],
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME':  timedelta(hours=8),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'AUTH_HEADER_TYPES': ('Bearer',),
}

CORS_ALLOW_ALL_ORIGINS = True

# URLs de los microservicios
MS_INVENTARIO_URL = config('MS_INVENTARIO_URL', default='http://localhost:8001')
MS_PEDIDOS_URL    = config('MS_PEDIDOS_URL',    default='http://localhost:8002')
MS_ENVIOS_URL = config('MS_ENVIOS_URL', default='http://localhost:8003')

# Cloudinary
CLOUDINARY_CLOUD_NAME = config('CLOUDINARY_CLOUD_NAME', default='')
CLOUDINARY_API_KEY    = config('CLOUDINARY_API_KEY',    default='')
CLOUDINARY_API_SECRET = config('CLOUDINARY_API_SECRET', default='')


DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
LANGUAGE_CODE = 'es-cl'
USE_TZ = True