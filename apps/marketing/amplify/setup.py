import sys, os, datetime
sys.path.insert(0, os.path.dirname(__file__))
from supero.app_setup import AppSetup, PolicyDef, PolicyRule, make_seed_record
from config import AppConfig
from schemas import ALL_SCHEMAS, PUBLIC_SCHEMAS, SUPERO_APP_NAMESPACE

seed_record = make_seed_record(SUPERO_APP_NAMESPACE)
MARKETER = "marketer@amplify.app"     # the demo customer; owns the Supero workspace's data
SUPERO_WS = "Supero"


def ux(pid, w=1000):
    b = "https://images.unsplash.com/photo-" + pid + "?auto=format&fit=crop&q=80"
    return {"url": "%s&w=%d&h=%d" % (b, w, int(w * 0.66)), "thumbnail_url": "%s&w=500&h=330" % b}


def d(off):
    return (datetime.date.today() + datetime.timedelta(days=off)).isoformat()


def dtt(off_days, hour=10, minute=0):
    base = datetime.datetime.utcnow() + datetime.timedelta(days=off_days)
    return base.replace(hour=hour, minute=minute, second=0, microsecond=0).isoformat() + "Z"


# ── Plans (public pricing tiers) ─────────────────────────────────────────────
# (name, tier, price_monthly, included_posts, included_channels, features, popular)
PLANS = [
    ("Free", "Free", 0.0, 10, 2,
     "2 channels · 10 posts / mo · basic analytics · 1 seat", False),
    ("Starter", "Starter", 29.0, 100, 5,
     "5 channels · 100 posts / mo · AI caption assistant · scheduling calendar · 3 seats", False),
    ("Growth", "Growth", 99.0, 500, 12,
     "12 channels · 500 posts / mo · AI content studio · campaign analytics · approvals · 10 seats", True),
    ("Agency", "Agency", 299.0, 5000, 50,
     "50 channels · unlimited posts · multi-workspace · white-label reports · API · priority support", False),
]

# ── Workspaces (customer companies) ──────────────────────────────────────────
# (name, industry, plan, owner_email, state, mrr, channels_connected, signup_off, owner_username)
WORKSPACES = [
    (SUPERO_WS, "Developer Tools", "Growth", MARKETER, "active", 99.0, 5, -120, MARKETER),
    ("Lumière Skincare", "DTC / Beauty", "Starter", "social@lumiere.example", "active", 29.0, 4, -210, "social@lumiere.example"),
    ("Northwind Agency", "Marketing Agency", "Agency", "ops@northwind.example", "active", 299.0, 9, -340, "ops@northwind.example"),
    ("Tidepool SaaS", "B2B SaaS", "Growth", "growth@tidepool.example", "trial", 0.0, 3, -14, "growth@tidepool.example"),
    ("Casa Verde Restaurants", "Restaurant Group", "Starter", "marketing@casaverde.example", "past_due", 29.0, 3, -95, "marketing@casaverde.example"),
    ("Bright Futures Fund", "Nonprofit", "Free", "comms@brightfutures.example", "churned", 0.0, 2, -260, "comms@brightfutures.example"),
]

# ── Channels (~10) ───────────────────────────────────────────────────────────
# (platform, handle, workspace, state, followers, owner_username)
CHANNELS = [
    ("LinkedIn", "supero-platform", SUPERO_WS, "connected", 18400, MARKETER),
    ("X", "@superodev", SUPERO_WS, "connected", 12700, MARKETER),
    ("Instagram", "@supero.dev", SUPERO_WS, "connected", 8200, MARKETER),
    ("YouTube", "Supero", SUPERO_WS, "connected", 5400, MARKETER),
    ("Google Ads", "Supero — Search", SUPERO_WS, "error", 0, MARKETER),
    ("Instagram", "@lumiere.skincare", "Lumière Skincare", "connected", 64200, "social@lumiere.example"),
    ("TikTok", "@lumiereglow", "Lumière Skincare", "connected", 121000, "social@lumiere.example"),
    ("LinkedIn", "northwind-agency", "Northwind Agency", "connected", 9300, "ops@northwind.example"),
    ("Facebook", "Casa Verde", "Casa Verde Restaurants", "disconnected", 15600, "marketing@casaverde.example"),
    ("WhatsApp", "+1 555 0142", "Tidepool SaaS", "connected", 0, "growth@tidepool.example"),
]

