'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{test}=require('node:test');
const root=path.resolve(__dirname,'..');
const ps=fs.readFileSync(path.join(root,'tools/granada_g37_real_b13_play_stress.ps1'),'utf8');
const source=fs.readFileSync(path.join(root,'desktop/src/FoamLensDesktop/Program.cs'),'utf8');
const wf=fs.readFileSync(path.join(root,'.github/workflows/granada-g37-real-b13-play-stress.yml'),'utf8');
function guarded(p,c,w){
 assert.match(c,/playNotCollapsed=!!playRect&&playRect\.width>=100&&playRect\.height>=28/,'must keep unchanged real 1140 Play geometry');
 assert.match(c,/throw new InvalidOperationException\("Real Field toolbar\/canvas geometry or physical region evidence failed/,'native original physical Field failures stay fail closed');
 assert.match(p,/RUNNER_ENVIRONMENT -eq 'github-hosted'/,'never touch a user workstation');
 assert.match(p,/FOAMLENS_SMOKE_OPENFOAM_CASE=\$fixture/,'actually load measured B13 OpenFOAM fields');
 assert.match(p,/B13_prghPressure_airGapOF14\/9\.8\/\$r\/T/,'actual metal+mold at 9.8 seconds');
 assert.match(p,/FOAMLENS_SMOKE_EXPECT_REGIONS='metal;mold'/,'real two-region gate');
 assert.match(p,/FOAMLENS_SMOKE_MIN_CASES='4'/,'preserve five-case case selector');
 assert.match(p,/foreach\(\$n in 1\.\.3\)\{Native-Smoke \$exe 'portable' \$n\}/,'require three Portable native starts');
 assert.match(p,/foreach\(\$n in 1\.\.3\)\{Native-Smoke \$installedExe 'installed' \$n\}/,'require three Installed native starts');
 assert.match(p,/FOAMLENS_BRAND_EVIDENCE_DIR=/,'require real native Field screenshots');
 assert.match(p,/field-wide\.png/,'must inspect 1140px rendered Field');
 assert.match(p,/field-compact\.png/,'must inspect compact Field');
 assert.match(p,/FoamLens real OpenFOAM packaged runtime smoke passed/,'real science, not fake renders');
 assert.match(p,/FoamLens Windows smoke test passed/,'real original Play/Camera native gate');
 assert.match(p,/Get-FileHash -LiteralPath \$installedExe/,'installed and portable identical');
 assert.match(p,/originalProductReleaseReady=\$false/,'no false stable release');
 assert.match(w,/run-id: 40386670380/,'private measured fixture must be pinned to independent successful source');
 assert.match(w,/QuickCup-MultiCase-Windows-runtime/,'real 407 MB original B13 fixture');
 assert.match(w,/actions: read/,'read-only artifact permission');
 assert.match(w,/originalProductSourceUntouched -ne \$true/,'fail closed if source is changed');
 assert.match(w,/completedAttempts\.Count -ne 6/,'six source-backed original real starts required');
 assert.doesNotMatch(w,/continue-on-error:\s*true|contents:\s*write/,'do not waive errors or permit publishing');
}
test('real six-cycle Windows B13 stress contract and original product checks remain immutable',()=>guarded(ps,source,wf));
test('negative regression: missing Installed cycles cannot be green',()=>{
 assert.throws(()=>guarded(ps.replace("foreach($n in 1..3){Native-Smoke $installedExe 'installed' $n}","Write-Host skipped"),source,wf),/three Installed/);
});
test('negative regression: original physical Play width cannot be lowered',()=>{
 assert.throws(()=>guarded(ps,source.replace('playRect.width>=100','playRect.width>=68'),wf),/unchanged real 1140 Play/);
});
test('negative regression: missing actual QuickCup case cannot be called a physical run',()=>{
 assert.throws(()=>guarded(ps.replace('FOAMLENS_SMOKE_OPENFOAM_CASE=$fixture','FOAMLENS_SMOKE_OPENFOAM_CASE=\"\"'),source,wf),/measured B13/);
});
test('negative regression: cannot mark original stable ready',()=>{
 assert.throws(()=>guarded(ps.replace('originalProductReleaseReady=$false','originalProductReleaseReady=$true'),source,wf),/false stable/);
});
