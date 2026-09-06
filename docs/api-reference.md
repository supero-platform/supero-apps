# API reference

Every app in this repo talks to the platform two ways: the **Python SDK** (what `run.sh`
uses) and the **REST API** underneath it. Both are below. Base URL is `https://api.supero.dev`
unless you've been given another.

The SDK is the path the apps actually use, so start there; the REST section is the same
surface if you're calling from another language or curl.

---

## Auth

### Register a domain — no account needed

Registration is open. The domain name you pick becomes yours if it's free.

**SDK**
```python
from supero import register_domain

org = register_domain(
    domain_name="acme-clinic",
    admin_email="you@example.com",
    admin_password="a-strong-password",
)
```

**REST**
```
POST /api/v1/domains/register
{ "domain_name": "acme-clinic", "admin_email": "you@example.com", "admin_password": "..." }
```
Returns the tenant and an `auth` block with an access token.

### Log in

**SDK**
```python
from supero import Supero
org = Supero.login(domain_name="acme-clinic", email="you@example.com", password="...")
```

**REST**
```
POST /api/v1/auth/login
{ "domain_name": "acme-clinic", "email": "you@example.com", "password": "..." }
```
Returns an access token. Send it as `Authorization: Bearer <token>` on subsequent calls.

> Note: prefer `from supero import Supero` — it is explicit about what you are importing.
> A bare `from supero import *` works too on the `supero==3.6.4` these apps pin; it raised
> `AttributeError` on 3.5.x, which is what this note used to warn about.

---

## Schemas

```
POST /api/v1/schemas/upload      # upload your schemas.py definitions
```
```python
org.upload_schemas("schemas.py")   # SDK
```
See [schemas.md](schemas.md) for the schema format.

---

## CRUD

Once your schema is uploaded, every object type gets a REST resource. Paths are scoped to
your domain: `/api/v1/crud/{domain}/{type}`.

**Casing matters, and the two columns below differ on purpose.** In `schemas.py` you declare
a type as `Provider`. The SDK takes that name as you wrote it; the URL uses the snake_case
form. So `org.crud.list("Provider")` calls `GET /api/v1/crud/{domain}/provider`, and a
two-word type like `ClinicalNote` becomes `clinical_note` in the path.

| Operation | REST | SDK |
|---|---|---|
| Create | `POST /api/v1/crud/{domain}/{type}` | `org.crud.create("Type", {...})` |
| Read one | `GET /api/v1/crud/{domain}/{type}/{uuid}` | `org.crud.get("Type", uuid)` |
| List / query | `GET /api/v1/crud/{domain}/{type}?filters=...` | `org.crud.list("Type", filters={...})` |
| Update | `PUT /api/v1/crud/{domain}/{type}/{uuid}` | `org.crud.update("Type", uuid, {...})` |
| Delete | `DELETE /api/v1/crud/{domain}/{type}/{uuid}` | `org.crud.delete("Type", uuid)` |

All CRUD calls require `Authorization: Bearer <token>` (or an `X-API-Key`). **Access
policies from `setup.py` are applied server-side** — row scoping and field hiding happen
here, so what you get back depends on your role. See
[schemas.md → field-level access](schemas.md#field-level-access--the-part-worth-understanding).

### Listing & pagination

- Pass `include_total=true` to get `pagination.total` in the response; `result_count` is
  the size of the current page, not the total.
- List filters are **equality-only** on the wire today. The SDK's `field__gte`-style
  operators are applied client-side, not server-side — don't assume range filters run in
  the database.

---

## Services

Apps switch services on in `config.py` (`ai`, `email`, `payments`, `workflows`, `files`,
`slack`). At runtime they're invoked through:

```
POST /api/v1/services/execute                 # run a service operation
GET  /api/v1/services/workflows/config        # workflow definitions
GET  /api/v1/services/transactional-catalog   # available transactional services
```
See [services-and-workflows.md](services-and-workflows.md).

---

## Connectors

Attach an existing database and expose it through the same API:

```
GET   /api/v1/connectors/catalog
POST  /api/v1/connectors
POST  /api/v1/connectors/{id}/discover
POST  /api/v1/connectors/{id}/import
POST  /api/v1/connectors/{id}/enable
```

---

## Files

```
GET /api/v1/files/{domain}/{file_id}          # download
GET /api/v1/files/{domain}/{file_id}/thumb    # thumbnail
```

---

## MCP

The platform is also an MCP server, so an AI editor can drive all of the above. Endpoint,
auth, and tool list are in [mcp.md](mcp.md). Quick check:

```bash
curl https://api.supero.dev/mcp/v1/info
```

---

## Generating a typed SDK

```
POST /api/v1/sdks/generate     # returns a typed client for your schema
```
The platform can emit typed clients (Python, TypeScript, and more) from your uploaded
schema, so you get autocomplete and type-checking against your own data model.

---

## Errors

Standard HTTP status codes. Bodies are JSON with `error` and `message`:

```json
{ "error": "Unauthorized: User not found", "message": "User not found" }
```

| Code | Means |
|---|---|
| 400 | Bad request — missing/invalid fields |
| 401 | Not authenticated, or wrong credentials |
| 403 | Authenticated but not permitted (check your role / policies) |
| 404 | No such object |
| 405 | Wrong method for that path |

---

📖 **This page is the short version.** For the complete API reference, see [docs.supero.dev/developers/api-reference/overview](https://docs.supero.dev/developers/api-reference/overview).
