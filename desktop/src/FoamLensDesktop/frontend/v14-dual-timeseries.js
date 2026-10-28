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

// Preserve the literal imported scientific identity. A bare numeric column
// identifier has no demonstrated physical quantity, even if it plots correctly.
function tsdUnverifiedColumn(field){
  const f=field||{},raw=String(f.canonical??'').trim();
  if(!/^\d+(?:\.\d+)?$/.test(raw))return null;
  const display=String(f.display??'').trim(),original=String(f.original??'').trim();
  const quantity=String(f.quantity??'').trim().toLowerCase();
  if((display&&display!==raw)||(original&&original!==raw)||
     (quantity&&quantity!=='unknown'))return null;
  return raw
}
function tsdEvidenceFieldLabel(field,locale='en'){
  const column=tsdUnverifiedColumn(field);
  if(column===null)return null;
  return locale==='es'?'Columna '+column+' (sin identificar)':
    'Column '+column+' (unidentified)'
}
function tsdSourceEvidence(allSeries,canonical){
  const key=String(canonical??'');
  const rows=(allSeries||[]).filter(s=>String(s?.field?.canonical??'')===key);
  const distinct=a=>[...new Set(a.filter(Boolean))];
  const fields=rows.map(s=>s.field||{});
  const units=distinct(fields.map(f=>String(f.unit??'').trim()).filter(v=>v&&v!=='-'&&v!=='?'));
  const dimensions=distinct(fields.map(f=>String(f.dimensions??'').trim()).filter(v=>v&&v!=='?'));
  const quantities=distinct(fields.map(f=>String(f.quantity??'').trim()).filter(v=>v&&v!=='unknown'));
  // A derived: key is NOT a real OpenFOAM file path; keep case/region evidence
  // but mark exact original per-frame file reference as unavailable.
  const sources=distinct(rows.map(s=>String(s.sourcePath||s.fileName||'').trim()).filter(p=>!p.startsWith('derived:')));
  const sourceFields=distinct(rows.map(s=>String(s.postProcessing?.fieldName||'').trim()));
  const unknownColumns=rows.some(s=>tsdUnverifiedColumn(s.field)!==null);
  return {
    canonical:key,curves:rows.length,sources,sourceFields,units,dimensions,quantities,
    unknownColumns,
    inconsistentUnits:units.length>1,
    inconsistentDimensions:dimensions.length>1,
    inconsistentQuantities:quantities.length>1,
    incompleteUnits:fields.some(f=>!f.unit||f.unit==='-'||f.unit==='?'),
    missingSource:rows.some(s=>!(s.sourcePath||s.fileName)||String(s.sourcePath||'').startsWith('derived:')),
    histories:rows.filter(s=>s.fieldHistoryEvidence?.schema==='foamlens/field-history-evidence/1').map(s=>s.fieldHistoryEvidence),
    incompleteHistories:rows.some(s=>s.fieldHistoryEvidence?.omittedTimeCount>0),
    unverifiedHistoryDimensions:rows.some(s=>s.fieldHistoryEvidence&& !s.fieldHistoryEvidence.verifiedDimensions)
  }
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
.tsdScientificEvidence{margin-top:8px;max-width:100%;white-space:normal;overflow-wrap:anywhere}
.tsdScientificEvidence summary{cursor:pointer;font-weight:700;padding:6px 0}
.tsdEvidenceGroup{padding:7px 0;border-top:1px solid var(--line);line-height:1.5}
.tsdEvidenceWarning{margin:4px 0;color:var(--warning,#b86b24);font-weight:700}
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
// Existing curves and available 3D OpenFOAM fields are different catalogs.
// Preview field identity only; parsing thousands of frames requires Build.
function tsdSourceFieldCatalog(){
  const fields=[];
  try{
    for(const c of (typeof fwFieldTsReadyCases==='function'?fwFieldTsReadyCases():[])){
      const regions=typeof fvReadyRegions==='function'?fvReadyRegions(c):[];
      for(const region of regions){
        const groups=typeof fvFieldGroups==='function'?fvFieldGroups(c,region,null,'any'):[];
        for(const group of groups)if(['scalar','vector'].includes(group.kind)&&group.name&&(group.times||[]).length){
          fields.push({caseId:c.id,caseName:c.name||String(c.id),region,name:group.name,
            kind:group.kind,components:group.kind==='vector'?['x','y','z','magnitude']:['value'],
            timeCount:(group.times||[]).length})
        }
      }
    }
  }catch(e){console.error('Time Series field inventory',e)}
  return fields
}
function tsdUpdateSourceCatalog(){
  const panel=document.getElementById('timeSeriesControls');
  if(!panel)return;
  let info=document.getElementById('tsdSourceFieldCount');
  if(!info){
    info=document.createElement('div');info.id='tsdSourceFieldCount';info.className='timeSeriesHint';
    info.setAttribute('role','status');
    const actions=panel.querySelector('.timeSeriesActions');
    (actions||panel).insertAdjacentElement('afterend',info)
  }
  const catalog=tsdSourceFieldCatalog(),datasets=timeSeriesOptionsBase();
  const unique=new Set(catalog.map(g=>String(g.caseId)+'|'+String(g.region)+'|'+g.name)).size;
  info.textContent=tsdUi('Existing measured time-series: '+datasets.length+' · OpenFOAM 3D fields available for explicit history generation: '+unique+'.',
    'Series temporales existentes: '+datasets.length+' · Campos OpenFOAM 3D disponibles para generar historias explícitamente: '+unique+'.');
  const details=document.getElementById('fwDataFieldHistories');
  if(details&&catalog.length&&datasets.length===0){
    details.open=true;
    try{if(typeof fwRefreshFieldTsControls==='function')fwRefreshFieldTsControls()}catch(e){console.error(e)}
  }
}

function tsdPatchScientificLabels(){
  if(typeof localizedFieldName!=='function'||localizedFieldName.__tsdEvidencePatched)return;
  const original=localizedFieldName;
  localizedFieldName=function(field){
    if(typeof currentDataView!=='undefined'&&currentDataView==='timeseries'){
      const label=tsdEvidenceFieldLabel(field,tsdUi('en','es'));
      if(label!==null)return label
    }
    return original.apply(this,arguments)
  };
  localizedFieldName.__tsdEvidencePatched=true
}
function tsdUpdateScientificEvidence(){
  const hint=document.getElementById('timeSeriesFilterHint'),
    primary=document.getElementById('timeSeriesVariable'),
    secondary=document.getElementById('timeSeriesVariable2');
  if(!hint||!primary)return;
  let panel=document.getElementById('tsdScientificEvidence');
  const rows=timeSeriesOptionsBase().filter(tsdMatchesFilters);
  if(!rows.length||primary.dataset.showAll==='1'){
    if(panel)panel.remove();
    return
  }
  const selected=[primary.value,secondary?.value||''].filter(Boolean);
  if(!selected.length){if(panel)panel.remove();return}
  const evidence=selected.map(id=>tsdSourceEvidence(rows,id));
  const warnings=evidence.filter(e=>e.unknownColumns||e.inconsistentUnits||
    e.inconsistentDimensions||e.inconsistentQuantities||e.missingSource||
    e.incompleteHistories||e.unverifiedHistoryDimensions);
  if(!panel){
    panel=document.createElement('details');panel.id='tsdScientificEvidence';
    panel.className='timeSeriesHint tsdScientificEvidence';
    hint.insertAdjacentElement('afterend',panel)
  }
  const wasOpen=panel.open;panel.replaceChildren();
  const title=document.createElement('summary');
  title.textContent=tsdUi('Scientific source evidence','Evidencia de origen científico')+
    ' · '+evidence.length+' '+tsdUi('field(s)','campo(s)')+
    (warnings.length?' · '+warnings.length+' '+tsdUi('warning(s)','advertencia(s)'):'');
  panel.appendChild(title);
  for(const e of evidence){
    const group=document.createElement('div');group.className='tsdEvidenceGroup';
    const line=document.createElement('strong');
    line.textContent=e.canonical+' · '+e.curves+' '+tsdUi('curve(s)','curva(s)');
    group.appendChild(line);
    const entry=(label,values)=>{
      const node=document.createElement('div');
      node.textContent=label+': '+(values.length?values.join(' | '):tsdUi('not available','no disponible'));
      group.appendChild(node)
    };
    for(const h of e.histories){
      const detail=document.createElement('div');
      detail.textContent=tsdUi('Source history','Historia de origen')+': '+
        h.caseName+' ['+h.caseId+'] · '+(h.region||tsdUi('default region','región predeterminada'))+
        ' · '+h.field+' · '+h.component+' · '+h.sourceKind+
        ' · '+h.finiteSampleCount+'/'+h.originalTimeCount+' '+tsdUi('valid source times','tiempos de origen válidos');
      group.appendChild(detail)
    }
    entry(tsdUi('Original source fields','Campos originales'),e.sourceFields);
    entry(tsdUi('Units','Unidades'),e.units);
    entry(tsdUi('Dimensions','Dimensiones'),e.dimensions);
    entry(tsdUi('Source files','Archivos de origen'),e.sources.slice(0,4));
    if(e.sources.length>4)entry(tsdUi('Additional sources','Fuentes adicionales'),[String(e.sources.length-4)]);
    const notices=[];
    if(e.unknownColumns)notices.push(tsdUi(
      'Numeric column identifier is not a verified physical field. Confirm its source header before interpreting the curve.',
      'El identificador numérico no es un campo físico verificado. Comprueba el encabezado original antes de interpretar la curva.'));
    if(e.inconsistentUnits||e.inconsistentDimensions||e.inconsistentQuantities)
      notices.push(tsdUi(
        'Incompatible known unit/dimension/quantity metadata across curves: comparison requires review.',
        'Metadatos conocidos de unidades/dimensiones/magnitudes incompatibles: revisa la comparación.'));
    if(e.incompleteUnits)notices.push(tsdUi(
      'At least one source has no verified unit; no unit is inferred.',
      'Al menos una fuente no tiene unidades verificadas; no se infieren.'));
    if(e.missingSource)notices.push(tsdUi(
      'At least one curve lacks a source file reference.',
      'Al menos una curva carece de referencia al archivo de origen.'));
    if(e.incompleteHistories)notices.push(tsdUi(
      'Some physical source times had no finite samples; no missing data was interpolated.',
      'Algunos tiempos físicos no dieron muestras finitas; no se interpolaron datos faltantes.'));
    if(e.unverifiedHistoryDimensions)notices.push(tsdUi(
      'One source history lacks verified per-frame dimensions; confirm its OpenFOAM header.',
      'Una historia carece de dimensiones verificadas por frame; comprueba su encabezado OpenFOAM.'));
    if(notices.length){const warning=document.createElement('p');
      warning.className='tsdEvidenceWarning';warning.textContent=notices.join(' ');
      group.appendChild(warning)}
    panel.appendChild(group)
  }
  panel.open=wasOpen||warnings.length>0
}

function tsdRefreshTimeSeriesControls(){
  const panel=document.getElementById('timeSeriesControls'),vSel=document.getElementById('timeSeriesVariable'),v2Sel=document.getElementById('timeSeriesVariable2'),pSel=document.getElementById('timeSeriesProbe'),fSel=document.getElementById('timeSeriesFamily');
  if(!panel||!vSel||!v2Sel||!pSel||!fSel)return;
  const ts=timeSeriesOptionsBase();
  if(!ts.length){
    // Never hide the Field History builder merely because no histories have
    // been generated; that is precisely when it must be discoverable.
    panel.classList.remove('hidden');
    vSel.innerHTML='<option value="">'+tsdEsc(tsdUi('No generated curves yet','Aún no hay curvas generadas'))+'</option>';
    v2Sel.innerHTML='<option value="">'+tsdEsc(tsdUi('None','Ninguna'))+'</option>';
    v2Sel.disabled=true;pSel.innerHTML='';fSel.innerHTML='';
    document.getElementById('timeSeriesFocusBadge').textContent=tsdUi('0 existing curves','0 curvas existentes');
    document.getElementById('timeSeriesFilterHint').textContent=tsdUi(
      'No measured time-series has been imported or built. Select an available 3D field below and explicitly build its physical-time history.',
      'No se ha importado o calculado una serie temporal medida. Selecciona abajo un campo 3D disponible y construye explícitamente su historia en tiempo físico.');
    delete vSel.dataset.autoinit;delete pSel.dataset.autoinit;
    tsdUpdateSourceCatalog();tsdUpdateScientificEvidence();return
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
  const allButton=document.getElementById('timeSeriesShowAllVars');if(allButton){allButton.classList.toggle('primary',showAll);allButton.classList.toggle('soft',!showAll);allButton.textContent=showAll?tsdUi('Showing all variables','Mostrando todas'):tsdUi('Show all variables','Mostrar todas las variables')}
  const primaryText=showAll?tsdUi('all variables','todas las variables'):(pf?localizedFieldName(pf):''),secondaryText=!showAll&&sf?localizedFieldName(sf):'';
  const probeText=pSel.value!==''?`${tr('probe')} ${pSel.value}`:tsdUi('all probes','todas las sondas');
  const varsText=secondaryText?`${primaryText} [Y-L] + ${secondaryText} [${plan.separate?'Y-R':'Y-L'}]`:primaryText;
  document.getElementById('timeSeriesFilterHint').textContent=tsdUi(
    `Showing ${matching.length} matching time-series curves across ${uniqueCases} case(s) · ${varsText} · ${probeText}.`,
    `Mostrando ${matching.length} curvas temporales coincidentes en ${uniqueCases} caso(s) · ${varsText} · ${probeText}.`
  )
;
  tsdUpdateSourceCatalog();tsdUpdateScientificEvidence()
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
  tsdPatchScientificLabels();tsdInjectCss();if(!tsdEnsureUi())return false;
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
  const all=document.getElementById('timeSeriesShowAllVars');if(all&&!all.dataset.tsdWired){all.dataset.tsdWired='1';all.addEventListener('click',()=>{if(primary){if(primary.dataset.showAll==='1')delete primary.dataset.showAll;else primary.dataset.showAll='1'}if(secondary)secondary.value=''},true)}
  document.addEventListener('foamlens-language-change',()=>{tsdUpdateLabels();refreshTimeSeriesControls()});
  refreshTimeSeriesControls();return true
}
tsdInstall();
window.FoamLensDualTimeSeries={tsdFieldAxisKey,tsdVariableSet,tsdPrimaryChoice,tsdMatchesVariable,tsdAxisPlan,tsdUnverifiedColumn,tsdEvidenceFieldLabel,tsdSourceEvidence,tsdRefreshTimeSeriesControls};
