import sys, os, datetime
sys.path.insert(0, os.path.dirname(__file__))
from supero.app_setup import AppSetup, PolicyDef, PolicyRule, make_seed_record
from config import AppConfig
from schemas import ALL_SCHEMAS, PUBLIC_SCHEMAS, SUPERO_APP_NAMESPACE

seed_record = make_seed_record(SUPERO_APP_NAMESPACE)

BUYER_EMAIL = "buyer@atelier.market"


def ux(pid, w=1000):
    """Verified Unsplash CDN image → {url, thumbnail_url}."""
    base = "https://images.unsplash.com/photo-" + pid + "?auto=format&fit=crop&q=80"
    return {"url": "%s&w=%d&h=%d" % (base, w, w), "thumbnail_url": "%s&w=500&h=500" % base}


def _now_iso():
    return datetime.datetime.utcnow().replace(microsecond=0).isoformat() + "Z"


def _ship_date(days):
    return (datetime.date.today() + datetime.timedelta(days=days)).isoformat()


# ── Brands ────────────────────────────────────────────────────────────────────
BRANDS = [
    {"brand_name": "Field & Fawn", "category": "Home & Living", "location": "Portland, OR",
     "tagline": "Heirloom homewares for the slow-living home",
     "values": "Sustainable · Family-owned · Made in USA", "min_order": 250.0,
     "lead_time": "Ships in 2–3 weeks", "year_founded": 2016, "featured": True,
     "story": "Field & Fawn began at a Portland farmers market with a single run of hand-thrown stoneware. Today every piece is still made in small batches by a team of six, using locally sourced clay and natural glazes.",
     "hero": ux("1441986300917-64674bd600d8", 1600), "logo": ux("1586023492125-27b2c045efd7")},
    {"brand_name": "Wovenwild", "category": "Home & Living", "location": "Santa Cruz, CA",
     "tagline": "Fair-trade textiles with a coastal soul",
     "values": "Fair-trade · Handwoven · Natural fibers", "min_order": 300.0,
     "lead_time": "Ships in 3–4 weeks", "year_founded": 2014, "featured": True,
     "story": "Wovenwild partners with weaving cooperatives across Oaxaca and Gujarat to bring handwoven throws, cushions and rugs to independent shops — paying fair wages and preserving traditional craft.",
     "hero": ux("1604719312566-8912e9227c6a", 1600), "logo": ux("1556228453-efd6c1ff04f6")},
    {"brand_name": "Maison Lumière", "category": "Beauty & Wellness", "location": "Los Angeles, CA",
     "tagline": "Clean, botanical skincare in refillable glass",
     "values": "Clean · Vegan · Cruelty-free", "min_order": 200.0,
     "lead_time": "Ships in 1–2 weeks", "year_founded": 2019, "featured": True,
     "story": "Founded by a former perfumer, Maison Lumière formulates small-batch botanical skincare in refillable apothecary glass — no synthetic fragrance, no fillers, just plant actives.",
     "hero": ux("1556742502-ec7c0e9f34b1", 1600), "logo": ux("1556228720-195a672e8a03")},
    {"brand_name": "Atlas Goods", "category": "Apparel & Accessories", "location": "Brooklyn, NY",
     "tagline": "Everyday essentials, ethically made",
     "values": "Ethically made · Organic cotton · Carbon-neutral", "min_order": 350.0,
     "lead_time": "Ships in 2–4 weeks", "year_founded": 2015, "featured": False,
     "story": "Atlas Goods makes the wardrobe staples you actually reach for — knit tees, canvas totes and merino accessories — in a worker-owned factory with full supply-chain transparency.",
     "hero": ux("1472851294608-062f824d29cc", 1600), "logo": ux("1523381210434-271e8be1f52b")},
    {"brand_name": "Hearth & Honey", "category": "Food & Drink", "location": "Asheville, NC",
     "tagline": "Small-batch pantry goods from the Blue Ridge",
     "values": "Small-batch · Organic · Locally sourced", "min_order": 150.0,
     "lead_time": "Ships in 1 week", "year_founded": 2017, "featured": True,
     "story": "Hearth & Honey jars wildflower honey, slow-cooked preserves and spiced ferments in the mountains of western North Carolina — sweet things made the unhurried way.",
     "hero": ux("1521334884684-d80222895322", 1600), "logo": ux("1497534547324-0ebb3f052e88")},
    {"brand_name": "Paper & Plume", "category": "Stationery & Gifts", "location": "Austin, TX",
     "tagline": "Letterpress paper goods worth keeping",
     "values": "Letterpress · Recycled paper · Woman-owned", "min_order": 120.0,
     "lead_time": "Ships in 2 weeks", "year_founded": 2018, "featured": False,
     "story": "Every card and notebook from Paper & Plume is printed on a 1960s Heidelberg letterpress with soy inks on 100% cotton stock — tactile paper goods for people who still write things down.",
     "hero": ux("1559563458-527698bf5295", 1600), "logo": ux("1531346878377-a5be20888e57")},
    {"brand_name": "Lune & Lyra", "category": "Jewelry", "location": "Santa Fe, NM",
     "tagline": "Handmade fine jewelry in recycled gold",
     "values": "Handmade · Recycled gold · Conflict-free", "min_order": 400.0,
     "lead_time": "Ships in 3–5 weeks", "year_founded": 2013, "featured": True,
     "story": "Lune & Lyra hand-fabricates each piece in a Santa Fe studio using 100% recycled gold and ethically sourced stones — modern heirlooms designed to be worn every day.",
     "hero": ux("1604719312566-8912e9227c6a", 1600), "logo": ux("1515562141207-7a88fb7ce338")},
    {"brand_name": "Tiny Sprout", "category": "Kids & Baby", "location": "Minneapolis, MN",
     "tagline": "Organic basics for little ones",
     "values": "GOTS-organic · Non-toxic · Gender-neutral", "min_order": 180.0,
     "lead_time": "Ships in 2–3 weeks", "year_founded": 2020, "featured": False,
     "story": "Tiny Sprout makes buttery-soft organic cotton basics and natural wood toys — gentle on new skin, gentle on the planet, and built to be handed down.",
     "hero": ux("1521334884684-d80222895322", 1600), "logo": ux("1515488042361-ee00e0ddd4e4")},
    {"brand_name": "Coastline Provisions", "category": "Food & Drink", "location": "Portland, ME",
     "tagline": "Small-batch coastal pantry staples", "values": "Small-batch · Sustainably sourced", "min_order": 175.0,
     "lead_time": "Ships in 1-2 weeks", "year_founded": 2018, "featured": True,
     "story": "Coastline Provisions jars sea-salt caramels, kelp seasonings and smoked maple syrup along the rocky coast of Maine - pantry staples with a saltwater soul.",
     "hero": ux("1556742502-ec7c0e9f34b1", 1600), "logo": ux("1599940824399-b87987ceb72a")},
    {"brand_name": "Ember & Oak", "category": "Home & Living", "location": "Denver, CO",
     "tagline": "Hand-poured candles and warm home goods", "values": "Hand-poured · Soy wax · Refillable", "min_order": 220.0,
     "lead_time": "Ships in 2-3 weeks", "year_founded": 2017, "featured": False,
     "story": "Ember & Oak hand-pours soy candles and blends room mists in small batches in the Rockies - cozy, clean-burning, and endlessly refillable.",
     "hero": ux("1559563458-527698bf5295", 1600), "logo": ux("1567538096630-e0c55bd6374c")},
    {"brand_name": "Marigold Skincare", "category": "Beauty & Wellness", "location": "Austin, TX",
     "tagline": "Sunny, plant-powered skincare", "values": "Vegan · Reef-safe · Refillable", "min_order": 200.0,
     "lead_time": "Ships in 1-2 weeks", "year_founded": 2020, "featured": True,
     "story": "Marigold formulates bright, plant-powered skincare in Austin - SPF, balms and serums made to feel like sunshine, minus anything synthetic.",
     "hero": ux("1556742502-ec7c0e9f34b1", 1600), "logo": ux("1571875257727-256c39da42af")},
    {"brand_name": "Northbound Supply", "category": "Apparel & Accessories", "location": "Seattle, WA",
     "tagline": "Rugged everyday carry, built to last", "values": "Repairable · Recycled materials", "min_order": 320.0,
     "lead_time": "Ships in 2-4 weeks", "year_founded": 2015, "featured": False,
     "story": "Northbound Supply makes weatherproof bags and accessories for the Pacific Northwest - waxed canvas, recycled hardware, built to be repaired not replaced.",
     "hero": ux("1472851294608-062f824d29cc", 1600), "logo": ux("1521572163474-6864f9cf17ab")},
    {"brand_name": "Petal & Press", "category": "Stationery & Gifts", "location": "Nashville, TN",
     "tagline": "Botanical letterpress & keepsakes", "values": "Letterpress · Plantable paper · Woman-owned", "min_order": 130.0,
     "lead_time": "Ships in 2 weeks", "year_founded": 2019, "featured": False,
     "story": "Petal & Press prints botanical cards and plantable seed paper on a vintage letterpress in Nashville - keepsakes that literally grow.",
     "hero": ux("1559563458-527698bf5295", 1600), "logo": ux("1606722590583-6951b5ea92ad")},
]

