"""Models the travel agent can call.

A model is listed only when its provider has an API key. The primary key in
LLM_API_KEY follows LLM_BASE_URL. OPENAI_API_KEY and ZAI_API_KEY can both be
set so the header can offer OpenAI and Z.ai at the same time.
"""

from django.conf import settings

PROVIDERS = {
    "zai": {
        "label": "Z.ai",
        "base_url": "https://api.z.ai/api/paas/v4",
        "disable_thinking": True,
    },
    "openai": {
        "label": "OpenAI",
        "base_url": "https://api.openai.com/v1",
        "disable_thinking": False,
    },
}

CATALOG = [
    {"id": "glm-4.5-flash", "label": "GLM 4.5 Flash", "provider": "zai"},
    {"id": "glm-4.6", "label": "GLM 4.6", "provider": "zai"},
    {"id": "glm-5.3", "label": "GLM 5.3", "provider": "zai"},
    {"id": "gpt-4o-mini", "label": "GPT-4o mini", "provider": "openai"},
    {"id": "gpt-4o", "label": "GPT-4o", "provider": "openai"},
]


class LlmNotConfigured(Exception):
    """Raised when no model provider has an API key."""


class UnknownModel(Exception):
    """Raised when the requested model is not in the available list."""


def available_models() -> list[dict]:
    models = []
    for item in CATALOG:
        key = _provider_key(item["provider"])
        if not key:
            continue
        models.append(_record(item, key))

    configured = settings.LLM_MODEL
    if configured and configured not in {model["id"] for model in models}:
        provider = _provider_for_base(settings.LLM_BASE_URL)
        key = _provider_key(provider) if provider else ""
        if provider and key:
            models.insert(
                0,
                _record(
                    {"id": configured, "label": configured, "provider": provider},
                    key,
                ),
            )
    return models


def public_models() -> list[dict]:
    return [
        {"id": model["id"], "label": model["label"], "provider": model["provider_label"]}
        for model in available_models()
    ]


def default_model_id() -> str:
    models = available_models()
    if not models:
        return ""
    preferred = settings.LLM_MODEL
    for model in models:
        if model["id"] == preferred:
            return model["id"]
    return models[0]["id"]


def resolve_model(model_id: str | None) -> dict:
    models = available_models()
    if not models:
        raise LlmNotConfigured()
    if not model_id:
        chosen = default_model_id()
        return next(model for model in models if model["id"] == chosen)
    match = next((model for model in models if model["id"] == model_id), None)
    if match is None:
        raise UnknownModel(model_id)
    return match


def _record(item: dict, api_key: str) -> dict:
    provider = PROVIDERS[item["provider"]]
    return {
        "id": item["id"],
        "label": item["label"],
        "provider": item["provider"],
        "provider_label": provider["label"],
        "base_url": provider["base_url"],
        "api_key": api_key,
        "disable_thinking": provider["disable_thinking"],
    }


def _provider_key(provider: str) -> str:
    dedicated = settings.ZAI_API_KEY if provider == "zai" else settings.OPENAI_API_KEY
    if dedicated:
        return dedicated
    if _provider_for_base(settings.LLM_BASE_URL) == provider:
        return settings.LLM_API_KEY
    return ""


def _provider_for_base(base_url: str) -> str | None:
    base = base_url.lower()
    if "z.ai" in base or "bigmodel.cn" in base:
        return "zai"
    if "openai.com" in base:
        return "openai"
    return None
