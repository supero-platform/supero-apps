# schemas.py — data model for Amplify (multi-tenant social media campaign platform / SaaS).
#
# Two audiences:
#   • tenant_admin = the operator running Amplify (sees ALL workspaces / plans / billing / campaigns)
#   • tenant_user  = a customer marketer (owner-scoped CRUD on their channels/campaigns/posts;
#                    reads their own workspace + the public Plan tiers)
#
# Every lifecycle field is named "<x>_state" (NEVER status/state) — those are stripped from
# non-admin writes → 422. Private records carry owner_username and are scoped in setup.py.

NS = "amplify"

PLAN_TIERS = ["Free", "Starter", "Growth", "Agency"]
PLATFORMS = ["Instagram", "LinkedIn", "X", "Facebook", "TikTok", "YouTube", "WhatsApp", "Google Ads"]
OBJECTIVES = ["Awareness", "Engagement", "Traffic", "Leads", "Sales", "App Installs"]
WORKSPACE_STATES = ["trial", "active", "past_due", "churned"]
CHANNEL_STATES = ["connected", "disconnected", "error"]
CAMPAIGN_STATES = ["draft", "scheduled", "active", "paused", "completed"]
POST_STATES = ["draft", "scheduled", "published", "failed"]

# A public billing/pricing tier. PUBLIC — shown on the marketing pricing page logged-out.
Plan = {
    "schema_type": "object", "name": "Plan", "namespace": "amplify", "parent_type": "tenant",
    "description": "A public pricing tier — included posts/channels, monthly price and features.",
    "attributes": [
        {"name": "name", "type": "string", "mandatory": True},
        {"name": "tier", "type": "string", "values": PLAN_TIERS},
        {"name": "price_monthly", "type": "float"},
        {"name": "included_posts", "type": "integer"},
        {"name": "included_channels", "type": "integer"},
        {"name": "features", "type": "text"},
        {"name": "popular", "type": "boolean"},
        {"name": "sort_order", "type": "integer"},
    ],
}

# A customer company on Amplify. tenant_user reads their own (owner-scoped by owner_username);
# the operator (tenant_admin) sees every workspace + MRR + state.
Workspace = {
    "schema_type": "object", "name": "Workspace", "namespace": "amplify", "parent_type": "tenant",
    "description": "A customer company (workspace) on Amplify — its plan, billing state and MRR.",
    "attributes": [
        {"name": "name", "type": "string", "mandatory": True},
        {"name": "industry", "type": "string"},
        {"name": "plan_name", "type": "string"},
        {"name": "owner_email", "type": "string"},
        {"name": "workspace_state", "type": "string", "mandatory": True, "values": WORKSPACE_STATES},
        {"name": "mrr", "type": "float"},
        {"name": "channels_connected", "type": "integer"},
        {"name": "signup_date", "type": "date"},
        {"name": "owner_username", "type": "string"},
    ],
}

# A connected social channel. OWNER-SCOPED to the customer marketer.
Channel = {
    "schema_type": "object", "name": "Channel", "namespace": "amplify", "parent_type": "tenant",
    "description": "A connected social channel (Instagram, LinkedIn, X, …) with handle and follower count.",
    "attributes": [
        {"name": "platform", "type": "string", "values": PLATFORMS},
        {"name": "handle", "type": "string"},
        {"name": "workspace_name", "type": "string"},
        {"name": "channel_state", "type": "string", "mandatory": True, "values": CHANNEL_STATES},
        {"name": "followers", "type": "integer"},
        {"name": "owner_username", "type": "string"},
    ],
}

# A marketing campaign. OWNER-SCOPED. Lifecycle via campaign_state.
Campaign = {
    "schema_type": "object", "name": "Campaign", "namespace": "amplify", "parent_type": "tenant",
    "description": "A marketing campaign with objective, budget/spend and a lifecycle state.",
    "attributes": [
        {"name": "name", "type": "string", "mandatory": True},
        {"name": "workspace_name", "type": "string"},
        {"name": "objective", "type": "string", "values": OBJECTIVES},
        {"name": "campaign_state", "type": "string", "mandatory": True, "values": CAMPAIGN_STATES},
        {"name": "budget", "type": "float"},
        {"name": "spend", "type": "float"},
        {"name": "start_date", "type": "date"},
        {"name": "end_date", "type": "date"},
        {"name": "channels", "type": "string"},
        {"name": "owner_username", "type": "string"},
    ],
}

# A social post inside a campaign. OWNER-SCOPED. Publishing simulated; metrics filled on publish.
Post = {
    "schema_type": "object", "name": "Post", "namespace": "amplify", "parent_type": "tenant",
    "description": "A scheduled/published social post with caption, platform and performance metrics.",
    "attributes": [
        {"name": "caption", "type": "text"},
        {"name": "platform", "type": "string", "values": PLATFORMS},
        {"name": "campaign_name", "type": "string"},
        {"name": "post_state", "type": "string", "mandatory": True, "values": POST_STATES},
        {"name": "scheduled_at", "type": "datetime"},
        {"name": "published_at", "type": "datetime"},
        {"name": "image", "type": "Image"},
        # A public URL to the video — youtube.upload_video downloads it and uploads to the channel.
        # (Supero's file service rejects raw video uploads and the op is built around a source URL,
        # so the working path is a public URL string. `video` (File) is kept because the platform
        # blocks removing an attribute as a breaking change; it's unused for now.)
        {"name": "video_url", "type": "string"},
        {"name": "video", "type": "File"},
        {"name": "reach", "type": "integer"},
        {"name": "clicks", "type": "integer"},
        {"name": "engagement", "type": "integer"},
        {"name": "likes", "type": "integer"},
        {"name": "owner_username", "type": "string"},
        # Real-posting result: did it actually post to the channel, or fall back to simulated?
        {"name": "delivery", "type": "string", "values": ["live", "simulated", "failed"]},
        {"name": "provider_post_id", "type": "string"},
        {"name": "publish_error", "type": "string"},
    ],
}

ALL_SCHEMAS = [Plan, Workspace, Channel, Campaign, Post]
PUBLIC_SCHEMAS = ["plan"]
SUPERO_APP_NAMESPACE = "amplify"
