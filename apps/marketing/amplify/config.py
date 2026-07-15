import os
from dataclasses import dataclass, field

def _require_password() -> str:
    """No hardcoded default. A public clone must never boot with a
    well-known credential — so require an explicit password.
    Set SUPERO_PASSWORD in .env (copy .env.example first)."""
    raise SystemExit(
        "\n[supero] SUPERO_PASSWORD is not set.\n"
        "  1. cp .env.example .env\n"
        "  2. set SUPERO_PASSWORD to a strong value\n"
        "  3. re-run ./run.sh\n"
    )




# app_emoji: a LITERAL emoji char, alone on its line (no escape, no trailing comment)
@dataclass
class AppConfig:
    app_name: str = "Amplify"
    app_emoji: str = "🚀"
    app_description: str = "Launch campaigns everywhere, from one place — connect every social channel, compose with AI, schedule, publish and track performance."
    domain_name: str    = field(default_factory=lambda: os.getenv("SUPERO_DOMAIN", "your-domain"))
    admin_email: str    = field(default_factory=lambda: os.getenv("SUPERO_ADMIN_EMAIL", "you@example.com"))
    admin_password: str = field(default_factory=lambda: os.environ.get("SUPERO_PASSWORD") or _require_password())
    project_name: str   = field(default_factory=lambda: os.getenv("SUPERO_PROJECT", "amplify"))

    tenants: list = field(default_factory=lambda: [
        {"name": "default-tenant", "display_name": "Amplify"},
    ])

    # Two audiences:
    #   • operator (tenant_admin) — the company running Amplify: all workspaces, plans, billing, campaigns
    #   • marketer (tenant_user) — a customer: dashboard, channels, campaigns, composer + AI, analytics
    users: list = field(default_factory=lambda: [
        {"email": "operator@amplify.app", "password": "Password123!", "role": "tenant_admin",
         "full_name": "Amplify Ops", "tenant": "default-tenant"},
        {"email": "marketer@amplify.app", "password": "Password123!", "role": "tenant_user",
         "full_name": "Supero Marketing", "tenant": "default-tenant"},
    ])

    # email + slack campaign notifications, ai (caption generator), workflows (notify saga),
    # and REAL social posting: instagram (publish_post), linkedin (create_post), x_social (post_tweet),
    # youtube (upload_video — publishes a video file to the channel).
    # Posting gracefully falls back to "simulated" until each channel's OAuth token is configured.
    services: list = field(default_factory=lambda: ["email", "slack", "ai", "workflows",
                                                    "instagram", "linkedin", "x_social", "youtube"])

    public_schemas: list = field(default_factory=lambda: ["plan"])
