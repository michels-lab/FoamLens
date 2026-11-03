/* FoamLens GRANADA G16: guard the ORIGINAL scientific Play button against
 * compact-only G7 CSS winning after an asynchronous 640->1140 resize.
 * One versioned stylesheet; no DOM reparenting, handlers or CFD mutation. */
(function(){
'use strict';
const STYLE='flG16WidePlayCascadeGuard';
const id=name=>document.getElementById(name);
function audit(){
 const play=id('fwTimePlay'),panel=id('flRibbonPanel-field'),transport=id('fwTimeTransport'),
   app=id('appShell'),r=play?.getBoundingClientRect?.(),style=play?getComputedStyle(play):null;
 const active=window.innerWidth>=1025&&window.innerWidth<=1250&&
   document.body.classList.contains('flRibbonReady')&&
   document.body.classList.contains('appMode-field')&&
   !!panel?.classList.contains('active');
 const measured=!!play&&!!transport?.contains(play)&&!!r&&r.width>=100&&r.height>=28&&
   play.scrollWidth<=play.clientWidth+2&&/(?:Play|Reproducir)/i.test(play.textContent||'')&&
   /(?:loop|bucle)/i.test(play.getAttribute('aria-label')||'');
 return Object.freeze({
  schema:'foamlens/granada-g16-wide-play-cascade/1',
  active,result:active?(measured?'PASS':'FAIL'):'NOT_APPLICABLE',
  viewport:{width:window.innerWidth,height:window.innerHeight},
  staleG7CompactClassAtWideWidth:active&&!!app?.classList.contains('gfwCompact'),
  originalPlayPresent:!!play,originalTransportContainsPlay:!!transport?.contains(play),
  originalPlayRect:r?{left:r.left,right:r.right,width:r.width,height:r.height}:null,
  originalPlayText:String(play?.textContent||'').trim(),
  originalPlayAria:play?.getAttribute('aria-label')||'',
  playClientWidth:play?.clientWidth??null,playScrollWidth:play?.scrollWidth??null,
  computedMinWidth:style?.minWidth||null,computedMaxWidth:style?.maxWidth||null,
  computedWidth:style?.width||null,computedDisplay:style?.display||null,
  computedFlexShrink:style?.flexShrink||null,computedBoxSizing:style?.boxSizing||null,
  computedTransitionProperty:style?.transitionProperty||null,
  computedTransitionDuration:style?.transitionDuration||null,
  computedFontSize:style?.fontSize||null,
  guardStylesheetPresent:!!id(STYLE),g7StylesheetPresent:!!id('gfwG7Style'),
  g12StylesheetPresent:!!id('flG12WideFieldRibbonStyle'),
  nativeInstalledOrPhysicalDpiApproved:false,
  physicsOrSavedStateChanged:false
 });
}
function install(){
 if(id(STYLE))return;
 const sheet=document.createElement('style');sheet.id=STYLE;
 sheet.textContent=[
 '@media(min-width:1025px) and (max-width:1250px){',
 // G43/P0: an original 70px failure occurs at 1140px even WITHOUT
 // gfwCompact. The old G16 recovery selector required the compact class,
 // so it was inert in this observed failure state. Retain original controls.
 '#flRibbonPanel-field #fwTimeTransport #fwTimePlay{min-width:112px!important;width:max-content!important;max-width:none!important;min-height:32px!important;box-sizing:border-box!important;white-space:nowrap!important;overflow:visible!important;text-overflow:clip!important;flex-shrink:0!important;padding:6px 10px!important}',
 // Exact same original source DOM and G7 selector specificity, but a
 // later v33 stylesheet, only when compact state became stale at WIDE width.
 'body.flRibbonReady.appMode-field #appShell.app.gfwCompact #flRibbonPanel-field .flRibbonTimeGroup #fwTimePlay{min-width:112px!important;width:max-content!important;max-width:none!important;min-height:32px!important;box-sizing:border-box!important;white-space:nowrap!important;overflow:visible!important;text-overflow:clip!important;flex-shrink:0!important;padding:6px 10px!important;font-size:11px!important}',
 'body.flRibbonReady.appMode-field #appShell.app.gfwCompact #flRibbonPanel-field .flRibbonTimeGroup #fwTimeTransport{box-sizing:border-box!important;display:grid!important;grid-template-columns:32px max-content 32px minmax(90px,1fr) max-content max-content!important;column-gap:6px!important;align-items:center!important;flex:1 1 690px!important;width:min(740px,100%)!important;min-width:0!important;max-width:100%!important}',
 '}',
 // G46 / Block 1 P0: .btn{transition:.14s} animates min-width and width!
 // Real Chromium 640 -> 1140 reproduces a transient computed 68px at
 // wide viewport despite the 112px !important rule. CSS transitions take
 // precedence over even !important declarations while in progress.
 // Preserve cosmetic fades but never interpolate the original Play geometry,
 // in BOTH compact and wide states (no duplicate controls or manual resizing).
 '#fwTimePlay{transition-property:background-color,border-color,color!important}'
 ].join('\n');
 document.head.appendChild(sheet);
}
window.FoamLensGranadaG16=Object.freeze({audit});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
})();
