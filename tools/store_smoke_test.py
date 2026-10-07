#!/usr/bin/env python3
"""Static rendering checks for the FoamLens Microsoft Store package."""
from __future__ import annotations
import json, subprocess, sys, tempfile
import xml.etree.ElementTree as ET
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
IDENTITY=ROOT/"store"/"partner-center.json"; TEMPLATE=ROOT/"store"/"AppxManifest.template.xml"
RENDER=ROOT/"tools"/"render_store_manifest.py"; ASSETS=ROOT/"tools"/"create_store_assets.ps1"
WORKFLOW=ROOT/".github"/"workflows"/"build-store-msix.yml"
for path in [IDENTITY,TEMPLATE,RENDER,ASSETS,WORKFLOW]:
    if not path.exists(): raise SystemExit(f"Missing Store packaging file: {path.relative_to(ROOT)}")
identity=json.loads(IDENTITY.read_text(encoding="utf-8"))
expected={"packageIdentityName":"MichelDuarte.FoamLens","publisher":"CN=D2024BFC-8238-4063-A8DD-A91208327224","publisherDisplayName":"Michel Duarte","displayName":"FoamLens","storeId":"9P0PTHSQ89LL"}
if identity!=expected: raise SystemExit(f"Partner Center identity drifted: {identity!r}")
subprocess.run([sys.executable,"-m","py_compile",str(RENDER)],check=True)
with tempfile.TemporaryDirectory() as td:
    out=Path(td)/"AppxManifest.xml"
    subprocess.run([sys.executable,str(RENDER),"--template",str(TEMPLATE),"--identity",str(IDENTITY),"--output",str(out),"--version","1.6.1"],check=True)
    root=ET.parse(out).getroot()
    ns={"f":"http://schemas.microsoft.com/appx/manifest/foundation/windows10","r":"http://schemas.microsoft.com/appx/manifest/foundation/windows10/restrictedcapabilities"}
    inode=root.find("f:Identity",ns); app=root.find("f:Applications/f:Application",ns); cap=root.find("f:Capabilities/r:Capability",ns)
    assert inode is not None and inode.attrib["Name"]==expected["packageIdentityName"] and inode.attrib["Publisher"]==expected["publisher"] and inode.attrib["Version"]=="1.6.1.0"
    assert app is not None and app.attrib["Executable"]=="FoamLens.exe"
    assert cap is not None and cap.attrib["Name"]=="runFullTrust"
print("OK: FoamLens Microsoft Store/MSIX source checks passed")
