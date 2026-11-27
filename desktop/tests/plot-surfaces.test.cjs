'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const base=path.join(__dirname,'..','src','FoamLensDesktop','frontend');
const index=fs.readFileSync(path.join(base,'index.html'),'utf8');
const surfaces=fs.readFileSync(path.join(base,'v14-zy-plot-surfaces.js'),'utf8');
const field=fs.readFileSync(path.join(base,'v14-zz-field-workspace.js'),'utf8');
const multipanel=fs.readFileSync(path.join(base,'v16-multipanel-export.js'),'utf8');
const program=fs.readFileSync(path.join(__dirname,'..','src','FoamLensDesktop','Program.cs'),'utf8');

new Function(surfaces);
new Function(field);
new Function(multipanel);

const passed=[];
function test(name,fn){fn();passed.push(name)}

test('core plot interactions are reusable across canvases',()=>{
  for(const token of [
    'const plotCanvasInteractionBindings=new WeakSet()',
    'function bindPlotCanvasInteractions(canvas)',
    "canvas.addEventListener('pointerdown'",
    "canvas.addEventListener('mousemove'",
    "canvas.addEventListener('click'",
    "bindPlotCanvasInteractions($('canvas'))"
  ])assert(index.includes(token),'Missing reusable interaction token: '+token);
  assert(index.includes('ev.currentTarget.setPointerCapture?.(ev.pointerId)'));
  assert(index.includes('ev.currentTarget.releasePointerCapture?.(ev.pointerId)'));
});

test('Data Analysis and Field own distinct stable plot surfaces',()=>{
  for(const token of [
    "['data',{view:currentDataView||'timeseries'",
    "['analysis',{view:'timeseries'",
    "['field',{view:'profile'",
    "flPlotSurfaceEnsure('analysis',document.getElementById('chartViewport'))",
    "flPlotSurfaceEnsure(key,host=null)",
    "if(key==='field')host=host||document.getElementById('fw2DHost')"
  ])assert(surfaces.includes(token),'Missing stable surface token: '+token);
});

test('legacy renderer compatibility is implemented by active IDs, not DOM reparenting',()=>{
  for(const role of ['canvas','previewTools','previewBadge','clearPins','tooltip','canvasSelection','workspaceHint','empty'])
    assert(surfaces.includes("'"+role+"'"),'Canonical plot role missing: '+role);
  assert(surfaces.includes('function flPlotSurfaceSwapCanonicalIds(fromKey,toKey)'));
  assert(surfaces.includes("prev.id=role+'-'+fromKey"));
  assert(surfaces.includes('next.id=role'));
  assert(!surfaces.includes('position:fixed'),'Plot surface controller must not use a fixed overlay portal.');
  assert(!surfaces.includes('position:absolute'),'Plot surface controller must not use an absolute overlay portal.');
});

test('surface switches preserve view and pinned-point state',()=>{
  for(const token of [
    'function flPlotSurfaceCapture',
    'state.view=currentDataView',
    'state.pinned=(pinnedPoints||[]).map',
    'state.activeId=activeId',
    'function flPlotSurfaceRestore',
    'currentDataView=state.view',
    'pinnedPoints=(state.pinned||[]).map',
    'activeId=state.activeId'
  ])assert(surfaces.includes(token),'Missing plot state preservation token: '+token);
});

test('cloned surfaces keep the full interaction model',()=>{
  assert(surfaces.includes('bindPlotCanvasInteractions(canvas)'),'Cloned canvas is not bound to the shared interaction controller.');
  assert(surfaces.includes("clear.onclick=()=>"),'Cloned surface does not bind Clear pinned points.');
  assert(surfaces.includes('flPlotSurfaceTemplate.cloneNode(true)'),'Stable surfaces are not created from the same visual structure.');
  assert(surfaces.includes("document.dispatchEvent(new CustomEvent('foamlens-plot-surface-change'"),
    'Surface changes are not observable by other UI modules.');
});

