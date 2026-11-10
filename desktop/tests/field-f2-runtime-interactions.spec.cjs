'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync(path.join(__dirname,'..','src','FoamLensDesktop','frontend','v24-field-f2-viewport-layout.js'),'utf8');
function classes(initial=[]){
  const set=new Set(initial);
  return{contains:k=>set.has(k),add:k=>set.add(k),remove:k=>set.delete(k),
    toggle:(k,forced)=>{const on=forced===undefined?!set.has(k):!!forced;on?set.add(k):set.delete(k);return on}}
}
const r=(left,top,width,height)=>({left,top,width,height,right:left+width,bottom:top+height});
function view(id,name,hasData=true){
  const panel={id,classList:classes(hasData?[]:['hidden']),dataset:{},style:{
     rules:{},setProperty(key,value){this.rules[key]=value},removeProperty(key){delete this.rules[key]}
   },buttons:{},getBoundingClientRect:()=>r(0,0,900,460)};
  const overlays={
    '.fcTimeBadge':{rect:r(12,12,92,25)},
    '.fvMeshDimensions':{rect:r(12,50,180,64)},
    '.fcLegend':{rect:r(685,270,170,120)}
  };
  const canvas={width:1350,height:690,getBoundingClientRect:()=>r(0,0,900,460)};
  const node=rect=>({classList:classes(),getBoundingClientRect:()=>rect,
    scrollWidth:Math.round(rect.width),clientWidth:Math.round(rect.width),
    scrollHeight:Math.round(rect.height),clientHeight:Math.round(rect.height)});
  const scene={getBoundingClientRect:()=>r(0,0,900,460),querySelector(s){
    if(s==='canvas')return canvas;
    if(s==='.fvRegionScaleDock')return null;
    return overlays[s]?node(overlays[s].rect):null
  }};
  panel.querySelector=s=>s==='.fcViewportScene'?scene:s==='[data-pv-control="focus"]'?panel.buttons.focus:null;
  return{panel,scene,overlays,canvas}
}
const a=view('fvViewport','A'),b=view('fcViewport','B'),c=view('fcExtra3Viewport','C',false);
for(const v of [a,b,c])v.panel.buttons.focus={
   attributes:{},setAttribute(k,val){this.attributes[k]=val}
};
const list=[a.panel,b.panel,c.panel],elements=new Map(list.map(v=>[v.id,v]));
const grid={classList:classes(),children:list,handlers:{},addEventListener(type,fn){this.handlers[type]=fn}};
for(const panel of list)panel.parentElement=grid;
elements.set('fcViewGrid',grid);
const status={textContent:''},out={textContent:''},exp={disabled:true};
elements.set('pvStatus',status);elements.set('pvEvidence',out);elements.set('pvExport',exp);
const stored=new Map(),downloads=[],documentHandlers={};
let layoutObserver=null,observedOptions=null;
class MockMutationObserver{
  constructor(callback){this.callback=callback;layoutObserver=this}
  observe(node,options){observedOptions=options}
}
const context={
 window:{innerWidth:1280,innerHeight:720,devicePixelRatio:1.5,
   visualViewport:{scale:1},getComputedStyle:()=>({display:'block',visibility:'visible'}),addEventListener:()=>{}},
 document:{readyState:'loading',addEventListener:(type,fn)=>{documentHandlers[type]=fn},getElementById:id=>elements.get(id)||null,
   querySelector:()=>null,createElement:tag=>({id:'',textContent:'',tagName:tag}),
   head:{append:el=>elements.set(el.id,el)}},
 localStorage:{getItem:k=>stored.get(k)||null,setItem:(k,v)=>stored.set(k,v)},
 requestAnimationFrame:()=>1,downloadText:(name,text,mime)=>downloads.push({name,text,mime}),
 URL,JSON,Set,Map,Number,Math,Date,Array,Object,String,console,ResizeObserver:undefined,
 MutationObserver:MockMutationObserver
};
vm.runInNewContext(source,context,{timeout:3000});
assert.equal(typeof documentHandlers.DOMContentLoaded,'function');
documentHandlers.DOMContentLoaded();
assert.equal(typeof grid.handlers.keydown,'function','Field grid must handle Escape on actual DOM');
assert(observedOptions?.attributes===true && observedOptions.attributeFilter.includes('class'),
  'View visibility class changes must be observed, not only inserted/removed views');
