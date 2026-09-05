import sys, os, datetime
sys.path.insert(0, os.path.dirname(__file__))
from supero.app_setup import AppSetup, PolicyDef, PolicyRule, make_seed_record
from config import AppConfig
from schemas import ALL_SCHEMAS, PUBLIC_SCHEMAS, SUPERO_APP_NAMESPACE

seed_record = make_seed_record(SUPERO_APP_NAMESPACE)

REP_EMAIL = "rep@summit.crm"          # tenant_user — Jordan Blake
MGR_EMAIL = "manager@summit.crm"      # tenant_admin — Alex Rivera
REP_NAME = "Jordan Blake"
# Other reps (records owned by them, not visible to the tenant_user):
SAM = ("sam@summit.crm", "Sam Carter")
PRIYA = ("priya@summit.crm", "Priya Nair")
DANA = ("dana@summit.crm", "Dana Ruiz")


def d(off):
    return (datetime.date.today() + datetime.timedelta(days=off)).isoformat()


def ux(pid, w=600):
    b = "https://images.unsplash.com/photo-" + pid + "?auto=format&fit=crop&q=80"
    return {"url": "%s&w=%d&h=%d" % (b, w, w), "thumbnail_url": "%s&w=300&h=300" % b}


# Office / building photos for account logos.
LOGO_IDS = [
    '1486406146926-c627a92ad1ab', '1497366216548-37526070297c', '1486325212027-8081e485255e',
    '1497366811353-6870744d04b2', '1431540015161-0bf868a2d407', '1460472178825-e5240623afd5',
    '1454165804606-c3d57bc86b40', '1493421419110-74f4e85ba126', '1444723121867-7a241cacace9',
    '1524758631624-e2822e304c36', '1542744173-8e7e53415bb0', '1521737604893-d14cc237f11d',
]
# People headshots for contacts.
PHOTO_IDS = [
    '1494790108377-be9c29b29330', '1500648767791-00dcc994a43e', '1438761681033-6461ffad8d80',
    '1472099645785-5658abf4ff4e', '1507003211169-0a1dd7228f2d', '1517841905240-472988babdf9',
    '1534528741775-53994a69daeb', '1506794778202-cad84cf45f1d', '1573497019940-1c28c88b4f3e',
    '1573496359142-b8d87734a5a2', '1519345182560-3f2917c472ef', '1463453091185-61582044d556',
    '1568602471122-7832951cc4c5', '1531123897727-8f129e1688ce', '1607746882042-944635dfe10e',
    '1580489944761-15a19d654956', '1499952127939-9bbf5af6c51c', '1502685104226-ee32379fefbe',
    '1552058544-f2b08422138a', '1542206395-9feb3edaa68d',
]

# ── Accounts: (name, industry, website, employees, revenue, tier, region, owner_name, state, logo_idx, desc) ──
ACCOUNTS = [
    ("Northwind Labs", "SaaS", "northwind.io", 240, 32000000.0, "Mid-Market", "West", REP_NAME, "customer", 0,
     "Cloud data-pipeline platform; expanding into ML observability."),
    ("Helios Financial", "Fintech", "heliosfin.com", 1800, 410000000.0, "Enterprise", "East", "Sam Carter", "customer", 1,
     "Embedded payments & treasury for marketplaces."),
    ("Verda Health", "Healthcare", "verdahealth.com", 620, 95000000.0, "Enterprise", "Midwest", "Priya Nair", "prospect", 2,
     "Value-based care coordination network."),
    ("Brightline Retail", "Retail", "brightline.shop", 95, 18000000.0, "Mid-Market", "South", REP_NAME, "customer", 3,
     "Omnichannel apparel brand, 40 stores + DTC."),
    ("Forge Manufacturing", "Manufacturing", "forgemfg.com", 3200, 720000000.0, "Enterprise", "Midwest", "Dana Ruiz", "prospect", 4,
     "Precision industrial components supplier."),
    ("Pulse Media Group", "Media", "pulsemedia.tv", 410, 64000000.0, "Mid-Market", "West", "Sam Carter", "customer", 5,
     "Streaming sports & live events network."),
    ("Atlas Academy", "Education", "atlasacademy.edu", 130, 12000000.0, "SMB", "East", REP_NAME, "prospect", 6,
     "Online upskilling for enterprise teams."),
    ("Voltaic Energy", "Energy", "voltaic.energy", 980, 280000000.0, "Enterprise", "West", "Priya Nair", "customer", 7,
     "Distributed solar + battery storage operator."),
    ("Cobalt Logistics", "Manufacturing", "cobaltlogistics.com", 540, 88000000.0, "Mid-Market", "South", REP_NAME, "prospect", 8,
     "Last-mile freight & warehousing."),
    ("Lumen Robotics", "SaaS", "lumenrobotics.ai", 75, 9000000.0, "SMB", "West", "Dana Ruiz", "customer", 9,
     "Warehouse automation robotics startup."),
    ("Meridian Bank", "Fintech", "meridianbank.com", 5200, 1200000000.0, "Enterprise", "East", "Sam Carter", "customer", 10,
     "Regional commercial bank modernizing core systems."),
    ("Tidepool Co", "Retail", "tidepool.co", 48, 4200000.0, "SMB", "West", REP_NAME, "churned", 11,
     "Sustainable home-goods DTC brand."),
]

