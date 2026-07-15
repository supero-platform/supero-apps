# TRANSACTIONAL_TESTS_VERSION: 1
"""
transactional_tests.py — Transactional services contract validator.

Failure modes covered:
  T-A  registerExtensions payload wrong shape (C1 contract)
  T-B  registerExtensions called too early — before auth (C3 contract)
  T-C  Composite-only service has parent state actions (C2 contract)
  T-D  Two-schema service missing child_schema in __TRANSACTIONAL_VIEWS
  T-E  Invented operation name (op doesn't exist on service)
  T-F  State transition rejected (runtime — surfaced only via Layer 1 logs)

Reads:
  ui/app.js  — for __TRANSACTIONAL_VIEWS, registerExtensions, TABS

This tool is a no-op (skip-all) for apps that don't use transactional
services. Only apps with `client.transactional.registerExtensions(...)`
or `__TRANSACTIONAL_VIEWS` declarations are exercised.

Queries (with --platform):
  GET /api/v1/services/{service_id}/config — to verify transactional
                                              services imported

Usage:
    python transactional_tests.py                # static checks
    python transactional_tests.py --platform     # + platform import check
    python transactional_tests.py --json
    python transactional_tests.py --verbose
    python transactional_tests.py --bail

Exit: 0 clean, 1 hard failure, 2 warnings only.
"""

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from _test_lib import (
    Results, PlatformClient,
    load_app_js, parse_app_js_const,
    did_you_mean, make_arg_parser, print_human, print_json,
    bold,
)
# Reuse the lib's JS→JSON normalizer for our argument extraction
from _test_lib import _js_to_json_lite as _js_to_json


# ════════════════════════════════════════════════════════════════════
# C1 / C2 / C3 contracts (from 9.transactional.services.md)
# ════════════════════════════════════════════════════════════════════

# TWO_SCHEMA services — parent + children. registerExtensions value must
# be an array of length 2: [parent_extension, child_extension].
# Other services pass a bare string.
TWO_SCHEMA_SERVICES = frozenset({
    "cart", "order", "approval", "document_signature",
    "inventory", "loyalty_points",
})

# Composite-only services have NO parent state machine. Their parent
# entry in __TRANSACTIONAL_VIEWS must NOT declare primary_action or
# destructive_actions on the header — all actions live on children.
COMPOSITE_ONLY_SERVICES = frozenset({
    "inventory", "loyalty_points",
})

# Child schemas that must NOT appear as top-level TABS entries —
# they render inline in their parent's detail view.
CHILD_SCHEMAS_NOT_FOR_TABS = frozenset({
    "cart_item", "order_item", "approval_step", "signature",
    "reservation", "points_txn",
})

# Service op catalog — only the parent-record ops we need to validate
# in __TRANSACTIONAL_VIEWS. Sourced from the platform's transactional
# service manifests. Composite ops (on child records) are deliberately
# not included here; they're checked via different paths.
_TRANSACTIONAL_OPS = {
    "booking": {
        "book_slot", "cancel_booking", "complete_booking", "no_show",
    },
    "task": {
        "start_task", "complete_task", "cancel_task", "reopen_task",
    },
    "cart": {
        "checkout_cart", "abandon_cart", "restore_cart",
    },
    "ticket": {
        "assign_ticket", "resolve_ticket", "close_ticket", "reopen_ticket",
    },
    "payment": {
        "authorize_payment", "capture_payment", "refund_payment",
        "void_payment", "fail_payment",
    },
    "comment": {
        "hide_comment", "show_comment", "soft_delete_comment",
    },
    "feedback": {
        "publish_feedback", "hide_feedback", "archive_feedback",
    },
    "membership": {
        "enroll_member", "suspend_member", "reinstate_member",
        "expel_member", "withdraw_member",
    },
    "recurring_plan": {
        "start_plan", "pause_plan", "resume_plan", "cancel_plan",
    },
    "attachment": {
        "mark_uploaded", "archive_attachment", "delete_attachment",
    },
    "appointment": {
        "schedule_appointment", "cancel_appointment",
        "complete_appointment", "no_show_appointment",
    },
    "order": {
        "place_order", "fulfill_order", "cancel_order", "refund_order",
    },
    "document_signature": {
        "send_document", "sign_document", "void_document",
        "complete_document",
    },
    "loyalty_points": set(),    # composite-only; no parent ops
    "inventory":      set(),    # composite-only; no parent ops
    "approval": {
        "submit_approval", "withdraw_approval",
    },
}


