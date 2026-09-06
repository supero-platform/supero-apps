# Quickstart

Clone a production app onto a domain you own, and run it. About 5 minutes.

You need Python 3.9+ (or Docker). You do **not** need an account, an invite, or a card.

---

## 1. Clone

```bash
git clone https://github.com/supero-platform/supero-apps
cd supero-apps/apps/healthcare/lumen
```

Any app works. `lumen` is a clinic — booking, e-signed consent, and clinical notes that
only providers can read.

## 2. Claim a domain

```bash
cp .env.example .env
```

Open `.env` and set three things:

```bash
SUPERO_DOMAIN=acme-clinic          # any free name — this becomes yours
SUPERO_ADMIN_EMAIL=you@example.com # your admin login
SUPERO_PASSWORD=<a strong password># REQUIRED — do not leave blank
```

> **Set `SUPERO_PASSWORD`.** There is no default — the app refuses to start until you set
> it, so it can never boot with a well-known credential.

A **domain** is your isolated slice of the platform — your data, your users, your roles.
Nothing you create is visible to anyone else's domain. The first run registers it to you.

## 3. Run

```bash
./run.sh
```

First run takes a couple of minutes. It:

1. creates `.venv` and installs the [`supero`](https://pypi.org/project/supero/) SDK
2. registers `SUPERO_DOMAIN` to you
3. uploads `schemas.py` — your APIs are generated from this
4. runs `setup.py` — seed data, roles, access policies
5. serves the app

Open **http://localhost:5663** and sign in with the email/password from `.env`.

Docker works the same:

```bash
docker compose up
```

## 4. Look at what you got

Sign in as admin and you have a working clinic: patients, providers, appointments,
consent forms, clinical notes — plus dashboards and an admin panel you didn't build.

Now sign out and register as a patient. **You cannot see clinical notes.** Not because
`app.js` hides them — because the server refuses to send them. That rule lives in
`setup.py`, not in the UI. See [schemas.md](schemas.md#field-level-access).

---

## Make it yours

### Change the data model

Open `schemas.py` — around 100 lines. Find the `Patient` object and add an attribute
(note the real field names: `mandatory`, not `required`):

```python
{
    "schema_type": "object", "name": "Patient", "namespace": "lumen", "parent_type": "tenant",
    "attributes": [
        {"name": "email",     "type": "string", "mandatory": True, "unique": True},
        {"name": "allergies", "type": "string"},        # ← new
    ],
}
```

```bash
./run.sh --reset
```

The API, validation, admin forms, and typed SDK all pick it up. You didn't write a
migration, a route, or a form.

### Change the screens

`ui/app.js` is the only UI file you edit. Save, refresh. No build, no bundler, no
`npm install` — React and Tailwind come from CDN.

Everything else in `ui/` is restored from the SDK on each run. Don't edit it; it'll be
overwritten.

### Change what's turned on

`config.py`:

```python
services: list = field(default_factory=lambda: ["ai", "email", "payments", "workflows"])
```

See [services-and-workflows.md](services-and-workflows.md).

---

## Run the tests

```bash
./tests/run_tests.sh
```

Each app ships `crud_tests.py`, `integration_tests.py`, and `e2e_tests.py` that run
against *your* domain.

---

## Troubleshooting

**Port already in use** — change `PORT` in `.env`. Each app uses a different one so you
can run several at once.

**"domain already exists"** — someone took that name. Pick another.

**Want to start over** — `./run.sh --reset` re-runs bootstrap. To wipe the domain
entirely, delete it from the admin panel.

---

## Next

- [Build with Claude over MCP](mcp.md) — have your AI edit the app
- [Schemas](schemas.md) — inheritance, encryption, field-level access
- [Deploy](deploy.md) — get off localhost
