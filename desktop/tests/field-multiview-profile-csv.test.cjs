'use strict';
// Granada G9: export the REAL original Field A–D line-profile snapshots,
// with one physical source/time/coordinate per CSV row and no silent fallback.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const production=fs.readFileSync(path.join(__dirname,'..','src','FoamLensDesktop','frontend',
  'v14-zz-field-workspace.js'),'utf8');
const extract=(a,b)=>{
  const i=production.indexOf(a),j=production.indexOf(b,i+a.length);
  assert(i>=0&&j>i,'Missing original Field source: '+a);
  return production.slice(i,j)
};
new Function(production);
const label=()=>({value:'',disabled:false,textContent:'',setAttribute(){}});
const selectors={},cases=[
  {id:'B3',name:'=HYPERLINK("https://evil.invalid","B3, iron")'},
  {id:'C3',name:'C3, Mold\nOriginal «sand»'}
];
for(const [id,value] of Object.entries({
  fvCase:'B3',fvRegion:'metal',fvField:'T',fvComponent:'value',
  fcCase:'C3',fcRegion:'mold',fcField:'T',fcComponent:'value',
  fcExtra3Case:'B3',fcExtra3Region:'metal',fcExtra3Field:'U',fcExtra3Component:'x',
  fcExtra4Case:'C3',fcExtra4Region:'mold',fcExtra4Field:'T',fcExtra4Component:'value'
}))selectors[id]={value};
selectors.fcEnabled={checked:true};
selectors.fwCompare3DProfiles=label();
selectors.fwExport3DProfileCsv=label();
selectors.fw3DProfileView={options:['A','B','C','D'].map(value=>({value}))};
const document={getElementById:id=>selectors[id]||null};
const T='[0 0 0 1 0 0 0]',U='[0 1 -1 0 0 0 0]';
const mk=(caseId,region,fieldName,component,storage,time,dimensions)=>({
  caseId,region,fieldName,component,storage,fieldStorage:storage,
  time,mesh:{caseId},fieldValues:[time],fieldParsed:{dimensions}
});
const fvState=mk('B3','metal','T','value','volume',.2,T),
  fcState=mk('C3','mold','T','value','volume',.3,T),
  fcExtraViews=[
    {id:3,...mk('B3','metal','U','x','volume',.4,U)},
    {id:4,...mk('C3','mold','T','value','surface',.5,T)}
  ];
const state={active:true,layout:'split',compareProfiles:true,
  compareProfileViews:['A','B','C','D']},
  line={a:[0,0,0],b:[.02,0,.01],seriesIds:new Map()};
const series=[],logs=[],errors=[];
const infoArgs={
  document,fvState,fcState,fcExtraViews,
  fvCase:()=>cases[0],fcCase:()=>cases[1],
  fcExtraCase:v=>cases.find(c=>c.id===selectors['fcExtra'+v.id+'Case'].value),
  fwPhysicalTime:x=>typeof x==='number'&&Number.isFinite(x)?x:NaN,
  pmUnitFromDimensions:d=>d===T?'K':d===U?'m/s':'-'
};
const field=new Function(...Object.keys(infoArgs),
  extract("function fwCurrent3DProfileField(view='A'){",'function fwToggle3DProfilePick(){')+
  ';return fwCurrent3DProfileField')(...Object.values(infoArgs));
const infos=['A','B','C','D'].map(v=>field(v));
assert(infos.every(Boolean));
const dist=Math.hypot(.02,0,.01);
const sampleTimes=[.2,.3,.4,.5];
for(let k=0;k<infos.length;k++){
  const v='ABCD'[k],info=infos[k],t=[0,dist/2,dist],y=[1+k,2+k,3+k];
  const s={id:k+100,derivedKind:'field3d_line_profile',profileSourceView:v,
    caseId:info.caseObj.id,caseName:info.caseObj.name,region:info.region,
    profileOriginalField:info.name,profileOriginalComponent:info.component,
    profileOriginalStorage:info.storage,field:info.field,profileCoordUnit:'m',
    profileAxis:'s',profilePointA:[...line.a],profilePointB:[...line.b],
    profileTime:sampleTimes[k],profileSampleCount:30,t,y};
  line.seriesIds.set(v,s.id);series.push(s)
}
let captured=null,okStatus='',badStatus=false;
const exporter=new Function('fwState','fwLineProfileState','document','series',
  'fwCurrent3DProfileField','fwPhysicalTime','fwUi','downloadText',
  'fw3DProfileStatus',
  extract('function fw3DProfileCsvCell(value){',
    'function fwBuild3DLineProfile({select=true,viewOverride=null}={}){')+
    ';return {build:fw3DProfileCsvBuild,export:fwExport3DProfileCsv,cell:fw3DProfileCsvCell}')(
    state,line,document,series,field,infoArgs.fwPhysicalTime,(en)=>en,
    (...args)=>{captured=args},(msg,bad=false)=>{okStatus=msg;badStatus=bad}
  );
