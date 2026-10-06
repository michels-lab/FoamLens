/* FoamLens Desktop v1.3.0 — general physical derived analysis. */

/* FOAMLENS_PHYSICAL_ANALYSIS_CORE_START */
function paFiniteXY(t,y){
  const out=[];for(let i=0;i<Math.min(t?.length||0,y?.length||0);i++){const tx=Number(t[i]),vy=Number(y[i]);if(Number.isFinite(tx)&&Number.isFinite(vy))out.push([tx,vy])}
  out.sort((a,b)=>a[0]-b[0]);const d=[];for(const p of out){if(d.length&&Math.abs(d.at(-1)[0]-p[0])<=1e-12*Math.max(1,Math.abs(p[0])))d[d.length-1]=p;else d.push(p)}return d
}
function paDerivative(t,y,sign=1){
  const p=paFiniteXY(t,y),tt=p.map(q=>q[0]),out=new Array(p.length).fill(NaN),sg=Number(sign)||1;if(p.length<2)return{t:tt,y:out};
  for(let i=0;i<p.length;i++){
    let a,b;if(i===0){a=p[0];b=p[1]}else if(i===p.length-1){a=p[i-1];b=p[i]}else{a=p[i-1];b=p[i+1]}
    const dt=b[0]-a[0];out[i]=dt!==0?sg*(b[1]-a[1])/dt:NaN
  }
  return{t:tt,y:out}
}
function paTrapezoidIntegral(t,y,initial=0){
  const p=paFiniteXY(t,y),tt=p.map(q=>q[0]),out=[];let acc=Number(initial)||0;if(!p.length)return{t:[],y:[]};out.push(acc);
  for(let i=1;i<p.length;i++){const dt=p[i][0]-p[i-1][0];if(dt>0)acc+=.5*(p[i-1][1]+p[i][1])*dt;out.push(acc)}
  return{t:tt,y:out}
}
function paWeightedSum(rows,coefficients){
  const n=Math.min(...rows.map(r=>r.length));if(!Number.isFinite(n)||n<1)return[];
  const c=coefficients.map(Number);const out=[];for(let i=0;i<n;i++){let v=0,ok=true;for(let j=0;j<rows.length;j++){const x=Number(rows[j][i]),k=Number(c[j]);if(!Number.isFinite(x)||!Number.isFinite(k)){ok=false;break}v+=k*x}out.push(ok?v:NaN)}return out
}
function paRanks(a){
  const p=a.map((v,i)=>({v:Number(v),i})).filter(x=>Number.isFinite(x.v)).sort((x,y)=>x.v-y.v),r=new Array(a.length).fill(NaN);
  for(let i=0;i<p.length;){let j=i+1;while(j<p.length&&p[j].v===p[i].v)j++;const rank=(i+1+j)/2;for(let k=i;k<j;k++)r[p[k].i]=rank;i=j}return r
}
function paPearson(a,b){
  const p=[];for(let i=0;i<Math.min(a.length,b.length);i++){const x=Number(a[i]),y=Number(b[i]);if(Number.isFinite(x)&&Number.isFinite(y))p.push([x,y])}
  if(p.length<2)return NaN;const mx=p.reduce((s,q)=>s+q[0],0)/p.length,my=p.reduce((s,q)=>s+q[1],0)/p.length;let n=0,dx=0,dy=0;
  for(const [x,y] of p){const ax=x-mx,ay=y-my;n+=ax*ay;dx+=ax*ax;dy+=ay*ay}return dx>0&&dy>0?n/Math.sqrt(dx*dy):NaN
}
function paSpearman(a,b){
  const pairs=[];for(let i=0;i<Math.min(a.length,b.length);i++){const x=Number(a[i]),y=Number(b[i]);if(Number.isFinite(x)&&Number.isFinite(y))pairs.push([x,y])}
  if(pairs.length<2)return NaN;return paPearson(paRanks(pairs.map(p=>p[0])),paRanks(pairs.map(p=>p[1])))
}
function paCorrelation(a,b){const p=[];for(let i=0;i<Math.min(a.length,b.length);i++){const x=Number(a[i]),y=Number(b[i]);if(Number.isFinite(x)&&Number.isFinite(y))p.push([x,y])}return{count:p.length,pearson:paPearson(p.map(q=>q[0]),p.map(q=>q[1])),spearman:paSpearman(p.map(q=>q[0]),p.map(q=>q[1])),points:p}}
function paDimensionsShiftTime(dim,delta){
  const m=String(dim||'').trim().match(/^\[\s*([-+\d.]+)\s+([-+\d.]+)\s+([-+\d.]+)\s+([-+\d.]+)\s+([-+\d.]+)\s+([-+\d.]+)\s+([-+\d.]+)\s*\]$/);if(!m)return String(dim||'');
  const a=m.slice(1).map(Number);a[2]+=Number(delta)||0;return'['+a.map(v=>Number.isInteger(v)?String(v):String(v)).join(' ')+']'
}
function paDimensionsShiftLength(dim,delta){
  const m=String(dim||'').trim().match(/^\[\s*([-+\d.]+)\s+([-+\d.]+)\s+([-+\d.]+)\s+([-+\d.]+)\s+([-+\d.]+)\s+([-+\d.]+)\s+([-+\d.]+)\s*\]$/);if(!m)return String(dim||'');
  const a=m.slice(1).map(Number);a[1]+=Number(delta)||0;return'['+a.map(v=>Number.isInteger(v)?String(v):String(v)).join(' ')+']'
}
function paCoordinateScaleToMetres(unit){
  const u=String(unit||'').trim().toLowerCase().replace('μ','µ');
  if(u==='m'||u==='metre'||u==='meter')return 1;
  if(u==='cm')return 1e-2;
  if(u==='mm')return 1e-3;
  if(u==='µm'||u==='um')return 1e-6;
  if(u==='nm')return 1e-9;
  return NaN
}
function paSpatialDerivative(x,y,coordinateScale=1){
  const p=paFiniteXY(x,y),xx=p.map(q=>q[0]),out=new Array(p.length).fill(NaN),scale=Number(coordinateScale);
  if(p.length<2||!Number.isFinite(scale)||scale<=0)return{t:xx,y:out};
  for(let i=0;i<p.length;i++){
    let a,b;if(i===0){a=p[0];b=p[1]}else if(i===p.length-1){a=p[i-1];b=p[i]}else{a=p[i-1];b=p[i+1]}
    const ds=(b[0]-a[0])*scale;out[i]=ds!==0?(b[1]-a[1])/ds:NaN
  }
  return{t:xx,y:out}
}
function paUnitOf(s){return String(s?.field?.unit||s?.unit||'').trim()}
function paKnownUnit(u){u=String(u||'').trim();return u&&u!=='-'&&u.toLowerCase()!=='unknown'?u:''}
function paDerivativeUnit(u){const k=paKnownUnit(u);return k?(k==='1'?'1/s':k+'/s'):'1/s'}
function paSpatialDerivativeUnit(u,coordinateUnit,siConverted=false){
  const k=paKnownUnit(u),den=siConverted?'m':String(coordinateUnit||'').trim();
  if(!k)return den?('1/'+den):'';
  if(!den)return k+'/coordinate';
  return k==='1'?('1/'+den):(k+'/'+den)
}
function paIntegralUnit(u){const k=paKnownUnit(u);return k?(k==='1'?'s':k+'·s'):'s'}
function paCompatibleKnownUnits(seriesList){
  const known=[...new Set((seriesList||[]).map(paUnitOf).map(paKnownUnit).filter(Boolean))];return{compatible:known.length<=1,unit:known[0]||'',known}
}
function paSourceProvenance(s){
  const pp=s?.postProcessing||null;
  return{
    sourcePath:String(s?.sourcePath||''),
    sourceKind:String(s?.sourceKind||'native'),
    postProcessing:pp?{kind:String(pp.kind||''),reduction:String(pp.reduction||''),selection:{...(pp.selection||{})},columns:[...(pp.columns||[])]}:null
  }
}
/* FOAMLENS_PHYSICAL_ANALYSIS_CORE_END */

