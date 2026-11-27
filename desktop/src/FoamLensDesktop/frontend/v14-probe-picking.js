/* FoamLens Desktop v1.4.1 — 3D ray-cast probe/picking for Field View. */

/* FOAMLENS_FIELD_PROBE_CORE_START */
function fpVecSub(a,b){return[a[0]-b[0],a[1]-b[1],a[2]-b[2]]}
function fpVecDot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]}
function fpVecCross(a,b){return[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]}
function fpVecNormalize(a){const l=Math.hypot(a[0],a[1],a[2]);return l>0?a.map(x=>x/l):[0,0,0]}
function fpMat4Invert(a){
  const out=new Float64Array(16);
  const a00=a[0],a01=a[1],a02=a[2],a03=a[3],a10=a[4],a11=a[5],a12=a[6],a13=a[7],a20=a[8],a21=a[9],a22=a[10],a23=a[11],a30=a[12],a31=a[13],a32=a[14],a33=a[15];
  const b00=a00*a11-a01*a10,b01=a00*a12-a02*a10,b02=a00*a13-a03*a10,b03=a01*a12-a02*a11,b04=a01*a13-a03*a11,b05=a02*a13-a03*a12,b06=a20*a31-a21*a30,b07=a20*a32-a22*a30,b08=a20*a33-a23*a30,b09=a21*a32-a22*a31,b10=a21*a33-a23*a31,b11=a22*a33-a23*a32;
  let det=b00*b11-b01*b10+b02*b09+b03*b08-b04*b07+b05*b06;if(!det)return null;det=1/det;
  out[0]=(a11*b11-a12*b10+a13*b09)*det;out[1]=(a02*b10-a01*b11-a03*b09)*det;out[2]=(a31*b05-a32*b04+a33*b03)*det;out[3]=(a22*b04-a21*b05-a23*b03)*det;
  out[4]=(a12*b08-a10*b11-a13*b07)*det;out[5]=(a00*b11-a02*b08+a03*b07)*det;out[6]=(a32*b02-a30*b05-a33*b01)*det;out[7]=(a20*b05-a22*b02+a23*b01)*det;
  out[8]=(a10*b10-a11*b08+a13*b06)*det;out[9]=(a01*b08-a00*b10-a03*b06)*det;out[10]=(a30*b04-a31*b02+a33*b00)*det;out[11]=(a21*b02-a20*b04-a23*b00)*det;
  out[12]=(a11*b07-a10*b09-a12*b06)*det;out[13]=(a00*b09-a01*b07+a02*b06)*det;out[14]=(a31*b01-a30*b03-a32*b00)*det;out[15]=(a20*b03-a21*b01+a22*b00)*det;
  return out
}
function fpTransform4(m,v){
  return[
    m[0]*v[0]+m[4]*v[1]+m[8]*v[2]+m[12]*v[3],
    m[1]*v[0]+m[5]*v[1]+m[9]*v[2]+m[13]*v[3],
    m[2]*v[0]+m[6]*v[1]+m[10]*v[2]+m[14]*v[3],
    m[3]*v[0]+m[7]*v[1]+m[11]*v[2]+m[15]*v[3]
  ]
}
function fpPerspectiveDivide(v){const w=Number(v[3]);return Math.abs(w)>1e-30?[v[0]/w,v[1]/w,v[2]/w]:null}
function fpRayTriangle(origin,dir,a,b,c,epsilon=1e-10){
  if(![origin,dir,a,b,c].every(p=>p?.length===3&&Array.from(p).every(Number.isFinite)))return null;
  const e1=fpVecSub(b,a),e2=fpVecSub(c,a),h=fpVecCross(dir,e2),det=fpVecDot(e1,h),scale=Math.hypot(...e1)*Math.hypot(...e2)*Math.hypot(...dir);if(!Number.isFinite(scale)||scale<=0||Math.abs(det)<=epsilon*scale)return null;
  const inv=1/det,s=fpVecSub(origin,a),u=inv*fpVecDot(s,h);if(u<-epsilon||u>1+epsilon)return null;
  const q=fpVecCross(s,e1),v=inv*fpVecDot(dir,q);if(v<-epsilon||u+v>1+epsilon)return null;
  const t=inv*fpVecDot(e2,q);if(!Number.isFinite(t)||t<=0)return null;
  return{t,u,v,w:1-u-v,point:[origin[0]+t*dir[0],origin[1]+t*dir[1],origin[2]+t*dir[2]]}
}
function fpTriangleValue(hit,values,offset){
  if(!hit||!values)return NaN;const a=values[offset],b=values[offset+1],c=values[offset+2];
  return[a,b,c].every(Number.isFinite)?hit.w*a+hit.u*b+hit.v*c:NaN
}
function fpPickTriangles(origin,dir,positions,{values=null,constantValue=NaN,kind='',cellIds=null,faceIds=null}={}){
  let best=null;const n=Math.floor((positions?.length||0)/9);
  for(let ti=0;ti<n;ti++){
    const o=ti*9,a=[positions[o],positions[o+1],positions[o+2]],b=[positions[o+3],positions[o+4],positions[o+5]],c=[positions[o+6],positions[o+7],positions[o+8]];
    if(![...a,...b,...c].every(Number.isFinite))continue;const hit=fpRayTriangle(origin,dir,a,b,c);if(!hit||best&&hit.t>=best.t)continue;
    const value=Number.isFinite(constantValue)?constantValue:fpTriangleValue(hit,values,ti*3),cell=Number.isSafeInteger(cellIds?.[ti])&&cellIds[ti]>=0?cellIds[ti]:null,face=Number.isSafeInteger(faceIds?.[ti])&&faceIds[ti]>=0?faceIds[ti]:null;
    best={...hit,triangle:ti,value,kind,cell,face}
  }
  return best
}
// A pin is an immutable observation, never a live sensor or a reassociated field.
function fpMakePin(hit,component,unit,id){
 if(!hit||hit.caseId==null||!String(hit.caseId).trim()||!Array.isArray(hit.point)||hit.point.length!==3||!hit.point.every(Number.isFinite)||!Number.isFinite(hit.time)||!Number.isSafeInteger(id)||id<1)return null;
 const value=hit.geometryOnly||!Number.isFinite(hit.value)?null:hit.value;
 return {id,caseId:String(hit.caseId),region:String(hit.region??''),field:String(hit.fieldName??''),association:String(hit.storage??''),component:String(component??''),unit:String(unit??''),time_s:hit.time,point_m:hit.point.slice(),value,kind:String(hit.kind??''),cell:Number.isSafeInteger(hit.cell)&&hit.cell>=0?hit.cell:null,face:Number.isSafeInteger(hit.face)&&hit.face>=0?hit.face:null,dimensions:Array.isArray(hit.parsed?.dimensions)?hit.parsed.dimensions.slice():null};
}
function fpPinCsv(pins){
 const fields=['id','caseId','region','field','association','component','unit','time_s','x_m','y_m','z_m','value','kind','cell','face','dimensions'];
 const cell=v=>{if(v==null)return '';let q=String(v);if(typeof v==='string'&&/^[\s]*[=+@\-]/.test(q))q="'"+q;return '"'+q.replace(/"/g,'""')+'"'};
 return [fields.join(','),...pins.map(p=>[p.id,p.caseId,p.region,p.field,p.association,p.component,p.unit,p.time_s,...p.point_m,p.value,p.kind,p.cell,p.face,p.dimensions?.join(' ')].map(cell).join(','))].join('\n')+'\n'
}
/* FOAMLENS_FIELD_PROBE_CORE_END */

const fpState={enabled:false,last:null,markerSize:'medium',surfaceCache:new WeakMap(),faceCache:new WeakMap(),down:null,pins:[],nextPin:1};
function fpUi(en,es){try{return flUi(en,es)}catch{return en}}
function fpFmt(v){try{return fvFmt(v)}catch{return Number.isFinite(Number(v))?String(v):'—'}}
function fpCanvasRay(canvas,event){
  const rect=canvas.getBoundingClientRect(),x=2*(event.clientX-rect.left)/Math.max(rect.width,1)-1,y=1-2*(event.clientY-rect.top)/Math.max(rect.height,1),inv=fpMat4Invert(fvMvp(canvas));if(!inv)return null;
  const near4=fpTransform4(inv,[x,y,-1,1]),far4=fpTransform4(inv,[x,y,1,1]),near=fpPerspectiveDivide(near4),far=fpPerspectiveDivide(far4);if(!near||!far)return null;
  return{origin:near,dir:fpVecNormalize(fpVecSub(far,near))}
}
function fpPickAtEvent(event){
  const canvas=document.getElementById('fvCanvas');if(!canvas||!event)return null;const ray=fpCanvasRay(canvas,event);return ray?fpRenderedPick(ray):null
}
function fpNearestCell(p){
  const mesh=fvState.mesh,hash=fvState.spatialHash,centers=mesh?.cellCenters||[];if(!mesh||!hash||!p)return null;
  const c=[hash.coord(p,0),hash.coord(p,1),hash.coord(p,2)],cand=[];
  for(let radius=0;radius<=3&&!cand.length;radius++)for(let dz=-radius;dz<=radius;dz++)for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){
    const ix=c[0]+dx,iy=c[1]+dy,iz=c[2]+dz;if(ix<0||iy<0||iz<0||ix>=hash.dims[0]||iy>=hash.dims[1]||iz>=hash.dims[2])continue;
    const arr=hash.buckets.get(hash.key(ix,iy,iz));if(arr)cand.push(...arr)
  }
  let best=null;for(const i of cand){const dx=Number(centers[3*i])-p[0],dy=Number(centers[3*i+1])-p[1],dz=Number(centers[3*i+2])-p[2],d2=dx*dx+dy*dy+dz*dz;if(!best||d2<best.d2)best={index:i,d2}}
  return best?{index:best.index,distance:Math.sqrt(best.d2)}:null
}
function fpSurfacePositions(mesh){
  if(!mesh)return null;if(fpState.surfaceCache.has(mesh))return fpState.surfaceCache.get(mesh);
  const p=fvBuildSurfaceBuffers(mesh).surfacePositions;fpState.surfaceCache.set(mesh,p);return p
}
function fpInternalFaceGeometry(mesh){
  if(!mesh)return null;if(fpState.faceCache.has(mesh))return fpState.faceCache.get(mesh);
  const g=fvBuildInternalFaceBuffers(mesh);fpState.faceCache.set(mesh,g);return g
}
function fpBoundaryPointValues(mesh,values){
  return Array.from(mesh?.surfaceTriangles||[],pi=>Number.isFinite(values?.[pi])?values[pi]:NaN)
}
function fpPickPrimaryRendered(ray){
  const mesh=fvState.mesh;if(!mesh||!fvState.fieldValues)return null;const storage=String(fvState.fieldStorage||'volume'),interior=[];
  if(storage==='volume'&&document.getElementById('fvIso')?.checked&&fvState.isoGeometry?.positions?.length){
    const iso=fvState.isoGeometry.isoValue;interior.push(fpPickTriangles(ray.origin,ray.dir,fvState.isoGeometry.positions,{constantValue:iso,kind:'iso'}))
  }
  if(storage==='volume'&&document.getElementById('fvSlice')?.checked&&fvState.sliceGeometry?.positions?.length){
    interior.push(fpPickTriangles(ray.origin,ray.dir,fvState.sliceGeometry.positions,{values:fvState.sliceGeometry.values,kind:'slice'}))
  }
  const bestInterior=interior.filter(Boolean).sort((a,b)=>a.t-b.t)[0];if(bestInterior)return bestInterior;
  if(document.getElementById('fvSurface')?.checked!==false){
    if(storage==='surface'){
      const hits=[],g=fpInternalFaceGeometry(mesh);
      if(g?.positions?.length){const hit=fpPickTriangles(ray.origin,ray.dir,g.positions,{kind:'internalFace',faceIds:g.triangleFaces});if(hit&&hit.face!=null){hit.value=Number.isFinite(fvState.fieldValues[hit.face])?fvState.fieldValues[hit.face]:NaN;hits.push(hit)}}
      const bg=fvState.surfaceBoundaryGeometry;if(bg?.positions?.length){const hit=fpPickTriangles(ray.origin,ray.dir,bg.positions,{kind:'boundaryFace',faceIds:bg.triangleFaces,values:bg.values});if(hit)hits.push(hit)}
      return hits.filter(Boolean).sort((a,b)=>a.t-b.t)[0]||null
    }
    const positions=fpSurfacePositions(mesh);
    if(storage==='point')return fpPickTriangles(ray.origin,ray.dir,positions,{kind:'pointSurface',values:fpBoundaryPointValues(mesh,fvState.fieldValues)});
    const owners=mesh.surfaceOwners||[],cellIds=owners,hit=fpPickTriangles(ray.origin,ray.dir,positions,{kind:'surface',cellIds});
    if(hit&&hit.cell!=null)hit.value=Number.isFinite(fvState.fieldValues[hit.cell])?fvState.fieldValues[hit.cell]:NaN;return hit
  }
  return null
}
// Each click must pick real triangles and their own OpenFOAM field values
// from ONE shared WebGL scene, without reading the primary region's array.
function fpRefreshRegions(){
  const select=document.getElementById('fvProbeRegion');if(!select)return;
  const current=select.value||'auto',c=fvCase(),primary=document.getElementById('fvRegion')?.value||'';
  const regions=window.FoamLensRegionScene?.regionNames?.(c)||[primary];
  select.replaceChildren();
  const option=(value,label)=>{const o=document.createElement('option');o.value=value;o.textContent=label;select.appendChild(o)};
  option('auto',fpUi('Auto · nearest visible region','Auto · región visible más próxima'));
  for(const region of regions)option('region:'+region,region||fpUi('Default region','Región predeterminada'));
  if([...select.options].some(o=>o.value===current))select.value=current;
}
function fpSecondaryRegionPick(ray,layer){
  if(!layer?.mesh)return null;
  const mesh=layer.mesh,values=layer.fieldValues,storage=String(layer.storage||''),positions=layer.probePositions||fpSurfacePositions(mesh);
  let hit=null;
  if(storage==='surface'&&values?.length===mesh.internalFaceCount){
    const faces=fpInternalFaceGeometry(mesh);
    if(faces?.positions?.length){
      hit=fpPickTriangles(ray.origin,ray.dir,faces.positions,{kind:'internalFace',faceIds:faces.triangleFaces});
      if(hit&&hit.face!=null)hit.value=Number.isFinite(values[hit.face])?values[hit.face]:NaN
    }
    // Unmeasured boundary faces never inherit neighboring cell/face values.
    if(!hit&&positions?.length)hit=fpPickTriangles(ray.origin,ray.dir,positions,{kind:'geometry'});
  }else if(storage==='point'&&values?.length===mesh.pointCount){
    hit=fpPickTriangles(ray.origin,ray.dir,positions,{kind:'pointSurface',values:fpBoundaryPointValues(mesh,values)})
  }else if(storage==='volume'&&values?.length===mesh.cellCount){
    hit=fpPickTriangles(ray.origin,ray.dir,positions,{kind:'surface',cellIds:mesh.surfaceOwners||[]});
    if(hit&&hit.cell!=null)hit.value=Number.isFinite(values[hit.cell])?values[hit.cell]:NaN
  }else if(positions?.length)hit=fpPickTriangles(ray.origin,ray.dir,positions,{kind:'geometry'});
  if(!hit)return null;
  return{...hit,region:layer.region,fieldName:layer.field,storage,parsed:layer.parsed,time:layer.time,
    caseId:window.FoamLensRegionScene?.state?.()?.caseId??null,geometryOnly:!Number.isFinite(hit.value)}
}
function fpRenderedPick(ray){
  const target=document.getElementById('fvProbeRegion')?.value||'auto',
    region=document.getElementById('fvRegion')?.value||'',hits=[],
    scene=window.FoamLensRegionScene?.state?.();
  const selected=key=>target==='auto'||target==='region:'+key;
  if(selected(region)&&scene?.choices?.get(region)?.visible!==false){
    const primary=fpPickPrimaryRendered(ray);
    if(primary)hits.push({...primary,region,caseId:fvState.caseId??scene?.caseId??null,
      fieldName:fvState.fieldName||'',storage:fvState.fieldStorage||'',parsed:fvState.fieldParsed||null,
      time:fvState.time,geometryOnly:!Number.isFinite(primary.value)})
  }
  if(document.getElementById('fvSurface')?.checked!==false){
    for(const [name,layer] of scene?.layers||[]){
      if(!selected(name)||scene?.choices?.get(name)?.visible===false)continue;
      const hit=fpSecondaryRegionPick(ray,layer);if(hit)hits.push(hit)
    }
  }
  hits.sort((a,b)=>a.t-b.t);
  return hits[0]||null
}

function fpMarkerScale(){
  return fpState.markerSize==='small'?.012:fpState.markerSize==='large'?.038:.024
}
function fpMarkerBuffers(p){
  const mesh=fvState.mesh,diag=mesh?Math.hypot(mesh.boundsMax[0]-mesh.boundsMin[0],mesh.boundsMax[1]-mesh.boundsMin[1],mesh.boundsMax[2]-mesh.boundsMin[2]):1,h=(diag||1)*fpMarkerScale(),r=h*.58,pos=[];
  for(let a=0;a<3;a++){const q=[...p],s=[...p];q[a]-=h;s[a]+=h;pos.push(...q,...s)}
  const loops=[[0,1],[0,2],[1,2]];
  for(const [a,b] of loops){const pts=[];for(const [sa,sb] of [[-1,-1],[1,-1],[1,1],[-1,1]]){const q=[...p];q[a]+=sa*r;q[b]+=sb*r;pts.push(q)}for(let i=0;i<4;i++)pos.push(...pts[i],...pts[(i+1)%4])}
  return new Float32Array(pos)
}
function fpEnsureOverlay(){
  let o=document.getElementById('fvProbeMarkerOverlay');if(o)return o;const vp=document.getElementById('fvCanvas')?.closest('.fvViewport');if(!vp)return null;
  o=document.createElement('div');o.id='fvProbeMarkerOverlay';o.className='fvProbeMarkerOverlay hidden';o.innerHTML='<span class="fpProbeDot"></span>';vp.appendChild(o);return o
}
function fpOverlaySizePx(){return fpState.markerSize==='small'?18:fpState.markerSize==='large'?38:28}
function fpEnsureAimOverlay(){
  let o=document.getElementById('fvProbeAimOverlay');if(o)return o;const vp=document.getElementById('fvCanvas')?.closest('.fvViewport');if(!vp)return null;
  o=document.createElement('div');o.id='fvProbeAimOverlay';o.className='fvProbeAimOverlay hidden';o.innerHTML='<span></span>';vp.appendChild(o);return o
}
function fpMoveAimOverlay(event){
  const o=fpEnsureAimOverlay(),canvas=document.getElementById('fvCanvas');if(!o||!canvas||!fpState.enabled){o?.classList.add('hidden');return}
  const cr=canvas.getBoundingClientRect(),vr=o.parentElement.getBoundingClientRect(),x=event.clientX-vr.left,y=event.clientY-vr.top,size=fpOverlaySizePx();
  if(event.clientX<cr.left||event.clientX>cr.right||event.clientY<cr.top||event.clientY>cr.bottom){o.classList.add('hidden');return}
  o.style.left=x+'px';o.style.top=y+'px';o.style.width=size+'px';o.style.height=size+'px';o.classList.remove('hidden')
}
function fpHideAimOverlay(){document.getElementById('fvProbeAimOverlay')?.classList.add('hidden')}
function fpUpdateOverlayPosition(){
  const o=fpEnsureOverlay(),canvas=document.getElementById('fvCanvas'),hit=fpState.last;if(!o||!canvas||!fpState.enabled||!hit?.point){o?.classList.add('hidden');return}
  const clip=fpTransform4(fvMvp(canvas),[Number(hit.point[0]),Number(hit.point[1]),Number(hit.point[2]),1]),ndc=fpPerspectiveDivide(clip);if(!ndc||!ndc.every(Number.isFinite)||ndc[2]<-1||ndc[2]>1){o.classList.add('hidden');return}
  const cr=canvas.getBoundingClientRect(),vr=o.parentElement.getBoundingClientRect(),x=cr.left-vr.left+(ndc[0]+1)*.5*cr.width,y=cr.top-vr.top+(1-ndc[1])*.5*cr.height,size=fpOverlaySizePx();
  o.style.left=x+'px';o.style.top=y+'px';o.style.width=size+'px';o.style.height=size+'px';o.classList.remove('hidden')
}
function fpUpdateMarker(hit){
  const r=fvState.renderer;if(!r)return;if(!hit||!fpState.enabled){r.probeCount=0;fpUpdateOverlayPosition();fvRender();return}
  const pos=fpMarkerBuffers(hit.point);fvUploadBuffer(r,'probePos',pos,r.gl.DYNAMIC_DRAW);fvUploadBuffer(r,'probeColor',fvConstantColors(pos.length/3,[1,.72,.15]),r.gl.DYNAMIC_DRAW);r.probeCount=pos.length/3;fpUpdateOverlayPosition();fvRender()
}
function fpSourceLabel(kind){
  if(kind==='geometry')return fpUi('Geometry only · no measured field','Solo geometría · sin campo medido');
  if(kind==='iso')return fpUi('Iso-surface','Iso-superficie');if(kind==='slice')return fpUi('Interior slice','Corte interior');if(kind==='internalFace')return fpUi('Internal mesh face','Cara interna de malla');if(kind==='boundaryFace')return fpUi('Boundary mesh face · explicit patch value','Cara de frontera · valor explícito de patch');if(kind==='pointSurface')return fpUi('Boundary surface · point interpolation','Superficie de frontera · interpolación de puntos');return fpUi('Boundary surface · owner cell','Superficie de frontera · celda owner')
}
function fpRenderReadout(hit){
  const box=document.getElementById('fvProbeReadout');if(!box)return;if(!hit){box.innerHTML='<span>'+fpUi('Click rendered geometry to inspect a value.','Haz clic en la geometría renderizada para inspeccionar un valor.')+'</span>';return}
  const storage=String(hit.storage||fvState.fieldStorage||''),parsed=hit.parsed||null,
    nearest=hit.cell!=null?{index:hit.cell,distance:0}:hit.region===(document.getElementById('fvRegion')?.value||'')?fpNearestCell(hit.point):null,
    unit=parsed?.dimensions&&typeof pmUnitFromDimensions==='function'?pmUnitFromDimensions(parsed.dimensions):'',
    elementLabel=hit.face!=null?fpUi('Face','Cara'):hit.cell!=null?fpUi('Cell','Celda'):storage==='point'?fpUi('Point data','Datos de punto'):fpUi('Nearest cell','Celda más cercana'),
    elementText=hit.face!=null?String(hit.face):hit.cell!=null?String(hit.cell):storage==='point'?fpUi('triangle interpolation','interpolación triangular'):(nearest?String(nearest.index):'—');
  box.innerHTML='<div class="fpGrid">'+
    '<div><span>'+fpUi('Region','Región')+'</span><b>'+fvEsc(hit.region||fpUi('Default','Predeterminada'))+'</b></div>'+
    '<div><span>'+fpUi('Source','Fuente')+'</span><b>'+fvEsc(fpSourceLabel(hit.kind))+'</b></div>'+
    '<div><span>'+fpUi('Field','Campo')+'</span><b>'+fvEsc(hit.fieldName||fpUi('No measured field','Sin campo medido'))+'</b></div>'+
    '<div><span>'+fpUi('Association','Asociación')+'</span><b>'+fvEsc(storage&&typeof fvAssociationLabel==='function'?fvAssociationLabel(storage):storage||'—')+'</b></div>'+
    '<div><span>'+fpUi('Value','Valor')+'</span><b>'+fvEsc(hit.geometryOnly?fpUi('Not available (geometry only)','No disponible (solo geometría)'):fpFmt(hit.value)+(unit?' '+unit:''))+'</b></div>'+
    '<div><span>'+fpUi('Time','Tiempo')+'</span><b>'+fvEsc(fpFmt(hit.time))+' s</b></div>'+
    '<div><span>X</span><b>'+fvEsc(fpFmt(hit.point[0]))+'</b></div><div><span>Y</span><b>'+fvEsc(fpFmt(hit.point[1]))+'</b></div><div><span>Z</span><b>'+fvEsc(fpFmt(hit.point[2]))+'</b></div>'+
    '<div><span>'+fvEsc(elementLabel)+'</span><b>'+fvEsc(elementText)+'</b></div></div>'
}
function fpRenderPins(){
 const host=document.getElementById('fvProbePinsRows');if(!host)return;
 const pins=fpState.pins;host.replaceChildren();
 for(const p of pins){const row=document.createElement('div');row.style.cssText='display:flex;gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid var(--line)';
 const label=document.createElement('span');label.style.cssText='flex:1;min-width:0;overflow-wrap:anywhere';label.textContent='#'+p.id+' · '+p.caseId+' / '+(p.region||fpUi('Default','Predeterminada'))+' · '+p.field+' '+p.component+' · t='+p.time_s+' s · ('+p.point_m.map(fpFmt).join(', ')+') m · '+(p.value===null?fpUi('Unavailable','No disponible'):fpFmt(p.value)+' '+p.unit);
 const remove=document.createElement('button');remove.type='button';remove.className='btn tiny';remove.textContent=fpUi('Remove','Quitar');remove.onclick=()=>{fpState.pins=fpState.pins.filter(q=>q.id!==p.id);fpRenderPins()};row.append(label,remove);host.append(row)}
 document.getElementById('fvProbePinSave').disabled=!fpState.last||pins.length>=200;
 for(const id of ['fvProbePinJson','fvProbePinCsv','fvProbePinClear'])document.getElementById(id).disabled=!pins.length;
 document.getElementById('fvProbePinsCount').textContent=pins.length+' / 200 · '+fpUi('session observations; not live','observaciones de sesión; no son mediciones en vivo');
}
function fpSavePin(){
 const hit=fpState.last;if(!hit||fpState.pins.length>=200)return;
 const unit=hit.parsed?.dimensions&&typeof pmUnitFromDimensions==='function'?pmUnitFromDimensions(hit.parsed.dimensions):'';
 const p=fpMakePin(hit,hit.component,unit,fpState.nextPin);if(!p){fvSetStatus(fpUi('Pin requires source case, coordinates and physical time.','La sonda requiere caso, coordenadas y tiempo físico.'),false);return}
 fpState.nextPin++;fpState.pins.push(p);fpRenderPins()
}
function fpExportPins(kind){
 if(!fpState.pins.length)return;
 const json=kind==='json',data=json?JSON.stringify({schema:'foamlens/probe-observations/1',limitations:'Saved rendered-geometry observations, not a live time series. Geometry-only values are null.',pins:fpState.pins},null,2):fpPinCsv(fpState.pins);
 const name='FoamLens_probe_observations.'+kind,mime=json?'application/json':'text/csv';
 if(typeof downloadText==='function'){downloadText(name,data,mime);return}
 const url=URL.createObjectURL(new Blob([data],{type:mime})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
}
function fpMountPins(read){
 const box=document.createElement('details');box.className='fvProbeReadout smallnote';box.id='fvProbePins';
 box.innerHTML='<summary><b data-fl-en="Saved probe observations" data-fl-es="Observaciones de sondas guardadas">Saved probe observations</b></summary><div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px"><button type="button" class="btn tiny" id="fvProbePinSave" data-fl-en="Save current probe" data-fl-es="Guardar sonda actual">Save current probe</button><button type="button" class="btn tiny" id="fvProbePinJson">JSON</button><button type="button" class="btn tiny" id="fvProbePinCsv">CSV</button><button type="button" class="btn tiny" id="fvProbePinClear" data-fl-en="Clear saved" data-fl-es="Borrar guardadas">Clear saved</button></div><p id="fvProbePinsCount" aria-live="polite"></p><div id="fvProbePinsRows" style="max-height:240px;overflow:auto"></div>';
 read.insertAdjacentElement('afterend',box);
 document.getElementById('fvProbePinSave').onclick=fpSavePin;document.getElementById('fvProbePinJson').onclick=()=>fpExportPins('json');document.getElementById('fvProbePinCsv').onclick=()=>fpExportPins('csv');
 document.getElementById('fvProbePinClear').onclick=()=>{fpState.pins=[];fpRenderPins()};try{flApplyBilingualText(box)}catch{}fpRenderPins()
}
function fpPickEvent(event){
  if(!fpState.enabled)return;const canvas=document.getElementById('fvCanvas'),ray=canvas?fpCanvasRay(canvas,event):null;if(!ray)return;const hit=fpRenderedPick(ray);fpState.last=hit?{...hit,component:hit.region===(document.getElementById('fvRegion')?.value||'')?fvState.component:(hit.parsed?.component||'')}:null;fpUpdateMarker(hit);fpRenderReadout(hit);fpRenderPins();window.FoamLensFieldCompare?.updateStats?.();
  if(!hit)fvSetStatus(fpUi('No rendered triangle was found under the cursor.','No se encontró ningún triángulo renderizado bajo el cursor.'),false)
}
function fpSetEnabled(enabled){
  fpState.enabled=!!enabled;const b=document.getElementById('fvProbeMode'),canvas=document.getElementById('fvCanvas'),pill=document.getElementById('fvProbeStatePill');
  if(b){b.classList.toggle('primary',fpState.enabled);b.textContent=(fpState.enabled?'● ':'◎ ')+fpUi(fpState.enabled?'Probe ON':'Probe OFF',fpState.enabled?'Sonda ACTIVA':'Sonda INACTIVA');b.setAttribute('aria-pressed',String(fpState.enabled))}
  if(pill){pill.classList.toggle('on',fpState.enabled);pill.textContent=fpUi(fpState.enabled?'Probe ON · move pointer · click to pin':'Probe OFF',fpState.enabled?'Sonda ACTIVA · mueve el puntero · clic para fijar':'Sonda INACTIVA')}
  if(canvas)canvas.style.cursor=fpState.enabled?'crosshair':'';
  if(!fpState.enabled)fpHideAimOverlay();
  if(fpState.enabled&&fpState.last)fpUpdateMarker(fpState.last);else{const r=fvState.renderer;if(r)r.probeCount=0;fpUpdateOverlayPosition();fvRender()}
  const box=document.getElementById('fvProbeReadout');if(box&&!fpState.last)fpRenderReadout(null)
}
function fpClear(){
  fpState.last=null;fpRenderPins();const r=fvState.renderer;if(r)r.probeCount=0;fpRenderReadout(null);fvRender();window.FoamLensFieldCompare?.updateStats?.()
}
function fpInstallUi(){
  if(document.getElementById('fvProbeMode'))return true;const tools=document.querySelector('#fieldViewPanel .fvViewTools'),stats=document.getElementById('fvStats'),canvas=document.getElementById('fvCanvas');if(!tools||!stats||!canvas)return false;
  const mode=document.createElement('button');mode.className='btn tiny';mode.id='fvProbeMode';mode.type='button';mode.textContent='◎ '+fpUi('Probe','Sonda');mode.setAttribute('data-fl-en','◎ Probe');mode.setAttribute('data-fl-es','◎ Sonda');
  const clear=document.createElement('button');clear.className='btn tiny';clear.id='fvProbeClear';clear.type='button';clear.textContent=fpUi('Clear probe','Limpiar sonda');clear.setAttribute('data-fl-en','Clear probe');clear.setAttribute('data-fl-es','Limpiar sonda');
  const size=document.createElement('select');size.id='fvProbeSize';size.className='fpProbeSize';size.innerHTML='<option value="small">Probe S</option><option value="medium" selected>Probe M</option><option value="large">Probe L</option>';
  const pill=document.createElement('span');pill.id='fvProbeStatePill';pill.className='fpProbeStatePill';pill.textContent=fpUi('Probe OFF','Sonda INACTIVA');
  const regionSelect=document.createElement('select');regionSelect.id='fvProbeRegion';regionSelect.className='fpProbeRegion';regionSelect.setAttribute('aria-label',fpUi('Physical region to probe','Región física para la sonda'));
  tools.appendChild(mode);tools.appendChild(clear);tools.appendChild(size);tools.appendChild(regionSelect);tools.appendChild(pill);
  fpRefreshRegions();
  fpEnsureOverlay();fpEnsureAimOverlay();
  const read=document.createElement('div');read.id='fvProbeReadout';read.className='fvProbeReadout smallnote';stats.insertAdjacentElement('afterend',read);fpRenderReadout(null);fpMountPins(read);
  if(!document.getElementById('fvProbeStyle')){const st=document.createElement('style');st.id='fvProbeStyle';st.textContent='.fvViewTools{display:flex;gap:6px;flex-wrap:wrap}.fpProbeSize{width:auto;min-width:76px;padding:4px 6px;border-radius:8px}.fpProbeRegion{width:auto;max-width:230px;min-width:125px;padding:4px 6px;border-radius:8px}.fpProbeStatePill{display:inline-flex;align-items:center;padding:4px 7px;border:1px solid var(--line);border-radius:999px;background:var(--panel2);color:var(--muted);font-size:8px;font-weight:850}.fpProbeStatePill.on{color:#ffd66b;border-color:rgba(255,190,55,.5);background:rgba(255,190,55,.12)}.fvProbeMarkerOverlay{position:absolute;z-index:18;transform:translate(-50%,-50%);border:2px solid #ffd34d;border-radius:50%;box-shadow:0 0 0 3px rgba(0,0,0,.55),0 0 16px 4px rgba(255,201,61,.55);pointer-events:none}.fvProbeMarkerOverlay:before,.fvProbeMarkerOverlay:after{content:"";position:absolute;left:50%;top:50%;background:#fff3b0;box-shadow:0 0 3px #000;transform:translate(-50%,-50%)}.fvProbeMarkerOverlay:before{width:150%;height:2px}.fvProbeMarkerOverlay:after{width:2px;height:150%}.fpProbeDot{position:absolute;left:50%;top:50%;width:6px;height:6px;border-radius:50%;background:#ffb300;transform:translate(-50%,-50%);box-shadow:0 0 0 2px #111}.fvProbeMarkerOverlay.hidden{display:none}.fvProbeAimOverlay{position:absolute;z-index:17;transform:translate(-50%,-50%);border:1px dashed #fff3b0;border-radius:50%;box-shadow:0 0 0 2px rgba(0,0,0,.45),0 0 10px rgba(255,211,77,.4);pointer-events:none}.fvProbeAimOverlay:before,.fvProbeAimOverlay:after{content:"";position:absolute;left:50%;top:50%;background:#ffd34d;transform:translate(-50%,-50%);box-shadow:0 0 2px #000}.fvProbeAimOverlay:before{width:170%;height:1px}.fvProbeAimOverlay:after{width:1px;height:170%}.fvProbeAimOverlay span{position:absolute;left:50%;top:50%;width:4px;height:4px;border-radius:50%;background:#ffd34d;transform:translate(-50%,-50%)}.fvProbeAimOverlay.hidden{display:none}.fvProbeReadout{margin-top:9px;padding:9px 10px;border:1px solid var(--line);border-radius:11px;background:var(--panel2)}.fpGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.fpGrid>div{min-width:0}.fpGrid span{display:block;color:var(--muted);font-size:8px}.fpGrid b{display:block;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text)}@media(max-width:780px){.fpGrid{grid-template-columns:repeat(2,minmax(0,1fr))}}';document.head.appendChild(st)}
  regionSelect.addEventListener('change',fpClear);
  mode.addEventListener('click',()=>fpSetEnabled(!fpState.enabled));clear.addEventListener('click',fpClear);size.addEventListener('change',()=>{fpState.markerSize=size.value||'medium';if(fpState.enabled&&fpState.last)fpUpdateMarker(fpState.last);else fpUpdateOverlayPosition()});
  canvas.addEventListener('pointermove',e=>{if(fpState.enabled)fpMoveAimOverlay(e)});
  canvas.addEventListener('pointerenter',e=>{if(fpState.enabled)fpMoveAimOverlay(e)});
  canvas.addEventListener('pointerleave',()=>fpHideAimOverlay());
  canvas.addEventListener('pointerdown',e=>{if(fpState.enabled)fpState.down={x:e.clientX,y:e.clientY}});
  canvas.addEventListener('click',e=>{if(!fpState.enabled)return;const d=fpState.down?Math.hypot(e.clientX-fpState.down.x,e.clientY-fpState.down.y):0;fpState.down=null;if(d<=5)fpPickEvent(e)});
  try{flApplyBilingualText(mode);flApplyBilingualText(clear)}catch{};return true
}
function fpInstall(){
  const mount=()=>fpInstallUi();if(!mount()){const retry=()=>{if(mount())return;requestAnimationFrame(retry)};requestAnimationFrame(retry)}
  if(typeof fvRender==='function'&&!fvRender.__fpOverlayPatched){const previous=fvRender;fvRender=function(...args){const out=previous.apply(this,args);fpUpdateOverlayPosition();return out};fvRender.__fpOverlayPatched=true}
  document.addEventListener('foamlens-language-change',()=>{const b=document.getElementById('fvProbeMode'),cl=document.getElementById('fvProbeClear');if(b)fpSetEnabled(fpState.enabled);if(cl)cl.textContent=fpUi('Clear probe','Limpiar sonda');fpRefreshRegions();fpRenderReadout(fpState.last);const pins=document.getElementById('fvProbePins');if(pins)try{flApplyBilingualText(pins)}catch{}fpRenderPins()});
}
fpInstall();
window.FoamLensFieldProbe={fpMat4Invert,fpTransform4,fpPerspectiveDivide,fpRayTriangle,fpPickTriangles,fpRenderedPick,fpSecondaryRegionPick,fpRefreshRegions,fpCanvasRay,fpPickAtEvent,fpClear,fpSetEnabled,fpUpdateOverlayPosition,fpMoveAimOverlay,fpHideAimOverlay,isEnabled:()=>fpState.enabled,getLast:()=>fpState.last};
