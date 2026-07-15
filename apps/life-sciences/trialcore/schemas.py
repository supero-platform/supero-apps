# schemas.py — data model for TrialCore (enterprise multi-site CTMS).
#
# Plain-CRUD enterprise tool. Every lifecycle field is renamed `<x>_state` (NEVER
# `status`/`state`, which the platform strips from non-admin writes). Namespace
# "trialcore" is a PLAIN STRING LITERAL on every schema dict. No owner-scoping:
# this is an internal enterprise tool where site staff share read on operational
# data — RBAC is entity-level (see setup.py POLICIES).

NS = "trialcore"

PHASES = ["Phase I", "Phase II", "Phase III", "Phase IV"]
THERAPEUTIC_AREAS = ["Oncology", "Cardiology", "Neurology", "Immunology",
                     "Endocrinology", "Infectious Disease", "Respiratory", "Rare Disease"]

# A clinical trial / protocol. PUBLIC — patients browse recruiting studies.
Trial = {
    "schema_type": "object", "name": "Trial", "namespace": "trialcore", "parent_type": "tenant",
    "description": "A clinical trial protocol — phase, therapeutic area, sponsor, enrollment target and lifecycle state.",
    "attributes": [
        {"name": "trial_code", "type": "string", "mandatory": True},
        {"name": "title", "type": "string", "mandatory": True},
        {"name": "phase", "type": "string", "values": PHASES},
        {"name": "therapeutic_area", "type": "string", "values": THERAPEUTIC_AREAS},
        {"name": "sponsor", "type": "string"},
        {"name": "indication", "type": "string"},
        {"name": "trial_state", "type": "string", "mandatory": True,
         "values": ["planning", "recruiting", "active", "paused", "completed", "terminated"]},
        {"name": "enrollment_target", "type": "integer"},
        {"name": "enrolled", "type": "integer"},
        {"name": "start_date", "type": "date"},
        {"name": "est_completion", "type": "date"},
        {"name": "description", "type": "text"},
        {"name": "image", "type": "Image"},
        {"name": "sort_order", "type": "integer"},
    ],
}

# A participating clinical site / institution.
Site = {
    "schema_type": "object", "name": "Site", "namespace": "trialcore", "parent_type": "tenant",
    "description": "A participating clinical site — institution, principal investigator, capacity and activation state.",
    "attributes": [
        {"name": "site_name", "type": "string", "mandatory": True},
        {"name": "institution", "type": "string"},
        {"name": "pi_name", "type": "string"},
        {"name": "city", "type": "string"},
        {"name": "country", "type": "string"},
        {"name": "site_state", "type": "string", "mandatory": True,
         "values": ["pending", "active", "on_hold", "closed"]},
        {"name": "enrolled", "type": "integer"},
        {"name": "capacity", "type": "integer"},
        {"name": "irb_approved", "type": "boolean"},
        {"name": "activation_date", "type": "date"},
    ],
}

# An enrolled study participant / subject.
Participant = {
    "schema_type": "object", "name": "Participant", "namespace": "trialcore", "parent_type": "tenant",
    "description": "A study participant — subject id, trial, site, treatment arm and enrollment lifecycle state.",
    "attributes": [
        {"name": "subject_id", "type": "string", "mandatory": True},
        {"name": "trial_code", "type": "string"},
        {"name": "site_name", "type": "string"},
        {"name": "arm", "type": "string", "values": ["Treatment", "Control", "Placebo"]},
        {"name": "participant_state", "type": "string", "mandatory": True,
         "values": ["screening", "enrolled", "active", "completed", "withdrawn", "screen_failed"]},
        {"name": "enrolled_date", "type": "date"},
        {"name": "age", "type": "integer"},
        {"name": "sex", "type": "string", "values": ["Female", "Male", "Other"]},
        {"name": "last_visit", "type": "date"},
    ],
}

# A scheduled study visit for a participant.
Visit = {
    "schema_type": "object", "name": "Visit", "namespace": "trialcore", "parent_type": "tenant",
    "description": "A scheduled study visit — visit window, schedule and completion state for a participant.",
    "attributes": [
        {"name": "subject_id", "type": "string"},
        {"name": "trial_code", "type": "string"},
        {"name": "visit_name", "type": "string",
         "values": ["Screening", "Baseline", "Week 4", "Week 8", "Week 12", "Week 24", "Follow-up"]},
        {"name": "visit_state", "type": "string", "mandatory": True,
         "values": ["scheduled", "completed", "missed", "out_of_window"]},
        {"name": "scheduled_date", "type": "date"},
        {"name": "completed_date", "type": "date"},
        {"name": "notes", "type": "text"},
    ],
}

# An adverse event report. ae_escalation saga fires for serious events.
AdverseEvent = {
    "schema_type": "object", "name": "AdverseEvent", "namespace": "trialcore", "parent_type": "tenant",
    "description": "An adverse event report — term, severity, serious flag and review lifecycle state.",
    "attributes": [
        {"name": "subject_id", "type": "string"},
        {"name": "trial_code", "type": "string"},
        {"name": "site_name", "type": "string"},
        {"name": "term", "type": "string"},
        {"name": "severity", "type": "string", "values": ["mild", "moderate", "severe", "life_threatening"]},
        {"name": "serious", "type": "boolean"},
        {"name": "ae_state", "type": "string", "mandatory": True,
         "values": ["reported", "under_review", "resolved", "ongoing"]},
        {"name": "onset_date", "type": "date"},
        {"name": "outcome", "type": "string"},
        {"name": "description", "type": "text"},
    ],
}

# A regulatory document in the trial master file binder.
TrialDocument = {
    "schema_type": "object", "name": "TrialDocument", "namespace": "trialcore", "parent_type": "tenant",
    "description": "A regulatory document in the trial master file — type, version and approval lifecycle state.",
    "attributes": [
        {"name": "title", "type": "string", "mandatory": True},
        {"name": "doc_type", "type": "string",
         "values": ["Protocol", "ICF", "IRB Approval", "Monitoring Report", "SAE Report", "Amendment"]},
        {"name": "trial_code", "type": "string"},
        {"name": "doc_state", "type": "string", "mandatory": True,
         "values": ["draft", "pending", "approved", "expired"]},
        {"name": "version", "type": "string"},
        {"name": "updated_date", "type": "date"},
    ],
}

ALL_SCHEMAS = [Trial, Site, Participant, Visit, AdverseEvent, TrialDocument]
PUBLIC_SCHEMAS = ["trial"]
SUPERO_APP_NAMESPACE = "trialcore"
