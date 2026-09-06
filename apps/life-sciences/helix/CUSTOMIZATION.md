# Customizing Your Supero App

This guide covers every way to customize your generated app — branding, layout, features, and integrations — plus what can be managed from the Supero admin panel at `app.supero.dev`.

> **Important**: The AI generator creates a complete, working app. All customization below is optional polish. Changes to `ui/app.js` are kept when you pull updates, but regenerating from scratch in the admin panel overwrites them. Commit your edits to git.

---

## Installation

Both runtimes are equally supported. Pick based on your environment.

### Option A — Direct Python (simplest for dev)

**Requires**: Python 3.9+ and pip

```bash
./run.sh            # Linux/Mac
run.bat             # Windows
```

First run creates `.venv`, installs `supero` SDK, runs platform bootstrap (schemas, seed data, policies), then starts the server at `http://localhost:5707`.

Subsequent runs skip setup if already configured. Force re-setup with `./run.sh --reset`.

Flags:
- `--setup-only` — run bootstrap, don't start server
- `--server-only` — skip bootstrap, start server only
- `--skip-tests` — skip seed data verification
- `--verbose` — detailed logs
- `--reset` — wipe `.venv` and re-bootstrap from scratch

### Option B — Docker (recommended for production)

**Requires**: Docker 20.10+ and Docker Compose v2

```bash
docker compose up           # foreground with live logs
docker compose up -d        # detached (background)
docker compose logs -f      # tail logs
docker compose restart      # re-run bootstrap + restart
docker compose down         # stop and remove
```

Container image is ~200MB (python:3.11-slim base), runs as non-root user, includes healthcheck on port 5707.

**Production note**: the shipped `docker-compose.yml` mounts `schemas.py`, `setup.py`, `config.py`, and `ui/` as volumes for hot-reload during development. For production deploys, comment out the `volumes:` block so the image is self-contained and immutable.

### Option C — Build and push image (production)

```bash
# Build a tagged image
docker build -t yourregistry/pawspa:v1.0.0 .

# Push to registry
docker push yourregistry/pawspa:v1.0.0

# Run on a remote host
docker run -d \
  --name pawspa \
  -p 5648:5648 \
  --env-file .env \
  --restart unless-stopped \
  yourregistry/pawspa:v1.0.0
```

---

## Updates

### Updating your app (regenerate from admin panel)

When you make schema changes or want to refresh AI-generated code:

1. Go to admin panel → your project → **Regenerate**
2. Download the new tarball (name format: `<project>-<domain>.tar.gz`)
3. Extract over your existing directory:
   ```bash
   tar -xzf your-app.tar.gz \
       -C ~/apps/ --overwrite
   ```
4. Re-run setup:
   ```bash
   # Direct Python
   ./run.sh --setup-only
   
   # Docker
   docker compose restart
   ```

**What's preserved** (NOT overwritten):
- `.env` — your credentials, tenant noun, port
- `run.sh`, `run.bat`, `Dockerfile`, `docker-compose.yml`
- `.venv/`, `.supero-run.log`
- Any files you added (custom assets, docs, etc.)

**What's replaced**:
- `schemas.py`, `setup.py`, `config.py`, `__main__.py`
- `ui/app.js`, `ui/index.html`, `ui/config.js`

**Best practice**: commit to git before regenerating, compare diff with `git diff`, cherry-pick your `ui/app.js` customizations back.

### Updating the SDK only (bug fixes, new features)

The SDK (`supero` Python package) is updated independently of your app's generated code.

**Direct Python:**
```bash
source .venv/bin/activate
pip install --upgrade supero
./run.sh --setup-only       # re-bootstrap to pick up SDK changes
```

**Docker:**
```bash
# Dockerfile pins `supero>=1.2.0` — rebuild to pick up latest
docker compose build --no-cache
docker compose up -d
```

Check current version:
```bash
# Direct Python
source .venv/bin/activate && pip show supero | grep -i version

# Docker
docker compose exec app pip show supero | grep -i version
```

### Updating `supero-ui.js` (frontend library)

`ui/supero-ui.js` is fetched from the Supero CDN automatically on each `./run.sh` start. You always run the latest version — no manual update needed. To force an immediate refresh without starting:

```bash
rm ui/supero-ui.js
./run.sh --server-only       # re-downloads from CDN on startup
```

