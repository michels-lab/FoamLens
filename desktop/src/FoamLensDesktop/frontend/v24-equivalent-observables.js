/* FoamLens Granada: 2D/3D measured-observable comparator.
 * User-designated dimensionality != a geometrically verified mesh dimension.
 * No field/cell-wise subtraction between unrelated OpenFOAM meshes.
 */
/* FOAMLENS_EQUIVALENT_OBSERVABLES_CORE_START */
function eoNumber(raw){
  if(typeof raw==='number')return Number.isFinite(raw)?raw:NaN;
  if(typeof raw!=='string'||!raw.trim()||!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(raw.trim()))return NaN;
  const n=Number(raw);return Number.isFinite(n)?n:NaN
}
function eoPairs(series){
  const t=series?.t||[],y=series?.y||[],pairs=[];
  for(let i=0;i<Math.min(t.length,y.length);i++){
    const a=eoNumber(t[i]),b=eoNumber(y[i]);
    if(Number.isFinite(a)&&Number.isFinite(b))pairs.push({t:a,y:b})
  }
  pairs.sort((a,b)=>a.t-b.t);const unique=[];
  for(const p of pairs){
    if(unique.length&&Math.abs(unique.at(-1).t-p.t)<=1e-10*Math.max(1,Math.abs(p.t),Math.abs(unique.at(-1).t))){
      unique[unique.length-1]=p
    }else unique.push(p)
  }
  return unique
}
function eoUnitInfo(unit){
  const orig=String(unit||'').trim(),lower=orig.toLowerCase().replace(/[\s°]/g,'');
  if(['k','kelvin'].includes(lower))return{canonical:'K',transform:y=>y};
  if(['c','degc','celsius','℃'].includes(lower))return{canonical:'K',transform:y=>y+273.15};
  if(['pa','pascal','pascals'].includes(lower))return{canonical:'Pa',transform:y=>y};
  if(lower==='kpa')return{canonical:'Pa',transform:y=>y*1000};
  if(lower==='mpa')return{canonical:'Pa',transform:y=>y*1e6};
  if(lower==='w')return{canonical:'W',transform:y=>y};
  if(lower==='kw')return{canonical:'W',transform:y=>y*1000};
  if(['-','1','dimensionless'].includes(lower))return{canonical:'1',transform:y=>y};
  if(!orig)return null;
  return{canonical:orig,transform:y=>y}
}
function eoEligible(s){
  return !!s&&!s.derived&&s.datasetType==='timeseries'&&Number.isFinite(Number(s.caseId))&&
    eoPairs(s).length>=2&&!!String(s.sourcePath||s.fileName||'').trim()&&!!String(s.field?.unit||'').trim()
}
function eoDescriptor(s){
  return {
    caseId:Number(s.caseId),caseName:String(s.caseName||''),field:String(s.field?.canonical||s.field?.original||''),
    unit:String(s.field?.unit||''),dimensions:String(s.field?.dimensions||''),
    sourcePath:String(s.sourcePath||s.fileName||''),probe:String(s.probe?.name||s.probe?.label||s.location||''),
    column:String(s.postProcessing?.column||''),
    measured:!s.derived&&s.datasetType==='timeseries',sampleCount:eoPairs(s).length
  }
}
function eoInterpolate(pairs,t){
  if(pairs.length<2||t<pairs[0].t||t>pairs.at(-1).t)return null;
  let lo=0,hi=pairs.length-1;
  while(lo<=hi){
    const k=(lo+hi)>>1,v=pairs[k].t;
    if(v===t||Math.abs(v-t)<=1e-12*Math.max(1,Math.abs(v),Math.abs(t)))
      return{value:pairs[k].y,status:'measured',support:[v]};
    if(v<t)lo=k+1;else hi=k-1
  }
  if(lo<=0||lo>=pairs.length)return null;
  const left=pairs[lo-1],right=pairs[lo],dt=right.t-left.t;
  if(dt<=0)return null;
  return{value:left.y+(right.y-left.y)*(t-left.t)/dt,status:'interpolated',support:[left.t,right.t]}
}
function eoSampleGrid(a,b,maxPoints=1500){
  const lo=Math.max(a[0].t,b[0].t),hi=Math.min(a.at(-1).t,b.at(-1).t);
  if(!(hi>lo))return{valid:false,range:null,times:[]};
  const raw=[lo,hi,...a.filter(p=>p.t>=lo&&p.t<=hi).map(p=>p.t),...b.filter(p=>p.t>=lo&&p.t<=hi).map(p=>p.t)].sort((x,y)=>x-y);
  const unique=[];for(const t of raw){if(!unique.length||Math.abs(t-unique.at(-1))>1e-10*Math.max(1,Math.abs(t)))unique.push(t)}
  const n=Math.max(2,Math.min(1500,Math.floor(Number(maxPoints)||1500)));
  if(unique.length<=n)return{valid:true,range:[lo,hi],times:unique};
  const sampled=[];for(let i=0;i<n;i++){
    const t=unique[Math.round(i*(unique.length-1)/(n-1))];
    if(!sampled.length||t!==sampled.at(-1))sampled.push(t)
  }
  return{valid:true,range:[lo,hi],times:sampled}
}
function eoCompare(a,b,config={}){
  // Config describes user-provided observational equivalence, NOT 2D/3D certification.
  const reject=(reason)=>({valid:false,reason,rows:[],metrics:null,noExtrapolation:true});
  if(!eoEligible(a)||!eoEligible(b))return reject('Two distinct, measured, unit-labeled time series with at least two physical samples are required.');
  if(Number(a.caseId)===Number(b.caseId))return reject('Select two distinct OpenFOAM cases; do not relabel one case as 2D and 3D.');
  const dA=eoDescriptor(a),dB=eoDescriptor(b);
  if(dA.dimensions&&dB.dimensions&&dA.dimensions!==dB.dimensions)
    return reject('Incompatible OpenFOAM dimensional exponents; cannot compare.');
  const uA=eoUnitInfo(dA.unit),uB=eoUnitInfo(dB.unit);
  if(!uA||!uB||uA.canonical!==uB.canonical)return reject('Incompatible or absent unit conversion. No field difference computed.');
  const quantity=String(config.observable||'').trim(),basis=String(config.basis||'').trim(),
    mapping=String(config.mapping||'').trim(),confirmed=config.confirmed===true;
  if(!quantity||!['physical-point','regional-mean','normalized-integral','explicit-other'].includes(basis)||!mapping||!confirmed)
    return reject('Explicit observable, spatial equivalence basis, location/mapping note and user confirmation are required.');
  if(mapping.length<8)return reject('Provide a meaningful physical location or normalization/mapping statement.');
  const pA=eoPairs(a),pB=eoPairs(b),grid=eoSampleGrid(pA,pB,config.maxPoints);
  if(!grid.valid||grid.times.length<2)return reject('No shared physical-time interval with two distinct times; no extrapolation permitted.');
  const rows=[];
  for(const t of grid.times){
    const x=eoInterpolate(pA,t),y=eoInterpolate(pB,t);
    if(!x||!y)continue;
    const value2d=uA.transform(x.value),value3d=uB.transform(y.value),delta=value3d-value2d;
    if(![value2d,value3d,delta].every(Number.isFinite))continue;
    rows.push({t,value2d,value3d,delta,source2d:x.status,source3d:y.status,support2d:x.support,support3d:y.support})
  }
  if(rows.length<2)return reject('Insufficient finite paired measurements within physical-time overlap.');
  let total=0,totalAbs=0,totalSquared=0,maxAbs=0;
  for(const r of rows){total+=r.delta;totalAbs+=Math.abs(r.delta);totalSquared+=r.delta*r.delta;maxAbs=Math.max(maxAbs,Math.abs(r.delta))}
  const n=rows.length;
  return{
    valid:true,schema:'foamlens/equivalent-observable-comparison/1',
    source2d:dA,source3d:dB,designation:'2D/3D labels are user-declared, not verified from mesh topology',
    observable:quantity,spatialBasis:basis,spatialMappingNote:mapping,confirmedByUser:true,
    unit:uA.canonical,range:{start:rows[0].t,end:rows.at(-1).t},rows,
    metrics:{n,mae:totalAbs/n,rmse:Math.sqrt(totalSquared/n),bias3dMinus2d:total/n,maxAbs,
      nativePairs:rows.filter(r=>r.source2d==='measured'&&r.source3d==='measured').length,
      interpolationPairs:rows.filter(r=>r.source2d!=='measured'||r.source3d!=='measured').length},
    methods:{temporalAlignment:'union of source physical times, linear interpolation only INSIDE shared coverage',
      spatialAlignment:'owner-specified observable/location equivalence; no cell-to-cell interpolation',
      noExtrapolation:true,noFieldSubtraction:true,noCaseMutation:true},
    limitations:[
      'The 2D/3D dimensionality and spatial equivalence are supplied by the user, not verified geometrically.',
      'Equal field units do not prove equal physical sensor positions, volume normalization, patch orientation or model assumptions.',
      'Interpolation is temporal, never spatial. No unrelated cell/face values were subtracted.',
      'Sampled pairs may be temporally correlated; statistical metrics do not certify model convergence or experimental accuracy.'
    ]
  }
}
/* FOAMLENS_EQUIVALENT_OBSERVABLES_CORE_END */

