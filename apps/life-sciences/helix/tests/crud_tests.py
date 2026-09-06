# CRUD_TESTS_TEMPLATE_VERSION: 13
"""
crud_tests.py — CRUD smoke tests for all schemas.

Run automatically by supero CLI (Step 4.5) after setup and before server launch.
Exit 0 = all tests passed. Exit 1 = one or more failures (launch will be blocked).

Can also be run directly:
    python crud_tests.py

Requires env vars (set by run.sh / .env):
    SUPERO_URL, SUPERO_DOMAIN, SUPERO_ADMIN_EMAIL, SUPERO_PASSWORD,
    SUPERO_PROJECT, SUPERO_API_KEY, SUPERO_DEFAULT_TENANT
"""

import os
import sys
import uuid as _uuid
import warnings

import requests
urllib3 = None
try:
    import urllib3 as _urllib3
    urllib3 = _urllib3
except ImportError:
    pass

# Suppress SSL warnings (dev/staging environments use self-signed certs)
warnings.filterwarnings("ignore", message="Unverified HTTPS request")
if urllib3:
    urllib3.disable_warnings()

# -- Load app schemas and config from the same directory ----------------------
# TESTS_FOLDER_V1 — tests/crud_tests.py imports from app root (one level up)
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from schemas import ALL_SCHEMAS
from config import AppConfig

# -- Credentials from environment ---------------------------------------------
BASE_URL    = os.environ.get("SUPERO_URL", "https://api.supero.dev").rstrip("/")
DOMAIN      = os.environ.get("SUPERO_DOMAIN", "")
PROJECT     = os.environ.get("SUPERO_PROJECT", "default-project")
API_KEY     = os.environ.get("SUPERO_API_KEY", "")
ADMIN_EMAIL = os.environ.get("SUPERO_ADMIN_EMAIL", "")
ADMIN_PASS  = os.environ.get("SUPERO_PASSWORD", "")

# -- PascalCase → snake_case (matches platform storage form) -----------------
import re as _re
# SNAKE-ACRONYM-FOLD-V1 — delegate to the SDK's canonical schema_naming
# normalizer (PackageFAQ -> package_faq, OAuth2Provider -> oauth2_provider).
# The old every-capital split produced 'package_f_a_q', so every CRUD call on
# that schema 404'd while the platform stored it as 'package_faq'. The regex
# below is only the no-SDK fallback (folds acronym runs, minor edge drift).
try:
    from supero.schema_naming import normalize_schema_name as _to_snake
except ImportError:
    def _to_snake(name):
        s = _re.sub(r'(?<=[a-z0-9])(?=[A-Z])', '_', name)
        s = _re.sub(r'(?<=[A-Z])(?=[A-Z][a-z])', '_', s)
        return s.lower()


# -- Types to skip when building test payloads --------------------------------
SKIP_TYPES = {"File"}

# -- Primitive type -> minimal valid value ------------------------------------
TYPE_DEFAULTS = {
    "string":   lambda h: f"test-{h}",
    "integer":  lambda _: 1,
    "float":    lambda _: 1.0,
    "datetime": lambda _: "2026-01-01T00:00:00Z",
    "bool":     lambda _: True,
    "Image":    lambda h: {"url": f"https://picsum.photos/seed/{h}/800/600",
                           "thumbnail_url": f"https://picsum.photos/seed/{h}/400/300"},
}


# -- Helpers ------------------------------------------------------------------

def make_session(token=None, api_key=None):
    s = requests.Session()
    s.verify = False
    s.headers.update({"Content-Type": "application/json"})
    if token:
        s.headers["Authorization"] = f"Bearer {token}"
    if api_key:
        s.headers["X-API-Key"] = api_key
    return s


def login(email, password, project=None):
    """Login and return JWT access token, or None on failure."""
    try:
        r = requests.post(
            f"{BASE_URL}/api/v1/auth/login",
            json={"username": email, "password": password,
                  "domain": DOMAIN, "project": project or PROJECT},
            headers={"Content-Type": "application/json"},
            timeout=15, verify=False,
        )
        if r.status_code in (200, 201):
            auth = r.json().get("auth", {})
            return auth.get("access_token") or auth.get("session_id")
    except Exception:
        pass
    return None


def fetch_tenant_uuid(session, tenant_name):
    """Return UUID of named tenant, or None."""
    try:
        r = session.get(f"{BASE_URL}/api/v1/crud/{DOMAIN}/tenant", timeout=15)
        if r.status_code in (200, 201):
            for t in r.json().get("results", []):
                if t.get("name") == tenant_name:
                    return t["uuid"]
    except Exception:
        pass
    return None


def extract_uuid(body):
    """Extract UUID from various response shapes."""
    if not isinstance(body, dict):
        return None
    if body.get("uuid"):
        return body["uuid"]
    data = body.get("data", {})
    if isinstance(data, dict):
        if data.get("uuid"):
            return data["uuid"]
        for v in data.values():
            if isinstance(v, dict) and v.get("uuid"):
                return v["uuid"]
    return None


def build_enum_map(schemas):
    """Build {EnumName: first_valid_value} from ALL_SCHEMAS."""
    return {
        s["name"]: s["values"][0]
        for s in schemas
        if s.get("schema_type") == "enum" and s.get("values")
    }


def _attr_value(attr, hex_suffix, enum_map):
    """Build one minimal valid value for a mandatory attribute.

    Returns one of:
      * a concrete value (possibly list-wrapped) we are CONFIDENT is valid;
      * sentinel _SKIP_ATTR for types we never synthesize (e.g. File);
      * sentinel _UNRESOLVED_ATTR for a field we cannot satisfy with a value we
        KNOW is valid (a reference to another OBJECT, or an enum whose allowed
        values we don't know). The caller (make_payload) treats _UNRESOLVED_ATTR
        as a synthesis gap: it downgrades the create to a distinct UNVERIFIED
        skip rather than letting a bogus 'test-{hex}' trigger a false-FAIL.

    REAL-CREATE-RESOLVE-V1: enum values are resolved from the attr's OWN inline
    `values` / `default` first (this is how base-owned enums like base_order.status
    arrive in the resolved contract -- type 'string' + inline values), then from
    the app-local `enum_map` (keyed by referenced enum-schema name). Only a
    genuinely unknown non-primitive type (a reference to another object) returns
    _UNRESOLVED_ATTR.
    """
    atype = attr.get("type", "string")
    if atype in SKIP_TYPES:
        return _SKIP_ATTR
    is_list = attr.get("list", False)
    if atype in ("json", "JSON", "object", "Object", "dict", "Dict"):
        # json fields expect dict|list, never a scalar string.
        return [{"label": f"test-{hex_suffix}", "is_correct": True}]
    # Enum-by-inline-values (base-owned enums arrive this way: type 'string' +
    # `values`). Prefer the declared default, else the first allowed value.
    _vals = attr.get("values")
    if isinstance(_vals, list) and _vals:
        _default = attr.get("default")
        val = _default if _default in _vals else _vals[0]
        return [val] if is_list else val
    if atype in TYPE_DEFAULTS:
        val = TYPE_DEFAULTS[atype](hex_suffix)
    elif atype in enum_map:
        # type points at an app-local ENUM schema -> first allowed value.
        val = enum_map[atype]
    else:
        # A non-primitive, non-enum type: this is a REFERENCE to another object
        # (its value must be a real UUID/name of a live record). We cannot
        # synthesize that with a literal -- a bogus 'test-{hex}' would 4xx and
        # historically caused a FALSE-FAIL. Signal "unresolved" so make_payload
        # can try a live-LIST resolve, and downgrade if that yields no rows.
        return _UNRESOLVED_ATTR
    return [val] if is_list else val