To pin a specific version (advanced), set in `.env`:
```bash
SUPERO_UI_VERSION=1.0.2
```

### Updating your Supero platform connection

If your backend URL or API key changes (e.g., moving from dev to prod):

```bash
# Edit .env
vim .env
# Change SUPERO_URL, SUPERO_DOMAIN, SUPERO_PROJECT as needed
# Remove SUPERO_API_KEY so bootstrap fetches a new one

# Re-run — bootstrap detects the change and re-authenticates
./run.sh --setup-only
```

For Docker, update `.env` then `docker compose restart`.

---

## Uninstall

### Direct Python
```bash
# Remove everything including venv
rm -rf ~/apps/your-app

# Optionally, also remove the Supero project from the admin panel
```

### Docker
```bash
docker compose down -v        # stops and removes volumes
docker rmi yourregistry/pawspa:v1.0.0
```

---

## Quick reference

| What you want to change | Edit this file |
|---|---|
| Any screen, layout, colour or copy | `ui/app.js` — it is plain React, and it is yours |
| Your data model | `schemas.py` |
| Seed data, roles, access policies, workflows | `setup.py` |
| App name, services, tenants | `config.py` |
| Domain, project, port, credentials | `.env` |
| Users, API keys, connectors, monitoring | Admin panel |

---

## Customising the UI

`ui/app.js` is the app. It mounts its own React tree and you edit it directly — there
is no configuration layer between you and the screens, and no options object to learn.

Open it and change what you want. React and Tailwind load from a CDN, so there is no
build step: save the file and refresh the page.

Two rules, both enforced by the runtime rather than by convention:

- **Never edit `ui/supero-ui.js`, `ui/index.html`, `ui/config.js` or `ui/server.py`.**
  They are regenerated on every `./run.sh` and your changes will be overwritten.
  `ui/app.js` is the file that survives.
- **Do not redeclare the globals `supero-ui.js` provides** — `useState`, `client`,
  `services`, `showToast`, `CrudModal`, `StatCard` and the rest. Redeclaring one is a
  fatal `SyntaxError` at load. `CLAUDE.md` in this directory lists them all.

The components `supero-ui.js` exports (`DataTab`, `Dashboard`, `CrudModal`,
`SvgBarChart`, `AIChatPanel`, …) are available as globals and you can use them
directly, ignore them, or replace them. `CLAUDE.md` documents the full surface,
including the `client` API and the `services` catalogue.

---
## Tenant terminology

For multi-tenant apps, the UI says "Create your Workspace" by default. Override it in
`.env`:

```bash
SUPERO_IS_MULTI_TENANT=true
SUPERO_TENANT_NOUN_SINGULAR=Insurer
SUPERO_TENANT_NOUN_PLURAL=Insurers
```

These are read at config-generation time and written into `ui/config.js`, which
`ui/app.js` reads as `window.__SUPERO_CONFIG`. They are **not** fields on the project
record — setting them through the API succeeds and is silently discarded, so `.env` is
the only place that works.

Common choices: `Insurer`, `Studio`, `Firm`, `Practice`, `Clinic`, `Restaurant`,
`Store`, `School`, `Agency`, `Organization`, `Workspace`.

---
## Environment variables

All in `.env`:

```bash
SUPERO_URL=https://api.supero.dev           # backend URL
SUPERO_DOMAIN=your-domain                   # your Supero domain
SUPERO_PROJECT=your-project                 # your project slug
SUPERO_ADMIN_EMAIL=admin@example.com
SUPERO_API_KEY=ak_...                       # project-scoped key (auto-written)
SUPERO_TENANT_NOUN_SINGULAR=Salon           # multi-tenant only
SUPERO_TENANT_NOUN_PLURAL=Salons
PORT=5707                                    # local web server port
```

Never commit `.env` — it contains secrets. Use `.env.example` for templates.

---

## Backend customization

### `schemas.py` — data model

Adding a new field:

```python
{
    "name": "appointment_notes",
    "type": "string",
    "mandatory": False,
}
```

After editing, re-run setup:

```bash
./run.sh --setup-only
```

Platform handles migrations automatically for field additions. Field removal requires manual data cleanup.

### `setup.py` — seed data and policies

