/* FoamLens Desktop v1.3.0 — quantitative spatial-profile differences. */

/* FOAMLENS_SPATIAL_DIFFERENCE_CORE_START */
function sdAlmost(a,b){return Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=1e-10*Math.max(1,Math.abs(a),Math.abs(b))}
function sdPairs(s){
  if(!Array.isArray(s?.t)||!Array.isArray(s?.y)||s.t.length!==s.y.length)return [];
  const out=s.t.map((x,i)=>[sdMNumber(x),sdMNumber(s.y[i])]);
  if(out.some(p=>p.some(v=>!Number.isFinite(v))))return [];
  out.sort((a,b)=>a[0]-b[0]);for(let i=1;i<out.length;i++)if(!(out[i][0]>out[i-1][0]))return [];return out
}
function sdValueAt(p,x){return Number.isFinite(x)?(sdMAt(p,x)?.value??NaN):NaN}
function sdUnion(points,start,end,budget,reference=null){
 const grid=[],append=x=>{if(grid.at(-1)===x)return true;if(grid.length>=budget)return false;grid.push(x);return true};
 if(reference!==null){for(const p of points[reference])if(p[0]>=start&&p[0]<=end&&!append(p[0]))return null;return grid}
 const cursors=points.map(p=>{let i=0,j=p.length;while(i<j){const m=i+Math.floor((j-i)/2);if(p[m][0]<start)i=m+1;else j=m}return i});
 if(!append(start))return null;
 for(;;){let next=end;for(let i=0;i<points.length;i++){const x=points[i][cursors[i]]?.[0];if(x!==undefined&&x<next)next=x}
 if(!append(next))return null;if(next===end)return grid;
 for(let i=0;i<points.length;i++)while(points[i][cursors[i]]?.[0]===next)cursors[i]++}
}
function sdGrid(A,B,mode='common',maxPoints=Infinity){
  const fail=reason=>({valid:false,reason,grid:[]});
  if(!['common','referenceA','referenceB'].includes(mode))return fail('invalid-grid-mode');
  if(maxPoints!==Infinity&&(!Number.isSafeInteger(maxPoints)||maxPoints<2))return fail('invalid-grid-limit');
  const a=sdPairs(A),b=sdPairs(B);if(a.length<2||b.length<2)return fail('invalid-profile-samples');
  const start=Math.max(a[0][0],b[0][0]),end=Math.min(a.at(-1)[0],b.at(-1)[0]);if(!(end>start)||!Number.isFinite(end-start))return fail('no-spatial-overlap');
  const grid=sdUnion([a,b],start,end,maxPoints,mode==='referenceA'?0:mode==='referenceB'?1:null);
  if(!grid)return fail('grid-limit-exceeded');
  if(grid.length<2)return fail('insufficient-shared-coordinates');
  const va=sdMSampleGrid(a,grid).map(q=>q?.value),vb=sdMSampleGrid(b,grid).map(q=>q?.value);
  if(va.some(v=>!Number.isFinite(v))||vb.some(v=>!Number.isFinite(v)))return fail('nonfinite-interpolation');
  return{valid:true,start,end,grid,A:va,B:vb,mode,subsampled:false}
}
function sdPearson(a,b){
 let sx=0,sy=0,n=0;for(let i=0;i<Math.min(a.length,b.length);i++){const x=sdMNumber(a[i]),y=sdMNumber(b[i]);if(Number.isFinite(x)&&Number.isFinite(y)){sx=Math.max(sx,Math.abs(x));sy=Math.max(sy,Math.abs(y));n++}}
 if(n<2||!sx||!sy)return NaN;let mx=0,my=0,dx=0,dy=0,c=0,k=0;
 for(let i=0;i<Math.min(a.length,b.length);i++){const x=sdMNumber(a[i])/sx,y=sdMNumber(b[i])/sy;if(!Number.isFinite(x)||!Number.isFinite(y))continue;k++;const ax=x-mx,ay=y-my;mx+=ax/k;my+=ay/k;dx+=ax*(x-mx);dy+=ay*(y-my);c+=ax*(y-my)}
 return dx>0&&dy>0?Math.max(-1,Math.min(1,c/Math.sqrt(dx)/Math.sqrt(dy))):NaN
}
function sdLengthMetrics(grid,delta){
 const span=grid.at(-1)-grid[0];if(!(span>0)||!Number.isFinite(span)||grid.length!==delta.length)return null;
 let scale=0,peak=0;for(let i=0;i<delta.length;i++){if(!Number.isFinite(delta[i])||(i>0&&!(grid[i]>grid[i-1])))return null;if(Math.abs(delta[i])>scale){scale=Math.abs(delta[i]);peak=i}}
 let abs=0,sq=0,bias=0;
 for(let i=1;i<grid.length;i++){const w=(grid[i]-grid[i-1])/span,a=scale?delta[i-1]/scale:0,b=scale?delta[i]/scale:0,aa=Math.abs(a),bb=Math.abs(b);
 bias+=w*(a+b)/2;sq+=w*(a*a+a*b+b*b)/3;abs+=w*((a<0&&b>0||a>0&&b<0)?(aa*aa+bb*bb)/(2*(aa+bb)):(aa+bb)/2)}
 return{length:span,mae:Math.min(1,abs)*scale,rmse:Math.sqrt(Math.min(1,Math.max(0,sq)))*scale,bias:Math.max(-1,Math.min(1,bias))*scale,maxAbs:scale,maxAbsX:grid[peak],knots:grid.length,method:'piecewise-linear length weighting on selected grid'}
}
function sdMetrics(aligned,epsilon=1e-12){
 if(!aligned?.valid)return{count:0};const d=[],abs=[],relative=[],percent=[],eps=sdMNumber(epsilon);
 if(!Number.isFinite(eps)||eps<0||aligned.A.length!==aligned.grid.length||aligned.B.length!==aligned.grid.length)return{count:0};
 let max=0,im=0;for(let i=0;i<aligned.grid.length;i++){const x=aligned.A[i],y=aligned.B[i],q=x-y;if(![x,y,q,aligned.grid[i]].every(Number.isFinite))return{count:0};d.push(q);abs.push(Math.abs(q));if(Math.abs(q)>max){max=Math.abs(q);im=i}const ratio=Math.abs(y)>eps?q/y:NaN;relative.push(Number.isFinite(ratio)?ratio:NaN);percent.push(Number.isFinite(100*ratio)?100*ratio:NaN)}
 if(!d.length)return{count:0};let sq=0,ma=0,mean=0;for(const v of d){const q=max?v/max:0;sq+=q*q;ma+=Math.abs(q);mean+=q}
 const finiteMean=vs=>{let n=0,scale=0;for(const v of vs)if(Number.isFinite(v)){n++;scale=Math.max(scale,Math.abs(v))}if(!n)return NaN;if(!scale)return 0;let sum=0;for(const v of vs)if(Number.isFinite(v))sum+=v/scale;return scale*(sum/n)};
 return{count:d.length,rmse:max*Math.sqrt(sq/d.length),mae:max*(ma/d.length),maxAbs:max,maxAbsX:aligned.grid[im],meanDifference:max*(mean/d.length),meanRelative:finiteMean(relative),meanPercent:finiteMean(percent),correlation:sdPearson(aligned.A,aligned.B),difference:d,absoluteDifference:abs,relativeDifference:relative,percentDifference:percent,lengthWeighted:sdLengthMetrics(aligned.grid,d)}
}
function sdMNumber(v){if(typeof v==='number')return Number.isFinite(v)?v:NaN;if(typeof v!=='string'||!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(v.trim()))return NaN;return Number.isFinite(Number(v))?Number(v):NaN}
function sdMSource(s){
 if(!s||s.derived||s.derivedKind||s.caseId==null||!String(s.caseId).trim()||!Array.isArray(s.t)||!Array.isArray(s.y)||s.t.length!==s.y.length||s.t.length<2)return null;
 const field=String(s.field?.canonical||s.field?.raw||''),unit=String(s.field?.unit||''),axis=String(s.profileAxis||''),coordinateUnit=String(s.profileCoordUnit||''),source=String(s.sourcePath||s.fileName||'');
 if(!field||!unit||!axis||!coordinateUnit||!source)return null;
 const stored=sdMNumber(s.profileTime),p=s.playbackMeta;let time=stored,kind='stored',support=[stored];
 if(p?.mode==='interpolate'){const a=sdMNumber(p.t1),b=sdMNumber(p.t2),q=sdMNumber(p.requested);if(!(a<q&&q<b)||q!==stored)return null;time=q;support=[a,b];kind='temporal-interpolation'}
 else if(p){if(!['native','nearest'].includes(p.mode))return null;time=sdMNumber(p.used);support=[time];kind=p.mode}
 if(!Number.isFinite(time)||!support.every(Number.isFinite))return null;
 const points=s.t.map((x,i)=>[sdMNumber(x),sdMNumber(s.y[i])]);if(points.some(p=>p.some(v=>!Number.isFinite(v))))return null;
 points.sort((a,b)=>a[0]-b[0]);for(let i=1;i<points.length;i++)if(!(points[i][0]>points[i-1][0]))return null;
 return{points,field,unit,axis,coordinateUnit,source,caseId:String(s.caseId),caseName:String(s.caseName||s.caseId),line:String(s.profileLine||s.profileLineKey||''),dimensions:String(s.field?.dimensions||''),component:String(s.component||s.field?.component||s.profileComponent||''),time,kind,support}
}
function sdMCompatible(a,b){return !!a&&!!b&&a.field===b.field&&a.component===b.component&&a.unit===b.unit&&a.axis===b.axis&&a.coordinateUnit===b.coordinateUnit&&a.time===b.time&&(!a.dimensions||!b.dimensions||a.dimensions===b.dimensions)}
function sdMAt(points,x){
 let lo=0,hi=points.length-1;while(lo<=hi){const m=lo+Math.floor((hi-lo)/2);if(points[m][0]===x)return{value:points[m][1],kind:'source-coordinate'};if(points[m][0]<x)lo=m+1;else hi=m-1}
 if(!lo||lo===points.length)return null;const a=points[lo-1],b=points[lo],span=b[0]-a[0];if(!(span>0)||!Number.isFinite(span))return null;
 const q=(x-a[0])/span,v=a[1]*(1-q)+b[1]*q;return Number.isFinite(v)?{value:v,kind:'spatial-interpolation'}:null
}
function sdMSampleGrid(points,grid){
 let i=0;return grid.map(x=>{while(i+1<points.length&&points[i+1][0]<=x)i++;
 const a=points[i],b=points[i+1];if(a[0]===x)return{value:a[1],kind:'source-coordinate'};
 if(!b||x<a[0])return null;const span=b[0]-a[0];if(!(span>0)||!Number.isFinite(span))return null;
 const q=(x-a[0])/span,v=a[1]*(1-q)+b[1]*q;return Number.isFinite(v)?{value:v,kind:'spatial-interpolation'}:null})
}
function sdMCompare(sources,config={}){
 const fail=reason=>({valid:false,reason});
 if(!Array.isArray(sources)||sources.length<2)return fail('Choose at least two distinct cases.');
 if(config.confirmed!==true||String(config.mapping||'').trim().length<8)return fail('Confirm and describe equivalent physical lines and coordinate origin.');
 const items=sources.map(sdMSource);if(items.some(x=>!x))return fail('Each source requires complete finite unique coordinates, field/coordinate units, source path and physical time.');
 const ref=items[0];if(new Set(items.map(x=>x.caseId)).size!==items.length)return fail('Select only one profile per case.');
 if(items.some(x=>!sdMCompatible(ref,x)))return fail('Field, component, coordinate axis, units and actual used times must match. Nearest samples from other times are not equivalent.');
 let lo=-Infinity,hi=Infinity;for(const item of items){lo=Math.max(lo,item.points[0][0]);hi=Math.min(hi,item.points.at(-1)[0])}if(!(hi>lo)||!Number.isFinite(hi-lo))return fail('No positive shared spatial interval.');
 const limit=sdMNumber(config.limit??20000),sampleBudget=sdMNumber(config.sampleBudget??1000000);
 if(!Number.isSafeInteger(limit)||limit<2||!Number.isSafeInteger(sampleBudget)||sampleBudget<2)return fail('Invalid operational coordinate or aligned-value budget.');
 const budget=Math.min(limit,Math.floor(sampleBudget/items.length));
 if(budget<2)return fail('Aligned-value budget insufficient; raise it. No coordinates discarded.');
 const grid=sdUnion(items.map(x=>x.points),lo,hi,budget);
 if(!grid)return fail('Original coordinates exceed the operational budget; raise it. No coordinates discarded.');
 const values=items.map(item=>sdMSampleGrid(item.points,grid));if(values.some(v=>v.some(p=>!p)))return fail('Nonfinite spatial interpolation; no omitted values.');
 const comparisons=values.slice(1).map((target,i)=>{
 const delta=target.map((p,j)=>p.value-values[0][j].value),m=sdLengthMetrics(grid,delta);if(!m)return null;
 let nativePairs=0;for(let j=0;j<grid.length;j++)if(target[j].kind==='source-coordinate'&&values[0][j].kind==='source-coordinate')nativePairs++;
 return{target:i+1,delta,...m,nativePairs}
 });
 if(comparisons.some(c=>!c||![c.mae,c.rmse,c.bias].every(Number.isFinite)))return fail('Nonfinite error metrics.');
 return{valid:true,schema:'foamlens/multicase-spatial-comparison/1',field:ref.field,unit:ref.unit,axis:ref.axis,coordinateUnit:ref.coordinateUnit,time_s:ref.time,range:{start:lo,end:hi},grid,values,comparisons,subsampled:false,operationalBudget:{coordinates:limit,alignedValues:sampleBudget},sources:items.map(({points,...m})=>({...m,sampleCount:points.length})),mapping:String(config.mapping).trim(),method:'Union of original coordinates within shared domain; linear spatial interpolation; exact length-weighted piecewise-linear errors; target minus reference.',limitations:'User-confirmed line equivalence; temporal support explicitly attributed. No extrapolation, decimation, mesh-cell subtraction or physical-model certification.'}
}

