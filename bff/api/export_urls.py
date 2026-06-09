from django.urls import path
from .export_views import ExportarExcelView

urlpatterns = [
    path('excel/', ExportarExcelView.as_view()),
]