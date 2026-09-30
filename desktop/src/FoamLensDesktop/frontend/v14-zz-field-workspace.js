/* FoamLens Desktop v1.4.4 — top-level Field workspace with simultaneous 3D + 2D companion views. */

const fwState={active:false,companion:'profile',layout:'split',syncTime:true,origins:new Map(),installed:false,fieldTsSeq:0,fieldTsTimer:null,fieldTsKeys:new Set()};
function fwUi(en,es){try{return flUi(en,es)}catch{return en}}
function fwRemember(node){
  if(!node||fwState.origins.has(node.id))return;
  fwState.origins.set(node.id,{parent:node.parentNode,next:node.nextSibling});
}
function fwRestore(node){
  if(!node)return;const o=fwState.origins.get(node.id);if(!o?.parent)return;
  if(o.next&&o.next.parentNode===o.parent)o.parent.insertBefore(node,o.next);else o.parent.appendChild(node)
}
function fwMove(id,targetId){
  const node=document.getElementById(id),target=document.getElementById(targetId);if(!node||!target)return null;fwRemember(node);target.appendChild(node);return node
}
function fwFieldReady(){return typeof fvInstallUi==='function'&&fvInstallUi()}
function fwUpdateNavText(){
  const b=document.getElementById('modeField');if(b)b.textContent=fwUi('Field View','Vista 3D');
  const title=document.getElementById('fwTitle');if(title)title.textContent=fwUi('Field Workspace','Workspace de campos');
  const sub=document.getElementById('fwSubtitle');if(sub)sub.textContent=fwUi('3D fields and 2D diagnostics in the same workspace','Campos 3D y diagnósticos 2D en el mismo workspace');
  const add=document.getElementById('fwAdd3DView');if(add)add.textContent=fwUi('+ Add 3D View','+ Añadir vista 3D');
  const cfg=document.getElementById('fwConfigureViews');if(cfg)cfg.textContent=fwUi('Configure 3D views','Configurar vistas 3D');
  const lab=document.getElementById('fwCompanionLabel');if(lab)lab.textContent=fwUi('Companion plot','Gráfica complementaria');
  const sync=document.getElementById('fwSyncLabel');if(sync)sync.textContent=fwUi('Follow 3D physical time','Seguir tiempo físico 3D');
}
function fwCreateSurface(){
  if(document.getElementById('fieldSurface'))return;
  const nav=document.querySelector('.modeNav'),analysis=document.getElementById('modeAnalysis');let createdModeButton=false;
  if(nav&&!document.getElementById('modeField')){
    const b=document.createElement('button');b.className='modeNavBtn';b.dataset.mode='field';b.id='modeField';b.type='button';b.textContent='Field View';analysis?nav.insertBefore(b,analysis):nav.appendChild(b);createdModeButton=true
  }
  const surface=document.createElement('section');surface.className='modeSurface fieldWorkspaceSurface';surface.id='fieldSurface';
  surface.innerHTML=`
    <div class="fwShell">
      <div class="fwHeader">
        <div><div class="fwEyebrow">OpenFOAM 3D</div><h2 id="fwTitle">Field Workspace</h2><p id="fwSubtitle">3D fields and 2D diagnostics in the same workspace</p></div>
        <div class="fwHeaderActions">
          <button class="btn primary" id="fwAdd3DView" type="button">+ Add 3D View</button>
          <button class="btn" id="fwConfigureViews" type="button">Configure 3D views</button>
          <span class="smallnote fwMultiHint" data-fl-en="Each 3D view has its own case · region · field · component. Visible views are included in video export." data-fl-es="Cada vista 3D tiene su propio caso · región · variable · componente. Las vistas visibles se incluyen en el video.">Each 3D view has its own case · region · field · component. Visible views are included in video export.</span>
          <div class="fwCompact"><label id="fwCompanionLabel" for="fwCompanion">Companion plot</label><select id="fwCompanion"><option value="profile">Spatial Profile</option><option value="timeseries">Time Series</option><option value="log">Solver Logs</option><option value="none">None</option></select></div>
          <div class="fwCompact"><label for="fwLayout">Layout</label><select id="fwLayout"><option value="split">Split</option><option value="3d">3D focus</option><option value="plot">Plot focus</option></select></div>
          <label class="inlineCheck fwSyncCheck"><input id="fwSyncTime" type="checkbox" checked> <span id="fwSyncLabel">Follow 3D physical time</span></label>
        </div>
      </div>
      <div class="fwGrid" id="fwGrid">
        <main class="fw3DCard">
          <div class="fwCardHead"><strong>3D</strong><span class="badge" id="fw3DCount">1 view</span></div>
          <div id="fw3DHost"></div>
        </main>
        <section class="fwPlotCard" id="fwPlotCard">
          <div class="fwCardHead"><strong id="fwPlotTitle">Spatial Profile</strong><span class="badge" id="fwPlotTime">—</span></div>
          <div class="fwCompanionHost" id="fw2DHost"></div>
          <div class="smallnote fwPlotEmpty hidden" id="fwPlotEmpty"></div>
        </section>
        <aside class="fwControlsCard">
          <details open class="fwControlGroup"><summary><strong>3D controls</strong></summary><div id="fw3DControlsHost"></div></details>
          <details open class="fwControlGroup" id="fw2DControlGroup"><summary><strong id="fw2DControlTitle">Spatial Profile controls</strong></summary><div id="fw2DControlsHost"></div></details>
        </aside>
      </div>
    </div>`;
  const anchor=document.getElementById('workspaceOverview')||document.getElementById('workspace');anchor?.insertAdjacentElement('beforebegin',surface);
  const style=document.createElement('style');style.id='fwStyles';style.textContent=`
    body.appMode-field #workspace,body.appMode-field #workspaceOverview,body.appMode-field #reviewSurface,body.appMode-field #liveSurface{display:none!important}
    body.appMode-field #fieldSurface{display:block}
    #fieldViewTab{display:none!important}
    .fieldWorkspaceSurface{padding:14px;overflow:auto}
    .fwShell{display:grid;gap:12px;min-width:0}
    .fwHeader{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;padding:14px 16px;border:1px solid var(--line);border-radius:16px;background:var(--panel)}
    .fwEyebrow{font-size:8px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:var(--accent)}
    .fwHeader h2{margin:3px 0 2px;font-size:18px}.fwHeader p{margin:0;color:var(--muted);font-size:9px}
    .fwHeaderActions{display:flex;align-items:end;justify-content:flex-end;gap:7px;flex-wrap:wrap}.fwCompact{display:grid;gap:3px}.fwCompact label{font-size:8px;color:var(--muted);font-weight:700}.fwCompact select{min-width:120px}
    .fwSyncCheck{align-self:center;white-space:nowrap}.fwMultiHint{max-width:260px;align-self:center}.fwCompareConfig,.fwAnimationConfig{outline:1px solid color-mix(in srgb,var(--accent) 32%,transparent)}
    .fwGrid{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr) 340px;gap:12px;align-items:start;min-width:0}
    .fwGrid.layout-3d{grid-template-columns:minmax(0,1fr) 340px}.fwGrid.layout-3d .fwPlotCard{display:none}
    .fwGrid.layout-plot{grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr) 340px}
    .fw3DCard,.fwPlotCard,.fwControlsCard{min-width:0;border:1px solid var(--line);border-radius:16px;background:var(--panel);overflow:hidden}
    .fwCardHead{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;border-bottom:1px solid var(--line)}
    #fw3DHost{padding:0;min-width:0}.fw3DCard .fieldViewPanel{display:block!important;padding:10px;min-height:0}.fw3DCard .fvViewport{min-height:460px}.fw3DCard #fvCanvas{height:460px}
    .fwCompanionHost{min-height:460px;position:relative;overflow:auto;padding:8px}.fwCompanionHost .chartwrap{display:block!important;position:relative!important;min-height:440px;height:440px;width:100%}.fwCompanionHost #canvas{display:block}
    .fwControlsCard{padding:9px;display:grid;gap:8px;max-height:calc(100vh - 190px);overflow:auto;position:sticky;top:8px}
    .fwControlGroup{border:1px solid var(--line);border-radius:12px;background:var(--panel2)}.fwControlGroup>summary{cursor:pointer;padding:9px 10px}.fwControlGroup>div{padding:0 9px 9px}
    .fwPlotEmpty{padding:18px}.fwPlotCard.companion-none{display:none}.fwFieldTsControls{display:grid;gap:8px;margin-bottom:10px}.fwFieldTsControls.hidden{display:none!important}.fwTsSeries{display:grid;gap:7px;padding:8px;border:1px solid var(--line);border-radius:10px;background:var(--panel2)}.fwTsSeriesHead{display:flex;align-items:center;justify-content:space-between;gap:8px}.fwTsFieldSource,.fwTsProfileOnly,.fwTsProbeOnly{display:grid;gap:7px}.fwTsFieldSource.hidden,.fwTsProfileOnly.hidden,.fwTsProbeOnly.hidden,.fwTsGlobalOnly.hidden{display:none!important}
    @media(max-width:1350px){.fwGrid,.fwGrid.layout-plot{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}.fwControlsCard{grid-column:1/-1;position:static;max-height:none;grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media(max-width:900px){.fwHeader{display:grid}.fwHeaderActions{justify-content:flex-start}.fwGrid,.fwGrid.layout-plot,.fwGrid.layout-3d{grid-template-columns:1fr}.fwControlsCard{grid-template-columns:1fr}.fw3DCard #fvCanvas,.fw3DCard .fvViewport{height:420px;min-height:420px}}
  `;document.head.appendChild(style);
  if(createdModeButton)document.getElementById('modeField')?.addEventListener('click',()=>setAppMode('field'));
  document.getElementById('fwCompanion')?.addEventListener('change',e=>fwSetCompanion(e.target.value));
  document.getElementById('fwLayout')?.addEventListener('change',e=>fwSetLayout(e.target.value));
  document.getElementById('fwSyncTime')?.addEventListener('change',e=>fwState.syncTime=!!e.target.checked);
  document.getElementById('fwAdd3DView')?.addEventListener('click',fwAdd3DView);
  document.getElementById('fwConfigureViews')?.addEventListener('click',()=>{const p=document.getElementById('fcPanel');if(p){p.open=true;p.classList.add('fwCompareConfig');p.scrollIntoView({block:'nearest',behavior:'smooth'})}});
  fwUpdateNavText()
}
function fwSetLayout(layout){
  fwState.layout=['split','3d','plot'].includes(layout)?layout:'split';const grid=document.getElementById('fwGrid');if(!grid)return;
  grid.classList.toggle('layout-3d',fwState.layout==='3d');grid.classList.toggle('layout-plot',fwState.layout==='plot');setTimeout(()=>{try{fvRender()}catch{};try{draw()}catch{}},0)
}

