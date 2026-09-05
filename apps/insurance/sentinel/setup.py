import sys, os, datetime
sys.path.insert(0, os.path.dirname(__file__))
from supero.app_setup import AppSetup, PolicyDef, PolicyRule, make_seed_record
from config import AppConfig
from schemas import ALL_SCHEMAS, PUBLIC_SCHEMAS, SUPERO_APP_NAMESPACE

seed_record = make_seed_record(SUPERO_APP_NAMESPACE)
MEMBER_EMAIL = "member@sentinel.insure"
MEMBER_NAME = "Chris Bennett"


def ux(pid, w=1000):
    b = "https://images.unsplash.com/photo-" + pid + "?auto=format&fit=crop&q=80"
    return {"url": "%s&w=%d&h=%d" % (b, w, int(w * 0.66)), "thumbnail_url": "%s&w=500&h=340" % b}


def d(off):
    return (datetime.date.today() + datetime.timedelta(days=off)).isoformat()


# ── Insurance products (PUBLIC marketing) ────────────────────────────────────────
# (name, line, tagline, monthly_from, highlights, image_id, popular)
PRODUCTS = [
    ("DriveShield Auto", "Auto", "Comprehensive coverage that follows you everywhere.",
     58.0, "Collision & comprehensive · 24/7 roadside assistance · rental reimbursement · accident forgiveness · new-car replacement",
     "1503376780353-7e6692767b70", True),
    ("HomeGuard Property", "Home", "Protect the place that matters most.",
     42.0, "Dwelling & contents to $750k · liability $300k · water-damage & burst-pipe cover · identity-theft restoration · 24/7 claims line",
     "1568605114967-8130f3a36994", True),
    ("LifeLine Term", "Life", "Peace of mind for the people you love.",
     21.0, "Term life up to $1M · level premiums · living benefits rider · accelerated death benefit · no-medical option to $250k",
     "1511895426328-dc8714191300", False),
    ("VitalCare Health", "Health", "Care without the cost surprises.",
     189.0, "$0 preventive care · nationwide PPO network · telehealth included · prescription coverage · out-of-pocket max $4,500",
     "1505751172876-fa1923c5c528", True),
    ("Voyager Travel", "Travel", "Adventure covered, end to end.",
     14.0, "Trip cancellation & interruption · emergency medical to $250k · lost-baggage cover · 24/7 global assistance · adventure-sports add-on",
     "1488646953014-85cb44e25828", False),
    ("PawProtect Pet", "Pet", "Because they're family too.",
     29.0, "Accident & illness cover · 90% reimbursement · no upper age limit · hereditary-condition cover · direct-to-vet payment",
     "1450778869180-41d0601e046e", False),
    ("Sentinel Business Pro", "Business", "Keep your business running, whatever happens.",
     96.0, "General liability $2M · business-interruption cover · commercial property · cyber-liability add-on · workers' comp options",
     "1497366216548-37526070297c", False),
    ("Umbrella Plus", "Home", "An extra layer when limits aren't enough.",
     18.0, "$1M–$5M excess liability · sits above auto & home · legal-defense cover · worldwide protection · loss-of-income cover",
     "1454165804606-c3d57bc86b40", False),
]

# ── Policies owned by the member ─────────────────────────────────────────────────
# (policy_number, product, line, premium, coverage, state, start_off, renewal_off)
POLICIES = [
    ("POL-AUTO-771204", "DriveShield Auto", "Auto", 74.50, 50000.0, "active", -210, 155),
    ("POL-HOME-668193", "HomeGuard Property", "Home", 121.00, 750000.0, "active", -400, -35),
    ("POL-LIFE-540027", "LifeLine Term", "Life", 38.00, 1000000.0, "active", -730, 1095),
    ("POL-TRVL-902551", "Voyager Travel", "Travel", 26.00, 250000.0, "active", -40, 320),
    ("POL-PET-118430", "PawProtect Pet", "Pet", 34.00, 15000.0, "lapsed", -500, -45),
    ("POL-AUTO-883910", "DriveShield Auto", "Auto", 69.00, 40000.0, "quoted", -3, 362),
]

