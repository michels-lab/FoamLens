'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../src/FoamLensDesktop/frontend/v25-granada-field-source-dock.js'),'utf8');
const CORE_IDS=['fvOrbitMode','fvPanMode','fvZoomMode','fvFitCamera','fvResetCamera',
 'fvProjectionOrtho','fvProjectionPerspective','fvShowDimensions','fvMeasureTool','fvMeasureClear'];
const VIEWS=['front','back','left','right','top','bottom','iso'];
function fixture({omit=null}={}){
 const ids=new Map(),events=new Map();
 class Node{
  constructor(tag='div'){this.tagName=tag.toUpperCase();this._id='';this.className='';this.children=[];this.parentElement=null;
   this.attributes={};this.dataset={};this.disabled=false;this.hidden=false;this.textContent='';this.listeners={};this.focusCount=0;
   this.classList={add:(v)=>{this.className=[...new Set([...this.className.split(/\s+/).filter(Boolean),v])].join(' ');},
    contains:v=>this.className.split(/\s+/).includes(v)};}
  set id(v){if(this._id)ids.delete(this._id);this._id=String(v);if(this._id)ids.set(this._id,this)}
  get id(){return this._id}
  setAttribute(k,v){this.attributes[k]=String(v)}
  getAttribute(k){return this.attributes[k]}
  appendChild(n){if(n.parentElement)n.parentElement.children=n.parentElement.children.filter(x=>x!==n);this.children.push(n);n.parentElement=this;return n}
  append(n){return this.appendChild(n)}
  remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(x=>x!==this);this.parentElement=null}
  addEventListener(ev,fn){(this.listeners[ev]??=[]).push(fn)}
  dispatch(ev,event){for(const fn of this.listeners[ev]||[])fn(event)}
  focus(){this.focusCount++;document.activeElement=this}
  matches(selector){
    if(selector.startsWith('.'))return this.classList.contains(selector.slice(1));
    const m=/^\[data-fv-view(?:="([^"]+)")?\]$/.exec(selector);
    if(m)return m[1]?this.dataset.fvView===m[1]:!!this.dataset.fvView;
    return false;
  }
  querySelectorAll(sel){const result=[],walk=(p)=>{for(const c of p.children){if(c.matches(sel))result.push(c);walk(c)}};walk(this);return result}
  querySelector(sel){return this.querySelectorAll(sel)[0]||null}
  contains(node){for(let n=node;n;n=n.parentElement)if(n===this)return true;return false}
 }
 const document={
  readyState:'complete',activeElement:null,
  createElement:tag=>new Node(tag),getElementById:id=>ids.get(id)||null,
  addEventListener:(type,fn)=>(events.get(type)||events.set(type,[]).get(type)).push(fn)
 };
 const root=new Node('html'),head=new Node('head'),panel=new Node('div'),toolbar=new Node('div');
 document.documentElement=root;document.head=head;document.body=new Node('body');root.append(head);root.append(document.body);
 panel.id='fieldViewPanel';toolbar.classList.add('fvViewTools');document.body.append(panel);panel.append(toolbar);
 const nav=new Node('div'),measure=new Node('div'),details=new Node('details'),presets=new Node('div');
 nav.classList.add('fvToolRow');measure.classList.add('fvToolRow');measure.classList.add('fvPhysicalToolbar');
 details.classList.add('fvNavPresets');presets.classList.add('fvToolRow');presets.classList.add('fvPresetRow');
 toolbar.append(nav);toolbar.append(measure);toolbar.append(details);details.append(presets);
 const sourceButtons=new Map();
 for(const [i,id]of CORE_IDS.entries()){
  if(id===omit)continue;
  const el=new Node('button');el.id=id;
  (i<5?nav:measure).append(el);sourceButtons.set(id,el)
 }
 const presetButtons=new Map();
 for(const id of VIEWS){const el=new Node('button');el.dataset.fvView=id;presets.append(el);presetButtons.set(id,el)}
 const canvas=new Node('canvas');canvas.id='fvCanvas';panel.append(canvas);
 const language=new Node('select');language.id='language';language.value='en';document.body.append(language);
 const ctx={document,window:{},MutationObserver:undefined,requestAnimationFrame:()=>0,console};
 vm.runInNewContext(source,ctx,{timeout:3000});
 return{document,ctx,ids,events,panel,toolbar,nav,measure,presets,details,canvas,sourceButtons,presetButtons};
}
const test=require('node:test');
test('mounts actual original navigation, measurement and all seven camera directions',()=>{
 const f=fixture();const api=f.ctx.window.FoamLensGranadaFieldG2;assert(api?.installed());
 assert.equal(f.toolbar.querySelectorAll('.fg2Group').length,3);
 assert.equal(f.details.parentElement,null);
 for(const btn of f.sourceButtons.values())assert(f.toolbar.contains(btn));
 for(const btn of f.presetButtons.values())assert(f.toolbar.contains(btn));
 assert.equal(f.panel.querySelector('.fg2Dock'),f.toolbar);
 assert.equal(f.document.getElementById('fvCanvas'),f.canvas);
 assert.equal(api.audit().originalEventsPreserved,true);
});
test('camera presets retain original object identity and attached action listener',()=>{
 const f=fixture();let count=0;
 const btn=f.presetButtons.get('front');btn.addEventListener('click',()=>count++);btn.dispatch('click',{});
 assert.equal(count,1);assert.strictEqual(f.ctx.window.FoamLensGranadaFieldG2.audit().buttons[0].originalRetained,true);
});
test('arrow navigation never fires a camera action and respects disabled buttons',()=>{
 const f=fixture();let actions=0;
 for(const btn of f.presetButtons.values())btn.addEventListener('click',()=>actions++);
 f.presetButtons.get('back').disabled=true;f.presetButtons.get('front').focus();
 let prevented=0;
 f.presets.dispatch('keydown',{key:'ArrowRight',preventDefault:()=>prevented++});
 assert.equal(f.document.activeElement,f.presetButtons.get('left'));assert.equal(prevented,1);assert.equal(actions,0);
 f.presets.dispatch('keydown',{key:'End',preventDefault:()=>prevented++});
 assert.equal(f.document.activeElement,f.presetButtons.get('iso'));
});
test('bilingual headings update without losing controls',()=>{
 const f=fixture();const title=f.document.getElementById('fg2Heading-camera');
 assert.equal(title.textContent,'Camera views · XYZ');
 f.document.getElementById('language').value='es';
 for(const cb of f.events.get('foamlens-language-change')||[])cb();
 assert.equal(title.textContent,'Vistas de cámara · XYZ');
 assert.equal(f.ctx.window.FoamLensGranadaFieldG2.audit().sourceIds.length,10);
});
test('missing original control does not cause destructive partial migration',()=>{
 const f=fixture({omit:'fvPanMode'});
 assert.equal(f.toolbar.querySelector('.fg2Dock'),null);
 assert.equal(f.toolbar.children.length,3);
 assert.equal(f.details.parentElement,f.toolbar);
 assert.equal(f.ctx.window.FoamLensGranadaFieldG2,undefined);
});
test('audit exports only anonymous DOM IDs and provenance, no research text',()=>{
 const f=fixture();const report=JSON.stringify(f.ctx.window.FoamLensGranadaFieldG2.audit());
 assert(report.includes('originalEventsPreserved'));
 assert(!report.includes('C:/')&&!report.includes('caseName')&&!report.includes('temperature'));
});
test('styles remain scoped to Field workspace and include compact breakpoints',()=>{
 assert(source.includes('body.appMode-field #fieldViewPanel .fg2Dock'));
 assert(source.includes('@media(max-width:1240px)'));
 assert(source.includes('@media(max-width:760px)'));
 assert(!source.includes('window.open('));
});
test('native source document defines the exact original camera and selector IDs',()=>{
 const s=fs.readFileSync(path.join(__dirname,'../src/FoamLensDesktop/frontend/v14-field-view.js'),'utf8');
 for(const id of CORE_IDS)assert(s.includes('id="'+id+'"'),'missing source control: '+id);
 for(const view of VIEWS)assert(s.includes('data-fv-view="'+view+'"'),'missing original camera: '+view);
 assert(s.includes('id="fvCanvas"'));
});
