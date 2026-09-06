# setup.py — policies, workflow, and multi-tenant seed data for LATTICE
import sys, os, datetime
sys.path.insert(0, os.path.dirname(__file__))
from supero.app_setup import AppSetup, PolicyDef, PolicyRule, make_seed_record, ref_link
from config import AppConfig
from schemas import ALL_SCHEMAS, PUBLIC_SCHEMAS, SUPERO_APP_NAMESPACE

# NOTE: show `make_seed_record(ALL_SCHEMAS)`, but the
# installed SDK's make_seed_record(namespace) expects the NAMESPACE STRING and
# calls namespace.strip() — passing a list raises AttributeError at import. We
# pass the literal namespace, which is what the real SDK wants. MUST be module-level.
seed_record = make_seed_record(SUPERO_APP_NAMESPACE)


def ux(pid, w=1600, h=1100):
    # Curated, reliable Unsplash CDN images (images.unsplash.com, NOT picsum/source).
    base = "https://images.unsplash.com/photo-" + pid + "?auto=format&fit=crop&q=80"
    return {"url": "%s&w=%d&h=%d" % (base, w, h),
            "thumbnail_url": "%s&w=800&h=600" % base}


def _now():
    return datetime.datetime.utcnow().replace(microsecond=0).isoformat() + "Z"


def _in_days(d, hour=9):
    t = datetime.datetime.utcnow() + datetime.timedelta(days=d)
    t = t.replace(hour=hour, minute=0, second=0, microsecond=0)
    return t.isoformat() + "Z"


# ── Access control. tenant_user (resident) is fail-closed. ───────────────
#   - Property / Unit: SHARED read (residents browse the portfolio + listings).
#   - Resident / Lease / RentPayment / MaintenanceRequest / Application: PRIVATE,
#     each resident sees only their own rows (owner_username == $user.name).
#   - Owner: admin-only (no tenant_user rule → default_access "none" denies it).
POLICIES = [
    # DEMO-ACCOUNT-SCOPE-V1 — these logins are published so anyone can try the demo,
    # so they must not double as a skeleton key over every entity in the domain.
    # Scoped to this app's own entities. Delete is withheld: no screen offers it, so
    # a visitor cannot destroy the records other visitors are reading.
    PolicyDef(role="tenant_admin", default_access="none", rules=[
        PolicyRule(entity="property", can_read=True, can_create=True, can_update=True),
        PolicyRule(entity="unit", can_read=True, can_create=True, can_update=True),
        PolicyRule(entity="owner", can_read=True, can_create=True, can_update=True),
        PolicyRule(entity="resident", can_read=True, can_create=True, can_update=True),
        PolicyRule(entity="lease", can_read=True, can_create=True, can_update=True),
        PolicyRule(entity="rent_payment", can_read=True, can_create=True, can_update=True),
        PolicyRule(entity="maintenance_request", can_read=True, can_create=True, can_update=True),
        PolicyRule(entity="application", can_read=True, can_create=True, can_update=True),
    ]),
    PolicyDef(role="tenant_user", default_access="none", rules=[
        PolicyRule(entity="property", can_read=True),
        PolicyRule(entity="unit", can_read=True),
        PolicyRule(entity="resident", can_read=True, can_create=True, can_update=True,
                   filter_field="owner_username", filter_match="$user.name"),
        PolicyRule(entity="lease", can_read=True,
                   filter_field="owner_username", filter_match="$user.name"),
        PolicyRule(entity="rent_payment", can_read=True, can_create=True, can_update=True,
                   filter_field="owner_username", filter_match="$user.name"),
        PolicyRule(entity="maintenance_request", can_read=True, can_create=True, can_update=True,
                   filter_field="owner_username", filter_match="$user.name"),
        # STAFF-ONLY-FIELDS-V1 — an applicant reads their OWN application, but the
        # leasing team's screening notes are stripped by the server, not hidden by
        # the UI. Curl the API with the applicant's own valid token and `notes` is
        # simply absent from the JSON.
        PolicyRule(entity="application", can_read=True, can_create=True, can_update=True,
                   filter_field="owner_username", filter_match="$user.name",
                   hidden_fields=["notes"]),
    ]),
]

