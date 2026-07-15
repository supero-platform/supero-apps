# Relay — per-diem healthcare staffing marketplace.
# States/fields verified against service manifests. namespace literal on every dict.

# ── Shift — a postable, claimable per-diem shift. PUBLIC. extends booking. ──
# booking states: requested → confirmed → completed (+ cancelled / no_show).
# A posted shift sits at 'requested' (open); a claim is book_slot → 'confirmed'.
Shift = {
    "schema_type": "object", "name": "Shift", "namespace": "relay",
    "parent_type": "tenant", "extends": "booking:base_booking",
    "description": "A per-diem clinical shift a facility posts and a clinician claims.",
    "attributes": [
        {"name": "facility_username", "type": "string"},
        {"name": "facility_name", "type": "string"},
        {"name": "role", "type": "string", "values": ["RN", "LPN", "CNA", "NP", "PT", "RT"]},
        {"name": "specialty", "type": "string"},
        {"name": "rate_hourly", "type": "float"},
        {"name": "hours", "type": "float"},
        {"name": "pay_total", "type": "float"},
        {"name": "shift_date", "type": "date"},
        {"name": "location", "type": "string"},
        {"name": "image", "type": "Image"},
        {"name": "clinician_username", "type": "string"},   # who claimed it
        {"name": "clinician_name", "type": "string"},
        {"name": "checked_in_at", "type": "datetime"},
        {"name": "checked_out_at", "type": "datetime"},
        {"name": "workflow_status", "type": "string"},
        {"name": "processed_at", "type": "datetime"},
        # base_booking requires: status (initial 'requested'), start_time, end_time.
    ],
}

# ── Credential — a clinician's uploaded license/cert. extends attachment. ──
# attachment states: pending_upload → uploaded → scanned (+ archived / failed).
Credential = {
    "schema_type": "object", "name": "Credential", "namespace": "relay",
    "parent_type": "tenant", "extends": "attachment:base_attachment",
    "description": "A clinician credential document (license, BLS, ACLS) uploaded and scanned.",
    "attributes": [
        {"name": "owner_username", "type": "string"},       # the clinician
        {"name": "clinician_name", "type": "string"},
        {"name": "kind", "type": "string",
         "values": ["RN License", "LPN License", "CNA Cert", "BLS", "ACLS", "PALS", "TB Test", "COVID Vax"]},
        {"name": "file", "type": "File"},
        {"name": "issued_on", "type": "date"},
        {"name": "expires_on", "type": "date"},
        {"name": "verified", "type": "boolean"},
        {"name": "scan_notes", "type": "text"},
        # base_attachment requires: status (initial 'pending_upload').
    ],
}

# ── Verification (+ step) — admin approval of a credential. extends approval. ──
Verification = {
    "schema_type": "object", "name": "Verification", "namespace": "relay",
    "parent_type": "tenant", "extends": "approval:base_approval",
    "description": "An admin review that approves or rejects a clinician credential.",
    "attributes": [
        {"name": "owner_username", "type": "string"},       # the clinician
        {"name": "credential_uuid", "type": "string"},
        {"name": "credential_kind", "type": "string"},
        {"name": "clinician_name", "type": "string"},
        {"name": "notes", "type": "text"},
        # base_approval requires: status (initial 'draft' → 'pending' on submit).
    ],
}
VerificationStep = {
    "schema_type": "object", "name": "VerificationStep", "namespace": "relay",
    "parent_type": "verification", "extends": "approval:base_approval_step",
    "description": "A single review step on a credential verification.",
    "attributes": [
        {"name": "owner_username", "type": "string"},
        {"name": "decision", "type": "string"},
        {"name": "notes", "type": "text"},
        # base_approval_step requires: status (initial 'pending').
    ],
}

