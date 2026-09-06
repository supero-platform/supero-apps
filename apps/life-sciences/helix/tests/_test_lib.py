# TEST_LIB_VERSION: 1
"""
_test_lib.py — Shared helpers for app-side diagnostic test suites.

Used by workflow_tests.py, integration_tests.py, transactional_tests.py.
Plain Python, stdlib + requests only. Matches the existing custom-harness
pattern in crud_tests.py and workflow_tests.py.

Public surface:

  Results        Test-result accumulator with status/mode/hint.
  PlatformClient Lightweight HTTP shim for platform API calls.

  load_setup_py            → module object (with .WORKFLOW_DEFINITIONS, etc.)
  load_schemas             → ALL_SCHEMAS list
  load_event_bindings_json → list[dict]
  load_app_js              → raw source string
  load_config_py           → module object (with AppConfig.services)
  build_schema_index       → {schema_name: {field_name, ...}}

  parse_app_js_const       → JS object literal extraction
  parse_event              → ("create"|"update"|"delete", schema_name) or (None, None)

  print_human / print_json
  color helpers (green/red/yellow/dim/bold)
  did_you_mean             → fuzzy field-name suggestions

  ENV: dict of SUPERO_* env vars loaded from .env if present
"""

from __future__ import annotations

import argparse
import difflib
import json
import os
import re
import sys
import time
import warnings
from pathlib import Path
from typing import Any, Iterable

import requests

warnings.filterwarnings("ignore", message="Unverified HTTPS request")
try:
    import urllib3
    urllib3.disable_warnings()
except ImportError:
    pass


# ════════════════════════════════════════════════════════════════════
# Paths
# ════════════════════════════════════════════════════════════════════

# TESTS_FOLDER_V1 — _test_lib.py lives in tests/, so parent.parent is app root
APP_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(APP_DIR))


# ════════════════════════════════════════════════════════════════════
# .env loader (no python-dotenv dependency)
# ════════════════════════════════════════════════════════════════════

def _load_env_file(path: Path) -> dict:
    """Parse a .env file into a dict. Ignores comments, supports quoted values."""
    out = {}
    if not path.exists():
        return out
    try:
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            k = k.strip()
            v = v.strip().strip('"').strip("'")
            if k:
                out[k] = v
    except Exception:
        pass
    return out


# Load .env if not already loaded into os.environ
_env_path = APP_DIR / ".env"
_env_file = _load_env_file(_env_path)
ENV = {**_env_file, **{k: v for k, v in os.environ.items() if k.startswith("SUPERO_")}}


# ════════════════════════════════════════════════════════════════════
# Color helpers
# ════════════════════════════════════════════════════════════════════

_NO_COLOR = not sys.stdout.isatty() or os.getenv("NO_COLOR")

def _c(code: str, t: str) -> str:
    return t if _NO_COLOR else f"\033[{code}m{t}\033[0m"

def green(t):  return _c("32", t)
def red(t):    return _c("31", t)
def yellow(t): return _c("33", t)
def dim(t):    return _c("2", t)
def bold(t):   return _c("1", t)

STATUS_ICON = {
    "pass": green("✓"),
    "fail": red("✗"),
    "warn": yellow("!"),
    "skip": dim("-"),
}


# ════════════════════════════════════════════════════════════════════
# Results accumulator
# ════════════════════════════════════════════════════════════════════