# ════════════════════════════════════════════════════════════════════
# Detection — is this app transactional at all?
# ════════════════════════════════════════════════════════════════════

def _has_transactional_features(app_js_source: str) -> bool:
    """Quick check: does the app declare any transactional features?"""
    if not app_js_source:
        return False
    return (
        "__TRANSACTIONAL_VIEWS" in app_js_source
        or "registerExtensions" in app_js_source
    )


# ════════════════════════════════════════════════════════════════════
# Phase A — registerExtensions checks
# ════════════════════════════════════════════════════════════════════

def check_register_extensions_placement(app_js_source, results):
    """T-B: registerExtensions must be called AFTER authentication.

    Heuristic: look for the call. It must NOT appear at module top level
    (outside any function), and must appear after a reference to login/
    isAuthenticated/auth in its enclosing function.

    This is a best-effort static check — we use regex, not a full JS
    AST. False positives are OK (warnings, not failures).
    """
    section = "register_extensions"
    if not app_js_source:
        results.skip(section, "placement", "app.js not available")
        return

    call_positions = [m.start() for m in re.finditer(
        r'\.transactional\.registerExtensions\s*\(', app_js_source
    )]
    if not call_positions:
        results.skip(section, "placement", "no registerExtensions calls found")
        return

    # For each call, walk upward to find the enclosing function (or
    # determine it's at top level).
    issues = 0
    for pos in call_positions:
        # Find the line number for the error message
        line = app_js_source.count("\n", 0, pos) + 1
        # Get the surrounding context — find the enclosing function start
        # by walking up looking for `function` / `=>` / `async`.
        before = app_js_source[:pos]
        # Heuristic: count braces between the start of file and `pos`.
        # If brace depth at pos is 0, it's a top-level call.
        depth = 0
        in_str = None
        for ch in before:
            if in_str:
                if ch == "\\":
                    continue  # we'd want to skip next char but simple is fine
                if ch == in_str:
                    in_str = None
            else:
                if ch in '"\'`':
                    in_str = ch
                elif ch == "{":
                    depth += 1
                elif ch == "}":
                    depth -= 1
        if depth <= 0:
            results.warn(
                section, "register_extensions_top_level",
                f"registerExtensions call at line {line} appears to be at "
                "module top level (before any auth check)",
                mode="T-B",
                hint="Wrap registerExtensions in a function that runs AFTER "
                     "client.login() or after isAuthenticated check returns true. "
                     "Calling at top level resolves before the SDK is ready.",
            )
            issues += 1
        else:
            # Look at the 200 chars before pos for auth-related keywords
            window = app_js_source[max(0, pos - 1000):pos]
            has_auth_signal = bool(re.search(
                r'login|isAuthenticated|on(Auth|Login)|loggedIn|currentUser',
                window,
            ))
            if not has_auth_signal:
                results.warn(
                    section, "register_extensions_no_auth_signal",
                    f"registerExtensions at line {line} is inside a function "
                    "but no auth-related call (login, isAuthenticated, etc.) "
                    "appears nearby",
                    mode="T-B",
                    hint="Ensure the enclosing function only runs after auth completes.",
                )
                issues += 1
    if issues == 0:
        results.pass_(section, "placement_ok",
            f"all {len(call_positions)} registerExtensions calls appear "
            "inside auth-gated functions")


