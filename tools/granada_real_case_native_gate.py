#!/usr/bin/env python3
"""Fail-closed proof that packaged FoamLens actually ran B13 metal/mold View B.

Do not infer from a successful executable exit code, synthetic DOM tests,
zero-dimensional screenshots, or a missing fixture token. This report captures
only evidence provenance; it does not certify scientific accuracy.
"""
import argparse
import hashlib
import json
import struct
import zlib
from pathlib import Path

REQUIRED_LOGS = (
    "FoamLens scientific checkMesh inspector WebView2 smoke passed",
    "FoamLens CAD STL/OBJ WebView2 smoke passed",
    "FoamLens Granada equivalent-observables WebView2 smoke passed",
    "FoamLens real OpenFOAM physical multiregion WebGL smoke passed",
    "FoamLens real OpenFOAM View B metal+mold and metric XYZ smoke passed",
    "FoamLens real on-disk asymmetric region-time smoke passed",
    "FoamLens real OpenFOAM packaged runtime smoke passed",
    "FoamLens real two-region Field screenshot",
    "Windows smoke test passed",
)
PNG_HEADER = b"\x89PNG\r\n\x1a\n"
PNG_END = bytes.fromhex("0000000049454e44ae426082")


def screenshot(path: Path) -> dict:
    b = path.read_bytes()
    if len(b) < 4096 or not b.startswith(PNG_HEADER):
        raise ValueError("Real Field screenshot missing full PNG body")
    if b[12:16] != b"IHDR" or struct.unpack(">I", b[8:12])[0] != 13:
        raise ValueError("Real Field screenshot PNG IHDR invalid")
    ihdr = b[16:29]
    if zlib.crc32(b"IHDR" + ihdr) != struct.unpack(">I", b[29:33])[0]:
        raise ValueError("Real Field PNG header CRC mismatch")
    width, height = struct.unpack(">II", ihdr[:8])
    if width < 200 or height < 150 or width > 10000 or height > 10000:
        raise ValueError("Real Field screenshot dimensions implausible")
    if b"IDAT" not in b or not b.endswith(PNG_END):
        raise ValueError("Real Field screenshot missing PNG pixel data or end")
    return {"sha256": hashlib.sha256(b).hexdigest(),
            "width": width, "height": height, "bytes": len(b)}


def verify(log_text: str, fixture: dict, png_path: Path) -> dict:
    if fixture.get("schema") != "FoamLens-Granada-Real-OpenFOAM-B13-v1":
        raise ValueError("Fixture provenance schema unknown")
    if fixture.get("expected_regions") != ["metal", "mold"] or fixture.get("measured_requested_time") != 9.8:
        raise ValueError("Fixture no longer constrains B13 metal/mold 9.8 real time")
    for key in ("0/metal/T", "0/mold/T", "9.8/metal/T", "9.8/mold/T"):
        digest = str(fixture.get("required_file_sha256", {}).get(key, ""))
        if len(digest) != 64 or any(ch not in "0123456789abcdef" for ch in digest):
            raise ValueError("Physical source file digests missing or malformed")
    omitted = fixture.get("asymmetric_source_omission", {})
    if omitted.get("missing_file") != "9.8/mold/T" or omitted.get("fabricated_values") is not False:
        raise ValueError("Asymmetric case provenance false or incomplete")
    absent = [line for line in REQUIRED_LOGS if line not in log_text]
    if absent:
        raise ValueError("Actual Windows scientific smoke lacks required evidence: " + ", ".join(absent))
    field = screenshot(png_path)
    return {
        "schema": "FoamLens-Granada-Windows-B13-FieldF1-Result-v1",
        "result": "PASS_REAL_NATIVE_MULTIREGION_FIELD_F1",
        "source_fixture_identity": fixture["case_identity"],
        "requested_physical_time": 9.8,
        "expected_regions": fixture["expected_regions"],
        "verified_native_log_contracts": list(REQUIRED_LOGS),
        "real_field_screenshot": field,
        "read_only": True,
        "verified_scientific_accuracy": False,
        "verified_installed_or_portable": False,
        "human_visual_approval": False,
        "release_authorized": False,
    }


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--log", required=True, type=Path)
    p.add_argument("--fixture-manifest", required=True, type=Path)
    p.add_argument("--field-screenshot", required=True, type=Path)
    p.add_argument("--output", required=True, type=Path)
    a = p.parse_args()
    report = verify(a.log.read_text(encoding="utf-8", errors="replace"),
                    json.loads(a.fixture_manifest.read_text(encoding="utf-8")),
                    a.field_screenshot)
    a.output.parent.mkdir(parents=True, exist_ok=True)
    a.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print("Granada real B13 metal+mold OpenFOAM, View B physical XYZ, CAD/2D3D, "
          "checkMesh, asymmetric source and native PNG proof verified; "
          "physical accuracy and installed/portable not certified.")


if __name__ == "__main__":
    main()
