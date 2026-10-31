'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..','src','FoamLensDesktop','frontend');
const source=fs.readFileSync(path.join(root,'v24-granada-g6-export-preflight.js'),'utf8');
const ribbon=fs.readFileSync(path.join(root,'v15-ribbon-ui.js'),'utf8');
const multi=fs.readFileSync(path.join(root,'v16-multipanel-export.js'),'utf8');
const video=fs.readFileSync(path.join(root,'v14-animation-export.js'),'utf8');
new vm.Script(source,{filename:'v24-granada-g6-export-preflight.js'});
const ids=['flRaExportPng','flRaExportSvg','flRaExportCsv','flRaExportThesis','flRaExportMulti','flRaExportVideo'];
const results=[];
function test(name,fn){fn();results.push(name)}
function make(){
 const all=[],handlers=new Map(),observers=[];
 let activeElement=null;
 function element(id='',tag='div',classes=''){
  const node={id,tagName:tag.toUpperCase(),className:classes,children:[],attributes:{},disabled:false,
   parentElement:null,style:{},width:0,height:0,handlers:new Map(),textContent:''};
  all.push(node);
  const cls=()=>new Set(node.className.split(/\s+/).filter(Boolean));
  node.classList={contains:x=>cls().has(x),add:x=>{let s=cls();s.add(x);node.className=[...s].join(' ')},
    remove:x=>{let s=cls();s.delete(x);node.className=[...s].join(' ')}};
  node.appendChild=child=>{if(child.parentElement){const a=child.parentElement.children;a.splice(a.indexOf(child),1)}
   node.children.push(child);child.parentElement=node;return child};
  node.setAttribute=(k,v)=>node.attributes[k]=String(v);
  node.closest=selector=>selector==='.fvViewport'?node.vp||null:selector==='.flRibbonAction'&&node.classList.contains('flRibbonAction')?node:null;
  node.focus=()=>{activeElement=node};
  node.addEventListener=(type,fn)=>{node.handlers.set(type,fn)};
  node.dispatch=(type,event)=>node.handlers.get(type)?.(event);
  return node
 }
 const html=element('html'),head=element('head'),body=element('body','body','appMode-data flRibbonReady');
 html.appendChild(head);html.appendChild(body);
 const panel=element('flRibbonPanel-export','div','flRibbonPanel active');body.appendChild(panel);
 const native={};
 for(const id of ids){const b=element(id,'button','flRibbonAction');panel.appendChild(b);native[id]=b}
 const format=element('fvVideoFormat','select');format.value='auto';body.appendChild(format);
 const seriesList=element('seriesList');body.appendChild(seriesList);
 const language=element('language');language.value='en';body.appendChild(language);
 const fv=element('fvCanvas','canvas');fv.width=100;fv.height=90;body.appendChild(fv);
 const viewport=element('fvViewport');fv.vp=viewport;body.appendChild(viewport);
 const document={body,head,documentElement:html,
  getElementById:id=>all.find(x=>x.id===id)||null,
  createElement:tag=>element('',tag),
  addEventListener:(n,fn)=>{const arr=handlers.get(n)||[];arr.push(fn);handlers.set(n,arr)}
 };
 class MutationObserver{constructor(fn){this.callback=fn;observers.push(this)}observe(el,opts){this.el=el;this.opts=opts}disconnect(){}}
 const window={
  FoamLensMultiPanelExport:{getSources:()=>state.fieldSources},
  FoamLensAnimationExport:{isExporting:()=>state.busy},
  FoamLensRegionScene:{physicalTime:x=>Number(x)}
 };
 const state={series:[],fieldSources:[],times:[],busy:false};
 class HTMLCanvasElement{}
 HTMLCanvasElement.prototype.captureStream=function(){};
 const sandbox={window,document,MutationObserver,HTMLCanvasElement,MediaRecorder:class{static isTypeSupported(){return true}},
  currentDataView:'timeseries',
  visibleCurrentSeries:()=>state.series,
  fvCurrentFieldGroup:()=>({times:state.times}),
  requestAnimationFrame:fn=>{fn();return 1},
  flUi:(en,es)=>language.value==='es'?es:en,
  console};
 vm.createContext(sandbox);vm.runInContext(source,sandbox);
 const api=window.FoamLensGranadaExport;assert(api);
 return{api,body,panel,native,handlers,document,window,html,state,sandbox,all,language,fv,viewport}
}
function changeMode(m,target){
 for(const c of ['appMode-data','appMode-analysis','appMode-field'])m.body.classList.remove(c);
 m.body.classList.add('appMode-'+target);m.api.refresh()
}
function setField(m,{range={valid:true,min:3,max:9},time=0,caseName='QuickCup',fieldName='T'}={}){
 m.state.fieldSources=[{key:'primary',type:'3d',canvasId:'fvCanvas',range,time,caseName,fieldName,dimensions:'[0 0 0 1 0 0 0]'}];
 m.state.times=[0,1,2];m.api.refresh()
}
test('six original Ribbon action objects keep native handlers/identities and remain blocked when empty',()=>{
 const m=make();
 assert.equal(m.api.inspect().plotSeries,0);
 for(const id of ids){
  assert.equal(m.document.getElementById(id),m.native[id]);
  assert.equal(m.native[id].disabled,true);
 }
 assert.equal(m.panel.children.filter(n=>n.id==='flG6Dock').length,1);
 assert.equal(m.api.audit().downloadConfirmed,false);
 assert.equal(m.api.audit().scientificValidity,'NOT CERTIFIED');
});
test('real numeric plot samples activate ONLY plot/thesis/multipanel; physical dimensions remain source-owned',()=>{
 const m=make();
 m.state.series=[{id:'s',caseName:'experiment',t:[0,1,2],y:[5,6,8],field:{dimensions:'[0 0 0 1 0 0 0]'}}];
 m.api.refresh();
 const p=m.api.inspect();assert.equal(p.plotSeries,1);
 assert.equal(p.cases,1);assert.equal(p.dimensions[0],'[0 0 0 1 0 0 0]');
 for(const id of ids.slice(0,5))assert.equal(m.native[id].disabled,false,id);
 assert.equal(m.native.flRaExportVideo.disabled,true);
 assert.match(m.document.getElementById('flG6Sources').textContent,/finite plot series: 1/);
 assert.match(m.document.getElementById('flG6Last').textContent,/No exports requested/);
});
test('null, empty, NaN and infinite placeholders never authorize scientific exports',()=>{
 const m=make();
 m.state.series=[{t:[null,1,2],y:[1,'',Infinity]},{t:[0],y:[NaN]}];
 m.api.refresh();
 assert.equal(m.api.inspect().plotSeries,0);
 assert.equal(m.native.flRaExportPng.disabled,true);
 assert.equal(m.native.flRaExportMulti.disabled,true);
 m.state.series=[{t:[0],y:[0]}];m.api.refresh();
 assert.equal(m.api.inspect().plotSeries,1,'actual original zero is valid data');
});
test('Field 3D requires a *real* case/field, actual time and finite measured range',()=>{
 const m=make();changeMode(m,'field');setField(m);
 assert.equal(m.api.inspect().fieldViews,1);
 assert.equal(m.native.flRaExportMulti.disabled,false);
 assert.equal(m.native.flRaExportVideo.disabled,false);
 assert.equal(m.native.flRaExportPng.disabled,true,'2D exporter not erroneously enabled by 3D data');
 setField(m,{caseName:''});assert.equal(m.api.inspect().fieldViews,0);
 setField(m,{fieldName:''});assert.equal(m.api.inspect().fieldViews,0);
 setField(m,{time:null});assert.equal(m.api.inspect().fieldViews,0);
 setField(m,{range:{valid:false,min:3,max:9}});assert.equal(m.api.inspect().fieldViews,0);
 setField(m,{range:{valid:true,min:NaN,max:10}});assert.equal(m.api.inspect().fieldViews,0);
 setField(m,{range:{valid:true,min:12,max:3}});assert.equal(m.api.inspect().fieldViews,0,'reversed physical range is not exportable');
 m.fv.width=0;setField(m);assert.equal(m.api.inspect().fieldViews,0);
});
test('video additionally requires physical timeline, runtime encoder and not already exporting',()=>{
 const m=make();changeMode(m,'field');setField(m);
 m.state.times=[];m.api.refresh();assert.equal(m.native.flRaExportVideo.disabled,true);
 m.state.times=[0];m.api.refresh();assert.equal(m.native.flRaExportVideo.disabled,false,'steady physical time zero is valid');
 m.state.busy=true;m.api.refresh();assert.equal(m.native.flRaExportVideo.disabled,true);
 m.state.busy=false;m.sandbox.MediaRecorder=undefined;m.api.refresh();assert.equal(m.native.flRaExportVideo.disabled,true);
 assert.equal(m.native.flRaExportMulti.disabled,false,'still-image export independent of encoder');
});
test('video codec follows original selected MP4/WebM format rather than generic MediaRecorder presence',()=>{
 const m=make();changeMode(m,'field');setField(m);
 const format=m.document.getElementById('fvVideoFormat');
 m.sandbox.MediaRecorder=class{static isTypeSupported(mime){return mime.startsWith('video/webm')}};
 format.value='mp4';m.api.refresh();
 assert.equal(m.native.flRaExportVideo.disabled,true,'selected unsupported MP4 must fail closed');
 format.value='webm';m.api.refresh();
 assert.equal(m.native.flRaExportVideo.disabled,false,'supported WebM is allowed');
});
test('guards are reversible when source disappears or Export ribbon tab closes',()=>{
 const m=make();m.state.series=[{t:[0],y:[1]}];m.api.refresh();
 assert.equal(m.native.flRaExportPng.disabled,false);
 m.state.series=[];m.api.refresh();assert.equal(m.native.flRaExportPng.disabled,true);
 m.panel.classList.remove('active');m.api.refresh();
 assert.equal(m.native.flRaExportPng.disabled,false,'do not leave unrelated ribbon navigation locked');
 m.panel.classList.add('active');m.api.refresh();assert.equal(m.native.flRaExportPng.disabled,true);
});
test('native disabled state is not overwritten if another module owned it',()=>{
 const m=make();m.panel.classList.remove('active');m.api.refresh();
 m.native.flRaExportPng.disabled=true; m.panel.classList.add('active');
 m.state.series=[{t:[0],y:[1]}];m.api.refresh();
 assert.equal(m.native.flRaExportPng.disabled,true,'foreign disabled state survives');
 m.panel.classList.remove('active');m.api.refresh();
 assert.equal(m.native.flRaExportPng.disabled,true,'foreign disabled state survives unlock');
});
test('bilingual source status and request audit never claim download success',()=>{
 const m=make();m.state.series=[{t:[0],y:[1]}];m.api.refresh();
 m.language.value='es';for(const fn of m.handlers.get('foamlens-language-change')||[])fn();
 assert.match(m.document.getElementById('flG6Heading').textContent,/Exportación/);
 m.native.flRaExportCsv.dispatch('click',{target:m.native.flRaExportCsv});
 // The original Ribbon listener stops event propagation, so G6 must observe
 // requests directly on the original element, NOT from document bubbling.
 assert.equal(m.api.audit().lastRequested,'flRaExportCsv');
 assert.equal(m.api.audit().downloadConfirmed,false);
 assert.match(m.document.getElementById('flG6Last').textContent,/no verificada/);
});
test('original scientific exporters and CSS visibility contract remain untouched',()=>{
 for(const id of ids)assert(ribbon.includes("flRibbonBind('"+id+"'"));
 assert(multi.includes('getSources:meSources'));
 assert(video.includes('descriptorList:vaDescriptorList'));
 assert(source.includes('disabledByG6'));
 assert(!source.includes('exportPNG()')&&!source.includes('vaExport()'));
 assert(!source.includes('series.push(')&&!source.includes('fvLoadFrame('));
 assert(!source.includes('downloadText(')&&!source.includes('URL.createObjectURL'));
 assert(source.includes('flRibbonPanel-export.active'));
});
console.log('Granada G6: '+results.length+' source-native export regression groups PASS');
for(const name of results)console.log('  ✓ '+name);