function eoUi(en,es){try{return typeof flUi==='function'?flUi(en,es):en}catch{return en}}
function eoEsc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
let eoLast=null,eoCatalog=[];
function eoSelect(id){return document.getElementById(id)}
function eoCatalogItems(){
  const usable=(Array.isArray(series)?series:[]).map((s,i)=>({s,i})).filter(x=>{
    // Normalize only the dataset type; actual field timestamps/units/source remain untouched.
    if(typeof datasetTypeOf==='function'&&datasetTypeOf(x.s)!=='timeseries')return false;
    return eoEligible({...x.s,datasetType:'timeseries'})
  });
  return usable
}
function eoRefresh(){
  const a=eoSelect('eoSource2d'),b=eoSelect('eoSource3d');
  if(!a||!b)return;
  const previousCatalog=eoCatalog,selected=[a,b].map(el=>el.value===''?null:previousCatalog[Number(el.value)]?.s||null);
  eoCatalog=eoCatalogItems();
  // A refreshed source list must never silently rebind an old selector index
  // to a different physical dataset after imports/retries.
  eoLast=null;eoSelect('eoReport').textContent='';
  eoSelect('eoExportJson').disabled=true;eoSelect('eoExportCsv').disabled=true;
  const canvas=eoSelect('eoPlot'),ctx=canvas?.getContext?.('2d');if(ctx)ctx.clearRect(0,0,canvas.width,canvas.height);
  const labels=eoCatalog.map((x,i)=>{
    const d=eoDescriptor({...x.s,datasetType:'timeseries'});
    const name=(caseById(Number(d.caseId))?.name||d.caseName||('Case '+d.caseId));
    return '<option value="'+i+'">'+eoEsc(name+' · '+(d.field||'measured output')+
      ' ['+d.unit+'] · '+(d.probe||d.column||d.sourcePath.split(/[\\/]/).at(-1))+' ('+d.sampleCount+' samples)')+'</option>'
  });
  a.innerHTML='<option value="">Select measured 2D-case observable</option>'+labels.join('');
  b.innerHTML='<option value="">Select measured 3D-case observable</option>'+labels.join('');
  [a,b].forEach((el,i)=>{
    const original=selected[i];if(!original)return;
    const match=eoCatalog.findIndex(x=>x.s===original||
      (original.id!=null&&x.s.id===original.id&&
       Number(x.s.caseId)===Number(original.caseId)&&
       String(x.s.sourcePath||x.s.fileName||'')===String(original.sourcePath||original.fileName||'')));
    if(match>=0)el.value=String(match)
  });
  const status=eoSelect('eoStatus');
  if(status)status.textContent=eoUi('Eligible measured time series: ','Series temporales medidas elegibles: ')+eoCatalog.length+
    eoUi('. Cases must differ; 2D/3D and equivalent position are explicitly supplied by you.','. Los casos deben diferir; tú designas 2D/3D y posición equivalente.');
}
function eoRun(){
  eoLast=null;
  const a=eoCatalog[Number(eoSelect('eoSource2d')?.value)]?.s,b=eoCatalog[Number(eoSelect('eoSource3d')?.value)]?.s;
  if(!a||!b||eoSelect('eoSource2d').value===''||eoSelect('eoSource3d').value===''){
    eoSelect('eoStatus').textContent='Select both measured source series first.';return
  }
  const config={observable:eoSelect('eoObservable').value,basis:eoSelect('eoBasis').value,
    mapping:eoSelect('eoMapping').value,confirmed:eoSelect('eoConfirm').checked,
    maxPoints:Number(eoSelect('eoPoints').value)};
  const result=eoCompare({...a,datasetType:'timeseries'},{...b,datasetType:'timeseries'},config);
  const area=eoSelect('eoReport'),status=eoSelect('eoStatus');
  if(!result.valid){area.textContent='';status.textContent=result.reason;eoSelect('eoExportJson').disabled=true;eoSelect('eoExportCsv').disabled=true;return}
  eoLast=result;
  const fmt=n=>Number(n).toLocaleString(undefined,{maximumSignificantDigits:7});
  status.textContent=eoUi('Comparison uses ','Comparación con ')+result.metrics.n+
    eoUi(' paired samples. Verified data sources; observational equivalence is user-declared.',' pares. Datos de origen reales; la equivalencia observacional la declara el usuario.');
  area.innerHTML='<div class="extInfo"><b>2D / 3D · '+eoEsc(result.observable)+'</b> · '+eoEsc(result.unit)+
    ' · '+eoEsc(result.range.start)+'–'+eoEsc(result.range.end)+' s</div>'+
    '<div class="extTableWrap"><table><thead><tr><th>Pairs</th><th>MAE</th><th>RMSE</th><th>Bias (3D−2D)</th><th>Max |Δ|</th><th>Both source-native</th><th>Interpolated pairs</th></tr></thead><tbody><tr>'+
    [result.metrics.n,fmt(result.metrics.mae),fmt(result.metrics.rmse),fmt(result.metrics.bias3dMinus2d),
      fmt(result.metrics.maxAbs),result.metrics.nativePairs,result.metrics.interpolationPairs].map(x=>'<td>'+eoEsc(x)+'</td>').join('')+
    '</tr></tbody></table></div>'+
    '<p class="smallnote">'+eoEsc(result.spatialMappingNote)+' · '+eoEsc(result.limitations.join(' '))+'</p>';
  eoDraw(result);eoSelect('eoExportJson').disabled=false;eoSelect('eoExportCsv').disabled=false
}
function eoInvalidate(){
  // A prior result is no longer attributable to newly selected source or settings.
  eoLast=null;const report=eoSelect('eoReport');if(report)report.textContent='';
  for(const id of ['eoExportJson','eoExportCsv']){const button=eoSelect(id);if(button)button.disabled=true}
  const canvas=eoSelect('eoPlot'),ctx=canvas?.getContext?.('2d');
  if(ctx)ctx.clearRect(0,0,canvas.width,canvas.height);
  const status=eoSelect('eoStatus');if(status)status.textContent=eoUi(
    'Comparison inputs changed. Recalculate before exporting.',
    'Cambiaste los datos de comparación. Recalcula antes de exportar.')
}
function eoDraw(result){
  const canvas=eoSelect('eoPlot');if(!canvas||!result?.rows?.length)return;
  const width=Math.max(280,canvas.clientWidth||700),height=230,ratio=Math.min(2,window.devicePixelRatio||1);
  canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
  const c=canvas.getContext('2d');if(!c)return;c.setTransform(ratio,0,0,ratio,0,0);
  c.clearRect(0,0,width,height);const pad={l:53,t:24,r:14,b:34};
  let vMin=Math.min(...result.rows.flatMap(r=>[r.value2d,r.value3d])),vMax=Math.max(...result.rows.flatMap(r=>[r.value2d,r.value3d]));
  if(vMax===vMin){vMin-=1;vMax+=1}
  const tMin=result.range.start,tMax=result.range.end,px=t=>pad.l+(t-tMin)/(tMax-tMin)*(width-pad.l-pad.r),
    py=v=>pad.t+(vMax-v)/(vMax-vMin)*(height-pad.t-pad.b);
  c.strokeStyle='#8998ac';c.beginPath();c.moveTo(pad.l,pad.t);c.lineTo(pad.l,height-pad.b);c.lineTo(width-pad.r,height-pad.b);c.stroke();
  const draw=(key,color)=>{c.strokeStyle=color;c.lineWidth=2;c.beginPath();result.rows.forEach((r,i)=>{if(i)c.lineTo(px(r.t),py(r[key]));else c.moveTo(px(r.t),py(r[key]))});c.stroke()};
  draw('value2d','#48b7e8');draw('value3d','#f0bb61');
  c.fillStyle='#b7c1cc';c.font='12px sans-serif';c.fillText(tMin.toPrecision(4)+' s',pad.l,height-10);
  c.fillText(tMax.toPrecision(4)+' s',width-pad.r-65,height-10);
  c.fillText('2D',pad.l+15,15);c.fillStyle='#f0bb61';c.fillText('3D',pad.l+55,15);
}
function eoDownload(filename,content,type){
  if(typeof downloadText==='function'){downloadText(filename,content,type);return}
  const url=URL.createObjectURL(new Blob([content],{type})),link=document.createElement('a');
  link.href=url;link.download=filename;document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1200)
}
function eoExport(type){
  if(!eoLast)return;
  if(type==='json')eoDownload('FoamLens_2D_3D_observables.json',
    JSON.stringify({...eoLast,exportedAt:new Date().toISOString()},null,2),'application/json');
  else {
    const r=eoLast,header='time_s,source_2D,source_3D,delta_3D_minus_2D,2D_sample_kind,3D_sample_kind';
    const csv=[header,...r.rows.map(v=>[v.t,v.value2d,v.value3d,v.delta,v.source2d,v.source3d].join(','))].join('\n')+'\n';
    eoDownload('FoamLens_2D_3D_observables.csv',csv,'text/csv')
  }
}
function eoInstall(){
  const host=document.getElementById('paTools');
  if(!host||eoSelect('eoPanel'))return;
  const el=document.createElement('details');el.id='eoPanel';el.className='extSection';
  el.innerHTML='<summary><b data-fl-en="2D ↔ 3D · Equivalent measured observables" data-fl-es="2D ↔ 3D · Observables medidos equivalentes">2D ↔ 3D · Equivalent measured observables</b></summary>'+
  '<div class="extSectionBody"><p class="smallnote">Compares SOURCE-BACKED time-series measurements from different cases; no mesh-cell differences. 2D/3D status and physical sensor/region equivalence are USER-DECLARED and cannot be certified by this tool.</p>'+
  '<div class="extGrid2"><div class="field"><label>2D case · measured source</label><select id="eoSource2d"></select></div>'+
  '<div class="field"><label>3D case · measured source</label><select id="eoSource3d"></select></div></div>'+
  '<div class="extGrid2"><div class="field"><label>Equivalent observable / physical quantity</label><input id="eoObservable" placeholder="e.g. T at thermocouple TC-1" maxlength="120"></div>'+
  '<div class="field"><label>Spatial basis</label><select id="eoBasis"><option value="">Select explicit basis</option><option value="physical-point">Matched physical sensor/location</option><option value="regional-mean">Equivalent region-averaged observable</option><option value="normalized-integral">Comparable normalized integral</option><option value="explicit-other">Other explicitly justified observable</option></select></div></div>'+
  '<div class="field"><label>Physical location, region, normalisation and/or mapping justification</label><textarea id="eoMapping" rows="2" maxlength="900" placeholder="For example: both probe points correspond to X=0.12, Y=0.05, Z=midplane in meters; describe any coordinate projection"></textarea></div>'+
  '<div class="extGrid2"><div class="field"><label>Maximum time samples (union inside overlap)</label><input id="eoPoints" type="number" min="2" max="1500" value="800"></div>'+
  '<label class="extCheck"><input type="checkbox" id="eoConfirm"> I verified that both observations represent a physically equivalent quantity and spatial basis.</label></div>'+
  '<div class="extActions"><button id="eoRefresh" type="button" class="btn soft">Refresh measured sources</button>'+
  '<button id="eoCalculate" type="button" class="btn primary">Compare measured curves</button>'+
  '<button id="eoExportJson" type="button" class="btn soft" disabled>Export evidence JSON</button>'+
  '<button id="eoExportCsv" type="button" class="btn soft" disabled>Export aligned CSV</button></div>'+
  '<p id="eoStatus" class="smallnote" aria-live="polite"></p><canvas id="eoPlot" style="width:100%;height:230px;max-width:100%" aria-label="Measured source observations over shared physical time"></canvas>'+
  '<div id="eoReport"></div><p class="smallnote">No extrapolation. Interpolation is temporal only. A comparison does NOT demonstrate 2D/3D geometrical equivalence, solver convergence or solidification mechanisms.</p></div>';
  host.appendChild(el);
  el.addEventListener('toggle',()=>{if(el.open)eoRefresh()});
  eoSelect('eoRefresh').onclick=eoRefresh;eoSelect('eoCalculate').onclick=eoRun;
  eoSelect('eoExportJson').onclick=()=>eoExport('json');eoSelect('eoExportCsv').onclick=()=>eoExport('csv');
  for(const id of ['eoSource2d','eoSource3d','eoBasis','eoConfirm','eoPoints','eoObservable','eoMapping']){
    const input=eoSelect(id);
    if(input)input.addEventListener(['eoObservable','eoMapping','eoPoints'].includes(id)?'input':'change',eoInvalidate)
  }
  window.addEventListener('resize',()=>{if(eoLast&&el.open)eoDraw(eoLast)});
  try{if(typeof flApplyBilingualText==='function')flApplyBilingualText(el)}catch{}
  eoRefresh()
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',eoInstall,{once:true});else eoInstall();
window.FoamLensEquivalentObservables={compare:eoCompare,descriptor:eoDescriptor};
