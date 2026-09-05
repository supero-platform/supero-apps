# Supero Agent Context

> This file provides context for AI coding assistants (Claude Code, Cursor,
> Windsurf, etc.) working on this Supero-generated application.
> Read this FIRST before making changes.

## Project Structure

```
.
├── README.md               ← Human documentation (start here)
├── CLAUDE.md               ← This file (AI assistant context)
├── .cursorrules            ← Copy of CLAUDE.md (for Cursor)
├── .windsurfrules          ← Copy of CLAUDE.md (for Windsurf)
├── run.sh / run.bat        ← Start script (bootstrap + serve)
├── Dockerfile              ← Container image
├── docker-compose.yml      ← Local dev + simple prod
├── .env                    ← Environment config (domain, project, API key)
│
├── schemas.py              ← Schema definitions (data models)
├── setup.py                ← Seed data, access policies, workflows
├── config.py               ← Python configuration
├── crud_tests.py           ← Auto-generated CRUD smoke tests
├── supero_*.whl            ← Tenant SDK wheel (rebuilt during bootstrap)
│
└── ui/
    ├── index.html          ← CDN scripts: React 18, Tailwind, Babel (auto-generated)
    ├── config.js           ← Domain, project, tenant (auto-generated)
    ├── supero-ui.js        ← Platform UI library (DO NOT MODIFY)
    ├── app.js              ← App-specific code (MODIFY THIS)
    └── server.py           ← Dev server + API proxy (auto-generated)
```

## Critical Rules

1. **EXTEND `ui/app.js`** — never modify `supero-ui.js` (it gets overwritten on updates)
2. **DO NOT redeclare these globals** (they come from supero-ui.js — redeclaring
   causes fatal `SyntaxError`):
   `useState`, `useEffect`, `useRef`, `useCallback`, `client`, `fileService`,
   `services`, `formatCurrency`, `formatNumber`, `formatDate`, `formatFieldValue`,
   `showToast`, `CrudModal`, `DeleteModal`, `StatCard`, `SvgBarChart`, `AIChatPanel`,
   `resolveImageUrl`, `getStatusColor`, `buildFieldsFromAttrs`, `parse422Error`, `renderMarkdown`
3. **Use `React.createElement()`** — Babel standalone handles JSX in
   `<script type="text/babel">` but app.js uses raw createElement for reliability
4. **Tailwind CSS classes** are available — loaded via CDN
5. **No npm/node_modules** — this is a zero-build CDN-based app
6. **DO NOT edit** `index.html`, `config.js`, or `server.py` — they are regenerated
   on every `./run.sh` by the Supero CLI
7. **The bootstrap step is idempotent** — running `./run.sh` repeatedly is safe
   and will sync schema/seed changes without duplicating records

## Environment Variables (.env)

```bash
SUPERO_DOMAIN=your-domain          # Domain name
SUPERO_PROJECT=your-project-slug   # Project slug (not display name)
SUPERO_API_KEY=ak_...              # API key for bootstrap
SUPERO_DEFAULT_TENANT=default-tenant
PUBLIC_SCHEMAS=vehicle,listing     # Comma-separated public schemas (optional)
PORT=5648                          # Server port
```

## Data Access (SuperoClient)

Read `ui/supero-ui.js` → `class SuperoClient` for full API. Key methods:

```javascript
// Auth
client.isAuthenticated()                          // returns boolean
client.login(domain, email, password, project)    // returns {auth, user, context, policy}
client.clearAuth()                                // logout
client.can('create', 'vehicle')                   // RBAC check
client.canWrite('vehicle')                        // create OR update

// CRUD — uses client.domain automatically
client.getObjects('vehicle')                      // returns [{uuid, name, display_name, ...}, ...]
client.createObject('vehicle', {make: 'Toyota'})  // returns {uuid, name, ...}
client.updateObject('vehicle', uuid, {color: 'red'}, existingItem)
client.deleteObject('vehicle', uuid, existingItem)
// NOTE: existingItem is needed for tenant resolution from fq_name

// Namespaced schemas — if schema has a namespace, use qualified name:
client.getObjects('ecommerce:order')              // namespace:schema format
client.createObject('ecommerce:order', {total: 99.50})

// Raw API — use client.domain, never hardcode domain
client.request('GET', '/api/v1/crud/' + client.domain + '/vehicle?limit=100')
client.request('POST', '/api/v1/services/execute', {service_id: 'email', ...})

// Pagination
client.request('GET', '/api/v1/crud/' + client.domain + '/vehicle?limit=50&offset=0')
// Response: {results: [...], result_count: 50, total_count: 200}

// Headers (auto-set on every request)
client.authHeaders()  // returns {Authorization, Content-Type, X-Domain, X-Tenant}
```

