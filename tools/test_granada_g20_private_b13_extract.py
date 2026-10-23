#!/usr/bin/env python3
import unittest
from unittest.mock import patch
from pathlib import Path
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
        with patch("granada_g20_private_b13_extract.objects",return_value={}):
            with self.assertRaisesRegex(ValueError,"missing required file"):
                prepare(Path("."),Path("_g20_absent_fixture_output"))
    def test_no_source_dir_overwrite(self):
        with self.assertRaisesRegex(ValueError,"Destination must be new"):
            prepare(Path("."),Path("."))

if __name__=="__main__":
    unittest.main()
