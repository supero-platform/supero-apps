# Build with Claude (MCP)

Supero speaks the [Model Context Protocol](https://modelcontextprotocol.io). Point your AI
editor at it and your assistant can design schemas, generate UI, run CRUD, and deploy —
against your real domain, not a mock.

The server is live. You can check it right now without a key:

```bash
curl https://api.supero.dev/mcp/v1/info
```

```json
{
  "name": "supero",
  "version": "2.0.0",
  "protocol_version": "2024-11-05",
  "transport": "streamable-http",
  "endpoint": "/mcp/v1/messages",
  "authentication": { "methods": ["bearer", "api_key"] },
  "capabilities": { "tools": true, "resources": true, "prompts": true }
}
```

---

## Two ways in

Every app in this repo already ships a `CLAUDE.md`, plus `.cursorrules` and
`.windsurfrules`. **Just opening an app folder in your editor gets you a useful assistant** —
it knows the layout, the rules, and what never to edit.

MCP is the second, deeper path: it connects your editor to the **platform**, so your
assistant can act on your live domain rather than only editing files.

Use both. They compose.

---

## Connect Claude Code

Get an API key from the dashboard at [app.supero.dev](https://app.supero.dev) → your
project → API keys. Keys are scoped to one project and revocable.

```bash
claude mcp add --transport http supero https://api.supero.dev/mcp/v1/messages \
  --header "X-API-Key: ak_your_key_here"
```

Verify:

```bash
claude mcp list
```

Then ask for something real:

> *"Add a waitlist to this clinic — patients can join when a slot is full, staff promote
> them when one opens. Update the schema, the policies, and the admin screen."*

### Cursor / Windsurf

Same server, editor-specific config. In Cursor, add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "supero": {
      "url": "https://api.supero.dev/mcp/v1/messages",
      "headers": { "X-API-Key": "ak_your_key_here" }
    }
  }
}
```

### Claude Desktop — not yet

Desktop custom connectors require OAuth 2.1, which this server doesn't implement yet
(it authenticates with API keys and JWTs). **Use Claude Code for now.** OAuth support is
on the roadmap; follow [Issues](https://github.com/supero-platform/supero-apps/issues) for progress.

---

## Authentication

Two methods, both tenant-scoped:

| Method | Header | Notes |
|---|---|---|
| API key | `X-API-Key: ak_...` | Revocable. Best for editors. |
| JWT | `Authorization: Bearer <jwt>` | Short-lived. Best for programmatic use. |

**Your key carries its own scope, and the scope depends on how it was issued.** A key tied
to a specific project and tenant acts as a tenant user; one issued against the default
project and tenant resolves to a domain administrator. Check what yours actually grants
rather than assuming:

```bash
curl -X POST https://api.supero.dev/mcp/v1/messages \
  -H "X-API-Key: ak_your_key_here" -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call",
       "params":{"name":"apikey_get_scope","arguments":{}}}'
```

**The AI inherits your permissions — it does not get its own.** An MCP call carries your
credential to the same API a browser would use. There is no service account behind it and
no elevated path, so the assistant cannot read something you could not read yourself. Its
reads go through the same access-policy code as a direct API call, which you can check with
[`verify/02-rbac-enforcement.sh`](../verify/02-rbac-enforcement.sh).

That is a statement about escalation, and it is the honest form of the claim. It is not a
promise that every field on every object type is covered in every configuration — access
rules are yours to declare, and a rule you did not write is one the AI is not bound by
either. Field hiding also covers types you declare in your own schemas; platform-managed
types (accounts, API keys, domains, projects, tenants) are governed by role permissions,
which is a different mechanism.

---

## What the tools do

**64 tools across six families.** Counted from the source, and the build count is
confirmed by the live endpoint's own `build_tool_count`.

| Family | Count | Examples | For |
|---|---|---|---|
| `crud_*` | 5 | `crud_search`, `crud_get`, `crud_create`, `crud_update`, `crud_delete` | Read and write records. `object_type` is a parameter. |
| `schema_*` | 8 | `schema_list`, `schema_save`, `schema_validate`, `schema_update` | Design and evolve the data model |
| `connector_*` | 11 | `connector_discover`, `connector_test`, `connector_run`, `connector_status` | Bring your own database |
| `sdk_*` | 4 | `sdk_generate`, `sdk_download`, `sdk_list`, `sdk_status` | Typed client generation |
| `rbac_*` / `apikey_*` | 3 | `rbac_check_permission`, `rbac_get_my_access`, `apikey_get_scope` | Ask what this key is allowed to do |
| `build_*` | 33 | `build_plan`, `build_create_project`, `build_go_live`, `build_doctor` | Take an app from nothing to a live URL |

A further 15 `infra_*` tools exist and are **off by default**, behind
`MCP_ENABLE_INFRA_TOOLS`. They expose source-read, database and git operations. Leave them
off unless you know exactly why you are turning them on.

**Full reference with every parameter:**
[docs.supero.dev/developers/mcp/tool-reference](https://docs.supero.dev/developers/mcp/tool-reference)

On connect, the server sends onboarding instructions, so a capable assistant orients itself
without you pasting a prompt.

### The Build tier (for agent builders)

Thirty-three tools, enough for an agent to go from a sentence to a deployed URL without a
human touching a file. The shape of a full run:

| Stage | Tools |
|---|---|
| Plan | `build_plan`, `build_get_examples`, `build_get_skills`, `build_list_capabilities` |
| Create | `build_create_project`, `build_update_project`, `build_replace_project` |
| Data | `build_connect_data_source`, `build_discover_source`, `build_bind_data_source`, `build_list_bound_schemas` |
| Services | `build_configure_services`, `build_recommend_integrations`, `build_get_service_contract` |
| Check | `build_validate`, `build_doctor`, `build_smoke_test`, `build_e2e_test` |
| Ship | `build_stage_bundle`, `build_publish`, `build_deploy`, `build_go_live` |
| Operate | `build_logs`, `build_deploy_status`, `build_set_project_mode`, `build_teardown` |

Enumerate the exact list for your own key rather than hardcoding names — this tier is where
the platform iterates most.

List them yourself once connected:

List them yourself once connected:

```bash
curl -X POST https://api.supero.dev/mcp/v1/messages \
  -H "X-API-Key: ak_your_key_here" -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

---

## Try it

```bash
cd apps/healthcare/lumen
# .env pointed at your domain, ./run.sh once
claude
```

> *"Read schemas.py and add a `no_show` flag to appointments, with a dashboard tile for
> the no-show rate this month."*

The assistant reads `CLAUDE.md`, edits `schemas.py` and `ui/app.js`, and — over MCP —
pushes the schema to your domain and checks it landed.

---

## Honest limits

- **No OAuth yet** → no Claude Desktop connector. Claude Code and Cursor work.
- **Transport is JSON-RPC over HTTP POST.** Stateless. There's no SSE stream, so clients
  that require the SSE leg won't attach.
- **Protocol pinned to `2024-11-05`.** The spec has moved on since; clients that
  negotiate a newer revision and refuse to fall back will not attach.
- **The instruction payload is large.** Some clients with tight context budgets will feel it.

Hitting something else? [Open an issue](https://github.com/supero-platform/supero-apps/issues) —
MCP is where we're investing most.

---

📖 **This page is the short version.** For the full MCP guide, see [docs.supero.dev/developers/mcp/overview](https://docs.supero.dev/developers/mcp/overview).
