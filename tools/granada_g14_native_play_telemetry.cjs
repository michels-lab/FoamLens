#!/usr/bin/env node
'use strict';
/** GRANADA G14: passive per-criterion Play diagnostics in DISPOSABLE B13 C# host.
 * Never modify original source, release artifacts, or native pass criteria. */
const fs=require('node:fs');
const path=require('node:path');
const program=path.resolve('desktop/src/FoamLensDesktop/Program.cs');
const before="                      const cache=document.getElementById('flRibbonCacheAdvanced');";
const after="                        cameraDocked,distinctCameras,cameraNamesReadable,fieldNavHidden,playNotCollapsed,cachePopoverValid,";
const playCondition="                      const playNotCollapsed=!!playRect&&playRect.width>=100&&playRect.height>=28&&";
// Extract the source literal from this unused function instead of keeping two
// copies of a measurement schema that could drift.
function playMeasurementSnippet(){
/* G14_PLAY_START */
                      const playMetrics=playButton?getComputedStyle(playButton):null;
                      const playTransport=document.getElementById('fwTimeTransport');
                      const playGroup=document.getElementById('flRibbonTimeGroup');
                      const playPanel=document.getElementById('flRibbonPanel-field');
                      const playR=el=>{const r=el?.getBoundingClientRect?.();return r?
                        {x:r.x,y:r.y,width:r.width,height:r.height,left:r.left,right:r.right,top:r.top,bottom:r.bottom}:null};
                      const playChecks={
                        exists:!!playButton,
                        rectWidthAtLeast100:!!playRect&&playRect.width>=100,
                        rectHeightAtLeast28:!!playRect&&playRect.height>=28,
                        textFitsClient:!!playButton&&playButton.scrollWidth<=playButton.clientWidth+2,
                        labelPresent:/Play|Reproducir/.test(playButton?.textContent||''),
                        loopAccessible:/(loop|bucle)/i.test(playButton?.getAttribute('aria-label')||'')
                      };
                      const playNativeTelemetry={
                        schema:'foamlens/granada-g14-installed-play-measurements/1',
                        originalNativeAssertionUnchanged:true,
                        result:playNotCollapsed?'PASS':'FAIL',
                        checks:playChecks,
                        viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},
                        physicalReadout:clock?.textContent||'',
                        play:{
                          rect:playR(playButton),clientWidth:playButton?.clientWidth??null,
                          scrollWidth:playButton?.scrollWidth??null,
                          clientHeight:playButton?.clientHeight??null,
                          scrollHeight:playButton?.scrollHeight??null,
                          offsetWidth:playButton?.offsetWidth??null,
                          text:playButton?.textContent||'',
                          aria:playButton?.getAttribute('aria-label')||'',
                          title:playButton?.getAttribute('title')||'',
                          computed:playMetrics?{
                            display:playMetrics.display,boxSizing:playMetrics.boxSizing,
                            width:playMetrics.width,minWidth:playMetrics.minWidth,
                            maxWidth:playMetrics.maxWidth,height:playMetrics.height,
                            minHeight:playMetrics.minHeight,flex:playMetrics.flex,
                            fontSize:playMetrics.fontSize,fontFamily:playMetrics.fontFamily,
                            fontWeight:playMetrics.fontWeight,lineHeight:playMetrics.lineHeight,
                            paddingLeft:playMetrics.paddingLeft,paddingRight:playMetrics.paddingRight,
                            overflowX:playMetrics.overflowX,overflowY:playMetrics.overflowY,
                            whiteSpace:playMetrics.whiteSpace,wordBreak:playMetrics.wordBreak
                          }:null
                        },
                        originalTree:{
                          group:playR(playGroup),transport:playR(playTransport),
                          ribbon:playR(playPanel),
                          transportContainsPlay:!!playTransport?.contains(playButton),
                          groupContainsTransport:!!playGroup?.contains(playTransport),
                          ribbonContainsGroup:!!playPanel?.contains(playGroup),
                          transportClientWidth:playTransport?.clientWidth??null,
                          transportScrollWidth:playTransport?.scrollWidth??null,
                          ribbonClientWidth:playPanel?.clientWidth??null,
                          ribbonScrollWidth:playPanel?.scrollWidth??null
                        },
                        stylesheet:{
                          g12Present:!!document.getElementById('flG12WideFieldRibbonStyle'),
                          g13Present:!!document.getElementById('flG13CameraAccessStyle')
                        },
                        fontLoadStatus:document.fonts?.status||'unknown',
                        humanApproved:false,physicalOsDpiVerified:false
                      };
/* G14_PLAY_END */
}
function one(source,anchor,label){
 if(source.split(anchor).length!==2)throw Error('G14 Play anchor '+label+' requires exactly one occurrence');
}
function graft(source){
 for(const [anchor,label] of [[before,'cache'],[after,'state report'],[playCondition,'original Play assertion']])one(source,anchor,label);
 if(source.includes('const playNativeTelemetry='))throw Error('G14 telemetry already injected');
 const self=fs.readFileSync(__filename,'utf8');
 const m=self.match(/\/\* G14_PLAY_START \*\/([\s\S]*?)\/\* G14_PLAY_END \*\//);
 if(!m)throw Error('Missing source-owned G14 passive measurement snippet');
 return source.replace(before,m[1]+before).replace(after,after+'\n                        playNativeTelemetry,');
}
if(require.main===module){
 const source=fs.readFileSync(program,'utf8');
 fs.writeFileSync(program,graft(source),'utf8');
 console.log('G14 passive installed Play geometry, typography and accessibility evidence injected; native Play pass condition UNCHANGED');
}
module.exports={graft,playCondition};
