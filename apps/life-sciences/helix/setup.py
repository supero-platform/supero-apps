import sys, os, datetime
sys.path.insert(0, os.path.dirname(__file__))
from supero.app_setup import AppSetup, PolicyDef, PolicyRule, make_seed_record, ref_link
from config import AppConfig
from schemas import ALL_SCHEMAS, PUBLIC_SCHEMAS

seed_record = make_seed_record(ALL_SCHEMAS)   # MUST be module-level

# Namespace literal — matches every schema dict in schemas.py. Used for ref_link and workflow object_type.
NS = "helixclinicalns"

# ---------------------------------------------------------------------------
# Image helper — curated, verified-200 Unsplash CDN images (never picsum).
# ---------------------------------------------------------------------------
def ux(pid, w=1600, h=1100):
    base = "https://images.unsplash.com/photo-" + pid + "?auto=format&fit=crop&q=80"
    return {"url": "%s&w=%d&h=%d" % (base, w, h), "thumbnail_url": "%s&w=800&h=600" % base}


# ---------------------------------------------------------------------------
# RBAC — tenant_admin full; tenant_user (investigators) read studies/sites,
# manage participants/visits/AEs team-shared within their tenant. Fail-closed.
# Team-shared within a tenant => grant read/create/update without owner filtering
# (tenant isolation already scopes the data to the user's site).
# ---------------------------------------------------------------------------
POLICIES = [
    # DEMO-ACCOUNT-SCOPE-V1 — these logins are published so anyone can try the demo,
    # so they must not double as a skeleton key over every entity in the domain.
    # Scoped to this app's own entities. Delete is withheld: no screen offers it, so
    # a visitor cannot destroy the records other visitors are reading.
    PolicyDef(role="tenant_admin", default_access="none", rules=[
        PolicyRule(entity="study", can_read=True, can_create=True, can_update=True),
        PolicyRule(entity="site", can_read=True, can_create=True, can_update=True),
        PolicyRule(entity="participant", can_read=True, can_create=True, can_update=True),
        PolicyRule(entity="visit", can_read=True, can_create=True, can_update=True),
        PolicyRule(entity="adverse_event", can_read=True, can_create=True, can_update=True),
        PolicyRule(entity="staff_profile", can_read=True, can_create=True, can_update=True),
    ]),
    PolicyDef(role="tenant_user", default_access="none", rules=[
        # Read-only reference data:
        PolicyRule(entity="study", can_read=True),
        PolicyRule(entity="site", can_read=True),
        PolicyRule(entity="staff_profile", can_read=True),
        # Team-shared clinical data — investigators manage these within their site (tenant):
        # BLINDING-V1 — the treatment `arm` is the one field a blinded investigator
        # must never see. In this app tenant_user IS the investigator, so the server
        # strips `arm` from their reads while the unblinded coordinator
        # (tenant_admin) sees it. Blinding enforced in the data layer rather than by
        # asking the UI not to render a column — which is what field-level access
        # control is actually for.
        PolicyRule(entity="participant", can_read=True, can_create=True, can_update=True,
                   hidden_fields=["arm"]),
        PolicyRule(entity="visit", can_read=True, can_create=True, can_update=True),
        PolicyRule(entity="adverse_event", can_read=True, can_create=True, can_update=True),
    ]),
]

