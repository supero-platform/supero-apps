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
    app_name: str = "Tavola"
    app_emoji: str = "🍽️"
    app_description: str = "Your table, your order, your way — online ordering, table reservations and loyalty across the Tavola restaurant group."
    domain_name: str    = field(default_factory=lambda: os.getenv("SUPERO_DOMAIN", "your-domain"))
    admin_email: str    = field(default_factory=lambda: os.getenv("SUPERO_ADMIN_EMAIL", "you@example.com"))
    admin_password: str = field(default_factory=lambda: os.environ.get("SUPERO_PASSWORD") or _require_password())
    project_name: str   = field(default_factory=lambda: os.getenv("SUPERO_PROJECT", "tavola"))

    # Single tenant — the restaurant group. Locations are first-class entities within it
    # (cross-location discovery is the point), not separate tenants.
    tenants: list = field(default_factory=lambda: [
        {"name": "default-tenant", "display_name": "Tavola"},
    ])

    # Two audiences from one login:
    #   • restaurant ops (tenant_admin) — Gia Conti: dashboard, kitchen board, reservations, menu CRUD, locations
    #   • diners (tenant_user) — Sam Rivera: order, my orders (live status), reservations, loyalty points
    users: list = field(default_factory=lambda: [
        {"email": "ops@tavola.dining", "password": "Password123!", "role": "tenant_admin",
         "full_name": "Gia Conti", "tenant": "default-tenant"},
        {"email": "diner@tavola.dining", "password": "Password123!", "role": "tenant_user",
         "full_name": "Sam Rivera", "tenant": "default-tenant"},
        # Platform tester — keep this account in every app:
    ])

    # email + sms (order/reservation confirmations, "order ready") + stripe_checkout (prepay) + workflows.
    services: list = field(default_factory=lambda: ["email", "sms", "stripe_checkout", "workflows"])

    public_schemas: list = field(default_factory=lambda: ["restaurant", "menu_item"])
