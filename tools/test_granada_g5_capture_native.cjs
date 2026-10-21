'use strict';
const assert=require('node:assert/strict');
const {compose,MARK,CALL,METHOD}=require('./granada_g5_capture_native.cjs');
let n=0;function test(name,fn){fn();n++;console.log('✓ '+name)}
const original="internal class Native {\nFoamLensMeshAuditor\nfield-real-multiregion.png\n"+
"  private async Task X() {\n"+CALL+"\n  }\n"+MARK+"\n}\n";
test('injects only adjacent to already successful real QuickCup capture after Field F1 import',()=>{
 const out=compose(original);
 assert(out.includes(CALL+'\n                await CaptureGranadaAdditionalWorkspaceEvidenceAsync();'));
 assert(out.indexOf(CALL)<out.indexOf('await CaptureGranadaAdditionalWorkspaceEvidenceAsync();'));
 assert(out.includes(MARK));assert(out.includes('field-real-multiregion.png'));
});
test('all five real UI screens are navigated by actual original controls, not synthetic screenshots',()=>{
 for(const s of ["time-series","field-compare","analysis","review","live"])assert(METHOD.includes('"'+s+'"'));
 for(const token of ["open('modeData')","open('timeSeriesTab')","open('flRaFieldWorkspace')",
  "open('modeAnalysis')","open('modeReview')","open('modeLive')","setLayout('split')",
  "setCompanion('timeseries')","CaptureCdpPngAsync","sourceRegionCount","sourceRegionCount>=2",
  "GetProperty(\"ok\")","File.WriteAllTextAsync"])assert(METHOD.includes(token),token);
 assert(!METHOD.includes("fake.png"));
});
test('actual embedded browser script compiles as JavaScript before any native capture',()=>{
 const begin='var script = "(()=>{const surface=" + JsonSerializer.Serialize(name) + @"';
 const a=METHOD.indexOf(begin);
 assert(a>=0,'C# string source not found');
 const start=a+begin.length,end=METHOD.indexOf('";',start);
 assert(end>start,'C# JavaScript terminator missing');
 const js="(()=>{const surface='analysis'"+METHOD.slice(start,end);
 assert(js.includes("const primaryRegion=document.getElementById('fvRegion')"));
 assert(js.includes("measuredSecondary"));
 assert(js.includes("sourceRegionCount=(primaryRegion?1:0)+measuredSecondary.length"));
 new Function('window','document','getComputedStyle','setAppMode',js);
});
test('missing Mesh Auditor or physical B13 screenshot anchor rejects unsafe host',()=>{
 assert.throws(()=>compose(original.replace('FoamLensMeshAuditor','old')),/Refuse to remove/);
 assert.throws(()=>compose(original.replace('field-real-multiregion.png','old')),/Refuse to remove/);
});
test('refuses duplicate smoke hook or duplicate capture method',()=>{
 assert.throws(()=>compose(original+CALL),/missing or duplicated/);
 assert.throws(()=>compose(original.replace(MARK,MARK+MARK)),/missing or duplicated/);
 assert.throws(()=>compose(compose(original)),/already installed/);
});
test('captures two independent viewport sizes but makes no physical OS-DPI claim',()=>{
 assert(METHOD.includes('1140'));assert(METHOD.includes('640'));
 assert(METHOD.includes('deviceScaleFactor = 1'));
 assert(!METHOD.includes('systemDpiVerified'));
});
test('requires panel visibility, right mode and real case, not simply a click',()=>{
 for(const token of ["visible(document.getElementById('chartViewport'))","actualMode&&realTab&&panelReady&&secondary",
  "setDeviceMetricsOverride","clearDeviceMetricsOverride","catch(error)"]){
  assert(METHOD.includes(token),token)
 }
});
test('Time Series empty real B13 is photographed as an honest empty view, not certified curves',()=>{
 assert(METHOD.includes("timeSeriesControlsVisible"));
 assert(METHOD.includes("realTimeSeriesHasCurves"));
 assert(METHOD.includes("panelReady=surface==='time-series'"));
 assert(METHOD.includes("Number(document.getElementById('timeSeriesCount')?.textContent||0)>0"));
});
test('leaves exact original source bytes around the grafted blocks intact',()=>{
 const extra=" // ORIGINAL IMMUTABLE MESH AND OPENFOAM FRAME\n";
 const s=original.replace(MARK,extra+MARK);
 const composed=compose(s);
 assert(composed.includes(extra+METHOD.slice(0,25)),"Owner source adjacent to injected method must be preserved");
 assert(composed.includes(extra));
});
console.log('Granada original 5-tab WebView2 smoke: '+n+' source safety groups PASS (native C# build still mandatory)');