const copy=()=>series.map(s=>JSON.stringify(s));
const before=copy();
const result=exporter.export();
assert(result&&result.rows===12&&result.views===4);
assert.equal(result.name,'FoamLens_Field_original_profiles_A-B-C-D.csv');
assert(captured&&captured[0]===result.name);
assert.equal(captured[1],result.csv);
assert.equal(captured[2],'text/csv;charset=utf-8');
assert(!badStatus);
assert.equal(copy().join('\n'),before.join('\n'),'Export does not mutate imported or derived scientific curves');
assert(result.csv.startsWith('\uFEFFsource_view,case_id,case_name'));
assert(result.csv.endsWith('\r\n'));
assert(result.csv.includes('"\'=HYPERLINK('),
  'Excel CSV formula injection must be neutralized without losing the original case name');
assert(result.csv.includes('"C3, Mold\nOriginal «sand»"'),
  'Quoted CSV must preserve punctuation, accents and original newlines');
assert(!result.csv.includes('NaN')&&!result.csv.includes('Infinity'));

// Parse the actual RFC-style CSV with embedded quotes/newlines (not naive split).
function rows(csv){
  const data=csv.replace(/^\uFEFF/,'');let i=0,value='',row=[],out=[],quoted=false;
  while(i<data.length){
    const c=data[i++];
    if(quoted){
      if(c==='"'&&data[i]==='"'){value+='"';i++}
      else if(c==='"')quoted=false;
      else value+=c;
    }else if(c==='"')quoted=true;
    else if(c===','){row.push(value);value=''}
    else if(c==='\r'&&data[i]==='\n'){i++;row.push(value);out.push(row);row=[];value=''}
    else value+=c
  }
  assert.equal(quoted,false,'Export must always close CSV quotes');
  assert.equal(row.length,0,'Export must end on a complete row boundary');
  return out
}
const data=rows(result.csv),keys=data.shift();
assert.equal(keys.length,24,'Original provenance schema has 24 explicit columns');
assert.equal(data.length,12);
assert(data.every(row=>row.length===keys.length),'Every CSV row must preserve the exact header width');
const col=name=>keys.indexOf(name);
for(const name of ['source_view','case_id','case_name','region','field',
  'component','field_storage','openfoam_dimensions','value_unit',
  'physical_time_s','distance_along_line_m','query_x_m','query_y_m',
  'query_z_m','raw_field_value','line_a_x_m','line_b_x_m',
  'requested_line_samples','valid_line_samples'])
  assert(col(name)>=0,'Missing physical source metadata column '+name);
const byView=view=>data.filter(row=>row[col('source_view')]===view);
assert.deepEqual(['A','B','C','D'].map(view=>byView(view).length),[3,3,3,3]);
assert.deepEqual(['A','B','C','D'].map(view=>Number(byView(view)[0][col('physical_time_s')])),
  sampleTimes,'CSV must NOT use one global clock for four source measurements');
assert.deepEqual(['A','B','C','D'].map(view=>byView(view)[0][col('value_unit')]),
  ['K','K','m/s','K']);
assert.deepEqual(['A','B','C','D'].map(view=>byView(view)[0][col('field_storage')]),
  ['volume','volume','volume','surface']);
assert.deepEqual(['A','B','C','D'].map(view=>byView(view)[0][col('region')]),
  ['metal','mold','metal','mold']);
