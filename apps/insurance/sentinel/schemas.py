# schemas.py — data model for Sentinel (enterprise insurance policy & claims platform)
#
# Plain-CRUD with renamed *_state enums (NEVER `status`). InsuranceProduct is PUBLIC
# (coverage marketing pages). Policy / Claim / ClaimDocument are owner-scoped for the
# policyholder portal. Headline showcase = FIELD-LEVEL RBAC on Claim: a policyholder
# (tenant_user) reads their own claim but the insurer's `fraud_score` and
# `internal_notes` are server-stripped from their reads (hidden_fields in setup.py) —
# the claims-team console (tenant_admin) sees them in full.

NS = "sentinel"

LINES = ["Auto", "Home", "Life", "Health", "Travel", "Pet", "Business"]
DOC_TYPES = ["Photo", "Police Report", "Estimate", "Receipt", "Medical Record"]

# A purchasable coverage product. PUBLIC — shown on the marketing / coverage pages.
InsuranceProduct = {
    "schema_type": "object", "name": "InsuranceProduct", "namespace": "sentinel", "parent_type": "tenant",
    "description": "A purchasable insurance coverage product with line, starting premium and coverage highlights.",
    "attributes": [
        {"name": "name", "type": "string", "mandatory": True},
        {"name": "line", "type": "string", "values": LINES},
        {"name": "tagline", "type": "string"},
        {"name": "monthly_from", "type": "float"},
        {"name": "coverage_highlights", "type": "text"},
        {"name": "image", "type": "Image"},
        {"name": "popular", "type": "boolean"},
        {"name": "sort_order", "type": "integer"},
    ],
}

# A policy held by a policyholder. Owner-scoped — each member sees only their own.
Policy = {
    "schema_type": "object", "name": "Policy", "namespace": "sentinel", "parent_type": "tenant",
    "description": "An issued or quoted insurance policy with premium, coverage amount and lifecycle state.",
    "attributes": [
        {"name": "policy_number", "type": "string", "mandatory": True},
        {"name": "product_name", "type": "string"},
        {"name": "line", "type": "string", "values": LINES},
        {"name": "holder_name", "type": "string"},
        {"name": "holder_email", "type": "string"},
        {"name": "premium", "type": "float"},
        {"name": "coverage_amount", "type": "float"},
        {"name": "policy_state", "type": "string", "mandatory": True,
         "values": ["quoted", "active", "lapsed", "cancelled"]},
        {"name": "start_date", "type": "date"},
        {"name": "renewal_date", "type": "date"},
        {"name": "owner_username", "type": "string"},
    ],
}

# A claim filed against a policy. Owner-scoped to the policyholder; `fraud_score` and
# `internal_notes` are STAFF-ONLY (hidden from policyholder reads via field-level RBAC).
Claim = {
    "schema_type": "object", "name": "Claim", "namespace": "sentinel", "parent_type": "tenant",
    "description": "An insurance claim with type, amount, adjuster and (staff-only) fraud score and internal notes.",
    "attributes": [
        {"name": "claim_number", "type": "string", "mandatory": True},
        {"name": "policy_number", "type": "string"},
        {"name": "line", "type": "string", "values": LINES},
        {"name": "holder_name", "type": "string"},
        {"name": "holder_email", "type": "string"},
        {"name": "claim_type", "type": "string"},
        {"name": "incident_date", "type": "date"},
        {"name": "amount_claimed", "type": "float", "mandatory": True},
        {"name": "amount_approved", "type": "float"},
        {"name": "claim_state", "type": "string", "mandatory": True,
         "values": ["submitted", "under_review", "approved", "paid", "denied"]},
        {"name": "adjuster", "type": "string"},
        {"name": "description", "type": "text"},
        {"name": "submitted_date", "type": "date"},
        # Staff-only (server-stripped from policyholder reads):
        {"name": "fraud_score", "type": "integer"},
        {"name": "internal_notes", "type": "text"},
        {"name": "owner_username", "type": "string"},
    ],
}

# A supporting document attached to a claim. Owner-scoped; verified via doc_state.
ClaimDocument = {
    "schema_type": "object", "name": "ClaimDocument", "namespace": "sentinel", "parent_type": "tenant",
    "description": "A supporting document attached to a claim, such as a photo, estimate or police report.",
    "attributes": [
        {"name": "claim_number", "type": "string"},
        {"name": "title", "type": "string", "mandatory": True},
        {"name": "doc_type", "type": "string", "values": DOC_TYPES},
        {"name": "doc_state", "type": "string", "mandatory": True,
         "values": ["pending", "received", "verified"]},
        {"name": "uploaded_date", "type": "date"},
        {"name": "owner_username", "type": "string"},
    ],
}

ALL_SCHEMAS = [InsuranceProduct, Policy, Claim, ClaimDocument]
PUBLIC_SCHEMAS = ["insurance_product"]
SUPERO_APP_NAMESPACE = "sentinel"
