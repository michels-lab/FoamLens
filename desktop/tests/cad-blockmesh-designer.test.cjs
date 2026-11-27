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

const uniformLayer={id:1,minLevel:1,maxLevel:1,layers:1};
assert.deepEqual(uniform(ub,ucfg,{...empty,surfaceSettings:[uniformLayer],snapEnabled:true}),{factor:2,cells:1920,level:1});
for(const surfaceSettings of [[{...uniformLayer,maxLevel:2}],[uniformLayer,uniformLayer],[{...uniformLayer,id:0}],[{...uniformLayer,layers:9}]])assert.throws(()=>uniform(ub,ucfg,{...empty,surfaceSettings,snapEnabled:true}));
assert.throws(()=>uniform(ub,ucfg,{...empty,surfaceSettings:[uniformLayer],snapEnabled:false}));
assert.equal(recovery.estimate(ub,ucfg,false,[uniformLayer],true,true,true).uniform.cells,1920);
const layerRequest={snappy:{...request.snappy,surfaceSettings:[uniformLayer],snapEnabled:true}};
assert.equal(receipt(ub,layerRequest,{...nativeReceipt,requestedSurfaceLayers:{flSurface_001:1}}),true);
assert.equal(receipt(ub,layerRequest,nativeReceipt),false);
for(const requestedSurfaceLayers of [{flSurface_001:2},{flSurface_002:1},{flSurface_001:1,flSurface_002:1},[]])assert.equal(receipt(ub,layerRequest,{...nativeReceipt,requestedSurfaceLayers}),false);
console.log('Uniform matching surface layers and receipt compatibility PASS');

assert.deepEqual(recovery.defects({...reject,checkMeshLog:'[truncated]',nativeConcaveCells:144}),{concaveCells:144});
assert.deepEqual(recovery.defects({...reject,nativeConcaveCells:null}),{concaveCells:null});
assert.deepEqual(recovery.defects({...reject,nativeConcaveCells:-1}),{concaveCells:null});
assert.deepEqual(recovery.defects({...reject,checkMeshLog:reject.checkMeshLog+'[truncated]'}),{concaveCells:null});
console.log('Full native defect evidence and exact requested layer receipt PASS');

const finalLayerSummary=new Function(src.slice(src.indexOf('function cmbFinalLayerSummary('),src.indexOf('function cmbLayerReceiptMatches('))+';return cmbFinalLayerSummary')();
const zeroLayer={faces:96,averageLayers:0,thicknessM:0,thicknessPercent:0};
const layerEvidence={requestedSurfaceLayers:{flSurface_001:1},finalSurfaceLayerEvidence:{flSurface_001:zeroLayer}};
assert.deepEqual(finalLayerSummary(layerEvidence),[{name:'flSurface_001',target:1,...zeroLayer}]);
assert.equal(finalLayerSummary({...layerEvidence,finalSurfaceLayerEvidence:null}),null);
for(const bad of [{...zeroLayer,faces:0},{...zeroLayer,averageLayers:2},{...zeroLayer,thicknessM:NaN},{...zeroLayer,thicknessPercent:-1}])assert.equal(finalLayerSummary({...layerEvidence,finalSurfaceLayerEvidence:{flSurface_001:bad}}),null);
assert.equal(finalLayerSummary({...layerEvidence,finalSurfaceLayerEvidence:{flSurface_002:zeroLayer}}),null);
assert.equal(finalLayerSummary({}),null);
console.log('Final native layer metrics: zero layers distinct from missing evidence, thickness not face coverage PASS');

const recoveryLayer=new Function(src.slice(src.indexOf('function cmbFinalLayerSummary('),src.indexOf('function cmbLayerReceiptMatches('))+';return cmbLayerRecoveryEvidence')();
assert.deepEqual(recoveryLayer({...layerEvidence,layerPeakLowWeightFaces:48}),{zeroExtrusion:true,peakLowWeightFaces:48});
assert.deepEqual(recoveryLayer({...layerEvidence,layerPeakLowWeightFaces:0}),{zeroExtrusion:true,peakLowWeightFaces:0});
assert.deepEqual(recoveryLayer({...layerEvidence,layerPeakLowWeightFaces:-1}),{zeroExtrusion:true,peakLowWeightFaces:null});
assert.equal(recoveryLayer({...layerEvidence,finalSurfaceLayerEvidence:null}),null);
assert.deepEqual(recoveryLayer({...layerEvidence,finalSurfaceLayerEvidence:{flSurface_001:{...zeroLayer,averageLayers:.5}},layerPeakLowWeightFaces:12}),{zeroExtrusion:false,peakLowWeightFaces:12});
console.log('Layer recovery distinguishes attempted defects from retained mesh and missing evidence PASS');

{
const bands=new Function(src.slice(a,b)+';return cmbConformalBands')();
const unitInput={axes:['0\n1 8 1','0\n1 8 1','0\n1 8 1'],patches:input.patches,zones:''};
const bounds=[{min:[.25,.25,.25],max:[.75,.75,.75]}];
const v=bands(unitInput,bounds,.125,.25,0);
assert.deepEqual(v.plan.axes.map(q=>q.points),Array(3).fill([0,.25,.75,1]));
assert.deepEqual(v.plan.axes.map(q=>q.counts),Array(3).fill([1,4,1]));
assert.equal(v.plan.cellCount,216);assert.equal(v.plan.blocks.length,27);assert.equal(v.previousCells,512);
assert.equal(v.plan.meshGenerated,false);assert.equal(api.nativePayload(v.plan,'14').zones.length,0);
assert.equal(unitInput.axes[0],'0\n1 8 1');
assert.throws(()=>bands({...unitInput,zones:'0 0 0 metal'},bounds,.125,.25,0));
assert.throws(()=>bands(unitInput,bounds,.25,.125,0));
assert.throws(()=>bands(unitInput,[{min:[0,.25,.25],max:[.75,.75,.75]}],.125,.25,0));
assert.throws(()=>bands(unitInput,bounds,.125,.25,-1));
assert(bands(unitInput,bounds,.125,.25,.125).plan.cellCount>216);
console.log('Conformal CAD bands: shared planes, editable resolution, original plan untouched PASS');
}

