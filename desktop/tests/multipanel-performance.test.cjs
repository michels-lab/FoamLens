'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const root=path.join(__dirname,'..','src','FoamLensDesktop','frontend');
const multipanel=fs.readFileSync(path.join(root,'v16-multipanel-export.js'),'utf8');
const performance=fs.readFileSync(path.join(root,'v16-progressive-performance.js'),'utf8');
const field=fs.readFileSync(path.join(root,'v14-field-view.js'),'utf8');
const compare=fs.readFileSync(path.join(root,'v14-z-field-compare.js'),'utf8');
const ribbon=fs.readFileSync(path.join(root,'v15-ribbon-ui.js'),'utf8');
const workflow=fs.readFileSync(path.join(__dirname,'..','..','.github','workflows','build-foamlens-desktop.yml'),'utf8');

new Function(multipanel);
new Function(performance);
new Function(field);
new Function(compare);
new Function(ribbon);

const passed=[];
function test(name,fn){fn();passed.push(name)}

test('multi-panel export composes scientific 3D Difference and plot sources',()=>{
  for(const token of [
    'FoamLensMultiPanelExport','meSources','meCompose','meExportPanels',
    'FoamLensFieldView?.getVideoDescriptor','FoamLensFieldCompare?.getVideoDescriptors',
    'meRenderSourceCanvas','meRender3DCanvas','renderExportComposition',
    "d.key==='difference'?'difference':'3d'",
    "sources=(sources||[]).slice(0,4)"
  ])assert(multipanel.includes(token),'Missing multi-panel source/composition token: '+token);
});

test('multi-panel export exposes thesis paper presentation and layout presets',()=>{
  for(const token of [
    'Thesis 2400×1600','Thesis Hi-Res 3200×2000','Paper 2400×1800','Presentation 1920×1080',
    '1-up','2-up','2×2','3D + Profile',
    'Export multi-panel PNG','Export panels separately','scientific labels and ranges','await meCompose([source]'
  ])assert(multipanel.includes(token),'Missing multi-panel preset token: '+token);
});

test('multi-panel export preserves per-panel labels time and scientific ranges',()=>{
  for(const token of [
    "String.fromCharCode(65+index)",'source.caseName','source.fieldName',
    "'t = '+meFmt(source.time)+' s'",'meDrawRange','source.range',
    "source.key==='difference'?'coolwarm'"
  ])assert(multipanel.includes(token),'Missing scientific figure annotation token: '+token);
});

test('3D multipanel export rerenders WebGL sources at requested pixel dimensions and restores the viewport',()=>{
  for(const token of [
    'meRender3DCanvas','FoamLensFieldView.renderAtSize','FoamLensFieldCompare.renderAtSize',
    'FoamLensFieldCompare?.flushLayoutRender?.()',
    'sourceBefore:[oldW,oldH]','sourceDuring:[rendered.width,rendered.height]',
    'rerendered:rendered===src&&rendered.width===width&&rendered.height===height',
    'renderAtSize(oldW,oldH)','await meDrawPanel'
  ])assert(multipanel.includes(token),'Missing high-resolution 3D export token: '+token);
  for(const token of [
    'function fvRender(exportSize=null)','forced=exportSize','renderAtSize(width,height)',
    'function fcRender(exportSize=null)','function fcExtraRender(state,exportSize=null)',
    'function fcRenderDifference(exportSize=null)','renderAtSize(key,width,height)'
  ])assert((field+'\n'+compare).includes(token),'Missing explicit-size WebGL render token: '+token);
});

test('Field View progressively presents the main field before heavy derived geometry',()=>{
  const surface=field.indexOf('fvUpdateSurfaceColors(fieldValues,displayRange,storage)');
  const yieldFrame=field.indexOf('await new Promise(resolve=>requestAnimationFrame(()=>resolve()))',surface);
  const slice=field.indexOf('fvUpdateSlice(displayRange)',yieldFrame);
  const iso=field.indexOf("if(typeof fvUpdateIso==='function')fvUpdateIso(displayRange)",yieldFrame);
  assert(surface>=0&&yieldFrame>surface&&slice>yieldFrame&&iso>yieldFrame,
    'Field frame no longer yields to paint surface/legend before Slice/Iso.');
  assert(field.includes('if(seq!==fvState.frameSeq)return;'),
    'Progressive frame loading lost stale-frame cancellation.');
});

test('adaptive prefetch learns navigation direction and reuses the existing field cache',()=>{
  for(const token of [
    'lastDirection','index>prev?1:-1','requestIdleCallback',
    'fvLoadFieldSetCached','fvFieldCacheKey','pmFieldCacheStats',
    'prefetchHits','prefetchMisses','hitRate','lastPrefetch',
    'avg>700?4:avg>250?3:2','fvState.prefetchSeq'
  ])assert(performance.includes(token),'Missing adaptive-prefetch/cache token: '+token);
});

test('off-screen comparison view loading is deferred but video export remains exhaustive',()=>{
  for(const token of [
    'ppViewportVisible','deferred','Promise.all(visible.map',
    "typeof vaState!=='undefined'&&!!vaState.exporting",
    'return previous.apply(this,arguments)',
    'deferredViews','ppIdle(async()=>'
  ])assert(performance.includes(token),'Missing viewport-aware loading token: '+token);
});

