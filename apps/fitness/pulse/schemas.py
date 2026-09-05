# schemas.py — PULSE multi-tenant fitness-chain data model
# NAMESPACE-LITERAL-ONLY-V1: namespace is a plain string literal on every schema dict.
#
# MULTI-TENANT design (each gym LOCATION is a Supero tenant):
#   - default-tenant = HQ / admin only (no member-facing business rows).
#   - Real business data lives in named location tenants: downtown, westside,
#     harborpoint. HQ admins (tenant_admin on default-tenant) switch scope with the
#     in-app TenantSwitcher (client.canSwitchTenant / client.setTenantOverride).
#   - Every record below is parent_type:"tenant", so it is naturally tenant-scoped:
#     the platform stamps the active tenant on create and filters reads by it.
#
# Deliberate, spec-grounded choices (SKILLS.md is the contract):
#   - FitnessClass is the CATALOG/template (a class TYPE: yoga/HIIT/spin/strength).
#   - ClassSession EXTENDS booking:base_booking — a scheduled instance with the
#     mandatory start_time/end_time + a lifecycle (requested->confirmed->...).
#   - Booking EXTENDS appointment:base_appointment — a member reserving a seat in a
#     session; it too carries start_time/end_time + a lifecycle.
#   - Membership EXTENDS membership:base_membership; Payment EXTENDS payment:base_payment.
#   - Member is a NORMAL entity (never named "user"/"tenant"; §5 reserved names),
#     linked to identity via the sanctioned flat user_account_uuid field.
#   - amenities / tags / gallery are typed `json` (a documented scalar) holding
#     arrays — the spec has Image/File but no list-of-Image type, so json is the
#     spec-safe way to model a collection.
#   - Transactional schemas denormalize display fields (class_name, location_name,
#     member_name, price) so lists/kanban/dashboards render with zero ref-joins;
#     the real references are still linked at create/seed time.

NS = "pulsefitness"  # comment anchor only — every dict carries the literal "pulsefitness"

# ---------------------------------------------------------------------------
# PUBLIC CATALOG (logged-out reads): Location, Trainer, FitnessClass
# ---------------------------------------------------------------------------

Location = {
    "schema_type": "object",
    "name": "Location",
    "namespace": "pulsefitness",
    "parent_type": "tenant",
    "description": "A Pulse gym location in the chain with address, hours and imagery, shown publicly.",
    "attributes": [
        {"name": "city", "type": "string", "mandatory": True},
        {"name": "address", "type": "string"},
        {"name": "phone", "type": "string"},
        {"name": "email", "type": "string"},
        {"name": "opening_hours", "type": "string"},
        {"name": "tagline", "type": "string"},
        {"name": "hero_image", "type": "Image"},
        {"name": "gallery", "type": "json"},          # [{url, thumbnail_url}, ...]
        {"name": "amenities", "type": "json"},          # ["sauna", "pool", ...]
        {"name": "tenant_key", "type": "string"},       # which Supero tenant this location maps to
        {"name": "is_featured", "type": "boolean"},
    ],
}

Trainer = {
    "schema_type": "object",
    "name": "Trainer",
    "namespace": "pulsefitness",
    "parent_type": "tenant",
    "description": "A Pulse coach who leads classes, with bio, specialties and headshot, shown publicly.",
    "attributes": [
        {"name": "bio", "type": "text"},
        {"name": "specialties", "type": "json"},        # ["strength", "mobility", ...]
        {"name": "certifications", "type": "json"},     # ["NASM-CPT", ...]
        {"name": "photo", "type": "Image"},
        {"name": "years_experience", "type": "integer"},
        {"name": "location_name", "type": "string"},    # denormalized home location
    ],
    "references": [
        {"name": "Location", "cardinality": "one", "back_ref_name": "trainers"},
    ],
}

