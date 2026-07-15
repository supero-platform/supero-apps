import sys, os, datetime
sys.path.insert(0, os.path.dirname(__file__))
from supero.app_setup import AppSetup, PolicyDef, PolicyRule, make_seed_record
from config import AppConfig
from schemas import ALL_SCHEMAS, PUBLIC_SCHEMAS, SUPERO_APP_NAMESPACE

seed_record = make_seed_record(SUPERO_APP_NAMESPACE)
CREW_EMAIL = "crew@backlot.studio"   # tenant_user — owns part of the call sheet


def ux(pid, w=900):
    b = "https://images.unsplash.com/photo-" + pid + "?auto=format&fit=crop&q=80"
    return {"url": "%s&w=%d&h=%d" % (b, w, w), "thumbnail_url": "%s&w=500&h=500" % b}


def d(days):
    return (datetime.date.today() + datetime.timedelta(days=days)).isoformat()


def dt(days, hour, minute=0):
    base = datetime.datetime.utcnow() + datetime.timedelta(days=days)
    return base.replace(hour=hour, minute=minute, second=0, microsecond=0).isoformat() + "Z"


# ── Cinematic art ───────────────────────────────────────────────────────────────
# Posters / production stills (film sets, cameras, dramatic scenes)
POSTERS = ['1485846234645-a62644f84728', '1440404653325-ab127d49abc1', '1574267432553-4b4628081c31',
           '1485095329183-d0797cdc5676', '1536440136628-849c177e76a1', '1489599849927-2ee91cede3ba',
           '1626814026160-2237a95fc5a0', '1598899134739-24c46f58b8c0']
# Dramatic portraits for cast & crew
PORTRAITS = ['1507591064344-4c6ce005b128', '1500648767791-00dcc994a43e', '1539571696357-5a69c17a67c6',
             '1519085360753-af0119f7cbe7', '1531427186611-ecfd6d936c79', '1463453091185-61582044d556',
             '1494790108377-be9c29b29330', '1438761681033-6461ffad8d80', '1544723795-3fb6469f5b39',
             '1573497019940-1c28c88b4f3e', '1472099645785-5658abf4ff4e', '1564564321837-a57b7070ac4f',
             '1488426862026-3ee34a7d66df', '1492562080023-ab3db95bfbce', '1547425260-76bcadfb4f2c',
             '1557862921-37829c790f19']
# Locations (interiors, landscapes, urban)
LOCS = ['1518998053901-5348d3961a04', '1492684223066-81342ee5ff30', '1470225620780-dba8ba36b745',
        '1524712245354-2c4e5e7121c0', '1574375927938-d5a98e8ffe85', '1517048676732-d65bc937f952']

# ── Productions — a real studio slate ───────────────────────────────────────────
# (title, genre, format, prod_state, director, logline, budget, start_off, wrap_off)
PRODUCTIONS = [
    ("The Salt Coast", "Drama", "Feature", "production",
     "Lena Korhonen",
     "A lighthouse keeper haunted by a vanished daughter takes in a shipwreck survivor who knows far too much about the night she disappeared.",
     18500000.0, -22, 34),
    ("Neon Requiem", "Sci-Fi", "Feature", "post_production",
     "Darius Vance",
     "In a flooded megacity where memories are currency, a black-market broker must spend her own past to outrun the corporation that owns her future.",
     62000000.0, -160, -28),
    ("Last Call at the Carousel", "Comedy", "Series", "pre_production",
     "Priya Anand",
     "The mismatched night staff of a 24-hour diner discover the regulars they serve are quietly running the whole town.",
     9200000.0, 18, 96),
    ("The Hollow Field", "Horror", "Feature", "development",
     "Marcus Reyes",
     "A drought reveals a buried farmhouse on a family's land — and something that was sealed inside it for a reason.",
     7400000.0, 70, 140),
    ("Paper Tigers", "Thriller", "Series", "production",
     "Sofia Almeida",
     "A disgraced forensic accountant is recruited to launder money for the cartel that destroyed her — and to quietly bury it from the inside.",
     24000000.0, -40, 60),
    ("After the Tide", "Documentary", "Feature", "released",
     "Joon-ho Park",
     "Three coastal towns, one rising sea: an intimate decade-long portrait of the families who refuse to leave the water that is taking their homes.",
     2100000.0, -420, -300),
]

