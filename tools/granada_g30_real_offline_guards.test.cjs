// G30 source guard is NOT an offline native proof. Windows app+firewall+Chromium must run.
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {test}=require('node:test');
const root=path.resolve(__dirname,'..');
const ps=fs.readFileSync(path.join(root,'tools/granada_g30_native_offline.ps1'),'utf8');
const cs=fs.readFileSync(path.join(root,'tools/granada_g30_browser_network_probe/Program.cs'),'utf8');
const yml=fs.readFileSync(path.join(root,'.github/workflows/granada-g30-real-native-offline.yml'),'utf8');
function requireMatch(s,re,msg){assert.match(s,re,msg)}
function review(p,c,w){
 requireMatch(p,/RUNNER_ENVIRONMENT\s+-eq\s+'github-hosted'/,'only disposable Windows runner');
 requireMatch(p,/RUNNER_OS\s+-eq\s+'Windows'/,'Windows only');
 requireMatch(p,/Get-NetFirewallProfile/,'must validate Windows firewall state');
 requireMatch(p,/New-NetFirewallRule[^\n]*-Direction Outbound -Action Block -Program/,'must block genuine executable outbound traffic');
 requireMatch(p,/Get-NetFirewallApplicationFilter/,'must inspect installed per-program rule, not just command exit');
 requireMatch(p,/Remove-NetFirewallRule/,'must clean temporary firewall rules in finally');
 requireMatch(p,/foreach\(\$name in @\(\$firewallNames.ToArray\(\)\)\)/,'must remove every rule even if test aborts');
 requireMatch(p,/Find-ChromiumPrograms/,'must discover actual Edge WebView2 network process');
 requireMatch(p,/msedgewebview2\.exe/,'must explicitly block Chromium, not only FoamLens exe');
 requireMatch(p,/Network-Probe 'online'[\s\S]*Firewall-Deny[\s\S]*Network-Probe 'offline'/,'must establish independent real Chromium connectivity before and after blocking');
 requireMatch(p,/NativeSmoke \$originalPortable 'Portable offline cold'/,'actual offline Portable required');
 requireMatch(p,/NativeSmoke \$installedExe 'Installed offline cold'/,'actual offline original Installed required');
 requireMatch(p,/Launch-OriginalNormal \$installedExe/,'test NORMAL app user launch with updater check, not smoke alone');
 requireMatch(p,/Launch-OriginalNormal \$originalPortable/,'test normal Portable as well');
 requireMatch(p,/actualUninstallCompleted=\$true/,'genuine uninstall evidence required');
 requireMatch(p,/fullOfflineCaseImportProven=\$false/,'do not claim private offline OpenFOAM dataset import');
 requireMatch(p,/finalReleaseReady=\$false/,'offline proof cannot certify final stable release');
 assert.doesNotMatch(p,/\[string\]\$host\b/i,'PowerShell $Host is read-only');
 assert.doesNotMatch(p,/Remove-Item\s+.*(WebView2|\$profile)/i,'do not destroy browser profiles');
 requireMatch(c,/CoreWebView2Environment.CreateAsync/,'must instantiate actual real Chromium');
 requireMatch(c,/result.IsSuccess != expectedSuccess/,'block must be measured from actual Chromium native result');
 requireMatch(c,/Guid.NewGuid\(\)\.ToString/,'nonce required to disallow cached successful navigation');
 requireMatch(c,/api\.github\.com\/repos\/michels-lab\/FoamLens\/releases\/latest/,'only owning app public endpoint');
 requireMatch(c,/RUNNER_ENVIRONMENT/,'native network witness must reject user workstation');
 requireMatch(w,/ref: main/,'actual original main checkout required');
 requireMatch(w,/\$sha -ne \$remote/,'exact live main before native QA');
 requireMatch(w,/dotnet publish desktop\/src\/FoamLensDesktop\/FoamLensDesktop\.csproj/,'must build ORIGINAL Windows product');
 requireMatch(w,/choco install innosetup/,'must compile real original installer');
 requireMatch(w,/genuine-original-main-offline:/,'must execute actual Windows installed proof');
 requireMatch(w,/r\.realChromiumNetworkFailedDuringBlock -ne \$true/,'fail closed if genuine network not blocked');
 requireMatch(w,/r\.nativeInstalledSmokeCount -ne 2/,'do not accept solely Portable proof');
 requireMatch(w,/r\.normalInstalledApplicationRemainedVisible -ne \$true/,'normal-mode acceptance required');
 assert.doesNotMatch(w,/continue-on-error:\s*true/i,'no ignored failed acceptance');
}
test('main-only offline campaign has actual independently measurable Chromium network controls',()=>review(ps,cs,yml));
test('negative: outgoing block is missing',()=>{
 assert.throws(()=>review(ps.replace('New-NetFirewallRule','New-ItemFirewallRule'),cs,yml),/outbound traffic/);
});
test('negative: blocks FoamLens but forgets Edge WebView2',()=>{
 assert.throws(()=>review(ps.replaceAll('msedgewebview2.exe','fake-executable.exe'),cs,yml),/Chromium/);
});
test('negative: no pre-block online Chromium control',()=>{
 assert.throws(()=>review(ps.replace("Network-Probe 'online'","Write-Host 'we guess Internet worked'"),cs,yml),/before and after/);
});
test('negative: offline is declared from source without observing failed native browser navigation',()=>{
 assert.throws(()=>review(ps,cs.replace('result.IsSuccess != expectedSuccess','result.IsSuccess == expectedSuccess'),yml),/measured/);
});
test('negative: normal user-facing installed app is not opened',()=>{
 assert.throws(()=>review(ps.replace("Launch-OriginalNormal $installedExe 'Installed normal mode while auto-updater checks are blocked'","Write-Host skip"),cs,yml),/NORMAL/);
});
test('negative: test must never claim scientific offline case validation without case',()=>{
 assert.throws(()=>review(ps.replace('fullOfflineCaseImportProven=$false','fullOfflineCaseImportProven=$true'),cs,yml),/private offline/);
});
test('negative: static workflow cannot accept a false positive offline WebView2 result',()=>{
 assert.throws(()=>review(ps,cs,yml.replace('$r.realChromiumNetworkFailedDuringBlock -ne $true','$r.realChromiumNetworkFailedDuringBlock -eq $true')),/fail closed/);
});