# ---------------------------------------------------------------------------
# Workflow — serious_ae_reported: email the safety team, then stamp the AE
# record workflow_status=processed / processed_at. object_type NS-qualified.
# Email step on_error: continue so a flaky integration can't break the stamp.
# ---------------------------------------------------------------------------
WORKFLOW_DEFINITIONS = [{
    "workflow_id": "serious_ae_reported",
    "display_name": "Serious Adverse Event Reported",
    "description": "Alerts the safety team about a serious adverse event then marks the report processed.",
    "version": "1.0.0", "enabled": True, "status": "Active", "on_error": "continue",
    "input_schema": {
        "ae_uuid": {"type": "string", "required": True},
        "subject_id": {"type": "string", "required": False},
        "severity": {"type": "string", "required": False},
        "description": {"type": "string", "required": False},
        "site": {"type": "string", "required": False},
    },
    "steps": [
        {
            "id": "alert_safety_team",
            "type": "service_call",
            "service": "email",
            "operation": "send_email",
            # input_map keys are the WIRE field names (to_email/subject/body_html), not camelCase wrapper args.
            "input_map": {
                "to_email": "safety@helix.com",
                "subject": "[HELIX] Serious adverse event — subject {{input.subject_id}}",
                "body_html": (
                    "<h2>Serious Adverse Event Reported</h2>"
                    "<p><strong>Subject:</strong> {{input.subject_id}}</p>"
                    "<p><strong>Severity:</strong> {{input.severity}}</p>"
                    "<p><strong>Site:</strong> {{input.site}}</p>"
                    "<p><strong>Description:</strong> {{input.description}}</p>"
                    "<p>This report has been escalated to the safety team for expedited review.</p>"
                ),
                "body_text": "Serious adverse event reported for subject {{input.subject_id}}.",
            },
            "on_error": "continue",
        },
        {
            # Last step: stamp the source record so the UI status chip updates. NS-qualified object_type.
            "id": "mark_processed",
            "type": "crud_operation",
            "operation": "update",
            "object_type": NS + ":adverse_event",
            "record_uuid": "{{input.ae_uuid}}",
            "data": {"workflow_status": "processed", "processed_at": "{{context.timestamp}}"},
        },
    ],
}]

EVENT_BINDINGS = []


# ---------------------------------------------------------------------------
# Seed data — PER SITE (tenant_name=...). HQ (default-tenant) holds the global
# study catalog + a sites directory; each clinical site holds its own
# participants, visits and adverse events.
# ---------------------------------------------------------------------------
def _iso(days_from_now, hour=9):
    dt = datetime.datetime.utcnow() + datetime.timedelta(days=days_from_now)
    dt = dt.replace(hour=hour, minute=0, second=0, microsecond=0)
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def _date(days_from_now):
    d = datetime.date.today() + datetime.timedelta(days=days_from_now)
    return d.strftime("%Y-%m-%d")


