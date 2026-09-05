import sys, os, datetime
sys.path.insert(0, os.path.dirname(__file__))
from supero.app_setup import AppSetup, PolicyDef, PolicyRule, make_seed_record
from config import AppConfig
from schemas import ALL_SCHEMAS, PUBLIC_SCHEMAS, SUPERO_APP_NAMESPACE

seed_record = make_seed_record(SUPERO_APP_NAMESPACE)

DINER_EMAIL = "diner@tavola.dining"
DINER_NAME = "Sam Rivera"
DINER_PHONE = "(415) 555-0177"


def ux(pid, w=1000):
    """Verified Unsplash CDN image → {url, thumbnail_url}."""
    base = "https://images.unsplash.com/photo-" + pid + "?auto=format&fit=crop&q=80"
    return {"url": "%s&w=%d&h=%d" % (base, w, w), "thumbnail_url": "%s&w=500&h=500" % base}


def _now_iso():
    return datetime.datetime.utcnow().replace(microsecond=0).isoformat() + "Z"


def dt(days, hour, minute=0):
    d = datetime.datetime.utcnow() + datetime.timedelta(days=days)
    return d.replace(hour=hour, minute=minute, second=0, microsecond=0).isoformat() + "Z"


# ── Restaurants (locations) ──────────────────────────────────────────────────────
# (name, cuisine, address, neighborhood, phone, hours, price_tier, rating, img)
RESTAURANTS = [
    ("Tavola Trattoria", "Italian", "118 Vine St", "North Beach", "(415) 555-0110",
     "Mon–Sun · 11:30am – 10:30pm", "$$$", 4.8, "1414235077428-338989a2e8c0"),
    ("Sakura by Tavola", "Japanese", "44 Lantern Alley", "Japantown", "(415) 555-0123",
     "Tue–Sun · 5:00pm – 11:00pm", "$$$$", 4.9, "1517248135467-4c7edcad34c4"),
    ("Tavola Cantina", "Mexican", "207 Mission St", "The Mission", "(415) 555-0148",
     "Mon–Sun · 11:00am – 11:00pm", "$$", 4.6, "1559339352-11d035aa65de"),
    ("Tavola Cafe", "Cafe", "9 Maple Court", "Hayes Valley", "(415) 555-0162",
     "Mon–Sun · 7:00am – 6:00pm", "$", 4.7, "1466978913421-dad2ebd01d17"),
]

