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
 const fail=reason=>({valid:false,reason}),chain=Array.isArray(raw?.stages)?raw.stages:null,cfg=chain?null:fesConfig(raw),stages=chain?chain.map(fesConfig):[cfg],limit=chain?fesNum(raw.limit??100000):cfg?.limit;
 if(!stages.length||stages.length>12||stages.some(x=>!x)||!Number.isSafeInteger(limit)||limit<1||limit>100000)return fail('invalid-filter');
 const {mesh,values,source,boundary}=input||{};
 if(!mesh||!source||source.caseId==null||!String(source.caseId).trim()||!String(source.field||'').trim()||!Number.isFinite(source.time_s)||!Array.isArray(source.paths)||!source.paths.length||source.paths.some(x=>typeof x!=='string'||!x.trim())||!['volume','point','surface'].includes(source.association))return fail('source-not-ready');
 const assoc=source.association,count=assoc==='volume'?mesh.cellCount:assoc==='point'?mesh.pointCount:mesh.internalFaceCount;
 if(!Number.isSafeInteger(count)||count<0||values?.length!==count)return fail('field-count-mismatch');
 if(assoc==='surface'&&(!Number.isSafeInteger(mesh.faceCount)||mesh.faceCount<count))return fail('face-count-mismatch');
 const total=assoc==='surface'?mesh.faceCount:count,sets=stages.map(c=>c.ids?new Set(c.ids):null);
 if(stages.some(c=>c.ids?.some(i=>i>=total)))return fail('id-outside-source');
 const rows=[],coverage={total,examined:0,missingGeometry:0,missingValue:0,excluded:0,selected:0};let min=Infinity,max=-Infinity;
 for(let i=0;i<total;i++){
  coverage.examined++;
  const point=assoc==='volume'?fesXYZ(mesh.cellCenters,i):assoc==='point'?fesXYZ(mesh.points,i):fesFacePoint(mesh,i);
  const value=i<count?values[i]:boundary?.get?.(i);
  if(!point){coverage.missingGeometry++;continue}
  if(!Number.isFinite(value)){coverage.missingValue++;continue}
  if(stages.some((c,j)=>(sets[j]&&!sets[j].has(i))||(c.threshold&&(value<c.threshold[0]||value>c.threshold[1]))||(c.bounds&&point.some((v,k)=>v<c.bounds[2*k]||v>c.bounds[2*k+1]))||(c.mode==='plane'&&(c.side==='above'?point[c.axis]<c.offset:point[c.axis]>c.offset)))){coverage.excluded++;continue}
  if(rows.length>=limit)return fail('selection-limit-exceeded');
  rows.push({id:i,point_m:point,value,kind:assoc==='surface'?(i<count?'internal-face':'explicit-boundary-face'):assoc==='point'?'mesh-point':'cell-centre'});
  min=Math.min(min,value);max=Math.max(max,value);
 }
 coverage.selected=rows.length;
 return{valid:true,schema:'foamlens/entity-selection/1',source:{...source,paths:source.paths.slice(),dimensions:Array.isArray(source.dimensions)?source.dimensions.slice():typeof source.dimensions==='string'?source.dimensions:null},filter:chain?{mode:'pipeline',stages,limit}:cfg,coverage,range:rows.length?{min,max}:null,rows,method:'Whole-entity selection by representative coordinate and original scalar/component value. Face coordinates are vertex averages. IDs are indices in the loaded mesh (assembled when decomposed), not persistent global IDs. No interpolation, volume clipping or integration.'}
}
function fesCsv(r){
 const cell=v=>{if(v==null)return '';let q=String(v);if(typeof v==='string'&&/^\s*[=+@\-]/.test(q))q="'"+q;return '"'+q.replace(/"/g,'""')+'"'};
 const s=r.source,h=['case_id','region','field','association','component','unit','time_s','mesh_id','entity_id','kind','x_m','y_m','z_m','value','source_paths'];
 return [h.join(','),...r.rows.map(p=>[s.caseId,s.region,s.field,s.association,s.component,s.unit,s.time_s,s.meshId,p.id,p.kind,...p.point_m,p.value,JSON.stringify(s.paths)].map(cell).join(','))].join('\n')+'\n'
}
function fesPreview(rows,limit=4000){if(rows.length<=limit)return rows.slice();return Array.from({length:limit},(_,i)=>rows[Math.floor(i*(rows.length-1)/(limit-1))])}
function fesRecipeKey(source,hasIds=false){
 if(!source)return '';
 return JSON.stringify([source.association,source.field,source.component,source.unit,source.dimensions??null,...(hasIds?[source.caseId,source.region,source.meshId,source.time_s,source.paths]:[])]);
}
function fesRecipe(stages,source){
 if(!source||!Array.isArray(stages)||!stages.length||stages.length>12||stages.some(x=>!fesConfig(x)))return null;
 const hasIds=stages.some(x=>x.mode==='ids');
 return {schema:'foamlens/selection-recipe/1',key:fesRecipeKey(source,hasIds),hasIds,stages:JSON.parse(JSON.stringify(stages))};
}
function fesRecipeMatches(recipe,source){return !!recipe&&recipe.schema==='foamlens/selection-recipe/1'&&Array.isArray(recipe.stages)&&recipe.stages.length>0&&recipe.stages.length<=12&&recipe.stages.every(x=>!!fesConfig(x))&&recipe.hasIds===recipe.stages.some(x=>x.mode==='ids')&&recipe.key===fesRecipeKey(source,recipe.hasIds)}
function fesClipTriangle(tri,axis,offset,side){
 if(!Array.isArray(tri)||tri.length!==3||tri.some(p=>!Array.isArray(p)||p.length!==3||!p.every(Number.isFinite))||![0,1,2].includes(axis)||!Number.isFinite(offset)||!['above','below'].includes(side))return [];
 const inside=p=>side==='above'?p[axis]>=offset:p[axis]<=offset,poly=[];
 const same=(a,b)=>a.every((v,i)=>v===b[i]),push=p=>{if(!poly.length||!same(poly.at(-1),p))poly.push(p)};
 for(let i=0;i<3;i++){
  const a=tri[i],b=tri[(i+1)%3],ia=inside(a),ib=inside(b);
  if(ia)push(a.slice());
  if(ia!==ib){let q;if(a[axis]===offset)q=a.slice();else if(b[axis]===offset)q=b.slice();else{const scale=Math.max(Math.abs(a[axis]),Math.abs(b[axis]),Math.abs(offset),Number.MIN_VALUE),f=(offset/scale-a[axis]/scale)/(b[axis]/scale-a[axis]/scale);q=a.map((v,k)=>v*(1-f)+b[k]*f);q[axis]=offset}if(!q.every(Number.isFinite))return [];push(q)}
 }
 if(poly.length>1&&same(poly[0],poly.at(-1)))poly.pop();
 const out=[];for(let i=1;i+1<poly.length;i++){const a=poly[0],b=poly[i],c=poly[i+1],u=b.map((v,k)=>v-a[k]),v=c.map((v,k)=>v-a[k]),area=Math.hypot(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]);if(Number.isFinite(area)&&area>0)out.push([a,b,c])}
 return out
}
function fesClipSurface(input,raw){
 const fail=reason=>({valid:false,reason}),axis=['x','y','z'].indexOf(raw?.axis),offset=fesNum(raw?.offset),side=raw?.side,limit=fesNum(raw?.limit??100000);
 if(axis<0||!Number.isFinite(offset)||!['above','below'].includes(side)||!Number.isSafeInteger(limit)||limit<1||limit>100000)return fail('invalid-clip');
 const {mesh,source}=input||{},indices=mesh?.surfaceTriangles;
 if(!source||!indices?.length||indices.length%3!==0||!mesh?.points?.length)return fail('surface-unavailable');
 const triangles=[],coverage={inputTriangles:indices.length/3,invalid:0,discarded:0,retained:0,outputTriangles:0};
 for(let i=0;i<indices.length;i+=3){
  const tri=[0,1,2].map(j=>fesXYZ(mesh.points,indices[i+j]));if(tri.some(p=>!p)){coverage.invalid++;continue}
  const clipped=fesClipTriangle(tri,axis,offset,side);if(!clipped.length){coverage.discarded++;continue}
  if(triangles.length+clipped.length>limit)return fail('clip-limit-exceeded');
  coverage.retained++;for(const vertices of clipped)triangles.push({sourceTriangle:i/3,vertices});
 }
 coverage.outputTriangles=triangles.length;
 return {valid:true,schema:'foamlens/clipped-exterior/1',source:JSON.parse(JSON.stringify(source)),plane:{axis:raw.axis,offset_m:offset,side},coverage,triangles,limitations:'Exterior surface triangles clipped against a physical plane. Open uncapped shell, not a clipped volume mesh or integrated field. No scalar interpolation or solver modification.'}
}
function fesClipObj(result){
 const lines=['# FoamLens clipped exterior; coordinates in metres; uncapped shell','# Original exterior triangle index preceding each output face'];let n=1;
 for(const tri of result.triangles){lines.push('# sourceTriangle '+tri.sourceTriangle);for(const p of tri.vertices)lines.push('v '+p.join(' '));lines.push('f '+n+' '+(n+1)+' '+(n+2));n+=3}return lines.join('\n')+'\n'
}
function fesLayoutPaths(layout){
 if(!layout?.valid)return [];
 const records=layout.mode==='reconstructed'?[layout.record]:layout.parts.map(p=>p.record),paths=records.map(x=>String(x?.sourcePath||x?.file?.webkitRelativePath||x?.file?.name||''));
 return paths.length&&paths.every(Boolean)?paths:[]
}
function fesDimensions(raw){
 let a=Array.isArray(raw)?raw:typeof raw==='string'?raw.trim().replace(/^\[/,'').replace(/\]$/,'').trim().split(/\s+/):[];
 a=a.map(fesNum);return a.length===7&&a.every(Number.isFinite)?a:null
}
function fesComparable(a,b){
 const x=fesDimensions(a?.dimensions),y=fesDimensions(b?.dimensions);
 return !!(x&&y&&a.association==='volume'&&b.association==='volume'&&a.field===b.field&&a.component===b.component&&a.region===b.region&&a.time_s===b.time_s&&x.every((v,i)=>v===y[i]))
}
const fesSub=(a,b)=>a.map((v,i)=>v-b[i]),fesDot=(a,b)=>a.reduce((q,v,i)=>q+v*b[i],0),fesCross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
// Strict convex, closed, consistently oriented, planar-faced cells only.
// No absolute determinant threshold in metres: normalize by each cell's extent.
function fesBuildCells(mesh){
 const n=mesh?.cellCount,owners=mesh?.owners,neighbours=mesh?.neighbours,offsets=mesh?.faceOffsets,indices=mesh?.facePoints;
 if(!Number.isSafeInteger(n)||n<1||n>100000||!owners||!neighbours||!offsets||!indices||offsets.length!==owners.length+1||neighbours.length>owners.length||offsets[0]!==0||offsets.at(-1)!==indices.length)return null;
 const refs=Array.from({length:n},()=>[]);
 for(let i=0;i<owners.length;i++){const o=owners[i],q=i<neighbours.length?neighbours[i]:-1;if(!Number.isSafeInteger(o)||o<0||o>=n||(i<neighbours.length&&(!Number.isSafeInteger(q)||q<0||q>=n||q===o)))return null;refs[o].push([i,false]);if(q>=0)refs[q].push([i,true])}
 const cells=new Array(n).fill(null);
 for(let ci=0;ci<n;ci++){
  const faces=[],points=new Map(),edges=new Map();let bad=false;
  for(const [fi,reverse] of refs[ci]){
   const a=offsets[fi],b=offsets[fi+1];if(!Number.isSafeInteger(a)||!Number.isSafeInteger(b)||a<0||b-a<3||b>indices.length){bad=true;break}
   const ids=Array.from(indices.slice(a,b));if(reverse)ids.reverse();if(new Set(ids).size!==ids.length){bad=true;break}
   for(let j=0;j<ids.length;j++){const id=ids[j],next=ids[(j+1)%ids.length],p=fesXYZ(mesh.points,id);if(!p){bad=true;break}points.set(id,p);const k=Math.min(id,next)+':'+Math.max(id,next),e=edges.get(k)||[0,0];e[0]++;e[1]+=id<next?1:-1;edges.set(k,e)}
   faces.push(ids);if(bad)break
  }
  if(bad||faces.length<4||points.size<4||[...edges.values()].some(e=>e[0]!==2||e[1]!==0))continue;
  const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];for(const p of points.values())for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],p[k]);hi[k]=Math.max(hi[k],p[k])}
  const scale=Math.max(...hi.map((v,k)=>v-lo[k]));if(!Number.isFinite(scale)||scale<=0)continue;
  const local=new Map([...points].map(([id,p])=>[id,p.map((v,k)=>(v-lo[k])/scale)])),all=[...local.values()],planes=[];let v6=0;
  for(const ids of faces){
   const ps=ids.map(id=>local.get(id)),a=ps[0],normal=[0,0,0];
   for(let j=1;j+1<ps.length;j++){const q=fesCross(fesSub(ps[j],a),fesSub(ps[j+1],a));for(let k=0;k<3;k++)normal[k]+=q[k];v6+=fesDot(a,fesCross(ps[j],ps[j+1]))}
   const mag=Math.hypot(...normal);if(!(mag>1e-14)){bad=true;break}const unit=normal.map(v=>v/mag),d=fesDot(unit,a);
   // Each face is planar and convex with consistent winding; all cell vertices lie on its interior side.
   if(ps.some(p=>Math.abs(fesDot(unit,p)-d)>1e-9)||all.some(p=>fesDot(unit,p)-d>1e-9)||ps.some((p,j)=>fesDot(unit,fesCross(fesSub(ps[(j+1)%ps.length],p),fesSub(ps[(j+2)%ps.length],ps[(j+1)%ps.length])))< -1e-12)){bad=true;break}
   planes.push({unit,d})
  }
  const volume=v6/6*scale**3;if(bad||!(v6>1e-14)||!Number.isFinite(volume)||volume<=0)continue;
  cells[ci]={id:ci,lo,hi,scale,planes,volume}
 }
 return cells
}
function fesCellTree(cells){
 const build=xs=>{if(!xs.length)return null;const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];for(const c of xs)for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],c.lo[k]);hi[k]=Math.max(hi[k],c.hi[k])}
  if(xs.length<=8)return{lo,hi,cells:xs};const axis=hi.map((v,k)=>v-lo[k]).reduce((a,v,i,sp)=>v>sp[a]?i:a,0);xs.sort((a,b)=>(a.lo[axis]/2+a.hi[axis]/2)-(b.lo[axis]/2+b.hi[axis]/2));const mid=Math.floor(xs.length/2);return{lo,hi,left:build(xs.slice(0,mid)),right:build(xs.slice(mid))}};
 return build(cells.filter(Boolean))
}
function fesLocate(tree,p){
 if(!Array.isArray(p)||p.length!==3||!p.every(Number.isFinite))return [];
 const out=[],inside=b=>p.every((v,k)=>v>=b.lo[k]&&v<=b.hi[k]),walk=b=>{if(!b||!inside(b))return;if(b.cells){for(const c of b.cells){if(!inside(c))continue;const q=p.map((v,k)=>(v-c.lo[k])/c.scale);if(c.planes.every(a=>fesDot(a.unit,q)<=a.d+1e-10))out.push(c.id)}}else{walk(b.left);walk(b.right)}};walk(tree);return out
}
function fesIntegrate(input,ids=null){
 const fail=reason=>({valid:false,reason}),{mesh,values,source}=input||{},dims=fesDimensions(source?.dimensions);
 if(!dims||source.association!=='volume'||values?.length!==mesh?.cellCount)return fail('volume-field-with-dimensions-required');
 const cells=fesBuildCells(mesh);if(!cells)return fail('unsupported-topology-or-limit');
 const selection=ids===null?Array.from({length:cells.length},(_,i)=>i):ids;
 if(!Array.isArray(selection)||!selection.length||new Set(selection).size!==selection.length||selection.some(i=>!Number.isSafeInteger(i)||i<0||i>=cells.length))return fail('invalid-selection');
 let volume=0,sum=0,missingGeometry=0,missingValue=0;
 for(const i of selection){if(!cells[i]){missingGeometry++;continue}if(!Number.isFinite(values[i])){missingValue++;continue}volume+=cells[i].volume;sum+=values[i]*cells[i].volume}
 if(missingGeometry||missingValue||!(volume>0)||!Number.isFinite(sum)||!Number.isFinite(volume)||!Number.isFinite(sum/volume))return{valid:false,reason:'incomplete-or-invalid-integration',coverage:{selected:selection.length,missingGeometry,missingValue}};
 dims[1]+=3;return{valid:true,schema:'foamlens/volume-integral/1',source,coverage:{selected:selection.length,missingGeometry,missingValue},selection:ids===null?'all':ids.slice(),volume_m3:volume,integral:sum,weightedMean:sum/volume,integralDimensions:dims,method:'Cell-centred piecewise constant value times signed closed convex planar polyhedral volume; no partial integral or volume clipping.'}
}
function fesResample(a,b){
 const fail=reason=>({valid:false,reason});
 if(!fesComparable(a?.source,b?.source))return fail('incompatible-field-time-region-dimensions');
 if(a.values?.length!==a.mesh?.cellCount||b.values?.length!==b.mesh?.cellCount||!Number.isSafeInteger(a.mesh?.cellCount)||a.mesh.cellCount<1||a.mesh.cellCount>100000)return fail('field-count-or-limit');
 const ac=fesBuildCells(a.mesh),bc=fesBuildCells(b.mesh);if(!ac||!bc||bc.some(c=>!c))return fail('unverified-source-topology');
 const tree=fesCellTree(bc),rows=[],coverage={target:a.mesh.cellCount,matched:0,unmatched:0,ambiguous:0,invalid:0};let abs=0,sq=0,bias=0;
 for(let i=0;i<a.mesh.cellCount;i++){
  const p=fesXYZ(a.mesh.cellCenters,i),av=a.values[i];let bv=null,sourceCell=null,difference=null,status='invalid';
  if(p&&ac[i]&&fesLocate(fesCellTree([ac[i]]),p).length===1&&Number.isFinite(av)){
   const ids=fesLocate(tree,p);if(!ids.length)status='unmatched';else if(ids.length!==1)status='ambiguous';else if(Number.isFinite(b.values[ids[0]])&&Number.isFinite(b.values[ids[0]]-av)){sourceCell=ids[0];bv=b.values[sourceCell];difference=bv-av;status='matched';abs+=Math.abs(difference);sq+=difference*difference;bias+=difference}
  }
  coverage[status]++;rows.push({targetCell:i,point_m:p,a:Number.isFinite(av)?av:null,b:bv,sourceCell,difference,status})
 }
 const n=coverage.matched,metrics=n&&[abs,sq,bias].every(Number.isFinite)?{mae:abs/n,rmse:Math.sqrt(sq/n),bias:bias/n}:null;
 return {valid:true,schema:'foamlens/mesh-resample/1',target:a.source,source:b.source,coverage,metrics,rows,method:'B cell-constant values at A cell centres; strict convex planar cells; no extrapolation, no boundary tie-breaking, no conservative transfer. Metrics unweighted over matched points only.'}
}
/* FOAMLENS_ENTITY_SELECTION_CORE_END */
let fesResult=null,fesPage=0,fesSelected=null,fesStages=[],fesStageSource=null,fesClipResult=null;
const fesE=id=>document.getElementById(id);
function fesUi(en,es){try{return flUi(en,es)}catch{return en}}
function fesSource(){
 if(typeof fvState==='undefined'||typeof fvCase!=='function')return null;
 const f=fvState,c=fvCase(),group=typeof fvCurrentFieldGroup==='function'?fvCurrentFieldGroup():null;
 if(!c||!group||String(c.id)!==String(f.caseId)||String(group.name)!==String(f.fieldName)||String(fesE('fvRegion')?.value??'')!==String(f.region??'')||String(fesE('fvComponent')?.value??'')!==String(f.component??'')||!f.mesh||!f.fieldValues||!Number.isFinite(f.time))return null;
 const layout=fvResolveFieldMeshLayout(c,f.region,group,f.time),paths=fesLayoutPaths(layout);
 if(!paths.length||f._fvFrameHold)return null;
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
 fesClear();const current=fesSource(),cfg=fesReadConfig();if(fesStages.length&&!fesRecipeMatches(fesStageSource,current?.source)){fesE('fesStatus').textContent=fesUi('Pipeline source differs. Clear or restore a compatible recipe.','La fuente del pipeline cambió. Limpia o restaura una receta compatible.');return}
 const result=fesExtract(current,fesStages.length?{stages:fesStages,limit:cfg.limit}:cfg);
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
function fesPipelineRender(){
 const host=fesE('fesStages');if(!host)return;host.replaceChildren();
 for(let i=0;i<fesStages.length;i++){const cfg=fesConfig(fesStages[i]),row=document.createElement('div');row.style.cssText='display:flex;gap:5px;align-items:center;flex-wrap:wrap';
 const text=document.createElement('span');text.style.flex='1';text.textContent=(i+1)+'. '+cfg.mode+(cfg.threshold?' ['+cfg.threshold.join(', ')+']':'')+(cfg.bounds?' XYZ '+cfg.bounds.join(', '):'')+(cfg.mode==='plane'?' '+'XYZ'[cfg.axis]+' '+cfg.side+' '+cfg.offset+' m':'')+(cfg.ids?' · '+cfg.ids.length+' IDs':'');row.append(text);
 const rm=document.createElement('button');rm.className='btn tiny';rm.type='button';rm.textContent=fesUi('Remove','Quitar');rm.onclick=()=>{const x=fesSource(),matches=fesRecipeMatches(fesStageSource,x?.source);if(!matches){fesE('fesPipelineHint').textContent=fesUi('Source changed; clear stages first.','Cambió la fuente; limpia las etapas primero.');return}fesStages.splice(i,1);fesStageSource=fesStages.length?fesRecipe(fesStages,x.source):null;
 fesPipelineRender();fesClear()};row.append(rm);host.append(row)}
 fesE('fesPipelineHint').textContent=fesStages.length?fesUi('Apply evaluates saved stages with AND; editor changes are not included until added.','Aplicar evalúa etapas con AND; los cambios del editor no se incluyen hasta agregarlos.'):fesUi('No stages: apply the editor filter directly.','Sin etapas: aplica directamente el filtro del editor.');
}
function fesPipelineAdd(){
 const x=fesSource(),cfg=fesReadConfig();if(!x||!fesConfig(cfg)||fesStages.length>=12){fesE('fesPipelineHint').textContent=fesUi('Load a source and valid filter (maximum 12 stages).','Carga una fuente y filtro válido (máximo 12 etapas).');return}
 if(fesStages.length&&!fesRecipeMatches(fesStageSource,x.source)){fesE('fesPipelineHint').textContent=fesUi('Source changed; clear or load a compatible recipe.','Cambió la fuente; limpia o carga una receta compatible.');return}
 fesStages.push(cfg);fesStageSource=fesRecipe(fesStages,x.source);fesPipelineRender();fesClear()
}
function fesPipelineStore(load){
 const key='foamlens.selection.recipe.v1',x=fesSource();
 try{if(load){const r=JSON.parse(localStorage.getItem(key)||'null');if(!fesRecipeMatches(r,x?.source)||r.hasIds)throw Error('incompatible');fesStages=r.stages;fesStageSource=r;fesPipelineRender();fesClear();return}
 if(!fesStages.length||!fesRecipeMatches(fesStageSource,x?.source)||fesStageSource.hasIds)throw Error('incompatible');
 localStorage.setItem(key,JSON.stringify(fesStageSource));fesE('fesPipelineHint').textContent=fesUi('Recipe saved locally.','Receta guardada localmente.')
 }catch{fesE('fesPipelineHint').textContent=fesUi('No compatible recipe or storage unavailable. ID stages are session-only.','No hay receta compatible o almacenamiento disponible. Las etapas de IDs son solo de sesión.')}
}
function fesClipDraw(){
 const host=fesE('fesClipPlot');host.replaceChildren();const r=fesClipResult;if(!r?.triangles.length)return;
 const canvas=document.createElement('canvas');canvas.width=480;canvas.height=300;canvas.style.cssText='display:block;width:100%;height:auto;background:#101827;border-radius:8px';host.append(canvas);const ctx=canvas.getContext('2d');if(!ctx)return;
 const yaw=Number(fesE('fesClipYaw').value)*Math.PI/180,pitch=Number(fesE('fesClipPitch').value)*Math.PI/180,rot=p=>{const x=p[0]*Math.cos(yaw)-p[1]*Math.sin(yaw),y=p[0]*Math.sin(yaw)+p[1]*Math.cos(yaw);return[x,y*Math.sin(pitch)+p[2]*Math.cos(pitch),y*Math.cos(pitch)-p[2]*Math.sin(pitch)]};
 let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;for(const t of r.triangles)for(const p of t.vertices){const [x,y]=rot(p);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y)}
 const dx=maxX-minX,dy=maxY-minY,k=Math.min(dx?440/dx:Infinity,dy?260/dy:Infinity);if(!Number.isFinite(k)||k<=0)return;
 const proj=p=>[240+(p[0]-(minX+dx/2))*k,150-(p[1]-(minY+dy/2))*k],preview=fesPreview(r.triangles,4000).map(t=>t.vertices.map(rot)).sort((a,b)=>a.reduce((s,p)=>s+p[2],0)-b.reduce((s,p)=>s+p[2],0));
 ctx.strokeStyle='#3bafc4';ctx.fillStyle='rgba(49,131,168,.14)';ctx.lineWidth=.6;for(const tri of preview){ctx.beginPath();tri.forEach((p,i)=>{const [x,y]=proj(p);i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.closePath();ctx.fill();ctx.stroke()}
 const note=document.createElement('div');note.className='smallnote';note.textContent=preview.length+'/'+r.triangles.length+' '+fesUi('triangles in preview; full geometry in export.','triángulos en vista previa; geometría completa al exportar.');host.append(note)
}
function fesClipClear(){fesClipResult=null;fesE('fesClipPlot').replaceChildren();fesE('fesClipStatus').textContent='';fesE('fesClipObj').disabled=true;fesE('fesClipJson').disabled=true}
function fesClipRun(){fesClipClear();const r=fesClipSurface(fesSource(),{axis:fesE('fesClipAxis').value,offset:fesE('fesClipOffset').value,side:fesE('fesClipSide').value,limit:fesE('fesLimit').value});if(!r.valid){fesE('fesClipStatus').textContent=r.reason;return}fesClipResult=r;const c=r.coverage;fesE('fesClipStatus').textContent=r.source.caseName+' / '+r.source.region+' · t='+r.source.time_s+' s · '+c.outputTriangles+' '+fesUi('triangles; invalid source triangles','triángulos; triángulos de origen inválidos')+': '+c.invalid;fesE('fesClipObj').disabled=!c.outputTriangles;fesE('fesClipJson').disabled=false;fesClipDraw()}
function fesClipExport(kind){if(!fesClipResult)return;const data=kind==='obj'?fesClipObj(fesClipResult):JSON.stringify(fesClipResult,null,2),name='FoamLens_clipped_exterior.'+kind,mime=kind==='obj'?'text/plain':'application/json';if(typeof downloadText==='function'){downloadText(name,data,mime);return}const url=URL.createObjectURL(new Blob([data],{type:mime})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function fesMountExtra(box){
 const div=document.createElement('div');div.innerHTML='<details class="analysisExt"><summary><strong data-fl-en="Filter pipeline" data-fl-es="Pipeline de filtros">Filter pipeline</strong></summary><div id="fesStages"></div><div class="extActions"><button class="btn soft" type="button" id="fesAddStage" data-fl-en="Add editor filter" data-fl-es="Agregar filtro del editor">Add editor filter</button><button class="btn soft" type="button" id="fesResetStages" data-fl-en="Clear stages" data-fl-es="Limpiar etapas">Clear stages</button><button class="btn soft" type="button" id="fesSaveRecipe" data-fl-en="Save recipe" data-fl-es="Guardar receta">Save recipe</button><button class="btn soft" type="button" id="fesLoadRecipe" data-fl-en="Load recipe" data-fl-es="Cargar receta">Load recipe</button></div><p id="fesPipelineHint" class="smallnote" aria-live="polite"></p></details>'+
 '<details class="analysisExt"><summary><strong data-fl-en="Clip exterior surface" data-fl-es="Recortar superficie exterior">Clip exterior surface</strong></summary><p class="smallnote" data-fl-en="Real triangle-plane clipping of the loaded exterior only. Open shell; no volume or field interpolation." data-fl-es="Recorte real triángulo-plano del exterior cargado. Superficie abierta; sin volumen ni interpolación de campos.">Real triangle-plane clipping of the loaded exterior only. Open shell; no volume or field interpolation.</p><div class="row2"><div class="field"><label data-fl-en="Axis" data-fl-es="Eje">Axis</label><select id="fesClipAxis"><option>x</option><option>y</option><option>z</option></select></div><div class="field"><label data-fl-en="Side" data-fl-es="Lado">Side</label><select id="fesClipSide"><option value="above">≥</option><option value="below">≤</option></select></div></div><div class="field"><label data-fl-en="Plane coordinate [m]" data-fl-es="Coordenada del plano [m]">Plane coordinate [m]</label><input type="number" step="any" id="fesClipOffset"></div><div class="extActions"><button class="btn soft" id="fesClipMid" type="button" data-fl-en="Use midpoint" data-fl-es="Usar punto medio">Use midpoint</button><button class="btn primary" id="fesClipRun" type="button">Clip</button><button class="btn soft" id="fesClipObj" type="button">OBJ</button><button class="btn soft" id="fesClipJson" type="button">JSON</button></div><p class="smallnote" id="fesClipStatus"></p><div class="field"><label>Yaw</label><input id="fesClipYaw" type="range" min="-180" max="180" value="35"></div><div class="field"><label>Pitch</label><input id="fesClipPitch" type="range" min="-90" max="90" value="30"></div><div id="fesClipPlot"></div></details>';
 box.querySelector('.extSectionBody').append(div);fesE('fesAddStage').onclick=fesPipelineAdd;fesE('fesResetStages').onclick=()=>{fesStages=[];fesStageSource=null;fesPipelineRender();fesClear()};fesE('fesSaveRecipe').onclick=()=>fesPipelineStore(false);fesE('fesLoadRecipe').onclick=()=>fesPipelineStore(true);
 for(const id of ['fesClipAxis','fesClipSide','fesClipOffset'])fesE(id).addEventListener('input',fesClipClear);
 fesE('fesClipMid').onclick=()=>{const mesh=fesSource()?.mesh,i=['x','y','z'].indexOf(fesE('fesClipAxis').value),a=mesh?.boundsMin?.[i],b=mesh?.boundsMax?.[i];fesClipClear();if(Number.isFinite(a)&&Number.isFinite(b))fesE('fesClipOffset').value=String(a/2+b/2)};
 fesE('fesClipRun').onclick=fesClipRun;fesE('fesClipObj').onclick=()=>fesClipExport('obj');fesE('fesClipJson').onclick=()=>fesClipExport('json');fesE('fesClipYaw').oninput=fesClipDraw;fesE('fesClipPitch').oninput=fesClipDraw;fesPipelineRender();fesClipClear()
}
let fesPhysicalResult=null,fesPhysicalSeq=0;
function fesPhysicalClear(){fesPhysicalSeq++;fesPhysicalResult=null;fesE('fesPhysicalStatus').textContent='';fesE('fesPhysicalExport').disabled=true}
function fesPhysicalShow(r){if(!r.valid){fesE('fesPhysicalStatus').textContent=r.reason+(r.coverage?' · '+JSON.stringify(r.coverage):'');return}fesPhysicalResult=r;fesE('fesPhysicalExport').disabled=false;const f=v=>Number.isFinite(v)?v.toPrecision(7):'—';fesE('fesPhysicalStatus').textContent=r.schema.includes('integral')?fesUi('Volume','Volumen')+' '+f(r.volume_m3)+' m³ · '+fesUi('Integral','Integral')+' '+f(r.integral)+' ['+r.integralDimensions.join(' ')+'] · '+fesUi('Weighted mean','Media ponderada')+' '+f(r.weightedMean)+' '+r.source.unit:fesUi('Matched / target','Coincidentes / destino')+' '+r.coverage.matched+'/'+r.coverage.target+' · '+fesUi('Outside / ambiguous / invalid','Fuera / ambiguos / inválidos')+' '+r.coverage.unmatched+'/'+r.coverage.ambiguous+'/'+r.coverage.invalid+' · MAE '+f(r.metrics?.mae)+' · RMSE '+f(r.metrics?.rmse)+' · Bias '+f(r.metrics?.bias)+' '+r.target.unit}
function fesPhysicalCases(){const sel=fesE('fesPhysicalCase'),old=sel.value;sel.replaceChildren();for(const c of (typeof cases!=='undefined'?cases:[])){if(!c||!c.meshInventory?.length)continue;const o=document.createElement('option');o.value=String(c.id);o.textContent=c.name||String(c.id);sel.append(o)}if([...sel.options].some(o=>o.value===old))sel.value=old}
function fesPhysicalIntegrate(){
 fesPhysicalClear();const a=fesSource();if(!a){fesPhysicalShow({valid:false,reason:'source-not-ready'});return}
 let ids=null;if(fesE('fesPhysicalScope').value==='selection'){if(!fesResult||JSON.stringify(fesResult.source)!==JSON.stringify({...a.source,dimensions:Array.isArray(a.source.dimensions)?a.source.dimensions:typeof a.source.dimensions==='string'?a.source.dimensions:null})){fesPhysicalShow({valid:false,reason:'selection-source-mismatch'});return}ids=fesResult.rows.map(r=>r.id)}
 fesPhysicalShow(fesIntegrate(a,ids))
}
async function fesPhysicalResample(){
 fesPhysicalClear();const seq=fesPhysicalSeq,a=fesSource(),id=fesE('fesPhysicalCase').value,c=(typeof cases!=='undefined'?cases:[]).find(c=>String(c.id)===id);
 if(!a||!c||a.source.association!=='volume'){fesPhysicalShow({valid:false,reason:'volume-source-required'});return}
 const groups=fvFieldGroups(c,a.source.region,null,'volume').filter(g=>g.name===a.source.field&&g.times.some(v=>fesNum(v)===a.source.time_s)&&fvFieldComponents(g).some(k=>k.v===a.source.component));
 if(groups.length!==1){fesPhysicalShow({valid:false,reason:'exact-comparable-field-time-unavailable'});return}
 fesE('fesPhysicalStatus').textContent=fesUi('Loading source case…','Cargando caso fuente…');
 try{const g=groups[0],time=a.source.time_s,data=await fvLoadFrameData(c,g,a.source.region,time,a.source.component,{includeBoundary:false});if(seq!==fesPhysicalSeq)return;
 const current=fesSource();if(!current||current.mesh!==a.mesh||current.values!==a.values||JSON.stringify(current.source)!==JSON.stringify(a.source)){fesPhysicalShow({valid:false,reason:'target-changed-during-load'});return}
 const dimensions=data.parsed?.dimensions,paths=fesLayoutPaths(data.layout);if(!paths.length){fesPhysicalShow({valid:false,reason:'source-path-unavailable'});return}
 const b={mesh:data.mesh,values:data.fieldValues,source:{caseId:String(c.id),caseName:String(c.name||c.id),region:a.source.region,field:g.name,association:data.storage,component:a.source.component,time_s:time,dimensions,unit:dimensions&&typeof pmUnitFromDimensions==='function'?pmUnitFromDimensions(dimensions):'',paths,meshId:data.meshInfo.key,decomposed:!!data.mesh.decomposed}};fesPhysicalShow(fesResample(a,b))
 }catch(e){if(seq===fesPhysicalSeq)fesPhysicalShow({valid:false,reason:String(e?.message||e)})}
}
function fesPhysicalExport(){
 const r=fesPhysicalResult;if(!r)return;const data=JSON.stringify(r,null,2),name=r.schema.includes('integral')?'FoamLens_volume_integral.json':'FoamLens_mesh_resample.json';
 if(typeof downloadText==='function'){downloadText(name,data,'application/json');return}const url=URL.createObjectURL(new Blob([data],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
}
function fesMountPhysical(box){
 const el=document.createElement('details');el.className='analysisExt';el.innerHTML='<summary><strong data-fl-en="Volume integration / mesh resample" data-fl-es="Integración volumétrica / remuestreo">Volume integration / mesh resample</strong></summary><p class="smallnote" data-fl-en="Cell-centred fields, verified closed convex planar cells only (up to 100000). Resample B onto A at identical physical time and region; no extrapolation." data-fl-es="Campos centrados en celdas, solo celdas convexas cerradas y planas verificadas (hasta 100000). Remuestreo B sobre A a igual tiempo físico y región; sin extrapolación.">Cell-centred fields, verified closed convex planar cells only (up to 100000). Resample B onto A at identical physical time and region; no extrapolation.</p><div class="field"><label data-fl-en="Integration scope" data-fl-es="Alcance de integración">Integration scope</label><select id="fesPhysicalScope"><option value="all" data-fl-en="Entire Field A" data-fl-es="Todo Field A">Entire Field A</option><option value="selection" data-fl-en="Current extracted entities" data-fl-es="Entidades extraídas actuales">Current extracted entities</option></select></div><button class="btn primary" type="button" id="fesPhysicalIntegral" data-fl-en="Integrate variables" data-fl-es="Integrar variables">Integrate variables</button><div class="field"><label data-fl-en="Source case B" data-fl-es="Caso fuente B">Source case B</label><select id="fesPhysicalCase"></select></div><div class="extActions"><button class="btn soft" type="button" id="fesPhysicalRefresh" data-fl-en="Refresh cases" data-fl-es="Actualizar casos">Refresh cases</button><button class="btn primary" type="button" id="fesPhysicalResample" data-fl-en="Resample B → A" data-fl-es="Remuestrear B → A">Resample B → A</button><button class="btn soft" type="button" id="fesPhysicalExport">JSON</button></div><p class="smallnote" id="fesPhysicalStatus" aria-live="polite"></p>';
 box.querySelector('.extSectionBody').append(el);el.addEventListener('toggle',()=>{if(el.open)fesPhysicalCases()});fesE('fesPhysicalRefresh').onclick=fesPhysicalCases;fesE('fesPhysicalCase').onchange=fesPhysicalClear;fesE('fesPhysicalScope').onchange=fesPhysicalClear;fesE('fesPhysicalIntegral').onclick=fesPhysicalIntegrate;fesE('fesPhysicalResample').onclick=fesPhysicalResample;fesE('fesPhysicalExport').onclick=fesPhysicalExport;fesPhysicalClear()
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
 fesMountExtra(box);fesMountPhysical(box);try{flApplyBilingualText(box)}catch{}fesControls();fesClear();return true
}
function fesInstall(){if(fesMount())return;const watch=new MutationObserver(()=>{if(fesMount())watch.disconnect()});watch.observe(document.body,{childList:true,subtree:true})}
fesInstall();
window.FoamLensEntitySelection={fesExtract,fesConfig,fesCsv,fesPreview};
