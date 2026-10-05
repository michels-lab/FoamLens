/* FoamLens Desktop v1.4.1 — synchronized side-by-side 3D case comparison. */

/* FOAMLENS_FIELD_COMPARE_CORE_START */
function fcCloseTime(a,b){
  a=Number(a);b=Number(b);if(!Number.isFinite(a)||!Number.isFinite(b))return false;
  return Math.abs(a-b)<=Math.max(1e-10,Math.max(Math.abs(a),Math.abs(b),1)*1e-9)
}
function fcNearestTime(values,target){
  const a=[...new Set((values||[]).map(Number).filter(Number.isFinite))].sort((x,y)=>x-y),t=Number(target);if(!a.length||!Number.isFinite(t))return NaN;
  let best=a[0],d=Math.abs(best-t);for(let i=1;i<a.length;i++){const nd=Math.abs(a[i]-t);if(nd<d){best=a[i];d=nd}}return best
}
function fcTimeBracket(values,target){
  const a=[...new Set((values||[]).map(Number).filter(Number.isFinite))].sort((x,y)=>x-y),t=Number(target);if(!a.length||!Number.isFinite(t))return{ok:false,lower:NaN,upper:NaN,weight:NaN,exact:false};
  const near=fcNearestTime(a,t);if(fcCloseTime(near,t))return{ok:true,lower:near,upper:near,weight:0,exact:true};
  if(t<a[0]||t>a.at(-1))return{ok:false,lower:a[0],upper:a.at(-1),weight:NaN,exact:false};
  let hi=1;while(hi<a.length&&a[hi]<t)hi++;const lo=Math.max(0,hi-1),lower=a[lo],upper=a[Math.min(hi,a.length-1)],span=upper-lower;
  return span>0?{ok:true,lower,upper,weight:(t-lower)/span,exact:false}:{ok:false,lower,upper,weight:NaN,exact:false}
}
function fcResolveTime(values,target,mode='nearest'){
  const t=Number(target),near=fcNearestTime(values,t);if(!Number.isFinite(near))return{ok:false,time:NaN,delta:NaN,exact:false,interpolated:false};
  const exact=fcCloseTime(near,t);
  if(mode==='exact')return exact?{ok:true,time:near,delta:near-t,exact:true,interpolated:false}:{ok:false,time:near,delta:near-t,exact:false,interpolated:false};
  if(mode==='interpolate'){
    const b=fcTimeBracket(values,t);if(!b.ok)return{ok:false,time:t,delta:NaN,exact:false,interpolated:false,lowerTime:b.lower,upperTime:b.upper};
    if(b.exact)return{ok:true,time:b.lower,delta:b.lower-t,exact:true,interpolated:false,lowerTime:b.lower,upperTime:b.upper,weight:0};
    return{ok:true,time:t,delta:0,exact:false,interpolated:true,lowerTime:b.lower,upperTime:b.upper,weight:b.weight}
  }
  return{ok:true,time:near,delta:near-t,exact,interpolated:false}
}
function fcInterpolateValues(a,b,weight){
  const n=Math.min(a?.length||0,b?.length||0),w=Math.max(0,Math.min(1,Number(weight)||0)),out=new Array(n);
  for(let i=0;i<n;i++){const x=Number(a[i]),y=Number(b[i]);out[i]=Number.isFinite(x)&&Number.isFinite(y)?x+(y-x)*w:NaN}
  return out
}
function fcSharedRange(a,b){
  const valid=x=>x&&Number.isFinite(Number(x.min))&&Number.isFinite(Number(x.max));
  if(!valid(a)&&!valid(b))return{valid:false,min:NaN,max:NaN};
  if(!valid(a))return{valid:true,min:Number(b.min),max:Number(b.max)};
  if(!valid(b))return{valid:true,min:Number(a.min),max:Number(a.max)};
  return{valid:true,min:Math.min(Number(a.min),Number(b.min)),max:Math.max(Number(a.max),Number(b.max))}
}
function fcMeshDiag(mesh){
  const lo=mesh?.boundsMin||[0,0,0],hi=mesh?.boundsMax||[1,1,1];return Math.hypot(Number(hi[0])-Number(lo[0]),Number(hi[1])-Number(lo[1]),Number(hi[2])-Number(lo[2]))||1
}
function fcSyncedCamera(primaryCamera,primaryMesh,compareMesh){
  const lo=compareMesh?.boundsMin||[0,0,0],hi=compareMesh?.boundsMax||[1,1,1],target=lo.map((v,i)=>(Number(v)+Number(hi[i]))/2),pdiag=fcMeshDiag(primaryMesh),cdiag=fcMeshDiag(compareMesh),ratio=Math.max(.05,Number(primaryCamera?.distance)||pdiag)/pdiag;
  return{yaw:Number(primaryCamera?.yaw)||0,pitch:Number(primaryCamera?.pitch)||0,distance:cdiag*ratio,target}
}

function fcArrayEqualNumeric(a,b,tol=0){
  if((a?.length||0)!==(b?.length||0))return false;
  for(let i=0;i<(a?.length||0);i++){const x=Number(a[i]),y=Number(b[i]);if(!Number.isFinite(x)||!Number.isFinite(y)||Math.abs(x-y)>tol)return false}
  return true
}
function fcMeshesEquivalent(a,b){
  if(!a||!b)return{ok:false,reason:'missing-mesh'};
  for(const k of ['pointCount','faceCount','cellCount','internalFaceCount','boundaryFaceCount'])if(Number(a[k])!==Number(b[k]))return{ok:false,reason:k+'-mismatch'};
  const diag=Math.max(fcMeshDiag(a),fcMeshDiag(b),1),tol=diag*1e-9;
  if(!fcArrayEqualNumeric(a.points,b.points,tol))return{ok:false,reason:'point-geometry-mismatch'};
  if(!fcArrayEqualNumeric(a.faceOffsets,b.faceOffsets,0))return{ok:false,reason:'face-offset-mismatch'};
  if(!fcArrayEqualNumeric(a.facePoints,b.facePoints,0))return{ok:false,reason:'face-connectivity-mismatch'};
  if(!fcArrayEqualNumeric(a.owners,b.owners,0))return{ok:false,reason:'owner-mismatch'};
  if(!fcArrayEqualNumeric(a.neighbours,b.neighbours,0))return{ok:false,reason:'neighbour-mismatch'};
  return{ok:true,reason:'equivalent'}
}
function fcDifferenceValues(primary,compare,mode='signed',epsilon=1e-12){
  const n=Math.min(primary?.length||0,compare?.length||0),out=new Array(n),eps=Math.max(Number.EPSILON,Math.abs(Number(epsilon)||1e-12));
  for(let i=0;i<n;i++){const a=Number(primary[i]),b=Number(compare[i]);if(!Number.isFinite(a)||!Number.isFinite(b)){out[i]=NaN;continue}const d=a-b;out[i]=mode==='absolute'?Math.abs(d):mode==='percent'?100*d/Math.max(Math.abs(a),eps):d}
  return out
}
function fcDifferenceRange(values,mode='signed'){
  const finite=(values||[]).map(Number).filter(Number.isFinite);if(!finite.length)return{valid:false,min:NaN,max:NaN,mean:NaN,count:0};
  const mean=finite.reduce((a,b)=>a+b,0)/finite.length;if(mode==='absolute'){const max=Math.max(...finite,0);return{valid:true,min:0,max:max||1,mean,count:finite.length}}
  return fcSymmetricDifferenceRange(finite)
}
function fcSymmetricDifferenceRange(values){
  let m=0,n=0;for(const v of values||[]){const x=Number(v);if(Number.isFinite(x)){m=Math.max(m,Math.abs(x));n++}}
  if(!n)return{valid:false,min:NaN,max:NaN,mean:NaN,count:0};if(m===0)m=1;
  const finite=(values||[]).map(Number).filter(Number.isFinite),mean=finite.reduce((a,b)=>a+b,0)/finite.length;
  return{valid:true,min:-m,max:m,mean,count:n}
}
/* FOAMLENS_FIELD_COMPARE_CORE_END */