# Study catalog (seeded at HQ; readable everywhere). Curated, relevant hero images.
STUDIES = [
    {"name": "helios-card-301", "display_name": "HELIOS-CARD",
     "description": "Phase III trial of a novel anticoagulant for high-risk cardiac patients.",
     "protocol_number": "HX-CARD-301", "phase": "III", "therapeutic_area": "Cardiology",
     "status": "active", "target_enrollment": 240, "sponsor": "Helix Biopharma",
     "hero_image": ux("1559757148-5c350d0d3c56")},
    {"name": "neura-ms-202", "display_name": "NEURA-MS",
     "description": "Phase II study of a remyelination agent in relapsing multiple sclerosis.",
     "protocol_number": "HX-NEUR-202", "phase": "II", "therapeutic_area": "Neurology",
     "status": "recruiting", "target_enrollment": 120, "sponsor": "Helix Biopharma",
     "hero_image": ux("1532187863486-abf9dbad1b69")},
    {"name": "onco-solid-401", "display_name": "ONCO-SOLID",
     "description": "Phase IV post-market surveillance of an immunotherapy for solid tumors.",
     "protocol_number": "HX-ONCO-401", "phase": "IV", "therapeutic_area": "Oncology",
     "status": "active", "target_enrollment": 180, "sponsor": "Meridian Oncology",
     "hero_image": ux("1607619056574-7b8d3ee536b2")},
    {"name": "immuno-vax-101", "display_name": "IMMUNO-VAX",
     "description": "Phase I first-in-human study of an mRNA prophylactic vaccine candidate.",
     "protocol_number": "HX-IMM-101", "phase": "I", "therapeutic_area": "Immunology",
     "status": "recruiting", "target_enrollment": 60, "sponsor": "Helix Biopharma",
     "hero_image": ux("1628595351029-c2bf17511435")},
    {"name": "endo-glp-303", "display_name": "ENDO-GLP",
     "description": "Phase III trial of a long-acting GLP-1 agonist for type 2 diabetes.",
     "protocol_number": "HX-ENDO-303", "phase": "III", "therapeutic_area": "Endocrinology",
     "status": "active", "target_enrollment": 300, "sponsor": "Helix Biopharma",
     "hero_image": ux("1584036561566-baf8f5f1b144")},
    {"name": "pulmo-copd-201", "display_name": "PULMO-COPD",
     "description": "Phase II inhaled biologic study for moderate-to-severe COPD.",
     "protocol_number": "HX-PULM-201", "phase": "II", "therapeutic_area": "Pulmonology",
     "status": "planning", "target_enrollment": 90, "sponsor": "Aria Respiratory",
     "hero_image": ux("1576091160550-2173dba999ef")},
    {"name": "renal-ckd-302", "display_name": "RENAL-CKD",
     "description": "Phase III trial of a nephroprotective agent in chronic kidney disease.",
     "protocol_number": "HX-RENL-302", "phase": "III", "therapeutic_area": "Nephrology",
     "status": "completed", "target_enrollment": 210, "sponsor": "Helix Biopharma",
     "hero_image": ux("1530497610245-94d3c16cda28")},
    {"name": "hema-anc-102", "display_name": "HEMA-ANC",
     "description": "Phase I dose-escalation study of an anticoagulant in healthy volunteers.",
     "protocol_number": "HX-HEMA-102", "phase": "I", "therapeutic_area": "Hematology",
     "status": "recruiting", "target_enrollment": 48, "sponsor": "Helix Biopharma",
     "hero_image": ux("1583324113626-70df0f4deaab")},
    {"name": "derma-pso-203", "display_name": "DERMA-PSO",
     "description": "Phase II monoclonal antibody study for moderate plaque psoriasis.",
     "protocol_number": "HX-DERM-203", "phase": "II", "therapeutic_area": "Dermatology",
     "status": "recruiting", "target_enrollment": 110, "sponsor": "Aria Respiratory",
     "hero_image": ux("1631815588090-d4bfec5b1ccb")},
]