# Sentinel for attributes we intentionally don't synthesize.
_SKIP_ATTR = object()
# Sentinel for a mandatory attribute whose value we can't confidently build
# (a reference to another object, or an unknown enum) -- a synthesis gap.
_UNRESOLVED_ATTR = object()


def _resolve_ref_value(session, ref_type, hex_suffix):
    """REAL-CREATE-RESOLVE-V1: resolve a mandatory reference-typed attribute to a
    real, EXISTING record's identifier by doing a live LIST of the referenced
    entity (the smoke runs after setup, so seeded refs already have rows). Returns
    the record's UUID (preferred) or name, or None when the entity has zero rows /
    can't be listed -- in which case the caller downgrades (never false-FAILs).

    `ref_type` is the attribute's declared type (an object-schema name, possibly
    namespaced 'ns:Type'). We LIST it under the app namespace (storage form).
    """
    if not session or not ref_type or not isinstance(ref_type, str):
        return None
    _app_ns_raw = os.environ.get("SUPERO_APP_NAMESPACE", "").strip()
    if not _app_ns_raw:
        return None
    _app_ns = _app_ns_raw.lower().replace("-", "_")
    bare = ref_type.split(":")[-1]
    _ns_type = f"{_app_ns}:{_to_snake(bare)}"
    try:
        r = session.get(f"{BASE_URL}/api/v1/crud/{DOMAIN}/{_ns_type}", timeout=15)
        if r.status_code not in (200, 201):
            return None
        body = r.json() or {}
    except Exception:
        return None
    rows = None
    for key in ("results", "objects", "data"):
        v = body.get(key)
        if isinstance(v, list):
            rows = v
            break
        if isinstance(v, dict):
            for vv in v.values():
                if isinstance(vv, list):
                    rows = vv
                    break
        if rows is not None:
            break
    if not rows:
        return None
    first = rows[0]
    if isinstance(first, dict):
        return first.get("uuid") or first.get("name")
    return None


def make_payload(schema_dict, hex_suffix, tenant_uuid, enum_map,
                 resolved_attrs=None, session=None):
    """Build minimal valid create payload for a schema.

    Returns (payload, unsatisfiable) where `unsatisfiable` is True when at least
    one mandatory field could NOT be given a value we are confident is valid (an
    unresolvable reference with no live rows, or an unknown enum). The caller uses
    that flag to DOWNGRADE the create to a distinct UNVERIFIED skip instead of
    hard-FAILing -- a synthesis gap must never block launch.

    REAL-CREATE-SEEDED-V1: `resolved_attrs` (optional) is the extends-MERGED
    mandatory-attribute list for this schema fetched live from the platform
    (?resolve=true). Service-extension entities (extends '<svc>:base_*') inherit
    mandatory fields owned by the platform service base that are NOT visible in
    the app-local `attributes` list. Folding them in lets the smoke test build a
    COMPLETE payload and require a real 200/201 create for seeded revenue
    entities, instead of soft-skipping every service-extension create.

    REAL-CREATE-RESOLVE-V1: mandatory REFERENCE attrs (type = another object) are
    resolved to a live record's UUID via `session` (a LIST of the referenced
    entity); base-owned/inline ENUM attrs resolve from their own `values`/`default`.
    """
    payload = {
        "name": f"smoketest-{_to_snake(schema_dict['name'])}-{hex_suffix}",
        "parent_type": "tenant",
        "parent_uuid": tenant_uuid,
    }
    unsatisfiable = False
    # Merge app-local attrs with the resolved (extends-merged) attrs. Resolved
    # wins on type info; both are filtered to mandatory below. De-dup by name.
    by_name = {}
    for attr in (schema_dict.get("attributes") or []):
        if isinstance(attr, dict) and attr.get("name"):
            by_name[attr["name"]] = attr
    for attr in (resolved_attrs or []):
        if isinstance(attr, dict) and attr.get("name"):
            # RESOLVED-FLAG-MERGE-V1 — resolved wins on TYPE info, but the
            # mandatory flag is the OR of both shapes: the resolve endpoint
            # spells it 'required' on service bases and sometimes OMITS it
            # entirely (live: blog_post.slug resolved flag-less while the
            # write validator still enforced it). Wholesale replacement made
            # make_payload silently drop the field -> guaranteed 422.
            _prev = by_name.get(attr["name"])
            _merged = dict(attr)
            if ((_prev is not None and _prev.get("mandatory"))
                    or attr.get("required")):
                _merged["mandatory"] = True
            by_name[attr["name"]] = _merged
    for name, attr in by_name.items():
        if not attr.get("mandatory"):
            continue
        if name in payload:
            continue  # name / parent_* already set
        val = _attr_value(attr, hex_suffix, enum_map)
        if val is _SKIP_ATTR:
            continue
        if val is _UNRESOLVED_ATTR:
            # A mandatory reference to another object: try to resolve it to a real
            # existing record's UUID via a live LIST. If the referenced entity has
            # zero rows (nothing to point at), we can't satisfy this create here --
            # mark the payload unsatisfiable so the caller downgrades (no FALSE-FAIL).
            ref_val = _resolve_ref_value(session, attr.get("type"), hex_suffix)
            if ref_val is None:
                unsatisfiable = True
                continue  # omit -- the create would 4xx for a synthesis reason
            payload[name] = [ref_val] if attr.get("list", False) else ref_val
            continue
        payload[name] = val
    return payload, unsatisfiable


