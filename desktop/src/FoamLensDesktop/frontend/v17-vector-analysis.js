/* FoamLens Desktop post-v1.4.9 — vector glyph analysis + viewport scientific provenance. */
const fvaState={lastVectorAnalysis:null,installed:false};

function fvaUi(en,es){try{return flUi(en,es)}catch{return en}}
function fvaClamp01(v,fallback){v=Number(v);return Number.isFinite(v)?Math.max(0,Math.min(1,v)):fallback}

function fvaRoi(mesh){
  if(!mesh||!document.getElementById('fvVectorRoiEnabled')?.checked)return null;
  const lo=[],hi=[];
  for(const axis of ['X','Y','Z']){
    let a=fvaClamp01(document.getElementById('fvVectorRoi'+axis+'0')?.value,0);
    let b=fvaClamp01(document.getElementById('fvVectorRoi'+axis+'1')?.value,1);
    if(a>b)[a,b]=[b,a];
    lo.push(a);hi.push(b);
  }
  return{
    normalizedMin:lo,normalizedMax:hi,
    min:mesh.boundsMin.map((v,i)=>v+(mesh.boundsMax[i]-v)*lo[i]),
    max:mesh.boundsMin.map((v,i)=>v+(mesh.boundsMax[i]-v)*hi[i])
  }
}
function fvaCellInRoi(centers,ci,roi){
  if(!roi)return true;
  const p=[centers[3*ci],centers[3*ci+1],centers[3*ci+2]];
  return p.every((v,i)=>v>=roi.min[i]-1e-12&&v<=roi.max[i]+1e-12)
}
function fvaEligibleCells(mesh,vectors,roi=null){
  const centers=mesh?.cellCenters||[],count=Math.min(Math.floor(centers.length/3),vectors?.length||0),out=[];
  for(let i=0;i<count;i++)if(fvaCellInRoi(centers,i,roi))out.push(i);
  return out
}
function fvaSelectCells(mesh,vectors,target,roi=null){
  const centers=mesh?.cellCenters||[],eligible=fvaEligibleCells(mesh,vectors,roi),limit=Math.max(0,Math.min(eligible.length,Math.round(Number(target)||0)));
  if(!limit)return[];
  if(limit>=eligible.length)return eligible.slice();
  const eligibleSet=new Set(eligible),hash=fvState.spatialHash||fvBuildSpatialHash(centers,mesh.boundsMin,mesh.boundsMax,Math.floor(centers.length/3)),picked=[],used=new Set();
  if(hash?.buckets?.size){
    const representatives=[];
    for(const [,indices] of [...hash.buckets.entries()].sort((a,b)=>String(a[0]).localeCompare(String(b[0])))){
      let best=-1,bestMag=-Infinity;
      for(const ci of indices||[]){
        if(!eligibleSet.has(ci))continue;
        const v=vectors[ci]||[],m=Math.hypot(Number(v[0]),Number(v[1]),Number(v[2]));
        if(Number.isFinite(m)&&m>bestMag){best=ci;bestMag=m}
      }
      if(best>=0)representatives.push(best);
    }
    if(representatives.length){
      const take=Math.min(limit,representatives.length),step=representatives.length/take;
      for(let k=0;k<take;k++){
        const ci=representatives[Math.min(representatives.length-1,Math.floor((k+.5)*step))];
        if(!used.has(ci)){used.add(ci);picked.push(ci)}
      }
    }
  }
  if(picked.length<limit){
    const remain=eligible.filter(ci=>!used.has(ci)),need=limit-picked.length,step=remain.length/Math.max(1,need);
    for(let k=0;k<need&&picked.length<limit;k++){
      const ci=remain[Math.min(remain.length-1,Math.floor((k+.5)*step))];
      if(Number.isInteger(ci)&&!used.has(ci)){used.add(ci);picked.push(ci)}
    }
  }
  return picked.slice(0,limit)
}
function fvaMetrics(mesh,vectors,cells,roi=null){
  const eligible=fvaEligibleCells(mesh,vectors,roi),mag=i=>Math.hypot(...(vectors[i]||[]).slice(0,3).map(Number)),all=eligible.map(mag).filter(Number.isFinite),sample=(cells||[]).map(mag).filter(Number.isFinite);
  const mean=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:NaN,rAll=fvFiniteRange(all),rSample=fvFiniteRange(sample),allMean=mean(all),sampleMean=mean(sample);
  return{
    eligible:eligible.length,sampled:sample.length,allMean,sampleMean,
    meanRatio:Number.isFinite(allMean)&&Math.abs(allMean)>1e-14?sampleMean/allMean:NaN,
    rangeCoverage:rAll.valid&&rAll.max>rAll.min&&rSample.valid?Math.max(0,Math.min(1,(rSample.max-rSample.min)/(rAll.max-rAll.min))):1
  }
}
function fvaBuildGlyphs(mesh,vectors,maxGlyphs=260,glyphScale=1){
  const centers=mesh?.cellCenters||[],count=Math.min(Math.floor(centers.length/3),vectors?.length||0),diag=Math.hypot(mesh.boundsMax[0]-mesh.boundsMin[0],mesh.boundsMax[1]-mesh.boundsMin[1],mesh.boundsMax[2]-mesh.boundsMin[2])||1;
  const mode=document.getElementById('fvVectorLengthMode')?.value==='normalized'?'normalized':'proportional',roi=fvaRoi(mesh),eligible=fvaEligibleCells(mesh,vectors,roi),mags=new Array(count);
  for(let i=0;i<count;i++){const v=vectors[i]||[];mags[i]=Math.hypot(Number(v[0]),Number(v[1]),Number(v[2]))}
  const range=fvFiniteRange(eligible.map(i=>mags[i]).filter(Number.isFinite)),cells=fvaSelectCells(mesh,vectors,maxGlyphs,roi),positions=[],colors=[],scale=fvClamp(Number(glyphScale)||1,.35,3);
  let glyphCount=0,minLength=Infinity,maxLength=-Infinity;
  for(const ci of cells){
    const v=vectors[ci]||[],mag=mags[ci];if(!(mag>1e-14)||!v.every(Number.isFinite))continue;
    const u=[v[0]/mag,v[1]/mag,v[2]/mag],norm=range.valid&&range.max>0?Math.max(0,Math.min(1,mag/range.max)):1;
    const len=diag*(mode==='normalized'?.04:(.012+.05*norm))*scale;minLength=Math.min(minLength,len);maxLength=Math.max(maxLength,len);
    const p=[centers[3*ci],centers[3*ci+1],centers[3*ci+2]],q=[p[0]+u[0]*len,p[1]+u[1]*len,p[2]+u[2]*len];
    const ref=Math.abs(u[2])<.86?[0,0,1]:[0,1,0],cross=[u[1]*ref[2]-u[2]*ref[1],u[2]*ref[0]-u[0]*ref[2],u[0]*ref[1]-u[1]*ref[0]],cl=Math.hypot(...cross)||1,perp=cross.map(x=>x/cl);
    const head=len*.28,wing=len*.11,base=[q[0]-u[0]*head,q[1]-u[1]*head,q[2]-u[2]*head],left=[base[0]+perp[0]*wing,base[1]+perp[1]*wing,base[2]+perp[2]*wing],right=[base[0]-perp[0]*wing,base[1]-perp[1]*wing,base[2]-perp[2]*wing],rgb=fvColorMap(mag,range.min,range.max,'turbo');
    for(const seg of [[p,q],[q,left],[q,right]])for(const point of seg){positions.push(...point);colors.push(...rgb)}
    glyphCount++;
  }
  const sampling=fvaMetrics(mesh,vectors,cells,roi);
  const result={positions:new Float32Array(positions),colors:new Float32Array(colors),range,glyphCount,requested:Math.min(eligible.length,Math.round(maxGlyphs)),eligible:eligible.length,cells,lengthMode:mode,minLength:Number.isFinite(minLength)?minLength:0,maxLength:Number.isFinite(maxLength)?maxLength:0,sampling,roi};
  fvaState.lastVectorAnalysis=result;return result
}
function fvaRoiLabel(roi){
  if(!roi)return fvaUi('full domain','dominio completo');
  return roi.normalizedMin.map((v,i)=>Math.round(v*100)+'–'+Math.round(roi.normalizedMax[i]*100)+'%').join(' / ')
}
function fvaUpdateVectorMeta(){
  const e=document.getElementById('fvVectorMeta'),a=fvaState.lastVectorAnalysis;if(!e||!document.getElementById('fvVectors')?.checked||!a)return;
  const r=Number(a.sampling?.meanRatio),coverage=Number(a.sampling?.rangeCoverage);
  e.textContent=
    a.glyphCount.toLocaleString()+' '+fvaUi('glyphs rendered','glyphs renderizados')+
    ' · '+fvaUi('requested','solicitados')+' '+Number(a.requested||0).toLocaleString()+
    ' · '+fvaUi('eligible','elegibles')+' '+Number(a.eligible||0).toLocaleString()+
    ' · '+(a.lengthMode==='normalized'?fvaUi('equal normalized length','longitud normalizada igual'):fvaUi('length ∝ magnitude','longitud ∝ magnitud'))+
    ' · ROI '+fvaRoiLabel(a.roi)+
    ' · '+fvaUi('sample mean / ROI mean','media muestra / media ROI')+' '+(Number.isFinite(r)?fvFmt(r):'—')+
    ' · '+fvaUi('magnitude-range coverage','cobertura rango magnitud')+' '+(Number.isFinite(coverage)?Math.round(coverage*100)+'%':'—')
}
function fvaSource(group,parsed){
  return String(parsed?.sourcePath||parsed?.path||parsed?.fileName||group?.sourcePath||group?.fileName||group?.files?.[0]?.path||group?.files?.[0]?.name||'OpenFOAM field')
}
function fvaUpdateProvenance(){
  const e=document.getElementById('fvProvenance');if(!e)return;
  const c=fvCase(),g=fvCurrentFieldGroup(),parsed=fvState.fieldParsed,region=fvState.region||'',storage=fvState.fieldStorage||'',time=Number(fvState.time),unit=parsed?.dimensions&&typeof pmUnitFromDimensions==='function'?pmUnitFromDimensions(parsed.dimensions):'',dims=parsed?.dimensions?String(parsed.dimensions):'—',snapshot=fvState.meshSnapshot||'';
  const parser=fvState.mesh?.decomposed?fvaUi('processor reconstruction','reconstrucción processor'):parsed?.partition?fvaUi('processor field','campo processor'):fvaUi('native/reconstructed field','campo nativo/reconstruido');
  e.innerHTML='<b>'+fvEsc(c?.name||'—')+'</b> · '+fvEsc(region||fvaUi('default region','región predeterminada'))+' · <b>'+fvEsc(g?.name||fvState.fieldName||'—')+'</b> · '+fvEsc(fvAssociationLabel(storage))+(unit?' · ['+fvEsc(unit)+']':'')+' · t='+(Number.isFinite(time)?fvFmt(time):'—')+' s · dims '+fvEsc(dims)+' · '+fvEsc(parser)+(snapshot?' · mesh '+fvEsc(snapshot):'')+' · '+fvEsc(fvaSource(g,parsed))
}
function fvaSyncRoiUi(){
  document.getElementById('fvVectorRoiControls')?.classList.toggle('hidden',!document.getElementById('fvVectorRoiEnabled')?.checked)
}
function fvaCompareProvenance(state,c,viewId){
  if(!state||!c)return'';const g=typeof fcFieldFor==='function'?fcFieldFor(c,state.region||'',state.fieldName||''):null,parsed=state.fieldParsed,unit=parsed?.dimensions&&typeof pmUnitFromDimensions==='function'?pmUnitFromDimensions(parsed.dimensions):'',dims=parsed?.dimensions?String(parsed.dimensions):'—',assoc=fvAssociationLabel(state.fieldStorage||state.storage||'volume'),sync=typeof fcSyncText==='function'?fcSyncText(state.sync):'',source=fvaSource(g,parsed);
  return '<b>'+fvEsc(c.name||viewId)+'</b> · '+fvEsc(state.region||fvaUi('default region','región predeterminada'))+' · <b>'+fvEsc(state.fieldName||'—')+'</b> · '+fvEsc(assoc)+(unit?' · ['+fvEsc(unit)+']':'')+' · t='+(Number.isFinite(Number(state.time))?fvFmt(state.time):'—')+' s'+(sync?' · '+fvEsc(sync):'')+' · dims '+fvEsc(dims)+' · '+fvEsc(source)
}
function fvaEnsureCompareProvenance(){
  if(typeof fcState==='undefined')return;
  const v2=document.getElementById('fcViewport');if(v2&&!document.getElementById('fcProvenance'))v2.insertAdjacentHTML('beforeend','<div class="fvProvenance fcProvenance" id="fcProvenance"></div>');
  const e2=document.getElementById('fcProvenance'),c2=typeof fcCase==='function'?fcCase():null;if(e2)e2.innerHTML=fvaCompareProvenance(fcState,c2,'B');
  if(typeof fcExtraViews!=='undefined')for(const state of fcExtraViews){
    const vp=document.getElementById('fcExtra'+state.id+'Viewport'),id='fcExtra'+state.id+'Provenance';if(vp&&!document.getElementById(id))vp.insertAdjacentHTML('beforeend','<div class="fvProvenance fcProvenance" id="'+id+'"></div>');
    const e=document.getElementById(id),c=typeof fcExtraCase==='function'?fcExtraCase(state):null;if(e)e.innerHTML=fvaCompareProvenance(state,c,String.fromCharCode(64+Number(state.id)))
  }
}
function fvaInstallControls(){
  const sub=document.getElementById('fvVectorControls');if(!sub)return false;if(document.getElementById('fvVectorLengthMode'))return true;
  const meta=document.getElementById('fvVectorMeta');
  meta?.insertAdjacentHTML('beforebegin',
    '<div class="row2"><div class="field"><label data-fl-en="Arrow length" data-fl-es="Longitud de flecha">Arrow length</label><select id="fvVectorLengthMode"><option value="proportional" data-fl-en="Magnitude-proportional" data-fl-es="Proporcional a magnitud">Magnitude-proportional</option><option value="normalized" data-fl-en="Normalized / equal length" data-fl-es="Normalizada / misma longitud">Normalized / equal length</option></select></div><div class="field"><label data-fl-en="Sampling region" data-fl-es="Región de muestreo">Sampling region</label><label class="inlineCheck"><input id="fvVectorRoiEnabled" type="checkbox"> <span data-fl-en="Use ROI box" data-fl-es="Usar caja ROI">Use ROI box</span></label></div></div>'+
    '<div class="fvVectorRoi hidden" id="fvVectorRoiControls"><div class="smallnote" data-fl-en="Normalized ROI bounds (0–1 of domain extent)." data-fl-es="Límites ROI normalizados (0–1 de la extensión del dominio).">Normalized ROI bounds (0–1 of domain extent).</div><div class="row2"><div class="field"><label>X min / max</label><div class="row2"><input id="fvVectorRoiX0" type="number" min="0" max="1" step=".05" value="0"><input id="fvVectorRoiX1" type="number" min="0" max="1" step=".05" value="1"></div></div><div class="field"><label>Y min / max</label><div class="row2"><input id="fvVectorRoiY0" type="number" min="0" max="1" step=".05" value="0"><input id="fvVectorRoiY1" type="number" min="0" max="1" step=".05" value="1"></div></div></div><div class="field"><label>Z min / max</label><div class="row2"><input id="fvVectorRoiZ0" type="number" min="0" max="1" step=".05" value="0"><input id="fvVectorRoiZ1" type="number" min="0" max="1" step=".05" value="1"></div></div></div>');
  const viewport=document.querySelector('#fieldViewPanel .fvViewport');if(viewport&&!document.getElementById('fvProvenance'))viewport.insertAdjacentHTML('beforeend','<div class="fvProvenance" id="fvProvenance" aria-live="polite"></div>');
  if(!document.getElementById('fvaStyles')){const st=document.createElement('style');st.id='fvaStyles';st.textContent='.fvProvenance{position:absolute;left:12px;bottom:12px;z-index:7;max-width:min(68%,760px);padding:6px 8px;border:1px solid var(--line);border-radius:10px;background:color-mix(in srgb,var(--panel) 88%,transparent);backdrop-filter:blur(8px);font-size:8px;line-height:1.35;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.fvProvenance b{color:var(--text)}.fvVectorRoi{display:grid;gap:6px;margin:7px 0}.fvVectorRoi.hidden{display:none!important}@media(max-width:780px){.fvProvenance{max-width:60%;font-size:7px}}';document.head.appendChild(st)}
  try{flApplyBilingualText(sub)}catch{}
  for(const id of ['fvVectorLengthMode','fvVectorRoiEnabled','fvVectorRoiX0','fvVectorRoiX1','fvVectorRoiY0','fvVectorRoiY1','fvVectorRoiZ0','fvVectorRoiZ1']){
    document.getElementById(id)?.addEventListener('change',()=>{fvaSyncRoiUi();if(document.getElementById('fvVectors')?.checked)fvUpdateStreamlines(fvState.time,fvState.frameSeq).catch(e=>fvSetStatus(String(e?.message||e),true))})
  }
  document.getElementById('fvVectorRoiEnabled')?.addEventListener('change',fvaSyncRoiUi);fvaSyncRoiUi();return true
}
function fvaInstall(){
  if(fvaState.installed)return true;
  if(!fvaInstallControls())return false;
  const originalBuild=fvBuildVectorGlyphBuffers;fvBuildVectorGlyphBuffers=function(mesh,vectors,maxGlyphs=260,glyphScale=1){return fvaBuildGlyphs(mesh,vectors,maxGlyphs,glyphScale)};
  const originalUpdate=fvUpdateStreamlines;fvUpdateStreamlines=async function(...args){const x=await originalUpdate.apply(this,args);fvaUpdateVectorMeta();return x};
  const originalLoad=fvLoadFrame;fvLoadFrame=async function(...args){const x=await originalLoad.apply(this,args);fvaUpdateProvenance();fvaEnsureCompareProvenance();return x};
  if(typeof fcRefreshFrame==='function'){const originalCompareRefresh=fcRefreshFrame;fcRefreshFrame=async function(...args){const x=await originalCompareRefresh.apply(this,args);fvaEnsureCompareProvenance();return x}}
  if(typeof fcExtraRefreshFrame==='function'){const originalExtraRefresh=fcExtraRefreshFrame;fcExtraRefreshFrame=async function(...args){const x=await originalExtraRefresh.apply(this,args);fvaEnsureCompareProvenance();return x}}
  const api=window.FoamLensFieldView||{};Object.assign(api,{fvaRoi,fvaEligibleCells,fvaSelectCells,fvaMetrics,fvaBuildGlyphs,getVectorAnalysis:()=>fvaState.lastVectorAnalysis,updateProvenance:fvaUpdateProvenance,updateCompareProvenance:fvaEnsureCompareProvenance});window.FoamLensFieldView=api;
  document.addEventListener('foamlens-language-change',()=>{try{flApplyBilingualText(document.getElementById('fvVectorControls'))}catch{};fvaUpdateVectorMeta();fvaUpdateProvenance();fvaEnsureCompareProvenance()});
  fvaState.installed=true;fvaUpdateProvenance();fvaEnsureCompareProvenance();return true
}
(function retry(){if(fvaInstall())return;requestAnimationFrame(retry)})();
