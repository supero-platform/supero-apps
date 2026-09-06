# setup.py — policies, the booking-confirmation workflow, and multi-tenant seed data for PULSE
import sys, os, datetime
sys.path.insert(0, os.path.dirname(__file__))
from supero.app_setup import AppSetup, PolicyDef, PolicyRule, make_seed_record, ref_link
from config import AppConfig
from schemas import ALL_SCHEMAS, PUBLIC_SCHEMAS, SUPERO_APP_NAMESPACE

seed_record = make_seed_record(ALL_SCHEMAS)   # MUST be module-level


def ux(pid, w=1600, h=1100):
    # Curated, reliable Unsplash CDN images (direct images.unsplash.com, q=80).
    # auto=format keeps them crisp+fast; thumbnail_url is the card size.
    base = "https://images.unsplash.com/photo-" + pid + "?auto=format&fit=crop&q=80"
    return {"url": "%s&w=%d&h=%d" % (base, w, h),
            "thumbnail_url": "%s&w=800&h=600" % base}


def _now():
    return datetime.datetime.utcnow().replace(microsecond=0).isoformat() + "Z"


def _in_days(d, hour=18):
    t = datetime.datetime.utcnow() + datetime.timedelta(days=d)
    t = t.replace(hour=hour, minute=0, second=0, microsecond=0)
    return t.isoformat() + "Z"


def _plus_minutes(iso, minutes):
    try:
        dt = datetime.datetime.fromisoformat(iso.replace("Z", "+00:00")) + datetime.timedelta(minutes=minutes)
        return dt.replace(tzinfo=None).isoformat() + "Z"
    except Exception:
        return iso


# ============================================================================
# ACCESS CONTROL. tenant_user is fail-closed (default_access="none").
#   - Location / Trainer / FitnessClass: SHARED read (public catalog).
#   - ClassSession: SHARED read (members browse the schedule), staff manage it.
#   - Booking / Membership / Payment / Member / CheckIn: PRIVATE, owner-scoped
#     so each member sees only their own rows. (Server filters by owner_username;
#     the platform auto-stamps it to the creator on CREATE.)
#   Multi-tenancy is enforced ON TOP of this automatically: every read/write is
#   already scoped to the caller's active tenant (their location).
# ============================================================================
POLICIES = [
    # DEMO-ACCOUNT-SCOPE-V1 — these logins are published so anyone can try the demo,
    # so they must not double as a skeleton key over every entity in the domain.
    # Scoped to this app's own entities. Delete is withheld: no screen offers it, so
    # a visitor cannot destroy the records other visitors are reading.
    PolicyDef(role="tenant_admin", default_access="none", rules=[
        PolicyRule(entity="location", can_read=True, can_create=True, can_update=True),
        PolicyRule(entity="trainer", can_read=True, can_create=True, can_update=True),
        PolicyRule(entity="fitness_class", can_read=True, can_create=True, can_update=True),
        PolicyRule(entity="class_session", can_read=True, can_create=True, can_update=True),
        PolicyRule(entity="booking", can_read=True, can_create=True, can_update=True),
        PolicyRule(entity="membership", can_read=True, can_create=True, can_update=True),
        PolicyRule(entity="payment", can_read=True, can_create=True, can_update=True),
        PolicyRule(entity="member", can_read=True, can_create=True, can_update=True),
        PolicyRule(entity="check_in", can_read=True, can_create=True, can_update=True),
    ]),
    PolicyDef(role="tenant_user", default_access="none", rules=[
        PolicyRule(entity="location", can_read=True),
        PolicyRule(entity="trainer", can_read=True),
        PolicyRule(entity="fitness_class", can_read=True),
        PolicyRule(entity="class_session", can_read=True),
        # STAFF-ONLY-FIELDS-V1 — a member reads their OWN booking, but the studio's
        # internal notes about them are stripped server-side.
        PolicyRule(entity="booking", can_read=True, can_create=True, can_update=True,
                   filter_field="owner_username", filter_match="$user.name",
                   hidden_fields=["notes"]),
        PolicyRule(entity="membership", can_read=True, can_create=True, can_update=True,
                   filter_field="owner_username", filter_match="$user.name"),
        PolicyRule(entity="payment", can_read=True, can_create=True,
                   filter_field="owner_username", filter_match="$user.name"),
        PolicyRule(entity="member", can_read=True, can_create=True, can_update=True,
                   filter_field="owner_username", filter_match="$user.name"),
        PolicyRule(entity="check_in", can_read=True, can_create=True,
                   filter_field="owner_username", filter_match="$user.name"),
    ]),
]

