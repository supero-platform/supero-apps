# Apps by industry

19 applications. Each is live at `<name>.supero.live`, each is complete, each is yours to clone.

Every app follows the same shape — so once you've read one, you've read all of them:

```
<app>/
├── schemas.py       your data model (~100 lines)
├── setup.py         seed data, roles, access policies, workflows
├── config.py        app name, services, tenants
├── .env.example     copy to .env, set your domain
├── run.sh           bootstrap + serve
├── tests/           crud / integration / e2e
└── ui/app.js        your screens (the only UI file you edit)
```

---

## Healthcare & life sciences

| App | Industry | What makes it interesting |
|---|---|---|
| [lumen](healthcare/lumen) | Healthcare | Clinical notes are **provider-only, enforced server-side**. Patients can't read them even via curl. |
| [brightsmile](healthcare/brightsmile) | Dental | Public booking + treatment plans + provider-only notes |
| [trialcore](life-sciences/trialcore) | Clinical trials | Public study registry, enrollment dashboards, adverse-event workflows |

## Finance & insurance

| App | Industry | What makes it interesting |
|---|---|---|
| [ledgerline](fintech/ledgerline) | Billing | Live MRR, automated dunning, multi-step expense approvals |
| [sentinel](insurance/sentinel) | Insurance | Claims approval **saga** with a value threshold; fraud scores hidden from claimants |

## Commerce & sales

| App | Industry | What makes it interesting |
|---|---|---|
| [atelier](marketplace/atelier) | B2B marketplace | Multi-brand cart, net-terms checkout |
| [summit](crm/summit) | CRM | Pipeline kanban, weighted forecasting, win-rate analytics |
| [amplify](marketing/amplify) | Marketing | Channel connectors, AI composition, scheduling |

## Operations & services

| App | Industry | What makes it interesting |
|---|---|---|
| [concierge](customer-support/concierge) | Support | AI grounded in your KB — **scoped by the asker's permissions** |
| [fieldops](field-service/fieldops) | Field service | Dispatch board, photo capture, on-site e-signature |
| [relay](mobility/relay) | Workforce | Per-diem healthcare staffing — shifts, credentials, timesheets, payouts |
| [tavola](hospitality/tavola) | Restaurant | Ordering, reservations, loyalty, live kitchen board |
| [pulsefit](fitness/pulsefit) | Fitness | Class booking, memberships, multi-location |

## Property & media

| App | Industry | What makes it interesting |
|---|---|---|
| [haven](real-estate/haven) | Real estate | Offers with broker approval |
| [backlot](media/backlot) | Film | Call sheets, AI script breakdown |

## Multi-tenant — several organisations on one deployment

These four run more than one organisation from a single deployment, so you can sign in as
two different orgs and watch the data separate.

| App | Industry | Orgs | What makes it interesting |
|---|---|---|---|
| [medora](healthcare/medora) | Hospital network | 3 hospitals | Appointments, encounters, prescriptions, labs, invoicing |
| [helix](life-sciences/helix) | Clinical trials | 3 sites | HQ plus three sites; the treatment `arm` is withheld from blinded investigators |
| [lattice](real-estate/lattice) | Property management | 3 managers | Units, leases, rent, maintenance, applications |
| [pulse](fitness/pulse) | Gym chain | 3 locations | Classes, bookings, memberships, check-ins |

> These four are newer than the other 15. `helix`, `lattice` and `pulse` do not ship a
> `tests/` directory yet — see [CONTRIBUTING.md](../CONTRIBUTING.md) if you would like to
> add one.

---

## Which should I start with?

- **Understand access control** → [`lumen`](healthcare/lumen). The clearest demonstration that
  the platform enforces field-level rules, not the UI.
- **Understand workflows** → [`sentinel`](insurance/sentinel). An approval saga you can read in one sitting.
- **Understand the AI story** → [`concierge`](customer-support/concierge). Grounded, permission-scoped.
- **Just ship something** → [`summit`](crm/summit) or [`atelier`](marketplace/atelier).

## Ports

Each app uses a different port, so you can run several side by side.

| Port | App | | Port | App |
|---|---|---|---|---|
| 5651 | fieldops | | 5671 | backlot |
| 5661 | atelier | | 5672 | amplify |
| 5662 | concierge | | 5673 | tavola |
| 5663 | lumen | | 5674 | sentinel |
| 5664 | ledgerline | | 5675 | haven |
| 5666 | relay | | 5707 | helix |
| 5667 | brightsmile | | 5711 | pulse |
| 5668 | trialcore | | 5712 | medora |
| 5669 | summit | | 5713 | lattice |
| 5670 | pulsefit | | | |

## Not here

**Skills Marathon** ([skill-marathon.supero.live](https://skill-marathon.supero.live)) is live on the
gallery but runs from a separate domain, so its source isn't in this repo yet.

---

New app to contribute? See [CONTRIBUTING.md](../CONTRIBUTING.md).