async function fcLoadSynchronizedData(c,g,region,target,component,mode=fcMode(),options={}){
  const sync=fcResolveTime(g?.times||[],target,mode);if(!sync.ok)return{ok:false,sync};
  if(!sync.interpolated){
    const data=await fvLoadFrameData(c,g,region,sync.time,component,options);return{ok:true,...data,sync,sourceTimes:[sync.time]}
  }
  const [a,b]=await Promise.all([
    fvLoadFrameData(c,g,region,sync.lowerTime,component,options),
    fvLoadFrameData(c,g,region,sync.upperTime,component,options)
  ]);
  if(String(a.storage)!==String(b.storage))throw new Error(fcUi('Interpolation unavailable: field association changes between bracketing frames.','Interpolación no disponible: la asociación del campo cambia entre los frames vecinos.'));
  if(String(a.parsed?.dimensions||'')!==String(b.parsed?.dimensions||''))throw new Error(fcUi('Interpolation unavailable: dimensions change between bracketing frames.','Interpolación no disponible: las dimensiones cambian entre los frames vecinos.'));
  const compat=fcMeshesEquivalent(a.mesh,b.mesh);if(!compat.ok)throw new Error(fcUi('Interpolation unavailable because the mesh changes between bracketing frames: ','Interpolación no disponible porque la malla cambia entre los frames vecinos: ')+compat.reason);
  if((a.fieldValues?.length||0)!==(b.fieldValues?.length||0))throw new Error(fcUi('Interpolation unavailable: field sizes differ between bracketing frames.','Interpolación no disponible: los tamaños del campo difieren entre los frames vecinos.'));
  const fieldValues=fcInterpolateValues(a.fieldValues,b.fieldValues,sync.weight),range=fvFiniteRange(fieldValues);
  if(!range.valid)throw new Error(fcUi('Interpolated field contains no finite values.','El campo interpolado no contiene valores finitos.'));
  return{ok:true,...a,fieldValues,range,sync,sourceTimes:[sync.lowerTime,sync.upperTime],interpolated:true}
}
function fcSyncText(sync){
  if(!sync)return'—';if(sync.exact)return fcUi('Exact','Exacto');if(sync.interpolated)return fcUi('Interpolated','Interpolado')+' '+fcFmt(sync.lowerTime)+'↔'+fcFmt(sync.upperTime)+' s';
  return fcUi('Nearest','Más cercano')+(Number.isFinite(sync.delta)?' · Δt='+(sync.delta>=0?'+':'')+fcFmt(sync.delta)+' s':'')
}
const fcViewNames={1:'',2:'',3:'',4:''};
function fcDefaultViewName(id){return fcUi('View ','Vista ')+String.fromCharCode(64+Number(id))}
function fcViewDisplayName(id){const n=String(fcViewNames[Number(id)]||'').trim();return n||fcDefaultViewName(id)}
function fcSetViewName(id,name){
  id=Number(id);if(!(id>=1&&id<=4))return false;fcViewNames[id]=String(name||'').trim().slice(0,48);
  const input=id===1?document.getElementById('fcPrimaryName'):id===2?document.getElementById('fcCompareName'):fcExtraDom(id,'Name');if(input&&input.value!==fcViewNames[id])input.value=fcViewNames[id];
  fcUpdateLabels();return true
}
function fcGetViewNames(){return{1:fcViewNames[1],2:fcViewNames[2],3:fcViewNames[3],4:fcViewNames[4]}}
const fcState={
  enabled:false,caseId:null,region:'',fieldName:'',component:'value',fieldStorage:'volume',mesh:null,renderer:null,fieldValues:null,fieldParsed:null,time:NaN,delta:NaN,range:null,lockedRange:null,videoRangeOverride:null,
  spatialHash:null,vectorValues:null,streamlines:[],probe:null,differenceValues:null,differenceRange:null,differenceRenderer:null,seq:0,lastError:'',camera:null,visual:null,sync:null
};
function fcUi(en,es){try{return flUi(en,es)}catch{return en}}
function fcEsc(v){try{return fvEsc(v)}catch{return String(v??'')}}
function fcFmt(v){try{return fvFmt(v)}catch{return Number.isFinite(Number(v))?String(v):'—'}}
function fcCloneCamera(camera){
  const c=camera||fvState.camera||{};return{yaw:Number(c.yaw)||0,pitch:Number(c.pitch)||0,distance:Math.max(1e-10,Number(c.distance)||1),target:Array.isArray(c.target)?c.target.map(Number):[0,0,0]}
}
function fcCamerasLinked(){return document.getElementById('fcLinkCameras')?.checked!==false}
function fcVisualsSynced(){return document.getElementById('fcSyncVisuals')?.checked!==false}
function fcCameraFor(state,mesh){
  if(fcCamerasLinked())return fcSyncedCamera(fvState.camera,fvState.mesh,mesh);
  if(!state.camera)state.camera=fcCloneCamera(fcSyncedCamera(fvState.camera,fvState.mesh,mesh));
  return state.camera
}
function fcMvpForCamera(camera,canvas){
  const c=camera||fvState.camera,d=Math.max(1e-12,c.distance),cp=Math.cos(c.pitch),eye=[c.target[0]+d*cp*Math.sin(c.yaw),c.target[1]+d*Math.sin(c.pitch),c.target[2]+d*cp*Math.cos(c.yaw)],basis=fvCameraBasis(c),near=Math.max(d/1000,1e-8),far=Math.max(d*20,near*100),proj=fvPerspective(Math.PI/4,Math.max(1,canvas.width)/Math.max(1,canvas.height),near,far),view=fvLookAt(eye,c.target,basis.upRef||[0,1,0]);return fvMat4Mul(proj,view)
}
function fcPanCamera(camera,dx,dy,canvas){
  const b=fvCameraBasis(camera),scale=Math.max(1e-12,camera.distance)*2*Math.tan(Math.PI/8)/Math.max(80,Number(canvas?.clientHeight)||500);for(let a=0;a<3;a++)camera.target[a]+=(-Number(dx)*b.right[a]+Number(dy)*b.up[a])*scale
}
function fcFitCameraState(state,mesh){
  if(!state||!mesh)return;const min=mesh.boundsMin,max=mesh.boundsMax,center=min.map((v,i)=>(Number(v)+Number(max[i]))/2),diag=Math.hypot(Number(max[0])-Number(min[0]),Number(max[1])-Number(min[1]),Number(max[2])-Number(min[2]))||1,c=state.camera||fcCloneCamera(fvState.camera);c.target=center;c.distance=diag*1.65;state.camera=c
}
function fcResyncCameras(){
  fcState.camera=fcCloneCamera(fcSyncedCamera(fvState.camera,fvState.mesh,fcState.mesh));for(const state of fcExtraViews)if(state.mesh)state.camera=fcCloneCamera(fcSyncedCamera(fvState.camera,fvState.mesh,state.mesh));fcRender();fcRenderDifference();fcRenderExtras()
}
function fcFitAllCameras(){
  fvCameraFitCurrent();if(!fcCamerasLinked()){fcFitCameraState(fcState,fcState.mesh);for(const state of fcExtraViews)fcFitCameraState(state,state.mesh)}fcRender();fcRenderDifference();fcRenderExtras()
}
function fcGlobalVisual(){
  return{palette:document.getElementById('fvPalette')?.value||'viridis',opacity:fvClamp(document.getElementById('fvOpacity')?.value??.92,.05,1),surface:document.getElementById('fvSurface')?.checked!==false,edges:document.getElementById('fvEdges')?.checked!==false,slice:!!document.getElementById('fvSlice')?.checked,iso:!!document.getElementById('fvIso')?.checked,vectors:!!document.getElementById('fvVectors')?.checked,streamlines:!!document.getElementById('fvStreamlines')?.checked}
}
function fcVisualFor(state,prefix='fcView2'){
  if(fcVisualsSynced())return fcGlobalVisual();const g=fcGlobalVisual();if(!state.visual)state.visual={...g};
  const palette=document.getElementById(prefix+'Palette'),opacity=document.getElementById(prefix+'Opacity');
  if(palette)state.visual.palette=palette.value||state.visual.palette||g.palette;if(opacity)state.visual.opacity=fvClamp(opacity.value,.05,1);
  for(const [suffix,key] of [['Surface','surface'],['Edges','edges'],['Slice','slice'],['Iso','iso'],['Vectors','vectors'],['Streamlines','streamlines']]){const e=document.getElementById(prefix+suffix);if(e)state.visual[key]=!!e.checked}
  return state.visual
}
function fcSyncVisualUi(){
  const independent=!fcVisualsSynced();document.getElementById('fcView2Visuals')?.classList.toggle('hidden',!independent);for(const state of fcExtraViews)fcExtraDom(state.id,'Visuals')?.classList.toggle('hidden',!independent)
}
function fcUnit(parsed){
  try{return parsed?.dimensions&&typeof pmUnitFromDimensions==='function'?pmUnitFromDimensions(parsed.dimensions):''}catch{return''}
}
function fcLegendMarkup(field,component,parsed,range,palette='viridis'){
  if(!range?.valid)return'';const unit=fcUnit(parsed),name=String(field||parsed?.object||'Field'),comp=component&&component!=='value'?' · '+String(component):'',delta=Number(range.max)-Number(range.min),uniform=typeof fvRangeUniform==='function'?fvRangeUniform(range):Math.abs(delta)<=Math.max(Math.abs(Number(range.min)),Math.abs(Number(range.max)),1)*1e-12;
  if(uniform)return '<div class="fcLegendTitle">'+fcEsc(name+comp)+(unit?' <span>['+fcEsc(unit)+']</span>':'')+'</div><div class="fcLegendUniform">'+fcUi('Uniform','Uniforme')+' · '+fcEsc(typeof fvFmtRange==='function'?fvFmtRange(range.min,range):fcFmt(range.min))+'</div>';
  const grad=typeof fvLegendGradient==='function'?fvLegendGradient(palette):'linear-gradient(90deg,#440154,#21908d,#fde725)',fmt=v=>fcEsc(typeof fvFmtRange==='function'?fvFmtRange(v,range):fcFmt(v));
  return '<div class="fcLegendTitle">'+fcEsc(name+comp)+(unit?' <span>['+fcEsc(unit)+']</span>':'')+'</div><div class="fcLegendBar" style="background:'+fcEsc(grad)+'"></div><div class="fcLegendTicks"><span>'+fmt(range.min)+'</span><span>'+fmt((Number(range.min)+Number(range.max))/2)+'</span><span>'+fmt(range.max)+'</span></div><div class="fcLegendDelta">Δ '+fmt(delta)+'</div>'
}
function fcUpdateViewportLegend(id,field,component,parsed,range,palette=null){
  const e=document.getElementById(id);if(!e)return;palette=palette||document.getElementById('fvPalette')?.value||'viridis';e.innerHTML=fcLegendMarkup(field,component,parsed,range,palette);e.classList.toggle('hidden',!range?.valid)
}
function fcProbeEnabled(){try{return !!window.FoamLensFieldProbe?.isEnabled?.()}catch{return false}}
function fcProbeCore(){return window.FoamLensFieldProbe||{}}
function fcCanvasRay(canvas,event,mvp){
  const core=fcProbeCore(),invert=core.fpMat4Invert;if(!invert||!canvas||!mvp)return null;
  const rect=canvas.getBoundingClientRect(),x=2*(event.clientX-rect.left)/Math.max(rect.width,1)-1,y=1-2*(event.clientY-rect.top)/Math.max(rect.height,1),inv=invert(mvp);if(!inv)return null;
  const tx=(m,v)=>[m[0]*v[0]+m[4]*v[1]+m[8]*v[2]+m[12]*v[3],m[1]*v[0]+m[5]*v[1]+m[9]*v[2]+m[13]*v[3],m[2]*v[0]+m[6]*v[1]+m[10]*v[2]+m[14]*v[3],m[3]*v[0]+m[7]*v[1]+m[11]*v[2]+m[15]*v[3]],pd=v=>Math.abs(Number(v[3]))>1e-30?[v[0]/v[3],v[1]/v[3],v[2]/v[3]]:null,near=pd(tx(inv,[x,y,-1,1])),far=pd(tx(inv,[x,y,1,1]));if(!near||!far)return null;
  const d=[far[0]-near[0],far[1]-near[1],far[2]-near[2]],l=Math.hypot(...d)||1;return{origin:near,dir:d.map(v=>v/l)}
}
function fcPickView(mesh,fieldValues,storage,canvas,event,mvp){
  const core=fcProbeCore(),pick=core.fpPickTriangles;if(!pick||!mesh||!fieldValues)return null;const ray=fcCanvasRay(canvas,event,mvp);if(!ray)return null;
  if(String(storage)==='surface'){
    const g=fvBuildInternalFaceBuffers(mesh),hit=pick(ray.origin,ray.dir,g.positions,{kind:'internalFace',faceIds:g.triangleFaces});
    if(hit&&hit.face!=null)hit.value=Number(fieldValues[hit.face]);return hit
  }
  const b=fvBuildSurfaceBuffers(mesh),tri=mesh.surfaceTriangles||[];
  if(String(storage)==='point')return pick(ray.origin,ray.dir,b.surfacePositions,{kind:'pointSurface',values:tri.map(i=>Number(fieldValues[i]))});
  const hit=pick(ray.origin,ray.dir,b.surfacePositions,{kind:'surface',cellIds:(mesh.surfaceOwners||[]).map(Number)});if(hit&&hit.cell!=null)hit.value=Number(fieldValues[hit.cell]);return hit
}
function fcEnsureProbeOverlay(viewport,id){
  if(!viewport)return null;let e=document.getElementById(id);if(e)return e;e=document.createElement('div');e.id=id;e.className='fcProbeMarker hidden';e.innerHTML='<span></span>';viewport.appendChild(e);return e
}
function fcUpdateProbeOverlay(viewport,canvas,id,probe,mvp){
  const e=fcEnsureProbeOverlay(viewport,id);if(!e||!canvas||!probe?.point||!mvp){e?.classList.add('hidden');return}
  const p=probe.point,v=[Number(p[0]),Number(p[1]),Number(p[2]),1],clip=[mvp[0]*v[0]+mvp[4]*v[1]+mvp[8]*v[2]+mvp[12],mvp[1]*v[0]+mvp[5]*v[1]+mvp[9]*v[2]+mvp[13],mvp[2]*v[0]+mvp[6]*v[1]+mvp[10]*v[2]+mvp[14],mvp[3]*v[0]+mvp[7]*v[1]+mvp[11]*v[2]+mvp[15]];if(Math.abs(clip[3])<1e-30){e.classList.add('hidden');return}
  const x=clip[0]/clip[3],y=clip[1]/clip[3],z=clip[2]/clip[3];if(![x,y,z].every(Number.isFinite)||z<-1||z>1){e.classList.add('hidden');return}
  const cr=canvas.getBoundingClientRect(),vr=viewport.getBoundingClientRect();e.style.left=(cr.left-vr.left+(x+1)*.5*cr.width)+'px';e.style.top=(cr.top-vr.top+(1-y)*.5*cr.height)+'px';e.classList.remove('hidden')
}
function fcStatsMarkup(label,mesh,range,parsed,storage,probe){
  if(!mesh||!range?.valid)return'<div class="fcStatsTitle">'+fcEsc(label)+'</div><div class="smallnote">—</div>';
  const unit=fcUnit(parsed),suffix=unit?' '+fcEsc(unit):'',delta=Number(range.max)-Number(range.min),selected=probe&&Number.isFinite(Number(probe.value))?(probe.cell!=null?fcUi('Cell','Celda')+' #'+Number(probe.cell).toLocaleString():probe.face!=null?fcUi('Face','Cara')+' #'+Number(probe.face).toLocaleString():fcUi('Selected','Seleccionado'))+' · '+fcFmt(probe.value)+suffix:'—';
  return'<div class="fcStatsTitle">'+fcEsc(label)+'</div><div class="fcStatsCells">'+
    '<div><span>'+fcUi('Cells','Celdas')+'</span><b>'+Number(mesh.cellCount||0).toLocaleString()+'</b></div>'+
    '<div><span>'+fcUi('Association','Asociación')+'</span><b>'+fcEsc(fvAssociationLabel(storage))+'</b></div>'+
    '<div><span>Min</span><b>'+fcFmt(range.min)+suffix+'</b></div>'+
    '<div><span>Max</span><b>'+fcFmt(range.max)+suffix+'</b></div>'+
    '<div><span>Δ</span><b>'+fcFmt(delta)+suffix+'</b></div>'+
    '<div><span>'+fcUi('Mean','Media')+'</span><b>'+fcFmt(range.mean)+suffix+'</b></div>'+
    '<div class="fcSelectedStat"><span>'+fcUi('Selected','Seleccionado')+'</span><b>'+fcEsc(selected)+'</b></div></div>'
}
function fcUpdateStatsGrid(){
  const root=document.getElementById('fcStatsGrid');if(!root)return;root.classList.toggle('hidden',!fcState.enabled);if(!fcState.enabled)return;
  const cards=[],primaryRange=fvFiniteRange(fvState.fieldValues||[]),primaryProbe=window.FoamLensFieldProbe?.getLast?.()||null;
  cards.push('<div class="fcStatsCard">'+fcStatsMarkup((fvCase()?.name||fcUi('View','Vista')+' 1')+' · '+(fvState.fieldName||'—'),fvState.mesh,primaryRange,fvState.fieldParsed,fvState.fieldStorage,primaryProbe)+'</div>');
  if(fcState.mesh&&fcState.fieldValues)cards.push('<div class="fcStatsCard">'+fcStatsMarkup((fcCase()?.name||fcUi('View','Vista')+' 2')+' · '+(fcState.fieldName||'—'),fcState.mesh,fcState.range,fcState.fieldParsed,fcState.fieldStorage,fcState.probe)+'</div>');
  for(const s of fcExtraViews)if(s.mesh&&s.fieldValues)cards.push('<div class="fcStatsCard">'+fcStatsMarkup((fcExtraCase(s)?.name||fcUi('View','Vista')+' '+s.id)+' · '+(s.fieldName||'—'),s.mesh,s.range,s.fieldParsed,s.storage,s.probe)+'</div>');
  root.innerHTML=cards.join('')
}
function fcDriveSharedCamera(canvas,state=fcState,meshFn=()=>state.mesh,renderFn=()=>{fcRender();fcRenderDifference();fcRenderExtras()}){
  if(!canvas||canvas.dataset.fcSharedCamera)return;canvas.dataset.fcSharedCamera='1';let drag=null;
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
  canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture?.(e.pointerId);const cam=fcCamerasLinked()?fvState.camera:fcCameraFor(state,meshFn());drag={x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,yaw:cam.yaw,pitch:cam.pitch,distance:cam.distance,mode:e.button===1||e.button===2?'pan':fvState.interactionMode||'orbit'}});
  canvas.addEventListener('pointermove',e=>{canvas.style.cursor=fcProbeEnabled()?'crosshair':'';if(!drag)return;const cam=fcCamerasLinked()?fvState.camera:fcCameraFor(state,meshFn()),dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(drag.mode==='orbit'){cam.yaw=drag.yaw+dx*.008;cam.pitch=fvClamp(drag.pitch+dy*.008,-Math.PI/2+1e-4,Math.PI/2-1e-4)}else if(drag.mode==='pan'){fcPanCamera(cam,e.clientX-drag.lastX,e.clientY-drag.lastY,canvas);drag.lastX=e.clientX;drag.lastY=e.clientY}else if(drag.mode==='zoom')cam.distance=Math.max(1e-10,drag.distance*Math.exp(dy*.01));if(fcCamerasLinked())fvRender();else renderFn()});
  const end=()=>{drag=null};canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);
  canvas.addEventListener('wheel',e=>{e.preventDefault();const cam=fcCamerasLinked()?fvState.camera:fcCameraFor(state,meshFn());cam.distance=Math.max(1e-10,cam.distance*Math.exp(e.deltaY*.001));if(fcCamerasLinked())fvRender();else renderFn()},{passive:false});
  canvas.addEventListener('dblclick',()=>{if(fcCamerasLinked())fvCameraFitCurrent();else{fcFitCameraState(state,meshFn());renderFn()}})
}
function fcInstallViewProbe(canvas,getContext){
  if(!canvas||canvas.dataset.fcProbe)return;canvas.dataset.fcProbe='1';let down=null;
  canvas.addEventListener('pointerdown',e=>{if(fcProbeEnabled())down={x:e.clientX,y:e.clientY}});
  canvas.addEventListener('click',e=>{if(!fcProbeEnabled())return;const d=down?Math.hypot(e.clientX-down.x,e.clientY-down.y):0;down=null;if(d>5)return;const ctx=getContext(),hit=fcPickView(ctx.mesh,ctx.values,ctx.storage,canvas,e,ctx.mvp());ctx.setProbe(hit);fcUpdateStatsGrid();ctx.render()})
}

