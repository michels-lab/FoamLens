'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const index=fs.readFileSync(path.join(__dirname,'..','src','FoamLensDesktop','frontend','index.html'),'utf8');
const begin='/* FOAMLENS_INCREMENTAL_TEMPORAL_CORE_START */',end='/* FOAMLENS_INCREMENTAL_TEMPORAL_CORE_END */';
const a=index.indexOf(begin),b=index.indexOf(end,a);
assert(a>=0&&b>a,'Incremental temporal parser core markers missing.');
const core=index.slice(a,b+end.length);

function tokenize(line){
  const out=[];let i=0;
  while(i<line.length){
    while(i<line.length&&/\s/.test(line[i]))i++;
    if(i>=line.length)break;
    if(line[i]==='('){
      let j=i+1,depth=1;
      while(j<line.length&&depth){if(line[j]==='(')depth++;if(line[j]===')')depth--;j++}
      out.push(line.slice(i,j));i=j
    }else{let j=i;while(j<line.length&&!/\s/.test(line[j]))j++;out.push(line.slice(i,j));i=j}
  }
  return out
}
function parseParen(s){return(s.match(/[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?/g)||[]).map(Number)}

const api=new Function('tokenize','parseParen',core+'\nreturn {FL_TEMPORAL_NATIVE_THRESHOLD,FL_TEMPORAL_CHUNK_SIZE,flTemporalParseState,flParseTemporalLine,flConsumeTemporalChunk,flCaptureTemporalHead};')(tokenize,parseParen);
const passed=[];function test(name,fn){fn();passed.push(name)}

test('chunk boundary inside scalar row preserves one complete row',()=>{
  const st=api.flTemporalParseState();
  api.flConsumeTemporalChunk(st,'# Probe 0 (0 0 0)\n0.0 10\n0.5 ',false);
  api.flConsumeTemporalChunk(st,'20\n1.0 30\n',false);
  if(st.carry)api.flParseTemporalLine(st.carry,st);
  assert.deepStrictEqual(st.columns[0].t,[0,.5,1]);
  assert.deepStrictEqual(st.columns[0].y,[10,20,30]);
  assert.strictEqual(st.probes[0],'(0 0 0)');
});

test('chunk boundary inside vector token preserves magnitude',()=>{
  const st=api.flTemporalParseState();
  api.flConsumeTemporalChunk(st,'0 (3 4',false);
  api.flConsumeTemporalChunk(st,' 0)\n1 (0 0 5)\n',false);
  if(st.carry)api.flParseTemporalLine(st.carry,st);
  assert.deepStrictEqual(st.columns[0].t,[0,1]);
  assert.deepStrictEqual(st.columns[0].y,[5,5]);
});

test('multiple columns are accumulated directly without row matrix',()=>{
  const st=api.flTemporalParseState();
  api.flConsumeTemporalChunk(st,'0 1 2\n1 3 4\n2 5\n',false);
  if(st.carry)api.flParseTemporalLine(st.carry,st);
  assert.deepStrictEqual(st.columns[0].y,[1,3,5]);
  assert.deepStrictEqual(st.columns[1].y,[2,4]);
  assert(!('rows' in st));
});

test('classification head is bounded',()=>{
  const st=api.flTemporalParseState();
  api.flCaptureTemporalHead(st,'x'.repeat(200000));
  api.flCaptureTemporalHead(st,'y'.repeat(200000));
  assert(st.head.length<=128*1024);
});

test('Desktop large-file threshold and chunks are bounded',()=>{
  assert.strictEqual(api.FL_TEMPORAL_NATIVE_THRESHOLD,4*1024*1024);
  assert.strictEqual(api.FL_TEMPORAL_CHUNK_SIZE,1024*1024);
  assert(api.FL_TEMPORAL_CHUNK_SIZE<=4*1024*1024);
});

test('large Desktop path prefers cancellable native streaming with JS chunk fallback',()=>{
  const start=index.indexOf('async function flReadTemporalColumns(file){');
  const end=index.indexOf('async function parseFile(file){',start);
  const body=index.slice(start,end);
  assert(body.includes("FOAMLENS_NATIVE&&file?._nativeToken"));
  assert(body.includes("foamLensNativeOperation('parseTemporalFile'"));
  assert(body.includes('foamLensActiveTemporalRequests.add(op.requestId)'));
  assert(body.includes('await file.slice(offset,end).text()'));
  assert(body.includes('const text=await file.text()'));
  assert(body.includes('nativeStreaming:true'));
});

test('native temporal streaming reports byte progress and can be cancelled',()=>{
  assert(index.includes("m.type==='operationProgress'||m.type==='operationStart'||m.type==='operationComplete'||m.type==='operationCancelled'"));
  assert(index.includes('function cancelActiveTemporalReads()'));
  assert(index.includes("foamLensNativeRequest('cancelOperation',{targetRequestId:requestId})"));
  assert(index.includes("updateAppActivity(diagEs()?'Leyendo archivo temporal grande':'Reading large temporal file'"));
  assert(index.includes('function cancelActiveDataReads(){cancelActiveTemporalReads();cancelActiveFieldReads()}'));
  assert(index.includes("$('scanCancel')?.addEventListener('click',()=>{cancelActiveDataReads();"));
});

test('parseFile records whether loading was incremental',()=>{
  const start=index.indexOf('async function parseFile(file){');
  const end=index.indexOf('function inferProfileField',start);
  const body=index.slice(start,end);
  assert(body.includes('loadMeta:{incremental:parsed.incremental,nativeStreaming:parsed.nativeStreaming===true'));
  assert(!body.includes('rows=[]'));
});

test('incremental parser remains fixture agnostic',()=>{
  for(const banned of ['QuickCup','B3_reference','B6_adaptiveDt','C6_adaptiveDt'])assert(!core.includes(banned),'Fixture leaked into parser core: '+banned);
});

console.log('Incremental temporal parser regression suite passed: '+passed.length+' checks.');
for(const name of passed)console.log('  ✓ '+name);
