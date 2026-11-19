from django.db import transaction
from rest_framework.exceptions import APIException
from rest_framework import status

from apps.conversations.agent import LlmError, run_turn
from apps.conversations.llm_models import LlmNotConfigured, UnknownModel, resolve_model
from apps.conversations.models import Conversation, Message
from apps.tools.services import geocode


class ModelUnavailable(APIException):
    status_code = status.HTTP_502_BAD_GATEWAY
    default_detail = "The model did not respond."


class ModelNotConfigured(APIException):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_detail = (
        "Add LLM_API_KEY to the backend environment. "
        "OpenAI and Z.ai GLM both work."
    )


class ModelNotAvailable(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "That model is not available."


def current_conversation(user) -> Conversation:
    conversation = user.conversations.order_by("-updated_at", "-id").first()
    if conversation is None:
        conversation = Conversation.objects.create(user=user)
    _pin_home(conversation)
    return conversation


def reset_conversation(user) -> Conversation:
    conversation = Conversation.objects.create(user=user)
    _pin_home(conversation)
    return conversation


def send_message(user, text: str, model_id: str | None = None) -> Conversation:
    try:
        model = resolve_model(model_id)
    except LlmNotConfigured as exc:
        raise ModelNotConfigured() from exc
    except UnknownModel as exc:
        raise ModelNotAvailable() from exc

    conversation = current_conversation(user)
    try:
        reply, place = run_turn(user, conversation, text, model["id"])
    except LlmNotConfigured as exc:
        raise ModelNotConfigured() from exc
    except LlmError as exc:
        raise ModelUnavailable(str(exc)) from exc

    with transaction.atomic():
        Message.objects.create(conversation=conversation, role="user", content=text)
        Message.objects.create(conversation=conversation, role="assistant", content=reply)
        if place is not None:
            conversation.place_label = place["label"][:240]
            conversation.latitude = place["latitude"]
            conversation.longitude = place["longitude"]
        conversation.save()
    return conversation


def conversation_payload(conversation: Conversation) -> dict:
    place = None
    if conversation.latitude is not None and conversation.longitude is not None:
        place = {
            "label": conversation.place_label,
            "latitude": conversation.latitude,
            "longitude": conversation.longitude,
        }
    return {
        "id": conversation.id,
        "place": place,
        "messages": [
            {
                "id": message.id,
                "role": message.role,
                "content": message.content,
            }
            for message in conversation.messages.all()
        ],
    }


def _pin_home(conversation: Conversation) -> None:
    if conversation.latitude is not None:
        return
    profile = conversation.user.profile
    query = ", ".join(part for part in (profile.city, profile.country) if part)
    if not query:
        return
    found = geocode(query)
    if "error" in found:
        return
    conversation.place_label = found["label"]
    conversation.latitude = found["latitude"]
    conversation.longitude = found["longitude"]
    conversation.save(update_fields=["place_label", "latitude", "longitude", "updated_at"])
