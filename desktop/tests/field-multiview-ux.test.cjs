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

  
// Granada regression: all loaded original OpenFOAM cases must appear in B/C/D,
// even if one is still unready. A nonrenderable initial A must not leave the
// linked comparison stuck with t=— when a different ready case exists.
{
  const models=[
    {id:'B14',name:'B14_topFixedFlux_explicitRef',ready:false,regions:['metal'],groups:{metal:[]}},
    {id:'C14',name:'C14_topFixedFlux_explicitRef',ready:true,regions:['metal','mold'],groups:{
      metal:[{name:'gradRho',kind:'vector',storage:'volume'}],
      mold:[{name:'T',kind:'scalar',storage:'volume'}]}},
    {id:'D14',name:'D14_reference',ready:true,regions:['metal'],groups:{
      metal:[{name:'T',kind:'scalar',storage:'volume'}]}}
  ];
  const makeSelect=()=>{
    let html='',value='';
    return {
      get innerHTML(){return html},
      set innerHTML(text){
        html=String(text);
        const values=[...html.matchAll(/<option value="([^"]*)"/g)].map(m=>m[1]);
        if(!values.includes(value))value=values[0]||'';
      },
      get value(){return value},set value(next){value=String(next)},
      get options(){return [...html.matchAll(/<option value="([^"]*)"/g)].map(m=>({value:m[1]}))}
    }
  };
  const primary={fvCase:{value:'B14'},fvRegion:{value:'metal'},
    fvField:{value:'T'},fvComponent:{value:'value'}};
  const bound={fcCase:makeSelect(),fcRegion:makeSelect(),fcField:makeSelect(),
    fcComponent:makeSelect(),fcBadge:{textContent:''},...primary};
  const bBegin=source.indexOf('function fcRefreshSelectors(preserve=true){'),
    bEnd=source.indexOf('function fcMvp(',bBegin),
    helperStart=source.indexOf('function fcExtraSetOptionMarkup('),
    helperEnd=source.indexOf('function fcExtraRefreshSelectors(',helperStart);
  assert(bBegin>0&&bEnd>bBegin&&helperStart>0&&helperEnd>helperStart);
  const associationStart=source.indexOf('function fcSelectedAssociation(select){'),
    associationEnd=source.indexOf('function fcCurrentFieldStorage(',associationStart);
  assert(associationStart>=0&&associationEnd>associationStart,
    'Original per-view source association helper must be independently testable');
  const helper=source.slice(associationStart,associationEnd)+source.slice(helperStart,helperEnd);
  const ready=c=>!!c?.ready,regions=c=>c?.ready?c.regions:[],
    fieldGroups=(c,r)=>c?.groups?.[r]||[],
    meshes=c=>(c?.regions||[]).map(region=>({region,complete:true})),
    components=g=>g?.kind==='vector'?[{v:'magnitude',t:'Magnitude'}]:[{v:'value',t:'Value'}],
    byCase=()=>models.find(c=>String(c.id)===String(bound.fcCase.value));
  const refreshB=new Function('cases','document','fvCaseViewAvailable','fcCase',
    'fvReadyRegions','fvMeshes','fvFieldGroups','fcUi','fcEsc',
    'fvAssociationLabel','fvFieldComponents','fcUpdateLabels','fcScheduleToolbarSync',
    helper+source.slice(bBegin,bEnd)+';return fcRefreshSelectors')(
    models,{getElementById:id=>bound[id]||null},ready,byCase,regions,meshes,
    fieldGroups,(en)=>en,String,x=>x,components,()=>{},()=>{});
  refreshB(true);
  assert.deepStrictEqual(bound.fcCase.options.map(o=>o.value),['B14','C14','D14'],
    'B must show every originally imported case, including B14 before its field catalog finishes indexing');
  assert.equal(bound.fcCase.value,'C14',
    'B should select an actually renderable source instead of silently defaulting to nonrenderable B14');
  bound.fcCase.value='B14';refreshB(true);
  assert.equal(bound.fcCase.value,'B14','explicitly chosen case B14 may not be replaced by A or C14');
  assert.equal(bound.fcField.value,'','B14 without imported fields may not invent a CFD value');
  primary.fvCase.value='D14';refreshB(true);
  assert.equal(bound.fcCase.value,'B14','changing A may not overwrite the selected B source');
  models[0].ready=true;models[0].groups.metal=[{name:'T',kind:'scalar',storage:'volume'}];
  refreshB(true);
  assert.equal(bound.fcField.value,'T','B14 should become renderable after its actual field inventory arrives');

  const eBegin=source.indexOf('function fcExtraRefreshSelectors(state,preserve=true){'),
    eEnd=source.indexOf('function fcExtraInvalidateFrame(',eBegin);
  assert(eBegin>0&&eEnd>eBegin,'C/D real selector owner required');
  const extraControls=new Map();
  const extraDom=(id,suffix)=>{
    const key=String(id)+suffix;
    if(!extraControls.has(key))extraControls.set(key,makeSelect());
    return extraControls.get(key)
  };
  const refreshed=new Function('cases','fcExtraDom','fvCaseViewAvailable','fcEsc',
    'document','fcExtraCase','fvReadyRegions','fcUi','fvFieldGroups',
    'fvAssociationLabel','fvFieldComponents','fcExtraUpdateLabel','fcScheduleToolbarSync',
    helper+source.slice(eBegin,eEnd)+';return fcExtraRefreshSelectors')(
    models,extraDom,ready,String,{getElementById:id=>primary[id]||null},
    state=>models.find(c=>String(c.id)===String(extraDom(state.id,'Case').value)),
    regions,en=>en,fieldGroups,x=>x,components,()=>{},()=>{});
  const c={id:3},d={id:4};refreshed(c,true);refreshed(d,true);
  assert.deepStrictEqual(extraDom(3,'Case').options.map(o=>o.value),['B14','C14','D14']);
  assert.deepStrictEqual(extraDom(4,'Case').options.map(o=>o.value),['B14','C14','D14']);
  extraDom(3,'Case').value='B14';extraDom(4,'Case').value='D14';
  refreshed(c,true);refreshed(d,true);
  assert.equal(extraDom(3,'Case').value,'B14');
  assert.equal(extraDom(4,'Case').value,'D14','C and D must remain independent of each other');

  const workspaceSource=fs.readFileSync(path.join(dir,'v14-zz-field-workspace.js'),'utf8');
  const recoverStart=workspaceSource.indexOf('function fwRecoverInitialRenderableCase(){'),
    recoverEnd=workspaceSource.indexOf('function fwMount3D(){',recoverStart);
  assert(recoverStart>0&&recoverEnd>recoverStart);
  const selected={value:'B14'},primaryState={mesh:null,time:NaN},chosen=[];
  const recover=new Function('cases','document','fvCaseViewAvailable','fvRefreshSelectors','fvState',
    workspaceSource.slice(recoverStart,recoverEnd)+';return fwRecoverInitialRenderableCase')(
    models,{getElementById:()=>selected},ready,
    ()=>chosen.push(selected.value),primaryState);
  models[0].ready=false;
  assert.equal(recover(),true,'empty A should recover from unavailable B14');
  assert.equal(selected.value,'C14');
  assert.deepStrictEqual(chosen,['C14']);
  selected.value='B14';primaryState.mesh={};
  assert.equal(recover(),false,'an active user-loaded scene must not be switched to another case');
  assert.equal(selected.value,'B14');
  console.log('Granada original A/B/C/D case-catalog visibility, independent selections and initial 3D recovery PASS');
}


// Original OpenFOAM storage associations are part of field identity.
// B and C/D must resolve the correct component inventory when a volume and
// surface field share a name (not merely preserve the visible dropdown label).
{
  const matching=[...source.matchAll(/const selectedStorage=fcSelectedAssociation\(fieldSel\),([\s\S]*?),components=/g)];
  assert.equal(matching.length,2,'B and C/D must both resolve field associations');
  const fields=[{name:'U',kind:'scalar',storage:'volume'},
    {name:'U',kind:'vector',storage:'surface'}];
  for(const match of matching){
    const resolver=new Function('groups','fieldSel','fcSelectedAssociation',
      'const selectedStorage=fcSelectedAssociation(fieldSel),'+match[1]+';return group');
    const fieldSel={value:'U',selectedOptions:[{dataset:{storage:'surface'}}]};
    assert.strictEqual(resolver(fields,fieldSel,()=> 'surface'),fields[1],
      'Selecting a surface vector must not load scalar-volume components');
    assert.strictEqual(resolver(fields,fieldSel,()=> 'volume'),fields[0],
      'Selecting a volume scalar must not load surface-vector components');
    assert.strictEqual(resolver(fields,fieldSel,()=> 'point'),null,
      'Unknown source association may not silently borrow another field');
  }
}

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
    'fvRender','fcRender','fcExtraRender','fvRegionPalette','fvAssociationLabel',
    source.slice(menuStart,menuEnd)+';return fcPhysicalMenu;'
  )(()=>ctx,list,physical.fcPhysicalChoiceList,()=>choice,physical.fcPhysicalFor,groups,fvFieldComponents,
    physical.fcReconcilePhysicalChoice,{getElementById:id=>({value:id==='language'?locale:'U'}),documentElement:{lang:'en'}},()=>true,
    (en,es)=>locale==='es'?es:en,v=>String(v),()=>{},()=>Promise.resolve(),()=>{}, {time:0},()=>{},()=>{},()=>{},ch=>ch?.palette||'viridis',storage=>storage||'volume');

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
  // A B/C/D physical-region menu may contain a second same-name field
  // with a different original OpenFOAM storage association. Reindexing that
  // OTHER option must invalidate the menu even if the primary selected
  // field and its vector components have not changed.
  caseMenu.groups.set('metal',[
    {name:'U',kind:'vector',storage:'volume'},
    {name:'T',kind:'scalar',storage:'volume'}]);
  menu('A');
  const beforeStorageChange=holderA.renders;
  assert(holderA.innerHTML.includes('value="T" data-storage="volume"'));
  caseMenu.groups.set('metal',[
    {name:'U',kind:'vector',storage:'volume'},
    {name:'T',kind:'scalar',storage:'surface'}]);
  menu('A');
  assert.equal(holderA.renders,beforeStorageChange+1,
    'Source association changes must refresh the existing physical-region menu');
  assert(holderA.innerHTML.includes('value="T" data-storage="surface"'),
    'New original surface option must be represented without a manual refresh');
  assert.equal(choice.field,'U','Reindexing a different field may not replace selected U');
  assert.equal(choice.storage,'volume','The selected physical source association must remain independent');
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
    'fcSyncIndependentTimePicker','fcSyncIndependentPlaybackControls',
    source.slice(start,stop)+';return fcSyncToolbars;');
  const refresh=factory(dom,api.fcViewSourceMap,view=>menus.push(view),
    ()=>{/* B/C/D picker is tested below */},()=>{/* per-view playback controls are tested below */});
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
  const remove=new Function('fcExtraViews','fcPhysicalRelease','fcExtraDom','fcUpdateLayout',
    'fcScheduleToolbarSync','fcStopIndependentPlayback',
    source.slice(start,end)+';return fcExtraRemove;')(
    live,(state)=>released.push(state.id),()=>null,()=>{},()=>{},
    id=>released.push('timer-'+id));
  assert.strictEqual(remove(3),true);
  assert.strictEqual(live.length,0);
  assert.strictEqual(removed.seq,18,'Pending asynchronous read must be invalidated on removal');
  assert.deepStrictEqual(released,['timer-3',3],
    'C playback must stop before the original OpenFOAM mesh releases');
  assert.strictEqual(remove(3),false,'Repeated click cannot reuse already deleted view');
}
for(const fragment of [
  "fcAddViewportToolbar(primary,'A')","fcAddViewportToolbar(second,'B')","fcAddViewportToolbar(viewport,id)",
  "fcScheduleToolbarSync()","source.dispatchEvent(new Event('change',{bubbles:true}))",
  "e.dataTransfer?.setData('text/plain',viewport.id)","fcMoveViewport(viewport.parentElement,fcDraggedView,viewport",
  "data-fc-zoom=","data-fc-fit=","fcFitViewport(", "fcViewToolbar","fcViewPicker","fcViewZoom",
  "FC_MAX_TOTAL_VIEWS=4","if(oldCase&&loaded.some(c=>String(c.id)===String(oldCase)))"
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
  // GRANADA: actual B selector refresh is run on every OpenFOAM 3D frame.
  // Its original, expensive option DOM must remain stable just like C/D.
  // Exercise the production function rather than a rewritten mock algorithm.
  const bStart=source.indexOf('function fcRefreshSelectors(preserve=true){');
  const bEnd=source.indexOf('function fcMvp(',bStart);
  const helperStart=source.indexOf('function fcExtraSetOptionMarkup(');
  const helperEnd=source.indexOf('function fcExtraRefreshSelectors(',helperStart);
  assert(bStart>=0&&bEnd>bStart&&helperStart>=0&&helperEnd>helperStart);
  const bSource=source.slice(bStart,bEnd);
  for(const selector of ['caseSel','regionSel','fieldSel','componentSel'])
    assert(bSource.includes('fcExtraSetOptionMarkup('+selector+','),
      'B must reuse the original '+selector+' select instead of rebuilding it every frame');
  const makeSelect=()=>{
    let html='',value='',writes=0;
    return {
      get innerHTML(){return html},
      set innerHTML(next){
        writes++;html=String(next);
        const options=[...html.matchAll(/<option value="([^"]*)"/g)].map(m=>m[1]);
        if(!options.includes(value))value=options[0]||'';
      },
      get value(){return value},
      set value(next){value=String(next)},
      get writes(){return writes}
    };
  };
  const bControls={fcCase:makeSelect(),fcRegion:makeSelect(),
    fcField:makeSelect(),fcComponent:makeSelect(),
    fvCase:{value:'B3'},fvRegion:{value:'metal'},
    fvField:{value:'T'},fvComponent:{value:'value'},fcBadge:{textContent:''}};
  const bCases=[
    {id:'B3',name:'B3',regions:['metal','mold'],groups:{
      metal:[{name:'T',kind:'scalar',storage:'volume'},
        {name:'U',kind:'vector',storage:'volume'}],
      mold:[{name:'T',kind:'scalar',storage:'volume'}]}},
    {id:'C3',name:'C3',regions:['metal'],groups:{
      metal:[{name:'alpha1',kind:'scalar',storage:'volume'}]}}
  ];
  const bDocument={getElementById:id=>bControls[id]||null};
  const associationSourceStart=source.indexOf('function fcSelectedAssociation(select){');
  const associationSourceEnd=source.indexOf('function fcCurrentFieldStorage(',associationSourceStart);
  assert(associationSourceStart>=0&&associationSourceEnd>associationSourceStart,
    'Original physical source association helper must be available to all isolated selector tests');
  const associationSource=source.slice(associationSourceStart,associationSourceEnd);
  const bRefresh=new Function('cases','document','fvCaseViewAvailable',
    'fcCase','fvReadyRegions','fvMeshes','fvFieldGroups','fcUi','fcEsc',
    'fvAssociationLabel','fvFieldComponents','fcUpdateLabels','fcScheduleToolbarSync',
    associationSource+source.slice(helperStart,helperEnd)+bSource+';return fcRefreshSelectors;')(
    bCases,bDocument,()=>true,
    ()=>bCases.find(c=>String(c.id)===bControls.fcCase.value),
    c=>c?.regions||[],c=>(c?.regions||[]).map(region=>({region,complete:true})),
    (c,region)=>c?.groups?.[region]||[],en=>en,String,s=>s,
    g=>g?.kind==='vector'?[{v:'x',t:'X'},{v:'y',t:'Y'}]:[{v:'value',t:'Value'}],
    ()=>{},()=>{});
  bRefresh(true);
  const countB=()=>Object.fromEntries(['fcCase','fcRegion','fcField','fcComponent']
    .map(id=>[id,bControls[id].writes]));
  assert.deepStrictEqual(countB(),
    {fcCase:1,fcRegion:1,fcField:1,fcComponent:1});
  for(let i=0;i<256;i++)bRefresh(true);
  assert.deepStrictEqual(countB(),
    {fcCase:1,fcRegion:1,fcField:1,fcComponent:1},
    '256 native Field B playback frames must not replace unchanged case, region, field and component options');
  bControls.fcField.value='U';bRefresh(true);
  assert.equal(bControls.fcField.value,'U','the selected real OpenFOAM field remains U');
  assert.equal(bControls.fcComponent.value,'x','a vector updates to its original component catalog');
  assert.deepStrictEqual(countB(),
    {fcCase:1,fcRegion:1,fcField:1,fcComponent:2},
    'changing field updates only genuinely different component options');
  bControls.fcCase.value='C3';bRefresh(true);
  assert.equal(bControls.fcField.value,'alpha1','new case updates the original field catalog');
  assert.equal(bControls.fcComponent.value,'value','scalar selector has the correct component');
  assert.deepStrictEqual(countB(),
    {fcCase:1,fcRegion:2,fcField:2,fcComponent:3});
  bCases[1].groups.metal.push({name:'T',kind:'scalar',storage:'volume'});
  bRefresh(true);
  assert.equal(bControls.fcField.writes,3,
    'a genuine newly imported field still invalidates the selector cache');
  bRefresh(false);
  assert.deepStrictEqual(countB(),
    {fcCase:2,fcRegion:3,fcField:4,fcComponent:4},
    'explicit source reset still rebuilds each real selector');
  console.log('Granada B original OpenFOAM field selector reuse PASS: 256 frames, source changes and explicit reset');

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
    associationSource+source.slice(start,end)+';return{fcExtraRefreshSelectors,fcExtraSetOptionMarkup};');
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
  // Failed original OpenFOAM frames must NOT leave pixels from an earlier
  // physical time visible on B, C or D. Execute the native clear helper with
  // WebGL canvas, metric axes/XYZ labels and per-region legends.
  const start=source.indexOf('function fcBlankInvalidFieldViewport('),
    end=source.indexOf('function fcClearRenderer(){',start);
  assert(start>=0&&end>start,'Native invalid-viewport GPU cleanup required');
  const blank=new Function(source.slice(start,end)+';return fcBlankInvalidFieldViewport')();
  const log=[],gl={COLOR_BUFFER_BIT:0x4000,DEPTH_BUFFER_BIT:0x100,
    viewport:(...v)=>log.push(['viewport',...v]),
    clearColor:(...v)=>log.push(['color',...v]),
    clear:v=>log.push(['clear',v])};
  const mk=(cls,html='stale')=>({innerHTML:html,textContent:html,hidden:false,
    classList:{contains:v=>v===cls,add:v=>log.push(['hide',cls,v])}});
  const axes=mk('fcMetricAxes'),bounds=mk('fcMetricBounds'),
    legend=mk('fcLegend'),physical=mk('fcPhysicalLegends'),probe=mk('fcProbeMarker');
  blank({width:450,height:310},{gl},{querySelectorAll:()=>[axes,bounds,physical,legend,probe]});
  assert.deepStrictEqual(log.slice(0,3),[
    ['viewport',0,0,450,310],['color',0,0,0,0],['clear',0x4100]],
    'WebGL invalidation must really erase old color and depth buffers');
  assert.equal(axes.innerHTML,'','Old XYZ axes cannot persist into missing C/D physical time');
  assert.equal(bounds.textContent,'','Old dimensional numbers cannot persist');
  assert.equal(bounds.hidden,true);
  assert.equal(physical.innerHTML,'','Old metal/mold legends cannot remain visible');
  assert.equal(legend.innerHTML,'','Old color legend must not present prior physics');
  assert(log.some(x=>x[0]==='hide'&&x[1]==='fcLegend'));
  assert(log.some(x=>x[0]==='hide'&&x[1]==='fcProbeMarker'));
  assert.equal(probe.innerHTML,'stale',
    'Probe marker must keep its reusable child for a later valid source pick');
  const validDuringLoad=source.slice(source.indexOf('async function fcExtraRefreshFrame('),
    source.indexOf('async function fcRefreshExtras(){'));
  assert(!validDuringLoad.includes('fcBlankInvalidFieldViewport'),
    'A valid source frame must stay visible while the next file is loading');
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
    'fcBlankInvalidFieldViewport','fcUpdateStatsGrid',
    source.slice(invalidStart,invalidEnd)+';return fcExtraInvalidateFrame;')(
    ()=>counts.release++,()=>{},helpers.fcExtraDom,
    ()=>counts.blank=(counts.blank||0)+1,()=>counts.stats++);
  state.seq=4;state.time=9.8;invalidation(state,'missing measured time');
  assert.equal(state.seq,5);
  assert.strictEqual(state.geometryUpload,null,'Invalidated frame must forget old GPU buffers');
  assert.strictEqual(state.mesh,null);
  assert(Number.isNaN(state.time),'Missing physical timestamps must not retain prior time');
  assert.equal(state.renderer.surfaceCount,0,'Stale surface vertices cannot remain drawable');
  assert.equal(counts.blank,1,'C/D invalidation must blank the old WebGL framebuffer');
  upload(state,data(meshB,'volume',123));
  assert.equal(counts.surfaceBuild,4,'Restoring valid frame after invalidation uploads fresh GPU geometry');
}