# ── Menu items: (restaurant, name, category, price, dietary, popular, description, img) ──
MENU = [
    # Tavola Trattoria — Italian
    ("Tavola Trattoria", "Burrata & Heirloom Tomato", "Starters", 16.0, "Vegetarian · Gluten-free", True,
     "Creamy Puglian burrata, heirloom tomatoes, basil oil and aged balsamic.", "1546069901-ba9599a7e63c"),
    ("Tavola Trattoria", "Tagliatelle al Ragù", "Pasta", 26.0, "", True,
     "House-rolled tagliatelle in a slow-braised beef and pork Bolognese.", "1572802419224-296b0aeee0d9"),
    ("Tavola Trattoria", "Cacio e Pepe", "Pasta", 22.0, "Vegetarian", True,
     "Tonnarelli, Pecorino Romano and cracked black pepper. Roman classic.", "1551183053-bf91a1d81141"),
    ("Tavola Trattoria", "Margherita DOP Pizza", "Pizza", 19.0, "Vegetarian", True,
     "San Marzano, fior di latte, basil and Sicilian olive oil. 90 seconds in the wood oven.", "1604382354936-07c5d9983bd3"),
    ("Tavola Trattoria", "Diavola Pizza", "Pizza", 21.0, "Spicy", False,
     "Spicy 'nduja, soppressata, chili honey and mozzarella.", "1593504049359-74330189a345"),
    ("Tavola Trattoria", "Tiramisù", "Desserts", 12.0, "Vegetarian", True,
     "Espresso-soaked savoiardi, mascarpone cream and cocoa. Made daily.", "1571877227200-a0d98ea607e9"),
    ("Tavola Trattoria", "Garlic Focaccia", "Sides", 8.0, "Vegan", False,
     "Rosemary focaccia with confit garlic and flaky sea salt.", "1606491956689-2ea866880c84"),

    # Sakura by Tavola — Japanese
    ("Sakura by Tavola", "Omakase Nigiri (8 pc)", "Mains", 48.0, "Gluten-free", True,
     "Chef's selection of eight seasonal nigiri over warm shari rice.", "1579871494447-9811cf80d66c"),
    ("Sakura by Tavola", "Spicy Tuna Roll", "Starters", 16.0, "Spicy", True,
     "Bluefin tuna, chili mayo, cucumber and toasted sesame.", "1579584425555-c3ce17fd4351"),
    ("Sakura by Tavola", "Salmon Sashimi", "Starters", 22.0, "Gluten-free · Dairy-free", True,
     "Six slices of buttery ora king salmon with fresh wasabi.", "1565299585323-38d6b0865b47"),
    ("Sakura by Tavola", "Tonkotsu Ramen", "Mains", 19.0, "", True,
     "18-hour pork broth, chashu, soft egg, scallion and bamboo shoots.", "1569718212165-3a8278d5f624"),
    ("Sakura by Tavola", "Pork Gyoza", "Sides", 11.0, "", False,
     "Pan-seared dumplings with ginger-soy dipping sauce.", "1496116218417-1a781b1c416c"),
    ("Sakura by Tavola", "Matcha Cheesecake", "Desserts", 11.0, "Vegetarian", False,
     "Silky matcha cheesecake on a black-sesame base.", "1565895405138-6c3a1555da6a"),

    # Tavola Cantina — Mexican
    ("Tavola Cantina", "Al Pastor Tacos (3)", "Mains", 15.0, "Gluten-free", True,
     "Marinated pork, charred pineapple, onion and cilantro on corn tortillas.", "1565299624946-b28f40a0ae38"),
    ("Tavola Cantina", "Guacamole & Chips", "Starters", 11.0, "Vegan · Gluten-free", True,
     "Hand-mashed avocado, lime and serrano, with warm tortilla chips.", "1600891964092-4316c288032e"),
    ("Tavola Cantina", "Carne Asada Bowl", "Mains", 18.0, "Gluten-free", True,
     "Grilled skirt steak, cilantro-lime rice, black beans and pico de gallo.", "1551782450-17144efb9c50"),
    ("Tavola Cantina", "Birria Quesatacos (3)", "Mains", 17.0, "Spicy", True,
     "Slow-braised beef birria, melted cheese and rich consommé for dipping.", "1599974579688-8dbdd335c77f"),
    ("Tavola Cantina", "Churros", "Desserts", 9.0, "Vegetarian", False,
     "Cinnamon-sugar churros with dark chocolate and dulce de leche.", "1601979031925-424e53b6caaa"),
    ("Tavola Cantina", "Horchata", "Drinks", 5.0, "Vegan", False,
     "House-made cinnamon rice horchata, served over ice.", "1541658016709-82535e94bc69"),

    # Tavola Cafe — Cafe
    ("Tavola Cafe", "Avocado Toast", "Starters", 13.0, "Vegetarian", True,
     "Smashed avocado, chili flakes and poached egg on sourdough.", "1488477181946-6428a0291777"),
    ("Tavola Cafe", "Flat White", "Drinks", 5.0, "Vegetarian", True,
     "Double ristretto and silky steamed milk. Beans roasted in-house.", "1561758033-d89a9ad46330"),
    ("Tavola Cafe", "Almond Croissant", "Desserts", 6.0, "Vegetarian", True,
     "Buttery laminated croissant filled with almond frangipane.", "1555396273-367ea4eb4db5"),
    ("Tavola Cafe", "Acai Bowl", "Mains", 14.0, "Vegan · Gluten-free", False,
     "Acai blended with banana, topped with granola, berries and coconut.", "1590301157890-4810ed352733"),
    ("Tavola Cafe", "Iced Matcha Latte", "Drinks", 6.0, "Vegetarian", False,
     "Ceremonial-grade matcha over oat milk and ice.", "1515823662972-da6a2e4d3002"),
    ("Tavola Cafe", "Lemon Olive-Oil Cake", "Desserts", 7.0, "Vegetarian", False,
     "Moist olive-oil cake with lemon glaze and crème fraîche.", "1519915028121-7d3463d20b13"),
]

