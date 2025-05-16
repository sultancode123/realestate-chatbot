from django.contrib import admin
from django.urls import path
from analysis.views import analyze_area

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/analyze/', analyze_area),
]
