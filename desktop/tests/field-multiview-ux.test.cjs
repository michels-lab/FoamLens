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
const fvState={mesh:{cellCount:1},camera:cameraA};
const fcState={mesh:{cellCount:1},camera:cameraB};
const fcExtraViews=[{id:3,mesh:{cellCount:1},camera:cameraC}];
let linked=false,redraw={primary:0,secondary:0,extra:0,difference:0,layout:0};
const api=new Function(
  'fvState','fcState','fcExtraViews','fcCamerasLinked','fcCameraFor',
  'fvRender','fcRender','fcRenderDifference','fcExtraRender','fcScheduleLayoutRender',
  'document','requestAnimationFrame',
  source.slice(begin,end)+';return{fcViewSourceMap,fcZoomViewport,fcMoveViewport};'
)(fvState,fcState,fcExtraViews,()=>linked,(state)=>state.camera,
  ()=>redraw.primary++,()=>redraw.secondary++,()=>redraw.difference++,()=>redraw.extra++,()=>redraw.layout++,
  {},()=>0);
assert.deepStrictEqual(api.fcViewSourceMap('A'),{Case:'fvCase',Region:'fvRegion',Field:'fvField',Component:'fvComponent'});
assert.deepStrictEqual(api.fcViewSourceMap('B'),{Case:'fcCase',Region:'fcRegion',Field:'fcField',Component:'fcComponent'});
assert.deepStrictEqual(api.fcViewSourceMap(3),{Case:'fcExtra3Case',Region:'fcExtra3Region',Field:'fcExtra3Field',Component:'fcExtra3Component'});
assert.strictEqual(api.fcViewSourceMap('Δ'),null,'Difference field is not independently selectable');

 
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
for(const fragment of [
  "fcAddViewportToolbar(primary,'A')","fcAddViewportToolbar(second,'B')","fcAddViewportToolbar(viewport,id)",
  "fcScheduleToolbarSync()","source.dispatchEvent(new Event('change',{bubbles:true}))",
  "e.dataTransfer?.setData('text/plain',viewport.id)","fcMoveViewport(viewport.parentElement,fcDraggedView,viewport",
  "data-fc-zoom=","fcViewToolbar","fcViewPicker","fcViewZoom",
  "FC_MAX_TOTAL_VIEWS=4","if(oldCase&&eligible.some(c=>String(c.id)===String(oldCase)))"
])assert(source.includes(fragment),'Missing production multi-view mechanism: '+fragment);
for(const fragment of [
  'id="fwAdd3DViewVisible"','id="fwImport3DCase"','id="fwLinkCamerasVisible"',
  "document.getElementById('fwImport3DCase')?.addEventListener('click',()=>document.getElementById('addFolder')?.click())",
  "document.getElementById('fwAdd3DViewVisible')?.addEventListener('click',fwAdd3DView)",
  "const enabled=document.getElementById('fcEnabled')","fcExtraAdd();fwUpdateViewCount()",
  'document.querySelector(\'#fcViewport [data-fc-bind="Case"]\')'
])assert(workspace.includes(fragment),'Missing permanent Field entry point: '+fragment);
for(const fragment of [
  '#flRibbonPanel-field.active{flex-wrap:wrap!important',
  '.flRibbonTimeGroup .flRibbonActions{display:flex!important;flex-wrap:wrap!important',
  'fwTimeTransport{box-sizing:border-box!important',
  'flRibbonInstallChromeMeasurement()'
])assert(ribbon.includes(fragment),'Ribbon can still overlap at compact widths: '+fragment);
console.log('Field multi-view regression PASS: A/B/C independent sources and zoom, linked mode, drag reorder, visible Add view, wrapping Ribbon.');
