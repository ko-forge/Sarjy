from django.urls import path

from apps.conversations.views import (
    CurrentConversationView,
    ModelsView,
    ResetConversationView,
    SendMessageView,
    status,
)

urlpatterns = [
    path("status/", status, name="conversations-status"),
    path("models/", ModelsView.as_view(), name="conversation-models"),
    path("current/", CurrentConversationView.as_view(), name="conversation-current"),
    path("current/messages/", SendMessageView.as_view(), name="conversation-message"),
    path("current/reset/", ResetConversationView.as_view(), name="conversation-reset"),
]
