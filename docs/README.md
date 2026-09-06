# Docs

Nine guides. Start wherever your question is.

The README links here as "Platform docs", and without this file GitHub rendered a bare
alphabetical file listing starting at `admin-panel.md` — which is neither where you should
start nor a useful description of anything.

## Start here

| Guide | Read it when |
|---|---|
| [quickstart.md](quickstart.md) | You want one app running against a domain you own, in about two minutes |
| [architecture.md](architecture.md) | You want to know what runs where, and what is open vs hosted |
| [schemas.md](schemas.md) | You are defining a data model — attributes, types, relations, access rules |

## Building

| Guide | Covers |
|---|---|
| [api-reference.md](api-reference.md) | Auth, CRUD paths, and the SDK equivalents. Note the casing rule: the SDK takes `Provider`, the URL takes `provider` |
| [services-and-workflows.md](services-and-workflows.md) | The service catalogue, and workflows as declared sagas with compensation |
| [admin-panel.md](admin-panel.md) | Users, API keys, connectors, monitoring |
| [mcp.md](mcp.md) | Connecting an AI editor to the platform. 64 tools |

## Shipping

| Guide | Covers |
|---|---|
| [deploy.md](deploy.md) | Deployment targets and what each one costs you in complexity |
| [deploy-to-cloud.md](deploy-to-cloud.md) | Containers, images, and running it in your own cloud |

## Check the claims rather than trusting them

The access-control claims in these pages are the ones worth verifying, and
[`verify/`](../verify/) does it in about ten seconds against the live demo, with no signup:

```bash
cd ../verify && ./02-rbac-enforcement.sh
```

It compares one claim record fetched by two roles and shows the staff-only fields present
for one and absent for the other. It also aborts rather than reporting success if the
privileged account cannot see those fields — because then "absent for the other role" would
only mean the column was empty.

## The fuller versions

Each page here is the short form. Every one links to its counterpart on
[docs.supero.dev](https://docs.supero.dev), which carries the complete reference — including
the [full MCP tool reference](https://docs.supero.dev/developers/mcp/tool-reference) for all
64 tools, and [long-form articles](https://docs.supero.dev/articles/field-level-permissions-order-by)
on the problems these apps are built around.
