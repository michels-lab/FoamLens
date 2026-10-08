'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const root=path.join(__dirname,'..');
const modulePath=path.join(root,'src','FoamLensDesktop','frontend','v14-z-field-compare.js');
const source=fs.readFileSync(modulePath,'utf8');
new Function(source);

const begin='/* FOAMLENS_FIELD_COMPARE_CORE_START */';
const end='/* FOAMLENS_FIELD_COMPARE_CORE_END */';
const a=source.indexOf(begin),b=source.indexOf(end,a);
assert(a>=0&&b>a,'Field compare core markers missing.');
const core=source.slice(a,b+end.length);
const api=new Function(core+';return {fcCloseTime,fcNearestTime,fcTimeBracket,fcResolveTime,fcInterpolateValues,fcSharedRange,fcMeshDiag,fcSyncedCamera,fcArrayEqualNumeric,fcMeshesEquivalent,fcDifferenceValues,fcDifferenceRange,fcSymmetricDifferenceRange};')();

const passed=[];
function test(name,fn){fn();passed.push(name)}
function near(a,b,e=1e-12){assert(Math.abs(Number(a)-Number(b))<=e,`${a} != ${b}`)}

function cubeMesh(){
  return{
    pointCount:8,faceCount:6,cellCount:1,internalFaceCount:0,boundaryFaceCount:6,
    boundsMin:[0,0,0],boundsMax:[1,1,1],
    points:[0,0,0,1,0,0,1,1,0,0,1,0,0,0,1,1,0,1,1,1,1,0,1,1],
    faceOffsets:[0,4,8,12,16,20,24],
    facePoints:[0,3,2,1,4,5,6,7,0,1,5,4,1,2,6,5,2,3,7,6,3,0,4,7],
    owners:[0,0,0,0,0,0],neighbours:[]
  }
}

test('strict mesh equivalence accepts identical topology and geometry',()=>{
  const a=cubeMesh(),b=JSON.parse(JSON.stringify(a)),r=api.fcMeshesEquivalent(a,b);
  assert.equal(r.ok,true);assert.equal(r.reason,'equivalent');
});

test('strict mesh equivalence rejects same-sized geometry that moved',()=>{
  const a=cubeMesh(),b=JSON.parse(JSON.stringify(a));b.points[0]=0.01;
  const r=api.fcMeshesEquivalent(a,b);assert.equal(r.ok,false);assert.equal(r.reason,'point-geometry-mismatch');
});

test('strict mesh equivalence rejects connectivity changes',()=>{
  const a=cubeMesh(),b=JSON.parse(JSON.stringify(a));b.facePoints[0]=1;
  const r=api.fcMeshesEquivalent(a,b);assert.equal(r.ok,false);assert.equal(r.reason,'face-connectivity-mismatch');
});

test('signed 3D difference is primary minus comparison',()=>{
  assert.deepEqual(api.fcDifferenceValues([10,5,-1],[7,8,-4]),[3,-3,3]);
  assert.deepEqual(api.fcDifferenceValues([10,5,-1],[7,8,-4],'absolute'),[3,3,3]);
});

test('physical-time synchronization supports exact nearest and bounded interpolation',()=>{
  const times=[0,1,2,4];
  const b=api.fcTimeBracket(times,.25);assert.equal(b.ok,true);near(b.lower,0);near(b.upper,1);near(b.weight,.25);
  const exact=api.fcResolveTime(times,1,'exact');assert.equal(exact.ok,true);assert.equal(exact.exact,true);
  const missing=api.fcResolveTime(times,.25,'exact');assert.equal(missing.ok,false);
  const nearest=api.fcResolveTime(times,.6,'nearest');assert.equal(nearest.ok,true);near(nearest.time,1);near(nearest.delta,.4);
  const interp=api.fcResolveTime(times,.25,'interpolate');assert.equal(interp.ok,true);assert.equal(interp.interpolated,true);near(interp.time,.25);near(interp.delta,0);near(interp.weight,.25);
  const outside=api.fcResolveTime(times,5,'interpolate');assert.equal(outside.ok,false);
  assert.deepEqual(api.fcInterpolateValues([0,10],[10,30],.5),[5,20]);
});