{
  // Native Field B shares the scientific no-data contract with C/D. Clearing
  // a failed or disabled original source must not leave a plausible stale
  // measured time, range or sync marker visible after its mesh disappears.
  const begin=source.indexOf('function fcClearRenderer(){');
  const end=source.indexOf('function fcSetStatus(',begin);
  assert(begin>=0&&end>begin,'Original B frame invalidation handler required');
  const state={seq:10,mesh:{id:'stale'},fieldValues:[888],fieldParsed:{},
    range:{valid:true,min:300,max:1000},time:9.8,delta:.2,
    sync:{ok:true,exact:true,time:9.8},differenceValues:[20],
    differenceRange:{valid:true},vectorValues:[1],streamlines:[{}],
    probe:{value:888},renderer:{surfaceCount:12,probeCount:1},
    differenceRenderer:{surfaceCount:8}};
  const ops={released:0,renders:0,labels:0,stats:0,extraClears:0,blanks:0};
  const clear=new Function('fcState','document','fcExtraViews','fcExtraInvalidateFrame',
    'fcUi','fcPhysicalRelease','fcRender','fcUpdateLabels','fcUpdateStatsGrid',
    'fcBlankInvalidFieldViewport',
    source.slice(begin,end)+';return fcClearRenderer;')(
    state,{getElementById:()=>({checked:true})},[{id:3}],
    ()=>ops.extraClears++,en=>en,()=>ops.released++,
    ()=>ops.renders++,()=>ops.labels++,()=>ops.stats++,()=>ops.blanks++);
  clear();
  assert.equal(state.seq,11,'superseded B request must be invalidated');
  assert.equal(state.mesh,null);assert.equal(state.fieldValues,null);
  assert.equal(state.range,null,'invalid Field B frame cannot retain prior numeric range');
  assert(Number.isNaN(state.time),'invalid Field B frame must not display old physical time');
  assert(Number.isNaN(state.delta),'invalid Field B frame must not retain stale sync delta');
  assert.equal(state.sync,null,'invalid Field B frame cannot claim old synchronization');
  assert.equal(state.differenceValues,null,'old A−B difference must be erased');
  assert.equal(state.renderer.surfaceCount,0,'stale B mesh cannot remain drawable');
  assert.equal(state.differenceRenderer.surfaceCount,0,'stale difference cannot remain drawable');
  assert.deepStrictEqual(ops,{released:1,renders:1,labels:1,stats:1,extraClears:0,blanks:2},
    'B clearing refreshes original labels and stats without clearing independent C/D');
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
    fcPrimaryPhysicalTime:()=>bTarget,fcIndependentTimeTarget:()=>bTarget,fcFieldFor:()=>({times:[9.8,10,11]}),
    fcResolveTime:(times,target)=>({ok:true,time:target,delta:0}),
    fcMode:()=> 'nearest',fcSetStatus:()=>{},fcUi:en=>en,
    fcLoadSynchronizedData:(c,g,region,target)=>bPending.get(target).promise,
    fcUploadMesh:()=>{bUploads++},fcApplySharedRange:range=>range,
    fcUpdateDerived:()=>{},fcUpdateViewportLegend:()=>{},
    fcVisualFor:()=>({palette:'viridis'}),fcUpdateStatsGrid:()=>{},
    fcUpdateDifference:()=>{},fvState:{mesh:{},fieldValues:[]},
    fcUpdateVectors:async()=>{},fcUpdateLabels:()=>{},fcPhysicalMenu:()=>{},
    fcRender:()=>{},fcRenderDifference:()=>{},fcPhysicalLoad:async()=>{},fvAssociationLabel:()=> 'volume',
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
    fcPrimaryPhysicalTime:()=>cTarget,fcIndependentTimeTarget:()=>cTarget,
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

  // A source loader may complete normally with ok:false instead of throwing
  // (e.g., a missing native OpenFOAM field in a newer physical-time folder).
  // That must invalidate the real old C/D geometry and measured time too.
  cTarget=12;cPending.set(12,deferred());
  const unavailableC=loadC(cState);
  cPending.get(12).resolve({ok:false,sync:{ok:false,time:12}});
  await unavailableC;
  assert.equal(cClears,2,'Resolved unavailable C/D frame clears old source-backed physics');
  assert.strictEqual(cState.mesh,null,'Failed C/D view cannot retain an earlier 3D mesh');
  assert(Number.isNaN(cState.time),'Failed C/D view cannot claim a measured physical timestamp');
  assert.equal(cUploads,1,'Resolved unavailable C/D frame must not upload a phantom mesh');

  // A superseded ok:false result must never clear a newer valid C/D frame.
  cTarget=13;cPending.set(13,deferred());const staleUnavailable=loadC(cState);
  cTarget=14;cPending.set(14,deferred());const newestC=loadC(cState);
  const validLater={ok:true,mesh:{name:'C latest 14s'},storage:'volume',
    fieldValues:[273],parsed:{dimensions:'K'},range:{valid:true},sync:{time:14,delta:0}};
  cPending.get(14).resolve(validLater);await newestC;
  assert.equal(cState.time,14);assert.equal(cUploads,2);
  cPending.get(13).resolve({ok:false,sync:{ok:false,time:13}});await staleUnavailable;
  assert.equal(cClears,2,'Stale resolved no-data C/D frame must not erase newer 14s physics');
  assert.strictEqual(cState.mesh,validLater.mesh);

  // Native C and D have independent source meshes and sequences. Neither
  // should wait for a slow other region during a multi-view time refresh.
  const extrasStart=source.indexOf('async function fcRefreshExtras(){');
  const extrasEnd=source.indexOf('function fcRenderExtras()',extrasStart);
  assert(extrasStart>=0&&extrasEnd>extrasStart,
    'Actual C/D refresh coordinator must remain in the Field source');
  const started=[],finished=[],resolvers=new Map();
  const runBoth=new Function('fcExtraViews','fcExtraRefreshFrame',
    source.slice(extrasStart,extrasEnd)+';return fcRefreshExtras;')(
    [{id:3},{id:4}],
    state=>new Promise(resolve=>{
      started.push(state.id);
      resolvers.set(state.id,()=>{finished.push(state.id);resolve()})
    }));
  const both=runBoth();
  assert.deepStrictEqual(started,[3,4],
    'C and D physical OpenFOAM reads must start concurrently, not serially');
  resolvers.get(4)();await Promise.resolve();
  assert.deepStrictEqual(finished,[4],
    'D may complete while slow C remains pending without corrupting source order');
  resolvers.get(3)();await both;
  assert.deepStrictEqual(finished,[4,3],
    'multi-view refresh finishes when both independent real source loads complete');
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
      querySelectorAll(key){return key==='[data-fc-camera-preset]'||
        key==='[data-fc-camera-preset], [data-fc-projection]'?buttons:[]}};
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
  assert(toolbar.includes('class="fcViewSourceDetails"><summary>'),
    'Advanced per-view Field/Region/Component controls must be collapsible and closed initially');
  assert(toolbar.includes('fcQuickCase')&&toolbar.includes('data-fc-bind="Case"'),
    'A/B/C/D own original OpenFOAM Case dropdown must remain visible without expanding tools');
  assert(toolbar.indexOf('data-fc-bind="Case"')<toolbar.indexOf('class="fcViewSourceDetails"'),
    'Each real case source must be directly editable before the advanced disclosure');
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
  assert(source.includes("region,ch?.visible,ch?.visibilityExplicit,ch?.field,ch?.storage,ch?.component,ch?.palette"),
    'physical field association must refresh the menu, but volatile alpha cannot destroy the active thumb');
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


