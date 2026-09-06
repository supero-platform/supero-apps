# setup.py — policies, the appointment-confirmation workflow, and multi-tenant
# seed data for MEDORA.
import sys, os, datetime
sys.path.insert(0, os.path.dirname(__file__))
from supero.app_setup import AppSetup, PolicyDef, PolicyRule, make_seed_record, ref_link
from config import AppConfig
from schemas import ALL_SCHEMAS, PUBLIC_SCHEMAS, SUPERO_APP_NAMESPACE

# NOTE: the app conventions's skeleton shows `make_seed_record(ALL_SCHEMAS)`, but the
# installed SDK's make_seed_record takes the NAMESPACE STRING (it does
# `namespace.strip().lower()`), and passing the schema list raises
# `AttributeError: 'list' object has no attribute 'strip'`. the generator's own
# docstring example uses `make_seed_record(APP_NAMESPACE)`, which matches the
# SDK — so we bind to the single app namespace.
seed_record = make_seed_record(SUPERO_APP_NAMESPACE)   # MUST be module-level


def ux(pid, w=1600, h=1100):
    # Curated, reliable Unsplash CDN images (direct images.unsplash.com — NOT
    # picsum/source.unsplash). auto=format + q=80 keep them crisp and cacheable.
    base = "https://images.unsplash.com/photo-" + pid + "?auto=format&fit=crop&q=80"
    return {"url": "%s&w=%d&h=%d" % (base, w, h),
            "thumbnail_url": "%s&w=800&h=600" % base}


# ----------------------------------------------------------------------------
# Access control. tenant_user (patients) is fail-closed (default none).
#   - Doctor / Department: SHARED read for any signed-in user (also public).
#   - Patient / Appointment / Encounter / Prescription / LabResult / Invoice:
#     PRIVATE, owner-scoped — each patient sees ONLY their own rows via
#     owner_username == $user.name (the platform auto-stamps it on create and
#     filters reads). Sensitive health data never leaks across patients.
#   - tenant_admin (chain + site staff) gets full access and manages everything.
# ----------------------------------------------------------------------------
POLICIES = [
    # DEMO-ACCOUNT-SCOPE-V1 — the clinician/admin logins are published so anyone can
    # try the demo, so they must not double as a skeleton key over the whole domain.
    # Scoped to this app's own entities; delete is withheld because no screen offers
    # it, so a visitor cannot destroy records other visitors are reading.
    PolicyDef(role="tenant_admin", default_access="none", rules=[
        PolicyRule(entity="department", can_read=True, can_create=True, can_update=True),
        PolicyRule(entity="doctor", can_read=True, can_create=True, can_update=True),
        PolicyRule(entity="patient", can_read=True, can_create=True, can_update=True),
        PolicyRule(entity="appointment", can_read=True, can_create=True, can_update=True),
        PolicyRule(entity="encounter", can_read=True, can_create=True, can_update=True),
        PolicyRule(entity="prescription", can_read=True, can_create=True, can_update=True),
        PolicyRule(entity="lab_result", can_read=True, can_create=True, can_update=True),
        PolicyRule(entity="invoice", can_read=True, can_create=True, can_update=True),
    ]),
    PolicyDef(role="tenant_user", default_access="none", rules=[
        PolicyRule(entity="department", can_read=True),
        PolicyRule(entity="doctor", can_read=True),
        PolicyRule(entity="patient", can_read=True, can_create=True, can_update=True,
                   filter_field="owner_username", filter_match="$user.name"),
        PolicyRule(entity="appointment", can_read=True, can_create=True, can_update=True,
                   filter_field="owner_username", filter_match="$user.name"),
        # CLINICIAN-ONLY-FIELDS-V1 — a patient reads their OWN encounter, but the
        # clinician's working assessment and care plan are stripped BY THE SERVER,
        # not hidden by the UI: curl the API with the patient's own valid token and
        # `assessment` is simply absent from the JSON. This is the second axis of
        # access control here — tenants isolate ROWS, hidden_fields isolate FIELDS.
        PolicyRule(entity="encounter", can_read=True,
                   filter_field="owner_username", filter_match="$user.name",
                   hidden_fields=["assessment", "plan"]),
        PolicyRule(entity="prescription", can_read=True,
                   filter_field="owner_username", filter_match="$user.name"),
        # The value and its reference range are the patient's to read; the lab's
        # internal abnormal-flag triage belongs to the clinician.
        PolicyRule(entity="lab_result", can_read=True,
                   filter_field="owner_username", filter_match="$user.name",
                   hidden_fields=["flag"]),
        PolicyRule(entity="invoice", can_read=True,
                   filter_field="owner_username", filter_match="$user.name"),
    ]),
]

