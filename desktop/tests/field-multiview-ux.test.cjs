'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const dir=path.join(__dirname,'..','src','FoamLensDesktop','frontend');
const source=fs.readFileSync(path.join(dir,'v14-z-field-compare.js'),'utf8');
const workspace=fs.readFileSync(path.join(dir,'v14-zz-field-workspace.js'),'utf8');
const ribbon=fs.readFileSync(path.join(dir,'v15-ribbon-ui.js'),'utf8');
for(const text of [source,workspace,ribbon])new Function(text);
const begin=source.indexOf('let fcDraggedView=null'),end=source.indexOf('function fcStatsMarkup(',begin);
assert(begin>0&&end>begin,'Production Field viewport controller missing');
const cameraA={distance:10},cameraB={distance:20},cameraC={distance:30};
const meshes=[
  {cellCount:1,boundsMin:[0,0,0],boundsMax:[1,1,1]},
  {cellCount:1,boundsMin:[10,10,10],boundsMax:[11,11,11]},
  {cellCount:1,boundsMin:[20,20,20],boundsMax:[22,22,22]}
];
const fvState={mesh:meshes[0],camera:cameraA};
const fcState={mesh:meshes[1],camera:cameraB};
const fcExtraViews=[{id:3,mesh:meshes[2],camera:cameraC}];
let linked=false,redraw={primary:0,secondary:0,extra:0,difference:0,layout:0};
const fits={all:0,a:0,b:0,c:0};
const api=new Function(
  'fvState','fcState','fcExtraViews','fcCamerasLinked','fcCameraFor',
  'fvRender','fcRender','fcRenderDifference','fcExtraRender','fcScheduleLayoutRender',
  'document','requestAnimationFrame','fcFitAllCameras','fvCameraFitCurrent','fcFitCameraState',
  source.slice(begin,end)+';return{fcViewSourceMap,fcZoomViewport,fcMoveViewport,fcFitViewport,fcVisibleViewportNeighbor};'
)(fvState,fcState,fcExtraViews,()=>linked,(state)=>state.camera,
  ()=>redraw.primary++,()=>redraw.secondary++,()=>redraw.difference++,()=>redraw.extra++,()=>redraw.layout++,
  {},()=>0,
  ()=>{fits.all++},()=>{fits.a++},(state,mesh)=>{
    assert(mesh===state.mesh,'Fit must use the selected view original mesh');
    state.camera.distance=state===fcState?111:222;
    if(state===fcState)fits.b++;else fits.c++;
  });
assert.deepStrictEqual(api.fcViewSourceMap('A'),{Case:'fvCase',Region:'fvRegion',Field:'fvField',Component:'fvComponent'});
assert.deepStrictEqual(api.fcViewSourceMap('B'),{Case:'fcCase',Region:'fcRegion',Field:'fcField',Component:'fcComponent'});
assert.deepStrictEqual(api.fcViewSourceMap(3),{Case:'fcExtra3Case',Region:'fcExtra3Region',Field:'fcExtra3Field',Component:'fcExtra3Component'});
assert.strictEqual(api.fcViewSourceMap('Δ'),null,'Difference field is not independently selectable');

// GRANADA Field A–D: real field catalogs can be indexed after the physical
// region toolbar is mounted. A source-option refresh must not require a change
// to the selected region/case/field, and vector fields must never retain the
// scalar-only 'value' component from a formerly empty region.
{
  const viewSource=fs.readFileSync(path.join(dir,'v14-field-view.js'),'utf8');
  const cvStart=viewSource.indexOf('function fvFieldComponents(group){');
  const cvEnd=viewSource.indexOf('// Field A/B/C/D and physical region overlays',cvStart);
  assert(cvStart>=0&&cvEnd>cvStart,'original field component catalog required');
  const fvFieldComponents=new Function('flUi',viewSource.slice(cvStart,cvEnd)+
    ';return fvFieldComponents')((en,es)=>en);
  const begin=source.indexOf('function fcPhysicalFor(state){');
  const end=source.indexOf('function fcPhysicalViewContext(view){',begin);
  assert(begin>=0&&end>begin,'actual region-choice owner and reconciliation missing');
  const groups=(c,region)=>c?.groups?.get(region)||[];
  const list=(c)=>c?.regions||[];
  const physical=new Function('fvRegionNames','fvFieldGroups','fvFieldComponents','fvRegionReleaseLayer',
    source.slice(begin,end)+';return {fcPhysicalFor,fcPhysicalChoiceList,fcReconcilePhysicalChoice};'
  )(list,groups,fvFieldComponents,()=>{});

  const caseB={id:'B3',regions:['metal','mold'],groups:new Map()};
  const state={fieldName:'U'};
  assert.deepStrictEqual(physical.fcPhysicalChoiceList(state,caseB,'metal'),['metal','mold']);
  const scene=physical.fcPhysicalFor(state),metal=scene.choices.get('metal'),mold=scene.choices.get('mold');
  assert.equal(metal.field,'','unindexed region cannot invent a field');
  assert.equal(scene.choices.size,2);
  caseB.groups.set('metal',[{name:'U',kind:'vector'},{name:'T',kind:'scalar'}]);
  caseB.groups.set('mold',[{name:'T',kind:'scalar'}]);
  physical.fcPhysicalChoiceList(state,caseB,'metal');
  assert.strictEqual(scene.choices.get('metal'),metal,'late source catalog updates original choice');
  assert.equal(metal.field,'U','preferred original field materializes after indexing');
  assert.equal(metal.component,'magnitude','valid vector component, not the impossible scalar value');
  assert.equal(mold.field,'T');assert.equal(mold.component,'value');

  metal.visible=false;metal.visibilityExplicit=true;metal.opacity=.25;metal.palette='turbo';metal.component='z';
  physical.fcPhysicalChoiceList(state,caseB,'metal');
  assert.equal(metal.component,'z','valid original user-selected vector component persists');
  assert.equal(metal.opacity,.25);assert.equal(metal.visible,false);assert.equal(metal.palette,'turbo');
  caseB.groups.set('metal',[{name:'T',kind:'scalar'}]);
  physical.fcPhysicalChoiceList(state,caseB,'metal');
  assert.equal(metal.field,'T','a disappearing catalog field must fall back to a real available one');
  assert.equal(metal.component,'value','scalar fallback rejects stale vector component z');
  assert.equal(metal.visible,false);assert.equal(metal.opacity,.25);assert.equal(metal.palette,'turbo');
  caseB.groups.set('metal',[]);
  physical.fcPhysicalChoiceList(state,caseB,'metal');
  assert.equal(metal.field,'T','empty source catalog must not fabricate replacement fields');
  assert.equal(physical.fcReconcilePhysicalChoice(metal,[],''),false);

  // A/B/C/D menus must refresh their real field and component OPTIONS even
  // while the selected field remains unchanged and its region stays visible.
  const caseMenu={id:'C3',regions:['metal'],groups:new Map([
    ['metal',[{name:'T',kind:'scalar'}]]
  ])};
  const stateC={id:3,fieldName:'T'};
  physical.fcPhysicalChoiceList(stateC,caseMenu,'metal');
  const choice=physical.fcPhysicalFor(stateC).choices.get('metal');
  choice.opacity=.7;choice.palette='turbo';
  const holder={dataset:{},renders:0,_html:'',querySelector:q=>q==='details'?{open:true,isConnected:true,addEventListener:()=>{}}:null,
    querySelectorAll:()=>[],
    get innerHTML(){return this._html},
    set innerHTML(value){this.renders++;this._html=value}};
  const bar={querySelector:q=>q==='[data-fc-regions]'?holder:null};
  const ctx={view:'3',c:caseMenu,primary:'metal',state:stateC,
    viewport:{querySelector:q=>q==='[data-fc-toolbar]'?bar:null}};
  // Minimal source-backed A/C scope. B and D call this same original function.
  const menuStart=source.indexOf('function fcPhysicalMenuExpanded(holder,count){');
  const menuEnd=source.indexOf('function fcPhysicalReload(ctx){',menuStart);
  assert(menuStart>=0&&menuEnd>menuStart,'original physical menu renderer missing');
  let locale='en';
  const menu=new Function('fcPhysicalViewContext','fvRegionNames','fcPhysicalChoiceList',
    'fvRegionChoice','fcPhysicalFor','fvFieldGroups','fvFieldComponents',
    'fcReconcilePhysicalChoice','document','fcVisualsSynced','fcUi','fcEsc',
    'fcPhysicalReload','fvRegionLoadFrame','fvRegionRefreshList','fvState',
    'fvRender','fcRender','fcExtraRender','fvRegionPalette',
    source.slice(menuStart,menuEnd)+';return fcPhysicalMenu;'
  )(()=>ctx,list,physical.fcPhysicalChoiceList,()=>choice,physical.fcPhysicalFor,groups,fvFieldComponents,
    physical.fcReconcilePhysicalChoice,{getElementById:id=>({value:id==='language'?locale:'U'}),documentElement:{lang:'en'}},()=>true,
    (en,es)=>locale==='es'?es:en,v=>String(v),()=>{},()=>Promise.resolve(),()=>{}, {time:0},()=>{},()=>{},()=>{},ch=>ch?.palette||'viridis');

  menu('3');
  assert.equal(holder.renders,1);
  assert(holder.innerHTML.includes('value="T"'),'only original T option is initially available');
  assert(!holder.innerHTML.includes('value="U"'));
  assert.equal(holder.dataset.fcMenuKey.length>0,true);
  menu('3');assert.equal(holder.renders,1,'unchanged catalog must not duplicate DOM/lose focus');
  // SAME C case, SAME selection T, but a newly indexed OpenFOAM U field.
  caseMenu.groups.set('metal',[{name:'T',kind:'scalar'},{name:'U',kind:'vector'}]);
  menu('3');
  assert.equal(holder.renders,2,'late catalog field must invalidate original menu render key');
  assert(holder.innerHTML.includes('value="U"'),'new genuine vector option is now selectable');
  assert.equal(choice.field,'T','late discovery cannot replace a still-valid T selection');
  caseMenu.groups.set('metal',[{name:'U',kind:'vector'}]);
  menu('3');
  assert.equal(choice.field,'U','removed field falls back to indexed vector');
  assert.equal(choice.component,'magnitude','stale scalar component must be corrected to magnitude');
  assert(holder.innerHTML.includes('value="magnitude" selected'),'vector component UI reflects original state');

  ctx.view='A';ctx.c=caseMenu;ctx.state={};ctx.primary='metal';
  const holderA={...holder,dataset:{},renders:0,_html:'',
    get innerHTML(){return this._html},
    set innerHTML(value){this.renders++;this._html=value}};
  ctx.viewport={querySelector:q=>q==='[data-fc-toolbar]'?
    {querySelector:selector=>selector==='[data-fc-regions]'?holderA:null}:null};
  choice.component='value';
  menu('A');
  assert.equal(choice.component,'magnitude','A uses same valid vector component contract');
  assert.equal(holderA.renders,1);
  assert(holderA.innerHTML.includes('value="magnitude" selected'));
  locale='es';menu('A');
  assert.equal(holderA.renders,2,'original physical menu must re-render on Spanish language change');
  assert(holderA.innerHTML.includes('Regiones físicas'),'Spanish labels follow the real locale');
  menu('A');assert.equal(holderA.renders,2,'same locale does not reset focused region options');
  assert(source.includes("fcUpdateLabels();fcScheduleToolbarSync()"),
    'real original language-change listener must resync physical A–D toolbars');
  console.log('Field physical region catalog PASS: late A–D fields, scalar/vector components, ES/EN and preserved physical controls.');
}



