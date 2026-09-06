# INTEGRATION_TESTS_VERSION: 1
"""
integration_tests.py — Services and integration health validator.

Failure modes covered:
  I-A  Service used by workflow/actionButton but not in config.services
  I-B  Service required env vars missing from .env
  I-C  Op name mismatch (actionButton/workflow references unknown op)
  I-D  Field reference invalid (actionButton template uses non-existent schema field)
  I-E  External integration unreachable (Stripe key revoked, Slack token expired, ...)

Reads:
  config.py     — services list
  setup.py      — WORKFLOW_DEFINITIONS (to find workflow step service refs)
  schemas.py    — ALL_SCHEMAS (to validate action button field refs)
  ui/app.js     — actionButtons declarations (to validate UI service refs)
  .env          — to check required service env vars

Queries (with --platform):
  GET /api/v1/services/{service_id}/config — to verify plugin loaded + configured

Usage:
    python integration_tests.py                # static checks
    python integration_tests.py --platform     # + platform config checks
    python integration_tests.py --json
    python integration_tests.py --verbose
    python integration_tests.py --bail

Exit: 0 clean, 1 hard failure, 2 warnings only.
"""

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from _test_lib import (
    Results, PlatformClient,
    load_setup_py, load_schemas, load_config_py, load_app_js,
    build_schema_index, parse_app_js_const,
    did_you_mean, make_arg_parser, print_human, print_json,
    ENV, bold,
)


# ════════════════════════════════════════════════════════════════════
# Canonical service-op catalog
# ════════════════════════════════════════════════════════════════════
# Extracted from workflows/LLM_Integration.md (the platform's documented
# input_map table). The platform's validate_workflow op is the
# authoritative source — Phase B calls it for cross-check. This static
# table catches obvious mismatches without a platform call.
#
# Format: {service_id: {op_id: [required_field, ...]}}
# A field name prefixed with '?' is optional.
#
# When a service or op isn't in this table, static checks report
# "unknown service/op" as a warning (not a failure) — the platform
# may have added new services since this was last synced. Phase B
# is authoritative.

_CANONICAL_OPS = {
    "email": {
        "send_email": ["to_email", "subject", "?body_html", "?body_text", "?from_name"],
    },
    "email_smtp": {
        "send_email": ["to_email", "subject", "?body_html", "?body_text"],
    },
    "sms": {
        "send_sms": ["to_number", "body"],
    },
    "whatsapp": {
        "send_message": ["to_number", "body"],
        "send_template": ["to_number", "template_name", "?template_params"],
    },
    "push_notification": {
        "send_notification": ["device_token", "title", "body"],
        "send_topic_broadcast": ["topic", "title", "body"],
    },
    "slack": {
        "send_message": ["channel", "text"],
        "create_channel": ["channel_name", "?topic"],
    },
    "billing": {
        "create_customer": ["email", "?company_name"],
        "create_invoice": ["customer_uuid", "amount", "currency", "?due_date"],
    },
    "billing_paypal": {
        "create_order": ["amount", "currency", "?description"],
    },
    "billing_razorpay": {
        "create_order": ["amount_paise", "currency", "?customer_name"],
    },
    "stripe_checkout": {
        "create_checkout_session": ["success_url", "amount", "?product_name"],
        "create_payment_link": ["price_id"],
    },
    "plaid": {
        "create_link_token": ["client_user_id", "?products"],
        "exchange_public_token": ["public_token"],
    },
    "salesforce": {
        "create_lead": ["last_name", "company", "email"],
        "create_case": ["subject", "?priority", "?case_origin"],
    },
    "instagram": {
        "publish_post": ["media_type", "media_url", "caption"],
    },
    "x_social": {
        "post_tweet": ["text"],
        "post_thread": ["tweets_text"],
    },
    "linkedin": {
        "create_post": ["text"],
    },
    "youtube": {
        "search_videos": ["query", "?max_results"],
    },
    "github": {
        "create_issue": ["repo_owner", "repo_name", "title", "?labels"],
        "create_pull_request": ["repo_owner", "repo_name", "title",
                                "head_branch", "base_branch"],
    },
    "bitbucket": {
        "create_repository": ["workspace", "repo_slug", "?is_private"],
    },
    "amazon_s3": {
        "generate_upload_url": ["key", "?content_type"],
    },
    "google_drive": {
        "create_folder": ["file_name", "?description"],
    },
    "google_calendar": {
        "create_event": ["summary", "start_time", "end_time", "?add_meet"],
    },
    "servicenow": {
        "create_incident": ["short_description", "?urgency", "?impact"],
        "create_change_request": ["short_description", "?change_type"],
    },
    "ai": {
        "simple_completion": ["prompt", "?model", "?max_tokens"],
        "chat_completion": ["messages", "?model"],
    },
    "google_search": {
        "web_search": ["query", "?num"],
    },
    "auth_otp": {
        "send_otp": ["channel", "recipient", "?purpose"],
    },
    "workflows": {
        "run_workflow": ["workflow_id", "input", "?steps", "?input_schema"],
        "validate_workflow": ["workflow_id", "?steps"],
        "get_workflow_status": ["instance_uuid"],
    },
}

