import sys, os, datetime
sys.path.insert(0, os.path.dirname(__file__))
from supero.app_setup import AppSetup, PolicyDef, PolicyRule, make_seed_record
from config import AppConfig
from schemas import ALL_SCHEMAS, PUBLIC_SCHEMAS, SUPERO_APP_NAMESPACE

seed_record = make_seed_record(SUPERO_APP_NAMESPACE)


def ux(pid, w=900):
    b = "https://images.unsplash.com/photo-" + pid + "?auto=format&fit=crop&q=80"
    return {"url": "%s&w=%d&h=%d" % (b, w, w), "thumbnail_url": "%s&w=500&h=500" % b}


def d(off):
    return (datetime.date.today() + datetime.timedelta(days=off)).isoformat()


# Verified medical / lab / science Unsplash photo IDs (one per trial card).
TRIAL_IMG = [
    "1579154204601-01588f351e67",  # lab researcher
    "1530026405186-ed1f139313f8",  # microscope
    "1581595219315-a187dd40c322",  # pipetting / pharma
    "1582719471384-894fbb16e074",  # vials
    "1532187863486-abf9dbad1b69",  # research lab
    "1559757148-5c350d0d3c56",     # dna / molecular
]

# ── Trials ──────────────────────────────────────────────────────────────────────
# (code, title, phase, area, sponsor, indication, state, target, enrolled, start_off, est_off, desc)
TRIALS = [
    ("ONC-417", "ZephyrX in Advanced Non-Small-Cell Lung Cancer", "Phase III", "Oncology",
     "Helix Therapeutics", "Stage IV NSCLC, EGFR+", "active", 240, 198, -420, 240,
     "A randomized, double-blind, placebo-controlled study of ZephyrX, a next-generation EGFR inhibitor, in previously-treated advanced NSCLC. Primary endpoint: progression-free survival."),
    ("CAR-208", "Cardiprotect After Acute Myocardial Infarction", "Phase II", "Cardiology",
     "Helix Therapeutics", "Post-MI cardioprotection", "recruiting", 160, 92, -120, 300,
     "A multicenter trial evaluating Cardiprotect for reduction of adverse remodeling following first acute MI. Open for enrollment at activated sites."),
    ("NEU-133", "Synaptiq in Early Alzheimer's Disease", "Phase II", "Neurology",
     "Cortex Bio", "Early-stage Alzheimer's", "recruiting", 200, 64, -75, 540,
     "A study of Synaptiq, an anti-amyloid antibody, in patients with mild cognitive impairment due to Alzheimer's disease. Cognitive and biomarker endpoints."),
    ("IMM-091", "Immunova for Moderate-to-Severe Plaque Psoriasis", "Phase III", "Immunology",
     "Aurora Pharma", "Moderate-to-severe psoriasis", "active", 320, 287, -540, 60,
     "A global Phase III program assessing Immunova, an IL-23 inhibitor, against standard of care in chronic plaque psoriasis. Co-primary skin-clearance endpoints."),
    ("END-052", "GlucoBalance in Type 2 Diabetes with Renal Impairment", "Phase IV", "Endocrinology",
     "Aurora Pharma", "Type 2 diabetes, CKD stage 3", "active", 140, 142, -300, 120,
     "A post-marketing safety and efficacy study of GlucoBalance in adults with type 2 diabetes and moderate chronic kidney disease. Fully enrolled, in follow-up."),
    ("RAR-019", "Velocta in Hereditary Angioedema", "Phase I", "Rare Disease",
     "Cortex Bio", "Hereditary angioedema (HAE)", "planning", 48, 0, 30, 420,
     "A first-in-human dose-escalation study of Velocta, a plasma-kallikrein inhibitor, in adults with type I/II hereditary angioedema. Site activation in progress."),
]

# ── Sites ───────────────────────────────────────────────────────────────────────
# (site_name, institution, pi, city, country, state, enrolled, capacity, irb, activation_off)
SITES = [
    ("US-101 Boston", "Massachusetts General Hospital", "Dr. Robert Feldman", "Boston", "USA", "active", 84, 120, True, -400),
    ("US-104 Houston", "MD Anderson Cancer Center", "Dr. Anita Rao", "Houston", "USA", "active", 71, 100, True, -380),
    ("US-112 Cleveland", "Cleveland Clinic", "Dr. Marcus Bell", "Cleveland", "USA", "active", 58, 90, True, -360),
    ("UK-201 London", "Royal Marsden Hospital", "Dr. Eleanor Whitfield", "London", "UK", "active", 47, 80, True, -350),
    ("DE-305 Heidelberg", "Universitätsklinikum Heidelberg", "Dr. Klaus Brenner", "Heidelberg", "Germany", "on_hold", 22, 70, True, -200),
    ("JP-410 Tokyo", "National Cancer Center Japan", "Dr. Yuki Tanaka", "Tokyo", "Japan", "active", 39, 75, True, -260),
    ("CA-118 Toronto", "Princess Margaret Cancer Centre", "Dr. Sophie Tremblay", "Toronto", "Canada", "pending", 0, 60, False, 14),
    ("AU-520 Melbourne", "Peter MacCallum Cancer Centre", "Dr. James Carlisle", "Melbourne", "Australia", "active", 31, 65, True, -180),
]