# ── People — cast & crew roster ─────────────────────────────────────────────────
# (full_name, role_type, department, email, day_rate, agency)
PEOPLE = [
    ("Lena Korhonen", "Director", "Direction", "lena@talent.io", 22000.0, "Cohort Creative"),
    ("Darius Vance", "Director", "Direction", "darius@talent.io", 35000.0, "Apex Artists"),
    ("Priya Anand", "Director", "Direction", "priya@talent.io", 18000.0, "Cohort Creative"),
    ("Marlowe Castellanos", "Actor", "Cast", "marlowe@talent.io", 48000.0, "Stellar Talent"),
    ("Imogen Frost", "Actor", "Cast", "imogen@talent.io", 55000.0, "Apex Artists"),
    ("Theo Brandt", "Actor", "Cast", "theo@talent.io", 31000.0, "Stellar Talent"),
    ("Nadia El-Amin", "Actor", "Cast", "nadia@talent.io", 42000.0, "Cohort Creative"),
    ("Sam Okonkwo", "Cinematographer", "Camera", CREW_EMAIL, 9500.0, "IATSE Local 600"),
    ("Yuki Tanaka", "Cinematographer", "Camera", "yuki@talent.io", 11000.0, "IATSE Local 600"),
    ("Greta Lindholm", "Producer", "Production", "greta@backlot.studio", 14000.0, "Backlot Studios"),
    ("Hassan Mir", "Producer", "Production", "hassan@backlot.studio", 13000.0, "Backlot Studios"),
    ("Eleanor Voss", "Writer", "Story", "eleanor@talent.io", 8000.0, "The Gersh Group"),
    ("Diego Marchetti", "Writer", "Story", "diego@talent.io", 7500.0, "The Gersh Group"),
    ("Claire Dubois", "Editor", "Post", "claire@talent.io", 6800.0, "Cutting Room Co."),
    ("Tobias Reinholt", "Crew", "Grip & Electric", "tobias@talent.io", 850.0, "IATSE Local 80"),
    ("Amara Diallo", "Crew", "Art Department", "amara@talent.io", 1200.0, "IATSE Local 800"),
]

# ── Scenes — the shooting schedule / strip board ────────────────────────────────
# (scene_number, production_title, location_name, scene_state, shoot_off, hour, int_ext, tod, pages, description, cast_list)
SCENES = [
    ("12A", "The Salt Coast", "Cape Marrow Lighthouse", "shot", -3, 18, "EXT", "DUSK", 1.6,
     "The keeper spots a body in the surf as the lamp turns.", "Marlowe Castellanos, Imogen Frost"),
    ("18", "The Salt Coast", "Keeper's Quarters", "shot", -2, 9, "INT", "NIGHT", 2.4,
     "First confrontation by lamplight — the survivor knows the daughter's name.", "Marlowe Castellanos, Imogen Frost"),
    ("23", "The Salt Coast", "Cape Marrow Lighthouse", "scheduled", 1, 6, "EXT", "DAWN", 0.9,
     "The cliff path search at first light.", "Marlowe Castellanos"),
    ("31", "The Salt Coast", "Tidepool Cove", "scheduled", 3, 14, "EXT", "DAY", 1.2,
     "The locket is found wedged in the rocks.", "Imogen Frost, Theo Brandt"),
    ("4", "Paper Tigers", "Meridian Tower — 40th Floor", "shot", -5, 10, "INT", "DAY", 3.1,
     "The accountant is walked through the laundering operation for the first time.", "Nadia El-Amin, Theo Brandt"),
    ("7B", "Paper Tigers", "Underground Parking", "needs_reshoot", -1, 22, "INT", "NIGHT", 1.8,
     "The drop goes wrong; the camera move missed the handoff — reset.", "Nadia El-Amin"),
    ("9", "Paper Tigers", "Meridian Tower — Lobby", "scheduled", 2, 8, "INT", "DAY", 1.4,
     "A wire from the FBI walks straight past her in the lobby.", "Nadia El-Amin, Marlowe Castellanos"),
    ("14", "Paper Tigers", "Riverside Docks", "scheduled", 5, 19, "EXT", "NIGHT", 2.6,
     "The midnight ledger exchange under the cranes.", "Nadia El-Amin, Theo Brandt"),
    ("2", "Neon Requiem", "Soundstage B — Flooded Set", "shot", -34, 11, "INT", "NIGHT", 2.0,
     "The memory broker dives into a client's drowned childhood.", "Imogen Frost"),
    ("16", "Neon Requiem", "Soundstage B — Flooded Set", "shot", -31, 13, "INT", "NIGHT", 2.9,
     "The corporation's enforcer corners her in the data-vault.", "Imogen Frost, Marlowe Castellanos"),
    ("1", "Last Call at the Carousel", "The Carousel Diner", "not_scheduled", 20, 7, "INT", "DAY", 1.1,
     "Cold open: the new hire's disastrous first graveyard shift.", "Theo Brandt"),
    ("5", "Last Call at the Carousel", "The Carousel Diner", "not_scheduled", 22, 23, "INT", "NIGHT", 2.2,
     "The regulars hold their first 'meeting' in the back booth.", "Theo Brandt, Nadia El-Amin"),
]

