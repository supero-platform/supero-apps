import sys, os, datetime
sys.path.insert(0, os.path.dirname(__file__))
from supero.app_setup import AppSetup, PolicyDef, PolicyRule, make_seed_record, ref_link
from config import AppConfig
from schemas import ALL_SCHEMAS, PUBLIC_SCHEMAS, SUPERO_APP_NAMESPACE

seed_record = make_seed_record(SUPERO_APP_NAMESPACE)


def ux(pid, w=1600, h=1100):
    b = "https://images.unsplash.com/photo-" + pid + "?auto=format&fit=crop&q=80"
    return {"url": "%s&w=%d&h=%d" % (b, w, h), "thumbnail_url": "%s&w=800&h=600" % b}


def at(days, hour=9):
    d = (datetime.datetime.utcnow() + datetime.timedelta(days=days)).replace(hour=hour, minute=0, second=0, microsecond=0)
    return d.isoformat()


DISPATCH = "dispatch@fieldops.app"
TECH = "tech@fieldops.app"
ROSA = "rosa@fieldops.app"
DANA = "customer@fieldops.app"
GREG = "greg@fieldops.app"
TENANT = "default-tenant"


# ─────────────────────────── policies ─────────────────────────────────
# dispatcher = tenant_admin (full). Customers/technicians are fail-closed tenant_users.
# Two-party job records (customer + technician + dispatcher) are shared-read; money +
# profile + contract stay owner-scoped to the customer.
POLICIES = [
    PolicyDef(role="tenant_admin", default_access="full", rules=[]),
    PolicyDef(role="tenant_user", default_access="none", rules=[
        PolicyRule(entity="service", can_read=True),
        PolicyRule(entity="technician", can_read=True),
        PolicyRule(entity="part_item", can_read=True, can_create=True, can_update=True),
        PolicyRule(entity="part_hold", can_read=True, can_create=True, can_update=True),
        # Two-party job records — shared so customer + technician + dispatcher can work them.
        PolicyRule(entity="quote", can_read=True, can_create=True, can_update=True),
        PolicyRule(entity="quote_step", can_read=True, can_create=True, can_update=True),
        PolicyRule(entity="appointment", can_read=True, can_create=True, can_update=True),
        PolicyRule(entity="work_order", can_read=True, can_create=True, can_update=True),
        PolicyRule(entity="work_order_signature", can_read=True, can_create=True, can_update=True),
        # Owner-scoped (customer-private).
        PolicyRule(entity="payment", can_read=True, can_create=True, can_update=True,
                   filter_field="owner_username", filter_match="$user.name"),
        PolicyRule(entity="contract", can_read=True, can_create=True, can_update=True,
                   filter_field="owner_username", filter_match="$user.name"),
        PolicyRule(entity="customer_profile", can_read=True, can_create=True, can_update=True,
                   filter_field="owner_username", filter_match="$user.name"),
    ]),
]