# ============================================================================
# WORKFLOW: when staff confirm a booking, email + SMS the member in parallel,
# then stamp workflow_status="processed" + processed_at. object_type is
# namespace-qualified: "pulsefitness:booking".
# ============================================================================
WORKFLOW_DEFINITIONS = [{
    "workflow_id": "booking_confirmed",
    "display_name": "Booking Confirmed",
    "description": "Notify the member by email and SMS, then mark the booking processed.",
    "version": "1.0.0", "enabled": True, "status": "Active",
    "on_error": "continue",
    "input_schema": {
        "booking_uuid": {"type": "string", "required": True},
        "member_email": {"type": "string", "required": True},
        "member_phone": {"type": "string", "required": False},
        "member_name": {"type": "string", "required": False},
        "class_name": {"type": "string", "required": False},
    },
    "steps": [
        {"id": "notify", "type": "parallel", "steps": [
            {"id": "email", "type": "service_call", "service": "email", "operation": "send_email",
             "on_error": "continue",
             "input_map": {
                 "to_email": "{{input.member_email}}",
                 "subject": "Your Pulse class is confirmed",
                 "body_html": "<p>Hi {{input.member_name}},</p><p>You're booked into "
                              "{{input.class_name}} at Pulse. Bring water and arrive 10 minutes "
                              "early. See you on the floor!</p><p>— The Pulse team</p>",
             }},
            {"id": "sms", "type": "service_call", "service": "sms", "operation": "send_sms",
             "on_error": "continue",
             "input_map": {
                 "to_number": "{{input.member_phone}}",
                 "body": "Pulse: your {{input.class_name}} class is confirmed. See you soon!",
             }},
        ]},
        {"id": "done", "type": "crud_operation", "operation": "update",
         "object_type": "pulsefitness:booking",
         "record_uuid": "{{input.booking_uuid}}",
         "data": {"workflow_status": "processed", "processed_at": "{{context.timestamp}}"}},
    ],
}]

EVENT_BINDINGS = []

# ============================================================================
# SEED DATA — one rich dataset PER LOCATION TENANT (downtown / westside /
# harborpoint). Each location: Location row + 5 Trainers + 8-12 FitnessClasses
# (catalog entity → real grid) + scheduled ClassSessions + members/bookings/etc.
# default-tenant gets NOTHING member-facing (HQ admin-only).
# ============================================================================

# Per-location catalogs (FitnessClass = the 8-12 catalog entity per tenant).
CLASS_TEMPLATES = [
    ("vinyasa-flow", "Vinyasa Flow Yoga", "yoga", "gentle", 60, 24, 22.0, True,
     "Breath-led vinyasa to build mobility and calm — all levels welcome.", "1588286840104-8957b019727f"),
    ("power-hiit", "Power HIIT", "hiit", "intense", 45, 20, 26.0, True,
     "Twenty rounds of explosive intervals to torch calories and build grit.", "1517836357463-d25dfeac3438"),
    ("rhythm-ride", "Rhythm Ride Spin", "spin", "intense", 45, 30, 24.0, True,
     "A beat-driven indoor cycling ride through hills, sprints and climbs.", "1534258936925-c58bed479fcb"),
    ("barbell-strength", "Barbell Strength", "strength", "moderate", 60, 16, 28.0, True,
     "Coached compound lifts — squat, press, deadlift — to get genuinely strong.", "1534438327276-14e5300c3a48"),
    ("reformer-pilates", "Reformer Pilates", "pilates", "moderate", 50, 12, 30.0, False,
     "Spring-loaded reformer work for deep core control and long, lean strength.", "1518611012118-696072aa579a"),
    ("sunrise-yoga", "Sunrise Yoga", "yoga", "gentle", 45, 24, 20.0, False,
     "A slow, grounding morning practice to set an intentional tone for the day.", "1506126613408-eca07ce68773"),
    ("boxing-conditioning", "Boxing Conditioning", "boxing", "intense", 50, 18, 27.0, False,
     "Bag work, footwork and conditioning rounds to build power and stamina.", "1549719386-74dfcbf7dbed"),
    ("mobility-reset", "Mobility Reset", "mobility", "gentle", 40, 20, 18.0, False,
     "Joint-by-joint mobility and recovery to move better and prevent injury.", "1599058917212-d750089bc07e"),
    ("metcon-burn", "MetCon Burn", "hiit", "intense", 50, 20, 25.0, False,
     "Metabolic conditioning circuits mixing kettlebells, rowing and bodyweight.", "1571019613454-1cb2f99b2d8b"),
    ("strength-foundations", "Strength Foundations", "strength", "gentle", 45, 16, 22.0, False,
     "A beginner-friendly intro to lifting mechanics, tempo and progressive load.", "1581009146145-b5ef050c2e1e"),
]