# -- REAL-CREATE-SEEDED-V1 ----------------------------------------------------
# Fetch the extends-MERGED schema shapes from the live platform so we can build
# COMPLETE create payloads for service-extension entities (whose mandatory
# fields are owned by the platform service base, invisible in app-local
# `attributes`). Returns {snake_name: [attr_dict, ...]} (resolved attributes).
# Fail-soft to {} on any error -- the caller then falls back to the app-local
# payload + soft-skip behavior, so a missing resolve endpoint never breaks the
# smoke run; it only loses the ability to hard-require a seeded create.
def fetch_resolved_mandatory_map(session):
    out = {}
    try:
        r = session.get(
            f"{BASE_URL}/api/v1/domains/{DOMAIN}/schemas",
            params={"resolve": "true", "include_content": "true"},
            timeout=30,
        )
    except Exception:
        return out
    if r.status_code not in (200, 201):
        return out
    try:
        body = r.json() or {}
    except Exception:
        return out
    rows = body.get("schemas")
    if not isinstance(rows, list):
        rows = body.get("results") if isinstance(body.get("results"), list) else []
    for s in rows:
        if not isinstance(s, dict):
            continue
        name = s.get("name") or s.get("qualified_name")
        if not name:
            continue
        # Strip any namespace prefix and normalize to snake (storage form).
        bare = name.split(":")[-1]
        attrs = s.get("attributes")
        if not attrs and isinstance(s.get("content"), dict):
            attrs = s["content"].get("attributes")
        if isinstance(attrs, list):
            out[_to_snake(bare)] = attrs
    return out


# -- LIVE-READ-AWARE-V1 (L-10) ------------------------------------------------
# The harness had NO model of connector-backed schemas, so it read the platform
# CORRECTLY refusing a write to a `live_read`-bound table as a test FAILURE. In
# one QA run that single blind spot manufactured 154 of 216 reported failures --
# the platform had behaved correctly every single time.
#
# The fix is NOT to swallow 403s. It is to learn, from the SAME authority the
# write gate itself consults, WHICH schemas are read-only, and then assert the
# CORRECT behaviour for them: a write MUST be refused AND a read MUST still work.
#
# GET /api/v1/domains/{domain}/schemas stamps read_only=true + access_mode on
# every live-ro / warehouse-bound schema (platform-core _stamp_read_only, fed by
# connector_proxy_service.get_domain_access_modes) -- the identical live binding
# that makes connector-service answer 403 read_only_connector_schema.
# Returns {snake_name: access_mode}. Fail-soft to {}: an unstamped listing just
# falls back to the response-marker check below, never to a false PASS.
def fetch_read_only_map(session):
    out = {}
    try:
        r = session.get(
            f"{BASE_URL}/api/v1/domains/{DOMAIN}/schemas",
            params={"include_content": "true"}, timeout=30,
        )
        if r.status_code not in (200, 201):
            return out
        body = r.json() or {}
    except Exception:
        return out
    rows = body.get("schemas")
    if not isinstance(rows, list):
        rows = body.get("results") if isinstance(body.get("results"), list) else []
    for s in rows:
        if not isinstance(s, dict):
            continue
        name = s.get("name") or s.get("qualified_name")
        if not name:
            continue
        _ro = s.get("read_only")
        if _ro is not True and isinstance(s.get("content"), dict):
            _ro = s["content"].get("read_only")
        if _ro is True:
            out[_to_snake(str(name).split(":")[-1])] = (
                s.get("access_mode") or "read-only source")
    return out


# The platform's POSITIVE assertion that it refused this write BY DESIGN because
# the schema is bound to a read-only source. Two spellings, both authoritative:
#   read_only_connector_schema -- connector-service, live_read table (proxied
#                                 verbatim by platform-core _maybe_live_write)
#   read_only_schema           -- platform-core _raise_read_only_write
# A bare 403, or an RBAC denial, is NOT this and must never be treated as one --
# that is the whole difference between suppressing a known-correct rejection and
# hiding an unknown one.
_READ_ONLY_MARKERS = ("read_only_connector_schema", "read_only_schema")


def _is_read_only_rejection(resp):
    try:
        text = resp.text or ""
    except Exception:
        text = ""
    return any(m in text for m in _READ_ONLY_MARKERS)


# -- STRUCTURAL-VS-TRANSIENT-V1 (L-08) ----------------------------------------
# Mirrors the seed classifier (app_setup._seed_response_is_retryable): 429/5xx
# and transport errors are TRANSIENT (retryable, non-fatal by default); 4xx
# validation / routing / RBAC verdicts are deterministic app or schema bugs and
# are STRUCTURAL (fatal by default). Keeping both knobs on one classification is
# the point -- SUPERO_STRICT and SUPERO_STRICT_SEED must not drift apart.
_TRANSIENT_RE = _re.compile(
    r"request error|timed out|timeout|connection|max retries"
    r"|HTTP (?:429|5[0-9][0-9])", _re.IGNORECASE)


def _failure_is_transient(msgs):
    """True only when EVERY FAIL line in msgs has a transient shape. One
    structural failure makes the whole result structural -- never the reverse."""
    saw = False
    for m in msgs:
        if m.lstrip().startswith("FAIL"):
            saw = True
            if not _TRANSIENT_RE.search(m):
                return False
    return saw


# -- FAILURE-CAUSE-AGGREGATION-V1 (L-12) --------------------------------------
# The failure block used to print ONE LINE PER FAILED ASSERTION. A real run
# emitted 216 of them; they collapsed to FOUR distinct causes. A 216-line list
# is not a report, it is the raw array -- the reader has to do the grouping the
# harness declined to do, and the headline number ("216 test(s) FAILED") measures
# how many times we asked, not how many things are wrong.
#
# Causes must collapse ACROSS schemas and principals, so normalisation has to
# remove the parts that vary per check while keeping the part that identifies the
# cause. The schema names are substituted by NAME (we know the exact set from
# ALL_SCHEMAS -- no guessing), which is what lets "Object type 'member' not
# found" and "Object type 'order' not found" land in one bucket instead of 36.
#
# NOTE ON REGEX STYLE: this whole module is generated from a NON-RAW template
# string, so a backslash class like \b or \d would be interpreted (or
# deprecation-warned) on the way out. Character classes ([0-9]) and plain
# str.replace are used throughout for that reason -- same convention as
# _TRANSIENT_RE above. Do not "simplify" them back to \d.
_UUID_RE = _re.compile(
    "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", _re.IGNORECASE)
_NUM_RE = _re.compile("[0-9]+")
_HTTP_RE = _re.compile("HTTP ([0-9]{3})")


def _norm_names(all_schemas):
    """Every spelling a schema name can appear under in a response body,
    longest first so 'order_item' is replaced before 'order'."""
    names = set()
    for s in all_schemas or []:
        n = s.get("name") if isinstance(s, dict) else None
        if not n:
            continue
        names.add(str(n).lower())
        names.add(_to_snake(str(n)).lower())
    return sorted((n for n in names if n), key=len, reverse=True)


def _failure_cause(msgs, schema_names):
    """Reduce a check's FAIL lines to (op, code, normalised_detail, raw_detail).

    Uses the FIRST FAIL line: that is the one that decided the verdict, and the
    lines after it are usually downstream consequences of the same cause.
    """
    line = ""
    for m in msgs:
        if m.lstrip().startswith("FAIL"):
            line = m.strip()
            break
    if not line:
        return ("", "", "unknown failure", "unknown failure")

    parts = line.split(None, 2)
    op = parts[1] if len(parts) > 1 else ""
    rest = parts[2] if len(parts) > 2 else ""
    # "Member [tenant_admin:admin]: HTTP 403 -- {...}" -> detail after the label
    detail = rest.split(": ", 1)[1] if ": " in rest else rest

    hit = _HTTP_RE.search(detail)
    code = ("HTTP " + hit.group(1)) if hit else ""

    norm = detail.lower()
    for nm in schema_names:
        norm = norm.replace(nm, "<schema>")
    norm = _UUID_RE.sub("<id>", norm)
    norm = _NUM_RE.sub("<n>", norm)
    norm = " ".join(norm.split())[:160]
    return (op, code, norm, detail)


