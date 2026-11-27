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
const fes=new Function(surfaces.slice(fesStart,fesEnd)+';return {fesExtract,fesConfig,fesCsv,fesPreview};')();
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