test('Field no longer moves or restores the singleton chart',()=>{
  assert(field.includes('function fwEnsureCompanionSurface'));
  assert(field.includes("FoamLensPlotSurfaces?.ensure?.('field',host)"));
  assert(field.includes("FoamLensPlotSurfaces?.activate?.('field',host,{restore:false})"));
  assert(!field.includes('appendChild(chart)'),'Field still moves a chart node.');
  assert(!field.includes('fwRestoreCompanionNodes'),'Field still restores a shared chart node.');
  assert(!field.includes('function fwRemember('),'Field still tracks legacy DOM origins.');
  assert(!field.includes('function fwRestore('),'Field still exposes legacy DOM restore logic.');
  assert(!field.includes('function fwMove('),'Field still exposes legacy DOM move logic.');
});

test('packaged runtime smoke cycles Data Analysis and Field without moving surfaces',()=>{
  for(const token of [
    'plotSurfaceCount',
    'plotSurfaceParentsStable',
    'plotSurfaceDataActive',
    'plotSurfaceAnalysisActive',
    'plotSurfaceDataRestored',
    'plotSurfaceFieldRestored',
    "string.Equals(plotSurfaceDataParentNode.GetString(), \"chartViewport\"",
    "string.Equals(plotSurfaceFieldParentNode.GetString(), \"fw2DHost\"",
    'stable Data / Analysis / Field plot-surface runtime smoke failed'
  ])assert(program.includes(token),'Missing packaged plot-surface smoke token: '+token);
});

test('exports continue through the canonical active canvas',()=>{
  assert(multipanel.includes("document.getElementById('canvas')"),
    'Multi-panel export no longer reads the canonical active plot surface.');
  assert(surfaces.includes("el.id=canonical?role:role+'-'+key"));
});

console.log('FoamLens stable 2D plot-surface regression suite passed: '+passed.length+' checks.');
for(const name of passed)console.log('  ✓ '+name);