{
  // Reproducible pre-fix bug: Add C/D while Field DOM is not mounted
  // silently pushes two phantom views into the 4-view limit.
  const start=source.indexOf('function fcExtraAdd(){'),end=source.indexOf('async function fcCopyPrimarySettingsToCompare()',start);
  assert(start>=0&&end>start,'original Field add-view source required');
  const views=[],notMounted={getElementById:()=>null};
  const add=new Function('fcExtraViews','FC_MAX_TOTAL_VIEWS','document',
    source.slice(start,end)+';return fcExtraAdd;')(views,4,notMounted);
  assert.strictEqual(add(),false,'No grid or controls must reject a view creation');
  assert.strictEqual(add(),false,'Repeated premature clicks still must not consume C/D');
  assert.strictEqual(views.length,0,'No phantom C/D occupying available slots');
}


 
// Same-failure regression: the original runtime selector refresh referenced
// "toolbar" instead of the actual loop variable "bar". It threw ReferenceError
// before refreshing Physical regions in A/B/C/D. Check the real source function,
// not a string or a hardcoded mock implementation.
{
  const start=source.indexOf('function fcSyncToolbars(){');
  const stop=source.indexOf('function fcAddViewportToolbar(',start);
  assert(start>=0&&stop>start,'Original A–D toolbar refresh must exist');
  const views=['A','B','3','4','Δ'],menus=[];
  const sources=new Map(),bars=[];
  for(const view of views){
    const mirrorByKey=new Map();
    for(const key of ['Case','Region','Field','Component'])mirrorByKey.set(key,{
      innerHTML:'',value:'',disabled:true
    });
    bars.push({dataset:{fcToolbar:view},
      querySelector:selector=>{
        const match=selector.match(/^\[data-fc-bind="(Case|Region|Field|Component)"\]$/);
        return match?mirrorByKey.get(match[1]):null
      },mirrorByKey});
    const ids=api.fcViewSourceMap(view);
    if(!ids)continue;
    for(const [key,id] of Object.entries(ids))sources.set(id,{
      innerHTML:'<option value="'+view+'-'+key+'">'+view+' '+key+'</option>',
      value:view+'-'+key,options:[{value:view+'-'+key}],disabled:false
    });
  }
  // Unavailable source field disables its own view only; other views continue.
  sources.get('fcExtra4Field').disabled=true;
  const dom={getElementById:id=>id==='fcViewGrid'?
    {querySelectorAll:()=>bars}:sources.get(id)||null};
  const factory=new Function('document','fcViewSourceMap','fcPhysicalMenu',
    source.slice(start,stop)+';return fcSyncToolbars;');
  const refresh=factory(dom,api.fcViewSourceMap,view=>menus.push(view));
  assert.doesNotThrow(refresh,
    'A/B/C/D selector synchronization must never throw ReferenceError toolbar');
  assert.deepStrictEqual(menus,['A','B','3','4'],
    'Every independent real 3D view must refresh its own Physical regions');
  for(const bar of bars){
    const view=bar.dataset.fcToolbar;
    if(view==='Δ')continue;
    for(const key of ['Case','Region','Field','Component']){
      const mirror=bar.mirrorByKey.get(key);
      assert.strictEqual(mirror.value,view+'-'+key,
        'Viewport '+view+' must reflect only its own '+key+' source');
      assert.strictEqual(mirror.disabled,view==='4'&&key==='Field',
        'Unavailability must disable only the affected physical source');
    }
  }
  // The same source select can change after a case import; refresh must
  // propagate it without fabricating any options or mutating another case.
  sources.get('fcExtra3Field').innerHTML='<option value="C-new">C new</option>';
  sources.get('fcExtra3Field').value='C-new';
  refresh();
  assert.strictEqual(bars[2].mirrorByKey.get('Field').value,'C-new');
  assert.strictEqual(bars[1].mirrorByKey.get('Field').value,'B-Field');
  assert.deepStrictEqual(menus,['A','B','3','4','A','B','3','4']);
}

assert.strictEqual(api.fcZoomViewport('B',.8),true);
assert.strictEqual(cameraB.distance,16,'B zoom must adjust the independent B camera');
assert.strictEqual(cameraA.distance,10,'B zoom must not change A');
assert.strictEqual(api.fcZoomViewport(3,1.25),true);
assert.strictEqual(cameraC.distance,37.5,'C must zoom separately');
assert.strictEqual(cameraB.distance,16);
assert.strictEqual(api.fcZoomViewport('A',1.25),true);
assert.strictEqual(cameraA.distance,12.5);
assert.strictEqual(api.fcZoomViewport('missing',.8),false,'Missing view may not fabricate a camera');
assert.deepStrictEqual(redraw,{primary:1,secondary:1,extra:1,difference:1,layout:0});
linked=true;
assert.strictEqual(api.fcZoomViewport('B',.8),true);
assert.strictEqual(cameraA.distance,10,'Linked camera must deliberately zoom the shared camera');
assert.strictEqual(cameraB.distance,16,'Linked mode does not overwrite B saved camera state');
assert.strictEqual(redraw.primary,2);
const nodes=[{id:'a'},{id:'b'},{id:'c'}],order=[...nodes];
const grid={
  contains:x=>order.includes(x),
  insertBefore(item,before){
    const index=order.indexOf(item);if(index<0)throw Error('unknown node');
    order.splice(index,1);order.splice(before?order.indexOf(before):order.length,0,item)
  }
};
for(const node of nodes)Object.defineProperty(node,'nextSibling',{get(){return order[order.indexOf(node)+1]||null}});
assert.strictEqual(api.fcMoveViewport(grid,nodes[0],nodes[1],true),true);
assert.deepStrictEqual(order.map(x=>x.id),['b','a','c'],'drag reorder must retain identical existing renderer DOM nodes');
assert.strictEqual(api.fcMoveViewport(grid,nodes[0],nodes[0],false),false,'self-drop must do nothing');
assert.strictEqual(redraw.layout,1);
{
  const v=[{id:'A'},{id:'Δ'},{id:'B'},{id:'C'}];
  for(let i=0;i<v.length;i++){
    const me=v[i];
    me.classList={contains:key=>key==='fvViewport'||(key==='hidden'&&me.id==='Δ')};
    Object.defineProperty(me,'previousElementSibling',{get:()=>v[i-1]||null});
    Object.defineProperty(me,'nextElementSibling',{get:()=>v[i+1]||null});
  }
  assert.strictEqual(api.fcVisibleViewportNeighbor(v[0],'ArrowRight'),v[2],
    'ArrowRight must skip a hidden derived panel instead of moving into it');
  assert.strictEqual(api.fcVisibleViewportNeighbor(v[2],'ArrowLeft'),v[0]);
  assert.strictEqual(api.fcVisibleViewportNeighbor(v[3],'ArrowRight'),null);
  assert.strictEqual(api.fcVisibleViewportNeighbor(v[0],'Escape'),null,
    'Unrelated shortcuts must remain untouched');
}
// Per-view Fit: B and C use their own measured mesh and camera only while
// independent. Linked cameras explicitly request shared Fit All instead.
linked=false;
assert.strictEqual(api.fcFitViewport('B'),true);
assert.strictEqual(cameraB.distance,111);
assert.strictEqual(cameraC.distance,37.5);
assert.strictEqual(cameraA.distance,10);
assert.strictEqual(fits.b,1);
assert.strictEqual(api.fcFitViewport(3),true);
assert.strictEqual(cameraC.distance,222);
assert.strictEqual(cameraB.distance,111);
assert.strictEqual(cameraA.distance,10);
assert.strictEqual(fits.c,1);
assert.strictEqual(api.fcFitViewport('A'),true);
assert.strictEqual(fits.a,1);
linked=true;
assert.strictEqual(api.fcFitViewport('B'),true);
assert.strictEqual(fits.all,1);
assert.strictEqual(fits.b,1,'Linked mode must not claim to fit only B');
const savedMesh=fcExtraViews[0].mesh;
fcExtraViews[0].mesh=null;
assert.strictEqual(api.fcFitViewport(3),false,'Cannot fit a missing original mesh');
fcExtraViews[0].mesh={boundsMin:[0,NaN,0],boundsMax:[1,1,1]};
assert.strictEqual(api.fcFitViewport(3),false,'Cannot fit fabricated/nonfinite bounds');
fcExtraViews[0].mesh=savedMesh;

