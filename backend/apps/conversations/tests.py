from django.test import TestCase
from rest_framework.test import APIClient


class ApiSkeletonTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_health(self):
        response = self.client.get("/api/health/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["service"], "sarjy")

    def test_app_status_routes(self):
        routes = [
            "/api/conversations/status/",
            "/api/memory/status/",
            "/api/voice/status/",
            "/api/tools/status/",
        ]
        for route in routes:
            response = self.client.get(route)
            self.assertEqual(response.status_code, 200, route)
            self.assertEqual(response.json()["status"], "ready")
