#!/usr/bin/env python3
"""Standalone negative/positive tests with explicitly SYNTHETIC OpenFOAM stub files."""
import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from granada_prepare_real_openfoam_b13 import NAMES, REQUIRED, prepare, safe_relative, sha256


class FixtureSafety(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.source = self.root / "synthetic-not-scientific-B13"
        for rel in REQUIRED:
            f = self.source / rel
            f.parent.mkdir(parents=True, exist_ok=True)
            f.write_text("FoamLens SYNTHETIC TEST ONLY; real-case CI uses the private original " + rel,
                         encoding="utf-8")

    def test_positive_real_source_copy_contract(self):
        before = {p: sha256(self.source / p) for p in REQUIRED}
        summary = prepare(self.source, self.root / "clone")
        self.assertEqual(len(summary["case_names"]), 5)
        self.assertEqual(tuple(summary["case_names"]), NAMES)
        self.assertEqual(summary["expected_regions"], ["metal", "mold"])
        self.assertFalse(summary["calibration_or_scientific_accuracy_certified"])
        self.assertFalse(summary["asymmetric_source_omission"]["fabricated_values"])
        for name in NAMES:
            for rel in REQUIRED:
                if name == "SmokeCase_Asymmetric" and rel == "9.8/mold/T":
                    self.assertFalse((self.root / "clone" / name / rel).exists())
                else:
                    self.assertEqual(sha256(self.root / "clone" / name / rel), before[rel])
        self.assertEqual({p: sha256(self.source / p) for p in REQUIRED}, before)

    def test_real_measurement_missing_must_fail_closed(self):
        (self.source / "9.8/mold/T").unlink()
        with self.assertRaisesRegex(ValueError, "measured source missing"):
            prepare(self.source, self.root / "clone")
        self.assertFalse((self.root / "clone").exists())

    def test_preexisting_destination_is_never_overwritten(self):
        dest = self.root / "clone"
        dest.mkdir()
        marker = dest / "another-agents-work.txt"
        marker.write_text("KEEP")
        with self.assertRaisesRegex(ValueError, "overwrite"):
            prepare(self.source, dest)
        self.assertEqual(marker.read_text(), "KEEP")

    def test_overlapping_folders_rejected(self):
        with self.assertRaisesRegex(ValueError, "non-overlapping"):
            prepare(self.source, self.source / "nested-output")
        with self.assertRaisesRegex(ValueError, "non-overlapping"):
            prepare(self.source, self.root)

    def test_symlink_rejected_even_when_contents_seem_valid(self):
        link = self.source / "3" / "T"
        link.parent.mkdir(parents=True, exist_ok=True)
        link.symlink_to(self.source / "0/metal/T")
        with self.assertRaisesRegex(ValueError, "symlink"):
            prepare(self.source, self.root / "clone")

    def test_unsafe_windows_paths_rejected_without_changing_source(self):
        for path in ["CON", "LPT9/a", "mesh:bad", "mesh?.vtu", "long. ", "with|pipe"]:
            self.assertFalse(safe_relative(Path(path)), path)
        self.assertTrue(safe_relative(Path("constant/metal/polyMesh/points")))
        self.assertTrue(safe_relative(Path("9.8/mold/T")))
        (self.source / "BAD:FILE").write_text("unsafe but ignored")
        out = prepare(self.source, self.root / "clone")
        self.assertEqual(out["windows_unsafe_source_paths_excluded"], 1)
        self.assertTrue((self.source / "BAD:FILE").exists())
        self.assertFalse((self.root / "clone" / "SmokeCase_A" / "BAD:FILE").exists())


if __name__ == "__main__":
    unittest.main(verbosity=2)
