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
 assert.match(p,/foreach\(\$n in 1\.\.3\)\{\s*Native-Smoke \$exe 'portable' \$n/,'require three Portable native starts');
 assert.match(p,/Native-Smoke \$installedExe 'installed' \$n\s*\}/,'require three Installed native starts');
 const firstInno=p.indexOf('Run-Inno $installerExe $installOptions');
 assert.ok(firstInno>=0 && firstInno < p.indexOf("Native-Smoke $exe 'portable' $n"),'original Windows Inno MUST install before any six-run WebView2 subprocesses');
 assert.match(p,/function Run-Inno\(\[string\]\$path,\[string\[\]\]\$installOptions,\[string\]\$label\)/,'installer must use explicit bound arguments, not PowerShell automatic $args');
 assert.match(p,/Start-Process -FilePath \$path -ArgumentList \$installOptions -PassThru/,'silent Inno options must be passed to real setup process');
 assert.doesNotMatch(p,/\[string\[\]\]\$args/,'PowerShell reserved $args caused silent setup to become interactive');
 assert.match(p,/installOptions=@\('\/VERYSILENT'/,'genuine silent installer options must be present');
 assert.match(p,/FOAMLENS_BRAND_EVIDENCE_DIR=/,'require real native Field screenshots');
 assert.match(p,/field-wide\.png/,'must inspect 1140px rendered Field');
 assert.match(p,/field-compact\.png/,'must inspect compact Field');
 assert.match(p,/FoamLens real OpenFOAM packaged runtime smoke passed/,'real science, not fake renders');
 assert.match(p,/FoamLens Windows smoke test passed/,'real original Play/Camera native gate');
 assert.match(p,/Get-FileHash -LiteralPath \$installedExe/,'installed and portable identical');
 assert.match(p,/originalProductReleaseReady=\$false/,'no false stable release');
 assert.match(w,/run-id: 40439636990/,'private measured fixture must be pinned to independent successful source');
 assert.match(w,/QuickCup-MultiCase-Windows-runtime/,'real 407 MB original B13 fixture');
 assert.match(w,/actions: read/,'read-only artifact permission');
 assert.match(w,/originalProductSourceUntouched -ne \$true/,'fail closed if source is changed');
 assert.match(w,/completedAttempts\.Count -ne 6/,'six source-backed original real starts required');
 assert.doesNotMatch(w,/continue-on-error:\s*true|contents:\s*write/,'do not waive errors or permit publishing');
}
test('real six-cycle Windows B13 stress contract and original product checks remain immutable',()=>guarded(ps,source,wf));
test('negative regression: missing Installed cycles cannot be green',()=>{
 assert.throws(()=>guarded(ps.replace("Native-Smoke $installedExe 'installed' $n","Write-Host skipped"),source,wf),/three Installed/);
});
test('negative regression: installer before WebView2 is required to avoid real Inno lock contention',()=>{
 const moved=ps.replace('Run-Inno $installerExe $installOptions',"Write-Host 'skipped setup'");
 assert.throws(()=>guarded(moved,source,wf),/original Windows Inno MUST install/);
});
test('negative regression: do not use PowerShell reserved automatic $args for Inno Setup',()=>{
 const broken=ps.replace('function Run-Inno([string]$path,[string[]]$installOptions,[string]$label)',
                         'function Run-Inno([string]$path,[string[]]$args,[string]$label)');
 assert.throws(()=>guarded(broken,source,wf),/explicit bound arguments/);
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

test('negative regression: a nonzero native exit must emit sanitized stage and failed cycle before raw log cleanup',()=>{
 assert.match(ps,/function Safe-FailureEvidence\(\[string\]\$nativeLog/);
 assert.match(ps,/if\(\$p\.ExitCode -ne 0\)/);
 assert.match(ps,/\$script:failureEvidence=Safe-FailureEvidence \$rawFailure \$variant \$n/);
 assert.match(ps,/sanitizedFailure=\$script:failureEvidence/);
 assert.match(ps,/fieldLayoutFailure=\$true/);
 assert.match(ps,/playNotCollapsed/);
 assert.match(ps,/fieldContractJsonParseable/);
 assert.match(ps,/nonScientificPixelMeasures/);
 const damaged=ps.replace('$script:failureEvidence=Safe-FailureEvidence $rawFailure $variant $n ([int]$p.ExitCode)',
   'Write-Host unchecked');
 assert.doesNotMatch(damaged,/\$script:failureEvidence=Safe-FailureEvidence \$rawFailure \$variant \$n/);
});
test('failure evidence cannot print raw WebView2 logs, images or privately sourced field values',()=>{
 assert.doesNotMatch(ps,/Write-(?:Host|Output)\s+\$(?:rawFailure|nativeLog|raw)\b/);
 const uploadOnly=wf.split('uses: actions/upload-artifact@v4').at(-1);
 assert(uploadOnly!==wf,'original sanitized artifact upload guard absent');
 assert.match(uploadOnly,/path:\s*g37-sanitized\/report\.json/);
 assert.doesNotMatch(uploadOnly,/path:\s*(?:quickcup-runtime-fixture|g37-private-raw-WebView2)/);
 assert.match(ps,/if\(Test-Path -LiteralPath \$captures\)\{Remove-Item -LiteralPath \$captures/);
 assert.match(ps,/realQuickCupCompleted=\$nativeLog\.Contains/);
 assert.match(ps,/secondViewCompleted=\$nativeLog\.Contains/);
});

test('post-merge File Steward audit records are allowed but no product science or Field owner files are granted',()=>{
 const list=wf.match(/\$allowed=@\(([\s\S]*?)\)/);
 assert.ok(list,'G37 requires explicit allowed-file list');
 for(const p of ['docs/audits/FILE_GOVERNANCE_LOG.md','reports/file-governance/FILE_GOVERNANCE.json','reports/file-governance/FILE_GOVERNANCE.md','reports/file-governance/SUMMARY.json'])assert.ok(list[1].includes("'"+p+"'"),p);
 assert.doesNotMatch(list[1],/desktop\/src|\.github\/workflows\/build-foamlens-desktop\.yml/,'original live product source is never an allowed G37 change');
 const csFiles=[...list[1].matchAll(/'([^']+\.cs)'/g)].map(m=>m[1]);
 assert.deepEqual(csFiles,['tools/granada_g27_culture_probe/Program.cs'],'only independent G27 QA witness C# is permitted, never a product C# source file');
});

test('G40 main reentry binds live main SHA; QA branch owns only its explicit diff',()=>{
 assert.match(wf,/\$runRef='\$\{\{ github\.ref \}\}'/,'evaluate actual GitHub run ref');
 assert.match(wf,/\$currentMain=\(\(git ls-remote origin refs\/heads\/main\)/,'resolve real live main SHA');
 assert.match(wf,/if\(\$runRef -eq 'refs\/heads\/main'\)/,'main is checked independently');
 assert.match(wf,/if\(\$sha -ne \$currentMain\)/,'never run a stale main binary as latest');
 assert.match(wf,/elseif\(\$runRef -in @\(/,'QA branch needs a separate ownership rule');
 assert.match(wf,/\$branchBase=\(git merge-base HEAD origin\/main\)/,'diff against branch point, not obsolete G37 main');
 assert.match(wf,/git diff --name-only \$branchBase HEAD/,'check only QA branch changes');
 assert.match(wf,/\} else \{throw 'G37 unrecognized Git ref/,'ref must be allowlisted');
 const mainScope=wf.split("if($runRef -eq 'refs/heads/main'){")[1]?.split("} elseif($runRef")[0]||'';
 assert.match(mainScope,/git diff --name-only \$sha \$currentMain/,'after-trigger main drift must compare original exact native source with audited latest main');
 assert.match(mainScope,/\$_ -cnotin \$stewardPaths/,'only fixed metadata path list; never accept product source');
 assert.doesNotMatch(mainScope,/git diff --name-only \$historicalBase/,'reject broad historical-basis product source false positives');
 const allowlist=wf.match(/\$allowed=@\(([\s\S]*?)\)/)?.[1]||'';
 assert.ok(allowlist.includes("'docs/GRANADA_G40_G37_MAIN_REENTRY_2026-10-27.md'"));
 assert.doesNotMatch(allowlist,/desktop\/src/,'never permit product owner changes on a QA branch');
});

test('G40 main automatically checks relevant original Field changes, not metadata-only commits',()=>{
 const push=wf.split('  push:')[1]?.split('  workflow_dispatch:')[0]||'';
 assert.match(push,/\r?\n\s+- main\r?\n/,'current real main must trigger original B13 regression on Windows CRLF and Unix LF');
 assert.match(push,/\r?\n\s+paths:\r?\n/,'path filter required on Windows CRLF and Unix LF');
 for(const file of [
   '.github/workflows/granada-g37-real-b13-play-stress.yml',
   'tools/granada_g37_real_b13_play_stress.ps1',
   'desktop/src/FoamLensDesktop/Program.cs',
   'desktop/src/FoamLensDesktop/frontend/v14-zz-field-workspace.js',
   'desktop/src/FoamLensDesktop/frontend/v31-granada-wide-field-ribbon.js',
   'desktop/src/FoamLensDesktop/frontend/v32-granada-field-cameras.js',
   'desktop/src/FoamLensDesktop/frontend/v33-granada-wide-play-cascade-guard.js'
 ])assert.ok(push.includes("'"+file+"'"),'missing science/Field watcher '+file);
 assert.doesNotMatch(push,/\*\*|\.md'/,'do not trigger huge native test for all metadata/documentation changes');
 assert.match(wf,/run-id: 40439636990/,'must still use original independently produced real fixture');
 assert.match(wf,/completedAttempts\.Count -ne 6/,'must never drop six real native attempts');
});

test('G42 post-trigger main drift is allowed ONLY for four audited metadata paths and authentic signed-off commit subjects',()=>{
 const main=wf.split("if($runRef -eq 'refs/heads/main'){")[1]?.split("} elseif($runRef")[0]||'';
 const q=main.replace(/\r/g,'');
 assert.match(q,/git fetch --no-tags origin main/,'actual current Git lineage must be available');
 assert.match(q,/git merge-base --is-ancestor \$sha \$currentMain/,'never allow unrelated main histories');
 assert.match(q,/\$stewardCommits.Count -gt 4/,'bound accepted post-trigger commit chain');
 assert.match(q,/chore\(file-steward\): refresh local audit findings \[skip ci\]/,'commit identity must be exact');
 assert.match(q,/\$_ -cne 'chore\(file-steward\): refresh local audit findings \[skip ci\]'/,'reject arbitrary commit subjects');
 assert.match(q,/git diff --name-only \$sha \$currentMain/,'compare actual source snapshot and latest main');
 const list=q.match(/\$stewardPaths=@\(([\s\S]*?)\)/)?.[1]||'';
 const paths=[...list.matchAll(/'([^']+)'/g)].map(x=>x[1]);
 assert.deepEqual(paths,[
   'docs/audits/FILE_GOVERNANCE_LOG.md',
   'reports/file-governance/FILE_GOVERNANCE.json',
   'reports/file-governance/FILE_GOVERNANCE.md',
   'reports/file-governance/SUMMARY.json'
 ],'exact 4 original File Steward paths, no wildcard');
 assert.match(q,/\$_ -cnotin \$stewardPaths/,'all other source changes must fail');
 assert.match(q,/\$stillCurrent -ne \$currentMain/,'recheck remote main after lineage comparison');
 assert.match(wf,/\$sha -ne '\$\{\{ github.sha \}\}'/,'checkout commit remains exact event SHA');
 assert.match(wf,/originalProductReleaseReady -ne \$false/,'no release on a source-equivalent audit snapshot');
});
test('G42 negative: removing ancestry, commit identity or original source whitelist cannot pass',()=>{
 const checker=workflow=>{
   const main=workflow.split("if($runRef -eq 'refs/heads/main'){")[1]?.split("} elseif($runRef")[0]||'';
   assert.match(main,/git merge-base --is-ancestor \$sha \$currentMain/);
   assert.match(main,/\$_ -cne 'chore\(file-steward\): refresh local audit findings \[skip ci\]'/);
   assert.match(main,/\$_ -cnotin \$stewardPaths/);
   assert.match(main,/\$stillCurrent -ne \$currentMain/);
 };
 assert.doesNotThrow(()=>checker(wf));
 for(const mutated of [
   wf.replace('git merge-base --is-ancestor $sha $currentMain','Write-Host trust-all'),
   wf.replace("$_ -cne 'chore(file-steward): refresh local audit findings [skip ci]'","$_ -like '*'"),
   wf.replace('$_ -cnotin $stewardPaths',"$false"),
   wf.replace('$stillCurrent -ne $currentMain','$false')
 ])assert.throws(()=>checker(mutated),'tampered evidence must fail guard');
});


test('G57 smoke-only numerical case is isolated from original normal WebView2 user session',()=>{
  assert.match(source,/var originalWebView2Data = Path\.Combine\(/,
    'normal WebView2 persistent user data root must be explicit');
  assert.match(source,/var isolatedG56Smoke = _smokeTest && string\.Equals\(/,
    'G56 WebView2 isolation must require original packaged --smoke-test');
  assert.match(source,/Environment\.GetEnvironmentVariable\("FOAMLENS_SMOKE_TIMESERIES_B13"\)/,
    'G56 isolated profile requires exact opt-in smoke flag');
  assert.match(source,/\? Path\.Combine\(originalWebView2Data, "G56-PrivateNumericSmoke"\)\s*: originalWebView2Data;/,
    'regular product user profile must be completely unchanged');
  assert.match(source,/CoreWebView2Environment\.CreateAsync\(null, userData, options\)/,
    'actual rendered native browser must bind scoped profile, not a fake stub');
  assert.match(ps,/G57 SANITIZED numerical witness:/,
    'numerical source evidence must surface boolean-only original real success');
  assert.match(ps,/G57 SANITIZED native completion:/,
    'later Installed failure must not hide earlier real Portable source validation');
  assert.match(ps,/Need \(\$script:attempts\.Count -eq 6\)/,
    'six genuine native starts remain mandatory even after G56 proof');
});
