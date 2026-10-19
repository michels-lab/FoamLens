/* FoamLENS — Operación Granada #153: source-backed solidification front evidence.
   Read-only, opt-in analysis. Not a CFD solver or a certified surface reconstruction. */
/* FOAMLENS_FRONT_TRACKER_CORE_START */
function sftNum(x){return typeof x==='number'&&Number.isFinite(x)?x:NaN}
function sftVec(mesh,i){const p=mesh.points||[];return [sftNum(p[3*i]),sftNum(p[3*i+1]),sftNum(p[3*i+2])]}
function sftTriangle(a,b,c){
  const u=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],v=[c[0]-a[0],c[1]-a[1],c[2]-a[2]],
    cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
  return{cross,area:Math.hypot(...cross)/2,centroid:a.map((x,i)=>(x+b[i]+c[i])/3)}
}
function sftGeometry(mesh){
  const count=Number(mesh?.cellCount),nFaces=Number(mesh?.faceCount),nPoints=Number(mesh?.pointCount);
  const offsets=mesh?.faceOffsets||[],facePts=mesh?.facePoints||[],owner=mesh?.owners||[],neighbor=mesh?.neighbours||[],centers=mesh?.cellCenters||[];
  if(!mesh?.supported||!Number.isSafeInteger(count)||count<1||!Number.isSafeInteger(nFaces)||nFaces<4||
    !Number.isSafeInteger(nPoints)||nPoints<4||offsets.length!==nFaces+1||owner.length!==nFaces||
    centers.length!==count*3||mesh.points?.length!==nPoints*3||offsets[0]!==0||
    offsets[nFaces]!==facePts.length||neighbor.length>nFaces)throw Error('Incomplete or incompatible native polyMesh geometry.');
  const signed=new Float64Array(count),faceAreas=new Float64Array(nFaces),faceCenters=new Float64Array(nFaces*3),
    closure=new Float64Array(count*3),areaSums=new Float64Array(count),faceCounts=new Uint32Array(count);
  const center=c=>[sftNum(centers[3*c]),sftNum(centers[3*c+1]),sftNum(centers[3*c+2])];
  for(let c=0;c<count;c++)if(!center(c).every(Number.isFinite))throw Error('Invalid physical cell center.');
  for(let f=0;f<nFaces;f++){
    const lo=Number(offsets[f]),hi=Number(offsets[f+1]),o=Number(owner[f]),n=f<neighbor.length?Number(neighbor[f]):-1;
    if(!Number.isSafeInteger(lo)||!Number.isSafeInteger(hi)||hi-lo<3||lo<0||hi>facePts.length||
      !Number.isSafeInteger(o)||o<0||o>=count||(n>=0&&(!Number.isSafeInteger(n)||n>=count||n===o)))throw Error('Invalid owner/neighbour/face index at '+f);
    const a=sftVec(mesh,Number(facePts[lo]));if(!a.every(Number.isFinite))throw Error('Invalid physical mesh vertex.');
    let area=0,weighted=[0,0,0],crossSum=[0,0,0],volOwner=0,volNeighbor=0;
    for(let j=lo+1;j<hi-1;j++){
      const ib=Number(facePts[j]),ic=Number(facePts[j+1]);
      if(!Number.isSafeInteger(ib)||!Number.isSafeInteger(ic)||ib<0||ic<0||ib>=nPoints||ic>=nPoints)throw Error('Invalid mesh face vertex index.');
      const b=sftVec(mesh,ib),c=sftVec(mesh,ic);
      if(!b.every(Number.isFinite)||!c.every(Number.isFinite))throw Error('Nonfinite mesh face coordinate.');
      const tri=sftTriangle(a,b,c);
      if(!(tri.area>0))continue;
      area+=tri.area;
      for(let k=0;k<3;k++){crossSum[k]+=tri.cross[k];weighted[k]+=tri.centroid[k]*tri.area}
      const co=center(o),dot=(tri.centroid[0]-co[0])*tri.cross[0]+(tri.centroid[1]-co[1])*tri.cross[1]+(tri.centroid[2]-co[2])*tri.cross[2];
      volOwner+=dot/6;
      if(n>=0){const cn=center(n);volNeighbor+=((tri.centroid[0]-cn[0])*tri.cross[0]+(tri.centroid[1]-cn[1])*tri.cross[1]+(tri.centroid[2]-cn[2])*tri.cross[2])/6}
    }
    if(!(area>0))throw Error('Degenerate face area at '+f);
    faceAreas[f]=area;
    for(let k=0;k<3;k++)faceCenters[3*f+k]=weighted[k]/area;
    signed[o]+=volOwner;faceCounts[o]++;areaSums[o]+=area;
    for(let k=0;k<3;k++)closure[3*o+k]+=crossSum[k]/2;
    if(n>=0){
      signed[n]-=volNeighbor;faceCounts[n]++;areaSums[n]+=area;
      for(let k=0;k<3;k++)closure[3*n+k]-=crossSum[k]/2
    }
  }
  let total=0;for(let c=0;c<count;c++){
    const closing=Math.hypot(closure[3*c],closure[3*c+1],closure[3*c+2]);
    if(faceCounts[c]<4||!(signed[c]>0)||!Number.isFinite(signed[c])||
       closing>1e-6*areaSums[c])throw Error('Nonclosed, degenerate or inconsistently oriented cell '+c+'; volume not reported.');
    total+=signed[c]
  }
  if(!(total>0)||!Number.isFinite(total))throw Error('Cell volumes not finite and positive.');
  return{cellVolumes:Array.from(signed),faceAreas:Array.from(faceAreas),faceCenters:Array.from(faceCenters),totalVolume:total,
    internalFaces:neighbor.length,method:'signed oriented polyhedral face triangulation; closure checks; not a full checkMesh certification'}
}
function sftFrame(mesh,geometry,values,opt){
  const count=Number(mesh.cellCount),low=sftNum(opt.low),high=sftNum(opt.high),iso=sftNum(opt.iso);
  if(!(low>=0&&low<high&&high<=1&&iso>0&&iso<1))throw Error('Thresholds must obey 0 <= low < high <= 1 and 0 < iso < 1.');
  if(!values||values.length!==count||geometry.cellVolumes.length!==count)throw Error('Measured scalar field and mesh cell counts differ.');
  const alpha=new Float64Array(count),vol={solid:0,mushy:0,liquid:0},cells={solid:0,mushy:0,liquid:0};
  for(let i=0;i<count;i++){
    const v=sftNum(values[i]);if(!(v>=0&&v<=1))throw Error('Missing or out-of-range phase fraction at cell '+i+'; frame excluded.');
    const x=opt.role==='solidFraction'?1-v:v;
    if(opt.role!=='solidFraction'&&opt.role!=='liquidFraction')throw Error('Unknown explicitly declared phase field role.');
    alpha[i]=x;
    const phase=x<=low?'solid':x>=high?'liquid':'mushy',cellVolume=sftNum(geometry.cellVolumes[i]);
    if(!(cellVolume>0))throw Error('Invalid geometric cell volume.');
    vol[phase]+=cellVolume;cells[phase]++
  }
  let faceArea=0,frontFaces=0,xyz=[0,0,0];
  for(let f=0;f<geometry.internalFaces;f++){
    const a=Number(mesh.owners[f]),b=Number(mesh.neighbours[f]),da=alpha[a]-iso,db=alpha[b]-iso;
    if((da===0&&db===0)||!(da*db<=0)||da===db)continue;
    const area=sftNum(geometry.faceAreas[f]);
    if(!(area>0))throw Error('Missing measured interior-face area.');
    faceArea+=area;frontFaces++;
    for(let k=0;k<3;k++)xyz[k]+=area*geometry.faceCenters[3*f+k]
  }
  const total=geometry.totalVolume;
  const sum=vol.solid+vol.mushy+vol.liquid;
  if(Math.abs(sum-total)>1e-8*Math.max(1,total))throw Error('Phase volume accounting failed.');
  return{time:sftNum(opt.time),volumes:vol,counts:cells,totalVolume:total,
    fractions:{solid:vol.solid/total,mushy:vol.mushy/total,liquid:vol.liquid/total},
    front:{crossingFaceCount:frontFaces,crossingFaceArea:frontFaces?faceArea:null,
      crossingFaceCentroid:frontFaces?xyz.map(x=>x/faceArea):null,
      method:'internal cell-neighbor iso crossing; face-based proxy, NOT exact interpolated iso-surface'},
    geometryMethod:geometry.method}
}
function sftEvolution(frames){
  const out=frames.map(f=>({...f,centroidDisplacementRate:null,rateMethod:'not calculated'}));
  for(let i=1;i<out.length;i++){
    const a=out[i-1],b=out[i],dt=b.time-a.time,p=a.front.crossingFaceCentroid,q=b.front.crossingFaceCentroid;
    if(!(dt>0)||!p||!q)continue;
    b.centroidDisplacementRate=Math.hypot(...q.map((v,k)=>v-p[k]))/dt;
    b.rateMethod='area-weighted crossing-face centroid displacement / physical dt; NOT local interface normal velocity'
  }
  return out
}
/* FOAMLENS_FRONT_TRACKER_CORE_END */