## Error Handling

```javascript
// Toast notifications (global)
showToast('Record created!', 'success')    // success | error | info | warning
showToast('Something failed', 'error')

// CRUD error handling pattern
try {
    await client.createObject('vehicle', data)
    showToast('Vehicle created', 'success')
} catch (err) {
    // Parse 422 validation errors
    var missingFields = parse422Error(err)
    if (missingFields.length > 0) {
        showToast('Missing: ' + missingFields.join(', '), 'warning')
    } else {
        showToast('Error: ' + (err.message || 'Unknown error'), 'error')
    }
}

// Permission errors
if (!client.can('create', 'vehicle')) {
    showToast('You do not have permission to create vehicles', 'warning')
    return
}
```

## Available Services (30+)

Read `ui/supero-ui.js` for the full `services` object. Key ones:

```javascript
services.email.send({to, subject, bodyHtml})
services.sms.send({to, body})
services.whatsapp.send({to, body})
services.slack.message({channel, text})
services.stripe.checkout({amount, product, successUrl})
services.ai.complete({prompt, model})
services.ai.chat({messages, model})
services.calendar.createEvent({title, start, end, addMeet})
services.push.notify({token, title, body})
services.razorpay.createOrder({amountPaise, currency, customerName})
services.workflow.run(workflowId, inputData)
services.github.createIssue({owner, repo, title, labels})
services.quickbooks.createInvoice({customerRef, lineItems, dueDate})
services.googleAuth.getConfig()
services.mcpClient.callTool({serverUrl, toolName, arguments})
```

## UI Components (from supero-ui.js)

All available as globals — use directly in app.js:

```javascript
// Layout shells
AppShell.render({tabs, appName, appEmoji, theme, ...})  // Main entry point
Sidebar, TopNavShell, MagazineShell, MinimalShell

// Auth pages
LoginPage, SignupPage, GoogleSignInButton

// Landing pages
LandingPage, LandingNav, LandingFooter, LandingDescription, HeroSection

// Data display
DataTab, Dashboard, DetailView, KanbanView

// Cards (auto-selected by layout mode, or use directly)
ImageCard, ProfileCard, TemplateCard, CinemaCard
MagazineListCard, CompactImageRow, CleanListRow, FullPageCreate

// Modals & overlays
CrudModal, DeleteModal, ImageLightbox, SearchOverlay

// Charts & stats
SvgBarChart, DashboardChart, StatCard, Sparkline

// Forms & fields
ImageFieldInput, ImageListFieldInput, ParentChainSelector

// Actions & workflows
WorkflowTriggerButton, WorkflowBadge, ActionButtons

// Utilities
AIChatPanel, ErrorBoundary, SkeletonCard
TenantSwitcher  // multi-tenant admin only
```

## Theming

```javascript
// 120+ theme presets available:
// 'healthcare', 'fintech', 'real-estate', 'food', 'travel', 'saas',
// 'restaurant', 'hotel', 'automotive', 'legal', 'crypto', 'jewelry', ...
// See supero-ui.js for full _THEME_PRESETS list

// Use preset:
AppShell.render({ theme: 'fintech', ... })

// Custom theme:
AppShell.render({
    theme: { primary: '#dc2626', accent: '#f59e0b', layoutMode: 'magazine' },
    ...
})

// Layout modes: 'sidebar' | 'topnav' | 'magazine' | 'minimal'

// CSS variables available after theme applied:
// var(--supero-50) through var(--supero-950)
// var(--supero-primary), var(--supero-accent)
// var(--supero-accent-50) through var(--supero-accent-950)
```

## Schemas & Data Model

Read `schemas.py` for this project's entity definitions. Each schema has:
- `name` — API identifier (used in CRUD URLs)
- `namespace` — if set, CRUD URL becomes `/api/v1/crud/{domain}/{namespace}:{name}`
- `attributes` — fields with types: string, float, integer, bool, date, datetime, Image, File
- `parent_type` — always 'tenant' for business objects
- Implicit fields on every object: `uuid`, `name`, `display_name`, `description`,
  `created_at`, `updated_at`

## Authentication & Access Control