function fwFieldTsReadyCases(){return (cases||[]).filter(c=>typeof fvCaseViewAvailable==='function'&&fvCaseViewAvailable(c))}
function fwFieldTsCase(slot){return (cases||[]).find(c=>String(c.id)===String(document.getElementById('fwTsCase'+slot)?.value||''))}
function fwFieldTsRegion(slot){return document.getElementById('fwTsRegion'+slot)?.value||''}
function fwFieldTsGroup(slot){
  const c=fwFieldTsCase(slot),region=fwFieldTsRegion(slot),name=document.getElementById('fwTsField'+slot)?.value||'';
  return c&&name?fvFieldGroups(c,region,null,'any').find(g=>g.name===name):null
}
function fwFieldTsMetric(range,stat){
  if(!range?.valid)return NaN;
  if(stat==='min')return Number(range.min);
  if(stat==='max')return Number(range.max);
  if(stat==='delta')return Number(range.max)-Number(range.min);
  return Number(range.mean)
}
function fwFieldTsStatLabel(stat){
  return stat==='min'?'Min':stat==='max'?'Max':stat==='delta'?'Δ':fwUi('Mean','Media')
}
function fwFieldTsCanonical(group,component,stat){
  return 'field3d:'+String(group?.name||'field')+':'+String(component||'value')+':'+String(stat||'mean')
}
function fwFieldTsSourceKey(c,region,group,component,stat){
  return ['field3d-history',c?.id,region||'',group?.name||'',component||'value',stat||'mean'].join('|')
}
function fwFieldTsField(group,component,stat,parsed){
  const unit=parsed?.dimensions&&typeof pmUnitFromDimensions==='function'?pmUnitFromDimensions(parsed.dimensions):'',name=String(group?.name||'Field'),comp=component&&component!=='value'?' · '+component:'',metric=fwFieldTsStatLabel(stat);
  return{canonical:fwFieldTsCanonical(group,component,stat),display:name+comp+' · '+metric,unit:unit||'-',quantity:'field3d_'+name+'_'+component+'_'+stat,dimensions:parsed?.dimensions||group?.dimensions||'',original:'OpenFOAM 3D field history'}
}

