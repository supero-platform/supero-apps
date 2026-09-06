#!/usr/bin/env python3
# SERVICE_INTEGRATION_REPORT_VERSION: 3
"""
service_integration_report.py — Service Integration Matrix Report.

Produces a clear, scannable report showing for each imported service:
  - Whether config.py and services.json agree about it
  - Whether tenant data schemas extend the service's data base
  - Whether tenant UI schemas extend the service's UI base
  - Whether app.js calls registerExtensions for it
  - The service's verdict (fully wired / workflow-only / drift / etc.)

Failure modes covered:
  S-A1  Configuration drift (config.py SERVICE_IDS vs services.json)
  S-A2  UI extension references unknown supero_ui:* or <svc>:base_*_admin_ui
  S-A3  UI extension `ui_for` references unknown data schema
  S-A4  card_template / featured_fields / field_renderer__X fields don't exist
  S-A5  Bad renderer/editor alias in field_renderer__X / field_editor__X
  S-B1  registerExtensions target tenant schema doesn't exist
  S-B2  registerExtensions wrong shape (two-schema vs single)
  S-B3  UI schema extends a service but no registerExtensions call for it
  S-C1  Namespace mismatch: config.js appNamespace != schema namespace
        (app.js resolves nothing -> zero tabs). HARD FAIL.

Usage:
    python service_integration_report.py             # report + checks
    python service_integration_report.py --json      # machine-readable
    python service_integration_report.py --verbose
    python service_integration_report.py --bail
    python service_integration_report.py --matrix-only  # just the matrix table

Exit: 0 clean, 1 hard failure, 2 warnings only.

CHANGES vs VERSION 1 (review fixes):
  - _norm_services_json now handles the dict-of-lists shape its docstring
    promised (previously returned empty set → false config-drift).
  - _extract_register_extensions warns on calls it cannot parse instead of
    silently dropping them (previously → false S-B3 "not registered").
  - Verdict tree gained explicit data-only and UI-only arms (previously both
    fell through to misleading "partial integration").
  - Single shared NON_SERVICE_NAMESPACES set used by _ext_service and
    _data_parent_service; added 'supero' to stop a phantom "supero" service.
  - check_field_references: 'ok' renamed to 'examined' + a real pass count,
    removing the mislabel that a refactor could turn into a false success.
  - did_you_mean calls now receive sorted iterables for stable --json output.

CHANGES vs VERSION 2 (verified against real _test_lib.py):
  - check_field_references now reads build_schema_index values correctly.
    The index maps {schema_name: set_of_field_names}, NOT {name: schema_dict}.
    v1/v2 treated the value as a dict and walked .get("attributes"), so the
    isinstance(target, dict) guard always failed → S-A4 silently validated
    nothing. Now uses the field-name set directly, so S-A4 actually runs.
    (System fields like uuid/name/created_at are already included by the
    index, so references to them resolve instead of false-failing.)
  - Added `if results.aborted(): return` guards inside each check loop so
    counters and summary calls don't run after --bail trips (cosmetic; the
    accumulator already drops post-abort results, but this keeps counts honest).

CHANGES vs VERSION 3 (false-positive fixes — schemas.py is source of truth):
  - S-A1 is advisory only. services.json is a user-review artifact, NOT the
    source of truth; config.py / schemas.py SERVICE_IDS is authoritative.
    declared_not_deployed is now a WARN, not a hard fail — it no longer
    fails the build (exit 1) just because services.json is stale.
  - S-A3 / S-A4 / S-B1 now normalize schema identifiers before comparing.
    Data schemas are named PascalCase ("ClientCompany"); ui_for / register
    targets reference them snake_case ("client_company"). The runtime
    resolver normalizes between the two; the validator now does too, via a
    local _norm_ident() + a normalized schema-name set built directly from
    schemas.py (independent of build_schema_index's keying).
  - S-A4 no longer hard-fails on fields it cannot see. A schema that
    `extends` a service base inherits fields (status, signed_at, …) that do
    not live in schemas.py. For such schemas, unknown-field references are
    reported as WARN ("may live on the service base"), not FAIL, because the
    base field set is not visible without --platform mode.
  - S-B1 resolves register targets by bare type (namespace optional) using
    the same normalization, so an unnamespaced 'recruitment_ticket' that
    exists in schemas.py is no longer reported missing.
"""

import json
import os
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from _test_lib import (
    Results, PlatformClient,
    load_schemas, load_config_py, load_app_js, load_services_json,
    build_schema_index,
    did_you_mean, make_arg_parser, print_human, print_json,
    green, red, yellow, dim, bold,
)
from _test_lib import _js_to_json_lite as _js_to_json


# ════════════════════════════════════════════════════════════════════
# Constants — known platform vocabulary
# ════════════════════════════════════════════════════════════════════

# Namespaces that are NEVER a service id. Shared by _ext_service and
# _data_parent_service so the two stay in lockstep (previously they had
# slightly different exclusion lists, and neither excluded 'supero', which
# let a base 'supero:*' schema invent a phantom service named "supero").
NON_SERVICE_NAMESPACES = frozenset({
    "supero_ui", "supero", "_sys_", "tenant",
})

# Known supero_ui:base_* schemas an app may extend.
# (Hardcoded; future enhancement = fetch from platform with --platform mode.)
KNOWN_SUPERO_UI_BASES = frozenset({
    "supero_ui:base_record_ui",
    "supero_ui:base_landing_page_config",
    "supero_ui:base_app_shell_config",
    "supero_ui:base_metric_card_config",
    "supero_ui:base_hero_variant",
    "supero_ui:base_stats_variant",
    "supero_ui:base_feature_grid_variant",
})

# Services that ship with UI bases — apps CAN extend them for an admin panel.
SERVICES_WITH_UI = frozenset({
    "appointment", "ticket", "cart", "order", "notification",
    "comment", "task", "feedback", "attachment",
    "approval", "payment", "booking",
})

# Services that are workflow / backend / admin-only — apps typically do
# NOT extend them for UI. No warning if a service in this set is imported
# without UI integration.
SERVICES_BACKEND_ONLY = frozenset({
    "accounts", "auth_otp", "amazon_s3", "billing",
    "ai", "email", "sms", "push_notification", "webhook",
    "cron", "search_index", "audit_log",
})

# Two-schema services: registerExtensions value must be a 2-element array
# [parent_extension, child_extension].
TWO_SCHEMA_SERVICES = frozenset({
    "cart", "order", "approval", "document_signature",
    "inventory", "loyalty_points",
})

# Known renderer aliases (from platform atoms/).
# (Hardcoded; will go stale — track in a future fetch-from-platform mode.)
KNOWN_RENDERER_ALIASES = frozenset({
    "text", "longtext", "email", "url", "phone",
    "number", "integer", "currency", "percent", "percentage",
    "boolean", "date", "datetime", "time", "duration", "rating",
    "image", "image_grid", "thumbnail", "avatar",
    "enum", "tag", "tag_list", "lifecycle_state",
    "color_swatch", "code", "markdown",
    "address", "geo_point", "attached_file",
    "reference", "reference_list", "ref_link",
    "json", "key_value", "progress",
})

