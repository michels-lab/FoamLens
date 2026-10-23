'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {graft}=require('./granada_g16_native_play_audit.cjs');
const root=path.resolve(__dirname,'../desktop/src/FoamLensDesktop/Program.cs');
let source=fs.readFileSync(root,'utf8');
// The actual temporary native composition precedes this isolated source test.
source=source.replace("                        playNotCollapsed&&cachePopoverValid;",
 "                        playNotCollapsed&&cachePopoverValid&&g13NativeCameraPass;");
source=source.replace("                      const cache=document.getElementById('flRibbonCacheAdvanced');",
 "                      const playMetrics=playButton?getComputedStyle(playButton):null;\n                      const cache=document.getElementById('flRibbonCacheAdvanced');");
source=source.replace("                        cameraDocked,distinctCameras,cameraNamesReadable,fieldNavHidden,playNotCollapsed,cachePopoverValid,",
 "                        cameraDocked,distinctCameras,cameraNamesReadable,fieldNavHidden,playNotCollapsed,cachePopoverValid,\n                        playNativeTelemetry,");
test('G16 test-only native audit is additive to ALL original Play, Camera and science gates',()=>{
 const patched=graft(source);
 assert(patched.includes("playNotCollapsed&&cachePopoverValid&&g13NativeCameraPass&&g16NativePlayPass;"));
 assert(patched.includes("g16NativePlayAudit?.result==='PASS'"));
 assert(patched.includes("g16NativePlayAudit?.result==='NOT_APPLICABLE'"));
 assert(patched.includes('g16NativePlayPass,g16NativePlayAudit,'));
 assert(patched.includes('physicalFrameMatches'));
 assert(patched.includes('regionLegendMeasured'));
 assert(!patched.includes('playNotCollapsed=true'));
});
test('fail closed on drift, replay or changed original Field proof contract',()=>{
 const once=graft(source);
 assert.throws(()=>graft(once),/already composed|source changed/);
 assert.throws(()=>graft(source.replace('g13NativeCameraPass;', 'true;')), /original-gate/);
 assert.throws(()=>graft(source.replace('playNativeTelemetry,','')), /native-log/);
});