# ─────────────────────── workflows / sagas ─────────────────────────────
# Job settlement saga: capture payment → QuickBooks invoice → notify → close. Money +
# accounting carry compensate blocks (refund / void); notifications opt out via
# skip_acknowledged so a later failure ends 'compensated', not 'compensation_failed'.
WORKFLOW_DEFINITIONS = [
    {
        "workflow_id": "job_settlement",
        "display_name": "Job Settlement",
        "description": "Captures payment, syncs a QuickBooks invoice, notifies the customer, closes the job.",
        "version": "1.0.0", "enabled": True, "status": "Active", "on_error": "compensate",
        "input_schema": {
            "appointment_uuid": {"type": "string", "required": True},
            "customer_email": {"type": "string", "required": False},
            "amount": {"type": "number", "required": False},
            "currency": {"type": "string", "required": False},
        },
        "steps": [
            {"id": "capture", "type": "service_call", "service": "stripe_checkout",
             "operation": "create_checkout_session",
             "input_map": {"amount": "{{input.amount}}", "currency": "{{input.currency}}",
                           "product": "FieldOps job"},
             "compensate": {"kind": "automatic", "service": "stripe_checkout", "operation": "refund_payment",
                            "input_map": {"payment_intent": "{{steps.capture.output.id}}"}}},
            {"id": "invoice", "type": "service_call", "service": "quickbooks",
             "operation": "create_invoice", "on_error": "continue",
             "compensate": {"kind": "skip_acknowledged", "reason": "accounting sync best-effort"},
             "input_map": {"amount": "{{input.amount}}", "currency": "{{input.currency}}"}},
            {"id": "notify", "type": "service_call", "service": "email", "operation": "send_email",
             "on_error": "continue",
             "compensate": {"kind": "skip_acknowledged", "reason": "notification"},
             "input_map": {"to_email": "{{input.customer_email}}", "subject": "Your job is complete",
                           "body_html": "<p>Thanks! Your invoice is attached and payment captured.</p>"}},
            {"id": "finalize", "type": "crud_operation", "operation": "update",
             "object_type": "fieldops:appointment", "record_uuid": "{{input.appointment_uuid}}",
             "data": {"workflow_status": "processed", "processed_at": "{{context.timestamp}}",
                      "saga_state": "settled"}},
        ],
    },
    {
        "workflow_id": "job_settlement_failtest",
        "display_name": "Job Settlement (failure drill)",
        "description": "Captures payment then forces a failure so the saga refunds it back.",
        "version": "1.0.0", "enabled": True, "status": "Active", "on_error": "compensate",
        "input_schema": {
            "appointment_uuid": {"type": "string", "required": True},
            "amount": {"type": "number", "required": False},
            "currency": {"type": "string", "required": False},
            "bogus_uuid": {"type": "string", "required": True},
        },
        "steps": [
            {"id": "capture", "type": "service_call", "service": "stripe_checkout",
             "operation": "create_checkout_session",
             "input_map": {"amount": "{{input.amount}}", "currency": "{{input.currency}}",
                           "product": "FieldOps job"},
             "compensate": {"kind": "automatic", "service": "stripe_checkout", "operation": "refund_payment",
                            "input_map": {"payment_intent": "{{steps.capture.output.id}}"}}},
            {"id": "ledger", "type": "crud_operation", "operation": "update",
             "object_type": "fieldops:payment", "record_uuid": "{{input.bogus_uuid}}",
             "data": {"status": "captured"}},
            {"id": "finalize", "type": "crud_operation", "operation": "update",
             "object_type": "fieldops:appointment", "record_uuid": "{{input.appointment_uuid}}",
             "data": {"workflow_status": "processed", "saga_state": "settled"}},
        ],
    },
    {
        "workflow_id": "appointment_dispatch",
        "display_name": "Appointment Dispatch",
        "description": "Pings the dispatch Slack channel and texts the assigned technician.",
        "version": "1.0.0", "enabled": True, "status": "Active", "on_error": "continue",
        "input_schema": {
            "appointment_uuid": {"type": "string", "required": True},
            "tech_phone": {"type": "string", "required": False},
            "summary": {"type": "string", "required": False},
        },
        "steps": [
            {"id": "slack", "type": "service_call", "service": "slack", "operation": "send_message",
             "on_error": "continue",
             "input_map": {"channel": "#dispatch", "text": "New job dispatched: {{input.summary}}"}},
            {"id": "sms", "type": "service_call", "service": "sms", "operation": "send_sms",
             "on_error": "continue",
             "input_map": {"to_number": "{{input.tech_phone}}", "body": "You have a new job: {{input.summary}}"}},
            {"id": "done", "type": "crud_operation", "operation": "update",
             "object_type": "fieldops:appointment", "record_uuid": "{{input.appointment_uuid}}",
             "data": {"workflow_status": "processed", "processed_at": "{{context.timestamp}}"}},
        ],
    },
]

EVENT_BINDINGS = []