# Known editor aliases (from platform atoms/).
KNOWN_EDITOR_ALIASES = frozenset({
    "text", "textarea", "longtext", "number", "integer",
    "currency", "percent", "boolean", "checkbox",
    "date", "datetime", "time",
    "select", "enum", "multi_select", "tag_picker",
    "color_picker", "image_upload", "file_upload",
    "address", "geo_point",
    "reference_picker", "reference_list_picker",
    "json", "code", "markdown", "rich_text",
})


# ════════════════════════════════════════════════════════════════════
# Helpers
# ════════════════════════════════════════════════════════════════════

def _norm_ident(name: str) -> str:
    """Normalize a schema identifier to a canonical comparison key.

    Data schemas are named in PascalCase ("ClientCompany"); ui_for and
    registerExtensions targets reference them in snake_case ("client_company").
    The runtime SuperoUISchemaResolver treats these as equivalent, so the
    validator must too. We fold both forms to lowercase-no-separators:
        "ClientCompany"   -> "clientcompany"
        "client_company"  -> "clientcompany"
        "recruitment_ticket" -> "recruitmentticket"
    Any trailing namespace ("ns:Type") is stripped by the caller before this.
    """
    if not isinstance(name, str):
        return ""
    return re.sub(r'[^a-z0-9]', '', name.lower())


def _bare_type(value: str) -> str:
    """Return the type portion of a possibly-namespaced identifier.
    'recruitment-agency:client_company' -> 'client_company'
    'recruitment_ticket'                -> 'recruitment_ticket'
    """
    if not isinstance(value, str):
        return ""
    return value.split(":", 1)[1] if ":" in value else value


def build_normalized_schema_names(all_schemas: list) -> set:
    """Build a set of normalized schema identifiers straight from schemas.py
    (the source of truth), independent of build_schema_index's key casing.
    Includes every object/enum schema 'name'. Used by S-A3 / S-B1 so a
    snake_case reference resolves against a PascalCase schema name."""
    out = set()
    for s in all_schemas or []:
        if isinstance(s, dict):
            nm = s.get("name")
            if nm:
                out.add(_norm_ident(nm))
    return out


def _schema_by_norm(all_schemas: list, norm_key: str):
    """Return the schema dict whose normalized name matches norm_key, else None."""
    for s in all_schemas or []:
        if isinstance(s, dict) and _norm_ident(s.get("name", "")) == norm_key:
            return s
    return None


def _extends_service_base(schema: dict) -> str | None:
    """If a data schema `extends` a service base ('ticket:base_ticket'),
    return the service id; else None. Used to know when a schema inherits
    fields the validator cannot see in schemas.py."""
    if not isinstance(schema, dict):
        return None
    ext = schema.get("extends", "")
    if not isinstance(ext, str) or ":" not in ext:
        return None
    ns = ext.split(":", 1)[0]
    if ns in NON_SERVICE_NAMESPACES:
        return None
    return ns


# Attribute names in a service UI manifest whose default-value(s) are field refs.
_MANIFEST_FIELD_REF_ATTRS = frozenset({
    "start_field", "end_field", "duration_field", "title_field", "color_field",
    "primary_field", "badge_field", "x_axis_field", "y_axis_field",
    "cell_state_field", "cell_label_field", "subtitle_field", "image_field",
    "secondary_fields", "metadata_fields", "featured_fields", "group_by_field",
    "sort_field", "default_sort_field",
})


def _find_service_manifest_dir() -> Path | None:
    """Locate the SDK's bundled service UI manifests:
    <site-packages>/supero/ui/schemas/services/. Try the installed `supero`
    package first, then a couple of common fallbacks. Returns the dir or None."""
    # 1. Via the installed package (most reliable; respects the active venv).
    try:
        import importlib.util
        spec = importlib.util.find_spec("supero")
        if spec and spec.submodule_search_locations:
            for loc in spec.submodule_search_locations:
                d = Path(loc) / "ui" / "schemas" / "services"
                if d.is_dir():
                    return d
    except Exception:
        pass
    # 2. Env override for odd installs.
    env = os.environ.get("SUPERO_SERVICE_MANIFESTS")
    if env and Path(env).is_dir():
        return Path(env)
    # 3. Common relative fallbacks (running from tests/ inside an app).
    for rel in (".venv/lib/*/site-packages/supero/ui/schemas/services",
                "../.venv/lib/*/site-packages/supero/ui/schemas/services"):
        import glob
        for hit in glob.glob(rel):
            d = Path(hit)
            if d.is_dir():
                return d
    return None


def _extract_base_fields_from_manifest(manifest: dict) -> set:
    """Given a parsed <svc>.ui.json, recover the set of base data-field names the
    base UI references. HIGH-RECALL allowlist: a field present here DEFINITELY
    exists on the base; a field absent is UNCERTAIN (the base may carry fields its
    UI doesn't render), so absence must NOT be treated as proof of non-existence.

    Two sources of field names:
      1. attribute names `field_renderer__X` / `field_editor__X` -> base field X
      2. attributes in _MANIFEST_FIELD_REF_ATTRS whose default-value is a field
         name (or list of names).
    """
    fields = set()
    for sch in manifest.get("ui_schemas", []):
        if not isinstance(sch, dict):
            continue
        sc = sch.get("schema_content", {})
        for a in sc.get("attributes", []) if isinstance(sc, dict) else []:
            if not isinstance(a, dict):
                continue
            nm = a.get("name", "")
            m = re.match(r'^field_(?:renderer|editor)__(.+)$', nm)
            if m:
                fields.add(m.group(1))
                continue
            if nm in _MANIFEST_FIELD_REF_ATTRS:
                dv = a.get("default-value", a.get("default"))
                if isinstance(dv, str):
                    fields.add(dv)
                elif isinstance(dv, list):
                    fields.update(x for x in dv if isinstance(x, str))
    return fields


def load_service_base_fields() -> dict:
    """Return {service_id: set(base_field_names)} from the SDK's bundled service
    UI manifests. Empty dict if the manifests can't be found (older SDK / odd
    install) — callers fall back to the prior 'can't inspect' behavior, so the
    validator never regresses."""
    out = {}
    d = _find_service_manifest_dir()
    if not d:
        return out
    for p in sorted(d.glob("*.ui.json")):
        try:
            data = json.loads(p.read_text(encoding="utf-8"))
        except Exception:
            continue
        svc = data.get("service_id") or p.name.replace(".ui.json", "")
        flds = _extract_base_fields_from_manifest(data)
        if svc and flds:
            out[svc] = flds
    return out