# ── Demo orders for the diner: (number, restaurant, type, state, pay, days_ago, lines[(item, qty)]) ──
DEMO_ORDERS = [
    ("TAV-100412", "Tavola Trattoria", "Delivery", "completed", "paid", -16,
     [("Tagliatelle al Ragù", 1), ("Margherita DOP Pizza", 1), ("Tiramisù", 2)]),
    ("TAV-100455", "Sakura by Tavola", "Pickup", "completed", "paid", -9,
     [("Omakase Nigiri (8 pc)", 1), ("Spicy Tuna Roll", 1), ("Pork Gyoza", 1)]),
    ("TAV-100489", "Tavola Cantina", "Dine-in", "completed", "paid", -4,
     [("Al Pastor Tacos (3)", 2), ("Guacamole & Chips", 1), ("Horchata", 2)]),
    ("TAV-100517", "Tavola Trattoria", "Delivery", "preparing", "paid", 0,
     [("Cacio e Pepe", 2), ("Garlic Focaccia", 1)]),
    ("TAV-100521", "Tavola Cafe", "Pickup", "received", "paid", 0,
     [("Avocado Toast", 1), ("Flat White", 2), ("Almond Croissant", 1)]),
]

# ── Demo reservations for the diner: (restaurant, party, state, days, hour, table, notes) ──
DEMO_RESERVATIONS = [
    ("Tavola Trattoria", 2, "completed", -7, 19, "Table 12", "Anniversary — window table requested."),
    ("Sakura by Tavola", 4, "confirmed", 2, 20, "Sushi Counter", "Two guests prefer no shellfish."),
    ("Tavola Cantina", 6, "requested", 4, 18, "", "Birthday celebration, high chair needed."),
    ("Tavola Cafe", 2, "confirmed", 1, 9, "Patio 3", "Working brunch, near an outlet please."),
    ("Tavola Trattoria", 3, "seated", 0, 13, "Table 5", "Business lunch."),
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
        PolicyRule(entity="menu_item", can_read=True, can_create=True, can_update=True, can_delete=True),
        PolicyRule(entity="order", can_read=True, can_create=True, can_update=True),
        PolicyRule(entity="order_line", can_read=True, can_create=True, can_update=True),
        PolicyRule(entity="reservation", can_read=True, can_create=True, can_update=True),
        PolicyRule(entity="restaurant", can_read=True, can_create=True, can_update=True, can_delete=True),
    ]),
    PolicyDef(role="tenant_user", default_access="none", rules=[
        # Discovery — every diner may read locations and menus:
        PolicyRule(entity="restaurant", can_read=True),
        PolicyRule(entity="menu_item", can_read=True),
        # Private — each diner sees only their own orders, lines and reservations:
        PolicyRule(entity="order", can_read=True, can_create=True, can_update=True,
                   filter_field="owner_username", filter_match="$user.name"),
        PolicyRule(entity="order_line", can_read=True, can_create=True,
                   filter_field="owner_username", filter_match="$user.name"),
        PolicyRule(entity="reservation", can_read=True, can_create=True, can_update=True,
                   filter_field="owner_username", filter_match="$user.name"),
    ]),
]


