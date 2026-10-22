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
const grid={classList:classes(),children:list};
elements.set('fcViewGrid',grid);
const status={textContent:''},out={textContent:''},exp={disabled:true};
elements.set('pvStatus',status);elements.set('pvEvidence',out);elements.set('pvExport',exp);
const stored=new Map(),downloads=[];
const context={
 window:{innerWidth:1280,innerHeight:720,devicePixelRatio:1.5,
   visualViewport:{scale:1},getComputedStyle:()=>({display:'block',visibility:'visible'})},
 document:{readyState:'loading',addEventListener:()=>{},getElementById:id=>elements.get(id)||null},
 localStorage:{getItem:k=>stored.get(k)||null,setItem:(k,v)=>stored.set(k,v)},
 requestAnimationFrame:()=>1,downloadText:(name,text,mime)=>downloads.push({name,text,mime}),
 URL,JSON,Set,Map,Number,Math,Date,Array,Object,String,console,ResizeObserver:undefined,
 MutationObserver:undefined
};
vm.runInNewContext(source,context,{timeout:3000});
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
assert.equal(api.focus(b.panel),true);
assert(!grid.classList.contains('pvFocus'),'Second click restores earlier A/B/C visibility');
assert.equal(api.focus(c.panel),false,'Hidden Field view cannot be maximized');
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
api.resetFocus();assert(!grid.classList.contains('pvFocus'));
context.window.FoamLensF2Layout.measure();
const exportedSource=source.includes('pvExport()')&&source.includes('downloadText(');
assert(exportedSource,'Local deliberate report export must remain available');
console.log('Granada #149 runtime PASS: independent A/B heights, focus/restore, hidden view safety, stored sizes, actual CSS/DPR/canvas geometry, deliberate conflict evidence.');