# ── Workflow: when staff resolve a maintenance request, email the resident, then
#    stamp workflow_status="processed" + processed_at. object_type is
#    namespace-qualified "latticepm:maintenance_request".
WORKFLOW_DEFINITIONS = [{
    "workflow_id": "maintenance_resolved",
    "display_name": "Maintenance Resolved",
    "description": "Notify the resident their repair is resolved, then mark the request processed.",
    "version": "1.0.0", "enabled": True, "status": "Active",
    "on_error": "continue",
    "input_schema": {
        "request_uuid": {"type": "string", "required": True},
        "resident_email": {"type": "string", "required": False},
        "resident_name": {"type": "string", "required": False},
        "title": {"type": "string", "required": False},
    },
    "steps": [
        {"id": "notify", "type": "service_call", "service": "email", "operation": "send_email",
         "on_error": "continue",
         "input_map": {
             "to_email": "{{input.resident_email}}",
             "subject": "Your maintenance request is resolved",
             "body_html": "<p>Hi {{input.resident_name}},</p><p>Good news — your "
                          "request \"{{input.title}}\" has been resolved. If anything "
                          "is still not right, just reopen a request from your portal.</p>"
                          "<p>— Your property management team</p>",
         }},
        {"id": "done", "type": "crud_operation", "operation": "update",
         "object_type": "latticepm:maintenance_request",
         "record_uuid": "{{input.request_uuid}}",
         "data": {"workflow_status": "processed", "processed_at": "{{context.timestamp}}",
                  "status": "resolved"}},
    ],
}]

EVENT_BINDINGS = []


