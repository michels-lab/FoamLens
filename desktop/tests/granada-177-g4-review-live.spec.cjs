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
  Object.defineProperty(this,'options',{get:()=>this.children.filter(x=>x.tagName==='OPTION')});
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
 hasAttribute(n){return Object.prototype.hasOwnProperty.call(this.attributes,n)}
 removeAttribute(n){delete this.attributes[n]}
 addEventListener(event,fn){(this.handlers[event]??=[]).push(fn)}
 fire(event,target=this,details={}){for(const fn of this.handlers[event]||[])fn({target,key:'',preventDefault:()=>{},...details})}
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
  if(selector==='.findingRow')return this.classList.contains('findingRow');
  if(selector==='.findingSeverity')return this.classList.contains('findingSeverity');
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
 const pane=new N('div');pane.classList.add('reviewPane');pane.dataset.reviewPane=name;card.appendChild(pane);
 if(name==='findings')pane.appendChild(new N('div','allFindings'))
}
document.body.appendChild(review);
const language=new N('select','language');language.value='en';document.body.appendChild(language);
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
const observers=[];
class RecorderObserver{
 constructor(callback){this.callback=callback;this.watches=[];observers.push(this)}
 observe(target,options){this.watches.push({target,options})}
 disconnect(){}
}
const ctx={document,window,console,Date,Number,Array,Object,String,Math,JSON,
 requestAnimationFrame:()=>1,MutationObserver:RecorderObserver,activeAppMode:'review'};
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
// Review search/filter affects ONLY original findings rows; no scientific model mutation.
const findings=ids.get('allFindings'),filterBar=ids.get('g4FindingFilters');
const search=ids.get('g4FindingSearch'),severity=ids.get('g4FindingSeverity'),
 clear=ids.get('g4FindingClear'),count=ids.get('g4FindingCount'),empty=ids.get('g4FindingEmpty');
assert(findings&&filterBar&&search&&severity&&clear&&count&&empty);
assert.equal(findings.parentElement.children[0],filterBar,'filter sits above the native findings');
assert.equal(findings.parentElement.children[1],findings,'native rows remain in original container');
assert.equal(severity.options.length,5,'must allow all four source severity types');
const findingModels=[
 ['FAIL','B3 · T field · Time step did not converge'],
 ['WARNING','C3 · p_rgh residual increased'],
 ['NOTICE','B3 · metal region missing metadata'],
 ['INFO','C3 · mold boundary identified']
];
const originalRows=[];
for(const [level,content] of findingModels){
 const row=new N('div');row.classList.add('findingRow');row.textContent=content;
 const badge=new N('span');badge.classList.add('findingSeverity');badge.classList.add(level);
 row.appendChild(badge);findings.appendChild(row);originalRows.push(row)
}
assert.equal(api.filterFindings(),true);
assert.equal(count.textContent,'4 of 4 findings shown');
assert(originalRows.every(r=>!r.hidden));
search.value='P_RGH';search.fire('input');
assert.equal(count.textContent,'1 of 4 findings shown','case-insensitive search finds actual source text');
assert.equal(originalRows[1].hidden,false);
assert(originalRows[0].hidden&&originalRows[2].hidden&&originalRows[3].hidden);
severity.value='FAIL';severity.fire('change');
assert.equal(count.textContent,'0 of 4 findings shown','combined filters cannot invent findings');
assert.equal(empty.hidden,false,'no matching rows show the honest local empty state');
const noModelMutation=originalRows.slice();clear.fire('click');
assert.equal(search.value,'');assert.equal(severity.value,'');assert.equal(clear.disabled,true);
assert.equal(count.textContent,'4 of 4 findings shown');
assert(originalRows.every((row,i)=>row===noModelMutation[i]&&!row.hidden));
assert.equal(search.focused,true,'clear returns keyboard focus to original filter input');
severity.value='WARNING';severity.fire('change');
assert.equal(count.textContent,'1 of 4 findings shown');
// Regression: changing severity inside an existing Review row must trigger a re-filter.
const watch=observers.flatMap(observer=>observer.watches.map(w=>({...w,observer})))
  .find(w=>w.target===findings);
