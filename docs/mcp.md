# Build with your AI assistant (MCP)

Supero runs a [Model Context Protocol](https://modelcontextprotocol.io) server. Connect
Claude, ChatGPT, Claude Code, Cursor or VS Code to it, describe the app you want, and the
assistant designs the schemas, roles and screens, publishes the app and hands you a URL.
Everything runs against your real Supero account, not a mock.

**Server URL:** `https://mcp.supero.dev/mcp`

You sign in with your Supero account in a browser window (OAuth). There is no API key to
create or paste. If you don't have an account yet, create one in that window; it's free and
needs no card.

---

## Connect your assistant

### Claude (claude.ai or Claude Desktop)

1. Open **Customize → Connectors**, click **+ Add**, then **Add custom connector**.
   (Team and Enterprise: an Owner adds it once under Organization settings → Connectors.)
2. Name it **Supero**, paste `https://mcp.supero.dev/mcp`, leave the OAuth fields empty,
   click **Add**, then **Connect**.
3. A Supero window opens. Sign in, make the two choices on the Allow page, then click
   **Allow**.
4. In a new chat, click **+ → Connectors**, switch Supero on, and describe your app.

Works on every Claude plan. The Free plan allows one custom connector.

### ChatGPT

1. Open **chatgpt.com/plugins**, click **+** and add a custom MCP server.
   (Older accounts: Settings → Apps & Connectors → Create.)
2. Name it **Supero**, choose **Public endpoint**, paste `https://mcp.supero.dev/mcp` and
   set Authentication to **OAuth**. Confirm the risk notice, then create it.
3. Sign in to Supero in the window that opens and click **Allow**.
4. In a new chat, type **@** and pick Supero, then describe your app.

Custom MCP servers need a ChatGPT plan that allows them. On Business, Enterprise and Edu an
admin may have to switch them on first.

### Claude Code

```bash
claude mcp add --scope user --transport http supero https://mcp.supero.dev/mcp
```

Start `claude`, type `/mcp`, select **supero** and choose **Authenticate**. Your browser
opens at Supero; sign in and click **Allow**. On a remote or headless machine, open the
link Claude Code prints.

### Cursor, VS Code, Gemini CLI, Codex CLI, Windsurf

Same URL, same browser sign-in. Each editor has its own config file:

| Editor | Config | Step-by-step |
|---|---|---|
| Cursor | `~/.cursor/mcp.json` → `{"mcpServers":{"supero":{"url":"https://mcp.supero.dev/mcp"}}}` | [connect-cursor](https://docs.supero.dev/developers/mcp/connect-cursor) |
| VS Code (Copilot) | `.vscode/mcp.json` → `{"servers":{"supero":{"type":"http","url":"https://mcp.supero.dev/mcp"}}}` | [connect-vscode-copilot](https://docs.supero.dev/developers/mcp/connect-vscode-copilot) |
| Gemini CLI | `~/.gemini/settings.json` → `{"mcpServers":{"supero":{"httpUrl":"https://mcp.supero.dev/mcp"}}}`, then `/mcp auth supero` | [connect-gemini-cli](https://docs.supero.dev/developers/mcp/connect-gemini-cli) |
| Codex CLI | `~/.codex/config.toml` → `[mcp_servers.supero]` `url = "https://mcp.supero.dev/mcp"`, then `codex mcp login supero` | [connect-codex-cli](https://docs.supero.dev/developers/mcp/connect-codex-cli) |
| Windsurf | `{"mcpServers":{"supero":{"serverUrl":"https://mcp.supero.dev/mcp"}}}` | [connect-windsurf](https://docs.supero.dev/developers/mcp/connect-windsurf) |

### What to ask for

Describe the business, who uses it and what they do. For example:

> *"Build a booking app for a small physiotherapy clinic. Patients sign up and book
> sessions; therapists see their own schedule and write session notes patients can't read;
> the owner sees every booking and the weekly revenue."*

The assistant plans the app with you first, then builds it, checks it and returns a link
you can open. Changing it later is the same conversation: *"add a waitlist for full
slots"*.

---

## Opening an app from this repo in your editor

Every app in this repo ships a `CLAUDE.md`, plus `.cursorrules` and `.windsurfrules`.
Opening an app folder in your editor gets you an assistant that knows the layout, the rules
and what never to edit. MCP connects the same assistant to the **platform**, so it can act
on your live account rather than only editing files. Use both.

---

## API keys (CI and scripts)

For automation where no browser is available, use a project API key instead of sign-in.
Create one at [app.supero.dev](https://app.supero.dev) → your project → API keys. Keys are
scoped to one project and revocable.

```bash
claude mcp add --transport http supero https://api.supero.dev/mcp/v1/messages \
  --header "X-API-Key: ak_your_key_here"
```

You can check the server without signing in:

```bash
curl https://api.supero.dev/mcp/v1/info
```

---

## Authentication

Three methods, all tenant-scoped:

| Method | How | Notes |
|---|---|---|
| OAuth sign-in | Browser window when you connect | The default for Claude, ChatGPT and editors. Revoke it from your account. |
| API key | `X-API-Key: ak_...` | Revocable. For CI and scripts. |
| JWT | `Authorization: Bearer <jwt>` | Short-lived. For programmatic use. |

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

## Problems?

Something not working? [Open an issue](https://github.com/supero-platform/supero-apps/issues) —
MCP is where we're investing most.

---

📖 **This page is the short version.** For the full MCP guide, see [docs.supero.dev/developers/mcp/overview](https://docs.supero.dev/developers/mcp/overview).
