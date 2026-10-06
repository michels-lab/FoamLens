/* FoamLens Desktop v1.3.0 — robust multi-region context. */

/* FOAMLENS_MULTI_REGION_CORE_START */
function mrNormalizePath(v){return String(v||'').replace(/\\/g,'/').split('/').filter(Boolean)}
function mrKnownRegions(caseObj){
  return [...new Set([
    ...(caseObj?.discoveryModel?.regions||[]),
    ...(caseObj?.discovery?.regions||[])
  ].map(String).filter(Boolean))].sort()
}
function mrSeriesRegionFromMetadata(seriesObj,caseObj){
  const explicit=String(seriesObj?.region||seriesObj?.regionName||seriesObj?.field?.region||'').trim();
  if(explicit)return explicit;
  const regions=mrKnownRegions(caseObj);if(!regions.length)return'';
  const parts=mrNormalizePath(seriesObj?.sourcePath||seriesObj?.fileName||'');
  const hits=regions.filter(r=>parts.includes(r)).sort((a,b)=>b.length-a.length);
  if(hits.length)return hits[0];
  return regions.length===1?regions[0]:''
}
function mrRegionsForContext(caseList,activeCaseId){
  const list=Array.isArray(caseList)?caseList:[];
  if(activeCaseId!=null){
    const c=list.find(x=>Number(x?.id)===Number(activeCaseId));
    return mrKnownRegions(c)
  }
  return [...new Set(list.flatMap(mrKnownRegions))].sort()
}
/* FOAMLENS_MULTI_REGION_CORE_END */

let mrApplyingContextEffects=false;

function mrContextSnapshot(){
  return{
    caseId:activeContextCaseId==null?null:Number(activeContextCaseId),
    region:String(activeContextRegion||'')
  }
}
function mrValidateContext(next=mrContextSnapshot()){
  let caseId=next?.caseId==null||next?.caseId===''?null:Number(next.caseId);
  if(caseId!=null&&!cases.some(c=>Number(c?.id)===caseId))caseId=null;
  const regions=mrRegionsForContext(cases,caseId),requested=String(next?.region||'');
  const region=requested&&regions.includes(requested)?requested:'';
  return{caseId,region,regions}
}
function mrRenderContextPresentation(){
  const state=mrValidateContext();
  activeContextCaseId=state.caseId;activeContextRegion=state.region;
  const project=document.getElementById('globalProjectName'),caseSelect=document.getElementById('globalCaseSelect'),regionSelect=document.getElementById('globalRegionSelect');
  if(project)project.textContent=projectDisplayName();
  if(caseSelect){
    caseSelect.innerHTML=`<option value="">${diagEs()?'Todos los casos':'All cases'}</option>`+cases.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('');
    caseSelect.value=state.caseId==null?'':String(state.caseId)
  }
  if(regionSelect){
    regionSelect.innerHTML=`<option value="">${diagEs()?'Todas las regiones':'All regions'}</option>`+state.regions.map(r=>`<option value="${esc(r)}">${esc(r)}</option>`).join('');
    regionSelect.value=state.region
  }
  return mrContextSnapshot()
}
function mrApplyContextEffects(){
  if(mrApplyingContextEffects)return false;
  mrApplyingContextEffects=true;
  try{
    refreshDatasetControls();
    if(currentDataView==='profile')refreshProfileTimes(document.getElementById('profileTime')?.value||'');
    if(currentDataView==='log'){refreshLogSelectors();syncLogTimeNavigator()}
    if(currentDataView==='catalog')renderDataCatalog();
    renderList();updateMeta();if(currentDataView!=='catalog')draw();
    return true
  }finally{mrApplyingContextEffects=false}
}
function mrSetContext(next={},options={}){
  const current=mrContextSnapshot(),merged={
    caseId:Object.prototype.hasOwnProperty.call(next,'caseId')?next.caseId:current.caseId,
    region:Object.prototype.hasOwnProperty.call(next,'region')?next.region:current.region
  },state=mrValidateContext(merged);
  activeContextCaseId=state.caseId;activeContextRegion=state.region;
  if(options.render!==false)mrRenderContextPresentation();
  if(options.apply!==false)mrApplyContextEffects();
  document.dispatchEvent(new CustomEvent('foamlens-context-change',{detail:{...mrContextSnapshot(),source:options.source||'api'}}));
  return mrContextSnapshot()
}
function mrContextFromPresentation(){
  const caseSelect=document.getElementById('globalCaseSelect'),regionSelect=document.getElementById('globalRegionSelect');
  return{
    caseId:caseSelect?.value?Number(caseSelect.value):null,
    region:regionSelect?.value||''
  }
}

function mrInstall(){
  try{
    seriesRegion=function(s){
      const c=typeof caseById==='function'?caseById(s?.caseId):null;
      return mrSeriesRegionFromMetadata(s,c)
    }
  }catch{}
  try{
    seriesMatchesGlobalContext=function(s){
      const state=mrContextSnapshot();
      if(state.caseId!=null&&Number(s?.caseId)!==Number(state.caseId))return false;
      if(state.region&&seriesRegion(s)!==state.region)return false;
      return true
    };
    refreshGlobalContext=mrRenderContextPresentation;
    applyGlobalContext=function(){return mrSetContext(mrContextFromPresentation(),{source:'presentation'})}
  }catch{}
  try{refreshGlobalContext()}catch{}
  window.FoamLensContextStore={
    get:mrContextSnapshot,
    set:(next,options={})=>mrSetContext(next,options),
    refresh:mrRenderContextPresentation,
    apply:mrApplyContextEffects,
    applying:()=>mrApplyingContextEffects,
    regions:()=>mrValidateContext().regions.slice()
  };
  window.FoamLensMultiRegion={mrKnownRegions,mrSeriesRegionFromMetadata,mrRegionsForContext,mrContextSnapshot,mrSetContext,mrRenderContextPresentation}
}
mrInstall();