# ── Assignments — the call sheet ────────────────────────────────────────────────
# (production_title, person_name, person_email, role_type, character_name, assignment_state, call_off, hour, location_name, rate, owner_email)
ASSIGNMENTS = [
    ("The Salt Coast", "Marlowe Castellanos", "marlowe@talent.io", "Actor", "Eamon Falk", "confirmed", 1, 5, "Cape Marrow Lighthouse", 48000.0, "marlowe@talent.io"),
    ("The Salt Coast", "Imogen Frost", "imogen@talent.io", "Actor", "The Survivor", "confirmed", 1, 5, "Cape Marrow Lighthouse", 55000.0, "imogen@talent.io"),
    ("The Salt Coast", "Sam Okonkwo", CREW_EMAIL, "Cinematographer", "", "confirmed", 1, 4, "Cape Marrow Lighthouse", 9500.0, CREW_EMAIL),
    ("The Salt Coast", "Sam Okonkwo", CREW_EMAIL, "Cinematographer", "", "confirmed", 3, 12, "Tidepool Cove", 9500.0, CREW_EMAIL),
    ("The Salt Coast", "Sam Okonkwo", CREW_EMAIL, "Cinematographer", "", "offered", 5, 6, "Keeper's Quarters", 9500.0, CREW_EMAIL),
    ("Paper Tigers", "Nadia El-Amin", "nadia@talent.io", "Actor", "Reyna Cole", "confirmed", 2, 7, "Meridian Tower — Lobby", 42000.0, "nadia@talent.io"),
    ("Paper Tigers", "Theo Brandt", "theo@talent.io", "Actor", "Agent Mraz", "offered", 2, 7, "Meridian Tower — Lobby", 31000.0, "theo@talent.io"),
    ("Paper Tigers", "Sam Okonkwo", CREW_EMAIL, "Cinematographer", "", "offered", 2, 6, "Meridian Tower — Lobby", 9500.0, CREW_EMAIL),
    ("Paper Tigers", "Tobias Reinholt", "tobias@talent.io", "Crew", "", "wrapped", -5, 9, "Meridian Tower — 40th Floor", 850.0, "tobias@talent.io"),
    ("Neon Requiem", "Imogen Frost", "imogen@talent.io", "Actor", "Vesper Lune", "wrapped", -34, 10, "Soundstage B — Flooded Set", 55000.0, "imogen@talent.io"),
    ("Neon Requiem", "Sam Okonkwo", CREW_EMAIL, "Cinematographer", "", "declined", -34, 9, "Soundstage B — Flooded Set", 9500.0, CREW_EMAIL),
    ("Last Call at the Carousel", "Theo Brandt", "theo@talent.io", "Actor", "Wexler", "offered", 20, 6, "The Carousel Diner", 31000.0, "theo@talent.io"),
]

# ── Shoot locations ─────────────────────────────────────────────────────────────
# (name, address, location_type, day_rate, location_state, permits)
SHOOT_LOCATIONS = [
    ("Cape Marrow Lighthouse", "End of Marrow Point Rd, Mendocino, CA", "Practical Exterior", 4200.0, "secured", True),
    ("Soundstage B — Flooded Set", "Backlot Studios, Stage B, Burbank, CA", "Soundstage", 12000.0, "secured", True),
    ("Meridian Tower", "1 Meridian Plaza, Downtown LA", "Office Interior", 6500.0, "secured", True),
    ("Tidepool Cove", "Salt Point State Park, CA", "Natural Exterior", 1800.0, "scouting", False),
    ("The Carousel Diner", "Route 6, Barstow, CA", "Practical Interior", 2400.0, "scouting", False),
    ("Riverside Docks", "Port of LA, Berth 54", "Industrial Exterior", 3100.0, "released", True),
]


