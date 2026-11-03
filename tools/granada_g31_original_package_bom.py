#!/usr/bin/env python3
"""G31: inspect the actual Windows FoamLens AppBundle, locked NuGet graph and executable.
Read-only, standard library, sanitized evidence. Does NOT grant release/signing approval.
"""
import argparse
import base64
import hashlib
import json
import re
import sys
import zipfile
from pathlib import Path, PurePosixPath
import xml.etree.ElementTree as ET

VERSION = "foamlens/granada-g31-original-packaged-bom/1"
MAX_UNCOMPRESSED = 160 * 1024 * 1024
MAX_MEMBER = 80 * 1024 * 1024
NAME_LIMIT = 512
SHA = re.compile(r"^[0-9a-fA-F]{40}$")
V_SCRIPT = re.compile(r"^v[0-9]+-[a-z0-9-]+[.]js$")
PACKAGE = re.compile(r"^[A-Za-z0-9_.+-]+$")
VERSION_SAFE = re.compile(r"^[0-9]+[.][0-9]+[.][0-9]+(?:[.-][A-Za-z0-9_.-]+)?$")


class EvidenceError(Exception):
    pass


def require(ok, message):
    if not ok:
        raise EvidenceError(message)


def digest_bytes(data):
    return hashlib.sha256(data).hexdigest()


def digest_file(path):
    with open(path, "rb") as f:
        h = hashlib.sha256()
        for block in iter(lambda: f.read(1024 * 1024), b""):
            h.update(block)
        return h.hexdigest()


def safe_member(info):
    orig = info.filename
    require(0 < len(orig) <= NAME_LIMIT, "unsafe archive member length")
    require("\x00" not in orig and "\\" not in orig, "Windows-ambiguous archive separator")
    require(not orig.startswith("/") and not orig.startswith("//"), "absolute archive member")
    require(not re.match(r"^[A-Za-z]:", orig), "drive-prefixed archive member")
    parts = orig.rstrip("/").split("/")
    require(all(p and p not in (".", "..") for p in parts), "traversal/dot/empty archive component")
    require(all(not p.endswith((" ", ".")) and ":" not in p for p in parts), "Windows-ambiguous archive component")
    require(all(p.upper().split(".")[0] not in
                ("CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4", "COM5",
                 "COM6", "COM7", "COM8", "COM9", "LPT1", "LPT2", "LPT3", "LPT4", "LPT5",
                 "LPT6", "LPT7", "LPT8", "LPT9") for p in parts),
            "reserved Windows archive filename")
    # UNIX ZIP symlink mode is not a regular file, even if Windows extraction masks it.
    mode = (info.external_attr >> 16) & 0o170000
    require(mode != 0o120000, "archive symlink disallowed")
    require(info.file_size <= MAX_MEMBER, "oversized archive member")
    if not info.is_dir():
        require(info.compress_size > 0 or info.file_size == 0, "archive member has impossible size")
        require(info.file_size <= max(1, info.compress_size) * 256, "possible compressed archive bomb")
    return "/".join(parts)


def expected_frontend(frontend, license_path):
    files = {"LICENSE.txt": license_path}
    require(frontend.is_dir() and license_path.is_file(), "original source frontend/LICENSE missing")
    home = frontend / "index.html"
    require(home.is_file(), "original frontend index missing")
    files["index.html"] = home
    ext = sorted(frontend.glob("v*-*.js"))
    require(len(ext) >= 20, "too few original frontend versioned modules")
    for f in ext:
        require(V_SCRIPT.fullmatch(f.name) is not None and f.is_file(), "unexpected main frontend JS module")
        files[f.name] = f
    assets = frontend / "assets"
    require(assets.is_dir(), "original frontend assets absent")
    for f in sorted(assets.rglob("*")):
        if f.is_file():
            require(not f.is_symlink(), "symlink in original frontend source assets")
            rel = f.relative_to(frontend).as_posix()
            require(rel not in files, "duplicate original asset path")
            files[rel] = f
    require(len(files) >= 30, "unusually small official FoamLens product package")
    return files


def audit_bundle(archive, frontend, license_path):
    expected = expected_frontend(frontend, license_path)
    require(archive.is_file(), "real packaged AppBundle.zip missing")
    seen = {}
    total = 0
    with zipfile.ZipFile(archive, "r") as z:
        require(z.testzip() is None, "CRC mismatch in real packaged bundle")
        for info in z.infolist():
            name = safe_member(info)
            if info.is_dir():
                continue
            normal = name.casefold()
            require(normal not in seen, "duplicate/case-colliding bundled file")
            seen[normal] = name
            total += info.file_size
            require(total <= MAX_UNCOMPRESSED, "unbounded packaged frontend expansion")
        real = set(seen.values())
        wanted = set(expected)
        require(real == wanted, "packaged frontend differs from exact source file allowlist"
                " (missing, injected or obsolete extension/file)")
        for relative, source in expected.items():
            # A per-file byte-for-byte hash proves actual build ZIP matches original source,
            # not only filenames. No raw source content or user paths enter the report.
            with z.open(relative) as src:
                require(digest_bytes(src.read(MAX_MEMBER + 1)) == digest_file(source),
                        "packaged asset bytes differ from original source")
    return {
        "zipSha256": digest_file(archive),
        "assetFileCount": len(expected),
        "assetUncompressedBytes": total,
        "exactOriginalFrontendAssetParity": True,
        "extraVersionedJsFilesRejected": True,
        "zipSlipAndWindowsPathCollisionsRejected": True,
    }


