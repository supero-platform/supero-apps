# schemas.py — data model for Lumen Health (multi-specialty clinic platform)
#
# Plain-CRUD pattern with the key showcase = FIELD-LEVEL RBAC: a patient
# (tenant_user) reads their own appointment but the provider's `clinical_notes`
# and `diagnosis` are server-stripped from their reads (hidden_fields in setup.py).
# Appointment lifecycle uses a renamed `appt_state` enum (NOT `status`).

NS = "lumen"

SPECIALTIES = ["Primary Care", "Cardiology", "Dermatology", "Pediatrics",
               "Orthopedics", "Mental Health", "Women's Health", "Dental"]
DOC_TYPES = ["Consent Form", "Visit Summary", "Lab Result", "Insurance"]

# A clinician. PUBLIC — patients browse and choose a provider.
Provider = {
    "schema_type": "object", "name": "Provider", "namespace": "lumen", "parent_type": "tenant",
    "description": "A clinician patients can browse and book — specialty, bio, languages and availability.",
    "attributes": [
        {"name": "full_name", "type": "string", "mandatory": True},
        {"name": "credential", "type": "string"},          # MD, DO, NP, DDS
        {"name": "specialty", "type": "string", "values": SPECIALTIES},
        {"name": "bio", "type": "text"},
        {"name": "languages", "type": "string"},
        {"name": "years_experience", "type": "integer"},
        {"name": "accepting_new", "type": "boolean"},
        {"name": "photo", "type": "Image"},
        {"name": "rating", "type": "float"},
        {"name": "sort_order", "type": "integer"},
    ],
}

# A clinical service / visit type. PUBLIC.
ClinicService = {
    "schema_type": "object", "name": "ClinicService", "namespace": "lumen", "parent_type": "tenant",
    "description": "A bookable clinical service or visit type with specialty, duration and self-pay price.",
    "attributes": [
        {"name": "service_name", "type": "string", "mandatory": True},
        {"name": "specialty", "type": "string", "values": SPECIALTIES},
        {"name": "duration_min", "type": "integer"},
        {"name": "self_pay_price", "type": "float"},
        {"name": "description", "type": "text"},
        {"name": "image", "type": "Image"},
        {"name": "telehealth", "type": "boolean"},
        {"name": "sort_order", "type": "integer"},
    ],
}

# A patient profile. Owner-scoped — each patient sees only their own.
Patient = {
    "schema_type": "object", "name": "Patient", "namespace": "lumen", "parent_type": "tenant",
    "description": "A patient profile with demographics and insurance, owner-scoped to the patient.",
    "attributes": [
        {"name": "full_name", "type": "string", "mandatory": True},
        {"name": "email", "type": "string", "mandatory": True},
        {"name": "phone", "type": "string"},
        {"name": "dob", "type": "date"},
        {"name": "sex", "type": "string", "values": ["Female", "Male", "Other", "Prefer not to say"]},
        {"name": "insurance_provider", "type": "string"},
        {"name": "member_id", "type": "string"},
        {"name": "allergies", "type": "string"},
        {"name": "owner_username", "type": "string"},
        {"name": "user_account_uuid", "type": "string"},
    ],
}

# An appointment. Owner-scoped to the patient; `clinical_notes`/`diagnosis` are
# hidden from the patient's reads (field-level RBAC in setup.py) — staff see all.
Appointment = {
    "schema_type": "object", "name": "Appointment", "namespace": "lumen", "parent_type": "tenant",
    "description": "A patient visit with provider, time, reason and (staff-only) clinical notes and diagnosis.",
    "attributes": [
        {"name": "patient_name", "type": "string"},
        {"name": "patient_email", "type": "string"},
        {"name": "patient_phone", "type": "string"},
        {"name": "provider_name", "type": "string"},
        {"name": "service_name", "type": "string"},
        {"name": "specialty", "type": "string", "values": SPECIALTIES},
        {"name": "start_time", "type": "datetime", "mandatory": True},
        {"name": "end_time", "type": "datetime"},
        {"name": "appt_state", "type": "string", "mandatory": True,
         "values": ["requested", "confirmed", "completed", "cancelled", "no_show"]},
        {"name": "visit_type", "type": "string", "values": ["In-person", "Telehealth"]},
        {"name": "reason", "type": "text"},
        {"name": "location", "type": "string"},
        {"name": "room", "type": "string"},
        # Staff-only (hidden from patient reads):
        {"name": "clinical_notes", "type": "text"},
        {"name": "diagnosis", "type": "string"},
        {"name": "internal_billing_code", "type": "string"},
        {"name": "owner_username", "type": "string"},
        {"name": "reminded_at", "type": "datetime"},
    ],
    "validations": [
        {"id": "end-after-start", "when": {"!=": [{"var": "end_time"}, None]},
         "assert": {">=": [{"var": "end_time"}, {"var": "start_time"}]},
         "message": "End time must be on or after start time.", "severity": "error"},
    ],
}

# A patient document (consent / summary / lab). Owner-scoped; e-sign via doc_state.
Document = {
    "schema_type": "object", "name": "Document", "namespace": "lumen", "parent_type": "tenant",
    "description": "A patient document such as a consent form or visit summary, signed via a lifecycle state.",
    "attributes": [
        {"name": "title", "type": "string", "mandatory": True},
        {"name": "doc_type", "type": "string", "values": DOC_TYPES},
        {"name": "doc_state", "type": "string", "mandatory": True,
         "values": ["pending", "signed", "completed"]},
        {"name": "patient_email", "type": "string"},
        {"name": "provider_name", "type": "string"},
        {"name": "body", "type": "text"},
        {"name": "signed_at", "type": "datetime"},
        {"name": "owner_username", "type": "string"},
    ],
}

ALL_SCHEMAS = [Provider, ClinicService, Patient, Appointment, Document]
PUBLIC_SCHEMAS = ["provider", "clinic_service"]
SUPERO_APP_NAMESPACE = "lumen"
