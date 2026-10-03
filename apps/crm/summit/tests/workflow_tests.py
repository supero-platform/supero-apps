# WORKFLOW_TESTS_VERSION: 2
"""
workflow_tests.py — Workflow binding + execution validator.

Failure modes covered:
  W-A  No binding registered for an event-named workflow (or event=null)
  W-B  Event name format mismatch
  W-C  Dangling workflow_id (binding refers to workflow that doesn't exist)
  W-D  Input map paths reference fields not on the target schema
  W-E  Local bindings out of sync with platform (cache staleness or unregistered)
  W-F  Workflows service not imported in this domain

Reads:
  setup.py            — WORKFLOW_DEFINITIONS, EVENT_BINDINGS
  event_bindings.json — persisted local binding list
  schemas.py          — ALL_SCHEMAS (field validation)

Queries (with --platform):
  GET  /api/v1/services/workflows/config              (read bindings)
  POST /api/v1/services/execute (validate_workflow)   (cross-check)

Usage:
    python workflow_tests.py                # static checks
    python workflow_tests.py --platform     # + platform cross-check
    python workflow_tests.py --json         # CI output
    python workflow_tests.py --verbose      # show passes too
    python workflow_tests.py --bail         # stop on first failure

Exit: 0 = clean, 1 = hard failure, 2 = warnings only.
"""

import sys
from pathlib import Path

# Make sibling _test_lib importable when this is run from the app root
sys.path.insert(0, str(Path(__file__).resolve().parent))

from _test_lib import (
    Results, PlatformClient,
    load_setup_py, load_schemas, load_event_bindings_json,
    build_schema_index, parse_event, is_event_named_workflow,
    did_you_mean, make_arg_parser, print_human, print_json,
    bold,
)


# ════════════════════════════════════════════════════════════════════
# Phase A — static checks
# ════════════════════════════════════════════════════════════════════

def check_event_bindings_have_event(bindings, results):
    """W-A: every binding must have a non-null event field."""
    section = "event_bindings_format"
    if not bindings:
        results.skip(section, "have_event_field", "no bindings to check")
        return
    failing = []
    for i, b in enumerate(bindings):
        if not isinstance(b, dict):
            results.fail(section, f"binding[{i}]_is_dict",
                f"binding[{i}] is not a dict (got {type(b).__name__})",
                mode="W-A")
            continue
        event = b.get("event")
        if event is None or event == "":
            wf = b.get("workflow_id", "<unknown>")
            failing.append((i, wf))
    if failing:
        for i, wf in failing:
            results.fail(
                section, "event_is_null",
                f"binding[{i}] for workflow_id='{wf}' has event=null. "
                "This workflow will NEVER fire on CRUD events.",
                mode="W-A",
                hint=(
                    "Edit setup.py EVENT_BINDINGS to set 'event' to "
                    "'@create:<schema>', '@update:<schema>', or '@delete:<schema>'. "
                    f"For workflow '{wf}', the event is typically @create:<entity> "
                    "where <entity> is the snake_case schema this workflow operates on."
                ),
            )
    else:
        results.pass_(section, "have_event_field",
            f"all {len(bindings)} bindings have non-null event")


# WB-SCHEMA-NORMALIZE-V1: the platform normalizes schema names to snake_case at
# runtime (supero/schema_naming.py: "AuditReport" -> "audit_report"). Event
# targets are snake_case; schemas.py names are PascalCase. Compare NORMALIZED
# forms so a correct snake_case event target isn't falsely flagged (W-B).
try:
    from supero.schema_naming import normalize_schema_name as _normalize_schema_name
except Exception:
    def _normalize_schema_name(name):
        if not isinstance(name, str):
            return ""
        s = re.sub(r"(.)([A-Z][a-z]+)", r"\1_\2", name)
        s = re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", s)
        return s.lower()


