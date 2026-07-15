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
    app_name: str = "Sentinel"
    app_emoji: str = "🛡️"
    app_description: str = "Enterprise insurance policy & claims management — quote and bind coverage, file and adjudicate claims, with insurer-internal fraud scoring kept off the policyholder portal."
    domain_name: str    = field(default_factory=lambda: os.getenv("SUPERO_DOMAIN", "your-domain"))
    admin_email: str    = field(default_factory=lambda: os.getenv("SUPERO_ADMIN_EMAIL", "you@example.com"))
    admin_password: str = field(default_factory=lambda: os.environ.get("SUPERO_PASSWORD") or _require_password())
    project_name: str   = field(default_factory=lambda: os.getenv("SUPERO_PROJECT", "sentinel"))

    tenants: list = field(default_factory=lambda: [
        {"name": "default-tenant", "display_name": "Sentinel"},
    ])

    # Two audiences:
    #   • claims team (tenant_admin) — console: dashboard + charts, claims queue with
    #     fraud_score + internal_notes, approval/payout sagas, book of business, products
    #   • policyholders (tenant_user) — portal: my policies, file a claim, my claims
    #     (WITHOUT fraud_score / internal_notes), upload claim documents
    users: list = field(default_factory=lambda: [
        {"email": "claims@sentinel.insure", "password": "Password123!", "role": "tenant_admin",
         "full_name": "Dana Okafor, Claims Lead", "tenant": "default-tenant"},
        {"email": "member@sentinel.insure", "password": "Password123!", "role": "tenant_user",
         "full_name": "Chris Bennett", "tenant": "default-tenant"},
    ])

    # email (acknowledgements + decisions), slack (#claims adjuster alerts),
    # ai (coverage explainer / claim summary), workflows (intake + decision/payout sagas).
    services: list = field(default_factory=lambda: ["email", "slack", "ai", "workflows"])

    public_schemas: list = field(default_factory=lambda: ["insurance_product"])
