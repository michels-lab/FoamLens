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
  for(const table of tables)entries.push({name:'material-data/'+table.region+'.csv',data:table.columns.join(',')+'\n'+table.values.map(v=>v.join(',')).join('\n')+'\n'});
  const manifest={schema,version:input.version,mode:input.mode,regions:regionList,patches:items(patches),fields:items(fields),boundaryConditions:items(conditions),materials:items(materials),materialTables:tables,importedPatchInventories:items(inventories),allDeclaredPatchInventoriesMatched:inventories.size===regionList.length,thermalInterfaces:[...interfaces.values()],time:{startTime:0,endTime:end,deltaT:dt,writeControl:'runTime',writeInterval:write},materialUnits:'SI constant reference values and temperature tables only, not OpenFOAM thermo dictionaries',meshPatchInventoryVerified:false,solverModulesVerified:false,physicalModelValidated:false,solverReady:false,originalCaseModified:false,missing:['actual full mesh topology and interface geometry verification','solver-specific physicalProperties/thermophysical models','fvSchemes and fvSolution','native thermophysical transport, contact resistance and any solver-required fields or dictionaries','native OpenFOAM parsing and execution validation']};
  entries.push({name:'manifest.json',data:JSON.stringify(manifest,null,2)+'\n'},{name:'case-builder.json',data:JSON.stringify({schema,input},null,2)+'\n'},{name:'README.txt',data:'DRAFT ONLY. This is not a runnable or validated OpenFOAM case. No solver run, mesh geometry, or solver-specific material dictionaries generated. Reciprocal mappedWall names and coupled temperature draft entries do not validate geometric mapping or heat balance. Compare every declared patch to original polyMesh/boundary and complete the missing files listed in manifest.json. Extract to a new folder; never overlay an existing case without review.\n'});
  return {manifest,entries}
 }
 return Object.freeze({build,schema,parseBoundary,materialAt})
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
 '<div class="cgTools"><label>'+t('Boundary region','Región del boundary')+' <input id="flCbBoundaryRegion" placeholder="metal"></label><label>'+t('Import ASCII polyMesh/boundary','Importar polyMesh/boundary ASCII')+' <input type="file" id="flCbBoundaryFile"></label><button type="button" class="btn soft" id="flCbClearSources">'+t('Clear imported evidence','Limpiar evidencia importada')+'</button></div><pre id="flCbSourceStatus" style="white-space:pre-wrap"></pre>'+
 area('flCbMaterials',t('Optional material notes: region | name | density kg/m³ | Cp J/kg/K | k W/m/K','Material opcional: región | nombre | densidad kg/m³ | Cp J/kg/K | k W/m/K'),'region | material | rho | Cp | k')+
 area('flCbMaterialTables',t('Temperature table: region | T [K] | density | Cp | k (SI)','Tabla por temperatura: región | T [K] | densidad | Cp | k (SI)'),'metal | 1200 | rho | Cp | k')+
 '<div class="cgTools"><label>'+t('Preview region','Región de consulta')+' <input id="flCbTableRegion"></label><label>T [K] <input id="flCbTableT" inputmode="decimal"></label><button type="button" class="btn soft" id="flCbTablePreview">'+t('Interpolate table','Interpolar tabla')+'</button></div><pre id="flCbTableResult"></pre>'+
 '<p class="cgNotice">'+t('Mapped thermal interfaces: import both region boundary files, declare reciprocal mappedWall, set T to coupledTemperature with explicit initial patch value on both sides. Cyclic and nonconformal variants unsupported. Tables are exported as SI CSV, not native thermo models.','Interfaces térmicas: importa ambos boundary, declara mappedWall recíproco y T con coupledTemperature y valor inicial explícito en ambos lados. Variantes cíclicas y no conformes no soportadas. Las tablas se exportan en CSV SI, no como modelos termo nativos.')+'</p>'+
 '<div class="cgTools"><button type="button" class="btn primary" id="flCbValidate">'+t('Validate and preview draft','Validar y previsualizar borrador')+'</button><button type="button" class="btn soft" id="flCbExport" disabled>'+t('Export draft ZIP','Exportar borrador ZIP')+'</button><label>'+t('Reopen draft JSON','Reabrir borrador JSON')+' <input type="file" id="flCbImport" accept=".json,application/json"></label></div>'+
 '<p id="flCbStatus" class="cgNotice" aria-live="polite"></p><label>'+t('Generated file','Archivo generado')+' <select id="flCbFile" disabled></select></label><pre id="flCbPreview" style="white-space:pre-wrap;max-height:380px;overflow:auto"></pre>';
 anchor.insertAdjacentElement('afterend',panel);
 const el=id=>document.getElementById('flCb'+id),bindings={version:'Version',mode:'Mode',endTime:'End',deltaT:'Delta',writeInterval:'Write',regions:'Regions',patches:'Patches',fields:'Fields',boundaries:'Boundaries',materials:'Materials',materialTables:'MaterialTables'};
 let plan=null,revision=0,boundarySources=[];
 const read=()=>({...Object.fromEntries(Object.entries(bindings).map(([k,id])=>[k,el(id).value])),boundarySources});
 const clear=()=>{revision++;plan=null;el('Export').disabled=true;el('File').disabled=true;el('File').replaceChildren();el('Preview').textContent='';el('TableResult').textContent='';el('Status').textContent=cgUi('Inputs changed. Validate again.','Entradas modificadas. Valida de nuevo.')};
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
 const preview=()=>{el('Preview').textContent=plan?.entries.find(e=>e.name===el('File').value)?.data||''};
 el('File').onchange=preview;
 const validate=()=>{clear();try{plan=flCaseBuilder.build(read());for(const e of plan.entries){const o=document.createElement('option');o.value=e.name;o.textContent=e.name;el('File').append(o)}el('File').disabled=false;el('Export').disabled=false;el('Status').textContent=plan.manifest.regions.length+' · '+cgUi('regions; structural draft valid, NOT solver-ready.','regiones; borrador estructural válido, NO apto para solver.');preview()}catch(e){el('Status').textContent=e.message}};
 el('Validate').onclick=validate;
 el('Export').onclick=()=>{try{if(!plan)return;const current=flCaseBuilder.build(read());cgDownloadZip('FoamLens-case-draft.zip',cgStoreZip(current.entries))}catch(e){clear();el('Status').textContent=e.message}};
 el('Import').onchange=async()=>{const file=el('Import').files[0];el('Import').value='';if(!file)return;clear();const token=revision;try{if(file.size>8*1024*1024)throw Error('Draft JSON exceeds 8 MiB');const v=JSON.parse(await file.text());if(token!==revision)return;if(v.schema!==flCaseBuilder.schema)throw Error('Unsupported draft schema');flCaseBuilder.build(v.input);for(const [k,id] of Object.entries(bindings))el(id).value=v.input[k]??'';boundarySources=v.input.boundarySources??[];showSources();validate()}catch(e){if(token===revision)el('Status').textContent=e.message}};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',flMountCaseBuilder,{once:true});else flMountCaseBuilder();