# UNKNOWN-SVC-TRANSACTIONAL-V1: transactional service family (task, feedback,
# attachment, accounts, ticket, comment, notification, ...). These are real
# platform services but are NOT in _CANONICAL_OPS (which only tracks
# integration services with documented op input-maps). Used ONLY for the
# unknown-service membership check — deliberately NOT added to _CANONICAL_OPS
# so the I-C op-validation check does not falsely fail on ops we don't list.
_KNOWN_TRANSACTIONAL_SERVICES = frozenset({
    "task", "ticket", "comment", "attachment", "feedback", "membership",
    "notification", "payment", "cart", "order", "booking", "appointment",
    "recurring_plan", "approval", "inventory", "loyalty_points",
    "document_signature", "accounts",
})


# Services that require env vars to function (I-B). Format:
# {service_id: [env_var_name, ...]} — vars are checked against ENV
# (which includes .env). Marked as warnings, not failures, because
# some apps configure via the Supero admin UI instead.
_SERVICE_ENV_REQUIREMENTS = {
    "email":            ["SENDGRID_API_KEY"],
    "email_smtp":       ["SMTP_HOST", "SMTP_USERNAME", "SMTP_PASSWORD"],
    "sms":              ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN"],
    "whatsapp":         ["WHATSAPP_API_TOKEN"],
    "slack":            ["SLACK_BOT_TOKEN"],
    "stripe_checkout":  ["STRIPE_API_KEY"],
    "billing":          ["STRIPE_API_KEY"],
    "billing_paypal":   ["PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET"],
    "billing_razorpay": ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"],
    "salesforce":       ["SALESFORCE_CLIENT_ID", "SALESFORCE_CLIENT_SECRET"],
    "github":           ["GITHUB_TOKEN"],
    "google_drive":     ["GOOGLE_OAUTH_CLIENT_ID"],
    "amazon_s3":        ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"],
    "ai":               ["ANTHROPIC_API_KEY"],
    # workflows: no env vars; configured via service config_data
}


# ════════════════════════════════════════════════════════════════════
# Helpers
# ════════════════════════════════════════════════════════════════════

def _get_services_from_config(config_mod) -> list:
    """Extract the services list from the AppConfig instance."""
    if not config_mod:
        return []
    app_cfg = getattr(config_mod, "AppConfig", None)
    if app_cfg is None:
        # try module-level `config` instance
        app_cfg = getattr(config_mod, "config", None)
    if app_cfg is None:
        return []
    # AppConfig may be a class or an instance. INSTANTIATE IT IF IT IS A CLASS.
    #
    # This is why every app reported an unrendered "not in config.py services" for a
    # service it plainly declares. Every app writes:
    #     services: list = field(default_factory=lambda: [...])
    # and @dataclass REMOVES the class attribute for a default_factory field, so
    # getattr(AppConfig, "services") is None on the class and only exists on an
    # instance. The docstring above always said "instance"; the code never made one.
    # The upstream checks then SKIPPED on an empty list and the downstream check
    # hard-FAILED — skip upstream, fail downstream, in all 19 apps.
    if isinstance(app_cfg, type):
        try:
            app_cfg = app_cfg()
        except Exception:
            pass
    services = getattr(app_cfg, "services", None)
    if callable(services):  # method
        try:
            services = services()
        except Exception:
            services = None
    if not isinstance(services, (list, tuple)):
        return []
    return [s for s in services if isinstance(s, str)]


def _collect_workflow_step_services(defs) -> list:
    """Pull (service, operation) tuples out of every workflow step (recursive)."""
    out = []

    def walk(steps):
        if not isinstance(steps, list):
            return
        for s in steps:
            if not isinstance(s, dict):
                continue
            stype = s.get("type")
            if stype == "service_call" and s.get("service"):
                out.append((s["service"], s.get("operation"), s.get("id", "?")))
            # recurse into branch/parallel structures
            for child_key in ("steps", "then_steps", "else_steps"):
                if child_key in s:
                    walk(s[child_key])

    for d in (defs or []):
        if isinstance(d, dict):
            walk(d.get("steps"))
    return out


