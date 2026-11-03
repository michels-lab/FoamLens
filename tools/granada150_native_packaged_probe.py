#!/usr/bin/env python3
"""Add a CI-only, fail-closed original-WebView2 runtime assertion for Granada #150.

This edits the disposable checkout's Program.cs during CI, NEVER the tracked
product source or a released binary. It is separate from the final native
original-source/release gate. No OpenFOAM/private data are read or emitted.
"""
from pathlib import Path
import sys

ANCHOR = (
    '            Log("FoamLens checkMesh scientific report inspector WebView2 smoke passed: " +\n'
    '                meshAuditSurfaceJson);'
)
MARKER = "FoamLens Granada #150 namespaced module WebView2 probe"
PROBE = r'''
            // Granada #150: CI-only original WinForms/WebView2 smoke assertion.
            // This block is injected into a disposable CI checkout; NOT product source.
            var cmrMultiRegionEvidenceJson = await _web.CoreWebView2.ExecuteScriptAsync(
                """
                (() => {
                  const api=window.FoamLensMultiRegionMeshEvidence;
                  const mp=window.FoamLensMultiPanelExport;
                  const cmr=document.getElementById('cmrPanel');
                  const legacy=document.getElementById('meDialog');
                  const cmrIds=['cmrCase','cmrFiles','cmrRefresh','cmrAnalyze','cmrExport','cmrStatus','cmrReport'];
                  const unique=cmrIds.every(id=>document.querySelectorAll('#'+id).length===1);
                  const exportButton=document.getElementById('cmrExport');
                  const legacyExport=document.getElementById('meExport');
                  const analysis=typeof api?.analyze==='function'?api.analyze([],['metal','mold']):null;
                  const ok=!!api&&!!mp&&!!cmr&&!!legacy&&unique&&
                    typeof exportButton?.onclick==='function'&&exportButton.disabled===true&&
                    typeof legacyExport?.onclick==='function'&&
                    analysis?.status==='partial-or-unattributed'&&
                    analysis?.overallScientificValidity==='not-certified'&&
                    analysis?.coverage?.expected===2&&analysis?.coverage?.evidenced===0&&
                    analysis?.missingRegions?.join(',')==='metal,mold';
                  return {ok,cmrMounted:!!cmr,multipanelMounted:!!legacy,
                    independentExport:exportButton!==legacyExport,uniqueControls:unique,
                    safeMissingRegions:analysis?.missingRegions?.length===2};
                })()
                """);
            using (var cmrRuntime = JsonDocument.Parse(cmrMultiRegionEvidenceJson))
            {
                if (!cmrRuntime.RootElement.TryGetProperty("ok", out var ok) || !ok.GetBoolean())
                    throw new InvalidOperationException(
                        "FoamLens Granada #150 namespaced module WebView2 probe failed: " +
                        cmrMultiRegionEvidenceJson);
            }
            Log("FoamLens Granada #150 namespaced module WebView2 probe passed: " +
                cmrMultiRegionEvidenceJson);
'''

def patch_source(source: str) -> str:
    if source.count(ANCHOR) != 1:
        raise ValueError("Expected exactly one original mesh-auditor native smoke anchor")
    if MARKER in source:
        raise ValueError("CI-only probe already injected; refusing a second injection")
    return source.replace(ANCHOR, ANCHOR + "\n" + PROBE, 1)

def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("Usage: granada150_native_packaged_probe.py path/to/Program.cs")
    path = Path(sys.argv[1])
    old = path.read_text(encoding="utf-8")
    fixed = patch_source(old)
    path.write_text(fixed, encoding="utf-8", newline="")
    print("Injected CI-only WebView2 checkMesh/multipanel probe into disposable checkout")

if __name__ == "__main__":
    main()