def _norm_services_json(data) -> set:
    """Normalize services.json contents to a set of service_id strings.

    Handles:
      - list of strings:           ["cart", "order"]
      - list of dicts:             [{"service_id": "cart"}, ...]
      - dict with services key:    {"services": [...]} / {"service_ids": [...]}
      - dict-of-lists (grouped):   {"core": ["auth_otp"], "commerce": ["cart"]}
    """
    if data is None:
        return set()
    if isinstance(data, list):
        out = set()
        for item in data:
            if isinstance(item, dict):
                sid = item.get("service_id") or item.get("id") or item.get("name")
                if sid:
                    out.add(sid)
            elif isinstance(item, str):
                out.add(item)
        return out
    if isinstance(data, dict):
        # Preferred explicit keys first.
        if "services" in data or "service_ids" in data:
            services = data.get("services") or data.get("service_ids") or []
            return _norm_services_json(services)
        # Otherwise treat as dict-of-lists / grouped shape: flatten every value
        # that is itself a list/str/dict of services. Ignore scalar metadata.
        out = set()
        for value in data.values():
            if isinstance(value, (list, dict)):
                out |= _norm_services_json(value)
            elif isinstance(value, str):
                # Bare scalar string value — only count it if it looks like a
                # service id (avoid swallowing version strings, timestamps…).
                # Conservative: skip scalars at the top level of a grouped dict.
                pass
        return out
    return set()


def _get_config_service_ids(config_mod) -> set:
    """Pull SERVICE_IDS from config.py module. Tries common locations:
    module attribute SERVICE_IDS, or AppConfig.SERVICE_IDS / .services."""
    if config_mod is None:
        return set()
    # Top-level
    if hasattr(config_mod, "SERVICE_IDS"):
        v = getattr(config_mod, "SERVICE_IDS")
        if isinstance(v, (list, tuple, set)):
            return set(v)
    # AppConfig class
    if hasattr(config_mod, "AppConfig"):
        cls = config_mod.AppConfig
        for attr in ("SERVICE_IDS", "services", "SERVICES"):
            if hasattr(cls, attr):
                v = getattr(cls, attr)
                if isinstance(v, (list, tuple, set)):
                    return set(v)
    return set()


def _load_ui_schemas() -> tuple:
    """Import UI_SCHEMAS from ui_schemas.py. Returns (list, error_msg)."""
    try:
        from ui_schemas import UI_SCHEMAS  # type: ignore
        return UI_SCHEMAS, None
    except Exception as e:
        return None, f"cannot import ui_schemas.py: {e}"


def _ext_service(extends_value: str) -> str | None:
    """If `extends` points at a service base UI, return the service id; else None.
    e.g. 'ticket:base_ticket_admin_ui' → 'ticket'
         'supero_ui:base_record_ui'    → None  (not a service)
    """
    if not isinstance(extends_value, str) or ":" not in extends_value:
        return None
    ns, _ = extends_value.split(":", 1)
    if ns in NON_SERVICE_NAMESPACES:
        return None
    return ns


def _data_parent_service(parent_type: str) -> str | None:
    """If `parent_type` points at a service base schema, return the service id."""
    if not isinstance(parent_type, str) or ":" not in parent_type:
        return None
    ns, _ = parent_type.split(":", 1)
    if ns in NON_SERVICE_NAMESPACES:
        return None
    return ns


def _extract_register_extensions(app_js_source: str, results=None) -> dict:
    """Parse registerExtensions calls from app.js.
    Returns {service_id: tenant_schema_value} where value is str or list.

    If a call's object literal cannot be parsed (template literals, spreads,
    computed keys, etc.), emit a warning via `results` instead of silently
    dropping it — a dropped call previously caused false S-B3 "extended but
    not registered" failures on apps that ARE registered correctly.
    """
    if not app_js_source:
        return {}
    out = {}
    unparsed = 0
    for m in re.finditer(
        r'\.transactional\.registerExtensions\s*\(\s*', app_js_source
    ):
        start = m.end()
        # Find object literal
        while start < len(app_js_source) and app_js_source[start] in " \t\n\r":
            start += 1
        if start >= len(app_js_source) or app_js_source[start] != "{":
            # Not an object literal (could be a variable / spread). Note it.
            unparsed += 1
            continue
        # Match braces
        depth = 0
        i = start
        in_str = None
        parsed_this = False
        while i < len(app_js_source):
            ch = app_js_source[i]
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
                        raw = app_js_source[start:i + 1]
                        try:
                            obj = json.loads(_js_to_json(raw))
                            if isinstance(obj, dict):
                                out.update(obj)
                                parsed_this = True
                        except Exception:
                            pass
                        break
            i += 1
        if not parsed_this:
            unparsed += 1

    if unparsed and results is not None:
        results.warn(
            "register_extensions", "unparsed_calls",
            f"{unparsed} registerExtensions call(s) in app.js could not be "
            "parsed (template literal, spread, or computed key?) and were "
            "skipped — services they register may show as 'not registered'",
            mode="S-B3",
            hint="If a service is flagged S-B3 but you DO register it, the "
                 "call likely uses a JS form this static parser can't read; "
                 "rewrite it as a plain object literal of string/array values.",
        )
    return out


def _load_dotenv_into_environ() -> tuple:
    """Replicate what the supero CLI does at deploy: load ../.env (then ./.env)
    into os.environ BEFORE the schema modules are imported, so the validator
    evaluates namespaces under the SAME environment the app actually deploys
    with. Without this, schemas.py falls back to its module default and S-C1
    false-fails even when .env defines the correct namespace.

    Only sets keys that are NOT already present in the environment (a real
    exported env var wins over the file, same as normal shell semantics).
    Returns (path_loaded_or_None, keys_set_list).
    """
    candidates = [Path("../.env"), Path(".env"),
                  Path(__file__).resolve().parent.parent / ".env"]
    for envp in candidates:
        try:
            if not envp.exists():
                continue
        except Exception:
            continue
        keys_set = []
        try:
            for raw in envp.read_text(encoding="utf-8").splitlines():
                line = raw.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, _, val = line.partition("=")
                key = key.strip()
                # strip surrounding quotes (the supero .env double-quotes values)
                val = val.strip().strip('"').strip("'")
                if key and key not in os.environ:
                    os.environ[key] = val
                    keys_set.append(key)
        except Exception:
            return (None, [])
        return (str(envp), keys_set)
    return (None, [])


def _ui_for_namespace_and_type(ui_for: str) -> tuple:
    """Parse ui_for value 'corp-learning:my_task' into ('corp-learning', 'my_task').
    Returns (None, None) if malformed."""
    if not isinstance(ui_for, str) or ":" not in ui_for:
        return (None, None)
    parts = ui_for.split(":", 1)
    return (parts[0], parts[1])


def _read_config_js_app_namespace() -> tuple:
    """Read __SUPERO_CONFIG.appNamespace from ui/config.js (the namespace app.js
    resolves schemas UNDER at runtime). Returns (namespace, error_msg).
    The value can't change later, so a static regex read is sufficient."""
    for cand in (Path("ui/config.js"), Path("config.js"), Path("../ui/config.js")):
        if cand.exists():
            try:
                txt = cand.read_text(encoding="utf-8")
            except Exception as e:
                return None, f"cannot read {cand}: {e}"
            m = re.search(r'appNamespace\s*:\s*["\']([^"\']+)["\']', txt)
            if m:
                return m.group(1), None
            return None, f"appNamespace not found in {cand}"
    return None, "config.js not found"


