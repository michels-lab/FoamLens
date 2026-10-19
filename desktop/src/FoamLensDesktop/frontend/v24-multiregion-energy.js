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
    if(unique.length&&Math.abs(unique.at(-1)[0]-p[0])<=1e-10*Math.max(1,Math.abs(p[0]),Math.abs(unique.at(-1)[0])))
      unique[unique.length-1]=p;else unique.push(p)
  }
  return unique
}
function mecUnit(unit){
  const u=String(unit||'').trim().toLowerCase().replace(/\s+/g,'');
  const units={j:['J',1],kj:['J',1e3],mj:['J',1e6],w:['W',1],kw:['W',1e3],mw:['W',1e6]};
  return units[u]?{dimension:units[u][0],factor:units[u][1],sourceUnit:String(unit).trim()}:null
}
function mecDimensions(raw,kind){
  const s=String(raw||'').trim();if(!s)return'missing';
  const nums=/^\[\s*([+-]?\d+(?:\s+[+-]?\d+){6})\s*\]$/.exec(s);
  if(!nums)return'invalid';
  const arr=nums[1].trim().split(/\s+/).map(Number),expected=kind==='J'?[1,2,-2,0,0,0,0]:[1,2,-3,0,0,0,0];
  return arr.every((n,i)=>n===expected[i])?'compatible':'incompatible'
}
function mecSource(s,expected,region,caseId){
  if(!s||Number(s.caseId)!==Number(caseId)||String(s.region||'')!==String(region||''))
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
  const pairs=mecPhysicalPairs(s);if(pairs.length<2)return{ok:false,reason:'fewer than two finite physical-time source samples'};
  return{ok:true,series:s,pairs:pairs.map(([t,v])=>[t,v*u.factor]),dimensionEvidence:dims,
    provenance:{caseId:Number(caseId),region,sourcePath:s.sourcePath,field:String(s.field||''),
      unit:s.unit,dimensions:String(s.dimensions||''),column:String(s.column||''),samples:pairs.length,
      patch:String(s.patch||''),patches:Array.isArray(s.patches)?s.patches.map(String):[],functionObject:String(s.functionObject||''),operation:String(s.operation||'')}}
}
function mecSample(pairs,t){
  if(!pairs.length||t<pairs[0][0]||t>pairs.at(-1)[0])return null;
  let l=0,r=pairs.length-1;
  while(l<=r){
    const k=(l+r)>>1;
    if(Math.abs(pairs[k][0]-t)<=1e-12*Math.max(1,Math.abs(t),Math.abs(pairs[k][0])))
      return{value:pairs[k][1],kind:'measured'};
    if(pairs[k][0]<t)l=k+1;else r=k-1
  }
  if(l<=0||l>=pairs.length)return null;
  const a=pairs[l-1],b=pairs[l],dt=b[0]-a[0];if(!(dt>0))return null;
  return{value:a[1]+(b[1]-a[1])*(t-a[0])/dt,kind:'time-interpolated'}
}
function mecTimeGrid(sources,maxPoints=2500){
  const start=Math.max(...sources.map(s=>s.pairs[0][0])),end=Math.min(...sources.map(s=>s.pairs.at(-1)[0]));
  if(!(end>start))return null;
  const ts=[start,end,...sources.flatMap(s=>s.pairs.map(p=>p[0]).filter(t=>t>=start&&t<=end))].sort((a,b)=>a-b);
  const dedup=[];for(const t of ts){
    if(!dedup.length||Math.abs(t-dedup.at(-1))>1e-10*Math.max(1,Math.abs(t)))dedup.push(t)
  }
  const limit=Math.max(2,Math.min(2500,Math.floor(mecFinite(maxPoints)||2500)));
  if(dedup.length<=limit)return dedup;
  const reduced=[];for(let i=0;i<limit;i++){
    const v=dedup[Math.round(i*(dedup.length-1)/(limit-1))];if(reduced.at(-1)!==v)reduced.push(v)
  }
  return reduced
}
function mecIntegral(t,y){
  let v=0;for(let i=1;i<t.length;i++)v+=.5*(y[i-1]+y[i])*(t[i]-t[i-1]);return v
}
function mecEvaluate(input={}){
  const blocked=(reason,missing=[])=>({valid:false,status:'not-evaluated',reason,missing,
    noExtrapolation:true,noCaseMutation:true,interfaceValidated:false});
  const regions=input.regions||[];
  if(regions.length!==2||!regions[0]?.name||!regions[1]?.name||regions[0].name===regions[1].name)
    return blocked('Select two different, source-identified physical regions.');
  if(!Number.isFinite(Number(input.caseId)))return blocked('A source OpenFOAM case must be identified.');
  const id=Number(input.caseId),sources=[],byRegion=[],warnings=[];
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
  const grid=mecTimeGrid(sources,input.maxPoints);
  if(!grid||grid.length<2)return blocked('All selected energy terms need a common time interval with at least two times.');
  const rowData=byRegion.map(reg=>{
    const sampled=reg.sources.map(src=>grid.map(t=>mecSample(src.pairs,t)));
    if(sampled.some(row=>row.some(v=>!v||!Number.isFinite(v.value))))return null;
    const inventory=sampled[0].map(x=>x.value),interfacePower=sampled[1].map(x=>x.value*reg.interfaceOrientation);
    const boundaryPower=new Array(grid.length).fill(0),sourcePower=new Array(grid.length).fill(0);
    for(let j=0;j<reg.extras.length;j++){
      const item=reg.extras[j],values=sampled[j+2];
      for(let i=0;i<grid.length;i++){
        if(item.kind==='boundaryOut')boundaryPower[i]+=values[i].value*item.orientation;
        else sourcePower[i]+=values[i].value*item.orientation;
      }
    }
    const deltaInventory=inventory.at(-1)-inventory[0],
      intInterface=mecIntegral(grid,interfacePower),intBoundary=mecIntegral(grid,boundaryPower),
      intSources=mecIntegral(grid,sourcePower),
      residual=deltaInventory+intInterface+intBoundary-intSources,
      absBudget=Math.abs(deltaInventory)+Math.abs(intInterface)+Math.abs(intBoundary)+Math.abs(intSources);
    if(reg.sources.some(src=>src.dimensionEvidence==='missing'))
      warnings.push(reg.name+': dimensional exponents missing in at least one source (declared units validated; OpenFOAM dimensions not independently available).');
    return{name:reg.name,deltaInventory,intInterface,intBoundary,intSources,residual,
      relativeResidual:absBudget>0?Math.abs(residual)/absBudget:null,
      inventoryStart:inventory[0],inventoryEnd:inventory.at(-1),
      interfacePower,boundaryPower,sourcePower,
      provenance:reg.sources.map(s=>s.provenance),dimensions:reg.sources.map(s=>s.dimensionEvidence),
      interpolatedSamples:sampled.reduce((n,row)=>n+row.filter(v=>v.kind==='time-interpolated').length,0)}
  });
  if(rowData.some(x=>!x))return blocked('Incomplete synchronized observations; conservation cannot be evaluated.');
  const netInterfacePower=grid.map((t,i)=>rowData[0].interfacePower[i]+rowData[1].interfacePower[i]),
    mismatch=mecIntegral(grid,netInterfacePower),
    rms=Math.sqrt(netInterfacePower.reduce((acc,p)=>acc+p*p,0)/netInterfacePower.length),
    maxAbs=Math.max(...netInterfacePower.map(Math.abs)),
    interfaceEnergyScale=Math.abs(rowData[0].intInterface)+Math.abs(rowData[1].intInterface),
    interfaceRelative=interfaceEnergyScale>0?Math.abs(mismatch)/interfaceEnergyScale:null;
  const systemResidual=rowData.reduce((n,row)=>n+row.residual,0);
  return{
    valid:true,status:'conditional-audit',schema:'foamlens/multiregion-energy-accounting/1',
    caseId:id,regions:rowData,grid,commonTimeRange:{start:grid[0],end:grid.at(-1)},
    interface:{sumPower:netInterfacePower,rmsPowerMismatch:rms,maxAbsPowerMismatch:maxAbs,
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
  const selected=Number(mecEl('mecCase')?.value);
  if(!Number.isFinite(selected))return[];
  return (typeof eaCaseSeries==='function'?eaCaseSeries(selected):[]).map(s=>{
    const d=eaDescriptor(s),unit=String(s.field?.unit||'').trim();
    return{source:s,caseId:Number(s.caseId),region:d.region||'',
      field:d.fieldName,sourcePath:d.sourcePath,unit,dimensions:String(s.field?.dimensions||''),
      derived:s.derived===true,column:String(d.column||''),patch:d.patch||'',patches:d.patches||[],
      functionObject:d.functionObject||'',operation:d.operation||'',t:s.t,y:s.y,kind:mecUnit(unit)?.dimension||null}
  }).filter(s=>s.region&&s.sourcePath&&!s.derived&&s.kind&&mecPhysicalPairs(s).length>=2)
}
function mecOptions(rows,kind){
  return'<option value="">'+mecEsc(mecUi('Choose measured source','Elige serie medida'))+'</option>'+
    rows.filter(({item})=>item.kind===kind).map(({index,item})=>
      '<option value="'+index+'">'+mecEsc(item.field+' ['+item.unit+'] · '+item.sourcePath.split(/[\\/]/).at(-1)+
       ' · '+mecPhysicalPairs(item).length+' samples')+'</option>').join('')
}
function mecUpdateSources(){
  mecInvalidate();mecSources=mecSeriesIndex();
  const groups=[...new Set(mecSources.map(s=>s.region))].sort();
  for(const letter of ['A','B']){
    const region=mecEl('mecRegion'+letter),old=region.value;
    region.innerHTML='<option value="">'+mecEsc(mecUi('Choose actual region','Selecciona región real'))+'</option>'+
      groups.map(g=>'<option value="'+mecEsc(g)+'">'+mecEsc(g)+'</option>').join('');
    if(groups.includes(old))region.value=old
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
  const caseId=Number(mecEl('mecCase')?.value),data=[];
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
    ' J · RMS mismatch = '+mecEsc(fmt(report.interface.rmsPowerMismatch))+' W · system residual = '+
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
    '<div class="field"><label>Maximum time samples</label><input type="number" min="2" max="2500" value="1200" id="mecMaxPoints"></div></div>'+
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
      (Array.isArray(cases)?cases:[]).map(c=>'<option value="'+Number(c.id)+'">'+mecEsc(c.name)+'</option>').join('');
    if([...mecEl('mecCase').options].some(o=>o.value===old))mecEl('mecCase').value=old;
    if(!mecEl('mecCase').value&&cases?.length)mecEl('mecCase').value=String(cases[0].id)
  };
  const refresh=()=>{fillCases();mecUpdateSources()};
  mecEl('mecCase').addEventListener('change',mecUpdateSources);
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