/* FOAMLENS_SPATIAL_DIFFERENCE_CORE_END */

function sdProfileSources(){
  if(typeof currentDataView==='undefined'||currentDataView!=='profile')return[];
  let src=[];try{src=currentViewSeries().filter(s=>datasetTypeOf(s)==='profile'&&s?.derivedKind!=='difference'&&s?.derivedKind!=='spatialQuantitativeDifference')}catch{}
  return src
}
function sdProfileLabel(s){
  const c=(typeof cases!=='undefined'&&Array.isArray(cases))?cases.find(x=>String(x.id)===String(s?.caseId)):null;
  return [c?.name||s?.caseName||flUi('Case','Caso'),s?.profileLine||s?.profileLineKey||'profile',s?.field?.display||s?.field?.canonical||s?.field?.raw||'field'].filter(Boolean).join(' · ')
}
function sdId(s,i){return String(s?.id??('sd'+i))}
function sdFind(id){const src=sdProfileSources();return src.find((s,i)=>sdId(s,i)===String(id))}
function sdFmt(v){return Number.isFinite(sdMNumber(v))?Number(v).toLocaleString(undefined,{maximumSignificantDigits:7}):'—'}
function sdReasonUi(reason){
  const m={'missing profile':'falta un perfil','profile axes differ':'los ejes de los perfiles son distintos','coordinate units differ':'las unidades de coordenada son distintas','variables differ':'las variables son distintas'};
  return diagEs()?(m[String(reason)]||String(reason)):String(reason)
}
let sdLast=null;
function sdPairBinding(A,B,mode,epsilon,budget){return JSON.stringify({A:sdMFingerprint(A),B:sdMFingerprint(B),mode,epsilon,budget})}
function sdPairReset(){sdLast=null;const ex=document.getElementById('sdExport'),out=document.getElementById('sdResult');if(ex)ex.disabled=true;if(out)out.innerHTML=''}
function sdPairSettings(){return{mode:document.getElementById('sdMode')?.value||'common',epsilon:sdMNumber(document.getElementById('sdEpsilon')?.value),budget:sdMNumber(document.getElementById('sdPairLimit')?.value)}}
function sdSamePhysicalKind(A,B){
  if(!A||!B)return{ok:false,reason:'missing profile'};
  if(String(A.profileAxis||'')!==String(B.profileAxis||''))return{ok:false,reason:'profile axes differ'};
  if(String(A.profileCoordUnit||'')!==String(B.profileCoordUnit||''))return{ok:false,reason:'coordinate units differ'};
  const ca=String(A.field?.canonical||A.field?.raw||''),cb=String(B.field?.canonical||B.field?.raw||'');
  if(ca!==cb)return{ok:false,reason:'variables differ'};
  const a=sdMSource(A),b=sdMSource(B);
  if(!a||!b)return{ok:false,reason:'invalid-profile-provenance'};
  if(!sdMCompatible(a,b))return{ok:false,reason:'incompatible-field-units-dimensions-or-actual-time'};
  return{ok:true,time:a.time}
}