def check_event_format(bindings, schema_index, results):
    """W-B: event must match @(create|update|delete):<snake_case_schema>
    AND the schema must exist in schemas.py."""
    section = "event_bindings_format"
    if not bindings:
        return
    seen_valid = 0
    for i, b in enumerate(bindings):
        if not isinstance(b, dict):
            continue
        event = b.get("event")
        if event is None or event == "":
            continue  # already flagged as W-A
        verb, schema = parse_event(event)
        if verb is None:
            hint_parts = []
            if isinstance(event, str):
                if not event.startswith("@"):
                    hint_parts.append("missing leading '@'")
                if ":" not in event:
                    hint_parts.append("missing ':schema' suffix")
                if any(c.isupper() for c in event):
                    hint_parts.append("contains uppercase (use snake_case)")
                if any(c in event for c in "-/. "):
                    hint_parts.append("contains invalid characters")
            hint = (
                "; ".join(hint_parts)
                or "expected pattern: @(create|update|delete):<snake_case_schema>"
            )
            results.fail(
                section, "invalid_event_format",
                f"binding[{i}] event={event!r} doesn't match the required pattern",
                mode="W-B", hint=hint,
            )
            continue
        # WB-SCHEMA-NORMALIZE-V1: normalize both sides (platform canonicalizes to
        # snake_case) before membership check.
        _norm_index = {_normalize_schema_name(k) for k in schema_index} \
            if schema_index else set()
        if schema_index and _normalize_schema_name(schema) not in _norm_index:
            suggestion = did_you_mean(schema, schema_index.keys())
            hint = (f"did you mean: {suggestion}" if suggestion
                    else f"add a schema named '{schema}' in schemas.py, "
                         "or change the event to reference an existing schema")
            results.fail(
                section, "event_schema_unknown",
                f"binding[{i}] event={event!r} references schema "
                f"'{schema}' which doesn't exist in schemas.py",
                mode="W-B", hint=hint,
            )
        else:
            seen_valid += 1
    if seen_valid:
        results.pass_(section, "events_well_formed",
            f"{seen_valid} bindings have well-formed events on known schemas")


def check_workflow_id_resolves(bindings, defs, results):
    """W-C: each binding's workflow_id must match a WORKFLOW_DEFINITION."""
    section = "workflow_id_resolution"
    if not bindings:
        return
    def_ids = {d["workflow_id"] for d in (defs or [])
               if isinstance(d, dict) and d.get("workflow_id")}
    if not def_ids:
        results.warn(
            section, "no_workflow_definitions",
            "EVENT_BINDINGS exist but WORKFLOW_DEFINITIONS is empty — "
            "no binding can resolve.",
            mode="W-C",
            hint="Add WORKFLOW_DEFINITIONS entries to setup.py for each "
                 "workflow_id referenced in EVENT_BINDINGS.",
        )
        return
    resolved = 0
    for i, b in enumerate(bindings):
        if not isinstance(b, dict):
            continue
        wf = b.get("workflow_id")
        if not wf:
            results.fail(section, "workflow_id_missing",
                f"binding[{i}] has no workflow_id field", mode="W-C")
            continue
        if wf not in def_ids:
            suggestion = did_you_mean(wf, def_ids)
            hint = (f"did you mean: {suggestion}" if suggestion
                    else "add a WORKFLOW_DEFINITION with this workflow_id in setup.py")
            results.fail(
                section, "workflow_id_unresolved",
                f"binding[{i}] workflow_id='{wf}' has no matching "
                "WORKFLOW_DEFINITION. The binding fires but execution fails.",
                mode="W-C", hint=hint,
            )
        else:
            resolved += 1
    if resolved:
        results.pass_(section, "workflow_ids_resolve",
            f"{resolved} bindings resolve to a WORKFLOW_DEFINITION")


def check_input_map_paths(bindings, schema_index, results):
    """W-D: input_map values should reference real fields on the target schema."""
    section = "input_map_paths"
    if not bindings or not schema_index:
        return
    issues = 0
    ok = 0
    for i, b in enumerate(bindings):
        if not isinstance(b, dict):
            continue
        verb, schema = parse_event(b.get("event"))
        if schema is None or schema not in schema_index:
            continue
        input_map = b.get("input_map") or {}
        if not isinstance(input_map, dict):
            continue
        valid_fields = schema_index[schema]
        for key, path in input_map.items():
            if not isinstance(path, str) or not path:
                continue
            # input_map values are dotted paths against the CRUD payload.
            # The record's own fields appear at the top level; check the head.
            head = path.split(".")[0]
            if head in valid_fields:
                ok += 1
                continue
            # If it looks like a path (snake_case identifier) but doesn't
            # match any field, flag it. Literals like "USD" or "v1" pass
            # through silently — they're allowed (input_map can pass
            # constants too).
            import re
            if re.match(r"^[a-z][a-z0-9_]*$", head):
                suggestion = did_you_mean(head, valid_fields)
                if suggestion:
                    hint = f"did you mean: {suggestion}"
                else:
                    fields_str = ", ".join(sorted(valid_fields))
                    hint = f"available fields on '{schema}': {fields_str[:300]}"
                results.warn(
                    section, "input_map_path_unknown",
                    f"binding[{i}] for '{b.get('workflow_id')}' "
                    f"input_map[{key!r}]={path!r} references '{head}' "
                    f"which isn't a field on schema '{schema}'",
                    mode="W-D", hint=hint,
                )
                issues += 1
    if ok and not issues:
        results.pass_(section, "input_map_paths_resolve",
            f"{ok} input_map paths reference real schema fields")