# ── Contacts: (full_name, title, email, phone, account_name, is_primary, photo_idx, owner_email) ──
CONTACTS = [
    ("Maya Chen", "VP Engineering", "maya@northwind.io", "(415) 555-0110", "Northwind Labs", True, 0, REP_EMAIL),
    ("Tom Becker", "Director of Data", "tom@northwind.io", "(415) 555-0111", "Northwind Labs", False, 3, REP_EMAIL),
    ("Sofia Ramos", "CFO", "sofia@heliosfin.com", "(212) 555-0120", "Helios Financial", True, 1, SAM[0]),
    ("Liam Patel", "Head of Risk", "liam@heliosfin.com", "(212) 555-0121", "Helios Financial", False, 5, SAM[0]),
    ("Dr. Grace Kim", "Chief Medical Officer", "grace@verdahealth.com", "(312) 555-0130", "Verda Health", True, 9, PRIYA[0]),
    ("Noah Ellis", "VP Operations", "noah@verdahealth.com", "(312) 555-0131", "Verda Health", False, 7, PRIYA[0]),
    ("Ivy Carter", "Head of Ecommerce", "ivy@brightline.shop", "(404) 555-0140", "Brightline Retail", True, 2, REP_EMAIL),
    ("Derek Stone", "VP Supply Chain", "derek@forgemfg.com", "(216) 555-0150", "Forge Manufacturing", True, 6, DANA[0]),
    ("Aisha Khan", "Plant Director", "aisha@forgemfg.com", "(216) 555-0151", "Forge Manufacturing", False, 16, DANA[0]),
    ("Marco Silva", "Chief Revenue Officer", "marco@pulsemedia.tv", "(310) 555-0160", "Pulse Media Group", True, 4, SAM[0]),
    ("Elena Voss", "Dean of Programs", "elena@atlasacademy.edu", "(617) 555-0170", "Atlas Academy", True, 11, REP_EMAIL),
    ("Ben Ortiz", "VP Grid Operations", "ben@voltaic.energy", "(503) 555-0180", "Voltaic Energy", True, 8, PRIYA[0]),
    ("Rina Das", "Sustainability Lead", "rina@voltaic.energy", "(503) 555-0181", "Voltaic Energy", False, 10, PRIYA[0]),
    ("Carl Hughes", "COO", "carl@cobaltlogistics.com", "(713) 555-0190", "Cobalt Logistics", True, 14, REP_EMAIL),
    ("Nadia Roy", "Founder & CEO", "nadia@lumenrobotics.ai", "(415) 555-0200", "Lumen Robotics", True, 12, DANA[0]),
    ("Owen Park", "VP Engineering", "owen@lumenrobotics.ai", "(415) 555-0201", "Lumen Robotics", False, 13, DANA[0]),
    ("Hannah Cole", "SVP Technology", "hannah@meridianbank.com", "(212) 555-0210", "Meridian Bank", True, 17, SAM[0]),
    ("Victor Nguyen", "Head of Digital", "victor@meridianbank.com", "(212) 555-0211", "Meridian Bank", False, 15, SAM[0]),
    ("Zoe Adams", "Founder", "zoe@tidepool.co", "(415) 555-0220", "Tidepool Co", True, 18, REP_EMAIL),
    ("Felix Wu", "Ops Manager", "felix@cobaltlogistics.com", "(713) 555-0191", "Cobalt Logistics", False, 19, REP_EMAIL),
]