POLICIES = [
    PolicyDef(role="tenant_admin", default_access="full", rules=[]),
    PolicyDef(role="tenant_user", default_access="none", rules=[
        # Crew/cast can read the slate, the roster, the schedule and locations…
        PolicyRule(entity="production", can_read=True),
        PolicyRule(entity="person", can_read=True),
        PolicyRule(entity="scene", can_read=True),
        PolicyRule(entity="shoot_location", can_read=True),
        # …but only see & act on THEIR OWN call sheet (owner-scoped to their email).
        PolicyRule(entity="assignment", can_read=True, can_create=True, can_update=True,
                   filter_field="owner_username", filter_match="$user.name"),
    ]),
]


# ── Workflows ────────────────────────────────────────────────────────────────────
WORKFLOW_DEFINITIONS = [
    {
        "workflow_id": "assignment_offer", "display_name": "Role Offer",
        "description": "Emails the talent their role offer when an assignment is created (event-bound @create:assignment).",
        "version": "1.0.0", "enabled": True, "status": "Active", "on_error": "continue",
        "input_schema": {"person_email": {"type": "string", "required": False},
                         "person_name": {"type": "string", "required": False},
                         "production_title": {"type": "string", "required": False},
                         "character_name": {"type": "string", "required": False},
                         "role_type": {"type": "string", "required": False}},
        "steps": [
            {"id": "email", "type": "service_call", "service": "email", "operation": "send_email", "on_error": "continue",
             "input_map": {"to_email": "{{input.person_email}}",
                           "subject": "You're wanted on Backlot: {{input.production_title}}",
                           "body_html": "<p>Hi {{input.person_name}},</p><p>The production office would like to offer you the role of <b>{{input.character_name}}</b> ({{input.role_type}}) on <b>{{input.production_title}}</b>. Sign in to your Backlot call sheet to confirm or decline.</p><p>— Backlot Studios</p>"}},
        ],
    },
    {
        "workflow_id": "call_sheet", "display_name": "Send Call Sheet",
        "description": "Confirms an assignment and emails + texts the talent their call time (saga — reverts the confirm if the email send fails).",
        "version": "1.0.0", "enabled": True, "status": "Active", "on_error": "compensate",
        "input_schema": {"assignment_uuid": {"type": "string", "required": True},
                         "person_email": {"type": "string", "required": False},
                         "person_phone": {"type": "string", "required": False},
                         "person_name": {"type": "string", "required": False},
                         "production_title": {"type": "string", "required": False},
                         "call_time": {"type": "string", "required": False},
                         "location_name": {"type": "string", "required": False},
                         "prior_state": {"type": "string", "required": False}},
        "steps": [
            {"id": "confirm", "type": "crud_operation", "operation": "update", "object_type": "backlot:assignment",
             "record_uuid": "{{input.assignment_uuid}}", "data": {"assignment_state": "confirmed"},
             "compensate": {"kind": "automatic", "type": "crud_operation", "operation": "update",
                            "object_type": "backlot:assignment", "record_uuid": "{{input.assignment_uuid}}",
                            "data": {"assignment_state": "{{input.prior_state}}"}}},
            {"id": "email", "type": "service_call", "service": "email", "operation": "send_email",
             "input_map": {"to_email": "{{input.person_email}}",
                           "subject": "Call sheet — {{input.production_title}}",
                           "body_html": "<p>Hi {{input.person_name}},</p><p>You're confirmed for <b>{{input.production_title}}</b>. Your call is <b>{{input.call_time}}</b> at <b>{{input.location_name}}</b>. Full call sheet in your Backlot portal.</p><p>See you on set. — Production Office</p>"}},
            {"id": "sms", "type": "service_call", "service": "sms", "operation": "send_sms", "on_error": "continue",
             "input_map": {"to": "{{input.person_phone}}",
                           "body": "Backlot call sheet: {{input.production_title}} — call {{input.call_time}} at {{input.location_name}}."}},
        ],
    },
    {
        "workflow_id": "wrap_notify", "display_name": "Wrap Notification",
        "description": "Marks an assignment wrapped and thanks the talent (triggerable).",
        "version": "1.0.0", "enabled": True, "status": "Active", "on_error": "continue",
        "input_schema": {"assignment_uuid": {"type": "string", "required": True},
                         "person_email": {"type": "string", "required": False},
                         "person_name": {"type": "string", "required": False},
                         "production_title": {"type": "string", "required": False}},
        "steps": [
            {"id": "wrap", "type": "crud_operation", "operation": "update", "object_type": "backlot:assignment",
             "record_uuid": "{{input.assignment_uuid}}", "data": {"assignment_state": "wrapped"}},
            {"id": "email", "type": "service_call", "service": "email", "operation": "send_email", "on_error": "continue",
             "input_map": {"to_email": "{{input.person_email}}", "subject": "That's a wrap — {{input.production_title}}",
                           "body_html": "<p>Thank you, {{input.person_name}} — it's a wrap on <b>{{input.production_title}}</b>. It was a pleasure having you on set. Final payment will follow per your deal memo.</p><p>— Backlot Studios</p>"}},
        ],
    },
]