const fesStart=surfaces.indexOf('/* FOAMLENS_ENTITY_SELECTION_CORE_START */'),fesEnd=surfaces.indexOf('/* FOAMLENS_ENTITY_SELECTION_CORE_END */');
assert(fesStart>=0&&fesEnd>fesStart);
const fes=new Function(surfaces.slice(fesStart,fesEnd)+';return {fesExtract,fesConfig,fesCsv,fesPreview,fesRecipe,fesRecipeMatches,fesClipTriangle,fesClipSurface,fesClipObj,fesDimensions,fesBuildCells,fesCellTree,fesLocate,fesIntegrate,fesResample,fesComparable,fesPhysicalBudget,fesCalcDimensions,fesCalculate,fesGradient,fesTemporalStart,fesTemporalStep,fesTemporalFinish,fesHeatFlux,fesFaceArea,fesPatchPower,fesPhaseVolumes,fesDerivedPreviewData,fesInventoryProperties,fesInventoryGeometry,fesInventory,fesInventoryHistory};')();
const source={caseId:'a',region:'metal',field:'T',association:'volume',component:'value',unit:'K',time_s:0,paths:['0/metal/T'],dimensions:[0,0,0,1,0,0,0],meshId:'mesh-A'};
const mesh={cellCount:4,cellCenters:[0,0,0,1,0,0,2,1,0,3,1,0]};
const input={mesh,source,values:[0,100,200,null]};
test('threshold preserves real zero and counts missing values',()=>{
 const q=fes.fesExtract(input,{mode:'threshold',min:0,max:100});assert(q.valid);assert.deepStrictEqual(q.rows.map(x=>x.id),[0,1]);assert.strictEqual(q.rows[0].value,0);assert.strictEqual(q.coverage.missingValue,1);assert.strictEqual(q.coverage.excluded,1);assert.strictEqual(q.source.time_s,0);
});
test('box, plane and explicit ids are composable with scalar limits',()=>{
 const box=fes.fesExtract(input,{mode:'box',bounds:[0,2,0,1,0,0],threshold:true,min:100,max:200});assert.deepStrictEqual(box.rows.map(x=>x.id),[1,2]);
 const plane=fes.fesExtract(input,{mode:'plane',axis:'x',side:'above',offset:1});assert.deepStrictEqual(plane.rows.map(x=>x.id),[1,2]);
 const ids=fes.fesExtract(input,{mode:'ids',ids:'2,0,2'});assert.deepStrictEqual(ids.rows.map(x=>x.id),[0,2]);assert.strictEqual(fes.fesExtract(input,{mode:'ids',ids:'9'}).reason,'id-outside-source');
});
test('invalid limits, cardinality and source identity fail closed',()=>{
 for(const c of [{mode:'threshold',min:'',max:1},{mode:'plane',axis:'x',side:'invalid',offset:0},{mode:'box',bounds:[1,0,0,1,0,1]},{mode:'bad'},{mode:'ids',ids:'-1'}])assert(!fes.fesExtract(input,c).valid);
 assert.strictEqual(fes.fesExtract(input,{mode:'all',limit:2}).reason,'selection-limit-exceeded');
 assert.strictEqual(fes.fesExtract({...input,values:[0]},{mode:'all'}).reason,'field-count-mismatch');
 assert(!fes.fesExtract({...input,source:{...source,paths:[]}},{mode:'all'}).valid);
});
test('point and face associations preserve ids and explicit boundary coverage',()=>{
 const m={pointCount:3,points:[0,0,0,3,0,0,0,3,0],faceCount:3,internalFaceCount:1,faceOffsets:[0,3,6,9],facePoints:[0,1,2,0,1,2,0,1,2]};
 const a=fes.fesExtract({mesh:m,values:[0,1,2],source:{...source,association:'point'}},{mode:'all'});assert.deepStrictEqual(a.rows[1].point_m,[3,0,0]);
 const b=fes.fesExtract({mesh:m,values:[0],boundary:new Map([[2,7]]),source:{...source,association:'surface'}},{mode:'all'});assert.deepStrictEqual(b.rows.map(x=>x.id),[0,2]);assert.deepStrictEqual(b.rows[0].point_m,[1,1,0]);assert.strictEqual(b.rows[1].kind,'explicit-boundary-face');assert.strictEqual(b.coverage.missingValue,1);
});
test('preview does not remove export rows and snapshots are immutable with respect to source arrays',()=>{
 const a=fes.fesExtract(input,{mode:'all'});assert.strictEqual(fes.fesPreview(a.rows,2).length,2);assert.strictEqual(a.rows.length,3);
 const v=input.values[0],p=mesh.cellCenters[0];input.values[0]=42;mesh.cellCenters[0]=99;assert.strictEqual(a.rows[0].value,v);assert.strictEqual(a.rows[0].point_m[0],p);input.values[0]=v;mesh.cellCenters[0]=p;
 const csv=fes.fesCsv({...a,source:{...a.source,region:'=bad'}});assert(csv.includes("'=bad"));assert(csv.includes('source_paths'));assert.strictEqual(csv.trim().split('\n').length,4);
});
test('extractor mounts inside Field and exports immutable selected snapshot',()=>{
 assert(surfaces.includes("const host=fesE('fieldViewControls')"));assert(surfaces.includes('fesResult=result'));assert(surfaces.includes('FoamLens_entity_selection.'));assert(surfaces.includes('No interpolation, volume clipping or integration.'));
});