// Removing C while its original frame read is pending invalidates its epoch.
{
  const start=source.indexOf('function fcExtraRemove('),end=source.indexOf('function fcExtraAdd(){',start);
  assert(start>=0&&end>start);
  const live=[{id:3,seq:17}],removed=live[0],released=[];
  const remove=new Function('fcExtraViews','fcPhysicalRelease','fcExtraDom','fcUpdateLayout','fcScheduleToolbarSync',
    source.slice(start,end)+';return fcExtraRemove;')(
    live,(state)=>released.push(state.id),()=>null,()=>{},()=>{});
  assert.strictEqual(remove(3),true);
  assert.strictEqual(live.length,0);
  assert.strictEqual(removed.seq,18,'Pending asynchronous read must be invalidated on removal');
  assert.strictEqual(released[0],3);
  assert.strictEqual(remove(3),false,'Repeated click cannot reuse already deleted view');
}
for(const fragment of [
  "fcAddViewportToolbar(primary,'A')","fcAddViewportToolbar(second,'B')","fcAddViewportToolbar(viewport,id)",
  "fcScheduleToolbarSync()","source.dispatchEvent(new Event('change',{bubbles:true}))",
  "e.dataTransfer?.setData('text/plain',viewport.id)","fcMoveViewport(viewport.parentElement,fcDraggedView,viewport",
  "data-fc-zoom=","data-fc-fit=","fcFitViewport(", "fcViewToolbar","fcViewPicker","fcViewZoom",
  "FC_MAX_TOTAL_VIEWS=4","if(oldCase&&eligible.some(c=>String(c.id)===String(oldCase)))"
])assert(source.includes(fragment),'Missing production multi-view mechanism: '+fragment);
for(const fragment of [
  'id="fwAdd3DViewVisible"','id="fwImport3DCase"','id="fwLinkCamerasVisible"',
  "document.getElementById('fwImport3DCase')?.addEventListener('click',()=>document.getElementById('addFolder')?.click())",
  "document.getElementById('fwAdd3DViewVisible')?.addEventListener('click',fwAdd3DView)",
  "const enabled=document.getElementById('fcEnabled')","const added=fcExtraAdd();if(added)fwComparisonExplicitlyRequested();fwUpdateViewCount()",
  'document.querySelector(\'#fcViewport [data-fc-bind="Case"]\')'
])assert(workspace.includes(fragment),'Missing permanent Field entry point: '+fragment);
for(const fragment of [
  '#flRibbonPanel-field.active{flex-wrap:wrap!important',
  '.flRibbonTimeGroup .flRibbonActions{display:flex!important;flex-wrap:wrap!important',
  'fwTimeTransport{box-sizing:border-box!important',
  'flRibbonInstallChromeMeasurement()'
])assert(ribbon.includes(fragment),'Ribbon can still overlap at compact widths: '+fragment);

{
  // Exercise the actual C/D selector production function with multiple
  // original OpenFOAM catalog entries, not a duplicated toy implementation.
  // Every physical-time frame previously reparsed all four <select> trees.
  const start=source.indexOf('function fcExtraSetOptionMarkup(');
  const end=source.indexOf('async function fcExtraRefreshFrame(',start);
  assert(start>=0&&end>start,'Original C/D selector refresh and option-reuse owner required');
  const selector=(initial='')=>{
    let html='',value=initial,writes=0;
    const el={
      get innerHTML(){return html},
      set innerHTML(next){
        writes++;html=String(next);
        const choices=[...html.matchAll(/<option value="([^"]*)"/g)].map(match=>match[1]);
        if(!choices.includes(value))value=choices[0]||'';
      },
      get value(){return value},
      set value(next){value=String(next)},
      get writes(){return writes}
    };
    return el
  };
  const selects={Case:selector(),Region:selector(),Field:selector(),Component:selector()};
  const cases=[
    {id:'B3',name:'B3',regions:['metal','mold'],groups:{
      metal:[{name:'T',kind:'scalar',storage:'volume'},
        {name:'alpha1',kind:'scalar',storage:'volume'}],
      mold:[{name:'T',kind:'scalar',storage:'volume'}]}},
    {id:'C3',name:'C3',regions:['metal'],groups:{
      metal:[{name:'U',kind:'vector',storage:'volume'}]}}
  ];
  const doc={getElementById:id=>({fvCase:{value:'B3'},fvRegion:{value:'metal'},
    fvField:{value:'T'},fvComponent:{value:'value'}})[id]||null};
  const state={id:3},stats={labels:0,toolbar:0};
  const factory=new Function('cases','fcExtraDom','fvCaseViewAvailable','fcEsc',
    'document','fcExtraCase','fvReadyRegions','fcUi','fvFieldGroups',
    'fvAssociationLabel','fvFieldComponents','fcExtraUpdateLabel','fcScheduleToolbarSync',
    source.slice(start,end)+';return{fcExtraRefreshSelectors,fcExtraSetOptionMarkup};');
  const api=factory(cases,(id,suffix)=>id===3?selects[suffix]:null,()=>true,
    String,doc,()=>cases.find(c=>String(c.id)===selects.Case.value),
    c=>c?.regions||[],en=>en,(c,region)=>c?.groups?.[region]||[],
    storage=>storage,group=>group?.kind==='vector'
      ?[{v:'x',t:'X'},{v:'y',t:'Y'},{v:'z',t:'Z'}]
      :[{v:'value',t:'Value'}],
    ()=>stats.labels++,()=>stats.toolbar++);
  api.fcExtraRefreshSelectors(state,true);
  assert.deepStrictEqual(Object.fromEntries(Object.entries(selects).map(([k,v])=>[k,v.writes])),
    {Case:1,Region:1,Field:1,Component:1},
    'Initial C/D controls must mount the real original options once');
  for(let frame=0;frame<128;frame++)api.fcExtraRefreshSelectors(state,true);
  assert.deepStrictEqual(Object.fromEntries(Object.entries(selects).map(([k,v])=>[k,v.writes])),
    {Case:1,Region:1,Field:1,Component:1},
    '128 time frames must not replace unchanged source-backed option DOM nodes');
  assert.equal(state.caseId,'B3');assert.equal(state.region,'metal');
  assert.equal(state.fieldName,'T');assert.equal(state.component,'value');
  selects.Case.value='C3';api.fcExtraRefreshSelectors(state,true);
  assert.equal(state.caseId,'C3');assert.equal(state.fieldName,'U');
  assert.equal(state.component,'x');
  assert.equal(selects.Case.writes,1,'Selecting C3 does not rebuild unchanged case choices');
  assert.equal(selects.Region.writes,2,'New region catalog must rebuild');
  assert.equal(selects.Field.writes,2,'New source field catalog must rebuild');
  assert.equal(selects.Component.writes,2,'New vector components must rebuild');
  cases[1].name='C3 updated';
  api.fcExtraRefreshSelectors(state,true);
  assert.equal(selects.Case.writes,2,'Imported catalog label changes cannot be cached away');
  cases[1].groups.metal.push({name:'T',kind:'scalar',storage:'volume'});
  api.fcExtraRefreshSelectors(state,true);
  assert.equal(selects.Field.writes,3,'New real fields in same case must become selectable');
  api.fcExtraRefreshSelectors(state,false);
  assert.equal(selects.Case.writes,3,'Explicit non-preserving refresh must still replace case options');
  assert.equal(selects.Region.writes,3);
  assert.equal(selects.Field.writes,4);
  assert.equal(selects.Component.writes,3);
  assert(source.includes("fcExtraRefreshFrame(state,true)"),
    'Real change/add handlers must avoid a redundant second selector refresh');
  assert(source.includes("if(!selectorsReady)fcExtraRefreshSelectors(state,true)"),
    'Unrelated playback routes must retain their source-refresh fallback');
}