def check_register_extensions_shape(app_js_source, results):
    """T-A: registerExtensions payload values must match TWO_SCHEMA table.

    The call looks like:
      client.transactional.registerExtensions({
        cart: ['acme:b2b_cart', 'acme:b2b_cart_item'],   // two-schema → array
        order: ['acme:b2b_order', 'acme:b2b_order_item'],
        task: 'acme:b2b_task',                            // single-schema → string
      });

    Extracting the argument is hard with regex alone, so we use a
    permissive scan: find each registerExtensions call, capture its
    argument object literal, attempt to parse as JSON (after light
    normalization), and validate against TWO_SCHEMA_SERVICES.
    """
    section = "register_extensions"
    if not app_js_source:
        return

    # Find each call site and extract the argument
    pattern = re.compile(r'\.transactional\.registerExtensions\s*\(\s*')
    payloads = []
    for m in pattern.finditer(app_js_source):
        start = m.end()
        # Find the matching close-paren — track brace depth and strings
        end, payload = _extract_object_arg(app_js_source, start)
        if end > 0 and payload:
            payloads.append((m.start(), payload))

    if not payloads:
        results.skip(section, "shape",
            "registerExtensions call found but argument not extractable "
            "(possibly multi-line or computed)")
        return

    issues = 0
    valid_entries = 0
    for pos, raw_payload in payloads:
        # Light normalization for JS → JSON
        normalized = _js_to_json(raw_payload)
        try:
            import json as _json
            obj = _json.loads(normalized)
        except Exception as e:
            line = app_js_source.count("\n", 0, pos) + 1
            results.warn(
                section, "shape_not_parseable",
                f"registerExtensions argument at line {line} not parseable: {e}",
                hint="Argument must be a plain object literal with string "
                     "service names and string-or-array values",
            )
            continue
        if not isinstance(obj, dict):
            results.fail(section, "shape_not_object",
                "registerExtensions argument is not an object literal",
                mode="T-A")
            issues += 1
            continue
        for svc, ext in obj.items():
            if svc in TWO_SCHEMA_SERVICES:
                if not (isinstance(ext, list) and len(ext) == 2):
                    results.fail(
                        section, f"two_schema_wrong_shape_{svc}",
                        f"service '{svc}' is two-schema (parent + child) but "
                        f"registerExtensions value is {ext!r}; expected "
                        "an array of length 2: [parent_extension, child_extension]",
                        mode="T-A",
                        hint=f"Example: {svc}: ['ns:my_{svc}', 'ns:my_{svc}_item']",
                    )
                    issues += 1
                else:
                    valid_entries += 1
            else:
                if not isinstance(ext, str):
                    results.fail(
                        section, f"single_schema_wrong_shape_{svc}",
                        f"service '{svc}' is single-schema but "
                        f"registerExtensions value is {ext!r}; expected a "
                        "bare string like 'ns:my_extension'",
                        mode="T-A",
                        hint=f"Example: {svc}: 'ns:my_{svc}'",
                    )
                    issues += 1
                else:
                    valid_entries += 1

    if valid_entries and issues == 0:
        results.pass_(section, "shape_ok",
            f"all {valid_entries} registerExtensions entries have correct shape")


def _extract_object_arg(source, start):
    """From position `start` (after `(`), find the object-literal argument.
    Returns (end_index, raw_object_text) or (-1, '')."""
    # Skip whitespace
    while start < len(source) and source[start] in " \t\n\r":
        start += 1
    if start >= len(source) or source[start] != "{":
        return -1, ""
    # Find matching close brace
    depth = 0
    i = start
    in_str = None
    while i < len(source):
        ch = source[i]
        if in_str:
            if ch == "\\":
                i += 2
                continue
            if ch == in_str:
                in_str = None
        else:
            if ch in '"\'`':
                in_str = ch
            elif ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    return i, source[start:i + 1]
        i += 1
    return -1, ""


