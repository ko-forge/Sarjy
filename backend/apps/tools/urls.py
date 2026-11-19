from django.urls import path

from apps.tools.views import status

urlpatterns = [
    path("status/", status, name="tools-status"),
]
