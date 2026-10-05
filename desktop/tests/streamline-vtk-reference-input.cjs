'use strict';

const fs=require('fs');
const path=require('path');

const caseRoot=process.argv[2];
const outPath=process.argv[3];
const time=Number(process.argv[4]||9.8);
if(!caseRoot||!outPath)throw new Error('Usage: node streamline-vtk-reference-input.cjs <OpenFOAM case> <output.json> [time]');
function read(rel){return fs.readFileSync(path.join(caseRoot,...rel.split('/')),'utf8')}
function vectorArray(parsed,count){
  if(!parsed?.supported||parsed.kind!=='vector')return null;
  if(parsed.uniform){const v=(parsed.uniformValue||[]).map(Number);return v.length===3&&v.every(Number.isFinite)?Array.from({length:count},()=>v.slice()):null}
  const a=(parsed.values||[]).map(v=>(v||[]).map(Number));return a.length===count&&a.every(v=>v.length>=3&&v.slice(0,3).every(Number.isFinite))?a:null
}

const frontendDir=path.join(__dirname,'..','src','FoamLensDesktop','frontend');
const fvFile=fs.readFileSync(path.join(frontendDir,'v14-field-view.js'),'utf8');
const fvBegin='/* FOAMLENS_FIELD_VIEW_CORE_START */',fvEnd='/* FOAMLENS_FIELD_VIEW_CORE_END */';
const fa=fvFile.indexOf(fvBegin),fb=fvFile.indexOf(fvEnd,fa);
if(fa<0||fb<=fa)throw new Error('Field View core markers missing.');
const fvCore=fvFile.slice(fa,fb+fvEnd.length);
const fv=new Function(
  'const cases=[];const flUi=(en)=>en;'+fvCore+
  ';return {fvBuildMeshFromTexts,fvBuildSpatialHash,fvSeedPlane,fvCombineStreamline};'
)();

const indexFile=fs.readFileSync(path.join(frontendDir,'index.html'),'utf8');
const pmBegin='/* FOAMLENS_PHASE_MOMENTUM_CORE_START */',pmEnd='/* FOAMLENS_PHASE_MOMENTUM_CORE_END */';
const pa=indexFile.indexOf(pmBegin),pb=indexFile.indexOf(pmEnd,pa);
if(pa<0||pb<=pa)throw new Error('Phase/Momentum core markers missing.');
const pmCore=indexFile.slice(pa,pb+pmEnd.length);
const pm=new Function(
  "function stripFoamComments(s){return String(s||'').replace(/\\/\\*[\\s\\S]*?\\*\\//g,'').replace(/\\/\\/.*$/gm,'')}"+
  pmCore+';return {pmParseOpenFOAMFieldText};'
)();

const mesh=fv.fvBuildMeshFromTexts(
  read('constant/metal/polyMesh/points'),
  read('constant/metal/polyMesh/faces'),
  read('constant/metal/polyMesh/owner'),
  read('constant/metal/polyMesh/neighbour')
);
if(!mesh.supported)throw new Error('FoamLens mesh parse failed: '+mesh.reason);
const parsed=pm.pmParseOpenFOAMFieldText(read(String(time)+'/metal/U'),String(time)+'/metal/U');
if(!parsed.supported||parsed.kind!=='vector')throw new Error('FoamLens vector field parse failed: '+(parsed.reason||parsed.kind));
const vectors=vectorArray(parsed,mesh.cellCount);
if(!vectors)throw new Error('FoamLens vector array does not match mesh cell count.');

const diag=Math.hypot(
  mesh.boundsMax[0]-mesh.boundsMin[0],
  mesh.boundsMax[1]-mesh.boundsMin[1],
  mesh.boundsMax[2]-mesh.boundsMin[2]
);
const step=diag*0.0045,maxLength=diag*0.8,maxSteps=500;
const seeds=fv.fvSeedPlane(mesh.boundsMin,mesh.boundsMax,'x',16,.5);
const hash=fv.fvBuildSpatialHash(mesh.cellCenters,mesh.boundsMin,mesh.boundsMax,mesh.cellCount);
const candidates=seeds.map((seed,index)=>{
  const line=fv.fvCombineStreamline(seed,hash,mesh.cellCenters,vectors,mesh.boundsMin,mesh.boundsMax,{direction:'both',step,maxSteps,maxLength});
  const length=line.length?line.reduce((sum,q,i)=>i?sum+Math.hypot(q.p[0]-line[i-1].p[0],q.p[1]-line[i-1].p[1],q.p[2]-line[i-1].p[2]):0,0):0;
  return{index,seed,line:line.map(q=>q.p.map(Number)),length}
});
const active=candidates.filter(x=>x.line.length>=6&&x.length>=step*4);
if(active.length<4)throw new Error('Too few active B13 FoamLens streamlines for VTK validation: '+active.length);
const chosen=active.sort((a,b)=>b.length-a.length||a.index-b.index).slice(0,8).sort((a,b)=>a.index-b.index);
const payload={
  schema:'foamlens-vtk-streamline-reference-v1',
  caseName:path.basename(caseRoot),region:'metal',field:'U',time,
  mesh:{cellCount:mesh.cellCount,pointCount:mesh.pointCount,boundsMin:mesh.boundsMin,boundsMax:mesh.boundsMax,diag},
  integration:{integrator:'RK2',direction:'both',step,maxSteps,maxLength,maxLengthPerDirection:maxLength/2},
  seeds:chosen.map(x=>x.seed),
  foamLensLines:chosen.map(x=>x.line),
  foamLensLengths:chosen.map(x=>x.length),
  selection:{requested:16,active:active.length,compared:chosen.length,rule:'deterministic longest active seeds, then original seed order'}
};
fs.writeFileSync(outPath,JSON.stringify(payload,null,2));
console.log('FoamLens B13 streamline reference input: '+JSON.stringify({
  time,cellCount:mesh.cellCount,diag,step,maxLength,requested:16,active:active.length,compared:chosen.length,
  seedIndices:chosen.map(x=>x.index),lengths:chosen.map(x=>x.length)
}));