# ── Leads: (full_name, company, email, phone, title, source, state, score, est_value, owner_name, owner_email) ──
LEADS = [
    ("Priya Anand", "Quill & Co", "priya@quill.example", "(206) 555-0301", "VP Sales", "Web", "new", 62, 45000.0, REP_NAME, REP_EMAIL),
    ("Marcus Hill", "Drift Studio", "marcus@drift.example", "(206) 555-0302", "Founder", "Referral", "working", 78, 80000.0, REP_NAME, REP_EMAIL),
    ("Lena Brooks", "Vector Freight", "lena@vector.example", "(305) 555-0303", "COO", "Event", "qualified", 88, 160000.0, REP_NAME, REP_EMAIL),
    ("Omar Farah", "Beacon Health", "omar@beacon.example", "(617) 555-0304", "CIO", "Outbound", "working", 71, 220000.0, REP_NAME, REP_EMAIL),
    ("Yuki Tanaka", "Nimbus AI", "yuki@nimbus.example", "(415) 555-0305", "CEO", "Partner", "new", 55, 90000.0, REP_NAME, REP_EMAIL),
    ("Greg Olsen", "Ironclad Mfg", "greg@ironclad.example", "(216) 555-0306", "VP Ops", "Ad", "unqualified", 30, 25000.0, "Sam Carter", SAM[0]),
    ("Hana Park", "Lumio Retail", "hana@lumio.example", "(404) 555-0307", "Head of Growth", "Web", "qualified", 84, 120000.0, "Sam Carter", SAM[0]),
    ("Diego Reyes", "Solaris Power", "diego@solaris.example", "(503) 555-0308", "Director", "Referral", "working", 69, 175000.0, "Priya Nair", PRIYA[0]),
    ("Amara Osei", "Civic Learning", "amara@civic.example", "(617) 555-0309", "President", "Event", "new", 47, 38000.0, "Priya Nair", PRIYA[0]),
    ("Theo Bauer", "Glide Media", "theo@glide.example", "(310) 555-0310", "CRO", "Outbound", "qualified", 81, 140000.0, "Dana Ruiz", DANA[0]),
    ("Mei Lin", "Crestwave", "mei@crestwave.example", "(415) 555-0311", "VP Finance", "Web", "new", 58, 67000.0, "Dana Ruiz", DANA[0]),
    ("Jonas Weber", "Apex Freight", "jonas@apex.example", "(713) 555-0312", "COO", "Partner", "converted", 92, 300000.0, REP_NAME, REP_EMAIL),
    ("Sara Cohen", "Brightpath Edu", "sara@brightpath.example", "(212) 555-0313", "Dean", "Ad", "working", 64, 52000.0, "Sam Carter", SAM[0]),
    ("Kofi Mensah", "Voltline Energy", "kofi@voltline.example", "(503) 555-0314", "VP Strategy", "Referral", "qualified", 86, 210000.0, "Priya Nair", PRIYA[0]),
]