# ----------------------------------------------------------------------------
# Workflow: when staff confirm an appointment, email + SMS the patient in
# parallel, then stamp workflow_status="processed" + processed_at. The
# crud_operation object_type is NAMESPACE-QUALIFIED ("medorahealth:appointment").
# ----------------------------------------------------------------------------
WORKFLOW_DEFINITIONS = [{
    "workflow_id": "appointment_confirmed",
    "display_name": "Appointment Confirmed",
    "description": "Notify the patient by email and SMS, then mark the appointment processed.",
    "version": "1.0.0", "enabled": True, "status": "Active",
    "on_error": "continue",
    "input_schema": {
        "appointment_uuid": {"type": "string", "required": True},
        "patient_email": {"type": "string", "required": True},
        "patient_phone": {"type": "string", "required": False},
        "patient_name": {"type": "string", "required": False},
        "doctor_name": {"type": "string", "required": False},
        "scheduled_at": {"type": "string", "required": False},
    },
    "steps": [
        {"id": "notify", "type": "parallel", "steps": [
            {"id": "email", "type": "service_call", "service": "email", "operation": "send_email",
             "on_error": "continue",
             "input_map": {
                 "to_email": "{{input.patient_email}}",
                 "subject": "Your Medora appointment is confirmed",
                 "body_html": "<p>Hi {{input.patient_name}},</p><p>Your appointment with "
                              "{{input.doctor_name}} on {{input.scheduled_at}} is confirmed. "
                              "Please arrive 10 minutes early and bring your insurance card. "
                              "Reply to this email if you need to reschedule.</p>"
                              "<p>— The Medora care team</p>",
             }},
            {"id": "sms", "type": "service_call", "service": "sms", "operation": "send_sms",
             "on_error": "continue",
             "input_map": {
                 "to_number": "{{input.patient_phone}}",
                 "body": "Medora: your appointment with {{input.doctor_name}} on "
                         "{{input.scheduled_at}} is confirmed. See you soon.",
             }},
        ]},
        {"id": "done", "type": "crud_operation", "operation": "update",
         "object_type": "medorahealth:appointment",
         "record_uuid": "{{input.appointment_uuid}}",
         "data": {"workflow_status": "processed", "processed_at": "{{context.timestamp}}"}},
    ],
}]

EVENT_BINDINGS = []


# ----------------------------------------------------------------------------
# Seed data — RICH and MULTI-TENANT. Doctors/Departments are the public browse
# catalog (8-12 doctors across the chain so the grid is real), seeded per site
# into named tenants. Clinical records (patients, appointments, prescriptions,
# lab results, invoices, encounters) are owner-scoped demo data per patient.
# ----------------------------------------------------------------------------
def _now():
    return datetime.datetime.utcnow().replace(microsecond=0).isoformat() + "Z"


def _in_days(d, hour=10):
    t = datetime.datetime.utcnow() + datetime.timedelta(days=d)
    t = t.replace(hour=hour, minute=0, second=0, microsecond=0)
    return t.isoformat() + "Z"


def _plus_hour(iso):
    try:
        e = datetime.datetime.fromisoformat(iso.replace("Z", "+00:00")) + datetime.timedelta(hours=1)
        return e.replace(tzinfo=None).isoformat() + "Z"
    except Exception:
        return iso


