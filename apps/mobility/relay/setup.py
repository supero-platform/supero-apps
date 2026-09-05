import sys, os, datetime
sys.path.insert(0, os.path.dirname(__file__))
from supero.app_setup import AppSetup, PolicyDef, PolicyRule, make_seed_record, ref_link
from config import AppConfig
from schemas import ALL_SCHEMAS, PUBLIC_SCHEMAS, SUPERO_APP_NAMESPACE

seed_record = make_seed_record(SUPERO_APP_NAMESPACE)


def ux(pid, w=1600, h=1100):
    b = "https://images.unsplash.com/photo-" + pid + "?auto=format&fit=crop&q=80"
    return {"url": "%s&w=%d&h=%d" % (b, w, h), "thumbnail_url": "%s&w=800&h=600" % b}


def at(days, hour):
    # midnight + `hour` hours via timedelta so hour>23 rolls over (end_time = at(day, hour+hours)).
    base = (datetime.datetime.utcnow() + datetime.timedelta(days=days)).replace(hour=0, minute=0, second=0, microsecond=0)
    return (base + datetime.timedelta(hours=hour)).isoformat()


ADMIN = "admin@relay.app"
FAC = "facility@relay.app"
AISHA = "clinician@relay.app"
NORA = "nora@relay.app"
DIEGO = "diego@relay.app"
TENANT = "default-tenant"


# ─────────────────────────── policies ─────────────────────────────────
# admin = tenant_admin (full). Facilities + clinicians are fail-closed tenant_users.
POLICIES = [
    # DEMO-ACCOUNT-SCOPE-V1 — this account's address and password are PUBLISHED in
    # this app's README so anyone can try the demo, so it must not also be a
    # skeleton key. It used to be `default_access="full"` with no rules at all:
    # unrestricted read/write/delete over EVERY entity in the domain, not just the
    # 9 this app owns. Now it is scoped to this app's own entities.
    #
    # Delete is granted only where the UI actually offers it, so a visitor cannot
    # destroy the seeded demo data through an operation the app never exposed.
    #
    # Deliberately NOT read-only: these demos turn on being able to create and
    # advance records. Fully read-only demo logins plus self-registration is a
    # separate product decision.
    PolicyDef(role="tenant_admin", default_access="none", rules=[
        PolicyRule(entity="contract", can_read=True, can_create=True, can_update=True),
        PolicyRule(entity="credential", can_read=True, can_create=True, can_update=True),
        PolicyRule(entity="payout", can_read=True, can_create=True, can_update=True),
        PolicyRule(entity="profile", can_read=True, can_create=True, can_update=True),
        PolicyRule(entity="shift", can_read=True, can_create=True, can_update=True),
        PolicyRule(entity="timesheet", can_read=True, can_create=True, can_update=True),
        PolicyRule(entity="timesheet_step", can_read=True, can_create=True, can_update=True),
        PolicyRule(entity="verification", can_read=True, can_create=True, can_update=True),
        PolicyRule(entity="verification_step", can_read=True, can_create=True, can_update=True),
    ]),
    PolicyDef(role="tenant_user", default_access="none", rules=[
        # SHARED-RECORD-WRITE-GUARD-V1 — these four are deliberately SHARED: a shift
        # board everyone can see, and a timesheet both the clinician and the facility
        # must read. A row filter would break that, since filter_field matches one
        # field and these records have two legitimate parties.
        #
        # But "shared" was implemented as unrestricted: any signed-in user could
        # PUT any field on anyone's record. A clinician could approve their own
        # timesheet (`workflow_status`) or raise their own rate (`rate_hourly`,
        # `pay_total`, `amount`) with a direct API call, bypassing the facility
        # sign-off the UI implies. Self-registration is open, so this needed no
        # credential at all.
        #
        # Only the transactional state fields are locked. rate_hourly, pay_total and
        # facility_username are SET BY THE UI AT CREATE (a facility posting a shift,
        # a clinician submitting a timesheet), and readonly_fields strips on create
        # as well as update — locking them silently dropped a shift's pay rate.
        # workflow_status/processed_at appear in no create payload, so locking them
        # blocks the self-approval path without breaking either flow.
        PolicyRule(entity="shift", can_read=True, can_create=True, can_update=True,
                   readonly_fields=["workflow_status", "processed_at"]),
        PolicyRule(entity="timesheet", can_read=True, can_create=True, can_update=True,
                   readonly_fields=["workflow_status", "processed_at"]),
        PolicyRule(entity="timesheet_step", can_read=True, can_create=True, can_update=True),
        PolicyRule(entity="contract", can_read=True, can_create=True, can_update=True,
                   readonly_fields=["billing_amount", "plan_name", "shifts_per_period"]),
        # Clinician-private wallet + money + verification status.
        PolicyRule(entity="credential", can_read=True, can_create=True, can_update=True,
                   filter_field="owner_username", filter_match="$user.name"),
        PolicyRule(entity="verification", can_read=True, can_create=True, can_update=True,
                   filter_field="owner_username", filter_match="$user.name"),
        PolicyRule(entity="verification_step", can_read=True, can_create=True, can_update=True,
                   filter_field="owner_username", filter_match="$user.name"),
        PolicyRule(entity="payout", can_read=True, can_create=True, can_update=True,
                   filter_field="owner_username", filter_match="$user.name"),
        PolicyRule(entity="profile", can_read=True, can_create=True, can_update=True,
                   filter_field="owner_username", filter_match="$user.name"),
    ]),
]


