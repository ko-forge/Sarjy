from rest_framework.decorators import api_view
from rest_framework.response import Response


def status_view(app: str, responsibility: str):
    """Placeholder route so each app is wired before its real endpoints exist."""

    @api_view(["GET"])
    def view(_request):
        return Response(
            {
                "app": app,
                "status": "ready",
                "responsibility": responsibility,
            }
        )

    view.__name__ = f"{app}_status"
    return view
