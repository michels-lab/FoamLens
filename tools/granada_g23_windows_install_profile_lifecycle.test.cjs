'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const installer=fs.readFileSync(path.join(root,'desktop/installer/FoamLens.iss'),'utf8');
const host=fs.readFileSync(path.join(root,'desktop/src/FoamLensDesktop/Program.cs'),'utf8');
const src=fs.readFileSync(path.join(__dirname,'granada_g23_windows_install_profile_lifecycle.ps1'),'utf8');
const workflow=fs.readFileSync(path.join(root,'.github/workflows/granada-g23-windows-profile-lifecycle.yml'),'utf8');

test('native QA uses actual official Inno user install and installed binary, not fabricated shortcuts',()=>{
 for(const k of ['Start-Inno $setup $installedDir','Start-Inno $setup $installedDir','unins000.exe','/CURRENTUSER','/MERGETASKS=!desktopicon','Native-Smoke $installed','Native-Smoke $reinstalled'])
  assert(src.includes(k),'missing actual Windows lifecycle: '+k);
 assert(installer.includes('AppId={{D60D5F20-3D55-4C0E-B8C5-4B7F0A5C9E21}'));
 assert(src.includes('originalSetupSHA256')&&src.includes('originalPortableSHA256'));
});
test('only a disposable hosted Windows Actions environment may install or remove any files',()=>{
 assert(src.includes("$env:GITHUB_ACTIONS -eq 'true' -and $env:RUNNER_ENVIRONMENT -eq 'github-hosted'"));
 assert(src.includes("$env:RUNNER_OS -eq 'Windows'"));
 assert(src.includes("Refusing to operate outside disposable GitHub workspace"));
 assert(src.includes("Refusing to overwrite or reuse any prior installer test root"));
 assert(src.includes("Refusing to overwrite existing user shortcut"));
 assert(!/Remove-Item[^\n]*(?:AppData|profileDir|developerDir|wvDir)\b/i.test(src));
 assert(!src.includes('Remove-Item -Recurse')&&!src.includes('rmdir /s'));
});
test('covers Unicode Portable relocation and byte-identical original installed EXE',()=>{
 assert(src.includes('Portable USB ruta española 日本'));
 assert(src.includes('Install same version ñ 日本'));
 assert(src.includes('(Hash $portable) -eq (Hash $relocated)'));
 assert(src.includes('(Hash $installed) -eq (Hash $portable)'));
 assert(src.includes('Native-Smoke $relocated'));
});
test('preserves actual FoamLens, WebView2 and independent developer folder synthetic user-owned markers',()=>{
 assert(host.includes('Environment.SpecialFolder.LocalApplicationData'));
 assert(host.includes('ProductDataFolder, "Desktop", "WebView2"'));
 for(const s of ["FoamLens\\Desktop","FoamLensDeveloper\\Desktop",'webview-profile','separate-developer-profile','Verify-Sentinels $markers','Native-Smoke $relocated'])
  assert(src.includes(s),'missing original user-profile preservation contract: '+s);
 assert(src.includes('syntheticProfileSentinelsPreserved=3'));
 assert(src.includes('actualWebView2LocalStorageRoundTripTested=$false'));
 assert(src.includes('crossVersionUpgradeTested=$false'));
});
test('workflow is QA-only, pinned real main, non-publishing and hashes only',()=>{
 assert(workflow.includes('ref: main'));
 assert(workflow.includes('persist-credentials: false'));
 assert(workflow.includes('node --test tools/granada_g23_windows_install_profile_lifecycle.test.cjs'));
 assert(workflow.includes('granada_g23_windows_install_profile_lifecycle.ps1'));
 assert(workflow.includes('if-no-files-found: warn'));
 assert(!workflow.includes('gh release create')&&!workflow.includes('workflow_dispatch:')===false);
 assert(!workflow.includes('QUICKCUP_FIXTURE_TOKEN'));
});
test('no synthetic user notes, original OpenFOAM or binaries go into Actions artifact',()=>{
 assert(workflow.includes('g23-evidence/report.json'));
 assert(!/path:.*(?:FoamLens\.exe|\.zip|quickcup-test|AppData)/.test(workflow));
 for(const k of ['originalMainSha','originalPortableSHA256','sourceAccuracyIndependentlyCertified=$false','signedStableReleaseApproved=$false'])
  assert(src.includes(k));
});
