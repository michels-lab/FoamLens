'use strict';
const assert=require('node:assert/strict');
const {CALL,ANCHOR,GRAFT,METHOD,integrate}=require('./granada_g5_native_capture_host.cjs');
let count=0;
function test(name,fn){fn();count++;console.log(' ✓ '+name)}
const original=[
'private class F{',
'    // meshAuditSurfaceJson',
'    // FoamLens real OpenFOAM View B metal+mold and metric XYZ smoke passed',
CALL,
ANCHOR,
'}'
].join('\n');
test('appends exactly one G5 invocation after original real Field evidence',()=>{
 const result=integrate(original);
 assert(result.includes(CALL+'\n'+GRAFT));
 assert.equal(result.split(GRAFT).length,2);
 assert(result.includes(METHOD));
 assert(result.indexOf(METHOD)<result.indexOf(ANCHOR))
});
test('original scientific smoke, existing Mesh auditor and exact source stay intact',()=>{
 const result=integrate(original);
 assert(result.includes('meshAuditSurfaceJson'));
 assert(result.includes('OpenFOAM View B metal+mold'));
 assert(original!==result);
 assert(!original.includes('CaptureGranadaExtraNativeTabsAsync'))
});
test('all five real UI tabs are checked with original DOM controls',()=>{
 for(const s of ["time-series","field-compare","analysis","review","live"])
  assert(METHOD.includes('"'+s+'"'));
 for(const s of ["modeData","timeSeriesTab","flRibbonTab-field","modeAnalysis","modeReview","modeLive","fvCanvas"])
  assert(METHOD.includes(s),s);
 assert(METHOD.includes('modeOk&&titleOk&&splitOk&&dataOk&&viewportOk'))
});
test('original mode-owned headers, not hidden global Ribbon title, certify each real workspace',()=>{
 for(const s of ['flRibbonPanel-data','flRibbonPanel-analysis','reviewTitle','liveTitle','fwGrid'])
  assert(METHOD.includes("'"+s+"'"),'Missing actual owned UI header '+s);
 assert(!METHOD.includes("document.querySelector('.top h2')"));
 assert(METHOD.includes('getComputedStyle(title).display'));
 for(const s of ['flRibbonTab-data','flRaDataTimeSeries','flRibbonTab-analysis','flRaReview','flRaLive'])
  assert(METHOD.includes("'"+s+"'"),'Must navigate the real visible Ribbon '+s);
 assert(!METHOD.includes("el('modeData')?.click()"));
 assert(!METHOD.includes("el('modeReview')?.click()"));
});
test('both physical capture sizes and evidence path must exist',()=>{
 assert(METHOD.includes('1140'));assert(METHOD.includes('640'));
 assert(METHOD.includes('CaptureCdpPngAsync'));
 assert(METHOD.includes('FOAMLENS_BRAND_EVIDENCE_DIR'));
 assert(METHOD.includes('FOAMLENS_GRANADA_G5_NATIVE'))
});
test('native test cannot overwrite owner host or double-register its evidence',()=>{
 assert.throws(()=>integrate(integrate(original)),/already added/);
 assert.throws(()=>integrate(original.replace(CALL,'')),/Unique source anchor/);
 assert.throws(()=>integrate(original+CALL),/Unique source anchor/)
});
test('missing Field F1 or original Mesh Auditor is a hard block',()=>{
 assert.throws(()=>integrate(original.replace('meshAuditSurfaceJson','oops')),/Scientific/);
 assert.throws(()=>integrate(original.replace('View B metal+mold','NO FIELD')),/Scientific/)
});
console.log('Granada G5 C# native capture source integration: '+count+' fail-closed groups PASS');