```javascript
// Login flow
client.login(domain, email, password, project)
// Returns: {auth: {access_token}, user: {role}, policy: {entities: {...}}}

// Permission check (uses cached policy from login)
client.can('read', 'vehicle')    // entity-level RBAC
client.can('create', 'booking')
client.can('update', 'payment')
client.can('delete', 'vehicle')

// Roles (highest to lowest privilege):
// platform_admin, domain_admin, tenant_admin, project_admin,
// tenant_user, project_user, developer, viewer

// Admin bypass — admin roles return true for all can() checks
// Viewer — read-only, can() returns false for create/update/delete
```

## Multi-Tenant (if enabled)

```javascript
// Enabled when: config.isMultiTenant === true in AppShell.render()

// TenantSwitcher component — auto-renders in sidebar for super-admins
// Only visible when user is tenant_admin on default-tenant

// Switch tenant context (super-admin only):
client.setTenantOverride('branch-nyc')
// X-Tenant header auto-set on all subsequent CRUD calls
// All data now scoped to branch-nyc tenant

// default-tenant = admin-only (no business objects)
// Business objects live in named tenants (branch-nyc, branch-la, etc.)
```

## Workflows

Read `setup.py` for this project's `WORKFLOW_DEFINITIONS`.

```javascript
// Trigger a workflow from UI
services.workflow.run('workflow-id', {field1: value1, field2: value2})

// WorkflowTriggerButton — declarative button in detail views
// Configure via WORKFLOW_MAP in app.js:
var WORKFLOW_MAP = {
    'order': {
        workflowId: 'process-order',
        triggerLabel: 'Process Order',
        inputFields: ['order_number', 'customer_email']
    }
}
```

## File Uploads

```javascript
// Upload image/file
var result = await fileService.upload(file)
// Returns: {url, thumbnail_url, filename, size, content_type}

// Batch upload
var results = await fileService.uploadBatch(fileList)

// Use in forms
React.createElement(ImageFieldInput, {
    value: formData.photo,
    onChange: function(ref) { /* ... */ }
})
React.createElement(ImageListFieldInput, {
    value: formData.gallery,
    onChange: function(refs) { /* ... */ }
})

// Resolve image URL from any format (string, object, null)
var url = resolveImageUrl(item.cover_photo)  // handles all formats safely
```

## AI Chat

```javascript
// Streaming chat with full event handling
await aiChatStream(message, sessionId, function(event) {
    // Event types:
    // 'text_delta'    — token-by-token text streaming
    // 'tool_start'    — AI is calling a tool
    // 'tool_end'      — tool call completed
    // 'thinking'      — AI is reasoning
    // 'turn_start'    — new reasoning turn started
    // 'confirmation'  — human-in-the-loop approval needed
    // 'file'          — AI generated a downloadable file
    // 'done'          — stream complete, includes session_id
    // 'error'         — error occurred
})

// AIChatPanel component — auto-rendered by AppShell (floating FAB button)
// Disable with: AppShell.render({enableAIChat: false})
```

## How to Extend

### Custom dashboard

```javascript
AppShell.render({
    dashboardExtras: function(allData) {
        // allData = {schema1: [...items], schema2: [...items]}
        return React.createElement('div', {className: 'mt-8'},
            React.createElement('h2', {className: 'text-xl font-bold mb-4'}, 'Custom Analytics'),
            React.createElement(SvgBarChart, {
                data: allData.order.map(function(o) {
                    return {label: o.display_name, value: o.total_amount}
                }),
                title: 'Revenue by Order'
            })
        );
    },
})
```

### Custom detail view extras

```javascript
AppShell.render({
    detailExtras: {
        'booking': function(item) {
            return React.createElement('div', {className: 'flex gap-2 mt-4'},
                React.createElement('button', {
                    onClick: function() {
                        services.email.send({
                            to: item.guest_email,
                            subject: 'Booking Confirmed',
                            bodyHtml: '<p>Your booking is confirmed!</p>'
                        }).then(function() {
                            showToast('Email sent!', 'success')
                        }).catch(function(err) {
                            showToast('Failed: ' + err.message, 'error')
                        });
                    },
                    className: 'px-4 py-2 rounded-xl text-sm font-semibold',
                    style: {background: 'var(--supero-100)', color: 'var(--supero-700)'}
                }, 'Send Confirmation')
            );
        }
    },
})
```

### Declarative action buttons (no code)

```javascript
AppShell.render({
    actionButtons: {
        'booking': [
            {
                label: 'Email Guest',
                service: 'email',
                emailField: 'guest_email',
                subject: 'Booking Update — {{guest_name}}',
                bodyTemplate: 'Hi {{guest_name}}, your booking is confirmed!'
            },
            {
                label: 'SMS Guest',
                service: 'sms',
                phoneField: 'guest_phone',
                bodyTemplate: 'Your booking {{name}} is confirmed.'
            },
        ]
    },
})
```