# ── Participants ──────────────────────────────────────────────────────────────────
# (subject_id, trial_code, site_name, arm, state, enrolled_off, age, sex, last_visit_off)
PARTICIPANTS = [
    ("ONC-0142", "ONC-417", "US-101 Boston", "Treatment", "active", -180, 64, "Male", -7),
    ("ONC-0156", "ONC-417", "US-104 Houston", "Placebo", "active", -160, 58, "Female", -14),
    ("ONC-0173", "ONC-417", "US-112 Cleveland", "Treatment", "completed", -350, 71, "Male", -10),
    ("ONC-0188", "ONC-417", "UK-201 London", "Treatment", "withdrawn", -120, 67, "Female", -45),
    ("ONC-0201", "ONC-417", "JP-410 Tokyo", "Placebo", "active", -90, 60, "Male", -3),
    ("CAR-0044", "CAR-208", "US-101 Boston", "Treatment", "enrolled", -40, 55, "Male", -5),
    ("CAR-0051", "CAR-208", "US-112 Cleveland", "Control", "active", -55, 62, "Female", -12),
    ("CAR-0063", "CAR-208", "AU-520 Melbourne", "Treatment", "screening", -8, 49, "Male", None),
    ("NEU-0021", "NEU-133", "UK-201 London", "Treatment", "active", -60, 73, "Female", -9),
    ("NEU-0029", "NEU-133", "US-104 Houston", "Placebo", "enrolled", -30, 69, "Male", -16),
    ("NEU-0034", "NEU-133", "DE-305 Heidelberg", "Treatment", "screen_failed", -20, 78, "Female", None),
    ("IMM-0210", "IMM-091", "US-101 Boston", "Treatment", "active", -200, 41, "Female", -6),
    ("IMM-0233", "IMM-091", "DE-305 Heidelberg", "Control", "active", -150, 37, "Male", -20),
    ("IMM-0247", "IMM-091", "AU-520 Melbourne", "Treatment", "completed", -300, 52, "Female", -11),
    ("END-0088", "END-052", "US-104 Houston", "Treatment", "active", -210, 66, "Male", -4),
    ("END-0095", "END-052", "JP-410 Tokyo", "Treatment", "active", -190, 59, "Female", -8),
]

# ── Visits ────────────────────────────────────────────────────────────────────────
# (subject_id, trial_code, visit_name, state, scheduled_off, completed_off, notes)
VISITS = [
    ("ONC-0142", "ONC-417", "Week 12", "completed", -7, -7, "All assessments completed. Tumor scan stable. No new toxicities."),
    ("ONC-0142", "ONC-417", "Week 24", "scheduled", 35, None, "Imaging and PK sampling scheduled."),
    ("ONC-0156", "ONC-417", "Week 8", "completed", -14, -14, "Routine labs within range. Drug accountability reconciled."),
    ("ONC-0188", "ONC-417", "Week 12", "missed", -45, None, "Subject did not present; subsequently withdrew consent."),
    ("CAR-0044", "CAR-208", "Baseline", "completed", -40, -40, "Baseline echo and biomarkers collected."),
    ("CAR-0051", "CAR-208", "Week 4", "out_of_window", -28, -22, "Visit completed 6 days outside protocol window; deviation logged."),
    ("CAR-0063", "CAR-208", "Screening", "scheduled", 2, None, "Screening labs and eligibility review pending."),
    ("NEU-0021", "NEU-133", "Week 24", "completed", -9, -9, "Cognitive battery administered. Amyloid PET ordered."),
    ("NEU-0029", "NEU-133", "Baseline", "completed", -16, -16, "MMSE 26. Lumbar puncture biomarker sample obtained."),
    ("IMM-0210", "IMM-091", "Week 12", "completed", -6, -6, "PASI 90 achieved. No injection-site reactions."),
    ("IMM-0233", "IMM-091", "Week 8", "scheduled", 10, None, "Skin assessment and photography scheduled."),
    ("END-0088", "END-052", "Follow-up", "completed", -4, -4, "eGFR stable. HbA1c 7.1%. No hypoglycemic events reported."),
]

