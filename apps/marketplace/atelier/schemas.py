# schemas.py — data model for Atelier (B2B wholesale marketplace)
#
# Pattern: the proven plain-CRUD "minishop" model. Brands + products are normal
# public objects; wholesale orders are normal objects with a renamed `order_state`
# enum (NOT `status`, which the platform strips from non-admin writes). Buyers are
# owner-scoped profiles. The multi-brand cart is held client-side; checkout uses the
# `stripe_checkout` integration with a simulated fallback. This keeps the whole
# commerce flow robust while still demonstrating catalog, references, public reads,
# owner-scoping, validations, and Stripe.

NS = "atelier"

CATEGORIES = [
    "Home & Living", "Apparel & Accessories", "Beauty & Wellness",
    "Food & Drink", "Stationery & Gifts", "Jewelry", "Kids & Baby",
]
STORE_TYPES = ["Boutique", "Gift Shop", "Salon & Spa", "Cafe & Restaurant",
               "Online Store", "Department Store"]
NET_TERMS = ["Prepaid", "Net 15", "Net 30", "Net 60"]

# An independent brand / maker selling wholesale. PUBLIC — anyone may discover it.
Brand = {
    "schema_type": "object",
    "name": "Brand",
    "namespace": "atelier",
    "parent_type": "tenant",
    "description": "An independent wholesale brand or maker with a story, catalog, lead time and minimum order.",
    "attributes": [
        {"name": "brand_name", "type": "string", "mandatory": True},
        {"name": "tagline", "type": "string"},
        {"name": "story", "type": "text"},
        {"name": "category", "type": "string", "values": CATEGORIES},
        {"name": "location", "type": "string"},
        {"name": "values", "type": "string"},            # "Sustainable · Woman-owned · Handmade"
        {"name": "min_order", "type": "float"},           # minimum opening order ($)
        {"name": "lead_time", "type": "string"},          # "Ships in 2–3 weeks"
        {"name": "year_founded", "type": "integer"},
        {"name": "logo", "type": "Image"},
        {"name": "hero", "type": "Image"},
        {"name": "featured", "type": "boolean"},
        {"name": "sort_order", "type": "integer"},
    ],
}

# A wholesale product. PUBLIC catalog item. References its Brand.
Product = {
    "schema_type": "object",
    "name": "Product",
    "namespace": "atelier",
    "parent_type": "tenant",
    "description": "A wholesale catalog product with case pack, wholesale price, suggested retail and imagery.",
    "attributes": [
        {"name": "product_name", "type": "string", "mandatory": True},
        {"name": "brand_name", "type": "string"},         # denormalized for fast display
        {"name": "category", "type": "string", "values": CATEGORIES},
        {"name": "wholesale_price", "type": "float", "mandatory": True},
        {"name": "msrp", "type": "float"},                # suggested retail
        {"name": "case_pack", "type": "integer"},         # units per case
        {"name": "unit", "type": "string"},               # "Case of 12", "Each"
        {"name": "sku", "type": "string"},
        {"name": "materials", "type": "string"},
        {"name": "description", "type": "text"},
        {"name": "image", "type": "Image"},
        {"name": "in_stock", "type": "boolean"},
        {"name": "featured", "type": "boolean"},
        {"name": "bestseller", "type": "boolean"},
        {"name": "sort_order", "type": "integer"},
    ],
    "references": [
        {"name": "Brand", "cardinality": "one", "back_ref_name": "products"},
    ],
}

# A retail buyer (boutique) account profile. Owner-scoped: each buyer sees only their own.
Buyer = {
    "schema_type": "object",
    "name": "Buyer",
    "namespace": "atelier",
    "parent_type": "tenant",
    "description": "A retail buyer account — the boutique or shop placing wholesale orders, with terms and shipping.",
    "attributes": [
        {"name": "business_name", "type": "string", "mandatory": True},
        {"name": "buyer_name", "type": "string"},
        {"name": "email", "type": "string", "mandatory": True},
        {"name": "phone", "type": "string"},
        {"name": "store_type", "type": "string", "values": STORE_TYPES},
        {"name": "address", "type": "text"},
        {"name": "region", "type": "string"},
        {"name": "resale_id", "type": "string"},          # resale / tax certificate id
        {"name": "net_terms", "type": "string", "values": NET_TERMS},
        {"name": "owner_username", "type": "string"},
        {"name": "user_account_uuid", "type": "string"},
    ],
}

# A wholesale order. Owner-scoped to the buyer; admins (the marketplace operator) see all.
Order = {
    "schema_type": "object",
    "name": "Order",
    "namespace": "atelier",
    "parent_type": "tenant",
    "description": "A wholesale order spanning one or more brands, with terms, totals, fulfilment and payment state.",
    "attributes": [
        {"name": "order_number", "type": "string", "mandatory": True},
        {"name": "business_name", "type": "string"},
        {"name": "buyer_name", "type": "string"},
        {"name": "buyer_email", "type": "string"},
        {"name": "buyer_phone", "type": "string"},
        {"name": "shipping_address", "type": "text"},
        # Renamed from `status` on purpose — `status`/`state` are stripped from non-admin writes.
        {"name": "order_state", "type": "string", "mandatory": True,
         "values": ["pending", "confirmed", "shipped", "delivered", "cancelled"]},
        {"name": "payment_terms", "type": "string", "values": NET_TERMS},
        {"name": "subtotal", "type": "float"},
        {"name": "shipping_fee", "type": "float"},
        {"name": "total", "type": "float", "mandatory": True},
        {"name": "item_count", "type": "integer"},
        {"name": "brand_count", "type": "integer"},
        {"name": "pay_state", "type": "string", "values": ["unpaid", "paid", "refunded"]},
        {"name": "payment_provider", "type": "string"},
        {"name": "stripe_checkout_url", "type": "string"},
        {"name": "placed_by", "type": "string", "values": ["buyer", "admin"]},
        {"name": "notes", "type": "text"},
        {"name": "owner_username", "type": "string"},
        {"name": "paid_at", "type": "datetime"},
        {"name": "expected_ship", "type": "date"},
    ],
    "validations": [
        {"id": "total-nonneg", "assert": {">=": [{"var": "total"}, 0]},
         "message": "Order total cannot be negative.", "severity": "error"},
    ],
}

# A line on a wholesale order. Child of Order.
OrderItem = {
    "schema_type": "object",
    "name": "OrderItem",
    "namespace": "atelier",
    "parent_type": "order",
    "description": "A single line on a wholesale order: product, brand, case pack, unit price and quantity.",
    "attributes": [
        {"name": "product_name", "type": "string", "mandatory": True},
        {"name": "product_uuid", "type": "string"},
        {"name": "brand_name", "type": "string"},
        {"name": "sku", "type": "string"},
        {"name": "unit_price", "type": "float", "mandatory": True},
        {"name": "case_pack", "type": "integer"},
        {"name": "quantity", "type": "integer", "mandatory": True},
        {"name": "line_total", "type": "float"},
        {"name": "image", "type": "Image"},
        {"name": "owner_username", "type": "string"},
    ],
}

ALL_SCHEMAS = [Brand, Product, Buyer, Order, OrderItem]
PUBLIC_SCHEMAS = ["brand", "product"]
SUPERO_APP_NAMESPACE = "atelier"
