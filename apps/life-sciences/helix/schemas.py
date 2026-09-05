# NAMESPACE-LITERAL-ONLY-V1: namespace is a plain string literal on every schema dict — no variable, no env read.
#
# HELIX — Clinical Trial Management System (multi-tenant; each tenant is a clinical site).
# Data model: Study (trial) → Participant (subject) → Visit (appointment) / AdverseEvent.
# Site (clinical site) and StaffProfile (identity link) round out the model.

# A clinical trial / study. Top-level browse entity → parent_type "tenant".
Study = {
    "schema_type": "object", "name": "Study", "namespace": "helixclinicalns",
    "parent_type": "tenant",
    "description": "A clinical trial protocol with phase, therapeutic area, sponsor and enrollment target.",
    "attributes": [
        {"name": "protocol_number", "type": "string", "mandatory": True},
        {"name": "phase", "type": "string", "values": ["I", "II", "III", "IV"]},
        {"name": "therapeutic_area", "type": "string"},
        {"name": "status", "type": "string", "values": ["planning", "recruiting", "active", "completed"]},
        {"name": "target_enrollment", "type": "integer"},
        {"name": "sponsor", "type": "string"},
        {"name": "hero_image", "type": "Image"},
    ],
}

# A clinical site. Top-level browse entity.
Site = {
    "schema_type": "object", "name": "Site", "namespace": "helixclinicalns",
    "parent_type": "tenant",
    "description": "A clinical research site with location, principal investigator, bed capacity and status.",
    "attributes": [
        {"name": "location", "type": "string"},
        {"name": "principal_investigator", "type": "string"},
        {"name": "beds", "type": "integer"},
        {"name": "status", "type": "string", "values": ["planning", "active", "closed"]},
        {"name": "site_image", "type": "Image"},
    ],
}

# An enrolled subject. A DATA record (NOT a login). Links identity via user_account_uuid.
# References Study + Site. Private "my participants" scoping via owner_username.
Participant = {
    "schema_type": "object", "name": "Participant", "namespace": "helixclinicalns",
    "parent_type": "tenant",
    "description": "An enrolled trial subject with subject id, arm, status and enrollment date.",
    "attributes": [
        {"name": "subject_id", "type": "string", "mandatory": True},
        {"name": "status", "type": "string",
         "values": ["screening", "enrolled", "active", "withdrawn", "completed"]},
        {"name": "arm", "type": "string", "values": ["treatment", "placebo"]},
        {"name": "enrolled_on", "type": "date"},
        {"name": "owner_username", "type": "string"},
        {"name": "user_account_uuid", "type": "string"},
    ],
    "references": [
        {"name": "Study", "cardinality": "one", "back_ref_name": "participants"},
        {"name": "Site", "cardinality": "one", "back_ref_name": "participants"},
    ],
}

# A scheduled study visit. EXTENDS appointment:base_appointment — so every create/seed MUST set
# status (initial "requested"), start_time and end_time (ISO datetimes). References Participant.
# Workflow-bearing → declares workflow_status + processed_at.
Visit = {
    "schema_type": "object", "name": "Visit", "namespace": "helixclinicalns",
    "parent_type": "tenant", "extends": "appointment:base_appointment",
    "description": "A scheduled study visit for a participant, driven through the appointment lifecycle.",
    "attributes": [
        {"name": "visit_type", "type": "string",
         "values": ["screening", "baseline", "followup", "final"]},
        {"name": "visit_window", "type": "string"},
        {"name": "notes", "type": "text"},
        {"name": "owner_username", "type": "string"},
        # workflow chip fields:
        {"name": "workflow_status", "type": "string"},
        {"name": "processed_at", "type": "datetime"},
    ],
    "references": [
        {"name": "Participant", "cardinality": "one", "back_ref_name": "visits"},
    ],
}

# An adverse event reported against a participant. Triggers the serious_ae_reported workflow
# when is_serious. Workflow-bearing → declares workflow_status + processed_at.
AdverseEvent = {
    "schema_type": "object", "name": "AdverseEvent", "namespace": "helixclinicalns",
    "parent_type": "tenant",
    "description": "A reported adverse event with severity, onset, outcome and seriousness flag.",
    "attributes": [
        {"name": "severity", "type": "string", "values": ["mild", "moderate", "severe", "serious"]},
        {"name": "description", "type": "text", "mandatory": True},
        {"name": "onset", "type": "date"},
        {"name": "outcome", "type": "string"},
        {"name": "is_serious", "type": "boolean"},
        {"name": "owner_username", "type": "string"},
        # workflow chip fields:
        {"name": "workflow_status", "type": "string"},
        {"name": "processed_at", "type": "datetime"},
    ],
    "references": [
        {"name": "Participant", "cardinality": "one", "back_ref_name": "adverse_events"},
    ],
}

# An investigator / staff profile. App-person entity → links identity via user_account_uuid.
StaffProfile = {
    "schema_type": "object", "name": "StaffProfile", "namespace": "helixclinicalns",
    "parent_type": "tenant",
    "description": "A site investigator or coordinator profile linked to a login identity.",
    "attributes": [
        {"name": "role_title", "type": "string"},
        {"name": "credentials", "type": "string"},
        {"name": "specialty", "type": "string"},
        {"name": "user_account_uuid", "type": "string"},
    ],
    "references": [
        {"name": "Site", "cardinality": "one", "back_ref_name": "staff"},
    ],
}

SUPERO_APP_NAMESPACE = "helixclinicalns"  # belt-and-suspenders: lets any SDK version resolve the namespace

ALL_SCHEMAS = [Study, Site, Participant, Visit, AdverseEvent, StaffProfile]
PUBLIC_SCHEMAS = []   # clinical data is never public
