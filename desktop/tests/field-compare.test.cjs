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
const api=new Function(core+';return {fcPhysicalNumber,fcCloseTime,fcNearestTime,fcTimeBracket,fcResolveTime,fcInterpolateValues,fcSharedRange,fcMeshDiag,fcSyncedCamera,fcArrayEqualNumeric,fcMeshesEquivalent,fcDifferenceValues,fcDifferenceRange,fcSymmetricDifferenceRange};')();

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

test('missing physical time is never coerced to measured t=0 in 3D synchronization',()=>{
  assert(Number.isNaN(api.fcNearestTime([null,'',false,9.8],null)));
  assert.equal(api.fcCloseTime(null,0),false);
  assert.equal(api.fcResolveTime([0,9.8],false,'exact').ok,false);
  assert.equal(api.fcTimeBracket([null,'',false,9.8],0).ok,false);
  assert.equal(api.fcResolveTime(['0','9.8'],'0','exact').ok,true);
  near(api.fcNearestTime(['0','9.8'],9.7),9.8);
});

test('independent B/C/D controls reject blank and nonphysical timestamps instead of inventing t=0',()=>{
  const start=source.indexOf('function fcSetIndependentTime(view,value){'),
    end=source.indexOf('// Independent playback is one timer',start);
  assert(start>=0&&end>start,'Must test original independent time setter');
  const active={enabled:true,timeTarget:9.8,timeSource:'B3|metal|T',
    mesh:{},fieldValues:[1000],time:9.8},
    other={id:3,timeTarget:9.8,timeSource:'C3|mold|T',
      mesh:{},fieldValues:[273],time:9.8};
  const calls=[];
  let linked=false;
  const choose=new Function('fcPhysicalNumber','fcTimesLinked','fcState',
    'fcExtraViews','fcIndependentTimeSource','fcRefreshFrame','fcExtraRefreshFrame',
    'fcScheduleToolbarSync','fcSetStatus',
    source.slice(start,end)+';return fcSetIndependentTime;')(
      api.fcPhysicalNumber,()=>linked,active,[other],
      state=>({key:state===active?'B3|metal|T':'C3|mold|T',times:[0,9.8]}),
      ()=>{calls.push('B');return Promise.resolve()},
      state=>{calls.push('C');return Promise.resolve()},
      ()=>{},()=>{});
  for(const invalid of ['', ' ', null, undefined, false, true, '0x0',
    '0b0','0o0','Infinity','NaN','0s','0,0',[],{}]){
    assert.equal(choose('B',invalid),false,'Invalid input rejected: '+String(invalid));
  }
  assert.deepEqual(calls,[],'No frame load may be started for invalid time');
  assert.equal(active.timeTarget,9.8,'B retains its last real physical timestamp');
  assert.equal(choose('B','0'),true,'Explicit OpenFOAM decimal zero is physical');
  assert.equal(active.timeTarget,0);
  assert.equal(other.timeTarget,9.8,'Selecting B may not modify C');
  assert.equal(choose(3,'0.0e0'),true,'C supports real scientific notation');
  assert.equal(other.timeTarget,0);
  assert.deepEqual(calls,['B','C'],'Only the selected view loads its own measured frame');
  linked=true;
  assert.equal(choose('B','9.8'),false,'Linked time mode blocks independent edits');
  assert.deepEqual(calls,['B','C']);
});

test('3D comparison labels are HTML-escaped if the host helper is unavailable or throws',()=>{
  const start=source.indexOf('function fcEsc(v){'),
    end=source.indexOf('function fcFmt(v)',start);
  assert(start>0&&end>start,'Production OpenFOAM label escaper missing');
  const make=host=>new Function('fvEsc',source.slice(start,end)+';return fcEsc;')(host);
  const hostile='<img src="x" onerror=\'alert(1)\'>&';
  const escaped='&lt;img src=&quot;x&quot; onerror=&#39;alert(1)&#39;&gt;&amp;';
  assert.equal(make(undefined)(hostile),escaped);
  assert.equal(make(()=>{throw new Error('no escaper')})(hostile),escaped);
  assert.equal(make(undefined)(null),'');
  assert.equal(make(v=>'SAFE:'+v)('<region>'),'SAFE:<region>',
    'An existing original host escaper remains authoritative');
});

