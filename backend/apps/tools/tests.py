from django.core.cache import cache
from django.test import SimpleTestCase, TestCase
from unittest.mock import patch

from apps.accounts.models import User
from apps.conversations.chat import current_conversation
from apps.tools.services import describe_weather_code, fetch_weather, geocode


class WeatherCodeTests(SimpleTestCase):
    def test_known_codes(self):
        self.assertEqual(describe_weather_code(0), "clear")
        self.assertEqual(describe_weather_code(63), "rainy")
        self.assertEqual(describe_weather_code(95), "stormy")


class GeocodeTests(TestCase):
    def setUp(self):
        cache.clear()

    @patch("apps.tools.services.httpx.get")
    def test_geocode_reads_nominatim(self, get):
        get.return_value.json.return_value = [
            {"lat": "35.0116", "lon": "135.7681", "display_name": "Kyoto, Japan"}
        ]
        get.return_value.raise_for_status.return_value = None

        found = geocode("Kyoto")

        self.assertEqual(found["label"], "Kyoto, Japan")
        self.assertAlmostEqual(found["latitude"], 35.0116)
        self.assertEqual(get.call_args.args[0], "https://nominatim.openstreetmap.org/search")
        self.assertIn("Sarjy", get.call_args.kwargs["headers"]["User-Agent"])

    @patch("apps.tools.services.httpx.get")
    def test_geocode_miss(self, get):
        get.return_value.json.return_value = []
        get.return_value.raise_for_status.return_value = None
        self.assertIn("error", geocode("not a real place xyz"))

    @patch("apps.tools.services.httpx.get")
    def test_weather_reads_open_meteo(self, get):
        get.return_value.raise_for_status.return_value = None
        get.return_value.json.return_value = {
            "current": {
                "temperature_2m": 18.2,
                "apparent_temperature": 17.0,
                "weather_code": 1,
                "wind_speed_10m": 12.0,
            },
            "daily": {
                "time": ["2026-11-19"],
                "weather_code": [61],
                "temperature_2m_max": [20.0],
                "temperature_2m_min": [11.0],
                "precipitation_probability_max": [70],
            },
        }

        report = fetch_weather(35.0, 135.7, "Kyoto")

        self.assertEqual(report["current"]["summary"], "mostly clear")
        self.assertEqual(report["current"]["temperature_c"], 18.2)
        self.assertEqual(report["upcoming"][0]["summary"], "rainy")
        self.assertIn("open-meteo.com", get.call_args.args[0])


class HomePinTests(TestCase):
    @patch("apps.conversations.chat.geocode")
    def test_profile_city_becomes_the_first_pin(self, geocode_place):
        geocode_place.return_value = {
            "label": "Accra, Ghana",
            "latitude": 5.6,
            "longitude": -0.2,
        }
        user = User.objects.create_user("traveler@example.com", "Sarjy-pass-19")
        user.profile.name = "Nia"
        user.profile.city = "Accra"
        user.profile.country = "Ghana"
        user.profile.save()

        conversation = current_conversation(user)

        self.assertEqual(conversation.place_label, "Accra, Ghana")
        self.assertAlmostEqual(conversation.latitude, 5.6)
        geocode_place.assert_called_once_with("Accra, Ghana")
