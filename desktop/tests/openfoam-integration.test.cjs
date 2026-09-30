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

const taFile=fs.readFileSync(path.join(__dirname,'..','src','FoamLensDesktop','frontend','v13-temporal-alignment.js'),'utf8');
const taBegin='/* FOAMLENS_TEMPORAL_ALIGNMENT_CORE_START */',taEnd='/* FOAMLENS_TEMPORAL_ALIGNMENT_CORE_END */';
const taA=taFile.indexOf(taBegin),taB=taFile.indexOf(taEnd,taA);
assert(taA>=0&&taB>taA,'Temporal alignment core markers missing.');
const taCore=taFile.slice(taA,taB+taEnd.length);
const ta=new Function(taCore+'\nreturn {taCommonTimeRange,taAlignSeries};')();

const npFile=fs.readFileSync(path.join(__dirname,'..','src','FoamLensDesktop','frontend','v13-numerical-performance.js'),'utf8');
const npBegin='/* FOAMLENS_NUMERICAL_PERFORMANCE_CORE_START */',npEnd='/* FOAMLENS_NUMERICAL_PERFORMANCE_CORE_END */';
const npA=npFile.indexOf(npBegin),npB=npFile.indexOf(npEnd,npA);
assert(npA>=0&&npB>npA,'Numerical performance core markers missing.');
const npCore=npFile.slice(npA,npB+npEnd.length);
const np=new Function(npCore+'\nreturn {npParseRunLog};')();

const fvFile=fs.readFileSync(path.join(__dirname,'..','src','FoamLensDesktop','frontend','v14-field-view.js'),'utf8');
const fvBegin='/* FOAMLENS_FIELD_VIEW_CORE_START */',fvEnd='/* FOAMLENS_FIELD_VIEW_CORE_END */';
const fvA=fvFile.indexOf(fvBegin),fvB=fvFile.indexOf(fvEnd,fvA);
assert(fvA>=0&&fvB>fvA,'Field View core markers missing.');
const fvCore=fvFile.slice(fvA,fvB+fvEnd.length);
const fv=new Function(
  'const cases=[]; const flUi=(en,es)=>en;'+fvCore+
  '\nreturn {fvBuildMeshInventory,fvCaseViewAvailable,fvAvailability};'
)();

const pmBegin='/* FOAMLENS_PHASE_MOMENTUM_CORE_START */',pmEnd='/* FOAMLENS_PHASE_MOMENTUM_CORE_END */';
const pmA=html.indexOf(pmBegin),pmB=html.indexOf(pmEnd,pmA);
assert(pmA>=0&&pmB>pmA,'Phase Change / Momentum core markers missing.');
const pmCore=html.slice(pmA,pmB+pmEnd.length);
const pm=new Function(
  "function stripFoamComments(s){return String(s||'').replace(/\\/\\*[\\s\\S]*?\\*\\//g,'').replace(/\\/\\/.*$/gm,'')}" +
  pmCore +
  '\nreturn {pmBuildVolumeInventory,pmParseOpenFOAMFieldText,pmComponentValues};'
)();

