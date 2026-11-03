#!/usr/bin/env python3
"""Failing-fixture coverage for the exact CI-only native smoke patch."""
import importlib.util
from pathlib import Path
import unittest

MODULE = Path(__file__).with_name("granada150_native_packaged_probe.py")
spec = importlib.util.spec_from_file_location("cmr_native_probe", MODULE)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

class NativeProbeRegression(unittest.TestCase):
    def test_native_original_anchor_injected_once(self):
        before = "source before\n" + mod.ANCHOR + "\nsource after"
        after = mod.patch_source(before)
        self.assertEqual(after.count(mod.ANCHOR), 1)
        self.assertIn("FoamLensMultiRegionMeshEvidence", after)
        self.assertIn("FoamLensMultiPanelExport", after)
        self.assertIn("cmrPanel", after)
        self.assertIn("meDialog", after)
        self.assertIn("not-certified", after)
        self.assertIn("missingRegions", after)
        self.assertIn("WebView2 probe failed", after)
        self.assertTrue(after.startswith("source before\n"))
        self.assertTrue(after.endswith("\nsource after"))

    def test_old_uninstrumented_scenario_would_fail(self):
        self.assertNotIn("cmrPanel", "header\n" + mod.ANCHOR + "\nfooter")
        self.assertIn("cmrPanel", mod.patch_source("header\n" + mod.ANCHOR + "\nfooter"))

    def test_missing_original_anchor_fails_closed(self):
        with self.assertRaisesRegex(ValueError, "exactly one"):
            mod.patch_source("unrelated Program.cs")

    def test_duplicate_original_anchor_fails_closed(self):
        with self.assertRaisesRegex(ValueError, "exactly one"):
            mod.patch_source(mod.ANCHOR + "\n" + mod.ANCHOR)

    def test_second_patch_fails_closed(self):
        with self.assertRaisesRegex(ValueError, "already injected"):
            mod.patch_source(mod.patch_source(mod.ANCHOR))

if __name__ == "__main__":
    unittest.main(verbosity=2)
