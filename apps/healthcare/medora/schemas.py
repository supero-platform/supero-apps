# schemas.py — MEDORA: a multi-tenant chain of hospitals/clinics with a
# patient <-> doctor portal. Each hospital/clinic is a Supero TENANT.
# NAMESPACE-LITERAL-ONLY-V1: namespace is a plain string literal ("medorahealth")
# on every schema dict — no variable, no env read (SKILLS.md §5).
#
# Deliberate, in-contract choices (SKILLS.md is the contract):
#  - Doctor / Department are PUBLIC (logged-out "find care"); everything clinical
#    (Patient, Appointment, Encounter, Prescription, LabResult, Invoice) is NOT
#    public — sensitive health data is gated behind auth + owner-scoped RBAC (§6).
#  - Patient is a NORMAL entity carrying a flat `user_account_uuid` link to the
#    login identity (NEVER named "user"/"tenant" — reserved, §5). Owner-scoped so
#    a patient sees only THEIR profile.
#  - Appointment EXTENDS the transactional `appointment` service base (§5 + §13):
#    it inherits status + start_time + end_time (mandatory) and the lifecycle
#    requested -> confirmed -> completed / cancelled / no_show. It also denormalizes
#    doctor_name / department_name / patient_name so lists, the day-board kanban,
#    the dashboard rollups, and the confirmation workflow render with zero joins.
#    The real Doctor/Department/Patient refs are still linked.
#  - Invoice EXTENDS the transactional `payment` service base (status + amount +
#    currency mandatory). LabResult / Encounter / Prescription are normal schemas.
#  - `specialties` / `tags` are typed `json` (a documented scalar) holding arrays;
#    the spec has Image/File but no list-of-Image type, so json models a collection.

NS = "medorahealth"  # comment anchor only; every dict below carries the literal.

# ---------------------------------------------------------------------------
# PUBLIC catalog: Department (specialty) + Doctor (provider).
# ---------------------------------------------------------------------------
Department = {
    "schema_type": "object",
    "name": "Department",
    "namespace": "medorahealth",
    "parent_type": "tenant",
    "description": "A clinical specialty or department patients can browse and book within.",
    "attributes": [
        {"name": "specialty_code", "type": "string"},
        {"name": "summary", "type": "text"},
        {"name": "hero_image", "type": "Image"},
        {"name": "icon", "type": "string"},          # emoji glyph for cards
        {"name": "is_featured", "type": "boolean"},
    ],
}

Doctor = {
    "schema_type": "object",
    "name": "Doctor",
    "namespace": "medorahealth",
    "parent_type": "tenant",
    "description": "A provider shown on the public find-care site: name, specialty, bio and portrait.",
    "attributes": [
        {"name": "specialty", "type": "string", "mandatory": True},
        {"name": "title", "type": "string"},          # e.g. "MD, FACC"
        {"name": "bio", "type": "text"},
        {"name": "photo", "type": "Image"},
        {"name": "languages", "type": "json"},         # ["English", "Spanish"]
        {"name": "years_experience", "type": "integer"},
        {"name": "accepting_patients", "type": "boolean"},
        {"name": "consult_fee", "type": "float"},
    ],
    "references": [
        {"name": "Department", "cardinality": "one", "back_ref_name": "doctors"},
    ],
}

# ---------------------------------------------------------------------------
# Patient — app-specific person linked to identity via user_account_uuid (§5).
# Owner-scoped: each patient sees only their own profile.
# ---------------------------------------------------------------------------
Patient = {
    "schema_type": "object",
    "name": "Patient",
    "namespace": "medorahealth",
    "parent_type": "tenant",
    "description": "A patient profile linked to a login identity, owner-scoped for privacy.",
    "attributes": [
        {"name": "owner_username", "type": "string"},        # auto-stamped to creator
        {"name": "user_account_uuid", "type": "string"},     # sanctioned flat link to identity (§5)
        {"name": "full_name", "type": "string"},
        {"name": "email", "type": "string"},
        {"name": "phone", "type": "string"},
        {"name": "date_of_birth", "type": "date"},
        {"name": "sex", "type": "string", "values": ["female", "male", "other", "undisclosed"]},
        {"name": "blood_type", "type": "string",
         "values": ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "unknown"]},
        {"name": "allergies", "type": "text"},
        {"name": "insurance_provider", "type": "string"},
        {"name": "mrn", "type": "string"},                   # medical record number
    ],
}

# ---------------------------------------------------------------------------
# Appointment — EXTENDS the transactional `appointment` service.
# Lifecycle: requested -> confirmed -> completed / cancelled / no_show.
# Inherits MANDATORY status + start_time + end_time (§5 "extends", §13).
# ---------------------------------------------------------------------------
Appointment = {
    "schema_type": "object",
    "name": "Appointment",
    "namespace": "medorahealth",
    "parent_type": "tenant",
    "extends": "appointment:base_appointment",
    "description": "A patient visit moving through its lifecycle: requested, confirmed, completed.",
    "attributes": [
        {"name": "owner_username", "type": "string"},        # owner isolation (patient)
        # denormalized display + workflow inputs (zero-join rendering):
        {"name": "patient_name", "type": "string"},
        {"name": "patient_email", "type": "string"},
        {"name": "patient_phone", "type": "string"},
        {"name": "doctor_name", "type": "string"},
        {"name": "department_name", "type": "string"},
        {"name": "reason", "type": "text"},                  # chief complaint
        {"name": "visit_type", "type": "string",
         "values": ["in_person", "telehealth"]},
        {"name": "scheduled_at", "type": "datetime"},        # friendly display copy of start_time
        # workflow chip fields (stamped by appointment_confirmed, §6):
        {"name": "workflow_status", "type": "string"},
        {"name": "processed_at", "type": "datetime"},
    ],
    "references": [
        {"name": "Doctor", "cardinality": "one", "back_ref_name": "appointments"},
        {"name": "Department", "cardinality": "one", "back_ref_name": "appointments"},
        {"name": "Patient", "cardinality": "one", "back_ref_name": "appointments"},
    ],
}

