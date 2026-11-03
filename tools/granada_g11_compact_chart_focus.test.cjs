'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),
  path=require('node:path'),vm=require('node:vm');
const frontend=path.resolve(__dirname,'../desktop/src/FoamLensDesktop/frontend');
const source=fs.readFileSync(path.join(frontend,'v30-granada-chart-focus.js'),'utf8');
function fixture({width=640,height=900,mode='data',tab=true,g8=true,savedHidden=false,language='en',missing=''}={}){
 const observers=[],events={};
 let document;
 class Node{
  constructor(tag='div'){this.tagName=tag.toUpperCase();this.id='';this.parentNode=null;this.children=[];
   this.textContent='';this.title='';this.type='';this.hidden=false;this.attributes={};this.listeners={};
   this._class=new Set();this.classList={
    add:n=>this._class.add(n),remove:n=>this._class.delete(n),contains:n=>this._class.has(n),
    toggle:(n,value)=>{if(value)this._class.add(n);else this._class.delete(n)}};
  }
  set className(v){this._class=new Set(String(v).split(/\s+/).filter(Boolean))}
  get className(){return [...this._class].join(' ')}
  appendChild(c){if(c.parentNode)c.remove();this.children.push(c);c.parentNode=this;return c}
  remove(){if(!this.parentNode)return;const x=this.parentNode.children.indexOf(this);
   if(x>=0)this.parentNode.children.splice(x,1);this.parentNode=null}
  querySelector(q){const find=node=>{for(const c of node.children){if(q[0]==='.'&&c.classList.contains(q.slice(1)))return c;
    if(q[0]==='#'&&c.id===q.slice(1))return c;const r=find(c);if(r)return r}return null};return find(this)}
  addEventListener(n,f){(this.listeners[n]??=[]).push(f)}
  setAttribute(n,v){this.attributes[n]=String(v)}
  getAttribute(n){return this.attributes[n]??null}
  click(){for(const f of this.listeners.click||[])f({target:this})}
 }
 document={readyState:'complete',documentElement:new Node('html'),head:new Node('head'),
  body:new Node('body'),addEventListener:(n,f)=>(events['doc-'+n]??=[]).push(f),
  createElement:t=>new Node(t)};
 document.documentElement.lang=language;
 document.documentElement.appendChild(document.head);document.documentElement.appendChild(document.body);
 document.getElementById=k=>document.documentElement.id===k?document.documentElement:
  (function find(n){for(const c of n.children){if(c.id===k)return c;const r=find(c);if(r)return r}return null})(document.documentElement);
 if(mode)document.body.classList.add('appMode-'+mode);
 if(savedHidden)document.body.classList.add('seriesPanelHidden');
 const app=new Node('div');app.id='appShell';if(g8)app.classList.add('g8Compact');document.body.appendChild(app);
 const workspace=new Node('div');workspace.id='workspace';app.appendChild(workspace);
 const plot=new Node('div');plot.className='plotcard';workspace.appendChild(plot);
 const chartHead=new Node('div');chartHead.className='head';plot.appendChild(chartHead);
 const actions=new Node('div');actions.className='plotHeadActions';chartHead.appendChild(actions);
 const fit=new Node('button');fit.id='zoomFit';let fitClicks=0;fit.addEventListener('click',()=>fitClicks++);if(missing!=='fit')actions.appendChild(fit);
 const viewport=new Node('div');viewport.id='chartViewport';if(missing!=='viewport')plot.appendChild(viewport);
 const controls=new Node('section');controls.id='timeSeriesControls';if(missing!=='controls')plot.appendChild(controls);
 const series=new Node('div');series.id='seriesPanel';if(missing!=='series')workspace.appendChild(series);
 const tabNode=new Node('button');tabNode.id='timeSeriesTab';if(tab)tabNode.classList.add('active');document.body.appendChild(tabNode);
 const lang=new Node('select');lang.id='language';lang.value=language;document.body.appendChild(lang);
 const window={innerWidth:width,innerHeight:height,FoamLensGranadaG8:{audit:()=>({installed:g8,compact:app.classList.contains('g8Compact')})},
   addEventListener:(n,f)=>(events['window-'+n]??=[]).push(f)};
 function Observer(cb){this.callback=cb;this.observe=(n,opt)=>{observers.push({n,opt,cb})};
   this.disconnect=()=>{}}
 vm.runInNewContext(source,{window,document,MutationObserver:Observer},{timeout:2000});
 const api=window.FoamLensGranadaG11;
 return{api,document,window,app,plot,actions,series,fit,controls,tabNode,lang,
  fitClicks:()=>fitClicks,
  resize(w,h){window.innerWidth=w;window.innerHeight=h;api.sync()},
  changeTab(on){tabNode.classList.toggle('active',on);api.sync()},
  changeMode(m){for(const n of ['data','analysis','field'])document.body.classList.remove('appMode-'+n);document.body.classList.add('appMode-'+m);api.sync()},
  setHidden(v){document.body.classList.toggle('seriesPanelHidden',v);api.sync()},
  setG8(v){app.classList.toggle('g8Compact',v);api.sync()},
  translate(v){lang.value=v;document.documentElement.lang=v;for(const cb of events['doc-change']||[])cb({target:lang})}
 };
}
test('real original HTML contains the actual source-owned Fit control and series list',()=>{
 const s=fs.readFileSync(path.join(frontend,'index.html'),'utf8');
 for(const name of ['zoomFit','seriesPanel','timeSeriesControls','timeSeriesTab','chartViewport','workspace'])
  assert(s.includes('id="'+name+'"'),name);
 assert(!source.includes('localStorage')&&!source.includes('sessionStorage'));
 assert(!source.includes('saveVisualDefaults')&&!source.includes('setWorkspaceZoom'));
});
test('640×900 automatically prioritizes original scientific chart without deleting its series',()=>{
 const f=fixture(),btn=f.document.getElementById('g11FocusToggle');
 assert.equal(f.api.audit().focused,true);
 assert(f.app.classList.contains('g11ChartFocus'));
 assert.strictEqual(f.document.getElementById('seriesPanel'),f.series);
 assert.equal(f.document.body.classList.contains('seriesPanelHidden'),false);
 assert.equal(btn.textContent,'Show series');
 assert.equal(btn.getAttribute('aria-pressed'),'true');
});
test('user can reveal and re-focus series without modifying original persisted preference',()=>{
 const f=fixture(),btn=f.document.getElementById('g11FocusToggle');
 btn.click();assert.equal(f.api.audit().focused,false);
 assert.equal(btn.textContent,'Focus chart');
 assert.equal(btn.getAttribute('aria-expanded'),'true');
 assert.equal(f.document.body.classList.contains('seriesPanelHidden'),false);
 btn.click();assert.equal(f.api.audit().focused,true);
 assert.equal(f.fitClicks(),0,'G11 must never silently change original zoom');
});
test('explicit Show series stays in place across viewport resizes and tab revisits',()=>{
 const f=fixture();f.document.getElementById('g11FocusToggle').click();
 f.resize(1280,900);assert.equal(f.api.audit().focused,false);
 f.resize(640,900);assert.equal(f.api.audit().focused,false);
 f.changeTab(false);assert.equal(f.api.audit().focused,false);
 f.changeTab(true);assert.equal(f.api.audit().focused,false);
 assert.equal(f.api.audit().manualOverride,false);
});
test('original saved hide-series preference is not overwritten by auto focus',()=>{
 const f=fixture({savedHidden:true});
 assert.equal(f.api.audit().focused,false);
 assert(f.document.body.classList.contains('seriesPanelHidden'));
 assert.strictEqual(f.document.getElementById('seriesPanel'),f.series);
 f.setHidden(false);assert.equal(f.api.audit().focused,true);
 f.setHidden(true);assert.equal(f.api.audit().focused,false);
});
test('other scientific tabs and workspaces remain untouched and original buttons survive',()=>{
 const f=fixture();f.changeTab(false);assert.equal(f.api.audit().focused,false);
 f.changeMode('field');assert.equal(f.api.audit().focused,false);
 f.changeMode('data');f.changeTab(true);assert.equal(f.api.audit().focused,true);
 assert.strictEqual(f.document.getElementById('zoomFit'),f.fit);
 assert.equal(f.fitClicks(),0);
});
test('no G8 branch means module is inert, and wide workspace never hides originals',()=>{
 const noG8=fixture({g8:false});assert.equal(noG8.api.audit().focused,false);
 assert.equal(noG8.api.audit().active,false);
 const wide=fixture({width:1280});assert.equal(wide.api.audit().focused,false);
 assert.equal(wide.document.getElementById('g11FocusToggle').hidden,true);
 assert.strictEqual(wide.series.parentNode,wide.document.getElementById('workspace'));
});
test('English and Spanish labels preserve source selector instance and original Fit',()=>{
 const f=fixture({language:'es'});
 const btn=f.document.getElementById('g11FocusToggle');
 assert.equal(btn.textContent,'Mostrar series');
 btn.click();assert.equal(btn.textContent,'Enfocar gráfica');
 f.translate('en');assert.equal(btn.textContent,'Focus chart');
 assert.strictEqual(f.document.getElementById('timeSeriesControls'),f.controls);
 assert.strictEqual(f.document.getElementById('zoomFit'),f.fit);
});
test('truncated native plot structure fails closed without pretending acceptance',()=>{
 for(const missing of ['fit','viewport','controls','series']){
  const f=fixture({missing});
  assert.equal(f.api.audit().installed,false);
  assert.equal(f.api.audit().focused,false);
  assert.equal(f.api.audit().humanVisualApproved,false);
 }
});
test('compact focus CSS reclaims height, honors existing list preference and keeps accessible control',()=>{
 const f=fixture(),css=f.document.getElementById('g11FocusStyle').textContent;
 for(const item of ['g11ChartFocus #workspace{grid-template-rows:minmax(0,1fr)!important',
  'g11ChartFocus #timeSeriesControls{max-height:225px!important',
  'g11ChartFocus #workspace #seriesPanel{display:none!important',
  '#g11FocusToggle:focus-visible', 'g11ChartFocus #workspace .plotcard .chartviewport'])
  assert(css.includes(item),'missing compact accessibility/layout '+item);
 assert.equal(f.document.getElementById('g11FocusToggle').getAttribute('aria-controls'),'seriesPanel');
});
test('focus layout never compresses the four original source selectors into one visible row',()=>{
 const f=fixture(),css=f.document.getElementById('g11FocusStyle').textContent;
 const match=css.match(/g11ChartFocus #timeSeriesControls\{max-height:(\d+)px!important/);
 assert(match,'missing source selectors control');
 assert(Number(match[1])>=210,'Both original Variable/Probe and Variable2/Cases rows must remain on-screen');
 assert.strictEqual(f.document.getElementById('timeSeriesControls'),f.controls);
 assert.equal(f.api.audit().sourceZoomUnmodified,true);
});
test('repeated UI sync does not create a second toolbar action or synthetic chart',()=>{
 const f=fixture(),btn=f.document.getElementById('g11FocusToggle');
 for(let i=0;i<20;i++)f.api.sync();
 assert.strictEqual(f.document.getElementById('g11FocusToggle'),btn);
 assert.equal(f.actions.children.filter(x=>x.id==='g11FocusToggle').length,1);
 assert.equal(f.fitClicks(),0);
});
