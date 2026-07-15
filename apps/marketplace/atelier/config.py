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
    app_name: str = "Atelier"
    app_emoji: str = "🛍️"
    app_description: str = "The wholesale marketplace where independent brands meet the boutiques that love them."
    domain_name: str    = field(default_factory=lambda: os.getenv("SUPERO_DOMAIN", "your-domain"))
    admin_email: str    = field(default_factory=lambda: os.getenv("SUPERO_ADMIN_EMAIL", "you@example.com"))
    admin_password: str = field(default_factory=lambda: os.environ.get("SUPERO_PASSWORD") or _require_password())
    project_name: str   = field(default_factory=lambda: os.getenv("SUPERO_PROJECT", "atelier"))

    # Single tenant — the marketplace operator. Brands are first-class entities within it
    # (cross-brand discovery is the whole point of a marketplace), not separate tenants.
    tenants: list = field(default_factory=lambda: [
        {"name": "default-tenant", "display_name": "Atelier"},
    ])

    # Two audiences from one login:
    #   • operator (tenant_admin) — runs the marketplace: brands, products, all orders, buyers
    #   • buyers (tenant_user) — boutiques: discover brands, build a multi-brand order, checkout, my orders
    users: list = field(default_factory=lambda: [
        {"email": "operator@atelier.market", "password": "Password123!", "role": "tenant_admin",
         "full_name": "Atelier Operator", "tenant": "default-tenant"},
        {"email": "buyer@atelier.market", "password": "Password123!", "role": "tenant_user",
         "full_name": "Maison Plume", "tenant": "default-tenant"},
        # Platform tester — keep this account in every app:
    ])

    # email (order confirmations) + stripe_checkout (hosted prepay) + ai (buyer curation) + workflows.
    services: list = field(default_factory=lambda: ["email", "stripe_checkout", "ai", "workflows"])

    public_schemas: list = field(default_factory=lambda: ["brand", "product"])
