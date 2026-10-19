/* FoamLens Granada #153 — read-only OpenFOAM 3D phase volumes and cell-face front proxy.
 * Existing Field iso-surface remains independent, not rewritten.
 */
/* FOAMLENS_FRONT_PROXY_CORE_START */
function pfNumber(raw){
  if(typeof raw==='number')return Number.isFinite(raw)?raw:NaN;
  if(typeof raw!=='string'||!raw.trim()||!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(raw.trim()))return NaN;
  const v=Number(raw);return Number.isFinite(v)?v:NaN
}
function pfVec3(points,id){
  const i=3*id,a=[pfNumber(points[i]),pfNumber(points[i+1]),pfNumber(points[i+2])];
  return a.every(Number.isFinite)?a:null
}
function pfCross(a,b){return[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]}
function pfDot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]}
function pfMeshGeometry(mesh,limits={}){
  const invalid=reason=>({ok:false,reason,cellVolumes:[],faceAreas:[],faceCentroids:[],totalVolumeM3:null});
  const cells=Number(mesh?.cellCount),faces=Number(mesh?.faceCount),
    pts=mesh?.points||[],offset=mesh?.faceOffsets||[],ids=mesh?.facePoints||[],
    owners=mesh?.owners||[],neighbors=mesh?.neighbours||[],centers=mesh?.cellCenters||[];
  if(!Number.isSafeInteger(cells)||cells<=0||!Number.isSafeInteger(faces)||faces<=0)
    return invalid('Source polyMesh cell and face counts unavailable');
  if(cells>Math.min(400000,Math.max(1,Number(limits.maxCells)||400000))||faces>2400000)
    return invalid('Mesh exceeds bounded 400k-cell / 2.4M-face source-only analysis; no silent sampling');
  if(pts.length%3!==0||centers.length!==3*cells||offset.length!==faces+1||
     owners.length!==faces||neighbors.length>faces||offset[0]!==0||offset.at(-1)!==ids.length)
    return invalid('Incomplete or inconsistent OpenFOAM polyMesh topology');
  const size=(mesh.boundsMin&&mesh.boundsMax)?Math.hypot(...[0,1,2].map(k=>mesh.boundsMax[k]-mesh.boundsMin[k])):NaN;
  if(!Number.isFinite(size)||size<=0)return invalid('Invalid physical mesh extent');
  const volumes=new Float64Array(cells),absolute=new Float64Array(cells),
    areaClosure=new Float64Array(3*cells),areaScale=new Float64Array(cells),
    faceAreas=new Float64Array(faces),faceCentroids=new Float64Array(3*faces);
  const err=(face,reason)=>invalid('Source face '+face+': '+reason);
  for(let fi=0;fi<faces;fi++){
    const start=Number(offset[fi]),end=Number(offset[fi+1]),owner=Number(owners[fi]),
      neighbor=fi<neighbors.length?Number(neighbors[fi]):-1;
    if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||end>ids.length||end-start<3||end<=start)
      return err(fi,'invalid point range');
    if(!Number.isSafeInteger(owner)||owner<0||owner>=cells||
       (fi<neighbors.length&&(!Number.isSafeInteger(neighbor)||neighbor<0||neighbor>=cells||neighbor===owner)))
      return err(fi,'invalid owner/neighbour relation');
    const ring=[];
    for(let i=start;i<end;i++){
      const id=Number(ids[i]),p=Number.isSafeInteger(id)&&id>=0&&id*3+2<pts.length?pfVec3(pts,id):null;
      if(!p)return err(fi,'non-finite or out-of-range vertex');
      ring.push(p)
    }
    const c=[0,0,0];for(const p of ring)for(let j=0;j<3;j++)c[j]+=p[j]/ring.length;
    faceCentroids.set(c,3*fi);
    const n=[0,0,0];let fa=0;
    for(let k=0;k<ring.length;k++){
      const a=ring[k],b=ring[(k+1)%ring.length],cross=pfCross(a.map((v,j)=>v-c[j]),b.map((v,j)=>v-c[j]));
      for(let j=0;j<3;j++)n[j]+=cross[j]*.5;
      fa+=Math.hypot(...cross)*.5;
      for(const [cell,sign] of [[owner,1],...(neighbor>=0?[[neighbor,-1]]:[])]){
        const ref=pfVec3(centers,cell);if(!ref)return err(fi,'non-finite cell center');
        const volume=sign*pfDot(a.map((v,j)=>v-ref[j]),pfCross(b.map((v,j)=>v-ref[j]),c.map((v,j)=>v-ref[j])))/6;
        if(!Number.isFinite(volume))return err(fi,'non-finite volume contribution');
        volumes[cell]+=volume;absolute[cell]+=Math.abs(volume)
      }
    }
    if(!(fa>0))return err(fi,'zero-area face');
    faceAreas[fi]=Math.hypot(...n);
    if(!(faceAreas[fi]>0))return err(fi,'face orientation cancels into zero area vector');
    for(const [cell,sign] of [[owner,1],...(neighbor>=0?[[neighbor,-1]]:[])]){
      areaScale[cell]+=faceAreas[fi];for(let j=0;j<3;j++)areaClosure[3*cell+j]+=n[j]*sign
    }
  }
  let sum=0,minVolume=Infinity;
  for(let cell=0;cell<cells;cell++){
    const v=volumes[cell],a=absolute[cell],closure=Math.hypot(...[0,1,2].map(j=>areaClosure[3*cell+j]));
    if(!(v>Math.pow(size,3)*1e-21)||!(a>0)||v/a<.98)
      return invalid('Cell '+cell+' has nonpositive or inconsistent oriented tetrahedral volume; cannot claim measured volume');
    if(closure>1e-7*areaScale[cell])
      return invalid('Cell '+cell+' has an open/inconsistently oriented face shell; volume not certified');
    sum+=v;minVolume=Math.min(minVolume,v)
  }
  if(!Number.isFinite(sum)||!(sum>0))return invalid('Total physical source mesh volume is invalid');
  return{ok:true,cellVolumes:volumes,faceAreas,faceCentroids,totalVolumeM3:sum,
    cells,faces,internalFaces:neighbors.length,minCellVolumeM3:minVolume,
    sourceEvidence:'polyMesh vertices + owner/neighbour face orientations; signed tetrahedra around source cell centers',
    geometryGuarantee:'numerically closed, consistently oriented cell shells under 1e-7 closure and 0.98 signed-volume tests',
    caveat:'Irregular/nonconvex/overlapping mesh cells and dynamic remeshing require independent native mesh-quality verification'}
}
function pfSnapshot(mesh,geometry,alpha,config={}){
  const fail=reason=>({ok:false,reason});
  if(!geometry?.ok)return fail('Physical polyMesh cell volumes unavailable: '+(geometry?.reason||'unknown'));
  const t=pfNumber(config.time),lo=pfNumber(config.low),hi=pfNumber(config.high),iso=pfNumber(config.iso);
  if(!Number.isFinite(t)||!(lo>=0&&lo<=hi&&hi<=1)||!(iso>0&&iso<1))
    return fail('Physical time, liquid/mushy limits [0,1] and front alpha iso (0,1) must be explicit and valid');
  if(!Array.isArray(alpha)&&!ArrayBuffer.isView(alpha))return fail('Original alphaL cell values unavailable');
  if(alpha.length!==geometry.cells)return fail('Original alphaL count does not match source polyMesh cell count');
  if(String(config.dimensions||'')!=='[0 0 0 0 0 0 0]')
    return fail('OpenFOAM alphaL dimensionless physical exponents not verified from source field');
  const volumes={solid:0,mushy:0,liquid:0},counts={solid:0,mushy:0,liquid:0};
  let alphaWeighted=0,nonfinite=0;
  const numeric=new Float64Array(alpha.length);
  for(let i=0;i<alpha.length;i++){
    const a=pfNumber(alpha[i]);if(!Number.isFinite(a)||a<0||a>1){nonfinite++;continue}
    numeric[i]=a;
    const state=a>hi?'liquid':a>lo?'mushy':'solid',v=geometry.cellVolumes[i];
    if(!Number.isFinite(v)||v<=0)return fail('Invalid physically measured source volume for cell '+i);
    volumes[state]+=v;counts[state]++;alphaWeighted+=v*a
  }
  if(nonfinite)return fail(nonfinite+' liquid-fraction cell(s) are missing/nonfinite/outside [0,1]; no resampling or clipping');
  const total=volumes.solid+volumes.mushy+volumes.liquid;
  if(Math.abs(total-geometry.totalVolumeM3)>Math.max(1e-13*geometry.totalVolumeM3,1e-18))
    return fail('Phase volumes fail conservation against measured total cell volume');
  const neighbors=mesh.neighbours||[],owners=mesh.owners||[],
    crossed=[],weights=[0,0,0],centroid=[0,0,0],areas=geometry.faceAreas,faceCentroids=geometry.faceCentroids;
  let interfaceArea=0,ambiguousFaces=0;
  const axis={x:0,y:1,z:2}[config.axis];
  if(axis===undefined)return fail('Explicit physical front-motion axis X/Y/Z required');
  for(let fi=0;fi<neighbors.length;fi++){
    const owner=Number(owners[fi]),other=Number(neighbors[fi]),a=numeric[owner]-iso,b=numeric[other]-iso;
    if(a===0||b===0){ambiguousFaces++;continue}
    if(a*b>=0)continue;
    const area=Number(areas[fi]);if(!(area>0))return fail('Interface face area unavailable');
    interfaceArea+=area;
    for(let j=0;j<3;j++)centroid[j]+=faceCentroids[3*fi+j]*area;
    crossed.push(fi)
  }
  const front=interfaceArea>0?{
    areaProxyM2:interfaceArea,crossedInternalFaces:crossed.length,
    areaWeightedFaceCentroidM:centroid.map(v=>v/interfaceArea),
    coordinateProxyM:centroid[axis]/interfaceArea,
    ambiguousThresholdFaces:ambiguousFaces
  }:{areaProxyM2:0,crossedInternalFaces:0,areaWeightedFaceCentroidM:null,
    coordinateProxyM:null,ambiguousThresholdFaces:ambiguousFaces};
  const fractions={};for(const key of Object.keys(volumes))fractions[key]=volumes[key]/total;
  return{ok:true,timeS:t,region:String(config.region||''),meshCells:geometry.cells,
    totalVolumeM3:geometry.totalVolumeM3,volumesM3:volumes,fractions,cellCounts:counts,
    volumeWeightedLiquidFraction:alphaWeighted/total,
    front,frontIso:iso,phaseThresholds:{solidMushy:lo,mushyLiquid:hi},
    axis:config.axis,meshIdentity:config.meshIdentity??null,
    method:'physical polyMesh tetrahedral cell volumes + signed internal-face iso-crossing proxy',
    caveats:[
      'The front is estimated at crossing CELL FACES, not an exact reconstructed continuous iso-surface.',
      'The coordinate is an area-weighted CENTROID of crossing source faces, not the leading edge or a physical local interface position.',
      'Volumes are region-specific, independently derived from closed oriented original polyMesh cells; no interpolation or voxel counting.',
      'Liquid/mushy/solid categories are user threshold observations, not a claim of nucleation, metallurgical microstructure or recalescence.'
    ]}
}
function pfEvolution(frames,expectedTimes=[]){
  // A missing written time never becomes an implicit valid intermediate snapshot.
  if((frames||[]).some(x=>!x?.ok))return{ok:false,reason:'Input contains an unverified frame; report it separately before evolution',rows:[]};
  const valid=(frames||[]).slice().sort((a,b)=>a.timeS-b.timeS),rows=[];
  for(let i=0;i<valid.length;i++){
    const current=valid[i],prev=i?valid[i-1]:null,dt=prev?current.timeS-prev.timeS:null;
    if(prev&&!(dt>0))return{ok:false,reason:'Duplicate or decreasing source physical time',rows:[]};
    const same=prev&&current.region===prev.region&&current.axis===prev.axis&&
      current.meshIdentity!=null&&current.meshIdentity===prev.meshIdentity&&
      current.meshCells===prev.meshCells&&
      Math.abs(current.totalVolumeM3-prev.totalVolumeM3)<=1e-8*Math.max(current.totalVolumeM3,prev.totalVolumeM3);
    const missingIntermediate=!!prev&&expectedTimes.some(t=>t>prev.timeS&&t<current.timeS&&!valid.some(f=>f.timeS===t));
    const f0=prev?.front?.coordinateProxyM,f1=current.front?.coordinateProxyM;
    const measuredDifference=same&&!missingIntermediate&&f0!==null&&f1!==null&&Number.isFinite(f0)&&Number.isFinite(f1);
    rows.push({...current,frontCentroidVelocityProxyMPerS:measuredDifference?(f1-f0)/dt:null,
      timeGapS:dt,velocityStatus:!prev?'first-sample':!same?'not-comparable-geometry-or-region':
        missingIntermediate?'missing-original-snapshot-between':
        !measuredDifference?'no-front-in-one-or-both-times':'apparent-centroid-displacement',
      prevTimeS:prev?.timeS??null})
  }
  return{ok:true,rows,method:'finite differences of area-weighted crossing-face centroids at actual consecutive source field times',
    caveat:'Apparent centroid displacement is NOT measured local phase-front propagation speed and does not account for mesh deformation or front splitting.'}
}
/* FOAMLENS_FRONT_PROXY_CORE_END */
function pfUi(en,es){try{return typeof flUi==='function'?flUi(en,es):en}catch{return en}}
function pfEsc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function pfEl(id){return document.getElementById(id)}
let pfToken=0,pfLast=null,pfBinding=null,pfCaseRef=null,pfGroupRef=null;
const pfGeomCache=new WeakMap(),pfMeshIds=new WeakMap();let pfNextMeshId=1;
function pfRuntimeMeshIdentity(mesh){
  if(!pfMeshIds.has(mesh))pfMeshIds.set(mesh,pfNextMeshId++);
  return pfMeshIds.get(mesh)
}
function pfInvalidate(note=''){
  pfToken++;pfLast=null;pfBinding=null;
  for(const id of ['pfExport','pfExportCsv']){const b=pfEl(id);if(b)b.disabled=true}
  const out=pfEl('pfResult');if(out)out.textContent='';
  const plot=pfEl('pfPlot'),ctx=plot?.getContext?.('2d');if(ctx)ctx.clearRect(0,0,plot.width,plot.height);
  if(note&&pfEl('pfStatus'))pfEl('pfStatus').textContent=note
}
function pfCurrent(){
  const value=pfEl('pfCase')?.value,c=Array.isArray(cases)?cases.find(x=>String(x.id)===value):null;
  const region=pfEl('pfRegion')?.value||'';
  return{c,region,groups:c?fvFieldGroups(c,region,'scalar','volume').filter(g=>
    String(g.dimensions||'')==='[0 0 0 0 0 0 0]'&&Array.isArray(g.times)&&g.times.length):[]}
}
function pfOptions(el,values){
  const prev=el?.value;if(!el)return;
  el.innerHTML=values.map(([v,label])=>'<option value="'+pfEsc(v)+'">'+pfEsc(label)+'</option>').join('');
  if(values.some(([v])=>String(v)===prev))el.value=prev
}
function pfRefresh(scope='cases'){
  pfInvalidate();
  if(scope==='cases'){
    pfOptions(pfEl('pfCase'),[['','Select imported OpenFOAM case'],...(Array.isArray(cases)?cases:[]).map(c=>[c.id,c.name||c.id])])
  }
  if(scope==='cases'||scope==='regions'){
    const c=pfCurrent().c,regions=c?[...new Set((c.discoveryModel?.fields||[]).map(g=>String(g.region||'')))]:[];
    pfOptions(pfEl('pfRegion'),regions.map(r=>[r,r||'Default material region']))
  }
  const {c,region,groups}=pfCurrent();
  pfOptions(pfEl('pfAlpha'),groups.map(g=>[g.name,g.name+' · original dimensionless volume field']));
  pfEl('pfStatus').textContent=c?(groups.length+' dimensionless source field(s) in the chosen region. Explicitly select liquid fraction αL.'):
    'Import a source OpenFOAM case with 3D polyMesh and original alphaL field first.'
}
function pfParams(){
  const {c,region,groups}=pfCurrent(),g=groups.find(g=>g.name===pfEl('pfAlpha')?.value);
  return{c,region,g,low:pfEl('pfLow')?.value,high:pfEl('pfHigh')?.value,iso:pfEl('pfIso')?.value,axis:pfEl('pfAxis')?.value}
}
function pfPlot(report){
  const canvas=pfEl('pfPlot');if(!canvas||!report?.evolution?.rows?.length)return;
  const ctx=canvas.getContext('2d');if(!ctx)return;
  const rows=report.evolution.rows,width=Math.max(280,canvas.clientWidth||650),height=230,dpr=Math.min(2,window.devicePixelRatio||1);
  canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
  const x0=rows[0].timeS,x1=rows.at(-1).timeS,ylim=[0,1],left=47,right=20,top=26,bottom=35;
  ctx.strokeStyle='#8192a7';ctx.beginPath();ctx.moveTo(left,top);ctx.lineTo(left,height-bottom);ctx.lineTo(width-right,height-bottom);ctx.stroke();
  const x=t=>x0===x1?(left+width-right)/2:left+(t-x0)/(x1-x0)*(width-left-right),y=v=>top+(1-v)*(height-top-bottom);
  for(const [key,color] of [['solid','#7c8b9d'],['mushy','#f0bc64'],['liquid','#38b6b2']]){
    ctx.fillStyle=color;for(const r of rows){ctx.beginPath();ctx.arc(x(r.timeS),y(r.fractions[key]),3.3,0,Math.PI*2);ctx.fill()}
  }
  ctx.fillStyle='#a7b5c5';ctx.font='12px sans-serif';
  ctx.fillText('Solid · Mushy · Liquid — volume fractions (points only)',left+7,16);
  ctx.fillText(x0.toPrecision(4)+' s',left,height-11);
  ctx.fillText(x1.toPrecision(4)+' s',Math.max(left,width-85),height-11)
}
async function pfRun(){
  pfInvalidate('Computing measured cell volumes and threshold-crossing face proxies…');
  const token=pfToken,{c,region,g,low,high,iso,axis}=pfParams(),status=pfEl('pfStatus');
  if(!c||!g){status.textContent='Choose a source region and dimensionless volume alpha field.';return}
  const lo=pfNumber(low),hi=pfNumber(high),cut=pfNumber(iso);
  if(!(lo>=0&&lo<=hi&&hi<=1&&cut>0&&cut<1)){status.textContent='Phase thresholds [0,1] and front iso (0,1) invalid.';return}
  const times=[...new Set(g.times.map(pfNumber).filter(Number.isFinite))].sort((a,b)=>a-b);
  if(times.length>240){status.textContent='More than 240 source snapshots. Narrow the case before running; no silent truncation.';return}
  const excluded=[],frames=[],sourceFrames=[];
  const inventory=c.volumeFieldInventory,discovery=c.discoveryModel,meshInventory=c.meshInventory;
  for(let i=0;i<times.length;i++){
    if(token!==pfToken)return;
    const t=times[i];status.textContent='Measured snapshots '+(i+1)+'/'+times.length+' · t='+t+' s';
    try{
      const frame=await fvLoadFrameData(c,g,region,t,'value',{includeBoundary:false});
      if(token!==pfToken)return;
      const mesh=frame.mesh,parsed=frame.parsed,dimensions=String(parsed?.dimensions||g.dimensions||'');
      if(frame.storage!=='volume'||dimensions!=='[0 0 0 0 0 0 0]')
        throw new Error('Source is not a verified dimensionless volume-cell liquid-fraction field');
      let geometry=pfGeomCache.get(mesh);if(!geometry){geometry=pfMeshGeometry(mesh);if(geometry.ok)pfGeomCache.set(mesh,geometry)}
      const current=pfSnapshot(mesh,geometry,frame.fieldValues,{
        time:t,low:lo,high:hi,iso:cut,axis,region,dimensions,
        meshIdentity:pfRuntimeMeshIdentity(mesh)
      });
      if(!current.ok)throw new Error(current.reason);
      frames.push(current);
      sourceFrames.push({timeS:t,sourcePaths:(g.records||[]).filter(r=>String(r.region||'')===region&&Math.abs(Number(r.time)-t)<1e-10*Math.max(1,Math.abs(t))).map(r=>r.sourcePath),
        meshSnapshotTime:frame.meshInfo?.snapshot?.time??mesh.meshTime??null,
        meshCells:mesh.cellCount,meshFaces:mesh.faceCount,dynamicMesh:!!mesh.dynamicMesh,
        dimensions,volumeMethod:geometry.sourceEvidence,geometryCaveat:geometry.caveat});
    }catch(e){excluded.push({timeS:t,reason:String(e?.message||e)})}
    if(i%3===0)await new Promise(r=>setTimeout(r,0))
  }
  if(token!==pfToken)return;
  if(!frames.length){status.textContent='No complete source frame can be validated. '+excluded.slice(0,3).map(x=>x.reason).join(' · ');return}
  if(!Array.isArray(cases)||!cases.includes(c)||c.volumeFieldInventory!==inventory||
     c.discoveryModel!==discovery||c.meshInventory!==meshInventory){
    pfInvalidate('Source case/mesh inventory changed during analysis. Re-run to preserve physical provenance.');return
  }
  const evolution=pfEvolution(frames,times);
  if(!evolution.ok){status.textContent=evolution.reason;return}
  pfLast={schema:'foamlens/solidification-front-proxy/1',caseId:c.id,caseName:c.name,
    region,field:g.name,dimensions:g.dimensions,axis,parameters:{low:lo,high:hi,iso:cut},
    sourceFrames,evolution,excluded,completion:excluded.length?'partial-evidence':'source-backed-evidence',
    interpretations:{automaticNucleation:false,automaticRecalescence:false,automaticMicrostructure:false},
    caveats:[
      'Each phase volume comes from verified geometric polyMesh signed cell volumes, not percentages of equally-sized cells.',
      'Front area and coordinate are a FACE-CROSSING PROXY, not a genuine interpolated isosurface or independently measured solidification front.',
      'The reported apparent centroid velocity is not local front speed, especially during front splitting, topology changes or dynamic meshing.',
      'Only original physical output times and original material region were analyzed. Missing times are excluded, never imputed.'
    ]};
  pfBinding={c,inventory,discovery,meshInventory,g,fieldName:g.name,region};
  const fmt=n=>n===null||!Number.isFinite(n)?'not available':n.toLocaleString(undefined,{maximumSignificantDigits:6});
  pfEl('pfResult').innerHTML='<div class="extTableWrap"><table class="extTable"><thead><tr>'+
    ['Time [s]','Solid [m³]','Mushy [m³]','Liquid [m³]','Volume-weighted αL','Front face area [m²]','Centroid ['+axis+', m]','Apparent centroid speed [m/s]']
      .map(x=>'<th>'+pfEsc(x)+'</th>').join('')+'</tr></thead><tbody>'+
    evolution.rows.map(r=>'<tr>'+[
      r.timeS,r.volumesM3.solid,r.volumesM3.mushy,r.volumesM3.liquid,
      r.volumeWeightedLiquidFraction,r.front.areaProxyM2,r.front.coordinateProxyM,r.frontCentroidVelocityProxyMPerS
    ].map(x=>'<td>'+pfEsc(fmt(x))+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>'+
    '<p class="smallnote">Front = face-crossing proxy, NOT true continuous isosurface or local propagation speed. '+pfEsc(pfLast.caveats.join(' '))+'</p>'+
    (excluded.length?'<p class="smallnote">Excluded exact source times: '+pfEsc(excluded.map(x=>x.timeS+': '+x.reason).join(' | '))+'</p>':'');
  status.textContent=frames.length+' verified physical-time snapshot(s), '+excluded.length+
    ' excluded. Regional volumes measured from source polyMesh. Apparent centroid speed is NOT local front velocity.';
  pfPlot(pfLast);pfEl('pfExport').disabled=false;pfEl('pfExportCsv').disabled=false
}
function pfDownload(name,content,type){
  if(typeof downloadText==='function'){downloadText(name,content,type);return}
  const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=url;a.download=name;
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000)
}
function pfExport(kind){
  if(!pfLast||!pfBinding)return;
  const c=pfParams().c,b=pfBinding,params=pfParams();
  if(c!==b.c||c.volumeFieldInventory!==b.inventory||c.discoveryModel!==b.discovery||
    c.meshInventory!==b.meshInventory||params.g!==b.g||params.region!==b.region){
    pfInvalidate('Case, source alpha field or mesh inventory changed. Recalculate before exporting.');return
  }
  if(kind==='json')pfDownload('FoamLens_solidification_front_proxy.json',
    JSON.stringify({...pfLast,exportedAt:new Date().toISOString()},null,2),'application/json');
  else{
    const h='time_s,solid_m3,mushy_m3,liquid_m3,mean_alpha_volume_weighted,front_proxy_area_m2,front_centroid_axis_m,apparent_centroid_velocity_m_per_s';
    const rows=pfLast.evolution.rows.map(r=>[r.timeS,r.volumesM3.solid,r.volumesM3.mushy,r.volumesM3.liquid,
      r.volumeWeightedLiquidFraction,r.front.areaProxyM2,r.front.coordinateProxyM??'',r.frontCentroidVelocityProxyMPerS??''].join(','));
    pfDownload('FoamLens_solidification_front_proxy.csv',[h,...rows].join('\n')+'\n','text/csv')
  }
}
function pfInstall(){
  const host=document.getElementById('generalAnalysisModules')||document.getElementById('paTools');
  if(!host||pfEl('pfPanel'))return;
  const el=document.createElement('details');el.id='pfPanel';el.className='detailBlock';
  el.innerHTML='<summary><b data-fl-en="Granada · 3D Solidification Front Tracker" data-fl-es="Granada · Seguimiento 3D del frente de solidificación">Granada · 3D Solidification Front Tracker</b></summary>'+
  '<p class="smallnote">Real polyMesh cell volumes and interface crossing-face proxies, by region and actual source times. Not a local front-speed or metallurgical-nucleation diagnosis.</p>'+
  '<div class="extGrid2"><div class="field"><label>OpenFOAM source case</label><select id="pfCase"></select></div>'+
  '<div class="field"><label>Physical material region</label><select id="pfRegion"></select></div>'+
  '<div class="field"><label>Verified dimensionless liquid-fraction field</label><select id="pfAlpha"></select></div>'+
  '<div class="field"><label>Front centroid physical axis</label><select id="pfAxis"><option value="x">X</option><option value="y">Y</option><option value="z">Z</option></select></div>'+
  '<div class="field"><label>Solid / mushy α threshold</label><input id="pfLow" type="number" min="0" max="1" step="any" value=".05"></div>'+
  '<div class="field"><label>Mushy / liquid α threshold</label><input id="pfHigh" type="number" min="0" max="1" step="any" value=".95"></div>'+
  '<div class="field"><label>Internal-face front crossing α iso</label><input id="pfIso" type="number" min="0" max="1" step="any" value=".5"></div>'+
  '</div><div class="extActions"><button id="pfRefresh" class="btn soft" type="button">Refresh original source fields</button>'+
  '<button id="pfRun" class="btn primary" type="button">Measure source phases and front proxy</button>'+
  '<button id="pfExport" class="btn soft" type="button" disabled>Export JSON</button>'+
  '<button id="pfExportCsv" class="btn soft" type="button" disabled>Export CSV</button></div>'+
  '<p id="pfStatus" class="smallnote" aria-live="polite"></p>'+
  '<canvas id="pfPlot" style="width:100%;height:230px" aria-label="Measured source phase volume fractions at original OpenFOAM physical times"></canvas>'+
  '<div id="pfResult"></div>';
  host.appendChild(el);
  pfEl('pfRefresh').onclick=()=>pfRefresh('cases');pfEl('pfRun').onclick=()=>void pfRun();
  pfEl('pfExport').onclick=()=>pfExport('json');pfEl('pfExportCsv').onclick=()=>pfExport('csv');
  for(const [id,scope] of [['pfCase','cases'],['pfRegion','field'],['pfAlpha','field']])
    pfEl(id).addEventListener('change',()=>pfRefresh(scope));
  for(const id of ['pfLow','pfHigh','pfIso','pfAxis'])
    pfEl(id).addEventListener(['pfAxis'].includes(id)?'change':'input',
      ()=>pfInvalidate('Analysis parameters changed. Re-run before exporting physical evidence.'));
  el.addEventListener('toggle',()=>{if(el.open)pfRefresh('cases')});
  try{if(typeof flApplyBilingualText==='function')flApplyBilingualText(el)}catch{}
  pfRefresh('cases')
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',pfInstall,{once:true});else pfInstall();
window.FoamLensSolidificationFrontProxy={geometry:pfMeshGeometry,snapshot:pfSnapshot,evolution:pfEvolution};