test('pipeline intersects original coordinates and field values without truncating intermediate stages',()=>{
 const q=fes.fesExtract(input,{stages:[{mode:'threshold',min:0,max:200,limit:1},{mode:'plane',axis:'x',side:'above',offset:1},{mode:'box',bounds:[0,1,0,1,0,1]}],limit:1});assert(q.valid);assert.deepStrictEqual(q.rows.map(x=>x.id),[1]);assert.strictEqual(q.filter.stages.length,3);
 assert(!fes.fesExtract(input,{stages:[]}).valid);assert(!fes.fesExtract(input,{stages:[{mode:'ids',ids:'999'}]}).valid);
});
test('recipes preserve field association and ID stages bind exact mesh/time',()=>{
 const p=fes.fesRecipe([{mode:'threshold',min:0,max:100}],source);assert(fes.fesRecipeMatches(p,{...source,time_s:2}));assert(!fes.fesRecipeMatches(p,{...source,unit:'C'}));
 const q=fes.fesRecipe([{mode:'ids',ids:'0'}],source);assert(fes.fesRecipeMatches(q,source));assert(!fes.fesRecipeMatches(q,{...source,meshId:'other'}));assert(!fes.fesRecipeMatches(q,{...source,time_s:1}));assert(!fes.fesRecipeMatches({...q,hasIds:false},source));
});
test('surface clip produces real intersection vertices and preserves triangle winding',()=>{
 const tri=[[0,0,0],[2,0,0],[0,2,0]],q=fes.fesClipTriangle(tri,0,1,'above');assert.strictEqual(q.length,1);assert(q[0].every(p=>p[0]>=1));assert(q[0].some(p=>p[0]===1&&p[1]===1));assert(q[0].some(p=>p[0]===1&&p[1]===0));
 const b=fes.fesClipTriangle(tri,0,1,'below');assert.strictEqual(b.length,2);
 assert.strictEqual(fes.fesClipTriangle(tri,0,3,'above').length,0);assert.strictEqual(fes.fesClipTriangle(tri,0,0,'below').length,0);
 const area=xs=>xs.reduce((sum,[a,b,c])=>sum+((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))/2,0);assert.strictEqual(area(q)+area(b),2);
});
test('surface clip exports original triangle IDs, open shell and coverage',()=>{
 const m={points:[0,0,0,2,0,0,0,2,0],surfaceTriangles:[0,1,2,0,1,99]},a=fes.fesClipSurface({mesh:m,source},{axis:'x',offset:1,side:'below'});assert(a.valid);assert.strictEqual(a.triangles.length,2);assert.strictEqual(a.coverage.invalid,1);assert(a.triangles.every(t=>t.sourceTriangle===0));assert(a.limitations.includes('uncapped'));
 const obj=fes.fesClipObj(a);assert(obj.includes('f 1 2 3'));assert(obj.includes('f 4 5 6'));assert(obj.includes('sourceTriangle 0'));assert(!fes.fesClipSurface({mesh:m,source},{axis:'x',offset:1,side:'below',limit:1}).valid);assert(!fes.fesClipSurface({mesh:m,source},{axis:'x',offset:'',side:'above'}).valid);
});

function cube(x=0,size=1){
 const points=[0,0,0,1,0,0,1,1,0,0,1,0,0,0,1,1,0,1,1,1,1,0,1,1].map((v,i)=>v*size+(i%3===0?x:0));
 return {cellCount:1,points,cellCenters:[x+size/2,size/2,size/2],owners:[0,0,0,0,0,0],neighbours:[],faceOffsets:[0,4,8,12,16,20,24],facePoints:[0,3,2,1,4,5,6,7,0,1,5,4,1,2,6,5,2,3,7,6,3,0,4,7]}
}
test('verified volume is scale-independent and integral uses field dimensions',()=>{
 const a={mesh:cube(0,.001),values:[1000],source:{...source,dimensions:'[0 0 0 1 0 0 0]'}},q=fes.fesIntegrate(a);
 assert(q.valid);assert(Math.abs(q.volume_m3-1e-9)<1e-20);assert(Math.abs(q.integral-1e-6)<1e-17);assert(Math.abs(q.weightedMean-1000)<1e-10);assert.deepStrictEqual(q.integralDimensions,[0,3,0,1,0,0,0]);
 assert(!fes.fesIntegrate({...a,values:[null]}).valid);assert(!fes.fesIntegrate({...a,source:{...source,dimensions:''}}).valid);assert(!fes.fesIntegrate(a,[]).valid);
});
test('open, inverted and warped cells are never integrated',()=>{
 const a=cube(),open={...a,owners:a.owners.slice(1),faceOffsets:a.faceOffsets.slice(0,-1),facePoints:a.facePoints.slice(0,-4)},inv={...a,facePoints:a.facePoints.slice().reverse()},warped=cube();warped.points[20]+=.1;
 assert.strictEqual(fes.fesBuildCells(open)[0],null);assert.strictEqual(fes.fesBuildCells(inv)[0],null);assert.strictEqual(fes.fesBuildCells(warped)[0],null);
});
test('resample finds containing cell, rejects outside and incompatible source',()=>{
 const a={mesh:cube(0,.5),values:[10],source},b={mesh:cube(),values:[20],source:{...source,caseId:'b'}};
 const q=fes.fesResample(a,b);assert(q.valid);assert.strictEqual(q.coverage.matched,1);assert.strictEqual(q.rows[0].difference,10);assert.strictEqual(q.metrics.rmse,10);
 const outside=fes.fesResample({...a,mesh:cube(2,.5)},b);assert(outside.valid);assert.strictEqual(outside.coverage.unmatched,1);assert.strictEqual(outside.rows[0].b,null);assert.strictEqual(outside.metrics,null);
 assert(!fes.fesResample(a,{...b,source:{...b.source,time_s:1}}).valid);assert(!fes.fesResample(a,{...b,source:{...b.source,region:'mold'}}).valid);assert(!fes.fesResample(a,{...b,source:{...b.source,dimensions:[0,1,0,0,0,0,0]}}).valid);
 const overlap=fes.fesCellTree([...fes.fesBuildCells(cube()),{...fes.fesBuildCells(cube())[0],id:1}]);assert.deepStrictEqual(fes.fesLocate(overlap,[.5,.5,.5]),[0,1]);
});

