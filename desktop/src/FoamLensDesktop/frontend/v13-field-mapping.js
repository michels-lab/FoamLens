/* FoamLens Desktop v1.3.0 — expanded general Field Mapping roles. */

/* FOAMLENS_FIELD_MAPPING_EXTENSION_CORE_START */
const FM_EXTRA_ROLES=[
  {key:'enthalpy',en:'Enthalpy',es:'Entalpía',patterns:[/^h$/,/^he$/,/^hs$/,/enthalpy/,/sensibleenthalpy/]},
  {key:'courant',en:'Courant',es:'Courant',patterns:[/^co$/,/courant/,/cocell/,/maxco/,/meanco/]},
  {key:'vorticity',en:'Vorticity',es:'Vorticidad',patterns:[/vorticity/,/^omega$/]},
  {key:'thermalGradient',en:'Thermal Gradient',es:'Gradiente térmico',patterns:[/thermalgradient/,/temperaturegradient/,/^gradt$/,/maggradt/]},
  {key:'densityGradient',en:'Density Gradient',es:'Gradiente de densidad',patterns:[/densitygradient/,/^gradrho$/,/maggradrho/]}
];
function fmNormDimensions(v){return String(v||'').replace(/\s+/g,' ').trim()}
function fmDimensionCompatibility(roleKey,dim){
  const d=fmNormDimensions(dim);
  const exact={
    temperature:'[0 0 0 1 0 0 0]',
    velocity:'[0 1 -1 0 0 0 0]',
    density:'[1 -3 0 0 0 0 0]',
    vorticity:'[0 0 -1 0 0 0 0]',
    thermalGradient:'[0 -1 0 1 0 0 0]',
    densityGradient:'[1 -4 0 0 0 0 0]'
  };
  return exact[roleKey]&&d===exact[roleKey]?100:0
}
function fmNameScore(fieldName,role){
  const n=String(fieldName||'').toLowerCase().replace(/[^a-z0-9]+/g,'');let best=0;
  for(const re of role?.patterns||[]){if(re.test(n))best=Math.max(best,re.source.startsWith('^')?100:70)}
  return best
}
function fmSuggestMappingsWithMetadata(descriptors,roleDefs){
  const roles=roleDefs||[],out={},used=new Set(),ds=(descriptors||[]).filter(d=>d?.name);
  for(const role of roles.filter(r=>r.key!=='userDefined')){
    let best=null,bestScore=0;
    for(const d of ds){if(used.has(d.name))continue;const ns=fmNameScore(d.name,role),dim=fmDimensionCompatibility(role.key,d.dimensions),score=ns+(ns>0&&dim>0?25:0)+(ns===0?dim:0);if(score>bestScore){best=d;bestScore=score}}
    // Dimension-only mapping is accepted only for roles with highly distinctive SI dimensions.
    // Dimensionless and acceleration/enthalpy cases remain name-driven because they are ambiguous.
    const dimensionOnlyAllowed=['temperature','velocity','density','vorticity','thermalGradient','densityGradient'].includes(role.key);
    if(best&&bestScore>0&&(fmNameScore(best.name,role)>0||dimensionOnlyAllowed)){out[role.key]=best.name;used.add(best.name)}else out[role.key]=''
  }
  out.userDefined='';return out
}
function fmRegionKey(region){return String(region||'').trim()}
function fmMappingStorageKey(baseKey,region){const r=fmRegionKey(region);return r?String(baseKey)+'::region='+r:String(baseKey)}
function fmFilterDescriptorsByRegion(descriptors,region){
  const r=fmRegionKey(region);return (descriptors||[]).filter(d=>!r||String(d?.region||'')===r)
}
/* FOAMLENS_FIELD_MAPPING_EXTENSION_CORE_END */

