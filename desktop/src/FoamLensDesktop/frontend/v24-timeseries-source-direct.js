/* Operación Granada GRANDE — #146 / T1 actual OpenFOAM Field History discoverability.
 * Does not parse synthetic fields. Original fwBuildFieldTimeSeries owns numeric
 * calculations, real physical time values, origins and chart commit.
 */
/* GRANADA_T1_CORE_START */
function t1Catalog(cases,regions,groups,components,times){
 const rows=[],seen=new Set();
 for(const c of (Array.isArray(cases)?cases:[])){
  if(c?.id==null)continue;
  for(const region of (regions(c)||[])){
   for(const g of (groups(c,region)||[])){
    if(!['scalar','vector'].includes(g?.kind))continue;
    const physical=times(g.times||[]);
    if(!Array.isArray(physical)||!physical.length)continue;
    const field=String(g.name||'').trim(),id=[String(c.id),String(region||''),field,g.kind].join('\u0000');
    if(!field||seen.has(id))continue;seen.add(id);
    const choices=(components(g)||[]).filter(x=>x&&x.v!=null)
      .map(x=>({value:String(x.v),display:String(x.t??x.v)}));
    rows.push({caseId:c.id,caseName:String(c.name||'Unnamed case'),region:String(region||''),
      field,kind:g.kind,storage:String(g.storage||''),frames:physical.length,
      firstTime:physical[0],lastTime:physical[physical.length-1],components:choices,
      evidence:'real imported OpenFOAM field metadata; original file data not loaded by catalog'});
    if(rows.length>=5000)return{rows,truncated:true}
   }
  }
 }
 return{rows,truncated:false}
}
function t1Choice(catalog,selected){
 return catalog?.rows?.find(x=>x.caseId===selected?.caseId&&x.region===selected.region&&
  x.field===selected.field&&x.kind===selected.kind)||null
}
function t1ValidPlot(s){
 return s?.datasetType==='timeseries'&&s.derivedKind==='field_history_workspace'&&
  Array.isArray(s.t)&&Array.isArray(s.y)&&s.t.length===s.y.length&&
  s.t.length>0&&s.t.every(Number.isFinite)&&s.y.every(Number.isFinite)&&
  !!s.fieldHistoryKey
}
/* GRANADA_T1_CORE_END */
const t1ById=id=>document.getElementById(id);
let t1Installed=false,t1CatalogState={rows:[],truncated:false},t1Running=null,t1Canceled=false;
function t1Tr(en,es){
 try{return typeof fwUi==='function'?fwUi(en,es):en}catch{return en}
}
function t1Status(message,kind='info'){
 const el=t1ById('t1DirectStatus');if(!el)return;
 el.textContent=String(message||'');el.dataset.kind=kind
}
function t1Ready(){
 try{
  if(typeof fwFieldTsReadyCases!=='function'||typeof fvReadyRegions!=='function'||
     typeof fvFieldGroups!=='function'||typeof fvFieldComponents!=='function'||
     typeof fwPhysicalTimes!=='function')return{rows:[],truncated:false};
  return t1Catalog(fwFieldTsReadyCases(),c=>fvReadyRegions(c),
   (c,r)=>fvFieldGroups(c,r,null,'any'),g=>fvFieldComponents(g),tt=>fwPhysicalTimes(tt))
 }catch{return{rows:[],truncated:false}}
}
function t1Escape(v){
 return String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))
}
function t1Visible(){
 const value=String(t1ById('t1Filter')?.value||'').trim().toLocaleLowerCase();
 const all=t1CatalogState.rows;
 return (value?all.filter(x=>(x.caseName+' '+x.region+' '+x.field+' '+x.kind).toLocaleLowerCase().includes(value)):all)
}
function t1Render(){
 const host=t1ById('t1Entries'),status=t1ById('t1Count');if(!host||!status)return;
 const matches=t1Visible(),shown=matches.slice(0,45);
 status.textContent=t1Tr('Source-backed fields','Campos reales')+': '+matches.length+'/'+
   t1CatalogState.rows.length+' · '+t1Tr('shown','mostrados')+': '+shown.length+
   (t1CatalogState.truncated?' · '+t1Tr('5,000-item metadata safety cap','límite seguro de 5,000 metadatos'):'');
 if(!shown.length){
  host.textContent=t1CatalogState.rows.length?
    t1Tr('No original fields match the filter.','Ningún campo original coincide con el filtro.'):
    t1Tr('No usable original OpenFOAM field-time metadata. Import a real 3D case; no histories were invented.',
      'No hay metadatos originales de campo-tiempo utilizables. Importa un caso 3D real; no se inventaron curvas.');
  return
 }
 host.innerHTML=shown.map((x)=>{
  const label=x.caseName+' · '+(x.region||'default')+' · '+x.field+' · '+x.kind;
  const times=String(x.firstTime)+'–'+String(x.lastTime)+' s · '+x.frames+' frames';
  return '<div class="t1Row" data-t1-key="'+t1Escape(String(t1CatalogState.rows.indexOf(x)))+'">'+
   '<div class="t1Name" title="'+t1Escape(label)+'">'+t1Escape(label)+'</div>'+
   '<div class="t1Meta">'+t1Escape(times)+'</div>'+
   '<button type="button" class="btn soft" data-t1-use="1" aria-label="'+t1Escape(
     t1Tr('Select for series 1: ','Usar en serie 1: ')+label)+'">'+t1Tr('Series 1','Serie 1')+'</button>'+
   '<button type="button" class="btn soft" data-t1-use="2" aria-label="'+t1Escape(
     t1Tr('Select for series 2: ','Usar en serie 2: ')+label)+'">'+t1Tr('Series 2','Serie 2')+'</button>'+
   '</div>'
 }).join('')
}
function t1Refresh(){
 if(typeof fwEnsureFieldTsControls==='function')fwEnsureFieldTsControls();
 const details=t1ById('fwDataFieldHistories');if(details){details.open=true;
  details.classList.add('t1Uncollapsed');}
 try{if(typeof fwRefreshFieldTsControls==='function')fwRefreshFieldTsControls()}catch{}
 t1CatalogState=t1Ready();t1Render();
 if(!t1CatalogState.rows.length)t1Status(t1Tr('Import a real 3D OpenFOAM case or select an existing measured time-series source.',
  'Importa un caso 3D real o selecciona una serie temporal medida existente.'));
 else t1Status(t1Tr('Choose real source metadata for Series 1/2, then build histories. No background field parsing.',
  'Elige metadatos reales para las series 1/2 y después constrúyelas. No se leen campos en segundo plano.'));
 return t1CatalogState
}
function t1Choose(item,slot){
 if(![1,2].includes(slot)||!item||typeof fwRefreshFieldTsSlot!=='function')return false;
 const current=t1Ready(),source=t1Choice(current,item);
 if(!source){t1Status(t1Tr('Field metadata changed: refresh available sources.','Cambió el campo original: actualiza fuentes.'),'error');return false}
 const target=id=>t1ById(id+slot);
 const sourceSel=target('fwTsSource'),cases=target('fwTsCase'),regions=target('fwTsRegion'),
  fields=target('fwTsField');
 if(!sourceSel||!cases||!regions||!fields)return false;
 if(slot===2){const en=t1ById('fwTsEnable2');if(!en)return false;en.checked=true}
 sourceSel.value='global';fwRefreshFieldTsSlot(slot,true,'source');
 cases.value=String(item.caseId);
 if(String(cases.value)!==String(item.caseId))return false;
 fwRefreshFieldTsSlot(slot,false,'case');
 regions.value=item.region;
 if(String(regions.value)!==item.region)return false;
 fwRefreshFieldTsSlot(slot,true,'region');
 fields.value=item.field;
 if(fields.value!==item.field)return false;
 fwRefreshFieldTsSlot(slot,true,'field');
 t1Status(t1Tr('Original '+item.field+' selected for Series '+slot+'. Choose Build field histories.',
  'Campo original '+item.field+' seleccionado para serie '+slot+'. Pulsa Construir historias.'));
 return true
}
function t1Cancel(){
 if(!t1Running){t1Status(t1Tr('No active field read to cancel.','No hay lectura activa para cancelar.'));return false}
 t1Canceled=true;
 // All original field reader loops use the shared fieldTsSeq generation.
 // On the next await they abort before the atomic chart commit.
 if(typeof fwState!=='undefined')fwState.fieldTsSeq++;
 if(typeof fwFieldTsSetStatus==='function')fwFieldTsSetStatus(t1Tr('Canceled by user. Earlier valid curves preserved.',
  'Cancelado por el usuario. Se conservan las curvas válidas anteriores.'));
 t1Status(t1Tr('Cancel requested. No partial curves committed.','Cancelación solicitada. No se incorporaron curvas parciales.'),'warning');
 return true
}
function t1WrapBuild(){
 if(typeof fwBuildFieldTimeSeries!=='function'||fwBuildFieldTimeSeries.t1Wrapped)return false;
 const original=fwBuildFieldTimeSeries;
 const adapter=async function(...args){
  if(t1Running)return t1Running;
  if(typeof activeAppMode==='string'&&activeAppMode!=='data')return original(...args);
  t1Canceled=false;t1ById('t1Cancel')&&(t1ById('t1Cancel').disabled=false);
  const before=(typeof series!=='undefined'?series:[]).filter(t1ValidPlot).length;
  t1Status(t1Tr('Reading original OpenFOAM history frames…','Leyendo cuadros originales de OpenFOAM…'),'busy');
  const pending=(async()=>{
   try{
    const outcome=await original(...args);
    if(!t1Canceled){
     const actual=(typeof series!=='undefined'?series:[]).filter(t1ValidPlot);
     if(actual.length){
      const frames=actual.reduce((a,s)=>a+s.t.length,0);
      t1Status(t1Tr('Valid original-source histories: ','Historias válidas con fuente original: ')+
       actual.length+' · '+frames+' '+t1Tr('physical-time samples','muestras de tiempo físico')+
       (actual.length>before?' · '+t1Tr('new source added','fuente nueva'):''));
     }else t1Status(t1Tr('No valid original-source curves were produced.',
       'No se produjeron curvas válidas con fuente original.'),'warning');
    }
    return outcome
   }catch(e){
    if(!t1Canceled)t1Status(t1Tr('Original field read failed; valid previous curves were not erased.',
     'Falló la lectura del campo original; se conservaron curvas previas.'),'error');
    throw e
   }finally{
    t1Running=null;
    const cancel=t1ById('t1Cancel');if(cancel)cancel.disabled=true
   }
  })();
  t1Running=pending;return pending
 };
 adapter.t1Wrapped=true;
 fwBuildFieldTimeSeries=adapter;
 return true
}
function t1Styles(){
 if(t1ById('t1Styles'))return;
 const s=document.createElement('style');s.id='t1Styles';
 s.textContent=[
 '#fwDataFieldHistories.t1Uncollapsed{display:block!important;border:1px solid var(--line);border-radius:12px;padding:11px 13px;background:var(--panel2);margin:11px 0}',
 '#fwDataFieldHistories.t1Uncollapsed>summary{display:none!important}',
 '#fwDataFieldHistories.t1Uncollapsed #fwFieldTsControls{display:block!important}',
 '#fwDataFieldHistories.t1Uncollapsed .fwTsSeries{min-width:0}',
 '#t1SourceBar{display:grid;gap:8px;margin:8px 0 15px}',
 '#t1SourceBar .t1Intro{font-size:11px;font-weight:750}',
 '#t1SourceBar .t1Controls{display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
 '#t1SourceBar input{max-width:300px;min-width:170px;flex:1 1 190px;min-height:34px;border:1px solid var(--line);background:var(--panel);color:var(--text);border-radius:8px;padding:7px 9px}',
 '#t1SourceBar button{min-height:34px;font-size:11px}',
 '#t1Entries{max-height:210px;overflow:auto;border:1px solid var(--line);border-radius:9px;background:var(--panel)}',
 '#t1Entries:empty{min-height:0}',
 '#t1Entries .t1Row{display:grid;grid-template-columns:minmax(140px,1fr) minmax(110px,190px) auto auto;align-items:center;gap:8px;border-bottom:1px solid var(--line);padding:7px 9px;font-size:11px}',
 '#t1Entries .t1Row:last-child{border-bottom:0}',
 '#t1Entries .t1Name{font-weight:750;min-width:0;overflow-wrap:anywhere}',
 '#t1Entries .t1Meta{color:var(--muted);font-size:10px}',
 '#t1SourceBar [data-kind="error"]{color:var(--danger)}',
 '#t1SourceBar [data-kind="busy"]{font-weight:750}',
 '#t1SourceBar [data-kind="warning"]{color:var(--muted)}',
 '#t1Count,#t1DirectStatus{font-size:11px;line-height:1.4}',
 '@media(max-width:1000px){#t1Entries .t1Row{grid-template-columns:minmax(140px,1fr) auto auto}#t1Entries .t1Meta{grid-column:1/-1;grid-row:2}}',
 '@media(max-width:630px){#t1Entries .t1Row{grid-template-columns:minmax(100px,1fr) 1fr}#t1Entries .t1Row button{min-width:0}#t1Entries .t1Meta{grid-column:1/-1}}'
 ].join('\n');document.head.appendChild(s)
}
function t1Install(){
 if(t1Installed)return true;
 if(typeof fwEnsureFieldTsControls!=='function'||!t1ById('timeSeriesControls'))return false;
 const original=fwEnsureFieldTsControls(),details=t1ById('fwDataFieldHistories');
 if(!original||!details)return false;
 const root=document.createElement('section');root.id='t1SourceBar';
 root.innerHTML='<div class="t1Intro">'+t1Tr('Original 3D OpenFOAM field sources','Fuentes originales de campo OpenFOAM 3D')+'</div>'+
  '<div class="t1Controls"><input id="t1Filter" type="search" aria-label="'+
  t1Tr('Filter source cases, regions and fields','Filtra casos, regiones y campos')+'" placeholder="'+
  t1Tr('Find case, region, field…','Buscar caso, región, campo…')+'">'+
  '<button class="btn soft" type="button" id="t1Refresh">'+t1Tr('Refresh available fields','Actualizar campos disponibles')+'</button>'+
  '<button class="btn soft" type="button" id="t1Cancel" disabled>'+
  t1Tr('Cancel field read','Cancelar lectura')+'</button></div>'+
  '<div id="t1Count" role="status"></div><div id="t1Entries"></div>'+
  '<div id="t1DirectStatus" role="status" aria-live="polite"></div>';
 details.insertBefore(root,original);
 t1Styles();
 t1ById('t1Refresh').onclick=t1Refresh;
 t1ById('t1Filter').oninput=t1Render;
 t1ById('t1Cancel').onclick=t1Cancel;
 t1ById('t1Entries').addEventListener('click',e=>{
  const button=e.target.closest('[data-t1-use]'),row=button?.closest('[data-t1-key]');
  if(!button||!row)return;
  const item=t1CatalogState.rows[Number(row.dataset.t1Key)];
  t1Choose(item,Number(button.dataset.t1Use))
 });
 // No panel in Field is moved: this original generator lives under its
 // canonical Data time-series owner. Never parse thousands of fields on enter.
 details.open=true;details.classList.add('t1Uncollapsed');
 t1WrapBuild();t1Refresh();
 t1Installed=true;
 window.FoamLensTimeSeriesT1={refresh:t1Refresh,cancel:t1Cancel,choose:t1Choose,
  metadata:()=>({count:t1CatalogState.rows.length,truncated:t1CatalogState.truncated})};
 return true
}
(function seek(n=0){if(t1Install())return;if(n<900)requestAnimationFrame(()=>seek(n+1))})();
