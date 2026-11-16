'use strict';
// Granada Field G7: exercise the ORIGINAL Field A→B line profile sampler
// against four independent view owners with different original physical times.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const text=fs.readFileSync(path.join(__dirname,'..','src','FoamLensDesktop','frontend','v14-zz-field-workspace.js'),'utf8');
new Function(text);
const start=text.indexOf('function fwRefresh3DProfileSourceViews(){'),
  end=text.indexOf('function fwHandle3DProfileClick(',start);
assert(start>0&&end>start,'Real A–D 3D profile functions must exist');
const original=text.slice(start,end),caseB={id:'B3',name:'B3 iron'},
  caseC={id:'C3',name:'C3 mold'},cases=[caseB,caseC];
const nodes={},select=(value='')=>{
  let markup='',options=[],current=value;
  return{
    get innerHTML(){return markup},
    set innerHTML(html){markup=html;options=[...html.matchAll(/<option value="([^"]*)"/g)].map(m=>m[1]);current=options[0]||''},
    get value(){return current},
    set value(v){current=String(v)},
    get options(){return options}
  }
};
for(const [name,value] of Object.entries({
  fvCase:'B3',fvRegion:'metal',fvField:'T',fvComponent:'value',
  fcCase:'C3',fcRegion:'mold',fcField:'T',fcComponent:'value',
  fcExtra3Case:'B3',fcExtra3Region:'metal',fcExtra3Field:'U',fcExtra3Component:'x',
  fcExtra4Case:'C3',fcExtra4Region:'mold',fcExtra4Field:'T',fcExtra4Component:'value'
}))nodes[name]={value};
nodes.fcEnabled={checked:true};nodes.fw3DProfileView=select('A');
nodes.fw3DProfileSamples={value:'20'};
nodes.profileSet={value:''};nodes.profileVariable={value:''};nodes.profileLine={value:''};
nodes.fw3DProfileOverlay=null;
const doc={getElementById:id=>nodes[id]||null};
const T='[0 0 0 1 0 0 0]',U='[0 1 -1 0 0 0 0]';
const make=(id,region,name,component,storage,time,tag,dimensions)=>({
  caseId:id,region,fieldName:name,component,fieldStorage:storage,storage,
  time,mesh:{tag},fieldValues:[tag==='A'?700:tag==='B'?300:tag==='C'?2:310],
  fieldParsed:{dimensions}
});
const fvState=make('B3','metal','T','value','volume',.2,'A',T),
  fcState={...make('C3','mold','T','value','volume',.3,'B',T),enabled:true},
  fcExtraViews=[
    {id:3,...make('B3','metal','U','x','volume',.4,'C',U)},
    {id:4,...make('C3','mold','T','value','surface',.5,'D',T)}
  ];
const state={enabled:false,a:[0,0,0],b:[.02,0,0],seriesId:null,seriesIds:new Map()},
  series=[];let status='',statusError=false,refreshes=0,nextId=1,auto=0;
const f=new Function(
  'fwLineProfileState','document','fcState','fcExtraViews','fvState','fvCase','fcCase','fcExtraCase',
  'fwUi','fwPhysicalTime','pmUnitFromDimensions','fwSampleFieldAtPoint','series','automaticSeriesColor',
  'fw3DProfileStatus','fvFmt','refreshDatasetControls','fwSetCompanion','refreshProfileSelectorsFromVariable',
  'refreshProfileTimes','renderList','updateMeta','draw','fwUpdateNavText','fwUpdate3DProfileOverlay','console',
  'nextId',original+';return{refresh:fwRefresh3DProfileSourceViews,field:fwCurrent3DProfileField,'+
    'build:fwBuild3DLineProfile,line:fwSet3DProfileLine,clear:fwClear3DProfile}')(
    state,doc,fcState,fcExtraViews,fvState,()=>caseB,
    ()=>cases.find(c=>c.id===nodes.fcCase.value),
    view=>cases.find(c=>c.id===nodes['fcExtra'+view.id+'Case'].value),
    en=>en,x=>typeof x==='number'&&Number.isFinite(x)?x:NaN,
    dimensions=>dimensions===U?'m/s':'K',
    (data,p)=>{
      if(p[0]<0||p[0]>.1)return{value:NaN,distance:NaN};
      return{value:Number(data.fieldValues[0]),distance:0}
    },series,()=> '#abcdef',(str,error=false)=>{status=str;statusError=error},
    v=>String(v),()=>{refreshes++},()=>{},()=>{},()=>{},()=>{},()=>{},()=>{},()=>{},console,nextId
  );
f.refresh();
assert.deepEqual(nodes.fw3DProfileView.options,['A','B','C','D'],
  'The original user-visible picker must offer every live A–D panel');
assert.equal(nodes.fw3DProfileView.value,'A');
const sample=(view)=>{nodes.fw3DProfileView.value=view;return f.build({select:false})};
const a=sample('A'),b=sample('B'),c=sample('C'),d=sample('D');
assert(a&&b&&c&&d,'Each independently loaded 3D source must produce original XYZ samples');
assert.deepEqual(series.map(x=>x.caseId),['B3','C3','B3','C3']);
assert.deepEqual(series.map(x=>x.profileSourceView),['A','B','C','D']);
assert.deepEqual(series.map(x=>x.profileTime),[.2,.3,.4,.5],
  'The profile must use each original SOURCE physical timestamp, never A time for every curve');
assert.deepEqual(series.map(x=>x.y[0]),[700,300,2,310],
  'No field values may leak from another view when cases/regions/components differ');
assert.deepEqual(series.map(x=>x.region),['metal','mold','metal','mold']);
assert.deepEqual(series.map(x=>x.profileOriginalStorage),['volume','volume','volume','surface']);
assert.equal(series.length,4,'Adding B/C/D profiles cannot overwrite the earlier A source curve');
assert(new Set(series.map(x=>x.id)).size===4,'Each source view retains its own series ID');
assert.deepEqual(series.map(x=>x.profilePointB),[[.02,0,0],[.02,0,0],[.02,0,0],[.02,0,0]]);
assert.equal(c.field.unit,'m/s');
assert.equal(b.field.unit,'K');
assert.equal(d.profileOriginalStorage,'surface');
assert(a.t[0]===0&&a.t.at(-1)===.02,'Samples use original world XYZ line in meters');
assert(status.includes('View D')&&status.includes('C3 mold'),'UI must disclose selected source and case');
assert.equal(statusError,false);

// Pending B case switch cannot silently relabel old C3 frame as B3 data.
const previous=series.map(q=>q.y[0]);nodes.fcCase.value='B3';
assert.equal(sample('B'),null,'A source with stale loaded Case ID must not be sampled');
assert.equal(statusError,true);
assert.deepEqual(series.map(q=>q.y[0]),previous,'Rejected source cannot overwrite existing verified curves');
nodes.fcCase.value='C3';
// Replacing line endpoints clears previous A/B/C/D comparisons.
const next=f.line([0,0,0],[.03,0,0],{select:false});
assert(next);
assert.equal(series.length,1,'Old XYZ line curves cannot be mixed with newly selected geometry');
assert.deepEqual(next.profilePointB,[.03,0,0]);
assert.equal(state.seriesIds.size,1);
f.clear(true);
assert.equal(series.length,0);
assert.equal(state.seriesIds.size,0);
assert.equal(state.a,null);assert.equal(state.b,null);
// With no comparison active only original A is available as profile source.
nodes.fcEnabled.checked=false;f.refresh();
assert.deepEqual(nodes.fw3DProfileView.options,['A']);
assert.equal(nodes.fw3DProfileView.value,'A');
assert(text.includes('id="fw3DProfileView"')&&text.includes('id="fwResample3DProfile"'));
assert(text.includes("fwBuild3DLineProfile({select:false})"));
console.log('Field G7 3D A–D profile source PASS: 4 independent real view frames, case/region/time/storage metadata, stale-case guard, XYZ line clear and resampling');
