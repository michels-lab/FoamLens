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
function fcResolveTime(values,target,mode='nearest'){
  const t=Number(target),near=fcNearestTime(values,t);if(!Number.isFinite(near))return{ok:false,time:NaN,delta:NaN,exact:false};
  const exact=fcCloseTime(near,t);if(mode==='exact'&&!exact)return{ok:false,time:near,delta:near-t,exact:false};
  return{ok:true,time:near,delta:near-t,exact}
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
function fcDifferenceValues(primary,compare,mode='signed'){
  const n=Math.min(primary?.length||0,compare?.length||0),out=new Array(n);
  for(let i=0;i<n;i++){const a=Number(primary[i]),b=Number(compare[i]);out[i]=Number.isFinite(a)&&Number.isFinite(b)?(mode==='absolute'?Math.abs(a-b):a-b):NaN}
  return out
}
function fcSymmetricDifferenceRange(values){
  let m=0,n=0;for(const v of values||[]){const x=Number(v);if(Number.isFinite(x)){m=Math.max(m,Math.abs(x));n++}}
  if(!n)return{valid:false,min:NaN,max:NaN,mean:NaN,count:0};if(m===0)m=1;
  const finite=(values||[]).map(Number).filter(Number.isFinite),mean=finite.reduce((a,b)=>a+b,0)/finite.length;
  return{valid:true,min:-m,max:m,mean,count:n}
}
/* FOAMLENS_FIELD_COMPARE_CORE_END */

const fcState={
  enabled:false,caseId:null,region:'',mesh:null,renderer:null,fieldValues:null,fieldParsed:null,time:NaN,delta:NaN,range:null,lockedRange:null,
  spatialHash:null,vectorValues:null,streamlines:[],differenceValues:null,differenceRange:null,differenceRenderer:null,seq:0,lastError:''
};
function fcUi(en,es){try{return flUi(en,es)}catch{return en}}
function fcEsc(v){try{return fvEsc(v)}catch{return String(v??'')}}
function fcFmt(v){try{return fvFmt(v)}catch{return Number.isFinite(Number(v))?String(v):'—'}}
function fcCase(){return cases.find(c=>String(c.id)===String(document.getElementById('fcCase')?.value))}
function fcRegion(){return document.getElementById('fcRegion')?.value||''}
function fcMode(){return document.getElementById('fcSync')?.value||'nearest'}
function fcCurrentFieldName(){return fvState.fieldName||document.getElementById('fvField')?.value||''}
function fcCurrentComponent(){return fvState.component||document.getElementById('fvComponent')?.value||'value'}
function fcMeshFor(c,region){return fvMeshes(c).find(g=>String(g.region||'')===String(region||'')&&g.complete)}
function fcFieldFor(c,region,name){return fvFieldGroups(c,region).find(g=>g.name===name)}
function fcVectorFor(c,region,name){return fvFieldGroups(c,region,'vector').find(g=>g.name===name)}
function fcClearRenderer(){
  const r=fcState.renderer;if(r){r.surfaceCount=0;r.edgeCount=0;r.sliceCount=0;r.isoCount=0;r.vectorCount=0;r.lineCount=0;r.probeCount=0}const dr=fcState.differenceRenderer;if(dr){dr.surfaceCount=0;dr.edgeCount=0;dr.sliceCount=0;dr.isoCount=0;dr.vectorCount=0;dr.lineCount=0}fcState.differenceValues=null;fcState.differenceRange=null;fcState.mesh=null;fcState.fieldValues=null;fcState.fieldParsed=null;fcState.vectorValues=null;fcState.streamlines=[];fcRender()
}
function fcSetStatus(text,error=false){
  fcState.lastError=error?String(text||''):'';const e=document.getElementById('fcStatus');if(e){e.textContent=String(text||'');e.classList.toggle('error',!!error)}
}
function fcUpdateLabels(){
  const primary=document.getElementById('fcPrimaryLabel'),compare=document.getElementById('fcCompareLabel'),pc=fvCase(),cc=fcCase();
  if(primary)primary.textContent=(pc?.name||fcUi('Primary case','Caso principal'))+(Number.isFinite(fvState.time)?' · t='+fcFmt(fvState.time)+' s':'');
  if(compare)compare.textContent=(cc?.name||fcUi('Comparison case','Caso comparado'))+(Number.isFinite(fcState.time)?' · t='+fcFmt(fcState.time)+' s':'')+(Number.isFinite(fcState.delta)&&Math.abs(fcState.delta)>1e-12?' · Δt='+(fcState.delta>=0?'+':'')+fcFmt(fcState.delta)+' s':'')
}
function fcRefreshSelectors(preserve=true){
  const caseSel=document.getElementById('fcCase'),regionSel=document.getElementById('fcRegion');if(!caseSel||!regionSel)return;
  const primaryId=String(document.getElementById('fvCase')?.value||''),eligible=(cases||[]).filter(c=>String(c.id)!==primaryId&&fvCaseViewAvailable(c)),oldCase=preserve?caseSel.value:'';
  caseSel.innerHTML=eligible.length?eligible.map(c=>'<option value="'+fcEsc(c.id)+'">'+fcEsc(c.name)+'</option>').join(''):'<option value="">—</option>';
  if(oldCase&&eligible.some(c=>String(c.id)===String(oldCase)))caseSel.value=oldCase;
  const c=fcCase(),oldRegion=preserve?regionSel.value:'',regions=fvMeshes(c).filter(g=>g.complete).map(g=>String(g.region||''));
  regionSel.innerHTML=regions.length?regions.map(r=>'<option value="'+fcEsc(r)+'">'+fcEsc(r||fcUi('Default region','Región predeterminada'))+'</option>').join(''):'<option value="">—</option>';
  if(regions.includes(oldRegion))regionSel.value=oldRegion;
  else{const primaryRegion=document.getElementById('fvRegion')?.value||'';if(regions.includes(primaryRegion))regionSel.value=primaryRegion}
  const badge=document.getElementById('fcBadge');if(badge)badge.textContent=eligible.length?eligible.length+' '+fcUi('available','disponibles'):fcUi('no second case','sin segundo caso');
  fcUpdateLabels()
}
function fcMvp(canvas){
  const c=fcSyncedCamera(fvState.camera,fvState.mesh,fcState.mesh),d=Math.max(1e-12,c.distance),cp=Math.cos(c.pitch),eye=[c.target[0]+d*cp*Math.sin(c.yaw),c.target[1]+d*Math.sin(c.pitch),c.target[2]+d*cp*Math.cos(c.yaw)],near=Math.max(d/1000,1e-8),far=Math.max(d*20,near*100),proj=fvPerspective(Math.PI/4,Math.max(1,canvas.width)/Math.max(1,canvas.height),near,far),view=fvLookAt(eye,c.target,[0,1,0]);
  return fvMat4Mul(proj,view)
}
function fcRender(){
  if(!fcState.enabled)return;const r=fcState.renderer,canvas=document.getElementById('fcCanvas');if(!r||!canvas||!fcState.mesh)return;const gl=r.gl,rect=canvas.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1),w=Math.max(2,Math.round(rect.width*dpr)),h=Math.max(2,Math.round(rect.height*dpr));
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}gl.viewport(0,0,w,h);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.useProgram(r.program);gl.uniformMatrix4fv(r.mvp,false,fcMvp(canvas));
  const showSurface=document.getElementById('fvSurface')?.checked!==false,showEdges=document.getElementById('fvEdges')?.checked!==false,showSlice=!!document.getElementById('fvSlice')?.checked,showIso=!!document.getElementById('fvIso')?.checked,opacity=fvClamp(document.getElementById('fvOpacity')?.value??.92,.05,1),sliceOpacity=fvClamp(document.getElementById('fvSliceOpacity')?.value??.96,.05,1),isoOpacity=fvClamp(document.getElementById('fvIsoOpacity')?.value??.88,.05,1),interiorActive=showSlice||showIso;
  if(showSurface){gl.depthMask(!interiorActive);fvBindDraw(r,r.surfacePos,r.surfaceColor,r.surfaceCount,gl.TRIANGLES,interiorActive?Math.min(opacity,.28):opacity);gl.depthMask(true)}
  if(showSlice){gl.depthFunc(gl.LEQUAL);fvBindDraw(r,r.slicePos,r.sliceColor,r.sliceCount,gl.TRIANGLES,sliceOpacity)}
  if(showIso){gl.depthFunc(gl.LEQUAL);fvBindDraw(r,r.isoPos,r.isoColor,r.isoCount,gl.TRIANGLES,isoOpacity)}
  if(showEdges){gl.depthFunc(gl.LEQUAL);fvBindDraw(r,r.edgePos,r.edgeColor,r.edgeCount,gl.LINES,Math.min(1,opacity+.08))}
  if(document.getElementById('fvVectors')?.checked)fvBindDraw(r,r.vectorPos,r.vectorColor,r.vectorCount,gl.LINES,1);
  if(document.getElementById('fvStreamlines')?.checked)fvBindDraw(r,r.linePos,r.lineColor,r.lineCount,gl.LINES,1)
}
function fcUploadMesh(mesh){
  const canvas=document.getElementById('fcCanvas');if(!canvas)return;if(!fcState.renderer)fcState.renderer=fvCreateRenderer(canvas);const r=fcState.renderer,b=fvBuildSurfaceBuffers(mesh);
  fvUploadBuffer(r,'surfacePos',b.surfacePositions);r.surfaceCount=b.surfacePositions.length/3;fvUploadBuffer(r,'edgePos',b.edgePositions);r.edgeCount=b.edgePositions.length/3;
  fvUploadBuffer(r,'edgeColor',fvConstantColors(r.edgeCount,[.12,.16,.22]));r.sliceCount=0;r.isoCount=0;r.vectorCount=0;r.lineCount=0;fcState.spatialHash=fvBuildSpatialHash(mesh.cellCenters,mesh.boundsMin,mesh.boundsMax,mesh.cellCount)
}
function fcUpdateDerived(range){
  const r=fcState.renderer,mesh=fcState.mesh,values=fcState.fieldValues;if(!r||!mesh||!values||!range?.valid)return;const palette=document.getElementById('fvPalette')?.value||'viridis';
  fvUploadBuffer(r,'surfaceColor',fvSurfaceColors(mesh,values,range.min,range.max,palette),r.gl.DYNAMIC_DRAW);
  if(document.getElementById('fvSlice')?.checked){
    const axis=document.getElementById('fvSliceAxis')?.value||'x',position=Number(document.getElementById('fvSlicePosition')?.value)||0,geom=fvBuildSliceGeometry(mesh,values,axis,position);
    fvUploadBuffer(r,'slicePos',geom.positions,r.gl.DYNAMIC_DRAW);fvUploadBuffer(r,'sliceColor',fvSliceColors(geom.values,range,palette),r.gl.DYNAMIC_DRAW);r.sliceCount=geom.positions.length/3
  }else r.sliceCount=0;
  if(document.getElementById('fvIso')?.checked&&typeof fvBuildIsoSurfaceGeometry==='function'){
    const iso=Number(document.getElementById('fvIsoValue')?.value),geom=fvBuildIsoSurfaceGeometry(mesh,values,iso);fvUploadBuffer(r,'isoPos',geom.positions,r.gl.DYNAMIC_DRAW);fvUploadBuffer(r,'isoColor',fvIsoColors(geom.positions.length/3,iso,range,palette),r.gl.DYNAMIC_DRAW);r.isoCount=geom.positions.length/3
  }else r.isoCount=0;
  fcRender()
}