{
  // Execute production GPU upload logic, not a mirrored test implementation.
  // C/D previously triangulated and re-uploaded the *same* polyMesh every
  // timestep although its scientific field values changed independently.
  const start=source.indexOf('function fcExtraUpload(state,data){');
  const end=source.indexOf('function fcExtraUpdateLabel(',start);
  assert(start>=0&&end>start,'Original GPU upload function unavailable');
  const invalidStart=source.indexOf('function fcExtraInvalidateFrame(state,message){');
  const invalidEnd=source.indexOf('async function fcExtraRefreshFrame(',invalidStart);
  assert(invalidStart>=0&&invalidEnd>invalidStart,'Original invalidation function unavailable');
  const writes={},counts={surfaceBuild:0,faceBuild:0,render:0,legend:0,stats:0,release:0};
  const meshA={id:'B3-metal',surfaceTriangles:[0,1,2],points:[0,0,0,1,0,0,0,1,0]};
  const meshB={id:'C3-metal',surfaceTriangles:[0,1,2],points:[0,0,0,2,0,0,0,2,0]};
  const canvas={};
  const renderer=()=>({gl:{DYNAMIC_DRAW:35048},surfacePos:null,edgePos:null,edgeColor:null,surfaceColor:null,faceFieldPos:null,faceFieldColor:null});
  const helpers={
    fcExtraDom:(id,suffix)=>suffix==='Canvas'?canvas:{textContent:''},
    fvCreateRenderer:()=>renderer(),
    fvBuildSurfaceBuffers:mesh=>{
      counts.surfaceBuild++;
      return{surfacePositions:new Float32Array([0,0,0,1,0,0,0,1,0]),
        edgePositions:new Float32Array([0,0,0,1,0,0])}
    },
    fcVisualFor:()=>({palette:'viridis',slice:false,iso:false}),
    fvUploadBuffer:(r,key,data)=>{
      writes[key]=(writes[key]||0)+1;
      r[key]={length:data.length,serial:writes[key]}
    },
    fvConstantColors:(n)=>new Float32Array(n*3),
    fvPointSurfaceColors:()=>new Float32Array(9),
    fvBuildInternalFaceBuffers:mesh=>{
      counts.faceBuild++;
      return{positions:new Float32Array([0,0,0,1,0,0,0,1,0]),triangleFaces:[0]}
    },
    fvInternalFaceColors:(_,values)=>new Float32Array([values[0],0,0]),
    fvSurfaceColors:(_,values)=>new Float32Array([values[0],0,0]),
    fcUpdateViewportLegend:()=>counts.legend++,
    fcExtraRender:()=>counts.render++,
    fcUpdateStatsGrid:()=>counts.stats++,
    document:{getElementById:()=>null}
  };
  const upload=new Function('h',
    'const {'+Object.keys(helpers).join(',')+'}=h;'+source.slice(start,end)+';return fcExtraUpload;')(helpers);
  const state={id:3,renderer:null,geometryUpload:null,fieldName:'T',component:'value'};
  const data=(mesh,storage,value)=>({mesh,storage,fieldValues:[value],parsed:{dimensions:'K'},
    range:{valid:true,min:0,max:500}});
  for(let t=0;t<128;t++)upload(state,data(meshA,'volume',t));
  assert.equal(counts.surfaceBuild,1,'128 source frames on one polyMesh must triangulate exactly once');
  assert.equal(writes.surfacePos,1,'128 frames must upload static surface positions once');
  assert.equal(writes.edgePos,1,'128 frames must upload static edge positions once');
  assert.equal(writes.edgeColor,1,'128 frames must upload static edge colors once');
  assert.equal(writes.surfaceColor,128,'Scientific colors must still change every measured frame');
  assert.equal(state.fieldValues[0],127,'Latest physical field data must be retained');
  assert.equal(counts.render,128,'Every physical timestep still triggers 3D redraw');
  assert.equal(counts.stats,128,'Every field timestep still updates statistics');
  const originalRenderer=state.renderer;
  for(let t=0;t<24;t++)upload(state,data(meshA,'surface',t));
  assert.equal(counts.surfaceBuild,1,'Surface-associated data must reuse same mesh');
  assert.equal(counts.faceBuild,1,'Same internal-face geometry must be built once');
  assert.equal(writes.faceFieldPos,1,'Internal face GPU positions stay uploaded across frames');
  assert.equal(writes.faceFieldColor,24,'Surface-associated measured colors must be updated');
  assert.equal(writes.surfaceColor,129,'Gray surface scaffold should upload only once');
  upload(state,data(meshA,'point',77));
  upload(state,data(meshA,'surface',99));
  assert.equal(writes.surfaceColor,131,'Switching association restores the correct color scaffold');
  assert.equal(counts.faceBuild,1,'Association changes must not retriangulate same internal faces');
  upload(state,data(meshB,'surface',121));
  assert.equal(counts.surfaceBuild,2,'New OpenFOAM geometry must invalidate static GPU buffers');
  assert.equal(counts.faceBuild,2,'Changed mesh must rebuild internal faces');
  assert.equal(writes.surfacePos,2);assert.equal(writes.faceFieldPos,2);
  state.renderer=null;
  upload(state,data(meshB,'volume',122));
  assert.notStrictEqual(state.renderer,originalRenderer,'Renderer recreation is observed');
  assert.equal(counts.surfaceBuild,3,'New WebGL renderer must upload its own geometry');
  assert.equal(writes.surfacePos,3);
  const invalidation=new Function('fcPhysicalRelease','fcExtraUpdateLabel','fcExtraDom',
    source.slice(invalidStart,invalidEnd)+';return fcExtraInvalidateFrame;')(
    ()=>counts.release++,()=>{},helpers.fcExtraDom);
  state.seq=4;state.time=9.8;invalidation(state,'missing measured time');
  assert.equal(state.seq,5);
  assert.strictEqual(state.geometryUpload,null,'Invalidated frame must forget old GPU buffers');
  assert.strictEqual(state.mesh,null);
  assert(Number.isNaN(state.time),'Missing physical timestamps must not retain prior time');
  assert.equal(state.renderer.surfaceCount,0,'Stale surface vertices cannot remain drawable');
  upload(state,data(meshB,'volume',123));
  assert.equal(counts.surfaceBuild,4,'Restoring valid frame after invalidation uploads fresh GPU geometry');
}


(async()=>{
  // Original B and C/D async loaders must treat only the latest request's
  // errors as authoritative; a stale rejection must never erase a newer
  // measured frame when the user scrubs fast across a large OpenFOAM case.
  const deferred=()=>{
    let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});
    return{promise,resolve,reject}
  };
  const create=(snippet,name,deps)=>new Function('deps',
    'const {'+Object.keys(deps).join(',')+'}=deps;'+snippet+';return '+name+';')(deps);
  const bStart=source.indexOf('async function fcRefreshFrame(){'),
    bEnd=source.indexOf('\n}',bStart)+2;
  assert(bStart>=0&&bEnd>bStart,'Original B frame loader required');
  let bTarget=9.8,bClears=0,bUploads=0;
  const bPending=new Map([[9.8,deferred()],[10,deferred()],[11,deferred()]]);
  const bState={seq:0,mesh:null,enabled:true};
  const bDeps={
    fcRefreshSelectors:()=>{},fcState:bState,
    document:{getElementById:id=>id==='fcEnabled'?{checked:true}:null},
    fcUpdateLayout:()=>{},fcClearRenderer:()=>{bClears++;bState.mesh=null},
    fcCase:()=>({id:'B3',name:'B3'}),fcRegion:()=> 'metal',
    fcCurrentFieldName:()=> 'T',fcCurrentComponent:()=> 'value',
    fcPrimaryPhysicalTime:()=>bTarget,fcFieldFor:()=>({times:[9.8,10,11]}),
    fcResolveTime:(times,target)=>({ok:true,time:target,delta:0}),
    fcMode:()=> 'nearest',fcSetStatus:()=>{},fcUi:en=>en,
    fcLoadSynchronizedData:(c,g,region,target)=>bPending.get(target).promise,
    fcUploadMesh:()=>{bUploads++},fcApplySharedRange:range=>range,
    fcUpdateDerived:()=>{},fcUpdateViewportLegend:()=>{},
    fcVisualFor:()=>({palette:'viridis'}),fcUpdateStatsGrid:()=>{},
    fcUpdateDifference:()=>{},fvState:{mesh:{},fieldValues:[]},
    fcUpdateVectors:async()=>{},fcUpdateLabels:()=>{},fcPhysicalMenu:()=>{},
    fcRender:()=>{},fcPhysicalLoad:async()=>{},fvAssociationLabel:()=> 'volume',
    fcSyncText:()=> 'exact',console:{error:()=>{}}
  };
  const loadB=create(source.slice(bStart,bEnd),'fcRefreshFrame',bDeps);
  const oldB=loadB();bTarget=10;const currentB=loadB();
  const measuredB={ok:true,mesh:{name:'current'},storage:'volume',
    fieldValues:[400],parsed:{},range:{min:200,max:500},sync:{time:10,delta:0}};
  bPending.get(10).resolve(measuredB);await currentB;
  assert.equal(bState.time,10);assert.equal(bUploads,1);
  bPending.get(9.8).reject(new Error('stale old frame unavailable'));await oldB;
  assert.equal(bClears,0,'Old B read failure must not clear newest valid mesh');
  assert.strictEqual(bState.mesh,measuredB.mesh);
  bTarget=11;const failedB=loadB();
  bPending.get(11).reject(new Error('current B source unavailable'));await failedB;
  assert.equal(bClears,1,'Latest B read failure must still clear invalid scene');

  const cStart=source.indexOf('async function fcExtraRefreshFrame('),
    cEnd=source.indexOf('\n}',cStart)+2;
  assert(cStart>=0&&cEnd>cStart,'Original C/D frame loader required');
  let cTarget=9.8,cClears=0,cUploads=0;
  const cPending=new Map([[9.8,deferred()],[10,deferred()],[11,deferred()]]);
  const cState={id:3,seq:0,mesh:null};
  const cDeps={
    fcState:{enabled:true},fcExtraRefreshSelectors:()=>{},
    fcExtraCase:()=>({id:'C3',name:'C3'}),fcExtraRegion:()=> 'metal',
    fcExtraField:()=> 'T',fcExtraComponent:()=> 'value',
    fcPrimaryPhysicalTime:()=>cTarget,
    fcExtraDom:()=>({textContent:''}),fcExtraInvalidateFrame:state=>{
      cClears++;state.seq++;state.mesh=null;state.time=NaN
    },
    fcUi:en=>en,fcFieldFor:()=>({times:[9.8,10,11]}),
    fcResolveTime:(times,target)=>({ok:true,time:target,delta:0}),
    fcMode:()=> 'nearest',
    fcLoadSynchronizedData:(c,g,region,target)=>cPending.get(target).promise,
    fcExtraUpload:(state,data)=>{cUploads++;state.mesh=data.mesh},
    fcExtraUpdateLabel:()=>{},fcPhysicalMenu:()=>{},
    fcPhysicalLoad:async()=>{},fcExtraRender:()=>{},fcSyncText:()=> 'exact'
  };
  const loadC=create(source.slice(cStart,cEnd),'fcExtraRefreshFrame',cDeps);
  const oldC=loadC(cState);cTarget=10;const currentC=loadC(cState);
  const measuredC={ok:true,mesh:{name:'C current'},storage:'volume',
    fieldValues:[300],parsed:{},range:{min:0,max:500},sync:{time:10,delta:0}};
  cPending.get(10).resolve(measuredC);await currentC;
  assert.equal(cState.time,10);assert.equal(cUploads,1);
  cPending.get(9.8).reject(new Error('stale C field unavailable'));await oldC;
  assert.equal(cClears,0,'Old C read failure must not invalidate a newer C/D frame');
  assert.strictEqual(cState.mesh,measuredC.mesh);
  cTarget=11;const failedC=loadC(cState);
  cPending.get(11).reject(new Error('current C field unavailable'));await failedC;
  assert.equal(cClears,1,'Current C/D read failure must still invalidate stale physics');
  console.log('Field playback stale-error regressions PASS: newest B/C/D frames survive superseded failures.');
})().catch(error=>{console.error(error);process.exitCode=1});