# ── Products: (brand_name, name, category, wholesale, msrp, case_pack, unit, materials, img, featured, bestseller) ──
P = [
    # Field & Fawn — Home & Living
    ("Field & Fawn", "Stoneware Dinner Plate Set", "Home & Living", 38.0, 84.0, 4, "Set of 4", "Hand-thrown stoneware", "1586023492125-27b2c045efd7", True, True),
    ("Field & Fawn", "Speckled Serving Bowl", "Home & Living", 26.0, 58.0, 6, "Case of 6", "Reactive glaze stoneware", "1493663284031-b7e3aefcae8e", False, True),
    ("Field & Fawn", "Linen Table Runner", "Home & Living", 22.0, 48.0, 8, "Case of 8", "Stonewashed linen", "1522708323590-d24dbb6b0267", False, False),
    # Wovenwild — Home & Living textiles
    ("Wovenwild", "Handwoven Wool Throw", "Home & Living", 54.0, 128.0, 4, "Case of 4", "Handwoven wool", "1556228453-efd6c1ff04f6", True, True),
    ("Wovenwild", "Mudcloth Lumbar Cushion", "Home & Living", 32.0, 72.0, 6, "Case of 6", "Cotton mudcloth", "1513519245088-0e12902e5a38", False, False),
    ("Wovenwild", "Jute Area Rug 5x7", "Home & Living", 88.0, 198.0, 2, "Case of 2", "Hand-knotted jute", "1567225557594-88d73e55f2cb", False, True),
    # Maison Lumière — Beauty
    ("Maison Lumière", "Rosehip Facial Oil", "Beauty & Wellness", 18.0, 42.0, 12, "Case of 12", "Cold-pressed rosehip", "1556228720-195a672e8a03", True, True),
    ("Maison Lumière", "Botanical Hand Balm", "Beauty & Wellness", 11.0, 26.0, 12, "Case of 12", "Shea & calendula", "1571781926291-c477ebfd024b", False, True),
    ("Maison Lumière", "Clay Detox Mask", "Beauty & Wellness", 15.0, 36.0, 12, "Case of 12", "French green clay", "1598440947619-2c35fc9aa908", False, False),
    ("Maison Lumière", "Refillable Glass Mister", "Beauty & Wellness", 9.0, 22.0, 24, "Case of 24", "Amber apothecary glass", "1612817288484-6f916006741a", False, False),
    # Atlas Goods — Apparel
    ("Atlas Goods", "Organic Cotton Crew Tee", "Apparel & Accessories", 16.0, 38.0, 12, "Case of 12", "GOTS-organic cotton", "1523381210434-271e8be1f52b", True, True),
    ("Atlas Goods", "Heavy Canvas Tote", "Apparel & Accessories", 14.0, 34.0, 10, "Case of 10", "16oz organic canvas", "1434389677669-e08b4cac3105", False, True),
    ("Atlas Goods", "Merino Beanie", "Apparel & Accessories", 19.0, 44.0, 12, "Case of 12", "Ethical merino wool", "1576566588028-4147f3842f27", False, False),
    # Hearth & Honey — Food
    ("Hearth & Honey", "Wildflower Honey 12oz", "Food & Drink", 8.0, 18.0, 12, "Case of 12", "Raw wildflower honey", "1497534547324-0ebb3f052e88", True, True),
    ("Hearth & Honey", "Spiced Fig Preserve", "Food & Drink", 7.0, 16.0, 12, "Case of 12", "Slow-cooked figs", "1481931098730-318b6f776db0", False, True),
    ("Hearth & Honey", "Hot Honey Trio Gift Box", "Food & Drink", 21.0, 46.0, 6, "Case of 6", "Chili-infused honey", "1556679343-c7306c1976bc", False, False),
    ("Hearth & Honey", "Maple Bourbon Granola", "Food & Drink", 9.0, 19.0, 10, "Case of 10", "Organic oats", "1490474418585-ba9bad8fd0ea", False, False),
    # Paper & Plume — Stationery
    ("Paper & Plume", "Letterpress Card Assortment", "Stationery & Gifts", 4.5, 11.0, 24, "Case of 24", "100% cotton stock", "1531346878377-a5be20888e57", True, True),
    ("Paper & Plume", "Linen Hardcover Notebook", "Stationery & Gifts", 12.0, 28.0, 12, "Case of 12", "Linen-wrapped board", "1455390582262-044cdead277a", False, True),
    ("Paper & Plume", "Botanical Gift Wrap Roll", "Stationery & Gifts", 6.0, 14.0, 20, "Case of 20", "Recycled kraft", "1513542789411-b6a5d4f31634", False, False),
    # Lune & Lyra — Jewelry
    ("Lune & Lyra", "Recycled Gold Hoop Earrings", "Jewelry", 42.0, 96.0, 6, "Case of 6", "14k recycled gold", "1515562141207-7a88fb7ce338", True, True),
    ("Lune & Lyra", "Moonstone Stacking Ring", "Jewelry", 28.0, 64.0, 8, "Case of 8", "Recycled gold · moonstone", "1611591437281-460bfbe1220a", False, True),
    ("Lune & Lyra", "Delicate Bar Necklace", "Jewelry", 34.0, 78.0, 6, "Case of 6", "14k recycled gold", "1599643478518-a784e5dc4c8f", False, False),
    # Tiny Sprout — Kids
    ("Tiny Sprout", "Organic Baby Bodysuit 3-pack", "Kids & Baby", 17.0, 38.0, 8, "Case of 8", "GOTS-organic cotton", "1515488042361-ee00e0ddd4e4", True, True),
    ("Tiny Sprout", "Natural Wood Stacking Toy", "Kids & Baby", 13.0, 30.0, 10, "Case of 10", "FSC beechwood", "1503454537195-1dcabb73ffb9", False, False),
    ("Tiny Sprout", "Muslin Swaddle Set", "Kids & Baby", 15.0, 34.0, 8, "Case of 8", "Organic muslin", "1620207418302-439b387441b0", False, True),
    ("Tiny Sprout", "Organic Knit Booties", "Kids & Baby", 12.0, 27.0, 10, "Case of 10", "Organic cotton", "1522771739844-6a9f6d5f14af", False, False),
    ("Tiny Sprout", "Wooden Rattle", "Kids & Baby", 10.0, 22.0, 12, "Case of 12", "FSC beechwood", "1518831959646-742c3a14ebf7", False, True),
    # Coastline Provisions
    ("Coastline Provisions", "Sea-Salt Caramels Tin", "Food & Drink", 12.0, 26.0, 12, "Case of 12", "Maine sea salt", "1587049352851-8d4e89133924", True, True),
    ("Coastline Provisions", "Smoked Maple Syrup", "Food & Drink", 14.0, 30.0, 12, "Case of 12", "Smoked maple", "1606914469633-bd39206ea739", False, True),
    ("Coastline Provisions", "Kelp & Citrus Seasoning", "Food & Drink", 9.0, 20.0, 12, "Case of 12", "Sustainably harvested kelp", "1542838132-92c53300491e", False, False),
    ("Coastline Provisions", "Wild Blueberry Jam", "Food & Drink", 8.5, 19.0, 12, "Case of 12", "Wild Maine blueberries", "1452251889946-8ff5ea7b27ab", False, False),
    # Ember & Oak
    ("Ember & Oak", "Cedar & Smoke Candle", "Home & Living", 16.0, 36.0, 6, "Case of 6", "Soy wax · cotton wick", "1567538096630-e0c55bd6374c", True, True),
    ("Ember & Oak", "Amber Room Mist", "Home & Living", 13.0, 29.0, 12, "Case of 12", "Essential-oil blend", "1556228578-0d85b1a4d571", False, False),
    ("Ember & Oak", "Stoneware Candle Vessel", "Home & Living", 22.0, 48.0, 6, "Case of 6", "Glazed stoneware", "1583847268964-b28dc8f51f92", False, True),
    ("Ember & Oak", "Apothecary Matchbox Set", "Home & Living", 6.0, 14.0, 24, "Case of 24", "Safety matches", "1524758631624-e2822e304c36", False, False),
    # Marigold Skincare
    ("Marigold Skincare", "Daily Mineral SPF 30", "Beauty & Wellness", 17.0, 38.0, 12, "Case of 12", "Zinc · reef-safe", "1571875257727-256c39da42af", True, True),
    ("Marigold Skincare", "Calendula Glow Serum", "Beauty & Wellness", 19.0, 44.0, 12, "Case of 12", "Calendula · vitamin C", "1601049541289-9b1b7bbbfe19", False, True),
    ("Marigold Skincare", "Honey Lip Balm Trio", "Beauty & Wellness", 10.0, 24.0, 12, "Case of 12", "Beeswax · honey", "1570172619644-dfd03ed5d881", False, False),
    ("Marigold Skincare", "Refillable Cleansing Bar", "Beauty & Wellness", 8.0, 18.0, 24, "Case of 24", "Plant oils", "1608248543803-ba4f8c70ae0b", False, False),
    # Northbound Supply
    ("Northbound Supply", "Waxed Canvas Field Bag", "Apparel & Accessories", 58.0, 128.0, 4, "Case of 4", "Waxed canvas · brass", "1521572163474-6864f9cf17ab", True, True),
    ("Northbound Supply", "Recycled Wool Scarf", "Apparel & Accessories", 24.0, 52.0, 8, "Case of 8", "Recycled wool", "1620799140408-edc6dcb6d633", False, False),
    ("Northbound Supply", "Everyday Dopp Kit", "Apparel & Accessories", 22.0, 48.0, 8, "Case of 8", "Waxed canvas", "1542291026-7eec264c27ff", False, True),
    ("Northbound Supply", "Leather Card Wallet", "Apparel & Accessories", 18.0, 40.0, 10, "Case of 10", "Veg-tan leather", "1560769629-975ec94e6a86", False, False),
    # Petal & Press
    ("Petal & Press", "Plantable Seed Cards", "Stationery & Gifts", 5.0, 12.0, 24, "Case of 24", "Plantable seed paper", "1606722590583-6951b5ea92ad", True, True),
    ("Petal & Press", "Pressed-Flower Journal", "Stationery & Gifts", 13.0, 29.0, 12, "Case of 12", "Recycled paper", "1583484963886-cfe2bff2945f", False, True),
    ("Petal & Press", "Botanical Sticker Sheet", "Stationery & Gifts", 3.5, 9.0, 30, "Case of 30", "Recycled vinyl", "1544716278-ca5e3f4abd8c", False, False),
    ("Petal & Press", "Wax Seal Gift Set", "Stationery & Gifts", 16.0, 34.0, 8, "Case of 8", "Brass · sealing wax", "1557804506-669a67965ba0", False, False),
    # More from existing brands
    ("Field & Fawn", "Hand-Thrown Mug Set", "Home & Living", 28.0, 62.0, 6, "Case of 6", "Hand-thrown stoneware", "1565374395542-0ce18882c857", False, True),
    ("Field & Fawn", "Speckled Bud Vase", "Home & Living", 24.0, 54.0, 6, "Case of 6", "Matte stoneware", "1502602898657-3e91760cbb34", False, False),
    ("Wovenwild", "Handwoven Table Runner", "Home & Living", 30.0, 66.0, 6, "Case of 6", "Handwoven cotton", "1505691938895-1758d7feb511", False, False),
    ("Wovenwild", "Wool Floor Cushion", "Home & Living", 46.0, 98.0, 4, "Case of 4", "Handwoven wool", "1513161455079-7dc1de15ef3e", False, True),
    ("Maison Lumière", "Overnight Repair Cream", "Beauty & Wellness", 22.0, 49.0, 12, "Case of 12", "Bakuchiol · squalane", "1620916297397-a4a5402a3c6c", False, True),
    ("Atlas Goods", "Merino Crew Socks 3-pack", "Apparel & Accessories", 14.0, 32.0, 12, "Case of 12", "Merino blend", "1473966968600-fa801b869a1a", False, False),
    ("Atlas Goods", "Ribbed Organic Beanie", "Apparel & Accessories", 16.0, 36.0, 12, "Case of 12", "Organic cotton", "1594633312681-425c7b97ccd1", False, False),
    ("Hearth & Honey", "Lavender Wildflower Honey", "Food & Drink", 9.0, 20.0, 12, "Case of 12", "Raw honey · lavender", "1599940824399-b87987ceb72a", False, True),
    ("Lune & Lyra", "Pearl Drop Earrings", "Jewelry", 38.0, 84.0, 6, "Case of 6", "Recycled gold · pearl", "1535632787350-4e68ef0ac584", False, True),
    ("Lune & Lyra", "Engraved Signet Ring", "Jewelry", 44.0, 98.0, 6, "Case of 6", "14k recycled gold", "1602173574767-37ac01994b2a", False, False),
    ("Lune & Lyra", "Fine Chain Bracelet", "Jewelry", 30.0, 68.0, 8, "Case of 8", "Recycled gold", "1617038260897-41a1f14a8ca0", False, False),
]


