#!/usr/bin/env node
/* GRANADA G13 temporary-native-only: add the actual original 1140px Field
 * camera DOM geometry gate after G7/G12/16-owner temporary host composition.
 * Deliberately never edits main or original user-facing Program.cs. */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const program=path.resolve('desktop/src/FoamLensDesktop/Program.cs');
function graft(source){
 const needle="                      const cameraDocked=!!cameraTab&&cameraTab.classList.contains('active')&&";
 const next="                      const cameraDocked=!!cameraTab&&cameraTab.classList.contains('active')&&";
 const ok="                        playNotCollapsed&&cachePopoverValid;";
 const okNext="                        playNotCollapsed&&cachePopoverValid&&g13NativeCameraPass;";
 const audit="                      const g13NativeCameraAudit=window.FoamLensGranadaG13?.audit?.();\n                      const g13NativeCameraPass=innerWidth>=1025&&innerWidth<=1250?\n                        g13NativeCameraAudit?.result==='PASS':g13NativeCameraAudit?.result==='NOT_APPLICABLE';\n";
 const report="                        cameraDocked,distinctCameras,cameraNamesReadable,fieldNavHidden,playNotCollapsed,cachePopoverValid,";
 const reportNext="                        cameraDocked,distinctCameras,cameraNamesReadable,fieldNavHidden,playNotCollapsed,cachePopoverValid,\n                        g13NativeCameraPass,g13NativeCameraAudit,";
 for(const [label,old] of [['cameraDocked',needle],['physicalSourceOk',ok],['fieldReport',report]]){
  if(source.split(old).length!==2)throw Error('G13 ephemeral native audit cannot safely graft '+label+': anchor count !=1');
 }
 if(source.includes('g13NativeCameraPass'))throw Error('G13 native assertion already installed: do not duplicate');
 return source.replace(needle,audit+next).replace(ok,okNext).replace(report,reportNext);
}
if(require.main===module){
 const before=fs.readFileSync(program,'utf8'),after=graft(before);
 if(after===before)throw Error('no native patch changes');
 fs.writeFileSync(program,after,'utf8');
 console.log('G13 ORIGINAL Field wide/compact WebView2 assertion staged in temporary CI host: '+program);
}
module.exports={graft};
