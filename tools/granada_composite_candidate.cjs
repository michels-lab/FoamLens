#!/usr/bin/env node
'use strict';
/* GRANADA #177: ephemeral composite, never a merge or release.
 * Source is taken from seven exact GitHub PR HEADs and checked before overlay.
 * All writes are NEW permitted files in this checkout, not changes to PR branches. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const {parseArgs}=require('node:util');
const SCHEMA='foamlens-granada-composite-v1',SHA=/^[a-f0-9]{40}$/i;
const EXPECTED_PRS=[164,165,166,167,168,169,170,171,175,179,180,181,182,183,184,187];
const BASE_PATHS=[
 'desktop/src/FoamLensDesktop/frontend/index.html',
 'desktop/src/FoamLensDesktop/Program.cs',
 '.github/workflows/build-foamlens-desktop.yml',
 'desktop/src/FoamLensDesktop/frontend/v15-ribbon-ui.js',
 'desktop/src/FoamLensDesktop/frontend/v21-analysis-scope.js',
 'desktop/src/FoamLensDesktop/frontend/v14-dual-timeseries.js',
 'desktop/src/FoamLensDesktop/frontend/v14-zz-field-workspace.js',
 'desktop/src/FoamLensDesktop/frontend/v14-field-view.js',
 'desktop/src/FoamLensDesktop/frontend/v14-z-field-compare.js',
 'desktop/src/FoamLensDesktop/frontend/v16-multipanel-export.js',
 'desktop/src/FoamLensDesktop/frontend/v14-animation-export.js'
];
const sha256=b=>crypto.createHash('sha256').update(b).digest('hex');
const permitted=p=>
 /^desktop\/src\/FoamLensDesktop\/frontend\/v24-[a-zA-Z0-9_.-]+\.js$/.test(p)||
 /^desktop\/tests\/[a-zA-Z0-9_.-]+\.(?:spec|test)\.cjs$/.test(p)||
 /^tools\/(?:granada_visual_review|test_granada_visual_review)\.cjs$/.test(p);
function verify(manifest){
 if(manifest?.schema!==SCHEMA||!SHA.test(manifest.base_sha||''))throw Error('Invalid composite schema or base commit');
 if(manifest.purpose!=='PREVIEW_ONLY_DO_NOT_MERGE_OR_RELEASE')throw Error('No-preview publication contract');
 if(!Array.isArray(manifest.components)||manifest.components.length!==EXPECTED_PRS.length)
   throw Error('Composite needs all seven independent pinned owner PRs');
 const seen=new Set(),prs=[];
 for(const c of manifest.components){
  if(!Number.isSafeInteger(c.pr)||!EXPECTED_PRS.includes(c.pr)||!SHA.test(c.sha||'')||
    typeof c.name!=='string'||!c.name.trim()||!Array.isArray(c.files)||!c.files.length)
    throw Error('Invalid source owner entry');
  if(prs.includes(c.pr))throw Error('Duplicate PR owner: '+c.pr);
  prs.push(c.pr);
  // Check unsafe file paths BEFORE structure/cardinality, so a traversal
  // cannot be disguised by the generic "missing module" diagnostic.
  for(const p of c.files){
   if(typeof p!=='string'||!permitted(p))throw Error('Forbidden source overlay path: '+String(p));
   if(seen.has(p))throw Error('Overlapping source path between PR owners: '+p);
   seen.add(p)
  }
  const js=c.files.filter(p=>p.startsWith('desktop/src/FoamLensDesktop/frontend/'));
  if(c.pr!==182&&js.length!==1)throw Error('Exactly one frontend module needed from PR '+c.pr);
  if(c.pr===182&&js.length!==0)throw Error('G5 review tools are not frontend modules');
 }
 // #174 uses the same meInstall/meExport symbols and DOM IDs as Multi-panel.
 // Only the separately reviewed, exact-SHA namespaced source #187 is allowed
 // back into this combined native preview. Never silently stage original #174.
 const lineage=manifest.fixed_owner_lineage?.checkMesh,repair=manifest.components.find(c=>c.pr===187);
 if(manifest.components.some(c=>c.pr===174)||!lineage||lineage.original_owner_pr!==174||
    !SHA.test(lineage.original_sha||'')||lineage.isolated_fix_pr!==187||
    lineage.fixed_sha!==repair?.sha||lineage.merge_authorized!==false)
   throw Error('Original #174 checkMesh may only enter preview through exact namespaced #187 owner');
 const required=[
  'desktop/src/FoamLensDesktop/frontend/v24-checkmesh-region-evidence.js',
  'desktop/tests/checkmesh-region-evidence.spec.cjs',
  'desktop/tests/checkmesh-multipanel-collision.spec.cjs'
 ];
 if(required.some(p=>!repair.files.includes(p))||repair.files.length!==required.length)
   throw Error('Namespaced checkMesh original scientific and collision suites missing');
 if(EXPECTED_PRS.some(x=>!prs.includes(x)))throw Error('Missing owner');
 return{owners:prs.length,files:seen.size,frontend:[...seen].filter(x=>x.startsWith('desktop/src/FoamLensDesktop/frontend/'))}
}
function runGit(args,{cwd,maxBuffer=24*1024*1024}={}){
 const out=cp.spawnSync('git',args,{cwd,encoding:null,maxBuffer,timeout:90000,windowsHide:true});
 if(out.error||out.status!==0)throw Error('Git '+args.slice(0,2).join(' ')+': '+String(out.error?.message||
  out.stderr?.toString('utf8').slice(0,900)||'exit '+out.status));
 return out.stdout
}
function gitProvider(root){
 return{
  baseAncestor(base){
   // base is immutable even when main has advanced. This candidate must be
   // built from an ancestor, not silently rebased onto a different baseline.
   runGit(['cat-file','-e',base+'^{commit}'],{cwd:root});
   runGit(['merge-base','--is-ancestor',base,'HEAD'],{cwd:root})
  },
  headFor(pr){
   const out=runGit(['ls-remote','origin','refs/pull/'+pr+'/head'],{cwd:root}).toString('utf8').trim();
   const sha=out.split(/\s+/)[0];if(!SHA.test(sha||''))throw Error('PR head unavailable: '+pr);
   return sha
  },
  source(pr,sha,filename){
   // Fetch commit via a distinct local ref, NEVER checkout/merge/cherry-pick.
   const ref='refs/remotes/granada-composite/pr-'+pr;
   const fetched=runGit(['rev-parse','--verify',ref],{cwd:root}).toString('utf8').trim();
   if(fetched!==sha)throw Error('Unfetched or changed PR ref '+pr);
   return runGit(['show',sha+':'+filename],{cwd:root})
  },
  fetch(pr){
   const ref='refs/remotes/granada-composite/pr-'+pr;
   runGit(['fetch','--no-tags','origin','+refs/pull/'+pr+'/head:'+ref],{cwd:root});
  }
 }
}
function resolveWithin(root,relative){
 if(!permitted(relative))throw Error('Unapproved staging destination');
 const base=fs.realpathSync(root),target=path.resolve(base,...relative.split('/'));
 const rel=path.relative(base,target);
 if(rel==='..'||rel.startsWith('..'+path.sep)||path.isAbsolute(rel))throw Error('Overlay path outside checkout');
 // Existing path components cannot be symlinks. No clobber, even if a symlink
 // points back into the workspace.
 let parent=base;
 for(const part of relative.split('/').slice(0,-1)){
  parent=path.join(parent,part);
  if(fs.existsSync(parent)&&fs.lstatSync(parent).isSymbolicLink())throw Error('Symlinked source directory');
 }
 return target
}
function snapshot(root){
 const hashes={};
 for(const p of BASE_PATHS){
  const f=path.join(root,...p.split('/'));
  if(!fs.existsSync(f))throw Error('Original critical source missing: '+p);
  hashes[p]=sha256(fs.readFileSync(f))
 }
 return hashes
}
function compose(manifest,provider,{root,write=true}={}){
 const spec=verify(manifest),base=fs.realpathSync(root);
 provider.baseAncestor?.(manifest.base_sha);
 const baselineBefore=snapshot(base),bytes=new Map(),owners=[];
 // All remote pin checks finish BEFORE any local file write.
 for(const c of manifest.components){
  const live=provider.headFor(c.pr);
  if(live!==c.sha)throw Error('PR '+c.pr+' moved: expected '+c.sha+' actual '+live);
  provider.fetch?.(c.pr);
  const checks=[];
  for(const p of c.files){
   const target=resolveWithin(base,p);
   if(fs.existsSync(target))throw Error('Refusing to overwrite existing source '+p);
   const data=provider.source(c.pr,c.sha,p);
   if(!Buffer.isBuffer(data)||!data.length||data.length>4*1024*1024)throw Error('Invalid source bytes: '+p);
   try{new Function(data.toString('utf8').replace(/^#![^\n]*\n/,''))}
   catch(e){throw Error('Syntax invalid '+p+': '+e.message)}
   bytes.set(p,data);
   checks.push({path:p,sha256:sha256(data),size:data.length});
  }
  owners.push({pr:c.pr,source_sha:c.sha,name:c.name,files:checks})
 }
 // Important: Program.cs loads these frontend modules in ordinal-ignorecase
 // name order, INSIDE its one main IIFE. Compile that exact shared lexical
 // scope, not just the isolated files.
 const jsPaths=[...bytes.keys()].filter(p=>p.startsWith('desktop/src/FoamLensDesktop/frontend/'))
   .sort((a,b)=>a.toLowerCase()<b.toLowerCase()?-1:a.toLowerCase()>b.toLowerCase()?1:0);
 try{new Function(jsPaths.map(p=>bytes.get(p).toString('utf8')).join('\n;\n'))}
 catch(e){throw Error('Runtime IIFE lexical collision: '+e.message)}
 if(write){
  const written=[];
  try{
   for(const [p,data] of bytes){
    const dest=resolveWithin(base,p);
    fs.mkdirSync(path.dirname(dest),{recursive:true});
    fs.writeFileSync(dest,data,{flag:'wx'});written.push(dest)
   }
  }catch(error){
   for(const target of written)try{fs.unlinkSync(target)}catch{}
   throw error
  }
 }
 const baselineAfter=snapshot(base);
 for(const p of BASE_PATHS)if(baselineAfter[p]!==baselineBefore[p])
  throw Error('Baseline original changed: '+p);
 return{
  schema:SCHEMA,status:write?'STAGED_UNMERGED':'VALIDATED_UNMERGED',base_sha:manifest.base_sha,
  original_source_preserved:true,
  counts:{prs:spec.owners,files:spec.files,frontend:spec.frontend.length},
  exact_frontend_injection_order:jsPaths,
  sources:owners,critical_base_sha256:baselineAfter,
  scientific_approval:false,installed_windows_approval:false,release_authorized:false,
  gates:[
   'All staged modules compiled together in the original host IIFE, not proved rendered.',
   'Run original and combined native-node regressions in both OS jobs.',
   'Run real native Windows smoke with these staged scripts before any integration.',
   'Validate OpenFOAM multi-region inputs, 3D views A-D and scientific quantities physically.',
   'Capture installed/portable visuals at 125-200% DPI and approve with owner.',
   'Review merge order, resolve documentation conflicts, perform no automatic release.'
  ]
 }
}
function main(argv=process.argv.slice(2)){
 const {values}=parseArgs({args:argv,options:{manifest:{type:'string'},root:{type:'string'},report:{type:'string'},'verify-only':{type:'boolean'}}});
 const root=path.resolve(values.root||'.');
 const file=path.resolve(values.manifest||'tools/granada_composite_manifest.json');
 const manifest=JSON.parse(fs.readFileSync(file,'utf8'));
 const provider=gitProvider(root);
 const report=compose(manifest,provider,{root,write:!values['verify-only']});
 if(values.report){
  const output=path.resolve(values.report);
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n')
 }
 console.log('FoamLens Granada integration: '+report.status+' / '+report.counts.prs+' exact PRs, '+
  report.counts.frontend+' executable modules, '+report.counts.files+' staged files; NO MERGE/RELEASE');
 return report
}
if(require.main===module)try{main()}catch(e){console.error('GRANADA COMPOSITE BLOCKED: '+e.message);process.exitCode=2}
module.exports={SCHEMA,EXPECTED_PRS,BASE_PATHS,sha256,permitted,verify,resolveWithin,snapshot,compose,gitProvider,main};