{
const bandFn=new Function(src.slice(a,b)+';return cmbConformalBands')();
const original={axes:['0\n1 8 1','0\n1 8 1','0\n1 8 1'],patches:input.patches,zones:''};
const geom=[{min:[.25,.25,.25],max:[.75,.75,.75]}];
const protectedPlan=bandFn(original,geom,.0625,.25,0,true);
assert.deepEqual(protectedPlan.plan.axes.map(q=>q.counts),Array(3).fill([2,8,2]));
assert.equal(protectedPlan.plan.cellCount,1728);assert.equal(protectedPlan.clearanceAdjustments.length,6);
assert.equal(bandFn(original,geom,.0625,.25,0,false).plan.cellCount,1000);
const already=bandFn(original,geom,.0625,.125,0,true);
assert.equal(already.clearanceAdjustments.length,0);assert.equal(already.plan.cellCount,1728);
const padded=bandFn(original,geom,.0625,.25,.125,true);
assert.equal(padded.clearanceAdjustments.length,0);
assert.throws(()=>bandFn(original,geom,.0625,.25,0,'yes'));
console.log('Conformal CAD exterior clearance protection and explicit opt-out PASS');
}

{
const gapBands=new Function(src.slice(a,b)+';return cmbConformalBands')();
const baseInput={axes:['0\n1 8 1','0\n1 8 1','0\n1 8 1'],patches:input.patches,zones:''};
const parts=[{min:[.125,.125,.125],max:[.375,.375,.375]},{min:[.625,.625,.625],max:[.875,.875,.875]}];
const v=gapBands(baseInput,parts,.0625,.25,0,true,true);
assert.deepEqual(v.plan.axes.map(q=>q.counts),Array(3).fill([2,4,2,4,2]));
assert.equal(v.plan.cellCount,2744);assert.equal(v.clearanceAdjustments.filter(q=>q.side==='projected-gap').length,3);
assert.deepEqual(v.clearanceAdjustments.filter(q=>q.side==='projected-gap').map(q=>[q.min,q.max]),Array(3).fill([.375,.625]));
assert.equal(gapBands(baseInput,parts,.0625,.25,0,true,false).plan.cellCount,2197);
assert.equal(gapBands(baseInput,parts,.0625,.125,0,true,true).clearanceAdjustments.filter(q=>q.side==='projected-gap').length,0);
const touching=[parts[0],{min:[.375,.375,.375],max:[.625,.625,.625]}];
const intersecting=[parts[0],{min:[.25,.25,.25],max:[.625,.625,.625]}];
for(const bds of [touching,intersecting,[parts[0],parts[0]]])assert.equal(gapBands(baseInput,bds,.0625,.25,0,true,true).clearanceAdjustments.filter(q=>q.side==='projected-gap').length,0);
assert.throws(()=>gapBands(baseInput,parts,.0625,.25,0,true,'yes'));
console.log('Projected CAD gap protection: disjoint, touching and overlapping extents PASS');
}

{
const spacingCore=new Function(src.slice(a,b)+';return {spacing:cmbBandSpacing,bands:cmbConformalBands}')();
const originalCounts=[1,8,1],points=[0,.25,.75,1];
const raw=spacingCore.spacing(points,originalCounts);
assert.equal(raw.beforeRatio,4);assert.equal(raw.afterRatio,4);assert.deepEqual(raw.counts,originalCounts);
const smoothed=spacingCore.spacing(points,originalCounts,2);
assert.deepEqual(smoothed.counts,[2,8,2]);assert.equal(smoothed.beforeRatio,4);assert.equal(smoothed.afterRatio,2);
assert.equal(smoothed.minWidth,.0625);assert.equal(smoothed.maxWidth,.125);
assert.deepEqual(originalCounts,[1,8,1]);assert.equal(smoothed.changes.length,2);
const chain=spacingCore.spacing([0,1,2,3,4],[1,1,1,16],2);
assert.deepEqual(chain.counts,[2,4,8,16]);assert.equal(chain.afterRatio,2);
const reverse=spacingCore.spacing([0,1,2,3,4],[16,1,1,1],2);
assert.deepEqual(reverse.counts,[16,8,4,2]);
assert.throws(()=>spacingCore.spacing(points,originalCounts,1));
assert.throws(()=>spacingCore.spacing(points,originalCounts,Infinity));
assert.throws(()=>spacingCore.spacing([0,1,1.000001],[1,1],2));
const fixture={axes:['0\n1 8 1','0\n1 8 1','0\n1 8 1'],patches:input.patches,zones:''};
const bounds=[{min:[.25,.25,.25],max:[.75,.75,.75]}];
const v=spacingCore.bands(fixture,bounds,.0625,.25,0,false,false,2);
assert.equal(v.plan.cellCount,1728);
assert.deepEqual(v.plan.axes.map(q=>q.points),Array(3).fill(points));
assert(v.spacingDiagnostics.every(q=>q.afterRatio<=2*(1+1e-12)));
assert.equal(v.plan.meshGenerated,false);
assert.equal(spacingCore.bands(fixture,bounds,.0625,.25,0,false,false).plan.cellCount,1000);
console.log('Conformal band spacing: monotone refinement, ratio propagation, exact CAD planes, explicit budget PASS');
}
