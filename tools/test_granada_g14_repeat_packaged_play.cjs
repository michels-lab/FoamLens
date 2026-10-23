'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const stress=fs.readFileSync(path.join(root,'tools/granada_g14_repeat_packaged_play.ps1'),'utf8');
const packed=fs.readFileSync(path.join(root,'tools/granada_installed_portable_b13.ps1'),'utf8');
const native=fs.readFileSync(path.join(root,'desktop/src/FoamLensDesktop/Program.cs'),'utf8');
test('same real EXEs receive two fresh identical physical-case smoke launches before uninstall',()=>{
 assert(packed.includes('-RepeatCount 2'));
 assert(packed.indexOf('Test-RealB13InRunningExe -Variant installed -Binary $installedExe')<
        packed.indexOf('./tools/granada_g14_repeat_packaged_play.ps1'));
 assert(packed.indexOf('./tools/granada_g14_repeat_packaged_play.ps1')<
        packed.indexOf('$manifest=Join-Path $visual'));
 assert(packed.indexOf('./tools/granada_g14_repeat_packaged_play.ps1')<
        packed.indexOf("Start-Process -FilePath $uninstaller"));
 for(const x of ["$pair.Variant+'-run-'+$repeat",'Get-FileHash $binary -Algorithm SHA256',
                   "'--smoke-test'",'WaitForExit(480000)'])assert(stress.includes(x),x);
});
test('original full original installed and portable OpenFOAM B13 tests remain intact',()=>{
 for(const fragment of ['Test-RealB13InRunningExe -Variant portable -Binary $portable',
  'Test-RealB13InRunningExe -Variant installed -Binary $installedExe',
  "granada_real_case_native_gate.py", "granada_packaged_parity_gate.py",
  "granada-g5-review.json","visual_release_gate.py",
  "test_installer_wizard_eula.ps1","test_installer_shortcuts.ps1"])assert(packed.includes(fragment),fragment);
 assert(native.includes('playNotCollapsed&&cachePopoverValid'));
});
test('each repetition validates all genuine five physical B13 source cases and scientific regions',()=>{
 for(const x of ['FoamLens-Granada-Real-OpenFOAM-B13-v1',
  "$manifest.case_names.Count -ne 5","FOAMLENS_SMOKE_REGION",
  "FOAMLENS_SMOKE_EXPECT_REGIONS","'metal;mold'","FOAMLENS_SMOKE_TIME","'9.8'",
  "FOAMLENS_SMOKE_FIELD","'T'",'FOAMLENS_SMOKE_ASYMMETRIC_CASE',
  "FOAMLENS_SMOKE_MIN_FIELD_SPAN","'1'"])assert(stress.includes(x),x);
});
test('fail closed when a native original Play check or startup viewport is missing',()=>{
 for(const x of [
  "Original Field/Play/Camera/metal-mold native contract failed",
  'playNativeTelemetry',
  '"playNotCollapsed":false',
  '"viewport":1140',
  '"viewport":640',
  "Real Field toolbar/canvas geometry or physical region evidence failed",
  '$proc.ExitCode -eq 0',
  "$wide -ge 1 -and $compact -ge 1 -and -not $fail"
 ])assert(stress.includes(x),x);
 assert(!stress.includes('playNotCollapsed=true'));
 assert(!stress.includes('exit 0'));
});
test('each repetition separately passes the ORIGINAL read-only measured OpenFOAM B13 scientific gate',()=>{
 const must=[
  'tools/granada_real_case_native_gate.py',
  '--log $copied',
  '--fixture-manifest $caseManifest',
  '--field-screenshot $fieldOriginalPng',
  '--output $physicsGateReport',
  "'field-real-multiregion.png'",
  "'native-original-b13-physics-gate.json'",
  '(Test-Path -LiteralPath $physicsGateReport)',
  '$physicsGatePass=($LASTEXITCODE -eq 0',
  '-and $physicsGatePass',
  'source_bound_b13_field_png_verified=$physicsGatePass',
  '(Get-FileHash $fieldOriginalPng -Algorithm SHA256)'
 ];
 for(const x of must)assert(stress.includes(x),x);
 const originalPhysics=fs.readFileSync(path.join(root,'tools/granada_real_case_native_gate.py'),'utf8');
 for(const x of ['"9.8/metal/T"', '"9.8/mold/T"','"FoamLens real OpenFOAM physical multiregion WebGL smoke passed"',
  '"FoamLens real OpenFOAM View B metal+mold and metric XYZ smoke passed"','PNG_HEADER','PNG_END'])assert(originalPhysics.includes(x),x);
 assert(!stress.includes('verified_scientific_accuracy=$true'));
});
test('unique per-attempt logs, original PNGs and summary persisted before an error',()=>{
 assert(stress.includes("'native-original-play.log'"));
 assert(stress.includes("'granada-g14-packaged-repeat-summary.json'"));
 assert(stress.includes('Copy-Item -LiteralPath $logs -Destination $copied -Force'));
 assert(stress.indexOf("Copy-Item -LiteralPath $logs")<stress.indexOf('if (-not $good)'));
 assert(stress.includes('if (Test-Path -LiteralPath $root) { throw'));
 assert(stress.includes('original native Play/Camera/physics 1140+640'));
});
test('P0 repetition cannot leak secrets, cases, executable or release authorization',()=>{
 for(const dangerous of ['gh release create','git push','dotnet publish','Compress-Archive',
  'Invoke-WebRequest','localStorage','Get-Content $env:USERPROFILE',
  'release_authorized=$true','human_approved=$true'])assert(!stress.includes(dangerous),dangerous);
 assert(stress.includes('release_authorized=$false'));
 assert(stress.includes('human_approved=$false'));
 assert(stress.includes('os_physical_dpi_approved=$false'));
 assert(stress.includes('finally {'));
});
