/* FoamLens Desktop v1.4.1 — dual-variable Time-Series Focus. */

/* FOAMLENS_DUAL_TIMESERIES_CORE_START */
function tsdFieldAxisKey(field){
  const f=field||{},quantity=String(f.quantity||f.canonical||f.name||''),unit=String(f.unit||''),dimensions=String(f.dimensions||'');
  return quantity+'|'+unit+'|'+dimensions
}
function tsdVariableSet(primary,secondary){
  primary=String(primary||'');secondary=String(secondary||'');
  if(!primary)return[];
  return secondary&&secondary!==primary?[primary,secondary]:[primary]
}
function tsdPrimaryChoice(vars,current=''){
  const values=(vars||[]).map(f=>String(f?.canonical||'')).filter(Boolean),wanted=String(current||'');
  return values.includes(wanted)?wanted:(values[0]||'')
}
function tsdMatchesVariable(canonical,primary,secondary){
  canonical=String(canonical||'');const selected=tsdVariableSet(primary,secondary);
  return !selected.length||selected.includes(canonical)
}
function tsdAxisPlan(primaryField,secondaryField){
  if(!primaryField)return{primary:'left',secondary:'left',separate:false};
  if(!secondaryField)return{primary:'left',secondary:'left',separate:false};
  const separate=tsdFieldAxisKey(primaryField)!==tsdFieldAxisKey(secondaryField);
  return{primary:'left',secondary:separate?'right':'left',separate}
}
/* FOAMLENS_DUAL_TIMESERIES_CORE_END */

