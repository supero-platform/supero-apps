import sys, os, datetime
sys.path.insert(0, os.path.dirname(__file__))
from supero.app_setup import AppSetup, PolicyDef, PolicyRule, make_seed_record
from config import AppConfig
from schemas import ALL_SCHEMAS, PUBLIC_SCHEMAS, SUPERO_APP_NAMESPACE

seed_record = make_seed_record(SUPERO_APP_NAMESPACE)

BUYER_EMAIL = "buyer@haven.realty"


def ux(pid, w=1100):
    """Verified Unsplash CDN image → {url, thumbnail_url}."""
    base = "https://images.unsplash.com/photo-" + pid + "?auto=format&fit=crop&q=80"
    return {"url": "%s&w=%d&h=%d" % (base, w, int(w * 0.7)), "thumbnail_url": "%s&w=600&h=420" % base}


def dt(days, hour, minute=0):
    d = datetime.datetime.utcnow() + datetime.timedelta(days=days)
    return d.replace(hour=hour, minute=minute, second=0, microsecond=0).isoformat() + "Z"


def day(days):
    return (datetime.date.today() + datetime.timedelta(days=days)).isoformat()


# ── Listing photography (verified Unsplash IDs) ─────────────────────────────────
HOUSE = ['1568605114967-8130f3a36994', '1570129477492-45c003edd2be', '1512917774080-9991f1c4c750',
         '1564013799919-ab600027ffc6', '1605276374104-dee2a0ed3cd6', '1600596542815-ffad4c1539a9',
         '1600585154340-be6161a56a0c', '1600607687939-ce8a6c25118c', '1605146769289-440113cc3d00',
         '1564078516393-cf04bd966897', '1599809275671-b5942cabc7a2', '1576941089067-2de3c901e126',
         '1583608205776-bfd35f0d9f83', '1512915922686-57c11dde9b6b', '1518780664697-55e3ad937233',
         '1613490493576-7fde63acd811', '1580587771525-78b9dba3b914', '1600047509807-ba8f99d2cdde',
         '1502672260266-1c1ef2d93688', '1493809842364-78817add7ffb']
# Agent headshots
FACE = ['1507003211169-0a1dd7228f2d', '1494790108377-be9c29b29330', '1500648767791-00dcc994a43e',
        '1438761681033-6461ffad8d80', '1472099645785-5658abf4ff4e', '1519085360753-af0119f7cbe7',
        '1580489944761-15a19d654956', '1607990281513-2c110a25bd8c']

# ── Agents ──────────────────────────────────────────────────────────────────────
# (full_name, title, brokerage, email, phone, rating, sales_count, region, bio)
AGENTS = [
    ("Morgan Vance", "Managing Broker", "Haven Realty", "morgan@haven.realty", "(415) 555-0110", 4.9, 214, "San Francisco Bay Area",
     "Twenty years guiding buyers and sellers through the Bay Area's most competitive markets, with a record-setting list-to-sale ratio."),
    ("Sofia Delgado", "Luxury Specialist", "Haven Realty", "sofia@haven.realty", "(415) 555-0121", 5.0, 178, "Pacific Heights & Marina",
     "Specialist in trophy properties and architectural homes. Sofia pairs white-glove service with sharp negotiation."),
    ("Daniel Okafor", "Senior Agent", "Haven Realty", "daniel@haven.realty", "(510) 555-0132", 4.8, 156, "East Bay",
     "From first-time buyers to seasoned investors, Daniel makes the East Bay feel like home — Oakland, Berkeley and beyond."),
    ("Priya Raman", "New-Development Lead", "Haven Realty", "priya@haven.realty", "(408) 555-0143", 4.9, 132, "Silicon Valley",
     "New-construction and condo expert helping tech professionals find turnkey homes close to the action."),
    ("James Whitfield", "Associate Broker", "Haven Realty", "james@haven.realty", "(415) 555-0154", 4.7, 121, "Peninsula",
     "Peninsula native with deep school-district knowledge and a calm, data-driven approach to every transaction."),
    ("Aisha Bello", "Rental & Relocation", "Haven Realty", "aisha@haven.realty", "(415) 555-0165", 4.8, 98, "Citywide",
     "Aisha runs Haven's rental and relocation desk, matching renters and corporate transferees to the right neighborhood fast."),
    ("Lucas Moreau", "Investment Advisor", "Haven Realty", "lucas@haven.realty", "(415) 555-0176", 4.6, 87, "Commercial & Multi-family",
     "Lucas advises investors on multi-family and commercial assets, with a portfolio approach to long-term yield."),
    ("Hannah Kim", "Buyer's Agent", "Haven Realty", "hannah@haven.realty", "(650) 555-0187", 5.0, 76, "South Bay",
     "Patient, thorough and relentlessly on your side — Hannah is the buyer's agent clients recommend to their friends."),
]