# ── Deals: (name, account, contact, amount, stage, probability, close_off, owner_name, next_step, owner_email) ──
DEALS = [
    ("Northwind — Platform Expansion", "Northwind Labs", "Maya Chen", 145000.0, "Negotiation", 80, 12, REP_NAME, "Send redlined MSA to legal", REP_EMAIL),
    ("Brightline — DTC Analytics", "Brightline Retail", "Ivy Carter", 62000.0, "Proposal", 60, 20, REP_NAME, "Review proposal on Thu call", REP_EMAIL),
    ("Atlas — Pilot Program", "Atlas Academy", "Elena Voss", 28000.0, "Qualification", 40, 35, REP_NAME, "Confirm budget owner", REP_EMAIL),
    ("Cobalt — Routing Suite", "Cobalt Logistics", "Carl Hughes", 98000.0, "Prospecting", 20, 50, REP_NAME, "Book discovery call", REP_EMAIL),
    ("Northwind — ML Observability", "Northwind Labs", "Tom Becker", 210000.0, "Closed Won", 100, -8, REP_NAME, "Kickoff scheduled", REP_EMAIL),
    ("Tidepool — Renewal", "Tidepool Co", "Zoe Adams", 18000.0, "Closed Lost", 0, -15, REP_NAME, "Lost to incumbent", REP_EMAIL),
    ("Helios — Treasury Module", "Helios Financial", "Sofia Ramos", 480000.0, "Negotiation", 75, 18, "Sam Carter", "Final pricing review", SAM[0]),
    ("Helios — Risk Add-on", "Helios Financial", "Liam Patel", 120000.0, "Proposal", 55, 28, "Sam Carter", "Send security questionnaire", SAM[0]),
    ("Pulse — Live Events Platform", "Pulse Media Group", "Marco Silva", 260000.0, "Closed Won", 100, -22, "Sam Carter", "Onboarding in progress", SAM[0]),
    ("Meridian — Core Modernization", "Meridian Bank", "Hannah Cole", 420000.0, "Qualification", 35, 60, "Sam Carter", "Schedule technical deep-dive", SAM[0]),
    ("Verda — Care Network", "Verda Health", "Dr. Grace Kim", 175000.0, "Proposal", 60, 25, "Priya Nair", "Awaiting clinical sign-off", PRIYA[0]),
    ("Voltaic — Grid Analytics", "Voltaic Energy", "Ben Ortiz", 230000.0, "Negotiation", 70, 14, "Priya Nair", "Negotiate multi-year terms", PRIYA[0]),
    ("Voltaic — Storage Pilot", "Voltaic Energy", "Rina Das", 54000.0, "Closed Won", 100, -30, "Priya Nair", "Pilot live", PRIYA[0]),
    ("Forge — Supply Chain Suite", "Forge Manufacturing", "Derek Stone", 340000.0, "Prospecting", 15, 70, "Dana Ruiz", "Qualify executive sponsor", DANA[0]),
    ("Lumen — Robotics OS", "Lumen Robotics", "Nadia Roy", 88000.0, "Closed Won", 100, -3, "Dana Ruiz", "Expansion next quarter", DANA[0]),
    ("Lumen — Support Tier", "Lumen Robotics", "Owen Park", 22000.0, "Qualification", 45, 40, "Dana Ruiz", "Confirm SLA needs", DANA[0]),
]

