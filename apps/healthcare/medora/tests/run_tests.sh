#!/usr/bin/env bash
# tests/run_tests.sh — Diagnostic test entry point
# RUN_TESTS_SH_V1
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"

if [ -d "$APP_DIR/.venv" ]; then
    # shellcheck disable=SC1091
    source "$APP_DIR/.venv/bin/activate"
fi

if [ -f "$APP_DIR/.env" ]; then
    set -a
    # shellcheck disable=SC1091
    source "$APP_DIR/.env"
    set +a
fi

show_help() {
    cat <<EOF
Usage: ./tests/run_tests.sh [--test-FLAG] [common options]

Test selection flags (pick one; default --test-all):
  --test-all                       run all suites via test_all.py
  --test-workflows                 workflow bindings (W-A..W-F)
  --test-integrations              service config + env (I-A..I-E)
  --test-transactional-services    transactional contracts (T-A..T-F)
  --test-bundle                    static pre-flight validation
  --test-crud                      CRUD smoke tests
  --test-e2e                       end-to-end integration tests

Common options forwarded to the chosen suite:
  --json                machine-readable output
  --verbose             show passing checks too
  --bail                stop on first failure
  --platform            include platform-state checks (needs SUPERO_API_KEY)
  -h, --help            this help
EOF
}

SUITE_FLAG=""
FORWARD_ARGS=()
for arg in "$@"; do
    case "$arg" in
        --test-all|--test-workflows|--test-integrations|\
        --test-transactional-services|--test-bundle|--test-crud|--test-e2e)
            if [ -n "$SUITE_FLAG" ]; then
                echo "Error: multiple --test-* flags. Pick one." >&2
                exit 1
            fi
            SUITE_FLAG="$arg" ;;
        -h|--help) show_help; exit 0 ;;
        *) FORWARD_ARGS+=("$arg") ;;
    esac
done
[ -z "$SUITE_FLAG" ] && SUITE_FLAG="--test-all"

case "$SUITE_FLAG" in
    --test-workflows)              SCRIPT="workflow_tests.py" ;;
    --test-integrations)           SCRIPT="integration_tests.py" ;;
    --test-transactional-services) SCRIPT="transactional_tests.py" ;;
    --test-bundle)                 SCRIPT="test_bundle.py" ;;
    --test-crud)                   SCRIPT="crud_tests.py" ;;
    --test-e2e)                    SCRIPT="e2e_tests.py" ;;
    --test-all)                    SCRIPT="test_all.py" ;;
esac

if [ ! -f "$SCRIPT_DIR/$SCRIPT" ]; then
    echo "Error: $SCRIPT not found in $SCRIPT_DIR" >&2
    exit 1
fi

# EMPTY_ARRAY_GUARD_V1 — safe under set -u when no args (Bash 3.2+)
exec python3 "$SCRIPT_DIR/$SCRIPT" ${FORWARD_ARGS[@]+"${FORWARD_ARGS[@]}"}