function fwFieldTsSource(slot){return document.getElementById('fwTsSource'+slot)?.value||'global'}
function fwProbeChoices(){
  const out=[],primary=window.FoamLensFieldProbe?.getLast?.();
  if(primary?.point?.length===3)out.push({id:'view1',view:1,caseId:Number(fvState.caseId),caseName:fvCase()?.name||'',region:fvState.region||'',field:fvState.fieldName||'',component:fvState.component||'value',point:primary.point.map(Number),cell:primary.cell??null,face:primary.face??null,value:Number(primary.value)});
  for(const d of window.FoamLensFieldCompare?.getProbeDescriptors?.()||[])if(d?.point?.length===3&&!out.some(x=>x.id===d.id))out.push({...d,point:d.point.map(Number)});
  return out
}
function fwNearestFlatIndex(flat,count,p){
  let best=-1,bestD2=Infinity;for(let i=0;i<count;i++){const x=Number(flat[3*i]),y=Number(flat[3*i+1]),z=Number(flat[3*i+2]);if(![x,y,z].every(Number.isFinite))continue;const dx=x-p[0],dy=y-p[1],dz=z-p[2],d2=dx*dx+dy*dy+dz*dz;if(d2<bestD2){bestD2=d2;best=i}}
  return{index:best,d2:bestD2}
}
function fwFaceCentroid(mesh,fi){
  const ids=fvMeshFacePoints(mesh,fi);if(!ids.length)return null;let x=0,y=0,z=0,n=0;for(const pi of ids){const a=Number(mesh.points?.[3*pi]),b=Number(mesh.points?.[3*pi+1]),d=Number(mesh.points?.[3*pi+2]);if([a,b,d].every(Number.isFinite)){x+=a;y+=b;z+=d;n++}}return n?[x/n,y/n,z/n]:null
}
function fwSampleFieldAtPoint(data,point){
  if(!data?.mesh||!Array.isArray(point)||point.length!==3||!point.every(Number.isFinite))return{value:NaN,index:-1,distance:NaN};
  const mesh=data.mesh,values=data.fieldValues||[],storage=String(data.storage||'volume'),diag=Math.hypot(mesh.boundsMax?.[0]-mesh.boundsMin?.[0],mesh.boundsMax?.[1]-mesh.boundsMin?.[1],mesh.boundsMax?.[2]-mesh.boundsMin?.[2])||1;
  if(typeof fvInsideBounds==='function'&&!fvInsideBounds(point,mesh.boundsMin,mesh.boundsMax,diag*1e-6))return{value:NaN,index:-1,distance:NaN};
  if(storage==='point'){
    const q=fwNearestFlatIndex(mesh.points||[],Number(mesh.pointCount)||Math.floor((mesh.points?.length||0)/3),point);return{value:Number(values[q.index]),index:q.index,distance:Math.sqrt(q.d2)}
  }
  if(storage==='surface'){
    let best=-1,bestD2=Infinity;for(let fi=0;fi<Math.min(Number(mesh.internalFaceCount)||0,values.length);fi++){const p=fwFaceCentroid(mesh,fi);if(!p)continue;const dx=p[0]-point[0],dy=p[1]-point[1],dz=p[2]-point[2],d2=dx*dx+dy*dy+dz*dz;if(d2<bestD2){bestD2=d2;best=fi}}return{value:Number(values[best]),index:best,distance:Math.sqrt(bestD2)}
  }
  const q=fwNearestFlatIndex(mesh.cellCenters||[],Number(mesh.cellCount)||Math.floor((mesh.cellCenters?.length||0)/3),point);return{value:Number(values[q.index]),index:q.index,distance:Math.sqrt(q.d2)}
}
function fwProfileSeriesAll(){return (series||[]).filter(s=>datasetTypeOf(s)==='profile'&&Number.isFinite(Number(s.profileTime)))}
function fwProfileTsSelection(slot){
  return{
    caseId:document.getElementById('fwTsProfileCase'+slot)?.value||'',
    set:document.getElementById('fwTsProfileSet'+slot)?.value||'',
    field:document.getElementById('fwTsProfileField'+slot)?.value||'',
    line:document.getElementById('fwTsProfileLine'+slot)?.value||'',
    position:Number(document.getElementById('fwTsProfilePosition'+slot)?.value)
  }
}
function fwRefreshProfileTsSlot(slot,preserve=true){
  const cSel=document.getElementById('fwTsProfileCase'+slot),setSel=document.getElementById('fwTsProfileSet'+slot),fieldSel=document.getElementById('fwTsProfileField'+slot),lineSel=document.getElementById('fwTsProfileLine'+slot),pos=document.getElementById('fwTsProfilePosition'+slot),meta=document.getElementById('fwTsProfileMeta'+slot);if(!cSel||!setSel||!fieldSel||!lineSel||!pos)return;
  const all=fwProfileSeriesAll(),old={caseId:preserve?cSel.value:'',set:preserve?setSel.value:'',field:preserve?fieldSel.value:'',line:preserve?lineSel.value:'',position:Number(pos.value)};
  const caseMap=new Map();for(const s of all){const key=String(s.caseId??s.caseName??'');if(!caseMap.has(key))caseMap.set(key,{id:key,name:caseById(s.caseId)?.name||s.caseName||fwUi('Case','Caso')})}
  const caseOpts=[...caseMap.values()];cSel.innerHTML=caseOpts.map(x=>'<option value="'+fvEsc(x.id)+'">'+fvEsc(x.name)+'</option>').join('')||'<option value="">—</option>';if(caseOpts.some(x=>x.id===old.caseId))cSel.value=old.caseId;
  let filtered=all.filter(s=>String(s.caseId??s.caseName??'')===String(cSel.value));const sets=[...new Set(filtered.map(s=>s.profileOutputPath||'').filter(Boolean))].sort();setSel.innerHTML=sets.map(x=>'<option value="'+fvEsc(x)+'">'+fvEsc(x)+'</option>').join('')||'<option value="">—</option>';if(sets.includes(old.set))setSel.value=old.set;
  filtered=filtered.filter(s=>(s.profileOutputPath||'')===setSel.value);const fields=[...new Map(filtered.map(s=>[s.field?.canonical,s.field])).values()].filter(Boolean);fieldSel.innerHTML=fields.map(x=>'<option value="'+fvEsc(x.canonical)+'">'+fvEsc(localizedFieldName(x))+(x.unit&&x.unit!=='-'?' ['+fvEsc(x.unit)+']':'')+'</option>').join('')||'<option value="">—</option>';if(fields.some(x=>x.canonical===old.field))fieldSel.value=old.field;
  filtered=filtered.filter(s=>s.field?.canonical===fieldSel.value);const lines=[...new Map(filtered.map(s=>[s.profileLineKey||s.profileLine||'',s.profileLine||s.profileLineKey||'Profile'])).entries()];lineSel.innerHTML=lines.map(([k,v])=>'<option value="'+fvEsc(k)+'">'+fvEsc(v)+'</option>').join('')||'<option value="">—</option>';if(lines.some(([k])=>k===old.line))lineSel.value=old.line;
  filtered=filtered.filter(s=>(s.profileLineKey||s.profileLine||'')===lineSel.value);const xs=filtered.flatMap(s=>(s.t||[]).map(Number).filter(Number.isFinite)),xmin=xs.length?Math.min(...xs):NaN,xmax=xs.length?Math.max(...xs):NaN,unit=filtered.find(s=>s.profileCoordUnit)?.profileCoordUnit||'';
  if(Number.isFinite(xmin)&&Number.isFinite(xmax)){pos.min=String(xmin);pos.max=String(xmax);pos.step='any';if(Number.isFinite(old.position)&&old.position>=xmin&&old.position<=xmax)pos.value=String(old.position);else pos.value=String((xmin+xmax)/2)}
  if(meta)meta.textContent=Number.isFinite(xmin)?fwUi('Available position','Posición disponible')+': '+fvFmt(xmin)+'–'+fvFmt(xmax)+(unit?' '+unit:''):'—'
}
function fwRefreshProbeTsSlot(slot,preserve=true){
  const sel=document.getElementById('fwTsProbe'+slot),meta=document.getElementById('fwTsProbeMeta'+slot);if(!sel)return;const old=preserve?sel.value:'',items=fwProbeChoices();
  sel.innerHTML=items.map(d=>'<option value="'+fvEsc(d.id)+'">'+fvEsc(fwUi('View','Vista')+' '+d.view+' · '+(d.caseName||'')+' · '+(d.field||''))+'</option>').join('')||'<option value="">'+fwUi('No pinned probes','No hay probes fijados')+'</option>';if(items.some(d=>d.id===old))sel.value=old;
  const d=items.find(x=>x.id===sel.value);if(meta)meta.textContent=d?('XYZ = '+d.point.map(fvFmt).join(', ')+(d.cell!=null?' · '+fwUi('cell','celda')+' #'+d.cell:d.face!=null?' · '+fwUi('face','cara')+' #'+d.face:'')):fwUi('Activate Probe in a 3D view and click geometry first.','Activa Probe en una vista 3D y haz clic en la geometría primero.')
}
function fwEnsureFieldTsControls(){
  let root=document.getElementById('fwFieldTsControls');if(root)return root;
  root=document.createElement('div');root.id='fwFieldTsControls';root.className='fwFieldTsControls hidden';
  const row=slot=>`
    <div class="fwTsSeries" data-fw-ts-slot="${slot}">
      <div class="fwTsSeriesHead"><strong>${fwUi('Series','Serie')} ${slot}</strong>${slot===2?'<label class="inlineCheck"><input id="fwTsEnable2" type="checkbox"> <span>'+fwUi('Enable','Activar')+'</span></label>':''}</div>
      <div class="field"><label>${fwUi('Source','Fuente')}</label><select id="fwTsSource${slot}"><option value="global">${fwUi('Global field statistic','Estadístico global del campo')}</option><option value="probe">Probe</option><option value="profile">${fwUi('Spatial profile','Perfil espacial')}</option></select></div>
      <div class="fwTsFieldSource" id="fwTsFieldSource${slot}">
        <div class="row2"><div class="field"><label>${fwUi('Case','Caso')}</label><select id="fwTsCase${slot}"></select></div><div class="field"><label>${fwUi('Region','Región')}</label><select id="fwTsRegion${slot}"></select></div></div>
        <div class="row2"><div class="field"><label>${fwUi('Variable','Variable')}</label><select id="fwTsField${slot}"></select></div><div class="field"><label>${fwUi('Component','Componente')}</label><select id="fwTsComponent${slot}"></select></div></div>
        <div class="field fwTsGlobalOnly" id="fwTsStatWrap${slot}"><label>${fwUi('Temporal statistic','Estadístico temporal')}</label><select id="fwTsStat${slot}"><option value="mean">${fwUi('Mean','Media')}</option><option value="min">Min</option><option value="max">Max</option><option value="delta">Δ (Max − Min)</option></select></div>
        <div class="fwTsProbeOnly hidden" id="fwTsProbeWrap${slot}"><div class="field"><label>${fwUi('Pinned 3D probe','Probe 3D fijado')}</label><select id="fwTsProbe${slot}"></select></div><div class="smallnote" id="fwTsProbeMeta${slot}"></div></div>
      </div>
      <div class="fwTsProfileOnly hidden" id="fwTsProfileWrap${slot}">
        <div class="row2"><div class="field"><label>${fwUi('Profile case','Caso del perfil')}</label><select id="fwTsProfileCase${slot}"></select></div><div class="field"><label>${fwUi('Profile set','Conjunto de perfiles')}</label><select id="fwTsProfileSet${slot}"></select></div></div>
        <div class="row2"><div class="field"><label>${fwUi('Variable','Variable')}</label><select id="fwTsProfileField${slot}"></select></div><div class="field"><label>${fwUi('Profile / line','Perfil / línea')}</label><select id="fwTsProfileLine${slot}"></select></div></div>
        <div class="field"><label>${fwUi('Position on profile','Posición en el perfil')}</label><input id="fwTsProfilePosition${slot}" type="number" step="any"></div>
        <div class="smallnote" id="fwTsProfileMeta${slot}"></div>
      </div>
    </div>`;
  root.innerHTML='<div class="analysisTitle"><strong>'+fwUi('3D field history','Historia temporal de campo 3D')+'</strong><span class="badge" id="fwTsStatusBadge">—</span></div><div class="smallnote">'+fwUi('Build time histories directly from OpenFOAM 3D fields even when no probe/postProcessing time series exists.','Construye historias temporales directamente desde campos 3D de OpenFOAM aunque no exista una serie de probe/postProcessing.')+'</div>'+row(1)+row(2)+'<div class="smallnote" id="fwTsStatus"></div>';
  document.getElementById('fw2DControlsHost')?.prepend(root);
  const schedule=()=>{clearTimeout(fwState.fieldTsTimer);fwState.fieldTsTimer=setTimeout(()=>fwBuildFieldTimeSeries().catch(e=>fwFieldTsSetStatus(String(e?.message||e),true)),220)};
  for(const slot of [1,2]){
    document.getElementById('fwTsSource'+slot)?.addEventListener('change',()=>{fwRefreshFieldTsSlot(slot,true,'source');schedule()});
    document.getElementById('fwTsCase'+slot)?.addEventListener('change',()=>{fwRefreshFieldTsSlot(slot,false,'case');schedule()});
    document.getElementById('fwTsRegion'+slot)?.addEventListener('change',()=>{fwRefreshFieldTsSlot(slot,true,'region');schedule()});
    document.getElementById('fwTsField'+slot)?.addEventListener('change',()=>{fwRefreshFieldTsSlot(slot,true,'field');schedule()});
    document.getElementById('fwTsComponent'+slot)?.addEventListener('change',schedule);
    document.getElementById('fwTsStat'+slot)?.addEventListener('change',schedule);
    document.getElementById('fwTsProbe'+slot)?.addEventListener('change',()=>{fwRefreshProbeTsSlot(slot,true);schedule()});
    for(const id of ['fwTsProfileCase','fwTsProfileSet','fwTsProfileField','fwTsProfileLine'])document.getElementById(id+slot)?.addEventListener('change',()=>{fwRefreshProfileTsSlot(slot,true);schedule()});
    document.getElementById('fwTsProfilePosition'+slot)?.addEventListener('change',schedule)
  }
  document.getElementById('fwTsEnable2')?.addEventListener('change',()=>{fwRefreshFieldTsSlot(2,true,'enable');schedule()});
  return root
}
function fwFieldTsSetStatus(text,error=false){
  const e=document.getElementById('fwTsStatus'),b=document.getElementById('fwTsStatusBadge');if(e){e.textContent=String(text||'');e.classList.toggle('error',!!error)}if(b)b.textContent=error?fwUi('error','error'):String(text||'—').slice(0,36)
}
function fwRefreshFieldTsSlot(slot,preserve=true,reason=''){
  const cSel=document.getElementById('fwTsCase'+slot),rSel=document.getElementById('fwTsRegion'+slot),fSel=document.getElementById('fwTsField'+slot),compSel=document.getElementById('fwTsComponent'+slot),sourceSel=document.getElementById('fwTsSource'+slot);if(!cSel||!rSel||!fSel||!compSel||!sourceSel)return;
  const enabled=slot===1||!!document.getElementById('fwTsEnable2')?.checked,source=fwFieldTsSource(slot);
  sourceSel.disabled=!enabled;
  for(const el of [cSel,rSel,fSel,compSel,document.getElementById('fwTsStat'+slot),document.getElementById('fwTsProbe'+slot),document.getElementById('fwTsProfileCase'+slot),document.getElementById('fwTsProfileSet'+slot),document.getElementById('fwTsProfileField'+slot),document.getElementById('fwTsProfileLine'+slot),document.getElementById('fwTsProfilePosition'+slot)])if(el)el.disabled=!enabled;
  document.getElementById('fwTsFieldSource'+slot)?.classList.toggle('hidden',source==='profile');
  document.getElementById('fwTsStatWrap'+slot)?.classList.toggle('hidden',source!=='global');
  document.getElementById('fwTsProbeWrap'+slot)?.classList.toggle('hidden',source!=='probe');
  document.getElementById('fwTsProfileWrap'+slot)?.classList.toggle('hidden',source!=='profile');
  if(source==='probe')fwRefreshProbeTsSlot(slot,preserve);
  if(source==='profile')fwRefreshProfileTsSlot(slot,preserve);
  const ready=fwFieldTsReadyCases(),oldCase=preserve?cSel.value:'';
  cSel.innerHTML=ready.map(c=>'<option value="'+fvEsc(c.id)+'">'+fvEsc(c.name)+'</option>').join('')||'<option value="">—</option>';
  const preferredId=slot===1?(fvState.caseId??document.getElementById('fvCase')?.value):(typeof fcState!=='undefined'&&fcState.enabled?fcState.caseId:(fvState.caseId??document.getElementById('fvCase')?.value));
  if(oldCase&&ready.some(c=>String(c.id)===String(oldCase)))cSel.value=oldCase;else if(ready.some(c=>String(c.id)===String(preferredId)))cSel.value=String(preferredId);
  const selected=fwFieldTsCase(slot),regions=selected&&typeof fvReadyRegions==='function'?fvReadyRegions(selected):[],oldRegion=preserve?rSel.value:'';
  rSel.innerHTML=regions.map(r=>'<option value="'+fvEsc(r)+'">'+fvEsc(r||fwUi('Default','Predeterminada'))+'</option>').join('')||'<option value="">—</option>';
  const preferredRegion=slot===1?(fvState.region||document.getElementById('fvRegion')?.value||''):(typeof fcState!=='undefined'&&fcState.enabled?fcState.region:(fvState.region||''));
  if(regions.includes(oldRegion))rSel.value=oldRegion;else if(regions.includes(preferredRegion))rSel.value=preferredRegion;
  const groups=selected?fvFieldGroups(selected,rSel.value||'',null,'any').filter(g=>['scalar','vector'].includes(g.kind)&&(g.times||[]).length):[],oldField=preserve?fSel.value:'';
  fSel.innerHTML=groups.map(g=>'<option value="'+fvEsc(g.name)+'">'+fvEsc(g.name)+' · '+fvEsc(g.kind)+' · '+fvEsc(fvAssociationLabel(g.storage))+'</option>').join('')||'<option value="">—</option>';
  const preferredField=slot===1?(fvState.fieldName||document.getElementById('fvField')?.value||''):(typeof fcState!=='undefined'&&fcState.enabled?fcState.fieldName:(fvState.fieldName||''));
  if(groups.some(g=>g.name===oldField))fSel.value=oldField;else if(groups.some(g=>g.name===preferredField))fSel.value=preferredField;
  const group=groups.find(g=>g.name===fSel.value),components=group?fvFieldComponents(group):[],oldComp=preserve?compSel.value:'';
  compSel.innerHTML=components.map(o=>'<option value="'+fvEsc(o.v)+'">'+fvEsc(o.t)+'</option>').join('')||'<option value="value">'+fwUi('Value','Valor')+'</option>';
  const preferredComp=slot===1?(fvState.component||'value'):(typeof fcState!=='undefined'&&fcState.enabled?fcState.component:'value');
  if(components.some(o=>o.v===oldComp))compSel.value=oldComp;else if(components.some(o=>o.v===preferredComp))compSel.value=preferredComp
}
function fwRefreshFieldTsControls(){
  const root=fwEnsureFieldTsControls();root?.classList.toggle('hidden',fwState.companion!=='timeseries');
  if(fwState.companion!=='timeseries')return;
  fwRefreshFieldTsSlot(1,true);fwRefreshFieldTsSlot(2,true)
}