const api=context.window.FoamLensF2Layout;
assert(api,'Runtime host control must be exported');
assert.equal(api.resize(a.panel,900),590,'Max CSS scene height clamps to current viewport 720px × 82%');
assert.equal(api.resize(b.panel,360),360);
assert.equal(a.panel.style.rules['--pvHeight'],'590px');
assert.equal(b.panel.style.rules['--pvHeight'],'360px');
const data=JSON.parse(stored.get('foamlens.field.f2.viewheights.v1'));
assert.equal(data.schema,1);
assert.equal(data.heights.fvViewport,590);
assert.equal(data.heights.fcViewport,360);
assert.equal(api.focus(b.panel),true);
assert(grid.classList.contains('pvFocus'));
assert(b.panel.classList.contains('pvFocusTarget'));
assert(!a.panel.classList.contains('pvFocusTarget'));
assert.equal(b.panel.buttons.focus.attributes['aria-pressed'],'true');
assert.equal(b.panel.buttons.focus.textContent,'Restore','Maximized panel must not still say Maximize');
assert.match(b.panel.buttons.focus.attributes['aria-label'],/View B.*Restore/);
assert.equal(api.focus(b.panel),true);
assert(!grid.classList.contains('pvFocus'),'Second click restores earlier A/B/C visibility');
assert.equal(b.panel.buttons.focus.textContent,'Maximize','Restore label must reset with grid');
assert.equal(api.focus(c.panel),false,'Hidden Field view cannot be maximized');
assert.equal(api.focus(b.panel),true);
b.panel.classList.add('hidden');
layoutObserver.callback();
assert(!grid.classList.contains('pvFocus'),
  'A hidden compared view cannot stay maximized and mask all other Field panels');
assert.equal(b.panel.buttons.focus.attributes['aria-pressed'],'false');
assert.equal(b.panel.buttons.focus.textContent,'Maximize');
b.panel.classList.remove('hidden');
assert.equal(api.focus(b.panel),true);
let stops=0,defaults=0;
grid.handlers.keydown({key:'Escape',preventDefault:()=>defaults++,stopPropagation:()=>stops++});
assert.equal(defaults,1);
assert.equal(stops,1);
assert(!grid.classList.contains('pvFocus'),'Escape restores the actual Field A/B grid');
assert.equal(b.panel.buttons.focus.textContent,'Maximize');
grid.handlers.keydown({key:'Escape',preventDefault:()=>defaults++,stopPropagation:()=>stops++});
assert.equal(defaults,1,'Idle Escape must remain available to other FoamLens actions');
assert.equal(stops,1);
assert.equal(api.focus(b.panel),true);
elements.set('language',{value:'es'});
documentHandlers['foamlens-language-change']();
assert.equal(b.panel.buttons.focus.textContent,'Restaurar','Spanish maximize state must follow actual language');
assert.match(b.panel.buttons.focus.attributes['aria-label'],/Vista B.*Restaurar/);
assert.equal(api.focus(b.panel),true);
assert.equal(b.panel.buttons.focus.textContent,'Maximizar');
elements.get('language').value='en';
documentHandlers['foamlens-language-change']();
assert.equal(b.panel.buttons.focus.textContent,'Maximize');
assert.equal(api.focus(b.panel),true);
const removed=b.panel;
elements.delete('fcViewport');
const index=grid.children.indexOf(removed);grid.children.splice(index,1);
layoutObserver.callback();
assert(!grid.classList.contains('pvFocus'),
  'Replacing/detaching focused B view restores A rather than leaving a blank screen');
