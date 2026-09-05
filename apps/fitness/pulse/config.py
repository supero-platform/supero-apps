# config.py — PULSE app identity, tenants, users, services (SKILLS.md §10)
#
# MULTI-TENANT: each gym LOCATION is a Supero tenant. default-tenant is HQ/admin-only
# (listed FIRST, §10); real member-facing data lives in the named location tenants.
# (Note: whether the runtime renders the TenantSwitcher / signup-tenant picker is a
#  PROJECT-level flag on the platform — isMultiTenant in window.__SUPERO_CONFIG is
#  fetched from the project record, not set here; see the GAPS note in the build
#  report. We still model the chain correctly: tenants list + seeding into named
#  tenants + an in-app TenantSwitcher gated by client.canSwitchTenant().)
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




@dataclass
class AppConfig:
    app_name: str = "Pulse"
    app_emoji: str = "💪"
    app_description: str = "A chain of boutique fitness studios — book classes, manage your membership, run every location."

    domain_name: str = field(default_factory=lambda: os.getenv("SUPERO_DOMAIN", "pulse"))
    admin_email: str = field(default_factory=lambda: os.getenv("SUPERO_ADMIN_EMAIL", "admin@pulsefitness.co"))
    admin_password: str = field(default_factory=lambda: os.environ.get("SUPERO_PASSWORD") or _require_password())
    project_name: str = field(default_factory=lambda: os.getenv("SUPERO_PROJECT", "pulse-chain"))

    # default-tenant FIRST (admin/HQ only). Each named tenant is one gym location.
    tenants: list = field(default_factory=lambda: [
        {"name": "default-tenant", "display_name": "Pulse HQ"},
        {"name": "downtown", "display_name": "Pulse Downtown"},
        {"name": "westside", "display_name": "Pulse Westside"},
        {"name": "harborpoint", "display_name": "Pulse Harborpoint"},
    ])

    users: list = field(default_factory=lambda: [
        # HQ super-admin — tenant_admin on default-tenant → can switch tenants (whole chain):
        {"email": "admin@pulsefitness.co", "password": "Password123!", "role": "tenant_admin",
         "full_name": "Chain Director", "tenant": "default-tenant"},
        # Platform tester — keep this account in every app (also a chain-wide admin view):
        {"email": "testapp@test.com", "password": "Password123!", "role": "developer",
         "full_name": "App Tester", "tenant": "default-tenant"},
        # Location managers (staff = tenant_admin, scoped to their location tenant):
        {"email": "manager.downtown@pulsefitness.co", "password": "Password123!", "role": "tenant_admin",
         "full_name": "Dana Cole", "tenant": "downtown"},
        {"email": "manager.westside@pulsefitness.co", "password": "Password123!", "role": "tenant_admin",
         "full_name": "Wes Tanaka", "tenant": "westside"},
        # Demo members (customers map to tenant_user, scoped to their location tenant):
        {"email": "maya@example.com", "password": "Password123!", "role": "tenant_user",
         "full_name": "Maya Okonkwo", "tenant": "downtown"},
        {"email": "leo@example.com", "password": "Password123!", "role": "tenant_user",
         "full_name": "Leo Vance", "tenant": "westside"},
    ])

    # Only the integrations this app uses, with "workflows" LAST (§10):
    services: list = field(default_factory=lambda: ["email", "sms", "ai", "appointment", "booking", "membership", "payment", "workflows"])

    public_schemas: list = field(default_factory=lambda: ["location", "trainer", "fitness_class"])
