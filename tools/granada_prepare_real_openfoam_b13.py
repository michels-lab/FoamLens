#!/usr/bin/env python3
"""Granada: prepare unmodified measured B13 OpenFOAM values for native Windows QA.

Original 3D source is QuickCup-Solidification/foamlens-real-fixture-b13.
The only altered physical-frame availability is the explicit REMOVAL of
t=9.8 mold T from an isolated, clearly labeled asynchronous-case clone.
Never fill missing samples, shift times, interpolate, or change measurements.
"""
import argparse
import hashlib
import json
import re
import shutil
from pathlib import Path

NAMES = (
    "SmokeCase_A",
    "SmokeCase_B",
    "SmokeCase_C",
    "SmokeCase_Asymmetric",
    "B13_prghPressure_airGapOF14",
)
REQUIRED = (
    "constant/metal/polyMesh/points",
    "constant/metal/polyMesh/faces",
    "constant/metal/polyMesh/owner",
    "0/metal/T",
    "0/mold/T",
    "9.8/metal/T",
    "9.8/mold/T",
)
INVALID_WINDOWS = re.compile(r'[<>:"\\|?*]')
RESERVED = {"CON", "PRN", "AUX", "NUL"} | {
    f"{prefix}{i}" for prefix in ("COM", "LPT") for i in range(1, 10)
}


def safe_relative(relative: Path) -> bool:
    for part in relative.parts:
        if part in ("", ".", "..") or part.endswith((" ", ".")):
            return False
        if INVALID_WINDOWS.search(part) or part.split(".", 1)[0].upper() in RESERVED:
            return False
    return True


def sha256(file: Path) -> str:
    h = hashlib.sha256()
    with file.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def prepare(source: Path, destination: Path) -> dict:
    source = source.resolve(strict=True)
    destination = destination.resolve(strict=False)
    if destination == source or source in destination.parents or destination in source.parents:
        raise ValueError("Source and destination must be separate, non-overlapping directories")
    if not source.is_dir():
        raise ValueError("Source is not an OpenFOAM case directory")
    for rel in REQUIRED:
        file = source / rel
        if not file.is_file() or file.is_symlink() or file.stat().st_size == 0:
            raise ValueError(f"Real B13 measured source missing: {rel}")
    if destination.exists():
        raise ValueError("Refusing to overwrite preexisting candidate fixture")
    files = []
    skipped_unsafe = 0
    skipped_external_links = 0
    copied_internal_links = 0
    for file in sorted(source.rglob("*")):
        rel = file.relative_to(source)
        if file.is_symlink():
            # The PRIVATE QuickCup case genuinely uses symlinks. Dereference
            # only normal files whose canonical content remains INSIDE B13.
            # Never ship symlinks or fetch files outside the source tree.
            target = file.resolve(strict=False)
            if source not in target.parents or not target.is_file():
                skipped_external_links += 1
                continue
            if safe_relative(rel):
                files.append(rel)
                copied_internal_links += 1
            else:
                skipped_unsafe += 1
        elif file.is_file():
            if safe_relative(rel):
                files.append(rel)
            else:
                skipped_unsafe += 1
    if len(files) < len(REQUIRED):
        raise ValueError("Insufficient source evidence for real multiregion case")
    source_hashes = {rel: sha256(source / rel) for rel in REQUIRED}
    source_sizes = {rel: (source / rel).stat().st_size for rel in REQUIRED}
    try:
        destination.mkdir(parents=True, exist_ok=False)
        for name in NAMES:
            target = destination / name
            for rel in files:
                target_file = target / rel
                target_file.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(source / rel, target_file)
        for name in NAMES:
            target = destination / name
            for rel in REQUIRED:
                copied = target / rel
                if sha256(copied) != source_hashes[rel]:
                    raise ValueError(f"Measured source altered in clone {name}/{rel}")
        # Create measured time asymmetry solely through a documented omission.
        asymmetric = destination / "SmokeCase_Asymmetric"
        (asymmetric / "9.8/mold/T").unlink()
        if (asymmetric / "9.8/mold/T").exists():
            raise ValueError("Real asymmetric mold omission did not persist")
        if sha256(asymmetric / "9.8/metal/T") != source_hashes["9.8/metal/T"]:
            raise ValueError("Asymmetric case changed original metal temperature")
        if sha256(asymmetric / "0/mold/T") != source_hashes["0/mold/T"]:
            raise ValueError("Asymmetric case changed original mold t=0 temperature")
        summary = {
            "schema": "FoamLens-Granada-Real-OpenFOAM-B13-v1",
            "case_identity": "B13_prghPressure_airGapOF14",
            "origin": "realmichelduarte/QuickCup-Solidification@foamlens-real-fixture-b13",
            "science_status": "MEASURED_SOURCE_COPIED_UNMODIFIED_EXCEPT_DOCUMENTED_OMISSION",
            "case_names": list(NAMES),
            "expected_regions": ["metal", "mold"],
            "expected_field": "T",
            "measured_requested_time": 9.8,
            "required_file_sha256": source_hashes,
            "required_file_sizes": source_sizes,
            "source_file_count": len(files),
            "windows_unsafe_source_paths_excluded": skipped_unsafe,
            "original_internal_file_links_dereferenced": copied_internal_links,
            "outside_source_or_directory_symlinks_excluded": skipped_external_links,
            "asymmetric_source_omission": {
                "case": "SmokeCase_Asymmetric",
                "missing_file": "9.8/mold/T",
                "retained_measured_files": ["0/mold/T", "9.8/metal/T"],
                "interpolation": False,
                "fabricated_values": False,
            },
            "calibration_or_scientific_accuracy_certified": False,
            "production_approved": False,
        }
        return summary
    except BaseException:
        shutil.rmtree(destination, ignore_errors=True)
        raise


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True, type=Path)
    parser.add_argument("--destination", required=True, type=Path)
    parser.add_argument("--manifest", required=True, type=Path)
    args = parser.parse_args()
    manifest = prepare(args.source, args.destination)
    args.manifest.parent.mkdir(parents=True, exist_ok=True)
    args.manifest.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"Granada B13 measured source cloned: {len(NAMES)} case identities; "
          f"{manifest['source_file_count']} originals/case; "
          f"{manifest['original_internal_file_links_dereferenced']} internal links resolved; "
          f"{manifest['outside_source_or_directory_symlinks_excluded']} external/directory links excluded; "
          "metal/mold 9.8 T present; isolated asymmetric mold T REMOVED")


if __name__ == "__main__":
    main()