function fcCase(){return cases.find(c=>String(c.id)===String(document.getElementById('fcCase')?.value))}
function fcRegion(){return document.getElementById('fcRegion')?.value||''}
function fcMode(){return document.getElementById('fcSync')?.value||'nearest'}
function fcCurrentFieldName(){return document.getElementById('fcField')?.value||fvState.fieldName||document.getElementById('fvField')?.value||''}
function fcCurrentComponent(){return document.getElementById('fcComponent')?.value||fvState.component||document.getElementById('fvComponent')?.value||'value'}
function fcMeshFor(c,region){return fvMeshes(c).find(g=>String(g.region||'')===String(region||'')&&g.complete)}
function fcFieldFor(c,region,name){return fvFieldGroups(c,region,null,'any').find(g=>g.name===name)}
function fcVectorFor(c,region,name){return fvFieldGroups(c,region,'vector').find(g=>g.name===name)}
function fcClearRenderer(){
  const r=fcState.renderer;if(r){r.surfaceCount=0;r.edgeCount=0;r.sliceCount=0;r.isoCount=0;r.vectorCount=0;r.lineCount=0;r.probeCount=0}const dr=fcState.differenceRenderer;if(dr){dr.surfaceCount=0;dr.edgeCount=0;dr.sliceCount=0;dr.isoCount=0;dr.vectorCount=0;dr.lineCount=0}fcState.differenceValues=null;fcState.differenceRange=null;fcState.mesh=null;fcState.fieldValues=null;fcState.fieldParsed=null;fcState.vectorValues=null;fcState.streamlines=[];fcState.probe=null;fcRender();fcUpdateStatsGrid()
}
function fcSetStatus(text,error=false){
  fcState.lastError=error?String(text||''):'';const e=document.getElementById('fcStatus');if(e){e.textContent=String(text||'');e.classList.toggle('error',!!error)}
}
function fcUpdateComparisonStatus(){
  const bar=document.getElementById('fcComparisonStatus');if(!bar)return;
  const enabled=!!document.getElementById('fcEnabled')?.checked;bar.classList.toggle('hidden',!enabled);if(!enabled){bar.innerHTML='';return}
  const pc=fvCase(),cc=fcCase(),sync=fcSyncText(fcState.sync),same=fcSameQuantity(),meshCompat=fvState.mesh&&fcState.mesh?fcMeshesEquivalent(fvState.mesh,fcState.mesh):null,mode=document.getElementById('fcDifferenceMode')?.value||'signed',cams=fcCamerasLinked(),visuals=fcVisualsSynced();
  const chip=(label,value,state='neutral')=>'<span class="fcStatusChip '+state+'"><b>'+fcEsc(label)+'</b> '+fcEsc(value)+'</span>';
  const parts=[
    chip('A',fcViewDisplayName(1)+' · '+(pc?.name||'—')),
    chip('B',fcViewDisplayName(2)+' · '+(cc?.name||'—')),
    chip(fcUi('Time','Tiempo'),sync,fcState.sync?.exact||fcState.sync?.interpolated?'good':'neutral'),
    chip(fcUi('Quantity','Cantidad'),same?fcUi('compatible','compatible'):fcUi('different','diferente'),same?'good':'warn'),
    chip(fcUi('Mesh','Malla'),meshCompat?(meshCompat.ok?fcUi('compatible','compatible'):fcUi('different','diferente')):'—',meshCompat?(meshCompat.ok?'good':'warn'):'neutral'),
    chip('Δ',mode),
    chip(fcUi('Cameras','Cámaras'),cams?fcUi('linked','enlazadas'):fcUi('independent','independientes')),
    chip(fcUi('Visuals','Visuales'),visuals?fcUi('linked','enlazados'):fcUi('independent','independientes'))
  ];
  bar.innerHTML=parts.join('')
}
function fcUpdateLabels(){
  const primary=document.getElementById('fcPrimaryLabel'),compare=document.getElementById('fcCompareLabel'),pc=fvCase(),cc=fcCase(),pb=document.getElementById('fcPrimaryTimeBadge'),cb=document.getElementById('fcCompareTimeBadge');
  if(primary)primary.textContent=fcViewDisplayName(1)+' · '+(pc?.name||fcUi('Primary case','Caso principal'))+' · '+(fvState.fieldName||document.getElementById('fvField')?.value||'—')+(Number.isFinite(fvState.time)?' · t='+fcFmt(fvState.time)+' s':'');
  if(compare)compare.textContent=fcViewDisplayName(2)+' · '+(cc?.name||fcUi('Comparison case','Caso comparado'))+' · '+(fcState.fieldName||fcCurrentFieldName()||'—')+(Number.isFinite(fcState.time)?' · t='+fcFmt(fcState.time)+' s':'');
  if(pb)pb.textContent=Number.isFinite(fvState.time)?'A · t='+fcFmt(fvState.time)+' s':'A · —';
  if(cb)cb.textContent='B · '+fcSyncText(fcState.sync);fcUpdateComparisonStatus()
}
function fcRefreshSelectors(preserve=true){
  const caseSel=document.getElementById('fcCase'),regionSel=document.getElementById('fcRegion'),fieldSel=document.getElementById('fcField'),componentSel=document.getElementById('fcComponent');if(!caseSel||!regionSel||!fieldSel||!componentSel)return;
  const eligible=(cases||[]).filter(c=>fvCaseViewAvailable(c)),oldCase=preserve?caseSel.value:'';
  caseSel.innerHTML=eligible.length?eligible.map(c=>'<option value="'+fcEsc(c.id)+'">'+fcEsc(c.name)+'</option>').join(''):'<option value="">—</option>';
  if(oldCase&&eligible.some(c=>String(c.id)===String(oldCase)))caseSel.value=oldCase;else{const primaryId=String(document.getElementById('fvCase')?.value||'');if(eligible.some(c=>String(c.id)===primaryId))caseSel.value=primaryId}
  const selectedCase=fcCase(),oldRegion=preserve?regionSel.value:'',regions=typeof fvReadyRegions==='function'?fvReadyRegions(selectedCase):fvMeshes(selectedCase).filter(g=>g.complete).map(g=>String(g.region||''));
  regionSel.innerHTML=regions.length?regions.map(r=>'<option value="'+fcEsc(r)+'">'+fcEsc(r||fcUi('Default region','Región predeterminada'))+'</option>').join(''):'<option value="">—</option>';
  if(regions.includes(oldRegion))regionSel.value=oldRegion;else{const primaryRegion=document.getElementById('fvRegion')?.value||'';if(regions.includes(primaryRegion))regionSel.value=primaryRegion}
  const region=regionSel.value||'',groups=fvFieldGroups(selectedCase,region,null,'any').filter(g=>['scalar','vector'].includes(g.kind)),oldField=preserve?fieldSel.value:'';
  fieldSel.innerHTML=groups.length?groups.map(g=>'<option value="'+fcEsc(g.name)+'">'+fcEsc(g.name)+' · '+fcEsc(g.kind)+' · '+fcEsc(fvAssociationLabel(g.storage))+'</option>').join(''):'<option value="">—</option>';
  if(oldField&&groups.some(g=>g.name===oldField))fieldSel.value=oldField;else{const primaryField=document.getElementById('fvField')?.value||'';if(groups.some(g=>g.name===primaryField))fieldSel.value=primaryField}
  const group=groups.find(g=>g.name===fieldSel.value),components=typeof fvFieldComponents==='function'?fvFieldComponents(group):[{v:'value',t:fcUi('Value','Valor')}],oldComp=preserve?componentSel.value:'';
  componentSel.innerHTML=components.map(o=>'<option value="'+fcEsc(o.v)+'">'+fcEsc(o.t)+'</option>').join('');if(oldComp&&components.some(o=>o.v===oldComp))componentSel.value=oldComp;else{const primaryComp=document.getElementById('fvComponent')?.value||'value';if(components.some(o=>o.v===primaryComp))componentSel.value=primaryComp}
  const badge=document.getElementById('fcBadge');if(badge)badge.textContent=eligible.length?eligible.length+' '+fcUi('3D cases','casos 3D'):fcUi('no 3D case','sin caso 3D');
  fcUpdateLabels()
}
function fcMvp(canvas){return fcMvpForCamera(fcCameraFor(fcState,fcState.mesh),canvas)}
function fcRender(exportSize=null){
  if(!fcState.enabled)return;const r=fcState.renderer,canvas=document.getElementById('fcCanvas');if(!r||!canvas||!fcState.mesh)return;const gl=r.gl,rect=canvas.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1),forced=exportSize&&Number(exportSize.width)>1&&Number(exportSize.height)>1,w=forced?Math.round(Number(exportSize.width)):Math.max(2,Math.round(rect.width*dpr)),h=forced?Math.round(Number(exportSize.height)):Math.max(2,Math.round(rect.height*dpr));
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}gl.viewport(0,0,w,h);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.useProgram(r.program);gl.uniformMatrix4fv(r.mvp,false,fcMvp(canvas));
  const visual=fcVisualFor(fcState,'fcView2'),showSurface=visual.surface,showEdges=visual.edges,showSlice=visual.slice,showIso=visual.iso,opacity=visual.opacity,sliceOpacity=fvClamp(document.getElementById('fvSliceOpacity')?.value??.96,.05,1),isoOpacity=fvClamp(document.getElementById('fvIsoOpacity')?.value??.88,.05,1),interiorActive=showSlice||showIso;
  if(showSurface){const faceAssoc=fcState.fieldStorage==='surface';gl.depthMask(!interiorActive&&!faceAssoc);fvBindDraw(r,r.surfacePos,r.surfaceColor,r.surfaceCount,gl.TRIANGLES,faceAssoc?Math.min(opacity,.16):(interiorActive?Math.min(opacity,.28):opacity));gl.depthMask(true);if(faceAssoc){gl.depthMask(false);fvBindDraw(r,r.faceFieldPos,r.faceFieldColor,r.faceFieldCount,gl.TRIANGLES,opacity);gl.depthMask(true)}}
  if(showSlice&&fcState.fieldStorage!=='surface'){gl.depthFunc(gl.LEQUAL);fvBindDraw(r,r.slicePos,r.sliceColor,r.sliceCount,gl.TRIANGLES,sliceOpacity)}
  if(showIso&&fcState.fieldStorage!=='surface'){gl.depthFunc(gl.LEQUAL);fvBindDraw(r,r.isoPos,r.isoColor,r.isoCount,gl.TRIANGLES,isoOpacity)}
  if(showEdges){gl.depthFunc(gl.LEQUAL);fvBindDraw(r,r.edgePos,r.edgeColor,r.edgeCount,gl.LINES,Math.min(1,opacity+.08))}
  if(visual.vectors)fvBindDraw(r,r.vectorPos,r.vectorColor,r.vectorCount,gl.LINES,1);
  if(visual.streamlines)fvBindDraw(r,r.linePos,r.lineColor,r.lineCount,gl.LINES,1);
  fcUpdateProbeOverlay(document.getElementById('fcViewport'),canvas,'fcProbeMarker',fcState.probe,fcMvp(canvas))
}
function fcUploadMesh(mesh){
  const canvas=document.getElementById('fcCanvas');if(!canvas)return;if(!fcState.renderer)fcState.renderer=fvCreateRenderer(canvas);const r=fcState.renderer,b=fvBuildSurfaceBuffers(mesh),fb=fvBuildInternalFaceBuffers(mesh);
  fvUploadBuffer(r,'surfacePos',b.surfacePositions);r.surfaceCount=b.surfacePositions.length/3;fvUploadBuffer(r,'edgePos',b.edgePositions);r.edgeCount=b.edgePositions.length/3;fvUploadBuffer(r,'faceFieldPos',fb.positions);r.faceFieldCount=0;mesh._fcInternalTriangleFaces=fb.triangleFaces;
  fvUploadBuffer(r,'edgeColor',fvConstantColors(r.edgeCount,[.12,.16,.22]));r.sliceCount=0;r.isoCount=0;r.vectorCount=0;r.lineCount=0;fcState.spatialHash=fvBuildSpatialHash(mesh.cellCenters,mesh.boundsMin,mesh.boundsMax,mesh.cellCount)
}
function fcUpdateDerived(range){
  range=fcState.videoRangeOverride?.valid?fcState.videoRangeOverride:range;const r=fcState.renderer,mesh=fcState.mesh,values=fcState.fieldValues,storage=String(fcState.fieldStorage||'volume');if(!r||!mesh||!values||!range?.valid)return;const palette=fcVisualFor(fcState,'fcView2').palette;r.faceFieldCount=0;
  if(storage==='point')fvUploadBuffer(r,'surfaceColor',fvPointSurfaceColors(mesh,values,range.min,range.max,palette),r.gl.DYNAMIC_DRAW);
  else if(storage==='surface'){
    fvUploadBuffer(r,'surfaceColor',fvConstantColors(r.surfaceCount,[.32,.38,.46]),r.gl.DYNAMIC_DRAW);const triFaces=mesh._fcInternalTriangleFaces||[],colors=fvInternalFaceColors(triFaces,values,range.min,range.max,palette);fvUploadBuffer(r,'faceFieldColor',colors,r.gl.DYNAMIC_DRAW);r.faceFieldCount=triFaces.length*3
  }else fvUploadBuffer(r,'surfaceColor',fvSurfaceColors(mesh,values,range.min,range.max,palette),r.gl.DYNAMIC_DRAW);
  const interior=storage!=='surface',visual=fcVisualFor(fcState,'fcView2');
  if(interior&&visual.slice){
    const axis=document.getElementById('fvSliceAxis')?.value||'x',position=Number(document.getElementById('fvSlicePosition')?.value)||0,geom=storage==='point'?fvBuildPointSliceGeometry(mesh,values,axis,position):fvBuildSliceGeometry(mesh,values,axis,position);
    fvUploadBuffer(r,'slicePos',geom.positions,r.gl.DYNAMIC_DRAW);fvUploadBuffer(r,'sliceColor',fvSliceColors(geom.values,range,palette),r.gl.DYNAMIC_DRAW);r.sliceCount=geom.positions.length/3
  }else r.sliceCount=0;
  if(interior&&visual.iso&&typeof fvBuildIsoSurfaceGeometry==='function'){
    const iso=Number(document.getElementById('fvIsoValue')?.value),geom=storage==='point'&&typeof fvBuildPointIsoSurfaceGeometry==='function'?fvBuildPointIsoSurfaceGeometry(mesh,values,iso):fvBuildIsoSurfaceGeometry(mesh,values,iso);fvUploadBuffer(r,'isoPos',geom.positions,r.gl.DYNAMIC_DRAW);fvUploadBuffer(r,'isoColor',fvIsoColors(geom.positions.length/3,iso,range,palette),r.gl.DYNAMIC_DRAW);r.isoCount=geom.positions.length/3
  }else r.isoCount=0;
  fcRender()
}