def _schema_namespaces(all_schemas: list) -> set:
    """The distinct 'namespace' values stamped on the loaded data schemas.
    This is the namespace schemas are ACTUALLY registered under at validate
    time (already reflects SUPERO_APP_NAMESPACE-or-default, since the modules
    compute it via getenv with a fallback). app.js must resolve under the same
    namespace or every toConfig() returns empty -> zero tabs."""
    out = set()
    for s in all_schemas or []:
        if isinstance(s, dict) and s.get("namespace"):
            out.add(s["namespace"])
    return out


# ════════════════════════════════════════════════════════════════════
# Phase 1 — Configuration consistency
# ════════════════════════════════════════════════════════════════════

def check_config_consistency(cfg_services: set, sj_services: set,
                              results: Results) -> None:
    """S-A1: config.py SERVICE_IDS vs services.json.

    NOTE: services.json is a USER-REVIEW artifact, not the source of truth —
    config.py / schemas.py SERVICE_IDS is authoritative. A mismatch here is
    advisory (warn), never a hard failure: it usually just means services.json
    is stale relative to the declared SERVICE_IDS, which does not affect what
    actually deploys."""
    section = "configuration"
    if not cfg_services and not sj_services:
        results.skip(section, "no_services",
            "no services declared in either config.py or services.json")
        return

    if cfg_services == sj_services:
        results.pass_(section, "config_matches_deployment",
            f"config.py and services.json agree on {len(cfg_services)} services")
        return

    only_cfg = cfg_services - sj_services
    only_sj = sj_services - cfg_services
    if only_cfg:
        results.warn(
            section, "declared_not_in_services_json",
            f"config.py declares {len(only_cfg)} services not in "
            f"services.json: {sorted(only_cfg)}",
            mode="S-A1",
            hint="services.json is a user-review artifact, not the source of "
                 "truth — SERVICE_IDS in config.py/schemas.py is authoritative. "
                 "Re-run deployment to regenerate services.json if you want it "
                 "to mirror SERVICE_IDS; otherwise this is informational only.",
        )
    if only_sj:
        results.warn(
            section, "in_services_json_not_declared",
            f"services.json has {len(only_sj)} services not in config.py: "
            f"{sorted(only_sj)}",
            mode="S-A1",
            hint="Add the service to config.py SERVICE_IDS for consistency, "
                 "or remove from services.json if not needed.",
        )


# ════════════════════════════════════════════════════════════════════
# Phase 2 — Build the integration matrix
# ════════════════════════════════════════════════════════════════════

def build_matrix(cfg_services: set, sj_services: set,
                  all_schemas: list, ui_schemas: list,
                  register_extensions: dict) -> dict:
    """Build per-service integration map.
    Returns: { service_id: {
        in_cfg, in_svcs, data_ext_names, ui_ext_names,
        registered, has_ui_base, is_backend_only
    } }"""
    matrix = {}

    all_services = cfg_services | sj_services | set(register_extensions.keys())
    # Plus any services referenced by data/UI schemas
    for s in all_schemas or []:
        if isinstance(s, dict):
            svc = _data_parent_service(s.get("parent_type", ""))
            if svc:
                all_services.add(svc)
            # Also pick up service from a data schema's `extends`
            ext_svc = _extends_service_base(s)
            if ext_svc:
                all_services.add(ext_svc)
    for s in ui_schemas or []:
        if isinstance(s, dict):
            svc = _ext_service(s.get("extends", ""))
            if svc:
                all_services.add(svc)

    for svc in all_services:
        # Data extensions — a schema "belongs" to a service if its parent_type
        # OR its extends points at that service base.
        data_ext = []
        for s in all_schemas or []:
            if not isinstance(s, dict):
                continue
            if (_data_parent_service(s.get("parent_type", "")) == svc or
                    _extends_service_base(s) == svc):
                data_ext.append(s.get("name"))
        # UI extensions
        ui_ext = []
        for s in ui_schemas or []:
            if isinstance(s, dict) and _ext_service(s.get("extends", "")) == svc:
                ui_ext.append(s.get("name"))

        matrix[svc] = {
            "in_cfg": svc in cfg_services,
            "in_svcs": svc in sj_services,
            "data_ext_names": data_ext,
            "ui_ext_names": ui_ext,
            "registered": svc in register_extensions,
            "register_value": register_extensions.get(svc),
            "has_ui_base": svc in SERVICES_WITH_UI,
            "is_backend_only": svc in SERVICES_BACKEND_ONLY,
        }
    return matrix


def _verdict(m: dict):
    """Compute a service's verdict cell. Covers all four data×UI quadrants
    explicitly so a normal data-only or UI-only extension is not mislabeled
    'partial integration'."""
    has_data = bool(m["data_ext_names"])
    has_ui = bool(m["ui_ext_names"])
    registered = m["registered"]
    present = m["in_cfg"] or m["in_svcs"]

    # Backend-only services: UI is not expected.
    if m["is_backend_only"]:
        return dim("backend-only (no UI expected)") if present \
            else dim("backend-only, not used")

    # Config drift takes precedence — declaration and deployment disagree.
    if m["in_cfg"] != m["in_svcs"]:
        return yellow("config drift")

    # Quadrant: data + UI
    if has_data and has_ui:
        return green("fully wired UI") if registered \
            else yellow("extended but not registered")

    # Quadrant: UI only (no data extension). Unusual but valid — admin UI over
    # the service's own data. Still needs registration to take effect.
    if has_ui and not has_data:
        return green("UI-only, registered") if registered \
            else yellow("UI extended but not registered")

    # Quadrant: data only (no UI). Perfectly normal — extend the service's
    # data without an admin panel. Not a problem.
    if has_data and not has_ui:
        return dim("data-only extension")

    # Quadrant: neither data nor UI extension.
    if present:
        return dim("imported, workflow-only") if m["has_ui_base"] \
            else dim("imported")

    # Referenced somewhere (e.g. registerExtensions) but not declared/deployed.
    return yellow("partial integration")


def render_matrix(matrix: dict) -> str:
    """Pretty-print the matrix as a fixed-width table."""
    if not matrix:
        return "  (no services declared in this app)"
    rows = []
    rows.append("  Service       Cfg  Svcs Data  UI    Reg   Verdict")
    rows.append("  ────────────  ───  ──── ────  ────  ────  ───────────────────────────")
    chk = green("✓")
    cross = red("✗")

    for svc in sorted(matrix.keys()):
        m = matrix[svc]
        c_cfg  = chk if m["in_cfg"] else cross
        c_svcs = chk if m["in_svcs"] else cross
        c_data = chk + f" {len(m['data_ext_names'])}" if m["data_ext_names"] else cross + "  "
        c_ui   = chk + f" {len(m['ui_ext_names'])}"   if m["ui_ext_names"]   else cross + "  "
        c_reg  = chk if m["registered"] else cross
        verdict = _verdict(m)

        rows.append(
            f"  {svc:<13} {c_cfg}    {c_svcs}    {c_data}  {c_ui}  {c_reg}    {verdict}"
        )
    return "\n".join(rows)


