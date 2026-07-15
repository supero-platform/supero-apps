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
    app_name: str = "Concierge AI"
    app_emoji: str = "💬"
    app_description: str = "AI-first customer support — deflect with a grounded AI concierge, escalate to humans with full context."
    domain_name: str    = field(default_factory=lambda: os.getenv("SUPERO_DOMAIN", "your-domain"))
    admin_email: str    = field(default_factory=lambda: os.getenv("SUPERO_ADMIN_EMAIL", "you@example.com"))
    admin_password: str = field(default_factory=lambda: os.environ.get("SUPERO_PASSWORD") or _require_password())
    project_name: str   = field(default_factory=lambda: os.getenv("SUPERO_PROJECT", "concierge"))

    tenants: list = field(default_factory=lambda: [
        {"name": "default-tenant", "display_name": "Concierge AI"},
    ])

    # Two audiences:
    #   • agents (tenant_admin) — support team: queue, AI-suggested replies, KB, macros, analytics
    #   • customers (tenant_user) — self-serve help center, AI concierge, my tickets
    users: list = field(default_factory=lambda: [
        {"email": "agent@concierge.support", "password": "Password123!", "role": "tenant_admin",
         "full_name": "Sam Rivera", "tenant": "default-tenant"},
        {"email": "customer@concierge.support", "password": "Password123!", "role": "tenant_user",
         "full_name": "Jordan Lee", "tenant": "default-tenant"},
    ])

    # ai (concierge + suggested replies) + email + slack (escalations) + workflows.
    services: list = field(default_factory=lambda: ["ai", "email", "slack", "workflows"])

    public_schemas: list = field(default_factory=lambda: ["article"])