// Granada projection fidelity: A/B/C/D share the actual physical matrix
// contract. Previously B/C/D always used perspective, while their source XYZ
// readout incorrectly claimed Orthographic. Tests execute production logic.
{
  const synchA=source.indexOf('function fcSyncedCamera(primaryCamera,primaryMesh,compareMesh){');
  const synchB=source.indexOf('function fcArrayEqualNumeric(',synchA);
  const cloneA=source.indexOf('function fcCloneCamera(camera){');
  const cloneB=source.indexOf('function fcCamerasLinked(){',cloneA);
  const matrixA=source.indexOf('function fcMvpForCamera(camera,canvas){');
  const matrixB=source.indexOf('function fcPanCamera(',matrixA);
  assert(synchA>0&&synchB>synchA&&cloneA>0&&cloneB>cloneA&&matrixA>0&&matrixB>matrixA);
  const mesh={boundsMin:[0,0,0],boundsMax:[2,4,6]};
  const diag=m=>Math.hypot(...m.boundsMin.map((v,i)=>m.boundsMax[i]-v));
  const linkedCamera=new Function('fcMeshDiag',
    source.slice(synchA,synchB)+';return fcSyncedCamera;')(diag);
  const A={yaw:.7,pitch:.4,target:[0,0,0],distance:14,projection:'orthographic'};
  const synced=linkedCamera(A,mesh,mesh);
  assert.equal(synced.projection,'orthographic','linked B must inherit A physical projection');
  A.projection='perspective';
  assert.equal(linkedCamera(A,mesh,mesh).projection,'perspective',
    'linked C/D must immediately inherit A perspective without changing source data');
  const cloned=new Function('fvState',source.slice(cloneA,cloneB)+';return fcCloneCamera;')(
    {camera:{projection:'orthographic'}});
  assert.equal(cloned(synced).projection,'orthographic');
  assert.equal(cloned({...synced,projection:'perspective'}).projection,'perspective',
    'independent camera snapshots must preserve actual projection');
  const rendered=[];
  const mvp=new Function('fvState','fvCameraBasis','fvPerspective','fvOrtho','fvLookAt','fvMat4Mul',
    source.slice(matrixA,matrixB)+';return fcMvpForCamera;')(
      {camera:A},()=>({upRef:[0,1,0]}),
      (fovy,aspect,near,far)=>{rendered.push({mode:'perspective',aspect,near,far});return{mode:'perspective'}},
      (left,right,bottom,top,near,far)=>{rendered.push({mode:'orthographic',left,right,bottom,top,near,far});return{mode:'orthographic'}},
      ()=>({}),projection=>projection);
  const c={yaw:0,pitch:0,distance:10,target:[0,0,0],projection:'orthographic'};
  assert.equal(mvp(c,{width:320,height:700}).mode,'orthographic');
  assert.equal(rendered[0].mode,'orthographic');
  assert(rendered[0].right>0&&rendered[0].left<0);
  assert.equal(Number((rendered[0].right/rendered[0].top).toFixed(6)),
    Number((320/700).toFixed(6)),'orthographic X/Y physical aspect must match pane');
  c.projection='perspective';
  assert.equal(mvp(c,{width:320,height:700}).mode,'perspective');
  assert.equal(rendered[1].mode,'perspective');
  assert.equal(rendered[1].aspect,320/700);
  assert(rendered[1].near>0&&rendered[1].far>rendered[1].near);
  assert(source.includes("camera?.projection==='perspective'?fcUi('Perspective','Perspectiva')"),
    'numeric XYZ projection label must describe the actual rendered camera');
  console.log('Granada Field physical projection matrix PASS: linked inheritance, independent snapshots, aspect-correct ortho/perspective');
}