# ── Campaigns (~8) ───────────────────────────────────────────────────────────
# (name, workspace, objective, state, budget, spend, start_off, end_off, channels, owner_username)
CAMPAIGNS = [
    ("Launch: AI App Builder", SUPERO_WS, "Awareness", "active", 12000.0, 6840.0, -21, 21,
     "LinkedIn, X, YouTube", MARKETER),
    ("Developer Sign-ups Q3", SUPERO_WS, "Leads", "active", 8000.0, 3120.0, -10, 35,
     "LinkedIn, Google Ads", MARKETER),
    ("Supero Community AMA", SUPERO_WS, "Engagement", "scheduled", 1500.0, 0.0, 4, 18,
     "X, Instagram", MARKETER),
    ("Glow Drop — Summer", "Lumière Skincare", "Sales", "active", 9000.0, 5230.0, -14, 16,
     "Instagram, TikTok", "social@lumiere.example"),
    ("Holiday Gift Guide", "Northwind Agency", "Traffic", "completed", 15000.0, 14820.0, -60, -5,
     "Instagram, Facebook, LinkedIn", "ops@northwind.example"),
    ("Free Trial Push", "Tidepool SaaS", "App Installs", "draft", 5000.0, 0.0, 7, 45,
     "LinkedIn, X", "growth@tidepool.example"),
    ("Taco Tuesday Local", "Casa Verde Restaurants", "Engagement", "paused", 1200.0, 640.0, -30, 5,
     "Facebook, Instagram", "marketing@casaverde.example"),
    ("Year-End Giving", "Bright Futures Fund", "Awareness", "completed", 3000.0, 2980.0, -120, -30,
     "Facebook, Instagram", "comms@brightfutures.example"),
]