console.log('Field multi-view regression PASS: A/B/C/D independent sources/zoom/Fit, linked Fit All, no phantom slots, async removal, drag reorder, Ribbon.');


// Granada block 3: Fit is a view-local camera command, not a selector-only
// operation. The real source's physical union includes only loaded visible
// OpenFOAM regions, even when a secondary overlay extends beyond the primary.
{
  const start=source.indexOf('function fcFitMeshForView(view,state,mesh){');
  const end=source.indexOf('function fcVisibleViewportNeighbor(',start);
  assert(start>=0&&end>start,'source-backed visible-region Fit implementation required');
  const input={_fcPhysical:{},mesh:{boundsMin:[0,0,0],boundsMax:[1,1,1]},camera:{distance:5,target:[0,0,0]}};
  const second={id:3,_fcPhysical:{},mesh:{boundsMin:[20,20,20],boundsMax:[22,22,22]},
    camera:{distance:7,target:[20,20,20]}};
  const unions=new Map([[input,{min:[-5,-6,-7],max:[3,4,5]}],
    [second,{min:[17,18,19],max:[35,40,45]}]]);
  const actualFits=[],rendered=[];
  let linked=false,fitAll=0,fitA=0;
  const funcs=new Function('fvState','fcState','fcExtraViews','fcPhysicalBoundsFor',
    'fcCamerasLinked','fcFitAllCameras','fvCameraFitCurrent','fcFitCameraState',
    'fcRender','fcRenderDifference','fcExtraRender',
    source.slice(start,end)+';return {fcFitMeshForView,fcValidFitMesh,fcFitViewport};')(
    {mesh:{boundsMin:[0,0,0],boundsMax:[1,1,1]}},input,[second],
    state=>unions.get(state)||null,()=>linked,()=>fitAll++,()=>fitA++,
    (state,mesh)=>{actualFits.push({state,min:mesh.boundsMin.slice(),max:mesh.boundsMax.slice()});state.camera.target=mesh.boundsMin.slice();},
    ()=>rendered.push('B'),()=>rendered.push('difference'),()=>rendered.push('C')
  );
  assert.equal(funcs.fcFitViewport('B'),true);
  assert.deepStrictEqual(actualFits[0].min,[-5,-6,-7],
    'B Fit must include the real mold overlay extending beyond the selected metal mesh');
  assert.deepStrictEqual(actualFits[0].max,[3,4,5]);
  assert.equal(input.camera.target[0],-5);
  assert.equal(second.camera.target[0],20,'B Fit must never overwrite C camera');
  assert.equal(funcs.fcFitViewport(3),true);
  assert.deepStrictEqual(actualFits[1].min,[17,18,19]);
  assert.deepStrictEqual(actualFits[1].max,[35,40,45]);
  assert.equal(second.camera.target[0],17);
  assert.equal(input.camera.target[0],-5,'C Fit must never overwrite B camera');
  assert.deepStrictEqual(rendered,['B','difference','C']);
  unions.set(input,{min:[10,11,12],max:[13,14,15]});
  assert.equal(funcs.fcFitViewport('B'),true,'hidden primary still allows visible physical overlay fit');
  assert.deepStrictEqual(actualFits[2].min,[10,11,12]);
  unions.delete(input);
  assert.equal(funcs.fcFitViewport('B'),false,'no visible real geometry means no invented camera extent');
  assert.equal(actualFits.length,3,'hidden physical meshes must not enter camera fitting');
  unions.set(input,{min:[-1e308,0,0],max:[1e308,1,1]});
  assert.equal(funcs.fcFitViewport('B'),false,'overflowed diagonal must not corrupt camera with Infinity');
  unions.set(input,{min:[-5,-6,-7],max:[3,4,5]});
  linked=true;
  assert.equal(funcs.fcFitViewport('B'),true);
  assert.equal(fitAll,1,'linked camera must fit all views rather than claiming independent B fit');
  assert.equal(actualFits.length,3,'shared Fit may not overwrite independent saved cameras');
  assert(source.includes("else fcFitViewport(state===fcState?'B':state.id)"),
    'double-click also uses the same visible-region Fit, not the obsolete primary-only mesh');
  console.log('Field block 3 physical camera Fit PASS: B/C independent, visible union, hidden primary, overflow and linked mode');
}


// Granada block 3: exercise the source camera math and Fit All path, not
// merely string/markup assertions. A real OpenFOAM bounding union is the
// only input; invalid spans never mutate a working camera.
{
  const cameraStart=source.indexOf('function fcFitCameraState(state,mesh){');
  const cameraEnd=source.indexOf('function fcResyncCameras(){',cameraStart);
  const validStart=source.indexOf('function fcValidFitMesh(mesh){');
  const validEnd=source.indexOf('function fcFitViewport(view){',validStart);
  assert(cameraStart>=0&&cameraEnd>cameraStart&&validStart>0&&validEnd>validStart);
  const camera=new Function('fvState','fcCloneCamera',
    source.slice(cameraStart,cameraEnd)+'\n'+source.slice(validStart,validEnd)+
    ';return {fcFitCameraState,fcValidFitMesh};')({camera:{distance:3,target:[0,0,0]}},x=>x);
  const B={camera:{target:[0,0,0],distance:6}},C={camera:{target:[0,0,0],distance:7}};
  const bBounds={boundsMin:[-2,-4,-6],boundsMax:[8,10,12]};
  const cBounds={boundsMin:[15,18,21],boundsMax:[25,28,31]};
  assert.equal(camera.fcValidFitMesh(bBounds),true);
  assert.equal(camera.fcFitCameraState(B,bBounds),true);
  assert.deepStrictEqual(B.camera.target,[3,3,3]);
  assert(B.camera.distance>0&&Number.isFinite(B.camera.distance));
  assert.equal(camera.fcFitCameraState(C,cBounds),true);
  assert.deepStrictEqual(C.camera.target,[20,23,26]);
  assert.deepStrictEqual(B.camera.target,[3,3,3],'fitting C must not shift B');
  const oldTarget=B.camera.target.slice(),oldDistance=B.camera.distance;
  assert.equal(camera.fcFitCameraState(B,{boundsMin:[0,0,0],boundsMax:[1.5e308,0,0]}),false,
    'a finite bounding box with overflowing fit distance must be rejected');
  assert.deepStrictEqual(B.camera.target,oldTarget);
  assert.equal(B.camera.distance,oldDistance);
  const hugeCenter={boundsMin:[1e308,0,0],boundsMax:[1e308,0,0]};
  assert.equal(camera.fcFitCameraState(B,hugeCenter),true,
    'a finite large world offset must be centered without min+max overflow');
  assert.equal(B.camera.target[0],1e308);

  const allStart=source.indexOf('function fcFitAllCameras(){'),allEnd=source.indexOf('function fcGlobalVisual(){',allStart);
  assert(allStart>0&&allEnd>allStart);
  const viewB={mesh:{boundsMin:[0,0,0],boundsMax:[1,1,1]},camera:{target:[0,0,0],distance:5}};
  const viewC={id:3,mesh:{boundsMin:[3,3,3],boundsMax:[4,4,4]},camera:{target:[0,0,0],distance:6}};
  const unionB={boundsMin:[-3,-5,-7],boundsMax:[8,10,12]};
  const unionC={boundsMin:[1,2,3],boundsMax:[30,40,50]};
  let linked=false,aFit=0,renderCount=0;
  const fitAll=new Function('fvCameraFitCurrent','fcCamerasLinked','fcFitMeshForView',
    'fcValidFitMesh','fcFitCameraState','fcState','fcExtraViews',
    'fcRender','fcRenderDifference','fcRenderExtras',
    source.slice(allStart,allEnd)+';return fcFitAllCameras;')(
    ()=>aFit++,()=>linked,(view,state)=>state===viewB?unionB:state===viewC?unionC:null,
    camera.fcValidFitMesh,camera.fcFitCameraState,viewB,[viewC],
    ()=>renderCount++,()=>renderCount++,()=>renderCount++);
  fitAll();
  assert.deepStrictEqual(viewB.camera.target,[2.5,2.5,2.5],
    'Fit All must use B metal+mold union rather than only the primary mesh');
  assert.deepStrictEqual(viewC.camera.target,[15.5,21,26.5],
    'Fit All must use C own visible-region bounds');
  assert.equal(aFit,1,'A delegates to its original multiregion Fit');
  assert.equal(renderCount,3);
  const beforeB=viewB.camera.target.slice(),beforeC=viewC.camera.target.slice();
  linked=true;fitAll();
  assert.equal(aFit,2);
  assert.deepStrictEqual(viewB.camera.target,beforeB,'linked mode must preserve the saved independent B camera');
  assert.deepStrictEqual(viewC.camera.target,beforeC);
  console.log('Field block 3 Fit All PASS: measured A/B/C bounds, safe numerical camera, linked isolation');
}