function fcDifferenceMvp(canvas){return fcMvp(canvas)}
function fcRenderDifference(exportSize=null){
  if(!fcState.enabled||!document.getElementById('fcDifference')?.checked)return;const r=fcState.differenceRenderer,canvas=document.getElementById('fcDifferenceCanvas');if(!r||!canvas||!fvState.mesh||!fcState.differenceValues)return;
  const gl=r.gl,rect=canvas.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1),forced=exportSize&&Number(exportSize.width)>1&&Number(exportSize.height)>1,w=forced?Math.round(Number(exportSize.width)):Math.max(2,Math.round(rect.width*dpr)),h=forced?Math.round(Number(exportSize.height)):Math.max(2,Math.round(rect.height*dpr));
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}gl.viewport(0,0,w,h);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.useProgram(r.program);gl.uniformMatrix4fv(r.mvp,false,fcDifferenceMvp(canvas));
  const opacity=fvClamp(document.getElementById('fvOpacity')?.value??.92,.05,1),showEdges=document.getElementById('fvEdges')?.checked!==false;
  fvBindDraw(r,r.surfacePos,r.surfaceColor,r.surfaceCount,gl.TRIANGLES,opacity);
  if(showEdges){gl.depthFunc(gl.LEQUAL);fvBindDraw(r,r.edgePos,r.edgeColor,r.edgeCount,gl.LINES,Math.min(1,opacity+.08))}
}
function fcUpdateDifference(primaryMesh,compareMesh,primaryValues,compareValues){
  const enabled=!!document.getElementById('fcDifference')?.checked,viewport=document.getElementById('fcDifferenceViewport'),status=document.getElementById('fcDifferenceStatus');
  viewport?.classList.toggle('hidden',!enabled);if(!enabled){fcState.differenceValues=null;fcState.differenceRange=null;fcUpdateLayout();return}
  if(!fcSameQuantity()){fcState.differenceValues=null;fcState.differenceRange=null;flSetIssue(status,'different field/component/association/dimensions; difference unavailable',{analysis:'3D Difference'});fcUpdateLayout();return}
  if(String(fvState.fieldStorage||'volume')!=='volume'||String(fcState.fieldStorage||'volume')!=='volume'){fcState.differenceValues=null;fcState.differenceRange=null;flSetIssue(status,'3D difference currently requires cell-associated volume fields',{analysis:'3D Difference'});fcUpdateLayout();return}
  const compat=fcMeshesEquivalent(primaryMesh,compareMesh);if(!compat.ok){fcState.differenceValues=null;fcState.differenceRange=null;flSetIssue(status,'mesh mismatch: '+compat.reason+'; difference unavailable',{analysis:'3D Difference'});fcUpdateLayout();return}
  const mode=document.getElementById('fcDifferenceMode')?.value||'signed',epsilon=Number(document.getElementById('fcPercentEpsilon')?.value)||1e-12,values=fcDifferenceValues(primaryValues,compareValues,mode,epsilon),range=fcDifferenceRange(values,mode);if(!range.valid){flSetIssue(status,'no-compatible-values',{analysis:'3D Difference'});return}
  const canvas=document.getElementById('fcDifferenceCanvas');if(!fcState.differenceRenderer)fcState.differenceRenderer=fvCreateRenderer(canvas);const r=fcState.differenceRenderer,b=fvBuildSurfaceBuffers(primaryMesh);
  fvUploadBuffer(r,'surfacePos',b.surfacePositions);r.surfaceCount=b.surfacePositions.length/3;fvUploadBuffer(r,'edgePos',b.edgePositions);r.edgeCount=b.edgePositions.length/3;fvUploadBuffer(r,'edgeColor',fvConstantColors(r.edgeCount,[.12,.16,.22]));
  fvUploadBuffer(r,'surfaceColor',fvSurfaceColors(primaryMesh,values,range.min,range.max,mode==='absolute'?'turbo':'coolwarm'),r.gl.DYNAMIC_DRAW);
  fcState.differenceValues=values;fcState.differenceRange=range;fcState.differenceMode=mode;const formula=mode==='absolute'?'|A − B|':mode==='percent'?'100·(A − B)/max(|A|, ε)':'A − B',diffLabel=document.getElementById('fcDifferenceLabel'),diffBadge=document.getElementById('fcDifferenceTimeBadge');if(diffLabel)diffLabel.textContent=(mode==='absolute'?fcUi('Absolute difference','Diferencia absoluta'):mode==='percent'?fcUi('Percent difference','Diferencia porcentual'):fcUi('Signed difference','Diferencia con signo'))+' · '+formula;if(diffBadge)diffBadge.textContent='Δ · '+fcSyncText(fcState.sync);if(status){status.classList.remove('error');status.textContent=formula+' · '+(fvCase()?.name||fcUi('Primary','Principal'))+' vs '+(fcCase()?.name||fcUi('Comparison','Comparado'))+' · ['+fcFmt(range.min)+', '+fcFmt(range.max)+']'+(mode==='percent'?' %':'')}
  fcUpdateLayout();fcRenderDifference()
}
async function fcLoadVectorAtTime(c,g,region,time,mesh){
  const layout=fvResolveFieldMeshLayout(c,region,g,time);if(!layout.valid)return{ok:false,reason:layout.reason};
  const meshInfo=await fvLoadMeshForLayout(c,layout,region,time),compat=fcMeshesEquivalent(mesh,meshInfo.mesh);if(!compat.ok)return{ok:false,reason:'vector-mesh-'+compat.reason};
  const set=await fvLoadFieldSetCached(c.id,g.name,time,region);let vectors=null;
  if(mesh.decomposed){vectors=fvCombinePartitionVectors(mesh,set)}
  else{const parsed=fvPickFieldPart(set);vectors=fvVectorArray(parsed,mesh.cellCount)}
  return vectors?.length===mesh.cellCount?{ok:true,vectors,time,layout}:{ok:false,reason:'vector-field-size-mismatch'}
}
async function fcLoadSynchronizedVectors(c,g,region,target,mesh,mode=fcMode()){
  const sync=fcResolveTime(g?.times||[],target,mode);if(!sync.ok)return{ok:false,sync,reason:'time-unavailable'};
  if(!sync.interpolated){const one=await fcLoadVectorAtTime(c,g,region,sync.time,mesh);return{...one,sync}}
  const [a,b]=await Promise.all([fcLoadVectorAtTime(c,g,region,sync.lowerTime,mesh),fcLoadVectorAtTime(c,g,region,sync.upperTime,mesh)]);
  if(!a.ok||!b.ok)return{ok:false,sync,reason:a.reason||b.reason||'vector-bracket-unavailable'};
  if(a.vectors.length!==b.vectors.length)return{ok:false,sync,reason:'vector-bracket-size-mismatch'};
  const w=Math.max(0,Math.min(1,Number(sync.weight)||0)),vectors=a.vectors.map((v,i)=>{const q=b.vectors[i];return[0,1,2].map(k=>Number(v[k])+(Number(q[k])-Number(v[k]))*w)});
  return{ok:true,sync,vectors,sourceTimes:[sync.lowerTime,sync.upperTime]}
}
async function fcUpdateVectors(targetTime,seq){
  const r=fcState.renderer,mesh=fcState.mesh;if(!r||!mesh)return;const visual=fcVisualFor(fcState,'fcView2'),showV=visual.vectors,showS=visual.streamlines;if(!showV&&!showS){r.vectorCount=0;r.lineCount=0;fcRender();return}
  const c=fcCase(),region=fcRegion(),name=document.getElementById('fvVector')?.value||'',g=fcVectorFor(c,region,name);if(!g){r.vectorCount=0;r.lineCount=0;fcRender();return}
  const loaded=await fcLoadSynchronizedVectors(c,g,region,targetTime,mesh,fcMode());if(seq!==fcState.seq)return;if(!loaded.ok){r.vectorCount=0;r.lineCount=0;fcRender();return}const vectors=loaded.vectors;fcState.vectorValues=vectors;
  if(showV){const target=typeof fvVectorGlyphTarget==='function'?fvVectorGlyphTarget(mesh):280,scale=typeof fvVectorGlyphScale==='function'?fvVectorGlyphScale():1,glyph=fvBuildVectorGlyphBuffers(mesh,vectors,target,scale);fvUploadBuffer(r,'vectorPos',glyph.positions,r.gl.DYNAMIC_DRAW);fvUploadBuffer(r,'vectorColor',glyph.colors,r.gl.DYNAMIC_DRAW);r.vectorCount=glyph.positions.length/3}else r.vectorCount=0;
  if(showS){
    const mode=document.getElementById('fvSeedMode')?.value||'plane',axis=document.getElementById('fvSeedAxis')?.value||'x',count=Number(document.getElementById('fvSeedCount')?.value)||16,position=Number(document.getElementById('fvSeedPosition')?.value)||.5,patch=document.getElementById('fvSeedPatch')?.value||'',direction=document.getElementById('fvStreamDirection')?.value||'both',diag=Math.hypot(mesh.boundsMax[0]-mesh.boundsMin[0],mesh.boundsMax[1]-mesh.boundsMin[1],mesh.boundsMax[2]-mesh.boundsMin[2])||1,step=diag*Math.max(.0005,Number(document.getElementById('fvStreamStepPct')?.value||.45)/100),maxSteps=Math.max(10,Math.min(5000,Math.round(Number(document.getElementById('fvStreamMaxSteps')?.value)||300))),maxLength=diag*Math.max(1,Number(document.getElementById('fvStreamMaxLengthPct')?.value)||200)/100,seeds=fvStreamlineSeeds(mesh,{mode,axis,count,position,patch}),streamSampler=fvCreateMeshVectorSampler(mesh,fcState.spatialHash,vectors),lines=[];
    for(const seed of seeds){const line=fvCombineStreamline(seed,fcState.spatialHash,mesh.cellCenters,vectors,mesh.boundsMin,mesh.boundsMax,{direction,step,maxSteps,maxLength,insideTest:p=>fvPointInMesh(mesh,p,fcState.spatialHash),sampleVector:streamSampler});if(line.length>2)lines.push(line)}
    const speeds=lines.flatMap(l=>l.map(q=>q.speed)),vr=fvFiniteRange(speeds),buf=fvBuildLineBuffers(lines,vr.valid?vr:{min:0,max:1});fvUploadBuffer(r,'linePos',buf.positions,r.gl.DYNAMIC_DRAW);fvUploadBuffer(r,'lineColor',buf.colors,r.gl.DYNAMIC_DRAW);r.lineCount=buf.positions.length/3;fcState.streamlines=lines
  }else r.lineCount=0;fcRender()
}
function fcSameQuantity(){
  return String(fvState.fieldName||document.getElementById('fvField')?.value||'')===String(fcState.fieldName||fcCurrentFieldName()||'')&&String(fvState.component||document.getElementById('fvComponent')?.value||'value')===String(fcState.component||fcCurrentComponent()||'value')&&String(fvState.fieldStorage||'volume')===String(fcState.fieldStorage||'volume')&&String(fvState.fieldParsed?.dimensions||'')===String(fcState.fieldParsed?.dimensions||'')
}
function fcApplySharedRange(compareRange){
  const primary=fvFiniteRange(fvState.fieldValues);if(!primary.valid)return compareRange;
  if(!fcVisualsSynced()){const primaryDisplay=typeof fvDisplayRange==='function'?fvDisplayRange(primary):primary;fvUpdateSurfaceColors(fvState.fieldValues,primaryDisplay);fvUpdateSlice(primaryDisplay);if(typeof fvUpdateIso==='function')fvUpdateIso(primaryDisplay);fvLegend(primaryDisplay,fvState.fieldParsed);return compareRange}
  if(!fcSameQuantity()){const primaryDisplay=typeof fvDisplayRange==='function'?fvDisplayRange(primary):primary;fvUpdateSurfaceColors(fvState.fieldValues,primaryDisplay);fvUpdateSlice(primaryDisplay);if(typeof fvUpdateIso==='function')fvUpdateIso(primaryDisplay);fvLegend(primaryDisplay,fvState.fieldParsed);return compareRange}
  const union=fcSharedRange(primary,compareRange);if(!union.valid)return union;fvUpdateSurfaceColors(fvState.fieldValues,union);fvUpdateSlice(union);if(typeof fvUpdateIso==='function')fvUpdateIso(union);fvLegend(union,fvState.fieldParsed);return union
}
async function fcRefreshFrame(){
  fcRefreshSelectors(true);fcState.enabled=!!document.getElementById('fcEnabled')?.checked;fcUpdateLayout();if(!fcState.enabled){fcClearRenderer();return}
  const selected=fcCase(),region=fcRegion(),field=fcCurrentFieldName(),component=fcCurrentComponent(),target=Number(fvState.time);if(!selected||!field||!Number.isFinite(target)){fcClearRenderer();fcSetStatus(fcUi('Choose a synchronized 3D view after loading the primary frame.','Elige una vista 3D sincronizada después de cargar el frame principal.'),true);return}
  const group=fcFieldFor(selected,region,field);if(!group){fcClearRenderer();fcSetStatus(fcUi('The selected case/region does not expose this compatible 3D field.','El caso/región seleccionado no expone este campo 3D compatible.'),true);return}
  const syncPreview=fcResolveTime(group.times,target,fcMode());if(!syncPreview.ok){fcClearRenderer();fcSetStatus(fcUi('No comparison frame can be resolved at t = ','No se puede resolver un frame comparado en t = ')+fcFmt(target)+' s.',true);return}
  const seq=++fcState.seq;try{
    fcSetStatus(fcUi('Loading synchronized comparison…','Cargando comparación sincronizada…'));const loaded=await fcLoadSynchronizedData(selected,group,region,target,component,fcMode(),{includeBoundary:false});if(seq!==fcState.seq)return;if(!loaded.ok)throw new Error(fcUi('Comparison time could not be resolved.','No se pudo resolver el tiempo de comparación.'));const data=loaded,sync=loaded.sync;
    const mesh=data.mesh;if(fcState.mesh!==mesh){fcState.mesh=mesh;fcUploadMesh(mesh)}
    fcState.caseId=selected.id;fcState.region=region;fcState.fieldName=field;fcState.component=component;fcState.fieldStorage=data.storage;fcState.fieldValues=data.fieldValues;fcState.fieldParsed=data.parsed;fcState.time=sync.time;fcState.delta=sync.delta;fcState.sync=sync;fcState.range=data.range;
    const shared=fcApplySharedRange(data.range);fcUpdateDerived(shared);fcUpdateViewportLegend('fcLegend',field,component,data.parsed,shared,fcVisualFor(fcState,'fcView2').palette);fcUpdateStatsGrid();fcUpdateDifference(fvState.mesh,mesh,fvState.fieldValues,data.fieldValues);await fcUpdateVectors(target,seq);if(seq!==fcState.seq)return;fcUpdateLabels();
    fcSetStatus(selected.name+' · '+(region||fcUi('default region','región predeterminada'))+' · '+field+' · '+fvAssociationLabel(data.storage)+' · '+fcSyncText(sync))
  }catch(e){console.error(e);fcClearRenderer();fcSetStatus(String(e?.message||e),true)}
}
function fcRefreshVisuals(){
  if(!fcState.enabled||!fcState.fieldValues)return;const shared=fcApplySharedRange(fcState.range);fcUpdateDerived(shared);fcUpdateViewportLegend('fcLegend',fcState.fieldName,fcState.component,fcState.fieldParsed,shared);fcUpdateDifference(fvState.mesh,fcState.mesh,fvState.fieldValues,fcState.fieldValues);fcUpdateVectors(fvState.time,fcState.seq).catch(e=>fcSetStatus(String(e?.message||e),true))
}

