/* FoamLens Desktop v1.3.0 — case names are labels, never inferred metadata. */

/* FOAMLENS_GENERIC_CASE_IDENTITY_CORE_START */
function gcStableIndex(value,length){
  const n=Math.max(1,Number(length)||1),s=String(value||'');let h=2166136261;
  for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}
  return (h>>>0)%n
}
function gcCaseFilterValue(caseId){return caseId==null?'':('case:'+String(caseId))}
function gcCaseFilterMatch(seriesObj,filterValue){
  const f=String(filterValue||'');if(!f)return true;
  return f.startsWith('case:')?String(seriesObj?.caseId)===f.slice(5):true
}
/* FOAMLENS_GENERIC_CASE_IDENTITY_CORE_END */

function gcInstall(){
  // Case names are display labels only. No alphabetic/numeric token is interpreted
  // as a family, baseline, variant, solver strategy, material, or experiment type.
  try{caseFamilyInfo=function(){return null}}catch{}
  try{seriesFamilyVisible=function(){return true}}catch{}
  try{profileFamilies=function(){return new Map()}}catch{}
  try{
    automaticSeriesColor=function(s){return variableColor(s?.field||{})}
  }catch{}
  try{
    caseSampleColor=function(c,caseSeries=[]){
      const sample=(caseSeries||[]).find(s=>s?.field)||null;
      return variableColor(sample?.field||{canonical:'case',display:'Case'})
    }
  }catch{}
  try{
    renderQuickFamilyVisibility=function(){
      const wrap=$('familyQuickSection'),list=$('familyQuickList'),shortcuts=$('caseCompareShortcuts');
      if(wrap)wrap.classList.add('hidden');
      if(list)list.innerHTML='';
      if(shortcuts)shortcuts.innerHTML='';
      if($('familyQuickCount'))$('familyQuickCount').textContent='0'
    }
  }catch{}
  try{
    const baseMatches=timeSeriesMatchesSelection;
    timeSeriesMatchesSelection=function(s){
      if(datasetTypeOf(s)!=='timeseries')return false;
      const variable=$('timeSeriesVariable')?.value||'',probe=$('timeSeriesProbe')?.value||'',caseFilter=$('timeSeriesFamily')?.value||'';
      if(variable&&s.field.canonical!==variable)return false;
      if(probe!==''&&String(s.probe)!==String(probe))return false;
      return gcCaseFilterMatch(s,caseFilter)
    };
    void baseMatches
  }catch{}
  try{
    const baseRefresh=refreshTimeSeriesControls;
    refreshTimeSeriesControls=function(...args){
      const out=baseRefresh.apply(this,args),sel=$('timeSeriesFamily');if(!sel)return out;
      const old=sel.value||'',variable=$('timeSeriesVariable')?.value||'',probe=$('timeSeriesProbe')?.value||'';
      const matching=timeSeriesOptionsBase().filter(s=>(!variable||s.field?.canonical===variable)&&(probe===''||String(s.probe)===String(probe)));
      const ids=[...new Set(matching.map(s=>s.caseId).filter(v=>v!=null))];
      const caseRows=ids.map(id=>caseById(id)||{id,name:'Case '+id}).sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),undefined,{numeric:true}));
      sel.innerHTML='<option value="">'+(diagEs()?'Todos los casos compatibles':'All matching cases')+'</option>'+caseRows.map(c=>'<option value="'+gcCaseFilterValue(c.id)+'">'+esc(c.name||('Case '+c.id))+'</option>').join('');
      if([...sel.options].some(o=>o.value===old)&&!old.startsWith('family:'))sel.value=old;else sel.value='';
      const label=document.querySelector('label[for="timeSeriesFamily"]');if(label)label.textContent=diagEs()?'Casos':'Cases';
      return out
    }
  }catch{}
  familyVisibility.clear();
  try{renderQuickFamilyVisibility();refreshTimeSeriesControls();renderCaseManager()}catch{}
  window.FoamLensGenericCaseIdentity={gcStableIndex,gcCaseFilterValue,gcCaseFilterMatch}
}
gcInstall();