# Per-site definition: tenant + site directory record + roster of participants/visits/AEs.
SITES = [
    {
        "tenant": "site-boston",
        "site": {"name": "boston-general-research", "display_name": "Boston General Research Center",
                 "description": "Tertiary academic medical center supporting cardiology and oncology trials.",
                 "location": "Boston, MA", "principal_investigator": "Dr. Elena Marsh",
                 "beds": 18, "status": "active", "site_image": ux("1564732005956-20420ebdab60")},
        "coordinator": "boston.coord@helix.com",
        "investigator": "boston.investigator@helix.com",
        "staff": {"name": "elena-marsh", "display_name": "Dr. Elena Marsh",
                  "description": "Principal investigator and site coordinator for the Boston site.",
                  "role_title": "Principal Investigator", "credentials": "MD, PhD",
                  "specialty": "Cardiology"},
        "studies": ["helios-card-301", "onco-solid-401", "immuno-vax-101"],
        "participants": [
            {"sid": "BOS-001", "study": "helios-card-301", "status": "active", "arm": "treatment", "doff": -42},
            {"sid": "BOS-002", "study": "helios-card-301", "status": "active", "arm": "placebo", "doff": -38},
            {"sid": "BOS-003", "study": "onco-solid-401", "status": "enrolled", "arm": "treatment", "doff": -20},
            {"sid": "BOS-004", "study": "onco-solid-401", "status": "screening", "arm": "treatment", "doff": -5},
            {"sid": "BOS-005", "study": "immuno-vax-101", "status": "withdrawn", "arm": "placebo", "doff": -60},
        ],
    },
    {
        "tenant": "site-austin",
        "site": {"name": "austin-clinical-institute", "display_name": "Austin Clinical Institute",
                 "description": "Community research institute focused on endocrinology and dermatology trials.",
                 "location": "Austin, TX", "principal_investigator": "Dr. Ray Calderon",
                 "beds": 12, "status": "active", "site_image": ux("1531218150217-54595bc2b934")},
        "coordinator": "austin.coord@helix.com",
        "investigator": "austin.investigator@helix.com",
        "staff": {"name": "ray-calderon", "display_name": "Dr. Ray Calderon",
                  "description": "Principal investigator and site coordinator for the Austin site.",
                  "role_title": "Principal Investigator", "credentials": "MD",
                  "specialty": "Endocrinology"},
        "studies": ["endo-glp-303", "derma-pso-203", "neura-ms-202"],
        "participants": [
            {"sid": "AUS-001", "study": "endo-glp-303", "status": "active", "arm": "treatment", "doff": -50},
            {"sid": "AUS-002", "study": "endo-glp-303", "status": "active", "arm": "placebo", "doff": -47},
            {"sid": "AUS-003", "study": "endo-glp-303", "status": "completed", "arm": "treatment", "doff": -110},
            {"sid": "AUS-004", "study": "derma-pso-203", "status": "enrolled", "arm": "treatment", "doff": -12},
            {"sid": "AUS-005", "study": "neura-ms-202", "status": "screening", "arm": "placebo", "doff": -3},
        ],
    },
    {
        "tenant": "site-denver",
        "site": {"name": "denver-mountain-trials", "display_name": "Denver Mountain Trials Unit",
                 "description": "High-altitude research unit specializing in pulmonology and immunology studies.",
                 "location": "Denver, CO", "principal_investigator": "Dr. Priya Anand",
                 "beds": 10, "status": "active", "site_image": ux("1546156929-a4c0ac411f47")},
        "coordinator": "denver.coord@helix.com",
        "investigator": "denver.investigator@helix.com",
        "staff": {"name": "priya-anand", "display_name": "Dr. Priya Anand",
                  "description": "Principal investigator and site coordinator for the Denver site.",
                  "role_title": "Principal Investigator", "credentials": "MD, MPH",
                  "specialty": "Pulmonology"},
        "studies": ["immuno-vax-101", "neura-ms-202", "hema-anc-102"],
        "participants": [
            {"sid": "DEN-001", "study": "immuno-vax-101", "status": "active", "arm": "treatment", "doff": -30},
            {"sid": "DEN-002", "study": "immuno-vax-101", "status": "enrolled", "arm": "placebo", "doff": -15},
            {"sid": "DEN-003", "study": "neura-ms-202", "status": "active", "arm": "treatment", "doff": -25},
            {"sid": "DEN-004", "study": "hema-anc-102", "status": "screening", "arm": "treatment", "doff": -4},
        ],
    },
]

# Visit plan per participant index (visit_type, days offset, hour, window, initial appointment status).
# appointment base => status/start_time/end_time MANDATORY on every Visit create.
VISIT_PLAN = [
    {"vt": "screening", "doff": -2, "hour": 9, "window": "Day -7 to Day 0", "status": "completed"},
    {"vt": "baseline", "doff": 3, "hour": 10, "window": "Day 1 (+/- 2)", "status": "confirmed"},
    {"vt": "followup", "doff": 14, "hour": 11, "window": "Week 2 (+/- 3)", "status": "requested"},
]

AE_PLAN = [
    {"sev": "mild", "desc": "Transient headache reported on Day 3, resolved without intervention.",
     "outcome": "recovered", "serious": False, "doff": -3},
    {"sev": "serious", "desc": "Hospitalization for chest pain; investigator assessment ongoing.",
     "outcome": "recovering", "serious": True, "doff": -1},
]


