# config.py — MEDORA app identity, tenants, users, services.
#
# MULTI-TENANT is the headline: each hospital/clinic is a Supero TENANT.
#   - `default-tenant` is listed first and is ADMIN-ONLY (no clinical data lives
#     there; it is the chain-admin's home).
#   - Each named tenant (mercy-general, lakeside-clinic, summit-childrens) is one
#     site in the chain. Clinical data is seeded into these named tenants.
#   - The chain admin (tenant_admin on default-tenant) sees all sites + the
#     TenantSwitcher; site admins/doctors are scoped to their site; patients book
#     and view their own care.
#
# The runtime's `window.__SUPERO_CONFIG.isMultiTenant` / `tenantNoun` (read in
# ui/app.js for the AppShell-style multi-tenant chrome) are NOT carried on this
# dataclass — the CLI writes them into the generated ui/config.js from the
# SUPERO_IS_MULTI_TENANT / SUPERO_TENANT_NOUN_* environment variables (see
# .env.example). That is the only place to declare multi-tenancy for a
# hand-authored bundle.
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
    app_name: str = "Medora"
    app_emoji: str = "🩺"
    app_description: str = "A multi-tenant hospital & clinic network with a patient–doctor care portal."

    domain_name: str = field(default_factory=lambda: os.getenv("SUPERO_DOMAIN", "medora"))
    admin_email: str = field(default_factory=lambda: os.getenv("SUPERO_ADMIN_EMAIL", "admin@medora.health"))
    admin_password: str = field(default_factory=lambda: os.environ.get("SUPERO_PASSWORD") or _require_password())
    project_name: str = field(default_factory=lambda: os.getenv("SUPERO_PROJECT", "medora-network"))

    # default-tenant FIRST (admin-only); each named tenant is a hospital/clinic site.
    tenants: list = field(default_factory=lambda: [
        {"name": "default-tenant", "display_name": "Medora Network (Admin)", "icon": "🏥"},
        {"name": "mercy-general", "display_name": "Mercy General Hospital", "icon": "🏥"},
        {"name": "lakeside-clinic", "display_name": "Lakeside Family Clinic", "icon": "🩺"},
        {"name": "summit-childrens", "display_name": "Summit Children's Center", "icon": "🧸"},
    ])

    users: list = field(default_factory=lambda: [
        # Chain admin (super-admin): tenant_admin on default-tenant → sees all + switcher.
        {"email": "admin@medora.health", "password": "Password123!", "role": "tenant_admin",
         "full_name": "Network Administrator", "tenant": "default-tenant"},
        # Site staff / doctors (tenant_admin scoped to their hospital/clinic):
        {"email": "drchen@mercy-general.medora.health", "password": "Password123!", "role": "tenant_admin",
         "full_name": "Dr. Evelyn Chen", "tenant": "mercy-general"},
        {"email": "frontdesk@lakeside-clinic.medora.health", "password": "Password123!", "role": "tenant_admin",
         "full_name": "Lakeside Front Desk", "tenant": "lakeside-clinic"},
        {"email": "drpatel@summit-childrens.medora.health", "password": "Password123!", "role": "tenant_admin",
         "full_name": "Dr. Anil Patel", "tenant": "summit-childrens"},
        # Demo patients (customers map to tenant_user; distinguished by data, not role):
        {"email": "maria@example.com", "password": "Password123!", "role": "tenant_user",
         "full_name": "Maria Alvarez", "tenant": "mercy-general"},
        {"email": "james@example.com", "password": "Password123!", "role": "tenant_user",
         "full_name": "James Carter", "tenant": "lakeside-clinic"},
        {"email": "sofia@example.com", "password": "Password123!", "role": "tenant_user",
         "full_name": "Sofia Nguyen", "tenant": "summit-childrens"},
    ])

    # Only the integrations this app uses, with "workflows" LAST:
    services: list = field(default_factory=lambda: ["email", "sms", "appointment", "payment", "workflows"])

    public_schemas: list = field(default_factory=lambda: ["department", "doctor"])