# ── Posts (~16) ──────────────────────────────────────────────────────────────
# (caption, platform, campaign, state, sched_off, pub_off, img, reach, clicks, eng, likes, owner)
POSTS = [
    ("Build a full-stack app from a single prompt. Supero turns your idea into a deployed, multi-tenant app — schemas, auth, workflows and UI included. 🚀 #AIAppBuilder",
     "LinkedIn", "Launch: AI App Builder", "published", -18, -18, "1531297484001-80022131f5a1", 41200, 1840, 3120, 2210, MARKETER),
    ("We just shipped the AI App Builder. Describe what you want → get a live app. No boilerplate, no DevOps. Try it free 👇",
     "X", "Launch: AI App Builder", "published", -15, -15, "1517292987719-0369a794ec0f", 28700, 2240, 1980, 1450, MARKETER),
    ("Watch us go from prompt to production in under 4 minutes. New on the Supero channel ▶️",
     "YouTube", "Launch: AI App Builder", "published", -9, -9, "1611162617213-7d7a39e9b1d7", 12400, 980, 1120, 860, MARKETER),
    ("Behind the scenes: how deterministic generation keeps your generated apps stable across regenerations. Thread 🧵",
     "X", "Launch: AI App Builder", "scheduled", 2, None, "1542435503-956c469947f6", 0, 0, 0, 0, MARKETER),
    ("Ship internal tools your whole team actually uses. Supero handles RBAC, audit and multi-tenant out of the box.",
     "LinkedIn", "Developer Sign-ups Q3", "published", -8, -8, "1460925895917-afdab827c52f", 22100, 1510, 1340, 990, MARKETER),
    ("Free tier, real apps. Sign up and deploy your first Supero app today — no credit card.",
     "Google Ads", "Developer Sign-ups Q3", "published", -6, -6, "1551434678-e076c223a692", 88400, 3120, 2200, 0, MARKETER),
    ("Draft: 5 apps our community built in a weekend. Which one should we feature?",
     "LinkedIn", "Developer Sign-ups Q3", "draft", None, None, "1556761175-5973dc0f32e7", 0, 0, 0, 0, MARKETER),
    ("Join our live AMA next week — bring your hardest 'can the platform do X?' questions. RSVP in bio.",
     "Instagram", "Supero Community AMA", "scheduled", 5, None, "1543269865-cbf427effbad", 0, 0, 0, 0, MARKETER),
    ("Ask us anything: scaling, schemas, workflows, pricing. Live Thursday 11am PT. 🎙️",
     "X", "Supero Community AMA", "draft", None, None, "1556157382-97eda2d62296", 0, 0, 0, 0, MARKETER),
    ("Your summer glow, bottled. ☀️ The new Glow Drop serum is here — 24% off launch week only.",
     "Instagram", "Glow Drop — Summer", "published", -12, -12, "1556228578-8c89e6adf883", 96300, 4120, 8800, 7240, "social@lumiere.example"),
    ("POV: your skin after one week of Glow Drop ✨ #skintok",
     "TikTok", "Glow Drop — Summer", "published", -7, -7, "1522335789203-aabd1fc54bc9", 412000, 9800, 38400, 31200, "social@lumiere.example"),
    ("Restock alert 🔔 Glow Drop is back in stock. Tap to shop before it's gone again.",
     "Instagram", "Glow Drop — Summer", "scheduled", 3, None, "1571781926291-c477ebfd024b", 0, 0, 0, 0, "social@lumiere.example"),
    ("The holiday gift guide your customers will actually thank you for. Swipe ➡️",
     "Instagram", "Holiday Gift Guide", "published", -45, -45, "1513885535751-8b9238bd345a", 54200, 2210, 4400, 3600, "ops@northwind.example"),
    ("Last-minute gifts, sorted. Free shipping through Sunday. 🎁",
     "Facebook", "Holiday Gift Guide", "published", -20, -20, "1607083206869-4c7672e72a8a", 38900, 1840, 2100, 1500, "ops@northwind.example"),
    ("Taco Tuesday just got better — 2-for-1 all night at every Casa Verde. 🌮",
     "Facebook", "Taco Tuesday Local", "published", -14, -14, "1565299624946-b28f40a0ae38", 12600, 540, 980, 760, "marketing@casaverde.example"),
    ("This week we sent 240 kids back to school with supplies — thanks to you. ❤️ Donate to keep it going.",
     "Facebook", "Year-End Giving", "published", -90, -90, "1497486751825-1233686d5d80", 9800, 410, 1240, 1080, "comms@brightfutures.example"),
]


POLICIES = [
    PolicyDef(role="tenant_admin", default_access="full", rules=[]),
    PolicyDef(role="tenant_user", default_access="none", rules=[
        PolicyRule(entity="plan", can_read=True),
        # customer reads their own workspace (owner-scoped)
        PolicyRule(entity="workspace", can_read=True,
                   filter_field="owner_username", filter_match="$user.name"),
        # owner-scoped CRUD on the core product objects
        PolicyRule(entity="channel", can_read=True, can_create=True, can_update=True,
                   filter_field="owner_username", filter_match="$user.name"),
        PolicyRule(entity="campaign", can_read=True, can_create=True, can_update=True,
                   filter_field="owner_username", filter_match="$user.name"),
        PolicyRule(entity="post", can_read=True, can_create=True, can_update=True,
                   filter_field="owner_username", filter_match="$user.name"),
    ]),
]


