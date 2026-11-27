/* FoamLens multiregion energy accounting — conditional, read-only evidence.
 * Companion to v14-energy-audit.js; does not change its energyFlux identity.
 */
/* FOAMLENS_MULTIREGION_ENERGY_CORE_START */
function mecFinite(v){
  if(typeof v==='number')return Number.isFinite(v)?v:NaN;
  if(typeof v!=='string'||!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(v.trim()))return NaN;
  const n=Number(v);return Number.isFinite(n)?n:NaN
}
function mecPhysicalPairs(s){
  const t=s?.t||[],y=s?.y||[],out=[];
  for(let i=0;i<Math.min(t.length,y.length);i++){
    const time=mecFinite(t[i]),v=mecFinite(y[i]);if(Number.isFinite(time)&&Number.isFinite(v))out.push([time,v])
  }
  out.sort((a,b)=>a[0]-b[0]);const unique=[];
  for(const p of out){
    if(unique.length&&unique.at(-1)[0]===p[0])
      unique[unique.length-1]=p;else unique.push(p)
  }
  return unique
}
function mecUnit(unit){
  // SI unit prefixes are case-sensitive. The old toLowerCase() mapped mW
  // (10^-3 W) to MW (10^6 W), and likewise mJ to MJ: a 10^9 error in a
  // scientific conservation result. Reject noncanonical/ambiguous strings.
  if(typeof unit!=='string')return null;
  const u=unit.trim();
  const units={
    J:['J',1],mJ:['J',1e-3],kJ:['J',1e3],MJ:['J',1e6],
    W:['W',1],mW:['W',1e-3],kW:['W',1e3],MW:['W',1e6]
  };
  const candidate=Object.prototype.hasOwnProperty.call(units,u)?units[u]:null;
  return candidate?{dimension:candidate[0],factor:candidate[1],sourceUnit:u}:null
}
function mecDimensions(raw,kind){
  const s=String(raw||'').trim();if(!s)return'missing';
  const nums=/^\[\s*([+-]?\d+(?:\s+[+-]?\d+){6})\s*\]$/.exec(s);
  if(!nums)return'invalid';
  const arr=nums[1].trim().split(/\s+/).map(Number),expected=kind==='J'?[1,2,-2,0,0,0,0]:[1,2,-3,0,0,0,0];
  return arr.every((n,i)=>n===expected[i])?'compatible':'incompatible'
}
function mecCaseId(value){
  if(typeof value!=='number'&&typeof value!=='string')return null;
  const raw=String(value).trim();
  if(!/^[+-]?(?:0|[1-9]\d*)$/.test(raw))return null;
  const n=Number(raw);return Number.isSafeInteger(n)?n:null
}
function mecConflictingSamples(s){
  const pairs=s.t.map((t,i)=>[mecFinite(t),mecFinite(s.y[i])]).sort((a,b)=>a[0]-b[0]);
  for(let i=1;i<pairs.length;i++){
    const prev=pairs[i-1],next=pairs[i];
    const sameTime=next[0]===prev[0];
    const differentEnergy=next[1]!==prev[1];
    if(sameTime&&differentEnergy)return true
  }
  return false
}
function mecSource(s,expected,region,caseId){
  if(!s||mecCaseId(caseId)===null||mecCaseId(s.caseId)!==mecCaseId(caseId)||!String(region||'').trim()||String(s.region||'')!==String(region))
    return{ok:false,reason:'source case/region mismatch or missing region provenance'};
  if(s.derived===true)return{ok:false,reason:'derived series are not accepted as independent source evidence'};
  if(!String(s.sourcePath||'').trim())return{ok:false,reason:'source path is missing'};
  const u=mecUnit(s.unit);
  if(!u||u.dimension!==expected)return{ok:false,reason:'required measured '+expected+' units not established'};
  const dims=mecDimensions(s.dimensions,expected);
  if(dims==='invalid'||dims==='incompatible')return{ok:false,reason:'OpenFOAM dimensions contradict selected '+expected+' source'};
  const times=s.t||[],values=s.y||[];
  if(!Array.isArray(times)||!Array.isArray(values)||times.length!==values.length||times.some((v,i)=>!Number.isFinite(mecFinite(v))||!Number.isFinite(mecFinite(values[i]))))
    return{ok:false,reason:'missing, invalid or unmatched measured readings; no interpolation across missing samples'};
  if(mecConflictingSamples(s))return{ok:false,reason:'conflicting energy values at duplicate or indistinguishable physical times'};
  const pairs=mecPhysicalPairs(s);if(pairs.length<2)return{ok:false,reason:'fewer than two finite physical-time source samples'};
  for(const pair of pairs){pair[1]*=u.factor;if(!Number.isFinite(pair[1]))return{ok:false,reason:'measured source exceeds finite SI conversion range'}}
  return{ok:true,series:s,pairs,dimensionEvidence:dims,
    provenance:{caseId:Number(caseId),region,sourcePath:s.sourcePath,field:String(s.field||''),
      unit:s.unit,dimensions:String(s.dimensions||''),column:String(s.column||''),samples:pairs.length,
      patch:String(s.patch||''),patches:Array.isArray(s.patches)?s.patches.map(String):[],functionObject:String(s.functionObject||''),operation:String(s.operation||'')}}
}
function mecSample(pairs,t){
  if(!pairs.length||t<pairs[0][0]||t>pairs.at(-1)[0])return null;
  let l=0,r=pairs.length-1;
  while(l<=r){
    const k=l+Math.floor((r-l)/2);
    if(pairs[k][0]===t)
      return{value:pairs[k][1],kind:'measured'};
    if(pairs[k][0]<t)l=k+1;else r=k-1
  }
  if(l<=0||l>=pairs.length)return null;
  const a=pairs[l-1],b=pairs[l],dt=b[0]-a[0];if(!(dt>0))return null;
  return{value:(1-(t-a[0])/dt)*a[1]+((t-a[0])/dt)*b[1],kind:'time-interpolated'}
}
function mecTimeGrid(sources,maxPoints=20000){
  if(!Number.isSafeInteger(maxPoints)||maxPoints<2)return false;
  let start=-Infinity,end=Infinity;
  for(const s of sources){start=Math.max(start,s.pairs[0][0]);end=Math.min(end,s.pairs.at(-1)[0])}
  if(!(end>start)||!Number.isFinite(end-start))return null;
  // Merge sorted knots without allocating a concatenated duplicate grid.
  const cursor=sources.map(s=>{
    let lo=0,hi=s.pairs.length;
    while(lo<hi){const mid=lo+Math.floor((hi-lo)/2);if(s.pairs[mid][0]<start)lo=mid+1;else hi=mid}
    return lo
  }),grid=[];
  for(;;){
    let next=end;
    for(let j=0;j<sources.length;j++){const t=sources[j].pairs[cursor[j]]?.[0];if(t!==undefined&&t<next)next=t}
    if(!grid.length||grid.at(-1)!==next){if(grid.length>=maxPoints)return false;grid.push(next)}
    if(next===end)break;
    for(let j=0;j<sources.length;j++)while(sources[j].pairs[cursor[j]]?.[0]===next)cursor[j]++;
  }
  return grid
}
function mecIntegral(t,y){
  let sum=0,c=0;
  for(let i=1;i<t.length;i++){
    const term=(.5*y[i-1]+.5*y[i])*(t[i]-t[i-1]),adjusted=term-c,next=sum+adjusted;
    c=(next-sum)-adjusted;sum=next
  }
  return sum
}
function mecPowerStats(t,y){
  let max=0;for(const p of y)max=Math.max(max,Math.abs(p));
  if(!Number.isFinite(max))return null;
  if(max===0)return{max:0,timeRms:0,sampleRms:0};
  const span=t.at(-1)-t[0];let squares=0,weighted=0;
  for(let i=0;i<y.length;i++){
    const b=y[i]/max;squares+=b*b;
    if(i){const a=y[i-1]/max;weighted+=((t[i]-t[i-1])/span)*(a*a+a*b+b*b)/3}
  }
  return{max,timeRms:max*Math.sqrt(Math.min(1,Math.max(0,weighted))),sampleRms:max*Math.sqrt(Math.min(1,squares/y.length))}
}
function mecEvaluate(input={}){
  const blocked=(reason,missing=[])=>({valid:false,status:'not-evaluated',reason,missing,
    noExtrapolation:true,noCaseMutation:true,interfaceValidated:false});
  const regions=input.regions||[];
  if(regions.length!==2||!regions[0]?.name||!regions[1]?.name||regions[0].name===regions[1].name)
    return blocked('Select two different, source-identified physical regions.');
  if(mecCaseId(input.caseId)===null)return blocked('A source OpenFOAM case must be identified.');
  const id=mecCaseId(input.caseId),sources=[],byRegion=[],warnings=[];
  for(const reg of regions){
    const row={name:reg.name,extras:[],sources:[]};
    const stored=mecSource(reg.inventory,'J',reg.name,id);
    const interfaceFlux=mecSource(reg.interfaceFlux,'W',reg.name,id);
    if(!stored.ok||!interfaceFlux.ok)return blocked(reg.name+': '+(!stored.ok?stored.reason:interfaceFlux.reason));
    row.inventory=stored;row.interfaceFlux=interfaceFlux;
    sources.push(stored,interfaceFlux);row.sources.push(stored,interfaceFlux);
    const orientation=Number(reg.interfaceOrientation);
    if(orientation!==1&&orientation!==-1)return blocked('Declare interface outward flux sign for '+reg.name+'.');
    row.interfaceOrientation=orientation;
    for(const extra of reg.extras||[]){
      if(!['boundaryOut','sourceIn'].includes(extra.kind))return blocked('Unknown additional energy term role.');
      const item=mecSource(extra.series,'W',reg.name,id);
      if(!item.ok)return blocked(reg.name+' additional '+extra.kind+': '+item.reason);
      const sign=Number(extra.orientation);if(sign!==1&&sign!==-1)return blocked('Declare direction for each additional power term.');
      row.extras.push({...item,kind:extra.kind,orientation:sign});row.sources.push(item);sources.push(item)
    }
    byRegion.push(row)
  }
  const unique=new Set(sources.map(s=>s.series));
  // A source can be materialized as separate objects after reimport. De-duplicate
  // by actual case/region/path/field/column, not only JavaScript object identity.
  const evidenceKeys=sources.map(({provenance:d})=>[
    d.caseId,d.region,d.sourcePath,d.field,d.column
  ].join('|'));
  if(unique.size!==sources.length||new Set(evidenceKeys).size!==evidenceKeys.length)
    return blocked('One measured source column was assigned to multiple energy terms; potential double counting.');
  const attest=input.attestations||{};
  const missing=[
    ...(!attest.interfaceSameSurfaceAndNormals?['interface geometry/normal orientation']:[]),
    ...(!attest.storageIsComplete?['energy inventory accounts for all storage modes']:[]),
    ...(!attest.otherTermsComplete?['other boundaries and sources are fully listed or verified zero']:[])
  ];
  if(missing.length)return blocked('Required physical coverage declarations are missing.',missing);
  if(input.maxPoints!==undefined&&(!Number.isSafeInteger(input.maxPoints)||input.maxPoints<2))return blocked('Enter a whole operational time-point budget of at least two.');
  const grid=mecTimeGrid(sources,input.maxPoints);
  if(grid===false)return blocked('Physical-time grid exceeds the configured limit. Increase the limit; energy balance cannot discard measured time knots.');
  if(!grid||grid.length<2)return blocked('All selected energy terms need a common time interval with at least two times.');
  const rowData=byRegion.map(reg=>{
    const inventory=[],interfacePower=[],boundaryPower=[],sourcePower=[];
    let interpolatedSamples=0;
    for(const t of grid){
      let inv=0,iface=0,boundary=0,source=0;
      for(let j=0;j<reg.sources.length;j++){
        const sample=mecSample(reg.sources[j].pairs,t);
        if(!sample||!Number.isFinite(sample.value))return null;
        if(sample.kind==='time-interpolated')interpolatedSamples++;
        if(j===0)inv=sample.value;
        else if(j===1)iface=sample.value*reg.interfaceOrientation;
        else{const item=reg.extras[j-2];if(item.kind==='boundaryOut')boundary+=sample.value*item.orientation;else source+=sample.value*item.orientation}
      }
      if(![inv,iface,boundary,source].every(Number.isFinite))return null;
      inventory.push(inv);interfacePower.push(iface);boundaryPower.push(boundary);sourcePower.push(source)
    }
    const deltaInventory=inventory.at(-1)-inventory[0],
      intInterface=mecIntegral(grid,interfacePower),intBoundary=mecIntegral(grid,boundaryPower),
      intSources=mecIntegral(grid,sourcePower),
      residual=deltaInventory+intInterface+intBoundary-intSources,
      absBudget=Math.abs(deltaInventory)+Math.abs(intInterface)+Math.abs(intBoundary)+Math.abs(intSources);
    if(![deltaInventory,intInterface,intBoundary,intSources,residual,absBudget].every(Number.isFinite))return null;
    if(reg.sources.some(src=>src.dimensionEvidence==='missing'))
      warnings.push(reg.name+': dimensional exponents missing in at least one source (declared units validated; OpenFOAM dimensions not independently available).');
    return{name:reg.name,deltaInventory,intInterface,intBoundary,intSources,residual,
      relativeResidual:absBudget>0?Math.abs(residual)/absBudget:null,
      inventoryStart:inventory[0],inventoryEnd:inventory.at(-1),
      interfacePower,boundaryPower,sourcePower,
      provenance:reg.sources.map(s=>s.provenance),dimensions:reg.sources.map(s=>s.dimensionEvidence),
      interpolatedSamples}
  });
  if(rowData.some(x=>!x))return blocked('Incomplete synchronized observations or nonfinite energy arithmetic; conservation cannot be evaluated.');
  const netInterfacePower=grid.map((t,i)=>rowData[0].interfacePower[i]+rowData[1].interfacePower[i]),
    mismatch=mecIntegral(grid,netInterfacePower),
    stats=mecPowerStats(grid,netInterfacePower),
    interfaceEnergyScale=Math.abs(rowData[0].intInterface)+Math.abs(rowData[1].intInterface),
    interfaceRelative=interfaceEnergyScale>0?Math.abs(mismatch)/interfaceEnergyScale:null;
  const systemResidual=rowData.reduce((n,row)=>n+row.residual,0);
  if(!stats||![mismatch,interfaceEnergyScale,systemResidual,stats.timeRms,stats.sampleRms].every(Number.isFinite))return blocked('Nonfinite interface or system energy arithmetic; conservation cannot be evaluated.');
  return{
    valid:true,status:'conditional-audit',schema:'foamlens/multiregion-energy-accounting/1',
    caseId:id,regions:rowData,grid,commonTimeRange:{start:grid[0],end:grid.at(-1)},
    interface:{sumPower:netInterfacePower,rmsPowerMismatch:stats.sampleRms,timeWeightedRmsPowerMismatch:stats.timeRms,maxAbsPowerMismatch:stats.max,
      rmsPowerMismatchBasis:'sample-weighted (legacy); timeWeightedRmsPowerMismatch integrates squared piecewise-linear power over physical time',
      integratedMismatch:mismatch,relativeIntegratedMismatch:interfaceRelative,
      sourceRegions:regions.map(r=>r.name),basis:'signed outward interface power for each region; same physical interface manually confirmed'},
    system:{residual:systemResidual,absoluteResidual:Math.abs(systemResidual)},
    attestations:{...attest},warnings,
    limitations:[
      'This is a conditional balance based on manually verified interface normals/areas, storage completeness, and listed sources, not a certified OpenFOAM conservation proof.',
      'The imported source series must already be physically integrated [J] or [W], not W/m2, J/kg, or unweighted fields. The app never guesses missing surface areas or densities.',
      'A zero residual can arise from incomplete physics or cancellation. Independently check mesh interfaces, contact resistance and boundary conditions.',
      'Only the physical-time overlap is integrated; no extrapolation, spatial interpolation or source case mutation occurs.'
    ],
    timeGridEvidence:{points:grid.length,operationalPointBudget:input.maxPoints??20000,subsampled:false,timeIdentity:'exact represented numeric seconds'},
    noExtrapolation:true,noCaseMutation:true,interfaceValidated:false
  }
}
/* FOAMLENS_MULTIREGION_ENERGY_CORE_END */