# ── Claims owned by the member ───────────────────────────────────────────────────
# (claim_number, policy_number, line, claim_type, incident_off, claimed, approved,
#  state, adjuster, description, submitted_off, fraud_score, internal_notes)
CLAIMS = [
    ("CLM-204418", "POL-AUTO-771204", "Auto", "Collision", -22, 4820.00, 4320.00, "paid",
     "Dana Okafor", "Rear-ended at a stoplight on Elm St; bumper and trunk damage, no injuries.",
     -21, 12, "Police report on file. Repair estimate from preferred shop matches. Low fraud signal — fast-tracked."),
    ("CLM-204502", "POL-HOME-668193", "Home", "Water Damage", -14, 9650.00, None, "under_review",
     "Marcus Reyes", "Burst pipe under the kitchen sink flooded the cabinetry and hardwood flooring.",
     -13, 41, "Moderate fraud signal — claimed amount above typical for reported damage radius. Awaiting plumber invoice + moisture report before approval."),
    ("CLM-204611", "POL-AUTO-771204", "Auto", "Windshield", -7, 540.00, None, "submitted",
     None, "Highway debris cracked the windshield; safety-critical, needs full replacement.",
     -6, 8, "Standard glass claim, low value. Auto-approve candidate once invoice received."),
    ("CLM-203980", "POL-TRVL-902551", "Travel", "Trip Cancellation", -55, 2150.00, 1900.00, "paid",
     "Dana Okafor", "Flight cancelled due to a hurricane; non-refundable hotel and tour fees lost.",
     -54, 15, "Airline cancellation confirmed via official notice. Deducted $250 for refundable taxi portion. Paid."),
    ("CLM-204120", "POL-HOME-668193", "Home", "Theft", -38, 7300.00, 6800.00, "approved",
     "Marcus Reyes", "Break-in while away; laptop, camera gear and jewelry taken.",
     -36, 33, "Police report verified, serial numbers matched receipts. Jewelry appraisal slightly high — adjusted down. Approved, pending payout."),
    ("CLM-204233", "POL-PET-118430", "Pet", "Illness", -60, 1280.00, None, "denied",
     "Priya Anand", "Emergency vet visit for the dog — diagnosed with a hereditary hip condition.",
     -58, 67, "HIGH fraud/eligibility flag — incident date falls AFTER the policy lapsed (POL-PET-118430). Coverage not in force. Denied with explanation letter."),
    ("CLM-204390", "POL-AUTO-883910", "Auto", "Vandalism", -9, 1950.00, None, "under_review",
     "Dana Okafor", "Keyed along the driver's side and a side mirror snapped off in a parking garage.",
     -8, 58, "Elevated fraud signal — policy was only just quoted/bound days before the reported incident. Verifying bind date vs. incident date and requesting garage CCTV."),
    ("CLM-204455", "POL-HOME-668193", "Home", "Wind Damage", -4, 3400.00, None, "submitted",
     None, "Storm tore shingles off the roof and brought down a section of fence.",
     -3, 19, "Weather event corroborated by NWS data for the date. Awaiting roofer estimate and photos before assigning."),
]

# ── Claim documents owned by the member ──────────────────────────────────────────
# (claim_number, title, doc_type, doc_state, uploaded_off)
DOCUMENTS = [
    ("CLM-204418", "Police Report — incident #A-77120", "Police Report", "verified", -21),
    ("CLM-204418", "Body-shop repair estimate", "Estimate", "verified", -20),
    ("CLM-204502", "Kitchen water-damage photos", "Photo", "received", -13),
    ("CLM-204502", "Plumber invoice", "Receipt", "pending", -12),
    ("CLM-204120", "Police report — burglary", "Police Report", "verified", -36),
    ("CLM-204120", "Receipts for stolen electronics", "Receipt", "received", -35),
]


# ── Access policies ──────────────────────────────────────────────────────────────
POLICIES_DEF = [
    # DEMO-ACCOUNT-SCOPE-V1 — the claims-team account is PUBLISHED (its address and
    # password ship in this repo so anyone can try the app), so it must not also be
    # a skeleton key. It used to be `default_access="full"` with no rules at all:
    # unrestricted read/write/delete over EVERY entity in the domain, not just this
    # app's four. Now it is scoped to exactly the operations the console actually
    # performs — products are fully managed, policies are read-only, and claims move
    # through their lifecycle but cannot be deleted, so the seeded demo data cannot
    # be destroyed by a visitor.
    #
    # NOTE: this is deliberately NOT a read-only account. The launch demo turns on
    # being able to approve and pay a claim, which needs `can_update` on claim.
    # Fully read-only demo logins + self-registration is a v2 decision, not this one.
    PolicyDef(role="tenant_admin", default_access="none", rules=[
        PolicyRule(entity="insurance_product", can_read=True, can_create=True,
                   can_update=True, can_delete=True),
        PolicyRule(entity="policy", can_read=True),
        PolicyRule(entity="claim", can_read=True, can_create=True, can_update=True),
        PolicyRule(entity="claim_document", can_read=True, can_create=True, can_update=True),
    ]),
    PolicyDef(role="tenant_user", default_access="none", rules=[
        PolicyRule(entity="insurance_product", can_read=True),
        PolicyRule(entity="policy", can_read=True, can_create=True, can_update=True,
                   filter_field="owner_username", filter_match="$user.name"),
        # FIELD-LEVEL RBAC: policyholders see their own claim but NEVER the insurer's
        # fraud_score or internal_notes — server-stripped from their reads.
        PolicyRule(entity="claim", can_read=True, can_create=True, can_update=True,
                   filter_field="owner_username", filter_match="$user.name",
                   hidden_fields=["fraud_score", "internal_notes"]),
        PolicyRule(entity="claim_document", can_read=True, can_create=True, can_update=True,
                   filter_field="owner_username", filter_match="$user.name"),
    ]),
]


