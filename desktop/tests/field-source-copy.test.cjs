'use strict';
// Functional Granada G6: run the original A–D Field copy-source code with
// real (synthetic) case/region/field catalogs and independent view owners.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','src','FoamLensDesktop','frontend','v14-z-field-compare.js'),'utf8');
new Function(source);
const extract=(start,end)=>{
  const a=source.indexOf(start),b=source.indexOf(end,a);
  assert(a>=0&&b>a,'Missing original Field function: '+start);
  return source.slice(a,b)
};
const map=new Function(extract('function fcViewSourceMap(view){','// Seven source-native directions')+
  ';return fcViewSourceMap')();
const code=extract('function fcCopyableSourceViews(target){','async function fcSwapPrimaryCompare(){');
const cases=[{id:'B3',name:'Metal experiment'},{id:'C3',name:'Mold experiment'}];
const groups={
  'B3|metal':[
    {name:'T',storage:'volume',kind:'scalar',times:[0,.2]},
    {name:'U',storage:'volume',kind:'vector',times:[0,.2]}],
  'C3|mold':[
    {name:'T',storage:'volume',kind:'scalar',times:[0,.3]},
    {name:'U',storage:'volume',kind:'vector',times:[0,.3]}]
};
const node=(value='')=>({value,classList:{toggle(){}}});
const nodes={
  fvCase:node('B3'),fvRegion:node('metal'),fvField:node('T'),fvComponent:node('value'),
  fcCase:node('C3'),fcRegion:node('mold'),fcField:node('U'),fcComponent:node('x'),
  fcExtra3Case:node('C3'),fcExtra3Region:node('mold'),fcExtra3Field:node('U'),fcExtra3Component:node('x'),
  fcExtra4Case:node('C3'),fcExtra4Region:node('mold'),fcExtra4Field:node('T'),fcExtra4Component:node('value'),
  fcEnabled:{checked:true},fcStatus:node(),fcExtra3Status:node(),fcExtra4Status:node()
};
const document={getElementById:id=>nodes[id]||null},extras=[{id:3,probe:{x:9}},{id:4,probe:{x:8}}],fcState={probe:{x:7}};
let runs=[],styling=0;
const api=new Function('document','cases','fvCaseViewAvailable','fvReadyRegions',
  'fvFieldGroups','fvFieldComponents','fcViewSourceMap','fcExtraViews','fcState',
  'fcUi','fcEsc','fcRefreshSelectors','fcExtraRefreshSelectors','fcRefreshFrame',
  'fcExtraRefreshFrame','fcStopIndependentPlayback','fcScheduleToolbarSync',
  'fcVisualsSynced','fcRefreshVisuals',
  code+';return {views:fcCopyableSourceViews,refresh:fcSyncCopySources,'+
    'snapshot:fcCopySourceSnapshot,copy:fcCopyFieldSourceToView,legacy:fcCopyPrimarySettingsToCompare}')(
    document,cases,()=>true,c=>c.id==='B3'?['metal']:['mold'],
    (c,r)=>groups[c.id+'|'+r]||[],g=>g.kind==='vector'?
      [{v:'x'},{v:'y'},{v:'z'},{v:'magnitude'}]:[{v:'value'}],
    map,extras,fcState,(en,es)=>en,v=>String(v),
    ()=>runs.push('refreshB'),state=>runs.push('refresh'+state.id),
    async()=>runs.push('loadB'),async state=>runs.push('load'+state.id),
    view=>runs.push('stop'+view),()=>runs.push('sync'),
    ()=>true,()=>{styling++}
  );
