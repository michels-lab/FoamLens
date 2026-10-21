#!/usr/bin/env python3
"""SYNTHETIC PNG ONLY to test the manifest gate, never native FoamLens proof."""
import copy
import hashlib
import json
import sys
import tempfile
import unittest
from pathlib import Path
from PIL import Image
sys.path.insert(0,str(Path(__file__).parent))
from granada_extend_g5_visual_manifest import EXTRA,extend

class NativeFiveTabContract(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root=Path(self.temp.name)
        self.doc={"schema":"michelslab-rendered-ui-v1","source_commit":"a"*40,
                  "artifact_sha256":{"windows":"b"*64},
                  "portable_artifact_sha256":{"windows":"c"*64},
                  "screenshots":[]}
        for v in ("installed","portable"):
            for w in ("wide","compact"):
                for x in ("home","about","data","field"):
                    self.doc["screenshots"].append({"platform":"windows","runtime_variant":v,
                        "viewport":w,"surface":x,"path":v+"/"+x+"-"+w+".png"})
                for s in EXTRA:
                    p=self.root/v/(s+"-"+w+".png")
                    p.parent.mkdir(parents=True,exist_ok=True)
                    Image.new("RGB",(640,480),color=(87,53,159)).save(p)
                    # Use large file bytes to test minimum size with a
                    # noisier synthetic pattern; never claim it came from app.
                    image=Image.effect_noise((640,480),55)
                    image.save(p)
                    (self.root/v/(s+"-"+w+".json")).write_text(json.dumps(
                        {"ok":True,"surface":s,"caseCount":5,"actualMode":True,
                         "realTab":True,"panelReady":True,"secondary":True}))
    def test_positive_contract_36_slots_are_not_human_or_dpi_approval(self):
        copy_doc=copy.deepcopy(self.doc)
        out=extend(self.doc,self.root)
        self.assertEqual(len(out["screenshots"]),36)
        self.assertEqual(self.doc,copy_doc)
        self.assertFalse(out["granada_owner_visual_approval"])
        self.assertFalse(out["granada_physical_windows_dpi_125_to_200_verified"])
        self.assertFalse(out["granada_release_candidate_created"])
    def test_missing_real_tab_capture_must_fail(self):
        (self.root/"installed/analysis-wide.png").unlink()
        with self.assertRaisesRegex(ValueError,"No real native CDP PNG"):extend(self.doc,self.root)
    def test_wrong_native_mode_must_fail(self):
        p=self.root/"portable/review-compact.json"
        d=json.loads(p.read_text());d["actualMode"]=False;p.write_text(json.dumps(d))
        with self.assertRaisesRegex(ValueError,"Wrong tab"):extend(self.doc,self.root)
    def test_placeholder_without_loaded_case_fails(self):
        p=self.root/"installed/live-wide.json"
        d=json.loads(p.read_text());d["caseCount"]=0;p.write_text(json.dumps(d))
        with self.assertRaisesRegex(ValueError,"source-less"):extend(self.doc,self.root)
    def test_bad_source_binary_hash_fails(self):
        self.doc["artifact_sha256"]={}
        with self.assertRaisesRegex(ValueError,"binary SHA"):extend(self.doc,self.root)
    def test_duplicate_physical_workspace_fails(self):
        self.doc["screenshots"].append({"runtime_variant":"installed","viewport":"wide","surface":"analysis"})
        with self.assertRaisesRegex(ValueError,"duplicate native"):extend(self.doc,self.root)
    def test_broken_png_is_rejected_by_real_decoder(self):
        (self.root/"installed/field-compare-compact.png").write_bytes(b"x"*10001)
        with self.assertRaises(Exception):extend(self.doc,self.root)
    def test_missing_navigational_proof_not_inferred_from_png(self):
        (self.root/"portable/time-series-wide.json").unlink()
        with self.assertRaisesRegex(ValueError,"plus navigation state"):extend(self.doc,self.root)

if __name__=="__main__":unittest.main(verbosity=2)
