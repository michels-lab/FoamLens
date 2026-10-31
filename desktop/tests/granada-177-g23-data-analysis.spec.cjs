'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..','src','FoamLensDesktop','frontend');
const src=fs.readFileSync(path.join(root,'v24-granada-g23-data-analysis.js'),'utf8');
const original=fs.readFileSync(path.join(root,'index.html'),'utf8');
const analysisSource=fs.readFileSync(path.join(root,'v21-analysis-scope.js'),'utf8');
const ribbonSource=fs.readFileSync(path.join(root,'v15-ribbon-ui.js'),'utf8');
new vm.Script(src,{filename:'v24-granada-g23-data-analysis.js'});
const results=[];
function test(name,fn){fn();results.push(name)}
function mock(){
 const nodes=[],watchers=[],storage=new Map(),events=new Map();
 let document;
 function el(id='',tag='div',className=''){
  const n={id,tagName:tag.toUpperCase(),className,children:[],parentElement:null,style:{display:''},
    dataset:{},attributes:{},disabled:false,open:false,textContent:'',value:'',role:'',handlers:new Map(),
    isConnected:true};
  nodes.push(n);
  const classes=()=>new Set(n.className.split(/\s+/).filter(Boolean));
  n.classList={
   add(...v){const s=classes();v.forEach(x=>s.add(x));n.className=[...s].join(' ')},
   remove(...v){const s=classes();v.forEach(x=>s.delete(x));n.className=[...s].join(' ')},
   contains(v){return classes().has(v)}
  };
  n.appendChild=function(c){if(c.parentElement){const a=c.parentElement.children;a.splice(a.indexOf(c),1)}
   c.parentElement=n;n.children.push(c);return c};
  n.prepend=function(c){if(c.parentElement){const a=c.parentElement.children;a.splice(a.indexOf(c),1)}
   c.parentElement=n;n.children.unshift(c);return c};
  n.insertAdjacentElement=function(side,c){assert.equal(side,'afterend');assert(n.parentElement);
   if(c.parentElement){const a=c.parentElement.children;a.splice(a.indexOf(c),1)}
   const a=n.parentElement.children;a.splice(a.indexOf(n)+1,0,c);c.parentElement=n;return c};
  n.matches=s=>s.startsWith('.')?n.classList.contains(s.slice(1)):s===n.tagName.toLowerCase();
  n.closest=function(s){
   let p=n;while(p){if(s==='.card'&&p.classList.contains('card'))return p;
    if(s==='#flG23AnalysisGuide'&&p.id==='flG23AnalysisGuide')return p;p=p.parentElement}return null;
  };
  n.contains=function(x){return x===n||n.children.some(c=>c.contains(x))};
  n.querySelectorAll=function(s){
   const out=[];function visit(x){for(const c of x.children){if(s==='.datasetTab'&&c.classList.contains('datasetTab')||
    s==='[id]'&&c.id)out.push(c);visit(c)}}visit(n);return out;
  };
  n.querySelector=function(s){
   function walk(x){for(const c of x.children){
    if(s==='.datasetTabs'&&c.classList.contains('datasetTabs')||s==='span'&&c.tagName==='SPAN'||
       s==='small'&&c.tagName==='SMALL')return c;
    const deeper=walk(c);if(deeper)return deeper
   }return null}return walk(n);
  };
  n.addEventListener=function(k,fn){if(!n.handlers.has(k))n.handlers.set(k,[]);n.handlers.get(k).push(fn)};
  n.dispatch=function(k,ev={}){for(const fn of n.handlers.get(k)||[])fn(ev)};
  n.setAttribute=function(k,v){n.attributes[k]=String(v)};
  n.hasAttribute=k=>Object.prototype.hasOwnProperty.call(n.attributes,k);
  n.focus=function(){document.activeElement=n;n.focusCount=(n.focusCount||0)+1};
  n.scrollIntoView=function(){n.scrolled=true};
  n.getBoundingClientRect=()=>({width:120,height:35});
  return n
 }
 const html=el('html'),head=el('head'),body=el('body','body','appMode-data');
 html.appendChild(head);html.appendChild(body);
 const sidebar=el('sidebar','aside','sidebar');body.appendChild(sidebar);
 const dataCard=el('dataCard','div','card flSidebarSection flSidebarSectionCollapsed');
 sidebar.appendChild(dataCard);
 const count=el('countBadge');dataCard.appendChild(count);
 const block=el('datasetModeBlock');dataCard.appendChild(block);
 const tabs=el('nativeDatasetTabs','div','datasetTabs');block.appendChild(tabs);
 const native={};
 for(const id of ['timeSeriesTab','profileTab','logTab','catalogTab']){
  const button=el(id,'button',id==='timeSeriesTab'?'datasetTab active':'datasetTab');
  button.disabled=id==='profileTab';native[id]=button;
  const label=el(id+'Label','span');label.textContent=id;button.appendChild(label);tabs.appendChild(button)
 }
 const importer=el('dataImportMore','details');dataCard.appendChild(importer);
 const analysisCard=el('flAnalysisInspectorCard','div','card flSidebarSection flSidebarSectionCollapsed');
 sidebar.appendChild(analysisCard);
 const host=el('flAnalysisOwnedHost');analysisCard.appendChild(host);
 const modules={};
 for(const id of ['generalAnalysisTools','couplingDiagnostics','phaseFrontPanel','fieldMappingTools','phaseMomentumTools']){
  const tag=id==='phaseFrontPanel'?'details':'div',node=el(id,tag);
  if(id==='generalAnalysisTools')node.style.display='none';
  if(id==='fieldMappingTools'||id==='phaseMomentumTools')node.classList.add('pmHidden');
  host.appendChild(node);modules[id]=node
 }
 const language=el('language');language.value='en';body.appendChild(language);
 document={
  head,body,documentElement:html,activeElement:null,
  createElement:tag=>el('',tag),
  getElementById:id=>nodes.find(n=>n.id===id)||null,
  addEventListener:(name,fn)=>events.set(name,fn),
  querySelectorAll:s=>s==='[id]'?nodes.filter(n=>n.id):[]
 };
 class Observer{constructor(fn){this.callback=fn;watchers.push(this)}observe(node,config){this.node=node;this.config=config}disconnect(){}}
 const window={};
 const sandbox={
  document,window,MutationObserver:Observer,
  requestAnimationFrame:fn=>{fn();return 1},
  localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,val)=>storage.set(key,val)},
  getComputedStyle:n=>({display:n.style.display||'block'}),
  console,
  flUi:(en,es)=>language.value==='es'?es:en
 };
 vm.createContext(sandbox);vm.runInContext(src,sandbox);
 const api=window.FoamLensGranadaG23;
 assert(api,'module must install against genuine Data and Analysis hosts');
 return{nodes,document,events,watchers,window,api,tabs,block,host,modules,native,dataCard,importer,language,storage}
}
test('Data restores all four ORIGINAL tabs without duplicating or renaming controls',()=>{
 const m=mock();
 assert(m.api.isInstalled());
 for(const id of ['timeSeriesTab','profileTab','logTab','catalogTab']){
  assert.equal(m.document.getElementById(id),m.native[id]);
  assert.equal(m.native[id].parentElement,m.tabs,'original tab remains under datasetModeBlock')
 }
 assert.equal(m.native.profileTab.disabled,true,'unavailable native view remains disabled');
 assert.equal(m.dataCard.classList.contains('flSidebarSectionCollapsed'),true,'user card preference is not overwritten');
 assert.equal(m.importer.open,true,'Data importer is initially discoverable');
 m.importer.open=false;m.api.refresh();
 assert.equal(m.importer.open,false,'refresh must respect a user-collapsed Data importer');
 assert(m.document.getElementById('flG23DataStatus').textContent.includes('3/4'));
});
test('Data keyboard navigation skips disabled controls and never synthesizes clicks',()=>{
 const m=mock();let clicked=0;
 m.native.logTab.addEventListener('click',()=>clicked++);
 m.native.timeSeriesTab.focus();
 let prevented=0;
 m.tabs.dispatch('keydown',{key:'ArrowRight',preventDefault:()=>prevented++});
 assert.equal(m.document.activeElement,m.native.logTab);
 assert.equal(clicked,0,'moving focus never mutates dataset selection');
 assert.equal(prevented,1);
 m.tabs.dispatch('keydown',{key:'End',preventDefault:()=>prevented++});
 assert.equal(m.document.activeElement,m.native.catalogTab);
 m.tabs.dispatch('keydown',{key:'Home',preventDefault:()=>prevented++});
 assert.equal(m.document.activeElement,m.native.timeSeriesTab);
});
test('Analysis jumps to ORIGINAL modules without creating a competing scientific engine',()=>{
 const m=mock();
 assert.equal(m.host.contains(m.modules.couplingDiagnostics),true);
 assert.equal(m.document.getElementById('flG23Go-couplingDiagnostics').disabled,false);
 assert.equal(m.api.focusModule('couplingDiagnostics'),true);
 assert.equal(m.modules.couplingDiagnostics.scrolled,true);
 assert.equal(m.document.activeElement,m.modules.couplingDiagnostics);
 assert.equal(m.storage.get('foamlens.granada.g23.analysis-focus.v1'),'couplingDiagnostics');
 assert.equal(m.api.focusModule('generalAnalysisTools'),false,'hidden scientific module stays unavailable');
 assert.equal(m.api.focusModule('phaseMomentumTools'),false,'unavailable phase UI stays disabled');
 assert.equal(m.api.focusModule('phaseFrontPanel',{focus:false}),true);
 assert.equal(m.modules.phaseFrontPanel.open,true,'native details opens without executing scientific analysis');
});
test('availability updates are reversible; language and state remain honest',()=>{
 const m=mock();
 const general=m.modules.generalAnalysisTools;
 assert.equal(m.document.getElementById('flG23Go-generalAnalysisTools').disabled,true);
 general.style.display='';m.api.refresh();
 assert.equal(m.document.getElementById('flG23Go-generalAnalysisTools').disabled,false);
 m.language.value='es';m.events.get('foamlens-language-change')();
 assert.match(m.document.getElementById('flG23GuideTitle').textContent,/Análisis/);
 assert.match(m.document.getElementById('flG23GuideStatus').textContent,/Módulos/);
 general.classList.add('pmHidden');m.api.refresh();
 assert.equal(m.document.getElementById('flG23Go-generalAnalysisTools').disabled,true);
});
test('read-only audit records original parents, disabled views and lack of scientific acceptance',()=>{
 const m=mock(),r=m.api.audit();
 assert.equal(r.mode,'data');
 assert.equal(r.installed,true);
 assert.equal(r.data.length,4);
 assert(r.data.every(t=>t.exists&&t.native));
 assert(r.analysis.every(x=>x.exists&&x.native&&x.guide));
 assert.equal(r.scientificVerification,'NOT PERFORMED');
 assert.equal(r.installedVisualApproval,'NOT PERFORMED');
 assert.equal(r.duplicates.length,0);
 assert.equal(JSON.stringify(r).includes('Variable 0'),false);
});
test('observer excludes its OWN navigation DOM; genuine native module updates are watched',()=>{
 const m=mock(),observer=m.watchers.find(w=>w.node===m.host);
 assert(observer,'original host changes must refresh availability');
 assert(observer.config.attributes&&observer.config.childList&&observer.config.subtree);
 const guide=m.document.getElementById('flG23AnalysisGuide');
 assert(guide,'guide is a single generated navigation surface');
 assert.equal(guide.querySelectorAll('[id]').filter(n=>n.id.startsWith('flG23Go-')).length,5);
 assert(src.includes("!record.target?.closest?.('#flG23AnalysisGuide')"),'own status changes must not trigger re-render loop');
 assert(!src.includes("setInterval("),'no hidden polling');
});
test('architecture: no numeric mutation, synthetic data, imported values or global UI actions',()=>{
 for(const code of ['series.push(', 'fvLoadFrameData(', 'setAppMode(', 'setDataView(', 'parseLiveLogSnapshot(', 'fwCommitFieldHistoryDrafts('])
  assert(!src.includes(code),'G2G3 must not replace native scientific ownership: '+code);
 assert(src.includes('NOT PERFORMED'));
 assert(!src.includes('Variable 0'),'do not fabricate placeholder variables');
 assert(original.includes('id="datasetModeBlock"'));
 assert(analysisSource.includes('flAnalysisOwnedHost'));
 assert(ribbonSource.includes('body.flRibbonReady.appMode-data .datasetTabs'),'correct genuine ribbon hiding defect targeted');
 assert(src.includes('.datasetTabs{display:grid!important'),'Data needs readable persistent native tabs');
 assert(!src.includes('>:not(.cardhead){display:block!important}'),'do not accidentally unhide hidden file inputs/alerts');
});
console.log('Granada G2/G3: '+results.length+' source-native / runtime regression groups PASS');
for(const name of results)console.log('  ✓ '+name);
