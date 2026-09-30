'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const root=path.join(__dirname,'..');
const program=fs.readFileSync(path.join(root,'src','FoamLensDesktop','Program.cs'),'utf8');
const index=fs.readFileSync(path.join(root,'src','FoamLensDesktop','frontend','index.html'),'utf8');

const passed=[];function test(name,fn){fn();passed.push(name)}

test('native bridge exposes cancellable OpenFOAM field parser',()=>{
  assert(program.includes('case "parseOpenFOAMField":'));
  assert(program.includes('HandleOpenFoamFieldAsync(root, requestId)'));
  assert(program.includes('BeginOperation(requestId)'));
  assert(program.includes('operation = "openFoamField"'));
  assert(program.includes('CancellationToken ct'));
  assert(program.includes('ReadLineAsync(ct)'));
});

test('native field parsing runs off the WinForms UI thread',()=>{
  const start=program.indexOf('private async Task HandleOpenFoamFieldAsync');
  const end=program.indexOf('private async Task HandleOpenFoamMeshAsync',start)>start
    ? program.indexOf('private async Task HandleOpenFoamMeshAsync',start)
    : program.indexOf('private async Task<OpenFoamFieldParseResult> ParseOpenFoamFieldAsync',start);
  const body=program.slice(start,end>start?end:start+12000);
  assert(body.includes('await Task.Run(async () =>'),'OpenFOAM field parse is not dispatched to a worker.');
  assert(body.includes('ConfigureAwait(false)'),'Worker-side field parsing does not avoid UI-context continuation.');
  assert(body.includes('operation.Token'),'Worker parse lost cancellation.');
});

test('native field parser streams instead of ReadAllText',()=>{
  const start=program.indexOf('private async Task<OpenFoamFieldParseResult> ParseOpenFoamFieldAsync');
  const end=program.indexOf('private static string? FoamHeaderValue',start);
  const body=program.slice(start,end);
  assert(body.includes('new FileStream('));
  assert(body.includes('new StreamReader('));
  assert(!body.includes('ReadAllText'));
});

test('native parser stops at declaredCount or list close',()=>{
  assert(program.includes('parsedCount >= declaredCount.Value'));
  assert(program.includes('|| closed'));
  assert(program.includes('RemoveRange(declaredCount.Value'));
});

test('uniform primitive fields and binary formats have explicit paths',()=>{
  assert(program.includes('OpenFoamFieldParseResult.FromUniformScalar'));
  assert(program.includes('OpenFoamFieldParseResult.FromUniformComponents'));
  for(const kind of ['tensor','symmTensor','sphericalTensor'])assert(program.includes('"'+kind+'"'),'Missing native kind '+kind);
  assert(program.includes('OpenFoamFieldComponentCount'));
  assert(program.includes('ComponentValues'));
  assert(program.includes('"binary-format"'));
  assert(program.includes('"unsupported-field-class"'));
});

test('Desktop routes every native-backed field through the native parser before JS fallback',()=>{
  const start=index.indexOf('async function pmLoadRecord(record){');
  const end=index.indexOf('async function pmLoadFieldSet',start);
  const body=index.slice(start,end);
  assert(body.includes("nativeReadable=!!(FOAMLENS_NATIVE&&record.file?._nativeToken)"));
  assert(body.includes('if(nativeReadable){'));
  assert(body.includes('await pmParseNativeOpenFOAMField(record.file,record.sourcePath)'));
  assert(body.includes('sourceSize>PM_FIELD_NATIVE_THRESHOLD'));
  assert(body.includes('await pmParseLargeOpenFOAMField(record.file,record.sourcePath)'));
  assert(body.includes('Native OpenFOAM field parser failed; falling back'));
  assert(!/nativeReadable=.*PM_FIELD_NATIVE_THRESHOLD/.test(body),'Native routing regressed to a size-gated parser.');
});

test('native field payload maps to existing JS parsed-field model',()=>{
  const start=index.indexOf('async function pmParseNativeOpenFOAMField');
  const end=index.indexOf('async function pmParseLargeOpenFOAMField',start);
  const body=index.slice(start,end);
  for(const token of ['supported:!!data?.supported','fieldClass:String(data?.fieldClass','uniformValue','vectorValues','scalarValues','componentValues','componentCount','declaredCount:','nativeStreaming:true'])assert(body.includes(token),'Missing mapped token '+token);
});