# ── Adverse Events ────────────────────────────────────────────────────────────────
# (subject_id, trial_code, site_name, term, severity, serious, state, onset_off, outcome, desc)
ADVERSE_EVENTS = [
    ("ONC-0142", "ONC-417", "US-101 Boston", "Grade 3 neutropenia", "severe", True, "under_review", -12,
     "Recovering with growth-factor support", "Absolute neutrophil count 0.8. Dose held; G-CSF initiated. Expedited safety report filed."),
    ("ONC-0188", "ONC-417", "UK-201 London", "Pneumonitis", "life_threatening", True, "ongoing", -50,
     "Hospitalized, on high-dose steroids", "Suspected immune-related pneumonitis. Treatment permanently discontinued. SAE reported to sponsor and IRB."),
    ("CAR-0051", "CAR-208", "US-112 Cleveland", "Headache", "mild", False, "resolved", -20,
     "Resolved without intervention", "Transient headache following study visit; no action required."),
    ("NEU-0021", "NEU-133", "UK-201 London", "Nausea", "moderate", False, "resolved", -15,
     "Resolved with antiemetic", "Mild-to-moderate nausea after infusion; managed with ondansetron."),
    ("IMM-0210", "IMM-091", "US-101 Boston", "Upper respiratory infection", "mild", False, "resolved", -25,
     "Resolved", "Self-limiting URI, unrelated to study drug per investigator."),
    ("END-0088", "END-052", "US-104 Houston", "Hypoglycemia", "moderate", False, "reported", -3,
     "Under observation", "Symptomatic hypoglycemia (52 mg/dL) after missed meal; subject counseled."),
]

# ── Trial Documents ───────────────────────────────────────────────────────────────
# (title, doc_type, trial_code, state, version, updated_off)
DOCUMENTS = [
    ("ONC-417 Protocol", "Protocol", "ONC-417", "approved", "v4.2", -45),
    ("ONC-417 Informed Consent Form", "ICF", "ONC-417", "approved", "v3.1", -60),
    ("CAR-208 IRB Approval Letter", "IRB Approval", "CAR-208", "approved", "2026-03", -90),
    ("NEU-133 Protocol Amendment 2", "Amendment", "NEU-133", "pending", "v2.0", -10),
    ("IMM-091 Monitoring Visit Report", "Monitoring Report", "IMM-091", "draft", "MVR-07", -5),
    ("ONC-0188 Pneumonitis SAE Report", "SAE Report", "ONC-417", "pending", "v1.0", -48),
]


# ── Access policies ───────────────────────────────────────────────────────────────
# tenant_admin (sponsor / CRA) = full. tenant_user (site coordinator) = reads
# everything operational + creates/updates the data they work with daily. Internal
# enterprise tool — shared-read, no owner-scoping.
POLICIES = [
    # DEMO-ACCOUNT-SCOPE-V1 — this account's address and password are PUBLISHED in
    # this app's README so anyone can try the demo, so it must not also be a
    # skeleton key. It used to be `default_access="full"` with no rules at all:
    # unrestricted read/write/delete over EVERY entity in the domain, not just the
    # 6 this app owns. Now it is scoped to this app's own entities.
    #
    # Delete is granted only where the UI actually offers it, so a visitor cannot
    # destroy the seeded demo data through an operation the app never exposed.
    #
    # Deliberately NOT read-only: these demos turn on being able to create and
    # advance records. Fully read-only demo logins plus self-registration is a
    # separate product decision.
    PolicyDef(role="tenant_admin", default_access="none", rules=[
        PolicyRule(entity="adverse_event", can_read=True, can_create=True, can_update=True),
        PolicyRule(entity="participant", can_read=True, can_create=True, can_update=True),
        PolicyRule(entity="site", can_read=True, can_create=True, can_update=True),
        PolicyRule(entity="trial", can_read=True, can_create=True, can_update=True, can_delete=True),
        PolicyRule(entity="trial_document", can_read=True, can_create=True, can_update=True),
        PolicyRule(entity="visit", can_read=True, can_create=True, can_update=True),
    ]),
    PolicyDef(role="tenant_user", default_access="none", rules=[
        PolicyRule(entity="trial", can_read=True),
        PolicyRule(entity="site", can_read=True),
        PolicyRule(entity="trial_document", can_read=True),
        PolicyRule(entity="participant", can_read=True, can_create=True, can_update=True),
        PolicyRule(entity="visit", can_read=True, can_create=True, can_update=True),
        PolicyRule(entity="adverse_event", can_read=True, can_create=True, can_update=True),
    ]),
]


