/* FoamLens GRANADA G13: responsive reachability of ORIGINAL Field cameras.
 * Styling and read-only measurements only. No duplicate controls or transforms. */
(function(){
'use strict';
const LOW=1025,HIGH=1250,STYLE='flG13CameraAccessStyle';
const IDS=['flRaCameraIso','flRaCameraFront','flRaCameraBack','flRaCameraLeft','flRaCameraRight','flRaCameraTop','flRaCameraBottom'];
const get=id=>document.getElementById(id);
function eligible(){
 return window.innerWidth>=LOW&&window.innerWidth<=HIGH&&
 document.body.classList.contains('flRibbonReady')&&
 document.body.classList.contains('appMode-field')&&
 !!get('flRibbonPanel-field')?.classList.contains('active');
}
function box(el){let r=el?.getBoundingClientRect?.();return r?{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}:null}
function measure(){
 const active=eligible(),shelf=get('flFieldContextShelf'),tab=document.querySelector?.('[data-fl-subbar="camera"]');
 const presets=IDS.map(id=>{
   const el=get(id),r=box(el),style=el&&typeof getComputedStyle==='function'?getComputedStyle(el):null;
   const label=el?.querySelector?.('.flRibbonLabel'),txt=String(label?.textContent||el?.textContent||'').trim();
   const aria=String(el?.getAttribute?.('aria-label')||'').trim(),title=String(el?.getAttribute?.('title')||'').trim();
   const hidden=style?.display==='none'||style?.visibility==='hidden';
   return{id,present:!!el,visible:!!r&&r.width>=55&&r.height>=26&&r.left>=-1&&r.right<=window.innerWidth+1&&!hidden,
     named:!!txt&&!!aria&&!!title,rect:r};
 });
 const allPresent=presets.every(x=>x.present),allVisible=presets.every(x=>x.visible&&x.named);
 const cameraOpen=!!tab?.classList.contains('active')&&!!shelf&&!shelf.classList.contains('hidden');
 const shelfFit=!cameraOpen||!!shelf&&shelf.scrollWidth<=shelf.clientWidth+2;
 return{schema:'foamlens/granada-g13-original-field-cameras/1',active,
 result:!active?'NOT_APPLICABLE':allVisible&&shelfFit?'PASS':'FAIL',
 viewport:{width:window.innerWidth,height:window.innerHeight},cameraOpen,
 originalPresetCount:presets.filter(x=>x.present).length,allOriginalPresetsPresent:allPresent,
 allOriginalPresetsVisible:allVisible,cameras:presets,
 cameraShelfScrollWidth:shelf?.scrollWidth??null,cameraShelfClientWidth:shelf?.clientWidth??null,
 cameraShelfScrollLeft:shelf?.scrollLeft??null,cameraShelfFits:shelfFit,
 originalHandlersReused:true,solverStateChanged:false,nativeDpiOrHumanApproved:false};
}
function boot(){
 if(get(STYLE))return;
 const css=[
 '@media(min-width:1025px) and (max-width:1250px){',
 // Promote exactly the original source-native 7 camera controls, no wrappers.
 'body.flRibbonReady.appMode-field :is(#flRibbonPanel-field,#flFieldContextShelf) .flRibbonGroup:has(#flRaCameraIso){flex:1 1 100%!important;min-width:0!important;width:100%!important;max-width:100%!important;box-sizing:border-box!important}',
 'body.flRibbonReady.appMode-field :is(#flRibbonPanel-field,#flFieldContextShelf) .flRibbonGroup:has(#flRaCameraIso) .flRibbonActions{display:flex!important;flex-wrap:wrap!important;gap:4px!important;min-width:0!important;max-width:100%!important}',
 'body.flRibbonReady.appMode-field :is(#flRibbonPanel-field,#flFieldContextShelf) :is(#flRaCameraIso,#flRaCameraFront,#flRaCameraBack,#flRaCameraLeft,#flRaCameraRight,#flRaCameraTop,#flRaCameraBottom){width:auto!important;min-width:95px!important;max-width:none!important;min-height:32px!important;display:inline-flex!important;align-items:center!important;gap:5px!important;padding:5px 8px!important;box-sizing:border-box!important;white-space:nowrap!important}',
 'body.flRibbonReady.appMode-field :is(#flRibbonPanel-field,#flFieldContextShelf) :is(#flRaCameraIso,#flRaCameraFront,#flRaCameraBack,#flRaCameraLeft,#flRaCameraRight,#flRaCameraTop,#flRaCameraBottom) .flRibbonLabel{display:inline!important;max-width:none!important;font-size:10px!important;white-space:nowrap!important}',
 // Original Camera subtabs and source controls must wrap rather than hide.
 'body.flRibbonReady.appMode-field #flFieldContextShelf.flCameraToolsActive{box-sizing:border-box!important;display:flex!important;flex-wrap:wrap!important;align-content:flex-start!important;align-items:center!important;gap:5px 8px!important;min-width:0!important;max-width:100%!important;max-height:none!important;height:auto!important;overflow-x:auto!important;overflow-y:visible!important}',
 'body.flRibbonReady.appMode-field #flFieldContextShelf.flCameraToolsActive>.flRibbonGroup.flSubbarActive{display:flex!important;flex:1 1 100%!important;flex-wrap:wrap!important;min-width:0!important;max-width:100%!important;max-height:none!important}',
 'body.flRibbonReady.appMode-field #flFieldContextShelf.flCameraToolsActive>.flRibbonGroup .flRibbonActions{display:flex!important;flex-wrap:wrap!important;gap:4px!important;max-width:100%!important}',
 'body.flRibbonReady.appMode-field #flFieldContextShelf.flCameraToolsActive .flRibbonCameraTools{display:flex!important;flex:1 1 100%!important;flex-wrap:wrap!important;align-items:center!important;min-width:0!important;max-width:100%!important;gap:5px!important}',
 'body.flRibbonReady.appMode-field #flFieldContextShelf.flCameraToolsActive .flRibbonCameraTools .fvToolRow{display:flex!important;flex-wrap:wrap!important;align-items:center!important;max-width:100%!important;gap:5px!important}',
 'body.flRibbonReady.appMode-field #flFieldContextShelf.flCameraToolsActive .flRibbonCameraTools .fvNavPresets{min-width:0!important;max-width:100%!important}',
 '}',
 // Keep G7's original compact camera buttons/labels unchanged. Repair only
 // the original Camera shelf transition wide->640: the old 2300px shelf left
 // the existing renderer toolbar completely outside the 640px viewport.
 '@media(max-width:1024px){',
 'body.flRibbonReady.appMode-field #flFieldContextShelf.flCameraToolsActive{box-sizing:border-box!important;display:flex!important;flex-wrap:wrap!important;align-content:flex-start!important;align-items:center!important;gap:4px!important;min-width:0!important;max-width:100%!important;max-height:none!important;height:auto!important;overflow-x:auto!important;overflow-y:visible!important}',
 'body.flRibbonReady.appMode-field #flFieldContextShelf.flCameraToolsActive>.flRibbonGroup.flSubbarActive{display:flex!important;flex:1 1 100%!important;flex-wrap:wrap!important;min-width:0!important;max-width:100%!important;max-height:none!important}',
 'body.flRibbonReady.appMode-field #flFieldContextShelf.flCameraToolsActive>.flRibbonGroup .flRibbonActions{display:flex!important;flex-wrap:wrap!important;gap:3px!important;min-width:0!important;max-width:100%!important}',
 'body.flRibbonReady.appMode-field #flFieldContextShelf.flCameraToolsActive .flRibbonCameraTools{display:flex!important;flex:1 1 100%!important;flex-wrap:wrap!important;align-items:center!important;min-width:0!important;max-width:100%!important;gap:4px!important}',
 'body.flRibbonReady.appMode-field #flFieldContextShelf.flCameraToolsActive .flRibbonCameraTools .fvToolRow{display:flex!important;flex-wrap:wrap!important;align-items:center!important;min-width:0!important;max-width:100%!important;gap:4px!important}',
 'body.flRibbonReady.appMode-field #flFieldContextShelf.flCameraToolsActive .flRibbonCameraTools .fvNavPresets{min-width:0!important;max-width:100%!important}',
 '}'
 ].join('\n');
 const tag=document.createElement('style');tag.id=STYLE;tag.textContent=css;document.head.appendChild(tag);
}
window.FoamLensGranadaG13=Object.freeze({audit:measure,cameraIds:IDS.slice()});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();