from django.urls import path

from apps.voice.views import status

urlpatterns = [
    path("status/", status, name="voice-status"),
]