test('larger physical budgets are explicit and compact traversal does not retain cells',()=>{
 assert.strictEqual(fes.fesPhysicalBudget('integral',1000000),1000000);assert.strictEqual(fes.fesPhysicalBudget('resample',500000),500000);assert.strictEqual(fes.fesPhysicalBudget('resample',1000000),null);assert.strictEqual(fes.fesPhysicalBudget('integral',1000001),null);
 let seen=[];const built=fes.fesBuildCells(cube(),{limit:1000000,retain:false,onCell:c=>seen.push(c.volume)});assert.strictEqual(built,true);assert.deepStrictEqual(seen,[1]);
 const input={mesh:cube(),values:[10],source};const a=fes.fesIntegrate(input,null,1000000);assert(a.valid);assert.strictEqual(a.cellBudget,1000000);assert.strictEqual(a.integral,10);assert(!fes.fesIntegrate(input,null,0).valid);
 const b=fes.fesResample(input,input,500000);assert(b.valid);assert.strictEqual(b.cellBudgetPerMesh,500000);assert.strictEqual(b.rows[0].difference,0);assert(!fes.fesResample(input,input,1000000).valid);
 assert(surfaces.includes('new Int32Array(starts[n])'));assert(surfaces.includes('retain:false,onCell:c=>rowFor(c.id,c)'));
});

function finishGenerator(g){let q=g.next();while(!q.done)q=g.next();return q.value}
test('calculator checks dimensional arithmetic and same exact mesh, preserves missing',()=>{
 const a={mesh:{cellCount:3},values:[10,0,20],source},b={...a,values:[2,0,null],source:{...source,field:'Q'}};
 const q=finishGenerator(fes.fesCalculate(a,b,'divide'));assert(q.valid);assert.strictEqual(q.columns[0].values[0],5);assert(Number.isNaN(q.columns[0].values[1]));assert(Number.isNaN(q.columns[0].values[2]));assert.deepStrictEqual(q.dimensions,[0,0,0,0,0,0,0]);
 assert(!finishGenerator(fes.fesCalculate(a,{...b,source:{...b.source,meshId:'other'}},'multiply')).valid);assert(!finishGenerator(fes.fesCalculate(a,{...b,source:{...b.source,dimensions:[0,1,0,0,0,0,0]}},'add')).valid);
});
test('gradient recovers linear field on physical coordinates, rank deficiency stays missing',()=>{
 const a={mesh:{cellCount:4,cellCenters:[0,0,0,.001,0,0,0,.001,0,0,0,.001],owners:[0,0,0],neighbours:[1,2,3]},values:[10,12,13,14],source};
 const q=finishGenerator(fes.fesGradient(a));assert(q.valid);assert.strictEqual(q.coverage.valid,1);assert(Math.abs(q.columns[0].values[0]-2000)<1e-8);assert(Math.abs(q.columns[1].values[0]-3000)<1e-8);assert(Math.abs(q.columns[2].values[0]-4000)<1e-8);assert(Number.isNaN(q.columns[0].values[1]));assert.deepStrictEqual(q.dimensions,[0,-1,0,1,0,0,0]);
 assert(!finishGenerator(fes.fesGradient({...a,mesh:{...a.mesh,decomposed:true}})).valid);
});
test('temporal statistics uses irregular physical intervals and linear moments, not frame average',()=>{
 const frame=(time,v)=>({mesh:{cellCount:2},values:v,source:{...source,time_s:time}});
 const st=fes.fesTemporalStart(frame(0,[0,10]));assert(finishGenerator(fes.fesTemporalStep(st,frame(1,[2,null]))));assert(finishGenerator(fes.fesTemporalStep(st,frame(3,[6,20]))));const q=finishGenerator(fes.fesTemporalFinish(st));assert(q.valid);assert.strictEqual(q.duration_s,3);assert(Math.abs(q.columns[0].values[0]-3)<1e-10);assert(Math.abs(q.columns[1].values[0]-Math.sqrt(3))<1e-10);assert.strictEqual(q.columns[2].values[0],0);assert.strictEqual(q.columns[3].values[0],6);assert(Number.isNaN(q.columns[0].values[1]));assert.strictEqual(q.coverage.valid,1);
 const wrong=fes.fesTemporalStart(frame(0,[0,1]));assert(!finishGenerator(fes.fesTemporalStep(wrong,{...frame(1,[1,2]),source:{...source,time_s:1,meshId:'moved'}})));
});