// A/B/C/D projection buttons reuse the native A camera in linked mode.
// Independent B and C retain their own projection and real source meshes.
{
  const begin=source.indexOf('function fcSetViewportProjection(view,mode){');
  const end=source.indexOf('function fcCameraPresetMenu(letter){',begin);
  assert(begin>0&&end>begin,'original projection controls must exist');
  const mesh={boundsMin:[0,0,0],boundsMax:[2,2,2]};
  const A={camera:{projection:'orthographic'},mesh};
  const B={enabled:true,camera:{projection:'orthographic',yaw:.2,pitch:.3,distance:8,target:[1,1,1]},mesh};
  const C={id:3,camera:{projection:'perspective',yaw:.4,pitch:.5,distance:9,target:[1,1,1]},mesh};
  const D={id:4,camera:{projection:'orthographic',yaw:.6,pitch:.7,distance:10,target:[1,1,1]},mesh};
  const clones=c=>({...c,target:c.target?.slice(),projection:c.projection||'orthographic'});
  let linked=false,failFit=false,requested=null;
  const renders=[],fits=[];
  const funcs=new Function('fvState','fcState','fcExtraViews','fcFitMeshForView',
    'fcValidFitMesh','fcCamerasLinked','fvSetPhysicalProjection','fcRender',
    'fcRenderDifference','fcRenderExtras','fcCloneCamera','fcCameraFor',
    'fcFitCameraState','fcExtraRender','fcScheduleCameraPresetSync','fcUi',
    source.slice(begin,end)+';return {fcSetViewportProjection,fcCameraProjectionLabel};')(
    A,B,[C,D],(view,state,original)=>original,
    m=>!!m?.boundsMin,()=>linked,
    mode=>{A.camera.projection=mode;requested=mode},
    ()=>renders.push('B'),()=>renders.push('Δ'),()=>renders.push('extras'),
    clones,state=>state.camera,
    (state,m)=>{fits.push(state);return failFit?false:true},
    state=>renders.push(state.id),()=>{},(en,es)=>en);
  assert.equal(funcs.fcSetViewportProjection('B','perspective'),true);
  assert.equal(B.camera.projection,'perspective');
  assert.equal(C.camera.projection,'perspective');
  assert.equal(D.camera.projection,'orthographic','B must not alter D projection');
  assert.equal(A.camera.projection,'orthographic','unlinked B cannot change original A');
  assert.deepStrictEqual(renders,['B','Δ']);
  assert.equal(funcs.fcSetViewportProjection(3,'orthographic'),true);
  assert.equal(C.camera.projection,'orthographic');
  assert.deepStrictEqual(fits,[B,C]);
  assert.deepStrictEqual(renders,['B','Δ',3]);
  linked=true;
  const savedB=clones(B.camera),savedC=clones(C.camera),savedD=clones(D.camera);
  assert.equal(funcs.fcSetViewportProjection('B','perspective'),true);
  assert.equal(requested,'perspective','linked B delegates to native A projection UI');
  assert.equal(A.camera.projection,'perspective');
  assert.deepStrictEqual(B.camera,savedB,'linked adjustment must preserve independent B');
  assert.deepStrictEqual(C.camera,savedC);
  assert.deepStrictEqual(D.camera,savedD);
  assert.deepStrictEqual(renders.slice(-3),['B','Δ','extras']);
  linked=false;
  failFit=true;
  assert.equal(funcs.fcSetViewportProjection(4,'perspective'),false);
  assert.deepStrictEqual(D.camera,savedD,'failed source-mesh Fit restores original D projection');
  assert.equal(funcs.fcSetViewportProjection('B','foobar'),false);
  assert.equal(funcs.fcSetViewportProjection(7,'perspective'),false);
  B.enabled=false;
  assert.equal(funcs.fcSetViewportProjection('B','orthographic'),false,
    'no phantom compare B camera may be created when only A exists');
  assert.equal(funcs.fcCameraProjectionLabel('orthographic'),'Orthographic');
  assert.equal(funcs.fcCameraProjectionLabel('perspective'),'Perspective');
  const localMenu=new Function('fcUi','fcEsc',
    source.slice(end,source.indexOf('// A viewport\'s camera may be rotated',end))+
    ';return fcCameraPresetMenu;')((en,es)=>es,String);
  const markup=localMenu('C');
  assert(markup.includes('data-fc-projection="orthographic"'));
  assert(markup.includes('data-fc-projection="perspective"'));
  assert(markup.includes('aria-pressed="false"'));
  assert(markup.includes('Proyección de vista C'));
  assert(source.includes("fcSetViewportProjection(view,button.dataset.fcProjection)"),
    'each original viewport menu must bind its own projection controls');
  assert(source.includes("[data-fc-camera-preset], [data-fc-projection]"),
    'camera keyboard navigation includes projection buttons');
  console.log('Granada Field projection controls PASS: source-backed A/B/C/D, linked/independent, rollback, Spanish aria and no phantom views');
}