# Departments (specialties) — shared catalog content seeded into every site.
DEPARTMENTS = [
    {"name": "cardiology", "display_name": "Cardiology",
     "description": "Heart and vascular care, from prevention to advanced intervention.",
     "specialty_code": "CARD", "icon": "❤️", "is_featured": True,
     "summary": "Comprehensive heart care: diagnostics, prevention, and treatment of cardiovascular conditions.",
     "hero_image": ux("1576091160550-2173dba999ef")},
    {"name": "pediatrics", "display_name": "Pediatrics",
     "description": "Gentle, expert care for infants, children, and adolescents.",
     "specialty_code": "PEDS", "icon": "🧸", "is_featured": True,
     "summary": "Well-child visits, immunizations, and care for childhood illnesses in a kid-friendly setting.",
     "hero_image": ux("1581594693702-fbdc51b2763b")},
    {"name": "dermatology", "display_name": "Dermatology",
     "description": "Skin, hair, and nail health — medical and cosmetic.",
     "specialty_code": "DERM", "icon": "🧴", "is_featured": False,
     "summary": "Diagnosis and treatment of skin conditions, screenings, and dermatologic procedures.",
     "hero_image": ux("1612277795421-9bc7706a4a34")},
    {"name": "orthopedics", "display_name": "Orthopedics",
     "description": "Bones, joints, and sports-injury recovery.",
     "specialty_code": "ORTH", "icon": "🦴", "is_featured": True,
     "summary": "Care for fractures, joint pain, and sports injuries, with rehabilitation and surgical options.",
     "hero_image": ux("1530026405186-ed1f139313f8")},
    {"name": "family-medicine", "display_name": "Family Medicine",
     "description": "Primary care for the whole family across all ages.",
     "specialty_code": "FAM", "icon": "👨‍👩‍👧", "is_featured": True,
     "summary": "Routine checkups, chronic-condition management, and everyday primary care for all ages.",
     "hero_image": ux("1666214280557-f1b5022eb634")},
    {"name": "obstetrics-gynecology", "display_name": "Obstetrics & Gynecology",
     "description": "Women's health, pregnancy, and reproductive care.",
     "specialty_code": "OBGYN", "icon": "🤰", "is_featured": False,
     "summary": "Prenatal care, well-woman exams, and treatment across reproductive health.",
     "hero_image": ux("1559757175-5700dde675bc")},
]

