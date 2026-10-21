#!/usr/bin/env python3
"""Adapt full native screenshot manifest to G5's one-surface-one-slot grid.

The original full evidence manifest is not modified. Only About's EXTRA
scrolled-bottom screenshot is supplementary, not a second About tab.
Never invent missing Analysis/Review/Live/3D screenshots.
"""
import argparse
import json
from pathlib import Path

def prepare(doc):
    if doc.get("schema")!="michelslab-rendered-ui-v1":
        raise ValueError("Not a canonical real-shot evidence manifest")
    result=dict(doc)
    shots=[]
    removed=[]
    seen=set()
    for x in doc.get("screenshots",[]):
        if not isinstance(x,dict):raise ValueError("Malformed native capture")
        name=Path(x.get("path","")).name
        if (x.get("surface")=="about" and name.startswith("about-")
                and name.endswith("-bottom.png")):
            removed.append(name)
            continue
        key=(x.get("runtime_variant"),x.get("viewport"),x.get("surface"))
        if key in seen and x.get("surface") in ("home","about","data","field"):
            raise ValueError("Duplicate native primary tab screenshot: "+str(key))
        seen.add(key)
        shots.append(x)
    # Canonical make_visual_evidence.py already omits an About-bottom capture
    # when its PNG equals the opening view. Zero to four supplements is correct.
    if len(removed)>4:
        raise ValueError("Unexpected duplicate supplementary About captures")
    result["screenshots"]=shots
    required={(v,z,a) for v in ("portable","installed") for z in ("wide","compact")
              for a in ("home","about","data","field")}
    missing=required-{(x.get("runtime_variant"),x.get("viewport"),x.get("surface"))
                     for x in shots}
    if missing:
        raise ValueError("G5 original Home/About/Data/Field slots missing: "+str(sorted(missing)))
    result["granada_g5_supplemental_about_captures_excluded"]=removed
    result["granada_g5_missing_surface_capture_is_never_synthesized"]=True
    return result

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--input",type=Path,required=True)
    p.add_argument("--output",type=Path,required=True)
    a=p.parse_args()
    m=prepare(json.loads(a.input.read_text(encoding="utf-8")))
    a.output.parent.mkdir(parents=True,exist_ok=True)
    a.output.write_text(json.dumps(m,indent=2)+"\n",encoding="utf-8")
    print("G5: four extra About-bottom captures retained ONLY in canonical full manifest; 20 unverified screen slots NOT invented.")
if __name__=="__main__":main()
