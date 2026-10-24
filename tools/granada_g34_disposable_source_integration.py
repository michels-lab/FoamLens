#!/usr/bin/env python3
"""G34 disposable checkout-only safe-source test integration.
Original repo main and competing CAD owner PR remain untouched.
"""
import argparse
import pathlib
import re
import sys

OLD_FIRST = '''        var extensionPaths = Directory.GetFiles(AppRoot, "v*-*.js")
            .OrderBy(path => path, StringComparer.OrdinalIgnoreCase)
            .ToArray();
        if (extensionPaths.Length == 0) return;'''
NEW_FIRST = '''        // G34 temporary Windows QA integration candidate: trusted embedded product JS only.
        // This copy of original main is disposable; original owner Program.cs stays untouched.
        var bundledExtensions = TrustedEmbeddedFrontendExtensions.ReadFromRunningAssembly();'''
OLD_LAST = '''        var extension = string.Join(Environment.NewLine,
            extensionPaths.Select(path => File.ReadAllText(path, Encoding.UTF8)));'''
NEW_LAST = '''        var extension = string.Join(Environment.NewLine, bundledExtensions);'''


def integrate(original, allow):
    if original.count(OLD_FIRST) != 1 or original.count(OLD_LAST) != 1:
        raise RuntimeError("G34 original host source moved: refuse to fake patched test")
    if "TrustedEmbeddedFrontendExtensions.ReadFromRunningAssembly" in original:
        raise RuntimeError("G34 original host already has trust repair: don't duplicate")
    if "GetManifestResourceStream" not in allow or "Directory.GetFiles" in allow or "File.ReadAllText" in allow:
        raise RuntimeError("G34 standalone trusted module would still consult mutable filesystem")
    patched = original.replace(OLD_FIRST, NEW_FIRST).replace(OLD_LAST, NEW_LAST)
    if "extensionPaths" in patched[patched.index("private void ApplyFrontendExtensions()"):]:
        raise RuntimeError("G34 unhandled original on-disk extension code remains")
    if patched.count("TrustedEmbeddedFrontendExtensions.ReadFromRunningAssembly()") != 1:
        raise RuntimeError("G34 expected one bound embedded source path")
    return patched


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--program", type=pathlib.Path, required=True)
    ap.add_argument("--helper", type=pathlib.Path, required=True)
    ap.add_argument("--run", action="store_true", help="modify disposable product checkout only")
    ns = ap.parse_args()
    source = ns.program.read_text("utf-8")
    trusted = ns.helper.read_text("utf-8")
    transformed = integrate(source, trusted)
    if ns.run:
        ns.program.write_text(transformed, encoding="utf-8")
        print("G34 disposable original main Program.cs test host integration APPLIED (not a PR source edit)")
    else:
        print("G34 original main source patch sites/owned-file collision verified (not modified)")


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, OSError) as e:
        print("G34 FAIL CLOSED: " + str(e), file=sys.stderr)
        sys.exit(1)
