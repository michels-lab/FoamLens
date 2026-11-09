'use strict';
// Runtime contract for the native CAD -> WSL surfaceCheck action. The test
// exercises the production request/response UI (never a fake scientific run).
const fs=require('fs'),path=require('path'),assert=require('assert');
const dir=path.join(__dirname,'..','src','FoamLensDesktop');
const cad=fs.readFileSync(path.join(dir,'frontend','v24-cad-surface-inspector.js'),'utf8');
const native=fs.readFileSync(path.join(dir,'NativeCadSurfaceCheck.cs'),'utf8');
const host=fs.readFileSync(path.join(dir,'Program.cs'),'utf8');
new Function(cad);
const start=cad.indexOf('/* FOAMLENS_CAD_CORE_START */');
const stop=cad.indexOf('/* FOAMLENS_CAD_CORE_END */',start);
assert(start>=0&&stop>start);
const {parseObj,summary,binary}=new Function(cad.slice(start,stop)+
 ';return {parseObj:cgParseObj,summary:cgSummary,binary:cgBinaryStl}')();
const obj=parseObj([
 'v 0 0 0','v 1000 0 0','v 0 1000 0',
 'g metal','f 1 2 3'
].join('\n'),'metal.obj');
const part='metal',sum=summary(obj.triangles);
const model={name:'metal.obj',format:'obj-surface',triangles:obj.triangles,unit:'mm',
 visible:true,partsVisible:new Map([[part,true]]),
 partSummaries:new Map([[part,sum]])};