test('Fourier heat flux validates conductivity and preserves gradient missing coverage',()=>{
 const a={mesh:{cellCount:4,cellCenters:[0,0,0,.001,0,0,0,.001,0,0,0,.001],owners:[0,0,0],neighbours:[1,2,3]},values:[10,12,13,14],source};
 const q=finishGenerator(fes.fesHeatFlux(a,2,'xyz'));assert(q.valid);assert.strictEqual(q.columns[0].values[0],-4000);assert.strictEqual(q.columns[1].values[0],-6000);assert.strictEqual(q.columns[2].values[0],-8000);assert.strictEqual(q.coverage.valid,1);assert(Number.isNaN(q.columns[0].values[1]));assert.deepStrictEqual(q.dimensions,[1,0,-3,0,0,0,0]);assert(!finishGenerator(fes.fesHeatFlux(a,-1,'xyz')).valid);
 const k={...a,values:[3,3,3,3],source:{...source,field:'k',dimensions:[1,1,-3,-1,0,0,0]}};assert.strictEqual(finishGenerator(fes.fesHeatFlux(a,k,'xyz')).columns[0].values[0],-6000);assert(!finishGenerator(fes.fesHeatFlux(a,{...k,source:{...k.source,meshId:'bad'}},'xyz')).valid)
});
test('boundary power uses explicit face flux and area, sign and complete coverage',()=>{
 const m={...cube(0,2),internalFaceCount:0,faceCount:6,boundaryPatches:[{name:'wall',type:'wall',startFace:0,nFaces:2}]},a={mesh:m,source:{...source,association:'surface',dimensions:[1,0,-3,0,0,0,0]},boundary:new Map([[0,10],[1,20]])};
 assert.strictEqual(fes.fesFaceArea(m,0),4);const q=finishGenerator(fes.fesPatchPower(a,['wall'],'outward-positive'));assert(q.valid);assert.strictEqual(q.outwardPower_W,120);assert.strictEqual(q.area_m2,8);assert.strictEqual(finishGenerator(fes.fesPatchPower(a,['wall'],'inward-positive')).outwardPower_W,-120);assert(!finishGenerator(fes.fesPatchPower({...a,boundary:new Map([[0,10]])},['wall'],'outward-positive')).valid);assert(!finishGenerator(fes.fesPatchPower(a,['wall'],'')).valid);
 const power={...a,source:{...a.source,dimensions:[1,2,-3,0,0,0,0]}};assert.strictEqual(finishGenerator(fes.fesPatchPower(power,['wall'],'outward-positive')).outwardPower_W,30);
});
test('phase volumes require explicit role, dimensionless field and valid fractions',()=>{
 const a={mesh:cube(),values:[.25],source:{...source,field:'alpha',dimensions:[0,0,0,0,0,0,0]}},q=finishGenerator(fes.fesPhaseVolumes(a,'liquid'));assert(q.valid);assert.strictEqual(q.liquid_m3,.25);assert.strictEqual(q.solid_m3,.75);assert.strictEqual(finishGenerator(fes.fesPhaseVolumes(a,'solid')).liquid_m3,.75);assert(!finishGenerator(fes.fesPhaseVolumes({...a,values:[1.1]},'liquid')).valid);assert(!finishGenerator(fes.fesPhaseVolumes(a,'unknown')).valid);
});
test('derived preview samples display only and retains full measured extrema',()=>{
 const mesh={cellCount:5,cellCenters:[0,0,0,1,0,0,2,0,0,3,0,0,4,0,0]},values=[1,99,3,NaN,5],q=fes.fesDerivedPreviewData(mesh,values,2);assert.strictEqual(q.valid,4);assert.strictEqual(q.missing,1);assert.strictEqual(q.max,99);assert(q.points.length<=2);assert.strictEqual(values.length,5);
});