POLICIES = [
    PolicyDef(role="tenant_admin", default_access="full", rules=[]),
    PolicyDef(role="tenant_user", default_access="none", rules=[
        # Discovery — every signed-in buyer may read the marketplace:
        PolicyRule(entity="brand", can_read=True),
        PolicyRule(entity="product", can_read=True),
        # Private — each buyer sees only their own profile, orders and lines:
        PolicyRule(entity="buyer", can_read=True, can_create=True, can_update=True,
                   filter_field="owner_username", filter_match="$user.name"),
        PolicyRule(entity="order", can_read=True, can_create=True, can_update=True,
                   filter_field="owner_username", filter_match="$user.name"),
        PolicyRule(entity="order_item", can_read=True, can_create=True,
                   filter_field="owner_username", filter_match="$user.name"),
    ]),
]


def seed_test_data(s, base, domain, tenant_uuid, progress):
    # Brands
    n_b = 0
    for i, b in enumerate(BRANDS):
        rec = dict(b)
        rec["sort_order"] = i
        rec.setdefault("featured", False)
        rec["display_name"] = rec["brand_name"]
        rec["description"] = rec.get("tagline") or rec["brand_name"]
        if seed_record(s, base, domain, "Brand", rec, progress=progress, tenant_name="default-tenant"):
            n_b += 1
    progress.ok("Seeded %d Brands." % n_b)

    # Products
    prod_by_name = {}
    for i, row in enumerate(P):
        bn, name, cat, wp, msrp, cp, unit, mat, img, feat, best = row
        rec = {
            "product_name": name, "brand_name": bn, "category": cat,
            "wholesale_price": wp, "msrp": msrp, "case_pack": cp, "unit": unit,
            "materials": mat, "image": ux(img), "in_stock": True,
            "featured": feat, "bestseller": best, "sort_order": i,
            "sku": "ATL-%04d" % (1000 + i),
            "display_name": name,
            "description": "%s by %s — %s. Wholesale %s, suggested retail %s." % (
                name, bn, mat, ("$%.2f" % wp), ("$%.2f" % msrp)),
        }
        u = seed_record(s, base, domain, "Product", rec, progress=progress, tenant_name="default-tenant")
        if u:
            prod_by_name[name] = dict(rec, uuid=u)
    progress.ok("Seeded %d Products." % len(prod_by_name))

    # A buyer profile for the demo buyer
    buyer_rec = {
        "business_name": "Maison Plume", "buyer_name": "Elise Marchand", "email": BUYER_EMAIL,
        "phone": "(415) 555-0148", "store_type": "Boutique", "region": "California",
        "address": "742 Valencia St, San Francisco, CA 94110", "resale_id": "CA-RS-884213",
        "net_terms": "Net 30", "owner_username": BUYER_EMAIL,
        "display_name": "Maison Plume", "description": "Boutique · San Francisco",
    }
    seed_record(s, base, domain, "Buyer", buyer_rec, progress=progress, tenant_name="default-tenant")
    progress.ok("Seeded buyer profile.")

    # Two demo orders owned by the demo buyer so portal + admin views aren't empty.
    def line(pname, qty):
        p = prod_by_name.get(pname)
        if not p:
            return None
        return {"product_name": p["product_name"], "product_uuid": p["uuid"], "brand_name": p["brand_name"],
                "sku": p["sku"], "unit_price": p["wholesale_price"], "case_pack": p["case_pack"],
                "quantity": qty, "line_total": round(p["wholesale_price"] * qty, 2), "image": p["image"]}

    demo_orders = [
        {"order_number": "ATL-100412", "order_state": "delivered", "pay_state": "paid",
         "payment_terms": "Net 30", "payment_provider": "stripe", "placed_by": "buyer",
         "paid_at": _now_iso(), "expected_ship": _ship_date(-10),
         "lines": [line("Stoneware Dinner Plate Set", 3), line("Wildflower Honey 12oz", 4),
                   line("Letterpress Card Assortment", 5)]},
        {"order_number": "ATL-100488", "order_state": "confirmed", "pay_state": "unpaid",
         "payment_terms": "Net 30", "payment_provider": "invoice", "placed_by": "buyer",
         "expected_ship": _ship_date(12),
         "lines": [line("Rosehip Facial Oil", 6), line("Organic Cotton Crew Tee", 4),
                   line("Recycled Gold Hoop Earrings", 2)]},
    ]
    n_ord = 0
    for o in demo_orders:
        lines = [l for l in o.pop("lines") if l]
        if not lines:
            continue
        subtotal = round(sum(l["line_total"] for l in lines), 2)
        brands = sorted(set(l["brand_name"] for l in lines))
        rec = dict(o)
        rec.update({
            "display_name": o["order_number"],
            "description": "Order %s for Maison Plume" % o["order_number"],
            "business_name": "Maison Plume", "buyer_name": "Elise Marchand",
            "buyer_email": BUYER_EMAIL, "buyer_phone": "(415) 555-0148",
            "shipping_address": "742 Valencia St, San Francisco, CA 94110",
            "subtotal": subtotal, "shipping_fee": 0.0, "total": subtotal,
            "item_count": sum(l["quantity"] for l in lines),
            "brand_count": len(brands), "owner_username": BUYER_EMAIL,
        })
        ouid = seed_record(s, base, domain, "Order", rec, progress=progress, tenant_name="default-tenant")
        if not ouid:
            continue
        n_ord += 1
        for l in lines:
            item = dict(l)
            item["display_name"] = l["product_name"]
            item["description"] = "%dx %s" % (l["quantity"], l["product_name"])
            item["owner_username"] = BUYER_EMAIL
            item["parent_type"] = "order"
            item["parent_uuid"] = ouid
            seed_record(s, base, domain, "OrderItem", item, progress=progress, tenant_name="default-tenant")
    progress.ok("Seeded %d demo Orders." % n_ord)


