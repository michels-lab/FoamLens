#!/usr/bin/env python3
"""Synthetic test fixtures ONLY; never equivalent to real installed FoamLens QA."""
import hashlib
import sys
import tempfile
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parent))
from granada_packaged_parity_gate import validate,EXPECTED_SLOTS

SHA="1234567890abcdef1234567890abcdef12345678"
H=lambda x:hashlib.sha256(x).hexdigest()
class ParityGate(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root=Path(self.tmp.name)
        self.setup=self.root/"setup-for-test-only.exe"
        self.portable=self.root/"portable-for-test-only.exe"
        self.installed=self.root/"installed-for-test-only.exe"
        self.setup.write_bytes(b"SYNTHETIC SETUP FOR CONTRACT TESTS"*100)
        self.portable.write_bytes(b"SYNTHETIC FOAMLENS PORTABLE FOR CONTRACT TESTS"*100)
        self.installed.write_bytes(self.portable.read_bytes())
        self.proof={"result":"PASS_REAL_NATIVE_MULTIREGION_FIELD_F1",
          "expected_regions":["metal","mold"],"requested_physical_time":9.8,
          "real_field_screenshot":{"sha256":"a"*64,"width":640,"height":480},
          "source_fixture_identity":"B13_prghPressure_airGapOF14",
          "verified_native_log_contracts":["View B","OpenFOAM metal mold","checkMesh"],
          "verified_scientific_accuracy":False,"verified_installed_or_portable":False}
        self.installed_proof=dict(self.proof)
        setup_hash=H(self.setup.read_bytes())
        exe_hash=H(self.portable.read_bytes())
        self.visual={"schema":"michelslab-rendered-ui-v1","source_commit":SHA,
            "artifact_sha256":{"windows":setup_hash},
            "portable_artifact_sha256":{"windows":exe_hash},
            "screenshots":[{"platform":"windows","runtime_variant":v,
              "surface":surf,"viewport":viewport,"sha256":"1"*64,
              "candidate_artifact_sha256":setup_hash if v=="installed" else exe_hash}
              for v,surf,viewport in sorted(EXPECTED_SLOTS)]}
    def check(self):
        return validate(self.proof,self.installed_proof,self.visual,SHA,self.setup,self.portable,self.installed)
    def test_exact_16_real_screen_slots_do_not_imply_release_or_rc(self):
        result=self.check()
        self.assertEqual(result["captured_verified_original_slots"],16)
        self.assertEqual(result["other_workspace_slots_not_verified"],20)
        self.assertFalse(result["all_tabs_visually_approved"])
        self.assertFalse(result["release_candidate_created"])
        self.assertFalse(result["published"])
        self.assertFalse(result["final_release_authorized"])
    def test_real_case_must_run_in_installed_variant_too(self):
        self.installed_proof["result"]="EMPTY_STARTUP_ONLY"
        with self.assertRaisesRegex(ValueError,"real QuickCup"):self.check()
    def test_original_region_or_physical_time_mismatch_fails(self):
        self.installed_proof["expected_regions"]=["metal"]
        with self.assertRaisesRegex(ValueError,"regions/time"):self.check()
        self.installed_proof["expected_regions"]=["metal","mold"]
        self.installed_proof["requested_physical_time"]=2
        with self.assertRaisesRegex(ValueError,"regions/time"):self.check()
    def test_missing_view_b_png_prevents_false_installed_approval(self):
        self.installed_proof["real_field_screenshot"]={}
        with self.assertRaisesRegex(ValueError,"PNG"):self.check()
    def test_installed_payload_must_match_exact_portable_exe_sha(self):
        self.installed.write_bytes(b"OTHER SOURCE EXE"*120)
        with self.assertRaisesRegex(ValueError,"different"):self.check()
    def test_artifact_hash_from_another_build_rejected(self):
        self.visual["artifact_sha256"]["windows"]="0"*64
        with self.assertRaisesRegex(ValueError,"Setup installer SHA"):self.check()
    def test_source_sha_spoof_or_relabel_rejected(self):
        self.visual["source_commit"]="0"*40
        with self.assertRaisesRegex(ValueError,"exact branch"):self.check()
    def test_missing_workspace_or_variant_not_marked_complete(self):
        self.visual["screenshots"].pop()
        with self.assertRaisesRegex(ValueError,"slots missing"):self.check()
    def test_duplicated_screenshot_slot_rejected(self):
        self.visual["screenshots"].append(self.visual["screenshots"][0])
        with self.assertRaisesRegex(ValueError,"Duplicated"):self.check()
    def test_false_scientific_accuracy_certification_rejected(self):
        self.installed_proof["verified_scientific_accuracy"]=True
        with self.assertRaisesRegex(ValueError,"scientific accuracy"):self.check()
    def test_canonical_case_must_be_identical(self):
        self.installed_proof["source_fixture_identity"]="OTHER CASE"
        with self.assertRaisesRegex(ValueError,"DIFFERENT"):self.check()

if __name__=="__main__":unittest.main(verbosity=2)
