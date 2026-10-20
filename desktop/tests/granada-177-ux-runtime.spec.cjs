'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'..','src','FoamLensDesktop','frontend','v24-granada-global-ux.js'),'utf8');
const byId=new Map(),eventHandlers=new Map();
const bounds=(left=0,top=0,width=140,height=35)=>({left,top,width,height,right:left+width,bottom:top+height});
class Node {
 constructor(tag='div',id=''){
  this.tag=tag;this.id=id;this.children=[];this.parentElement=null;this.hidden=false;
  this.dataset={};this.style={};this.attributes={};this.textContent='';
  this.listeners={};this.classSet=new Set();this.className='';
  this.classList={contains:v=>this.classSet.has(v),add:v=>this.classSet.add(v),
    remove:v=>this.classSet.delete(v),toggle:(v,force)=>{
     const has=force===undefined?!this.classSet.has(v):!!force;
     has?this.classSet.add(v):this.classSet.delete(v);return has
    }};
  if(id)byId.set(id,this)
 }
 append(node){
  if(node.parentElement)node.parentElement.children=node.parentElement.children.filter(x=>x!==node);
  node.parentElement=this;this.children.push(node);
 }
 appendChild(node){this.append(node)}
 setAttribute(k,v){this.attributes[k]=String(v)}
 getAttribute(k){return this.attributes[k]}
 addEventListener(k,cb){(this.listeners[k]??=[]).push(cb)}
 dispatch(k,e){for(const fn of this.listeners[k]||[])fn(e)}
 focus(){this.focusCount=(this.focusCount||0)+1}
 getBoundingClientRect(){return this.rect||bounds()}
 contains(node){for(let x=node;x;x=x.parentElement)if(x===this)return true;return false}
 matches(selector){
  if(selector==='.flRibbonAction')return this.classSet.has('flRibbonAction');
  if(selector==='.flRibbonGroup')return this.classSet.has('flRibbonGroup');
  if(selector==='.flRibbonPanel.active')return this.classSet.has('flRibbonPanel')&&this.classSet.has('active');
  if(selector==='.flRibbonLabel')return this.classSet.has('flRibbonLabel');
  if(selector==='.gxFlyout')return this.classSet.has('gxFlyout');
  if(selector==='.flRibbonTab')return this.classSet.has('flRibbonTab');
  if(selector==='details:not([open])'||selector==='summary')return false;
  if(selector==='[data-gx-mode]')return!!this.dataset.gxMode;
  if(selector==='[data-gx-mode="data"]'||selector==='[data-gx-mode="view"]')
    return this.dataset.gxMode===selector.match(/mode="([^"]+)"/)[1];
  return false
 }
 querySelectorAll(selector){
  const result=[],scan=node=>{for(const child of node.children){
    if(child.matches(selector))result.push(child);
    scan(child)
  }};scan(this);return result
 }
 querySelector(selector){
  if(selector.includes(' ')){
    const [prefix,rest]=selector.split(/ (.+)/);
    const group=this.querySelectorAll(prefix)[0];
    if(!group)return null;
    if(rest.startsWith('#')){
      const target=byId.get(rest.slice(1));return group.contains(target)?target:null
    }
    return group.querySelector(rest)
  }
  return this.querySelectorAll(selector)[0]||null
 }
 closest(selector){
  if(selector==='details:not([open])'||selector==='summary')return null;
  for(let node=this;node;node=node.parentElement)if(node.matches(selector))return node;
  return null
 }
}
const body=new Node('body'),head=new Node('head'),ribbon=new Node('section','flRibbon');
body.append(ribbon);body.classList.add('flRibbonReady');
const groups={
 home:{primary:['flRaOpenFiles','flRaOpenFolder','flRaSaveWorkspace','flRaCases','flRaReview','flRaLive'],more:['flRaOpenWorkspace','flRaOverview']},
 data:{primary:['flRaCatalog','flRaDataProfiles','flRaDataTimeSeries','flRaDataLogs','flRaDataCompare'],more:['flRaSelectAll','flRaShowSeries','flRaClear']},
 analysis:{primary:['flRaAnalysisGeneral','flRaCoupling','flRaFront','flRaDifference','flRaMapping','flRaPhaseMomentum'],more:['flRaAnalysisTimeResult','flRaAnalysisProfileResult']},
 export:{primary:['flRaExportPng','flRaExportSvg','flRaExportCsv','flRaExportVideo'],more:['flRaExportThesis','flRaExportMulti']},
 view:{primary:['flRaSidebar','flRaViewFit','flRaResetLayout','flRaTheme','flRaLanguage','flRaHelp'],more:['flRaPerformance','flRaViewNames']}
};
let actionCount=0,original=new Map();
for(const [mode,defs] of Object.entries(groups)){
 const panel=new Node('div','flRibbonPanel-'+mode);panel.dataset.ribbonPanel=mode;panel.classList.add('flRibbonPanel');
 if(mode==='data')panel.classList.add('active');
 ribbon.append(panel);
 const parent=new Node('div');parent.classList.add('flRibbonGroup');panel.append(parent);
 for(const id of [...defs.primary,...defs.more]){
  const action=new Node('button',id);action.classList.add('flRibbonAction');
  action.dataset.riEn=id;action.dataset.riEs='Español '+id;
  const label=new Node('span');label.classList.add('flRibbonLabel');action.append(label);
  action.onclick=()=>{actionCount++};
  parent.append(action);original.set(id,action)
 }
}
const field=new Node('div','flRibbonPanel-field');field.classList.add('flRibbonPanel');field.dataset.ribbonPanel='field';ribbon.append(field);
for(const id of ['fvViewport','fcViewport','fcExtra3Viewport','fcExtra4Viewport','fwTimeTransport','flRaFieldWorkspace','flRaInspector','flFieldContextTabs','reviewSurface','reviewTabAuditor','reviewTabFindings','liveSurface','liveChooseFolder','liveStatus'])body.append(new Node('div',id));
const activeTabs=new Node('div');ribbon.append(activeTabs);
for(const mode of ['home','data','field','analysis','export','view']){
 const tab=new Node('button','flRibbonTab-'+mode);tab.classList.add('flRibbonTab');activeTabs.append(tab)
}
const status=new Node('span','status');body.append(status);
const language=new Node('select','language');language.value='es';body.append(language);
const document={
 body,head,readyState:'complete',createElement:tag=>new Node(tag),
 getElementById:id=>byId.get(id)||null,
 querySelectorAll:selector=>body.querySelectorAll(selector),
 addEventListener:(type,cb)=>{(eventHandlers.get(type)||eventHandlers.set(type,[]).get(type)).push(cb)}
};
const window={innerWidth:1280,innerHeight:800,devicePixelRatio:1.5,
 addEventListener:(name,cb)=>{(eventHandlers.get(name)||eventHandlers.set(name,[]).get(name)).push(cb)},
 getComputedStyle:()=>({display:'block',visibility:'visible',overflowX:'visible',overflowY:'visible'})};