- `seed_test_data()` — records inserted on first setup. Every record must have `name`, `display_name`, and `description`.
- `POLICIES` — role-based permissions (see [Access control](#access-control))
- `WORKFLOW_DEFINITIONS` — named workflows users can trigger, and `EVENT_BINDINGS` to fire them on data events (email, SMS, webhook, etc.)

---

## Access control

Every multi-tenant app ships with 3 default roles:

| Role | Access |
|---|---|
| `tenant_admin` | Full CRUD within their tenant; can invite users |
| `tenant_user` | CRUD per-schema per `POLICIES` in setup.py |
| `viewer` | Read-only, often with row-level filter (e.g. only own bookings) |

Edit `setup.py` to add custom roles. For row-level security, use `filter_field` + `filter_match`:

```python
{
    'role': 'customer',
    'schema': 'appointment',
    'permissions': ['read', 'create'],
    'filter_field': 'customer_email',
    'filter_match': '$user.email',       # viewer sees only their own records
}
```

---

## Admin panel

Everything above is code-level. The **Supero admin panel** at `app.supero.dev` provides a UI for runtime management without regenerating:

### Projects & domains
- Create/delete projects within your domain
- Toggle `is_multi_tenant` on projects
- Invite team members as domain admins

### Tenants (for multi-tenant apps)
- View all tenants under a project
- Activate, suspend, or archive tenants
- Resend activation emails to tenant admins
- Transfer tenant ownership

### Users
- Invite users by email with a specific role
- Reset passwords
- Revoke sessions
- Change role assignments

### API keys
- Generate new keys scoped to domain, project, or tenant
- Rotate compromised keys (invalidates immediately)
- View last-used timestamps

### Workflows
- Enable/disable workflows defined in `setup.py`
- Configure workflow parameters (SMTP credentials, Slack webhook URLs, etc.)
- View execution history + failed retries
- Manually trigger for testing

### Connectors
- Attach external data sources (HTTP APIs, databases, CSV uploads)
- Map external fields to your schemas
- Schedule sync intervals

### AI services
- Toggle AI chat assistant per project
- Review chat transcripts + feedback
- Adjust AI response tone/persona

### Monitoring
- Per-endpoint request volume and latency
- Error rates by schema
- Audit log (who changed what, when)

### Branding overrides
- Upload custom logo (shown in generated apps' nav)
- Override primary color without regeneration
- Add custom CSS for per-tenant styling (multi-tenant only)

### Billing
- View usage: API calls, storage, workflow executions
- Upgrade plan, download invoices

---

## Regeneration warning

When you regenerate your app from the admin panel or CLI, these files are **overwritten**:

- `ui/app.js` — regenerated from AI + schemas
- `ui/config.js` — regenerated from .env + platform
- `ui/index.html` — overwritten
- `schemas.py`, `setup.py`, `config.py`, `__main__.py` — regenerated

These files are **preserved** (not touched by regeneration):

- `.env` — your credentials and overrides
- `run.sh`, `run.bat` — your runner scripts
- Any new files you add (e.g. `ui/assets/*`, `docs/*`)

**Best practice**: commit all changes to git before regenerating. Compare the diff and cherry-pick your customizations back into the newly generated files.

---

## Troubleshooting

**Landing page not showing**: check `publicSchemas` is non-empty in `config.js` or `heroConfig` is set in `app.js`. Clear localStorage and hard-reload (`Ctrl+Shift+R`).

**"Create your Workspace" instead of your term**: set `SUPERO_TENANT_NOUN_SINGULAR` in `.env` or `tenantNoun` in `app.js`. Must be a multi-tenant project for the create-salon flow to appear.

**Changes to app.js not reflected**: hard-reload browser to bust CDN cache. In dev, disable cache in DevTools → Network tab.

**Theme override ignored**: check for a `!important` CSS rule in a parent selector. Theme tokens are scoped to `:root`; overrides need equal or higher specificity.

**Workflow button does nothing**: verify workflow is enabled in admin panel → Workflows. Check browser console for permission errors — workflow may need `tenant_admin` role.

---

## Getting help

- Docs: `https://docs.supero.dev`
- Community: `https://community.supero.dev`
- Issues: through your admin panel → Support

---

**File location**: this doc ships in your generated app bundle as `CUSTOMIZATION.md`. Keep it alongside your code for reference.
