import sys, os, datetime
sys.path.insert(0, os.path.dirname(__file__))
from supero.app_setup import AppSetup, PolicyDef, PolicyRule, make_seed_record
from config import AppConfig
from schemas import ALL_SCHEMAS, PUBLIC_SCHEMAS, SUPERO_APP_NAMESPACE

seed_record = make_seed_record(SUPERO_APP_NAMESPACE)
MEMBER_EMAIL = "member@pulsefit.app"


def ux(pid, w=1000):
    b = "https://images.unsplash.com/photo-" + pid + "?auto=format&fit=crop&q=80"
    return {"url": "%s&w=%d&h=%d" % (b, w, w), "thumbnail_url": "%s&w=500&h=500" % b}


def days_ago(n):
    return (datetime.date.today() - datetime.timedelta(days=n)).isoformat()


# ── Validated Unsplash IDs ───────────────────────────────────────────────────────
CLUB_IMG = ['1534438327276-14e5300c3a48', '1540497077202-7c8a3999166f',
            '1517836357463-d25dfeac3438', '1571902943202-507ec2618e8f']
TRAINER_IMG = ['1567013127542-490d757e51fc', '1594381898411-846e7d193883',
               '1583454110551-21f2fa2afe61', '1438761681033-6461ffad8d80',
               '1500648767791-00dcc994a43e', '1534528741775-53994a69daeb',
               '1517841905240-472988babdf9', '1544005313-94ddf0286df2']
CLASS_IMG = ['1605296867304-46d5465a13f1', '1558611848-73f7eb4001a1',
             '1518611012118-696072aa579a', '1571019613454-1cb2f99b2d8b',
             '1581009146145-b5ef050c2e1e', '1549060279-7e168fcee0c2',
             '1532384748853-8f54a8f476e2', '1538805060514-97d9cc17730c',
             '1571388208497-71bedc66e932', '1599058917212-d750089bc07e',
             '1574680096145-d05b474e2155', '1571731956672-f2b94d7dd0cb',
             '1607990281513-2c110a25bd8c', '1623874514711-0f321325f318']

# ── Clubs ────────────────────────────────────────────────────────────────────────
# (name, neighborhood, address, phone, hours, amenities)
CLUBS = [
    ("PulseFit Downtown", "Financial District", "210 Market St, San Francisco, CA",
     "(415) 555-0110", "Mon–Fri 5a–11p · Sat–Sun 7a–9p",
     "Strength floor · Turf zone · 3 studios · Recovery lounge · Showers & towel service"),
    ("PulseFit Mission", "The Mission", "880 Valencia St, San Francisco, CA",
     "(415) 555-0142", "Mon–Fri 6a–10p · Sat–Sun 7a–8p",
     "Boxing ring · HIIT rig · Yoga loft · Smoothie bar · Lockers"),
    ("PulseFit Marina", "Marina District", "2150 Chestnut St, San Francisco, CA",
     "(415) 555-0188", "Mon–Fri 5:30a–10p · Sat–Sun 7a–8p",
     "Spin theater · Reformer Pilates · Sauna · Rooftop turf · Cafe"),
    ("PulseFit Oakland", "Uptown Oakland", "1701 Broadway, Oakland, CA",
     "(510) 555-0173", "Mon–Fri 6a–10p · Sat–Sun 8a–7p",
     "Olympic lifting platforms · Sled track · Mobility studio · Cold plunge"),
]