test('3D compare ignores missing samples, malformed interpolation and invalid geometry',()=>{
  const interpolated=api.fcInterpolateValues([null,10],[0,20],.5);
  assert(Number.isNaN(interpolated[0]));near(interpolated[1],15);
  assert(Number.isNaN(api.fcInterpolateValues([1],[3],null)[0]));
  assert(Number.isNaN(api.fcDifferenceValues([null,10],[0,3])[0]));
  assert.equal(api.fcSharedRange({min:null,max:1},{min:2,max:3}).min,2);
  assert.equal(api.fcSymmetricDifferenceRange([null,3]).count,1);
  assert.equal(api.fcArrayEqualNumeric([null,1],[0,1]),false);
});


test('3D probe descriptors preserve only physically measured finite values, never false zero',()=>{
  const start=source.indexOf('function fcProbeDescriptors(){'),stop=source.indexOf('window.FoamLensFieldCompare=',start);
  assert(start>=0&&stop>start,'Missing production 3D probe descriptor');
  const actual=source.slice(start,stop);
  const coreStart=source.indexOf('function fcPhysicalNumber(value){'),coreEnd=source.indexOf('function fcCloseTime(',coreStart);
  assert(coreStart>=0&&coreEnd>coreStart,'Missing physical numeric validator');
  const numeric=new Function(source.slice(coreStart,coreEnd)+';return fcPhysicalNumber;')();
  const fn=new Function('window','fvState','fvCase','fcState','fcCase','fcExtraViews','fcExtraCase','fcPhysicalNumber',
    actual+';return fcProbeDescriptors;');
  const make=(primary,secondary)=>fn(
    {FoamLensFieldProbe:{getLast:()=>primary}}, {caseId:1,region:'metal',fieldName:'T'},
    ()=>({name:'B13'}),{enabled:true,caseId:2,region:'mold',fieldName:'T',probe:secondary},
    ()=>({name:'B13'}),[],()=>null,numeric)();
  assert.deepStrictEqual(make({point:[0,0,0],value:null},{point:[0,0,0],value:false}),[]);
  assert.deepStrictEqual(make({point:[null,0,0],value:3},{point:['',0,0],value:1}),[]);
  assert.deepStrictEqual(make({point:[0,0,0],value:2,geometryOnly:true},{point:[0,0,0],value:0,geometryOnly:true}),[]);
  const genuine=make({point:[0,0,0],value:0},{point:[0,0,0],value:'0'});
  assert.equal(genuine.length,2);
  assert.deepStrictEqual(genuine.map(x=>x.value),[0,0]);
});


test('3D compare uses measured primary physical time and refuses false t=0',()=>{
  const a=source.indexOf('function fcPhysicalNumber(value){'),b=source.indexOf('function fcCloseTime(',a);
  assert(a>=0&&b>a,'Missing production physical-number parser');
  const physical=new Function(source.slice(a,b)+';return fcPhysicalNumber;')();
  const start=source.indexOf('function fcPrimaryPhysicalTime(){'),end=source.indexOf('function fcEsc(',start);
  assert(start>=0&&end>start,'Missing primary physical time resolver');
  const getTime=time=>new Function('fvState','fcPhysicalNumber',
    source.slice(start,end)+';return fcPrimaryPhysicalTime;')({time},physical)();
  for(const v of [null,undefined,'',false,'  '])assert(Number.isNaN(getTime(v)),'Not measured: '+String(v));
  assert.strictEqual(getTime('0'),0);
  assert.strictEqual(getTime(9.8),9.8);
  const compare=source.slice(source.indexOf('async function fcRefreshFrame(){'),source.indexOf('function fcRefreshVisuals()',source.indexOf('async function fcRefreshFrame(){')));
  const extras=source.slice(source.indexOf('function fcExtraInvalidateFrame('),source.indexOf('async function fcRefreshExtras('));
  const swap=source.slice(source.indexOf('async function fcSwapPrimaryCompare(){'),source.indexOf('function fcVideoDescriptors()',source.indexOf('async function fcSwapPrimaryCompare(){')));
  assert(compare.includes('target=fcIndependentTimeTarget(fcState)'),
    'Compare B must use measured A time when linked or its own real catalog time when independent');
  assert(extras.includes('target=fcIndependentTimeTarget(state)'),
    'C/D must use measured A time when linked or their own real catalog time when independent');
  assert(source.includes("if(fcTimesLinked())return fcPrimaryPhysicalTime()"),
    'Linked mode must still reject missing A time; no false measured t=0');
  assert(swap.includes('if(!Number.isFinite(targetTime))return false'),'Case swapping must not load invented t=0');
  assert(swap.includes('.map(fcPhysicalNumber).filter(Number.isFinite)'),'Swapped time lists must discard missing samples');
});

