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
    app_name: str = "Relay"
    app_emoji: str = "🩺"
    app_description: str = "Per-diem healthcare staffing — facilities post shifts, clinicians claim them."
    domain_name: str    = field(default_factory=lambda: os.getenv("SUPERO_DOMAIN", "relay"))
    admin_email: str    = field(default_factory=lambda: os.getenv("SUPERO_ADMIN_EMAIL", "admin@relay.app"))
    admin_password: str = field(default_factory=lambda: os.environ.get("SUPERO_PASSWORD") or _require_password())
    project_name: str   = field(default_factory=lambda: os.getenv("SUPERO_PROJECT", "relay"))

    tenants: list = field(default_factory=lambda: [
        {"name": "default-tenant", "display_name": "Relay"},
    ])

    # admin = tenant_admin (credentialing + oversight). Facilities + clinicians are
    # tenant_users distinguished by Profile.persona (data-field pattern,).
    users: list = field(default_factory=lambda: [
        {"email": "admin@relay.app", "password": "Password123!", "role": "tenant_admin",
         "full_name": "Relay Admin", "tenant": "default-tenant"},
        {"email": "facility@relay.app", "password": "Password123!", "role": "tenant_user",
         "full_name": "Maple Ridge Medical", "tenant": "default-tenant"},
        {"email": "clinician@relay.app", "password": "Password123!", "role": "tenant_user",
         "full_name": "Aisha Bello", "tenant": "default-tenant"},
        {"email": "nora@relay.app", "password": "Password123!", "role": "tenant_user",
         "full_name": "Nora Park", "tenant": "default-tenant"},
        {"email": "diego@relay.app", "password": "Password123!", "role": "tenant_user",
         "full_name": "Diego Ramos", "tenant": "default-tenant"},
        # Platform tester — keep this account in every app:
    ])

    # Integration namespaces + transactional service ids (one list). workflows LAST.
    services: list = field(default_factory=lambda: [
        "email", "sms", "push_notification", "google_calendar", "ai", "stripe_checkout",
        "booking", "attachment", "approval", "payment", "recurring_plan",
        "workflows",
    ])

    public_schemas: list = field(default_factory=lambda: ["shift"])
