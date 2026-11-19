from django.contrib import admin
from django.urls import include, path

from config.views import health

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", health, name="health"),
    path("api/auth/", include("apps.accounts.urls")),
    path("api/conversations/", include("apps.conversations.urls")),
    path("api/memory/", include("apps.memory.urls")),
    path("api/voice/", include("apps.voice.urls")),
    path("api/tools/", include("apps.tools.urls")),
]