# Per-location trainer rosters (5 each).
TRAINER_PHOTOS = [
    "1567013127542-490d757e51fc", "1594381898411-846e7d193883", "1571019614242-c5c5dee9f50b",
    "1534368420009-621bfab424a8", "1517838277536-f5f99be501cd", "1583468982228-19f19164aee2",
    "1549476464-37392f717541", "1583454110551-21f2fa2afe61", "1607962837359-5e7e89f86776",
    "1546483875-ad9014c88eba", "1530645298377-82c8416d3f90", "1605296867304-46d5465a13f1",
    "1551836022-deb4988cc6c0", "1546069901-ba9599a7e63c", "1544005313-94ddf0286df2",
]

LOCATIONS = [
    {
        "tenant": "downtown",
        "loc": {"name": "pulse-downtown", "display_name": "Pulse Downtown",
                "description": "Our flagship two-floor studio in the heart of downtown with rooftop yoga.",
                "city": "Metro City", "address": "120 Market Street, Downtown",
                "phone": "+1 (555) 010-2020", "email": "downtown@pulsefitness.co",
                "opening_hours": "Mon–Fri 5:30am–10pm · Sat–Sun 7am–8pm",
                "tagline": "Where the city comes to move.",
                "tenant_key": "downtown", "is_featured": True,
                "amenities": ["rooftop studio", "sauna", "lockers", "smoothie bar", "towel service"],
                "hero_image": ux("1534438327276-14e5300c3a48"),
                "gallery": [ux("1517836357463-d25dfeac3438"), ux("1534258936925-c58bed479fcb")]},
        "trainers": [
            ("amara-singh", "Amara Singh", "Lead strength coach blending powerlifting with athletic conditioning.",
             ["strength", "powerlifting", "conditioning"], ["NASM-CPT", "USAW-L1"], 12),
            ("noah-bennett", "Noah Bennett", "Spin and HIIT instructor known for relentless, joyful energy.",
             ["spin", "hiit", "endurance"], ["Schwinn Cycling", "ACE-CPT"], 8),
            ("yuki-tanaka", "Yuki Tanaka", "Yoga teacher trained in Tokyo, leading our rooftop flows.",
             ["yoga", "mobility", "breathwork"], ["RYT-500"], 10),
            ("priya-rao", "Priya Rao", "Reformer Pilates specialist focused on core control and rehab.",
             ["pilates", "core", "rehab"], ["BASI Pilates", "NASM-CES"], 9),
            ("marcus-hale", "Marcus Hale", "Former boxer leading our conditioning and bag-work classes.",
             ["boxing", "conditioning", "footwork"], ["USA Boxing", "ACE-CPT"], 11),
        ],
    },
    {
        "tenant": "westside",
        "loc": {"name": "pulse-westside", "display_name": "Pulse Westside",
                "description": "A bright, airy neighborhood studio with a dedicated reformer Pilates room.",
                "city": "Metro City", "address": "88 Sunset Avenue, Westside",
                "phone": "+1 (555) 010-3030", "email": "westside@pulsefitness.co",
                "opening_hours": "Mon–Fri 6am–9pm · Sat–Sun 8am–6pm",
                "tagline": "Your neighborhood strength lab.",
                "tenant_key": "westside", "is_featured": True,
                "amenities": ["reformer studio", "childcare", "lockers", "free parking"],
                "hero_image": ux("1518611012118-696072aa579a"),
                "gallery": [ux("1518310383802-640c2de311b2"), ux("1571019613454-1cb2f99b2d8b")]},
        "trainers": [
            ("dana-cole", "Dana Cole", "Westside manager and barbell coach with a patient, technical eye.",
             ["strength", "barbell", "coaching"], ["NSCA-CSCS"], 14),
            ("ravi-menon", "Ravi Menon", "HIIT and MetCon coach who makes hard work feel like a team sport.",
             ["hiit", "metcon", "kettlebell"], ["CF-L2", "ACE-CPT"], 7),
            ("ella-novak", "Ella Novak", "Reformer Pilates lead with a background in dance and physiotherapy.",
             ["pilates", "mobility", "posture"], ["Polestar Pilates"], 9),
            ("sam-rivera", "Sam Rivera", "Yoga and mobility teacher focused on recovery and longevity.",
             ["yoga", "mobility", "recovery"], ["RYT-300", "FRC"], 6),
            ("theo-kim", "Theo Kim", "Spin instructor and endurance athlete with playlists to match.",
             ["spin", "endurance", "cardio"], ["Stages Cycling"], 5),
        ],
    },
    {
        "tenant": "harborpoint",
        "loc": {"name": "pulse-harborpoint", "display_name": "Pulse Harborpoint",
                "description": "A waterfront studio with harbor-view cardio and an outdoor training deck.",
                "city": "Harbor City", "address": "5 Pier Road, Harborpoint",
                "phone": "+1 (555) 010-4040", "email": "harborpoint@pulsefitness.co",
                "opening_hours": "Mon–Fri 5am–10pm · Sat–Sun 7am–7pm",
                "tagline": "Train by the water.",
                "tenant_key": "harborpoint", "is_featured": False,
                "amenities": ["outdoor deck", "sauna", "cold plunge", "lockers", "cafe"],
                "hero_image": ux("1571019613454-1cb2f99b2d8b"),
                "gallery": [ux("1599058917212-d750089bc07e"), ux("1581009146145-b5ef050c2e1e")]},
        "trainers": [
            ("zoe-fisher", "Zoe Fisher", "Harborpoint lead coach specializing in outdoor strength circuits.",
             ["strength", "outdoor", "conditioning"], ["NASM-CPT", "TRX"], 10),
            ("leo-martins", "Leo Martins", "Boxing and conditioning coach with national amateur experience.",
             ["boxing", "conditioning", "agility"], ["USA Boxing"], 12),
            ("ines-costa", "Ines Costa", "Yoga teacher leading sunrise sessions on the training deck.",
             ["yoga", "breathwork", "mobility"], ["RYT-500"], 8),
            ("hugo-bauer", "Hugo Bauer", "Spin and rowing coach building harbor-side endurance.",
             ["spin", "rowing", "endurance"], ["Concept2", "Stages"], 6),
            ("nadia-patel", "Nadia Patel", "Mobility and recovery specialist focused on injury prevention.",
             ["mobility", "recovery", "rehab"], ["FRC", "NASM-CES"], 7),
        ],
    },
]