def _collect_action_buttons(app_js_source):
    """Extract actionButtons from app.js. Returns (dict_or_None, error).

    actionButtons is typically: { schema_name: [ {label, service, operation,
    emailField, bodyTemplate, ...}, ... ], ... }
    """
    if not app_js_source:
        return None, "app.js source not loaded"
    val, err = parse_app_js_const(app_js_source, "actionButtons")
    if val is None:
        return None, err
    if not isinstance(val, dict):
        return None, f"actionButtons is not an object literal (got {type(val).__name__})"
    return val, None


# ════════════════════════════════════════════════════════════════════
# Phase A — static checks
# ════════════════════════════════════════════════════════════════════

def check_services_in_config_known(services, results):
    """Sanity: services declared in config.py are known platform services."""
    section = "config_services"
    if not services:
        results.skip(section, "services_known", "no services declared in config.py")
        return
    # UNKNOWN-SVC-TRANSACTIONAL-V1: a service is 'known' if it has a documented op-map
    # (_CANONICAL_OPS) OR is a recognized transactional service.
    unknown = [s for s in services
               if s not in _CANONICAL_OPS
               and s not in _KNOWN_TRANSACTIONAL_SERVICES]
    if unknown:
        for s in unknown:
            suggestion = did_you_mean(s, _CANONICAL_OPS.keys())
            hint = (f"did you mean: {suggestion}" if suggestion
                    else "if this is a new platform service, "
                         "_test_lib's canonical table needs an update")
            results.warn(
                section, f"unknown_service_{s}",
                f"service '{s}' in config.py is not in the canonical catalog. "
                "May still work if the platform recognizes it.",
                hint=hint,
            )
    known_count = len(services) - len(unknown)
    if known_count > 0:
        results.pass_(section, "services_known",
            f"{known_count}/{len(services)} services are in the canonical catalog")


def check_workflows_last_if_present(services, results):
    """If 'workflows' is in services, it must be last (registration order rule)."""
    section = "config_services"
    if not services or "workflows" not in services:
        results.skip(section, "workflows_last", "workflows not in services list")
        return
    if services[-1] != "workflows":
        idx = services.index("workflows")
        after = services[idx + 1:]
        results.fail(
            section, "workflows_must_be_last",
            f"'workflows' is at index {idx} but must be last; "
            f"these services come after it: {after}",
            hint="Move 'workflows' to the end of the services list in config.py. "
                 "ensure_event_bindings() depends on other services being "
                 "registered first.",
        )
    else:
        results.pass_(section, "workflows_last",
            "'workflows' is correctly last in the services list")


def check_required_env_vars(services, results):
    """I-B: each service's required env vars are set."""
    section = "env_vars"
    if not services:
        return
    missing_total = 0
    services_with_missing = []
    for s in services:
        req = _SERVICE_ENV_REQUIREMENTS.get(s, [])
        missing = [v for v in req if not ENV.get(v)]
        if missing:
            services_with_missing.append((s, missing))
            missing_total += len(missing)
    if services_with_missing:
        for svc, missing in services_with_missing:
            results.warn(
                section, f"missing_env_{svc}",
                f"service '{svc}' is missing env vars: {missing}",
                mode="I-B",
                hint="Set these in .env, OR configure the service via the "
                     "Supero admin UI (Services → " + svc + "). "
                     "If configured via UI, this warning can be ignored.",
            )
    if missing_total == 0 and services:
        results.pass_(section, "env_vars_present",
            "all required env vars present for declared services")


def check_workflow_step_services_in_config(services, defs, results):
    """I-A: every workflow step's `service` must be in config.services."""
    section = "workflow_step_services"
    refs = _collect_workflow_step_services(defs)
    if not refs:
        results.skip(section, "step_services", "no service_call steps in workflows")
        return
    declared = set(services or [])
    missing = []
    for svc, op, step_id in refs:
        if svc not in declared:
            missing.append((svc, op, step_id))
    if missing:
        for svc, op, step_id in missing:
            suggestion = did_you_mean(svc, declared) if declared else None
            hint = (f"did you mean: {suggestion}" if suggestion
                    else f"add '{svc}' to config.py services list")
            results.fail(
                section, f"step_uses_undeclared_service",
                f"workflow step '{step_id}' calls service '{svc}.{op}' but "
                f"'{svc}' is not in config.py services",
                mode="I-A", hint=hint,
            )
    else:
        results.pass_(section, "step_services_declared",
            f"all {len(refs)} workflow service_call steps reference declared services")