class Results:
    """Test-result accumulator with grouping by section.

    Statuses:
      pass  — check succeeded
      fail  — hard failure; exit 1
      warn  — soft warning; exit 2 if no fails
      skip  — could not run (missing input, opt-in not enabled)

    Each result carries optional 'mode' (e.g. 'W-A', 'I-B', 'T-C')
    naming the design's failure mode, and optional 'hint' with the
    user-facing fix suggestion.
    """

    def __init__(self):
        self.tests: list[dict] = []
        self.bail: bool = False
        self._aborted: bool = False

    def add(self, section: str, name: str, status: str,
            message: str = "", mode: str | None = None,
            hint: str | None = None) -> None:
        if self._aborted:
            return
        self.tests.append({
            "section": section, "name": name, "status": status,
            "message": message, "mode": mode, "hint": hint,
        })
        if self.bail and status == "fail":
            self._aborted = True

    def pass_(self, section, name, msg=""):
        self.add(section, name, "pass", msg)

    def fail(self, section, name, msg, mode=None, hint=None):
        self.add(section, name, "fail", msg, mode, hint)

    def warn(self, section, name, msg, mode=None, hint=None):
        self.add(section, name, "warn", msg, mode, hint)

    def skip(self, section, name, msg=""):
        self.add(section, name, "skip", msg)

    def aborted(self) -> bool:
        return self._aborted

    def summary(self) -> dict:
        s = {"pass": 0, "fail": 0, "warn": 0, "skip": 0}
        for t in self.tests:
            s[t["status"]] += 1
        return s

    def exit_code(self) -> int:
        s = self.summary()
        if s["fail"]:
            return 1
        if s["warn"]:
            return 2
        return 0


# ════════════════════════════════════════════════════════════════════
# Output
# ════════════════════════════════════════════════════════════════════

def print_human(results: Results, verbose: bool = False, tool_name: str = "") -> None:
    """Render results to stdout in a readable format."""
    if tool_name:
        print(f"\n{bold(tool_name)}")
        print("━" * 60)

    by_section: dict[str, list[dict]] = {}
    for t in results.tests:
        by_section.setdefault(t["section"], []).append(t)

    for section, tests in by_section.items():
        print(f"\n{bold(section)}")
        for t in tests:
            icon = STATUS_ICON[t["status"]]
            line = f"  {icon} {t['name']}"
            if t["mode"]:
                line += f"  [{t['mode']}]"
            print(line)
            if t["status"] in ("fail", "warn") or verbose:
                if t["message"]:
                    print(f"      {t['message']}")
                if t.get("hint"):
                    print(f"      {dim('hint: ' + t['hint'])}")

    s = results.summary()
    print(
        f"\n{bold('Summary:')} "
        f"{green(str(s['pass']) + ' pass')}  "
        f"{red(str(s['fail']) + ' fail')}  "
        f"{yellow(str(s['warn']) + ' warn')}  "
        f"{dim(str(s['skip']) + ' skip')}"
    )
    if results.aborted():
        print(dim("\n(aborted early due to --bail)"))


def print_json(results: Results, tool_name: str = "") -> None:
    payload = {
        "tool": tool_name,
        "tests": results.tests,
        "summary": results.summary(),
        "aborted": results.aborted(),
    }
    print(json.dumps(payload, indent=2))


# ════════════════════════════════════════════════════════════════════
# Loaders — app structure
# ════════════════════════════════════════════════════════════════════

def load_setup_py():
    """Import the app's setup.py module. Returns (module, error_msg).

    The module exposes whatever setup.py defines: WORKFLOW_DEFINITIONS,
    EVENT_BINDINGS, plus the ensure_* functions and Setup class.
    Side-effects in setup.py (e.g. CLI parsing) are guarded by
    `if __name__ == "__main__"` in generated apps.
    """
    try:
        import setup as setup_mod
        return setup_mod, None
    except Exception as e:
        return None, f"cannot import setup.py: {e}"


def load_schemas():
    """Import ALL_SCHEMAS from schemas.py. Returns (list, error_msg)."""
    try:
        from schemas import ALL_SCHEMAS
        return ALL_SCHEMAS, None
    except Exception as e:
        return None, f"cannot import schemas.py: {e}"


def load_config_py():
    """Import config.py. Returns (module, error_msg). Most apps expose
    AppConfig with .services and other attributes."""
    try:
        import config as config_mod
        return config_mod, None
    except Exception as e:
        return None, f"cannot import config.py: {e}"