def _seed_location_tenant(s, base, domain, entry, progress):
    """Seed one location's full dataset INTO its own tenant."""
    tn = entry["tenant"]
    loc = dict(entry["loc"])
    loc_name = loc["display_name"]

    loc_uuid = seed_record(s, base, domain, "Location", loc, progress=progress, tenant_name=tn)
    progress.ok("[%s] Seeded location." % tn)

    # Trainers (5).
    trainer_uuids = {}
    for i, (tname, tdisp, tdesc, specs, certs, yrs) in enumerate(entry["trainers"]):
        rec = {
            "name": tname, "display_name": tdisp, "description": tdesc,
            "bio": tdesc, "specialties": specs, "certifications": certs,
            "years_experience": yrs, "location_name": loc_name,
            "photo": ux(TRAINER_PHOTOS[i % len(TRAINER_PHOTOS)], 900, 1100),
        }
        u = seed_record(s, base, domain, "Trainer", rec, progress=progress, tenant_name=tn)
        if u:
            trainer_uuids[tname] = u
            if loc_uuid:
                ref_link(s, base, domain, SUPERO_APP_NAMESPACE, "Trainer", u, "Location", loc_uuid)
    progress.ok("[%s] Seeded %d trainers." % (tn, len(trainer_uuids)))

    # FitnessClass catalog (10 → the real grid).
    class_uuids = {}
    for (cname, cdisp, cat, intensity, dur, cap, price, feat, cdesc, pid) in CLASS_TEMPLATES:
        rec = {
            "name": cname, "display_name": cdisp, "description": cdesc,
            "category": cat, "intensity": intensity, "duration_minutes": dur,
            "capacity": cap, "drop_in_price": price, "is_featured": feat,
            "hero_image": ux(pid), "gallery": [ux(pid)],
        }
        u = seed_record(s, base, domain, "FitnessClass", rec, progress=progress, tenant_name=tn)
        if u:
            class_uuids[cname] = u
            if loc_uuid:
                ref_link(s, base, domain, SUPERO_APP_NAMESPACE, "FitnessClass", u, "Location", loc_uuid)
    progress.ok("[%s] Seeded %d classes." % (tn, len(class_uuids)))

    # Scheduled ClassSessions (extends booking → status + start_time + end_time mandatory).
    # A spread of statuses + upcoming/past times so the schedule + ops board look alive.
    trainer_list = list(entry["trainers"])
    session_plan = [
        ("vinyasa-flow", 0, 0, 18, "requested"),
        ("power-hiit", 1, 1, 19, "confirmed"),
        ("rhythm-ride", 2, 1, 7, "confirmed"),
        ("barbell-strength", 0, 2, 18, "requested"),
        ("reformer-pilates", 3, 2, 12, "confirmed"),
        ("boxing-conditioning", 4, 3, 19, "requested"),
        ("metcon-burn", 1, -1, 18, "completed"),
        ("sunrise-yoga", 2, -2, 7, "completed"),
    ]
    sess_uuids = {}
    sess_count = 0
    for (cname, tr_idx, day, hour, status) in session_plan:
        tmpl = next((c for c in CLASS_TEMPLATES if c[0] == cname), None)
        if not tmpl:
            continue
        cdisp, cat, dur, cap, price = tmpl[1], tmpl[2], tmpl[4], tmpl[5], tmpl[6]
        tr = trainer_list[tr_idx % len(trainer_list)]
        start = _in_days(day, hour)
        rec = {
            "name": "%s-%s-%d" % (cname, tn, day),
            "display_name": "%s — %s" % (cdisp, loc_name),
            "description": "%s session at %s." % (cdisp, loc_name),
            "class_name": cdisp, "category": cat, "trainer_name": tr[1],
            "location_name": loc_name, "room": "Studio %d" % (1 + (sess_count % 3)),
            "capacity": cap, "seats_booked": (sess_count * 3) % cap, "drop_in_price": price,
            "status": status, "start_time": start, "end_time": _plus_minutes(start, dur),
        }
        u = seed_record(s, base, domain, "ClassSession", rec, progress=progress, tenant_name=tn)
        if u:
            sess_uuids[cname] = u
            if class_uuids.get(cname):
                ref_link(s, base, domain, SUPERO_APP_NAMESPACE, "ClassSession", u, "FitnessClass", class_uuids[cname])
            if loc_uuid:
                ref_link(s, base, domain, SUPERO_APP_NAMESPACE, "ClassSession", u, "Location", loc_uuid)
            tr_u = trainer_uuids.get(tr[0])
            if tr_u:
                ref_link(s, base, domain, SUPERO_APP_NAMESPACE, "ClassSession", u, "Trainer", tr_u)
            sess_count += 1
    progress.ok("[%s] Seeded %d class sessions." % (tn, sess_count))

    return loc_name, loc_uuid, class_uuids, sess_uuids