test('3D extra view invalidates stale mesh/probes/export state when primary clock is missing',()=>{
  const start=source.indexOf('function fcExtraInvalidateFrame('),end=source.indexOf('async function fcRefreshExtras(',start);
  assert(start>=0&&end>start,'Missing production stale-frame invalidation path');
  const make=new Function('fcState','fcExtraRefreshSelectors','fcExtraCase','fcExtraRegion',
    'fcExtraField','fcExtraComponent','fcIndependentTimeTarget','fcExtraDom','fcUi','fcExtraUpdateLabel','fcPhysicalRelease',
    source.slice(start,end)+';return fcExtraRefreshFrame;');
  const status={textContent:''},state={id:3,seq:5,renderer:{surfaceCount:4,edgeCount:8,probeCount:1},
    mesh:{id:12},fieldValues:[1000],range:{valid:true},fieldParsed:{},time:0,sync:{exact:true},
    probe:{point:[0,0,0]}};
  let physicalReleases=0;
  const refresh=make({enabled:true},()=>{},()=>({}),()=>'metal',()=>'T',()=>'value',
    ()=>NaN,()=>status,x=>x,()=>{},()=>{physicalReleases++});
  refresh(state); // deterministic synchronous validation happens before the first await
  assert.equal(state.seq,6,'An earlier in-flight frame must be invalidated');
  assert.equal(physicalReleases,1,'Invalidating stale frames must also free B/C/D physical region layers');
  assert.equal(state.mesh,null);
  assert.equal(state.fieldValues,null);
  assert.equal(state.probe,null);
  assert.equal(state.sync,null);
  assert(Number.isNaN(state.time));
  assert.equal(state.renderer.surfaceCount,0);
  assert.equal(state.renderer.probeCount,0);
  assert(status.textContent.includes('measured physical time'));
});

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

test('Granada 3D absolute differences handle 300,000 real-size cell values without JS argument overflow',()=>{
  // Math.max(...largeArray) exceeded Node/V8's argument/stack limit and
  // crashed the difference viewport on large polyMesh field arrays.
  const n=300000,values=new Float64Array(n).fill(2);
  values[n-1]=17;
  const r=api.fcDifferenceRange(values,'absolute');
  assert.equal(r.valid,true);
  assert.equal(r.min,0);
  assert.equal(r.max,17);
  assert.equal(r.count,n);
  near(r.mean,2+15/n);
});

test('Granada 3D difference statistics consume large fields in one streaming pass',()=>{
  // The reduction works on an iterable as well as arrays/typed arrays;
  // it cannot depend on expanding or cloning the full original field.
  const measured={
    *[Symbol.iterator](){yield 2;yield -8;yield NaN;yield 4;yield null},
    map(){throw new Error('Do not copy original scientific field arrays')},
    filter(){throw new Error('Do not copy original scientific field arrays')}
  };
  const signed=api.fcDifferenceRange(measured,'signed');
  assert.equal(signed.valid,true);
  assert.equal(signed.min,-8);assert.equal(signed.max,8);
  assert.equal(signed.count,3);near(signed.mean,-2/3);
  const sym=api.fcSymmetricDifferenceRange(measured);
  assert.deepEqual(sym,signed);
  const absolute=api.fcDifferenceRange(measured,'absolute');
  assert.equal(absolute.min,0);assert.equal(absolute.max,4);
  assert.equal(absolute.count,3);near(absolute.mean,-2/3);
});

