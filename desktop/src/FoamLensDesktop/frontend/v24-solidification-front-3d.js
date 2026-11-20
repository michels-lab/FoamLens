/* FoamLens Granada #153 — source-native OpenFOAM 3D solidification front.
 * Volume classification uses ORIGINAL closed owner/neighbour polyMesh and
 * original dimensionless volScalarField. Cell-center edge interpolation
 * estimates crossing locations: it is NOT a reconstructed iso-surface,
 * not a sub-cell liquid-volume integration and not a metallurgical event.
 */
/* FOAMLENS_FRONT3D_CORE_START */
function sfNum(v){
  if(typeof v==='number')return Number.isFinite(v)?v:NaN;
  if(typeof v!=='string'||!v.trim()||!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(v.trim()))return NaN;
  const n=Number(v);return Number.isFinite(n)?n:NaN
}
function sfVolumes(mesh){
  const fail=reason=>({ok:false,reason,volumes:null});
  if(!mesh?.supported||!Number.isSafeInteger(mesh.cellCount)||mesh.cellCount<1)
    return fail('A complete source-backed OpenFOAM polyMesh is required');
  const n=mesh.cellCount,p=mesh.points,o=mesh.owners,b=mesh.neighbours||[],
    offsets=mesh.faceOffsets,vertices=mesh.facePoints,centers=mesh.cellCenters;
  if(!Array.isArray(p)||p.length<12||p.length%3||
     !Array.isArray(o)||o.length<4||!Array.isArray(b)||!Array.isArray(offsets)||
     !Array.isArray(vertices)||offsets.length!==o.length+1||
     !Array.isArray(centers)||centers.length!==n*3)
    return fail('Original polyMesh vertices, faces, owner/neighbour or cell centers are missing');
  if(!p.every(Number.isFinite)||!centers.every(Number.isFinite)||offsets[0]!==0||
     offsets.at(-1)!==vertices.length)return fail('Original mesh coordinates or face offsets are invalid');
  const internal=mesh.internalFaceCount;
  if(!Number.isSafeInteger(internal)||internal!==b.length||internal<0||
     internal>o.length)return fail('Original internal-face/neighbour count is inconsistent');
  const volumes=new Float64Array(n),faceCounts=new Uint32Array(n),
    // Every oriented cell edge must occur in two opposing oriented faces:
    // this verifies a closed, directed polyhedral boundary, rather than
    // quietly treating an open surface as an actual 3D cell volume.
    edges=Array.from({length:n},()=>new Map());
  const ox=p[0],oy=p[1],oz=p[2];
  const pushEdge=(cell,a,c,sign)=>{
    const key=(a<c?a+'|'+c:c+'|'+a),direction=(a<c?1:-1)*sign,
      previous=edges[cell].get(key)||{count:0,sum:0};
    previous.count++;previous.sum+=direction;edges[cell].set(key,previous)
  };
  for(let face=0;face<o.length;face++){
    const owner=o[face],other=face<internal?b[face]:null,
      start=offsets[face],end=offsets[face+1];
    if(!Number.isSafeInteger(owner)||owner<0||owner>=n||
       (other!==null&&(!Number.isSafeInteger(other)||other<0||other>=n||other===owner))||
       !Number.isSafeInteger(start)||!Number.isSafeInteger(end)||
       start<0||end>vertices.length||end-start<3)return fail('Invalid owner/neighbour or nonpolygonal mesh face');
    const facePoints=[];
    for(let k=start;k<end;k++){
      const point=vertices[k];
      if(!Number.isSafeInteger(point)||point<0||point>=p.length/3||
         facePoints.includes(point))return fail('Invalid or repeated original mesh point index');
      facePoints.push(point)
    }
    faceCounts[owner]++;if(other!==null)faceCounts[other]++;
    for(let k=0;k<facePoints.length;k++){
      const a=facePoints[k],c=facePoints[(k+1)%facePoints.length];
      pushEdge(owner,a,c,1);if(other!==null)pushEdge(other,a,c,-1)
    }
    const first=3*facePoints[0];
    const ax=p[first]-ox,ay=p[first+1]-oy,az=p[first+2]-oz;
    for(let k=1;k<facePoints.length-1;k++){
      const j=3*facePoints[k],h=3*facePoints[k+1],
        bx=p[j]-ox,by=p[j+1]-oy,bz=p[j+2]-oz,
        cx=p[h]-ox,cy=p[h+1]-oy,cz=p[h+2]-oz;
      const signed=(ax*(by*cz-bz*cy)+ay*(bz*cx-bx*cz)+az*(bx*cy-by*cx))/6;
      if(!Number.isFinite(signed))return fail('Nonfinite signed source-polyhedron volume');
      volumes[owner]+=signed;
      if(other!==null)volumes[other]-=signed
    }
  }
  let total=0,min=Infinity,max=-Infinity;
  for(let cell=0;cell<n;cell++){
    if(faceCounts[cell]<4)return fail('Cell '+cell+' has fewer than four physical polyhedron faces');
    for(const e of edges[cell].values()){
      if(e.count!==2||e.sum!==0)return fail('Cell '+cell+' has an open/nonmanifold or wrongly oriented source boundary');
    }
    const v=volumes[cell];
    if(!(v>0)||!Number.isFinite(v))return fail('Cell '+cell+' has zero, negative or nonfinite signed physical volume');
    total+=v;min=Math.min(min,v);max=Math.max(max,v)
  }
  if(!Number.isFinite(total)||!(total>0))return fail('Total source physical mesh volume invalid');
  return{ok:true,volumes:Array.from(volumes),total,min,max,cells:n,
    method:'oriented, closed original owner/neighbour polyMesh face triangulations',
    units:'m3',isMeasuredGeometry:true,
    limitations:['Face polygons are fan-triangulated as in the original Field mesh reader; strongly nonplanar faces need independent checkMesh/surface validation.',
      'Valid directed topology and positive signed cell volumes do not certify other checkMesh quality metrics.']}
}
function sfFront(mesh,geometry,alpha,config){
  const fail=reason=>({ok:false,reason});
  if(!geometry?.ok||!Array.isArray(geometry.volumes)||!mesh)
    return fail('Independent source mesh volume and closure verification required');
  const n=mesh.cellCount,values=alpha,lo=sfNum(config?.low),hi=sfNum(config?.high),
    threshold=sfNum(config?.threshold),axis=['x','y','z'].indexOf(config?.axis);
  if(!Array.isArray(values)||values.length!==n||geometry.volumes.length!==n||
     !(lo>=0&&hi<=1&&lo<hi)||!(threshold>=0&&threshold<=1)||axis<0)
    return fail('Cell-aligned original fractions, thresholds or physical axis invalid');
  const phase={solid:0,mushy:0,liquid:0},count={solid:0,mushy:0,liquid:0};
  for(let cell=0;cell<n;cell++){
    const a=sfNum(values[cell]),volume=geometry.volumes[cell];
    if(!(a>=0&&a<=1)||!(volume>0)||!Number.isFinite(volume))
      return fail('Original alpha field outside [0,1], incomplete, or cell volume missing at index '+cell);
    const state=a<=lo?'solid':a>=hi?'liquid':'mushy';
    phase[state]+=volume;count[state]++
  }
  const total=phase.solid+phase.mushy+phase.liquid;
  const positions=[],crossings=[],neighbors=mesh.neighbours||[],owner=mesh.owners||[],
    xyz=mesh.cellCenters;
  let ambiguousFaces=0;
  for(let f=0;f<neighbors.length;f++){
    const a=owner[f],b=neighbors[f],va=values[a],vb=values[b];
    if(va===vb&&va===threshold){ambiguousFaces++;continue}
    if(va===vb||(threshold-va)*(threshold-vb)>0)continue;
    const weight=(threshold-va)/(vb-va);
    if(weight<0||weight>1||!Number.isFinite(weight))continue;
    const point=[0,1,2].map(k=>xyz[3*a+k]+weight*(xyz[3*b+k]-xyz[3*a+k]));
    if(!point.every(Number.isFinite))return fail('Invalid original cell centers for front interpolation');
    positions.push(point[axis]);crossings.push({face:f,xyzM:point})
  }
  let positionMin=Infinity,positionMax=-Infinity,positionSum=0;
  for(const v of positions){if(v<positionMin)positionMin=v;if(v>positionMax)positionMax=v;positionSum+=v}
  const extrema=positions.length?{min:positionMin,max:positionMax,
    mean:positionSum/positions.length}:null;
  return{ok:true,caseId:config.caseId,region:config.region,timeS:sfNum(config.timeS),
    volumeM3:phase,cellCounts:count,totalVolumeM3:total,
    fractions:Object.fromEntries(Object.entries(phase).map(([k,v])=>[k,v/total])),
    front:{threshold,axis:config.axis,crossingFaceCount:crossings.length,
      ambiguousPlateauFaces:ambiguousFaces,axisBoundsM:extrema,
      centroidXYZm:crossings.length?[0,1,2].map(k=>crossings.reduce((s,c)=>s+c.xyzM[k],0)/crossings.length):null},
    interpretation:'Cell-center interpolation across real internal polyMesh owner/neighbour faces, NOT an exact geometric iso-surface or solidification isotherm.',
    noSyntheticCells:true,noExperimentalClaims:true,noAutomaticRecalescence:true,
    limitations:['Phase volumes are whole-cell threshold classifications, not exact fractional subcell interface volumes.',
      'Front crossings and centroid are cell-center interpolations on ORIGINAL adjacent cells, not an extracted CFD surface.',
      'A single centroid cannot characterize multi-front topology; plateau faces are reported as ambiguous.']}
}
function sfTrajectory(rows){
  if(!Array.isArray(rows)||!rows.length)return{ok:false,reason:'No actual evaluated time frames'};
  const sorted=rows.slice().sort((a,b)=>a.timeS-b.timeS);
  for(let i=0;i<sorted.length;i++){
    const r=sorted[i];
    if(!r?.ok||!Number.isFinite(r.timeS)||i&&!(r.timeS>sorted[i-1].timeS)||
       r.region!==sorted[0].region||r.caseId!==sorted[0].caseId||
       r.front.axis!==sorted[0].front.axis||r.front.threshold!==sorted[0].front.threshold)
      return{ok:false,reason:'Frames have nonphysical, duplicate, different-case or incompatible original time/axis'};
  }
  const out=sorted.map((r,i)=>{
    const v=r.front.axisBoundsM?.mean??null,prev=i?sorted[i-1]:null,
      last=prev?.front.axisBoundsM?.mean??null,
      dt=prev?r.timeS-prev.timeS:null;
    return{timeS:r.timeS,solidVolumeM3:r.volumeM3.solid,mushyVolumeM3:r.volumeM3.mushy,
      liquidVolumeM3:r.volumeM3.liquid,totalVolumeM3:r.totalVolumeM3,
      solidVolumeFraction:r.fractions.solid,frontMeanAxisM:v,
      faceCrossings:r.front.crossingFaceCount,
      meanFrontDisplacementVelocityMps:v!==null&&last!==null&&dt>0?(v-last)/dt:null,
      velocityStatus:v===null||last===null?'unavailable':'centroid-displacement-proxy'}
  });
  return{ok:true,rows:out,sourceFrames:sorted.length,
    limitations:['Displacement of the crossing-centroid between two written times is only a signed spatial proxy, not local normal front speed.',
      'Moving/deforming meshes and multiple spatial fronts require separate interpretation; no regression/extrapolation is applied.']}
}
function sfSourceTimes(source){
  // The source catalog itself is evidence. A malformed/missing/duplicate
  // time cannot be hidden by filter(Number.isFinite) or Set deduplication.
  if(!Array.isArray(source)||source.length<2)return{ok:false,reason:'At least two original field times required',times:[]};
  const times=source.map(sfNum);
  if(times.some(t=>!Number.isFinite(t)))return{ok:false,reason:'Original field times contain missing or invalid physical values',times:[]};
  times.sort((a,b)=>a-b);
  for(let i=1;i<times.length;i++){
    if(times[i]===times[i-1])return{ok:false,reason:'Duplicate original physical time is ambiguous',times:[]}
  }
  return{ok:true,times}
}
function sfOriginalDigest(values){
  if(!Array.isArray(values)||!values.length||values.some(v=>!Number.isFinite(sfNum(v))))return null;
  const bytes=new DataView(new ArrayBuffer(8));
  let a=0x811c9dc5,b=0x9e3779b9;
  for(const source of values){
    bytes.setFloat64(0,sfNum(source),true);
    for(let i=0;i<8;i++){
      const q=bytes.getUint8(i);
      a=Math.imul(a^q,16777619)>>>0;
      b=(Math.imul(b^q,2246822519)+3266489917)>>>0
    }
  }
  return a.toString(16).padStart(8,'0')+':'+b.toString(16).padStart(8,'0')+':'+values.length
}
/* FOAMLENS_FRONT3D_CORE_END */

