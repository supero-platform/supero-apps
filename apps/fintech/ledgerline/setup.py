import sys, os, datetime
sys.path.insert(0, os.path.dirname(__file__))
from supero.app_setup import AppSetup, PolicyDef, PolicyRule, make_seed_record
from config import AppConfig
from schemas import ALL_SCHEMAS, PUBLIC_SCHEMAS, SUPERO_APP_NAMESPACE

seed_record = make_seed_record(SUPERO_APP_NAMESPACE)
CUST_EMAIL = "customer@ledgerline.io"


def d(off):
    return (datetime.date.today() + datetime.timedelta(days=off)).isoformat()


def dtt(off):
    return (datetime.datetime.utcnow() + datetime.timedelta(days=off)).replace(microsecond=0).isoformat() + "Z"


PLANS = [
    ("Starter", "Starter", 49.0, 490.0, 3, 10000, 0.004, "3 seats · 10k API calls · email support · core analytics", False),
    ("Growth", "Growth", 199.0, 1990.0, 10, 100000, 0.003, "10 seats · 100k API calls · priority support · webhooks · SSO", True),
    ("Scale", "Scale", 599.0, 5990.0, 30, 1000000, 0.002, "30 seats · 1M API calls · 24/7 support · audit logs · SLA", False),
    ("Enterprise", "Enterprise", 1999.0, 19990.0, 100, 10000000, 0.001, "Unlimited seats · custom limits · dedicated CSM · on-prem option", False),
]

# customers: (business, contact, email, plan, tier, mrr, seats, usage, interval, state, signup_off)
CUSTOMERS = [
    ("Northwind Labs", "Northwind Labs", CUST_EMAIL, "Growth", "Growth", 199.0, 8, 84000, "monthly", "active", -210),
    ("Acme Analytics", "Dana Ruiz", "dana@acme.example", "Scale", "Scale", 599.0, 24, 720000, "monthly", "active", -340),
    ("Beacon Health", "Sam Patel", "sam@beacon.example", "Enterprise", "Enterprise", 1999.0, 88, 6400000, "annual", "active", -520),
    ("Tidepool Co", "Ana Gomez", "ana@tidepool.example", "Starter", "Starter", 49.0, 3, 12400, "monthly", "past_due", -95),
    ("Quill & Co", "Owen Park", "owen@quill.example", "Growth", "Growth", 199.0, 9, 51000, "monthly", "active", -160),
    ("Lumen Robotics", "Mia Sato", "mia@lumenrobotics.example", "Scale", "Scale", 599.0, 18, 410000, "annual", "active", -400),
    ("Drift Studio", "Theo Bauer", "theo@drift.example", "Starter", "Starter", 49.0, 2, 6200, "monthly", "trial", -12),
    ("Vector Freight", "Priya Shah", "priya@vector.example", "Growth", "Growth", 0.0, 7, 38000, "monthly", "churned", -300),
]

# invoices: (number, customer, email, period, subtotal, usage, amount, state, issued_off, due_off, owner)
INVOICES = [
    ("LL-2041", "Northwind Labs", CUST_EMAIL, "May 2026", 199.0, 18.40, 217.40, "paid", -35, -20, CUST_EMAIL),
    ("LL-2078", "Northwind Labs", CUST_EMAIL, "Jun 2026", 199.0, 24.10, 223.10, "sent", -6, 9, CUST_EMAIL),
    ("LL-2052", "Acme Analytics", "dana@acme.example", "Jun 2026", 599.0, 96.00, 695.00, "paid", -10, 5, "dana@acme.example"),
    ("LL-2061", "Tidepool Co", "ana@tidepool.example", "Jun 2026", 49.0, 9.60, 58.60, "overdue", -28, -8, "ana@tidepool.example"),
    ("LL-2069", "Quill & Co", "owen@quill.example", "Jun 2026", 199.0, 3.00, 202.00, "sent", -4, 11, "owen@quill.example"),
    ("LL-2044", "Lumen Robotics", "mia@lumenrobotics.example", "FY2026", 7188.0, 320.00, 7508.00, "paid", -40, -25, "mia@lumenrobotics.example"),
]