assert(watch,'Original findings list must be watched');
assert.equal(watch.options.attributeFilter.length,1);
assert.equal(watch.options.attributeFilter[0],'class');
assert.equal(watch.options.subtree,true);
assert.equal(watch.options.characterData,true);
function notifyFinding(record){
 const opts=watch.options;
 if(record.target!==findings&&(!opts.subtree||!findings.contains(record.target)))return false;
 if(record.type==='attributes'&&(!opts.attributes||
   (opts.attributeFilter&&!opts.attributeFilter.includes(record.attributeName))))return false;
 if(record.type==='childList'&&!opts.childList)return false;
 if(record.type==='characterData'&&!opts.characterData)return false;
 watch.observer.callback([record]);return true
}
const warningBadge=originalRows[1].querySelector('.findingSeverity');
warningBadge.classList.remove('WARNING');warningBadge.classList.add('FAIL');
assert.equal(notifyFinding({type:'attributes',target:warningBadge,attributeName:'class'}),true);
assert.equal(originalRows[1].hidden,true,'In-place severity change must hide stale match');
assert.equal(count.textContent,'0 of 4 findings shown');
const failBadge=originalRows[0].querySelector('.findingSeverity');
failBadge.classList.remove('FAIL');failBadge.classList.add('WARNING');
assert.equal(notifyFinding({type:'attributes',target:failBadge,attributeName:'class'}),true);
assert.equal(originalRows[0].hidden,false);
assert.equal(count.textContent,'1 of 4 findings shown');
assert.equal(notifyFinding({type:'attributes',target:originalRows[0],attributeName:'hidden'}),false,
 'Filter-driven hidden updates must never trigger an observer loop');
language.value='es';for(const listener of allListeners['foamlens-language-change']||[])listener();
assert.equal(count.textContent,'1 de 4 hallazgos mostrados');
assert.equal(severity.options[2].textContent,'Advertencias');
assert.match(search.placeholder,/Buscar/);
// A source refresh replaces the original list rows. A new filter pass must
// operate on the fresh DOM, not retain stale references or modify source data.
findings.children.length=0;
const updated=new N('div');updated.classList.add('findingRow');
updated.textContent='D4 · solver failure';
const updatedBadge=new N('span');updatedBadge.classList.add('findingSeverity');
updatedBadge.classList.add('FAIL');updated.appendChild(updatedBadge);findings.appendChild(updated);
assert.equal(api.filterFindings(),true);
assert.equal(updated.hidden,true,'existing WARNING filter applies to newly rendered findings');
severity.value='';severity.fire('change');
assert.equal(updated.hidden,false);
assert.equal(count.textContent,'1 de 1 hallazgos mostrados');
// Keyboard navigation targets the original filtered row and never fabricates a result.
search.value='solver';search.fire('input');search.fire('keydown',search,{key:'Enter'});
assert.equal(updated.focused,true,'Enter must focus original visible finding');
assert.equal(updated.getAttribute('tabindex'),'-1');
updated.focused=false;search.value='nonexistent';search.fire('input');
search.fire('keydown',search,{key:'ArrowDown'});
assert.equal(updated.focused,false,'No matches must leave hidden findings unfocused');
search.value='solver';search.fire('input');
updated.textContent='D4 · initial condition';
assert.equal(notifyFinding({type:'childList',target:updated}),true,'Nested content replacement must trigger re-filter');
assert.equal(updated.hidden,true);
updated.textContent='D4 · solver recovered';
assert.equal(notifyFinding({type:'childList',target:updated}),true);
assert.equal(updated.hidden,false);
search.fire('keydown',search,{key:'ArrowDown'});
assert.equal(updated.focused,true,'Down must focus the original visible finding');
search.value='';search.fire('input');
assert(!src.includes('currentFindings='),'G4 search must not rewrite the original scientific findings model');

assert.equal(document.head.children.some(x=>x.id==='g4Styles'),true,'Scoped CSS should install');
assert.equal(original.includes("liveWatchTimer=setInterval(inspectLiveDirectory,5000)"),true);
assert.equal(original.includes("document.querySelectorAll('.reviewTab').forEach"),true);
// Granada G45: G35 prohibits executing user-profile AppRoot wildcard JS.
const trusted=fs.readFileSync(path.join(__dirname,'..','src','FoamLensDesktop',
 'TrustedEmbeddedFrontendExtensions.cs'),'utf8');
const winBuild=fs.readFileSync(path.join(__dirname,'..','..','.github','workflows',
 'build-foamlens-desktop.yml'),'utf8');
assert(native.includes('TrustedEmbeddedFrontendExtensions.ReadFromRunningAssembly()'),
 'Production app must use immutable embedded package source');
assert(trusted.includes('FoamLensDesktop.AppBundle.zip')&&
 trusted.includes('Regex ModuleName')&&trusted.includes('MaxModuleBytes'),
 'Production trusted versioned module reader must be bounded and validated');
assert(winBuild.includes('Copy-Item desktop/src/FoamLensDesktop/frontend/v*-*.js bundle_tmp/'),
 'Actual CI embeds the new Review/Live G4 module in the executable');
assert(!native.includes('Directory.GetFiles(AppRoot, "v*-*.js")'),
 'Do not reenable mutable application-profile JavaScript execution');
assert(!src.includes('fetch(')&&!src.includes('cases.push(')&&!src.includes('showDirectoryPicker('));
console.log('Granada #177 G4 PASS: original Review/Live button ownership, sticky source docks, secondary review navigation, active source state and layout evidence; no original handlers replaced.');
