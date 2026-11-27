'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../src/FoamLensDesktop/frontend/v24-z-cad-blockmesh-designer.js'),'utf8');
new Function(src);
const a=src.indexOf('/* FOAMLENS_BLOCKMESH_DESIGN_CORE_START */'),b=src.indexOf('/* FOAMLENS_BLOCKMESH_DESIGN_CORE_END */');
const api=new Function(src.slice(a,b)+';return{plan:cmbPlan,dict:cmbDictionary,slice:cmbSlice,nativePayload:cmbNativePayload}')();
const input={axes:['0\n0.01 4 2\n0.03 6 1','-0.04\n0 8 1','0\n0.01 3 1'],patches:['xMin','xMax','yMin','yMax','zMin','zMax'],zones:'0 0 0 metal\n1 0 0 mold'};
const p=api.plan(input),d=api.dict(p);
assert.equal(p.cellCount,240);assert.equal(p.vertices.length,12);assert.equal(p.blocks.length,2);assert.deepEqual(p.zoneCells,{metal:96,mold:144});assert.equal(p.unassignedCells,0);
assert.equal(p.interfaces.length,1);assert.equal(p.interfaces[0].plannedFaces,24);assert(Math.abs(p.interfaces[0].area_m2-.0004)<1e-15);
assert.equal(p.boundary.flatMap(x=>x.faces).length,10);assert.equal(p.blocks[0].vertices.filter(v=>p.blocks[1].vertices.includes(v)).length,4);
assert(d.includes('simpleGrading (2 1 1)'));assert(d.includes(' metal (4 8 3)'));assert(d.includes('scale 1;'));assert(d.includes('type patch;'));assert.equal(p.meshGenerated,false);assert.equal(p.interfaceVerified,false);
assert.equal(api.slice(p,2,0).blocks.length,2);assert.equal(api.slice(p,0,1).blocks[0].zone,'mold');
for(const bad of [{axes:['0\n0 4 1',...input.axes.slice(1)]},{axes:['0\n1 1 2',...input.axes.slice(1)]},{axes:['0\n1 10000 1','0\n1 10000 1','0\n1 10000 1']},{zones:'2 0 0 metal'},{zones:'0 0 0 metal\n0 0 0 mold'},{zones:'0 0 0 x;include'},{patches:['x','x','y','z','a','b']}])assert.throws(()=>api.plan({...input,...bad}));
assert.equal(api.plan({...input,zones:''}).unassignedCells,240);assert.throws(()=>api.slice(p,2,1));
console.log('Cartesian blockMesh plan: conformity, counts, zones, exterior faces, slices and reject paths PASS');

const native=api.nativePayload(p,'14');
assert.equal(native.version,'14');assert.deepEqual(native.zones,[{ijk:[0,0,0],name:'metal'},{ijk:[1,0,0],name:'mold'}]);assert.deepEqual(native.patches,input.patches);assert(!Object.hasOwn(native,'dictionary'));
assert.throws(()=>api.nativePayload(p,'2312'));assert.throws(()=>api.nativePayload({...p,cellCount:200001},'14'));
console.log('Native structured request and caps PASS');

assert.equal(api.nativePayload(p,'14',true).splitRegions,true);
assert.throws(()=>api.nativePayload(api.plan({...input,zones:'0 0 0 metal'}),'14',true));
const sa=src.indexOf('function cmbSnappySettings('),sb=src.indexOf('function cmbMount()',sa);
const num=src.indexOf('function cmbNumber('),numEnd=src.indexOf('function cmbAxis(',num);
const settings=new Function(src.slice(num,numEnd)+src.slice(sa,sb)+';return cmbSnappySettings')();
const bg=api.plan({...input,zones:''});
assert.deepEqual(settings(bg,'0.005 -0.02 0.005','1 2',200000),{inside:[.005,-.02,.005],minLevel:1,maxLevel:2,maxCells:200000});
assert.throws(()=>settings(p,'0.005 -0.02 0.005','1 2',200000));
assert.throws(()=>settings(bg,'0 -0.02 0.005','1 2',200000));
assert.throws(()=>settings(bg,'0.005 -0.02 0.005','2 1',200000));
assert.throws(()=>settings(bg,'0.005 -0.02 0.005','1 5',200000));
assert.throws(()=>settings(bg,'0.005 -0.02 0.005','1 2',350001));
console.log('Explicit region splitting and single-surface snappy settings PASS');

