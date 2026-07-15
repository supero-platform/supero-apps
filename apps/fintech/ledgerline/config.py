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
    app_name: str = "Ledgerline"
    app_emoji: str = "📊"
    app_description: str = "Usage-based subscription billing and spend management — MRR analytics, automated dunning, and expense-approval workflows."
    domain_name: str    = field(default_factory=lambda: os.getenv("SUPERO_DOMAIN", "your-domain"))
    admin_email: str    = field(default_factory=lambda: os.getenv("SUPERO_ADMIN_EMAIL", "you@example.com"))
    admin_password: str = field(default_factory=lambda: os.environ.get("SUPERO_PASSWORD") or _require_password())
    project_name: str   = field(default_factory=lambda: os.getenv("SUPERO_PROJECT", "ledgerline"))

    tenants: list = field(default_factory=lambda: [
        {"name": "default-tenant", "display_name": "Ledgerline"},
    ])

    # Two audiences:
    #   • finance team (tenant_admin) — MRR dashboard, customers, invoices/dunning, expense approvals
    #   • customers (tenant_user) — portal: my subscription, usage, my invoices
    users: list = field(default_factory=lambda: [
        {"email": "finance@ledgerline.io", "password": "Password123!", "role": "tenant_admin",
         "full_name": "Riley Chen", "tenant": "default-tenant"},
        {"email": "customer@ledgerline.io", "password": "Password123!", "role": "tenant_user",
         "full_name": "Northwind Labs", "tenant": "default-tenant"},
    ])

    # stripe_checkout (invoice pay), email (dunning + receipts), workflows (dunning + approval sagas).
    services: list = field(default_factory=lambda: ["stripe_checkout", "email", "workflows"])

    public_schemas: list = field(default_factory=lambda: ["plan"])
