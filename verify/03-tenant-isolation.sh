#!/usr/bin/env bash
# 03 — Tenant isolation, checked against the live demo.
#
# Supports Sentinel (default) and Medora:
#   ./03-tenant-isolation.sh           # runs Sentinel
#   ./03-tenant-isolation.sh medora    # runs Medora
# Or set SUPERO_VERIFY_PROJECT=medora
#
# THE CLAIM
#   Sentinel runs two insurers on ONE deployment: Northwind Mutual and Cascade
#   Assurance (apps/insurance/sentinel/config.py). Medora runs multiple hospitals
#   and clinics: Mercy General and Lakeside Clinic (apps/healthcare/medora/config.py).
#   Each has its own staff. A staff account signed into one tenant must not be
#   able to read the other's records — not through the list endpoint, and not by
#   addressing a record directly by UUID with a perfectly valid token.
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
. ./_lib.sh "$@"
need curl; need python3

head1 "03 · Tenant isolation"
dim   "$TENANT1_NAME and $TENANT2_NAME — one deployment, two books"

TENANT1_TOK=$(login "$ADMIN_ACCOUNT")
TENANT2_TOK=$(login "$TENANT2_ACCOUNT")

t1_body=$(body_of "$(api_get "$TENANT1_TOK" "/api/v1/crud/$DOMAIN/$ENTITY_TYPE?limit=50")")
t2_body=$(body_of "$(api_get "$TENANT2_TOK" "/api/v1/crud/$DOMAIN/$ENTITY_TYPE?limit=50")")

# Pick a seeded Tenant 1 record to address directly as Tenant 2.
TARGET=$(python3 - "$t1_body" "$ID_FIELD" "$ID_PREFIX" "$ENTITY_LABEL" <<'PY'
import json, sys
body_json, id_field, id_prefix, entity_label = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
rows = json.loads(body_json).get('results') or []
seeded = [r for r in rows
          if str(r.get(id_field, '')).startswith(id_prefix) and r.get('uuid')]
if not seeded:
    sys.exit(1)
print(f"{seeded[0]['uuid']} {seeded[0][id_field]}")
PY
) || vacuous "$TENANT1_NAME's book has no seeded $ENTITY_LABEL with a UUID — nothing to attempt."

TARGET_UUID=${TARGET%% *}
TARGET_NUM=${TARGET##* }

say "  target: $TENANT1_NAME $ENTITY_LABEL $TARGET_NUM"
say "  fetching it with a valid $TENANT2_NAME staff token, directly by UUID"

resp=$(api_get "$TENANT2_TOK" "/api/v1/crud/$DOMAIN/$ENTITY_TYPE/$TARGET_UUID")
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
python3 - "$t1_body" "$t2_body" "$ID_FIELD" "$ID_PREFIX" "$TENANT1_NAME" "$TENANT2_NAME" "$ENTITY_LABEL" <<'PY'
import json, sys
t1 = json.loads(sys.argv[1]).get('results') or []
t2 = json.loads(sys.argv[2]).get('results') or []
id_field, id_prefix = sys.argv[3], sys.argv[4]
t1_name, t2_name, entity_label = sys.argv[5], sys.argv[6], sys.argv[7]

def seeded(rows):
    return {r.get(id_field) for r in rows
            if str(r.get(id_field, '')).startswith(id_prefix)}

s1, s2 = seeded(t1), seeded(t2)
overlap = s1 & s2
print(f"  {t1_name} sees {len(s1)} seeded {entity_label}(s), {t2_name} sees {len(s2)}")
if overlap:
    print(f"  FAIL  {len(overlap)} seeded {entity_label}(s) visible to BOTH: {sorted(overlap)[:4]}")
    sys.exit(1)
print("  PASS  the two seeded books are disjoint")

# Untenanted rows, if any, are called out rather than silently ignored: they are
# demo-data noise, not an isolation failure, and saying so is more honest than
# filtering them out quietly.
loose = [r.get(id_field) for r in t1
         if not str(r.get(id_field, '')).startswith(id_prefix)
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
