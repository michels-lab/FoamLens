// Granada G29 independent fail-closed guard; source-only checks are not Windows acceptance.
'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const script=fs.readFileSync(path.join(root,'tools/granada_g29_actual_cross_version_upgrade.ps1'),'utf8');
const workflow=fs.readFileSync(path.join(root,'.github/workflows/granada-g29-real-version-storage-migration.yml'),'utf8');
function has(s,pattern,label){assert.match(s,pattern,label)}
function verify(s,w){
  has(s,/RUNNER_ENVIRONMENT\s+-eq\s+'github-hosted'/,'G29 must refuse real user Windows machines');
  has(s,/RUNNER_OS\s+-eq\s+'Windows'/,'G29 must require Windows runner');
  has(s,/\$OldSha\s+-ne\s+\$MainSha/,'must genuinely compare distinct versions');
  has(s,/FoamLens-Setup-v1\.8\.9\.exe/,'real old installer required');
  has(s,/FoamLens-Setup-v1\.8\.10\.exe/,'real new installer required');
  has(s,/Install\s+\$oldSetup[\s\S]*Install\s+\$newSetup/,'old installed must be upgraded in-place to new installed');
  has(s,/Probe 'write' \$oldFront/,'real old version must write Chromium state');
  has(s,/Probe 'verify' \$newFront/,'new original frontend must read unchanged browser state');
  has(s,/\(\$token\+'-WRONG'\)/,'negative tampered-token browser verification must run');
  has(s,/\$LASTEXITCODE -ne 0\) 'G29 negative tampered-token/,'wrong-token check must reject false positives');
  has(s,/Probe 'clear' \$newFront/,'clean only synthetic storage keys');
  has(s,/Probe 'absent' \$newFront/,'cleanup must be verified by Chromium');
  has(s,/originIsolationVerified=\$true/,'real origin isolation required');
  has(s,/developerProfileIsolationVerified=\$true/,'separate Developer profile required');
  has(s,/userSettingsSchemaMigrationProven=\$false/,'browser preservation is not full real settings migration');
  has(s,/releaseReady=\$false/,'never claim release readiness from browser test');
  assert.doesNotMatch(s,/Remove-Item\s+(-LiteralPath\s+)?\$profile\b/i,'must not delete browser profiles');
  assert.doesNotMatch(s,/rm\s+-r(f)?\s+.*WebView2/i,'no browser storage directory deletion');
  has(w,/ref: v1\.8\.9/,'must checkout original public old release');
  has(w,/ref: main/,'must checkout real original main');
  has(w,/ref: c0f3932a5221e5e4243942a2ecfb7023ba2ea9cf/,'must use exact previously green G24 browser probe');
  has(w,/\$main -ne \$remote/,'pin current real main without pretending previous SHA');
  has(w,/\$oldId\.Line -cne \$newId\.Line/,'verify both original Inno AppIds match before upgrading');
  has(w,/dotnet publish desktop\/src\/FoamLensDesktop\/FoamLensDesktop\.csproj/,'must compile actual product executable');
  has(w,/genuine-cross-version-upgrade:/,'Windows CI must execute real migration');
  has(w,/\$r\.realIndexedDbPreserved -ne \$true/,'native report must be validated');
  assert.doesNotMatch(w,/continue-on-error:\s*true/i,'no optional/ignored real acceptance');
}
test('original two-version source and fail-closed Windows workflow',()=>verify(script,workflow));
test('negative: cannot swap in same-version test',()=>{
 assert.throws(()=>verify(script.replace('FoamLens-Setup-v1.8.9.exe','FoamLens-Setup-v1.8.10.exe'),workflow),/old installer/);
});
test('negative: must reject tampered browser readback',()=>{
 assert.throws(()=>verify(script.replace('($token+\'-WRONG\')','($token)'),workflow),/tampered-token/);
});
test('negative: fake acceptance without new-version storage verification',()=>{
 assert.throws(()=>verify(script.replaceAll("Probe 'verify' $newFront","Write-Host 'unverified'"),workflow),/new original frontend/);
});
test('negative: no browser profile removal allowed',()=>{
 assert.throws(()=>verify(script+"\nRemove-Item $profile -Recurse -Force\n",workflow),/must not delete browser profiles/);
});
test('negative: cannot lose exact main identity',()=>{
 assert.throws(()=>verify(script,workflow.replace('$main -ne $remote','$main -eq $remote')),/pin current real main/);
});
test('negative: do not count browser persistence as full user settings migration',()=>{
 assert.throws(()=>verify(script.replace('userSettingsSchemaMigrationProven=$false','userSettingsSchemaMigrationProven=$true'),workflow),/settings migration/);
});
