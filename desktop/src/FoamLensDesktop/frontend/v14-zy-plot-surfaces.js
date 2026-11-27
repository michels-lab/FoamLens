/* FoamLens Desktop v1.6.0 — stable 2D plot surfaces for Data / Analysis / Field. */

const flPlotSurfaceRoles=['canvas','previewTools','previewBadge','clearPins','tooltip','canvasSelection','workspaceHint','empty'];
const flPlotSurfaces=new Map();
const flPlotSurfaceState=new Map([
  ['data',{view:currentDataView||'timeseries',pinned:[],activeId:null}],
  ['analysis',{view:'timeseries',pinned:[],activeId:null}],
  ['field',{view:'profile',pinned:[],activeId:null}]
]);
let flPlotSurfaceActive='data';
let flPlotSurfaceTemplate=null;
let flPlotSurfacePrevSetAppMode=null;

function flPlotRole(surface,role){
  return surface?.querySelector?.('[data-fl-plot-role="'+role+'"]')||null
}
function flPlotSurfaceAnnotate(surface,key,canonical=false){
  if(!surface)return null;
  surface.dataset.flPlotSurface=key;
  surface.classList.add('flPlotSurface');
  for(const role of flPlotSurfaceRoles){
    const el=surface.querySelector('[data-fl-plot-role="'+role+'"]')||
      surface.querySelector('#'+role)||
      surface.querySelector('#'+role+'-'+key);
    if(!el)continue;
    el.dataset.flPlotRole=role;
    el.id=canonical?role:role+'-'+key
  }
  return surface
}
function flPlotSurfaceBind(surface,key){
  const canvas=flPlotRole(surface,'canvas');
  if(canvas)bindPlotCanvasInteractions(canvas);
  const clear=flPlotRole(surface,'clearPins');
  if(clear)clear.onclick=()=>{
    if(flPlotSurfaceActive!==key)flPlotSurfaceActivate(key,null,{restore:true});
    pinnedPoints=[];draw();
    document.dispatchEvent(new CustomEvent('foamlens-plot-state-change',{detail:{surface:key,reason:'clear-pins'}}))
  }
}
function flPlotSurfaceClone(key,host){
  if(!flPlotSurfaceTemplate||!host)return null;
  const surface=flPlotSurfaceTemplate.cloneNode(true);
  surface.classList.remove('previewExact','dragging','dragMode');
  surface.classList.add('flPlotSurfaceInactive');
  surface.style.minWidth='';
  surface.style.minHeight='';
  flPlotSurfaceAnnotate(surface,key,false);
  host.appendChild(surface);
  flPlotSurfaces.set(key,surface);
  flPlotSurfaceBind(surface,key);
  return surface
}
function flPlotSurfaceEnsure(key,host=null){
  if(flPlotSurfaces.has(key)){
    const surface=flPlotSurfaces.get(key);
    if(host&&surface.parentElement!==host)throw new Error('FoamLens plot surface '+key+' already belongs to another host.');
    return surface
  }
  if(key==='analysis')host=host||document.getElementById('chartViewport');
  if(key==='field')host=host||document.getElementById('fw2DHost');
  return flPlotSurfaceClone(key,host)
}
function flPlotSurfaceCapture(key=flPlotSurfaceActive){
  const state=flPlotSurfaceState.get(key)||{};
  state.view=currentDataView||state.view||'timeseries';
  state.pinned=(pinnedPoints||[]).map(p=>({...p}));
  state.activeId=activeId??null;
  flPlotSurfaceState.set(key,state);
  return state
}
function flPlotSurfaceRestore(key){
  const state=flPlotSurfaceState.get(key)||{};
  currentDataView=state.view||'timeseries';
  pinnedPoints=(state.pinned||[]).map(p=>({...p}));
  activeId=state.activeId??null;
  hoverPoint=null;
  selectedFigureElement=null;
  dragState=null;
  legendResizeState=null;
  forceDragMode=false;
  lastCanvasBlocks=[];
  figureHitRegions=[];
}
function flPlotSurfaceSeriesKey(id){
  const item=series.find(s=>Number(s?.id)===Number(id));if(!item)return'';
  try{return String(seriesWorkspaceKey(item)||'')}catch{return String(item.sourcePath||item.fileName||item.id||'')}
}
function flPlotSurfaceSeriesId(key){
  key=String(key||'');if(!key)return null;
  const item=series.find(s=>{try{return String(seriesWorkspaceKey(s)||'')===key}catch{return String(s.sourcePath||s.fileName||s.id||'')===key}});
  return item?.id??null
}
function flPlotSurfaceSerialize(){
  flPlotSurfaceCapture(flPlotSurfaceActive);
  const surfaces={};
  for(const [name,state] of flPlotSurfaceState){
    surfaces[name]={
      view:state.view||'timeseries',
      pinned:(state.pinned||[]).map(p=>({seriesKey:flPlotSurfaceSeriesKey(p.seriesId),index:Number(p.index)})).filter(p=>p.seriesKey&&Number.isFinite(p.index)),
      activeSeriesKey:flPlotSurfaceSeriesKey(state.activeId)
    }
  }
  return{schema:1,active:flPlotSurfaceActive,surfaces}
}
function flPlotSurfaceHydrate(payload,{activate=false}={}){
  if(!payload||typeof payload!=='object')return false;
  const source=payload.surfaces&&typeof payload.surfaces==='object'?payload.surfaces:{};
  for(const name of ['data','analysis','field']){
    const saved=source[name];if(!saved||typeof saved!=='object')continue;
    const state=flPlotSurfaceState.get(name)||{};
    state.view=['timeseries','profile','log','catalog'].includes(saved.view)?saved.view:(name==='field'?'profile':'timeseries');
    state.pinned=(saved.pinned||[]).map(p=>({seriesId:flPlotSurfaceSeriesId(p.seriesKey),index:Number(p.index)})).filter(p=>p.seriesId!=null&&Number.isFinite(p.index));
    state.activeId=flPlotSurfaceSeriesId(saved.activeSeriesKey);
    flPlotSurfaceState.set(name,state)
  }
  const target=['data','analysis','field'].includes(payload.active)?payload.active:flPlotSurfaceActive;
  if(activate)flPlotSurfaceActivate(target,null,{restore:true});
  else if(flPlotSurfaceState.has(flPlotSurfaceActive))flPlotSurfaceRestore(flPlotSurfaceActive);
  return true
}
function flPlotSurfaceSwapCanonicalIds(fromKey,toKey){
  if(fromKey===toKey)return;
  const from=flPlotSurfaces.get(fromKey),to=flPlotSurfaces.get(toKey);
  if(!from||!to)return;
  for(const role of flPlotSurfaceRoles){
    const prev=flPlotRole(from,role),next=flPlotRole(to,role);
    if(prev)prev.id=role+'-'+fromKey;
    if(next)next.id=role
  }
}
function flPlotSurfaceRefresh(){
  try{hideCanvasSelection()}catch{}
  try{updateDatasetViewUI()}catch(e){console.warn('Plot surface dataset UI refresh failed',e)}
  try{renderList();updateMeta()}catch(e){console.warn('Plot surface metadata refresh failed',e)}
  try{
    if(currentDataView==='catalog')renderDataCatalog();
    else draw()
  }catch(e){console.warn('Plot surface render refresh failed',e)}
}
function flPlotSurfaceActivate(key,host=null,options={}){
  key=['data','analysis','field'].includes(key)?key:'data';
  const target=flPlotSurfaceEnsure(key,host);if(!target)return false;
  if(key===flPlotSurfaceActive){
    target.classList.remove('flPlotSurfaceInactive');
    if(options.restore!==false)flPlotSurfaceRefresh();
    return true
  }
  flPlotSurfaceCapture(flPlotSurfaceActive);
  const previous=flPlotSurfaceActive;
  flPlotSurfaceSwapCanonicalIds(previous,key);
  for(const [name,surface] of flPlotSurfaces)surface.classList.toggle('flPlotSurfaceInactive',name!==key);
  flPlotSurfaceActive=key;
  if(options.restore!==false){
    flPlotSurfaceRestore(key);
    flPlotSurfaceRefresh()
  }
  document.dispatchEvent(new CustomEvent('foamlens-plot-surface-change',{detail:{surface:key,previous}}));
  document.dispatchEvent(new CustomEvent('foamlens-plot-state-change',{detail:{surface:key,reason:'activate'}}));
  return true
}
function flPlotSurfaceInstall(){
  const data=document.querySelector('#chartViewport > .chartwrap')||document.querySelector('.chartwrap');
  if(!data)return false;
  flPlotSurfaceAnnotate(data,'data',true);
  flPlotSurfaces.set('data',data);
  flPlotSurfaceBind(data,'data');
  flPlotSurfaceTemplate=data.cloneNode(true);
  flPlotSurfaceEnsure('analysis',document.getElementById('chartViewport'));
  const style=document.createElement('style');style.id='flPlotSurfaceStyles';style.textContent=
    '.flPlotSurfaceInactive{display:none!important}.flPlotSurface[data-fl-plot-surface]{isolation:isolate}';
  document.head.appendChild(style);
  flPlotSurfacePrevSetAppMode=setAppMode;
  setAppMode=function(mode){
    const result=flPlotSurfacePrevSetAppMode.apply(this,arguments);
    if(mode!=='field')flPlotSurfaceActivate(mode==='analysis'?'analysis':'data',null,{restore:true});
    return result
  };
  window.FoamLensPlotSurfaces={
    ensure:flPlotSurfaceEnsure,
    activate:flPlotSurfaceActivate,
    active:()=>flPlotSurfaceActive,
    surface:key=>flPlotSurfaces.get(key)||null,
    state:key=>({...flPlotSurfaceState.get(key),pinned:(flPlotSurfaceState.get(key)?.pinned||[]).map(p=>({...p}))}),
    capture:()=>flPlotSurfaceCapture(flPlotSurfaceActive),
    serialize:flPlotSurfaceSerialize,
    hydrate:flPlotSurfaceHydrate
  };
  return true
}
flPlotSurfaceInstall();