def check_workflow_definitions_shape(defs, results):
    """Static check: WORKFLOW_DEFINITIONS have the required fields."""
    section = "workflow_definitions"
    if not defs:
        results.skip(section, "shape_check", "no WORKFLOW_DEFINITIONS to check")
        return
    issues = 0
    for i, d in enumerate(defs or []):
        if not isinstance(d, dict):
            results.fail(section, "definition_not_dict",
                f"WORKFLOW_DEFINITIONS[{i}] is not a dict")
            issues += 1
            continue
        missing = [k for k in ("workflow_id", "steps") if not d.get(k)]
        if missing:
            results.fail(
                section, "missing_required_fields",
                f"WORKFLOW_DEFINITIONS[{i}] missing required fields: {missing}",
                hint="every WORKFLOW_DEFINITION needs workflow_id and steps",
            )
            issues += 1
            continue
        steps = d.get("steps") or []
        if not isinstance(steps, list) or not steps:
            results.fail(
                section, "steps_empty_or_not_list",
                f"WORKFLOW_DEFINITIONS[{i}].steps must be a non-empty list",
                hint="add at least one step (service_call, crud_operation, etc.)",
            )
            issues += 1
    if issues == 0:
        results.pass_(section, "all_definitions_well_formed",
            f"{len(defs)} workflow definitions are well-formed")


# ════════════════════════════════════════════════════════════════════
# Phase B — platform cross-check
# ════════════════════════════════════════════════════════════════════

def check_platform_in_sync(local_bindings, client, results):
    """W-E + W-F: local event_bindings.json must match platform's registered list."""
    section = "platform_sync"
    if not client.ready:
        results.skip(section, "platform_query",
            f"platform client not ready (missing: {client.missing})")
        return

    platform_config, err = client.get_service_config("workflows")
    if err:
        if err.startswith("404"):
            results.fail(
                section, "workflows_not_imported",
                "GET /api/v1/services/workflows/config returned 404. "
                "The workflows service has not been imported into this domain.",
                mode="W-F",
                hint="Ensure 'workflows' is in config.py services list AND "
                     "appears last. Then re-run ./run.sh --setup-only.",
            )
        else:
            results.skip(section, "platform_query", err)
        return

    platform_bindings = platform_config.get("event_bindings") or []

    # Compare by (event, workflow_id, frozen input_map)
    def _key(b):
        if not isinstance(b, dict):
            return ("__bad__",)
        return (
            b.get("event"),
            b.get("workflow_id"),
            tuple(sorted((b.get("input_map") or {}).items())),
        )

    local_set = {_key(b) for b in (local_bindings or [])}
    platform_set = {_key(b) for b in platform_bindings}

    if local_set == platform_set:
        results.pass_(section, "in_sync",
            f"local ({len(local_set)}) and platform ({len(platform_set)}) "
            "bindings match")
        return

    only_local = local_set - platform_set
    only_platform = platform_set - local_set
    results.fail(
        section, "out_of_sync",
        f"local has {len(local_set)} bindings, platform has {len(platform_set)}; "
        f"{len(only_local)} only in local, {len(only_platform)} only on platform",
        mode="W-E",
        hint="Re-run ./run.sh --setup-only to push local bindings to the "
             "platform. If you've edited bindings on the platform out-of-band, "
             "expect drift here.",
    )


