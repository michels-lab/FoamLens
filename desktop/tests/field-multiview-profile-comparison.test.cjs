'use strict';
// Granada G8: actual Field A–D source snapshots + real chart selection code.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const dir=path.join(__dirname,'..','src','FoamLensDesktop','frontend');
const ws=fs.readFileSync(path.join(dir,'v14-zz-field-workspace.js'),'utf8'),
  chart=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const take=(s,a,b)=>{
  const x=s.indexOf(a),y=s.indexOf(b,x+a.length);
  assert(x>=0&&y>x,'Missing production source: '+a+' → '+b);
  return s.slice(x,y)
};
new Function(ws);
const cssClasses=[];
const control=(value='')=>({value,setAttribute(k,v){this[k]=v},classList:{toggle(){}}});
const profileSelect={
  _value:'A',options:[],_markup:'',
  get innerHTML(){return this._markup},
  set innerHTML(html){
    this._markup=html;
    this.options=[...html.matchAll(/<option value="([^"]*)"/g)].map(m=>({value:m[1]}));
    this._value=this.options[0]?.value||''
  },
  get value(){return this._value},set value(v){this._value=String(v)}
};
const nodes={
  fvCase:control('B3'),fvRegion:control('metal'),fvField:control('T'),fvComponent:control('value'),
  fcCase:control('C3'),fcRegion:control('mold'),fcField:control('T'),fcComponent:control('value'),
  fcExtra3Case:control('B3'),fcExtra3Region:control('metal'),fcExtra3Field:control('U'),fcExtra3Component:control('x'),
  fcExtra4Case:control('C3'),fcExtra4Region:control('mold'),fcExtra4Field:control('T'),fcExtra4Component:control('value'),
  fcEnabled:{checked:true},fw3DProfileView:profileSelect,fw3DProfileSamples:control('30'),
  fwCompare3DProfiles:control(),profileTime:control('99'),
  profileSet:control('unrelated Data set'),profileVariable:control('alpha1'),profileVariable2:control(''),
  profileLine:control('unrelated line')
};
const doc={getElementById:id=>nodes[id]||null};
const cases=[{id:'B3',name:'B3 iron'},{id:'C3',name:'C3 sand'}];
const T='[0 0 0 1 0 0 0]',U='[0 1 -1 0 0 0 0]',P='[1 -1 -2 0 0 0 0]';
const frame=(id,region,name,component,storage,time,tag,dimensions,value)=>({
  caseId:id,region,fieldName:name,component,storage,fieldStorage:storage,
  time,mesh:{tag},fieldValues:[value],fieldParsed:{dimensions}
});
const a=frame('B3','metal','T','value','volume',.2,'A',T,700),
  b=frame('C3','mold','T','value','volume',.3,'B',T,300),
  c={id:3,...frame('B3','metal','U','x','volume',.4,'C',U,2)},
  d={id:4,...frame('C3','mold','T','value','surface',.5,'D',T,310)},
  extras=[c,d];
const state={active:true,layout:'3d',compareProfiles:false},
  line={enabled:false,a:[0,0,0],b:[.02,0,0],seriesId:null,seriesIds:new Map()},
  series=[];let status='',error=false,redraw=0,refreshData=0,normalClockRestored=0;
