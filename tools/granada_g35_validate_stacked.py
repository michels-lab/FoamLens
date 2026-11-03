#!/usr/bin/env python3
"""G35: prove a stacked CAD integration changed only the two validated host JS call-sites.
The active CAD branch is the source owner. No GitHub merge, source rewrite or release.
"""
import argparse
import hashlib
from pathlib import Path
import subprocess
import sys


MAIN_COMMIT = "0253456641df6d584778c5a3115d9026a3293ada"
CAD_COMMIT = "af494c3eab845f3c3d8aa7f5fd1e63d7efa65248"
G34_COMMIT = "71c99e1a074a41bc93c3ec800992ff5ee63e3d39"
HOST = "desktop/src/FoamLensDesktop/Program.cs"
HELPER = "desktop/src/FoamLensDesktop/TrustedEmbeddedFrontendExtensions.cs"
FIRST = '''        var extensionPaths = Directory.GetFiles(AppRoot, "v*-*.js")
            .OrderBy(path => path, StringComparer.OrdinalIgnoreCase)
            .ToArray();
        if (extensionPaths.Length == 0) return;'''
INTEGRATED_FIRST = '''        // G35: only authoritative embedded original AppBundle JavaScript is executable.
        // Never enumerate mutable per-user AppRoot v*-*.js residues after ZIP extraction.
        var bundledExtensions = TrustedEmbeddedFrontendExtensions.ReadFromRunningAssembly();'''
SECOND = '''        var extension = string.Join(Environment.NewLine,
            extensionPaths.Select(path => File.ReadAllText(path, Encoding.UTF8)));'''
INTEGRATED_SECOND = '''        var extension = string.Join(Environment.NewLine, bundledExtensions);'''

def check(condition, message):
    if not condition:
        raise RuntimeError(message)

def git(repo, *args):
    return subprocess.run(("git", "-C", str(repo), *args), check=True, stdout=subprocess.PIPE,
                          stderr=subprocess.PIPE).stdout

def audit(product: Path, qa: Path):
    check(product.is_dir() and qa.is_dir(), "G35 product or independently pinned G34 QA checkout missing")
    main = git(product, "rev-parse", "HEAD").decode().strip()
    cad_origin = git(product, "merge-base", "HEAD", CAD_COMMIT).decode().strip()
    current_main = git(product, "merge-base", "HEAD", MAIN_COMMIT).decode().strip()
    check(current_main == MAIN_COMMIT, "G35 consolidated head must descend from exact reviewed current-main source")
    check(cad_origin == CAD_COMMIT, "G35 integration branch was not created from approved CAD owner base")
    changed = set(git(product, "diff", "--name-only", MAIN_COMMIT, "HEAD").decode().splitlines())
    check(HOST in changed and HELPER in changed, "G35 actual host-and-helper correction missing")
    check(all(x == HOST or x == HELPER or x.startswith(("tools/granada_g35_", ".github/workflows/granada-g35-",
                                                        "docs/GRANADA_G35_")) or x == "docs/GIT_AUDIT_LOG.md" or x == "desktop/tests/field-view.test.cjs"
              or x == "tools/granada_g16_wide_play_cascade.test.cjs"
              or x == "tools/granada_g17_integrated_guards.test.cjs"
              for x in changed), "G35 changed unrelated CAD, scientific, UX, or other owner's source")
    baseline = git(product, "show", CAD_COMMIT + ":" + HOST).decode("utf-8")
    current = (product / HOST).read_text("utf-8")
    check(baseline.count(FIRST) == 1 and baseline.count(SECOND) == 1,
          "G35 original CAD host version changed; cannot assert verified native source replacement")
    target = baseline.replace(FIRST, INTEGRATED_FIRST).replace(SECOND, INTEGRATED_SECOND)
    check(current == target, "G35 host must match exact two previously proven G34 source changes, byte-for-byte")
    helper = (product / HELPER).read_bytes()
    reference = (qa / HELPER).read_bytes()
    check(helper == reference, "G35 compiled product embedded JS helper must match G34 real-Windows-proven code SHA")
    check(helper.count(b"GetManifestResourceStream") == 1 and b"Directory.GetFiles" not in helper
          and b"File.ReadAllText" not in helper, "G35 trusted resource must never read local folder wildcard")
    check("FoamLensCadSurface" in current and (product / "desktop/src/FoamLensDesktop/frontend/v24-cad-surface-inspector.js").is_file(),
          "G35 removed actual CAD native frontend smoke or source")
    check("SmokeTestExitCode" in current and "RunSmokeTestAsync()" in current,
          "G35 removed original WebView2 native smoke")
    check(not git(product, "status", "--porcelain").strip(),
          "G35 original integrated checkout must be clean, not patched in runner")
    return {"candidateSha": main, "cadBaseSha": CAD_COMMIT, "g34ReferenceSha": G34_COMMIT,
            "changedPaths": sorted(changed), "trustedHelperSha256": hashlib.sha256(helper).hexdigest()}

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--product", type=Path, required=True)
    p.add_argument("--qa", type=Path, required=True)
    args = p.parse_args()
    try:
        report = audit(args.product, args.qa)
        print("G35 SOURCE PASS: original CAD Program.cs functionality retained; exact two G34 repairs "
              "applied, trusted production helper identical to tested code; source tree clean")
        print("G35 pinned CAD base:", report["cadBaseSha"], "candidate:", report["candidateSha"])
    except (RuntimeError, OSError, subprocess.CalledProcessError, UnicodeError) as err:
        print("G35 FAIL-CLOSED INTEGRATION: " + str(err), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