def check_workflows_validate_on_platform(defs, client, results):
    """Cross-check: call the platform's validate_workflow op for each definition.

    The op is implemented by the workflows service (see workflows
    manifest.json). It validates: services/operations exist, input
    mappings are valid, step graph is well-formed.
    """
    section = "platform_validate"
    if not client.ready:
        results.skip(section, "validate_workflow",
            f"platform client not ready (missing: {client.missing})")
        return
    if not defs:
        results.skip(section, "validate_workflow", "no workflows to validate")
        return

    ok = 0
    for d in defs:
        if not isinstance(d, dict):
            continue
        wf_id = d.get("workflow_id")
        if not wf_id:
            continue
        # VALIDATE_NOT_EXECUTE_V1 — a bare {"workflow_id": ...} does NOT
        # validate: the workflows handler infers the operation from the object
        # shape when it cannot read one it recognises, and
        #     workflow_id present + no steps  =>  run_workflow
        # (see workflows/handler.py::_infer_operation). The envelope's own
        # operation arrives under a key that function does not read, so this
        # "static validation" check used to EXECUTE every workflow in the app,
        # with empty input, against the live project on every test run —
        # sending real emails/Slack messages and attempting CRUD updates with a
        # blank record_uuid. Two independent belts stop that:
        #   1. operation_id INSIDE the input — _infer_operation reads this first.
        #   2. steps inline — makes the shape rule resolve to validate_workflow
        #      anyway (steps present AND no "input" key), and gives the platform
        #      the actual step graph to check services/ops against.
        _validate_input = {
            "operation_id": "validate_workflow",
            "workflow_id": wf_id,
            "steps": d.get("steps") or [],
        }
        body, err = client.execute_service_op(
            "workflows", "validate_workflow", _validate_input,
        )
        if err:
            results.warn(
                section, f"validate_{wf_id}",
                f"platform validate_workflow({wf_id}) call failed: {err}",
                hint="platform may not have this workflow registered yet "
                     "(run setup.py to register it)",
            )
            continue
        output = (body or {}).get("output") or {}
        if not isinstance(output, dict):
            results.warn(section, f"validate_{wf_id}",
                f"validate_workflow returned unexpected shape: {output!r}")
            continue
        valid = output.get("valid")
        errors = output.get("errors") or []
        warnings_list = output.get("warnings") or []
        if valid is False or errors:
            results.fail(
                section, f"validate_{wf_id}",
                f"platform rejected workflow '{wf_id}': {errors}",
                hint="fix the errors above; platform sees actual services/ops "
                     "and is authoritative for op-name and input-map validation",
            )
            continue
        if warnings_list:
            results.warn(
                section, f"validate_{wf_id}",
                f"platform validation warnings for '{wf_id}': {warnings_list}",
            )
            continue
        ok += 1
    if ok:
        results.pass_(section, "validate_all",
            f"{ok} workflows pass platform validate_workflow")


# ════════════════════════════════════════════════════════════════════
# Main
# ════════════════════════════════════════════════════════════════════

def main():
    ap = make_arg_parser(
        prog="workflow_tests.py",
        description="Validate workflow bindings, definitions, and platform sync.",
    )
    args = ap.parse_args()

    results = Results()
    results.bail = args.bail

    # Load app structure
    bindings, err = load_event_bindings_json()
    if err:
        results.warn("loading", "event_bindings.json", err)
    bindings = bindings or []

    setup_mod, err = load_setup_py()
    if err:
        results.warn("loading", "setup.py", err)
    defs = getattr(setup_mod, "WORKFLOW_DEFINITIONS", None) if setup_mod else None
    defs = defs or []
    # WA-AUTHORITATIVE-BINDINGS-V1: event_bindings.json is a non-authoritative user
    # reference artifact (events may be null). The source of truth is
    # setup.py EVENT_BINDINGS (what actually deploys). Prefer it; fall back
    # to the JSON only when setup.py defines no bindings.
    _setup_bindings = getattr(setup_mod, "EVENT_BINDINGS", None) if setup_mod else None
    if _setup_bindings:
        bindings = _setup_bindings

    all_schemas, err = load_schemas()
    if err:
        results.warn("loading", "schemas.py",
            f"{err} (input_map field validation will be skipped)")
        schema_index = {}
    else:
        schema_index = build_schema_index(all_schemas)

    # Phase A — static
    if not bindings and not defs:
        results.skip("phase_a", "all_checks",
            "no EVENT_BINDINGS or WORKFLOW_DEFINITIONS present")
    else:
        check_workflow_definitions_shape(defs, results)
        check_event_bindings_have_event(bindings, results)
        check_event_format(bindings, schema_index, results)
        check_workflow_id_resolves(bindings, defs, results)
        check_input_map_paths(bindings, schema_index, results)

    # Phase B — platform
    if args.platform and not results.aborted():
        client = PlatformClient.from_env()
        check_platform_in_sync(bindings, client, results)
        check_workflows_validate_on_platform(defs, client, results)

    if args.json:
        print_json(results, tool_name="workflow_tests")
    else:
        print_human(results, args.verbose, tool_name="🔗 Workflow Tests")

    sys.exit(results.exit_code())


if __name__ == "__main__":
    main()