const foamNumStart=html.indexOf('function foamLogNumber(token){');
const foamNumEnd=html.indexOf('function foamLogDescriptor',foamNumStart);
assert(foamNumStart>=0&&foamNumEnd>foamNumStart,'foamLogNumber function missing.');
const foamLogNumber=new Function(html.slice(foamNumStart,foamNumEnd)+'\nreturn foamLogNumber;')();

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
function profileTimes(root){
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
const b13=modelFor('B13_prghPressure_airGapOF14');
const c3=modelFor('C3_reference');
const b6=modelFor('B6_adaptiveDt');
const c6=modelFor('C6_adaptiveDt');
let parsedB3RunLog=null;
function b3RunLog(){
  if(!parsedB3RunLog)parsedB3RunLog=np.npParseRunLog(read(b3.root,'log.foamMultiRun'));
  return parsedB3RunLog
}

test('real multi-region discovery',()=>{
  assert(b3.model.regions.includes('metal'));assert(b3.model.regions.includes('mold'));
  assert(!b3.model.regions.includes('metal/materials'));assert(!b3.model.regions.includes('mold/materials'));
});
test('complete B13 is 3D-ready from its real OpenFOAM files',()=>{
  for(const group of b13.model.fields){
    const record=[...group.records].sort((a,b)=>(a.size||0)-(b.size||0)||a.time-b.time)[0];
    const rel=record.sourcePath.replace(/^B13_prghPressure_airGapOF14\//,'');
    Object.assign(group,api.flParseFoamFieldHeader(read(b13.root,rel),record.sourcePath));
  }
  const meshes=fv.fvBuildMeshInventory(b13.files,'B13_prghPressure_airGapOF14');
  const metal=meshes.find(x=>x.region==='metal'&&!x.partition);
  const mold=meshes.find(x=>x.region==='mold'&&!x.partition);
  assert(metal&&metal.complete,'B13 metal polyMesh was not recognized as complete.');
  assert(mold&&mold.complete,'B13 mold polyMesh was not recognized as complete.');
  assert(b13.model.fields.some(x=>x.region==='metal'&&x.name==='T'&&x.storage==='volume'&&x.kind==='scalar'));
  assert(b13.model.fields.some(x=>x.region==='metal'&&x.name==='U'&&x.storage==='volume'&&x.kind==='vector'));
  assert(b13.model.fields.some(x=>x.region==='mold'&&x.name==='T'&&x.storage==='volume'&&x.kind==='scalar'));
  const caseObj={id:13,name:'B13_prghPressure_airGapOF14',meshInventory:meshes,discoveryModel:b13.model};
  assert.strictEqual(fv.fvCaseViewAvailable(caseObj),true,'Field View rejected complete B13 despite compatible mesh/fields.');
  const availability=fv.fvAvailability(caseObj);
  assert.strictEqual(availability.ready,true,'B13 availability is not ready: '+availability.reason);
  assert(availability.sharedRegions.includes('metal'));
  assert(availability.sharedRegions.includes('mold'));
});
test('real arbitrary field inventory',()=>{
  assert(b3.model.fields.some(x=>x.name==='U'));assert(b3.model.fields.some(x=>x.name==='T'));
  assert(b3.model.fields.some(x=>x.name.includes('phaseChange')));
});
test('complete B13 Phase/Momentum accepts real uniform alphat at t=0',()=>{
  const inventory=pm.pmBuildVolumeInventory(b13.files,'B13_prghPressure_airGapOF14');
  const rec=inventory.find(x=>x.region==='metal'&&x.name==='alphat'&&Math.abs(Number(x.time))<1e-12);
  assert(rec,'B13 metal/alphat at t=0 was not preserved in the volume-field inventory.');
  assert(rec.file,'B13 alphat inventory row lost its source file reference.');
  const parsed=pm.pmParseOpenFOAMFieldText(read(b13.root,'0/metal/alphat'),rec.sourcePath);
  assert(parsed.supported,'B13 alphat was rejected: '+parsed.reason);
  assert.strictEqual(parsed.kind,'scalar');
  assert.strictEqual(parsed.uniform,true);
  assert.strictEqual(parsed.uniformValue,0);
  const values=pm.pmComponentValues(parsed,'value');
  assert(values.ok,'B13 alphat Scalar value was rejected: '+values.reason);
  assert.deepEqual(values.values,[0]);
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
const surfacePath='postProcessing/metal/metalBoundaryEnergyPower/0/surfaceFieldValue.dat';
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
test('real surfaceFieldValue is structurally distinct from volume reduction',()=>{
  const p=api.flClassifyPostProcessingSample(read(b6.root,surfacePath),'surfaceFieldValue.dat');
  assert.strictEqual(p.kind,'surfaceReduction');assert(p.selection.faces);assert(p.selection.area);assert(/sum\(/.test(p.reduction));
});
test('real fixed and adaptive stored profile timelines are distinguishable',()=>{
  const ft=profileTimes(b3.root),bt=profileTimes(b6.root),ct=profileTimes(c6.root);
  assert(ft.length>20&&!nonuniform(ft),'Reference profile timeline is not fixed/uniform enough for this fixture.');
  assert(bt.length>10&&nonuniform(bt));assert(ct.length>10&&nonuniform(ct));
  assert.notDeepStrictEqual(bt,ct,'Independent adaptive cases unexpectedly share the exact same stored time grid.');
});
test('real fixed-vs-fixed cases align on physical time',()=>{
  const at=profileTimes(b3.root),bt=profileTimes(c3.root);
  assert(at.length>20&&bt.length>20,'Fixed fixtures do not expose enough stored profile times.');
  assert(!nonuniform(at)&&!nonuniform(bt),'A fixed fixture unexpectedly has a nonuniform stored profile timeline.');
  const aligned=ta.taAlignSeries([{t:at,y:at},{t:bt,y:bt}],{mode:'common',method:'linear',maxPoints:500});
  assert(aligned.valid&&aligned.range.valid&&aligned.range.end>aligned.range.start);
  assert(aligned.series.every(x=>x.meta.every(m=>m.ok)),'Fixed-vs-fixed alignment attempted extrapolation.');
});
test('real fixed-vs-adaptive physical-time alignment has common overlap',()=>{
  const ft=profileTimes(b3.root),bt=profileTimes(b6.root);
  const aligned=ta.taAlignSeries([{t:ft,y:ft},{t:bt,y:bt}],{mode:'common',method:'linear',maxPoints:500});
  assert(aligned.valid);assert(aligned.range.valid);assert(aligned.range.end>aligned.range.start);
  assert(aligned.series[1].meta.some(x=>x.status==='interpolated'),'Adaptive fixture never exercised temporal interpolation.');
  assert(aligned.series.every(s=>s.meta.every(m=>m.ok)),'Alignment attempted extrapolation.');
});
test('real adaptive-vs-adaptive physical-time alignment uses one global requested grid',()=>{
  const bt=profileTimes(b6.root),ct=profileTimes(c6.root);
  const aligned=ta.taAlignSeries([{t:bt,y:bt},{t:ct,y:ct}],{mode:'common',method:'linear',maxPoints:500});
  assert(aligned.valid&&aligned.grid.length>5);
  assert.deepStrictEqual(aligned.series[0].t,aligned.grid);
  assert.deepStrictEqual(aligned.series[1].t,aligned.grid);
  assert(aligned.series[0].meta.some(x=>x.status==='interpolated')||aligned.series[1].meta.some(x=>x.status==='interpolated'));
});
test('real adaptive control metadata exists',()=>{
  const txt=read(b6.root,'system/controlDict');assert(/adjustTimeStep\s+yes\s*;/.test(txt));assert(/maxCo\s+[-+\deE.]+\s*;/.test(txt));
});
test('real raw OpenFOAM run log yields numerical-performance records',()=>{
  const parsed=b3RunLog();
  assert(parsed.steps.length>100,'Real run log yielded too few physical-time steps.');
  assert(parsed.equations.length>1000,'Real run log yielded too few linear-solver records.');
  assert(parsed.continuity.length>100,'Real run log yielded too few continuity records.');
  assert(parsed.coupling.length>100,'Real run log yielded too few PIMPLE/SIMPLE coupling records.');
  assert(parsed.equations.some(x=>Number.isFinite(x.initialResidual)&&Number.isFinite(x.finalResidual)),'Real residual values were not parsed.');
  assert(parsed.steps.some(x=>Number.isFinite(x.courantMax)&&x.courantMax>=0),'Real Courant values were not parsed.');
  assert(parsed.steps.some(x=>Number.isFinite(x.executionTime)&&Number.isFinite(x.clockTime)),'Real execution/clock time values were not parsed.');
});
test('real residuals remain distinct from nonlinear coupling iterations',()=>{
  const parsed=b3RunLog();
  assert(parsed.equations.some(x=>Number.isFinite(x.iterations)),'Linear iteration counts are missing.');
  assert(parsed.coupling.some(x=>/PIMPLE|SIMPLE|PISO/.test(String(x.algorithm))&&Number.isFinite(x.outerIteration)),'Outer-coupling iterations are missing.');
  assert(parsed.equations.every(x=>Object.prototype.hasOwnProperty.call(x,'initialResidual')&&Object.prototype.hasOwnProperty.call(x,'finalResidual')));
});

test('real foamLog deltaT output accepts time tokens with s suffix',()=>{
  const p=path.join(b6.root,'logs','deltaT_0');assert(fs.existsSync(p));
  const rows=fs.readFileSync(p,'utf8').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  const parsed=[];
  for(const row of rows){const tok=row.split(/\s+/);if(tok.length<2)continue;const t=foamLogNumber(tok[0]),dt=foamLogNumber(tok[1]);if(Number.isFinite(t)&&Number.isFinite(dt))parsed.push([t,dt])}
  assert(parsed.length>100,'Real adaptive deltaT log did not yield enough parsed samples.');
  assert(parsed.every(([t,dt])=>Number.isFinite(t)&&dt>0));
  assert(rows.some(x=>/^\d+(?:\.\d+)?s\s/.test(x)),'Fixture no longer exercises the time-suffix format.');
});
test('real momentum post-processing dictionary is discovered, not required',()=>{
  const p=path.join(b6.root,'system','momentumPostProcessing');assert(fs.existsSync(p));
  const txt=fs.readFileSync(p,'utf8');assert(/type\s+volFieldValue\s*;/.test(txt));assert(/type\s+sets\s*;/.test(txt));
});
test('absent optional dictionary is harmless',()=>{
  assert(!fs.existsSync(path.join(b3.root,'system','fvOptions')));assert(b3.model.dictionaries.length>0);
});
test('large real fixture is indexed without reading all field payloads',()=>{
  const total=b3.files.length+c3.files.length+b6.files.length+c6.files.length;assert(total>1000,'Fixture unexpectedly small: '+total);
});
test('product discovery core remains fixture-agnostic',()=>{
  for(const banned of ['QuickCup','B3_reference','B6_adaptiveDt','C6_adaptiveDt'])assert(!core.includes(banned),'Fixture leaked into product core: '+banned);
});

console.log('Real OpenFOAM integration suite passed: '+passed.length+' checks.');
console.log('Fixture root: '+path.resolve(fixtureRoot));
for(const name of passed)console.log('  ✓ '+name);
