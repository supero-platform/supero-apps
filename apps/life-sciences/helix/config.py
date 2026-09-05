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
    app_name: str = "Helix"
    app_emoji: str = "🧬"
    app_description: str = (
        "A multi-tenant clinical trial management system — each clinical site is a tenant; "
        "HQ oversees the trial portfolio across all sites."
    )

    domain_name: str = field(default_factory=lambda: os.getenv("SUPERO_DOMAIN", "helix"))
    admin_email: str = field(default_factory=lambda: os.getenv("SUPERO_ADMIN_EMAIL", "admin@helix.com"))
    admin_password: str = field(default_factory=lambda: os.environ.get("SUPERO_PASSWORD") or _require_password())
    project_name: str = field(default_factory=lambda: os.getenv("SUPERO_PROJECT", "helix-ctms"))

    # Mark the project multi-tenant (HQ + three clinical sites). default-tenant (HQ) MUST be first.
    is_multi_tenant: bool = True
    tenant_noun: dict = field(default_factory=lambda: {"singular": "Site", "plural": "Sites"})

    tenants: list = field(default_factory=lambda: [
        {"name": "default-tenant", "display_name": "Helix HQ"},
        {"name": "site-boston", "display_name": "Boston Clinical Site"},
        {"name": "site-austin", "display_name": "Austin Clinical Site"},
        {"name": "site-denver", "display_name": "Denver Clinical Site"},
    ])

    users: list = field(default_factory=lambda: [
        # HQ super-admin — sponsor / HQ oversight. tenant_admin on default-tenant.
        {"email": "admin@helix.com", "password": "Password123!", "role": "tenant_admin",
         "full_name": "Helix HQ Admin", "tenant": "default-tenant"},
        # Platform tester — keep this account in every app:
        {"email": "testapp@test.com", "password": "Password123!", "role": "developer",
         "full_name": "App Tester", "tenant": "default-tenant"},
        # Per-site coordinators (tenant_admin within their own site).
        {"email": "boston.coord@helix.com", "password": "Password123!", "role": "tenant_admin",
         "full_name": "Dr. Elena Marsh", "tenant": "site-boston"},
        {"email": "austin.coord@helix.com", "password": "Password123!", "role": "tenant_admin",
         "full_name": "Dr. Ray Calderon", "tenant": "site-austin"},
        {"email": "denver.coord@helix.com", "password": "Password123!", "role": "tenant_admin",
         "full_name": "Dr. Priya Anand", "tenant": "site-denver"},
        # Investigators (tenant_user) — read studies/sites, manage participants/visits/AEs in their tenant.
        {"email": "boston.investigator@helix.com", "password": "Password123!", "role": "tenant_user",
         "full_name": "Dr. Marcus Webb", "tenant": "site-boston"},
        {"email": "austin.investigator@helix.com", "password": "Password123!", "role": "tenant_user",
         "full_name": "Dr. Sofia Lin", "tenant": "site-austin"},
        {"email": "denver.investigator@helix.com", "password": "Password123!", "role": "tenant_user",
         "full_name": "Dr. Owen Hart", "tenant": "site-denver"},
    ])

    # "workflows" LAST. ai powers the protocol assistant; email powers the safety-team alert.
    services: list = field(default_factory=lambda: ["email", "ai", "workflows"])
    public_schemas: list = field(default_factory=lambda: [])