function paSources(){return (typeof series!=='undefined'&&Array.isArray(series)?series:[]).filter(s=>{try{return datasetTypeOf(s)==='timeseries'&&taFinitePairs(s).length>=2&&(typeof seriesMatchesGlobalContext!=='function'||seriesMatchesGlobalContext(s))}catch{return Array.isArray(s?.t)&&Array.isArray(s?.y)&&s.t.length>=2}})}
function paProfileSources(){return (typeof series!=='undefined'&&Array.isArray(series)?series:[]).filter(s=>{try{return datasetTypeOf(s)==='profile'&&paFiniteXY(s.t,s.y).length>=2&&(typeof seriesMatchesGlobalContext!=='function'||seriesMatchesGlobalContext(s))}catch{return Number.isFinite(Number(s?.profileTime))&&Array.isArray(s?.t)&&Array.isArray(s?.y)&&s.t.length>=2}})}
function paLabel(s){try{return taSeriesLabel(s)}catch{return String(s?.name||s?.label||'Series')}}
function paFind(id){const src=paSources();return src.find((s,i)=>String(s.id??i)===String(id))}
function paOpts(){return paSources().map((s,i)=>`<option value="${String(s.id??i).replace(/"/g,'&quot;')}">${paLabel(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')}</option>`).join('')}
function paProfileFind(id){const src=paProfileSources();return src.find((s,i)=>String(s.id??i)===String(id))}
function paProfileOpts(){return paProfileSources().map((s,i)=>`<option value="${String(s.id??i).replace(/"/g,'&quot;')}">${paLabel(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')} · ${String(s.profileLine||'profile').replace(/&/g,'&amp;').replace(/</g,'&lt;')} · t=${paFmt(s.profileTime)} s</option>`).join('')}
function paFmt(v){return Number.isFinite(Number(v))?Number(v).toLocaleString(undefined,{maximumSignificantDigits:7}):'—'}
function paAddSeries(base,name,t,y,metadata={}){
  const unit=metadata.outputUnit??paUnitOf(base),dimensions=metadata.outputDimensions??base?.field?.dimensions??base?.dimensions??'';
  const d={...base,id:'pa_'+Date.now()+'_'+Math.random().toString(36).slice(2,7),name,label:name,t:t.slice(),y:y.slice(),derived:true,derivedKind:'physicalDerived',sourceKind:'derived',sourcePath:'FoamLens physical analysis',visible:true,hidden:false,checked:true,enabled:true,field:{...(base?.field||{}),canonical:'derived:'+name,raw:name,name,displayName:name,unit,dimensions},unit,dimensions,physicalAnalysis:{...metadata,outputUnit:unit,outputDimensions:dimensions}};
  series.push(d);activeId=d.id;try{refreshDatasetControls();renderList();updateMeta();if(activeAppMode==='field')draw()}catch(e){console.warn('Physical derived series refresh failed',e)}return d
}
function paAddProfileSeries(base,name,x,y,metadata={}){
  const unit=metadata.outputUnit??paUnitOf(base),dimensions=metadata.outputDimensions??base?.field?.dimensions??base?.dimensions??'';
  const d={...base,id:'pa_profile_'+Date.now()+'_'+Math.random().toString(36).slice(2,7),name,label:name,t:x.slice(),y:y.slice(),derived:true,derivedKind:'physicalDerived',sourceKind:'derived',sourcePath:'FoamLens gradient analysis',visible:true,hidden:false,checked:true,enabled:true,field:{...(base?.field||{}),canonical:'derived:'+name,raw:name,name,displayName:name,unit,dimensions},unit,dimensions,physicalAnalysis:{...metadata,outputUnit:unit,outputDimensions:dimensions}};
  series.push(d);activeId=d.id;try{refreshDatasetControls();renderList();updateMeta();if(activeAppMode==='field')draw()}catch(e){console.warn('Spatial gradient series refresh failed',e)}return d
}
function paRateConfig(){
  const mode=document.getElementById('paRateMode')?.value||'derivative';
  if(mode==='cooling')return{sign:-1,label:flUi('Cooling Rate','Tasa de enfriamiento'),formula:'−dφ/dt',interpretation:flUi('User-selected cooling-rate transform','Transformación de tasa de enfriamiento seleccionada por el usuario')};
  if(mode==='solidificationLiquid')return{sign:-1,label:flUi('Solidification Rate','Tasa de solidificación'),formula:'−dαL/dt',interpretation:flUi('User-selected liquid-fraction transform','Transformación de fracción líquida seleccionada por el usuario')};
  if(mode==='solidificationSolid')return{sign:1,label:flUi('Solidification Rate','Tasa de solidificación'),formula:'dαS/dt',interpretation:flUi('User-selected solid-fraction transform','Transformación de fracción sólida seleccionada por el usuario')};
  if(mode==='negative')return{sign:-1,label:flUi('Negative time derivative','Derivada temporal negativa'),formula:'−dφ/dt',interpretation:flUi('Generic negative physical-time derivative','Derivada negativa genérica respecto al tiempo físico')};
  return{sign:1,label:flUi('Time derivative','Derivada temporal'),formula:'dφ/dt',interpretation:flUi('Generic physical-time derivative','Derivada genérica respecto al tiempo físico')}
}
function paCreateRate(){
  const s=paFind(document.getElementById('paRateSource')?.value);if(!s){flSetIssue('paRateStatus','selection-missing',{analysis:'Physical Rate'});return}flClearIssue('paRateStatus');const cfg=paRateConfig(),d=paDerivative(s.t,s.y,cfg.sign),name=`${cfg.label}: ${paLabel(s)}`;
  paAddSeries(s,name,d.t,d.y,{operation:'physical-time-derivative',formula:cfg.formula,source:paLabel(s),explicitUserRole:true,noMechanismInference:true,outputUnit:paDerivativeUnit(paUnitOf(s)),outputDimensions:paDimensionsShiftTime(s?.field?.dimensions||s?.dimensions||'',-1)});
  document.getElementById('paRateStatus').textContent=diagEs()?`Se agregó ${name}. La derivada usa tiempo físico, incluyendo timesteps no uniformes.`:`Added ${name}. Derivative uses physical time, including nonuniform timesteps.`
}
function paCreateSpatialGradient(){
  const s=paProfileFind(document.getElementById('paGradientSource')?.value),out=document.getElementById('paGradientStatus');if(!out)return;if(!s){flSetIssue(out,'selection-missing',{analysis:'Spatial Gradient'});return}flClearIssue(out);
  const coordUnit=String(s.profileCoordUnit||''),scale=paCoordinateScaleToMetres(coordUnit),si=Number.isFinite(scale),usedScale=si?scale:1;
  const d=paSpatialDerivative(s.t,s.y,usedScale),axis=String(s.profileAxis||'s'),name=`${flUi('Spatial Gradient','Gradiente espacial')} dφ/d${axis}: ${paLabel(s)}`;
  const baseDim=String(s?.field?.dimensions||s?.dimensions||''),baseUnit=paUnitOf(s),outputUnit=paSpatialDerivativeUnit(baseUnit,coordUnit,si);
  paAddProfileSeries(s,name,d.t,d.y,{operation:'spatial-gradient',formula:`dφ/d${axis}`,source:paLabel(s),coordinateAxis:axis,coordinateUnit:coordUnit||'unknown',coordinateScaleToMetres:si?scale:null,siCoordinateConversion:si,noMechanismInference:true,outputUnit,outputDimensions:paDimensionsShiftLength(baseDim,-1)});
  out.textContent=si
    ? (diagEs()?`Se agregó ${name}. Los incrementos de coordenada se convirtieron de ${coordUnit||'m'} a metros antes de derivar.`:`Added ${name}. Coordinate increments were converted from ${coordUnit||'m'} to metres before differentiation.`)
    : (diagEs()?`Se agregó ${name}. La unidad de coordenada no se reconoce para conversión SI; la derivada se reporta por ${coordUnit||'unidad de coordenada'} sin renombrarla como por metro.`:`Added ${name}. Coordinate unit is not recognized for SI conversion; derivative is reported per ${coordUnit||'coordinate unit'} without relabeling it as per metre.`)
}
function paEnergySources(){return ['paEnergyA','paEnergyB','paEnergyC'].map(id=>paFind(document.getElementById(id)?.value)).filter(Boolean)}
function paRunEnergy(){
  const all=['paEnergyA','paEnergyB','paEnergyC'].map((id,i)=>({s:paFind(document.getElementById(id)?.value),c:Number(document.getElementById(['paCoeffA','paCoeffB','paCoeffC'][i])?.value)})).filter(x=>x.s&&Number.isFinite(x.c));
  const out=document.getElementById('paEnergyStatus');if(all.length<2){flSetIssue(out,'selection-missing',{analysis:'Physical Balance',field:'at least two temporal terms'});return}flClearIssue(out)
  const units=paCompatibleKnownUnits(all.map(x=>x.s));if(!units.compatible){flSetIssue(out,'incompatible known units: '+units.known.join(' vs '),{analysis:'Physical Balance'});return}
  const knownDims=[...new Set(all.map(x=>String(x.s?.field?.dimensions||x.s?.dimensions||'').trim()).filter(Boolean))];if(knownDims.length>1){flSetIssue(out,'incompatible OpenFOAM dimensions: '+knownDims.join(' vs '),{analysis:'Physical Balance'});return}
  const aligned=taAlignSeries(all.map(x=>x.s),{mode:'common',method:'linear',maxPoints:2500});if(!aligned.valid){flSetIssue(out,'no shared physical-time interval',{analysis:'Physical Balance'});return}
  const net=paWeightedSum(aligned.series.map(x=>x.y),all.map(x=>x.c)),integ=paTrapezoidIntegral(aligned.grid,net,0),terms=all.map(x=>({source:paLabel(x.s),coefficient:x.c,unit:paUnitOf(x.s),dimensions:String(x.s?.field?.dimensions||x.s?.dimensions||''),provenance:paSourceProvenance(x.s)}));
  const base=all[0].s,n1=flUi('Net balance: ','Balance neto: ')+terms.map(x=>`${x.coefficient>=0?'+':''}${x.coefficient}×${x.source}`).join(' '),baseDim=String(base?.field?.dimensions||base?.dimensions||''),baseUnit=units.unit||paUnitOf(base);
  paAddSeries(base,n1,aligned.grid,net,{operation:'weighted-energy-power-balance',terms,alignment:{mode:'common',method:'linear',range:aligned.range,noExtrapolation:true},outputUnit:baseUnit,outputDimensions:baseDim});
  paAddSeries(base,flUi('Cumulative integral of ','Integral acumulada de ')+n1,integ.t,integ.y,{operation:'trapezoidal-time-integral',source:n1,terms,alignment:{mode:'common',method:'linear',range:aligned.range,noExtrapolation:true},outputUnit:paIntegralUnit(baseUnit),outputDimensions:paDimensionsShiftTime(baseDim,1)});
  const sourceKinds=[...new Set(terms.map(x=>x.provenance?.postProcessing?.kind).filter(Boolean))];
  out.textContent=diagEs()?`Se agregaron el balance neto y la integral temporal acumulada entre ${paFmt(aligned.range.start)}–${paFmt(aligned.range.end)} s. FoamLens no asumió qué signo es físicamente positivo; los coeficientes los definiste tú.${sourceKinds.length?` Tipos de fuente: ${sourceKinds.join(', ')}.`:''}`:`Added net balance and cumulative time integral over ${paFmt(aligned.range.start)}–${paFmt(aligned.range.end)} s. FoamLens did not assume which sign is physically positive; coefficients came from you.${sourceKinds.length?` Source types: ${sourceKinds.join(', ')}.`:''}`
}
function paRunCorrelation(){
  const A=paFind(document.getElementById('paCorrA')?.value),B=paFind(document.getElementById('paCorrB')?.value),out=document.getElementById('paCorrStatus');if(!A||!B||A===B){flSetIssue(out,'selection-missing',{analysis:'Physical Correlation',field:'two different temporal series'});return}flClearIssue(out)
  const aligned=taAlignSeries([A,B],{mode:'common',method:'linear',maxPoints:1800});if(!aligned.valid){flSetIssue(out,'no common physical-time range',{analysis:'Physical Correlation'});return}
  const c=paCorrelation(aligned.series[0].y,aligned.series[1].y);out.textContent=diagEs()?`n = ${c.count} · Pearson = ${paFmt(c.pearson)} · Spearman = ${paFmt(c.spearman)}. La correlación es descriptiva y no se trata como causalidad.`:`n = ${c.count} · Pearson = ${paFmt(c.pearson)} · Spearman = ${paFmt(c.spearman)}. Correlation is descriptive and is not treated as causation.`;paDrawScatter(c.points,A,B)
}
function paDrawScatter(points,A,B){
  const cv=document.getElementById('paScatter');if(!cv)return;const rect=cv.getBoundingClientRect(),W=Math.max(260,Math.round(rect.width||360)),H=220,dpr=Math.max(1,window.devicePixelRatio||1);cv.width=W*dpr;cv.height=H*dpr;const ctx=cv.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,W,H);
  const dark=document.body.classList.contains('dark'),fg=dark?'#b9c7d4':'#46586a',grid=dark?'#263442':'#dce4eb',xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);if(!points.length)return;
  let xmin=Math.min(...xs),xmax=Math.max(...xs),ymin=Math.min(...ys),ymax=Math.max(...ys);if(xmax===xmin){xmin-=.5;xmax+=.5}if(ymax===ymin){ymin-=.5;ymax+=.5}
  const L=42,R=10,T=12,Bm=32,pw=W-L-R,ph=H-T-Bm;ctx.strokeStyle=grid;ctx.strokeRect(L,T,pw,ph);ctx.fillStyle=fg;ctx.font='9px Segoe UI,Arial';
  for(const [x,y] of points){const px=L+(x-xmin)/(xmax-xmin)*pw,py=T+ph-(y-ymin)/(ymax-ymin)*ph;ctx.beginPath();ctx.arc(px,py,2,0,Math.PI*2);ctx.fill()}
  ctx.fillText(String(A?.name||A?.field?.canonical||'A').slice(0,28),L,T+ph+17);ctx.save();ctx.translate(11,T+ph/2);ctx.rotate(-Math.PI/2);ctx.fillText(String(B?.name||B?.field?.canonical||'B').slice(0,28),0,0);ctx.restore()
}
function paBuildUi(){
  if(document.getElementById('paTools'))return;const host=document.getElementById('generalAnalysisModules');if(!host)return;const box=document.createElement('div');box.id='paTools';box.className='detailBlock';box.style.marginTop='10px';
  box.innerHTML=`<div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><b data-fl-en="General Physical Analysis" data-fl-es="Análisis físico general">General Physical Analysis</b><span class="badge" data-fl-en="derived" data-fl-es="derivado">derived</span></div>
  <div class="smallnote" style="margin-top:5px" data-fl-en="Derived quantities are explicit transforms of selected data. FoamLens does not infer nucleation, recalescence, dominance, or causality from these operations." data-fl-es="Las cantidades derivadas son transformaciones explícitas de los datos seleccionados. FoamLens no infiere nucleación, recalescencia, dominancia ni causalidad a partir de estas operaciones.">Derived quantities are explicit transforms of selected data.</div>
  <hr style="border:0;border-top:1px solid var(--line);margin:10px 0"><b data-fl-en="Physical-time rate" data-fl-es="Tasa respecto al tiempo físico">Physical-time rate</b>
  <div class="field"><label data-fl-en="Source" data-fl-es="Fuente">Source</label><select id="paRateSource"></select></div>
  <div class="field"><label data-fl-en="Transform" data-fl-es="Transformación">Transform</label><select id="paRateMode"><option value="derivative">dφ/dt</option><option value="negative">−dφ/dt</option><option value="cooling" data-fl-en="Cooling Rate (−dT/dt)" data-fl-es="Tasa de enfriamiento (−dT/dt)">Cooling Rate (−dT/dt)</option><option value="solidificationLiquid" data-fl-en="Solidification Rate (−dαL/dt)" data-fl-es="Tasa de solidificación (−dαL/dt)">Solidification Rate (−dαL/dt)</option><option value="solidificationSolid" data-fl-en="Solidification Rate (dαS/dt)" data-fl-es="Tasa de solidificación (dαS/dt)">Solidification Rate (dαS/dt)</option></select></div>
  <button class="btn primary" id="paCreateRate" type="button" data-fl-en="Create rate series" data-fl-es="Crear serie de tasa">Create rate series</button><div class="smallnote" id="paRateStatus"></div>
  <div id="paGradientBlock">
    <hr style="border:0;border-top:1px solid var(--line);margin:10px 0"><b data-fl-en="Spatial Gradient Analysis" data-fl-es="Análisis de gradiente espacial">Spatial Gradient Analysis</b>
    <div class="smallnote" data-fl-en="Differentiate a loaded spatial profile on its physical coordinate. Nonuniform spatial spacing is supported; array index is never used as distance." data-fl-es="Deriva un perfil espacial cargado respecto a su coordenada física. Se admite espaciado espacial no uniforme; el índice del arreglo nunca se usa como distancia.">Differentiate a loaded spatial profile on its physical coordinate.</div>
    <div class="field"><label data-fl-en="Profile source" data-fl-es="Fuente del perfil">Profile source</label><select id="paGradientSource"></select></div>
    <button class="btn primary" id="paCreateGradient" type="button" data-fl-en="Create dφ/ds profile" data-fl-es="Crear perfil dφ/ds">Create dφ/ds profile</button><div class="smallnote" id="paGradientStatus"></div>
  </div>
  <hr style="border:0;border-top:1px solid var(--line);margin:10px 0"><b data-fl-en="Energy / power balance" data-fl-es="Balance de energía / potencia">Energy / power balance</b>
  <div class="smallnote" data-fl-en="Choose temporal power/flux/integral terms and set their signs explicitly. FoamLens will not label a quantity “total energy” unless your selected terms define it." data-fl-es="Elige términos temporales de potencia/flujo/integral y define sus signos explícitamente. FoamLens no etiquetará una cantidad como “energía total” salvo que los términos seleccionados la definan.">Choose temporal power/flux/integral terms and set their signs explicitly.</div>
  <div class="row2"><div class="field"><label data-fl-en="Term A" data-fl-es="Término A">Term A</label><select id="paEnergyA"></select></div><div class="field"><label data-fl-en="Coefficient" data-fl-es="Coeficiente">Coefficient</label><input id="paCoeffA" type="number" value="1" step="any"></div></div>
  <div class="row2"><div class="field"><label data-fl-en="Term B" data-fl-es="Término B">Term B</label><select id="paEnergyB"></select></div><div class="field"><label data-fl-en="Coefficient" data-fl-es="Coeficiente">Coefficient</label><input id="paCoeffB" type="number" value="-1" step="any"></div></div>
  <div class="row2"><div class="field"><label data-fl-en="Term C (optional)" data-fl-es="Término C (opcional)">Term C (optional)</label><select id="paEnergyC"><option value="" data-fl-en="None" data-fl-es="Ninguno">None</option></select></div><div class="field"><label data-fl-en="Coefficient" data-fl-es="Coeficiente">Coefficient</label><input id="paCoeffC" type="number" value="1" step="any"></div></div>
  <button class="btn primary" id="paRunEnergy" type="button" data-fl-en="Create balance + integral" data-fl-es="Crear balance + integral">Create balance + integral</button><div class="smallnote" id="paEnergyStatus"></div>
  <hr style="border:0;border-top:1px solid var(--line);margin:10px 0"><b data-fl-en="Scatter / correlation" data-fl-es="Dispersión / correlación">Scatter / correlation</b>
  <div class="row2"><div class="field"><label>X</label><select id="paCorrA"></select></div><div class="field"><label>Y</label><select id="paCorrB"></select></div></div>
  <button class="btn primary" id="paRunCorrelation" type="button" data-fl-en="Analyze correlation" data-fl-es="Analizar correlación">Analyze correlation</button><div class="smallnote" id="paCorrStatus"></div><canvas id="paScatter" style="width:100%;height:220px;margin-top:7px"></canvas>`;
  host.appendChild(box);flApplyBilingualText(box);document.getElementById('paCreateRate').onclick=paCreateRate;document.getElementById('paCreateGradient').onclick=paCreateSpatialGradient;document.getElementById('paRunEnergy').onclick=paRunEnergy;document.getElementById('paRunCorrelation').onclick=paRunCorrelation;paRefreshSources()
}
function paRefreshSources(){
  const sources=paSources(),profiles=paProfileSources(),box=document.getElementById('paTools');if(box)box.style.display='';try{refreshGeneralAnalysisHost()}catch{}const opts=paOpts();for(const id of ['paRateSource','paEnergyA','paEnergyB','paCorrA','paCorrB']){const el=document.getElementById(id);if(!el)continue;const old=el.value;el.innerHTML=opts;if([...el.options].some(o=>o.value===old))el.value=old}
  const c=document.getElementById('paEnergyC');if(c){const old=c.value;c.innerHTML='<option value="">'+flUi('None','Ninguno')+'</option>'+opts;if([...c.options].some(o=>o.value===old))c.value=old}
  const b=document.getElementById('paEnergyB'),cy=document.getElementById('paCorrB');if(b&&b.options.length>1&&!b.value)b.selectedIndex=1;if(cy&&cy.options.length>1&&!cy.value)cy.selectedIndex=1;
  const gs=document.getElementById('paGradientSource'),gb=document.getElementById('paGradientBlock');if(gb)gb.style.display='';if(gs){const old=gs.value;gs.innerHTML=paProfileOpts()||'<option value="">—</option>';if([...gs.options].some(o=>o.value===old))gs.value=old}
  if(!sources.length){
    for(const id of ['paRateStatus','paEnergyStatus','paCorrStatus'])flSetIssue(id,'analysis-source-missing',{analysis:'Physical Analysis',expected:'At least one compatible temporal series'});
  }else{
    for(const id of ['paRateStatus','paEnergyStatus','paCorrStatus'])flClearIssue(id);
  }
  if(!profiles.length)flSetIssue('paGradientStatus','analysis-source-missing',{analysis:'Spatial Gradient',expected:'At least one compatible spatial profile'});
  else flClearIssue('paGradientStatus')
}
function paInit(){
  paBuildUi();
  document.addEventListener('foamlens-language-change',()=>{const box=document.getElementById('paTools');if(box)flApplyBilingualText(box);paRefreshSources();for(const id of ['paRateStatus','paGradientStatus','paEnergyStatus','paCorrStatus']){const el=document.getElementById(id);if(el)el.textContent='' }});try{const previous=refreshDatasetControls;refreshDatasetControls=function(...args){const x=previous.apply(this,args);setTimeout(paRefreshSources,0);return x}}catch{}
  window.FoamLensPhysicalAnalysis={paDerivative,paSpatialDerivative,paCoordinateScaleToMetres,paDimensionsShiftLength,paSourceProvenance,paTrapezoidIntegral,paWeightedSum,paPearson,paSpearman,paCorrelation}
}
paInit();
