#!/usr/bin/env python3
"""Synthetic PNG fixtures test manifest contracts ONLY — never app UI approval."""
import copy,hashlib,os,sys,tempfile,unittest
from pathlib import Path
from PIL import Image
sys.path.insert(0,str(Path(__file__).parent))
from granada_g5_append_native_captures import TABS,VARIANTS,VIEWPORTS,expand
class RealNativeCaptureManifestContracts(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup)
  root=Path(self.tmp.name);self.manifest=root/"manifest.json"
  self.setup=root/"setup-only-contract.bin";self.portable=root/"portable-only-contract.bin"
  self.setup.write_bytes(os.urandom(2048));self.portable.write_bytes(os.urandom(2048))
  def h(p):return hashlib.sha256(p.read_bytes()).hexdigest()
  self.data={"schema":"michelslab-rendered-ui-v1",
   "source_commit":"a"*40,
   "artifact_sha256":{"windows":h(self.setup)},
   "portable_artifact_sha256":{"windows":h(self.portable)},
   "screenshots":[{"platform":"windows","runtime_variant":v,"viewport":z,"surface":s}
     for v in VARIANTS for z in VIEWPORTS for s in ("home","about","data","field")]}
  for i,(v,z,t) in enumerate((v,z,t) for v in VARIANTS for z in VIEWPORTS for t in TABS):
   dest=root/v/(t+"-"+z+".png");dest.parent.mkdir(exist_ok=True)
   rng=hashlib.sha256(str(i).encode()).digest()
   pixels=bytearray(os.urandom(500*350*3))
   pixels[:len(rng)]=rng
   Image.frombytes("RGB",(500,350),bytes(pixels)).save(dest)
 def expand(self):return expand(self.data,self.manifest,self.setup,self.portable)
 def test_20_extra_real_slots_and_original16_preserved_without_approval(self):
  before=copy.deepcopy(self.data);res=self.expand()
  self.assertEqual(self.data,before)
  self.assertEqual(len(res["screenshots"]),36)
  self.assertFalse(res["granada_g5_source_bound_native_captures"]["human_visual_approved"])
  self.assertFalse(res["granada_g5_source_bound_native_captures"]["release_candidate_created"])
 def test_canonical_runtime_capture_methods_preserve_native_cdp_provenance(self):
  shotlist=self.expand()["screenshots"][16:]
  self.assertEqual(len(shotlist),20)
  for shot in shotlist:
   expected=("installed-windows-desktop" if shot["runtime_variant"]=="installed" else "running-desktop-app")
   self.assertEqual(shot["capture_method"],expected)
   self.assertEqual(shot["capture_implementation"],"real-native-WebView2-CDP-after-B13-import")
   self.assertEqual(shot["candidate_artifact_sha256"],
     self.data["artifact_sha256"]["windows"] if shot["runtime_variant"]=="installed"
     else self.data["portable_artifact_sha256"]["windows"])
   self.assertTrue((self.manifest.parent/shot["path"]).is_file())
 def test_native_screenshot_missing_fails(self):
  (self.manifest.parent/"portable/time-series-wide.png").unlink()
  with self.assertRaisesRegex(ValueError,"No real WebView2"):self.expand()
 def test_duplicate_tab_pixels_detected(self):
  root=self.manifest.parent
  (root/"installed/analysis-wide.png").write_bytes((root/"installed/review-wide.png").read_bytes())
  with self.assertRaisesRegex(ValueError,"Identical binary"):self.expand()
 def test_artifact_hash_mismatch_rejected(self):
  self.data["artifact_sha256"]["windows"]="f"*64
  with self.assertRaisesRegex(ValueError,"Setup SHA"):self.expand()
 def test_portable_hash_mismatch_rejected(self):
  self.data["portable_artifact_sha256"]["windows"]="f"*64
  with self.assertRaisesRegex(ValueError,"Portable EXE SHA"):self.expand()
 def test_original_native_screens_cannot_be_missing(self):
  self.data["screenshots"].pop()
  with self.assertRaisesRegex(ValueError,"Original 16"):self.expand()
 def test_existing_extra_slot_cannot_be_rewritten(self):
  self.data["screenshots"].append({"runtime_variant":"portable",
    "surface":"analysis","viewport":"wide"})
  with self.assertRaisesRegex(ValueError,"already"):self.expand()
 def test_small_placeholder_image_rejected(self):
  from PIL import Image
  Image.new("RGB",(100,100)).save(self.manifest.parent/"portable/live-wide.png")
  with self.assertRaisesRegex(ValueError,"small|dimensions"):self.expand()
if __name__=="__main__":unittest.main(verbosity=2)
