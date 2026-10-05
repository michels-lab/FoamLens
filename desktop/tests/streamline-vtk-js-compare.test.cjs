'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const caseRoot=process.argv[2];
const referencePath=process.argv[3];
if(!caseRoot||!referencePath)throw new Error('Usage: node streamline-vtk-js-compare.test.cjs <OpenFOAM-case> <VTK-reference.json>');
if(!fs.existsSync(caseRoot))throw new Error('OpenFOAM case not found: '+caseRoot);
if(!fs.existsSync(referencePath))throw new Error('VTK reference JSON not found: '+referencePath);

const desktopRoot=path.join(__dirname,'..','src','FoamLensDesktop','frontend');
const fieldSource=fs.readFileSync(path.join(desktopRoot,'v14-field-view.js'),'utf8');
const fb='/* FOAMLENS_FIELD_VIEW_CORE_START */',fe='/* FOAMLENS_FIELD_VIEW_CORE_END */',fa=fieldSource.indexOf(fb),fz=fieldSource.indexOf(fe,fa);
assert(fa>=0&&fz>fa,'Field View core markers missing.');
const fvCore=fieldSource.slice(fa,fz+fe.length);
const fv=new Function(
  'const cases=[];const flUi=(en)=>en;'+fvCore+
  ';return {fvBuildMeshFromTexts,fvBuildSpatialHash,fvIntegrateStreamline};'
)();

const html=fs.readFileSync(path.join(desktopRoot,'index.html'),'utf8');
const pb='/* FOAMLENS_PHASE_MOMENTUM_CORE_START */',pe='/* FOAMLENS_PHASE_MOMENTUM_CORE_END */',pa=html.indexOf(pb),pz=html.indexOf(pe,pa);
assert(pa>=0&&pz>pa,'Phase/Momentum parser core markers missing.');
const pmCore=html.slice(pa,pz+pe.length);
const pm=new Function(
  "function stripFoamComments(s){return String(s||'').replace(/\\/\\*[\\s\\S]*?\\*\\//g,'').replace(/\\/\\/.*$/gm,'')}"+
  pmCore+
  ';return {pmParseOpenFOAMFieldText};'
)();

function read(rel){return fs.readFileSync(path.join(caseRoot,...rel.split('/')),'utf8')}
function lengthOf(points){
  let total=0;for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i];total+=Math.hypot(b[0]-a[0],b[1]-a[1],b[2]-a[2])}return total
}
function resample(points,n,maxDistance){
  if(!Array.isArray(points)||points.length<2)return null;
  const cumulative=[0];for(let i=1;i<points.length;i++)cumulative.push(cumulative.at(-1)+Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1],points[i][2]-points[i-1][2]));
  const total=cumulative.at(-1),limit=Math.min(total,Number(maxDistance));if(!(limit>0))return null;
  const out=[];for(let qi=0;qi<n;qi++){
    const q=limit*(n===1?0:qi/(n-1));let j=1;while(j<cumulative.length&&cumulative[j]<q)j++;j=Math.min(j,cumulative.length-1);
    const lo=Math.max(0,j-1),span=cumulative[j]-cumulative[lo],t=span>0?(q-cumulative[lo])/span:0;
    out.push([0,1,2].map(a=>points[lo][a]+(points[j][a]-points[lo][a])*t))
  }return out
}
function compare(a,b,diag){
  const lenA=lengthOf(a),lenB=lengthOf(b),common=Math.min(lenA,lenB);if(!(common>diag*.01))return null;
  const aa=resample(a,48,common),bb=resample(b,48,common);if(!aa||!bb)return null;
  const dist=aa.map((p,i)=>Math.hypot(p[0]-bb[i][0],p[1]-bb[i][1],p[2]-bb[i][2]));
  return{
    rms_diag:Math.sqrt(dist.reduce((sum,x)=>sum+x*x,0)/dist.length)/diag,
    max_diag:Math.max(...dist)/diag,
    endpoint_diag:Math.hypot(aa.at(-1)[0]-bb.at(-1)[0],aa.at(-1)[1]-bb.at(-1)[1],aa.at(-1)[2]-bb.at(-1)[2])/diag,
    length_rel:Math.abs(lenA-lenB)/Math.max(lenA,lenB,diag*1e-12),
    foam_length:lenA,
    vtk_length:lenB,
    common_length:common
  }
}
function median(a){const x=[...a].sort((p,q)=>p-q),n=x.length;if(!n)return NaN;return n%2?x[(n-1)/2]:(x[n/2-1]+x[n/2])/2}