# ── Workflows ────────────────────────────────────────────────────────────────
WORKFLOW_DEFINITIONS = [
    {
        # SAGA — publishing a post: flip to published + stamp + (simulated) social notify + record metrics.
        # If a later step fails, the compensate reverts the post back to "scheduled".
        "workflow_id": "post_publish", "display_name": "Publish Post",
        "description": "Publishes a scheduled post (saga): marks published, notifies, records metrics; reverts to scheduled on error.",
        "version": "1.0.0", "enabled": True, "status": "Active", "on_error": "compensate",
        "input_schema": {"post_uuid": {"type": "string", "required": True},
                         "owner_email": {"type": "string", "required": False},
                         "platform": {"type": "string", "required": False},
                         "campaign_name": {"type": "string", "required": False},
                         "reach": {"type": "number", "required": False},
                         "clicks": {"type": "number", "required": False},
                         "engagement": {"type": "number", "required": False},
                         "likes": {"type": "number", "required": False}},
        "steps": [
            {"id": "publish", "type": "crud_operation", "operation": "update", "object_type": "amplify:post",
             "record_uuid": "{{input.post_uuid}}",
             "data": {"post_state": "published", "published_at": "{{context.timestamp}}"},
             "compensate": {"kind": "automatic", "type": "crud_operation", "operation": "update",
                            "object_type": "amplify:post", "record_uuid": "{{input.post_uuid}}",
                            "data": {"post_state": "scheduled"}}},
            {"id": "notify", "type": "service_call", "service": "email", "operation": "send_email", "on_error": "continue",
             "input_map": {"to_email": "{{input.owner_email}}",
                           "subject": "Your {{input.platform}} post is live",
                           "body_html": "<p>Your post for campaign \"{{input.campaign_name}}\" was just published to {{input.platform}}. Early reach: {{input.reach}}. Track performance in your Amplify dashboard.</p>"}},
            {"id": "metrics", "type": "crud_operation", "operation": "update", "object_type": "amplify:post",
             "record_uuid": "{{input.post_uuid}}",
             "data": {"reach": "{{input.reach}}", "clicks": "{{input.clicks}}",
                      "engagement": "{{input.engagement}}", "likes": "{{input.likes}}"}},
        ],
    },
    {
        # EVENT-BOUND @create:amplify:campaign — email + slack notify on a new campaign.
        "workflow_id": "campaign_launch", "display_name": "Campaign Launch",
        "description": "Notifies the team by email + Slack when a campaign is created.",
        "version": "1.0.0", "enabled": True, "status": "Active", "on_error": "continue",
        "input_schema": {"name": {"type": "string", "required": False},
                         "workspace_name": {"type": "string", "required": False},
                         "objective": {"type": "string", "required": False},
                         "owner_email": {"type": "string", "required": False}},
        "steps": [
            {"id": "email", "type": "service_call", "service": "email", "operation": "send_email", "on_error": "continue",
             "input_map": {"to_email": "{{input.owner_email}}",
                           "subject": "Campaign launched: {{input.name}}",
                           "body_html": "<p>Your campaign \"{{input.name}}\" ({{input.objective}}) for {{input.workspace_name}} is set up in Amplify. Add posts and schedule them to go live.</p>"}},
            {"id": "slack", "type": "service_call", "service": "slack", "operation": "send_message", "on_error": "continue",
             "input_map": {"channel": "#campaigns",
                           "text": "🚀 New campaign *{{input.name}}* ({{input.objective}}) launched for {{input.workspace_name}}."}},
        ],
    },
    {
        # EVENT-BOUND @create:amplify:workspace — welcome email to a new customer.
        "workflow_id": "workspace_welcome", "display_name": "Workspace Welcome",
        "description": "Emails a welcome to a newly-created customer workspace.",
        "version": "1.0.0", "enabled": True, "status": "Active", "on_error": "continue",
        "input_schema": {"name": {"type": "string", "required": False},
                         "owner_email": {"type": "string", "required": False},
                         "plan_name": {"type": "string", "required": False}},
        "steps": [
            {"id": "email", "type": "service_call", "service": "email", "operation": "send_email", "on_error": "continue",
             "input_map": {"to_email": "{{input.owner_email}}",
                           "subject": "Welcome to Amplify, {{input.name}}!",
                           "body_html": "<p>Welcome to Amplify, {{input.name}}! Your {{input.plan_name}} workspace is ready. Connect your social channels, create your first campaign, and launch everywhere from one place. 🚀</p>"}},
        ],
    },
]

