'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../desktop/src/FoamLensDesktop');
const host=fs.readFileSync(path.join(root,'Program.cs'),'utf8');
const integrity=fs.readFileSync(path.join(root,'UpdateAssetIntegrity.cs'),'utf8');
const g7=fs.readFileSync(path.join(root,'frontend/v27-granada-compact-workbench.js'),'utf8');
const g12=fs.readFileSync(path.join(root,'frontend/v31-granada-wide-field-ribbon.js'),'utf8');
const g13=fs.readFileSync(path.join(root,'frontend/v32-granada-field-cameras.js'),'utf8');
const g16=fs.readFileSync(path.join(root,'frontend/v33-granada-wide-play-cascade-guard.js'),'utf8');
const g16Fix='body.flRibbonReady.appMode-field #appShell.app.gfwCompact #flRibbonPanel-field .flRibbonTimeGroup #fwTimePlay';

test('CURRENT MAIN embeds installed G15 and G16 in their original dedicated source files',()=>{
 assert(host.includes('UpdateAssetIntegrity.RequireOfficialReleaseAsset('));
 assert(host.includes('UpdateAssetIntegrity.RequireExactSha256(checksumText, release.InstallerName)'));
 const helper=fs.readFileSync(path.join(root,'TrustedEmbeddedFrontendExtensions.cs'),'utf8');
 assert(host.includes('TrustedEmbeddedFrontendExtensions.ReadFromRunningAssembly()'));
 assert(host.includes('string.Join(Environment.NewLine, bundledExtensions)'));
 assert(!host.includes('Directory.GetFiles(AppRoot, "v*-*.js")'),
   'G17 source contract must not reauthorize unbundled local JavaScript');
 assert(helper.includes('GetManifestResourceStream(BundleResource)'),
   'G16 must be loaded only from executable-embedded original AppBundle.zip');
 assert(g16.includes('window.FoamLensGranadaG16=Object.freeze({audit})'));
});
test('G16 must outrank original compact G7 even if the compact stylesheet loads later',()=>{
 assert(g7.includes('body.flRibbonReady.appMode-field .app.gfwCompact #flRibbonPanel-field .flRibbonTimeGroup #fwTimePlay{min-width:68px!important;width:auto!important;max-width:100%!important}'));
 assert(g12.includes('min-width:112px!important'));
 assert(g16.includes('@media(min-width:1025px) and (max-width:1250px)'));
 assert(g16.includes(g16Fix+'{min-width:112px!important;width:max-content!important;max-width:none!important'));
 assert(!g16.includes('body.flRibbonReady.appMode-field .app.gfwCompact #flRibbonPanel-field .flRibbonTimeGroup #fwTimePlay{min-width:112px'));
});
test('G16 source is compact-safe and original Camera G13 remains source-native',()=>{
 assert(g16.includes('appMode-field'));
 assert(g16.includes('physicsOrSavedStateChanged:false'));
 assert(g16.includes('nativeInstalledOrPhysicalDpiApproved:false'));
 for(const id of ['flRaCameraIso','flRaCameraFront','flRaCameraBack','flRaCameraLeft','flRaCameraRight','flRaCameraTop','flRaCameraBottom'])assert(g13.includes(id),id);
 for(const forbidden of ['localStorage.setItem','fetch(','.click(','.dispatchEvent('])assert(!g16.includes(forbidden),forbidden);
});
test('G15 updater must validate both official asset identities BEFORE fetching them',()=>{
 const first=host.indexOf('var officialInstallerUrl = UpdateAssetIntegrity.RequireOfficialReleaseAsset(');
 const second=host.indexOf('var officialChecksumUrl = UpdateAssetIntegrity.RequireOfficialReleaseAsset(');
 const download=host.indexOf('await DownloadUpdateFileAsync(officialInstallerUrl.AbsoluteUri, installerPath)');
 assert(first>=0&&second>first&&download>second);
 assert(host.includes('SHA256.HashDataAsync(installerStream)'));
 assert(host.includes('string.Equals(expectedHash, actualHash, StringComparison.OrdinalIgnoreCase)'));
 assert(integrity.includes('segments[0] != "michels-lab"'));
 assert(integrity.includes('segments[1] != "FoamLens"'));
 assert(integrity.includes('rows.Length != 1'));
});
test('no G17 integration route modifies G7/G12 source, original Field solver or release metadata',()=>{
 const docs=[
  path.resolve(__dirname,'../.github/workflows/granada-g17-integrated-guards.yml'),
  path.resolve(__dirname,'../docs/GRANADA_G17_COMBINED_RELEASE_SAFETY_2026-10-22.md')
 ];
 for(const p of docs)assert(fs.existsSync(p),p);
 const workflow=fs.readFileSync(docs[0],'utf8');
 assert(workflow.includes("tools/granada_g15_updater_harness/UpdaterHarness.csproj"));
 assert(workflow.includes("tools/granada_g16_wide_play_cascade.test.cjs"));
 assert(workflow.includes("tools/test_repository_boundaries.cjs"));
 assert(!workflow.includes('gh release create'));
 assert(!workflow.includes('dotnet publish'));
});
