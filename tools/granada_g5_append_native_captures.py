#!/usr/bin/env python3
"""Append ONLY real installed/portable WebView2 PNGs for missing Granada G5 tabs.
Preserve original source/artifact SHA and all 16 existing original screenshots.
Captures are not human visual approval and cannot authorize any release.
"""
import argparse,hashlib,json
from pathlib import Path
from PIL import Image

TABS=("time-series","field-compare","analysis","review","live")
VARIANTS=("installed","portable")
VIEWPORTS=("wide","compact")
def digest(file:Path):
 h=hashlib.sha256()
 with file.open("rb") as inp:
  for part in iter(lambda:inp.read(1024*1024),b""):h.update(part)
 return h.hexdigest()

def expand(doc,manifest_path,setup,portable):
 if doc.get("schema")!="michelslab-rendered-ui-v1":
  raise ValueError("Original source/visual manifest wrong")
 expected_artifacts={"installed":digest(setup),"portable":digest(portable)}
 if doc.get("artifact_sha256",{}).get("windows")!=expected_artifacts["installed"]:
  raise ValueError("Original installed Setup SHA changed")
 if doc.get("portable_artifact_sha256",{}).get("windows")!=expected_artifacts["portable"]:
  raise ValueError("Original Portable EXE SHA changed")
 if not isinstance(doc.get("screenshots"),list):
  raise ValueError("Original screenshots array missing")
 result=dict(doc)
 existing=list(doc["screenshots"])
 original={(s.get("runtime_variant"),s.get("surface"),s.get("viewport"))
           for s in existing}
 required={(v,s,z) for v in VARIANTS for z in VIEWPORTS
           for s in ("home","about","data","field")}
 if not required.issubset(original):
  raise ValueError("Original 16 live screenshot slots cannot be replaced")
 intended={(v,s,z) for v in VARIANTS for z in VIEWPORTS for s in TABS}
 if intended.intersection(original):
  raise ValueError("Extra workspace slot already in original manifest; do not overwrite")
 root=manifest_path.resolve().parent
 additional=[]
 seen={}
 for variant in VARIANTS:
  for viewport in VIEWPORTS:
   for tab in TABS:
    file=(root/variant/(tab+"-"+viewport+".png")).resolve()
    if not file.is_relative_to(root) or not file.is_file():
     raise ValueError("No real WebView2 capture: "+str(file))
    if not file.stat().st_size>=8000:
     raise ValueError("Unconvincingly small physical G5 screenshot: "+str(file))
    with Image.open(file) as im:
     im.verify()
    with Image.open(file) as im:
     width,height=im.size
    if width<400 or height<300:
     raise ValueError("Invalid G5 original native screenshot dimensions")
    sha=digest(file)
    key=(variant,viewport)
    if (key,sha) in seen:
     raise ValueError("Identical binary PNG used for two real workspace tabs: "+
                      seen[(key,sha)]+" vs "+tab)
    seen[(key,sha)]=tab
    additional.append({
     "platform":"windows","runtime_variant":variant,
     "surface":tab,"viewport":viewport,
     "path":str(file.relative_to(root)).replace("\\","/"),
     "sha256":sha,"width":width,"height":height,
     "capture_method":"real-native-WebView2-CDP-after-B13-import",
     "candidate_artifact_sha256":expected_artifacts[variant],
     "granada_g5_human_visual_approval":False,
     "granada_g5_os_dpi_physically_verified":False,
     "granada_g5_source_data_context":"original QuickCup B13; surface values not automatically certified"
    })
 result["screenshots"]=existing+additional
 result["granada_g5_source_bound_native_captures"]={
  "additional":20,"original_preserved":len(existing),
  "expected_grid":36,"actual_real_slots":36,
  "human_visual_approved":False,"os_dpi_125_to_200_verified":False,
  "release_authorized":False,"release_candidate_created":False
 }
 return result

def main():
 p=argparse.ArgumentParser()
 for key in ("manifest","setup","portable","output"):
  p.add_argument("--"+key,required=True,type=Path)
 a=p.parse_args()
 source=json.loads(a.manifest.read_text(encoding="utf-8"))
 out=expand(source,a.manifest,a.setup,a.portable)
 a.output.parent.mkdir(parents=True,exist_ok=True)
 if a.output.resolve()==a.manifest.resolve():
  raise ValueError("Do not overwrite original canonical screenshot manifest")
 a.output.write_text(json.dumps(out,indent=2)+"\n",encoding="utf-8")
 print("Granada G5: 20 REAL native screenshot files appended; 36/36 captured NOT visually approved; NO RC/RELEASE")

if __name__=="__main__":main()