def _group_failures(failures):
    """Group (label, transient, op, code, norm, detail) tuples by (code, norm).

    Returns groups ordered by count desc. A group is structural unless EVERY
    check in it was transient -- same one-structural-poisons-the-group rule
    _failure_is_transient applies within a single check.
    """
    causes = {}
    order = []
    for label, transient, op, code, norm, detail in failures:
        key = (code, norm)
        if key not in causes:
            causes[key] = {"code": code, "detail": detail, "ops": set(),
                           "labels": [], "count": 0, "transient": True}
            order.append(key)
        c = causes[key]
        c["count"] += 1
        c["transient"] = c["transient"] and transient
        if op:
            c["ops"].add(op)
        if len(c["labels"]) < 3:
            c["labels"].append(label)
    ranked = sorted(range(len(order)), key=lambda i: (-causes[order[i]]["count"], i))
    return [causes[order[i]] for i in ranked]


def is_entity_seeded(session, schema_name):
    """REAL-CREATE-SEEDED-V1: the smoke test runs AFTER setup, so a seeded
    entity already has >=1 record. A live LIST count >0 PROVES the entity is
    creatable with real data -- so a synthetic-payload create MUST succeed and a
    failure is a real bug (hard-FAIL), not a 'can't synthesize' soft-skip.
    Fail-soft to False (treat as unseeded -> soft-skip) on any error."""
    _app_ns_raw = os.environ.get("SUPERO_APP_NAMESPACE", "").strip()
    if not _app_ns_raw:
        return False
    _app_ns = _app_ns_raw.lower().replace("-", "_")
    _ns_type = f"{_app_ns}:{_to_snake(schema_name)}"
    try:
        r = session.get(f"{BASE_URL}/api/v1/crud/{DOMAIN}/{_ns_type}", timeout=15)
        if r.status_code not in (200, 201):
            return False
        body = r.json() or {}
    except Exception:
        return False
    for key in ("results", "objects", "data"):
        v = body.get(key)
        if isinstance(v, list) and len(v) > 0:
            return True
        if isinstance(v, dict):
            for vv in v.values():
                if isinstance(vv, list) and len(vv) > 0:
                    return True
    return False


# -- SOFT-CREATE-SKIP-V1 ------------------------------------------------------
# Some schemas CANNOT be created by a synthetic, app-local payload:
#   - CHILD entities (parent_type points at another entity, not "tenant") need a
#     live parent record to exist first. This is the ONLY remaining TRUE soft-skip:
#     we can't synthesize a parent here, so a routed 400 PARENT_NOT_FOUND proves
#     namespace routing + RBAC and we skip the body.
#   - SERVICE-EXTENSION entities (extends "<svc>:base_*") inherit a mandatory-field
#     contract owned by the platform service base. REAL-CREATE-SEEDED-V1 now folds
#     those resolved mandatory fields into the payload (?resolve=true) so these CAN
#     be created. They are NO LONGER blanket-skipped: a SEEDED service-extension
#     entity (live LIST count >0) MUST create with 200/201 or it hard-FAILS; an
#     UNSEEDED one with no resolved contract degrades to a DISTINCT 'skip' status
#     (reported separately, never counted as green).
# Returns (kind, detail):
#   kind == "child"   -> true soft-skip (needs a live parent record)
#   kind == "service" -> service-extension (resolve+seed-aware; real create expected)
#   kind == "plain"   -> ordinary tenant-level entity (real create always required)
def soft_create_classification(schema):
    pt = schema.get("parent_type")
    if pt and pt != "tenant":
        return "child", f"child of '{pt}' (needs a live parent record)"
    ext = schema.get("extends")
    if ext:
        return "service", f"extends service base '{ext}' (base owns mandatory fields)"
    return "plain", ""


# -- Core test functions -------------------------------------------------------

# -- Role create-capability (read-only RBAC correctness) ----------------------
# Read-only roles are CORRECTLY denied CREATE with HTTP 403; treat that as the
# expected outcome, not a failure. Prefer the canonical permissions module;
# fall back to a built-in read-only set if it is not importable here.
try:
    from platform_client.permissions import get_permissions_for_role as _get_perms

    def _role_can_create(role):
        perms = _get_perms(role) or []
        return "crud:create" in perms or "crud:*" in perms
except Exception:
    _READ_ONLY_ROLES = {"viewer"}

    def _role_can_create(role):
        return role not in _READ_ONLY_ROLES


# -- PER-ENTITY-RBAC-V1 — resolved per-entity policy (the source of truth) ------
# The coarse _role_can_create above is entity-agnostic: it says "tenant_user can
# create" (true for SOME entities) and so mis-FAILs a 403 on an entity the role is
# CORRECTLY not allowed to create (a customer can't create Product/Invoice, can't
# update Order/Payment). The platform exposes the caller's RESOLVED per-entity
# policy at /access-policy/me; we use it to recognize a by-design 403 as the
# EXPECTED outcome. Fail-soft: None means "unknown" and the caller keeps the old
# coarse behavior, so this can never INTRODUCE a failure.
def fetch_my_policy(session):
    """Return the session user's resolved policy dict, or None on any failure.
    Shape: {is_admin, default_access, entities: {entity: {can_create, can_read,
    can_update, can_delete}}}."""
    try:
        r = session.get(
            f"{BASE_URL}/api/v1/crud/{DOMAIN}/access-policy/me", timeout=15)
        if r.status_code == 200:
            return (r.json() or {}).get("policy")
    except Exception:
        pass
    return None


def _policy_allows(policy, action, schema_name):
    """Whether `policy` grants `action` ('create'|'read'|'update'|'delete') on the
    entity for `schema_name`. Returns True/False, or None when undeterminable (no
    policy fetched) so the caller falls back to the coarse role check. Entity match
    is namespace-agnostic (bare snake, app-namespaced snake, and raw name)."""
    if not isinstance(policy, dict):
        return None
    if policy.get("is_admin"):
        return True
    snake = _to_snake(schema_name)
    app_ns = os.environ.get("SUPERO_APP_NAMESPACE", "").strip().lower().replace("-", "_")
    ents = policy.get("entities") or {}
    ea = None
    for key in (snake, (f"{app_ns}:{snake}" if app_ns else snake), schema_name, schema_name.lower()):
        if isinstance(ents, dict) and key in ents:
            ea = ents[key]
            break
    if isinstance(ea, dict):
        return bool(ea.get("can_" + action))
    da = (policy.get("default_access") or "none").lower()
    if da in ("full", "all"):
        return True
    if da in ("read", "readonly", "read_only"):
        return action == "read"
    return False


