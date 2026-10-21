#!/usr/bin/env node
'use strict';
// GRANADA: read-only, fail-closed proof gate for a FINAL FoamLens stable release.
// No GitHub writes, no release/tag, no private CFD data in output.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {imageStatus}=require('./granada-png-proof.cjs');
const SCHEMA='foamlens/granada-final-release-proof/1';
const SOURCE='foamlens/granada-github-snapshot/1';
const REQUIRE_PRS=[162,175,179,180,181,183,184,194,195,196];
const TABS=['Home','Data','3D-Field','Analysis','Export','View','Review','Live'];
const PLATFORMS=['setup','portable'];
const SHA=/^[a-f0-9]{40}$/;
const DIGEST=/^[a-f0-9]{64}$/;
const VER=/^\d+\.\d+\.\d+$/;
const MAX_JSON=1024*1024;
function loadJson(file){
 if(fs.statSync(file).size>MAX_JSON)throw Error('Oversized proof JSON');
 return JSON.parse(fs.readFileSync(file,'utf8'));
}
function safeFile(root,relative){
 if(typeof relative!=='string'||relative.length>180||!/^artifacts\/[a-zA-Z0-9_./-]+$/.test(relative)||
 relative.split('/').some(p=>!p||p==='.'||p==='..'))throw Error('unsafe path');
 const base=fs.realpathSync(root),full=path.resolve(base,...relative.split('/'));
 if(!full.startsWith(base+path.sep))throw Error('escaped proof root');
 let at=base;
 for(const part of relative.split('/')){
  at=path.join(at,part);
  if(fs.existsSync(at)&&fs.lstatSync(at).isSymbolicLink())throw Error('symlinked proof prohibited');
 }
 return full;
}
function verifyBytes(root,item,kind){
 if(!item||!DIGEST.test(item.sha256||''))return false;
 try{
  const file=safeFile(root,item.file),stat=fs.statSync(file);
  if(!stat.isFile()||stat.size<128||stat.size>150*1024*1024)return false;
  const blob=fs.readFileSync(file);
  if(crypto.createHash('sha256').update(blob).digest('hex')!==item.sha256)return false;
  if(kind==='png'){
   const dimensions=imageStatus(blob);
   if(!dimensions||Math.abs(dimensions.width-Math.round(item.cssWidth*item.dpi))>4)return false;
  }else if(blob[0]!==0x4d||blob[1]!==0x5a)return false; // Windows PE/installer MZ magic
  return true;
 }catch{return false;}
}
function versionParts(v){return VER.test(v||'')?v.split('.').map(Number):null;}
function newer(next,latest){
 const a=versionParts(next),b=versionParts(latest);
 if(!a)return false;
 if(!latest)return true;
 if(!b)return false;
 for(let i=0;i<3;i++){if(a[i]!==b[i])return a[i]>b[i];}
 return false;
}
function inspect(snapshot,proof,root){
 const gates=[],fail=(id,why)=>gates.push({id,passed:false,reason:why}),
  pass=id=>gates.push({id,passed:true});
 if(!snapshot||snapshot.schema!==SOURCE||!proof||proof.schema!==SCHEMA)throw Error('Unsupported release proof schema');
 const head=snapshot.mainSha;
 if(SHA.test(head||'')&&head===proof.sourceSha)pass('main-source-identity');
 else fail('main-source-identity','Proof does not bind current main SHA');
 if(newer(snapshot.version,snapshot.latestRelease?.version))pass('next-stable-version');
 else fail('next-stable-version','Next final semver must exceed verified latest public stable version');
 if(snapshot.latestRelease && snapshot.latestRelease.prerelease!==false)fail('latest-release-channel','Reported latest release is not stable');
 else pass('latest-release-channel');
 const prs=Array.isArray(snapshot.requiredPRs)?snapshot.requiredPRs:[];
 const missing=REQUIRE_PRS.filter(n=>!prs.some(p=>p.number===n&&p.merged===true&&p.mergeCommit&&SHA.test(p.mergeCommit)));
 if(missing.length)fail('required-integration','Unmerged/unverified source workstream PRs: '+missing.join(','));
 else pass('required-integration');
 const runs=Array.isArray(snapshot.workflowRuns)?snapshot.workflowRuns:[];
 const native=runs.find(r=>r.workflow==='build-foamlens-desktop.yml'&&r.headSha===head&&r.conclusion==='success'&&r.event==='push');
 if(native)pass('exact-main-native-ci');else fail('exact-main-native-ci','No successful full Windows build/QA on exact main SHA');
 if(proof.releaseMode==='stable'&&proof.prerelease===false)pass('stable-only');else fail('stable-only','No RC/beta/prerelease allowed');
 const artifacts=Array.isArray(proof.artifacts)?proof.artifacts:[];
 const ext={setup:'.exe',portable:'.exe'};
 const validArtifacts=PLATFORMS.every(p=>artifacts.filter(a=>a.platform===p&&a.sourceSha===head&&a.version===snapshot.version&&
  typeof a.file==='string'&&a.file.toLowerCase().endsWith(ext[p])&&verifyBytes(root,a,'binary')).length===1);
 if(validArtifacts)pass('installer-and-portable-integrity');else fail('installer-and-portable-integrity','Missing or mismatched Setup/Portable bytes, digest, source or version');
 const app=proof.appRuntime||{};
 if(app.sourceSha===head&&app.setupInstalled===true&&app.setupLaunched===true&&app.portableLaunched===true&&
 app.licenseAccepted===true&&app.aboutAccessible===true&&app.updaterVerified===true)pass('actual-windows-runtime');
 else fail('actual-windows-runtime','Installed Setup, launched portable, license, fixed About or updater evidence missing');
 const science=proof.science||{};
 const regions=Array.isArray(science.physicalRegions)?science.physicalRegions:[];
 const views=Array.isArray(science.verifiedViews)?science.verifiedViews:[];
 if(science.sourceSha===head&&science.realOpenFOAMFixture===true&&science.realCaseImported===true&&
 regions.includes('metal')&&regions.includes('mold')&&['A','B','C','D'].every(v=>views.includes(v))&&
 science.metricXYZVerified===true&&science.fieldTimeAssociationVerified===true&&science.noFabricatedData===true)
 pass('real-multiregion-science');
 else fail('real-multiregion-science','Real metal/mold A–D import/XYZ/field-time source verification incomplete');
 const dev=proof.developerEdition||{};
 if(dev.sourceSha===head&&dev.separateExecutable===true&&dev.isolatedProfile===true&&
 dev.redactedReport===true&&dev.sectionAnnotationsRetained===true)pass('developer-twin-isolation');
 else fail('developer-twin-isolation','Developer executable, isolated profile, annotations or privacy not verified');
 const screenshots=Array.isArray(proof.captures)?proof.captures:[];
 const seen=new Set(),seenPixels=new Set(),valid=[];
 for(const s of screenshots){
  if(!TABS.includes(s?.tab)||!PLATFORMS.includes(s?.platform)||!Number.isInteger(s.cssWidth)||s.cssWidth<1024||
   ![1.25,1.5,1.75,2].includes(s.dpi)||s.sourceSha!==head||
   !DIGEST.test(s.artifactSha256||''))continue;
  const a=artifacts.find(x=>x.platform===s.platform);
  if(!a||a.sha256!==s.artifactSha256||!verifyBytes(root,s,'png'))continue;
  const key=[s.platform,s.tab,s.cssWidth,s.dpi].join(':');
  if(seen.has(key)||seenPixels.has(s.sha256))continue;
  seen.add(key);seenPixels.add(s.sha256);valid.push(s);
 }
 const each=PLATFORMS.every(p=>{
  const found=valid.filter(s=>s.platform===p);
  return found.length>=18 && TABS.every(t=>found.some(s=>s.tab===t)) &&
   [1024,1280,1920].every(w=>found.some(s=>s.cssWidth===w)) &&
   [1.25,1.5,1.75,2].every(d=>found.some(s=>s.dpi===d));
 });
 if(each&&valid.length>=36)pass('native-36-screenshot-matrix');
 else fail('native-36-screenshot-matrix','Need 36 unique source+artifact-bound real PNG captures covering 8 tabs/Setup/Portable/widths/DPI; validated '+valid.length);
 if(proof.finalDistribution?.sourceSha===head&&proof.finalDistribution?.updateManifestVerified===true&&
 proof.finalDistribution?.releaseNotesComplete===true&&proof.finalDistribution?.sha256Published===true&&
 proof.finalDistribution?.assetsChecked===true&&proof.finalDistribution?.signingStateDeclared===true)
 pass('official-distribution-readiness');
 else fail('official-distribution-readiness','Final notes/asset checks/update feed/checksums/signing truth incomplete');
 return{
  schema:'foamlens/granada-release-verdict/1',headSha:SHA.test(head||'')?head:null,
  readyToPublish:gates.every(g=>g.passed),
  approval:'CONDITIONAL_GRANADA_FINAL_STABLE_ONLY',
  result:gates.every(g=>g.passed)?'READY_TO_PUBLISH_STABLE':'RELEASE_BLOCKED',
  gates,counts:{passed:gates.filter(g=>g.passed).length,total:gates.length,verifiedScreenshots:valid.length},
  limits:[
   'The proof JSON must originate from independently audited native/scientific CI; synthetic/test JSON is never real release evidence',
   'This tool never merges code, creates tags or publishes releases',
   'Owner visual review is recorded after publication, not forged before release',
   'Latest public release, updater and remote assets must be rechecked after publishing'
  ]
 };
}
function cli(args){
 if(args.length<2||args.length>3)throw Error('Usage: node granada-release-proof.cjs github-snapshot.json proof.json [working-root]');
 const result=inspect(loadJson(args[0]),loadJson(args[1]),args[2]||'.');
 process.stdout.write(JSON.stringify(result,null,2)+'\n');
 return result.readyToPublish?0:2;
}
if(require.main===module){
 try{process.exitCode=cli(process.argv.slice(2));}
 catch(e){process.stderr.write('Granada final-release gate failed: '+e.message+'\n');process.exitCode=1;}
}
module.exports={SCHEMA,SOURCE,REQUIRE_PRS,TABS,PLATFORMS,safeFile,verifyBytes,newer,inspect,cli};
