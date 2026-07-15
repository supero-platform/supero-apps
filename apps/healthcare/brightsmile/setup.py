import sys, os, datetime
sys.path.insert(0, os.path.dirname(__file__))
from supero.app_setup import AppSetup, PolicyDef, PolicyRule, make_seed_record
from config import AppConfig
from schemas import ALL_SCHEMAS, PUBLIC_SCHEMAS, SUPERO_APP_NAMESPACE

seed_record = make_seed_record(SUPERO_APP_NAMESPACE)
PATIENT_EMAIL = "patient@brightsmile.dental"


def ux(pid, w=900):
    b = "https://images.unsplash.com/photo-" + pid + "?auto=format&fit=crop&q=80"
    return {"url": "%s&w=%d&h=%d" % (b, w, w), "thumbnail_url": "%s&w=500&h=500" % b}


def dt(days, hour, minute=0):
    d = datetime.datetime.utcnow() + datetime.timedelta(days=days)
    return d.replace(hour=hour, minute=minute, second=0, microsecond=0).isoformat() + "Z"


# Verified-200 Unsplash photo IDs.
LOC_IMG = ['1588776814546-1ffcf47267a5', '1629909613654-28e377c37b09',
           '1606811841689-23dfddce3e95', '1588776813677-77aaf5595b83']
# Professional people headshots for dentists.
DEN_IMG = ['1559839734-2b71ea197ec2', '1622253692010-333f2da6031d', '1582750433449-648ed127bb54',
           '1537368910025-700350fe46c7', '1594824476967-48c8b964273f', '1573496359142-b8d87734a5a2',
           '1651008376811-b90baee60c1f', '1612349317150-e413f6a5b16d']
# Dental / clinical service imagery.
SVC_IMG = ['1606811841689-23dfddce3e95', '1612277795421-9bc7706a4a34', '1576091160399-112ba8d25d1d',
           '1559757148-5c350d0d3c56', '1607990281513-2c110a25bd8c', '1631815588090-d4bfec5b1ccb',
           '1598256989800-fe5f95da9787', '1576091160550-2173dba999ef', '1620916566398-39f1143ab7be',
           '1598257006458-087169a1f08d']

# (name, address, phone, hours, neighborhood)
LOCATIONS = [
    ("BrightSmile — Tribeca", "120 Hudson St, New York, NY 10013", "(212) 555-0142",
     "Mon–Fri 8a–6p · Sat 9a–2p", "Tribeca"),
    ("BrightSmile — Park Slope", "284 7th Ave, Brooklyn, NY 11215", "(718) 555-0188",
     "Mon–Fri 8a–7p · Sat 9a–3p", "Park Slope"),
    ("BrightSmile — SoMa", "655 Folsom St, San Francisco, CA 94107", "(415) 555-0119",
     "Mon–Fri 8a–6p", "SoMa"),
    ("BrightSmile — Marina", "2050 Chestnut St, San Francisco, CA 94123", "(415) 555-0176",
     "Mon–Fri 9a–6p · Sat 10a–2p", "Marina District"),
]

# (full_name, credential, specialty, bio, languages, location_name, rating, accepting_new)
DENTISTS = [
    ("Dr. Priya Sharma", "DDS", "General",
     "Family and general dentistry with a calm, gentle approach for nervous patients.", "English, Hindi", "BrightSmile — Tribeca", 4.9, True),
    ("Dr. Marcus Webb", "DMD", "Orthodontics",
     "Invisalign and braces specialist helping kids and adults achieve confident smiles.", "English", "BrightSmile — Tribeca", 4.8, True),
    ("Dr. Elena Rossi", "DDS", "Cosmetic",
     "Veneers, whitening and smile makeovers with a meticulous, artistic eye.", "English, Italian", "BrightSmile — Park Slope", 5.0, True),
    ("Dr. James Okafor", "DDS", "Periodontics",
     "Gum health and dental-implant expert focused on long-term, comfortable outcomes.", "English", "BrightSmile — Park Slope", 4.7, True),
    ("Dr. Mei Chen", "DMD", "Endodontics",
     "Root-canal specialist using modern microscopy for virtually painless treatment.", "English, Mandarin", "BrightSmile — SoMa", 4.9, True),
    ("Dr. Sofia Alvarez", "DDS", "Pediatric",
     "Board-certified pediatric dentist making first visits fun and fear-free.", "English, Spanish", "BrightSmile — SoMa", 5.0, True),
    ("Dr. Daniel Park", "DMD", "Oral Surgery",
     "Wisdom-tooth extraction and surgical implants with sedation options.", "English, Korean", "BrightSmile — Marina", 4.8, True),
    ("Dr. Aisha Bello", "DDS", "General",
     "Preventive and restorative care with a focus on patient education.", "English, French", "BrightSmile — Marina", 4.8, True),
]

