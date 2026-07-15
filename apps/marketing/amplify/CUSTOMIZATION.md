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
```

First run creates `.venv`, installs `supero` SDK, runs platform bootstrap (schemas, seed data, policies), then starts the server at `http://localhost:5672`.

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

Container image is ~200MB (python:3.11-slim base), runs as non-root user, includes healthcheck on port 5672.

**Production note**: the shipped `docker-compose.yml` mounts `schemas.py`, `setup.py`, `config.py`, and `ui/` as volumes for hot-reload during development. For production deploys, comment out the `volumes:` block so the image is self-contained and immutable.

### Option C — Build and push image (production)

```bash
# Build a tagged image
docker build -t yourregistry/your-app:v1.0.0 .

# Push to registry
docker push yourregistry/your-app:v1.0.0

# Run on a remote host
docker run -d \
  --name your-app \
  -p 5672:5672 \
  --env-file .env \
  --restart unless-stopped \
  yourregistry/your-app:v1.0.0
```

---

## Updates

### Updating your app (regenerate from admin panel)

When you make schema changes or want to refresh AI-generated code:

1. Go to admin panel → your project → **Regenerate**
2. Download the new tarball (name format: `<project>-<domain>.tar.gz`)
3. Extract over your existing directory:
   ```bash
   tar -xzf pet-grooming-salon-management.tar.gz \
       -C ~/mani/ --overwrite
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
pip install -r requirements.txt
./run.sh --setup-only       # re-bootstrap to pick up SDK changes
```

**Docker:**
```bash
# Dockerfile pins `supero==3.5.946` — rebuild to pick up latest
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
rm -rf ~/mani/pet-grooming-salon-management

# Optionally, also remove the Supero project from the admin panel
```

### Docker
```bash
docker compose down -v        # stops and removes volumes
docker rmi yourregistry/your-app:v1.0.0
```

---

## Quick reference