WORKFLOW_DEFINITIONS = [
    {
        "workflow_id": "order_confirmation", "display_name": "Order Confirmation",
        "description": "Emails the buyer to confirm a wholesale order the moment it's placed.",
        "version": "1.0.0", "enabled": True, "status": "Active", "on_error": "continue",
        "input_schema": {"order_uuid": {"type": "string", "required": False},
                         "order_number": {"type": "string", "required": False},
                         "buyer_email": {"type": "string", "required": False},
                         "business_name": {"type": "string", "required": False},
                         "total": {"type": "number", "required": False}},
        "steps": [
            {"id": "email", "type": "service_call", "service": "email", "operation": "send_email", "on_error": "continue",
             "input_map": {"to_email": "{{input.buyer_email}}",
                           "subject": "Your Atelier order {{input.order_number}} is confirmed",
                           "body_html": "<p>Hi {{input.business_name}},</p><p>Thanks for your wholesale order {{input.order_number}} (${{input.total}}). Brands are preparing your items now — we'll email tracking when each ships.</p><p>— Atelier</p>"}},
        ],
    },
    {
        "workflow_id": "order_shipped", "display_name": "Order Shipped",
        "description": "Notifies the buyer and advances the order to shipped (saga).",
        "version": "1.0.0", "enabled": True, "status": "Active", "on_error": "compensate",
        "input_schema": {"order_uuid": {"type": "string", "required": True},
                         "order_number": {"type": "string", "required": False},
                         "buyer_email": {"type": "string", "required": False}},
        "steps": [
            {"id": "ship", "type": "crud_operation", "operation": "update", "object_type": "atelier:order",
             "record_uuid": "{{input.order_uuid}}", "data": {"order_state": "shipped"},
             "compensate": {"kind": "automatic", "type": "crud_operation", "operation": "update",
                            "object_type": "atelier:order", "record_uuid": "{{input.order_uuid}}",
                            "data": {"order_state": "confirmed"}}},
            {"id": "email", "type": "service_call", "service": "email", "operation": "send_email", "on_error": "continue",
             "input_map": {"to_email": "{{input.buyer_email}}", "subject": "Your Atelier order has shipped",
                           "body_html": "<p>Good news — order {{input.order_number}} is on its way!</p>"}},
        ],
    },
]

EVENT_BINDINGS = [
    {"event": "@create:atelier:order", "workflow_id": "order_confirmation",
     "input_map": {"order_uuid": "uuid", "order_number": "order_number",
                   "buyer_email": "buyer_email", "business_name": "business_name", "total": "total"}},
]


def main():
    setup = AppSetup(AppConfig(), ALL_SCHEMAS, PUBLIC_SCHEMAS)
    setup.run(seed_fn=seed_test_data, policies=POLICIES,
              workflow_definitions=WORKFLOW_DEFINITIONS, event_bindings=EVENT_BINDINGS)


if __name__ == "__main__":
    main()
