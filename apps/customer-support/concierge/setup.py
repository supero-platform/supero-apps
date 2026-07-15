import sys, os, datetime
sys.path.insert(0, os.path.dirname(__file__))
from supero.app_setup import AppSetup, PolicyDef, PolicyRule, make_seed_record
from config import AppConfig
from schemas import ALL_SCHEMAS, PUBLIC_SCHEMAS, SUPERO_APP_NAMESPACE

seed_record = make_seed_record(SUPERO_APP_NAMESPACE)

CUSTOMER_EMAIL = "customer@concierge.support"
AGENT = "Sam Rivera"


def _now_iso():
    return datetime.datetime.utcnow().replace(microsecond=0).isoformat() + "Z"


def _ago(mins):
    return (datetime.datetime.utcnow() - datetime.timedelta(minutes=mins)).replace(microsecond=0).isoformat() + "Z"


# ── Knowledge base ──────────────────────────────────────────────────────────────
ARTICLES = [
    ("Getting Started", "Set up your workspace in 5 minutes",
     "A quick tour: create your workspace, invite teammates, and connect your first channel.",
     "Welcome! To set up your workspace, go to Settings → Workspace and choose a name and logo. "
     "Invite teammates from Settings → Members; each gets an email to set a password. Finally, connect "
     "a support channel (email, chat widget, WhatsApp or Slack) from Settings → Channels. You're ready "
     "to receive tickets in under five minutes.", "onboarding,setup,workspace", True, 4),
    ("Getting Started", "Install the chat widget on your website",
     "Copy one snippet into your site to start capturing chats and deflecting with the AI concierge.",
     "Add the chat widget by copying the snippet from Settings → Channels → Web Chat and pasting it before "
     "the closing </body> tag of your site. The widget loads asynchronously and won't slow your page. Once "
     "live, visitors can ask questions; the AI concierge answers from your knowledge base and creates a "
     "ticket only when a human is needed.", "widget,install,chat", True, 3),
    ("Billing & Plans", "Understand your plan and usage",
     "How seats, conversations and AI replies are counted, and where to see your usage.",
     "Your plan includes a number of agent seats and a monthly allowance of AI-resolved conversations. "
     "See live usage under Settings → Billing → Usage. AI deflections that fully resolve a question without "
     "an agent are counted separately from human conversations. You can upgrade at any time and changes are "
     "prorated.", "billing,usage,plan,seats", True, 5),
    ("Billing & Plans", "Update your payment method or download invoices",
     "Change your card, billing email, or grab a PDF invoice for accounting.",
     "Go to Settings → Billing → Payment to update your card or billing email. Past invoices are under "
     "Settings → Billing → Invoices, downloadable as PDF. If a charge fails we retry automatically over "
     "several days and email the billing contact before any interruption.", "billing,invoice,payment", False, 3),
    ("Account & Security", "Enable two-factor authentication",
     "Add a second layer of security to every agent login with TOTP 2FA.",
     "Protect your account by enabling 2FA under Settings → Security. Choose an authenticator app (TOTP), "
     "scan the QR code, and save your backup codes somewhere safe. Workspace owners can require 2FA for all "
     "members from the same screen.", "security,2fa,login", True, 4),
    ("Account & Security", "Reset your password",
     "Forgot your password? Reset it in a minute from the login screen.",
     "From the login screen choose 'Forgot password' and enter your email. You'll get a reset link valid for "
     "30 minutes. If you don't see it, check spam or confirm the email matches your account. Owners can also "
     "trigger a reset for any member from Settings → Members.", "password,reset,login", False, 2),
    ("Integrations", "Connect Slack for escalations",
     "Pipe high-priority tickets and escalations straight into a Slack channel.",
     "Connect Slack under Settings → Integrations → Slack and authorize the workspace. Choose a channel for "
     "escalations; when a ticket is marked high or urgent, or escalated from AI to a human, a rich message "
     "posts to that channel with the customer, subject and a deep link.", "slack,integration,escalation", True, 3),
    ("Integrations", "Sync your knowledge base from existing docs",
     "Import help docs from a URL, sitemap or CSV so the AI concierge can answer from them.",
     "Use Settings → Knowledge → Import to pull articles from a public docs URL, a sitemap, or a CSV export. "
     "Imported articles are indexed and immediately available to the AI concierge. Re-run the import any time "
     "to refresh; unchanged articles are skipped.", "knowledge,import,connector,docs", False, 4),
    ("Troubleshooting", "The chat widget isn't appearing",
     "Most widget issues come down to the snippet placement or a content-security policy.",
     "If the widget doesn't show: confirm the snippet is before </body>, check the browser console for blocked "
     "scripts, and ensure your Content-Security-Policy allows our domain. Hard-refresh to clear a cached page. "
     "If it still fails, the workspace key in the snippet may be wrong — re-copy it from Settings → Channels.",
     "widget,troubleshoot,csp", False, 4),
    ("Troubleshooting", "AI answers seem out of date",
     "Refresh your knowledge base so the concierge answers from the latest content.",
     "The AI concierge answers from your published knowledge base. If answers seem stale, re-publish the "
     "affected articles or re-run your knowledge import. Drafts are never used. Changes are reflected within a "
     "minute of publishing.", "ai,knowledge,stale,refresh", False, 3),
    ("API & Developers", "Authenticate with the REST API",
     "Create an API key and make your first authenticated request.",
     "Generate an API key under Settings → Developers → API Keys. Pass it as a Bearer token in the "
     "Authorization header. Keys are scoped to your workspace and can be revoked any time. Rate limits apply "
     "per key; see the response headers for your remaining quota.", "api,auth,developers,key", True, 5),
    ("API & Developers", "Subscribe to webhooks for ticket events",
     "Get notified in real time when tickets are created, updated or resolved.",
     "Register a webhook endpoint under Settings → Developers → Webhooks and choose the events you care about "
     "(ticket.created, ticket.updated, ticket.resolved, csat.received). We sign each payload so you can verify "
     "authenticity, and retry with backoff on failure.", "api,webhooks,events,developers", False, 4),
]