# expenses: (title, vendor, amount, category, submitter, email, state, submitted_off, note)
EXPENSES = [
    ("Datadog annual", "Datadog", 4800.0, "Software", "Riley Chen", "finance@ledgerline.io", "approved", -7, "Observability renewal"),
    ("SaaStr tickets x2", "SaaStr", 2400.0, "Travel", "Jordan Kim", "jordan@ledgerline.io", "submitted", -2, "Conference for sales team"),
    ("Figma org plan", "Figma", 900.0, "Software", "Alex Rivera", "alex@ledgerline.io", "submitted", -1, "Design team seats"),
    ("LinkedIn Ads", "LinkedIn", 3000.0, "Marketing", "Sam Lee", "sam@ledgerline.io", "approved", -10, "Q3 demand-gen"),
    ("Standing desks x4", "Fully", 1600.0, "Office", "Riley Chen", "finance@ledgerline.io", "reimbursed", -20, "New hires"),
    ("Contractor — data eng", "Upwork", 5200.0, "Contractors", "Alex Rivera", "alex@ledgerline.io", "rejected", -14, "Over budget this quarter"),
]


POLICIES = [
    PolicyDef(role="tenant_admin", default_access="full", rules=[]),
    PolicyDef(role="tenant_user", default_access="none", rules=[
        PolicyRule(entity="plan", can_read=True),
        PolicyRule(entity="customer", can_read=True, can_update=True,
                   filter_field="owner_username", filter_match="$user.name"),
        PolicyRule(entity="invoice", can_read=True,
                   filter_field="owner_username", filter_match="$user.name"),
        PolicyRule(entity="expense", can_read=True, can_create=True,
                   filter_field="owner_username", filter_match="$user.name"),
    ]),
]


WORKFLOW_DEFINITIONS = [
    {
        "workflow_id": "invoice_dunning", "display_name": "Invoice Dunning",
        "description": "Emails an overdue-invoice reminder and advances the dunning step (saga — reverts the step if the email send fails).",
        "version": "1.0.0", "enabled": True, "status": "Active", "on_error": "compensate",
        "input_schema": {"invoice_uuid": {"type": "string", "required": True},
                         "customer_email": {"type": "string", "required": False},
                         "invoice_number": {"type": "string", "required": False},
                         "amount": {"type": "number", "required": False},
                         "dunning_step": {"type": "number", "required": False}},
        "steps": [
            {"id": "advance", "type": "crud_operation", "operation": "update", "object_type": "ledgerline:invoice",
             "record_uuid": "{{input.invoice_uuid}}", "data": {"invoice_state": "overdue"},
             "compensate": {"kind": "automatic", "type": "crud_operation", "operation": "update",
                            "object_type": "ledgerline:invoice", "record_uuid": "{{input.invoice_uuid}}",
                            "data": {"invoice_state": "sent"}}},
            {"id": "email", "type": "service_call", "service": "email", "operation": "send_email",
             "input_map": {"to_email": "{{input.customer_email}}",
                           "subject": "Payment reminder — invoice {{input.invoice_number}}",
                           "body_html": "<p>Your invoice {{input.invoice_number}} for ${{input.amount}} is past due. Please pay at your earliest convenience to avoid service interruption.</p>"}},
        ],
    },
    {
        "workflow_id": "expense_approval", "display_name": "Expense Approval",
        "description": "Approves an expense, emails the submitter, and marks it reimbursed (saga — un-approves if reimbursement fails).",
        "version": "1.0.0", "enabled": True, "status": "Active", "on_error": "compensate",
        "input_schema": {"expense_uuid": {"type": "string", "required": True},
                         "submitter_email": {"type": "string", "required": False},
                         "title": {"type": "string", "required": False}},
        "steps": [
            {"id": "approve", "type": "crud_operation", "operation": "update", "object_type": "ledgerline:expense",
             "record_uuid": "{{input.expense_uuid}}", "data": {"expense_state": "approved"},
             "compensate": {"kind": "automatic", "type": "crud_operation", "operation": "update",
                            "object_type": "ledgerline:expense", "record_uuid": "{{input.expense_uuid}}",
                            "data": {"expense_state": "submitted"}}},
            {"id": "notify", "type": "service_call", "service": "email", "operation": "send_email", "on_error": "continue",
             "input_map": {"to_email": "{{input.submitter_email}}", "subject": "Your expense was approved: {{input.title}}",
                           "body_html": "<p>Good news — your expense \"{{input.title}}\" has been approved and will be reimbursed in the next cycle.</p>"}},
            {"id": "reimburse", "type": "crud_operation", "operation": "update", "object_type": "ledgerline:expense",
             "record_uuid": "{{input.expense_uuid}}", "data": {"expense_state": "reimbursed"}},
        ],
    },
    {
        "workflow_id": "subscription_welcome", "display_name": "Subscription Welcome",
        "description": "Emails a welcome to a newly-created customer.",
        "version": "1.0.0", "enabled": True, "status": "Active", "on_error": "continue",
        "input_schema": {"email": {"type": "string", "required": False}, "business_name": {"type": "string", "required": False}, "plan_name": {"type": "string", "required": False}},
        "steps": [
            {"id": "email", "type": "service_call", "service": "email", "operation": "send_email", "on_error": "continue",
             "input_map": {"to_email": "{{input.email}}", "subject": "Welcome to Ledgerline",
                           "body_html": "<p>Welcome aboard, {{input.business_name}}! Your {{input.plan_name}} plan is active. Track usage and invoices any time in your portal.</p>"}},
        ],
    },
]