const sftState={result:null,running:false,generation:0};
function sftUi(en,es){try{return flUi(en,es)}catch{return en}}
function sftEl(id){return document.getElementById(id)}
function sftEscape(x){return String(x??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;')}
function sftCase(){return caseById(Number(sftEl('sftCase')?.value))}
function sftSelected(){
  const c=sftCase(),region=sftEl('sftRegion')?.value||'',name=sftEl('sftField')?.value||'';
  return{c,region,group:c?fvFieldGroups(c,region,'scalar','volume').find(x=>x.name===name):null}
}
function sftStatus(msg){const e=sftEl('sftStatus');if(e)e.textContent=msg}
function sftInvalidate(){sftState.result=null;sftState.generation++;if(sftEl('sftResults'))sftEl('sftResults').replaceChildren()}
function sftSelectFill(id,items,value){
  const el=sftEl(id);if(!el)return;
  el.innerHTML=items.map(x=>'<option value="'+sftEscape(x.value)+'">'+sftEscape(x.label)+'</option>').join('')||'<option value="">—</option>';
  if(items.some(x=>x.value===value))el.value=value
}
function sftRefresh(level='case'){
  const oldCase=sftEl('sftCase')?.value,oldRegion=sftEl('sftRegion')?.value,oldField=sftEl('sftField')?.value;
  if(level==='case'){
    sftSelectFill('sftCase',(cases||[]).filter(c=>fvReadyRegions(c).some(r=>fvFieldGroups(c,r,'scalar','volume').length)).map(c=>({value:String(c.id),label:c.name})),oldCase)
  }
  const c=sftCase();
  const regions=c?[...new Set(fvReadyRegions(c).map(x=>String(x||'')))].filter(r=>fvFieldGroups(c,r,'scalar','volume').length):[];
  sftSelectFill('sftRegion',regions.map(r=>({value:r,label:r||sftUi('default region','región predeterminada')})),oldRegion);
  const region=sftEl('sftRegion')?.value||'';
  sftSelectFill('sftField',c?fvFieldGroups(c,region,'scalar','volume').map(g=>({value:g.name,label:g.name+' · '+(g.dimensions||'?')+' · '+g.times.length+' t'})):[],oldField);
  const n=sftSelected().group?.times?.length||1;
  sftEl('sftFrom').value='0';sftEl('sftTo').value=String(Math.min(120,n));
  sftInvalidate();
  sftStatus(sftUi('Select a measured cell scalar, declare the role, then analyze. No field is inferred to be a phase fraction.','Selecciona un escalar de celdas medido, declara su papel y analiza. No se supone que un campo sea fracción de fase.'))
}
function sftChart(frames){
  if(!frames.length)return'';
  const x0=frames[0].time,x1=frames.at(-1).time;if(!Number.isFinite(x0)||!Number.isFinite(x1))return'';
  const xx=t=>38+(t-x0)/(x1-x0||1)*620,yy=f=>185-150*f;
  const strokes={solid:'#d68e57',mushy:'#9b83d8',liquid:'#3fb69c'};
  const paths=Object.keys(strokes).map(k=>{
    // Mark only the physically written times. No synthetic line across missing frames.
    return frames.map(f=>'<circle cx="'+xx(f.time).toFixed(2)+'" cy="'+yy(f.fractions[k]).toFixed(2)+'" r="3" fill="'+strokes[k]+'"/>').join('')
  }).join('');
  return'<svg viewBox="0 0 690 210" role="img" aria-label="Measured source-time phase volume fractions" style="width:100%;max-height:240px"><path d="M38 28 V185 H660" stroke="currentColor" opacity=".5" fill="none"/>'+
  '<text x="3" y="35" fill="currentColor" font-size="12">100%</text><text x="14" y="185" fill="currentColor" font-size="12">0%</text>'+
  paths+'<text x="38" y="203" fill="currentColor" font-size="12">t='+sftEscape(x0)+' s</text><text x="560" y="203" fill="currentColor" font-size="12">t='+sftEscape(x1)+' s</text></svg>'+
  '<div class="smallnote">■ '+sftUi('solid','sólido')+' · ■ '+sftUi('mushy','pastoso')+' · ■ '+sftUi('liquid','líquido')+'</div>'
}
async function sftRun(){
  if(sftState.running)return;
  sftInvalidate();const seq=sftState.generation,{c,region,group}=sftSelected();
  try{
    if(!c||!group)throw Error('Select an imported case/region/original volume scalar field.');
    const low=Number(sftEl('sftLow').value),high=Number(sftEl('sftHigh').value),iso=Number(sftEl('sftIso').value),role=sftEl('sftRole').value;
    if(!(low>=0&&low<high&&high<=1&&iso>0&&iso<1))throw Error('Invalid thresholds.');
    const times=group.times.map(Number).filter(Number.isFinite).sort((a,b)=>a-b);
    if(!times.length||times.length!==group.times.length||times.some((t,i)=>i>0&&t<=times[i-1]))throw Error('Invalid or duplicate physical source times.');
    const start=Number(sftEl('sftFrom').value),end=Number(sftEl('sftTo').value);
    if(!Number.isInteger(start)||!Number.isInteger(end)||start<0||end>times.length||end<=start||end-start>120)throw Error('Select a valid index window: up to 120 original frames; no implicit downsampling.');
    const dim=String(group.dimensions||'').replace(/\s+/g,' ').trim();
    if(dim&&dim!=='[0 0 0 0 0 0 0]')throw Error('Original field is not dimensionless; phase fraction cannot be assumed.');
    sftState.running=true;const frames=[],excluded=[];
    for(let i=start;i<end;i++){
      if(seq!==sftState.generation)throw Error('Selection changed; analysis canceled.');
      const time=times[i];sftStatus(sftUi('Reading source frame','Leyendo cuadro original')+' '+(i-start+1)+'/'+(end-start)+' · t='+time+' s');
      try{
        const data=await fvLoadFrameData(c,group,region,time,'value',{includeBoundary:false});
        if(data.storage!=='volume'||data.mesh?.cellCount!==data.fieldValues?.length)throw Error('Cell-association mismatch.');
        const parsedDim=String(data.parsed?.dimensions||dim).replace(/\s+/g,' ').trim();
        if(parsedDim!=='[0 0 0 0 0 0 0]')throw Error('Dimensionless source field header is required.');
        const geom=sftGeometry(data.mesh);
        const frame=sftFrame(data.mesh,geom,data.fieldValues,{time,role,low,high,iso});
        frames.push({...frame,sourcePath:data.parsed?.sourcePath||null,meshSourcePaths:data.meshInfo?.snapshot?.sourcePaths||null});
      }catch(err){excluded.push({time,reason:String(err?.message||err)});frames.push(null)}
      await new Promise(resolve=>setTimeout(resolve,0))
    }
    if(seq!==sftState.generation)throw Error('Selection changed; analysis canceled.');
    const good=frames.filter(Boolean);if(!good.length)throw Error('No frame passed geometry and field checks; '+JSON.stringify(excluded.slice(0,4)));
    const evolved=sftEvolution(good);
    // A missing frame must never be bridged by an invented front speed.
    for(let i=1;i<evolved.length;i++)if(!frames.some((f,j)=>f===good[i-1]&&frames[j+1]===good[i])){
      evolved[i].centroidDisplacementRate=null;evolved[i].rateMethod='gap in original source frames'
    }
    const result={kind:'solidification-front-evidence',caseId:c.id,caseName:c.name,region,originalField:group.name,originalDimensions:dim,
      role,thresholds:{low,high,iso},selectedWindow:{startIndex:start,endIndexExclusive:end},frames:evolved,excluded,
      method:'source-backed cell volume by oriented closed polyMesh faces; neighboring-cell iso-crossing faces proxy',
      limitations:['Crossing-face area/centroid are proxies, not reconstructed interpolated iso-surface or local normal front velocity.',
        'Geometry closure checks are not equivalent to full checkMesh certification.',
        'No nucleation, recalescence or microstructure conclusion. No temporal interpolation or extrapolation.',
        'Only physically written source times and explicitly selected region and phase role.']};
    sftState.result=result;const host=sftEl('sftResults');
    const rows=evolved.map(f=>'<tr><td>'+sftEscape(f.time)+'</td><td>'+sftEscape((100*f.fractions.solid).toFixed(4))+'</td><td>'+
      sftEscape((100*f.fractions.mushy).toFixed(4))+'</td><td>'+sftEscape((100*f.fractions.liquid).toFixed(4))+'</td><td>'+
      sftEscape(f.front.crossingFaceCount)+'</td><td>'+sftEscape(f.centroidDisplacementRate==null?'—':f.centroidDisplacementRate.toPrecision(5))+'</td></tr>').join('');
    if(host)host.innerHTML=sftChart(evolved)+'<div class="dataCatalogTableWrap"><table class="dataCatalogTable"><thead><tr><th>t [s]</th><th>Solid %V</th><th>Mushy %V</th><th>Liquid %V</th><th>Crossing faces</th><th>Centroid Δ/dt [m/s]</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
      '<div class="smallnote">'+sftEscape(excluded.length)+' '+sftUi('excluded source frames','cuadros excluidos')+' · '+sftUi('centroid rate is NOT local front propagation speed. Export JSON for per-frame provenance and warnings.','la tasa del centroide NO es la velocidad local del frente. Exporta JSON para revisar procedencia y advertencias.')+'</div>';
    sftStatus(good.length+' '+sftUi('verified source frames','cuadros de fuente verificados')+'; '+excluded.length+' '+sftUi('excluded','excluidos'));
  }catch(err){sftStatus(String(err?.message||err))}finally{sftState.running=false}
}
function sftMount(){
  if(sftEl('sftTools'))return true;
  const parent=sftEl('generalAnalysisModules');if(!parent)return false;
  const el=document.createElement('section');el.id='sftTools';el.className='detailBlock';el.style.marginTop='10px';
  el.innerHTML='<h3 data-fl-en="3D Solidification Front Tracker" data-fl-es="Seguimiento 3D del frente de solidificación">3D Solidification Front Tracker</h3>'+
    '<p class="smallnote" data-fl-en="Cell phase volumes and internal neighbor-face front proxy from a real 3D OpenFOAM polyMesh and original phase fraction. Read-only. A proxy is not a true interpolated iso-surface or local front velocity." data-fl-es="Volúmenes por fase y aproximación del frente por caras interiores a partir de polyMesh 3D y fracción de fase originales. Solo lectura. No representa una isosuperficie exacta ni velocidad local del frente.">Source-only evidence.</p>'+
    '<div class="row2"><div class="field"><label>Case</label><select id="sftCase"></select></div><div class="field"><label>Region</label><select id="sftRegion"></select></div></div>'+
    '<div class="row2"><div class="field"><label>Original scalar field</label><select id="sftField"></select></div><div class="field"><label>Interpret as</label><select id="sftRole"><option value="liquidFraction">Liquid fraction αL</option><option value="solidFraction">Solid fraction αS</option></select></div></div>'+
    '<div class="row2"><div class="field"><label>Solid/mushy limit [0–1]</label><input type="number" id="sftLow" value="0.05" min="0" max="1" step="any"></div><div class="field"><label>Mushy/liquid limit [0–1]</label><input type="number" id="sftHigh" value="0.95" min="0" max="1" step="any"></div></div>'+
    '<div class="row2"><div class="field"><label>Front crossing iso [0–1]</label><input type="number" id="sftIso" value="0.5" min="0" max="1" step="any"></div><div class="field"><label>First source-frame index</label><input type="number" id="sftFrom" value="0" min="0" step="1"></div></div>'+
    '<div class="field"><label>End source-frame index (exclusive; max 120/frame request)</label><input type="number" id="sftTo" value="1" min="1" step="1"></div>'+
    '<div style="display:flex;flex-wrap:wrap;gap:6px"><button type="button" class="btn" id="sftRefresh">Refresh sources</button><button type="button" class="btn primary" id="sftRun">Analyze actual written frames</button><button type="button" class="btn" id="sftExport">Export provenance JSON</button></div>'+
    '<div class="smallnote" id="sftStatus"></div><div id="sftResults"></div>';
  parent.appendChild(el);try{flApplyBilingualText(el)}catch{}
  sftEl('sftCase').addEventListener('change',()=>sftRefresh('region'));
  sftEl('sftRegion').addEventListener('change',()=>sftRefresh('field'));
  sftEl('sftField').addEventListener('change',()=>{sftInvalidate();const g=sftSelected().group;sftEl('sftTo').value=String(Math.min(120,g?.times?.length||1))});
  for(const id of ['sftRole','sftLow','sftHigh','sftIso','sftFrom','sftTo'])sftEl(id).addEventListener('change',sftInvalidate);
  sftEl('sftRefresh').addEventListener('click',()=>sftRefresh());
  sftEl('sftRun').addEventListener('click',sftRun);
  sftEl('sftExport').addEventListener('click',()=>{
    if(!sftState.result){sftStatus(sftUi('Analyze first; no result is available.','Analiza primero; aún no hay resultado.'));return}
    downloadText('FoamLens_front_evidence.json',JSON.stringify({...sftState.result,exportedAt:new Date().toISOString()},null,2),'application/json')
  });
  sftRefresh();return true
}
(function sftStart(){if(!sftMount())requestAnimationFrame(sftStart)})();
document.addEventListener('foamlens-language-change',()=>{const e=sftEl('sftTools');if(e)try{flApplyBilingualText(e)}catch{}});
window.FoamLensFrontTracker={sftGeometry,sftFrame,sftEvolution,refresh:sftRefresh};
