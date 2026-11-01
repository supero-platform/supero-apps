#!/usr/bin/env bash
# 02 — Field-level access control, checked against the live demo.
#
# Supports Sentinel (default) and Medora:
#   ./02-rbac-enforcement.sh           # runs Sentinel
#   ./02-rbac-enforcement.sh medora    # runs Medora
# Or set SUPERO_VERIFY_PROJECT=medora
#
# THE CLAIM
#   setup.py declares, for the restricted role:
#
#   Sentinel:
#       PolicyRule(entity="claim", can_read=True, ...,
#                  filter_field="owner_username", filter_match="$user.name",
#                  hidden_fields=["fraud_score", "internal_notes"])
#   Medora:
#       PolicyRule(entity="lab_result", can_read=True,
#                  hidden_fields=["flag"])
#
#   The admin/staff team has no such restriction. So on the SAME record, the staff
#   account should see the hidden fields and the restricted role should not —
#   enforced by the server, with no UI involved.
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
. ./_lib.sh "$@"
need curl; need python3

head1 "02 · Field-level access control"
dim   "$API/api/v1/crud/$DOMAIN/$ENTITY_TYPE   ·   two roles, one record"

STAFF=$(login "$ADMIN_ACCOUNT")
MEMBER=$(login "$MEMBER_ACCOUNT")

staff_body=$(body_of "$(api_get "$STAFF"  "/api/v1/crud/$DOMAIN/$ENTITY_TYPE?limit=50")")
member_body=$(body_of "$(api_get "$MEMBER" "/api/v1/crud/$DOMAIN/$ENTITY_TYPE?limit=50")")

python3 - "$staff_body" "$member_body" "$ID_FIELD" "$ID_PREFIX" "${HIDDEN_FIELDS[*]}" "$MEMBER_ACCOUNT" "$ENTITY_LABEL" <<'PY'
import json, sys

staff_json, member_json = sys.argv[1], sys.argv[2]
id_field, id_prefix, hidden_str, member_account, entity_label = sys.argv[3], sys.argv[4], sys.argv[5], sys.argv[6], sys.argv[7]
hidden_fields = hidden_str.split()

staff = json.loads(staff_json).get('results') or []
member = json.loads(member_json).get('results') or []

# Anti-vacuity gate. If the staff account cannot see the hidden fields on any
# record, then "absent for the member" proves nothing at all — the field would
# simply be unset everywhere. Abort rather than print a green PASS.
staff_with = [r for r in staff if all(k in r for k in hidden_fields)]
if not staff_with:
    print(f"  ABORT the staff account sees no {entity_label} carrying {'/'.join(hidden_fields)},")
    print("        so 'absent for the restricted role' would prove nothing. Not asserting.")
    sys.exit(2)

# Pick a seeded record that BOTH accounts can see, so the comparison is
# genuinely like-for-like on one record rather than across two different sets.
member_by_id = {r.get(id_field): r for r in member}
target = next((r for r in staff_with
               if str(r.get(id_field, '')).startswith(id_prefix)
               and r.get(id_field) in member_by_id), None)

if target is None:
    print(f"  ABORT no seeded {entity_label} is visible to BOTH accounts, so there is no shared")
    print("        record to compare. Not asserting.")
    sys.exit(2)

num = target[id_field]
mine = member_by_id[num]
rc = 0

print(f"  comparing {entity_label} {num} — visible to both accounts")
print(f"    staff sees {len(target)} fields, restricted role sees {len(mine)}")

for k in hidden_fields:
    if k not in target:
        print(f"  FAIL  staff cannot see '{k}' — nothing to hide, check aborted upstream"); rc = 1
    elif k in mine:
        print(f"  FAIL  '{k}' IS present in the restricted response — not enforced"); rc = 1
    else:
        shown = str(target[k])
        shown = shown if len(shown) <= 46 else shown[:43] + '...'
        print(f"  PASS  '{k}' present for staff ({shown}) and ABSENT for the restricted role")

# Row scoping: every record the member can see must be their own.
foreign = [r.get(id_field) for r in member
           if r.get('owner_username') not in (None, member_account)]
if foreign:
    print(f"  FAIL  restricted role can see {len(foreign)} {entity_label}(s) they do not own: {foreign[:3]}")
    rc = 1
else:
    print(f"  PASS  every {entity_label} the restricted role can read is their own ({len(member)} rows)")

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
hidden_fields = sys.argv[1].split()
try:
    d = json.load(sys.stdin)
except Exception:
    print("UNPARSEABLE 0"); sys.exit(0)
rows = (d.get("data") or d).get("objects") or d.get("results") or []
leaked = sorted({k for r in rows if isinstance(r, dict)
                 for k in hidden_fields if k in r})
print(("LEAK " if leaked else "CLEAN ") + str(len(rows)) + " " + ",".join(leaked))
' "${HIDDEN_FIELDS[*]}")
  set -- $out
  case "$1" in
    CLEAN)       pass "$label -> HTTP $code, $2 row(s), no hidden field present" ;;
    LEAK)        fail "$label -> HTTP $code LEAKED: $3" ;;
    UNPARSEABLE) fail "$label -> HTTP $code, response could not be parsed" ;;
  esac
}

probe_query "POST /query {\"type\":\"$ENTITY_TYPE\"}"      "{\"type\":\"$ENTITY_TYPE\",\"limit\":25}"
probe_query "POST /query {\"obj_type\":\"$ENTITY_TYPE\"}"  "{\"obj_type\":\"$ENTITY_TYPE\",\"limit\":25}"

# The read paths a restricted role can actually reach. stats and back-refs are not
# listed because this role gets HTTP 403 on both — denied outright rather than
# filtered, so there is nothing to assert about their field handling here.
one_uuid=$(printf '%s' "$member_body" | python3 -c '
import json, sys
rows = json.load(sys.stdin).get("results") or []
print(next((r["uuid"] for r in rows if r.get("uuid")), ""))')

if [ -n "$one_uuid" ]; then
  gb=$(body_of "$(api_get "$MEMBER" "/api/v1/crud/$DOMAIN/$ENTITY_TYPE/$one_uuid")")
  printf '%s' "$gb" | python3 -c '
import json, sys
hidden_fields = sys.argv[1].split()
entity_key = sys.argv[2]
try:
    d = json.load(sys.stdin)
except Exception:
    print("  FAIL  GET by uuid -> response could not be parsed"); sys.exit(0)
o = (d.get("data") or d)
o = o.get(entity_key) or o
leaked = [k for k in hidden_fields if isinstance(o, dict) and k in o]
print("  " + ("FAIL  GET by uuid LEAKED: " + ",".join(leaked) if leaked
      else "PASS  GET by uuid -> no hidden field present"))
' "${HIDDEN_FIELDS[*]}" "$ENTITY_KEY"
else
  dim "  (no readable $ENTITY_LABEL uuid — skipped the by-uuid path)"
fi

head1 "Result: the policy in setup.py is what the API enforces."
dim   "Change hidden_fields in your own clone, re-run, and watch this flip."
exit $FAILURES
