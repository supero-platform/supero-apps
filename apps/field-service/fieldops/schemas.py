# FieldOps — scheduling, dispatch and invoicing for the trades.
# All states/fields verified against the service manifests (/). namespace literal.

# ── Service — a bookable trade service. PUBLIC. extends service:base_service. ──
Service = {
    "schema_type": "object", "name": "Service", "namespace": "fieldops",
    "parent_type": "tenant", "extends": "service:base_service",
    "description": "A bookable field service offering with a flat or hourly rate and category.",
    "attributes": [
        {"name": "owner_username", "type": "string"},
        {"name": "category", "type": "string",
         "values": ["Plumbing", "Electrical", "HVAC", "Appliance", "Roofing", "Landscaping", "Handyman", "Cleaning"]},
        {"name": "base_price", "type": "float"},
        {"name": "duration_minutes", "type": "integer"},
        {"name": "image", "type": "Image"},
        {"name": "callout_fee", "type": "float"},
        # base_service requires: status (initial 'active').
    ],
}

# ── Quote (+ step) — approval lifecycle: customer approves before work. ──
Quote = {
    "schema_type": "object", "name": "Quote", "namespace": "fieldops",
    "parent_type": "tenant", "extends": "approval:base_approval",
    "description": "A priced estimate a customer approves before a job is scheduled.",
    "attributes": [
        {"name": "owner_username", "type": "string"},     # the customer
        {"name": "customer_name", "type": "string"},
        {"name": "service_name", "type": "string"},
        {"name": "service_uuid", "type": "string"},
        {"name": "address", "type": "string"},
        {"name": "line_items", "type": "json"},
        {"name": "amount", "type": "float"},
        {"name": "notes", "type": "text"},
        # base_approval requires: status (initial 'draft' → 'pending' on submit).
    ],
}
QuoteStep = {
    "schema_type": "object", "name": "QuoteStep", "namespace": "fieldops",
    "parent_type": "quote", "extends": "approval:base_approval_step",
    "description": "A single approval step on a quote, decided by the customer or dispatcher.",
    "attributes": [
        {"name": "owner_username", "type": "string"},
        {"name": "decision", "type": "string"},
        {"name": "notes", "type": "text"},
        # base_approval_step requires: status (initial 'pending').
    ],
}

# ── Appointment — the scheduled job. extends appointment:base_appointment. ──
Appointment = {
    "schema_type": "object", "name": "Appointment", "namespace": "fieldops",
    "parent_type": "tenant", "extends": "appointment:base_appointment",
    "description": "A scheduled job visit moving requested to confirmed to completed.",
    "attributes": [
        {"name": "owner_username", "type": "string"},     # the customer
        {"name": "customer_name", "type": "string"},
        {"name": "customer_phone", "type": "string"},
        {"name": "address", "type": "string"},
        {"name": "service_name", "type": "string"},
        {"name": "service_uuid", "type": "string"},
        {"name": "quote_uuid", "type": "string"},
        {"name": "technician_username", "type": "string"},
        {"name": "technician_name", "type": "string"},
        {"name": "amount", "type": "float"},
        {"name": "job_notes", "type": "text"},
        {"name": "saga_state", "type": "string"},
        {"name": "workflow_status", "type": "string"},
        {"name": "processed_at", "type": "datetime"},
        # base_appointment requires: status (initial 'requested'), start_time, end_time.
    ],
}

# ── WorkOrder (+ signature) — document_signature lifecycle: sign-off on completion. ──
WorkOrder = {
    "schema_type": "object", "name": "WorkOrder", "namespace": "fieldops",
    "parent_type": "tenant", "extends": "document_signature:base_document",
    "description": "A completion record the customer signs off, with parts used and labour.",
    "attributes": [
        {"name": "owner_username", "type": "string"},
        {"name": "appointment_uuid", "type": "string"},
        {"name": "customer_name", "type": "string"},
        {"name": "technician_username", "type": "string"},
        {"name": "technician_name", "type": "string"},
        {"name": "parts_used", "type": "json"},
        {"name": "labor_hours", "type": "float"},
        {"name": "labor_notes", "type": "text"},
        {"name": "total", "type": "float"},
        # base_document requires: status (initial 'draft'), title.
    ],
}
WorkOrderSignature = {
    "schema_type": "object", "name": "WorkOrderSignature", "namespace": "fieldops",
    "parent_type": "work_order", "extends": "document_signature:base_signature",
    "description": "A customer signature line on a work order confirming the job is done.",
    "attributes": [
        {"name": "owner_username", "type": "string"},
        {"name": "document_uuid", "type": "string"},
        {"name": "signer_name", "type": "string"},
        {"name": "signer_role", "type": "string"},
        # base_signature requires: status (initial 'pending'), document_uuid.
    ],
}