// Granada linked physical camera unions: source-backed metal+mold geometry
// must fit the ACTUAL B/C/D canvas, not the selected primary metal diagonal.
// Linked camera remains purely derived: independent source views are unchanged.
{
  const begin=source.indexOf('function fcLinkedPhysicalCamera(state,mesh){');
  const end=source.indexOf('function fcMvpForCamera(camera,canvas){',begin);
  const syncedStart=source.indexOf('function fcSyncedCamera(primaryCamera,primaryMesh,compareMesh){');
  const syncedEnd=source.indexOf('function fcArrayEqualNumeric(',syncedStart);
  const cloneStart=source.indexOf('function fcCloneCamera(camera){');
  const cloneEnd=source.indexOf('function fcCamerasLinked(){',cloneStart);
  const validStart=source.indexOf('function fcValidFitMesh(mesh){');
  const validEnd=source.indexOf('function fcFitViewport(view){',validStart);
  assert(begin>0&&end>begin&&syncedStart>0&&syncedEnd>syncedStart&&
    cloneStart>0&&cloneEnd>cloneStart&&validStart>0&&validEnd>validStart);
  const m=(min,max)=>({boundsMin:min,boundsMax:max});
  const primaryA=m([-2,-2,-2],[12,12,12]);
  const rawB=m([0,0,0],[1,1,1]);
  const rawC=m([4,4,4],[5,5,5]);
  const metalMoldB={min:[-24,-5,-16],max:[28,15,20]};
  const metalMoldC={min:[-24,-5,-16],max:[28,15,20]};
  const B={id:2,mesh:rawB,_fcPhysical:{},camera:{yaw:.2,pitch:.3,distance:8,target:[0,0,0],projection:'perspective'}};
  const C={id:3,mesh:rawC,_fcPhysical:{},camera:{yaw:.5,pitch:.6,distance:9,target:[4,4,4],projection:'perspective'}};
  const D={id:4,mesh:rawC,_fcPhysical:{},camera:{yaw:.5,pitch:.6,distance:7,target:[4,4,4],projection:'perspective'}};
  const A={mesh:primaryA,camera:{yaw:.72,pitch:.42,distance:30,
    target:[5,5,5],projection:'orthographic'}};
  const canvases={
    fvCanvas:{clientWidth:900,clientHeight:500},
    fcCanvas:{clientWidth:260,clientHeight:680},
    fcExtra3Canvas:{clientWidth:720,clientHeight:260},
    fcExtra4Canvas:{clientWidth:420,clientHeight:420}
  };
  let primary={min:[-2,-2,-2],max:[12,12,12]},linked=true;
  const physical=new Map([[B,metalMoldB],[C,metalMoldC],[D,null]]);
  const docs={getElementById:id=>canvases[id]||null};
  const diag=mesh=>Math.hypot(...mesh.boundsMin.map((v,i)=>mesh.boundsMax[i]-v));
  const sync=new Function('fcMeshDiag',source.slice(syncedStart,syncedEnd)+';return fcSyncedCamera;')(diag);
  const clone=new Function('fvState',source.slice(cloneStart,cloneEnd)+';return fcCloneCamera;')(A);
  const val=new Function(source.slice(validStart,validEnd)+';return fcValidFitMesh;')();
  const fits=[];
  const fit=(bounds,camera,canvas)=>{
    fits.push({bounds,camera,canvas});
    const span=bounds.max.map((v,i)=>v-bounds.min[i]);
    const aspect=canvas.clientWidth/canvas.clientHeight;
    return Math.max(span[0]/aspect,span[1],span[2])*.9+10
  };
  const handlers=new Function('fvState','fcState','fcCamerasLinked',
    'fcCloneCamera','fvPhysicalBoundsForScene','fcPhysicalBoundsFor',
    'fcValidFitMesh','fcSyncedCamera','fcMeshDiag','fvFitDistance','document',
    source.slice(begin,end)+';return {fcLinkedPhysicalCamera,fcCameraFor};')(
    A,B,()=>linked,clone,()=>primary,state=>physical.get(state)||null,
    val,sync,diag,fit,docs);
  const initialB=JSON.stringify(B.camera),initialC=JSON.stringify(C.camera);
  const cameraB=handlers.fcCameraFor(B,rawB);
  const cameraC=handlers.fcCameraFor(C,rawC);
  assert.equal(cameraB.projection,'orthographic',
    'linked B must inherit the actual A physical projection');
  assert.equal(cameraC.projection,'orthographic');
  assert.deepStrictEqual(cameraB.target,[2,5,2],'linked B centers measured metal+mold union');
  assert.deepStrictEqual(cameraC.target,[2,5,2],'linked C independently uses its measured metal+mold union');
  assert.deepStrictEqual(fits.map(x=>x.canvas),[
    canvases.fvCanvas,canvases.fcCanvas,
    canvases.fvCanvas,canvases.fcExtra3Canvas
  ],'the actual A and B/C physical canvas widths set each measured fit');
  assert(cameraB.distance>cameraC.distance,
    'a narrow B canvas must fit the wider mold with more camera distance than C');
  assert.notEqual(cameraB.distance,diag(rawB)/diag(primaryA)*A.camera.distance,
    'never infer linked mold fit from just the selected metal diagonal');
  assert.equal(JSON.stringify(B.camera),initialB,
    'rendering the linked B scene must not overwrite saved independent camera');
  assert.equal(JSON.stringify(C.camera),initialC);
  // Pan the canonical A camera; linked B/C should move relative to their
  // physical union, not snap back to the raw primary mesh center.
  A.camera.target=[7,5,5];
  const movedB=handlers.fcCameraFor(B,rawB);
  assert(movedB.target[0]>cameraB.target[0]);
  assert.equal(movedB.target[1],cameraB.target[1]);
  assert.equal(movedB.distance,cameraB.distance,
    'panning must not change actual linked camera zoom');
  // Zoom A relative to *its own* measured union and verify B preserves that
  // zoom fraction instead of blindly copying A absolute distance.
  A.camera.distance=15;
  const zoomedB=handlers.fcCameraFor(B,rawB);
  assert(Math.abs(zoomedB.distance-cameraB.distance/2)<1e-10,
    'half zoom distance in A produces same relative zoom in B');
  // No visible B geometry (hidden primary, no loaded overlays) must not
  // silently fit the old hidden metal mesh.
  physical.set(B,null);
  const noGeometry=handlers.fcCameraFor(B,rawB);
  assert.deepStrictEqual(noGeometry.target,B.camera.target);
  assert.equal(noGeometry.distance,B.camera.distance);
  assert.equal(noGeometry.projection,B.camera.projection);
  // Invalid source bounds must preserve the last valid independent view.
  physical.set(B,metalMoldB);primary=null;
  assert.equal(handlers.fcCameraFor(B,rawB).distance,B.camera.distance);
  primary={min:[-2,-2,-2],max:[12,12,12]};
  linked=false;
  assert.strictEqual(handlers.fcCameraFor(B,rawB),B.camera,
    'unlinked B must retain the exact original independent camera');
  assert.strictEqual(handlers.fcCameraFor(C,rawC),C.camera);
  // Unlinking while the physical scene is visible starts at the exact
  // physically fitted camera instead of jumping back to the tiny metal box.
  const resyncStart=source.indexOf('function fcResyncCameras(){');
  const resyncEnd=source.indexOf('function fcFitAllCameras(){',resyncStart);
  assert(resyncStart>=0&&resyncEnd>resyncStart);
  primary={min:[-2,-2,-2],max:[12,12,12]};
  const beforeB=handlers.fcLinkedPhysicalCamera(B,rawB);
  const syncScene=new Function('fcState','fcExtraViews','fcCloneCamera',
    'fcLinkedPhysicalCamera','fcRender','fcRenderDifference','fcRenderExtras',
    source.slice(resyncStart,resyncEnd)+';return fcResyncCameras;')(
    B,[C,D],clone,handlers.fcLinkedPhysicalCamera,()=>{},()=>{},()=>{});
  syncScene();
  assert.equal(B.camera.distance,beforeB.distance);
  assert.deepStrictEqual(B.camera.target,beforeB.target);
  assert.deepStrictEqual(D.camera.target,[4,4,4],
    'empty/hidden D must preserve its prior independent camera');
  assert(source.includes("if(fcCamerasLinked())return fcLinkedPhysicalCamera(state,mesh)"),
    'original compare and extra render paths use the physical camera union');
  console.log('Granada linked Field camera PASS: A/B/C visible unions, per-pane aspect, orthographic, pan, zoom, hidden regions, unlink');
}


