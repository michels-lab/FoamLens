'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.join(__dirname,'..','src','FoamLensDesktop');
const js=fs.readFileSync(path.join(root,'frontend','v24-cad-surface-inspector.js'),'utf8');
const host=fs.readFileSync(path.join(root,'Program.cs'),'utf8');
const native=fs.readFileSync(path.join(root,'NativeCadOcctConverter.cs'),'utf8');
new Function(js);
const cstart=js.indexOf('/* FOAMLENS_CAD_CORE_START */');
const cend=js.indexOf('/* FOAMLENS_CAD_CORE_END */',cstart);
const core=new Function(js.slice(cstart,cend)+
 ';return {parseObj:cgParseObj,parseStl:cgParseStl,binary:cgBinaryStl,summary:cgSummary}')();
const parsed=core.parseObj('v 0 0 0\nv 50 0 0\nv 0 100 0\ng solid_001\nf 1 2 3','fixture.obj');
const stl=core.binary(parsed.triangles,1,'solid_001');
const stlEncoded=Buffer.from(stl).toString('base64');
function response(overrides={}){
 return {schema:'foamlens/native-occt-conversion/1',engine:'FreeCAD/OpenCascade',
  format:'step',coordinateUnit:'mm',sourceUnitsVerified:false,
  originalObjectLabelsPreserved:false,openFoamCaseMutated:false,converted:true,
  deflectionMm:0.5,totalTriangles:2,
  regions:[
   {name:'solid_001',triangles:1,sizeBytes:stl.length,boundsMm:[50,100,0],
    surfaceAreaMm2:2500,stlBase64:stlEncoded},
   {name:'solid_002',triangles:1,sizeBytes:stl.length,boundsMm:[50,100,0],
    surfaceAreaMm2:2500,stlBase64:stlEncoded}
  ],...overrides}
}
const start=js.indexOf('function cgPrepareSurface(');
const end=js.indexOf('function cgExport(){',start);
assert(start>0&&end>start);
const component=js.slice(start,end);
function makeHarness({mode='valid',report=response(),fileExt='step',fileSize=100,deferRead=false}={}){
 const models=[],messages=[],notes=[],listeners=new Set();
 const name='assembly.'+fileExt;
 let releaseRead=null;
 const file={name,size:fileSize,
  async arrayBuffer(){if(deferRead)await new Promise(resolve=>{releaseRead=resolve});
   const data=new Uint8Array(100);
   data.set(Buffer.from('ISO-10303-21;'));return data.buffer}
 };
 const elements=new Map([
  ['cgFiles',{files:[file],value:'selected'}],
  ['cgImport',{disabled:false}],
  ['cgCadCancelImport',{disabled:true}],
  ['cgCadDeflection',{value:'0.5'}]
 ]);
 const doc={getElementById:id=>elements.get(id)||null};
 const webview={
  addEventListener(type,fn){assert.equal(type,'message');listeners.add(fn)},
  removeEventListener(type,fn){assert.equal(type,'message');listeners.delete(fn)},
  postMessage(msg){
   messages.push(msg);
   if(msg.type==='convertCadBrep'&&mode!=='silent'){
    Promise.resolve().then(()=>{
     const result=mode==='error'?
       {type:'nativeReply',requestId:msg.requestId,ok:false,error:'FreeCADCmd unavailable in WSL'}:
       {type:'nativeReply',requestId:msg.requestId,ok:true,data:report};
     for(const fn of [...listeners])fn({data:result})
    })
   }
   if(msg.type==='cancelOperation'){
    const original=messages.find(x=>x.type==='convertCadBrep');
    Promise.resolve().then(()=>{
     for(const fn of [...listeners])
       fn({data:{type:'nativeReply',requestId:original.requestId,
         ok:false,error:'CAD OCCT conversion cancelled.'}})
    })
   }
  }
 };
 const win={chrome:{webview}};
 const injector=new Function(
  'cgModels','document','window','cgSummary','cgParseStl','cgParseObj',
  'cgBinaryStl','cgRestoreRegionBatch','cgUnitScale','cgRenderInventory',
  'cgShow','cgUi','btoa','atob','setTimeout','clearTimeout',
  'const cgNativeCheckAvailable=()=>!!window.chrome?.webview?.postMessage;'+
  component+';return {cgBrepModels,cgBrepRequest,cgBrepDecoded,cgBrepRegionTriangleCountOk,cgImport,cgCancelBrepImport,'+
    'cgImportState:()=>cgBrepImportBusy}');
 const api=injector(models,doc,win,core.summary,core.parseStl,core.parseObj,core.binary,
   ()=>{throw Error('Unrelated ZIP import');},
   unit=>({m:1,mm:.001,cm:.01,in:.0254})[unit]||null,()=>{},
   s=>notes.push(String(s)),en=>en,
   raw=>Buffer.from(raw,'binary').toString('base64'),
   b64=>Buffer.from(b64,'base64').toString('binary'),
   setTimeout,clearTimeout);
 return {api,models,messages,notes,listeners,elements,webview,
  releaseRead:()=>{if(releaseRead)releaseRead();else throw Error('read was not pending')}}
}
(async()=>{
 const x=makeHarness();
 // Regression: native OCCT permits 300k triangles in a single region;
 // the previous browser guard silently rejected everything above 200k.
 for(const valid of [1,200000,200001,250000,300000])
  assert.equal(x.api.cgBrepRegionTriangleCountOk(valid),true,
   'Native-valid per-solid triangle count must remain previewable: '+valid);
 for(const invalid of [-1,0,300001,300002,NaN,Infinity,1.1,'300000',null])
  assert.equal(x.api.cgBrepRegionTriangleCountOk(invalid),false,
   'Invalid source count must be rejected without coercion: '+invalid);
 assert(native.includes('private const int MaxTriangles = 300000'),
  'JavaScript per-region limit must match native C# hard cap');
 await x.api.cgImport();
 assert.equal(x.models.length,2,'real native OCCT data populates original CAD inventory');
 assert.equal(x.models[0].triangles.length,1);
 assert.deepEqual(x.models.map(m=>[...m.partsVisible.keys()]),[['solid_001'],['solid_002']]);
 assert.deepEqual(x.models.map(m=>m.unit),['unknown','unknown'],
   'FreeCAD internal millimeters are not silently marked as independently confirmed source units');
 assert.equal(x.models[0].sourceProvenance.engine,'FreeCAD/OpenCascade');
 assert.equal(x.models[0].sourceProvenance.freecadInternalUnit,'mm');
 assert.equal(x.models[0].sourceProvenance.sourceUnitsVerified,false);
 assert.equal(x.models[0].sourceProvenance.originalObjectLabelsPreserved,false);
 assert.equal(x.models[0].summary.bounds.size[0],50);
 assert(x.models[0].warnings.some(s=>s.includes('confirm mm')));
 assert.equal(x.models[0].visible,true);
 assert.equal(x.elements.get('cgFiles').value,'');
 assert.equal(x.elements.get('cgImport').disabled,false);
 assert.equal(x.elements.get('cgCadCancelImport').disabled,true);
 const requests=x.messages.filter(m=>m.type==='convertCadBrep');
 assert.equal(requests.length,1);
 assert.equal(requests[0].format,'step');
 assert.equal(requests[0].deflectionMm,.5);
 assert(!('path' in requests[0])&&!('script' in requests[0])&&!('command' in requests[0]),
  'web bridge never receives native shell or source paths');
 assert.equal(Buffer.from(requests[0].cadBase64,'base64').length,100);
 assert.equal(x.listeners.size,0);

 const rejected=makeHarness({report:response({totalTriangles:999})});
 await rejected.api.cgImport();
 assert.equal(rejected.models.length,0,'bad total rejects ENTIRE assembly atomically');
 assert(rejected.notes.some(n=>n.includes('triangle count')));
 const fake=makeHarness({report:response({engine:'FakeCAD'})});
 await fake.api.cgImport();
 assert.equal(fake.models.length,0,'untrusted CAD engine cannot masquerade as OCCT');
 const absent=makeHarness({mode:'error'});
 await absent.api.cgImport();
 assert.equal(absent.models.length,0);
 assert(absent.notes.some(n=>n.includes('FreeCADCmd unavailable')));
 const iges=makeHarness({fileExt:'igs',report:response({format:'iges'})});
 await iges.api.cgImport();
 assert.equal(iges.models.length,2);
 assert.equal(iges.messages[0].format,'iges');
 const oversized=makeHarness({fileSize:16*1024*1024+1});
 await oversized.api.cgImport();
 assert.equal(oversized.models.length,0);
 assert(!oversized.messages.some(m=>m.type==='convertCadBrep'),
  'oversized CAD source must be rejected before native conversion');

 const cancelled=makeHarness({mode:'silent'});
 const pending=cancelled.api.cgImport();
 // File.arrayBuffer and the promise for native request are async.
 for(let n=0;n<10&&!cancelled.messages.some(m=>m.type==='convertCadBrep');n++)
  await Promise.resolve();
 assert(cancelled.messages.some(m=>m.type==='convertCadBrep'));
 cancelled.api.cgCancelBrepImport();
 await pending;
 assert.equal(cancelled.models.length,0,'cancelled result must never be added');
 assert(cancelled.messages.some(m=>m.type==='cancelOperation'));
 assert.equal(cancelled.listeners.size,0);
 assert.equal(cancelled.elements.get('cgImport').disabled,false);
 const canceledDuringRead=makeHarness({deferRead:true});
 const reading=canceledDuringRead.api.cgImport();
 canceledDuringRead.api.cgCancelBrepImport();
 canceledDuringRead.releaseRead();
 await reading;
 assert.equal(canceledDuringRead.models.length,0,
  'cancel during file read must never add any geometry');
 assert(!canceledDuringRead.messages.some(m=>m.type==='convertCadBrep'),
  'cancel during file read must not start the native CAD process');
 assert.equal(canceledDuringRead.elements.get('cgImport').disabled,false);

 assert(host.includes('case "convertCadBrep":'));
 assert(host.includes('NativeCadOcctConverter.ConvertAsync('));
 assert(native.includes('ValidateInput(format, input, deflectionMm)'));
 assert(native.includes('ProcessStartInfo(executable)'));
 assert(native.includes('NativeCadOcctFreecad.py'));
 assert(native.includes('Directory.Delete(directory, recursive: true)'));
 assert(js.includes('id="cgCadDeflection"'));
 assert(js.includes('id="cgCadCancelImport"'));
 assert(js.includes('model.unit=\'unknown\''));
 console.log('CAD OCCT native browser PASS: valid real-engine result, per-solid parts, unconfirmed mm, fail-closed, cancellation and size gates');
})().catch(e=>{console.error(e);process.exitCode=1});
