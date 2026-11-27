// Cartesian blockMesh designer; optional native isolated run; no original case writes.
/* FOAMLENS_BLOCKMESH_DESIGN_CORE_START */
function cmbNumber(s){
  if(typeof s!=='string'||!/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?$/.test(s.trim()))throw Error('Expected a finite decimal number');
  const n=Number(s);if(!Number.isFinite(n))throw Error('Nonfinite number');return n
}
function cmbAxis(text){
  const lines=String(text).trim().split(/\r?\n/).filter(l=>l.trim());
  if(lines.length<2||lines.length>17)throw Error('Each axis requires a start and 1–16 intervals');
  const start=lines[0].trim();const points=[cmbNumber(start)],counts=[],grading=[];
  for(const line of lines.slice(1)){
    const parts=line.trim().split(/\s+/);
    if(parts.length!==3)throw Error('Every interval needs end, cell count and grading ratio');
    const [end,n,g]=parts.map(cmbNumber),length=end-points.at(-1);
    if(!(length>0&&Number.isFinite(length))||!Number.isSafeInteger(n)||n<1||n>10000||g<1e-4||g>1e4||(n===1&&g!==1))throw Error('Increasing finite coordinates, 1–10000 cells, grading 0.0001–10000 (one cell requires 1)');
    points.push(end);counts.push(n);grading.push(g)
  }
  return{points,counts,grading}
}
function cmbName(s){if(!/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(s)||['none','defaultFaces'].includes(s))throw Error('Invalid or reserved patch/zone name: '+s);return s}
function cmbPlan(input){
  const axes=input.axes.map(cmbAxis);if(axes.length!==3)throw Error('Three axes required');
  const dims=axes.map(a=>a.counts.length),[nx,ny,nz]=dims,blockCount=nx*ny*nz;
  if(blockCount>512)throw Error('Maximum 512 Cartesian blocks');
  const cellCount=axes.reduce((p,a)=>p*a.counts.reduce((s,n)=>s+n,0),1);
  if(!Number.isSafeInteger(cellCount)||cellCount>10000000)throw Error('Maximum 10 million planned cells');
  const patches=input.patches.map(cmbName);
  if(patches.length!==6||new Set(patches).size!==6)throw Error('Six distinct exterior patch names required');
  const zoneMap=new Map();
  for(const line of String(input.zones||'').split(/\r?\n/).filter(l=>l.trim())){
    const a=line.trim().split(/\s+/);if(a.length!==4||!a.slice(0,3).every(v=>/^\d+$/.test(v)))throw Error('Zone row: i j k zone (zero-based)');
    const xyz=a.slice(0,3).map(Number),key=xyz.join(',');
    if(xyz.some((v,i)=>v>=dims[i]||!Number.isSafeInteger(v))||zoneMap.has(key))throw Error('Out-of-range or duplicate zone block '+key);
    zoneMap.set(key,cmbName(a[3]))
  }
  const vertices=[],blocks=[],boundary=patches.map(name=>({name,faces:[]})),zoneCells={},interfaces=[];
  const id=(i,j,k)=>(k*(ny+1)+j)*(nx+1)+i;
  for(let k=0;k<=nz;k++)for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++)vertices.push([axes[0].points[i],axes[1].points[j],axes[2].points[k]]);
  for(let k=0;k<nz;k++)for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){
    const ijk=[i,j,k],v=[id(i,j,k),id(i+1,j,k),id(i+1,j+1,k),id(i,j+1,k),id(i,j,k+1),id(i+1,j,k+1),id(i+1,j+1,k+1),id(i,j+1,k+1)];
    const counts=ijk.map((n,d)=>axes[d].counts[n]),grading=ijk.map((n,d)=>axes[d].grading[n]),zone=zoneMap.get(ijk.join(','))||null,cells=counts.reduce((a,b)=>a*b,1);
    const size=ijk.map((n,d)=>axes[d].points[n+1]-axes[d].points[n]),volume=size.reduce((a,b)=>a*b,1);
    if(!(volume>0&&Number.isFinite(volume)))throw Error('Invalid block volume');
    blocks.push({ijk,vertices:v,counts,grading,zone,cells,volume});
    if(zone)zoneCells[zone]=(Object.hasOwn(zoneCells,zone)?zoneCells[zone]:0)+cells;
    const sides=[[0,4,7,3],[1,2,6,5],[0,1,5,4],[3,7,6,2],[0,3,2,1],[4,5,6,7]];
    const external=[i===0,i===nx-1,j===0,j===ny-1,k===0,k===nz-1];
    external.forEach((yes,n)=>{if(yes)boundary[n].faces.push(sides[n].map(q=>v[q]))});
    for(let d=0;d<3;d++)if(ijk[d]+1<dims[d]){
      const adjacent=ijk.slice();adjacent[d]++;
      const other=zoneMap.get(adjacent.join(','))||null;
      if(zone&&other&&zone!==other){const tangential=[0,1,2].filter(x=>x!==d);
        interfaces.push({from:ijk,to:adjacent,zones:[zone,other],axis:'XYZ'[d],plannedFaces:counts[tangential[0]]*counts[tangential[1]],area_m2:size[tangential[0]]*size[tangential[1]]})}
    }
  }
  return{schema:'foamlens/cartesian-blockmesh-plan/1',axes,dims,vertices,blocks,boundary,cellCount,zoneCells,interfaces,unassignedCells:cellCount-Object.values(zoneCells).reduce((a,b)=>a+b,0),units:'m',meshGenerated:false,caseMutated:false,interfaceVerified:false,installedVersionVerified:false}
}
function cmbDictionary(p){
  const list=a=>'('+a.join(' ')+')';
  return 'FoamFile\n{\n    version 2.0;\n    format ascii;\n    class dictionary;\n    object blockMeshDict;\n}\n\n// Cartesian plan only; review and run in a new case.\nscale 1;\n\nvertices\n(\n'+p.vertices.map(v=>'    '+list(v)).join('\n')+'\n);\n\nblocks\n(\n'+p.blocks.map(b=>'    hex '+list(b.vertices)+(b.zone?' '+b.zone:'')+' '+list(b.counts)+' simpleGrading '+list(b.grading)).join('\n')+'\n);\n\nedges ();\n\nboundary\n(\n'+p.boundary.map(patch=>'    '+patch.name+'\n    {\n        type patch;\n        faces\n        (\n'+patch.faces.map(f=>'            '+list(f)).join('\n')+'\n        );\n    }').join('\n')+'\n);\n\nmergePatchPairs ();\n'
}
function cmbSlice(p,axis,index){
  if(!Number.isInteger(axis)||axis<0||axis>2||!Number.isInteger(index)||index<0||index>=p.dims[axis])throw Error('Invalid slice');
  const uv=[0,1,2].filter(a=>a!==axis),[u,v]=uv;
  return{u,v,axis,index,blocks:p.blocks.filter(b=>b.ijk[axis]===index).map(b=>({key:b.ijk.join(','),zone:b.zone,rect:[p.axes[u].points[b.ijk[u]],p.axes[v].points[b.ijk[v]],p.axes[u].points[b.ijk[u]+1],p.axes[v].points[b.ijk[v]+1]],cells:b.cells}))}
}
function cmbNativePayload(p,version,split=false){
 if(!['13','14'].includes(version)||p.cellCount>200000)throw Error('Native Foundation 13/14 run supports at most 200,000 cells');
 if(split&&(p.unassignedCells||Object.keys(p.zoneCells).length<2||Object.keys(p.zoneCells).length>12))throw Error('Split requires 2–12 explicit zones covering every cell');
 return {version,axes:p.axes,patches:p.boundary.map(x=>x.name),zones:p.blocks.filter(b=>b.zone).map(b=>({ijk:b.ijk,name:b.zone})),...(split?{splitRegions:true}:{})};
}
/* FOAMLENS_BLOCKMESH_DESIGN_CORE_END */
function flMeshNativeRequest(type,payload){
 const webview=window.chrome?.webview;if(!webview?.postMessage)throw Error('Native Windows WebView2 required');
 const requestId='fl_mesh_'+Date.now()+'_'+(++flMeshNativeSequence);let finished=false,timer,listener;
 const cancel=()=>{if(!finished)webview.postMessage({type:'cancelOperation',requestId:requestId+'_cancel',targetRequestId:requestId})};
 const promise=new Promise((resolve,reject)=>{const finish=(err,data)=>{if(finished)return;finished=true;clearTimeout(timer);webview.removeEventListener('message',listener);err?reject(err):resolve(data)};listener=e=>{const r=e.data;if(r?.type==='nativeReply'&&r.requestId===requestId)finish(r.ok?null:Error(r.error||'Native mesh failed'),r.data)};webview.addEventListener('message',listener);timer=setTimeout(()=>{try{cancel()}finally{finish(Error('Native mesh request timed out'))}},payload.splitRegions?2750000:payload.snappy?1150000:type==='probeFoamMeshEnvironment'||type==='listFoamWslDistributions'?45000:600000);try{webview.postMessage({type,requestId,...payload})}catch(e){finish(e)}});
 return{promise,cancel}
}
let flMeshNativeSequence=0;
function flWslSelectionMarkup(prefix,t){
 return '<label>WSL <select id="'+prefix+'Distribution"><option value="">'+t('Default distribution','Distribución predeterminada')+'</option></select></label><button class="btn soft" id="'+prefix+'ListWsl" type="button">'+t('Refresh WSL list','Actualizar lista WSL')+'</button>'
}
function flWslOptions(select,receipt,t){
  if(receipt?.schema!=='foamlens/wsl-distributions/1'||!Array.isArray(receipt.distributions))throw Error('Invalid WSL inventory');
  const names=new Set();
  for(const item of receipt.distributions){
    if(typeof item?.name!=='string'||!item.name||item.name.length>256||/^[\-]|[\x00-\x1f\x7f]/.test(item.name)||typeof item.isDefault!=='boolean'||names.has(item.name))throw Error('Invalid WSL inventory entry');
    names.add(item.name)
  }
  if(receipt.distributions.filter(item=>item.isDefault).length>1)throw Error('Ambiguous default WSL distribution');
  const prior=select.value;select.replaceChildren();
  const base=document.createElement('option');base.value='';base.textContent=t('Default distribution','Distribución predeterminada');select.append(base);
  for(const item of receipt.distributions){const o=document.createElement('option');o.value=item.name;o.textContent=item.name+(item.isDefault?' · '+t('default','predeterminada'):'');select.append(o)}
  if(prior&&!names.has(prior)){
    const unavailable=document.createElement('option');unavailable.value=prior;unavailable.disabled=true;unavailable.textContent=prior+' · '+t('unavailable — choose another','no disponible — elige otra');select.append(unavailable)
  }
  select.value=prior;
  return receipt.distributions.length
}
function flWslSelectionAvailable(select){
  return !!select&&(!select.value||[...select.options].some(o=>o.value===select.value&&!o.disabled))
}
function flWslReceiptMatches(report,version,distribution){
  return report?.requestedVersion===version&&typeof report.distribution==='string'&&!!report.distribution&&(!distribution||report.distribution===distribution)
}
function flWslPreview(kind,split,features){
 const tools=[kind==='gmsh'?'gmshToFoam':'blockMesh'];
 if(kind==='snappy'){tools.push('surfaceCheck');if(features)tools.push('surfaceFeatures');tools.push('snappyHexMesh (diagnostic)')}
 tools.push('checkMesh');if(split)tools.push('splitMeshRegions','checkMesh (each region)');
 return tools.join(' → ')+' · '+cgUi('isolated temporary case; no solver','caso temporal aislado; sin solver')
}