function fmInstallRoles(){
  if(typeof PM_ROLE_DEFS==='undefined')return;
  const userIndex=Math.max(0,PM_ROLE_DEFS.findIndex(r=>r.key==='userDefined'));
  let insertAt=userIndex>=0?userIndex:PM_ROLE_DEFS.length;
  for(const role of FM_EXTRA_ROLES){
    if(PM_ROLE_DEFS.some(r=>r.key===role.key))continue;
    PM_ROLE_DEFS.splice(insertAt,0,role);insertAt++
  }
}
function fmDescriptorsForCase(c,region=''){
  const discovered=c?.discoveryModel?.fields||[],seen=new Map(),r=fmRegionKey(region);
  for(const d of discovered){
    const name=String(d?.name||d?.object||''),dr=String(d?.region||'');if(!name||(r&&dr!==r))continue;
    const key=dr+'|'+name,old=seen.get(key)||{};
    seen.set(key,{name,region:dr,dimensions:d?.dimensions||old.dimensions||'',kind:d?.kind||old.kind||'',storage:d?.storage||old.storage||''})
  }
  for(const d of c?.volumeFieldInventory||[]){
    const name=String(d?.name||''),dr=String(d?.region||'');if(!name||(r&&dr!==r))continue;
    const key=dr+'|'+name;if(!seen.has(key))seen.set(key,{name,region:dr,dimensions:d?.dimensions||'',kind:d?.kind||'',storage:'volume'})
  }
  return [...seen.values()]
}
function fmRegionsForCase(c){
  if(typeof pmRegionNames==='function')return pmRegionNames(c);
  return [...new Set(fmDescriptorsForCase(c).map(d=>d.region))].sort()
}
function fmMappingBaseKey(c){return c?.rootPath||c?.name||String(c?.id||'')}
function fmSelectedAnalysisRegion(c){
  const active=document.activeElement;
  if(active&&(active.id==='pmUserRoleName'||active.closest?.('#pmMappingRows')))return fmSelectedMappingRegion(c);
  const selectedCase=Number(document.getElementById('pmCase')?.value);
  const r=String(document.getElementById('pmRegion')?.value||'');
  if(r&&(!Number.isFinite(selectedCase)||Number(c?.id)===selectedCase||fmRegionsForCase(c).includes(r)))return r;
  if(typeof activeContextRegion!=='undefined'&&activeContextRegion&&fmRegionsForCase(c).includes(activeContextRegion))return activeContextRegion;
  return''
}
function fmSelectedMappingRegion(c){
  const selected=String(document.getElementById('fmMappingRegion')?.value||'');
  return selected&&fmRegionsForCase(c).includes(selected)?selected:''
}
function fmMappingForRegion(c,region=''){
  if(!c)return{};
  const r=fmRegionKey(region),key=fmMappingStorageKey(fmMappingBaseKey(c),r),descriptors=fmDescriptorsForCase(c,r),names=[...new Set(descriptors.map(d=>d.name))];
  if(!pmFieldMappings.has(key)){
    const suggested=fmSuggestMappingsWithMetadata(descriptors,PM_ROLE_DEFS);
    // Keep legacy/default-region workspaces compatible. Named regions are intentionally
    // seeded independently so an identically named field in another region is never
    // treated as the same mapping merely because the field name matches.
    if(!r&&pmFieldMappings.has(fmMappingBaseKey(c)))pmFieldMappings.set(key,{...pmFieldMappings.get(fmMappingBaseKey(c))});
    else pmFieldMappings.set(key,suggested)
  }
  const m=pmFieldMappings.get(key);
  for(const role of PM_ROLE_DEFS)if(m[role.key]==null)m[role.key]='';
  for(const role of PM_ROLE_DEFS)if(m[role.key]&&!names.includes(m[role.key]))m[role.key]='';
  return m
}
function fmInstallMappingRegionUi(){
  if(document.getElementById('fmMappingRegion'))return;
  const rows=document.getElementById('pmMappingRows');if(!rows?.parentElement)return;
  const field=document.createElement('div');field.className='field';field.id='fmMappingRegionField';
  field.innerHTML='<label id="fmMappingRegionLabel">Region</label><select id="fmMappingRegion"></select>';
  rows.parentElement.insertBefore(field,rows);
  document.getElementById('fmMappingRegion').addEventListener('change',()=>{try{pmRenderMapping()}catch{}})
}
function fmRefreshMappingRegion(c){
  fmInstallMappingRegionUi();const sel=document.getElementById('fmMappingRegion');if(!sel||!c)return'';
  const old=sel.value,regions=fmRegionsForCase(c);
  sel.innerHTML=regions.map(r=>'<option value="'+esc(String(r))+'">'+esc(String(r)||(diagEs()?'Región por defecto':'Default region'))+'</option>').join('');
  if(regions.some(r=>String(r)===String(old)))sel.value=old;
  else if(typeof activeContextRegion!=='undefined'&&regions.includes(activeContextRegion))sel.value=activeContextRegion;
  else if(regions.length)sel.value=String(regions[0]);
  const label=document.getElementById('fmMappingRegionLabel');if(label)label.textContent=diagEs()?'Región':'Region';
  return sel.value||''
}
fmInstallRoles();
try{
  pmMappingKey=function(c){return fmMappingStorageKey(fmMappingBaseKey(c),fmSelectedMappingRegion(c))}
}catch{}
try{
  pmMappingForCase=function(c,regionOverride){
    const region=regionOverride!=null?String(regionOverride):fmSelectedAnalysisRegion(c);
    return fmMappingForRegion(c,region)
  }
}catch{}
try{
  pmCaseCapabilities=function(c){
    const region=fmSelectedAnalysisRegion(c),names=pmUniqueFieldNames(c,region),m=fmMappingForRegion(c,region);
    return pmCapabilitiesFromMapping(m,names)
  }
}catch{}
try{
  pmRenderMapping=function(){
    const c=caseById(Number($('pmMappingCase')?.value))||pmCaseWithFields()[0],wrap=$('pmMappingRows');if(!c||!wrap)return;
    const region=fmRefreshMappingRegion(c),descriptors=fmDescriptorsForCase(c,region),names=[...new Set(descriptors.map(d=>d.name))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true,sensitivity:'base'})),m=fmMappingForRegion(c,region);
    const cap=pmCapabilitiesFromMapping(m,names);
    const capRows=[
      ['fields',names.length>0,String(names.length)+' '+(diagEs()?'campos':'fields')],
      ['phase',cap.phase,diagEs()?'fase':'phase'],
      ['momentum',cap.momentum,'momentum'],
      ['metadata',(c?.physicalMetadataEntries||[]).some(e=>!region||String(e.region||'')===region),diagEs()?'metadata regional':'regional metadata']
    ];
    $('pmCapabilityBar').innerHTML=capRows.map(([k,on,label])=>'<span class="pmCap '+(on?'on':'')+'">'+esc(label)+'</span>').join('');
    wrap.innerHTML=PM_ROLE_DEFS.map(role=>{
      const opts=[''].concat(names).map(n=>'<option value="'+esc(n)+'" '+(m[role.key]===n?'selected':'')+'>'+(n?esc(n):(diagEs()?'— No mapeado —':'— Not mapped —'))+'</option>').join('');
      return'<div class="pmMappingRow"><div class="pmMappingRole">'+esc(pmRoleLabel(role))+'</div><select data-pm-role="'+esc(role.key)+'">'+opts+'</select></div>'
    }).join('');
    $('pmUserRoleName').value=m.userDefinedLabel||'';
    const regionText=region|| (diagEs()?'Región por defecto':'Default region');
    $('pmMappingStatus').textContent=(diagEs()?'Mapping de FoamLens para ':'FoamLens mapping for ')+c.name+' · '+regionText+' · '+(cap.enabled?(diagEs()?'Phase/Momentum disponible.':'Phase/Momentum available.'):(diagEs()?'Aún no hay campos suficientes mapeados para esta región.':'Not enough compatible roles are mapped for this region yet.'));
    pmRefreshCapabilityVisibility()
  }
}catch{}
fmInstallMappingRegionUi();
setTimeout(()=>{try{if(typeof pmRenderMapping==='function')pmRenderMapping()}catch{}},0);
window.FoamLensFieldMappingExtension={FM_EXTRA_ROLES,fmDimensionCompatibility,fmSuggestMappingsWithMetadata,fmMappingStorageKey,fmFilterDescriptorsByRegion,fmMappingForRegion};