# ── Seed: one realistic company per tenant. Each company seeds into its OWN
#    tenant via tenant_name=. Parent/child (Property->Unit) linkage carries
#    parent_uuid (gotcha #8). References linked with ref_link (gotcha #8).
#    Properties are the primary browse entity → seed plenty per company.
def _seed_company(s, base, domain, tenant, progress, plan):
    ns = SUPERO_APP_NAMESPACE

    # 1) Owners (admin-only)
    owner_uuids = {}
    for o in plan["owners"]:
        u = seed_record(s, base, domain, "Owner", o, progress=progress, tenant_name=tenant)
        if u:
            owner_uuids[o["name"]] = u

    # 2) Properties (+ link Owner) then their Units (children) + listings
    prop_uuids = {}
    unit_uuids = {}
    unit_meta = {}      # unit_name -> {property_name, unit_label, rent}
    for p in plan["properties"]:
        prec = dict(p)
        owner_key = prec.pop("_owner", None)
        prec.setdefault("units_count", len(prec.get("_units", [])))
        units = prec.pop("_units", [])
        prec.setdefault("gallery", [dict(prec["hero_image"])] if prec.get("hero_image") else [])
        pu = seed_record(s, base, domain, "Property", prec, progress=progress, tenant_name=tenant)
        if not pu:
            continue
        prop_uuids[prec["name"]] = pu
        if owner_key and owner_key in owner_uuids:
            ref_link(s, base, domain, ns, "Property", pu, "Owner", owner_uuids[owner_key])
        # Units are CHILDREN of this property → parent_type + parent_uuid
        for un in units:
            urec = dict(un)
            urec["parent_type"] = "property"
            urec["parent_uuid"] = pu
            urec["property_name"] = prec["display_name"]
            urec.setdefault("city", prec.get("city"))
            uu = seed_record(s, base, domain, "Unit", urec, progress=progress, tenant_name=tenant)
            if uu:
                unit_uuids[urec["name"]] = uu
                unit_meta[urec["name"]] = {
                    "property_name": prec["display_name"],
                    "unit_label": urec.get("unit_label"),
                    "rent": urec.get("rent"),
                }

    # 3) Residents (linked to identity + their unit)
    resident_uuids = {}
    for r in plan["residents"]:
        rrec = dict(r)
        unit_key = rrec.pop("_unit", None)
        if unit_key and unit_key in unit_meta:
            rrec.setdefault("unit_label", unit_meta[unit_key]["unit_label"])
            rrec.setdefault("property_name", unit_meta[unit_key]["property_name"])
        ru = seed_record(s, base, domain, "Resident", rrec, progress=progress, tenant_name=tenant)
        if ru:
            resident_uuids[rrec["name"]] = ru
            if unit_key and unit_key in unit_uuids:
                ref_link(s, base, domain, ns, "Resident", ru, "Unit", unit_uuids[unit_key])

    # 4) Leases (active) + link Unit/Resident
    lease_uuids = {}
    for ls in plan["leases"]:
        lrec = dict(ls)
        unit_key = lrec.pop("_unit", None)
        res_key = lrec.pop("_resident", None)
        if unit_key and unit_key in unit_meta:
            lrec.setdefault("unit_label", unit_meta[unit_key]["unit_label"])
            lrec.setdefault("property_name", unit_meta[unit_key]["property_name"])
            lrec.setdefault("monthly_rent", unit_meta[unit_key]["rent"])
        lu = seed_record(s, base, domain, "Lease", lrec, progress=progress, tenant_name=tenant)
        if lu:
            lease_uuids[lrec["name"]] = lu
            if unit_key and unit_key in unit_uuids:
                ref_link(s, base, domain, ns, "Lease", lu, "Unit", unit_uuids[unit_key])
            if res_key and res_key in resident_uuids:
                ref_link(s, base, domain, ns, "Lease", lu, "Resident", resident_uuids[res_key])

    # 5) RentPayments (payment service: status is base mandatory; set initial state)
    pay_count = 0
    for pay in plan["payments"]:
        prec = dict(pay)
        lease_key = prec.pop("_lease", None)
        pu = seed_record(s, base, domain, "RentPayment", prec, progress=progress, tenant_name=tenant)
        if pu:
            pay_count += 1
            if lease_key and lease_key in lease_uuids:
                ref_link(s, base, domain, ns, "RentPayment", pu, "Lease", lease_uuids[lease_key])

    # 6) Maintenance requests (workflow entity) + link Unit
    mr_count = 0
    for mr in plan["maintenance"]:
        mrec = dict(mr)
        unit_key = mrec.pop("_unit", None)
        if unit_key and unit_key in unit_meta:
            mrec.setdefault("unit_label", unit_meta[unit_key]["unit_label"])
            mrec.setdefault("property_name", unit_meta[unit_key]["property_name"])
        mu = seed_record(s, base, domain, "MaintenanceRequest", mrec, progress=progress, tenant_name=tenant)
        if mu:
            mr_count += 1
            if unit_key and unit_key in unit_uuids:
                ref_link(s, base, domain, ns, "MaintenanceRequest", mu, "Unit", unit_uuids[unit_key])

    # 7) Applications (prospects) + link Unit
    app_count = 0
    for ap in plan["applications"]:
        arec = dict(ap)
        unit_key = arec.pop("_unit", None)
        if unit_key and unit_key in unit_meta:
            arec.setdefault("unit_label", unit_meta[unit_key]["unit_label"])
            arec.setdefault("property_name", unit_meta[unit_key]["property_name"])
        au = seed_record(s, base, domain, "Application", arec, progress=progress, tenant_name=tenant)
        if au:
            app_count += 1
            if unit_key and unit_key in unit_uuids:
                ref_link(s, base, domain, ns, "Application", au, "Unit", unit_uuids[unit_key])

    progress.ok("Seeded company '%s': %d properties, %d units, %d residents, %d leases, "
                "%d payments, %d maintenance, %d applications."
                % (tenant, len(prop_uuids), len(unit_uuids), len(resident_uuids),
                   len(lease_uuids), pay_count, mr_count, app_count))


