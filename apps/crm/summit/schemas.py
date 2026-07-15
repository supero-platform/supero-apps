# schemas.py — data model for Summit CRM (Salesforce-grade sales CRM)
#
# Internal SaaS — NO public schemas (login-only app). Lifecycle fields are all
# named `<x>_state` (NEVER `status`/`state`) so they survive non-admin writes.
# Owner-scoped private records (lead/deal/activity) carry `owner_username`.

NS = "summit"

INDUSTRIES = ["SaaS", "Fintech", "Healthcare", "Retail", "Manufacturing", "Media", "Education", "Energy"]
TIERS = ["SMB", "Mid-Market", "Enterprise"]
LEAD_SOURCES = ["Web", "Referral", "Event", "Outbound", "Partner", "Ad"]
DEAL_STAGES = ["Prospecting", "Qualification", "Proposal", "Negotiation", "Closed Won", "Closed Lost"]
ACTIVITY_TYPES = ["Call", "Email", "Meeting", "Note", "Task"]

# A company / account. account_state is the lifecycle enum (prospect/customer/churned).
Account = {
    "schema_type": "object", "name": "Account", "namespace": "summit", "parent_type": "tenant",
    "description": "A company account with industry, tier, region, revenue and lifecycle state.",
    "attributes": [
        {"name": "name", "type": "string", "mandatory": True},
        {"name": "industry", "type": "string", "values": INDUSTRIES},
        {"name": "website", "type": "string"},
        {"name": "employees", "type": "integer"},
        {"name": "annual_revenue", "type": "float"},
        {"name": "tier", "type": "string", "values": TIERS},
        {"name": "region", "type": "string"},
        {"name": "account_owner", "type": "string"},
        {"name": "account_state", "type": "string", "mandatory": True,
         "values": ["prospect", "customer", "churned"]},
        {"name": "logo", "type": "Image"},
        {"name": "description", "type": "text"},
    ],
}

# A contact / person at an account.
Contact = {
    "schema_type": "object", "name": "Contact", "namespace": "summit", "parent_type": "tenant",
    "description": "A person at an account — title, email, phone and primary flag.",
    "attributes": [
        {"name": "full_name", "type": "string", "mandatory": True},
        {"name": "title", "type": "string"},
        {"name": "email", "type": "string"},
        {"name": "phone", "type": "string"},
        {"name": "account_name", "type": "string"},
        {"name": "is_primary", "type": "boolean"},
        {"name": "photo", "type": "Image"},
        {"name": "owner_username", "type": "string"},
    ],
}

# An inbound/outbound lead. Owner-scoped to the rep. lead_state is the lifecycle enum.
Lead = {
    "schema_type": "object", "name": "Lead", "namespace": "summit", "parent_type": "tenant",
    "description": "A sales lead with source, score, estimated value and qualification state.",
    "attributes": [
        {"name": "full_name", "type": "string", "mandatory": True},
        {"name": "company", "type": "string"},
        {"name": "email", "type": "string"},
        {"name": "phone", "type": "string"},
        {"name": "title", "type": "string"},
        {"name": "source", "type": "string", "values": LEAD_SOURCES},
        {"name": "lead_state", "type": "string", "mandatory": True,
         "values": ["new", "working", "qualified", "unqualified", "converted"]},
        {"name": "score", "type": "integer"},
        {"name": "est_value", "type": "float"},
        {"name": "lead_owner", "type": "string"},
        {"name": "owner_username", "type": "string"},
    ],
}

# A pipeline opportunity. Owner-scoped to the rep. deal_stage is the lifecycle enum.
Deal = {
    "schema_type": "object", "name": "Deal", "namespace": "summit", "parent_type": "tenant",
    "description": "A pipeline opportunity with amount, stage, probability and close date.",
    "attributes": [
        {"name": "deal_name", "type": "string", "mandatory": True},
        {"name": "account_name", "type": "string"},
        {"name": "contact_name", "type": "string"},
        {"name": "amount", "type": "float", "mandatory": True},
        {"name": "deal_stage", "type": "string", "mandatory": True, "values": DEAL_STAGES},
        {"name": "probability", "type": "integer"},
        {"name": "close_date", "type": "date"},
        {"name": "deal_owner", "type": "string"},
        {"name": "next_step", "type": "string"},
        {"name": "owner_username", "type": "string"},
    ],
}

# An activity (call/email/meeting/note/task). Owner-scoped to the rep.
Activity = {
    "schema_type": "object", "name": "Activity", "namespace": "summit", "parent_type": "tenant",
    "description": "A sales activity — call, email, meeting, note or task — with due date and state.",
    "attributes": [
        {"name": "subject", "type": "string", "mandatory": True},
        {"name": "activity_type", "type": "string", "values": ACTIVITY_TYPES},
        {"name": "account_name", "type": "string"},
        {"name": "contact_name", "type": "string"},
        {"name": "deal_name", "type": "string"},
        {"name": "due_date", "type": "date"},
        {"name": "activity_state", "type": "string", "mandatory": True,
         "values": ["open", "completed"]},
        {"name": "activity_owner", "type": "string"},
        {"name": "notes", "type": "text"},
        {"name": "owner_username", "type": "string"},
    ],
}

ALL_SCHEMAS = [Account, Contact, Lead, Deal, Activity]
PUBLIC_SCHEMAS = []  # internal SaaS — no public schemas (login-only app)
SUPERO_APP_NAMESPACE = "summit"