# Class TYPE / template (yoga, HIIT, spin, strength) — the public catalog card.
FitnessClass = {
    "schema_type": "object",
    "name": "FitnessClass",
    "namespace": "pulsefitness",
    "parent_type": "tenant",
    "description": "A class type or template (yoga, HIIT, spin, strength) with duration, capacity and imagery.",
    "attributes": [
        {"name": "category", "type": "string",
         "values": ["yoga", "hiit", "spin", "strength", "pilates", "boxing", "mobility"]},
        {"name": "intensity", "type": "string",
         "values": ["gentle", "moderate", "intense"]},
        {"name": "duration_minutes", "type": "integer", "mandatory": True},
        {"name": "capacity", "type": "integer", "mandatory": True},
        {"name": "drop_in_price", "type": "float"},
        {"name": "hero_image", "type": "Image"},
        {"name": "gallery", "type": "json"},
        {"name": "is_featured", "type": "boolean"},
    ],
    "references": [
        {"name": "Location", "cardinality": "one", "back_ref_name": "classes"},
    ],
}

# ---------------------------------------------------------------------------
# SCHEDULING + LIFECYCLE
# ---------------------------------------------------------------------------

# A scheduled INSTANCE of a FitnessClass. EXTENDS the booking service so it has the
# mandatory start_time/end_time + a lifecycle (requested -> confirmed -> completed).
ClassSession = {
    "schema_type": "object",
    "name": "ClassSession",
    "namespace": "pulsefitness",
    "parent_type": "tenant",
    "extends": "booking:base_booking",
    "description": "A scheduled instance of a class at a specific time and room, moving through its lifecycle.",
    "attributes": [
        # denormalized display + filters (avoid ref-joins in lists/calendars):
        {"name": "class_name", "type": "string"},
        {"name": "category", "type": "string",
         "values": ["yoga", "hiit", "spin", "strength", "pilates", "boxing", "mobility"]},
        {"name": "trainer_name", "type": "string"},
        {"name": "location_name", "type": "string"},
        {"name": "room", "type": "string"},
        {"name": "capacity", "type": "integer"},
        {"name": "seats_booked", "type": "integer"},
        {"name": "drop_in_price", "type": "float"},
        # base_booking provides status + start_time + end_time (all mandatory on create).
    ],
    "references": [
        {"name": "FitnessClass", "cardinality": "one", "back_ref_name": "sessions"},
        {"name": "Trainer", "cardinality": "one", "back_ref_name": "sessions"},
        {"name": "Location", "cardinality": "one", "back_ref_name": "sessions"},
    ],
}

# A member reserves a seat in a ClassSession. EXTENDS the appointment service
# (requested -> confirmed -> completed/cancelled/no_show). Owner-scoped.
Booking = {
    "schema_type": "object",
    "name": "Booking",
    "namespace": "pulsefitness",
    "parent_type": "tenant",
    "extends": "appointment:base_appointment",
    "description": "A member's reservation for a class session, moving through requested, confirmed, completed.",
    "attributes": [
        # owner isolation (auto-stamped to creator; policy filters reads):
        {"name": "owner_username", "type": "string"},
        # denormalized display + workflow inputs:
        {"name": "member_name", "type": "string"},
        {"name": "member_email", "type": "string"},
        {"name": "member_phone", "type": "string"},
        {"name": "class_name", "type": "string"},
        {"name": "trainer_name", "type": "string"},
        {"name": "location_name", "type": "string"},
        {"name": "price", "type": "float"},
        {"name": "notes", "type": "text"},
        # workflow chip fields (stamped by booking_confirmed):
        {"name": "workflow_status", "type": "string"},
        {"name": "processed_at", "type": "datetime"},
        # base_appointment provides status + start_time + end_time (mandatory on create).
    ],
    "references": [
        {"name": "ClassSession", "cardinality": "one", "back_ref_name": "bookings"},
        {"name": "Member", "cardinality": "one", "back_ref_name": "bookings"},
    ],
}