# ════════════════════════════════════════════════════════════════════
# Phase 3 — UI schema deep checks
# ════════════════════════════════════════════════════════════════════

def check_ui_extends(ui_schemas: list, results: Results) -> None:
    """S-A2: every UI schema's `extends` must resolve to a known base."""
    section = "ui_schemas"
    if not ui_schemas:
        results.skip(section, "extends", "no ui_schemas to validate")
        return

    bad = 0
    ok = 0
    # We know supero_ui:* bases. For service bases, we trust the naming
    # pattern <svc>:base_<svc>_admin_ui (can't verify svc base UI exists
    # without --platform mode).
    known_service_pattern = re.compile(r'^([a-z_][a-z0-9_]*):base_\w+$')

    for s in ui_schemas:
        if results.aborted():
            return
        if not isinstance(s, dict): continue
        name = s.get("name", "<unnamed>")
        ext = s.get("extends", "")

        if not ext:
            results.fail(
                section, f"{name}_no_extends",
                f"UI schema '{name}' has no 'extends' value",
                mode="S-A2",
                hint="Every UI schema must extend a base, e.g. "
                     "extends='supero_ui:base_record_ui' or 'ticket:base_ticket_admin_ui'",
            )
            bad += 1
            continue

        if ext in KNOWN_SUPERO_UI_BASES:
            ok += 1
            continue

        m = known_service_pattern.match(ext)
        if m:
            svc = m.group(1)
            if svc in SERVICES_WITH_UI:
                ok += 1
                continue
            elif svc in SERVICES_BACKEND_ONLY:
                results.warn(
                    section, f"{name}_extends_backend_service",
                    f"UI schema '{name}' extends '{ext}' but '{svc}' is a "
                    "backend-only service that typically doesn't have UI bases",
                    mode="S-A2",
                )
                bad += 1
                continue
            else:
                # Unknown service — could be a new platform service we don't
                # know about, or a typo. Warn rather than fail.
                results.warn(
                    section, f"{name}_extends_unknown_service",
                    f"UI schema '{name}' extends '{ext}' but service '{svc}' "
                    "is not in the known service list",
                    mode="S-A2",
                    hint=f"Verify '{svc}' is a real service; known services with UI: "
                         f"{', '.join(sorted(SERVICES_WITH_UI))}",
                )
                bad += 1
                continue

        # Unknown supero_ui:* OR malformed
        suggestion = did_you_mean(ext, sorted(KNOWN_SUPERO_UI_BASES), n=2)
        results.fail(
            section, f"{name}_extends_unknown",
            f"UI schema '{name}' extends unknown base '{ext}'",
            mode="S-A2",
            hint=(f"did you mean: {suggestion}" if suggestion
                  else f"known supero_ui bases: {', '.join(sorted(KNOWN_SUPERO_UI_BASES))}"),
        )
        bad += 1

    if ok and bad == 0:
        results.pass_(section, "extends_all_known",
            f"all {ok} UI schemas extend known bases")


def check_ui_for_references(ui_schemas: list, schema_index: dict,
                              all_schemas: list, results: Results) -> None:
    """S-A3: ui_for must reference an existing data schema.

    Comparison is normalization-aware: data schemas are PascalCase
    ('ClientCompany'), ui_for is snake_case ('client_company'). We resolve via
    a normalized schema-name set built from schemas.py (source of truth)."""
    section = "ui_schemas"
    if not ui_schemas:
        return

    norm_names = build_normalized_schema_names(all_schemas)

    bad = 0
    ok = 0
    for s in ui_schemas:
        if results.aborted():
            return
        if not isinstance(s, dict): continue
        name = s.get("name", "<unnamed>")
        # Find ui_for in attributes
        ui_for_val = None
        for a in s.get("attributes", []):
            if a.get("name") == "ui_for":
                ui_for_val = a.get("default") or a.get("default-value")
                break
        if ui_for_val is None:
            continue  # Not all UI schemas have ui_for (e.g. landing_page)

        ns, typ = _ui_for_namespace_and_type(ui_for_val)
        if not ns:
            results.warn(
                section, f"{name}_ui_for_malformed",
                f"UI schema '{name}' has ui_for='{ui_for_val}' (expected 'namespace:type')",
                mode="S-A3",
            )
            bad += 1
            continue

        if not norm_names and not schema_index:
            continue  # nothing to validate against

        # Normalized match against schemas.py names (source of truth), with a
        # fallback to the legacy schema_index for older harness behaviour.
        norm_typ = _norm_ident(typ)
        found = (
            norm_typ in norm_names
            or typ in schema_index
            or ui_for_val in schema_index
            or any(k.endswith(f":{typ}") for k in schema_index.keys())
        )
        if found:
            ok += 1
        else:
            candidates = sorted(
                {s2.get("name") for s2 in (all_schemas or [])
                 if isinstance(s2, dict) and s2.get("name")}
            )
            suggestion = did_you_mean(typ, candidates, n=2)
            results.fail(
                section, f"{name}_ui_for_unknown",
                f"UI schema '{name}' ui_for='{ui_for_val}' references unknown data schema",
                mode="S-A3",
                hint=(f"did you mean: {suggestion}" if suggestion
                      else f"available data schemas: {', '.join(candidates[:8])}"),
            )
            bad += 1

    if ok and bad == 0:
        results.pass_(section, "ui_for_all_resolved",
            f"all {ok} ui_for references resolve to real schemas")