test('controlled performance benchmark compares identical frame sequences with cleared caches and alternating A/B order',()=>{
  for(const token of [
    "mode:'optimized'","ppSetMode(mode)","pmClearFieldCache","fvState.fieldInflight?.clear?.()",
    "round%2===0?['baseline','optimized']:['optimized','baseline']",
    "ppRunBenchmark({frames:4,rounds:2,settleMs:160})",
    "schema:'foamlens-performance-ab-v1'","sequenceIndices:seq.indices.slice()",
    'baseline=ppSampleStats','optimized=ppSampleStats','speedupFactor','percentChange',
    "ppState.mode==='baseline'||!ppFieldVisible()",
    "ppState.mode==='baseline'||video",
    "window.FoamLensPerformance?.mode?.()!=='baseline'"
  ])assert((performance+'\n'+field).includes(token),'Missing controlled A/B benchmark token: '+token);
});

test('real QuickCup CI installs VTK and enforces independent streamline-reference validation',()=>{
  for(const token of [
    'Install VTK streamline reference runtime','python3 -m pip install --disable-pip-version-check vtk',
    'Validate B13 streamlines against VTK','streamline-vtk-reference-input.cjs',
    'vtk_streamline_reference.py','FoamLens-VTK-streamline-validation'
  ])assert(workflow.includes(token),'Missing VTK reference workflow token: '+token);
});

test('performance telemetry reports latency cache reuse and deferred view work',()=>{
  for(const token of [
    'Last frame','Average','Prefetch hit rate','Mesh reuse','Field cache','Deferred views',
    'performance.now()','meshReuses','meshBuilds','FoamLensPerformance'
  ])assert(performance.includes(token),'Missing performance telemetry token: '+token);
});

test('new workflow tools are discoverable from the desktop ribbon',()=>{
  for(const token of [
    'flRaSwapAB','Swap A/B','swapPrimaryCompare','flRaCopyAToB','Copy A→B','copyPrimarySettingsToCompare',
    'flRaExportMulti','Multi-panel','FoamLensMultiPanelExport',
    'flRaPerformance','Performance','ppPanel'
  ])assert(ribbon.includes(token),'Missing ribbon workflow token: '+token);
});

console.log('FoamLens validation/export/performance regression suite passed: '+passed.length+' checks.');
for(const name of passed)console.log('  ✓ '+name);

{
const begin=multipanel.indexOf('/* FOAMLENS_HD_PHOTO_CORE_START */'),end=multipanel.indexOf('/* FOAMLENS_HD_PHOTO_CORE_END */');
const photo=new Function(multipanel.slice(begin,end)+';return {key:mePhotoKey,size:mePhotoDimensions,raster:mePhotoRaster}')();
assert.equal(photo.key('A'),'primary');assert.equal(photo.key('B'),'view2');assert.equal(photo.key('3'),'view3');assert.equal(photo.key('Δ'),'difference');assert.equal(photo.key('invalid'),null);
assert.deepStrictEqual(photo.size(3840,16/9,{width:8192,height:8192}),{width:3840,height:2160});
assert.deepStrictEqual(photo.size(3840,.5,{width:8192,height:8192}),{width:1920,height:3840});
assert.throws(()=>photo.size(7680,1,{width:4096,height:4096}));
let copies=0,restores=0;const src={width:640,height:480},gl={drawingBufferWidth:640,drawingBufferHeight:480};
const draw=(w,h)=>{src.width=gl.drawingBufferWidth=w;src.height=gl.drawingBufferHeight=h;return src};
const create=()=>({getContext:()=>({fillRect:()=>{},drawImage:(x)=>{assert.strictEqual(x,src);assert.equal(src.width,1920);copies++}})});
const fixture={src,gl,render:draw,restore:(w,h)=>{restores++;return draw(w,h)},create};
const out=photo.raster(fixture,{width:1920,height:1440},'white');
assert.equal(out.width,1920);assert.equal(out.height,1440);assert.equal(copies,1);assert.equal(restores,1);assert.equal(src.width,640);
assert.throws(()=>photo.raster({...fixture,render:()=>src},{width:1920,height:1440},'transparent'));assert.equal(restores,2);
assert.throws(()=>photo.raster({...fixture,create:()=>({getContext:()=>null})},{width:1920,height:1440},'black'));assert.equal(restores,3);
assert(compare.includes("photo.dataset.fcPhoto=String(view)"));assert(compare.includes("openPhoto?.(String(view))"));assert(ribbon.includes("openPhoto?.('A')"));
console.log('HD photo exact-size rendering, GPU bounds, restoration and per-view entry PASS');
}

{
const native=fs.readFileSync(path.join(root,'..','Program.cs'),'utf8');
for(const token of ['cameraInitiallyVisible:permanentCamera()','cameraPersistsAfterToggle=permanentCamera()','cameraWithInspect=permanentCamera()','cameraWithCompare=permanentCamera()','photoDialogOpens','photoPngHeader','photoContentValid','photoRestored'])assert(native.includes(token),'Missing native photo contract '+token);
assert(multipanel.includes('await meCapturePhoto(mePhotoView'));assert(multipanel.includes('capturePhoto:meCapturePhoto'));assert(!native.includes('checks.cameraCloses='));
}
