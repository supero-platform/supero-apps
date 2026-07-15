# schemas.py — data model for Ledgerline (usage-based billing + spend management)
#
# Plain-CRUD with renamed *_state enums (NOT `status`). Plans are public (pricing
# page); customers/invoices carry subscription + billing; expenses run through an
# approval saga (workflow with compensation). Owner-scoping for the customer portal.

NS = "ledgerline"

TIERS = ["Starter", "Growth", "Scale", "Enterprise"]
EXPENSE_CATS = ["Software", "Travel", "Marketing", "Office", "Contractors", "Other"]

# A pricing plan. PUBLIC — shown on the pricing page.
Plan = {
    "schema_type": "object", "name": "Plan", "namespace": "ledgerline", "parent_type": "tenant",
    "description": "A usage-based pricing plan with included seats and units, overage rate and feature list.",
    "attributes": [
        {"name": "plan_name", "type": "string", "mandatory": True},
        {"name": "tier", "type": "string", "values": TIERS},
        {"name": "price_monthly", "type": "float", "mandatory": True},
        {"name": "price_annual", "type": "float"},
        {"name": "included_seats", "type": "integer"},
        {"name": "included_units", "type": "integer"},
        {"name": "overage_rate", "type": "float"},
        {"name": "features", "type": "text"},
        {"name": "popular", "type": "boolean"},
        {"name": "sort_order", "type": "integer"},
    ],
}

# A customer account + its live subscription. Owner-scoped for the portal; admins see all.
Customer = {
    "schema_type": "object", "name": "Customer", "namespace": "ledgerline", "parent_type": "tenant",
    "description": "A billing customer with its active plan, MRR, seats, usage and lifecycle state.",
    "attributes": [
        {"name": "business_name", "type": "string", "mandatory": True},
        {"name": "contact_name", "type": "string"},
        {"name": "email", "type": "string", "mandatory": True},
        {"name": "plan_name", "type": "string"},
        {"name": "tier", "type": "string", "values": TIERS},
        {"name": "mrr", "type": "float"},
        {"name": "seats", "type": "integer"},
        {"name": "usage_units", "type": "integer"},
        {"name": "billing_interval", "type": "string", "values": ["monthly", "annual"]},
        {"name": "account_state", "type": "string", "mandatory": True,
         "values": ["trial", "active", "past_due", "churned"]},
        {"name": "signup_date", "type": "date"},
        {"name": "owner_username", "type": "string"},
    ],
}

# An invoice. Owner-scoped to the customer; lifecycle via invoice_state.
Invoice = {
    "schema_type": "object", "name": "Invoice", "namespace": "ledgerline", "parent_type": "tenant",
    "description": "A customer invoice for a billing period with amount, due date and payment state.",
    "attributes": [
        {"name": "invoice_number", "type": "string", "mandatory": True},
        {"name": "customer_name", "type": "string"},
        {"name": "customer_email", "type": "string"},
        {"name": "period", "type": "string"},
        {"name": "subtotal", "type": "float"},
        {"name": "usage_charges", "type": "float"},
        {"name": "amount", "type": "float", "mandatory": True},
        {"name": "invoice_state", "type": "string", "mandatory": True,
         "values": ["draft", "sent", "paid", "overdue", "void"]},
        {"name": "issued_date", "type": "date"},
        {"name": "due_date", "type": "date"},
        {"name": "paid_at", "type": "datetime"},
        {"name": "dunning_step", "type": "integer"},
        {"name": "owner_username", "type": "string"},
    ],
    "validations": [
        {"id": "amount-nonneg", "assert": {">=": [{"var": "amount"}, 0]},
         "message": "Invoice amount cannot be negative.", "severity": "error"},
    ],
}

# An expense that runs through an approval saga.
Expense = {
    "schema_type": "object", "name": "Expense", "namespace": "ledgerline", "parent_type": "tenant",
    "description": "A team expense submitted for approval, with vendor, amount, category and approval state.",
    "attributes": [
        {"name": "title", "type": "string", "mandatory": True},
        {"name": "vendor", "type": "string"},
        {"name": "amount", "type": "float", "mandatory": True},
        {"name": "category", "type": "string", "values": EXPENSE_CATS},
        {"name": "submitter", "type": "string"},
        {"name": "submitter_email", "type": "string"},
        {"name": "expense_state", "type": "string", "mandatory": True,
         "values": ["submitted", "approved", "rejected", "reimbursed"]},
        {"name": "approver", "type": "string"},
        {"name": "submitted_date", "type": "date"},
        {"name": "note", "type": "text"},
        {"name": "owner_username", "type": "string"},
    ],
}

ALL_SCHEMAS = [Plan, Customer, Invoice, Expense]
PUBLIC_SCHEMAS = ["plan"]
SUPERO_APP_NAMESPACE = "ledgerline"
