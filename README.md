<div align="center">

# Supero Apps

**19 applications. Full source. Clone one onto your own domain and run it.**

Every app in this repo is **running live right now** — and this is the code behind it.
Multi-tenant, role-based, schema-driven. No npm, no build step. MIT app source, open SDK,
your data exportable over the API — see [how this works, honestly](#how-this-works-honestly).

[Live apps](https://www.supero.dev/apps) · [Quickstart](docs/quickstart.md) · [Build with Claude](docs/mcp.md) · [Platform docs](docs/)

[![PyPI](https://img.shields.io/pypi/v/supero.svg)](https://pypi.org/project/supero/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.9%2B-blue.svg)](https://www.python.org/downloads/)

</div>

---

## See it before you install it

[**lumen.supero.live**](https://lumen.supero.live) is one of the 19, running the code in
[`apps/healthcare/lumen`](apps/healthcare/lumen). The login page lists every demo account
with its role and password — click one and you are in. No signup, nothing to install.

Sign in as the front-desk user, then sign out and back in as the patient. The patient's
record is missing `clinical_notes` — and nothing in `ui/app.js` is doing that. The rule is
five lines in [`apps/healthcare/lumen/setup.py`](apps/healthcare/lumen/setup.py).

**Or check it from a terminal in ten seconds**, no signup, no clone of your own domain:

```bash
git clone https://github.com/supero-platform/supero-apps
cd supero-apps/verify && ./02-rbac-enforcement.sh
```

That script logs into the live insurance demo as a claims adjuster and as a
policyholder, finds one claim both can see, and compares the two responses. The
adjuster gets `fraud_score` and `internal_notes`; the policyholder gets the same
record without them. [`verify/`](verify/) explains what it proves — and what it
does not.

---

## Then run it yourself, in about two minutes

**New here? Start with `lumen`** — it is the smallest app in the repo and the one the docs
follow.

```bash
git clone https://github.com/supero-platform/supero-apps
cd supero-apps/apps/healthcare/lumen

cp .env.example .env    # set SUPERO_DOMAIN, SUPERO_ADMIN_EMAIL and SUPERO_PASSWORD
./run.sh
```

`run.sh` creates a venv, installs the `supero` SDK, registers your domain, uploads the
schemas, seeds demo data, wires up roles — then serves the app at `http://localhost:5663`.

That takes **about 90 seconds** on a cold machine with an empty pip cache — roughly 10
seconds of install and 60-odd of platform setup. Call it two minutes with the time it takes
you to fill in `.env`.

**You do not need an account, an invite, or a credit card.** Domain registration is open.
The name you put in `SUPERO_DOMAIN` becomes yours if it's free.

> Prefer containers? `docker compose up` works identically.

---

## The apps

Each one is a complete, multi-tenant application — public storefront *and* admin panel,
with role-based access enforced on the server, not in the UI.

### 🩺 Healthcare & Life Sciences

| App | What it is | Live |
|---|---|---|
| [**Lumen Health**](apps/healthcare/lumen) | Book care online, e-sign consent, clinical notes kept provider-only via field-level access | [lumen.supero.live](https://lumen.supero.live) |
| [**BrightSmile**](apps/healthcare/brightsmile) | Dental practice — online booking, treatment plans, provider-only clinical notes | [brightsmile.supero.live](https://brightsmile.supero.live) |
| [**TrialCore**](apps/life-sciences/trialcore) | Clinical trials — public study registry, enrollment dashboards, adverse-event workflows | [trialcore.supero.live](https://trialcore.supero.live) |

### 💰 Finance & Insurance

| App | What it is | Live |
|---|---|---|
| [**Ledgerline**](apps/fintech/ledgerline) | Billing — live MRR dashboards, automated dunning, multi-step expense approvals | [ledgerline.supero.live](https://ledgerline.supero.live) |
| [**Sentinel**](apps/insurance/sentinel) | Insurance — **two insurers on one deployment**, public quote portal, claims approval sagas, insurer-only fraud scores | [sentinel.supero.live](https://sentinel.supero.live) |

### 🛍️ Commerce & Sales

| App | What it is | Live |
|---|---|---|
| [**Atelier**](apps/marketplace/atelier) | B2B wholesale marketplace — discovery storefront, multi-brand cart, net-terms checkout | [atelier.supero.live](https://atelier.supero.live) |
| [**Summit CRM**](apps/crm/summit) | Pipeline kanban, weighted forecasting, lead conversion, win-rate analytics | [summit.supero.live](https://summit.supero.live) |
| [**Amplify**](apps/marketing/amplify) | Social marketing — connect channels, compose with AI, schedule, track engagement | [amplify.supero.live](https://amplify.supero.live) |

### 🔐 Multi-tenant (one deployment, many organisations)

Every app above runs a single organisation. These four run several at once, and the
isolation is enforced by the server: a user signed into one tenant cannot read another
tenant's rows even by calling the API directly with their own valid token. Two of them
also demonstrate field-level access control on top of that, so a row you *can* read
still arrives with fields removed.

| App | What it is | Tenants | Live |
|---|---|---|---|
| [**Medora**](apps/healthcare/medora) | Hospital network — appointments, encounters, prescriptions, labs, invoicing. A patient reads their own encounter with `assessment` and `plan` stripped server-side | 3 hospitals | [medora.supero.live](https://medora.supero.live) |
| [**Helix**](apps/life-sciences/helix) | Multi-site clinical trials — participants, visits, adverse events. The treatment `arm` is withheld from blinded investigators by the access policy, not by the UI | 3 sites | [helix.supero.live](https://helix.supero.live) |
| [**Lattice**](apps/real-estate/lattice) | Property management — units, leases, rent, maintenance, applications. Applicants cannot read the leasing team's screening notes | 3 managers | [lattice.supero.live](https://lattice.supero.live) |
| [**Pulse**](apps/fitness/pulse) | Multi-location gym — classes, bookings, memberships, check-ins | 3 locations | [pulse.supero.live](https://pulse.supero.live) |

Sign in on any of them and the login page lists every demo account with its tenant,
role and password — click a row to fill the form.

### 🏢 Operations & Services

| App | What it is | Live |
|---|---|---|
| [**Concierge AI**](apps/customer-support/concierge) | Support — AI help center grounded in your KB, agent console with suggested replies | [concierge.supero.live](https://concierge.supero.live) |
| [**FieldOps**](apps/field-service/fieldops) | Dispatch board, mobile work orders, photo capture, on-site e-signature | [fieldops.supero.live](https://fieldops.supero.live) |
| [**Relay**](apps/mobility/relay) | Per-diem healthcare staffing — facilities post shifts, clinicians claim them, with credential verification and timesheets | [relay.supero.live](https://relay.supero.live) |
| [**Tavola**](apps/hospitality/tavola) | Restaurant — online ordering, reservations, loyalty, live kitchen board | [tavola.supero.live](https://tavola.supero.live) |
| [**PulseFit**](apps/fitness/pulsefit) | Gym chain — class booking, memberships, attendance, multi-location | [pulsefit.supero.live](https://pulsefit.supero.live) |

### 🏡 Property & Media

| App | What it is | Live |
|---|---|---|
| [**Haven**](apps/real-estate/haven) | Listings search, tour booking, offers with broker approval | [haven.supero.live](https://haven.supero.live) |
| [**Backlot**](apps/media/backlot) | Film production — slate, cast & crew, call sheets, AI script breakdown | [backlot.supero.live](https://backlot.supero.live) |

---

## Build it with your AI

Every app ships a `CLAUDE.md` (and `.cursorrules` / `.windsurfrules`) so your assistant
understands the codebase before it touches a line.

You can also connect your editor directly to the platform over **MCP** and have it design
schemas, generate UI, and deploy:

```bash
claude mcp add --transport http supero https://api.supero.dev/mcp/v1/messages \
  --header "X-API-Key: ak_your_key_here"
```

Then just ask:

> *"Add a waitlist to the clinic app — patients join, staff promote them when a slot opens."*

See [docs/mcp.md](docs/mcp.md) for getting a key and the full tool list.

---

## What you actually get

Two things, and it's worth being precise about which is which.

**From `schemas.py` (~100 lines), automatically — no code:**

| You write | The platform generates |
|---|---|
| a data model | REST APIs, a typed SDK, validation, migrations |
| access policies in `setup.py` | role-based access **enforced server-side** |
| `config.py` | an admin panel, auth, and the services you switch on |

**`ui/app.js` is the one part that's real code you own.** It's the app's custom
storefront — around 500 lines of React, generated by the AI as a working starting point,
then yours to edit however you like. So you get the tedious 80% (APIs, auth, admin, RBAC)
for free, *and* a real front-end you control — not a locked template.

**Access control is declared in `setup.py`, and the server applies it — not the UI.** You
write row scoping (`filter_field="owner_username"`) and field hiding
(`hidden_fields=["clinical_notes", "diagnosis"]`). A patient calling the API directly with
their own valid token — curl, browser closed, front-end out of the picture:

```
GET /api/v1/crud/<your-domain>/appointment
```

gets their appointments back with `clinical_notes` **absent from the response body**.
Nothing in `ui/app.js` is doing that — delete the entire front-end and the field still does
not come back. That's why `lumen` keeps clinical notes provider-only and `sentinel` hides
fraud scores from claimants without either app writing a line of access-control logic.

Two things worth being precise about, because they decide whether you can rely on this:

- **It covers the entities you declare in your own schemas.** Platform-managed types —
  accounts, API keys, domains, projects, tenants — are governed by role permissions instead.
  That is a different mechanism, and `hidden_fields` does not extend to them.
- **It is a server-side response filter, not a database-level projection.** The field is
  removed before the response is written, not withheld from the query.

Open their `setup.py` — the policy block is short, and it's the thing worth checking first.
Then check it against your own deployment rather than taking this page's word for it.

**Zero build.** React and Tailwind load from CDN. No `node_modules`, no bundler, no
`npm install`. Edit `ui/app.js`, refresh the page.

Each app carries real functional tests — `crud_tests.py`, `integration_tests.py`,
`e2e_tests.py`, `workflow_tests.py` — that run against *your* domain:

```bash
cd apps/healthcare/lumen && ./tests/run_tests.sh
```

## How this works, honestly

**This is open-core, and we'd rather say so plainly than have you find out.**

- **The app source in this repo is MIT — genuinely yours.** Fork it, sell it, rip the UI out.
- **The `supero` SDK is MIT** and [open on PyPI](https://pypi.org/project/supero/).
- **The platform these apps call (`api.supero.dev`) is a hosted service.** Schema
  resolution, the multi-tenant runtime, RBAC enforcement, and orchestration run there.
  That part is not open source.

So an app here is a **thin, portable client** that calls the platform for schema
resolution, RBAC, and orchestration. That's the trade: you skip building and operating a
backend, and in return the backend is a managed service.

**Your data and your exit.** The domain, schema, and data are yours. Every record is
reachable through the same REST API the app uses, so export is a loop over
`GET /api/v1/crud/{domain}/{type}`
with your API key — nothing is trapped in a proprietary store you can't read. And for teams
that need to run inside their own network, **self-managed / on-prem deployment is available
under an enterprise agreement** (hello@supero.dev) — so "what if the vendor goes away" has a
real answer. See [deploy.md](docs/deploy.md).

**Regulated data — read this first.** These are **reference applications**, not certified
compliant systems. `lumen` and `trialcore` show the *shape* of healthcare access control;
they are **not HIPAA-certified and ship with no BAA**. Before putting real PHI, PII, or
regulated financial data into anything here, talk to us about compliance posture, data
residency, and a BAA — don't assume the demo covers it. See [SECURITY.md](SECURITY.md).

**Pricing.** There's a free tier (enough to run these), then usage-based. Real numbers are
on the [pricing page](https://www.supero.dev/pricing) — we don't hardcode them here because
they change.

---

## Anatomy of an app

```
apps/healthcare/lumen/
├── README.md            ← how to run this specific app
├── CLAUDE.md            ← context for AI assistants (also .cursorrules/.windsurfrules)
├── CUSTOMIZATION.md     ← branding, layout, services, admin panel
│
├── schemas.py           ← your data model            ~100 lines
├── setup.py             ← seed data, roles, policies
├── config.py            ← app name, services, tenants
├── .env.example         ← copy to .env, set your domain
│
├── run.sh               ← bootstrap + serve
├── Dockerfile           ← container image
├── docker-compose.yml   ← docker compose up
│
├── tests/               ← crud / integration / e2e
└── ui/
    └── app.js           ← your screens (the only UI file you edit)
```

Everything else in `ui/` — the component library, schema bindings, dev server — is restored
from the `supero` wheel on every `run.sh`. That's why it isn't committed here: it's a build
artifact, not source.

---

## Docs

| Guide | |
|---|---|
| [Quickstart](docs/quickstart.md) | Clone an app onto your own domain |
| [Build with Claude (MCP)](docs/mcp.md) | Connect Claude Code / Cursor / Copilot |
| [How it works](docs/architecture.md) | The mental model: schema → API → RBAC, multi-tenancy |
| [API reference](docs/api-reference.md) | Auth, CRUD, services, connectors, files, MCP |
| [Schemas](docs/schemas.md) | The data model, inheritance, field-level access |
| [Services & workflows](docs/services-and-workflows.md) | AI, email, payments, approval chains |
| [Admin panel](docs/admin-panel.md) | What you manage without writing code |
| [Deploy](docs/deploy.md) | Where to run it: managed URL vs your cloud vs enterprise |
| [Deploy to your cloud](docs/deploy-to-cloud.md) | Cloud Run, ECS/Fargate, Fly, Render — step by step |


---

## FAQ

**Do I need a Supero account?**
No. `./run.sh` registers the domain you name in `.env`. No signup wall.

**Is my data locked in?**
No. It's your schema and your domain. Apps run on your machine, your cloud, or a managed URL.

**What's the catch on the free tier?**
Usage limits. The [pricing page](https://www.supero.dev/pricing) has current numbers.

**Can I use these commercially?**
Yes — the app source here is MIT. Build on it, sell it, fork it.

**Where's the platform source?**
The [`supero` SDK](https://pypi.org/project/supero/) is MIT and open. The hosted platform
(generation, multi-tenant runtime, orchestration) is a managed service.

---

## Contributing

Issues and PRs welcome — app improvements, new verticals, doc fixes.
See [CONTRIBUTING.md](CONTRIBUTING.md).

Built something with Supero? Open a PR and add it to the gallery.

---

<div align="center">

**[supero.dev](https://www.supero.dev)** · [Live apps](https://www.supero.dev/apps) · [Issues](https://github.com/supero-platform/supero-apps/issues)

App source in this repo is MIT licensed.

</div>