function flSetEntries(sets,prefix){
 return Object.entries(sets||{}).map(([name,data])=>{if(!/^[A-Za-z_][A-Za-z0-9_]{0,127}$/.test(name)||typeof data!=='string')throw Error('Invalid native set');return{name:prefix+'/sets/'+name,data}});
}
function flNativeVolumeEntries(value,region){
 const entries=[],data=value.nativeQualityFields?.V;
 if(data!==undefined){if(value.nativeVolumeStatus!=='captured'||typeof data!=='string')throw Error('Invalid native volume receipt');entries.push({name:region?'0/'+region+'/V':'0/V',data})}
 if(value.nativeVolumeLog)entries.push({name:'logs/nativeVolumes'+(region?'.'+region:'')+'.log',data:value.nativeVolumeLog});
 return entries;
}
function flNativeMetricEntries(value,region){
 const entries=[],prefix='quality/'+(region||'combined')+'/';
 if(value.nativeMetricsStatus==='captured'){
  if(typeof value.nativeMetricsManifest!=='string')throw Error('Missing native quality manifest');
  entries.push({name:prefix+'complete.txt',data:value.nativeMetricsManifest});
  for(const [name,data] of Object.entries(value.nativeMetrics||{})){if(!/^(nonOrthogonality|skewness|faceWeight|volumeRatio|faceArea|cellVolume)$/.test(name)||typeof data!=='string')throw Error('Invalid native metric');entries.push({name:prefix+name+'.csv',data})}
 }
 if(value.nativeMetricsLog)entries.push({name:prefix+'run.log',data:value.nativeMetricsLog});
 if(value.nativeQualityBuildLog)entries.push({name:'quality/build.log',data:value.nativeQualityBuildLog});
 return entries;
}
function flMeshRegionEntries(r){
 const entries=[...flNativeVolumeEntries(r,null),...flNativeMetricEntries(r,null)];
 for(const [region,value] of Object.entries(r.regions||{})){
  if(!/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(region))throw Error('Invalid region output');
  for(const [name,data] of Object.entries(value.files||{})){
   if(!/^constant\/polyMesh\/(points|faces|owner|neighbour|boundary|cellZones|faceZones|pointZones|cellRegionAddressing|faceRegionAddressing|pointRegionAddressing|boundaryRegionAddressing)$/.test(name)||typeof data!=='string')throw Error('Invalid region mesh file');
   entries.push({name:name.replace('constant/polyMesh/','constant/'+region+'/polyMesh/'),data});
  }
  entries.push(...flSetEntries(value.sets,'constant/'+region+'/polyMesh'),...flNativeVolumeEntries(value,region),...flNativeMetricEntries(value,region));if(value.checkMeshLog)entries.push({name:'logs/checkMesh.'+region+'.log',data:value.checkMeshLog});
  entries.push({name:'logs/checkMesh.'+region+'.json',data:JSON.stringify({expectedCells:value.expectedCells,checkMeshExit:value.checkMeshExit})});
 }
 if(r.splitLog)entries.push({name:'logs/splitMeshRegions.log',data:r.splitLog});
 return entries;
}
function flMeshReportMeta(r){const {regions,sets,nativeQualityFields,nativeVolumeLog,nativeMetrics,nativeMetricsLog,nativeQualityBuildLog,...rest}=r;return {...rest,nativeVolumeCount:Object.keys(nativeQualityFields||{}).length,nativeMetricCount:Object.keys(nativeMetrics||{}).length,setCount:Object.keys(sets||{}).length,regions:Object.fromEntries(Object.entries(regions||{}).map(([k,v])=>[k,{expectedCells:v.expectedCells,checkMeshExit:v.checkMeshExit,qualityStatus:v.qualityStatus||'undetermined',fileCount:Object.keys(v.files||{}).length,setCount:Object.keys(v.sets||{}).length,setWarnings:v.setWarnings||[],nativeVolumeStatus:v.nativeVolumeStatus||'not-run',nativeVolumeCount:Object.keys(v.nativeQualityFields||{}).length,nativeMetricsStatus:v.nativeMetricsStatus||'not-run',nativeMetricCount:Object.keys(v.nativeMetrics||{}).length}]))}}
function flHasNativeMesh(r){return !!r?.meshGenerated&&(Object.keys(r.files||{}).length>0||Object.keys(r.regions||{}).length>0)}
function flRegionStatus(r){return r.splitRequested?' · split '+(r.splitExit??'—')+' · '+Object.keys(r.regions||{}).length+' regions · '+Object.entries(r.regions||{}).map(([name,v])=>name+': '+(v.qualityStatus||'undetermined')).join(' | ')+' · '+(r.splitError||'') : ''}
function cmbUniformBackgroundPreview(p,cfg,advanced){
 if(cfg.minLevel!==cfg.maxLevel||cfg.minLevel<1||cfg.minLevel>4)throw Error('Uniform background requires equal levels 1–4');
 if(advanced.boxes.length||advanced.surfaceSettings.length||Object.keys(p.zoneCells).length)throw Error('Uniform background does not support zones, local boxes or surface overrides/layers');
 if(p.axes.some(a=>a.grading.some(g=>g!==1)))throw Error('Uniform background requires unit grading in every interval');
 const factor=2**cfg.minLevel,cells=p.cellCount*factor**3;
 if(!Number.isSafeInteger(cells)||cells>200000||cells>cfg.maxCells||p.axes.some(a=>a.counts.some(n=>n*factor>10000)))throw Error('Uniform background exceeds native or selected cell limits');
 return {factor,cells,level:cfg.minLevel}
}
function cmbSnappySettings(p,inside,levels,maxCells){
 if(Object.keys(p.zoneCells).length)throw Error('Snappy needs a background without zones');
 const q=String(inside).trim().split(/\s+/).map(cmbNumber),l=String(levels).trim().split(/\s+/).map(cmbNumber),cap=cmbNumber(String(maxCells));
 if(q.length!==3||q.some((x,i)=>x<=p.axes[i].points[0]||x>=p.axes[i].points.at(-1)))throw Error('Enter X Y Z in meters strictly inside background domain');
 if(l.length!==2||l.some(x=>!Number.isInteger(x)||x<0||x>4)||l[1]<l[0]||!Number.isInteger(cap)||cap<p.cellCount||cap>350000)throw Error('Enter levels 0–4 and cell cap within 350000');
 return{inside:q,minLevel:l[0],maxLevel:l[1],maxCells:cap};
}
function cmbAdvancedSnappy(p,surfaceCount,boxText,surfaceText,layerText,snapEnabled=true,transitionLayers=2,explicitFeatures=false){
 if(typeof snapEnabled!=='boolean'||!Number.isInteger(transitionLayers)||transitionLayers<1||transitionLayers>6)throw Error('Transition buffer must be 1–6 cells');
 const rows=text=>String(text||'').split(/\r?\n/).map(v=>v.trim()).filter(Boolean).map(v=>v.split(/\s+/).map(cmbNumber));
 const boxRows=rows(boxText),surfaceRows=rows(surfaceText),layer=rows(layerText);
 if(boxRows.length>12)throw Error('Maximum 12 refinement boxes');
 const boxes=boxRows.map(v=>{if(v.length!==7||!Number.isInteger(v[6])||v[6]<1||v[6]>4||v.slice(0,3).some((x,i)=>x>=v[i+3]||x<p.axes[i].points[0]||v[i+3]>p.axes[i].points.at(-1)))throw Error('Box row: xmin ymin zmin xmax ymax zmax level (m, level 1–4)');return{min:v.slice(0,3),max:v.slice(3,6),level:v[6]}});
 const ids=new Set(),surfaceSettings=surfaceRows.map(v=>{const [id,minLevel,maxLevel,layers]=v;if(v.length!==4||v.some(x=>!Number.isInteger(x))||id<1||id>surfaceCount||ids.has(id)||minLevel<0||maxLevel<minLevel||maxLevel>4||layers<0||layers>8)throw Error('Surface row: ID min max layers (0–4 levels, 0–8 layers, no duplicate ID)');ids.add(id);return{id,minLevel,maxLevel,layers}});
 if(layer.length!==1||layer[0].length!==3)throw Error('Layer settings: expansion finalRelative minRelative');
 const [expansionRatio,finalLayerThickness,minThickness]=layer[0];if(expansionRatio<1||expansionRatio>2||finalLayerThickness<=0||finalLayerThickness>.9||minThickness<=0||minThickness>finalLayerThickness)throw Error('Invalid relative layer thickness or expansion');
 if(typeof explicitFeatures!=='boolean'||explicitFeatures&&!snapEnabled)throw Error('Explicit feature snapping requires snap enabled');if(!snapEnabled&&surfaceSettings.some(x=>x.layers>0))throw Error('Boundary layers require snapping');return{boxes,surfaceSettings,layerSettings:{expansionRatio,finalLayerThickness,minThickness},snapEnabled,transitionLayers,explicitFeatures};
}
function cmbBoxSlice(p,axis,index,boxes){
 const slice=cmbSlice(p,axis,index),lo=p.axes[axis].points[index],hi=p.axes[axis].points[index+1];
 return boxes.map((b,i)=>({...b,id:i+1})).filter(b=>b.max[axis]>lo&&b.min[axis]<hi).map(b=>({id:b.id,level:b.level,rect:[b.min[slice.u],b.min[slice.v],b.max[slice.u],b.max[slice.v]]}));
}
function cmbVisibleSurfaces(){
 const selections=[];let total=0;
 for(const model of cgModels)if(model.visible)for(const [part,visible] of model.partsVisible)if(visible){
  const scale=cgUnitScale(model.unit),triangles=model.partSummaries.get(part)?.triangles||0;if(!scale||!triangles)throw Error('Confirm units and nonempty geometry for every visible surface');
  total+=84+50*triangles;if(selections.length>=8||total>4*1024*1024)throw Error('Visible surface count or total STL size exceeds native limit');
  const tris=model.triangles.filter(t=>t.part===part);selections.push({model,part,bytes:cgBinaryStl(tris,scale,part),triangles:tris.length});
 }
 return selections;
}
function cmbMount(){
  const anchor=document.getElementById('cgOpenFoamPrepPreview');if(!anchor||document.getElementById('cmbDesigner'))return;
  const panel=document.createElement('details');panel.id='cmbDesigner';panel.style.cssText='margin:12px 0;padding:12px;border:1px solid var(--line);border-radius:10px';
  const tr=(a,b)=>cgEscape(cgUi(a,b));
  panel.innerHTML='<summary><b>'+tr('Block mesh designer · Cartesian multi-block','Diseñador blockMesh · multibloque cartesiano')+'</b></summary>'+
    '<p class="cgNotice">'+tr('Coordinates in meters. First line: start. Each next line: end / cells / expansion ratio. Shared axis intervals ensure matching tangential subdivisions. No curved edges or automatic CAD fitting yet.','Coordenadas en metros. Primera línea: inicio. Siguientes: fin / celdas / relación de expansión. Intervalos compartidos aseguran subdivisión tangencial compatible. Aún sin arcos ni ajuste automático al CAD.')+'</p>'+
    '<button class="btn soft" id="cmbBounds" type="button">'+tr('Use visible CAD bounds','Usar límites CAD visibles')+'</button>'+
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(180px,100%),1fr));gap:8px">'+['X','Y','Z'].map(a=>'<label>'+a+' [m]<textarea id="cmb'+a+'" rows="4" placeholder="0\n0.01 10 1" style="display:block;width:100%;box-sizing:border-box"></textarea></label>').join('')+'</div>'+
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:6px">'+['xMin','xMax','yMin','yMax','zMin','zMax'].map((p,i)=>'<label>'+p+'<input id="cmbPatch'+i+'" value="'+p+'" style="width:100%"></label>').join('')+'</div>'+
    '<p class="cgNotice">'+tr('Explicit cell zones: i j k zone, zero-based. Click a block in the slice to assign the typed zone. Blank zone clears it. Exterior patches remain generic patch; no BC is inferred.','Zonas de celdas: i j k zona, desde cero. Pulsa un bloque del corte para asignar la zona escrita; vacío la elimina. Fronteras externas tipo patch; no se infieren BC.')+'</p>'+
    '<div class="cgTools"><label>'+tr('Zone name','Nombre de zona')+' <input id="cmbPaint" placeholder="metal / mold"></label><label>'+tr('Slice normal','Normal del corte')+' <select id="cmbNormal"><option value="2">Z (XY)</option><option value="1">Y (XZ)</option><option value="0">X (YZ)</option></select></label><label>'+tr('Layer','Capa')+' <select id="cmbLayer"></select></label></div>'+
    '<textarea id="cmbZones" rows="3" style="width:100%;box-sizing:border-box" placeholder="0 0 0 metal"></textarea>'+
    '<div class="cgTools"><button class="btn primary" id="cmbPreview" type="button">'+tr('Build plan / preview','Crear plan / vista previa')+'</button><button class="btn soft" id="cmbExport" disabled type="button">'+tr('Export blockMeshDict + plan ZIP','Exportar blockMeshDict + plan ZIP')+'</button></div>'+
    '<p id="cmbStatus" class="cgNotice" aria-live="polite"></p><div id="cmbView"></div><div class="cgTools"><label>OpenFOAM Foundation <select id="cmbVersion"><option value="14">14</option><option value="13">13</option></select></label>'+flWslSelectionMarkup('cmb',tr)+'<button class="btn soft" id="cmbProbeEnvironment" type="button">'+tr('Check WSL tools','Comprobar herramientas WSL')+'</button><label><input type="checkbox" id="cmbSplit"> splitMeshRegions (cellZones)</label><label><input type="checkbox" id="cmbSnappy"> snappyHexMesh (CAD · diagnostic)</label><button class="btn primary" id="cmbNativeRun" type="button" disabled>'+tr('Run blockMesh + checkMesh in temporary WSL case','Ejecutar blockMesh + checkMesh en caso temporal WSL')+'</button><button class="btn soft" id="cmbNativeCancel" type="button" disabled>'+tr('Cancel','Cancelar')+'</button><button class="btn soft" id="cmbInspectNative" type="button" disabled>'+tr('Inspect generated mesh','Inspeccionar malla generada')+'</button><button class="btn soft" id="cmbNativeExport" type="button" disabled>'+tr('Export actual mesh / logs ZIP','Exportar malla real / logs ZIP')+'</button></div><p class="cgNotice">'+tr('Windows + selected WSL, selected Foundation version installed. 200,000 cell and 24 MiB mesh transfer limits; optional explicit zone splitting; no solver or BC.','Windows + WSL seleccionado, versión Foundation seleccionada instalada. Límite de 200,000 celdas y 24 MiB de malla; separación explícita opcional; sin solver ni BC.')+'</p><div id="cmbSnappyControls" hidden><p class="cgNotice">'+tr('Diagnostic only: refined snappy meshes have not passed strict native quality acceptance. Results may be inspected and exported as evidence, never certified for solver use.','Solo diagnóstico: las mallas refinadas de snappy aún no pasan la aceptación nativa estricta. Se pueden inspeccionar y exportar como evidencia, no certificar para solver.')+'</p><p class="cgNotice">'+tr('Select a visible CAD surface in the Surface Inspector, confirm units, and expand the background bounds around it. Set the point of the retained region yourself. One selected surface or all visible surfaces (up to 8); optional local refinement and layers, no automatic CHT zoning.','Selecciona una superficie CAD visible, confirma unidades y amplía los límites del fondo. Define tú el punto de la región a conservar. Una superficie seleccionada o todas las visibles (hasta 8); refinamiento localizado y capas opcionales, sin zonificación CHT automática.')+'</p><div class="cgTools"><label><input type="checkbox" id="cmbAllSurfaces"> '+tr('Use all visible CAD parts','Usar todas las partes CAD visibles')+'</label><label>insidePoint [m] <input id="cmbInside" placeholder="X Y Z"></label><label>'+tr('Refinement min max','Refinamiento mín máx')+' <input id="cmbRefine" value="1 2"></label><label>maxGlobalCells <input id="cmbMaxCells" type="number" min="1" max="350000" value="200000"></label></div><details open><summary>'+tr('Advanced refinement and boundary layers','Refinamiento avanzado y capas de frontera')+'</summary><div class="cgTools"><label><input type="checkbox" id="cmbSnapEnabled" checked> '+tr('Snap to surface','Ajustar a superficie')+'</label><label>nCellsBetweenLevels <input id="cmbTransition" type="number" min="1" max="6" value="2"></label><label><input type="checkbox" id="cmbExplicitFeatures"> '+tr('Explicit sharp-edge snapping','Ajuste explícito de aristas vivas')+'</label><label><input type="checkbox" id="cmbUniformBackground"> '+tr('Uniform background alternative','Alternativa de fondo uniforme')+'</label></div><p class="cgNotice">'+tr('Explicit alternative: equal levels 1–4, unit grading, no local boxes or surface overrides/layers. Multiplies background cells by 8^level, sets local surface levels to zero. Not a quality guarantee.','Alternativa explícita: niveles iguales 1–4, gradación unitaria, sin cajas locales ni ajustes/capas por superficie. Multiplica las celdas de fondo por 8^nivel y usa niveles locales cero. No garantiza calidad.')+'</p><p class="cgNotice">'+tr('Disable snap for an explicit castellated-only diagnostic; layers then unavailable. Larger transition buffers can change cell count, not guarantee quality.','Desactiva snap para diagnóstico explícito solo castellated; sin capas. Una transición más amplia puede cambiar el número de celdas, no garantiza calidad.')+'</p><p class="cgNotice">'+tr('Box rows in meters: xmin ymin zmin xmax ymax zmax level. Up to 12 boxes.','Cajas en metros: xmin ymin zmin xmax ymax zmax nivel. Hasta 12 cajas.')+'</p><textarea id="cmbBoxes" rows="3" style="width:100%;box-sizing:border-box" placeholder="0.01 0.01 0.01 0.02 0.02 0.02 2"></textarea><div class="cgTools"><button class="btn soft" id="cmbSurfaceList" type="button">'+tr('Show current surface IDs','Mostrar IDs de superficies actuales')+'</button></div><p id="cmbSurfaceNames" class="cgNotice"></p><p class="cgNotice">'+tr('Override rows: surface ID minLevel maxLevel layers. Unlisted surfaces use global levels and zero layers. Recheck IDs after changing visible parts.','Filas: ID de superficie nivelMín nivelMáx capas. Las demás usan niveles globales y cero capas. Revisa los IDs al cambiar partes visibles.')+'</p><textarea id="cmbSurfaceSettings" rows="3" style="width:100%;box-sizing:border-box" placeholder="1 1 2 0"></textarea><label>'+tr('Layer expansion / final relative thickness / minimum relative thickness','Expansión / espesor relativo final / espesor relativo mínimo')+' <input id="cmbLayers" value="1.2 0.3 0.1"></label><p class="cgNotice">'+tr('Layer count is requested, not guaranteed. Thickness is relative to local cell size; inspect native logs.','El número de capas se solicita, no se garantiza. Espesores relativos al tamaño local de celda; revisa los logs nativos.')+'</p></details></div><p id="cmbCommandPreview" class="cgNotice"></p><p id="cmbEnvironmentStatus" class="cgNotice" aria-live="polite"></p><p id="cmbNativeStatus" class="cgNotice" aria-live="polite"></p><pre id="cmbNativeLogs" style="white-space:pre-wrap;max-height:260px;overflow:auto"></pre>';
  anchor.insertAdjacentElement('afterend',panel);
  const el=id=>document.getElementById(id);let plan=null,nativeReport=null,nativeTask=null,nativeSurface=null,revision=0,confirmedSurfaces=null;
  const input=()=>({axes:['X','Y','Z'].map(a=>el('cmb'+a).value),patches:Array.from({length:6},(_,i)=>el('cmbPatch'+i).value.trim()),zones:el('cmbZones').value});
  const invalidate=()=>{resetNative();plan=null;el('cmbExport').disabled=true;el('cmbView').textContent='';el('cmbStatus').textContent=cgUi('Inputs changed; rebuild plan.','Entradas modificadas; vuelve a generar el plan.');buttons()};
  const available=()=>!!window.chrome?.webview?.postMessage;
  function buttons(){el('cmbListWsl').disabled=!!nativeTask||!available();el('cmbDistribution').disabled=!!nativeTask;el('cmbCommandPreview').textContent=flWslPreview(el('cmbSnappy').checked?'snappy':'block',el('cmbSplit').checked,el('cmbExplicitFeatures').checked);el('cmbProbeEnvironment').disabled=!!nativeTask||!available()||!flWslSelectionAvailable(el('cmbDistribution'));el('cmbNativeRun').disabled=!!nativeTask||!available()||!flWslSelectionAvailable(el('cmbDistribution'))||!plan||plan.cellCount>200000;el('cmbNativeCancel').disabled=!nativeTask;el('cmbNativeExport').disabled=!nativeReport||!!nativeTask;el('cmbInspectNative').disabled=!flHasNativeMesh(nativeReport)||!!nativeTask}
  function resetNative(){revision++;nativeReport=null;nativeSurface=null;if(nativeTask)nativeTask.cancel();el('cmbNativeStatus').textContent='';el('cmbNativeLogs').textContent='';buttons()}
  el('cmbDistribution').onchange=el('cmbVersion').onchange=()=>{el('cmbEnvironmentStatus').textContent='';resetNative()};
  el('cmbListWsl').onclick=async()=>{if(nativeTask||!available())return;resetNative();const token=revision,status=el('cmbEnvironmentStatus');try{nativeTask=flMeshNativeRequest('listFoamWslDistributions',{});buttons();const r=await nativeTask.promise;if(token!==revision)return;const n=flWslOptions(el('cmbDistribution'),r,tr);status.textContent=n+' · '+tr('installed WSL distributions','distribuciones WSL instaladas')}catch(e){if(token===revision)status.textContent=e.message}finally{nativeTask=null;buttons()}};el('cmbSplit').onchange=()=>{if(el('cmbSplit').checked){el('cmbSnappy').checked=false;el('cmbSnappyControls').hidden=true}resetNative()};el('cmbSnappy').onchange=()=>{if(el('cmbSnappy').checked)el('cmbSplit').checked=false;el('cmbSnappyControls').hidden=!el('cmbSnappy').checked;el('cmbNativeRun').textContent=el('cmbSnappy').checked?'blockMesh → surfaceCheck → snappyHexMesh → checkMesh':cgUi('Run blockMesh + checkMesh','Ejecutar blockMesh + checkMesh');resetNative()};for(const id of ['cmbInside','cmbRefine','cmbMaxCells','cmbAllSurfaces','cmbBoxes','cmbSurfaceSettings','cmbLayers','cmbSnapEnabled','cmbTransition','cmbExplicitFeatures','cmbUniformBackground'])el(id).oninput=resetNative;
  el('cmbSurfaceList').onclick=()=>{confirmedSurfaces=null;try{const selected=el('cmbAllSurfaces').checked?cmbVisibleSurfaces():[cgNativeSelectedSurface()];confirmedSurfaces=selected.map(v=>({model:v.model,part:v.part,unit:v.model.unit,triangles:v.triangles}));el('cmbSurfaceNames').textContent=selected.map((v,i)=>(i+1)+' · '+String(v.model.name||v.model.filename||'CAD')+' / '+v.part+' · '+v.triangles+' triangles').join(' | ')}catch(e){el('cmbSurfaceNames').textContent=e.message}};
  el('cmbProbeEnvironment').onclick=async()=>{if(nativeTask||!available()||!flWslSelectionAvailable(el('cmbDistribution')))return;const token=revision,version=el('cmbVersion').value,distribution=el('cmbDistribution').value;const status=el('cmbEnvironmentStatus');status.textContent=tr('Checking selected WSL distribution…','Comprobando distribución WSL seleccionada…');try{nativeTask=flMeshNativeRequest('probeFoamMeshEnvironment',{version,distribution});buttons();const r=await nativeTask.promise;if(token!==revision)return;if(r?.schema!=='foamlens/wsl-foundation-preflight/1'||!flWslReceiptMatches(r,version,distribution)||r.originalCaseModified!==false)throw Error('Unexpected WSL preflight report');if(!r.matched){status.textContent=tr('Requested Foundation environment not verified. ','Entorno Foundation solicitado no verificado. ')+(r.stderr||'');return}const tools=Object.entries(r.tools||{});status.textContent='Foundation '+version+' · '+String(r.distribution||distribution||'WSL')+' · '+tools.map(([name,ok])=>name+': '+(ok?tr('available','disponible'):tr('missing','ausente'))).join(' | ')}catch(e){if(token===revision)status.textContent=e.message}finally{nativeTask=null;if(token!==revision)status.textContent='';buttons()}};
  el('cmbNativeCancel').onclick=()=>{if(nativeTask){nativeTask.cancel();el('cmbNativeStatus').textContent=cgUi('Cancellation requested; awaiting native response.','Cancelación solicitada; esperando respuesta nativa.')}};
  el('cmbNativeRun').onclick=async()=>{if(nativeTask||!plan||!available()||!flWslSelectionAvailable(el('cmbDistribution')))return;let token,surface=null;try{const p=cmbPlan(input()),version=el('cmbVersion').value,payload=cmbNativePayload(p,version,el('cmbSplit').checked);if(el('cmbSnappy').checked){const cfg=cmbSnappySettings(p,el('cmbInside').value,el('cmbRefine').value,el('cmbMaxCells').value),selected=el('cmbAllSurfaces').checked?cmbVisibleSurfaces():[cgNativeSelectedSurface()];if(!selected.length||selected.length>8||selected.reduce((n,v)=>n+v.bytes.length,0)>4*1024*1024)throw Error('Select 1–8 surfaces totaling at most 4 MiB');surface=selected.map((v,i)=>({file:'surface_'+String(i+1).padStart(3,'0')+'.stl',geometry:'flSurface_'+String(i+1).padStart(3,'0'),bytes:v.bytes,part:v.part,triangles:v.triangles,sourceUnit:v.model.unit,sourceName:String(v.model.name||v.model.filename||'CAD')}));const advanced=cmbAdvancedSnappy(p,surface.length,el('cmbBoxes').value,el('cmbSurfaceSettings').value,el('cmbLayers').value,el('cmbSnapEnabled').checked,Number(el('cmbTransition').value),el('cmbExplicitFeatures').checked);if(advanced.surfaceSettings.length&&(!confirmedSurfaces||confirmedSurfaces.length!==selected.length||selected.some((v,i)=>{const q=confirmedSurfaces[i];return q.model!==v.model||q.part!==v.part||q.unit!==v.model.unit||q.triangles!==v.triangles})))throw Error(cgUi('CAD selection changed or unconfirmed; show current surface IDs and review overrides first.','Selección CAD modificada o no confirmada; muestra los IDs actuales y revisa los ajustes primero.'));const uniformBackground=el('cmbUniformBackground').checked;if(uniformBackground)cmbUniformBackgroundPreview(p,cfg,advanced);payload.snappy={...cfg,...advanced,uniformBackground,surfaces:surface.map(v=>({stlBase64:cgBytesToBase64(v.bytes)}))}}resetNative();payload.snappyDiagnosticOnly=true;payload.distribution=el('cmbDistribution').value;token=revision;nativeTask=flMeshNativeRequest('runCartesianMesh',payload);buttons();el('cmbNativeStatus').textContent=cgUi('Running in isolated WSL temporary case…','Ejecutando en caso temporal WSL aislado…');
   const r=await nativeTask.promise;if(token!==revision)return;if(r?.schema!==(payload.snappy?'foamlens/native-snappy-mesh/1':'foamlens/native-cartesian-mesh/1')||r.originalCaseModified!==false||r.plannedCells!==p.cellCount||!flWslReceiptMatches(r,version,payload.distribution))throw Error('Unexpected native report');
   nativeReport=r;nativeSurface=surface;const count=Object.keys(r.files||{}).length;el('cmbNativeStatus').textContent='Foundation '+(r.version||'—')+' · '+r.generationUtility+' exit '+(r.generationExit??'—')+' · checkMesh exit '+(r.checkMeshExit??'—')+' ('+(r.qualityStatus||'undetermined')+') · '+count+' mesh files'+flRegionStatus(r)+' · '+(r.exportError||cgUi('Review logs; no quality certification.','Revisa logs; sin certificación de calidad.'));
   if(r.generationUtility==='snappyHexMesh')el('cmbNativeStatus').textContent+=' · '+tr('DIAGNOSTIC ONLY','SOLO DIAGNÓSTICO');if(r.qualityStatus==='checks-failed')el('cmbNativeStatus').textContent+=' · '+tr('Not solver-ready. Inspect defect sets before changing refinement or snapping.','No apta para solver. Inspecciona conjuntos de defectos antes de cambiar refinamiento o snap.');
   el('cmbNativeLogs').textContent=[r.stderr,r.stdout,r.blockMeshLog,r.surfaceCheckLog,r.snappyLog,r.checkMeshLog,r.splitLog].filter(Boolean).join('\n\n');
  }catch(e){if(token===undefined||token===revision)el('cmbNativeStatus').textContent=e.message}finally{nativeTask=null;buttons()}};
  el('cmbInspectNative').onclick=()=>{try{window.FoamLensLoadGeneratedMesh(nativeReport,nativeReport.generationUtility);}catch(e){el('cmbNativeStatus').textContent=e.message}};
  el('cmbNativeExport').onclick=()=>{if(!nativeReport)return;const {files,dictionary,blockMeshLog,checkMeshLog,snappyDictionary,snappyLog,surfaceCheckLog,...meta}=flMeshReportMeta(nativeReport);try{const entries=[{name:'system/blockMeshDict',data:dictionary},{name:'report.json',data:JSON.stringify(meta,null,2)}];if(typeof nativeReport.stagingControlDict==='string')entries.push({name:'system/controlDict',data:nativeReport.stagingControlDict});if(typeof nativeReport.expectedRegionInput==='string')entries.push({name:'expected-regions.txt',data:nativeReport.expectedRegionInput});if(blockMeshLog)entries.push({name:'blockMesh.log',data:blockMeshLog});if(snappyDictionary)entries.push({name:'system/snappyHexMeshDict',data:snappyDictionary});if(nativeReport.surfaceFeaturesDictionary)entries.push({name:'system/surfaceFeaturesDict',data:nativeReport.surfaceFeaturesDictionary});if(nativeReport.surfaceFeaturesLog)entries.push({name:'surfaceFeatures.log',data:nativeReport.surfaceFeaturesLog});if(nativeSurface){for(const v of nativeSurface)entries.push({name:'constant/geometry/'+v.file,data:v.bytes});entries.push({name:'surface-source.json',data:JSON.stringify(nativeSurface.map(({bytes,...v})=>({...v,exportUnit:'m'})),null,2)})}if(snappyLog)entries.push({name:'snappyHexMesh.log',data:snappyLog});if(surfaceCheckLog)entries.push({name:'surfaceCheck.log',data:surfaceCheckLog});if(checkMeshLog)entries.push({name:'checkMesh.log',data:checkMeshLog});for(const [name,data] of Object.entries(files||{})){if(!/^constant\/polyMesh\/(points|faces|owner|neighbour|boundary|cellZones|faceZones|pointZones)$/.test(name)||typeof data!=='string')throw Error('Invalid native mesh file');entries.push({name,data})}entries.push(...flSetEntries(nativeReport.sets,'constant/polyMesh'),...flMeshRegionEntries(nativeReport));if(nativeReport.generationUtility==='snappyHexMesh')entries.push({name:'DIAGNOSTIC_ONLY.txt',data:'Experimental snappyHexMesh evidence. No solver-ready or native quality acceptance claim. Inspect checkMesh.log and defect sets.\n'});cgDownloadZip(nativeReport.generationUtility==='snappyHexMesh'?'FoamLens-snappy-DIAGNOSTIC.zip':'FoamLens-native-cartesian-mesh.zip',cgStoreZip(entries))}catch(e){el('cmbNativeStatus').textContent=e.message}};
  const draw=()=>{
    if(!plan)return;const axis=Number(el('cmbNormal').value),layers=el('cmbLayer'),old=Number(layers.value)||0;
    layers.innerHTML=Array.from({length:plan.dims[axis]},(_,i)=>'<option value="'+i+'">'+i+'</option>').join('');layers.value=String(Math.min(old,plan.dims[axis]-1));
    const s=cmbSlice(plan,axis,Number(layers.value)),u=plan.axes[s.u].points,v=plan.axes[s.v].points,W=640,H=320,L=55,T=22,ww=560,hh=255;
    const px=x=>L+(x-u[0])/(u.at(-1)-u[0])*ww,py=y=>T+(v.at(-1)-y)/(v.at(-1)-v[0])*hh;
    const names=Object.keys(plan.zoneCells).sort(),colors=['#36a3be','#d6a248','#8b8cdb','#59b88b','#cd728b','#778897'];
    let overlay='',overlayNote='';
    if(el('cmbSnappy').checked&&el('cmbBoxes').value.trim()){try{const boxes=cmbAdvancedSnappy(plan,8,el('cmbBoxes').value,'','1.2 0.3 0.1').boxes;
      const visible=cmbBoxSlice(plan,axis,Number(layers.value),boxes);
      overlay=visible.map(b=>{const [x0,y0,x1,y1]=b.rect,x=px(x0),y=py(y1),w=px(x1)-x,h=py(y0)-y;return '<g pointer-events="none"><rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="#f9c67c" fill-opacity=".12" stroke="#ffbf69" stroke-width="2" stroke-dasharray="5 3"/><text x="'+(x+4)+'" y="'+(y+13)+'" fill="#ffdfaf" font-size="11">Box '+b.id+' · L'+b.level+'</text></g>'}).join('');
      overlayNote=tr('Refinement boxes intersecting the selected block slab (not generated cells): ','Cajas que intersectan la capa seleccionada (no son celdas generadas): ')+visible.length+'/'+boxes.length;
    }catch(e){overlayNote=cgEscape(e.message)}}
    const svg='<svg viewBox="0 0 '+W+' '+H+'" style="width:100%;max-height:350px;background:#101b2c;border-radius:9px" aria-label="Cartesian block plan">'+s.blocks.map(b=>{
      const [x0,y0,x1,y1]=b.rect,w=px(x1)-px(x0),h=py(y0)-py(y1);
      return '<g data-cmb-key="'+b.key+'" role="button" tabindex="0" aria-label="'+cgEscape(b.key+' '+(b.zone||'unassigned'))+'"><rect x="'+px(x0)+'" y="'+py(y1)+'" width="'+w+'" height="'+h+'" stroke="#c6d8e7" fill="'+(b.zone?colors[names.indexOf(b.zone)%colors.length]:'#33465b')+'"/>'+(w>45&&h>24?'<text pointer-events="none" x="'+(px(x0)+w/2)+'" y="'+(py(y1)+h/2)+'" text-anchor="middle" fill="#fff" font-size="11">'+cgEscape((b.zone||b.key).slice(0,18))+'</text>':'')+'</g>'
    }).join('')+overlay+'<text x="320" y="304" fill="#dbe5ef" text-anchor="middle" font-size="12">'+('XYZ'[s.u])+' [m] '+u[0]+' → '+u.at(-1)+'</text><text x="8" y="17" fill="#dbe5ef" font-size="12">'+('XYZ'[s.v])+' [m] '+v[0]+' → '+v.at(-1)+'</text></svg>';
    el('cmbView').innerHTML=svg+(overlayNote?'<p class="cgNotice">'+overlayNote+'</p>':'')+'<p class="cgNotice">'+tr('Planned cells','Celdas previstas')+': '+plan.cellCount.toLocaleString()+' · '+tr('Blocks','Bloques')+': '+plan.blocks.length+' · '+tr('Unassigned cells','Celdas sin zona')+': '+plan.unassignedCells.toLocaleString()+'</p><p class="cgNotice">'+names.map(n=>cgEscape(n)+': '+plan.zoneCells[n].toLocaleString()).join(' · ')+'</p><p class="cgNotice">'+tr('Different-zone shared block faces (planned, not validated interfaces)','Caras compartidas entre zonas (previstas, no interfaces validadas)')+': '+plan.interfaces.length+' · '+plan.interfaces.reduce((n,f)=>n+f.plannedFaces,0).toLocaleString()+'</p>';
    for(const g of el('cmbView').querySelectorAll('[data-cmb-key]')){
      const assign=()=>{try{const key=g.dataset.cmbKey,zone=el('cmbPaint').value.trim();if(zone)cmbName(zone);
        const rows=el('cmbZones').value.split(/\r?\n/).filter(l=>l.trim()&&l.trim().split(/\s+/).slice(0,3).join(',')!==key);if(zone)rows.push(key.replaceAll(',',' ')+' '+zone);el('cmbZones').value=rows.join('\n');build()
      }catch(e){el('cmbStatus').textContent=String(e.message)}};
      g.onclick=assign;g.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();assign()}}
    }
  };
  const build=()=>{resetNative();try{plan=cmbPlan(input());el('cmbExport').disabled=false;buttons();el('cmbStatus').textContent=cgUi('Cartesian plan ready; no mesh has been generated.','Plan cartesiano listo; no se ha generado malla.');draw()}catch(e){invalidate();el('cmbStatus').textContent=String(e.message)}};
  for(const id of ['cmbX','cmbY','cmbZ','cmbZones',...Array.from({length:6},(_,i)=>'cmbPatch'+i)])el(id).addEventListener('input',invalidate);
  el('cmbPreview').onclick=build;el('cmbNormal').onchange=draw;el('cmbLayer').onchange=draw;for(const id of ['cmbBoxes','cmbSnappy','cmbSplit'])el(id).addEventListener(id==='cmbBoxes'?'input':'change',draw);
  el('cmbBounds').onclick=()=>{try{
    const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];let n=0;
    for(const m of cgModels)if(m.visible)for(const [part,shown] of m.partsVisible)if(shown){
      const scale=cgUnitScale(m.unit),b=m.partSummaries.get(part)?.bounds;if(!scale||!b)throw Error('Confirm all visible CAD units and bounds');
      for(let i=0;i<3;i++){lo[i]=Math.min(lo[i],b.min[i]*scale);hi[i]=Math.max(hi[i],b.max[i]*scale)}n++
    }
    if(!n||lo.some((x,i)=>!Number.isFinite(x)||!Number.isFinite(hi[i])||hi[i]<=x))throw Error('Need finite nonzero 3D visible bounds; define thin axes manually');
    ['X','Y','Z'].forEach((a,i)=>el('cmb'+a).value=String(lo[i])+'\n'+String(hi[i])+' 10 1');el('cmbZones').value='';invalidate();el('cmbStatus').textContent=cgUi('Bounds copied; 10 cells per axis is only an editable starting suggestion, not fitted geometry.','Límites copiados; 10 celdas por eje es solo sugerencia editable, no ajuste geométrico.')
  }catch(e){el('cmbStatus').textContent=String(e.message)}};
  el('cmbExport').onclick=()=>{if(!plan)return;try{const current=cmbPlan(input());cgDownloadZip('FoamLens-cartesian-blockMesh-plan.zip',cgStoreZip([{name:'staging/system/blockMeshDict',data:cmbDictionary(current)},{name:'plan.json',data:JSON.stringify(current,null,2)+'\n'},{name:'README.txt',data:'Review installed version and patches. Run blockMesh and checkMesh only in a NEW case. Zones are not split regions or verified interfaces. No curved edges, CAD fit, BC, polyMesh or solver generated.\n'}]))}catch(e){invalidate();el('cmbStatus').textContent=String(e.message)}}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',cmbMount,{once:true});else cmbMount();
window.FoamLensCartesianBlockMesh={plan:cmbPlan,dictionary:cmbDictionary,slice:cmbSlice,nativePayload:cmbNativePayload};