// Granada independently timed A/B/C/D view controllers. Execute the actual
// OpenFOAM catalog time resolver and native per-pane selector synchronization.
{
  const a=source.indexOf('function fcTimesLinked(){');
  const b=source.indexOf('function fcLinkedPhysicalCamera(',a);
  assert(a>=0&&b>a,'source-owned time unlink controller must exist');
  const B={enabled:true,time:.25,mesh:{},timeTarget:NaN},C={id:3,time:.3,mesh:{}},D={id:4,time:.4,mesh:{}};
  let linked=false,primaryTime=0,language='en';
  const catalogs={
    B:{id:'B3',region:'metal',field:'T',times:[0,.25,.5]},
    C:{id:'C3',region:'mold',field:'U',times:[0,.3,.6]},
    D:{id:'D3',region:'metal',field:'alpha1',times:[0,.4,.8]}
  };
  const input={checked:linked};
  const document={getElementById:id=>id==='fcLinkTimes'?input:null};
  const counts={B:0,C:0,D:0,extra:0,sync:0};
  const current=state=>state===B?'B':state===C?'C':'D';
  const apiTime=new Function('document','fcState','fcExtraViews','fcCase','fcExtraCase',
    'fcRegion','fcExtraRegion','fcCurrentFieldName','fcExtraField','fcCurrentFieldStorage','fcExtraFieldStorage','fcFieldFor',
    'fcPhysicalNumber','fcPrimaryPhysicalTime','fcEsc','fcFmt','fcUi',
    'fcRefreshFrame','fcExtraRefreshFrame','fcRefreshExtras','fcScheduleToolbarSync',
    source.slice(a,b)+
    ';return{fcTimesLinked,fcIndependentTimeSource,fcIndependentTimeTarget,fcSyncIndependentTimePicker,fcSetIndependentTime,fcRefreshTimeLink};')(
    document,B,[C,D],()=>catalogs.B,state=>catalogs[current(state)],
    ()=>catalogs.B.region,state=>catalogs[current(state)].region,
    ()=>catalogs.B.field,state=>catalogs[current(state)].field,
    () => '',() => '',
    (c,region,field)=>c.region===region&&c.field===field?{times:c.times}:null,
    value=>Number(value),()=>primaryTime,String,String,(en,es)=>language==='es'?es:en,
    ()=>counts.B++,state=>counts[current(state)]++,()=>counts.extra++,()=>counts.sync++
  );
  assert.equal(apiTime.fcTimesLinked(),false);
  assert.deepStrictEqual(apiTime.fcIndependentTimeSource(B).times,[0,.25,.5]);
  assert.equal(apiTime.fcIndependentTimeTarget(B),.25,'B starts at its last loaded REAL frame');
  assert.equal(apiTime.fcIndependentTimeTarget(C),.3,'C retains its own physical timestamp');
  assert.equal(apiTime.fcIndependentTimeTarget(D),.4);
  primaryTime=.5;
  assert.equal(apiTime.fcIndependentTimeTarget(B),.25,
    'moving A must not advance an unsynchronized B');
  assert.equal(apiTime.fcIndependentTimeTarget(C),.3,
    'moving A must not advance unsynchronized C');
  assert.equal(apiTime.fcSetIndependentTime('B',.5),true);
  assert.equal(B.timeTarget,.5);assert.equal(counts.B,1);
  assert.equal(apiTime.fcSetIndependentTime(3,.6),true);
  assert.equal(C.timeTarget,.6);assert.equal(counts.C,1);
  assert.equal(apiTime.fcSetIndependentTime(4,.8),true);
  assert.equal(D.timeTarget,.8);assert.equal(counts.D,1);
  assert.equal(apiTime.fcSetIndependentTime(3,8),false,
    'unknown OpenFOAM timestamp must not be accepted');
  const controls={};
  for(const [letter,state] of [['B',B],['3',C],['4',D]]){
    const wrapper={hidden:true},picker={dataset:{},value:'',disabled:false,attributes:{},
      closest:()=>wrapper,setAttribute(k,v){this.attributes[k]=v}};
    const bar={dataset:{fcToolbar:letter},
      querySelector:key=>key==='[data-fc-independent-time]'?picker:null};
    controls[letter]={bar,picker,wrapper};
    apiTime.fcSyncIndependentTimePicker(bar);
    assert.equal(wrapper.hidden,false);
    assert.equal(Number(picker.value),state.timeTarget);
    assert(picker.innerHTML.includes(' s</option>'),
      'each independent time picker lists real source physical seconds');
    assert.equal(picker.attributes['aria-label'],'Physical time for view '+
      (letter==='3'?'C':letter==='4'?'D':letter));
  }
  const savedB=B.timeTarget;
  primaryTime=.1;
  apiTime.fcSyncIndependentTimePicker(controls.B.bar);
  assert.equal(B.timeTarget,savedB,'time selector redraw cannot follow A');
  // Switching the actual B case/field invalidates its old frame catalog.
  catalogs.B.id='B4';catalogs.B.times=[2,3];
  assert.equal(apiTime.fcIndependentTimeTarget(B),2,
    'changing B source selects nearest available REAL B4 time, not stale B3');
  apiTime.fcSyncIndependentTimePicker(controls.B.bar);
  assert.equal(Number(controls.B.picker.value),2);
  language='es';apiTime.fcSyncIndependentTimePicker(controls.B.bar);
  assert.equal(controls.B.picker.attributes['aria-label'],'Tiempo físico de vista B');
  input.checked=true;primaryTime=.75;
  assert.equal(apiTime.fcIndependentTimeTarget(B),.75);
  assert.equal(apiTime.fcIndependentTimeTarget(C),.75);
  apiTime.fcSyncIndependentTimePicker(controls.B.bar);
  assert.equal(controls.B.wrapper.hidden,true,
    'linked B physical-time picker must not masquerade as an independent control');
  assert.equal(apiTime.fcSetIndependentTime('B',2),false);
  input.checked=false;apiTime.fcRefreshTimeLink();
  assert.equal(counts.extra,1);
  assert(counts.B>=2);
  assert.equal(apiTime.fcIndependentTimeTarget(B),2,
    'unlinking again restores valid independent B physical time');
  assert(source.includes("fcSetIndependentTime(view,event.target.value)"),
    'real per-viewport source picker must reload its original view');
  assert(source.includes("target=fcIndependentTimeTarget(fcState)"),
    'B frame loader must no longer force A time');
  assert(source.includes("target=fcIndependentTimeTarget(state)"),
    'C/D frame loader must no longer force A time');
  console.log('Granada independent Field A-D physical time PASS: real catalog, independent B/C/D, source changes, re-link, ES controls');
}

// Unsynchronized A and B may only produce a scientific difference when their
// actual measured physical timestamps match. An unrelated A-B field is hidden.
{
  const start=source.indexOf('function fcUpdateDifference(primaryMesh,compareMesh,primaryValues,compareValues){');
  const end=source.indexOf('async function fcLoadVectorAtTime(',start);
  assert(start>0&&end>start,'real 3D difference guard must exist');
  const primary={time:2},secondary={time:3,differenceValues:[99],differenceRange:{min:0,max:100}};
  const viewport={classList:{toggle(){}}};
  let issue=null,layouts=0;
  const document={getElementById:id=>id==='fcDifference'?{checked:true}:
    id==='fcDifferenceViewport'?viewport:id==='fcDifferenceStatus'?{}:null};
  const fn=new Function('document','fcState','fvState','fcTimesLinked','flSetIssue',
    'fcUpdateLayout',source.slice(start,end)+';return fcUpdateDifference;')(
    document,secondary,primary,()=>false,(node,message)=>{issue=message},()=>layouts++);
  fn(null,null,null,null);
  assert.equal(secondary.differenceValues,null);
  assert.equal(secondary.differenceRange,null);
  assert(issue?.includes('different')||issue?.includes('differ'),
    'the UI must explain why an independent-time difference is invalid');
  assert.equal(layouts,1);
  assert(source.includes("fcTimesLinked()?fvState.time:fcIndependentTimeTarget(fcState)"),
    'independent B vectors must use B time, not primary A time');
  console.log('Granada independent time safety PASS: no misleading OpenFOAM A-B difference or wrong-time B vectors');
}


