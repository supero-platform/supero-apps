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
    app_name: str = "Lumen Health"
    app_emoji: str = "🩺"
    app_description: str = "Multi-specialty clinic platform — book care online, e-sign consent, and keep clinical notes provider-only."
    domain_name: str    = field(default_factory=lambda: os.getenv("SUPERO_DOMAIN", "your-domain"))
    admin_email: str    = field(default_factory=lambda: os.getenv("SUPERO_ADMIN_EMAIL", "you@example.com"))
    admin_password: str = field(default_factory=lambda: os.environ.get("SUPERO_PASSWORD") or _require_password())
    project_name: str   = field(default_factory=lambda: os.getenv("SUPERO_PROJECT", "lumen"))

    tenants: list = field(default_factory=lambda: [
        {"name": "default-tenant", "display_name": "Lumen Health"},
    ])

    # Two audiences:
    #   • staff (tenant_admin) — front desk + providers: schedule, charts WITH clinical notes, patients
    #   • patients (tenant_user) — portal: book, my visits (no clinical notes), e-sign, my documents
    users: list = field(default_factory=lambda: [
        {"email": "frontdesk@lumen.health", "password": "Password123!", "role": "tenant_admin",
         "full_name": "Dr. Amara Osei", "tenant": "default-tenant"},
        {"email": "patient@lumen.health", "password": "Password123!", "role": "tenant_user",
         "full_name": "Daniel Brooks", "tenant": "default-tenant"},
    ])

    # email + sms reminders, ai (symptom → suggested service helper), workflows,
    # google_calendar (a booked appointment drops a real event on the clinic calendar).
    services: list = field(default_factory=lambda: ["email", "sms", "ai", "workflows", "google_calendar"])

    public_schemas: list = field(default_factory=lambda: ["provider", "clinic_service"])