# ---------------------------------------------------------------------------
# Encounter / Visit — clinical note for a COMPLETED appointment.
# Owner-scoped to the patient; staff (tenant_admin) have full access.
# ---------------------------------------------------------------------------
Encounter = {
    "schema_type": "object",
    "name": "Encounter",
    "namespace": "medorahealth",
    "parent_type": "tenant",
    "description": "A clinical visit note recorded by a doctor after a completed appointment.",
    "attributes": [
        {"name": "owner_username", "type": "string"},
        {"name": "patient_name", "type": "string"},
        {"name": "doctor_name", "type": "string"},
        {"name": "department_name", "type": "string"},
        {"name": "visit_date", "type": "datetime"},
        {"name": "chief_complaint", "type": "string"},
        {"name": "assessment", "type": "text"},
        {"name": "plan", "type": "text"},
        {"name": "vitals_bp", "type": "string"},             # e.g. "120/80"
        {"name": "vitals_hr", "type": "integer"},            # bpm
        {"name": "follow_up_days", "type": "integer"},
    ],
    "references": [
        {"name": "Patient", "cardinality": "one", "back_ref_name": "encounters"},
        {"name": "Doctor", "cardinality": "one", "back_ref_name": "encounters"},
        {"name": "Appointment", "cardinality": "one", "back_ref_name": "encounter"},
    ],
}

# ---------------------------------------------------------------------------
# Prescription — medication order tied to a patient (owner-scoped).
# ---------------------------------------------------------------------------
Prescription = {
    "schema_type": "object",
    "name": "Prescription",
    "namespace": "medorahealth",
    "parent_type": "tenant",
    "description": "A medication order with dosage and refills, issued to a patient by a doctor.",
    "attributes": [
        {"name": "owner_username", "type": "string"},
        {"name": "patient_name", "type": "string"},
        {"name": "doctor_name", "type": "string"},
        {"name": "drug_name", "type": "string", "mandatory": True},
        {"name": "dosage", "type": "string"},                # "500 mg"
        {"name": "frequency", "type": "string"},             # "twice daily"
        {"name": "duration_days", "type": "integer"},
        {"name": "refills", "type": "integer"},
        {"name": "status", "type": "string",
         "values": ["active", "completed", "discontinued"]},
        {"name": "instructions", "type": "text"},
        {"name": "issued_at", "type": "datetime"},
    ],
    "references": [
        {"name": "Patient", "cardinality": "one", "back_ref_name": "prescriptions"},
        {"name": "Doctor", "cardinality": "one", "back_ref_name": "prescriptions"},
    ],
}

# ---------------------------------------------------------------------------
# LabResult — diagnostic result for a patient (owner-scoped).
# ---------------------------------------------------------------------------
LabResult = {
    "schema_type": "object",
    "name": "LabResult",
    "namespace": "medorahealth",
    "parent_type": "tenant",
    "description": "A diagnostic lab result for a patient with value, range and flag status.",
    "attributes": [
        {"name": "owner_username", "type": "string"},
        {"name": "patient_name", "type": "string"},
        {"name": "panel", "type": "string"},                 # "Lipid Panel"
        {"name": "test_name", "type": "string", "mandatory": True},
        {"name": "value", "type": "string"},
        {"name": "unit", "type": "string"},
        {"name": "reference_range", "type": "string"},
        {"name": "flag", "type": "string",
         "values": ["normal", "low", "high", "critical"]},
        {"name": "report", "type": "File"},
        {"name": "collected_at", "type": "datetime"},
    ],
    "references": [
        {"name": "Patient", "cardinality": "one", "back_ref_name": "lab_results"},
    ],
}

# ---------------------------------------------------------------------------
# Invoice — EXTENDS the transactional `payment` service.
# Inherits MANDATORY status + amount + currency (§5 "extends", §13).
# Owner-scoped to the patient; staff manage billing.
# ---------------------------------------------------------------------------
Invoice = {
    "schema_type": "object",
    "name": "Invoice",
    "namespace": "medorahealth",
    "parent_type": "tenant",
    "extends": "payment:base_payment",
    "description": "A patient bill moving through payment lifecycle: pending, authorized, captured.",
    "attributes": [
        {"name": "owner_username", "type": "string"},
        {"name": "patient_name", "type": "string"},
        {"name": "service_summary", "type": "string"},       # "Cardiology consult"
        {"name": "due_date", "type": "date"},
        {"name": "issued_at", "type": "datetime"},
    ],
    "references": [
        {"name": "Patient", "cardinality": "one", "back_ref_name": "invoices"},
        {"name": "Appointment", "cardinality": "one", "back_ref_name": "invoice"},
    ],
}

# belt-and-suspenders fallback so any (even old/pinned) SDK resolves the app
# namespace; the real source of truth is each dict's literal "namespace" (§5).
SUPERO_APP_NAMESPACE = "medorahealth"

ALL_SCHEMAS = [
    Department, Doctor, Patient, Appointment,
    Encounter, Prescription, LabResult, Invoice,
]

# PUBLIC_SCHEMAS are snake_case slugs; only the non-sensitive catalog is public.
# Clinical records (patient, appointment, encounter, prescription, lab_result,
# invoice) are NEVER public.
PUBLIC_SCHEMAS = ["department", "doctor"]
