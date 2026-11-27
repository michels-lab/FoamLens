/* FOAMLENS_CASE_BUILDER_CORE_START */
const flCaseBuilder=(()=>{
 const schema='foamlens/case-builder/1';
 const fail=m=>{throw Error(m)};
 const num=(v,label)=>{
  if(typeof v!=='string'||!/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?$/.test(v.trim()))fail(label+': explicit decimal required');
  const n=Number(v);if(!Number.isFinite(n))fail(label+': non-finite');return Object.is(n,-0)?0:n
 };
 const word=(v,label)=>{
  if(typeof v!=='string'||!/^[A-Za-z_][A-Za-z0-9_]{0,63}$/.test(v)||/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(v))fail(label+': invalid or reserved name');return v
 };
 const key=(...a)=>a.join('/');
 function rows(raw,n,label,limit){
  if(typeof raw!=='string'||raw.length>131072)fail(label+': text limit');
  const lines=raw.split(/\r?\n/).filter(x=>x.trim());if(lines.length>limit)fail(label+': row limit');
  return lines.map((line,i)=>{const a=line.split('|').map(x=>x.trim());if(a.length!==n||a.some(x=>!x))fail(label+' row '+(i+1)+': expected '+n+' nonempty columns');return a})
 }
 function add(map,k,v,label){
  const lower=k.toLowerCase();if(map.has(lower))fail(label+': duplicate '+k);map.set(lower,{key:k,value:v})
 }
 function get(map,k,label){const hit=map.get(k.toLowerCase());if(!hit||hit.key!==k)fail(label+': unknown or case-mismatched '+k);return hit.value}
 function items(map){return [...map.values()].map(x=>x.value)}
 const dims=v=>{const a=v.trim().split(/\s+/).map(x=>num(x,'dimension'));if(a.length!==7)fail('Exactly seven SI dimension exponents required');return a};
 const same=(a,b)=>a.length===b.length&&a.every((v,i)=>v===b[i]);
 function fieldValue(raw,cls,name,dimensions){
  let v;if(cls==='volScalarField')v=num(raw,name);
  else {const a=raw.trim().split(/\s+/);if(a.length!==3)fail(name+': vector requires three components');v=a.map(x=>num(x,name))}
  if(name==='T'&&same(dimensions,[0,0,0,1,0,0,0])&&(!(typeof v==='number')||v<0))fail('T: absolute temperature cannot be below zero Kelvin');
  return v
 }
 const valueText=v=>Array.isArray(v)?'('+v.join(' ')+')':String(v);
 const header=(cls,obj,location)=>'FoamFile\n{\n    version 2.0;\n    format ascii;\n    class '+cls+';\n    location "'+location+'";\n    object '+obj+';\n}\n\n';
 function parseBoundary(raw,region,mode){
  word(region,'region');
  if(typeof raw!=='string'||raw.length>262144)fail('Boundary file exceeds 256 KiB');
  const tokens=[],lex=/\s+|\/\/[^\r\n]*|\/\*[\s\S]*?\*\/|"[^"\r\n\\]*"|[{}();]|[A-Za-z0-9_./:+-]+/gy;
  let pos=0;
  while(pos<raw.length){lex.lastIndex=pos;const m=lex.exec(raw);if(!m)fail('Unsupported boundary syntax at '+pos);const v=m[0];pos=lex.lastIndex;if(!/^\s|^\/[/*]/.test(v))tokens.push(v)}
  let i=0;const take=()=>{if(i>=tokens.length)fail('Unexpected end of boundary');return tokens[i++]},expect=v=>{if(take()!==v)fail('Expected '+v)},uint=v=>{if(!/^\d+$/.test(v)||!Number.isSafeInteger(Number(v)))fail('Invalid boundary face count');return Number(v)};
  function dict(){
   const d=Object.create(null);expect('{');
   while(tokens[i]!=='}'){
    const k=word(take(),'boundary entry');if(Object.hasOwn(d,k))fail('Duplicate boundary entry '+k);
    const values=[];let depth=0;
    while(true){const v=take();if(v===';'&&!depth)break;if(v==='{'||v==='}')fail('Nested boundary dictionaries not supported');if(v==='(')depth++;if(v===')'&&--depth<0)fail('Invalid boundary list');values.push(v)}
    if(!values.length)fail('Empty boundary entry');d[k]=values
   }
   expect('}');return d
  }
  const scalar=(d,k,required=true)=>{const v=d[k];if(!v&&!required)return null;if(!v||v.length!==1)fail('Expected single '+k);return v[0].replace(/^"|"$/g,'')};
  expect('FoamFile');const h=dict();
  if(scalar(h,'format')!=='ascii'||scalar(h,'class')!=='polyBoundaryMesh'||scalar(h,'object')!=='boundary')fail('Expected ASCII polyBoundaryMesh boundary');
  const location=scalar(h,'location',false),expected=mode==='multi'?'constant/'+region+'/polyMesh':'constant/polyMesh';
  if(location!==null&&location!==expected)fail('Boundary location does not match declared region: '+location);
  const n=uint(take());if(n<1||n>128)fail('Boundary patch count outside 1–128');expect('(');
  const out=[],seen=new Map();let cursor=null;
  for(let j=0;j<n;j++){
   const patch=word(take(),'patch'),d=dict(),type=word(scalar(d,'type'),'patch type'),start=uint(scalar(d,'startFace')),count=uint(scalar(d,'nFaces'));
   if(cursor!==null&&cursor!==start)fail('Noncontiguous boundary face ranges');cursor=start+count;if(!Number.isSafeInteger(cursor))fail('Boundary face range overflow');
   const nr=scalar(d,'neighbourRegion',false),np=scalar(d,'neighbourPatch',false);
   if(nr!==null)word(nr,'neighbour region');if(np!==null)word(np,'neighbour patch');
   const p={region,patch,type,startFace:start,nFaces:count,neighbourRegion:nr,neighbourPatch:np};
   add(seen,patch,p,'boundary patch');out.push(p)
  }
  expect(')');if(tokens[i]===';')i++;if(i!==tokens.length)fail('Unexpected trailing boundary data');return {region,location,patches:out}
 }
 function materialTables(raw,regions){
  const groups=new Map();
  for(const [region,temperature,rho,cp,k] of rows(raw,5,'Temperature-dependent materials',1000)){
   get(regions,region,'material table region');
   const a=[num(temperature,'T [K]'),num(rho,'rho'),num(cp,'Cp'),num(k,'k')];
   if(a[0]<0||a.slice(1).some(x=>x<=0))fail('Invalid material table physical value');
   const list=groups.get(region)||[];if(list.length&&a[0]<=list[list.length-1][0])fail('Temperature table must strictly increase for '+region);
   list.push(a);groups.set(region,list)
  }
  return [...groups].map(([region,values])=>{if(values.length<2)fail('Temperature table requires at least two rows per region');return {region,columns:['T_K','rho_kg_m3','Cp_J_kg_K','k_W_m_K'],values,interpolation:'piecewise linear for preview only',extrapolation:'not permitted',nativeThermoGenerated:false}})
 }
 function materialAt(table,t){
  if(typeof t!=='number'||!Number.isFinite(t)||t<table.values[0][0]||t>table.values[table.values.length-1][0])fail('Temperature outside material table range');
  const a=table.values;let i=1;while(a[i][0]<t)i++;const u=a[i-1],v=a[i],w=(t-u[0])/(v[0]-u[0]);return {T_K:t,rho_kg_m3:u[1]+w*(v[1]-u[1]),Cp_J_kg_K:u[2]+w*(v[2]-u[2]),k_W_m_K:u[3]+w*(v[3]-u[3])}
 }
 function numerics(input,regions,fields){
  const configs=new Map(),divs=new Map(),linear=new Map(),pimple=new Map(),relax=new Map(),residual=new Map();
  const integer=(v,label,min,max)=>{const n=num(v,label);if(!Number.isInteger(n)||n<min||n>max)fail(label+': expected integer '+min+'–'+max);return n};
  const choice=(v,options,label)=>{if(!options.includes(v))fail('Unsupported '+label+': '+v);return v};
  const unit=(v,label,zero=false)=>{const n=num(v,label);if(n>1||n<0||(!zero&&n===0))fail(label+': expected '+(zero?'[0,1]':'(0,1]'));return n};
  const positive=(v,label)=>{const n=num(v,label);if(n<=0)fail(label+': expected positive');return n};
  const scopes=(v,label,global=false)=>{if(v==='@global'&&global&&input.mode==='multi')return v;get(regions,v,label);return v};
  const schemes={ddt:['Euler','backward','steadyState'],grad:['Gauss linear','cellLimited Gauss linear 1'],lap:['Gauss linear corrected','Gauss linear uncorrected','Gauss linear limited 0.5'],interp:['linear'],sn:['corrected','uncorrected','limited 0.5']};
  for(const [region,ddt,grad,lap,interp,sn] of rows(input.schemes??'',6,'Numerical schemes',16)){
   scopes(region,'scheme region');choice(ddt,schemes.ddt,'ddt');choice(grad,schemes.grad,'gradient');choice(lap,schemes.lap,'laplacian');choice(interp,schemes.interp,'interpolation');choice(sn,schemes.sn,'snGrad');
   add(configs,region,{region,ddt,grad,lap,interp,sn},'numerical schemes')
  }
  for(const [region,term,scheme] of rows(input.divSchemes??'',3,'Divergence terms',256)){
   get(configs,region,'divergence scheme region');
   // Exact operator keys only. No directives, whitespace, wildcards or dictionary injection.
   if(!/^div\([A-Za-z0-9_(),*.+-]{1,160}\)$/.test(term))fail('Invalid divergence operator '+term);
   let depth=0;for(const ch of term){if(ch==='(')depth++;if(ch===')'&&--depth<0)fail('Unbalanced divergence operator')}
   if(depth!==0)fail('Unbalanced divergence operator');
   if(!['Gauss upwind','Gauss linear','Gauss limitedLinear 1','Gauss limitedLinearV 1','Gauss linearUpwind grad(U)'].includes(scheme))fail('Unsupported divergence scheme '+scheme);
   add(divs,key(region,term),{region,term,scheme},'divergence term')
  }
  for(const [region,equation,solver,method,tolerance,relTol,finalRelTol] of rows(input.linearSolvers??'',7,'Linear solvers',128)){
   get(configs,region,'linear solver region');word(equation,'equation name');
   if(/Final$/i.test(equation))fail('Use base equation name; Final entries are generated explicitly');
   const allowed={PCG:['DIC','FDIC','diagonal'],PBiCGStab:['DILU','diagonal'],GAMG:['GaussSeidel','symGaussSeidel','DICGaussSeidel','DILUGaussSeidel'],smoothSolver:['GaussSeidel','symGaussSeidel','DICGaussSeidel','DILUGaussSeidel'],diagonal:['-']};
   if(!Object.hasOwn(allowed,solver))fail('Unsupported linear solver '+solver);choice(method,allowed[solver],'solver method');
   const diagonal=solver==='diagonal';
   if(diagonal&&[tolerance,relTol,finalRelTol].some(v=>v!=='-'))fail('Diagonal solver requires - for tolerance settings');
   const tol=diagonal?null:positive(tolerance,'tolerance'),rel=diagonal?null:unit(relTol,'relTol',true),final=diagonal?null:unit(finalRelTol,'final relTol',true);
   add(linear,key(region,equation),{region,equation,solver,method,tolerance:tol,relTol:rel,finalRelTol:final},'linear equation')
  }
  for(const [region,outer,correctors,nonOrth,predictor] of rows(input.pimple??'',5,'PIMPLE',17)){
   scopes(region,'PIMPLE region',true);const global=region==='@global',r=global?null:get(regions,region,'PIMPLE region');
   if(!global)get(configs,region,'PIMPLE scheme region');
   const isSolid=r?.kind==='solid';
   if(global&&[correctors,nonOrth,predictor].some(v=>v!=='-'))fail('Global multi-region PIMPLE accepts only outer correctors');
   if(isSolid&&(correctors!=='-'||predictor!=='-'))fail('Solid PIMPLE: pressure correctors and momentum predictor must be -');
   if(!global&&input.mode==='multi'&&outer!=='-')fail('Multi-region outer correctors belong to @global');
   if(!global&&input.mode==='single'&&outer==='-')fail('Single-region outer correctors required');
   if(!global&&nonOrth==='-')fail('Regional non-orthogonal correctors required');
   if(!global&&!isSolid&&(correctors==='-'||predictor==='-'))fail('Fluid correctors and momentum predictor required');
   const out={region,outer:outer==='-'?null:integer(outer,'nOuterCorrectors',1,1000),correctors:correctors==='-'?null:integer(correctors,'nCorrectors',1,1000),nonOrth:nonOrth==='-'?null:integer(nonOrth,'nNonOrthogonalCorrectors',0,1000),predictor:predictor==='-'?null:choice(predictor,['yes','no'],'momentumPredictor')};
   if(global&&out.outer===null)fail('Global outer correctors required');
   add(pimple,region,out,'PIMPLE')
  }
  for(const [region,kind,equation,factor] of rows(input.relaxation??'',4,'Relaxation',256)){
   get(configs,region,'relaxation region');choice(kind,['fields','equations'],'relaxation kind');word(equation,'relaxation equation');
   if(linear.get(key(region,equation).toLowerCase())?.key!==key(region,equation)&&fields.get(key(region,equation).toLowerCase())?.key!==key(region,equation))fail('Relaxation target must be a declared field or linear equation');
   add(relax,key(region,kind,equation),{region,kind,equation,factor:unit(factor,'relaxation factor')},'relaxation')
  }
  for(const [region,equation,tolerance,relTol] of rows(input.residualControl??'',4,'Outer-corrector residual targets',128)){
   const eq=get(linear,key(region,equation),'residual equation');if(eq.solver==='diagonal')fail('Diagonal equation has no iterative residual target');const r=get(regions,region,'residual region');
   if(r.kind==='solid')fail('Residual control template restricted to fluid regions');
   add(residual,key(region,equation),{region,equation,tolerance:positive(tolerance,'residual tolerance'),relTol:unit(relTol,'residual relTol',true)},'residual target')
  }
  const active=configs.size>0||pimple.size>0;
  if(active){
   for(const r of items(regions)){
    get(configs,r.name,'missing schemes');get(pimple,r.name,'missing PIMPLE');
    if(!items(linear).some(x=>x.region===r.name))fail('Missing linear solver equations for '+r.name)
   }
   if(input.mode==='multi')get(pimple,'@global','missing global PIMPLE');
  }
  return {active,schemes:items(configs),divergence:items(divs),linear:items(linear),pimple:items(pimple),relaxation:items(relax),residual:items(residual),equationNamesExplicit:true,nativeExecutionVerified:false}
 }
 function numericEntries(n,mode){
  if(!n.active)return [];
  const entries=[],block=(name,lines)=>name+'\n{\n'+lines.map(l=>'    '+l).join('\n')+'\n}\n\n';
  const pimpleText=p=>block('PIMPLE',[
   p.outer===null?null:'nOuterCorrectors '+p.outer+';',
   p.correctors===null?null:'nCorrectors '+p.correctors+';',
   p.nonOrth===null?null:'nNonOrthogonalCorrectors '+p.nonOrth+';',
   p.predictor===null?null:'momentumPredictor '+p.predictor+';',
   ...(()=>{const rows=n.residual.filter(x=>x.region===p.region);return rows.length?['outerCorrectorResidualControl','{',...rows.flatMap(x=>['    '+x.equation,'    {','        tolerance '+x.tolerance+';','        relTol '+x.relTol+';','    }']),'}']:[]})()
  ].filter(x=>x!==null));
  if(mode==='multi')entries.push({name:'draft/system/fvSolution',data:header('dictionary','fvSolution','system')+pimpleText(n.pimple.find(p=>p.region==='@global'))});
  for(const c of n.schemes){
   const loc=mode==='multi'?'system/'+c.region:'system';
   const schemes=header('dictionary','fvSchemes',loc)+block('ddtSchemes',['default '+c.ddt+';'])+block('gradSchemes',['default '+c.grad+';'])+block('divSchemes',['default none;',...n.divergence.filter(x=>x.region===c.region).map(x=>x.term+' '+x.scheme+';')])+block('laplacianSchemes',['default '+c.lap+';'])+block('interpolationSchemes',['default '+c.interp+';'])+block('snGradSchemes',['default '+c.sn+';']);
   const solverLines=n.linear.filter(x=>x.region===c.region).flatMap(x=>{
    const method=['GAMG','smoothSolver'].includes(x.solver)?'smoother':'preconditioner';
    const base=['solver '+x.solver+';',...(x.tolerance===null?[]:[method+' '+x.method+';','tolerance '+x.tolerance+';','relTol '+x.relTol+';'])];
    const final=base.map(v=>v.startsWith('relTol ')?'relTol '+x.finalRelTol+';':v);
    return [x.equation,'{',...base.map(v=>'    '+v),'}',x.equation+'Final','{',...final.map(v=>'    '+v),'}']
   });
   const rr=n.relaxation.filter(x=>x.region===c.region),relaxLines=['fields','equations'].flatMap(k=>{const rows=rr.filter(x=>x.kind===k);return rows.length?[k,'{',...rows.map(x=>'    '+x.equation+' '+x.factor+';'),'}']:[]});
   const solution=header('dictionary','fvSolution',loc)+block('solvers',solverLines)+pimpleText(n.pimple.find(p=>p.region===c.region))+(relaxLines.length?block('relaxationFactors',relaxLines):'');
   entries.push({name:'draft/'+loc+'/fvSchemes',data:schemes},{name:'draft/'+loc+'/fvSolution',data:solution})
  }
  return entries
 }
 function physicalDrafts(input,regions,fields,interfaces){
  const sources=new Map(),contact=new Map();
  for(const [region,name,zone,ts,tl,ae,latent,rho,beta,cu,q,relax,mode,cp,g] of rows(input.phaseModels??'',15,'Solidification models',16)){
   const r=get(regions,region,'phase region');word(name,'model name');
   if(r.kind!=='fluid')fail('Solidification momentum/energy model requires a fluid region');
   if(!['fluid','incompressibleFluid'].includes(r.solver))fail('Unsupported phase solver module');
   if(zone!=='-')word(zone,'cellZone');
   get(fields,key(region,'T'),'phase temperature');get(fields,key(region,'U'),'phase velocity');
   const v={region,name,zone:zone==='-'?null:zone,Tsol:num(ts,'Tsol'),Tliq:num(tl,'Tliq'),alpha1e:num(ae,'alpha1e'),L:num(latent,'L'),rhoRef:num(rho,'rhoRef'),beta:num(beta,'beta'),Cu:num(cu,'Cu'),q:num(q,'q'),relax:num(relax,'relax'),thermoMode:mode,CpRef:cp==='-'?null:num(cp,'CpRef'),g:g.split(/\s+/).map(x=>num(x,'gravity'))};
   if(v.Tsol<=0||v.Tliq<v.Tsol||v.alpha1e<0||v.alpha1e>=1||(v.Tsol===v.Tliq&&v.alpha1e!==0)||v.L<=0||v.rhoRef<=0||v.Cu<=0||v.q<=0||v.relax<=0||v.relax>1||v.g.length!==3)fail('Invalid solidification parameters');
   if(!['thermo','lookup'].includes(mode)||(mode==='thermo'&&v.CpRef!==null)||(mode==='lookup'&&!(v.CpRef>0)))fail('Thermo mode requires - CpRef; lookup requires explicit positive CpRef');
   if(mode==='thermo'&&r.solver!=='fluid'||mode==='lookup'&&r.solver!=='incompressibleFluid')fail('Phase thermo mode conflicts with selected supported module');
   v.phaseField=name+':alpha1';v.nativeExecutionVerified=false;v.zoneVerified=false;
   add(sources,region,v,'one phase model per region')
  }
  for(const [region,patch,mode,value,extra] of rows(input.contactResistance??'',5,'Thermal resistance',128)){
   const a=interfaces.get(key(region,patch));if(!a)fail('Contact resistance requires reciprocal mappedWall');
   const b=key(a.neighbourRegion,a.neighbourPatch);
   let resistance,thickness=null,kappa=null,h=null;
   if(input.version==='13'){
    if(mode!=='layers')fail('Foundation 13 requires layers mode');
    thickness=value.split(/\s+/).map(x=>num(x,'thickness'));kappa=extra.split(/\s+/).map(x=>num(x,'kappa'));
    if(thickness.length!==kappa.length||thickness.length>16||thickness.some(x=>x<=0)||kappa.some(x=>x<=0))fail('Invalid layer thickness/conductivity pairs');
    resistance=thickness.reduce((sum,x,i)=>sum+x/kappa[i],0);
   }else{
    if(mode!=='h'||extra!=='-')fail('Foundation 14 requires h mode and - extra');
    h=num(value,'h');if(h<=0)fail('h must be positive');resistance=1/h;
   }
   if(!Number.isFinite(resistance)||resistance<=0||!Number.isFinite(1/resistance))fail('Non-finite thermal resistance');
   const v={region,patch,mode,thickness,kappa,h,resistance_m2K_W:resistance,equivalentH_W_m2K:1/resistance,nativeExecutionVerified:false};
   add(contact,key(region,patch),v,'contact side');
  }
  // Each wall has its own resistance. Require explicit entries on both sides if used,
  // never mirror an input or assume a total interface conductance.
  for(const c of items(contact)){
   const a=interfaces.get(key(c.region,c.patch));
   if(!contact.has(key(a.neighbourRegion,a.neighbourPatch).toLowerCase()))fail('Specify resistance independently on both coupled patch sides');
  }
  return {phaseModels:items(sources),contactResistance:items(contact),nativeExecutionVerified:false}
 }
 function phaseEntries(physics,mode){
  return physics.phaseModels.map(m=>{
   const loc=mode==='multi'?'constant/'+m.region:'constant';
   const data=header('dictionary','fvModels',loc)+m.name+'\n{\n    type solidificationMelting;\n'+'    cellZone '+(m.zone||'all')+';\n'+
    ['Tsol','Tliq','alpha1e','L','rhoRef','beta','Cu','q','relax','thermoMode'].map(k=>'    '+k+' '+m[k]+';\n').join('')+
    (m.CpRef===null?'':'    Cp CpRef;\n    CpRef '+m.CpRef+';\n')+'    g ('+m.g.join(' ')+');\n}\n';
   return {name:'draft/'+loc+'/fvModels',data}
  })
 }
 function contactText(physics,region,patch){
  const c=physics.contactResistance.find(x=>x.region===region&&x.patch===patch);
  if(!c)return '';
  return c.mode==='layers'?'        thicknessLayers ('+c.thickness.join(' ')+');\n        kappaLayers ('+c.kappa.join(' ')+');\n':'        h uniform '+c.h+';\n'
 }
 function phasePreview(m,temperature){
  if(!Number.isFinite(temperature)||temperature<0)fail('Invalid preview temperature');
  // Equilibrium construction, not the time-dependent fvModel solution. At
  // isothermal or eutectic plateau Tsol no unique fraction exists.
  if(temperature===m.Tsol)return {T_K:temperature,alphaLiquid:null,range:[0,m.Tliq===m.Tsol?1:m.alpha1e],note:'isothermal plateau; fraction depends on enthalpy/history'};
  const liquid=temperature<m.Tsol?0:temperature>=m.Tliq?1:m.alpha1e+(1-m.alpha1e)*(temperature-m.Tsol)/(m.Tliq-m.Tsol);
  return {T_K:temperature,alphaLiquid:liquid,alphaSolid:1-liquid,latentEnthalpy_J_kg:liquid*m.L,note:'equilibrium preview only; not transient CFD'}
 }
 function executionPlan(input,regionList,fields,physics,numerical){
  const multi=input.mode==='multi',app=multi?'foamMultiRun':'foamRun',required=['system/controlDict','system/fvSolution'];
  for(const r of regionList){
   const system=multi?'system/'+r.name:'system',constant=multi?'constant/'+r.name:'constant',zero=multi?'0/'+r.name:'0';
   if(multi)required.push(system+'/fvSolution');required.push(system+'/fvSchemes');
   for(const file of ['points','faces','owner','neighbour','boundary'])required.push(constant+'/polyMesh/'+file);
   for(const field of items(fields).filter(f=>f.region===r.name))required.push(zero+'/'+field.name);
   if(physics.phaseModels.some(m=>m.region===r.name))required.push(constant+'/fvModels');
   if(physics.phaseModels.some(m=>m.region===r.name&&m.zone&&m.zone!=='all'))required.push(constant+'/polyMesh/cellZones');
   if(r.kind==='solid'||r.solver==='fluid')required.push(constant+'/physicalProperties');if(r.kind==='fluid')required.push(constant+'/momentumTransport')
  }
  return {version:input.version,application:app,requiredFiles:[...new Set(required)],regionalMeshChecks:multi?regionList.map(r=>r.name):[],dictionaryDraftsGenerated:numerical.active,meshPreflight:'strict-allTopology-allGeometry',executionMode:'manual trusted candidate, isolated copy, serial only',runtimeVerified:false,solverReady:false}
 }
 function executionScript(plan){
  const required=plan.requiredFiles.map(v=>"'"+v+"'").join(' '),regions=plan.regionalMeshChecks.map(v=>"'"+v+"'").join(' ');
  return [
   '#!/usr/bin/env bash','set -eo pipefail','umask 077',
   'fail(){ printf "FoamLens: %s\\n" "$*" >&2; exit 1; }',
   '[[ $# -eq 2 ]] || fail "Usage: bash prepare-run.sh /path/to/trusted-complete-case --check|--run"',
   '[[ "$2" == --check || "$2" == --run ]] || fail "Choose --check or --run explicitly"',
   '[[ "${WM_PROJECT:-}" == OpenFOAM && "${WM_PROJECT_VERSION:-}" == '+plan.version+' ]] || fail "Source the matching Foundation environment first"',
   'for tool in foamDictionary checkMesh '+plan.application+' realpath mktemp cp find tee awk; do command -v "$tool" >/dev/null || fail "Missing tool $tool"; done',
   'src="$(realpath -e -- "$1")" || fail "Case does not exist"',
   '[[ -d "$src" ]] || fail "Case directory required"',
   'for dir in 0 constant system; do [[ -d "$src/$dir" && ! -L "$src/$dir" ]] || fail "Missing regular directory $dir"; done',
   'bad="$(find "$src/0" "$src/constant" "$src/system" ! -type d ! -type f -print -quit)"',
   '[[ -z "$bad" ]] || fail "Special file or symlink rejected: $bad"',
   'for file in '+required+'; do [[ -f "$src/$file" && -s "$src/$file" ]] || fail "Missing required uncompressed file: $file"; done',
   'work="$(mktemp -d /tmp/foamlens-run.XXXXXXXX)"','caseDir="$work/case"','mkdir -- "$caseDir" "$work/logs"',
   'printf "Isolated case: %s\\n" "$caseDir"','cp -a -- "$src/0" "$src/constant" "$src/system" "$caseDir/"',
   'cd -- "$caseDir"','printf "%s\\n" "$WM_PROJECT_VERSION" > "$work/logs/foundation-version.txt"',
   'app="$(foamDictionary system/controlDict -entry application -value)"',
   '[[ "$app" == '+plan.application+' ]] || fail "Unexpected application: $app"',
   'for file in '+required+'; do case "$file" in system/*|*/physicalProperties|*/fvModels|*/momentumTransport) foamDictionary "$file" > /dev/null || fail "Dictionary rejected: $file";; esac; done',
   'run_mesh(){ local label="$1"; shift; local log="$work/logs/checkMesh-$label.log"; checkMesh -case "$caseDir" "$@" -allTopology -allGeometry -noFunctionObjects 2>&1 | tee "$log" || fail "checkMesh command or log write failed for $label";',
   '  LC_ALL=C awk \'/^[[:space:]]*Mesh OK\\.[[:space:]]*$/{ok++} /^[[:space:]]*End[[:space:]]*$/{ends++} /^[[:space:]]*Failed[[:space:]]+[0-9]+[[:space:]]+mesh checks?\\.[[:space:]]*$|FOAM FATAL|^[[:space:]]*(Floating point exception|Segmentation fault)([[:space:]]|$)/{bad=1} END{exit !(ok==1 && ends==1 && !bad)}\' "$log" || fail "Strict mesh quality evidence rejected for $label";',
   '  printf "%s\\n" "strict-mesh-ok-reported" > "$work/logs/checkMesh-$label.status"; }',
   ...(regions?['for region in '+regions+'; do run_mesh "$region" -region "$region"; done']:['run_mesh default']),
   'printf "Strict topology and geometry checks completed. This does not certify physics or solver compatibility.\\n"',
   '[[ "$2" == --run ]] || { printf "Check-only; no solver launched. Logs: %s\\n" "$work/logs"; exit 0; }',
   'printf "Launching serial solver in isolated copy only. Stop with Ctrl+C.\\n"',
   'set +e',plan.application+' -case "$caseDir" -noFunctionObjects 2>&1 | tee "$work/logs/solver.log"',
   'status=$?','set -e','printf "%s\\n" "$status" > "$work/logs/pipeline-exit-code.txt"',
   'printf "Solver/log pipeline exit code %s; logs: %s\\n" "$status" "$work/logs"','exit "$status"',''
  ].join('\n')
 }
 function inspectRunLog(raw){
  if(typeof raw!=='string'||raw.length>8*1024*1024)fail('Log text exceeds 8 MiB');
  const number='[-+]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][-+]?\\d+)?',timeRx=new RegExp('^\\s*Time\\s*=\\s*('+number+')\\s*(?:s)?\\s*$'),dtRx=new RegExp('^\\s*deltaT\\s*=\\s*('+number+')'),resRx=new RegExp('Solving for\\s+([^,]+),\\s*Initial residual\\s*=\\s*('+number+'),\\s*Final residual\\s*=\\s*('+number+'),\\s*No Iterations\\s+(\\d+)'),coRx=new RegExp('Courant Number mean:\\s*('+number+')\\s+max:\\s*('+number+')');
  let time=null,dt=null,region=null,lastTime=null,steps=0,ends=0,fatal=0,nonfinite=0,rows=[],courant=[];
  for(const line of raw.split(/\r?\n/)){
   let m;if((m=timeRx.exec(line))){time=Number(m[1]);if(!Number.isFinite(time)){time=null;nonfinite++;continue}lastTime=time;steps++;region=null}
   else if((m=/^\s*Solving for (?:fluid|solid) region\s+([A-Za-z_][A-Za-z0-9_]*)\s*$/.exec(line)))region=m[1];
   else if((m=dtRx.exec(line))){dt=Number(m[1]);if(!Number.isFinite(dt)){dt=null;nonfinite++}}
   else if((m=resRx.exec(line))){const a=[Number(m[2]),Number(m[3]),Number(m[4])];if(a.every(Number.isFinite)&&rows.length<50000)rows.push({time,region,field:m[1].trim(),initial:a[0],final:a[1],iterations:a[2]});else if(!a.every(Number.isFinite))nonfinite++}
   else if((m=coRx.exec(line))){const a=[Number(m[1]),Number(m[2])];if(a.every(Number.isFinite)&&courant.length<50000)courant.push({time,mean:a[0],max:a[1]});else if(!a.every(Number.isFinite))nonfinite++}
   if(/FOAM FATAL/i.test(line)||/^\s*(?:Floating point exception|Segmentation fault)(?:\s|$)/i.test(line))fatal++;
   if(/(?:residual\s*=\s*|deltaT\s*=\s*|Courant Number mean:\s*|\bmax:\s*|^\s*Time\s*=\s*)[-+]?(?:nan|inf(?:inity)?)(?:\b|,)/i.test(line)){nonfinite++;if(/^\s*Time\s*=/.test(line)){time=null;region=null}if(/^\s*deltaT\s*=/.test(line))dt=null}
   if(/^\s*End\s*$/.test(line))ends++;
  }
  return {lastTime,lastDeltaT:Number.isFinite(dt)?dt:null,timeSteps:steps,normalEndMarkers:ends,fatalMarkers:fatal,nonfiniteMarkers:nonfinite,residualRows:rows,courantRows:courant,truncated:rows.length===50000||courant.length===50000,runSuccessVerified:false}
 }
 function compareRunLogs(a,b,selection){
  if(!a||!b||!selection||!['initial','final','iterations'].includes(selection.metric)||typeof selection.field!=='string'||!selection.field||!(selection.region===null||typeof selection.region==='string'))fail('Select exact residual field, region and metric');
  const extract=log=>{
   const byTime=new Map(),duplicates=new Set();let missingTime=0,invalid=0,previous=null,restart=false;
   for(const row of log.residualRows){
    if(row.field!==selection.field||row.region!==selection.region)continue;
    if(!Number.isFinite(row.time)){missingTime++;continue}
    if(previous!==null&&row.time<previous)restart=true;
    previous=row.time;
    const value=row[selection.metric];if(!Number.isFinite(value)||value<0){invalid++;continue}
    if(byTime.has(row.time))duplicates.add(row.time);
    byTime.set(row.time,value);
   }
   return {byTime,duplicates:duplicates.size,missingTime,invalid,restart}
  };
  const aa=extract(a),bb=extract(b);
  if(aa.restart||bb.restart)fail('Non-monotonic selected time history: split restarted logs before comparison');
  if(a.truncated||b.truncated)fail('Truncated log evidence: comparison would be incomplete');
  const times=[...new Set([...aa.byTime.keys(),...bb.byTime.keys()])].sort((x,y)=>x-y);
  const rows=times.map(time=>{const A=aa.byTime.get(time)??null,B=bb.byTime.get(time)??null;return {time,A,B,delta_B_minus_A:A===null||B===null?null:B-A}});
  const pairs=rows.filter(r=>r.A!==null&&r.B!==null);
  return {selection:{...selection},alignment:'exact physical time, no interpolation; last recorded solve per selected field/region/time',rows,matched:pairs.length,onlyA:rows.filter(r=>r.A!==null&&r.B===null).length,onlyB:rows.filter(r=>r.A===null&&r.B!==null).length,duplicateTimesA:aa.duplicates,duplicateTimesB:bb.duplicates,missingTimeA:aa.missingTime,missingTimeB:bb.missingTime,invalidA:aa.invalid,invalidB:bb.invalid,sourceFatalMarkers:[a.fatalMarkers,b.fatalMarkers],sourceNonfiniteMarkers:[a.nonfiniteMarkers,b.nonfiniteMarkers],meanAbsoluteDifference:pairs.length?pairs.reduce((avg,r,i)=>avg+(Math.abs(r.delta_B_minus_A)-avg)/(i+1),0):null,runSuccessVerified:false,physicalEquivalenceVerified:false}
 }
 function comparisonCsv(report){
  return 'time_s,A,B,delta_B_minus_A\n'+report.rows.map(r=>[r.time,r.A??'',r.B??'',r.delta_B_minus_A??''].join(',')).join('\n')+'\n'
 }
 function residualSelections(a,b){
  const map=new Map();
  for(const log of [a,b])for(const r of log?.residualRows??[]){const k=JSON.stringify([r.region,r.field]);if(!map.has(k))map.set(k,{region:r.region,field:r.field})}
  return [...map.values()].sort((x,y)=>JSON.stringify(x).localeCompare(JSON.stringify(y)))
 }
 function build(input){
  if(!input||!['13','14'].includes(input.version)||!['single','multi'].includes(input.mode))fail('Select Foundation 13/14 and case mode');
  const end=num(input.endTime,'endTime'),dt=num(input.deltaT,'deltaT'),write=num(input.writeInterval,'writeInterval');
  if(end<=0||dt<=0||dt>end||write<=0||write>end)fail('Require 0 < deltaT, writeInterval <= endTime');
  const regions=new Map(),patches=new Map(),fields=new Map(),conditions=new Map(),materials=new Map(),inventories=new Map(),interfaces=new Map();
  for(const [name,kind,solver] of rows(input.regions,3,'Regions',16)){
   word(name,'region');word(solver,'solver module');if(!['fluid','solid'].includes(kind))fail('Region role must be fluid or solid');
   add(regions,name,{name,kind,solver},'region')
  }
  const regionList=items(regions);
  if(input.mode==='single'?regionList.length!==1:regionList.length<2)fail('Single mode requires one region; multi mode requires at least two');
  for(const [region,patch,type] of rows(input.patches,3,'Patches',128)){
   get(regions,region,'patch region');word(patch,'patch');
   if(!['patch','wall','empty','symmetryPlane','symmetry','wedge','mappedWall'].includes(type))fail('Unsupported mesh patch type '+type+'; only explicit mappedWall coupling is supported');
   add(patches,key(region,patch),{region,patch,type},'patch')
  }
  for(const region of regionList)if(!items(patches).some(p=>p.region===region.name))fail('No patches declared for '+region.name);
  const sourceFiles=input.boundarySources??[];
  if(!Array.isArray(sourceFiles)||sourceFiles.length>16)fail('Invalid boundary sources');
  for(const src of sourceFiles){
   if(!src||typeof src.region!=='string')fail('Invalid boundary source region');get(regions,src.region,'boundary source region');
   const inv=parseBoundary(src.text,src.region,input.mode);add(inventories,src.region,inv,'boundary source');
   const declared=items(patches).filter(p=>p.region===src.region);
   if(declared.length!==inv.patches.length||declared.some(p=>!inv.patches.some(q=>q.patch===p.patch&&q.type===p.type)))fail('Declared patches do not exactly match imported boundary for '+src.region)
  }
  for(const p of items(patches).filter(p=>p.type==='mappedWall')){
   if(input.mode!=='multi')fail('Mapped thermal interfaces require multi-region mode');
   const inv=get(inventories,p.region,'mappedWall boundary source'),a=inv.patches.find(q=>q.patch===p.patch);
   if(!a.neighbourRegion||!a.neighbourPatch||a.neighbourRegion===p.region||a.nFaces===0)fail('Mapped patch requires explicit nonempty cross-region neighbour');
   const b=get(inventories,a.neighbourRegion,'neighbour boundary source').patches.find(q=>q.patch===a.neighbourPatch);
   if(!b||b.type!=='mappedWall'||b.neighbourRegion!==a.region||b.neighbourPatch!==a.patch||b.nFaces===0)fail('Mapped wall neighbours must be reciprocal');
   get(patches,key(b.region,b.patch),'neighbour declared patch');
   interfaces.set(key(p.region,p.patch),{region:p.region,patch:p.patch,neighbourRegion:b.region,neighbourPatch:b.patch,faces:a.nFaces,neighbourFaces:b.nFaces,geometryVerified:false})
  }
  for(const [region,name,cls,dimension,initial] of rows(input.fields,5,'Fields',64)){
   get(regions,region,'field region');word(name,'field');
   if(!['volScalarField','volVectorField'].includes(cls))fail('Unsupported field class '+cls);
   const dimensions=dims(dimension);
   if(name==='T'&&(cls!=='volScalarField'||!same(dimensions,[0,0,0,1,0,0,0])))fail('T must be scalar with Kelvin dimensions');
   if(name==='U'&&(cls!=='volVectorField'||!same(dimensions,[0,1,-1,0,0,0,0])))fail('U must be vector with velocity dimensions');
   add(fields,key(region,name),{region,name,cls,dimensions,initial:fieldValue(initial,cls,name,dimensions)},'field')
  }
  for(const region of regionList)if(!items(fields).some(f=>f.region===region.name))fail('No fields declared for '+region.name);
  for(const [region,name,patch,type,value] of rows(input.boundaries,5,'Boundary conditions',900)){
   const f=get(fields,key(region,name),'boundary field'),p=get(patches,key(region,patch),'boundary patch');
   if(p.type==='mappedWall'&&name==='T'){
    if(type!=='coupledTemperature'||!interfaces.has(key(region,patch)))fail('Mapped temperature requires reciprocal coupledTemperature');
   }else if(['patch','wall','mappedWall'].includes(p.type)){
    if(!['fixedValue','zeroGradient'].includes(type))fail('Unsupported boundary condition '+type+' on '+p.type)
   }else if(type!==p.type)fail('Constraint patch '+patch+' requires '+p.type);
   const v=['fixedValue','coupledTemperature'].includes(type)?fieldValue(value,f.cls,name,f.dimensions):null;
   if(v===null&&value!=='-')fail('Use - for a condition without a value');
   add(conditions,key(region,name,patch),{region,name,patch,type,value:v},'boundary condition')
  }
  for(const f of items(fields))for(const p of items(patches).filter(p=>p.region===f.region))get(conditions,key(f.region,f.name,p.patch),'missing boundary condition');
  for(const p of interfaces.values()){get(fields,key(p.region,'T'),'coupled temperature field');get(conditions,key(p.region,'T',p.patch),'coupled temperature BC')}
  const tables=materialTables(input.materialTables??'',regions);
  for(const [region,name,rho,cp,k] of rows(input.materials,5,'Materials',16)){
   get(regions,region,'material region');word(name,'material');
   const values=[num(rho,'density kg/m3'),num(cp,'Cp J/kg/K'),num(k,'conductivity W/m/K')];
   if(values.some(x=>x<=0))fail('Material properties must be positive');
   add(materials,region,{region,name,density_kg_m3:values[0],Cp_J_kg_K:values[1],conductivity_W_m_K:values[2]},'material')
  }
  const nativeSolids=new Map();
  for(const [region,rho,cv,k,molWeight,hf] of rows(input.solidProperties??'',6,'Native constant solid properties',16)){
   const r=get(regions,region,'solid material region');
   if(r.kind!=='solid'||r.solver!=='solid')fail('Constant solid template requires solid region and solid solver module');
   get(fields,key(region,'T'),'solid temperature field');
   if(tables.some(t=>t.region===region))fail('Constant native solid and variable table conflict for '+region);
   const vals=[num(rho,'rho kg/m3'),num(cv,'Cv J/kg/K'),num(k,'k W/m/K'),num(molWeight,'molWeight kg/kmol'),num(hf,'hf J/kg')];
   if(vals.slice(0,4).some(v=>v<=0))fail('rho, Cv, k and molWeight must be positive');
   const notes=materials.get(region.toLowerCase())?.value;
   if(notes&&(notes.density_kg_m3!==vals[0]||notes.conductivity_W_m_K!==vals[2]))fail('Constant solid properties conflict with material reference notes');
   add(nativeSolids,region,{region,rho:vals[0],Cv:vals[1],kappa:vals[2],molWeight:vals[3],hf:vals[4],model:'heSolidThermo / pureMixture / constIsoSolid / eConst / rhoConst',nativeExecutionVerified:false},'native solid material')
  }
  const nativeFluids=new Map();
  for(const [region,rho,cp,mu,pr,molWeight,hf] of rows(input.fluidProperties??'',7,'Native constant fluid properties',16)){
   const r=get(regions,region,'fluid material region');
   if(r.kind!=='fluid'||r.solver!=='fluid')fail('Constant fluid template requires fluid region and fluid solver module');
   get(fields,key(region,'T'),'fluid temperature field');get(fields,key(region,'U'),'fluid velocity field');
   if(tables.some(t=>t.region===region))fail('Constant native fluid and variable table conflict for '+region);
   const vals=[num(rho,'rho kg/m3'),num(cp,'Cp J/kg/K'),num(mu,'mu Pa s'),num(pr,'Pr'),num(molWeight,'molWeight kg/kmol'),num(hf,'hf J/kg')];
   if(vals.slice(0,5).some(v=>v<=0))fail('rho, Cp, mu, Pr and molWeight must be positive');
   const k=vals[1]*vals[2]/vals[3];
   if(!Number.isFinite(k)||k<=0)fail('Invalid implied thermal conductivity');
   const notes=materials.get(region.toLowerCase())?.value;
   if(notes&&(notes.density_kg_m3!==vals[0]||notes.Cp_J_kg_K!==vals[1]||Math.abs(notes.conductivity_W_m_K-k)>1e-9*Math.max(notes.conductivity_W_m_K,k)))fail('Constant fluid properties conflict with reference notes (k=Cp*mu/Pr)');
   add(nativeFluids,region,{region,rho:vals[0],Cp:vals[1],mu:vals[2],Pr:vals[3],molWeight:vals[4],hf:vals[5],impliedK_W_m_K:k,momentumTransport:'laminar',model:'heRhoThermo / pureMixture / const / hConst / rhoConst / sensibleEnthalpy',nativeExecutionVerified:false},'native fluid material')
  }
  const physics=physicalDrafts(input,regions,fields,interfaces);
  const numerical=numerics(input,regions,fields);
  const adaptive=input.adaptiveTime??'off';if(!['off','on'].includes(adaptive))fail('Invalid adaptive time selection');
  let adaptiveSettings=null;
  if(adaptive==='on'){
   if(!regionList.some(r=>r.kind==='fluid'))fail('Adaptive Courant control requires a fluid region');
   const maxCo=num(input.maxCo,'maxCo'),maxDeltaT=num(input.maxDeltaT,'maxDeltaT');
   if(maxCo<=0||maxDeltaT<dt||maxDeltaT>end)fail('Require positive maxCo and deltaT <= maxDeltaT <= endTime');
   if(numerical.schemes.some(c=>c.ddt==='steadyState'))fail('Adaptive time control conflicts with steadyState');
   adaptiveSettings={maxCo,maxDeltaT,nativeRuntimeVerified:false}
  }else if((input.maxCo??'').trim()||(input.maxDeltaT??'').trim())fail('Clear adaptive limits or enable adaptive time');
  const multi=input.mode==='multi',entries=[];
  const control=header('dictionary','controlDict','system')+'application '+(multi?'foamMultiRun':'foamRun')+';\n'+
    (multi?'regionSolvers\n{\n'+regionList.map(r=>'    '+r.name+' '+r.solver+';').join('\n')+'\n}\n':'solver '+regionList[0].solver+';\n')+
    'startFrom startTime;\nstartTime 0;\nstopAt endTime;\nendTime '+end+';\ndeltaT '+dt+';\n'+(adaptiveSettings?'adjustTimeStep yes;\nmaxCo '+adaptiveSettings.maxCo+';\nmaxDeltaT '+adaptiveSettings.maxDeltaT+';\n':'')+'writeControl '+(adaptiveSettings?'adjustableRunTime':'runTime')+';\nwriteInterval '+write+';\nwriteFormat ascii;\nwritePrecision 10;\nwriteCompression off;\ntimeFormat general;\ntimePrecision 12;\nrunTimeModifiable false;\n';
  entries.push({name:'draft/system/controlDict',data:control},...numericEntries(numerical,input.mode),...phaseEntries(physics,input.mode));
  for(const f of items(fields)){
   const location=multi?'0/'+f.region:'0';
   const bc=items(patches).filter(p=>p.region===f.region).map(p=>get(conditions,key(f.region,f.name,p.patch),'boundary'));
   const data=header(f.cls,f.name,location)+'dimensions ['+f.dimensions.join(' ')+'];\ninternalField uniform '+valueText(f.initial)+';\n\nboundaryField\n{\n'+
     bc.map(b=>'    '+b.patch+'\n    {\n        type '+b.type+';\n'+(b.type==='coupledTemperature'?contactText(physics,f.region,b.patch):'')+(b.value!==null?'        value uniform '+valueText(b.value)+';\n':'')+'    }').join('\n')+'\n}\n';
   entries.push({name:'draft/'+location+'/'+f.name,data})
  }
  for(const m of items(nativeSolids)){
   const loc=multi?'constant/'+m.region:'constant';
   const data=header('dictionary','physicalProperties',loc)+
    'thermoType\n{\n    type heSolidThermo;\n    mixture pureMixture;\n    transport constIsoSolid;\n    thermo eConst;\n    equationOfState rhoConst;\n    specie specie;\n    energy sensibleInternalEnergy;\n}\n\nmixture\n{\n    specie { molWeight '+m.molWeight+'; }\n    equationOfState { rho '+m.rho+'; }\n    transport { kappa '+m.kappa+'; }\n    thermodynamics { hf '+m.hf+'; Cv '+m.Cv+'; }\n}\n';
   entries.push({name:'draft/'+loc+'/physicalProperties',data})
  }
  for(const m of items(nativeFluids)){
   const loc=multi?'constant/'+m.region:'constant';
   const data=header('dictionary','physicalProperties',loc)+
    'thermoType\n{\n    type heRhoThermo;\n    mixture pureMixture;\n    transport const;\n    thermo hConst;\n    equationOfState rhoConst;\n    specie specie;\n    energy sensibleEnthalpy;\n}\n\nmixture\n{\n    specie { molWeight '+m.molWeight+'; }\n    equationOfState { rho '+m.rho+'; }\n    thermodynamics { Cp '+m.Cp+'; hf '+m.hf+'; }\n    transport { mu '+m.mu+'; Pr '+m.Pr+'; }\n}\n';
   entries.push({name:'draft/'+loc+'/physicalProperties',data},{name:'draft/'+loc+'/momentumTransport',data:header('dictionary','momentumTransport',loc)+'simulationType laminar;\n'})
  }
  for(const table of tables)entries.push({name:'material-data/'+table.region+'.csv',data:table.columns.join(',')+'\n'+table.values.map(v=>v.join(',')).join('\n')+'\n'});
  const execution=executionPlan(input,regionList,fields,physics,numerical);
  entries.push({name:'execution/prepare-run.sh',data:executionScript(execution)},{name:'execution/README.txt',data:'Trusted complete candidate only. Complete missing dictionaries and mesh yourself. Source the selected Foundation environment in WSL. Run bash execution/prepare-run.sh /path/to/complete-case --check; use --run only when explicitly ready. Script copies 0/constant/system to new /tmp directory, strict checkMesh -allTopology -allGeometry and serial solver; no parallel, restart or native app launch. Review includes, libraries and coded entries before running; this is not a sandbox for untrusted cases. Logs remain in /tmp until you save them. Never supply your original as a target to modify.\n'});
  const manifest={schema,version:input.version,mode:input.mode,regions:regionList,patches:items(patches),fields:items(fields),boundaryConditions:items(conditions),materials:items(materials),materialTables:tables,numerics:numerical,physics,execution,nativeConstantSolidDrafts:items(nativeSolids),nativeConstantFluidDrafts:items(nativeFluids),importedPatchInventories:items(inventories),allDeclaredPatchInventoriesMatched:inventories.size===regionList.length,thermalInterfaces:[...interfaces.values()],time:{startTime:0,endTime:end,deltaT:dt,writeControl:adaptiveSettings?'adjustableRunTime':'runTime',writeInterval:write,adaptive:adaptiveSettings},materialUnits:'SI constant reference values and temperature tables only, not OpenFOAM thermo dictionaries',meshPatchInventoryVerified:false,solverModulesVerified:false,physicalModelValidated:false,solverReady:false,originalCaseModified:false,missing:['actual full mesh topology and interface geometry verification','remaining solver-specific physicalProperties and variable thermophysical models',numerical.active?'solver-required numerical equation coverage and native dictionary validation':'fvSchemes and fvSolution','native thermophysical transport, contact resistance and any solver-required fields or dictionaries','native OpenFOAM parsing and execution validation']};
  entries.push({name:'manifest.json',data:JSON.stringify(manifest,null,2)+'\n'},{name:'case-builder.json',data:JSON.stringify({schema,input},null,2)+'\n'},{name:'README.txt',data:'DRAFT ONLY. This is not a runnable or validated OpenFOAM case. No solver run or mesh geometry generated. Only explicitly selected constant solid/fluid physicalProperties drafts may be present; other material models require manual completion. Reciprocal mappedWall names and coupled temperature draft entries do not validate geometric mapping or heat balance. Compare every declared patch to original polyMesh/boundary and complete the missing files listed in manifest.json. Extract to a new folder; never overlay an existing case without review.\n'});
  return {manifest,entries}
 }
 return Object.freeze({build,schema,parseBoundary,materialAt,phasePreview,inspectRunLog,compareRunLogs,comparisonCsv,residualSelections})
})();
/* FOAMLENS_CASE_BUILDER_CORE_END */
function flMountCaseBuilder(){
 const anchor=document.getElementById('cgOpenFoamPrepPreview');if(!anchor||document.getElementById('flCaseBuilderPanel'))return;
 const t=(a,b)=>cgEscape(cgUi(a,b)),panel=document.createElement('details');panel.id='flCaseBuilderPanel';
 panel.style.cssText='margin:12px 0;padding:12px;border:1px solid var(--line);border-radius:10px';
 const area=(id,title,example)=>'<label style="display:block;margin-top:8px">'+title+'<textarea id="'+id+'" rows="3" style="display:block;width:100%;box-sizing:border-box" placeholder="'+cgEscape(example)+'"></textarea></label>';
 panel.innerHTML='<summary><b>'+t('Case Builder · Foundation 13/14','Constructor de casos · Foundation 13/14')+'</b></summary>'+
 '<p class="cgNotice">'+t('Draft only. Explicit SI values and exact patch names. No mesh, solver execution, inferred BC, or physical certification. One row per item, columns separated by |.','Solo borrador. Valores SI explícitos y nombres exactos de patches. Sin malla, ejecución, BC inferidas ni certificación física. Una fila por elemento, columnas separadas por |.')+'</p>'+
 '<div class="cgTools"><label>Foundation <select id="flCbVersion"><option value="13">13</option><option value="14">14</option></select></label><label>'+t('Mode','Modo')+' <select id="flCbMode"><option value="single">'+t('Single region','Una región')+'</option><option value="multi">'+t('Multi-region','Multirregión')+'</option></select></label>'+
 ['End','Delta','Write'].map((x,i)=>'<label>'+['endTime [s]','deltaT [s]','writeInterval [s]'][i]+' <input id="flCb'+x+'" inputmode="decimal" placeholder="—"></label>').join('')+'</div>'+
 '<div class="cgTools"><label>'+t('Adaptive time','Tiempo adaptativo')+' <select id="flCbAdaptiveTime"><option value="off">'+t('Off','Desactivado')+'</option><option value="on">'+t('On · fluid Courant','Activado · Courant del fluido')+'</option></select></label><label>maxCo <input id="flCbMaxCo" inputmode="decimal"></label><label>maxDeltaT [s] <input id="flCbMaxDeltaT" inputmode="decimal"></label></div><p class="cgNotice">'+t('Adaptive settings are explicit limits; actual solver time-step control is not validated.','Límites adaptativos explícitos; control temporal real del solver no validado.')+'</p>'+
 area('flCbRegions',t('Regions: name | fluid/solid | solver module','Regiones: nombre | fluid/solid | módulo solver'),'metal | fluid | fluid')+
 area('flCbPatches',t('Declared mesh patches: region | patch | mesh type','Patches declarados: región | patch | tipo de malla'),'metal | outerWall | wall')+
 area('flCbFields',t('Fields: region | field | class | 7 SI dimensions | initial value','Campos: región | campo | clase | 7 dimensiones SI | valor inicial'),'metal | T | volScalarField | 0 0 0 1 0 0 0 | 1000')+
 area('flCbBoundaries',t('BC: region | field | patch | type | value or -','BC: región | campo | patch | tipo | valor o -'),'metal | T | outerWall | fixedValue | 300')+
 '<div class="cgTools"><label>'+t('Boundary region','Región del boundary')+' <input id="flCbBoundaryRegion" placeholder="metal"></label><label>'+t('Import ASCII polyMesh/boundary','Importar polyMesh/boundary ASCII')+' <input type="file" id="flCbBoundaryFile"></label><button type="button" class="btn soft" id="flCbClearSources">'+t('Clear imported evidence','Limpiar evidencia importada')+'</button></div><pre id="flCbSourceStatus" style="white-space:pre-wrap"></pre>'+
 area('flCbMaterials',t('Optional material notes: region | name | density kg/m³ | Cp J/kg/K | k W/m/K','Material opcional: región | nombre | densidad kg/m³ | Cp J/kg/K | k W/m/K'),'region | material | rho | Cp | k')+
 '<details style="margin-top:12px"><summary><b>'+t('Physical models · phase change and contact','Modelos físicos · cambio de fase y contacto')+'</b></summary>'+
 area('flCbPhaseModels',t('Solidification: region | model | cellZone or - | Tsol | Tliq | alpha1e | L | rhoRef | beta | Cu | q | relax | thermo/lookup | CpRef or - | gx gy gz','Solidificación: región | modelo | cellZone o - | Tsol | Tliq | alpha1e | L | rhoRef | beta | Cu | q | relax | thermo/lookup | CpRef o - | gx gy gz'),'metal | phaseChangeSource | - | Tsol | Tliq | alpha1e | L | rhoRef | beta | Cu | q | relax | thermo | - | gx gy gz')+
 '<p class="cgNotice">'+t('SI only. Thermo mode: fluid; lookup: incompressibleFluid with explicit CpRef. One phase model per region. Named zone not verified. Phase field is modelName:alpha1. No recalescence or alloy kinetics prediction.','Solo SI. Modo thermo: fluid; lookup: incompressibleFluid con CpRef explícito. Un modelo por región. Zona nombrada no verificada. Campo de fase modelName:alpha1. Sin predicción de recalescencia ni cinética de aleación.')+'</p>'+
 '<div class="cgTools"><label>'+t('Phase region','Región de fase')+' <input id="flCbPhaseRegion"></label><label>T [K] <input id="flCbPhaseT"></label><button type="button" class="btn soft" id="flCbPhasePreview">'+t('Equilibrium preview','Vista de equilibrio')+'</button></div><pre id="flCbPhaseResult"></pre>'+
 area('flCbContactResistance',t('Contact per side: region | patch | layers (13) or h (14) | thickness list or h | kappa list or -','Contacto por lado: región | patch | layers (13) o h (14) | espesores o h | conductividades o -'),'metal | contactA | layers | thickness | kappa')+
 '<p class="cgNotice">'+t('Specify both sides independently. No total interface conductance inferred. Foundation 13 uses layer lists; 14 uses uniform h.','Especifica ambos lados independientemente. No se infiere conductancia total. Foundation 13 usa capas; 14 usa h uniforme.')+'</p></details>'+
 area('flCbSolidProperties',t('Optional native constant solid: region | rho [kg/m³] | Cv [J/kg/K] | k [W/m/K] | molWeight [kg/kmol] | hf [J/kg]','Sólido constante nativo opcional: región | rho [kg/m³] | Cv [J/kg/K] | k [W/m/K] | molWeight [kg/kmol] | hf [J/kg]'),'mold | rho | Cv | k | molWeight | hf')+
 '<p class="cgNotice">'+t('Constant solid template only; explicit Cv, not inferred from Cp. Mutually exclusive with a temperature-dependent table for that region. Variable thermo and native runtime validation pending.','Solo plantilla de sólido constante; Cv explícito, no inferido de Cp. Excluyente con tabla dependiente de temperatura en esa región. Termo variable y validación nativa pendientes.')+'</p>'+
 area('flCbFluidProperties',t('Optional native constant laminar fluid: region | rho [kg/m³] | Cp [J/kg/K] | mu [Pa s] | Pr | molWeight [kg/kmol] | hf [J/kg]','Fluido laminar constante nativo opcional: región | rho [kg/m³] | Cp [J/kg/K] | mu [Pa s] | Pr | molWeight [kg/kmol] | hf [J/kg]'),'metal | rho | Cp | mu | Pr | molWeight | hf')+
 '<p class="cgNotice">'+t('Constant-density and constant-property fluid only; k=Cp*mu/Pr. No turbulence or temperature-dependent model inferred.','Solo fluido de densidad y propiedades constantes; k=Cp*mu/Pr. No se infiere turbulencia ni modelo dependiente de T.')+'</p>'+
 '<details style="margin-top:12px"><summary><b>'+t('Numerical configuration · optional','Configuración numérica · opcional')+'</b></summary><p class="cgNotice">'+t('All regions require explicit schemes, linear equations and PIMPLE when enabled. No automatic choice of required equations (e, h, p_rgh, etc.). Empty sections leave numerical dictionaries ungenerated.','Todas las regiones requieren esquemas, ecuaciones lineales y PIMPLE explícitos al habilitar. No se deducen ecuaciones requeridas (e, h, p_rgh, etc.). Secciones vacías no generan diccionarios numéricos.')+'</p>'+
 area('flCbSchemes',t('Schemes: region | ddt | grad | laplacian | interpolation | snGrad','Esquemas: región | ddt | grad | laplacian | interpolación | snGrad'),'metal | Euler | Gauss linear | Gauss linear corrected | linear | corrected')+
 area('flCbDivSchemes',t('Divergence: region | exact div(...) key | scheme (default none)','Divergencia: región | clave div(...) exacta | esquema (default none)'),'metal | div(phi,U) | Gauss upwind')+
 area('flCbLinearSolvers',t('Linear: region | equation | solver | smoother/preconditioner | tolerance | relTol | finalRelTol','Lineal: región | ecuación | solver | smoother/preconditioner | tolerance | relTol | finalRelTol'),'metal | p_rgh | GAMG | symGaussSeidel | 1e-7 | 0.01 | 0')+
 area('flCbPimple',t('PIMPLE: region or @global | nOuterCorrectors | nCorrectors | nNonOrthogonalCorrectors | momentumPredictor (yes/no or -)','PIMPLE: región o @global | nOuterCorrectors | nCorrectors | nNonOrthogonalCorrectors | momentumPredictor (yes/no o -)'),'@global | 5 | - | - | -\nmetal | - | 2 | 1 | yes\nmold | - | - | 0 | -')+
 area('flCbRelaxation',t('Relaxation: region | fields/equations | exact equation | factor','Relajación: región | fields/equations | ecuación exacta | factor'),'metal | equations | U | 0.7')+
 area('flCbResidualControl',t('Optional fluid outerCorrectorResidualControl: region | equation | tolerance | relTol','outerCorrectorResidualControl opcional de fluido: región | ecuación | tolerance | relTol'),'metal | p_rgh | 1e-6 | 0')+
 '<p class="cgNotice">'+t('Examples are placeholders, not defaults. Multi-region outer correctors are global; pressure and momentum controls are regional fluid only. Verify actual solver equation requirements and mesh quality.','Ejemplos como guía, no valores predeterminados. Correctores externos multirregión globales; presión y momento solo regionales de fluido. Verifica ecuaciones del solver y calidad de malla.')+'</p></details>'+
 area('flCbMaterialTables',t('Temperature table: region | T [K] | density | Cp | k (SI)','Tabla por temperatura: región | T [K] | densidad | Cp | k (SI)'),'metal | 1200 | rho | Cp | k')+
 '<div class="cgTools"><label>'+t('Preview region','Región de consulta')+' <input id="flCbTableRegion"></label><label>T [K] <input id="flCbTableT" inputmode="decimal"></label><button type="button" class="btn soft" id="flCbTablePreview">'+t('Interpolate table','Interpolar tabla')+'</button></div><pre id="flCbTableResult"></pre>'+
 '<p class="cgNotice">'+t('Mapped thermal interfaces: import both region boundary files, declare reciprocal mappedWall, set T to coupledTemperature with explicit initial patch value on both sides. Cyclic and nonconformal variants unsupported. Tables are exported as SI CSV, not native thermo models.','Interfaces térmicas: importa ambos boundary, declara mappedWall recíproco y T con coupledTemperature y valor inicial explícito en ambos lados. Variantes cíclicas y no conformes no soportadas. Las tablas se exportan en CSV SI, no como modelos termo nativos.')+'</p>'+
 '<details style="margin-top:12px"><summary><b>'+t('Execution preparation and log review','Preparación de ejecución y revisión de logs')+'</b></summary><p class="cgNotice">'+t('ZIP includes an optional Bash script for trusted completed cases. Run in WSL with --check or explicitly --run; it copies the initial case into a new /tmp directory. No launch from FoamLens yet.','ZIP incluye un script Bash opcional para casos completos de confianza. Ejecuta en WSL con --check o explícitamente --run; copia el caso inicial a un directorio nuevo en /tmp. Aún sin lanzamiento desde FoamLens.')+'</p><label>'+t('Read solver log locally (8 MiB max)','Leer log local (máx. 8 MiB)')+' <input type="file" id="flCbLogFile"></label><button type="button" class="btn soft" id="flCbLogExport" disabled>'+t('Export parsed evidence ZIP','Exportar evidencia de log ZIP')+'</button><pre id="flCbLogStatus" style="white-space:pre-wrap;max-height:300px;overflow:auto"></pre></details>'+
 '<details style="margin-top:12px"><summary><b>'+t('Compare solver logs A/B','Comparar logs de solver A/B')+'</b></summary><p class="cgNotice">'+t('Exact time alignment; last solve per field/region/time. No interpolation or convergence certification. Unknown region stays unknown.','Alineación temporal exacta; última resolución por campo/región/tiempo. Sin interpolación ni certificación de convergencia. Región desconocida permanece desconocida.')+'</p><div class="cgTools"><label>Log A <input type="file" id="flCbCompareA"></label><label>Log B <input type="file" id="flCbCompareB"></label></div><div class="cgTools"><label>'+t('Region / field','Región / campo')+' <select id="flCbCompareField" disabled></select></label><label>'+t('Metric','Métrica')+' <select id="flCbCompareMetric"><option value="initial">'+t('Initial residual','Residual inicial')+'</option><option value="final">'+t('Final residual','Residual final')+'</option><option value="iterations">'+t('Iterations','Iteraciones')+'</option></select></label><button type="button" class="btn soft" id="flCbCompareExport" disabled>ZIP</button></div><div id="flCbComparePlot" style="width:100%;min-height:40px"></div><pre id="flCbCompareStatus" style="white-space:pre-wrap;max-height:300px;overflow:auto"></pre></details>'+
 '<div class="cgTools"><button type="button" class="btn primary" id="flCbValidate">'+t('Validate and preview draft','Validar y previsualizar borrador')+'</button><button type="button" class="btn soft" id="flCbExport" disabled>'+t('Export draft ZIP','Exportar borrador ZIP')+'</button><label>'+t('Reopen draft JSON','Reabrir borrador JSON')+' <input type="file" id="flCbImport" accept=".json,application/json"></label></div>'+
 '<p id="flCbStatus" class="cgNotice" aria-live="polite"></p><label>'+t('Generated file','Archivo generado')+' <select id="flCbFile" disabled></select></label><pre id="flCbPreview" style="white-space:pre-wrap;max-height:380px;overflow:auto"></pre>';
 anchor.insertAdjacentElement('afterend',panel);
 const el=id=>document.getElementById('flCb'+id),bindings={version:'Version',mode:'Mode',endTime:'End',deltaT:'Delta',writeInterval:'Write',regions:'Regions',patches:'Patches',fields:'Fields',boundaries:'Boundaries',materials:'Materials',materialTables:'MaterialTables',solidProperties:'SolidProperties',fluidProperties:'FluidProperties',schemes:'Schemes',divSchemes:'DivSchemes',linearSolvers:'LinearSolvers',pimple:'Pimple',relaxation:'Relaxation',residualControl:'ResidualControl',adaptiveTime:'AdaptiveTime',maxCo:'MaxCo',maxDeltaT:'MaxDeltaT',phaseModels:'PhaseModels',contactResistance:'ContactResistance'};
 let plan=null,revision=0,boundarySources=[];
 const read=()=>({...Object.fromEntries(Object.entries(bindings).map(([k,id])=>[k,el(id).value])),boundarySources});
 const clear=()=>{revision++;plan=null;el('Export').disabled=true;el('File').disabled=true;el('File').replaceChildren();el('Preview').textContent='';el('TableResult').textContent='';el('PhaseResult').textContent='';el('Status').textContent=cgUi('Inputs changed. Validate again.','Entradas modificadas. Valida de nuevo.')};
 for(const id of Object.values(bindings))el(id).addEventListener('input',clear);
 const showSources=()=>{el('SourceStatus').textContent=boundarySources.map(s=>{try{const b=flCaseBuilder.parseBoundary(s.text,s.region,el('Mode').value);return s.region+' · '+b.patches.length+' patches · '+(b.location||'header location absent')}catch(e){return s.region+' · '+e.message}}).join('\n')};
 el('ClearSources').onclick=()=>{boundarySources=[];clear();showSources()};
 el('BoundaryRegion').addEventListener('input',()=>{revision++});
 el('BoundaryFile').onchange=async()=>{const file=el('BoundaryFile').files[0],region=el('BoundaryRegion').value.trim(),mode=el('Mode').value;el('BoundaryFile').value='';if(!file)return;clear();const token=revision;
  try{if(file.size>262144)throw Error('Boundary file exceeds 256 KiB');const raw=await file.text();if(token!==revision)return;const inv=flCaseBuilder.parseBoundary(raw,region,mode);
   if(!boundarySources.some(s=>s.region===region)&&boundarySources.length>=16)throw Error('Maximum 16 region boundaries');
   const keep=el('Patches').value.split(/\r?\n/).filter(line=>line.trim()&&line.split('|')[0].trim()!==region);
   el('Patches').value=keep.concat(inv.patches.map(p=>[region,p.patch,p.type].join(' | '))).join('\n');
   boundarySources=boundarySources.filter(s=>s.region!==region).concat({region,text:raw});clear();showSources()
  }catch(e){if(token===revision)el('Status').textContent=e.message}};
 el('TablePreview').onclick=()=>{try{const current=flCaseBuilder.build(read()),table=current.manifest.materialTables.find(x=>x.region===el('TableRegion').value.trim()),raw=el('TableT').value.trim();if(!table||!/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?$/.test(raw))throw Error('Select material table and decimal temperature');el('TableResult').textContent=JSON.stringify(flCaseBuilder.materialAt(table,Number(raw)),null,2)}catch(e){el('TableResult').textContent=e.message}};
 el('PhasePreview').onclick=()=>{try{const current=flCaseBuilder.build(read()),m=current.manifest.physics.phaseModels.find(x=>x.region===el('PhaseRegion').value.trim()),raw=el('PhaseT').value.trim();if(!m||!/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?$/.test(raw))throw Error('Select phase region and decimal temperature');el('PhaseResult').textContent=JSON.stringify(flCaseBuilder.phasePreview(m,Number(raw)),null,2)}catch(e){el('PhaseResult').textContent=e.message}};
 let logEvidence=null,logRevision=0;
 el('LogFile').onchange=async()=>{const file=el('LogFile').files[0];el('LogFile').value='';if(!file)return;const token=++logRevision;logEvidence=null;el('LogExport').disabled=true;el('LogStatus').textContent='';
  try{if(file.size>8*1024*1024)throw Error('Log exceeds 8 MiB');const raw=await file.text();if(token!==logRevision)return;const log=flCaseBuilder.inspectRunLog(raw);logEvidence=log;const {residualRows,courantRows,...summary}=log;el('LogStatus').textContent=JSON.stringify({...summary,residualSamples:residualRows.length,courantSamples:courantRows.length,lastResiduals:residualRows.slice(-8)},null,2);el('LogExport').disabled=false}catch(e){if(token===logRevision)el('LogStatus').textContent=e.message}};
 el('LogExport').onclick=()=>{if(logEvidence)cgDownloadZip('FoamLens-solver-log-evidence.zip',cgStoreZip([{name:'solver-log-summary.json',data:JSON.stringify(logEvidence,null,2)}]))};
 const compareLogs={A:null,B:null},compareEpoch={A:0,B:0};let compareReport=null;
 const drawComparison=report=>{
  const host=el('ComparePlot');host.replaceChildren();if(!report.rows.length)return;
  const ns='http://www.w3.org/2000/svg',make=(tag,attrs)=>{const n=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));return n};
  const svg=make('svg',{viewBox:'0 0 640 240',role:'img','aria-label':cgUi('A/B residual history','Historial de residuales A/B')});svg.style.cssText='width:100%;height:auto';
  const all=report.rows.flatMap(r=>[r.A,r.B]).filter(v=>v!==null),log=report.selection.metric!=='iterations'&&all.every(v=>v>0),transform=v=>log?Math.log10(v):v;
  let lo=Infinity,hi=-Infinity;for(const v of all){const z=transform(v);lo=Math.min(lo,z);hi=Math.max(hi,z)}if(lo===hi){lo-=1;hi+=1}
  const t0=report.rows[0].time,t1=report.rows.at(-1).time,x=t=>58+560*(t1===t0?0.5:(t-t0)/(t1-t0)),y=v=>196-168*(transform(v)-lo)/(hi-lo);
  for(let i=0;i<=4;i++){const yy=28+42*i;svg.append(make('line',{x1:58,x2:618,y1:yy,y2:yy,stroke:'currentColor','stroke-opacity':'.18'}));const tx=make('text',{x:52,y:yy+4,'text-anchor':'end',fill:'currentColor','font-size':10});tx.textContent=(log?10**(hi-(hi-lo)*i/4):hi-(hi-lo)*i/4).toExponential(1);svg.append(tx)}
  const step=Math.max(1,Math.ceil(report.rows.length/1500));
  for(const [k,color] of [['A','#38bdf8'],['B','#f59e0b']]){
   let d='',started=false;for(let i=0;i<report.rows.length;i++){const r=report.rows[i];if(r[k]===null){started=false;continue}if(i%step&&i!==report.rows.length-1)continue;const xx=x(r.time),yy=y(r[k]);d+=(started?' L':' M')+xx+' '+yy;started=true;if(step===1&&report.rows.length<100)svg.append(make('circle',{cx:xx,cy:yy,r:2,fill:color}))}
   svg.append(make('path',{d,fill:'none',stroke:color,'stroke-width':1.7}))
  }
  const label=(x,y,str,color='currentColor')=>{const n=make('text',{x,y,fill:color,'font-size':11});n.textContent=str;svg.append(n)};
  label(58,214,String(t0));label(560,214,String(t1));label(265,230,'Time [s]');label(58,15,log?'log scale':'linear scale');label(510,15,'A','#38bdf8');label(555,15,'B','#f59e0b');host.append(svg)
 };
 const refreshComparison=()=>{
  compareReport=null;el('CompareExport').disabled=true;el('ComparePlot').replaceChildren();el('CompareStatus').textContent='';
  if(!compareLogs.A||!compareLogs.B)return;
  try{const [region,field]=JSON.parse(el('CompareField').value);compareReport=flCaseBuilder.compareRunLogs(compareLogs.A,compareLogs.B,{region,field,metric:el('CompareMetric').value});drawComparison(compareReport);const {rows,...summary}=compareReport;el('CompareStatus').textContent=JSON.stringify(summary,null,2);el('CompareExport').disabled=false}catch(e){el('CompareStatus').textContent=e.message}
 };
 const refreshFields=()=>{const select=el('CompareField'),old=select.value;select.replaceChildren();for(const s of flCaseBuilder.residualSelections(compareLogs.A,compareLogs.B)){const o=document.createElement('option');o.value=JSON.stringify([s.region,s.field]);o.textContent=(s.region??cgUi('unknown region','región desconocida'))+' / '+s.field;select.append(o)}if([...select.options].some(o=>o.value===old))select.value=old;select.disabled=!select.options.length;refreshComparison()};
 for(const k of ['A','B'])el('Compare'+k).onchange=async()=>{const file=el('Compare'+k).files[0];if(!file)return;const epoch=++compareEpoch[k];compareLogs[k]=null;refreshFields();try{if(file.size>8*1024*1024)throw Error('Log exceeds 8 MiB');const raw=await file.text();if(epoch!==compareEpoch[k])return;compareLogs[k]=flCaseBuilder.inspectRunLog(raw);refreshFields()}catch(e){if(epoch===compareEpoch[k])el('CompareStatus').textContent=e.message}};
 el('CompareField').onchange=refreshComparison;el('CompareMetric').onchange=refreshComparison;
 el('CompareExport').onclick=()=>{if(!compareReport)return;const {rows,...summary}=compareReport;cgDownloadZip('FoamLens-log-comparison.zip',cgStoreZip([{name:'comparison.csv',data:flCaseBuilder.comparisonCsv(compareReport)},{name:'comparison-manifest.json',data:JSON.stringify(summary,null,2)}]))};
 const preview=()=>{el('Preview').textContent=plan?.entries.find(e=>e.name===el('File').value)?.data||''};
 el('File').onchange=preview;
 const validate=()=>{clear();try{plan=flCaseBuilder.build(read());for(const e of plan.entries){const o=document.createElement('option');o.value=e.name;o.textContent=e.name;el('File').append(o)}el('File').disabled=false;el('Export').disabled=false;el('Status').textContent=plan.manifest.regions.length+' · '+cgUi('regions; structural draft valid, NOT solver-ready.','regiones; borrador estructural válido, NO apto para solver.');preview()}catch(e){el('Status').textContent=e.message}};
 el('Validate').onclick=validate;
 el('Export').onclick=()=>{try{if(!plan)return;const current=flCaseBuilder.build(read());cgDownloadZip('FoamLens-case-draft.zip',cgStoreZip(current.entries))}catch(e){clear();el('Status').textContent=e.message}};
 el('Import').onchange=async()=>{const file=el('Import').files[0];el('Import').value='';if(!file)return;clear();const token=revision;try{if(file.size>8*1024*1024)throw Error('Draft JSON exceeds 8 MiB');const v=JSON.parse(await file.text());if(token!==revision)return;if(v.schema!==flCaseBuilder.schema)throw Error('Unsupported draft schema');flCaseBuilder.build(v.input);for(const [k,id] of Object.entries(bindings))el(id).value=v.input[k]??(k==='adaptiveTime'?'off':'');boundarySources=v.input.boundarySources??[];showSources();validate()}catch(e){if(token===revision)el('Status').textContent=e.message}};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',flMountCaseBuilder,{once:true});else flMountCaseBuilder();
