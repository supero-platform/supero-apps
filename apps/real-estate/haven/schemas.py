# schemas.py — data model for Haven (premium real-estate marketplace + agent platform)
#
# Pattern: proven plain-CRUD model. Listings + agents are normal PUBLIC objects so the
# search portal works logged-out. Tours + offers are owner-scoped private records (each
# buyer sees only their own). Every lifecycle field is renamed to `<x>_state` (NEVER
# `status`/`state`, which the platform strips from non-admin writes → 422). Namespace
# is the plain string literal "haven" on every schema dict.

NS = "haven"

LISTING_TYPES = ["For Sale", "For Rent"]
PROPERTY_TYPES = ["House", "Condo", "Townhouse", "Apartment", "Land", "Commercial"]
LISTING_STATES = ["active", "pending", "sold", "off_market"]
TOUR_STATES = ["requested", "confirmed", "completed", "cancelled"]
OFFER_STATES = ["submitted", "under_review", "accepted", "countered", "rejected", "withdrawn"]
FINANCING = ["Cash", "Conventional", "FHA", "VA"]

# A property listing. PUBLIC — anyone can browse and search the portal.
Listing = {
    "schema_type": "object", "name": "Listing", "namespace": "haven", "parent_type": "tenant",
    "description": "A premium property listing — address, specs, price, photography and lifecycle state.",
    "attributes": [
        {"name": "title", "type": "string", "mandatory": True},
        {"name": "address", "type": "string"},
        {"name": "city", "type": "string"},
        {"name": "state", "type": "string"},
        {"name": "neighborhood", "type": "string"},
        {"name": "listing_type", "type": "string", "values": LISTING_TYPES},
        {"name": "property_type", "type": "string", "values": PROPERTY_TYPES},
        {"name": "price", "type": "float"},
        {"name": "beds", "type": "integer"},
        {"name": "baths", "type": "float"},
        {"name": "sqft", "type": "integer"},
        {"name": "year_built", "type": "integer"},
        # Renamed from `status` on purpose — `status`/`state` are stripped from non-admin writes.
        {"name": "listing_state", "type": "string", "mandatory": True, "values": LISTING_STATES},
        {"name": "description", "type": "text"},
        {"name": "image", "type": "Image"},
        {"name": "agent_name", "type": "string"},
        {"name": "featured", "type": "boolean"},
        {"name": "sort_order", "type": "integer"},
    ],
}

# A real-estate agent. PUBLIC — buyers browse the agent directory.
Agent = {
    "schema_type": "object", "name": "Agent", "namespace": "haven", "parent_type": "tenant",
    "description": "A real-estate agent or broker with brokerage, ratings, region and bio.",
    "attributes": [
        {"name": "full_name", "type": "string", "mandatory": True},
        {"name": "title", "type": "string"},
        {"name": "brokerage", "type": "string"},
        {"name": "email", "type": "string"},
        {"name": "phone", "type": "string"},
        {"name": "bio", "type": "text"},
        {"name": "photo", "type": "Image"},
        {"name": "rating", "type": "float"},
        {"name": "sales_count", "type": "integer"},
        {"name": "region", "type": "string"},
        {"name": "sort_order", "type": "integer"},
    ],
}

# A property tour request. Owner-scoped to the buyer; admins (brokerage) see all.
Tour = {
    "schema_type": "object", "name": "Tour", "namespace": "haven", "parent_type": "tenant",
    "description": "A scheduled property tour requested by a buyer, with lifecycle state and time.",
    "attributes": [
        {"name": "listing_title", "type": "string"},
        {"name": "listing_address", "type": "string"},
        {"name": "customer_name", "type": "string"},
        {"name": "customer_email", "type": "string"},
        {"name": "customer_phone", "type": "string"},
        {"name": "agent_name", "type": "string"},
        {"name": "tour_state", "type": "string", "mandatory": True, "values": TOUR_STATES},
        {"name": "start_time", "type": "datetime", "mandatory": True},
        {"name": "notes", "type": "text"},
        {"name": "owner_username", "type": "string"},
    ],
}

# A purchase offer. Owner-scoped to the buyer; admins review and accept/counter/reject.
Offer = {
    "schema_type": "object", "name": "Offer", "namespace": "haven", "parent_type": "tenant",
    "description": "A purchase offer on a listing with amount, financing and a review lifecycle.",
    "attributes": [
        {"name": "listing_title", "type": "string"},
        {"name": "customer_name", "type": "string"},
        {"name": "customer_email", "type": "string"},
        {"name": "amount", "type": "float", "mandatory": True},
        {"name": "financing", "type": "string", "values": FINANCING},
        {"name": "offer_state", "type": "string", "mandatory": True, "values": OFFER_STATES},
        {"name": "submitted_date", "type": "date"},
        {"name": "agent_name", "type": "string"},
        {"name": "notes", "type": "text"},
        {"name": "owner_username", "type": "string"},
    ],
}

ALL_SCHEMAS = [Listing, Agent, Tour, Offer]
PUBLIC_SCHEMAS = ["listing", "agent"]
SUPERO_APP_NAMESPACE = "haven"