EVENT_BINDINGS = [
    {"event": "@create:backlot:assignment", "workflow_id": "assignment_offer",
     "input_map": {"person_email": "person_email", "person_name": "person_name",
                   "production_title": "production_title", "character_name": "character_name",
                   "role_type": "role_type"}},
]


def seed_test_data(s, base, domain, tenant_uuid, progress):
    np_ = 0
    for i, p in enumerate(PRODUCTIONS):
        title, genre, fmt, st, director, logline, budget, soff, woff = p
        rec = {"title": title, "genre": genre, "format": fmt, "prod_state": st, "director_name": director,
               "logline": logline, "budget": budget, "start_date": d(soff), "wrap_date": d(woff),
               "poster": ux(POSTERS[i % len(POSTERS)]), "sort_order": i,
               "display_name": title, "description": "%s · %s · %s" % (genre, fmt, st.replace("_", " "))}
        if seed_record(s, base, domain, "Production", rec, progress=progress, tenant_name="default-tenant"):
            np_ += 1
    progress.ok("Seeded %d Productions." % np_)

    npe = 0
    for i, p in enumerate(PEOPLE):
        name, role, dept, email, rate, agency = p
        rec = {"full_name": name, "role_type": role, "department": dept, "email": email,
               "phone": "(323) 555-%04d" % (1000 + i), "photo": ux(PORTRAITS[i % len(PORTRAITS)]),
               "day_rate": rate, "agency": agency, "sort_order": i,
               "display_name": name, "description": "%s · %s" % (role, dept)}
        if seed_record(s, base, domain, "Person", rec, progress=progress, tenant_name="default-tenant"):
            npe += 1
    progress.ok("Seeded %d People." % npe)

    nsc = 0
    for (num, prod, loc, st, soff, hour, ie, tod, pages, desc, cast) in SCENES:
        rec = {"scene_number": num, "production_title": prod, "location_name": loc, "scene_state": st,
               "shoot_date": dt(soff, hour), "int_ext": ie, "time_of_day": tod, "pages": pages,
               "description": desc, "cast_list": cast,
               "display_name": "Sc. %s — %s" % (num, prod), "description": "%s/%s · %s pp" % (ie, tod, pages)}
        if seed_record(s, base, domain, "Scene", rec, progress=progress, tenant_name="default-tenant"):
            nsc += 1
    progress.ok("Seeded %d Scenes." % nsc)

    nl = 0
    for i, (name, addr, ltype, rate, st, permits) in enumerate(SHOOT_LOCATIONS):
        rec = {"name": name, "address": addr, "location_type": ltype, "day_rate": rate,
               "location_state": st, "permits": permits, "image": ux(LOCS[i % len(LOCS)]),
               "display_name": name, "description": "%s · %s" % (ltype, st)}
        if seed_record(s, base, domain, "ShootLocation", rec, progress=progress, tenant_name="default-tenant"):
            nl += 1
    progress.ok("Seeded %d Shoot Locations." % nl)

    na = 0
    for (prod, pname, pemail, role, char, st, coff, hour, loc, rate, owner) in ASSIGNMENTS:
        rec = {"production_title": prod, "person_name": pname, "person_email": pemail, "role_type": role,
               "character_name": char, "assignment_state": st, "call_time": dt(coff, hour),
               "location_name": loc, "rate": rate, "owner_username": owner,
               "display_name": "%s — %s" % (pname, prod), "description": "%s · %s" % (role, st)}
        if seed_record(s, base, domain, "Assignment", rec, progress=progress, tenant_name="default-tenant"):
            na += 1
    progress.ok("Seeded %d Assignments." % na)


def main():
    setup = AppSetup(AppConfig(), ALL_SCHEMAS, PUBLIC_SCHEMAS)
    setup.run(seed_fn=seed_test_data, policies=POLICIES,
              workflow_definitions=WORKFLOW_DEFINITIONS, event_bindings=EVENT_BINDINGS)


if __name__ == "__main__":
    main()