# ── Activities: (subject, type, account, contact, deal, due_off, state, owner_name, notes, owner_email) ──
ACTIVITIES = [
    ("Discovery call with Maya", "Call", "Northwind Labs", "Maya Chen", "Northwind — Platform Expansion", 0, "open", REP_NAME, "Walk through expansion scope.", REP_EMAIL),
    ("Send proposal to Brightline", "Email", "Brightline Retail", "Ivy Carter", "Brightline — DTC Analytics", 0, "open", REP_NAME, "Attach v2 pricing.", REP_EMAIL),
    ("Demo prep — Cobalt", "Task", "Cobalt Logistics", "Carl Hughes", "Cobalt — Routing Suite", -1, "open", REP_NAME, "Overdue — reschedule discovery.", REP_EMAIL),
    ("Lunch with Atlas team", "Meeting", "Atlas Academy", "Elena Voss", "Atlas — Pilot Program", 2, "open", REP_NAME, "Confirm pilot success metrics.", REP_EMAIL),
    ("Follow up on MSA", "Call", "Northwind Labs", "Maya Chen", "Northwind — Platform Expansion", 3, "open", REP_NAME, "Legal turnaround ETA.", REP_EMAIL),
    ("Log: ML deal kickoff", "Note", "Northwind Labs", "Tom Becker", "Northwind — ML Observability", -8, "completed", REP_NAME, "Kickoff held, team aligned.", REP_EMAIL),
    ("Qualify Jonas (Apex)", "Call", "", "", "", -2, "completed", REP_NAME, "Converted to opportunity.", REP_EMAIL),
    ("Email recap to Tidepool", "Email", "Tidepool Co", "Zoe Adams", "Tidepool — Renewal", -12, "completed", REP_NAME, "Closed lost — incumbent renewal.", REP_EMAIL),
    ("Score new web leads", "Task", "", "", "", 0, "open", REP_NAME, "Triage 3 inbound leads today.", REP_EMAIL),
    ("Negotiation sync — Helios", "Meeting", "Helios Financial", "Sofia Ramos", "Helios — Treasury Module", 1, "open", "Sam Carter", "Align on contract terms.", SAM[0]),
    ("Security questionnaire", "Task", "Helios Financial", "Liam Patel", "Helios — Risk Add-on", 0, "open", "Sam Carter", "Due to InfoSec by EOD.", SAM[0]),
    ("Onboarding check-in — Pulse", "Call", "Pulse Media Group", "Marco Silva", "Pulse — Live Events Platform", 4, "open", "Sam Carter", "Confirm go-live date.", SAM[0]),
    ("Technical deep-dive — Meridian", "Meeting", "Meridian Bank", "Hannah Cole", "Meridian — Core Modernization", 6, "open", "Sam Carter", "Bring solutions architect.", SAM[0]),
    ("Clinical sign-off nudge", "Email", "Verda Health", "Dr. Grace Kim", "Verda — Care Network", 0, "open", "Priya Nair", "Follow up on proposal.", PRIYA[0]),
    ("Multi-year terms call", "Call", "Voltaic Energy", "Ben Ortiz", "Voltaic — Grid Analytics", 2, "open", "Priya Nair", "Discuss 3-year discount.", PRIYA[0]),
    ("Pilot retro — Voltaic", "Note", "Voltaic Energy", "Rina Das", "Voltaic — Storage Pilot", -5, "completed", "Priya Nair", "Storage pilot a success.", PRIYA[0]),
    ("Find exec sponsor — Forge", "Task", "Forge Manufacturing", "Derek Stone", "Forge — Supply Chain Suite", -1, "open", "Dana Ruiz", "Overdue — escalate.", DANA[0]),
    ("Expansion plan — Lumen", "Meeting", "Lumen Robotics", "Nadia Roy", "Lumen — Robotics OS", 5, "open", "Dana Ruiz", "Map Q3 expansion.", DANA[0]),
    ("SLA scoping — Lumen", "Call", "Lumen Robotics", "Owen Park", "Lumen — Support Tier", 1, "open", "Dana Ruiz", "Confirm support hours.", DANA[0]),
    ("Weekly pipeline review", "Meeting", "", "", "", 0, "open", REP_NAME, "Team pipeline standup.", REP_EMAIL),
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
        PolicyRule(entity="account", can_read=True, can_create=True, can_update=True),
        PolicyRule(entity="activity", can_read=True, can_create=True, can_update=True),
        PolicyRule(entity="contact", can_read=True, can_create=True, can_update=True),
        PolicyRule(entity="deal", can_read=True, can_create=True, can_update=True),
        PolicyRule(entity="lead", can_read=True, can_create=True, can_update=True),
    ]),  # manager sees ALL
    PolicyDef(role="tenant_user", default_access="none", rules=[
        # Rep can read all accounts & contacts (shared book of business).
        PolicyRule(entity="account", can_read=True),
        PolicyRule(entity="contact", can_read=True),
        # Owner-scoped CRUD on leads / deals / activities.
        PolicyRule(entity="lead", can_read=True, can_create=True, can_update=True,
                   filter_field="owner_username", filter_match="$user.name"),
        PolicyRule(entity="deal", can_read=True, can_create=True, can_update=True,
                   filter_field="owner_username", filter_match="$user.name"),
        PolicyRule(entity="activity", can_read=True, can_create=True, can_update=True,
                   filter_field="owner_username", filter_match="$user.name"),
    ]),
]


