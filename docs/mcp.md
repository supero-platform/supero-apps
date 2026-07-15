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
on the roadmap; watch [Discussions](https://github.com/supero-platform/supero-apps/discussions).

---

## Authentication

Two methods, both tenant-scoped:

| Method | Header | Notes |
|---|---|---|
| API key | `X-API-Key: ak_...` | Scoped to one project. Revocable. Best for editors. |
| JWT | `Authorization: Bearer <jwt>` | Short-lived. Best for programmatic use. |

Your key carries its own scope. **The assistant can only ever touch the domain, project,
and tenant that key is scoped to** — it cannot reach another customer's data, and it's
checked against your roles on every call. Your AI inherits your permissions, not more.

---

## What the tools do

Roughly four tiers:

| Tier | Examples | For |
|---|---|---|
| **Data** | `crud_search`, `crud_get`, `crud_create` | Read/write records. `object_type` is a parameter. |
| **Schema** | inspect, upload, resolve | Design and evolve the data model |
| **Build** | plan, generate, validate, go-live | Generate an app end to end |
| **System** | health, info | Introspection |

On connect, the server sends onboarding instructions, so a capable assistant orients
itself without you pasting a prompt.


### The Build tier (for agent builders)

Beyond `crud_*`, the server exposes a **Build** tier so an agent can take an app from
nothing to a live URL. The exact set evolves, but the shape is:

| Tool | Does |
|---|---|
| `build_plan` | turn a description into a schema + app plan |
| `build_generate` | generate schemas, policies, and UI from the plan |
| `build_validate` | check the generated app against the live platform before shipping |
| `build_go_live` | deploy to a managed URL |
| `build_teardown` | tear a build down |

Enumerate the current, exact tool list for your key with `tools/list` (below) rather than
hardcoding names — the Build tier is where the platform iterates most.

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
- **Protocol pinned to `2024-11-05`.**
- **The instruction payload is large.** Some clients with tight context budgets will feel it.

Hitting something else? [Open an issue](https://github.com/supero-platform/supero-apps/issues) —
MCP is where we're investing most.