def test_schema_crud(session, schema_name, payload, label,
                     kind="plain", soft_reason="", seeded=False,
                     unsatisfiable=False, caps=None, read_only_mode=None):
    msgs = []
    created_uuid = None
    # SUPERO_TEMPLATE_FIX_V1 — restored original template line.
    # EDIT C of patch_namespace_required_python_v1 anchored too
    # loosely and landed inside this template instead of real
    # code at run.py L1173. Step 0 validation (from patch
    # startup_validation_v1) covers the same protection at
    # startup, so this template doesn't need fail-loud.
    # NS_REQUIRED_CRUD_V1 — never fall back to DOMAIN (misroutes CRUD). Fail hard.
    _app_ns_raw = os.environ.get("SUPERO_APP_NAMESPACE", "").strip()
    if not _app_ns_raw:
        print("  x SUPERO_APP_NAMESPACE not set -- refusing to run CRUD tests "
              "(would misroute to domain). Run ./run.sh setup first.")
        sys.exit(1)
    _app_ns = _app_ns_raw.lower().replace("-", "_")
    _ns_type = f"{_app_ns}:{_to_snake(schema_name)}"
    url_base = f"{BASE_URL}/api/v1/crud/{DOMAIN}/{_ns_type}"
    passed = True

    try:
        # CREATE
        try:
            r = session.post(url_base, json=payload, timeout=30)
        except Exception as e:
            msgs.append(f"  FAIL CREATE {schema_name} [{label}]: request error -- {e}")
            return False, msgs

        _role = label.split(":", 1)[0]
        # LIVE-READ-AWARE-V1 (L-10) — read-only is a DATA-SOURCE capability, not
        # an RBAC grant: it binds admins too (see platform-core
        # _assert_schema_writable, "Role-INDEPENDENT"). So it is evaluated BEFORE
        # any role/policy check, both of which are about WHO is asking rather than
        # WHETHER the target accepts writes at all.
        #   read_only_mode  -> the schema CATALOG stamped this schema live-ro /
        #                      warehouse (same live binding the write gate uses)
        #   _is_read_only_rejection -> the platform's own positive marker for the
        #                      same verdict, used when the best-effort stamp fell
        #                      open (stamping is explicitly documented fail-soft).
        _ro_declared = read_only_mode is not None
        _ro_rejected = (r.status_code == 403 and _is_read_only_rejection(r))
        if _ro_declared or _ro_rejected:
            _ro_src = read_only_mode or "live-read binding"
            if r.status_code in (200, 201):
                # The platform ACCEPTED a write to a read-only source. This is a
                # real enforcement bug and the single most valuable thing this
                # branch can catch — it must never be downgraded.
                msgs.append(
                    f"  FAIL CREATE {schema_name} [{label}]: schema is read-only "
                    f"({_ro_src}) but the write was ACCEPTED (HTTP {r.status_code}) "
                    f"-- read-only enforcement is broken"
                )
                return False, msgs
            if r.status_code != 403:
                msgs.append(
                    f"  FAIL CREATE {schema_name} [{label}]: read-only schema "
                    f"({_ro_src}) expected a 403 refusal but got HTTP "
                    f"{r.status_code} -- {r.text[:200]}"
                )
                return False, msgs
            # A 403 here is the CORRECT platform behaviour. Prove the schema is
            # genuinely READ-only rather than simply broken: the read path must
            # still serve. A live_read table that cannot be read IS a failure, and
            # requiring this is what keeps the suppression honest.
            try:
                _lr = session.get(url_base, timeout=15)
            except Exception as e:
                msgs.append(
                    f"  FAIL LIST   {schema_name} [{label}]: write correctly refused "
                    f"({_ro_src}) but LIST errored -- {e}")
                return False, msgs
            if _lr.status_code != 200:
                msgs.append(
                    f"  FAIL LIST   {schema_name} [{label}]: write correctly refused "
                    f"({_ro_src}) but LIST returned HTTP {_lr.status_code} -- a "
                    f"read-only source that cannot be READ is broken")
                return False, msgs
            _why = "catalog read_only" if _ro_declared else "platform read_only marker"
            msgs.append(
                f"  PASS READONLY {schema_name} [{label}]: write correctly refused "
                f"403 ({_ro_src}; {_why}) and LIST reads OK")
            return "read_only", msgs
        # PER-ENTITY-RBAC-V1 — a 403 is the CORRECT outcome when this role's
        # resolved policy does not grant create on THIS entity (a storefront
        # customer cannot create products/invoices/shipments). Recognize that as an
        # expected deny BEFORE the coarse role-level check (which is entity-agnostic
        # and would mis-FAIL it). Only fires when the policy positively denies, so
        # it can never hide a real over-permissive bug (policy grants but platform
        # 403s still falls through to a FAIL below).
        if r.status_code == 403 and _policy_allows(caps, "create", schema_name) is False:
            msgs.append(f"  PASS CREATE {schema_name} [{label}] (correctly denied 403 -- not granted by policy)")
            return True, msgs
        if not _role_can_create(_role):
            if r.status_code == 403:
                msgs.append(f"  PASS CREATE {schema_name} [{label}] (correctly denied 403)")
                return True, msgs
            msgs.append(
                f"  FAIL CREATE {schema_name} [{label}]: "
                f"expected 403 (read-only role) but got HTTP {r.status_code} -- {r.text[:200]}"
            )
            return False, msgs
        if r.status_code not in (200, 201):
            # REAL-CREATE-SEEDED-V1 — decide skip-vs-FAIL by entity KIND + seeded.
            # A routed 400 PARENT_NOT_FOUND / 422 VALIDATION_FAILED proves namespace
            # routing + RBAC; for entities we genuinely can't synthesize here we
            # SKIP, but a SEEDED service-extension (proven creatable) MUST succeed.
            _ecode = ""
            try:
                _ecode = (r.json() or {}).get("error_code", "") or ""
            except Exception:
                _ecode = ""
            _routed_reject = (
                r.status_code in (400, 422)
                and (_ecode in ("PARENT_NOT_FOUND", "VALIDATION_FAILED")
                     or "Parent object not found" in r.text
                     or "mandatory field" in r.text)
            )
            # CHILD entities: true soft-skip -- can't synthesize a parent here.
            if kind == "child" and _routed_reject:
                msgs.append(
                    f"  SKIP CREATE {schema_name} [{label}]: routing+RBAC OK; "
                    f"synthetic payload can't satisfy {soft_reason} "
                    f"(HTTP {r.status_code} {_ecode})"
                )
                return "skip", msgs
            # REAL-CREATE-RESOLVE-V1 — the seeded hard-require applies ONLY to the
            # admin/creatable session AND only when the payload was fully satisfiable.
            # A synthesis gap (`unsatisfiable`: a mandatory ref had no live record to
            # point at, or an enum we couldn't resolve) is NOT a real failure -- a
            # bogus value would 4xx for a reason that has nothing to do with the app.
            # Likewise a non-admin session that legitimately can't create (e.g.
            # owner-scoped) must DOWNGRADE, not block launch.
            _is_admin = _role == "tenant_admin"
            _hard_require = (
                kind == "service" and _routed_reject and seeded
                and not unsatisfiable and _is_admin
            )
            # SERVICE-EXTENSION entities that we can't prove (unseeded, OR a synthesis
            # gap, OR a non-admin session): DISTINCT skip status (reported separately,
            # NEVER counted green). Loud, not soft.
            if kind == "service" and _routed_reject and not _hard_require:
                _why = ("UNSEEDED service-extension" if not seeded
                        else ("synthesis gap: a mandatory ref/enum could not be "
                              "satisfied here" if unsatisfiable
                              else "non-admin session cannot create"))
                msgs.append(
                    f"  SKIP-UNSEEDED CREATE {schema_name} [{label}]: routing+RBAC OK "
                    f"but {_why}; could not verify a real create "
                    f"({soft_reason}) (HTTP {r.status_code} {_ecode})"
                )
                return "skip_unseeded", msgs
            # PLAIN entities with a synthesis gap (a mandatory reference attr whose
            # target has no live record to point at): a routed reject is NOT a real
            # failure -- the create is unconstructible here, not broken. Downgrade so
            # a missing-seed reference never blocks launch.
            if kind == "plain" and _routed_reject and unsatisfiable:
                msgs.append(
                    f"  SKIP-UNSEEDED CREATE {schema_name} [{label}]: routing+RBAC OK "
                    f"but a mandatory reference/enum could not be satisfied here "
                    f"(no live record to point at) (HTTP {r.status_code} {_ecode})"
                )
                return "skip_unseeded", msgs
            # Everything else (plain entities; seeded+satisfiable service-extensions on
            # the admin session; non-routed errors 404/409/401/5xx) is a hard FAIL.
            _hint = ""
            if _hard_require:
                _hint = (" [SEEDED service-extension MUST create with the resolved "
                         "mandatory contract -- this is a real failure]")
            msgs.append(
                f"  FAIL CREATE {schema_name} [{label}]: "
                f"HTTP {r.status_code} -- {r.text[:200]}{_hint}"
            )
            return False, msgs

        created_uuid = extract_uuid(r.json())
        if not created_uuid:
            msgs.append(
                f"  FAIL CREATE {schema_name} [{label}]: "
                f"no UUID in response -- {r.text[:200]}"
            )
            return False, msgs
        msgs.append(f"  PASS CREATE {schema_name} [{label}]")

        # READ
        try:
            r = session.get(f"{url_base}/{created_uuid}", timeout=15)
            if r.status_code == 200:
                msgs.append(f"  PASS READ   {schema_name} [{label}]")
            else:
                msgs.append(f"  FAIL READ   {schema_name} [{label}]: HTTP {r.status_code}")
                passed = False
        except Exception as e:
            msgs.append(f"  FAIL READ   {schema_name} [{label}]: {e}")
            passed = False

        # LIST
        try:
            r = session.get(url_base, timeout=15)
            if r.status_code == 200:
                msgs.append(f"  PASS LIST   {schema_name} [{label}]")
            else:
                msgs.append(f"  FAIL LIST   {schema_name} [{label}]: HTTP {r.status_code}")
                passed = False
        except Exception as e:
            msgs.append(f"  FAIL LIST   {schema_name} [{label}]: {e}")
            passed = False

        # UPDATE
        try:
            r = session.put(
                f"{url_base}/{created_uuid}",
                json={"name": payload["name"] + "-upd"},
                timeout=30,
            )
            if r.status_code in (200, 201):
                msgs.append(f"  PASS UPDATE {schema_name} [{label}]")
            elif r.status_code == 403 and _policy_allows(caps, "update", schema_name) is False:
                # PER-ENTITY-RBAC-V1 — role can create+read but not update this
                # entity by design (e.g. a customer cannot edit a placed Order /
                # captured Payment / submitted Return). A 403 is the expected outcome.
                msgs.append(f"  PASS UPDATE {schema_name} [{label}] (correctly denied 403 -- not granted by policy)")
            else:
                msgs.append(f"  FAIL UPDATE {schema_name} [{label}]: HTTP {r.status_code}")
                passed = False
        except Exception as e:
            msgs.append(f"  FAIL UPDATE {schema_name} [{label}]: {e}")
            passed = False

    finally:
        # DELETE (always attempt cleanup)
        if created_uuid:
            try:
                r = session.delete(f"{url_base}/{created_uuid}", timeout=15)
                if r.status_code in (200, 204):
                    msgs.append(f"  PASS DELETE {schema_name} [{label}]")
                else:
                    msgs.append(
                        f"  WARN DELETE {schema_name} [{label}]: "
                        f"HTTP {r.status_code} (cleanup may have failed)"
                    )
            except Exception as e:
                msgs.append(f"  WARN DELETE {schema_name} [{label}]: {e} (cleanup)")

    return passed, msgs


