#!/usr/bin/env python3
"""FoamLens Granada: fail-closed exact-binary parity of internal Setup + Portable.
No publication, no RC, no scientific accuracy or user UI approval is implied.
"""
import argparse
import hashlib
import json
import re
from pathlib import Path

SHA40=re.compile(r"^[0-9a-f]{40}$")
SHA64=re.compile(r"^[0-9a-f]{64}$")
REGIONS=["metal","mold"]
EXPECTED_SLOTS={(v,s,z) for v in ("portable","installed")
                for s in ("home","about","data","field")
                for z in ("wide","compact")}

def digest(path):
    if not path.is_file() or path.stat().st_size<1024:
        raise ValueError("Real Setup/Portable binary missing or implausibly small: "+str(path))
    h=hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda:f.read(1024*1024),b""):
            h.update(block)
    return h.hexdigest()

def validate(portable, installed, visual, source_sha, setup_file, portable_exe, installed_exe):
    if not SHA40.fullmatch(str(source_sha)):
        raise ValueError("Exact source commit missing")
    for label,proof in (("portable",portable),("installed",installed)):
        if proof.get("result")!="PASS_REAL_NATIVE_MULTIREGION_FIELD_F1":
            raise ValueError(label+" real QuickCup B13 scientific smoke NOT VERIFIED")
        if proof.get("expected_regions")!=REGIONS or proof.get("requested_physical_time")!=9.8:
            raise ValueError(label+" real physical regions/time differ")
        p=proof.get("real_field_screenshot") or {}
        if not SHA64.fullmatch(str(p.get("sha256",""))):
            raise ValueError(label+" real Field View B PNG evidence absent")
        if p.get("width",0)<200 or p.get("height",0)<150:
            raise ValueError(label+" measured-region PNG too small")
        if proof.get("verified_scientific_accuracy") is not False:
            raise ValueError(label+" cannot certify CFD scientific accuracy")
        if proof.get("verified_installed_or_portable") is not False:
            raise ValueError(label+" source smoke cannot self-certify distribution")
    if portable.get("source_fixture_identity")!=installed.get("source_fixture_identity"):
        raise ValueError("Setup/Portable tested DIFFERENT OpenFOAM cases")
    if set(portable.get("verified_native_log_contracts",[]))!=set(installed.get("verified_native_log_contracts",[])):
        raise ValueError("Setup/Portable missing identical original native real-case assertions")
    if visual.get("schema")!="michelslab-rendered-ui-v1" or visual.get("source_commit")!=source_sha:
        raise ValueError("Screenshot provenance not bound to this exact branch commit")
    setup_sha=digest(setup_file);exe_sha=digest(portable_exe);installed_sha=digest(installed_exe)
    if exe_sha!=installed_sha:
        raise ValueError("Actual installed EXE is different from tested portable payload")
    if visual.get("artifact_sha256",{}).get("windows")!=setup_sha:
        raise ValueError("Setup installer SHA does not match captured images")
    if visual.get("portable_artifact_sha256",{}).get("windows")!=exe_sha:
        raise ValueError("Portable EXE SHA does not match captured images")
    seen=set()
    for s in visual.get("screenshots",[]):
        variant=s.get("runtime_variant")
        if variant not in ("portable","installed") or s.get("platform")!="windows":
            raise ValueError("Foreign/non-Windows evidence leaked into native screenshots")
        expected=setup_sha if variant=="installed" else exe_sha
        if s.get("candidate_artifact_sha256")!=expected:
            raise ValueError("Screenshot not linked to actual Setup/Portable binary")
        if not SHA64.fullmatch(str(s.get("sha256",""))):
            raise ValueError("Screenshot SHA invalid")
        slot=(variant,s.get("surface"),s.get("viewport"))
        if slot in EXPECTED_SLOTS:
            if slot in seen: raise ValueError("Duplicated installed/portable viewport")
            seen.add(slot)
    missing=EXPECTED_SLOTS-seen
    if missing:raise ValueError("Original 16 runtime evidence slots missing: "+str(sorted(missing)))
    return {
       "schema":"FoamLens-Granada-Internal-Setup-Portable-B13-QA-v1",
       "result":"BOTH_PHYSICAL_INSTALL_AND_PORTABLE_REAL_B13_PASS",
       "source_sha":source_sha,
       "setup_sha256":setup_sha,
       "portable_sha256":exe_sha,
       "installed_exe_sha256":installed_sha,
       "original_case":portable["source_fixture_identity"],
       "physical_time":9.8,"physical_regions":REGIONS,
       "captured_verified_original_slots":len(seen),
       "total_all_workspace_slots":36,
       "other_workspace_slots_not_verified":20,
       "windows_125_to_200_dpi_verified":False,
       "all_tabs_visually_approved":False,
       "scientific_solution_accuracy_approved":False,
       "published":False,"release_candidate_created":False,
       "final_release_authorized":False,
       "owner_approval":"PENDING",
       "explanation":"Internal source-bound native Setup and Portable smoke. No release or RC."
    }

def main():
    a=argparse.ArgumentParser()
    for opt in ("portable","installed","visual-manifest","source-sha","setup","portable-exe","installed-exe","output"):
        a.add_argument("--"+opt,required=True)
    p=a.parse_args()
    report=validate(json.loads(Path(p.portable).read_text()),
        json.loads(Path(p.installed).read_text()),
        json.loads(Path(p.visual_manifest).read_text()),
        p.source_sha,Path(p.setup),Path(p.portable_exe),Path(p.installed_exe))
    output=Path(p.output);output.parent.mkdir(parents=True,exist_ok=True)
    output.write_text(json.dumps(report,indent=2)+"\n")
    print("Granada INTERNAL installed + portable B13 PASS; 16 original viewport slots evidence present, 20 other workspace slots pending; NO RC, NO RELEASE")

if __name__=="__main__":
    main()