def load_event_bindings_json():
    """Read event_bindings.json from app root. Returns (list, error_msg)."""
    path = APP_DIR / "event_bindings.json"
    if not path.exists():
        return None, f"{path.name} not found"
    try:
        raw = path.read_text(encoding="utf-8").strip()
        if not raw:
            return [], None
        data = json.loads(raw)
        if not isinstance(data, list):
            return None, f"event_bindings.json must be a list, got {type(data).__name__}"
        return data, None
    except json.JSONDecodeError as e:
        return None, f"event_bindings.json is not valid JSON: {e}"
    except Exception as e:
        return None, f"reading event_bindings.json failed: {e}"


def load_services_json():
    """Read services.json from app root. Returns (list_or_dict, error_msg).
    Shape varies — some apps store a list of service IDs, others a dict."""
    path = APP_DIR / "services.json"
    if not path.exists():
        return None, f"{path.name} not found"
    try:
        return json.loads(path.read_text(encoding="utf-8")), None
    except Exception as e:
        return None, f"reading services.json failed: {e}"


def load_app_js():
    """Read ui/app.js raw source. Returns (text, error_msg)."""
    path = APP_DIR / "ui" / "app.js"
    if not path.exists():
        return None, f"{path} not found"
    try:
        return path.read_text(encoding="utf-8"), None
    except Exception as e:
        return None, f"reading app.js failed: {e}"


# ════════════════════════════════════════════════════════════════════
# Schema introspection
# ════════════════════════════════════════════════════════════════════

# System fields always present on records (managed by platform)
_SYSTEM_FIELDS = frozenset({
    "uuid", "name", "fq_name", "parent_uuid", "parent_type",
    "created_at", "updated_at", "created_by", "updated_by",
})


def _schema_field_names(schema_dict) -> set:
    """Extract attribute names from a schema dict.

    Handles both wrapped ({"schema_content": {"attributes": [...]}})
    and flat ({"attributes": [...]}) shapes. Always includes system
    fields.
    """
    if not isinstance(schema_dict, dict):
        return set(_SYSTEM_FIELDS)
    content = schema_dict.get("schema_content", schema_dict)
    attrs = content.get("attributes") if isinstance(content, dict) else None
    names = set(_SYSTEM_FIELDS)
    if isinstance(attrs, list):
        for a in attrs:
            if isinstance(a, dict) and a.get("name"):
                names.add(a["name"])
    return names


def build_schema_index(all_schemas) -> dict:
    """Returns {schema_name: {field_name, ...}}.

    schema_name is the bare name (e.g. 'subject'), not namespaced.
    """
    idx: dict[str, set] = {}
    if not isinstance(all_schemas, (list, tuple)):
        return idx
    for s in all_schemas:
        if not isinstance(s, dict):
            continue
        name = s.get("name")
        if not name and isinstance(s.get("schema_content"), dict):
            name = s["schema_content"].get("name")
        if name:
            idx[name] = _schema_field_names(s)
    return idx


# ════════════════════════════════════════════════════════════════════
# Event parsing
# ════════════════════════════════════════════════════════════════════

# WA-EVENT-NS-REGEX-V1: accept optional namespace segment (@verb:ns:schema),
# not just @verb:schema. setup.py emits ns-qualified events like
# "@create:franchise_operations_6vnf:audit_report". Schema is the LAST seg.
_EVENT_RE = re.compile(
    r"^@(create|update|delete):([a-z][a-z0-9_]*)(?::([a-z][a-z0-9_]*))?$"
)


def parse_event(event: Any) -> tuple:
    """Parse an event string. Returns (verb, schema_name) or (None, None).

    Valid: '@create:subject', '@update:order', '@delete:cart_item'
    Invalid: '@create:Subject', '@create:subjects', 'create:subject', ...
    """
    if not isinstance(event, str):
        return None, None
    m = _EVENT_RE.match(event)
    if not m:
        return None, None
    # WA-EVENT-NS-REGEX-V1: group(3) present => namespaced (group2=ns, group3=schema);
    # else unnamespaced (group2=schema). Always return the schema name.
    return m.group(1), (m.group(3) or m.group(2))


