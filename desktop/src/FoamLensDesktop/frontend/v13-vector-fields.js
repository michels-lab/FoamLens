/* FoamLens Desktop v1.3.0 — generic vector component / magnitude derivation. */

/* FOAMLENS_VECTOR_DERIVED_CORE_START */
function vdComponentDescriptor(name){
  const s=String(name||'').trim();let m=s.match(/^(.+?)[_.](x|y|z)$/i);if(m)return{base:m[1],component:m[2].toLowerCase()};
  m=s.match(/^(.+?)([XYZ])$/);if(m)return{base:m[1],component:m[2].toLowerCase()};
  m=s.match(/^([A-Za-z][A-Za-z0-9:+-]*?)([xyz])$/);if(m)return{base:m[1],component:m[2].toLowerCase()};
  return null
}
function vdFinitePairs(s){const out=[];for(let i=0;i<Math.min(s?.t?.length||0,s?.y?.length||0);i++){const x=Number(s.t[i]),y=Number(s.y[i]);if(Number.isFinite(x)&&Number.isFinite(y))out.push([x,y])}out.sort((a,b)=>a[0]-b[0]);return out}
function vdSampleLinear(p,t){
  if(!p.length||t<p[0][0]-1e-12||t>p.at(-1)[0]+1e-12)return NaN;
  let lo=0,hi=p.length-1;while(lo<=hi){const m=(lo+hi)>>1;if(Math.abs(p[m][0]-t)<=1e-10*Math.max(1,Math.abs(t)))return p[m][1];if(p[m][0]<t)lo=m+1;else hi=m-1}
  if(lo<=0||lo>=p.length)return NaN;const a=p[lo-1],b=p[lo],dx=b[0]-a[0];return dx>0?a[1]+(t-a[0])*(b[1]-a[1])/dx:NaN
}
function vdAlignCoordinates(items,maxPoints=3000){
  const p=items.map(vdFinitePairs);if(!p.length||p.some(a=>!a.length))return{valid:false,grid:[],values:[]};
  const start=Math.max(...p.map(a=>a[0][0])),end=Math.min(...p.map(a=>a.at(-1)[0]));if(!(end>=start))return{valid:false,grid:[],values:[]};
  let grid=[...new Set(p.flatMap(a=>a.filter(q=>q[0]>=start-1e-12&&q[0]<=end+1e-12).map(q=>q[0])))].sort((a,b)=>a-b);
  if(grid.length>maxPoints){const src=grid,down=[];for(let i=0;i<maxPoints;i++){const k=Math.round(i*(src.length-1)/(maxPoints-1));if(!down.length||down.at(-1)!==src[k])down.push(src[k])}grid=down}
  return{valid:!!grid.length,start,end,grid,values:p.map(a=>grid.map(x=>vdSampleLinear(a,x)))}
}
function vdMagnitude(components){const n=Math.min(...components.map(a=>a.length));if(!Number.isFinite(n)||n<1)return[];const out=[];for(let i=0;i<n;i++){let sum=0,ok=true;for(const a of components){const v=Number(a[i]);if(!Number.isFinite(v)){ok=false;break}sum+=v*v}out.push(ok?Math.sqrt(sum):NaN)}return out}
/* FOAMLENS_VECTOR_DERIVED_CORE_END */

