'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(__dirname,'..','src','FoamLensDesktop','frontend','v14-zz-field-workspace.js'),'utf8');
new Function(source);
const slice=(start,end)=>{
  const a=source.indexOf(start),b=source.indexOf(end,a);
  assert(a>=0&&b>a,'Missing actual source-owned history boundary: '+start);
  return source.slice(a,b)
};
const groupSource=slice('function fwFieldTsGroupToken(','function fwFieldTsMetric(');
const keySource=slice('function fwFieldTsCanonical(','// G54: each physical-time sample');
const evidenceSource=slice('function fwFieldTsHeaderDimensions(','function fwFieldTsSource(slot)');
const timingSource=slice('function fwPhysicalTime(','function fwAdoptFieldNode(');
const time=new Function('window',timingSource+';return fwPhysicalTimes')({FoamLensRegionScene:null});
const B={id:'B3',name:'B3 metal'},C={id:'C3',name:'C3 mold'},cases=[B,C];
const entries={
  'B3|metal':[
    {name:'T',storage:'volume',kind:'scalar',times:[0,.1]},
    {name:'T',storage:'surface',kind:'scalar',times:[0,.2]},
    {name:'T',storage:'point',kind:'scalar',times:[0,.3]},
    {name:'U',storage:'volume',kind:'vector',times:[0,.5]},
    {name:'unphysical',storage:'volume',kind:'scalar',times:[false,null,'']}
  ],
  'C3|mold':[
    {name:'T',storage:'surface',kind:'scalar',times:[0,.4]},
    {name:'U',storage:'volume',kind:'vector',times:[0,.4]}
  ]
};
const fieldGroups=(c,region)=>entries[c.id+'|'+region]||[];
const escaped=v=>String(v).replace(/&/g,'&amp;').replace(/"/g,'&quot;')
  .replace(/</g,'&lt;').replace(/>/g,'&gt;');
const decode=v=>String(v).replace(/&quot;/g,'"').replace(/&amp;/g,'&')
  .replace(/&lt;/g,'<').replace(/&gt;/g,'>');
function select(){
  let value='',html='',options=[];
  return {
    disabled:false,
    get innerHTML(){return html},
    set innerHTML(v){
      html=String(v);
      options=[...html.matchAll(/<option value="([^"]*)"/g)].map(m=>decode(m[1]));
      value=options[0]||''
    },
    get value(){return value},
    set value(v){value=options.includes(String(v))?String(v):''},
    get options(){return [...options]}
  }
}
const nodes={fwTsCase1:select(),fwTsRegion1:select(),fwTsField1:select(),
  fwTsComponent1:select(),fwTsSource1:{value:'global'},fwTsEnable2:{checked:false}};
const doc={getElementById:id=>nodes[id]||null};
const sourceFns=new Function(
  'fwFieldTsCase','fwFieldTsRegion','document','fvFieldGroups','fwPhysicalTimes',
  'fwUi','pmUnitFromDimensions','fwFieldTsStatLabel','fvAssociationLabel',
  groupSource+keySource+evidenceSource+
  ';return {token:fwFieldTsGroupToken,group:fwFieldTsGroup,canonical:fwFieldTsCanonical,'+
  'key:fwFieldTsSourceKey,field:fwFieldTsField,evidence:fwFieldTsHistoryEvidence}')(
    slot=>cases.find(c=>c.id===nodes['fwTsCase'+slot].value),
    slot=>nodes['fwTsRegion'+slot].value,
    doc,fieldGroups,time,(en)=>en,()=> 'K',s=>s==='mean'?'Mean':s,
    storage=>({volume:'Cells',surface:'Faces',point:'Points'})[storage]||'Unknown'
  );
const refreshCode=slice('function fwRefreshFieldTsSlot(','function fwRefreshFieldTsControls(');
const fvState={caseId:'B3',region:'metal',fieldName:'T',fieldStorage:'surface',component:'value'};
const fcState={enabled:false};
const refresh=new Function(
  'document','fwFieldTsSource','fwRefreshProbeTsSlot','fwRefreshProfileTsSlot',
  'fwFieldTsReadyCases','fwFieldTsCase','fvReadyRegions','fvFieldGroups','fwPhysicalTimes',
  'fvEsc','fwUi','fvAssociationLabel','fwFieldTsGroupToken','fvFieldComponents',
  'fvState','fcState',
  refreshCode+';return fwRefreshFieldTsSlot')(
    doc,()=> 'global',()=>{},()=>{},()=>cases,
    slot=>cases.find(c=>c.id===nodes['fwTsCase'+slot].value),
    c=>c.id==='B3'?['metal']:['mold'],
    fieldGroups,time,escaped,en=>en,s=>({volume:'Cells',surface:'Faces',point:'Points'})[s],
    sourceFns.token,g=>g.kind==='vector'?
      [{v:'x',t:'X'},{v:'y',t:'Y'},{v:'magnitude',t:'Magnitude'}]:
      [{v:'value',t:'Value'}],
    fvState,fcState
  );
refresh(1,false,'initial');
assert.equal(nodes.fwTsCase1.value,'B3');
assert.equal(nodes.fwTsRegion1.value,'metal');
assert.equal(nodes.fwTsField1.options.length,4,
  'T volume, T surface, T point and U must all appear as selectable real sources');
assert(nodes.fwTsField1.innerHTML.includes('Faces'),
  'Original OpenFOAM association must be visible to the user');
const volume=entries['B3|metal'][0],face=entries['B3|metal'][1],point=entries['B3|metal'][2];
assert.equal(nodes.fwTsField1.value,sourceFns.token(face),
  'Preferred 3D face-associated T must be retained instead of silently selecting cell T');
assert.equal(sourceFns.group(1),face,'Actual source-group resolver must honor selected Faces T');
nodes.fwTsField1.value=sourceFns.token(point);
refresh(1,true,'field');
assert.equal(nodes.fwTsField1.value,sourceFns.token(point),
  'Manual point-associated field selection must survive dependent refresh');
assert.equal(sourceFns.group(1),point);
nodes.fwTsField1.value=sourceFns.token(volume);
assert.equal(sourceFns.group(1),volume);
nodes.fwTsField1.value=sourceFns.token(face);
assert.equal(sourceFns.group(1),face);
assert.notEqual(sourceFns.token(volume),sourceFns.token(face));
assert.notEqual(sourceFns.token(face),sourceFns.token(point));
assert.notEqual(sourceFns.key(B,'metal',volume,'value','mean'),
  sourceFns.key(B,'metal',face,'value','mean'),
  'Cell vs face history may not share one deduplication identity');
assert.notEqual(sourceFns.key(B,'metal',face,'value','mean'),
  sourceFns.key(B,'metal',point,'value','mean'));
assert.notEqual(sourceFns.canonical(volume,'value','mean'),
  sourceFns.canonical(face,'value','mean'),
  'Data variable selectors must distinguish T on cells from T on faces');
assert.notEqual(sourceFns.canonical(face,'value','mean'),
  sourceFns.canonical(point,'value','mean'));
const faceField=sourceFns.field(face,'value','mean',{dimensions:'[0 0 0 1 0 0 0]'});
assert(faceField.display.includes('Faces')&&faceField.display.includes('T'),
  'Original association is displayed on the plotted curve');
assert(faceField.quantity.includes('surface'),'Quantity identity must keep source storage');
const evidence=sourceFns.evidence(B,'metal',face,'value','global',[0,.2],[0,.2],
  '[0 0 0 1 0 0 0]','mean');
assert.equal(evidence.storage,'surface');
assert.equal(evidence.fieldKind,'scalar');
assert.equal(evidence.originalTimeCount,2);
assert.equal(evidence.temporalInterpolation,false);
assert.deepEqual(time([null,false,'','0','0.0',0,.2,.2]),[0,.2],
  'Source selection must not invent t=0 for missing physical-time labels');

// The Field workspace may display B3 while Time Series should allow case C3
// to be selected explicitly in the same source slot and stay there.
nodes.fwTsCase1.value='C3';
refresh(1,false,'case');
assert.equal(nodes.fwTsCase1.value,'C3',
  'Manual selection C3 MUST NOT snap back to B3 from the independent 3D view');
assert.equal(nodes.fwTsRegion1.value,'mold');
assert.equal(nodes.fwTsField1.options.length,2);
assert.equal(sourceFns.group(1),entries['C3|mold'][0]);
assert.notEqual(sourceFns.key(B,'metal',face,'value','mean'),
  sourceFns.key(C,'mold',entries['C3|mold'][0],'value','mean'),
  'Different imported cases/regions must retain independent source identities');
const weird={name:'T|"[a,b]"',storage:'surface',kind:'scalar',times:[0]};
assert.deepEqual(JSON.parse(sourceFns.token(weird)),[weird.name,'surface','scalar'],
  'Hostile OpenFOAM names and delimiters must remain lossless data, not syntax');
console.log('PASS: original Time Series association-aware selectors, explicit case switching, source keys, units, physical times and evidence');
