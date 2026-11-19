from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from unittest.mock import patch

from apps.accounts.models import User


KYOTO = {"label": "Kyoto, Japan", "latitude": 35.01, "longitude": 135.77}


@override_settings(
    LLM_API_KEY="test-key",
    LLM_BASE_URL="https://api.z.ai/api/paas/v4",
    LLM_MODEL="glm-4.5-flash",
    OPENAI_API_KEY="",
    ZAI_API_KEY="",
)
class TripPlanTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("ada@example.com", "Sarjy-pass-19")
        self.user.profile.name = "Ada"
        self.user.profile.save()
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def post(self, message):
        return self.client.post(
            "/api/conversations/current/messages/",
            {"message": message},
            format="json",
        )

    @patch("apps.conversations.plan.geocode", return_value=KYOTO)
    @patch("apps.conversations.chat.run_turn")
    def test_plan_keeps_each_step(self, run_turn_mock, _geocode):
        started = self.post("Plan a trip")
        self.assertEqual(started.json()["plan"]["step"], "destination")
        self.assertIn("Where do you want to go?", started.json()["messages"][-1]["content"])

        placed = self.post("Kyoto")
        self.assertEqual(placed.json()["plan"]["step"], "when")
        self.assertEqual(placed.json()["place"]["label"], "Kyoto, Japan")

        dated = self.post("next week")
        self.assertEqual(dated.json()["plan"]["step"], "pace")
        self.assertEqual(dated.json()["plan"]["when"], "next week")

        finished = self.post("relaxed")
        body = finished.json()
        self.assertEqual(body["plan"]["step"], "done")
        self.assertEqual(body["plan"]["pace"], "relaxed")
        self.assertIn("Kyoto, Japan", body["messages"][-1]["content"])
        self.assertIn("next week", body["messages"][-1]["content"])
        run_turn_mock.assert_not_called()

    @patch("apps.conversations.plan.run_turn", return_value=("Lisbon is clear.", {"label": "Lisbon", "latitude": 38.7, "longitude": -9.1}))
    def test_off_script_question_returns_to_the_same_step(self, _run_turn):
        self.post("Plan a trip")
        response = self.post("What's the weather like?")
        body = response.json()
        self.assertEqual(body["plan"]["step"], "destination")
        reply = body["messages"][-1]["content"]
        self.assertIn("Lisbon is clear.", reply)
        self.assertIn("Back to the plan.", reply)
        self.assertIn("Where do you want to go?", reply)

    @patch("apps.conversations.plan.geocode", return_value=KYOTO)
    def test_cancel_clears_the_plan(self, _geocode):
        self.post("Help me plan")
        self.post("Kyoto")
        response = self.post("Cancel the plan")
        self.assertIsNone(response.json()["plan"])
        self.assertIn("cleared", response.json()["messages"][-1]["content"])

    @patch("apps.conversations.plan.geocode", return_value={"error": "No place found for Nowhere."})
    def test_unknown_place_asks_again(self, _geocode):
        self.post("Plan a trip")
        response = self.post("Nowhere")
        self.assertEqual(response.json()["plan"]["step"], "destination")
        self.assertIn("could not find", response.json()["messages"][-1]["content"])