# ── Trainers ───────────────────────────────────────────────────────────────────
# (full_name, specialty, club, certs, rating, bio)
TRAINERS = [
    ("Marcus Vega", "Strength", "PulseFit Downtown", "NSCA-CSCS, USAW-L1", 4.9,
     "Powerlifter turned coach. Marcus builds raw, unapologetic strength — and great form first."),
    ("Aisha Bennett", "HIIT", "PulseFit Mission", "ACE-CPT, TRX", 4.8,
     "High-energy interval specialist who'll find a gear you didn't know you had."),
    ("Priya Anand", "Yoga", "PulseFit Marina", "RYT-500, Yin Yoga", 5.0,
     "Vinyasa and breathwork to balance the burn. Priya leads from stillness to strength."),
    ("Jordan Kim", "Pilates", "PulseFit Marina", "BASI Reformer, Mat L2", 4.9,
     "Precision reformer work — long, strong, and pain-free. Core is king."),
    ("Diego Santos", "Spin", "PulseFit Marina", "Schwinn, Stages Power", 4.7,
     "Rhythm-driven rides with playlists that hit. Diego makes the climb feel like a party."),
    ("Tasha Cole", "Boxing", "PulseFit Mission", "USA Boxing L1, Krav", 4.8,
     "Former amateur boxer. Tasha teaches sharp hands, fast feet, and serious conditioning."),
    ("Liam O'Brien", "Mobility", "PulseFit Oakland", "FRC, Kinstretch", 4.9,
     "Move better, hurt less. Liam's mobility work keeps athletes in the game for years."),
    ("Nina Petrova", "Nutrition", "PulseFit Downtown", "RD, Precision Nutrition L2", 4.9,
     "Registered dietitian. Nina builds fuel plans that fit real lives, not diet fads."),
]

# ── Class offerings ───────────────────────────────────────────────────────────
# (class_name, category, trainer, club, day_time, duration, capacity, spots_left, intensity)
CLASSES = [
    ("Heavy Metal Strength", "Strength", "Marcus Vega", "PulseFit Downtown", "Mon · 6:00 AM", 60, 18, 3, "High"),
    ("Sunrise HIIT", "HIIT", "Aisha Bennett", "PulseFit Mission", "Mon · 6:30 AM", 45, 24, 7, "High"),
    ("Power Vinyasa", "Yoga", "Priya Anand", "PulseFit Marina", "Mon · 7:00 AM", 60, 30, 12, "Medium"),
    ("Reformer Sculpt", "Pilates", "Jordan Kim", "PulseFit Marina", "Tue · 9:00 AM", 50, 12, 0, "Medium"),
    ("Rhythm Ride 45", "Spin", "Diego Santos", "PulseFit Marina", "Tue · 6:00 PM", 45, 32, 9, "High"),
    ("Knockout Conditioning", "Boxing", "Tasha Cole", "PulseFit Mission", "Tue · 7:00 PM", 60, 20, 5, "High"),
    ("Mobility Reset", "Mobility", "Liam O'Brien", "PulseFit Oakland", "Wed · 8:00 AM", 40, 16, 8, "Low"),
    ("Iron & Intervals", "HIIT", "Aisha Bennett", "PulseFit Downtown", "Wed · 12:00 PM", 45, 22, 4, "High"),
    ("Deadlift Lab", "Strength", "Marcus Vega", "PulseFit Oakland", "Wed · 6:00 PM", 75, 14, 2, "High"),
    ("Candlelight Yin", "Yoga", "Priya Anand", "PulseFit Marina", "Thu · 7:30 PM", 60, 28, 15, "Low"),
    ("Sweat Sprint Spin", "Spin", "Diego Santos", "PulseFit Marina", "Fri · 6:30 AM", 45, 32, 11, "High"),
    ("Friday Fight Club", "Boxing", "Tasha Cole", "PulseFit Mission", "Fri · 6:00 PM", 60, 20, 6, "High"),
    ("Saturday Strong", "Strength", "Marcus Vega", "PulseFit Downtown", "Sat · 9:00 AM", 60, 18, 1, "High"),
    ("Weekend Warrior HIIT", "HIIT", "Aisha Bennett", "PulseFit Mission", "Sun · 10:00 AM", 45, 24, 13, "Medium"),
]