def seed_test_data(s, base, domain, tenant_uuid, progress):
    # 1) HQ catalog — studies (the primary browse entity → seed the full set) at default-tenant.
    study_uuids = {}
    for st in STUDIES:
        u = seed_record(s, base, domain, "Study", st, progress=progress, tenant_name="default-tenant")
        if u:
            study_uuids[st["name"]] = u
    progress.ok("Seeded %d Studies at HQ." % len(study_uuids))

    # 2) Per-site data — site directory record, staff, participants, visits, adverse events.
    n_sites = n_part = n_visit = n_ae = 0
    for sd in SITES:
        tn = sd["tenant"]

        # Site directory record (also seeded at HQ so the portfolio view can list all sites).
        site_u_hq = seed_record(s, base, domain, "Site", sd["site"],
                                 progress=progress, tenant_name="default-tenant")
        site_u = seed_record(s, base, domain, "Site", sd["site"], progress=progress, tenant_name=tn)
        if site_u:
            n_sites += 1

        # Staff / investigator profile for this site.
        staff_u = seed_record(s, base, domain, "StaffProfile", sd["staff"],
                              progress=progress, tenant_name=tn)
        if staff_u and site_u:
            ref_link(s, base, domain, NS, "StaffProfile", staff_u, "Site", site_u)

        # Participants for this site, each linked to its Study + Site via ref_link.
        for p in sd["participants"]:
            prec = {
                "name": p["sid"].lower(), "display_name": "Subject " + p["sid"],
                "description": "Trial subject %s enrolled at %s." % (p["sid"], sd["site"]["display_name"]),
                "subject_id": p["sid"], "status": p["status"], "arm": p["arm"],
                "enrolled_on": _date(p["doff"]), "owner_username": sd["coordinator"],
            }
            part_u = seed_record(s, base, domain, "Participant", prec, progress=progress, tenant_name=tn)
            if not part_u:
                continue
            n_part += 1
            study_u = study_uuids.get(p["study"])
            # NOTE: studies live at HQ; site participants reference them by uuid via ref_link.
            if study_u:
                ref_link(s, base, domain, NS, "Participant", part_u, "Study", study_u)
            if site_u:
                ref_link(s, base, domain, NS, "Participant", part_u, "Site", site_u)

            # Visits — appointment base => MUST set status + start_time + end_time on every record.
            for i, vp in enumerate(VISIT_PLAN):
                start = _iso(vp["doff"], vp["hour"])
                end = _iso(vp["doff"], vp["hour"] + 1)
                vrec = {
                    "name": "%s-%s" % (p["sid"].lower(), vp["vt"]),
                    "display_name": "%s · %s visit" % (p["sid"], vp["vt"]),
                    "description": "%s visit for subject %s." % (vp["vt"].title(), p["sid"]),
                    "status": vp["status"],          # appointment lifecycle state (mandatory)
                    "start_time": start,             # mandatory (appointment base)
                    "end_time": end,                 # mandatory (appointment base)
                    "visit_type": vp["vt"], "visit_window": vp["window"],
                    "notes": "", "owner_username": sd["coordinator"],
                }
                visit_u = seed_record(s, base, domain, "Visit", vrec, progress=progress, tenant_name=tn)
                if visit_u:
                    n_visit += 1
                    ref_link(s, base, domain, NS, "Visit", visit_u, "Participant", part_u)

            # Adverse events — seed a couple for the first participant of each site for a populated safety view.
            if p is sd["participants"][0]:
                for ap in AE_PLAN:
                    arec = {
                        "name": "%s-ae-%s" % (p["sid"].lower(), ap["sev"]),
                        "display_name": "%s · %s AE" % (p["sid"], ap["sev"]),
                        "description": ap["desc"],
                        "severity": ap["sev"], "onset": _date(ap["doff"]),
                        "outcome": ap["outcome"], "is_serious": ap["serious"],
                        "owner_username": sd["coordinator"],
                    }
                    ae_u = seed_record(s, base, domain, "AdverseEvent", arec,
                                       progress=progress, tenant_name=tn)
                    if ae_u:
                        n_ae += 1
                        ref_link(s, base, domain, NS, "AdverseEvent", ae_u, "Participant", part_u)

    progress.ok("Seeded %d Sites, %d Participants, %d Visits, %d Adverse Events across clinical sites."
                % (n_sites, n_part, n_visit, n_ae))


def main():
    setup = AppSetup(AppConfig(), ALL_SCHEMAS, PUBLIC_SCHEMAS)
    setup.run(seed_fn=seed_test_data, policies=POLICIES,
              workflow_definitions=WORKFLOW_DEFINITIONS, event_bindings=EVENT_BINDINGS)


if __name__ == "__main__":
    main()
