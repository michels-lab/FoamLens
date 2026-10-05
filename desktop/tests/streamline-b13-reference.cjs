'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const fixtureRoot=process.argv[2],outPath=process.argv[3]||'foamlens-streamlines.json';
if(!fixtureRoot)throw new Error('Usage: node streamline-b13-reference.cjs <cases_controlled_buoyancy> [output.json]');
const caseRoot=path.join(fixtureRoot,'B13_prghPressure_airGapOF14'),region='metal';
if(!fs.existsSync(caseRoot))throw new Error('B13 fixture missing: '+caseRoot);
const frontend=path.join(__dirname,'..','src','FoamLensDesktop','frontend');
const fvSource=fs.readFileSync(path.join(frontend,'v14-field-view.js'),'utf8');
const a=fvSource.indexOf('/* FOAMLENS_FIELD_VIEW_CORE_START */'),b=fvSource.indexOf('/* FOAMLENS_FIELD_VIEW_CORE_END */',a);
assert(a>=0&&b>a,'Field View core missing');
const fvCore=fvSource.slice(a,b+'/* FOAMLENS_FIELD_VIEW_CORE_END */'.length);
const fv=new Function('const cases=[];const flUi=(en)=>en;'+fvCore+
  ';return {fvBuildMeshFromTexts,fvBuildSpatialHash,fvVectorArray,fvIntegrateStreamline,fvFiniteRange};')();
const html=fs.readFileSync(path.join(frontend,'index.html'),'utf8');
const pa=html.indexOf('/* FOAMLENS_PHASE_MOMENTUM_CORE_START */'),pb=html.indexOf('/* FOAMLENS_PHASE_MOMENTUM_CORE_END */',pa);
assert(pa>=0&&pb>pa,'Phase/Momentum core missing');
const pmCore=html.slice(pa,pb+'/* FOAMLENS_PHASE_MOMENTUM_CORE_END */'.length);
const pm=new Function("function stripFoamComments(s){return String(s||'').replace(/\\/\\*[\\s\\S]*?\\*\\//g,'').replace(/\\/\\/.*$/gm,'')}"+pmCore+
  ';return {pmParseOpenFOAMFieldText};')();
const read=p=>fs.readFileSync(p,'utf8'),meshDir=path.join(caseRoot,'constant',region,'polyMesh');
const mesh=fv.fvBuildMeshFromTexts(read(path.join(meshDir,'points')),read(path.join(meshDir,'faces')),read(path.join(meshDir,'owner')),read(path.join(meshDir,'neighbour')));
assert(mesh?.supported,'B13 metal mesh parser failed');
const times=fs.readdirSync(caseRoot,{withFileTypes:true}).filter(e=>e.isDirectory()&&Number.isFinite(Number(e.name))&&fs.existsSync(path.join(caseRoot,e.name,region,'U'))).map(e=>Number(e.name)).sort((x,y)=>x-y);
if(!times.length)throw new Error('No B13 metal/U time directories found');
let chosen=null,vectors=null,parsed=null;
for(const time of times.slice().reverse()){
  const p=path.join(caseRoot,String(time),region,'U');const q=pm.pmParseOpenFOAMFieldText(read(p),p);
  const v=fv.fvVectorArray(q,mesh.cellCount);if(!v)continue;
  const mags=v.map(x=>Math.hypot(...x));const r=fv.fvFiniteRange(mags);
  if(r.valid&&r.max>1e-10){chosen=time;vectors=v;parsed=q;break}
}
if(chosen===null)throw new Error('No nonzero B13 metal/U frame was usable');
const diag=Math.hypot(mesh.boundsMax[0]-mesh.boundsMin[0],mesh.boundsMax[1]-mesh.boundsMin[1],mesh.boundsMax[2]-mesh.boundsMin[2])||1;
const hash=fv.fvBuildSpatialHash(mesh.cellCenters,mesh.boundsMin,mesh.boundsMax,mesh.cellCount);
const ranked=vectors.map((v,i)=>({i,mag:Math.hypot(...v)})).filter(x=>x.mag>1e-10).sort((x,y)=>y.mag-x.mag);
const pool=ranked.slice(0,Math.max(20,Math.min(ranked.length,Math.floor(ranked.length*.35))));
const seeds=[];const minSep=diag*.08;
for(const candidate of pool){
  const i=candidate.i,p=[mesh.cellCenters[3*i],mesh.cellCenters[3*i+1],mesh.cellCenters[3*i+2]];
  if(!p.every(Number.isFinite))continue;
  if(seeds.every(s=>Math.hypot(p[0]-s.p[0],p[1]-s.p[1],p[2]-s.p[2])>=minSep))seeds.push({cell:i,p,mag:candidate.mag});
  if(seeds.length>=5)break;
}
if(seeds.length<3)throw new Error('Could not select spatially separated nonzero B13 seeds');
const step=diag*.0045,maxLength=diag*.45,maxSteps=800;
const lines=seeds.map(seed=>{
  const line=fv.fvIntegrateStreamline(seed.p,hash,mesh.cellCenters,vectors,mesh.boundsMin,mesh.boundsMax,1,step,maxSteps,maxLength);
  return{seed:seed.p,seedCell:seed.cell,seedSpeed:seed.mag,points:line.map(q=>q.p),arcLength:line.at(-1)?.distance||0}
});
if(lines.some(x=>x.points.length<3))throw new Error('A selected B13 streamline terminated too early for comparison');
const payload={caseName:'B13_prghPressure_airGapOF14',region,time:chosen,field:'U',association:'cell',dimensions:parsed?.dimensions||'',boundsMin:mesh.boundsMin,boundsMax:mesh.boundsMax,diag,step,maxLength,maxSteps,seeds:seeds.map(x=>x.p),lines};
fs.writeFileSync(outPath,JSON.stringify(payload,null,2));
console.log('FoamLens B13 streamline reference written: '+lines.length+' lines at t='+chosen+' -> '+outPath);