# ── Workflows ────────────────────────────────────────────────────────────────────
WORKFLOW_DEFINITIONS = [
    {
        # (1) EVENT-BOUND on @create:sentinel:claim — acknowledge the holder + alert adjusters.
        "workflow_id": "claim_intake", "display_name": "Claim Intake",
        "description": "On a new claim, emails the policyholder an acknowledgement and pings the #claims Slack channel for adjusters.",
        "version": "1.0.0", "enabled": True, "status": "Active", "on_error": "continue",
        "input_schema": {"holder_email": {"type": "string", "required": False},
                         "holder_name": {"type": "string", "required": False},
                         "claim_number": {"type": "string", "required": False},
                         "line": {"type": "string", "required": False},
                         "amount_claimed": {"type": "number", "required": False}},
        "steps": [
            {"id": "ack", "type": "service_call", "service": "email", "operation": "send_email", "on_error": "continue",
             "input_map": {"to_email": "{{input.holder_email}}",
                           "subject": "We've received your claim {{input.claim_number}}",
                           "body_html": "<p>Hi {{input.holder_name}},</p><p>Thank you — your {{input.line}} claim <b>{{input.claim_number}}</b> has been received and assigned to a claims adjuster. You can track its status any time in your Sentinel portal. We'll be in touch shortly.</p><p>— Sentinel Claims</p>"}},
            {"id": "alert", "type": "service_call", "service": "slack", "operation": "send_message", "on_error": "continue",
             "input_map": {"channel": "#claims",
                           "text": "🆕 New claim {{input.claim_number}} ({{input.line}}) for ${{input.amount_claimed}} from {{input.holder_name}} — needs triage."}},
        ],
    },
    {
        # (2) Triggerable decision SAGA — approve a claim, email the holder; compensate reverts.
        "workflow_id": "claim_decision", "display_name": "Claim Decision",
        "description": "Approves a claim (sets amount approved + state), then emails the policyholder (saga — reverts the claim to under_review if a downstream step fails).",
        "version": "1.0.0", "enabled": True, "status": "Active", "on_error": "compensate",
        "input_schema": {"claim_uuid": {"type": "string", "required": True},
                         "holder_email": {"type": "string", "required": False},
                         "claim_number": {"type": "string", "required": False},
                         "amount_approved": {"type": "number", "required": False}},
        "steps": [
            {"id": "approve", "type": "crud_operation", "operation": "update", "object_type": "sentinel:claim",
             "record_uuid": "{{input.claim_uuid}}",
             "data": {"claim_state": "approved", "amount_approved": "{{input.amount_approved}}"},
             "compensate": {"kind": "automatic", "type": "crud_operation", "operation": "update",
                            "object_type": "sentinel:claim", "record_uuid": "{{input.claim_uuid}}",
                            "data": {"claim_state": "under_review"}}},
            {"id": "notify", "type": "service_call", "service": "email", "operation": "send_email", "on_error": "continue",
             "input_map": {"to_email": "{{input.holder_email}}",
                           "subject": "Good news — claim {{input.claim_number}} approved",
                           "body_html": "<p>Your claim <b>{{input.claim_number}}</b> has been approved for <b>${{input.amount_approved}}</b>. Payment will be issued to your account shortly. Thank you for trusting Sentinel.</p>"}},
        ],
    },
    {
        # (3) Triggerable payout — mark paid + receipt email.
        "workflow_id": "claim_payout", "display_name": "Claim Payout",
        "description": "Marks an approved claim as paid and emails the policyholder a payment confirmation.",
        "version": "1.0.0", "enabled": True, "status": "Active", "on_error": "continue",
        "input_schema": {"claim_uuid": {"type": "string", "required": True},
                         "holder_email": {"type": "string", "required": False},
                         "claim_number": {"type": "string", "required": False},
                         "amount_approved": {"type": "number", "required": False}},
        "steps": [
            {"id": "pay", "type": "crud_operation", "operation": "update", "object_type": "sentinel:claim",
             "record_uuid": "{{input.claim_uuid}}", "data": {"claim_state": "paid"}},
            {"id": "receipt", "type": "service_call", "service": "email", "operation": "send_email", "on_error": "continue",
             "input_map": {"to_email": "{{input.holder_email}}",
                           "subject": "Payment sent — claim {{input.claim_number}}",
                           "body_html": "<p>A payment of <b>${{input.amount_approved}}</b> for claim <b>{{input.claim_number}}</b> has been issued. Please allow 1–3 business days for it to reach your account.</p><p>— Sentinel Claims</p>"}},
        ],
    },
]

