# schemas.py — data model for BrightSmile (multi-location dental group).
#
# Plain-CRUD pattern with the key showcase = FIELD-LEVEL RBAC: a patient
# (tenant_user) reads their own appointment but the dentist's `chart_notes`
# and `diagnosis` are server-stripped from their reads (hidden_fields in setup.py).
# Appointment / treatment lifecycles use renamed `*_state` enums (NOT `status`).
# Namespace = "brightsmile" as a PLAIN STRING LITERAL on every schema dict.

NS = "brightsmile"

SPECIALTIES = ["General", "Orthodontics", "Periodontics", "Endodontics",
               "Pediatric", "Oral Surgery", "Cosmetic"]
SERVICE_CATEGORIES = ["Preventive", "Restorative", "Cosmetic",
                      "Orthodontics", "Surgical", "Emergency"]

# A clinic location. PUBLIC — patients browse where to go. Child of tenant.
Location = {
    "schema_type": "object", "name": "Location", "namespace": "brightsmile", "parent_type": "tenant",
    "description": "A BrightSmile clinic location with address, hours and neighborhood.",
    "attributes": [
        {"name": "name", "type": "string", "mandatory": True},
        {"name": "address", "type": "string"},
        {"name": "phone", "type": "string"},
        {"name": "hours", "type": "string"},
        {"name": "neighborhood", "type": "string"},
        {"name": "image", "type": "Image"},
        {"name": "sort_order", "type": "integer"},
    ],
}

# A dentist. PUBLIC — patients browse and choose a provider.
Dentist = {
    "schema_type": "object", "name": "Dentist", "namespace": "brightsmile", "parent_type": "tenant",
    "description": "A BrightSmile dentist patients can browse — specialty, bio, languages and location.",
    "attributes": [
        {"name": "full_name", "type": "string", "mandatory": True},
        {"name": "credential", "type": "string"},          # DDS, DMD
        {"name": "specialty", "type": "string", "values": SPECIALTIES},
        {"name": "bio", "type": "text"},
        {"name": "languages", "type": "string"},
        {"name": "location_name", "type": "string"},
        {"name": "photo", "type": "Image"},
        {"name": "rating", "type": "float"},
        {"name": "accepting_new", "type": "boolean"},
        {"name": "sort_order", "type": "integer"},
    ],
}

# A bookable dental service. PUBLIC.
DentalService = {
    "schema_type": "object", "name": "DentalService", "namespace": "brightsmile", "parent_type": "tenant",
    "description": "A bookable dental service or treatment with category, duration and self-pay price.",
    "attributes": [
        {"name": "service_name", "type": "string", "mandatory": True},
        {"name": "category", "type": "string", "values": SERVICE_CATEGORIES},
        {"name": "price", "type": "float"},
        {"name": "duration_min", "type": "integer"},
        {"name": "description", "type": "text"},
        {"name": "image", "type": "Image"},
        {"name": "sort_order", "type": "integer"},
    ],
}

# A patient profile. Owner-scoped — each patient sees only their own.
Patient = {
    "schema_type": "object", "name": "Patient", "namespace": "brightsmile", "parent_type": "tenant",
    "description": "A patient profile with demographics and insurance, owner-scoped to the patient.",
    "attributes": [
        {"name": "full_name", "type": "string", "mandatory": True},
        {"name": "email", "type": "string", "mandatory": True},
        {"name": "phone", "type": "string"},
        {"name": "dob", "type": "date"},
        {"name": "insurance_provider", "type": "string"},
        {"name": "member_id", "type": "string"},
        {"name": "location_name", "type": "string"},
        {"name": "owner_username", "type": "string"},
        {"name": "user_account_uuid", "type": "string"},
    ],
}

# An appointment. Owner-scoped to the patient; `chart_notes`/`diagnosis` are
# hidden from the patient's reads (field-level RBAC in setup.py) — staff see all.
Appointment = {
    "schema_type": "object", "name": "Appointment", "namespace": "brightsmile", "parent_type": "tenant",
    "description": "A dental visit with dentist, time, reason and (staff-only) chart notes and diagnosis.",
    "attributes": [
        {"name": "patient_name", "type": "string"},
        {"name": "patient_email", "type": "string"},
        {"name": "patient_phone", "type": "string"},
        {"name": "dentist_name", "type": "string"},
        {"name": "service_name", "type": "string"},
        {"name": "location_name", "type": "string"},
        {"name": "start_time", "type": "datetime", "mandatory": True},
        {"name": "end_time", "type": "datetime"},
        {"name": "appt_state", "type": "string", "mandatory": True,
         "values": ["requested", "confirmed", "completed", "cancelled", "no_show"]},
        {"name": "reason", "type": "text"},
        # Staff-only (hidden from patient reads):
        {"name": "chart_notes", "type": "text"},
        {"name": "diagnosis", "type": "string"},
        {"name": "owner_username", "type": "string"},
        {"name": "reminded_at", "type": "datetime"},
    ],
    "validations": [
        {"id": "end-after-start", "when": {"!=": [{"var": "end_time"}, None]},
         "assert": {">=": [{"var": "end_time"}, {"var": "start_time"}]},
         "message": "End time must be on or after start time.", "severity": "error"},
    ],
}

# A proposed / accepted treatment item. Owner-scoped to the patient.
Treatment = {
    "schema_type": "object", "name": "Treatment", "namespace": "brightsmile", "parent_type": "tenant",
    "description": "A treatment-plan line item the patient can review and accept.",
    "attributes": [
        {"name": "name", "type": "string", "mandatory": True},
        {"name": "category", "type": "string", "values": SERVICE_CATEGORIES},
        {"name": "tooth", "type": "string"},
        {"name": "cost", "type": "float"},
        {"name": "treatment_state", "type": "string", "mandatory": True,
         "values": ["proposed", "accepted", "in_progress", "completed"]},
        {"name": "patient_email", "type": "string"},
        {"name": "dentist_name", "type": "string"},
        {"name": "notes", "type": "text"},
        {"name": "owner_username", "type": "string"},
    ],
}

ALL_SCHEMAS = [Location, Dentist, DentalService, Patient, Appointment, Treatment]
PUBLIC_SCHEMAS = ["dental_service", "dentist", "location"]
SUPERO_APP_NAMESPACE = "brightsmile"