# ════════════════════════════════════════════════════════════════════
# Phase A — __TRANSACTIONAL_VIEWS checks
# ════════════════════════════════════════════════════════════════════

def check_transactional_views(app_js_source, results):
    """T-C + T-D + T-E: __TRANSACTIONAL_VIEWS shape and ops."""
    section = "transactional_views"
    if not app_js_source:
        results.skip(section, "views", "app.js not available")
        return

    views, err = parse_app_js_const(app_js_source, "__TRANSACTIONAL_VIEWS")
    if views is None:
        if err and "not found" in err.lower():
            results.skip(section, "views", "__TRANSACTIONAL_VIEWS not declared")
        else:
            results.warn(section, "views_parse", err or "could not parse")
        return

    if not isinstance(views, dict):
        results.fail(section, "views_not_dict",
            f"__TRANSACTIONAL_VIEWS must be an object, got {type(views).__name__}")
        return

    issues = 0
    checked = 0

    for svc, view_def in views.items():
        if not isinstance(view_def, dict):
            results.fail(section, f"view_{svc}_not_dict",
                f"__TRANSACTIONAL_VIEWS['{svc}'] is not an object")
            issues += 1
            continue
        checked += 1

        # T-C: composite-only services must not have parent actions
        if svc in COMPOSITE_ONLY_SERVICES:
            for forbidden in ("primary_action", "destructive_actions"):
                if view_def.get(forbidden):
                    results.fail(
                        section, f"composite_only_has_{forbidden}_{svc}",
                        f"__TRANSACTIONAL_VIEWS['{svc}'] declares "
                        f"{forbidden}={view_def[forbidden]!r}; '{svc}' is "
                        "composite-only and has no parent state machine",
                        mode="T-C",
                        hint=f"Move actions onto the child schema view, "
                             f"or remove {forbidden} from the '{svc}' entry",
                    )
                    issues += 1

        # T-D: two-schema services must declare child_schema
        if svc in TWO_SCHEMA_SERVICES:
            if not view_def.get("child_schema"):
                results.fail(
                    section, f"two_schema_missing_child_schema_{svc}",
                    f"__TRANSACTIONAL_VIEWS['{svc}'] is two-schema but "
                    "missing 'child_schema' declaration",
                    mode="T-D",
                    hint=f"Add child_schema: '<namespace>:my_{svc}_item' "
                         "(or similar) so the detail view can render children",
                )
                issues += 1

        # T-E: every op referenced must exist on the service
        for action_key in ("primary_action", "destructive_actions",
                            "secondary_actions"):
            ops_in_view = view_def.get(action_key)
            if not ops_in_view:
                continue
            if isinstance(ops_in_view, str):
                ops_in_view = [ops_in_view]
            if not isinstance(ops_in_view, list):
                continue
            valid_ops = _TRANSACTIONAL_OPS.get(svc, set())
            for op in ops_in_view:
                if not isinstance(op, str):
                    continue
                if valid_ops and op not in valid_ops:
                    suggestion = did_you_mean(op, valid_ops)
                    hint = (f"did you mean: {suggestion}" if suggestion
                            else f"available ops on '{svc}': "
                                 f"{', '.join(sorted(valid_ops)) or '(none)'}")
                    results.fail(
                        section, f"invented_op_{svc}_{op}",
                        f"__TRANSACTIONAL_VIEWS['{svc}'].{action_key} "
                        f"references op '{op}' which doesn't exist on '{svc}'",
                        mode="T-E", hint=hint,
                    )
                    issues += 1

    if checked and issues == 0:
        results.pass_(section, "views_well_formed",
            f"all {checked} __TRANSACTIONAL_VIEWS entries are well-formed")