function sfUi(en,es){try{return typeof flUi==='function'?flUi(en,es):en}catch{return en}}
function sfEl(id){return document.getElementById(id)}
function sfEscape(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
let sfLatest=null,sfSequence=0,sfCases=[];
function sfInvalidate(message){
  sfSequence++;sfLatest=null;
  if(sfEl('sfExport'))sfEl('sfExport').disabled=true;
  if(sfEl('sfReport'))sfEl('sfReport').textContent='';
  if(message&&sfEl('sfStatus'))sfEl('sfStatus').textContent=message
}
function sfSelector(id,rows,value){
  const el=sfEl(id);if(!el)return;
  el.innerHTML=rows.map(([v,label])=>'<option value="'+sfEscape(v)+'">'+sfEscape(label)+'</option>').join('');
  if(rows.some(([v])=>String(v)===String(value)))el.value=String(value)
}
function sfRefresh(){
  sfInvalidate();
  const oldCase=sfEl('sfCase')?.value,all=Array.isArray(cases)?cases:[],
    active=all.find(c=>String(c.id)===oldCase)||all.find(c=>Number(c.id)===Number(activeContextCaseId))||all[0];
  sfCases=all;
  sfSelector('sfCase',all.map(c=>[c.id,c.name||String(c.id)]),active?.id);
  sfRefreshFields()
}
function sfRefreshFields(){
  sfInvalidate();
  const c=sfCases.find(c=>String(c.id)===String(sfEl('sfCase')?.value)),
    oldRegion=sfEl('sfRegion')?.value,oldField=sfEl('sfAlpha')?.value,
    all=c?.discoveryModel?.fields||[],
    usable=all.filter(f=>f.storage==='volume'&&f.kind==='scalar'&&
      f.dimensions==='[0 0 0 0 0 0 0]'&&Array.isArray(f.times)&&f.times.length);
  sfSelector('sfRegion',[...new Set(usable.map(f=>String(f.region||'')))].map(r=>[r,r||'Default region']),oldRegion);
  const region=sfEl('sfRegion')?.value||'',choices=usable.filter(f=>String(f.region||'')===region);
  const mapping=c?(typeof fmMappingForRegion==='function'?fmMappingForRegion(c,region):{}):{};
  const selected=choices.some(f=>f.name===oldField)?oldField:
    choices.some(f=>f.name===mapping.liquidFraction)?mapping.liquidFraction:choices[0]?.name;
  sfSelector('sfAlpha',choices.map(f=>[f.name,f.name+' · source dimensionless scalar']),selected);
  sfEl('sfStatus').textContent=sfUi('Choose an original volume scalar representing liquid fraction; verify its physical definition.',
    'Elige un escalar volumétrico original que represente fracción líquida; comprueba su definición física.')
}
async function sfAnalyze(){
  sfInvalidate(sfUi('Checking source mesh and liquid fractions…','Comprobando malla y fracciones líquidas originales…'));
  const token=sfSequence,c=sfCases.find(c=>String(c.id)===String(sfEl('sfCase')?.value)),
    region=sfEl('sfRegion')?.value||'',name=sfEl('sfAlpha')?.value||'',
    low=sfNum(sfEl('sfLow')?.value),high=sfNum(sfEl('sfHigh')?.value),
    threshold=sfNum(sfEl('sfThreshold')?.value),axis=sfEl('sfAxis')?.value,
    limit=sfNum(sfEl('sfLimit')?.value);
  if(!c||!name||!(low>=0&&high<=1&&low<high)||!(threshold>=0&&threshold<=1)||
     !['x','y','z'].includes(axis)||!Number.isSafeInteger(limit)||limit<2||limit>500){
    sfEl('sfStatus').textContent='Select a source scalar and valid thresholds, axis and maximum 2–500 frames.';return
  }
  const group=(c.discoveryModel?.fields||[]).filter(f=>f.name===name&&String(f.region||'')===region&&
    f.storage==='volume'&&f.kind==='scalar'&&f.dimensions==='[0 0 0 0 0 0 0]');
  if(group.length!==1){sfEl('sfStatus').textContent='Missing or ambiguous source volume field; physical analysis blocked.';return}
  const timeSource=sfSourceTimes(group[0].times);
  if(!timeSource.ok){sfEl('sfStatus').textContent=timeSource.reason;return}
  const times=timeSource.times;
  if(times.length>limit){sfEl('sfStatus').textContent=times.length+' original times; maximum '+limit+' frames, no hidden sampling.';return}
  const snapshots=[],provenance=[],geomCache=new Map();
  for(let i=0;i<times.length;i++){
    if(token!==sfSequence)return;
    const time=times[i];
    try{
      const layout=fvResolveFieldMeshLayout(c,region,group[0],time);
      if(!layout.valid)throw Error('Field/mesh mismatch: '+layout.reason);
      const info=await fvLoadMeshForLayout(c,layout,region,time),mesh=info.mesh;
      if(token!==sfSequence)return;
      let geo=geomCache.get(info.key);
      if(!geo){geo=sfVolumes(mesh);if(!geo.ok)throw Error(geo.reason);geomCache.set(info.key,geo)}
      const parts=await pmLoadStoredFieldSet(c.id,name,time,region);
      if(token!==sfSequence)return;
      if(!parts.length||parts.some(p=>!String(p?.sourcePath||'').trim()))throw Error('Missing original volScalarField file provenance');
      let values;
      if(layout.mode==='decomposed'){
        const joined=fvCombinePartitionFieldValues(mesh,parts,'value','volume');
        if(!joined.ok)throw Error(joined.reason);values=joined.values
      }else{
        if(parts.length!==1||String(parts[0].partition||''))throw Error('Nonunique reconstructed field source');
        const data=pmComponentValues(parts[0],'value',mesh.cellCount);
        if(!data.ok||data.values.length!==mesh.cellCount)throw Error('Scalar cell/mesh count mismatch');
        values=data.values
      }
      const frame=sfFront(mesh,geo,values,{caseId:c.id,region,timeS:time,low,high,threshold,axis});
      if(!frame.ok)throw Error(frame.reason);
      snapshots.push(frame);
      const sourceSnapshots=layout.mode==='decomposed'
        ?layout.parts.map(p=>({partition:p.partition,files:p.snapshot?.sourcePaths||null}))
        :[{partition:'',files:info.snapshot?.sourcePaths||null}];
      if(sourceSnapshots.some(x=>!x.files||!['points','faces','owner','neighbour'].every(key=>typeof x.files[key]==='string'&&x.files[key].trim())))
        throw Error('Original mesh file paths are missing: cannot certify geometry provenance');
      const fieldFingerprint=sfOriginalDigest(values);
      if(!fieldFingerprint)throw Error('Original cell field cannot be fingerprinted as complete finite measurements');
      provenance.push({timeS:time,meshSourcePaths:sourceSnapshots,
        fieldSourcePaths:parts.map(p=>p.sourcePath),originalCellValueFingerprint:fieldFingerprint,
        meshGeometryMethod:geo.method,cellCount:geo.cells});
      sfEl('sfStatus').textContent=(i+1)+'/'+times.length+' · '+time+' s · '+name;
      if(i%4===0&&typeof scannerYield==='function')await scannerYield()
    }catch(e){
      sfEl('sfStatus').textContent='t='+time+' s: '+String(e?.message||e)+'. No partial scientific report was exported.';return
    }
  }
  if(token!==sfSequence)return;
  const track=sfTrajectory(snapshots);
  if(!track.ok){sfEl('sfStatus').textContent=track.reason;return}
  sfLatest={schema:'foamlens/source-3d-solidification-front/1',caseId:c.id,caseName:c.name,region,
    originalScalar:name,fieldDimensions:'[0 0 0 0 0 0 0]',
    thresholds:{solidMax:low,liquidMin:high,front:threshold},
    projectionAxis:axis,provenance,track,frames:snapshots,
    limitations:['Original source cell volumes are computed only when mesh topology is closed and oriented.',
      'Volume by phase is whole-cell threshold membership; front is a cell-center crossing estimate, not a resolved iso-surface.',
      'The module neither simulates solidification nor infers recalescence or true normal front speed.']};
  const fmt=v=>v==null?'—':Number(v).toPrecision(6);
  sfEl('sfReport').innerHTML='<div class="extTableWrap"><table class="extTable"><thead><tr>'+
    ['t [s]','Solid [m³]','Mushy [m³]','Liquid [m³]','Solid [%]','Front '+axis+' [m]','Δfront/Δt [m/s]','Face crossings'].map(x=>'<th>'+sfEscape(x)+'</th>').join('')+
    '</tr></thead><tbody>'+track.rows.map(x=>'<tr>'+
      [fmt(x.timeS),fmt(x.solidVolumeM3),fmt(x.mushyVolumeM3),fmt(x.liquidVolumeM3),
       fmt(100*x.solidVolumeFraction),fmt(x.frontMeanAxisM),fmt(x.meanFrontDisplacementVelocityMps),x.faceCrossings]
      .map(v=>'<td>'+sfEscape(v)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>'+
    '<p class="smallnote">'+sfEscape(sfLatest.limitations.join(' '))+'</p>';
  sfEl('sfStatus').textContent=times.length+' original frames · '+name+' · all source mesh cells verified for closed oriented volume.';
  sfEl('sfExport').disabled=false
}
async function sfDownload(){
  if(!sfLatest)return;
  const before=JSON.stringify(sfLatest);
  // Re-read all original fractions and original meshes before a scientific
  // export, rather than silently writing a stale snapshot. If any genuine
  // source value changes, even with unchanged rounded volumes, block export.
  await sfAnalyze();
  if(!sfLatest)return;
  if(JSON.stringify(sfLatest)!==before){
    sfInvalidate('Original source mesh/field evidence changed. Review and rerun analysis before exporting.');
    return
  }
  const payload=JSON.stringify({...sfLatest,exportedAt:new Date().toISOString()},null,2);
  if(typeof downloadText==='function')downloadText('FoamLens_3D_front_source_evidence.json',payload,'application/json')
}
function sfInstall(){
  const host=document.getElementById('generalAnalysisModules')||document.getElementById('paTools');
  if(!host||sfEl('sfPanel'))return;
  const box=document.createElement('details');box.id='sfPanel';box.className='detailBlock';
  box.innerHTML='<summary><b>3D Solidification Front · Source Volumes and Cell-Center Crossings</b></summary>'+
    '<p class="smallnote">Original OpenFOAM volScalarField and original polyMesh only. Threshold cell volumes and crossing estimates are NOT exact subcell iso-surfaces; true front normal velocity is not inferred.</p>'+
    '<div class="extGrid2">'+
    '<div class="field"><label>Case</label><select id="sfCase"></select></div>'+
    '<div class="field"><label>Material region</label><select id="sfRegion"></select></div>'+
    '<div class="field"><label>Original liquid fraction field</label><select id="sfAlpha"></select></div>'+
    '<div class="field"><label>Physical front projection axis</label><select id="sfAxis"><option value="x">X [m]</option><option value="y">Y [m]</option><option value="z">Z [m]</option></select></div>'+
    '<div class="field"><label>Solid when α ≤</label><input id="sfLow" type="number" value="0.05" min="0" max="1" step="any"></div>'+
    '<div class="field"><label>Liquid when α ≥</label><input id="sfHigh" type="number" value="0.95" min="0" max="1" step="any"></div>'+
    '<div class="field"><label>Front threshold α =</label><input id="sfThreshold" type="number" value="0.5" min="0" max="1" step="any"></div>'+
    '<div class="field"><label>Maximum original physical time frames (no decimation)</label><input id="sfLimit" type="number" min="2" max="500" value="100"></div></div>'+
    '<div class="extActions"><button id="sfRefresh" type="button" class="btn soft">Refresh original source cases</button>'+
    '<button id="sfRun" type="button" class="btn primary">Track 3D source front</button>'+
    '<button id="sfExport" type="button" class="btn soft" disabled>Export scientific JSON</button></div>'+
    '<p id="sfStatus" class="smallnote" aria-live="polite"></p><div id="sfReport"></div>';
  host.appendChild(box);
  sfEl('sfRefresh').onclick=sfRefresh;
  sfEl('sfRun').onclick=()=>void sfAnalyze();
  sfEl('sfExport').onclick=sfDownload;
  sfEl('sfCase').addEventListener('change',sfRefreshFields);
  sfEl('sfRegion').addEventListener('change',sfRefreshFields);
  for(const id of ['sfAlpha','sfAxis','sfLow','sfHigh','sfThreshold','sfLimit'])
    sfEl(id).addEventListener(['sfLow','sfHigh','sfThreshold','sfLimit'].includes(id)?'input':'change',
      ()=>sfInvalidate('Inputs changed; rerun before scientific export.'));
  box.addEventListener('toggle',()=>{if(box.open)sfRefresh()});
  try{if(typeof flApplyBilingualText==='function')flApplyBilingualText(box)}catch{}
  sfRefresh()
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sfInstall,{once:true});else sfInstall();
window.FoamLensSolidificationFront3D={meshVolumes:sfVolumes,front:sfFront,trajectory:sfTrajectory};