EVENT_BINDINGS = [
    {"event": "@create:ledgerline:customer", "workflow_id": "subscription_welcome",
     "input_map": {"email": "email", "business_name": "business_name", "plan_name": "plan_name"}},
]


def seed_test_data(s, base, domain, tenant_uuid, progress):
    n = 0
    for i, p in enumerate(PLANS):
        nm, tier, pm, pa, seats, units, ovr, feats, pop = p
        rec = {"plan_name": nm, "tier": tier, "price_monthly": pm, "price_annual": pa, "included_seats": seats,
               "included_units": units, "overage_rate": ovr, "features": feats, "popular": pop, "sort_order": i,
               "display_name": nm, "description": feats}
        if seed_record(s, base, domain, "Plan", rec, progress=progress, tenant_name="default-tenant"):
            n += 1
    progress.ok("Seeded %d Plans." % n)

    nc = 0
    for (biz, contact, email, plan, tier, mrr, seats, usage, interval, state, soff) in CUSTOMERS:
        rec = {"business_name": biz, "contact_name": contact, "email": email, "plan_name": plan, "tier": tier,
               "mrr": mrr, "seats": seats, "usage_units": usage, "billing_interval": interval, "account_state": state,
               "signup_date": d(soff), "owner_username": (CUST_EMAIL if email == CUST_EMAIL else email),
               "display_name": biz, "description": "%s · %s" % (plan, state)}
        if seed_record(s, base, domain, "Customer", rec, progress=progress, tenant_name="default-tenant"):
            nc += 1
    progress.ok("Seeded %d Customers." % nc)

    ni = 0
    for (num, cust, email, period, sub, usage, amt, state, ioff, doff, owner) in INVOICES:
        rec = {"invoice_number": num, "customer_name": cust, "customer_email": email, "period": period,
               "subtotal": sub, "usage_charges": usage, "amount": amt, "invoice_state": state,
               "issued_date": d(ioff), "due_date": d(doff), "dunning_step": (1 if state == "overdue" else 0),
               "owner_username": owner, "display_name": num, "description": "%s · %s" % (cust, period)}
        if state == "paid":
            rec["paid_at"] = dtt(ioff + 2)
        if seed_record(s, base, domain, "Invoice", rec, progress=progress, tenant_name="default-tenant"):
            ni += 1
    progress.ok("Seeded %d Invoices." % ni)

    ne = 0
    for (title, vendor, amt, cat, sub, email, state, soff, note) in EXPENSES:
        rec = {"title": title, "vendor": vendor, "amount": amt, "category": cat, "submitter": sub,
               "submitter_email": email, "expense_state": state, "submitted_date": d(soff), "note": note,
               "approver": ("Riley Chen" if state in ("approved", "reimbursed", "rejected") else ""),
               "owner_username": email, "display_name": title, "description": "%s · %s" % (vendor, cat)}
        if seed_record(s, base, domain, "Expense", rec, progress=progress, tenant_name="default-tenant"):
            ne += 1
    progress.ok("Seeded %d Expenses." % ne)


def main():
    setup = AppSetup(AppConfig(), ALL_SCHEMAS, PUBLIC_SCHEMAS)
    setup.run(seed_fn=seed_test_data, policies=POLICIES,
              workflow_definitions=WORKFLOW_DEFINITIONS, event_bindings=EVENT_BINDINGS)


if __name__ == "__main__":
    main()