# ── Members (admin members list) — first is the portal member (owner-scoped) ─────
# (full_name, email, phone, home_club, plan, member_state, joined_days_ago, owner)
MEMBERS = [
    ("Taylor Brooks", MEMBER_EMAIL, "(415) 555-0234", "PulseFit Mission", "Premium", "active", 95, MEMBER_EMAIL),
    ("Riley Chen", "riley.chen@example.com", "(415) 555-0241", "PulseFit Downtown", "Elite", "active", 320, "staff@pulsefit.app"),
    ("Morgan Diaz", "morgan.diaz@example.com", "(415) 555-0255", "PulseFit Marina", "Basic", "active", 60, "staff@pulsefit.app"),
    ("Sam Okafor", "sam.okafor@example.com", "(510) 555-0262", "PulseFit Oakland", "Premium", "active", 210, "staff@pulsefit.app"),
    ("Jamie Wells", "jamie.wells@example.com", "(415) 555-0278", "PulseFit Mission", "Day Pass", "active", 3, "staff@pulsefit.app"),
    ("Casey Park", "casey.park@example.com", "(415) 555-0289", "PulseFit Marina", "Elite", "frozen", 480, "staff@pulsefit.app"),
    ("Drew Patel", "drew.patel@example.com", "(415) 555-0294", "PulseFit Downtown", "Basic", "active", 130, "staff@pulsefit.app"),
    ("Avery Nguyen", "avery.nguyen@example.com", "(510) 555-0301", "PulseFit Oakland", "Premium", "active", 175, "staff@pulsefit.app"),
    ("Quinn Foster", "quinn.foster@example.com", "(415) 555-0318", "PulseFit Mission", "Basic", "cancelled", 540, "staff@pulsefit.app"),
    ("Reese Murphy", "reese.murphy@example.com", "(415) 555-0327", "PulseFit Marina", "Elite", "active", 88, "staff@pulsefit.app"),
    ("Harper Lee", "harper.lee@example.com", "(415) 555-0333", "PulseFit Downtown", "Premium", "active", 40, "staff@pulsefit.app"),
]

# ── Bookings for the portal member (owner-scoped) ────────────────────────────────
# (class_name, club, day_time, booking_state)
BOOKINGS = [
    ("Sunrise HIIT", "PulseFit Mission", "Mon · 6:30 AM", "booked"),
    ("Knockout Conditioning", "PulseFit Mission", "Tue · 7:00 PM", "booked"),
    ("Power Vinyasa", "PulseFit Marina", "Mon · 7:00 AM", "attended"),
    ("Friday Fight Club", "PulseFit Mission", "Fri · 6:00 PM", "waitlist"),
    ("Candlelight Yin", "PulseFit Marina", "Thu · 7:30 PM", "attended"),
    ("Weekend Warrior HIIT", "PulseFit Mission", "Sun · 10:00 AM", "cancelled"),
]


POLICIES = [
    # DEMO-ACCOUNT-SCOPE-V1 — this account's address and password are PUBLISHED in
    # this app's README so anyone can try the demo, so it must not also be a
    # skeleton key. It used to be `default_access="full"` with no rules at all:
    # unrestricted read/write/delete over EVERY entity in the domain, not just the
    # 5 this app owns. Now it is scoped to this app's own entities.
    #
    # Delete is granted only where the UI actually offers it, so a visitor cannot
    # destroy the seeded demo data through an operation the app never exposed.
    #
    # Deliberately NOT read-only: these demos turn on being able to create and
    # advance records. Fully read-only demo logins plus self-registration is a
    # separate product decision.
    PolicyDef(role="tenant_admin", default_access="none", rules=[
        PolicyRule(entity="class_booking", can_read=True, can_create=True, can_update=True),
        PolicyRule(entity="class_offering", can_read=True, can_create=True, can_update=True, can_delete=True),
        PolicyRule(entity="club", can_read=True, can_create=True, can_update=True, can_delete=True),
        PolicyRule(entity="member", can_read=True, can_create=True, can_update=True),
        PolicyRule(entity="trainer", can_read=True, can_create=True, can_update=True, can_delete=True),
    ]),
    PolicyDef(role="tenant_user", default_access="none", rules=[
        PolicyRule(entity="club", can_read=True),
        PolicyRule(entity="class_offering", can_read=True),
        PolicyRule(entity="trainer", can_read=True),
        # MEMBERSHIP-FIELD-GUARD-V1 — nothing stopped a member PUTting
        # {member_state:"active", plan:"Elite"} onto their own record, granting
        # themselves the top tier without paying.
        #
        # readonly_fields is the WRONG tool here: it strips on CREATE as well as
        # update, and member_state is mandatory, so locking it made the join form
        # fail with "Missing mandatory field: member_state" (caught by the CRUD
        # smoke tests). Dropping can_update achieves the same guard — the app
        # creates a member at signup and never updates one afterwards.
        PolicyRule(entity="member", can_read=True, can_create=True,
                   filter_field="owner_username", filter_match="$user.name"),
        PolicyRule(entity="class_booking", can_read=True, can_create=True, can_update=True,
                   filter_field="owner_username", filter_match="$user.name"),
    ]),
]