# ── Tickets owned by the demo customer (subject, channel, priority, state, category, ai_handled, csat, msgs) ──
# msgs: list of (sender, sender_name, body, mins_ago)
TICKETS = [
    ("How do I add a teammate to my workspace?", "chat", "normal", "resolved", "Getting Started", True, 5,
     [("customer", "Jordan Lee", "Hi! How do I add a teammate to my workspace?", 120),
      ("ai", "Concierge AI", "You can invite teammates from Settings → Members — each gets an email to set their password. Want me to walk you through it?", 119),
      ("customer", "Jordan Lee", "Got it, found it. Thanks!", 118)]),
    ("Invoice for March is missing", "email", "normal", "pending", "Billing & Plans", False, None,
     [("customer", "Jordan Lee", "I can't find my March invoice for accounting.", 60),
      ("ai", "Concierge AI", "Invoices live under Settings → Billing → Invoices as downloadable PDFs. If March isn't listed, an agent will take a look.", 59),
      ("agent", AGENT, "Hi Jordan — I see March generated late; I've emailed you the PDF and it's now in your invoices list.", 40)]),
    ("Widget not showing on our site", "chat", "high", "open", "Troubleshooting", False, None,
     [("customer", "Jordan Lee", "The chat widget stopped appearing after our site redeploy.", 25),
      ("ai", "Concierge AI", "That's usually snippet placement or a CSP rule. I'm escalating to a specialist who can check your setup.", 24)]),
    ("Enable 2FA for all members?", "slack", "normal", "resolved", "Account & Security", True, 4,
     [("customer", "Jordan Lee", "Can I require 2FA for everyone on the team?", 200),
      ("ai", "Concierge AI", "Yes — workspace owners can require 2FA for all members under Settings → Security. Toggle 'Require 2FA' and members are prompted at next login.", 199)]),
    ("Upgrade to add more AI conversations", "email", "low", "closed", "Billing & Plans", True, 5,
     [("customer", "Jordan Lee", "We're hitting our AI conversation limit — how do we add more?", 1440),
      ("ai", "Concierge AI", "You can upgrade any time under Settings → Billing; changes are prorated and your AI allowance increases immediately.", 1439)]),
    ("How to import our existing help docs", "chat", "normal", "open", "Integrations", True, None,
     [("customer", "Jordan Lee", "We have ~80 help articles on another site. Can the AI use them?", 15),
      ("ai", "Concierge AI", "Absolutely — use Settings → Knowledge → Import to pull from a URL, sitemap or CSV. Imported articles are indexed for the concierge right away.", 14)]),
    ("API key returns 401", "email", "high", "pending", "API & Developers", False, None,
     [("customer", "Jordan Lee", "My API requests return 401 even with the key in the header.", 90),
      ("ai", "Concierge AI", "A 401 usually means the key is malformed or revoked. Make sure it's sent as 'Authorization: Bearer <key>'. I've looped in a developer to confirm your key status.", 89)]),
]

