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
    app_name: str = "BrightSmile"
    app_emoji: str = "🦷"
    app_description: str = "Modern dental care, close to home — book online across our neighborhood clinics, meet your dentist, and keep clinical notes care-team-only."
    domain_name: str    = field(default_factory=lambda: os.getenv("SUPERO_DOMAIN", "your-domain"))
    admin_email: str    = field(default_factory=lambda: os.getenv("SUPERO_ADMIN_EMAIL", "you@example.com"))
    admin_password: str = field(default_factory=lambda: os.environ.get("SUPERO_PASSWORD") or _require_password())
    project_name: str   = field(default_factory=lambda: os.getenv("SUPERO_PROJECT", "brightsmile"))

    tenants: list = field(default_factory=lambda: [
        {"name": "default-tenant", "display_name": "BrightSmile"},
    ])

    # Two audiences:
    #   • staff (tenant_admin) — front desk + dentists: schedule, charts WITH chart notes, patients, CRUD
    #   • patients (tenant_user) — portal: book, my visits (no chart notes), accept treatment plans
    users: list = field(default_factory=lambda: [
        {"email": "frontdesk@brightsmile.dental", "password": "Password123!", "role": "tenant_admin",
         "full_name": "Dr. Nadia Hassan", "tenant": "default-tenant"},
        {"email": "patient@brightsmile.dental", "password": "Password123!", "role": "tenant_user",
         "full_name": "Chris Bennett", "tenant": "default-tenant"},
    ])

    # email + sms reminders, ai (symptom → suggested service helper), workflows.
    services: list = field(default_factory=lambda: ["email", "sms", "ai", "workflows"])

    public_schemas: list = field(default_factory=lambda: ["dental_service", "dentist", "location"])
