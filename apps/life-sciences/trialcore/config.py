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
    app_name: str = "TrialCore"
    app_emoji: str = "🧬"
    app_description: str = "Enterprise multi-site clinical trial management — run every trial, every site, in one place."
    domain_name: str    = field(default_factory=lambda: os.getenv("SUPERO_DOMAIN", "your-domain"))
    admin_email: str    = field(default_factory=lambda: os.getenv("SUPERO_ADMIN_EMAIL", "you@example.com"))
    admin_password: str = field(default_factory=lambda: os.environ.get("SUPERO_PASSWORD") or _require_password())
    project_name: str   = field(default_factory=lambda: os.getenv("SUPERO_PROJECT", "trialcore"))

    tenants: list = field(default_factory=lambda: [
        {"name": "default-tenant", "display_name": "TrialCore"},
    ])

    # Three audiences:
    #   • sponsor / CRA (tenant_admin) — the CTMS console: dashboard, trials, sites,
    #     participants, visits, safety/AEs, documents — full access.
    #   • site coordinator (tenant_user) — reads trials; full CRUD on the operational
    #     data they work with day to day (participants, visits, adverse events).
    #   • App Tester (developer) — required smoke-test account.
    users: list = field(default_factory=lambda: [
        {"email": "cra@trialcore.io", "password": "Password123!", "role": "tenant_admin",
         "full_name": "Dr. Helen Park", "tenant": "default-tenant"},
        {"email": "coordinator@trialcore.io", "password": "Password123!", "role": "tenant_user",
         "full_name": "Site Coordinator", "tenant": "default-tenant"},
    ])

    # email + slack safety alerts, ai (protocol summary helper), workflows (saga + event-bound).
    services: list = field(default_factory=lambda: ["email", "slack", "ai", "workflows"])

    public_schemas: list = field(default_factory=lambda: ["trial"])