// Granada Field per-view native playback and A clock isolation. These are
// original production time controllers, not a simulated UI-only player.
(async()=>{
  const start=source.indexOf('function fcTimesLinked(){');
  const end=source.indexOf('// A linked camera is not a copy',start);
  assert(start>=0&&end>start,'source-backed Field time playback controller required');
  const B={enabled:true,time:0,timeTarget:0},C={id:3,time:0,timeTarget:0},D={id:4,time:0,timeTarget:0};
  let linked=false,primaryTime=0,redraws=0,errors=[];
  const catalog={
    B:{id:'B3',region:'metal',field:'T',times:[0,1,2]},
    C:{id:'C3',region:'mold',field:'U',times:[0,.5,1]},
    D:{id:'D3',region:'metal',field:'alpha1',times:[0,2,4]}
  };
  const name=state=>state===B?'B':state===C?'C':'D';
  const timers=new Map(),cleared=[];
  let timerId=0;
  const loads=[];
  let failBFrame=false,missingBTime=false;
  const apiTime=new Function('document','fcState','fcExtraViews','fcCase','fcExtraCase',
    'fcRegion','fcExtraRegion','fcCurrentFieldName','fcExtraField',
    'fcFieldFor','fcPhysicalNumber','fcPrimaryPhysicalTime','fcEsc','fcFmt',
    'fcUi','fcRefreshFrame','fcExtraRefreshFrame','fcRefreshExtras',
    'fcScheduleToolbarSync','fcSetStatus','setTimeout','clearTimeout',
    source.slice(start,end)+
    ';return{fcSetIndependentTime,fcIndependentTimeTarget,fcIndependentTimeStep,'+
    'fcToggleIndependentPlayback,fcStopIndependentPlayback,'+
    'fcStopAllIndependentPlayback,fcSyncIndependentPlaybackControls,'+
    'fcRefreshTimeLink,fcIndependentPlayers};')(
    {getElementById:id=>id==='fcLinkTimes'?{get checked(){return linked}}:null},
    B,[C,D],()=>catalog.B,state=>catalog[name(state)],
    ()=>catalog.B.region,state=>catalog[name(state)].region,
    ()=>catalog.B.field,state=>catalog[name(state)].field,
    (c,r,f)=>r===c.region&&f===c.field?{times:c.times}:null,
    x=>Number(x),()=>primaryTime,String,String,(en,es)=>en,
    ()=>{loads.push({view:'B',target:B.timeTarget});
      B.time=missingBTime?null:B.timeTarget;
      B.mesh=failBFrame?null:{id:'mesh-B'};
      B.fieldValues=failBFrame?null:[1];return Promise.resolve()},
    state=>{loads.push({view:name(state),target:state.timeTarget});
      state.time=state.timeTarget;state.mesh={id:'mesh-'+name(state)};
      state.fieldValues=[1];return Promise.resolve()},
    ()=>{},()=>{redraws++},message=>errors.push(message),
    (fn,ms)=>{const id=++timerId;timers.set(id,{fn,ms});return id},
    id=>{cleared.push(id);timers.delete(id)}
  );
  const control=(view,state)=>{
    const arrow=(direction)=>({dataset:{fcTimeStep:String(direction)},disabled:null,
      attrs:{},setAttribute(k,v){this.attrs[k]=v}});
    const prev=arrow(-1),next=arrow(1);
    const play={disabled:null,textContent:'',attrs:{},
      setAttribute(k,v){this.attrs[k]=v}};
    const bar={dataset:{fcToolbar:String(view)},
      querySelector:key=>key==='[data-fc-independent-time]'?{}:
        key==='[data-fc-time-play]'?play:null,
      querySelectorAll:key=>key==='[data-fc-time-step]'?[prev,next]:[]};
    return{prev,next,play,bar,state}
  };
  const btnB=control('B',B),btnC=control(3,C);
  apiTime.fcSyncIndependentPlaybackControls(btnB.bar);
  assert.equal(btnB.prev.disabled,true,'first B timestamp cannot step backward');
  assert.equal(btnB.next.disabled,false);
  assert.equal(btnB.play.disabled,false);
  assert.equal(btnB.play.attrs['aria-pressed'],'false');
  assert.equal(btnB.prev.attrs['aria-label'],'Previous measured time · B');
  assert.equal(btnC.next.attrs['aria-label'],undefined,'unmounted C must not inherit B labels');
  assert.equal(apiTime.fcIndependentTimeStep('B',-1),false);
  assert.equal(apiTime.fcIndependentTimeStep('B',1),true);
  assert.equal(B.timeTarget,1);
  assert.deepStrictEqual(loads.at(-1),{view:'B',target:1});
  assert.equal(C.timeTarget,0,'B stepping must never change independent C');
  assert.equal(apiTime.fcIndependentTimeStep('B',1),true);
  assert.equal(B.timeTarget,2);
  assert.equal(apiTime.fcIndependentTimeStep('B',1),false);
  apiTime.fcSyncIndependentPlaybackControls(btnB.bar);
  assert.equal(btnB.next.disabled,true,'last catalog frame has disabled Next');
  assert.equal(apiTime.fcToggleIndependentPlayback('B'),true,
    'Play at the end restarts at the first measured timestamp');
  assert.equal(B.timeTarget,0);
  assert.equal(apiTime.fcIndependentPlayers.has('B'),true);
  apiTime.fcSyncIndependentPlaybackControls(btnB.bar);
  assert.equal(btnB.play.attrs['aria-pressed'],'true');
  assert.equal(btnB.play.attrs['aria-label'],'Pause physical time · B');
  assert.equal(btnB.play.textContent,'❚❚');
  // One independent C player never advances B until B's own timer fires.
  assert.equal(apiTime.fcToggleIndependentPlayback(3),true);
  assert.equal(C.timeTarget,.5);
  assert.equal(B.timeTarget,0);
  assert.equal(apiTime.fcIndependentPlayers.size,2);
  // Pause only B: C's native playback stays alive.
  assert.equal(apiTime.fcToggleIndependentPlayback('B'),true);
  assert.equal(apiTime.fcIndependentPlayers.has('B'),false);
  assert.equal(apiTime.fcIndependentPlayers.has('3'),true);
  await Promise.resolve();await Promise.resolve();
  assert(timers.size>=1,'independent C uses an owned timer');
  const tick=timers.entries().next().value;
  timers.delete(tick[0]);tick[1].fn();
  await Promise.resolve();await Promise.resolve();
  assert.equal(C.timeTarget,1,'C advances to its next real .s OpenFOAM timestamp');
  assert.equal(B.timeTarget,0,'C playback never drags B to the same time');
  const last=timers.entries().next().value;
  if(last){timers.delete(last[0]);last[1].fn()}
  await Promise.resolve();await Promise.resolve();
  assert.equal(apiTime.fcIndependentPlayers.has('3'),false,
    'at the end of the real C catalog playback stops instead of inventing a frame');
  // Removing a view and restoring time sync stop the corresponding timer.
  assert.equal(apiTime.fcToggleIndependentPlayback(4),true);
  assert.equal(apiTime.fcIndependentPlayers.has('4'),true);
  apiTime.fcStopIndependentPlayback(4);
  assert.equal(apiTime.fcIndependentPlayers.has('4'),false);
  assert.equal(apiTime.fcToggleIndependentPlayback('B'),true);
  linked=true;apiTime.fcRefreshTimeLink();
  assert.equal(apiTime.fcIndependentPlayers.size,0,
    're-linking original physical time must cancel every independent player');
  apiTime.fcSyncIndependentPlaybackControls(btnB.bar);
  assert.equal(btnB.play.disabled,true);
  assert.equal(btnB.prev.disabled,true);
  assert.equal(apiTime.fcToggleIndependentPlayback('B'),false);
  assert.equal(errors.length,0);
  // An asynchronous loader may finish without a valid physical mesh/frame.
  // Playback must stop at that time instead of fabricating further data.
  linked=false;failBFrame=true;
  B.timeTarget=0;B.time=0;B.mesh={id:'prior-real-mesh'};B.fieldValues=[1];
  assert.equal(apiTime.fcToggleIndependentPlayback('B'),true);
  await Promise.resolve();await Promise.resolve();
  assert.equal(B.timeTarget,1,'only the first real next time may be requested');
  assert.equal(B.mesh,null,'simulated invalid loader has no measurable mesh');
  const failedTick=timers.entries().next().value;
  assert(failedTick,'invalid frame is checked by next playback timer');
  timers.delete(failedTick[0]);failedTick[1].fn();
  await Promise.resolve();await Promise.resolve();
  assert.equal(apiTime.fcIndependentPlayers.has('B'),false,
    'fulfilled-but-invalid OpenFOAM frame must stop original B playback');
  assert.equal(B.timeTarget,1,
    'failed measured B time cannot be skipped to the following catalog frame');
  failBFrame=false;missingBTime=true;
  B.timeTarget=2;B.time=2;B.mesh={id:'last-valid'};B.fieldValues=[1];
  assert.equal(apiTime.fcToggleIndependentPlayback('B'),true);
  await Promise.resolve();await Promise.resolve();await Promise.resolve();
  assert.equal(B.timeTarget,0,'restart chooses real first source timestamp t=0');
  assert.strictEqual(B.time,null,'missing measured time is not numeric physical zero');
  assert.equal(apiTime.fcIndependentPlayers.has('B'),false,
    'a missing/null physical time must never be promoted to measured t=0');
  assert(source.includes("fcIndependentTimeSource(state).key===source.key"),
    'a late source change cannot be accepted as a successful old frame');
  for(const id of ['fcCase','fcRegion','fcField','fcComponent']){
    assert(source.includes("document.getElementById('"+id+"').addEventListener('change',()=>{fcStopIndependentPlayback('B');"),
      'changing original B '+id+' immediately stops outdated playback');
  }
  assert(source.includes("fcExtraDom(id,suffix).addEventListener('change',()=>{\\n    fcStopIndependentPlayback(id);".replace('\\n','\\n'))||
    /fcExtraDom\(id,suffix\)\.addEventListener\('change',\(\)=>\{\s*fcStopIndependentPlayback\(id\)/.test(source),
    'C/D case, region, field and component changes stop their owned player');
  assert(source.includes('fcStopIndependentPlayback(id);'),
    'removing C/D must cancel its owned playback timer');
  assert(source.includes('if(!fcState.enabled)fcStopAllIndependentPlayback()'),
    'closing compare must cancel all independent timers');
  assert(source.includes('data-fc-time-play aria-pressed="false"'),
    'each B/C/D toolbar needs an accessible Play/Pause action');
  assert(source.includes("fcIndependentTimeStep(view,Number(button.dataset.fcTimeStep))"),
    'each B/C/D toolbar needs original source-backed Previous and Next');
  console.log('Granada Field per-view physical playback PASS: real step times, B/C independence, restart/pause, end and cleanup');

  // Wrap the *original* fvLoadFrame method to verify A global playback no
  // longer makes expensive B/C/D field+mesh reads when times are unlinked.
  const wrapperBegin=source.indexOf("if(typeof fvLoadFrame==='function'&&!fvLoadFrame.__fcPatched){");
  const wrapperEnd=source.indexOf("if(typeof fvRender==='function'",wrapperBegin);
  assert(wrapperBegin>0&&wrapperEnd>wrapperBegin);
  const events=[],compare={enabled:true,mesh:{name:'B'},fieldValues:[100]};
  const wrapped=new Function('fvLoadFrame','fcTimesLinked','fcState','fvState',
    'fcExtraViews','fcRefreshFrame','fcRefreshExtras','fcUpdateDifference',
    'fcUpdateLabels','fcScheduleToolbarSync','fvRender','fcRender',
    'fcRenderDifference','fcRenderExtras',
    'let fcLinkedPlaybackSeq=0;'+source.slice(wrapperBegin,wrapperEnd)+
    ';return fvLoadFrame;')(
    async()=>{events.push('A');return 'loaded A'},
    ()=>linked,compare,{frameSeq:0,mesh:{name:'A'},fieldValues:[200]},
    [{id:3},{id:4}],async()=>{events.push('B')},async()=>{events.push('C/D')},
    ()=>events.push('Δ'),()=>events.push('labels'),()=>events.push('toolbar'),
    ()=>events.push('paint A'),()=>events.push('paint B'),
    ()=>events.push('paint Δ'),()=>events.push('paint C/D')
  );
  linked=false;
  assert.equal(await wrapped(),'loaded A');
  assert.deepStrictEqual(events,['A','Δ','labels','toolbar'],
    'moving A alone must not re-read B/C/D independent OpenFOAM data');
  events.length=0;linked=true;await wrapped();
  assert.deepStrictEqual(events,['A','B','C/D','paint A','paint B','paint Δ','paint C/D'],
    're-linking must load B/C/D together and present one coherent A–D frame after all source reads');
  console.log('Granada Field A time isolation PASS: real load wrapper keeps unsynced B/C/D data untouched');
})().catch(error=>{console.error(error);process.exitCode=1});


// Granada individual native playback rate and looping. Execute the actual
// production cadence and cycle boundary, not a copied timing algorithm.
(async()=>{
  const ratesStart=source.indexOf('const FC_INDEPENDENT_RATES=[.5,1,2];');
  const ratesEnd=source.indexOf('function fcIndependentTimeStep(',ratesStart);
  const runnerStart=source.indexOf('async function fcRunIndependentPlayback(view,play){');
  const runnerEnd=source.indexOf('function fcToggleIndependentPlayback(',runnerStart);
  assert(ratesStart>0&&ratesEnd>ratesStart&&runnerStart>0&&runnerEnd>runnerStart);
  const B={enabled:true,timeTarget:2,timePlaybackRate:2,timePlaybackLoop:true},
    C={id:3,timeTarget:0,timePlaybackRate:.5,timePlaybackLoop:false},
    D={id:4,timeTarget:0};
  const extras=[C,D],player=new Map(),timerDelays=[],stopped=[],changes=[];
  let linked=false,refreshes=0;
  const options=new Function('fcState','fcExtraViews','fcTimesLinked','fcScheduleToolbarSync',
    source.slice(ratesStart,ratesEnd)+
    ';return {rate:fcIndependentPlaybackRate,delay:fcIndependentPlaybackDelay,'+
    'set:fcSetIndependentPlaybackOptions};')(
      B,extras,()=>linked,()=>refreshes++);
  assert.equal(options.delay(B),225,'2× advances measured frames at 225 ms');
  assert.equal(options.delay(C),900,'0.5× advances at 900 ms');
  assert.equal(options.delay(D),450,'1× is the legacy measured-frame cadence');
  assert.equal(options.set('B',{rate:3}),false,'unrecognized speed cannot corrupt state');
  assert.equal(options.delay(B),225);
  assert.equal(options.set(3,{rate:2,loop:true}),true);
  assert.equal(options.delay(C),225,'C can change speed without changing B');
  assert.equal(C.timePlaybackLoop,true);
  assert.equal(B.timePlaybackLoop,true);
  assert.equal(options.set(4,{rate:.5,loop:false}),true);
  assert.equal(options.delay(D),900);
  assert.equal(options.set(9,{rate:1}),false,'no phantom view can receive time controls');
  assert(refreshes>=2,'source UI reflects changed per-view pacing');

  const sourceFor=state=>({key:state===B?'B3|metal|T':
    state===C?'C3|mold|U':'D3|metal|alpha1',times:[0,1,2]});
  const run=new Function('fcIndependentPlayers','fcState','fcExtraViews',
    'fcTimesLinked','fcIndependentTimeSource','fcIndependentTimeTarget',
    'fcIndependentTimeStep','fcSetIndependentTime','fcStopIndependentPlayback',
    'fcIndependentPlaybackDelay','setTimeout',
    source.slice(runnerStart,runnerEnd)+';return fcRunIndependentPlayback;')(
      player,B,extras,()=>linked,sourceFor,state=>state.timeTarget,
      (view,direction)=>{
        const state=view==='B'?B:extras.find(x=>x.id===Number(view));
        if(state.timeTarget>=2)return false;
        state.timeTarget+=1;changes.push(view+':'+state.timeTarget);return true
      },
      (view,time)=>{
        const state=view==='B'?B:extras.find(x=>x.id===Number(view));
        state.timeTarget=time;changes.push(view+':'+time);return true
      },
      view=>{stopped.push(String(view));player.delete(String(view))},
      options.delay,(fn,ms)=>{timerDelays.push(ms);return timerDelays.length}
    );
  const pB={sourceKey:sourceFor(B).key,cancelled:false,timer:null};
  player.set('B',pB);await run('B',pB);
  assert.equal(B.timeTarget,0,'B loops from last to first REAL catalog time');
  assert.equal(timerDelays.at(-1),225);
  assert.equal(player.has('B'),true);
  const pC={sourceKey:sourceFor(C).key,cancelled:false,timer:null};
  player.set('3',pC);await run(3,pC);
  assert.equal(C.timeTarget,1,'C advances in its own source time catalog');
  assert.equal(timerDelays.at(-1),225);
  assert.equal(B.timeTarget,0,'C cannot advance or re-time B');
  const pD={sourceKey:sourceFor(D).key,cancelled:false,timer:null};
  player.set('4',pD);await run(4,pD);
  assert.equal(D.timeTarget,1);assert.equal(timerDelays.at(-1),900);
  // Turning loop off stops at the last real measured frame; never generate
  // or silently wrap a missing OpenFOAM frame.
  B.timeTarget=2;B.timePlaybackLoop=false;
  pB.timer=null;await run('B',pB);
  assert.equal(B.timeTarget,2);
  assert.equal(player.has('B'),false);
  assert.deepStrictEqual(stopped,['B']);
  linked=true;
  assert.equal(options.set(3,{rate:.5}),false,
    'linked physical time disables independent playback changes');
  assert.equal(C.timePlaybackRate,2);
  assert(source.includes("data-fc-time-rate aria-label="),
    'actual source toolbar must expose per-view speed selector');
  assert(source.includes("data-fc-time-loop"),
    'actual source toolbar must expose per-view real-frame repeat control');
  assert(source.includes("fcSetIndependentPlaybackOptions(view,{rate:event.target.value})"));
  assert(source.includes("fcSetIndependentPlaybackOptions(view,{loop:event.target.checked})"));
  console.log('Granada individual native playback rate and looping PASS: B/C/D 0.5×/1×/2×, independent timers, real-frame wrap, linked safety');
})().catch(error=>{console.error(error);process.exitCode=1});


 
// GRANADA: source-true volume/face/point ownership for the original metal/mold
// overlay menus in A AND B/C/D (not only the primary field selector).
{
  const physicalBegin=source.indexOf('function fcReconcilePhysicalChoice(choice,groups,preferred=');
  const physicalEnd=source.indexOf('function fcPhysicalChoiceList(',physicalBegin);
  assert(physicalBegin>=0&&physicalEnd>physicalBegin);
  const reconcile=new Function('fvFieldComponents',source.slice(physicalBegin,physicalEnd)+
    ';return fcReconcilePhysicalChoice')(
      group=>group?.kind==='vector'?[{v:'magnitude',t:'Magnitude'}]:[{v:'value',t:'Value'}]);
  const volume={name:'T',kind:'scalar',storage:'volume'};
  const surface={name:'T',kind:'scalar',storage:'surface'};
  const vector={name:'U',kind:'vector',storage:'point'};
  const choice={field:'T',storage:'surface',component:'value'};
  assert.equal(reconcile(choice,[volume,surface,vector]),false);
  assert.deepStrictEqual([choice.field,choice.storage,choice.component],['T','surface','value']);
  assert.equal(reconcile(choice,[volume,vector]),true);
  assert.deepStrictEqual([choice.field,choice.storage,choice.component],['T','volume','value']);
  assert.equal(reconcile(choice,[vector]),true);
  assert.deepStrictEqual([choice.field,choice.storage,choice.component],['U','point','magnitude']);
  const menu=source.slice(source.indexOf('function fcPhysicalMenu(view){'),
    source.indexOf('function fcPhysicalReload(',source.indexOf('function fcPhysicalMenu(view){')));
  assert(menu.includes('data-storage='),'B/C/D physical-region menu must expose original association');
  assert(menu.includes('ch.storage=String(e.target.selectedOptions?.[0]?.dataset?.storage'),
    'Changing a same-named metal/mold field must preserve selected face/point association');
  assert(menu.includes('ch?.storage'),'Toolbar render key must track association changes');
  assert(menu.includes("if(kind==='Field'&&matches.length>1)")&&
    menu.includes("exact.selected=true")&&
    menu.includes("option.dataset?.storage||'')===String(ch.storage||'')"),
    'Primary-field forwarding must select the correct face/volume option rather than first same-name entry');
  const physicalLoad=source.slice(source.indexOf('async function fcPhysicalLoad('),
    source.indexOf('function fcPhysicalRenderLayers(',source.indexOf('async function fcPhysicalLoad(')));
  assert(physicalLoad.includes('matching=fields.filter(')&&physicalLoad.includes('matching.length===1?matching[0]:null'),
    'B/C/D overlay loader must refuse ambiguous same-name OpenFOAM fields');

  const aSource=fs.readFileSync(path.join(dir,'v14-field-view.js'),'utf8');
  const start=aSource.indexOf('function fvRegionChoice(c,region){');
  const end=aSource.indexOf('function fvRegionPrimaryVisible(',start);
  assert(start>=0&&end>start);
  const caseA={id:'B13'};
  const scene={choices:new Map()};
  const owned=new Function('fvRegionEnsureCase','fvRegionScene','fvFieldGroups','document',
    aSource.slice(start,end)+';return fvRegionChoice')(
      ()=>{},scene,()=>[volume,surface],
      {getElementById:id=>({fvField:{value:'T'},fvRegion:{value:'metal'},fvPalette:{value:'viridis'}})[id]||null});
  const initial=owned(caseA,'mold');
  assert.equal(initial.storage,'volume','Initial default must name the real storage association');
  initial.storage='surface';
  assert.strictEqual(owned(caseA,'mold').storage,'surface','A region source is stable across UI refresh');
  const aUi=aSource.slice(aSource.indexOf('function fvRegionRefreshList(){'),
    aSource.indexOf('function fvRegionApplyVisibility(',aSource.indexOf('function fvRegionRefreshList(){')));
  assert(aUi.includes('data-storage='),'A region selector must surface original OpenFOAM association');
  const aHandlers=aSource.slice(aSource.indexOf('function fvRegionInstallControls('),
    aSource.indexOf('function fvRegionMakeBuffer('));
  assert(aSource.includes("choice.storage=String(e.target.selectedOptions?.[0]?.dataset?.storage||'')"),
    'A region menu handler must store the chosen association');
  const aLoad=aSource.slice(aSource.indexOf('function fvRegionLoadFrame('),
    aSource.indexOf('function fvRegionRender(',aSource.indexOf('function fvRegionLoadFrame(')));
  assert(aLoad.includes('const selected=candidates.length===1?candidates[0]:null'),
    'A physical region cannot silently draw a wrong-association field');
  console.log('Granada A-D physical metal/mold association PASS: same T in volume and surface, source selection and safe load');
}
