/* FoamLens Desktop v1.4.1 — collapsible sidebar sections. */

/* FOAMLENS_SIDEBAR_SECTIONS_CORE_START */
const SB_STORAGE_KEY='foamlens.sidebar.sections.v1';
function sbNormalizeState(value){
  const out={};if(!value||typeof value!=='object'||Array.isArray(value))return out;
  for(const [key,v] of Object.entries(value))if(typeof v==='boolean')out[String(key)]=v;
  return out
}
function sbDefaultCollapsed(key){return String(key)==='case-comparison'}
function sbSectionKey(card,index=0){
  if(!card)return 'section-'+index;
  if(card.querySelector?.('#caseManagerTitle'))return 'case-comparison';
  if(card.id==='elementEditorCard')return 'figure-element-editor';
  if(card.querySelector?.('#countBadge'))return 'load-data';
  if(card.querySelector?.('#thesisFigureBtn'))return 'figure';
  if(card.querySelector?.('#selBadge'))return 'selected-curve';
  if(card.querySelector?.('#tliq'))return 'phase-change';
  return 'section-'+index
}
/* FOAMLENS_SIDEBAR_SECTIONS_CORE_END */

function sbUi(en,es){
  try{return typeof flUi==='function'?flUi(en,es):(document.getElementById('language')?.value==='es'?es:en)}catch{return en}
}
function sbLoadState(){
  try{return sbNormalizeState(JSON.parse(localStorage.getItem(SB_STORAGE_KEY)||'{}'))}catch{return{}}
}
function sbSaveState(state){
  try{localStorage.setItem(SB_STORAGE_KEY,JSON.stringify(sbNormalizeState(state)))}catch{}
}
function sbToggleLabel(collapsed){
  return collapsed?sbUi('Expand section','Expandir sección'):sbUi('Collapse section','Contraer sección')
}
function sbSetCollapsed(card,collapsed,{persist=true,state=null}={}){
  if(!card)return;collapsed=!!collapsed;card.classList.toggle('flSidebarSectionCollapsed',collapsed);
  card.dataset.sidebarCollapsed=collapsed?'1':'0';
  const button=card.querySelector(':scope > .cardhead > .flSidebarSectionToggle');
  if(button){
    button.setAttribute('aria-expanded',collapsed?'false':'true');
    button.setAttribute('aria-label',sbToggleLabel(collapsed));
    button.title=sbToggleLabel(collapsed);
    button.textContent=collapsed?'›':'⌄'
  }
  if(persist){
    const current=state||sbLoadState();current[card.dataset.sidebarSectionKey]=collapsed;sbSaveState(current)
  }
}
function sbMoveCaseManagerLast(sidebar){
  const manager=document.getElementById('caseManagerTitle')?.closest('.card');
  if(sidebar&&manager&&manager.parentElement===sidebar)sidebar.appendChild(manager);
  return manager
}
function sbUpdateLabels(){
  document.querySelectorAll('.sidebar > .card.flSidebarSection').forEach(card=>{
    const collapsed=card.classList.contains('flSidebarSectionCollapsed'),button=card.querySelector(':scope > .cardhead > .flSidebarSectionToggle');
    if(button){button.setAttribute('aria-label',sbToggleLabel(collapsed));button.title=sbToggleLabel(collapsed)}
  })
}
function sbInstall(){
  const sidebar=document.querySelector('.sidebar');if(!sidebar)return false;
  sbMoveCaseManagerLast(sidebar);
  const state=sbLoadState(),cards=[...sidebar.children].filter(el=>el.matches?.('.card'));
  cards.forEach((card,index)=>{
    const head=card.querySelector(':scope > .cardhead');if(!head)return;
    const key=sbSectionKey(card,index);card.dataset.sidebarSectionKey=key;card.classList.add('flSidebarSection');head.classList.add('flSidebarSectionHead');
    let button=head.querySelector(':scope > .flSidebarSectionToggle');
    if(!button){
      button=document.createElement('button');button.type='button';button.className='flSidebarSectionToggle';
      button.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();sbSetCollapsed(card,!card.classList.contains('flSidebarSectionCollapsed'))});
      head.appendChild(button)
    }
    const collapsed=Object.prototype.hasOwnProperty.call(state,key)?state[key]:sbDefaultCollapsed(key);
    sbSetCollapsed(card,collapsed,{persist:false,state})
  });
  sbUpdateLabels();return true
}
function sbInjectCss(){
  if(document.getElementById('flSidebarSectionsStyle'))return;
  const style=document.createElement('style');style.id='flSidebarSectionsStyle';style.textContent=`
.sidebar > .card.flSidebarSection{transition:border-color .16s ease,background .16s ease}
.sidebar > .card.flSidebarSection > .flSidebarSectionHead{justify-content:flex-start!important;gap:7px}
.sidebar > .card.flSidebarSection > .flSidebarSectionHead > strong{margin-right:auto;min-width:0}
.flSidebarSectionToggle{flex:0 0 auto;width:25px;height:25px;padding:0;border:1px solid var(--line);border-radius:8px;background:var(--panel2);color:var(--muted);display:grid;place-items:center;font-size:17px;line-height:1;cursor:pointer;transition:background .14s ease,color .14s ease,border-color .14s ease,transform .14s ease}
.flSidebarSectionToggle:hover{background:var(--accentSoft);color:var(--text);border-color:var(--accent)}
.sidebar > .card.flSidebarSectionCollapsed > :not(.cardhead){display:none!important}
.sidebar > .card.flSidebarSectionCollapsed > .cardhead{margin-bottom:0!important}
.sidebar > .card.flSidebarSectionCollapsed{padding-bottom:12px}
`;document.head.appendChild(style)
}
function sbInit(){
  sbInjectCss();if(!sbInstall()){
    const observer=new MutationObserver(()=>{if(sbInstall())observer.disconnect()});observer.observe(document.documentElement,{childList:true,subtree:true})
  }
  document.addEventListener('foamlens-language-change',sbUpdateLabels)
}
sbInit();
window.FoamLensSidebarSections={sbNormalizeState,sbDefaultCollapsed,sbSectionKey,sbInstall,sbSetCollapsed,sbMoveCaseManagerLast};