# ─────────────────────── workflows / sagas ─────────────────────────────
# Shift settlement saga: pay the clinician → invoice the facility → notify → close.
# The payout carries a compensate (refund) so a disputed timesheet reverses the pay.
WORKFLOW_DEFINITIONS = [
    {
        "workflow_id": "shift_settlement",
        "display_name": "Shift Settlement",
        "description": "Pays the clinician, invoices the facility, notifies both, closes the shift.",
        "version": "1.0.0", "enabled": True, "status": "Active", "on_error": "compensate",
        "input_schema": {
            "shift_uuid": {"type": "string", "required": True},
            "clinician_email": {"type": "string", "required": False},
            "facility_email": {"type": "string", "required": False},
            "amount": {"type": "number", "required": False},
            "currency": {"type": "string", "required": False},
        },
        "steps": [
            {"id": "payout", "type": "service_call", "service": "stripe_checkout",
             "operation": "create_checkout_session",
             "input_map": {"amount": "{{input.amount}}", "currency": "{{input.currency}}",
                           "product": "Relay clinician payout"},
             "compensate": {"kind": "automatic", "service": "stripe_checkout", "operation": "refund_payment",
                            "input_map": {"payment_intent": "{{steps.payout.output.id}}"}}},
            {"id": "invoice", "type": "service_call", "service": "email", "operation": "send_email",
             "on_error": "continue",
             "compensate": {"kind": "skip_acknowledged", "reason": "facility invoice notice"},
             "input_map": {"to_email": "{{input.facility_email}}", "subject": "Relay invoice for your shift",
                           "body_html": "<p>Your per-diem shift has been filled and invoiced.</p>"}},
            {"id": "notify", "type": "service_call", "service": "email", "operation": "send_email",
             "on_error": "continue",
             "compensate": {"kind": "skip_acknowledged", "reason": "notification"},
             "input_map": {"to_email": "{{input.clinician_email}}", "subject": "You've been paid for your shift",
                           "body_html": "<p>Your timesheet was approved and payment is on the way.</p>"}},
            {"id": "finalize", "type": "crud_operation", "operation": "update",
             "object_type": "relay:shift", "record_uuid": "{{input.shift_uuid}}",
             "data": {"workflow_status": "processed", "processed_at": "{{context.timestamp}}"}},
        ],
    },
    {
        "workflow_id": "shift_settlement_failtest",
        "display_name": "Shift Settlement (dispute drill)",
        "description": "Pays the clinician then forces a dispute failure so the saga reverses the payout.",
        "version": "1.0.0", "enabled": True, "status": "Active", "on_error": "compensate",
        "input_schema": {
            "shift_uuid": {"type": "string", "required": True},
            "amount": {"type": "number", "required": False},
            "currency": {"type": "string", "required": False},
            "bogus_uuid": {"type": "string", "required": True},
        },
        "steps": [
            {"id": "payout", "type": "service_call", "service": "stripe_checkout",
             "operation": "create_checkout_session",
             "input_map": {"amount": "{{input.amount}}", "currency": "{{input.currency}}",
                           "product": "Relay clinician payout"},
             "compensate": {"kind": "automatic", "service": "stripe_checkout", "operation": "refund_payment",
                            "input_map": {"payment_intent": "{{steps.payout.output.id}}"}}},
            {"id": "dispute", "type": "crud_operation", "operation": "update",
             "object_type": "relay:payout", "record_uuid": "{{input.bogus_uuid}}",
             "data": {"status": "captured"}},
            {"id": "finalize", "type": "crud_operation", "operation": "update",
             "object_type": "relay:shift", "record_uuid": "{{input.shift_uuid}}",
             "data": {"workflow_status": "processed"}},
        ],
    },
    {
        "workflow_id": "credential_verified",
        "display_name": "Credential Verified",
        "description": "Emails a clinician and marks the verification processed when approved.",
        "version": "1.0.0", "enabled": True, "status": "Active", "on_error": "continue",
        "input_schema": {
            "verification_uuid": {"type": "string", "required": True},
            "clinician_email": {"type": "string", "required": False},
            "credential_kind": {"type": "string", "required": False},
        },
        "steps": [
            {"id": "notify", "type": "service_call", "service": "email", "operation": "send_email",
             "on_error": "continue",
             "input_map": {"to_email": "{{input.clinician_email}}",
                           "subject": "Your {{input.credential_kind}} is verified",
                           "body_html": "<p>Your credential is verified — you can now claim matching shifts.</p>"}},
            {"id": "done", "type": "crud_operation", "operation": "update",
             "object_type": "relay:verification", "record_uuid": "{{input.verification_uuid}}",
             "data": {"workflow_status": "processed", "processed_at": "{{context.timestamp}}"}},
        ],
    },
]

