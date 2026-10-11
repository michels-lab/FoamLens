#!/usr/bin/env python3
"""Build exact-artifact screenshot provenance for both Windows distribution modes."""
import argparse
import hashlib
import json
import re
from pathlib import Path

from PIL import Image


def hashfile(path):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--evidence-dir", type=Path, required=True,
                        help="Screenshots captured by the installed Windows app")
    parser.add_argument("--portable-evidence-dir", type=Path,
                        help="Screenshots captured by the portable Windows app")
    parser.add_argument("--artifact", type=Path, required=True)
    parser.add_argument("--portable-artifact", type=Path)
    parser.add_argument("--source-sha", required=True)
    parser.add_argument("--platform", required=True)
    parser.add_argument("--capture-method", default="installed-windows-desktop")
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    if not re.fullmatch(r"[0-9a-fA-F]{40}", args.source_sha):
        raise SystemExit("Source SHA must be a complete 40-character hexadecimal Git commit")
    if not args.artifact.is_file():
        raise SystemExit("Candidate artifact must exist")
    direct_windows = args.platform == "windows"
    if direct_windows and (args.portable_artifact is None or not args.portable_artifact.is_file()
                           or args.portable_evidence_dir is None):
        raise SystemExit("Direct Windows requires both portable binary and separate runtime evidence")
    if not direct_windows and (args.portable_artifact is not None or args.portable_evidence_dir is not None):
        raise SystemExit("Nonportable channels must not claim a portable Windows variant")

    root = args.output.parent.resolve()
    root.mkdir(parents=True, exist_ok=True)
    installer_sha = hashfile(args.artifact)
    portable_sha = hashfile(args.portable_artifact) if direct_windows else None
    records = []

    candidates = [("installed", args.evidence_dir, installer_sha, args.capture_method)]
    if direct_windows:
        candidates.append(("portable", args.portable_evidence_dir, portable_sha, "running-desktop-app"))
    for variant, evidence_dir, candidate_sha, capture_method in candidates:
        for viewport in ("wide", "compact"):
            opening_about_hash = None
            for name, surface in (
                (f"home-{viewport}.png", "home"),
                (f"about-{viewport}.png", "about"),
                (f"about-{viewport}-bottom.png", "about"),
                (f"field-{viewport}.png", "field"),
                (f"data-{viewport}.png", "data"),
            ):
                file = (evidence_dir / name).resolve()
                if not file.is_file() or not file.is_relative_to(root):
                    raise SystemExit(f"Missing/out-of-root real {variant} screenshot: {file}")
                digest = hashfile(file)
                if name == f"about-{viewport}.png":
                    opening_about_hash = digest
                elif name == f"about-{viewport}-bottom.png" and digest == opening_about_hash:
                    # About can already fit at launch. Retain the physical image,
                    # but do not count identical bytes as an extra evidence item.
                    print(f"{variant} About {viewport}: bottom capture duplicates opening view; omitted")
                    continue
                with Image.open(file) as img:
                    width, height = img.size
                records.append({
                    "platform": args.platform,
                    "runtime_variant": variant,
                    "surface": surface,
                    "viewport": viewport,
                    "path": str(file.relative_to(root)).replace("\\", "/"),
                    "sha256": digest,
                    "width": width,
                    "height": height,
                    "capture_method": capture_method,
                    "candidate_artifact_sha256": candidate_sha,
                })

    manifest = {
        "schema": "michelslab-rendered-ui-v1",
        "source_commit": args.source_sha,
        "artifact_sha256": {args.platform: installer_sha},
        "screenshots": records,
    }
    if direct_windows:
        manifest["portable_artifact_sha256"] = {args.platform: portable_sha}
    args.output.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    by_variant = {variant: sum(shot["runtime_variant"] == variant for shot in records)
                  for variant, _, _, _ in candidates}
    print(f"Recorded {by_variant} candidate UI screenshots; artifact={installer_sha}; portable={portable_sha}")


if __name__ == "__main__":
    main()
