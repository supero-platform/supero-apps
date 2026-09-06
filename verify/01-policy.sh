#!/usr/bin/env bash
# 01 — What the server says you are allowed to do.
#
# Before asserting anything, print the ground truth: the identity the platform
# issues for a session, and what each demo account can actually read. Scripts 02
# and 03 assert; this one just shows you the board.
#
# Nothing here is privileged. Every account used is published in
# apps/insurance/sentinel/README.md so that anyone can reproduce this.

set -euo pipefail
cd "$(dirname "$0")"
. ./_lib.sh
need curl; need python3

head1 "01 · Who the server thinks you are"
dim   "domain=$DOMAIN  project=$PROJECT  api=$API"

for account in \
  "claims@sentinel.insure|Northwind Mutual · claims team" \
  "member@sentinel.insure|Northwind Mutual · policyholder" \
  "claims@cascade.insure|Cascade Assurance · claims team"
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

  body=$(body_of "$(api_get "$tok" "/api/v1/crud/$DOMAIN/claim?limit=50")")
  printf '%s' "$body" | python3 -c '
import json, sys
rows = (json.load(sys.stdin).get("results") or [])
seeded = [r for r in rows if str(r.get("claim_number","")).startswith("CLM-")]
print(f"    claims readable          {len(rows)}  (seeded: {len(seeded)})")
if seeded:
    keys = set()
    for r in seeded: keys |= set(r)
    for f in ("fraud_score", "internal_notes"):
        print(f"    sees {f:<16} {f in keys}")
'
done

head1 "That is the whole setup."
dim "02-rbac-enforcement.sh turns the last two lines into an assertion."
dim "03-tenant-isolation.sh  asks whether one insurer can reach the other's book."
