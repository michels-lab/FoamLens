'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),
  path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../desktop/src/FoamLensDesktop/frontend');
const source=fs.readFileSync(path.join(root,'v29-granada-plot-toolbar.js'),'utf8');
function fixture({width=640,active=true,mode='data',g8=true,missing=null}={}){
  const ids=new Map(),events={},observers=[];
  let document;
  class Node{
    constructor(tag='div'){
      this.tagName=tag.toUpperCase();this.parentNode=null;this.children=[];
      this._id='';this._classes=new Set();this.attributes={};this.style={};
      this.textContent='';this.focused=false;
      this.classList={
        add:x=>{this._classes.add(x)},
        remove:x=>{this._classes.delete(x)},
        contains:x=>this._classes.has(x),
        toggle:(x,v)=>v?this._classes.add(x):this._classes.delete(x)};
    }
    set id(x){if(this._id)ids.delete(this._id);this._id=x;if(x)ids.set(x,this)}
    get id(){return this._id}
    set className(x){this._classes=new Set(x.split(/\s+/).filter(Boolean))}
    get className(){return [...this._classes].join(' ')}
    appendChild(n){n.remove();n.parentNode=this;this.children.push(n);return n}
    insertBefore(n,other){n.remove();const i=this.children.indexOf(other);
      n.parentNode=this;this.children.splice(i<0?this.children.length:i,0,n);return n}
    remove(){if(!this.parentNode)return;const a=this.parentNode.children,i=a.indexOf(this);if(i>=0)a.splice(i,1);this.parentNode=null}
    setAttribute(k,v){this.attributes[k]=v}
    querySelector(q){
      if(q==='.plotcard'||q==='.chartwrap'){
        const list=[];const walk=e=>{for(const c of e.children){if(c.classList.contains(q.slice(1)))list.push(c);walk(c)}};walk(this);
        return list[0]||null;
      }
      if(q.startsWith('#'))return walkId(this,q.slice(1));
      return null;
    }
    contains(n){for(let x=n;x;x=x.parentNode)if(x===this)return true;return false}
    closest(q){let e=this;while(e){if(e.classList.contains(q.slice(1)))return e;e=e.parentNode}return null}
    focus(){document.activeElement=this}
  }
  function walkId(n,id){if(n.id===id)return n;for(const c of n.children){const x=walkId(c,id);if(x)return x}return null}
  document={readyState:'complete',getElementById:id=>walkId(document.documentElement,id),
    createElement:tag=>new Node(tag),createComment:()=>new Node('comment'),
    activeElement:null,addEventListener:(e,f)=>(events['doc-'+e]??=[]).push(f)};
  document.documentElement=new Node('html');document.head=new Node('head');document.body=new Node('body');
  document.documentElement.appendChild(document.head);document.documentElement.appendChild(document.body);
  if(mode)document.body.classList.add('appMode-'+mode);
  const app=new Node('div');app.id='appShell';if(g8)app.classList.add('g8Compact');document.body.appendChild(app);
  const workspace=new Node('section');workspace.id='workspace';app.appendChild(workspace);
  const plot=new Node('div');plot.className='plotcard';workspace.appendChild(plot);
  const head=new Node('div');head.className='head';plot.appendChild(head);
  const viewport=new Node('div');viewport.id='chartViewport';plot.appendChild(viewport);
  const wrap=new Node('div');wrap.className='chartwrap';viewport.appendChild(wrap);
  const canvas=new Node('canvas');canvas.id='canvas';if(missing!=='canvas')wrap.appendChild(canvas);
  const tools=new Node('div');tools.id='previewTools';if(missing!=='tools')wrap.appendChild(tools);
  const badge=new Node('div');badge.id='previewBadge';tools.appendChild(badge);
  const pinbar=new Node('div');pinbar.className='pinbar';tools.appendChild(pinbar);
  const button=new Node('button');button.id='clearPins';pinbar.appendChild(button);
  const tab=new Node('button');tab.id='timeSeriesTab';if(active)tab.classList.add('active');document.body.appendChild(tab);
  const window={innerWidth:width,addEventListener:(x,f)=>(events['win-'+x]??=[]).push(f),
    FoamLensGranadaG8:{audit:()=>({installed:g8,compact:app.classList.contains('g8Compact')})}};
  const Observer=function(cb){this.callback=cb;this.observe=(n,o)=>observers.push({n,o,cb});this.disconnect=()=>{}};
  vm.runInNewContext(source,{document,window,MutationObserver:Observer},{timeout:2000});
  return{document,window,app,plot,viewport,wrap,canvas,tools,badge,button,tab,events,observers,
    api:window.FoamLensGranadaG10,
    resize(w){window.innerWidth=w;this.api.sync()},
    setMode(mode){for(const n of ['data','analysis','field'])document.body.classList.remove('appMode-'+n);
      document.body.classList.add('appMode-'+mode);this.api.sync()},
    setTab(active){tab.classList.toggle('active',active);this.api.sync()},
    setG8(on){app.classList.toggle('g8Compact',on);this.api.sync()}
  };
}
test('original native HTML actually exposes the independent preview control identities',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 for(const k of ['previewTools','previewBadge','clearPins','chartViewport','canvas','timeSeriesTab'])
   assert(html.includes('id="'+k+'"'),'native original missing '+k);
 assert(html.includes('function updatePreviewBadge()'));
 assert(!source.includes('localStorage')&&!source.includes('fetch('));
 assert(!/\b(?:draw|parseFile|buildFieldTimeSeries)\s*\(/.test(source),'scientific or plotting operations must not change');
});
test('640px G8 Time Series moves original controls to a distinct row, outside scientific canvas',()=>{
 const f=fixture();
 assert(f.api.audit().installed&&f.api.audit().docked);
 assert.equal(f.tools.parentNode.id,'g10PreviewRail');
 assert.strictEqual(f.tools.parentNode.parentNode,f.plot);
 assert.strictEqual(f.plot.children.at(-1),f.viewport);
 assert.strictEqual(f.button.parentNode.parentNode,f.tools);
 assert.strictEqual(f.canvas.parentNode,f.wrap);
 assert.equal(f.api.audit().previewToolsOutsideChart,true);
 assert.equal(f.document.getElementById('clearPins'),f.button);
});
test('wide screens restore the identical tools, badge, click handler and chart positions',()=>{
 const f=fixture();const before=f.tools;const pin=f.button,badge=f.badge;
 f.resize(1280);
 assert.equal(f.api.audit().docked,false);
 assert.strictEqual(f.tools.parentNode,f.wrap);
 assert.strictEqual(f.document.getElementById('previewBadge'),badge);
 assert.strictEqual(f.document.getElementById('clearPins'),pin);
 assert.strictEqual(f.tools,before);
 assert.equal(f.document.getElementById('g10PreviewRail'),null);
 f.resize(640);assert.strictEqual(f.tools.parentNode.id,'g10PreviewRail');
});
test('other app modes and Data tabs always restore original DOM hierarchy',()=>{
 const f=fixture();f.setTab(false);assert.equal(f.api.audit().docked,false);
 f.setTab(true);assert.equal(f.api.audit().docked,true);
 f.setMode('analysis');assert.equal(f.api.audit().docked,false);
 f.setMode('data');assert.equal(f.api.audit().docked,true);
 f.setG8(false);assert.equal(f.api.audit().docked,false);
});
test('focus stays with original pin-clear action during docking and restoration',()=>{
 const f=fixture({width:1280});f.button.focus();
 f.resize(640);assert.strictEqual(f.document.activeElement,f.button);
 f.resize(1280);assert.strictEqual(f.document.activeElement,f.button);
});
test('if compact G8 is not present, no extra toolbar or mutation occurs',()=>{
 const f=fixture({g8:false});assert.equal(f.api.audit().installed,true);
 assert.equal(f.api.audit().docked,false);
 assert.strictEqual(f.tools.parentNode,f.wrap);
 assert.equal(f.document.getElementById('g10PreviewRail'),null);
});
test('absent original plot elements fail closed without pretending visual acceptance',()=>{
 for(const missing of ['canvas','tools']){
  const f=fixture({missing});
  assert.equal(f.api.audit().installed,false);
  assert.equal(f.api.audit().docked,false);
  assert.equal(f.api.audit().humanVisualApproved,false);
 }
});
test('compact CSS physically reserves distinct grid row and never hides buttons',()=>{
 const f=fixture(),css=f.document.getElementById('g10PreviewStyle').textContent;
 assert(css.includes('grid-template-rows:auto auto auto minmax(0,1fr)'));
 assert(css.includes('#g10PreviewRail #previewTools{position:static!important'));
 assert(css.includes('.chartwrap.previewExact{padding:12px!important'));
 assert(css.includes('#clearPins:focus-visible'));
 assert(!css.includes('display:none'));
});
test('repeated sync does not clone, lose state, or insert new duplicate rails',()=>{
 const f=fixture(),first=f.tools.parentNode;
 for(let i=0;i<10;i++)f.api.sync();
 assert.strictEqual(f.tools.parentNode,first);
 assert.equal(f.plot.children.filter(x=>x.id==='g10PreviewRail').length,1);
 f.resize(1280);for(let i=0;i<10;i++)f.api.sync();
 assert.equal(f.plot.children.filter(x=>x.id==='g10PreviewRail').length,0);
 assert.strictEqual(f.tools.parentNode,f.wrap);
});
