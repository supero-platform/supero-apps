import sys, os, datetime
sys.path.insert(0, os.path.dirname(__file__))
from supero.app_setup import AppSetup, PolicyDef, PolicyRule, make_seed_record
from config import AppConfig
from schemas import ALL_SCHEMAS, PUBLIC_SCHEMAS, SUPERO_APP_NAMESPACE

seed_record = make_seed_record(SUPERO_APP_NAMESPACE)
PATIENT_EMAIL = "patient@lumen.health"


def ux(pid, w=900):
    b = "https://images.unsplash.com/photo-" + pid + "?auto=format&fit=crop&q=80"
    return {"url": "%s&w=%d&h=%d" % (b, w, w), "thumbnail_url": "%s&w=500&h=500" % b}


def dt(days, hour, minute=0):
    d = datetime.datetime.utcnow() + datetime.timedelta(days=days)
    return d.replace(hour=hour, minute=minute, second=0, microsecond=0).isoformat() + "Z"


PV = ['1612349317150-e413f6a5b16d', '1559839734-2b71ea197ec2', '1622253692010-333f2da6031d', '1582750433449-648ed127bb54',
      '1537368910025-700350fe46c7', '1594824476967-48c8b964273f', '1573496359142-b8d87734a5a2', '1651008376811-b90baee60c1f']
SV = ['1505751172876-fa1923c5c528', '1576091160550-2173dba999ef', '1631815588090-d4bfec5b1ccb', '1538108149393-fbbd81895907',
      '1551601651-2a8555f1a136', '1579684385127-1ef15d508118', '1666214280557-f1b5022eb634', '1559757175-0eb30cd8c063']

PROVIDERS = [
    ("Dr. Amara Osei", "MD", "Primary Care", "Board-certified in family medicine with 12 years caring for patients of all ages.", "English, Twi", 12, 4.9),
    ("Dr. Liang Wei", "MD", "Cardiology", "Interventional cardiologist focused on preventive heart health and longevity.", "English, Mandarin", 18, 4.8),
    ("Dr. Sofia Marin", "MD", "Dermatology", "Medical and cosmetic dermatology, from acne to skin-cancer screening.", "English, Spanish", 9, 4.9),
    ("Dr. Priya Nair", "DO", "Pediatrics", "Gentle, evidence-based care for newborns through teens.", "English, Hindi", 11, 5.0),
    ("Dr. Marcus Hill", "MD", "Orthopedics", "Sports-medicine and joint specialist helping you move pain-free.", "English", 15, 4.7),
    ("Dr. Elena Ruiz", "PhD", "Mental Health", "Clinical psychologist specializing in anxiety, stress and CBT.", "English, Spanish", 10, 4.9),
    ("Dr. Hannah Cole", "MD", "Women's Health", "OB-GYN providing compassionate, full-spectrum women's care.", "English", 13, 4.8),
    ("Dr. Omar Farah", "DDS", "Dental", "Family and cosmetic dentistry with a gentle, modern touch.", "English, Arabic", 8, 4.8),
]

SERVICES = [
    ("Annual Physical", "Primary Care", 30, 0.0, "A comprehensive yearly check-up covering vitals, labs and prevention.", False),
    ("Telehealth Visit", "Primary Care", 20, 75.0, "Talk to a clinician from home for common concerns and prescriptions.", True),
    ("Heart Health Screening", "Cardiology", 45, 220.0, "EKG, blood pressure and risk assessment for your cardiovascular health.", False),
    ("Skin Cancer Screening", "Dermatology", 30, 150.0, "Full-body mole and skin check with a dermatologist.", False),
    ("Well-Child Visit", "Pediatrics", 30, 0.0, "Growth, development and immunization check for your child.", False),
    ("Therapy Session", "Mental Health", 50, 130.0, "A confidential 50-minute session with a licensed psychologist.", True),
    ("Prenatal Visit", "Women's Health", 30, 0.0, "Routine prenatal care and monitoring throughout pregnancy.", False),
    ("Dental Cleaning & Exam", "Dental", 45, 120.0, "Professional cleaning, exam and X-rays for a healthy smile.", False),
]

# Appointments: (provider, service, specialty, day_offset, hour, state, visit_type, reason, notes, diagnosis, billing)
APPTS = [
    ("Dr. Amara Osei", "Annual Physical", "Primary Care", -14, 9, "completed", "In-person",
     "Yearly check-up.", "Patient in good health. BP 118/76, BMI 23. Recommend routine labs annually. Continue current vitamins.",
     "Routine health maintenance (Z00.00)", "99395"),
    ("Dr. Sofia Marin", "Skin Cancer Screening", "Dermatology", -5, 11, "completed", "In-person",
     "Mole check on back.", "Benign nevus on upper back, asymmetric border — photographed for monitoring. Reassess in 6 months. No biopsy needed.",
     "Benign melanocytic nevus (D22.5)", "99213"),
    ("Dr. Liang Wei", "Heart Health Screening", "Cardiology", 3, 10, "confirmed", "In-person",
     "Family history of heart disease.", "", "", ""),
    ("Dr. Elena Ruiz", "Therapy Session", "Mental Health", 5, 15, "confirmed", "Telehealth",
     "Work-related stress.", "", "", ""),
    ("Dr. Amara Osei", "Telehealth Visit", "Primary Care", 8, 13, "requested", "Telehealth",
     "Persistent cough for a week.", "", "", ""),
]

