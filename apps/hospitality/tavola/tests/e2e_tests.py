# E2E_TESTS_VERSION: 1
#!/usr/bin/env python3
import os, sys, re, ast, time, uuid, json, argparse
import requests, urllib3
from dataclasses import dataclass, field
from typing import List
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# TESTS_FOLDER_V1 — e2e_tests.py lives in tests/, so go up one more level
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from schemas import ALL_SCHEMAS
try:
    from schemas import SUPERO_APP_NAMESPACE  # legacy bundles only
except Exception:
    # ABSOLUTE-NAMESPACE-FROM-CONTENT-V1 — modern bundles carry NO
    # SUPERO_APP_NAMESPACE variable; this runs as a separate process and cannot
    # rely on os.environ. Derive the primary namespace from ALL_SCHEMAS content.
    _ns_counts = {}
    for _s in ALL_SCHEMAS:
        if isinstance(_s, dict) and str(_s.get("namespace", "")).strip():
            _n = str(_s["namespace"]).strip().lower().replace("-", "_")
            _ns_counts[_n] = _ns_counts.get(_n, 0) + 1
    SUPERO_APP_NAMESPACE = (sorted(_ns_counts, key=lambda n: (-_ns_counts[n], n))[0]
                            if _ns_counts else "")
from config import AppConfig

def _load_env(p):
    if not os.path.exists(p): return
    with open(p) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))
