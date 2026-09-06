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

    # MULTI-TENANT-V2 — two insurers on one deployment.
    #
    # CORRECTION: an earlier version of this comment said the platform "infers the
    # flag from the presence of business tenants". It does not, and relying on that
    # is why the live demo reported itself as single-tenant. The UI flag is resolved
    # by run.py from SUPERO_IS_MULTI_TENANT in .env, falling back to the project
    # record on the platform — declaring tenants here does not set either. The
    # tenants below are still what create real isolation server-side; they just do
    # not switch on the UI chrome. Set SUPERO_IS_MULTI_TENANT / the tenant nouns in
    # .env.example (already done) so the interface shows the tenancy the API
    # enforces. Northwind is the
    # primary demo; Cascade exists so cross-tenant isolation can be demonstrated
    # rather than asserted — sign in as one and the other's book is not reachable,
    # not even by calling the API directly with a valid token.
    tenants: list = field(default_factory=lambda: [
        {"name": "default-tenant", "display_name": "Sentinel"},
        {"name": "northwind-mutual", "display_name": "Northwind Mutual"},
        {"name": "cascade-assurance", "display_name": "Cascade Assurance"},
    ])

    # Two audiences:
    #   • claims team (tenant_admin) — console: dashboard + charts, claims queue with
    #     fraud_score + internal_notes, approval/payout sagas, book of business, products
    #   • policyholders (tenant_user) — portal: my policies, file a claim, my claims
    #     (WITHOUT fraud_score / internal_notes), upload claim documents
    # The two published logins keep their addresses and move to Northwind, so every
    # link and README that already names them still works. Cascade gets its own
    # pair — same roles, different insurer.
    users: list = field(default_factory=lambda: [
        {"email": "claims@sentinel.insure", "password": "Password123!", "role": "tenant_admin",
         "full_name": "Dana Okafor, Claims Lead", "tenant": "northwind-mutual"},
        {"email": "member@sentinel.insure", "password": "Password123!", "role": "tenant_user",
         "full_name": "Chris Bennett", "tenant": "northwind-mutual"},
        {"email": "claims@cascade.insure", "password": "Password123!", "role": "tenant_admin",
         "full_name": "Priya Raghavan, Claims Lead", "tenant": "cascade-assurance"},
        {"email": "member@cascade.insure", "password": "Password123!", "role": "tenant_user",
         "full_name": "Marcus Webb", "tenant": "cascade-assurance"},
    ])

    # email (acknowledgements + decisions), slack (#claims adjuster alerts),
    # ai (coverage explainer / claim summary), workflows (intake + decision/payout sagas).
    services: list = field(default_factory=lambda: ["email", "slack", "ai", "workflows"])

    public_schemas: list = field(default_factory=lambda: ["insurance_product"])
