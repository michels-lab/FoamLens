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
  // SI prefixes are CASE-SENSITIVE. Previously toLowerCase() interpreted
  // mW (milliequivalent) as MW, and mPa as MPa: a billion-fold error.
  if(typeof unit!=='string'||!unit.trim())return null;
  const orig=unit.trim(),lower=orig.toLowerCase(),u=(canonical,factor=1,offset=0)=>
    ({canonical,transform:y=>y*factor+offset});
  const explicit={
    K:['K',1],Pa:['Pa',1],mPa:['Pa',1e-3],kPa:['Pa',1e3],MPa:['Pa',1e6],
    W:['W',1],mW:['W',1e-3],kW:['W',1e3],MW:['W',1e6],
    J:['J',1],mJ:['J',1e-3],kJ:['J',1e3],MJ:['J',1e6]
  };
  if(Object.prototype.hasOwnProperty.call(explicit,orig)){
    const [unitCanonical,factor]=explicit[orig];return u(unitCanonical,factor)
  }
  if(lower==='kelvin')return u('K');
  if(['°c','c','degc','celsius','℃'].includes(lower))return u('K',1,273.15);
  if(['pascal','pascals'].includes(lower))return u('Pa');
  if(['-','1','dimensionless'].includes(lower))return u('1');
  // Do not silently treat a misspelled prefix or letter casing as an
  // unrelated exact unit: e.g. "mw" could be milliwatts OR megawatts.
  if(['k','pa','mpa','kpa','w','mw','kw','j','mj','kj'].includes(lower))return null;
  // Unrecognized scientific units are comparable only when their original
  // exact unit label is identical; NEVER infer a conversion factor.
  return u(orig)
}
function eoCaseId(value){
  if(typeof value!=='number'&&typeof value!=='string')return null;
  const text=String(value).trim();
  if(!/^(?:0|[1-9]\d*)$/.test(text))return null;
  const id=Number(text);return Number.isSafeInteger(id)?id:null
}
function eoCompleteMeasuredTimes(s){
  // A comparison claiming measured source provenance must never discard a
  // missing value, unmatched timestamp, or duplicate physical time and still
  // report a deceptively complete RMSE/MAE. Check before eoPairs normalizes.
  const times=s?.t,values=s?.y;
  if(!Array.isArray(times)||!Array.isArray(values)||times.length!==values.length||times.length<2)
    return false;
  const parsed=times.map(eoNumber);
  if(parsed.some(x=>!Number.isFinite(x))||values.some(x=>!Number.isFinite(eoNumber(x))))
    return false;
  const ordered=parsed.slice().sort((a,b)=>a-b);
  for(let i=1;i<ordered.length;i++){
    if(Math.abs(ordered[i]-ordered[i-1])<=1e-10*Math.max(1,Math.abs(ordered[i]),Math.abs(ordered[i-1])))
      return false
  }
  return true
}
function eoEligible(s){
  return !!s&&!s.derived&&s.datasetType==='timeseries'&&eoCaseId(s.caseId)!==null&&
    eoCompleteMeasuredTimes(s)&&eoPairs(s).length>=2&&
    !!String(s.sourcePath||s.fileName||'').trim()&&!!String(s.field?.unit||'').trim()
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
function eoSampleGrid(a,b,maxPoints=20000){
  // Scientific metrics must include every unique source-time knot. The old
  // "maximum samples" silently DECIMATED original times, deleting brief
  // recalescence/temperature peaks and reporting biased RMSE as complete.
  if(!a?.length||!b?.length)return{valid:false,reason:'Missing original source times',range:null,times:[]};
  const lo=Math.max(a[0].t,b[0].t),hi=Math.min(a.at(-1).t,b.at(-1).t);
  if(!(hi>lo))return{valid:false,reason:'No physical-time overlap',range:null,times:[]};
  const raw=[lo,hi];
  // Do not spread large measured arrays into a function argument list.
  for(const list of [a,b])for(const p of list)if(p.t>=lo&&p.t<=hi)raw.push(p.t);
  raw.sort((x,y)=>x-y);
  const unique=[];for(const t of raw){
    if(!unique.length||Math.abs(t-unique.at(-1))>1e-10*Math.max(1,Math.abs(t)))unique.push(t)
  }
  const requested=eoNumber(maxPoints);
  if(!Number.isSafeInteger(requested)||requested<2||requested>100000)
    return{valid:false,reason:'Maximum source time knots must be an integer from 2 to 100000.',
      range:[lo,hi],times:[],sourcePoints:unique.length,notDecimated:true};
  const limit=requested;
  if(unique.length>limit)return{
    valid:false,reason:'Source time grid has '+unique.length+
      ' genuine knots, exceeding '+limit+' allowed. Increase the explicit maximum (up to 100000); no measured frames were silently discarded.',
    range:[lo,hi],times:[],sourcePoints:unique.length,maxPoints:limit,notDecimated:true
  };
  return{valid:true,range:[lo,hi],times:unique,
    sourcePoints:unique.length,maxPoints:limit,notDecimated:true}
}
// Time-weighted errors over the piecewise-linear aligned difference curve.
// Do not conflate unequal time spacing with a uniformly sampled experiment.
function eoDurationMetrics(rows){
  const duration=rows.at(-1)?.t-rows[0]?.t;
  if(!(duration>0)||!Number.isFinite(duration))return null;
  let scale=0;for(const r of rows)scale=Math.max(scale,Math.abs(r.delta));
  if(!Number.isFinite(scale))return null;
  let signed=0,absolute=0,square=0,positive=0,negative=0,zero=0,maxIndex=0;
  for(let i=0;i<rows.length;i++){
    if(Math.abs(rows[i].delta)>Math.abs(rows[maxIndex].delta))maxIndex=i;
    if(!i)continue;
    const a=rows[i-1],b=rows[i],dt=b.t-a.t,w=dt/duration;
    if(!(dt>0)||!Number.isFinite(w))return null;
    const x=scale?a.delta/scale:0,y=scale?b.delta/scale:0;
    signed+=w*(x+y)/2;square+=w*(x*x+x*y+y*y)/3;
    if(x===0&&y===0){zero+=w;continue}
    if(x>=0&&y>=0){positive+=w;absolute+=w*(x+y)/2}
    else if(x<=0&&y<=0){negative+=w;absolute-=w*(x+y)/2}
    else{
      const frac=Math.abs(x)/(Math.abs(x)+Math.abs(y));
      absolute+=w*(Math.abs(x)*frac+Math.abs(y)*(1-frac))/2;
      positive+=w*(x>0?frac:1-frac);negative+=w*(x<0?frac:1-frac)
    }
  }
  const bias=signed*scale,mae=absolute*scale,rmse=Math.sqrt(Math.max(0,square))*scale;
  const finiteOrNull=n=>Number.isFinite(n)?n:null;
  return{duration_s:duration,bias3dMinus2d:finiteOrNull(bias),mae:finiteOrNull(mae),
    rmse:finiteOrNull(rmse),signedDifferenceIntegral:finiteOrNull(bias*duration),
    absoluteDifferenceIntegral:finiteOrNull(mae*duration),
    aboveDuration_s:positive*duration,belowDuration_s:negative*duration,equalDuration_s:zero*duration,
    maxAbsTime_s:rows[maxIndex].t,maxAbsSignedDelta:rows[maxIndex].delta,
    method:'Exact integration of the piecewise-linear aligned difference, not additional measured source frames'}
}
function eoCompare(a,b,config={}){
  // Config describes user-provided observational equivalence, NOT 2D/3D certification.
  const reject=(reason)=>({valid:false,reason,rows:[],metrics:null,noExtrapolation:true});
  if(!eoEligible(a)||!eoEligible(b))return reject('Two distinct, measured, unit-labeled time series with complete unique physical times and at least two samples are required. Missing/nonfinite/duplicate original measurements cannot be silently discarded.');
  if(eoCaseId(a.caseId)===eoCaseId(b.caseId))return reject('Select two distinct OpenFOAM cases; do not relabel one case as 2D and 3D.');
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
  // Validate original measurements across the full source duration: a
  // negative-K sample outside the overlap cannot be hidden in a valid RMSE.
  if((uA.canonical==='K'&&a.y.some(y=>uA.transform(eoNumber(y))<0))||
     (uB.canonical==='K'&&b.y.some(y=>uB.transform(eoNumber(y))<0)))
    return reject('Temperature below physical absolute zero (0 K) in original source, including outside overlap.');
  const pA=eoPairs(a),pB=eoPairs(b),grid=eoSampleGrid(pA,pB,config.maxPoints);
  if(!grid.valid||grid.times.length<2)return reject(grid.reason||'No shared physical-time interval with two distinct times; no extrapolation permitted.');
  const rows=[];
  for(const t of grid.times){
    const x=eoInterpolate(pA,t),y=eoInterpolate(pB,t);
    if(!x||!y)continue;
    const value2d=uA.transform(x.value),value3d=uB.transform(y.value),delta=value3d-value2d;
    if(![value2d,value3d,delta].every(Number.isFinite))return reject('Non-finite transformed physical measurement; scientific comparison cannot omit this knot.');
    if(uA.canonical==='K'&&(value2d<0||value3d<0))return reject('A source temperature is below physical absolute zero (0 K).');
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
    durationMetrics:eoDurationMetrics(rows),
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
// Export evidence is valid only for unchanged original imported measurements.
// Serialize for same-session equality, never export this internal fingerprint.
function eoSourceFingerprint(s){
  if(!eoEligible(s))return null;
  return JSON.stringify({descriptor:eoDescriptor(s),times:s.t,values:s.y})
}
/* FOAMLENS_EQUIVALENT_OBSERVABLES_CORE_END */

function eoUi(en,es){try{return typeof flUi==='function'?flUi(en,es):en}catch{return en}}
function eoEsc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
let eoLast=null,eoBound=null,eoCatalog=[],eoCursor=0,eoFrom=0,eoTo=0,eoPlotMode='curves';
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
  eoInvalidate();eoSelect('eoReport').textContent='';
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
  eoLast=null;eoBound=null;
  const a=eoCatalog[Number(eoSelect('eoSource2d')?.value)]?.s,b=eoCatalog[Number(eoSelect('eoSource3d')?.value)]?.s;
  if(!a||!b||eoSelect('eoSource2d').value===''||eoSelect('eoSource3d').value===''){
    eoSelect('eoStatus').textContent='Select both measured source series first.';return
  }
  const config={observable:eoSelect('eoObservable').value,basis:eoSelect('eoBasis').value,
    mapping:eoSelect('eoMapping').value,confirmed:eoSelect('eoConfirm').checked,
    maxPoints:eoNumber(eoSelect('eoPoints').value)};
  const result=eoCompare({...a,datasetType:'timeseries'},{...b,datasetType:'timeseries'},config);
  const area=eoSelect('eoReport'),status=eoSelect('eoStatus');
  if(!result.valid){eoInvalidate();area.textContent='';status.textContent=result.reason;return}
  eoLast=result;
  eoBound={
    a,b,
    source2d:eoSourceFingerprint({...a,datasetType:'timeseries'}),
    source3d:eoSourceFingerprint({...b,datasetType:'timeseries'}),
    input:JSON.stringify(config),
    index2d:eoSelect('eoSource2d').value,index3d:eoSelect('eoSource3d').value
  };
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
  eoMountInspector(result);eoDraw(result);eoSelect('eoExportJson').disabled=false;eoSelect('eoExportCsv').disabled=false
}
function eoInvalidate(){
  // A prior result is no longer attributable to newly selected source or settings.
  eoLast=null;eoBound=null;const report=eoSelect('eoReport');if(report)report.textContent='';
  for(const id of ['eoExportJson','eoExportCsv']){const button=eoSelect(id);if(button)button.disabled=true}
  const inspector=eoSelect('eoInspector');if(inspector){inspector.hidden=true;inspector.textContent=''}
  const canvas=eoSelect('eoPlot'),ctx=canvas?.getContext?.('2d');
  if(ctx)ctx.clearRect(0,0,canvas.width,canvas.height);
  const status=eoSelect('eoStatus');if(status)status.textContent=eoUi(
    'Comparison inputs changed. Recalculate before exporting.',
    'Cambiaste los datos de comparación. Recalcula antes de exportar.')
}
function eoFmt(value){return Number.isFinite(value)?Number(value.toPrecision(7)).toString():'—'}
function eoWindowRows(result){return result.rows.slice(eoFrom,eoTo+1)}
function eoMountInspector(result){
  const host=eoSelect('eoInspector');if(!host)return;
  eoFrom=0;eoTo=result.rows.length-1;eoCursor=0;eoPlotMode='curves';host.hidden=false;
  const tr=(a,b)=>eoEsc(eoUi(a,b)),n=result.rows.length;
  host.innerHTML='<div style="display:grid;gap:10px;padding:12px;border:1px solid var(--line);border-radius:10px;background:var(--panel2);min-width:0">'+
    '<b>'+tr('Comparison workbench','Comparador interactivo')+'</b>'+
    '<div class="extGrid2"><div class="field"><label for="eoViewMode">'+tr('Plot','Gráfica')+'</label><select id="eoViewMode"><option value="curves">'+tr('Aligned curves','Curvas alineadas')+'</option><option value="difference">'+tr('Difference (3D − 2D)','Diferencia (3D − 2D)')+'</option></select></div>'+
    '<div class="field"><label for="eoSampleCursor">'+tr('Aligned sample','Muestra alineada')+'</label><input id="eoSampleCursor" style="width:100%" type="range" min="0" max="'+(n-1)+'" step="1" value="0"></div></div>'+
    '<div class="extGrid2"><div class="field"><label for="eoWindowStart">'+tr('Start physical time [s]','Tiempo físico inicial [s]')+'</label><input type="number" step="any" id="eoWindowStart" value="'+result.range.start+'"></div>'+
    '<div class="field"><label for="eoWindowEnd">'+tr('End physical time [s]','Tiempo físico final [s]')+'</label><input type="number" step="any" id="eoWindowEnd" value="'+result.range.end+'"></div></div>'+
    '<div class="extActions"><button class="btn soft" type="button" id="eoWindowApply">'+tr('Apply window','Aplicar intervalo')+'</button><button class="btn soft" type="button" id="eoWindowReset">'+tr('Full overlap','Solapamiento completo')+'</button>'+
    '<button class="btn soft" type="button" id="eoJumpPeak">'+tr('Go to maximum |Δ|','Ir al máximo |Δ|')+'</button></div>'+
    '<div id="eoWindowStatus" class="smallnote" aria-live="polite"></div><div id="eoSampleReadout" style="display:grid;gap:6px;overflow-wrap:anywhere" aria-live="polite"></div>'+
    '<div id="eoDurationReadout" style="display:grid;gap:6px;overflow-wrap:anywhere"></div>'+
    '<p class="smallnote" style="margin:0">'+tr('Window metrics integrate the aligned piecewise-linear difference in time. JSON and CSV still export the complete aligned comparison, not just the displayed window.','Las métricas del intervalo integran la diferencia alineada lineal por tramos en el tiempo. JSON y CSV siguen exportando toda la comparación alineada, no solo el intervalo visible.')+'</p></div>';
  const jump=i=>{if(eoLast!==result)return;eoCursor=Math.max(eoFrom,Math.min(eoTo,i));eoSelect('eoSampleCursor').value=String(eoCursor);eoDraw(result)};
  const apply=(lo,hi)=>{
    if(eoLast!==result)return;
    if(!Number.isFinite(lo)||!Number.isFinite(hi)||lo>=hi){eoSelect('eoWindowStatus').textContent=eoUi('Enter a finite increasing interval.','Introduce un intervalo finito creciente.');return}
    let a=0,b=n;while(a<b){const m=(a+b)>>1;if(result.rows[m].t<lo)a=m+1;else b=m}
    const first=a;b=n;while(a<b){const m=(a+b)>>1;if(result.rows[m].t<=hi)a=m+1;else b=m}
    if(a-first<2){eoSelect('eoWindowStatus').textContent=eoUi('At least two aligned time knots are required.','Se requieren al menos dos tiempos alineados.');return}
    eoFrom=first;eoTo=a-1;
    const cursor=eoSelect('eoSampleCursor');cursor.min=String(eoFrom);cursor.max=String(eoTo);
    eoSelect('eoWindowStart').value=String(result.rows[eoFrom].t);
    eoSelect('eoWindowEnd').value=String(result.rows[eoTo].t);jump(eoCursor)
  };
  eoSelect('eoViewMode').onchange=e=>{eoPlotMode=e.target.value;eoDraw(result)};
  eoSelect('eoSampleCursor').oninput=e=>jump(Number(e.target.value));
  eoSelect('eoWindowApply').onclick=()=>apply(eoNumber(eoSelect('eoWindowStart').value),eoNumber(eoSelect('eoWindowEnd').value));
  eoSelect('eoWindowReset').onclick=()=>apply(result.range.start,result.range.end);
  eoSelect('eoJumpPeak').onclick=()=>{let k=eoFrom;for(let i=eoFrom+1;i<=eoTo;i++)if(Math.abs(result.rows[i].delta)>Math.abs(result.rows[k].delta))k=i;jump(k)}
}
function eoInspectorReadout(result,rows){
  if(!eoSelect('eoSampleReadout'))return;
  const row=result.rows[eoCursor],d=eoDurationMetrics(rows),tr=(a,b)=>eoEsc(eoUi(a,b));
  const box=(label,value,sub='')=>'<div style="padding:8px;border:1px solid var(--line);border-radius:8px;background:var(--panel)"><span class="smallnote">'+eoEsc(label)+'</span><div style="font-size:16px;font-weight:700">'+eoEsc(value)+'</div><span class="smallnote">'+eoEsc(sub)+'</span></div>';
  const source=(kind,ts)=>eoUi(kind==='measured'?'Measured':'Interpolated',kind==='measured'?'Medido':'Interpolado')+' · '+ts.map(String).join(' / ')+' s';
  const cards=(items)=>'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(165px,100%),1fr));gap:6px">'+items.join('')+'</div>';
  eoSelect('eoWindowStatus').textContent=rows.length+' '+eoUi('aligned knots','tiempos alineados')+' · '+rows[0].t+'–'+rows.at(-1).t+' s';
  eoSelect('eoSampleReadout').innerHTML=cards([
    box(eoUi('Physical time','Tiempo físico'),String(row.t)+' s'),
    box('2D',String(row.value2d)+' '+result.unit,source(row.source2d,row.support2d)),
    box('3D',String(row.value3d)+' '+result.unit,source(row.source3d,row.support3d)),
    box('Δ 3D−2D',String(row.delta)+' '+result.unit)]);
  eoSelect('eoDurationReadout').innerHTML=d?'<b>'+tr('Time-weighted errors — selected window','Errores ponderados por tiempo — intervalo seleccionado')+'</b>'+cards([
    box('RMSE',eoFmt(d.rmse)+' '+result.unit),
    box('MAE',eoFmt(d.mae)+' '+result.unit),
    box(eoUi('Bias','Sesgo'),eoFmt(d.bias3dMinus2d)+' '+result.unit),
    box(eoUi('Peak difference','Diferencia máxima'),eoFmt(d.maxAbsSignedDelta)+' '+result.unit,eoFmt(d.maxAbsTime_s)+' s'),
    box(eoUi('Absolute difference integral','Integral de diferencia absoluta'),eoFmt(d.absoluteDifferenceIntegral)+' '+result.unit+'·s'),
    box(eoUi('3D above / below 2D','3D superior / inferior a 2D'),eoFmt(d.aboveDuration_s)+' / '+eoFmt(d.belowDuration_s)+' s',eoUi('Equal: ','Igual: ')+eoFmt(d.equalDuration_s)+' s')]):tr('Duration metrics unavailable.','Métricas temporales no disponibles.')
}
function eoDraw(result){
  const canvas=eoSelect('eoPlot');if(!canvas||!result?.rows?.length)return;
  const rows=eoWindowRows(result),difference=eoPlotMode==='difference',keys=difference?['delta']:['value2d','value3d'];
  if(rows.length<2)return;
  const width=Math.max(280,canvas.clientWidth||700),height=300,ratio=Math.min(2,window.devicePixelRatio||1);
  canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);canvas.style.height=height+'px';
  const c=canvas.getContext('2d');if(!c)return;c.setTransform(ratio,0,0,ratio,0,0);
  c.clearRect(0,0,width,height);const pad={l:86,t:26,r:20,b:43},w=width-pad.l-pad.r,h=height-pad.t-pad.b;
  let vMin=difference?0:Infinity,vMax=difference?0:-Infinity;
  for(const row of rows)for(const k of keys){vMin=Math.min(vMin,row[k]);vMax=Math.max(vMax,row[k])}
  const tMin=rows[0].t,tMax=rows.at(-1).t,ys=Math.max(Math.abs(vMin),Math.abs(vMax),Number.MIN_VALUE);
  const yn0=vMin/ys,yn1=vMax/ys,ts=Math.max(Math.abs(tMin),Math.abs(tMax),Number.MIN_VALUE),tn0=tMin/ts,tn1=tMax/ts;
  const px=t=>pad.l+(tn0===tn1?.5:(t/ts-tn0)/(tn1-tn0))*w,
    py=v=>pad.t+(yn0===yn1?.5:(yn1-v/ys)/(yn1-yn0))*h;
  const blend=(a,b,q)=>a*(1-q)+b*q;
  c.font='11px system-ui,sans-serif';c.fillStyle='#9daab9';
  for(let i=0;i<=4;i++){
    const q=i/4,x=pad.l+q*w,y=pad.t+q*h;
    c.strokeStyle='rgba(140,155,175,.24)';c.beginPath();c.moveTo(pad.l,y);c.lineTo(width-pad.r,y);c.moveTo(x,pad.t);c.lineTo(x,height-pad.b);c.stroke();
    c.textAlign='right';c.fillText(eoFmt(blend(vMax,vMin,q)),pad.l-6,y+3);
    c.textAlign='center';c.fillText(eoFmt(blend(tMin,tMax,q)),x,height-pad.b+16)
  }
  c.strokeStyle='#8998ac';c.beginPath();c.moveTo(pad.l,pad.t);c.lineTo(pad.l,height-pad.b);c.lineTo(width-pad.r,height-pad.b);c.stroke();
  if(difference){c.strokeStyle='#9daab9';c.setLineDash([5,4]);c.beginPath();c.moveTo(pad.l,py(0));c.lineTo(width-pad.r,py(0));c.stroke();c.setLineDash([])}
  const draw=(key,color)=>{c.strokeStyle=color;c.lineWidth=2;c.beginPath();rows.forEach((r,i)=>{if(i)c.lineTo(px(r.t),py(r[key]));else c.moveTo(px(r.t),py(r[key]))});c.stroke()};
  const colors=difference?['#bd9cf5']:['#48b7e8','#f0bb61'];
  keys.forEach((k,i)=>draw(k,colors[i]));
  const cursor=result.rows[eoCursor],x=px(cursor.t);
  c.strokeStyle='#d1d5db';c.lineWidth=1;c.setLineDash([4,4]);c.beginPath();c.moveTo(x,pad.t);c.lineTo(x,height-pad.b);c.stroke();c.setLineDash([]);
  keys.forEach((k,i)=>{c.fillStyle=colors[i];c.beginPath();c.arc(x,py(cursor[k]),4,0,Math.PI*2);c.fill()});
  c.textAlign='left';c.fillStyle=colors[0];c.fillText(difference?'Δ 3D−2D':'2D',pad.l,16);
  if(!difference){c.fillStyle=colors[1];c.fillText('3D',pad.l+44,16)}
  c.fillStyle='#9daab9';c.textAlign='right';c.fillText(result.unit,width-pad.r,16);c.textAlign='center';c.fillText('time [s]',pad.l+w/2,height-4);
  eoInspectorReadout(result,rows)
}
function eoDownload(filename,content,type){
  if(typeof downloadText==='function'){downloadText(filename,content,type);return}
  const url=URL.createObjectURL(new Blob([content],{type})),link=document.createElement('a');
  link.href=url;link.download=filename;document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1200)
}
function eoExport(type){
  if(!eoLast||!eoBound)return;
  const i=eoSelect('eoSource2d')?.value,j=eoSelect('eoSource3d')?.value;
  const a=eoCatalog[Number(i)]?.s,b=eoCatalog[Number(j)]?.s;
  const config={observable:eoSelect('eoObservable').value,basis:eoSelect('eoBasis').value,
    mapping:eoSelect('eoMapping').value,confirmed:eoSelect('eoConfirm').checked,
    maxPoints:Number(eoSelect('eoPoints').value)};
  if(!a||!b||a!==eoBound.a||b!==eoBound.b||i!==eoBound.index2d||j!==eoBound.index3d||
     JSON.stringify(config)!==eoBound.input||
     eoSourceFingerprint({...a,datasetType:'timeseries'})!==eoBound.source2d||
     eoSourceFingerprint({...b,datasetType:'timeseries'})!==eoBound.source3d){
    eoInvalidate();return
  }
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
  '<div class="extGrid2"><div class="field"><label>Maximum source time knots (no automatic decimation; raise limit for full data)</label><input id="eoPoints" type="number" min="2" max="100000" value="20000"></div>'+
  '<label class="extCheck"><input type="checkbox" id="eoConfirm"> I verified that both observations represent a physically equivalent quantity and spatial basis.</label></div>'+
  '<div class="extActions"><button id="eoRefresh" type="button" class="btn soft">Refresh measured sources</button>'+
  '<button id="eoCalculate" type="button" class="btn primary">Compare measured curves</button>'+
  '<button id="eoExportJson" type="button" class="btn soft" disabled>Export evidence JSON</button>'+
  '<button id="eoExportCsv" type="button" class="btn soft" disabled>Export aligned CSV</button></div>'+
  '<p id="eoStatus" class="smallnote" aria-live="polite"></p><canvas id="eoPlot" style="width:100%;height:230px;max-width:100%" aria-label="Measured source observations over shared physical time"></canvas>'+
  '<div id="eoInspector" hidden></div><div id="eoReport"></div><p class="smallnote">No extrapolation. Interpolation is temporal only. A comparison does NOT demonstrate 2D/3D geometrical equivalence, solver convergence or solidification mechanisms.</p></div>';
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
