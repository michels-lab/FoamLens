'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const fixtureRoot=process.argv[2];
if(!fixtureRoot)throw new Error('Usage: node openfoam-integration.test.cjs <cases_controlled_buoyancy>');
if(!fs.existsSync(fixtureRoot))throw new Error('Fixture directory does not exist: '+fixtureRoot);

const frontend=path.join(__dirname,'..','src','FoamLensDesktop','frontend','index.html');
const html=fs.readFileSync(frontend,'utf8');
const begin='/* FOAMLENS_DISCOVERY_MODEL_CORE_START */',end='/* FOAMLENS_DISCOVERY_MODEL_CORE_END */';
const a=html.indexOf(begin),b=html.indexOf(end,a);
assert(a>=0&&b>a,'Discovery core markers missing.');
const core=html.slice(a,b+end.length);
const api=new Function(core+'\nreturn {flBuildCaseDiscoveryModel,flParseFoamFieldHeader,flClassifyPostProcessingSample};')();

function walk(dir,base=dir,out=[]){
  for(const e of fs.readdirSync(dir,{withFileTypes:true})){
    const full=path.join(dir,e.name);
    if(e.isDirectory())walk(full,base,out);
    else if(e.isFile()){const st=fs.statSync(full);out.push({full,relative:path.relative(base,full).replace(/\\/g,'/'),size:st.size})}
  }
  return out
}
function modelFor(caseName){
  const root=path.join(fixtureRoot,caseName);assert(fs.existsSync(root),'Missing real fixture '+caseName);
  const files=walk(root,root).map(x=>({webkitRelativePath:caseName+'/'+x.relative,name:path.basename(x.relative),size:x.size}));
  return{root,files,model:api.flBuildCaseDiscoveryModel(files,caseName)}
}
function read(root,rel){return fs.readFileSync(path.join(root,...rel.split('/')),'utf8')}
function adaptiveTimes(root){
  const base=path.join(root,'postProcessing');if(!fs.existsSync(base))return[];
  const vals=[];
  for(const f of walk(base,base)){
    const seg=f.relative.split('/'),i=seg.findIndex(x=>x.toLowerCase().includes('horizontalprofiles'));
    if(i>=0&&i+1<seg.length&&Number.isFinite(Number(seg[i+1])))vals.push(Number(seg[i+1]))
  }
  return [...new Set(vals)].sort((x,y)=>x-y)
}
function nonuniform(a){
  if(a.length<4)return false;
  const d=[];for(let i=1;i<a.length;i++)d.push(Number((a[i]-a[i-1]).toFixed(6)));
  return new Set(d).size>1
}

const passed=[];function test(name,fn){fn();passed.push(name)}

const b3=modelFor('B3_reference');
const b6=modelFor('B6_adaptiveDt');
const c6=modelFor('C6_adaptiveDt');

test('real multi-region discovery',()=>{
  assert(b3.model.regions.includes('metal'));assert(b3.model.regions.includes('mold'));
  assert(!b3.model.regions.includes('metal/materials'));assert(!b3.model.regions.includes('mold/materials'));
});
test('real arbitrary field inventory',()=>{
  assert(b3.model.fields.some(x=>x.name==='U'));assert(b3.model.fields.some(x=>x.name==='T'));
  assert(b3.model.fields.some(x=>x.name.includes('phaseChange')));
});
test('real postProcessing discovery',()=>assert(b3.model.postProcessing.length>0));
test('real logs discovery',()=>{
  assert(b3.model.logs.some(x=>x.name==='log.foamMultiRun'));
  assert(b3.model.logs.some(x=>x.kind==='foamLog'));
});
test('real dictionaries discovered without fixed allowlist',()=>{
  assert(b3.model.dictionaries.some(x=>x.name==='controlDict'));
  assert(b3.model.dictionaries.some(x=>x.name==='fvModels'));
  assert(b3.model.dictionaries.some(x=>x.name==='physicalProperties'));
});