# ── Workflows ────────────────────────────────────────────────────────────────────
WORKFLOW_DEFINITIONS = [
    {
        "workflow_id": "order_confirmation", "display_name": "Order Confirmation",
        "description": "Emails and texts the customer when an order is placed.",
        "version": "1.0.0", "enabled": True, "status": "Active", "on_error": "continue",
        "input_schema": {"customer_email": {"type": "string", "required": False},
                         "customer_phone": {"type": "string", "required": False},
                         "customer_name": {"type": "string", "required": False},
                         "order_number": {"type": "string", "required": False},
                         "restaurant_name": {"type": "string", "required": False},
                         "total": {"type": "number", "required": False}},
        "steps": [
            {"id": "email", "type": "service_call", "service": "email", "operation": "send_email", "on_error": "continue",
             "input_map": {"to_email": "{{input.customer_email}}",
                           "subject": "Your Tavola order {{input.order_number}} is confirmed",
                           "body_html": "<p>Hi {{input.customer_name}},</p><p>Thanks for ordering from {{input.restaurant_name}}! Your order {{input.order_number}} (${{input.total}}) is confirmed and the kitchen is on it. We'll let you know the moment it's ready.</p><p>— Tavola</p>"}},
            {"id": "sms", "type": "service_call", "service": "sms", "operation": "send_sms", "on_error": "continue",
             "input_map": {"to": "{{input.customer_phone}}",
                           "body": "Tavola: order {{input.order_number}} from {{input.restaurant_name}} confirmed (${{input.total}}). We'll text you when it's ready!"}},
        ],
    },
    {
        "workflow_id": "reservation_confirmation", "display_name": "Reservation Confirmation",
        "description": "Emails the guest when a table reservation is requested.",
        "version": "1.0.0", "enabled": True, "status": "Active", "on_error": "continue",
        "input_schema": {"customer_email": {"type": "string", "required": False},
                         "customer_name": {"type": "string", "required": False},
                         "restaurant_name": {"type": "string", "required": False},
                         "party_size": {"type": "number", "required": False},
                         "start_time": {"type": "string", "required": False}},
        "steps": [
            {"id": "email", "type": "service_call", "service": "email", "operation": "send_email", "on_error": "continue",
             "input_map": {"to_email": "{{input.customer_email}}",
                           "subject": "Your table at {{input.restaurant_name}}",
                           "body_html": "<p>Hi {{input.customer_name}},</p><p>We've received your reservation request for {{input.party_size}} at {{input.restaurant_name}} on {{input.start_time}}. Our team will confirm shortly — we can't wait to host you.</p><p>— Tavola</p>"}},
        ],
    },
    {
        # SAGA — top-level on_error: compensate; the state-advance step has a compensate block.
        "workflow_id": "order_ready", "display_name": "Order Ready",
        "description": "Marks an order ready and texts the customer (saga — reverts the state if the SMS fails).",
        "version": "1.0.0", "enabled": True, "status": "Active", "on_error": "compensate",
        "input_schema": {"order_uuid": {"type": "string", "required": True},
                         "customer_phone": {"type": "string", "required": False},
                         "customer_name": {"type": "string", "required": False},
                         "order_number": {"type": "string", "required": False},
                         "restaurant_name": {"type": "string", "required": False},
                         "prev_state": {"type": "string", "required": False}},
        "steps": [
            {"id": "advance", "type": "crud_operation", "operation": "update", "object_type": "tavola:order",
             "record_uuid": "{{input.order_uuid}}", "data": {"order_state": "ready"},
             "compensate": {"kind": "automatic", "type": "crud_operation", "operation": "update",
                            "object_type": "tavola:order", "record_uuid": "{{input.order_uuid}}",
                            "data": {"order_state": "{{input.prev_state}}"}}},
            {"id": "sms", "type": "service_call", "service": "sms", "operation": "send_sms",
             "input_map": {"to": "{{input.customer_phone}}",
                           "body": "Tavola: your order {{input.order_number}} from {{input.restaurant_name}} is READY! 🍽️ Come grab it while it's hot."}},
        ],
    },
]

# TWO event bindings (an order @create + a reservation @create) — both fine.
EVENT_BINDINGS = [
    # NO-OPEN-RELAY-V1 — the recipient is taken from `user.email` (the verified
    # JWT of whoever performed the action), NOT from the record field the
    # visitor typed. The form field is free text, so mapping it here let any
    # signed-in visitor aim this app's real transactional mail at a stranger —
    # using the demo password published in this README. The event payload
    # carries `user` from the verified token (server.py: payload["user"]).
    {"event": "@create:tavola:order", "workflow_id": "order_confirmation",
     "input_map": {"customer_email": "user.email",
                   "customer_name": "customer_name", "order_number": "order_number",
                   "restaurant_name": "restaurant_name", "total": "total"}},
    {"event": "@create:tavola:reservation", "workflow_id": "reservation_confirmation",
     "input_map": {"customer_email": "user.email", "customer_name": "customer_name",
                   "restaurant_name": "restaurant_name", "party_size": "party_size",
                   "start_time": "start_time"}},
]