def is_event_named_workflow(workflow_id: Any) -> bool:
    """Heuristic: workflow_id like 'subject_enrolled' / 'study_created'
    suggests an event-driven workflow. Used only to surface W-A warnings,
    so false positives are fine."""
    if not isinstance(workflow_id, str):
        return False
    parts = workflow_id.split("_")
    if len(parts) < 2:
        return False
    last = parts[-1]
    return (
        last.endswith(("ed", "en"))
        or last in {"complete", "ready", "done"}
    )


# ════════════════════════════════════════════════════════════════════
# JS literal extraction (best-effort, no full parser)
# ════════════════════════════════════════════════════════════════════

def parse_app_js_const(source: str, name: str):
    """Extract a top-level const/var declaration from app.js source.

    Handles:
      const FOO = { ... };
      var FOO = [ ... ];
      window.FOO = { ... };

    Returns the literal value as a Python object via JSON parsing (with
    light normalization for JS-isms: trailing commas, single quotes,
    unquoted keys are NOT supported — we only handle JSON-clean
    declarations, which is what the generator produces).

    Returns (value, error_msg). value is None on failure.
    """
    if not source:
        return None, "empty source"

    # Find the declaration line. Match `<keyword> NAME =` at line start
    # (allowing leading whitespace, optional `window.`).
    pattern = re.compile(
        rf'^\s*(?:const|var|let|window\.)\s*{re.escape(name)}\s*=\s*',
        re.MULTILINE,
    )
    m = pattern.search(source)
    if not m:
        return None, f"declaration `{name} =` not found"

    # Starting from the `=`, find the balanced literal that follows.
    start = m.end()
    # Skip whitespace
    while start < len(source) and source[start] in " \t\n\r":
        start += 1
    if start >= len(source):
        return None, f"`{name}` has no value"

    open_char = source[start]
    if open_char not in "{[\"'":
        return None, f"`{name}` value doesn't start with object/array/string"

    # Find the matching close — track depth, handle strings + escapes
    end = _find_balanced_end(source, start)
    if end < 0:
        return None, f"`{name}` literal not balanced"

    literal = source[start:end + 1]

    # Try parsing as JSON first (covers JSON-clean declarations)
    try:
        return json.loads(literal), None
    except json.JSONDecodeError:
        pass

    # Light normalization for common JS-isms:
    #   - trailing commas before } or ]
    #   - single-quoted strings
    #   - unquoted object keys
    normalized = _js_to_json_lite(literal)
    try:
        return json.loads(normalized), None
    except json.JSONDecodeError as e:
        return None, (
            f"`{name}` is not JSON-parseable after normalization: {e}. "
            "Source may contain functions, computed expressions, or other "
            "JS-isms that static parsing can't handle."
        )


def _js_to_json_lite(s: str) -> str:
    """Light JS → JSON normalization. NOT a full parser; covers common cases.

    Handles:
      - // and /* */ comments (stripped before other steps)
      - trailing commas before } or ]
      - single-quoted strings → double-quoted
      - unquoted object keys → quoted

    Won't handle:
      - template literals (backticks)
      - functions/arrow expressions as values
      - computed property names
    """
    # 1. Strip comments — but only OUTSIDE strings. Walk char-by-char.
    s = _strip_js_comments(s)
    # 2. Trailing commas before } or ]
    s = re.sub(r",(\s*[}\]])", r"\1", s)
    # 3. Single-quoted strings → double (naive; assumes no embedded escaped quotes
    #    that conflict — adequate for generator output)
    def _to_double(m):
        inner = m.group(1).replace('"', '\\"')
        return f'"{inner}"'
    s = re.sub(r"'([^'\\]*(?:\\.[^'\\]*)*)'", _to_double, s)
    # 4. Unquoted object keys: matches `{key:` or `, key:` and quotes the key
    s = re.sub(r'([\{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:',
               r'\1"\2":', s)
    return s


