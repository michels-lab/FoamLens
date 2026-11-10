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

  metal.visible=false;metal.opacity=.25;metal.palette='turbo';metal.component='z';
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
  const holder={dataset:{},renders:0,_html:'',querySelector:q=>q==='details'?{open:true}:null,
    querySelectorAll:()=>[],
    get innerHTML(){return this._html},
    set innerHTML(value){this.renders++;this._html=value}};
  const bar={querySelector:q=>q==='[data-fc-regions]'?holder:null};
  const ctx={view:'3',c:caseMenu,primary:'metal',state:stateC,
    viewport:{querySelector:q=>q==='[data-fc-toolbar]'?bar:null}};
  // Minimal source-backed A/C scope. B and D call this same original function.
  const menuStart=source.indexOf('function fcPhysicalMenu(view){');
  const menuEnd=source.indexOf('function fcPhysicalReload(ctx){',menuStart);
  assert(menuStart>=0&&menuEnd>menuStart,'original physical menu renderer missing');
  let locale='en';
  const menu=new Function('fcPhysicalViewContext','fvRegionNames','fcPhysicalChoiceList',
    'fvRegionChoice','fcPhysicalFor','fvFieldGroups','fvFieldComponents',
    'fcReconcilePhysicalChoice','document','fcUi','fcEsc',
    'fcPhysicalReload','fvRegionLoadFrame','fvRegionRefreshList','fvState',
    'fvRender','fcRender','fcExtraRender',
    source.slice(menuStart,menuEnd)+';return fcPhysicalMenu;'
  )(()=>ctx,list,physical.fcPhysicalChoiceList,()=>choice,physical.fcPhysicalFor,groups,fvFieldComponents,
    physical.fcReconcilePhysicalChoice,{getElementById:id=>({value:id==='language'?locale:'U'}),documentElement:{lang:'en'}},
    (en,es)=>locale==='es'?es:en,v=>String(v),()=>{},()=>Promise.resolve(),()=>{}, {time:0},()=>{},()=>{},()=>{});

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
  "const enabled=document.getElementById('fcEnabled')","const added=fcExtraAdd();fwUpdateViewCount()",
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