function extractFunction(name){
  const start=index.indexOf('function '+name+'(');assert(start>=0,'Missing function '+name);
  let open=index.indexOf('{',start),depth=0,quote='',escaped=false;
  for(let i=open;i<index.length;i++){
    const ch=index[i];
    if(quote){if(escaped){escaped=false;continue}if(ch==='\\'){escaped=true;continue}if(ch===quote)quote='';continue}
    if(ch==="'"||ch==='"'||ch==='`'){quote=ch;continue}
    if(ch==='{')depth++;else if(ch==='}'&&--depth===0)return index.slice(start,i+1)
  }
  throw new Error('Unclosed function '+name)
}
const parserFactory=new Function(extractFunction('pmFieldKindFromClass')+';'+extractFunction('pmFieldComponentCount')+';'+extractFunction('pmParseComponentTuple')+';'+extractFunction('pmParseOpenFOAMFieldText')+';return pmParseOpenFOAMFieldText;');
const parseField=parserFactory();
function foamField(cls,internal){return `FoamFile
{
 format ascii;
 class ${cls};
 object test;
}
dimensions [0 0 0 0 0 0 0];
internalField ${internal};
boundaryField {}
`}

test('ASCII tensor, symmTensor and sphericalTensor payloads parse generically',()=>{
  const tensor=parseField(foamField('volTensorField','nonuniform List<tensor> 2\n(\n(1 2 3 4 5 6 7 8 9)\n(9 8 7 6 5 4 3 2 1)\n)'), '0/test');
  assert.equal(tensor.supported,true);assert.equal(tensor.kind,'tensor');assert.equal(tensor.componentCount,9);assert.deepEqual(tensor.values[0],[1,2,3,4,5,6,7,8,9]);
  const symm=parseField(foamField('volSymmTensorField','uniform (1 2 3 4 5 6)'), '0/test');
  assert.equal(symm.supported,true);assert.equal(symm.kind,'symmTensor');assert.deepEqual(symm.uniformValue,[1,2,3,4,5,6]);
  const spherical=parseField(foamField('volSphericalTensorField','nonuniform List<sphericalTensor> 2\n(\n(4)\n(5)\n)'), '0/test');
  assert.equal(spherical.supported,true);assert.equal(spherical.kind,'sphericalTensor');assert.deepEqual(spherical.values,[[4],[5]]);
});

test('binary tensor payloads remain explicitly unsupported',()=>{
  const src=foamField('volTensorField','uniform (1 0 0 0 1 0 0 0 1)').replace('format ascii','format binary');
  const out=parseField(src,'0/test');assert.equal(out.supported,false);assert.equal(out.reason,'binary-format');assert.equal(out.kind,'tensor');
});

test('activity toast exposes user-visible cancellation only for active long reads',()=>{
  assert(index.includes('id="activityCancel"'));
  assert(index.includes('function setActivityCancelVisible(visible)'));
  assert(index.includes('foamLensActiveFieldRequests.add(op.requestId);setActivityCancelVisible(true)'));
  assert(index.includes('cancelActiveDataReads()'));
  assert(index.includes("Cancelling operation…"));
  assert(index.includes("Cancelando operación…"));
});

test('native replies isolate and clean both temporal and field operations',()=>{
  assert(index.includes('foamLensActiveTemporalRequests.delete(requestId)'));
  assert(index.includes('foamLensActiveFieldRequests.delete(requestId)'));
  assert(index.includes('!foamLensActiveTemporalRequests.size&&!foamLensActiveFieldRequests.size'));
});

test('OpenFOAM field streaming remains read-only',()=>{
  const start=program.indexOf('private async Task<OpenFoamFieldParseResult> ParseOpenFoamFieldAsync');
  const end=program.indexOf('private static string? FoamHeaderValue',start);
  const body=program.slice(start,end);
  assert(body.includes('FileAccess.Read'));
  assert(!/FileAccess\.Write|WriteAll|Delete\(|Move\(/.test(body));
});

console.log('Native OpenFOAM field streaming regression suite passed: '+passed.length+' checks.');
for(const name of passed)console.log('  ✓ '+name);
