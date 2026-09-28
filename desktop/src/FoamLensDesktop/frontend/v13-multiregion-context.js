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

function mrInstall(){
  try{
    seriesRegion=function(s){
      const c=typeof caseById==='function'?caseById(s?.caseId):null;
      return mrSeriesRegionFromMetadata(s,c)
    }
  }catch{}
  try{
    refreshGlobalContext=function(){
      if(!$('globalCaseSelect'))return;
      $('globalProjectName').textContent=projectDisplayName();
      const old=activeContextCaseId==null?'':String(activeContextCaseId);
      $('globalCaseSelect').innerHTML=`<option value="">${diagEs()?'Todos los casos':'All cases'}</option>`+cases.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('');
      if(old&&cases.some(c=>String(c.id)===old))$('globalCaseSelect').value=old;
      else{activeContextCaseId=null;$('globalCaseSelect').value=''}
      const regions=mrRegionsForContext(cases,activeContextCaseId),oldRegion=activeContextRegion||'';
      $('globalRegionSelect').innerHTML=`<option value="">${diagEs()?'Todas las regiones':'All regions'}</option>`+regions.map(r=>`<option value="${esc(r)}">${esc(r)}</option>`).join('');
      if(oldRegion&&regions.includes(oldRegion)){$('globalRegionSelect').value=oldRegion;activeContextRegion=oldRegion}
      else{activeContextRegion='';$('globalRegionSelect').value=''}
    }
  }catch{}
  try{refreshGlobalContext()}catch{}
  window.FoamLensMultiRegion={mrKnownRegions,mrSeriesRegionFromMetadata,mrRegionsForContext}
}
mrInstall();
