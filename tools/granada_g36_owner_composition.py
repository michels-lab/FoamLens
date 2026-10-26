#!/usr/bin/env python3
"""G36 source-owner truth: exact prior G35 CAD/security + exact G22 UI CSS; no silent other edits.
Merges are not performed and no Windows release certification is implied.
"""
import argparse
import hashlib
from pathlib import Path
import subprocess
import sys

G35="2f361b89edf1762b3c88f4a706ffc713b3ba642a"
G22="44a06c0a8f0f3848bbc64ead809783c443186187"
G7="desktop/src/FoamLensDesktop/frontend/v27-granada-compact-workbench.js"
TEST="tools/granada_g22_compact_media_guard.test.cjs"
OWN={G7,TEST,"tools/granada_g36_owner_composition.py",
     ".github/workflows/granada-g36-cad-security-play.yml",
     "docs/GRANADA_G36_CAD_SECURITY_PLAY_NATIVE_2026-10-26.md",
     "docs/GIT_AUDIT_LOG.md"}

def require(condition,message):
    if not condition: raise ValueError(message)

def git(root,*args):
    return subprocess.run(["git","-C",str(root),*args],check=True,
                          stdout=subprocess.PIPE,stderr=subprocess.PIPE).stdout

def validate(product,g22):
    require(git(product,"merge-base","HEAD",G35).decode().strip()==G35,"G36 must descend from exact fully proven G35 source")
    require(git(g22,"rev-parse","HEAD").decode().strip()==G22,"G22 CSS owner commit mismatch")
    changed=set(git(product,"diff","--name-only",G35,"HEAD").decode().splitlines())
    require(G7 in changed and TEST in changed,"Original G22 JS and negative test must both be present")
    require(changed <= OWN,"G36 modifies unrelated CAD/security/Field product or owner code: "+str(sorted(changed-OWN)))
    for file in [G7,TEST]:
        current=(product/file).read_bytes()
        owner=(g22/file).read_bytes()
        require(current==owner,"G36 "+file+" differs from exact G22 owner-tested bytes")
    # Compare tracked Git objects (not OS-converted working tree CRLF bytes).\n    # Clean Git status below separately proves no untracked worktree changes.
    for f in ["desktop/src/FoamLensDesktop/Program.cs",
              "desktop/src/FoamLensDesktop/TrustedEmbeddedFrontendExtensions.cs",
              "desktop/tests/field-view.test.cjs",
              "desktop/src/FoamLensDesktop/frontend/v24-cad-surface-inspector.js"]:
        require(git(product,"show",G35+":"+f)==git(product,"show","HEAD:"+f),
                "G36 mutated G35 genuine CAD+security signed-off code: "+f)
    src=(product/G7).read_text("utf-8")
    require("@media(max-width:1024px)" in src and
            "compactBreakpoint.addEventListener('change',sync)" in src,
            "G36 missing G22 original physical Play breakpoint and native resize sync")
    require(not git(product,"status","--porcelain").strip(),"G36 dirty source checkout")
    sha=hashlib.sha256((product/G7).read_bytes()).hexdigest()
    print("G36 EXACT-OWNER SOURCE COMPOSITION PASS: original G35 CAD/security intact; "
          "exact G22 Play compact CSS + real source negative guards; no other product sources")
    print("G36 original G35 base:",G35,"G22 owner:",G22,"compact module sha256:",sha)
    return sha

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--product",type=Path,required=True)
    ap.add_argument("--g22",type=Path,required=True)
    args=ap.parse_args()
    try: validate(args.product,args.g22)
    except (ValueError,OSError,subprocess.CalledProcessError,UnicodeError) as err:
        print("G36 fail-closed owner source integration: "+str(err),file=sys.stderr)
        return 1
    return 0

if __name__=="__main__": raise SystemExit(main())