def seed_test_data(s, base, domain, tenant_uuid, progress):
    # Restaurants
    nr = 0
    for i, r in enumerate(RESTAURANTS):
        name, cuisine, addr, hood, phone, hours, tier, rating, img = r
        rec = {"name": name, "cuisine": cuisine, "address": addr, "neighborhood": hood, "phone": phone,
               "hours": hours, "price_tier": tier, "rating": rating, "image": ux(img), "sort_order": i,
               "display_name": name, "description": "%s · %s · %s" % (cuisine, hood, tier)}
        if seed_record(s, base, domain, "Restaurant", rec, progress=progress, tenant_name="default-tenant"):
            nr += 1
    progress.ok("Seeded %d Restaurants." % nr)

    # Menu items
    item_by_name = {}
    nm = 0
    for i, m in enumerate(MENU):
        rest, name, cat, price, diet, pop, desc, img = m
        rec = {"name": name, "category": cat, "restaurant_name": rest, "price": price, "description": desc,
               "dietary": diet, "image": ux(img), "popular": pop, "sort_order": i,
               "display_name": name, "description": desc}
        if seed_record(s, base, domain, "MenuItem", rec, progress=progress, tenant_name="default-tenant"):
            nm += 1
            item_by_name[name] = dict(rec, price=price, restaurant_name=rest)
    progress.ok("Seeded %d MenuItems." % nm)

    # Demo orders owned by the diner (with OrderLine children + loyalty points).
    no = 0
    nl = 0
    for (num, rest, otype, ostate, pay, doff, lines) in DEMO_ORDERS:
        built = []
        for (iname, qty) in lines:
            mi = item_by_name.get(iname)
            if not mi:
                continue
            built.append({"item_name": iname, "quantity": qty, "unit_price": mi["price"],
                          "line_total": round(mi["price"] * qty, 2), "restaurant_name": rest})
        if not built:
            continue
        subtotal = round(sum(l["line_total"] for l in built), 2)
        total = round(subtotal, 2)
        points = int(round(total))  # ~1 point per dollar
        order = {"order_number": num, "restaurant_name": rest, "customer_name": DINER_NAME,
                 "customer_email": DINER_EMAIL, "customer_phone": DINER_PHONE, "order_type": otype,
                 "order_state": ostate, "item_count": sum(l["quantity"] for l in built),
                 "subtotal": subtotal, "total": total, "pay_state": pay, "points_earned": points,
                 "owner_username": DINER_EMAIL, "placed_at": dt(doff, 12),
                 "display_name": num, "description": "%s · %s · %s" % (rest, otype, ostate)}
        ouid = seed_record(s, base, domain, "Order", order, progress=progress, tenant_name="default-tenant")
        if not ouid:
            continue
        no += 1
        for l in built:
            line = dict(l)
            line["owner_username"] = DINER_EMAIL
            line["display_name"] = "%dx %s" % (line["quantity"], line["item_name"])
            line["description"] = "%s · %s" % (line["item_name"], rest)
            line["parent_type"] = "order"
            line["parent_uuid"] = ouid
            if seed_record(s, base, domain, "OrderLine", line, progress=progress, tenant_name="default-tenant"):
                nl += 1
    progress.ok("Seeded %d Orders." % no)
    progress.ok("Seeded %d OrderLines." % nl)

    # Demo reservations owned by the diner.
    nres = 0
    for (rest, party, rstate, doff, hour, table, notes) in DEMO_RESERVATIONS:
        rec = {"restaurant_name": rest, "customer_name": DINER_NAME, "customer_email": DINER_EMAIL,
               "customer_phone": DINER_PHONE, "party_size": party, "reservation_state": rstate,
               "start_time": dt(doff, hour), "table_name": table, "notes": notes,
               "owner_username": DINER_EMAIL, "display_name": "%s · party of %d" % (rest, party),
               "description": "%s · %s" % (rest, rstate)}
        if seed_record(s, base, domain, "Reservation", rec, progress=progress, tenant_name="default-tenant"):
            nres += 1
    progress.ok("Seeded %d Reservations." % nres)


def main():
    setup = AppSetup(AppConfig(), ALL_SCHEMAS, PUBLIC_SCHEMAS)
    setup.run(seed_fn=seed_test_data, policies=POLICIES,
              workflow_definitions=WORKFLOW_DEFINITIONS, event_bindings=EVENT_BINDINGS)


if __name__ == "__main__":
    main()