// Granada block 3: actual camera fit must honor the target A/B/C/D pane
// dimensions instead of a global browser aspect ratio.
{
  const a=source.indexOf('function fcFitCameraState(state,mesh){');
  const b=source.indexOf('function fcResyncCameras(){',a);
  const v=source.indexOf('function fcValidFitMesh(mesh){');
  const w=source.indexOf('function fcFitViewport(view){',v);
  assert(a>0&&b>a&&v>0&&w>v);
  const base={camera:{target:[0,0,0],distance:4}};
  const B={camera:{target:[0,0,0],distance:8}};
  const C={id:3,camera:{target:[0,0,0],distance:10}};
  const canvasB={clientWidth:300,clientHeight:700},canvasC={clientWidth:780,clientHeight:280};
  const calls=[];
  const fit=new Function('fvState','fcCloneCamera','fcState','document','fvFitDistance',
    source.slice(a,b)+'\n'+source.slice(v,w)+';return fcFitCameraState;')(
    base,x=>x,B,{getElementById:id=>id==='fcCanvas'?canvasB:id==='fcExtra3Canvas'?canvasC:null},
    (bounds,camera,canvas)=>{calls.push({bounds,canvas});return canvas===canvasB?42:24});
  const meshB={boundsMin:[-2,-4,-6],boundsMax:[8,10,12]};
  const meshC={boundsMin:[1,2,3],boundsMax:[30,40,50]};
  assert.strictEqual(fit(B,meshB),true);
  assert.strictEqual(fit(C,meshC),true);
  assert.deepStrictEqual(calls.map(x=>x.canvas),[canvasB,canvasC],
    'each real 3D panel must use its own viewport width/height');
  assert.deepStrictEqual(calls.map(x=>x.bounds.center),[[3,3,3],[15.5,21,26.5]]);
  assert.strictEqual(B.camera.distance,42);
  assert.strictEqual(C.camera.distance,24);
  assert.deepStrictEqual(B.camera.target,[3,3,3]);
  const savedDistance=B.camera.distance,savedTarget=B.camera.target.slice();
  const invalid=new Function('fvState','fcCloneCamera','fcState','document','fvFitDistance',
    source.slice(a,b)+'\n'+source.slice(v,w)+';return fcFitCameraState;')(
    base,x=>x,B,{getElementById:()=>canvasB},()=>NaN);
  assert.strictEqual(invalid(B,meshB),false,'unsafe projected camera distance must be rejected');
  assert.strictEqual(B.camera.distance,savedDistance);
  assert.deepStrictEqual(B.camera.target,savedTarget);
  console.log('Field block 3 narrow B/C viewport camera Fit PASS: panel aspect, real union center, safe fallback');
}


// Granada block 3: A/B/C/D native camera presets route to the SAME original
// Field camera when linked, but retain separate camera positions otherwise.
// This executes original production functions rather than duplicating logic.
{
  const begin=source.indexOf('function fcViewCameraAngles(name){');
  const end=source.indexOf('function fcZoomViewport(view,factor){',begin);
  assert(begin>0&&end>begin,'original per-viewport camera source required');
  const states={
    A:{mesh:{boundsMin:[0,0,0],boundsMax:[1,1,1]},camera:{yaw:0,pitch:0}},
    B:{mesh:{boundsMin:[2,2,2],boundsMax:[3,3,3]},camera:{yaw:.1,pitch:.2}},
    C:{id:3,mesh:{boundsMin:[4,4,4],boundsMax:[5,5,5]},camera:{yaw:.3,pitch:.4}},
    D:{id:4,mesh:{boundsMin:[6,6,6],boundsMax:[7,7,7]},camera:{yaw:.5,pitch:.6}}
  };
  states.B.enabled=true;let linked=false,fitFails=false,lang='en';
  const render=[],original=[],fits=[];
  const clone=c=>({yaw:c.yaw,pitch:c.pitch,distance:c.distance||10,target:[...(c.target||[0,0,0])]});
  const api=new Function(
    'fvState','fcState','fcExtraViews','fcFitMeshForView','fcValidFitMesh',
    'fcCamerasLinked','fvCameraPreset','fcCloneCamera','fcCameraFor',
    'fcFitCameraState','fcRender','fcRenderDifference','fcExtraRender','fcUi','fcEsc',
    source.slice(begin,end)+';return {fcViewCameraAngles,fcSetViewportCamera,fcCameraPresetMenu};'
  )(states.A,states.B,[states.C,states.D],
    (view,state,mesh)=>mesh,m=>!!m?.boundsMin&&!!m?.boundsMax,
    ()=>linked,name=>original.push(name),clone,state=>state.camera,
    (state,mesh)=>{fits.push(state===states.B?'B':state===states.C?'C':'D');if(fitFails)return false;state.camera.distance=30;return true},
    ()=>render.push('B'),()=>render.push('difference'),state=>render.push(state===states.C?'C':'D'),
    (en,es)=>lang==='es'?es:en,v=>String(v)
  );
  assert.deepStrictEqual(api.fcViewCameraAngles('iso').map(v=>Number(v.toFixed(2))),[.72,.42]);
  assert.equal(api.fcViewCameraAngles('wrong'),null,'unknown direction cannot mutate a view');
  assert.equal(api.fcSetViewportCamera('B','front'),true);
  assert.deepStrictEqual([states.B.camera.yaw,states.B.camera.pitch],[0,0]);
  assert.deepStrictEqual([states.C.camera.yaw,states.C.camera.pitch],[.3,.4]);
  assert.deepStrictEqual([states.D.camera.yaw,states.D.camera.pitch],[.5,.6]);
  assert.deepStrictEqual(render,['B','difference']);
  assert.deepStrictEqual(fits,['B']);
  assert.equal(api.fcSetViewportCamera(3,'right'),true);
  assert.equal(states.C.camera.yaw,Math.PI/2);
  assert.equal(states.C.camera.pitch,0);
  assert.equal(api.fcSetViewportCamera(4,'top'),true);
  assert.equal(states.D.camera.yaw,0);
  assert(Math.abs(states.D.camera.pitch-Math.PI/2)<1e-3);
  assert.deepStrictEqual(render,['B','difference','C','D']);
  assert.deepStrictEqual(original,[],'independent B/C/D must not command original A camera');
  assert.equal(api.fcSetViewportCamera('A','iso'),true);
  assert.deepStrictEqual(original,['iso'],'A always uses the original scientific camera UI');
  linked=true;
  const beforeB=clone(states.B.camera),beforeC=clone(states.C.camera),beforeD=clone(states.D.camera);
  assert.equal(api.fcSetViewportCamera('B','left'),true);
  assert.deepStrictEqual(original,['iso','left'],'linked view B delegates to original A camera');
  assert.deepStrictEqual(states.B.camera,beforeB,'linked view preserves B camera for later unlink');
  assert.deepStrictEqual(states.C.camera,beforeC);
  assert.deepStrictEqual(states.D.camera,beforeD);
  linked=false;fitFails=true;
  assert.equal(api.fcSetViewportCamera('B','bottom'),false,'failed fit must not pretend success');
  assert.deepStrictEqual(states.B.camera,beforeB,'failed projected fit must restore B camera');
  fitFails=false;
  const oldC=states.C.mesh;states.C.mesh=null;
  assert.equal(api.fcSetViewportCamera(3,'front'),false,'unloaded C never fabricates a camera');
  states.C.mesh=oldC;
  assert.equal(api.fcSetViewportCamera('B','unknown'),false);
  assert.equal(api.fcSetViewportCamera(7,'iso'),false,'unknown viewport cannot steal A state');

  const menu=api.fcCameraPresetMenu('B');
  assert.deepStrictEqual([...menu.matchAll(/data-fc-camera-preset="([^"]+)"/g)].map(m=>m[1]),
    ['iso','front','back','left','right','top','bottom'],
    'all seven camera buttons are visible in each A/B/C/D toolbar menu');
  assert(menu.includes('View B · Front'),'buttons must identify their individual source view');
  lang='es';const menuEs=api.fcCameraPresetMenu('D');
  assert(menuEs.includes('Vistas de cámara'));
  assert(menuEs.includes('Vista D · Derecha'));
  for(const fragment of [
    "cameraMenu?.querySelectorAll('[data-fc-camera-preset]')",
    "fcSetViewportCamera(view,button.dataset.fcCameraPreset)",
    'fcRefreshCameraPresetLabels();fcScheduleToolbarSync()',
    '.fcViewportCameraPresets[open]{flex:1 0 100%}'
  ])assert(source.includes(fragment),'missing original per-pane camera action or responsive UI: '+fragment);
  console.log('Granada Field A-D camera buttons PASS: seven directions, unlinked isolation, linked original A, Spanish labels, no-data guard');
}

