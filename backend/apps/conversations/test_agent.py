from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from unittest.mock import patch

from apps.accounts.models import User
from apps.conversations.agent import LlmNotConfigured, complete, run_turn
from apps.conversations.models import Conversation


class AgentLoopTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("ada@example.com", "Sarjy-pass-19")
        self.user.profile.name = "Ada"
        self.user.profile.save()
        self.conversation = Conversation.objects.create(user=self.user)

    @patch("apps.conversations.agent.fetch_weather")
    @patch("apps.conversations.agent.geocode")
    @patch("apps.conversations.agent.complete")
    def test_place_and_weather_move_the_pin(self, complete, geocode_place, weather):
        geocode_place.return_value = {
            "label": "Kyoto, Japan",
            "latitude": 35.01,
            "longitude": 135.77,
        }
        weather.return_value = {
            "place": "Kyoto, Japan",
            "current": {"summary": "clear", "temperature_c": 18},
            "upcoming": [],
        }
        complete.side_effect = [
            {
                "content": "",
                "tool_calls": [
                    {
                        "id": "call_1",
                        "type": "function",
                        "function": {"name": "geocode_place", "arguments": '{"query": "Kyoto"}'},
                    }
                ],
            },
            {
                "content": None,
                "tool_calls": [
                    {
                        "id": "call_2",
                        "function": {
                            "name": "get_weather",
                            "arguments": {
                                "latitude": 35.01,
                                "longitude": 135.77,
                                "place_label": "Kyoto, Japan",
                            },
                        },
                    }
                ],
            },
            {"content": "Kyoto is clear and about 18 degrees."},
        ]

        reply, place = run_turn(self.user, self.conversation, "What's the weather in Kyoto?")

        self.assertIn("18", reply)
        self.assertEqual(place["label"], "Kyoto, Japan")
        self.assertEqual(complete.call_count, 3)
        weather.assert_called_once()

    @override_settings(LLM_API_KEY="", ZAI_API_KEY="", OPENAI_API_KEY="")
    def test_missing_key_is_reported(self):
        with self.assertRaises(LlmNotConfigured):
            complete([{"role": "user", "content": "Hello"}])


class ChatApiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("ada@example.com", "Sarjy-pass-19")
        self.user.profile.name = "Ada"
        self.user.profile.save()
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_chat_requires_login(self):
        guest = APIClient()
        response = guest.post("/api/conversations/current/messages/", {"message": "Kyoto"}, format="json")
        self.assertEqual(response.status_code, 401)

    @override_settings(
        LLM_API_KEY="test-key",
        LLM_BASE_URL="https://api.z.ai/api/paas/v4",
        LLM_MODEL="glm-4.5-flash",
        OPENAI_API_KEY="",
        ZAI_API_KEY="",
    )
    @patch("apps.conversations.chat.run_turn")
    def test_message_saves_transcript_and_place(self, run_turn_mock):
        run_turn_mock.return_value = (
            "Kyoto is clear and about 18 degrees.",
            {"label": "Kyoto, Japan", "latitude": 35.01, "longitude": 135.77},
        )

        response = self.client.post(
            "/api/conversations/current/messages/",
            {"message": "What's the weather in Kyoto?"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["place"]["label"], "Kyoto, Japan")
        self.assertEqual([item["role"] for item in body["messages"]], ["user", "assistant"])
        self.assertEqual(body["messages"][1]["content"], "Kyoto is clear and about 18 degrees.")

        again = self.client.get("/api/conversations/current/")
        self.assertEqual(again.json()["place"]["latitude"], 35.01)

    @patch("apps.conversations.chat.run_turn", side_effect=LlmNotConfigured())
    def test_missing_model_key(self, _run_turn):
        response = self.client.post(
            "/api/conversations/current/messages/",
            {"message": "Hello"},
            format="json",
        )
        self.assertEqual(response.status_code, 503)
        self.assertIn("LLM_API_KEY", response.json()["detail"])

    @override_settings(
        LLM_API_KEY="test-key",
        LLM_BASE_URL="https://api.z.ai/api/paas/v4",
        LLM_MODEL="glm-4.5-flash",
        OPENAI_API_KEY="sk-test",
        ZAI_API_KEY="",
    )
    def test_model_list_includes_configured_providers(self):
        response = self.client.get("/api/conversations/models/")
        self.assertEqual(response.status_code, 200)
        body = response.json()
        ids = [model["id"] for model in body["models"]]
        self.assertEqual(body["default"], "glm-4.5-flash")
        self.assertIn("glm-5.3", ids)
        self.assertIn("gpt-4o-mini", ids)
        self.assertNotIn("api_key", response.content.decode())

    @override_settings(
        LLM_API_KEY="test-key",
        LLM_BASE_URL="https://api.z.ai/api/paas/v4",
        LLM_MODEL="glm-4.5-flash",
        OPENAI_API_KEY="",
        ZAI_API_KEY="",
    )
    @patch("apps.conversations.chat.run_turn")
    def test_selected_model_is_used(self, run_turn_mock):
        run_turn_mock.return_value = ("Hello from GLM.", None)
        response = self.client.post(
            "/api/conversations/current/messages/",
            {"message": "Hello", "model": "glm-5.3"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(run_turn_mock.call_args.args[3], "glm-5.3")

    @override_settings(
        LLM_API_KEY="test-key",
        LLM_BASE_URL="https://api.z.ai/api/paas/v4",
        OPENAI_API_KEY="",
        ZAI_API_KEY="",
    )
    def test_unknown_model_is_rejected(self):
        response = self.client.post(
            "/api/conversations/current/messages/",
            {"message": "Hello", "model": "not-a-model"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["detail"], "That model is not available.")
