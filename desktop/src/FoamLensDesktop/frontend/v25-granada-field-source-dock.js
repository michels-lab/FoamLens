/* FoamLens · Operación Granada #177 G2 — source-native Field camera workbench.
 * This module reorganizes only the original Field A navigation controls.
 * DO NOT modify original Field physics, B–D source selectors, canvas or renderer.
 */
(function(){
'use strict';
const REQUIRED=['fvOrbitMode','fvPanMode','fvZoomMode','fvFitCamera','fvResetCamera',
  'fvProjectionOrtho','fvProjectionPerspective','fvShowDimensions','fvMeasureTool','fvMeasureClear'];
const PRESETS=['front','back','left','right','top','bottom','iso'];
const GROUPS=[
  {name:'navigate',en:'Navigate',es:'Navegación'},
  {name:'measure',en:'Scale & measure',es:'Escala y medición'},
  {name:'camera',en:'Camera views · XYZ',es:'Vistas de cámara · XYZ'}
];
let mounted=false, original=null, keyHandler=null;
const byId=id=>document.getElementById(id);
function language(){return byId('language')?.value==='es'?'es':'en'}
function canMount(){
  const panel=byId('fieldViewPanel'),tools=panel?.querySelector('.fvViewTools'),
    nav=tools?.querySelector('.fvToolRow'),
    measure=tools?.querySelector('.fvPhysicalToolbar'),
    details=tools?.querySelector('.fvNavPresets'),presets=details?.querySelector('.fvPresetRow');
  if(!panel||!tools||!nav||!measure||!details||!presets)return null;
  if(!REQUIRED.every(id=>byId(id))||
      !PRESETS.every(k=>presets.querySelector('[data-fv-view="'+k+'"]')))return null;
  return {panel,tools,nav,measure,details,presets};
}
function setLabels(){
  const es=language()==='es';
  for(const {name,en,es:translated} of GROUPS){
    const el=byId('fg2Heading-'+name);
    if(el)el.textContent=es?translated:en;
  }
}
function styles(){
  if(byId('fg2Styles'))return;
  const style=document.createElement('style');style.id='fg2Styles';
  style.textContent=[
    'body.appMode-field #fieldViewPanel .fg2Dock{display:grid!important;grid-template-columns:minmax(0,1.05fr) minmax(0,1.15fr) minmax(0,1.65fr);align-items:stretch!important;gap:8px!important;padding:8px!important;margin-bottom:12px;background:var(--panel2);border:1px solid var(--line);border-radius:13px}',
    'body.appMode-field #fieldViewPanel .fg2Group{display:flex;flex-direction:column;gap:7px;min-width:0;padding:7px 9px;background:var(--panel);border:1px solid var(--line);border-radius:10px}',
    'body.appMode-field #fieldViewPanel .fg2Heading{font:750 11px/1.3 inherit;color:var(--muted);letter-spacing:.015em;margin:0}',
    'body.appMode-field #fieldViewPanel .fg2Group .fvToolRow{display:flex;align-content:flex-start;justify-content:flex-start;flex-wrap:wrap;gap:5px;margin:0}',
    'body.appMode-field #fieldViewPanel .fg2Group .btn{min-height:34px;max-width:100%;white-space:normal;padding:6px 9px;font-size:11px}',
    'body.appMode-field #fieldViewPanel .fg2Group .inlineCheck{min-height:34px;display:inline-flex;align-items:center;margin:0 5px}',
    'body.appMode-field #fieldViewPanel .fg2Group [data-fv-view]:focus-visible,body.appMode-field #fieldViewPanel .fg2Group .btn:focus-visible{outline:2px solid var(--accent);outline-offset:2px}',
    'body.appMode-field #fieldViewPanel .fvViewport{min-width:0}',
    'body.appMode-field #fcViewGrid .fcViewportCaption{min-width:0;overflow-wrap:anywhere}',
    'body.appMode-field #fcViewGrid [data-fc-toolbar]{min-width:0;max-width:100%}',
    '@media(max-width:1240px){body.appMode-field #fieldViewPanel .fg2Dock{grid-template-columns:repeat(2,minmax(0,1fr))}body.appMode-field #fieldViewPanel .fg2Group-camera{grid-column:1/-1}}',
    '@media(max-width:760px){body.appMode-field #fieldViewPanel .fg2Dock{grid-template-columns:minmax(0,1fr)}body.appMode-field #fieldViewPanel .fg2Group-camera{grid-column:auto}body.appMode-field #fieldViewPanel .fg2Group{padding:7px}}'
  ].join('\n');
  document.head.appendChild(style);
}
function audit(){
  const panel=byId('fieldViewPanel'),dock=panel?.querySelector('.fg2Dock');
  const sourceIds=REQUIRED.map(id=>({id,present:!!byId(id),
    originalRetained:!!(original?.nodes?.get(id)===byId(id))}));
  const buttons=PRESETS.map(id=>{
    const btn=dock?.querySelector('[data-fv-view="'+id+'"]');
    return{id,visibleInOriginalDock:!!btn,originalRetained:btn===original?.presets?.get(id)};
  });
  return{
    schema:'foamlens/granada-177-field-g2-source-dock/1',
    mounted:!!dock,
    originalEventsPreserved:sourceIds.every(x=>x.originalRetained)&&buttons.every(x=>x.originalRetained),
    groups:GROUPS.map(g=>({name:g.name,present:!!byId('fg2Group-'+g.name)})),
    sourceIds,buttons,
    sceneOwnershipPreserved:byId('fvCanvas')===original?.canvas,
    limits:[
      'Only original Field A navigation controls are reorganized; B/C/D rendering and native source mapping are untouched',
      'Availability of camera buttons does not verify scientific mesh coordinates, GPU output or installed Windows DPI layout',
      'No scientific values, private case paths, user text or screenshots are captured'
    ]
  };
}
function install(){
  if(mounted)return true;
  const parts=canMount();
  if(!parts)return false;
  // Record original elements before mutation to prove the original handlers stay bound.
  const nodes=new Map(REQUIRED.map(id=>[id,byId(id)]));
  const presetNodes=new Map(PRESETS.map(id=>[id,parts.presets.querySelector('[data-fv-view="'+id+'"]')]));
  const canvas=byId('fvCanvas');
  styles();
  parts.tools.classList.add('fg2Dock');
  for(const [group,node] of [parts.nav,parts.measure,parts.presets].entries()){
    const spec=GROUPS[group],wrapper=document.createElement('section'),
      heading=document.createElement('h3');
    wrapper.id='fg2Group-'+spec.name;wrapper.className='fg2Group fg2Group-'+spec.name;
    wrapper.setAttribute('role','group');
    wrapper.setAttribute('aria-label',spec.en);
    heading.id='fg2Heading-'+spec.name;heading.className='fg2Heading';wrapper.appendChild(heading);
    parts.tools.appendChild(wrapper);
    wrapper.appendChild(node); // Moves original element; never clones click listeners.
  }
  // The original <details> hid all 7 camera directions; its original button row
  // is now directly visible in a real, semantically named workbench group.
  parts.details.remove();
  keyHandler=event=>{
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key))return;
    const buttons=[...parts.presets.querySelectorAll('[data-fv-view]')].filter(el=>!el.disabled);
    if(!buttons.length)return;
    let index=buttons.indexOf(document.activeElement);
    if(index<0)index=0;
    const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:
      (index+(['ArrowRight','ArrowDown'].includes(event.key)?1:-1)+buttons.length)%buttons.length;
    event.preventDefault();buttons[next].focus();
  };
  parts.presets.addEventListener('keydown',keyHandler);
  original={nodes,presets:presetNodes,canvas};
  mounted=true;
  setLabels();
  window.FoamLensGranadaFieldG2={audit,refreshLanguage:setLabels,installed:()=>mounted};
  return true;
}
function begin(){
  if(install())return;
  if(typeof MutationObserver==='function'){
    const obs=new MutationObserver(()=>{if(install())obs.disconnect()});
    obs.observe(document.documentElement,{childList:true,subtree:true});
  }else{
    let remaining=180;function attempt(){if(install()||--remaining<=0)return;requestAnimationFrame(attempt)}
    requestAnimationFrame(attempt);
  }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',begin,{once:true});
else begin();
document.addEventListener('foamlens-language-change',setLabels);
})();
