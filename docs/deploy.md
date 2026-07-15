# Deploy

## Where should this run?

Three options. Pick by how much you want to operate.

| | **Managed URL** | **Your own cloud** | **Self-managed** |
|---|---|---|---|
| **You run** | nothing | your app container | everything, in your network |
| **We run** | app + platform | the platform | — (licensed to you) |
| **Setup** | one click | a Dockerfile + env vars | an enterprise engagement |
| **Your app lives** | `*.supero.live` | AWS / GCP / Fly / your k8s | your infrastructure |
| **Data flows to** | Supero | Supero (from your app) | stays in your network |
| **Good for** | demos, MVPs, most apps | you want your own cloud, VPC, custom domain, CI/CD | data residency, air-gap, strict compliance |
| **Guide** | ↓ §1 | **[deploy-to-cloud.md](deploy-to-cloud.md)** | ↓ §3 |

**Rule of thumb:** start on the managed URL. Move to your own cloud when you need your own
VPC, custom domain, or deployment pipeline. Talk to us about self-managed when a compliance
or residency requirement makes the hosted platform a non-starter.

One distinction worth internalizing: **your app and the platform are separate things.**
Options 1 and 2 both use the hosted platform — they differ only in who runs the *app*
container. Only option 3 moves the platform itself.

## 1. Managed URL

Ship to a managed URL from the admin panel or over MCP. This is how every app in this repo
runs — `lumen.supero.live`, `atelier.supero.live`, and the rest.

Versioned and reproducible. Best default if you don't want to run infrastructure.

## 2. Your own container

Every app has a `Dockerfile` and `docker-compose.yml`:

```bash
docker compose up -d
```

**Step-by-step recipes for Cloud Run, ECS/Fargate, Fly, and Render:
[deploy-to-cloud.md](deploy-to-cloud.md).** In short — deploy the image anywhere containers
run, and set the same env vars from `.env`:

```
SUPERO_URL, SUPERO_DOMAIN, SUPERO_PROJECT, SUPERO_ADMIN_EMAIL, SUPERO_PASSWORD, SUPERO_API_KEY, PORT
```

The app is yours. The platform APIs it calls (`SUPERO_URL`) remain a hosted service.

## 3. Self-managed / on-prem

**Self-managed deployment is available for enterprise teams** that need to run inside their
own network — for data-residency, air-gap, or compliance reasons. It's a licensed
arrangement rather than something you set up from this repo, so the specifics (packaging,
requirements, security posture) come through sales: **hello@supero.dev**.

This is the answer to "what happens if the vendor goes away" and "can we keep data in our
own infrastructure" — yes, under an enterprise agreement.

## Before you go live

- [ ] `SUPERO_PASSWORD` is strong and unique — not the default
- [ ] Seed users in `setup.py` have had their demo passwords changed or removed
- [ ] `.env` is not committed (it's gitignored — keep it that way)
- [ ] `./tests/run_tests.sh` passes against your domain
- [ ] Access policies reviewed — sign in as each role and confirm what's visible
- [ ] API keys scoped to the project, not shared around

## Custom domain

Managed apps get `<name>.supero.live`. Bring your own domain from the admin panel.