def _strip_js_comments(s: str) -> str:
    """Remove // and /* */ comments, respecting strings."""
    out = []
    i = 0
    n = len(s)
    in_str = None  # the quote char, or None
    while i < n:
        ch = s[i]
        if in_str:
            out.append(ch)
            if ch == "\\" and i + 1 < n:
                out.append(s[i + 1])
                i += 2
                continue
            if ch == in_str:
                in_str = None
            i += 1
            continue
        if ch in '"\'`':
            in_str = ch
            out.append(ch)
            i += 1
            continue
        if ch == "/" and i + 1 < n:
            nxt = s[i + 1]
            if nxt == "/":
                # line comment — skip to newline
                while i < n and s[i] != "\n":
                    i += 1
                continue
            if nxt == "*":
                # block comment — skip to */
                i += 2
                while i + 1 < n and not (s[i] == "*" and s[i + 1] == "/"):
                    i += 1
                i += 2
                continue
        out.append(ch)
        i += 1
    return "".join(out)


def _find_balanced_end(s: str, start: int) -> int:
    """Find the index of the matching close-bracket for the opener at s[start].
    Returns -1 if not found. Handles strings (single/double-quoted) and escapes."""
    if start >= len(s):
        return -1
    open_char = s[start]
    pairs = {"{": "}", "[": "]", '"': '"', "'": "'"}
    if open_char not in pairs:
        return -1
    close_char = pairs[open_char]
    if open_char in '"\'':
        # Just a string — find its end
        i = start + 1
        while i < len(s):
            if s[i] == "\\":
                i += 2
                continue
            if s[i] == close_char:
                return i
            i += 1
        return -1

    depth = 0
    i = start
    in_str: str | None = None
    while i < len(s):
        ch = s[i]
        if in_str:
            if ch == "\\":
                i += 2
                continue
            if ch == in_str:
                in_str = None
        else:
            if ch in '"\'':
                in_str = ch
            elif ch == open_char:
                depth += 1
            elif ch == close_char:
                depth -= 1
                if depth == 0:
                    return i
        i += 1
    return -1


# ════════════════════════════════════════════════════════════════════
# "Did you mean" suggestions
# ════════════════════════════════════════════════════════════════════

def did_you_mean(needle: str, haystack: Iterable[str],
                  n: int = 3, cutoff: float = 0.6) -> str | None:
    """Returns a comma-separated suggestion string, or None if no close matches.

    Conservative cutoff: better to return None than to suggest a wrong fix.
    """
    if not needle or not haystack:
        return None
    matches = difflib.get_close_matches(needle, list(haystack), n=n, cutoff=cutoff)
    if not matches:
        return None
    return ", ".join(matches)


# ════════════════════════════════════════════════════════════════════
# Platform HTTP client (shim — no SuperoAPIClient dependency)
# ════════════════════════════════════════════════════════════════════