# ── Workflows ────────────────────────────────────────────────────────────────────
WORKFLOW_DEFINITIONS = [
    {
        "workflow_id": "booking_confirmation", "display_name": "Booking Confirmation",
        "description": "Emails and texts the member when they book a class.",
        "version": "1.0.0", "enabled": True, "status": "Active", "on_error": "continue",
        "input_schema": {"member_email": {"type": "string", "required": False},
                         "member_name": {"type": "string", "required": False},
                         "class_name": {"type": "string", "required": False},
                         "club_name": {"type": "string", "required": False},
                         "day_time": {"type": "string", "required": False},
                         "member_phone": {"type": "string", "required": False}},
        "steps": [
            {"id": "email", "type": "service_call", "service": "email", "operation": "send_email", "on_error": "continue",
             "input_map": {"to_email": "{{input.member_email}}",
                           "subject": "You're booked: {{input.class_name}}",
                           "body_html": "<p>Let's go, {{input.member_name}}! Your spot in <b>{{input.class_name}}</b> at {{input.club_name}} ({{input.day_time}}) is locked in. Bring water and show up bold. — PulseFit</p>"}},
            {"id": "sms", "type": "service_call", "service": "sms", "operation": "send_sms", "on_error": "continue",
             "input_map": {"to": "{{input.member_phone}}",
                           "body": "PulseFit: you're booked for {{input.class_name}} at {{input.club_name}} ({{input.day_time}}). See you there!"}},
        ],
    },
    {
        "workflow_id": "welcome_member", "display_name": "Welcome Member",
        "description": "Emails a welcome to a newly-joined member.",
        "version": "1.0.0", "enabled": True, "status": "Active", "on_error": "continue",
        "input_schema": {"member_email": {"type": "string", "required": False},
                         "member_name": {"type": "string", "required": False},
                         "plan": {"type": "string", "required": False},
                         "home_club": {"type": "string", "required": False}},
        "steps": [
            {"id": "email", "type": "service_call", "service": "email", "operation": "send_email", "on_error": "continue",
             "input_map": {"to_email": "{{input.member_email}}",
                           "subject": "Welcome to PulseFit — your city's boldest workouts",
                           "body_html": "<p>Welcome, {{input.member_name}}! Your {{input.plan}} membership at {{input.home_club}} is live. Book your first class and let's get to work. — Team PulseFit</p>"}},
        ],
    },
    {
        # Saga: flips the booking to a reminded marker (booking_state) before notifying,
        # and reverts it if reminders fail — copy of ledgerline's compensate shape.
        "workflow_id": "class_reminder", "display_name": "Class Reminder",
        "description": "Confirms attendance and emails + texts the member a reminder (saga — reverts the state change if notifications fail).",
        "version": "1.0.0", "enabled": True, "status": "Active", "on_error": "compensate",
        "input_schema": {"booking_uuid": {"type": "string", "required": True},
                         "member_email": {"type": "string", "required": False},
                         "member_phone": {"type": "string", "required": False},
                         "member_name": {"type": "string", "required": False},
                         "class_name": {"type": "string", "required": False},
                         "day_time": {"type": "string", "required": False}},
        "steps": [
            {"id": "mark", "type": "crud_operation", "operation": "update", "object_type": "pulsefit:class_booking",
             "record_uuid": "{{input.booking_uuid}}", "data": {"booking_state": "booked"},
             "compensate": {"kind": "automatic", "type": "crud_operation", "operation": "update",
                            "object_type": "pulsefit:class_booking", "record_uuid": "{{input.booking_uuid}}",
                            "data": {"booking_state": "waitlist"}}},
            {"id": "email", "type": "service_call", "service": "email", "operation": "send_email", "on_error": "continue",
             "input_map": {"to_email": "{{input.member_email}}",
                           "subject": "Reminder: {{input.class_name}} is coming up",
                           "body_html": "<p>Hey {{input.member_name}}, don't forget — {{input.class_name}} is on {{input.day_time}}. Fuel up and bring the energy. — PulseFit</p>"}},
            {"id": "sms", "type": "service_call", "service": "sms", "operation": "send_sms", "on_error": "continue",
             "input_map": {"to": "{{input.member_phone}}",
                           "body": "PulseFit reminder: {{input.class_name}} is on {{input.day_time}}. Let's go!"}},
        ],
    },
]

