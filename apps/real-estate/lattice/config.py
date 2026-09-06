# config.py — LATTICE app identity, tenants, users, services
#
# MULTI-TENANT: each property-management COMPANY is a Supero tenant. default-tenant
# is admin-only (company super-admin home); the real PM companies are the named
# tenants below. The CLI provisions every tenant in `tenants` at bootstrap, and
# seed_record(..., tenant_name=...) writes each company's data into its own tenant.
#
# NOTE: the runtime `isMultiTenant` /
# `tenantNoun` flags in window.__SUPERO_CONFIG are driven by the env vars
# SUPERO_IS_MULTI_TENANT / SUPERO_TENANT_NOUN_SINGULAR / SUPERO_TENANT_NOUN_PLURAL
# (read by the CLI at config.js generation), NOT by any AppConfig field. We mirror
# them here as plain attributes for documentation, and set the env vars in
# .env.example so the TenantSwitcher and admin-vs-resident gates light up.
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
    app_name: str = "Lattice"
    app_emoji: str = "🏢"
    app_description: str = "Multi-tenant property management — run buildings, leases, rent and maintenance."

    domain_name: str = field(default_factory=lambda: os.getenv("SUPERO_DOMAIN", "lattice"))
    admin_email: str = field(default_factory=lambda: os.getenv("SUPERO_ADMIN_EMAIL", "admin@lattice.app"))
    admin_password: str = field(default_factory=lambda: os.environ.get("SUPERO_PASSWORD") or _require_password())
    project_name: str = field(default_factory=lambda: os.getenv("SUPERO_PROJECT", "lattice-pm"))

    # default-tenant FIRST (admin-only home), then one tenant per PM company.
    tenants: list = field(default_factory=lambda: [
        {"name": "default-tenant", "display_name": "Lattice HQ"},
        {"name": "summit-residential", "display_name": "Summit Residential"},
        {"name": "harbor-properties", "display_name": "Harbor Properties"},
        {"name": "oakline-management", "display_name": "Oakline Management"},
    ])

    users: list = field(default_factory=lambda: [
        # Company super-admin — sees all companies + TenantSwitcher (tenant_admin
        # on default-tenant). Use this to switch between PM companies.
        {"email": "admin@lattice.app", "password": "Password123!", "role": "tenant_admin",
         "full_name": "Lattice Super Admin", "tenant": "default-tenant"},
        # Per-company property managers (staff = tenant_admin in their own company):
        {"email": "manager@summit.app", "password": "Password123!", "role": "tenant_admin",
         "full_name": "Sarah Chen", "tenant": "summit-residential"},
        {"email": "manager@harbor.app", "password": "Password123!", "role": "tenant_admin",
         "full_name": "Marcus Webb", "tenant": "harbor-properties"},
        {"email": "manager@oakline.app", "password": "Password123!", "role": "tenant_admin",
         "full_name": "Priya Nair", "tenant": "oakline-management"},
        # Residents (renters) map to tenant_user, scoped to their own rows:
        {"email": "dana@example.com", "password": "Password123!", "role": "tenant_user",
         "full_name": "Dana Reyes", "tenant": "summit-residential"},
        {"email": "omar@example.com", "password": "Password123!", "role": "tenant_user",
         "full_name": "Omar Haddad", "tenant": "harbor-properties"},
    ])

    # Only the integrations this app uses, with "workflows" LAST:
    services: list = field(default_factory=lambda: ["email", "sms", "stripe", "payment", "workflows"])

    public_schemas: list = field(default_factory=lambda: ["property", "unit"])

    # Documentation mirrors of the env-driven runtime flags (see module note):
    is_multi_tenant: bool = True
    tenant_noun_singular: str = "Company"
    tenant_noun_plural: str = "Companies"
