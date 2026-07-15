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
    app_name: str = "Haven"
    app_emoji: str = "🏡"
    app_description: str = "A premium real-estate marketplace and agent platform — find your place, tour homes, and make offers."
    domain_name: str    = field(default_factory=lambda: os.getenv("SUPERO_DOMAIN", "your-domain"))
    admin_email: str    = field(default_factory=lambda: os.getenv("SUPERO_ADMIN_EMAIL", "you@example.com"))
    admin_password: str = field(default_factory=lambda: os.environ.get("SUPERO_PASSWORD") or _require_password())
    project_name: str   = field(default_factory=lambda: os.getenv("SUPERO_PROJECT", "haven"))

    # Single tenant — the brokerage. Listings & agents are first-class public entities
    # within it (cross-listing search is the whole point), not separate tenants.
    tenants: list = field(default_factory=lambda: [
        {"name": "default-tenant", "display_name": "Haven"},
    ])

    # Two audiences from one login:
    #   • broker/agent (tenant_admin) — runs the brokerage: listings, tours, offers, agents
    #   • buyer (tenant_user) — browses, requests tours, makes offers, tracks status
    users: list = field(default_factory=lambda: [
        {"email": "broker@haven.realty", "password": "Password123!", "role": "tenant_admin",
         "full_name": "Morgan Vance", "tenant": "default-tenant"},
        {"email": "buyer@haven.realty", "password": "Password123!", "role": "tenant_user",
         "full_name": "Riley Chen", "tenant": "default-tenant"},
        # Platform tester — keep this account in every app:
    ])

    # email (tour/offer confirmations) + sms (tour reminders) + slack (#offers feed)
    # + workflows (event-bound + the offer-accepted saga).
    services: list = field(default_factory=lambda: ["email", "sms", "slack", "workflows"])

    public_schemas: list = field(default_factory=lambda: ["listing", "agent"])