// Granada block 3: preset indicators follow real yaw/pitch per viewport.
// A user rotating B must not leave a false "Front" button selected in B,
// or change the original A and independently selected C/D.
{
  const start=source.indexOf('function fcViewCameraAngles(name){');
  const end=source.indexOf('function fcZoomViewport(view,factor){',start);
  assert(start>=0&&end>start,'original camera presets and state display must exist');
  const names=['iso','front','back','left','right','top','bottom'];
  const flags=()=>({selected:false,toggle(_,yes){this.selected=!!yes}});
  function bar(view){
    const buttons=names.map(name=>({
      dataset:{fcCameraPreset:name,flEn:name.toUpperCase(),flEs:name.toLowerCase()},
      classList:flags(),attributes:{},setAttribute(key,value){this.attributes[key]=value},
      textContent:'',title:''
    }));
    const summary={textContent:''},group={attributes:{},setAttribute(k,v){this.attributes[k]=v}};
    const menu={dataset:{},querySelector(key){return key==='summary'?summary:key==='[role="group"]'?group:null},
      querySelectorAll(key){return key==='[data-fc-camera-preset]'?buttons:[]}};
    return{dataset:{fcToolbar:view},summary,buttons,group,menu,
      querySelector:key=>key==='.fcViewportCameraPresets'?menu:null}
  }
  const bars=['A','B','3','4'].map(bar);
  let language='en',linked=false;
  const A={mesh:{},camera:{yaw:0,pitch:0}},B={enabled:true,mesh:{},camera:{yaw:Math.PI,pitch:0}};
  const C={id:3,mesh:{},camera:{yaw:Math.PI/2,pitch:0}},D={id:4,mesh:{},camera:{yaw:0,pitch:-Math.PI/2+1e-4}};
  const root={querySelectorAll:selector=>selector==='[data-fc-toolbar]'?bars:[]};
  const document={getElementById:key=>key==='fcViewGrid'?root:null};
  const factory=new Function('fvState','fcState','fcExtraViews','fcCamerasLinked','fcUi','document',
    source.slice(start,end)+';return {fcViewCameraAngles,fcCameraPresetFor,fcViewCameraState,fcCameraPresetLabel,fcSyncCameraPresetButtons,fcRefreshCameraPresetLabels};');
  const api=factory(A,B,[C,D],()=>linked,(en,es)=>language==='es'?es:en,document);
  assert.equal(api.fcCameraPresetFor(null),null);
  assert.equal(api.fcCameraPresetFor({yaw:NaN,pitch:0}),null);
  assert.equal(api.fcCameraPresetFor({yaw:-Math.PI,pitch:0}),'back',
    'wrapped yaw is the same physical Back direction');
  assert.equal(api.fcCameraPresetFor({yaw:.3,pitch:.4}),'custom',
    'arbitrary pointer orbit must not claim a preset');
  for(const name of names){
    const angles=api.fcViewCameraAngles(name);
    assert.equal(api.fcCameraPresetFor({yaw:angles[0],pitch:angles[1]}),name,
      'physical preset must match '+name);
  }
  api.fcSyncCameraPresetButtons();
  assert.deepStrictEqual(bars.map(b=>b.buttons.find(x=>x.classList.selected)?.dataset.fcCameraPreset),
    ['front','back','right','bottom']);
  assert.equal(bars[1].buttons.find(x=>x.dataset.fcCameraPreset==='back').attributes['aria-pressed'],'true');
  assert(bars[1].summary.textContent.includes('Back'));
  const preservedA=bars[0].summary.textContent,preservedC=bars[2].summary.textContent;
  B.camera.yaw=.39;
  api.fcSyncCameraPresetButtons();
  assert(bars[1].summary.textContent.includes('Custom'),'B must report an actual custom orbit');
  assert.equal(bars[1].buttons.filter(x=>x.classList.selected).length,0);
  assert.equal(bars[0].summary.textContent,preservedA,'B orbit cannot change A status');
  assert.equal(bars[2].summary.textContent,preservedC,'B orbit cannot change C status');
  linked=true;api.fcSyncCameraPresetButtons();
  assert(bars.every(b=>b.buttons.find(x=>x.classList.selected)?.dataset.fcCameraPreset==='front'),
    'linked B/C/D must show the authoritative A orientation');
  linked=false;B.enabled=false;api.fcSyncCameraPresetButtons();
  assert.equal(bars[1].summary.textContent,'Camera views','unloaded/hidden B cannot report a real camera');
  assert.equal(bars[1].buttons.filter(x=>x.classList.selected).length,0);
  B.enabled=true;language='es';api.fcRefreshCameraPresetLabels();
  assert.equal(bars[1].summary.textContent,'Vistas de cámara · Personalizada');
  assert.equal(bars[2].summary.textContent,'Vistas de cámara · Derecha');
  assert.equal(bars[0].buttons[0].attributes['aria-label'],'Vista A · iso');
  for(const fragment of [
    'const details=button.closest(\'details\');if(details){',
    "details.querySelector('summary')?.focus()",
    "event.key==='Escape'&&cameraMenu.open",
    "'ArrowRight','ArrowLeft','ArrowDown','ArrowUp','Home','End'",
    "canvas?.addEventListener('pointermove',event=>",
    "canvas?.addEventListener('wheel',fcScheduleCameraPresetSync",
    "fcScheduleCameraPresetSync()});",
    '.fcViewportCameraChoices button[aria-pressed="true"]'
  ])assert(source.includes(fragment),'Camera state accessibility wiring missing: '+fragment);
  console.log('Granada Field A-D preset states PASS: real yaw/pitch, custom orbit, linked state, EN/ES and keyboard focus');
}

// Granada block 3: compact A/B/C/D source controls retain original selectors,
// expose their REAL selection in the summary, and do not leak case/field
// state between views. This runs the actual source implementation.
{
  const begin=source.indexOf('function fcSyncViewSourceSummary(bar){');
  const end=source.indexOf('function fcAddViewportToolbar(',begin);
  assert(begin>=0&&end>begin,'the real compact per-view source helper must exist');
  const values=new Map();
  const make=(value,text)=>({value,selectedOptions:value?[{textContent:text??value}]:[]});
  const populate=(letter,items)=>{
    const ids=api.fcViewSourceMap(letter);
    for(const [key,id] of Object.entries(ids))values.set(id,make(items[key]?.[0]??'',items[key]?.[1]))
  };
  populate('A',{Case:['A-id','QuickCup B3'],Region:['metal','metal'],
    Field:['T','T'],Component:['value','value']});
  populate('B',{Case:['B-id','QuickCup C3'],Region:['mold','sand mold'],
    Field:['alpha1','alpha1'],Component:['x','X']});
  populate(3,{Case:['C-id','QuickCup B4'],Region:['metal','liquid metal'],
    Field:['U','velocity U'],Component:['z','Z']});
  populate(4,{Case:['D-id','QuickCup C4'],Region:['mold','mold'],
    Field:['T','temperature T'],Component:['value','value']});
  const summaries=new Map(),bars=[];
  for(const key of ['A','B','3','4']){
    const summary={textContent:'',title:''};
    const details={querySelector:q=>q==='summary'?summary:null};
    const bar={dataset:{fcToolbar:key},
      querySelector:q=>q==='.fcViewSourceDetails'?details:null};
    bars.push(bar);summaries.set(key,summary)
  }
  let lang='en';
  const dom={getElementById:id=>values.get(id)||null};
  const fn=new Function('document','fcViewSourceMap','fcUi',
    source.slice(begin,end)+';return fcSyncViewSourceSummary;')(
    dom,api.fcViewSourceMap,(en,es)=>lang==='es'?es:en);
  assert.equal(fn(bars[0]),true);
  assert.equal(fn(bars[1]),true);
  assert.equal(fn(bars[2]),true);
  assert.equal(fn(bars[3]),true);
  assert.equal(summaries.get('A').textContent,'Source A · QuickCup B3 · metal · T',
    'primary source should be discoverable even with its controls closed');
  assert.equal(summaries.get('B').textContent,'Source B · QuickCup C3 · sand mold · alpha1 · X');
  assert.equal(summaries.get('3').textContent,'Source C · QuickCup B4 · liquid metal · velocity U · Z');
  assert.equal(summaries.get('4').textContent,'Source D · QuickCup C4 · mold · temperature T');
  const previous=summaries.get('A').textContent;
  values.set('fcField',make('U','flow velocity'));
  fn(bars[1]);
  assert(summaries.get('B').textContent.includes('flow velocity'),
    'changing original B field immediately updates the corresponding summary');
  assert.equal(summaries.get('A').textContent,previous,
    'B changes cannot mutate original A source labels');
  values.set('fcExtra4Case',make('',''));
  values.set('fcExtra4Region',make('',''));
  values.set('fcExtra4Field',make('',''));
  values.set('fcExtra4Component',make('',''));
  fn(bars[3]);assert.equal(summaries.get('4').textContent,'Source D · No case loaded',
    'missing physical source must not be reported as measured case zero');
  lang='es';fn(bars[0]);
  assert(summaries.get('A').textContent.startsWith('Fuente A ·'));
  assert.equal(summaries.get('A').title,summaries.get('A').textContent);

  const toolbarStart=source.indexOf('function fcAddViewportToolbar(');
  const toolbarEnd=source.indexOf('// Independent multi-region GPU scenes',toolbarStart);
  assert(toolbarStart>0&&toolbarEnd>toolbarStart,'original view toolbar required');
  const toolbar=source.slice(toolbarStart,toolbarEnd);
  assert(toolbar.includes('class="fcViewSourceDetails"'),
    'each A/B/C/D source must be a native collapsible details control');
  assert(toolbar.includes("(view==='A'?'':'open')"),
    'primary A defaults compact while newly created B/C/D are ready to configure');
  assert(toolbar.includes('data-fc-bind="'),
    'original source mirror binding must survive inside collapsible details');
  assert(toolbar.includes("source.dispatchEvent(new Event('change',{bubbles:true}))"),
    'collapsed Field toolbar must retain original scientific selector event handlers');
  assert(toolbar.includes("if(event.key!=='Escape'||!sourceDetails.open)return"),
    'Escape must collapse source controls without destroying options');
  assert(toolbar.includes("sourceDetails.querySelector('summary')?.focus()"),
    'keyboard focus must be restored to its visible summary');
  assert(source.includes('.fcViewSourceDetails[open]{flex:1 0 100%}'),
    'the expanded inspector should use its own row rather than widen the viewport');
  assert(source.includes('fcSyncViewSourceSummary(bar);'),
    'each toolbar synchronization must refresh the compact original source caption');
  console.log('Granada compact sources PASS: original A/B/C/D case, region, field, component, missing data, EN/ES and keyboard');
}