def check_workflow_step_op_names(defs, results):
    """I-C: each workflow step (service, operation) pair is in canonical catalog."""
    section = "workflow_step_ops"
    refs = _collect_workflow_step_services(defs)
    if not refs:
        return
    ok = 0
    for svc, op, step_id in refs:
        ops = _CANONICAL_OPS.get(svc)
        if ops is None:
            # already warned by services_known
            continue
        if op not in ops:
            suggestion = did_you_mean(op, ops.keys())
            hint = (f"did you mean: {suggestion}" if suggestion
                    else f"available ops on '{svc}': {', '.join(sorted(ops.keys()))}")
            results.fail(
                section, "unknown_operation",
                f"workflow step '{step_id}' calls '{svc}.{op}' but op '{op}' "
                f"is not declared by service '{svc}'",
                mode="I-C", hint=hint,
            )
        else:
            ok += 1
    if ok:
        results.pass_(section, "step_ops_canonical",
            f"all {ok} workflow service_call ops are in the canonical catalog")


def check_action_button_services_and_ops(app_js_source, services, results):
    """I-A + I-C for actionButtons. Skips silently if app.js doesn't declare them."""
    section = "action_buttons"
    if not app_js_source:
        results.skip(section, "action_buttons", "app.js not available")
        return
    buttons, err = _collect_action_buttons(app_js_source)
    if err:
        # Not finding actionButtons is normal for some apps — skip, don't warn
        if "not found" in (err or "").lower():
            results.skip(section, "action_buttons", err)
        else:
            results.warn(section, "action_buttons_parse", err)
        return

    declared_services = set(services or [])
    ok_pairs = 0

    for schema_name, btns in (buttons or {}).items():
        if not isinstance(btns, list):
            continue
        for i, btn in enumerate(btns):
            if not isinstance(btn, dict):
                continue
            svc = btn.get("service")
            op = btn.get("operation") or btn.get("op")
            label = btn.get("label", f"button[{i}]")
            if not svc:
                continue  # may be a navigation-only button
            if svc not in declared_services:
                suggestion = did_you_mean(svc, declared_services) if declared_services else None
                hint = (f"did you mean: {suggestion}" if suggestion
                        else f"add '{svc}' to config.py services list")
                results.fail(
                    section, f"button_undeclared_service",
                    f"actionButton '{label}' on schema '{schema_name}' uses "
                    f"service '{svc}' which isn't in config.py services",
                    mode="I-A", hint=hint,
                )
                continue
            ops = _CANONICAL_OPS.get(svc)
            if ops and op and op not in ops:
                suggestion = did_you_mean(op, ops.keys())
                hint = (f"did you mean: {suggestion}" if suggestion
                        else f"available ops on '{svc}': {', '.join(sorted(ops.keys()))}")
                results.fail(
                    section, f"button_unknown_op",
                    f"actionButton '{label}' on schema '{schema_name}' calls "
                    f"'{svc}.{op}' but op '{op}' is not declared by service '{svc}'",
                    mode="I-C", hint=hint,
                )
                continue
            ok_pairs += 1

    if ok_pairs:
        results.pass_(section, "all_buttons_well_formed",
            f"{ok_pairs} actionButtons reference valid (service, op) pairs")


def check_action_button_field_refs(app_js_source, schema_index, results):
    """I-D: actionButton emailField/phoneField etc. reference real schema fields."""
    section = "action_button_fields"
    if not app_js_source or not schema_index:
        return
    buttons, err = _collect_action_buttons(app_js_source)
    if err or not buttons:
        return

    FIELD_REF_KEYS = ("emailField", "phoneField", "uuidField",
                      "recipientField", "targetField")

    issues = 0
    ok = 0
    for schema_name, btns in (buttons or {}).items():
        valid = schema_index.get(schema_name)
        if not valid:
            continue  # schema not in our index; can't validate
        if not isinstance(btns, list):
            continue
        for i, btn in enumerate(btns):
            if not isinstance(btn, dict):
                continue
            label = btn.get("label", f"button[{i}]")
            for key in FIELD_REF_KEYS:
                field = btn.get(key)
                if not isinstance(field, str) or not field:
                    continue
                if field in valid:
                    ok += 1
                else:
                    suggestion = did_you_mean(field, valid)
                    hint = (f"did you mean: {suggestion}" if suggestion
                            else f"available fields on '{schema_name}': "
                                 f"{', '.join(sorted(valid))[:300]}")
                    results.fail(
                        section, f"field_ref_invalid_{key}",
                        f"actionButton '{label}' on schema '{schema_name}' "
                        f"{key}={field!r} references a field that doesn't exist",
                        mode="I-D", hint=hint,
                    )
                    issues += 1
    if ok and issues == 0:
        results.pass_(section, "field_refs_valid",
            f"all {ok} actionButton field references resolve")