# (service_name, category, price, duration_min, description)
SERVICES = [
    ("New Patient Exam & X-Rays", "Preventive", 0.0, 45,
     "A complete first visit: digital X-rays, oral-cancer screening and a personalized plan."),
    ("Routine Cleaning", "Preventive", 120.0, 45,
     "Professional cleaning, polish and fluoride to keep your smile healthy."),
    ("Tooth-Colored Filling", "Restorative", 220.0, 45,
     "Discreet composite filling that restores a cavity and matches your tooth."),
    ("Porcelain Crown", "Restorative", 1150.0, 90,
     "A custom crown that protects and restores a damaged or weak tooth."),
    ("Professional Whitening", "Cosmetic", 450.0, 60,
     "In-office whitening for a noticeably brighter smile in a single visit."),
    ("Porcelain Veneers", "Cosmetic", 1400.0, 90,
     "Thin custom shells that transform the shape, color and alignment of your smile."),
    ("Invisalign Consultation", "Orthodontics", 0.0, 30,
     "A 3D scan and treatment preview to see your future straight smile."),
    ("Root Canal Therapy", "Restorative", 980.0, 90,
     "Modern, comfortable root-canal treatment to save an infected tooth."),
    ("Wisdom Tooth Extraction", "Surgical", 380.0, 60,
     "Safe surgical removal with sedation options and clear aftercare."),
    ("Emergency Toothache Visit", "Emergency", 150.0, 30,
     "Same-day relief for pain, swelling or a broken tooth — walk-ins welcome."),
]

# Appointments: (dentist, service, location, day_offset, hour, state, reason, notes, diagnosis)
APPTS = [
    ("Dr. Priya Sharma", "New Patient Exam & X-Rays", "BrightSmile — Tribeca", -28, 9, "completed",
     "First visit, overdue for a checkup.",
     "Full series of bitewings taken. Mild gingivitis lower anterior. One small cavity #19 (lower left molar). Reviewed brushing technique and recommended electric toothbrush. Scheduled filling.",
     "Dental caries #19 (K02.9); gingivitis"),
    ("Dr. Priya Sharma", "Tooth-Colored Filling", "BrightSmile — Tribeca", -14, 10, "completed",
     "Filling for cavity found at exam.",
     "Composite restoration #19 placed under local anesthetic. Tolerated well. Occlusion checked and adjusted. No post-op sensitivity expected.",
     "Restoration of caries #19"),
    ("Dr. Elena Rossi", "Professional Whitening", "BrightSmile — Park Slope", -6, 14, "completed",
     "Wants a brighter smile before a wedding.",
     "In-office whitening completed, 3 shades lighter (A3 to A1). Mild transient sensitivity, advised desensitizing toothpaste for one week. Excellent candidate for veneers later.",
     "Cosmetic whitening — no pathology"),
    ("Dr. Marcus Webb", "Invisalign Consultation", "BrightSmile — Tribeca", 2, 11, "confirmed",
     "Interested in straightening crowded lower teeth.", "", ""),
    ("Dr. Mei Chen", "Root Canal Therapy", "BrightSmile — SoMa", 4, 13, "confirmed",
     "Lingering pain on upper right when chewing.", "", ""),
    ("Dr. Aisha Bello", "Routine Cleaning", "BrightSmile — Marina", 9, 9, "requested",
     "Due for my six-month cleaning.", "", ""),
    ("Dr. Daniel Park", "Wisdom Tooth Extraction", "BrightSmile — Marina", 12, 15, "requested",
     "Lower left wisdom tooth aching.", "", ""),
    ("Dr. Priya Sharma", "Emergency Toothache Visit", "BrightSmile — Tribeca", -2, 16, "cancelled",
     "Sharp pain, but it settled before the visit.", "", ""),
]

# Treatments: (name, category, tooth, cost, state, dentist, notes)
TREATMENTS = [
    ("Porcelain Crown", "Restorative", "#3 (upper right molar)", 1150.0, "proposed", "Dr. Mei Chen",
     "Recommended after root canal to protect the tooth long-term."),
    ("Porcelain Veneers (4 upper)", "Cosmetic", "#7–#10", 5600.0, "proposed", "Dr. Elena Rossi",
     "Optional cosmetic upgrade to perfect the smile line after whitening."),
    ("Tooth-Colored Filling", "Restorative", "#19 (lower left molar)", 220.0, "completed", "Dr. Priya Sharma",
     "Completed at the last visit — composite restoration."),
    ("Invisalign — Full Treatment", "Orthodontics", "Lower arch", 4200.0, "accepted", "Dr. Marcus Webb",
     "Patient accepted the plan; impressions scheduled at next visit."),
]