async function fwBuildProbeFieldHistory(slot,seq){
  const c=fwFieldTsCase(slot),region=fwFieldTsRegion(slot),group=fwFieldTsGroup(slot),component=document.getElementById('fwTsComponent'+slot)?.value||'value',probeId=document.getElementById('fwTsProbe'+slot)?.value||'',probe=fwProbeChoices().find(d=>d.id===probeId);
  if(!c||!group) return null;if(!probe)throw new Error(fwUi('Select a pinned 3D Probe first.','Selecciona primero un Probe 3D fijado.'));
  const times=(group.times||[]).map(Number).filter(Number.isFinite).sort((a,b)=>a-b),x=[],y=[];let parsed0=null,maxDistance=0;
  for(let i=0;i<times.length;i++){if(seq!==fwState.fieldTsSeq)return null;const data=await fvLoadFrameData(c,group,region,times[i],component,{includeBoundary:false});if(seq!==fwState.fieldTsSeq)return null;parsed0=parsed0||data.parsed;const sample=fwSampleFieldAtPoint(data,probe.point);if(Number.isFinite(sample.value)){x.push(times[i]);y.push(sample.value);maxDistance=Math.max(maxDistance,Number(sample.distance)||0)}if(i%3===2)await new Promise(r=>setTimeout(r,0))}
  if(!x.length)throw new Error(fwUi('The selected Probe position does not intersect usable field data through time.','La posición del Probe seleccionado no intersecta datos utilizables del campo a través del tiempo.'));
  const xyz=probe.point.map(v=>Number(v).toPrecision(8)).join(','),key=['field3d-probe-history',c.id,region,group.name,component,probeId,xyz].join('|'),base=fwFieldTsField(group,component,'mean',parsed0),field={...base,canonical:'probe:'+fwFieldTsCanonical(group,component,probeId),display:String(group.name)+(component!=='value'?' · '+component:'')+' · Probe '+String(probe.view),quantity:'field3d_probe_'+group.name+'_'+component,original:'OpenFOAM 3D field sampled at fixed XYZ'};
  let s=(series||[]).find(s=>s.fieldHistoryKey===key);const loc='XYZ '+probe.point.map(fvFmt).join(', ');
  if(!s){s={id:nextId++,datasetType:'timeseries',caseId:c.id,caseName:c.name,fileName:'3D Probe field history',sourcePath:'derived:'+key,field,probe:'View '+probe.view,location:loc,t:x,y,visible:true,color:null,width:2.2,dash:c.dash||'solid',opacity:1,axis:'Auto',customLabel:'',derivedKind:'field_history_workspace',fieldHistoryKey:key,probePoint:[...probe.point]};s.color=automaticSeriesColor(s);series.push(s)}else Object.assign(s,{caseId:c.id,caseName:c.name,field,probe:'View '+probe.view,location:loc,t:x,y,visible:true,probePoint:[...probe.point]});
  fwState.fieldTsKeys.add(key);return s
}
async function fwBuildProfileHistory(slot,seq){
  const q=fwProfileTsSelection(slot);if(!q.caseId||!q.set||!q.field||!q.line||!Number.isFinite(q.position))return null;
  const rows=fwProfileSeriesAll().filter(s=>String(s.caseId??s.caseName??'')===String(q.caseId)&&(s.profileOutputPath||'')===q.set&&s.field?.canonical===q.field&&(s.profileLineKey||s.profileLine||'')===q.line).sort((a,b)=>Number(a.profileTime)-Number(b.profileTime));if(!rows.length)return null;
  const x=[],y=[];for(let i=0;i<rows.length;i++){if(seq!==fwState.fieldTsSeq)return null;const pairs=playbackSpatialPairs(rows[i]),value=playbackSpatialValueAt(pairs,q.position);if(Number.isFinite(value)){x.push(Number(rows[i].profileTime));y.push(value)}if(i%10===9)await new Promise(r=>setTimeout(r,0))}
  if(!x.length)throw new Error(fwUi('The selected position is outside the available profile domain.','La posición seleccionada está fuera del dominio disponible del perfil.'));
  const base=rows[0],unit=base.profileCoordUnit||'',key=['profile-history',q.caseId,q.set,q.field,q.line,Number(q.position).toPrecision(12)].join('|'),field={...base.field,canonical:'profile:'+base.field.canonical+':'+q.line+':'+Number(q.position).toPrecision(8),display:localizedFieldName(base.field)+' · '+(base.profileLine||q.line)+' @ '+fvFmt(q.position)+(unit?' '+unit:''),original:'Spatial profile sampled at fixed coordinate over physical time'};
  let s=(series||[]).find(s=>s.fieldHistoryKey===key);const caseObj=caseById(base.caseId),loc=(base.profileLine||q.line)+' @ '+fvFmt(q.position)+(unit?' '+unit:'');
  if(!s){s={id:nextId++,datasetType:'timeseries',caseId:base.caseId,caseName:caseObj?.name||base.caseName||'',fileName:'Profile time history',sourcePath:'derived:'+key,field,probe:null,location:loc,t:x,y,visible:true,color:null,width:2.2,dash:caseObj?.dash||base.dash||'solid',opacity:1,axis:'Auto',customLabel:'',derivedKind:'field_history_workspace',fieldHistoryKey:key,profileHistory:true};s.color=automaticSeriesColor(s);series.push(s)}else Object.assign(s,{caseId:base.caseId,caseName:caseObj?.name||base.caseName||'',field,location:loc,t:x,y,visible:true});
  fwState.fieldTsKeys.add(key);return s
}
async function fwBuildOneFieldHistory(slot,seq){
  if(slot===2&&!document.getElementById('fwTsEnable2')?.checked)return null;
  const source=fwFieldTsSource(slot);if(source==='probe')return fwBuildProbeFieldHistory(slot,seq);if(source==='profile')return fwBuildProfileHistory(slot,seq);
  const c=fwFieldTsCase(slot),region=fwFieldTsRegion(slot),group=fwFieldTsGroup(slot),component=document.getElementById('fwTsComponent'+slot)?.value||'value',stat=document.getElementById('fwTsStat'+slot)?.value||'mean';
  if(!c||!group)return null;
  const times=(group.times||[]).map(Number).filter(Number.isFinite).sort((a,b)=>a-b),x=[],y=[];let parsed0=null;
  for(let i=0;i<times.length;i++){
    if(seq!==fwState.fieldTsSeq)return null;
    const data=await fvLoadFrameData(c,group,region,times[i],component,{includeBoundary:false});if(seq!==fwState.fieldTsSeq)return null;
    parsed0=parsed0||data.parsed;const value=fwFieldTsMetric(data.range,stat);if(Number.isFinite(value)){x.push(times[i]);y.push(value)}
    if(i%3===2)await new Promise(r=>setTimeout(r,0))
  }
  if(!x.length)throw new Error(fwUi('No finite 3D field-history values were produced.','No se produjeron valores finitos para la historia temporal 3D.'));
  const key=fwFieldTsSourceKey(c,region,group,component,stat),field=fwFieldTsField(group,component,stat,parsed0);let s=(series||[]).find(s=>s.fieldHistoryKey===key);
  if(!s){
    s={id:nextId++,datasetType:'timeseries',caseId:c.id,caseName:c.name,fileName:'3D field history',sourcePath:'derived:'+key,field,probe:null,location:region||'',t:x,y,visible:true,color:null,width:2.2,dash:c.dash||'solid',opacity:1,axis:'Auto',customLabel:'',derivedKind:'field_history_workspace',fieldHistoryKey:key};
    s.color=automaticSeriesColor(s);series.push(s)
  }else{Object.assign(s,{caseId:c.id,caseName:c.name,field,t:x,y,visible:true,location:region||'',dash:c.dash||s.dash||'solid'})}
  fwState.fieldTsKeys.add(key);return s
}
async function fwBuildFieldTimeSeries(){
  if(!fwState.active||fwState.companion!=='timeseries')return;
  const seq=++fwState.fieldTsSeq;fwFieldTsSetStatus(fwUi('Building 3D field histories…','Construyendo historias temporales 3D…'));
  for(const s of series||[])if(s.derivedKind==='field_history_workspace')s.visible=false;
  const built=[];for(const slot of [1,2]){const s=await fwBuildOneFieldHistory(slot,seq);if(seq!==fwState.fieldTsSeq)return;if(s)built.push(s)}
  if(seq!==fwState.fieldTsSeq)return;if(!built.length){fwFieldTsSetStatus(fwUi('Choose at least one 3D-ready field.','Elige al menos un campo 3D disponible.'),true);return}
  try{refreshDatasetControls()}catch{};try{refreshTimeSeriesControls()}catch{}
  const p=document.getElementById('timeSeriesVariable'),s2=document.getElementById('timeSeriesVariable2'),probe=document.getElementById('timeSeriesProbe'),family=document.getElementById('timeSeriesFamily');
  if(p){delete p.dataset.showAll;if([...p.options].some(o=>o.value===built[0].field.canonical))p.value=built[0].field.canonical}
  if(s2){const second=built[1]?.field?.canonical||'';if(second&&second!==built[0].field.canonical&&[...s2.options].some(o=>o.value===second)){s2.disabled=false;s2.value=second}else s2.value=''}
  if(probe)probe.value='';if(family)family.value='';
  try{refreshTimeSeriesControls()}catch{};try{renderList();updateMeta();draw()}catch(e){console.error(e)}
  fwFieldTsSetStatus(built.length+' '+fwUi(built.length===1?'3D field curve':'3D field curves',built.length===1?'curva de campo 3D':'curvas de campo 3D'));
  const empty=document.getElementById('fwPlotEmpty');empty?.classList.add('hidden')
}