function fcDifferenceMvp(canvas){return fcMvp(canvas)}
function fcRenderDifference(){
  if(!fcState.enabled||!document.getElementById('fcDifference')?.checked)return;const r=fcState.differenceRenderer,canvas=document.getElementById('fcDifferenceCanvas');if(!r||!canvas||!fvState.mesh||!fcState.differenceValues)return;
  const gl=r.gl,rect=canvas.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1),w=Math.max(2,Math.round(rect.width*dpr)),h=Math.max(2,Math.round(rect.height*dpr));
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}gl.viewport(0,0,w,h);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.useProgram(r.program);gl.uniformMatrix4fv(r.mvp,false,fcDifferenceMvp(canvas));
  const opacity=fvClamp(document.getElementById('fvOpacity')?.value??.92,.05,1),showEdges=document.getElementById('fvEdges')?.checked!==false;
  fvBindDraw(r,r.surfacePos,r.surfaceColor,r.surfaceCount,gl.TRIANGLES,opacity);
  if(showEdges){gl.depthFunc(gl.LEQUAL);fvBindDraw(r,r.edgePos,r.edgeColor,r.edgeCount,gl.LINES,Math.min(1,opacity+.08))}
}
function fcUpdateDifference(primaryMesh,compareMesh,primaryValues,compareValues){
  const enabled=!!document.getElementById('fcDifference')?.checked,viewport=document.getElementById('fcDifferenceViewport'),status=document.getElementById('fcDifferenceStatus');
  viewport?.classList.toggle('hidden',!enabled);if(!enabled){fcState.differenceValues=null;fcState.differenceRange=null;fcUpdateLayout();return}
  const compat=fcMeshesEquivalent(primaryMesh,compareMesh);if(!compat.ok){fcState.differenceValues=null;fcState.differenceRange=null;if(status){status.textContent=fcUi('3D difference unavailable: meshes are not topologically/geometrically equivalent (','Diferencia 3D no disponible: las mallas no son topológica/geométricamente equivalentes (')+compat.reason+').';status.classList.add('error')}fcUpdateLayout();return}
  const values=fcDifferenceValues(primaryValues,compareValues,'signed'),range=fcSymmetricDifferenceRange(values);if(!range.valid){if(status){status.textContent=fcUi('3D difference has no finite values.','La diferencia 3D no tiene valores finitos.');status.classList.add('error')}return}
  const canvas=document.getElementById('fcDifferenceCanvas');if(!fcState.differenceRenderer)fcState.differenceRenderer=fvCreateRenderer(canvas);const r=fcState.differenceRenderer,b=fvBuildSurfaceBuffers(primaryMesh);
  fvUploadBuffer(r,'surfacePos',b.surfacePositions);r.surfaceCount=b.surfacePositions.length/3;fvUploadBuffer(r,'edgePos',b.edgePositions);r.edgeCount=b.edgePositions.length/3;fvUploadBuffer(r,'edgeColor',fvConstantColors(r.edgeCount,[.12,.16,.22]));
  fvUploadBuffer(r,'surfaceColor',fvSurfaceColors(primaryMesh,values,range.min,range.max,'coolwarm'),r.gl.DYNAMIC_DRAW);
  fcState.differenceValues=values;fcState.differenceRange=range;if(status){status.classList.remove('error');status.textContent='Δ = '+(fvCase()?.name||fcUi('Primary','Principal'))+' − '+(fcCase()?.name||fcUi('Comparison','Comparado'))+' · '+fcUi('symmetric range','rango simétrico')+' ['+fcFmt(range.min)+', '+fcFmt(range.max)+']'}
  fcUpdateLayout();fcRenderDifference()
}
async function fcUpdateVectors(targetTime,seq){
  const r=fcState.renderer,mesh=fcState.mesh;if(!r||!mesh)return;const showV=!!document.getElementById('fvVectors')?.checked,showS=!!document.getElementById('fvStreamlines')?.checked;if(!showV&&!showS){r.vectorCount=0;r.lineCount=0;fcRender();return}
  const c=fcCase(),region=fcRegion(),name=document.getElementById('fvVector')?.value||'',g=fcVectorFor(c,region,name);if(!g){r.vectorCount=0;r.lineCount=0;fcRender();return}
  const sync=fcResolveTime(g.times,targetTime,fcMode());if(!sync.ok){r.vectorCount=0;r.lineCount=0;fcRender();return}
  const set=await pmLoadFieldSet(c.id,g.name,sync.time,region);if(seq!==fcState.seq)return;const parsed=fvPickFieldPart(set),vectors=fvVectorArray(parsed,mesh.cellCount);if(!vectors){r.vectorCount=0;r.lineCount=0;return}fcState.vectorValues=vectors;
  if(showV){const glyph=fvBuildVectorGlyphBuffers(mesh,vectors,280);fvUploadBuffer(r,'vectorPos',glyph.positions,r.gl.DYNAMIC_DRAW);fvUploadBuffer(r,'vectorColor',glyph.colors,r.gl.DYNAMIC_DRAW);r.vectorCount=glyph.positions.length/3}else r.vectorCount=0;
  if(showS){
    const axis=document.getElementById('fvSeedAxis')?.value||'x',count=Number(document.getElementById('fvSeedCount')?.value)||16,pos=Number(document.getElementById('fvSeedPosition')?.value)||.5,seeds=fvSeedPlane(mesh.boundsMin,mesh.boundsMax,axis,count,pos),lines=[];
    for(const seed of seeds){const line=fvCombineStreamline(seed,fcState.spatialHash,mesh.cellCenters,vectors,mesh.boundsMin,mesh.boundsMax);if(line.length>2)lines.push(line)}
    const speeds=lines.flatMap(l=>l.map(q=>q.speed)),vr=fvFiniteRange(speeds),buf=fvBuildLineBuffers(lines,vr.valid?vr:{min:0,max:1});fvUploadBuffer(r,'linePos',buf.positions,r.gl.DYNAMIC_DRAW);fvUploadBuffer(r,'lineColor',buf.colors,r.gl.DYNAMIC_DRAW);r.lineCount=buf.positions.length/3;fcState.streamlines=lines
  }else r.lineCount=0;fcRender()
}
function fcApplySharedRange(compareRange){
  const primary=fvFiniteRange(fvState.fieldValues),union=fcSharedRange(primary,compareRange);if(!union.valid)return union;
  const lock=!!document.getElementById('fvLockRange')?.checked;if(lock){if(!fcState.lockedRange)fcState.lockedRange=fcSharedRange(fvState.lockedRange||primary,compareRange);fvState.lockedRange=fcState.lockedRange}else fcState.lockedRange=null;
  const shared=lock?fcState.lockedRange:union;fvUpdateSurfaceColors(fvState.fieldValues,shared);fvUpdateSlice(shared);if(typeof fvUpdateIso==='function')fvUpdateIso(shared);fvLegend(shared,fvState.fieldParsed);return shared
}
async function fcRefreshFrame(){
  fcRefreshSelectors(true);fcState.enabled=!!document.getElementById('fcEnabled')?.checked;fcUpdateLayout();if(!fcState.enabled){fcClearRenderer();return}
  const c=fcCase(),region=fcRegion(),field=fcCurrentFieldName(),component=fcCurrentComponent(),target=Number(fvState.time),status=document.getElementById('fcStatus');if(!c||!field||!Number.isFinite(target)){fcClearRenderer();fcSetStatus(fcUi('Choose a comparison case after loading the primary frame.','Elige un caso comparado después de cargar el frame principal.'),true);return}
  const meshGroup=fcMeshFor(c,region),group=fcFieldFor(c,region,field);if(!meshGroup||!group){fcClearRenderer();fcSetStatus(fcUi('The comparison case does not have the same meshed region and volume field.','El caso comparado no tiene la misma región mallada y campo volumétrico.'),true);return}
  const sync=fcResolveTime(group.times,target,fcMode());if(!sync.ok){fcClearRenderer();fcSetStatus(fcUi('No exact comparison frame exists at t = ','No existe un frame exacto del caso comparado en t = ')+fcFmt(target)+' s.',true);return}
  const seq=++fcState.seq;try{
    fcSetStatus(fcUi('Loading synchronized comparison…','Cargando comparación sincronizada…'));const mesh=await fvLoadMesh(c,meshGroup);if(seq!==fcState.seq)return;
    if(fcState.mesh!==mesh){fcState.mesh=mesh;fcUploadMesh(mesh)}
    const set=await pmLoadFieldSet(c.id,field,sync.time,region);if(seq!==fcState.seq)return;const parsed=fvPickFieldPart(set);if(!parsed)throw new Error(fcUi('Comparison field is decomposed; reconstruct the case first.','El campo comparado está descompuesto; reconstruye primero el caso.'));
    const vals=pmComponentValues(parsed,component,mesh.cellCount);if(!vals.ok||vals.values.length!==mesh.cellCount)throw new Error(fcUi('Comparison field does not match the comparison mesh cell count.','El campo comparado no coincide con el número de celdas de su malla.'));
    const cr=fvFiniteRange(vals.values);if(!cr.valid)throw new Error(fcUi('Comparison field has no finite values.','El campo comparado no tiene valores finitos.'));
    fcState.caseId=c.id;fcState.region=region;fcState.fieldValues=vals.values;fcState.fieldParsed=parsed;fcState.time=sync.time;fcState.delta=sync.delta;fcState.range=cr;
    const shared=fcApplySharedRange(cr);fcUpdateDerived(shared);fcUpdateDifference(fvState.mesh,mesh,fvState.fieldValues,vals.values);await fcUpdateVectors(target,seq);if(seq!==fcState.seq)return;fcUpdateLabels();
    const timing=sync.exact?fcUi('exact physical time','tiempo físico exacto'):fcUi('nearest physical time','tiempo físico más cercano');
    fcSetStatus(c.name+' · '+(region||fcUi('default region','región predeterminada'))+' · '+field+' · '+timing+(sync.exact?'':' · Δt='+(sync.delta>=0?'+':'')+fcFmt(sync.delta)+' s'))
  }catch(e){console.error(e);fcClearRenderer();fcSetStatus(String(e?.message||e),true)}
}
function fcRefreshVisuals(){
  if(!fcState.enabled||!fcState.fieldValues)return;const shared=fcApplySharedRange(fcState.range);fcUpdateDerived(shared);fcUpdateDifference(fvState.mesh,fcState.mesh,fvState.fieldValues,fcState.fieldValues);fcUpdateVectors(fvState.time,fcState.seq).catch(e=>fcSetStatus(String(e?.message||e),true))
}
function fcUpdateLayout(){
  const panel=document.getElementById('fieldViewPanel'),compare=document.getElementById('fcViewport');if(!panel||!compare)return;panel.classList.toggle('fcCompareMode',fcState.enabled);compare.classList.toggle('hidden',!fcState.enabled);const diff=document.getElementById('fcDifferenceViewport'),showDiff=fcState.enabled&&!!document.getElementById('fcDifference')?.checked;if(diff)diff.classList.toggle('hidden',!showDiff);panel.classList.toggle('fcDifferenceMode',showDiff);fcUpdateLabels();setTimeout(()=>{fvRender();fcRender();fcRenderDifference()},0)
}
function fcInstallUi(){
  if(document.getElementById('fcPanel'))return true;const controls=document.getElementById('fieldViewControls'),status=document.getElementById('fvStatus'),panel=document.getElementById('fieldViewPanel'),primary=panel?.querySelector('.fvViewport');if(!controls||!status||!panel||!primary)return false;
  const box=document.createElement('details');box.className='analysisExt';box.id='fcPanel';box.open=false;box.innerHTML='<summary class="analysisExtHead"><strong data-fl-en="Synchronized 3D case comparison" data-fl-es="Comparación 3D sincronizada de casos">Synchronized 3D case comparison</strong><span class="badge" id="fcBadge">—</span></summary><div class="extSectionBody">'+
    '<div class="fvChecks"><label class="inlineCheck"><input id="fcEnabled" type="checkbox"> <span data-fl-en="Compare side by side" data-fl-es="Comparar lado a lado">Compare side by side</span></label><label class="inlineCheck"><input id="fcDifference" type="checkbox"> <span data-fl-en="Show 3D difference" data-fl-es="Mostrar diferencia 3D">Show 3D difference</span></label></div>'+
    '<div class="row2" style="margin-top:8px"><div class="field"><label data-fl-en="Comparison case" data-fl-es="Caso comparado">Comparison case</label><select id="fcCase"></select></div><div class="field"><label data-fl-en="Region" data-fl-es="Región">Region</label><select id="fcRegion"></select></div></div>'+
    '<div class="field"><label data-fl-en="Physical-time synchronization" data-fl-es="Sincronización por tiempo físico">Physical-time synchronization</label><select id="fcSync"><option value="nearest" data-fl-en="Nearest available (show Δt)" data-fl-es="Más cercano disponible (mostrar Δt)">Nearest available (show Δt)</option><option value="exact" data-fl-en="Exact time only" data-fl-es="Solo tiempo exacto">Exact time only</option></select></div>'+
    '<div class="smallnote" data-fl-en="Both views use the same field/component and a shared color scale. Camera orientation and relative zoom are synchronized; frame indices are never assumed equivalent." data-fl-es="Ambas vistas usan el mismo campo/componente y una escala de color compartida. La orientación de cámara y el zoom relativo se sincronizan; nunca se supone que los índices de frame sean equivalentes.">Both views use the same field/component and a shared color scale. Camera orientation and relative zoom are synchronized; frame indices are never assumed equivalent.</div>'+
    '<div class="extStatus" id="fcStatus"></div></div>';status.insertAdjacentElement('beforebegin',box);
  const grid=document.createElement('div');grid.id='fcViewGrid';grid.className='fcViewGrid';primary.parentElement.insertBefore(grid,primary);grid.appendChild(primary);
  const primaryLabel=document.createElement('div');primaryLabel.id='fcPrimaryLabel';primaryLabel.className='fcViewLabel';primary.appendChild(primaryLabel);
  const second=document.createElement('div');second.id='fcViewport';second.className='fvViewport fcViewport hidden';second.innerHTML='<canvas id="fcCanvas" aria-label="Synchronized comparison 3D OpenFOAM field visualization"></canvas><div class="fcViewLabel" id="fcCompareLabel"></div>';grid.appendChild(second);
  const diff=document.createElement('div');diff.id='fcDifferenceViewport';diff.className='fvViewport fcViewport hidden';diff.innerHTML='<canvas id="fcDifferenceCanvas" aria-label="3D OpenFOAM signed difference field visualization"></canvas><div class="fcViewLabel">Δ field · Primary − Comparison</div><div class="extStatus fcDifferenceStatus" id="fcDifferenceStatus"></div>';grid.appendChild(diff);
  const style=document.createElement('style');style.id='fcStyles';style.textContent='.fcViewGrid{display:grid;grid-template-columns:minmax(0,1fr);gap:10px}.fieldViewPanel.fcCompareMode .fcViewGrid{grid-template-columns:repeat(2,minmax(0,1fr))}.fieldViewPanel.fcCompareMode.fcDifferenceMode .fcViewGrid{grid-template-columns:repeat(3,minmax(0,1fr))}.fcViewport.hidden{display:none}.fcViewport #fcCanvas,.fcViewport #fcDifferenceCanvas{display:block;width:100%;height:500px;touch-action:none}.fcViewLabel{position:absolute;left:12px;bottom:12px;max-width:65%;padding:5px 8px;border:1px solid var(--line);border-radius:999px;background:color-mix(in srgb,var(--panel) 88%,transparent);font-size:9px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;backdrop-filter:blur(8px)}.fieldViewPanel.fcCompareMode .fvLegend{width:min(190px,45%)}@media(max-width:1180px){.fieldViewPanel.fcCompareMode.fcDifferenceMode .fcViewGrid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:980px){.fieldViewPanel.fcCompareMode .fcViewGrid{grid-template-columns:1fr}.fcViewport #fcCanvas,.fcViewport #fcDifferenceCanvas{height:420px}}';document.head.appendChild(style);
  try{flApplyBilingualText(box)}catch{}
  document.getElementById('fcEnabled').addEventListener('change',()=>{fcState.lockedRange=null;fcRefreshFrame()});document.getElementById('fcDifference').addEventListener('change',()=>{fcState.lockedRange=null;fcRefreshFrame()});
  document.getElementById('fcCase').addEventListener('change',()=>{fcRefreshSelectors(false);fcState.lockedRange=null;fcRefreshFrame()});
  document.getElementById('fcRegion').addEventListener('change',()=>{fcState.lockedRange=null;fcRefreshFrame()});
  document.getElementById('fcSync').addEventListener('change',()=>fcRefreshFrame());
  if(typeof ResizeObserver!=='undefined'){new ResizeObserver(()=>fcRender()).observe(second);new ResizeObserver(()=>fcRenderDifference()).observe(diff);}
  fcRefreshSelectors(false);fcUpdateLayout();return true
}
function fcInstall(){
  const mount=()=>fcInstallUi();if(!mount()){const retry=()=>{if(mount())return;requestAnimationFrame(retry)};requestAnimationFrame(retry)}
  if(typeof fvLoadFrame==='function'&&!fvLoadFrame.__fcPatched){const previous=fvLoadFrame;fvLoadFrame=async function(...args){const x=await previous.apply(this,args);await fcRefreshFrame();return x};fvLoadFrame.__fcPatched=true}
  if(typeof fvRender==='function'&&!fvRender.__fcPatched){const previous=fvRender;fvRender=function(...args){const x=previous.apply(this,args);fcRender();fcRenderDifference();return x};fvRender.__fcPatched=true}
  for(const id of ['fvCase','fvRegion','fvField','fvComponent'])document.getElementById(id)?.addEventListener('change',()=>setTimeout(()=>{fcRefreshSelectors(true);fcState.lockedRange=null;fcRefreshFrame()},0));
  for(const id of ['fvPalette','fvSurface','fvEdges','fvOpacity','fvLockRange','fvSlice','fvSliceAxis','fvSlicePosition','fvSliceOpacity','fvIso','fvIsoValue','fvIsoOpacity','fvVectors','fvStreamlines','fvVector','fvSeedAxis','fvSeedCount','fvSeedPosition'])document.getElementById(id)?.addEventListener(id==='fvSlicePosition'||id==='fvIsoValue'||id==='fvOpacity'||id==='fvSliceOpacity'||id==='fvIsoOpacity'||id==='fvSeedPosition'?'input':'change',()=>setTimeout(fcRefreshVisuals,0));
  document.addEventListener('foamlens-language-change',()=>{const p=document.getElementById('fcPanel');if(p)try{flApplyBilingualText(p)}catch{};fcRefreshSelectors(true);fcUpdateLabels()});
}
fcInstall();
window.FoamLensFieldCompare={fcCloseTime,fcNearestTime,fcResolveTime,fcSharedRange,fcMeshDiag,fcSyncedCamera,fcMeshesEquivalent,fcDifferenceValues,fcSymmetricDifferenceRange,fcRefreshFrame};