DOCUMENTS = [
    ("Telehealth Consent Form", "Consent Form", "signed", "Dr. Amara Osei",
     "I consent to receive care via telehealth and understand its benefits and limitations."),
    ("Annual Physical — Visit Summary", "Visit Summary", "completed", "Dr. Amara Osei",
     "Summary: routine annual physical. All vitals within normal range. Labs ordered. Next visit in 12 months."),
    ("New Patient Intake Consent", "Consent Form", "pending", "Lumen Health",
     "Please review and sign our notice of privacy practices and financial responsibility agreement."),
    ("Lipid Panel — Lab Result", "Lab Result", "completed", "Dr. Liang Wei",
     "Total cholesterol 184 mg/dL, LDL 98, HDL 61, triglycerides 120. Within healthy range."),
]


POLICIES = [
    PolicyDef(role="tenant_admin", default_access="full", rules=[]),
    PolicyDef(role="tenant_user", default_access="none", rules=[
        PolicyRule(entity="provider", can_read=True),
        PolicyRule(entity="clinic_service", can_read=True),
        PolicyRule(entity="patient", can_read=True, can_create=True, can_update=True,
                   filter_field="owner_username", filter_match="$user.name"),
        # FIELD-LEVEL RBAC: patient sees their appointment but NOT the provider's notes/diagnosis/billing.
        PolicyRule(entity="appointment", can_read=True, can_create=True, can_update=True,
                   filter_field="owner_username", filter_match="$user.name",
                   hidden_fields=["clinical_notes", "diagnosis", "internal_billing_code"]),
        PolicyRule(entity="document", can_read=True, can_create=True, can_update=True,
                   filter_field="owner_username", filter_match="$user.name"),
    ]),
]


# ── Workflows ────────────────────────────────────────────────────────────────────
WORKFLOW_DEFINITIONS = [
    {
        "workflow_id": "appointment_confirmation", "display_name": "Appointment Confirmation",
        "description": "Emails the patient and adds the visit to the clinic's Google Calendar when an appointment is booked.",
        "version": "1.1.0", "enabled": True, "status": "Active", "on_error": "continue",
        "input_schema": {"patient_email": {"type": "string", "required": False},
                         "patient_name": {"type": "string", "required": False},
                         "provider_name": {"type": "string", "required": False},
                         "start_time": {"type": "string", "required": False},
                         "end_time": {"type": "string", "required": False},
                         "reason": {"type": "string", "required": False}},
        "steps": [
            {"id": "email", "type": "service_call", "service": "email", "operation": "send_email", "on_error": "continue",
             "input_map": {"to_email": "{{input.patient_email}}", "subject": "Your Lumen Health appointment is booked",
                           "body_html": "<p>Hi {{input.patient_name}},</p><p>Your appointment with {{input.provider_name}} on {{input.start_time}} is booked. We'll send a reminder beforehand. Reply to reschedule.</p><p>— Lumen Health</p>"}},
            # Drop the visit onto the clinic's Google Calendar — a REAL event via google_calendar.create_event.
            {"id": "calendar", "type": "service_call", "service": "google_calendar", "operation": "create_event", "on_error": "continue",
             "input_map": {"summary": "Lumen Health — {{input.patient_name}} with {{input.provider_name}}",
                           "start_time": "{{input.start_time}}", "end_time": "{{input.end_time}}",
                           "timezone": "America/New_York",
                           "description": "Visit reason: {{input.reason}}. Patient: {{input.patient_name}} ({{input.patient_email}}). Provider: {{input.provider_name}}."}},
        ],
    },
    {
        "workflow_id": "appointment_reminder", "display_name": "Appointment Reminder",
        "description": "Emails and texts the patient a reminder, then stamps the appointment.",
        "version": "1.0.0", "enabled": True, "status": "Active", "on_error": "continue",
        "input_schema": {"appointment_uuid": {"type": "string", "required": True},
                         "patient_email": {"type": "string", "required": False},
                         "patient_phone": {"type": "string", "required": False},
                         "provider_name": {"type": "string", "required": False},
                         "start_time": {"type": "string", "required": False}},
        "steps": [
            {"id": "email", "type": "service_call", "service": "email", "operation": "send_email", "on_error": "continue",
             "input_map": {"to_email": "{{input.patient_email}}", "subject": "Reminder: your Lumen Health visit",
                           "body_html": "<p>A friendly reminder of your appointment with {{input.provider_name}} on {{input.start_time}}.</p>"}},
            {"id": "sms", "type": "service_call", "service": "sms", "operation": "send_sms", "on_error": "continue",
             "input_map": {"to": "{{input.patient_phone}}",
                           "body": "Lumen Health reminder: your visit with {{input.provider_name}} is on {{input.start_time}}."}},
            {"id": "stamp", "type": "crud_operation", "operation": "update", "object_type": "lumen:appointment",
             "record_uuid": "{{input.appointment_uuid}}", "data": {"reminded_at": "{{context.timestamp}}"}},
        ],
    },
]

