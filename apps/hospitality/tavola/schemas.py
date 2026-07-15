# schemas.py — data model for Tavola (multi-location restaurant group)
#
# Pattern: the proven plain-CRUD commerce model (see Atelier). Restaurants + menu
# items are normal PUBLIC objects anyone may browse. Orders are owner-scoped to the
# diner, with OrderLine children (parent_type="order"). Reservations are owner-scoped.
# Every lifecycle field is a renamed `*_state` enum (NEVER `status`/`state`, which the
# platform strips from non-admin writes → 422). The cart is held client-side; checkout
# uses the `stripe_checkout` integration with a simulated fallback, then awards loyalty
# points. This keeps online ordering + reservations + loyalty robust while showcasing
# catalog, public reads, owner-scoping, parent/child line items, workflows + Stripe.

NS = "tavola"

CUISINES = ["Italian", "Japanese", "Mexican", "American", "Mediterranean", "Indian", "Thai", "Cafe"]
PRICE_TIERS = ["$", "$$", "$$$", "$$$$"]
MENU_CATEGORIES = ["Starters", "Mains", "Pasta", "Pizza", "Sides", "Desserts", "Drinks"]
ORDER_TYPES = ["Pickup", "Delivery", "Dine-in"]
ORDER_STATES = ["received", "preparing", "ready", "out_for_delivery", "completed", "cancelled"]
PAY_STATES = ["unpaid", "paid"]
RESERVATION_STATES = ["requested", "confirmed", "seated", "completed", "cancelled", "no_show"]

# A restaurant location. PUBLIC — anyone may discover and browse it.
Restaurant = {
    "schema_type": "object",
    "name": "Restaurant",
    "namespace": "tavola",
    "parent_type": "tenant",
    "description": "A Tavola restaurant location — cuisine, neighborhood, hours, price tier and rating.",
    "attributes": [
        {"name": "name", "type": "string", "mandatory": True},
        {"name": "cuisine", "type": "string", "values": CUISINES},
        {"name": "address", "type": "string"},
        {"name": "neighborhood", "type": "string"},
        {"name": "phone", "type": "string"},
        {"name": "hours", "type": "string"},
        {"name": "price_tier", "type": "string", "values": PRICE_TIERS},
        {"name": "rating", "type": "float"},
        {"name": "image", "type": "Image"},
        {"name": "sort_order", "type": "integer"},
    ],
}

# A menu item. PUBLIC catalog item belonging to a restaurant (denormalized name).
MenuItem = {
    "schema_type": "object",
    "name": "MenuItem",
    "namespace": "tavola",
    "parent_type": "tenant",
    "description": "A dish on a restaurant menu — category, price, dietary tags and a mouth-watering photo.",
    "attributes": [
        {"name": "name", "type": "string", "mandatory": True},
        {"name": "category", "type": "string", "values": MENU_CATEGORIES},
        {"name": "restaurant_name", "type": "string"},
        {"name": "price", "type": "float", "mandatory": True},
        {"name": "description", "type": "text"},
        {"name": "dietary", "type": "string"},          # "Vegetarian · Gluten-free"
        {"name": "image", "type": "Image"},
        {"name": "popular", "type": "boolean"},
        {"name": "sort_order", "type": "integer"},
    ],
}

# A customer order. Owner-scoped to the diner; staff (the restaurant group) see all.
Order = {
    "schema_type": "object",
    "name": "Order",
    "namespace": "tavola",
    "parent_type": "tenant",
    "description": "A diner's order with type, lifecycle state, totals, payment state and loyalty points earned.",
    "attributes": [
        {"name": "order_number", "type": "string", "mandatory": True},
        {"name": "restaurant_name", "type": "string"},
        {"name": "customer_name", "type": "string"},
        {"name": "customer_email", "type": "string"},
        {"name": "customer_phone", "type": "string"},
        {"name": "order_type", "type": "string", "values": ORDER_TYPES},
        # Renamed from `status` on purpose — `status`/`state` are stripped from non-admin writes.
        {"name": "order_state", "type": "string", "mandatory": True, "values": ORDER_STATES},
        {"name": "item_count", "type": "integer"},
        {"name": "subtotal", "type": "float"},
        {"name": "total", "type": "float", "mandatory": True},
        {"name": "pay_state", "type": "string", "values": PAY_STATES},
        {"name": "points_earned", "type": "integer"},
        {"name": "owner_username", "type": "string"},
        {"name": "placed_at", "type": "datetime"},
    ],
    "validations": [
        {"id": "total-nonneg", "assert": {">=": [{"var": "total"}, 0]},
         "message": "Order total cannot be negative.", "severity": "error"},
    ],
}

# A line on an order. Child of Order (parent_type="order").
OrderLine = {
    "schema_type": "object",
    "name": "OrderLine",
    "namespace": "tavola",
    "parent_type": "order",
    "description": "A single line on an order: dish, quantity, unit price and line total.",
    "attributes": [
        {"name": "item_name", "type": "string", "mandatory": True},
        {"name": "quantity", "type": "integer", "mandatory": True},
        {"name": "unit_price", "type": "float"},
        {"name": "line_total", "type": "float"},
        {"name": "restaurant_name", "type": "string"},
        {"name": "owner_username", "type": "string"},
    ],
}

# A table reservation. Owner-scoped to the diner; staff see all.
Reservation = {
    "schema_type": "object",
    "name": "Reservation",
    "namespace": "tavola",
    "parent_type": "tenant",
    "description": "A table reservation with party size, time, lifecycle state and a table assignment.",
    "attributes": [
        {"name": "restaurant_name", "type": "string"},
        {"name": "customer_name", "type": "string"},
        {"name": "customer_email", "type": "string"},
        {"name": "customer_phone", "type": "string"},
        {"name": "party_size", "type": "integer"},
        {"name": "reservation_state", "type": "string", "mandatory": True, "values": RESERVATION_STATES},
        {"name": "start_time", "type": "datetime", "mandatory": True},
        {"name": "table_name", "type": "string"},
        {"name": "notes", "type": "text"},
        {"name": "owner_username", "type": "string"},
    ],
}

ALL_SCHEMAS = [Restaurant, MenuItem, Order, OrderLine, Reservation]
PUBLIC_SCHEMAS = ["restaurant", "menu_item"]
SUPERO_APP_NAMESPACE = "tavola"
