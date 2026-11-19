from django.urls import path

from apps.memory.views import status

urlpatterns = [
    path("status/", status, name="memory-status"),
]
