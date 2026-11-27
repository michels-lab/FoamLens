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
 function build(input){
  if(!input||!['13','14'].includes(input.version)||!['single','multi'].includes(input.mode))fail('Select Foundation 13/14 and case mode');
  const end=num(input.endTime,'endTime'),dt=num(input.deltaT,'deltaT'),write=num(input.writeInterval,'writeInterval');
  if(end<=0||dt<=0||dt>end||write<=0||write>end)fail('Require 0 < deltaT, writeInterval <= endTime');
  const regions=new Map(),patches=new Map(),fields=new Map(),conditions=new Map(),materials=new Map();
  for(const [name,kind,solver] of rows(input.regions,3,'Regions',16)){
   word(name,'region');word(solver,'solver module');if(!['fluid','solid'].includes(kind))fail('Region role must be fluid or solid');
   add(regions,name,{name,kind,solver},'region')
  }
  const regionList=items(regions);
  if(input.mode==='single'?regionList.length!==1:regionList.length<2)fail('Single mode requires one region; multi mode requires at least two');
  for(const [region,patch,type] of rows(input.patches,3,'Patches',128)){
   get(regions,region,'patch region');word(patch,'patch');
   if(!['patch','wall','empty','symmetryPlane','symmetry','wedge'].includes(type))fail('Unsupported mesh patch type '+type+'; coupled/mapped/cyclic patches require a later explicit interface workflow');
   add(patches,key(region,patch),{region,patch,type},'patch')
  }
  for(const region of regionList)if(!items(patches).some(p=>p.region===region.name))fail('No patches declared for '+region.name);
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
   if(['patch','wall'].includes(p.type)){
    if(!['fixedValue','zeroGradient'].includes(type))fail('Unsupported boundary condition '+type+' on '+p.type)
   }else if(type!==p.type)fail('Constraint patch '+patch+' requires '+p.type);
   const v=type==='fixedValue'?fieldValue(value,f.cls,name,f.dimensions):null;
   if(type!=='fixedValue'&&value!=='-')fail('Use - for a condition without a value');
   add(conditions,key(region,name,patch),{region,name,patch,type,value:v},'boundary condition')
  }
  for(const f of items(fields))for(const p of items(patches).filter(p=>p.region===f.region))get(conditions,key(f.region,f.name,p.patch),'missing boundary condition');
  for(const [region,name,rho,cp,k] of rows(input.materials,5,'Materials',16)){
   get(regions,region,'material region');word(name,'material');
   const values=[num(rho,'density kg/m3'),num(cp,'Cp J/kg/K'),num(k,'conductivity W/m/K')];
   if(values.some(x=>x<=0))fail('Material properties must be positive');
   add(materials,region,{region,name,density_kg_m3:values[0],Cp_J_kg_K:values[1],conductivity_W_m_K:values[2]},'material')
  }
  const multi=input.mode==='multi',entries=[];
  const control=header('dictionary','controlDict','system')+'application '+(multi?'foamMultiRun':'foamRun')+';\n'+
    (multi?'regionSolvers\n{\n'+regionList.map(r=>'    '+r.name+' '+r.solver+';').join('\n')+'\n}\n':'solver '+regionList[0].solver+';\n')+
    'startFrom startTime;\nstartTime 0;\nstopAt endTime;\nendTime '+end+';\ndeltaT '+dt+';\nwriteControl runTime;\nwriteInterval '+write+';\nwriteFormat ascii;\nwritePrecision 10;\nwriteCompression off;\ntimeFormat general;\ntimePrecision 12;\nrunTimeModifiable false;\n';
  entries.push({name:'draft/system/controlDict',data:control});
  for(const f of items(fields)){
   const location=multi?'0/'+f.region:'0';
   const bc=items(patches).filter(p=>p.region===f.region).map(p=>get(conditions,key(f.region,f.name,p.patch),'boundary'));
   const data=header(f.cls,f.name,location)+'dimensions ['+f.dimensions.join(' ')+'];\ninternalField uniform '+valueText(f.initial)+';\n\nboundaryField\n{\n'+
     bc.map(b=>'    '+b.patch+'\n    {\n        type '+b.type+';\n'+(b.value!==null?'        value uniform '+valueText(b.value)+';\n':'')+'    }').join('\n')+'\n}\n';
   entries.push({name:'draft/'+location+'/'+f.name,data})
  }
  const manifest={schema,version:input.version,mode:input.mode,regions:regionList,patches:items(patches),fields:items(fields),boundaryConditions:items(conditions),materials:items(materials),time:{startTime:0,endTime:end,deltaT:dt,writeControl:'runTime',writeInterval:write},materialUnits:'SI constant reference values only, not OpenFOAM thermo dictionaries',meshPatchInventoryVerified:false,solverModulesVerified:false,physicalModelValidated:false,solverReady:false,originalCaseModified:false,missing:['actual mesh/polyMesh and patch inventory verification','solver-specific physicalProperties/thermophysical models','fvSchemes and fvSolution','coupled interfaces and any solver-required fields or dictionaries','native OpenFOAM parsing and execution validation']};
  entries.push({name:'manifest.json',data:JSON.stringify(manifest,null,2)+'\n'},{name:'case-builder.json',data:JSON.stringify({schema,input},null,2)+'\n'},{name:'README.txt',data:'DRAFT ONLY. This is not a runnable or validated OpenFOAM case. No solver run, mesh, coupled interfaces, or solver-specific material dictionaries generated. Compare every declared patch to original polyMesh/boundary and complete the missing files listed in manifest.json. Extract to a new folder; never overlay an existing case without review.\n'});
  return {manifest,entries}
 }
 return Object.freeze({build,schema})
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
 area('flCbRegions',t('Regions: name | fluid/solid | solver module','Regiones: nombre | fluid/solid | módulo solver'),'metal | fluid | fluid')+
 area('flCbPatches',t('Declared mesh patches: region | patch | mesh type','Patches declarados: región | patch | tipo de malla'),'metal | outerWall | wall')+
 area('flCbFields',t('Fields: region | field | class | 7 SI dimensions | initial value','Campos: región | campo | clase | 7 dimensiones SI | valor inicial'),'metal | T | volScalarField | 0 0 0 1 0 0 0 | 1000')+
 area('flCbBoundaries',t('BC: region | field | patch | type | value or -','BC: región | campo | patch | tipo | valor o -'),'metal | T | outerWall | fixedValue | 300')+
 area('flCbMaterials',t('Optional material notes: region | name | density kg/m³ | Cp J/kg/K | k W/m/K','Material opcional: región | nombre | densidad kg/m³ | Cp J/kg/K | k W/m/K'),'region | material | rho | Cp | k')+
 '<p class="cgNotice">'+t('Supported draft BCs: fixedValue, zeroGradient, empty, symmetry, symmetryPlane, wedge. Coupled and cyclic interfaces not yet supported. Material notes are not native thermo models.','BC de borrador: fixedValue, zeroGradient, empty, symmetry, symmetryPlane, wedge. Interfaces acopladas y cíclicas aún no soportadas. Las notas de material no son modelos termo nativos.')+'</p>'+
 '<div class="cgTools"><button type="button" class="btn primary" id="flCbValidate">'+t('Validate and preview draft','Validar y previsualizar borrador')+'</button><button type="button" class="btn soft" id="flCbExport" disabled>'+t('Export draft ZIP','Exportar borrador ZIP')+'</button><label>'+t('Reopen draft JSON','Reabrir borrador JSON')+' <input type="file" id="flCbImport" accept=".json,application/json"></label></div>'+
 '<p id="flCbStatus" class="cgNotice" aria-live="polite"></p><label>'+t('Generated file','Archivo generado')+' <select id="flCbFile" disabled></select></label><pre id="flCbPreview" style="white-space:pre-wrap;max-height:380px;overflow:auto"></pre>';
 anchor.insertAdjacentElement('afterend',panel);
 const el=id=>document.getElementById('flCb'+id),bindings={version:'Version',mode:'Mode',endTime:'End',deltaT:'Delta',writeInterval:'Write',regions:'Regions',patches:'Patches',fields:'Fields',boundaries:'Boundaries',materials:'Materials'};
 let plan=null,revision=0;
 const read=()=>Object.fromEntries(Object.entries(bindings).map(([k,id])=>[k,el(id).value]));
 const clear=()=>{revision++;plan=null;el('Export').disabled=true;el('File').disabled=true;el('File').replaceChildren();el('Preview').textContent='';el('Status').textContent=cgUi('Inputs changed. Validate again.','Entradas modificadas. Valida de nuevo.')};
 for(const id of Object.values(bindings))el(id).addEventListener('input',clear);
 const preview=()=>{el('Preview').textContent=plan?.entries.find(e=>e.name===el('File').value)?.data||''};
 el('File').onchange=preview;
 const validate=()=>{clear();try{plan=flCaseBuilder.build(read());for(const e of plan.entries){const o=document.createElement('option');o.value=e.name;o.textContent=e.name;el('File').append(o)}el('File').disabled=false;el('Export').disabled=false;el('Status').textContent=plan.manifest.regions.length+' · '+cgUi('regions; structural draft valid, NOT solver-ready.','regiones; borrador estructural válido, NO apto para solver.');preview()}catch(e){el('Status').textContent=e.message}};
 el('Validate').onclick=validate;
 el('Export').onclick=()=>{try{if(!plan)return;const current=flCaseBuilder.build(read());cgDownloadZip('FoamLens-case-draft.zip',cgStoreZip(current.entries))}catch(e){clear();el('Status').textContent=e.message}};
 el('Import').onchange=async()=>{const file=el('Import').files[0];el('Import').value='';if(!file)return;clear();const token=revision;try{if(file.size>512*1024)throw Error('Draft JSON exceeds 512 KiB');const v=JSON.parse(await file.text());if(token!==revision)return;if(v.schema!==flCaseBuilder.schema)throw Error('Unsupported draft schema');flCaseBuilder.build(v.input);for(const [k,id] of Object.entries(bindings))el(id).value=v.input[k];validate()}catch(e){if(token===revision)el('Status').textContent=e.message}};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',flMountCaseBuilder,{once:true});else flMountCaseBuilder();
