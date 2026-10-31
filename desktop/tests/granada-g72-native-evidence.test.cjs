'use strict';
// G72: source-owner regression. Real Windows PNGs come ONLY from original
// compiled WinForms/WebView2 + authentic B13, never this source-only test.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {test}=require('node:test');
const root=path.resolve(__dirname,'../..');
const host=fs.readFileSync(path.join(root,'desktop/src/FoamLensDesktop/Program.cs'),'utf8');
const maker=fs.readFileSync(path.join(root,'tools/make_visual_evidence.py'),'utf8');
const windows=fs.readFileSync(path.join(root,'.github/workflows/build-foamlens-desktop.yml'),'utf8');
const fast=fs.readFileSync(path.join(root,'.github/workflows/granada-177-g5-native-visual-review.yml'),'utf8');
const tabs=['time-series','field-compare','analysis','review','live'];
test('actual original QuickCup runs real G58 Time Series before G72 source-backed additional native tabs',()=>{
 assert.match(host,/CaptureGranadaG72NativeTabsAsync\(root, size\.Name\)/);
 assert.match(host,/CaptureCdpPngAsync\(Path\.Combine\(root, \$"time-series-\{size\.Name\}\.png"\)\)/);
 assert(host.indexOf('await CaptureCdpPngAsync(Path.Combine(root, $"time-series-{size.Name}.png"))')<
        host.indexOf('await CaptureGranadaG72NativeTabsAsync(root, size.Name)'));
 assert.match(host,/CaptureCdpPngAsync\(Path\.Combine\(root, \$"\{tab\}-\{sizeName\}\.png"\)\)/);
 assert.match(host,/await CaptureScientificWorkspaceEvidenceAsync\(\)/);
 assert.match(host,/original native B13 Windows runtime/);
});
test('actual A/B 3D scientific Field compare is mandatory: never a 2D split substitute',()=>{
 for(const s of ["el('fcEnabled')","el('fvViewport')","el('fcViewport')",
    "visible(el('fvCanvas'))","visible(el('fcCanvas'))",
    "window.FoamLensFieldCompare?.isEnabled?.()===true",
    "panel?.classList.contains('fcCompareMode')"])
  assert(host.includes(s),'missing actual original compare evidence: '+s);
 assert(!host.includes("CaptureGranadaExtraNativeTabsAsync()"),
   'old composite source graft is not a valid current-main screenshot owner');
});
test('Analysis, Review and Live must navigate legitimate original visible owners',()=>{
 for(const x of ["el('flRibbonTab-analysis')?.click()","el('flRibbonTab-home')?.click()",
    "el(key==='review'?'flRaReview':'flRaLive')?.click()",
    "el('flRibbonPanel-analysis')",
    "el(key==='review'?'reviewSurface':'liveSurface')",
    "el(key==='review'?'reviewTitle':'liveTitle')",
    "el(key==='review'?'reviewTabAuditor':'liveChooseFolder')"])
  assert(host.includes(x),'missing real mode-owned UI validation: '+x);
 assert(host.includes('modeOk&&navOk&&panelOk&&controlsOk&&actualCompare'),
   'all actual native workspace gates must be fail-closed');
});
test('real G72 PNGs require original bytes; raw scientific fields never exported',()=>{
 assert(host.includes('CaptureCdpPngAsync(Path.Combine(root, $"{tab}-{sizeName}.png"))'));
 for(const s of ['modeOk','navOk','panelOk','controlsOk','actualCompare'])
  assert(host.includes('key + "="'),'failure must print bounded source-neutral booleans');
 assert(!host.includes('G72 original B13 synthetic screenshot fallback'));
 assert(host.includes('after real QuickCup source/time/regions and G58 have passed.'));
});
test('all 20 additional native screenshot records have distinct exact binary and platform identity',()=>{
 for(const tab of tabs)assert(maker.includes('"'+tab+'"'),'missing workspace '+tab);
 assert(maker.includes('for variant, evidence_dir, candidate_sha, capture_method in candidates:'));
 assert(maker.includes('for viewport in ("wide", "compact")'));
 assert(maker.includes('if args.require_g72_native_tabs:'));
 assert(maker.includes('g72_count != 20'));
 assert(maker.includes('"candidate_artifact_sha256": candidate_sha'));
 assert(maker.includes('"capture_method": capture_method'));
 assert(maker.includes('"physical_windows_os_dpi_verified": False'));
 assert(maker.includes('"human_visual_approved": False'));
});
test('build is hard-failing G72 native source requirement with real private B13 only',()=>{
 assert(windows.includes("$g72Required=@('--require-g72-native-tabs')"));
 assert(windows.includes("$g72Surfaces+=',time-series,field-compare,analysis,review,live'"));
 assert(windows.includes('@realMultiregion @g72Required'));
 assert(windows.includes('--surfaces $g72Surfaces'));
 assert(windows.includes("if ($env:HAS_QUICKCUP_FIXTURE -eq 'true') {"));
 assert(!windows.includes('continue-on-error: true'));
});
test('G5 owner source-test runs on two OS and still refuses automated human/DPI approval',()=>{
 assert(fast.includes('windows-latest')&&fast.includes('ubuntu-latest'));
 assert(fast.includes('desktop/tests/granada-g72-native-evidence.test.cjs'));
 assert(fast.includes("github.event_name == 'workflow_dispatch'"));
 assert(!fast.includes('gh release create'));
});