# -- Main ---------------------------------------------------------------------

def main():
    if not DOMAIN:
        print("  x SUPERO_DOMAIN not set -- skipping CRUD tests")
        sys.exit(2)
    if not API_KEY and not (ADMIN_EMAIL and ADMIN_PASS):
        print("  x No SUPERO_API_KEY or SUPERO_PASSWORD set -- skipping CRUD tests")
        sys.exit(2)

    hex_suffix = _uuid.uuid4().hex[:8]
    # WRITE-LED-SUMMARY-V1 (L-11) — the verdict and the exit code are computed
    # from ONE list (the seed path's SEED-VERDICT-AGREES-V1 lesson: a banner and
    # a gate reading different state WILL drift, and did).
    #
    # FAILURE-CAUSE-AGGREGATION-V1 (L-12) — each entry is
    #   (label, is_transient, op, error_code, normalised_message, raw_detail)
    # so the block can group by CAUSE. EVERY append site must produce all six
    # (append the `_failure_cause(...)` tuple); a 2-tuple appended anywhere makes
    # _group_failures raise at unpack time.
    failures = []
    writes_ok = 0     # REAL creates that returned 200/201 — the headline number
    denied_ok = 0     # negative assertions ("correctly denied 403") that passed
    readonly_ok = 0   # read-only schemas that correctly refused a write AND read
    cfg = AppConfig()

    enum_map = build_enum_map(ALL_SCHEMAS)
    object_schemas = [s for s in ALL_SCHEMAS if s.get("schema_type") == "object"]
    # L-12: computed once; used to collapse per-schema wording in failure causes.
    _schema_names = _norm_names(ALL_SCHEMAS)

    if not object_schemas:
        print("  No object schemas found -- skipping CRUD tests")
        sys.exit(0)

    print(f"\n  Running CRUD smoke tests -- {len(object_schemas)} schemas\n")

    # Build admin session: prefer API key, fall back to password
    if API_KEY:
        admin_session = make_session(api_key=API_KEY)
    else:
        admin_token = login(ADMIN_EMAIL, ADMIN_PASS)
        if not admin_token:
            print(f"  x Admin login failed for {ADMIN_EMAIL} -- check SUPERO_PASSWORD in .env")
            sys.exit(2)
        admin_session = make_session(token=admin_token)

    # Fast-fail: verify domain is reachable and credentials are valid
    # Exit code 2 = infra/config issue (not a test failure) -- server launch continues
    try:
        r = admin_session.get(f"{BASE_URL}/api/v1/crud/{DOMAIN}/tenant", timeout=15)
        if r.status_code == 401:
            print(f"  x Auth rejected (HTTP 401) -- check SUPERO_API_KEY or SUPERO_PASSWORD in .env")
            print(f"    {r.text[:200]}")
            sys.exit(2)
        elif r.status_code == 404:
            print(f"  x Domain '{DOMAIN}' not found (HTTP 404) -- check SUPERO_DOMAIN in .env")
            sys.exit(2)
        elif r.status_code not in (200, 201):
            print(f"  x Unexpected response from server (HTTP {r.status_code}) -- aborting tests")
            print(f"    {r.text[:200]}")
            sys.exit(2)
    except Exception as e:
        print(f"  x Cannot reach {BASE_URL} -- network error, skipping tests")
        print(f"    {e}")
        sys.exit(2)

    # Fetch tenant UUID
    tenant_name = next(
        (t["name"] for t in cfg.tenants if t["name"] != "default-tenant"),
        cfg.tenants[0]["name"] if cfg.tenants else "default-tenant",
    )
    tenant_uuid = fetch_tenant_uuid(admin_session, tenant_name)
    if not tenant_uuid:
        tenant_uuid = fetch_tenant_uuid(admin_session, "default-tenant")
    if not tenant_uuid:
        print(f"  x Could not fetch tenant UUID for '{tenant_name}' -- skipping tests")
        sys.exit(2)

    # Build user sessions from config.users
    user_sessions = []
    for u in cfg.users:
        email    = u["email"]
        # REPLACED-BY-3.5.0: no hardcoded password fallback.

        password = u.get("password") or getattr(cfg, "default_user_password", "")
        role     = u.get("role", "tenant_user")
        token = login(email, password)
        if token:
            # PRINCIPAL-TENANT-V1 (L-11) — carry the principal's DECLARED tenant
            # membership. config.users[].tenant is what provisioning actually
            # honours, so it is what this principal may write into.
            user_sessions.append((make_session(token=token), role, email,
                                  u.get("tenant") or "default-tenant"))
        else:
            print(f"  Warning: Login failed for {email} (role={role}) -- skipping")

    # The admin credential is the DOMAIN admin (platform_admin/domain_admin), the
    # one principal base_route._require_tenant_access lets cross tenants, so it
    # keeps the app tenant as its target.
    sessions_to_test = [
        (admin_session, "tenant_admin", ADMIN_EMAIL, tenant_name),
        *user_sessions,
    ]

    # REAL-CREATE-SEEDED-V1 — fetch the extends-MERGED mandatory contract once so
    # service-extension entities (Booking/Order/Payment...) get a COMPLETE payload
    # and a SEEDED one is required to create for real. Fail-soft to {} (degrades to
    # the app-local payload + a distinct unseeded-skip status; never crashes).
    resolved_map = fetch_resolved_mandatory_map(admin_session)
    if resolved_map:
        print(f"  (resolved {len(resolved_map)} schema contract(s) for real-create checks)")
    else:
        print("  (could not resolve schema contracts -- service-extension creates "
              "will report a distinct unseeded-skip status, never green)")

    # PER-ENTITY-RBAC-V1 — fetch each role's resolved per-entity policy ONCE so a
    # by-design 403 (e.g. customer can't create Product / update Order) is reported
    # as an expected PASS, not a failure. Fail-soft: a None entry keeps the legacy
    # coarse role-level behavior for that session.
    caps_by_session = {}
    for session, role, email, _tn in sessions_to_test:
        caps_by_session[id(session)] = fetch_my_policy(session)

    # LIVE-READ-AWARE-V1 (L-10) — which schemas are bound to a READ-ONLY source.
    read_only_map = fetch_read_only_map(admin_session)
    if read_only_map:
        print(f"  ({len(read_only_map)} schema(s) are read-only / live-read bound "
              f"-- writes to these MUST be refused, reads MUST work)")

    # PRINCIPAL-TENANT-V1 (L-11) — resolve each principal's OWN tenant ONCE.
    # Every create used to be parented to ONE tenant (the first non-default entry
    # in config.tenants) for EVERY principal. A tenant_admin provisioned into
    # 'default-tenant' was therefore asked to write into e.g. 'harmony-arts', and
    # the platform correctly answered 403 "You do not have access to this tenant"
    # — base_route._require_tenant_access treats only platform_admin /
    # platform_user / domain_admin as tenant-crossing, which is exactly why the
    # domain-admin session passes and the config users do not. That fabricated one
    # false failure PER SCHEMA for every such principal.
    #
    # An UNRESOLVABLE declared tenant is a REAL provisioning gap, not a fixture
    # problem: it is reported ONCE (not once per schema) and stays a failure.
    _tenant_uuid_cache = {tenant_name: tenant_uuid}

    def _tenant_uuid_for(name):
        if not name:
            return tenant_uuid
        if name not in _tenant_uuid_cache:
            _tenant_uuid_cache[name] = fetch_tenant_uuid(admin_session, name)
        return _tenant_uuid_cache[name]

    runnable_sessions = []
    for _si, (session, role, email, _tn) in enumerate(sessions_to_test):
        _label = f"{role}:{email.split('@')[0]}"
        _tu = _tenant_uuid_for(_tn)
        if not _tu:
            print(f"  x PROVISIONING [{_label}]: declared tenant '{_tn}' does not "
                  f"exist in domain '{DOMAIN}' -- this principal cannot write "
                  f"anywhere. Not a test artifact: fix provisioning or config.")
            # L-12: this path has no FAIL lines to mine, so synthesize the cause
            # through the SAME extractor the CRUD checks use -- otherwise the
            # tuple arity diverges and _group_failures explodes. Schema names are
            # deliberately NOT substituted here: the varying token is the TENANT,
            # and two principals blocked by the same missing tenant are one cause.
            _prov_detail = (f"declared tenant '{_tn}' does not exist in domain "
                            f"'{DOMAIN}' -- this principal cannot write anywhere")
            failures.append(
                (f"tenant '{_tn}' never provisioned [{_label}]", False)
                + _failure_cause([f"  FAIL PROVISIONING tenant [{_label}]: "
                                  f"{_prov_detail}"], []))
            continue
        runnable_sessions.append((session, role, email, _tn, _tu, _si))

    skipped = 0            # child entities (true needs-parent soft-skip)
    skipped_unseeded = []  # service-extension entities we could NOT verify (DISTINCT)
    for schema in object_schemas:
        schema_name = schema["name"]
        kind, soft_reason = soft_create_classification(schema)
        _resolved_attrs = resolved_map.get(_to_snake(schema_name))
        # Build the payload with the ADMIN session so mandatory references resolve
        # to real existing records (admin can LIST every entity). `unsatisfiable`
        # is True when a mandatory ref/enum could not be given a value we trust.
        payload, _unsatisfiable = make_payload(
            schema, hex_suffix, tenant_uuid, enum_map,
            resolved_attrs=_resolved_attrs, session=admin_session)
        # A service-extension entity is REQUIRED to create when it is SEEDED
        # (live LIST count >0 proves it is creatable with real data).
        seeded = is_entity_seeded(admin_session, schema_name) if kind == "service" else False
        print(f"  -- {schema_name} --")
        _ro_mode = read_only_map.get(_to_snake(schema_name))
        for session, role, email, _tn, _tu, _si in runnable_sessions:
            label = f"{role}:{email.split('@')[0]}"
            # Address this principal at ITS OWN tenant, and give it its OWN record
            # name: one shared name across N principals made every principal after
            # the first collide with 409 "already exists" whenever the first one's
            # cleanup DELETE did not land (216 of 805 failures across the stored
            # corpus were exactly this).
            _payload = dict(payload)
            _payload["parent_uuid"] = _tu
            _payload["name"] = f"{payload['name']}-s{_si}"
            passed, msgs = test_schema_crud(
                session, schema_name, _payload, label,
                kind=kind, soft_reason=soft_reason, seeded=seeded,
                unsatisfiable=_unsatisfiable,
                caps=caps_by_session.get(id(session)),
                read_only_mode=_ro_mode,
            )
            for m in msgs:
                print(m)
                _ms = m.lstrip()
                if _ms.startswith("PASS CREATE"):
                    if "correctly denied" in _ms:
                        denied_ok += 1
                    else:
                        writes_ok += 1
                elif _ms.startswith("PASS READONLY"):
                    readonly_ok += 1
            if passed == "skip":
                skipped += 1
            elif passed == "skip_unseeded":
                skipped_unseeded.append(f"{schema_name} [{label}]")
            elif passed == "read_only":
                pass  # already tallied via PASS READONLY
            elif not passed:
                # L-12: carry the CAUSE, not just the label. Without it the
                # verdict block can only count assertions, which is what made a
                # 4-cause run print 216 undifferentiated lines.
                _op, _code, _norm, _detail = _failure_cause(msgs, _schema_names)
                failures.append((f"{schema_name} [{label}]",
                                 _failure_is_transient(msgs),
                                 _op, _code, _norm, _detail))
        print()

    # ── VERDICT (WRITE-LED-SUMMARY-V1, L-11) ────────────────────────────────
    # The headline is SUCCESSFUL WRITES. A run whose every PASS was a negative
    # assertion ("correctly denied 403") proved nothing about the write surface,
    # and reporting "78 PASS" for it is the same degraded-paths-report-success
    # anti-pattern this harness exists to catch. So the write count leads, and a
    # run that wrote nothing says so FIRST.
    _structural = [f[0] for f in failures if not f[1]]
    _transient = [f[0] for f in failures if f[1]]
    print()
    print(f"  WRITES: {writes_ok} successful create(s)"
          f"  |  {denied_ok} correctly-denied  |  {readonly_ok} read-only refusal(s) verified")
    if writes_ok == 0:
        print("  !! NO WRITE WAS PROVEN -- 0 successful creates in this run.")
        print("     Every PASS above is a NEGATIVE assertion (a denial, or a")
        print("     read-only refusal). The write surface of this app is UNVERIFIED.")

    if failures:
        # FAILURE-CAUSE-AGGREGATION-V1 (L-12) — LEAD with the number of distinct
        # CAUSES. The assertion count is still printed, but as the blast radius
        # of those causes, not as the headline: "216 test(s) FAILED" tells the
        # reader how big the matrix is, "4 distinct cause(s)" tells them how many
        # things they have to go fix.
        _groups = _group_failures(failures)
        print(f"  x {len(_groups)} distinct failure cause(s) "
              f"across {len(failures)} failed check(s) "
              f"({len(_structural)} structural, {len(_transient)} transient):")
        for _g in _groups:
            _kind = "transient" if _g["transient"] else "structural"
            _ops = "/".join(sorted(_g["ops"])) or "?"
            _code = _g["code"] or _ops
            _hdr = _code if _code == _ops else (_code + " " + _ops)
            print(f"      * [{_kind}] {_hdr} -- {_g['count']} check(s)")
            print(f"          {_g['detail'][:200]}")
            _more = _g["count"] - len(_g["labels"])
            _eg = ", ".join(_g["labels"])
            _suffix = f" (+{_more} more)" if _more > 0 else ""
            print(f"          e.g. {_eg}{_suffix}")

    # Exit code and printed verdict come from the SAME state, in one place.
    #   4 = catastrophic: structural failures AND not one write proven
    #   1 = structural failures (deterministic app/schema bugs)
    #   3 = transient-only failures (network / 429 / 5xx)
    #   0 = healthy (possibly with unverified creates)
    if _structural and writes_ok == 0:
        print("  x CRUD smoke tests FAILED -- the ENTIRE write surface is broken "
              "(0 successful creates).")
        sys.exit(4)
    if _structural:
        print(f"  x CRUD smoke tests FAILED -- {len(_structural)} structural "
              f"failure(s) (deterministic; they will not self-heal).")
        sys.exit(1)
    if _transient:
        print(f"  ! CRUD smoke tests DEGRADED -- {len(_transient)} transient "
              f"failure(s) only (network/429/5xx); no structural failure.")
        sys.exit(3)
    if skipped_unseeded:
        # DISTINCT non-green status: revenue / service-extension creates could not
        # be verified for real (unseeded + unresolved contract). NOT a hard launch
        # block (no FAIL), but we must NOT print "All passed".
        print(f"  ! {len(skipped_unseeded)} service-extension create(s) UNVERIFIED "
              f"(unseeded; no real create proven):")
        for s in skipped_unseeded:
            print(f"      * {s}")
        _skip_note = (f" ({skipped} child create(s) skipped -- routing+RBAC verified)"
                      if skipped else "")
        print(f"  CRUD smoke tests passed with UNVERIFIED creates{_skip_note} "
              f"-- {writes_ok} write(s) proven")
        sys.exit(0)
    else:
        _skip_note = (
            f" ({skipped} child create(s) skipped -- needs a live parent; "
            f"routing+RBAC verified)" if skipped else ""
        )
        print(f"  All CRUD smoke tests passed{_skip_note} "
              f"-- {writes_ok} write(s) proven")
        sys.exit(0)


if __name__ == "__main__":
    main()
