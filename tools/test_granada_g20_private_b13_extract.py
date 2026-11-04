#!/usr/bin/env python3
import unittest
from unittest.mock import patch
from pathlib import Path
from tempfile import TemporaryDirectory
from granada_g20_private_b13_extract import ROOT, REQUIRED, safe_rel, sha, resolve_blob, prepare

class G20PrivateB13Tests(unittest.TestCase):
    def test_windows_file_names_fail_closed(self):
        for bad in ("../T", "CON", "mold/NUL.txt", "9.8/T:evil", "metal/T?", "x/../T",
                    "file.", "a/unsafe\\name", "", "/absolute"):
            self.assertFalse(safe_rel(bad), bad)
        for good in REQUIRED:
            self.assertTrue(safe_rel(good))
    def test_measured_bytes_have_source_stable_hash(self):
        self.assertEqual(sha(b"real source byte sequence"), sha(b"real source byte sequence"))
        self.assertNotEqual(sha(b"9.8 original"), sha(b"9.8 changed"))
    def test_private_symlink_escape_denied(self):
        name=ROOT+"/9.8/mold/T"
        entries={name:("120000","one"),ROOT+"/0/mold/T":("100644","two")}
        with patch("granada_g20_private_b13_extract.git",return_value=b"../../../../outside.txt"):
            with self.assertRaises(ValueError):
                resolve_blob(Path("."),entries,name)
    def test_private_symlink_cycle_denied(self):
        name=ROOT+"/9.8/mold/T"
        entries={name:("120000","one")}
        with patch("granada_g20_private_b13_extract.git",return_value=b"T"):
            with self.assertRaises(ValueError):
                resolve_blob(Path("."),entries,name)
    def test_missing_original_fixture_is_never_accepted(self):
        with TemporaryDirectory() as td:
            with patch("granada_g20_private_b13_extract.objects",return_value={}):
                with self.assertRaisesRegex(ValueError,"missing required file"):
                    prepare(Path("."),Path(td)/"uncreated-case")
    def test_no_source_dir_overwrite(self):
        with self.assertRaisesRegex(ValueError,"Destination must be new"):
            prepare(Path("."),Path("."))

    def test_g20_private_native_run_does_not_compete_with_its_own_pr(self):
        workflow = (Path(__file__).resolve().parent.parent /
                    ".github/workflows/granada-g20-original-main-b13.yml").read_text(encoding="utf-8")
        triggers = workflow.split("on:\n", 1)[1].split("concurrency:\n", 1)[0]
        concurrency = workflow.split("concurrency:\n", 1)[1].split("permissions:\n", 1)[0]
        self.assertIn("  pull_request:\n", triggers)
        self.assertIn("  workflow_dispatch:\n", triggers)
        self.assertNotIn("  push:\n", triggers, "old push+PR collision must not return")
        self.assertIn("github.event_name", concurrency)
        self.assertIn("github.event.pull_request.number || github.ref", concurrency)
        self.assertIn("cancel-in-progress: true", concurrency)
        self.assertIn("github.event.pull_request.head.repo.full_name == github.repository", workflow,
                      "private B13 may never be exposed to a fork PR")
        self.assertIn("HAS_QUICKCUP", workflow)
        # Same-failure negative fixture: reintroducing old parallel push event must fail.
        mutated = triggers.replace("  pull_request:\n", "  push:\n  pull_request:\n")
        with self.assertRaises(AssertionError):
            self.assertNotIn("  push:\n", mutated)


if __name__=="__main__":
    unittest.main()