// Granada Field physical opacity: measured primary uses its ORIGINAL visual
// controls. Secondary mold layers use independent per-region alpha. The
// same visible slider must not be a misleading no-op in A/B/C/D.
{
  const begin=source.indexOf('function fcPhysicalPrimaryOpacityInput(ctx){');
  const end=source.indexOf('function fcPhysicalMenu(view){',begin);
  assert(begin>0&&end>begin,'original measured physical alpha routing required');
  const events=[],renders=[],ids=['fvOpacity','fcView2Opacity','fcExtra3Opacity','fcExtra4Opacity'];
  const inputs=new Map(ids.map((id,i)=>[id,{value:String([.92,.83,.74,.65][i]),
    dispatchEvent(e){events.push({id,type:e.type,bubbles:e.bubbles})}}]));
  let linked=false;
  const document={
    activeElement:null,
    getElementById:id=>inputs.get(id)||null
  };
  class MockEvent{constructor(type,o){this.type=type;this.bubbles=!!o?.bubbles}}
  const fn=new Function('document','fcVisualsSynced','Event',
    'fvRender','fcRender','fcExtraRender',
    source.slice(begin,end)+
    ';return {target:fcPhysicalPrimaryOpacityInput,value:fcPhysicalOpacityValue,apply:fcSetPhysicalOpacity,sync:fcSyncPhysicalOpacitySliders};')(
    document,()=>linked,MockEvent,
    ()=>renders.push('A'),()=>renders.push('B'),state=>renders.push(state.id===3?'C':'D'));
  const a={view:'A',primary:'metal',state:{}};
  const b={view:'B',primary:'metal',state:{}};
  const c={view:'3',primary:'metal',state:{id:3}};
  const d={view:'4',primary:'mold',state:{id:4}};
  const ca={opacity:1},cb={opacity:1},cc={opacity:1},cd={opacity:1};
  assert.equal(fn.value(a,'metal',ca),.92);
  assert.equal(fn.value(b,'metal',cb),.83);
  assert.equal(fn.value(c,'metal',cc),.74);
  assert.equal(fn.value(d,'mold',cd),.65);
  assert.equal(fn.apply(a,'metal',ca,.35),true);
  assert.equal(Number(inputs.get('fvOpacity').value),.35);
  assert.deepStrictEqual(events.at(-1),{id:'fvOpacity',type:'input',bubbles:true});
  assert.equal(fn.apply(b,'metal',cb,.4),true);
  assert.equal(Number(inputs.get('fcView2Opacity').value),.4);
  assert.equal(Number(inputs.get('fvOpacity').value),.35,'B independent opacity must not change A');
  assert.equal(fn.apply(c,'metal',cc,.55),true);
  assert.equal(Number(inputs.get('fcExtra3Opacity').value),.55);
  assert.equal(fn.apply(d,'mold',cd,.6),true);
  assert.equal(Number(inputs.get('fcExtra4Opacity').value),.6);
  assert.deepStrictEqual(events.map(e=>e.id),ids,
    'A/B/C/D use four real and separate source visual handlers');
  const secondary={opacity:.48};
  assert.equal(fn.apply(b,'mold',secondary,.25),true);
  assert.equal(secondary.opacity,.25,'overlay region retains its own alpha');
  assert.equal(renders.at(-1),'B','secondary B overlay uses native B GPU renderer');
  assert.equal(events.length,4,'secondary alpha does not modify the primary visual control');
  linked=true;
  assert.equal(fn.value(c,'metal',cc),.35,'linked C slider must reflect canonical A opacity');
  assert.equal(fn.apply(c,'metal',cc,.7),true);
  assert.equal(Number(inputs.get('fvOpacity').value),.7,'linked C must update A/global visual alpha');
  assert.equal(Number(inputs.get('fcExtra3Opacity').value),.55,
    'linked change cannot corrupt the independent C setting');
  assert.equal(fn.apply(b,'metal',cb,NaN),false,
    'non-numeric alpha must not trigger the original scientific renderer');
  const sliderPrimary={value:'.7'},sliderOverlay={value:'.4'};
  const rows=[
    {dataset:{fcRegion:'metal'},querySelector:()=>sliderPrimary},
    {dataset:{fcRegion:'mold'},querySelector:()=>sliderOverlay}
  ];
  const holder={querySelectorAll:()=>rows};
  document.activeElement=sliderOverlay;
  fn.sync(holder,c,[{region:'metal',ch:cc},{region:'mold',ch:secondary}]);
  assert.equal(Number(sliderPrimary.value),.7,'primary slider tracks real linked source');
  assert.equal(Number(sliderOverlay.value),.4,
    'active overlay drag stays focused and is not programmatically reset');
  document.activeElement=null;fn.sync(holder,c,[{region:'metal',ch:cc},{region:'mold',ch:secondary}]);
  assert.equal(Number(sliderOverlay.value),.25,'idle secondary slider reconciles actual alpha');
  assert(source.includes("region,ch?.visible,ch?.visibilityExplicit,ch?.field,ch?.component,ch?.palette"),
    'volatile alpha cannot invalidate the menu and destroy the active thumb');
  assert(source.includes("fcSyncPhysicalOpacitySliders(holder,ctx,catalog);"),
    'unchanged real catalog must update slider value without rebuilding all controls');
  assert(source.includes("fcSetPhysicalOpacity(ctx,region,ch,e.target.value)"),
    'original region slider handlers must reach canonical primary opacity');
  console.log('Granada Field original primary opacity PASS: A/B/C/D, linked vs independent, GPU overlay, safe drag, source truth');
}


// Granada 3D XYZ caption ownership: original Field viewport DOM, IDs and
// camera/mesh axes are preserved, but long numeric metric readouts must live
// BELOW the canvas on A/B/C/D at narrow widths.
{
  const start=source.indexOf('function fcAddViewportToolbar(viewport,view){'),
    end=source.indexOf('// Independent multi-region GPU scenes',start);
  assert(start>0&&end>start,'original A-D viewport mount contract exists');
  const mount=source.slice(start,end);
  assert(mount.includes("if(mapping&&view==='A'){"),
    'original A must explicitly relocate its existing XYZ metric element');
  assert(mount.includes("const metrics=viewport.querySelector('.fvMeshDimensions')"),
    'A must reuse the existing source-backed fvMeshDimensions node');
  assert(mount.includes("if(metrics&&caption)caption.appendChild(metrics)"),
    'A numeric XYZ readout must live in the below-canvas caption');
  assert(mount.includes("scene.append(svg);"),
    'B/C/D original metric axes must stay superimposed on physical geometry');
  assert(mount.includes("if(caption)caption.appendChild(dims);else scene.appendChild(dims)"),
    'B/C/D source-backed XYZ readout must move below the canvas');
  assert(mount.includes("dims.setAttribute('aria-live','polite')"),
    'live source metric readout must remain accessible');
  assert(mount.includes("if(scaleDock&&caption)caption.appendChild(scaleDock)"),
    'primary A source and all its measured metal/mold scales must live below the canvas');
  assert(mount.includes("if(primaryLegend)caption.appendChild(primaryLegend)"),
    'B/C/D original primary measured color legend must live below the canvas');
  assert(mount.includes("caption.appendChild(legends)"),
    'secondary physical legends must remain below the mesh with their own source context');
  assert(!mount.includes("scene.append(svg,dims)"),
    'the old floating numeric dimensions must not cover the visualized mesh');
  for(const css of [
    '#fcViewGrid .fcViewportCaption{display:flex;flex-direction:column',
    '#fcViewGrid .fcViewportCaption .fvMeshDimensions,',
    '#fcViewGrid .fcViewportCaption .fcMetricBounds{position:static!important',
    '#fcViewGrid .fcViewportCaption [hidden]{display:none!important}',
    '#fcViewGrid .fcViewportCaption .fvRegionScaleDock{position:static!important',
    '#fcViewGrid .fcViewportCaption .fcLegend{position:static!important',
    '#fcViewGrid .fcViewportCaption .fcPhysicalLegends{min-width:0'
  ])assert(source.includes(css),'original narrow-pane Field caption CSS missing: '+css);
  assert(source.includes("const svg=viewport.querySelector('.fcMetricAxes'),readout=viewport.querySelector('.fcMetricBounds');"),
    'renderer must continue to read original physical X/Y/Z sources by their existing classes');
  assert(source.includes("readout.textContent=labels.join(' | ')"),
    'metric lengths must remain original mesh values with real units');
  assert(source.includes("svg.innerHTML=markup"),
    'original projected axes/metric tick SVG must remain functional');
  console.log('Granada 3D A/B/C/D metric captions PASS: original numeric sources below canvas, source axes preserved, narrow CSS and legends');
}
