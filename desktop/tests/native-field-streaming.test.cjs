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

test('uniform scalar/vector and binary formats have early paths',()=>{
  assert(program.includes('OpenFoamFieldParseResult.UniformScalar'));
  assert(program.includes('OpenFoamFieldParseResult.UniformVector'));
  assert(program.includes('"binary-format"'));
  assert(program.includes('"unsupported-field-class"'));
});

test('frontend prefers native streaming for large fields and retains JS fallback',()=>{
  const start=index.indexOf('async function pmLoadRecord(record){');
  const end=index.indexOf('async function pmLoadFieldSet',start);
  const body=index.slice(start,end);
  assert(body.includes('await pmParseNativeOpenFOAMField(record.file,record.sourcePath)'));
  assert(body.includes('await pmParseLargeOpenFOAMField(record.file,record.sourcePath)'));
  assert(body.includes('Native OpenFOAM field parser failed; falling back'));
});

test('native field payload maps to existing JS parsed-field model',()=>{
  const start=index.indexOf('async function pmParseNativeOpenFOAMField');
  const end=index.indexOf('async function pmParseLargeOpenFOAMField',start);
  const body=index.slice(start,end);
  for(const token of ['supported:!!data?.supported','fieldClass:String(data?.fieldClass','uniformValue:','vectorValues','scalarValues','declaredCount:','nativeStreaming:true'])assert(body.includes(token),'Missing mapped token '+token);
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