def seed_test_data(s, base, domain, tenant_uuid, progress):
    # Map demo members to their home location tenant.
    demo_members = {
        "downtown": [
            {"username": "maya@example.com", "full": "Maya Okonkwo", "phone": "+15551230011",
             "tier": "unlimited", "goal": "Build strength and consistency", "photo": "1488161628813-04466f872be2"},
        ],
        "westside": [
            {"username": "leo@example.com", "full": "Leo Vance", "phone": "+15551230022",
             "tier": "flex", "goal": "Improve mobility and recovery", "photo": "1500648767791-00dcc994a43e"},
        ],
        "harborpoint": [],
    }

    for entry in LOCATIONS:
        tn = entry["tenant"]
        loc_name, loc_uuid, class_uuids, sess_uuids = _seed_location_tenant(s, base, domain, entry, progress)

        # Members + their membership / payment / booking / check-in (owner-scoped, in-tenant).
        for m in demo_members.get(tn, []):
            mem = {
                "name": m["full"].lower().replace(" ", "-"),
                "display_name": m["full"], "description": "Pulse member at %s." % loc_name,
                "owner_username": m["username"], "full_name": m["full"], "email": m["username"],
                "phone": m["phone"], "membership_tier": m["tier"], "join_date": _now()[:10],
                "location_name": loc_name, "goal": m["goal"],
                "photo": ux(m["photo"], 600, 600),
            }
            mem_uuid = seed_record(s, base, domain, "Member", mem, progress=progress, tenant_name=tn)
            if mem_uuid and loc_uuid:
                ref_link(s, base, domain, SUPERO_APP_NAMESPACE, "Member", mem_uuid, "Location", loc_uuid)

            # Membership (extends membership → status mandatory; seed initial "active").
            tier_price = {"flex": 49.0, "unlimited": 99.0, "elite": 149.0}.get(m["tier"], 49.0)
            mship = {
                "name": "%s-membership" % mem["name"], "display_name": "%s — %s" % (m["full"], m["tier"].title()),
                "description": "Active membership.", "owner_username": m["username"],
                "member_name": m["full"], "tier": m["tier"], "monthly_price": tier_price,
                "location_name": loc_name, "started_at": _now(), "renews_at": _in_days(30, 0),
                "status": "active",
            }
            mship_uuid = seed_record(s, base, domain, "Membership", mship, progress=progress, tenant_name=tn)
            if mship_uuid and mem_uuid:
                ref_link(s, base, domain, SUPERO_APP_NAMESPACE, "Membership", mship_uuid, "Member", mem_uuid)

            # Payment (extends payment → status + amount + currency mandatory; seed "captured").
            pay = {
                "name": "%s-pay-1" % mem["name"], "display_name": "%s — Membership payment" % m["full"],
                "description": "Monthly membership charge.", "owner_username": m["username"],
                "member_name": m["full"], "purpose": "membership", "location_name": loc_name,
                "status": "captured", "amount": tier_price, "currency": "USD",
            }
            pay_uuid = seed_record(s, base, domain, "Payment", pay, progress=progress, tenant_name=tn)
            if pay_uuid and mem_uuid:
                ref_link(s, base, domain, SUPERO_APP_NAMESPACE, "Payment", pay_uuid, "Member", mem_uuid)

            # A booking into an upcoming session (extends appointment → status+start+end mandatory).
            first_sess = next(iter(sess_uuids.items()), None)
            if first_sess:
                cname, sess_uuid = first_sess
                tmpl = next((c for c in CLASS_TEMPLATES if c[0] == cname), None)
                cdisp = tmpl[1] if tmpl else "Class"
                cprice = tmpl[6] if tmpl else 0.0
                start = _in_days(1, 19)
                bk = {
                    "name": "%s-booking-1" % mem["name"],
                    "display_name": "%s — %s" % (m["full"], cdisp),
                    "description": "Class reservation.", "owner_username": m["username"],
                    "member_name": m["full"], "member_email": m["username"], "member_phone": m["phone"],
                    "class_name": cdisp, "trainer_name": "", "location_name": loc_name,
                    "price": cprice, "status": "requested",
                    "start_time": start, "end_time": _plus_minutes(start, 60),
                }
                bk_uuid = seed_record(s, base, domain, "Booking", bk, progress=progress, tenant_name=tn)
                if bk_uuid:
                    ref_link(s, base, domain, SUPERO_APP_NAMESPACE, "Booking", bk_uuid, "ClassSession", sess_uuid)
                    if mem_uuid:
                        ref_link(s, base, domain, SUPERO_APP_NAMESPACE, "Booking", bk_uuid, "Member", mem_uuid)

                # A past check-in for attendance history.
                ci = {
                    "name": "%s-checkin-1" % mem["name"],
                    "display_name": "%s — checked in" % m["full"],
                    "description": "Attendance record.", "owner_username": m["username"],
                    "member_name": m["full"], "class_name": cdisp, "location_name": loc_name,
                    "checked_in_at": _in_days(-2, 18), "method": "app",
                }
                ci_uuid = seed_record(s, base, domain, "CheckIn", ci, progress=progress, tenant_name=tn)
                if ci_uuid and mem_uuid:
                    ref_link(s, base, domain, SUPERO_APP_NAMESPACE, "CheckIn", ci_uuid, "Member", mem_uuid)

        progress.ok("[%s] Seeded members, memberships, payments, bookings." % tn)

    progress.ok("Seeded %d Pulse locations across the chain." % len(LOCATIONS))


def main():
    setup = AppSetup(AppConfig(), ALL_SCHEMAS, PUBLIC_SCHEMAS)
    setup.run(seed_fn=seed_test_data, policies=POLICIES,
              workflow_definitions=WORKFLOW_DEFINITIONS, event_bindings=EVENT_BINDINGS)


if __name__ == "__main__":
    main()