| What you want to change | Edit this file | Section below |
|---|---|---|
| Hero image, title, CTAs | `ui/app.js` → `heroConfig` | [Hero section](#hero-section) |
| Footer text, contact, links | `ui/app.js` → `footerConfig` | [Footer](#footer) |
| Brand colors, theme | `ui/app.js` → `theme` or `themeOverrides` | [Theme & colors](#theme--colors) |
| Layout (sidebar, topnav, minimal) | `ui/app.js` → `layoutMode` | [Layout mode](#layout-mode) |
| Dashboard widgets and charts | `ui/app.js` → `dashboardWidgets`, `dashboardCharts` | [Dashboard](#dashboard) |
| Tabs, fields, table columns | `ui/app.js` → `TABS` | [Tabs & schemas](#tabs--schemas) |
| Card appearance | `ui/app.js` → `cardTemplate` on each tab | [Card templates](#card-templates) |
| Custom action buttons | `ui/app.js` → `actionButtons` | [Action buttons](#action-buttons) |
| Public-facing pages (SEO) | `ui/app.js` → `publicSchemas` + `introSection` | [Public pages](#public-pages) |
| Multi-tenant "Salon" / "Firm" wording | `.env` → `SUPERO_TENANT_NOUN_SINGULAR` | [Tenant terminology](#tenant-terminology) |
| Admin email, backend URL | `.env` | [Environment](#environment-variables) |
| Schema definitions, seed data | `schemas.py`, `setup.py` | [Backend customization](#backend-customization) |
| User roles, RBAC policies | `setup.py` or admin panel | [Access control](#access-control) |
| Workflow behavior | Admin panel → Workflows | [Admin panel](#admin-panel) |

---

## Hero section

Controls the top banner on the public landing page.

```javascript
> **Note:** most apps here are *bespoke* — `ui/app.js` mounts its own tree into `#myapp-root` and does NOT call `AppShell.render()`. If your app.js has no `AppShell.render(` call, ignore AppShell config below and edit the `App` component directly.

AppShell.render({
    // ...other options
    heroConfig: {
        title: 'Built for the Jobsite. Trusted by Contractors.',
        subtitle: '25-word compelling sentence about what the user can do.',
        description: 'Optional 2-3 sentence elaboration for longer hero variants.',
        cta: 'Get Started →',
        image: 'https://images.pexels.com/photos/12345/photo.jpg',
        gradient: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    },
});
```

**Fields:**

- `title` — main headline, 8-12 words, punchy
- `subtitle` — tagline, 15-25 words
- `description` — elaboration, 2-3 sentences (shown on marketplace/content landing variants)
- `cta` — button label
- `image` — background image URL (Pexels/Unsplash, HTTPS only). Omit for gradient-only hero
- `gradient` — CSS gradient as fallback when no image is set, or as overlay

**Tip for hero images**: use Pexels (free, commercial OK). Example search: [pexels.com/search/pet-grooming](https://pexels.com/search/pet-grooming) → click photo → copy `.jpg` URL.

---

## Footer

```javascript
footerConfig: {
    poweredBy: true,                       // show "Powered by Supero"
    contactEmail: 'hello@example.com',
    links: [
        { label: 'Privacy', url: '/privacy' },
        { label: 'Terms', url: '/terms' },
        { label: 'Contact', url: 'mailto:hello@example.com' },
    ],
}
```

---

## Theme & colors

Pick a preset:

```javascript
theme: 'fintech',   // other options: pet-care, health, education, saas, retail, food, legal, fitness
```

Or override specific colors:

```javascript
themeOverrides: {
    primary: '#dc2626',      // main brand color
    secondary: '#10b981',
    background: '#fafbfc',
}
```

All theme tokens map to CSS variables like `--supero-600`, `--supero-800`. You can also set these directly in `ui/index.html` `<style>` for project-wide override.

---

## Layout mode

Changes the overall app shell structure.

```javascript
layoutMode: 'sidebar',     // default: left nav + main content
// layoutMode: 'topnav',    // horizontal top bar, more minimal
// layoutMode: 'minimal',   // no chrome, content-first
```

Additional fine-tuning:

```javascript
appLayout: {
    dashboardStyle: 'mixed',       // 'grid' | 'mixed' | 'feed'
    listStyle: 'grid',              // 'grid' | 'table' | 'list'
    defaultTab: 'appointments',     // tab to open on login
}
```

---

## Dashboard

### Widgets (top-row metric cards)

```javascript
dashboardWidgets: [
    {
        label: 'Total Revenue',
        schema: 'appointment',
        field: 'total_price',
        aggregate: 'sum',               // sum | count | avg | max | min
        filter: { status: 'completed' },
        icon: '💰',
        format: 'currency',             // currency | number | percent | date
    },
    { label: 'Active Pets', schema: 'pet', aggregate: 'count', icon: '🐕' },
],
```

### Charts

```javascript
dashboardCharts: [
    {
        type: 'pie',                    // pie | bar | line
        title: 'Appointments by Status',
        schema: 'appointment',
        groupBy: 'status',
        aggregate: 'count',
    },
    {
        type: 'bar',
        title: 'Revenue by Category',
        schema: 'service',
        groupBy: 'category',
        valueField: 'base_price',
        aggregate: 'avg',
        format: 'currency',
    },
],
```

Keep to **2 charts max** — more makes the dashboard cluttered.

---

## Tabs & schemas

Each tab in the app is defined in the `TABS` array:

```javascript
const TABS = [
    {
        id: 'pets',
        label: 'Pets',
        icon: '🐕',
        schema: 'pet',                  // matches schemas.py entry
        attrs: [
            { name: 'pet_name', type: 'string', mandatory: true, featured: true },
            { name: 'breed', type: 'string', mandatory: true, featured: true },
            { name: 'size', type: 'string', values: ['small', 'medium', 'large'] },
            { name: 'profile_photo', type: 'Image' },
        ],
        cardTemplate: { /* see below */ },
    },
];
```

**Attribute flags:**

- `mandatory: true` — field required on create
- `featured: true` — show on card + list prominently
- `values: [...]` — enum / dropdown values
- `type: 'Image'` — image upload
- `type: 'Image', list: true` — gallery (multiple images)
- `list: true` on strings — multi-value chip input
- `hidden: true` — store but don't display

Changing `attrs` affects the **UI only**. To change backend fields, edit `schemas.py` and restart.

---

## Card templates

Controls how each record renders as a card in grid views.

```javascript
cardTemplate: {
    image: 'profile_photo',         // field with type 'Image' for thumbnail
    title: 'pet_name',              // most prominent field (required)
    subtitle: 'breed',
    badge: 'size',                  // small tag, usually an enum
    ribbon: 'owner_name',           // corner label
    price: 'base_price',            // for currency fields
    priceSuffix: '/visit',          // e.g. "/month", "/night", ""
    metrics: ['age', 'weight', 'last_visit'],  // additional fields shown compactly
}
```

---

## Action buttons

Add custom buttons on record pages that trigger workflows or external URLs.

```javascript
actionButtons: {
    'appointment': [
        {
            label: 'Send Reminder',
            icon: '📧',
            workflow: 'send_appointment_reminder',  // workflow ID from setup.py
            confirmMessage: 'Send SMS reminder to customer?',
        },
        {
            label: 'View Invoice',
            icon: '🧾',
            url: '/invoice/{uuid}',                 // {uuid} replaced with record UUID
            target: '_blank',
        },
    ],
}
```

**Workflow buttons** call the backend workflow with the record's fields as input. Workflows are defined in `setup.py` and can be enabled/configured via the admin panel.

---

## Public pages

Schemas listed in `publicSchemas` are browsable on the landing page without login (great for SEO, marketplaces, portfolios).

```javascript
publicSchemas: ['service', 'portfolio_item'],

// Optional: richer landing content
introSection: {
    title: 'Why PawSpa',
    description: 'What makes our grooming service different.',
    features: [
        { icon: '✂️', label: 'Expert Groomers', description: '10+ years avg. experience' },
        { icon: '🐕', label: 'All Breeds Welcome', description: 'Small to extra-large' },
        { icon: '📸', label: 'Portfolio', description: 'See our work before booking' },
    ],
},
```

Public fetch endpoint: `GET /api/public/{schema}` — no auth, returns records from the default tenant.

---

## Tenant terminology

For multi-tenant apps, the UI says "Create your Workspace" by default. Override per domain:

```bash
# In .env
SUPERO_TENANT_NOUN_SINGULAR=Salon
SUPERO_TENANT_NOUN_PLURAL=Salons
```

Or directly in app.js (takes precedence):

```javascript
tenantNoun: { singular: 'Salon', plural: 'Salons' },
```

Common choices: `Salon`, `Studio`, `Firm`, `Practice`, `Clinic`, `Restaurant`, `Store`, `School`, `Agency`, `Organization`, `Workspace`.

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
PORT=5672                                    # local web server port
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
- `ACCESS_POLICIES` — role-based permissions (see [Access control](#access-control))
- `WORKFLOWS` — named workflows users can trigger (email, SMS, webhook, etc.)

---

## Access control

Every multi-tenant app ships with 3 default roles:

| Role | Access |
|---|---|
| `tenant_admin` | Full CRUD within their tenant; can invite users |
| `tenant_user` | CRUD per-schema per `ACCESS_POLICIES` in setup.py |
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