test('3D difference supports signed absolute and percent-of-primary modes',()=>{
  assert.deepEqual(api.fcDifferenceValues([10,5],[8,8],'signed'),[2,-3]);
  assert.deepEqual(api.fcDifferenceValues([10,5],[8,8],'absolute'),[2,3]);
  const percent=api.fcDifferenceValues([10,5],[8,8],'percent');
  near(percent[0],20);near(percent[1],-60);
  assert(Number.isFinite(api.fcDifferenceValues([0],[2],'percent',1e-6)[0]));
  const absRange=api.fcDifferenceRange([2,3,1],'absolute');near(absRange.min,0);near(absRange.max,3);
  const pctRange=api.fcDifferenceRange([20,-60],'percent');near(pctRange.min,-60);near(pctRange.max,60);
});

test('difference color range is symmetric around zero',()=>{
  const r=api.fcSymmetricDifferenceRange([-2,.5,5,-1]);
  assert.equal(r.valid,true);near(r.min,-5);near(r.max,5);near(r.mean,.625);assert.equal(r.count,4);
});

test('difference wiring exposes optional third 3D viewport and strict compatibility',()=>{
  for(const token of [
    'Show 3D difference','Mostrar diferencia 3D','fcDifferenceCanvas','fcDifferenceViewport',
    'fcDifferenceLabel','fcMeshesEquivalent','point-geometry-mismatch',
    "mode==='absolute'?'turbo':'coolwarm'",
    "flSetIssue(status,'mesh mismatch: '+compat.reason+'; difference unavailable'",
    "flSetIssue(status,'no-compatible-values'"
  ])assert(source.includes(token),'Missing 3D difference token: '+token);
});

test('3D comparison supports same or different cases with independent fields and components',()=>{
  for(const token of [
    'fcField','fcComponent','View 2 field','Each viewport may use its own case, field and component',
    'fcSameQuantity','different field/component/association/dimensions; difference unavailable',
    "const eligible=(cases||[]).filter(c=>fvCaseViewAvailable(c))"
  ])assert(source.includes(token),'Missing independent-view token: '+token);
});

test('secondary and extra 3D case selectors preserve the case explicitly chosen by the user',()=>{
  assert(source.includes("document.getElementById('fcCase').addEventListener('change',()=>{fcRefreshSelectors(true)"),
    'View 2 case change still discards the selected comparison case.');
  assert(!source.includes("document.getElementById('fcCase').addEventListener('change',()=>{fcRefreshSelectors(false)"),
    'View 2 still resets its Case selector to the primary case.');
  assert(source.includes("fcExtraRefreshSelectors(state,true);fcExtraRefreshFrame(state)"),
    'Views 3/4 do not preserve their selected case while rebuilding dependent selectors.');
  assert(!source.includes("fcExtraRefreshSelectors(state,suffix!=='Case')"),
    'Views 3/4 still reset case selection on Case change.');
});

test('secondary 3D viewport loads cell point or face associations through the generic frame loader',()=>{
  for(const token of [
    "fvFieldGroups(c,region,null,'any')",'fcLoadSynchronizedData',
    "fcState.fieldStorage=data.storage","storage==='point'","storage==='surface'",
    'fvPointSurfaceColors','fvInternalFaceColors','fvBuildPointSliceGeometry','fvBuildPointIsoSurfaceGeometry',
    '3D difference currently requires cell-associated volume fields'
  ])assert(source.includes(token),'Missing generic association-aware comparison token: '+token);
});

test('interpolated comparison rejects unsafe mesh or association changes instead of fabricating a frame',()=>{
  for(const token of [
    'fcLoadSynchronizedData','fcTimeBracket','fcInterpolateValues',
    'Interpolation unavailable: field association changes between bracketing frames.',
    'Interpolation unavailable because the mesh changes between bracketing frames:',
    'fcMeshesEquivalent(a.mesh,b.mesh)','field sizes differ between bracketing frames',
    'fcLoadSynchronizedVectors','vector-mesh-','vector-bracket-size-mismatch'
  ])assert(source.includes(token),'Missing safe interpolation token: '+token);
});

test('comparison UI exposes time badges on every viewport, generalized differences and A/B swapping',()=>{
  for(const token of [
    'fcPrimaryTimeBadge','fcCompareTimeBadge',"fcExtra'+id+'TimeBadge",'fcTimeBadge',
    'Interpolated between frames','fcDifferenceMode','Signed A − B','Absolute |A − B|','Percent of A',
    'fcPercentEpsilon','fcSwapCases','fcSwapPrimaryCompare','swapPrimaryCompare:fcSwapPrimaryCompare',
    'fcCopyAToB','fcCopyPrimarySettingsToCompare','copyPrimarySettingsToCompare:fcCopyPrimarySettingsToCompare',
    "mode==='percent'","mode==='absolute'"
  ])assert(source.includes(token),'Missing advanced comparison UI token: '+token);
});

