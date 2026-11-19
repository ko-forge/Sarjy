"""Place search and weather for the travel agent.

Nominatim turns a place name into coordinates. Open-Meteo returns the forecast
for those coordinates. Neither call needs an API key. Results are cached so a
repeated question does not hammer the public servers.
"""

import hashlib

from django.conf import settings
from django.core.cache import cache

import httpx

GEOCODE_URL = "https://nominatim.openstreetmap.org/search"
WEATHER_URL = "https://api.open-meteo.com/v1/forecast"


def describe_weather_code(code: int) -> str:
    if code == 0:
        return "clear"
    if code in (1, 2):
        return "mostly clear"
    if code == 3:
        return "cloudy"
    if code in (45, 48):
        return "foggy"
    if code in (51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82):
        return "rainy"
    if code in (71, 73, 75, 77, 85, 86):
        return "snowy"
    if code in (95, 96, 99):
        return "stormy"
    return "mixed"


def geocode(query: str) -> dict:
    name = " ".join(query.split())
    if not name:
        return {"error": "A place name is required."}

    cache_key = "geocode:" + hashlib.sha256(name.casefold().encode()).hexdigest()
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    try:
        response = httpx.get(
            GEOCODE_URL,
            params={"q": name, "format": "jsonv2", "limit": 1},
            headers={
                "User-Agent": settings.NOMINATIM_USER_AGENT,
                "Accept": "application/json",
            },
            timeout=8,
        )
        response.raise_for_status()
        payload = response.json()
    except httpx.HTTPError:
        return {"error": "The map search did not respond. Try that place again."}

    if not payload:
        return {"error": f"No place found for {name}."}

    hit = payload[0]
    try:
        latitude = float(hit["lat"])
        longitude = float(hit["lon"])
    except (KeyError, TypeError, ValueError):
        return {"error": f"No coordinates found for {name}."}

    if not (-90 <= latitude <= 90 and -180 <= longitude <= 180):
        return {"error": f"No coordinates found for {name}."}

    result = {
        "label": str(hit.get("display_name") or name)[:240],
        "latitude": latitude,
        "longitude": longitude,
    }
    cache.set(cache_key, result, 60 * 60)
    return result


def fetch_weather(latitude: float, longitude: float, place_label: str = "") -> dict:
    cache_key = "weather:" + hashlib.sha256(f"{latitude:.3f},{longitude:.3f}".encode()).hexdigest()
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    try:
        response = httpx.get(
            WEATHER_URL,
            params={
                "latitude": latitude,
                "longitude": longitude,
                "current": "temperature_2m,apparent_temperature,weather_code,wind_speed_10m",
                "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
                "timezone": "auto",
                "forecast_days": 3,
            },
            timeout=8,
        )
        response.raise_for_status()
        payload = response.json()
    except httpx.HTTPError:
        return {"error": "The weather service did not respond."}

    current = payload.get("current") or {}
    daily = payload.get("daily") or {}
    days = []
    for index, day in enumerate(daily.get("time") or []):
        code = _at(daily.get("weather_code"), index)
        days.append(
            {
                "date": day,
                "summary": describe_weather_code(code) if code is not None else "unknown",
                "high_c": _at(daily.get("temperature_2m_max"), index),
                "low_c": _at(daily.get("temperature_2m_min"), index),
                "rain_chance_percent": _at(daily.get("precipitation_probability_max"), index),
            }
        )

    code = current.get("weather_code")
    result = {
        "place": place_label,
        "current": {
            "summary": describe_weather_code(code) if isinstance(code, int) else "unknown",
            "temperature_c": current.get("temperature_2m"),
            "feels_like_c": current.get("apparent_temperature"),
            "wind_kmh": current.get("wind_speed_10m"),
        },
        "upcoming": days,
    }
    cache.set(cache_key, result, 10 * 60)
    return result


def _at(values, index):
    if not isinstance(values, list) or index >= len(values):
        return None
    return values[index]
