#!/usr/bin/env bash
# 03 — Tenant isolation, checked against the live demo.
#
# THE CLAIM
#   sentinel runs two insurers on ONE deployment: Northwind Mutual and Cascade
#   Assurance (apps/insurance/sentinel/config.py). Each has its own claims team.
#   A staff account signed into one insurer must not be able to read the other's
#   claims — not through the list endpoint, and not by addressing a record
#   directly by UUID with a perfectly valid token.
#
#   Tenancy is the record's address, not a column someone remembered to filter on.
#   This script tests the second, harder case: fetching a known-good UUID from the
#   other tenant.
#
# WHAT THIS PROVES
#   That a valid, authenticated request for another tenant's record is refused by
#   the server. It does not audit every endpoint in the platform.

set -euo pipefail
cd "$(dirname "$0")"
. ./_lib.sh
need curl; need python3

head1 "03 · Tenant isolation"
dim   "Northwind Mutual and Cascade Assurance — one deployment, two books"

NORTHWIND=$(login "claims@sentinel.insure")
CASCADE=$(login "claims@cascade.insure")

n_body=$(body_of "$(api_get "$NORTHWIND" "/api/v1/crud/$DOMAIN/claim?limit=50")")
c_body=$(body_of "$(api_get "$CASCADE"   "/api/v1/crud/$DOMAIN/claim?limit=50")")

# Pick a seeded Northwind claim to address directly as Cascade.
TARGET=$(python3 - "$n_body" <<'PY'
import json, sys
rows = json.loads(sys.argv[1]).get('results') or []
seeded = [r for r in rows
          if str(r.get('claim_number', '')).startswith('CLM-') and r.get('uuid')]
if not seeded:
    sys.exit(1)
print(f"{seeded[0]['uuid']} {seeded[0]['claim_number']}")
PY
) || vacuous "Northwind's book has no seeded claim with a UUID — nothing to attempt."

TARGET_UUID=${TARGET%% *}
TARGET_NUM=${TARGET##* }

say "  target: Northwind claim $TARGET_NUM"
say "  fetching it with a valid Cascade staff token, directly by UUID"

resp=$(api_get "$CASCADE" "/api/v1/crud/$DOMAIN/claim/$TARGET_UUID")
code=$(status_of "$resp")
body=$(body_of "$resp")

if [ "$code" = "403" ] || [ "$code" = "404" ]; then
  msg=$(printf '%s' "$body" | python3 -c 'import json,sys
try: print(json.load(sys.stdin).get("message","") or "")
except Exception: print("")' 2>/dev/null || true)
  pass "HTTP $code — refused${msg:+  ·  \"$msg\"}"
else
  fail "HTTP $code — the record was NOT refused. Isolation did not hold here."
  printf '%s\n' "$body" | head -c 300; echo
fi

# The list endpoints should also be disjoint on seeded data.
python3 - "$n_body" "$c_body" <<'PY'
import json, sys
n = json.loads(sys.argv[1]).get('results') or []
c = json.loads(sys.argv[2]).get('results') or []

def seeded(rows):
    return {r.get('claim_number') for r in rows
            if str(r.get('claim_number', '')).startswith('CLM-')}

ns, cs = seeded(n), seeded(c)
overlap = ns & cs
print(f"  Northwind sees {len(ns)} seeded claims, Cascade sees {len(cs)}")
if overlap:
    print(f"  FAIL  {len(overlap)} seeded claim(s) visible to BOTH: {sorted(overlap)[:4]}")
    sys.exit(1)
print("  PASS  the two seeded books are disjoint")

# Untenanted rows, if any, are called out rather than silently ignored: they are
# demo-data noise, not an isolation failure, and saying so is more honest than
# filtering them out quietly.
loose = [r.get('claim_number') for r in n
         if not str(r.get('claim_number', '')).startswith('CLM-')
         and r.get('owner_username') is None]
if loose:
    print(f"  NOTE  {len(loose)} untenanted test record(s) exist in this demo domain")
    print( "        and are visible to both tenants. They carry no tenant and no owner,")
    print( "        so they are demo-data noise rather than a leak — but they should be")
    print( "        cleaned up. Seeded records are unaffected.")
PY
rc=$?

[ $FAILURES -eq 0 ] && [ $rc -eq 0 ] || exit 1
head1 "Result: another tenant's record is refused, with a valid token."