# Doctors per tenant (site). Each entry maps to one site; total 10 across the chain.
# Keyed by tenant name -> list of doctor dicts (department slug in `_dept`).
DOCTORS_BY_SITE = {
    "mercy-general": [
        {"name": "dr-evelyn-chen", "display_name": "Dr. Evelyn Chen", "_dept": "cardiology",
         "description": "Interventional cardiologist focused on preventive heart health.",
         "specialty": "Cardiology", "title": "MD, FACC",
         "bio": "Dr. Chen leads the cardiac catheterization lab at Mercy General and is passionate "
                "about preventive cardiology and patient education.",
         "languages": ["English", "Mandarin"], "years_experience": 18,
         "accepting_patients": True, "consult_fee": 220.0,
         "photo": ux("1559839734-2b71ea197ec2", 900, 1100)},
        {"name": "dr-marcus-hale", "display_name": "Dr. Marcus Hale", "_dept": "orthopedics",
         "description": "Orthopedic surgeon specializing in sports injuries.",
         "specialty": "Orthopedics", "title": "MD",
         "bio": "Dr. Hale repairs and rehabilitates knees and shoulders for weekend warriors and "
                "professional athletes alike, with a minimally invasive approach.",
         "languages": ["English"], "years_experience": 14,
         "accepting_patients": True, "consult_fee": 240.0,
         "photo": ux("1612349317150-e413f6a5b16d", 900, 1100)},
        {"name": "dr-amara-okafor", "display_name": "Dr. Amara Okafor", "_dept": "obstetrics-gynecology",
         "description": "OB-GYN with a focus on high-risk pregnancy care.",
         "specialty": "Obstetrics & Gynecology", "title": "MD, FACOG",
         "bio": "Dr. Okafor combines warmth and clinical rigor, guiding patients through pregnancy "
                "and women's health with compassionate, evidence-based care.",
         "languages": ["English", "French"], "years_experience": 16,
         "accepting_patients": False, "consult_fee": 210.0,
         "photo": ux("1594824476967-48c8b964273f", 900, 1100)},
        {"name": "dr-sandra-mills", "display_name": "Dr. Sandra Mills", "_dept": "dermatology",
         "description": "Dermatologist treating medical and cosmetic skin concerns.",
         "specialty": "Dermatology", "title": "MD",
         "bio": "Dr. Mills offers full-body skin screenings and a calm, thorough approach to both "
                "medical dermatology and cosmetic procedures.",
         "languages": ["English", "Spanish"], "years_experience": 11,
         "accepting_patients": True, "consult_fee": 190.0,
         "photo": ux("1582750433449-648ed127bb54", 900, 1100)},
    ],
    "lakeside-clinic": [
        {"name": "dr-james-whitfield", "display_name": "Dr. James Whitfield", "_dept": "family-medicine",
         "description": "Family physician and the clinic's primary-care anchor.",
         "specialty": "Family Medicine", "title": "MD",
         "bio": "Dr. Whitfield has cared for three generations of Lakeside families, blending "
                "preventive medicine with a genuinely personal touch.",
         "languages": ["English"], "years_experience": 22,
         "accepting_patients": True, "consult_fee": 140.0,
         "photo": ux("1537368910025-700350fe46c7", 900, 1100)},
        {"name": "dr-priya-nair", "display_name": "Dr. Priya Nair", "_dept": "family-medicine",
         "description": "Family medicine with a focus on chronic-disease management.",
         "specialty": "Family Medicine", "title": "MD, MPH",
         "bio": "Dr. Nair helps patients manage diabetes, hypertension, and heart health with "
                "practical, sustainable plans tailored to real life.",
         "languages": ["English", "Hindi", "Malayalam"], "years_experience": 9,
         "accepting_patients": True, "consult_fee": 150.0,
         "photo": ux("1651008376811-b90baee60c1f", 900, 1100)},
        {"name": "dr-tomas-rivera", "display_name": "Dr. Tomás Rivera", "_dept": "dermatology",
         "description": "Visiting dermatologist for skin checks and minor procedures.",
         "specialty": "Dermatology", "title": "MD",
         "bio": "Dr. Rivera runs Lakeside's weekly dermatology clinic, with same-week appointments "
                "for rashes, moles, and skin-cancer screenings.",
         "languages": ["English", "Spanish"], "years_experience": 13,
         "accepting_patients": True, "consult_fee": 175.0,
         "photo": ux("1622253692010-333f2da6031d", 900, 1100)},
    ],
    "summit-childrens": [
        {"name": "dr-anil-patel", "display_name": "Dr. Anil Patel", "_dept": "pediatrics",
         "description": "Pediatrician and medical director at Summit Children's.",
         "specialty": "Pediatrics", "title": "MD, FAAP",
         "bio": "Dr. Patel has a gift for putting kids (and parents) at ease, from newborn checks "
                "to teen sports physicals, with a focus on developmental health.",
         "languages": ["English", "Gujarati"], "years_experience": 20,
         "accepting_patients": True, "consult_fee": 160.0,
         "photo": ux("1622902046580-2b47f47f5471", 900, 1100)},
        {"name": "dr-lena-fischer", "display_name": "Dr. Lena Fischer", "_dept": "pediatrics",
         "description": "Pediatrician specializing in childhood asthma and allergy.",
         "specialty": "Pediatrics", "title": "MD",
         "bio": "Dr. Fischer helps families manage asthma, allergies, and respiratory health with "
                "clear plans and plenty of reassurance.",
         "languages": ["English", "German"], "years_experience": 10,
         "accepting_patients": True, "consult_fee": 165.0,
         "photo": ux("1573497019940-1c28c88b4f3e", 900, 1100)},
        {"name": "dr-grace-kim", "display_name": "Dr. Grace Kim", "_dept": "orthopedics",
         "description": "Pediatric orthopedist for growing bones and sports injuries.",
         "specialty": "Pediatric Orthopedics", "title": "MD",
         "bio": "Dr. Kim treats fractures, growth-plate injuries, and young-athlete concerns with "
                "a gentle, kid-first approach.",
         "languages": ["English", "Korean"], "years_experience": 12,
         "accepting_patients": False, "consult_fee": 200.0,
         "photo": ux("1571772996211-2f02c9727629", 900, 1100)},
    ],
}