EVENT_BINDINGS = [
    # NO-OPEN-RELAY-V1 — `holder_email` is mapped from `user.email` (the JWT of
    # whoever filed the claim), NOT from the record's own holder_email field.
    # The record's field is typed by the visitor, so mapping it here would let a
    # stranger on a public demo aim Sentinel's acknowledgement mail at any
    # address they liked — an abuse vector, not a hypothetical, on a link that
    # reaches thousands of people. The event payload carries `user` populated
    # from the verified token (server.py: payload["user"] = user), so the
    # acknowledgement can only ever reach the person who filed the claim.
    {"event": "@create:sentinel:claim", "workflow_id": "claim_intake",
     "input_map": {"holder_email": "user.email", "holder_name": "holder_name",
                   "claim_number": "claim_number", "line": "line", "amount_claimed": "amount_claimed"}},
]


def seed_test_data(s, base, domain, tenant_uuid, progress):
    # InsuranceProducts (public)
    np = 0
    for i, p in enumerate(PRODUCTS):
        name, line, tagline, mfrom, highlights, img, pop = p
        rec = {"name": name, "line": line, "tagline": tagline, "monthly_from": mfrom,
               "coverage_highlights": highlights, "image": ux(img), "popular": pop, "sort_order": i,
               "display_name": name, "description": "%s · from $%g/mo" % (line, mfrom)}
        if seed_record(s, base, domain, "InsuranceProduct", rec, progress=progress, tenant_name="default-tenant"):
            np += 1
    progress.ok("Seeded %d InsuranceProducts." % np)

    # Policies (owned by member)
    npo = 0
    for (num, prod, line, premium, cov, state, soff, roff) in POLICIES:
        rec = {"policy_number": num, "product_name": prod, "line": line, "holder_name": MEMBER_NAME,
               "holder_email": MEMBER_EMAIL, "premium": premium, "coverage_amount": cov,
               "policy_state": state, "start_date": d(soff), "renewal_date": d(roff),
               "owner_username": MEMBER_EMAIL, "display_name": num, "description": "%s · %s" % (prod, state)}
        if seed_record(s, base, domain, "Policy", rec, progress=progress, tenant_name="default-tenant"):
            npo += 1
    progress.ok("Seeded %d Policies." % npo)

    # Claims (owned by member; fraud_score + internal_notes populated for RBAC contrast)
    nc = 0
    for (num, pol, line, ctype, ioff, claimed, approved, state, adj, desc, soff, fscore, inotes) in CLAIMS:
        rec = {"claim_number": num, "policy_number": pol, "line": line, "holder_name": MEMBER_NAME,
               "holder_email": MEMBER_EMAIL, "claim_type": ctype, "incident_date": d(ioff),
               "amount_claimed": claimed, "claim_state": state, "description": desc,
               "submitted_date": d(soff), "fraud_score": fscore, "internal_notes": inotes,
               "owner_username": MEMBER_EMAIL, "display_name": "%s · %s" % (num, ctype)}
        if approved is not None:
            rec["amount_approved"] = approved
        if adj:
            rec["adjuster"] = adj
        if seed_record(s, base, domain, "Claim", rec, progress=progress, tenant_name="default-tenant"):
            nc += 1
    progress.ok("Seeded %d Claims." % nc)

    # ClaimDocuments (owned by member)
    nd = 0
    for (cnum, title, dtype, dstate, uoff) in DOCUMENTS:
        rec = {"claim_number": cnum, "title": title, "doc_type": dtype, "doc_state": dstate,
               "uploaded_date": d(uoff), "owner_username": MEMBER_EMAIL,
               "display_name": title, "description": "%s · %s" % (cnum, dtype)}
        if seed_record(s, base, domain, "ClaimDocument", rec, progress=progress, tenant_name="default-tenant"):
            nd += 1
    progress.ok("Seeded %d ClaimDocuments." % nd)


def main():
    setup = AppSetup(AppConfig(), ALL_SCHEMAS, PUBLIC_SCHEMAS)
    setup.run(seed_fn=seed_test_data, policies=POLICIES_DEF,
              workflow_definitions=WORKFLOW_DEFINITIONS, event_bindings=EVENT_BINDINGS)


if __name__ == "__main__":
    main()
