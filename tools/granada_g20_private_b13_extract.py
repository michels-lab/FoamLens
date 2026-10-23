#!/usr/bin/env python3
"""Windows-safe extraction of original PRIVATE QuickCup B13 blobs from Git, no GitHub Actions data artifact.

This is TEST-ONLY. Physical samples are never edited or invented; copies reuse the
same real B13 case identity and are not five independent experiments.
"""
import argparse
import hashlib
import json
import os
import posixpath
import re
import subprocess
from pathlib import Path

ROOT = "cases_controlled_buoyancy/B13_prghPressure_airGapOF14"
NAMES = ("SmokeCase_A", "SmokeCase_B", "SmokeCase_C", "SmokeCase_Asymmetric",
         "B13_prghPressure_airGapOF14")
REQUIRED = ("constant/metal/polyMesh/points", "constant/metal/polyMesh/faces",
            "constant/metal/polyMesh/owner", "0/metal/T", "0/mold/T",
            "9.8/metal/T", "9.8/mold/T")
BAD = re.compile(r'[<>:"\\|?*]')
RESERVED = {"CON", "PRN", "AUX", "NUL"} | {
    f"{prefix}{i}" for prefix in ("COM", "LPT") for i in range(1, 10)
}

def safe_rel(value):
    parts = value.split("/")
    return bool(value and all(
        p and p not in (".", "..") and p == p.rstrip(" .")
        and not BAD.search(p) and p.split(".", 1)[0].upper() not in RESERVED
        for p in parts
    ))

def sha(data):
    return hashlib.sha256(data).hexdigest()

def git(repo, *args):
    return subprocess.check_output(["git", "-C", str(repo), *args])

def objects(repo):
    raw = git(repo, "ls-tree", "-rz", "HEAD", "--", ROOT + "/")
    entries = {}
    for row in raw.split(b"\0"):
        if not row:
            continue
        header, name = row.split(b"\t", 1)
        mode, kind, object_id = header.decode("ascii").split()
        p = name.decode("utf-8", errors="strict")
        if kind == "blob" and p.startswith(ROOT + "/"):
            entries[p] = (mode, object_id)
    return entries

def resolve_blob(repo, entries, name, visited=None):
    visited = set() if visited is None else visited
    if name in visited or not name.startswith(ROOT + "/"):
        raise ValueError("External or cyclic research symlink prohibited")
    visited.add(name)
    mode, object_id = entries[name]
    data = git(repo, "cat-file", "blob", object_id)
    if mode != "120000":
        return data
    target = data.decode("utf-8")
    if target.startswith("/") or "\\" in target:
        raise ValueError("Unsafe research symlink")
    resolved = posixpath.normpath(posixpath.join(posixpath.dirname(name), target))
    if resolved not in entries:
        raise ValueError("Unresolvable or external research symlink")
    return resolve_blob(repo, entries, resolved, visited)

def prepare(repo, target):
    repo, target = Path(repo).resolve(), Path(target).resolve()
    if target.exists() or target == repo or repo in target.parents:
        raise ValueError("Destination must be new and outside private source Git repository")
    entries = objects(repo)
    selected = {}
    for filename in sorted(entries):
        rel = filename[len(ROOT)+1:]
        if not safe_rel(rel):
            continue
        try:
            selected[rel] = resolve_blob(repo, entries, filename)
        except ValueError:
            if rel in REQUIRED:
                raise
    for rel in REQUIRED:
        if rel not in selected or not selected[rel]:
            raise ValueError("Original measured B13 missing required file: " + rel)
    original = {rel: sha(selected[rel]) for rel in REQUIRED}
    # Never include any raw proprietary field data in the output manifest.
    target.mkdir(parents=True, exist_ok=False)
    for name in NAMES:
        base = target / name
        for rel, data in selected.items():
            file = base.joinpath(*rel.split("/"))
            file.parent.mkdir(parents=True, exist_ok=True)
            file.write_bytes(data)
            if rel in REQUIRED and sha(file.read_bytes()) != original[rel]:
                raise ValueError("Source scientific bytes changed during Windows transfer: " + rel)
    missing_mold = target / "SmokeCase_Asymmetric" / "9.8" / "mold" / "T"
    missing_mold.unlink()
    if missing_mold.exists():
        raise AssertionError("Asymmetric absent mold frame unexpectedly restored")
    if sha((target / "SmokeCase_Asymmetric" / "9.8" / "metal" / "T").read_bytes()) != original["9.8/metal/T"]:
        raise AssertionError("Real metal field was modified")
    return {
        "schema": "foamlens/granada-g20-exact-main-real-b13/1",
        "measured_case_origin": "QuickCup-Solidification@foamlens-real-fixture-b13",
        "source_cases": 1, "test_case_identities": list(NAMES),
        "source_fields": {rel: original[rel] for rel in REQUIRED},
        "original_files_per_case": len(selected),
        "asymmetric_case": "9.8/mold/T deliberately absent; no interpolation",
        "real_scientific_samples_invented": False, "numerical_accuracy_certified": False,
        "signoff": "PENDING"
    }

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", required=True)
    parser.add_argument("--target", required=True)
    parser.add_argument("--manifest", required=True)
    a = parser.parse_args()
    result = prepare(a.repo, a.target)
    out = Path(a.manifest)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print("Original B13 source extracted into five Windows-safe test identities, measured scientific bytes preserved.")

if __name__ == "__main__":
    main()
