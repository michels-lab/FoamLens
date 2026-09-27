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
/* FOAMLENS_PHYSICAL_ANALYSIS_CORE_END */

function paSources(){return (typeof series!=='undefined'&&Array.isArray(series)?series:[]).filter(s=>{try{return datasetTypeOf(s)==='timeseries'&&taFinitePairs(s).length>=2}catch{return Array.isArray(s?.t)&&Array.isArray(s?.y)&&s.t.length>=2}})}
function paLabel(s){try{return taSeriesLabel(s)}catch{return String(s?.name||s?.label||'Series')}}
function paFind(id){const src=paSources();return src.find((s,i)=>String(s.id??i)===String(id))}
function paOpts(){return paSources().map((s,i)=>`<option value="${String(s.id??i).replace(/"/g,'&quot;')}">${paLabel(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')}</option>`).join('')}
function paFmt(v){return Number.isFinite(Number(v))?Number(v).toLocaleString(undefined,{maximumSignificantDigits:7}):'—'}
function paAddSeries(base,name,t,y,metadata={}){
  const d={...base,id:'pa_'+Date.now()+'_'+Math.random().toString(36).slice(2,7),name,label:name,t:t.slice(),y:y.slice(),derived:true,derivedKind:'physicalDerived',sourceKind:'derived',sourcePath:'FoamLens physical analysis',visible:true,hidden:false,checked:true,enabled:true,field:{...(base?.field||{}),canonical:'derived:'+name,raw:name,name,displayName:name},physicalAnalysis:metadata};
  series.push(d);activeId=d.id;try{refreshDatasetControls();renderList();updateMeta();setDataView('timeseries')}catch(e){console.warn('Physical derived series refresh failed',e)}return d
}
function paRateConfig(){
  const mode=document.getElementById('paRateMode')?.value||'derivative';
  if(mode==='cooling')return{sign:-1,label:'Cooling Rate',formula:'−dφ/dt',interpretation:'User-selected cooling-rate transform'};
  if(mode==='solidificationLiquid')return{sign:-1,label:'Solidification Rate',formula:'−dαL/dt',interpretation:'User-selected liquid-fraction transform'};
  if(mode==='solidificationSolid')return{sign:1,label:'Solidification Rate',formula:'dαS/dt',interpretation:'User-selected solid-fraction transform'};
  if(mode==='negative')return{sign:-1,label:'Negative time derivative',formula:'−dφ/dt',interpretation:'Generic negative physical-time derivative'};
  return{sign:1,label:'Time derivative',formula:'dφ/dt',interpretation:'Generic physical-time derivative'}
}
function paCreateRate(){
  const s=paFind(document.getElementById('paRateSource')?.value);if(!s)return;const cfg=paRateConfig(),d=paDerivative(s.t,s.y,cfg.sign),name=`${cfg.label}: ${paLabel(s)}`;
  paAddSeries(s,name,d.t,d.y,{operation:'physical-time-derivative',formula:cfg.formula,source:paLabel(s),explicitUserRole:true,noMechanismInference:true});
  document.getElementById('paRateStatus').textContent=`Added ${name}. Derivative uses physical time, including nonuniform timesteps.`
}
function paEnergySources(){return ['paEnergyA','paEnergyB','paEnergyC'].map(id=>paFind(document.getElementById(id)?.value)).filter(Boolean)}
function paRunEnergy(){
  const all=['paEnergyA','paEnergyB','paEnergyC'].map((id,i)=>({s:paFind(document.getElementById(id)?.value),c:Number(document.getElementById(['paCoeffA','paCoeffB','paCoeffC'][i])?.value)})).filter(x=>x.s&&Number.isFinite(x.c));
  const out=document.getElementById('paEnergyStatus');if(all.length<2){out.textContent='Choose at least two temporal terms.';return}
  const aligned=taAlignSeries(all.map(x=>x.s),{mode:'common',method:'linear',maxPoints:2500});if(!aligned.valid){out.textContent='The selected terms have no shared physical-time interval; no extrapolation was performed.';return}
  const net=paWeightedSum(aligned.series.map(x=>x.y),all.map(x=>x.c)),integ=paTrapezoidIntegral(aligned.grid,net,0),terms=all.map(x=>({source:paLabel(x.s),coefficient:x.c}));
  const base=all[0].s,n1='Net balance: '+terms.map(x=>`${x.coefficient>=0?'+':''}${x.coefficient}×${x.source}`).join(' ');
  paAddSeries(base,n1,aligned.grid,net,{operation:'weighted-energy-power-balance',terms,alignment:{mode:'common',method:'linear',range:aligned.range,noExtrapolation:true}});
  paAddSeries(base,'Cumulative integral of '+n1,integ.t,integ.y,{operation:'trapezoidal-time-integral',source:n1,terms,alignment:{mode:'common',method:'linear',range:aligned.range,noExtrapolation:true}});
  out.textContent=`Added net balance and cumulative time integral over ${paFmt(aligned.range.start)}–${paFmt(aligned.range.end)} s. FoamLens did not assume which sign is physically positive; coefficients came from you.`
}
function paRunCorrelation(){
  const A=paFind(document.getElementById('paCorrA')?.value),B=paFind(document.getElementById('paCorrB')?.value),out=document.getElementById('paCorrStatus');if(!A||!B||A===B){out.textContent='Choose two different temporal series.';return}
  const aligned=taAlignSeries([A,B],{mode:'common',method:'linear',maxPoints:1800});if(!aligned.valid){out.textContent='No common physical-time range.';return}
  const c=paCorrelation(aligned.series[0].y,aligned.series[1].y);out.textContent=`n = ${c.count} · Pearson = ${paFmt(c.pearson)} · Spearman = ${paFmt(c.spearman)}. Correlation is descriptive and is not treated as causation.`;paDrawScatter(c.points,A,B)
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
  if(document.getElementById('paTools'))return;const host=document.getElementById('differenceTools')||document.querySelector('.analysisTools')||document.body,box=document.createElement('div');box.id='paTools';box.className='detailBlock';box.style.marginTop='10px';
  box.innerHTML=`<div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><b>General Physical Analysis</b><span class="badge">derived</span></div>
  <div class="smallnote" style="margin-top:5px">Derived quantities are explicit transforms of selected data. FoamLens does not infer nucleation, recalescence, dominance, or causality from these operations.</div>
  <hr style="border:0;border-top:1px solid var(--line);margin:10px 0"><b>Physical-time rate</b>
  <div class="field"><label>Source</label><select id="paRateSource"></select></div>
  <div class="field"><label>Transform</label><select id="paRateMode"><option value="derivative">dφ/dt</option><option value="negative">−dφ/dt</option><option value="cooling">Cooling Rate (−dT/dt)</option><option value="solidificationLiquid">Solidification Rate (−dαL/dt)</option><option value="solidificationSolid">Solidification Rate (dαS/dt)</option></select></div>
  <button class="btn primary" id="paCreateRate" type="button">Create rate series</button><div class="smallnote" id="paRateStatus"></div>
  <hr style="border:0;border-top:1px solid var(--line);margin:10px 0"><b>Energy / power balance</b>
  <div class="smallnote">Choose temporal power/flux/integral terms and set their signs explicitly. FoamLens will not label a quantity “total energy” unless your selected terms define it.</div>
  <div class="row2"><div class="field"><label>Term A</label><select id="paEnergyA"></select></div><div class="field"><label>Coefficient</label><input id="paCoeffA" type="number" value="1" step="any"></div></div>
  <div class="row2"><div class="field"><label>Term B</label><select id="paEnergyB"></select></div><div class="field"><label>Coefficient</label><input id="paCoeffB" type="number" value="-1" step="any"></div></div>
  <div class="row2"><div class="field"><label>Term C (optional)</label><select id="paEnergyC"><option value="">None</option></select></div><div class="field"><label>Coefficient</label><input id="paCoeffC" type="number" value="1" step="any"></div></div>
  <button class="btn primary" id="paRunEnergy" type="button">Create balance + integral</button><div class="smallnote" id="paEnergyStatus"></div>
  <hr style="border:0;border-top:1px solid var(--line);margin:10px 0"><b>Scatter / correlation</b>
  <div class="row2"><div class="field"><label>X</label><select id="paCorrA"></select></div><div class="field"><label>Y</label><select id="paCorrB"></select></div></div>
  <button class="btn primary" id="paRunCorrelation" type="button">Analyze correlation</button><div class="smallnote" id="paCorrStatus"></div><canvas id="paScatter" style="width:100%;height:220px;margin-top:7px"></canvas>`;
  host.appendChild(box);document.getElementById('paCreateRate').onclick=paCreateRate;document.getElementById('paRunEnergy').onclick=paRunEnergy;document.getElementById('paRunCorrelation').onclick=paRunCorrelation;paRefreshSources()
}
function paRefreshSources(){
  const opts=paOpts();for(const id of ['paRateSource','paEnergyA','paEnergyB','paCorrA','paCorrB']){const el=document.getElementById(id);if(!el)continue;const old=el.value;el.innerHTML=opts;if([...el.options].some(o=>o.value===old))el.value=old}
  const c=document.getElementById('paEnergyC');if(c){const old=c.value;c.innerHTML='<option value="">None</option>'+opts;if([...c.options].some(o=>o.value===old))c.value=old}
  const b=document.getElementById('paEnergyB'),cy=document.getElementById('paCorrB');if(b&&b.options.length>1&&!b.value)b.selectedIndex=1;if(cy&&cy.options.length>1&&!cy.value)cy.selectedIndex=1
}
function paInit(){
  paBuildUi();try{const previous=refreshDatasetControls;refreshDatasetControls=function(...args){const x=previous.apply(this,args);setTimeout(paRefreshSources,0);return x}}catch{}
  window.FoamLensPhysicalAnalysis={paDerivative,paTrapezoidIntegral,paWeightedSum,paPearson,paSpearman,paCorrelation}
}
paInit();
