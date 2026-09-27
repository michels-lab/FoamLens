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
function fmDescriptorsForCase(c){
  const discovered=c?.discoveryModel?.fields||[],seen=new Map();
  for(const d of discovered){const name=String(d?.name||d?.object||'');if(!name)continue;const old=seen.get(name)||{};seen.set(name,{name,dimensions:d?.dimensions||old.dimensions||'',kind:d?.kind||old.kind||'',storage:d?.storage||old.storage||''})}
  for(const d of c?.volumeFieldInventory||[]){const name=String(d?.name||'');if(name&&!seen.has(name))seen.set(name,{name,dimensions:d?.dimensions||'',kind:d?.kind||'',storage:'volume'})}
  return [...seen.values()]
}
fmInstallRoles();
try{
  const fmBaseMappingForCase=pmMappingForCase;
  pmMappingForCase=function(c){
    const m=fmBaseMappingForCase(c),suggest=fmSuggestMappingsWithMetadata(fmDescriptorsForCase(c),PM_ROLE_DEFS);
    for(const role of PM_ROLE_DEFS)if(!m[role.key]&&suggest[role.key])m[role.key]=suggest[role.key];
    return m
  }
}catch{}
setTimeout(()=>{try{if(typeof pmRenderMapping==='function')pmRenderMapping()}catch{}},0);
window.FoamLensFieldMappingExtension={FM_EXTRA_ROLES,fmDimensionCompatibility,fmSuggestMappingsWithMetadata};
