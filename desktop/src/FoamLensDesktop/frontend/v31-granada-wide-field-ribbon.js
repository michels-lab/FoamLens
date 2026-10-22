/* FoamLens GRANADA G12: keep the ORIGINAL physical-time transport visible
 * in Field at laptop widths. No proxy buttons, no case mutation, no time math. */
(function(){
'use strict';
const MIN=1025,MAX=1250,STYLE='flG12WideFieldRibbonStyle';
const byId=id=>document.getElementById(id);
function mode(){
 const panel=byId('flRibbonPanel-field');
 return window.innerWidth>=MIN&&window.innerWidth<=MAX&&
   document.body.classList.contains('appMode-field')&&
   document.body.classList.contains('flRibbonReady')&&
   !!panel?.classList.contains('active');
}
function rect(node){
 const r=node?.getBoundingClientRect?.();
 return r?{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}:null;
}
function audit(){
 const active=mode(),panel=byId('flRibbonPanel-field'),group=byId('flRibbonTimeGroup'),
   play=byId('fwTimePlay'),transport=byId('fwTimeTransport'),shelf=byId('flFieldContextShelf'),
   clock=byId('fwTimeReadout'),frame=rect(play),p=rect(panel);
 const text=String(play?.textContent||'').trim();
 const aria=String(play?.getAttribute?.('aria-label')||'');
 const fit=!!play&&play.scrollWidth<=play.clientWidth+2;
 const within=!!frame&&frame.left>=-1&&frame.right<=window.innerWidth+1&&
    frame.width>=100&&frame.height>=28&&frame.top>=0&&frame.bottom<=window.innerHeight;
 const hasPlay=/(?:Play|Reproducir)/i.test(text)&&/(?:loop|bucle)/i.test(aria);
 const originals=!!panel&&!!group&&!!play&&!!transport&&!!clock&&
   group.contains(transport)&&transport.contains(play);
 const result=active?(originals&&within&&fit&&hasPlay?'PASS':'FAIL'):'NOT_APPLICABLE';
 return{schema:'foamlens/granada-g12-field-laptop-ribbon/1',
    result,active,viewport:{width:window.innerWidth,height:window.innerHeight},
    originalTransportPreserved:originals,playVisibleInViewport:within,
    playTextFits:fit,playLabelAndLoopAccessible:hasPlay,playRect:frame,
    playClientWidth:play?.clientWidth??null,playScrollWidth:play?.scrollWidth??null,
    playText:text,playAria:aria,
    ribbonRect:p,ribbonScrollWidth:panel?.scrollWidth??null,
    ribbonClientWidth:panel?.clientWidth??null,
    shelfScrollLeft:shelf?.scrollLeft??null,shelfScrollWidth:shelf?.scrollWidth??null,
    shelfClientWidth:shelf?.clientWidth??null,
    clockText:String(clock?.textContent||'').trim(),
    physicsAndStoredStateChanged:false,
    installedScreenshotAndPhysicalDpiValidated:false};
}
function install(){
 if(byId(STYLE))return;
 const style=document.createElement('style');style.id=STYLE;
 style.textContent=[
 '@media(min-width:1025px) and (max-width:1250px){',
 'body.flRibbonReady.appMode-field #flRibbonPanel-field.active{display:flex!important;flex-wrap:wrap!important;align-items:center!important;align-content:flex-start!important;overflow-x:visible!important;overflow-y:visible!important;column-gap:8px!important;row-gap:6px!important}',
 'body.flRibbonReady.appMode-field #flRibbonPanel-field.active>.flRibbonTimeGroup{order:-1!important;flex:1 0 100%!important;width:100%!important;min-width:0!important;max-width:100%!important;box-sizing:border-box!important}',
 'body.flRibbonReady.appMode-field #flRibbonPanel-field .flRibbonTimeGroup .flRibbonActions{display:flex!important;flex-wrap:wrap!important;align-items:center!important;min-width:0!important;width:100%!important;max-width:100%!important}',
 'body.flRibbonReady.appMode-field #flRibbonPanel-field .flRibbonTimeGroup #fwTimeTransport{box-sizing:border-box!important;display:grid!important;grid-template-columns:32px max-content 32px minmax(90px,1fr) max-content max-content!important;column-gap:6px!important;align-items:center!important;flex:1 1 690px!important;width:min(740px,100%)!important;min-width:0!important;max-width:100%!important}',
 'body.flRibbonReady.appMode-field #flRibbonPanel-field #fwTimePlay{width:max-content!important;min-width:112px!important;max-width:none!important;min-height:32px!important;box-sizing:border-box!important;white-space:nowrap!important;overflow:visible!important;text-overflow:clip!important;flex-shrink:0!important;padding:6px 10px!important;font-size:11px!important}',
 'body.flRibbonReady.appMode-field #flRibbonPanel-field .flRibbonTimeGroup .fwTimeTransport input[type="range"]{min-width:90px!important}',
 '}'
 ].join('\n');
 document.head.appendChild(style);
}
function boot(){install();}
window.FoamLensGranadaG12=Object.freeze({audit});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();