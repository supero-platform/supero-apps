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




# app_emoji: a LITERAL emoji char, alone on its line (no escape, no trailing comment).
@dataclass
class AppConfig:
    app_name: str = "Summit CRM"
    app_emoji: str = "📈"
    app_description: str = "The CRM that closes — a sales CRM with pipeline kanban, forecasting, leaderboard and AI deal insight."
    domain_name: str    = field(default_factory=lambda: os.getenv("SUPERO_DOMAIN", "your-domain"))
    admin_email: str    = field(default_factory=lambda: os.getenv("SUPERO_ADMIN_EMAIL", "you@example.com"))
    admin_password: str = field(default_factory=lambda: os.environ.get("SUPERO_PASSWORD") or _require_password())
    project_name: str   = field(default_factory=lambda: os.getenv("SUPERO_PROJECT", "summit"))

    tenants: list = field(default_factory=lambda: [
        {"name": "default-tenant", "display_name": "Summit CRM"},
    ])

    # Two audiences:
    #   • sales manager (tenant_admin) — sees ALL accounts, contacts, leads, deals, activities
    #   • sales rep (tenant_user) — reads accounts/contacts; owner-scoped CRUD on leads/deals/activities
    users: list = field(default_factory=lambda: [
        {"email": "manager@summit.crm", "password": "Password123!", "role": "tenant_admin",
         "full_name": "Alex Rivera", "tenant": "default-tenant"},
        {"email": "rep@summit.crm", "password": "Password123!", "role": "tenant_user",
         "full_name": "Jordan Blake", "tenant": "default-tenant"},
    ])

    # email (lead-assigned / deal-won), slack (#wins), ai (deal insight / email draft), workflows (saga).
    services: list = field(default_factory=lambda: ["email", "slack", "ai", "workflows"])

    # Internal SaaS — NO public schemas. (.env has NO PUBLIC_SCHEMAS line.)
    public_schemas: list = field(default_factory=lambda: [])