const ctx={document,window,activeAppMode:'data',requestAnimationFrame:()=>1,
 console,JSON,Date,Number,Math,Array,Set,Map,String,flUi:(en,es)=>es};
vm.runInNewContext(source,ctx,{timeout:3000});
const api=window.FoamLensGranadaUX;
assert(api,'Original Ribbon mounted and global upgrade should install');
assert.equal(byId.get('flRibbonPanel-data').querySelectorAll('.flRibbonAction').length,5);
assert.equal(byId.get('gxFlyout').querySelectorAll('.flRibbonAction').length,11,'Moved original auxiliary actions only (2+3+2+2+2)');
for(const [mode,defs] of Object.entries(groups)){
 for(const id of defs.primary){
  assert(byId.get('flRibbonPanel-'+mode).contains(original.get(id)),'Always visible primary stays on toolbar: '+id)
 }
 for(const id of defs.more){
  assert(byId.get('gxFlyout').contains(original.get(id)),'Original secondary button moved, not cloned: '+id);
  assert.equal(byId.get(id),original.get(id),'Canonical ID + original listeners survive move')
 }
 assert(byId.get('gxMore-'+mode),'Accessible More control exists for '+mode)
}
const oldSource=byId.get('flRibbonPanel-field');assert.equal(oldSource.querySelectorAll('.flRibbonAction').length,0,'Field controls untouched');
byId.get('gxMore-data').onclick();
assert.equal(byId.get('gxFlyout').hidden,false);
assert.equal(byId.get('gxMore-data').getAttribute('aria-expanded'),'true');
const item=byId.get('flRaClear');
assert.equal(item.getAttribute('aria-label'),'Español flRaClear','Secondary original action localizes in Spanish');
item.onclick();
assert.equal(actionCount,1,'Original bound click handler is still alive');
const result=api.audit();
assert.equal(result.schema,'foamlens/granada-177-visible-controls/1');
assert.equal(result.viewport.devicePixelRatio,1.5);
assert.equal(result.activeRibbon,'data');
assert.equal(result.evidence.byMode.data.find(x=>x.id==='flRaClear').state,'in-more');
assert.equal(result.evidence.byMode.data.find(x=>x.id==='flRaCatalog').state,'visible');
assert.equal(result.evidence.byMode.field.find(x=>x.id==='fvViewport').state,'inactive-not-visual-tested');
assert.equal(result.evidence.critical.length,0);
assert.equal(JSON.stringify(result).includes('private-source-path'),false);
api.close();
assert.equal(byId.get('gxFlyout').hidden,true);
byId.get('gxMore-view').onclick();
assert.equal(byId.get('gxMore-view').getAttribute('aria-expanded'),'true');
assert(byId.get('gxAuditButton'));
api.close(true);
assert.equal(byId.get('gxMore-view').getAttribute('aria-expanded'),'false');
assert(byId.get('gxMore-view').focusCount>0);
assert.equal(original.size,38);
console.log('Granada #177 G1 runtime PASS: five actual tab toolbars keep primary actions, 11 secondary original IDs + listeners retained, Spanish labels, menu open/close, eight-mode layout audit, 3D untouched.');