POLICIES = [
    PolicyDef(role="tenant_admin", default_access="full", rules=[]),
    PolicyDef(role="tenant_user", default_access="none", rules=[
        PolicyRule(entity="location", can_read=True),
        PolicyRule(entity="dentist", can_read=True),
        PolicyRule(entity="dental_service", can_read=True),
        PolicyRule(entity="patient", can_read=True, can_create=True, can_update=True,
                   filter_field="owner_username", filter_match="$user.name"),
        # FIELD-LEVEL RBAC (headline): patient sees their appointment but NOT the dentist's notes/diagnosis.
        PolicyRule(entity="appointment", can_read=True, can_create=True, can_update=True,
                   filter_field="owner_username", filter_match="$user.name",
                   hidden_fields=["chart_notes", "diagnosis"]),
        PolicyRule(entity="treatment", can_read=True, can_create=True, can_update=True,
                   filter_field="owner_username", filter_match="$user.name"),
    ]),
]


# ── Workflows ────────────────────────────────────────────────────────────────────
WORKFLOW_DEFINITIONS = [
    {
        "workflow_id": "appointment_confirmation", "display_name": "Appointment Confirmation",
        "description": "Emails the patient when an appointment is booked.",
        "version": "1.0.0", "enabled": True, "status": "Active", "on_error": "continue",
        "input_schema": {"patient_email": {"type": "string", "required": False},
                         "patient_name": {"type": "string", "required": False},
                         "dentist_name": {"type": "string", "required": False},
                         "location_name": {"type": "string", "required": False},
                         "start_time": {"type": "string", "required": False}},
        "steps": [
            {"id": "email", "type": "service_call", "service": "email", "operation": "send_email", "on_error": "continue",
             "input_map": {"to_email": "{{input.patient_email}}", "subject": "Your BrightSmile appointment request",
                           "body_html": "<p>Hi {{input.patient_name}},</p><p>Thanks for booking with BrightSmile! We received your request to see {{input.dentist_name}} at {{input.location_name}} on {{input.start_time}}. Our front desk will confirm shortly. Reply to this email to reschedule.</p><p>— The BrightSmile team · Modern dental care, close to home.</p>"}},
        ],
    },
    {
        # SAGA: email + sms then stamp reminded_at. Compensation on failure clears the stamp.
        "workflow_id": "appointment_reminder", "display_name": "Appointment Reminder",
        "description": "Emails and texts the patient a reminder, then stamps the appointment (saga with compensation).",
        "version": "1.0.0", "enabled": True, "status": "Active", "on_error": "compensate",
        "input_schema": {"appointment_uuid": {"type": "string", "required": True},
                         "patient_email": {"type": "string", "required": False},
                         "patient_phone": {"type": "string", "required": False},
                         "dentist_name": {"type": "string", "required": False},
                         "location_name": {"type": "string", "required": False},
                         "start_time": {"type": "string", "required": False}},
        "steps": [
            {"id": "email", "type": "service_call", "service": "email", "operation": "send_email", "on_error": "continue",
             "input_map": {"to_email": "{{input.patient_email}}", "subject": "Reminder: your BrightSmile visit",
                           "body_html": "<p>A friendly reminder of your appointment with {{input.dentist_name}} at {{input.location_name}} on {{input.start_time}}. See you soon!</p>"}},
            {"id": "sms", "type": "service_call", "service": "sms", "operation": "send_sms", "on_error": "continue",
             "input_map": {"to": "{{input.patient_phone}}",
                           "body": "BrightSmile reminder: your visit with {{input.dentist_name}} is on {{input.start_time}}."}},
            {"id": "stamp", "type": "crud_operation", "operation": "update", "object_type": "brightsmile:appointment",
             "record_uuid": "{{input.appointment_uuid}}", "data": {"reminded_at": "{{context.timestamp}}"},
             "compensate": {"type": "crud_operation", "operation": "update", "object_type": "brightsmile:appointment",
                            "record_uuid": "{{input.appointment_uuid}}", "data": {"reminded_at": None}}},
        ],
    },
    {
        "workflow_id": "treatment_accepted", "display_name": "Treatment Accepted",
        "description": "Emails the patient a confirmation when they accept a proposed treatment.",
        "version": "1.0.0", "enabled": True, "status": "Active", "on_error": "continue",
        "input_schema": {"patient_email": {"type": "string", "required": False},
                         "treatment_name": {"type": "string", "required": False},
                         "dentist_name": {"type": "string", "required": False},
                         "cost": {"type": "string", "required": False}},
        "steps": [
            {"id": "email", "type": "service_call", "service": "email", "operation": "send_email", "on_error": "continue",
             "input_map": {"to_email": "{{input.patient_email}}", "subject": "Your BrightSmile treatment plan is confirmed",
                           "body_html": "<p>Great news — you've accepted <b>{{input.treatment_name}}</b> with {{input.dentist_name}}. Our team will reach out to schedule it. Thank you for trusting BrightSmile with your smile.</p>"}},
        ],
    },
]

