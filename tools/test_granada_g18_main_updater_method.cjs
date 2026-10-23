'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),cp=require('node:child_process'),fs=require('node:fs'),path=require('node:path');
const {patch,method,start,next}=require('./granada_g18_main_updater_method.cjs');
const host='desktop/src/FoamLensDesktop/Program.cs';
const old=cp.execFileSync('git',['show','529d7055a6d97d06d2ee4158e858de94037228d7:'+host],{encoding:'utf8',maxBuffer:6*1024*1024});
const modern=cp.execFileSync('git',['show','01e032279ce165e5d62c1d1e93371fcf52f620c6:'+host],{encoding:'utf8',maxBuffer:6*1024*1024});

test('G18 takes main update method exactly, retaining 100% of original science/owner C# outside it',()=>{
 const result=patch(old,old,modern);
 const oldMethod=method(old).content,actual=method(modern).content;
 assert.equal(method(result.updated).content,actual);
 assert.equal(result.updated.replace(actual,oldMethod),old);
 assert.equal(result.report.same_exact_current_main_updater_method,true);
 assert.equal(result.report.release_authorized,false);
 assert.equal(result.report.original_owner_csharp_unchanged_outside_updater,true);
 assert(result.updated.includes('FoamLens real OpenFOAM'));
});
test('G18 preserves additional owner science additions even after 16-owner composite',()=>{
 const c=old.replace('    private async Task DownloadVerifyAndLaunchUpdateAsync(UpdateReleaseInfo release)','    // G18 ORIGINAL SCIENCE/CADE OWNER kept here\n    private async Task DownloadVerifyAndLaunchUpdateAsync(UpdateReleaseInfo release)');
 const result=patch(c,old,modern);
 assert(result.updated.includes('// G18 ORIGINAL SCIENCE/CADE OWNER kept here'));
 assert(!result.updated.includes('checksumText.Contains(release.InstallerName, StringComparison.OrdinalIgnoreCase)'));
 assert(result.updated.includes('UpdateAssetIntegrity.RequireExactSha256('));
});
test('G18 fails closed if owner updater block is changed or source G15 not reviewed',()=>{
 assert.throws(()=>patch(old.replace('The update checksum does not identify','Altered checksum semantics'),old,modern),/scientific host updater changed/);
 assert.throws(()=>patch(old,old,old),/not reviewed G15 implementation|differs from exact reviewed G15 bytes/);
 assert.throws(()=>patch(old,old,modern.replace('UpdateAssetIntegrity.RequireOfficialReleaseAsset(','OtherSource.RequireOfficialReleaseAsset(')),/not reviewed|differs from exact reviewed G15 bytes/);
 assert.throws(()=>patch(old,old,modern.replace('UpdateAssetIntegrity.RequireExactSha256(checksumText, release.InstallerName)','new string(\'0\',64)')), /not reviewed|differs from exact reviewed G15 bytes/);
});
test('G18 original installer SHA and user-consent/elevation flow unchanged outside G15 updater',()=>{
 const out=patch(old,old,modern).updated;
 for(const needed of ['UpdateHttpClient','Process.Start(new ProcessStartInfo(installerPath)','SHA256.HashDataAsync(installerStream)','DialogResult.Yes'])assert(out.includes(needed),needed);
 assert.equal((out.match(/    private async Task DownloadVerifyAndLaunchUpdateAsync\(UpdateReleaseInfo release\)/g)||[]).length,1);
 assert.equal((out.match(/    private static async Task DownloadUpdateFileAsync\(string url, string path\)/g)||[]).length,1);
});
test('G18 source helper does not publish or merge anything',()=>{
 const source=fs.readFileSync(path.resolve(__dirname,'granada_g18_main_updater_method.cjs'),'utf8');
 for(const bad of ['gh release create','git push','dotnet publish','localStorage','powershell Set-ExecutionPolicy','signing_key'])assert(!source.includes(bad),bad);
 assert(source.includes('actual_signed_product_not_approved:true'));
});
