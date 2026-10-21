#!/usr/bin/env python3
"""Synthetic manifest ONLY: tests G5 slot integrity without invented screenshots."""
import copy
import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parent))
from granada_prepare_g5_review_manifest import prepare
class G5EvidenceSafety(unittest.TestCase):
 def setUp(self):
  self.d={"schema":"michelslab-rendered-ui-v1","source_commit":"a"*40,"screenshots":[]}
  for variant in ("installed","portable"):
   for size in ("wide","compact"):
    for surface in ("home","about","data","field"):
     self.d["screenshots"].append({"runtime_variant":variant,"viewport":size,
         "surface":surface,"path":f"{variant}/{surface}-{size}.png"})
    self.d["screenshots"].append({"runtime_variant":variant,"viewport":size,
        "surface":"about","path":f"{variant}/about-{size}-bottom.png"})
 def test_only_supplemental_scrolled_about_is_removed(self):
  original=copy.deepcopy(self.d)
  got=prepare(self.d)
  self.assertEqual(len(got["screenshots"]),16)
  self.assertEqual(len(got["granada_g5_supplemental_about_captures_excluded"]),4)
  self.assertEqual(self.d,original)
 def test_missing_scientific_workspace_is_not_fabricated(self):
  m=prepare(self.d)
  self.assertFalse(any(x["surface"]=="analysis" for x in m["screenshots"]))
  self.assertTrue(m["granada_g5_missing_surface_capture_is_never_synthesized"])
 def test_identical_about_scrolled_picture_can_be_omitted_by_canonical_capture(self):
  self.d["screenshots"].pop()
  m=prepare(self.d)
  self.assertEqual(len(m["screenshots"]),16)
  self.assertEqual(len(m["granada_g5_supplemental_about_captures_excluded"]),3)
 def test_missing_real_primary_screen_must_fail_closed(self):
  self.d["screenshots"]=[x for x in self.d["screenshots"] if
      not (x["runtime_variant"]=="portable" and x["surface"]=="field" and x["viewport"]=="wide")]
  with self.assertRaisesRegex(ValueError,"slots missing"):prepare(self.d)
 def test_duplicate_primary_tab_fails(self):
  self.d["screenshots"].append(copy.deepcopy(self.d["screenshots"][0]))
  with self.assertRaisesRegex(ValueError,"Duplicate native primary"):prepare(self.d)
 def test_unknown_manifest_rejected(self):
  self.d["schema"]="made-up"
  with self.assertRaisesRegex(ValueError,"canonical"):prepare(self.d)
 def test_does_not_strip_added_real_scientific_tab(self):
  self.d["screenshots"].append({"runtime_variant":"installed","viewport":"wide",
    "surface":"analysis","path":"installed/analysis-wide.png"})
  m=prepare(self.d)
  self.assertTrue(any(x["surface"]=="analysis" for x in m["screenshots"]))
if __name__=="__main__":unittest.main(verbosity=2)
