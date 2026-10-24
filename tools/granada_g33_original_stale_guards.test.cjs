// G33 synthetic source-mutation gates. Not a replacement for actual ORIGINAL WebView2 execution proof.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {test} = require('node:test');
const cwd = path.resolve(__dirname,'..');
const ps = fs.readFileSync(path.join(cwd,'tools/granada_g33_actual_native_stale_extension.ps1'),'utf8');
const cs = fs.readFileSync(path.join(cwd,'tools/granada_g33_local_origin_witness/Program.cs'),'utf8');
const wf = fs.readFileSync(path.join(cwd,'.github/workflows/granada-g33-real-native-residue.yml'),'utf8');
const original = fs.readFileSync(path.join(cwd,'desktop/src/FoamLensDesktop/Program.cs'),'utf8');

function requireProof(p,c,w,product) {
 assert.match(product,/ZipFile\.ExtractToDirectory\(stream, AppRoot, overwriteFiles: true\)/,'original host must actually retain unknown file when unzipping');
 assert.match(product,/Directory\.GetFiles\(AppRoot, "v\*-\*\.js"\)/,'regression needs original wildcard local module loading code');
 assert.match(product,/html = html\.Insert\(insertionPoint, Environment\.NewLine \+ extension/,'regression needs actual source JS injection in active IIFE');
 assert.match(p,/RUNNER_ENVIRONMENT -eq 'github-hosted'/,'real user machine prohibited');
 assert.match(p,/FoamLens-Setup-v1\.8\.10\.exe/,'genuine original Windows Inno Setup needed');
 assert.match(p,/\.FullName -ieq 'v99-g33-benign-residue\.js'/,'actual trusted original bundled ZIP MUST NOT ship synthetic marker');
 assert.match(p,/Smoke \$portableExe 'Portable first clean original startup'/,'clean baseline must be tested');
 assert.match(p,/Witness 'absent'/,'synthetic marker must initially be absent');
 assert.match(p,/WriteAllText\(\$markerScript/,'marker must be created as a real on-disk module');
 assert.match(p,/Smoke \$portableExe 'Portable restart with stale extra unbundled local module'/,'original Portable must actually run with stale source');
 assert.match(p,/Witness 'portable'/,'genuine rendered WebView2 readback required after Portable');
 assert.match(p,/Smoke \$installedExe 'Installed original startup with stale extra unbundled local module'/,'original installed must actually run');
 assert.match(p,/Witness 'installed'/,'installed must prove distinct current marker');
 assert.match(p,/Remove-Item -LiteralPath \$markerScript -Force/,'only benign test file must be removed');
 assert.match(p,/Witness 'clear'/,'synthetic key must be cleared independently');
 assert.match(p,/originalCleanRestartNoLongerExecutesMarker=\$true/,'prove removal control worked');
 assert.match(p,/productionFixApplied=\$false/,'QA cannot claim host repaired');
 assert.match(p,/releaseReady=\$false/,'QA cannot claim stable distribution is ready');
 assert.match(c,/CoreWebView2Environment\.CreateAsync\(null, _profile\)/,'real native Chromium witness');
 assert.match(c,/SetVirtualHostNameToFolderMapping\(/,'original foamlens.local mapped origin, no fake origin');
 assert.match(c,/window\.localStorage\.getItem/,'actual JavaScript from WebView2 local origin');
 assert.match(c,/actual == _expected/,'witness must compare exact synthetic marker value, not merely presence');
 assert.match(c,/RUNNER_ENVIRONMENT/,'witness limited to disposable runner');
 assert.match(w,/ref: main/,'genuine original main only');
 assert.match(w,/dotnet publish desktop\/src\/FoamLensDesktop\/FoamLensDesktop\.csproj/,'compile true product, not a surrogate');
 assert.match(w,/choco install innosetup/,'actual Inno Windows installer');
 assert.match(w,/genuine-original-native-windows-stale-residue:/,'execute actual non-simulated scenario');
 assert.match(w,/r\.unbundledScriptRanInOriginalInstalledWebView2 -ne \$true/,'fail closed on installed execution proof');
 assert.match(w,/r\.unbundledScriptRanInOriginalPortableWebView2 -ne \$true/,'fail closed on Portable execution proof');
 assert.doesNotMatch(w,/continue-on-error:\s*true/,'no ignored failures allowed');
}
test('G33 original source and runtime controls really match confirmed Windows execution chain',
 ()=>requireProof(ps,cs,wf,original));
test('negative: rejects missing actual original host wildcard root cause',()=>{
 assert.throws(()=>requireProof(ps,cs,wf,original.replace('Directory.GetFiles(AppRoot, "v*-*.js")','Directory.GetFiles(AppRoot, "safe*.js")')),/wildcard/);
});
test('negative: rejects fake Portable witness',()=>{
 assert.throws(()=>requireProof(ps.replace("Witness 'portable'","Write-Host 'assume it ran'"),cs,wf,original),/Portable/);
});
test('negative: rejects native installed test absent',()=>{
 assert.throws(()=>requireProof(ps.replace("Smoke $installedExe 'Installed original startup with stale extra unbundled local module'","Write-Host skip"),cs,wf,original),/installed must/);
});
test('negative: no fake localStorage value acceptance',()=>{
 assert.throws(()=>requireProof(ps,cs.replace('actual == _expected','actual != _expected'),wf,original),/exact synthetic/);
});
test('negative: no test falsely claims original source fixed',()=>{
 assert.throws(()=>requireProof(ps.replace('productionFixApplied=$false','productionFixApplied=$true'),cs,wf,original),/QA cannot claim/);
});
test('negative: source-only workflow cannot greenlight release',()=>{
 assert.throws(()=>requireProof(ps.replace('releaseReady=$false','releaseReady=$true'),cs,wf,original),/stable distribution/);
});
test('negative: not reproducible if test marker was embedded',()=>{
 assert.throws(()=>requireProof(ps.replace(".FullName -ieq 'v99-g33-benign-residue.js'",".FullName -ieq 'v99-g33-test-changed.js'"),cs,wf,original),/MUST NOT ship/);
});