# ── Listings ────────────────────────────────────────────────────────────────────
# (title, address, city, state, neighborhood, listing_type, property_type, price, beds, baths,
#  sqft, year_built, listing_state, agent_name, img_idx, featured, description)
LISTINGS = [
    ("Sun-Drenched Victorian with City Views", "248 Alta Vista Way", "San Francisco", "CA", "Noe Valley",
     "For Sale", "House", 2895000.0, 4, 3.5, 2840, 1908, "active", "Sofia Delgado", 0, True,
     "A meticulously restored Victorian crowning a quiet Noe Valley street. Soaring ceilings, original millwork and a chef's kitchen open to a sun-filled deck with sweeping downtown views."),
    ("Glass-Walled Modern in the Hills", "9 Skyline Terrace", "San Francisco", "CA", "Twin Peaks",
     "For Sale", "House", 4200000.0, 5, 4.5, 3950, 2019, "active", "Sofia Delgado", 4, True,
     "An architectural statement of glass and steel cantilevered over the hillside. Walls of windows frame the bay, two living levels flow to an infinity-edge terrace, and the primary suite is a private retreat."),
    ("Light-Filled Marina Condo", "1820 Bay Street #5", "San Francisco", "CA", "Marina",
     "For Sale", "Condo", 1485000.0, 2, 2.0, 1240, 2006, "active", "Priya Raman", 1, True,
     "Turnkey two-bedroom condo steps from the Marina Green. Floor-to-ceiling windows, white-oak floors, a sleek kitchen and deeded parking make this the easy, elegant city home."),
    ("Craftsman Bungalow with a Garden", "512 Maple Court", "Berkeley", "CA", "Elmwood",
     "For Sale", "House", 1395000.0, 3, 2.0, 1780, 1924, "active", "Daniel Okafor", 9, False,
     "A storybook Craftsman on a leafy Elmwood block. Built-in cabinetry, a wood-burning fireplace and a deep, terraced garden — character and warmth in equal measure."),
    ("Penthouse Loft Above the Square", "77 Mission Loft #PH2", "San Francisco", "CA", "SoMa",
     "For Sale", "Condo", 2150000.0, 2, 2.5, 1960, 2014, "pending", "Priya Raman", 14, True,
     "A dramatic two-story penthouse loft with 22-foot ceilings, a mezzanine office and a private roof deck. Industrial bones meet refined finishes in the heart of SoMa."),
    ("Serene Townhouse Near the Park", "31 Linden Row", "San Francisco", "CA", "Hayes Valley",
     "For Sale", "Townhouse", 1850000.0, 3, 2.5, 2010, 2011, "active", "Morgan Vance", 5, False,
     "A quiet, contemporary townhouse a block from the park. Three levels of flexible living, a chef's kitchen, two-car garage and a low-maintenance courtyard garden."),
    ("Spanish-Revival Estate", "1400 Oak Knoll Drive", "Hillsborough", "CA", "Lower North",
     "For Sale", "House", 3850000.0, 5, 4.0, 4320, 1931, "active", "James Whitfield", 6, True,
     "A romantic Spanish-Revival estate on three-quarters of an acre. Hand-painted tile, a tower stair, a loggia overlooking the pool, and the kind of grounds that make a house a legacy."),
    ("Bright Apartment in the Mission", "640 Valencia Street #3", "San Francisco", "CA", "Mission",
     "For Rent", "Apartment", 4200.0, 1, 1.0, 720, 1998, "active", "Aisha Bello", 7, False,
     "A bright one-bedroom in the heart of the Mission, walking distance to the city's best restaurants. In-unit laundry, exposed brick and a private balcony."),
    ("Garden-Level Two-Bed Rental", "210 Cole Street #B", "San Francisco", "CA", "Cole Valley",
     "For Rent", "Apartment", 5600.0, 2, 1.5, 1050, 2003, "active", "Aisha Bello", 11, False,
     "A peaceful garden-level two-bedroom in family-friendly Cole Valley. Direct garden access, a renovated kitchen, and N-Judah and Cole Valley shops at your door."),
    ("Investor's Triplex", "88 Fruitvale Avenue", "Oakland", "CA", "Fruitvale",
     "For Sale", "Commercial", 1650000.0, 6, 4.0, 3600, 1949, "active", "Lucas Moreau", 12, False,
     "A well-maintained triplex with strong rental history and value-add upside. Separate meters, on-site parking and a transit-rich location — a cornerstone for any portfolio."),
    ("Modern Farmhouse on a Double Lot", "3 Willow Bend Lane", "Palo Alto", "CA", "Old Palo Alto",
     "For Sale", "House", 3990000.0, 4, 3.5, 3210, 2020, "active", "Hannah Kim", 2, True,
     "A crisp modern farmhouse on a rare double lot in Old Palo Alto. Vaulted great room, a true mudroom, a pool-ready yard and award-winning schools moments away."),
    ("Cozy Starter Condo", "455 Telegraph Avenue #210", "Oakland", "CA", "Uptown",
     "For Sale", "Condo", 525000.0, 1, 1.0, 680, 2009, "active", "Daniel Okafor", 3, False,
     "An affordable, light-filled one-bedroom in vibrant Uptown Oakland. Open plan, a walk-out balcony and a walkable lifestyle — the smart first step onto the ladder."),
    ("Hillside Lot with Bay Views", "Parcel 12, Grizzly Peak", "Berkeley", "CA", "Berkeley Hills",
     "For Sale", "Land", 385000.0, 0, 0.0, 0, 0, "active", "Lucas Moreau", 17, False,
     "A rare buildable parcel high in the Berkeley Hills with unobstructed bay-to-bridge views. Preliminary plans available — bring your architect and your vision."),
    ("Restored Edwardian — Just Sold", "92 Steiner Street", "San Francisco", "CA", "Alamo Square",
     "For Sale", "House", 2650000.0, 4, 3.0, 2680, 1912, "sold", "Morgan Vance", 18, False,
     "A beautifully restored Edwardian facing Alamo Square. Bay windows, parlor-floor entertaining rooms and a landscaped garden. Sold in a competitive multiple-offer week."),
]


