'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const ps=fs.readFileSync(path.join(root,'tools/granada_g27_windows_native_culture_matrix.ps1'),'utf8');
const cs=fs.readFileSync(path.join(root,'tools/granada_g27_culture_probe/Program.cs'),'utf8');
const wf=fs.readFileSync(path.join(root,'.github/workflows/granada-g27-native-culture-matrix.yml'),'utf8');
const product=fs.readFileSync(path.join(root,'desktop/src/FoamLensDesktop/Program.cs'),'utf8');
function includesAll(s,items){for(const n of items)assert(s.includes(n),'required real evidence or safety guard absent: '+n);}
test('G27 invokes authentic original WinForms smoke for portable and installed in four native Windows cultures',()=>{
 includesAll(ps,["@('en-US','es-MX','fr-FR','de-DE')","@('portable','installed')","Start-Process -FilePath $file","--smoke-test","Windows smoke test passed","$localeEvidence.Count -eq 8"]);
});
test('native .NET probe requires newly launched process to have real Windows OS user culture',()=>{
 includesAll(cs,["CultureInfo.CurrentCulture","requested","double.TryParse","CultureInfo.InvariantCulture","NumberDecimalSeparator","0.001","9.8","fr-FR","de-DE","return 3;","return 6;"]);
 includesAll(ps,["Set-Culture -CultureInfo","& $probe $name","$LASTEXITCODE -eq 0","localeWitnessWasNewProcess","observedCulture"]);
});
test('original main native pass actually executes source-owned scientific decimal and binary mesh self-tests',()=>{
 const i=product.indexOf('private async Task RunSmokeTestAsync()');
 assert(i>0);
 const region=product.slice(i,i+1300);
 assert(region.includes('RunBinaryMeshParserSelfTest();'),'native runtime has no real binary OpenFOAM self-test');
 assert(region.includes('await RunFoamLogParserSelfTestAsync();'),'native runtime has no scientific 0.001s numeric self-test');
 assert(product.includes('NumberStyles.Float, CultureInfo.InvariantCulture'));
 assert(product.includes('0.001s'));
});
test('no native Windows account changes allowed outside a disposable GitHub-hosted runner',()=>{
 includesAll(ps,["$env:GITHUB_ACTIONS -eq 'true'","$env:RUNNER_ENVIRONMENT -eq 'github-hosted'","$env:RUNNER_OS -eq 'Windows'","G27 may change regional Windows settings only","finally {","Set-Culture -CultureInfo $originalCulture"]);
 assert(!ps.includes('Set-WinSystemLocale')&&!ps.includes('New-LocalUser'));
 assert(!ps.includes('Remove-Item -Recurse')&&!ps.includes('gh release create'));
});
test('production source must be original exact main, never an unmerged research or UX test composite',()=>{
 includesAll(wf,["ref: main","G27_MAIN_SHA","git -C product","git ls-remote origin refs/heads/main","granada_g27_windows_native_culture_matrix.ps1"]);
 assert(!wf.includes('realmichelduarte/QuickCup-Solidification'));
 assert(!wf.includes('QUICKCUP_FIXTURE_TOKEN'));
});
test('only sanitized numeric metadata may leave the disposable Windows native runner',()=>{
 includesAll(ps,["realQuickCupNumericsValidated=$false","physicalMonitorDpiValidated=$false","trustedSignatureValidated=$false","releasePublished=$false"]);
 assert(wf.includes('g27-evidence/result.json'));
 assert(!wf.includes('gh release create')&&!wf.includes('gh release upload'));
 assert(!wf.includes('artifacts/g27-publish/**'));
});

test('G27 remains compatible with original G37 private B13 diagnostics after both QA blocks merge',()=>{
 const g37=fs.readFileSync(path.join(root,'.github/workflows/granada-g37-real-b13-play-stress.yml'),'utf8');
 const list=g37.match(/\$allowed=@\(([\s\S]*?)\)/);
 assert.ok(list,'original G37 exact-source owner allowlist must remain present');
 const tracked=['.github/workflows/granada-g27-native-culture-matrix.yml','tools/granada_g27_culture_probe/GranadaG27CultureProbe.csproj','tools/granada_g27_culture_probe/Program.cs','tools/granada_g27_native_culture_matrix.test.cjs','tools/granada_g27_windows_native_culture_matrix.ps1','docs/GRANADA_G27_SCIENTIFIC_NATIVE_WINDOWS_CULTURE_2026-10-23.md'];
 for(const name of tracked)assert.ok(list[1].includes("'"+name+"'"),'G37 may not fail only because of exact original G27 QA file: '+name);
 assert.doesNotMatch(list[1],/desktop\/src|\.github\/workflows\/build-foamlens-desktop\.yml/,'never exempt original product/source owner changes');
 assert.match(g37,/G37 modifies original CAD, Field, updater or scientific product source/,'G37 must fail closed for unapproved product modifications');
});