# ── Per-company seed plans. ───────────────────────────────────────────────────
SUMMIT = {
    "owners": [
        {"name": "summit-owner-vega", "display_name": "Vega Holdings",
         "description": "Institutional owner of urban multifamily.",
         "full_name": "Vega Holdings", "email": "asset@vega.example", "phone": "+15550100100",
         "company": "Vega Holdings", "photo": ux("1560250097-0b93528c311a", 900, 1100)},
        {"name": "summit-owner-rios", "display_name": "Rios Family Trust",
         "description": "Private owner of two boutique buildings.",
         "full_name": "Elena Rios", "email": "elena@rios.example", "phone": "+15550100101",
         "company": "Rios Family Trust", "photo": ux("1573497019940-1c28c88b4f3e", 900, 1100)},
    ],
    "properties": [
        {"name": "summit-the-monarch", "display_name": "The Monarch",
         "description": "A 24-unit mid-rise with rooftop amenities in the arts district.",
         "address": "120 Larkspur Ave", "city": "Austin", "state": "TX", "zip_code": "78701",
         "property_type": "apartment", "year_built": 2018, "owner_name": "Vega Holdings",
         "hero_image": ux("1545324418-cc1a3fa10c00"), "_owner": "summit-owner-vega",
         "_units": [
            {"name": "summit-monarch-2b", "unit_label": "Apt 2B", "bedrooms": 2, "bathrooms": 2.0,
             "square_feet": 980, "rent": 2150.0, "status": "occupied", "hero_image": ux("1502672260266-1c1ef2d93688")},
            {"name": "summit-monarch-4a", "unit_label": "Apt 4A", "bedrooms": 1, "bathrooms": 1.0,
             "square_feet": 720, "rent": 1750.0, "status": "available", "hero_image": ux("1493809842364-78817add7ffb")},
            {"name": "summit-monarch-5c", "unit_label": "Apt 5C", "bedrooms": 3, "bathrooms": 2.0,
             "square_feet": 1280, "rent": 2950.0, "status": "available", "hero_image": ux("1522708323590-d24dbb6b0267")},
         ]},
        {"name": "summit-cedar-lofts", "display_name": "Cedar Lofts",
         "description": "Converted warehouse lofts with exposed brick near the river.",
         "address": "44 Cedar St", "city": "Austin", "state": "TX", "zip_code": "78702",
         "property_type": "condo", "year_built": 2009, "owner_name": "Rios Family Trust",
         "hero_image": ux("1512917774080-9991f1c4c750"), "_owner": "summit-owner-rios",
         "_units": [
            {"name": "summit-cedar-101", "unit_label": "Loft 101", "bedrooms": 1, "bathrooms": 1.0,
             "square_feet": 850, "rent": 1900.0, "status": "occupied", "hero_image": ux("1484154218962-a197022b5858")},
            {"name": "summit-cedar-204", "unit_label": "Loft 204", "bedrooms": 2, "bathrooms": 2.0,
             "square_feet": 1100, "rent": 2450.0, "status": "available", "hero_image": ux("1505691938895-1758d7feb511")},
         ]},
        {"name": "summit-juniper-row", "display_name": "Juniper Row",
         "description": "A row of modern townhomes with private garages and yards.",
         "address": "9 Juniper Way", "city": "Round Rock", "state": "TX", "zip_code": "78664",
         "property_type": "townhome", "year_built": 2021, "owner_name": "Vega Holdings",
         "hero_image": ux("1568605114967-8130f3a36994"), "_owner": "summit-owner-vega",
         "_units": [
            {"name": "summit-juniper-1", "unit_label": "Unit 1", "bedrooms": 3, "bathrooms": 2.5,
             "square_feet": 1650, "rent": 3100.0, "status": "available", "hero_image": ux("1576941089067-2de3c901e126")},
            {"name": "summit-juniper-2", "unit_label": "Unit 2", "bedrooms": 3, "bathrooms": 2.5,
             "square_feet": 1650, "rent": 3100.0, "status": "maintenance", "hero_image": ux("1570129477492-45c003edd2be")},
         ]},
    ],
    "residents": [
        {"name": "summit-res-dana", "display_name": "Dana Reyes",
         "description": "Resident at The Monarch.", "owner_username": "dana@example.com",
         "full_name": "Dana Reyes", "email": "dana@example.com", "phone": "+15550100201",
         "photo": ux("1438761681033-6461ffad8d80", 800, 800), "_unit": "summit-monarch-2b"},
        {"name": "summit-res-cole", "display_name": "Cole Park",
         "description": "Resident at Cedar Lofts.", "owner_username": "cole@example.com",
         "full_name": "Cole Park", "email": "cole@example.com", "phone": "+15550100202",
         "photo": ux("1500648767791-00dcc994a43e", 800, 800), "_unit": "summit-cedar-101"},
    ],
    "leases": [
        {"name": "summit-lease-dana", "display_name": "Lease — Dana Reyes / Apt 2B",
         "description": "12-month active lease.", "owner_username": "dana@example.com",
         "status": "active", "start_at": _in_days(-120), "end_at": _in_days(245),
         "deposit": 2150.0, "resident_name": "Dana Reyes",
         "_unit": "summit-monarch-2b", "_resident": "summit-res-dana"},
        {"name": "summit-lease-cole", "display_name": "Lease — Cole Park / Loft 101",
         "description": "12-month active lease.", "owner_username": "cole@example.com",
         "status": "active", "start_at": _in_days(-60), "end_at": _in_days(305),
         "deposit": 1900.0, "resident_name": "Cole Park",
         "_unit": "summit-cedar-101", "_resident": "summit-res-cole"},
    ],
    "payments": [
        {"name": "summit-pay-dana-may", "display_name": "Rent — Dana Reyes / 2026-05",
         "description": "Captured rent payment.", "owner_username": "dana@example.com",
         "status": "captured", "amount": 2150.0, "currency": "USD", "period": "2026-05",
         "method": "ach", "paid_at": _in_days(-30), "resident_name": "Dana Reyes", "unit_label": "Apt 2B",
         "property_name": "The Monarch"},
        {"name": "summit-pay-dana-jun", "display_name": "Rent — Dana Reyes / 2026-06",
         "description": "Pending rent payment.", "owner_username": "dana@example.com",
         "status": "pending", "amount": 2150.0, "currency": "USD", "period": "2026-06",
         "method": "card", "due_date": _in_days(3), "resident_name": "Dana Reyes", "unit_label": "Apt 2B",
         "property_name": "The Monarch", "_lease": "summit-lease-dana"},
        {"name": "summit-pay-cole-jun", "display_name": "Rent — Cole Park / 2026-06",
         "description": "Captured rent payment.", "owner_username": "cole@example.com",
         "status": "captured", "amount": 1900.0, "currency": "USD", "period": "2026-06",
         "method": "card", "paid_at": _in_days(-2), "resident_name": "Cole Park", "unit_label": "Loft 101",
         "property_name": "Cedar Lofts", "_lease": "summit-lease-cole"},
    ],
    "maintenance": [
        {"name": "summit-mr-1", "display_name": "Leaking kitchen faucet",
         "description": "Resident-reported plumbing issue.", "owner_username": "dana@example.com",
         "title": "Leaking kitchen faucet", "category": "plumbing", "priority": "normal",
         "status": "submitted", "resident_name": "Dana Reyes", "_unit": "summit-monarch-2b",
         "photo": ux("1581578731548-c64695cc6952")},
        {"name": "summit-mr-2", "display_name": "AC not cooling",
         "description": "HVAC service required.", "owner_username": "cole@example.com",
         "title": "AC not cooling", "category": "hvac", "priority": "high",
         "status": "in_progress", "assignee_name": "Cool Air Co.", "resident_name": "Cole Park",
         "_unit": "summit-cedar-101", "photo": ux("1631545806609-23f1c1c5c6a4")},
        {"name": "summit-mr-3", "display_name": "Garage door sensor",
         "description": "Resolved earlier this month.", "owner_username": "dana@example.com",
         "title": "Garage door sensor", "category": "other", "priority": "low",
         "status": "resolved", "assignee_name": "On-site Maintenance", "resident_name": "Dana Reyes",
         "_unit": "summit-juniper-1", "workflow_status": "processed", "processed_at": _now()},
    ],
    "applications": [
        {"name": "summit-app-1", "display_name": "Application — Iris Lao / Apt 4A",
         "description": "Prospect for The Monarch.", "owner_username": "iris@example.com",
         "applicant_name": "Iris Lao", "applicant_email": "iris@example.com",
         "applicant_phone": "+15550100301", "status": "screening", "stated_income": 96000.0,
         "move_in_date": _in_days(20), "_unit": "summit-monarch-4a"},
        {"name": "summit-app-2", "display_name": "Application — Theo Sun / Loft 204",
         "description": "Prospect for Cedar Lofts.", "owner_username": "theo@example.com",
         "applicant_name": "Theo Sun", "applicant_email": "theo@example.com",
         "applicant_phone": "+15550100302", "status": "received", "stated_income": 84000.0,
         "move_in_date": _in_days(35), "_unit": "summit-cedar-204"},
    ],
}

