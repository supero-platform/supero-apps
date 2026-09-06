#!/usr/bin/env bash
# 02 — Field-level access control, checked against the live demo.
#
# THE CLAIM
#   apps/insurance/sentinel/setup.py declares, for the policyholder role:
#
#       PolicyRule(entity="claim", can_read=True, ...,
#                  filter_field="owner_username", filter_match="$user.name",
#                  hidden_fields=["fraud_score", "internal_notes"])
#
#   The claims team has no such rule. So on the SAME claim record, the staff
#   account should see fraud_score and internal_notes and the policyholder should
#   not — enforced by the server, with no UI involved.
#
# WHAT THIS PROVES, AND WHAT IT DOES NOT
#   Proves: for this entity, on this deployment, the fields are absent from the
#   response body of a direct API call made with a valid token.
#   Does not prove: that the value never leaves the database. This is a
#   server-side response filter, not a query projection. Nor does it say anything
#   about platform-managed types (accounts, API keys, tenants), which are governed
#   by role permissions instead — hidden_fields does not extend to them.
#
# Run it, then change hidden_fields in your own clone and run it again.

set -euo pipefail
cd "$(dirname "$0")"
. ./_lib.sh
need curl; need python3

head1 "02 · Field-level access control"
dim   "$API/api/v1/crud/$DOMAIN/claim   ·   two roles, one record"

STAFF=$(login "claims@sentinel.insure")
MEMBER=$(login "member@sentinel.insure")

staff_body=$(body_of "$(api_get "$STAFF"  "/api/v1/crud/$DOMAIN/claim?limit=50")")
member_body=$(body_of "$(api_get "$MEMBER" "/api/v1/crud/$DOMAIN/claim?limit=50")")

python3 - "$staff_body" "$member_body" <<'PY'
import json, sys

staff = json.loads(sys.argv[1]).get('results') or []
member = json.loads(sys.argv[2]).get('results') or []

HIDDEN = ["fraud_score", "internal_notes"]

# Anti-vacuity gate. If the staff account cannot see the hidden fields on any
# record, then "absent for the member" proves nothing at all — the field would
# simply be unset everywhere. Abort rather than print a green PASS.
staff_with = [r for r in staff if all(k in r for k in HIDDEN)]
if not staff_with:
    print("  ABORT the staff account sees no claim carrying fraud_score/internal_notes,")
    print("        so 'absent for the policyholder' would prove nothing. Not asserting.")
    sys.exit(2)

# Pick a seeded claim (CLM-…) that BOTH accounts can see, so the comparison is
# genuinely like-for-like on one record rather than across two different sets.
member_by_num = {r.get('claim_number'): r for r in member}
target = next((r for r in staff_with
               if str(r.get('claim_number', '')).startswith('CLM-')
               and r.get('claim_number') in member_by_num), None)

if target is None:
    print("  ABORT no seeded claim is visible to BOTH accounts, so there is no shared")
    print("        record to compare. Not asserting.")
    sys.exit(2)

num = target['claim_number']
mine = member_by_num[num]
rc = 0

print(f"  comparing claim {num} — visible to both accounts")
print(f"    staff sees {len(target)} fields, policyholder sees {len(mine)}")

for k in HIDDEN:
    if k not in target:
        print(f"  FAIL  staff cannot see '{k}' — nothing to hide, check aborted upstream"); rc = 1
    elif k in mine:
        print(f"  FAIL  '{k}' IS present in the policyholder's response — not enforced"); rc = 1
    else:
        shown = str(target[k])
        shown = shown if len(shown) <= 46 else shown[:43] + '...'
        print(f"  PASS  '{k}' present for staff ({shown}) and ABSENT for the policyholder")

# Row scoping: every claim the policyholder can see must be their own.
foreign = [r.get('claim_number') for r in member
           if r.get('owner_username') not in (None, 'member@sentinel.insure')]
if foreign:
    print(f"  FAIL  policyholder can see {len(foreign)} claim(s) they do not own: {foreign[:3]}")
    rc = 1
else:
    print(f"  PASS  every claim the policyholder can read is their own ({len(member)} rows)")

sys.exit(rc)
PY
rc=$?
[ $rc -ne 0 ] && exit $rc

# ---------------------------------------------------------------------------
# Same rule, other spellings and other read paths.
#
# The check above proves the policy holds on the LIST path with the ordinary
# request shape. That is the path that works — and a suite that only tests the
# path that works is not evidence, it is a selfie.
#
# /query accepts the object type as `type` OR `obj_type`. Those spellings once
# resolved differently: the controls that GRANTED access read both, and the three
# that RESTRICTED the response read only `type`, so a body carrying `obj_type`
# passed authorization and then skipped row scoping and field hiding together.
# Renaming one JSON key was the whole exploit.
#
# So the spelling is asserted here rather than hedged in prose. If a future change
# reintroduces the split, this goes red on a live deployment in ten seconds.
# ---------------------------------------------------------------------------

head1 "Same rule, other spellings"

probe_query() {   # probe_query <label> <json-body>
  local label="$1" body="$2" resp code out
  resp=$(api_post "$MEMBER" "/api/v1/crud/$DOMAIN/query" "$body")
  code=$(status_of "$resp")
  out=$(body_of "$resp" | python3 -c '
import json, sys
try:
    d = json.load(sys.stdin)
except Exception:
    print("UNPARSEABLE 0"); raise SystemExit
rows = (d.get("data") or d).get("objects") or d.get("results") or []
leaked = sorted({k for r in rows if isinstance(r, dict)
                 for k in ("fraud_score", "internal_notes") if k in r})
print(("LEAK " if leaked else "CLEAN ") + str(len(rows)) + " " + ",".join(leaked))')
  set -- $out
  case "$1" in
    CLEAN)       pass "$label -> HTTP $code, $2 row(s), no hidden field present" ;;
    LEAK)        fail "$label -> HTTP $code LEAKED: $3" ;;
    UNPARSEABLE) fail "$label -> HTTP $code, response could not be parsed" ;;
  esac
}

probe_query 'POST /query {"type":"claim"}'      '{"type":"claim","limit":25}'
probe_query 'POST /query {"obj_type":"claim"}'  '{"obj_type":"claim","limit":25}'

# The read paths a policyholder can actually reach. stats and back-refs are not
# listed because this role gets HTTP 403 on both — denied outright rather than
# filtered, so there is nothing to assert about their field handling here.
one_uuid=$(printf '%s' "$member_body" | python3 -c '
import json, sys
rows = json.load(sys.stdin).get("results") or []
print(next((r["uuid"] for r in rows if r.get("uuid")), ""))')

if [ -n "$one_uuid" ]; then
  gb=$(body_of "$(api_get "$MEMBER" "/api/v1/crud/$DOMAIN/claim/$one_uuid")")
  printf '%s' "$gb" | python3 -c '
import json, sys
d = json.load(sys.stdin); o = (d.get("data") or d); o = o.get("claim") or o
leaked = [k for k in ("fraud_score", "internal_notes") if isinstance(o, dict) and k in o]
print("  " + ("FAIL  GET by uuid LEAKED: " + ",".join(leaked) if leaked
      else "PASS  GET by uuid -> no hidden field present"))'
else
  dim "  (no readable claim uuid — skipped the by-uuid path)"
fi

head1 "Result: the policy in setup.py is what the API enforces."
dim   "Change hidden_fields in your own clone, re-run, and watch this flip."
exit $FAILURES
