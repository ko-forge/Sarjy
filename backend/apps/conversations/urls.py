from django.urls import path

from apps.conversations.views import status

urlpatterns = [
    path("status/", status, name="conversations-status"),
]
