#!/usr/bin/env python3
"""Generate candidate-SHA-bound, actual-render screenshot manifest (capture-only)."""
import argparse, hashlib, json
from pathlib import Path
from PIL import Image

def hashfile(p):
    h=hashlib.sha256()
    with p.open('rb') as f:
        for block in iter(lambda:f.read(1024*1024),b''): h.update(block)
    return h.hexdigest()

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--evidence-dir",type=Path,required=True)
    p.add_argument("--artifact",type=Path,required=True)
    p.add_argument("--source-sha",required=True)
    p.add_argument("--platform",required=True)
    p.add_argument("--capture-method",default="installed-windows-desktop")
    p.add_argument("--output",type=Path,required=True)
    a=p.parse_args()
    if len(a.source_sha)!=40 or not a.artifact.is_file(): raise SystemExit("Invalid source SHA or missing real artifact")
    root=a.output.parent.resolve()
    root.mkdir(parents=True,exist_ok=True)
    artifact_sha=hashfile(a.artifact)
    records=[]
    for viewport in ("wide","compact"):
        opening_about_hash=None
        for name, surface in ((f"home-{viewport}.png","home"),(f"about-{viewport}.png","about"),(f"about-{viewport}-bottom.png","about")):
            file=(a.evidence_dir/name).resolve()
            if not file.is_file(): raise SystemExit(f"Missing real screenshot: {file}")
            digest=hashfile(file)
            if name==f"about-{viewport}.png":
                opening_about_hash=digest
            elif name==f"about-{viewport}-bottom.png" and digest==opening_about_hash:
                # If About fits the initial viewport the scroll capture is identical.
                # Keep the actual file but do not duplicate its bytes in the gate manifest.
                print(f"About {viewport}: no scrolling required; redundant bottom capture omitted")
                continue
            with Image.open(file) as img:
                width,height=img.size
            records.append({"platform":a.platform,"surface":surface,"viewport":viewport,"path":str(file.relative_to(root)).replace('\\','/'),
                            "sha256":digest,"width":width,"height":height,"capture_method":a.capture_method,
                            "candidate_artifact_sha256":artifact_sha})
    a.output.write_text(json.dumps({"schema":"michelslab-rendered-ui-v1","source_commit":a.source_sha,
                    "artifact_sha256":{a.platform:artifact_sha},"screenshots":records},indent=2)+"\n",encoding="utf-8")
    print(f"Recorded {len(records)} actual UI screenshots for {a.platform}: {artifact_sha}")
if __name__=="__main__": main()
