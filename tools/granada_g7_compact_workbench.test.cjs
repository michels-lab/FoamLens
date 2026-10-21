'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),
 path=require('node:path'),vm=require('node:vm');
const SOURCE=fs.readFileSync(path.join(__dirname,'../desktop/src/FoamLensDesktop/frontend/v27-granada-compact-workbench.js'),'utf8');
function fixture({width=640,mode='field',language='en',missing=null,collapsed=false}={}){
 const ids=new Map(),documentEvents={},windowEvents={},observers=[];
 let document,focusCount=0;
 class Element{
  constructor(tag='div'){this.tagName=tag.toUpperCase();this._id='';this.children=[];this.parentNode=null;this.parentElement=null;
   this.attributes={};this.listeners={};this.hidden=false;this.disabled=false;this.isConnected=true;
   this.tabIndex=0;this.textContent='';this.title='';this.value='';
   this._classes=new Set();this.classList={add:k=>{this._classes.add(k);this.changed()},
    remove:k=>{this._classes.delete(k);this.changed()},
    toggle:(k,v)=>{const want=v===undefined?!this._classes.has(k):v;
      if(want)this._classes.add(k);else this._classes.delete(k);this.changed();return want},
    contains:k=>this._classes.has(k)};
   this.style={props:{},setProperty:(k,v)=>{this.style.props[k]=v}};
  }
  set id(v){if(this._id)ids.delete(this._id);this._id=v;if(v)ids.set(v,this)}
  get id(){return this._id}
  set className(v){this._classes=new Set(String(v).split(/\s+/).filter(Boolean))}
  get className(){return [...this._classes].join(' ')}
  changed(){if(this===document?.body)for(const ob of observers)if(ob.target===this)ob.callback([{type:'attributes',attributeName:'class'}]);}
  setAttribute(k,v){this.attributes[k]=String(v)}
  getAttribute(k){return Object.hasOwn(this.attributes,k)?this.attributes[k]:null}
  removeAttribute(k){delete this.attributes[k]}
  append(...elements){for(const el of elements){this.children.push(el);el.parentNode=this;el.parentElement=this}}
  prepend(...elements){for(const el of elements.reverse()){this.children.unshift(el);el.parentNode=this;el.parentElement=this}}
  addEventListener(k,f){(this.listeners[k]??=[]).push(f)}
  emit(k,e={}){for(const fn of this.listeners[k]||[])fn({...e,target:e.target||this})}
  click(){this.emit('click',{target:this})}
  focus(){document.activeElement=this;focusCount++}
  getBoundingClientRect(){return{bottom:this.id==='flRibbon'?184:140,top:54,width:640,height:90}}
  getClientRects(){return this.hidden?[]:[{width:100}]}
  closest(sel){if(sel==='[hidden],[inert]')return this.hidden?this:null;return null}
  querySelector(sel){
   if(sel==='.gfwLabel')return this.children.find(c=>c.className.includes('gfwLabel'))||null;
   return this.querySelectorAll(sel)[0]||null
  }
  querySelectorAll(sel){
   const result=[];
   function walk(el){for(const c of el.children){
    if(sel==='button,[href],input,select,textarea,[tabindex]'&&
     (['BUTTON','INPUT','SELECT','TEXTAREA'].includes(c.tagName)||c.attributes.tabindex!==undefined))result.push(c);
    walk(c)
   }}walk(this);return result
  }
 }
 document={readyState:'complete',documentElement:new Element('html'),activeElement:null,
  createElement:tag=>new Element(tag),getElementById:id=>ids.get(id)||null,
  querySelector:selector=>selector==='#appShell>.sidebar'?side:selector==='.main>.top .flGlobalUtilities'?utility:
    selector==='.main>.top'?header:null,
  addEventListener:(k,f)=>(documentEvents[k]??=[]).push(f),
  emit:(k,e)=>{for(const cb of documentEvents[k]||[])cb(e)},
 };
 document.documentElement.lang=language;
 document.head=new Element('head');document.body=new Element('body');
 document.documentElement.append(document.head,document.body);
 const app=new Element('div');app.id='appShell';if(collapsed)app.classList.add('sidebarCollapsed');
 const side=missing==='sidebar'?null:new Element('aside');if(side)side.className='sidebar';
 const native=new Element('button');native.id='fvOrbitMode';
 const originalSettings=new Element('button');originalSettings.id='fwInspectorToggle';
 if(side){side.append(native,originalSettings);app.append(side)}
 const main=new Element('main');const header=new Element('header');const utility=missing==='utility'?null:new Element('div');
 if(utility){utility.className='flGlobalUtilities';header.append(utility)}
 main.append(header);app.append(main);document.body.append(app);
 const lang=new Element('select');lang.id='language';lang.value=language;document.body.append(lang);
 for(const k of ['fvCanvas','canvas']){const el=new Element('canvas');el.id=k;main.append(el);}
 if(mode)document.body.classList.add('appMode-'+mode);
 const window={innerWidth:width,innerHeight:900,addEventListener:(k,f)=>(windowEvents[k]??=[]).push(f),
  emit:(k,e)=>{for(const f of windowEvents[k]||[])f(e)}};
 function Observer(cb){this.callback=cb;this.observe=el=>{this.target=el;observers.push(this)};this.disconnect=()=>{}}
 vm.runInNewContext(SOURCE,{window,document,MutationObserver:Observer,ResizeObserver:Observer},{timeout:3000});
 const api=window.FoamLensGranadaCompactWorkbench;
 return{window,document,api,app,side,native,utility,header,lang,observers,focusCount:()=>focusCount,
  setMode(next){for(const p of ['field','analysis','data','workspace'])document.body.classList.remove('appMode-'+p);
   if(next)document.body.classList.add('appMode-'+next)},
  resize(w){window.innerWidth=w;window.emit('resize')},
  sendKey(key,opts={}){let prevented=false,stopped=false;
   document.emit('keydown',{key,...opts,preventDefault(){prevented=true},stopPropagation(){stopped=true}});
   return{prevented,stopped}}
 };
}
test('installs exact original-controls button, no replacement/science handler takeover',()=>{
 const f=fixture();assert.equal(f.api.audit().installed,true);assert.equal(f.utility.children[0].id,'gfwTrigger');
 assert.strictEqual(f.side.children[1],f.native);assert.equal(f.api.audit().originalFieldCanvasRetained,true);
 assert.equal(f.api.audit().originalAnalysisCanvasRetained,true);
 assert.equal(f.api.audit().mode,'field');
});
test('compact Field defaults canvas-first with accessible original Controls drawer',()=>{
 const f=fixture();assert.equal(f.app.classList.contains('gfwCompact'),true);
 assert.equal(f.app.classList.contains('gfwOpen'),false);
 assert.equal(f.document.getElementById('gfwTrigger').getAttribute('aria-expanded'),'false');
 assert(f.document.getElementById('gfwG7Style').textContent.includes('grid-template-columns:minmax(0,1fr)!important'));
 assert(f.document.getElementById('gfwG7Style').textContent.includes('#fieldSurface'));
});
test('open uses native sidebar, ARIA modal and real original controls unmodified',()=>{
 const f=fixture(),btn=f.document.getElementById('gfwTrigger');btn.focus();
 assert.equal(f.api.open(),true);assert.equal(f.api.audit().drawerOpen,true);
 assert.equal(f.side.getAttribute('role'),'dialog');assert.equal(f.side.getAttribute('aria-modal'),'true');
 assert.equal(f.side.getAttribute('aria-hidden'),'false');assert.equal(btn.getAttribute('aria-expanded'),'true');
 assert.strictEqual(f.native.parentNode,f.side);
 assert.strictEqual(f.document.activeElement,f.document.getElementById('gfwClose'));
});
test('Escape closes focus-trapped overlay, returns original role/attributes and caller focus',()=>{
 const f=fixture(),btn=f.document.getElementById('gfwTrigger');
 f.side.setAttribute('role','complementary');f.side.setAttribute('aria-label','Original sidebar');
 btn.focus();f.api.open();assert.equal(f.sendKey('Escape').prevented,true);
 assert.equal(f.app.classList.contains('gfwOpen'),false);assert.strictEqual(f.document.activeElement,btn);
 assert.equal(f.side.getAttribute('role'),'complementary');assert.equal(f.side.getAttribute('aria-label'),'Original sidebar');
 assert.equal(f.side.getAttribute('aria-modal'),null);
});
test('Tab and Shift+Tab remain within original scientific controls on drawer open',()=>{
 const f=fixture();f.api.open();
 const close=f.document.getElementById('gfwClose');
 const prev=f.sendKey('Tab',{shiftKey:true});assert.equal(prev.prevented,true);
 assert.strictEqual(f.document.activeElement,f.native.parentElement.children.at(-1));
 close.focus();f.sendKey('Tab');assert.strictEqual(f.document.activeElement,f.native);
});
test('existing collapsed native sidebar still has a separate compact drawer path',()=>{
 const f=fixture({collapsed:true});assert.equal(f.app.classList.contains('sidebarCollapsed'),true);
 assert(f.api.open());assert.equal(f.app.classList.contains('gfwOpen'),true);
 assert.equal(f.app.classList.contains('sidebarCollapsed'),true);
 f.api.close();assert.equal(f.app.classList.contains('sidebarCollapsed'),true);
});
test('analysis uses the same drawer and stacks actual chart + original series list',()=>{
 const f=fixture({mode:'analysis'});const css=f.document.getElementById('gfwG7Style').textContent;
 assert(f.app.classList.contains('gfwCompact'));assert(f.api.open());
 assert(css.includes('body.appMode-analysis .app.gfwCompact #workspace'));
 assert(css.includes('grid-template-rows:minmax(375px,1fr) minmax(135px,200px)'));
 assert(css.includes('#seriesPanel'));assert(css.includes('--chart-min-w:min(760px'));
});
test('resizing past compact breakpoint automatically restores native desktop layout without persistence',()=>{
 const f=fixture();f.api.open();f.resize(1280);
 assert.equal(f.api.audit().compact,false);assert.equal(f.api.audit().drawerOpen,false);
 assert.equal(f.side.getAttribute('aria-modal'),null);assert.equal(f.app.classList.contains('sidebarCollapsed'),false);
 f.resize(640);assert.equal(f.api.audit().compact,true);assert.equal(f.api.audit().drawerOpen,false);
});
test('switching to Data always restores original sidebar state and disables compact drawer',()=>{
 const f=fixture();f.api.open();f.setMode('data');
 assert.equal(f.api.audit().mode,null);assert.equal(f.api.audit().drawerOpen,false);
 assert.equal(f.app.classList.contains('gfwCompact'),false);
 assert.equal(f.api.open(),false);assert.strictEqual(f.native.parentNode,f.side);
});
test('Spanish control labels update without replacing original sidebar or handlers',()=>{
 const f=fixture({language:'es'});const btn=f.document.getElementById('gfwTrigger');
 assert.equal(btn.querySelector('.gfwLabel').textContent,'Controles');
 f.api.open();const close=f.document.getElementById('gfwClose');
 assert.equal(close.textContent,'Cerrar controles');
 f.lang.value='en';f.document.emit('change',{target:f.lang});
 assert.equal(btn.querySelector('.gfwLabel').textContent,'Controls');
 assert.equal(close.textContent,'Close controls');
});
test('backdrop closes only from backdrop itself, not its children',()=>{
 const f=fixture();f.api.open();const back=f.document.getElementById('gfwBackdrop');
 back.emit('pointerdown',{target:f.native});assert.equal(f.api.audit().drawerOpen,true);
 back.emit('pointerdown',{target:back});assert.equal(f.api.audit().drawerOpen,false);
});
test('outside compact Field/Analysis never moves the original sidebar or opens drawer',()=>{
 const f=fixture({width:1400,mode:'analysis'});
 assert.equal(f.app.classList.contains('gfwCompact'),false);assert.equal(f.api.open(),false);
 assert.strictEqual(f.native.parentNode,f.side);
});
test('missing native shell fails closed and does not pretend success',()=>{
 const f=fixture({missing:'utility'});assert.equal(f.api.audit().installed,false);
 assert.equal(f.api.open(),false);assert.equal(f.api.audit().error,'missing-native-shell');
});
test('CSS retains Field camera controls and compact Ribbon physical transport without hiding original buttons',()=>{
 const f=fixture();const css=f.document.getElementById('gfwG7Style').textContent;
 assert(css.includes('#flRibbonPanel-field.active{flex-wrap:wrap!important'));
 assert(css.includes('.flRibbonTimeGroup .fwTimeTransport'));
 assert(css.includes('.fw3DCard #fvCanvas'));
 assert(!css.includes('display:none!important}#fvCanvas'));
 assert(!SOURCE.includes('setDataView('));assert(!SOURCE.includes('setAppMode('));
});
test('matches actual native source selectors and original sidebar ownership',()=>{
 const root=path.join(__dirname,'../desktop/src/FoamLensDesktop/frontend');
 const original=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const field=fs.readFileSync(path.join(root,'v14-zz-field-workspace.js'),'utf8');
 const ribbon=fs.readFileSync(path.join(root,'v15-ribbon-ui.js'),'utf8');
 for(const name of ['appShell','sidebarToggle','fieldSurface','workspace','seriesPanel','chartViewport','fwInspectorToggle']){
  assert(original.includes('id="'+name+'"')||field.includes('id=\\"'+name+'\\"')||field.includes("id='"+name+"'"),
   'Missing original app source node '+name);
 }
 assert(original.includes('<aside class="sidebar">'));
 assert(original.includes('class="flGlobalUtilities"'));
 assert(ribbon.includes('flRibbonPanel-field'));
 assert(field.includes("fwMountContextSidebar()"));
});