let sdMResult=null,sdMBound=null;
const sdMPlotCache=new WeakMap();
const sdMColors=['#38bdf8','#fbbf24','#5eead4','#f472b6','#a78bfa','#fb923c','#a3e635','#f87171'];
function sdME(id){return document.getElementById(id)}
function sdMX(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function sdMClear(msg=''){sdMResult=null;sdMBound=null;if(sdME('sdMOut'))sdME('sdMOut').innerHTML='';if(sdME('sdMStatus'))sdME('sdMStatus').textContent=msg;for(const id of ['sdMJson','sdMCsv'])if(sdME(id))sdME(id).disabled=true}
function sdMConfig(){return{confirmed:sdME('sdMConfirm').checked,mapping:sdME('sdMMapping').value,limit:sdME('sdMLimit').value,sampleBudget:sdME('sdMSampleBudget').value}}
function sdMSelected(){const ids=[sdME('sdA').value,...Array.from(sdME('sdMChoices').querySelectorAll('input:checked'),x=>x.value)];return [...new Set(ids)].map(sdFind)}
function sdMFingerprint(s){return JSON.stringify({caseId:s?.caseId,id:s?.id,source:s?.sourcePath||s?.fileName,field:s?.field,component:s?.component||s?.profileComponent||'',axis:s?.profileAxis,coordinateUnit:s?.profileCoordUnit,line:s?.profileLineKey,time:s?.profileTime,meta:s?.playbackMeta,t:s?.t,y:s?.y})}
function sdMRefresh(src=sdProfileSources()){
 const host=sdME('sdMChoices');if(!host)return;
 const ref=sdME('sdA').value,old=new Set(Array.from(host.querySelectorAll('input:checked'),x=>x.value));
 host.innerHTML=src.map((s,i)=>{const id=sdId(s,i),p=sdMSource(s);if(id===ref)return '';return '<label style="display:flex;gap:7px;align-items:start;border:1px solid var(--line);border-radius:7px;padding:7px;overflow-wrap:anywhere;min-width:0"><input type="checkbox" value="'+sdMX(id)+'" '+(!p?'disabled ':old.has(id)?'checked ':'')+'><span>'+sdMX(sdProfileLabel(s))+' · '+sdMX(p?p.time+' s · '+p.kind:'unavailable')+'</span></label>'}).join('')||'—';
 sdMClear(flUi('Select target cases and compare.','Selecciona casos objetivo y compara.'))
}
function sdMMount(box){
 const el=document.createElement('details');el.id='sdMPanel';el.style.marginTop='12px';
 el.innerHTML='<summary><b data-fl-en="Multi-case spatial comparison" data-fl-es="Comparación espacial multicaso">Multi-case spatial comparison</b></summary>'+
 '<p class="smallnote" data-fl-en="Profile A above is the reference; choose additional distinct cases at the same actual physical time." data-fl-es="El perfil A de arriba es la referencia; elige casos distintos adicionales al mismo tiempo físico real.">Profile A above is the reference; choose additional distinct cases at the same actual physical time.</p>'+
 '<div id="sdMChoices" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(210px,100%),1fr));gap:6px"></div>'+
 '<div class="extActions"><button id="sdMAuto" class="btn soft" type="button" data-fl-en="Select compatible cases" data-fl-es="Seleccionar casos compatibles">Select compatible cases</button><button id="sdMReset" class="btn soft" type="button" data-fl-en="Clear" data-fl-es="Limpiar">Clear</button></div>'+
 '<div class="field"><label data-fl-en="Physical line/location mapping" data-fl-es="Equivalencia de ubicación y línea física">Physical line/location mapping</label><textarea id="sdMMapping" rows="2" maxlength="500"></textarea></div>'+
 '<label class="extCheck"><input type="checkbox" id="sdMConfirm"><span data-fl-en="I confirm equivalent physical lines and coordinate origin." data-fl-es="Confirmo líneas físicas y origen de coordenadas equivalentes.">I confirm equivalent physical lines and coordinate origin.</span></label>'+
 '<div class="field"><label data-fl-en="Maximum coordinates (no decimation)" data-fl-es="Máximo de coordenadas (sin reducir muestras)">Maximum coordinates (no decimation)</label><input id="sdMLimit" type="number" min="2" step="1" value="20000"></div>'+
 '<div class="field"><label data-fl-en="Aligned-value budget (cases × coordinates)" data-fl-es="Presupuesto de valores (casos × coordenadas)">Aligned-value budget (cases × coordinates)</label><input id="sdMSampleBudget" type="number" min="2" step="1" value="1000000"></div>'+
 '<div class="extActions"><button id="sdMRun" class="btn primary" type="button" data-fl-en="Compare all selected cases" data-fl-es="Comparar todos los casos">Compare all selected cases</button><button id="sdMJson" class="btn soft" type="button" disabled>JSON</button><button id="sdMCsv" class="btn soft" type="button" disabled>CSV</button></div>'+
 '<p id="sdMStatus" class="smallnote" aria-live="polite"></p><div id="sdMOut"></div>';
 box.append(el);el.addEventListener('toggle',()=>{if(el.open)sdMRefresh()});
 sdME('sdA').addEventListener('change',()=>sdMRefresh());
 sdME('sdMChoices').addEventListener('change',()=>sdMClear());
 for(const id of ['sdMMapping','sdMConfirm','sdMLimit','sdMSampleBudget'])sdME(id).addEventListener(id==='sdMConfirm'?'change':'input',()=>sdMClear());
 sdME('sdMAuto').onclick=()=>{const a=sdMSource(sdFind(sdME('sdA').value));if(!a)return;const ids=new Set([a.caseId]);for(const el of sdME('sdMChoices').querySelectorAll('input')){const b=sdMSource(sdFind(el.value));el.checked=!el.disabled&&sdMCompatible(a,b)&&!ids.has(b.caseId);if(el.checked)ids.add(b.caseId)}sdMClear()};
 sdME('sdMReset').onclick=()=>{for(const el of sdME('sdMChoices').querySelectorAll('input'))el.checked=false;sdMClear()};
 sdME('sdMRun').onclick=sdMRun;sdME('sdMJson').onclick=()=>sdMExport('json');sdME('sdMCsv').onclick=()=>sdMExport('csv')
}
function sdMRun(){
 sdMClear();const src=sdMSelected(),cfg=sdMConfig(),r=sdMCompare(src,cfg);if(!r.valid){sdME('sdMStatus').textContent=r.reason;return}
 sdMResult=r;sdMBound=JSON.stringify({src:src.map(sdMFingerprint),cfg});sdME('sdMStatus').textContent=r.sources.length+' '+flUi('cases','casos')+' · t='+r.time_s+' s · '+r.grid.length+' '+flUi('coordinates','coordenadas');
 const tr=(a,b)=>sdMX(flUi(a,b));
 sdME('sdMOut').innerHTML='<p class="smallnote">'+tr('Shared domain; target minus reference.','Dominio compartido; objetivo menos referencia.')+' '+sdMX(r.range.start)+'–'+sdMX(r.range.end)+' '+sdMX(r.coordinateUnit)+'</p>'+
 '<div class="field"><label>'+tr('Chart','Gráfica')+'</label><select id="sdMPlotKind"><option value="values">'+tr('Aligned profiles','Perfiles alineados')+'</option><option value="delta">'+tr('Differences','Diferencias')+'</option></select></div><div id="sdMPlot"></div>'+
 '<div class="field"><label>'+tr('Inspect shared coordinate','Inspeccionar coordenada compartida')+'</label><input id="sdMCursor" type="range" min="0" max="'+(r.grid.length-1)+'" value="0" step="1" style="width:100%"></div><div id="sdMReadout" aria-live="polite"></div>'+
 '<div style="display:grid;gap:7px;margin-top:8px">'+r.comparisons.map(c=>'<div style="border:1px solid var(--line);border-radius:8px;padding:8px;overflow-wrap:anywhere"><b>'+sdMX(r.sources[c.target].caseName)+'</b><div class="smallnote">'+tr('Length-weighted errors','Errores ponderados por longitud')+' · MAE '+sdFmt(c.mae)+' · RMSE '+sdFmt(c.rmse)+' · '+tr('Bias','Sesgo')+' '+sdFmt(c.bias)+' '+sdMX(r.unit)+'</div><div class="smallnote">Max |Δ| '+sdFmt(c.maxAbs)+' @ '+sdFmt(c.maxAbsX)+' '+sdMX(r.coordinateUnit)+' · '+tr('Native coordinate pairs','Pares de coordenadas nativas')+' '+c.nativePairs+'/'+r.grid.length+'</div></div>').join('')+'</div><p class="smallnote">'+sdMX(r.limitations)+'</p>';
 sdME('sdMPlotKind').onchange=sdMDraw;sdME('sdMCursor').oninput=sdMDraw;sdME('sdMJson').disabled=false;sdME('sdMCsv').disabled=false;sdMDraw()
}
function sdPreviewIndices(grid,values,width=704){
 if(grid.length<=width*2)return grid.map((_,i)=>i);
 const first=grid[0],span=grid.at(-1)-first,out=[0];let bucket=-1,lo=0,hi=0;
 const flush=()=>{for(const i of lo<hi?[lo,hi]:[hi,lo])if(i>out.at(-1))out.push(i)};
 for(let i=0;i<grid.length;i++){const b=Math.min(width-1,Math.floor((grid[i]-first)/span*width));if(b!==bucket){if(bucket>=0)flush();bucket=b;lo=i;hi=i}else{if(values[i]<values[lo])lo=i;if(values[i]>values[hi])hi=i}}
 flush();if(out.at(-1)!==grid.length-1)out.push(grid.length-1);return out
}
function sdMColor(i){return sdMColors[i%sdMColors.length]}
function sdPlotPrepared(cache,r,delta,width=704){
 let modes=cache.get(r);if(!modes){modes=new Map();cache.set(r,modes)}if(modes.has(delta))return modes.get(delta);
 const curves=delta?r.comparisons.map(c=>({i:c.target,y:c.delta})):r.values.map((v,i)=>({i,y:v.map(p=>p.value)}));
 let min=delta?0:Infinity,max=delta?0:-Infinity;for(const c of curves){for(const v of c.y){min=Math.min(min,v);max=Math.max(max,v)}c.preview=sdPreviewIndices(r.grid,c.y,width)}
 const prepared={curves,min,max};modes.set(delta,prepared);return prepared
}
function sdMDraw(){
 const r=sdMResult;if(!r)return;const cursor=Number(sdME('sdMCursor').value),delta=sdME('sdMPlotKind').value==='delta',{curves,min,max}=sdPlotPrepared(sdMPlotCache,r,delta);
 const W=820,H=280,L=91,R=25,T=28,B=48;
 const scale=Math.max(Math.abs(min),Math.abs(max),Number.MIN_VALUE),mn=min/scale,mx=max/scale,x=v=>L+(v-r.range.start)/(r.range.end-r.range.start)*(W-L-R),y=v=>T+(mn===mx?.5:(mx-v/scale)/(mx-mn))*(H-T-B);
 let ticks='';for(let i=0;i<=4;i++){const q=i/4,px=L+(W-L-R)*q,py=T+(H-T-B)*q;ticks+='<path d="M '+L+' '+py+' H '+(W-R)+' M '+px+' '+T+' V '+(H-B)+'" stroke="#8e9aac" opacity=".22" fill="none"/><text x="'+(L-8)+'" y="'+(py+4)+'" text-anchor="end">'+sdMX(sdFmt(max*(1-q)+min*q))+'</text><text x="'+px+'" y="'+(H-B+17)+'" text-anchor="middle">'+sdMX(sdFmt(r.range.start*(1-q)+r.range.end*q))+'</text>'}
 const at=r.grid[cursor],cx=x(at);
 sdME('sdMPlot').innerHTML='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+sdMX(r.field)+'" style="display:block;width:100%;height:auto;max-height:350px;background:#111827;border-radius:9px" fill="#dbe5ef" font-family="system-ui,sans-serif" font-size="11">'+ticks+'<text x="'+L+'" y="16" font-weight="700">'+sdMX((delta?'Δ ':'')+r.field+' ['+r.unit+']')+'</text>'+
 (delta?'<path d="M '+L+' '+y(0)+' H '+(W-R)+'" stroke="#d1d5db" stroke-dasharray="5 4"/>':'')+
 curves.map(c=>'<polyline fill="none" stroke="'+sdMColor(c.i)+'" stroke-width="2" points="'+c.preview.map(j=>x(r.grid[j]).toFixed(3)+','+y(c.y[j]).toFixed(3)).join(' ')+'"/>').join('')+
 '<path d="M '+cx+' '+T+' V '+(H-B)+'" stroke="#e2e8f0" stroke-dasharray="4 4"/>'+curves.map(c=>'<circle cx="'+cx+'" cy="'+y(c.y[cursor])+'" r="4" fill="'+sdMColor(c.i)+'"/>').join('')+'<text x="'+(W/2)+'" y="'+(H-6)+'" text-anchor="middle">'+sdMX(r.axis+' ['+r.coordinateUnit+']')+'</text></svg><div class="smallnote">'+flUi('Display envelope only; metrics, cursor and export retain all coordinates.','Envolvente solo visual; métricas, cursor y exportación conservan todas las coordenadas.')+'</div><div style="display:flex;flex-wrap:wrap;gap:8px">'+curves.map(c=>'<span style="font-size:12px;overflow-wrap:anywhere"><span style="color:'+sdMColor(c.i)+'">●</span> '+sdMX(r.sources[c.i].caseName)+'</span>').join('')+'</div>';
 sdME('sdMReadout').innerHTML='<b>'+sdMX(r.axis)+' = '+sdMX(at)+' '+sdMX(r.coordinateUnit)+'</b>'+r.sources.map((src,i)=>{const p=r.values[i][cursor];return '<div style="border:1px solid var(--line);border-radius:7px;padding:7px;margin-top:5px;overflow-wrap:anywhere"><b>'+sdMX(src.caseName)+'</b> · '+sdMX(p.value)+' '+sdMX(r.unit)+(i?' · Δ '+sdMX(r.comparisons[i-1].delta[cursor]):' · '+flUi('Reference','Referencia'))+'<div class="smallnote">'+sdMX(p.kind)+' · '+sdMX(src.kind)+' · '+sdMX(src.support.join(' / '))+' s</div></div>'}).join('')
}
function sdMExport(kind){
 const r=sdMResult;if(!r)return;
 if(sdMBound!==JSON.stringify({src:sdMSelected().map(sdMFingerprint),cfg:sdMConfig()})){sdMClear(flUi('Sources or settings changed. Recalculate.','Cambiaron fuentes o ajustes. Recalcula.'));return}
 if(kind==='json'){sdDownload('FoamLens_multicase_spatial_comparison.json',JSON.stringify(r,null,2));return}
 const head=['coordinate','reference_value','reference_spatial_kind',...r.sources.slice(1).flatMap((_,i)=>['case_'+(i+1)+'_value','case_'+(i+1)+'_spatial_kind','case_'+(i+1)+'_minus_reference'])];
 const rows=r.grid.map((x,j)=>[x,r.values[0][j].value,r.values[0][j].kind,...r.comparisons.flatMap(c=>[r.values[c.target][j].value,r.values[c.target][j].kind,c.delta[j]])].join(','));
 const csv=[head.join(','),...rows].join('\n')+'\n';
 if(typeof downloadText==='function')downloadText('FoamLens_multicase_spatial_comparison.csv',csv,'text/csv');else{const url=URL.createObjectURL(new Blob([csv],{type:'text/csv'})),a=document.createElement('a');a.href=url;a.download='FoamLens_multicase_spatial_comparison.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
}

function sdBuildUi(){
  if(document.getElementById('sdTools'))return;const host=document.getElementById('differenceTools');if(!host)return;const box=document.createElement('div');box.id='sdTools';box.className='detailBlock';box.style.marginTop='10px';
  box.innerHTML=`<div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><b data-fl-en="Spatial quantitative comparison" data-fl-es="Comparación cuantitativa espacial">Spatial quantitative comparison</b><span class="badge" data-fl-en="physical X" data-fl-es="X física">physical X</span></div>
  <div class="smallnote" style="margin-top:5px" data-fl-en="Uses the profiles currently rendered at the same physical playback time. Spatial samples are aligned by coordinate, never by array index, and are clipped to their shared spatial range." data-fl-es="Usa los perfiles renderizados actualmente en el mismo tiempo físico de reproducción. Las muestras espaciales se alinean por coordenada, nunca por índice de arreglo, y se recortan a su rango espacial compartido.">Uses the profiles currently rendered at the same physical playback time.</div>
  <div class="field" style="margin-top:8px"><label data-fl-en="Profile A" data-fl-es="Perfil A">Profile A</label><select id="sdA"></select></div>
  <div class="field"><label data-fl-en="Profile B" data-fl-es="Perfil B">Profile B</label><select id="sdB"></select></div>
  <div class="row2"><div class="field"><label data-fl-en="Spatial grid" data-fl-es="Malla espacial">Spatial grid</label><select id="sdMode"><option value="common" selected data-fl-en="Common spatial grid" data-fl-es="Malla espacial común">Common spatial grid</option><option value="referenceA" data-fl-en="Reference A grid" data-fl-es="Malla de referencia A">Reference A grid</option><option value="referenceB" data-fl-en="Reference B grid" data-fl-es="Malla de referencia B">Reference B grid</option></select></div><div class="field"><label data-fl-en="Relative epsilon" data-fl-es="Epsilon relativo">Relative epsilon</label><input id="sdEpsilon" type="number" min="0" step="any" value="1e-12"></div></div>
  <div class="field"><label data-fl-en="Operational coordinate budget (no decimation)" data-fl-es="Presupuesto operativo de coordenadas (sin reducción)">Operational coordinate budget (no decimation)</label><input id="sdPairLimit" type="number" min="2" step="1" value="100000"></div>
  <button class="btn primary" id="sdRun" type="button" data-fl-en="Compare profiles" data-fl-es="Comparar perfiles">Compare profiles</button>
  <button class="btn" id="sdExport" type="button" disabled data-fl-en="Export JSON" data-fl-es="Exportar JSON">Export JSON</button>
  <div class="smallnote" id="sdStatus" style="margin-top:7px"></div><div id="sdResult" style="margin-top:8px"></div>`;
  host.appendChild(box);sdMMount(box);flApplyBilingualText(box);document.getElementById('sdRun').onclick=sdRun;document.getElementById('sdExport').onclick=sdExport;for(const id of ['sdA','sdB','sdMode','sdEpsilon','sdPairLimit'])document.getElementById(id).addEventListener(id==='sdEpsilon'?'input':'change',sdPairReset);sdRefresh()
}
function sdRefresh(){
  const src=sdProfileSources(),box=document.getElementById('sdTools'),a=document.getElementById('sdA'),b=document.getElementById('sdB');if(box)box.style.display='';if(!a||!b)return;
  const oa=a.value,ob=b.value,opts=src.map((s,i)=>`<option value="${sdId(s,i).replace(/"/g,'&quot;')}">${sdProfileLabel(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')}</option>`).join('');a.innerHTML=opts||'<option value="">—</option>';b.innerHTML=opts||'<option value="">—</option>';if([...a.options].some(o=>o.value===oa))a.value=oa;if([...b.options].some(o=>o.value===ob))b.value=ob;if((!ob||b.value===a.value)&&b.options.length>1)b.selectedIndex=1;sdPairReset();
  sdMRefresh(src);
  const st=document.getElementById('sdStatus');if(src.length<2){flSetIssue(st,'at least two spatial profiles are required',{analysis:'Spatial Difference',expected:'Two compatible rendered spatial profiles'});return}flClearIssue(st);if(st)st.textContent=flUi('Ready to compare the selected spatial profiles.','Listo para comparar los perfiles espaciales seleccionados.')
}
function sdRun(){
  sdPairReset();
  const A=sdFind(document.getElementById('sdA')?.value),B=sdFind(document.getElementById('sdB')?.value),st=document.getElementById('sdStatus'),out=document.getElementById('sdResult');if(!A||!B||A===B){flSetIssue(st,'selection-missing',{analysis:'Spatial Difference'});return}flClearIssue(st)
  const compatible=sdSamePhysicalKind(A,B);if(!compatible.ok){flSetIssue(st,compatible.reason,{analysis:'Spatial Difference',field:A?.field?.canonical||''});out.innerHTML='';return}
  const {mode,epsilon,budget}=sdPairSettings();if(!Number.isFinite(epsilon)||epsilon<0){flSetIssue(st,'invalid-relative-epsilon',{analysis:'Spatial Difference'});return}const aligned=sdGrid(A,B,mode,budget);if(!aligned.valid){flSetIssue(st,aligned.reason,{analysis:'Spatial Difference',field:A?.field?.canonical||''});out.innerHTML='';return}
  const m=sdMetrics(aligned,epsilon);if(![m.rmse,m.mae,m.maxAbs,m.meanDifference].every(Number.isFinite)){flSetIssue(st,'nonfinite-error-metrics',{analysis:'Spatial Difference'});return}sdLast={A,B,aligned,metrics:m,epsilon,time:compatible.time,binding:sdPairBinding(A,B,mode,epsilon,budget)};
  const unit=sdMX(A.profileCoordUnit||''),time=compatible.time;
  st.textContent=diagEs()?`Rango espacial compartido ${sdFmt(aligned.start)}–${sdFmt(aligned.end)} ${unit} · ${m.count} muestras alineadas · t ${Number.isFinite(time)?sdFmt(time)+' s':'—'}.`:`Shared spatial range ${sdFmt(aligned.start)}–${sdFmt(aligned.end)} ${unit} · ${m.count} aligned samples · t ${Number.isFinite(time)?sdFmt(time)+' s':'—'}.`;
  out.innerHTML=`<div class="dataCatalogTableWrap"><table class="dataCatalogTable" style="min-width:0"><tbody>
  <tr><th>RMSE (${flUi('sample','muestral')})</th><td>${sdFmt(m.rmse)}</td><th>MAE</th><td>${sdFmt(m.mae)}</td></tr>
  <tr><th>RMSE (${flUi('length-weighted selected grid','ponderado por longitud de malla seleccionada')})</th><td>${sdFmt(m.lengthWeighted?.rmse)}</td><th>MAE (${flUi('length-weighted','ponderado por longitud')})</th><td>${sdFmt(m.lengthWeighted?.mae)}</td></tr>
  <tr><th>Max |A−B|</th><td>${sdFmt(m.maxAbs)}</td><th>${flUi('at X','en X')}</th><td>${sdFmt(m.maxAbsX)} ${unit}</td></tr>
  <tr><th>${flUi('Mean A−B','Media A−B')}</th><td>${sdFmt(m.meanDifference)}</td><th>${flUi('Correlation','Correlación')}</th><td>${sdFmt(m.correlation)}</td></tr>
  <tr><th>${flUi('Mean % difference','Diferencia % media')}</th><td>${sdFmt(m.meanPercent)}%</td><th>${flUi('Grid','Malla')}</th><td>${mode==='common'?flUi('Common spatial grid','Malla espacial común'):mode==='referenceA'?flUi('Reference A','Referencia A'):flUi('Reference B','Referencia B')}</td></tr>
  </tbody></table></div>`;
  document.getElementById('sdExport').disabled=false
}
function sdDownload(name,text){if(typeof downloadText==='function'){downloadText(name,text,'application/json');return}const blob=new Blob([text],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function sdExport(){
  const r=sdLast;if(!r){flSetIssue('sdStatus','analysis-not-run',{analysis:'Spatial Difference',expected:'Run the spatial comparison first'});return}const {mode,epsilon,budget}=sdPairSettings(),A=sdFind(document.getElementById('sdA')?.value),B=sdFind(document.getElementById('sdB')?.value);if(r.binding!==sdPairBinding(A,B,mode,epsilon,budget)){sdPairReset();flSetIssue('sdStatus','analysis-not-run',{analysis:'Spatial Difference',expected:'Run the spatial comparison first'});return}const p={generatedBy:flBuildIdentity(),analysis:'spatial-profile-difference',metricWeighting:'sample metrics and separate length-weighted metrics on selected grid (reference mode may omit other source knots)',sourcePaths:{A:r.A.sourcePath||r.A.fileName,B:r.B.sourcePath||r.B.fileName},components:{A:sdMSource(r.A)?.component,B:sdMSource(r.B)?.component},fieldUnit:r.A.field?.unit,sourceA:sdProfileLabel(r.A),sourceB:sdProfileLabel(r.B),variable:r.A.field?.canonical||r.A.field?.raw||'',profileAxis:r.A.profileAxis||'',coordinateUnit:r.A.profileCoordUnit||'',physicalTime:r.time,spatialAlignment:{mode:r.aligned.mode,sharedRange:{start:r.aligned.start,end:r.aligned.end},epsilon:r.epsilon,operationalBudget:budget,subsampled:false,noIndexAlignment:true,noExtrapolation:true},temporalProvenance:{A:r.A.playbackMeta||null,B:r.B.playbackMeta||null},metrics:r.metrics,points:r.aligned.grid.map((x,i)=>({x,A:r.aligned.A[i],B:r.aligned.B[i],difference:r.metrics.difference[i],absoluteDifference:r.metrics.absoluteDifference[i],relativeDifference:Number.isFinite(r.metrics.relativeDifference[i])?r.metrics.relativeDifference[i]:null,percentDifference:Number.isFinite(r.metrics.percentDifference[i])?r.metrics.percentDifference[i]:null}))};sdDownload('FoamLens_spatial_comparison.json',JSON.stringify(p,null,2))
}
document.addEventListener('foamlens-language-change',()=>{const box=document.getElementById('sdTools');if(box)flApplyBilingualText(box);if(sdLast)sdRun();else sdRefresh()});
function sdInit(){
  sdBuildUi();try{const prev=refreshDatasetControls;refreshDatasetControls=function(...args){const x=prev.apply(this,args);setTimeout(sdRefresh,0);return x}}catch{}
  try{const prevView=updateDatasetViewUI;updateDatasetViewUI=function(...args){const x=prevView.apply(this,args);setTimeout(sdRefresh,0);return x}}catch{}
  window.FoamLensSpatialDifference={sdPairs,sdValueAt,sdGrid,sdMetrics,sdMCompare}
}
sdInit();