def check_field_references(ui_schemas: list, schema_index: dict,
                            all_schemas: list, results: Results,
                            service_base_fields: dict = None) -> None:
    """S-A4: card_template fields, featured_fields, field_renderer__X targets
    must exist on the data schema referenced by ui_for.

    A schema that `extends` a service base inherits fields not present in
    schemas.py. We load the base field names the service's bundled UI manifest
    references (service_base_fields) and merge them in — so genuinely-inherited
    fields (status, title, …) resolve silently. The manifest is a HIGH-RECALL
    allowlist: a field present there definitely exists, but absence is not proof
    of non-existence (the base may carry fields its UI doesn't render). So a
    field not found anywhere stays a WARN (never a false FAIL)."""
    section = "ui_schemas"
    service_base_fields = service_base_fields or {}
    if not ui_schemas or (not schema_index and not all_schemas):
        return

    issues = 0
    examined = 0   # schemas we actually inspected (had a resolvable target)
    passed = 0     # schemas inspected that had NO field issues
    for s in ui_schemas:
        if results.aborted():
            return
        if not isinstance(s, dict): continue
        name = s.get("name", "<unnamed>")
        # Get ui_for to find the data schema
        ui_for_val = None
        attrs_list = s.get("attributes", [])
        attrs_by_name = {a.get("name"): a for a in attrs_list if isinstance(a, dict)}
        if "ui_for" in attrs_by_name:
            ui_for_val = attrs_by_name["ui_for"].get("default") or \
                         attrs_by_name["ui_for"].get("default-value")
        if not ui_for_val:
            continue

        ns, typ = _ui_for_namespace_and_type(ui_for_val)
        if not typ:
            continue

        norm_typ = _norm_ident(typ)

        # Resolve the target schema dict from schemas.py (source of truth) via
        # normalized name, so PascalCase 'ClientCompany' matches snake 'client_company'.
        target_schema = _schema_by_norm(all_schemas, norm_typ)

        # Determine whether this schema extends a service base (inherits hidden
        # fields). If so, unknown fields are WARN, not FAIL.
        extends_svc = _extends_service_base(target_schema) if target_schema else None

        # build_schema_index maps {schema_name: {field_name, ...}}. Look it up by
        # bare type, full ui_for, a namespaced key, or normalized key.
        target_fields = (schema_index.get(typ) or
                         schema_index.get(ui_for_val) or
                         next((schema_index[k] for k in schema_index
                               if k.endswith(f":{typ}") or _norm_ident(k) == norm_typ),
                              None))

        # If the index didn't resolve, fall back to the schema dict's own attrs.
        if not target_fields and target_schema:
            target_fields = {a.get("name") for a in target_schema.get("attributes", [])
                             if isinstance(a, dict) and a.get("name")}
            # Include system fields that always exist, so refs to them resolve.
            target_fields |= {
                "uuid", "name", "fq_name", "parent_type", "parent_uuid",
                "created_at", "created_by", "updated_at", "updated_by",
            }

        if not target_fields:
            continue
        # Defensive: tolerate either a set/list of names or a legacy dict shape.
        if isinstance(target_fields, dict):
            target_fields = {a.get("name") for a in target_fields.get("attributes", [])
                             if isinstance(a, dict) and a.get("name")}
        else:
            target_fields = set(target_fields)

        # If this schema extends a service base, merge in the base field names
        # recovered from the SDK's bundled service manifest. This resolves
        # genuinely-inherited fields (status/title/…) so they no longer warn.
        base_fields_known = False
        if extends_svc and extends_svc in service_base_fields:
            target_fields |= service_base_fields[extends_svc]
            base_fields_known = True

        if not target_fields:
            continue

        examined += 1
        schema_issues = 0
        sorted_fields = sorted(target_fields)

        def _report_unknown_field(key, message, hint):
            """Fail for ordinary schemas; warn for service-extension schemas
            whose base fields we cannot fully prove. If we DID load the service
            base manifest and the field still isn't found, the message says so —
            a stronger (but still non-failing) signal, since the manifest is
            high-recall but can't prove a field's absence."""
            nonlocal schema_issues
            if extends_svc and base_fields_known:
                results.warn(
                    section, key, message + f" — not found on '{extends_svc}' "
                    "service base UI manifest either; verify it's a real field "
                    "(manifest lists referenced fields only, so this is a strong "
                    "hint but not proof of absence)",
                    mode="S-A4",
                    hint=hint,
                )
            elif extends_svc:
                results.warn(
                    section, key, message + f" (may live on the '{extends_svc}' "
                    "service base; its manifest wasn't found, so this can't be "
                    "verified — install the supero SDK or set "
                    "SUPERO_SERVICE_MANIFESTS to enable the check)",
                    mode="S-A4",
                    hint=hint,
                )
            else:
                results.fail(section, key, message, mode="S-A4", hint=hint)
                schema_issues += 1

        # featured_fields
        if "featured_fields" in attrs_by_name:
            ff = attrs_by_name["featured_fields"].get("default") or []
            if isinstance(ff, list):
                for idx, f in enumerate(ff):
                    if isinstance(f, str) and f not in target_fields:
                        suggestion = did_you_mean(f, sorted_fields, n=2)
                        _report_unknown_field(
                            f"{name}_featured_field_{idx}_unknown",
                            f"UI schema '{name}' featured_fields references "
                            f"'{f}' which doesn't exist on '{typ}'",
                            (f"did you mean: {suggestion}" if suggestion
                             else f"fields on {typ}: {', '.join(sorted_fields)}"),
                        )

        # card_template — mappings like {title: "title", image: "cover_image"}
        if "card_template" in attrs_by_name:
            tpl = attrs_by_name["card_template"].get("default") or {}
            if isinstance(tpl, dict):
                for slot, fld in tpl.items():
                    if isinstance(fld, str) and fld not in target_fields:
                        suggestion = did_you_mean(fld, sorted_fields, n=2)
                        _report_unknown_field(
                            f"{name}_card_template_{slot}_unknown",
                            f"UI schema '{name}' card_template.{slot} = "
                            f"'{fld}' but '{fld}' doesn't exist on '{typ}'",
                            (f"did you mean: {suggestion}" if suggestion
                             else f"fields on {typ}: {', '.join(sorted_fields)}"),
                        )
                    elif isinstance(fld, list):
                        # metrics: ["a", "b", "c"]
                        for jdx, fl in enumerate(fld):
                            if isinstance(fl, str) and fl not in target_fields:
                                _report_unknown_field(
                                    f"{name}_card_template_{slot}_{jdx}_unknown",
                                    f"UI schema '{name}' card_template.{slot}[]='{fl}' "
                                    f"but '{fl}' doesn't exist on '{typ}'",
                                    f"fields on {typ}: {', '.join(sorted_fields)}",
                                )

        # field_renderer__X / field_editor__X
        for attr_name in attrs_by_name:
            if attr_name.startswith("field_renderer__") or attr_name.startswith("field_editor__"):
                fld = attr_name.split("__", 1)[1]
                if fld and fld not in target_fields:
                    suggestion = did_you_mean(fld, sorted_fields, n=2)
                    _report_unknown_field(
                        f"{name}_{attr_name}_unknown_field",
                        f"UI schema '{name}' has '{attr_name}' but "
                        f"'{fld}' doesn't exist on '{typ}'",
                        (f"did you mean: {suggestion}" if suggestion
                         else f"fields on {typ}: {', '.join(sorted_fields)}"),
                    )

        issues += schema_issues
        if schema_issues == 0:
            passed += 1

    if examined and issues == 0:
        results.pass_(section, "field_refs_resolve",
            f"all field references on {passed} UI schemas resolve correctly")


