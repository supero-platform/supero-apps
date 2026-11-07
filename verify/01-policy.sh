#!/usr/bin/env bash
# 01 — What the server says you are allowed to do.
#
# Before asserting anything, print the ground truth: the identity the platform
# issues for a session, and what each demo account can actually read. Scripts 02
# and 03 assert; this one just shows you the board.
#
# Supports Sentinel (default) and Medora:
#   ./01-policy.sh           # runs Sentinel
#   ./01-policy.sh medora    # runs Medora
# Or set SUPERO_VERIFY_PROJECT=medora
#
# Nothing here is privileged. Every account used is published in the app READMEs
# so that anyone can reproduce this.

set -euo pipefail
cd "$(dirname "$0")"
. ./_lib.sh "$@"
need curl; need python3

head1 "01 · Who the server thinks you are"
dim   "app=$APP_NAME  domain=$DOMAIN  project=$PROJECT  api=$API"

for account in \
  "$ADMIN_ACCOUNT|$ADMIN_LABEL" \
  "$MEMBER_ACCOUNT|$MEMBER_LABEL" \
  "$TENANT2_ACCOUNT|$TENANT2_LABEL"
do
  email=${account%%|*}
  label=${account##*|}
  tok=$(login "$email")

  say ""
  say "  ${C_B}${label}${C_0}"
  say "  ${C_DIM}${email}${C_0}"

  # The JWT is not a secret to its own holder — decode the claims it carries.
  printf '%s' "$tok" | python3 -c '
import base64, json, sys
tok = sys.stdin.read().strip()
payload = tok.split(".")[1]
payload += "=" * (-len(payload) % 4)
d = json.loads(base64.urlsafe_b64decode(payload))
print("    role      %s" % d.get("role"))
print("    username  %s" % d.get("username"))
'

  body=$(body_of "$(api_get "$tok" "/api/v1/crud/$DOMAIN/$ENTITY_TYPE?limit=50")")
  python3 - "$body" "$ID_FIELD" "$ID_PREFIX" "${HIDDEN_FIELDS[*]}" "$ENTITY_LABEL" <<'PY'
import json, sys
body_json, id_field, id_prefix, hidden_str, entity_label = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5]
hidden_fields = hidden_str.split()
try:
    rows = (json.loads(body_json).get("results") or [])
except Exception:
    rows = []
seeded = [r for r in rows if str(r.get(id_field, "")).startswith(id_prefix)]
print(f"    {entity_label}s readable        {len(rows)}  (seeded: {len(seeded)})")
if seeded:
    keys = set()
    for r in seeded: keys |= set(r)
    for f in hidden_fields:
        print(f"    sees {f:<16} {f in keys}")
PY
done

head1 "That is the whole setup."
dim "02-rbac-enforcement.sh turns the last two lines into an assertion."
dim "03-tenant-isolation.sh  asks whether one tenant can reach the other's records."