assert.deepEqual(['A','B','C','D'].map(view=>byView(view)[0][col('field')]),
  ['T','T','U','T']);
assert.deepEqual(['A','B','C','D'].map(view=>byView(view)[0][col('component')]),
  ['value','value','x','value']);
assert.equal(byView('A')[0][col('case_name')],
  "'"+cases[0].name,'Unsafe formula is rendered as escaped text, never executable formula');
const half=byView('D')[1];
assert(Math.abs(Number(half[col('distance_along_line_m')])-dist/2)<1e-12);
assert(Math.abs(Number(half[col('query_x_m')])-.01)<1e-12);
assert(Math.abs(Number(half[col('query_y_m')])-0)<1e-12);
assert(Math.abs(Number(half[col('query_z_m')])-.005)<1e-12);
assert.equal(Number(half[col('raw_field_value')]),5);
assert.equal(half[col('requested_line_samples')],'30');
assert.equal(half[col('valid_line_samples')],'3');
assert.equal(exporter.cell('  =SUM(1+1)'),'"\'  =SUM(1+1)"');
assert.equal(exporter.cell('normal,"name"'),'"normal,""name"""');
assert.equal(exporter.cell(-2.5),'-2.5','Original negative numeric measurements remain usable numbers');
assert.throws(()=>exporter.cell(Infinity),/nonfinite/);

function fails(reason,change,restore){
  const previous=captured,before=copy();
  change();
  assert.throws(exporter.build(),reason);
  assert.equal(exporter.export(),null,'Failed preflight must never download an incomplete CSV');
  assert.equal(captured,previous,'Rejected export must not mutate last successful download');
  assert.equal(copy().join('\n'),before.join('\n'));
  assert(badStatus&&okStatus.includes('CSV export blocked'));
  restore()
}
fails(/Run Compare/,()=>{state.compareProfiles=false},()=>{state.compareProfiles=true});
fails(/inventory changed/,()=>{selectors.fw3DProfileView.options=[{value:'A'},{value:'B'}]},
  ()=>{selectors.fw3DProfileView.options=['A','B','C','D'].map(value=>({value}))});
fails(/stale original Field/,()=>{selectors.fcField.value='U'},()=>{selectors.fcField.value='T'});
fails(/field\/time\/line changed/,()=>{fcState.time=.35},()=>{fcState.time=.3});
fails(/field\/time\/line changed/,()=>{series[0].profilePointB=[.03,0,.01]},
  ()=>{series[0].profilePointB=[...line.b]});
fails(/field\/time\/line changed/,()=>{series[2].profileOriginalStorage='point'},
  ()=>{series[2].profileOriginalStorage='volume'});
fails(/profile samples/,()=>{series[3].y=[NaN,2,3]},()=>{series[3].y=[4,5,6]});
fails(/coordinates or values/,()=>{series[1].t[1]=Infinity},
  ()=>{series[1].t[1]=dist/2});
fails(/coordinates or values/,()=>{series[1].t[2]=series[1].t[1]},
  ()=>{series[1].t[2]=dist});
fails(/Missing or stale/,()=>{line.seriesIds.delete('C')},()=>{line.seriesIds.set('C',102)});
fails(/field\/time\/line changed/,()=>{fvState.fieldParsed={dimensions:U}},
  ()=>{fvState.fieldParsed={dimensions:T}});

// Deleting the comparison never exports old curves just because they are saved.
state.compareProfileViews=[];assert.equal(exporter.export(),null);
assert(result.csv===captured[1],'Earlier valid export bytes remain exact and deterministic');
assert(production.includes('id="fwExport3DProfileCsv"')&&
  production.includes("addEventListener('click',fwExport3DProfileCsv)"));
assert(production.includes('export3DProfileCsv:fwExport3DProfileCsv'),
  'Direct native Field toolbar and public workspace command must share one implementation');
assert(production.includes('profileOriginalField:info.name')&&
  production.includes('profileOriginalComponent:info.component'));
console.log('PASS G9: original multiview Field CSV 4 cases/views, 12 physical rows, XYZ, independent times/units, safe Excel text, 12 negative preflights, no Data/global state modification');