EVENT_BINDINGS = [
    {"event": "@create:amplify:campaign", "workflow_id": "campaign_launch",
     "input_map": {"name": "name", "workspace_name": "workspace_name",
                   "objective": "objective", "owner_email": "owner_username"}},
    {"event": "@create:amplify:workspace", "workflow_id": "workspace_welcome",
     "input_map": {"name": "name", "owner_email": "owner_email", "plan_name": "plan_name"}},
]


def seed_test_data(s, base, domain, tenant_uuid, progress):
    # Plans
    n = 0
    for i, p in enumerate(PLANS):
        name, tier, pm, posts, chans, feats, pop = p
        rec = {"name": name, "tier": tier, "price_monthly": pm, "included_posts": posts,
               "included_channels": chans, "features": feats, "popular": pop, "sort_order": i,
               "display_name": name, "description": "%s · $%g/mo" % (tier, pm)}
        if seed_record(s, base, domain, "Plan", rec, progress=progress, tenant_name="default-tenant"):
            n += 1
    progress.ok("Seeded %d Plans." % n)

    # Workspaces
    nw = 0
    for (name, ind, plan, oemail, state, mrr, chans, soff, owner) in WORKSPACES:
        rec = {"name": name, "industry": ind, "plan_name": plan, "owner_email": oemail,
               "workspace_state": state, "mrr": mrr, "channels_connected": chans,
               "signup_date": d(soff), "owner_username": owner,
               "display_name": name, "description": "%s · %s · %s" % (ind, plan, state)}
        if seed_record(s, base, domain, "Workspace", rec, progress=progress, tenant_name="default-tenant"):
            nw += 1
    progress.ok("Seeded %d Workspaces." % nw)

    # Channels
    nc = 0
    for (plat, handle, ws, state, followers, owner) in CHANNELS:
        rec = {"platform": plat, "handle": handle, "workspace_name": ws, "channel_state": state,
               "followers": followers, "owner_username": owner,
               "display_name": "%s · %s" % (plat, handle), "description": "%s · %s" % (ws, state)}
        if seed_record(s, base, domain, "Channel", rec, progress=progress, tenant_name="default-tenant"):
            nc += 1
    progress.ok("Seeded %d Channels." % nc)

    # Campaigns
    ncam = 0
    for (name, ws, obj, state, budget, spend, soff, eoff, chans, owner) in CAMPAIGNS:
        rec = {"name": name, "workspace_name": ws, "objective": obj, "campaign_state": state,
               "budget": budget, "spend": spend, "start_date": d(soff), "end_date": d(eoff),
               "channels": chans, "owner_username": owner,
               "display_name": name, "description": "%s · %s · %s" % (ws, obj, state)}
        if seed_record(s, base, domain, "Campaign", rec, progress=progress, tenant_name="default-tenant"):
            ncam += 1
    progress.ok("Seeded %d Campaigns." % ncam)

    # Posts
    np = 0
    for (cap, plat, camp, state, soff, poff, img, reach, clicks, eng, likes, owner) in POSTS:
        rec = {"caption": cap, "platform": plat, "campaign_name": camp, "post_state": state,
               "image": ux(img), "reach": reach, "clicks": clicks, "engagement": eng, "likes": likes,
               "owner_username": owner,
               "display_name": (cap[:48] + "…") if len(cap) > 49 else cap,
               "description": "%s · %s" % (plat, camp)}
        if soff is not None:
            rec["scheduled_at"] = dtt(soff, 9 + (np % 8))
        if poff is not None:
            rec["published_at"] = dtt(poff, 9 + (np % 8))
        if seed_record(s, base, domain, "Post", rec, progress=progress, tenant_name="default-tenant"):
            np += 1
    progress.ok("Seeded %d Posts." % np)


def main():
    setup = AppSetup(AppConfig(), ALL_SCHEMAS, PUBLIC_SCHEMAS)
    setup.run(seed_fn=seed_test_data, policies=POLICIES,
              workflow_definitions=WORKFLOW_DEFINITIONS, event_bindings=EVENT_BINDINGS)


if __name__ == "__main__":
    main()