def check_no_child_schema_tabs(app_js_source, results):
    """Hygiene: TABS must not include known child schemas of two-schema services."""
    section = "tabs_hygiene"
    if not app_js_source:
        return

    tabs, err = parse_app_js_const(app_js_source, "TABS")
    if tabs is None:
        # TABS isn't always present — skip silently
        return
    if not isinstance(tabs, list):
        return

    # Extract schema names from tabs. Each tab is typically a dict with
    # schema/name/view keys; tolerant of multiple shapes.
    tab_schemas = set()
    for tab in tabs:
        if isinstance(tab, dict):
            for key in ("schema", "name", "object_type"):
                v = tab.get(key)
                if isinstance(v, str):
                    # Strip namespace prefix if present
                    bare = v.split(":")[-1]
                    tab_schemas.add(bare)
        elif isinstance(tab, str):
            tab_schemas.add(tab.split(":")[-1])

    offenders = tab_schemas & CHILD_SCHEMAS_NOT_FOR_TABS
    if offenders:
        for sch in sorted(offenders):
            results.fail(
                section, f"child_schema_in_tabs_{sch}",
                f"TABS includes '{sch}', which is a child schema of a "
                "two-schema transactional service",
                hint=f"Remove '{sch}' from TABS — it should render inline "
                     "in its parent's detail view, not as a top-level tab",
            )
    else:
        results.pass_(section, "no_child_schemas",
            "TABS does not include child schemas of two-schema services")


# ════════════════════════════════════════════════════════════════════
# Phase B — platform checks
# ════════════════════════════════════════════════════════════════════

def check_transactional_services_imported(app_js_source, client, results):
    """Each service referenced in __TRANSACTIONAL_VIEWS must be imported."""
    section = "platform_transactional_services"
    if not app_js_source:
        return
    if not client.ready:
        results.skip(section, "imports",
            f"platform client not ready (missing: {client.missing})")
        return

    views, err = parse_app_js_const(app_js_source, "__TRANSACTIONAL_VIEWS")
    if not isinstance(views, dict):
        return

    services_used = list(views.keys())
    if not services_used:
        return

    imported = 0
    for svc in services_used:
        cfg, err = client.get_service_config(svc)
        if err and err.startswith("404"):
            results.fail(
                section, f"not_imported_{svc}",
                f"transactional service '{svc}' is referenced in "
                "__TRANSACTIONAL_VIEWS but not imported in this domain",
                hint=f"Add '{svc}' to config.py services list and re-run setup",
            )
        elif err:
            results.warn(section, f"check_failed_{svc}", err)
        else:
            imported += 1
    if imported:
        results.pass_(section, "all_imported",
            f"{imported}/{len(services_used)} transactional services imported")


# ════════════════════════════════════════════════════════════════════
# Main
# ════════════════════════════════════════════════════════════════════

def main():
    ap = make_arg_parser(
        prog="transactional_tests.py",
        description="Validate transactional services contracts (C1/C2/C3) and platform state.",
    )
    args = ap.parse_args()

    results = Results()
    results.bail = args.bail

    app_js_source, err = load_app_js()
    if err:
        results.skip("loading", "app.js", err)

    # Skip-all for non-transactional apps
    if not app_js_source or not _has_transactional_features(app_js_source):
        results.skip("scope", "transactional_app",
            "no __TRANSACTIONAL_VIEWS or registerExtensions in app.js; "
            "this app does not use transactional services")
        if args.json:
            print_json(results, tool_name="transactional_tests")
        else:
            print_human(results, args.verbose, tool_name="📋 Transactional Tests")
        sys.exit(results.exit_code())

    # Phase A
    check_register_extensions_placement(app_js_source, results)
    check_register_extensions_shape(app_js_source, results)
    check_transactional_views(app_js_source, results)
    check_no_child_schema_tabs(app_js_source, results)

    # Phase B
    if args.platform and not results.aborted():
        client = PlatformClient.from_env()
        check_transactional_services_imported(app_js_source, client, results)

    if args.json:
        print_json(results, tool_name="transactional_tests")
    else:
        print_human(results, args.verbose, tool_name="📋 Transactional Tests")

    sys.exit(results.exit_code())


if __name__ == "__main__":
    main()