function tsdUi(en,es){try{return typeof flUi==='function'?flUi(en,es):(document.getElementById('language')?.value==='es'?es:en)}catch{return en}}
function tsdEsc(v){try{return typeof esc==='function'?esc(String(v??'')):String(v??'')}catch{return String(v??'')}}
function tsdInjectCss(){
  if(document.getElementById('tsdStyle'))return;
  const style=document.createElement('style');style.id='tsdStyle';style.textContent=`
.timeSeriesControls .tsdGrid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) minmax(0,.85fr);gap:7px}
.tsdAxisHint{display:inline-flex;margin-left:5px;padding:1px 5px;border:1px solid var(--line);border-radius:999px;font-size:8px;font-weight:800;color:var(--muted);vertical-align:middle}
#timeSeriesVariable2:disabled{opacity:.55}
@media(max-width:640px){.timeSeriesControls .tsdGrid{grid-template-columns:1fr}}
`;document.head.appendChild(style)
}
function tsdEnsureUi(){
  const primary=document.getElementById('timeSeriesVariable');if(!primary)return false;
  const primaryField=primary.closest('.field'),row=primaryField?.parentElement;if(!primaryField||!row)return false;
  row.classList.add('tsdGrid');row.classList.remove('row2');
  let secondary=document.getElementById('timeSeriesVariable2');
  if(!secondary){
    const field=document.createElement('div');field.className='field';field.id='timeSeriesVariable2Field';
    field.innerHTML='<label for="timeSeriesVariable2" id="timeSeriesVariable2Label"></label><select id="timeSeriesVariable2"></select>';
    primaryField.insertAdjacentElement('afterend',field);secondary=field.querySelector('select')
  }
  tsdUpdateLabels();return true
}
function tsdUpdateLabels(){
  const p=document.querySelector('label[for="timeSeriesVariable"]'),s=document.getElementById('timeSeriesVariable2Label');
  if(p)p.innerHTML=tsdEsc(tsdUi('Variable 1','Variable 1'))+' <span class="tsdAxisHint">'+tsdEsc(tsdUi('left Y','Y izq.'))+'</span>';
  if(s)s.innerHTML=tsdEsc(tsdUi('Variable 2 (optional)','Variable 2 (opcional)'))+' <span class="tsdAxisHint">'+tsdEsc(tsdUi('auto Y','Y auto'))+'</span>'
}
function tsdFields(ts){
  return[...new Map((ts||[]).map(s=>[s.field.canonical,s.field])).values()].sort((a,b)=>localizedFieldName(a).localeCompare(localizedFieldName(b),undefined,{numeric:true}))
}
function tsdPopulateSecondary(vars,primary,preferred=''){
  const sel=document.getElementById('timeSeriesVariable2');if(!sel)return'';
  if(!primary){sel.innerHTML='<option value="">'+tsdEsc(tsdUi('None','Ninguna'))+'</option>';sel.value='';sel.disabled=true;return''}
  sel.disabled=false;const choices=vars.filter(f=>f.canonical!==primary);
  sel.innerHTML='<option value="">'+tsdEsc(tsdUi('None','Ninguna'))+'</option>'+choices.map(f=>`<option value="${tsdEsc(f.canonical)}">${tsdEsc(localizedFieldName(f))}${f.unit==='-'?'':` [${tsdEsc(f.unit)}]`}</option>`).join('');
  if(choices.some(f=>f.canonical===preferred))sel.value=preferred;else sel.value='';
  return sel.value
}
function tsdMatchesFilters(s){
  if(datasetTypeOf(s)!=='timeseries')return false;
  const primaryEl=document.getElementById('timeSeriesVariable'),primary=primaryEl?.value||'',secondary=document.getElementById('timeSeriesVariable2')?.value||'',showAll=primaryEl?.dataset.showAll==='1';
  const probe=document.getElementById('timeSeriesProbe')?.value||'',caseFilter=document.getElementById('timeSeriesFamily')?.value||'';
  if(!showAll&&!tsdMatchesVariable(s?.field?.canonical,primary,secondary))return false;
  if(probe!==''&&String(s.probe)!==String(probe))return false;
  if(caseFilter&&caseFilter.startsWith('case:')&&String(s.caseId)!==caseFilter.slice(5))return false;
  return true
}
function tsdRefreshTimeSeriesControls(){
  const panel=document.getElementById('timeSeriesControls'),vSel=document.getElementById('timeSeriesVariable'),v2Sel=document.getElementById('timeSeriesVariable2'),pSel=document.getElementById('timeSeriesProbe'),fSel=document.getElementById('timeSeriesFamily');
  if(!panel||!vSel||!v2Sel||!pSel||!fSel)return;
  const ts=timeSeriesOptionsBase();
  if(!ts.length){
    panel.classList.add('hidden');vSel.innerHTML='';v2Sel.innerHTML='';pSel.innerHTML='';fSel.innerHTML='';
    document.getElementById('timeSeriesFocusBadge').textContent=tsdUi('0 curves','0 curvas');
    document.getElementById('timeSeriesFilterHint').textContent=tsdUi('Load probe time-series data to focus the comparison panel.','Carga series temporales de sondas para enfocar el panel de comparación.');
    delete vSel.dataset.autoinit;delete pSel.dataset.autoinit;return
  }
  panel.classList.remove('hidden');
  const oldV=vSel.value||'',oldV2=v2Sel.value||'',oldP=pSel.value||'',oldF=fSel.value||'',vars=tsdFields(ts),showAll=vSel.dataset.showAll==='1';
  vSel.innerHTML=vars.map(f=>`<option value="${tsdEsc(f.canonical)}">${tsdEsc(localizedFieldName(f))}${f.unit==='-'?'':` [${tsdEsc(f.unit)}]`}</option>`).join('');
  vSel.value=tsdPrimaryChoice(vars,oldV);
  vSel.dataset.autoinit='1';
  let secondary=tsdPopulateSecondary(vars,vSel.value,showAll?'':oldV2);
  if(showAll){v2Sel.value='';v2Sel.disabled=true;secondary=''}
  const selected=showAll?[]:tsdVariableSet(vSel.value,secondary);
  const byVars=selected.length?ts.filter(s=>selected.includes(s.field.canonical)):ts;
  const probeEntries=[...new Set(byVars.map(s=>String(s.probe)).filter(v=>v!==''&&v!=='null'&&v!=='undefined'))].sort((a,b)=>Number(a)-Number(b)||String(a).localeCompare(String(b),undefined,{numeric:true}));
  pSel.innerHTML='<option value="">'+tsdEsc(tsdUi('All probes','Todas las sondas'))+'</option>'+probeEntries.map(v=>`<option value="${tsdEsc(v)}">${tsdEsc(tr('probe'))} ${tsdEsc(v)}</option>`).join('');
  if(probeEntries.some(v=>String(v)===String(oldP)))pSel.value=String(oldP);
  else if(!pSel.dataset.autoinit&&probeEntries.length){pSel.value=String(probeEntries[0]);pSel.dataset.autoinit='1'}
  else pSel.value='';
  const byProbe=byVars.filter(s=>pSel.value===''||String(s.probe)===String(pSel.value)),caseMap=new Map();
  for(const item of byProbe)if(item.caseId!=null&&!caseMap.has(item.caseId))caseMap.set(item.caseId,caseById(item.caseId)||{id:item.caseId,name:item.caseName||`Case ${item.caseId}`});
  const caseOptions=[...caseMap.values()].sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),undefined,{numeric:true}));
  fSel.innerHTML='<option value="">'+tsdEsc(tsdUi('All matching cases','Todos los casos coincidentes'))+'</option>'+caseOptions.map(c=>`<option value="case:${c.id}">${tsdEsc(c.name||`${tsdUi('Case','Caso')} ${c.id}`)}</option>`).join('');
  if([...fSel.options].some(o=>o.value===oldF)&&!String(oldF).startsWith('family:'))fSel.value=oldF;else fSel.value='';
  const caseLabel=document.querySelector('label[for="timeSeriesFamily"]');if(caseLabel)caseLabel.textContent=tsdUi('Cases','Casos');
  const matching=timeSeriesOptionsBase().filter(tsdMatchesFilters),uniqueCases=new Set(matching.map(s=>s.caseId)).size;
  document.getElementById('timeSeriesFocusBadge').textContent=`${matching.length} ${tsdUi('curves','curvas')}`;
  const pf=vars.find(f=>f.canonical===vSel.value),sf=vars.find(f=>f.canonical===secondary),plan=tsdAxisPlan(pf,sf);
  const primaryText=showAll?tsdUi('all variables','todas las variables'):(pf?localizedFieldName(pf):''),secondaryText=!showAll&&sf?localizedFieldName(sf):'';
  const probeText=pSel.value!==''?`${tr('probe')} ${pSel.value}`:tsdUi('all probes','todas las sondas');
  const varsText=secondaryText?`${primaryText} [Y-L] + ${secondaryText} [${plan.separate?'Y-R':'Y-L'}]`:primaryText;
  document.getElementById('timeSeriesFilterHint').textContent=tsdUi(
    `Showing ${matching.length} matching time-series curves across ${uniqueCases} case(s) · ${varsText} · ${probeText}.`,
    `Mostrando ${matching.length} curvas temporales coincidentes en ${uniqueCases} caso(s) · ${varsText} · ${probeText}.`
  )
}
function tsdPatchAssignments(){
  if(typeof assignments!=='function'||assignments.__tsdPatched)return;
  const previous=assignments;assignments=function(vis){
    const out=previous.apply(this,arguments);
    if(currentDataView!=='timeseries')return out;
    const primary=document.getElementById('timeSeriesVariable')?.value||'',secondary=document.getElementById('timeSeriesVariable2')?.value||'';
    if(!primary||!secondary||primary===secondary)return out;
    const fields=tsdFields(timeSeriesOptionsBase()),pf=fields.find(f=>f.canonical===primary),sf=fields.find(f=>f.canonical===secondary),plan=tsdAxisPlan(pf,sf);
    for(const item of vis||[]){
      if(item.axis==='Left'||item.axis==='Right')continue;
      if(item?.field?.canonical===primary)out.set(item.id,plan.primary);
      else if(item?.field?.canonical===secondary)out.set(item.id,plan.secondary)
    }
    return out
  };assignments.__tsdPatched=true
}
function tsdInstall(){
  tsdInjectCss();if(!tsdEnsureUi())return false;
  timeSeriesMatchesSelection=tsdMatchesFilters;
  refreshTimeSeriesControls=tsdRefreshTimeSeriesControls;
  tsdPatchAssignments();
  const primary=document.getElementById('timeSeriesVariable'),secondary=document.getElementById('timeSeriesVariable2');
  if(primary&&!primary.dataset.tsdModeWired){
    primary.dataset.tsdModeWired='1';primary.addEventListener('change',()=>{delete primary.dataset.showAll},true)
  }
  if(secondary&&!secondary.dataset.tsdWired){
    secondary.dataset.tsdWired='1';secondary.addEventListener('change',()=>{if(primary)delete primary.dataset.showAll;stopAllPlayback();animationLockedRanges=null;refreshTimeSeriesControls();activeId=null;pinnedPoints=[];renderList();updateMeta();draw()})
  }
  const reset=document.getElementById('timeSeriesResetFilters');if(reset&&!reset.dataset.tsdWired){reset.dataset.tsdWired='1';reset.addEventListener('click',()=>{if(primary)delete primary.dataset.showAll;if(secondary)secondary.value=''},true)}
  const all=document.getElementById('timeSeriesShowAllVars');if(all&&!all.dataset.tsdWired){all.dataset.tsdWired='1';all.addEventListener('click',()=>{if(primary)primary.dataset.showAll='1';if(secondary)secondary.value=''},true)}
  document.addEventListener('foamlens-language-change',()=>{tsdUpdateLabels();refreshTimeSeriesControls()});
  refreshTimeSeriesControls();return true
}
tsdInstall();
window.FoamLensDualTimeSeries={tsdFieldAxisKey,tsdVariableSet,tsdPrimaryChoice,tsdMatchesVariable,tsdAxisPlan,tsdRefreshTimeSeriesControls};