def check_renderer_editor_aliases(ui_schemas: list, results: Results) -> None:
    """S-A5: field_renderer__X / field_editor__X aliases must be real."""
    section = "ui_schemas"
    if not ui_schemas:
        return

    bad = 0
    ok = 0
    for s in ui_schemas:
        if results.aborted():
            return
        if not isinstance(s, dict): continue
        name = s.get("name", "<unnamed>")
        for a in s.get("attributes", []):
            if not isinstance(a, dict): continue
            an = a.get("name", "")
            default = a.get("default") or a.get("default-value")

            if an.startswith("field_renderer__"):
                # default can be a string (alias) or dict ({renderer: alias, config: {...}})
                alias = None
                if isinstance(default, str):
                    alias = default
                elif isinstance(default, dict):
                    alias = default.get("renderer")
                if alias and alias not in KNOWN_RENDERER_ALIASES:
                    suggestion = did_you_mean(alias, sorted(KNOWN_RENDERER_ALIASES), n=2)
                    results.warn(
                        section, f"{name}_{an}_unknown_renderer",
                        f"UI schema '{name}' '{an}' uses renderer '{alias}' "
                        "which isn't in known aliases",
                        mode="S-A5",
                        hint=(f"did you mean: {suggestion}" if suggestion
                              else "unknown aliases may work at runtime via custom registration"),
                    )
                    bad += 1
                elif alias:
                    ok += 1

            elif an.startswith("field_editor__"):
                alias = None
                if isinstance(default, str):
                    alias = default
                elif isinstance(default, dict):
                    alias = default.get("editor")
                if alias and alias not in KNOWN_EDITOR_ALIASES:
                    suggestion = did_you_mean(alias, sorted(KNOWN_EDITOR_ALIASES), n=2)
                    results.warn(
                        section, f"{name}_{an}_unknown_editor",
                        f"UI schema '{name}' '{an}' uses editor '{alias}' "
                        "which isn't in known aliases",
                        mode="S-A5",
                        hint=(f"did you mean: {suggestion}" if suggestion
                              else "unknown aliases may work at runtime via custom registration"),
                    )
                    bad += 1
                elif alias:
                    ok += 1

    if ok and bad == 0:
        results.pass_(section, "aliases_all_known",
            f"all {ok} renderer/editor aliases are recognized")


# ════════════════════════════════════════════════════════════════════
# Phase 4 — registerExtensions consistency
# ════════════════════════════════════════════════════════════════════

def check_namespace_alignment(all_schemas: list, ui_schemas: list,
                               results: Results, env_ns_source: str = "") -> None:
    """S-C1 (HARD FAIL): the namespace app.js resolves schemas UNDER (from
    config.js __SUPERO_CONFIG.appNamespace) must match the namespace the
    schemas are actually registered under. If they differ, every
    SuperoUISchemaResolver.toConfig()/toTabConfig() call in app.js returns
    empty, shell.tab_ids is undefined, TABS = [] -> the app renders with ZERO
    TABS, silently, with only a console.warn.

    This is a build-breaker, not an advisory: a deploy where SUPERO_APP_NAMESPACE
    was unset (so schemas.py fell back to its default) while config.js carries
    the real project namespace produces exactly this zero-tabs outcome.
    """
    section = "namespace"

    cfg_ns, cfg_err = _read_config_js_app_namespace()
    schema_ns = _schema_namespaces(all_schemas)
    # Fold in UI schema namespaces too (tabs come from UI schemas).
    for s in ui_schemas or []:
        if isinstance(s, dict) and s.get("namespace"):
            schema_ns.add(s["namespace"])

    env_ns = os.environ.get("SUPERO_APP_NAMESPACE")  # now reflects ../.env if it was loaded

    if cfg_err:
        results.warn(section, "config_js_namespace_unreadable",
            f"could not read appNamespace from config.js: {cfg_err}",
            mode="S-C1",
            hint="S-C1 needs ui/config.js __SUPERO_CONFIG.appNamespace to verify "
                 "app.js will resolve schemas under the namespace they're "
                 "registered under.")
        return

    if not schema_ns:
        results.skip(section, "no_schema_namespace",
            "no namespace found on loaded schemas; cannot check alignment")
        return

    # The decisive comparison: does the runtime-resolution namespace (config.js)
    # match the namespace the schemas carry (evaluated under the loaded .env)?
    if {cfg_ns} == schema_ns:
        results.pass_(section, "namespace_aligned",
            f"app.js resolves under '{cfg_ns}', matching schema namespace "
            f"(namespace source: {env_ns_source})")
        return

    # Mismatch. Distinguish two genuinely different situations:
    #   (A) The env (incl. .env) DEFINES SUPERO_APP_NAMESPACE and it STILL
    #       mismatches config.js  -> a real misconfiguration. HARD FAIL.
    #   (B) The namespace is unresolved everywhere (.env absent or doesn't set
    #       it, and not exported) -> the schema modules fell back to a default.
    #       This is a REQUIRED-ENV problem, not necessarily a config bug: tell
    #       the user to provide it / point at .env, and fail so it can't ship
    #       blank — but frame it as "env required", not "config.js wrong".
    if env_ns:
        # (A) env explicitly says one thing, config.js another. Real mismatch.
        results.fail(section, "namespace_mismatch_zero_tabs",
            f"config.js appNamespace is '{cfg_ns}' but schemas resolve to "
            f"{sorted(schema_ns)} under SUPERO_APP_NAMESPACE='{env_ns}' "
            f"(source: {env_ns_source}). app.js will resolve the app shell and "
            f"every tab under '{cfg_ns}', find nothing, and render ZERO TABS.",
            mode="S-C1",
            hint=f"These MUST match. Set SUPERO_APP_NAMESPACE='{cfg_ns}' (it is "
                 f"currently '{env_ns}'), or change config.js appNamespace to "
                 f"'{env_ns}'.")
    else:
        # (B) Required env not found anywhere -> schemas used a fallback default.
        results.fail(section, "namespace_env_required_unset",
            f"SUPERO_APP_NAMESPACE is not set and no .env provided it "
            f"(checked: {env_ns_source}). The schema modules fell back to "
            f"{sorted(schema_ns)}, which does not match config.js "
            f"appNamespace '{cfg_ns}'. At deploy without this env, the app "
            f"renders ZERO TABS.",
            mode="S-C1",
            hint=f"This env var is REQUIRED. Add SUPERO_APP_NAMESPACE='{cfg_ns}' "
                 f"to ../.env (the supero CLI loads it at deploy), or export it "
                 f"before running. If your ../.env already defines it, run the "
                 f"tests from a shell that loads it (e.g. `set -a; . ../.env; "
                 f"set +a`) so the validator evaluates the real deploy namespace.")