const visStart=src.indexOf('function cmbVisibleSurfaces('),visEnd=src.indexOf('function cmbMount()',visStart);
const fixtureModels=[{visible:true,unit:'mm',partsVisible:new Map([['metal',true],['hidden',false],['mold',true]]),partSummaries:new Map([['metal',{triangles:1}],['mold',{triangles:1}]]),triangles:[{part:'metal'},{part:'mold'}]}];
const visible=new Function('cgModels','cgUnitScale','cgBinaryStl',src.slice(visStart,visEnd)+';return cmbVisibleSurfaces') (fixtureModels,u=>u==='mm'?.001:null,(tris,scale)=>new Uint8Array(84+50*tris.length));
assert.deepEqual(visible().map(x=>x.part),['metal','mold']);assert.equal(visible()[0].bytes.length,134);fixtureModels[0].unit='';assert.throws(visible);
console.log('Visible multi-surface selection and unit gate PASS');

const advStart=src.indexOf('function cmbAdvancedSnappy('),advEnd=src.indexOf('function cmbVisibleSurfaces()',advStart);
const advanced=new Function(src.slice(num,numEnd)+src.slice(advStart,advEnd)+';return cmbAdvancedSnappy')();
const advancedPlan=advanced(bg,2,'0.001 -0.03 0.001 0.009 -0.01 0.009 3','1 1 3 2\n2 0 1 0','1.2 0.3 0.1');
assert.deepEqual(advancedPlan.boxes,[{min:[.001,-.03,.001],max:[.009,-.01,.009],level:3}]);assert.deepEqual(advancedPlan.surfaceSettings,[{id:1,minLevel:1,maxLevel:3,layers:2},{id:2,minLevel:0,maxLevel:1,layers:0}]);
assert.deepEqual(advancedPlan.layerSettings,{expansionRatio:1.2,finalLayerThickness:.3,minThickness:.1});
assert.equal(advanced(bg,1,'','','1.2 0.3 0.1').surfaceSettings.length,0);
for(const [boxes,surfaces,layers] of [['0 -0.04 0 0.04 0 0.01 2','','1.2 .3 .1'],['0 -0.04 0 0 0 .01 2','','1.2 .3 .1'],['','','1.2 .1 .3'],['','1 1 2 9','1.2 .3 .1'],['','1 1 2 1\n1 2 3 0','1.2 .3 .1'],['','2 1 2 1','1.2 .3 .1'],['','1 3 2 1','1.2 .3 .1']])assert.throws(()=>advanced(bg,1,boxes,surfaces,layers));
console.log('Local box refinement, per-surface levels and relative layer validation PASS');

const sliceStart=src.indexOf('function cmbBoxSlice('),sliceEnd=src.indexOf('function cmbVisibleSurfaces()',sliceStart);
const boxSlice=new Function('cmbSlice',src.slice(sliceStart,sliceEnd)+';return cmbBoxSlice')(api.slice);
assert.equal(boxSlice(bg,0,0,advancedPlan.boxes).length,1);
assert.equal(boxSlice(bg,0,1,advancedPlan.boxes).length,0);
assert.deepEqual(boxSlice(bg,0,0,advancedPlan.boxes)[0].rect,[-.03,.001,-.01,.009]);
console.log('Refinement box preview respects physical block slab PASS');

assert.equal(advanced(bg,1,'','','1.2 .3 .1',false,3).snapEnabled,false);
assert.equal(advanced(bg,1,'','','1.2 .3 .1',false,3).transitionLayers,3);
assert.equal(advancedPlan.snapEnabled,true);assert.equal(advancedPlan.transitionLayers,2);
assert.throws(()=>advanced(bg,1,'','1 1 2 1','1.2 .3 .1',false,3));
for(const n of [0,7,1.5,NaN])assert.throws(()=>advanced(bg,1,'','','1.2 .3 .1',true,n));
console.log('Castellated-only diagnostic and refinement transition validation PASS');

assert.equal(advanced(bg,1,"","","1.2 .3 .1",true,3,true).explicitFeatures,true);
assert.equal(advancedPlan.explicitFeatures,false);
assert.throws(()=>advanced(bg,1,"","","1.2 .3 .1",false,3,true));
console.log("Explicit sharp-edge recovery mode validation PASS");

