#!/usr/bin/env python3
"""Synthetic log / PNG fixtures ONLY. They do not substitute real native tests."""
import hashlib
import io
import json
import struct
import sys
import tempfile
import unittest
import zlib
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from granada_real_case_native_gate import REQUIRED_LOGS, screenshot, verify


def chunk(name: bytes, data: bytes) -> bytes:
    return (struct.pack(">I", len(data)) + name + data +
            struct.pack(">I", zlib.crc32(name + data)))


def test_png(path: Path) -> None:
    # Artificial, self-contained valid PNG solely for the gate's contract tests.
    width, height = 640, 480
    pixels = b"".join(b"\x00" + b"\x01\x02\x03" * width for _ in range(height))
    contents = (b"\x89PNG\r\n\x1a\n" +
                chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)) +
                chunk(b"tEXt", b"SYNTHETIC UNIT TEST ONLY " + b"x" * 4400) +
                chunk(b"IDAT", zlib.compress(pixels)) + chunk(b"IEND", b""))
    path.write_bytes(contents)


def example_fixture():
    return {
        "schema": "FoamLens-Granada-Real-OpenFOAM-B13-v1",
        "case_identity": "B13_prghPressure_airGapOF14",
        "expected_regions": ["metal", "mold"],
        "measured_requested_time": 9.8,
        "required_file_sha256": {
            k: hashlib.sha256(k.encode()).hexdigest()
            for k in ("0/metal/T", "0/mold/T", "9.8/metal/T", "9.8/mold/T")
        },
        "asymmetric_source_omission": {
            "missing_file": "9.8/mold/T", "fabricated_values": False
        },
    }


class NativeEvidenceGate(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.path = Path(self.tmp.name) / "synthetic.png"
        test_png(self.path)
        self.fixture = example_fixture()
        self.log = "\n".join(REQUIRED_LOGS)

    def test_log_contract_uses_exact_shipped_original_windows_host_message(self):
        original = (Path(__file__).resolve().parent.parent /
                    "desktop/src/FoamLensDesktop/Program.cs").read_text(encoding="utf-8")
        self.assertIn("FoamLens checkMesh scientific report inspector WebView2 smoke passed", original)
        self.assertEqual(REQUIRED_LOGS[0],
                         "FoamLens checkMesh scientific report inspector WebView2 smoke passed")

    def test_positive_contract_is_not_scientific_approval(self):
        proof = verify(self.log, self.fixture, self.path)
        self.assertEqual(proof["result"], "PASS_REAL_NATIVE_MULTIREGION_FIELD_F1")
        self.assertEqual(proof["real_field_screenshot"]["width"], 640)
        self.assertFalse(proof["verified_scientific_accuracy"])
        self.assertFalse(proof["verified_installed_or_portable"])
        self.assertFalse(proof["release_authorized"])

    def test_missing_exact_view_b_real_regions_must_fail(self):
        log = self.log.replace("FoamLens real OpenFOAM View B metal+mold and metric XYZ smoke passed", "")
        with self.assertRaisesRegex(ValueError, "View B"):
            verify(log, self.fixture, self.path)

    def test_import_only_not_sufficient_without_multiregion(self):
        log = self.log.replace("FoamLens real OpenFOAM physical multiregion WebGL smoke passed", "")
        with self.assertRaisesRegex(ValueError, "multiregion"):
            verify(log, self.fixture, self.path)

    def test_synthetic_comparison_alone_is_not_a_real_smoke(self):
        with self.assertRaisesRegex(ValueError, "real"):
            verify("FoamLens Granada equivalent-observables WebView2 smoke passed", self.fixture, self.path)

    def test_real_png_absent_fails(self):
        self.path.unlink()
        with self.assertRaises(FileNotFoundError):
            verify(self.log, self.fixture, self.path)

    def test_tampered_png_header_fails(self):
        data = bytearray(self.path.read_bytes())
        data[16] ^= 0xFF
        self.path.write_bytes(data)
        with self.assertRaisesRegex(ValueError, "CRC"):
            verify(self.log, self.fixture, self.path)

    def test_empty_fake_png_body_fails(self):
        self.path.write_bytes(b"\x89PNG\r\n\x1a\n")
        with self.assertRaisesRegex(ValueError, "full PNG body"):
            verify(self.log, self.fixture, self.path)

    def test_manifest_cannot_fabricate_time_or_regions(self):
        self.fixture["expected_regions"] = ["metal"]
        with self.assertRaisesRegex(ValueError, "metal/mold"):
            verify(self.log, self.fixture, self.path)

    def test_missing_measured_source_provenance_fails(self):
        del self.fixture["required_file_sha256"]["9.8/mold/T"]
        with self.assertRaisesRegex(ValueError, "digests"):
            verify(self.log, self.fixture, self.path)

    def test_interpolated_missing_mold_frame_is_rejected(self):
        self.fixture["asymmetric_source_omission"]["fabricated_values"] = True
        with self.assertRaisesRegex(ValueError, "provenance"):
            verify(self.log, self.fixture, self.path)


if __name__ == "__main__":
    unittest.main(verbosity=2)