test('Granada 3D differences reject incomplete cell arrays instead of presenting a partial A-B',()=>{
  assert.deepEqual(api.fcDifferenceValues([11,22,33],[4,5],'signed'),[],
    'missing comparison cell must not truncate original source values');
  assert.deepEqual(api.fcDifferenceValues([11,22],[4,5,6],'absolute'),[],
    'extra source cell must not be silently discarded');
  assert.deepEqual(api.fcDifferenceValues(null,[1],'signed'),[],
    'missing original source is not a zero-length measured result');

  // Exercise the original runtime controller, not just a standalone helper.
  const start=source.indexOf('function fcUpdateDifference(');
  const end=source.indexOf('async function fcLoadVectorAtTime(',start);
  assert(start>=0&&end>start,'original 3D difference controller exists');
  const status={textContent:'',classList:{remove:()=>{}}},calls={issues:[],layout:0};
  const state={enabled:true,time:1,fieldStorage:'volume',
    differenceValues:[999],differenceRange:{valid:true,min:999,max:999}};
  const host={
    fcState:state,
    document:{getElementById:id=>id==='fcDifference'?{checked:true}:
      id==='fcDifferenceViewport'?{classList:{toggle:()=>{}}}:
      id==='fcDifferenceStatus'?status:null},
    fcTimesLinked:()=>true,
    fvState:{time:1,fieldStorage:'volume'},
    fcSameQuantity:()=>true,
    fcMeshesEquivalent:(a,b)=>({ok:true,reason:'equivalent'}),
    fcUi:en=>en,
    flSetIssue:(element,message)=>{calls.issues.push(String(message))},
    fcUpdateLayout:()=>calls.layout++,
    fcDifferenceValues:api.fcDifferenceValues,
    fcDifferenceRange:api.fcDifferenceRange,
    fvCreateRenderer:()=>{throw new Error('No GPU upload permitted for invalid scientific fields')},
    fcRenderDifference:()=>{throw new Error('No invalid frame may be rendered')}
  };
  const update=new Function('deps',
    'const {'+Object.keys(host).join(',')+'}=deps;'+
    source.slice(start,end)+';return fcUpdateDifference;')(host);
  const mesh={cellCount:3},mismatch=[10,20],sameSize=[2,3,4];
  update(mesh,mesh,mismatch,sameSize);
  assert.equal(state.differenceValues,null);
  assert.equal(state.differenceRange,null);
  assert(calls.issues.at(-1).includes('cell field lengths'),
    'mismatched source field must report the physical mesh cell-count problem');
  assert.equal(calls.layout,1,'invalid comparison layout must be reset');
  state.differenceValues=[999];state.differenceRange={valid:true};
  update(mesh,mesh,[null,null,null],[2,3,4]);
  assert.equal(state.differenceValues,null,'all-nonfinite A-B must erase stale 3D data');
  assert.equal(state.differenceRange,null,'all-nonfinite A-B must erase stale range');
  assert.equal(calls.issues.at(-1),'no-compatible-values');
  assert.equal(calls.layout,2);
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
    'fcField','fcComponent','View 2 field','Each viewport may use its own case, region, field and component',
    'fcSameQuantity','different field/component/association/dimensions; difference unavailable',
    "const eligible=(cases||[]).filter(c=>fvCaseViewAvailable(c))"
  ])assert(source.includes(token),'Missing independent-view token: '+token);
});

test('secondary and extra 3D case selectors preserve the case explicitly chosen by the user',()=>{
  assert(source.includes("document.getElementById('fcCase').addEventListener('change',()=>{fcStopIndependentPlayback('B');fcRefreshSelectors(true)"),
    'View B must stop prior playback while preserving the user-selected case.');
  assert(!source.includes("document.getElementById('fcCase').addEventListener('change',()=>{fcRefreshSelectors(false)"),
    'View 2 still resets its Case selector to the primary case.');
  assert(source.includes("fcExtraRefreshSelectors(state,true);fcExtraRefreshFrame(state,true)"),
    'Views 3/4 must preserve the chosen case while avoiding a duplicate dependent refresh.');
  assert(source.includes("if(!selectorsReady)fcExtraRefreshSelectors(state,true)"),
    'Uncontrolled playback must still refresh real case/region/field selectors.');
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
    'fcExtraRefreshFrame','fcExtraRender','fcRefreshExtras','repeat(2,minmax(350px,1fr))'
  ])assert(source.includes(token),'Missing multi-view token: '+token);
});