MACROS = [
    ("Greeting", "Hi there — thanks for reaching out! I'd be happy to help. Could you share a few more details so I can get this sorted quickly?", "Getting Started"),
    ("Invoice resent", "I've re-sent the invoice to your billing email and it's now available under Settings → Billing → Invoices as a PDF. Let me know if you need anything else!", "Billing & Plans"),
    ("Widget fix steps", "Let's get the widget back: 1) confirm the snippet sits before </body>, 2) check the console for blocked scripts, 3) allow our domain in your CSP. Hard-refresh after. Tell me what you see!", "Troubleshooting"),
    ("Escalation ack", "Thanks for your patience — I've escalated this to a specialist who'll follow up shortly with a fix. You'll get an update right here.", "Troubleshooting"),
    ("Resolved close", "Glad that's sorted! I'll close this ticket now — reply any time to reopen it. A quick rating helps us improve. 🙏", "Getting Started"),
]


# ── Workflows (rich, service-backed) ────────────────────────────────────────────
WORKFLOW_DEFINITIONS = [
    {
        "workflow_id": "ticket_acknowledgement",
        "display_name": "Ticket Acknowledgement",
        "description": "Emails the customer to confirm we received their ticket, the moment it's created.",
        "version": "1.0.0", "enabled": True, "status": "Active", "on_error": "continue",
        "input_schema": {
            "ticket_uuid": {"type": "string", "required": False},
            "subject": {"type": "string", "required": False},
            "customer_email": {"type": "string", "required": False},
            "customer_name": {"type": "string", "required": False},
        },
        "steps": [
            {"id": "email", "type": "service_call", "service": "email", "operation": "send_email", "on_error": "continue",
             "input_map": {"to_email": "{{input.customer_email}}",
                           "subject": "We received your request: {{input.subject}}",
                           "body_html": "<p>Hi {{input.customer_name}},</p><p>Thanks for reaching out — we've opened a ticket and a specialist will follow up shortly. In the meantime our AI concierge can answer most questions instantly.</p><p>— The Concierge team</p>"}},
        ],
    },
    {
        "workflow_id": "ticket_escalation",
        "display_name": "Escalate to Slack",
        "description": "Posts a high-priority ticket into the support Slack channel and reassures the customer by email.",
        "version": "1.0.0", "enabled": True, "status": "Active", "on_error": "continue",
        "input_schema": {
            "subject": {"type": "string", "required": False},
            "customer_email": {"type": "string", "required": False},
            "priority": {"type": "string", "required": False},
        },
        "steps": [
            {"id": "slack", "type": "service_call", "service": "slack", "operation": "send_message", "on_error": "continue",
             "input_map": {"channel": "#support",
                           "text": "🚨 Escalated ticket — *{{input.subject}}* (priority {{input.priority}}) from {{input.customer_email}}"}},
            {"id": "email", "type": "service_call", "service": "email", "operation": "send_email", "on_error": "continue",
             "input_map": {"to_email": "{{input.customer_email}}",
                           "subject": "Your ticket has been escalated",
                           "body_html": "<p>We've escalated your request to a specialist who will follow up shortly. Thanks for your patience!</p>"}},
        ],
    },
    {
        "workflow_id": "csat_request",
        "display_name": "Request CSAT",
        "description": "Emails a satisfaction-rating request when a ticket is resolved.",
        "version": "1.0.0", "enabled": True, "status": "Active", "on_error": "continue",
        "input_schema": {
            "customer_email": {"type": "string", "required": False},
            "subject": {"type": "string", "required": False},
        },
        "steps": [
            {"id": "email", "type": "service_call", "service": "email", "operation": "send_email", "on_error": "continue",
             "input_map": {"to_email": "{{input.customer_email}}",
                           "subject": "How did we do? — {{input.subject}}",
                           "body_html": "<p>Your ticket is resolved. We'd love a quick rating (1–5 ★) so we can keep improving. Just reply to this email.</p>"}},
        ],
    },
]

