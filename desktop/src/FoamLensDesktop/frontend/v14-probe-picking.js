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
  const e1=fpVecSub(b,a),e2=fpVecSub(c,a),h=fpVecCross(dir,e2),det=fpVecDot(e1,h);if(Math.abs(det)<=epsilon)return null;
  const inv=1/det,s=fpVecSub(origin,a),u=inv*fpVecDot(s,h);if(u<-epsilon||u>1+epsilon)return null;
  const q=fpVecCross(s,e1),v=inv*fpVecDot(dir,q);if(v<-epsilon||u+v>1+epsilon)return null;
  const t=inv*fpVecDot(e2,q);if(t<=epsilon)return null;
  return{t,u,v,w:1-u-v,point:[origin[0]+t*dir[0],origin[1]+t*dir[1],origin[2]+t*dir[2]]}
}
function fpTriangleValue(hit,values,offset){
  if(!hit||!values)return NaN;const a=Number(values[offset]),b=Number(values[offset+1]),c=Number(values[offset+2]);
  return[a,b,c].every(Number.isFinite)?hit.w*a+hit.u*b+hit.v*c:NaN
}
function fpPickTriangles(origin,dir,positions,{values=null,constantValue=NaN,kind='',cellIds=null}={}){
  let best=null;const n=Math.floor((positions?.length||0)/9);
  for(let ti=0;ti<n;ti++){
    const o=ti*9,a=[positions[o],positions[o+1],positions[o+2]],b=[positions[o+3],positions[o+4],positions[o+5]],c=[positions[o+6],positions[o+7],positions[o+8]];
    if(![...a,...b,...c].every(Number.isFinite))continue;const hit=fpRayTriangle(origin,dir,a,b,c);if(!hit||best&&hit.t>=best.t)continue;
    const value=Number.isFinite(Number(constantValue))?Number(constantValue):fpTriangleValue(hit,values,ti*3),cell=cellIds&&Number.isFinite(Number(cellIds[ti]))?Number(cellIds[ti]):null;
    best={...hit,triangle:ti,value,kind,cell}
  }
  return best
}
/* FOAMLENS_FIELD_PROBE_CORE_END */