EVENT_BINDINGS = [
    # NO-OPEN-RELAY-V1 — the recipient is taken from `user.email` (the verified
    # JWT of whoever performed the action), NOT from the record field the
    # visitor typed. The form field is free text, so mapping it here let any
    # signed-in visitor aim this app's real transactional mail at a stranger —
    # using the demo password published in this README. The event payload
    # carries `user` from the verified token (server.py: payload["user"]).
    {"event": "@create:pulsefit:class_booking", "workflow_id": "booking_confirmation",
     "input_map": {"member_email": "user.email", "member_name": "member_name",
                   "class_name": "class_name", "club_name": "club_name", "day_time": "day_time"}},
    {"event": "@create:pulsefit:member", "workflow_id": "welcome_member",
     "input_map": {"member_email": "user.email", "member_name": "full_name",
                   "plan": "plan", "home_club": "home_club"}},
]


def seed_test_data(s, base, domain, tenant_uuid, progress):
    nc = 0
    for i, (name, hood, addr, phone, hours, amen) in enumerate(CLUBS):
        rec = {"name": name, "neighborhood": hood, "address": addr, "phone": phone, "hours": hours,
               "amenities": amen, "image": ux(CLUB_IMG[i % len(CLUB_IMG)]), "sort_order": i,
               "display_name": name, "description": "%s · %s" % (hood, addr)}
        if seed_record(s, base, domain, "Club", rec, progress=progress, tenant_name="default-tenant"):
            nc += 1
    progress.ok("Seeded %d Clubs." % nc)

    nt = 0
    for i, (name, spec, club, certs, rating, bio) in enumerate(TRAINERS):
        rec = {"full_name": name, "specialty": spec, "club_name": club, "certifications": certs,
               "rating": rating, "bio": bio, "photo": ux(TRAINER_IMG[i % len(TRAINER_IMG)]), "sort_order": i,
               "display_name": name, "description": "%s · %s" % (spec, club)}
        if seed_record(s, base, domain, "Trainer", rec, progress=progress, tenant_name="default-tenant"):
            nt += 1
    progress.ok("Seeded %d Trainers." % nt)

    no = 0
    for i, (cn, cat, tr, club, dt, dur, cap, left, inten) in enumerate(CLASSES):
        rec = {"class_name": cn, "category": cat, "trainer_name": tr, "club_name": club, "day_time": dt,
               "duration_min": dur, "capacity": cap, "spots_left": left, "intensity": inten,
               "image": ux(CLASS_IMG[i % len(CLASS_IMG)]), "sort_order": i,
               "display_name": cn, "description": "%s · %s · %s" % (cat, club, dt)}
        if seed_record(s, base, domain, "ClassOffering", rec, progress=progress, tenant_name="default-tenant"):
            no += 1
    progress.ok("Seeded %d Class Offerings." % no)

    nm = 0
    for (name, email, phone, club, plan, st, joined, owner) in MEMBERS:
        rec = {"full_name": name, "email": email, "phone": phone, "home_club": club, "plan": plan,
               "member_state": st, "join_date": days_ago(joined), "owner_username": owner,
               "display_name": name, "description": "%s · %s" % (plan, club)}
        if seed_record(s, base, domain, "Member", rec, progress=progress, tenant_name="default-tenant"):
            nm += 1
    progress.ok("Seeded %d Members." % nm)

    nb = 0
    for (cn, club, dt, st) in BOOKINGS:
        rec = {"class_name": cn, "member_name": "Taylor Brooks", "member_email": MEMBER_EMAIL,
               "club_name": club, "day_time": dt, "booking_state": st, "owner_username": MEMBER_EMAIL,
               "display_name": "%s — %s" % (cn, dt), "description": "%s · %s" % (club, st)}
        if seed_record(s, base, domain, "ClassBooking", rec, progress=progress, tenant_name="default-tenant"):
            nb += 1
    progress.ok("Seeded %d Class Bookings." % nb)


def main():
    setup = AppSetup(AppConfig(), ALL_SCHEMAS, PUBLIC_SCHEMAS)
    setup.run(seed_fn=seed_test_data, policies=POLICIES,
              workflow_definitions=WORKFLOW_DEFINITIONS, event_bindings=EVENT_BINDINGS)


if __name__ == "__main__":
    main()