# Patients per site (owner_username == login email, used for owner-scoping).
PATIENTS_BY_SITE = {
    "mercy-general": [
        {"name": "maria-alvarez", "display_name": "Maria Alvarez",
         "description": "Cardiology patient at Mercy General.",
         "owner_username": "maria@example.com", "full_name": "Maria Alvarez",
         "email": "maria@example.com", "phone": "+15551112201",
         "date_of_birth": "1979-04-12", "sex": "female", "blood_type": "O+",
         "allergies": "Penicillin", "insurance_provider": "BlueShield",
         "mrn": "MG-100482"},
        {"name": "daniel-okonkwo", "display_name": "Daniel Okonkwo",
         "description": "Cardiology follow-up at Mercy General.",
         "owner_username": "roster@mercy-general.medora.health", "full_name": "Daniel Okonkwo",
         "email": "daniel-okonkwo@example.com", "phone": "+1555100517",
         "date_of_birth": "1964-02-18", "sex": "male", "blood_type": "B+",
         "allergies": "Sulfa drugs", "insurance_provider": "BlueShield",
         "mrn": "MG-100517"},
        {"name": "priya-raman", "display_name": "Priya Raman",
         "description": "Hypertension review at Mercy General.",
         "owner_username": "roster@mercy-general.medora.health", "full_name": "Priya Raman",
         "email": "priya-raman@example.com", "phone": "+1555100538",
         "date_of_birth": "1991-11-05", "sex": "female", "blood_type": "A+",
         "allergies": "None known", "insurance_provider": "BlueShield",
         "mrn": "MG-100538"},
        {"name": "aaron-whitfield", "display_name": "Aaron Whitfield",
         "description": "Post-stent monitoring at Mercy General.",
         "owner_username": "roster@mercy-general.medora.health", "full_name": "Aaron Whitfield",
         "email": "aaron-whitfield@example.com", "phone": "+1555100594",
         "date_of_birth": "1957-07-23", "sex": "male", "blood_type": "O-",
         "allergies": "Iodine contrast", "insurance_provider": "Cigna",
         "mrn": "MG-100594"},
        {"name": "helena-brandt", "display_name": "Helena Brandt",
         "description": "Arrhythmia workup at Mercy General.",
         "owner_username": "roster@mercy-general.medora.health", "full_name": "Helena Brandt",
         "email": "helena-brandt@example.com", "phone": "+1555100610",
         "date_of_birth": "1983-03-09", "sex": "female", "blood_type": "AB+",
         "allergies": "Latex", "insurance_provider": "BlueShield",
         "mrn": "MG-100610"},
    ],
    "lakeside-clinic": [
        {"name": "james-carter", "display_name": "James Carter",
         "description": "Primary-care patient at Lakeside.",
         "owner_username": "james@example.com", "full_name": "James Carter",
         "email": "james@example.com", "phone": "+15552223302",
         "date_of_birth": "1986-09-30", "sex": "male", "blood_type": "A-",
         "allergies": "None known", "insurance_provider": "Aetna",
         "mrn": "LK-205571"},
        {"name": "nora-feld", "display_name": "Nora Feld",
         "description": "Annual physical at Lakeside.",
         "owner_username": "roster@lakeside-clinic.medora.health", "full_name": "Nora Feld",
         "email": "nora-feld@example.com", "phone": "+1555205603",
         "date_of_birth": "1975-12-01", "sex": "female", "blood_type": "O+",
         "allergies": "Peanuts", "insurance_provider": "Aetna",
         "mrn": "LK-205603"},
        {"name": "tomas-vega", "display_name": "Tomas Vega",
         "description": "Diabetes management at Lakeside.",
         "owner_username": "roster@lakeside-clinic.medora.health", "full_name": "Tomas Vega",
         "email": "tomas-vega@example.com", "phone": "+1555205627",
         "date_of_birth": "1994-06-14", "sex": "male", "blood_type": "B-",
         "allergies": "None known", "insurance_provider": "Aetna",
         "mrn": "LK-205627"},
        {"name": "ruth-mbeki", "display_name": "Ruth Mbeki",
         "description": "Thyroid review at Lakeside.",
         "owner_username": "roster@lakeside-clinic.medora.health", "full_name": "Ruth Mbeki",
         "email": "ruth-mbeki@example.com", "phone": "+1555205644",
         "date_of_birth": "1968-08-27", "sex": "female", "blood_type": "A+",
         "allergies": "Aspirin", "insurance_provider": "UnitedHealth",
         "mrn": "LK-205644"},
    ],
    "summit-childrens": [
        {"name": "sofia-nguyen", "display_name": "Sofia Nguyen",
         "description": "Pediatric patient at Summit Children's (parent: Linh Nguyen).",
         "owner_username": "sofia@example.com", "full_name": "Sofia Nguyen",
         "email": "sofia@example.com", "phone": "+15553334403",
         "date_of_birth": "2016-02-08", "sex": "female", "blood_type": "B+",
         "allergies": "Peanuts", "insurance_provider": "Cigna",
         "mrn": "SC-330914"},
        {"name": "kai-nakamura", "display_name": "Kai Nakamura",
         "description": "Asthma review at Summit Children's.",
         "owner_username": "roster@summit-childrens.medora.health", "full_name": "Kai Nakamura",
         "email": "kai-nakamura@example.com", "phone": "+1555300118",
         "date_of_birth": "2015-05-19", "sex": "male", "blood_type": "O+",
         "allergies": "Eggs", "insurance_provider": "Kaiser",
         "mrn": "SC-300118"},
        {"name": "amara-diallo", "display_name": "Amara Diallo",
         "description": "Well-child visit at Summit Children's.",
         "owner_username": "roster@summit-childrens.medora.health", "full_name": "Amara Diallo",
         "email": "amara-diallo@example.com", "phone": "+1555300142",
         "date_of_birth": "2018-01-30", "sex": "female", "blood_type": "A-",
         "allergies": "None known", "insurance_provider": "Kaiser",
         "mrn": "SC-300142"},
    ],
}


