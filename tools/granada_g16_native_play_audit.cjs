#!/usr/bin/env node
'use strict';
/* G16 test-only WebView2 audit after original G13 + G14 original gates are
 * composed; preserve exact original Play/CAD/OpenFOAM acceptance. */
const fs=require('node:fs');
const path=require('node:path');
const file=path.resolve('desktop/src/FoamLensDesktop/Program.cs');
function graft(original){
 const anchor="                      const playMetrics=playButton?getComputedStyle(playButton):null;";
 const tail="                        playNotCollapsed&&cachePopoverValid&&g13NativeCameraPass;";
 const report="                        playNativeTelemetry,";
 for(const [name,txt] of [['play-metrics',anchor],['original-gate',tail],['native-log',report]]){
  if(original.split(txt).length!==2)throw Error('G16 native B13 source changed: '+name);
 }
 if(original.includes('g16NativePlayPass'))throw Error('G16 native source audit already composed');
 const prefix=[
 "                      const g16NativePlayAudit=window.FoamLensGranadaG16?.audit?.();",
 "                      const g16NativePlayPass=(innerWidth>=1025&&innerWidth<=1250)?",
 "                        g16NativePlayAudit?.result==='PASS':g16NativePlayAudit?.result==='NOT_APPLICABLE';",
 ""
 ].join('\n');
 return original.replace(anchor,prefix+anchor)
  .replace(tail,"                        playNotCollapsed&&cachePopoverValid&&g13NativeCameraPass&&g16NativePlayPass;")
  .replace(report,report+"\n                        g16NativePlayPass,g16NativePlayAudit,");
}
if(require.main===module){
 const original=fs.readFileSync(file,'utf8');
 fs.writeFileSync(file,graft(original),'utf8');
 console.log('G16 native original Play/Field current-state source audit installed; all prior physics and Play gates retained.');
}
module.exports={graft};