# ── Policies ────────────────────────────────────────────────────────────────────
POLICIES = [
    # DEMO-ACCOUNT-SCOPE-V1 — this account's address and password are PUBLISHED in
    # this app's README so anyone can try the demo, so it must not also be a
    # skeleton key. It used to be `default_access="full"` with no rules at all:
    # unrestricted read/write/delete over EVERY entity in the domain, not just the
    # 4 this app owns. Now it is scoped to this app's own entities.
    #
    # Delete is granted only where the UI actually offers it, so a visitor cannot
    # destroy the seeded demo data through an operation the app never exposed.
    #
    # Deliberately NOT read-only: these demos turn on being able to create and
    # advance records. Fully read-only demo logins plus self-registration is a
    # separate product decision.
    PolicyDef(role="tenant_admin", default_access="none", rules=[
        PolicyRule(entity="agent", can_read=True, can_create=True, can_update=True, can_delete=True),
        PolicyRule(entity="listing", can_read=True, can_create=True, can_update=True, can_delete=True),
        PolicyRule(entity="offer", can_read=True, can_create=True, can_update=True),
        PolicyRule(entity="tour", can_read=True, can_create=True, can_update=True),
    ]),
    PolicyDef(role="tenant_user", default_access="none", rules=[
        # Discovery — every signed-in buyer reads the public marketplace:
        PolicyRule(entity="listing", can_read=True),
        PolicyRule(entity="agent", can_read=True),
        # Private — each buyer owns only their own tours and offers:
        PolicyRule(entity="tour", can_read=True, can_create=True, can_update=True,
                   filter_field="owner_username", filter_match="$user.name"),
        PolicyRule(entity="offer", can_read=True, can_create=True, can_update=True,
                   filter_field="owner_username", filter_match="$user.name"),
    ]),
]