# ── Workflows ─────────────────────────────────────────────────────────────────
WORKFLOW_DEFINITIONS = [
    {
        # SAGA: when a deal hits Closed Won → mark account customer, email + slack #wins.
        # on_error=compensate reverts the account state if a downstream step fails.
        "workflow_id": "deal_won", "display_name": "Deal Won",
        "description": "Closes the loop on a won deal: flips the account to customer, emails the account and posts to #wins (saga — reverts the account state on failure).",
        "version": "1.0.0", "enabled": True, "status": "Active", "on_error": "compensate",
        "input_schema": {"deal_name": {"type": "string", "required": False},
                         "amount": {"type": "number", "required": False},
                         "account_uuid": {"type": "string", "required": False},
                         "account_email": {"type": "string", "required": False},
                         "deal_owner": {"type": "string", "required": False}},
        "steps": [
            {"id": "promote", "type": "crud_operation", "operation": "update", "object_type": "summit:account",
             "record_uuid": "{{input.account_uuid}}", "data": {"account_state": "customer"},
             "compensate": {"kind": "automatic", "type": "crud_operation", "operation": "update",
                            "object_type": "summit:account", "record_uuid": "{{input.account_uuid}}",
                            "data": {"account_state": "prospect"}}},
            {"id": "email", "type": "service_call", "service": "email", "operation": "send_email", "on_error": "continue",
             "input_map": {"to_email": "{{input.account_email}}",
                           "subject": "Welcome to the team — {{input.deal_name}} is closed!",
                           "body_html": "<p>Thrilled to have you on board! The {{input.deal_name}} deal is closed and your account is now active. Your team at Summit is ready to get you started.</p>"}},
            {"id": "slack", "type": "service_call", "service": "slack", "operation": "send_message", "on_error": "continue",
             "input_map": {"channel": "#wins",
                           "text": "🎉 Closed Won: {{input.deal_name}} for ${{input.amount}} — closed by {{input.deal_owner}}. Account promoted to customer!"}},
        ],
    },
    {
        # EVENT-BOUND @create:summit:lead → email the rep that a new lead was assigned.
        "workflow_id": "lead_created", "display_name": "New Lead Assigned",
        "description": "Emails the lead owner that a new lead has been assigned to them.",
        "version": "1.0.0", "enabled": True, "status": "Active", "on_error": "continue",
        "input_schema": {"owner_email": {"type": "string", "required": False},
                         "lead_name": {"type": "string", "required": False},
                         "company": {"type": "string", "required": False},
                         "est_value": {"type": "number", "required": False}},
        "steps": [
            {"id": "email", "type": "service_call", "service": "email", "operation": "send_email", "on_error": "continue",
             "input_map": {"to_email": "{{input.owner_email}}",
                           "subject": "New lead assigned: {{input.lead_name}} ({{input.company}})",
                           "body_html": "<p>A new lead has been assigned to you: <b>{{input.lead_name}}</b> at {{input.company}}, estimated value ${{input.est_value}}. Reach out while it's hot.</p>"}},
        ],
    },
    {
        # TRIGGERABLE: a follow-up nudge email on a deal.
        "workflow_id": "deal_followup", "display_name": "Deal Follow-up",
        "description": "Sends a follow-up email about a deal to a contact.",
        "version": "1.0.0", "enabled": True, "status": "Active", "on_error": "continue",
        "input_schema": {"to_email": {"type": "string", "required": False},
                         "deal_name": {"type": "string", "required": False},
                         "next_step": {"type": "string", "required": False},
                         "contact_name": {"type": "string", "required": False}},
        "steps": [
            {"id": "email", "type": "service_call", "service": "email", "operation": "send_email", "on_error": "continue",
             "input_map": {"to_email": "{{input.to_email}}",
                           "subject": "Following up on {{input.deal_name}}",
                           "body_html": "<p>Hi {{input.contact_name}},</p><p>Just following up on {{input.deal_name}}. Next step: {{input.next_step}}. Let me know a good time to connect.</p><p>— Summit CRM</p>"}},
        ],
    },
]