function vdFieldName(s){return String(s?.field?.raw||s?.field?.canonical||s?.field?.name||s?.name||'')}
function vdDataset(s){try{return datasetTypeOf(s)}catch{return s?.profileTime!=null?'profile':'timeseries'}}
function vdGroupKey(s,d){return [s?.caseId??'',vdDataset(s),s?.region||s?.regionName||'',s?.sourcePath||s?.fileName||'',s?.profileTime??'',s?.profileLineKey||s?.profileLine||'',s?.profileAxis||'',s?.profileCoordUnit||'',d.base.toLowerCase()].join('|')}
function vdGroups(){
  const map=new Map();for(const s of (typeof series!=='undefined'&&Array.isArray(series)?series:[])){if(s?.derivedKind==='vectorMagnitude'||(typeof seriesMatchesGlobalContext==='function'&&!seriesMatchesGlobalContext(s)))continue;const d=vdComponentDescriptor(vdFieldName(s));if(!d)continue;const key=vdGroupKey(s,d);if(!map.has(key))map.set(key,{key,base:d.base,items:{},sample:s});map.get(key).items[d.component]=s}
  return [...map.values()].filter(g=>g.items.x&&g.items.y&&g.items.z)
}
function vdGroupLabel(g){const s=g.sample,c=(typeof cases!=='undefined'&&Array.isArray(cases))?cases.find(x=>String(x.id)===String(s?.caseId)):null,bits=[c?.name||s?.caseName||flUi('Case','Caso'),g.base,vdDataset(s)==='profile'?flUi('Spatial profile','Perfil espacial'):flUi('Time series','Serie temporal')];if(s?.region||s?.regionName)bits.push(s.region||s.regionName);if(s?.profileLine)bits.push(s.profileLine);if(Number.isFinite(Number(s?.profileTime)))bits.push('t='+s.profileTime+' s');return bits.join(' · ')}
function vdRefreshUi(){
  const sel=document.getElementById('vdGroup');if(!sel)return;const old=sel.value,groups=vdGroups(),box=document.getElementById('vdTools');if(box)box.style.display='';try{refreshGeneralAnalysisHost()}catch{}
  sel.innerHTML=groups.length?groups.map(g=>`<option value="${String(g.key).replace(/"/g,'&quot;')}">${vdGroupLabel(g).replace(/&/g,'&amp;').replace(/</g,'&lt;')}</option>`).join(''):'<option value="">—</option>';
  if([...sel.options].some(o=>o.value===old))sel.value=old;
  const st=document.getElementById('vdStatus');if(!groups.length){flSetIssue(st,'no-compatible-vector-group',{analysis:'Generic Vector Fields',expected:'Matching X/Y/Z components'});return}
  flClearIssue(st);st.textContent=diagEs()?`${groups.length} grupo(s) vectoriales compatibles detectados. Las magnitudes se crean solo cuando las solicitas.`:`${groups.length} compatible vector group(s) detected. Magnitudes are created only when requested.`
}
function vdAddMagnitude(){
  const key=document.getElementById('vdGroup')?.value,g=vdGroups().find(x=>x.key===key),st=document.getElementById('vdStatus');if(!g){flSetIssue(st,'selection-missing',{analysis:'Generic Vector Fields',expected:'Choose a complete X/Y/Z group'});return}
  const comps=[g.items.x,g.items.y,g.items.z],aligned=vdAlignCoordinates(comps,3000);if(!aligned.valid){flSetIssue(st,'no-compatible-vector-group',{analysis:'Generic Vector Fields',field:g.base});return}flClearIssue(st)
  const y=vdMagnitude(aligned.values),base=g.sample,name='|'+g.base+'|';
  if(series.some(s=>s?.derivedKind==='vectorMagnitude'&&s?.vectorMagnitudeSourceKey===g.key)){st.textContent=flUi('That vector magnitude is already present.','Esa magnitud vectorial ya está presente.');return}
  const d={...base,id:'vd_'+Date.now()+'_'+Math.random().toString(36).slice(2,7),name,label:name,t:aligned.grid,y,derived:true,derivedKind:'vectorMagnitude',vectorMagnitudeSourceKey:g.key,sourceKind:'derived',sourcePath:'FoamLens generic vector magnitude',component:'magnitude',visible:true,hidden:false,checked:true,enabled:true,field:{...(base.field||{}),canonical:'mag:'+g.base,raw:name,name,displayName:name},vectorDerivation:{base:g.base,components:['x','y','z'],alignment:'physical-coordinate-linear',range:{start:aligned.start,end:aligned.end},noIndexAlignment:true,noExtrapolation:true}};
  series.push(d);activeId=d.id;try{refreshDatasetControls();renderList();updateMeta();draw()}catch(e){console.warn('Vector magnitude refresh failed',e);flSetIssue(st,String(e?.message||e),{analysis:'Vector Magnitude',field:g.base});return}flClearIssue(st);st.textContent=diagEs()?`Se agregó ${name} a partir de componentes X/Y/Z alineados por coordenada física/tiempo.`:`Added ${name} from X/Y/Z components aligned by physical coordinate/time.`
}
function vdBuildUi(){
  if(document.getElementById('vdTools'))return;const host=document.getElementById('generalAnalysisModules')||document.querySelector('.analysisTools')||document.body,box=document.createElement('div');box.id='vdTools';box.className='detailBlock';box.style.marginTop='10px';
  box.innerHTML=`<div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><b data-fl-en="Generic Vector Fields" data-fl-es="Campos vectoriales genéricos">Generic Vector Fields</b><span class="badge" data-fl-en="X · Y · Z · magnitude" data-fl-es="X · Y · Z · magnitud">X · Y · Z · magnitude</span></div><div class="smallnote" style="margin-top:5px" data-fl-en="Any compatible X/Y/Z field can be combined. FoamLens aligns components by their physical coordinate/time; it never assumes array indices represent the same location." data-fl-es="Cualquier campo X/Y/Z compatible puede combinarse. FoamLens alinea los componentes por su coordenada física/tiempo; nunca supone que los índices de arreglos representan la misma ubicación.">Any compatible X/Y/Z field can be combined.</div><div class="field" style="margin-top:8px"><label data-fl-en="Vector group" data-fl-es="Grupo vectorial">Vector group</label><select id="vdGroup"></select></div><button class="btn primary" id="vdAdd" type="button" data-fl-en="Add magnitude" data-fl-es="Agregar magnitud">Add magnitude</button><div class="smallnote" id="vdStatus"></div>`;
  host.appendChild(box);flApplyBilingualText(box);document.getElementById('vdAdd').onclick=vdAddMagnitude;vdRefreshUi()
}
function vdInit(){vdBuildUi();document.addEventListener('foamlens-language-change',()=>{const box=document.getElementById('vdTools');if(box)flApplyBilingualText(box);vdRefreshUi()});try{const previous=refreshDatasetControls;refreshDatasetControls=function(...args){const x=previous.apply(this,args);setTimeout(vdRefreshUi,0);return x}}catch{}window.FoamLensVectorFields={vdComponentDescriptor,vdAlignCoordinates,vdMagnitude}}
vdInit();