# ════════════════════════════════════════════════════════════════════
# Phase B — platform checks
# ════════════════════════════════════════════════════════════════════

def check_service_plugins_loaded(services, client, results):
    """Each declared service's plugin must be loaded on the platform."""
    section = "platform_plugins"
    if not services:
        results.skip(section, "plugins_loaded", "no services declared")
        return
    if not client.ready:
        results.skip(section, "plugins_loaded",
            f"platform client not ready (missing: {client.missing})")
        return

    loaded = 0
    for svc in services:
        cfg, err = client.get_service_config(svc)
        if err:
            if err.startswith("404"):
                results.fail(
                    section, f"plugin_not_loaded_{svc}",
                    f"GET /api/v1/services/{svc}/config returned 404. "
                    f"Service '{svc}' is not imported in this domain.",
                    mode="I-A",
                    hint="Run ./run.sh --setup-only to import declared services.",
                )
            else:
                results.warn(
                    section, f"plugin_check_failed_{svc}",
                    f"platform check for '{svc}' failed: {err}",
                )
            continue
        loaded += 1
    if loaded:
        results.pass_(section, "plugins_loaded",
            f"{loaded}/{len(services)} services loaded on platform")


def check_service_config_populated(services, client, results):
    """I-B (runtime): service config_data populated for services with credential needs."""
    section = "platform_credentials"
    if not services:
        return
    if not client.ready:
        results.skip(section, "credentials_set",
            f"platform client not ready (missing: {client.missing})")
        return

    SERVICES_NEEDING_CREDS = {
        "email", "email_smtp", "sms", "slack", "stripe_checkout", "billing",
        "billing_paypal", "billing_razorpay", "salesforce", "github",
        "amazon_s3", "ai", "whatsapp", "plaid",
    }

    checked = 0
    for svc in services:
        if svc not in SERVICES_NEEDING_CREDS:
            continue
        cfg, err = client.get_service_config(svc)
        if err:
            continue  # already reported by plugins check
        # Heuristic: at least one key beyond 'base_url' should be set
        non_base = [k for k in cfg.keys() if k != "base_url"]
        if not non_base:
            results.warn(
                section, f"no_credentials_{svc}",
                f"service '{svc}' has only 'base_url' configured — "
                "no credentials registered yet",
                mode="I-B",
                hint=f"configure '{svc}' via the Supero admin UI "
                     "(Services → " + svc + ") with the required credentials",
            )
        else:
            checked += 1
    if checked:
        results.pass_(section, "credentials_populated",
            f"{checked} credential-needing services have config_data populated")


# ════════════════════════════════════════════════════════════════════
# Main
# ════════════════════════════════════════════════════════════════════

def main():
    ap = make_arg_parser(
        prog="integration_tests.py",
        description="Validate service config, env vars, action button refs, and platform state.",
    )
    args = ap.parse_args()

    results = Results()
    results.bail = args.bail

    # Load app structure
    config_mod, err = load_config_py()
    if err:
        results.warn("loading", "config.py", err)
    services = _get_services_from_config(config_mod)

    setup_mod, err = load_setup_py()
    if err:
        results.warn("loading", "setup.py", err)
    defs = getattr(setup_mod, "WORKFLOW_DEFINITIONS", None) if setup_mod else None
    defs = defs or []

    all_schemas, err = load_schemas()
    schema_index = build_schema_index(all_schemas) if all_schemas else {}

    app_js_source, err = load_app_js()
    if err:
        results.skip("loading", "app.js", err)
        app_js_source = None

    # Phase A
    check_services_in_config_known(services, results)
    check_workflows_last_if_present(services, results)
    check_required_env_vars(services, results)
    check_workflow_step_services_in_config(services, defs, results)
    check_workflow_step_op_names(defs, results)
    check_action_button_services_and_ops(app_js_source, services, results)
    check_action_button_field_refs(app_js_source, schema_index, results)

    # Phase B
    if args.platform and not results.aborted():
        client = PlatformClient.from_env()
        check_service_plugins_loaded(services, client, results)
        check_service_config_populated(services, client, results)

    if args.json:
        print_json(results, tool_name="integration_tests")
    else:
        print_human(results, args.verbose, tool_name="🔌 Integration Tests")

    sys.exit(results.exit_code())


if __name__ == "__main__":
    main()
