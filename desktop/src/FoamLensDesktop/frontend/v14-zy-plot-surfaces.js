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
function fesPreview(rows,limit=4000){if(!Number.isSafeInteger(limit)||limit<1)return [];if(rows.length<=limit)return rows.slice();if(limit===1)return [rows[Math.floor((rows.length-1)/2)]];return Array.from({length:limit},(_,i)=>rows[Math.floor(i*(rows.length-1)/(limit-1))])}
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
function fesPhysicalBudget(kind,raw){const n=fesNum(raw??250000),max=kind==='integral'?1000000:kind==='resample'?500000:0;return Number.isSafeInteger(n)&&n>=1&&n<=max?n:null}
function fesBuildCells(mesh,{limit=250000,retain=true,selection=null,onCell=null}={}){
 const n=mesh?.cellCount,owners=mesh?.owners,neighbours=mesh?.neighbours,offsets=mesh?.faceOffsets,indices=mesh?.facePoints;
 if(!fesPhysicalBudget('integral',limit)||!Number.isSafeInteger(n)||n<1||n>limit||!owners||!neighbours||!offsets||!indices||owners.length+neighbours.length>20000000||indices.length>80000000||offsets.length!==owners.length+1||neighbours.length>owners.length||offsets[0]!==0||offsets.at(-1)!==indices.length)return null;
 // Compact CSR adjacency: one signed face reference per incident cell, rather than millions of nested arrays.
 const starts=new Uint32Array(n+1);
 for(let i=0;i<owners.length;i++){const o=owners[i],q=i<neighbours.length?neighbours[i]:-1;if(!Number.isSafeInteger(o)||o<0||o>=n||(i<neighbours.length&&(!Number.isSafeInteger(q)||q<0||q>=n||q===o)))return null;starts[o+1]++;if(q>=0)starts[q+1]++}
 for(let i=1;i<=n;i++)starts[i]+=starts[i-1];
 const cursor=starts.slice(0,n),refs=new Int32Array(starts[n]);
 for(let i=0;i<owners.length;i++){refs[cursor[owners[i]]++]=i+1;if(i<neighbours.length)refs[cursor[neighbours[i]]++]=-(i+1)}
 const cells=retain?new Array(n).fill(null):null;
 for(let ci=0;ci<n;ci++){
  if(selection&&!selection.has(ci))continue;
  const faces=[],points=new Map(),edges=new Map();let bad=false;
  for(let ri=starts[ci];ri<starts[ci+1];ri++){const code=refs[ri],fi=Math.abs(code)-1,reverse=code<0;
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
  const cell={id:ci,lo,hi,scale,planes,volume};if(retain)cells[ci]=cell;if(onCell)onCell(cell)
 }
 return retain?cells:true
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
function fesIntegrate(input,ids=null,rawLimit=250000){
 const fail=reason=>({valid:false,reason}),{mesh,values,source}=input||{},dims=fesDimensions(source?.dimensions),limit=fesPhysicalBudget('integral',rawLimit),n=mesh?.cellCount;
 if(!dims||source.association!=='volume'||values?.length!==n||!Number.isSafeInteger(n)||n<1)return fail('volume-field-with-dimensions-required');
 if(!limit||n>limit)return fail('integration-cell-budget-exceeded');
 const selection=ids===null?null:new Set(Array.isArray(ids)?ids:[]);
 if(ids!==null&&(!Array.isArray(ids)||!ids.length||selection.size!==ids.length||ids.some(i=>!Number.isSafeInteger(i)||i<0||i>=n)))return fail('invalid-selection');
 const selected=selection?selection.size:n;let volume=0,sum=0,validGeometry=0,missingValue=0,cv=0,cs=0;
 const built=fesBuildCells(mesh,{limit,retain:false,selection,onCell:c=>{validGeometry++;const v=values[c.id];if(!Number.isFinite(v)){missingValue++;return}const y=c.volume-cv,t=volume+y;cv=(t-volume)-y;volume=t;const z=v*c.volume-cs,u=sum+z;cs=(u-sum)-z;sum=u}});
 if(!built)return fail('unsupported-topology-or-budget');
 const missingGeometry=selected-validGeometry;
 if(missingGeometry||missingValue||!(volume>0)||!Number.isFinite(sum)||!Number.isFinite(volume)||!Number.isFinite(sum/volume))return{valid:false,reason:'incomplete-or-invalid-integration',coverage:{selected,missingGeometry,missingValue}};
 dims[1]+=3;return{valid:true,schema:'foamlens/volume-integral/1',source,coverage:{selected,missingGeometry,missingValue},selection:ids===null?'all':ids.slice(),cellBudget:limit,volume_m3:volume,integral:sum,weightedMean:sum/volume,integralDimensions:dims,method:'Cell-centred piecewise constant value times signed closed convex planar polyhedral volume; compact adjacency and compensated streaming sum; no partial integral or volume clipping.'}
}
function fesResample(a,b,rawLimit=250000){
 const fail=reason=>({valid:false,reason}),limit=fesPhysicalBudget('resample',rawLimit);
 if(!fesComparable(a?.source,b?.source))return fail('incompatible-field-time-region-dimensions');
 const na=a.mesh?.cellCount,nb=b.mesh?.cellCount;
 if(a.values?.length!==na||b.values?.length!==nb||![na,nb].every(n=>Number.isSafeInteger(n)&&n>0))return fail('field-count-mismatch');
 if(!limit||na>limit||nb>limit)return fail('resample-cell-budget-exceeded');
 const bc=fesBuildCells(b.mesh,{limit});if(!bc||bc.some(c=>!c))return fail('unverified-source-topology');
 const tree=fesCellTree(bc),rows=new Array(na),coverage={target:na,matched:0,unmatched:0,ambiguous:0,invalid:0};let abs=0,sq=0,bias=0;
 const rowFor=(i,cell)=>{const p=fesXYZ(a.mesh.cellCenters,i),av=a.values[i];let bv=null,sourceCell=null,difference=null,status='invalid';
  if(p&&cell&&fesLocate({lo:cell.lo,hi:cell.hi,cells:[cell]},p).length===1&&Number.isFinite(av)){
   const ids=fesLocate(tree,p);if(!ids.length)status='unmatched';else if(ids.length!==1)status='ambiguous';else if(Number.isFinite(b.values[ids[0]])&&Number.isFinite(b.values[ids[0]]-av)){sourceCell=ids[0];bv=b.values[sourceCell];difference=bv-av;status='matched';abs+=Math.abs(difference);sq+=difference*difference;bias+=difference}
  }
  coverage[status]++;rows[i]={targetCell:i,point_m:p,a:Number.isFinite(av)?av:null,b:bv,sourceCell,difference,status}
 };
 // Only source B geometry is retained; A is validated and sampled cell by cell.
 if(!fesBuildCells(a.mesh,{limit,retain:false,onCell:c=>rowFor(c.id,c)}))return fail('unverified-target-topology');
 for(let i=0;i<na;i++)if(!rows[i])rowFor(i,null);
 const n=coverage.matched,metrics=n&&[abs,sq,bias].every(Number.isFinite)?{mae:abs/n,rmse:Math.sqrt(sq/n),bias:bias/n}:null;
 return {valid:true,schema:'foamlens/mesh-resample/1',target:a.source,source:b.source,coverage,metrics,rows,cellBudgetPerMesh:limit,method:'B cell-constant values at A cell centres; strict convex planar cells; no extrapolation, no boundary tie-breaking, no conservative transfer. Metrics unweighted over matched points only.'}
}
function fesSameMesh(a,b){return !!(a&&b&&a.caseId===b.caseId&&a.region===b.region&&a.association===b.association&&typeof a.meshId==='string'&&a.meshId.length&&a.meshId===b.meshId)}
function fesCalcDimensions(a,b,op){
 const x=fesDimensions(a),y=fesDimensions(b);if(!x||!y)return null;
 if(op==='add'||op==='subtract')return x.every((v,i)=>v===y[i])?x:null;
 if(op==='multiply'||op==='divide'){const z=x.map((v,i)=>v+(op==='multiply'?y[i]:-y[i]));return z.every(Number.isFinite)?z:null}return null
}
function fesCalcValue(a,b,op){
 if(!Number.isFinite(a)||!Number.isFinite(b)||(op==='divide'&&b===0))return NaN;
 const v=op==='add'?a+b:op==='subtract'?a-b:op==='multiply'?a*b:op==='divide'?a/b:NaN;return Number.isFinite(v)?v:NaN
}
function fesDerivedInput(a){return !!(a?.source?.association==='volume'&&fesDimensions(a.source.dimensions)&&Number.isSafeInteger(a.mesh?.cellCount)&&a.mesh.cellCount>0&&a.values?.length===a.mesh.cellCount)}
function* fesCalculate(a,b,op){
 if(!fesDerivedInput(a)||!fesDerivedInput(b)||!fesSameMesh(a.source,b.source)||a.source.time_s!==b.source.time_s||a.values.length!==b.values.length)return {valid:false,reason:'calculator-source-mismatch'};
 const dimensions=fesCalcDimensions(a.source.dimensions,b.source.dimensions,op);if(!dimensions)return {valid:false,reason:'calculator-dimension-mismatch'};
 const n=a.values.length,values=new Float64Array(n);let valid=0;
 for(let i=0;i<n;i++){const v=fesCalcValue(a.values[i],b.values[i],op);values[i]=v;if(Number.isFinite(v))valid++;if((i+1)%16384===0)yield {done:i+1,total:n}}
 return {valid:true,schema:'foamlens/derived-field/1',kind:'calculator',sources:[a.source,b.source],dimensions,columns:[{name:op,values}],coverage:{total:n,valid,missing:n-valid},method:'Cellwise original components, same mesh and exact physical time. Invalid operands and zero divisors remain missing.'}
}
function fesAdjacency(mesh){
 const n=mesh.cellCount,o=mesh.owners,q=mesh.neighbours;if(!o||!q||q.length>o.length||q.length>0x7fffffff)return null;
 const offsets=new Uint32Array(n+1);
 for(let f=0;f<q.length;f++){const a=o[f],b=q[f];if(!Number.isSafeInteger(a)||!Number.isSafeInteger(b)||a<0||b<0||a>=n||b>=n||a===b)return null;offsets[a+1]++;offsets[b+1]++}
 for(let i=1;i<=n;i++)offsets[i]+=offsets[i-1];
 const cursor=offsets.slice(0,n),ids=new Uint32Array(offsets[n]);for(let f=0;f<q.length;f++){ids[cursor[o[f]]++]=q[f];ids[cursor[q[f]]++]=o[f]}return {offsets,ids}
}
function fesSolve(matrix,rhs){
 const n=rhs.length,a=matrix.map((row,i)=>[...row,rhs[i]]),scale=Math.max(...matrix.flat().map(Math.abs));if(!(scale>0))return null;
 for(let j=0;j<n;j++){let p=j;for(let i=j+1;i<n;i++)if(Math.abs(a[i][j])>Math.abs(a[p][j]))p=i;if(!(Math.abs(a[p][j])>scale*1e-10))return null;[a[j],a[p]]=[a[p],a[j]];const d=a[j][j];for(let k=j;k<=n;k++)a[j][k]/=d;for(let i=0;i<n;i++)if(i!==j){const z=a[i][j];for(let k=j;k<=n;k++)a[i][k]-=z*a[j][k]}}
 const v=a.map(row=>row[n]);return v.every(Number.isFinite)?v:null
}
function* fesGradient(a,plane='xyz'){
 const axes={xyz:[0,1,2],xy:[0,1],xz:[0,2],yz:[1,2]}[plane];
 if(!axes||!fesDerivedInput(a)||a.mesh.decomposed||a.source.decomposed)return{valid:false,reason:'gradient-reconstructed-volume-required'};
 const n=a.values.length,adj=fesAdjacency(a.mesh);if(!adj)return{valid:false,reason:'invalid-neighbour-topology'};
 const cols=axes.map(k=>({name:'d'+a.source.field+'/d'+'xyz'[k],values:new Float64Array(n).fill(NaN)})),mag=new Float64Array(n).fill(NaN);let valid=0;
 for(let i=0;i<n;i++){
  const p=fesXYZ(a.mesh.cellCenters,i),v=a.values[i],d=axes.length,M=Array.from({length:d},()=>Array(d).fill(0)),rhs=Array(d).fill(0);
  if(p&&Number.isFinite(v)){for(let k=adj.offsets[i];k<adj.offsets[i+1];k++){const j=adj.ids[k],q=fesXYZ(a.mesh.cellCenters,j),w=a.values[j];if(!q||!Number.isFinite(w))continue;
    const delta=axes.map(k=>q[k]-p[k]),length=Math.hypot(...delta);if(!(length>0)||!Number.isFinite(length))continue;
    const u=delta.map(x=>x/length),dv=(w-v)/length;if(!Number.isFinite(dv))continue;for(let m=0;m<d;m++){rhs[m]+=u[m]*dv;for(let l=0;l<d;l++)M[m][l]+=u[m]*u[l]}
   }const g=fesSolve(M,rhs);if(g&&Number.isFinite(Math.hypot(...g))){g.forEach((x,j)=>cols[j].values[i]=x);mag[i]=Math.hypot(...g);valid++}}
  if((i+1)%4096===0)yield {done:i+1,total:n}
 }
 const dimensions=fesDimensions(a.source.dimensions);dimensions[1]-=1;cols.push({name:'gradient_magnitude_'+plane,values:mag});
 return{valid:true,schema:'foamlens/derived-field/1',kind:'gradient',sources:[a.source],dimensions,columns:cols,coverage:{total:n,valid,missing:n-valid},method:'Inverse-distance weighted local least squares using internal face neighbours; selected axes '+plane+' only; no invented boundary values or rank-deficient gradients.'}
}
function fesTemporalStart(a){
 if(!fesDerivedInput(a)||!Number.isFinite(a.source.time_s)||!a.source.meshId)return null;
 const n=a.values.length,mean=new Float64Array(n),m2=new Float64Array(n),min=new Float64Array(n),max=new Float64Array(n),ok=new Uint8Array(n);
 for(let i=0;i<n;i++){const v=a.values[i];ok[i]=Number.isFinite(v)?1:0;min[i]=max[i]=v}
 return {first:a.source,previous:a.source,prev:a.values,mean,m2,min,max,ok,duration:0,frames:[a.source]}
}
function* fesTemporalStep(state,a){
 if(!state||!fesDerivedInput(a)||!fesSameMesh(state.first,a.source)||state.first.field!==a.source.field||state.first.component!==a.source.component||!fesCalcDimensions(state.first.dimensions,a.source.dimensions,'add')||a.values.length!==state.prev.length)return false;
 const dt=a.source.time_s-state.previous.time_s,total=state.duration+dt;if(!Number.isFinite(dt)||!(dt>0)||!Number.isFinite(total))return false;
 const n=a.values.length;
 for(let i=0;i<n;i++){const x=state.prev[i],y=a.values[i];if(!state.ok[i]||!Number.isFinite(x)||!Number.isFinite(y)){state.ok[i]=0;if((i+1)%16384===0)yield {done:i+1,total:n};continue}
  const mu=x/2+y/2,delta=y-x,w=dt/total,d=mu-state.mean[i],mean=state.duration?state.mean[i]+d*w:mu;
  const variance=delta*delta/12,v=(state.duration?state.m2[i]*(state.duration/total)+d*d*w*(state.duration/total):0)+variance*w;
  if(!Number.isFinite(mean)||!Number.isFinite(v)||v<0){state.ok[i]=0;if((i+1)%16384===0)yield {done:i+1,total:n};continue}
  state.mean[i]=mean;state.m2[i]=v;state.min[i]=Math.min(state.min[i],y);state.max[i]=Math.max(state.max[i],y);
  if((i+1)%16384===0)yield {done:i+1,total:n}
 }
 state.duration=total;state.previous=a.source;state.prev=a.values;state.frames.push(a.source);return true
}
function* fesTemporalFinish(state){
 if(!state||!(state.duration>0)||state.frames.length<2)return{valid:false,reason:'two-or-more-native-times-required'};
 let valid=0;const n=state.mean.length;for(let i=0;i<n;i++){if(!state.ok[i])state.mean[i]=state.m2[i]=state.min[i]=state.max[i]=NaN;else{state.m2[i]=Math.sqrt(state.m2[i]);valid++}if((i+1)%16384===0)yield{done:i+1,total:n}}
 return{valid:true,schema:'foamlens/derived-field/1',kind:'temporal-statistics',sources:state.frames,dimensions:fesDimensions(state.first.dimensions),columns:[{name:'time_weighted_mean',values:state.mean},{name:'time_weighted_std',values:state.m2},{name:'min_native',values:state.min},{name:'max_native',values:state.max}],coverage:{total:n,valid,missing:n-valid},duration_s:state.duration,method:'Time-weighted moments under piecewise-linear interpolation between consecutive native times, no resampling or omitted intervals; exact static mesh identity, complete per-cell history required.'}
}
function fesDimIs(raw,expected){const x=fesDimensions(raw);return !!x&&x.every((v,i)=>v===expected[i])}
function* fesHeatFlux(a,k,plane){
 if(!fesDerivedInput(a)||!fesDimIs(a.source.dimensions,[0,0,0,1,0,0,0]))return{valid:false,reason:'temperature-field-required'};
 const constant=typeof k==='number';
 if(constant?!(Number.isFinite(k)&&k>0):!fesDerivedInput(k)||!fesSameMesh(a.source,k.source)||a.source.time_s!==k.source.time_s||!fesDimIs(k.source.dimensions,[1,1,-3,-1,0,0,0])||k.source.component!=='value')return{valid:false,reason:'conductivity-mismatch'};
 const g=yield* fesGradient(a,plane);if(!g.valid)return g;
 const n=a.values.length,axes={xyz:['x','y','z'],xy:['x','y'],xz:['x','z'],yz:['y','z']}[plane],cols=g.columns;let valid=0;
 for(let i=0;i<n;i++){const conductivity=constant?k:k.values[i],v=cols.slice(0,-1).map(c=>-conductivity*c.values[i]),mag=Math.hypot(...v);
  const ok=Number.isFinite(conductivity)&&conductivity>0&&v.every(Number.isFinite)&&Number.isFinite(mag);
  for(let j=0;j<v.length;j++)cols[j].values[i]=ok?v[j]:NaN;cols.at(-1).values[i]=ok?mag:NaN;if(ok)valid++;
  if((i+1)%16384===0)yield{done:i+1,total:n}
 }
 cols.forEach((c,i)=>c.name=i<axes.length?'q_'+axes[i]:'q_magnitude_'+plane);
 return{valid:true,schema:'foamlens/derived-field/1',kind:'fourier-heat-flux',sources:constant?[a.source]:[a.source,k.source],dimensions:[1,0,-3,0,0,0,0],columns:cols,coverage:{total:n,valid,missing:n-valid},conductivity:constant?{kind:'user-constant',value_W_mK:k}:k.source.material?{kind:'material-table',material:k.source.material}:{kind:'original-field'},method:'q = -k grad(T); selected gradient axes '+plane+'; local reconstructed conductive flux, not boundary power or total energy balance.'}
}
function fesFaceArea(mesh,fi){
 const a=mesh.faceOffsets?.[fi],b=mesh.faceOffsets?.[fi+1];if(!Number.isSafeInteger(a)||!Number.isSafeInteger(b)||a<0||b-a<3||b>mesh.facePoints?.length)return NaN;
 const ids=Array.from(mesh.facePoints.slice(a,b));if(new Set(ids).size!==ids.length)return NaN;
 const points=ids.map(i=>fesXYZ(mesh.points,i));if(points.some(p=>!p))return NaN;
 const origin=points[0],d=points.map(p=>fesSub(p,origin)),scale=Math.max(...d.map(p=>Math.hypot(...p)));if(!(scale>0)||!Number.isFinite(scale))return NaN;
 const q=d.map(p=>p.map(v=>v/scale)),sum=[0,0,0];
 for(let j=1;j<q.length-1;j++){const v=fesCross(q[j],q[j+1]);for(let k=0;k<3;k++)sum[k]+=v[k]}
 const mag=Math.hypot(...sum);if(!(mag>1e-14))return NaN;const normal=sum.map(x=>x/mag);
 if(q.some(p=>Math.abs(fesDot(normal,p))>1e-9)||q.some((p,j)=>fesDot(normal,fesCross(fesSub(q[(j+1)%q.length],p),fesSub(q[(j+2)%q.length],q[(j+1)%q.length])))< -1e-12))return NaN;
 const area=mag/2*scale**2;return Number.isFinite(area)&&area>0?area:NaN
}
function* fesPatchPower(input,names,sign){
 const fail=reason=>({valid:false,reason}),{mesh,source,boundary}=input||{};
 if(!mesh||source?.association!=='surface'||!['outward-positive','inward-positive'].includes(sign)||!Array.isArray(names)||!names.length||new Set(names).size!==names.length)return fail('surface-field-patch-sign-required');
 const density=fesDimIs(source.dimensions,[1,0,-3,0,0,0,0]),power=fesDimIs(source.dimensions,[1,2,-3,0,0,0,0]);if(!density&&!power)return fail('heat-flux-or-face-power-dimensions-required');
 const patches=mesh.boundaryPatches||[],rows=[],seen=new Set();let total=0,areaTotal=0;
 for(const name of names){
  const matches=patches.filter(p=>p.name===name);if(matches.length!==1)return fail('missing-or-ambiguous-patch');
  const p=matches[0],start=p.startFace,n=p.nFaces;if(/^processor/i.test(p.type||'')||/^processor/i.test(name)||!Number.isSafeInteger(start)||!Number.isSafeInteger(n)||n<=0||start<mesh.internalFaceCount||start+n>mesh.faceCount)return fail('invalid-physical-patch');
  let sum=0,area=0,missing=0;for(let i=start;i<start+n;i++){if(seen.has(i))return fail('overlapping-patches');seen.add(i);const v=boundary?.get?.(i),A=fesFaceArea(mesh,i);
   if(!Number.isFinite(v)||!Number.isFinite(A))missing++;else{sum+=density?v*A:v;area+=A}
   if((i-start+1)%4096===0)yield{done:i-start+1,total:n}
  }
  if(missing||!Number.isFinite(sum)||!Number.isFinite(area)||!(area>0))return{valid:false,reason:'incomplete-patch-evidence',coverage:{patch:name,faces:n,missing}};
  const outward=sign==='outward-positive'?sum:-sum;rows.push({patch:name,faces:n,area_m2:area,outwardPower_W:outward});total+=outward;areaTotal+=area
 }
 if(!Number.isFinite(total)||!Number.isFinite(areaTotal))return fail('nonfinite-patch-sum');
 return {valid:true,schema:'foamlens/patch-heat-power/1',source,signConvention:sign,inputKind:density?'flux-density-W-m2':'face-power-W',patches:rows,area_m2:areaTotal,outwardPower_W:total,method:'Explicit scalar boundary values only. Planar convex face area; signed power under user-declared convention. Not a closed energy balance.'}
}
function* fesPhaseVolumes(a,role,limit=250000){
 if(!fesDerivedInput(a)||!fesDimIs(a.source.dimensions,[0,0,0,0,0,0,0])||!['liquid','solid'].includes(role))return{valid:false,reason:'dimensionless-phase-field-and-role-required'};
 const n=a.values.length;for(let i=0;i<n;i++){const v=a.values[i];if(!Number.isFinite(v)||v<0||v>1)return{valid:false,reason:'phase-fraction-outside-0-1',cell:i};if((i+1)%16384===0)yield{done:i+1,total:n}}
 const q=fesIntegrate(a,null,limit);if(!q.valid)return q;
 const other=q.volume_m3-q.integral,liquid=role==='liquid'?q.integral:other,solid=role==='solid'?q.integral:other;
 if(liquid<0||solid<0)return{valid:false,reason:'invalid-phase-volume'};
 return{valid:true,schema:'foamlens/phase-volumes/1',source:a.source,role,volume_m3:q.volume_m3,liquid_m3:liquid,solid_m3:solid,liquidFraction:liquid/q.volume_m3,solidFraction:solid/q.volume_m3,method:'Two-phase complement explicitly selected by user; volume-weighted fractions, not mass fraction or shrinkage.'}
}
function fesDerivedPreviewData(mesh,values,limit=6000){
 const n=mesh?.cellCount;if(!Number.isSafeInteger(n)||n<1||values?.length!==n||!Number.isSafeInteger(limit)||limit<1)return null;
 let min=Infinity,max=-Infinity,count=0,missing=0;const points=[],stride=Math.max(1,Math.ceil(n/limit)),lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
 for(let i=0;i<n;i++){const v=values[i],p=fesXYZ(mesh.cellCenters,i);if(!Number.isFinite(v)||!p){missing++;continue}min=Math.min(min,v);max=Math.max(max,v);for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],p[k]);hi[k]=Math.max(hi[k],p[k])}count++;if(i%stride===0)points.push({id:i,p,v})}
 return {points,min:count?min:null,max:count?max:null,valid:count,missing,total:n,lo,hi}
}
function fesInventoryCompatible(a,b,dim){
 return fesDerivedInput(b)&&fesSameMesh(a.source,b.source)&&a.source.time_s===b.source.time_s&&a.values.length===b.values.length&&b.source.component==='value'&&fesDimIs(b.source.dimensions,dim)
}
function fesInventoryProperties(raw){
 const material=raw?.material?fesMaterial(raw.material):null,cp=fesNum(raw?.cp),reference_K=fesNum(raw?.reference_K),latent=fesNum(raw?.latent??0),role=raw?.role||'none',densityMode=raw?.densityMode||'constant';
 if((raw?.material&&!material)||(!material&&!(cp>0))||(material&&(!material.properties.cp||!Number.isFinite(fesMaterialAt(material,'cp',reference_K))))||!(reference_K>=0)||!(latent>=0)||!['none','liquid-mass','solid-mass','liquid-volume','solid-volume'].includes(role)||(role==='none'&&latent!==0)||(material&&latent>0&&material.cpKind!=='sensible-only')||!['constant','table'].includes(densityMode))return null;
 const solidDensity=fesNum(raw?.solidDensity),liquidDensity=fesNum(raw?.liquidDensity),needs=role.endsWith('-volume'),estimate=raw?.estimate===true;
 if((needs||estimate)&&(densityMode==='table'?!(material?.properties.rhoSolid&&material?.properties.rhoLiquid):!(solidDensity>0&&liquidDensity>0)))return null;
 if(estimate&&role==='none')return null;
 return{cp:material?null:cp,reference_K,latent,role,estimate,densityMode,material,solidDensity:(needs||estimate)&&densityMode==='constant'?solidDensity:null,liquidDensity:(needs||estimate)&&densityMode==='constant'?liquidDensity:null}
}
function fesInventoryGeometry(a,limit){
 if(!fesPhysicalBudget('integral',limit)||a.mesh.cellCount>limit)return null;
 const volumes=new Float64Array(a.mesh.cellCount);let count=0;
 const built=fesBuildCells(a.mesh,{limit,retain:false,onCell:c=>{volumes[c.id]=c.volume;count++}});
 return built&&count===volumes.length?{mesh:a.mesh,meshId:a.source.meshId,volumes}:null
}
function* fesInventory(a,rho,alpha,raw,geometry){
 const fail=reason=>({valid:false,reason}),props=fesInventoryProperties(raw);
 if(!props||!fesDerivedInput(a)||a.source.component!=='value'||!fesDimIs(a.source.dimensions,[0,0,0,1,0,0,0]))return fail('temperature-and-material-properties-required');
 if(!fesInventoryCompatible(a,rho,[1,-3,0,0,0,0,0]))return fail('density-field-mismatch');
 if(props.role!=='none'&&!fesInventoryCompatible(a,alpha,[0,0,0,0,0,0,0]))return fail('phase-field-mismatch');
 if(!geometry||geometry.mesh!==a.mesh||geometry.meshId!==a.source.meshId||geometry.volumes?.length!==a.values.length)return fail('unverified-inventory-geometry');
 const prefix=props.material?fesMaterialCpPrefix(props.material):null,href=props.material?fesMaterialH(props.material,prefix,props.reference_K):0;
 if(props.material&&!Number.isFinite(href))return fail('invalid-reference-enthalpy');
 const sums=new Float64Array(6),correction=new Float64Array(6),add=(j,x)=>{const y=x-correction[j],v=sums[j]+y;correction[j]=(v-sums[j])-y;sums[j]=v};
 const n=a.values.length;
 for(let i=0;i<n;i++){
  const V=geometry.volumes[i],T=a.values[i],d=rho.values[i],mass=d*V;
  if(![V,T,d,mass].every(Number.isFinite)||!(V>0)||T<0||!(d>0)||!(mass>0))return{valid:false,reason:'invalid-cell-inventory',cell:i};
  let f=0,solidDensity=props.solidDensity,liquidDensity=props.liquidDensity;
  if(props.densityMode==='table'&&(props.estimate||props.role.endsWith('-volume'))){solidDensity=fesMaterialAt(props.material,'rhoSolid',T);liquidDensity=fesMaterialAt(props.material,'rhoLiquid',T);if(!(solidDensity>0&&liquidDensity>0))return{valid:false,reason:'phase-density-temperature-out-of-range',cell:i}}
  if(props.role!=='none'){
   const rawFraction=alpha.values[i];if(!Number.isFinite(rawFraction)||rawFraction<0||rawFraction>1)return{valid:false,reason:'invalid-phase-fraction',cell:i};
   f=props.role.startsWith('solid')?1-rawFraction:rawFraction;
   if(props.role.endsWith('-volume')){const ml=f*liquidDensity,ms=(1-f)*solidDensity;f=ml/(ml+ms)}
   if(!Number.isFinite(f)||f<0||f>1)return{valid:false,reason:'invalid-phase-mass-conversion',cell:i}
  }
  const specific=props.material?fesMaterialH(props.material,prefix,T)-href:props.cp*(T-props.reference_K),sensible=mass*specific,latent=mass*props.latent*f;
  if(!Number.isFinite(sensible)||!Number.isFinite(latent))return{valid:false,reason:'nonfinite-cell-energy',cell:i};
  add(0,V);add(1,mass);add(2,sensible);add(3,latent);add(4,mass*f);
  if(props.estimate)add(5,mass*(f/liquidDensity+(1-f)/solidDensity));
  if((i+1)%16384===0)yield{done:i+1,total:n}
 }
 const [volume_m3,mass_kg,sensible_J,latent_J,liquidMass_kg,estimatedVolume_m3]=sums,total_J=sensible_J+latent_J;
 if(![...sums,total_J].every(Number.isFinite)||!(volume_m3>0)||!(mass_kg>0))return fail('nonfinite-inventory');
 return {valid:true,time_s:a.source.time_s,volume_m3,mass_kg,sensible_J,latent_J,total_J,liquidMass_kg:props.role==='none'?null:liquidMass_kg,estimatedVolume_m3:props.estimate?estimatedVolume_m3:null,properties:props,sources:[a.source,rho.source,...(props.role==='none'?[]:[alpha.source])],cellCount:n,method:'Original cell density times geometric volume; sensible enthalpy relative to stated Tref using constant Cp or exact piecewise-linear Cp(T) integral; constant latent heat times liquid mass fraction. Effective/unknown Cp forbids additional latent heat. Phase-volume conversion uses explicit constant or tabulated phase densities. Not solver total energy.'}
}
function fesInventoryHistory(frames,{closure=false,sourcePower_W=null}={}){
 const fail=reason=>({valid:false,reason});
 if(!Array.isArray(frames)||frames.length<2||frames.some(f=>!f?.valid||![f.time_s,f.volume_m3,f.mass_kg,f.sensible_J,f.latent_J,f.total_J].every(Number.isFinite)||f.volume_m3<=0||f.mass_kg<=0))return fail('complete-native-inventories-required');
 const first=frames[0],props=JSON.stringify(first.properties),region=first.sources?.[0]?.region,caseId=first.sources?.[0]?.caseId,roles=JSON.stringify(first.sources?.map(x=>[x.field,x.component,x.association,x.dimensions]));
 if(frames.some((f,i)=>i&&f.time_s<=frames[i-1].time_s||JSON.stringify(f.properties)!==props||f.sources?.[0]?.region!==region||f.sources?.[0]?.caseId!==caseId||JSON.stringify(f.sources?.map(x=>[x.field,x.component,x.association,x.dimensions]))!==roles))return fail('inconsistent-history-source');
 const power=closure?fesNum(sourcePower_W):null;
 if(closure&&(!Number.isFinite(power)||frames.some(f=>!f.boundaryPower?.valid||!Number.isFinite(f.boundaryPower.outwardPower_W)||f.boundaryPower.source?.time_s!==f.time_s||f.boundaryPower.source?.region!==region||f.boundaryPower.source?.caseId!==caseId||!f.boundaryPower.patches?.length)))return fail('complete-explicit-boundary-power-required');
 if(closure){const identity=f=>JSON.stringify([f.boundaryPower.source.field,f.boundaryPower.inputKind,f.boundaryPower.signConvention,f.boundaryPower.patches.map(p=>p.patch).sort()]);if(frames.some(f=>identity(f)!==identity(first)))return fail('boundary-power-source-changed')}
 let heatOut_J=0,source_J=0;const rows=[];
 for(let i=0;i<frames.length;i++){
  const f=frames[i],p=frames[i-1];if(i&&closure){const dt=f.time_s-p.time_s;heatOut_J+=(p.boundaryPower.outwardPower_W/2+f.boundaryPower.outwardPower_W/2)*dt;source_J+=power*dt}
  const deltaEnergy_J=f.total_J-first.total_J,massChange_kg=f.mass_kg-first.mass_kg,volumeChange_pct=(f.volume_m3/first.volume_m3-1)*100,estimatedShrinkage_pct=Number.isFinite(f.estimatedVolume_m3)&&first.estimatedVolume_m3>0?(1-f.estimatedVolume_m3/first.estimatedVolume_m3)*100:null;
  const residual_J=closure?deltaEnergy_J+heatOut_J-source_J:null,den=closure?Math.max(Math.abs(deltaEnergy_J),Math.abs(heatOut_J),Math.abs(source_J)):0,relativeResidual=closure&&den>0?residual_J/den:null;
  if([deltaEnergy_J,massChange_kg,volumeChange_pct,heatOut_J,source_J,...[estimatedShrinkage_pct,residual_J,relativeResidual].filter(v=>v!==null)].some(v=>!Number.isFinite(v)))return fail('nonfinite-history');
  rows.push({time_s:f.time_s,volume_m3:f.volume_m3,mass_kg:f.mass_kg,massChange_kg,massChange_pct:massChange_kg/first.mass_kg*100,volumeChange_pct,sensible_J:f.sensible_J,latent_J:f.latent_J,total_J:f.total_J,deltaEnergy_J,liquidMass_kg:f.liquidMass_kg,estimatedVolume_m3:f.estimatedVolume_m3,estimatedShrinkage_pct,outwardPower_W:closure?f.boundaryPower.outwardPower_W:null,heatOut_J:closure?heatOut_J:null,source_J:closure?source_J:null,residual_J,relativeResidual})
 }
 return{valid:true,schema:'foamlens/thermal-inventory-history/1',properties:first.properties,closure:{enabled:closure,sourcePower_W:power,assumptions:closure?'User declares all relevant external heat transfer included, closed mass system, no mechanical work or omitted energy terms. Declared Cp or Cp(T) / constant L model; residual is diagnostic, not certified solver conservation.':'No energy closure inferred; mass/volume changes are observations, not conservation proof.'},rows,frames:frames.map(f=>({time_s:f.time_s,cellCount:f.cellCount,sources:f.sources,boundaryPower:f.boundaryPower||null})),method:'Original native times, trapezoidal boundary power integration, no extrapolation. Actual mesh volume change distinct from density-based theoretical phase-volume estimate.'}
}
const fesMaterialKeys=['cp','k','rho','rhoSolid','rhoLiquid'];
function fesMaterial(raw){
 if(raw?.schema!=='foamlens/material-table/1'||typeof raw.name!=='string'||!raw.name.trim()||typeof raw.file!=='string'||!raw.file.trim()||!['K','C'].includes(raw.originalTemperatureUnit)||!['sensible-only','effective-or-unknown'].includes(raw.cpKind)||!Array.isArray(raw.temperature_K)||raw.temperature_K.length<2)return null;
 const t=raw.temperature_K;if(t.some((v,i)=>!Number.isFinite(v)||v<0||(i&&v<=t[i-1])))return null;
 const properties={};for(const key of fesMaterialKeys){const a=raw.properties?.[key];if(a==null)continue;if(!Array.isArray(a)||a.length!==t.length||a.some(v=>!Number.isFinite(v)||v<=0))return null;properties[key]=a.slice()}
 if(!Object.keys(properties).length)return null;
 return{schema:'foamlens/material-table/1',name:raw.name.trim(),file:raw.file,originalTemperatureUnit:raw.originalTemperatureUnit,cpKind:raw.cpKind,temperature_K:t.slice(),properties,units:{temperature:'K',cp:'J/(kg K)',k:'W/(m K)',rho:'kg/m3',rhoSolid:'kg/m3',rhoLiquid:'kg/m3'},interpolation:'linear; no extrapolation'}
}
function fesParseMaterialCSV(text,options){
 const fail=reason=>({valid:false,reason}),sep=options?.delimiter,decimal=options?.decimal,unit=options?.temperatureUnit,mapping=options?.mapping;
 if(typeof text!=='string'||![',',';','\t'].includes(sep)||!['.',','].includes(decimal)||sep===decimal||!['K','C'].includes(unit)||!mapping)return fail('invalid-import-settings');
 const rows=[];let row=[],cell='',quoted=false,closed=false;
 const pushCell=()=>{row.push(cell.trim());cell='';closed=false},pushRow=()=>{pushCell();if(row.some(Boolean))rows.push(row);row=[]};
 text=text.replace(/^\uFEFF/,'');
 for(let i=0;i<text.length;i++){const c=text[i];if(quoted){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++}else{quoted=false;closed=true}}else cell+=c;continue}
  if(c===sep){pushCell();continue}if(c==='\r'||c==='\n'){if(c==='\r'&&text[i+1]==='\n')i++;pushRow();continue}
  if(c==='"'){if(cell.trim()||closed)return fail('invalid-csv-quote');quoted=true;continue}if(closed&&c.trim())return fail('invalid-csv-quote');cell+=c
 }
 if(quoted)return fail('unclosed-csv-quote');if(cell||row.length)pushRow();
 if(rows.length<3)return fail('header-and-two-data-rows-required');
 const headers=rows.shift();if(new Set(headers).size!==headers.length||headers.some(x=>!x))return fail('ambiguous-header');
 const columns={};for(const key of ['temperature',...fesMaterialKeys]){const h=String(mapping[key]||'').trim();if(!h){if(key==='temperature')return fail('temperature-column-required');continue}const idx=headers.indexOf(h);if(idx<0)return fail('column-not-found:'+h);columns[key]=idx}
 if(Object.keys(columns).length<2||new Set(Object.values(columns)).size!==Object.keys(columns).length)return fail('select-distinct-property-columns');
 const number=v=>fesNum(decimal===','?v.replace(',','.'):v),records=[];
 for(let i=0;i<rows.length;i++){const r=rows[i];if(r.length!==headers.length)return fail('column-count-mismatch:row '+(i+2));const T=number(r[columns.temperature])+(unit==='C'?273.15:0),values={};
  if(!Number.isFinite(T)||T<0)return fail('invalid-temperature:row '+(i+2));
  for(const key of fesMaterialKeys)if(key in columns){const v=number(r[columns[key]]);if(!Number.isFinite(v)||v<=0)return fail('invalid-property:'+key+':row '+(i+2));values[key]=v}
  records.push({T,values})
 }
 records.sort((a,b)=>a.T-b.T);const properties={};for(const key of fesMaterialKeys)if(key in columns)properties[key]=records.map(r=>r.values[key]);
 const material=fesMaterial({schema:'foamlens/material-table/1',name:options.name,file:options.file,originalTemperatureUnit:unit,cpKind:options.cpKind,temperature_K:records.map(r=>r.T),properties});
 return material?{valid:true,material}:{valid:false,reason:'duplicate-temperature-or-invalid-material'}
}
function fesMaterialSegment(t,T){
 if(!Number.isFinite(T)||T<t[0]||T>t.at(-1))return -1;
 let lo=0,hi=t.length-1;while(hi-lo>1){const m=Math.floor((lo+hi)/2);if(t[m]<=T)lo=m;else hi=m}return lo
}
function fesMaterialAt(m,key,T){
 const t=m?.temperature_K,v=m?.properties?.[key];if(!t||!v)return NaN;const i=fesMaterialSegment(t,T);if(i<0)return NaN;
 const f=(T-t[i])/(t[i+1]-t[i]),x=v[i]*(1-f)+v[i+1]*f;return Number.isFinite(x)&&x>0?x:NaN
}
function fesMaterialCpPrefix(m){
 const t=m?.temperature_K,c=m?.properties?.cp;if(!t||!c)return null;const a=new Float64Array(t.length);
 for(let i=1;i<t.length;i++){a[i]=a[i-1]+(c[i-1]/2+c[i]/2)*(t[i]-t[i-1]);if(!Number.isFinite(a[i]))return null}return a
}
function fesMaterialH(m,prefix,T){
 const t=m?.temperature_K,c=m?.properties?.cp;if(!prefix||!t||!c)return NaN;const i=fesMaterialSegment(t,T);if(i<0)return NaN;
 const v=fesMaterialAt(m,'cp',T),h=prefix[i]+(c[i]/2+v/2)*(T-t[i]);return Number.isFinite(h)?h:NaN
}
function* fesMaterialField(a,raw,key){
 const m=fesMaterial(raw),dimensions={cp:[0,2,-2,-1,0,0,0],k:[1,1,-3,-1,0,0,0],rho:[1,-3,0,0,0,0,0],rhoSolid:[1,-3,0,0,0,0,0],rhoLiquid:[1,-3,0,0,0,0,0]}[key];
 if(!m||!dimensions||!m.properties[key]||!fesDerivedInput(a)||a.source.component!=='value'||!fesDimIs(a.source.dimensions,[0,0,0,1,0,0,0]))return{valid:false,reason:'temperature-and-table-property-required'};
 const n=a.values.length,values=new Float64Array(n);let valid=0;
 for(let i=0;i<n;i++){const v=fesMaterialAt(m,key,a.values[i]);values[i]=v;if(Number.isFinite(v))valid++;if((i+1)%16384===0)yield{done:i+1,total:n}}
 return{valid:true,schema:'foamlens/derived-field/1',kind:'material-'+key,sources:[a.source],material:m,dimensions,columns:[{name:key+'(T)',values}],coverage:{total:n,valid,missing:n-valid},method:'Piecewise linear table lookup in kelvin; no extrapolation. Model property, not an original solver field.'}
}
function fesInterfaceConfig(raw){
 const role=raw?.role,threshold=fesNum(raw?.threshold),patches=raw?.patches;
 if(!['metal-volume','gas-volume','liquid-fraction','solid-fraction'].includes(role)||!(threshold>0&&threshold<1)||!Array.isArray(patches)||new Set(patches).size!==patches.length||patches.some(p=>typeof p!=='string'||!p))return null;
 const occupancy=role.endsWith('-volume');if(occupancy&&!patches.length&&raw.sealed!==true)return null;
 return{role,threshold,patches:occupancy?patches.slice().sort():[],sealed:occupancy&&raw.sealed===true&&!patches.length,occupancy}
}
function fesInterfacePatches(mesh,cfg){
 const n=mesh.cellCount,o=mesh.owners,q=mesh.neighbours,patches=mesh.boundaryPatches||[];
 if(!o||!q||q.length!==mesh.internalFaceCount||o.length!==mesh.faceCount||q.length>o.length)return null;
 const open=new Uint8Array(n),boundary=new Uint8Array(n),coverage=new Uint8Array(o.length-q.length),selected=new Set(cfg.patches),found=new Set();
 for(const p of patches){
  if(typeof p.name!=='string'||!p.name||found.has(p.name)||/^processor/i.test(p.name)||/^processor/i.test(p.type||'')||/cyclic|ami|mapped|overset/i.test(p.type||''))return null;
  found.add(p.name);const start=p.startFace,end=start+p.nFaces;if(!Number.isSafeInteger(start)||!Number.isSafeInteger(p.nFaces)||p.nFaces<0||start<q.length||end>o.length)return null;
  for(let f=start;f<end;f++){const i=o[f];if(coverage[f-q.length]||!Number.isSafeInteger(i)||i<0||i>=n)return null;coverage[f-q.length]=1;boundary[i]=1;if(selected.has(p.name))open[i]=1}
 }
 if(coverage.some(x=>!x)||[...selected].some(p=>!found.has(p)))return null;
 return {open,boundary}
}
function* fesInterface(a,raw,geometry){
 const fail=reason=>({valid:false,reason}),cfg=fesInterfaceConfig(raw);
 if(!cfg||!fesDerivedInput(a)||a.source.component!=='value'||!fesDimIs(a.source.dimensions,[0,0,0,0,0,0,0]))return fail('explicit-dimensionless-fraction-role-and-threshold-required');
 const m=a.mesh,n=m.cellCount;if(m.decomposed||a.source.decomposed)return fail('reconstructed-mesh-required');
 if(!geometry||geometry.mesh!==m||geometry.meshId!==a.source.meshId||geometry.volumes?.length!==n)return fail('verified-cell-volumes-required');
 const adjacency=fesAdjacency(m),boundary=fesInterfacePatches(m,cfg);if(!adjacency||!boundary)return fail('invalid-or-coupled-boundary-topology');
 const high=new Uint8Array(n),label=new Uint32Array(n),queue=new Uint32Array(n),comps=[];
 let total=0,phaseVolume=0,thresholdVolume=0,interfaceArea=0,faceCount=0,areaX=0,areaY=0,areaZ=0;
 const reverse=cfg.role==='metal-volume'||cfg.role==='solid-fraction'; // normalized to gas or liquid
 for(let i=0;i<n;i++){
  const v=a.values[i],V=geometry.volumes[i];if(!Number.isFinite(v)||v<0||v>1||!(V>0)||!Number.isFinite(V))return{valid:false,reason:'invalid-fraction-or-volume',cell:i};
  const f=reverse?1-v:v;high[i]=f>=cfg.threshold?1:0;total+=V;phaseVolume+=f*V;if(high[i])thresholdVolume+=V;
  if((i+1)%16384===0)yield{done:i+1,total:n}
 }
 let next=0,connected=0,isolated=0,connectedVolume=0,isolatedVolume=0,connectedPhase=0,isolatedPhase=0;
 if(cfg.occupancy)for(let i=0;i<n;i++){
  if(high[i]&&!label[i]){
   let head=0,tail=1,id=++next,touchOpen=false,touchBoundary=false,V=0,gas=0;queue[0]=i;label[i]=id;
   while(head<tail){const j=queue[head++],v=geometry.volumes[j],f=reverse?1-a.values[j]:a.values[j];V+=v;gas+=f*v;touchOpen||=!!boundary.open[j];touchBoundary||=!!boundary.boundary[j];
    for(let k=adjacency.offsets[j];k<adjacency.offsets[j+1];k++){const q=adjacency.ids[k];if(high[q]&&!label[q]){label[q]=id;queue[tail++]=q}}
    if(head%16384===0)yield{done:head,total:n}
   }
   if(!Number.isFinite(V)||!Number.isFinite(gas))return fail('nonfinite-component-volume');
   if(touchOpen){connected++;connectedVolume+=V;connectedPhase+=gas}else{isolated++;isolatedVolume+=V;isolatedPhase+=gas}
   comps.push({id,cells:tail,thresholdVolume_m3:V,gasVolume_m3:gas,connectedToDeclaredOpening:touchOpen,touchesPhysicalBoundary:touchBoundary})
  }
  if((i+1)%16384===0)yield{done:i+1,total:n}
 }
 const owners=m.owners,neighbours=m.neighbours;
 for(let f=0;f<neighbours.length;f++){
  const i=owners[f],j=neighbours[f];if(high[i]!==high[j]){
   const A=fesFaceArea(m,f),p=fesFacePoint(m,f);if(!(A>0)||!p)return{valid:false,reason:'invalid-interface-face',face:f};
   interfaceArea+=A;faceCount++;areaX+=A*p[0];areaY+=A*p[1];areaZ+=A*p[2];
  }
  if((f+1)%16384===0)yield{done:f+1,total:neighbours.length}
 }
 if(![total,phaseVolume,thresholdVolume,interfaceArea,areaX,areaY,areaZ,connectedVolume,isolatedVolume,connectedPhase,isolatedPhase].every(Number.isFinite)||!(total>0))return fail('nonfinite-interface-metrics');
 const centroid=interfaceArea>0?[areaX/interfaceArea,areaY/interfaceArea,areaZ/interfaceArea]:null;
 return{valid:true,schema:'foamlens/interface-topology/1',source:a.source,config:cfg,metrics:{meshVolume_m3:total,phaseVolume_m3:cfg.occupancy?phaseVolume:null,fractionVolumeIntegral_m3:phaseVolume,thresholdVolume_m3:thresholdVolume,interfaceFaceCount:faceCount,interfaceArea_m2:interfaceArea,interfaceCentroid_m:centroid,connectedComponents:cfg.occupancy?connected:null,isolatedComponents:cfg.occupancy?isolated:null,connectedThresholdVolume_m3:cfg.occupancy?connectedVolume:null,isolatedThresholdVolume_m3:cfg.occupancy?isolatedVolume:null,connectedGasVolume_m3:cfg.occupancy?connectedPhase:null,isolatedGasVolume_m3:cfg.occupancy?isolatedPhase:null},components:comps,labels:cfg.occupancy?label:high,method:'Whole-cell threshold in normalized gas or liquid fraction; internal faces separating threshold classes, not interpolated isosurface. Face area and area-weighted vertex-mean face position. Gas components use internal face connectivity and declared open patches; disconnected components are candidates, not confirmed shrinkage cavities. Gas volume within threshold-selected cells differs from full-domain gas volume. Liquid/solid fraction integral is not identified as a phase volume when fraction basis is unspecified.'}
}
function fesInterfaceHistory(items){
 if(!Array.isArray(items)||!items.length||items.some(x=>!x?.valid))return null;
 const first=items[0],identity=x=>JSON.stringify([x.source.caseId,x.source.region,x.source.field,x.source.component,fesDimensions(x.source.dimensions),x.config]);
 if(items.some((x,i)=>identity(x)!==identity(first)||!Number.isFinite(x.source.time_s)||(i&&x.source.time_s<=items[i-1].source.time_s)))return null;
 const rows=items.map(x=>{const m=x.metrics,p=m.interfaceCentroid_m;return{time_s:x.source.time_s,...m,interfaceCentroid_m:undefined,centroidX_m:p?.[0]??null,centroidY_m:p?.[1]??null,centroidZ_m:p?.[2]??null}});
 return{schema:'foamlens/interface-history/1',config:first.config,method:first.method,sources:items.map(x=>x.source),rows,componentSnapshots:items.map(x=>({time_s:x.source.time_s,components:x.components})),tracking:'Independent connected components at each native time; IDs are local to a frame, not persistent cavity identities.'}
}
function fesMaterialFoamPairs(raw,key){
 const m=fesMaterial(raw);if(!m||!fesMaterialKeys.includes(key)||!m.properties[key])return null;
 return '// FoamLens SI temperature/property pairs; T in K\n// '+key+' ['+m.units[key]+']; '+m.interpolation+'\n// Data fragment only: choose solver/version-specific Function1/table syntax and out-of-bounds policy separately.\n(\n'+m.temperature_K.map((t,i)=>'    ('+t+' '+m.properties[key][i]+')').join('\n')+'\n)\n'
}
const fesReportKinds={
 'foamlens/entity-selection/1':'Entity selection',
 'foamlens/clipped-exterior/1':'Exterior clip',
 'foamlens/volume-integral/1':'Volume integration',
 'foamlens/mesh-resample/1':'Mesh resampling',
 'foamlens/derived-field/1':'Derived field',
 'foamlens/patch-heat-power/1':'Boundary heat power',
 'foamlens/phase-volumes/1':'Phase volumes',
 'foamlens/thermal-inventory-history/1':'Transient thermal inventory',
 'foamlens/interface-history/1':'Interface history'
};
function fesReportSourceValid(s){
 return !!(s&&typeof s.caseId==='string'&&s.caseId.trim()&&typeof s.region==='string'&&typeof s.field==='string'&&s.field.trim()&&typeof s.component==='string'&&['volume','point','surface'].includes(s.association)&&Number.isFinite(s.time_s)&&typeof s.meshId==='string'&&s.meshId.trim()&&Array.isArray(s.paths)&&s.paths.length&&s.paths.every(p=>typeof p==='string'&&p.trim()))
}
function fesReportSnapshot(r,scope){
 if(!r||!Object.hasOwn(fesReportKinds,r.schema)||r.valid===false)return null;
 const sources=r.schema==='foamlens/mesh-resample/1'?[r.target,r.source]:r.schema==='foamlens/thermal-inventory-history/1'?(r.frames||[]).flatMap(f=>[...(f.sources||[]),...(f.boundaryPower?[f.boundaryPower.source]:[])]):r.sources||[r.source];
 if(!sources.length||!sources.every(fesReportSourceValid)||!scope||sources[0].caseId!==scope.caseId||sources[0].region!==scope.region)return null;
 // Independent sources are retained explicitly, including case B for resampling.
 const metrics={},parameters={},rawKeys=['coverage','range','metrics','volume_m3','integral','weightedMean','integralDimensions','area_m2','outwardPower_W','liquid_m3','solid_m3','liquidFraction','solidFraction','duration_s'];
 for(const key of rawKeys)if(r[key]!==undefined)metrics[key]=r[key];
 for(const key of ['filter','plane','cellBudget','cellBudgetPerMesh','dimensions','conductivity','material','signConvention','inputKind','role','properties','closure','config','tracking','patches'])if(r[key]!==undefined)parameters[key]=r[key];
 if(r.selection!==undefined)parameters.selection=r.selection; // exact selected IDs are required to reproduce an integral
 if(r.columns)parameters.columns=r.columns.map(c=>c.name);
 if(r.rows){metrics.rowCount=r.rows.length;if(r.schema==='foamlens/thermal-inventory-history/1'||r.schema==='foamlens/interface-history/1'){metrics.first=r.rows[0]||null;metrics.last=r.rows.at(-1)||null}}
 if(r.triangles)metrics.triangleCount=r.triangles.length;
 const payload=r.schema==='foamlens/derived-field/1'?['full field CSV','provenance JSON']:r.schema==='foamlens/clipped-exterior/1'?['geometry OBJ','clip JSON']:['operation JSON',...(r.rows?['operation CSV if available']:[])];
 const summary={schema:r.schema,label:fesReportKinds[r.schema]+(r.kind?' · '+r.kind:''),sources,metrics,parameters,method:r.method||r.limitations||'',rawPayloadIncluded:false,requiredCompanionExports:payload};
 return JSON.parse(JSON.stringify(summary))
}
function fesReportManifest(scope,entries,title,notes,created){
 if(!scope||typeof scope.caseId!=='string'||!scope.caseId||typeof scope.region!=='string'||!Array.isArray(entries)||!entries.length||entries.some(e=>!e?.sources?.length||!e.sources.every(fesReportSourceValid)||e.sources[0].caseId!==scope.caseId||e.sources[0].region!==scope.region))return null;
 return{schema:'foamlens/scientific-report/1',title:String(title||'FoamLens scientific report'),createdUTC:String(created),scope:{caseId:scope.caseId,caseName:String(scope.caseName||scope.caseId),region:scope.region},notes:String(notes||''),entries,limitations:['Analysis snapshots, not solver validation or experimental acceptance.','Raw arrays and geometry are not embedded; retain the companion operation exports and original case files.','Paths and mesh identities identify loaded sources, not cryptographic file hashes.','Results may refer to distinct physical times; no automatic aggregation or equivalence is inferred.']}
}
function fesReportEscape(value){return String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
function fesReportHtml(report){
 if(!report)return null;const e=fesReportEscape,pretty=x=>e(JSON.stringify(x,null,2));
 const sections=report.entries.map((r,i)=>{
  const times=r.sources.map(s=>s.time_s);let lo=Infinity,hi=-Infinity;for(const t of times){lo=Math.min(lo,t);hi=Math.max(hi,t)}
  return '<section><h2>'+(i+1)+'. '+e(r.label)+'</h2><p>Native time: '+e(lo)+' – '+e(hi)+' s · '+r.sources.length+' source record(s)</p><p>'+e(r.method)+'</p><h3>Metrics / coverage</h3><pre>'+pretty(r.metrics)+'</pre><details><summary>Parameters and provenance</summary><pre>'+pretty({parameters:r.parameters,sources:r.sources})+'</pre></details><p>Companion exports: '+e(r.requiredCompanionExports.join('; '))+'</p></section>'
 }).join('');
 return '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+e(report.title)+'</title><style>body{font:15px/1.55 system-ui,sans-serif;max-width:1000px;margin:32px auto;padding:0 24px;color:#17232f;background:white}h1,h2,h3{line-height:1.25}h1{border-bottom:2px solid #327c82;padding-bottom:12px}section{border-top:1px solid #d2dce0;margin-top:28px;padding-top:16px}pre{font:12px/1.5 monospace;background:#f2f5f6;padding:12px;white-space:pre-wrap;overflow-wrap:anywhere}summary{cursor:pointer;font-weight:600}p{overflow-wrap:anywhere}@media print{body{max-width:none;margin:0}section{break-inside:auto}pre{white-space:pre-wrap}}</style><h1>'+e(report.title)+'</h1><p>'+e(report.scope.caseName)+' · '+e(report.scope.region||'(default region)')+' · '+e(report.createdUTC)+'</p><h2>Notes</h2><p style="white-space:pre-wrap">'+e(report.notes)+'</p><h2>Limitations</h2><ul>'+report.limitations.map(x=>'<li>'+e(x)+'</li>').join('')+'</ul>'+sections+'</html>'
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
 if(!paths.length||f._fvFrameHold||f._fvGroupHold)return null;
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
 fesPhysicalShow(fesIntegrate(a,ids,fesE('fesIntegralBudget').value))
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
 const b={mesh:data.mesh,values:data.fieldValues,source:{caseId:String(c.id),caseName:String(c.name||c.id),region:a.source.region,field:g.name,association:data.storage,component:a.source.component,time_s:time,dimensions,unit:dimensions&&typeof pmUnitFromDimensions==='function'?pmUnitFromDimensions(dimensions):'',paths,meshId:data.meshInfo.key,decomposed:!!data.mesh.decomposed}};fesPhysicalShow(fesResample(a,b,fesE('fesResampleBudget').value))
 }catch(e){if(seq===fesPhysicalSeq)fesPhysicalShow({valid:false,reason:String(e?.message||e)})}
}
function fesPhysicalExport(){
 const r=fesPhysicalResult;if(!r)return;const data=JSON.stringify(r,null,2),name=r.schema.includes('integral')?'FoamLens_volume_integral.json':'FoamLens_mesh_resample.json';
 if(typeof downloadText==='function'){downloadText(name,data,'application/json');return}const url=URL.createObjectURL(new Blob([data],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
}
function fesMountPhysical(box){
 const el=document.createElement('details');el.className='analysisExt';el.innerHTML='<summary><strong data-fl-en="Volume integration / mesh resample" data-fl-es="Integración volumétrica / remuestreo">Volume integration / mesh resample</strong></summary><p class="smallnote" data-fl-en="Cell-centred fields, verified closed convex planar cells. Configurable cell budgets; larger settings can consume substantial memory. Resample B onto A at identical physical time and region; no extrapolation." data-fl-es="Campos centrados en celdas, celdas convexas cerradas y planas verificadas. Límites configurables; los mayores pueden consumir mucha memoria. Remuestreo B sobre A a igual tiempo físico y región; sin extrapolación.">Cell-centred fields, verified closed convex planar cells. Configurable cell budgets; larger settings can consume substantial memory. Resample B onto A at identical physical time and region; no extrapolation.</p><div class="field"><label data-fl-en="Integration scope" data-fl-es="Alcance de integración">Integration scope</label><select id="fesPhysicalScope"><option value="all" data-fl-en="Entire Field A" data-fl-es="Todo Field A">Entire Field A</option><option value="selection" data-fl-en="Current extracted entities" data-fl-es="Entidades extraídas actuales">Current extracted entities</option></select></div><div class="field"><label data-fl-en="Integration cell budget" data-fl-es="Límite de celdas para integración">Integration cell budget</label><select id="fesIntegralBudget"><option value="100000">100,000</option><option value="250000" selected>250,000</option><option value="500000">500,000</option><option value="1000000">1,000,000</option></select></div><button class="btn primary" type="button" id="fesPhysicalIntegral" data-fl-en="Integrate variables" data-fl-es="Integrar variables">Integrate variables</button><div class="field"><label data-fl-en="Source case B" data-fl-es="Caso fuente B">Source case B</label><select id="fesPhysicalCase"></select></div><div class="field"><label data-fl-en="Resample cell budget per mesh" data-fl-es="Límite de remuestreo por malla">Resample cell budget per mesh</label><select id="fesResampleBudget"><option value="100000">100,000</option><option value="250000" selected>250,000</option><option value="500000">500,000</option></select></div><div class="extActions"><button class="btn soft" type="button" id="fesPhysicalRefresh" data-fl-en="Refresh cases" data-fl-es="Actualizar casos">Refresh cases</button><button class="btn primary" type="button" id="fesPhysicalResample" data-fl-en="Resample B → A" data-fl-es="Remuestrear B → A">Resample B → A</button><button class="btn soft" type="button" id="fesPhysicalExport">JSON</button></div><p class="smallnote" id="fesPhysicalStatus" aria-live="polite"></p>';
 box.querySelector('.extSectionBody').append(el);el.addEventListener('toggle',()=>{if(el.open)fesPhysicalCases()});fesE('fesPhysicalRefresh').onclick=fesPhysicalCases;fesE('fesPhysicalCase').onchange=fesPhysicalClear;fesE('fesPhysicalScope').onchange=fesPhysicalClear;fesE('fesIntegralBudget').onchange=fesPhysicalClear;fesE('fesResampleBudget').onchange=fesPhysicalClear;fesE('fesPhysicalIntegral').onclick=fesPhysicalIntegrate;fesE('fesPhysicalResample').onclick=fesPhysicalResample;fesE('fesPhysicalExport').onclick=fesPhysicalExport;fesPhysicalClear()
}
let fesDerivedSeq=0,fesDerivedResult=null,fesDerivedMesh=null,fesDerivedPreviewCache=null,fesThermalReport=null;
function fesDerivedReset(){fesDerivedSeq++;fesDerivedResult=null;fesDerivedMesh=null;fesDerivedPreviewCache=null;fesE('fesDerivedPreview').replaceChildren();fesE('fesDerivedColumn').replaceChildren();fesE('fesDerivedStatus').textContent='';fesE('fesDerivedCsv').disabled=true;fesE('fesDerivedMeta').disabled=true}
function fesDerivedGroups(){
 const a=fesSource(),c=typeof fvCase==='function'?fvCase():null,sel=fesE('fesDerivedOther'),old=sel.value;sel.replaceChildren();if(!a||!c)return;
 for(const g of fvFieldGroups(c,a.source.region,null,'volume')){if(!g.times.some(t=>fesNum(t)===a.source.time_s))continue;for(const comp of fvFieldComponents(g)){const o=document.createElement('option');o.value=JSON.stringify([g.name,g.kind,comp.v]);o.textContent=g.name+' · '+comp.t;sel.append(o)}}
 if([...sel.options].some(o=>o.value===old))sel.value=old
}
function fesDerivedData(c,g,region,time,component,data){
 const dimensions=data.parsed?.dimensions,paths=fesLayoutPaths(data.layout);if(!paths.length)throw Error('source-path-unavailable');
 return{mesh:data.mesh,values:data.fieldValues,source:{caseId:String(c.id),caseName:String(c.name||c.id),region,field:g.name,association:data.storage,component,time_s:time,dimensions,unit:dimensions&&typeof pmUnitFromDimensions==='function'?pmUnitFromDimensions(dimensions):'',paths,meshId:data.meshInfo.key,decomposed:!!data.mesh.decomposed}}
}
async function fesDerivedConsume(generator,seq,prefix){
 for(;;){if(seq!==fesDerivedSeq)throw Error('cancelled');const next=generator.next();if(next.done)return next.value;fesE('fesDerivedStatus').textContent=prefix+' · '+next.value.done+'/'+next.value.total;await new Promise(r=>setTimeout(r,0))}
}
function fesDerivedShow(r,mesh=null){if(!r?.valid){fesE('fesDerivedStatus').textContent=r?.reason||'invalid-result';return}fesDerivedResult=r;fesDerivedMesh=mesh;fesDerivedPreviewCache=null;const col=fesE('fesDerivedColumn');col.replaceChildren();for(let i=0;i<r.columns.length;i++){const o=document.createElement('option');o.value=String(i);o.textContent=r.columns[i].name;col.append(o)}fesDerivedDraw();fesE('fesDerivedCsv').disabled=false;fesE('fesDerivedMeta').disabled=false;fesE('fesDerivedStatus').textContent=r.kind+' · '+r.coverage.valid+'/'+r.coverage.total+' '+fesUi('valid cells','celdas válidas')+' · ['+r.dimensions.join(' ')+']'+(r.duration_s?' · '+r.duration_s+' s':'')}
async function fesDerivedRun(kind){
 fesDerivedReset();const seq=fesDerivedSeq,a=fesSource(),c=typeof fvCase==='function'?fvCase():null,g=typeof fvCurrentFieldGroup==='function'?fvCurrentFieldGroup():null;
 if(!fesDerivedInput(a)||!c||!g){fesDerivedShow({valid:false,reason:'load-volume-field-with-dimensions'});return}
 const region=a.source.region,comp=a.source.component,status=fesE('fesDerivedStatus'),current=()=>{const x=fesSource();return x&&x.mesh===a.mesh&&x.values===a.values&&JSON.stringify(x.source)===JSON.stringify(a.source)};
 try{let result;
 if(kind==='material'){result=await fesDerivedConsume(fesMaterialField(a,fesMaterialSelected(),fesE('fesMatProperty').value),seq,'Material property')}
 else if(kind==='heat-flux'){const plane=fesE('fesDerivedPlane').value;let k;if(fesE('fesKMode').value==='constant')k=fesNum(fesE('fesKConstant').value);else if(fesE('fesKMode').value==='material'){const q=await fesDerivedConsume(fesMaterialField(a,fesMaterialSelected(),'k'),seq,'k(T)');if(!q.valid)throw Error(q.reason);k={mesh:a.mesh,values:q.columns[0].values,source:{...a.source,field:'k(T)',dimensions:q.dimensions,unit:'W/(m K)',material:q.material,derivedFrom:a.source}}}else{const [name,type,component]=JSON.parse(fesE('fesDerivedOther').value),groups=fvFieldGroups(c,region,null,'volume').filter(x=>x.name===name&&x.kind===type&&x.times.some(t=>fesNum(t)===a.source.time_s));if(groups.length!==1)throw Error('ambiguous-or-missing-conductivity-field');k=fesDerivedData(c,groups[0],region,a.source.time_s,component,await fvLoadFrameData(c,groups[0],region,a.source.time_s,component,{includeBoundary:false}));if(!current())throw Error('source-changed')}result=await fesDerivedConsume(fesHeatFlux(a,k,plane),seq,'Fourier heat flux')}
 else if(kind==='calculator'){const [name,type,component]=JSON.parse(fesE('fesDerivedOther').value),op=fesE('fesDerivedOp').value,groups=fvFieldGroups(c,region,null,'volume').filter(x=>x.name===name&&x.kind===type&&x.times.some(t=>fesNum(t)===a.source.time_s));if(groups.length!==1)throw Error('ambiguous-or-missing-second-field');status.textContent=fesUi('Loading second field…','Cargando segundo campo…');const b=fesDerivedData(c,groups[0],region,a.source.time_s,component,await fvLoadFrameData(c,groups[0],region,a.source.time_s,component,{includeBoundary:false}));if(!current())throw Error('source-changed');result=await fesDerivedConsume(fesCalculate(a,b,op),seq,'Calculator')}
 else if(kind==='gradient'){result=await fesDerivedConsume(fesGradient(a,fesE('fesDerivedPlane').value),seq,'Gradient')}
 else {
  const lo=fesNum(fesE('fesDerivedStart').value),hi=fesNum(fesE('fesDerivedEnd').value),times=g.times.map(fesNum).filter(t=>Number.isFinite(t)&&t>=lo&&t<=hi).sort((a,b)=>a-b);
  if(!Number.isFinite(lo)||!Number.isFinite(hi)||times.length<2||new Set(times).size!==times.length||times[0]!==lo||times.at(-1)!==hi)throw Error('select-two-exact-native-times');
  let state=null;
  for(let i=0;i<times.length;i++){if(seq!==fesDerivedSeq||!current())throw Error('source-changed-or-cancelled');status.textContent=fesUi('Loading native time','Cargando tiempo nativo')+' '+(i+1)+'/'+times.length;const frame=fesDerivedData(c,g,region,times[i],comp,await fvLoadFrameData(c,g,region,times[i],comp,{includeBoundary:false}));if(seq!==fesDerivedSeq)throw Error('cancelled');
   if(!state){state=fesTemporalStart(frame);if(!state)throw Error('invalid-first-frame')}else if(!await fesDerivedConsume(fesTemporalStep(state,frame),seq,'t='+times[i]+' s'))throw Error('mesh-dimensions-or-time-changed');
  }result=await fesDerivedConsume(fesTemporalFinish(state),seq,'Temporal statistics')
 }
 if(seq===fesDerivedSeq){if(!current())throw Error('source-changed');fesDerivedShow(result,a.mesh)}
 }catch(e){if(seq===fesDerivedSeq)fesDerivedShow({valid:false,reason:String(e?.message||e)})}
}
function fesDerivedTimes(){const g=typeof fvCurrentFieldGroup==='function'?fvCurrentFieldGroup():null,t=(g?.times||[]).map(fesNum).filter(Number.isFinite).sort((a,b)=>a-b);for(const [id,def] of [['fesDerivedStart',0],['fesDerivedEnd',t.length-1]]){const sel=fesE(id);sel.replaceChildren();for(const x of t){const o=document.createElement('option');o.value=String(x);o.textContent=x+' s';sel.append(o)}if(t.length)sel.selectedIndex=def}}
async function fesDerivedExport(csv){
 const r=fesDerivedResult;if(!r)return;const seq=fesDerivedSeq,name='FoamLens_'+r.kind;const metadata={...r,columns:r.columns.map(c=>({name:c.name}))};
 if(!csv){downloadText(name+'.json',JSON.stringify(metadata,null,2),'application/json');return}
 const quote=x=>'"'+String(x).replace(/"/g,'""')+'"',parts=[['cell_id',...r.columns.map(c=>quote(/^[=+@-]/.test(c.name)?"'"+c.name:c.name))].join(',')+'\n'];let block=[];
 for(let i=0;i<r.coverage.total;i++){if(seq!==fesDerivedSeq)return;block.push([i,...r.columns.map(c=>Number.isFinite(c.values[i])?c.values[i]:'')].join(',')+'\n');if(block.length>=16384){parts.push(block.join(''));block=[];await new Promise(resolve=>setTimeout(resolve,0))}}
 if(block.length)parts.push(block.join(''));if(seq!==fesDerivedSeq)return;const blob=new Blob(parts,{type:'text/csv'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
}
function fesDerivedDraw(){
 const r=fesDerivedResult,mesh=fesDerivedMesh,host=fesE('fesDerivedPreview');host.replaceChildren();if(!r||!mesh)return;
 const i=Number(fesE('fesDerivedColumn').value),col=r.columns[i];if(!col)return;
 if(fesDerivedPreviewCache?.i!==i)fesDerivedPreviewCache={i,data:fesDerivedPreviewData(mesh,col.values)};
 const d=fesDerivedPreviewCache.data;if(!d||!d.valid){host.textContent=fesUi('No valid coordinates and values.','Sin coordenadas y valores válidos.');return}
 const canvas=document.createElement('canvas');canvas.width=480;canvas.height=280;canvas.style.cssText='width:100%;height:auto;background:#101827;border-radius:8px';host.append(canvas);const ctx=canvas.getContext('2d');if(!ctx)return;
 const yaw=Number(fesE('fesDerivedYaw').value)*Math.PI/180,pitch=Number(fesE('fesDerivedPitch').value)*Math.PI/180,center=d.lo.map((v,k)=>v/2+d.hi[k]/2),size=Math.hypot(...d.hi.map((v,k)=>v-d.lo[k]))||1;
 const projected=d.points.map(p=>{const a=p.p.map((v,k)=>(v-center[k])/size),x=a[0]*Math.cos(yaw)-a[1]*Math.sin(yaw),y=a[0]*Math.sin(yaw)+a[1]*Math.cos(yaw);return{x,y:y*Math.sin(pitch)+a[2]*Math.cos(pitch),z:y*Math.cos(pitch)-a[2]*Math.sin(pitch),v:p.v}}).sort((a,b)=>a.z-b.z);
 for(const p of projected){const q=d.max===d.min?.5:(p.v-d.min)/(d.max-d.min);ctx.fillStyle='hsl('+Math.round(230-190*q)+' 85% 58%)';ctx.fillRect(240+220*p.x,140-220*p.y,3,3)}
 const note=document.createElement('p');note.className='smallnote';note.textContent=col.name+' · '+d.min+' – '+d.max+' · ['+r.dimensions.join(' ')+'] · '+d.points.length+'/'+d.valid+' '+fesUi('preview points; full CSV unchanged.','puntos de vista previa; CSV completo intacto.');host.append(note)
}
function fesThermalRefresh(){const a=fesSource(),el=fesE('fesThermalPatches');el.replaceChildren();for(const p of a?.mesh?.boundaryPatches||[]){if(/^processor/i.test(p.type||'')||/^processor/i.test(p.name||''))continue;const o=document.createElement('option');o.value=p.name;o.textContent=p.name;el.append(o)}}
let fesThermalSeq=0;
function fesThermalClear(){fesThermalSeq++;fesThermalReport=null;fesE('fesThermalStatus').textContent='';fesE('fesThermalExport').disabled=true}
async function fesThermalRun(kind){
 fesThermalClear();const seq=fesThermalSeq,a=fesSource();if(!a){fesE('fesThermalStatus').textContent='source-not-ready';return}
 const gen=kind==='patch'?fesPatchPower(a,[...fesE('fesThermalPatches').selectedOptions].map(o=>o.value),fesE('fesThermalSign').value):fesPhaseVolumes(a,fesE('fesPhaseRole').value,fesE('fesIntegralBudget').value);
 try{let result;for(;;){if(seq!==fesThermalSeq)return;const x=gen.next();if(x.done){result=x.value;break}fesE('fesThermalStatus').textContent=x.value.done+'/'+x.value.total;await new Promise(r=>setTimeout(r,0))}
 if(!result.valid){fesE('fesThermalStatus').textContent=result.reason;return}fesThermalReport=result;fesE('fesThermalExport').disabled=false;fesE('fesThermalStatus').textContent=kind==='patch'?fesUi('Outward power','Potencia saliente')+' '+result.outwardPower_W+' W · '+result.area_m2+' m²':fesUi('Liquid / solid volume','Volumen líquido / sólido')+' '+result.liquid_m3+' / '+result.solid_m3+' m³ · '+fesUi('Liquid fraction','Fracción líquida')+' '+result.liquidFraction;
 }catch(e){if(seq===fesThermalSeq)fesE('fesThermalStatus').textContent=String(e?.message||e)}
}
function fesMountThermal(box){
 const el=document.createElement('details');el.className='analysisExt';el.innerHTML='<summary><strong data-fl-en="Thermal and phase quantities" data-fl-es="Magnitudes térmicas y de fase">Thermal and phase quantities</strong></summary><p class="smallnote" data-fl-en="Select an explicit scalar surface heat flux or face power and declare its sign. No inferred boundary values." data-fl-es="Selecciona un flujo térmico escalar superficial o potencia por cara explícitos y declara su signo. Sin inferir valores de frontera.">Select an explicit scalar surface heat flux or face power and declare its sign. No inferred boundary values.</p><div class="field"><label data-fl-en="Physical patches" data-fl-es="Fronteras físicas">Physical patches</label><select id="fesThermalPatches" multiple size="4"></select></div><button class="btn soft" type="button" id="fesThermalRefresh" data-fl-en="Refresh patches" data-fl-es="Actualizar fronteras">Refresh patches</button><div class="field"><label data-fl-en="Original sign convention" data-fl-es="Convención de signo original">Original sign convention</label><select id="fesThermalSign"><option value="" data-fl-en="Choose explicitly" data-fl-es="Elige explícitamente">Choose explicitly</option><option value="outward-positive" data-fl-en="Outward positive" data-fl-es="Salida positiva">Outward positive</option><option value="inward-positive" data-fl-en="Inward positive" data-fl-es="Entrada positiva">Inward positive</option></select></div><button class="btn primary" type="button" id="fesThermalPower" data-fl-en="Integrate boundary power" data-fl-es="Integrar potencia de frontera">Integrate boundary power</button><div class="field"><label data-fl-en="Two-phase fraction interpretation" data-fl-es="Interpretación de fracción bifásica">Two-phase fraction interpretation</label><select id="fesPhaseRole"><option value="" data-fl-en="Choose explicitly" data-fl-es="Elige explícitamente">Choose explicitly</option><option value="liquid" data-fl-en="Liquid volume fraction" data-fl-es="Fracción volumétrica líquida">Liquid volume fraction</option><option value="solid" data-fl-en="Solid volume fraction" data-fl-es="Fracción volumétrica sólida">Solid volume fraction</option></select></div><button class="btn primary" type="button" id="fesPhaseRun" data-fl-en="Calculate phase volumes" data-fl-es="Calcular volúmenes de fase">Calculate phase volumes</button><div class="extActions"><button class="btn soft" type="button" id="fesThermalCancel" data-fl-en="Cancel / clear" data-fl-es="Cancelar / limpiar">Cancel / clear</button><button class="btn soft" type="button" id="fesThermalExport">JSON</button></div><p class="smallnote" id="fesThermalStatus" aria-live="polite"></p>';
 box.querySelector('.extSectionBody').append(el);el.addEventListener('toggle',()=>{if(el.open){fesThermalClear();fesThermalRefresh()}});fesE('fesThermalRefresh').onclick=()=>{fesThermalClear();fesThermalRefresh()};for(const id of ['fesThermalPatches','fesThermalSign','fesPhaseRole'])fesE(id).onchange=fesThermalClear;fesE('fesThermalPower').onclick=()=>fesThermalRun('patch');fesE('fesPhaseRun').onclick=()=>fesThermalRun('phase');fesE('fesThermalCancel').onclick=fesThermalClear;fesE('fesThermalExport').onclick=()=>{if(fesThermalReport)downloadText('FoamLens_thermal_quantity.json',JSON.stringify(fesThermalReport,null,2),'application/json')};fesThermalClear()
}
function fesMountDerived(box){
 const el=document.createElement('details');el.className='analysisExt';el.innerHTML='<summary><strong data-fl-en="Derived fields &amp; temporal statistics" data-fl-es="Campos derivados y estadísticas temporales">Derived fields &amp; temporal statistics</strong></summary><p class="smallnote" data-fl-en="Read-only Field A calculations. Full output CSV with separate provenance JSON. Missing values remain blank." data-fl-es="Cálculos de solo lectura de Field A. CSV completo y JSON de procedencia separado. Los datos ausentes quedan vacíos.">Read-only Field A calculations. Full output CSV with separate provenance JSON. Missing values remain blank.</p><button class="btn soft" type="button" id="fesDerivedRefresh" data-fl-en="Refresh source fields and times" data-fl-es="Actualizar campos y tiempos">Refresh source fields and times</button><div class="field"><label data-fl-en="Second field / component" data-fl-es="Segundo campo / componente">Second field / component</label><select id="fesDerivedOther"></select></div><div class="field"><label data-fl-en="Operation A, B" data-fl-es="Operación A, B">Operation A, B</label><select id="fesDerivedOp"><option value="add">A + B</option><option value="subtract">A − B</option><option value="multiply">A × B</option><option value="divide">A / B</option></select></div><button class="btn primary" type="button" id="fesCalcRun">Calculator</button><div class="field"><label data-fl-en="Gradient axes" data-fl-es="Ejes del gradiente">Gradient axes</label><select id="fesDerivedPlane"><option value="xyz">XYZ (3D)</option><option value="xy">XY (2D)</option><option value="xz">XZ (2D)</option><option value="yz">YZ (2D)</option></select></div><button class="btn primary" type="button" id="fesGradRun">Gradient</button><div class="field"><label data-fl-en="Conductivity source" data-fl-es="Fuente de conductividad">Conductivity source</label><select id="fesKMode"><option value="constant" data-fl-en="User constant" data-fl-es="Constante del usuario">User constant</option><option value="field" data-fl-en="Second field selected above" data-fl-es="Segundo campo seleccionado arriba">Second field selected above</option><option value="material" data-fl-en="Selected material table k(T)" data-fl-es="Tabla seleccionada k(T)">Selected material table k(T)</option></select></div><div class="field"><label>k [W/(m·K)]</label><input id="fesKConstant" type="number" step="any" min="0"></div><button class="btn primary" type="button" id="fesHeatRun" data-fl-en="Fourier heat flux" data-fl-es="Flujo térmico de Fourier">Fourier heat flux</button><div class="row2"><div class="field"><label data-fl-en="From time" data-fl-es="Desde tiempo">From time</label><select id="fesDerivedStart"></select></div><div class="field"><label data-fl-en="To time" data-fl-es="Hasta tiempo">To time</label><select id="fesDerivedEnd"></select></div></div><button class="btn primary" type="button" id="fesTemporalRun" data-fl-en="Temporal statistics" data-fl-es="Estadísticas temporales">Temporal statistics</button><div class="extActions"><button class="btn soft" type="button" id="fesDerivedCancel" data-fl-en="Cancel / clear" data-fl-es="Cancelar / limpiar">Cancel / clear</button><button class="btn soft" type="button" id="fesDerivedCsv">CSV</button><button class="btn soft" type="button" id="fesDerivedMeta">JSON</button></div><p class="smallnote" id="fesDerivedStatus" aria-live="polite"></p><div class="field"><label data-fl-en="Derived preview column" data-fl-es="Columna de vista previa derivada">Derived preview column</label><select id="fesDerivedColumn"></select></div><div class="field"><label>Yaw</label><input id="fesDerivedYaw" type="range" min="-180" max="180" value="35"></div><div class="field"><label>Pitch</label><input id="fesDerivedPitch" type="range" min="-90" max="90" value="30"></div><div id="fesDerivedPreview"></div>';
 box.querySelector('.extSectionBody').append(el);const refresh=()=>{fesDerivedReset();fesDerivedGroups();fesDerivedTimes()};el.addEventListener('toggle',()=>{if(el.open)refresh()});fesE('fesDerivedRefresh').onclick=refresh;for(const id of ['fesDerivedOther','fesDerivedOp','fesDerivedPlane','fesDerivedStart','fesDerivedEnd'])fesE(id).onchange=fesDerivedReset;
 fesE('fesHeatRun').onclick=()=>fesDerivedRun('heat-flux');fesE('fesKMode').onchange=fesDerivedReset;fesE('fesKConstant').onchange=fesDerivedReset;fesE('fesDerivedColumn').onchange=fesDerivedDraw;fesE('fesDerivedYaw').oninput=fesDerivedDraw;fesE('fesDerivedPitch').oninput=fesDerivedDraw;fesE('fesCalcRun').onclick=()=>fesDerivedRun('calculator');fesE('fesGradRun').onclick=()=>fesDerivedRun('gradient');fesE('fesTemporalRun').onclick=()=>fesDerivedRun('temporal');fesE('fesDerivedCancel').onclick=()=>{fesDerivedReset();fesE('fesDerivedStatus').textContent=fesUi('Cancelled / cleared','Cancelado / limpiado')};fesE('fesDerivedCsv').onclick=()=>fesDerivedExport(true);fesE('fesDerivedMeta').onclick=()=>fesDerivedExport(false);fesDerivedReset()
}
let fesHistorySeq=0,fesHistoryResult=null;
function fesHistoryClear(){fesHistorySeq++;fesHistoryResult=null;fesE('fesHistoryStatus').textContent='';fesE('fesHistoryCSV').disabled=true;fesE('fesHistoryJSON').disabled=true;fesE('fesHistoryTable').replaceChildren()}
function fesHistoryRefresh(){
 fesHistoryClear();const a=fesSource(),c=typeof fvCase==='function'?fvCase():null,g=typeof fvCurrentFieldGroup==='function'?fvCurrentFieldGroup():null;
 for(const id of ['fesHistRho','fesHistAlpha','fesHistPower','fesHistFrom','fesHistTo','fesHistPatches'])fesE(id).replaceChildren();
 if(!a||!c||!g)return;
 for(const [id,storage] of [['fesHistRho','volume'],['fesHistAlpha','volume'],['fesHistPower','surface']]){
  const el=fesE(id),empty=document.createElement('option');empty.value='';empty.textContent=fesUi('Choose field','Elige campo');el.append(empty);
  for(const group of fvFieldGroups(c,a.source.region,'scalar',storage)){const o=document.createElement('option');o.value=group.name;o.textContent=group.name;el.append(o)}
 }
 const times=g.times.map(fesNum).filter(Number.isFinite).sort((a,b)=>a-b);
 for(const [id,last] of [['fesHistFrom',false],['fesHistTo',true]]){const el=fesE(id);for(const time of times){const o=document.createElement('option');o.value=String(time);o.textContent=time+' s';el.append(o)}if(last&&times.length)el.selectedIndex=times.length-1}
 for(const patch of a.mesh.boundaryPatches||[]){if(/^processor/i.test(patch.type||'')||/^processor/i.test(patch.name||''))continue;const o=document.createElement('option');o.value=patch.name;o.textContent=patch.name;fesE('fesHistPatches').append(o)}
}
function fesHistoryGroup(c,region,id,storage){
 const name=fesE(id).value,groups=fvFieldGroups(c,region,'scalar',storage).filter(g=>g.name===name);if(!name||groups.length!==1)throw Error('missing-or-ambiguous-field: '+id);return groups[0]
}
async function fesHistoryRun(){
 fesHistoryClear();const seq=fesHistorySeq,a=fesSource(),c=typeof fvCase==='function'?fvCase():null,g=typeof fvCurrentFieldGroup==='function'?fvCurrentFieldGroup():null,status=fesE('fesHistoryStatus');
 const alive=()=>seq===fesHistorySeq,check=()=>{const now=fesSource();if(!alive()||!now||now.mesh!==a.mesh||now.values!==a.values||JSON.stringify(now.source)!==JSON.stringify(a.source))throw Error('cancelled-or-source-changed')};
 const consume=async(gen)=>{for(;;){check();const r=gen.next();if(r.done)return r.value;status.textContent=r.value.done+'/'+r.value.total;await new Promise(r=>setTimeout(r,0))}};
 try{
 if(!a||!c||!g||g.kind!=='scalar'||a.source.component!=='value'||!fesDimIs(a.source.dimensions,[0,0,0,1,0,0,0]))throw Error('select-original-scalar-temperature-in-Field-A');
 const useMaterial=fesE('fesHistCpMode').value==='material',material=useMaterial?fesMaterialSelected():null;if(useMaterial&&!material)throw Error('select-material-table');
 const props=fesInventoryProperties({material,densityMode:fesE('fesHistDensityMode').value,cp:fesE('fesHistCp').value,reference_K:fesE('fesHistRef').value,latent:fesE('fesHistLatent').value,role:fesE('fesHistRole').value,solidDensity:fesE('fesHistSolidDensity').value,liquidDensity:fesE('fesHistLiquidDensity').value,estimate:fesE('fesHistEstimate').checked});
 if(!props)throw Error('invalid-material-properties');
 const closure=fesE('fesHistClosure').checked,sourcePower_W=fesE('fesHistSourceW').value,sign=fesE('fesHistSign').value,patches=[...fesE('fesHistPatches').selectedOptions].map(o=>o.value);
 if(closure&&(!Number.isFinite(fesNum(sourcePower_W))||!sign||!patches.length))throw Error('explicit-closure-assumptions-power-sign-and-patches-required');
 const rho=fesHistoryGroup(c,a.source.region,'fesHistRho','volume'),alpha=props.role==='none'?null:fesHistoryGroup(c,a.source.region,'fesHistAlpha','volume'),power=closure?fesHistoryGroup(c,a.source.region,'fesHistPower','surface'):null;
 const lo=fesNum(fesE('fesHistFrom').value),hi=fesNum(fesE('fesHistTo').value),times=g.times.map(fesNum).filter(t=>Number.isFinite(t)&&t>=lo&&t<=hi).sort((x,y)=>x-y),limit=fesNum(fesE('fesIntegralBudget').value);
 if(times.length<2||times[0]!==lo||times.at(-1)!==hi||new Set(times).size!==times.length)throw Error('select-two-exact-native-times');
 if([rho,alpha,power].filter(Boolean).some(f=>times.some(t=>!f.times.some(v=>fesNum(v)===t))))throw Error('missing-exact-native-field-time');
 let geometry=null;const frames=[];
 const load=async(group,time,boundary=false)=>{check();const data=await fvLoadFrameData(c,group,a.source.region,time,'value',{includeBoundary:boundary});check();return {...fesDerivedData(c,group,a.source.region,time,'value',data),boundary:data.surfaceBoundary?.values}};
 for(let i=0;i<times.length;i++){check();const time=times[i];status.textContent=fesUi('Native time','Tiempo nativo')+' '+(i+1)+'/'+times.length+' · '+time+' s';
  const T=await load(g,time),d=await load(rho,time),f=alpha?await load(alpha,time):null;
  if(!geometry||geometry.mesh!==T.mesh||geometry.meshId!==T.source.meshId)geometry=fesInventoryGeometry(T,limit);
  const inventory=await consume(fesInventory(T,d,f,props,geometry));if(!inventory.valid)throw Error(inventory.reason+' · t='+time);
  if(closure){const b=await load(power,time,true);if(b.source.meshId!==T.source.meshId)throw Error('boundary-mesh-mismatch');const q=await consume(fesPatchPower(b,patches,sign));if(!q.valid)throw Error(q.reason+' · t='+time);inventory.boundaryPower=q}
  frames.push(inventory);await new Promise(r=>setTimeout(r,0))
 }
 check();const result=fesInventoryHistory(frames,{closure,sourcePower_W});if(!result.valid)throw Error(result.reason);fesHistoryResult=result;fesE('fesHistoryCSV').disabled=false;fesE('fesHistoryJSON').disabled=false;
 const last=result.rows.at(-1);status.textContent=result.rows.length+' '+fesUi('native frames','tiempos nativos')+' · ΔM '+last.massChange_pct.toPrecision(5)+'% · ΔV '+last.volumeChange_pct.toPrecision(5)+'% · ΔH '+last.deltaEnergy_J.toPrecision(6)+' J'+(closure?' · R '+last.residual_J.toPrecision(6)+' J':'');fesHistoryDraw()
 }catch(e){if(alive())status.textContent=String(e?.message||e)}
}
function fesHistoryDraw(){
 const host=fesE('fesHistoryTable'),r=fesHistoryResult;host.replaceChildren();if(!r)return;
 const table=document.createElement('table');table.style.cssText='width:100%;font-size:11px';const head=document.createElement('tr');for(const h of ['t [s]','M [kg]','ΔV [%]','ΔH [J]','R [J]']){const cell=document.createElement('th');cell.textContent=h;head.append(cell)}table.append(head);
 for(const x of fesPreview(r.rows,50)){const tr=document.createElement('tr');for(const v of [x.time_s,x.mass_kg,x.volumeChange_pct,x.deltaEnergy_J,x.residual_J]){const cell=document.createElement('td');cell.textContent=Number.isFinite(v)?v.toPrecision(6):'—';tr.append(cell)}table.append(tr)}host.append(table);
 const note=document.createElement('p');note.className='smallnote';note.textContent=Math.min(50,r.rows.length)+'/'+r.rows.length+' '+fesUi('preview rows; full CSV unchanged.','filas de vista previa; CSV completo intacto.');host.append(note)
}
function fesHistoryExport(csv){const r=fesHistoryResult;if(!r)return;if(!csv){downloadText('FoamLens_thermal_inventory.json',JSON.stringify(r,null,2),'application/json');return}const keys=Object.keys(r.rows[0]),lines=[keys.join(','),...r.rows.map(x=>keys.map(k=>Number.isFinite(x[k])?x[k]:'').join(','))];downloadText('FoamLens_thermal_inventory.csv',lines.join('\n')+'\n','text/csv')}
function fesMountHistory(box){
 const el=document.createElement('details');el.className='analysisExt';el.innerHTML='<summary><strong data-fl-en="Transient mass / energy / shrinkage" data-fl-es="Masa / energía / contracción transitoria">Transient mass / energy / shrinkage</strong></summary><p class="smallnote" data-fl-en="Load original scalar temperature in Field A. Exact native times, original density field, constant or table Cp and constant latent heat. Diagnostic enthalpy inventory, not solver total energy." data-fl-es="Carga temperatura escalar original en Field A. Tiempos nativos exactos, campo de densidad original, Cp constante o tabulado y calor latente constante. Inventario diagnóstico de entalpía, no energía total del solver.">Load original scalar temperature in Field A. Exact native times, original density field, constant or table Cp and constant latent heat. Diagnostic enthalpy inventory, not solver total energy.</p><button class="btn soft" type="button" id="fesHistRefresh" data-fl-en="Refresh source" data-fl-es="Actualizar fuente">Refresh source</button>'+
 '<div class="field"><label>ρ [kg/m³]</label><select id="fesHistRho"></select></div><div class="field"><label data-fl-en="Cp source" data-fl-es="Fuente de Cp">Cp source</label><select id="fesHistCpMode"><option value="constant" data-fl-en="Constant" data-fl-es="Constante">Constant</option><option value="material" data-fl-en="Selected material table Cp(T)" data-fl-es="Tabla seleccionada Cp(T)">Selected material table Cp(T)</option></select></div><div class="row2"><div class="field"><label>Cp [J/(kg·K)]</label><input id="fesHistCp" type="number" step="any"></div><div class="field"><label>Tref [K]</label><input id="fesHistRef" type="number" step="any"></div></div>'+
 '<div class="field"><label data-fl-en="Phase fraction field" data-fl-es="Campo de fracción de fase">Phase fraction field</label><select id="fesHistAlpha"></select></div><div class="field"><label data-fl-en="Fraction interpretation" data-fl-es="Interpretación de fracción">Fraction interpretation</label><select id="fesHistRole"><option value="none" data-fl-en="No latent term" data-fl-es="Sin término latente">No latent term</option><option value="liquid-mass" data-fl-en="Liquid mass fraction" data-fl-es="Fracción másica líquida">Liquid mass fraction</option><option value="solid-mass" data-fl-en="Solid mass fraction" data-fl-es="Fracción másica sólida">Solid mass fraction</option><option value="liquid-volume" data-fl-en="Liquid volume fraction" data-fl-es="Fracción volumétrica líquida">Liquid volume fraction</option><option value="solid-volume" data-fl-en="Solid volume fraction" data-fl-es="Fracción volumétrica sólida">Solid volume fraction</option></select></div><div class="field"><label>L [J/kg]</label><input id="fesHistLatent" type="number" step="any" value="0"></div>'+
 '<div class="field"><label data-fl-en="Phase density source" data-fl-es="Fuente de densidades de fase">Phase density source</label><select id="fesHistDensityMode"><option value="constant" data-fl-en="Constant" data-fl-es="Constante">Constant</option><option value="table" data-fl-en="Selected Cp material table phase densities" data-fl-es="Densidades de fase de la tabla Cp seleccionada">Selected Cp material table phase densities</option></select></div><div class="row2"><div class="field"><label>ρ solid [kg/m³]</label><input id="fesHistSolidDensity" type="number" step="any"></div><div class="field"><label>ρ liquid [kg/m³]</label><input id="fesHistLiquidDensity" type="number" step="any"></div></div><label class="inlineCheck"><input id="fesHistEstimate" type="checkbox"> <span data-fl-en="Estimate phase-density volume (not mesh motion)" data-fl-es="Estimar volumen por densidades (no movimiento de malla)">Estimate phase-density volume (not mesh motion)</span></label>'+
 '<div class="row2"><div class="field"><label data-fl-en="From" data-fl-es="Desde">From</label><select id="fesHistFrom"></select></div><div class="field"><label data-fl-en="To" data-fl-es="Hasta">To</label><select id="fesHistTo"></select></div></div>'+
 '<label class="inlineCheck"><input id="fesHistClosure" type="checkbox"> <span data-fl-en="Diagnostic closure: I declare closed mass, all relevant heat boundaries, no omitted work/energy terms" data-fl-es="Cierre diagnóstico: declaro masa cerrada, todas las fronteras térmicas relevantes y ausencia de trabajo/términos omitidos">Diagnostic closure: I declare closed mass, all relevant heat boundaries, no omitted work/energy terms</span></label><div class="field"><label data-fl-en="Boundary heat flux / power field" data-fl-es="Campo de flujo / potencia térmica de frontera">Boundary heat flux / power field</label><select id="fesHistPower"></select></div><div class="field"><label data-fl-en="External heat patches" data-fl-es="Fronteras térmicas externas">External heat patches</label><select id="fesHistPatches" multiple size="4"></select></div><div class="field"><label data-fl-en="Original sign" data-fl-es="Signo original">Original sign</label><select id="fesHistSign"><option value="">—</option><option value="outward-positive" data-fl-en="Outward positive" data-fl-es="Salida positiva">Outward positive</option><option value="inward-positive" data-fl-en="Inward positive" data-fl-es="Entrada positiva">Inward positive</option></select></div><div class="field"><label data-fl-en="Constant net internal heat source [W], explicitly enter 0 if absent" data-fl-es="Fuente interna neta constante [W], escribe 0 si no existe">Constant net internal heat source [W], explicitly enter 0 if absent</label><input id="fesHistSourceW" type="number" step="any"></div>'+
 '<div class="extActions"><button class="btn primary" id="fesHistRun" type="button" data-fl-en="Run history" data-fl-es="Calcular historia">Run history</button><button class="btn soft" id="fesHistCancel" type="button" data-fl-en="Cancel / clear" data-fl-es="Cancelar / limpiar">Cancel / clear</button><button class="btn soft" id="fesHistoryCSV" type="button">CSV</button><button class="btn soft" id="fesHistoryJSON" type="button">JSON</button></div><p class="smallnote" id="fesHistoryStatus" aria-live="polite"></p><div id="fesHistoryTable" style="overflow:auto"></div>';
 box.querySelector('.extSectionBody').append(el);el.addEventListener('toggle',()=>{if(el.open)fesHistoryRefresh()});fesE('fesHistRefresh').onclick=fesHistoryRefresh;for(const e of el.querySelectorAll('select,input'))e.onchange=fesHistoryClear;fesE('fesHistRun').onclick=fesHistoryRun;fesE('fesHistCancel').onclick=fesHistoryClear;fesE('fesHistoryCSV').onclick=()=>fesHistoryExport(true);fesE('fesHistoryJSON').onclick=()=>fesHistoryExport(false);fesHistoryClear()
}
let fesMaterials=[],fesMaterialFileSeq=0;
function fesMaterialSelected(){return fesMaterials.find(m=>m.name===fesE('fesMatSelect')?.value)||null}
function fesMaterialStatus(message){fesE('fesMatStatus').textContent=message}
function fesMaterialList(){
 const sel=fesE('fesMatSelect'),old=sel.value;sel.replaceChildren();for(const m of fesMaterials){const o=document.createElement('option');o.value=m.name;o.textContent=m.name;sel.append(o)}if([...sel.options].some(o=>o.value===old))sel.value=old;
 const m=fesMaterialSelected(),prop=fesE('fesMatProperty'),prior=prop.value;prop.replaceChildren();for(const k of fesMaterialKeys)if(m?.properties[k]){const o=document.createElement('option');o.value=k;o.textContent=k+'(T)';prop.append(o)}if([...prop.options].some(o=>o.value===prior))prop.value=prior;
 fesE('fesMatApply').disabled=!m;fesE('fesMatRemove').disabled=!m;fesE('fesMatExport').disabled=!m;fesE('fesMatFoam').disabled=!m;fesMaterialStatus(m?m.name+' · '+m.temperature_K.length+' '+fesUi('temperatures','temperaturas')+' · '+m.temperature_K[0]+'–'+m.temperature_K.at(-1)+' K · '+Object.keys(m.properties).join(', ')+' · '+m.cpKind:fesUi('No local materials.','Sin materiales locales.'))
}
function fesMaterialPersist(next){try{localStorage.setItem('foamlens.material.library.v1',JSON.stringify(next))}catch{return false}fesMaterials=next;return true}
function fesMaterialChanged(){fesDerivedReset();fesHistoryClear();fesMaterialList()}
async function fesMaterialImport(){
 const seq=++fesMaterialFileSeq,file=fesE('fesMatFile').files?.[0];if(!file){fesMaterialStatus('choose-file');return}
 const options={name:fesE('fesMatName').value,file:file.name,delimiter:fesE('fesMatDelimiter').value==='tab'?'\t':fesE('fesMatDelimiter').value,decimal:fesE('fesMatDecimal').value,temperatureUnit:fesE('fesMatUnit').value,cpKind:fesE('fesMatCpKind').value,mapping:Object.fromEntries(['temperature',...fesMaterialKeys].map(k=>[k,fesE('fesMatMap'+k).value]))};
 try{const input=await file.text();if(seq!==fesMaterialFileSeq)return;let material;
 if(/\.json$/i.test(file.name)){material=fesMaterial(JSON.parse(input));if(!material)throw Error('invalid-material-json')}
 else{const r=fesParseMaterialCSV(input,options);if(!r.valid)throw Error(r.reason);material=r.material}
 if(fesMaterials.some(m=>m.name===material.name))throw Error('material-name-already-exists');
 if(!fesMaterialPersist([...fesMaterials,material]))throw Error('local-storage-unavailable-or-full; material not saved');
 fesMaterialChanged();fesE('fesMatSelect').value=material.name;fesMaterialList();
 }catch(e){if(seq===fesMaterialFileSeq)fesMaterialStatus(String(e?.message||e))}
}
function fesMountMaterials(box){
 const el=document.createElement('details');el.className='analysisExt';el.innerHTML='<summary><strong data-fl-en="Thermophysical material library" data-fl-es="Biblioteca de materiales termofísicos">Thermophysical material library</strong></summary><p class="smallnote" data-fl-en="Import CSV / TSV from JMatPro or another source after exporting a header row and converting property values to the stated SI units. Use exact column names; blank means absent. No automatic unit guessing or extrapolation." data-fl-es="Importa CSV / TSV de JMatPro u otra fuente después de exportar encabezados y convertir propiedades a las unidades SI indicadas. Usa nombres exactos de columnas; vacío significa ausente. Sin inferencia de unidades ni extrapolación.">Import CSV / TSV from JMatPro or another source after exporting a header row and converting property values to the stated SI units. Use exact column names; blank means absent. No automatic unit guessing or extrapolation.</p>'+
 '<div class="field"><label data-fl-en="Material name" data-fl-es="Nombre del material">Material name</label><input id="fesMatName" type="text"></div><div class="field"><label>CSV / TSV / FoamLens JSON</label><input type="file" id="fesMatFile" accept=".csv,.tsv,.txt,.json"></div>'+
 '<div class="row2"><div class="field"><label data-fl-en="Delimiter" data-fl-es="Separador">Delimiter</label><select id="fesMatDelimiter"><option value=",">,</option><option value=";">;</option><option value="tab">TAB</option></select></div><div class="field"><label data-fl-en="Decimal" data-fl-es="Decimal">Decimal</label><select id="fesMatDecimal"><option value=".">.</option><option value=",">,</option></select></div></div><div class="field"><label data-fl-en="Original temperature unit" data-fl-es="Unidad de temperatura original">Original temperature unit</label><select id="fesMatUnit"><option value="K">K</option><option value="C">°C</option></select></div>'+
 '<div class="field"><label data-fl-en="Cp interpretation" data-fl-es="Interpretación de Cp">Cp interpretation</label><select id="fesMatCpKind"><option value="effective-or-unknown" data-fl-en="Effective / unknown (no added latent heat)" data-fl-es="Efectivo / desconocido (sin añadir calor latente)">Effective / unknown (no added latent heat)</option><option value="sensible-only" data-fl-en="Sensible only (explicitly confirmed)" data-fl-es="Solo sensible (confirmado explícitamente)">Sensible only (explicitly confirmed)</option></select></div>'+
 [['temperature','T','Temperature'],['cp','','Cp [J/(kg·K)]'],['k','','k [W/(m·K)]'],['rho','','ρ [kg/m³]'],['rhoSolid','','ρ solid [kg/m³]'],['rhoLiquid','','ρ liquid [kg/m³]']].map(([key,v,label])=>'<div class="field"><label>'+label+'</label><input type="text" id="fesMatMap'+key+'" value="'+v+'"></div>').join('')+
 '<button class="btn primary" type="button" id="fesMatImport" data-fl-en="Import and save locally" data-fl-es="Importar y guardar localmente">Import and save locally</button><div class="field"><label data-fl-en="Saved material" data-fl-es="Material guardado">Saved material</label><select id="fesMatSelect"></select></div><div class="field"><label data-fl-en="Property to derive from loaded temperature" data-fl-es="Propiedad a derivar de la temperatura cargada">Property to derive from loaded temperature</label><select id="fesMatProperty"></select></div><div class="extActions"><button type="button" class="btn primary" id="fesMatApply" data-fl-en="Calculate property field" data-fl-es="Calcular campo de propiedad">Calculate property field</button><button type="button" class="btn soft" id="fesMatExport">JSON</button><button type="button" class="btn soft" id="fesMatFoam" data-fl-en="OpenFOAM table pairs" data-fl-es="Pares de tabla OpenFOAM">OpenFOAM table pairs</button><button type="button" class="btn soft" id="fesMatRemove" data-fl-en="Remove material" data-fl-es="Quitar material">Remove material</button></div><p class="smallnote" id="fesMatStatus" aria-live="polite"></p>';
 box.querySelector('.extSectionBody').append(el);
 try{const raw=JSON.parse(localStorage.getItem('foamlens.material.library.v1')||'[]');if(Array.isArray(raw))fesMaterials=raw.map(fesMaterial).filter(Boolean)}catch{}
 fesE('fesMatImport').onclick=fesMaterialImport;fesE('fesMatSelect').onchange=fesMaterialChanged;fesE('fesMatProperty').onchange=fesDerivedReset;fesE('fesMatApply').onclick=()=>fesDerivedRun('material');fesE('fesMatExport').onclick=()=>{const m=fesMaterialSelected();if(m)downloadText('FoamLens_material.json',JSON.stringify(m,null,2),'application/json')};fesE('fesMatFoam').onclick=()=>{const key=fesE('fesMatProperty').value,txt=fesMaterialFoamPairs(fesMaterialSelected(),key);if(txt)downloadText('FoamLens_'+key+'_tablePairs',txt,'text/plain')};fesE('fesMatRemove').onclick=()=>{const m=fesMaterialSelected();if(m&&fesMaterialPersist(fesMaterials.filter(x=>x!==m)))fesMaterialChanged();else fesMaterialStatus('local-storage-unavailable')};fesMaterialList()
}
let fesInterfaceSeq=0,fesInterfaceResult=null;
function fesInterfaceClear(){fesInterfaceSeq++;fesInterfaceResult=null;fesE('fesInterfaceStatus').textContent='';fesE('fesInterfaceCsv').disabled=true;fesE('fesInterfaceJson').disabled=true;fesE('fesInterfaceRows').replaceChildren()}
function fesInterfaceRefresh(){
 fesInterfaceClear();const a=fesSource(),g=typeof fvCurrentFieldGroup==='function'?fvCurrentFieldGroup():null;
 const patch=fesE('fesInterfacePatches');patch.replaceChildren();for(const p of a?.mesh?.boundaryPatches||[]){if(/^processor/i.test(p.name)||/^processor/i.test(p.type||''))continue;const o=document.createElement('option');o.value=p.name;o.textContent=p.name;patch.append(o)}
 const times=(g?.times||[]).map(fesNum).filter(Number.isFinite).sort((a,b)=>a-b);
 for(const [id,last] of [['fesInterfaceFrom',false],['fesInterfaceTo',true]]){const e=fesE(id);e.replaceChildren();for(const t of times){const o=document.createElement('option');o.value=String(t);o.textContent=t+' s';e.append(o)}if(last&&times.length)e.selectedIndex=times.length-1}
}
async function fesInterfaceRun(history){
 fesInterfaceClear();const seq=fesInterfaceSeq,a=fesSource(),c=typeof fvCase==='function'?fvCase():null,g=typeof fvCurrentFieldGroup==='function'?fvCurrentFieldGroup():null,status=fesE('fesInterfaceStatus');
 const check=()=>{const now=fesSource();if(seq!==fesInterfaceSeq||!now||now.mesh!==a.mesh||now.values!==a.values||JSON.stringify(now.source)!==JSON.stringify(a.source))throw Error('cancelled-or-source-changed')};
 try{
  if(!a||!c||!g||g.kind!=='scalar')throw Error('select-original-scalar-fraction-in-Field-A');
  const cfg=fesInterfaceConfig({role:fesE('fesInterfaceRole').value,threshold:fesE('fesInterfaceThreshold').value,patches:[...fesE('fesInterfacePatches').selectedOptions].map(x=>x.value),sealed:fesE('fesInterfaceSealed').checked});if(!cfg)throw Error('explicit-role-threshold-and-openings-or-sealed-declaration-required');
  const lo=fesNum(fesE('fesInterfaceFrom').value),hi=fesNum(fesE('fesInterfaceTo').value),times=history?g.times.map(fesNum).filter(t=>Number.isFinite(t)&&t>=lo&&t<=hi).sort((x,y)=>x-y):[a.source.time_s];
  if(!times.length||new Set(times).size!==times.length||(history&&(times.length<2||times[0]!==lo||times.at(-1)!==hi)))throw Error('select-exact-native-time-range');
  const items=[],limit=fesNum(fesE('fesIntegralBudget').value);let geometry=null;
  for(let k=0;k<times.length;k++){check();const t=times[k];status.textContent=(k+1)+'/'+times.length+' · '+t+' s';
   const frame=history?fesDerivedData(c,g,a.source.region,t,'value',await fvLoadFrameData(c,g,a.source.region,t,'value',{includeBoundary:false})):a;check();
   if(!geometry||geometry.mesh!==frame.mesh||geometry.meshId!==frame.source.meshId)geometry=fesInventoryGeometry(frame,limit);
   const gen=fesInterface(frame,cfg,geometry);let result;for(;;){check();const r=gen.next();if(r.done){result=r.value;break}status.textContent=(k+1)+'/'+times.length+' · '+r.value.done+'/'+r.value.total;await new Promise(r=>setTimeout(r,0))}
   if(!result.valid)throw Error(result.reason+' · t='+t);const {labels,...summary}=result;items.push(summary);await new Promise(r=>setTimeout(r,0))
  }
  check();const result=fesInterfaceHistory(items);if(!result)throw Error('inconsistent-interface-history');fesInterfaceResult=result;fesE('fesInterfaceCsv').disabled=false;fesE('fesInterfaceJson').disabled=false;
  const last=result.rows.at(-1);status.textContent='t='+last.time_s+' s · A ≈ '+last.interfaceArea_m2.toPrecision(6)+' m² · V '+last.fractionVolumeIntegral_m3.toPrecision(6)+' m³'+(cfg.occupancy?' · '+fesUi('Disconnected candidates','Candidatos desconectados')+' '+last.isolatedComponents:'');
  const host=fesE('fesInterfaceRows'),table=document.createElement('table');table.style.cssText='width:100%;font-size:11px';const tr=document.createElement('tr');for(const h of ['t [s]','A [m²]','V [m³]','Disconnected']){const th=document.createElement('th');th.textContent=h;tr.append(th)}table.append(tr);
  for(const row of fesPreview(result.rows,50)){const tr=document.createElement('tr');for(const v of [row.time_s,row.interfaceArea_m2,row.fractionVolumeIntegral_m3,row.isolatedComponents]){const td=document.createElement('td');td.textContent=Number.isFinite(v)?v.toPrecision(6):'—';tr.append(td)}table.append(tr)}host.append(table);
 }catch(e){if(seq===fesInterfaceSeq)status.textContent=String(e?.message||e)}
}
function fesInterfaceExport(csv){const r=fesInterfaceResult;if(!r)return;if(!csv){downloadText('FoamLens_interface_history.json',JSON.stringify(r,null,2),'application/json');return}const keys=Object.keys(r.rows[0]).filter(k=>k!=='interfaceCentroid_m'),lines=[keys.join(','),...r.rows.map(x=>keys.map(k=>Number.isFinite(x[k])?x[k]:'').join(','))];downloadText('FoamLens_interface_history.csv',lines.join('\n')+'\n','text/csv')}
function fesMountInterfaces(box){
 const el=document.createElement('details');el.className='analysisExt';el.innerHTML='<summary><strong data-fl-en="Interfaces, free surface and void candidates" data-fl-es="Interfaces, superficie libre y candidatos de cavidad">Interfaces, free surface and void candidates</strong></summary><p class="smallnote" data-fl-en="Load an explicit scalar fraction in Field A. Metal/gas occupancy is NOT liquid/solid fraction. Discrete internal-face interface, not a reconstructed iso-surface. Declare physical openings or sealed domain for void connectivity." data-fl-es="Carga una fracción escalar explícita en Field A. Ocupación metal/gas NO es fracción líquido/sólido. Interfaz discreta de caras internas, no isosuperficie reconstruida. Declara aberturas físicas o dominio sellado para conectividad de cavidades.">Load an explicit scalar fraction in Field A. Metal/gas occupancy is NOT liquid/solid fraction. Discrete internal-face interface, not a reconstructed iso-surface. Declare physical openings or sealed domain for void connectivity.</p><button type="button" class="btn soft" id="fesInterfaceRefresh" data-fl-en="Refresh source" data-fl-es="Actualizar fuente">Refresh source</button><div class="field"><label data-fl-en="Field interpretation" data-fl-es="Interpretación del campo">Field interpretation</label><select id="fesInterfaceRole"><option value="">—</option><option value="metal-volume" data-fl-en="Metal occupancy (volume fraction)" data-fl-es="Ocupación de metal (volumétrica)">Metal occupancy (volume fraction)</option><option value="gas-volume" data-fl-en="Gas occupancy (volume fraction)" data-fl-es="Ocupación de gas (volumétrica)">Gas occupancy (volume fraction)</option><option value="liquid-fraction" data-fl-en="Liquid fraction — front only" data-fl-es="Fracción líquida — solo frente">Liquid fraction — front only</option><option value="solid-fraction" data-fl-en="Solid fraction — front only" data-fl-es="Fracción sólida — solo frente">Solid fraction — front only</option></select></div><div class="field"><label data-fl-en="Normalized gas or liquid threshold" data-fl-es="Umbral normalizado gas o líquido">Normalized gas or liquid threshold</label><input type="number" id="fesInterfaceThreshold" min="0" max="1" step="any" value="0.5"></div><div class="field"><label data-fl-en="Declared physical openings (occupancy only)" data-fl-es="Aberturas físicas declaradas (solo ocupación)">Declared physical openings (occupancy only)</label><select multiple size="4" id="fesInterfacePatches"></select></div><label class="inlineCheck"><input type="checkbox" id="fesInterfaceSealed"> <span data-fl-en="No openings: explicitly sealed domain" data-fl-es="Sin aberturas: dominio explícitamente sellado">No openings: explicitly sealed domain</span></label><div class="row2"><div class="field"><label data-fl-en="From" data-fl-es="Desde">From</label><select id="fesInterfaceFrom"></select></div><div class="field"><label data-fl-en="To" data-fl-es="Hasta">To</label><select id="fesInterfaceTo"></select></div></div><div class="extActions"><button type="button" class="btn primary" id="fesInterfaceCurrent" data-fl-en="Current frame" data-fl-es="Cuadro actual">Current frame</button><button type="button" class="btn primary" id="fesInterfaceHistory" data-fl-en="Native history" data-fl-es="Historia nativa">Native history</button><button type="button" class="btn soft" id="fesInterfaceCancel" data-fl-en="Cancel / clear" data-fl-es="Cancelar / limpiar">Cancel / clear</button><button type="button" class="btn soft" id="fesInterfaceCsv">CSV</button><button type="button" class="btn soft" id="fesInterfaceJson">JSON</button></div><p class="smallnote" id="fesInterfaceStatus" aria-live="polite"></p><div id="fesInterfaceRows" style="overflow:auto"></div>';
 box.querySelector('.extSectionBody').append(el);el.addEventListener('toggle',()=>{if(el.open)fesInterfaceRefresh()});fesE('fesInterfaceRefresh').onclick=fesInterfaceRefresh;for(const e of el.querySelectorAll('input,select'))e.onchange=fesInterfaceClear;fesE('fesInterfaceCurrent').onclick=()=>fesInterfaceRun(false);fesE('fesInterfaceHistory').onclick=()=>fesInterfaceRun(true);fesE('fesInterfaceCancel').onclick=fesInterfaceClear;fesE('fesInterfaceCsv').onclick=()=>fesInterfaceExport(true);fesE('fesInterfaceJson').onclick=()=>fesInterfaceExport(false);fesInterfaceClear()
}
let fesReportEntries=[],fesReportScope=null;
function fesReportCandidates(){
 return [['selection',fesUi('Entity selection','Selección de entidades'),fesResult],['clip',fesUi('Exterior clip','Recorte exterior'),fesClipResult],['physical',fesUi('Integration / resampling','Integración / remuestreo'),fesPhysicalResult],['derived',fesUi('Derived field','Campo derivado'),fesDerivedResult],['thermal',fesUi('Thermal / phase quantities','Magnitudes térmicas / de fase'),fesThermalReport],['history',fesUi('Transient inventory','Inventario transitorio'),fesHistoryResult],['interface',fesUi('Interface history','Historia de interfaz'),fesInterfaceResult]]
}
function fesReportRefresh(){
 const sel=fesE('fesReportCandidate'),old=sel.value;sel.replaceChildren();for(const [id,name,r] of fesReportCandidates()){const o=document.createElement('option');o.value=id;o.textContent=name+(r?' ✓':' —');o.disabled=!r;sel.append(o)}if([...sel.options].some(o=>o.value===old&&!o.disabled))sel.value=old;
 const host=fesE('fesReportRows');host.replaceChildren();for(let i=0;i<fesReportEntries.length;i++){const item=fesReportEntries[i],row=document.createElement('div');row.style.cssText='display:flex;gap:6px;align-items:center;flex-wrap:wrap';const label=document.createElement('span');label.style.cssText='flex:1;min-width:0;overflow-wrap:anywhere';let lo=Infinity,hi=-Infinity;for(const s of item.sources){lo=Math.min(lo,s.time_s);hi=Math.max(hi,s.time_s)}label.textContent=(i+1)+'. '+item.label+' · '+item.sources[0].field+' · '+lo+(lo!==hi?'–'+hi:'')+' s';const b=document.createElement('button');b.type='button';b.className='btn tiny';b.textContent=fesUi('Remove','Quitar');b.onclick=()=>{fesReportEntries.splice(i,1);if(!fesReportEntries.length)fesReportScope=null;fesReportRefresh()};row.append(label,b);host.append(row)}
 const n=fesReportEntries.length;fesE('fesReportJSON').disabled=!n;fesE('fesReportHTML').disabled=!n;fesE('fesReportStatus').textContent=n?fesReportScope.caseName+' / '+fesReportScope.region+' · '+n+' '+fesUi('captured snapshots','capturas guardadas'):fesUi('No captured snapshots.','Sin capturas guardadas.')
}
function fesReportCapture(){
 const a=fesSource(),id=fesE('fesReportCandidate').value,r=fesReportCandidates().find(x=>x[0]===id)?.[2],scope=fesReportScope||a?.source;
 if(!a||!scope||a.source.caseId!==scope.caseId||a.source.region!==scope.region){fesE('fesReportStatus').textContent=fesUi('Return to the report case/region or clear the report.','Regresa al caso/región del informe o limpia el informe.');return}
 const snapshot=fesReportSnapshot(r,scope);if(!snapshot){fesE('fesReportStatus').textContent=fesUi('No compatible result snapshot. Run the selected operation first.','No hay captura compatible. Ejecuta primero la operación seleccionada.');return}
 // Exact duplicate captures are unnecessary; distinct times/parameters remain separate.
 if(fesReportEntries.some(x=>JSON.stringify(x)===JSON.stringify(snapshot))){fesE('fesReportStatus').textContent=fesUi('Snapshot already captured.','Captura ya guardada.');return}
 if(!fesReportScope)fesReportScope={caseId:scope.caseId,caseName:scope.caseName,region:scope.region};
 fesReportEntries.push(snapshot);fesReportRefresh()
}
function fesReportExport(html){
 const r=fesReportManifest(fesReportScope,fesReportEntries,fesE('fesReportTitle').value,fesE('fesReportNotes').value,new Date().toISOString());if(!r)return;
 downloadText(html?'FoamLens_scientific_report.html':'FoamLens_scientific_report.json',html?fesReportHtml(r):JSON.stringify(r,null,2),html?'text/html':'application/json')
}
function fesMountReport(box){
 const el=document.createElement('details');el.className='analysisExt';el.innerHTML='<summary><strong data-fl-en="Scientific report / session snapshots" data-fl-es="Informe científico / capturas de sesión">Scientific report / session snapshots</strong></summary><p class="smallnote" data-fl-en="Capture explicitly selected completed results, one primary case/region per report. Previous physical times are retained and labeled. Save companion full operation exports separately." data-fl-es="Captura resultados completados seleccionados explícitamente, un caso/región principal por informe. Se conservan y etiquetan los tiempos físicos anteriores. Guarda por separado las exportaciones completas de cada operación.">Capture explicitly selected completed results, one primary case/region per report. Previous physical times are retained and labeled. Save companion full operation exports separately.</p><div class="field"><label data-fl-en="Title" data-fl-es="Título">Title</label><input id="fesReportTitle" type="text" value="FoamLens scientific report"></div><div class="field"><label data-fl-en="Research notes" data-fl-es="Notas de investigación">Research notes</label><textarea id="fesReportNotes" rows="3"></textarea></div><div class="field"><label data-fl-en="Latest operation result" data-fl-es="Último resultado de operación">Latest operation result</label><select id="fesReportCandidate"></select></div><div class="extActions"><button type="button" class="btn soft" id="fesReportRefresh" data-fl-en="Refresh results" data-fl-es="Actualizar resultados">Refresh results</button><button type="button" class="btn primary" id="fesReportCapture" data-fl-en="Capture snapshot" data-fl-es="Capturar resultado">Capture snapshot</button></div><div id="fesReportRows" style="display:grid;gap:5px;max-height:240px;overflow:auto"></div><div class="extActions"><button type="button" class="btn soft" id="fesReportClear" data-fl-en="Clear report" data-fl-es="Limpiar informe">Clear report</button><button type="button" class="btn soft" id="fesReportJSON">JSON</button><button type="button" class="btn soft" id="fesReportHTML">HTML</button></div><p class="smallnote" id="fesReportStatus" aria-live="polite"></p>';
 box.querySelector('.extSectionBody').append(el);el.addEventListener('toggle',()=>{if(el.open)fesReportRefresh()});fesE('fesReportRefresh').onclick=fesReportRefresh;fesE('fesReportCapture').onclick=fesReportCapture;fesE('fesReportClear').onclick=()=>{fesReportEntries=[];fesReportScope=null;fesReportRefresh()};fesE('fesReportJSON').onclick=()=>fesReportExport(false);fesE('fesReportHTML').onclick=()=>fesReportExport(true);fesReportRefresh()
}
function fesOrganizeTools(box,selectionNodes){
 const body=box.querySelector('.extSectionBody'),selection=document.createElement('div');selection.append(...selectionNodes);
 const groups=[{id:'selection',en:'Selection & filters',es:'Selección y filtros',nodes:[selection]},
 {id:'physical',en:'Integration & comparison',es:'Integración y comparación',nodes:[fesE('fesPhysicalScope').closest('details')]},
 {id:'derived',en:'Derived fields',es:'Campos derivados',nodes:[fesE('fesDerivedOther').closest('details')]},
 {id:'thermal',en:'Thermal & solidification',es:'Térmica y solidificación',nodes:[fesE('fesThermalPatches').closest('details'),fesE('fesHistRho').closest('details')]},
 {id:'materials',en:'Materials',es:'Materiales',nodes:[fesE('fesMatSelect').closest('details')]},
 {id:'interfaces',en:'Interfaces & voids',es:'Interfaces y cavidades',nodes:[fesE('fesInterfaceRole').closest('details')]},
 {id:'report',en:'Scientific report',es:'Informe científico',nodes:[fesE('fesReportCandidate').closest('details')]}];
 // Extra filters are a direct wrapper appended by fesMountExtra; resolve by containment, not nesting depth.
 groups[0].nodes[1]=[...body.children].find(n=>n.contains(fesE('fesStages')));
 const nav=document.createElement('div');nav.className='field';const title=document.createElement('label');title.textContent=fesUi('Analysis tools','Herramientas de análisis');title.dataset.flEn='Analysis tools';title.dataset.flEs='Herramientas de análisis';const sel=document.createElement('select');sel.id='fesToolCategory';sel.setAttribute('aria-label',title.textContent);nav.append(title,sel);body.prepend(nav);
 for(const g of groups){const pane=document.createElement('div');pane.id='fesToolGroup_'+g.id;for(const n of g.nodes)if(n&&n!==body)pane.append(n);g.pane=pane;body.append(pane);const o=document.createElement('option');o.value=g.id;o.textContent=fesUi(g.en,g.es);o.dataset.flEn=g.en;o.dataset.flEs=g.es;sel.append(o)}
 const show=()=>{for(const g of groups){g.pane.hidden=g.id!==sel.value;g.pane.style.display=g.pane.hidden?'none':''}if(sel.value==='report')fesReportRefresh()};
 try{const prior=localStorage.getItem('foamlens.analysis.category.v1');if(groups.some(g=>g.id===prior))sel.value=prior}catch{}sel.onchange=()=>{show();try{localStorage.setItem('foamlens.analysis.category.v1',sel.value)}catch{}};show()
}
function fesMount(){
 if(fesE('fesPanel'))return true;const host=fesE('fieldViewControls');if(!host)return false;
 const box=document.createElement('details');box.className='analysisExt';box.id='fesPanel';
 box.innerHTML='<summary class="analysisExtHead"><strong data-fl-en="Scientific analysis · Field A" data-fl-es="Análisis científico · Field A">Scientific analysis · Field A</strong></summary><div class="extSectionBody"><p class="smallnote" data-fl-en="Read-only snapshot of loaded Field A. Select whole entities by representative coordinates; not geometric clipping or volume integration." data-fl-es="Captura de solo lectura de Field A. Selecciona entidades completas por coordenadas representativas; no es recorte geométrico ni integración de volumen.">Read-only snapshot of loaded Field A. Select whole entities by representative coordinates; not geometric clipping or volume integration.</p>'+
 '<div class="field"><label data-fl-en="Selection" data-fl-es="Selección">Selection</label><select id="fesMode"><option value="all" data-fl-en="All measured entities" data-fl-es="Todas las entidades medidas">All measured entities</option><option value="threshold">Threshold</option><option value="box">XYZ Box</option><option value="plane" data-fl-en="Plane side (whole entities)" data-fl-es="Lado del plano (entidades completas)">Plane side (whole entities)</option><option value="ids" data-fl-en="Entity IDs" data-fl-es="IDs de entidades">Entity IDs</option></select></div>'+
 '<label class="inlineCheck"><input type="checkbox" id="fesThreshold"> <span data-fl-en="Also restrict value range" data-fl-es="Limitar también rango de valor">Also restrict value range</span></label>'+
 '<div id="fesThresholdFields" class="row2"><div class="field"><label>Min</label><input id="fesMin" type="number" step="any"></div><div class="field"><label>Max</label><input id="fesMax" type="number" step="any"></div></div>'+
 '<div id="fesBoxFields">'+['X','Y','Z'].map(k=>'<div class="row2"><div class="field"><label>'+k+' min [m]</label><input id="fes'+k+'0" type="number" step="any"></div><div class="field"><label>'+k+' max [m]</label><input id="fes'+k+'1" type="number" step="any"></div></div>').join('')+'</div>'+
 '<div id="fesPlaneFields"><div class="row2"><div class="field"><label data-fl-en="Axis" data-fl-es="Eje">Axis</label><select id="fesAxis"><option>x</option><option>y</option><option>z</option></select></div><div class="field"><label data-fl-en="Side" data-fl-es="Lado">Side</label><select id="fesSide"><option value="above">≥</option><option value="below">≤</option></select></div></div><div class="field"><label data-fl-en="Plane coordinate [m]" data-fl-es="Coordenada del plano [m]">Plane coordinate [m]</label><input id="fesOffset" type="number" step="any"></div></div>'+
 '<div id="fesIdFields" class="field"><label data-fl-en="Loaded mesh IDs (comma-separated)" data-fl-es="IDs de la malla cargada (separados por comas)">Loaded mesh IDs (comma-separated)</label><textarea id="fesIds" rows="2"></textarea></div>'+
 '<div class="field"><label data-fl-en="Maximum selected rows" data-fl-es="Máximo de filas seleccionadas">Maximum selected rows</label><input id="fesLimit" type="number" min="1" max="100000" value="100000"></div>'+
 '<div class="extActions"><button type="button" class="btn soft" id="fesDefaults" data-fl-en="Use source bounds" data-fl-es="Usar límites de fuente">Use source bounds</button><button type="button" class="btn primary" id="fesRun" data-fl-en="Extract snapshot" data-fl-es="Extraer captura">Extract snapshot</button><button type="button" class="btn soft" id="fesJson">JSON</button><button type="button" class="btn soft" id="fesCsv">CSV</button></div><p class="smallnote" id="fesStatus" aria-live="polite"></p>'+
 '<div class="field"><label data-fl-en="Projection" data-fl-es="Proyección">Projection</label><select id="fesProjection"><option value="xy">XY</option><option value="xz">XZ</option><option value="yz">YZ</option></select></div><div id="fesPlot"></div><div class="extActions"><button class="btn tiny" id="fesPrev" type="button">←</button><span id="fesPageText"></span><button class="btn tiny" id="fesNext" type="button">→</button></div><div id="fesRows" style="display:grid;gap:4px;max-height:320px;overflow:auto"></div></div>';
 host.append(box);const selectionNodes=[...box.querySelector('.extSectionBody').children];for(const el of box.querySelectorAll('input,textarea,select'))if(el.id!=='fesProjection')el.addEventListener('input',()=>{fesControls();fesClear(fesUi('Filter changed; extract again.','Cambió el filtro; extrae otra vez.'))});
 fesE('fesDefaults').onclick=fesDefaults;fesE('fesRun').onclick=fesRun;fesE('fesJson').onclick=()=>fesExport('json');fesE('fesCsv').onclick=()=>fesExport('csv');fesE('fesProjection').onchange=fesDraw;fesE('fesPrev').onclick=()=>{fesPage--;fesDraw()};fesE('fesNext').onclick=()=>{fesPage++;fesDraw()};
 fesMountExtra(box);fesMountPhysical(box);fesMountDerived(box);fesMountThermal(box);fesMountHistory(box);fesMountMaterials(box);fesMountInterfaces(box);fesMountReport(box);fesOrganizeTools(box,selectionNodes);try{flApplyBilingualText(box)}catch{}fesControls();fesClear();return true
}
function fesInstall(){if(fesMount())return;const watch=new MutationObserver(()=>{if(fesMount())watch.disconnect()});watch.observe(document.body,{childList:true,subtree:true})}
fesInstall();
window.FoamLensEntitySelection={fesExtract,fesConfig,fesCsv,fesPreview};
