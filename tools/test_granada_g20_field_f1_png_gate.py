#!/usr/bin/env python3
"""Negative checks: fail on an absent, corrupt, incomplete or tiny Field F1 PNG."""
import struct
import tempfile
import unittest
import zlib
from pathlib import Path
from granada_g20_field_f1_png_gate import inspect_png


def chunk(name, data):
    return struct.pack(">I", len(data)) + name + data + struct.pack(">I", zlib.crc32(name + data) & 0xffffffff)


def sample():
    width, height = 640, 480
    rows = b"".join(b"\x00" + b"\x11\x44\x99" * width for _ in range(height))
    return (b"\x89PNG\r\n\x1a\n" +
            chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)) +
            chunk(b"tEXt", b"UNIT TEST SYNTHETIC NOT FIELD EVIDENCE " + b"x" * 4500) +
            chunk(b"IDAT", zlib.compress(rows)) + chunk(b"IEND", b""))


class FieldF1Evidence(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.image = Path(self.tmp.name) / "native.png"
        self.image.write_bytes(sample())

    def test_valid_format_is_not_scientific_signoff(self):
        result = inspect_png(self.image)
        self.assertEqual((result["width"], result["height"]), (640, 480))
        self.assertFalse(result["physical_accuracy_certified"])
        self.assertFalse(result["owner_dpi_signoff"])

    def test_missing_png_cannot_pass(self):
        self.image.unlink()
        with self.assertRaises(FileNotFoundError):
            inspect_png(self.image)

    def test_corrupt_crc_cannot_pass(self):
        b = bytearray(self.image.read_bytes())
        b[45] ^= 1
        self.image.write_bytes(b)
        with self.assertRaisesRegex(ValueError, "CRC mismatch"):
            inspect_png(self.image)

    def test_incomplete_image_cannot_pass(self):
        self.image.write_bytes(self.image.read_bytes()[:-10])
        with self.assertRaises(ValueError):
            inspect_png(self.image)

    def test_extra_bytes_cannot_pass(self):
        self.image.write_bytes(self.image.read_bytes() + b"UNVERIFIED")
        with self.assertRaises(ValueError):
            inspect_png(self.image)

    def test_tiny_fake_png_cannot_pass(self):
        self.image.write_bytes(self.image.read_bytes()[:32])
        with self.assertRaises(ValueError):
            inspect_png(self.image)

    def test_script_checks_every_actual_native_launch(self):
        source = (Path(__file__).parent / "granada_g20_original_main_real_b13.ps1").read_text(encoding="utf-8")
        native = (Path(__file__).resolve().parent.parent / "desktop/src/FoamLensDesktop/Program.cs").read_text(encoding="utf-8")
        for token in ("FOAMLENS_BRAND_EVIDENCE_DIR", "field-real-multiregion.png",
                      "FoamLens real OpenFOAM View B metal+mold and metric XYZ smoke passed",
                      "FoamLens real OpenFOAM physical multiregion WebGL smoke passed"):
            self.assertIn(token, source)
            self.assertIn(token, native)
        self.assertIn("$script:g20FieldProof+=@{", source)
        self.assertIn("fieldF1ViewBSourceBoundEveryLaunch=($script:g20FieldProof.Count -eq 4)", source)


if __name__ == "__main__":
    unittest.main()
