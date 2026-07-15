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
    app_name: str = "PulseFit"
    app_emoji: str = "⚡"
    app_description: str = "Your city's boldest workouts — a multi-location boutique fitness brand. Browse clubs, book classes, meet the coaches, and join."
    domain_name: str    = field(default_factory=lambda: os.getenv("SUPERO_DOMAIN", "your-domain"))
    admin_email: str    = field(default_factory=lambda: os.getenv("SUPERO_ADMIN_EMAIL", "you@example.com"))
    admin_password: str = field(default_factory=lambda: os.environ.get("SUPERO_PASSWORD") or _require_password())
    project_name: str   = field(default_factory=lambda: os.getenv("SUPERO_PROJECT", "pulsefit"))

    tenants: list = field(default_factory=lambda: [
        {"name": "default-tenant", "display_name": "PulseFit"},
    ])

    # Two audiences:
    #   • staff (tenant_admin) — club console: dashboard, schedule/classes, members, trainers, clubs
    #   • members (tenant_user) — portal: browse & book classes, my bookings, my membership
    users: list = field(default_factory=lambda: [
        {"email": "staff@pulsefit.app", "password": "Password123!", "role": "tenant_admin",
         "full_name": "Coach Devon", "tenant": "default-tenant"},
        {"email": "member@pulsefit.app", "password": "Password123!", "role": "tenant_user",
         "full_name": "Taylor Brooks", "tenant": "default-tenant"},
    ])

    # email + sms (booking/member notifications), stripe_checkout (join/pay), workflows.
    services: list = field(default_factory=lambda: ["email", "sms", "stripe_checkout", "workflows"])

    public_schemas: list = field(default_factory=lambda: ["club", "class_offering", "trainer"])