const fcExtraViews=[];
const FC_MAX_TOTAL_VIEWS=4;
function fcExtraDom(id,suffix){return document.getElementById('fcExtra'+id+suffix)}
function fcExtraCase(state){return (cases||[]).find(c=>String(c.id)===String(fcExtraDom(state.id,'Case')?.value||state.caseId||''))}
function fcExtraRegion(state){return fcExtraDom(state.id,'Region')?.value||state.region||''}
function fcExtraField(state){return fcExtraDom(state.id,'Field')?.value||state.fieldName||''}
function fcExtraComponent(state){return fcExtraDom(state.id,'Component')?.value||state.component||'value'}
function fcExtraMvp(state,canvas){return fcMvpForCamera(fcCameraFor(state,state.mesh),canvas)}
function fcExtraRender(state,exportSize=null){
  if(!fcState.enabled||!state?.renderer||!state.mesh)return;const canvas=fcExtraDom(state.id,'Canvas'),r=state.renderer;if(!canvas)return;const gl=r.gl,rect=canvas.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1),forced=exportSize&&Number(exportSize.width)>1&&Number(exportSize.height)>1,w=forced?Math.round(Number(exportSize.width)):Math.max(2,Math.round(rect.width*dpr)),h=forced?Math.round(Number(exportSize.height)):Math.max(2,Math.round(rect.height*dpr));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}
  gl.viewport(0,0,w,h);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.useProgram(r.program);gl.uniformMatrix4fv(r.mvp,false,fcExtraMvp(state,canvas));
  const visual=fcVisualFor(state,'fcExtra'+state.id),opacity=visual.opacity,showEdges=visual.edges,showSlice=visual.slice,showIso=visual.iso,interior=state.storage!=='surface';
  if(visual.surface){if(state.storage==='surface'){fvBindDraw(r,r.surfacePos,r.surfaceColor,r.surfaceCount,gl.TRIANGLES,Math.min(.14,opacity));fvBindDraw(r,r.faceFieldPos,r.faceFieldColor,r.faceFieldCount,gl.TRIANGLES,opacity)}else fvBindDraw(r,r.surfacePos,r.surfaceColor,r.surfaceCount,gl.TRIANGLES,(showSlice||showIso)?Math.min(opacity,.28):opacity)}
  if(showSlice&&interior)fvBindDraw(r,r.slicePos,r.sliceColor,r.sliceCount,gl.TRIANGLES,fvClamp(document.getElementById('fvSliceOpacity')?.value??.96,.05,1));
  if(showIso&&interior)fvBindDraw(r,r.isoPos,r.isoColor,r.isoCount,gl.TRIANGLES,fvClamp(document.getElementById('fvIsoOpacity')?.value??.88,.05,1));
  if(showEdges)fvBindDraw(r,r.edgePos,r.edgeColor,r.edgeCount,gl.LINES,Math.min(1,opacity+.08));
  fcUpdateProbeOverlay(fcExtraDom(state.id,'Viewport'),canvas,'fcExtra'+state.id+'ProbeMarker',state.probe,fcExtraMvp(state,canvas))
}
function fcExtraUpload(state,data){
  const canvas=fcExtraDom(state.id,'Canvas');if(!canvas)return;if(!state.renderer)state.renderer=fvCreateRenderer(canvas);const r=state.renderer,mesh=data.mesh,b=fvBuildSurfaceBuffers(mesh),range=state.videoRangeOverride?.valid?state.videoRangeOverride:data.range,palette=fcVisualFor(state,'fcExtra'+state.id).palette;
  fvUploadBuffer(r,'surfacePos',b.surfacePositions);r.surfaceCount=b.surfacePositions.length/3;fvUploadBuffer(r,'edgePos',b.edgePositions);r.edgeCount=b.edgePositions.length/3;fvUploadBuffer(r,'edgeColor',fvConstantColors(r.edgeCount,[.12,.16,.22]));
  state.storage=data.storage;const visual=fcVisualFor(state,'fcExtra'+state.id);
  if(data.storage==='point')fvUploadBuffer(r,'surfaceColor',fvPointSurfaceColors(mesh,data.fieldValues,range.min,range.max,palette),r.gl.DYNAMIC_DRAW);
  else if(data.storage==='surface'){
    fvUploadBuffer(r,'surfaceColor',fvConstantColors(r.surfaceCount,[.32,.38,.46]),r.gl.DYNAMIC_DRAW);const fb=fvBuildInternalFaceBuffers(mesh);fvUploadBuffer(r,'faceFieldPos',fb.positions,r.gl.DYNAMIC_DRAW);fvUploadBuffer(r,'faceFieldColor',fvInternalFaceColors(fb.triangleFaces,data.fieldValues,range.min,range.max,palette),r.gl.DYNAMIC_DRAW);r.faceFieldCount=fb.positions.length/3
  }else fvUploadBuffer(r,'surfaceColor',fvSurfaceColors(mesh,data.fieldValues,range.min,range.max,palette),r.gl.DYNAMIC_DRAW);
  const interior=data.storage!=='surface';if(interior&&visual.slice){const axis=document.getElementById('fvSliceAxis')?.value||'x',position=Number(document.getElementById('fvSlicePosition')?.value)||0,geom=data.storage==='point'?fvBuildPointSliceGeometry(mesh,data.fieldValues,axis,position):fvBuildSliceGeometry(mesh,data.fieldValues,axis,position);fvUploadBuffer(r,'slicePos',geom.positions,r.gl.DYNAMIC_DRAW);fvUploadBuffer(r,'sliceColor',fvSliceColors(geom.values,range,palette),r.gl.DYNAMIC_DRAW);r.sliceCount=geom.positions.length/3}else r.sliceCount=0;
  if(interior&&visual.iso&&typeof fvBuildIsoSurfaceGeometry==='function'){const iso=Number(document.getElementById('fvIsoValue')?.value),geom=data.storage==='point'&&typeof fvBuildPointIsoSurfaceGeometry==='function'?fvBuildPointIsoSurfaceGeometry(mesh,data.fieldValues,iso):fvBuildIsoSurfaceGeometry(mesh,data.fieldValues,iso);fvUploadBuffer(r,'isoPos',geom.positions,r.gl.DYNAMIC_DRAW);fvUploadBuffer(r,'isoColor',fvIsoColors(geom.positions.length/3,iso,range,palette),r.gl.DYNAMIC_DRAW);r.isoCount=geom.positions.length/3}else r.isoCount=0;
  state.mesh=mesh;state.range=data.range;state.fieldValues=data.fieldValues;state.fieldParsed=data.parsed;fcUpdateViewportLegend('fcExtra'+state.id+'Legend',state.fieldName,state.component,data.parsed,range,palette);fcExtraRender(state);fcUpdateStatsGrid()
}
function fcExtraUpdateLabel(state){
  const e=fcExtraDom(state.id,'Label'),badge=fcExtraDom(state.id,'TimeBadge'),c=fcExtraCase(state);if(e)e.textContent=fcViewDisplayName(state.id)+' · '+(c?.name||fcUi('Case','Caso'))+' · '+(state.fieldName||fcExtraField(state)||'—')+(Number.isFinite(state.time)?' · t='+fcFmt(state.time)+' s':'');if(badge)badge.textContent=String.fromCharCode(64+Number(state.id))+' · '+fcSyncText(state.sync)
}
function fcExtraRefreshSelectors(state,preserve=true){
  const caseSel=fcExtraDom(state.id,'Case'),regionSel=fcExtraDom(state.id,'Region'),fieldSel=fcExtraDom(state.id,'Field'),compSel=fcExtraDom(state.id,'Component');if(!caseSel||!regionSel||!fieldSel||!compSel)return;
  const eligible=(cases||[]).filter(c=>fvCaseViewAvailable(c)),oldCase=preserve?caseSel.value:'';caseSel.innerHTML=eligible.map(c=>'<option value="'+fcEsc(c.id)+'">'+fcEsc(c.name)+'</option>').join('')||'<option value="">—</option>';
  if(oldCase&&eligible.some(c=>String(c.id)===String(oldCase)))caseSel.value=oldCase;else if(eligible.some(c=>String(c.id)===String(document.getElementById('fvCase')?.value||'')))caseSel.value=String(document.getElementById('fvCase').value);
  const selected=fcExtraCase(state),regions=typeof fvReadyRegions==='function'?fvReadyRegions(selected):[],oldRegion=preserve?regionSel.value:'';regionSel.innerHTML=regions.map(r=>'<option value="'+fcEsc(r)+'">'+fcEsc(r||fcUi('Default region','Región predeterminada'))+'</option>').join('')||'<option value="">—</option>';if(regions.includes(oldRegion))regionSel.value=oldRegion;else if(regions.includes(document.getElementById('fvRegion')?.value||''))regionSel.value=document.getElementById('fvRegion').value;
  const groups=fvFieldGroups(selected,regionSel.value||'',null,'any').filter(g=>['scalar','vector'].includes(g.kind)),oldField=preserve?fieldSel.value:'';fieldSel.innerHTML=groups.map(g=>'<option value="'+fcEsc(g.name)+'">'+fcEsc(g.name)+' · '+fcEsc(g.kind)+' · '+fcEsc(fvAssociationLabel(g.storage))+'</option>').join('')||'<option value="">—</option>';if(oldField&&groups.some(g=>g.name===oldField))fieldSel.value=oldField;else if(groups.some(g=>g.name===document.getElementById('fvField')?.value))fieldSel.value=document.getElementById('fvField').value;
  const group=groups.find(g=>g.name===fieldSel.value),components=fvFieldComponents(group),oldComp=preserve?compSel.value:'';compSel.innerHTML=components.map(o=>'<option value="'+fcEsc(o.v)+'">'+fcEsc(o.t)+'</option>').join('');if(oldComp&&components.some(o=>o.v===oldComp))compSel.value=oldComp;else if(components.some(o=>o.v===(document.getElementById('fvComponent')?.value||'value')))compSel.value=document.getElementById('fvComponent')?.value||'value';
  state.caseId=caseSel.value;state.region=regionSel.value;state.fieldName=fieldSel.value;state.component=compSel.value;fcExtraUpdateLabel(state)
}
async function fcExtraRefreshFrame(state){
  if(!fcState.enabled)return;fcExtraRefreshSelectors(state,true);const c=fcExtraCase(state),region=fcExtraRegion(state),field=fcExtraField(state),component=fcExtraComponent(state),target=Number(fvState.time),status=fcExtraDom(state.id,'Status');if(!c||!field||!Number.isFinite(target))return;
  const group=fcFieldFor(c,region,field);if(!group){if(status)status.textContent=fcUi('Selected field is unavailable in this region.','La variable seleccionada no está disponible en esta región.');return}const syncPreview=fcResolveTime(group.times,target,fcMode());if(!syncPreview.ok){if(status)status.textContent=fcUi('No synchronized frame at this physical time.','No hay frame sincronizado en este tiempo físico.');return}
  const seq=++state.seq;try{if(status)status.textContent=fcUi('Loading synchronized view…','Cargando vista sincronizada…');const data=await fcLoadSynchronizedData(c,group,region,target,component,fcMode(),{includeBoundary:false});if(seq!==state.seq)return;if(!data.ok)return;const sync=data.sync;state.caseId=c.id;state.region=region;state.fieldName=field;state.component=component;state.time=sync.time;state.delta=sync.delta;state.sync=sync;fcExtraUpload(state,data);fcExtraUpdateLabel(state);if(status)status.textContent=fcSyncText(sync)}catch(e){if(status)status.textContent=String(e?.message||e)}
}
async function fcRefreshExtras(){for(const state of fcExtraViews)await fcExtraRefreshFrame(state)}
function fcRenderExtras(){for(const state of fcExtraViews)fcExtraRender(state)}
function fcExtraRemove(id){
  const i=fcExtraViews.findIndex(v=>v.id===id);if(i<0)return;fcExtraViews.splice(i,1);fcExtraDom(id,'Controls')?.remove();fcExtraDom(id,'Viewport')?.remove();fcUpdateLayout()
}
function fcExtraAdd(){
  if(2+fcExtraViews.length>=FC_MAX_TOTAL_VIEWS)return;let id=3;while(fcExtraViews.some(v=>v.id===id))id++;const state={id,seq:0,renderer:null,mesh:null,fieldValues:null,fieldParsed:null,range:null,videoRangeOverride:null,time:NaN,delta:NaN,caseId:null,region:'',fieldName:'',component:'value',storage:'volume',probe:null,camera:null,visual:null,sync:null};fcExtraViews.push(state);
  const controls=document.getElementById('fcExtraControls'),grid=document.getElementById('fcViewGrid');if(!controls||!grid)return;const card=document.createElement('div');card.id='fcExtra'+id+'Controls';card.className='fcExtraCard';card.innerHTML='<div class="fcExtraHead"><b>'+String.fromCharCode(64+id)+'</b><input class="fcViewNameInput" id="fcExtra'+id+'Name" type="text" maxlength="48" placeholder="'+fcEsc(fcDefaultViewName(id))+'"><button class="btn tiny" type="button" id="fcExtra'+id+'Remove">×</button></div><div class="row2"><div class="field"><label>'+fcUi('Case','Caso')+'</label><select id="fcExtra'+id+'Case"></select></div><div class="field"><label>'+fcUi('Region','Región')+'</label><select id="fcExtra'+id+'Region"></select></div></div><div class="row2"><div class="field"><label>'+fcUi('Field','Variable')+'</label><select id="fcExtra'+id+'Field"></select></div><div class="field"><label>'+fcUi('Component','Componente')+'</label><select id="fcExtra'+id+'Component"></select></div></div><div class="fcExtraVisuals hidden" id="fcExtra'+id+'Visuals"><div class="row2"><div class="field"><label>'+fcUi('Colormap','Mapa de color')+'</label><select id="fcExtra'+id+'Palette"><option value="viridis">Viridis</option><option value="turbo">Turbo</option><option value="coolwarm">Cool–warm</option></select></div><div class="field"><label>'+fcUi('Opacity','Opacidad')+'</label><input id="fcExtra'+id+'Opacity" type="range" min=".05" max="1" step=".05" value=".92"></div></div><div class="fvChecks"><label class="inlineCheck"><input id="fcExtra'+id+'Surface" type="checkbox" checked> '+fcUi('Surface','Superficie')+'</label><label class="inlineCheck"><input id="fcExtra'+id+'Edges" type="checkbox" checked> '+fcUi('Edges','Aristas')+'</label><label class="inlineCheck"><input id="fcExtra'+id+'Slice" type="checkbox"> Slice</label><label class="inlineCheck"><input id="fcExtra'+id+'Iso" type="checkbox"> Iso</label></div></div><div class="smallnote" id="fcExtra'+id+'Status"></div>';controls.appendChild(card);
  const viewport=document.createElement('div');viewport.id='fcExtra'+id+'Viewport';viewport.className='fvViewport fcViewport';viewport.innerHTML='<canvas id="fcExtra'+id+'Canvas" aria-label="Synchronized multi-view OpenFOAM field visualization"></canvas><div class="fcTimeBadge" id="fcExtra'+id+'TimeBadge">View '+id+' · —</div><div class="fcViewLabel" id="fcExtra'+id+'Label"></div><div class="fcLegend hidden" id="fcExtra'+id+'Legend"></div>';grid.appendChild(viewport);
  fcExtraDom(id,'Remove').onclick=()=>fcExtraRemove(id);fcExtraDom(id,'Name')?.addEventListener('input',e=>fcSetViewName(id,e.target.value));for(const suffix of ['Case','Region','Field','Component'])fcExtraDom(id,suffix).addEventListener('change',()=>{state.probe=null;fcExtraRefreshSelectors(state,true);fcExtraRefreshFrame(state)});
  for(const suffix of ['Palette','Opacity','Surface','Edges','Slice','Iso'])fcExtraDom(id,suffix)?.addEventListener(suffix==='Opacity'?'input':'change',()=>{state.visual=null;if(state.mesh&&state.fieldValues&&state.range)fcExtraUpload(state,{mesh:state.mesh,storage:state.storage,fieldValues:state.fieldValues,parsed:state.fieldParsed,range:state.range});else fcExtraRender(state)});fcSyncVisualUi();const extraCanvas=fcExtraDom(id,'Canvas');fcDriveSharedCamera(extraCanvas,state,()=>state.mesh,()=>fcExtraRender(state));fcInstallViewProbe(extraCanvas,()=>({mesh:state.mesh,values:state.fieldValues,storage:state.storage,mvp:()=>fcExtraMvp(state,extraCanvas),setProbe:hit=>{state.probe=hit},render:()=>fcExtraRender(state)}));
  if(typeof ResizeObserver!=='undefined')new ResizeObserver(()=>fcExtraRender(state)).observe(viewport);fcExtraRefreshSelectors(state,false);fcExtraRefreshFrame(state);fcUpdateLayout()
}
async function fcCopyPrimarySettingsToCompare(){
  const region=document.getElementById('fvRegion')?.value||'',field=document.getElementById('fvField')?.value||'',component=document.getElementById('fvComponent')?.value||'value';
  const regionSel=document.getElementById('fcRegion');if(regionSel&&[...regionSel.options].some(o=>o.value===region))regionSel.value=region;fcRefreshSelectors(true);
  const fieldSel=document.getElementById('fcField');if(fieldSel&&[...fieldSel.options].some(o=>o.value===field))fieldSel.value=field;fcRefreshSelectors(true);
  const compSel=document.getElementById('fcComponent');if(compSel&&[...compSel.options].some(o=>o.value===component))compSel.value=component;
  if(!fcVisualsSynced()){const g=fcGlobalVisual(),palette=document.getElementById('fcView2Palette'),opacity=document.getElementById('fcView2Opacity');if(palette)palette.value=g.palette;if(opacity)opacity.value=String(g.opacity);for(const [suffix,key] of [['Surface','surface'],['Edges','edges'],['Slice','slice'],['Iso','iso'],['Vectors','vectors'],['Streamlines','streamlines']]){const e=document.getElementById('fcView2'+suffix);if(e)e.checked=!!g[key]}fcState.visual=null}
  await fcRefreshFrame();return true
}
async function fcSwapPrimaryCompare(){
  const targetTime=Number(fvState.time),p={caseId:String(document.getElementById('fvCase')?.value||''),region:document.getElementById('fvRegion')?.value||'',field:document.getElementById('fvField')?.value||'',component:document.getElementById('fvComponent')?.value||'value'},q={caseId:String(document.getElementById('fcCase')?.value||''),region:document.getElementById('fcRegion')?.value||'',field:document.getElementById('fcField')?.value||'',component:document.getElementById('fcComponent')?.value||'value'};
  if(!p.caseId||!q.caseId)return false;
  const enabled=document.getElementById('fcEnabled'),wasEnabled=!!enabled?.checked;if(enabled)enabled.checked=false;
  try{
    const pc=document.getElementById('fvCase');pc.value=q.caseId;await fvHandleCaseChange();
    const pr=document.getElementById('fvRegion');if([...pr.options].some(o=>o.value===q.region))pr.value=q.region;fvRefreshSelectors(true);
    const pf=document.getElementById('fvField');if([...pf.options].some(o=>o.value===q.field))pf.value=q.field;
    const pg=fvCurrentFieldGroup(),pcomp=document.getElementById('fvComponent');if(pg&&pcomp){pcomp.innerHTML=fvFieldComponents(pg).map(o=>'<option value="'+fvEsc(o.v)+'">'+fvEsc(o.t)+'</option>').join('');if([...pcomp.options].some(o=>o.value===q.component))pcomp.value=q.component}
    const ptimes=(pg?.times||[]).map(Number).filter(Number.isFinite).sort((a,b)=>a-b);let pi=0;if(Number.isFinite(targetTime)&&ptimes.length){let d=Infinity;for(let i=0;i<ptimes.length;i++){const qd=Math.abs(ptimes[i]-targetTime);if(qd<d){d=qd;pi=i}}}
    await fvLoadFrame(pi,{resetCamera:false});

    fcRefreshSelectors(false);const qc=document.getElementById('fcCase');qc.value=p.caseId;fcRefreshSelectors(true);
    const qr=document.getElementById('fcRegion');if([...qr.options].some(o=>o.value===p.region))qr.value=p.region;fcRefreshSelectors(true);
    const qf=document.getElementById('fcField');if([...qf.options].some(o=>o.value===p.field))qf.value=p.field;fcRefreshSelectors(true);
    const qcomp=document.getElementById('fcComponent');if([...qcomp.options].some(o=>o.value===p.component))qcomp.value=p.component;
  }finally{if(enabled)enabled.checked=wasEnabled}
  await fcRefreshFrame();return true
}
function fcCaptureHighRes(key,width,height){
  key=String(key||'');let canvas=null,render=null;
  if(key==='view2'){canvas=document.getElementById('fcCanvas');render=o=>fcRender(o)}
  else if(key==='difference'){canvas=document.getElementById('fcDifferenceCanvas');render=o=>fcRenderDifference(o)}
  else if(/^view[34]$/.test(key)){const id=Number(key.slice(4)),state=fcExtraViews.find(x=>Number(x.id)===id);canvas=state?fcExtraDom(id,'Canvas'):null;render=state?(o=>fcExtraRender(state,o)):null}
  if(!canvas||!render)return null;const w=Math.max(2,Math.min(8192,Math.round(Number(width)||canvas.width||2))),h=Math.max(2,Math.min(8192,Math.round(Number(height)||canvas.height||2))),out=document.createElement('canvas');out.width=w;out.height=h;
  try{render({width:w,height:h});out.getContext('2d',{alpha:true})?.drawImage(canvas,0,0,w,h);return out}
  finally{render()}
}
function fcVideoDescriptors(){
  const out=[];if(fcState.enabled&&fcState.mesh&&fcState.fieldValues)out.push({key:'view2',canvasId:'fcCanvas',labelId:'fcCompareLabel',viewName:fcViewDisplayName(2),caseName:fcCase()?.name||'',fieldName:fcState.fieldName||fcCurrentFieldName(),component:fcState.component||fcCurrentComponent(),time:fcState.time,range:fvFiniteRange(fcState.fieldValues),dimensions:fcState.fieldParsed?.dimensions||''});
  for(const s of fcExtraViews)if(fcState.enabled&&s.mesh&&s.fieldValues)out.push({key:'view'+s.id,canvasId:'fcExtra'+s.id+'Canvas',labelId:'fcExtra'+s.id+'Label',viewName:fcViewDisplayName(s.id),caseName:fcExtraCase(s)?.name||'',fieldName:s.fieldName||fcExtraField(s),component:s.component||fcExtraComponent(s),time:s.time,range:fvFiniteRange(s.fieldValues),dimensions:s.fieldParsed?.dimensions||''});
  if(fcState.enabled&&document.getElementById('fcDifference')?.checked&&fcState.differenceValues)out.push({key:'difference',canvasId:'fcDifferenceCanvas',labelId:'',caseName:'Δ',fieldName:(fvState.fieldName||'')+' − '+(fcState.fieldName||''),component:(fcState.differenceMode||'signed')+' difference',time:fvState.time,range:fcState.differenceRange,dimensions:fvState.fieldParsed?.dimensions||''});return out
}
function fcSetVideoRanges(ranges){
  fcState.videoRangeOverride=ranges?.view2?.valid?ranges.view2:null;for(const s of fcExtraViews)s.videoRangeOverride=ranges?.['view'+s.id]?.valid?ranges['view'+s.id]:null;
  if(fcState.enabled&&fcState.fieldValues){const r=fcState.videoRangeOverride||fcState.range;fcUpdateDerived(r);for(const s of fcExtraViews)if(s.mesh&&s.fieldValues){const data={mesh:s.mesh,storage:s.storage,fieldValues:s.fieldValues,parsed:s.fieldParsed,range:s.range};fcExtraUpload(s,data)}}
}
function fcUpdateLayout(){
  const panel=document.getElementById('fieldViewPanel'),compare=document.getElementById('fcViewport');if(!panel||!compare)return;panel.classList.toggle('fcCompareMode',fcState.enabled);compare.classList.toggle('hidden',!fcState.enabled);for(const state of fcExtraViews)fcExtraDom(state.id,'Viewport')?.classList.toggle('hidden',!fcState.enabled);const diff=document.getElementById('fcDifferenceViewport'),showDiff=fcState.enabled&&!!document.getElementById('fcDifference')?.checked;if(diff)diff.classList.toggle('hidden',!showDiff);panel.classList.toggle('fcDifferenceMode',showDiff);document.getElementById('fvStats')?.classList.toggle('hidden',fcState.enabled);fcUpdateLabels();fcUpdateStatsGrid();setTimeout(()=>{fvRender();fcRender();fcRenderDifference();fcRenderExtras()},0)
}
function fcInstallUi(){
  if(document.getElementById('fcPanel'))return true;const controls=document.getElementById('fieldViewControls'),status=document.getElementById('fvStatus'),panel=document.getElementById('fieldViewPanel'),primary=panel?.querySelector('.fvViewport');if(!controls||!status||!panel||!primary)return false;
  const box=document.createElement('details');box.className='analysisExt';box.id='fcPanel';box.open=false;box.innerHTML='<summary class="analysisExtHead"><strong data-fl-en="Synchronized 3D case comparison" data-fl-es="Comparación 3D sincronizada de casos">Synchronized 3D case comparison</strong><span class="badge" id="fcBadge">—</span></summary><div class="extSectionBody">'+
    '<div class="fvChecks"><label class="inlineCheck"><input id="fcEnabled" type="checkbox"> <span data-fl-en="Compare side by side" data-fl-es="Comparar lado a lado">Compare side by side</span></label><label class="inlineCheck"><input id="fcDifference" type="checkbox"> <span data-fl-en="Show 3D difference" data-fl-es="Mostrar diferencia 3D">Show 3D difference</span></label></div>'+    '<div class="row2 fcNameRow"><div class="field"><label data-fl-en="View A name" data-fl-es="Nombre Vista A">View A name</label><input id="fcPrimaryName" class="fcViewNameInput" type="text" maxlength="48" placeholder="View A"></div><div class="field"><label data-fl-en="View B name" data-fl-es="Nombre Vista B">View B name</label><input id="fcCompareName" class="fcViewNameInput" type="text" maxlength="48" placeholder="View B"></div></div>'+
    '<div class="row2" style="margin-top:8px"><div class="field"><label data-fl-en="View 2 case" data-fl-es="Caso de vista 2">View 2 case</label><select id="fcCase"></select></div><div class="field"><label data-fl-en="Region" data-fl-es="Región">Region</label><select id="fcRegion"></select></div></div>'+
    '<div class="row2"><div class="field"><label data-fl-en="View 2 field" data-fl-es="Variable de vista 2">View 2 field</label><select id="fcField"></select></div><div class="field"><label data-fl-en="Component" data-fl-es="Componente">Component</label><select id="fcComponent"></select></div></div>'+
    '<div class="field"><label data-fl-en="Physical-time synchronization" data-fl-es="Sincronización por tiempo físico">Physical-time synchronization</label><select id="fcSync"><option value="nearest" data-fl-en="Nearest available (show Δt)" data-fl-es="Más cercano disponible (mostrar Δt)">Nearest available (show Δt)</option><option value="exact" data-fl-en="Exact time only" data-fl-es="Solo tiempo exacto">Exact time only</option><option value="interpolate" data-fl-en="Interpolated between frames" data-fl-es="Interpolado entre frames">Interpolated between frames</option></select></div>'+
    '<div class="row2"><div class="field"><label data-fl-en="3D difference" data-fl-es="Diferencia 3D">3D difference</label><select id="fcDifferenceMode"><option value="signed">Signed A − B</option><option value="absolute">Absolute |A − B|</option><option value="percent">Percent of A</option></select></div><div class="field"><label data-fl-en="Percent ε" data-fl-es="ε porcentual">Percent ε</label><input id="fcPercentEpsilon" type="number" min="0" step="any" value="1e-12"></div></div>'+
    '<div class="fcExtraActions"><button class="btn soft" id="fcSwapCases" type="button" data-fl-en="⇄ Swap A / B" data-fl-es="⇄ Intercambiar A / B">⇄ Swap A / B</button><button class="btn" id="fcCopyAToB" type="button" data-fl-en="Copy A → B settings" data-fl-es="Copiar ajustes A → B">Copy A → B settings</button></div>'+
    '<div class="fvChecks fcLinkRow"><label class="inlineCheck"><input id="fcLinkCameras" type="checkbox" checked> <span data-fl-en="Link cameras" data-fl-es="Enlazar cámaras">Link cameras</span></label><button class="btn tiny" id="fcResyncCameras" type="button" data-fl-en="Re-sync" data-fl-es="Re-sincronizar">Re-sync</button><button class="btn tiny" id="fcFitAll" type="button" data-fl-en="Fit all" data-fl-es="Ajustar todas">Fit all</button><label class="inlineCheck"><input id="fcSyncVisuals" type="checkbox" checked> <span data-fl-en="Sync visual settings" data-fl-es="Sincronizar ajustes visuales">Sync visual settings</span></label></div>'+
    '<div class="fcExtraCard hidden" id="fcView2Visuals"><div class="row2"><div class="field"><label data-fl-en="View 2 colormap" data-fl-es="Mapa de color Vista 2">View 2 colormap</label><select id="fcView2Palette"><option value="viridis">Viridis</option><option value="turbo">Turbo</option><option value="coolwarm">Cool–warm</option></select></div><div class="field"><label data-fl-en="View 2 opacity" data-fl-es="Opacidad Vista 2">View 2 opacity</label><input id="fcView2Opacity" type="range" min=".05" max="1" step=".05" value=".92"></div></div><div class="fvChecks"><label class="inlineCheck"><input id="fcView2Surface" type="checkbox" checked> Surface</label><label class="inlineCheck"><input id="fcView2Edges" type="checkbox" checked> Edges</label><label class="inlineCheck"><input id="fcView2Slice" type="checkbox"> Slice</label><label class="inlineCheck"><input id="fcView2Iso" type="checkbox"> Iso</label><label class="inlineCheck"><input id="fcView2Vectors" type="checkbox"> Vectors</label><label class="inlineCheck"><input id="fcView2Streamlines" type="checkbox"> Streamlines</label></div></div>'+
    '<div class="smallnote" data-fl-en="Each viewport may use its own case, field and component. Time follows Exact / Nearest / Interpolated synchronization; cameras and visual settings may be linked or independent. A shared color scale and 3D difference are used only when both views represent the same physical quantity." data-fl-es="Cada viewport puede usar su propio caso, variable y componente. El tiempo y la cámara permanecen sincronizados. La escala compartida y la diferencia 3D solo se usan cuando ambas vistas representan la misma cantidad física.">Each viewport may use its own case, field and component. Time and camera remain synchronized. A shared color scale and 3D difference are used only when both views represent the same physical quantity.</div>'+
    '<div class="fcExtraActions"><button class="btn soft" id="fcAddView" type="button" data-fl-en="+ Add 3D view" data-fl-es="+ Añadir vista 3D">+ Add 3D view</button><span class="smallnote" data-fl-en="Up to 4 synchronized viewports" data-fl-es="Hasta 4 viewports sincronizados">Up to 4 synchronized viewports</span></div><div id="fcExtraControls"></div>'+
    '<div class="extStatus" id="fcStatus"></div></div>';status.insertAdjacentElement('beforebegin',box);
  const comparisonStatus=document.createElement('div');comparisonStatus.id='fcComparisonStatus';comparisonStatus.className='fcComparisonStatus hidden';primary.parentElement.insertBefore(comparisonStatus,primary);
  const grid=document.createElement('div');grid.id='fcViewGrid';grid.className='fcViewGrid';primary.parentElement.insertBefore(grid,primary);grid.appendChild(primary);
  const primaryTimeBadge=document.createElement('div');primaryTimeBadge.id='fcPrimaryTimeBadge';primaryTimeBadge.className='fcTimeBadge';primaryTimeBadge.textContent='A · —';primary.appendChild(primaryTimeBadge);const primaryLabel=document.createElement('div');primaryLabel.id='fcPrimaryLabel';primaryLabel.className='fcViewLabel';primary.appendChild(primaryLabel);
  const second=document.createElement('div');second.id='fcViewport';second.className='fvViewport fcViewport hidden';second.innerHTML='<canvas id="fcCanvas" aria-label="Synchronized comparison 3D OpenFOAM field visualization"></canvas><div class="fcTimeBadge" id="fcCompareTimeBadge">B · —</div><div class="fcViewLabel" id="fcCompareLabel"></div><div class="fcLegend hidden" id="fcLegend"></div>';grid.appendChild(second);
  const diff=document.createElement('div');diff.id='fcDifferenceViewport';diff.className='fvViewport fcViewport hidden';diff.innerHTML='<canvas id="fcDifferenceCanvas" aria-label="3D OpenFOAM difference field visualization"></canvas><div class="fcTimeBadge" id="fcDifferenceTimeBadge">Δ · —</div><div class="fcViewLabel" id="fcDifferenceLabel">Δ field · A − B</div><div class="extStatus fcDifferenceStatus" id="fcDifferenceStatus"></div>';grid.appendChild(diff);
  const statsGrid=document.createElement('div');statsGrid.id='fcStatsGrid';statsGrid.className='fcStatsGrid hidden';grid.insertAdjacentElement('afterend',statsGrid);
  const style=document.createElement('style');style.id='fcStyles';style.textContent='.fcComparisonStatus{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin:0 0 9px;padding:7px 8px;border:1px solid var(--line);border-radius:10px;background:var(--panel2)}.fcComparisonStatus.hidden{display:none}.fcStatusChip{display:inline-flex;gap:4px;align-items:center;padding:3px 6px;border:1px solid var(--line);border-radius:999px;font-size:8px;color:var(--muted);background:var(--panel)}.fcStatusChip b{color:var(--text)}.fcStatusChip.good{border-color:color-mix(in srgb,#3bb273 55%,var(--line));color:#2b9b63}.fcStatusChip.warn{border-color:color-mix(in srgb,#e39b3a 60%,var(--line));color:#c57a20}.fcViewNameInput{min-width:0;width:100%}.fcExtraHead .fcViewNameInput{flex:1;max-width:180px}.fcViewGrid{display:grid;grid-template-columns:minmax(0,1fr);gap:10px}.fieldViewPanel.fcCompareMode .fcViewGrid{grid-template-columns:repeat(auto-fit,minmax(340px,1fr))}.fieldViewPanel.fcCompareMode.fcDifferenceMode .fcViewGrid{grid-template-columns:repeat(auto-fit,minmax(320px,1fr))}.fcViewport.hidden{display:none}.fcViewport #fcCanvas,.fcViewport #fcDifferenceCanvas{display:block;width:100%;height:500px;touch-action:none}.fcTimeBadge{position:absolute;left:12px;top:12px;z-index:8;padding:4px 7px;border:1px solid var(--line);border-radius:999px;background:color-mix(in srgb,var(--panel) 90%,transparent);font-size:8px;font-weight:850;backdrop-filter:blur(8px)}.fcViewLabel{position:absolute;left:12px;bottom:12px;max-width:65%;padding:5px 8px;border:1px solid var(--line);border-radius:999px;background:color-mix(in srgb,var(--panel) 88%,transparent);font-size:9px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;backdrop-filter:blur(8px)}.fcLegend{position:absolute;right:12px;bottom:12px;width:min(180px,44%);padding:9px 10px;border:1px solid var(--line);border-radius:12px;background:color-mix(in srgb,var(--panel) 90%,transparent);backdrop-filter:blur(8px);z-index:7}.fcLegend.hidden{display:none}.fcLegendTitle{font-size:9px;font-weight:850;margin-bottom:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.fcLegendTitle span{color:var(--muted);font-weight:700}.fcLegendBar{height:10px;border-radius:999px;margin-bottom:5px}.fcLegendTicks{display:flex;justify-content:space-between;gap:5px;font-size:8px;color:var(--muted)}.fcLegendDelta{margin-top:4px;font-size:8px;color:var(--muted)}.fcLegendUniform{font-size:9px;color:var(--text);padding:6px 0}.fcProbeMarker{position:absolute;z-index:9;transform:translate(-50%,-50%);width:28px;height:28px;border:2px solid #ffd34d;border-radius:50%;box-shadow:0 0 0 3px rgba(0,0,0,.5),0 0 13px rgba(255,211,77,.55);pointer-events:none}.fcProbeMarker:before,.fcProbeMarker:after{content:"";position:absolute;left:50%;top:50%;background:#fff3b0;transform:translate(-50%,-50%)}.fcProbeMarker:before{width:145%;height:2px}.fcProbeMarker:after{width:2px;height:145%}.fcProbeMarker span{position:absolute;left:50%;top:50%;width:6px;height:6px;border-radius:50%;background:#ffb300;transform:translate(-50%,-50%)}.fcProbeMarker.hidden{display:none}.fcStatsGrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:10px;margin-top:10px}.fcStatsGrid.hidden{display:none}.fcStatsCard{padding:9px;border:1px solid var(--line);border-radius:12px;background:var(--panel)}.fcStatsTitle{font-size:9px;font-weight:850;margin-bottom:7px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.fcStatsCells{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}.fcStatsCells>div{padding:7px 8px;border:1px solid var(--line);border-radius:9px;background:var(--panel2);min-width:0}.fcStatsCells span{display:block;color:var(--muted);font-size:8px}.fcStatsCells b{display:block;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.fcSelectedStat{grid-column:span 2}.fieldViewPanel.fcCompareMode .fvLegend{width:min(190px,45%)}.fcExtraActions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:8px}.fcExtraCard{margin-top:8px;padding:8px;border:1px solid var(--line);border-radius:10px;background:var(--panel2)}.fcExtraHead{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px}@media(max-width:1180px){.fieldViewPanel.fcCompareMode.fcDifferenceMode .fcViewGrid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:980px){.fieldViewPanel.fcCompareMode .fcViewGrid{grid-template-columns:1fr}.fcViewport #fcCanvas,.fcViewport #fcDifferenceCanvas{height:420px}}';document.head.appendChild(style);
  try{flApplyBilingualText(box)}catch{}
  document.getElementById('fcPrimaryName').addEventListener('input',e=>fcSetViewName(1,e.target.value));document.getElementById('fcCompareName').addEventListener('input',e=>fcSetViewName(2,e.target.value));document.getElementById('fcEnabled').addEventListener('change',()=>{fcState.lockedRange=null;fcRefreshFrame()});document.getElementById('fcDifference').addEventListener('change',()=>{fcState.lockedRange=null;fcRefreshFrame()});document.getElementById('fcAddView').addEventListener('click',fcExtraAdd);
  document.getElementById('fcCase').addEventListener('change',()=>{fcRefreshSelectors(true);fcState.lockedRange=null;fcState.probe=null;fcRefreshFrame()});
  document.getElementById('fcRegion').addEventListener('change',()=>{fcRefreshSelectors(true);fcState.lockedRange=null;fcRefreshFrame()});
  document.getElementById('fcField').addEventListener('change',()=>{fcRefreshSelectors(true);fcState.lockedRange=null;fcRefreshFrame()});
  document.getElementById('fcComponent').addEventListener('change',()=>{fcState.lockedRange=null;fcRefreshFrame()});
  document.getElementById('fcSync').addEventListener('change',()=>fcRefreshFrame());document.getElementById('fcDifferenceMode').addEventListener('change',()=>fcRefreshVisuals());document.getElementById('fcPercentEpsilon').addEventListener('change',()=>fcRefreshVisuals());document.getElementById('fcSwapCases').addEventListener('click',()=>fcSwapPrimaryCompare().catch(e=>fcSetStatus(String(e?.message||e),true)));document.getElementById('fcCopyAToB').addEventListener('click',()=>fcCopyPrimarySettingsToCompare().catch(e=>fcSetStatus(String(e?.message||e),true)));
  document.getElementById('fcLinkCameras').addEventListener('change',()=>{if(!fcCamerasLinked())fcResyncCameras();fcRender();fcRenderDifference();fcRenderExtras();fcUpdateComparisonStatus()});document.getElementById('fcResyncCameras').addEventListener('click',fcResyncCameras);document.getElementById('fcFitAll').addEventListener('click',fcFitAllCameras);document.getElementById('fcSyncVisuals').addEventListener('change',()=>{fcSyncVisualUi();fcRefreshVisuals();fcRefreshExtras();fcUpdateComparisonStatus()});for(const id of ['fcView2Palette','fcView2Opacity','fcView2Surface','fcView2Edges','fcView2Slice','fcView2Iso','fcView2Vectors','fcView2Streamlines'])document.getElementById(id)?.addEventListener(id==='fcView2Opacity'?'input':'change',()=>{fcState.visual=null;fcRefreshVisuals()});fcSyncVisualUi();const compareCanvas=document.getElementById('fcCanvas');fcDriveSharedCamera(compareCanvas,fcState,()=>fcState.mesh,()=>fcRender());fcInstallViewProbe(compareCanvas,()=>({mesh:fcState.mesh,values:fcState.fieldValues,storage:fcState.fieldStorage,mvp:()=>fcMvp(compareCanvas),setProbe:hit=>{fcState.probe=hit},render:()=>fcRender()}));
  if(typeof ResizeObserver!=='undefined'){new ResizeObserver(()=>fcRender()).observe(second);new ResizeObserver(()=>fcRenderDifference()).observe(diff);}
  fcRefreshSelectors(false);fcUpdateLayout();return true
}
function fcInstall(){
  const mount=()=>fcInstallUi();if(!mount()){const retry=()=>{if(mount())return;requestAnimationFrame(retry)};requestAnimationFrame(retry)}
  if(typeof fvLoadFrame==='function'&&!fvLoadFrame.__fcPatched){const previous=fvLoadFrame;fvLoadFrame=async function(...args){const x=await previous.apply(this,args);await fcRefreshFrame();await fcRefreshExtras();return x};fvLoadFrame.__fcPatched=true}
  if(typeof fvRender==='function'&&!fvRender.__fcPatched){const previous=fvRender;fvRender=function(...args){const x=previous.apply(this,args);fcRender();fcRenderDifference();fcRenderExtras();return x};fvRender.__fcPatched=true}
  for(const id of ['fvCase','fvRegion','fvField','fvComponent'])document.getElementById(id)?.addEventListener('change',()=>setTimeout(()=>{fcRefreshSelectors(true);for(const state of fcExtraViews)fcExtraRefreshSelectors(state,true);fcState.lockedRange=null;fcRefreshFrame();fcRefreshExtras()},0));
  for(const id of ['fvPalette','fvSurface','fvEdges','fvOpacity','fvRangeMode','fvRangeMin','fvRangeMax','fvSlice','fvSliceAxis','fvSlicePosition','fvSliceOpacity','fvIso','fvIsoValue','fvIsoOpacity','fvVectors','fvStreamlines','fvVector','fvVectorResolution','fvVectorScale','fvSeedMode','fvSeedAxis','fvSeedCount','fvSeedPosition','fvSeedPatch','fvStreamDirection','fvStreamStepPct','fvStreamMaxSteps','fvStreamMaxLengthPct'])document.getElementById(id)?.addEventListener(id==='fvSlicePosition'||id==='fvIsoValue'||id==='fvOpacity'||id==='fvSliceOpacity'||id==='fvIsoOpacity'||id==='fvVectorScale'||id==='fvSeedPosition'?'input':'change',()=>setTimeout(fcRefreshVisuals,0));
  document.addEventListener('foamlens-language-change',()=>{const p=document.getElementById('fcPanel');if(p)try{flApplyBilingualText(p)}catch{};fcRefreshSelectors(true);fcUpdateLabels()});
}
fcInstall();
function fcViewStateDescriptors(){
  const out=[{id:'view1',name:fcViewDisplayName(1),camera:fcCloneCamera(fvState.camera),visual:{...fcGlobalVisual()},caseId:fvState.caseId,field:fvState.fieldName,time:fvState.time}];
  if(fcState.enabled)out.push({id:'view2',name:fcViewDisplayName(2),camera:fcState.camera?fcCloneCamera(fcState.camera):fcCloneCamera(fcSyncedCamera(fvState.camera,fvState.mesh,fcState.mesh)),visual:{...fcVisualFor(fcState,'fcView2')},caseId:fcState.caseId,field:fcState.fieldName,time:fcState.time});
  for(const state of fcExtraViews)out.push({id:'view'+state.id,name:fcViewDisplayName(state.id),camera:state.camera?fcCloneCamera(state.camera):fcCloneCamera(fcSyncedCamera(fvState.camera,fvState.mesh,state.mesh)),visual:{...fcVisualFor(state,'fcExtra'+state.id)},caseId:state.caseId,field:state.fieldName,time:state.time});
  return out
}
function fcProbeDescriptors(){
  const out=[],primary=window.FoamLensFieldProbe?.getLast?.();
  if(primary?.point?.length===3)out.push({id:'view1',view:1,caseId:Number(fvState.caseId),caseName:fvCase()?.name||'',region:fvState.region||'',field:fvState.fieldName||'',component:fvState.component||'value',point:primary.point.map(Number),cell:primary.cell??null,face:primary.face??null,value:Number(primary.value)});
  if(fcState.enabled&&fcState.probe?.point?.length===3)out.push({id:'view2',view:2,caseId:Number(fcState.caseId),caseName:fcCase()?.name||'',region:fcState.region||'',field:fcState.fieldName||'',component:fcState.component||'value',point:fcState.probe.point.map(Number),cell:fcState.probe.cell??null,face:fcState.probe.face??null,value:Number(fcState.probe.value)});
  for(const s of fcExtraViews)if(s.probe?.point?.length===3)out.push({id:'view'+s.id,view:Number(s.id),caseId:Number(s.caseId),caseName:fcExtraCase(s)?.name||'',region:s.region||'',field:s.fieldName||'',component:s.component||'value',point:s.probe.point.map(Number),cell:s.probe.cell??null,face:s.probe.face??null,value:Number(s.probe.value)});
  return out
}
window.FoamLensFieldCompare={fcCloseTime,fcNearestTime,fcTimeBracket,fcResolveTime,fcInterpolateValues,fcLoadSynchronizedVectors,fcSharedRange,fcMeshDiag,fcSyncedCamera,fcMeshesEquivalent,fcDifferenceValues,fcDifferenceRange,fcSymmetricDifferenceRange,fcRefreshFrame,getVideoDescriptors:fcVideoDescriptors,setVideoRanges:fcSetVideoRanges,refreshExtras:fcRefreshExtras,updateStats:fcUpdateStatsGrid,getProbeDescriptors:fcProbeDescriptors,getViewStates:fcViewStateDescriptors,resyncCameras:fcResyncCameras,fitAllCameras:fcFitAllCameras,getViewNames:fcGetViewNames,setViewName:fcSetViewName,updateComparisonStatus:fcUpdateComparisonStatus,copyPrimarySettingsToCompare:fcCopyPrimarySettingsToCompare,swapPrimaryCompare:fcSwapPrimaryCompare,captureHighRes:fcCaptureHighRes,renderAtSize(key,width,height){if(key==='view2'){fcRender({width,height});return document.getElementById('fcCanvas')}if(key==='difference'){fcRenderDifference({width,height});return document.getElementById('fcDifferenceCanvas')}const id=Number(String(key||'').replace(/^view/,'')),state=fcExtraViews.find(x=>Number(x.id)===id);if(state){fcExtraRender(state,{width,height});return fcExtraDom(state.id,'Canvas')}return null}};
