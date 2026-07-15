# Deploy your app to your own cloud

Every app here ships a `Dockerfile`. It's an ordinary stateless container — so it runs
anywhere containers run: Cloud Run, ECS/Fargate, Fly, Render, a VM, your own Kubernetes.

**What runs where.** Worth being clear before you start:

| Piece | Where it runs | Who operates it |
|---|---|---|
| **Your app** (this container) | your cloud, your account | **you** |
| **The platform** (`SUPERO_URL`) | hosted at `api.supero.dev` | Supero |

So "deploy to AWS" means *your app container* runs in your AWS account and calls the
platform over HTTPS. You own the app, the domain, and the data; you don't operate the
backend. (Teams that need the platform inside their own network: see
[deploy.md](deploy.md#3-self-managed--on-prem).)

---

## The one thing to get right: bootstrap once, then serve

`./run.sh` does **two** jobs — bootstrap (register the domain, upload schemas, seed data,
wire roles) and then serve. That's perfect on your laptop and **wrong for a cloud service
that scales**: every new container would re-run bootstrap.

Split them:

```bash
./run.sh --setup-only     # once — bootstrap your domain (locally or as a one-off job)
./run.sh --server-only    # in the cloud — just serve, no bootstrap
```

So for cloud, override the container command to `--server-only --no-interactive`. Do the
`--setup-only` pass once from your laptop first — that's what creates your domain and
schemas.

## Environment variables

Same set everywhere. Never bake secrets into the image — use your platform's secret store.

| Var | Value | Secret? |
|---|---|---|
| `SUPERO_URL` | `https://api.supero.dev` | no |
| `SUPERO_DOMAIN` | your domain name | no |
| `SUPERO_PROJECT` | e.g. `lumen` | no |
| `SUPERO_ADMIN_EMAIL` | your admin login | no |
| `SUPERO_PASSWORD` | **required** — app refuses to boot without it | 🔒 **yes** |
| `SUPERO_API_KEY` | project-scoped key (preferred for headless) | 🔒 **yes** |
| `PORT` | the port to listen on | no |

> Prefer `SUPERO_API_KEY` over `SUPERO_PASSWORD` for anything running unattended — it's
> scoped to one project and you can revoke it without changing your admin login.

---

## Google Cloud Run

Cloud Run injects its own `PORT` and expects you to listen on it.

```bash
cd apps/healthcare/lumen
./run.sh --setup-only            # once, from your laptop

gcloud run deploy lumen \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --set-env-vars SUPERO_URL=https://api.supero.dev,SUPERO_DOMAIN=your-domain,SUPERO_PROJECT=lumen,SUPERO_ADMIN_EMAIL=you@example.com,PORT=8080 \
  --set-secrets SUPERO_API_KEY=supero-api-key:latest,SUPERO_PASSWORD=supero-password:latest \
  --command ./run.sh --args --server-only,--no-interactive
```

Create the secrets first:
```bash
echo -n "ak_your_key" | gcloud secrets create supero-api-key --data-file=-
```

## AWS ECS / Fargate

Build and push, then run the image as a service.

```bash
cd apps/healthcare/lumen
./run.sh --setup-only

aws ecr create-repository --repository-name lumen
docker build -t lumen .
docker tag lumen:latest <acct>.dkr.ecr.<region>.amazonaws.com/lumen:latest
docker push <acct>.dkr.ecr.<region>.amazonaws.com/lumen:latest
```

In the task definition:
- **command**: `["./run.sh","--server-only","--no-interactive"]`
- **portMappings**: `containerPort: 5663` (or set `PORT` and match it)
- **environment**: `SUPERO_URL`, `SUPERO_DOMAIN`, `SUPERO_PROJECT`, `SUPERO_ADMIN_EMAIL`, `PORT`
- **secrets**: `SUPERO_API_KEY`, `SUPERO_PASSWORD` from Secrets Manager / SSM
- put it behind an ALB targeting the container port

## Fly.io

```bash
cd apps/healthcare/lumen
./run.sh --setup-only
flyctl launch --no-deploy          # generates fly.toml from the Dockerfile

flyctl secrets set SUPERO_API_KEY=ak_your_key SUPERO_PASSWORD='your-strong-password'
flyctl deploy
```

In `fly.toml`:
```toml
[env]
  SUPERO_URL = "https://api.supero.dev"
  SUPERO_DOMAIN = "your-domain"
  SUPERO_PROJECT = "lumen"
  SUPERO_ADMIN_EMAIL = "you@example.com"
  PORT = "5663"

[experimental]
  cmd = ["./run.sh", "--server-only", "--no-interactive"]

[[services]]
  internal_port = 5663
```

## Render

New → Web Service → point at your fork, Runtime **Docker**.

- **Docker Command**: `./run.sh --server-only --no-interactive`
- **Environment**: the vars above; mark `SUPERO_API_KEY` / `SUPERO_PASSWORD` as secret
- Render sets `PORT` — make sure the app's `PORT` matches it

## Anywhere else / Kubernetes

It's a plain container. Give it the env vars, run
`./run.sh --server-only --no-interactive`, expose the port. Nothing else is special —
there's no sidecar, no database to provision, no volume to mount (your data lives in your
Supero domain, reachable over the API).

---

## Operating notes — the honest bits

- **Health checks measure the app, not the platform.** The bundled `HEALTHCHECK` curls the
  container's own port. It will report **healthy even if `api.supero.dev` is unreachable**,
  because the shell serves fine without it. If you want your orchestrator to react to
  platform outages, add a probe that hits `$SUPERO_URL` too — and decide deliberately
  whether an upstream blip should cycle your containers (usually it shouldn't).
- **The app is a client.** If the platform is down, your app serves but can't read or write
  data. Plan your status page accordingly.
- **Scaling is free-ish.** The container is stateless, so scale horizontally as you like —
  just make sure only the one-off `--setup-only` pass ever bootstraps.
- **Reproducible builds.** `requirements.txt` pins the SDK (`supero==3.5.946`) and `run.sh`
  installs from it, so a rebuild in six months gets the same SDK. Bump it deliberately.
- **Costs.** You pay your cloud for the container; you pay Supero for platform usage. See
  [pricing](https://www.supero.dev/pricing).

## Custom domain

Point your domain at whatever you deployed (Cloud Run/ECS/Fly/Render all support custom
domains). Nothing in the app is tied to `*.supero.live` — that's only for apps you ship to
the managed URL. See [deploy.md](deploy.md).
