"""Stops the model before it speaks, then checks numbers against tool results.

The screen runs on the user's text and never calls the model. The grounding
check runs after a reply: a temperature, wind speed, or rain chance is kept
only when that number came back from the weather tool.
"""

import re

REFUSAL = "I can't help with that. I can help you pick a place, check the weather, or plan a trip."

_JAILBREAKS = (
    r"ignore (all |any |the )?(previous |prior |above )?(instructions|rules|prompts)",
    r"disregard (your |the )?(instructions|rules|system prompt)",
    r"(system|developer) prompt",
    r"\bjailbreak\b",
    r"\bdo anything now\b",
    r"\bdan mode\b",
    r"developer mode",
    r"pretend (that )?you (have no|are not bound by) (rules|restrictions)",
    r"reveal (your |the )(hidden |system )?(prompt|instructions)",
)

_PROHIBITED = (
    r"\b(make|build|buy|assemble)\b.{0,40}\b(bomb|explosive|weapon|gun)\b",
    r"\b(smuggl\w*|traffick\w*)\b",
    r"\b(fake|forged?|counterfeit)\b.{0,40}\b(passport|visa|identity)\b",
    r"\b(cook|make|manufacture)\b.{0,20}\b(meth|cocaine|heroin|fentanyl)\b",
    r"\bhow to (kill|murder|hurt|attack)\b",
    r"\b(child|minor|underage).{0,30}\b(sex|nude|porn|naked)\b",
)

_MEASUREMENT = re.compile(
    r"(-?\d+(?:\.\d+)?)\s*(?:°\s*[cCfF]|degrees?(?:\s+celsius)?|celsius|km/h|kph|%)",
    re.IGNORECASE,
)

_JAILBREAK_RE = re.compile("|".join(_JAILBREAKS), re.IGNORECASE)
_PROHIBITED_RE = re.compile("|".join(_PROHIBITED), re.IGNORECASE)


def screen_message(text: str) -> str | None:
    """Return a refusal when the message should never reach the model."""
    if _JAILBREAK_RE.search(text) or _PROHIBITED_RE.search(text):
        return REFUSAL
    return None


def ground_reply(reply: str, weather_reports: list[dict]) -> str:
    """Replace a reply that quotes weather numbers the tool did not return."""
    claimed = [float(match) for match in _MEASUREMENT.findall(reply)]
    if not claimed:
        return reply

    reports = [report for report in weather_reports if "error" not in report and report.get("current")]
    if not reports:
        return "I have not checked the weather, so I will not guess a temperature."

    allowed = _allowed_numbers(reports)
    if all(_matches(number, allowed) for number in claimed):
        return reply
    return _spoken_weather(reports[-1])


def _matches(number: float, allowed: set[float]) -> bool:
    return round(number, 1) in allowed or float(round(number)) in allowed


def _allowed_numbers(reports: list[dict]) -> set[float]:
    allowed: set[float] = set()

    def walk(value):
        if isinstance(value, bool):
            return
        if isinstance(value, (int, float)):
            number = float(value)
            allowed.add(round(number, 1))
            allowed.add(float(round(number)))
            return
        if isinstance(value, dict):
            for item in value.values():
                walk(item)
        elif isinstance(value, list):
            for item in value:
                walk(item)

    for report in reports:
        walk(report)
    return allowed


def _spoken_weather(report: dict) -> str:
    current = report.get("current") or {}
    place = report.get("place") or "that place"
    temperature = current.get("temperature_c")
    summary = current.get("summary") or "unknown"
    if temperature is None:
        return f"I checked {place}, but the weather service did not return a temperature."
    sentence = f"The weather in {place} is {summary}, {temperature} degrees."
    feels = current.get("feels_like_c")
    wind = current.get("wind_kmh")
    if feels is not None:
        sentence += f" It feels like {feels}."
    if wind is not None:
        sentence += f" The wind is {wind} kilometers per hour."
    return sentence