EVENT_BINDINGS = [
    {"event": "@create:lumen:appointment", "workflow_id": "appointment_confirmation",
     "input_map": {"patient_email": "patient_email", "patient_name": "patient_name",
                   "provider_name": "provider_name", "start_time": "start_time",
                   "end_time": "end_time", "reason": "reason"}},
]


def seed_test_data(s, base, domain, tenant_uuid, progress):
    nb = 0
    for i, p in enumerate(PROVIDERS):
        name, cred, spec, bio, langs, yrs, rating = p
        rec = {"full_name": name, "credential": cred, "specialty": spec, "bio": bio, "languages": langs,
               "years_experience": yrs, "accepting_new": True, "rating": rating, "photo": ux(PV[i % len(PV)]),
               "sort_order": i, "display_name": "%s, %s" % (name, cred), "description": "%s · %s" % (spec, langs)}
        if seed_record(s, base, domain, "Provider", rec, progress=progress, tenant_name="default-tenant"):
            nb += 1
    progress.ok("Seeded %d Providers." % nb)

    ns = 0
    for i, sv in enumerate(SERVICES):
        nm, spec, dur, price, desc, tele = sv
        rec = {"service_name": nm, "specialty": spec, "duration_min": dur, "self_pay_price": price,
               "description": desc, "telehealth": tele, "image": ux(SV[i % len(SV)]), "sort_order": i,
               "display_name": nm, "description": desc}
        if seed_record(s, base, domain, "ClinicService", rec, progress=progress, tenant_name="default-tenant"):
            ns += 1
    progress.ok("Seeded %d Services." % ns)

    patient = {"full_name": "Daniel Brooks", "email": PATIENT_EMAIL, "phone": "(415) 555-0193",
               "dob": "1989-04-12", "sex": "Male", "insurance_provider": "BlueCross", "member_id": "BC-44820193",
               "allergies": "Penicillin", "owner_username": PATIENT_EMAIL,
               "display_name": "Daniel Brooks", "description": "Patient · BlueCross"}
    seed_record(s, base, domain, "Patient", patient, progress=progress, tenant_name="default-tenant")
    progress.ok("Seeded patient profile.")

    na = 0
    for (prov, svc, spec, doff, hour, state, vtype, reason, notes, dxs, bill) in APPTS:
        rec = {"patient_name": "Daniel Brooks", "patient_email": PATIENT_EMAIL, "patient_phone": "(415) 555-0193",
               "provider_name": prov, "service_name": svc, "specialty": spec,
               "start_time": dt(doff, hour), "end_time": dt(doff, hour, 30), "appt_state": state, "visit_type": vtype,
               "reason": reason, "location": "Lumen Health — Downtown", "room": "%d" % (200 + na),
               "clinical_notes": notes, "diagnosis": dxs, "internal_billing_code": bill,
               "owner_username": PATIENT_EMAIL, "display_name": "%s with %s" % (svc, prov),
               "description": "%s · %s" % (spec, state)}
        if seed_record(s, base, domain, "Appointment", rec, progress=progress, tenant_name="default-tenant"):
            na += 1
    progress.ok("Seeded %d Appointments." % na)

    nd = 0
    for (title, dtype, dstate, prov, body) in DOCUMENTS:
        rec = {"title": title, "doc_type": dtype, "doc_state": dstate, "provider_name": prov, "body": body,
               "patient_email": PATIENT_EMAIL, "owner_username": PATIENT_EMAIL,
               "signed_at": (dt(-3, 10) if dstate in ("signed", "completed") else None),
               "display_name": title, "description": dtype}
        rec = {k: v for k, v in rec.items() if v is not None}
        if seed_record(s, base, domain, "Document", rec, progress=progress, tenant_name="default-tenant"):
            nd += 1
    progress.ok("Seeded %d Documents." % nd)


def main():
    setup = AppSetup(AppConfig(), ALL_SCHEMAS, PUBLIC_SCHEMAS)
    setup.run(seed_fn=seed_test_data, policies=POLICIES,
              workflow_definitions=WORKFLOW_DEFINITIONS, event_bindings=EVENT_BINDINGS)


if __name__ == "__main__":
    main()