# ── Workflows ─────────────────────────────────────────────────────────────────────
WORKFLOW_DEFINITIONS = [
    {
        # SAGA: a serious AE escalates — move it to review, alert the safety team by
        # email + Slack. on_error=compensate reverts the state change if a step fails.
        "workflow_id": "ae_escalation", "display_name": "Adverse Event Escalation",
        "description": "Escalates a serious adverse event to the safety team (email + Slack) and moves it under review (saga — reverts the state change on failure).",
        "version": "1.0.0", "enabled": True, "status": "Active", "on_error": "compensate",
        "input_schema": {"adverse_event_uuid": {"type": "string", "required": True},
                         "subject_id": {"type": "string", "required": False},
                         "trial_code": {"type": "string", "required": False},
                         "term": {"type": "string", "required": False},
                         "severity": {"type": "string", "required": False},
                         "safety_email": {"type": "string", "required": False}},
        "steps": [
            {"id": "escalate", "type": "crud_operation", "operation": "update", "object_type": "trialcore:adverse_event",
             "record_uuid": "{{input.adverse_event_uuid}}", "data": {"ae_state": "under_review"},
             "compensate": {"kind": "automatic", "type": "crud_operation", "operation": "update",
                            "object_type": "trialcore:adverse_event", "record_uuid": "{{input.adverse_event_uuid}}",
                            "data": {"ae_state": "reported"}}},
            {"id": "email", "type": "service_call", "service": "email", "operation": "send_email", "on_error": "continue",
             "input_map": {"to_email": "{{input.safety_email}}",
                           "subject": "SAFETY ALERT — serious AE {{input.term}} ({{input.trial_code}} / {{input.subject_id}})",
                           "body_html": "<p>A serious adverse event has been escalated for review.</p><p><b>Trial:</b> {{input.trial_code}}<br><b>Subject:</b> {{input.subject_id}}<br><b>Term:</b> {{input.term}}<br><b>Severity:</b> {{input.severity}}</p><p>Please review in TrialCore and file the expedited safety report if required.</p>"}},
            {"id": "slack", "type": "service_call", "service": "slack", "operation": "send_message", "on_error": "continue",
             "input_map": {"channel": "#safety",
                           "text": ":rotating_light: Serious AE escalated — {{input.term}} ({{input.severity}}) on {{input.trial_code}}, subject {{input.subject_id}}. Now under review in TrialCore."}},
        ],
    },
    {
        # EVENT-BOUND: a new participant is created -> notify the site coordinator.
        "workflow_id": "participant_enrolled", "display_name": "Participant Enrolled Notification",
        "description": "Emails the site coordinator when a new participant is enrolled.",
        "version": "1.0.0", "enabled": True, "status": "Active", "on_error": "continue",
        "input_schema": {"subject_id": {"type": "string", "required": False},
                         "trial_code": {"type": "string", "required": False},
                         "site_name": {"type": "string", "required": False},
                         "coordinator_email": {"type": "string", "required": False}},
        "steps": [
            {"id": "email", "type": "service_call", "service": "email", "operation": "send_email", "on_error": "continue",
             "input_map": {"to_email": "{{input.coordinator_email}}",
                           "subject": "New participant enrolled: {{input.subject_id}} ({{input.trial_code}})",
                           "body_html": "<p>A new participant has been enrolled.</p><p><b>Subject:</b> {{input.subject_id}}<br><b>Trial:</b> {{input.trial_code}}<br><b>Site:</b> {{input.site_name}}</p><p>Please confirm screening visits are scheduled in TrialCore.</p>"}},
        ],
    },
    {
        # TRIGGERABLE: enrollment milestone reached -> email the sponsor.
        "workflow_id": "enrollment_milestone", "display_name": "Enrollment Milestone",
        "description": "Emails the sponsor when a trial reaches an enrollment milestone.",
        "version": "1.0.0", "enabled": True, "status": "Active", "on_error": "continue",
        "input_schema": {"trial_code": {"type": "string", "required": False},
                         "title": {"type": "string", "required": False},
                         "enrolled": {"type": "number", "required": False},
                         "enrollment_target": {"type": "number", "required": False},
                         "sponsor_email": {"type": "string", "required": False}},
        "steps": [
            {"id": "email", "type": "service_call", "service": "email", "operation": "send_email", "on_error": "continue",
             "input_map": {"to_email": "{{input.sponsor_email}}",
                           "subject": "Enrollment milestone — {{input.trial_code}}",
                           "body_html": "<p>Enrollment update for <b>{{input.title}}</b> ({{input.trial_code}}).</p><p>Now at <b>{{input.enrolled}}</b> of {{input.enrollment_target}} target participants. Great progress across activated sites.</p>"}},
        ],
    },
]