const uiStart=cad.indexOf('let cgNativeCheckBusy='),uiEnd=cad.indexOf('function cgExportVisibleBatch(){',uiStart);
assert(uiStart>stop&&uiEnd>uiStart,'native CAD actions must be source-owned');
const source=cad.slice(uiStart,uiEnd);
const create=(mode='success',bridgeEnabled=true)=>{
 const listeners=new Set(),messages=[],status=[],downloads=[];
 const webview=bridgeEnabled?{
  addEventListener(name,fn){assert.strictEqual(name,'message');listeners.add(fn)},
  removeEventListener(name,fn){assert.strictEqual(name,'message');listeners.delete(fn)},
  postMessage(message){
   messages.push(message);
   if(message.type==='runCadSurfaceCheck'&&mode!=='silent'){
    Promise.resolve().then(()=>{
     const output=mode==='error'?
      {type:'nativeReply',requestId:message.requestId,ok:false,error:'No WSL default distribution'}:
      {type:'nativeReply',requestId:message.requestId,ok:true,data:{
        utility:'surfaceCheck -checkSelfIntersection',runner:'Default WSL distribution',
        executed:true,exitCode:0,triangleCount:1,
        stdout:'Statistics: 1 triangle\nSurface does not have any illegal triangles',
        stderr:'',outputTruncated:false,openFoamCaseMutated:false
      }};
     for(const fn of [...listeners])fn({data:output})
    })
   }
  }
 }:null;
 const elements=new Map([
  ['cgPart',{value:'0|metal'}],
  ['cgSurfaceCheckRun',{disabled:true,title:''}],
  ['cgSurfaceCheckCancel',{disabled:true}],
  ['cgSurfaceCheckExport',{disabled:true}],
  ['cgSurfaceCheckOutput',{textContent:''}]
 ]);
 const models=[{...model,partsVisible:new Map(model.partsVisible),
   partSummaries:new Map(model.partSummaries)}];
 const window={chrome:bridgeEnabled?{webview}:undefined};
 const mockDocument={getElementById:id=>elements.get(id)||null};
 const api=new Function('window','document','cgModels','cgUnitScale','cgBinaryStl',
    'cgUi','cgShow','cgDownload','btoa','setTimeout','clearTimeout',source+
    ';return {cgNativeCheckAvailable,cgNativeSelectedSurface,cgRefreshNativeCheck,'+
    'cgNativeSurfaceCheckRequest,cgRunNativeSurfaceCheck,cgExportNativeCheckReport}')(
    window,mockDocument,models,u=>({mm:.001,m:1,cm:.01,in:.0254})[u]||null,
    binary,(en)=>en,t=>status.push(t),(name,content)=>downloads.push({name,content}),
    text=>Buffer.from(text,'binary').toString('base64'),setTimeout,clearTimeout);
 return {api,elements,models,messages,status,downloads,listeners}
};
(async()=>{
 const a=create();
 a.api.cgRefreshNativeCheck();
 assert.strictEqual(a.elements.get('cgSurfaceCheckRun').disabled,false);
 assert.strictEqual(a.elements.get('cgSurfaceCheckCancel').disabled,true);
 assert.strictEqual(a.api.cgNativeSelectedSurface(false).triangles,1);
 await a.api.cgRunNativeSurfaceCheck();
 const requests=a.messages.filter(m=>m.type==='runCadSurfaceCheck');
 assert.strictEqual(requests.length,1,'native CAD must submit an explicit request');
 assert(!('command' in requests[0])&&!('path' in requests[0]),
   'browser may send ONLY bounded STL, never shell or source path');
 const data=Buffer.from(requests[0].stlBase64,'base64');
 assert.strictEqual(data.length,134);
 assert.strictEqual(data.readUInt32LE(80),1);
 assert.strictEqual(a.elements.get('cgSurfaceCheckRun').disabled,false);
 assert.strictEqual(a.elements.get('cgSurfaceCheckCancel').disabled,true);
 assert.strictEqual(a.elements.get('cgSurfaceCheckExport').disabled,false);
 assert.match(a.elements.get('cgSurfaceCheckOutput').textContent,/Statistics: 1 triangle/);
 a.api.cgExportNativeCheckReport();
 assert.strictEqual(a.downloads.length,1);
 const exported=JSON.parse(a.downloads[0].content);
 assert.strictEqual(exported.sourceFile,'metal.obj');
 assert.strictEqual(exported.sourceUnitConfirmedByUser,'mm');
 assert.strictEqual(exported.native.exitCode,0);
 assert.strictEqual(exported.openFoamCaseMutated,false);
 assert.strictEqual(a.listeners.size,0,'native response listener must be cleaned up');
 assert.strictEqual(a.models[0].unit,'mm','native check never mutates CAD source units');

 const rejected=create('error');await rejected.api.cgRunNativeSurfaceCheck();
 assert.match(rejected.elements.get('cgSurfaceCheckOutput').textContent,/No WSL default/);
 assert.strictEqual(rejected.elements.get('cgSurfaceCheckExport').disabled,true);
 assert.strictEqual(rejected.listeners.size,0);
 const unsupported=create('success',false);unsupported.api.cgRefreshNativeCheck();
 assert.strictEqual(unsupported.elements.get('cgSurfaceCheckRun').disabled,true);
 await unsupported.api.cgRunNativeSurfaceCheck();
 assert.match(unsupported.elements.get('cgSurfaceCheckOutput').textContent,/WebView2/);
 assert.strictEqual(unsupported.elements.get('cgSurfaceCheckExport').disabled,true);

 const tooLarge=create();
 tooLarge.models[0].partSummaries.get('metal').triangles=85000;
 tooLarge.api.cgRefreshNativeCheck();
 assert.strictEqual(tooLarge.elements.get('cgSurfaceCheckRun').disabled,true,
   '4 MiB native bridge cap must be enforced before allocating STL');
 const unknownUnit=create();
 unknownUnit.models[0].unit='unknown';unknownUnit.api.cgRefreshNativeCheck();
 assert.strictEqual(unknownUnit.elements.get('cgSurfaceCheckRun').disabled,true,
   'unknown physical units cannot be checked by native utility');

 const cancel=create('silent');
 const deferred=cancel.api.cgNativeSurfaceCheckRequest(binary(obj.triangles,.001,'metal'));
 deferred.cancel();
 assert(cancel.messages.some(m=>m.type==='cancelOperation'&&
   m.targetRequestId===cancel.messages.find(x=>x.type==='runCadSurfaceCheck').requestId));
 const nativeMessage=cancel.messages.find(x=>x.type==='runCadSurfaceCheck');
 for(const listener of [...cancel.listeners])
   listener({data:{type:'nativeReply',requestId:nativeMessage.requestId,ok:false,
     error:'CAD surfaceCheck cancelled.'}});
 await assert.rejects(deferred.promise,/cancelled/);
 assert.strictEqual(cancel.listeners.size,0);

 assert(host.includes('case "runCadSurfaceCheck":'));
 assert(host.includes('NativeCadSurfaceCheck.RunAsync(data, operation.Token)'));
 assert(host.includes('case "cancelOperation":'));
 assert(native.includes('surfaceCheck -checkSelfIntersection \\"$1\\"')||
   native.includes('surfaceCheck -checkSelfIntersection \"$1\"'));
 assert(native.includes('ValidateBinaryStl(data)'));
 assert(native.includes('MaxStlBytes = 4 * 1024 * 1024'));
 assert(native.includes('Path.GetTempPath()'));
 assert(native.includes('Directory.Delete(directory, recursive: true)'));
 assert(native.includes('start.ArgumentList.Add(arg)'));
 assert(native.includes('--exec'));
 assert(!native.includes('argumentsFromBrowser'));
 console.log('CAD native surfaceCheck PASS: real UI request, metric unit scaling, cancellation, native report, error/size/bridge gates');
})().catch(e=>{console.error(e);process.exitCode=1});
