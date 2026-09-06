#!/usr/bin/env bash
# Shared helpers for the verify/ scripts.
#
# Nothing here is Supero-specific magic: it is curl, a JWT you obtain with the
# published demo password, and jq/python to read the JSON back. Read it before you
# run it — that is the point of this directory.
#
# The User-Agent is deliberate and visible. These scripts already authenticate
# against api.supero.dev because that is what they do; the header lets us count how
# many people actually verify rather than guessing from stars. Nothing extra is
# transmitted and nothing is hidden. Remove it if you would rather not be counted —
# the scripts work identically without it.

set -euo pipefail

API="${SUPERO_API:-https://api.supero.dev}"
DOMAIN="${SUPERO_VERIFY_DOMAIN:-supero-apps}"
PROJECT="${SUPERO_VERIFY_PROJECT:-sentinel}"
UA='supero-verify/1.0'
DEMO_PASSWORD="${SUPERO_DEMO_PASSWORD:-Password123!}"

# Colours, disabled when not a terminal or when NO_COLOR is set.
if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
  C_OK=$'\033[32m'; C_BAD=$'\033[31m'; C_DIM=$'\033[2m'; C_B=$'\033[1m'; C_0=$'\033[0m'
else
  C_OK=''; C_BAD=''; C_DIM=''; C_B=''; C_0=''
fi

FAILURES=0

say()  { printf '%s\n' "$*"; }
head1() { printf '\n%s%s%s\n' "$C_B" "$*" "$C_0"; }
dim()  { printf '%s%s%s\n' "$C_DIM" "$*" "$C_0"; }
pass() { printf '  %sPASS%s  %s\n' "$C_OK" "$C_0" "$*"; }
fail() { printf '  %sFAIL%s  %s\n' "$C_BAD" "$C_0" "$*"; FAILURES=$((FAILURES+1)); }

# A check that cannot fail proves nothing. When a precondition is missing we abort
# loudly rather than printing PASS over an empty set — this project has shipped
# green-but-vacuous tests before and will not do it on the page that asks to be
# trusted.
vacuous() { printf '  %sABORT%s %s\n' "$C_BAD" "$C_0" "$*"; exit 2; }

need() {
  command -v "$1" >/dev/null 2>&1 || { echo "This script needs '$1' on PATH."; exit 2; }
}

# login <email> -> prints a bearer token
login() {
  local email="$1" out token
  out=$(curl -sS -A "$UA" -X POST "$API/api/v1/auth/login" \
        -H 'Content-Type: application/json' \
        -d "{\"username\":\"$email\",\"password\":\"$DEMO_PASSWORD\",\"domain\":\"$DOMAIN\",\"project\":\"$PROJECT\"}")
  token=$(printf '%s' "$out" | python3 -c 'import json,sys
try:
    print(json.load(sys.stdin)["auth"]["access_token"])
except Exception:
    sys.exit(1)') || {
    echo "Could not log in as $email." >&2
    printf '%s\n' "$out" | head -c 300 >&2; echo >&2
    exit 2
  }
  printf '%s' "$token"
}

# api_get <token> <path> -> prints "HTTP_STATUS<newline>BODY"
api_get() {
  curl -sS -A "$UA" -w '\n%{http_code}' \
       -H "Authorization: Bearer $1" "$API$2"
}

# status_of / body_of split what api_get returns
status_of() { printf '%s' "$1" | tail -n1; }
body_of()   { printf '%s' "$1" | sed '$d'; }
