# schemas.py — LATTICE multi-tenant property-management data model
# NAMESPACE-LITERAL-ONLY-V1: namespace is a plain string literal ("latticepm") on
# every schema dict — no variable, no env read (SKILLS.md §5).
#
# Domain (AppFolio/Buildium-style): each property-management COMPANY is a Supero
# tenant. Within a tenant live the company's Properties, Units, Leases, Residents,
# Owners, MaintenanceRequests, RentPayments and Applications.
#
# Deliberate, in-contract choices (all stay inside SKILLS.md §5/§13):
#  - Unit is a CHILD of Property (parent_type "property") so units live inside a
#    property's detail (SKILLS.md §5 "parent_type rule"). Child create passes
#    parent_type + parent_uuid; child seed carries parent_uuid (gotcha #8).
#  - RentPayment EXTENDS the `payment` transactional service → inherits the
#    pending→authorized→captured→refunded state machine + MANDATORY status/amount/
#    currency (§5 extends + §13). We add display/denormalized fields on top.
#  - MaintenanceRequest is a plain workflow-bearing entity (submitted→assigned→
#    in_progress→resolved) with workflow_status/processed_at chips (§5 + §6); the
#    transactional `ticket` service exists but its op/state names (open/in_progress/
#    resolved) don't map cleanly to our submitted/assigned wording, so we keep a
#    plain status field driven by a real server-side workflow.
#  - Lease is a normal transactional-free entity with start_at/end_at + status
#    (there is no "lease" service base; `rental` exists but its check_out/check_in
#    semantics are short-term equipment rental, not a 12-month residential lease —
#    so a plain entity is the spec-correct model here).
#  - Resident / Owner are NORMAL entities (never named "user"/"tenant" — both are
#    reserved/overloaded per §5). Resident links to login identity via the
#    sanctioned flat field user_account_uuid, and is owner-scoped (owner_username).
#  - Denormalized display fields (property_name, unit_label, resident_name, …) let
#    lists / boards / dashboards render with zero ref-joins; real references are
#    still linked at create/seed time.

NS = "latticepm"  # comment anchor only; every dict carries the literal "latticepm"

# ── Property: a building / complex (top-level browse entity, also PUBLIC) ──────
Property = {
    "schema_type": "object",
    "name": "Property",
    "namespace": "latticepm",
    "parent_type": "tenant",
    "description": "A building or complex managed by the company, with address, type and unit count.",
    "attributes": [
        {"name": "address", "type": "string", "mandatory": True},
        {"name": "city", "type": "string"},
        {"name": "state", "type": "string"},
        {"name": "zip_code", "type": "string"},
        {"name": "property_type", "type": "string",
         "values": ["apartment", "condo", "single_family", "townhome", "commercial"]},
        {"name": "units_count", "type": "integer"},
        {"name": "year_built", "type": "integer"},
        {"name": "hero_image", "type": "Image"},
        {"name": "gallery", "type": "json"},          # [{url, thumbnail_url}, ...]
        {"name": "owner_name", "type": "string"},      # denormalized for cards
    ],
    "references": [
        {"name": "Owner", "cardinality": "one", "back_ref_name": "properties"},
    ],
}

# ── Unit: a rentable unit, CHILD of Property (also PUBLIC for the listings page) ─
Unit = {
    "schema_type": "object",
    "name": "Unit",
    "namespace": "latticepm",
    "parent_type": "property",            # CHILD of Property (bare snake_case parent name)
    "description": "A single rentable unit inside a property with bedrooms, rent and availability status.",
    "attributes": [
        {"name": "unit_label", "type": "string", "mandatory": True},   # e.g. "Apt 2B"
        {"name": "bedrooms", "type": "integer"},
        {"name": "bathrooms", "type": "float"},
        {"name": "square_feet", "type": "integer"},
        {"name": "rent", "type": "float", "mandatory": True},
        {"name": "status", "type": "string",
         "values": ["available", "occupied", "maintenance", "off_market"]},
        {"name": "hero_image", "type": "Image"},
        {"name": "property_name", "type": "string"},   # denormalized for listings
        {"name": "city", "type": "string"},            # denormalized for filtering
    ],
}

# ── Owner: a property owner (top-level entity) ────────────────────────────────
Owner = {
    "schema_type": "object",
    "name": "Owner",
    "namespace": "latticepm",
    "parent_type": "tenant",
    "description": "A property owner the company manages buildings on behalf of, with contact details.",
    "attributes": [
        {"name": "full_name", "type": "string", "mandatory": True},
        {"name": "email", "type": "string"},
        {"name": "phone", "type": "string"},
        {"name": "company", "type": "string"},
        {"name": "photo", "type": "Image"},
    ],
}

# ── Resident: the renter. NORMAL entity linked to identity, owner-scoped ───────
#    NEVER named "Tenant" (that's the Supero multi-tenancy concept) or "user".
Resident = {
    "schema_type": "object",
    "name": "Resident",
    "namespace": "latticepm",
    "parent_type": "tenant",
    "description": "A renter living in a unit, linked to their login identity and scoped to themselves.",
    "attributes": [
        {"name": "owner_username", "type": "string"},        # auto-stamped; scopes "my" reads
        {"name": "user_account_uuid", "type": "string"},     # sanctioned flat link to identity (§5)
        {"name": "full_name", "type": "string"},
        {"name": "email", "type": "string"},
        {"name": "phone", "type": "string"},
        {"name": "unit_label", "type": "string"},            # denormalized current unit
        {"name": "property_name", "type": "string"},         # denormalized current building
        {"name": "photo", "type": "Image"},
    ],
    "references": [
        {"name": "Unit", "cardinality": "one", "back_ref_name": "residents"},
    ],
}

