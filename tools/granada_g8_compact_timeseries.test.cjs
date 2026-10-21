'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../desktop/src/FoamLensDesktop/frontend');
const source=fs.readFileSync(path.join(root,'v28-granada-compact-timeseries.js'),'utf8');
function fixture({width=640,mode='data',dataView='timeseries',language='en',missing='' }={}){
 const ids=new Map(),docEvents={},winEvents={},observers=[];
 let document;
 class Element{
  constructor(tag='div'){this.tagName=tag.toUpperCase();this.parentNode=null;this.children=[];this.attributes={};this.listeners={};this.hidden=false;this.disabled=false;this.tabIndex=0;this.isConnected=true;this.textContent='';this.title='';this.value='';this.style={props:{},setProperty:(k,v)=>{this.style.props[k]=v}};
   this._classes=new Set();this.classList={add:k=>{this._classes.add(k);this.changed()},remove:k=>{this._classes.delete(k);this.changed()},contains:k=>this._classes.has(k),toggle:(k,v)=>{if(v===undefined?v:!!v)this._classes.add(k);else this._classes.delete(k);this.changed()}};}
  set id(v){if(this._id)ids.delete(this._id);this._id=v;if(v)ids.set(v,this)}get id(){return this._id||''}
  set className(x){this._classes=new Set(x.split(/\s+/).filter(Boolean))}get className(){return [...this._classes].join(' ')}
  changed(){for(const o of observers)if(o.targets.has(this))o.callback()}
  setAttribute(k,v){this.attributes[k]=String(v)}getAttribute(k){return this.attributes[k]??null}removeAttribute(k){delete this.attributes[k]}
  append(...items){for(const x of items){x.parentNode=this;this.children.push(x)}}
  prepend(...items){for(const x of items.reverse()){x.parentNode=this;this.children.unshift(x)}}
  insertBefore(x,next){if(x.parentNode)x.remove();const i=this.children.indexOf(next);this.children.splice(i<0?this.children.length:i,0,x);x.parentNode=this}
  remove(){if(this.parentNode){this.parentNode.children.splice(this.parentNode.children.indexOf(this),1);this.parentNode=null;this.isConnected=false}}
  get firstChild(){return this.children[0]||null}
  addEventListener(k,f){(this.listeners[k]??=[]).push(f)}
  emit(k,e={}){for(const f of this.listeners[k]||[])f({...e,target:e.target||this})}
  click(){this.emit('click')}
  focus(){document.activeElement=this}
  getBoundingClientRect(){return{bottom:180,width:640,height:90}}
  getClientRects(){return this.hidden?[]:[{width:100}]}
  closest(selector){return selector==='[hidden],[inert]'&&this.hidden?this:null}
  querySelector(selector){if(selector==='.plotcard')return this.children.find(x=>x.className.includes('plotcard'))||null;
   if(selector==='.timeSeriesActions')return this.children.find(x=>x.className.includes('timeSeriesActions'))||null;return null}
  querySelectorAll(selector){const result=[];function walk(n){for(const e of n.children){if(selector==='button,[href],input,select,textarea,[tabindex]'&&['BUTTON','INPUT','SELECT','TEXTAREA'].includes(e.tagName))result.push(e);walk(e)}}walk(this);return result}
 }
 document={readyState:'complete',createElement:t=>new Element(t),createComment:()=>new Element('comment'),getElementById:k=>ids.get(k)||null,
  addEventListener:(k,f)=>(docEvents[k]??=[]).push(f),emit:(k,e)=>{for(const f of docEvents[k]||[])f(e)},activeElement:null,
  querySelector:q=>q==='#appShell>.sidebar'?side:q==='.main>.top .flGlobalUtilities'?utility:null};
 document.documentElement=new Element('html');document.documentElement.lang=language;
 document.head=new Element('head');document.body=new Element('body');document.documentElement.append(document.head,document.body);
 const app=new Element('div');app.id='appShell';const side=missing==='sidebar'?null:new Element('aside');
 if(side)side.className='sidebar';
 const controls=missing==='controls'?null:new Element('section');if(controls){controls.id='timeSeriesControls';const actions=new Element('div');actions.className='timeSeriesActions';controls.append(actions);side?.append(controls)}
 if(side)app.append(side);
 const utility=missing==='utility'?null:new Element('div');
 const chart=new Element('section');chart.className='plotcard';chart.append(new Element('div'));
 const workspace=new Element('section');workspace.id='workspace';workspace.append(chart);
 const main=new Element('main');main.append(workspace);app.append(main);document.body.append(app);
 const ribbon=new Element('div');ribbon.id='flRibbon';document.body.append(ribbon);
 const languageEl=new Element('select');languageEl.id='language';languageEl.value=language;document.body.append(languageEl);
 const tab=new Element('button');tab.id='timeSeriesTab';if(dataView==='timeseries')tab.classList.add('active');document.body.append(tab);
 const canvas=new Element('canvas');canvas.id='canvas';chart.append(canvas);
 const details=new Element('details');details.id='fwDataFieldHistories';side?.append(details);
 if(mode)document.body.classList.add('appMode-'+mode);
 const window={innerWidth:width,innerHeight:900,addEventListener:(k,f)=>(winEvents[k]??=[]).push(f),emit:k=>{for(const f of winEvents[k]||[])f()}};
 const Observer=function(callback){this.callback=callback;this.targets=new Set();this.observe=node=>{this.targets.add(node);if(!observers.includes(this))observers.push(this)};this.disconnect=()=>{this.targets.clear()}};
 vm.runInNewContext(source,{document,window,MutationObserver:Observer,ResizeObserver:Observer},{timeout:3000});
 const api=window.FoamLensGranadaG8;
 return {document,window,api,app,side,controls,chart,tab,utility,languageEl,details,originalParent:side,
  resize(w){window.innerWidth=w;window.emit('resize')},
  setMode(name){for(const n of ['data','analysis','field','workspace'])document.body.classList.remove('appMode-'+n);document.body.classList.add('appMode-'+name)},
  changeTab(name){tab.classList.toggle('active',name==='timeseries')},
  key(name,shiftKey=false){let prevented=false;document.emit('keydown',{key:name,shiftKey,preventDefault(){prevented=true},stopPropagation(){}});return prevented}
 };
}
test('G8 limits to Data > Time Series and never modifies scientific algorithms',()=>{
 assert(source.includes("appMode-data")&&source.includes("timeSeriesTab"));
 assert(!/\b(?:setDataView|setAppMode|draw|buildFieldTimeSeries|runProjectScan)\s*\(/.test(source));
 assert(!source.includes('localStorage')&&!source.includes('fetch('));
});
test('on 640px the real controls move, not clone, above the original chart',()=>{
 const f=fixture();assert.equal(f.api.audit().installed,true);assert.equal(f.api.audit().compact,true);
 assert.strictEqual(f.controls.parentNode,f.chart);assert.strictEqual(f.chart.children[0],f.controls);
 assert.strictEqual(f.document.getElementById('timeSeriesControls'),f.controls);
 assert.strictEqual(f.document.getElementById('canvas').parentNode,f.chart);
});
test('wide layout restores original sidebar and scientific selector instance',()=>{
 const f=fixture();f.resize(1280);assert.equal(f.api.audit().compact,false);
 assert.equal(f.api.audit().originalControlsMoved,false);assert.strictEqual(f.controls.parentNode,f.side);
 f.resize(640);assert.strictEqual(f.controls.parentNode,f.chart);
});
test('other Data tabs restore source control ownership',()=>{
 const f=fixture();f.changeTab('catalog');assert(!f.api.audit().compact);assert.strictEqual(f.controls.parentNode,f.side);
 f.changeTab('timeseries');assert(f.api.audit().compact);
});
test('other app modes do not leak overlays or hide original controls',()=>{
 const f=fixture();f.setMode('analysis');assert(!f.api.audit().compact);assert.strictEqual(f.controls.parentNode,f.side);
});
test('original imports are accessible through dialog with keyboard closing',()=>{
 const f=fixture(),trigger=f.document.getElementById('g8Trigger');trigger.focus();
 assert(f.api.open());assert.equal(f.api.audit().drawerOpen,true);
 assert.strictEqual(f.controls.parentNode,f.chart);assert.equal(f.side.getAttribute('aria-modal'),'true');
 assert(f.key('Escape'));assert.equal(f.api.audit().drawerOpen,false);assert.equal(f.side.getAttribute('aria-modal'),null);
 assert.strictEqual(f.document.activeElement,trigger);
});
test('Tab and Shift+Tab are trapped inside original sidebar drawer',()=>{
 const f=fixture();f.api.open();const close=f.document.getElementById('g8Close');
 assert(f.key('Tab'));assert.strictEqual(f.document.activeElement,close);
 assert(f.key('Tab',true));assert.strictEqual(f.document.activeElement,close);
});
test('Build history shortcut opens original source builder, never invents histories',()=>{
 const f=fixture(),jump=f.document.getElementById('g8History');
 assert.equal(jump.disabled,false);jump.click();assert.equal(f.details.open,true);
 assert.equal(f.api.audit().drawerOpen,true);
});
test('bilingual labels, chart width CSS and independent G7 namespace',()=>{
 const f=fixture({language:'es'});assert.equal(f.document.getElementById('g8Trigger').textContent,'Casos e importar');
 f.languageEl.value='en';f.document.emit('change',{target:f.languageEl});
 assert.equal(f.document.getElementById('g8Trigger').textContent,'Cases & import');
 const css=f.document.getElementById('g8Style').textContent;
 assert(css.includes('grid-template-columns:minmax(0,1fr)!important'));
 assert(css.includes('#timeSeriesControls'));assert(css.includes('#workspace>.plotcard'));
 assert(css.includes('.g8History{display:none;'));
 assert(css.includes('body.appMode-data .app.g8Compact .g8History{display:inline-flex'));

 assert(!source.includes('gfwCompact'));
});
test('missing original scientific shell fails closed without pretending installation',()=>{
 const f=fixture({missing:'utility'});assert.equal(f.api.audit().installed,false);
 assert.equal(f.api.open(),false);assert.equal(f.api.audit().error,'missing-native-data-shell');
});
test('the real FoamLens native UI owns all selectors and the versioned module bundler',()=>{
 const original=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const program=fs.readFileSync(path.join(__dirname,'../desktop/src/FoamLensDesktop/Program.cs'),'utf8');
 for(const id of ['appShell','timeSeriesControls','timeSeriesTab','workspace','canvas','fwDataFieldHistories']){
  if(id!=='fwDataFieldHistories')assert(original.includes('id="'+id+'"'),id+' missing in original');
 }
 assert(original.includes('class="flGlobalUtilities"'));
 assert(program.includes('Directory.GetFiles(AppRoot, "v*-*.js")'));
});
