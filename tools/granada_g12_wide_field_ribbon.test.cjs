'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../desktop/src/FoamLensDesktop/frontend');
const source=fs.readFileSync(path.join(root,'v31-granada-wide-field-ribbon.js'),'utf8');
function fixture({width=1140,height=820,mode='field',ready=true,language='en',playWidth=140,playScroll=132,playLeft=100,playHeight=32,loop=true,withClock=true}={}){
 const ids=new Map(),listeners={};
 class El{
  constructor(id='',tag='div'){this._id='';this.tagName=tag;this.textContent='';this.attrs={};this.children=[];this.clientWidth=0;this.scrollWidth=0;this.scrollLeft=0;this.classSet=new Set();this.classList={contains:x=>this.classSet.has(x),add:x=>this.classSet.add(x),remove:x=>this.classSet.delete(x)};if(id)this.id=id;}
  set id(v){if(this._id)ids.delete(this._id);this._id=v;ids.set(v,this)}get id(){return this._id}
  appendChild(x){this.children.push(x);return x}
  contains(x){return x===this||this.children.some(y=>y.contains(x))}
  setAttribute(k,v){this.attrs[k]=v}getAttribute(k){return this.attrs[k]??null}
  getBoundingClientRect(){return this.box??{left:0,right:1140,top:0,bottom:50,width:1140,height:50}}
 }
 const doc={readyState:ready?'complete':'loading',getElementById:id=>ids.get(id)||null,
  createElement:t=>new El('',t),head:new El('head'),body:new El('body'),
  addEventListener:(key,fn)=>(listeners[key]=fn)};
 doc.body.classList.add('flRibbonReady');doc.body.classList.add('appMode-'+mode);
 const panel=new El('flRibbonPanel-field');panel.classList.add('active');panel.clientWidth=width;panel.scrollWidth=2200;
 const group=new El('flRibbonTimeGroup'),transport=new El('fwTimeTransport'),play=new El('fwTimePlay','button');
 group.appendChild(transport);transport.appendChild(play);
 play.box={left:playLeft,right:playLeft+playWidth,top:110,bottom:110+playHeight,width:playWidth,height:playHeight};
 play.clientWidth=playWidth;play.scrollWidth=playScroll;
 play.textContent=language==='es'?'▶ Reproducir':'▶ Play';
 play.setAttribute('aria-label',language==='es'?'Reproducir en bucle':'Play loop');
 if(!loop)play.setAttribute('aria-label','Standard playback');
 const clock=withClock?new El('fwTimeReadout'):null;if(clock)clock.textContent='t = 9.8 s';
 const shelf=new El('flFieldContextShelf');shelf.clientWidth=width;shelf.scrollWidth=2293;shelf.scrollLeft=870;
 const w={innerWidth:width,innerHeight:height};
 const context={window:w,document:doc,console};
 vm.runInNewContext(source,context,{timeout:3000});
 const api=w.FoamLensGranadaG12;
 return{api,doc,ids,style:()=>ids.get('flG12WideFieldRibbonStyle')?.textContent,play,panel,transport,clock,shelf,fire:()=>listeners.DOMContentLoaded?.()};
}
test('real 1140px Field Play fit contract passes with original transport and real clock',()=>{
 const f=fixture(),a=f.api.audit();
 assert.equal(a.result,'PASS');assert.equal(a.active,true);
 assert.equal(a.originalTransportPreserved,true);
 assert.equal(a.playTextFits,true);assert.equal(a.playVisibleInViewport,true);
 assert.equal(a.clockText,'t = 9.8 s');assert.equal(a.shelfScrollWidth,2293);
 assert.equal(a.physicsAndStoredStateChanged,false);
});
test('recreates observed 1140px native failure when original Play text overflows',()=>{
 const a=fixture({playWidth:106,playScroll:150}).api.audit();
 assert.equal(a.result,'FAIL');assert.equal(a.playTextFits,false);
 assert.equal(a.viewport.width,1140);
});
test('recreates original offscreen shelf/ribbon case when Play starts beyond viewport',()=>{
 const a=fixture({playLeft:1280,playWidth:140}).api.audit();
 assert.equal(a.result,'FAIL');assert.equal(a.playVisibleInViewport,false);
});
test('recreates native gate too-narrow Play in 1140px Field',()=>{
 const a=fixture({playWidth:85,playScroll:80}).api.audit();
 assert.equal(a.result,'FAIL');assert.equal(a.playVisibleInViewport,false);
});
test('rejects absent original physical-time clock even when fake Play renders',()=>{
 const a=fixture({withClock:false}).api.audit();assert.equal(a.originalTransportPreserved,false);assert.equal(a.result,'FAIL');
});
test('Play ARIA loop/bucle remains mandatory',()=>{
 assert.equal(fixture({loop:false}).api.audit().result,'FAIL');
 assert.equal(fixture({language:'es'}).api.audit().result,'PASS');
});
test('Field wide applies only to genuine 1025..1250px and not G7 compact or huge',()=>{
 for(const width of [640,1024,1251,1920])assert.equal(fixture({width}).api.audit().result,'NOT_APPLICABLE');
 assert.equal(fixture({mode:'analysis'}).api.audit().result,'NOT_APPLICABLE');
 assert.equal(fixture({mode:'data'}).api.audit().result,'NOT_APPLICABLE');
});
test('responsive CSS reserves a real full-width row ahead of original commands and preserves named Play',()=>{
 const css=fixture().style();
 assert(css.includes('@media(min-width:1025px) and (max-width:1250px)'));
 assert(css.includes('#flRibbonPanel-field.active>.flRibbonTimeGroup{order:-1!important;flex:1 0 100%'));
 assert(css.includes('#fwTimePlay{width:max-content!important;min-width:112px!important'));
 assert(css.includes('grid-template-columns:32px max-content 32px minmax(90px,1fr)'));
 assert(!css.includes('display:none!important')&&!css.includes('visibility:hidden'));
});
test('no user state, time stepping, file or physics paths are touched',()=>{
 for(const forbidden of ['localStorage','sessionStorage','fetch(', 'setDataView(', 'setAppMode(', 'fwTimePlay.click', 'dispatchEvent(', 'postMessage(', 'saveVisualDefaults(', 'fvLoadFrame(', 'stopAllPlayback('])assert(!source.includes(forbidden),forbidden);
 assert(source.includes('Object.freeze({audit})'));
});
test('deferred bootstrap adds identical scoped style on DOMContentLoaded',()=>{
 const f=fixture({ready:false});assert.equal(f.style(),undefined);f.fire();assert(f.style()?.includes('1025px'));f.fire();assert.equal(f.doc.head.children.length,1);
});
test('original product still owns physical Field IDs and module injector, no fake controls',()=>{
 const ribbon=fs.readFileSync(path.join(root,'v15-ribbon-ui.js'),'utf8'),
   host=fs.readFileSync(path.join(__dirname,'../desktop/src/FoamLensDesktop/Program.cs'),'utf8');
 for(const id of ['flRibbonPanel-field','flRibbonTimeGroup','fwTimeTransport','fwTimePlay','fwTimeReadout','flFieldContextShelf'])assert(ribbon.includes(id),id);
 assert(host.includes('Directory.GetFiles(AppRoot, "v*-*.js")'));
});
