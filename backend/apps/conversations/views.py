from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.conversations.chat import conversation_payload, current_conversation, reset_conversation, send_message
from apps.conversations.llm_models import default_model_id, public_models
from apps.conversations.serializers import MessageInputSerializer
from apps.status import status_view

status = status_view(
    "conversations",
    "The travel transcript and the place currently pinned on the map.",
)


class CurrentConversationView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(conversation_payload(current_conversation(request.user)))


class SendMessageView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = MessageInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        conversation = send_message(
            request.user,
            serializer.validated_data["message"],
            serializer.validated_data.get("model") or None,
        )
        return Response(conversation_payload(conversation))


class ModelsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({"default": default_model_id(), "models": public_models()})


class ResetConversationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        return Response(conversation_payload(reset_conversation(request.user)))
