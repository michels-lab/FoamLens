#!/usr/bin/env python3
"""Build 36/36 G5 manifest from actual native WebView2 captures ONLY.

Input manifest is original physical Setup/Portable source-bound evidence,
not a fabricated set. Each added screenshot MUST have its own native
navigation JSON, a real PNG, original binary source hashes and viewport.
"""
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image

EXTRA=("time-series","field-compare","analysis","review","live")
VARIANTS=("installed","portable")
SIZES=("wide","compact")

def sha(file:Path):
    h=hashlib.sha256()
    with file.open("rb") as f:
        for block in iter(lambda:f.read(1024*1024),b""):
            h.update(block)
    return h.hexdigest()

def extend(doc,root:Path):
    if doc.get("schema")!="michelslab-rendered-ui-v1":
        raise ValueError("Not the original real Setup/Portable source manifest")
    copied=dict(doc)
    original=list(doc.get("screenshots",[]))
    seen={(s.get("runtime_variant"),s.get("viewport"),s.get("surface")) for s in original}
    screenshots=list(original)
    if len(seen)<16:raise ValueError("Original installed/portable 16 native physical slots are missing")
    for variant in VARIANTS:
        expected_digest=doc.get("artifact_sha256" if variant=="installed" else "portable_artifact_sha256",{}).get("windows")
        if not isinstance(expected_digest,str) or len(expected_digest)!=64:
            raise ValueError("Original exact binary SHA missing")
        for viewport in SIZES:
            for surface in EXTRA:
                key=(variant,viewport,surface)
                if key in seen:raise ValueError("Refusing duplicate native G5 screenshot "+str(key))
                base=root/variant
                file=base/(surface+"-"+viewport+".png")
                meta=base/(surface+"-"+viewport+".json")
                if not file.is_file() or not meta.is_file():
                    raise ValueError("No real native CDP PNG plus navigation state for "+str(key))
                state=json.loads(meta.read_text(encoding="utf-8"))
                if (state.get("ok") is not True or state.get("surface")!=surface or
                        state.get("sourceRegionCount",0)<2 or state.get("actualMode") is not True or
                        state.get("realTab") is not True or state.get("panelReady") is not True or
                        state.get("secondary") is not True):
                    raise ValueError("Wrong tab, source-less or hidden real native screen "+str(key))
                if file.stat().st_size<10000 or file.stat().st_size>25*1024*1024:
                    raise ValueError("Native screenshot missing real pixel payload "+str(key))
                with Image.open(file) as image:
                    image.verify()
                with Image.open(file) as image:
                    width,height=image.size
                if width<400 or height<300:
                    raise ValueError("Native WebView2 viewport image too small "+str(key))
                relative=file.relative_to(root)
                screenshots.append({
                    "platform":"windows",
                    "runtime_variant":variant,
                    "surface":surface,
                    "viewport":viewport,
                    "path":relative.as_posix(),
                    "sha256":sha(file),
                    "width":width,
                    "height":height,
                    "capture_method":"actual-packaged-webview2-cdp-after-original-nav-with-case",
                    "candidate_artifact_sha256":expected_digest
                })
                seen.add(key)
    expected={(v,w,s) for v in VARIANTS for w in SIZES
       for s in ("home","about","data","field")+EXTRA}
    if expected-seen:raise ValueError("G5 native physical workspace screenshots still missing")
    copied["screenshots"]=screenshots
    copied["granada_all_tab_native_evidence_only"]=True
    copied["granada_owner_visual_approval"]=False
    copied["granada_physical_windows_dpi_125_to_200_verified"]=False
    copied["granada_release_candidate_created"]=False
    return copied

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--input",type=Path,required=True)
    p.add_argument("--root",type=Path,required=True)
    p.add_argument("--output",type=Path,required=True)
    a=p.parse_args()
    root=a.root.resolve(strict=True)
    manifest=extend(json.loads(a.input.read_text(encoding="utf-8")),root)
    a.output.parent.mkdir(parents=True,exist_ok=True)
    a.output.write_text(json.dumps(manifest,indent=2)+"\n",encoding="utf-8")
    print("GRANADA G5: 36 native physical screenshots present; not UI approved, not physical DPI, not an RC or release.")
if __name__=="__main__":main()