grid.children.splice(index,0,removed);elements.set('fcViewport',removed);
layoutObserver.callback();

const report=api.measure();
assert.equal(report.schema,'foamlens/field-f2-layout/1');
assert.equal(report.environment.innerCssPx.width,1280);
assert.equal(report.environment.devicePixelRatio,1.5);
assert.equal(report.views.length,2,'Hidden C does not masquerade as measured');
assert.equal(report.views[0].view,'A');
assert.equal(report.views[0].state,'no-observed-conflict');
assert.equal(report.views[1].state,'no-observed-conflict');
assert.equal(exp.disabled,false);
assert(!JSON.stringify(report).includes('QuickCup'));
assert(!JSON.stringify(report).includes('D:\\private\\experiment'));
assert(status.textContent.includes('2 measured viewport'));
const old=b.overlays['.fvMeshDimensions'];b.overlays['.fvMeshDimensions']={rect:r(12,15,180,64)};
const changed=api.measure();
assert.equal(changed.views[1].state,'layout-conflict');
assert(changed.views[1].issues.some(x=>x.type==='overlapping-overlays'));
assert.equal(api.focus(b.panel),true,'Focus B to verify restore state');
api.resetFocus();assert(!grid.classList.contains('pvFocus'));
assert.equal(b.panel.buttons.focus.attributes['aria-pressed'],'false',
  'Restore must clear stale aria-pressed state of original Maximize button');
context.window.FoamLensF2Layout.measure();
const exportedSource=source.includes('pvExport()')&&source.includes('downloadText(');
assert(exportedSource,'Local deliberate report export must remain available');
// Same-failure negative case: the Field grid is NOT present at DOMContentLoaded.
// The original startup-only Escape binding silently missed this normal route.
const lateMap=new Map(),lateRaf=[],lateEvents={};
const lateGrid={children:[],handlers:{},classList:classes(),
  addEventListener(type,handler){this.handlers[type]=handler}};
const lateContext={
  window:{innerHeight:720,innerWidth:1280,devicePixelRatio:1,addEventListener(){}},
  document:{readyState:'complete',getElementById:id=>lateMap.get(id)||null,
    addEventListener:(type,handler)=>{lateEvents[type]=handler},
    querySelector:()=>null,createElement:()=>({id:'',textContent:''}),
    head:{append:el=>lateMap.set(el.id,el)}},
  localStorage:{getItem:()=>null,setItem(){}},
  requestAnimationFrame:handler=>{lateRaf.push(handler);return lateRaf.length},
  MutationObserver:undefined,ResizeObserver:undefined,Number,Math,Array,Object,
  Map,Set,String,JSON,Date,console
};
vm.runInNewContext(source,lateContext,{timeout:3000});
assert.equal(lateGrid.handlers.keydown,undefined);
assert(lateRaf.length>=1,'Field module should retry discovery after startup');
lateMap.set('fcViewGrid',lateGrid);
lateRaf.shift()();
assert.equal(typeof lateGrid.handlers.keydown,'function',
  'Actual late-mounted Field grid must receive Escape listener on discovery');