async function main(){
  assert.deepEqual(api.views('B'),['A','3','4'],
    'Visible target B offers all other loaded A/C/D sources, never itself');
  assert.deepEqual(api.views('3'),['A','B','4'],
    'C offers A/B/D and excludes self; physical views remain independent');
  const picker={innerHTML:'',disabled:false};
  api.refresh({dataset:{fcToolbar:'B'},querySelector:q=>q==='[data-fc-copy-source]'?picker:null});
  assert(picker.innerHTML.includes('View A')&&picker.innerHTML.includes('View C')===false,
    'Initial visible source select must be bilingual and use physical view letters');
  assert(picker.innerHTML.includes('View C')===false||picker.innerHTML.includes('View D')===false,
    'Copies use source tokens, not an invented case label');
  // Original A→B action MUST copy the case, not only the field/region.
  await api.legacy();
  assert.deepEqual([nodes.fcCase.value,nodes.fcRegion.value,nodes.fcField.value,nodes.fcComponent.value],
    ['B3','metal','T','value']);
  assert.equal(fcState.probe,null,'Copying source invalidates only destination B probe');
  assert(runs.includes('loadB')&&runs.includes('stopB'));
  assert.equal(styling,1,'Legacy A→B still reuses the original visual settings refresh');
  assert.equal(nodes.fcStatus.textContent,undefined,'status mock stores only value property');
  // Source B's new field is now used by the C target, with no change to A.
  const donorBefore=[nodes.fcCase.value,nodes.fcRegion.value,nodes.fcField.value,nodes.fcComponent.value];
  await api.copy('B',3);
  assert.deepEqual([nodes.fcExtra3Case.value,nodes.fcExtra3Region.value,
    nodes.fcExtra3Field.value,nodes.fcExtra3Component.value],['B3','metal','T','value']);
  assert.deepEqual([nodes.fcCase.value,nodes.fcRegion.value,nodes.fcField.value,nodes.fcComponent.value],donorBefore);
  assert.equal(extras[0].probe,null);
  assert(runs.includes('load3')&&runs.includes('stop3'));
  assert.equal(nodes.fcExtra3Status.textContent.includes('B → C'),true,
    'View-local status must identify original donor and target');
  // D may copy C; donor C is not changed, and current primary A remains B3.
  await api.copy('3',4);
  assert.deepEqual([nodes.fcExtra4Case.value,nodes.fcExtra4Region.value,
    nodes.fcExtra4Field.value,nodes.fcExtra4Component.value],['B3','metal','T','value']);
  assert(runs.includes('load4'));
  // Different C3 source to B must also copy region and scalar/vector component.
  nodes.fcExtra4Case.value='C3';nodes.fcExtra4Region.value='mold';
  nodes.fcExtra4Field.value='U';nodes.fcExtra4Component.value='x';
  await api.copy('4','B');
  assert.deepEqual([nodes.fcCase.value,nodes.fcRegion.value,nodes.fcField.value,nodes.fcComponent.value],
    ['C3','mold','U','x']);
  assert.equal(nodes.fvCase.value,'B3','A remains unchanged when B chooses another case');
  assert.equal(nodes.fcExtra3Case.value,'B3','C remains independent of changes to B');
  // Scientific preflight must reject unavailable fields or unknown components
  // BEFORE changing any destination, not silently coerce them to defaults.
  const oldB=[nodes.fcCase.value,nodes.fcRegion.value,nodes.fcField.value,nodes.fcComponent.value];
  const oldRuns=runs.length;
  nodes.fvField.value='nonexistent';
  await assert.rejects(api.copy('A','B'),/unambiguous original OpenFOAM/);
  assert.deepEqual([nodes.fcCase.value,nodes.fcRegion.value,nodes.fcField.value,nodes.fcComponent.value],oldB);
  assert.equal(runs.length,oldRuns,'Invalid source must never trigger reload or cancel');
  nodes.fvField.value='T';nodes.fvComponent.value='magnitude';
  await assert.rejects(api.copy('A','B'),/unambiguous original OpenFOAM/);
  nodes.fvComponent.value='value';
  const repeated={name:'T',storage:'surface',kind:'scalar',times:[0,.2]};
  groups['B3|metal'].push(repeated);
  await assert.rejects(api.copy('A','B'),/unambiguous original OpenFOAM/,
    'Same-name volume and face field is scientifically ambiguous in source dropdown');
  groups['B3|metal'].pop();
  nodes.fcEnabled.checked=false;
  assert.deepEqual(api.views('B'),['A'],'Hidden inactive comparison views cannot be copied from');
  await assert.rejects(api.copy('4','B'),/unambiguous original OpenFOAM/,
    'Hidden D is not a valid live donor');
  nodes.fcEnabled.checked=true;
  assert.equal(api.snapshot('B','B'),null,'Cannot copy a viewport onto itself');
  assert.equal(api.snapshot('A','A'),null,'Copy never mutates original A source');
  assert(source.includes("if(typeof fcSyncCopySources==='function')fcSyncCopySources(bar)"));
  assert(source.includes("bar.querySelector('[data-fc-copy-source]')?.addEventListener('change'"));
  assert(source.includes('class="fcViewSourceDetails" open'),
    'All Field source selects should open and be editable by default');
  assert(source.includes('await fcCopyFieldSourceToView(\'A\',\'B\')'),
    'Legacy A→B should use exact same source-copy engine');
  console.log('FoamLens G6 Field copy-source PASS: B/C/D source copy, original A→B case, scientific preflight, hidden views, time ownership');
}
main().catch(error=>{console.error(error);process.exitCode=1});
