/* FoamLens Granada #156 — physical phase/momentum evidence explorer.
 * Read-only query UI for the already-existing Field Mapping, cell alignment,
 * phase classes, unit metadata, pmStats, native OpenFOAM field ingestion.
 */
/* FOAMLENS_PHYSICS_EXPLORER_CORE_START */
const PE_STATS=['count','mean','median','p5','p25','p75','p95','min','max','std'];
const PE_TYPES=['field','phase','momentum'];
const PE_SUBSETS=['whole','liquid','mushy','solid'];
function peFinite(raw){
  if(typeof raw==='number')return Number.isFinite(raw)?raw:NaN;
  if(typeof raw!=='string'||!raw.trim()||!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(raw.trim()))return NaN;
  let n=Number(raw);return Number.isFinite(n)?n:NaN
}
function peUniqueSorted(xs){
  return [...new Set(xs.map(peFinite).filter(Number.isFinite))].sort((a,b)=>a-b)
}
function peDescriptors(c,region,type,mapping={}){
  const rows=(c?.volumeFieldInventory||[]).filter(f=>String(f.region||'')===String(region||'')&&String(f.name||'').trim());
  const groups=new Map();
  for(const r of rows){
    const name=String(r.name),x=groups.get(name)||{name,region:String(region||''),times:[],sources:[],dimensions:new Set(),kind:new Set(),partitions:new Set()};
    x.times.push(r.time);if(r.sourcePath)x.sources.push(r.sourcePath);
    if(r.dimensions)x.dimensions.add(String(r.dimensions));
    if(r.kind)x.kind.add(String(r.kind));
    x.partitions.add(String(r.partition||''));groups.set(name,x)
  }
  // The inventory records only original file paths/time/partition. The independently
  // inspected Discovery field headers carry the authoritative dimensions and kind.
  for(const group of groups.values()){
    const inspected=(c?.discoveryModel?.fields||[]).filter(f=>
      String(f.name||'')===group.name&&String(f.region||'')===group.region);
    for(const metadata of inspected){
      if(metadata.dimensions)group.dimensions.add(String(metadata.dimensions));
      if(metadata.kind)group.kind.add(String(metadata.kind));
    }
  }
  const alpha=String(mapping.liquidFraction||'');
  const momentum=[mapping.velocity,mapping.darcyAcceleration,mapping.buoyancyAcceleration,mapping.pressureGradientAcceleration].filter(Boolean).map(String);
  const phase=[alpha,mapping.solidFraction,mapping.temperature,mapping.coolingRate,mapping.solidificationRate].filter(Boolean).map(String);
  return [...groups.values()].filter(d=>type==='field'||(type==='phase'?phase.includes(d.name):momentum.includes(d.name))).map(d=>({
    name:d.name,region:d.region,times:peUniqueSorted(d.times),sources:[...new Set(d.sources)].slice(0,250),
    dimensions:[...d.dimensions],kinds:[...d.kind],partitions:[...d.partitions],
    role:Object.keys(mapping).find(key=>mapping[key]===d.name)||'unmapped'
  })).sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true}))
}
function peValidate(config,descriptor,alphaDescriptor){
  const fail=reason=>({ok:false,reason});
  if(!PE_TYPES.includes(config?.type))return fail('Choose an explicit analysis type.');
  if(!descriptor||descriptor.name!==String(config.field||'')||descriptor.region!==String(config.region||''))return fail('Selected field not independently found in this case and region.');
  if(!descriptor.times?.length)return fail('No real physical file times for this field.');
  if(!PE_SUBSETS.includes(config.subset))return fail('Unknown phase subset.');
  if(!PE_STATS.includes(config.statistic))return fail('Unsupported source statistic.');
  if(!['value','magnitude','x','y','z'].includes(config.component))return fail('Unsupported vector/scalar component.');
  if(descriptor.kinds.length>1||descriptor.dimensions.length>1)return fail('Field kind or physical dimensions vary across selected sources.');
  const kind=descriptor.kinds[0]||'unknown';
  if(kind==='scalar'&&config.component!=='value')return fail('Scalar field cannot be projected as vector component.');
  if(kind==='vector'&&config.component==='value')return fail('Vector field requires magnitude or X/Y/Z component.');
  if(!['scalar','vector'].includes(kind))return fail('Only known scalar and vector fields can be analyzed here.');
  if(config.subset!=='whole'){
    const lo=peFinite(config.low),hi=peFinite(config.high);
    if(!(lo>=0&&hi<=1&&lo<=hi))return fail('Phase thresholds must satisfy 0 ≤ low ≤ high ≤ 1.');
    if(!alphaDescriptor||alphaDescriptor.region!==descriptor.region||
       alphaDescriptor.region!==String(config.region||'')||
       alphaDescriptor.kinds.length!==1||alphaDescriptor.kinds[0]!=='scalar'||
       !alphaDescriptor.times.length||alphaDescriptor.name==='')return fail('Phase subset needs a genuinely mapped scalar alphaL from the same case and region.');
    if(alphaDescriptor.dimensions.length!==1||alphaDescriptor.dimensions[0]!=='[0 0 0 0 0 0 0]')
      return fail('Liquid-fraction field must have sourced dimensionless OpenFOAM dimensions.');
  }
  return{ok:true,reason:'',kind,unitEvidence:descriptor.dimensions.length===1?'sourced':'missing'};
}
function peAssemble(config,descriptor,samples,stats){
  if(!descriptor)return{ok:false,reason:'No original OpenFOAM source',rows:[]};
  if(!PE_STATS.includes(config.statistic))return{ok:false,reason:'Invalid statistic',rows:[]};
  const rows=[],excluded=[];
  for(const record of samples||[]){
    if(!descriptor.times.some(t=>Math.abs(t-record.time)<=1e-10*Math.max(1,Math.abs(t)))){excluded.push({time:record.time,reason:'not in source files'});continue}
    if(!record.ok){excluded.push({time:record.time,reason:String(record.reason||'missing source')});continue}
    if(!Array.isArray(record.values)||!record.values.length){excluded.push({time:record.time,reason:'no usable aligned cell measurements'});continue}
    const invalid=record.values.filter(x=>!Number.isFinite(peFinite(x))).length;
    if(invalid){excluded.push({time:record.time,reason:invalid+' invalid original cell values (not silently omitted)'});continue}
    const values=record.values.map(peFinite),known=record.countKnown!==false&&Number.isSafeInteger(record.total)&&record.total>=values.length;
    const summary=stats(values,known?record.total:null);
    if(!Number.isFinite(summary[config.statistic])){excluded.push({time:record.time,reason:'statistic unavailable'});continue}
    rows.push({timeS:record.time,statistic:config.statistic,value:summary[config.statistic],
      nCells:known?summary.count:null,sampleValues:values.length,
      totalCells:known?record.total:null,populationKnown:known,
      sources:(record.sources||[]).slice(0,50),issues:record.issues||[],
      estimatesUnweighted:true})
  }
  // A report containing only successfully supplied sample records is not
  // complete unless every distinct actual source-file time was attempted.
  // This catches incomplete caller/abort pipelines without manufacturing
  // points, silently skipping frames or granting a false complete status.
  for(const time of descriptor.times){
    if(!(samples||[]).some(record=>Number.isFinite(peFinite(record.time))&&
       Math.abs(peFinite(record.time)-time)<=1e-10*Math.max(1,Math.abs(time))))
      excluded.push({time,reason:'actual original source time was never sampled'});
  }
  rows.sort((a,b)=>a.timeS-b.timeS);
  const distinct=peUniqueSorted(rows.map(x=>x.timeS));
  if(distinct.length!==rows.length)return{ok:false,reason:'Duplicate source physical time makes evidence ambiguous.',rows:[]};
  if(!rows.length)return{ok:false,reason:'No source-backed physical-time samples could be evaluated.',rows:[],excluded};
  return{ok:true,schema:'foamlens/physics-evidence-explorer/1',
    caseId:config.caseId,caseName:config.caseName||'',type:config.type,field:config.field,
    region:config.region,component:config.component,subset:config.subset,
    thresholds:config.subset==='whole'?null:{low:peFinite(config.low),high:peFinite(config.high)},
    statistic:config.statistic,dimensions:descriptor.dimensions.length===1?descriptor.dimensions[0]:null,
    role:descriptor.role,rows,excluded,
    observations:[
      'Results are unweighted descriptive statistics of the original available cell values, not physical volume-weighted averages.',
      'Physical times correspond to actual source field files. Unavailable times are reported, never interpolated or fabricated.',
      'A liquid/mushy/solid classification reflects the user-configured liquid fraction thresholds, not independently verified phase thermodynamics.',
      'Magnitude or component of mapped momentum fields is a sourced measurement, not proof that Darcy, buoyancy or pressure-gradient term is dominant.',
      'No causal, metallurgical recalescence or global momentum-balance conclusion follows automatically from this report.'
    ],
    interpretation:{status:'not-provided',userText:'',noAutomaticPhysicsInference:true},
    noExtrapolation:true,noCaseMutation:true,sourceBacked:true,
    completion:excluded.length||rows.some(r=>r.issues.length)?'partial-evidence':'sourced-evidence'
  }
}
/* FOAMLENS_PHYSICS_EXPLORER_CORE_END */
function peUi(en,es){try{return typeof flUi==='function'?flUi(en,es):en}catch{return en}}
function peEsc(x){return String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
let peLast=null,peBound=null,peRequest=0,peActiveDescriptors=[];
function peEl(id){return document.getElementById(id)}
function peInvalidate(msg=''){
  peRequest++;peLast=null;peBound=null;
  const b=peEl('peExport');if(b)b.disabled=true;
  const out=peEl('peResult');if(out)out.textContent='';
  const cv=peEl('pePlot'),ctx=cv?.getContext?.('2d');if(ctx)ctx.clearRect(0,0,cv.width,cv.height);
  if(msg&&peEl('peStatus'))peEl('peStatus').textContent=msg
}
function peSelectedCase(){return (Array.isArray(cases)?cases:[]).find(c=>String(c.id)===String(peEl('peCase')?.value))}
function peContext(){
  const c=peSelectedCase(),region=peEl('peRegion')?.value||'',type=peEl('peType')?.value||'field';
  const mapping=c?(typeof fmMappingForRegion==='function'?fmMappingForRegion(c,region):pmMappingForCase(c,region)):{};
  return{c,region,type,mapping}
}
function peOption(value,label){return'<option value="'+peEsc(value)+'">'+peEsc(label)+'</option>'}
function peChoose(el,items,old){
  if(!el)return;el.innerHTML=items.map(([k,v])=>peOption(k,v)).join('');
  if(items.some(([k])=>String(k)===String(old)))el.value=old
}
function peRefresh(type='cases'){
  peInvalidate();
  const all=Array.isArray(cases)?cases:[];
  if(type==='cases'){
    const c=peEl('peCase'),old=c.value;
    peChoose(c,[['','Select real OpenFOAM case'],...all.map(x=>[x.id,x.name||x.id])],old);
    if(!c.value&&all.some(x=>String(x.id)===String(activeContextCaseId)))c.value=String(activeContextCaseId)
  }
  if(type==='cases'||type==='region'){
    const {c}=peContext(),sel=peEl('peRegion'),old=sel.value;
    const regions=c?[...new Set((c.volumeFieldInventory||[]).map(x=>String(x.region||'')))]:[];
    peChoose(sel,[...regions.map(r=>[r,r||'Default region'])],old)
  }
  const {c,region,type:analysis,mapping}=peContext(),sel=peEl('peField'),old=sel.value;
  peActiveDescriptors=c?peDescriptors(c,region,analysis,mapping):[];
  peChoose(sel,peActiveDescriptors.map(d=>[d.name,d.name+' · '+d.role]),old);
  const d=peActiveDescriptors.find(d=>d.name===sel.value),scalar=d?.kinds.length===1&&d.kinds[0]==='scalar',
    comp=peEl('peComponent'),oldComp=comp.value;
  peChoose(comp,scalar?[['value','Scalar value']]:[['magnitude','Vector magnitude'],['x','X'],['y','Y'],['z','Z']],oldComp);
  const hasAlpha=peActiveDescriptors.find(d=>d.name===mapping.liquidFraction)||
    (c?peDescriptors(c,region,'field',mapping).find(d=>d.name===mapping.liquidFraction):null);
  const validAlpha=hasAlpha&&hasAlpha.kinds.length===1&&hasAlpha.kinds[0]==='scalar'&&
    hasAlpha.dimensions.length===1&&hasAlpha.dimensions[0]==='[0 0 0 0 0 0 0]';
  const ss=peEl('peSubset'),selected=ss.value;
  peChoose(ss,[['whole','Whole material domain'],...(validAlpha?[['liquid','Liquid'],['mushy','Mushy'],['solid','Solid']]:[])],selected);
  peEl('peStatus').textContent=c?('Detected '+peActiveDescriptors.length+
    ' distinct real source fields. '+(validAlpha?'Phase subsets available.':'Phase subsets unavailable: map a verified dimensionless liquid fraction.')):
    'Import a real case first. No synthetic fields.'
}
async function peRead(c,descriptor,alpha,config,time){
  const fieldSet=await pmLoadFieldSet(c.id,descriptor.name,time,config.region);
  if(!fieldSet?.length)return{time,ok:false,reason:'source field missing at actual time'};
  const issues=[],records=[];
  if(config.subset==='whole'){
    const aligned=pmAlignedComponents(fieldSet,config.component);
    issues.push(...aligned.issues);
    if(issues.length)return{time,ok:false,reason:'Incomplete or unaligned original partitions: '+issues.join('; ')};
    for(const chunk of aligned.chunks)records.push(...chunk.a);
    if(!aligned.chunks.length)return{time,ok:false,reason:issues.join('; ')||'no aligned source'};
    const known=aligned.chunks.every(x=>x.countKnown!==false);
    if(!known&&config.statistic==='count')return{time,ok:false,reason:'uniform-only field cannot supply known physical cell count'};
    return{time,ok:true,values:records,total:known?records.length:null,countKnown:known,
      sources:fieldSet.map(f=>f.sourcePath).filter(Boolean),issues}
  }
  if(!alpha)return{time,ok:false,reason:'no dimensionless liquid fraction source'};
  if(!alpha.times.some(t=>Math.abs(t-time)<1e-10*Math.max(1,Math.abs(time))))return{time,ok:false,reason:'phase subset alphaL missing at requested physical time'};
  const phaseSet=await pmLoadFieldSet(c.id,alpha.name,time,config.region);
  if(!phaseSet?.length)return{time,ok:false,reason:'phase subset source missing'};
  const aligned=pmAlignedComponents(fieldSet,config.component,phaseSet,'value');
  issues.push(...aligned.issues);
  if(issues.length)return{time,ok:false,reason:'Incomplete or unaligned source/phase partitions: '+issues.join('; ')};
  if(!aligned.chunks.length)return{time,ok:false,reason:'no cell-aligned source'};
  if(aligned.chunks.some(chunk=>chunk.b.some(v=>!Number.isFinite(peFinite(v))||peFinite(v)<0||peFinite(v)>1)))
    return{time,ok:false,reason:'Source liquid fractions outside [0, 1] or non-finite; phase membership cannot be inferred'};
  let total=0;
  for(const chunk of aligned.chunks){
    const selection=pmFilterByPhase(chunk.a,chunk.b,config.subset,config.low,config.high);
    records.push(...selection.values);total+=selection.total
  }
  const known=aligned.chunks.every(x=>x.countKnown!==false);
  return{time,ok:true,values:records,total:known?total:null,countKnown:known,
    sources:[...fieldSet,...phaseSet].map(f=>f.sourcePath).filter(Boolean),issues}
}
function peChart(r){
  const el=peEl('pePlot');if(!el||!r?.rows?.length)return;
  const ctx=el.getContext('2d');if(!ctx)return;
  const width=Math.max(270,el.clientWidth||610),height=215,dpr=Math.min(2,window.devicePixelRatio||1);
  el.width=Math.round(width*dpr);el.height=Math.round(height*dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
  const x0=r.rows[0].timeS,x1=r.rows.at(-1).timeS,ys=r.rows.map(x=>x.value),
    min=Math.min(...ys),max=Math.max(...ys),xmin=48,xmax=width-18,ymin=25,ymax=height-30;
  ctx.strokeStyle='#708399';ctx.beginPath();ctx.moveTo(xmin,ymin);ctx.lineTo(xmin,ymax);ctx.lineTo(xmax,ymax);ctx.stroke();
  const xp=t=>x0===x1?(xmin+xmax)/2:xmin+(t-x0)/(x1-x0)*(xmax-xmin),
    yp=y=>min===max?(ymin+ymax)/2:ymax-(y-min)/(max-min)*(ymax-ymin);
  // Render POINTS ONLY: connecting across missing files would imply an interpolated trajectory.
  ctx.fillStyle='#4ca9db';
  for(const p of r.rows){ctx.beginPath();ctx.arc(xp(p.timeS),yp(p.value),3.4,0,2*Math.PI);ctx.fill()}
  ctx.fillStyle='#aebccc';ctx.font='11px sans-serif';
  ctx.fillText(x0.toPrecision(5)+' s',xmin,height-9);
  ctx.fillText(x1.toPrecision(5)+' s',Math.max(xmin,xmax-85),height-9);
  ctx.fillText('Source points only · no temporal interpolation',xmin+7,15)
}
async function peRun(){
  peInvalidate('Loading source OpenFOAM fields at exact written times…');
  const token=peRequest,{c,region,type,mapping}=peContext();
  if(!c){peEl('peStatus').textContent='Choose a source OpenFOAM case';return}
  const field=peEl('peField').value,d=peActiveDescriptors.find(d=>d.name===field),
    alpha=peDescriptors(c,region,'field',mapping).find(x=>x.name===mapping.liquidFraction),
    cfg={caseId:c.id,caseName:c.name,type,field,region,component:peEl('peComponent').value,
      statistic:peEl('peStatistic').value,subset:peEl('peSubset').value,
      low:peEl('peLow').value,high:peEl('peHigh').value};
  const checked=peValidate(cfg,d,alpha);
  if(!checked.ok){peEl('peStatus').textContent=checked.reason;return}
  const initialInventory=c.volumeFieldInventory,initialModel=c.discoveryModel,
    allTimes=d.times.slice(),limit=600;
  if(allTimes.length>limit){peEl('peStatus').textContent='Over 600 source times. Narrow the case/source before plotting; no hidden truncation.';return}
  const samples=[];
  for(let i=0;i<allTimes.length;i++){
    if(token!==peRequest)return;
    try{samples.push(await peRead(c,d,alpha,cfg,allTimes[i]))}
    catch(e){samples.push({time:allTimes[i],ok:false,reason:String(e?.message||e)})}
    if(i%8===0&&typeof scannerYield==='function')await scannerYield();
  }
  if(token!==peRequest)return;
  if(peSelectedCase()!==c||c.volumeFieldInventory!==initialInventory||
     c.discoveryModel!==initialModel){
    peInvalidate('Case or source inventory changed during analysis. Run again to avoid stale evidence.');return
  }
  const report=peAssemble(cfg,d,samples,pmStats);
  if(!report.ok){peEl('peStatus').textContent=report.reason;return}
  peLast=report;peBound={case:c,inventory:c.volumeFieldInventory,model:c.discoveryModel,
    descriptor:d,mapping,fieldSet:allTimes,alpha:alpha||null,report};
  const fmt=n=>Number(n).toLocaleString(undefined,{maximumSignificantDigits:7});
  peEl('peStatus').textContent=report.rows.length+' source point(s), '+report.excluded.length+
    ' unavailable time(s); observations only, not a physical-mechanism diagnosis.';
  peEl('peResult').innerHTML='<div class="extTableWrap"><table class="extTable"><thead><tr>'+
    ['Physical time [s]','Statistic','Value','Physical cells','Sources'].map(x=>'<th>'+peEsc(x)+'</th>').join('')+
    '</tr></thead><tbody>'+report.rows.map(x=>'<tr>'+
      [fmt(x.timeS),x.statistic,fmt(x.value),x.nCells??'Unknown',x.sources.join(', ')||'Source paths unavailable']
      .map(y=>'<td>'+peEsc(y)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>'+
    (report.excluded.length?'<div class="smallnote">Unavailable times: '+peEsc(report.excluded.map(x=>x.time+': '+x.reason).join('; '))+'</div>':'')+
    '<div class="smallnote"><b>Observations:</b> '+peEsc(report.observations.join(' '))+
    ' <b>Interpretation:</b> not provided; scientific interpretation requires independent physical evidence.</div>';
  peChart(report);peEl('peExport').disabled=false
}
function peExport(){
  if(!peLast||!peBound)return;
  const {c,region,type,mapping}=peContext();
  const current=peDescriptors(c,region,type,mapping).find(x=>x.name===peLast.field);
  if(c!==peBound.case||c.volumeFieldInventory!==peBound.inventory||
      c.discoveryModel!==peBound.model||JSON.stringify(current)!==JSON.stringify(peBound.descriptor)||
      JSON.stringify(mapping)!==JSON.stringify(peBound.mapping)){
    peInvalidate('Source files or Field Mapping changed. Re-run the analysis before export.');return
  }
  const text=JSON.stringify({...peLast,exportedAt:new Date().toISOString()},null,2);
  if(typeof downloadText==='function')downloadText('FoamLens_phase_momentum_evidence.json',text,'application/json');
  else{const u=URL.createObjectURL(new Blob([text],{type:'application/json'})),a=document.createElement('a');
    a.href=u;a.download='FoamLens_phase_momentum_evidence.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1200)}
}
function peInstall(){
  const host=document.getElementById('generalAnalysisModules')||document.getElementById('paTools');
  if(!host||peEl('pePanel'))return;
  const box=document.createElement('details');box.id='pePanel';box.className='detailBlock';
  box.innerHTML='<summary><b data-fl-en="Granada · Phase / Momentum Evidence Explorer" data-fl-es="Granada · Explorador de evidencia de fase y momentum">Granada · Phase / Momentum Evidence Explorer</b></summary>'+
   '<p class="smallnote">Source-backed field statistics. Uses existing Field Mapping and phase classification. No automatic mechanism verdict. Only exact OpenFOAM source-file times.</p>'+
   '<div class="extGrid2"><div class="field"><label>Case</label><select id="peCase"></select></div>'+
   '<div class="field"><label>Analysis type</label><select id="peType"><option value="field">Source field</option><option value="phase">Phase change</option><option value="momentum">Momentum</option></select></div>'+
   '<div class="field"><label>Material region</label><select id="peRegion"></select></div>'+
   '<div class="field"><label>Original mapped variable</label><select id="peField"></select></div>'+
   '<div class="field"><label>Component</label><select id="peComponent"></select></div>'+
   '<div class="field"><label>Spatial subset</label><select id="peSubset"></select></div>'+
   '<div class="field"><label>Statistic</label><select id="peStatistic">'+PE_STATS.map(x=>peOption(x,x)).join('')+'</select></div>'+
   '<div class="field"><label>Original physical source times</label><span class="smallnote">Up to 600 exact field times, no interpolation</span></div>'+
   '<div class="field"><label>Solid / mushy liquid-fraction threshold</label><input id="peLow" type="number" min="0" max="1" step="any" value=".05"></div>'+
   '<div class="field"><label>Mushy / liquid threshold</label><input id="peHigh" type="number" min="0" max="1" step="any" value=".95"></div></div>'+
   '<div class="extActions"><button type="button" class="btn soft" id="peRefresh">Refresh original sources</button>'+
   '<button type="button" class="btn primary" id="peRun">Analyze and plot source statistics</button>'+
   '<button type="button" class="btn soft" id="peExport" disabled>Export auditable JSON</button></div>'+
   '<p id="peStatus" class="smallnote" aria-live="polite"></p><canvas id="pePlot" style="width:100%;height:215px" aria-label="Discrete original OpenFOAM field time statistics"></canvas>'+
   '<div id="peResult"></div>';
  host.appendChild(box);
  peEl('peRefresh').onclick=()=>peRefresh('cases');peEl('peRun').onclick=()=>void peRun();
  peEl('peExport').onclick=peExport;
  for(const [id,scope] of [['peCase','cases'],['peRegion','field'],['peType','field'],['peField','component']]){
    peEl(id).addEventListener('change',()=>peRefresh(scope))
  }
  for(const id of ['peComponent','peSubset','peStatistic','peLow','peHigh'])
    peEl(id).addEventListener(['peLow','peHigh'].includes(id)?'input':'change',
      ()=>peInvalidate('Inputs changed. Re-run source analysis before exporting.'));
  box.addEventListener('toggle',()=>{if(box.open)peRefresh('cases')});
  try{if(typeof flApplyBilingualText==='function')flApplyBilingualText(box)}catch{}
  peRefresh('cases')
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',peInstall,{once:true});else peInstall();
window.FoamLensPhysicsEvidenceExplorer={descriptors:peDescriptors,validate:peValidate,assemble:peAssemble};