# A member's gym membership. EXTENDS membership:base_membership (enroll -> active, ...).
Membership = {
    "schema_type": "object",
    "name": "Membership",
    "namespace": "pulsefitness",
    "parent_type": "tenant",
    "extends": "membership:base_membership",
    "description": "A member's Pulse membership with tier and start date, owner-scoped and tenant-scoped.",
    "attributes": [
        {"name": "owner_username", "type": "string"},
        {"name": "member_name", "type": "string"},
        {"name": "tier", "type": "string", "values": ["flex", "unlimited", "elite"]},
        {"name": "monthly_price", "type": "float"},
        {"name": "location_name", "type": "string"},
        {"name": "started_at", "type": "datetime"},
        {"name": "renews_at", "type": "datetime"},
        # base_membership provides status (mandatory).
    ],
    "references": [
        {"name": "Member", "cardinality": "one", "back_ref_name": "memberships"},
    ],
}

# A payment record. EXTENDS payment:base_payment (authorize/capture/refund/...).
Payment = {
    "schema_type": "object",
    "name": "Payment",
    "namespace": "pulsefitness",
    "parent_type": "tenant",
    "extends": "payment:base_payment",
    "description": "A captured or pending payment for a membership or drop-in class, owner-scoped.",
    "attributes": [
        {"name": "owner_username", "type": "string"},
        {"name": "member_name", "type": "string"},
        {"name": "purpose", "type": "string",
         "values": ["membership", "drop_in", "merchandise", "personal_training"]},
        {"name": "location_name", "type": "string"},
        # base_payment provides status + amount + currency (all mandatory).
    ],
    "references": [
        {"name": "Member", "cardinality": "one", "back_ref_name": "payments"},
    ],
}

# ---------------------------------------------------------------------------
# PEOPLE + ATTENDANCE
# ---------------------------------------------------------------------------

# Customer profile — a NORMAL entity linked to identity via user_account_uuid
# (NEVER named "user"/"tenant"; §5 reserved names). Owner-scoped: each member sees
# their own profile; staff see all members in their location tenant.
Member = {
    "schema_type": "object",
    "name": "Member",
    "namespace": "pulsefitness",
    "parent_type": "tenant",
    "description": "A gym member's profile, linked to their login identity for personalization.",
    "attributes": [
        {"name": "owner_username", "type": "string"},
        {"name": "user_account_uuid", "type": "string"},   # sanctioned flat link to identity
        {"name": "full_name", "type": "string"},
        {"name": "email", "type": "string"},
        {"name": "phone", "type": "string"},
        {"name": "photo", "type": "Image"},
        {"name": "membership_tier", "type": "string", "values": ["flex", "unlimited", "elite", "none"]},
        {"name": "join_date", "type": "date"},
        {"name": "location_name", "type": "string"},
        {"name": "goal", "type": "string"},
    ],
    "references": [
        {"name": "Location", "cardinality": "one", "back_ref_name": "members"},
    ],
}

# Attendance event — a member checks in for a session. Simple CRUD (no service base).
CheckIn = {
    "schema_type": "object",
    "name": "CheckIn",
    "namespace": "pulsefitness",
    "parent_type": "tenant",
    "description": "An attendance record stamped when a member checks in to a class session at a location.",
    "attributes": [
        {"name": "owner_username", "type": "string"},
        {"name": "member_name", "type": "string"},
        {"name": "class_name", "type": "string"},
        {"name": "location_name", "type": "string"},
        {"name": "checked_in_at", "type": "datetime"},
        {"name": "method", "type": "string", "values": ["qr", "front_desk", "app"]},
    ],
    "references": [
        {"name": "Member", "cardinality": "one", "back_ref_name": "check_ins"},
        {"name": "ClassSession", "cardinality": "one", "back_ref_name": "check_ins"},
    ],
}

SUPERO_APP_NAMESPACE = "pulsefitness"  # belt-and-suspenders fallback (§5); every dict already carries it.

ALL_SCHEMAS = [
    Location, Trainer, FitnessClass, ClassSession, Booking,
    Membership, Payment, Member, CheckIn,
]

# Public (logged-out) catalog reads — snake_case slugs (§7.9, gotcha #5).
PUBLIC_SCHEMAS = ["location", "trainer", "fitness_class"]
