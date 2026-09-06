# Schemas

`schemas.py` is the source of truth. Everything else — REST APIs, validation, the typed SDK,
admin forms, migrations — is generated from it.

Everything below matches the **real field names the apps use**. Copy from a running app, not
from memory.

## The shape

A schema is a dict with `schema_type`, `name`, `namespace`, `parent_type`, and `attributes`.
This is a real object from `apps/healthcare/lumen/schemas.py`:

```python
{
    "schema_type": "object",
    "name": "Provider",
    "namespace": "lumen",
    "parent_type": "tenant",
    "description": "A clinician patients can browse and book.",
    "attributes": [
        {"name": "full_name",    "type": "string",  "mandatory": True},
        {"name": "credential",   "type": "string"},
        {"name": "specialty",    "type": "string",  "values": SPECIALTIES},
        {"name": "bio",          "type": "text"},
        {"name": "accepting_new","type": "boolean"},
        {"name": "photo",        "type": "Image"},
        {"name": "rating",       "type": "float"},
    ],
}
```

Note the real vocabulary: **`mandatory`** (not `required`), **`values`** for enums,
**`parent_type`** for hierarchy, **`schema_type`** and **`namespace`** on every object.

Upload it (`./run.sh` does this) and you get:

```
POST   /api/v1/crud/{domain}/provider
GET    /api/v1/crud/{domain}/provider/{id}
PUT    /api/v1/crud/{domain}/provider/{id}
DELETE /api/v1/crud/{domain}/provider/{id}
GET    /api/v1/crud/{domain}/provider?filters=...
```

plus validation, a typed SDK, and admin CRUD screens.

## Attribute fields

| Field | Meaning |
|---|---|
| `name` | attribute name |
| `type` | see types below |
| `mandatory` | `True` → required on create |
| `values` | list → constrains to an enum |

> `unique` is documented elsewhere in the ecosystem but **no app in this repo uses it**
> and we have not verified that it is enforced on the write path. It is left out here
> rather than described as something it may not do. If you need uniqueness, enforce it
> in your own code until you have tested otherwise.

## Types

`string` · `text` · `integer` · `float` · `boolean` · `date` · `datetime` · `json` ·
`Image` · `File`

That is the complete set, counted from all 19 apps in this repo:

```
string 657 · integer 85 · float 76 · text 62 · Image 42 · datetime 41
date 40 · boolean 26 · json 9 · File 3
```

**There is no `ref(<Schema>)` type.** An earlier version of this page said there was.
Relations are expressed one of two ways — see below.

## Relations

Two mechanisms, and the one you want is usually the first.

**Nesting, via `parent_type`.** `"parent_type": "tenant"` roots an object at the tenant —
that is what 106 of the schemas in this repo do. Point it at another object type to nest
instead: an `Appointment` with `"parent_type": "patient"` lives under a patient, which
drives scoping and cascade. A query scoped to one patient cannot leak another's rows.
This is the mechanism that carries access-control weight, so prefer it when the child
genuinely belongs to the parent.

**A plain reference attribute.** For a link that is not ownership, store the target's
uuid in an ordinary `string` attribute and name it for what it points at —
`user_account_uuid`, `appointment_uuid`, `service_uuid`. That is what the apps here do;
there is no special reference type to declare.

## Inheritance

Three tiers: **System → Public → Tenant.** Extend a platform base type with `extends`:

```python
{"schema_type": "object", "name": "Customer", "extends": "base_customer",
 "attributes": [{"name": "loyalty_tier", "type": "string"}]}
```

You inherit the base fields and behaviour and add your own; platform improvements to the
base flow through without a rewrite.

## Field-level access — the part worth understanding

This is what makes these apps real rather than demos, and it's the feature cynical reviewers
open `setup.py` to check. It's declared in **policies**, not in the schema:

```python
# apps/healthcare/lumen/setup.py
from supero.app_setup import PolicyDef, PolicyRule

PolicyDef(role="tenant_user", default_access="none", rules=[
    PolicyRule(entity="appointment", can_read=True, can_create=True, can_update=True,
               filter_field="owner_username", filter_match="$user.name",
               hidden_fields=["clinical_notes", "diagnosis", "internal_billing_code"]),
])
```

Two mechanisms, both enforced **server-side**:

- **Row scoping** — `filter_field="owner_username", filter_match="$user.name"` limits a
  patient to their own appointments.
- **Field hiding** — `hidden_fields=[...]` strips `clinical_notes`, `diagnosis`, and
  `internal_billing_code` from the response entirely.

The point: a patient calling `GET /api/v1/crud/{domain}/appointment` **with their own valid
token, via curl, bypassing the UI**, gets their appointments back with `clinical_notes`
absent from the response body. The server removes it before the response is written. That's
the difference between access control and a `display:none`.

`sentinel` hides fraud scores and internal notes from claimants the same way, and
`brightsmile` hides chart notes and diagnoses from patients. Those three —
`lumen`, `sentinel`, `brightsmile` — are the apps that use `hidden_fields`; the rest
scope by row (`filter_field`) rather than by field. Read their `setup.py` files, the
policy block is short.

`hidden_fields` strips a field from READ responses. Its counterpart `readonly_fields`
strips a field from create/update payloads — use that to stop a caller writing a field
they can see, such as a customer moving their own account to a higher plan.

## Encryption

The platform supports encrypting a field at rest. It's a per-field platform capability you
opt into; the demo apps in this repo rely on `hidden_fields` (above) for their access story
rather than at-rest encryption. If you're storing regulated data, read
[SECURITY.md](../SECURITY.md) before assuming any particular protection is on.

## Evolving a schema

Edit `schemas.py`, then:

```bash
./run.sh --reset
```

Additive changes (new attributes) are safe. Removing or retyping an attribute affects
existing data — read the [platform docs](https://www.supero.dev/platform) before doing it
against anything real.

---

📖 **This page is the short version.** For the full schema-design guide, see [docs.supero.dev/building-your-app/schema-design](https://docs.supero.dev/building-your-app/schema-design).
