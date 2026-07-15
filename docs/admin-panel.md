# Admin panel

Every app has one at [app.supero.dev](https://app.supero.dev). You don't build it and you
don't deploy it — it reflects your schema.

## What you get without writing code

- **Data** — browse, search, edit every record; respects your roles
- **Users & roles** — invite, assign, disable
- **Schemas** — inspect the resolved model and its inheritance
- **API keys** — create, scope, revoke (this is where MCP keys come from)
- **Services** — configure AI, email, payments, storage credentials
- **Workflows** — see runs, retries, failures
- **Audit** — who did what, when
- **Connectors** — attach an existing database

## Roles

Apps here use a common set:

| Role | Typically |
|---|---|
| `domain_admin` | You. Everything. |
| `tenant_admin` | Staff — the operating team |
| `tenant_user` | End customer — patient, claimant, shopper |
| `developer` | API/SDK access |

Roles are enforced server-side. Changing a role in the admin panel changes what the API
returns — no redeploy.

## Two audiences per app

Most apps here serve both:

- a **public** surface — storefront, help center, quote portal, listings
- an **operator** surface — dispatch board, agent console, pipeline

`concierge` is the clearest example: a customer sees the help center and their own
tickets; an agent sees the queue, AI-suggested replies, macros, and analytics. Same app,
same data, different roles.