# Auto-fire: acknowledge every new ticket by email.
EVENT_BINDINGS = [
    {
        "event": "@create:concierge:ticket",
        "workflow_id": "ticket_acknowledgement",
        "input_map": {
            "ticket_uuid": "uuid",
            "subject": "subject",
            "customer_email": "customer_email",
            "customer_name": "customer_name",
        },
    },
]


POLICIES = [
    PolicyDef(role="tenant_admin", default_access="full", rules=[]),
    PolicyDef(role="tenant_user", default_access="none", rules=[
        PolicyRule(entity="article", can_read=True),
        PolicyRule(entity="ticket", can_read=True, can_create=True, can_update=True,
                   filter_field="owner_username", filter_match="$user.name"),
        PolicyRule(entity="message", can_read=True, can_create=True,
                   filter_field="owner_username", filter_match="$user.name"),
        PolicyRule(entity="macro", can_read=True),
    ]),
]


def seed_test_data(s, base, domain, tenant_uuid, progress):
    n = 0
    for i, a in enumerate(ARTICLES):
        cat, title, summary, body, tags, feat, mins = a
        rec = {"title": title, "category": cat, "summary": summary, "body": body, "tags": tags,
               "helpful_count": 12 + (i * 7) % 80, "read_minutes": mins, "featured": feat, "sort_order": i,
               "display_name": title, "description": summary}
        if seed_record(s, base, domain, "Article", rec, progress=progress, tenant_name="default-tenant"):
            n += 1
    progress.ok("Seeded %d Articles." % n)

    nt = 0
    for i, t in enumerate(TICKETS):
        subj, channel, prio, state, cat, ai_h, csat, msgs = t
        num = "CT-%05d" % (2000 + i)
        rec = {"subject": subj, "customer_name": "Jordan Lee", "customer_email": CUSTOMER_EMAIL,
               "channel": channel, "priority": prio, "ticket_state": state, "category": cat,
               "assignee": AGENT if state in ("pending", "resolved", "closed") else "", "ai_handled": ai_h,
               "last_message": msgs[-1][2] if msgs else "", "owner_username": CUSTOMER_EMAIL,
               "first_response_at": _ago(msgs[1][3]) if len(msgs) > 1 else _now_iso(),
               "display_name": subj, "description": "%s · %s" % (cat, channel)}
        if csat is not None:
            rec["csat"] = csat
        if state in ("resolved", "closed"):
            rec["resolved_at"] = _ago(msgs[-1][3])
        tuid = seed_record(s, base, domain, "Ticket", rec, progress=progress, tenant_name="default-tenant")
        if not tuid:
            continue
        nt += 1
        for (sender, sname, body, mins) in msgs:
            m = {"body": body, "sender": sender, "sender_name": sname, "owner_username": CUSTOMER_EMAIL,
                 "display_name": (sname + ": " + body)[:60], "description": sender,
                 "parent_type": "ticket", "parent_uuid": tuid}
            seed_record(s, base, domain, "Message", m, progress=progress, tenant_name="default-tenant")
    progress.ok("Seeded %d Tickets (+messages)." % nt)

    nm = 0
    for i, mac in enumerate(MACROS):
        title, body, cat = mac
        rec = {"title": title, "body": body, "category": cat, "sort_order": i,
               "display_name": title, "description": cat}
        if seed_record(s, base, domain, "Macro", rec, progress=progress, tenant_name="default-tenant"):
            nm += 1
    progress.ok("Seeded %d Macros." % nm)


def main():
    setup = AppSetup(AppConfig(), ALL_SCHEMAS, PUBLIC_SCHEMAS)
    setup.run(seed_fn=seed_test_data, policies=POLICIES,
              workflow_definitions=WORKFLOW_DEFINITIONS, event_bindings=EVENT_BINDINGS)


if __name__ == "__main__":
    main()
