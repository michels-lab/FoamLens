'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const root=path.join(__dirname,'..','src','FoamLensDesktop','frontend');
const multi=fs.readFileSync(path.join(root,'v16-multipanel-export.js'),'utf8');
const mesh=fs.readFileSync(path.join(root,'v24-checkmesh-region-evidence.js'),'utf8');
const originalMeshIdentifiers=['meMETRICS','meDefects','meEvidence','meInstall','meExport','mePanel','meFiles','meCase','meRefresh','meStatus','meReport'];
const checks=[];function test(name,fn){fn();checks.push(name)}
function domFixture(){
 const events=new Map();
 let n=0;
 const all=[];
 function node(tag='div'){
  const o={tagName:tag.toUpperCase(),parentNode:null,children:[],_id:'',_html:'',className:'',disabled:false,
    value:'',files:[],textContent:'',style:{},onclick:null,onchange:null,clickCount:0};
  Object.defineProperty(o,'id',{get:()=>o._id,set:v=>{o._id=v}});
  Object.defineProperty(o,'innerHTML',{get:()=>o._html,set:v=>{
   o._html=String(v);
   o.children=[];
   const re=/<(button|input|select|div|p|section|small|details|label)\b[^>]*?\bid="([^"]+)"/g;
   for(const m of o._html.matchAll(re)){
    const child=node(m[1]);child.id=m[2];child.parentNode=o;child.children=[];o.children.push(child)
   }
  }});
  o.appendChild=x=>{x.parentNode=o;o.children.push(x);return x};
  o.append=x=>o.appendChild(x);
  o.remove=()=>{if(o.parentNode)o.parentNode.children=o.parentNode.children.filter(x=>x!==o)};
  o.click=()=>{o.clickCount++;o.onclick?.()};
  const classes=()=>new Set(o.className.split(/\s+/).filter(Boolean));
  o.classList={contains:c=>classes().has(c),add:c=>{let s=classes();s.add(c);o.className=[...s].join(' ')},
    remove:c=>{let s=classes();s.delete(c);o.className=[...s].join(' ')}};
  o.addEventListener=(name,fn)=>{o['listener_'+name]=fn};
  all.push(o);return o
 }
 const head=node('head'),body=node('body');const moduleHost=node('div');moduleHost.id='generalAnalysisModules';
 body.appendChild(moduleHost);
 const find=id=>all.filter(x=>x.id===id).filter(x=>{let p=x;while(p){if(p===body||p===head)return true;p=p.parentNode}return false});
 const doc={head,body,readyState:'loading',createElement:tag=>node(tag),
  getElementById:id=>find(id)[0]||null,
  addEventListener:(name,fn)=>{events.set(name,fn)}
 };
 const window={};
 const ctx={document:doc,window,cases:[],console,flUi:(a,b)=>a,FileReader:class{},Blob:class{},URL:{},
  setTimeout:fn=>{fn();return 0},getComputedStyle:()=>({display:'block'})};
 vm.createContext(ctx);
 return{ctx,doc,all,events,find}
}
test('source namespaced all 11 prior me* collisions while preserving public scientific API',()=>{
 for(const id of originalMeshIdentifiers)assert(!new RegExp('\\b'+id+'\\b').test(mesh),'mesh source still exports multipanel identifier '+id);
 assert.match(mesh,/window\.FoamLensMultiRegionMeshEvidence=\{analyze:cmrEvidence,parseLocators:cmrDefects\}/);
 assert(mesh.includes("'use strict'")&&mesh.includes('})();'));
 assert(!mesh.includes("window.FoamLensMultiPanelExport="));
});
test('both source files compile jointly in the same original desktop function lexical scope',()=>{
 new Function(multi+'\n;\n'+mesh);
 new vm.Script(multi+'\n;\n'+mesh);
});
test('DOM identifiers remain globally unique across multipanel and mesh auditor',()=>{
 const m=multi.matchAll(/\bid="(me[A-Z][^"]+)"/g);
 const q=mesh.matchAll(/\bid="(cmr[A-Z][^"]+)"/g);
 const first=new Set([...m].map(x=>x[1])),second=new Set([...q].map(x=>x[1]));
 for(const x of second)assert(!first.has(x));
 assert(first.has('meExport')&&second.has('cmrExport'));
 assert(first.has('meRefresh')&&second.has('cmrRefresh'));
 assert(second.has('cmrFiles')&&second.has('cmrCase')&&second.has('cmrReport'));
});
test('real original IIFEs mount independent dialogs and listeners into same mock document',()=>{
 const f=domFixture();
 vm.runInContext(multi+'\n;\n'+mesh,f.ctx,{timeout:4000});
 assert(f.ctx.window.FoamLensMultiPanelExport,'original multipanel API not mounted');
 assert(f.ctx.window.FoamLensMultiRegionMeshEvidence,'checkMesh API missing');
 assert(f.doc.getElementById('meDialog'));
 assert.equal(f.doc.getElementById('cmrPanel'),null,'mesh init must wait for DOMContentLoaded');
 f.events.get('DOMContentLoaded')?.();
 assert(f.doc.getElementById('cmrPanel'),'checkMesh panel must install');
 assert.equal(f.find('meExport').length,1);
 assert.equal(f.find('cmrExport').length,1);
 assert.notEqual(f.doc.getElementById('meExport'),f.doc.getElementById('cmrExport'));
 assert.equal(typeof f.doc.getElementById('meExport').onclick,'function');
 assert.equal(typeof f.doc.getElementById('cmrExport').onclick,'function');
 assert.equal(f.doc.getElementById('cmrExport').disabled,true,'mesh evidence export disabled until inspection');
 assert.match(f.doc.getElementById('cmrStatus').textContent,/changed/i);
});
test('repeated mount cannot duplicate mesh panel or hijack multi-panel handlers',()=>{
 const f=domFixture();
 vm.runInContext(multi+'\n;\n'+mesh,f.ctx,{timeout:4000});
 f.events.get('DOMContentLoaded')?.();
 const original=f.doc.getElementById('meExport').onclick,meshButton=f.doc.getElementById('cmrExport');
 assert.equal(f.find('cmrPanel').length,1);
 assert.equal(f.find('meDialog').length,1);
 assert.equal(f.doc.getElementById('meExport').onclick,original);
 assert.equal(meshButton.disabled,true);
});
test('scientific core markers survive namespace isolation and never fabricate OpenFOAM input',()=>{
 const start='/* FOAMLENS_MESH_EVIDENCE_CORE_START */',end='/* FOAMLENS_MESH_EVIDENCE_CORE_END */';
 assert(mesh.includes(start)&&mesh.includes(end));
 const core=mesh.split(start)[1].split(end)[0];
 const api=new Function(core+';return {audit:cmrEvidence,defects:cmrDefects,label:cmrLabel}')();
 assert.equal(api.audit([],[]).overallScientificValidity,'not-certified');
 assert.equal(api.label('../private'),null);
 assert(!mesh.includes('cases.push(')&&!mesh.includes('series.push('));
});
console.log('Granada #150 independent checkMesh/Multi-panel collisions: '+checks.length+' runtime/source regression groups PASS');
for(const x of checks)console.log('  ✓ '+x);
