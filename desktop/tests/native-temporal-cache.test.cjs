'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const program=fs.readFileSync(path.join(__dirname,'..','src','FoamLensDesktop','Program.cs'),'utf8');
const cache=fs.readFileSync(path.join(__dirname,'..','src','FoamLensDesktop','TemporalScientificCache.cs'),'utf8');
const project=fs.readFileSync(path.join(__dirname,'..','src','FoamLensDesktop','FoamLensDesktop.csproj'),'utf8');
assert(/internal sealed partial class FoamLensForm : Form/.test(program),
  'Windows native FoamLens form must compile both cache and host as one partial type');
assert(cache.includes('internal sealed partial class FoamLensForm'),'Scientific cache must belong to actual desktop host');
assert(program.includes('ParseTemporalFileCachedAsync(path, requestId, operation.Token)'),
  'Real parseTemporalFile request must use the scientific cache, not a standalone demo');
assert(program.includes('cacheHit ? "verified-disk-hit" : "source-parse"'),
  'Native progress must distinguish verified cache hits from source parses');
assert(program.includes('await RunTemporalCacheSelfTestAsync()'),
  'Portable+Setup smoke must execute real exact-content invalidation cases');
assert(cache.includes('SHA256.HashDataAsync(stream, ct)'),
  'Every candidate cache hit must independently hash all original source bytes');
assert(cache.includes('CryptographicOperations.FixedTimeEquals(actual, supplied)'),
  'Byte corruption of the scientific cache must be detected before consuming data');
assert(cache.includes('File.SetLastWriteTimeUtc(source, originalTime)'),
  'Self-test must explicitly preserve mtime when changing a same-size scientific result');
assert(cache.includes('if (changedHit || changed.Columns[0].Y[2] != 90)'),
  'Source edits must refresh changed values, not return a stale cache hit');
assert(cache.includes('if (corruptHit || recovered.Columns[0].Y[2] != 90)'),
  'Corrupted cache must trigger a real scientific parse');
assert(cache.includes('FOAMLENS_DISABLE_TEMPORAL_CACHE'),
  'A scientist must be able to disable the cache for a trustworthy cold baseline');
assert(cache.includes('StableSource(path, length, ticks)')&&cache.includes('HashExactSourceAsync(path, ct)'),
  'Must invalidate live solver outputs changing while a cache is being populated');
assert(cache.includes('MaxTemporalCacheFileBytes')&&cache.includes('TemporalCacheIo'),
  'Bound individual cache payload size and concurrent source hash throughput');
assert(!cache.includes('AppRoot'), 'Persistent scientific cache may not live in the versioned frontend bundle');
assert(project.includes('<TargetFramework>net8.0-windows</TargetFramework>'),
  'Native cache self-tests must run on the actual Desktop Windows runtime');
// Run the ACTUAL frontend function: before this change small native files used
// file.text() and never reached the disk-backed native parser.
const vm=require('vm');
const html=fs.readFileSync(path.join(__dirname,'..','src','FoamLensDesktop','frontend','index.html'),'utf8');
const first=html.indexOf('async function flReadTemporalColumns(file){');
const last=html.indexOf('async function parseFile(file){',first);
assert(first>=0&&last>first,'Live temporal parser not found');
const liveSource=html.slice(first,last);
async function checkNativeSmallFile(mode){
  let nativeCalls=0,reads=0,slices=0;
  const numericText='0 10\\n1 20\\n2 30\\n';
  const mock={
    FOAMLENS_NATIVE:true,
    FL_TEMPORAL_CHUNK_SIZE:1024,
    FL_TEMPORAL_CLASSIFY_HEAD:65536,
    flTemporalParseState:()=>({columns:[],probes:{},head:'',dataCount:0,carry:''}),
    flCaptureTemporalHead:(state,text)=>{state.head+=text},
    flParseTemporalLine:(line,state)=>{
      const fields=String(line).trim().split(/\\s+/);
      if(fields.length===2&&Number.isFinite(Number(fields[0]))&&Number.isFinite(Number(fields[1]))){
        if(!state.columns[0])state.columns[0]={t:[],y:[]};
        state.columns[0].t.push(Number(fields[0]));
        state.columns[0].y.push(Number(fields[1]));
      }
    },
    flConsumeTemporalChunk:(state,text)=>{for(const line of text.trim().split(/\\r?\\n/))mock.flParseTemporalLine(line,state)},
    foamLensNativeOperation:(action,payload)=>{
      assert.strictEqual(action,'parseTemporalFile');
      assert.strictEqual(payload.token,'short-native-token');
      nativeCalls++;
      return{requestId:'cache-check',promise:Promise.resolve(mode==='empty'
        ?{columns:[],probes:{},head:''}
        :{columns:[{t:[0,1,2],y:[10,20,30]}],probes:{0:'(0 0 0)'},head:'# Probe 0'})}
    },
    foamLensActiveTemporalRequests:new Set(),
    updateAppActivity(){},
    diagEs:()=>false,
    scannerYield:async()=>{},
    console:{warn(){}},
    Number,Math,TextEncoder
  };
  const file={_nativeToken:'short-native-token',size:numericText.length,name:'T.dat',
    slice(){slices++;return{text:async()=>numericText}},
    text(){reads++;return Promise.resolve(numericText)}};
  vm.createContext(mock);
  vm.runInContext(liveSource+';globalThis._runTemporal=flReadTemporalColumns',mock,{timeout:1000});
  const parsed=await mock._runTemporal(file);
  assert.strictEqual(nativeCalls,1,'Small OpenFOAM native file must attempt cached native parse');
  assert.strictEqual(reads,0,'Small native file must not eagerly read all contents into JS');
  if(mode==='empty'){
    assert(slices>0,'An unrecognized native temporal format must fall back to JS tokenization');
    assert.strictEqual(parsed.nativeStreaming,false);
  }else{
    assert.strictEqual(slices,0,'Verified native result must not redundantly read JS chunks');
    assert.strictEqual(parsed.nativeStreaming,true);
    assert.strictEqual(parsed.state.columns[0].y[2],30);
    assert.strictEqual(parsed.state.probes[0],'(0 0 0)');
  }
}
Promise.resolve().then(async()=>{
  await checkNativeSmallFile('valid');
  await checkNativeSmallFile('empty');
  console.log('FoamLENS native temporal-cache and short 2D result routing PASS (source hash + Windows smoke contract).');
}).catch(error=>{console.error(error);process.exitCode=1});

