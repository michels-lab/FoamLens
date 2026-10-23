#!/usr/bin/env node
'use strict';
// G19: prove checked-out product is the exact original main commit, without
// grafted PR modules, modified tracked sources or borrowed scientific hosts.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const cp=require('node:child_process');
const SHA=/^[0-9a-f]{40}$/;
const SOURCES=[
 'desktop/src/FoamLensDesktop/Program.cs',
 'desktop/src/FoamLensDesktop/UpdateAssetIntegrity.cs',
 'desktop/src/FoamLensDesktop/FoamLensDesktop.csproj',
 'desktop/src/FoamLensDesktop/frontend/index.html',
 'desktop/src/FoamLensDesktop/frontend/v33-granada-wide-play-cascade-guard.js',
 'desktop/installer/FoamLens.iss'
];
function verifyIdentity(expected,actual,dirty,missing){
 if(!SHA.test(expected||''))throw Error('G19 missing immutable expected full main commit SHA');
 if(!SHA.test(actual||'')||actual!==expected)throw Error('G19 refuses non-main or changing product checkout');
 if(dirty)throw Error('G19 refuses changes to tracked product files: '+dirty.slice(0,120));
 if(missing.length)throw Error('G19 missing original main tracked source: '+missing.join(', '));
 return true;
}
function git(root,...args){return cp.execFileSync('git',['-C',root,...args],{encoding:'utf8',maxBuffer:16*1024*1024}).trim();}
function inspect(root,expected){
 root=path.resolve(root);
 const actual=git(root,'rev-parse','HEAD');
 const dirty=git(root,'status','--porcelain','--untracked-files=no');
 const missing=SOURCES.filter(p=>{
  if(!fs.existsSync(path.join(root,p)))return true;
  try{git(root,'ls-files','--error-unmatch','--',p);return false;}catch{return true;}
 });
 verifyIdentity(expected,actual,dirty,missing);
 const files=SOURCES.map(p=>{
  const absolute=path.join(root,p);
  const sha256=crypto.createHash('sha256').update(fs.readFileSync(absolute)).digest('hex');
  const gitBlob=git(root,'hash-object','--',p);
  const treeBlob=git(root,'rev-parse','HEAD:'+p);
  if(gitBlob!==treeBlob)throw Error('G19 original source differs from main Git tree: '+p);
  return{path:p,sha256,gitBlob};
 });
 return{schema:'foamlens/granada-g19-main-only-source/1',sourceSha:actual,
  checkout:'ORIGINAL_MAIN_ONLY',sourceTreeUntouched:true,
  testBranchCodeNotInProduct:true,ownerCompositeNotCompiled:true,files};
}
if(require.main===module){
 try{
  const [root,expected,output]=process.argv.slice(2);
  if(!root||!expected||!output)throw Error('Usage: node provenance.cjs product-dir expected-main-sha output.json');
  const report=inspect(root,expected);
  fs.mkdirSync(path.dirname(path.resolve(output)),{recursive:true});
  fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
  console.log('G19 exact original main SHA and tracked C#/UI/installer sources verified: '+report.sourceSha);
 }catch(err){console.error('G19 FAIL CLOSED: '+err.message);process.exitCode=1;}
}
module.exports={SOURCES,verifyIdentity,inspect};
