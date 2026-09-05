# TEST_ALL_VERSION: 1
"""
test_all.py — Run all diagnostic test suites and aggregate results.

Single entry point for CI and for "tell me everything that's wrong"
during development. Runs each suite as a subprocess so individual
suites remain independently invokable and one suite's crash doesn't
abort the others.

Usage:
    python test_all.py                # run all, human output
    python test_all.py --platform     # include platform checks
    python test_all.py --json         # machine-readable aggregate
    python test_all.py --bail         # stop suite-by-suite on first fail

Exit codes:
    0  all suites clean
    1  at least one hard failure
    2  warnings only (no failures)
"""

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent

SUITES = [
    ("workflow_tests",     "🔗 Workflow Tests"),
    ("integration_tests",  "🔌 Integration Tests"),
    ("transactional_tests","📋 Transactional Tests"),
]

# Severity ordering: 1 (fail) > 2 (warn) > 0 (clean).
# We can't just take max() because 1 < 2 numerically.
_SEVERITY = {0: 0, 2: 1, 1: 2}    # rank: clean < warn < fail
_FROM_SEV = {v: k for k, v in _SEVERITY.items()}


def _color_supported():
    return sys.stdout.isatty() and not os.getenv("NO_COLOR")

def _c(code, t):
    return t if not _color_supported() else f"\033[{code}m{t}\033[0m"

def _green(t):  return _c("32", t)
def _red(t):    return _c("31", t)
def _yellow(t): return _c("33", t)
def _bold(t):   return _c("1", t)
def _dim(t):    return _c("2", t)


def _run_suite(name, args, want_json):
    """Run one suite as subprocess. Returns (exit_code, stdout, stderr)."""
    script = HERE / f"{name}.py"
    if not script.exists():
        return None, "", f"suite script {script} not found"

    cmd = [sys.executable, str(script)]
    # Forward common flags
    if args.platform:
        cmd.append("--platform")
    if args.verbose:
        cmd.append("--verbose")
    if args.bail:
        cmd.append("--bail")
    if want_json:
        cmd.append("--json")

    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        return r.returncode, r.stdout, r.stderr
    except subprocess.TimeoutExpired:
        return 124, "", "timed out after 120s"
    except Exception as e:
        return None, "", f"subprocess failed: {e}"


def _aggregate_exit_code(codes):
    """Combine suite exit codes per the severity ranking."""
    ranks = [_SEVERITY.get(c, 2) for c in codes if c is not None]
    if not ranks:
        return 1   # all suites errored — treat as failure
    return _FROM_SEV[max(ranks)]


def _human_summary(suite_results):
    print(f"\n{_bold('═' * 60)}")
    print(f"{_bold('AGGREGATE SUMMARY')}")
    print(f"{_bold('═' * 60)}")
    totals = {"pass": 0, "fail": 0, "warn": 0, "skip": 0}
    for name, title, code, stdout, stderr, parsed in suite_results:
        if parsed is None:
            print(f"  {_red('✗')} {title}: failed to run "
                  f"({stderr.strip()[:80] if stderr else 'no output'})")
            continue
        s = parsed.get("summary", {})
        for k in totals:
            totals[k] += s.get(k, 0)
        status = (
            _green("clean") if code == 0
            else _red("FAIL") if code == 1
            else _yellow("warn") if code == 2
            else _red("error")
        )
        print(f"  {title}: {status} "
              f"({_green(str(s.get('pass', 0)) + ' pass')}, "
              f"{_red(str(s.get('fail', 0)) + ' fail')}, "
              f"{_yellow(str(s.get('warn', 0)) + ' warn')}, "
              f"{_dim(str(s.get('skip', 0)) + ' skip')})")

    print(f"\n  {_bold('TOTAL:')} "
          f"{_green(str(totals['pass']) + ' pass')}, "
          f"{_red(str(totals['fail']) + ' fail')}, "
          f"{_yellow(str(totals['warn']) + ' warn')}, "
          f"{_dim(str(totals['skip']) + ' skip')}")


def main():
    ap = argparse.ArgumentParser(
        prog="test_all.py",
        description="Run all diagnostic test suites and aggregate results.",
    )
    ap.add_argument("--json", action="store_true",
                    help="machine-readable JSON output (aggregate)")
    ap.add_argument("--verbose", action="store_true",
                    help="show passing checks too")
    ap.add_argument("--bail", action="store_true",
                    help="stop on first failing suite (and within each suite)")
    ap.add_argument("--platform", action="store_true",
                    help="include platform-state checks (requires SUPERO_API_KEY)")
    args = ap.parse_args()

    # We always run suites with --json internally for aggregation, then
    # re-render in the chosen output format.
    suite_results = []
    for name, title in SUITES:
        code, stdout, stderr = _run_suite(name, args, want_json=True)
        parsed = None
        if stdout:
            try:
                parsed = json.loads(stdout)
            except json.JSONDecodeError:
                parsed = None
        suite_results.append((name, title, code, stdout, stderr, parsed))
        if args.bail and code == 1:
            break

    if args.json:
        out = {
            "suites": [
                {
                    "name": name,
                    "title": title,
                    "exit_code": code,
                    "results": parsed,
                    "stderr": stderr if stderr else None,
                }
                for name, title, code, _, stderr, parsed in suite_results
            ],
            "aggregate_exit_code": _aggregate_exit_code(
                [c for _, _, c, _, _, _ in suite_results]
            ),
        }
        print(json.dumps(out, indent=2))
    else:
        # Show each suite's output, then aggregate
        for name, title, code, _, stderr, parsed in suite_results:
            print(f"\n{_bold('━' * 60)}")
            print(_bold(title))
            print(_bold("━" * 60))
            if parsed is None:
                print(_red(f"Suite did not return parseable JSON. stderr: {stderr}"))
                continue
            # Render each test result in a human form
            by_section = {}
            for t in parsed.get("tests", []):
                by_section.setdefault(t["section"], []).append(t)
            for section, tests in by_section.items():
                print(f"\n  {_bold(section)}")
                for t in tests:
                    icon = {
                        "pass": _green("✓"), "fail": _red("✗"),
                        "warn": _yellow("!"), "skip": _dim("-"),
                    }.get(t["status"], "?")
                    line = f"    {icon} {t['name']}"
                    if t.get("mode"):
                        line += f"  [{t['mode']}]"
                    print(line)
                    if t["status"] in ("fail", "warn") or args.verbose:
                        if t.get("message"):
                            print(f"        {t['message']}")
                        if t.get("hint"):
                            print(f"        {_dim('hint: ' + t['hint'])}")

        _human_summary(suite_results)

    sys.exit(_aggregate_exit_code(
        [c for _, _, c, _, _, _ in suite_results]
    ))


if __name__ == "__main__":
    main()