test('Granada comparison grid keeps A/B beside one another and C/D in aligned rows',()=>{
  const styles=source.slice(source.indexOf('style.textContent='),source.indexOf('document.head.appendChild(style)'));
  assert(styles.includes('.fieldViewPanel.fcCompareMode .fcViewGrid{grid-template-columns:repeat(2,minmax(350px,1fr));overflow-x:auto'),
    'A narrow Windows workspace must horizontally scroll a two-column source grid instead of stacking B below A');
  assert(styles.includes('align-items:stretch;align-content:start'),
    'Pair rows must stretch equally, not stair-step panels');
  assert(!styles.includes('grid-template-columns:1fr}.fcComposedViewport'),
    'The original 980px media rule must not collapse compared views to a single column');
  assert(styles.includes('.fcViewToolbar{display:flex;align-items:flex-start;align-content:flex-start;flex-wrap:wrap;gap:8px;min-width:0;height:154px;min-height:154px;max-height:154px'),
    'All viewports need an equal-height, independently scrollable toolbar to align canvas tops');
  assert(styles.includes('overflow-y:auto;overflow-x:hidden;scrollbar-gutter:stable'),
    'Expanded region/source controls must not change the height or alignment of a sibling canvas');
  assert(styles.includes('.fcViewSourceDetails>summary{')&&
    styles.includes('overflow-wrap:anywhere;white-space:normal'),
    'The actual case/field summary must wrap, not clip hidden text');
  assert(!styles.includes('.fcViewSourceDetails>summary{cursor:pointer;list-style:revert;box-sizing:border-box;min-height:32px'),
    'The old tiny source selector is no longer acceptable');
  assert(source.includes('class="fcViewSourceDetails"><summary>'),
    'A new A/B/C/D viewport should default to compact source controls');
  assert(!source.includes('class="fcViewSourceDetails" open><summary>'),
    'Expanded case selectors must be opt-in instead of occupying unequal vertical space');
  for(const size of ['.fcViewTimeControls button{flex:0 0 36px;min-height:36px;min-width:36px',
    '.fcViewCopyFrom select{box-sizing:border-box;min-width:0;max-width:100%;width:100%;height:36px',
    '.fcViewportCameraChoices button,.fcViewportProjectionChoices button{cursor:pointer;min-height:36px'])
      assert(styles.includes(size),'A/ B / C / D controls must have readable touch/desktop targets: '+size);
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

test('compare badges distinguish unresolved physical frames from real exact, nearest and interpolated times',()=>{
  const start=source.indexOf('function fcSyncText(sync){'),stop=source.indexOf('const fcState=',start);
  assert(start>0&&stop>start,'Source-owned temporal badge handler must exist');
  const actual=source.slice(start,stop);
  const english=new Function('fcUi','fcFmt',core+actual+';return fcSyncText;')((en,es)=>en,String);
  const spanish=new Function('fcUi','fcFmt',core+actual+';return fcSyncText;')((en,es)=>es,String);
  const noExact=api.fcResolveTime([0,1],0.25,'exact');
  const outOfRange=api.fcResolveTime([0,1],2,'interpolate');
  assert.equal(noExact.ok,false);assert.equal(outOfRange.ok,false);
  assert.equal(english(null),'—');
  assert.equal(english(noExact),'Not synchronized');
  assert.equal(spanish(outOfRange),'Sin sincronizar');
  assert.equal(english({ok:true,time:null,exact:true}),'Not synchronized');
  assert.equal(english({ok:true,time:0.5,interpolated:true,lowerTime:null,upperTime:1}),'Not synchronized');
  assert.equal(english(api.fcResolveTime([0,1],0,'exact')),'Exact');
  assert(english(api.fcResolveTime([0,1],0.6,'nearest')).startsWith('Nearest'));
  assert(english(api.fcResolveTime([0,1],0.25,'interpolate')).startsWith('Interpolated'));
});

test('atomic staged multiregion source frames never clear a visible viewport during I/O',()=>{
  const start=source.indexOf('async function fcPhysicalLoad(state,c,primary,time,redraw){');
  const end=source.indexOf('function fcPhysicalRenderLayers(',start);
  assert(start>=0&&end>start,'Original secondary-region frame loader missing');
  const loader=source.slice(start,end);
  assert(loader.includes('const nextLayers=new Map(),nextErrors=new Map()'),
    'Secondary regions must stage the complete next physical frame');
  assert(loader.includes('if(!current()){discard();return}'),
    'Superseded original OpenFOAM reads must discard private GPU resources');
  assert(loader.includes('scene.layers=nextLayers;scene.errors=nextErrors;'),
    'Region buffers and errors must be committed together');
  assert(loader.indexOf('scene.layers=nextLayers')>loader.indexOf('await fvLoadFrameData('),
    'Visible regions may not be replaced before real field reads resolve');
  assert(!loader.includes('scene.layers.clear()'),
    'Never blank the visible 3D regions at the beginning of an asynchronous timestep');
  assert(!loader.includes('scene.layers.set(region,layer);redraw()'),
    'Never render incomplete successive metal/mold regions');
  assert.equal((loader.match(/\bredraw\(\)/g)||[]).length,1,
    'One complete physical snapshot should trigger one redraw');
  const renderStart=source.indexOf('function fcRender(exportSize=null){');
  assert(renderStart>0,'Original View B renderer missing');
  assert(source.slice(renderStart,renderStart+200).includes('fcState._fcFrameHold||fcState._fcGroupHold'),
    'Linked playback must preserve the last complete B canvas while loading');
});

console.log('FoamLens 3D difference field regression suite passed: '+passed.length+' checks.');
for(const name of passed)console.log('  ✓ '+name);

assert(source.includes('function fcComposeViewport('),'Multi-view scene/caption ownership missing');
assert(source.includes('.fcStatsCells{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))'),
  'Comparison scientific statistics must be legible in narrow viewports');
