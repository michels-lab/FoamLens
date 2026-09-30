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
  enabled:false,caseId:null,region:'',fieldName:'',component:'value',fieldStorage:'volume',mesh:null,renderer:null,fieldValues:null,fieldParsed:null,time:NaN,delta:NaN,range:null,lockedRange:null,videoRangeOverride:null,
  spatialHash:null,vectorValues:null,streamlines:[],differenceValues:null,differenceRange:null,differenceRenderer:null,seq:0,lastError:''
};
function fcUi(en,es){try{return flUi(en,es)}catch{return en}}
function fcEsc(v){try{return fvEsc(v)}catch{return String(v??'')}}
function fcFmt(v){try{return fvFmt(v)}catch{return Number.isFinite(Number(v))?String(v):'—'}}
function fcUnit(parsed){
  try{return parsed?.dimensions&&typeof pmUnitFromDimensions==='function'?pmUnitFromDimensions(parsed.dimensions):''}catch{return''}
}
function fcLegendMarkup(field,component,parsed,range,palette='viridis'){
  if(!range?.valid)return'';const unit=fcUnit(parsed),name=String(field||parsed?.object||'Field'),comp=component&&component!=='value'?' · '+String(component):'',delta=Number(range.max)-Number(range.min),uniform=typeof fvRangeUniform==='function'?fvRangeUniform(range):Math.abs(delta)<=Math.max(Math.abs(Number(range.min)),Math.abs(Number(range.max)),1)*1e-12;
  if(uniform)return '<div class="fcLegendTitle">'+fcEsc(name+comp)+(unit?' <span>['+fcEsc(unit)+']</span>':'')+'</div><div class="fcLegendUniform">'+fcUi('Uniform','Uniforme')+' · '+fcEsc(typeof fvFmtRange==='function'?fvFmtRange(range.min,range):fcFmt(range.min))+'</div>';
  const grad=typeof fvLegendGradient==='function'?fvLegendGradient(palette):'linear-gradient(90deg,#440154,#21908d,#fde725)',fmt=v=>fcEsc(typeof fvFmtRange==='function'?fvFmtRange(v,range):fcFmt(v));
  return '<div class="fcLegendTitle">'+fcEsc(name+comp)+(unit?' <span>['+fcEsc(unit)+']</span>':'')+'</div><div class="fcLegendBar" style="background:'+fcEsc(grad)+'"></div><div class="fcLegendTicks"><span>'+fmt(range.min)+'</span><span>'+fmt((Number(range.min)+Number(range.max))/2)+'</span><span>'+fmt(range.max)+'</span></div><div class="fcLegendDelta">Δ '+fmt(delta)+'</div>'
}
function fcUpdateViewportLegend(id,field,component,parsed,range){
  const e=document.getElementById(id);if(!e)return;const palette=document.getElementById('fvPalette')?.value||'viridis';e.innerHTML=fcLegendMarkup(field,component,parsed,range,palette);e.classList.toggle('hidden',!range?.valid)
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
  const r=fcState.renderer;if(r){r.surfaceCount=0;r.edgeCount=0;r.sliceCount=0;r.isoCount=0;r.vectorCount=0;r.lineCount=0;r.probeCount=0}const dr=fcState.differenceRenderer;if(dr){dr.surfaceCount=0;dr.edgeCount=0;dr.sliceCount=0;dr.isoCount=0;dr.vectorCount=0;dr.lineCount=0}fcState.differenceValues=null;fcState.differenceRange=null;fcState.mesh=null;fcState.fieldValues=null;fcState.fieldParsed=null;fcState.vectorValues=null;fcState.streamlines=[];fcRender()
}
function fcSetStatus(text,error=false){
  fcState.lastError=error?String(text||''):'';const e=document.getElementById('fcStatus');if(e){e.textContent=String(text||'');e.classList.toggle('error',!!error)}
}
function fcUpdateLabels(){
  const primary=document.getElementById('fcPrimaryLabel'),compare=document.getElementById('fcCompareLabel'),pc=fvCase(),cc=fcCase();
  if(primary)primary.textContent=(pc?.name||fcUi('Primary case','Caso principal'))+' · '+(fvState.fieldName||document.getElementById('fvField')?.value||'—')+(Number.isFinite(fvState.time)?' · t='+fcFmt(fvState.time)+' s':'');
  if(compare)compare.textContent=(cc?.name||fcUi('Comparison case','Caso comparado'))+' · '+(fcState.fieldName||fcCurrentFieldName()||'—')+(Number.isFinite(fcState.time)?' · t='+fcFmt(fcState.time)+' s':'')+(Number.isFinite(fcState.delta)&&Math.abs(fcState.delta)>1e-12?' · Δt='+(fcState.delta>=0?'+':'')+fcFmt(fcState.delta)+' s':'')
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
function fcMvp(canvas){
  const c=fcSyncedCamera(fvState.camera,fvState.mesh,fcState.mesh),d=Math.max(1e-12,c.distance),cp=Math.cos(c.pitch),eye=[c.target[0]+d*cp*Math.sin(c.yaw),c.target[1]+d*Math.sin(c.pitch),c.target[2]+d*cp*Math.cos(c.yaw)],near=Math.max(d/1000,1e-8),far=Math.max(d*20,near*100),proj=fvPerspective(Math.PI/4,Math.max(1,canvas.width)/Math.max(1,canvas.height),near,far),view=fvLookAt(eye,c.target,[0,1,0]);
  return fvMat4Mul(proj,view)
}
function fcRender(){
  if(!fcState.enabled)return;const r=fcState.renderer,canvas=document.getElementById('fcCanvas');if(!r||!canvas||!fcState.mesh)return;const gl=r.gl,rect=canvas.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1),w=Math.max(2,Math.round(rect.width*dpr)),h=Math.max(2,Math.round(rect.height*dpr));
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}gl.viewport(0,0,w,h);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.useProgram(r.program);gl.uniformMatrix4fv(r.mvp,false,fcMvp(canvas));
  const showSurface=document.getElementById('fvSurface')?.checked!==false,showEdges=document.getElementById('fvEdges')?.checked!==false,showSlice=!!document.getElementById('fvSlice')?.checked,showIso=!!document.getElementById('fvIso')?.checked,opacity=fvClamp(document.getElementById('fvOpacity')?.value??.92,.05,1),sliceOpacity=fvClamp(document.getElementById('fvSliceOpacity')?.value??.96,.05,1),isoOpacity=fvClamp(document.getElementById('fvIsoOpacity')?.value??.88,.05,1),interiorActive=showSlice||showIso;
  if(showSurface){const faceAssoc=fcState.fieldStorage==='surface';gl.depthMask(!interiorActive&&!faceAssoc);fvBindDraw(r,r.surfacePos,r.surfaceColor,r.surfaceCount,gl.TRIANGLES,faceAssoc?Math.min(opacity,.16):(interiorActive?Math.min(opacity,.28):opacity));gl.depthMask(true);if(faceAssoc){gl.depthMask(false);fvBindDraw(r,r.faceFieldPos,r.faceFieldColor,r.faceFieldCount,gl.TRIANGLES,opacity);gl.depthMask(true)}}
  if(showSlice&&fcState.fieldStorage!=='surface'){gl.depthFunc(gl.LEQUAL);fvBindDraw(r,r.slicePos,r.sliceColor,r.sliceCount,gl.TRIANGLES,sliceOpacity)}
  if(showIso&&fcState.fieldStorage!=='surface'){gl.depthFunc(gl.LEQUAL);fvBindDraw(r,r.isoPos,r.isoColor,r.isoCount,gl.TRIANGLES,isoOpacity)}
  if(showEdges){gl.depthFunc(gl.LEQUAL);fvBindDraw(r,r.edgePos,r.edgeColor,r.edgeCount,gl.LINES,Math.min(1,opacity+.08))}
  if(document.getElementById('fvVectors')?.checked)fvBindDraw(r,r.vectorPos,r.vectorColor,r.vectorCount,gl.LINES,1);
  if(document.getElementById('fvStreamlines')?.checked)fvBindDraw(r,r.linePos,r.lineColor,r.lineCount,gl.LINES,1)
}
function fcUploadMesh(mesh){
  const canvas=document.getElementById('fcCanvas');if(!canvas)return;if(!fcState.renderer)fcState.renderer=fvCreateRenderer(canvas);const r=fcState.renderer,b=fvBuildSurfaceBuffers(mesh),fb=fvBuildInternalFaceBuffers(mesh);
  fvUploadBuffer(r,'surfacePos',b.surfacePositions);r.surfaceCount=b.surfacePositions.length/3;fvUploadBuffer(r,'edgePos',b.edgePositions);r.edgeCount=b.edgePositions.length/3;fvUploadBuffer(r,'faceFieldPos',fb.positions);r.faceFieldCount=0;mesh._fcInternalTriangleFaces=fb.triangleFaces;
  fvUploadBuffer(r,'edgeColor',fvConstantColors(r.edgeCount,[.12,.16,.22]));r.sliceCount=0;r.isoCount=0;r.vectorCount=0;r.lineCount=0;fcState.spatialHash=fvBuildSpatialHash(mesh.cellCenters,mesh.boundsMin,mesh.boundsMax,mesh.cellCount)
}
function fcUpdateDerived(range){
  range=fcState.videoRangeOverride?.valid?fcState.videoRangeOverride:range;const r=fcState.renderer,mesh=fcState.mesh,values=fcState.fieldValues,storage=String(fcState.fieldStorage||'volume');if(!r||!mesh||!values||!range?.valid)return;const palette=document.getElementById('fvPalette')?.value||'viridis';r.faceFieldCount=0;
  if(storage==='point')fvUploadBuffer(r,'surfaceColor',fvPointSurfaceColors(mesh,values,range.min,range.max,palette),r.gl.DYNAMIC_DRAW);
  else if(storage==='surface'){
    fvUploadBuffer(r,'surfaceColor',fvConstantColors(r.surfaceCount,[.32,.38,.46]),r.gl.DYNAMIC_DRAW);const triFaces=mesh._fcInternalTriangleFaces||[],colors=fvInternalFaceColors(triFaces,values,range.min,range.max,palette);fvUploadBuffer(r,'faceFieldColor',colors,r.gl.DYNAMIC_DRAW);r.faceFieldCount=triFaces.length*3
  }else fvUploadBuffer(r,'surfaceColor',fvSurfaceColors(mesh,values,range.min,range.max,palette),r.gl.DYNAMIC_DRAW);
  const interior=storage!=='surface';
  if(interior&&document.getElementById('fvSlice')?.checked){
    const axis=document.getElementById('fvSliceAxis')?.value||'x',position=Number(document.getElementById('fvSlicePosition')?.value)||0,geom=storage==='point'?fvBuildPointSliceGeometry(mesh,values,axis,position):fvBuildSliceGeometry(mesh,values,axis,position);
    fvUploadBuffer(r,'slicePos',geom.positions,r.gl.DYNAMIC_DRAW);fvUploadBuffer(r,'sliceColor',fvSliceColors(geom.values,range,palette),r.gl.DYNAMIC_DRAW);r.sliceCount=geom.positions.length/3
  }else r.sliceCount=0;
  if(interior&&document.getElementById('fvIso')?.checked&&typeof fvBuildIsoSurfaceGeometry==='function'){
    const iso=Number(document.getElementById('fvIsoValue')?.value),geom=storage==='point'&&typeof fvBuildPointIsoSurfaceGeometry==='function'?fvBuildPointIsoSurfaceGeometry(mesh,values,iso):fvBuildIsoSurfaceGeometry(mesh,values,iso);fvUploadBuffer(r,'isoPos',geom.positions,r.gl.DYNAMIC_DRAW);fvUploadBuffer(r,'isoColor',fvIsoColors(geom.positions.length/3,iso,range,palette),r.gl.DYNAMIC_DRAW);r.isoCount=geom.positions.length/3
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
  if(!fcSameQuantity()){fcState.differenceValues=null;fcState.differenceRange=null;flSetIssue(status,'different field/component/association/dimensions; difference unavailable',{analysis:'3D Difference'});fcUpdateLayout();return}
  if(String(fvState.fieldStorage||'volume')!=='volume'||String(fcState.fieldStorage||'volume')!=='volume'){fcState.differenceValues=null;fcState.differenceRange=null;flSetIssue(status,'3D difference currently requires cell-associated volume fields',{analysis:'3D Difference'});fcUpdateLayout();return}
  const compat=fcMeshesEquivalent(primaryMesh,compareMesh);if(!compat.ok){fcState.differenceValues=null;fcState.differenceRange=null;flSetIssue(status,'mesh mismatch: '+compat.reason+'; difference unavailable',{analysis:'3D Difference'});fcUpdateLayout();return}
  const values=fcDifferenceValues(primaryValues,compareValues,'signed'),range=fcSymmetricDifferenceRange(values);if(!range.valid){flSetIssue(status,'no-compatible-values',{analysis:'3D Difference'});return}
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
  if(showV){const target=typeof fvVectorGlyphTarget==='function'?fvVectorGlyphTarget(mesh):280,scale=typeof fvVectorGlyphScale==='function'?fvVectorGlyphScale():1,glyph=fvBuildVectorGlyphBuffers(mesh,vectors,target,scale);fvUploadBuffer(r,'vectorPos',glyph.positions,r.gl.DYNAMIC_DRAW);fvUploadBuffer(r,'vectorColor',glyph.colors,r.gl.DYNAMIC_DRAW);r.vectorCount=glyph.positions.length/3}else r.vectorCount=0;
  if(showS){
    const axis=document.getElementById('fvSeedAxis')?.value||'x',count=Number(document.getElementById('fvSeedCount')?.value)||16,pos=Number(document.getElementById('fvSeedPosition')?.value)||.5,seeds=fvSeedPlane(mesh.boundsMin,mesh.boundsMax,axis,count,pos),lines=[];
    for(const seed of seeds){const line=fvCombineStreamline(seed,fcState.spatialHash,mesh.cellCenters,vectors,mesh.boundsMin,mesh.boundsMax);if(line.length>2)lines.push(line)}
    const speeds=lines.flatMap(l=>l.map(q=>q.speed)),vr=fvFiniteRange(speeds),buf=fvBuildLineBuffers(lines,vr.valid?vr:{min:0,max:1});fvUploadBuffer(r,'linePos',buf.positions,r.gl.DYNAMIC_DRAW);fvUploadBuffer(r,'lineColor',buf.colors,r.gl.DYNAMIC_DRAW);r.lineCount=buf.positions.length/3;fcState.streamlines=lines
  }else r.lineCount=0;fcRender()
}
function fcSameQuantity(){
  return String(fvState.fieldName||document.getElementById('fvField')?.value||'')===String(fcState.fieldName||fcCurrentFieldName()||'')&&String(fvState.component||document.getElementById('fvComponent')?.value||'value')===String(fcState.component||fcCurrentComponent()||'value')&&String(fvState.fieldStorage||'volume')===String(fcState.fieldStorage||'volume')&&String(fvState.fieldParsed?.dimensions||'')===String(fcState.fieldParsed?.dimensions||'')
}
function fcApplySharedRange(compareRange){
  const primary=fvFiniteRange(fvState.fieldValues);if(!primary.valid)return compareRange;
  if(!fcSameQuantity()){const primaryDisplay=typeof fvDisplayRange==='function'?fvDisplayRange(primary):primary;fvUpdateSurfaceColors(fvState.fieldValues,primaryDisplay);fvUpdateSlice(primaryDisplay);if(typeof fvUpdateIso==='function')fvUpdateIso(primaryDisplay);fvLegend(primaryDisplay,fvState.fieldParsed);return compareRange}
  const union=fcSharedRange(primary,compareRange);if(!union.valid)return union;fvUpdateSurfaceColors(fvState.fieldValues,union);fvUpdateSlice(union);if(typeof fvUpdateIso==='function')fvUpdateIso(union);fvLegend(union,fvState.fieldParsed);return union
}
async function fcRefreshFrame(){
  fcRefreshSelectors(true);fcState.enabled=!!document.getElementById('fcEnabled')?.checked;fcUpdateLayout();if(!fcState.enabled){fcClearRenderer();return}
  const selected=fcCase(),region=fcRegion(),field=fcCurrentFieldName(),component=fcCurrentComponent(),target=Number(fvState.time);if(!selected||!field||!Number.isFinite(target)){fcClearRenderer();fcSetStatus(fcUi('Choose a synchronized 3D view after loading the primary frame.','Elige una vista 3D sincronizada después de cargar el frame principal.'),true);return}
  const group=fcFieldFor(selected,region,field);if(!group){fcClearRenderer();fcSetStatus(fcUi('The selected case/region does not expose this compatible 3D field.','El caso/región seleccionado no expone este campo 3D compatible.'),true);return}
  const sync=fcResolveTime(group.times,target,fcMode());if(!sync.ok){fcClearRenderer();fcSetStatus(fcUi('No exact comparison frame exists at t = ','No existe un frame exacto del caso comparado en t = ')+fcFmt(target)+' s.',true);return}
  const seq=++fcState.seq;try{
    fcSetStatus(fcUi('Loading synchronized comparison…','Cargando comparación sincronizada…'));const data=await fvLoadFrameData(selected,group,region,sync.time,component,{includeBoundary:false});if(seq!==fcState.seq)return;
    const mesh=data.mesh;if(fcState.mesh!==mesh){fcState.mesh=mesh;fcUploadMesh(mesh)}
    fcState.caseId=selected.id;fcState.region=region;fcState.fieldName=field;fcState.component=component;fcState.fieldStorage=data.storage;fcState.fieldValues=data.fieldValues;fcState.fieldParsed=data.parsed;fcState.time=sync.time;fcState.delta=sync.delta;fcState.range=data.range;
    const shared=fcApplySharedRange(data.range);fcUpdateDerived(shared);fcUpdateViewportLegend('fcLegend',field,component,data.parsed,shared);fcUpdateDifference(fvState.mesh,mesh,fvState.fieldValues,data.fieldValues);await fcUpdateVectors(target,seq);if(seq!==fcState.seq)return;fcUpdateLabels();
    const timing=sync.exact?fcUi('exact physical time','tiempo físico exacto'):fcUi('nearest physical time','tiempo físico más cercano');fcSetStatus(selected.name+' · '+(region||fcUi('default region','región predeterminada'))+' · '+field+' · '+fvAssociationLabel(data.storage)+' · '+timing+(sync.exact?'':' · Δt='+(sync.delta>=0?'+':'')+fcFmt(sync.delta)+' s'))
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
function fcExtraMvp(state,canvas){
  const cam=fcSyncedCamera(fvState.camera,fvState.mesh,state.mesh),d=Math.max(1e-12,cam.distance),cp=Math.cos(cam.pitch),eye=[cam.target[0]+d*cp*Math.sin(cam.yaw),cam.target[1]+d*Math.sin(cam.pitch),cam.target[2]+d*cp*Math.cos(cam.yaw)],basis=typeof fvCameraBasis==='function'?fvCameraBasis(cam):{upRef:[0,1,0]},near=Math.max(d/1000,1e-8),far=Math.max(d*20,near*100),proj=fvPerspective(Math.PI/4,Math.max(1,canvas.width)/Math.max(1,canvas.height),near,far),view=fvLookAt(eye,cam.target,basis.upRef||[0,1,0]);return fvMat4Mul(proj,view)
}
function fcExtraRender(state){
  if(!fcState.enabled||!state?.renderer||!state.mesh)return;const canvas=fcExtraDom(state.id,'Canvas'),r=state.renderer;if(!canvas)return;const gl=r.gl,rect=canvas.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1),w=Math.max(2,Math.round(rect.width*dpr)),h=Math.max(2,Math.round(rect.height*dpr));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}
  gl.viewport(0,0,w,h);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.useProgram(r.program);gl.uniformMatrix4fv(r.mvp,false,fcExtraMvp(state,canvas));
  const opacity=fvClamp(document.getElementById('fvOpacity')?.value??.92,.05,1),showEdges=document.getElementById('fvEdges')?.checked!==false;
  if(state.storage==='surface'){fvBindDraw(r,r.surfacePos,r.surfaceColor,r.surfaceCount,gl.TRIANGLES,Math.min(.14,opacity));fvBindDraw(r,r.faceFieldPos,r.faceFieldColor,r.faceFieldCount,gl.TRIANGLES,opacity)}
  else fvBindDraw(r,r.surfacePos,r.surfaceColor,r.surfaceCount,gl.TRIANGLES,opacity);
  if(showEdges)fvBindDraw(r,r.edgePos,r.edgeColor,r.edgeCount,gl.LINES,Math.min(1,opacity+.08))
}
function fcExtraUpload(state,data){
  const canvas=fcExtraDom(state.id,'Canvas');if(!canvas)return;if(!state.renderer)state.renderer=fvCreateRenderer(canvas);const r=state.renderer,mesh=data.mesh,b=fvBuildSurfaceBuffers(mesh),range=state.videoRangeOverride?.valid?state.videoRangeOverride:data.range,palette=document.getElementById('fvPalette')?.value||'viridis';
  fvUploadBuffer(r,'surfacePos',b.surfacePositions);r.surfaceCount=b.surfacePositions.length/3;fvUploadBuffer(r,'edgePos',b.edgePositions);r.edgeCount=b.edgePositions.length/3;fvUploadBuffer(r,'edgeColor',fvConstantColors(r.edgeCount,[.12,.16,.22]));
  state.storage=data.storage;
  if(data.storage==='point')fvUploadBuffer(r,'surfaceColor',fvPointSurfaceColors(mesh,data.fieldValues,range.min,range.max,palette),r.gl.DYNAMIC_DRAW);
  else if(data.storage==='surface'){
    fvUploadBuffer(r,'surfaceColor',fvConstantColors(r.surfaceCount,[.32,.38,.46]),r.gl.DYNAMIC_DRAW);const fb=fvBuildInternalFaceBuffers(mesh);fvUploadBuffer(r,'faceFieldPos',fb.positions,r.gl.DYNAMIC_DRAW);fvUploadBuffer(r,'faceFieldColor',fvInternalFaceColors(fb.triangleFaces,data.fieldValues,range.min,range.max,palette),r.gl.DYNAMIC_DRAW);r.faceFieldCount=fb.positions.length/3
  }else fvUploadBuffer(r,'surfaceColor',fvSurfaceColors(mesh,data.fieldValues,range.min,range.max,palette),r.gl.DYNAMIC_DRAW);
  state.mesh=mesh;state.range=data.range;state.fieldValues=data.fieldValues;state.fieldParsed=data.parsed;fcUpdateViewportLegend('fcExtra'+state.id+'Legend',state.fieldName,state.component,data.parsed,range);fcExtraRender(state)
}
function fcExtraUpdateLabel(state){
  const e=fcExtraDom(state.id,'Label'),c=fcExtraCase(state);if(!e)return;e.textContent=(c?.name||fcUi('View','Vista')+' '+state.id)+' · '+(state.fieldName||fcExtraField(state)||'—')+(Number.isFinite(state.time)?' · t='+fcFmt(state.time)+' s':'')+(Number.isFinite(state.delta)&&Math.abs(state.delta)>1e-12?' · Δt='+(state.delta>=0?'+':'')+fcFmt(state.delta)+' s':'')
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
  const group=fcFieldFor(c,region,field);if(!group){if(status)status.textContent=fcUi('Selected field is unavailable in this region.','La variable seleccionada no está disponible en esta región.');return}const sync=fcResolveTime(group.times,target,fcMode());if(!sync.ok){if(status)status.textContent=fcUi('No synchronized frame at this physical time.','No hay frame sincronizado en este tiempo físico.');return}
  const seq=++state.seq;try{if(status)status.textContent=fcUi('Loading synchronized view…','Cargando vista sincronizada…');const data=await fvLoadFrameData(c,group,region,sync.time,component,{includeBoundary:false});if(seq!==state.seq)return;state.caseId=c.id;state.region=region;state.fieldName=field;state.component=component;state.time=sync.time;state.delta=sync.delta;fcExtraUpload(state,data);fcExtraUpdateLabel(state);if(status)status.textContent=(sync.exact?fcUi('Exact physical time','Tiempo físico exacto'):fcUi('Nearest physical time','Tiempo físico más cercano'))+(sync.exact?'':' · Δt='+(sync.delta>=0?'+':'')+fcFmt(sync.delta)+' s')}catch(e){if(status)status.textContent=String(e?.message||e)}
}
async function fcRefreshExtras(){for(const state of fcExtraViews)await fcExtraRefreshFrame(state)}
function fcRenderExtras(){for(const state of fcExtraViews)fcExtraRender(state)}
function fcExtraRemove(id){
  const i=fcExtraViews.findIndex(v=>v.id===id);if(i<0)return;fcExtraViews.splice(i,1);fcExtraDom(id,'Controls')?.remove();fcExtraDom(id,'Viewport')?.remove();fcUpdateLayout()
}
function fcExtraAdd(){
  if(2+fcExtraViews.length>=FC_MAX_TOTAL_VIEWS)return;let id=3;while(fcExtraViews.some(v=>v.id===id))id++;const state={id,seq:0,renderer:null,mesh:null,fieldValues:null,fieldParsed:null,range:null,videoRangeOverride:null,time:NaN,delta:NaN,caseId:null,region:'',fieldName:'',component:'value',storage:'volume'};fcExtraViews.push(state);
  const controls=document.getElementById('fcExtraControls'),grid=document.getElementById('fcViewGrid');if(!controls||!grid)return;const card=document.createElement('div');card.id='fcExtra'+id+'Controls';card.className='fcExtraCard';card.innerHTML='<div class="fcExtraHead"><b>'+fcUi('View','Vista')+' '+id+'</b><button class="btn tiny" type="button" id="fcExtra'+id+'Remove">×</button></div><div class="row2"><div class="field"><label>'+fcUi('Case','Caso')+'</label><select id="fcExtra'+id+'Case"></select></div><div class="field"><label>'+fcUi('Region','Región')+'</label><select id="fcExtra'+id+'Region"></select></div></div><div class="row2"><div class="field"><label>'+fcUi('Field','Variable')+'</label><select id="fcExtra'+id+'Field"></select></div><div class="field"><label>'+fcUi('Component','Componente')+'</label><select id="fcExtra'+id+'Component"></select></div></div><div class="smallnote" id="fcExtra'+id+'Status"></div>';controls.appendChild(card);
  const viewport=document.createElement('div');viewport.id='fcExtra'+id+'Viewport';viewport.className='fvViewport fcViewport';viewport.innerHTML='<canvas id="fcExtra'+id+'Canvas" aria-label="Synchronized multi-view OpenFOAM field visualization"></canvas><div class="fcViewLabel" id="fcExtra'+id+'Label"></div><div class="fcLegend hidden" id="fcExtra'+id+'Legend"></div>';grid.appendChild(viewport);
  fcExtraDom(id,'Remove').onclick=()=>fcExtraRemove(id);for(const suffix of ['Case','Region','Field','Component'])fcExtraDom(id,suffix).addEventListener('change',()=>{fcExtraRefreshSelectors(state,suffix!=='Case');fcExtraRefreshFrame(state)});
  if(typeof ResizeObserver!=='undefined')new ResizeObserver(()=>fcExtraRender(state)).observe(viewport);fcExtraRefreshSelectors(state,false);fcExtraRefreshFrame(state);fcUpdateLayout()
}
function fcVideoDescriptors(){
  const out=[];if(fcState.enabled&&fcState.mesh&&fcState.fieldValues)out.push({key:'view2',canvasId:'fcCanvas',labelId:'fcCompareLabel',caseName:fcCase()?.name||'',fieldName:fcState.fieldName||fcCurrentFieldName(),component:fcState.component||fcCurrentComponent(),time:fcState.time,range:fvFiniteRange(fcState.fieldValues),dimensions:fcState.fieldParsed?.dimensions||''});
  for(const s of fcExtraViews)if(fcState.enabled&&s.mesh&&s.fieldValues)out.push({key:'view'+s.id,canvasId:'fcExtra'+s.id+'Canvas',labelId:'fcExtra'+s.id+'Label',caseName:fcExtraCase(s)?.name||'',fieldName:s.fieldName||fcExtraField(s),component:s.component||fcExtraComponent(s),time:s.time,range:fvFiniteRange(s.fieldValues),dimensions:s.fieldParsed?.dimensions||''});
  if(fcState.enabled&&document.getElementById('fcDifference')?.checked&&fcState.differenceValues)out.push({key:'difference',canvasId:'fcDifferenceCanvas',labelId:'',caseName:'Δ',fieldName:(fvState.fieldName||'')+' − '+(fcState.fieldName||''),component:'signed difference',time:fvState.time,range:fcState.differenceRange,dimensions:fvState.fieldParsed?.dimensions||''});return out
}
function fcSetVideoRanges(ranges){
  fcState.videoRangeOverride=ranges?.view2?.valid?ranges.view2:null;for(const s of fcExtraViews)s.videoRangeOverride=ranges?.['view'+s.id]?.valid?ranges['view'+s.id]:null;
  if(fcState.enabled&&fcState.fieldValues){const r=fcState.videoRangeOverride||fcState.range;fcUpdateDerived(r);for(const s of fcExtraViews)if(s.mesh&&s.fieldValues){const data={mesh:s.mesh,storage:s.storage,fieldValues:s.fieldValues,parsed:s.fieldParsed,range:s.range};fcExtraUpload(s,data)}}
}
function fcUpdateLayout(){
  const panel=document.getElementById('fieldViewPanel'),compare=document.getElementById('fcViewport');if(!panel||!compare)return;panel.classList.toggle('fcCompareMode',fcState.enabled);compare.classList.toggle('hidden',!fcState.enabled);for(const state of fcExtraViews)fcExtraDom(state.id,'Viewport')?.classList.toggle('hidden',!fcState.enabled);const diff=document.getElementById('fcDifferenceViewport'),showDiff=fcState.enabled&&!!document.getElementById('fcDifference')?.checked;if(diff)diff.classList.toggle('hidden',!showDiff);panel.classList.toggle('fcDifferenceMode',showDiff);fcUpdateLabels();setTimeout(()=>{fvRender();fcRender();fcRenderDifference();fcRenderExtras()},0)
}
function fcInstallUi(){
  if(document.getElementById('fcPanel'))return true;const controls=document.getElementById('fieldViewControls'),status=document.getElementById('fvStatus'),panel=document.getElementById('fieldViewPanel'),primary=panel?.querySelector('.fvViewport');if(!controls||!status||!panel||!primary)return false;
  const box=document.createElement('details');box.className='analysisExt';box.id='fcPanel';box.open=false;box.innerHTML='<summary class="analysisExtHead"><strong data-fl-en="Synchronized 3D case comparison" data-fl-es="Comparación 3D sincronizada de casos">Synchronized 3D case comparison</strong><span class="badge" id="fcBadge">—</span></summary><div class="extSectionBody">'+
    '<div class="fvChecks"><label class="inlineCheck"><input id="fcEnabled" type="checkbox"> <span data-fl-en="Compare side by side" data-fl-es="Comparar lado a lado">Compare side by side</span></label><label class="inlineCheck"><input id="fcDifference" type="checkbox"> <span data-fl-en="Show 3D difference" data-fl-es="Mostrar diferencia 3D">Show 3D difference</span></label></div>'+
    '<div class="row2" style="margin-top:8px"><div class="field"><label data-fl-en="View 2 case" data-fl-es="Caso de vista 2">View 2 case</label><select id="fcCase"></select></div><div class="field"><label data-fl-en="Region" data-fl-es="Región">Region</label><select id="fcRegion"></select></div></div>'+
    '<div class="row2"><div class="field"><label data-fl-en="View 2 field" data-fl-es="Variable de vista 2">View 2 field</label><select id="fcField"></select></div><div class="field"><label data-fl-en="Component" data-fl-es="Componente">Component</label><select id="fcComponent"></select></div></div>'+
    '<div class="field"><label data-fl-en="Physical-time synchronization" data-fl-es="Sincronización por tiempo físico">Physical-time synchronization</label><select id="fcSync"><option value="nearest" data-fl-en="Nearest available (show Δt)" data-fl-es="Más cercano disponible (mostrar Δt)">Nearest available (show Δt)</option><option value="exact" data-fl-en="Exact time only" data-fl-es="Solo tiempo exacto">Exact time only</option></select></div>'+
    '<div class="smallnote" data-fl-en="Each viewport may use its own case, field and component. Time and camera remain synchronized. A shared color scale and 3D difference are used only when both views represent the same physical quantity." data-fl-es="Cada viewport puede usar su propio caso, variable y componente. El tiempo y la cámara permanecen sincronizados. La escala compartida y la diferencia 3D solo se usan cuando ambas vistas representan la misma cantidad física.">Each viewport may use its own case, field and component. Time and camera remain synchronized. A shared color scale and 3D difference are used only when both views represent the same physical quantity.</div>'+
    '<div class="fcExtraActions"><button class="btn soft" id="fcAddView" type="button" data-fl-en="+ Add 3D view" data-fl-es="+ Añadir vista 3D">+ Add 3D view</button><span class="smallnote" data-fl-en="Up to 4 synchronized viewports" data-fl-es="Hasta 4 viewports sincronizados">Up to 4 synchronized viewports</span></div><div id="fcExtraControls"></div>'+
    '<div class="extStatus" id="fcStatus"></div></div>';status.insertAdjacentElement('beforebegin',box);
  const grid=document.createElement('div');grid.id='fcViewGrid';grid.className='fcViewGrid';primary.parentElement.insertBefore(grid,primary);grid.appendChild(primary);
  const primaryLabel=document.createElement('div');primaryLabel.id='fcPrimaryLabel';primaryLabel.className='fcViewLabel';primary.appendChild(primaryLabel);
  const second=document.createElement('div');second.id='fcViewport';second.className='fvViewport fcViewport hidden';second.innerHTML='<canvas id="fcCanvas" aria-label="Synchronized comparison 3D OpenFOAM field visualization"></canvas><div class="fcViewLabel" id="fcCompareLabel"></div><div class="fcLegend hidden" id="fcLegend"></div>';grid.appendChild(second);
  const diff=document.createElement('div');diff.id='fcDifferenceViewport';diff.className='fvViewport fcViewport hidden';diff.innerHTML='<canvas id="fcDifferenceCanvas" aria-label="3D OpenFOAM signed difference field visualization"></canvas><div class="fcViewLabel">Δ field · Primary − Comparison</div><div class="extStatus fcDifferenceStatus" id="fcDifferenceStatus"></div>';grid.appendChild(diff);
  const style=document.createElement('style');style.id='fcStyles';style.textContent='.fcViewGrid{display:grid;grid-template-columns:minmax(0,1fr);gap:10px}.fieldViewPanel.fcCompareMode .fcViewGrid{grid-template-columns:repeat(auto-fit,minmax(340px,1fr))}.fieldViewPanel.fcCompareMode.fcDifferenceMode .fcViewGrid{grid-template-columns:repeat(auto-fit,minmax(320px,1fr))}.fcViewport.hidden{display:none}.fcViewport #fcCanvas,.fcViewport #fcDifferenceCanvas{display:block;width:100%;height:500px;touch-action:none}.fcViewLabel{position:absolute;left:12px;bottom:12px;max-width:65%;padding:5px 8px;border:1px solid var(--line);border-radius:999px;background:color-mix(in srgb,var(--panel) 88%,transparent);font-size:9px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;backdrop-filter:blur(8px)}.fcLegend{position:absolute;right:12px;bottom:12px;width:min(180px,44%);padding:9px 10px;border:1px solid var(--line);border-radius:12px;background:color-mix(in srgb,var(--panel) 90%,transparent);backdrop-filter:blur(8px);z-index:7}.fcLegend.hidden{display:none}.fcLegendTitle{font-size:9px;font-weight:850;margin-bottom:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.fcLegendTitle span{color:var(--muted);font-weight:700}.fcLegendBar{height:10px;border-radius:999px;margin-bottom:5px}.fcLegendTicks{display:flex;justify-content:space-between;gap:5px;font-size:8px;color:var(--muted)}.fcLegendDelta{margin-top:4px;font-size:8px;color:var(--muted)}.fcLegendUniform{font-size:9px;color:var(--text);padding:6px 0}.fieldViewPanel.fcCompareMode .fvLegend{width:min(190px,45%)}.fcExtraActions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:8px}.fcExtraCard{margin-top:8px;padding:8px;border:1px solid var(--line);border-radius:10px;background:var(--panel2)}.fcExtraHead{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px}@media(max-width:1180px){.fieldViewPanel.fcCompareMode.fcDifferenceMode .fcViewGrid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:980px){.fieldViewPanel.fcCompareMode .fcViewGrid{grid-template-columns:1fr}.fcViewport #fcCanvas,.fcViewport #fcDifferenceCanvas{height:420px}}';document.head.appendChild(style);
  try{flApplyBilingualText(box)}catch{}
  document.getElementById('fcEnabled').addEventListener('change',()=>{fcState.lockedRange=null;fcRefreshFrame()});document.getElementById('fcDifference').addEventListener('change',()=>{fcState.lockedRange=null;fcRefreshFrame()});document.getElementById('fcAddView').addEventListener('click',fcExtraAdd);
  document.getElementById('fcCase').addEventListener('change',()=>{fcRefreshSelectors(false);fcState.lockedRange=null;fcRefreshFrame()});
  document.getElementById('fcRegion').addEventListener('change',()=>{fcRefreshSelectors(true);fcState.lockedRange=null;fcRefreshFrame()});
  document.getElementById('fcField').addEventListener('change',()=>{fcRefreshSelectors(true);fcState.lockedRange=null;fcRefreshFrame()});
  document.getElementById('fcComponent').addEventListener('change',()=>{fcState.lockedRange=null;fcRefreshFrame()});
  document.getElementById('fcSync').addEventListener('change',()=>fcRefreshFrame());
  if(typeof ResizeObserver!=='undefined'){new ResizeObserver(()=>fcRender()).observe(second);new ResizeObserver(()=>fcRenderDifference()).observe(diff);}
  fcRefreshSelectors(false);fcUpdateLayout();return true
}
function fcInstall(){
  const mount=()=>fcInstallUi();if(!mount()){const retry=()=>{if(mount())return;requestAnimationFrame(retry)};requestAnimationFrame(retry)}
  if(typeof fvLoadFrame==='function'&&!fvLoadFrame.__fcPatched){const previous=fvLoadFrame;fvLoadFrame=async function(...args){const x=await previous.apply(this,args);await fcRefreshFrame();await fcRefreshExtras();return x};fvLoadFrame.__fcPatched=true}
  if(typeof fvRender==='function'&&!fvRender.__fcPatched){const previous=fvRender;fvRender=function(...args){const x=previous.apply(this,args);fcRender();fcRenderDifference();fcRenderExtras();return x};fvRender.__fcPatched=true}
  for(const id of ['fvCase','fvRegion','fvField','fvComponent'])document.getElementById(id)?.addEventListener('change',()=>setTimeout(()=>{fcRefreshSelectors(true);for(const state of fcExtraViews)fcExtraRefreshSelectors(state,true);fcState.lockedRange=null;fcRefreshFrame();fcRefreshExtras()},0));
  for(const id of ['fvPalette','fvSurface','fvEdges','fvOpacity','fvRangeMode','fvRangeMin','fvRangeMax','fvSlice','fvSliceAxis','fvSlicePosition','fvSliceOpacity','fvIso','fvIsoValue','fvIsoOpacity','fvVectors','fvStreamlines','fvVector','fvVectorResolution','fvVectorScale','fvSeedAxis','fvSeedCount','fvSeedPosition'])document.getElementById(id)?.addEventListener(id==='fvSlicePosition'||id==='fvIsoValue'||id==='fvOpacity'||id==='fvSliceOpacity'||id==='fvIsoOpacity'||id==='fvVectorScale'||id==='fvSeedPosition'?'input':'change',()=>setTimeout(fcRefreshVisuals,0));
  document.addEventListener('foamlens-language-change',()=>{const p=document.getElementById('fcPanel');if(p)try{flApplyBilingualText(p)}catch{};fcRefreshSelectors(true);fcUpdateLabels()});
}
fcInstall();
window.FoamLensFieldCompare={fcCloseTime,fcNearestTime,fcResolveTime,fcSharedRange,fcMeshDiag,fcSyncedCamera,fcMeshesEquivalent,fcDifferenceValues,fcSymmetricDifferenceRange,fcRefreshFrame,getVideoDescriptors:fcVideoDescriptors,setVideoRanges:fcSetVideoRanges,refreshExtras:fcRefreshExtras};