# ── Payment — extends payment:base_payment. ──
Payment = {
    "schema_type": "object", "name": "Payment", "namespace": "fieldops",
    "parent_type": "tenant", "extends": "payment:base_payment",
    "description": "A payment for a completed job, authorized then captured on sign-off.",
    "attributes": [
        {"name": "owner_username", "type": "string"},
        {"name": "appointment_uuid", "type": "string"},
        {"name": "work_order_uuid", "type": "string"},
        {"name": "method", "type": "string"},
        {"name": "external_id", "type": "string"},
        {"name": "invoice_id", "type": "string"},
        {"name": "workflow_status", "type": "string"},
        # base_payment requires: status (initial 'pending'), amount, currency.
    ],
}

# ── PartItem (+ PartHold) — inventory two-schema for truck-stock parts. ──
PartItem = {
    "schema_type": "object", "name": "PartItem", "namespace": "fieldops",
    "parent_type": "tenant", "extends": "inventory:base_inventory",
    "description": "A stocked part with on-hand quantity, reserved and committed against jobs.",
    "attributes": [
        {"name": "owner_username", "type": "string"},
        {"name": "sku", "type": "string"},
        {"name": "unit_cost", "type": "float"},
        {"name": "category", "type": "string"},
        # base_inventory requires: status (initial 'active'), quantity.
    ],
}
PartHold = {
    "schema_type": "object", "name": "PartHold", "namespace": "fieldops",
    "parent_type": "part_item", "extends": "inventory:base_reservation",
    "description": "A reservation of a part against a specific job, held then committed.",
    "attributes": [
        {"name": "owner_username", "type": "string"},
        {"name": "appointment_uuid", "type": "string"},
        {"name": "part_name", "type": "string"},
        # base_reservation requires: status (initial 'pending' → 'held' → 'committed'), quantity.
    ],
}

# ── Contract — maintenance plan. extends recurring_plan:base_recurring_plan. ──
Contract = {
    "schema_type": "object", "name": "Contract", "namespace": "fieldops",
    "parent_type": "tenant", "extends": "recurring_plan:base_recurring_plan",
    "description": "A recurring maintenance plan billing a customer on an interval.",
    "attributes": [
        {"name": "owner_username", "type": "string"},
        {"name": "customer_name", "type": "string"},
        {"name": "plan_name", "type": "string"},
        {"name": "billing_amount", "type": "float"},
        {"name": "next_service_date", "type": "date"},
        # base_recurring_plan requires: status (initial 'inactive'), billing_interval.
    ],
}

# ── CustomerProfile — app person linked to identity. persona distinguishes roles. ──
CustomerProfile = {
    "schema_type": "object", "name": "CustomerProfile", "namespace": "fieldops",
    "parent_type": "tenant",
    "description": "A FieldOps participant linked to a login, tagged customer/technician/dispatcher.",
    "attributes": [
        {"name": "user_account_uuid", "type": "string"},
        {"name": "owner_username", "type": "string"},
        {"name": "persona", "type": "string", "values": ["customer", "technician", "dispatcher"]},
        {"name": "email", "type": "string"},
        {"name": "phone", "type": "string"},
        {"name": "address", "type": "string"},
        {"name": "avatar", "type": "Image"},
    ],
}

# ── Technician — dispatchable field tech (entity). ──
Technician = {
    "schema_type": "object", "name": "Technician", "namespace": "fieldops",
    "parent_type": "tenant",
    "description": "A field technician who can be dispatched to jobs, with skills and availability.",
    "attributes": [
        {"name": "user_account_uuid", "type": "string"},
        {"name": "owner_username", "type": "string"},
        {"name": "tech_username", "type": "string"},
        {"name": "skills", "type": "string"},
        {"name": "phone", "type": "string"},
        {"name": "avatar", "type": "Image"},
        {"name": "rating", "type": "float"},
        {"name": "active", "type": "boolean"},
    ],
}


ALL_SCHEMAS = [
    Service, Quote, QuoteStep, Appointment, WorkOrder, WorkOrderSignature,
    Payment, PartItem, PartHold, Contract, CustomerProfile, Technician,
]

PUBLIC_SCHEMAS = ["service"]

SUPERO_APP_NAMESPACE = "fieldops"
