/* Granada #177 G4 — Review/Live readable workspaces.
 * Original source DOM buttons and bound listeners are MOVED, not cloned.
 * Field, Data, Analysis and scientific routines are untouched.
 */
/* GRANADA_G4_CORE_START */
const g4ReviewMain=['reviewTabAuditor','reviewTabFindings'];
const g4ReviewSecondary=['reviewTabInspector','reviewTabConfiguration','reviewTabCompare','reviewTabOutputs','reviewTabRelationships'];
const g4LiveMain=['liveStatus','liveChooseFolder','liveRefreshNow','liveStop'];
function g4Rect(r){
 if(!r)return null;const out={};
 for(const key of ['left','right','top','bottom','width','height']){
  if(typeof r[key]!=='number'||!Number.isFinite(r[key]))return null;
  out[key]=Math.round(r[key]*100)/100
 }
 return out.width>=0&&out.height>=0?out:null
}
function g4Contained(a,b,tol=2){
 a=g4Rect(a);b=g4Rect(b);
 return!!(a&&b&&b.left>=a.left-tol&&b.right<=a.right+tol&&b.top>=a.top-tol&&b.bottom<=a.bottom+tol)
}
/* GRANADA_G4_CORE_END */
const g4El=id=>document.getElementById(id);
let g4Installed=false,g4ReviewDock=null,g4LiveDock=null,g4More=null,g4Observer=null;
function g4Spanish(){
 try{return typeof diagEs==='function'?diagEs():g4El('language')?.value==='es'}
 catch{return g4El('language')?.value==='es'}
}
function g4Sync(){
 if(!g4More)return;
 const tabs=[...document.querySelectorAll('.reviewTab')],active=tabs.find(t=>t.classList.contains('active'));
 const secondary=!!(active&&g4ReviewSecondary.includes(active.id));
 const summary=g4More.querySelector('summary'),label=g4Spanish()?'Más vistas':'More views';
 if(summary){
  summary.textContent=label+(secondary?' · '+String(active.textContent||'').trim().slice(0,55):'');
  summary.setAttribute('aria-label',summary.textContent)
 }
 g4More.classList.toggle('g4SelectedMore',secondary);
 for(const button of tabs)button.setAttribute('aria-pressed',button===active?'true':'false')
}
function g4Review(){
 const surface=g4El('reviewSurface'),card=surface?.querySelector('.surfaceCard'),
  head=card?.querySelector('.surfaceCardHead'),nav=card?.querySelector('.reviewTabs');
 if(!surface||!card||!head||!nav)return false;
 if(g4El('g4ReviewDock'))return true;
 if(!g4ReviewMain.concat(g4ReviewSecondary).every(id=>g4El(id)))return false;
 const dock=document.createElement('div');dock.id='g4ReviewDock';dock.className='g4ReviewDock';
 dock.appendChild(head);dock.appendChild(nav);surface.insertBefore(dock,card);
 card.classList.add('g4ReviewResults');
 const more=document.createElement('details');more.id='g4ReviewMore';more.className='g4ReviewMore';
 const summary=document.createElement('summary');summary.tabIndex=0;more.appendChild(summary);
 const list=document.createElement('div');list.className='g4ReviewMoreList';more.appendChild(list);
 for(const id of g4ReviewSecondary)list.appendChild(g4El(id)); // Original click handlers preserved.
 nav.appendChild(more);g4ReviewDock=dock;g4More=more;
 if(typeof MutationObserver!=='undefined'){
  g4Observer=new MutationObserver(g4Sync);
  for(const tab of document.querySelectorAll('.reviewTab'))
   g4Observer.observe(tab,{attributes:true,attributeFilter:['class']})
 }
 list.addEventListener('click',e=>{if(e.target.closest('.reviewTab')){more.open=false;g4Sync()}});
 nav.addEventListener('click',e=>{if(e.target.closest('.reviewTab'))g4Sync()});
 document.addEventListener('pointerdown',e=>{
  if(more.open&&!more.contains(e.target))more.open=false
 },true);
 document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&more.open){e.preventDefault();more.open=false;summary.focus()}
 },true);
 document.addEventListener('foamlens-language-change',g4Sync);
 g4Sync();return true
}
function g4Live(){
 const surface=g4El('liveSurface'),grid=surface?.querySelector('.surfaceGrid'),
  card=grid?.querySelector('.surfaceCard'),head=card?.querySelector('.surfaceCardHead'),
  hero=card?.querySelector('.liveHero'),run=card?.querySelector('.liveRunHead'),
  progress=card?.querySelector('.liveProgress');
 if(!surface||!grid||!hero||!head||!run||!progress||
    !g4LiveMain.every(id=>g4El(id)))return false;
 if(g4El('g4LiveDock'))return true;
 const dock=document.createElement('div');dock.id='g4LiveDock';dock.className='g4LiveDock';
 // Complete always-on run-control strip: original title/capability, log
 // folder actions, solver state, source context, last update and time progress.
 // Keep the large numerical metric grid in the results card below.
 dock.appendChild(head);dock.appendChild(hero);dock.appendChild(run);dock.appendChild(progress);
 surface.insertBefore(dock,grid);
 g4LiveDock=dock;return true
}
function g4CSS(){
 if(g4El('g4Styles'))return;
 const s=document.createElement('style');s.id='g4Styles';
 s.textContent=[
 '#reviewSurface,#liveSurface{overflow-x:hidden!important}',
 '#reviewSurface .g4ReviewDock,#liveSurface .g4LiveDock{position:sticky;top:0;z-index:70;isolation:isolate;box-sizing:border-box;background:var(--panel);border:1px solid var(--line);box-shadow:0 5px 18px rgba(0,0,0,.09)}',
 '#reviewSurface .g4ReviewDock{border-radius:15px 15px 0 0}',
 '#reviewSurface .g4ReviewDock .surfaceCardHead{padding:13px 16px;background:var(--panel)}',
 '#reviewSurface .g4ReviewDock .surfaceCardHead strong{font-size:14px;letter-spacing:-.01em}',
 '#reviewSurface .g4ReviewDock .reviewTabs{display:flex;align-items:center;gap:8px;flex-wrap:wrap;overflow:visible;min-height:52px;padding:7px 14px;border-top:1px solid var(--line);border-bottom:0}',
 '#reviewSurface .g4ReviewDock .reviewTab{font-size:11px;min-height:35px;padding:8px 12px;border-radius:9px;line-height:1.2;white-space:nowrap}',
 '#reviewSurface .g4ReviewMore{position:relative;margin-left:auto;min-width:0}',
 '#reviewSurface .g4ReviewMore>summary{display:flex;align-items:center;min-height:35px;padding:8px 11px;box-sizing:border-box;list-style:none;cursor:pointer;font-size:11px;font-weight:750;max-width:min(340px,45vw);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;border:1px solid var(--line);border-radius:9px;background:var(--panel2);color:var(--text)}',
 '#reviewSurface .g4ReviewMore>summary::-webkit-details-marker{display:none}',
 '#reviewSurface .g4ReviewMore>summary:after{content:"⌄";margin-left:9px;flex:0 0 auto}',
 '#reviewSurface .g4ReviewMore.g4SelectedMore>summary{color:var(--accent);border-color:var(--accent);background:var(--accentSoft)}',
 '#reviewSurface .g4ReviewMoreList{position:absolute;right:0;top:calc(100% + 7px);z-index:300;display:grid;gap:6px;padding:9px;min-width:230px;max-width:min(390px,calc(100vw - 35px));max-height:min(60vh,430px);overflow:auto;border:1px solid var(--line);border-radius:12px;background:var(--panel);box-shadow:0 15px 33px rgba(0,0,0,.22)}',
 '#reviewSurface .g4ReviewMore:not([open]) .g4ReviewMoreList{display:none}',
 '#reviewSurface .g4ReviewMoreList .reviewTab{display:block;width:100%;text-align:left;white-space:normal;min-height:38px;font-size:11px}',
 '#reviewSurface .g4ReviewResults{border-radius:0 0 15px 15px;border-top:0;box-shadow:none;min-height:250px}',
 '#reviewSurface .g4ReviewResults .reviewPane.active{min-height:200px;padding:17px 18px}',
 '#reviewSurface .g4ReviewResults .reviewPane.active .auditCaseSelect{gap:12px;align-items:end;flex-wrap:wrap}',
 '#reviewSurface .g4ReviewResults .reviewPane.active .auditCaseSelect .field{flex:1 1 260px}',
 '#reviewSurface .g4ReviewResults .reviewPane.active .auditCaseSelect select{min-height:37px}',
 '#reviewSurface .reviewTab:focus-visible,#reviewSurface .g4ReviewMore>summary:focus-visible{outline:2px solid var(--accent);outline-offset:2px}',
 '#liveSurface .g4LiveDock{padding:0 15px 12px;border-radius:15px;margin-bottom:12px}',
 '#liveSurface .g4LiveDock>.surfaceCardHead{padding:12px 0 9px;margin:0 0 9px;border-bottom:1px solid var(--line);background:var(--panel);gap:9px;align-items:center}',
 '#liveSurface .g4LiveDock>.surfaceCardHead .badge{max-width:50%;overflow-wrap:anywhere}',
 '#liveSurface .g4LiveDock .liveHero{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:12px}',
 '#liveSurface .g4LiveDock .liveStatus{font-size:11px;line-height:1.5;overflow-wrap:anywhere;min-width:0}',
 '#liveSurface .g4LiveDock .liveActions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:7px}',
 '#liveSurface .g4LiveDock .liveActions .btn{min-width:110px;min-height:36px;font-size:11px;white-space:nowrap}',
 '#liveSurface .g4LiveDock .liveActions .btn:focus-visible{outline:2px solid var(--accent);outline-offset:2px}',
 '#liveSurface .g4LiveDock .liveRunHead{margin-top:10px;padding-top:9px;border-top:1px solid var(--line);gap:9px;flex-wrap:wrap}',
 '#liveSurface .g4LiveDock .liveRunState{font-size:15px}',
 '#liveSurface .g4LiveDock .liveProgress{margin:8px 0 0}',
 '#liveSurface .liveMetricGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}',
 '#liveSurface .liveMetric{min-width:0;overflow-wrap:anywhere}',
 '@media(max-width:1250px){#liveSurface .g4LiveDock .liveHero{grid-template-columns:1fr}#liveSurface .g4LiveDock .liveActions{justify-content:flex-start}#liveSurface .liveMetricGrid{grid-template-columns:repeat(2,minmax(0,1fr))}}',
 '@media(max-width:760px){#reviewSurface .g4ReviewDock .reviewTabs{gap:5px;padding:7px 9px}#reviewSurface .g4ReviewDock .reviewTab{font-size:10px;padding:7px 9px}#reviewSurface .g4ReviewMore>summary{font-size:10px;padding:7px 8px;max-width:38vw}#liveSurface .g4LiveDock{padding:0 10px 10px}#liveSurface .g4LiveDock .liveActions .btn{flex:1 1 115px;min-width:0}}',
 '@media(max-width:510px){#liveSurface .liveMetricGrid{grid-template-columns:1fr}#reviewSurface .g4ReviewMore{margin-left:0}}'
 ].join('\n');document.head.appendChild(s)
}
function g4Audit(){
 const mode=typeof activeAppMode==='string'?activeAppMode:null;
 const pairs=[['review',g4ReviewDock,g4ReviewMain.concat(g4ReviewSecondary)],['live',g4LiveDock,g4LiveMain]];
 return{schema:'foamlens/granada-177-g4-review-live/1',capturedUtc:new Date().toISOString(),
  cssViewport:{width:window.innerWidth,height:window.innerHeight,dpr:Number(window.devicePixelRatio)||1},
  contexts:pairs.map(([key,dock,ids])=>{
   const active=mode===key,dockRect=active?g4Rect(dock?.getBoundingClientRect?.()):null;
   return{mode:key,active,installed:!!dock,controls:ids.map(id=>{
    const el=g4El(id),secondary=!!el?.closest?.('.g4ReviewMore');
    const rect=active?g4Rect(el?.getBoundingClientRect?.()):null;
    return{id,present:!!el,location:secondary?'secondary-review-menu':'persistent-dock',
     status:!active?'inactive-not-inspected':!el?'missing':secondary?'available-in-more':
      el.disabled?'disabled':rect&&dockRect&&g4Contained(dockRect,rect,6)?'measured-in-dock':'review-geometry'}
   })}
  }),
  confidence:'DOM-current-layout-only',
  limitations:['Inactive screens are NOT visually tested. Layout is not a scientific validity verdict.',
   'Original solver log reader, Review results, original button listeners and Field scene are unmodified.',
   'No scientific case names, user documents, solver log text, findings or paths are captured.',
   'Installed Windows DPI 125–200%, 1024/1280/1920 screenshots and owner aesthetic acceptance remain pending.']}
}
function g4Install(){
 if(g4Installed)return true;
 if(!g4Review()||!g4Live())return false;
 g4CSS();g4Installed=true;
 window.FoamLensGranadaG4={audit:g4Audit,sync:g4Sync,
   primaryReview:g4ReviewMain.slice(),secondaryReview:g4ReviewSecondary.slice()};
 return true
}
(function seek(n=0){if(g4Install())return;if(n<900)requestAnimationFrame(()=>seek(n+1))})();