test('3D comparison can add synchronized views three and four',()=>{
  for(const token of [
    'FC_MAX_TOTAL_VIEWS=4','fcExtraViews','fcExtraAdd','+ Add 3D view',
    'fcExtraRefreshFrame','fcExtraRender','fcRefreshExtras','repeat(auto-fit,minmax(min(100%,400px),1fr))'
  ])assert(source.includes(token),'Missing multi-view token: '+token);
});

test('multi-view comparison exposes descriptors and independent fixed ranges for video',()=>{
  for(const token of ['fcVideoDescriptors','fcSetVideoRanges','getVideoDescriptors:fcVideoDescriptors','setVideoRanges:fcSetVideoRanges','videoRangeOverride'])
    assert(source.includes(token),'Missing multi-view video token: '+token);
});

test('synchronized View 2 follows the shared vector resolution and glyph-size controls',()=>{
  for(const token of [
    "fvVectorGlyphTarget(mesh)","fvVectorGlyphScale()","fvVectorResolution","fvVectorScale"
  ])assert(source.includes(token),'Missing synchronized vector-resolution token: '+token);
  assert(!source.includes('fvBuildVectorGlyphBuffers(mesh,vectors,280)'),
    'Synchronized View 2 still hard-codes 280 glyphs.');
});

test('each synchronized 3D viewport owns an independent scientific legend',()=>{
  for(const token of [
    'fcLegendMarkup','fcUpdateViewportLegend','fcLegend',
    'id="fcExtra\'+id+\'Legend"',"fcExtra'+state.id+'Legend",
    'fcLegendTitle','fcLegendBar','fcLegendTicks','fcLegendDelta',
    "fcUpdateViewportLegend('fcLegend',field,component,data.parsed,shared,fcVisualFor(fcState,'fcView2').palette)"
  ])assert(source.includes(token),'Missing per-viewport legend token: '+token);
  assert(source.includes('second.innerHTML=\'<canvas id="fcCanvas"'),
    'View 2 canvas markup is missing.');
  assert(source.includes('id="fcLegend"'),
    'View 2 has no independent legend container.');
});

test('every synchronized 3D viewport supports linked or independent cameras',()=>{
  for(const token of [
    'fcDriveSharedCamera','dataset.fcSharedCamera',
    "canvas.addEventListener('pointerdown'","canvas.addEventListener('pointermove'",
    "canvas.addEventListener('wheel'","canvas.addEventListener('dblclick'",
    'fcLinkCameras','fcCamerasLinked','fcCameraFor','fcCloneCamera',
    'fcResyncCameras','fcFitAllCameras','camera:null,visual:null',
    "fcDriveSharedCamera(compareCanvas,fcState","fcDriveSharedCamera(extraCanvas,state"
  ])assert(source.includes(token),'Missing linked/independent camera token: '+token);
});

test('comparison view visual synchronization can be disabled without losing independent legends',()=>{
  for(const token of [
    'fcSyncVisuals','fcVisualsSynced','fcVisualFor',
    'fcView2Palette','fcView2Opacity','fcView2Surface','fcView2Edges',
    'fcView2Slice','fcView2Iso','fcView2Vectors','fcView2Streamlines',
    "if(!fcVisualsSynced())","fcExtra'+id+'Palette","fcExtra'+id+'Opacity",
    "fcExtra'+id+'Surface","fcExtra'+id+'Edges","fcExtra'+id+'Slice","fcExtra'+id+'Iso"
  ])assert(source.includes(token),'Missing per-viewport visual-independence token: '+token);
});

test('each 3D viewport keeps its own Probe selection and statistics table',()=>{
  for(const token of [
    'probe:null','fcInstallViewProbe','fcPickView','fcProbeMarker',
    'fcStatsGrid','fcStatsCard','fcStatsMarkup','fcUpdateStatsGrid',
    "fcUi('Selected','Seleccionado')","fcState.probe=hit","state.probe=hit",
    'window.FoamLensFieldProbe?.getLast?.()','ProbeMarker'
  ])assert(source.includes(token),'Missing per-view Probe/statistics token: '+token);
  assert(source.includes("document.getElementById('fvStats')?.classList.toggle('hidden',fcState.enabled)"),'Legacy single-view statistics are not replaced by per-view tables during comparison.');
});

console.log('FoamLens 3D difference field regression suite passed: '+passed.length+' checks.');
for(const name of passed)console.log('  ✓ '+name);

assert(source.includes('function fcComposeViewport('),'Multi-view scene/caption ownership missing');
assert(source.includes('.fcStatsCells{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))'),
  'Comparison scientific statistics must be legible in narrow viewports');