def audit_nuget(project, assets):
    require(project.is_file() and assets.is_file(), "NuGet restore sources missing")
    root = ET.parse(project).getroot()
    direct = {}
    for p in root.iter("PackageReference"):
        name = p.get("Include")
        ver = p.get("Version") or p.findtext("Version")
        require(name and PACKAGE.fullmatch(name) and ver and ver.strip(), "ambiguous direct NuGet dependency")
        require(name.casefold() not in direct, "duplicated direct NuGet dependency")
        require(not any(c in ver for c in ("*", "(", ")", "[", "]", "$")), "unpinned NuGet dependency")
        direct[name.casefold()] = (name, ver)
    require(bool(direct), "no original NuGet package references identified")
    graph = json.loads(assets.read_text(encoding="utf-8"))
    libraries = graph.get("libraries")
    targets = graph.get("targets")
    require(isinstance(libraries, dict) and libraries and isinstance(targets, dict) and targets,
            "incomplete NuGet real restore graph")
    resolved = {}
    for identity, lib in libraries.items():
        if lib.get("type") != "package":
            continue
        package, sep, ver = identity.partition("/")
        require(sep and PACKAGE.fullmatch(package) and VERSION_SAFE.fullmatch(ver),
                "invalid resolved NuGet package identity")
        encoded = lib.get("sha512")
        require(isinstance(encoded, str) and encoded.strip(), "NuGet package content SHA-512 missing")
        try:
            raw = base64.b64decode(encoded, validate=True)
        except Exception:
            raise EvidenceError("malformed original NuGet package SHA-512") from None
        require(len(raw) == 64, "invalid NuGet SHA-512 byte length")
        key = package.casefold()
        require(key not in resolved, "ambiguous multi-version NuGet dependency")
        resolved[key] = {"name": package, "version": ver, "sha512Hex": raw.hex()}
    for key, (name, version) in direct.items():
        require(key in resolved and resolved[key]["version"] == version,
                "direct NuGet version differs from actual restored dependency")
    require(all(any(identity.casefold().startswith(key + "/") for identity in libraries) for key in direct),
            "NuGet declared dependency not actually restored")
    return {
        "direct": [{"name": n, "version": v} for n, v in sorted(direct.values())],
        "resolved": sorted(resolved.values(), key=lambda x: x["name"].casefold()),
        "allRestoredPackagesSha512Bound": True,
        "directReferencesPinnedAndMatchRestore": True,
    }


def produce(args):
    require(SHA.fullmatch(args.main_sha) is not None, "unverified source SHA format")
    require(args.exe.is_file() and args.exe.name == "FoamLens.exe", "real Windows original FoamLens.exe absent")
    require(args.installer.is_file() and args.installer.name.startswith("FoamLens-Setup-v1.8.10"),
            "real original Inno Setup output absent")
    require(args.exe.stat().st_size > 1024 * 1024, "not an original self-contained native Windows binary")
    require(args.installer.stat().st_size > 1024 * 1024, "not an original Windows native Setup")
    bundle = audit_bundle(args.bundle, args.frontend, args.license)
    nuget = audit_nuget(args.project, args.assets)
    require(len(nuget["resolved"]) <= 100, "unexpectedly large restored dependency graph")
    evidence = {
        "schema": VERSION,
        "originalMainSha": args.main_sha.lower(),
        "distributionVersion": "1.8.10",
        "originalNativeWindowsExe": {"file": "FoamLens.exe", "sha256": digest_file(args.exe),
                                      "bytes": args.exe.stat().st_size},
        "originalNativeInnoSetup": {"file": args.installer.name, "sha256": digest_file(args.installer),
                                     "bytes": args.installer.stat().st_size},
        "actualPackagedFrontend": bundle,
        "actualNuGetRestore": nuget,
        "userCaseFilesRead": False,
        "reportContainsOriginalPaths": False,
        "securityAdvisoryDatabaseChecked": False,
        "originalWindowsUserVisualAcceptance": False,
        "actualPublisherAuthenticodeVerified": False,
        "releaseReady": False,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(evidence, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print("G31 PASS: ORIGINAL native Windows packaged FoamLens frontend exact-source parity + real NuGet SHA512 dependency BOM + Windows binary/installer SHA256")
    print("G31 not proved: online vulnerability advisories, license entitlement, publisher signing, original CFD numerical accuracy, physical owner DPI or final release readiness")
    return evidence


def parse(argv=None):
    ap = argparse.ArgumentParser(description=__doc__)
    for name in ("bundle", "frontend", "license", "project", "assets", "exe", "installer", "output"):
        ap.add_argument("--" + name, required=True, type=Path)
    ap.add_argument("--main-sha", required=True)
    return ap.parse_args(argv)


def main(argv=None):
    try:
        produce(parse(argv))
        return 0
    except (EvidenceError, OSError, ValueError, zipfile.BadZipFile, ET.ParseError) as e:
        print("G31 fail-closed artifact validation: " + str(e), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