const uniform=new Function(src.slice(src.indexOf('function cmbUniformBackgroundPreview('),sa)+';return cmbUniformBackgroundPreview')();
const ub=api.plan({...input,axes:['0\n0.01 4 1\n0.03 6 1',...input.axes.slice(1)],zones:''});
const ucfg={minLevel:1,maxLevel:1,maxCells:200000},empty={boxes:[],surfaceSettings:[]};
assert.deepEqual(uniform(ub,ucfg,empty),{factor:2,cells:1920,level:1});
assert.throws(()=>uniform(bg,ucfg,empty));
assert.throws(()=>uniform(ub,{...ucfg,maxLevel:2},empty));
assert.throws(()=>uniform(ub,{...ucfg,maxCells:1919},empty));
assert.throws(()=>uniform(ub,ucfg,{...empty,boxes:[{}]}));
assert.throws(()=>uniform(ub,ucfg,{...empty,surfaceSettings:[{}]}));
assert.throws(()=>uniform({...ub,cellCount:25001},ucfg,empty));
assert.throws(()=>uniform(p,ucfg,empty));
assert(src.includes('uniformBackground,surfaces:'));
console.log('Uniform background alternative and strict limits PASS');

const receipt=new Function(src.slice(src.indexOf('function cmbUniformBackgroundPreview('),src.indexOf('function cmbSnappySettings('))+';return cmbNativePlanReceipt')();
const request={snappy:{...ucfg,...empty,uniformBackground:true}};
const nativeReceipt={schema:'foamlens/native-snappy-mesh/1',originalCaseModified:false,stagingIsolated:true,plannedCells:1920,originalBackgroundCells:240,uniformBackgroundLevel:1,snappyDiagnosticOnly:true};
assert.equal(receipt(ub,request,nativeReceipt),true);
for(const mismatch of [{plannedCells:240},{originalBackgroundCells:239},{uniformBackgroundLevel:2},{snappyDiagnosticOnly:false},{stagingIsolated:false},{originalCaseModified:true}])assert.equal(receipt(ub,request,{...nativeReceipt,...mismatch}),false);
assert.equal(receipt(ub,{snappy:{...request.snappy,uniformBackground:false}},{...nativeReceipt,plannedCells:240,originalBackgroundCells:null,uniformBackgroundLevel:null}),true);
assert.equal(receipt(ub,{}, {schema:'foamlens/native-cartesian-mesh/1',originalCaseModified:false,stagingIsolated:true,plannedCells:240}),true);
assert.equal(receipt(ub,{},{...nativeReceipt,plannedCells:240}),false);
console.log('Uniform background receipt binds expanded count and original plan without certifying mesh quality PASS');

const recovery=new Function(src.slice(src.indexOf('function cmbUniformBackgroundPreview('),src.indexOf('function cmbNativePlanReceipt('))+';return{estimate:cmbSnappyPlanEstimate,defects:cmbSnappyDefects}')();
const estimate=recovery.estimate(ub,ucfg,false,false,false,true,true);
assert.equal(estimate.baseCells,240);assert.equal(estimate.uniform.cells,1920);assert.equal(estimate.uniformSelected,false);assert.equal(estimate.explicitFeatures,true);
assert.equal(recovery.estimate(ub,ucfg,true,false,false,true,true).uniform,null);
assert.equal(recovery.estimate(ub,ucfg,false,true,false,true,true).uniform,null);
assert.equal(recovery.estimate(ub,{...ucfg,maxCells:1919},false,false,true,true,true).uniform,null);
assert.equal(recovery.estimate(ub,{...ucfg,maxLevel:2},false,false,false,true,true).uniform,null);
const reject={generationUtility:'snappyHexMesh',qualityStatus:'checks-failed',checkMeshLog:' ***Concave cells (using face planes) found, number of cells: 144\nFailed 1 mesh checks.\nEnd\n'};
assert.deepEqual(recovery.defects(reject),{concaveCells:144});
assert.equal(recovery.defects({...reject,qualityStatus:'mesh-ok-reported'}),null);
assert.equal(recovery.defects({...reject,generationUtility:'blockMesh'}),null);
assert.deepEqual(recovery.defects({...reject,checkMeshLog:reject.checkMeshLog+reject.checkMeshLog}),{concaveCells:null});
assert.deepEqual(recovery.defects({...reject,checkMeshLog:'Failed 1 mesh checks.'}),{concaveCells:null});
assert(src.includes('id="cmbSnappyPlanEstimate"'));assert(src.includes('function buttons(){updateSnappyEstimate();'));
console.log('Read-only recovery budget and native concavity evidence PASS');