const reference=JSON.parse(fs.readFileSync(referencePath,'utf8'));
const time=String(reference.time);
const mesh=fv.fvBuildMeshFromTexts(
  read('constant/metal/polyMesh/points'),
  read('constant/metal/polyMesh/faces'),
  read('constant/metal/polyMesh/owner'),
  read('constant/metal/polyMesh/neighbour')
);
assert(mesh.supported,'Actual FoamLens mesh parser rejected B13: '+mesh.reason);
assert.strictEqual(mesh.cellCount,reference.cells,'FoamLens/VTK B13 cell counts differ.');

const parsed=pm.pmParseOpenFOAMFieldText(read(time+'/metal/U'),time+'/metal/U');
assert(parsed.supported,'Actual FoamLens OpenFOAM U parser rejected B13: '+parsed.reason);
assert.strictEqual(parsed.kind,'vector','B13 U was not parsed as a vector field.');
let vectors;
if(parsed.uniform){
  const v=(parsed.uniformValue||[]).map(Number);assert.strictEqual(v.length,3);vectors=Array.from({length:mesh.cellCount},()=>v.slice())
}else{
  vectors=(parsed.values||[]).map(v=>(v||[]).slice(0,3).map(Number));
}
assert.strictEqual(vectors.length,mesh.cellCount,'FoamLens U vector count does not match the actual mesh.');
assert(vectors.every(v=>v.length===3&&v.every(Number.isFinite)),'FoamLens U parser produced non-finite vector values.');

const hash=fv.fvBuildSpatialHash(mesh.cellCenters,mesh.boundsMin,mesh.boundsMax,mesh.cellCount);
const diag=Number(reference.domain_diagonal);
const step=Number(reference.foam_step);
const records=[];
for(const rec of reference.records||[]){
  if(!Array.isArray(rec.vtk_path)||rec.vtk_path.length<4)continue;
  const dir=rec.direction==='backward'?-1:1;
  const line=fv.fvIntegrateStreamline(rec.seed,hash,mesh.cellCenters,vectors,mesh.boundsMin,mesh.boundsMax,dir,step,300,diag);
  const foam=line.map(q=>q.p.map(Number)),metrics=compare(foam,rec.vtk_path,diag);
  records.push({seed_cell:rec.seed_cell,direction:rec.direction,foam_points:foam.length,vtk_points:rec.vtk_path.length,metrics});
}
const valid=records.filter(r=>r.metrics&&r.foam_points>=4&&r.vtk_points>=4);
assert(valid.length>=Math.max(4,Number(reference.seeds)||4),'Too few actual FoamLens/VTK paths were comparable: '+valid.length);

const summary={
  validator:'actual v14-field-view.js fvIntegrateStreamline() vs vtkStreamTracer reference',
  comparable_paths:valid.length,
  median_rms_diag:median(valid.map(r=>r.metrics.rms_diag)),
  worst_rms_diag:Math.max(...valid.map(r=>r.metrics.rms_diag)),
  median_max_diag:median(valid.map(r=>r.metrics.max_diag)),
  median_endpoint_diag:median(valid.map(r=>r.metrics.endpoint_diag)),
  median_length_rel:median(valid.map(r=>r.metrics.length_rel)),
  records
};
reference.javascriptValidation=summary;
fs.writeFileSync(referencePath,JSON.stringify(reference,null,2));

const thresholds=reference.thresholds||{};
const failures=[];
for(const key of ['median_rms_diag','worst_rms_diag','median_endpoint_diag','median_length_rel']){
  const limit=Number(thresholds[key]);if(Number.isFinite(limit)&&summary[key]>limit)failures.push(key+'='+summary[key]+' > '+limit)
}
if(failures.length)throw new Error('Actual FoamLens JS streamline VTK validation failed: '+failures.join('; '));
console.log(JSON.stringify(summary,null,2));
console.log('Actual FoamLens JavaScript streamline comparison against VTK passed.');
