#!/usr/bin/env python3
"""Collect actual, local, OpenFOAM checkMesh -region stdout for FoamLens #150.

This does not run the CFD solver, edit its configuration, guess mesh quality,
upload scientific files, or certify a mesh. It fails closed if the output
identities disagree with OpenFOAM's named-mesh creation markers.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys
from datetime import datetime, timezone

LABEL = re.compile(r"^[A-Za-z0-9_.-]{1,120}$")
EXEC = re.compile(r"^\s*Exec\s*:\s*checkMesh(?:\s|$)(.*)$", re.I)
OPTION = re.compile(r"(?:^|\s)-region(?:\s+|=)([A-Za-z0-9_.-]{1,120})(?=\s|$)")
MESH = re.compile(
    r"^\s*Create\s+(?:polyMesh|mesh)\s+([A-Za-z0-9_.-]{1,120})"
    r"\s+for\s+time\s*=\s*[-+]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?\s*$",
    re.I,
)
OK = re.compile(r"^\s*Mesh\s+OK\.\s*$", re.I | re.M)
MESH_FILES = ("points", "faces", "owner", "neighbour", "boundary")
MAX_IMPORT_BYTES = 12 * 1024 * 1024


class CaptureError(Exception):
    """Fail-closed local capture error."""


def region_marker_evidence(raw: bytes) -> dict:
    text = raw.decode("utf-8", "replace")
    commands, created = set(), set()
    for line in text.splitlines():
        command = EXEC.match(line)
        if command:
            commands.update(OPTION.findall(command.group(1)))
        mesh = MESH.match(line)
        if mesh:
            created.add(mesh.group(1))
    valid = len(commands) == 1 and commands == created
    return {
        "region": next(iter(commands)) if valid else None,
        "commandLabels": sorted(commands),
        "meshCreationLabels": sorted(created),
        "matched": valid,
        "terminalMeshOk": bool(OK.search(text)),
    }


def discover_regions(case_dir: Path, requested: list[str] | None) -> list[str]:
    constant = case_dir / "constant"
    if not constant.is_dir():
        raise CaptureError("Case does not contain the constant/ directory")
    found = sorted(
        p.name for p in constant.iterdir()
        if p.is_dir() and LABEL.fullmatch(p.name) and (p / "polyMesh").is_dir()
    )
    if not found:
        raise CaptureError("No named constant/<region>/polyMesh mesh directories found")
    chosen = requested or found
    if any(not LABEL.fullmatch(x) for x in chosen) or len(set(chosen)) != len(chosen):
        raise CaptureError("Invalid or duplicate region label")
    if any(x not in found for x in chosen):
        raise CaptureError("Requested region has no corresponding named polyMesh")
    return sorted(chosen)


def mesh_fingerprints(case_dir: Path, region: str) -> dict:
    poly = case_dir / "constant" / region / "polyMesh"
    fingerprints = {}
    for filename in MESH_FILES:
        src = poly / filename
        if not src.is_file():
            raise CaptureError(f"Region {region}: missing original polyMesh/{filename}")
        sha = hashlib.sha256()
        with src.open("rb") as handle:
            for part in iter(lambda: handle.read(1024 * 1024), b""):
                sha.update(part)
        fingerprints[filename] = sha.hexdigest()
    return fingerprints


def capture(
    case: Path,
    output: Path,
    regions: list[str] | None = None,
    executable: str = "checkMesh",
    timeout: int = 900,
) -> dict:
    case = case.expanduser().resolve()
    output = output.expanduser().resolve()
    if not case.is_dir():
        raise CaptureError("Original OpenFOAM case directory does not exist")
    if output == case or output.is_relative_to(case):
        raise CaptureError("Output must be OUTSIDE the original OpenFOAM case")
    if output.exists() and (not output.is_dir() or any(output.iterdir())):
        raise CaptureError("Output directory must be absent or empty: never overwrite previous reports")
    chosen = discover_regions(case, regions)
    if not 1 <= timeout <= 7200:
        raise CaptureError("Timeout must be between 1 and 7200 seconds")
    if not shutil.which(executable):
        raise CaptureError("checkMesh executable was not found; activate OpenFOAM first")
    before = {r: mesh_fingerprints(case, r) for r in chosen}
    output.mkdir(parents=True, exist_ok=True)
    rows = []
    for region in chosen:
        command = [executable, "-case", str(case), "-region", region, "-allTopology", "-allGeometry"]
        status, exit_code = "not-run", None
        try:
            result = subprocess.run(command, cwd=case, capture_output=True, timeout=timeout, check=False)
            stdout = result.stdout
            stderr = result.stderr
            exit_code = result.returncode
            status = "captured"
        except subprocess.TimeoutExpired as exc:
            stdout = exc.stdout or b""
            stderr = exc.stderr or b""
            status = "timed-out"
        log_name = f"checkMesh_{region}.log"
        (output / log_name).write_bytes(stdout)
        if stderr:
            (output / f"checkMesh_{region}.stderr.txt").write_bytes(stderr)
        evidence = region_marker_evidence(stdout)
        after = mesh_fingerprints(case, region)
        if before[region] != after:
            status = "mesh-fingerprints-changed"
        elif status == "timed-out":
            pass
        elif exit_code != 0:
            status = "checkMesh-nonzero-exit"
        elif len(stdout) > MAX_IMPORT_BYTES:
            status = "too-large-for-FoamLens-import"
        elif not evidence["matched"] or evidence["region"] != region:
            status = "region-not-proven-by-both-markers"
        elif not evidence["terminalMeshOk"]:
            status = "no-terminal-Mesh-OK"
        elif stderr:
            status = "stderr-requires-manual-review"
        else:
            status = "source-report-ready-not-certified"
        rows.append({
            "region": region,
            "status": status,
            "exitCode": exit_code,
            "log": log_name,
            "logSha256": hashlib.sha256(stdout).hexdigest(),
            "stderrPresent": bool(stderr),
            "meshFilesSha256Before": before[region],
            "meshFilesUnchanged": before[region] == after,
            "sourceMarkers": evidence,
            "scientificValidity": "not-certified",
        })
    manifest = {
        "schema": "foamlens/local-checkmesh-region-capture/1",
        "createdUtc": datetime.now(timezone.utc).isoformat(),
        "caseLabel": case.name,
        "caseLocationExported": False,
        "regions": rows,
        "allSourceReportsReady": all(r["status"] == "source-report-ready-not-certified" for r in rows),
        "scientificValidity": "not-certified",
        "limitations": [
            "Original checkMesh stdout is preserved LOCALLY and can contain the full case path. Never upload logs without reviewing privacy.",
            "File hashes prove only that the sampled source polyMesh files were unchanged during this local capture, not independent scientific correctness.",
            "This script does not check inter-region face pairing, thermodynamics, CAD alignment, solver validity or Windows installer acceptance.",
            "FoamLens imports only the original checkMesh text files; the local manifest is supporting provenance, not cryptographic runtime binding.",
        ],
    }
    (output / "checkMesh_capture_manifest.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    return manifest


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--case", type=Path, required=True, help="Original OpenFOAM case")
    ap.add_argument("--output", type=Path, required=True, help="New/empty directory OUTSIDE case")
    ap.add_argument("--region", action="append", default=None, help="Region name; repeat or omit to auto-discover")
    ap.add_argument("--check-mesh", default="checkMesh", help="OpenFOAM checkMesh executable")
    ap.add_argument("--timeout", type=int, default=900, help="Per-region seconds, 1 to 7200")
    args = ap.parse_args()
    try:
        result = capture(args.case, args.output, args.region, args.check_mesh, args.timeout)
    except CaptureError as exc:
        print(f"checkMesh capture blocked: {exc}", file=sys.stderr)
        return 2
    for item in result["regions"]:
        print(f"{item['region']}: {item['status']}")
    print("Local source logs/manifests saved. Scientific validity: NOT CERTIFIED.")
    return 0 if result["allSourceReportsReady"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
