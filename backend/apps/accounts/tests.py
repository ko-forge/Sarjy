from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.models import User


class AuthTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.email = "ada@example.com"
        self.password = "Sarjy-pass-19"

    def signup(self, email=None, password=None):
        return self.client.post(
            "/api/auth/signup/",
            {"email": email or self.email, "password": password or self.password},
            format="json",
        )

    def test_signup_login_and_profile(self):
        created = self.signup()
        self.assertEqual(created.status_code, 201)
        body = created.json()
        self.assertEqual(body["email"], self.email)
        self.assertFalse(body["profile_complete"])
        self.assertEqual(body["profile"]["name"], "")
        token = body["token"]

        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
        missing_name = self.client.put(
            "/api/auth/profile/",
            {"name": "   ", "city": "Lagos", "country": "Nigeria", "age": 30},
            format="json",
        )
        self.assertEqual(missing_name.status_code, 400)
        self.assertIn("name", missing_name.json())

        saved = self.client.put(
            "/api/auth/profile/",
            {"name": "Ada Lovelace", "city": "", "country": "", "age": None},
            format="json",
        )
        self.assertEqual(saved.status_code, 200)
        self.assertTrue(saved.json()["profile_complete"])
        self.assertEqual(saved.json()["profile"]["name"], "Ada Lovelace")

        located = self.client.put(
            "/api/auth/profile/",
            {"name": "Ada Lovelace", "city": "Lagos", "country": "Nigeria", "age": 30},
            format="json",
        )
        self.assertEqual(located.status_code, 200)
        self.assertEqual(located.json()["profile"]["city"], "Lagos")
        self.assertEqual(located.json()["profile"]["age"], 30)

        self.client.credentials()
        logged_out = self.client.post("/api/auth/logout/", HTTP_AUTHORIZATION=f"Token {token}")
        self.assertEqual(logged_out.status_code, 204)

        rejected = self.client.get("/api/auth/me/", HTTP_AUTHORIZATION=f"Token {token}")
        self.assertEqual(rejected.status_code, 401)

        logged_in = self.client.post(
            "/api/auth/login/",
            {"email": "Ada@Example.com", "password": self.password},
            format="json",
        )
        self.assertEqual(logged_in.status_code, 200)
        self.assertEqual(logged_in.json()["profile"]["country"], "Nigeria")

    def test_signup_rejects_duplicate_and_weak_password(self):
        self.signup()
        duplicate = self.signup()
        self.assertEqual(duplicate.status_code, 400)
        self.assertIn("email", duplicate.json())

        weak = self.signup(email="other@example.com", password="12345678")
        self.assertEqual(weak.status_code, 400)
        self.assertIn("password", weak.json())

    def test_login_failure_and_private_routes(self):
        self.signup()
        wrong = self.client.post(
            "/api/auth/login/",
            {"email": self.email, "password": "not-the-password"},
            format="json",
        )
        self.assertEqual(wrong.status_code, 400)
        self.assertEqual(wrong.json()["detail"], "Email or password is incorrect.")

        me = self.client.get("/api/auth/me/")
        self.assertEqual(me.status_code, 401)

        unknown = self.client.post(
            "/api/auth/login/",
            {"email": "missing@example.com", "password": self.password},
            format="json",
        )
        self.assertEqual(unknown.json()["detail"], "Email or password is incorrect.")

    def test_profile_rejects_impossible_age(self):
        created = self.signup()
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {created.json()['token']}")
        response = self.client.put(
            "/api/auth/profile/",
            {"name": "Ada", "age": 0},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("age", response.json())
        self.assertEqual(User.objects.get(email=self.email).profile.name, "")
