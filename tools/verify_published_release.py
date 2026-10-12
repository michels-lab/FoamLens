#!/usr/bin/env python3
"""Audit downloaded, published FoamLens Windows Release binaries and checksums.

Run only against assets downloaded from GitHub Releases, not Actions candidate zips.
Exit nonzero on missing, replaced, truncated or checksum-mismatched public assets.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path


def _expected(version: str) -> list[str]:
    if not re.fullmatch(r"\d+\.\d+\.\d+", version):
        raise ValueError("Invalid release version")
    return [
        f"FoamLens-Setup-v{version}.exe",
        f"FoamLens-Setup-v{version}.exe.sha256",
        f"FoamLens-Portable-v{version}.exe",
        f"FoamLens-Portable-v{version}.exe.sha256",
    ]


def verify_release(metadata: dict, folder: Path, version: str) -> dict:
    tag = "v" + version
    if metadata.get("tagName") != tag:
        raise ValueError("Published tag does not match the requested version")
    if metadata.get("isDraft") is not False or metadata.get("isPrerelease") is not False:
        raise ValueError("Release is draft/prerelease, not a stable public release")
    if not metadata.get("publishedAt") or not str(metadata.get("url", "")).startswith("https://github.com/"):
        raise ValueError("No confirmed public release timestamp or canonical URL")

    asset_list = metadata.get("assets")
    if not isinstance(asset_list, list):
        raise ValueError("Release asset metadata missing")
    assets = {x.get("name"): x for x in asset_list if isinstance(x, dict)}
    names = _expected(version)
    if not set(names).issubset(assets):
        raise ValueError("Required published Setup/Portable binaries or SHA-256 assets missing")
    if not all((folder / name).is_file() for name in names):
        raise ValueError("Missing downloaded public release assets")

    digests = {}
    for binary in (names[0], names[2]):
        exe = folder / binary
        checksum_file = folder / (binary + ".sha256")
        checksum = checksum_file.read_bytes().decode("ascii").strip()
        match = re.fullmatch(r"([0-9a-fA-F]{64})  " + re.escape(binary), checksum)
        if not match:
            raise ValueError(f"Missing or malformed checksum with exact filename: {binary}")

        digest = hashlib.file_digest(exe.open("rb"), "sha256").hexdigest()
        if digest.lower() != match.group(1).lower():
            raise ValueError(f"Published binary SHA-256 mismatch: {binary}")
        disk_size = exe.stat().st_size
        if disk_size < 1_000_000 or disk_size != int(assets[binary].get("size", -1)):
            raise ValueError(f"Published binary size/provenance mismatch: {binary}")

        with exe.open("rb") as stream:
            if stream.read(2) != b"MZ":
                raise ValueError(f"Published executable is not a Windows PE file: {binary}")
            stream.seek(0x3C)
            offset_bytes = stream.read(4)
            if len(offset_bytes) != 4:
                raise ValueError(f"Truncated PE header: {binary}")
            pe_offset = int.from_bytes(offset_bytes, "little")
            if not 64 <= pe_offset < disk_size - 4:
                raise ValueError(f"Invalid Windows PE offset: {binary}")
            stream.seek(pe_offset)
            if stream.read(4) != b"PE\x00\x00":
                raise ValueError(f"Invalid Windows PE signature: {binary}")

        declared_checksum_size = int(assets[binary + ".sha256"].get("size", -1))
        if checksum_file.stat().st_size != declared_checksum_size:
            raise ValueError(f"Published checksum metadata size mismatch: {binary}")
        digests[binary] = {"sha256": digest, "bytes": disk_size}

    return {
        "status": "verified",
        "tag": tag,
        "release_url": metadata["url"],
        "published_at": metadata["publishedAt"],
        "verification_scope": "Actual public Setup and Portable PE assets, GitHub asset-size parity and SHA-256; no Authenticode or owner-device certification",
        "binaries": digests,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--version", required=True)
    parser.add_argument("--metadata", type=Path, required=True)
    parser.add_argument("--dir", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    doc = json.loads(args.metadata.read_text(encoding="utf-8"))
    result = verify_release(doc, args.dir, args.version)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
