#!/usr/bin/env node
'use strict';
/* GRANADA G18 TEST-ONLY: retain exact scientific owner host, transplant only
 * the verified G15 updater method from current-main bytes. No source merge. */
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const file=path.resolve('desktop/src/FoamLensDesktop/Program.cs');
const reviewed=path.resolve('artifacts/granada-g18-main-Program.cs');
const base='529d7055a6d97d06d2ee4158e858de94037228d7';
const start='    private async Task DownloadVerifyAndLaunchUpdateAsync(UpdateReleaseInfo release)';
const next='    private static async Task DownloadUpdateFileAsync(string url, string path)';
const digest=s=>crypto.createHash('sha256').update(s).digest('hex');
function method(body){
 const a=body.indexOf(start),b=body.indexOf(next,a+start.length);
 if(a<0||b<a||body.indexOf(start,a+start.length)!==-1||body.indexOf(next,b+next.length)!==-1)
   throw Error('G18 updater method source anchors are not unique');
 const content=body.slice(a,b);
 if(content.length<1100||content.length>7000)throw Error('G18 updater method unexpected source length');
 return{start:a,end:b,content};
}
function patch(host,oldMain,newMain){
 const original=method(host),baseMethod=method(oldMain).content,actual=method(newMain).content;
 if(original.content!==baseMethod)throw Error('G18 scientific host updater changed relative to exact pinned owner baseline: fail closed');
 if(!actual.includes('UpdateAssetIntegrity.RequireOfficialReleaseAsset(')||
    !actual.includes('UpdateAssetIntegrity.RequireExactSha256(checksumText, release.InstallerName)')||
    !actual.includes('SHA256.HashDataAsync(installerStream)')||
    !actual.includes('Process.Start(new ProcessStartInfo(installerPath)'))
      throw Error('G18 source updater block is not reviewed G15 implementation');
 if(baseMethod.includes('UpdateAssetIntegrity.RequireOfficialReleaseAsset('))
    throw Error('G18 pinned baseline already contains G15: no surgery permitted');
 const updated=host.slice(0,original.start)+actual+host.slice(original.end);
 if(method(updated).content!==actual)throw Error('G18 updater exact copied source differs');
 if(updated.replace(actual,baseMethod)!==host)
    throw Error('G18 modified native owner code outside exact G15 updater method');
 return {updated,report:{
  schema:'foamlens/granada-g18-exact-main-updater-method/1',
  historical_owner_base_sha:base,
  original_owner_csharp_unchanged_outside_updater:true,
  original_updater_sha256:digest(baseMethod),
  main_updater_sha256:digest(actual),
  same_exact_current_main_updater_method:true,
  method_only_copy_not_entire_main_program:true,
  other_scientific_owners_present_in_disposable_host:true,
  actual_signed_product_not_approved:true,
  release_authorized:false
 }};
}
function execute(){
 const baseline=cp.execFileSync('git',['show',base+':desktop/src/FoamLensDesktop/Program.cs'],{encoding:'utf8',maxBuffer:1024*1024*5});
 const owner=fs.readFileSync(file,'utf8');
 const current=fs.readFileSync(reviewed,'utf8');
 const p=patch(owner,baseline,current);
 fs.writeFileSync(file,p.updated,'utf8');
 const output=path.resolve('artifacts/granada-g18-updater-method-provenance.json');
 fs.mkdirSync(path.dirname(output),{recursive:true});
 fs.writeFileSync(output,JSON.stringify(p.report,null,2)+'\n');
 console.log('G18 preserved 16-owner native host and copied exact G15 updater method from current main; original CFA science unchanged, no release');
}
if(require.main===module){try{execute()}catch(e){console.error('G18 fail-closed: '+e.message);process.exitCode=2}}
module.exports={patch,method,start,next};
