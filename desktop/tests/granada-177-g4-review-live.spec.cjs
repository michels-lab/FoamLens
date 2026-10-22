'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const root=path.join(__dirname,'..','src','FoamLensDesktop','frontend');
const src=fs.readFileSync(path.join(root,'v24-granada-g4-review-live.js'),'utf8');
const original=fs.readFileSync(path.join(root,'index.html'),'utf8');
const native=fs.readFileSync(path.join(__dirname,'..','src','FoamLensDesktop','Program.cs'),'utf8');
new Function(src);
const i=src.indexOf('/* GRANADA_G4_CORE_START */'),j=src.indexOf('/* GRANADA_G4_CORE_END */');
assert(i>=0&&j>i);
const core=new Function(src.slice(i,j)+';return {main:g4ReviewMain,secondary:g4ReviewSecondary,live:g4LiveMain,rect:g4Rect,inside:g4Contained}')();
assert.deepEqual(core.main,['reviewTabAuditor','reviewTabFindings']);
assert.equal(core.secondary.length,5);
assert.deepEqual(core.live,['liveStatus','liveChooseFolder','liveRefreshNow','liveStop']);
for(const id of [...core.main,...core.secondary,...core.live])
 assert(original.includes('id="'+id+'"'),'Must reuse a real, existing source DOM control '+id);
const mkrect=(left,top,width,height)=>({left,top,right:left+width,bottom:top+height,width,height});
assert(core.inside(mkrect(0,0,700,100),mkrect(12,20,120,35)));
assert(!core.inside(mkrect(0,0,300,100),mkrect(280,20,100,35)));
assert.equal(core.rect({left:NaN,right:100,top:1,bottom:4,width:10,height:3}),null);

const ids=new Map(),allListeners={};
class N{
 constructor(tag='div',id=''){
  this.tagName=tag.toUpperCase();this._id='';
  Object.defineProperty(this,'id',{get:()=>this._id,set:v=>{
   if(this._id)ids.delete(this._id);this._id=String(v||'');if(this._id)ids.set(this._id,this)
  }});
  this.id=id;this.className='';this.dataset={};this.children=[];this.parentElement=null;
  this.attributes={};this.hidden=false;this.open=false;this.textContent='';this.tabIndex=-1;this.handlers={};
  this.classes=new Set();
  this.classList={add:name=>this.classes.add(name),remove:name=>this.classes.delete(name),
    contains:name=>this.classes.has(name)||this.className.split(/\s+/).includes(name),
    toggle:(name,on)=>{const enabled=on===undefined?!this.classes.has(name):!!on;
      enabled?this.classes.add(name):this.classes.delete(name);return enabled}};
 }
 appendChild(node){if(node.parentElement)node.parentElement.children=node.parentElement.children.filter(c=>c!==node);
  node.parentElement=this;this.children.push(node);return node}
 insertBefore(node,before){if(node.parentElement)node.parentElement.children=node.parentElement.children.filter(c=>c!==node);
  node.parentElement=this;const i=this.children.indexOf(before);
  this.children.splice(i<0?this.children.length:i,0,node);return node}
 setAttribute(n,v){this.attributes[n]=String(v)}
 getAttribute(n){return this.attributes[n]}
 removeAttribute(n){delete this.attributes[n]}
 addEventListener(event,fn){(this.handlers[event]??=[]).push(fn)}
 fire(event,target=this){for(const fn of this.handlers[event]||[])fn({target,key:'',preventDefault:()=>{}})}
 getBoundingClientRect(){return mkrect(0,0,950,80)}
 focus(){this.focused=true}
 matches(selector){
  if(selector==='summary')return this.tagName==='SUMMARY';
  if(selector==='.reviewTab')return this.classList.contains('reviewTab');
  if(selector==='.surfaceCard')return this.classList.contains('surfaceCard');
  if(selector==='.surfaceCardHead')return this.classList.contains('surfaceCardHead');
  if(selector==='.reviewTabs')return this.classList.contains('reviewTabs');
  if(selector==='.surfaceGrid')return this.classList.contains('surfaceGrid');
  if(selector==='.liveHero')return this.classList.contains('liveHero');
  if(selector==='.liveRunHead')return this.classList.contains('liveRunHead');
  if(selector==='.liveProgress')return this.classList.contains('liveProgress');
  if(selector==='.g4ReviewMore')return this.classList.contains('g4ReviewMore');
  if(selector==='.reviewTab.active')return this.classList.contains('reviewTab')&&this.classList.contains('active');
  return false
 }
 querySelectorAll(selector){
  const found=[],search=n=>{for(const child of n.children){if(child.matches(selector))found.push(child);search(child)}};
  search(this);return found
 }
 querySelector(sel){return this.querySelectorAll(sel)[0]||null}
 closest(sel){for(let p=this;p;p=p.parentElement)if(p.matches(sel))return p;return null}
 contains(el){for(let p=el;p;p=p.parentElement)if(p===this)return true;return false}
}
const document={createElement:tag=>new N(tag),getElementById:id=>ids.get(id)||null,
 addEventListener:(ev,fn)=>{(allListeners[ev]??=[]).push(fn)},
 querySelectorAll:sel=>[...ids.values()].filter(x=>x.matches(sel))};