### Custom card rendering

```javascript
AppShell.render({
    customCards: {
        'property': function(props) {
            var item = props.item;
            return React.createElement('div', {
                onClick: props.onPress,
                className: 'rounded-2xl overflow-hidden shadow-lg cursor-pointer group'
            },
                React.createElement('div', {className: 'h-48 overflow-hidden'},
                    React.createElement('img', {
                        src: resolveImageUrl(item.cover_photo),
                        className: 'w-full h-full object-cover group-hover:scale-105 transition-transform'
                    })
                ),
                React.createElement('div', {className: 'p-4'},
                    React.createElement('h3', {className: 'font-bold'}, item.display_name),
                    item.description && React.createElement('p', {
                        className: 'text-sm text-gray-500 mt-1'
                    }, item.description),
                    React.createElement('span', {
                        className: 'text-lg font-bold',
                        style: {color: 'var(--supero-700)'}
                    }, formatCurrency(item.price))
                )
            );
        }
    },
})
```

### Declarative card template (no code)

```javascript
// In TABS definition — supero-ui.js renders it automatically:
{
    id: 'properties', label: 'Properties', icon: 'home', schema: 'property',
    cardTemplate: {
        image: 'cover_photo',
        title: 'property_name',
        subtitle: 'location',
        price: 'price_per_night',
        priceSuffix: '/night',
        badge: 'status',
        ribbon: 'property_type',
        metrics: ['bedrooms', 'rating'],
    },
    attrs: [...]
}
```

### Full page replacement

```javascript
// Replace app.js entirely with your own React app
// Keep: config.js, supero-ui.js (for client + services + formatters)
// Replace: everything in AppShell.render() or skip AppShell entirely

var myClient = new SuperoClient();
myClient.login(myClient.domain, 'user@example.com', 'password', myClient.project)
    .then(function() {
        var root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(React.createElement(MyCustomApp));
    });
```

## Testing

```bash
# Start the app
./run.sh

# App runs at http://localhost:5648 (or PORT from .env)
# API proxied to Supero platform automatically
# Login with credentials from setup.py seed data (check USERS list)

# CRUD smoke tests run automatically before server launch.
# Skip them with: ./run.sh --skip-tests
# Run them manually: python crud_tests.py
```

## API Reference

```
Base URL: (proxied through ui/server.py — no hardcoding needed)

Auth:
  POST /api/v1/auth/login           {domain_name, email, password, project}
  POST /api/v1/auth/signup          {email, password, full_name, domain, project}
  POST /api/v1/auth/switch-project  {project_name, tenant_name}
  GET  /api/v1/auth/policy          (refresh current user's access policy)

CRUD:
  GET    /api/v1/crud/{domain}/{schema}              List (supports ?limit=N&offset=N)
  POST   /api/v1/crud/{domain}/{schema}              Create
  GET    /api/v1/crud/{domain}/{schema}/{uuid}       Read
  PUT    /api/v1/crud/{domain}/{schema}/{uuid}       Update
  DELETE /api/v1/crud/{domain}/{schema}/{uuid}       Delete

  Namespaced: /api/v1/crud/{domain}/{namespace}:{schema}  (when schema has namespace)

Services:
  POST /api/v1/services/execute     {service_id, operation, input, domain, project_uuid}

Files:
  POST /api/v1/files/{domain}/upload        Upload single file (multipart)
  POST /api/v1/files/{domain}/upload/batch  Upload multiple files (multipart)

AI:
  POST /ai/v1/chat                  {message, session_id, stream: true}
  GET  /ai/v1/health                Health check

Public (no auth required):
  GET  /api/public/{schema}         List public schema objects
```

## CLI Flags

The `./run.sh` script passes all flags through to `python -m supero.cli`:

```bash
./run.sh                    # Interactive bootstrap + start server
./run.sh --setup-only       # Bootstrap without starting server
./run.sh --server-only      # Start server (skip bootstrap)
./run.sh --reset            # Re-upload schemas and re-run bootstrap
./run.sh --docker           # Build and run with Docker Compose
./run.sh --no-interactive   # Use .env values without prompting
./run.sh --verbose          # Show detailed logs
./run.sh --skip-tests       # Skip CRUD smoke tests
```

All commands log to `.supero-run.log` for debugging.
