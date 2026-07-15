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




# app_emoji: literal emoji, alone on its line.
@dataclass
class AppConfig:
    app_name: str = "FieldOps"
    app_emoji: str = "🔧"
    app_description: str = "Scheduling, dispatch and invoicing for the trades."
    domain_name: str    = field(default_factory=lambda: os.getenv("SUPERO_DOMAIN", "fieldops"))
    admin_email: str    = field(default_factory=lambda: os.getenv("SUPERO_ADMIN_EMAIL", "dispatch@fieldops.app"))
    admin_password: str = field(default_factory=lambda: os.environ.get("SUPERO_PASSWORD") or _require_password())
    project_name: str   = field(default_factory=lambda: os.getenv("SUPERO_PROJECT", "fieldops"))

    tenants: list = field(default_factory=lambda: [
        {"name": "default-tenant", "display_name": "FieldOps"},
    ])

    # Dispatcher = tenant_admin. Technicians + customers are tenant_users distinguished
    # by CustomerProfile.persona (custom-role registration isn't part of the SKILLS
    # contract, so personas use the documented data-field pattern,).
    users: list = field(default_factory=lambda: [
        {"email": "dispatch@fieldops.app", "password": "Password123!", "role": "tenant_admin",
         "full_name": "Dispatch Desk", "tenant": "default-tenant"},
        {"email": "tech@fieldops.app", "password": "Password123!", "role": "tenant_user",
         "full_name": "Marcus Hale", "tenant": "default-tenant"},
        {"email": "rosa@fieldops.app", "password": "Password123!", "role": "tenant_user",
         "full_name": "Rosa Mendez", "tenant": "default-tenant"},
        {"email": "customer@fieldops.app", "password": "Password123!", "role": "tenant_user",
         "full_name": "Dana Whitfield", "tenant": "default-tenant"},
        {"email": "greg@fieldops.app", "password": "Password123!", "role": "tenant_user",
         "full_name": "Greg Powell", "tenant": "default-tenant"},
        # Platform tester — keep this account in every app:
    ])

    # Integration namespaces + transactional service ids (same list). workflows LAST.
    services: list = field(default_factory=lambda: [
        "email", "sms", "stripe_checkout", "quickbooks", "google_calendar", "slack", "ai",
        "service", "approval", "appointment", "document_signature", "payment",
        "inventory", "recurring_plan",
        "workflows",
    ])

    public_schemas: list = field(default_factory=lambda: ["service"])