document.body=new N('body');document.head=new N('head');
const review=new N('section','reviewSurface'),card=new N('div');card.classList.add('surfaceCard');
const head=new N('div');head.classList.add('surfaceCardHead');head.appendChild(new N('strong','reviewTitle'));
const nav=new N('div');nav.classList.add('reviewTabs');
review.appendChild(card);card.appendChild(head);card.appendChild(nav);
const orig=new Map();let clickCount=0;
for(const id of core.main.concat(core.secondary)){
 const btn=new N('button',id);btn.classList.add('reviewTab');btn.dataset.review=id.slice(9).toLowerCase();
 btn.textContent=id;if(id==='reviewTabAuditor')btn.classList.add('active');
 btn.addEventListener('click',()=>{clickCount++;for(const b of orig.values())
  b.classList.toggle('active',b===btn)});
 nav.appendChild(btn);orig.set(id,btn)
}
for(const name of ['auditor','findings','inspector','configuration','compare','outputs','relationships']){
 const pane=new N('div');pane.classList.add('reviewPane');pane.dataset.reviewPane=name;card.appendChild(pane)
}
document.body.appendChild(review);
const live=new N('section','liveSurface'),grid=new N('div');grid.classList.add('surfaceGrid');
const livecard=new N('div');livecard.classList.add('surfaceCard');
const liveHead=new N('div');liveHead.classList.add('surfaceCardHead');
const body=new N('div'),hero=new N('div');hero.classList.add('liveHero');
const runHead=new N('div');runHead.classList.add('liveRunHead');
const runState=new N('span','liveRunState');runHead.appendChild(runState);
const progress=new N('div');progress.classList.add('liveProgress');
const bar=new N('div','liveProgressBar');progress.appendChild(bar);
live.appendChild(grid);grid.appendChild(livecard);
livecard.appendChild(liveHead);livecard.appendChild(body);
body.appendChild(hero);body.appendChild(runHead);body.appendChild(progress);
const liveOriginal=new Map();
for(const id of core.live){
 const el=new N(id==='liveStatus'?'div':'button',id);
 el.addEventListener('click',()=>clickCount++);
 hero.appendChild(el);liveOriginal.set(id,el)
}
document.body.appendChild(live);
const window={innerWidth:1280,innerHeight:900,devicePixelRatio:1.25};
const ctx={document,window,console,Date,Number,Array,Object,String,Math,JSON,
 requestAnimationFrame:()=>1,MutationObserver:undefined,activeAppMode:'review'};
vm.runInNewContext(src,ctx,{timeout:3000});
const api=window.FoamLensGranadaG4;assert(api);
const reviewDock=ids.get('g4ReviewDock'),liveDock=ids.get('g4LiveDock'),more=ids.get('g4ReviewMore');
assert(reviewDock&&liveDock&&more);
assert.equal(review.children[0],reviewDock,'Original Review header must be sticky outside the scrolling card');
assert.equal(reviewDock.children[0],head);
assert.equal(reviewDock.children[1],nav);
assert.equal(card.children.includes(head),false);
for(const id of core.main)assert.equal(orig.get(id).parentElement,nav,'Primary Review controls visible on original nav');
for(const id of core.secondary)assert(more.contains(orig.get(id)),'Advanced Review tab reparented into secondary navigation');
assert.equal(live.children[0],liveDock);
assert.equal(liveDock.querySelector('.liveHero'),hero,'Original live buttons, status and listeners preserved');
assert.equal(liveDock.children[0],liveHead,'Original Watch Run title/capability always accessible');
assert.equal(liveDock.children[1],hero,'Folder and original action buttons always accessible');
assert.equal(liveDock.children[2],runHead,'Real solver state, case context and last update remain visible');
assert.equal(liveDock.children[3],progress,'Original physical-time progress stays in live dock');
assert.equal(ids.get('liveRunState'),runState);
assert.equal(ids.get('liveProgressBar'),bar);
assert.equal(livecard.children.includes(liveHead),false,'Do not clone original live state');
assert.equal(body.children.includes(runHead),false,'Do not leave a duplicated solver status below');
for(const id of core.live)assert(hero.contains(liveOriginal.get(id)));
orig.get('reviewTabInspector').fire('click');api.sync();
assert.equal(clickCount,1);
assert.equal(orig.get('reviewTabInspector').getAttribute('aria-pressed'),'true');
assert(more.classList.contains('g4SelectedMore'));
assert(more.querySelector('summary').textContent.includes('reviewTabInspector'));
const audit=api.audit();
assert.equal(audit.contexts[0].active,true);
assert.equal(audit.contexts[1].active,false);
assert.equal(audit.contexts[1].controls[0].status,'inactive-not-inspected');
assert.equal(audit.contexts[0].controls.find(x=>x.id==='reviewTabInspector').status,'available-in-more');
assert(!JSON.stringify(audit).includes('privateCase'));
ctx.activeAppMode='live';
const liveAudit=api.audit();
assert.equal(liveAudit.contexts[1].active,true);
assert.equal(liveAudit.contexts[1].controls.find(x=>x.id==='liveChooseFolder').status,'measured-in-dock');
liveOriginal.get('liveChooseFolder').fire('click');assert.equal(clickCount,2);
assert.equal(document.head.children.some(x=>x.id==='g4Styles'),true,'Scoped CSS should install');
assert.equal(original.includes("liveWatchTimer=setInterval(inspectLiveDirectory,5000)"),true);
assert.equal(original.includes("document.querySelectorAll('.reviewTab').forEach"),true);
assert(native.includes('Directory.GetFiles(AppRoot, "v*-*.js")'),'Native WebView2 loads versioned extension');
assert(!src.includes('fetch(')&&!src.includes('cases.push(')&&!src.includes('showDirectoryPicker('));
console.log('Granada #177 G4 PASS: original Review/Live button ownership, sticky source docks, secondary review navigation, active source state and layout evidence; no original handlers replaced.');