# ── Workflows ───────────────────────────────────────────────────────────────────
WORKFLOW_DEFINITIONS = [
    # (1) EVENT-BOUND @create:haven:tour → email buyer + sms buyer.
    {
        "workflow_id": "tour_confirmation", "display_name": "Tour Confirmation",
        "description": "Emails and texts the buyer when a property tour is requested.",
        "version": "1.0.0", "enabled": True, "status": "Active", "on_error": "continue",
        "input_schema": {"customer_email": {"type": "string", "required": False},
                         "customer_phone": {"type": "string", "required": False},
                         "customer_name": {"type": "string", "required": False},
                         "listing_title": {"type": "string", "required": False},
                         "start_time": {"type": "string", "required": False}},
        "steps": [
            {"id": "email", "type": "service_call", "service": "email", "operation": "send_email", "on_error": "continue",
             "input_map": {"to_email": "{{input.customer_email}}",
                           "subject": "Your Haven tour is booked",
                           "body_html": "<p>Hi {{input.customer_name}},</p><p>Your tour of <b>{{input.listing_title}}</b> is requested for {{input.start_time}}. Your Haven agent will confirm the time shortly.</p><p>— Haven</p>"}},
            {"id": "sms", "type": "service_call", "service": "sms", "operation": "send_sms", "on_error": "continue",
             "input_map": {"to": "{{input.customer_phone}}",
                           "body": "Haven: your tour of {{input.listing_title}} is requested for {{input.start_time}}. We'll confirm shortly."}},
        ],
    },
    # (2) EVENT-BOUND @create:haven:offer → email agent + slack #offers.
    {
        "workflow_id": "offer_received", "display_name": "Offer Received",
        "description": "Notifies the listing agent by email and posts to the #offers Slack channel.",
        "version": "1.0.0", "enabled": True, "status": "Active", "on_error": "continue",
        "input_schema": {"agent_email": {"type": "string", "required": False},
                         "listing_title": {"type": "string", "required": False},
                         "customer_name": {"type": "string", "required": False},
                         "amount": {"type": "string", "required": False}},
        "steps": [
            {"id": "email", "type": "service_call", "service": "email", "operation": "send_email", "on_error": "continue",
             "input_map": {"to_email": "{{input.agent_email}}",
                           "subject": "New offer on {{input.listing_title}}",
                           "body_html": "<p>A new offer of <b>${{input.amount}}</b> has been submitted on <b>{{input.listing_title}}</b> by {{input.customer_name}}. Review it in the Haven console.</p>"}},
            {"id": "slack", "type": "service_call", "service": "slack", "operation": "send_message", "on_error": "continue",
             "input_map": {"channel": "#offers",
                           "text": "💰 New offer: ${{input.amount}} on {{input.listing_title}} from {{input.customer_name}}."}},
        ],
    },
    # (3) SAGA (triggerable) — accept an offer, notify the buyer, mark the listing pending.
    # on_error: compensate → if a later step fails, the compensate block reverts the offer.
    {
        "workflow_id": "offer_accepted", "display_name": "Offer Accepted (saga)",
        "description": "Accepts an offer, emails the buyer, and flips the listing to pending. Compensates on failure.",
        "version": "1.0.0", "enabled": True, "status": "Active", "on_error": "compensate",
        "input_schema": {"offer_uuid": {"type": "string", "required": True},
                         "listing_uuid": {"type": "string", "required": False},
                         "customer_email": {"type": "string", "required": False},
                         "customer_name": {"type": "string", "required": False},
                         "listing_title": {"type": "string", "required": False},
                         "amount": {"type": "string", "required": False}},
        "steps": [
            {"id": "accept_offer", "type": "crud_operation", "operation": "update", "object_type": "haven:offer",
             "record_uuid": "{{input.offer_uuid}}", "data": {"offer_state": "accepted"},
             "compensate": {"type": "crud_operation", "operation": "update", "object_type": "haven:offer",
                            "record_uuid": "{{input.offer_uuid}}", "data": {"offer_state": "under_review"}}},
            {"id": "notify_buyer", "type": "service_call", "service": "email", "operation": "send_email", "on_error": "continue",
             "input_map": {"to_email": "{{input.customer_email}}",
                           "subject": "Your offer on {{input.listing_title}} was accepted",
                           "body_html": "<p>Congratulations {{input.customer_name}} — your offer of <b>${{input.amount}}</b> on <b>{{input.listing_title}}</b> has been accepted! Your agent will be in touch with next steps.</p><p>— Haven</p>"}},
            {"id": "mark_listing_pending", "type": "crud_operation", "operation": "update", "object_type": "haven:listing",
             "record_uuid": "{{input.listing_uuid}}", "data": {"listing_state": "pending"},
             "compensate": {"type": "crud_operation", "operation": "update", "object_type": "haven:listing",
                            "record_uuid": "{{input.listing_uuid}}", "data": {"listing_state": "active"}}},
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
    {"event": "@create:haven:tour", "workflow_id": "tour_confirmation",
     "input_map": {"customer_email": "user.email",
                   "customer_name": "customer_name", "listing_title": "listing_title",
                   "start_time": "start_time"}},
    {"event": "@create:haven:offer", "workflow_id": "offer_received",
     # WRONG-RECIPIENT-FIX: `agent_email` was mapped from `customer_email`, so
     # the "a new offer needs your review" mail went to the BUYER who had just
     # submitted it, and the listing agent was never notified. `Offer` carries
     # `agent_name` but no agent address, so there is nothing correct to map;
     # the mapping is removed rather than left pointing at the wrong person.
     # The #offers Slack step still reaches the brokerage. Restoring the email
     # needs an `agent_email` field on Offer, resolved from the Agent record.
     "input_map": {"listing_title": "listing_title",
                   "customer_name": "customer_name", "amount": "amount"}},
]


def seed_test_data(s, base, domain, tenant_uuid, progress):
    # Agents
    agent_by_name = {}
    n_a = 0
    for i, a in enumerate(AGENTS):
        name, title, brk, email, phone, rating, sales, region, bio = a
        rec = {"full_name": name, "title": title, "brokerage": brk, "email": email, "phone": phone,
               "bio": bio, "photo": ux(FACE[i % len(FACE)], 700), "rating": rating, "sales_count": sales,
               "region": region, "sort_order": i,
               "display_name": name, "description": "%s · %s" % (title, region)}
        u = seed_record(s, base, domain, "Agent", rec, progress=progress, tenant_name="default-tenant")
        if u:
            n_a += 1
            agent_by_name[name] = dict(rec, uuid=u)
    progress.ok("Seeded %d Agents." % n_a)

    # Listings
    n_l = 0
    for i, row in enumerate(LISTINGS):
        (title, addr, city, st, hood, ltype, ptype, price, beds, baths, sqft,
         yb, lstate, agent, img_idx, feat, desc) = row
        rec = {
            "title": title, "address": addr, "city": city, "state": st, "neighborhood": hood,
            "listing_type": ltype, "property_type": ptype, "price": price, "beds": beds,
            "baths": baths, "sqft": sqft, "year_built": yb, "listing_state": lstate,
            "description": desc, "image": ux(HOUSE[img_idx % len(HOUSE)]), "agent_name": agent,
            "featured": feat, "sort_order": i,
            "display_name": title,
        }
        if seed_record(s, base, domain, "Listing", rec, progress=progress, tenant_name="default-tenant"):
            n_l += 1
    progress.ok("Seeded %d Listings." % n_l)

    # Tours — owned by the demo buyer so the portal isn't empty.
    BUYER_NAME = "Riley Chen"
    BUYER_PHONE = "(415) 555-0199"
    tours = [
        ("Sun-Drenched Victorian with City Views", "248 Alta Vista Way", "Sofia Delgado", "confirmed", 2, 11,
         "Looking forward to seeing the kitchen and the deck views."),
        ("Light-Filled Marina Condo", "1820 Bay Street #5", "Priya Raman", "requested", 4, 14,
         "Flexible on time — afternoon preferred."),
        ("Craftsman Bungalow with a Garden", "512 Maple Court", "Daniel Okafor", "completed", -5, 10,
         "Loved the garden. Considering an offer."),
        ("Modern Farmhouse on a Double Lot", "3 Willow Bend Lane", "Hannah Kim", "confirmed", 6, 13,
         "Bringing my partner and our inspector's contact."),
        ("Serene Townhouse Near the Park", "31 Linden Row", "Morgan Vance", "cancelled", -2, 16,
         "Had to reschedule — will rebook next week."),
    ]
    n_t = 0
    for (lt, la, agent, state, doff, hour, notes) in tours:
        ag = agent_by_name.get(agent, {})
        rec = {"listing_title": lt, "listing_address": la, "customer_name": BUYER_NAME,
               "customer_email": BUYER_EMAIL, "customer_phone": BUYER_PHONE, "agent_name": agent,
               "tour_state": state, "start_time": dt(doff, hour), "notes": notes,
               "owner_username": BUYER_EMAIL,
               "display_name": "Tour · %s" % lt, "description": "%s · %s" % (agent, state)}
        if seed_record(s, base, domain, "Tour", rec, progress=progress, tenant_name="default-tenant"):
            n_t += 1
    progress.ok("Seeded %d Tours." % n_t)

    # Offers — varied states, owned by the demo buyer.
    offers = [
        ("Craftsman Bungalow with a Garden", 1375000.0, "Conventional", "under_review", "Daniel Okafor", -4,
         "Strong offer, 20% down, flexible close."),
        ("Cozy Starter Condo", 515000.0, "FHA", "submitted", "Daniel Okafor", -1,
         "First-time buyer, pre-approved."),
        ("Light-Filled Marina Condo", 1460000.0, "Conventional", "countered", "Priya Raman", -7,
         "Countered at full ask; deciding."),
        ("Restored Edwardian — Just Sold", 2680000.0, "Cash", "accepted", "Morgan Vance", -12,
         "Winning all-cash offer, 14-day close."),
        ("Penthouse Loft Above the Square", 2050000.0, "VA", "rejected", "Priya Raman", -9,
         "Below ask; seller went another direction."),
    ]
    n_o = 0
    for (lt, amt, fin, state, agent, doff, notes) in offers:
        rec = {"listing_title": lt, "customer_name": BUYER_NAME, "customer_email": BUYER_EMAIL,
               "amount": amt, "financing": fin, "offer_state": state, "submitted_date": day(doff),
               "agent_name": agent, "notes": notes, "owner_username": BUYER_EMAIL,
               "display_name": "Offer · %s" % lt, "description": "$%s · %s" % (int(amt), state)}
        if seed_record(s, base, domain, "Offer", rec, progress=progress, tenant_name="default-tenant"):
            n_o += 1
    progress.ok("Seeded %d Offers." % n_o)


def main():
    setup = AppSetup(AppConfig(), ALL_SCHEMAS, PUBLIC_SCHEMAS)
    setup.run(seed_fn=seed_test_data, policies=POLICIES,
              workflow_definitions=WORKFLOW_DEFINITIONS, event_bindings=EVENT_BINDINGS)


if __name__ == "__main__":
    main()
