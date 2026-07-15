# schemas.py — data model for Concierge AI (AI-first customer support platform)
#
# Plain-CRUD pattern: KB articles are public; tickets are owner-scoped support
# conversations with a renamed `ticket_state` enum (NOT `status`); messages are
# children of a ticket. The AI concierge answers from the KB via services.ai and
# agents get AI-suggested replies — all client-side calls to the locked services.*.

NS = "concierge"

KB_CATEGORIES = ["Getting Started", "Billing & Plans", "Account & Security",
                 "Integrations", "Troubleshooting", "API & Developers"]
CHANNELS = ["chat", "email", "whatsapp", "slack"]
PRIORITIES = ["low", "normal", "high", "urgent"]

# A public knowledge-base article. PUBLIC — the help center is open to everyone and
# the AI concierge answers grounded in these.
Article = {
    "schema_type": "object",
    "name": "Article",
    "namespace": "concierge",
    "parent_type": "tenant",
    "description": "A public knowledge-base help article the AI concierge uses to answer customer questions.",
    "attributes": [
        {"name": "title", "type": "string", "mandatory": True},
        {"name": "category", "type": "string", "values": KB_CATEGORIES},
        {"name": "summary", "type": "text"},
        {"name": "body", "type": "text", "mandatory": True},
        {"name": "tags", "type": "string"},
        {"name": "helpful_count", "type": "integer"},
        {"name": "read_minutes", "type": "integer"},
        {"name": "featured", "type": "boolean"},
        {"name": "sort_order", "type": "integer"},
    ],
}

# A support ticket / conversation. Owner-scoped to the customer; agents see all.
Ticket = {
    "schema_type": "object",
    "name": "Ticket",
    "namespace": "concierge",
    "parent_type": "tenant",
    "description": "A customer support ticket across any channel, with priority, lifecycle state, AI deflection and CSAT.",
    "attributes": [
        {"name": "subject", "type": "string", "mandatory": True},
        {"name": "customer_name", "type": "string"},
        {"name": "customer_email", "type": "string"},
        {"name": "channel", "type": "string", "values": CHANNELS},
        {"name": "priority", "type": "string", "values": PRIORITIES},
        # Renamed from `status` — protected field name stripped from non-admin writes.
        {"name": "ticket_state", "type": "string", "mandatory": True,
         "values": ["open", "pending", "resolved", "closed"]},
        {"name": "category", "type": "string", "values": KB_CATEGORIES},
        {"name": "assignee", "type": "string"},
        {"name": "ai_handled", "type": "boolean"},
        {"name": "last_message", "type": "text"},
        {"name": "csat", "type": "integer"},          # 1-5 satisfaction
        {"name": "owner_username", "type": "string"},
        {"name": "first_response_at", "type": "datetime"},
        {"name": "resolved_at", "type": "datetime"},
    ],
    "validations": [
        {"id": "csat-range", "when": {"!=": [{"var": "csat"}, None]},
         "assert": {"and": [{">=": [{"var": "csat"}, 1]}, {"<=": [{"var": "csat"}, 5]}]},
         "message": "CSAT must be between 1 and 5.", "severity": "error"},
    ],
}

# A message on a ticket. Child of Ticket.
Message = {
    "schema_type": "object",
    "name": "Message",
    "namespace": "concierge",
    "parent_type": "ticket",
    "description": "A single message in a ticket thread, from the customer, an agent or the AI concierge.",
    "attributes": [
        {"name": "body", "type": "text", "mandatory": True},
        {"name": "sender", "type": "string", "values": ["customer", "agent", "ai"]},
        {"name": "sender_name", "type": "string"},
        {"name": "owner_username", "type": "string"},
    ],
}

# A canned agent reply (macro). Admin-managed.
Macro = {
    "schema_type": "object",
    "name": "Macro",
    "namespace": "concierge",
    "parent_type": "tenant",
    "description": "A reusable canned response agents can insert into a reply, by category.",
    "attributes": [
        {"name": "title", "type": "string", "mandatory": True},
        {"name": "body", "type": "text", "mandatory": True},
        {"name": "category", "type": "string", "values": KB_CATEGORIES},
        {"name": "sort_order", "type": "integer"},
    ],
}

ALL_SCHEMAS = [Article, Ticket, Message, Macro]
PUBLIC_SCHEMAS = ["article"]
SUPERO_APP_NAMESPACE = "concierge"