EVENT_BINDINGS = [
    {"event": "@create:summit:lead", "workflow_id": "lead_created",
     "input_map": {"owner_email": "owner_username", "lead_name": "full_name",
                   "company": "company", "est_value": "est_value"}},
]


def seed_test_data(s, base, domain, tenant_uuid, progress):
    na = 0
    for (name, ind, web, emp, rev, tier, region, owner, state, lidx, desc) in ACCOUNTS:
        rec = {"name": name, "industry": ind, "website": web, "employees": emp, "annual_revenue": rev,
               "tier": tier, "region": region, "account_owner": owner, "account_state": state,
               "logo": ux(LOGO_IDS[lidx % len(LOGO_IDS)]), "description": desc,
               "display_name": name}
        if seed_record(s, base, domain, "Account", rec, progress=progress, tenant_name="default-tenant"):
            na += 1
    progress.ok("Seeded %d Accounts." % na)

    nc = 0
    for (fn, title, email, phone, acct, prim, pidx, owner) in CONTACTS:
        rec = {"full_name": fn, "title": title, "email": email, "phone": phone, "account_name": acct,
               "is_primary": prim, "photo": ux(PHOTO_IDS[pidx % len(PHOTO_IDS)]), "owner_username": owner,
               "display_name": fn, "description": "%s · %s" % (title, acct)}
        if seed_record(s, base, domain, "Contact", rec, progress=progress, tenant_name="default-tenant"):
            nc += 1
    progress.ok("Seeded %d Contacts." % nc)

    nl = 0
    for (fn, comp, email, phone, title, src, state, score, est, owner, oemail) in LEADS:
        rec = {"full_name": fn, "company": comp, "email": email, "phone": phone, "title": title,
               "source": src, "lead_state": state, "score": score, "est_value": est,
               "lead_owner": owner, "owner_username": oemail,
               "display_name": "%s · %s" % (fn, comp), "description": "%s lead · %s" % (src, state)}
        if seed_record(s, base, domain, "Lead", rec, progress=progress, tenant_name="default-tenant"):
            nl += 1
    progress.ok("Seeded %d Leads." % nl)

    nd = 0
    for (name, acct, contact, amt, stage, prob, coff, owner, nxt, oemail) in DEALS:
        rec = {"deal_name": name, "account_name": acct, "contact_name": contact, "amount": amt,
               "deal_stage": stage, "probability": prob, "close_date": d(coff), "deal_owner": owner,
               "next_step": nxt, "owner_username": oemail,
               "display_name": name, "description": "%s · %s" % (acct, stage)}
        if seed_record(s, base, domain, "Deal", rec, progress=progress, tenant_name="default-tenant"):
            nd += 1
    progress.ok("Seeded %d Deals." % nd)

    nact = 0
    for (subj, atype, acct, contact, deal, doff, state, owner, notes, oemail) in ACTIVITIES:
        rec = {"subject": subj, "activity_type": atype, "account_name": acct, "contact_name": contact,
               "deal_name": deal, "due_date": d(doff), "activity_state": state, "activity_owner": owner,
               "notes": notes, "owner_username": oemail,
               "display_name": subj, "description": "%s · %s" % (atype, state)}
        if seed_record(s, base, domain, "Activity", rec, progress=progress, tenant_name="default-tenant"):
            nact += 1
    progress.ok("Seeded %d Activities." % nact)


def main():
    setup = AppSetup(AppConfig(), ALL_SCHEMAS, PUBLIC_SCHEMAS)
    setup.run(seed_fn=seed_test_data, policies=POLICIES,
              workflow_definitions=WORKFLOW_DEFINITIONS, event_bindings=EVENT_BINDINGS)


if __name__ == "__main__":
    main()