def seed_test_data(s, base, domain, tenant_uuid, progress):
    def sd(schema, rec):
        return seed_record(s, base, domain, schema, rec, progress=progress, tenant_name=TENANT)

    # ── Services (9) ─────────────────────────────────────────────────────
    services = [
        ("Drain Cleaning", "Plumbing", 149.0, 90, "1607472586893-edb57bdc0e39", 49.0,
         "Clear stubborn clogs in sinks, tubs and main lines."),
        ("Water Heater Repair", "Plumbing", 220.0, 120, "1585704032915-c3400ca199e7", 49.0,
         "Diagnose and repair tank or tankless water heaters."),
        ("Panel Upgrade", "Electrical", 480.0, 240, "1621905251189-08b45d6a269e", 79.0,
         "Upgrade your electrical panel to modern safety standards."),
        ("Outlet & Switch Install", "Electrical", 120.0, 60, "1558618666-fcd25c85cd64", 49.0,
         "Add or replace outlets, switches and dimmers."),
        ("AC Tune-Up", "HVAC", 129.0, 75, "1581094288338-2314dddb7ece", 39.0,
         "Seasonal air-conditioning maintenance and inspection."),
        ("Furnace Repair", "HVAC", 260.0, 120, "1635048424329-a9bfb146d7aa", 59.0,
         "Restore heat fast with a full furnace diagnostic."),
        ("Appliance Repair", "Appliance", 110.0, 60, "1581092580497-e0d23cbdf1dc", 49.0,
         "Fix washers, dryers, dishwashers and refrigerators."),
        ("Gutter Cleaning", "Roofing", 180.0, 120, "1632759145351-1d592919f522", 0.0,
         "Clear and flush gutters and downspouts."),
        ("Handyman Half-Day", "Handyman", 200.0, 240, "1504148455328-c376907d081c", 0.0,
         "A skilled handyman for your punch list, half-day block."),
    ]
    su = {}
    for (name, cat, price, dur, pid, fee, desc) in services:
        slug = name.lower().replace(" ", "-").replace("&", "and")
        u = sd("Service", {"name": slug, "display_name": name, "description": desc,
            "status": "active", "category": cat, "base_price": price, "duration_minutes": dur,
            "callout_fee": fee, "owner_username": DISPATCH, "image": ux(pid)})
        if u:
            su[name] = u
    progress.ok("Seeded %d services." % len(su))

    # ── Technicians (4) + profiles ───────────────────────────────────────
    techs = [
        (TECH, "Marcus Hale", "Plumbing, HVAC", "+1-555-0710", 4.9, "1500648767791-00dcc994a43e"),
        (ROSA, "Rosa Mendez", "Electrical, Appliance", "+1-555-0711", 4.95, "1494790108377-be9c29b29330"),
        ("sam@fieldops.app", "Sam Cole", "HVAC, Handyman", "+1-555-0712", 4.8, "1507003211169-0a1dd7228f2d"),
        ("priya@fieldops.app", "Priya Shah", "Plumbing, Roofing", "+1-555-0713", 4.85, "1534528741775-53994a69daeb"),
    ]
    tu = {}
    for (un, name, skills, phone, rating, pid) in techs:
        u = sd("Technician", {"name": "tech-" + un.split("@")[0], "display_name": name,
            "description": skills + " specialist.", "tech_username": un, "owner_username": DISPATCH,
            "skills": skills, "phone": phone, "rating": rating, "active": True, "avatar": ux(pid, 400, 400)})
        if u:
            tu[un] = u
    profiles = [
        ("p-dana", "Dana Whitfield", "customer", DANA, "+1-555-0801", "14 Birch Lane, Maple Grove"),
        ("p-greg", "Greg Powell", "customer", GREG, "+1-555-0802", "9 Cedar Court, Maple Grove"),
        ("p-marcus", "Marcus Hale", "technician", TECH, "+1-555-0710", "Depot"),
        ("p-rosa", "Rosa Mendez", "technician", ROSA, "+1-555-0711", "Depot"),
        ("p-dispatch", "Dispatch Desk", "dispatcher", DISPATCH, "+1-555-0700", "HQ"),
    ]
    for (nm, dn, persona, un, phone, addr) in profiles:
        sd("CustomerProfile", {"name": nm, "display_name": dn, "description": persona + " profile.",
            "persona": persona, "owner_username": un, "email": un, "phone": phone, "address": addr})
    progress.ok("Seeded %d technicians and %d profiles." % (len(tu), len(profiles)))

    # ── Parts stock (inventory) ──────────────────────────────────────────
    parts = [
        ("PVC P-Trap 1.5in", "PT-150", 8.50, "Plumbing", 40),
        ("Thermocouple", "TC-22", 14.0, "HVAC", 25),
        ("15A GFCI Outlet", "GF-15", 19.0, "Electrical", 30),
        ("HVAC Capacitor 45uF", "CAP-45", 22.0, "HVAC", 18),
        ("Wax Ring Kit", "WR-01", 6.0, "Plumbing", 50),
    ]
    pu = {}
    for (name, sku, cost, cat, qty) in parts:
        u = sd("PartItem", {"name": sku.lower(), "display_name": name, "description": cat + " part.",
            "status": "active", "quantity": qty, "sku": sku, "unit_cost": cost, "category": cat,
            "owner_username": DISPATCH})
        if u:
            pu[name] = u
    progress.ok("Seeded %d parts." % len(pu))

    # ── Appointments across statuses (+ payment; work order for completed) ─
    # (num, customer, cust_name, addr, service, tech, status, pay_status, day, hour, wo)
    appts = [
        ("JOB-3001", DANA, "Dana Whitfield", "14 Birch Lane, Maple Grove", "Drain Cleaning", TECH,
         "requested", "pending", 1, 9, None),
        ("JOB-3002", DANA, "Dana Whitfield", "14 Birch Lane, Maple Grove", "AC Tune-Up", ROSA,
         "confirmed", "authorized", 2, 13, None),
        ("JOB-3003", GREG, "Greg Powell", "9 Cedar Court, Maple Grove", "Panel Upgrade", ROSA,
         "confirmed", "authorized", 3, 10, None),
        ("JOB-3004", GREG, "Greg Powell", "9 Cedar Court, Maple Grove", "Furnace Repair", TECH,
         "completed", "captured", -2, 11, "signed"),
        ("JOB-3005", DANA, "Dana Whitfield", "14 Birch Lane, Maple Grove", "Appliance Repair", "sam@fieldops.app",
         "completed", "captured", -5, 14, "signed"),
        ("JOB-3006", GREG, "Greg Powell", "9 Cedar Court, Maple Grove", "Gutter Cleaning", "priya@fieldops.app",
         "cancelled", "voided", -1, 9, None),
    ]
    tech_name = {TECH: "Marcus Hale", ROSA: "Rosa Mendez", "sam@fieldops.app": "Sam Cole", "priya@fieldops.app": "Priya Shah"}
    svc_price = {t[0]: t[2] for t in services}
    n_appt = 0
    for (num, cust, cname, addr, svc, tech, status, pstatus, day, hour, wo) in appts:
        amount = svc_price[svc]
        au = sd("Appointment", {"name": num.lower(), "display_name": num, "description": "%s for %s." % (svc, cname),
            "status": status, "start_time": at(day, hour), "end_time": at(day, hour + 2),
            "owner_username": cust, "customer_name": cname, "customer_phone": "+1-555-0801", "address": addr,
            "service_name": svc, "service_uuid": su.get(svc), "technician_username": tech,
            "technician_name": tech_name.get(tech, ""), "amount": amount,
            "saga_state": "settled" if status == "completed" else ("reversed" if status == "cancelled" else "open"),
            "workflow_status": "processed" if status == "completed" else ""})
        if not au:
            continue
        n_appt += 1
        wo_uuid = None
        sd("Payment", {"name": "pay-" + num.lower(), "display_name": "Payment " + num,
            "description": "Card payment.", "status": pstatus, "amount": amount, "currency": "USD",
            "owner_username": cust, "appointment_uuid": au, "method": "card",
            "external_id": "pi_" + num.lower(), "invoice_id": "INV-" + num.split("-")[1],
            "workflow_status": "processed" if status == "completed" else ""})
        if wo:
            doc_status = "completed" if wo == "signed" else "awaiting_signatures"
            wo_uuid = sd("WorkOrder", {"name": "wo-" + num.lower(), "display_name": "Work order " + num,
                "description": "Completion record for " + num, "status": doc_status,
                "title": "Work order " + num, "owner_username": cust, "appointment_uuid": au,
                "customer_name": cname, "technician_username": tech, "technician_name": tech_name.get(tech, ""),
                "parts_used": [{"name": "Thermocouple", "qty": 1}] if "Furnace" in svc else [{"name": "PVC P-Trap 1.5in", "qty": 1}],
                "labor_hours": 2.0, "labor_notes": "Job completed and tested.", "total": amount})
            if wo_uuid:
                sd("WorkOrderSignature", {"name": "sig-" + num.lower(), "display_name": "Signature " + num,
                    "description": "Customer sign-off.", "status": "signed" if wo == "signed" else "pending",
                    "parent_type": "work_order", "parent_uuid": wo_uuid, "document_uuid": wo_uuid,
                    "owner_username": cust, "signer_name": cname, "signer_role": "customer"})
    progress.ok("Seeded %d appointments with payments and work orders." % n_appt)

    # ── Quotes (approval) with a step ────────────────────────────────────
    for (num, cust, cname, svc, amount, status, step_status) in [
        ("QTE-9001", DANA, "Dana Whitfield", "Water Heater Repair", 320.0, "pending", "pending"),
        ("QTE-9002", GREG, "Greg Powell", "Outlet & Switch Install", 180.0, "draft", "pending"),
    ]:
        qu = sd("Quote", {"name": num.lower(), "display_name": num, "description": "Estimate for " + svc,
            "status": status, "subject": svc + " estimate", "owner_username": cust, "customer_name": cname, "service_name": svc,
            "service_uuid": su.get(svc), "address": "Maple Grove",
            "line_items": [{"label": svc, "amount": amount}], "amount": amount,
            "notes": "Parts and labour included."})
        if qu:
            sd("QuoteStep", {"name": num.lower() + "-step", "display_name": "Customer approval",
                "description": "Customer approves the estimate.", "status": step_status,
                "parent_type": "quote", "parent_uuid": qu, "approval_uuid": qu, "step_index": 0, "owner_username": cust,
                "decision": "", "notes": "Awaiting customer decision."})
    progress.ok("Seeded quotes.")

    # ── Maintenance contracts (recurring_plan) ───────────────────────────
    for (nm, cust, cname, plan, interval, amount, status) in [
        ("CON-7001", DANA, "Dana Whitfield", "HVAC Seasonal Plan", "quarterly", 99.0, "active"),
        ("CON-7002", GREG, "Greg Powell", "Whole-Home Care", "monthly", 49.0, "inactive"),
    ]:
        sd("Contract", {"name": nm.lower(), "display_name": plan, "description": "Maintenance plan for " + cname,
            "status": status, "billing_interval": interval, "owner_username": cust, "customer_name": cname,
            "plan_name": plan, "billing_amount": amount, "next_service_date": at(30, 9)[:10]})
    progress.ok("Seeded maintenance contracts.")


def main():
    setup = AppSetup(AppConfig(), ALL_SCHEMAS, PUBLIC_SCHEMAS)
    setup.run(seed_fn=seed_test_data, policies=POLICIES,
              workflow_definitions=WORKFLOW_DEFINITIONS, event_bindings=EVENT_BINDINGS)


if __name__ == "__main__":
    main()