function mecUi(en,es){try{return typeof flUi==='function'?flUi(en,es):en}catch{return en}}
function mecEsc(v){return String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}
let mecSources=[],mecReport=null;
function mecEl(id){return document.getElementById(id)}
function mecInvalidate(){
  mecReport=null;
  for(const id of ['mecExportJson','mecExportCsv']){const b=mecEl(id);if(b)b.disabled=true}
  const report=mecEl('mecResult');if(report)report.textContent='';
}
function mecSeriesIndex(){
  const selected=mecCaseId(mecEl('mecCase')?.value);
  if(selected===null)return[];
  return (typeof eaCaseSeries==='function'?eaCaseSeries(selected):[]).map(s=>{
    const d=eaDescriptor(s),unit=String(s.field?.unit||'').trim();
    return{source:s,caseId:mecCaseId(s.caseId),region:d.region||'',
      field:d.fieldName,sourcePath:d.sourcePath,unit,dimensions:String(s.field?.dimensions||''),
      derived:s.derived===true,column:String(d.column||''),patch:d.patch||'',patches:d.patches||[],
      functionObject:d.functionObject||'',operation:d.operation||'',t:s.t,y:s.y,kind:mecUnit(unit)?.dimension||null}
  }).filter(s=>s.caseId!==null&&s.region&&s.sourcePath&&!s.derived&&s.kind&&mecPhysicalPairs(s).length>=2)
}
function mecOptions(rows,kind){
  return'<option value="">'+mecEsc(mecUi('Choose measured source','Elige serie medida'))+'</option>'+
    rows.filter(({item})=>item.kind===kind).map(({index,item})=>
      '<option value="'+index+'">'+mecEsc(item.field+' ['+item.unit+'] · '+item.sourcePath.split(/[\\/]/).at(-1)+
       ' · '+(item.patch||item.patches?.join(', ')||'patch unknown')+
       ' · '+mecPhysicalPairs(item).length+' samples')+'</option>').join('')
}
function mecUpdateSources(force=false){
  const latest=mecSeriesIndex();
  // A refresh cannot reuse an old index after a new OpenFOAM import or case switch.
  // If the exact source objects are unchanged, preserve user selections.
  if(!force&&latest.length===mecSources.length&&
     latest.every((item,i)=>item.source===mecSources[i].source))return;
  mecInvalidate();mecSources=latest;
  const groups=[...new Set(mecSources.map(s=>s.region))].sort();
  for(const letter of ['A','B']){
    const region=mecEl('mecRegion'+letter);
    region.innerHTML='<option value="">'+mecEsc(mecUi('Choose actual region','Selecciona región real'))+'</option>'+
      groups.map(g=>'<option value="'+mecEsc(g)+'">'+mecEsc(g)+'</option>').join('');
    region.value=''
  }
  mecRefreshSelectors()
}
function mecRefreshSelectors(){
  mecInvalidate();
  for(const l of ['A','B']){
    const name=mecEl('mecRegion'+l)?.value||'',
      rows=mecSources.map((item,index)=>({item,index})).filter(x=>x.item.region===name);
    for(const [suffix,kind] of [['Inventory','J'],['Interface','W'],['Boundary','W'],['Source','W']]){
      const select=mecEl('mec'+l+suffix),old=select.value;
      select.innerHTML=mecOptions(rows,kind);
      if(rows.some(x=>String(x.index)===old&&x.item.kind===kind))select.value=old
    }
  }
}
function mecReadSelection(id,optional=false){
  const value=mecEl(id)?.value;
  if(optional&&(value===''||value==null))return null;
  const idx=Number(value);
  if(value===''||!Number.isSafeInteger(idx)||idx<0)return undefined;
  const item=mecSources[idx];if(!item||!(Array.isArray(series)&&series.includes(item.source)))return undefined;
  return item
}
function mecRun(){
  mecInvalidate();
  const caseId=mecCaseId(mecEl('mecCase')?.value),data=[];
  for(const suffix of ['A','B']){
    const name=mecEl('mecRegion'+suffix)?.value,
      inv=mecReadSelection('mec'+suffix+'Inventory'),int=mecReadSelection('mec'+suffix+'Interface');
    if(!name||!inv||!int){mecEl('mecStatus').textContent='Select a real region and its measured J inventory and W interface flux for both sides.';return}
    const extras=[];
    for(const [field,kind] of [['Boundary','boundaryOut'],['Source','sourceIn']]){
      const s=mecReadSelection('mec'+suffix+field,true);
      if(s)extras.push({kind,series:s,orientation:Number(mecEl('mec'+suffix+field+'Sign').value)})
      else if(s===undefined){mecEl('mecStatus').textContent='A selected energy source is missing from the current case; refresh.';return}
    }
    data.push({name,inventory:inv,interfaceFlux:int,
      interfaceOrientation:Number(mecEl('mec'+suffix+'InterfaceSign').value),extras})
  }
  const attestations={
    interfaceSameSurfaceAndNormals:mecEl('mecConfirmInterface').checked,
    storageIsComplete:mecEl('mecConfirmStorage').checked,
    otherTermsComplete:mecEl('mecConfirmCoverage').checked
  };
  const report=mecEvaluate({caseId,regions:data,attestations,maxPoints:Number(mecEl('mecMaxPoints').value)});
  if(!report.valid){mecEl('mecStatus').textContent=report.reason+(report.missing?.length?' · '+report.missing.join('; '):'');return}
  mecReport=report;
  mecEl('mecStatus').textContent=mecUi('Conditional accounting across actual shared physical time: ',
    'Balance condicionado en tiempo físico compartido: ')+report.commonTimeRange.start+'–'+report.commonTimeRange.end+' s';
  const fmt=n=>n===null||!Number.isFinite(n)?'not available':n.toLocaleString(undefined,{maximumSignificantDigits:7});
  const rows=report.regions.map(r=>'<tr><td>'+mecEsc(r.name)+'</td>'+
    [r.deltaInventory,r.intInterface,r.intBoundary,r.intSources,r.residual,r.relativeResidual===null?null:100*r.relativeResidual].map(fmt)
      .map(v=>'<td>'+mecEsc(v)+'</td>').join('')+'</tr>').join('');
  mecEl('mecResult').innerHTML='<div class="extTableWrap"><table><thead><tr>'+
    ['Region','ΔE inventory [J]','Interface outward [J]','Other outward [J]','Sources inward [J]','Residual [J]','Relative |residual| [%]']
      .map(s=>'<th>'+mecEsc(s)+'</th>').join('')+'</tr></thead><tbody>'+rows+'</tbody></table></div>'+
    '<p>Interface mismatch: ∫(A outward + B outward) dt = '+mecEsc(fmt(report.interface.integratedMismatch))+
    ' J · Time-weighted RMS mismatch = '+mecEsc(fmt(report.interface.timeWeightedRmsPowerMismatch))+' W · system residual = '+
    mecEsc(fmt(report.system.residual))+' J</p>'+
    '<p class="smallnote">'+mecEsc([...report.warnings,...report.limitations].join(' '))+'</p>';
  mecEl('mecExportJson').disabled=false;mecEl('mecExportCsv').disabled=false
}
function mecDownload(name,body,mime){
  if(typeof downloadText==='function'){downloadText(name,body,mime);return}
  const uri=URL.createObjectURL(new Blob([body],{type:mime})),a=document.createElement('a');
  a.href=uri;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(uri),2000)
}
function mecExport(kind){
  if(!mecReport)return;
  const report=mecReport;
  if(kind==='json')return mecDownload('FoamLens_multiregion_energy.json',JSON.stringify({...report,exportedAt:new Date().toISOString()},null,2),'application/json');
  const lines=['time_s,interface_out_A_W,interface_out_B_W,interface_mismatch_W'];
  report.grid.forEach((t,i)=>lines.push([t,report.regions[0].interfacePower[i],report.regions[1].interfacePower[i],
    report.interface.sumPower[i]].join(',')));
  mecDownload('FoamLens_multiregion_interface_flux.csv',lines.join('\n')+'\n','text/csv')
}
function mecInstall(){
  const host=mecEl('paTools');if(!host||mecEl('mecPanel'))return;
  const panel=document.createElement('details');panel.id='mecPanel';panel.className='extSection';
  const selection=l=>'<div class="extGrid2">'+
    '<div class="field"><label>Actual region '+l+'</label><select id="mecRegion'+l+'"></select></div>'+
    '<div class="field"><label>Stored energy [J] — measured total inventory</label><select id="mec'+l+'Inventory"></select></div>'+
    '<div class="field"><label>Interface power [W] — same physical surface</label><select id="mec'+l+'Interface"></select></div>'+
    '<div class="field"><label>Interface measured sign</label><select id="mec'+l+'InterfaceSign"><option value="1">As recorded: outward-positive</option><option value="-1">Invert: inward-positive</option></select></div>'+
    '<div class="field"><label>Other boundary power [W] (optional)</label><select id="mec'+l+'Boundary"></select></div>'+
    '<div class="field"><label>Other boundary measured sign</label><select id="mec'+l+'BoundarySign"><option value="1">As recorded: outward-positive</option><option value="-1">Invert: inward-positive</option></select></div>'+
    '<div class="field"><label>Volumetric/source power [W] (optional)</label><select id="mec'+l+'Source"></select></div>'+
    '<div class="field"><label>Source measured sign</label><select id="mec'+l+'SourceSign"><option value="1">As recorded: inward-positive heating</option><option value="-1">Invert: outward-positive cooling</option></select></div></div>';
  panel.innerHTML='<summary><strong data-fl-en="Granada · Multi-region energy accounting" data-fl-es="Granada · Balance energético multirregión">Granada · Multi-region energy accounting</strong></summary>'+
    '<div class="extSectionBody"><p class="smallnote">Read-only conditional interface/energy balance from physically integrated OpenFOAM postProcessing [J, W] sources. Regions and normals must be verified. This is separate from the automatic energy-flux decomposition audit.</p>'+
    '<div class="extGrid2"><div class="field"><label>OpenFOAM case</label><select id="mecCase"></select></div>'+
    '<div class="field"><label>Operational time-point budget (no subsampling)</label><input type="number" min="2" step="1" value="20000" id="mecMaxPoints"></div></div>'+
    '<h4>Region A</h4>'+selection('A')+'<h4>Region B</h4>'+selection('B')+
    '<label class="extCheck"><input type="checkbox" id="mecConfirmInterface"> I checked that both interface fluxes represent the SAME interface, correct area, orientation and outward-normal convention.</label>'+
    '<label class="extCheck"><input type="checkbox" id="mecConfirmStorage"> I verified that measured J values represent COMPLETE, non-double-counted total energy inventory of both regions (including latent contributions when applicable).</label>'+
    '<label class="extCheck"><input type="checkbox" id="mecConfirmCoverage"> I verified all other boundary/source terms are represented by the selected series or physically zero — not simply missing.</label>'+
    '<div class="extActions"><button class="btn soft" type="button" id="mecRefresh">Refresh measured source catalog</button>'+
    '<button class="btn primary" type="button" id="mecCalculate">Evaluate conditional conservation</button>'+
    '<button class="btn soft" type="button" id="mecExportJson" disabled>Export evidence JSON</button>'+
    '<button class="btn soft" type="button" id="mecExportCsv" disabled>Export interface CSV</button></div>'+
    '<p id="mecStatus" class="smallnote" aria-live="polite"></p><div id="mecResult"></div></div>';
  host.append(panel);
  const fillCases=()=>{
    const old=mecEl('mecCase').value;
    mecEl('mecCase').innerHTML='<option value="">Select case</option>'+
      (Array.isArray(cases)?cases:[]).filter(c=>mecCaseId(c.id)!==null).map(c=>'<option value="'+mecCaseId(c.id)+'">'+mecEsc(c.name)+'</option>').join('');
    if([...mecEl('mecCase').options].some(o=>o.value===old))mecEl('mecCase').value=old;
    if(!mecEl('mecCase').value&&cases?.length)mecEl('mecCase').value=String(cases[0].id)
  };
  const refresh=()=>{fillCases();mecUpdateSources()};
  mecEl('mecCase').addEventListener('change',()=>mecUpdateSources(true));
  for(const l of ['A','B']){
    mecEl('mecRegion'+l).addEventListener('change',mecRefreshSelectors);
    for(const name of ['Inventory','Interface','InterfaceSign','Boundary','BoundarySign','Source','SourceSign'])
      mecEl('mec'+l+name).addEventListener('change',mecInvalidate)
  }
  for(const name of ['mecConfirmInterface','mecConfirmStorage','mecConfirmCoverage'])
    mecEl(name).addEventListener('change',mecInvalidate);
  mecEl('mecMaxPoints').addEventListener('input',mecInvalidate);
  mecEl('mecRefresh').onclick=refresh;mecEl('mecCalculate').onclick=mecRun;
  mecEl('mecExportJson').onclick=()=>mecExport('json');
  mecEl('mecExportCsv').onclick=()=>mecExport('csv');
  panel.addEventListener('toggle',()=>{if(panel.open)refresh()});
  try{if(typeof flApplyBilingualText==='function')flApplyBilingualText(panel)}catch{}
  refresh()
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mecInstall,{once:true});else mecInstall();
window.FoamLensMultiregionEnergy={evaluate:mecEvaluate,source:mecSource,units:mecUnit};