function fwCompanionControlIds(mode){
  if(mode==='profile')return['profileControls','playbackGlobal'];
  if(mode==='timeseries')return['timeSeriesControls'];
  if(mode==='log')return['logControls','playbackGlobal'];
  return[]
}
function fwRestoreCompanionNodes(){
  for(const id of ['profileControls','timeSeriesControls','logControls','playbackGlobal'])fwRestore(document.getElementById(id));
  fwRestore(document.querySelector('#fw2DHost .chartwrap'))
}
function fwCompanionTitle(mode){
  return mode==='profile'?fwUi('Spatial Profile','Perfil espacial'):mode==='timeseries'?fwUi('Time Series','Series temporales'):mode==='log'?fwUi('Solver Logs','Logs del solver'):fwUi('No companion plot','Sin gráfica complementaria')
}
function fwSetCompanion(mode){
  mode=['profile','timeseries','log','none'].includes(mode)?mode:'profile';fwState.companion=mode;
  const select=document.getElementById('fwCompanion');if(select&&select.value!==mode)select.value=mode;
  fwRestoreCompanionNodes();
  const card=document.getElementById('fwPlotCard'),group=document.getElementById('fw2DControlGroup'),empty=document.getElementById('fwPlotEmpty'),title=document.getElementById('fwPlotTitle'),controlTitle=document.getElementById('fw2DControlTitle');
  card?.classList.toggle('companion-none',mode==='none');if(group)group.style.display=mode==='none'?'none':'';
  if(title)title.textContent=fwCompanionTitle(mode);if(controlTitle)controlTitle.textContent=fwCompanionTitle(mode)+' '+fwUi('controls','controles');
  if(mode==='none'){if(empty){empty.classList.remove('hidden');empty.textContent=fwUi('3D-only workspace. Choose a companion plot at any time.','Workspace solo 3D. Elige una gráfica complementaria cuando quieras.')}return}
  const coreMode=mode==='profile'?'profile':mode==='log'?'log':'timeseries';
  if(currentDataView==='field3d')currentDataView='catalog';
  try{fwPrevSetDataView(coreMode)}catch(e){console.error(e)}
  const chart=document.querySelector('#chartViewport .chartwrap')||document.querySelector('.chartwrap');if(chart){fwRemember(chart);document.getElementById('fw2DHost')?.appendChild(chart);chart.classList.remove('hidden')}
  for(const id of fwCompanionControlIds(mode)){const n=fwMove(id,'fw2DControlsHost');if(n&&mode!=='timeseries'||(n&&timeSeriesOptionsBase().length))n.classList.remove('hidden')}
  fwRefreshFieldTsControls();
  const fieldHistoryAvailable=mode==='timeseries'&&fwFieldTsReadyCases().some(c=>fvReadyRegions(c).some(r=>fvFieldGroups(c,r,null,'any').some(g=>['scalar','vector'].includes(g.kind)&&(g.times||[]).length)));
  if(empty){const has=mode==='profile'?profileOptionsBase().length:mode==='timeseries'?(timeSeriesOptionsBase().length||fieldHistoryAvailable):logContextOptionsBase().length;empty.classList.toggle('hidden',!!has);empty.textContent=has?'':fwUi('No compatible data are loaded for this companion view.','No hay datos compatibles cargados para esta vista complementaria.')}
  if(mode==='timeseries'&&fieldHistoryAvailable)setTimeout(()=>fwBuildFieldTimeSeries().catch(e=>fwFieldTsSetStatus(String(e?.message||e),true)),0);
  setTimeout(()=>{try{draw()}catch{};fwUpdateTimeBadge();try{fvRender()}catch{}},0)
}
function fwUpdateTimeBadge(){
  const e=document.getElementById('fwPlotTime');if(!e)return;
  if(fwState.companion==='profile'){const t=Number(document.getElementById('profileTimeInput')?.value||document.getElementById('profileTime')?.value);e.textContent=Number.isFinite(t)?'t = '+fvFmt(t)+' s':'—'}
  else if(fwState.companion==='log'){const t=Number(document.getElementById('logCurrentTime')?.value);e.textContent=Number.isFinite(t)?'t = '+fvFmt(t)+' s':'—'}
  else e.textContent=fwState.companion==='timeseries'?fwUi('time history','historia temporal'):'—'
}
function fwSyncCompanionTime(time){
  if(!fwState.active||!fwState.syncTime||!Number.isFinite(Number(time)))return;
  try{
    if(fwState.companion==='profile'&&profileOptionsBase().length)applyProfileTimeValue(Number(time),{renderListToo:false});
    else if(fwState.companion==='log'&&logContextOptionsBase().length){const times=logAvailableTimes(),t=nearestValue(times,Number(time));if(t!=null)syncLogTimeNavigator(t)}
  }catch(e){console.warn('Field Workspace time sync:',e)}
  fwUpdateTimeBadge()
}
function fwUpdateViewCount(){
  const e=document.getElementById('fw3DCount');if(!e)return;let n=1;
  try{if(fcState.enabled)n=2+fcExtraViews.length}catch{}e.textContent=n+' '+(n===1?fwUi('view','vista'):fwUi('views','vistas'))
}
function fwAdd3DView(){
  const panel=document.getElementById('fcPanel');if(panel){panel.open=true;panel.classList.add('fwCompareConfig')}
  try{
    const enabled=document.getElementById('fcEnabled');
    if(enabled&&!enabled.checked){
      enabled.checked=true;enabled.dispatchEvent(new Event('change',{bubbles:true}));
      fwUpdateViewCount();setTimeout(()=>document.getElementById('fcCase')?.focus(),0);return
    }
    if(typeof fcExtraAdd==='function'&&2+fcExtraViews.length<FC_MAX_TOTAL_VIEWS){
      fcExtraAdd();fwUpdateViewCount();
      const id=fcExtraViews.at(-1)?.id;if(id)setTimeout(()=>document.getElementById('fcExtra'+id+'Case')?.focus(),0);
      return
    }
    fvSetStatus(fwUi('Maximum of four synchronized 3D views reached.','Se alcanzó el máximo de cuatro vistas 3D sincronizadas.'),false)
  }catch(e){console.error(e)}
}
function fwMount3D(){
  if(!fwFieldReady())return false;
  const panel=document.getElementById('fieldViewPanel'),controls=document.getElementById('fieldViewControls');if(!panel||!controls)return false;
  fwMove('fieldViewPanel','fw3DHost');fwMove('fieldViewControls','fw3DControlsHost');panel.classList.add('active');controls.classList.remove('hidden');
  const compare=document.getElementById('fcPanel');if(compare){compare.open=true;compare.classList.add('fwCompareConfig')}
  const animation=document.getElementById('fvAnimationPanel');if(animation)animation.classList.add('fwAnimationConfig');
  document.getElementById('workspace')?.classList.remove('fvMode');
  document.querySelector('.datasetTabs #fieldViewTab')?.setAttribute('aria-hidden','true');
  try{fvRefreshSelectors(true)}catch{};if(!fvState.mesh)setTimeout(()=>fvLoadSelection().catch?.(()=>{}),0);setTimeout(()=>fvRender(),0);return true
}
function fwEnter(){
  fwCreateSurface();if(!fwMount3D())return;
  fwState.active=true;activeAppMode='field';
  for(const m of ['workspace','data','analysis','review','live','field'])document.body.classList.toggle('appMode-'+m,m==='field');
  document.querySelectorAll('.modeNavBtn').forEach(b=>b.classList.toggle('active',b.dataset.mode==='field'));
  const top=document.querySelector('.top h2');if(top)top.textContent=fwUi('Field Workspace','Workspace de campos');
  const trail=document.getElementById('contextTrail');if(trail)trail.textContent=fwUi('Field View','Vista 3D');
  const preferred=(fwState.companion==='profile'&&profileOptionsBase().length)?'profile':fwState.companion;fwSetCompanion(preferred);
  fwSetLayout(fwState.layout);fwUpdateViewCount();setTimeout(()=>{fvRender();fwUpdateTimeBadge()},0)
}
function fwLeave(){
  if(!fwState.active)return;fwState.active=false;
  fwRestoreCompanionNodes();fwRestore(document.getElementById('fieldViewPanel'));fwRestore(document.getElementById('fieldViewControls'));
  document.getElementById('fieldViewPanel')?.classList.remove('active');document.getElementById('fieldViewControls')?.classList.add('hidden');
  document.getElementById('fwFieldTsControls')?.classList.add('hidden');++fwState.fieldTsSeq;
  try{fvStopPlayback()}catch{}
}
function fwInstall(){
  if(fwState.installed)return;fwState.installed=true;fwCreateSurface();
  const oldFieldTab=document.getElementById('fieldViewTab');if(oldFieldTab)oldFieldTab.style.display='none';
  const oldGo=document.getElementById('workspaceGoFieldView');if(oldGo)oldGo.onclick=()=>setAppMode('field');
  const prevApp=setAppMode;setAppMode=function(mode){if(mode==='field'){fwEnter();return}if(fwState.active)fwLeave();return prevApp.apply(this,arguments)};
  fwPrevSetDataView=setDataView;setDataView=function(mode){if(mode==='field3d'){setAppMode('field');return}return fwPrevSetDataView.apply(this,arguments)};
  const prevTrail=updateContextTrail;updateContextTrail=function(){if(activeAppMode==='field'){const t=document.getElementById('contextTrail');if(t)t.textContent=fwUi('Field View','Vista 3D');return}return prevTrail.apply(this,arguments)};
  if(typeof fvLoadFrame==='function'&&!fvLoadFrame.__fwPatched){const prev=fvLoadFrame;fvLoadFrame=async function(...args){const result=await prev.apply(this,args);fwSyncCompanionTime(fvState.time);return result};fvLoadFrame.__fwPatched=true}
  document.addEventListener('foamlens-language-change',()=>{fwUpdateNavText();if(fwState.active){const top=document.querySelector('.top h2');if(top)top.textContent=fwUi('Field Workspace','Workspace de campos');fwSetCompanion(fwState.companion)}});
  document.addEventListener('change',e=>{if(e.target?.id==='fcEnabled'||String(e.target?.id||'').startsWith('fcExtra'))setTimeout(fwUpdateViewCount,0)});
  if(oldFieldTab)oldFieldTab.onclick=()=>setAppMode('field');
}
let fwPrevSetDataView=setDataView;
fwInstall();
window.FoamLensFieldWorkspace={enter:fwEnter,setCompanion:fwSetCompanion,add3DView:fwAdd3DView,setLayout:fwSetLayout,syncTime:fwSyncCompanionTime};
