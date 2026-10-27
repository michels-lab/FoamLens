'use strict';
// Granada #176 G3: real DOM-move integration + cancellation/read-only boundaries.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const base=path.join(__dirname,'..','src','FoamLensDesktop','frontend');
const candidate=fs.readFileSync(path.join(base,'v24-granada-timeseries-t2.js'),'utf8');
const core=fs.readFileSync(path.join(base,'v14-zz-field-workspace.js'),'utf8');
const index=fs.readFileSync(path.join(base,'index.html'),'utf8');
const host=fs.readFileSync(path.join(__dirname,'..','src','FoamLensDesktop','Program.cs'),'utf8');
new vm.Script(candidate,{filename:'v24-granada-timeseries-t2.js'});

const checks=[];
function test(name,cb){cb();checks.push(name)}
function el(id='',name='div'){
  const e={id,tagName:name.toUpperCase(),className:'',children:[],parentNode:null,attributes:{},handlers:new Map(),
    dataset:{},textContent:'',disabled:false,open:false};
  Object.defineProperty(e,'parentElement',{get(){return this.parentNode}});
  const classes=()=>new Set(e.className.split(/\s+/).filter(Boolean));
  e.classList={
    contains(k){return classes().has(k)},
    add(...names){const s=classes();names.forEach(n=>s.add(n));e.className=[...s].join(' ')},
    remove(...names){const s=classes();names.forEach(n=>s.delete(n));e.className=[...s].join(' ')}
  };
  e.appendChild=function(c){
    if(c.parentNode){const old=c.parentNode.children;old.splice(old.indexOf(c),1)}
    c.parentNode=e;e.children.push(c);return c
  };
  e.insertBefore=function(c,ref){
    if(c.parentNode){const old=c.parentNode.children;old.splice(old.indexOf(c),1)}
    const i=e.children.indexOf(ref);assert(i>=0,'reference must belong to parent');
    c.parentNode=e;e.children.splice(i,0,c);return c
  };
  e.remove=function(){
    if(!e.parentNode)return;const a=e.parentNode.children;
    a.splice(a.indexOf(e),1);e.parentNode=null
  };
  e.insertAdjacentElement=function(where,node){
    assert.equal(where,'afterend');assert(e.parentNode);
    const siblings=e.parentNode.children,at=siblings.indexOf(e);
    if(node.parentNode){const old=node.parentNode.children;old.splice(old.indexOf(node),1)}
    node.parentNode=e.parentNode;siblings.splice(at+1,0,node)
  };
  e.setAttribute=function(k,v){e.attributes[k]=String(v)};
  e.addEventListener=function(type,listener){if(!e.handlers.has(type))e.handlers.set(type,[]);e.handlers.get(type).push(listener)};
  e.click=function(){if(e.disabled)return;for(const fn of e.handlers.get('click')||[])fn({target:e})};
  return e
}
function treeFind(root,id){
  if(root.id===id)return root;
  for(const child of root.children){const match=treeFind(child,id);if(match)return match}
  return null
}
function mockApp(){
  const html=el('documentRoot','html'),head=el('head','head'),body=el('body','body');
  html.appendChild(head);html.appendChild(body);
  const panel=el('timeSeriesControls');
  body.appendChild(panel);
  const originalTitle=el('sourceTitle');
  originalTitle.className='analysisTitle';panel.appendChild(originalTitle);
  const filters1=el('filtersA');filters1.className='row2';panel.appendChild(filters1);
  const primary=el('timeSeriesVariable','select');filters1.appendChild(primary);
  const secondary=el('timeSeriesVariable2','select');filters1.appendChild(secondary);
  const filters2=el('filtersB');filters2.className='row2';panel.appendChild(filters2);
  const actions=el('timeSeriesActions');actions.className='timeSeriesActions';panel.appendChild(actions);
  const hint=el('timeSeriesFilterHint');panel.appendChild(hint);
  const badge=el('timeSeriesFocusBadge');badge.textContent='0 curves';originalTitle.appendChild(badge);
  const details=el('fwDataFieldHistories','details');panel.appendChild(details);
  const generator=el('fwFieldTsControls');generator.className='fwFieldTsControls hidden';details.appendChild(generator);
  const slotA=el('sourceA');slotA.className='fwTsSeries';generator.appendChild(slotA);
  const slotB=el('sourceB');slotB.className='fwTsSeries';generator.appendChild(slotB);
  const button=el('fwBuildFieldHistories','button');generator.appendChild(button);
  const status=el('fwTsStatus');generator.appendChild(status);
  const language=el('language');language.value='en';body.appendChild(language);
  const events=new Map();
  const document={documentElement:html,head,body,createElement:(tag)=>el('',tag),
    getElementById:(id)=>treeFind(html,id),addEventListener:(type,fn)=>events.set(type,fn)};
  class Observer{constructor(fn){this.fn=fn}observe(){this.observing=true}disconnect(){this.observing=false}}
  let originalClicks=0,refreshes=0,lastStatus='';
  button.addEventListener('click',()=>{originalClicks++});
  const sandbox={
    document,window:{},MutationObserver:Observer,console,
    fwState:{fieldTsSeq:18},
    activeAppMode:'data',currentDataView:'timeseries',
    flUi:(en)=>en,
    fwRefreshFieldTsControls:()=>{
      refreshes++;
      assert.equal(details.open,true,'native refresh requires its details.open anchor');
    },
    fwFieldTsSetStatus:msg=>{lastStatus=msg;status.textContent=msg}
  };
  vm.createContext(sandbox);
  vm.runInContext(candidate,sandbox,{filename:'v24-granada-timeseries-t2.js'});
  return{document,sandbox,panel,details,originalTitle,filters1,filters2,
    primary,secondary,actions,hint,slotA,slotB,button,status,
    getOriginalClicks:()=>originalClicks,getRefreshes:()=>refreshes,getLastStatus:()=>lastStatus,events}
}
test('runtime preserves EXACT original controls and bound generator action',()=>{
  const app=mockApp(),get=id=>app.document.getElementById(id);
  assert.equal(app.sandbox.window.FoamLensGranadaT2.installed(),true);
  assert.equal(get('timeSeriesVariable'),app.primary);
  assert.equal(get('timeSeriesVariable2'),app.secondary);
  assert.equal(get('fwBuildFieldHistories'),app.button);
  assert.equal(get('sourceA'),app.slotA);
  assert.equal(get('sourceB'),app.slotB);
  assert.equal(get('gr176ExistingCard').parentNode,app.panel);
  assert.equal(get('gr176HistoryCard').parentNode,app.panel);
  assert.equal(app.originalTitle.parentNode.id,'gr176ExistingCard');
  assert.equal(app.details.open,true);
  assert.equal(app.details.classList.contains('gr176SourceAnchor'),true);
  assert.equal(app.getRefreshes(),1,'late-import source refresh stays enabled');
  assert.equal(app.button.parentNode.className,'gr176HistoryActions');
  app.button.click();
  assert.equal(app.getOriginalClicks(),1,'existing core generator listener must still fire');
});
test('Cancel visibly disables after atomic generation epoch is invalidated',()=>{
  const app=mockApp(),get=id=>app.document.getElementById(id);
  const cancel=get('gr176Cancel');
  assert.equal(cancel.disabled,true,'disabled but discoverable at idle');
  app.button.click();
  assert.equal(app.sandbox.window.FoamLensGranadaT2.isBuilding(),true);
  assert.equal(cancel.disabled,false);
  assert.equal(app.button.attributes['aria-busy'],'true');
  assert.equal(app.sandbox.window.FoamLensGranadaT2.cancel(),true);
  assert.equal(app.sandbox.fwState.fieldTsSeq,19);
  assert.equal(app.sandbox.window.FoamLensGranadaT2.isBuilding(),false);
  assert.equal(cancel.disabled,true);
  assert.match(app.getLastStatus(),/Cancelled/);
  assert.equal(app.sandbox.window.FoamLensGranadaT2.cancel(),false,'cannot cancel twice');
});
test('two source slots and real-field selectors remain independent',()=>{
  const a=mockApp(),get=id=>a.document.getElementById(id);
  assert.notEqual(get('sourceA'),get('sourceB'));
  assert.equal(get('sourceA').parentNode,get('sourceB').parentNode);
  assert.equal(get('fwFieldTsControls').parentNode.id,'gr176HistoryCard');
  assert.equal(a.primary.parentNode.id,'filtersA');
  assert.equal(a.secondary.parentNode.id,'filtersA');
  assert.equal(a.document.getElementById('fwDataFieldHistories').children.length,0);
});
test('no parser, scientific data, 3D camera or Field output mutations in the T2 module',()=>{
  for(const token of ['fvLoadFrameData(','fwCommitFieldHistoryDrafts(','series.push(','setAppMode(','setDataView(','fvState.','fcState.'])
    assert(!candidate.includes(token),'T2 may not modify the functional scientific/Field domain: '+token);
  for(const token of ['if(seq!==fwState.fieldTsSeq)return','if(seq!==fwState.fieldTsSeq)return null',
    'const built=fwCommitFieldHistoryDrafts(drafts)'])
    assert(core.includes(token),'cancel safety requires existing source loop and atomic commit gate: '+token);
  assert(core.includes("if(!root||!details?.open)return"),'retain the source refresh guard');
});
test('real structural data/error/states exist without fake variable-0 fallback',()=>{
  for(const id of ['timeSeriesControls','timeSeriesVariable','timeSeriesVariable2','fwTsStatus','timeSeriesFilterHint'])
    assert(index.includes('id="'+id+'"')||core.includes('id="'+id+'"'),'missing original control '+id);
  assert(candidate.includes("fwState.fieldTsSeq"),'functional cancel epoch');
  assert(candidate.includes('progress is not reported by this engine'), 'honest unknown progress statement');
  assert(!candidate.includes('Variable 0'));
  const trusted=fs.readFileSync(path.join(__dirname,'..','src','FoamLensDesktop',
  'TrustedEmbeddedFrontendExtensions.cs'),'utf8');
const realBuild=fs.readFileSync(path.join(__dirname,'..','..','.github','workflows',
  'build-foamlens-desktop.yml'),'utf8');
assert(host.includes('TrustedEmbeddedFrontendExtensions.ReadFromRunningAssembly()'),
  'G35 production host must execute only assembly-embedded original versioned scripts');
assert(!host.includes('Directory.GetFiles(AppRoot, "v*-*.js")'),
  'Never restore user-writable local wildcard JS to satisfy a historical T2 test');
assert(trusted.includes('FoamLensDesktop.AppBundle.zip')&&trusted.includes('MaxModuleBytes'),
  'Versioned T2 code must use genuine bounded original assembly bundle');
assert(realBuild.includes('Copy-Item desktop/src/FoamLensDesktop/frontend/v*-*.js bundle_tmp/'),
  'Native Windows original executable must actually bundle T2 original module');
});
test('responsive, keyboard, localization and no replacement controls',()=>{
  for(const token of [':focus-visible','repeat(auto-fit,minmax','aria-live','aria-labelledby',
    'foamlens-language-change','fwDataFieldHistories','appendChild(root)','appendChild(build)'])
    assert(candidate.includes(token),'missing UI/interaction guarantee '+token);
  assert(!candidate.includes("innerHTML='<select"),'T2 must not fabricate selectors');
});
console.log('Granada #176 G3 real Time Series UX: '+checks.length+' checks passed.');
for(const result of checks)console.log('  ✓ '+result);