/* FOAMLENS_ENTITY_SELECTION_CORE_START */
// Read-only extraction: original field values, representative physical coordinates.
// A plane predicate selects entities, not geometrically clipped cell fractions.
function fesNum(v){if(typeof v==='number')return Number.isFinite(v)?v:NaN;if(typeof v!=='string'||!v.trim()||!(/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/).test(v.trim()))return NaN;return Number.isFinite(Number(v))?Number(v):NaN}
function fesXYZ(array,index){if(!Number.isSafeInteger(index)||index<0)return null;const p=[array?.[3*index],array?.[3*index+1],array?.[3*index+2]];return p.every(Number.isFinite)?p:null}
function fesFacePoint(mesh,i){
 const lo=mesh.faceOffsets?.[i],hi=mesh.faceOffsets?.[i+1],ids=mesh.facePoints;
 if(!Number.isSafeInteger(lo)||!Number.isSafeInteger(hi)||lo<0||hi-lo<3||hi>(ids?.length??0))return null;
 const seen=new Set(),p=[0,0,0];for(let j=lo;j<hi;j++){const id=ids[j],q=fesXYZ(mesh.points,id);if(!q||seen.has(id))return null;seen.add(id);for(let k=0;k<3;k++)p[k]+=q[k]/(hi-lo)}
 return p.every(Number.isFinite)?p:null
}
function fesConfig(raw={}){
 const modes=['all','threshold','box','plane','ids'],mode=raw.mode;
 if(!modes.includes(mode))return null;
 const max=fesNum(raw.limit??100000);if(!Number.isSafeInteger(max)||max<1||max>100000)return null;
 const c={mode,limit:max};
 if(mode==='threshold'||raw.threshold===true){const a=fesNum(raw.min),b=fesNum(raw.max);if(!Number.isFinite(a)||!Number.isFinite(b)||a>b)return null;c.threshold=[a,b]}
 if(mode==='box'){const a=raw.bounds;if(!Array.isArray(a)||a.length!==6)return null;const b=a.map(fesNum);if(!b.every(Number.isFinite)||b[0]>b[1]||b[2]>b[3]||b[4]>b[5])return null;c.bounds=b}
 if(mode==='plane'){const axis=['x','y','z'].indexOf(raw.axis),offset=fesNum(raw.offset);if(axis<0||!Number.isFinite(offset)||!['above','below'].includes(raw.side))return null;c.axis=axis;c.offset=offset;c.side=raw.side}
 if(mode==='ids'){const tokens=String(raw.ids??'').trim().split(/[\s,;]+/);if(!tokens.length||tokens.some(v=>!/^\d+$/.test(v)))return null;const ids=tokens.map(Number);if(ids.some(v=>!Number.isSafeInteger(v)||v<0))return null;c.ids=[...new Set(ids)].sort((a,b)=>a-b)}
 return c
}
function fesExtract(input,raw){
 const fail=reason=>({valid:false,reason}),cfg=fesConfig(raw);if(!cfg)return fail('invalid-filter');
 const {mesh,values,source,boundary}=input||{};
 if(!mesh||!source||source.caseId==null||!String(source.caseId).trim()||!String(source.field||'').trim()||!Number.isFinite(source.time_s)||!Array.isArray(source.paths)||!source.paths.length||source.paths.some(x=>typeof x!=='string'||!x.trim())||!['volume','point','surface'].includes(source.association))return fail('source-not-ready');
 const assoc=source.association,count=assoc==='volume'?mesh.cellCount:assoc==='point'?mesh.pointCount:mesh.internalFaceCount;
 if(!Number.isSafeInteger(count)||count<0||values?.length!==count)return fail('field-count-mismatch');
 if(assoc==='surface'&&(!Number.isSafeInteger(mesh.faceCount)||mesh.faceCount<count))return fail('face-count-mismatch');
 const total=assoc==='surface'?mesh.faceCount:count,ids=cfg.ids?new Set(cfg.ids):null;
 if(ids&&cfg.ids.some(i=>i>=total))return fail('id-outside-source');
 const rows=[],coverage={total,examined:0,missingGeometry:0,missingValue:0,excluded:0,selected:0};let min=Infinity,max=-Infinity;
 for(let i=0;i<total;i++){
  coverage.examined++;
  const point=assoc==='volume'?fesXYZ(mesh.cellCenters,i):assoc==='point'?fesXYZ(mesh.points,i):fesFacePoint(mesh,i);
  const value=i<count?values[i]:boundary?.get?.(i);
  if(!point){coverage.missingGeometry++;continue}
  if(!Number.isFinite(value)){coverage.missingValue++;continue}
  if((ids&&!ids.has(i))||(cfg.threshold&&(value<cfg.threshold[0]||value>cfg.threshold[1]))||(cfg.bounds&&point.some((v,k)=>v<cfg.bounds[2*k]||v>cfg.bounds[2*k+1]))||(cfg.mode==='plane'&&(cfg.side==='above'?point[cfg.axis]<cfg.offset:point[cfg.axis]>cfg.offset))){coverage.excluded++;continue}
  if(rows.length>=cfg.limit)return fail('selection-limit-exceeded');
  rows.push({id:i,point_m:point,value,kind:assoc==='surface'?(i<count?'internal-face':'explicit-boundary-face'):assoc==='point'?'mesh-point':'cell-centre'});
  min=Math.min(min,value);max=Math.max(max,value);
 }
 coverage.selected=rows.length;
 return{valid:true,schema:'foamlens/entity-selection/1',source:{...source,paths:source.paths.slice(),dimensions:Array.isArray(source.dimensions)?source.dimensions.slice():null},filter:cfg,coverage,range:rows.length?{min,max}:null,rows,method:'Whole-entity selection by representative coordinate and original scalar/component value. Face coordinates are vertex averages. IDs are indices in the loaded mesh (assembled when decomposed), not persistent global IDs. No interpolation, volume clipping or integration.'}
}
function fesCsv(r){
 const cell=v=>{if(v==null)return '';let q=String(v);if(typeof v==='string'&&/^\s*[=+@\-]/.test(q))q="'"+q;return '"'+q.replace(/"/g,'""')+'"'};
 const s=r.source,h=['case_id','region','field','association','component','unit','time_s','mesh_id','entity_id','kind','x_m','y_m','z_m','value','source_paths'];
 return [h.join(','),...r.rows.map(p=>[s.caseId,s.region,s.field,s.association,s.component,s.unit,s.time_s,s.meshId,p.id,p.kind,...p.point_m,p.value,JSON.stringify(s.paths)].map(cell).join(','))].join('\n')+'\n'
}
function fesPreview(rows,limit=4000){if(rows.length<=limit)return rows.slice();return Array.from({length:limit},(_,i)=>rows[Math.floor(i*(rows.length-1)/(limit-1))])}
/* FOAMLENS_ENTITY_SELECTION_CORE_END */
let fesResult=null,fesPage=0,fesSelected=null;
const fesE=id=>document.getElementById(id);
function fesUi(en,es){try{return flUi(en,es)}catch{return en}}
function fesSource(){
 if(typeof fvState==='undefined'||typeof fvCase!=='function')return null;
 const f=fvState,c=fvCase(),group=typeof fvCurrentFieldGroup==='function'?fvCurrentFieldGroup():null;
 if(!c||!group||String(c.id)!==String(f.caseId)||String(group.name)!==String(f.fieldName)||String(fesE('fvRegion')?.value??'')!==String(f.region??'')||String(fesE('fvComponent')?.value??'')!==String(f.component??'')||!f.mesh||!f.fieldValues||!Number.isFinite(f.time))return null;
 const paths=[...new Set((group.records||[]).filter(x=>Number(x.time)===f.time).map(x=>String(x.sourcePath||x.file?.webkitRelativePath||x.file?.name||'')).filter(Boolean))];
 if(!paths.length)return null;
 const dimensions=f.fieldParsed?.dimensions,unit=dimensions&&typeof pmUnitFromDimensions==='function'?pmUnitFromDimensions(dimensions):'';
 return {mesh:f.mesh,values:f.fieldValues,boundary:f.surfaceBoundary?.values,source:{caseId:String(c.id),caseName:String(c.name||c.id),region:String(f.region??''),field:f.fieldName,association:f.fieldStorage,component:f.component,time_s:f.time,dimensions,unit,paths,meshId:String(f.meshCacheKey||''),decomposed:!!f.mesh.decomposed}}
}
function fesReadConfig(){return{mode:fesE('fesMode').value,threshold:fesE('fesThreshold').checked,min:fesE('fesMin').value,max:fesE('fesMax').value,bounds:['X0','X1','Y0','Y1','Z0','Z1'].map(k=>fesE('fes'+k).value),axis:fesE('fesAxis').value,side:fesE('fesSide').value,offset:fesE('fesOffset').value,ids:fesE('fesIds').value,limit:fesE('fesLimit').value}}
function fesClear(message=''){fesResult=null;fesPage=0;fesSelected=null;fesE('fesStatus').textContent=message;fesE('fesRows').replaceChildren();fesE('fesPlot').replaceChildren();fesE('fesPageText').textContent='';for(const id of ['fesJson','fesCsv','fesPrev','fesNext'])fesE(id).disabled=true}
function fesControls(){
 const mode=fesE('fesMode').value;
 fesE('fesBoxFields').hidden=mode!=='box';fesE('fesPlaneFields').hidden=mode!=='plane';fesE('fesIdFields').hidden=mode!=='ids';fesE('fesThresholdFields').hidden=mode!=='threshold'&&!fesE('fesThreshold').checked;
}
function fesDefaults(){
 const x=fesSource();if(!x){fesClear(fesUi('Load a complete Field A frame first.','Carga primero un cuadro completo de Field A.'));return}
 const {mesh,values}=x;let min=Infinity,max=-Infinity;for(const v of values){if(Number.isFinite(v)){min=Math.min(min,v);max=Math.max(max,v)}}for(const v of x.boundary?.values?.()||[]){if(Number.isFinite(v)){min=Math.min(min,v);max=Math.max(max,v)}}
 if(Number.isFinite(min)){fesE('fesMin').value=String(min);fesE('fesMax').value=String(max)}
 for(let k=0;k<3;k++){const a=mesh.boundsMin?.[k],b=mesh.boundsMax?.[k],letter='XYZ'[k];if(Number.isFinite(a)&&Number.isFinite(b)){fesE('fes'+letter+'0').value=String(a);fesE('fes'+letter+'1').value=String(b)}}
 const axis=['x','y','z'].indexOf(fesE('fesAxis').value),a=mesh.boundsMin?.[axis],b=mesh.boundsMax?.[axis];if(Number.isFinite(a)&&Number.isFinite(b))fesE('fesOffset').value=String(a/2+b/2);
 fesClear(fesUi('Bounds copied from current source. Apply to extract.','Límites copiados de la fuente actual. Aplica para extraer.'))
}
function fesRun(){
 fesClear();const result=fesExtract(fesSource(),fesReadConfig());
 if(!result.valid){const reasons={'invalid-filter':['Invalid filter or missing limits.','Filtro inválido o límites ausentes.'],'source-not-ready':['Load a complete Field A frame with source files.','Carga un cuadro completo de Field A con archivos de origen.'],'field-count-mismatch':['Field length does not match mesh association.','La longitud del campo no coincide con su asociación.'],'face-count-mismatch':['Invalid mesh face count.','Número de caras inválido.'],'id-outside-source':['An ID is outside the loaded mesh.','Un ID está fuera de la malla cargada.'],'selection-limit-exceeded':['Too many selected entities; narrow the filter. No partial export.','Demasiadas entidades seleccionadas; acota el filtro. Sin exportación parcial.']};fesE('fesStatus').textContent=fesUi(...(reasons[result.reason]||[result.reason,result.reason]));return}
 fesResult=result;const q=result.coverage,u=result.source;
 fesE('fesStatus').textContent=fesUi('Snapshot','Captura')+' · '+u.caseName+' / '+(u.region||fesUi('Default','Predeterminada'))+' · '+u.field+' '+u.component+' · t='+u.time_s+' s · '+q.selected+'/'+q.total+' '+fesUi('selected','seleccionadas')+' · '+fesUi('missing geometry/value','sin geometría/valor')+': '+q.missingGeometry+'/'+q.missingValue+(result.range?' · '+result.range.min+'–'+result.range.max+' '+u.unit:'');
 fesE('fesJson').disabled=false;fesE('fesCsv').disabled=false;fesDraw()
}
function fesDraw(){
 const r=fesResult;if(!r)return;const host=fesE('fesRows'),pageSize=30,pages=Math.max(1,Math.ceil(r.rows.length/pageSize));fesPage=Math.max(0,Math.min(fesPage,pages-1));host.replaceChildren();
 for(const p of r.rows.slice(fesPage*pageSize,(fesPage+1)*pageSize)){const b=document.createElement('button');b.type='button';b.className='btn tiny'+(p.id===fesSelected?' primary':'');b.style.cssText='width:100%;text-align:left;white-space:normal;overflow-wrap:anywhere';b.textContent='#'+p.id+' · '+p.point_m.map(x=>x.toPrecision(6)).join(', ')+' m · '+p.value+' '+r.source.unit;b.onclick=()=>{fesSelected=p.id;fesDraw()};host.append(b)}
 fesE('fesPrev').disabled=fesPage===0;fesE('fesNext').disabled=fesPage>=pages-1;fesE('fesPageText').textContent=(fesPage+1)+' / '+pages;
 const plot=fesE('fesPlot');plot.replaceChildren();if(!r.rows.length)return;
 const axes={xy:[0,1],xz:[0,2],yz:[1,2]}[fesE('fesProjection').value]||[0,1],preview=fesPreview(r.rows),selected=r.rows.find(p=>p.id===fesSelected),canvas=document.createElement('canvas');canvas.width=480;canvas.height=280;canvas.style.cssText='width:100%;height:auto;display:block;border-radius:8px;background:#101827';plot.append(canvas);
 const ctx=canvas.getContext('2d');if(!ctx)return;
 let xmin=Infinity,xmax=-Infinity,ymin=Infinity,ymax=-Infinity;for(const p of r.rows){const x=p.point_m[axes[0]],y=p.point_m[axes[1]];xmin=Math.min(xmin,x);xmax=Math.max(xmax,x);ymin=Math.min(ymin,y);ymax=Math.max(ymax,y)}
 const dx=xmax-xmin,dy=ymax-ymin,scale=Math.min(dx>0?400/dx:Infinity,dy>0?200/dy:Infinity),k=Number.isFinite(scale)?scale:1,project=p=>[40+(400-dx*k)/2+(p.point_m[axes[0]]-xmin)*k,240-(200-dy*k)/2-(p.point_m[axes[1]]-ymin)*k];
 ctx.strokeStyle='#738397';ctx.strokeRect(40,40,400,200);ctx.fillStyle='#dbe5ef';ctx.font='12px system-ui';ctx.fillText('XYZ'[axes[0]]+' [m] '+xmin.toPrecision(4)+' – '+xmax.toPrecision(4),40,260);ctx.fillText('XYZ'[axes[1]]+' [m] '+ymin.toPrecision(4)+' – '+ymax.toPrecision(4),40,25);
 for(const p of preview){const [x,y]=project(p),q=r.range.max===r.range.min?.5:(p.value-r.range.min)/(r.range.max-r.range.min);ctx.fillStyle='hsl('+Math.round(230-190*q)+' 80% 55%)';ctx.fillRect(x-2,y-2,4,4)}
 if(selected){const [x,y]=project(selected);ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,7,0,Math.PI*2);ctx.stroke()}
 const note=document.createElement('div');note.className='smallnote';note.textContent=preview.length+'/'+r.rows.length+' '+fesUi('preview points; full extraction in export. Equal physical axis scale.','puntos en vista previa; extracción completa en exportación. Escala física igual en ambos ejes.');plot.append(note);
}
function fesExport(kind){
 const r=fesResult;if(!r)return;const json=kind==='json',data=json?JSON.stringify(r,null,2):fesCsv(r),name='FoamLens_entity_selection.'+kind,mime=json?'application/json':'text/csv';
 if(typeof downloadText==='function'){downloadText(name,data,mime);return}
 const url=URL.createObjectURL(new Blob([data],{type:mime})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
}
function fesMount(){
 if(fesE('fesPanel'))return true;const host=fesE('fieldViewControls');if(!host)return false;
 const box=document.createElement('details');box.className='analysisExt';box.id='fesPanel';
 box.innerHTML='<summary class="analysisExtHead"><strong data-fl-en="Entity selection / extraction · A" data-fl-es="Selección / extracción de entidades · A">Entity selection / extraction · A</strong></summary><div class="extSectionBody"><p class="smallnote" data-fl-en="Read-only snapshot of loaded Field A. Select whole entities by representative coordinates; not geometric clipping or volume integration." data-fl-es="Captura de solo lectura de Field A. Selecciona entidades completas por coordenadas representativas; no es recorte geométrico ni integración de volumen.">Read-only snapshot of loaded Field A. Select whole entities by representative coordinates; not geometric clipping or volume integration.</p>'+
 '<div class="field"><label data-fl-en="Selection" data-fl-es="Selección">Selection</label><select id="fesMode"><option value="all" data-fl-en="All measured entities" data-fl-es="Todas las entidades medidas">All measured entities</option><option value="threshold">Threshold</option><option value="box">XYZ Box</option><option value="plane" data-fl-en="Plane side (whole entities)" data-fl-es="Lado del plano (entidades completas)">Plane side (whole entities)</option><option value="ids" data-fl-en="Entity IDs" data-fl-es="IDs de entidades">Entity IDs</option></select></div>'+
 '<label class="inlineCheck"><input type="checkbox" id="fesThreshold"> <span data-fl-en="Also restrict value range" data-fl-es="Limitar también rango de valor">Also restrict value range</span></label>'+
 '<div id="fesThresholdFields" class="row2"><div class="field"><label>Min</label><input id="fesMin" type="number" step="any"></div><div class="field"><label>Max</label><input id="fesMax" type="number" step="any"></div></div>'+
 '<div id="fesBoxFields">'+['X','Y','Z'].map(k=>'<div class="row2"><div class="field"><label>'+k+' min [m]</label><input id="fes'+k+'0" type="number" step="any"></div><div class="field"><label>'+k+' max [m]</label><input id="fes'+k+'1" type="number" step="any"></div></div>').join('')+'</div>'+
 '<div id="fesPlaneFields"><div class="row2"><div class="field"><label data-fl-en="Axis" data-fl-es="Eje">Axis</label><select id="fesAxis"><option>x</option><option>y</option><option>z</option></select></div><div class="field"><label data-fl-en="Side" data-fl-es="Lado">Side</label><select id="fesSide"><option value="above">≥</option><option value="below">≤</option></select></div></div><div class="field"><label data-fl-en="Plane coordinate [m]" data-fl-es="Coordenada del plano [m]">Plane coordinate [m]</label><input id="fesOffset" type="number" step="any"></div></div>'+
 '<div id="fesIdFields" class="field"><label data-fl-en="Loaded mesh IDs (comma-separated)" data-fl-es="IDs de la malla cargada (separados por comas)">Loaded mesh IDs (comma-separated)</label><textarea id="fesIds" rows="2"></textarea></div>'+
 '<div class="field"><label data-fl-en="Maximum selected rows" data-fl-es="Máximo de filas seleccionadas">Maximum selected rows</label><input id="fesLimit" type="number" min="1" max="100000" value="100000"></div>'+
 '<div class="extActions"><button type="button" class="btn soft" id="fesDefaults" data-fl-en="Use source bounds" data-fl-es="Usar límites de fuente">Use source bounds</button><button type="button" class="btn primary" id="fesRun" data-fl-en="Extract snapshot" data-fl-es="Extraer captura">Extract snapshot</button><button type="button" class="btn soft" id="fesJson">JSON</button><button type="button" class="btn soft" id="fesCsv">CSV</button></div><p class="smallnote" id="fesStatus" aria-live="polite"></p>'+
 '<div class="field"><label data-fl-en="Projection" data-fl-es="Proyección">Projection</label><select id="fesProjection"><option value="xy">XY</option><option value="xz">XZ</option><option value="yz">YZ</option></select></div><div id="fesPlot"></div><div class="extActions"><button class="btn tiny" id="fesPrev" type="button">←</button><span id="fesPageText"></span><button class="btn tiny" id="fesNext" type="button">→</button></div><div id="fesRows" style="display:grid;gap:4px;max-height:320px;overflow:auto"></div></div>';
 host.append(box);for(const el of box.querySelectorAll('input,textarea,select'))if(el.id!=='fesProjection')el.addEventListener('input',()=>{fesControls();fesClear(fesUi('Filter changed; extract again.','Cambió el filtro; extrae otra vez.'))});
 fesE('fesDefaults').onclick=fesDefaults;fesE('fesRun').onclick=fesRun;fesE('fesJson').onclick=()=>fesExport('json');fesE('fesCsv').onclick=()=>fesExport('csv');fesE('fesProjection').onchange=fesDraw;fesE('fesPrev').onclick=()=>{fesPage--;fesDraw()};fesE('fesNext').onclick=()=>{fesPage++;fesDraw()};
 try{flApplyBilingualText(box)}catch{}fesControls();fesClear();return true
}
function fesInstall(){if(fesMount())return;const watch=new MutationObserver(()=>{if(fesMount())watch.disconnect()});watch.observe(document.body,{childList:true,subtree:true})}
fesInstall();
window.FoamLensEntitySelection={fesExtract,fesConfig,fesCsv,fesPreview};