def _seed_site(s, base, domain, tn, progress):
    """Seed one hospital/clinic tenant with its catalog + clinical demo data."""
    ns = SUPERO_APP_NAMESPACE

    # Departments (shared specialties, one set per site for browseability).
    dept_uuids = {}
    for rec in DEPARTMENTS:
        u = seed_record(s, base, domain, "Department", dict(rec), progress=progress, tenant_name=tn)
        if u:
            dept_uuids[rec["name"]] = u

    # Doctors for this site (link each to its Department).
    doc_uuids = {}
    for rec in DOCTORS_BY_SITE.get(tn, []):
        rec = dict(rec)
        dept_slug = rec.pop("_dept", None)
        u = seed_record(s, base, domain, "Doctor", rec, progress=progress, tenant_name=tn)
        if u:
            doc_uuids[rec["name"]] = u
            if dept_slug and dept_slug in dept_uuids:
                ref_link(s, base, domain, ns, "Doctor", u, "Department", dept_uuids[dept_slug],
                         progress=progress)

    # Patients (owner-scoped) for this site.
    pat_uuids = {}
    for rec in PATIENTS_BY_SITE.get(tn, []):
        u = seed_record(s, base, domain, "Patient", dict(rec), progress=progress, tenant_name=tn)
        if u:
            pat_uuids[rec["name"]] = u

    # Pick the site's primary patient + doctor for clinical demo rows.
    pats = PATIENTS_BY_SITE.get(tn, [])
    docs = DOCTORS_BY_SITE.get(tn, [])
    if not (pats and docs):
        return len(dept_uuids), len(doc_uuids), 0
    p = pats[0]
    d = docs[0]
    p_uuid = pat_uuids.get(p["name"])
    d_uuid = doc_uuids.get(d["name"])
    dept_name = next((x["display_name"] for x in DEPARTMENTS if x["name"] == d.get("_dept")), d["specialty"])

    # Appointments across the lifecycle (requested/confirmed/completed) so the
    # day-board kanban + dashboards look alive. base_appointment REQUIRES
    # status + start_time + end_time.
    appts = [
        {"_slot": _in_days(2, 11), "status": "requested",
         "reason": "Annual checkup", "visit_type": "in_person",
         "display_name": "%s — %s" % (p["full_name"], d["display_name"]),
         "description": "Requested visit."},
        {"_slot": _in_days(1, 14), "status": "confirmed",
         "reason": "Follow-up consult", "visit_type": "telehealth",
         "display_name": "%s — follow-up" % p["full_name"],
         "description": "Confirmed visit.",
         "workflow_status": "processed", "processed_at": _now()},
        {"_slot": _in_days(-6, 9), "status": "completed",
         "reason": "Initial consultation", "visit_type": "in_person",
         "display_name": "%s — completed visit" % p["full_name"],
         "description": "Completed visit."},
    ]
    appt_uuids = []
    for i, a in enumerate(appts):
        slot = a.pop("_slot")
        rec = dict(a)
        rec["name"] = "appt-%s-%d" % (tn, i + 1)
        rec["owner_username"] = p["owner_username"]
        rec["patient_name"] = p["full_name"]
        rec["patient_email"] = p["email"]
        rec["patient_phone"] = p["phone"]
        rec["doctor_name"] = d["display_name"]
        rec["department_name"] = dept_name
        rec["scheduled_at"] = slot
        rec["start_time"] = slot          # mandatory base field
        rec["end_time"] = _plus_hour(slot)  # mandatory base field
        u = seed_record(s, base, domain, "Appointment", rec, progress=progress, tenant_name=tn)
        if u:
            appt_uuids.append(u)
            ref_link(s, base, domain, ns, "Appointment", u, "Doctor", d_uuid, progress=progress)
            if p_uuid:
                ref_link(s, base, domain, ns, "Appointment", u, "Patient", p_uuid, progress=progress)

    # Encounter for the completed visit.
    enc = {
        "name": "enc-%s-1" % tn, "display_name": "%s — visit note" % p["full_name"],
        "description": "Clinical note for completed visit.",
        "owner_username": p["owner_username"], "patient_name": p["full_name"],
        "doctor_name": d["display_name"], "department_name": dept_name,
        "visit_date": _in_days(-6, 9), "chief_complaint": "Initial consultation",
        "assessment": "Patient stable. Vitals within normal range. No acute concerns.",
        "plan": "Maintain current regimen. Routine follow-up in 6 months.",
        "vitals_bp": "122/78", "vitals_hr": 72, "follow_up_days": 180,
    }
    e_uuid = seed_record(s, base, domain, "Encounter", enc, progress=progress, tenant_name=tn)
    if e_uuid and p_uuid:
        ref_link(s, base, domain, ns, "Encounter", e_uuid, "Patient", p_uuid, progress=progress)
        ref_link(s, base, domain, ns, "Encounter", e_uuid, "Doctor", d_uuid, progress=progress)

    # Prescription (active) for the patient.
    rx = {
        "name": "rx-%s-1" % tn, "display_name": "%s — Atorvastatin" % p["full_name"],
        "description": "Active prescription.",
        "owner_username": p["owner_username"], "patient_name": p["full_name"],
        "doctor_name": d["display_name"], "drug_name": "Atorvastatin",
        "dosage": "20 mg", "frequency": "once daily at night", "duration_days": 90,
        "refills": 3, "status": "active", "issued_at": _in_days(-6, 9),
        "instructions": "Take with or without food. Report muscle pain promptly.",
    }
    rx_uuid = seed_record(s, base, domain, "Prescription", rx, progress=progress, tenant_name=tn)
    if rx_uuid and p_uuid:
        ref_link(s, base, domain, ns, "Prescription", rx_uuid, "Patient", p_uuid, progress=progress)
        ref_link(s, base, domain, ns, "Prescription", rx_uuid, "Doctor", d_uuid, progress=progress)

    # Lab result for the patient.
    lab = {
        "name": "lab-%s-1" % tn, "display_name": "%s — Lipid Panel" % p["full_name"],
        "description": "Lab result.",
        "owner_username": p["owner_username"], "patient_name": p["full_name"],
        "panel": "Lipid Panel", "test_name": "LDL Cholesterol",
        "value": "112", "unit": "mg/dL", "reference_range": "< 100 mg/dL",
        "flag": "high", "collected_at": _in_days(-6, 8),
    }
    lab_uuid = seed_record(s, base, domain, "LabResult", lab, progress=progress, tenant_name=tn)
    if lab_uuid and p_uuid:
        ref_link(s, base, domain, ns, "LabResult", lab_uuid, "Patient", p_uuid, progress=progress)

    # Invoice — EXTENDS payment: status + amount + currency are MANDATORY.
    inv = {
        "name": "inv-%s-1" % tn, "display_name": "%s — visit invoice" % p["full_name"],
        "description": "Patient invoice for the completed visit.",
        "owner_username": p["owner_username"], "patient_name": p["full_name"],
        "service_summary": "%s consultation" % dept_name,
        "status": "pending", "amount": float(d.get("consult_fee", 150.0)), "currency": "USD",
        "due_date": _in_days(14, 0)[:10], "issued_at": _in_days(-6, 10),
    }
    inv_uuid = seed_record(s, base, domain, "Invoice", inv, progress=progress, tenant_name=tn)
    if inv_uuid and p_uuid:
        ref_link(s, base, domain, ns, "Invoice", inv_uuid, "Patient", p_uuid, progress=progress)

    return len(dept_uuids), len(doc_uuids), len(appt_uuids)


def seed_test_data(s, base, domain, tenant_uuid, progress):
    # Clinical data lives in the NAMED tenants (each a hospital/clinic site);
    # default-tenant is the admin-only chain home and stays empty of patient data.
    sites = ["mercy-general", "lakeside-clinic", "summit-childrens"]
    total_docs = 0
    total_appts = 0
    for tn in sites:
        nd, ndoc, na = _seed_site(s, base, domain, tn, progress)
        total_docs += ndoc
        total_appts += na
        progress.ok("Seeded site '%s': %d departments, %d doctors, %d appointments." % (tn, nd, ndoc, na))
    progress.ok("Seeded %d doctors and %d appointments across %d sites." %
                (total_docs, total_appts, len(sites)))


def main():
    setup = AppSetup(AppConfig(), ALL_SCHEMAS, PUBLIC_SCHEMAS)
    setup.run(seed_fn=seed_test_data, policies=POLICIES,
              workflow_definitions=WORKFLOW_DEFINITIONS, event_bindings=EVENT_BINDINGS)


if __name__ == "__main__":
    main()
