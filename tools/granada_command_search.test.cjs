'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),
 fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const src=fs.readFileSync(path.join(__dirname,'../desktop/src/FoamLensDesktop/frontend/v26-granada-command-search.js'),'utf8');
function fixture({missing=null,language='en'}={}){
 const idMap=new Map(),events={},nativeClicks={};
 let doc;
 class El{
  constructor(tag='div'){this.tagName=tag.toUpperCase();this._id='';this.children=[];this.parentElement=null;
   this.attributes={};this.listeners={};this.dataset={};this.style={};this.hidden=false;
   this.disabled=false;this.isConnected=true;this.value='';this.textContent='';this.className='';
   this.classList={add:v=>{if(!this.className.split(' ').includes(v))this.className=(this.className+' '+v).trim()},
    toggle:(v,on)=>{const b=this.className.split(' ').filter(Boolean);const yes=on===undefined?!b.includes(v):on;this.className=[...new Set(b.filter(x=>x!==v).concat(yes?[v]:[]))].join(' ');return yes},
    contains:v=>this.className.split(' ').includes(v)};
  }
  set id(v){if(this._id)idMap.delete(this._id);this._id=v;if(v)idMap.set(v,this)}
  get id(){return this._id}
  get type(){return this._type}
  set type(v){this._type=v}
  setAttribute(k,v){this.attributes[k]=String(v)}
  getAttribute(k){return this.attributes[k]??null}
  removeAttribute(k){delete this.attributes[k]}
  append(...ns){for(const n of ns){if(n.parentElement)n.parentElement.children=n.parentElement.children.filter(x=>x!==n);this.children.push(n);n.parentElement=this}}
  appendChild(n){this.append(n);return n}
  replaceChildren(...ns){for(const c of this.children)c.parentElement=null;this.children=[];this.append(...ns)}
  matches(selector){
   if(selector.startsWith('.'))return this.classList.contains(selector.slice(1));
   if(selector.startsWith('#'))return this.id===selector.slice(1);
   if(selector==='[role="option"]')return this.getAttribute('role')==='option';
   if(selector==='[inert]')return this.getAttribute('inert')!==null;
   return false
  }
  querySelectorAll(selector){const out=[];function walk(p){for(const el of p.children){if(el.matches(selector))out.push(el);walk(el)}}walk(this);return out}
  querySelector(selector){return this.querySelectorAll(selector)[0]||null}
  closest(selector){let n=this;while(n){if(n.matches(selector))return n;n=n.parentElement}return null}
  addEventListener(k,fn){(this.listeners[k]??=[]).push(fn)}
  emit(k,evt={}){for(const fn of this.listeners[k]||[])fn(evt)}
  click(){if(this.disabled)return;nativeClicks[this.id]=(nativeClicks[this.id]||0)+1;this.emit('click',{target:this})}
  focus(){doc.activeElement=this}
 }
 doc={readyState:'complete',documentElement:new El('html'),activeElement:null,
  createElement:tag=>new El(tag),getElementById:id=>idMap.get(id)||null,
  addEventListener:(k,fn)=>(events[k]??=[]).push(fn),emit:(k,e)=>{for(const cb of events[k]||[])cb(e)}
 };
 doc.head=new El('head');doc.body=new El('body');doc.documentElement.lang=language;
 doc.documentElement.append(doc.head,doc.body);
 const source=doc.createElement('section');source.id='flRibbon';
 const row=doc.createElement('div');row.className='flRibbonTabRow';source.append(row);doc.body.append(source);
 const tabs=['home','data','field','analysis','export','view'];
 for(const tab of tabs){if(missing==='flRibbonTab-'+tab)continue;
  const node=doc.createElement('button');node.id='flRibbonTab-'+tab;node.dataset.ribbonTab=tab;
  row.append(node)}
 for(const id of ['flRaReview','flRaLive','flRaDataProfiles','flRaDataTimeSeries',
  'flRaDataLogs','flRaDataCompare','flRaCases','flRaHelp','flRaClear']){
  if(missing===id)continue;
  const node=doc.createElement('button');node.id=id;doc.body.append(node)
 }
 const lang=doc.createElement('select');lang.id='language';lang.value=language;doc.body.append(lang);
 const window={};vm.runInNewContext(src,{window,document:doc,console,
  MutationObserver:undefined,requestAnimationFrame:()=>null},{timeout:3000});
 return{window,doc,idMap,row,nativeClicks,events,El,source};
}
function key(f,k,opts={}){
 let prevented=false,stopped=false;f.doc.emit('keydown',{key:k,...opts,
  preventDefault(){prevented=true},stopPropagation(){stopped=true}});
 return{prevented,stopped}
}
test('always-visible Find entry in native Ribbon without moving any original action',()=>{
 const f=fixture(),ui=f.window.FoamLensGranadaCommandSearch;
 assert(f.doc.getElementById('fgpTrigger'));
 assert.equal(f.row.children.length,7);
 assert.equal(f.doc.getElementById('flRaLive').parentElement,f.doc.body);
 assert.equal(ui.audit().controlCount,14);
 assert.equal(ui.audit().originalRoutes.length,6);
});
test('Ctrl+K opens searchable dialog and Escape returns focus to prior control',()=>{
 const f=fixture(),ui=f.window.FoamLensGranadaCommandSearch;
 const previous=f.doc.getElementById('flRibbonTab-field');previous.focus();
 assert.equal(key(f,'k',{ctrlKey:true}).prevented,true);
 assert.equal(ui.audit().open,true);assert.equal(f.doc.activeElement.id,'fgpSearch');
 assert.equal(f.doc.getElementById('fgpOverlay').hidden,false);
 assert.equal(key(f,'Escape').prevented,true);
 assert.equal(ui.audit().open,false);assert.strictEqual(f.doc.activeElement,previous);
});
test('safe original Field route fires EXACT native click and never simulates a mode',()=>{
 const f=fixture(),ui=f.window.FoamLensGranadaCommandSearch;
 assert(ui.open());const input=f.doc.getElementById('fgpSearch');
 input.value='3d';input.emit('input');
 assert.equal(key(f,'Enter').prevented,true);
 assert.equal(f.nativeClicks['flRibbonTab-field'],1);
 assert.equal(ui.audit().executions,1);assert.equal(ui.audit().open,false);
});
test('Review and Live use their real original Home Ribbon handlers',()=>{
 const f=fixture(),ui=f.window.FoamLensGranadaCommandSearch;
 ui.open();const input=f.doc.getElementById('fgpSearch');input.value='review';input.emit('input');
 key(f,'Enter');assert.equal(f.nativeClicks.flRaReview,1);
 ui.open();input.value='live';input.emit('input');key(f,'Enter');assert.equal(f.nativeClicks.flRaLive,1);
});
test('case insensitive accent tolerant search finds correct original Time Series button',()=>{
 const f=fixture(),ui=f.window.FoamLensGranadaCommandSearch;
 assert(ui.search('séries')[0]?.controlId==='flRaDataTimeSeries');
 ui.open();const input=f.doc.getElementById('fgpSearch');input.value='series';input.emit('input');key(f,'Enter');
 assert.equal(f.nativeClicks.flRaDataTimeSeries,1);
});
test('disabled actions cannot execute, and destructive Clear action is never indexed',()=>{
 const f=fixture(),ui=f.window.FoamLensGranadaCommandSearch;
 f.doc.getElementById('flRaDataLogs').disabled=true;
 assert(!ui.search('solver').length);
 assert(!ui.search('flRaClear').length);
 ui.open();const input=f.doc.getElementById('fgpSearch');
 input.value='flRaClear';input.emit('input');key(f,'Enter');
 assert.equal(f.nativeClicks.flRaClear,undefined);
 assert.equal(ui.audit().executions,0);
});
test('missing original Ribbon never fabricates replacement modes or mutation',()=>{
 const f=fixture({missing:'flRibbonTab-analysis'});
 const api=f.window.FoamLensGranadaCommandSearch;
 assert.equal(f.doc.getElementById('fgpTrigger'),null);
 assert.equal(api.audit().installed,false);
 assert.equal(api.open(),false);
});
test('visible modal traps Tab focus across search/results/close and supports arrows',()=>{
 const f=fixture(),ui=f.window.FoamLensGranadaCommandSearch;
 ui.open();const input=f.doc.getElementById('fgpSearch');
 assert.equal(key(f,'Tab',{shiftKey:true}).prevented,true);
 assert(f.doc.activeElement.className.includes('fgpClose'));
 key(f,'Tab');assert.strictEqual(f.doc.activeElement,input);
 key(f,'ArrowDown');assert.equal(input.getAttribute('aria-activedescendant'),'fgpItem-1');
 key(f,'ArrowUp');assert.equal(input.getAttribute('aria-activedescendant'),'fgpItem-0');
});
test('Spanish displays native names, keeps same original control identity',()=>{
 const f=fixture({language:'es'}),ui=f.window.FoamLensGranadaCommandSearch;
 const cmd=ui.search('perfiles')[0];assert.equal(cmd.controlId,'flRaDataProfiles');
 assert.equal(f.doc.getElementById('fgpTrigger').children[1].textContent,'Buscar');
 ui.open();const input=f.doc.getElementById('fgpSearch');input.value='vivo';input.emit('input');key(f,'Enter');
 assert.equal(f.nativeClicks.flRaLive,1);
});
test('outer backdrop closes dialog without launching a command',()=>{
 const f=fixture(),ui=f.window.FoamLensGranadaCommandSearch;
 ui.open();const layer=f.doc.getElementById('fgpOverlay');layer.emit('pointerdown',{target:layer});
 assert.equal(ui.audit().open,false);
 assert.equal(ui.audit().executions,0);
});
test('source data and original events are never embedded in audit or exported',()=>{
 const f=fixture(),api=f.window.FoamLensGranadaCommandSearch;
 const a=JSON.stringify(api.audit());assert(!/path|caseName|token|C:\\\\|\/home\//i.test(a));
 assert.equal(api.audit().noPrivateCaseData,true);
 assert(src.includes('body')&&src.includes('@media(max-width:600px)'));
});
test('original FoamLens Ribbon includes all six tabs and original navigation events',()=>{
 const p=path.join(__dirname,'../desktop/src/FoamLensDesktop/frontend/v15-ribbon-ui.js');
 const original=fs.readFileSync(p,'utf8');
 for(const id of ['home','data','field','analysis','export','view'])
  assert(original.includes("['"+id+"',"),'original tab source missing: '+id);
 for(const id of ['flRaReview','flRaLive','flRaDataTimeSeries','flRaDataProfiles',
  'flRaDataLogs','flRaDataCompare','flRaCases','flRaHelp'])
  assert(original.includes("'"+id+"'"),'original handler missing: '+id);
});