def check_register_extensions_consistency(matrix: dict,
                                            schema_index: dict,
                                            all_schemas: list,
                                            results: Results) -> None:
    """S-B1, S-B2, S-B3: registerExtensions must:
       - Have target tenant schemas that exist in schemas.py
       - Match shape (string for single-schema, [parent, child] for two-schema)
       - Be called for every service with UI extension"""
    section = "register_extensions"
    if not matrix:
        return

    norm_names = build_normalized_schema_names(all_schemas)

    bad = 0
    ok = 0
    for svc, info in matrix.items():
        if results.aborted():
            return
        # S-B3: UI extension exists but no registerExtensions call
        if info["ui_ext_names"] and not info["registered"]:
            results.fail(
                section, f"{svc}_extended_not_registered",
                f"service '{svc}' has UI extension(s) {info['ui_ext_names']} "
                "but app.js doesn't call registerExtensions for it",
                mode="S-B3",
                hint=f"Add to app.js: await client.transactional."
                     f"registerExtensions({{ {svc}: '{{ns}}:{{schema_name}}' }})",
            )
            bad += 1
            continue

        if not info["registered"]:
            continue

        # S-B2: shape check
        value = info["register_value"]
        if svc in TWO_SCHEMA_SERVICES:
            if not (isinstance(value, list) and len(value) == 2):
                results.fail(
                    section, f"{svc}_wrong_shape",
                    f"service '{svc}' is two-schema; registerExtensions value "
                    f"should be array of length 2, got {value!r}",
                    mode="S-B2",
                    hint=f"Use [parent_extension, child_extension] format",
                )
                bad += 1
                continue
        else:
            if not isinstance(value, str):
                results.fail(
                    section, f"{svc}_wrong_shape",
                    f"service '{svc}' is single-schema; registerExtensions value "
                    f"should be a string, got {value!r}",
                    mode="S-B2",
                )
                bad += 1
                continue

        # S-B1: target schema(s) must exist. Resolve by bare type with
        # snake/Pascal normalization; namespace is optional.
        targets = value if isinstance(value, list) else [value]
        missing = []
        for t in targets:
            if not isinstance(t, str):
                missing.append(t)
                continue
            typ = _bare_type(t)
            if not typ:
                missing.append(t)
                continue
            norm_typ = _norm_ident(typ)
            found = (
                norm_typ in norm_names
                or typ in schema_index
                or t in schema_index
                or any(k.endswith(f":{typ}") or _norm_ident(k) == norm_typ
                       for k in schema_index.keys())
            )
            if not found:
                missing.append(t)

        if missing:
            results.fail(
                section, f"{svc}_target_missing",
                f"service '{svc}' registerExtensions targets {missing} "
                "but these tenant schemas don't exist in schemas.py",
                mode="S-B1",
                hint=f"Add the schema(s) to schemas.py with parent_type='{svc}:base_*'",
            )
            bad += 1
        else:
            ok += 1

    if ok and bad == 0:
        results.pass_(section, "register_extensions_consistent",
            f"all {ok} registerExtensions calls have valid targets and shapes")


# ════════════════════════════════════════════════════════════════════
# Main
# ════════════════════════════════════════════════════════════════════

def main():
    ap = make_arg_parser(
        prog="service_integration_report.py",
        description="Service Integration Matrix Report — see how each "
                    "imported service is wired through schemas.py, "
                    "ui_schemas.py, and app.js.",
    )
    ap.add_argument("--matrix-only", action="store_true",
                    help="print only the integration matrix, skip checks")
    args = ap.parse_args()

    results = Results()
    results.bail = args.bail

    # ── Load ../.env FIRST, before importing schema modules ─────
    # schemas.py / ui_schemas.py read os.getenv("SUPERO_APP_NAMESPACE") AT
    # IMPORT TIME. The supero CLI loads .env at deploy; we must do the same so
    # the validator evaluates namespaces under the real deploy environment.
    # (Must happen before load_schemas() below or the fallback is already baked in.)
    _env_had_ns = "SUPERO_APP_NAMESPACE" in os.environ
    _env_path, _env_keys = _load_dotenv_into_environ()
    _env_ns_source = (
        "shell environment" if _env_had_ns
        else (f"{_env_path} (auto-loaded)" if _env_path and
              "SUPERO_APP_NAMESPACE" in _env_keys
        else (f"{_env_path} (present, no SUPERO_APP_NAMESPACE)" if _env_path
        else "no .env found"))
    )

    # ── Load everything ─────────────────────────────────────────
    schemas_list, schemas_err = load_schemas()
    if schemas_err:
        results.warn("loading", "schemas.py", schemas_err)
    schema_index = build_schema_index(schemas_list) if schemas_list else {}

    config_mod, config_err = load_config_py()
    if config_err:
        results.warn("loading", "config.py", config_err)

    sj_data, sj_err = load_services_json()
    if sj_err:
        results.warn("loading", "services.json", sj_err)

    app_js_src, app_js_err = load_app_js()
    if app_js_err:
        results.warn("loading", "app.js", app_js_err)

    ui_schemas, ui_err = _load_ui_schemas()
    if ui_err:
        results.warn("loading", "ui_schemas.py", ui_err)

    cfg_services = _get_config_service_ids(config_mod)
    sj_services = _norm_services_json(sj_data)
    register_extensions = _extract_register_extensions(app_js_src or "", results)

    # ── Build the matrix ────────────────────────────────────────
    matrix = build_matrix(
        cfg_services, sj_services,
        schemas_list or [], ui_schemas or [],
        register_extensions,
    )

    # ── Print matrix at the top so it's the first thing seen ────
    if not args.json:
        print()
        print(bold("🔌 Service Integration Report"))
        print("━" * 72)
        print()
        print(bold("📋 Configuration"))
        print(f"  config.py SERVICE_IDS: {sorted(cfg_services) or '(none)'}")
        print(f"  services.json:         {sorted(sj_services) or '(none)'}")
        if register_extensions:
            print(f"  registerExtensions:    {dict(register_extensions)}")
        else:
            print(f"  registerExtensions:    (none)")
        print()
        print(bold("📋 Integration Matrix"))
        print(render_matrix(matrix))
        print()
        print(dim("  Cfg = in config.py SERVICE_IDS"))
        print(dim("  Svcs = in services.json"))
        print(dim("  Data = N tenant schemas extend the service's data base"))
        print(dim("  UI = N tenant UI schemas extend the service's UI base"))
        print(dim("  Reg = app.js calls registerExtensions for this service"))
        print()

    if args.matrix_only:
        # Note: loader warnings (if any) were recorded but not printed in
        # matrix-only mode. Surface a hint so the table isn't trusted blindly.
        sys.exit(0)

    # ── Run checks ──────────────────────────────────────────────
    if not results.aborted():
        # S-C1 first: a namespace mismatch makes everything else moot (the app
        # renders zero tabs regardless of how well the schemas are wired).
        check_namespace_alignment(schemas_list or [], ui_schemas or [], results,
                                   env_ns_source=_env_ns_source)

    if not results.aborted():
        check_config_consistency(cfg_services, sj_services, results)

    if ui_schemas and not results.aborted():
        service_base_fields = load_service_base_fields()
        check_ui_extends(ui_schemas, results)
        check_ui_for_references(ui_schemas, schema_index, schemas_list or [], results)
        check_field_references(ui_schemas, schema_index, schemas_list or [], results,
                               service_base_fields=service_base_fields)
        check_renderer_editor_aliases(ui_schemas, results)

    if not results.aborted():
        check_register_extensions_consistency(
            matrix, schema_index, schemas_list or [], results)

    # ── Output ──────────────────────────────────────────────────
    if args.json:
        print_json(results, tool_name="service_integration_report")
    else:
        print_human(results, args.verbose, tool_name="🔌 Service Integration Checks")

    sys.exit(results.exit_code())


if __name__ == "__main__":
    main()
