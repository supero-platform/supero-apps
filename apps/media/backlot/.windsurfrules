# Backlot — AI assistant context

> Read this before editing. It describes **this app specifically**.

## What this app is

Film & TV production studio management — where stories get made. Browse the slate, run the shooting schedule, and send call sheets.

- **Core entities** (`schemas.py`): `Production`, `Person`, `Scene`, `ShootLocation`, `Assignment`
- **Services on** (`config.py`): `email`, `sms`, `ai`, `workflows`
- **Runs at** `http://localhost:5671` after `./run.sh`

## The UI pattern — read this first

This app has a **bespoke full-page UI**. `ui/app.js` (~800 lines of `React.createElement`)
hides the platform's default shell with `#root,#app{display:none!important}` and mounts its
**own** React tree into `#myapp-root` via `ReactDOM.createRoot(el).render(<App/>)`.

- **Edit the existing `App` component and its children in `ui/app.js`.** That is the entry point.
- **Do NOT call `AppShell.render()`** — that is the platform's *auto-render* path, which this
  app deliberately overrides. Calling it will fight the existing mount.
- **Do NOT re-declare** the globals injected before `app.js`: `React`, `ReactDOM`, `client`,
  `services`, `showToast`, `resolveImageUrl`, `ErrorBoundary`, `formatCurrency`, `formatDate`.
  Re-declaring them is a fatal `SyntaxError`.

## Files

| File | Edit? | What |
|---|---|---|
| `ui/app.js` | ✅ **yes** | the whole custom UI — the one file you change |
| `schemas.py` | ✅ yes | data model; after changes run `./run.sh --reset` |
| `setup.py` | ✅ yes | seed data, roles, **access policies** (`PolicyRule`), workflows |
| `config.py` | ✅ yes | app name, enabled services, seed users |
| everything else in `ui/` | ❌ no | regenerated from the SDK on `run.sh` |

## Data & access

- Read/write through the injected `client` (CRUD over `/crud/{domain}/{Type}`).
- Access rules live in `setup.py` as `PolicyRule(entity=..., can_read=..., can_create=...,
  filter_field=..., hidden_fields=[...])`, enforced **server-side**. Row scoping and field
  hiding happen on the platform, not in this UI — don't reimplement them client-side.

## Commands

```bash
./run.sh                 # bootstrap + serve  (run.bat on Windows)
./run.sh --reset         # re-run bootstrap after schema/seed changes
./tests/run_tests.sh     # crud / integration / e2e / workflow tests
docker compose up        # containerized
```

## Rules

1. Extend `ui/app.js`; never edit the SDK-generated `ui/` files.
2. `SUPERO_PASSWORD` must be set in `.env` — the app refuses to boot without it.
3. Claims in code/docs must match reality. If you change behaviour, update this file.
