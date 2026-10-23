'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../desktop/src/FoamLensDesktop/frontend');
const src=fs.readFileSync(path.join(root,'v33-granada-wide-play-cascade-guard.js'),'utf8');
function fixture({width=1140,compact=true,playWidth=112,playScroll=110,label='▶ Play ↻',aria='Play continuously in a loop',mode='field',defer=false}={}){
 const els=new Map(),events={};
 class Node{
  constructor(name){this.name=name;this.textContent='';this.attrs={};this.classSet=new Set();
   this.classList={contains:k=>this.classSet.has(k),add:k=>this.classSet.add(k)};
   this.children=[];this.clientWidth=0;this.scrollWidth=0;this.rect={width:0,height:0,left:0,right:0};}
  set id(s){this.name=s;els.set(s,this)}
  get id(){return this.name}
  appendChild(node){this.children.push(node);return node}
  contains(child){return this===child||this.children.some(x=>x.contains(child))}
  getBoundingClientRect(){return this.rect}
  getAttribute(k){return this.attrs[k]??null}
  setAttribute(k,v){this.attrs[k]=v}
 }
 const body=new Node('body');body.classList.add('flRibbonReady');body.classList.add('appMode-'+mode);
 const app=new Node('appShell');if(compact)app.classList.add('gfwCompact');els.set(app.id,app);
 const panel=new Node('flRibbonPanel-field');panel.classList.add('active');els.set(panel.id,panel);
 const transport=new Node('fwTimeTransport');els.set(transport.id,transport);
 const play=new Node('fwTimePlay');els.set(play.id,play);transport.appendChild(play);
 play.rect={left:48,right:48+playWidth,width:playWidth,height:32};play.clientWidth=playWidth-2;play.scrollWidth=playScroll;
 play.textContent=label;play.setAttribute('aria-label',aria);
 const doc={body,head:new Node('head'),readyState:defer?'loading':'complete',getElementById:id=>els.get(id)||null,
  createElement:()=>new Node('style'),addEventListener:(event,fn)=>events[event]=fn};
 const win={innerWidth:width,innerHeight:820};
 vm.runInNewContext(src,{window:win,document:doc,getComputedStyle:()=>({minWidth:compact?'68px':'112px',maxWidth:compact?'100%':'none',fontSize:'12px'})},{timeout:3000});
 return{win,doc,play,style:()=>els.get('flG16WidePlayCascadeGuard')?.textContent,fire:()=>events.DOMContentLoaded?.()};
}
test('real 1140px original Play source state passes with G7 compact class still stale',()=>{
 const f=fixture();const a=f.win.FoamLensGranadaG16.audit();
 assert.equal(a.active,true);assert.equal(a.result,'PASS');assert.equal(a.staleG7CompactClassAtWideWidth,true);
 assert.equal(a.originalTransportContainsPlay,true);assert.equal(a.physicsOrSavedStateChanged,false);
});
test('replay ORIGINAL failed installed 70.39px width and 68px compact min width at 1140',()=>{
 const a=fixture({playWidth:70.390625,playScroll:68}).win.FoamLensGranadaG16.audit();
 assert.equal(a.result,'FAIL');assert.equal(a.originalPlayRect.width,70.390625);
 assert.equal(a.computedMinWidth,'68px');
});
test('fail closed if original text overflows, is translated incorrectly, or has missing loop aria',()=>{
 for(const opts of [{playWidth:112,playScroll:200},{label:'❚ Pause'},{aria:'unlabelled'}])
  assert.equal(fixture(opts).win.FoamLensGranadaG16.audit().result,'FAIL');
});
test('same exact G7 selector specificity and HIGHER version injection at wide only',()=>{
 const sourceG7=fs.readFileSync(path.join(root,'v27-granada-compact-workbench.js'),'utf8');
 const selector='body.flRibbonReady.appMode-field .app.gfwCompact #flRibbonPanel-field .flRibbonTimeGroup #fwTimePlay';
 assert(sourceG7.includes(selector+'{min-width:68px!important;width:auto!important;max-width:100%!important}'));
 const css=fixture().style();
 assert(css.includes('@media(min-width:1025px) and (max-width:1250px)'));
 assert(css.includes(selector+'{min-width:112px!important;width:max-content!important;max-width:none!important'));
 assert(css.includes('grid-template-columns:32px max-content 32px minmax(90px,1fr)'));
 assert(/v33-/.test('v33-granada-wide-play-cascade-guard.js'));
 const g12=fs.readFileSync(path.join(root,'v31-granada-wide-field-ribbon.js'),'utf8');
 assert(g12.includes('min-width:112px!important'));
});
test('compact Field <=1024px and large viewports do not activate G16',()=>{
 for(const width of [480,640,1024,1251,1600,1920])
  assert.equal(fixture({width}).win.FoamLensGranadaG16.audit().result,'NOT_APPLICABLE');
 assert.equal(fixture({mode:'data'}).win.FoamLensGranadaG16.audit().result,'NOT_APPLICABLE');
 assert.equal(fixture({mode:'analysis'}).win.FoamLensGranadaG16.audit().result,'NOT_APPLICABLE');
});
test('normal stable 1140 original state is not restyled, only stale compact class',()=>{
 const f=fixture({compact:false});const a=f.win.FoamLensGranadaG16.audit();
 assert.equal(a.staleG7CompactClassAtWideWidth,false);
 const css=f.style();
 assert(css.includes('.app.gfwCompact'));
 assert(!css.includes(':not(.gfwCompact)'));
});
test('never relabel, click, move original controls, change storage or field/solver physics',()=>{
 const forbidden=['.click(','.dispatchEvent(','.remove(','.classList.remove(','.classList.toggle(','.classList.add(','.appendChild(play','postMessage(', 'localStorage','sessionStorage','fetch(', 'requestAnimationFrame(', 'setTimeout('];
 for(const s of forbidden)assert(!src.includes(s),s);
 assert(src.includes('document.head.appendChild(sheet)'));
 assert(src.includes('nativeInstalledOrPhysicalDpiApproved:false'));
});
test('deferred stylesheet installation is idempotent',()=>{
 const f=fixture({defer:true});assert.equal(f.style(),undefined);
 f.fire();assert(f.style()?.includes('min-width:112px!important'));f.fire();
 assert.equal(f.doc.head.children.length,1);
});
test('C# host auto-bundles actual v33 file without modifying Program.cs',()=>{
 const host=fs.readFileSync(path.resolve(root,'../Program.cs'),'utf8');
 assert(host.includes('Directory.GetFiles(AppRoot, "v*-*.js")'));
 assert(src.includes("window.FoamLensGranadaG16=Object.freeze({audit})"));
});
