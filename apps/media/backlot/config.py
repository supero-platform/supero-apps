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
    app_name: str = "Backlot"
    app_emoji: str = "🎬"
    app_description: str = "Film & TV production studio management — where stories get made. Browse the slate, run the shooting schedule, and send call sheets."
    domain_name: str    = field(default_factory=lambda: os.getenv("SUPERO_DOMAIN", "your-domain"))
    admin_email: str    = field(default_factory=lambda: os.getenv("SUPERO_ADMIN_EMAIL", "you@example.com"))
    admin_password: str = field(default_factory=lambda: os.environ.get("SUPERO_PASSWORD") or _require_password())
    project_name: str   = field(default_factory=lambda: os.getenv("SUPERO_PROJECT", "backlot"))

    tenants: list = field(default_factory=lambda: [
        {"name": "default-tenant", "display_name": "Backlot"},
    ])

    # Two audiences:
    #   • production office (tenant_admin) — the studio console: slate, schedule, cast & crew, locations, assignments, AI assistant
    #   • crew/cast (tenant_user) — the portal: their own call sheet (owner-scoped assignments), confirm/decline offered roles
    users: list = field(default_factory=lambda: [
        {"email": "office@backlot.studio", "password": "Password123!", "role": "tenant_admin",
         "full_name": "Mara Velez, Line Producer", "tenant": "default-tenant"},
        {"email": "crew@backlot.studio", "password": "Password123!", "role": "tenant_user",
         "full_name": "Sam Okonkwo", "tenant": "default-tenant"},
    ])

    # email + sms call-sheet notifications, ai (Script & Production Assistant), workflows.
    services: list = field(default_factory=lambda: ["email", "sms", "ai", "workflows"])

    public_schemas: list = field(default_factory=lambda: ["production"])