EVENT_BINDINGS = []


def seed_test_data(s, base, domain, tenant_uuid, progress):
    def sd(schema, rec):
        return seed_record(s, base, domain, schema, rec, progress=progress, tenant_name=TENANT)

    # ── Profiles ─────────────────────────────────────────────────────────
    profiles = [
        ("p-aisha", "Aisha Bello", "clinician", AISHA, "RN", "ICU", "Portland, OR", 4.95, True, "1559839734-2b71ea197ec2"),
        ("p-nora", "Nora Park", "clinician", NORA, "LPN", "Med-Surg", "Portland, OR", 4.9, True, "1594824476967-48c8b964273f"),
        ("p-diego", "Diego Ramos", "clinician", DIEGO, "CNA", "Long-Term Care", "Beaverton, OR", 4.85, False, "1612349317150-e413f6a5b16d"),
        ("p-fac", "Maple Ridge Medical", "facility", FAC, "Hospital", "Acute Care", "Portland, OR", 4.8, True, "1538108149393-fbbd81895907"),
        ("p-admin", "Relay Admin", "admin", ADMIN, "Admin", "", "HQ", 5.0, True, "1582750433449-648ed127bb54"),
    ]
    for (nm, dn, persona, un, role, spec, loc, rating, cred, pid) in profiles:
        sd("Profile", {"name": nm, "display_name": dn, "description": persona + " profile.", "persona": persona,
            "owner_username": un, "email": un, "phone": "+1-555-0900", "role": role, "specialty": spec,
            "location": loc, "rating": rating, "credentialed": cred, "avatar": ux(pid, 400, 400)})
    progress.ok("Seeded %d profiles." % len(profiles))

    # ── Shifts (11) ──────────────────────────────────────────────────────
    img = {"ICU": "1551190822-a9333d879b1f", "ER": "1538108149393-fbbd81895907", "Med-Surg": "1516549655169-df83a0774514",
           "OR": "1579684385127-1ef15d508118", "L&D": "1530497610245-94d3c16cda28", "LTC": "1576091160550-2173dba999ef"}
    shifts = [
        ("RN", "ICU", 68.0, 12, 2, 7, "requested", None),
        ("RN", "ER", 72.0, 12, 3, 19, "requested", None),
        ("LPN", "Med-Surg", 42.0, 8, 1, 7, "confirmed", (NORA, "Nora Park")),
        ("CNA", "LTC", 26.0, 8, 4, 7, "requested", None),
        ("RN", "OR", 78.0, 10, 5, 7, "requested", None),
        ("RN", "ICU", 68.0, 12, -2, 7, "completed", (AISHA, "Aisha Bello")),
        ("LPN", "Med-Surg", 42.0, 8, -3, 19, "completed", (NORA, "Nora Park")),
        ("RN", "ER", 72.0, 12, 1, 7, "confirmed", (AISHA, "Aisha Bello")),
        ("CNA", "LTC", 26.0, 8, 6, 7, "requested", None),
        ("NP", "ICU", 95.0, 10, 4, 8, "requested", None),
        ("RT", "ER", 50.0, 12, -5, 7, "completed", (NORA, "Nora Park")),
    ]
    su = {}
    n = 0
    for (role, spec, rate, hours, day, hour, status, claim) in shifts:
        n += 1
        num = "SHF-%04d" % (4000 + n)
        pay = rate * hours
        rec = {"name": num.lower(), "display_name": "%s · %s" % (role, spec), "description": "%dh %s shift in %s." % (hours, role, spec),
            "status": status, "start_time": at(day, hour), "end_time": at(day, hour + hours),
            "facility_username": FAC, "facility_name": "Maple Ridge Medical", "role": role, "specialty": spec,
            "rate_hourly": rate, "hours": float(hours), "pay_total": pay, "shift_date": at(day, hour)[:10],
            "location": "Maple Ridge Medical, Portland, OR", "image": ux(img.get(spec, "1516549655169-df83a0774514")),
            "workflow_status": "processed" if status == "completed" else ""}
        if claim:
            rec["clinician_username"] = claim[0]; rec["clinician_name"] = claim[1]
            if status == "completed":
                rec["checked_in_at"] = at(day, hour); rec["checked_out_at"] = at(day, hour + hours)
        u = sd("Shift", rec)
        if u:
            su[num] = (u, role, spec, rate, hours, pay, claim, status, day)
    progress.ok("Seeded %d shifts." % len(su))

    # ── Credentials (attachment) across states + Verifications (approval) ──
    creds = [
        (AISHA, "Aisha Bello", "RN License", "scanned", True, -200, 520, "1586773860418-d37222d8fce3"),
        (AISHA, "Aisha Bello", "BLS", "scanned", True, -100, 265, None),
        (AISHA, "Aisha Bello", "ACLS", "uploaded", False, -30, 700, None),
        (NORA, "Nora Park", "LPN License", "scanned", True, -150, 580, None),
        (DIEGO, "Diego Ramos", "CNA Cert", "pending_upload", False, -10, 720, None),
    ]
    for (un, name, kind, status, verified, issued, exp, pid) in creds:
        crec = {"name": "cred-%s-%s" % (un.split("@")[0], kind.split()[0].lower()),
            "display_name": "%s — %s" % (name, kind), "description": kind + " on file.", "status": status,
            "owner_username": un, "clinician_name": name, "kind": kind, "issued_on": at(issued, 9)[:10],
            "expires_on": at(exp, 9)[:10], "verified": verified,
            "scan_notes": "Auto-scan passed." if status == "scanned" else ""}
        if pid:
            crec["file"] = ux(pid)
        cu = sd("Credential", crec)
        if cu and status in ("scanned", "uploaded"):
            vstatus = "approved" if verified else "pending"
            vu = sd("Verification", {"name": "ver-%s-%s" % (un.split("@")[0], kind.split()[0].lower()),
                "display_name": "Verify %s — %s" % (name, kind), "description": "Credential review.",
                "status": vstatus, "subject": "Verify " + kind, "owner_username": un, "credential_uuid": cu, "credential_kind": kind,
                "clinician_name": name, "notes": "Reviewed against primary source." if verified else "",
                "workflow_status": "processed" if verified else ""})
            if vu:
                sd("VerificationStep", {"name": "ver-step-%s-%s" % (un.split("@")[0], kind.split()[0].lower()),
                    "display_name": "Admin review", "description": "Primary-source verification step.",
                    "status": "approved" if verified else "pending", "parent_type": "verification", "parent_uuid": vu, "approval_uuid": vu, "step_index": 0,
                    "owner_username": un, "decision": "approved" if verified else "", "notes": ""})
    progress.ok("Seeded %d credentials + verifications." % len(creds))

    # ── Timesheets (approval) + Payouts (payment) for completed shifts ────
    nt = 0
    for num, (u, role, spec, rate, hours, pay, claim, status, day) in su.items():
        if status != "completed" or not claim:
            continue
        nt += 1
        approved = nt != 2   # leave one pending for the demo
        tu = sd("Timesheet", {"name": "ts-" + num.lower(), "display_name": "Timesheet " + num,
            "description": "%s hours for %s." % (hours, claim[1]), "status": "approved" if approved else "pending", "subject": "Timesheet " + num,
            "owner_username": claim[0], "shift_uuid": u, "facility_username": FAC, "facility_name": "Maple Ridge Medical",
            "clinician_name": claim[1], "hours": float(hours), "rate_hourly": rate, "amount": pay,
            "shift_date": at(day, 7)[:10], "workflow_status": "processed" if approved else ""})
        if tu:
            sd("TimesheetStep", {"name": "ts-step-" + num.lower(), "display_name": "Facility approval",
                "description": "Facility approves worked hours.", "status": "approved" if approved else "pending",
                "parent_type": "timesheet", "parent_uuid": tu, "approval_uuid": tu, "step_index": 0, "owner_username": claim[0],
                "decision": "approved" if approved else "", "notes": ""})
            # Payout for approved timesheets
            sd("Payout", {"name": "po-" + num.lower(), "display_name": "Payout " + num,
                "description": "Clinician pay for " + num, "status": "captured" if approved else "pending",
                "amount": pay, "currency": "USD", "owner_username": claim[0], "shift_uuid": u, "timesheet_uuid": tu,
                "facility_name": "Maple Ridge Medical", "clinician_name": claim[1], "method": "ach",
                "external_id": "po_" + num.lower(), "invoice_id": "INV-" + num.split("-")[1],
                "workflow_status": "processed" if approved else ""})
    progress.ok("Seeded %d timesheets with payouts." % nt)

    # ── Contracts (recurring_plan) ───────────────────────────────────────
    for (nm, plan, interval, amount, per, status) in [
        ("CON-5001", "ICU Block Booking", "monthly", 12000.0, 12, "active"),
        ("CON-5002", "Weekend LTC Coverage", "weekly", 3200.0, 4, "inactive"),
    ]:
        sd("Contract", {"name": nm.lower(), "display_name": plan, "description": "Staffing agreement for Maple Ridge.",
            "status": status, "billing_interval": interval, "owner_username": FAC, "facility_name": "Maple Ridge Medical",
            "plan_name": plan, "billing_amount": amount, "shifts_per_period": per})
    progress.ok("Seeded staffing contracts.")


def main():
    setup = AppSetup(AppConfig(), ALL_SCHEMAS, PUBLIC_SCHEMAS)
    setup.run(seed_fn=seed_test_data, policies=POLICIES,
              workflow_definitions=WORKFLOW_DEFINITIONS, event_bindings=EVENT_BINDINGS)


if __name__ == "__main__":
    main()
