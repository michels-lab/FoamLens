#!/usr/bin/env python3
"""Fail-closed rendered-UI evidence check for Michel's Lab shipping candidates.

This verifies image integrity, coverage and source/artifact binding. Automated
publication uses --capture-only; the owner reviews visuals after publication.
The optional explicit human-review mode remains available for separate audits.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

from PIL import Image, ImageStat, UnidentifiedImageError

HEX = re.compile(r"^[0-9a-fA-F]{64}$")
SCHEMA = "michelslab-rendered-ui-v1"
BOT = ("bot", "agent", "automation", "copilot", "chatgpt", "gpt-")


def check_evidence(manifest: Path, source_sha: str, required_platforms: list[str],
                   required_surfaces: list[str], require_review: bool = True,
                   require_portable: bool = False,
                   require_multiregion: bool = False,
                   artifact_paths: dict[str, Path] | None = None,
                   portable_artifact_paths: dict[str, Path] | None = None) -> list[str]:
    errors = []
    if not re.fullmatch(r"[0-9a-fA-F]{40}", source_sha):
        return ["Source SHA must be a full 40-character commit hash"]
    try:
        doc = json.loads(manifest.read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        return [f"Cannot read visual evidence manifest: {exc}"]
    if doc.get("schema") != SCHEMA:
        errors.append(f"Invalid evidence schema: expected {SCHEMA}")
    if doc.get("source_commit", "").lower() != source_sha.lower():
        errors.append("Visual evidence is not bound to exact candidate commit")
    artifacts = doc.get("artifact_sha256") or {}
    portable_artifacts = doc.get("portable_artifact_sha256") or {}
    shots = doc.get("screenshots") or []
    if not isinstance(shots, list) or not shots:
        return errors + ["No rendered-app screenshots supplied"]
    coverage = defaultdict(set)
    coverage_by_viewport = defaultdict(set)
    viewport_sizes = defaultdict(set)
    hashes = defaultdict(set)
    base = manifest.parent.resolve()
    for platform in required_platforms:
        if not HEX.fullmatch(str(artifacts.get(platform, ""))):
            errors.append(f"Missing real candidate artifact SHA-256 for {platform}")
        if require_portable and not HEX.fullmatch(str(portable_artifacts.get(platform, ""))):
            errors.append(f"Missing real portable candidate SHA-256 for {platform}")
    # A manifest digest is merely a claim until the actual current candidate
    # binary is independently hashed at the validation/publication boundary.
    for variant, paths, declared in (
        ("installed", artifact_paths, artifacts),
        ("portable", portable_artifact_paths, portable_artifacts),
    ):
        if paths is None:
            continue
        for platform in required_platforms:
            candidate = paths.get(platform)
            if candidate is None or not Path(candidate).is_file():
                errors.append(f"{platform}/{variant}: exact candidate binary missing")
                continue
            digest = hashlib.sha256()
            try:
                with Path(candidate).open("rb") as stream:
                    for chunk in iter(lambda: stream.read(1024 * 1024), b""):
                        digest.update(chunk)
                if digest.hexdigest() != str(declared.get(platform, "")).lower():
                    errors.append(f"{platform}/{variant}: candidate binary SHA-256 differs from evidence manifest")
            except OSError as exc:
                errors.append(f"{platform}/{variant}: cannot hash candidate binary: {exc}")
    for idx, shot in enumerate(shots):
        prefix = f"screenshot[{idx}]"
        if not isinstance(shot, dict):
            errors.append(f"{prefix}: must be an object")
            continue
        platform, surface = shot.get("platform"), shot.get("surface")
        variant = shot.get("runtime_variant", "installed")
        if not isinstance(platform, str) or not isinstance(surface, str):
            errors.append(f"{prefix}: platform/surface missing")
            continue
        if variant not in ("installed", "portable"):
            errors.append(f"{prefix}: invalid Windows runtime variant {variant!r}")
            continue
        if shot.get("capture_method") not in (
            "installed-android-emulator", "installed-android-device",
            "installed-windows-desktop", "running-desktop-app",
            "running-browser", "installed-ios-simulator", "installed-ios-device",
        ):
            errors.append(f"{prefix}: screenshot capture must originate from running app")
        expected_digest = (portable_artifacts if variant == "portable" else artifacts).get(platform)
        if shot.get("candidate_artifact_sha256") != expected_digest or not HEX.fullmatch(str(expected_digest or "")):
            errors.append(f"{prefix}: {variant} screenshot not tied to its own candidate artifact digest")
        if require_portable and platform == "windows":
            expected_method = "running-desktop-app" if variant == "portable" else "installed-windows-desktop"
            if shot.get("capture_method") != expected_method:
                errors.append(f"{prefix}: {variant} screenshot has incorrect runtime capture method")
        rel = shot.get("path", "")
        file = (base / rel).resolve() if isinstance(rel, str) else base
        if not isinstance(rel, str) or not rel or not file.is_relative_to(base):
            errors.append(f"{prefix}: invalid/out-of-root screenshot path")
            continue
        if require_portable and platform == "windows" and Path(rel).parts[0] != variant:
            errors.append(f"{prefix}: {variant} screenshot path outside its runtime directory")
        try:
            data = file.read_bytes()
            actual = hashlib.sha256(data).hexdigest()
            if actual != str(shot.get("sha256", "")).lower():
                errors.append(f"{prefix}: screenshot checksum mismatch")
            if actual in hashes[(platform, variant)]:
                errors.append(f"{prefix}: duplicate {variant} screenshot bytes; likely reused surface/viewport")
            hashes[(platform, variant)].add(actual)
            if len(data) < 3000:
                errors.append(f"{prefix}: screenshot is implausibly small")
            with Image.open(file) as raw:
                raw.verify()
            with Image.open(file) as raw:
                width, height = raw.size
                if width < 320 or height < 320:
                    errors.append(f"{prefix}: insufficient screenshot dimensions {width}x{height}")
                rgb = raw.convert("RGB")
                sample = rgb.resize((80, 80))
                spread = ImageStat.Stat(sample).stddev
                if max(spread) < 9.0:
                    errors.append(f"{prefix}: visually near-uniform/blank screenshot")
                if (shot.get("width"), shot.get("height")) != (width, height):
                    errors.append(f"{prefix}: declared dimensions differ from actual image")
                viewport_sizes[(platform, variant)].add((width, height))
        except (OSError, UnidentifiedImageError, ValueError) as exc:
            errors.append(f"{prefix}: image decode/validation failed: {exc}")
            continue
        coverage[(platform, variant)].add(surface)
        coverage_by_viewport[(platform, variant, surface)].add(shot.get("viewport"))
    for platform in required_platforms:
        required_variants = ("installed", "portable") if require_portable else ("installed",)
        for variant in required_variants:
            for surface in required_surfaces:
                if surface not in coverage[(platform, variant)]:
                    errors.append(f"{platform}/{variant}: missing rendered {surface} screenshot")
                if not {"wide", "compact"}.issubset(coverage_by_viewport[(platform, variant, surface)]):
                    errors.append(f"{platform}/{variant}: missing wide/compact rendered {surface} coverage")
            if len(viewport_sizes[(platform, variant)]) < 2:
                errors.append(f"{platform}/{variant}: at least two distinct viewport sizes required")
            if require_multiregion and (
                platform != "windows" or
                "real-metal-mold" not in coverage_by_viewport[(platform, variant, "field-multiregion")]
            ):
                errors.append(f"{platform}/{variant}: missing real metal/mold WebView2 multiregion evidence")
    if require_review:
        review = doc.get("human_visual_review") or {}
        name = str(review.get("reviewer", "")).strip()
        if review.get("decision") != "approved":
            errors.append("Human visual reviewer has not approved candidate images")
        if not name or any(part in name.lower() for part in BOT):
            errors.append("Human reviewer identity missing or automated")
        if review.get("source_commit", "").lower() != source_sha.lower():
            errors.append("Visual review is stale relative to candidate commit")
        if not review.get("reviewed_at") or not str(review.get("evidence_url", "")).startswith("https://"):
            errors.append("Visual review date or immutable evidence URL is missing")
        if review.get("blocking_findings"):
            errors.append("Visual reviewer recorded blocking defects")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", required=True, type=Path)
    parser.add_argument("--source-sha", required=True)
    parser.add_argument("--platforms", required=True, help="Comma-separated shipped UI platforms")
    parser.add_argument("--surfaces", default="home,about",
                        help="Comma-separated mandatory + changed UI surfaces")
    parser.add_argument("--capture-only", action="store_true",
                        help="Validate actual screenshot and candidate integrity; owner visual review follows publication")
    parser.add_argument("--require-portable", action="store_true",
                        help="Require separately captured portable and installed UI evidence at both viewport sizes")
    parser.add_argument("--require-multiregion", action="store_true",
                        help="Require real imported metal/mold Field scene screenshot from both native Windows runtime variants")
    parser.add_argument("--artifact", type=Path,
                        help="Rehash the actual installed Setup/MSIX candidate against the evidence manifest")
    parser.add_argument("--portable-artifact", type=Path,
                        help="Rehash the exact portable EXE against its separate manifest digest")
    args = parser.parse_args()
    platforms = [p.strip() for p in args.platforms.split(",") if p.strip()]
    surfaces = [p.strip() for p in args.surfaces.split(",") if p.strip()]
    if not platforms or not {"home", "about"}.issubset(surfaces):
        parser.error("Must declare shipped platforms and include home,about")
    if args.require_multiregion and (platforms != ["windows"] or not args.require_portable):
        parser.error("Real multiregion evidence requires Windows with both installed and portable screenshots")
    if args.require_portable and (not args.artifact or not args.portable_artifact):
        parser.error("Windows portable/installed validation requires both exact binary paths")
    errors = check_evidence(args.manifest, args.source_sha, platforms, surfaces,
                            require_review=not args.capture_only,
                            require_portable=args.require_portable,
                            require_multiregion=args.require_multiregion,
                            artifact_paths={platforms[0]: args.artifact} if args.artifact and len(platforms)==1 else None,
                            portable_artifact_paths={platforms[0]: args.portable_artifact} if args.portable_artifact and len(platforms)==1 else None)
    for problem in errors:
        print("::error::" + problem, file=sys.stderr)
    if errors:
        print(f"RENDERED UI RELEASE GATE: FAIL ({len(errors)} issue(s))")
        return 1
    print("RENDERED UI RELEASE GATE: PASS — image integrity/coverage confirmed."
          + (" Owner visual review follows publication." if args.capture_only else " Human review verified."))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