EVENT_BINDINGS = [
    {"event": "@create:brightsmile:appointment", "workflow_id": "appointment_confirmation",
     "input_map": {"patient_email": "patient_email", "patient_name": "patient_name",
                   "dentist_name": "dentist_name", "location_name": "location_name", "start_time": "start_time"}},
]


def seed_test_data(s, base, domain, tenant_uuid, progress):
    nl = 0
    for i, (name, addr, phone, hours, hood) in enumerate(LOCATIONS):
        rec = {"name": name, "address": addr, "phone": phone, "hours": hours, "neighborhood": hood,
               "image": ux(LOC_IMG[i % len(LOC_IMG)]), "sort_order": i,
               "display_name": name, "description": "%s · %s" % (hood, addr)}
        if seed_record(s, base, domain, "Location", rec, progress=progress, tenant_name="default-tenant"):
            nl += 1
    progress.ok("Seeded %d Locations." % nl)

    nd = 0
    for i, (name, cred, spec, bio, langs, loc, rating, accept) in enumerate(DENTISTS):
        rec = {"full_name": name, "credential": cred, "specialty": spec, "bio": bio, "languages": langs,
               "location_name": loc, "rating": rating, "accepting_new": accept,
               "photo": ux(DEN_IMG[i % len(DEN_IMG)]), "sort_order": i,
               "display_name": "%s, %s" % (name, cred), "description": "%s · %s" % (spec, loc)}
        if seed_record(s, base, domain, "Dentist", rec, progress=progress, tenant_name="default-tenant"):
            nd += 1
    progress.ok("Seeded %d Dentists." % nd)

    ns = 0
    for i, (nm, cat, price, dur, desc) in enumerate(SERVICES):
        rec = {"service_name": nm, "category": cat, "price": price, "duration_min": dur,
               "description": desc, "image": ux(SVC_IMG[i % len(SVC_IMG)]), "sort_order": i,
               "display_name": nm, "description": desc}
        if seed_record(s, base, domain, "DentalService", rec, progress=progress, tenant_name="default-tenant"):
            ns += 1
    progress.ok("Seeded %d Services." % ns)

    patient = {"full_name": "Chris Bennett", "email": PATIENT_EMAIL, "phone": "(212) 555-0207",
               "dob": "1991-08-19", "insurance_provider": "Delta Dental", "member_id": "DD-7741902",
               "location_name": "BrightSmile — Tribeca", "owner_username": PATIENT_EMAIL,
               "display_name": "Chris Bennett", "description": "Patient · Delta Dental"}
    seed_record(s, base, domain, "Patient", patient, progress=progress, tenant_name="default-tenant")
    progress.ok("Seeded patient profile.")

    na = 0
    for (den, svc, loc, doff, hour, state, reason, notes, dxs) in APPTS:
        rec = {"patient_name": "Chris Bennett", "patient_email": PATIENT_EMAIL, "patient_phone": "(212) 555-0207",
               "dentist_name": den, "service_name": svc, "location_name": loc,
               "start_time": dt(doff, hour), "end_time": dt(doff, hour, 45), "appt_state": state,
               "reason": reason, "chart_notes": notes, "diagnosis": dxs,
               "owner_username": PATIENT_EMAIL, "display_name": "%s with %s" % (svc, den),
               "description": "%s · %s" % (loc, state)}
        if seed_record(s, base, domain, "Appointment", rec, progress=progress, tenant_name="default-tenant"):
            na += 1
    progress.ok("Seeded %d Appointments." % na)

    nt = 0
    for (nm, cat, tooth, cost, state, den, notes) in TREATMENTS:
        rec = {"name": nm, "category": cat, "tooth": tooth, "cost": cost, "treatment_state": state,
               "patient_email": PATIENT_EMAIL, "dentist_name": den, "notes": notes,
               "owner_username": PATIENT_EMAIL, "display_name": "%s · %s" % (nm, tooth),
               "description": "%s · %s" % (cat, state)}
        if seed_record(s, base, domain, "Treatment", rec, progress=progress, tenant_name="default-tenant"):
            nt += 1
    progress.ok("Seeded %d Treatments." % nt)


def main():
    setup = AppSetup(AppConfig(), ALL_SCHEMAS, PUBLIC_SCHEMAS)
    setup.run(seed_fn=seed_test_data, policies=POLICIES,
              workflow_definitions=WORKFLOW_DEFINITIONS, event_bindings=EVENT_BINDINGS)


if __name__ == "__main__":
    main()