/* FOAMLENS_MESH_STUDIO_CORE_START */
const msCore=(()=>{
 const fail=m=>{throw Error(m)},num=s=>{if(typeof s!=='string'||!/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?$/.test(s)||!Number.isFinite(Number(s)))fail('Invalid finite decimal: '+s);return Number(s)},id=s=>{const n=num(s);if(!/^\d+$/.test(s)||!Number.isSafeInteger(n))fail('Invalid label');return n},word=s=>{if(typeof s!=='string'||!/^[A-Za-z_][\w.:-]*$/.test(s))fail('Unsupported name: '+s);return s};
 const add=(a,b)=>a.map((x,i)=>x+b[i]),sub=(a,b)=>a.map((x,i)=>x-b[i]),mul=(a,k)=>a.map(x=>x*k),dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm=a=>Math.hypot(...a);
 function reader(source){
  if(typeof source!=='string'||source.length>96*1024*1024||source.includes('\0'))fail('Unsupported binary/oversized input');
  const re=/\s+|\/\/[^\r\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|[(){}\[\];]|[^\s(){}\[\];"]+/gy;let pos=0,c;
  function scan(){while(pos<source.length){re.lastIndex=pos;const m=re.exec(source);if(!m)fail('Invalid token at '+pos);pos=re.lastIndex;if(/^\s|^\/[/*]/.test(m[0]))continue;return m[0]}return null}
  const peek=()=>c===undefined?(c=scan()):c,take=()=>{const x=peek();c=undefined;if(x===null)fail('Unexpected EOF');return x},expect=x=>{if(take()!==x)fail('Expected '+x)};
  function list(open='(',close=')',depth=0){if(depth>16)fail('Excessive nesting');expect(open);const a=[];while(peek()!==close){if(peek()===null)fail('Unclosed list');a.push(peek()==='('?list('(',')',depth+1):peek()==='['?list('[',']',depth+1):take());if(a.length>5000000)fail('List limit')}expect(close);return a}
  function dict(){expect('{');const d=Object.create(null);while(peek()!=='}'){const k=word(take());if(Object.hasOwn(d,k))fail('Duplicate '+k);if(peek()==='{'){d[k]=dict();continue}const vals=[];while(peek()!==';'){if(peek()===null||peek()==='}')fail('Missing ;');vals.push(peek()==='('?list():peek()==='['?list('[',']'):take())}expect(';');d[k]=vals.length===1?vals[0]:vals}expect('}');return d}
  return {peek,take,expect,list,dict};
 }
 const vec=a=>{if(!Array.isArray(a)||a.length!==3)fail('Expected XYZ');return a.map(num)},labels=(a,n,min)=>{if(!Array.isArray(a)||a.length<min)fail('Invalid vertices');const v=a.map(id);if(v.some(x=>x>=n)||new Set(v).size!==v.length)fail('Duplicate/out-of-range vertex');return v},key=a=>a.slice().sort((x,y)=>x-y).join(',');
 const edges=[[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]],sides=[[0,4,7,3],[1,2,6,5],[0,1,5,4],[3,7,6,2],[0,3,2,1],[4,5,6,7]];
 function arc(a,b,m){const u=sub(m,a),v=sub(b,a),n=cross(u,v),nn=dot(n,n);if(!(nn>0)||!Number.isFinite(nn)||nn<1e-24*dot(u,u)*dot(v,v))fail('Degenerate arc');const c=add(a,mul(add(mul(cross(v,n),dot(u,u)),mul(cross(n,u),dot(v,v))),1/(2*nn))),e=sub(a,c),r=norm(e),ex=mul(e,1/r),ey=cross(mul(n,1/Math.sqrt(nn)),ex),ang=p=>{const q=sub(p,c);return (Math.atan2(dot(q,ey),dot(q,ex))+2*Math.PI)%(2*Math.PI)};let end=ang(b);if(ang(m)>end)end-=2*Math.PI;return Array.from({length:25},(_,i)=>i===0?a:i===24?b:add(c,add(mul(ex,r*Math.cos(end*i/24)),mul(ey,r*Math.sin(end*i/24)))))}
 function blockDict(source){
  const r=reader(source),d=Object.create(null);while(r.peek()!==null){const k=word(r.take());if(Object.hasOwn(d,k))fail('Duplicate '+k);if(r.peek()==='{')d[k]=r.dict();else{d[k]=r.peek()==='('?r.list():r.peek()==='['?r.list('[',']'):r.take();r.expect(';')}}
  for(const k of Object.keys(d))if(!['FoamFile','units','scale','convertToMeters','vertices','blocks','edges','boundary','defaultPatch','mergePatchPairs'].includes(k))fail('Unsupported entry '+k+'; source not flattened');
  if(d.FoamFile?.object!=='blockMeshDict'||d.FoamFile?.format!=='ascii')fail('Expected ASCII blockMeshDict');
  const units=['units','scale','convertToMeters'].filter(k=>Object.hasOwn(d,k));if(units.length>1)fail('Ambiguous units');let scale=1;
  if(d.units){if(!Array.isArray(d.units)||d.units.length!==1||!Object.hasOwn({m:1,mm:.001,cm:.01},d.units[0]))fail('Unsupported units');scale={m:1,mm:.001,cm:.01}[d.units[0]]}else if(units.length)scale=num(d[units[0]]);
  if(!(scale>0)||!Array.isArray(d.vertices)||!d.vertices.length||!Array.isArray(d.blocks)||!d.blocks.length)fail('Missing geometry or invalid scale');
  if(d.mergePatchPairs&&(!Array.isArray(d.mergePatchPairs)||d.mergePatchPairs.length))fail('Nonempty mergePatchPairs not supported');
  const vertices=d.vertices.map(v=>vec(v).map(x=>x*scale));if(vertices.some(p=>p.some(x=>!Number.isFinite(x))))fail('Coordinate overflow');
  const blocks=[],zones=Object.create(null),top=new Map(),ek=new Set();
  for(let i=0;i<d.blocks.length;){if(d.blocks[i++]!=='hex')fail('Only explicit hex blocks supported');const v=labels(d.blocks[i++],vertices.length,8);if(v.length!==8)fail('Expected eight vertices');const zone=Array.isArray(d.blocks[i])?null:word(d.blocks[i++]),counts=d.blocks[i++]?.map?.(id);if(!counts||counts.length!==3||counts.some(n=>!n))fail('Invalid cell counts');const kind=d.blocks[i++],g=d.blocks[i++],n=kind==='simpleGrading'?3:kind==='edgeGrading'?12:0;if(!n||!Array.isArray(g)||g.length!==n)fail('Unsupported grading');const positive=t=>{const z=num(t);if(z<=0)fail('Invalid grading');return z};const grading=g.map(x=>Array.isArray(x)?x.map(y=>{if(!Array.isArray(y)||y.length!==3)fail('Invalid multi-grading');return y.map(positive)}):positive(x));const cells=counts.reduce((a,b)=>a*b,1);if(!Number.isSafeInteger(cells))fail('Cell count overflow');const block={id:blocks.length,vertices:v,zone,counts,kind,grading,cells};blocks.push(block);if(zone)zones[zone]=(zones[zone]||0)+cells;for(const e of edges)ek.add(key(e.map(j=>v[j])));for(const side of sides){const k=key(side.map(j=>v[j])),a=top.get(k)||[];a.push(block.id);if(a.length>2)fail('Non-manifold block face');top.set(k,a)}}
  const arcs=new Map(),e=d.edges||[];for(let i=0;i<e.length;){if(e[i++]!=='arc')fail('Unsupported edge; original not flattened');const a=id(e[i++]),b=id(e[i++]),k=key([a,b]);if(!ek.has(k)||arcs.has(k)||a===b)fail('Invalid arc');const mid=vec(e[i++]).map(x=>x*scale);arcs.set(k,{a,b,mid,points:arc(vertices[a],vertices[b],mid)})}
  const patches=[],p=d.boundary||[],seen=new Set(),used=new Set();for(let i=0;i<p.length;){const name=word(p[i++]);if(seen.has(name)||p[i++]!=='{')fail('Invalid patch');seen.add(name);let type,faces;while(p[i]!=='}'){const k=p[i++];if(k==='type'&&!type)type=word(p[i++]);else if(k==='faces'&&!faces){if(!Array.isArray(p[i]))fail('Invalid faces');faces=p[i++].map(a=>labels(a,vertices.length,4));for(const a of faces){const k=key(a);if(a.length!==4||top.get(k)?.length!==1||used.has(k))fail('Invalid exterior block face');used.add(k)}}else fail('Unsupported patch entry '+k);if(p[i++]!==';')fail('Missing patch ;')}i++;if(!type||!faces)fail('Incomplete patch');patches.push({name,type,faces})}
  const cells=blocks.reduce((a,b)=>a+b.cells,0);if(!Number.isSafeInteger(cells))fail('Cell count overflow');return {vertices,blocks,zones,arcs,patches,scale,cells,sharedZoneFaces:[...top.values()].filter(a=>a.length===2&&blocks[a[0]].zone&&blocks[a[1]].zone&&blocks[a[0]].zone!==blocks[a[1]].zone).length,defaultPatch:d.defaultPatch||null,meshGenerated:false,interfaceVerified:false};
 }
 function editArc(model,a,b,mid){
  const k=key([a,b]);if(!Number.isSafeInteger(a)||!Number.isSafeInteger(b)||a===b||!model.blocks.some(block=>edges.some(e=>key(e.map(j=>block.vertices[j]))===k)))fail('Invalid block edge');
  const arcs=new Map(model.arcs);
  if(mid===null)arcs.delete(k);
  else{if(!Array.isArray(mid)||mid.length!==3||!mid.every(Number.isFinite))fail('Expected three finite coordinates in meters');const m=mid.slice(),points=arc(model.vertices[a],model.vertices[b],m);if(points.some(p=>!p.every(Number.isFinite)))fail('Arc coordinate overflow');arcs.set(k,{a,b,mid:m,points})}
  return {...model,arcs};
 }
 function exportBlockDict(model){
  const list=a=>'('+a.map(x=>Array.isArray(x)?list(x):String(x)).join(' ')+')',def=model.defaultPatch;
  if(def&&(typeof def!=='object'||Array.isArray(def)||Object.keys(def).some(k=>!['name','type'].includes(k))||!def.type))fail('Unsupported defaultPatch export');
  const out='FoamFile { version 2.0; format ascii; class dictionary; object blockMeshDict; }\nscale 1;\nvertices '+list(model.vertices)+';\nblocks (\n'+model.blocks.map(b=>'hex '+list(b.vertices)+(b.zone?' '+b.zone:'')+' '+list(b.counts)+' '+b.kind+' '+list(b.grading)).join('\n')+'\n);\nedges (\n'+[...model.arcs.values()].map(a=>'arc '+a.a+' '+a.b+' '+list(a.mid)).join('\n')+'\n);\nboundary (\n'+model.patches.map(p=>p.name+' { type '+p.type+'; faces '+list(p.faces)+'; }').join('\n')+'\n);\n'+(def?'defaultPatch { '+(def.name?'name '+word(def.name)+'; ':'')+'type '+word(def.type)+'; }\n':'')+'mergePatchPairs ();\n';
  blockDict(out);return out;
 }
 function native(source,object,classes,entry){const r=reader(source);r.expect('FoamFile');const h=r.dict();if(h.format!=='ascii'||h.object!==object||!classes.includes(h.class))fail('Expected ASCII '+object);const n=id(r.take());if(n>5000000)fail('Native list limit');const a=[];if(r.peek()==='{'&&h.class==='labelList'&&n>0){r.take();const v=entry(r);r.expect('}');for(let i=0;i<n;i++)a.push(v)}else{r.expect('(');for(let i=0;i<n;i++)a.push(entry(r));r.expect(')')}if(r.peek()===';')r.take();if(r.peek()!==null)fail('Unexpected trailing data');return a}
 function poly(f){
  const points=native(f.points,'points',['vectorField','pointField'],r=>vec(r.list())),faces=native(f.faces,'faces',['faceList'],r=>{const n=id(r.take()),v=labels(r.list(),points.length,3);if(n!==v.length)fail('Face size mismatch');return v}),owner=native(f.owner,'owner',['labelList'],r=>id(r.take())),neighbour=native(f.neighbour,'neighbour',['labelList'],r=>id(r.take())),patches=native(f.boundary,'boundary',['polyBoundaryMesh'],r=>{const name=word(r.take()),d=r.dict();return {name,type:word(d.type),start:id(d.startFace),count:id(d.nFaces)}});
  if(!points.length||!faces.length||owner.length!==faces.length||neighbour.length>faces.length)fail('Inconsistent topology lengths');let cursor=neighbour.length;const names=new Set();for(const p of patches){if(names.has(p.name)||p.start!==cursor||p.count>faces.length-cursor)fail('Invalid boundary range');names.add(p.name);cursor+=p.count}if(cursor!==faces.length)fail('Incomplete boundary');
  let max=-1;for(const x of owner)max=Math.max(max,x);for(const x of neighbour)max=Math.max(max,x);if(max>=faces.length*2||max>=5000000)fail('Cell ID out of range');const cells=Array.from({length:max+1},()=>[]);for(let i=0;i<faces.length;i++){cells[owner[i]].push(i);if(i<neighbour.length){if(neighbour[i]===owner[i])fail('Same owner and neighbour');cells[neighbour[i]].push(i)}}if(cells.some(a=>!a.length))fail('Noncontiguous cell IDs');return {points,faces,owner,neighbour,patches,cells,units:'m',geometryVerified:false};
 }
 function readSet(source,name,m){const r=reader(source);r.expect('FoamFile');const h=r.dict();if(!['faceSet','cellSet','pointSet'].includes(h.class))fail('Unsupported set');const v=native(source,name,[h.class],r=>id(r.take())),limit={faceSet:m.faces.length,cellSet:m.cells.length,pointSet:m.points.length}[h.class];if(v.some(x=>x>=limit)||new Set(v).size!==v.length)fail('Set IDs inconsistent with selected mesh');return {name,kind:h.class,values:v}}
 function locate(m,kind,i){if(!Number.isSafeInteger(i)||i<0)fail('Invalid ID');if(kind==='pointSet'){if(!m.points[i])fail('Point ID out of range');return {point:m.points[i],faces:[],vertices:[i]}}const faces=kind==='faceSet'?(m.faces[i]?[i]:null):kind==='cellSet'?m.cells[i]:null;if(!faces)fail('ID out of range');const vertices=[...new Set(faces.flatMap(f=>m.faces[f]))];return {point:mul(vertices.map(v=>m.points[v]).reduce(add,[0,0,0]),1/vertices.length),faces,vertices}}
 function patchMatch(a,an,b,bn){const p=a.patches.find(x=>x.name===an),q=b.patches.find(x=>x.name===bn);if(!p||!q)fail('Select both patches');const collect=(m,p)=>{const map=new Map();let area=0;for(let i=p.start;i<p.start+p.count;i++){const ps=m.faces[i].map(v=>m.points[v]),k=ps.map(v=>JSON.stringify(v)).sort().join('|'),o=ps[0];let v=[0,0,0];for(let j=1;j<ps.length-1;j++)v=add(v,cross(sub(ps[j],o),sub(ps[j+1],o)));v=mul(v,.5);area+=norm(v);const l=map.get(k)||[];l.push({i,v});map.set(k,l)}return {map,area}};const x=collect(a,p),y=collect(b,q),pairs=[];let opposite=0;for(const [k,l] of x.map){const r=y.map.get(k);if(l.length!==1||r?.length!==1)continue;const [u]=l,[v]=r,den=norm(u.v)*norm(v.v),cos=den?dot(u.v,v.v)/den:null;if(cos!==null&&cos<-.999999)opposite++;pairs.push([u.i,v.i,cos])}const duplicates=m=>[...m.values()].reduce((n,l)=>n+(l.length>1?l.length:0),0);return {matched:pairs.length,unmatchedA:p.count-pairs.length,unmatchedB:q.count-pairs.length,duplicatesA:duplicates(x.map),duplicatesB:duplicates(y.map),opposite,areaVectorMagnitudeA_m2:x.area,areaVectorMagnitudeB_m2:y.area,pairs,method:'Exact XYZ vertex set; no tolerance; area-vector magnitude, not physical certification',interfaceVerified:false}}

 function qualityCSV(source,kind,m,bins=12){
  if(typeof source!=='string'||source.length>48*1024*1024||!['cellSet','faceSet','pointSet'].includes(kind)||!Number.isInteger(bins)||bins<2||bins>100)fail('Invalid metric CSV or association');
  const limit={cellSet:m.cells.length,faceSet:m.faces.length,pointSet:m.points.length}[kind],rows=source.replace(/^\uFEFF/,'').trim().split(/\r?\n/);if(rows.shift()?.trim()!=='id,value'||!rows.length)fail('Expected CSV header id,value');const values=[],seen=new Set();let min=Infinity,max=-Infinity;
  for(const line of rows){const t=line.split(',').map(x=>x.trim());if(t.length!==2)fail('Invalid metric row');const i=id(t[0]),v=num(t[1]);if(i>=limit||seen.has(i))fail('Duplicate or out-of-range metric ID');seen.add(i);values.push({id:i,value:v});min=Math.min(min,v);max=Math.max(max,v)}
  const width=max===min?0:(max-min)/bins;if(!Number.isFinite(width))fail('Metric range overflow');const histogram=Array.from({length:width?bins:1},(_,i)=>({low:width?min+i*width:min,high:width?(i===bins-1?max:min+(i+1)*width):max,ids:[]}));for(const r of values){const i=width?Math.min(bins-1,Math.floor((r.value-min)/width)):0;histogram[i].ids.push(r.id)}
  return {kind,values,min,max,histogram,coverage:values.length/limit,sourceBindingVerified:false};
 }

 function cellGeometry(m,i){
  const loc=locate(m,'cellSet',i),o=loc.point,edge=new Map();let volume=0,moment=[0,0,0],absVolume=0;
  for(const fi of loc.faces){
   const ids=m.owner[fi]===i?m.faces[fi]:m.faces[fi].slice().reverse();
   for(let j=0;j<ids.length;j++){const a=ids[j],b=ids[(j+1)%ids.length],k=a<b?a+','+b:b+','+a,r=edge.get(k)||[0,0];r[0]++;r[1]+=a<b?1:-1;edge.set(k,r)}
   const p=ids.map(j=>sub(m.points[j],o)),a=p[0];
   for(let j=1;j<p.length-1;j++){const b=p[j],c=p[j+1],v=dot(a,cross(b,c))/6;volume+=v;absVolume+=Math.abs(v);moment=add(moment,mul(add(add(a,b),c),v/4))}
  }
  if([...edge.values()].some(r=>r[0]!==2||r[1]!==0)||!(volume>0)||!Number.isFinite(volume)||volume<absVolume*1e-12)fail('Cell '+i+': open, inconsistently oriented or degenerate geometry');
  const centroid=add(o,mul(moment,1/volume));if(centroid.some(x=>!Number.isFinite(x)))fail('Nonfinite centroid');return {volume_m3:volume,centroid_m:centroid};
 }
 function geometricMetric(m,metric){
  const internal=['nonOrthogonality','internalFaceOffset'].includes(metric),faceMetric=metric==='faceArea'||internal;
  if(!faceMetric&&!['cellVolume','cellEdgeRatio'].includes(metric))fail('Unknown metric');
  const kind=faceMetric?'faceSet':'cellSet',limit=internal?m.neighbour.length:faceMetric?m.faces.length:m.cells.length,values=[],invalid=[],cache=new Map();
  const cell=i=>{if(!cache.has(i)){try{cache.set(i,cellGeometry(m,i))}catch{cache.set(i,null)}}return cache.get(i)};
  for(let i=0;i<limit;i++){
   let v=null;
   if(metric==='cellVolume')v=cell(i)?.volume_m3;
   else if(metric==='cellEdgeRatio'){
    if(cell(i)){const seen=new Set();let lo=Infinity,hi=0;
     for(const fi of m.cells[i]){const ids=m.faces[fi];for(let j=0;j<ids.length;j++){const a=ids[j],b=ids[(j+1)%ids.length],k=key([a,b]);if(seen.has(k))continue;seen.add(k);const len=norm(sub(m.points[a],m.points[b]));lo=Math.min(lo,len);hi=Math.max(hi,len)}}
     if(lo>0&&Number.isFinite(hi))v=hi/lo}
   }else {
    const p=m.faces[i].map(j=>m.points[j]),o=p[0];let a=[0,0,0];for(let j=1;j<p.length-1;j++)a=add(a,cross(sub(p[j],o),sub(p[j+1],o)));a=mul(a,.5);const area=norm(a);
    if(metric==='faceArea')v=area>0?area:null;
    else {const c=cell(m.owner[i]),n=cell(m.neighbour[i]);if(c&&n){const d=sub(n.centroid_m,c.centroid_m),den=area*norm(d),ad=dot(a,d);
     if(metric==='nonOrthogonality'){if(den>0&&Number.isFinite(den))v=Math.acos(Math.max(-1,Math.min(1,ad/den)))*180/Math.PI}
     else if(den>0&&Number.isFinite(den)&&Math.abs(ad)>1e-12*den){
      try{const f=faceGeometry(m,i).centroid_m,t=dot(a,sub(f,c.centroid_m))/ad,intersection=add(c.centroid_m,mul(d,t));v=norm(sub(f,intersection))/Math.sqrt(area)}catch{}
     }
    }}
   }
   if(typeof v==='number'&&Number.isFinite(v))values.push({id:i,value:v});else invalid.push(i);
  }
  const method={faceArea:'Face area-vector magnitude',cellVolume:'Signed triangulated polyhedral volume',nonOrthogonality:'Angle between internal face area vector and owner-to-neighbour centroid vector',cellEdgeRatio:'Longest / shortest unique cell edge; not OpenFOAM aspect ratio',internalFaceOffset:'Distance from face centroid to centroid-line / face-plane intersection, normalized by sqrt(face area); not OpenFOAM skewness'}[metric];
  return {kind,values,invalid,eligible:limit,coverage:limit?values.length/limit:0,metric,unit:metric==='faceArea'?'m²':metric==='cellVolume'?'m³':metric==='nonOrthogonality'?'deg':'1',method:method+' · FoamLens geometric approximation; not native checkMesh'};
 }
 function metricHistogram(values,bins=12){
  if(!Number.isInteger(bins)||bins<2||bins>100)fail('Invalid bin count');if(!values.length)return [];
  let min=Infinity,max=-Infinity;for(const r of values){if(!Number.isFinite(r.value))fail('Nonfinite metric');min=Math.min(min,r.value);max=Math.max(max,r.value)}
  const width=(max-min)/bins;if(!Number.isFinite(width)||(!width&&max!==min))fail('Metric range overflow/underflow');
  const out=Array.from({length:width?bins:1},(_,i)=>({low:width?min+i*width:min,high:width&&i<bins-1?min+(i+1)*width:max,rows:[]}));
  for(const r of values)out[width?Math.min(bins-1,Math.max(0,Math.floor((r.value-min)/width))):0].rows.push(r);
  return out;
 }
 function qualityMap(m,q,selection=null,limit=3000){
  if(!q||!['cellSet','faceSet','pointSet'].includes(q.kind)||!Number.isSafeInteger(limit)||limit<1||limit>10000)fail('Invalid quality map');
  const rows=selection===null?q.values:selection;if(!rows.length)return {points:[],min:null,max:null,total:0,omitted:0};
  let min=Infinity,max=-Infinity;for(const r of q.values){if(!Number.isFinite(r.value))fail('Invalid metric value');min=Math.min(min,r.value);max=Math.max(max,r.value)}
  if(!Number.isFinite(max-min))fail('Metric color range overflow');
  let low=0,high=0;for(let i=1;i<rows.length;i++){if(rows[i].value<rows[low].value)low=i;if(rows[i].value>rows[high].value)high=i}
  const ids=new Set();if(limit===1)ids.add(high);else{ids.add(low);ids.add(high);const slots=limit-ids.size;for(let j=0;j<slots&&ids.size<rows.length;j++)ids.add(Math.floor(j*rows.length/Math.max(1,slots)));for(let j=0;ids.size<Math.min(limit,rows.length);j++)ids.add(j)}
  const points=[...ids].map(i=>{const r=rows[i];return {id:r.id,value:r.value,point:locate(m,q.kind,r.id).point,color:metricColor(r.value,min,max)}});
  return {points,min,max,total:rows.length,omitted:rows.length-points.length};
 }
 function metricColor(v,min,max){
  if(![v,min,max].every(Number.isFinite)||min>max||!Number.isFinite(max-min))fail('Invalid color range');
  const t=max===min?.5:Math.max(0,Math.min(1,(v-min)/(max-min))),stops=[[35,89,176],[49,180,178],[245,215,86],[202,55,43]],u=t*(stops.length-1),i=Math.min(stops.length-2,Math.floor(u)),f=u-i;
  return '#'+stops[i].map((x,j)=>Math.round(x+(stops[i+1][j]-x)*f).toString(16).padStart(2,'0')).join('');
 }
 function nativeQualityField(source,m,scope='internal'){
  if(typeof source!=='string'||source.length>48*1024*1024)fail('Native field size limit');
  const r=reader(source),d=Object.create(null);
  while(r.peek()!==null){const k=word(r.take());if(Object.hasOwn(d,k))fail('Duplicate '+k);if(r.peek()==='{'){d[k]=r.dict();continue}const vals=[];while(r.peek()!==';'){if(r.peek()===null||r.peek()==='}')fail('Missing field semicolon');vals.push(r.peek()==='('?r.list():r.peek()==='['?r.list('[',']'):r.take())}r.expect(';');d[k]=vals.length===1?vals[0]:vals}
  const h=d.FoamFile,kind={volScalarField:'cellSet',surfaceScalarField:'faceSet',pointScalarField:'pointSet'}[h?.class];
  if(!h||h.format!=='ascii'||!kind||!h.object)fail('Expected ASCII native scalar field');const object=word(h.object);
  if(!Array.isArray(d.dimensions)||d.dimensions.length!==7)fail('Expected seven dimensions');const dimensions=d.dimensions.map(num);
  let count=kind==='cellSet'?m.cells.length:kind==='pointSet'?m.points.length:m.neighbour.length,start=0,raw=d.internalField;
  if(scope!=='internal'){if(kind!=='faceSet')fail('Patch import requires surfaceScalarField');const p=m.patches.find(p=>p.name===scope);if(!p)fail('Unknown native patch');start=p.start;count=p.count;raw=d.boundaryField?.[scope]?.value}
  if(!Number.isSafeInteger(count)||count<1||count>2000000)fail('No eligible entities or native metric limit exceeded');
  if(!Array.isArray(raw))fail('Missing explicit scalar values');let vals;
  if(raw.length===2&&raw[0]==='uniform'){const v=num(raw[1]);vals=Array(count).fill(v)}
  else if(raw.length===4&&raw[0]==='nonuniform'&&raw[1]==='List<scalar>'&&id(raw[2])===count&&Array.isArray(raw[3])&&raw[3].length===count)vals=raw[3].map(num);
  else fail('Unsupported field encoding or mesh association count mismatch');
  const values=vals.map((value,i)=>({id:start+i,value})),histogram=metricHistogram(values).map(b=>({low:b.low,high:b.high,ids:b.rows.map(r=>r.id)}));
  return {kind,object,dimensions,scope,values,histogram,coverage:1,eligible:count,nativeField:true,sourceBindingVerified:false,location:typeof h.location==='string'?h.location:null};
 }
 function qualityFacePolygons(m,map,kind){
  if(kind!=='faceSet')return [];
  return map.points.map(p=>({...p,vertices:m.faces[p.id].map(i=>m.points[i])}));
 }
 function metricThreshold(q,lo,hi){if(!Number.isFinite(lo)||!Number.isFinite(hi)||lo>hi)fail('Invalid inclusive threshold');return q.values.filter(x=>x.value>=lo&&x.value<=hi)}

 function faceGeometry(m,i){
  const ids=m.faces[i];if(!ids)fail('Unknown face');const p=ids.map(j=>m.points[j]),o=p[0];let a=[0,0,0],weighted=[0,0,0],sum=0;
  for(let j=1;j<p.length-1;j++){const av=mul(cross(sub(p[j],o),sub(p[j+1],o)),.5),w=norm(av);a=add(a,av);sum+=w;weighted=add(weighted,mul(mul(add(add(o,p[j]),p[j+1]),1/3),w))}
  const area=norm(a);if(!(area>0)||!Number.isFinite(area)||!(sum>0)||!Number.isFinite(sum)||area<sum*1e-12)fail('Degenerate face geometry');
  const centroid=mul(weighted,1/sum);if(centroid.some(x=>!Number.isFinite(x)))fail('Invalid face centroid');
  return {area_m2:area,centroid_m:centroid,triangleArea_m2:sum};
 }
 function parseSpatialPipeline(source){
  if(typeof source!=='string'||source.length>12000)fail('Invalid spatial pipeline');
  const rows=source.split(/\r?\n/).map(x=>x.trim()).filter(x=>x&&!x.startsWith('#'));if(rows.length>16)fail('Maximum 16 active filters');
  return rows.map(line=>{
   const [type,...raw]=line.split(/\s+/),v=raw.map(num);
   if(type==='box'&&v.length===6&&v.slice(0,3).every((x,i)=>x<=v[i+3]))return{type,min:v.slice(0,3),max:v.slice(3)};
   if(type==='cylinder'&&v.length===7&&v[6]>0&&Number.isFinite(dot(sub(v.slice(3,6),v.slice(0,3)),sub(v.slice(3,6),v.slice(0,3))))&&norm(sub(v.slice(3,6),v.slice(0,3)))>0)return{type,a:v.slice(0,3),b:v.slice(3,6),radius:v[6]};
   if(type==='slab'&&v.length===8&&v[6]<=v[7]&&Number.isFinite(norm(v.slice(3,6)))&&norm(v.slice(3,6))>0)return{type,origin:v.slice(0,3),normal:mul(v.slice(3,6),1/norm(v.slice(3,6))),min:v[6],max:v[7]};
   if(type==='threshold'&&v.length===2&&v[0]<=v[1])return{type,min:v[0],max:v[1]};
   fail('Invalid filter: '+type+' (box / cylinder / slab / threshold)');
  });
 }
 function spatialContains(p,f){
  if(f.type==='box')return p.every((v,i)=>v>=f.min[i]&&v<=f.max[i]);
  if(f.type==='slab'){const d=dot(sub(p,f.origin),f.normal);return d>=f.min&&d<=f.max}
  if(f.type==='cylinder'){const u=sub(f.b,f.a),v=sub(p,f.a),t=dot(v,u)/dot(u,u);return t>=0&&t<=1&&norm(sub(v,mul(u,t)))<=f.radius}
  fail('Unknown geometric filter');
 }
 function spatialSelect(m,kind,filters,field=null,scope=null,convention='intensive'){
  if(!['cellSet','faceSet','pointSet'].includes(kind)||!['intensive','perEntity'].includes(convention))fail('Invalid spatial association/convention');
  const count={cellSet:m.cells.length,faceSet:m.faces.length,pointSet:m.points.length}[kind],map=new Map();
  if(field){if(field.kind!==kind)fail('Field association differs from selected topology');for(const r of field.values){if(!Number.isSafeInteger(r.id)||r.id<0||r.id>=count||map.has(r.id)||!Number.isFinite(r.value))fail('Invalid field ID or value');map.set(r.id,r.value)}}
  if(filters.some(f=>f.type==='threshold')&&!field)fail('Threshold requires loaded field');
  let ids;if(scope){if(scope.kind!==kind||!Array.isArray(scope.values)||new Set(scope.values).size!==scope.values.length||scope.values.some(i=>!Number.isSafeInteger(i)||i<0||i>=count))fail('Scope does not match selected association');ids=scope.values}else ids=Array.from({length:count},(_,i)=>i);
  const rows=[],invalid=[],unknownThreshold=[],stages=filters.map(f=>({type:f.type,input:0,passed:0,missing:0}));let selectedWeight=0,validWeight=0,weightedSum=0,minimum=Infinity,maximum=-Infinity,fieldCount=0,rawSum=0;
  for(const i of ids){
   let p,w;try{if(kind==='cellSet'){const g=cellGeometry(m,i);p=g.centroid_m;w=g.volume_m3}else if(kind==='faceSet'){const g=faceGeometry(m,i);p=g.centroid_m;w=g.area_m2}else{p=m.points[i];w=1}}catch{invalid.push(i);continue}
   const has=map.has(i),value=has?map.get(i):null;
   let accepted=true;
   for(let j=0;j<filters.length;j++){const f=filters[j],stage=stages[j];stage.input++;
    if(f.type==='threshold'&&!has){stage.missing++;unknownThreshold.push(i);accepted=false;break}
    if(f.type==='threshold'?value<f.min||value>f.max:!spatialContains(p,f)){accepted=false;break}
    stage.passed++;
   }
   if(!accepted)continue;
   selectedWeight+=w;rows.push({id:i,x:p[0],y:p[1],z:p[2],weight:w,value});
   if(has){validWeight+=w;weightedSum+=value*w;rawSum+=value;fieldCount++;minimum=Math.min(minimum,value);maximum=Math.max(maximum,value)}
  }
  if([selectedWeight,validWeight,weightedSum,rawSum].some(x=>!Number.isFinite(x)))fail('Integration overflow');
  const weighted=kind!=='pointSet',intensive=convention==='intensive';
  return {kind,convention,rows,invalid,unknownThreshold,stages,eligible:ids.length,selected:rows.length,selectedWeight,validWeight,fieldCount,coverage:rows.length?fieldCount/rows.length:null,weightCoverage:selectedWeight?validWeight/selectedWeight:null,mean:fieldCount?rawSum/fieldCount:null,weightedMean:weighted&&intensive&&validWeight?weightedSum/validWeight:null,integral:fieldCount?(intensive?(weighted?weightedSum:null):rawSum):null,min:fieldCount?minimum:null,max:fieldCount?maximum:null,weightUnit:kind==='cellSet'?'m³':kind==='faceSet'?'m²':'count',method:'Centroid membership, whole entities only; face area-vector magnitude and triangulated cell volume estimates. No geometric clipping or interpolation.',sourceBindingVerified:false};
 }


 // Numeric table, not a mesh: no invented connectivity or weights.

 function fieldTopology(mesh){
  if(!mesh?.supported||mesh.format==='decomposed'||mesh.partitionMeshes?.length||mesh.partitionRanges?.length)fail('Reconstructed original region mesh required; processor-local IDs not yet supported');
  const {pointCount,faceCount,cellCount,internalFaceCount}=mesh;
  if(![pointCount,faceCount,cellCount,internalFaceCount].every(n=>Number.isSafeInteger(n)&&n>=0)||!pointCount||!cellCount||!faceCount||internalFaceCount>faceCount||pointCount>1000000||faceCount>2000000||cellCount>350000)fail('Native topology exceeds bounded analysis limits');
  if(mesh.points?.length!==3*pointCount||mesh.faceOffsets?.length!==faceCount+1||mesh.owners?.length!==faceCount||mesh.neighbours?.length!==internalFaceCount||mesh.faceOffsets[0]!==0||mesh.faceOffsets[faceCount]!==mesh.facePoints?.length)fail('Incomplete native topology');
  const points=Array.from({length:pointCount},(_,i)=>Array.from(mesh.points.slice(3*i,3*i+3))),faces=[],cells=Array.from({length:cellCount},()=>[]);
  if(points.some(p=>p.some(x=>!Number.isFinite(x))))fail('Nonfinite native point');
  const owner=Array.from(mesh.owners),neighbour=Array.from(mesh.neighbours);
  for(let i=0;i<faceCount;i++){
   const start=mesh.faceOffsets[i],end=mesh.faceOffsets[i+1],o=owner[i],n=neighbour[i];
   if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||end-start<3||end>mesh.facePoints.length||!Number.isSafeInteger(o)||o<0||o>=cellCount||i<internalFaceCount&&(!Number.isSafeInteger(n)||n<0||n>=cellCount||n===o))fail('Invalid native face topology');
   const v=Array.from(mesh.facePoints.slice(start,end));if(v.some(j=>!Number.isSafeInteger(j)||j<0||j>=pointCount)||new Set(v).size!==v.length)fail('Invalid native face vertices');faces.push(v);cells[o].push(i);if(i<internalFaceCount)cells[n].push(i)
  }
  if(cells.some(v=>!v.length))fail('Empty native cell');
  const patches=(mesh.boundaryPatches||[]).map(p=>({name:p.name,type:p.type,start:p.startFace,count:p.nFaces}));
  return {points,faces,cells,owner,neighbour,patches,units:'m'};
 }
 function fieldRows(frame,scope='internal',topology=null){
  const mesh=frame.mesh,storage=frame.storage,kind={volume:'cellSet',point:'pointSet',surface:'faceSet'}[storage];if(!kind||frame.layout?.mode==='decomposed')fail('Unsupported native field association or decomposed region');
  const m=topology||fieldTopology(mesh),count=kind==='cellSet'?m.cells.length:kind==='pointSet'?m.points.length:m.neighbour.length;
  if(frame.fieldValues?.length!==count)fail('Original field association count mismatch');
  let ids,lookup=i=>frame.fieldValues[i];
  if(kind==='faceSet'&&scope!=='internal'){
   const p=m.patches.find(x=>x.name===scope);
   if(!p||!Number.isSafeInteger(p.start)||!Number.isSafeInteger(p.count)||p.start<m.neighbour.length||p.count<1||p.start+p.count>m.faces.length)fail('Original named boundary patch unavailable');
   ids=Array.from({length:p.count},(_,i)=>p.start+i);const boundary=frame.surfaceBoundary?.values;
   lookup=i=>boundary instanceof Map?boundary.get(i):undefined;
  }else{if(scope!=='internal')fail('Named boundary scope is only supported for surface fields');ids=Array.from({length:count},(_,i)=>i)}
  if(!ids.length||ids.length>350000)fail('No eligible entities or row limit exceeded');
  const rows=[],invalid=[];
  for(const i of ids){
   let p,w=null;try{if(kind==='cellSet'){const g=cellGeometry(m,i);p=g.centroid_m;w=g.volume_m3}else if(kind==='faceSet'){const g=faceGeometry(m,i);p=g.centroid_m;w=g.area_m2}else p=m.points[i]}catch{invalid.push(i);continue}
   const v=lookup(i);rows.push({id:i,x:p[0],y:p[1],z:p[2],value:typeof v==='number'&&Number.isFinite(v)?v:null,weight:w})
  }
  return {kind,rows,invalid,eligible:ids.length,weightUnit:kind==='cellSet'?'m³':kind==='faceSet'?'m²':null};
 }
 function nativeTable(meta,frames){
  if(!frames.length||frames.length>2000||!['intensive','perEntity'].includes(meta.convention))fail('Invalid native table request');
  const groups=new Map(),invalidByTime={},sourceFrames=[];let total=0;
  for(const f of frames){if(!Number.isFinite(f.time)||groups.has(f.time)||f.kind!==meta.association)fail('Invalid native time or association');total+=f.rows.length;if(total>350000)fail('Native spatial table exceeds 350000 total rows; narrow the time range');groups.set(f.time,f.rows);invalidByTime[f.time]=f.invalid.length;sourceFrames.push({time:f.time,eligible:f.eligible,invalidGeometry:f.invalid.length,meshKey:f.meshKey||null})}
  return{meta:{...meta,coordinateUnit:'m',weightUnit:frames[0].weightUnit,sourceFrames,geometryMethod:'FoamLens triangulated polyhedra and face area-vector magnitude; not native cell volumes',sourceBindingVerified:true},groups,invalidByTime,hasWeight:meta.association!=='pointSet',measureUnit:frames[0].weightUnit||'count',sourceBindingVerified:true};
 }

 function xyzTable(csv,meta){
  if(typeof csv!=='string'||csv.length>48*1024*1024||csv.includes('\0'))fail('Invalid/oversized numeric CSV');
  const scale={m:1,mm:.001,cm:.01}[meta.coordinateUnit],kind=meta.association,convention=meta.convention;
  if(!scale||!['pointSet','cellSet','faceSet'].includes(kind)||!['intensive','perEntity'].includes(convention)||!meta.source?.trim()||!meta.field?.trim()||!meta.unit?.trim())fail('Explicit source, association, field, units and convention required');
  const lines=csv.replace(/^\uFEFF/,'').trim().split(/\r?\n/);if(lines.length<2||lines.length>350001)fail('Table must contain 1–350000 rows');
  const header=lines.shift().split(',').map(x=>x.trim()),allowed=['id','x','y','z','value','weight','time'];
  if(new Set(header).size!==header.length||header.some(x=>!allowed.includes(x))||!['id','x','y','z','value'].every(x=>header.includes(x)))fail('Expected id,x,y,z,value with optional weight,time columns');
  const pos=Object.fromEntries(header.map((v,i)=>[v,i])),hasWeight=header.includes('weight'),hasTime=header.includes('time'),measureUnit=kind==='faceSet'?'m²':kind==='cellSet'?'m³':'count';
  const weightScale=kind==='faceSet'?{'m²':1,'cm²':1e-4,'mm²':1e-6}[meta.weightUnit]:kind==='cellSet'?{'m³':1,'cm³':1e-6,'mm³':1e-9}[meta.weightUnit]:null;
  if(hasWeight&&(!weightScale||kind==='pointSet'))fail('Explicit area/volume units required; point weights unsupported');
  if(!hasTime&&(typeof meta.time!=='number'||!Number.isFinite(meta.time)))fail('Provide physical time in seconds or a time column');
  const groups=new Map(),seen=new Map();
  for(const line of lines){const v=line.split(',').map(x=>x.trim());if(v.length!==header.length)fail('Invalid numeric CSV row');
   const label=id(v[pos.id]),time=hasTime?num(v[pos.time]):meta.time,xyz=['x','y','z'].map(k=>num(v[pos[k]])*scale);
   const value=v[pos.value]===''?null:num(v[pos.value]),weight=hasWeight?(v[pos.weight]===''?null:num(v[pos.weight])*weightScale):null;
   if(xyz.some(x=>!Number.isFinite(x))||weight!==null&&(!(weight>0)||!Number.isFinite(weight)))fail('Nonfinite position or nonpositive measure');
   if(!groups.has(time)){if(groups.size>=2000)fail('Maximum 2000 physical times');groups.set(time,[]);seen.set(time,new Set())}
   if(seen.get(time).has(label))fail('Duplicate ID within physical time');seen.get(time).add(label);
   groups.get(time).push({id:label,x:xyz[0],y:xyz[1],z:xyz[2],value,weight});
  }
  return {meta:{...meta,coordinateUnit:'m',weightUnit:hasWeight?measureUnit:null,sourceCoordinateUnit:meta.coordinateUnit,sourceWeightUnit:hasWeight?meta.weightUnit:null},groups,hasWeight,measureUnit,sourceBindingVerified:false};
 }
 function xyzSelect(table,filters){
  if(table.summaryOnly){
   if(JSON.stringify(filters)!==table.filterKey)fail('Summary-only history is bound to the filters used at read time. Re-read Field to change selection.');
   return table.samples;
  }
  const times=[];
  for(const [time,rows] of [...table.groups].sort((a,b)=>a[0]-b[0])){
   const selected=[],stages=filters.map(f=>({type:f.type,input:0,passed:0,missing:0}));let missingThreshold=0;
   for(const r of rows){let ok=true;for(let i=0;i<filters.length;i++){const f=filters[i],stage=stages[i];stage.input++;
    if(f.type==='threshold'&&r.value===null){stage.missing++;missingThreshold++;ok=false;break}
    if(f.type==='threshold'?r.value<f.min||r.value>f.max:!spatialContains([r.x,r.y,r.z],f)){ok=false;break}stage.passed++;
   }if(ok)selected.push(r)}
   let knownWeight=0,validWeight=0,weighted=0,sum=0,n=0,min=Infinity,max=-Infinity,weightCount=0,weightedCount=0;
   for(const r of selected){if(r.weight!==null){knownWeight+=r.weight;weightCount++}if(r.value!==null){n++;sum+=r.value;min=Math.min(min,r.value);max=Math.max(max,r.value);if(r.weight!==null){validWeight+=r.weight;weighted+=r.value*r.weight;weightedCount++}}}
   if([knownWeight,validWeight,weighted,sum].some(v=>!Number.isFinite(v)))fail('Spatial sum overflow');
   const extensive=table.meta.convention==='perEntity',sampleComplete=selected.length>0&&n===selected.length&&!missingThreshold&&!(table.invalidByTime?.[time]>0),complete=sampleComplete&&(extensive||table.hasWeight&&weightCount===selected.length);
   times.push({time,eligible:rows.length+(table.invalidByTime?.[time]||0),invalidGeometry:table.invalidByTime?.[time]||0,selected:selected.length,valid:n,weightCount,weightedCount,missingThreshold,stages,knownWeight:table.hasWeight?knownWeight:null,validWeight:table.hasWeight?validWeight:null,coverage:selected.length?n/selected.length:null,weightCoverage:table.hasWeight&&weightCount===selected.length&&knownWeight?validWeight/knownWeight:null,mean:n?sum/n:null,weightedMean:!extensive&&validWeight?weighted/validWeight:null,integral:extensive?n?sum:null:weightedCount?weighted:null,min:n?min:null,max:n?max:null,sampleComplete,complete,rows:selected});
  }
  return times;
 }
 function timeSummary(samples,key,maxGap){
  if(!['integral','weightedMean','mean'].includes(key)||!Number.isFinite(maxGap)||maxGap<=0)fail('Choose temporal variable and positive maximum gap in seconds');
  let duration=0,integral=0,intervals=0,skipped=0,sampleSum=0,count=0;
  for(let i=0;i<samples.length;i++){const a=samples[i],v=a[key];if((key==='mean'?a.sampleComplete:a.complete)&&v!==null&&Number.isFinite(v)){sampleSum+=v;count++}
   if(!i)continue;const b=samples[i-1],dt=a.time-b.time;if(!(dt>0)||!Number.isFinite(dt))fail('Times must be strictly increasing');
   const valid=q=>(key==='mean'?q.sampleComplete:q.complete)&&q[key]!==null&&Number.isFinite(q[key]);
   if(dt>maxGap||!valid(a)||!valid(b)){skipped++;continue}integral+=(a[key]+b[key])*.5*dt;duration+=dt;intervals++;
  }
  const span=samples.length>1?samples.at(-1).time-samples[0].time:0;
  if([span,integral,duration,sampleSum].some(x=>!Number.isFinite(x)))fail('Temporal integration overflow');
  return {key,samples:samples.length,validSamples:count,sampleMean:count?sampleSum/count:null,span_s:span,covered_s:duration,timeCoverage:span?duration/span:null,intervals,skipped,maxGap_s:maxGap,timeIntegral:intervals?integral:null,timeWeightedMean:duration?integral/duration:null,method:'Trapezoids between consecutive complete observed samples; no gap fill or extrapolation'};
 }
 function xyzFluxPair(a,b,time,signA,signB,areaTolerance){
  if(a.meta.association!=='faceSet'||b.meta.association!=='faceSet'||a.meta.field!==b.meta.field||a.meta.unit!==b.meta.unit||a.meta.convention!==b.meta.convention||![1,-1].includes(signA)||![1,-1].includes(signB)||!Number.isFinite(areaTolerance)||areaTolerance<0||areaTolerance>.1)fail('Flux requires matching field name, face conventions, units and explicit outward signs');
  if(a.summaryOnly||b.summaryOnly)fail('Interface pairing requires retained face rows, not summary-only history');if(!a.hasWeight||!b.hasWeight)fail('Both sides require measured face areas');
  const ar=a.groups.get(time),br=b.groups.get(time);if(!ar||!br)fail('No common exact physical time');
  function map(rows){const m=new Map();for(const r of rows){const k=JSON.stringify([r.x,r.y,r.z]),l=m.get(k)||[];l.push(r);m.set(k,l)}return m}
  const ma=map(ar),mb=map(br),pairs=[];let pairedA=0,pairedB=0,powerA=0,powerB=0,absResidual=0,missing=0,areaMismatch=0;
  const area=rows=>rows.reduce((n,r)=>n+(r.weight??0),0),totalA=area(ar),totalB=area(br),knownAreaCountA=ar.filter(r=>r.weight!==null).length,knownAreaCountB=br.filter(r=>r.weight!==null).length;
  const duplicates=m=>[...m.values()].reduce((n,l)=>n+(l.length>1?l.length:0),0);
  for(const [k,l] of ma){const q=mb.get(k);if(l.length!==1||q?.length!==1)continue;const x=l[0],y=q[0];if(x.value===null||y.value===null||x.weight===null||y.weight===null){missing++;continue}
   if(Math.abs(x.weight-y.weight)>areaTolerance*Math.max(x.weight,y.weight)){areaMismatch++;continue}
   const intensive=a.meta.convention==='intensive',qa=signA*x.value*(intensive?x.weight:1),qb=signB*y.value*(intensive?y.weight:1);pairedA+=x.weight;pairedB+=y.weight;powerA+=qa;powerB+=qb;absResidual+=Math.abs(qa+qb);pairs.push({idA:x.id,idB:y.id,x:x.x,y:x.y,z:x.z,areaA:x.weight,areaB:y.weight,outwardA:qa,outwardB:qb,residual:qa+qb});
  }
  if([totalA,totalB,pairedA,pairedB,powerA,powerB,absResidual].some(x=>!Number.isFinite(x)))fail('Interface integration overflow');
  return {time,signA,signB,areaTolerance,pairs,matched:pairs.length,unmatchedA:ar.length-pairs.length,unmatchedB:br.length-pairs.length,duplicatesA:duplicates(ma),duplicatesB:duplicates(mb),missing,areaMismatch,knownAreaCountA,knownAreaCountB,totalAreaA:totalA,totalAreaB:totalB,pairedAreaA:pairedA,pairedAreaB:pairedB,areaCoverageA:knownAreaCountA===ar.length&&totalA?pairedA/totalA:null,areaCoverageB:knownAreaCountB===br.length&&totalB?pairedB/totalB:null,outwardA:pairs.length?powerA:null,outwardB:pairs.length?powerB:null,residual:pairs.length?powerA+powerB:null,absolutePairResidual:pairs.length?absResidual:null,unit:a.meta.convention==='intensive'?a.meta.unit+'·m²':a.meta.unit,method:'Exact centroid XYZ in meters, one-to-one unique coordinates and area tolerance; no topology or normal certification',interfaceVerified:false};
 }


 function overlayPoints(rows,limit=1500){
  if(!Array.isArray(rows)||!Number.isInteger(limit)||limit<1||limit>3000)fail('Invalid overlay input');
  const stride=Math.max(1,Math.ceil(rows.length/limit)),points=[];
  for(let i=0;i<rows.length;i+=stride){const r=rows[i],p=[r.x,r.y,r.z];if(!p.every(Number.isFinite)||!Number.isSafeInteger(r.id))fail('Invalid selected entity');points.push({id:r.id,p})}
  return {points,total:rows.length,sampled:points.length};
 }
 function overlayMatches(pin,info,state,visible){
  return !!(visible&&pin&&info&&state&&!state.sync?.interpolated&&pin.caseObj===info.caseObj&&pin.mesh===info.mesh&&pin.view===info.view&&pin.region===info.region&&pin.name===info.name&&pin.component===info.component&&pin.storage===info.storage&&Number.isFinite(info.time)&&pin.time===info.time);
 }
 function overlayProject(points,mvp,width,height){
  if(!mvp||mvp.length!==16||!Array.from(mvp).every(Number.isFinite)||!(width>0)||!(height>0))return [];
  const out=[];for(const {id,p} of points){const [x,y,z]=p,w=mvp[3]*x+mvp[7]*y+mvp[11]*z+mvp[15];if(!(w>0)||!Number.isFinite(w))continue;
   const a=(mvp[0]*x+mvp[4]*y+mvp[8]*z+mvp[12])/w,b=(mvp[1]*x+mvp[5]*y+mvp[9]*z+mvp[13])/w,c=(mvp[2]*x+mvp[6]*y+mvp[10]*z+mvp[14])/w;
   if(![a,b,c].every(Number.isFinite)||Math.abs(a)>1||Math.abs(b)>1||Math.abs(c)>1)continue;out.push({id,x:(a+1)*width/2,y:(1-b)*height/2})}
  return out;
 }

 function fromNativeReport(r,region){
  if(!r||!['foamlens/native-cartesian-mesh/1','foamlens/native-gmsh-mesh/1','foamlens/native-snappy-mesh/1'].includes(r.schema)||r.originalCaseModified!==false||r.meshGenerated!==true||r.generationExit!==0||r.exportError)fail('No complete generated mesh report');
  const sub=region?r.regions?.[region]:r;
  if(!sub||region&&(r.splitExit!==0||r.splitError))fail('Incomplete split region output');
  const count=region?sub.expectedCells:r.plannedCells;
  const f={};for(const n of ['points','faces','owner','neighbour','boundary']){const v=sub.files?.['constant/polyMesh/'+n];if(typeof v!=='string'||!v)fail('Missing generated mesh '+n);f[n]=v}
  const m=poly(f);if(r.schema==='foamlens/native-snappy-mesh/1'?m.cells.length<1:!Number.isSafeInteger(count)||m.cells.length!==count)fail('Generated cell count differs from input; inspect export separately');
  return m;
 }
 const metricSpecs={nonOrthogonality:['faceSet','deg','internal'],skewness:['faceSet','1','all'],faceWeight:['faceSet','1','internal'],volumeRatio:['faceSet','1','internal'],faceArea:['faceSet','m²','all'],cellVolume:['cellSet','m³','all']};
 function generatedMetric(r,region,m,name){
  const sub=region?r.regions?.[region]:r,spec=metricSpecs[name];if(!spec||!sub||sub.nativeMetricsStatus!=='captured'||typeof sub.nativeMetrics?.[name]!=='string')fail('Native metric unavailable');
  const lines=String(sub.nativeMetricsManifest||'').trim().split(/\r?\n/),expected=['foamlens/native-quality/1','region='+(region||'region0'),'instance=constant','cells='+m.cells.length,'faces='+m.faces.length,'internalFaces='+m.neighbour.length];
  if(lines.length!==expected.length||lines.some((v,i)=>v!==expected[i]))fail('Native quality manifest differs from selected region topology');
  const [kind,unit,scope]=spec,limit=kind==='cellSet'?m.cells.length:scope==='internal'?m.neighbour.length:m.faces.length;
  if(!limit){if(sub.nativeMetrics[name].trim()!=='id,value')fail('Unexpected empty metric data');return {kind,unit,metric:name,values:[],eligible:0,invalid:[],coverage:0,method:'Foundation meshCheck · same generated region receipt',sourceBindingVerified:true,region:region||null}}
  const q=qualityCSV(sub.nativeMetrics[name],kind,m);
  if(q.values.length!==limit||q.values.some((v,i)=>v.id!==i))fail('Native metric IDs/count differ from manifest');
  return {kind,unit,metric:name,values:q.values,eligible:limit,invalid:[],coverage:1,method:'Foundation meshCheck · same generated region receipt',sourceBindingVerified:true,region:region||null};
 }
 function generatedVolume(r,region,m){
  const sub=region?r.regions?.[region]:r;if(!sub||sub.nativeVolumeStatus!=='captured'||typeof sub.nativeQualityFields?.V!=='string')fail('Native volume field unavailable');
  const q=nativeQualityField(sub.nativeQualityFields.V,m);if(q.object!=='V'||q.kind!=='cellSet'||q.dimensions.join(' ')!=='0 3 0 0 0 0 0')fail('Unexpected native volume field identity');
  return {...q,sourceBindingVerified:true,source:'same isolated generated mesh receipt',region:region||null,method:'Foundation writeCellVolumes'};
 }
 function generatedSets(r,region,m){
  const sub=region?r.regions?.[region]:r,sets=[],warnings=[...(sub?.setWarnings||[])];
  for(const [name,data] of Object.entries(sub?.sets||{})){try{if(!/^[A-Za-z_][A-Za-z0-9_]{0,127}$/.test(name))fail('Invalid set name');sets.push(readSet(data,name,m))}catch(e){warnings.push(name+': '+e.message)}}
  return {sets,warnings};
 }
 return {blockDict,editArc,exportBlockDict,poly,readSet,locate,patchMatch,qualityCSV,cellGeometry,geometricMetric,metricHistogram,qualityMap,metricColor,nativeQualityField,qualityFacePolygons,metricThreshold,faceGeometry,parseSpatialPipeline,spatialSelect,fieldTopology,fieldRows,nativeTable,xyzTable,xyzSelect,timeSummary,xyzFluxPair,overlayPoints,overlayMatches,overlayProject,fromNativeReport,generatedMetric,generatedVolume,generatedSets,edges,key};
})();
/* FOAMLENS_MESH_STUDIO_CORE_END */

async function msSha256(bytes){if(!globalThis.crypto?.subtle)throw Error('SHA-256 unavailable in this browser');return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('')}
async function msFingerprint(m,scope=null){
 if(!globalThis.crypto?.subtle)throw Error('SHA-256 unavailable in this browser');
 const parts=[];for(const [name,value] of [['points',m.points],['faces',m.faces],['owner',m.owner],['neighbour',m.neighbour],['patches',m.patches],['scope',scope?{kind:scope.kind,values:[...scope.values].sort((a,b)=>a-b)}:null]]){
  const bytes=new TextEncoder().encode(JSON.stringify(value)),digest=await crypto.subtle.digest('SHA-256',bytes);
  parts.push(name+':'+Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join(''));
 }
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(parts.join('\n')));
 return Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');
}
function msMount(){
 const anchor=document.getElementById('cmbDesigner');if(!anchor||document.getElementById('msStudio'))return;
 const panel=document.createElement('details');panel.id='msStudio';panel.style.cssText='margin:12px 0;padding:12px;border:1px solid var(--line);border-radius:10px';
 const t=(a,b)=>cgEscape(cgUi(a,b));
 panel.innerHTML='<summary><b>Mesh Studio · '+t('Original geometry and native mesh','Geometría original y malla nativa')+'</b></summary><p class="cgNotice">'+t('Local read-only inspection. ASCII OpenFOAM files; unsupported syntax is rejected. Coordinates in meters; wireframe projection is not a mesh-quality certificate.','Inspección local de solo lectura. Archivos OpenFOAM ASCII; sintaxis no compatible se rechaza. Coordenadas en metros; la proyección no certifica calidad.')+'</p>'+
 '<div class="cgTools"><label>blockMeshDict <input type="file" id="msDict"></label><label>polyMesh A <input type="file" id="msFolderA" webkitdirectory multiple></label><label>polyMesh B <input type="file" id="msFolderB" webkitdirectory multiple></label></div>'+
 '<p id="msStatus" class="cgNotice" aria-live="polite"></p><div class="cgTools" id="msRegionControls" hidden><label>Generated region <select id="msGeneratedRegion"></select></label><button class="btn soft" id="msUseRegion" type="button">Inspect region</button></div><div id="msGeneratedInterface" hidden><div class="cgTools"><label>Region A <select id="msGenA"></select></label><label>Patch A <select id="msGenPatchA"></select></label><label>Region B <select id="msGenB"></select></label><label>Patch B <select id="msGenPatchB"></select></label><button class="btn soft" id="msGenCompare" type="button">'+t('Compare generated interface','Comparar interfaz generada')+'</button><button class="btn soft" id="msGenExport" type="button" disabled>ZIP</button></div><p id="msGenResult" class="cgNotice"></p></div><div class="cgTools"><label>'+t('Source','Fuente')+' <select id="msMode"><option value="dict">blockMeshDict</option><option value="a">polyMesh A</option><option value="b">polyMesh B</option><option value="generated">'+t('Generated mesh','Malla generada')+'</option></select></label><label>'+t('Projection','Proyección')+' <select id="msProjection"><option>ISO</option><option>XY</option><option>XZ</option><option>YZ</option></select></label><label>'+t('Zone / patch / defect set','Zona / parche / conjunto de defectos')+' <select id="msGroup"></select></label></div>'+
 '<div class="cgTools"><label>'+t('ID type','Tipo de ID')+' <select id="msKind"><option value="cellSet">Cell / Block</option><option value="faceSet">Face</option><option value="pointSet">Point</option></select></label><label>ID <input id="msId" type="number" min="0" step="1" value="0" style="width:100px"></label><button class="btn soft" id="msLocate" type="button">'+t('Locate','Localizar')+'</button></div><div id="msSummary"></div><div id="msView"></div><p id="msSelection" class="cgNotice"></p>'+
 '<div class="cgTools"><label>'+t('Quality metric CSV (id,value)','CSV de métrica de calidad (id,value)')+' <input id="msQualityFile" type="file" accept=".csv"></label><label>'+t('Association','Asociación')+' <select id="msQualityKind"><option value="faceSet">Face</option><option value="cellSet">Cell</option><option value="pointSet">Point</option></select></label><label>'+t('Metric / units','Métrica / unidades')+' <input id="msQualityName" placeholder="non-orthogonality [deg]"></label><button class="btn soft" id="msQualityLoad" type="button">'+t('Load histogram','Cargar histograma')+'</button></div><p id="msQualityStatus" class="cgNotice"></p><div id="msQualityHistogram"></div><div class="cgTools"><label>'+t('Native ASCII scalar field','Campo escalar ASCII nativo')+' <input id="msNativeQualityFile" type="file"></label><label>'+t('Internal / patch name','Interno / nombre de parche')+' <input id="msNativeQualityScope" value="internal"></label><button class="btn soft" id="msNativeQualityLoad" type="button">'+t('Load native field','Cargar campo nativo')+'</button></div><p id="msNativeQualityStatus" class="cgNotice"></p><button class="btn soft" id="msGeneratedVolumes" type="button" hidden>Load native V [m³]</button><p id="msGeneratedVolumeStatus" class="cgNotice"></p><div id="msGeneratedMetricsControl" class="cgTools" hidden><select id="msGeneratedMetric"><option value="nonOrthogonality">Native non-orthogonality [deg]</option><option value="skewness">Native skewness</option><option value="faceWeight">Native face weight</option><option value="volumeRatio">Native volume ratio</option><option value="faceArea">Native face area [m²]</option><option value="cellVolume">Native cell volume [m³]</option></select><button class="btn soft" id="msGeneratedMetricLoad" type="button">Load native metric</button></div><p id="msGeneratedMetricStatus" class="cgNotice"></p>'+
 '<div class="cgTools"><label>'+t('Computed geometry','Geometría calculada')+' <select id="msComputed"><option value="cellVolume">Cell volume [m³]</option><option value="faceArea">Face area vector [m²]</option><option value="nonOrthogonality">Internal face non-orthogonality [deg]</option><option value="cellEdgeRatio">Cell edge length ratio [1]</option><option value="internalFaceOffset">Internal face offset / √area [1]</option></select></label><button class="btn soft" id="msCompute" type="button">'+t('Compute and inspect','Calcular e inspeccionar')+'</button></div><p id="msComputedStatus" class="cgNotice"></p><div class="cgTools"><label>Min <input id="msLow" type="number" step="any"></label><label>Max <input id="msHigh" type="number" step="any"></label><button class="btn soft" id="msThreshold" disabled type="button">Threshold</button><button class="btn soft" id="msMetricExport" disabled type="button">CSV / JSON ZIP</button></div><p id="msThresholdStatus" class="cgNotice"></p><div id="msComputedHistogram"></div><div class="cgTools" id="msQualityMapControls" hidden><label><input type="checkbox" id="msQualityMapOn" checked> '+t('Color metric map','Mapa de color de métrica')+'</label><label><input type="checkbox" id="msQualityMapSelected"> '+t('Selected IDs only','Solo IDs seleccionados')+'</label></div><label id="msQualityFacesControl" hidden><input type="checkbox" id="msQualityFaces"> '+t('Color face polygons (projection)','Colorear polígonos de caras (proyección)')+'</label><div id="msQualityMapLegend"></div>'+
 '<details id="msSpatial"><summary><b>'+t('Spatial selection · Integrate variables','Selección espacial · Integrar variables')+'</b></summary><p class="cgNotice">'+t('Native IDs and centroid masks; no clipping or interpolation. Scope follows the selected patch/set. Add scalar CSV id,value only from the same case, region and time.','IDs nativos y máscaras por centroide; sin corte geométrico ni interpolación. Alcance del parche/conjunto seleccionado. Carga CSV escalar id,value del mismo caso, región y tiempo.')+'</p><div class="cgTools"><label>'+t('Association','Asociación')+' <select id="msRoiKind"><option value="cellSet">Cells</option><option value="faceSet">Faces</option><option value="pointSet">Points</option></select></label><label>'+t('Case / region','Caso / región')+' <input id="msRoiSource" placeholder="C3D04 / metal"></label><label>t [s] <input id="msRoiTime" type="number" step="any"></label></div><div class="cgTools"><label>'+t('Scalar CSV','CSV escalar')+' <input id="msRoiFile" type="file" accept=".csv"></label><label>'+t('Field','Variable')+' <input id="msRoiField" placeholder="T"></label><label>'+t('Units','Unidades')+' <input id="msRoiUnit" placeholder="K"></label><label>'+t('Convention','Convención')+' <select id="msRoiConvention"><option value="intensive">Intensive × measure</option><option value="perEntity">Already per entity · sum</option></select></label></div><p class="cgNotice">'+t('Filter rows: box xmin ymin zmin xmax ymax zmax; cylinder ax ay az bx by bz radius; slab ox oy oz nx ny nz min max; threshold min max. Coordinates in m. # disables a row. All active filters are AND; reorder rows to change stage counts.','Filas: box xmin ymin zmin xmax ymax zmax; cylinder ax ay az bx by bz radio; slab ox oy oz nx ny nz mín máx; threshold mín máx. Coordenadas en m. # desactiva fila. Filtros activos AND; reordena filas para cambiar conteos intermedios.')+'</p><textarea id="msRoiPipeline" rows="5" style="width:100%;box-sizing:border-box" placeholder="# box 0 0 0 0.02 0.03 0.02"></textarea><div class="cgTools"><label>'+t('Selection name','Nombre selección')+' <input id="msRoiName" value="ROI 1"></label><button class="btn primary" id="msRoiApply" type="button">'+t('Apply / integrate','Aplicar / integrar')+'</button><button class="btn soft" id="msRoiExport" type="button" disabled>CSV / JSON ZIP</button><label>'+t('Restore pipeline JSON','Restaurar pipeline JSON')+' <input id="msRoiRestore" type="file" accept=".json"></label></div><p id="msRoiStatus" class="cgNotice" aria-live="polite"></p><div id="msRoiStages"></div><div id="msRoiStats"></div></details>'+
 '<div class="cgTools"><label>Patch A <select id="msPatchA"></select></label><label>Patch B <select id="msPatchB"></select></label><button class="btn soft" id="msMatch" type="button">'+t('Compare exact interface','Comparar interfaz exacta')+'</button><button class="btn soft" id="msExport" type="button" disabled>'+t('Export comparison ZIP','Exportar comparación ZIP')+'</button></div><p id="msMatchResult" class="cgNotice"></p>';
 anchor.insertAdjacentElement('afterend',panel);
 const el=id=>panel.querySelector('#'+id),models={dict:null,a:null,b:null,generated:null},revision={dict:0,a:0,b:0};let generatedReceipt=null,generatedLabel='',generatedPair=null,genCache=new Map(),selected=null,result=null,quality=null,qualityBin=null,qualityRevision=0,computed=null,threshold=null,metricSelection=null,roi=null,roiRevision=0;
 const status=s=>{el('msStatus').textContent=s},resetMatch=()=>{result=null;el('msExport').disabled=true;el('msMatchResult').textContent=''};
 const opts=(select,items)=>{select.replaceChildren();for(const [v,l] of items){const o=document.createElement('option');o.value=v;o.textContent=l;select.append(o)}};
 const project=p=>{const m=el('msProjection').value;return m==='XY'?[p[0],p[1]]:m==='XZ'?[p[0],p[2]]:m==='YZ'?[p[2],p[1]]:[(p[0]-p[2])*.707,p[1]+(p[0]+p[2])*.408]};
 function clearComputed(){computed=null;threshold=null;metricSelection=null;for(const id of ['msComputedStatus','msThresholdStatus','msComputedHistogram'])el(id).textContent='';el('msThreshold').disabled=el('msMetricExport').disabled=true}
 function clearQuality(){clearComputed();qualityRevision++;quality=null;qualityBin=null;el('msQualityHistogram').textContent='';el('msQualityStatus').textContent='';el('msNativeQualityStatus').textContent=''}
 function clearRoi(){roiRevision++;roi=null;el('msRoiExport').disabled=true;for(const id of ['msRoiStatus','msRoiStages','msRoiStats'])el(id).textContent=''}
 function redraw(reset=false){
  const mode=el('msMode').value,obj=models[mode],isDict=mode==='dict';
  if(reset){clearQuality();clearRoi();selected=null;el('msSelection').textContent='';opts(el('msGroup'),[['all',cgUi('All','Todo')],...(obj?(isDict?Object.keys(obj.data.zones).map(n=>['z:'+n,n]):[...obj.data.patches.map(p=>['p:'+p.name,p.name+' ('+p.count+')']),...obj.sets.map(s=>['s:'+s.name,s.name+' ('+s.values.length+')'])]):[])])}
  el('msSummary').textContent='';el('msView').textContent='';el('msQualityMapControls').hidden=true;el('msQualityFacesControl').hidden=true;el('msGeneratedVolumes').hidden=mode!=='generated';el('msGeneratedVolumes').disabled=!obj?.nativeVolume;el('msGeneratedVolumeStatus').textContent=mode==='generated'?(obj?.nativeVolumeStatus||'not-run'):'';el('msGeneratedMetricsControl').hidden=mode!=='generated';el('msGeneratedMetricLoad').disabled=obj?.nativeMetricsStatus!=='captured';el('msGeneratedMetricStatus').textContent=mode==='generated'?(obj?.nativeMetricsStatus||'not-run'):'';el('msQualityMapLegend').textContent='';arcPanel.hidden=!isDict||!obj;if(!obj)return;if(reset&&isDict)refreshArcEdges(obj.data);
  const m=obj.data,group=el('msGroup').value,lines=[],marks=[],highlight=[],pickEdges=[];let map=null,mapMetric=null,filledFaces=[];const activeMetric=!isDict&&(computed||quality);el('msQualityMapControls').hidden=!activeMetric;el('msQualityMapLegend').textContent='';
  const face=(i,target)=>{const v=m.faces[i].map(j=>m.points[j]);target.push([...v,v[0]])};
  if(isDict){el('msSummary').textContent=obj.name+' · '+m.vertices.length+' vertices · '+m.blocks.length+' blocks · '+m.arcs.size+' arcs · '+m.cells+' planned cells · '+JSON.stringify(m.zones)+' · '+m.patches.map(p=>p.name+': '+p.type).join(', ');
   const drawBlock=(b,target)=>{for(const e of msCore.edges){const v=e.map(j=>b.vertices[j]),a=m.arcs.get(msCore.key(v));target.push(a?a.points:v.map(i=>m.vertices[i]))}};
   const seen=new Set();for(const b of m.blocks)if(group==='all'||group==='z:'+b.zone){for(const e of msCore.edges){const v=e.map(j=>b.vertices[j]),k=msCore.key(v);if(seen.has(k))continue;seen.add(k);const edgePoints=m.arcs.get(k)?.points||v.map(i=>m.vertices[i]);lines.push(edgePoints);pickEdges.push({key:k,points:edgePoints})}}if(selected?.kind==='cellSet')drawBlock(m.blocks[selected.id],highlight);if(selected?.kind==='pointSet')marks.push(m.vertices[selected.id]);
  }else{el('msSummary').textContent=obj.name+' · '+m.points.length+' points · '+m.faces.length+' faces · '+m.cells.length+' cells · '+m.neighbour.length+' internal faces · '+m.patches.length+' patches · '+obj.sets.length+' native sets';
   const patch=m.patches.find(p=>'p:'+p.name===group),set=obj.sets.find(s=>'s:'+s.name===group);
   const ranges=patch?[patch]:m.patches;for(const p of ranges){const stride=Math.max(1,Math.ceil(p.count/Math.max(1,Math.floor(2400/ranges.length))));for(let i=p.start;i<p.start+p.count;i+=stride)face(i,lines)}
   if(set){const stride=Math.max(1,Math.ceil(set.values.length/3000));for(let i=0;i<set.values.length;i+=stride)marks.push(msCore.locate(m,set.kind,set.values[i]).point)}
   if(quality&&qualityBin!==null){const ids=quality.histogram[qualityBin].ids,stride=Math.max(1,Math.ceil(ids.length/3000));for(let i=0;i<ids.length;i+=stride)marks.push(msCore.locate(m,quality.kind,ids[i]).point)}
   if(computed&&threshold){const stride=Math.max(1,Math.ceil(threshold.length/3000));for(let i=0;i<threshold.length;i+=stride)marks.push(msCore.locate(m,computed.kind,threshold[i].id).point)}
   if(roi){const stride=Math.max(1,Math.ceil(roi.result.rows.length/3000));for(let i=0;i<roi.result.rows.length;i+=stride){const r=roi.result.rows[i];marks.push([r.x,r.y,r.z])}}
   if(selected){const a=msCore.locate(m,selected.kind,selected.id);for(const i of a.faces)face(i,highlight);marks.push(a.point)}
  }
  if(activeMetric&&el('msQualityMapOn').checked){try{
   mapMetric=activeMetric;let subset=null;
   if(el('msQualityMapSelected').checked){subset=[];if(computed&&threshold!==null)subset=threshold;else if(quality&&qualityBin!==null){const ids=new Set(quality.histogram[qualityBin].ids);subset=quality.values.filter(r=>ids.has(r.id))}}
   map=msCore.qualityMap(m,mapMetric,subset);el('msQualityFacesControl').hidden=mapMetric.kind!=='faceSet';if(mapMetric.kind==='faceSet'&&el('msQualityFaces').checked)filledFaces=msCore.qualityFacePolygons(m,map,mapMetric.kind);
   const legend=el('msQualityMapLegend'),label=document.createElement('p');label.className='cgNotice';label.textContent=(computed?computed.metric+' ['+computed.unit+']':quality.nativeField?quality.object+' · '+quality.scope+' · dimensions ['+quality.dimensions.join(' ')+']':el('msQualityName').value+' · CSV')+' · '+map.points.length+'/'+map.total+' '+(filledFaces.length?t('face polygons; transparent projection, no depth test','polígonos de caras; proyección transparente, sin prueba de profundidad'):t('projected IDs; vertex means, not filled cells','IDs proyectados; media de vértices, no celdas rellenas'));legend.append(label);
   if(map.points.length){const ramp=document.createElement('div');ramp.style.cssText='height:10px;border-radius:3px;background:'+ (map.min===map.max?msCore.metricColor(map.min,map.min,map.max):'linear-gradient(to right,#2359b0,#31b4b2,#f5d756,#ca372b)');legend.append(ramp);const ends=document.createElement('p');ends.style.cssText='display:flex;justify-content:space-between;margin:3px 0';for(const v of [map.min,map.max]){const item=document.createElement('span');item.textContent=v.toPrecision(6);ends.append(item)}legend.append(ends)}
  }catch(e){el('msQualityMapLegend').textContent=e.message;map=null}}
  const pts=[...lines.flat(),...highlight.flat(),...marks,...(map?.points.map(p=>p.point)||[]),...filledFaces.flatMap(p=>p.vertices)].map(project);if(!pts.length)return;let lo=[Infinity,Infinity],hi=[-Infinity,-Infinity];for(const p of pts)for(let i=0;i<2;i++){lo[i]=Math.min(lo[i],p[i]);hi[i]=Math.max(hi[i],p[i])}const scale=Math.min(580/(hi[0]-lo[0]||1),320/(hi[1]-lo[1]||1)),xy=p=>{const q=project(p);return [320+(q[0]-(lo[0]+hi[0])/2)*scale,180-(q[1]-(lo[1]+hi[1])/2)*scale]};
  const poly=(a,color,width)=>'<polyline points="'+a.map(p=>xy(p).join(',')).join(' ')+'" fill="none" stroke="'+color+'" stroke-width="'+width+'"/>';
  el('msView').innerHTML='<svg viewBox="0 0 640 360" style="width:100%;max-height:420px;background:#101b2c;border-radius:9px" aria-label="Mesh projection">'+lines.map(a=>poly(a,'#7795ac',.65)).join('')+filledFaces.map(p=>'<polygon points="'+p.vertices.map(v=>xy(v).join(',')).join(' ')+'" fill="'+p.color+'" fill-opacity=".65" stroke="'+p.color+'" stroke-width=".8" data-metric-id="'+p.id+'" tabindex="0" role="button" aria-label="Face '+p.id+'" style="cursor:pointer"><title>Face '+p.id+' · '+p.value+'</title></polygon>').join('')+highlight.map(a=>poly(a,'#ffb74d',2.5)).join('')+marks.map(p=>{const [x,y]=xy(p);return '<circle cx="'+x+'" cy="'+y+'" r="2.8" fill="#ffb74d"/>'}).join('')+(map?.points.map(p=>{const [x,y]=xy(p.point);return '<circle cx="'+x+'" cy="'+y+'" r="3.5" fill="'+p.color+'" stroke="#101b2c" stroke-width=".6" data-metric-id="'+p.id+'" tabindex="0" role="button" aria-label="ID '+p.id+'" style="cursor:pointer"><title>ID '+p.id+' · '+p.value+'</title></circle>'}).join('')||'')+pickEdges.map(e=>'<polyline data-block-edge="'+e.key+'" points="'+e.points.map(p=>xy(p).join(',')).join(' ')+'" stroke="transparent" stroke-width="9" fill="none" style="cursor:pointer" tabindex="0" role="button" aria-label="Edge '+e.key+'"><title>Edge '+e.key+'</title></polyline>').join('')+'</svg><p class="cgNotice">'+t('Preview: native boundary faces sampled; orange = selected IDs / defect-set markers. Defect and ID positions use vertex means; spatial selection uses computed centroids.','Vista: muestreo de caras de borde; naranja = IDs elegidos / marcadores del conjunto. IDs y defectos por media de vértices; selección espacial usa centroides calculados.')+'</p>';
  const activate=(node,action)=>{node.addEventListener('click',action);node.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();action()}})};
  for(const node of el('msView').querySelectorAll('[data-metric-id]'))activate(node,()=>{const id=Number(node.dataset.metricId);el('msKind').value=mapMetric.kind;el('msId').value=String(id);el('msLocate').click()});
  for(const node of el('msView').querySelectorAll('[data-block-edge]'))activate(node,()=>{el('msArcEdge').value=node.dataset.blockEdge;refreshArc();el('msArcEdge').scrollIntoView({block:'nearest'})});
 }
 el('msQualityMapOn').onchange=el('msQualityMapSelected').onchange=el('msQualityFaces').onchange=()=>redraw();
 
 for(const id of ['msQualityFile','msQualityKind','msQualityName'])el(id).onchange=()=>{clearQuality();redraw()};
 el('msQualityLoad').onclick=async()=>{clearQuality();const token=qualityRevision,mode=el('msMode').value,obj=models[mode];try{const file=el('msQualityFile').files[0],name=el('msQualityName').value.trim(),kind=el('msQualityKind').value;if(mode==='dict'||!obj||!file||!name||file.size>48*1024*1024)throw Error('Select native mesh, metric name/units and CSV <=48 MiB');const q=msCore.qualityCSV(await file.text(),kind,obj.data);if(token!==qualityRevision||models[mode]!==obj||el('msMode').value!==mode)return;quality=q;el('msQualityStatus').textContent=obj.name+' · '+file.name+' · '+name+' · '+q.values.length+' IDs · '+(q.coverage*100).toFixed(2)+'% coverage · manually associated source, not verified by hash';const max=Math.max(1,...q.histogram.map(b=>b.ids.length));for(const [i,b] of q.histogram.entries()){const button=document.createElement('button');button.type='button';button.className='btn soft';button.style.cssText='display:flex;align-items:center;gap:8px;width:100%;margin:3px 0;text-align:left';const label=document.createElement('span');label.textContent=b.low.toPrecision(4)+' – '+b.high.toPrecision(4)+' · '+b.ids.length;label.style.minWidth='145px';const bar=document.createElement('span');bar.style.cssText='display:block;height:10px;background:#d6a248;border-radius:3px;width:'+(100*b.ids.length/max)+'%';button.append(label,bar);button.onclick=()=>{qualityBin=i;selected=null;el('msSelection').textContent=b.ids.length+' metric IDs in selected range; preview sampled at most 3000. '+(b.ids.length?'First ID '+b.ids[0]:'');if(b.ids.length){el('msKind').value=kind;el('msId').value=String(b.ids[0])}redraw()};el('msQualityHistogram').append(button)}redraw()}catch(e){if(token===qualityRevision)el('msQualityStatus').textContent=e.message}};
 for(const id of ['msNativeQualityFile','msNativeQualityScope'])el(id).onchange=()=>{clearQuality();redraw()};
 el('msNativeQualityLoad').onclick=async()=>{clearQuality();redraw();const token=qualityRevision,mode=el('msMode').value,obj=models[mode];try{
  const file=el('msNativeQualityFile').files[0],scope=el('msNativeQualityScope').value.trim()||'internal';if(!obj||mode==='dict'||!file||file.size>48*1024*1024)throw Error('Select native mesh and ASCII field up to 48 MiB');
  const q=msCore.nativeQualityField(await file.text(),obj.data,scope);if(token!==qualityRevision||models[mode]!==obj||el('msMode').value!==mode)return;quality=q;el('msNativeQualityStatus').textContent=q.object+' · '+q.kind+' · '+q.scope+' · '+q.values.length+' IDs · '+(q.location||'location unspecified')+' · counts match; confirm same case, region and time manually';
  drawNativeHistogram(q);redraw();
 }catch(e){if(token===qualityRevision)el('msNativeQualityStatus').textContent=e.message}};
 function drawNativeHistogram(q){const host=el('msQualityHistogram'),max=Math.max(1,...q.histogram.map(b=>b.ids.length));host.textContent='';for(const [i,b] of q.histogram.entries()){const button=document.createElement('button');button.className='btn soft';button.type='button';button.disabled=!b.ids.length;button.style.cssText='display:flex;align-items:center;gap:8px;width:100%;margin:3px 0;text-align:left';const label=document.createElement('span');label.textContent=b.low.toPrecision(4)+' – '+b.high.toPrecision(4)+' · '+b.ids.length;label.style.minWidth='145px';const bar=document.createElement('span');bar.style.cssText='height:10px;background:#d6a248;border-radius:3px;width:'+(100*b.ids.length/max)+'%';button.append(label,bar);button.onclick=()=>{qualityBin=i;selected=null;el('msQualityMapSelected').checked=true;el('msSelection').textContent=b.ids.length+' native field IDs';el('msKind').value=q.kind;el('msId').value=String(b.ids[0]);redraw()};host.append(button)}}
 el('msGeneratedVolumes').onclick=()=>{const obj=models.generated;if(el('msMode').value!=='generated'||!obj?.nativeVolume)return;clearQuality();quality=obj.nativeVolume;el('msQualityMapSelected').checked=false;el('msNativeQualityStatus').textContent='V [m³] · '+quality.values.length+' cells · '+quality.method+' · same generated region receipt';drawNativeHistogram(quality);redraw()};
 el('msGeneratedMetricLoad').onclick=()=>{const obj=models.generated;if(el('msMode').value!=='generated'||!obj)return;clearQuality();try{
  const q=msCore.generatedMetric(generatedReceipt,obj.nativeRegion,obj.data,el('msGeneratedMetric').value);computed={...q,source:obj.name};el('msComputedStatus').textContent=q.method+' · '+q.values.length+' IDs · '+q.unit;
  if(q.values.length){let lo=Infinity,hi=-Infinity;for(const row of q.values){lo=Math.min(lo,row.value);hi=Math.max(hi,row.value)}el('msLow').value=String(lo);el('msHigh').value=String(hi);el('msThreshold').disabled=el('msMetricExport').disabled=false;el('msQualityMapSelected').checked=false;drawComputedHistogram(q)}redraw();
 }catch(e){el('msComputedStatus').textContent=e.message}};
 el('msComputed').onchange=()=>{clearComputed();redraw()};
 el('msCompute').onclick=()=>{clearQuality();try{const mode=el('msMode').value,obj=models[mode];if(mode==='dict'||!obj)throw Error('Select native region mesh');const q=msCore.geometricMetric(obj.data,el('msComputed').value);computed={...q,source:obj.name};el('msComputedStatus').textContent=q.method+' · '+q.values.length+'/'+q.eligible+' valid · '+q.invalid.length+' invalid · '+q.unit;if(q.values.length){let lo=Infinity,hi=-Infinity;for(const r of q.values){lo=Math.min(lo,r.value);hi=Math.max(hi,r.value)}el('msLow').value=String(lo);el('msHigh').value=String(hi);el('msThreshold').disabled=false;el('msMetricExport').disabled=false;drawComputedHistogram(q)}redraw()}catch(e){el('msComputedStatus').textContent=e.message}};
 function drawComputedHistogram(q){
  const host=el('msComputedHistogram'),bins=msCore.metricHistogram(q.values),max=Math.max(1,...bins.map(b=>b.rows.length));host.textContent='';
  for(const [i,b] of bins.entries()){const button=document.createElement('button');button.type='button';button.className='btn soft';button.disabled=!b.rows.length;button.style.cssText='display:flex;align-items:center;gap:8px;width:100%;margin:3px 0;text-align:left';const label=document.createElement('span');label.textContent=b.low.toPrecision(4)+' – '+b.high.toPrecision(4)+' · '+b.rows.length;label.style.minWidth='145px';const bar=document.createElement('span');bar.style.cssText='height:10px;background:#d6a248;border-radius:3px;width:'+(100*b.rows.length/max)+'%';button.append(label,bar);
   button.onclick=()=>{threshold=b.rows;metricSelection={type:'histogramBin',index:i,low:b.low,high:b.high};el('msLow').value=String(b.low);el('msHigh').value=String(b.high);selected=null;el('msSelection').textContent='';el('msThresholdStatus').textContent=b.rows.length+' exact bin IDs · preview sampled at most 3000';el('msKind').value=q.kind;el('msId').value=String(b.rows[0].id);redraw()};host.append(button)}
 }
 for(const id of ['msLow','msHigh'])el(id).oninput=()=>{threshold=null;metricSelection=null;el('msThresholdStatus').textContent='';redraw()};
 el('msThreshold').onclick=()=>{threshold=null;metricSelection=null;try{if(!computed||!el('msLow').value.trim()||!el('msHigh').value.trim())throw Error('Compute metric and enter both bounds');threshold=msCore.metricThreshold(computed,Number(el('msLow').value),Number(el('msHigh').value));metricSelection={type:'inclusiveThreshold',low:Number(el('msLow').value),high:Number(el('msHigh').value)};selected=null;el('msThresholdStatus').textContent=threshold.length+' IDs selected · preview sampled at most 3000';if(threshold.length){el('msKind').value=computed.kind;el('msId').value=String(threshold[0].id)}}catch(e){el('msThresholdStatus').textContent=e.message}redraw()};
 el('msMetricExport').onclick=()=>{if(!computed)return;const {values,...meta}=computed,rows=threshold===null?values:threshold;cgDownloadZip('FoamLens-mesh-geometry.zip',cgStoreZip([{name:'metric.csv',data:'id,value\n'+rows.map(r=>r.id+','+r.value).join('\n')},{name:'provenance.json',data:JSON.stringify({...meta,selectedCount:rows.length,threshold:metricSelection?.type==='inclusiveThreshold'?[metricSelection.low,metricSelection.high]:null,selection:metricSelection},null,2)}]))};
 function roiScope(obj,kind,group=el('msGroup').value){if(group==='all')return null;
  if(group.startsWith('p:')){const p=obj.data.patches.find(x=>'p:'+x.name===group);if(!p||kind!=='faceSet')throw Error('Patch scope requires face association');return{kind,values:Array.from({length:p.count},(_,i)=>p.start+i)}}
  const set=obj.sets.find(x=>'s:'+x.name===group);if(!set||set.kind!==kind)throw Error('Set scope requires matching association');return set;
 }
 const roiInputs=['msRoiKind','msRoiSource','msRoiTime','msRoiFile','msRoiField','msRoiUnit','msRoiConvention','msRoiPipeline','msRoiName'];
 for(const id of roiInputs)el(id).addEventListener(id==='msRoiFile'||id==='msRoiKind'||id==='msRoiConvention'?'change':'input',()=>{clearRoi();redraw()});
 el('msRoiApply').onclick=async()=>{clearRoi();const token=roiRevision,mode=el('msMode').value,obj=models[mode];try{
  if(!obj||mode==='dict')throw Error('Select a native region mesh');
  const kind=el('msRoiKind').value,source=el('msRoiSource').value.trim(),name=el('msRoiName').value.trim(),timeText=el('msRoiTime').value,fieldName=el('msRoiField').value.trim(),unit=el('msRoiUnit').value.trim(),file=el('msRoiFile').files[0],convention=el('msRoiConvention').value,pipeline=el('msRoiPipeline').value;
  if(!source||!name||source.length>200||name.length>100)throw Error('Specify case / region and selection name');
  if(file&&(!fieldName||!unit||!timeText||!Number.isFinite(Number(timeText))||file.size>48*1024*1024))throw Error('Scalar CSV requires field, units, physical time and <=48 MiB');
  const filters=msCore.parseSpatialPipeline(pipeline),scope=roiScope(obj,kind);
  el('msRoiStatus').textContent='Reading source and evaluating whole-entity selection…';
  const raw=file?await file.arrayBuffer():null,field=raw?msCore.qualityCSV(new TextDecoder().decode(raw),kind,obj.data):null,fieldFingerprint=raw?await msSha256(raw):null,fingerprint=await msFingerprint(obj.data,scope);
  if(token!==roiRevision||models[mode]!==obj||el('msMode').value!==mode)return;
  const result=msCore.spatialSelect(obj.data,kind,filters,field,scope,convention);
  const meta={schema:'foamlens/spatial-pipeline/1',name,source,meshSource:obj.name,fingerprint,association:kind,time_s:timeText?Number(timeText):null,field:file?fieldName:null,unit:file?unit:null,fieldFile:file?.name||null,fieldFingerprint,convention,pipeline,scope:el('msGroup').value,sourceBindingVerified:false};
  roi={meta,result};el('msRoiExport').disabled=false;selected=null;
  el('msRoiStatus').textContent=result.selected+'/'+result.eligible+' selected · '+result.invalid.length+' invalid geometry · '+result.unknownThreshold.length+' unknown threshold · preview at most 3000 · scalar source manually associated, not verified';
  const stages=document.createElement('table');for(const row of [['Filter','Input','Passed','Missing'],...result.stages.map(x=>[x.type,x.input,x.passed,x.missing])]){const tr=stages.insertRow();for(const v of row)tr.insertCell().textContent=String(v)}el('msRoiStages').append(stages);
  const stats=document.createElement('table'),show=v=>v===null?'—':typeof v==='number'?Number(v.toPrecision(8)).toString():String(v);
  for(const row of [['Selected measure',result.selectedWeight,result.weightUnit],['Valid measure',result.validWeight,result.weightUnit],['Field coverage',result.coverage===null?null:100*result.coverage,'%'],['Measure coverage',result.weightCoverage===null?null:100*result.weightCoverage,'%'],['Weighted mean',result.weightedMean,unit],['Sample mean',result.mean,unit],['Integral / sum',result.integral,convention==='perEntity'?unit:unit+'·'+result.weightUnit],['Min',result.min,unit],['Max',result.max,unit]]){const tr=stats.insertRow();for(const v of row)tr.insertCell().textContent=show(v)}el('msRoiStats').append(stats);redraw()
 }catch(e){if(token===roiRevision){el('msRoiStatus').textContent=e.message;redraw()}}};
 el('msRoiExport').onclick=()=>{if(!roi)return;const {rows,...summary}=roi.result;cgDownloadZip('FoamLens-spatial-selection.zip',cgStoreZip([{name:'selection.csv',data:'id,x_m,y_m,z_m,weight,value\n'+rows.map(r=>[r.id,r.x,r.y,r.z,r.weight,r.value??''].join(',')).join('\n')},{name:'pipeline.json',data:JSON.stringify(roi.meta,null,2)},{name:'integration.json',data:JSON.stringify({...roi.meta,...summary},null,2)}]))};
 el('msRoiRestore').onchange=async()=>{clearRoi();const token=roiRevision,mode=el('msMode').value,obj=models[mode];try{
  const file=el('msRoiRestore').files[0];if(!obj||mode==='dict'||!file||file.size>65536)throw Error('Select native mesh and pipeline JSON <=64 KiB');
  const p=JSON.parse(await file.text());if(p.schema!=='foamlens/spatial-pipeline/1'||!['cellSet','faceSet','pointSet'].includes(p.association)||!['intensive','perEntity'].includes(p.convention)||typeof p.name!=='string'||typeof p.source!=='string'||typeof p.pipeline!=='string')throw Error('Invalid pipeline JSON');msCore.parseSpatialPipeline(p.pipeline);
  const scope=roiScope(obj,p.association,p.scope),fingerprint=await msFingerprint(obj.data,scope);if(token!==roiRevision||models[mode]!==obj||el('msMode').value!==mode)return;if(fingerprint!==p.fingerprint||p.meshSource!==obj.name)throw Error('Pipeline belongs to a different mesh source or scope fingerprint');
  if(!Array.from(el('msGroup').options).some(o=>o.value===p.scope))throw Error('Original patch/set scope unavailable');
  el('msRoiName').value=p.name;el('msRoiSource').value=p.source;el('msRoiKind').value=p.association;el('msRoiTime').value=p.time_s??'';el('msRoiField').value=p.field??'';el('msRoiUnit').value=p.unit??'';el('msRoiConvention').value=p.convention;el('msRoiPipeline').value=p.pipeline;el('msRoiFile').value='';el('msGroup').value=p.scope;el('msRoiStatus').textContent='Pipeline restored for exact topology and scope fingerprint. Reload original scalar CSV or explicitly choose a new time/field, then Apply.';redraw()
 }catch(e){if(token===roiRevision)el('msRoiStatus').textContent=e.message}};
 el('msMode').onchange=()=>redraw(true);el('msGroup').onchange=()=>{clearRoi();selected=null;el('msSelection').textContent='';redraw()};el('msProjection').onchange=()=>redraw();
 el('msLocate').onclick=()=>{try{const obj=models[el('msMode').value],kind=el('msKind').value,raw=el('msId').value;if(!obj||!/^\d+$/.test(raw))throw Error('Select source and integer ID');const id=Number(raw);let detail;if(el('msMode').value==='dict'){if(kind==='faceSet')throw Error('Block face ID is not a native face ID');const b=obj.data.blocks[id],p=obj.data.vertices[id];if(kind==='cellSet'&&!b||kind==='pointSet'&&!p)throw Error('ID out of range');detail=kind==='cellSet'?JSON.stringify(b):'XYZ [m] '+p.join(', ')}else{const a=msCore.locate(obj.data,kind,id);detail='XYZ vertex mean [m]: '+a.point.join(', ')+' · faces: '+a.faces.join(', ')+' · vertices: '+a.vertices.join(', ')}const metric=el('msMode').value==='dict'?null:computed||quality,metricRow=metric?.kind===kind?metric.values.find(r=>r.id===id):null;if(metricRow)detail+=' · '+(computed?computed.metric+' ['+computed.unit+']':quality?.nativeField?quality.object:el('msQualityName').value)+' = '+metricRow.value;selected={kind,id};el('msSelection').textContent=obj.name+' · '+kind+' '+id+' · '+detail;redraw()}catch(e){selected=null;el('msSelection').textContent=e.message;redraw()}};
 const arcPanel=document.createElement('div');arcPanel.hidden=true;arcPanel.innerHTML='<details open><summary><b>'+t('Edit curved block edges','Editar aristas curvas')+'</b></summary><p class="cgNotice">'+t('Select an edge by original vertex IDs. Midpoint coordinates are in meters. Export creates a new normalized dictionary, not a generated mesh.','Selecciona una arista por sus IDs de vértice originales. Punto intermedio en metros. La exportación crea un diccionario nuevo normalizado, no una malla generada.')+'</p><div class="cgTools"><label>'+t('Edge','Arista')+' <select id="msArcEdge"></select></label><label>'+t('Midpoint XYZ [m]','Punto intermedio XYZ [m]')+' <input id="msArcMid" placeholder="X Y Z"></label><button class="btn primary" id="msArcApply" type="button">'+t('Apply arc','Aplicar arco')+'</button><button class="btn soft" id="msArcRemove" type="button">'+t('Make straight','Hacer recta')+'</button><button class="btn soft" id="msArcExport" type="button">'+t('Export edited dictionary ZIP','Exportar diccionario editado ZIP')+'</button></div><p id="msArcStatus" class="cgNotice" aria-live="polite"></p></details>';el('msView').after(arcPanel);
 function arcIds(){const raw=el('msArcEdge').value;if(!/^\d+,\d+$/.test(raw))throw Error('Select a block edge');return raw.split(',').map(Number)}
 function arcAction(action){try{const obj=models.dict;if(!obj||el('msMode').value!=='dict')throw Error('Load dictionary');action(obj)}catch(e){el('msArcStatus').textContent=e.message}}
 function refreshArc(){arcAction(obj=>{const ids=arcIds(),a=obj.data.arcs.get(msCore.key(ids));el('msArcMid').value=a?a.mid.join(' '):'';el('msArcStatus').textContent=a?t('Existing arc [m]','Arco existente [m]'):t('Straight edge','Arista recta')})}
 function refreshArcEdges(model){const keys=new Set();for(const b of model.blocks)for(const e of msCore.edges)keys.add(msCore.key(e.map(j=>b.vertices[j])));opts(el('msArcEdge'),[...keys].map(k=>[k,k.replace(',',' ↔ ')+(model.arcs.has(k)?' · arc':'')]));if(keys.size)refreshArc()}
 el('msArcEdge').onchange=refreshArc;
 function changeArc(remove){arcAction(obj=>{const [a,b]=arcIds(),raw=el('msArcMid').value.trim().split(/\s+/);if(!remove&&(raw.length!==3||raw.some(x=>!/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?$/.test(x)||!Number.isFinite(Number(x)))))throw Error('Enter three finite decimal coordinates');const data=msCore.editArc(obj.data,a,b,remove?null:raw.map(Number));msCore.exportBlockDict(data);obj.data=data;refreshArcEdges(data);el('msArcEdge').value=msCore.key([a,b]);refreshArc();el('msArcStatus').textContent=t('Edited in memory; native mesh not generated','Editado en memoria; malla nativa no generada');redraw()})}
 el('msArcApply').onclick=()=>changeArc(false);el('msArcRemove').onclick=()=>changeArc(true);
 el('msArcExport').onclick=()=>arcAction(obj=>{cgDownloadZip('FoamLens-edited-blockMesh.zip',cgStoreZip([{name:'system/blockMeshDict',data:msCore.exportBlockDict(obj.data)},{name:'README.txt',data:'Normalized meters; review patches and run blockMesh and checkMesh in a NEW case. No native mesh generated or certified.\n'}]));el('msArcStatus').textContent=t('Export prepared; original untouched','Exportación preparada; original intacto')});
 el('msDict').onchange=async()=>{const token=++revision.dict;models.dict=null;el('msMode').value='dict';redraw(true);try{const file=el('msDict').files[0];if(!file||file.size>4*1024*1024)throw Error('Select blockMeshDict up to 4 MiB');const data=msCore.blockDict(await file.text());if(token!==revision.dict)return;models.dict={name:file.name,data};status(cgUi('Original dictionary inspected; no mesh generated.','Diccionario original inspeccionado; no se generó malla.'));redraw(true)}catch(e){if(token===revision.dict)status(e.message)}};
 async function loadMesh(slot,input){const token=++revision[slot];models[slot]=null;resetMatch();opts(el(slot==='a'?'msPatchA':'msPatchB'),[]);el('msMode').value=slot;redraw(true);try{
  const files=[...input.files],required=['points','faces','owner','neighbour','boundary'],groups=new Map();for(const file of files){const path=file.webkitRelativePath.split('/'),name=path.pop(),dir=path.join('/');if(required.includes(name)&&path.at(-1)==='polyMesh'){const g=groups.get(dir)||{};if(g[name])throw Error('Duplicate mesh file');g[name]=file;groups.set(dir,g)}}
  const complete=[...groups].filter(([,g])=>required.every(n=>g[n]));if(complete.length!==1)throw Error('Select exactly one complete region polyMesh folder (ASCII, uncompressed)');const [dir,g]=complete[0];const sf=files.filter(f=>f.webkitRelativePath.startsWith(dir+'/sets/')&&f.webkitRelativePath.split('/').length===dir.split('/').length+2);if(sf.length>128||[...Object.values(g),...sf].some(f=>f.size>96*1024*1024)||[...Object.values(g),...sf].reduce((n,f)=>n+f.size,0)>160*1024*1024)throw Error('Mesh/set memory limit');
  const texts={};for(const n of required)texts[n]=await g[n].text();const data=msCore.poly(texts),sets=[],errors=[];for(const file of sf){try{sets.push(msCore.readSet(await file.text(),file.name,data))}catch(e){errors.push(file.name+': '+e.message)}}
  if(token!==revision[slot])return;models[slot]={name:dir,data,sets};opts(el(slot==='a'?'msPatchA':'msPatchB'),data.patches.map(p=>[p.name,p.name]));el('msMode').value=slot;status('Loaded '+dir+' · '+sets.length+' sets; source association by same folder and IDs, not run hash. '+errors.join(' | '));redraw(true)
 }catch(e){if(token===revision[slot])status(e.message)}}
 function generatedData(region){if(!genCache.has(region))genCache.set(region,msCore.fromNativeReport(generatedReceipt,region));return genCache.get(region)}
 function showGenerated(region){const r=generatedReceipt;if(!r)throw Error('No generated snapshot');const data=generatedData(region),captured=msCore.generatedSets(r,region,data);models.generated={name:generatedLabel+' · Foundation '+r.version+' · '+(region||'combined'),data,sets:captured.sets,nativeRegion:region||null,nativeMetricsStatus:(region?r.regions[region]:r).nativeMetricsStatus||'not-run',nativeVolume:null,nativeVolumeStatus:(region?r.regions[region]:r).nativeVolumeStatus||'not-run'};try{models.generated.nativeVolume=msCore.generatedVolume(r,region,data)}catch(e){if(models.generated.nativeVolumeStatus==='captured')models.generated.nativeVolumeStatus=e.message}el('msMode').value='generated';panel.open=true;redraw(true);status('Native snapshot · '+(region||'combined')+' · checkMesh exit '+((region?r.regions[region].checkMeshExit:r.checkMeshExit)??'—')+' ('+((region?r.regions[region].qualityStatus:r.qualityStatus)||'undetermined')+') · '+captured.sets.length+' native defect sets · '+(captured.warnings.length?captured.warnings.join(' | '):'absence of sets is not quality certification')+' · A/B retained');panel.scrollIntoView({block:'nearest'})}
 window.FoamLensLoadGeneratedMesh=(r,label)=>{const names=Object.keys(r.regions||{});if(names.length){const sum=names.reduce((n,k)=>n+r.regions[k].expectedCells,0);if(sum!==r.plannedCells)throw Error('Incomplete region cell count coverage');msCore.fromNativeReport(r,names[0])}else msCore.fromNativeReport(r);generatedReceipt=r;generatedLabel=label;genCache.clear();el('msRegionControls').hidden=!names.length;opts(el('msGeneratedRegion'),names.map(k=>[k,k+' ('+r.regions[k].expectedCells+')']));el('msGeneratedInterface').hidden=names.length<2;for(const id of ['msGenA','msGenB'])opts(el(id),names.map(k=>[k,k]));if(names.length>=2){el('msGenB').selectedIndex=1;refreshGenPatches()}else clearGenPair();showGenerated(names[0])};
 function clearGenPair(){generatedPair=null;el('msGenResult').textContent='';el('msGenExport').disabled=true}
 function refreshGenPatches(){clearGenPair();try{for(const side of ['A','B']){const name=el('msGen'+side).value,m=generatedData(name);opts(el('msGenPatch'+side),m.patches.map(p=>[p.name,p.name+' ('+p.count+')']))}}catch(e){el('msGenResult').textContent=e.message}}
 for(const id of ['msGenA','msGenB'])el(id).onchange=refreshGenPatches;
 for(const id of ['msGenPatchA','msGenPatchB'])el(id).onchange=clearGenPair;
 el('msGenCompare').onclick=()=>{clearGenPair();try{const a=el('msGenA').value,b=el('msGenB').value,pa=el('msGenPatchA').value,pb=el('msGenPatchB').value;if(!a||!b||a===b)throw Error('Select distinct generated regions');const x=msCore.patchMatch(generatedData(a),pa,generatedData(b),pb);generatedPair={source:generatedLabel,regionA:a,regionB:b,patchA:pa,patchB:pb,...x};const {pairs,...summary}=generatedPair;el('msGenResult').textContent=JSON.stringify(summary);el('msGenExport').disabled=false}catch(e){el('msGenResult').textContent=e.message}};
 el('msGenExport').onclick=()=>{if(generatedPair)cgDownloadZip('FoamLens-generated-interface.zip',cgStoreZip([{name:'interface.json',data:JSON.stringify(generatedPair,null,2)},{name:'pairs.csv',data:'faceA,faceB,normalCosine\n'+generatedPair.pairs.map(p=>p.join(',')).join('\n')}]))};
 el('msUseRegion').onclick=()=>{try{showGenerated(el('msGeneratedRegion').value)}catch(e){status(e.message)}};
 el('msFolderA').onchange=()=>loadMesh('a',el('msFolderA'));el('msFolderB').onchange=()=>loadMesh('b',el('msFolderB'));
 el('msPatchA').onchange=resetMatch;el('msPatchB').onchange=resetMatch;
 el('msMatch').onclick=()=>{resetMatch();try{if(!models.a||!models.b)throw Error('Load two native region meshes');const a=el('msPatchA').value,b=el('msPatchB').value,x=msCore.patchMatch(models.a.data,a,models.b.data,b);result={sourceA:models.a.name,sourceB:models.b.name,patchA:a,patchB:b,...x};const {pairs,...summary}=result;el('msMatchResult').textContent=JSON.stringify(summary);el('msExport').disabled=false}catch(e){el('msMatchResult').textContent=e.message}};
 el('msExport').onclick=()=>{if(result)cgDownloadZip('FoamLens-interface-inspection.zip',cgStoreZip([{name:'interface.json',data:JSON.stringify(result,null,2)},{name:'pairs.csv',data:'faceA,faceB,normalCosine\n'+result.pairs.map(p=>p.join(',')).join('\n')}]))};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',msMount,{once:true});else msMount();

// Render only the selection belonging to the currently displayed original frame.
// This is a non-occluding annotation, not a geometry clip or new field.
const msFieldPins=new Map();
function msFieldOverlayRemove(view){document.getElementById('xyzFieldOverlay'+view)?.remove()}
function msFieldOverlayRefresh(view){
 if(view==='A'&&typeof fvRender==='function')fvRender();
 else if(view==='B'&&typeof fcRender==='function')fcRender();
 else if(typeof fcExtraViews!=='undefined'&&typeof fcExtraRender==='function'){
  const state=fcExtraViews.find(v=>v.id===view.charCodeAt(0)-64);if(state)fcExtraRender(state)
 }
}
window.FoamLensSpatialOverlayDraw=function(view,state,canvas,mvp,visible){
 const pin=msFieldPins.get(view);if(!pin){msFieldOverlayRemove(view);return}
 try{
  const info=typeof fwCurrent3DProfileField==='function'?fwCurrent3DProfileField(view):null;
  if(!msCore.overlayMatches(pin,info,state,visible)||!canvas?.isConnected){msFieldOverlayRemove(view);return}
  const viewport=canvas.closest('.fvViewport')||canvas.parentElement,cr=canvas.getBoundingClientRect(),vr=viewport?.getBoundingClientRect();
  if(!vr||!cr.width||!cr.height){msFieldOverlayRemove(view);return}
  let overlay=document.getElementById('xyzFieldOverlay'+view);
  if(overlay&&overlay.parentElement!==viewport){overlay.remove();overlay=null}
  if(!overlay){overlay=document.createElementNS('http://www.w3.org/2000/svg','svg');overlay.id='xyzFieldOverlay'+view;overlay.setAttribute('aria-hidden','true');overlay.style.cssText='position:absolute;pointer-events:none;z-index:5;overflow:hidden';viewport.append(overlay)}
  Object.assign(overlay.style,{left:(cr.left-vr.left)+'px',top:(cr.top-vr.top)+'px',width:cr.width+'px',height:cr.height+'px'});
  overlay.setAttribute('viewBox','0 0 '+cr.width+' '+cr.height);
  const points=msCore.overlayProject(pin.points,mvp,cr.width,cr.height);
  const d=points.map(p=>'M'+(p.x-3).toFixed(2)+' '+p.y.toFixed(2)+'h6M'+p.x.toFixed(2)+' '+(p.y-3).toFixed(2)+'v6').join('');
  overlay.innerHTML='<path d="'+d+'" stroke="#fff" stroke-opacity=".85" stroke-width="2.8" fill="none"/><path d="'+d+'" stroke="#eab44d" stroke-width="1.4" fill="none"/><text x="9" y="'+Math.max(15,cr.height-13)+'" fill="#ffdc88" stroke="#141d29" stroke-width="2.8" paint-order="stroke" font-size="11">ROI '+pin.total+' · '+pin.sampled+' sampled · t='+pin.time+' s · X-ray markers</text>';
 }catch(e){msFieldOverlayRemove(view);console.warn('Spatial selection overlay omitted:',e)}
};
function msTableMount(){
 const anchor=document.getElementById('msStudio')||document.getElementById('xyzFallbackAnchor');if(!anchor||document.getElementById('msXYZ'))return;
 const panel=document.createElement('details');panel.id='msXYZ';panel.style.cssText='margin:12px 0;padding:12px;border:1px solid var(--line);border-radius:10px';
 const t=(a,b)=>cgEscape(cgUi(a,b)),side=k=>'<fieldset style="min-width:0;border:1px solid var(--line);border-radius:8px"><legend>'+k+'</legend><div class="cgTools"><input id="xyzFile'+k+'" type="file" accept=".csv"><label>'+t('Case / region / patch','Caso / región / parche')+' <input id="xyzSource'+k+'" placeholder="C3D04 / metal / interface"></label><label>'+t('XYZ unit','Unidad XYZ')+' <select id="xyzCoord'+k+'"><option value="">—</option><option>m</option><option>mm</option><option>cm</option></select></label><label>'+t('Association','Asociación')+' <select id="xyzAssoc'+k+'"><option value="">—</option><option value="pointSet">Point</option><option value="cellSet">Cell</option><option value="faceSet">Face</option></select></label><label>'+t('Field','Variable')+' <input id="xyzField'+k+'" placeholder="q"></label><label>'+t('Value unit','Unidad variable')+' <input id="xyzUnit'+k+'" placeholder="W/m²"></label><label>'+t('Weight unit','Unidad peso')+' <select id="xyzWeight'+k+'"><option value="">—</option><option>m²</option><option>mm²</option><option>cm²</option><option>m³</option><option>mm³</option><option>cm³</option></select></label><label>'+t('Convention','Convención')+' <select id="xyzConv'+k+'"><option value="intensive">Intensive</option><option value="perEntity">Per entity</option></select></label><label>t [s] <input id="xyzTime'+k+'" type="number" step="any" placeholder="CSV time"></label></div><button class="btn soft" id="xyzLoad'+k+'" type="button">'+t('Load table','Cargar tabla')+'</button><p id="xyzLoadStatus'+k+'" class="cgNotice"></p></fieldset>';
 panel.innerHTML='<summary><b>Spatial Data · '+t('XYZ, time history and interface flux','XYZ, historial temporal y flujo de interfaz')+'</b></summary><p class="cgNotice">'+t('Numeric CSV: id,x,y,z,value with optional weight,time. Time in seconds. Empty value/weight means missing. IDs are unique per time; no mesh or weights inferred.','CSV numérico: id,x,y,z,value y opcionales weight,time. Tiempo en segundos. Valor/peso vacío significa dato faltante. IDs únicos por tiempo; no se infiere malla ni pesos.')+'</p>'+'<details open><summary><b>'+t('Read directly from loaded Field A–D','Leer directamente desde Field A–D')+'</b></summary><div class="cgTools"><label>'+t('View','Vista')+' <select id="xyzNativeView"><option>A</option><option>B</option><option>C</option><option>D</option></select></label><label>'+t('Store in','Guardar en')+' <select id="xyzNativeSlot"><option>A</option><option>B</option></select></label><label>'+t('Boundary patch (surface only; blank = internal)','Parche (solo surface; vacío = interno)')+' <input id="xyzNativePatch"></label><label>'+t('Convention','Convención')+' <select id="xyzNativeConvention"><option value="">—</option><option value="intensive">Intensive</option><option value="perEntity">Per entity</option></select></label></div><div class="cgTools"><label>'+t('Read mode','Modo de lectura')+' <select id="xyzNativeMode"><option value="current">Current exact source time</option><option value="range">Observed time range (retain rows)</option><option value="summary">Observed time range (summary only)</option></select></label><label>From [s] <input id="xyzNativeStart" type="number" step="any"></label><label>To [s] <input id="xyzNativeEnd" type="number" step="any"></label><button class="btn primary" id="xyzNativeLoad" type="button">'+t('Read original Field','Leer Field original')+'</button><button class="btn soft" id="xyzNativeCancel" type="button" disabled>'+t('Cancel','Cancelar')+'</button></div><p id="xyzNativeStatus" class="cgNotice"></p><p class="cgNotice">'+t('Uses the original case, field, component and actual observed time. Interpolated display times are rejected. Reconstructed mesh only. Retained rows: 350000 total. Summary mode: up to 350000 entities per frame, applies current filters before discarding rows. Loading does not move the original Field views.','Usa caso, campo, componente y tiempo observado originales. Rechaza tiempos interpolados de pantalla. Solo malla reconstruida. Filas conservadas: 350000 totales. Modo resumen: hasta 350000 entidades por tiempo, aplica los filtros actuales antes de descartar filas. No mueve las vistas Field originales.')+'</p></details>'+side('A')+side('B')+'<div class="cgTools"><label>'+t('Analyze','Analizar')+' <select id="xyzActive"><option>A</option><option>B</option></select></label><label>'+t('Physical time','Tiempo físico')+' <select id="xyzFrame"></select></label><label>'+t('Projection','Proyección')+' <select id="xyzProjection"><option>XY</option><option>XZ</option><option>YZ</option></select></label><label>'+t('Locate ID','Localizar ID')+' <input id="xyzId" type="number" min="0" step="1"></label><button class="btn soft" id="xyzLocate" type="button">'+t('Locate','Localizar')+'</button></div><p id="xyzPoint" class="cgNotice"></p><p class="cgNotice">'+t('Same box/cylinder/slab/threshold syntax as Mesh Studio; all coordinates in meters. Applies separately at each observed time.','Mismos filtros box/cylinder/slab/threshold que Mesh Studio; coordenadas en metros. Se aplican por separado en cada tiempo observado.')+'</p><textarea id="xyzFilters" rows="3" style="width:100%;box-sizing:border-box"></textarea><div class="cgTools"><label>'+t('Temporal metric','Métrica temporal')+' <select id="xyzMetric"><option value="integral">Integral / sum</option><option value="weightedMean">Weighted mean</option><option value="mean">Sample mean</option></select></label><label>'+t('Maximum time gap [s]','Brecha máxima [s]')+' <input id="xyzGap" type="number" min="0" step="any"></label><button class="btn primary" id="xyzApply" type="button">'+t('Apply and calculate','Aplicar y calcular')+'</button><button class="btn soft" id="xyzExport" disabled type="button">ZIP</button><button class="btn soft" id="xyzPin" disabled type="button">'+t('Show ROI on Field view','Mostrar ROI en vista Field')+'</button><button class="btn soft" id="xyzUnpin" type="button">'+t('Clear Field markers','Quitar marcas Field')+'</button></div><p id="xyzStatus" class="cgNotice"></p><div id="xyzView"></div><div id="xyzChart"></div><div id="xyzHistory"></div><details><summary><b>'+t('Two-sided interface flux','Flujo de interfaz de dos lados')+'</b></summary><p class="cgNotice">'+t('Both tables must refer to interface faces in a common coordinate frame. Sign multiplies source value to obtain outward flux. Exact centroid coordinates only; duplicate or unmatched coordinates and unequal areas are excluded.','Ambas tablas deben corresponder a caras de interfaz en el mismo sistema de coordenadas. El signo multiplica el valor para obtener flujo saliente. Solo centroides XYZ exactos; se excluyen duplicados, no emparejados y áreas desiguales.')+'</p><div class="cgTools"><label>t [s] <select id="xyzCommon"></select></label><label>A <select id="xyzSignA"><option value="">—</option><option value="1">+ source → outward</option><option value="-1">− source → outward</option></select></label><label>B <select id="xyzSignB"><option value="">—</option><option value="1">+ source → outward</option><option value="-1">− source → outward</option></select></label><label>'+t('Relative area tolerance','Tolerancia relativa de área')+' <input id="xyzTolerance" type="number" min="0" max=".1" step="any" value="0.000001"></label><button class="btn soft" id="xyzPair" type="button">'+t('Compare flux','Comparar flujo')+'</button><button class="btn soft" id="xyzPairExport" disabled type="button">ZIP</button></div><p id="xyzPairStatus" class="cgNotice"></p></details>';
 anchor.insertAdjacentElement('afterend',panel);
 const el=id=>panel.querySelector('#'+id),tables={A:null,B:null},rev={A:0,B:0};let analysis=null,analysisTable=null,pair=null,pointId=null,nativeToken=0,nativeBusy=false;
 const options=(e,items)=>{e.replaceChildren();for(const v of items){const o=document.createElement('option');o.value=String(v);o.textContent=String(v);e.append(o)}};
 const clearPair=()=>{pair=null;el('xyzPairExport').disabled=true;el('xyzPairStatus').textContent=''};
 const clear=()=>{analysis=null;analysisTable=null;pointId=null;el('xyzPin').disabled=true;el('xyzExport').disabled=true;for(const id of ['xyzStatus','xyzPoint','xyzView','xyzChart','xyzHistory'])el(id).textContent=''};
 const refresh=()=>{const a=tables.A,b=tables.B;options(el('xyzCommon'),a&&b?[...a.groups.keys()].filter(x=>b.groups.has(x)).sort((x,y)=>x-y):[]);const active=tables[el('xyzActive').value];options(el('xyzFrame'),active?[...active.groups.keys()].sort((x,y)=>x-y):[])};
 for(const k of ['A','B']){
  for(const id of ['File','Source','Coord','Assoc','Field','Unit','Weight','Conv','Time'])el('xyz'+id+k).addEventListener(['File','Coord','Assoc','Weight','Conv'].includes(id)?'change':'input',()=>{rev[k]++;tables[k]=null;clear();clearPair();refresh();el('xyzLoadStatus'+k).textContent='Source settings changed; reload.'});
  el('xyzLoad'+k).onclick=async()=>{const token=++rev[k];tables[k]=null;clear();clearPair();refresh();try{
   const file=el('xyzFile'+k).files[0];if(!file||file.size>48*1024*1024)throw Error('Choose CSV <=48 MiB');
   const raw=await file.arrayBuffer(),digest=await msSha256(raw),v=id=>el('xyz'+id+k).value;
   const table=msCore.xyzTable(new TextDecoder().decode(raw),{source:v('Source'),coordinateUnit:v('Coord'),association:v('Assoc'),field:v('Field'),unit:v('Unit'),weightUnit:v('Weight'),convention:v('Conv'),time:v('Time')===''?null:Number(v('Time')),file:file.name,fingerprint:digest});
   if(token!==rev[k])return;tables[k]=table;el('xyzLoadStatus'+k).textContent=[table.groups.size+' times',[...table.groups.values()].reduce((n,r)=>n+r.length,0)+' rows','SI positions / explicit weights; no topology'].join(' · ');refresh();
  }catch(e){if(token===rev[k])el('xyzLoadStatus'+k).textContent=e.message}};
 }
 function cancelNative(){nativeToken++;nativeBusy=false;el('xyzNativeLoad').disabled=false;el('xyzNativeCancel').disabled=true}
 el('xyzNativeCancel').onclick=()=>{cancelNative();el('xyzNativeStatus').textContent='Canceled; existing tables retained.'};
 for(const id of ['xyzNativeView','xyzNativeSlot','xyzNativePatch','xyzNativeConvention','xyzNativeMode','xyzNativeStart','xyzNativeEnd'])el(id).addEventListener('change',()=>{if(nativeBusy)el('xyzNativeCancel').click()});
 el('xyzNativeLoad').onclick=async()=>{if(nativeBusy)return;const token=++nativeToken,slot=el('xyzNativeSlot').value,slotRev=rev[slot],view=el('xyzNativeView').value;nativeBusy=true;el('xyzNativeLoad').disabled=true;el('xyzNativeCancel').disabled=false;
  try{
   if(typeof fwCurrent3DProfileField!=='function'||typeof fvLoadFrameData!=='function')throw Error('Original Field workspace unavailable');
   const info=fwCurrent3DProfileField(view),convention=el('xyzNativeConvention').value,scope=el('xyzNativePatch').value.trim()||'internal';
   if(!info||!['intensive','perEntity'].includes(convention))throw Error('Load a valid Field view and explicitly choose convention');
   const groups=fvFieldGroups(info.caseObj,info.region,null,info.storage).filter(g=>g.name===info.name);
   if(groups.length!==1)throw Error('Original field/association ambiguous or unavailable');
   const summaryOnly=el('xyzNativeMode').value==='summary',filters=msCore.parseSpatialPipeline(el('xyzFilters').value),filterKey=JSON.stringify(filters);
   const g=groups[0],observed=[...new Set(g.times.map(fvRegionPhysicalTime).filter(Number.isFinite))].sort((a,b)=>a-b);
   let times;if(el('xyzNativeMode').value==='current'){if(!observed.includes(info.time))throw Error('Displayed time is not an exact original source time');times=[info.time]}else{
    const lo=el('xyzNativeStart').value,hi=el('xyzNativeEnd').value;if(lo===''||hi===''||!Number.isFinite(Number(lo))||!Number.isFinite(Number(hi))||Number(lo)>Number(hi))throw Error('Enter valid observed time range');times=observed.filter(t=>t>=Number(lo)&&t<=Number(hi));
   }
   if(!times.length||times.length>2000)throw Error('No observed times or too many time samples');
   const frames=[],samples=[],sourceFrames=[],frameMeshes=new Map();let total=0,previousMesh=null,topology=null,dimensions=null,unit=null,association=null,weightUnit=null;
   for(const time of times){
    if(token!==nativeToken||rev[slot]!==slotRev)return;
    el('xyzNativeStatus').textContent='Reading original '+view+' · '+info.name+' · t='+time+' s · '+((summaryOnly?samples.length:frames.length)+1)+'/'+times.length;
    const frame=await fvLoadFrameData(info.caseObj,g,info.region,time,info.component,{includeBoundary:scope!=='internal'});
    if(token!==nativeToken||rev[slot]!==slotRev)return;
    const dims=frame.parsed?.dimensions;if(!dims)throw Error('Native field dimensions unavailable');const d=JSON.stringify(dims),u=typeof pmUnitFromDimensions==='function'?pmUnitFromDimensions(dims):null;if(!u||u==='-')throw Error('Native field units unavailable');
    if(dimensions!==null&&(d!==dimensions||u!==unit))throw Error('Native field dimensions changed between times');dimensions=d;unit=u;
    if(previousMesh!==frame.mesh){topology=msCore.fieldTopology(frame.mesh);previousMesh=frame.mesh}
    const rows=msCore.fieldRows(frame,scope,topology);total+=rows.eligible;
    if(association!==null&&rows.kind!==association)throw Error('Native association changed');association=rows.kind;weightUnit=rows.weightUnit;
    const sourceFrame={time,eligible:rows.eligible,invalidGeometry:rows.invalid.length,meshKey:frame.meshInfo?.key||null};
    if(summaryOnly){
     const local=msCore.nativeTable({association,convention,unit},[{...rows,time,meshKey:sourceFrame.meshKey}]),sample=msCore.xyzSelect(local,filters)[0];
     const {rows:discard,...summary}=sample;samples.push({...summary,rows:[]});sourceFrames.push(sourceFrame);
    }else{if(total>350000)throw Error('Native range exceeds 350000 retained entities; narrow range or choose summary only');frames.push({...rows,time,meshKey:sourceFrame.meshKey});frameMeshes.set(time,frame.mesh)}
    await new Promise(r=>setTimeout(r,0));
   }
   if(token!==nativeToken||rev[slot]!==slotRev)return;
   const latest=fwCurrent3DProfileField(view);if(!latest||String(latest.caseObj.id)!==String(info.caseObj.id)||latest.region!==info.region||latest.name!==info.name||latest.storage!==info.storage||latest.component!==info.component)throw Error('Field source changed during read; retry');
   const meta={source:[info.caseObj.name,info.region||'default',scope].join(' / '),caseId:String(info.caseObj.id),region:info.region,view,association,field:info.name+(info.component==='value'?'':' · '+info.component),unit,dimensions:JSON.parse(dimensions),convention,scope,sourceType:'original OpenFOAM field + matching polyMesh',observedTimes:times};
   const table=summaryOnly?{meta:{...meta,coordinateUnit:'m',weightUnit,sourceFrames,sourceBindingVerified:true,summaryOnly:true,geometryMethod:'FoamLens triangulated geometry',filterKey},summaryOnly:true,filterKey,samples,groups:new Map(times.map(t=>[t,[]])),hasWeight:association!=='pointSet',measureUnit:weightUnit||'count'}:msCore.nativeTable(meta,frames);
   if(!summaryOnly)table.overlaySource={caseObj:info.caseObj,view,region:info.region,name:info.name,component:info.component,storage:info.storage,frameMeshes};rev[slot]++;tables[slot]=table;clear();clearPair();el('xyzActive').value=slot;refresh();el('xyzLoadStatus'+slot).textContent=table.meta.source+' · '+table.meta.field+' ['+unit+'] · '+times.length+' observed time(s) · '+total+ ' eligible entities · '+(summaryOnly?'summary only; rows discarded':'native snapshot');el('xyzNativeStatus').textContent='Original source loaded into '+slot+'; choose filters and Apply.';
  }catch(e){if(token===nativeToken)el('xyzNativeStatus').textContent=e.message}finally{if(token===nativeToken){nativeBusy=false;el('xyzNativeLoad').disabled=false;el('xyzNativeCancel').disabled=true}}
 };
 const fmt=x=>x===null||x===undefined?'—':typeof x==='number'?Number(x.toPrecision(7)).toString():String(x);
 function drawHistory(){
  const a=analysis;if(!a)return;const key=a.summary.key,valid=r=>(key==='mean'?r.sampleComplete:r.complete)&&Number.isFinite(r[key]),points=a.samples.filter(valid),host=el('xyzChart');host.textContent='';
  if(!points.length){host.textContent='No complete temporal samples for selected metric';return}
  const loT=a.samples[0].time,hiT=a.samples.at(-1).time,min=Math.min(...points.map(r=>r[key])),max=Math.max(...points.map(r=>r[key])),x=t=>55+550*(hiT===loT?.5:(t-loT)/(hiT-loT)),y=v=>30+190*(max===min?.5:(max-v)/(max-min));
  const lines=[],dots=[];for(let i=0;i<a.samples.length;i++){const r=a.samples[i],p=a.samples[i-1];if(valid(r)){dots.push('<circle cx="'+x(r.time)+'" cy="'+y(r[key])+'" r="2.7" fill="#80d6e8"/>');if(p&&valid(p)&&r.time-p.time<=a.summary.maxGap_s)lines.push('<line x1="'+x(p.time)+'" y1="'+y(p[key])+'" x2="'+x(r.time)+'" y2="'+y(r[key])+'" stroke="#80d6e8" stroke-width="1.5"/>')}else if(Number.isFinite(r[key]))dots.push('<circle cx="'+x(r.time)+'" cy="231" r="3" fill="#d9ab5d"/>')}
  host.innerHTML='<svg viewBox="0 0 640 275" style="width:100%;max-height:320px;background:#101b2c;border-radius:8px" aria-label="Observed physical time history"><path d="M55 30V220H605" stroke="#90a5b7" fill="none"/><g fill="#dce8f3" font-size="11"><text x="55" y="18">'+cgEscape(key+' ['+a.summary.metricUnit+']')+'</text><text x="50" y="34" text-anchor="end">'+fmt(max)+'</text><text x="50" y="220" text-anchor="end">'+fmt(min)+'</text><text x="55" y="250">'+fmt(loT)+'</text><text x="605" y="250" text-anchor="end">'+fmt(hiT)+'</text><text x="330" y="267" text-anchor="middle">t [s]</text></g>'+lines.join('')+dots.join('')+'</svg><p class="cgNotice">Complete observed samples; gaps are not connected. Amber markers below axis denote incomplete samples, not zero values.</p>';
 }
 function draw(){
  const frame=analysis?.samples.find(x=>x.time===Number(el('xyzFrame').value));el('xyzView').textContent='';if(analysis?.meta.summaryOnly){el('xyzView').textContent='Summary-only history: individual rows were not retained. Re-read a single source time to inspect entities.';return}if(!frame||!frame.rows.length)return;
  const keys=el('xyzProjection').value.toLowerCase().split(''),rows=frame.rows,lo=[Infinity,Infinity],hi=[-Infinity,-Infinity];let min=Infinity,max=-Infinity;
  for(const r of rows){for(let i=0;i<2;i++){lo[i]=Math.min(lo[i],r[keys[i]]);hi[i]=Math.max(hi[i],r[keys[i]])}if(r.value!==null){min=Math.min(min,r.value);max=Math.max(max,r.value)}}
  const scale=Math.min(560/(hi[0]-lo[0]||1),280/(hi[1]-lo[1]||1)),px=r=>320+(r[keys[0]]-(lo[0]+hi[0])/2)*scale,py=r=>160-(r[keys[1]]-(lo[1]+hi[1])/2)*scale,stride=Math.max(1,Math.ceil(rows.length/4000));
  const marks=[];for(let i=0;i<rows.length;i+=stride){const r=rows[i],fraction=max>min?(r.value-min)/(max-min):.5,color=r.value===null?'#8893a1':'hsl('+(240*(1-fraction))+',75%,60%)';marks.push('<circle cx="'+px(r)+'" cy="'+py(r)+'" r="2.5" fill="'+color+'"/>')}
  const chosen=rows.find(r=>r.id===pointId);if(chosen)marks.push('<circle cx="'+px(chosen)+'" cy="'+py(chosen)+'" r="7" fill="none" stroke="#fff" stroke-width="2"/>');
  el('xyzView').innerHTML='<svg viewBox="0 0 640 340" style="width:100%;max-height:400px;background:#101b2c;border-radius:8px" aria-label="XYZ point projection">'+marks.join('')+'<text x="320" y="330" text-anchor="middle" fill="#dce8f3">'+keys.join('').toUpperCase()+' [m]</text></svg><p class="cgNotice">Blue → red: '+fmt(Number.isFinite(min)?min:null)+' → '+fmt(Number.isFinite(max)?max:null)+' · grey = missing · '+Math.ceil(rows.length/stride)+' sampled of '+rows.length+' selected; no connectivity</p>';
 }
 el('xyzActive').onchange=()=>{clear();refresh()};el('xyzFrame').onchange=()=>{pointId=null;el('xyzPoint').textContent='';draw()};el('xyzProjection').onchange=draw;
 el('xyzLocate').onclick=()=>{const frame=analysis?.samples.find(x=>x.time===Number(el('xyzFrame').value)),id=Number(el('xyzId').value),r=frame?.rows.find(x=>x.id===id);pointId=r&&el('xyzId').value!==''?id:null;el('xyzPoint').textContent=pointId===null?'ID not in current selection':JSON.stringify(r);draw()};
 for(const id of ['xyzFilters','xyzMetric','xyzGap'])el(id).addEventListener(id==='xyzMetric'?'change':'input',clear);
 el('xyzApply').onclick=()=>{clear();try{const table=tables[el('xyzActive').value];if(!table)throw Error('Load active table');const pipeline=el('xyzFilters').value,filters=msCore.parseSpatialPipeline(pipeline),samples=msCore.xyzSelect(table,filters),metric=el('xyzMetric').value,gap=el('xyzGap').value===''&&samples.length===1?1:Number(el('xyzGap').value),summary=msCore.timeSummary(samples,metric,gap);analysis={meta:table.meta,pipeline,samples,summary};analysisTable=table;el('xyzExport').disabled=false;el('xyzPin').disabled=!table.overlaySource;
  const metricUnit=metric==='integral'&&table.meta.convention==='intensive'?table.meta.unit+'·'+table.measureUnit:table.meta.unit;analysis.summary.metricUnit=metricUnit;analysis.summary.timeIntegralUnit=metricUnit+'·s';el('xyzStatus').textContent='Metric ['+metricUnit+'] · observed samples '+summary.samples+' · complete covered intervals '+summary.intervals+' · skipped '+summary.skipped+' · covered '+fmt(summary.covered_s)+' s · time-weighted mean '+fmt(summary.timeWeightedMean)+' · time integral '+fmt(summary.timeIntegral)+' ['+metricUnit+'·s] · complete sample mean '+fmt(summary.sampleMean)+' · no interpolation across gaps';
  const tab=document.createElement('table');for(const row of [['t [s]','Selected','Valid','Weight','Integral','Weighted mean','Complete'],...samples.slice(0,200).map(r=>[r.time,r.selected,r.valid,r.knownWeight,r.integral,r.weightedMean,r.complete])]){const tr=tab.insertRow();for(const v of row)tr.insertCell().textContent=fmt(v)}el('xyzHistory').append(tab);if(samples.length>200)el('xyzHistory').append('Showing first 200 times; export includes all.');drawHistory();draw()
 }catch(e){el('xyzStatus').textContent=e.message}};
 el('xyzUnpin').onclick=()=>{for(const view of [...msFieldPins.keys()]){msFieldPins.delete(view);msFieldOverlayRemove(view);msFieldOverlayRefresh(view)}el('xyzPoint').textContent='Field selection markers cleared.'};
 el('xyzPin').onclick=()=>{try{
  const src=analysisTable?.overlaySource,frame=analysis?.samples.find(x=>x.time===Number(el('xyzFrame').value));
  if(!src||!frame||!frame.rows.length)throw Error('Read retained original Field rows and apply a nonempty selection');
  const {frameMeshes,...identity}=src,pin={...identity,mesh:frameMeshes.get(frame.time),time:frame.time,...msCore.overlayPoints(frame.rows)};
  const state=src.view==='A'?fvState:src.view==='B'?fcState:fcExtraViews.find(v=>v.id===src.view.charCodeAt(0)-64);
  const info=fwCurrent3DProfileField(src.view);if(!msCore.overlayMatches(pin,info,state,true))throw Error('Display the exact original source time and mesh in Field '+src.view+' before showing markers');
  msFieldPins.set(src.view,pin);msFieldOverlayRefresh(src.view);el('xyzPoint').textContent='Pinned ROI to Field '+src.view+' · '+pin.sampled+'/'+pin.total+' centroid markers · hidden when original frame changes. X-ray annotation, not a clip.';
  document.getElementById('xyzFieldDialog')?.close()
 }catch(e){el('xyzPoint').textContent=e.message}};
 el('xyzExport').onclick=()=>{if(!analysis)return;try{const {samples,...meta}=analysis,cols=['time','eligible','invalidGeometry','selected','valid','weightCount','knownWeight','validWeight','coverage','weightCoverage','mean','weightedMean','integral','min','max','sampleComplete','complete'],history=cols.join(',')+'\n'+samples.map(r=>cols.map(c=>r[c]??'').join(',')).join('\n'),selection='time,id,x_m,y_m,z_m,weight,value\n'+samples.flatMap(s=>s.rows.map(r=>[s.time,r.id,r.x,r.y,r.z,r.weight??'',r.value??''].join(','))).join('\n');cgDownloadZip('FoamLens-spatial-time.zip',cgStoreZip([{name:'history.csv',data:history},...(meta.meta.summaryOnly?[]:[{name:'selection.csv',data:selection}]),{name:'provenance.json',data:JSON.stringify({...meta,stages:samples.map(({time,stages,missingThreshold})=>({time,stages,missingThreshold}))},null,2)}]))}catch(e){el('xyzStatus').textContent=e.message}};
 for(const id of ['xyzCommon','xyzSignA','xyzSignB','xyzTolerance'])el(id).addEventListener(id==='xyzTolerance'?'input':'change',clearPair);
 el('xyzPair').onclick=()=>{clearPair();try{if(!tables.A||!tables.B||el('xyzCommon').value===''||el('xyzSignA').value===''||el('xyzSignB').value==='')throw Error('Load both face tables and choose common time and signs');const r=msCore.xyzFluxPair(tables.A,tables.B,Number(el('xyzCommon').value),Number(el('xyzSignA').value),Number(el('xyzSignB').value),Number(el('xyzTolerance').value));pair={A:tables.A.meta,B:tables.B.meta,...r};el('xyzPairExport').disabled=false;el('xyzPairStatus').textContent='Matched '+r.matched+' · unmatched A/B '+r.unmatchedA+'/'+r.unmatchedB+' · duplicates '+r.duplicatesA+'/'+r.duplicatesB+' · missing '+r.missing+' · area mismatches '+r.areaMismatch+' · area coverage A/B '+fmt(r.areaCoverageA===null?null:100*r.areaCoverageA)+'% / '+fmt(r.areaCoverageB===null?null:100*r.areaCoverageB)+'% · outward A/B '+fmt(r.outwardA)+' / '+fmt(r.outwardB)+' '+r.unit+' · residual '+fmt(r.residual)+' · sum of absolute pair residuals '+fmt(r.absolutePairResidual)+' · centroid match only, not conformality certification'}catch(e){el('xyzPairStatus').textContent=e.message}};
 el('xyzPairExport').onclick=()=>{if(!pair)return;try{const {pairs,...meta}=pair,cols=['idA','idB','x','y','z','areaA','areaB','outwardA','outwardB','residual'];cgDownloadZip('FoamLens-interface-flux.zip',cgStoreZip([{name:'pairs.csv',data:cols.join(',')+'\n'+pairs.map(r=>cols.map(c=>r[c]).join(',')).join('\n')},{name:'provenance.json',data:JSON.stringify(meta,null,2)}]))}catch(e){el('xyzPairStatus').textContent=e.message}};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',msTableMount,{once:true});else msTableMount();
window.FoamLensSpatialDataOpen=function(view='A'){
 if(!document.getElementById('msXYZ')){
  let fallback=document.getElementById('xyzFallbackAnchor');if(!fallback){fallback=document.createElement('span');fallback.id='xyzFallbackAnchor';fallback.hidden=true;document.body.append(fallback)}msTableMount();
 }
 const panel=document.getElementById('msXYZ');if(!panel)throw Error('Spatial Data unavailable');
 let dialog=document.getElementById('xyzFieldDialog');
 if(dialog?.open){panel.querySelector('#xyzNativeView').value=['A','B','C','D'].includes(view)?view:'A';return}
 const origin=document.createComment('Spatial Data original location');panel.before(origin);
 dialog=document.createElement('dialog');dialog.id='xyzFieldDialog';dialog.style.cssText='width:min(1050px,94vw);max-height:90vh;overflow:auto;box-sizing:border-box;background:var(--panel,#182331);color:var(--text,#e6edf4);border:1px solid var(--line,#536575);border-radius:12px;padding:12px';
 const bar=document.createElement('div');bar.className='cgTools';const close=document.createElement('button');close.type='button';close.className='btn soft';close.textContent=cgUi('Close Spatial Data','Cerrar Spatial Data');close.onclick=()=>dialog.close();bar.append(close);dialog.append(bar,panel);document.body.append(dialog);panel.open=true;panel.querySelector('#xyzNativeView').value=['A','B','C','D'].includes(view)?view:'A';
 dialog.addEventListener('close',()=>{origin.replaceWith(panel);dialog.remove()},{once:true});dialog.showModal();
};


window.FoamLensMeshStudio=msCore;


/* FOAMLENS_GMSH_INSPECTOR_CORE_START */
const mgCore=(()=>{
 const fail=m=>{throw Error(m)},integer=s=>{if(!/^\d+$/.test(s)||!Number.isSafeInteger(Number(s)))fail('Invalid integer');return Number(s)},number=s=>{if(!/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?$/.test(s)||!Number.isFinite(Number(s)))fail('Invalid coordinate');return Number(s)},tok=s=>s.trim().split(/\s+/),groupKey=(d,t)=>d+':'+t;
 const types={1:[1,2,'line'],2:[2,3,'TRI3'],3:[2,4,'QUAD4'],4:[3,4,'TET4'],5:[3,8,'HEX8'],6:[3,6,'PRISM6'],7:[3,5,'PYRAMID5'],15:[0,1,'point']};
 function parse(source,unit){
  const scales={m:1,mm:.001,cm:.01};if(!Object.hasOwn(scales,unit))fail('Confirm source units');const scale=scales[unit];
  if(typeof source!=='string'||source.length>96*1024*1024||source.includes('\0'))fail('Unsupported binary/oversized Gmsh file');
  const lines=source.split(/\r?\n/),sections=new Map();for(let i=0;i<lines.length;){const line=lines[i++].trim();if(!line)continue;if(!/^\$[A-Za-z][A-Za-z0-9]*$/.test(line)||line.startsWith('$End')||sections.has(line))fail('Invalid or duplicate section');const start=i;while(i<lines.length&&lines[i].trim()!=='$End'+line.slice(1))i++;if(i===lines.length)fail('Unclosed '+line);sections.set(line,[start,i]);i++}
  const fmt=sections.get('$MeshFormat');const version=fmt&&fmt[1]-fmt[0]===1?lines[fmt[0]].trim():'';if(!['2.2 0 8','4.1 0 8'].includes(version))fail('Only Gmsh MSH 2.2 / 4.1 ASCII (8-byte real) supported');if(sections.has('$PartitionedEntities')||sections.has('$GhostElements'))fail('Partitioned/ghost mesh not supported');
  function records(section,optional=false){const s=sections.get(section);if(!s){if(optional)return [];fail('Missing '+section)}const n=integer(lines[s[0]].trim());if(n!==s[1]-s[0]-1||n>5000000)fail('Invalid count in '+section);return lines.slice(s[0]+1,s[1])}
  const groups=new Map();for(const l of records('$PhysicalNames',true)){const p=/^\s*([0-3])\s+(\d+)\s+"([^"]+)"\s*$/.exec(l);if(!p)fail('Invalid physical name');const d=integer(p[1]),tag=integer(p[2]),k=groupKey(d,tag);if(!tag||groups.has(k))fail('Invalid/duplicate physical group');groups.set(k,{dim:d,tag,name:p[3],count:0,types:{}})}

  function group(dim,tag){const k=groupKey(dim,tag);if(!groups.has(k))groups.set(k,{dim,tag,name:tag?'unnamed '+tag:'unassigned',count:0,types:{}});return k}
  function read41(){
   const stream=name=>{const r=sections.get(name);if(!r)fail('Missing '+name);let li=r[0],words=[],j=0;const next=()=>{while(j>=words.length){if(li>=r[1])fail('Unexpected end of '+name);words=tok(lines[li++]);j=0;if(words.length===1&&!words[0])words=[]}return words[j++]};return {next,n:()=>integer(next()),real:()=>number(next()),end:()=>{if(j<words.length||lines.slice(li,r[1]).some(x=>x.trim()))fail('Trailing data in '+name)}}};
   const cap=n=>{if(n>5000000)fail('Record limit');return n},positive=n=>{if(!n)fail('Zero tag');return n};
   const entities=new Map();
   if(sections.has('$Entities')){
    const e=stream('$Entities'),counts=Array.from({length:4},()=>cap(e.n()));
    for(let dim=0;dim<4;dim++)for(let i=0;i<counts[dim];i++){
     const tag=positive(e.n()),k=groupKey(dim,tag);if(entities.has(k))fail('Duplicate entity');
     const bounds=Array.from({length:dim===0?3:6},()=>e.real());if(dim&&bounds.slice(0,3).some((v,j)=>v>bounds[j+3]))fail('Invalid entity bounds');
     const physical=Array.from({length:cap(e.n())},()=>positive(e.n()));if(new Set(physical).size!==physical.length)fail('Duplicate physical tag');
     const boundary=dim?Array.from({length:cap(e.n())},()=>{const x=e.next();if(!/^-?\d+$/.test(x)||!Number.isSafeInteger(Number(x))||!Number(x))fail('Invalid oriented boundary tag');return Number(x)}):[];
     entities.set(k,{dim,tag,physical,bounds,boundary});for(const p of physical)group(dim,p);
    }e.end();
   }
   const validateEntity=(dim,tag)=>{if(dim>3||!tag||entities.size&&!entities.has(groupKey(dim,tag)))fail('Unknown entity '+dim+':'+tag)};
   const points=new Map(),elements=new Map(),nodeEntities=new Map(),parametricNodes=new Map();
   function header(r){const blocks=cap(r.n()),total=cap(r.n()),min=r.n(),max=r.n();if(!blocks||!total||!min||max<min||blocks>total)fail('Invalid block header');return {blocks,total,min,max}}
   function finish(r,h,map){r.end();let min=Infinity,max=0;for(const k of map.keys()){min=Math.min(min,k);max=Math.max(max,k)}if(map.size!==h.total||min!==h.min||max!==h.max)fail('Tag range/count mismatch')}
   const n=stream('$Nodes'),nh=header(n),nodeBlocks=new Set();
   for(let i=0;i<nh.blocks;i++){
    const dim=n.n(),tag=n.n(),param=n.n(),count=cap(n.n()),k=groupKey(dim,tag);validateEntity(dim,tag);if(param>1||!count||nodeBlocks.has(k)||count>nh.total-points.size)fail('Invalid node block');nodeBlocks.add(k);
    const tags=Array.from({length:count},()=>positive(n.n()));
    for(const id of tags){if(points.has(id))fail('Duplicate node tag');const p=Array.from({length:3},()=>n.real()*scale);if(p.some(x=>!Number.isFinite(x)))fail('Coordinate overflow');points.set(id,p);nodeEntities.set(id,k);if(param)parametricNodes.set(id,Array.from({length:dim},()=>n.real()))}
   }finish(n,nh,points);
   const el=stream('$Elements'),eh=header(el),elementBlocks=new Set();
   for(let i=0;i<eh.blocks;i++){
    const dim=el.n(),entity=el.n(),type=el.n(),count=cap(el.n()),k=groupKey(dim,entity),info=types[type];validateEntity(dim,entity);if(!info||info[0]!==dim)fail('Unsupported or mismatched element type '+type);const block=k+':'+type;if(!count||elementBlocks.has(block)||count>eh.total-elements.size)fail('Invalid element block');elementBlocks.add(block);
    const physicalTags=entities.get(k)?.physical||[],groupKeys=physicalTags.length?physicalTags.map(p=>group(dim,p)):[group(dim,0)];
    for(let j=0;j<count;j++){const id=positive(el.n());if(elements.has(id))fail('Duplicate element tag');const nodes=Array.from({length:info[1]},()=>positive(el.n()));if(new Set(nodes).size!==nodes.length||nodes.some(x=>!points.has(x)))fail('Invalid element connectivity');
     for(const gk of groupKeys){const g=groups.get(gk);g.count++;g.types[info[2]]=(g.types[info[2]]||0)+1}
     elements.set(id,{id,type,label:info[2],dim,entity,nodes,physicalTags:physicalTags.slice(),groups:groupKeys.slice(),physical:physicalTags.length===1?physicalTags[0]:null,group:groupKeys.length===1?groupKeys[0]:null});
    }
   }finish(el,eh,elements);
   return {points,elements,groups,entities,nodeEntities,parametricNodes,unit,scale,version:'4.1',meshVerified:false};
  }
  if(version==='4.1 0 8')return read41();
  const points=new Map();for(const l of records('$Nodes')){const t=tok(l);if(t.length!==4)fail('Invalid node');const id=integer(t[0]);if(!id||points.has(id))fail('Duplicate/zero node ID');const p=t.slice(1).map(x=>number(x)*scale);if(p.some(x=>!Number.isFinite(x)))fail('Coordinate overflow');points.set(id,p)}
  const elements=new Map();for(const l of records('$Elements')){const t=tok(l),eid=integer(t[0]),type=integer(t[1]),n=integer(t[2]),info=types[type];if(!info)fail('Unsupported element type '+type+'; not silently omitted');const [dim,count,label]=info;if(!eid||elements.has(eid)||t.length!==3+n+count)fail('Invalid element');const tags=t.slice(3,3+n).map(integer),nodes=t.slice(3+n).map(integer);if(new Set(nodes).size!==count||nodes.some(x=>!points.has(x)))fail('Invalid element connectivity');const physical=tags[0]||0,k=groupKey(dim,physical);if(!groups.has(k))groups.set(k,{dim,tag:physical,name:physical?'unnamed '+physical:'unassigned',count:0,types:{}});const g=groups.get(k);g.count++;g.types[label]=(g.types[label]||0)+1;elements.set(eid,{id:eid,type,label,dim,physical,entity:tags[1]??null,nodes,group:k})}
  if(!points.size||!elements.size)fail('Empty mesh');return {points,elements,groups,unit,scale,version:'2.2',meshVerified:false};
 }
 function contact(m,surface,groupA,groupB){
  if(m.groups.get(surface)?.dim!==2||m.groups.get(groupA)?.dim!==3||m.groups.get(groupB)?.dim!==3||groupA===groupB)fail('Select surface and two distinct volume groups');
  const key=a=>a.slice().sort((x,y)=>x-y).join(','),faces=new Map(),inGroup=(e,g)=>e.groups?e.groups.includes(g):e.group===g;
  for(const e of m.elements.values())if(inGroup(e,surface)){if(e.type!==3)fail('Contact comparison requires QUAD4');const k=key(e.nodes);if(faces.has(k))fail('Duplicate interface element');faces.set(k,{surface:e.id,a:[],b:[]})}
  if(!faces.size)fail('No contact faces');
  const sides=[[0,4,7,3],[1,2,6,5],[0,1,5,4],[3,7,6,2],[0,3,2,1],[4,5,6,7]];
  for(const e of m.elements.values())if(inGroup(e,groupA)||inGroup(e,groupB)){if(inGroup(e,groupA)&&inGroup(e,groupB))fail('Overlapping volume groups; distinct material membership required');if(e.type!==5)fail('Volume group must be HEX8');for(const s of sides){const f=faces.get(key(s.map(i=>e.nodes[i])));if(f)f[inGroup(e,groupA)?'a':'b'].push(e.id)}}
  const rows=[...faces.values()];let totalArea=0,pairedArea=0,invalidArea=0;const geometry=[];
  const sub=(a,b)=>a.map((v,i)=>v-b[i]),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  for(const r of rows){const p=m.elements.get(r.surface).nodes.map(i=>m.points.get(i)),u=cross(sub(p[1],p[0]),sub(p[2],p[0])),v=cross(sub(p[2],p[0]),sub(p[3],p[0])),av=u.map((x,i)=>(x+v[i])*.5),area=Math.hypot(...av),valid=area>0&&Number.isFinite(area),paired=r.a.length===1&&r.b.length===1;const centroid=p[0].map((_,i)=>p.reduce((n,x)=>n+x[i]/4,0));if(valid){totalArea+=area;if(paired)pairedArea+=area}else invalidArea++;geometry.push({surface:r.surface,areaVectorMagnitude_m2:valid?area:null,normal:valid?av.map(x=>x/area):null,vertexMean_m:centroid,paired})}
  if(!Number.isFinite(totalArea)||!Number.isFinite(pairedArea))fail('Area overflow');
  return {surface,groupA,groupB,faces:rows.length,totalAreaVectorMagnitude_m2:totalArea,pairedAreaVectorMagnitude_m2:pairedArea,areaCoverage:totalArea>0?pairedArea/totalArea:null,invalidArea,geometry,paired:rows.filter(r=>r.a.length===1&&r.b.length===1).length,missingA:rows.filter(r=>!r.a.length).length,missingB:rows.filter(r=>!r.b.length).length,ambiguous:rows.filter(r=>r.a.length>1||r.b.length>1).length,rows,method:'Shared original node IDs; QUAD4 triangulated area-vector magnitude and source winding normal; vertex mean is not area centroid; not interface geometry or physics certification',interfaceVerified:false};
 }
 function canonical(m){
  const elems=[...m.elements.values()].filter(e=>e.dim>=2),volumes=elems.filter(e=>e.dim===3).length;
  if(!volumes||volumes>350000||m.points.size>1000000||elems.length>1500000)fail('Native conversion limits: 350000 HEX8 cells, 1000000 nodes, 1500000 elements');
  const groups=new Map(),idOK=x=>Number.isInteger(x)&&x>0&&x<=2147483647;
  for(const e of elems){const gs=e.groups||[e.group];if(gs.length!==1||!m.groups.get(gs[0])?.tag||!idOK(e.id)||!idOK(e.entity)||e.dim===3&&e.type!==5||e.dim===2&&e.type!==3)fail('Conversion requires positive IDs, one physical group per QUAD4/HEX8 and a positive entity ID');groups.set(gs[0],m.groups.get(gs[0]))}
  if(groups.size>10000)fail('Too many physical groups');
  const mapping=[...groups].sort((a,b)=>a[1].dim-b[1].dim||a[1].tag-b[1].tag).map(([key,g],i)=>({key,dimension:g.dim,originalTag:g.tag,originalName:g.name,nativeTag:i+1,nativeName:'fl_'+g.dim+'_'+g.tag}));
  const byKey=new Map(mapping.map(g=>[g.key,g])),lines=['$MeshFormat','2.2 0 8','$EndMeshFormat','$PhysicalNames',String(mapping.length),...mapping.map(g=>g.dimension+' '+g.nativeTag+' "'+g.nativeName+'"'),'$EndPhysicalNames','$Nodes',String(m.points.size)];
  for(const [id,p] of m.points){if(!idOK(id)||p.length!==3||p.some(x=>!Number.isFinite(x)))fail('Invalid canonical node');lines.push(id+' '+p.join(' '))}
  lines.push('$EndNodes','$Elements',String(elems.length));for(const e of elems){const g=byKey.get((e.groups||[e.group])[0]);lines.push([e.id,e.type,2,g.nativeTag,e.entity,...e.nodes].join(' '))}
  lines.push('$EndElements');const msh=lines.join('\n');if(msh.length>32*1024*1024)fail('Canonical MSH exceeds 32 MiB');
  return {msh,mapping,volumes,omittedLowerDimensional:m.elements.size-elems.length,coordinates:'m',sourceVersion:m.version,sourceUnit:m.unit,nativeIdMappingVerified:false};
 }
 return {parse,contact,canonical};
})();
/* FOAMLENS_GMSH_INSPECTOR_CORE_END */
function mgMount(){
 const anchor=document.getElementById('msStudio');if(!anchor||document.getElementById('mgStudio'))return;const panel=document.createElement('details');panel.id='mgStudio';panel.style.cssText='margin:12px 0;padding:12px;border:1px solid var(--line);border-radius:10px';const t=(a,b)=>cgEscape(cgUi(a,b));
 panel.innerHTML='<summary><b>Gmsh · MSH 2.2 / 4.1 ASCII / HEX8</b></summary><p class="cgNotice">'+t('Original node, element and physical group IDs. Explicit coordinate unit. Optional separate native conversion.','IDs originales de nodos, elementos y grupos físicos. Unidad explícita. Conversión nativa opcional por separado.')+'</p><div class="cgTools"><input id="mgFile" type="file" accept=".msh"><label>'+t('Source units','Unidades de origen')+' <select id="mgUnit"><option value="">—</option><option>m</option><option>mm</option><option>cm</option></select></label><button class="btn primary" id="mgLoad" type="button">'+t('Inspect','Inspeccionar')+'</button></div><p id="mgStatus" class="cgNotice" aria-live="polite"></p><div id="mgGroups"></div><div class="cgTools"><label>'+t('Element ID','ID elemento')+' <input id="mgId" type="number" min="1" step="1"></label><button class="btn soft" id="mgLocate" type="button">'+t('Inspect element','Inspeccionar elemento')+'</button></div><p id="mgElement" class="cgNotice"></p><div id="mgView"></div><div class="cgTools"><label>Surface <select id="mgSurface"></select></label><label>Volume A <select id="mgA"></select></label><label>Volume B <select id="mgB"></select></label><button class="btn soft" id="mgMatch" type="button">'+t('Check shared HEX8 contact','Comprobar contacto HEX8 compartido')+'</button><button class="btn soft" id="mgExport" disabled type="button">ZIP</button></div><p id="mgResult" class="cgNotice"></p><div class="cgTools"><label>'+t('Contact selection','Selección de contacto')+' <select id="mgFilter"><option value="all">'+t('All','Todas')+'</option><option value="paired">'+t('Paired','Emparejadas')+'</option><option value="missing">'+t('Missing side','Sin pareja')+'</option><option value="ambiguous">'+t('Ambiguous','Ambiguas')+'</option><option value="invalid">'+t('Invalid area','Área inválida')+'</option></select></label><label>'+t('Projection','Proyección')+' <select id="mgProjection"><option>ISO</option><option>XY</option><option>XZ</option><option>YZ</option></select></label></div><div id="mgContactView"></div><p id="mgContactInfo" class="cgNotice"></p><div class="cgTools"><label>Foundation <select id="mgNativeVersion"><option>14</option><option>13</option></select></label>'+flWslSelectionMarkup('mg',t)+'<button class="btn soft" id="mgProbe" type="button">'+t('Check WSL tools','Comprobar herramientas WSL')+'</button><label><input type="checkbox" id="mgSplit"> splitMeshRegions (cellZones)</label><button class="btn primary" id="mgConvert" disabled type="button">gmshToFoam + checkMesh</button><button class="btn soft" id="mgCancel" disabled type="button">'+t('Cancel','Cancelar')+'</button><button class="btn soft" id="mgInspectNative" disabled type="button">'+t('Inspect native mesh','Inspeccionar malla nativa')+'</button><button class="btn soft" id="mgNativeExport" disabled type="button">'+t('Export conversion ZIP','Exportar conversión ZIP')+'</button></div><p class="cgNotice">'+t('Only QUAD4/HEX8 with a single physical group each. Canonical MSH2.2 in meters; physical aliases mapped explicitly. No native ID correspondence inferred.','Solo QUAD4/HEX8 con un grupo físico por elemento. MSH2.2 canónico en metros; alias físicos documentados. No se infiere correspondencia de IDs nativos.')+'</p><p id="mgCommandPreview" class="cgNotice"></p><p id="mgEnvironmentStatus" class="cgNotice" aria-live="polite"></p><p id="mgNativeStatus" class="cgNotice" aria-live="polite"></p><pre id="mgNativeLogs" style="white-space:pre-wrap;max-height:260px;overflow:auto"></pre>';
 anchor.insertAdjacentElement('afterend',panel);const el=id=>panel.querySelector('#'+id);let model=null,result=null,rev=0,source=null,native=null,task=null,convertRev=0;
 const opts=(id,items)=>{el(id).replaceChildren();for(const [key,g] of items){const o=document.createElement('option');o.value=key;o.textContent=g.name+' ['+key+']';el(id).append(o)}};
 function clearMatch(){result=null;for(const id of ['mgResult','mgContactView','mgContactInfo'])el(id).textContent='';el('mgExport').disabled=true}
 function clear(){rev++;model=null;clearNative();source=null;clearMatch();for(const id of ['mgGroups','mgElement','mgView'])el(id).textContent='';for(const id of ['mgSurface','mgA','mgB'])opts(id,[])}
 el('mgFile').onchange=el('mgUnit').onchange=()=>{clear();el('mgStatus').textContent=cgUi('Select unit and Inspect.','Selecciona unidad e Inspeccionar.')};
 el('mgLoad').onclick=async()=>{clear();const token=rev;try{const file=el('mgFile').files[0],unit=el('mgUnit').value;if(!file||file.size>96*1024*1024||!unit)throw Error('Select ASCII MSH <= 96 MiB and explicit unit');el('mgStatus').textContent='Reading '+file.name;const data=mgCore.parse(await file.text(),unit);if(token!==rev)return;model=data;source=file.name;el('mgStatus').textContent=file.name+' · MSH '+data.version+' · '+data.points.size+' nodes · '+data.elements.size+' elements · '+unit+' → m';const table=document.createElement('table');for(const [k,g] of data.groups){const row=table.insertRow();for(const value of [k,g.name,g.count,JSON.stringify(g.types)])row.insertCell().textContent=String(value)}el('mgGroups').append(table);const a=[...data.groups].filter(([,g])=>g.dim===3&&g.count),b=[...data.groups].filter(([,g])=>g.dim===2&&g.count);opts('mgSurface',b);opts('mgA',a);opts('mgB',a);if(a.length>1)el('mgB').selectedIndex=1;nativeButtons()}catch(e){if(token===rev)el('mgStatus').textContent=e.message}};
 el('mgLocate').onclick=()=>{el('mgElement').textContent='';el('mgView').textContent='';try{if(!model||!/^\d+$/.test(el('mgId').value))throw Error('Select mesh and integer element ID');const e=model.elements.get(Number(el('mgId').value));if(!e)throw Error('Unknown element ID');const p=e.nodes.map(n=>model.points.get(n));el('mgElement').textContent=JSON.stringify(e)+' · XYZ [m] '+JSON.stringify(p);const points=p.map(a=>[(a[0]-a[2])*.707,a[1]+(a[0]+a[2])*.408]),lo=[Math.min(...points.map(a=>a[0])),Math.min(...points.map(a=>a[1]))],hi=[Math.max(...points.map(a=>a[0])),Math.max(...points.map(a=>a[1]))],s=Math.min(280/(hi[0]-lo[0]||1),170/(hi[1]-lo[1]||1)),xy=a=>[160+(a[0]-(lo[0]+hi[0])/2)*s,100-(a[1]-(lo[1]+hi[1])/2)*s],edges=e.type===5?msCore.edges:e.type===3?[[0,1],[1,2],[2,3],[3,0]]:e.type===2?[[0,1],[1,2],[2,0]]:[];el('mgView').innerHTML='<svg viewBox="0 0 320 200" style="max-width:420px;width:100%;background:#101b2c">'+edges.map(([i,j])=>'<polyline points="'+xy(points[i]).join(',')+' '+xy(points[j]).join(',')+'" fill="none" stroke="#ffb74d" stroke-width="2"/>').join('')+points.map(a=>{const [x,y]=xy(a);return '<circle cx="'+x+'" cy="'+y+'" r="3" fill="#dbe5ef"/>'}).join('')+'</svg>'}catch(e){el('mgElement').textContent=e.message}};
 function nativeButtons(){const unavailable=!!task||!window.chrome?.webview?.postMessage;el('mgListWsl').disabled=unavailable;el('mgProbe').disabled=unavailable||!flWslSelectionAvailable(el('mgDistribution'));el('mgDistribution').disabled=!!task;el('mgCommandPreview').textContent=flWslPreview('gmsh',el('mgSplit').checked,false);el('mgConvert').disabled=!!task||!model||!flWslSelectionAvailable(el('mgDistribution'))||!window.chrome?.webview?.postMessage;el('mgCancel').disabled=!task;el('mgInspectNative').disabled=!!task||!flHasNativeMesh(native?.report);el('mgNativeExport').disabled=!!task||!native}
 function clearNative(){convertRev++;if(task)task.cancel();native=null;el('mgNativeStatus').textContent='';el('mgNativeLogs').textContent='';nativeButtons()}
 el('mgDistribution').onchange=el('mgNativeVersion').onchange=()=>{el('mgEnvironmentStatus').textContent='';clearNative()};el('mgSplit').onchange=clearNative;
 el('mgListWsl').onclick=async()=>{if(task)return;clearNative();const token=convertRev;try{task=flMeshNativeRequest('listFoamWslDistributions',{});nativeButtons();const r=await task.promise;if(token!==convertRev)return;el('mgEnvironmentStatus').textContent=flWslOptions(el('mgDistribution'),r,t)+' · '+t('installed WSL distributions','distribuciones WSL instaladas')}catch(e){if(token===convertRev)el('mgEnvironmentStatus').textContent=e.message}finally{task=null;nativeButtons()}};
 el('mgProbe').onclick=async()=>{if(task||!flWslSelectionAvailable(el('mgDistribution')))return;const token=convertRev,version=el('mgNativeVersion').value,distribution=el('mgDistribution').value;try{task=flMeshNativeRequest('probeFoamMeshEnvironment',{version,distribution});nativeButtons();const r=await task.promise;if(token!==convertRev)return;if(r?.schema!=='foamlens/wsl-foundation-preflight/1'||r.originalCaseModified!==false||!flWslReceiptMatches(r,version,distribution))throw Error('Unexpected WSL preflight report');el('mgEnvironmentStatus').textContent=r.matched?'Foundation '+r.requestedVersion+' · '+r.distribution+' · '+Object.entries(r.tools||{}).map(([k,v])=>k+': '+(v?t('available','disponible'):t('missing','ausente'))).join(' | '):t('Requested Foundation not verified','Foundation solicitado no verificado')}catch(e){if(token===convertRev)el('mgEnvironmentStatus').textContent=e.message}finally{task=null;nativeButtons()}};el('mgCancel').onclick=()=>{if(task){task.cancel();el('mgNativeStatus').textContent=cgUi('Cancellation requested','Cancelación solicitada')}};
 el('mgConvert').onclick=async()=>{if(task||!model||!flWslSelectionAvailable(el('mgDistribution')))return;let token;try{const canonical=mgCore.canonical(model),version=el('mgNativeVersion').value,distribution=el('mgDistribution').value;clearNative();token=convertRev;const splitRegions=el('mgSplit').checked,groupCount=canonical.mapping.filter(g=>g.dimension===3).length;if(splitRegions&&(groupCount<2||groupCount>12))throw Error('Split requires 2–12 volume groups');task=flMeshNativeRequest('runGmshMesh',{version,distribution,msh:canonical.msh,splitRegions});nativeButtons();el('mgNativeStatus').textContent='gmshToFoam → checkMesh · '+canonical.volumes+' HEX8';const report=await task.promise;if(token!==convertRev)return;if(report?.schema!=='foamlens/native-gmsh-mesh/1'||report.originalCaseModified!==false||report.plannedCells!==canonical.volumes||!flWslReceiptMatches(report,version,distribution))throw Error('Unexpected conversion report');const {msh,...mapping}=canonical;native={report,mapping,source,msh};el('mgNativeStatus').textContent='Foundation '+(report.version||'—')+' · gmshToFoam exit '+(report.generationExit??'—')+' · checkMesh exit '+(report.checkMeshExit??'—')+' ('+(report.qualityStatus||'undetermined')+') · '+Object.keys(report.files||{}).length+' files'+flRegionStatus(report)+' · '+(report.exportError||'review logs');el('mgNativeLogs').textContent=[report.stderr,report.stdout,report.gmshLog,report.checkMeshLog,report.splitLog].filter(Boolean).join('\n\n')}catch(e){if(token===undefined||token===convertRev)el('mgNativeStatus').textContent=e.message}finally{task=null;nativeButtons()}};
 el('mgInspectNative').onclick=()=>{try{window.FoamLensLoadGeneratedMesh(native.report,'gmshToFoam · '+native.source)}catch(e){el('mgNativeStatus').textContent=e.message}};
 el('mgNativeExport').onclick=()=>{if(!native)return;try{const {files,gmshLog,checkMeshLog,dictionary,...meta}=flMeshReportMeta(native.report),entries=[{name:'report.json',data:JSON.stringify({...meta,source:native.source,mapping:native.mapping},null,2)},{name:'source.msh',data:native.msh}];if(typeof native.report.stagingControlDict==='string')entries.push({name:'system/controlDict',data:native.report.stagingControlDict});if(typeof native.report.expectedRegionInput==='string')entries.push({name:'expected-regions.txt',data:native.report.expectedRegionInput});if(gmshLog)entries.push({name:'gmshToFoam.log',data:gmshLog});if(checkMeshLog)entries.push({name:'checkMesh.log',data:checkMeshLog});for(const [name,data] of Object.entries(files||{})){if(!/^constant\/polyMesh\/(points|faces|owner|neighbour|boundary|cellZones|faceZones|pointZones)$/.test(name)||typeof data!=='string')throw Error('Invalid mesh output');entries.push({name,data})}entries.push(...flSetEntries(native.report.sets,'constant/polyMesh'),...flMeshRegionEntries(native.report));cgDownloadZip('FoamLens-gmsh-conversion.zip',cgStoreZip(entries))}catch(e){el('mgNativeStatus').textContent=e.message}};
 function drawContact(){
  el('mgContactView').replaceChildren();el('mgContactInfo').textContent='';if(!model||!result)return;
  const filter=el('mgFilter').value,mode=el('mgProjection').value,project=p=>mode==='XY'?[p[0],p[1]]:mode==='XZ'?[p[0],p[2]]:mode==='YZ'?[p[1],p[2]]:[(p[0]-p[2])*.707,p[1]+(p[0]+p[2])*.408];
  const ids=[];let lo=[Infinity,Infinity],hi=[-Infinity,-Infinity];
  for(let i=0;i<result.rows.length;i++){const r=result.rows[i],g=result.geometry[i],amb=r.a.length>1||r.b.length>1,missing=!r.a.length||!r.b.length;
   if(filter==='all'||filter==='paired'&&g.paired||filter==='missing'&&missing||filter==='ambiguous'&&amb||filter==='invalid'&&g.areaVectorMagnitude_m2===null)ids.push(i);
   const q=project(g.vertexMean_m);for(let j=0;j<2;j++){lo[j]=Math.min(lo[j],q[j]);hi[j]=Math.max(hi[j],q[j])}
  }
  if(!ids.length){el('mgContactInfo').textContent=cgUi('No faces in selection.','No hay caras en esta selección.');return}
  const scale=Math.min(580/(hi[0]-lo[0]||1),300/(hi[1]-lo[1]||1)),xy=p=>{const q=project(p);return[320+(q[0]-(lo[0]+hi[0])/2)*scale,170-(q[1]-(lo[1]+hi[1])/2)*scale]};
  const stride=Math.max(1,Math.ceil(ids.length/3000)),shown=ids.filter((_,i)=>i%stride===0);const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 640 340');svg.setAttribute('style','width:100%;max-height:420px;background:#101b2c;border-radius:9px');svg.setAttribute('aria-label','Contact source face markers');
  for(const i of shown){const r=result.rows[i],g=result.geometry[i],p=xy(g.vertexMean_m),c=document.createElementNS(ns,'circle');c.setAttribute('cx',String(p[0]));c.setAttribute('cy',String(p[1]));c.setAttribute('r','3.5');c.setAttribute('fill',g.areaVectorMagnitude_m2===null?'#b9a2f5':r.a.length>1||r.b.length>1?'#f3b552':g.paired?'#65c6a5':'#ef7185');c.setAttribute('tabindex','0');c.setAttribute('role','button');c.setAttribute('aria-label','Face '+r.surface);const pick=()=>{el('mgId').value=String(r.surface);el('mgLocate').click();el('mgContactInfo').textContent='Face '+r.surface+' · A: '+(r.a.join(', ')||'—')+' · B: '+(r.b.join(', ')||'—')+' · area vector [m²]: '+(g.areaVectorMagnitude_m2??'—')+' · vertex mean [m]: '+g.vertexMean_m.join(', ')};c.addEventListener('click',pick);c.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();pick()}});svg.append(c)}
  el('mgContactView').append(svg);el('mgContactInfo').textContent=ids.length+' '+cgUi('selected; displayed','seleccionadas; visibles')+' '+shown.length+' · '+cgUi('green paired / red missing / amber ambiguous / violet invalid area','verde emparejada / rojo sin pareja / ámbar ambigua / violeta área inválida');
 }
 el('mgFilter').onchange=el('mgProjection').onchange=drawContact;
 for(const id of ['mgSurface','mgA','mgB'])el(id).onchange=clearMatch;
 el('mgMatch').onclick=()=>{clearMatch();try{if(!model)throw Error('Select mesh');result={source,unit:model.unit,...mgCore.contact(model,el('mgSurface').value,el('mgA').value,el('mgB').value)};const {rows,geometry,...summary}=result;el('mgResult').textContent=JSON.stringify(summary);el('mgExport').disabled=false;drawContact()}catch(e){el('mgResult').textContent=e.message}};
 el('mgExport').onclick=()=>{if(result)cgDownloadZip('FoamLens-gmsh-contact.zip',cgStoreZip([{name:'contact.json',data:JSON.stringify(result,null,2)},{name:'contact.csv',data:'surface,volumeA,volumeB,areaVectorMagnitude_m2,normalX,normalY,normalZ,vertexMeanX_m,vertexMeanY_m,vertexMeanZ_m,paired\n'+result.rows.map((r,i)=>{const g=result.geometry[i];return [r.surface,r.a.join(';'),r.b.join(';'),g.areaVectorMagnitude_m2,...(g.normal||['','','']),...g.vertexMean_m,g.paired].join(',')}).join('\n')}]))};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mgMount,{once:true});else mgMount();
window.FoamLensGmshInspector=mgCore;


/* FOAMLENS_CAD_MEASURE_CORE_START */
function cmDistance(a,b){
 if(!Array.isArray(a)||!Array.isArray(b)||a.length!==3||b.length!==3||[...a,...b].some(x=>typeof x!=='number'||!Number.isFinite(x)))throw Error('Expected metric XYZ points');
 const delta=b.map((x,i)=>x-a[i]),length=Math.hypot(...delta);if(!Number.isFinite(length))throw Error('Distance overflow');return {delta_m:delta,distance_m:length}
}
/* FOAMLENS_CAD_MEASURE_CORE_END */
function cmMount(){
 const anchor=document.getElementById('cgCanvas');if(!anchor||document.getElementById('cmMeasure'))return;
 const panel=document.createElement('details');panel.id='cmMeasure';panel.style.cssText='padding:10px;border:1px solid #37526e;border-radius:9px';const t=(a,b)=>cgEscape(cgUi(a,b));
 panel.innerHTML='<summary><b>'+t('CAD measurements · source vertices','Mediciones CAD · vértices de origen')+'</b></summary><p class="cgNotice">'+t('Select a named part below, then choose a triangle ordinal within that part and vertex (0–2). Measurements use original tessellated coordinates, not exact CAD curves. Both picks must belong to the same imported model with confirmed units.','Selecciona una pieza debajo y el ordinal de triángulo en esa pieza y vértice (0–2). Se mide la teselación original, no curvas CAD exactas. Ambas selecciones deben pertenecer al mismo modelo importado con unidades confirmadas.')+'</p><div class="cgTools"><label>'+t('Triangle ordinal','Ordinal de triángulo')+' <input id="cmTriangle" type="number" min="0" step="1" value="0" style="width:100px"></label><label>'+t('Vertex','Vértice')+' <select id="cmVertex"><option>0</option><option>1</option><option>2</option></select></label><button class="btn soft" type="button" id="cmA">A</button><button class="btn soft" type="button" id="cmB">B</button><button class="btn soft" type="button" id="cmClear">'+t('Clear','Limpiar')+'</button></div><p id="cmAInfo" class="cgNotice"></p><p id="cmBInfo" class="cgNotice"></p><p id="cmResult" class="cgNotice" aria-live="polite"></p>';
 anchor.insertAdjacentElement('afterend',panel);const el=id=>panel.querySelector('#'+id);let a=null,b=null;
 const valid=p=>p&&cgModels.includes(p.model)&&p.model.unit===p.unit&&cgUnitScale(p.unit);
 function update(){for(const [p,slot] of [[a,'A'],[b,'B']])el('cm'+slot+'Info').textContent=p?(valid(p)?slot+': '+p.model.name+' / '+p.part+' / '+p.triangle+' / '+p.vertex+' · XYZ [m] '+p.xyz.join(', '):slot+': '+cgUi('Source or units changed; pick again.','Cambió fuente o unidad; elige de nuevo.')):'';el('cmResult').textContent='';if(valid(a)&&valid(b)){if(a.model!==b.model){el('cmResult').textContent=cgUi('Different source models; shared reference frame not verified.','Modelos distintos; sistema de referencia común no verificado.');return}const d=cmDistance(a.xyz,b.xyz);el('cmResult').textContent='Distance: '+d.distance_m.toPrecision(8)+' m ('+(d.distance_m*1000).toPrecision(8)+' mm) · ΔXYZ [m]: '+d.delta_m.join(', ')}}
 function pick(slot){try{const key=String(document.getElementById('cgPart')?.value||''),sep=key.indexOf('|'),model=cgModels[Number(key.slice(0,sep))],part=key.slice(sep+1),unit=model?.unit,scale=cgUnitScale(unit);if(sep<0||!model||!scale||!model.visible||!model.partsVisible.get(part))throw Error('Select a visible CAD part and confirm units');const raw=el('cmTriangle').value;if(!/^\d+$/.test(raw))throw Error('Invalid triangle ordinal');const ordinal=Number(raw),vertex=Number(el('cmVertex').value);let n=0,tri=null;for(const t of model.triangles)if(t.part===part&&n++===ordinal){tri=t;break}if(!tri||!tri.vertices[vertex])throw Error('Triangle/vertex out of range');const p={model,part,unit,triangle:ordinal,vertex,xyz:tri.vertices[vertex].map(x=>x*scale)};if(slot==='A')a=p;else b=p;update()}catch(e){el('cmResult').textContent=e.message}}
 el('cmA').onclick=()=>pick('A');el('cmB').onclick=()=>pick('B');el('cmClear').onclick=()=>{a=b=null;update()};panel.addEventListener('toggle',update);
 document.getElementById('cgInventory')?.addEventListener('change',()=>queueMicrotask(update));document.getElementById('cgImport')?.addEventListener('click',()=>{a=b=null;update()});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',cmMount,{once:true});else cmMount();