const fpState={enabled:false,last:null,surfaceCache:new WeakMap(),down:null};
function fpUi(en,es){try{return flUi(en,es)}catch{return en}}
function fpFmt(v){try{return fvFmt(v)}catch{return Number.isFinite(Number(v))?String(v):'—'}}
function fpCanvasRay(canvas,event){
  const rect=canvas.getBoundingClientRect(),x=2*(event.clientX-rect.left)/Math.max(rect.width,1)-1,y=1-2*(event.clientY-rect.top)/Math.max(rect.height,1),inv=fpMat4Invert(fvMvp(canvas));if(!inv)return null;
  const near4=fpTransform4(inv,[x,y,-1,1]),far4=fpTransform4(inv,[x,y,1,1]),near=fpPerspectiveDivide(near4),far=fpPerspectiveDivide(far4);if(!near||!far)return null;
  return{origin:near,dir:fpVecNormalize(fpVecSub(far,near))}
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
function fpRenderedPick(ray){
  const mesh=fvState.mesh;if(!mesh||!fvState.fieldValues)return null;const interior=[];
  if(document.getElementById('fvIso')?.checked&&fvState.isoGeometry?.positions?.length){
    const iso=Number(fvState.isoGeometry.isoValue);interior.push(fpPickTriangles(ray.origin,ray.dir,fvState.isoGeometry.positions,{constantValue:iso,kind:'iso'}))
  }
  if(document.getElementById('fvSlice')?.checked&&fvState.sliceGeometry?.positions?.length){
    interior.push(fpPickTriangles(ray.origin,ray.dir,fvState.sliceGeometry.positions,{values:fvState.sliceGeometry.values,kind:'slice'}))
  }
  const bestInterior=interior.filter(Boolean).sort((a,b)=>a.t-b.t)[0];if(bestInterior)return bestInterior;
  if(document.getElementById('fvSurface')?.checked!==false){
    const positions=fpSurfacePositions(mesh),owners=mesh.surfaceOwners||[],cellIds=owners.map(Number),hit=fpPickTriangles(ray.origin,ray.dir,positions,{kind:'surface',cellIds});
    if(hit&&hit.cell!=null)hit.value=Number(fvState.fieldValues[hit.cell]);return hit
  }
  return null
}
function fpMarkerBuffers(p){
  const mesh=fvState.mesh,diag=mesh?Math.hypot(mesh.boundsMax[0]-mesh.boundsMin[0],mesh.boundsMax[1]-mesh.boundsMin[1],mesh.boundsMax[2]-mesh.boundsMin[2]):1,h=(diag||1)*.012,pos=[];
  for(let a=0;a<3;a++){const q=[...p],r=[...p];q[a]-=h;r[a]+=h;pos.push(...q,...r)}
  return new Float32Array(pos)
}
function fpUpdateMarker(hit){
  const r=fvState.renderer;if(!r)return;if(!hit){r.probeCount=0;fvRender();return}
  const pos=fpMarkerBuffers(hit.point);fvUploadBuffer(r,'probePos',pos,r.gl.DYNAMIC_DRAW);fvUploadBuffer(r,'probeColor',fvConstantColors(pos.length/3,[1,.72,.15]),r.gl.DYNAMIC_DRAW);r.probeCount=pos.length/3;fvRender()
}
function fpSourceLabel(kind){
  if(kind==='iso')return fpUi('Iso-surface','Iso-superficie');if(kind==='slice')return fpUi('Interior slice','Corte interior');return fpUi('Boundary surface','Superficie de frontera')
}
function fpRenderReadout(hit){
  const box=document.getElementById('fvProbeReadout');if(!box)return;if(!hit){box.innerHTML='<span>'+fpUi('Click rendered geometry to inspect a value.','Haz clic en la geometría renderizada para inspeccionar un valor.')+'</span>';return}
  const nearest=hit.cell!=null?{index:hit.cell,distance:0}:fpNearestCell(hit.point),unit=fvState.fieldParsed?.dimensions&&typeof pmUnitFromDimensions==='function'?pmUnitFromDimensions(fvState.fieldParsed.dimensions):'',cellText=nearest?String(nearest.index):'—',approx=hit.cell==null&&nearest?' '+fpUi('(nearest)','(más cercana)'):'';
  box.innerHTML='<div class="fpGrid">'+
    '<div><span>'+fpUi('Source','Fuente')+'</span><b>'+fvEsc(fpSourceLabel(hit.kind))+'</b></div>'+
    '<div><span>'+fpUi('Field','Campo')+'</span><b>'+fvEsc(fvState.fieldName||'—')+'</b></div>'+
    '<div><span>'+fpUi('Value','Valor')+'</span><b>'+fvEsc(fpFmt(hit.value)+(unit?' '+unit:''))+'</b></div>'+
    '<div><span>'+fpUi('Time','Tiempo')+'</span><b>'+fvEsc(fpFmt(fvState.time))+' s</b></div>'+
    '<div><span>X</span><b>'+fvEsc(fpFmt(hit.point[0]))+'</b></div><div><span>Y</span><b>'+fvEsc(fpFmt(hit.point[1]))+'</b></div><div><span>Z</span><b>'+fvEsc(fpFmt(hit.point[2]))+'</b></div>'+
    '<div><span>'+fpUi('Cell','Celda')+'</span><b>'+fvEsc(cellText+approx)+'</b></div></div>'
}
function fpPickEvent(event){
  if(!fpState.enabled)return;const canvas=document.getElementById('fvCanvas'),ray=canvas?fpCanvasRay(canvas,event):null;if(!ray)return;const hit=fpRenderedPick(ray);fpState.last=hit;fpUpdateMarker(hit);fpRenderReadout(hit);
  if(!hit)fvSetStatus(fpUi('No rendered triangle was found under the cursor.','No se encontró ningún triángulo renderizado bajo el cursor.'),false)
}
function fpSetEnabled(enabled){
  fpState.enabled=!!enabled;const b=document.getElementById('fvProbeMode'),canvas=document.getElementById('fvCanvas');if(b){b.classList.toggle('primary',fpState.enabled);b.textContent=(fpState.enabled?'● ':'◎ ')+fpUi('Probe','Sonda')}if(canvas)canvas.style.cursor=fpState.enabled?'crosshair':'';
  const box=document.getElementById('fvProbeReadout');if(box&&!fpState.last)fpRenderReadout(null)
}
function fpClear(){
  fpState.last=null;const r=fvState.renderer;if(r)r.probeCount=0;fpRenderReadout(null);fvRender()
}
function fpInstallUi(){
  if(document.getElementById('fvProbeMode'))return true;const tools=document.querySelector('#fieldViewPanel .fvViewTools'),stats=document.getElementById('fvStats'),canvas=document.getElementById('fvCanvas');if(!tools||!stats||!canvas)return false;
  const mode=document.createElement('button');mode.className='btn tiny';mode.id='fvProbeMode';mode.type='button';mode.textContent='◎ '+fpUi('Probe','Sonda');mode.setAttribute('data-fl-en','◎ Probe');mode.setAttribute('data-fl-es','◎ Sonda');
  const clear=document.createElement('button');clear.className='btn tiny';clear.id='fvProbeClear';clear.type='button';clear.textContent=fpUi('Clear probe','Limpiar sonda');clear.setAttribute('data-fl-en','Clear probe');clear.setAttribute('data-fl-es','Limpiar sonda');
  tools.appendChild(mode);tools.appendChild(clear);
  const read=document.createElement('div');read.id='fvProbeReadout';read.className='fvProbeReadout smallnote';stats.insertAdjacentElement('afterend',read);fpRenderReadout(null);
  if(!document.getElementById('fvProbeStyle')){const st=document.createElement('style');st.id='fvProbeStyle';st.textContent='.fvViewTools{display:flex;gap:6px;flex-wrap:wrap}.fvProbeReadout{margin-top:9px;padding:9px 10px;border:1px solid var(--line);border-radius:11px;background:var(--panel2)}.fpGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.fpGrid>div{min-width:0}.fpGrid span{display:block;color:var(--muted);font-size:8px}.fpGrid b{display:block;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text)}@media(max-width:780px){.fpGrid{grid-template-columns:repeat(2,minmax(0,1fr))}}';document.head.appendChild(st)}
  mode.addEventListener('click',()=>fpSetEnabled(!fpState.enabled));clear.addEventListener('click',fpClear);
  canvas.addEventListener('pointerdown',e=>{if(fpState.enabled)fpState.down={x:e.clientX,y:e.clientY}});
  canvas.addEventListener('click',e=>{if(!fpState.enabled)return;const d=fpState.down?Math.hypot(e.clientX-fpState.down.x,e.clientY-fpState.down.y):0;fpState.down=null;if(d<=5)fpPickEvent(e)});
  try{flApplyBilingualText(mode);flApplyBilingualText(clear)}catch{};return true
}
function fpInstall(){
  const mount=()=>fpInstallUi();if(!mount()){const retry=()=>{if(mount())return;requestAnimationFrame(retry)};requestAnimationFrame(retry)}
  document.addEventListener('foamlens-language-change',()=>{const b=document.getElementById('fvProbeMode'),c=document.getElementById('fvProbeClear');if(b)fpSetEnabled(fpState.enabled);if(c)c.textContent=fpUi('Clear probe','Limpiar sonda');fpRenderReadout(fpState.last)});
}
fpInstall();
window.FoamLensFieldProbe={fpMat4Invert,fpRayTriangle,fpPickTriangles,fpRenderedPick,fpClear};
