"""A three-step trip plan. The steps live on the conversation, not in the model.

The model is only asked when the user leaves the script, for example to check
the weather. The plan stays on the same step, and the reply ends by asking
that step again.
"""

import re

from apps.conversations.agent import LlmError, run_turn
from apps.tools.services import geocode

STEPS = ("destination", "when", "pace")

PROMPTS = {
    "destination": "Where do you want to go?",
    "when": "When are you thinking of going?",
    "pace": "Do you want a relaxed trip or a full one?",
}

_START = re.compile(r"\b(plan (a |my )?trip|help me plan|let'?s plan)\b", re.IGNORECASE)
_CANCEL = re.compile(
    r"\b(cancel|stop|drop|forget) (the |my )?(plan|planning)\b|\bnever mind\b",
    re.IGNORECASE,
)
_RESTART = re.compile(r"\b(start over|start again|begin again)\b", re.IGNORECASE)
_CHANGE_WHEN = re.compile(r"\bchange (the )?(date|when|time)\b", re.IGNORECASE)
_CHANGE_PLACE = re.compile(r"\bchange (the )?(city|destination|place)\b", re.IGNORECASE)
_CHANGE_PACE = re.compile(r"\bchange (the )?(pace|style)\b", re.IGNORECASE)
_PLACE_PREFIX = re.compile(
    r"^(?:i want to go to|i(?:'d| would) like to go to|let'?s go to|take me to|show me|go to)\s+",
    re.IGNORECASE,
)
_TIME_CUE = re.compile(
    r"\b(today|tomorrow|tonight|weekend|next week|next month|spring|summer|autumn|fall|winter|"
    r"january|february|march|april|may|june|july|august|september|october|november|december|"
    r"20\d\d|in \d+)\b",
    re.IGNORECASE,
)
_RELAXED = re.compile(r"\b(relaxed|easy|slow|chill|light)\b", re.IGNORECASE)
_FULL = re.compile(r"\b(full|packed|busy|ambitious)\b", re.IGNORECASE)
_SIDE = re.compile(
    r"^(what|how|why|who|is |are |can |could |tell me|what's|whats)\b|\bweather\b|\bforecast\b",
    re.IGNORECASE,
)


def public_plan(raw: dict | None) -> dict | None:
    if not raw or not raw.get("step"):
        return None
    return {
        "active": raw["step"] != "done",
        "step": raw["step"],
        "destination": raw.get("destination") or "",
        "when": raw.get("when") or "",
        "pace": raw.get("pace") or "",
    }


def advance_plan(user, conversation, text: str, model_id: str | None):
    """Return (reply, place, plan) when this turn belongs to the plan.

    Return None when the normal agent should answer instead.
    """
    plan = dict(conversation.plan or {})
    active = plan.get("step") in (*STEPS, "done")

    if _CANCEL.search(text) and active:
        return "The plan is cleared. The map stays where it is.", None, {}

    if _START.search(text) or (_RESTART.search(text) and active):
        fresh = {"step": "destination", "destination": "", "when": "", "pace": ""}
        return f"Let's plan a trip. {PROMPTS['destination']}", None, fresh

    if not active:
        return None

    if _CHANGE_PLACE.search(text):
        plan["step"] = "destination"
        plan["destination"] = ""
        return PROMPTS["destination"], None, plan
    if _CHANGE_WHEN.search(text):
        plan["step"] = "when"
        plan["when"] = ""
        return _with_place(plan, PROMPTS["when"]), None, plan
    if _CHANGE_PACE.search(text):
        plan["step"] = "pace"
        plan["pace"] = ""
        return _with_place(plan, PROMPTS["pace"]), None, plan

    if plan["step"] == "done":
        return None

    if _is_side_question(text, plan["step"]):
        return _answer_and_return(user, conversation, text, model_id, plan)

    if plan["step"] == "destination":
        return _take_destination(plan, text)
    if plan["step"] == "when":
        return _take_when(plan, text)
    return _take_pace(plan, text)


def _is_side_question(text: str, step: str) -> bool:
    stripped = text.strip()
    if step == "destination" and re.match(r"^(show me|take me to|go to)\b", stripped, re.IGNORECASE):
        return False
    if stripped.endswith("?"):
        return True
    return _SIDE.search(stripped) is not None


def _answer_and_return(user, conversation, text: str, model_id: str | None, plan: dict):
    try:
        reply, place = run_turn(user, conversation, text, model_id)
    except LlmError:
        reply, place = "I could not answer that just now.", None
    prompt = PROMPTS[plan["step"]]
    return f"{reply} Back to the plan. {_with_place(plan, prompt)}", place, plan


def _take_destination(plan: dict, text: str):
    query = _PLACE_PREFIX.sub("", text.strip()).strip(" ?.!")
    found = geocode(query)
    if "error" in found:
        return f"I could not find that place. {PROMPTS['destination']}", None, plan
    plan["destination"] = found["label"]
    plan["step"] = "when"
    reply = f"{found['label']} is on the map. {PROMPTS['when']}"
    return reply, found, plan


def _take_when(plan: dict, text: str):
    when = " ".join(text.strip().split())
    if not _TIME_CUE.search(when) or len(when) > 80:
        return f"I still need a time. {PROMPTS['when']} A month or next week is enough.", None, plan
    plan["when"] = when[:80]
    plan["step"] = "pace"
    return f"{when[:80]}. {PROMPTS['pace']}", None, plan


def _take_pace(plan: dict, text: str):
    if _RELAXED.search(text):
        pace = "relaxed"
    elif _FULL.search(text):
        pace = "full"
    else:
        return f"Say relaxed or full. {PROMPTS['pace']}", None, plan
    plan["pace"] = pace
    plan["step"] = "done"
    reply = (
        f"Here is the plan. {plan['destination']} in {plan['when']}, at a {pace} pace. "
        "Ask me about the weather there, or say cancel the plan to drop it."
    )
    return reply, None, plan


def _with_place(plan: dict, prompt: str) -> str:
    destination = plan.get("destination") or ""
    if destination and plan.get("step") != "destination":
        return f"The plan is still {destination}. {prompt}"
    return prompt
