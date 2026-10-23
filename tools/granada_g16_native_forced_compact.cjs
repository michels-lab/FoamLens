#!/usr/bin/env node
/* GRANADA G16 test-only WebView2: deliberately force original G7 compact
 * class at laptop 1140px, inspect original Play computed pixel width,
 * restore class synchronously, and fail closed. Not product code. */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const file=path.resolve('desktop/src/FoamLensDesktop/Program.cs');
const anchor="                      const playMetrics=playButton?getComputedStyle(playButton):null;";
const inserted="                      const g16ForcedCompactReplay=(()=>{\n                        if(innerWidth<1025||innerWidth>1250)\n                          return {result:'NOT_APPLICABLE',originalClassRestored:true};\n                        const app=document.getElementById('appShell');\n                        const play=document.getElementById('fwTimePlay');\n                        if(!app||!play)return {result:'FAIL',reason:'missing original app or Play',originalClassRestored:false};\n                        const hadCompact=app.classList.contains('gfwCompact');\n                        let measured=null;\n                        try{\n                          // Only disposable native acceptance probe. The original class\n                          // is restored synchronously, before any asynchronous frame.\n                          app.classList.add('gfwCompact');\n                          const bounds=play.getBoundingClientRect();\n                          const style=getComputedStyle(play);\n                          const minWidth=Number.parseFloat(style.minWidth);\n                          const textFits=play.scrollWidth<=play.clientWidth+2;\n                          const originalLabel=/(?:Play|Reproducir)/i.test(play.textContent||'')&&\n                            /(?:loop|bucle)/i.test(play.getAttribute('aria-label')||'');\n                          const pass=bounds.width>=112&&bounds.height>=28&&\n                            Number.isFinite(minWidth)&&minWidth>=112&&\n                            style.maxWidth==='none'&&textFits&&originalLabel;\n                          measured={\n                            result:pass?'PASS':'FAIL',viewport:innerWidth,\n                            originalClassInitiallyPresent:hadCompact,\n                            replayClassPresent:app.classList.contains('gfwCompact'),\n                            originalPlayWidth:bounds.width,originalPlayHeight:bounds.height,\n                            computedMinWidth:style.minWidth,computedMaxWidth:style.maxWidth,\n                            clientWidth:play.clientWidth,scrollWidth:play.scrollWidth,\n                            originalLabelAndLoop:originalLabel,textFits,\n                            temporaryClassOnly:true,physicsChanged:false,\n                            humanApproved:false\n                          };\n                        }finally{\n                          if(!hadCompact)app.classList.remove('gfwCompact');\n                        }\n                        const restored=app.classList.contains('gfwCompact')===hadCompact;\n                        return {...measured,originalClassRestored:restored,\n                          result:measured?.result==='PASS'&&restored?'PASS':'FAIL'};\n                      })();\n                      const g16ForcedCompactReplayPass=(innerWidth>=1025&&innerWidth<=1250)?\n                        g16ForcedCompactReplay?.result==='PASS':\n                        g16ForcedCompactReplay?.result==='NOT_APPLICABLE';\n";
const ok="                        playNotCollapsed&&cachePopoverValid&&g13NativeCameraPass&&g16NativePlayPass;";
const report="                        g16NativePlayPass,g16NativePlayAudit,";
function graft(original){
 for(const [label,key] of [['telemetry',anchor],['native-gate',ok],['native-report',report]])
  if(original.split(key).length!==2)throw Error('G16 forced CSS native source drift '+label);
 if(original.includes('g16ForcedCompactReplayPass'))throw Error('G16 forced replay already present');
 return original.replace(anchor,inserted+anchor)
  .replace(ok,"                        playNotCollapsed&&cachePopoverValid&&g13NativeCameraPass&&g16NativePlayPass&&g16ForcedCompactReplayPass;")
  .replace(report,report+'\n                        g16ForcedCompactReplayPass,g16ForcedCompactReplay,');
}
if(require.main===module){
 const before=fs.readFileSync(file,'utf8');fs.writeFileSync(file,graft(before),'utf8');
 console.log('Original Play G7 stale compact class temporary forced CSS replay installed only in disposable Windows B13 QA.');
}
module.exports={graft,inserted};