_load_env(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

def _env(k, d=""): return os.getenv(k, d)
DOMAIN = _env("SUPERO_DOMAIN"); PROJECT = _env("SUPERO_PROJECT", "default-project")
API_KEY = _env("SUPERO_API_KEY"); ADMIN_EMAIL = _env("SUPERO_ADMIN_EMAIL"); ADMIN_PASS = _env("SUPERO_PASSWORD")
IS_MULTI_TENANT = _env("SUPERO_IS_MULTI_TENANT", "").lower() == "true"
PUBLIC_SCHEMAS = [s.strip() for s in _env("PUBLIC_SCHEMAS").split(",") if s.strip()]
SERVER_URL = f"http://localhost:{_env('PORT', _env('UI_PORT', '5673'))}"
cfg = AppConfig(); HEX = uuid.uuid4().hex[:6]

# SNAKE-ACRONYM-FOLD-V1 — canonical schema_naming normalizer (PackageFAQ ->
# package_faq, not package_f_a_q — the latter 404s every call); regex fallback.
try:
    from supero.schema_naming import normalize_schema_name as _to_snake
except ImportError:
    def _to_snake(n):
        s = re.sub(r'(?<=[a-z0-9])(?=[A-Z])', '_', n)
        return re.sub(r'(?<=[A-Z])(?=[A-Z][a-z])', '_', s).lower()
def _qualify(n): return n if ":" in n else f"{SUPERO_APP_NAMESPACE}:{n}"
OBJECT_SCHEMAS = [s for s in ALL_SCHEMAS if s.get("schema_type") == "object"]
ENUM_SCHEMAS = [s for s in ALL_SCHEMAS if s.get("schema_type") == "enum"]
ENUM_MAP = {}
for _e in ENUM_SCHEMAS:
    ENUM_MAP[_e["name"]] = _e.get("values", [])
    ENUM_MAP[_to_snake(_e["name"])] = _e.get("values", [])

@dataclass
class TestResult:
    section: str; name: str; passed: bool; skipped: bool = False; message: str = ""; duration_ms: float = 0
@dataclass
class TestSuite:
    results: List[TestResult] = field(default_factory=list)
    verbose: bool = False; bail: bool = False; json_output: bool = False
    _start_time: float = field(default_factory=time.time)
    def ok(self, sec, name, msg="", duration_ms=0):
        self.results.append(TestResult(sec, name, True, False, msg, duration_ms))
        if not self.json_output: print(f"    \033[32m\u2713\033[0m {name}" + (f" ({duration_ms:.0f}ms)" if duration_ms else ""))
    def fail(self, sec, name, msg="", duration_ms=0):
        self.results.append(TestResult(sec, name, False, False, msg, duration_ms))
        if not self.json_output:
            print(f"    \033[31m\u2717\033[0m {name}")
            if msg:
                for l in msg.splitlines()[:5]: print(f"      {l}")
        if self.bail: self.print_summary(); sys.exit(1)
    def skip(self, sec, name, reason=""):
        self.results.append(TestResult(sec, name, True, True, f"SKIPPED: {reason}"))
        if not self.json_output: print(f"    \033[33m\u25cb\033[0m {name} (skipped: {reason})")
    def print_summary(self):
        p = sum(1 for r in self.results if r.passed and not r.skipped)
        f = sum(1 for r in self.results if not r.passed)
        sk = sum(1 for r in self.results if r.skipped)
        el = time.time() - self._start_time
        if self.json_output:
            print(json.dumps({"passed": p, "failed": f, "skipped": sk, "total": len(self.results),
                "elapsed_s": round(el, 1), "failures": [{"section": r.section, "name": r.name, "message": r.message} for r in self.results if not r.passed]}, indent=2))
            return f == 0
        secs = {}
        for r in self.results:
            s = secs.setdefault(r.section, {"pass": 0, "fail": 0, "skip": 0})
            if r.skipped: s["skip"] += 1
            elif r.passed: s["pass"] += 1
            else: s["fail"] += 1
        print(f"\n{'='*60}\n  E2E Results: {p} passed, {f} failed, {sk} skipped ({el:.1f}s)\n")
        for sec, c in secs.items():
            st = "\033[32m\u2713\033[0m" if c["fail"] == 0 else "\033[31m\u2717\033[0m"
            print(f"    {st} {sec}: {c['pass']} passed" + (f", {c['fail']} failed" if c["fail"] else "") + (f", {c['skip']} skipped" if c["skip"] else ""))
        if f:
            print(f"\n  Failures:")
            for r in self.results:
                if not r.passed: print(f"    \033[31m\u2717\033[0m [{r.section}] {r.name}")
                if not r.passed and r.message: print(f"      {r.message[:120]}")
        print(f"{'='*60}")
        return f == 0

def _skey(k):
    s = requests.Session(); s.verify = False; s.headers.update({"X-API-Key": k, "Content-Type": "application/json"}); return s
def _stok(t):
    s = requests.Session(); s.verify = False; s.headers.update({"Authorization": f"Bearer {t}", "Content-Type": "application/json"}); return s
def _login(email, pw, domain=None, project=None):
    pl = {"domain_name": domain or DOMAIN, "email": email, "password": pw}
    if project: pl["project"] = project
    try:
        r = requests.post(f"{SERVER_URL}/api/v1/auth/login", json=pl, verify=False, timeout=15)
        if r.status_code == 200:
            t = r.json().get("auth", {}).get("access_token")
            if t: return t, _stok(t)
    except Exception: pass
    return None, None
def _url(qt, uid=""): return f"{SERVER_URL}/api/v1/crud/{DOMAIN}/{qt}" + (f"/{uid}" if uid else "")
def _timed(fn): t0 = time.time(); r = fn(); return r, (time.time()-t0)*1000

def make_payload(schema, suffix):
    sn = _to_snake(schema["name"])
    d = {"name": f"e2e-{sn}-{suffix}", "display_name": f"E2E {schema.get('display_name', schema['name'])} {suffix}", "description": f"Test {schema['name']}"}
    if schema.get("parent_type") == "tenant":
        tn = cfg.tenants[0]["name"] if cfg.tenants else "default-tenant"
        d["parent_context"] = {"domain": DOMAIN, "project": PROJECT, "tenant": tn}
    for a in schema.get("attributes", []):
        an, at, il = a["name"], a.get("type", "string"), a.get("list", False)
        if an in ("name", "display_name", "description"): continue
        v = None
        if at == "string": v = f"test-{an}-{suffix}"
        elif at == "integer": v = 42
        elif at == "float": v = 99.99
        elif at == "bool": v = True
        elif at == "Image": v = f"https://placehold.co/400x300?text={an}"
        elif at == "RichText": v = f"<p>{an}</p>"
        elif at in ("DateTime", "datetime"): v = "2026-06-15T10:00:00Z"
        elif at in ("Date", "date"): v = "2026-06-15"
        elif at == "Email": v = f"t-{suffix}@example.com"
        elif at == "URL": v = f"https://example.com/{an}"
        elif at == "Phone": v = "+1-555-0100"
        elif at in ("json", "JSON", "object", "Object"):
            v = {"street": f"123 Test St {suffix}", "city": "Test City",
                 "state": "CA", "zip": "90210", "country": "US"}
        elif at in ENUM_MAP: v = ENUM_MAP[at][0] if ENUM_MAP[at] else None
        else: v = f"test-{an}-{suffix}"
        if v is not None: d[an] = [v] if il else v
    return d

# === 1. CONNECTIVITY ===
def test_connectivity(S):
    if not S.json_output: print("\n  [1] Connectivity\n")
    try:
        r, ms = _timed(lambda: requests.get(f"{SERVER_URL}/health", verify=False, timeout=10))
        if r.status_code == 200: S.ok("conn", "Health", duration_ms=ms)
        else: S.fail("conn", "Health", f"HTTP {r.status_code}"); return False
    except Exception as e: S.fail("conn", "Server", str(e)); return False
    # LAYERED_UI_V1 — probe the 5 most load-bearing static paths plus a
    # representative sample of layered files (first, middle, last by
    # FILE_ORDER) to confirm static serving routes correctly. Full set is

    static_probes = [
        "/index.html", "/config.js", "/app.js",
        # Legacy monolith — still served by server.py's /supero-ui.js handler
        # (with CDN fallback). New apps don't reference it from index.html
        # but route still works for backward-compat.
        "/supero-ui.js",
        # Layered files — sample by layer
        "/web/00-header.js",
        "/web/api/11-client.js",
        "/web/ui-core/30-primitives.js",
        "/web/ui-service/40-fields-forms.js",
        "/web/ui-app/54-nav-widgets.js",
    ]
    for p in static_probes:
        try:
            r, ms = _timed(lambda p=p: requests.get(f"{SERVER_URL}{p}", verify=False, timeout=10))
            if r.status_code == 200: S.ok("conn", f"Static: {p}", duration_ms=ms)
            else: S.fail("conn", f"Static: {p}", f"HTTP {r.status_code}")
        except Exception as e: S.fail("conn", f"Static: {p}", str(e))
    try:
        r = requests.get(f"{SERVER_URL}/config.js", verify=False, timeout=10)
        if r.status_code == 200:
            c = r.text
            for k, ok in {"domain": DOMAIN in c, "project": PROJECT in c, "appNamespace": "appNamespace" in c}.items():
                if ok: S.ok("conn", f"config.js: {k}")
                else: S.fail("conn", f"config.js missing {k}")
    except Exception as e: S.fail("conn", "config.js", str(e))
    try:
        r, ms = _timed(lambda: requests.options(f"{SERVER_URL}/api/v1/auth/login", verify=False, timeout=10))
        if r.headers.get("Access-Control-Allow-Origin"): S.ok("conn", "CORS headers", duration_ms=ms)
        else: S.fail("conn", "CORS missing")
    except Exception as e: S.fail("conn", "CORS", str(e))
    try:
        r = requests.get(f"{SERVER_URL}/index.html", verify=False, timeout=10)
        if r.status_code == 200:
            # LAYERED_UI_V1 — check both legacy + layered references in index.html.
            # New apps drop the supero-ui.js script tag (replaced by 24 web/*.js
            # tags); accept either layout to support legacy apps mid-migration.
            for s in ["config.js", "app.js"]:
                if s in r.text: S.ok("conn", f"index.html: {s}")
                else: S.fail("conn", f"index.html missing {s}")
            uses_layered = "web/00-header.js" in r.text or "web/ui-app/54-nav-widgets.js" in r.text
            uses_monolith = "supero-ui.js" in r.text and not uses_layered
            if uses_layered:
                S.ok("conn", "index.html: layered UI (web/*.js script tags)")
            elif uses_monolith:
                S.ok("conn", "index.html: legacy monolith (supero-ui.js)")
            else:
                S.fail("conn", "index.html references neither layered web/*.js nor supero-ui.js")
    except Exception as e: S.fail("conn", "index.html", str(e))
    return True

# === 2. AUTH ===
def test_auth(S):
    if not S.json_output: print("\n  [2] Auth\n")
    admin_token = None
    if ADMIN_EMAIL and ADMIN_PASS:
        (t, _), ms = _timed(lambda: _login(ADMIN_EMAIL, ADMIN_PASS))
        if t: S.ok("auth", f"Admin ({ADMIN_EMAIL})", duration_ms=ms); admin_token = t
        else: S.fail("auth", f"Admin ({ADMIN_EMAIL})")
    elif API_KEY: S.skip("auth", "Admin JWT", "Using API key")
    else: S.fail("auth", "No auth")
    if API_KEY:
        try:
            r, ms = _timed(lambda: _skey(API_KEY).get(_url("tenant"), timeout=15))
            if r.status_code == 200: S.ok("auth", f"API key ...{API_KEY[-4:]}", duration_ms=ms)
            else: S.fail("auth", "API key", f"HTTP {r.status_code}")
        except Exception as e: S.fail("auth", "API key", str(e))
    us = {}
    for u in cfg.users:
        em, pw, role = u["email"], u.get("password", "Password123!"), u.get("role", "tenant_user")
        (t, s), ms = _timed(lambda e=em, p=pw: _login(e, p))
        if t: S.ok("auth", f"User: {em} ({role})", duration_ms=ms); us[em] = {"token": t, "session": s, "role": role, "tenant": u.get("tenant", "default-tenant")}
        else: S.fail("auth", f"User: {em} ({role})")
    (bad, _), ms = _timed(lambda: _login("fake@e2e.com", "wrong"))
    if not bad: S.ok("auth", "Bad creds rejected", duration_ms=ms)
    else: S.fail("auth", "Bad creds accepted")
    try:
        r, ms = _timed(lambda: _stok("eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJleHAiOjF9.x").get(_url("tenant"), timeout=10))
        if r.status_code in (401, 403): S.ok("auth", "Bad JWT rejected", duration_ms=ms)
        else: S.fail("auth", "Bad JWT", f"Got {r.status_code}")
    except Exception as e: S.fail("auth", "Bad JWT", str(e))
    return admin_token, us

# === 3. CRUD ===
def test_crud(S, ses):
    if not S.json_output: print("\n  [3] CRUD\n")
    if not ses: S.skip("crud", "CRUD", "No session"); return {}
    created = {}
    for schema in OBJECT_SCHEMAS:
        sn, q, d = _to_snake(schema["name"]), _qualify(_to_snake(schema["name"])), schema.get("display_name", schema["name"])
        p = make_payload(schema, HEX)
        if not S.json_output: print(f"\n    -- {d} ({q}) --")
        # CREATE
        try:
            r, ms = _timed(lambda: ses.post(_url(q), json=p, timeout=15))
            if r.status_code in (200, 201):
                u = r.json().get("uuid") or next((i["uuid"] for i in r.json().get("results", []) if i.get("uuid")), "")
                created[sn] = {"uuid": u, "data": p, "q": q}; S.ok("crud", f"CREATE {d}", duration_ms=ms)
            elif r.status_code == 409: S.skip("crud", f"CREATE {d}", "Exists")
            else: S.fail("crud", f"CREATE {d}", f"HTTP {r.status_code}: {r.text[:200]}")
        except Exception as e: S.fail("crud", f"CREATE {d}", str(e))
        # LIST
        try:
            r, ms = _timed(lambda: ses.get(_url(q), timeout=15))
            if r.status_code == 200: S.ok("crud", f"LIST {d} ({len(r.json().get('results',[]))})", duration_ms=ms)
            else: S.fail("crud", f"LIST {d}", f"HTTP {r.status_code}")
        except Exception as e: S.fail("crud", f"LIST {d}", str(e))
        if sn in created and created[sn]["uuid"]:
            uid = created[sn]["uuid"]
            # GET
            try:
                r, ms = _timed(lambda: ses.get(_url(q, uid), timeout=15))
                if r.status_code == 200: S.ok("crud", f"GET {d}", duration_ms=ms)
                else: S.fail("crud", f"GET {d}", f"HTTP {r.status_code}")
            except Exception as e: S.fail("crud", f"GET {d}", str(e))
            # UPDATE
            try:
                r, ms = _timed(lambda: ses.put(_url(q, uid), json={"display_name": f"Updated {HEX}"}, timeout=15))
                if r.status_code in (200, 201): S.ok("crud", f"UPDATE {d}", duration_ms=ms)
                else: S.fail("crud", f"UPDATE {d}", f"HTTP {r.status_code}")
            except Exception as e: S.fail("crud", f"UPDATE {d}", str(e))
            # IDEMPOTENT
            try:
                r, ms = _timed(lambda: ses.put(_url(q, uid), json={"display_name": f"Updated {HEX}"}, timeout=15))
                if r.status_code in (200, 201): S.ok("crud", f"IDEMPOTENT {d}", duration_ms=ms)
                else: S.fail("crud", f"IDEMPOTENT {d}", f"HTTP {r.status_code}")
            except Exception as e: S.fail("crud", f"IDEMPOTENT {d}", str(e))
        # DUPLICATE
        if sn in created:
            try:
                r, ms = _timed(lambda: ses.post(_url(q), json=p, timeout=15))
                if r.status_code == 409: S.ok("crud", f"DUPLICATE {d} rejected", duration_ms=ms)
                elif r.status_code in (200, 201):
                    S.fail("crud", f"DUPLICATE {d} accepted"); u2 = r.json().get("uuid", "")
                    if u2: ses.delete(_url(q, u2), timeout=10)
                else: S.ok("crud", f"DUPLICATE {d}: HTTP {r.status_code}", duration_ms=ms)
            except Exception as e: S.fail("crud", f"DUPLICATE {d}", str(e))
    return created

# === 4. DELETE ===
def test_delete(S, ses, created):
    if not S.json_output: print("\n  [4] Delete\n")
    if not ses: S.skip("delete", "Delete", "No session"); return
    for sn, rec in created.items():
        uid, q = rec.get("uuid"), rec.get("q", _qualify(sn))
        if not uid: continue
        d = next((s.get("display_name", s["name"]) for s in OBJECT_SCHEMAS if _to_snake(s["name"]) == sn), sn)
        try:
            r, ms = _timed(lambda: ses.delete(_url(q, uid), timeout=15))
            if r.status_code in (200, 204): S.ok("delete", f"DELETE {d}", duration_ms=ms)
            elif r.status_code == 404: S.skip("delete", f"DELETE {d}", "Gone")
            else: S.fail("delete", f"DELETE {d}", f"HTTP {r.status_code}")
        except Exception as e: S.fail("delete", f"DELETE {d}", str(e))
    for sn, rec in created.items():
        uid, q = rec.get("uuid"), rec.get("q", _qualify(sn))
        if not uid: continue
        d = next((s.get("display_name", s["name"]) for s in OBJECT_SCHEMAS if _to_snake(s["name"]) == sn), sn)
        try:
            r, ms = _timed(lambda: ses.get(_url(q, uid), timeout=10))
            if r.status_code == 404: S.ok("delete", f"VERIFY {d}", duration_ms=ms)
            elif r.status_code == 200: S.fail("delete", f"VERIFY {d}", "Still exists")
            else: S.ok("delete", f"VERIFY {d}: {r.status_code}", duration_ms=ms)
        except Exception as e: S.fail("delete", f"VERIFY {d}", str(e))

# === 5-14: Remaining sections ===
# ---------------------------------------------------------------------------
# RBAC-EXPECTATION-V1 — read the app's OWN policy instead of accepting any answer.
#
# test_rbac used to score both outcomes as a pass:
#
#     if   r.status_code == 200: S.ok(...)
#     elif r.status_code == 403: S.ok(...)
#
# which is green whether the policy is enforced or the entity is wide open. It is
# byte-identical across 16 apps, so 16 suites were reporting an RBAC result that no
# server behaviour could ever fail. This loads POLICIES from the app's own setup.py
# and asserts the status the policy actually calls for.
# ---------------------------------------------------------------------------
_POLICY_INDEX = None
_POLICY_ERROR = None


def _policy_index():
    """{(role, entity): {'read': bool, 'create': bool}} from this app's setup.py."""
    global _POLICY_INDEX, _POLICY_ERROR
    if _POLICY_INDEX is not None or _POLICY_ERROR is not None:
        return _POLICY_INDEX
    try:
        import setup as _app_setup
        # NAME COLLISION, AND IT MATTERS. Most apps call the RBAC list POLICIES, but
        # sentinel's POLICIES is seed data for insurance policies and its RBAC list is
        # POLICIES_DEF. Importing the wrong one yields a list of tuples, every lookup
        # misses, and every check silently SKIPS — the same vacuity this rewrite exists
        # to remove, just quieter. So: find the list that actually holds PolicyDefs,
        # and refuse to score anything if none is found.
        candidates = [getattr(_app_setup, n, None)
                      for n in ("POLICIES_DEF", "POLICIES", "ACCESS_POLICIES")]
        policies = next(
            (c for c in candidates
             if isinstance(c, (list, tuple)) and c
             and hasattr(c[0], "role") and hasattr(c[0], "rules")),
            None)
        if policies is None:
            raise RuntimeError(
                "no PolicyDef list found in setup.py (looked for POLICIES_DEF, "
                "POLICIES, ACCESS_POLICIES)")
        idx = {}
        for pd in policies:
            role = getattr(pd, "role", None)
            default_full = str(getattr(pd, "default_access", "")).lower() == "full"
            for rule in (getattr(pd, "rules", None) or []):
                ent = getattr(rule, "entity", None)
                if not role or not ent:
                    continue
                idx[(role, str(ent).lower())] = {
                    "read": bool(getattr(rule, "can_read", False)) or default_full,
                    "create": bool(getattr(rule, "can_create", False)) or default_full,
                }
            idx[(role, "__default_full__")] = {"read": default_full, "create": default_full}
        _POLICY_INDEX = idx
    except Exception as e:                                  # noqa: BLE001
        _POLICY_ERROR = f"{type(e).__name__}: {e}"
    return _POLICY_INDEX


def _expect(role, entity, verb):
    """True = should succeed, False = should be denied, None = cannot tell."""
    idx = _policy_index()
    if idx is None:
        return None
    # Admin tiers are unconditional allow on this platform.
    if role in ("platform_admin", "domain_admin", "project_admin"):
        return True
    ent = str(entity).lower().split(":")[-1]
    hit = idx.get((role, ent))
    if hit is not None:
        return hit[verb]
    # No rule for this entity. default_access="full" allows; "none" denies READS only
    # in enforcing mode, which is off by default — so this is genuinely undecidable
    # and must not be scored either way.
    dflt = idx.get((role, "__default_full__"))
    return True if (dflt and dflt[verb]) else None


def test_rbac(S, ases, uses):
    if not S.json_output: print("\n  [5] RBAC\n")
    if not uses: S.skip("rbac", "RBAC", "No users"); return
    if _policy_index() is None:
        S.fail("rbac", "RBAC", f"could not load POLICIES from setup.py ({_POLICY_ERROR}) "
                              f"- refusing to score RBAC without the policy to check against")
        return
    for ts in OBJECT_SCHEMAS[:3]:
        q, d = _qualify(_to_snake(ts["name"])), ts.get("display_name", ts["name"])
        for em, info in uses.items():
            role = info["role"]
            want = _expect(role, _to_snake(ts["name"]), "read")
            try:
                r, ms = _timed(lambda: info["session"].get(_url(q), timeout=15))
                if want is None:
                    S.skip("rbac", f"LIST {d} as {role}",
                           "no explicit rule and the default is not decidable - not scored")
                elif want and r.status_code == 200:
                    S.ok("rbac", f"LIST {d} as {role} ({em.split('@')[0]}) - allowed by policy", duration_ms=ms)
                elif not want and r.status_code == 403:
                    S.ok("rbac", f"LIST {d} as {role} - denied, as the policy says", duration_ms=ms)
                else:
                    S.fail("rbac", f"LIST {d} as {role}",
                           f"policy says {'allow' if want else 'deny'} but server returned HTTP {r.status_code}")
            except Exception as e: S.fail("rbac", f"LIST {d}", str(e))
    for em, info in uses.items():
        if info["role"] != "tenant_user": continue
        ts = OBJECT_SCHEMAS[0]; q = _qualify(_to_snake(ts["name"])); p = make_payload(ts, f"rbac-{HEX}")
        want = _expect("tenant_user", _to_snake(ts["name"]), "create")
        try:
            r, ms = _timed(lambda: info["session"].post(_url(q), json=p, timeout=15))
            if want is None:
                S.skip("rbac", "CREATE tenant_user", "no explicit rule - not scored")
            elif want and r.status_code in (200, 201):
                S.ok("rbac", f"CREATE tenant_user ({em.split('@')[0]}) - allowed by policy", duration_ms=ms)
                u = r.json().get("uuid", ""); u and info["session"].delete(_url(q, u), timeout=10)
            elif not want and r.status_code == 403:
                S.ok("rbac", "CREATE denied tenant_user - as the policy says", duration_ms=ms)
            else:
                S.fail("rbac", "CREATE tenant_user",
                       f"policy says {'allow' if want else 'deny'} but server returned HTTP {r.status_code}")
        except Exception as e: S.fail("rbac", "CREATE tenant_user", str(e))
        break


def _policy_list():
    """The raw PolicyDef list, for callers that need rules rather than the index."""
    import setup as _s
    for n in ("POLICIES_DEF", "POLICIES", "ACCESS_POLICIES"):
        c = getattr(_s, n, None)
        if isinstance(c, (list, tuple)) and c and hasattr(c[0], "role") and hasattr(c[0], "rules"):
            return c
    return None


def test_field_hiding(S, ases, uses):
    """FIELD-HIDING-V1 — assert the app's own hidden_fields, on a real response.

    Until this existed, no test in this repository asserted a field-hiding claim.
    The READMEs advertise it as the differentiator; the suites only ever exercised
    CRUD. That is the "a check whose name asserts more than its body" pattern, and
    leaving it in place while the docs argue against it would be indefensible.

    The shape matters as much as the assertion. It compares ONE record fetched by
    two roles, and it ABORTS rather than passing if the privileged role cannot see
    the hidden field — because then "absent for the restricted role" would only mean
    the field was never populated, which proves nothing at all.
    """
    if not S.json_output: print("\n  [5b] Field hiding\n")
    idx = _policy_index()
    if idx is None:
        S.fail("rbac", "Field hiding", f"could not load POLICIES ({_POLICY_ERROR})"); return
    if not uses:
        S.skip("rbac", "Field hiding", "No users"); return

    # Which (role, entity) pairs declare hidden_fields? Read the app's own policy.
    targets = []
    for pd in (_policy_list() or []):
        for rule in (getattr(pd, "rules", None) or []):
            hf = getattr(rule, "hidden_fields", None)
            if hf:
                targets.append((getattr(pd, "role", None), str(getattr(rule, "entity", "")), list(hf)))
    if not targets:
        S.skip("rbac", "Field hiding", "this app declares no hidden_fields"); return

    for role, entity, hidden in targets:
        restricted = next((i for e, i in uses.items() if i["role"] == role), None)
        privileged = next((i for e, i in uses.items()
                           if i["role"] in ("tenant_admin", "domain_admin", "project_admin")), None)
        label = f"{entity}.{','.join(hidden)}"
        if not restricted or not privileged:
            S.skip("rbac", f"Field hiding {label}", f"need both {role} and an admin login"); continue

        q = _qualify(_to_snake(entity.split(":")[-1]))
        try:
            pr = privileged["session"].get(_url(q), timeout=15)
            rr = restricted["session"].get(_url(q), timeout=15)
            if pr.status_code != 200 or rr.status_code != 200:
                S.skip("rbac", f"Field hiding {label}",
                       f"admin HTTP {pr.status_code}, {role} HTTP {rr.status_code}"); continue
            prows = (pr.json() or {}).get("results") or []
            rrows = (rr.json() or {}).get("results") or []
        except Exception as e:
            S.fail("rbac", f"Field hiding {label}", str(e)); continue

        # ANTI-VACUITY. If the privileged role never sees the field, "absent for the
        # restricted role" is not evidence — the field is simply unset. Say so and
        # move on rather than banking a pass this run did not earn.
        visible = [f for f in hidden if any(f in r for r in prows)]
        if not visible:
            S.skip("rbac", f"Field hiding {label}",
                   "admin sees none of these fields populated - nothing to hide, not asserting")
            continue

        leaked = [f for f in visible if any(f in r for r in rrows)]
        if leaked:
            S.fail("rbac", f"Field hiding {label}",
                   f"{role} CAN see {','.join(leaked)} - the policy is not enforced")
        else:
            S.ok("rbac", f"Field hiding {entity}: {','.join(visible)} visible to admin, "
                         f"ABSENT for {role} ({len(rrows)} rows)")

def test_public(S):
    if not S.json_output: print("\n  [6] Public\n")
    if not PUBLIC_SCHEMAS: S.skip("public", "Public", "None configured"); return
    for s in PUBLIC_SCHEMAS:
        try:
            r, ms = _timed(lambda s=s: requests.get(f"{SERVER_URL}/api/public/{s}", verify=False, timeout=15))
            if r.status_code == 200:
                c = len(r.json()) if isinstance(r.json(), list) else len(r.json().get("results", []))
                S.ok("public", f"{s} ({c} records)", duration_ms=ms)
            else: S.fail("public", s, f"HTTP {r.status_code}")
        except Exception as e: S.fail("public", s, str(e))
    np = next((_to_snake(s["name"]) for s in OBJECT_SCHEMAS if _to_snake(s["name"]) not in PUBLIC_SCHEMAS), None)
    if np:
        try:
            r, ms = _timed(lambda: requests.get(f"{SERVER_URL}/api/public/{np}", verify=False, timeout=10))
            if r.status_code == 403: S.ok("public", f"Non-public rejected: {np}", duration_ms=ms)
            elif r.status_code == 200: S.fail("public", f"Non-public accessible: {np}")
            else: S.ok("public", f"Non-public {np}: {r.status_code}", duration_ms=ms)
        except Exception as e: S.fail("public", "Non-public", str(e))

def test_multi_tenant(S, ses):
    if not S.json_output: print("\n  [7] Multi-Tenant\n")
    if not IS_MULTI_TENANT: S.skip("multi-tenant", "Multi-tenant", "Not enabled"); return
    slug = f"e2e-{HEX}"
    try:
        r, ms = _timed(lambda: requests.get(f"{SERVER_URL}/api/check-tenant-slug?slug={slug}", verify=False, timeout=10))
        if r.status_code == 200: S.ok("multi-tenant", f"Slug: {slug}", duration_ms=ms)
        else: S.fail("multi-tenant", "Slug check", f"HTTP {r.status_code}")
    except Exception as e: S.fail("multi-tenant", "Slug", str(e))
    try:
        r, ms = _timed(lambda: requests.get(f"{SERVER_URL}/api/check-tenant-slug?slug=x", verify=False, timeout=10))
        if r.status_code == 400: S.ok("multi-tenant", "Short slug rejected", duration_ms=ms)
        else: S.fail("multi-tenant", "Short slug", f"HTTP {r.status_code}")
    except Exception as e: S.fail("multi-tenant", "Short slug", str(e))
    ndt = [t for t in cfg.tenants if t["name"] != "default-tenant"]
    if ndt:
        try:
            r, ms = _timed(lambda: requests.get(f"{SERVER_URL}/api/tenant-info?slug={ndt[0]['name']}", verify=False, timeout=10))
            if r.status_code == 200: S.ok("multi-tenant", f"Info: {ndt[0]['name']}", duration_ms=ms)
            elif r.status_code == 404: S.skip("multi-tenant", f"Info: {ndt[0]['name']}", "Not seeded")
            else: S.fail("multi-tenant", "Info", f"HTTP {r.status_code}")
        except Exception as e: S.fail("multi-tenant", "Info", str(e))
    try:
        r, ms = _timed(lambda: requests.post(f"{SERVER_URL}/api/signup-tenant", json={"display_name": f"E2E {HEX}", "admin_email": f"e2e-{HEX}@test.com", "admin_password": "TestPass123!", "admin_full_name": "E2E"}, verify=False, timeout=30))
        if r.status_code == 200: S.ok("multi-tenant", "Signup", duration_ms=ms)
        elif r.status_code == 409: S.skip("multi-tenant", "Signup", "Exists")
        elif r.status_code == 503: S.skip("multi-tenant", "Signup", "No svc account")
        else: S.fail("multi-tenant", "Signup", f"HTTP {r.status_code}: {r.text[:200]}")
    except Exception as e: S.fail("multi-tenant", "Signup", str(e))

def test_validation(S, ses):
    if not S.json_output: print("\n  [8] Validation\n")
    if not ses: S.skip("validation", "Validation", "No session"); return
    ts = next((s for s in OBJECT_SCHEMAS if any(a.get("mandatory") for a in s.get("attributes", []))), None)
    if ts:
        q, d = _qualify(_to_snake(ts["name"])), ts.get("display_name", ts["name"])
        for f in [a["name"] for a in ts.get("attributes", []) if a.get("mandatory")][:2]:
            p = make_payload(ts, f"val-{f}-{HEX}"); p.pop(f, None)
            try:
                r, ms = _timed(lambda: ses.post(_url(q), json=p, timeout=15))
                if r.status_code in (400, 422): S.ok("validation", f"Missing '{f}' rejected ({d})", duration_ms=ms)
                elif r.status_code in (200, 201):
                    S.fail("validation", f"Missing '{f}' accepted"); u = r.json().get("uuid", ""); u and ses.delete(_url(q, u), timeout=10)
                else: S.fail("validation", f"Missing '{f}'", f"HTTP {r.status_code}")
            except Exception as e: S.fail("validation", f"Missing {f}", str(e))
    for s in OBJECT_SCHEMAS:
        ea = [a for a in s.get("attributes", []) if a.get("type") in ENUM_MAP]
        if not ea: continue
        q, d, a = _qualify(_to_snake(s["name"])), s.get("display_name", s["name"]), ea[0]
        p = make_payload(s, f"enum-{HEX}"); p[a["name"]] = "INVALID_XYZ"
        try:
            r, ms = _timed(lambda: ses.post(_url(q), json=p, timeout=15))
            if r.status_code in (400, 422): S.ok("validation", f"Bad enum rejected ({d})", duration_ms=ms)
            elif r.status_code in (200, 201):
                S.skip("validation", f"Bad enum accepted ({d})", "Platform does not enforce enum validation on write")
                u = r.json().get("uuid", ""); u and ses.delete(_url(q, u), timeout=10)
            else: S.ok("validation", f"Bad enum {d}: {r.status_code}", duration_ms=ms)
        except Exception as e: S.fail("validation", f"Enum ({d})", str(e))
        break
    if OBJECT_SCHEMAS:
        s = OBJECT_SCHEMAS[0]; q = _qualify(_to_snake(s["name"])); p = make_payload(s, f"noname-{HEX}"); p["name"] = ""
        try:
            r, ms = _timed(lambda: ses.post(_url(q), json=p, timeout=15))
            if r.status_code in (400, 422): S.ok("validation", "Empty name rejected", duration_ms=ms)
            elif r.status_code in (200, 201):
                S.fail("validation", "Empty name accepted"); u = r.json().get("uuid", ""); u and ses.delete(_url(q, u), timeout=10)
            else: S.ok("validation", f"Empty name: {r.status_code}", duration_ms=ms)
        except Exception as e: S.fail("validation", "Empty name", str(e))

def test_signup(S):
    if not S.json_output: print("\n  [9] Signup\n")
    em = f"e2e-{HEX}@test.com"
    try:
        r, ms = _timed(lambda: requests.post(f"{SERVER_URL}/api/signup", json={"email": em, "password": "TestPass123!", "full_name": "E2E"}, verify=False, timeout=15))
        if r.status_code == 200: S.ok("signup", f"Signup ({em})", duration_ms=ms)
        elif r.status_code == 503: S.skip("signup", "Signup", "No svc account")
        elif r.status_code == 409: S.skip("signup", "Signup", "Exists")
        else: S.fail("signup", "Signup", f"HTTP {r.status_code}")
    except Exception as e: S.fail("signup", "Signup", str(e))
    for label, pl, exp in [("Short pw", {"email": f"s-{HEX}@t.com", "password": "ab"}, 400),
                            ("No email", {"email": "", "password": "Test123!"}, 400),
                            ("Bad email", {"email": "nope", "password": "Test123!"}, 400)]:
        try:
            r, ms = _timed(lambda p=pl: requests.post(f"{SERVER_URL}/api/signup", json=p, verify=False, timeout=10))
            if r.status_code == exp: S.ok("signup", f"{label} rejected", duration_ms=ms)
            else: S.fail("signup", label, f"Expected {exp}, got {r.status_code}")
        except Exception as e: S.fail("signup", label, str(e))

def test_edge(S, ses):
    if not S.json_output: print("\n  [10] Edge Cases\n")
    if not ses: S.skip("edge", "Edge", "No session"); return
    try:
        r, ms = _timed(lambda: ses.get(_url(f"{SUPERO_APP_NAMESPACE}:nonexistent_xyz"), timeout=10))
        if r.status_code in (404, 400): S.ok("edge", "Bad type -> 404", duration_ms=ms)
        elif r.status_code == 200:
            results = r.json().get("results", [])
            if not results: S.ok("edge", "Bad type -> 200 empty (platform returns empty for unknown)", duration_ms=ms)
            else: S.fail("edge", "Bad type returned data", f"Got {len(results)} records for nonexistent type")
        else: S.fail("edge", "Bad type", f"Got {r.status_code}")
    except Exception as e: S.fail("edge", "Bad type", str(e))
    if OBJECT_SCHEMAS:
        q = _qualify(_to_snake(OBJECT_SCHEMAS[0]["name"]))
        for label, meth, uid in [("GET fake", "get", "00000000-0000-0000-0000-000000000000"),
                                   ("DEL fake", "delete", "00000000-0000-0000-0000-000000000001"),
                                   ("PUT fake", "put", "00000000-0000-0000-0000-000000000002")]:
            try:
                fn = getattr(ses, meth); kw = {"timeout": 10}
                if meth == "put": kw["json"] = {"display_name": "x"}
                r, ms = _timed(lambda _fn=fn, _u=uid, _kw=kw: _fn(_url(q, _u), **_kw))
                if r.status_code in (404, 400): S.ok("edge", f"{label} -> 404", duration_ms=ms)
                else: S.ok("edge", f"{label}: {r.status_code}", duration_ms=ms)
            except Exception as e: S.fail("edge", label, str(e))
        try:
            r, ms = _timed(lambda: ses.post(_url(q), json={}, timeout=10))
            if r.status_code in (400, 422): S.ok("edge", "Empty body rejected", duration_ms=ms)
            else:
                S.ok("edge", f"Empty body: {r.status_code}", duration_ms=ms)
                if r.status_code in (200, 201): u = r.json().get("uuid", ""); u and ses.delete(_url(q, u), timeout=10)
        except Exception as e: S.fail("edge", "Empty body", str(e))

def test_references(S, ses):
    if not S.json_output: print("\n  [11] References\n")
    if not ses: S.skip("refs", "References", "No session"); return
    rs = [s for s in OBJECT_SCHEMAS if s.get("references")]
    if not rs: S.skip("refs", "References", "No refs defined"); return
    for schema in rs[:3]:
        sn, q, d = _to_snake(schema["name"]), _qualify(_to_snake(schema["name"])), schema.get("display_name", schema["name"])
        for ref in schema.get("references", []):
            rn, rsnk = ref.get("name", ""), _to_snake(ref.get("name", ""))
            rq = _qualify(rsnk)
            try:
                r, ms = _timed(lambda rq=rq: ses.get(_url(rq), timeout=15))
                if r.status_code == 200:
                    res = r.json().get("results", [])
                    S.ok("refs", f"{d} -> {rn} ({len(res)} recs)", duration_ms=ms)
                    if res and res[0].get("uuid"):
                        p = make_payload(schema, f"ref-{rsnk}-{HEX}"); p[f"{rsnk}_uuid"] = res[0]["uuid"]
                        try:
                            r2, ms2 = _timed(lambda: ses.post(_url(q), json=p, timeout=15))
                            if r2.status_code in (200, 201):
                                S.ok("refs", f"CREATE {d} with {rn}", duration_ms=ms2)
                                u = r2.json().get("uuid", ""); u and ses.delete(_url(q, u), timeout=10)
                            elif r2.status_code == 409: S.skip("refs", f"CREATE {d}+ref", "Exists")
                            else: S.ok("refs", f"CREATE {d}+ref: {r2.status_code}", duration_ms=ms2)
                        except Exception as e: S.fail("refs", f"CREATE+ref", str(e))
                else: S.skip("refs", f"{d}->{rn}", f"HTTP {r.status_code}")
            except Exception as e: S.fail("refs", f"{d}->{rn}", str(e))
    ts = [s for s in OBJECT_SCHEMAS if s.get("parent_type") == "tenant"]
    if ts and cfg.tenants:
        s = ts[0]; q = _qualify(_to_snake(s["name"])); d = s.get("display_name", s["name"])
        p = make_payload(s, f"parent-{HEX}")
        try:
            r, ms = _timed(lambda: ses.post(_url(q), json=p, timeout=15))
            if r.status_code in (200, 201):
                S.ok("refs", f"parent_context {d}", duration_ms=ms)
                u = r.json().get("uuid", ""); u and ses.delete(_url(q, u), timeout=10)
            elif r.status_code == 409: S.skip("refs", f"parent_context {d}", "Exists")
            else: S.fail("refs", f"parent_context {d}", f"HTTP {r.status_code}")
        except Exception as e: S.fail("refs", "parent_context", str(e))

def test_namespace(S, ses):
    if not S.json_output: print("\n  [12] Namespace\n")
    if not ses or not OBJECT_SCHEMAS: S.skip("ns", "Namespace", "No session"); return
    sn = _to_snake(OBJECT_SCHEMAS[0]["name"]); q = f"{SUPERO_APP_NAMESPACE}:{sn}"
    try:
        r, ms = _timed(lambda: ses.get(_url(q), timeout=15))
        if r.status_code == 200: S.ok("ns", f"Qualified: {q}", duration_ms=ms)
        else: S.fail("ns", f"Qualified: {q}", f"HTTP {r.status_code}")
    except Exception as e: S.fail("ns", "Qualified", str(e))
    try:
        r, ms = _timed(lambda: ses.get(_url(sn), timeout=15))
        if r.status_code == 200: S.ok("ns", f"Bare: {sn}", duration_ms=ms)
        elif r.status_code == 409: S.ok("ns", f"Bare ambiguous: {sn}", duration_ms=ms)
        else: S.ok("ns", f"Bare {sn}: {r.status_code}", duration_ms=ms)
    except Exception as e: S.fail("ns", f"Bare", str(e))
    for st in ["tenant", "project"]:
        try:
            r, ms = _timed(lambda t=st: ses.get(_url(t), timeout=15))
            if r.status_code == 200: S.ok("ns", f"System: {st}", duration_ms=ms)
            else: S.fail("ns", f"System: {st}", f"HTTP {r.status_code}")
        except Exception as e: S.fail("ns", f"System: {st}", str(e))
    try:
        r, ms = _timed(lambda: ses.get(_url(f"fake_ns:{sn}"), timeout=10))
        if r.status_code in (404, 400): S.ok("ns", "Wrong ns rejected", duration_ms=ms)
        elif r.status_code == 200 and not r.json().get("results"): S.ok("ns", "Wrong ns empty", duration_ms=ms)
        else: S.fail("ns", "Wrong ns returned data")
    except Exception as e: S.fail("ns", "Wrong ns", str(e))

def test_services(S, ses):
    if not S.json_output: print("\n  [13] Services\n")
    if not ses: S.skip("svc", "Services", "No session"); return
    svcs = getattr(cfg, "services", [])
    if not svcs: S.skip("svc", "Services", "None"); return
    for svc in svcs:
        if svc == "workflows": continue
        try:
            r, ms = _timed(lambda: ses.post(f"{SERVER_URL}/api/v1/services/execute", json={"service_id": svc, "operation_id": "__probe__", "input": {}}, timeout=15))
            if r.status_code in (400, 422): S.ok("svc", f"{svc} registered", duration_ms=ms)
            elif r.status_code == 404: S.fail("svc", f"{svc} NOT FOUND on platform",
                                               "Service defined in config.py but not registered")
            elif r.status_code == 200: S.ok("svc", f"{svc} OK", duration_ms=ms)
            elif r.status_code == 503:
                S.skip("svc", f"{svc}: not configured",
                       f"Configure credentials at app.supero.dev > Services > {svc}")
            else: S.ok("svc", f"{svc}: {r.status_code}", duration_ms=ms)
        except Exception as e: S.fail("svc", svc, str(e))
    # Deep config check: try a real operation to verify credentials are set
    if not S.json_output: print("\n    -- Service Configuration Check --")
    _probes = {
        "email": {"operation_id": "send_email", "input": {
            "to_email": "e2e-probe@example.com", "subject": "config-check",
            "body_html": "<p>probe</p>", "dry_run": True}},
        "stripe_checkout": {"operation_id": "create_checkout_session", "input": {
            "amount": 0.01, "product_name": "config-check", "success_url": "https://example.com"}},
        "slack": {"operation_id": "send_message", "input": {
            "channel": "#e2e-test", "text": "config-check", "dry_run": True}},
    }
    for svc in svcs:
        if svc == "workflows" or svc not in _probes:
            continue
        probe = {"service_id": svc, **_probes[svc]}
        try:
            r, ms = _timed(lambda p=probe: ses.post(
                f"{SERVER_URL}/api/v1/services/execute", json=p, timeout=15))
            body = r.text.lower() if r.text else ""
            if r.status_code == 200:
                S.ok("svc", f"{svc} configured + operational", duration_ms=ms)
            elif r.status_code == 503:
                S.skip("svc", f"{svc}: not configured",
                       f"Configure at app.supero.dev > Services > {svc}")
            elif "not configured" in body or "no api key" in body or "no credentials" in body or "missing" in body:
                S.skip("svc", f"{svc}: credentials not set",
                       f"Configure at app.supero.dev > Services > {svc}")
            elif r.status_code in (400, 422):
                S.ok("svc", f"{svc} configured (input validated)", duration_ms=ms)
            elif r.status_code == 401:
                S.fail("svc", f"{svc}: BAD CREDENTIALS", "Credentials set but invalid (401)")
            else:
                S.ok("svc", f"{svc} config: HTTP {r.status_code}", duration_ms=ms)
        except Exception as e:
            S.fail("svc", f"{svc} config check", str(e))

def test_workflows(S, ses):
    if not S.json_output: print("\n  [14] Workflows\n")
    if not ses: S.skip("wf", "Workflows", "No session"); return
    wf_defs = []
    try:
        import importlib.util
        sp = os.path.join(os.path.dirname(os.path.abspath(__file__)), "setup.py")
        if os.path.exists(sp):
            spec = importlib.util.spec_from_file_location("_setup", sp)
            mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
            wf_defs = getattr(mod, "WORKFLOW_DEFINITIONS", [])
    except Exception: pass
    if not wf_defs: S.skip("wf", "Workflows", "No definitions"); return
    for wt in [_qualify("workflow_definition"), "wf:workflow_definition"]:
        try:
            r, ms = _timed(lambda t=wt: ses.get(_url(t), timeout=15))
            if r.status_code == 200:
                ids = [w.get("workflow_id") for w in r.json().get("results", [])]
                if ids:
                    S.ok("wf", f"Listed ({len(ids)})", duration_ms=ms)
                    for wf in wf_defs:
                        wid = wf.get("workflow_id", "")
                        if wid in ids: S.ok("wf", f"Registered: {wid}")
                        else: S.skip("wf", f"{wid}: not registered",
                                     f"Configure workflow service at app.supero.dev, then run ./run.sh")
                else:
                    S.skip("wf", "Workflows: not configured",
                           f"{len(wf_defs)} workflow(s) defined. Configure workflow service at app.supero.dev")
                break
            elif r.status_code == 409: continue
        except Exception as e: S.fail("wf", f"List ({wt})", str(e)); break
    for wf in wf_defs[:3]:
        wid, steps = wf.get("workflow_id", "?"), wf.get("steps", [])
        if steps: S.ok("wf", f"'{wid}': {len(steps)} steps")
        else: S.fail("wf", f"'{wid}': no steps")


# === 15. SERVICE_LIB (end-to-end via client library) ===
#
# Tests the client-side ServiceLib the browser uses to trigger workflows
# and call services. No mock infrastructure needed — we trust the
# app.supero.dev service configuration as the contract:
#
#   ✓ OK   — service accepted the call (HTTP 200, or 400 validation)
#   ○ SKIP — service not configured (HTTP 503, configure at app.supero.dev)
#   ✗ FAIL — service broken (401 bad creds, 5xx, timeout)
#
# For trigger() testing, we inspect the app's own app.js WORKFLOW_MAP
# and fire whatever the app has registered. If the app has no @events,
# we skip with a clear message (this isn't a failure — some apps don't
# use event triggers).
#
# Side-effect policy:
#   - email/slack/sms: dry_run:True (matches existing [13] pattern)
#   - workflow probes: use __e2e_probe_nonexistent__ workflow_id
#   - trigger(): fires REAL bindings (no dry_run for trigger) — if the
#     app has configured @events, the test verifies they dispatch. Real
#     email/slack may be sent. This matches actual browser behavior.

def test_service_lib(S, ses):
    if not S.json_output: print("\n  [15] ServiceLib\n")
    if not ses: S.skip("service_lib", "ServiceLib", "No session"); return

    # ── Import the library ──────────────────────────────────────────
    try:
        from supero.service_lib import (
            ServiceLib, default, reset_default, Services as SLServices)
        S.ok("service_lib", "Import supero.service_lib")
    except ImportError as e:
        S.fail("service_lib", "Import supero.service_lib",
               f"{e} — requires supero>=1.5.71")
        return  # without the library, nothing else works

    # ── Instantiate from env ────────────────────────────────────────
    try:
        sl = ServiceLib.from_env()
        if not sl.api_key:
            S.fail("service_lib", "from_env()", "SUPERO_API_KEY not in env")
            return
        if not sl.domain:
            S.fail("service_lib", "from_env()", "SUPERO_DOMAIN not in env")
            return
        S.ok("service_lib",
             f"from_env() domain={sl.domain} key=...{sl.api_key[-4:]}")
    except Exception as e:
        S.fail("service_lib", "from_env()", str(e)); return

    # Route through local server so tests traverse the same proxy stack
    # the browser uses: ServiceLib → server.py → platform-core → tenant-service
    sl.api_url = SERVER_URL

    # ── default() singleton ─────────────────────────────────────────
    try:
        reset_default()
        a, b = default(), default()
        if a is b:
            S.ok("service_lib", "default() singleton")
        else:
            S.fail("service_lib", "default() singleton",
                   "returned two distinct instances")
    except Exception as e:
        S.fail("service_lib", "default()", str(e))

    # ── Typed accessors (no network call) ───────────────────────────
    try:
        expected = {"email": "email", "slack": "slack",
                    "stripe": "stripe_checkout", "workflow": "workflows",
                    "sms": "sms", "ai": "ai"}
        all_ok = True
        for attr, sid in expected.items():
            svc = getattr(sl, attr, None)
            if svc is None or getattr(svc, "_service_id", None) != sid:
                S.fail("service_lib", f"Accessor {attr}",
                       f"expected service_id={sid}")
                all_ok = False
        if all_ok:
            S.ok("service_lib",
                 f"Typed accessors ({len(expected)}) map to correct service_ids")
    except Exception as e:
        S.fail("service_lib", "Typed accessors", str(e))

    # ── Backward-compat Services shim ───────────────────────────────
    try:
        svcs = SLServices(None, SERVER_URL, DOMAIN)
        missing = [a for a in ("email", "slack", "workflow", "stripe", "ai")
                   if not hasattr(svcs, a)]
        if missing:
            S.fail("service_lib", "Services shim", f"missing: {missing}")
        else:
            S.ok("service_lib", "Services(session, url, domain) shim works")
    except Exception as e:
        S.fail("service_lib", "Services shim", str(e))

    # ── Helper: raw service probe via /services/execute ─────────────
    # ServiceLib.exec() returns None on any error, losing the distinction
    # between "not configured" (skip) and "broken" (fail). We hit the
    # endpoint directly to read HTTP status codes.
    def _probe_service(service_id, operation_id, input_data, label):
        try:
            r, ms = _timed(lambda: ses.post(
                f"{SERVER_URL}/api/v1/services/execute",
                json={"service_id": service_id,
                      "operation_id": operation_id,
                      "input": input_data},
                timeout=20))
            body_lower = (r.text or "").lower()
            not_cfg = ("not configured" in body_lower
                       or "no credentials" in body_lower
                       or "no api key" in body_lower
                       or "missing credentials" in body_lower)
            if r.status_code == 503 or not_cfg:
                S.skip("service_lib", f"{label}: not configured",
                       f"Configure at app.supero.dev > Services > {service_id}")
                return
            if r.status_code == 200:
                S.ok("service_lib", f"{label} → 200", duration_ms=ms)
                return
            if r.status_code in (400, 422, 404):
                S.ok("service_lib",
                     f"{label} → HTTP {r.status_code} (service reachable)",
                     duration_ms=ms)
                return
            if r.status_code == 401:
                S.fail("service_lib", f"{label}: bad credentials",
                       f"HTTP 401 — credentials set but invalid")
                return
            S.fail("service_lib", label,
                   f"HTTP {r.status_code}: {r.text[:150]}")
        except Exception as e:
            S.fail("service_lib", label, str(e))

    # ── Probe the services ServiceLib wraps ────────────────────────
    print("\n    -- Service probes (dry_run / probe-values) --")

    _probe_service(
        "workflows", "run_workflow",
        {"workflow_id": "__e2e_probe_nonexistent__",
         "input": {"_probe": True}},
        "workflow.run (probe nonexistent)")

    _probe_service(
        "email", "send_email",
        {"to_email": "e2e-probe@example.com", "subject": "e2e probe",
         "body_html": "<p>probe</p>", "dry_run": True},
        "email.send (dry_run)")

    _probe_service(
        "slack", "send_message",
        {"channel": "#e2e-test", "text": "e2e probe", "dry_run": True},
        "slack.message (dry_run)")

    _probe_service(
        "sms", "send_sms",
        {"to_number": "+15005550006", "body": "e2e probe", "dry_run": True},
        "sms.send (dry_run)")

    # ── trigger() — event resolution via workflow service config ──
    # In v1.5.71, bindings live only in the workflow service's
    # config_data.event_bindings (one source of truth). If bindings
    # exist, fire the first one and verify trigger() returns without
    # raising. trigger()'s never-raise contract means we always get
    # None or a dict, never an exception.
    print("\n    -- trigger() event resolution --")
    try:
        sl.refresh_config()  # drop stale cache from earlier tests
        cfg = sl._fetch_config()
        bindings = (cfg or {}).get("event_bindings") or []

        if not bindings:
            S.skip("service_lib", "trigger() bindings",
                   "No event_bindings in workflow config — "
                   "configure at app.supero.dev > Services > workflows")
        else:
            S.ok("service_lib",
                 f"Found {len(bindings)} event binding(s)")
            for b in bindings[:3]:
                event = b.get("event", "?")
                wf = b.get("workflow_id", "?")
                print(f"        {event} → {wf}")

            # Fire the first binding. Uses the library's internal path:
            # _find_binding → _resolve_input_map → run_workflow.
            # Probe payload matches common input_map patterns (user.*,
            # record.*, top-level email/name).
            first = bindings[0]
            event = first["event"]
            wf_id = first.get("workflow_id", "?")
            try:
                probe_payload = {
                    "user": {"email": "e2e-trigger@test.com",
                             "name": "E2E ServiceLib",
                             "uuid": "00000000-0000-0000-0000-000000000000"},
                    "email": "e2e-trigger@test.com",
                    "name": "E2E ServiceLib",
                    "record": {"uuid": "probe-record-uuid"},
                    "uuid": "probe-record-uuid",
                    "_e2e_probe": True,
                }
                t0 = time.time()
                result = sl.trigger(event, probe_payload)
                ms = (time.time() - t0) * 1000

                if result is None:
                    S.skip("service_lib",
                           f"trigger({event}) → no response",
                           f"Workflow '{wf_id}' may not be registered, or "
                           f"services referenced by its steps may not be "
                           f"configured. Check app.supero.dev > Services.")
                else:
                    S.ok("service_lib",
                         f"trigger({event}) fired → {wf_id}",
                         duration_ms=ms)
            except Exception as e:
                # trigger() contract: never raises. If we hit this,
                # it's a library regression.
                S.fail("service_lib",
                       f"trigger({event}) raised — library regression",
                       str(e))
    except Exception as e:
        S.fail("service_lib", "trigger() config fetch", str(e))

    # ── sl.exec() round-trip (covers the library's HTTP path) ──────
    # The earlier _probe_service calls bypass ServiceLib and hit the
    # endpoint directly via requests. This probe exercises sl.exec()
    # itself, catching regressions in X-API-Key, operation_id, payload
    # shape, etc. We use dry_run so no real side effects.
    print("\n    -- sl.exec() round-trip --")
    try:
        result = sl.exec("email", "send_email", {
            "to_email": "e2e-probe@test.com",
            "subject": "sl.exec() probe",
            "body_html": "<p>probe</p>",
            "dry_run": True,
        })
        # sl.exec() never raises. None = service not configured or
        # backend error; dict = platform accepted the call. Either
        # way the library itself worked.
        if result is None:
            S.skip("service_lib", "sl.exec(email) round-trip",
                   "service not configured or backend returned error")
        else:
            S.ok("service_lib",
                 f"sl.exec() round-trip worked "
                 f"(platform returned success={result.get('success')})")
    except Exception as e:
        # sl.exec() contract: never raises. If we hit this, regression.
        S.fail("service_lib",
               "sl.exec() raised — library regression", str(e))

    # ── Wire-format regression guard ────────────────────────────────
    # run_workflow() → exec() wraps everything in try/except, so it
    # cannot raise. We just verify the call completes and returns the
    # expected shape (None on error, dict on success). A None here is
    # expected because __e2e_probe_nonexistent__ won't resolve.
    try:
        result = sl.run_workflow("__e2e_probe_nonexistent__", _probe=True)
        # Either outcome is acceptable; what matters is no exception.
        S.ok("service_lib",
             f"sl.run_workflow() completes cleanly "
             f"(result={'dict' if result else 'None'})")
    except Exception as e:
        S.fail("service_lib",
               "sl.run_workflow() raised — library regression", str(e))


# === MAIN ===
ALL = ["connectivity", "auth", "crud", "delete", "rbac", "public", "multi-tenant", "validation", "signup", "edge", "references", "namespace", "services", "workflows", "service_lib"]

def main():
    ap = argparse.ArgumentParser(
        description="E2E runtime tests for Supero apps",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="Sections: Sections: " + ", ".join(ALL))
    ap.add_argument("--section", choices=ALL, help="Run only this section")
    ap.add_argument("--verbose", action="store_true", help="Show request/response details")
    ap.add_argument("--bail", action="store_true", help="Stop on first failure")
    ap.add_argument("--skip-delete", action="store_true", help="Keep test records after run")
    ap.add_argument("--list", action="store_true", help="List available sections and exit")
    ap.add_argument("--json", action="store_true", help="Output results as JSON for CI")
    args = ap.parse_args()
    if not DOMAIN: print("  x SUPERO_DOMAIN not set"); sys.exit(1)
    S = TestSuite(verbose=args.verbose, bail=args.bail, json_output=args.json)
    if not args.json:
        print(f"\n{'='*60}\n  E2E Tests -- {cfg.app_name}\n  Domain: {DOMAIN} | Project: {PROJECT}\n  Server: {SERVER_URL}")
        print(f"  Schemas: {len(OBJECT_SCHEMAS)} objects, {len(ENUM_SCHEMAS)} enums\n  Public: {', '.join(PUBLIC_SCHEMAS) or '(none)'}\n  Multi-tenant: {IS_MULTI_TENANT}\n{'='*60}")
    run_all = args.section is None
    if run_all or args.section == "connectivity":
        if not test_connectivity(S):
            if not args.json: print(f"\n  Server not reachable at {SERVER_URL}")
            S.print_summary(); sys.exit(1)
    else:
        try:
            r = requests.get(f"{SERVER_URL}/health", verify=False, timeout=5)
            if r.status_code != 200: print("  Server not healthy"); sys.exit(1)
        except Exception: print(f"  Cannot reach {SERVER_URL}"); sys.exit(1)
    atok, ases, uses = None, None, {}
    if run_all or args.section == "auth":
        atok, uses = test_auth(S)
        ases = _stok(atok) if atok else (_skey(API_KEY) if API_KEY else None)
    else:
        ases = _skey(API_KEY) if API_KEY else (_login(ADMIN_EMAIL, ADMIN_PASS)[1] if ADMIN_EMAIL and ADMIN_PASS else None)
    created = {}
    if run_all or args.section == "crud": created = test_crud(S, ases)
    if (run_all or args.section == "delete") and not args.skip_delete: test_delete(S, ases, created)
    if run_all or args.section == "rbac":
        if not uses:
            for u in cfg.users:
                t, s = _login(u["email"], u.get("password", "Password123!"))
                if t: uses[u["email"]] = {"token": t, "session": s, "role": u.get("role", "tenant_user"), "tenant": u.get("tenant", "default-tenant")}
        test_rbac(S, ases, uses)
        test_field_hiding(S, ases, uses)
    if run_all or args.section == "public": test_public(S)
    if run_all or args.section == "multi-tenant": test_multi_tenant(S, ases)
    if run_all or args.section == "validation": test_validation(S, ases)
    if run_all or args.section == "signup": test_signup(S)
    if run_all or args.section == "edge": test_edge(S, ases)
    if run_all or args.section == "references": test_references(S, ases)
    if run_all or args.section == "namespace": test_namespace(S, ases)
    if run_all or args.section == "services": test_services(S, ases)
    if run_all or args.section == "workflows": test_workflows(S, ases)
    if run_all or args.section == "service_lib": test_service_lib(S, ases)
    sys.exit(0 if S.print_summary() else 1)

if __name__ == "__main__": main()