const U=api.flParseFoamFieldHeader(read(b3.root,'0/metal/U'),'0/metal/U');
const T=api.flParseFoamFieldHeader(read(b3.root,'0/metal/T'),'0/metal/T');
test('real vector field class/dimensions',()=>{
  assert.strictEqual(U.kind,'vector');assert.strictEqual(U.storage,'volume');assert.strictEqual(U.dimensions,'[0 1 -1 0 0 0 0]');
});
test('real scalar field class/dimensions',()=>{
  assert.strictEqual(T.kind,'scalar');assert.strictEqual(T.storage,'volume');assert.strictEqual(T.dimensions,'[0 0 0 1 0 0 0]');
});
test('real boundaryField parser',()=>{
  assert(U.boundaries.some(x=>x.name==='frontAndBack'));assert(U.boundaries.some(x=>x.name==='metal_to_mold'));
  assert(T.boundaries.some(x=>x.type==='externalWallHeatFluxTemperature'));
});

const probePath='postProcessing/metal/temperatureProbe/0/T';
const xyPath='postProcessing/metal/horizontalProfiles/10/line_y20mm.xy';
const volPath='postProcessing/metal/metalMeanLiquidFraction/0/volFieldValue.dat';
const maxPath='postProcessing/metal/metalMaxCourant/0/volFieldValue.dat';
test('real probe structure',()=>{
  const p=api.flClassifyPostProcessingSample(read(b3.root,probePath),'T');assert.strictEqual(p.kind,'probe');assert(p.temporal);
});
test('real sampled profile structure and discovered columns',()=>{
  const p=api.flClassifyPostProcessingSample(read(b3.root,xyPath),'line_y20mm.xy');assert.strictEqual(p.kind,'sampledSet');assert(p.spatial);assert(p.columns.includes('x'));assert(p.columns.some(x=>/^U_x$/i.test(x)));assert(p.columns.some(x=>/^T$/i.test(x)));
});
test('real volFieldValue average',()=>{
  const p=api.flClassifyPostProcessingSample(read(b3.root,volPath),'volFieldValue.dat');assert.strictEqual(p.kind,'volumeReduction');assert(/volAverage/.test(p.reduction));
});
test('real volFieldValue max location/cell',()=>{
  const p=api.flClassifyPostProcessingSample(read(b3.root,maxPath),'volFieldValue.dat');assert.strictEqual(p.kind,'volumeReduction');assert(p.columns.some(x=>/location/i.test(x)));assert(p.columns.some(x=>/^cell$/i.test(x)));
});
test('real adaptive timestep stored profile times are nonuniform',()=>{
  const bt=adaptiveTimes(b6.root),ct=adaptiveTimes(c6.root);assert(bt.length>10&&nonuniform(bt));assert(ct.length>10&&nonuniform(ct));
});
test('real adaptive control metadata exists',()=>{
  const txt=read(b6.root,'system/controlDict');assert(/adjustTimeStep\s+yes\s*;/.test(txt));assert(/maxCo\s+[-+\deE.]+\s*;/.test(txt));
});
test('real foamLog deltaT output exists for adaptive fixture',()=>{
  assert(fs.existsSync(path.join(b6.root,'logs','deltaT_0')));
});
test('real momentum post-processing dictionary is discovered, not required',()=>{
  const p=path.join(b6.root,'system','momentumPostProcessing');assert(fs.existsSync(p));
  const txt=fs.readFileSync(p,'utf8');assert(/type\s+volFieldValue\s*;/.test(txt));assert(/type\s+sets\s*;/.test(txt));
});
test('absent optional dictionary is harmless',()=>{
  assert(!fs.existsSync(path.join(b3.root,'system','fvOptions')));assert(b3.model.dictionaries.length>0);
});
test('large real fixture is indexed without reading all field payloads',()=>{
  const total=b3.files.length+b6.files.length+c6.files.length;assert(total>1000,'Fixture unexpectedly small: '+total);
});
test('product discovery core remains fixture-agnostic',()=>{
  for(const banned of ['QuickCup','B3_reference','B6_adaptiveDt','C6_adaptiveDt'])assert(!core.includes(banned),'Fixture leaked into product core: '+banned);
});

console.log('Real OpenFOAM integration suite passed: '+passed.length+' checks.');
console.log('Fixture root: '+path.resolve(fixtureRoot));
for(const name of passed)console.log('  ✓ '+name);
