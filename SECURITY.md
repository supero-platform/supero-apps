# Security Policy

## Reporting a vulnerability

Email **security@supero.dev**. Please don't open a public issue for security reports.
We'll acknowledge within 2 business days and keep you posted until it's resolved.

Vulnerabilities in the hosted platform (`api.supero.dev`) are in scope too — same address.

## Running these apps safely

Be precise about two different credentials:

- **The domain admin password has no default.** `config.py` calls `_require_password()`,
  so an app refuses to boot unless you set `SUPERO_PASSWORD` in `.env`. CI blocks the old
  hardcoded fallback from ever returning.
- **The seed demo users DO have known passwords** (e.g. `Password123!`), on purpose — you
  need them to log in and try the app. **These are
  not secret and must be changed or removed in `config.py` before real users touch the app.**
- **Never commit `.env`.** It's gitignored here; keep it that way in your fork. CI blocks it.
- Each app registers a domain you control. Treat its admin credentials like production
  credentials, because they are.

## Regulated data (PHI / PII / financial) — important

The apps in this repo are **reference implementations**, not certified compliant systems.

- `lumen` and `trialcore` demonstrate the *shape* of healthcare access control
  (provider-only fields, consent, adverse-event flows). They are **not HIPAA-certified**
  and **ship with no Business Associate Agreement**.
- `sentinel` and `ledgerline` demonstrate financial workflows. They are **not** PCI or
  SOC 2 attestations.
- Field-level access and encryption are real platform features — but "the feature exists"
  is not the same as "your deployment is compliant."

**What running an app as-shipped actually does:** it transmits the data you enter to the
hosted platform at `api.supero.dev` and stores it there. For a HIPAA covered entity, sending
PHI to a service with no signed BAA is a reportable disclosure — the demo does not change
that. The same logic applies to PII under GDPR/CCPA and cardholder data under PCI. Treat
these apps as **synthetic-data demonstrations** until you have the appropriate agreement in
place.

**Before putting real regulated data into anything here, contact security@supero.dev** to
discuss compliance posture, data residency, encryption keys, audit, and a BAA. Don't infer
coverage from a demo.


## Compliance & data handling

For a security or legal review, here's what to request rather than infer:

- **Where data is processed** — apps send data to the hosted platform at `api.supero.dev`.
  Ask about region/residency options for your deployment.
- **Subprocessors** — request the current subprocessor list.
- **DPA / BAA** — a Data Processing Addendum (GDPR/CCPA) and a Business Associate Agreement
  (HIPAA) are handled case by case. Ask before processing regulated data.
- **Reports** — request the current security posture / SOC 2 status.

All of the above: **security@supero.dev**. This repo intentionally makes no certification
claims — treat these apps as demonstrations until you have the agreements you need.

## Your data / exit

Every record is reachable through the same authenticated REST API the app uses
(`GET /crud/<type>`), so you can export everything with your project API key at any time.
Nothing is locked in a store you can't read.