HARBOR = {
    "owners": [
        {"name": "harbor-owner-blue", "display_name": "Bluewater Capital",
         "description": "Owner of waterfront residential assets.",
         "full_name": "Bluewater Capital", "email": "ops@bluewater.example", "phone": "+15550200100",
         "company": "Bluewater Capital", "photo": ux("1507003211169-0a1dd7228f2d", 900, 1100)},
    ],
    "properties": [
        {"name": "harbor-pier-7", "display_name": "Pier 7 Residences",
         "description": "Waterfront apartments with harbor views and a fitness center.",
         "address": "7 Harbor Walk", "city": "Seattle", "state": "WA", "zip_code": "98101",
         "property_type": "apartment", "year_built": 2016, "owner_name": "Bluewater Capital",
         "hero_image": ux("1486406146926-c627a92ad1ab"), "_owner": "harbor-owner-blue",
         "_units": [
            {"name": "harbor-pier7-301", "unit_label": "Apt 301", "bedrooms": 2, "bathrooms": 2.0,
             "square_feet": 1050, "rent": 2800.0, "status": "occupied", "hero_image": ux("1556909114-f6e7ad7d3136")},
            {"name": "harbor-pier7-410", "unit_label": "Apt 410", "bedrooms": 1, "bathrooms": 1.0,
             "square_feet": 700, "rent": 2200.0, "status": "available", "hero_image": ux("1554995207-c18c203602cb")},
            {"name": "harbor-pier7-512", "unit_label": "Apt 512", "bedrooms": 2, "bathrooms": 2.0,
             "square_feet": 1090, "rent": 2950.0, "status": "available", "hero_image": ux("1560448204-e02f11c3d0e2")},
         ]},
        {"name": "harbor-gull-house", "display_name": "Gull House",
         "description": "A restored brick condo building two blocks from the marina.",
         "address": "210 Marina Blvd", "city": "Seattle", "state": "WA", "zip_code": "98109",
         "property_type": "condo", "year_built": 1998, "owner_name": "Bluewater Capital",
         "hero_image": ux("1448630360428-65456885c650"), "_owner": "harbor-owner-blue",
         "_units": [
            {"name": "harbor-gull-2", "unit_label": "Unit 2", "bedrooms": 1, "bathrooms": 1.0,
             "square_feet": 680, "rent": 2050.0, "status": "occupied", "hero_image": ux("1502005229762-cf1b2da7c5d6")},
            {"name": "harbor-gull-5", "unit_label": "Unit 5", "bedrooms": 2, "bathrooms": 1.5,
             "square_feet": 960, "rent": 2600.0, "status": "available", "hero_image": ux("1567767292278-a4f21aa2d36e")},
         ]},
    ],
    "residents": [
        {"name": "harbor-res-omar", "display_name": "Omar Haddad",
         "description": "Resident at Pier 7.", "owner_username": "omar@example.com",
         "full_name": "Omar Haddad", "email": "omar@example.com", "phone": "+15550200201",
         "photo": ux("1492562080023-ab3db95bfbce", 800, 800), "_unit": "harbor-pier7-301"},
    ],
    "leases": [
        {"name": "harbor-lease-omar", "display_name": "Lease — Omar Haddad / Apt 301",
         "description": "12-month active lease.", "owner_username": "omar@example.com",
         "status": "active", "start_at": _in_days(-200), "end_at": _in_days(165),
         "deposit": 2800.0, "resident_name": "Omar Haddad",
         "_unit": "harbor-pier7-301", "_resident": "harbor-res-omar"},
    ],
    "payments": [
        {"name": "harbor-pay-omar-jun", "display_name": "Rent — Omar Haddad / 2026-06",
         "description": "Captured rent payment.", "owner_username": "omar@example.com",
         "status": "captured", "amount": 2800.0, "currency": "USD", "period": "2026-06",
         "method": "ach", "paid_at": _in_days(-4), "resident_name": "Omar Haddad", "unit_label": "Apt 301",
         "property_name": "Pier 7 Residences", "_lease": "harbor-lease-omar"},
        {"name": "harbor-pay-omar-jul", "display_name": "Rent — Omar Haddad / 2026-07",
         "description": "Upcoming rent.", "owner_username": "omar@example.com",
         "status": "pending", "amount": 2800.0, "currency": "USD", "period": "2026-07",
         "method": "ach", "due_date": _in_days(25), "resident_name": "Omar Haddad", "unit_label": "Apt 301",
         "property_name": "Pier 7 Residences", "_lease": "harbor-lease-omar"},
    ],
    "maintenance": [
        {"name": "harbor-mr-1", "display_name": "Dishwasher won't drain",
         "description": "Appliance repair needed.", "owner_username": "omar@example.com",
         "title": "Dishwasher won't drain", "category": "appliance", "priority": "normal",
         "status": "assigned", "assignee_name": "Harbor Maintenance", "resident_name": "Omar Haddad",
         "_unit": "harbor-pier7-301", "photo": ux("1556911220-bff31c812dba")},
    ],
    "applications": [
        {"name": "harbor-app-1", "display_name": "Application — Nadia Cruz / Apt 410",
         "description": "Prospect for Pier 7.", "owner_username": "nadia@example.com",
         "applicant_name": "Nadia Cruz", "applicant_email": "nadia@example.com",
         "applicant_phone": "+15550200301", "status": "approved", "stated_income": 110000.0,
         "move_in_date": _in_days(15), "_unit": "harbor-pier7-410"},
    ],
}

