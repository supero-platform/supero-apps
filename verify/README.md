# Verify the claims yourself

Every README makes claims. This directory lets you check ours in about ten seconds,
against the live demo, without signing up for anything.

```bash
git clone https://github.com/supero-platform/supero-apps
cd supero-apps/verify

./01-policy.sh            # what the server says each account is
./02-rbac-enforcement.sh  # field-level access: same record, two roles
./03-tenant-isolation.sh  # one insurer cannot read the other's book
```

Needs `curl` and `python3`. Nothing else, no account, no API key.

They run against [sentinel.supero.live](https://sentinel.supero.live) using the demo
logins published in [`apps/insurance/sentinel/README.md`](../apps/insurance/sentinel/README.md).
Those passwords are public on purpose.

---

## What each one does

**`01-policy.sh`** prints the board. It logs in as three accounts, decodes the role
out of each JWT, and shows how many claims each can read and whether `fraud_score`
and `internal_notes` appear at all. No assertions — just the ground truth the other
two scripts act on.

**`02-rbac-enforcement.sh`** finds one seeded claim that *both* the claims team and
the policyholder can see, and compares the two responses field by field. The claims
team gets `fraud_score` and `internal_notes`; the policyholder gets the same record
without them. It also checks that every claim the policyholder can read is one they
own.

**`03-tenant-isolation.sh`** takes a real claim UUID from Northwind Mutual's book and
requests it with a valid Cascade Assurance staff token. Expects a refusal.

---

## What these prove — and what they don't

**They prove**, on this deployment, for these entities: the rules declared in
[`apps/insurance/sentinel/setup.py`](../apps/insurance/sentinel/setup.py) are applied
by the server, on a direct API call, with a valid token, with no browser involved.

**They do not prove:**

- **That a hidden value never leaves the database.** Field hiding is a server-side
  response filter, not a query projection. The field is removed before the response
  is written.
- **Anything about platform-managed types.** Accounts, API keys, domains, projects
  and tenants are governed by role permissions — a different mechanism.
  `hidden_fields` does not extend to them.
- **That every endpoint in the platform behaves this way.** These check the CRUD read
  path. They are a starting point for your own testing, not a substitute for it.

If you are relying on a specific field staying out of a response in your own
deployment, assert it in your own tests. These scripts show you the shape.

---

## They are built not to pass vacuously

A check that cannot fail proves nothing. `02` aborts rather than reporting success if
the staff account cannot see the hidden fields on any record — because then "absent
for the policyholder" would just mean the field was never set. `03` aborts if there is
no seeded claim to attempt.

If you see `ABORT`, the demo data has drifted and the script is refusing to claim a
result it did not earn. That is the intended behaviour.

`03` will also print a `NOTE` about untenanted test records in the shared demo domain.
Those carry no tenant and no owner, so they appear in both lists. They are demo noise,
not an isolation failure, and the script says so rather than quietly filtering them.

---

## Make them fail

The most useful thing you can do is break them.

```bash
cd ../apps/insurance/sentinel
# edit setup.py: remove "fraud_score" from hidden_fields
./run.sh                       # against a domain you own
cd ../../../verify
SUPERO_VERIFY_DOMAIN=your-domain ./02-rbac-enforcement.sh
```

`02` should now fail on `fraud_score`. If it does not, we would genuinely like to know
— open an issue.

---

## About the User-Agent

The scripts send `-A 'supero-verify/1.0'`. They already authenticate against
`api.supero.dev` because that is what they do; the header lets us count how many
people actually verify rather than inferring it from stars.

Nothing extra is transmitted and nothing is concealed — the flag is in
[`_lib.sh`](_lib.sh) where anyone can read it. Delete it if you would rather not be
counted; everything works identically without it.

---

## Environment

| Variable | Default |
|---|---|
| `SUPERO_API` | `https://api.supero.dev` |
| `SUPERO_VERIFY_DOMAIN` | `supero-apps` |
| `SUPERO_VERIFY_PROJECT` | `sentinel` |
| `SUPERO_DEMO_PASSWORD` | `Password123!` |

Point them at your own deployment by setting `SUPERO_VERIFY_DOMAIN`.