let canSplit=true;
const ctx={
  fwLineProfileState:line,fwState:state,document:doc,fvState:a,fcState:b,fcExtraViews:extras,
  fvCase:()=>cases[0],fcCase:()=>cases.find(x=>x.id===nodes.fcCase.value),
  fcExtraCase:view=>cases.find(x=>x.id===nodes['fcExtra'+view.id+'Case'].value),
  fwUi:en=>en,fwPhysicalTime:x=>typeof x==='number'&&Number.isFinite(x)?x:NaN,
  pmUnitFromDimensions:dim=>dim===T?'K':dim===U?'m/s':dim===P?'Pa':'-',
  fwSampleFieldAtPoint:(sample,p)=>{
    if(p[0]<0||p[0]>.04||sample.mesh.tag==='OFF')return{value:NaN,distance:NaN};
    return{value:sample.fieldValues[0],distance:0}
  },
  series,automaticSeriesColor:()=> '#6688cc',
  fw3DProfileStatus:(message,bad=false)=>{status=message;error=bad},
  fvFmt:String,refreshDatasetControls:()=>{refreshData++},
  fwSetCompanion:()=>{},refreshProfileSelectorsFromVariable:()=>{},
  refreshProfileTimes:()=>{normalClockRestored++},renderList:()=>{redraw++},
  updateMeta:()=>{},draw:()=>{redraw++},fwUpdateNavText:()=>{},
  fwUpdate3DProfileOverlay:()=>{},fwToggleProfileCompanion:()=>{if(!canSplit)return false;state.layout='split';return true},
  console,nextId:1
};
const fn=new Function(...Object.keys(ctx),
  take(ws,'function fwRefresh3DProfileSourceViews(){','function fwHandle3DProfileClick(')+
  ';return {refresh:fwRefresh3DProfileSourceViews,compare:fwCompareAll3DProfiles,'+
  'exit:fwLeave3DProfileCompare,active:()=>fwState.compareProfiles,'+
  'includes:s=>s?.derivedKind==="field3d_line_profile"&&fwLineProfileState.seriesIds?.get(s.profileSourceView)===s.id,'+
  'key:fw3DProfileDimensionKey,build:fwBuild3DLineProfile}')(...Object.values(ctx));

fn.refresh();
assert.deepEqual(profileSelect.options.map(o=>o.value),['A','B','C','D']);
const untouched={set:nodes.profileSet.value,variable:nodes.profileVariable.value,time:nodes.profileTime.value};
assert(fn.compare(),'One action should build the complete four-view comparison');
assert.equal(state.layout,'split');
assert.equal(fn.active(),true);
assert.equal(nodes.fwCompare3DProfiles['aria-pressed'],'true');
assert.deepEqual(series.map(s=>s.profileSourceView),['A','B','C','D']);
assert.deepEqual(series.map(s=>s.profileTime),[.2,.3,.4,.5]);
assert.deepEqual(series.map(s=>s.y[0]),[700,300,2,310]);
assert.deepEqual(series.map(s=>s.caseId),['B3','C3','B3','C3']);
assert.deepEqual(series.map(s=>s.profileOriginalStorage),['volume','volume','volume','surface']);
assert.equal(new Set(series.map(s=>s.id)).size,4);
assert(series.every(s=>s.profilePointB[0]===.02&&s.profileCoordUnit==='m'));
assert(status.includes('A t=0.2 s')&&status.includes('D t=0.5 s'),
  'Status must disclose independent source times, not invent one global time');
assert(!series.some(s=>s.playbackAligned||s.interpolated),'Snapshot comparison never invents aligned times');
assert.deepEqual({set:nodes.profileSet.value,variable:nodes.profileVariable.value,time:nodes.profileTime.value},untouched,
  'Original Data Profile filters stay unmodified');
assert(redraw>0&&refreshData>0,'Real chart and its canonical dataset owner must redraw');
const ids=series.map(s=>s.id);
b.time=.35;b.fieldValues=[315];assert(fn.compare(),'Recompare same real sources should update');
assert.deepEqual(series.map(s=>s.id),ids,'Rerun must update each original curve rather than duplicate it');
assert.equal(series.find(s=>s.profileSourceView==='B').profileTime,.35);
assert.equal(series.find(s=>s.profileSourceView==='B').y[0],315);

// PRE-FLIGHT is atomic on a real missing/insufficient source: never update
// any previous comparison to misleading new timestamps if D cannot overlap.
const before=series.map(s=>({id:s.id,time:s.profileTime,y:s.y[0]}));
d.mesh={tag:'OFF'};b.time=.4;
assert.equal(fn.compare(),false,'A missing D source/geometry blocks all four updates');
assert(error&&/view D/i.test(status));
assert.deepEqual(series.map(s=>({id:s.id,time:s.profileTime,y:s.y[0]})),before);
d.mesh={tag:'D'};
nodes.fcField.value='wrong field';
assert.equal(fn.compare(),false,'Stale case-region-field selector is rejected before comparison');
assert.deepEqual(series.map(s=>s.profileTime),before.map(s=>s.time));
nodes.fcField.value='T';

// A third independent dimension cannot be drawn on the native TWO-Y-axis
// renderer without hiding a quantity or merging incompatible units.
c.fieldParsed={dimensions:P};assert.equal(fn.compare(),false);
assert(/two verified dimensions/.test(status));
assert.deepEqual(series.map(s=>s.profileTime),before.map(s=>s.time));
c.fieldParsed={dimensions:U};

