#!/usr/bin/env python3
"""Render the verify/ proof into two shareable assets.

    python3 .github/assets/make_assets.py

Produces, next to this script:
    verify-proof.svg          terminal render for the README (scales, no raster blur)
    social-preview.png        1280x640 card for GitHub Settings -> Social preview

THE CONTENT IS REAL OUTPUT. `TRANSCRIPT` below is a verbatim capture of
`NO_COLOR=1 ./verify/02-rbac-enforcement.sh` against the live demo. Re-capture it
rather than editing it by hand — the whole point of the asset is that it is a
recording of something that happened, not a mockup of something that might.

Re-capture with:
    cd verify && NO_COLOR=1 ./02-rbac-enforcement.sh

No external fonts: SVG uses a monospace stack so it renders identically wherever
GitHub serves it, and the PNG falls back through common system faces.
"""
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))

# --- palette -----------------------------------------------------------------
BG      = "#0B1836"   # brand navy
PANEL   = "#0E1E42"
RULE    = "#1E3160"
FG      = "#C7D3EA"
DIM     = "#7286AC"
CYAN    = "#2DD4DE"   # brand accent
GREEN   = "#4ADE80"
WHITE   = "#F2F6FF"

TRANSCRIPT = """$ cd supero-apps/verify && ./02-rbac-enforcement.sh

02 · Field-level access control
https://api.supero.dev/api/v1/crud/supero-apps/claim   ·   two roles, one record
  comparing claim CLM-204455 — visible to both accounts
    staff sees 24 fields, policyholder sees 22
  PASS  'fraud_score' present for staff (19) and ABSENT for the policyholder
  PASS  'internal_notes' present for staff (Weather event corroborated…) and ABSENT for the policyholder
  PASS  every claim the policyholder can read is their own (9 rows)

Same rule, other spellings
  PASS  POST /query {"type":"claim"}      -> HTTP 200, 9 rows, no hidden field
  PASS  POST /query {"obj_type":"claim"}  -> HTTP 200, 9 rows, no hidden field
  PASS  GET by uuid                       -> no hidden field present

Result: the policy in setup.py is what the API enforces."""


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def line_colour(ln):
    if ln.startswith("$ "):                       return CYAN
    if ln.strip().startswith("PASS"):             return GREEN
    if ln.startswith("02 ·") or ln.startswith("Same rule"):  return WHITE
    if ln.startswith("Result:"):                  return CYAN
    if ln.startswith("http") or ln.startswith("    "):       return DIM
    return FG


def build_svg():
    lines = TRANSCRIPT.split("\n")
    ch, lh, pad, top = 7.7, 21, 26, 54
    width = 1000
    height = top + len(lines) * lh + pad + 10

    out = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
        f'viewBox="0 0 {width} {height}" role="img" '
        f'aria-label="Terminal output of verify/02-rbac-enforcement.sh: three PASS lines '
        f'showing fraud_score present for staff and absent for the policyholder">',
        f'<rect width="{width}" height="{height}" rx="10" fill="{BG}"/>',
        f'<rect width="{width}" height="38" rx="10" fill="{PANEL}"/>',
        f'<rect y="28" width="{width}" height="10" fill="{PANEL}"/>',
        f'<line x1="0" y1="38" x2="{width}" y2="38" stroke="{RULE}" stroke-width="1"/>',
        f'<circle cx="20" cy="19" r="5" fill="#FF5F57"/>',
        f'<circle cx="38" cy="19" r="5" fill="#FEBC2E"/>',
        f'<circle cx="56" cy="19" r="5" fill="#28C840"/>',
        f'<text x="{width/2}" y="23" fill="{DIM}" font-size="12" text-anchor="middle" '
        f'font-family="ui-monospace,SFMono-Regular,Menlo,Consolas,monospace">'
        f'verify — 02-rbac-enforcement.sh</text>',
    ]

    y = top + 12
    for ln in lines:
        if ln.strip():
            colour = line_colour(ln)
            weight = "600" if ln.strip().startswith("PASS") or ln.startswith("$ ") else "400"
            # Emphasise the two field names — they are the whole claim.
            txt = esc(ln)
            out.append(
                f'<text x="{pad}" y="{y}" fill="{colour}" font-size="13.5" '
                f'font-weight="{weight}" xml:space="preserve" '
                f'font-family="ui-monospace,SFMono-Regular,Menlo,Consolas,monospace">{txt}</text>'
            )
        y += lh

    out.append("</svg>")
    p = os.path.join(HERE, "verify-proof.svg")
    open(p, "w", encoding="utf-8").write("\n".join(out))
    return p


def build_png():
    from PIL import Image, ImageDraw, ImageFont

    W, H = 1280, 640
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)

    def font(size, mono=False, bold=False):
        names = ([
            "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf" if bold
            else "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"
        ] if mono else [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold
            else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
        ])
        for n in names:
            if os.path.exists(n):
                return ImageFont.truetype(n, size)
        return ImageFont.load_default()

    # Left accent rule — doubles as a code gutter.
    d.rectangle([64, 108, 68, 400], fill=CYAN)

    d.ellipse([64, 52, 80, 68], fill=CYAN)
    d.text((92, 50), "supero", font=font(26, bold=True), fill=WHITE)

    d.text((100, 112), "The same record.", font=font(46, bold=True), fill=WHITE)
    d.text((100, 168), "Two roles. One field missing.", font=font(46, bold=True), fill=WHITE)

    # The proof, in the terminal's own words.
    m, mb = font(19, mono=True), font(19, mono=True, bold=True)
    d.text((100, 250), "claims adjuster", font=mb, fill=DIM)
    d.text((100, 278), "fraud_score: 19", font=mb, fill=GREEN)
    d.text((100, 306), "internal_notes: \"Weather event…\"", font=mb, fill=GREEN)

    d.text((640, 250), "policyholder", font=mb, fill=DIM)
    # Struck THROUGH, not underlined: the field is absent from the response, and the
    # line has to read as removal at thumbnail size where the caption is unreadable.
    for label, y in (("fraud_score", 278), ("internal_notes", 306)):
        d.text((640, y), label, font=mb, fill="#54647F")
        w = d.textlength(label, font=mb)
        d.line([(640, y + 12), (640 + w, y + 12)], fill="#8A9AB8", width=2)
        d.text((640 + w + 18, y), "absent", font=m, fill="#8A9AB8")

    d.text((100, 386),
           "Enforced by the server. Checked with their own valid token, from a terminal.",
           font=font(21), fill=FG)

    d.line([(64, 470), (1216, 470)], fill=RULE, width=1)
    d.text((64, 498), "cd supero-apps/verify && ./02-rbac-enforcement.sh",
           font=font(21, mono=True), fill=CYAN)
    d.text((64, 546), "github.com/supero-platform/supero-apps",
           font=font(18, mono=True), fill=DIM)
    right = "19 reference apps · MIT"
    w = d.textlength(right, font=font(18))
    d.text((1216 - w, 546), right, font=font(18), fill=DIM)

    p = os.path.join(HERE, "social-preview.png")
    img.save(p, "PNG", optimize=True)
    return p


if __name__ == "__main__":
    for p in (build_svg(), build_png()):
        print(f"  wrote {p}  ({os.path.getsize(p):,} bytes)")
