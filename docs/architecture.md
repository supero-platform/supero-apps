# How it works

A developer-level mental model of what happens between `schemas.py` and a running app.

This describes the platform as you **observe and use** it — the contract, not the
implementation. The platform internals are a managed service; what's below is everything
you need to reason about, debug, and predict behaviour.

---

## The shape

```
  YOU WRITE                    THE PLATFORM GIVES YOU              YOU GET BACK
  ─────────                    ──────────────────────              ────────────
  schemas.py     ──upload──▶   REST resources per type      ──▶    /api/v1/crud/{domain}/{type}
  (data model)                 validation                          400 on bad input
                               a typed SDK                         autocomplete
                               admin CRUD screens                  app.supero.dev

  setup.py       ──upload──▶   policy engine                ──▶    row scoping
  (roles+policies)             role→permission map                 field stripping
                               seed data, workflows                approval chains

  config.py      ──────────▶   services switched on         ──▶    ai, email, payments…
  ui/app.js      ──served──▶   your screens                 ──▶    the app people use
```

Everything except `ui/app.js` is **declared, not coded**. You describe the shape; the
platform enforces it.

## The request path

When your UI (or curl, or an AI agent over MCP) calls the API:

```
  request + credential
        │
        ▼
  ① authenticate      →  who are you? which domain / project / tenant?
        │                 (JWT, or an X-API-Key scoped to one project)
        ▼
  ② resolve schema    →  what is "Appointment" in THIS domain?
        │                 (your tenant type, its base types, inherited fields)
        ▼
  ③ apply policy      →  what may THIS role do to THIS type?
        │                 row scoping + field stripping happen here
        ▼
  ④ execute           →  read/write
        │
        ▼
  ⑤ serialize         →  only the fields this role may see
```

The important step is **③ before ⑤**. Access rules are applied on the server, before the
response is built — not filtered by your UI afterwards. That's the whole reason a patient
can call `GET /api/v1/crud/{domain}/appointment` with a perfectly valid token, via curl,
with no UI at all, and get back appointments with `clinical_notes` absent. The field isn't
hidden by the client; the server removes it before writing the response.

## Multi-tenancy: the nesting

Four levels, each a boundary:

```
  Domain            your isolated slice — "acme-clinic". Nothing crosses this line.
   └─ Project       a namespace inside it — "lumen", "billing"
       └─ Tenant    a customer/workspace inside the project
           └─ Rows  scoped further by policy (e.g. owner_username = you)
```

You get isolation from the structure, not from remembering to write a filter. A query in
one domain cannot see another domain's data — that's the platform's job, not your app's.
Within a tenant, `filter_field` narrows further (each patient sees their own appointments).

## Schema inheritance: System → Public → Tenant

Three tiers, most-specific wins:

```
  System        platform base types (identity, files, audit primitives)
     ▲
  Public        shared, reusable types (base_customer, base_order…)
     ▲
  Tenant        YOUR types — extend a base, or define your own
```

```python
{"schema_type": "object", "name": "Customer", "extends": "base_customer",
 "attributes": [{"name": "loyalty_tier", "type": "string"}]}
```

You inherit the base's fields and behaviour and add yours. Platform improvements to the
base flow through without you rewriting. This is why an app's `schemas.py` is ~100 lines
instead of 1,000 — you're describing the delta, not the world.

## Policies: two mechanisms

Declared in `setup.py`, enforced server-side:

```python
PolicyDef(role="tenant_user", default_access="none", rules=[
    PolicyRule(entity="appointment", can_read=True, can_create=True,
               filter_field="owner_username", filter_match="$user.name",   # ① row scoping
               hidden_fields=["clinical_notes", "diagnosis"]),             # ② field stripping
])
```

- **Row scoping** — which *records* this role may touch.
- **Field stripping** — which *columns* are removed from the response.

`default_access="none"` means deny-by-default for **writes**: a role cannot create, update
or delete until a rule grants it.

**Reads are different, and this is the sentence to read twice.** Entity-level read
enforcement is a separate, opt-in gate that is **off by default**. With it off, an entity
you never wrote a rule for is **readable**, not denied. Forgetting a rule therefore fails
*open* on reads.

What still applies to reads, regardless of that gate — and what the scripts in
[`verify/`](../verify/) actually check:

| Mechanism | Applies to reads by default? |
|---|---|
| `hidden_fields` — column stripping | **Yes.** The field is removed from the response. |
| `filter_field` — row scoping | **Yes.** You see only rows matching the filter. |
| Tenant isolation | **Yes.** Another tenant's record is refused. |
| `default_access="none"` denying an **unlisted entity** on read | **No.** Off by default. |

So: declare a rule for every entity you expose, and do not rely on the absence of a rule to
protect it. If you need an entity to be unreadable, say so explicitly rather than omitting
it — and assert it in a test against your own deployment.

## Services and workflows

`config.py` switches capabilities on (`ai`, `email`, `payments`, `workflows`, `files`).
Workflows are declarative too — a trigger, conditions, approval steps, service calls. State,
retries, and audit are the platform's problem; approvals respect the same roles as
everything else. See [services-and-workflows.md](services-and-workflows.md).

**The AI is not a bypass.** An AI service answering questions over your data is subject to
the same policies as the user asking — it cannot read a field the asker couldn't. That's
deliberate: an assistant shouldn't become an exfiltration path.

## What's open, what's a service

Being explicit, since it's the question people ask:

| Layer | Status |
|---|---|
| Your app source (`schemas.py`, `setup.py`, `ui/app.js`) | **MIT — in this repo** |
| The `supero` SDK (the client) | **MIT — [on PyPI](https://pypi.org/project/supero/)** |
| Schema resolution, policy engine, multi-tenant runtime, orchestration | **managed service** |

Steps ①–⑤ above run on the platform. That's the trade: you skip building and operating a
backend; in exchange the backend is a service. Teams needing it inside their own network
run self-managed under an enterprise agreement — see [deploy.md](deploy.md).

## Where to look in the code

The model above is easiest to *see* in a running app:

| To understand | Read |
|---|---|
| the data model | `apps/healthcare/lumen/schemas.py` |
| field stripping in practice | `apps/healthcare/lumen/setup.py` — the `PolicyDef` block |
| an approval saga | `apps/insurance/sentinel/setup.py` |
| permission-scoped AI | `apps/customer-support/concierge/config.py` |
| the API surface | [api-reference.md](api-reference.md) |

Best way to believe the field-stripping claim: run `lumen`, sign in as the patient, and
`curl` the appointment endpoint with their token. The notes aren't there.

---

📖 **This page is the short version.** For the full architecture reference, see [docs.supero.dev/developers/overview/architecture](https://docs.supero.dev/developers/overview/architecture).