# ── Lease: a normal entity with start_at/end_at + status ──────────────────────
Lease = {
    "schema_type": "object",
    "name": "Lease",
    "namespace": "latticepm",
    "parent_type": "tenant",
    "description": "A rental agreement binding a resident to a unit for a term, with rent and status.",
    "attributes": [
        {"name": "owner_username", "type": "string"},        # the resident's own scope
        {"name": "status", "type": "string",
         "values": ["draft", "active", "expired", "terminated", "renewed"]},
        {"name": "start_at", "type": "datetime"},
        {"name": "end_at", "type": "datetime"},
        {"name": "monthly_rent", "type": "float"},
        {"name": "deposit", "type": "float"},
        {"name": "resident_name", "type": "string"},         # denormalized
        {"name": "unit_label", "type": "string"},            # denormalized
        {"name": "property_name", "type": "string"},         # denormalized
    ],
    "references": [
        {"name": "Unit", "cardinality": "one", "back_ref_name": "leases"},
        {"name": "Resident", "cardinality": "one", "back_ref_name": "leases"},
    ],
}

# ── RentPayment: EXTENDS the `payment` transactional service ───────────────────
#    Inherits pending->authorized->captured->refunded + MANDATORY status/amount/currency.
RentPayment = {
    "schema_type": "object",
    "name": "RentPayment",
    "namespace": "latticepm",
    "parent_type": "tenant",
    "extends": "payment:base_payment",
    "description": "A monthly rent charge moving through pending, captured and refunded states.",
    "attributes": [
        {"name": "owner_username", "type": "string"},        # the resident who pays
        {"name": "period", "type": "string"},                # e.g. "2026-06"
        {"name": "due_date", "type": "datetime"},
        {"name": "paid_at", "type": "datetime"},
        {"name": "method", "type": "string",
         "values": ["card", "ach", "check", "cash"]},
        {"name": "resident_name", "type": "string"},         # denormalized
        {"name": "unit_label", "type": "string"},            # denormalized
        {"name": "property_name", "type": "string"},         # denormalized
    ],
    "references": [
        {"name": "Lease", "cardinality": "one", "back_ref_name": "payments"},
    ],
}

# ── MaintenanceRequest: workflow-bearing entity (submitted->...->resolved) ─────
MaintenanceRequest = {
    "schema_type": "object",
    "name": "MaintenanceRequest",
    "namespace": "latticepm",
    "parent_type": "tenant",
    "description": "A repair ticket raised by a resident, tracked from submitted through resolved.",
    "attributes": [
        {"name": "owner_username", "type": "string"},        # the resident who submitted
        {"name": "title", "type": "string", "mandatory": True},
        {"name": "category", "type": "string",
         "values": ["plumbing", "electrical", "hvac", "appliance", "structural", "other"]},
        {"name": "priority", "type": "string",
         "values": ["low", "normal", "high", "urgent"]},
        {"name": "status", "type": "string",
         "values": ["submitted", "assigned", "in_progress", "resolved"]},
        {"name": "assignee_name", "type": "string"},
        {"name": "resident_name", "type": "string"},         # denormalized
        {"name": "unit_label", "type": "string"},            # denormalized
        {"name": "property_name", "type": "string"},         # denormalized
        {"name": "photo", "type": "Image"},
        # workflow chip fields (stamped by maintenance_resolved):
        {"name": "workflow_status", "type": "string"},
        {"name": "processed_at", "type": "datetime"},
    ],
    "references": [
        {"name": "Unit", "cardinality": "one", "back_ref_name": "maintenance_requests"},
    ],
}

# ── Application: a prospective renter applies to an available unit ─────────────
Application = {
    "schema_type": "object",
    "name": "Application",
    "namespace": "latticepm",
    "parent_type": "tenant",
    "description": "A prospective renter's application to lease a specific available unit.",
    "attributes": [
        {"name": "owner_username", "type": "string"},
        {"name": "applicant_name", "type": "string", "mandatory": True},
        {"name": "applicant_email", "type": "string"},
        {"name": "applicant_phone", "type": "string"},
        {"name": "status", "type": "string",
         "values": ["received", "screening", "approved", "denied"]},
        {"name": "stated_income", "type": "float"},
        {"name": "move_in_date", "type": "datetime"},
        {"name": "unit_label", "type": "string"},            # denormalized
        {"name": "property_name", "type": "string"},         # denormalized
        {"name": "notes", "type": "text"},
    ],
    "references": [
        {"name": "Unit", "cardinality": "one", "back_ref_name": "applications"},
    ],
}

# belt-and-suspenders: lets any (even pinned/old) SDK resolve the namespace (§5).
SUPERO_APP_NAMESPACE = "latticepm"

ALL_SCHEMAS = [
    Property, Unit, Owner, Resident, Lease, RentPayment, MaintenanceRequest, Application,
]

# snake_case slugs; multi-word names -> snake_case (gotcha #5). Public listings
# page reads Property + Unit logged-out (browse available units / buildings).
PUBLIC_SCHEMAS = ["property", "unit"]
