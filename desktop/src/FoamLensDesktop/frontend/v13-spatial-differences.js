/* FoamLens Desktop v1.3.0 — quantitative spatial-profile differences. */

/* FOAMLENS_SPATIAL_DIFFERENCE_CORE_START */
function sdAlmost(a,b){return Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=1e-10*Math.max(1,Math.abs(a),Math.abs(b))}
function sdPairs(s){
  const out=[];for(let i=0;i<Math.min(s?.t?.length||0,s?.y?.length||0);i++){const x=Number(s.t[i]),y=Number(s.y[i]);if(Number.isFinite(x)&&Number.isFinite(y))out.push([x,y])}
  out.sort((a,b)=>a[0]-b[0]);const d=[];for(const p of out){if(d.length&&sdAlmost(d.at(-1)[0],p[0]))d[d.length-1]=p;else d.push(p)}return d
}
function sdValueAt(p,x){
  if(!p.length||x<p[0][0]&&!sdAlmost(x,p[0][0])||x>p.at(-1)[0]&&!sdAlmost(x,p.at(-1)[0]))return NaN;
  let lo=0,hi=p.length-1;while(lo<hi){const m=(lo+hi)>>1;if(p[m][0]<x)lo=m+1;else hi=m}
  if(sdAlmost(p[lo][0],x))return p[lo][1];if(lo===0)return p[0][1];
  const a=p[lo-1],b=p[lo],dx=b[0]-a[0];return dx>0?a[1]+(x-a[0])*(b[1]-a[1])/dx:NaN
}
function sdGrid(A,B,mode='common',maxPoints=3000){
  const a=sdPairs(A),b=sdPairs(B);if(a.length<2||b.length<2)return{valid:false,reason:'insufficient-points',grid:[]};
  const start=Math.max(a[0][0],b[0][0]),end=Math.min(a.at(-1)[0],b.at(-1)[0]);if(!(end>start)&&!sdAlmost(start,end))return{valid:false,reason:'no-spatial-overlap',grid:[]};
  const inRange=p=>p[0]>=start-1e-12&&p[0]<=end+1e-12;
  let grid;
  if(mode==='referenceA')grid=a.filter(inRange).map(p=>p[0]);
  else if(mode==='referenceB')grid=b.filter(inRange).map(p=>p[0]);
  else grid=[...new Set([...a.filter(inRange).map(p=>p[0]),...b.filter(inRange).map(p=>p[0])])].sort((x,y)=>x-y);
  if(grid.length>maxPoints){const src=grid,down=[];for(let i=0;i<maxPoints;i++){const k=Math.round(i*(src.length-1)/(maxPoints-1));if(!down.length||!sdAlmost(down.at(-1),src[k]))down.push(src[k])}grid=down}
  const va=[],vb=[],x=[];for(const xi of grid){const ya=sdValueAt(a,xi),yb=sdValueAt(b,xi);if(Number.isFinite(ya)&&Number.isFinite(yb)){x.push(xi);va.push(ya);vb.push(yb)}}
  return{valid:x.length>0,start,end,grid:x,A:va,B:vb,mode}
}
function sdPearson(a,b){const p=[];for(let i=0;i<Math.min(a.length,b.length);i++){const x=Number(a[i]),y=Number(b[i]);if(Number.isFinite(x)&&Number.isFinite(y))p.push([x,y])}if(p.length<2)return NaN;const mx=p.reduce((s,q)=>s+q[0],0)/p.length,my=p.reduce((s,q)=>s+q[1],0)/p.length;let n=0,dx=0,dy=0;for(const [x,y] of p){const ax=x-mx,ay=y-my;n+=ax*ay;dx+=ax*ax;dy+=ay*ay}return dx>0&&dy>0?n/Math.sqrt(dx*dy):NaN}
function sdMetrics(aligned,epsilon=1e-12){
  if(!aligned?.valid)return{count:0};const d=[],abs=[],rel=[],pct=[],eps=Math.max(0,Number(epsilon)||0);
  for(let i=0;i<aligned.grid.length;i++){const q=aligned.A[i]-aligned.B[i];d.push(q);abs.push(Math.abs(q));if(Math.abs(aligned.B[i])>eps){rel.push(q/aligned.B[i]);pct.push(100*q/aligned.B[i])}}
  if(!d.length)return{count:0};let im=0;for(let i=1;i<abs.length;i++)if(abs[i]>abs[im])im=i;
  return{count:d.length,rmse:Math.sqrt(d.reduce((s,v)=>s+v*v,0)/d.length),mae:abs.reduce((s,v)=>s+v,0)/abs.length,maxAbs:abs[im],maxAbsX:aligned.grid[im],meanDifference:d.reduce((s,v)=>s+v,0)/d.length,meanRelative:rel.length?rel.reduce((s,v)=>s+v,0)/rel.length:NaN,meanPercent:pct.length?pct.reduce((s,v)=>s+v,0)/pct.length:NaN,correlation:sdPearson(aligned.A,aligned.B),difference:d,absoluteDifference:abs,relativeDifference:aligned.grid.map((_,i)=>Math.abs(aligned.B[i])>eps?(aligned.A[i]-aligned.B[i])/aligned.B[i]:NaN),percentDifference:aligned.grid.map((_,i)=>Math.abs(aligned.B[i])>eps?100*(aligned.A[i]-aligned.B[i])/aligned.B[i]:NaN)}
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
 return{points,field,unit,axis,coordinateUnit,source,caseId:String(s.caseId),caseName:String(s.caseName||s.caseId),line:String(s.profileLine||s.profileLineKey||''),dimensions:String(s.field?.dimensions||''),time,kind,support}
}
function sdMCompatible(a,b){return !!a&&!!b&&a.field===b.field&&a.unit===b.unit&&a.axis===b.axis&&a.coordinateUnit===b.coordinateUnit&&a.time===b.time&&(!a.dimensions||!b.dimensions||a.dimensions===b.dimensions)}
function sdMAt(points,x){
 let lo=0,hi=points.length-1;while(lo<=hi){const m=(lo+hi)>>1;if(points[m][0]===x)return{value:points[m][1],kind:'source-coordinate'};if(points[m][0]<x)lo=m+1;else hi=m-1}
 if(!lo||lo===points.length)return null;const a=points[lo-1],b=points[lo],span=b[0]-a[0];if(!(span>0)||!Number.isFinite(span))return null;
 const q=(x-a[0])/span,v=a[1]*(1-q)+b[1]*q;return Number.isFinite(v)?{value:v,kind:'spatial-interpolation'}:null
}
function sdMCompare(sources,config={}){
 const fail=reason=>({valid:false,reason});
 if(!Array.isArray(sources)||sources.length<2||sources.length>8)return fail('Choose 2–8 distinct cases.');
 if(config.confirmed!==true||String(config.mapping||'').trim().length<8)return fail('Confirm and describe equivalent physical lines and coordinate origin.');
 const items=sources.map(sdMSource);if(items.some(x=>!x))return fail('Each source requires complete finite unique coordinates, field/coordinate units, source path and physical time.');
 const ref=items[0];if(new Set(items.map(x=>x.caseId)).size!==items.length)return fail('Select only one profile per case.');
 if(items.some(x=>!sdMCompatible(ref,x)))return fail('Field, component, coordinate axis, units and actual used times must match. Nearest samples from other times are not equivalent.');
 const lo=Math.max(...items.map(x=>x.points[0][0])),hi=Math.min(...items.map(x=>x.points.at(-1)[0]));if(!(hi>lo)||!Number.isFinite(hi-lo))return fail('No positive shared spatial interval.');
 const coords=new Set([lo,hi]);for(const item of items)for(const [x] of item.points)if(x>=lo&&x<=hi)coords.add(x);
 const grid=Array.from(coords).sort((a,b)=>a-b),limit=sdMNumber(config.limit??20000);
 if(!Number.isSafeInteger(limit)||limit<2||limit>100000)return fail('Coordinate limit must be 2–100000.');
 if(grid.length>limit)return fail(grid.length+' original coordinates exceed the limit; raise it. No coordinates discarded.');
 const values=items.map(item=>grid.map(x=>sdMAt(item.points,x)));if(values.some(v=>v.some(p=>!p)))return fail('Nonfinite spatial interpolation; no omitted values.');
 const comparisons=values.slice(1).map((target,i)=>{
  const delta=target.map((p,j)=>p.value-values[0][j].value);if(delta.some(v=>!Number.isFinite(v)))return null;
  let scale=0,peak=0;for(let j=0;j<delta.length;j++){scale=Math.max(scale,Math.abs(delta[j]));if(Math.abs(delta[j])>Math.abs(delta[peak]))peak=j}
  let abs=0,sq=0,bias=0;
  for(let j=1;j<grid.length;j++){const w=(grid[j]-grid[j-1])/(hi-lo),a=scale?delta[j-1]/scale:0,b=scale?delta[j]/scale:0;
   bias+=w*(a+b)/2;sq+=w*(a*a+a*b+b*b)/3;
   if((a>=0&&b>=0)||(a<=0&&b<=0))abs+=w*(Math.abs(a)+Math.abs(b))/2;else{const q=Math.abs(a)/(Math.abs(a)+Math.abs(b));abs+=w*(Math.abs(a)*q+Math.abs(b)*(1-q))/2}}
  return{target:i+1,delta,mae:abs*scale,rmse:Math.sqrt(Math.max(0,sq))*scale,bias:bias*scale,maxAbs:Math.abs(delta[peak]),maxAbsX:grid[peak],nativePairs:target.filter((p,j)=>p.kind==='source-coordinate'&&values[0][j].kind==='source-coordinate').length}
 });
 if(comparisons.some(c=>!c||![c.mae,c.rmse,c.bias].every(Number.isFinite)))return fail('Nonfinite error metrics.');
 return{valid:true,schema:'foamlens/multicase-spatial-comparison/1',field:ref.field,unit:ref.unit,axis:ref.axis,coordinateUnit:ref.coordinateUnit,time_s:ref.time,range:{start:lo,end:hi},grid,values,comparisons,sources:items.map(({points,...m})=>({...m,sampleCount:points.length})),mapping:String(config.mapping).trim(),method:'Union of original coordinates within shared domain; linear spatial interpolation; exact length-weighted piecewise-linear errors; target minus reference.',limitations:'User-confirmed line equivalence; temporal support explicitly attributed. No extrapolation, decimation, mesh-cell subtraction or physical-model certification.'}
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
function sdFmt(v){return Number.isFinite(Number(v))?Number(v).toLocaleString(undefined,{maximumSignificantDigits:7}):'—'}
function sdReasonUi(reason){
  const m={'missing profile':'falta un perfil','profile axes differ':'los ejes de los perfiles son distintos','coordinate units differ':'las unidades de coordenada son distintas','variables differ':'las variables son distintas'};
  return diagEs()?(m[String(reason)]||String(reason)):String(reason)
}
let sdLast=null;
function sdSamePhysicalKind(A,B){
  if(!A||!B)return{ok:false,reason:'missing profile'};
  if(String(A.profileAxis||'')!==String(B.profileAxis||''))return{ok:false,reason:'profile axes differ'};
  if(String(A.profileCoordUnit||'')!==String(B.profileCoordUnit||''))return{ok:false,reason:'coordinate units differ'};
  const ca=String(A.field?.canonical||A.field?.raw||''),cb=String(B.field?.canonical||B.field?.raw||'');
  if(ca!==cb)return{ok:false,reason:'variables differ'};return{ok:true}
}

let sdMResult=null,sdMBound=null;
const sdMColors=['#38bdf8','#fbbf24','#5eead4','#f472b6','#a78bfa','#fb923c','#a3e635','#f87171'];
function sdME(id){return document.getElementById(id)}
function sdMX(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function sdMClear(msg=''){sdMResult=null;sdMBound=null;if(sdME('sdMOut'))sdME('sdMOut').innerHTML='';if(sdME('sdMStatus'))sdME('sdMStatus').textContent=msg;for(const id of ['sdMJson','sdMCsv'])if(sdME(id))sdME(id).disabled=true}
function sdMConfig(){return{confirmed:sdME('sdMConfirm').checked,mapping:sdME('sdMMapping').value,limit:sdME('sdMLimit').value}}
function sdMSelected(){const ids=[sdME('sdA').value,...Array.from(sdME('sdMChoices').querySelectorAll('input:checked'),x=>x.value)];return [...new Set(ids)].map(sdFind)}
function sdMFingerprint(s){return JSON.stringify({caseId:s?.caseId,id:s?.id,source:s?.sourcePath||s?.fileName,field:s?.field,axis:s?.profileAxis,coordinateUnit:s?.profileCoordUnit,line:s?.profileLineKey,time:s?.profileTime,meta:s?.playbackMeta,t:s?.t,y:s?.y})}
function sdMRefresh(src=sdProfileSources()){
 const host=sdME('sdMChoices');if(!host)return;
 const ref=sdME('sdA').value,old=new Set(Array.from(host.querySelectorAll('input:checked'),x=>x.value));
 host.innerHTML=src.map((s,i)=>{const id=sdId(s,i),p=sdMSource(s);if(id===ref)return '';return '<label style="display:flex;gap:7px;align-items:start;border:1px solid var(--line);border-radius:7px;padding:7px;overflow-wrap:anywhere;min-width:0"><input type="checkbox" value="'+sdMX(id)+'" '+(!p?'disabled ':old.has(id)?'checked ':'')+'><span>'+sdMX(sdProfileLabel(s))+' · '+sdMX(p?p.time+' s · '+p.kind:'unavailable')+'</span></label>'}).join('')||'—';
 sdMClear(flUi('Select target cases and compare.','Selecciona casos objetivo y compara.'))
}
function sdMMount(box){
 const el=document.createElement('details');el.id='sdMPanel';el.style.marginTop='12px';
 el.innerHTML='<summary><b data-fl-en="Multi-case spatial comparison" data-fl-es="Comparación espacial multicaso">Multi-case spatial comparison</b></summary>'+
 '<p class="smallnote" data-fl-en="Profile A above is the reference; choose 1–7 additional distinct cases at the same actual physical time." data-fl-es="El perfil A de arriba es la referencia; elige 1–7 casos distintos adicionales al mismo tiempo físico real.">Profile A above is the reference; choose 1–7 additional distinct cases at the same actual physical time.</p>'+
 '<div id="sdMChoices" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(210px,100%),1fr));gap:6px"></div>'+
 '<div class="extActions"><button id="sdMAuto" class="btn soft" type="button" data-fl-en="Select compatible cases" data-fl-es="Seleccionar casos compatibles">Select compatible cases</button><button id="sdMReset" class="btn soft" type="button" data-fl-en="Clear" data-fl-es="Limpiar">Clear</button></div>'+
 '<div class="field"><label data-fl-en="Physical line/location mapping" data-fl-es="Equivalencia de ubicación y línea física">Physical line/location mapping</label><textarea id="sdMMapping" rows="2" maxlength="500"></textarea></div>'+
 '<label class="extCheck"><input type="checkbox" id="sdMConfirm"><span data-fl-en="I confirm equivalent physical lines and coordinate origin." data-fl-es="Confirmo líneas físicas y origen de coordenadas equivalentes.">I confirm equivalent physical lines and coordinate origin.</span></label>'+
 '<div class="field"><label data-fl-en="Maximum coordinates (no decimation)" data-fl-es="Máximo de coordenadas (sin reducir muestras)">Maximum coordinates (no decimation)</label><input id="sdMLimit" type="number" min="2" max="100000" value="20000"></div>'+
 '<div class="extActions"><button id="sdMRun" class="btn primary" type="button" data-fl-en="Compare all selected cases" data-fl-es="Comparar todos los casos">Compare all selected cases</button><button id="sdMJson" class="btn soft" type="button" disabled>JSON</button><button id="sdMCsv" class="btn soft" type="button" disabled>CSV</button></div>'+
 '<p id="sdMStatus" class="smallnote" aria-live="polite"></p><div id="sdMOut"></div>';
 box.append(el);el.addEventListener('toggle',()=>{if(el.open)sdMRefresh()});
 sdME('sdA').addEventListener('change',()=>sdMRefresh());
 sdME('sdMChoices').addEventListener('change',()=>sdMClear());
 for(const id of ['sdMMapping','sdMConfirm','sdMLimit'])sdME(id).addEventListener(id==='sdMConfirm'?'change':'input',()=>sdMClear());
 sdME('sdMAuto').onclick=()=>{const a=sdMSource(sdFind(sdME('sdA').value));if(!a)return;const ids=new Set([a.caseId]);for(const el of sdME('sdMChoices').querySelectorAll('input')){const b=sdMSource(sdFind(el.value));el.checked=!el.disabled&&sdMCompatible(a,b)&&ids.size<8&&!ids.has(b.caseId);if(el.checked)ids.add(b.caseId)}sdMClear()};
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
function sdMDraw(){
 const r=sdMResult;if(!r)return;const cursor=Number(sdME('sdMCursor').value),delta=sdME('sdMPlotKind').value==='delta',curves=delta?r.comparisons.map(c=>({i:c.target,y:c.delta})):r.values.map((v,i)=>({i,y:v.map(p=>p.value)}));
 const W=820,H=280,L=91,R=25,T=28,B=48;let min=delta?0:Infinity,max=delta?0:-Infinity;for(const c of curves)for(const v of c.y){min=Math.min(min,v);max=Math.max(max,v)}
 const scale=Math.max(Math.abs(min),Math.abs(max),Number.MIN_VALUE),mn=min/scale,mx=max/scale,x=v=>L+(v-r.range.start)/(r.range.end-r.range.start)*(W-L-R),y=v=>T+(mn===mx?.5:(mx-v/scale)/(mx-mn))*(H-T-B);
 let ticks='';for(let i=0;i<=4;i++){const q=i/4,px=L+(W-L-R)*q,py=T+(H-T-B)*q;ticks+='<path d="M '+L+' '+py+' H '+(W-R)+' M '+px+' '+T+' V '+(H-B)+'" stroke="#8e9aac" opacity=".22" fill="none"/><text x="'+(L-8)+'" y="'+(py+4)+'" text-anchor="end">'+sdMX(sdFmt(max*(1-q)+min*q))+'</text><text x="'+px+'" y="'+(H-B+17)+'" text-anchor="middle">'+sdMX(sdFmt(r.range.start*(1-q)+r.range.end*q))+'</text>'}
 const at=r.grid[cursor],cx=x(at);
 sdME('sdMPlot').innerHTML='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+sdMX(r.field)+'" style="display:block;width:100%;height:auto;max-height:350px;background:#111827;border-radius:9px" fill="#dbe5ef" font-family="system-ui,sans-serif" font-size="11">'+ticks+'<text x="'+L+'" y="16" font-weight="700">'+sdMX((delta?'Δ ':'')+r.field+' ['+r.unit+']')+'</text>'+
 (delta?'<path d="M '+L+' '+y(0)+' H '+(W-R)+'" stroke="#d1d5db" stroke-dasharray="5 4"/>':'')+
 curves.map(c=>'<polyline fill="none" stroke="'+sdMColors[c.i]+'" stroke-width="2" points="'+c.y.map((v,j)=>x(r.grid[j]).toFixed(3)+','+y(v).toFixed(3)).join(' ')+'"/>').join('')+
 '<path d="M '+cx+' '+T+' V '+(H-B)+'" stroke="#e2e8f0" stroke-dasharray="4 4"/>'+curves.map(c=>'<circle cx="'+cx+'" cy="'+y(c.y[cursor])+'" r="4" fill="'+sdMColors[c.i]+'"/>').join('')+'<text x="'+(W/2)+'" y="'+(H-6)+'" text-anchor="middle">'+sdMX(r.axis+' ['+r.coordinateUnit+']')+'</text></svg><div style="display:flex;flex-wrap:wrap;gap:8px">'+curves.map(c=>'<span style="font-size:12px;overflow-wrap:anywhere"><span style="color:'+sdMColors[c.i]+'">●</span> '+sdMX(r.sources[c.i].caseName)+'</span>').join('')+'</div>';
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
  <button class="btn primary" id="sdRun" type="button" data-fl-en="Compare profiles" data-fl-es="Comparar perfiles">Compare profiles</button>
  <button class="btn" id="sdExport" type="button" disabled data-fl-en="Export JSON" data-fl-es="Exportar JSON">Export JSON</button>
  <div class="smallnote" id="sdStatus" style="margin-top:7px"></div><div id="sdResult" style="margin-top:8px"></div>`;
  host.appendChild(box);sdMMount(box);flApplyBilingualText(box);document.getElementById('sdRun').onclick=sdRun;document.getElementById('sdExport').onclick=sdExport;sdRefresh()
}
function sdRefresh(){
  const src=sdProfileSources(),box=document.getElementById('sdTools'),a=document.getElementById('sdA'),b=document.getElementById('sdB');if(box)box.style.display='';if(!a||!b)return;
  const oa=a.value,ob=b.value,opts=src.map((s,i)=>`<option value="${sdId(s,i).replace(/"/g,'&quot;')}">${sdProfileLabel(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')}</option>`).join('');a.innerHTML=opts||'<option value="">—</option>';b.innerHTML=opts||'<option value="">—</option>';if([...a.options].some(o=>o.value===oa))a.value=oa;if([...b.options].some(o=>o.value===ob))b.value=ob;if((!ob||b.value===a.value)&&b.options.length>1)b.selectedIndex=1;sdLast=null;const ex=document.getElementById('sdExport');if(ex)ex.disabled=true;
  sdMRefresh(src);
  const st=document.getElementById('sdStatus');if(src.length<2){flSetIssue(st,'at least two spatial profiles are required',{analysis:'Spatial Difference',expected:'Two compatible rendered spatial profiles'});return}flClearIssue(st);if(st)st.textContent=flUi('Ready to compare the selected spatial profiles.','Listo para comparar los perfiles espaciales seleccionados.')
}
function sdRun(){
  const A=sdFind(document.getElementById('sdA')?.value),B=sdFind(document.getElementById('sdB')?.value),st=document.getElementById('sdStatus'),out=document.getElementById('sdResult');if(!A||!B||A===B){flSetIssue(st,'selection-missing',{analysis:'Spatial Difference'});return}flClearIssue(st)
  const compatible=sdSamePhysicalKind(A,B);if(!compatible.ok){flSetIssue(st,compatible.reason,{analysis:'Spatial Difference',field:A?.field?.canonical||''});out.innerHTML='';return}
  const mode=document.getElementById('sdMode')?.value||'common',epsilon=Number(document.getElementById('sdEpsilon')?.value)||1e-12,aligned=sdGrid(A,B,mode,3000);if(!aligned.valid){flSetIssue(st,'no-spatial-overlap',{analysis:'Spatial Difference',field:A?.field?.canonical||''});out.innerHTML='';return}
  const m=sdMetrics(aligned,epsilon);sdLast={A,B,aligned,metrics:m,epsilon};
  const unit=A.profileCoordUnit||'',time=Number(A.profileTime),metaA=A.playbackMeta||null,metaB=B.playbackMeta||null;
  st.textContent=diagEs()?`Rango espacial compartido ${sdFmt(aligned.start)}–${sdFmt(aligned.end)} ${unit} · ${m.count} muestras alineadas · tPlay ${Number.isFinite(time)?sdFmt(time)+' s':'—'}.`:`Shared spatial range ${sdFmt(aligned.start)}–${sdFmt(aligned.end)} ${unit} · ${m.count} aligned samples · tPlay ${Number.isFinite(time)?sdFmt(time)+' s':'—'}.`;
  out.innerHTML=`<div class="dataCatalogTableWrap"><table class="dataCatalogTable" style="min-width:0"><tbody>
  <tr><th>RMSE</th><td>${sdFmt(m.rmse)}</td><th>MAE</th><td>${sdFmt(m.mae)}</td></tr>
  <tr><th>Max |A−B|</th><td>${sdFmt(m.maxAbs)}</td><th>${flUi('at X','en X')}</th><td>${sdFmt(m.maxAbsX)} ${unit}</td></tr>
  <tr><th>${flUi('Mean A−B','Media A−B')}</th><td>${sdFmt(m.meanDifference)}</td><th>${flUi('Correlation','Correlación')}</th><td>${sdFmt(m.correlation)}</td></tr>
  <tr><th>${flUi('Mean % difference','Diferencia % media')}</th><td>${sdFmt(m.meanPercent)}%</td><th>${flUi('Grid','Malla')}</th><td>${mode==='common'?flUi('Common spatial grid','Malla espacial común'):mode==='referenceA'?flUi('Reference A','Referencia A'):flUi('Reference B','Referencia B')}</td></tr>
  </tbody></table></div>`;
  document.getElementById('sdExport').disabled=false
}
function sdDownload(name,text){if(typeof downloadText==='function'){downloadText(name,text,'application/json');return}const blob=new Blob([text],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function sdExport(){
  const r=sdLast;if(!r){flSetIssue('sdStatus','analysis-not-run',{analysis:'Spatial Difference',expected:'Run the spatial comparison first'});return}const p={generatedBy:flBuildIdentity(),analysis:'spatial-profile-difference',sourceA:sdProfileLabel(r.A),sourceB:sdProfileLabel(r.B),variable:r.A.field?.canonical||r.A.field?.raw||'',profileAxis:r.A.profileAxis||'',coordinateUnit:r.A.profileCoordUnit||'',physicalTime:Number.isFinite(Number(r.A.profileTime))?Number(r.A.profileTime):null,spatialAlignment:{mode:r.aligned.mode,sharedRange:{start:r.aligned.start,end:r.aligned.end},epsilon:r.epsilon,noIndexAlignment:true,noExtrapolation:true},temporalProvenance:{A:r.A.playbackMeta||null,B:r.B.playbackMeta||null},metrics:r.metrics,points:r.aligned.grid.map((x,i)=>({x,A:r.aligned.A[i],B:r.aligned.B[i],difference:r.metrics.difference[i],absoluteDifference:r.metrics.absoluteDifference[i],relativeDifference:Number.isFinite(r.metrics.relativeDifference[i])?r.metrics.relativeDifference[i]:null,percentDifference:Number.isFinite(r.metrics.percentDifference[i])?r.metrics.percentDifference[i]:null}))};sdDownload('FoamLens_spatial_comparison.json',JSON.stringify(p,null,2))
}
document.addEventListener('foamlens-language-change',()=>{const box=document.getElementById('sdTools');if(box)flApplyBilingualText(box);if(sdLast)sdRun();else sdRefresh()});
function sdInit(){
  sdBuildUi();try{const prev=refreshDatasetControls;refreshDatasetControls=function(...args){const x=prev.apply(this,args);setTimeout(sdRefresh,0);return x}}catch{}
  try{const prevView=updateDatasetViewUI;updateDatasetViewUI=function(...args){const x=prevView.apply(this,args);setTimeout(sdRefresh,0);return x}}catch{}
  window.FoamLensSpatialDifference={sdPairs,sdValueAt,sdGrid,sdMetrics,sdMCompare}
}
sdInit();