class PlatformClient:
    """Lightweight HTTP shim for platform API calls.

    Reads SUPERO_URL, SUPERO_API_KEY, SUPERO_DOMAIN from ENV (which
    includes .env loaded at module import time).

    Usage:
        client = PlatformClient.from_env()
        if not client.ready:
            return  # skipped check (no API key)
        body, err = client.get("/api/v1/services/workflows/config")
        if err:
            ...
    """

    def __init__(self, base_url: str, api_key: str, domain: str = "",
                 timeout: int = 30, verify: bool = False):
        self.base_url = (base_url or "").rstrip("/")
        self.api_key = api_key or ""
        self.domain = domain or ""
        self.timeout = timeout
        self.verify = verify
        self._sess = requests.Session()
        self._sess.headers.update({
            "X-API-Key": self.api_key,
            "Content-Type": "application/json",
            "Accept": "application/json",
        })
        if self.domain:
            self._sess.headers["X-Supero-Domain"] = self.domain

    @classmethod
    def from_env(cls) -> "PlatformClient":
        return cls(
            base_url=ENV.get("SUPERO_URL", ""),
            api_key=ENV.get("SUPERO_API_KEY", ""),
            domain=ENV.get("SUPERO_DOMAIN", ""),
        )

    @property
    def ready(self) -> bool:
        """True if we have enough info to make platform calls."""
        return bool(self.base_url and self.api_key)

    @property
    def missing(self) -> str:
        """Human-readable description of what's missing."""
        gaps = []
        if not self.base_url:
            gaps.append("SUPERO_URL")
        if not self.api_key:
            gaps.append("SUPERO_API_KEY")
        return ", ".join(gaps) if gaps else ""

    def get(self, path: str, **kw) -> tuple:
        """GET; returns (json_body, error_msg). 404 → (None, '404: ...')."""
        return self._req("GET", path, **kw)

    def post(self, path: str, json_body=None, **kw) -> tuple:
        return self._req("POST", path, json=json_body, **kw)

    def put(self, path: str, json_body=None, **kw) -> tuple:
        return self._req("PUT", path, json=json_body, **kw)

    def _req(self, method: str, path: str, **kw) -> tuple:
        if not self.ready:
            return None, f"platform client not ready (missing: {self.missing})"
        url = path if path.startswith("http") else f"{self.base_url}{path}"
        kw.setdefault("timeout", self.timeout)
        kw.setdefault("verify", self.verify)
        try:
            r = self._sess.request(method, url, **kw)
        except requests.RequestException as e:
            return None, f"{method} {path} failed: {e}"
        if r.status_code >= 400:
            body_preview = (r.text or "")[:300]
            return None, f"{r.status_code}: {body_preview}"
        if not r.content:
            return {}, None
        try:
            return r.json(), None
        except Exception:
            return None, f"response not JSON: {(r.text or '')[:200]}"

    def execute_service_op(self, service_id: str, operation_id: str,
                           input_obj: dict) -> tuple:
        """Convenience: POST /api/v1/services/execute. Common shape."""
        return self.post("/api/v1/services/execute", {
            "service_id": service_id,
            "operation_id": operation_id,
            "input": input_obj,
        })

    def get_service_config(self, service_id: str) -> tuple:
        """Convenience: GET /api/v1/services/{service_id}/config.

        Returns the config_data dict on success, or (None, err) on failure.
        404 surfaces as a distinct error string starting with '404'.
        """
        body, err = self.get(f"/api/v1/services/{service_id}/config")
        if err:
            return None, err
        return (body or {}).get("config_data", {}), None


# ════════════════════════════════════════════════════════════════════
# Common argparse builder
# ════════════════════════════════════════════════════════════════════

def make_arg_parser(prog: str, description: str) -> argparse.ArgumentParser:
    """Build a base argparse with the common flags every test tool uses.

    Tools may add their own flags after calling this.
    """
    ap = argparse.ArgumentParser(prog=prog, description=description)
    ap.add_argument("--json", action="store_true",
                    help="machine-readable JSON output")
    ap.add_argument("--verbose", action="store_true",
                    help="show passing checks too")
    ap.add_argument("--bail", action="store_true",
                    help="stop on first failure")
    ap.add_argument("--platform", action="store_true",
                    help="also run platform-state checks (requires SUPERO_API_KEY)")
    return ap


# ════════════════════════════════════════════════════════════════════
# Self-test: when run directly, verify the lib loads correctly.
# ════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print(bold("_test_lib.py self-check"))
    print(f"  APP_DIR: {APP_DIR}")
    print(f"  ENV keys: {sorted(k for k in ENV if k.startswith('SUPERO_'))}")
    print(f"  .env loaded from: {_env_path} (exists: {_env_path.exists()})")
    print(f"  requests version: {requests.__version__}")
    client = PlatformClient.from_env()
    print(f"  PlatformClient ready: {client.ready}"
          + (f" (missing: {client.missing})" if not client.ready else ""))
    print(green("  ✓ _test_lib.py loaded OK"))