# ── Timesheet (+ step) — facility approval of worked hours. extends approval. ──
# (Second schema extending approval — registered ops use explicit extending_schema.)
Timesheet = {
    "schema_type": "object", "name": "Timesheet", "namespace": "relay",
    "parent_type": "tenant", "extends": "approval:base_approval",
    "description": "A clinician's submitted hours for a shift, approved or disputed by the facility.",
    "attributes": [
        {"name": "owner_username", "type": "string"},       # the clinician
        {"name": "shift_uuid", "type": "string"},
        {"name": "facility_username", "type": "string"},
        {"name": "facility_name", "type": "string"},
        {"name": "clinician_name", "type": "string"},
        {"name": "hours", "type": "float"},
        {"name": "rate_hourly", "type": "float"},
        {"name": "amount", "type": "float"},
        {"name": "shift_date", "type": "date"},
        {"name": "workflow_status", "type": "string"},
        {"name": "processed_at", "type": "datetime"},
    ],
}
TimesheetStep = {
    "schema_type": "object", "name": "TimesheetStep", "namespace": "relay",
    "parent_type": "timesheet", "extends": "approval:base_approval_step",
    "description": "A facility approval step on a submitted timesheet.",
    "attributes": [
        {"name": "owner_username", "type": "string"},
        {"name": "decision", "type": "string"},
        {"name": "notes", "type": "text"},
    ],
}

# ── Payout — clinician pay for an approved timesheet. extends payment. ──
# PLATFORM-GAP: clinician payout / invoice settlement has no platform primitive —
# modelled as a Payment-backed entity so authorize/capture/refund still drive it.
Payout = {
    "schema_type": "object", "name": "Payout", "namespace": "relay",
    "parent_type": "tenant", "extends": "payment:base_payment",
    "description": "A pay-out to a clinician for an approved timesheet, captured then settled.",
    "attributes": [
        {"name": "owner_username", "type": "string"},       # the clinician
        {"name": "shift_uuid", "type": "string"},
        {"name": "timesheet_uuid", "type": "string"},
        {"name": "facility_name", "type": "string"},
        {"name": "clinician_name", "type": "string"},
        {"name": "method", "type": "string"},
        {"name": "external_id", "type": "string"},
        {"name": "invoice_id", "type": "string"},
        {"name": "workflow_status", "type": "string"},
        # base_payment requires: status (initial 'pending'), amount, currency.
    ],
}

# ── Contract — recurring staffing agreement. extends recurring_plan. ──
Contract = {
    "schema_type": "object", "name": "Contract", "namespace": "relay",
    "parent_type": "tenant", "extends": "recurring_plan:base_recurring_plan",
    "description": "A recurring per-diem staffing agreement billed to a facility on an interval.",
    "attributes": [
        {"name": "owner_username", "type": "string"},
        {"name": "facility_name", "type": "string"},
        {"name": "plan_name", "type": "string"},
        {"name": "billing_amount", "type": "float"},
        {"name": "shifts_per_period", "type": "integer"},
        # base_recurring_plan requires: status (initial 'inactive'), billing_interval.
    ],
}

# ── Profile — clinician / facility / admin, by persona field. ──
Profile = {
    "schema_type": "object", "name": "Profile", "namespace": "relay",
    "parent_type": "tenant",
    "description": "A Relay participant linked to a login, tagged clinician / facility / admin.",
    "attributes": [
        {"name": "user_account_uuid", "type": "string"},
        {"name": "owner_username", "type": "string"},
        {"name": "persona", "type": "string", "values": ["clinician", "facility", "admin"]},
        {"name": "email", "type": "string"},
        {"name": "phone", "type": "string"},
        {"name": "role", "type": "string"},                 # clinician role (RN/LPN/…) or facility type
        {"name": "specialty", "type": "string"},
        {"name": "location", "type": "string"},
        {"name": "avatar", "type": "Image"},
        {"name": "rating", "type": "float"},
        {"name": "credentialed", "type": "boolean"},
    ],
}


ALL_SCHEMAS = [
    Shift, Credential, Verification, VerificationStep, Timesheet, TimesheetStep,
    Payout, Contract, Profile,
]

PUBLIC_SCHEMAS = ["shift"]

SUPERO_APP_NAMESPACE = "relay"