OAKLINE = {
    "owners": [
        {"name": "oakline-owner-grove", "display_name": "Grove Residential",
         "description": "Suburban single-family portfolio owner.",
         "full_name": "Grove Residential", "email": "team@grove.example", "phone": "+15550300100",
         "company": "Grove Residential", "photo": ux("1519085360753-af0119f7cbe7", 900, 1100)},
    ],
    "properties": [
        {"name": "oakline-maple-court", "display_name": "Maple Court",
         "description": "A cluster of detached single-family rentals on tree-lined streets.",
         "address": "18 Maple Ct", "city": "Columbus", "state": "OH", "zip_code": "43215",
         "property_type": "single_family", "year_built": 2005, "owner_name": "Grove Residential",
         "hero_image": ux("1570129477492-45c003edd2be"), "_owner": "oakline-owner-grove",
         "_units": [
            {"name": "oakline-maple-a", "unit_label": "18 Maple Ct", "bedrooms": 4, "bathrooms": 2.5,
             "square_feet": 2100, "rent": 2400.0, "status": "available", "hero_image": ux("1564013799919-ab600027ffc6")},
            {"name": "oakline-maple-b", "unit_label": "22 Maple Ct", "bedrooms": 3, "bathrooms": 2.0,
             "square_feet": 1700, "rent": 2050.0, "status": "occupied", "hero_image": ux("1572120360610-d971b9d7767c")},
         ]},
        {"name": "oakline-birch-terrace", "display_name": "Birch Terrace",
         "description": "Newly built townhomes near the university with smart-home features.",
         "address": "55 Birch Terrace", "city": "Columbus", "state": "OH", "zip_code": "43201",
         "property_type": "townhome", "year_built": 2022, "owner_name": "Grove Residential",
         "hero_image": ux("1605276374104-dee2a0ed3cd6"), "_owner": "oakline-owner-grove",
         "_units": [
            {"name": "oakline-birch-1", "unit_label": "Unit 1", "bedrooms": 3, "bathrooms": 2.5,
             "square_feet": 1500, "rent": 2250.0, "status": "available", "hero_image": ux("1600585154340-be6161a56a0c")},
            {"name": "oakline-birch-2", "unit_label": "Unit 2", "bedrooms": 2, "bathrooms": 2.0,
             "square_feet": 1200, "rent": 1900.0, "status": "available", "hero_image": ux("1600566753086-00f18fb6b3ea")},
            {"name": "oakline-birch-3", "unit_label": "Unit 3", "bedrooms": 3, "bathrooms": 2.5,
             "square_feet": 1520, "rent": 2300.0, "status": "occupied", "hero_image": ux("1600607687939-ce8a6c25118c")},
         ]},
    ],
    "residents": [
        {"name": "oakline-res-jamie", "display_name": "Jamie Fox",
         "description": "Resident at Maple Court.", "owner_username": "jamie@example.com",
         "full_name": "Jamie Fox", "email": "jamie@example.com", "phone": "+15550300201",
         "photo": ux("1544005313-94ddf0286df2", 800, 800), "_unit": "oakline-maple-b"},
    ],
    "leases": [
        {"name": "oakline-lease-jamie", "display_name": "Lease — Jamie Fox / 22 Maple Ct",
         "description": "12-month active lease.", "owner_username": "jamie@example.com",
         "status": "active", "start_at": _in_days(-90), "end_at": _in_days(275),
         "deposit": 2050.0, "resident_name": "Jamie Fox",
         "_unit": "oakline-maple-b", "_resident": "oakline-res-jamie"},
    ],
    "payments": [
        {"name": "oakline-pay-jamie-jun", "display_name": "Rent — Jamie Fox / 2026-06",
         "description": "Captured rent payment.", "owner_username": "jamie@example.com",
         "status": "captured", "amount": 2050.0, "currency": "USD", "period": "2026-06",
         "method": "check", "paid_at": _in_days(-6), "resident_name": "Jamie Fox", "unit_label": "22 Maple Ct",
         "property_name": "Maple Court", "_lease": "oakline-lease-jamie"},
    ],
    "maintenance": [
        {"name": "oakline-mr-1", "display_name": "Furnace making noise",
         "description": "HVAC inspection requested.", "owner_username": "jamie@example.com",
         "title": "Furnace making noise", "category": "hvac", "priority": "normal",
         "status": "submitted", "resident_name": "Jamie Fox", "_unit": "oakline-maple-b",
         "photo": ux("1621905251189-08b45d6a269e")},
    ],
    "applications": [
        {"name": "oakline-app-1", "display_name": "Application — Sam Diaz / Unit 1",
         "description": "Prospect for Birch Terrace.", "owner_username": "sam@example.com",
         "applicant_name": "Sam Diaz", "applicant_email": "sam@example.com",
         "applicant_phone": "+15550300301", "status": "screening", "stated_income": 78000.0,
         "move_in_date": _in_days(40), "_unit": "oakline-birch-1"},
    ],
}

COMPANIES = {
    "summit-residential": SUMMIT,
    "harbor-properties": HARBOR,
    "oakline-management": OAKLINE,
}


def seed_test_data(s, base, domain, tenant_uuid, progress):
    # default-tenant stays admin-only (no business data). Each PM company seeds
    # into its OWN named tenant.
    for tenant, plan in COMPANIES.items():
        _seed_company(s, base, domain, tenant, progress, plan)
    progress.ok("Seeded %d property-management companies." % len(COMPANIES))


def main():
    setup = AppSetup(AppConfig(), ALL_SCHEMAS, PUBLIC_SCHEMAS)
    setup.run(seed_fn=seed_test_data, policies=POLICIES,
              workflow_definitions=WORKFLOW_DEFINITIONS, event_bindings=EVENT_BINDINGS)


if __name__ == "__main__":
    main()
