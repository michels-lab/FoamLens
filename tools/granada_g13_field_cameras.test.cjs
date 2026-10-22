'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../desktop/src/FoamLensDesktop/frontend');
const source=fs.readFileSync(path.join(root,'v32-granada-field-cameras.js'),'utf8');
const names=['Iso','Front','Back','Left','Right','Top','Bottom'];
function fixture({width=1140,mode='field',ready=true,open=false,overflow=0,missing='',hidden='',offscreen='',unnamed=''}={}){
 const ids=new Map(),handlers={};
 class E{
  constructor(tag='div',id=''){this.tagName=tag.toUpperCase();this.children=[];this.textContent='';this.attrs={};this.style={display:'block',visibility:'visible'};this.clientWidth=width;this.scrollWidth=width;this.scrollLeft=0;this.has={};this.classList={add:k=>this.has[k]=true,remove:k=>delete this.has[k],contains:k=>!!this.has[k]};if(id)this.id=id;}
  set id(x){this._id=x;ids.set(x,this)}get id(){return this._id}
  appendChild(x){this.children.push(x);return x}
  getBoundingClientRect(){return this.rect||{left:0,right:100,top:20,bottom:55,width:100,height:35}}
  getAttribute(k){return this.attrs[k]??null}
  setAttribute(k,v){this.attrs[k]=String(v)}
  querySelector(q){if(q==='.flRibbonLabel')return this.label||null;return null}
 }
 const doc={readyState:ready?'complete':'loading',getElementById:id=>ids.get(id)||null,
  createElement:tag=>new E(tag),head:new E('head'),body:new E('body'),
  addEventListener:(key,cb)=>{handlers[key]=cb},querySelector:q=>q==='[data-fl-subbar="camera"]'?cameraTab:null};
 doc.body.classList.add('flRibbonReady');doc.body.classList.add('appMode-'+mode);
 const panel=new E('div','flRibbonPanel-field');panel.classList.add('active');
 const shelf=new E('div','flFieldContextShelf');shelf.clientWidth=width;shelf.scrollWidth=width+overflow;
 const cameraTab=new E('button');if(open)cameraTab.classList.add('active');
 if(!open)shelf.classList.add('hidden');
 for(const name of names){
   const id='flRaCamera'+name;if(id===missing)continue;
   const e=new E('button',id);
   const label=new E('span');label.textContent=name;e.label=label;e.textContent=name;
   e.setAttribute('aria-label',name);e.setAttribute('title',name);
   if(id===hidden)e.style.display='none';
   if(id===unnamed)e.setAttribute('aria-label','');
   if(id===offscreen)e.rect={left:1240,right:1340,top:20,bottom:55,width:100,height:35};
 }
 const win={innerWidth:width,innerHeight:820};
 vm.runInNewContext(source,{window:win,document:doc,getComputedStyle:e=>e.style},{timeout:3000});
 return{api:win.FoamLensGranadaG13,doc,shelf,ids,style:()=>ids.get('flG13CameraAccessStyle')?.textContent,fire:()=>handlers.DOMContentLoaded?.()};
}
test('G13 7 original cameras reachable by name in real 1140 Field mode',()=>{
 const f=fixture({open:true});const a=f.api.audit();
 assert.equal(a.active,true);assert.equal(a.result,'PASS');assert.equal(a.originalPresetCount,7);
 assert.equal(a.allOriginalPresetsVisible,true);assert.equal(a.cameraShelfFits,true);
 assert.equal(a.solverStateChanged,false);assert.equal(a.nativeDpiOrHumanApproved,false);
});
test('old 2293px overflowed shelf fails closed even when all source camera buttons exist',()=>{
 const a=fixture({open:true,overflow:1153}).api.audit();
 assert.equal(a.result,'FAIL');assert.equal(a.cameraShelfScrollWidth,2293);
 assert.equal(a.cameraShelfClientWidth,1140);assert.equal(a.allOriginalPresetsVisible,true);
});
test('intentionally closed camera shelf does not falsely report overflow as unusable',()=>{
 const a=fixture({open:false,overflow:1153}).api.audit();
 assert.equal(a.cameraOpen,false);assert.equal(a.cameraShelfFits,true);
});
test('real missing original camera button cannot be replaced by an invented proxy',()=>{
 const a=fixture({missing:'flRaCameraBack'}).api.audit();
 assert.equal(a.result,'FAIL');assert.equal(a.originalPresetCount,6);
 assert.equal(a.allOriginalPresetsPresent,false);
});
test('hidden/offscreen/unlabelled camera buttons fail independently',()=>{
 for(const kind of ['hidden','offscreen','unnamed']){
  const args={};args[kind]='flRaCameraFront';
  const a=fixture(args).api.audit();
  assert.equal(a.result,'FAIL',kind);
 }
});
test('original modes and breakpoints retained; no G7 compact or desktop expansion',()=>{
 for(const w of [640,1024,1251,1920])assert.equal(fixture({width:w}).api.audit().result,'NOT_APPLICABLE');
 for(const mode of ['data','analysis','review'])assert.equal(fixture({mode}).api.audit().result,'NOT_APPLICABLE');
});
test('original camera presets labelled, sourced and wrapped WITHOUT new toolbar IDs',()=>{
 const f=fixture({open:true}),css=f.style();
 assert(css.includes('@media(min-width:1025px) and (max-width:1250px)'));
 assert(css.includes(':is(#flRibbonPanel-field,#flFieldContextShelf) .flRibbonGroup:has(#flRaCameraIso)'));
 assert(css.includes(':is(#flRibbonPanel-field,#flFieldContextShelf) :is(#flRaCameraIso'));
 assert(css.includes('#flFieldContextShelf.flCameraToolsActive'));
 assert(!css.includes('body.flRibbonReady.appMode-field #flRibbonPanel-field .flRibbonGroup:has(#flRaCameraIso)'));
 assert(css.includes('flRaCameraBottom) .flRibbonLabel{display:inline!important'));
 assert(css.includes('#flFieldContextShelf.flCameraToolsActive .flRibbonCameraTools .fvToolRow'));
 assert(!css.includes('display:none!important')&&!css.includes('visibility:hidden!important'));
 assert.equal(f.api.cameraIds.length,7);
});
test('original v15 moves seven camera handlers OUT of main Ribbon into Field shelf',()=>{
 const ribbon=fs.readFileSync(path.join(root,'v15-ribbon-ui.js'),'utf8');
 assert(ribbon.includes("const targets={inspect:'flRaProbe',compare:'flRaCompare3D',camera:'flRaLinkCameras'}"));
 assert(ribbon.includes('groups[key]=group;shelf.appendChild(group)'));
 const css=fixture({open:true}).style();
 assert(css.includes(':is(#flRibbonPanel-field,#flFieldContextShelf) .flRibbonGroup:has(#flRaCameraIso)'));
 assert(css.includes(':is(#flRibbonPanel-field,#flFieldContextShelf) :is(#flRaCameraIso'));
});
test('read-only CSS and computed geometry never click, reposition DOM or write scientific state',()=>{
 for(const term of ['localStorage','fetch(', 'postMessage(', '.click(', 'dispatchEvent(', 'scrollIntoView(', 'scrollLeft=', 'appendChild(', 'insertBefore(', 'removeChild(', 'querySelectorAll(', 'setDataView(', 'setWorkspaceZoom(']){
  // Only harmless installation of a style element is permitted.
  if(term==='appendChild(')continue;
  assert(!source.includes(term),term);
 }
 assert(source.includes("document.head.appendChild(tag)"));
 assert(source.includes('originalHandlersReused:true'));
});
test('deferred DOM installation attaches only one stylesheet',()=>{
 const f=fixture({ready:false});assert.equal(f.style(),undefined);
 f.fire();assert(f.style()?.includes('flRaCameraIso'));f.fire();
 assert.equal(f.doc.head.children.length,1);
});
test('real v15 ribbon binds all seven to original source renderer handlers',()=>{
 const ribbon=fs.readFileSync(path.join(root,'v15-ribbon-ui.js'),'utf8');
 for(const name of names)assert(ribbon.includes("'flRaCamera"+name+"'"),name);
 assert(ribbon.includes("document.querySelector('[data-fv-view=\"'+preset+'\"]')?.click()"));
 assert(ribbon.includes("flRibbonRevealCameraTools"));
 assert(ribbon.includes("flFieldContextShelf"));
 const host=fs.readFileSync(path.join(__dirname,'../desktop/src/FoamLensDesktop/Program.cs'),'utf8');
 assert(host.includes('Directory.GetFiles(AppRoot, "v*-*.js")'));
});
