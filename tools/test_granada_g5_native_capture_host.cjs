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
 for(const s of ['flRibbonTab-data','timeSeriesTab','flRibbonTab-field','flRibbonTab-analysis','flRaReview','flRaLive','fvCanvas'])
  assert(METHOD.includes(s),s);
 assert(METHOD.includes('modeOk&&titleOk&&splitOk&&dataOk&&viewportOk'))
});
test('original mode-owned headers, not hidden global Ribbon title, certify each real workspace',()=>{
 for(const s of ['flRaDataTimeSeries','flRibbonPanel-analysis','reviewTitle','liveTitle','fwGrid'])
  assert(METHOD.includes("'"+s+"'"),'Missing actual owned UI header '+s);
 assert(!METHOD.includes("document.querySelector('.top h2')"));
 assert(METHOD.includes('getComputedStyle(title).display'));
 for(const s of ['flRibbonTab-data','flRaDataTimeSeries','flRibbonTab-analysis','flRaReview','flRaLive'])
  assert(METHOD.includes("'"+s+"'"),'Must navigate the real visible Ribbon '+s);
 assert(!METHOD.includes("el('modeData')?.click()"));
 assert(!METHOD.includes("el('modeReview')?.click()"));
});
test('Time Series identifies visible original action by accessible name, not the empty Ribbon panel',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const ribbon=fs.readFileSync(path.join(__dirname,'../desktop/src/FoamLensDesktop/frontend/v15-ribbon-ui.js'),'utf8');
 assert(ribbon.includes("flRibbonActionHtml('flRaDataTimeSeries','chart','Time series','Series')"));
 assert(ribbon.includes('aria-label="'));
 assert(METHOD.includes("key==='time-series'?el('flRaDataTimeSeries')"),'Must validate original visible command node');
 assert(METHOD.includes("title.getAttribute('aria-label')"),'Native accessible label required');
 assert(METHOD.includes("title.getAttribute('title')"),'Fallback native original title required');
 assert(METHOD.includes("rect(title)?.width>25"),'Visible width gate must survive');
 assert(METHOD.includes("getComputedStyle(title).display!=='none'"),'Must reject hidden controls');
 assert(METHOD.includes("el('timeSeriesTab')?.classList.contains('active')"),'Real data view must be selected');
 assert(!METHOD.includes("key==='time-series'?el('flRibbonPanel-data')"),'Empty parent title is regression');
});
test('G5 snapshots original Data view and restores it before native cross-session checks',()=>{
 const scope=METHOD.indexOf('var originalViewJson');
 const tabBegin=METHOD.indexOf('var tabs =');
 const restore=METHOD.indexOf('var restore =');
 assert(scope>0&&scope<tabBegin,'Capture exact pre-audit Data view before navigating');
 assert(restore>tabBegin,'Restore only after actual G5 captures');
 assert(METHOD.includes("typeof currentDataView==='string'?currentDataView:null"),'Use actual currentDataView source');
 assert(METHOD.includes('JsonSerializer.Deserialize<string>(originalViewJson)'),'Require exact named view from WebView2');
 assert(METHOD.includes('JsonSerializer.Serialize(originalView)'),'Encode original mode safely in JS');
 assert(METHOD.includes("typeof setDataView!=='function'"),'No simulated success if native setter absent');
 assert(METHOD.includes('setDataView(previous)'),'Use original Data view setter; not a fabricated DOM class');
 assert(METHOD.includes('currentDataView===previous'),'Confirm actual restored state');
 assert(METHOD.includes('G5 original Data view state restoration failed'),'Do not ignore session corruption');
 assert(!METHOD.includes("setDataView('catalog')"),'Must not hard-code catalog (works only for one initial view)');
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