test('thermal inventory uses density, physical volume, explicit phase mass fraction and reference',()=>{
 const a={mesh:cube(),values:[1100],source},rho={...a,values:[7000],source:{...source,field:'rho',dimensions:[1,-3,0,0,0,0,0]}},alpha={...a,values:[.25],source:{...source,field:'alpha',dimensions:[0,0,0,0,0,0,0]}},props={cp:500,reference_K:1000,latent:200000,role:'liquid-mass',estimate:true,solidDensity:7500,liquidDensity:7000},geo=fes.fesInventoryGeometry(a,250000),q=finishGenerator(fes.fesInventory(a,rho,alpha,props,geo));
 assert(q.valid);assert.strictEqual(q.mass_kg,7000);assert.strictEqual(q.sensible_J,350000000);assert.strictEqual(q.latent_J,350000000);assert.strictEqual(q.total_J,700000000);assert.strictEqual(q.liquidMass_kg,1750);
 assert(Math.abs(q.estimatedVolume_m3-(1750/7000+5250/7500))<1e-12);
 assert(!finishGenerator(fes.fesInventory(a,{...rho,values:[0]},alpha,props,geo)).valid);assert(!finishGenerator(fes.fesInventory(a,rho,{...alpha,values:[null]},props,geo)).valid);
 assert(!finishGenerator(fes.fesInventory(a,{...rho,source:{...rho.source,time_s:1}},alpha,props,geo)).valid);assert(!fes.fesInventoryProperties({...props,role:'none'}));
 const v=finishGenerator(fes.fesInventory(a,rho,alpha,{...props,role:'liquid-volume'},geo));assert(v.valid);assert(Math.abs(v.liquidMass_kg-7000*(.25*7000)/(.25*7000+.75*7500))<1e-9);
});
test('transient closure integrates signed boundary heat over irregular time intervals, not frames',()=>{
 const prop={cp:1},frame=(t,E,p,V=1,M=10)=>({valid:true,time_s:t,volume_m3:V,mass_kg:M,sensible_J:E,latent_J:0,total_J:E,properties:prop,sources:[{...source,time_s:t}],estimatedVolume_m3:V,cellCount:1,boundaryPower:{valid:true,source:{...source,time_s:t,field:'q'},outwardPower_W:p,inputKind:'face-power-W',signConvention:'outward-positive',patches:[{patch:'wall'}]}});
 const frames=[frame(0,100,10),frame(2,70,20),frame(5,10,20,.9,9.5)],q=fes.fesInventoryHistory(frames,{closure:true,sourcePower_W:0});assert(q.valid);assert.strictEqual(q.rows[2].heatOut_J,90);assert.strictEqual(q.rows[2].residual_J,0);assert.strictEqual(q.rows[2].massChange_pct,-5);assert(Math.abs(q.rows[2].volumeChange_pct+10)<1e-12);assert(Math.abs(q.rows[2].estimatedShrinkage_pct-10)<1e-12);
 assert(!fes.fesInventoryHistory(frames,{closure:true,sourcePower_W:''}).valid);assert(!fes.fesInventoryHistory([frames[0],{...frames[1],boundaryPower:null}],{closure:true,sourcePower_W:0}).valid);assert(!fes.fesInventoryHistory([frames[0],frames[0]]).valid);
 const passive=fes.fesInventoryHistory(frames);assert(passive.valid);assert.strictEqual(passive.rows[2].residual_J,null);assert.strictEqual(passive.rows[2].heatOut_J,null);
});