// Source-native F2 negative regression: the old handler committed on
// pointercancel/lostpointercapture and let unrelated pointers finish a drag.
{
  const gripBegin=source.indexOf('function pvGrip(grip,viewport){');
  const gripEnd=source.indexOf('function pvMountViewport(viewport){',gripBegin);
  assert(gripBegin>=0&&gripEnd>gripBegin,'Actual F2 pointer controller required');
  const originalGrip=source.slice(gripBegin,gripEnd);
  const callbacks={},captures=[],commits=[],inline={'--pvHeight':'420px'};
  let redrawCount=0,preventions=0;
  const scene={getBoundingClientRect:()=>({height:420})};
  const grip={
    addEventListener:(name,handler)=>{callbacks[name]=handler},
    setPointerCapture:id=>captures.push(id)
  };
  const viewport={
    style:{
      getPropertyValue:key=>inline[key]||'',
      setProperty:(key,value)=>{inline[key]=value},
      removeProperty:key=>{delete inline[key]}
    },
    querySelector:key=>key==='.fcViewportScene'?scene:null
  };
  const height=(panel,n,persist=true)=>{
    assert.strictEqual(panel,viewport);
    commits.push({n,persist});
    panel.style.setProperty('--pvHeight',n+'px');
    return n
  };
  const install=new Function('pvSetHeight','pvRedraw',originalGrip+';return pvGrip;');
  install(height,()=>{redrawCount++})(grip,viewport);
  const ev=(type,id,y,button=0)=>({type,pointerId:id,clientY:y,button,
    preventDefault:()=>{preventions++}});
  callbacks.pointerdown(ev('pointerdown',7,100));
  assert.deepStrictEqual(captures,[7]);
  callbacks.pointerdown(ev('pointerdown',8,180));
  assert.deepStrictEqual(captures,[7],'a concurrent pointer cannot steal F2 resize');
  callbacks.pointermove(ev('pointermove',8,250));
  assert.equal(commits.length,0,'unrelated pointer moves do not resize A/B/C/D');
  callbacks.pointermove(ev('pointermove',7,160));
  assert.deepStrictEqual(commits,[{n:480,persist:false}]);
  assert.equal(inline['--pvHeight'],'480px');
  callbacks.pointerup(ev('pointerup',8,190));
  callbacks.pointercancel(ev('pointercancel',8,190));
  assert.equal(inline['--pvHeight'],'480px','foreign pointer cannot commit/cancel');
  callbacks.pointercancel(ev('pointercancel',7,160));
  assert.equal(inline['--pvHeight'],'420px','cancellation restores original CSS height');
  assert.equal(commits.filter(x=>x.persist).length,0,
    'cancelled drags never persist transient heights');
  assert(redrawCount>0,'cancel must redraw restored original scene');
  callbacks.lostpointercapture(ev('lostpointercapture',7,160));
  assert.equal(commits.length,1,'lost capture after cancel cannot double-finish');

  delete inline['--pvHeight']; // original viewport had default CSS, no inline height
  callbacks.pointerdown(ev('pointerdown',9,100));
  callbacks.pointermove(ev('pointermove',9,220));
  assert.equal(inline['--pvHeight'],'540px');
  callbacks.lostpointercapture(ev('lostpointercapture',9,220));
  assert.equal(Object.hasOwn(inline,'--pvHeight'),false,
    'lost capture restores the CSS default and does not persist the drag');
  assert.equal(commits.filter(x=>x.persist).length,0);

  callbacks.pointerdown(ev('pointerdown',10,100));
  callbacks.pointermove(ev('pointermove',10,150));
  callbacks.pointerup(ev('pointerup',10,185));
  assert.deepStrictEqual(commits.at(-1),{n:505,persist:true},
    'a completed drag commits its final pointer position, not stale layout bounds');
  assert.equal(inline['--pvHeight'],'505px');
  const finished=commits.length;
  callbacks.lostpointercapture(ev('lostpointercapture',10,185));
  assert.equal(commits.length,finished,'post-commit lostcapture cannot roll back');
  callbacks.pointerdown(ev('pointerdown',11,100,1));
  assert.equal(captures.length,3,'right-click cannot initiate resize');
  callbacks.keydown({key:'ArrowDown',preventDefault:()=>{preventions++}});
  assert.deepStrictEqual(commits.at(-1),{n:460,persist:true},
    'keyboard resize preserves the original saved-height behavior');
  assert(preventions>=4);
}

console.log('Granada #149 runtime PASS: independent A/B heights, focus/restore/Escape, hidden/detached view safety, ES/EN labels, stored sizes, CSS/DPR/canvas geometry, conflict evidence.');