// A failed split activation must not change measured source curves either.
fn.exit();const snapshot=series.map(s=>s.profileTime);
canSplit=false;
assert.equal(fn.compare(),false);
assert.deepEqual(series.map(s=>s.profileTime),snapshot);
canSplit=true;
assert.equal(fn.active(),false);
assert(normalClockRestored>=1,'Exiting the mode restores original Data time-selection semantics');
assert.equal(nodes.fwCompare3DProfiles['aria-pressed'],'false');

// The original Data chart MUST honor active Field scope ONLY for the generated
// A-D series. Test actual original chart predicates rather than mocks.
const graphApi=new Function('window','datasetTypeOf','profileTimeEqual','profileMatchesVariable','$',
  'activeAppMode','currentDataView','dataCompareState','activeContextCaseId','activeContextRegion',
  'seriesRegion','profilePlaybackCaseCount','profileSelectedVariables','profilePlaybackGroups',
  'series','profilePlaybackRenderSeries',
  take(chart,'function flFieldProfileCompareActive(){','function seriesIsVisible(s){')+
  take(chart,'function profilePlaybackUsesGlobalClock(){','function profilePlaybackCommonRange(){')+
  take(chart,'function seriesMatchesGlobalContext(s){','function refreshGlobalContext(){')+
  take(chart,'function currentViewSeries(){','function visibleCurrentSeries(){')+
  ';return {active:flFieldProfileCompareActive,matches:profileMatchesSelection,'+
  'context:seriesMatchesGlobalContext,clock:profilePlaybackUsesGlobalClock,series:currentViewSeries}'
)(
  {FoamLensFieldWorkspace:{profileCompareActive:()=>state.compareProfiles,profileCompareIncludes:fn.includes}},
  s=>s.datasetType,(x,y)=>Number(x)===Number(y),
  (field,first,second)=>[first,second].includes(field),
  id=>nodes[id]||control(),
  'field','profile',{active:false},999,'metal',s=>s.region,
  ()=>2,()=>['T','U'],()=>[series],series,[]
);
assert.equal(graphApi.active(),false);
assert.equal(graphApi.clock(),true,'Normal Data multiple-case playback clock still uses the original rule');
assert.equal(graphApi.context(series[0]),false,'Ordinary global case filter still excludes unrelated source');
state.compareProfiles=true;
assert.equal(graphApi.active(),true);
assert.equal(graphApi.clock(),false,'Field snapshot chart must never fabricate shared physical times');
assert(series.every(s=>graphApi.matches(s)&&graphApi.context(s)),
  'All four real independently timed source profiles must bypass unrelated Data filters');
assert.deepEqual(graphApi.series().map(s=>s.id),ids);
assert.equal(graphApi.matches({datasetType:'profile',id:1000,derivedKind:'unrelated'}),false,
  'Field compare must not leak unrelated imported or derived Profile data');
state.compareProfiles=false;
assert(!graphApi.matches(series[0]),'Exit must instantly restore the original Data filters');
const axis=new Function('currentDataView','flFieldProfileCompareActive','seriesRegion',
  'profileSelectedVariables','document','$','profileAxisPlan',
  take(chart,'function assignments(vis){','function niceTicks(')+';return assignments')(
  'profile',()=>state.compareProfiles,s=>s.region,()=>['T','U'],doc,id=>nodes[id]||control(),()=>null
);
state.compareProfiles=true;
const assigned=axis(series);
assert.deepEqual(series.map(s=>assigned.get(s.id)),['left','left','right','left'],
  'Original chart keeps measured T on the left and verified Ux on the right, including face T');
state.compareProfiles=false;
assert(ws.includes('id="fwCompare3DProfiles"')&&ws.includes('fwCompareAll3DProfiles()'),
  'The visible compare button must invoke the real original A–D source sampler');
assert(chart.includes("flFieldProfileCompareActive()")&&chart.includes("profileCompareIncludes?.(s)"),
  'The real native chart must expose the temporary source-owned compare mode');
console.log('Granada G8 Field multiview profile comparison PASS: one-click A-D, 4 times, 2 verified axes, chart scope, 3D source guards, failed-preflight atomicity, Data restoration');