EVENT_BINDINGS = [
    {"event": "@create:trialcore:participant", "workflow_id": "participant_enrolled",
     "input_map": {"subject_id": "subject_id", "trial_code": "trial_code", "site_name": "site_name"}},
]


def seed_test_data(s, base, domain, tenant_uuid, progress):
    nt = 0
    for i, t in enumerate(TRIALS):
        code, title, phase, area, sponsor, indication, state, target, enrolled, soff, eoff, desc = t
        rec = {"trial_code": code, "title": title, "phase": phase, "therapeutic_area": area,
               "sponsor": sponsor, "indication": indication, "trial_state": state,
               "enrollment_target": target, "enrolled": enrolled, "start_date": d(soff),
               "est_completion": d(eoff), "description": desc, "image": ux(TRIAL_IMG[i % len(TRIAL_IMG)]),
               "sort_order": i, "display_name": "%s — %s" % (code, title), "description": desc}
        if seed_record(s, base, domain, "Trial", rec, progress=progress, tenant_name="default-tenant"):
            nt += 1
    progress.ok("Seeded %d Trials." % nt)

    nsi = 0
    for (name, inst, pi, city, country, state, enrolled, capacity, irb, aoff) in SITES:
        rec = {"site_name": name, "institution": inst, "pi_name": pi, "city": city, "country": country,
               "site_state": state, "enrolled": enrolled, "capacity": capacity, "irb_approved": irb,
               "display_name": name, "description": "%s · %s, %s" % (inst, city, country)}
        if state != "pending":
            rec["activation_date"] = d(aoff)
        if seed_record(s, base, domain, "Site", rec, progress=progress, tenant_name="default-tenant"):
            nsi += 1
    progress.ok("Seeded %d Sites." % nsi)

    npt = 0
    for (sid, code, site, arm, state, eoff, age, sex, lvoff) in PARTICIPANTS:
        rec = {"subject_id": sid, "trial_code": code, "site_name": site, "arm": arm,
               "participant_state": state, "enrolled_date": d(eoff), "age": age, "sex": sex,
               "display_name": sid, "description": "%s · %s · %s" % (code, arm, state)}
        if lvoff is not None:
            rec["last_visit"] = d(lvoff)
        if seed_record(s, base, domain, "Participant", rec, progress=progress, tenant_name="default-tenant"):
            npt += 1
    progress.ok("Seeded %d Participants." % npt)

    nv = 0
    for (sid, code, vname, state, soff, coff, notes) in VISITS:
        rec = {"subject_id": sid, "trial_code": code, "visit_name": vname, "visit_state": state,
               "scheduled_date": d(soff), "notes": notes,
               "display_name": "%s · %s" % (sid, vname), "description": "%s · %s" % (code, state)}
        if coff is not None:
            rec["completed_date"] = d(coff)
        if seed_record(s, base, domain, "Visit", rec, progress=progress, tenant_name="default-tenant"):
            nv += 1
    progress.ok("Seeded %d Visits." % nv)

    nae = 0
    for (sid, code, site, term, severity, serious, state, onoff, outcome, desc) in ADVERSE_EVENTS:
        rec = {"subject_id": sid, "trial_code": code, "site_name": site, "term": term, "severity": severity,
               "serious": serious, "ae_state": state, "onset_date": d(onoff), "outcome": outcome,
               "description": desc, "display_name": "%s · %s" % (sid, term), "description": desc}
        if seed_record(s, base, domain, "AdverseEvent", rec, progress=progress, tenant_name="default-tenant"):
            nae += 1
    progress.ok("Seeded %d AdverseEvents." % nae)

    nd = 0
    for (title, dtype, code, state, version, uoff) in DOCUMENTS:
        rec = {"title": title, "doc_type": dtype, "trial_code": code, "doc_state": state, "version": version,
               "updated_date": d(uoff), "display_name": title, "description": "%s · %s" % (dtype, version)}
        if seed_record(s, base, domain, "TrialDocument", rec, progress=progress, tenant_name="default-tenant"):
            nd += 1
    progress.ok("Seeded %d TrialDocuments." % nd)


def main():
    setup = AppSetup(AppConfig(), ALL_SCHEMAS, PUBLIC_SCHEMAS)
    setup.run(seed_fn=seed_test_data, policies=POLICIES,
              workflow_definitions=WORKFLOW_DEFINITIONS, event_bindings=EVENT_BINDINGS)


if __name__ == "__main__":
    main()
