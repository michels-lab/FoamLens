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
function cmbNativePayload(p,version){
 if(!['13','14'].includes(version)||p.cellCount>200000)throw Error('Native Foundation 13/14 run supports at most 200,000 cells');
 return {version,axes:p.axes,patches:p.boundary.map(x=>x.name),zones:p.blocks.filter(b=>b.zone).map(b=>({ijk:b.ijk,name:b.zone}))};
}
/* FOAMLENS_BLOCKMESH_DESIGN_CORE_END */
function flMeshNativeRequest(type,payload){
 const webview=window.chrome?.webview;if(!webview?.postMessage)throw Error('Native Windows WebView2 required');
 const requestId='fl_mesh_'+Date.now()+'_'+(++flMeshNativeSequence);let finished=false,timer,listener;
 const cancel=()=>{if(!finished)webview.postMessage({type:'cancelOperation',requestId:requestId+'_cancel',targetRequestId:requestId})};
 const promise=new Promise((resolve,reject)=>{const finish=(err,data)=>{if(finished)return;finished=true;clearTimeout(timer);webview.removeEventListener('message',listener);err?reject(err):resolve(data)};listener=e=>{const r=e.data;if(r?.type==='nativeReply'&&r.requestId===requestId)finish(r.ok?null:Error(r.error||'Native mesh failed'),r.data)};webview.addEventListener('message',listener);timer=setTimeout(()=>{try{cancel()}finally{finish(Error('Native mesh request timed out'))}},235000);try{webview.postMessage({type,requestId,...payload})}catch(e){finish(e)}});
 return{promise,cancel}
}
let flMeshNativeSequence=0;
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
    '<p id="cmbStatus" class="cgNotice" aria-live="polite"></p><div id="cmbView"></div><div class="cgTools"><label>OpenFOAM Foundation <select id="cmbVersion"><option value="14">14</option><option value="13">13</option></select></label><button class="btn primary" id="cmbNativeRun" type="button" disabled>'+tr('Run blockMesh + checkMesh in temporary WSL case','Ejecutar blockMesh + checkMesh en caso temporal WSL')+'</button><button class="btn soft" id="cmbNativeCancel" type="button" disabled>'+tr('Cancel','Cancelar')+'</button><button class="btn soft" id="cmbInspectNative" type="button" disabled>'+tr('Inspect generated mesh','Inspeccionar malla generada')+'</button><button class="btn soft" id="cmbNativeExport" type="button" disabled>'+tr('Export actual mesh / logs ZIP','Exportar malla real / logs ZIP')+'</button></div><p class="cgNotice">'+tr('Windows + default WSL, selected Foundation version installed. 200,000 cell and 24 MiB mesh transfer limits; no solver, BC or automatic region splitting.','Windows + WSL predeterminado, versión Foundation seleccionada instalada. Límite de 200,000 celdas y 24 MiB de malla; sin solver, BC ni separación automática de regiones.')+'</p><p id="cmbNativeStatus" class="cgNotice" aria-live="polite"></p><pre id="cmbNativeLogs" style="white-space:pre-wrap;max-height:260px;overflow:auto"></pre>';
  anchor.insertAdjacentElement('afterend',panel);
  const el=id=>document.getElementById(id);let plan=null,nativeReport=null,nativeTask=null,revision=0;
  const input=()=>({axes:['X','Y','Z'].map(a=>el('cmb'+a).value),patches:Array.from({length:6},(_,i)=>el('cmbPatch'+i).value.trim()),zones:el('cmbZones').value});
  const invalidate=()=>{resetNative();plan=null;el('cmbExport').disabled=true;el('cmbView').textContent='';el('cmbStatus').textContent=cgUi('Inputs changed; rebuild plan.','Entradas modificadas; vuelve a generar el plan.');buttons()};
  const available=()=>!!window.chrome?.webview?.postMessage;
  function buttons(){el('cmbNativeRun').disabled=!!nativeTask||!available()||!plan||plan.cellCount>200000;el('cmbNativeCancel').disabled=!nativeTask;el('cmbNativeExport').disabled=!nativeReport||!!nativeTask;el('cmbInspectNative').disabled=!nativeReport?.meshGenerated||!Object.keys(nativeReport.files||{}).length||!!nativeTask}
  function resetNative(){revision++;nativeReport=null;if(nativeTask)nativeTask.cancel();el('cmbNativeStatus').textContent='';el('cmbNativeLogs').textContent='';buttons()}
  el('cmbVersion').onchange=resetNative;
  el('cmbNativeCancel').onclick=()=>{if(nativeTask){nativeTask.cancel();el('cmbNativeStatus').textContent=cgUi('Cancellation requested; awaiting native response.','Cancelación solicitada; esperando respuesta nativa.')}};
  el('cmbNativeRun').onclick=async()=>{if(nativeTask||!plan||!available())return;let token;try{const p=cmbPlan(input()),version=el('cmbVersion').value,payload=cmbNativePayload(p,version);resetNative();token=revision;nativeTask=flMeshNativeRequest('runCartesianMesh',payload);buttons();el('cmbNativeStatus').textContent=cgUi('Running in isolated WSL temporary case…','Ejecutando en caso temporal WSL aislado…');
   const r=await nativeTask.promise;if(token!==revision)return;if(r?.schema!=='foamlens/native-cartesian-mesh/1'||r.originalCaseModified!==false||r.plannedCells!==p.cellCount)throw Error('Unexpected native report');
   nativeReport=r;const count=Object.keys(r.files||{}).length;el('cmbNativeStatus').textContent='Foundation '+(r.version||'—')+' · blockMesh exit '+(r.blockMeshExit??'—')+' · checkMesh exit '+(r.checkMeshExit??'—')+' · '+count+' mesh files · '+(r.exportError||cgUi('Review logs; no quality certification.','Revisa logs; sin certificación de calidad.'));
   el('cmbNativeLogs').textContent=[r.stderr,r.stdout,r.blockMeshLog,r.checkMeshLog].filter(Boolean).join('\n\n');
  }catch(e){if(token===undefined||token===revision)el('cmbNativeStatus').textContent=e.message}finally{nativeTask=null;buttons()}};
  el('cmbInspectNative').onclick=()=>{try{window.FoamLensLoadGeneratedMesh(nativeReport,'blockMesh');}catch(e){el('cmbNativeStatus').textContent=e.message}};
  el('cmbNativeExport').onclick=()=>{if(!nativeReport)return;const {files,dictionary,blockMeshLog,checkMeshLog,...meta}=nativeReport;try{const entries=[{name:'system/blockMeshDict',data:dictionary},{name:'report.json',data:JSON.stringify(meta,null,2)}];if(blockMeshLog)entries.push({name:'blockMesh.log',data:blockMeshLog});if(checkMeshLog)entries.push({name:'checkMesh.log',data:checkMeshLog});for(const [name,data] of Object.entries(files||{})){if(!/^constant\/polyMesh\/(points|faces|owner|neighbour|boundary|cellZones|faceZones|pointZones)$/.test(name)||typeof data!=='string')throw Error('Invalid native mesh file');entries.push({name,data})}cgDownloadZip('FoamLens-native-cartesian-mesh.zip',cgStoreZip(entries))}catch(e){el('cmbNativeStatus').textContent=e.message}};
  const draw=()=>{
    if(!plan)return;const axis=Number(el('cmbNormal').value),layers=el('cmbLayer'),old=Number(layers.value)||0;
    layers.innerHTML=Array.from({length:plan.dims[axis]},(_,i)=>'<option value="'+i+'">'+i+'</option>').join('');layers.value=String(Math.min(old,plan.dims[axis]-1));
    const s=cmbSlice(plan,axis,Number(layers.value)),u=plan.axes[s.u].points,v=plan.axes[s.v].points,W=640,H=320,L=55,T=22,ww=560,hh=255;
    const px=x=>L+(x-u[0])/(u.at(-1)-u[0])*ww,py=y=>T+(v.at(-1)-y)/(v.at(-1)-v[0])*hh;
    const names=Object.keys(plan.zoneCells).sort(),colors=['#36a3be','#d6a248','#8b8cdb','#59b88b','#cd728b','#778897'];
    const svg='<svg viewBox="0 0 '+W+' '+H+'" style="width:100%;max-height:350px;background:#101b2c;border-radius:9px" aria-label="Cartesian block plan">'+s.blocks.map(b=>{
      const [x0,y0,x1,y1]=b.rect,w=px(x1)-px(x0),h=py(y0)-py(y1);
      return '<g data-cmb-key="'+b.key+'" role="button" tabindex="0" aria-label="'+cgEscape(b.key+' '+(b.zone||'unassigned'))+'"><rect x="'+px(x0)+'" y="'+py(y1)+'" width="'+w+'" height="'+h+'" stroke="#c6d8e7" fill="'+(b.zone?colors[names.indexOf(b.zone)%colors.length]:'#33465b')+'"/>'+(w>45&&h>24?'<text pointer-events="none" x="'+(px(x0)+w/2)+'" y="'+(py(y1)+h/2)+'" text-anchor="middle" fill="#fff" font-size="11">'+cgEscape((b.zone||b.key).slice(0,18))+'</text>':'')+'</g>'
    }).join('')+'<text x="320" y="304" fill="#dbe5ef" text-anchor="middle" font-size="12">'+('XYZ'[s.u])+' [m] '+u[0]+' → '+u.at(-1)+'</text><text x="8" y="17" fill="#dbe5ef" font-size="12">'+('XYZ'[s.v])+' [m] '+v[0]+' → '+v.at(-1)+'</text></svg>';
    el('cmbView').innerHTML=svg+'<p class="cgNotice">'+tr('Planned cells','Celdas previstas')+': '+plan.cellCount.toLocaleString()+' · '+tr('Blocks','Bloques')+': '+plan.blocks.length+' · '+tr('Unassigned cells','Celdas sin zona')+': '+plan.unassignedCells.toLocaleString()+'</p><p class="cgNotice">'+names.map(n=>cgEscape(n)+': '+plan.zoneCells[n].toLocaleString()).join(' · ')+'</p><p class="cgNotice">'+tr('Different-zone shared block faces (planned, not validated interfaces)','Caras compartidas entre zonas (previstas, no interfaces validadas)')+': '+plan.interfaces.length+' · '+plan.interfaces.reduce((n,f)=>n+f.plannedFaces,0).toLocaleString()+'</p>';
    for(const g of el('cmbView').querySelectorAll('[data-cmb-key]')){
      const assign=()=>{try{const key=g.dataset.cmbKey,zone=el('cmbPaint').value.trim();if(zone)cmbName(zone);
        const rows=el('cmbZones').value.split(/\r?\n/).filter(l=>l.trim()&&l.trim().split(/\s+/).slice(0,3).join(',')!==key);if(zone)rows.push(key.replaceAll(',',' ')+' '+zone);el('cmbZones').value=rows.join('\n');build()
      }catch(e){el('cmbStatus').textContent=String(e.message)}};
      g.onclick=assign;g.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();assign()}}
    }
  };
  const build=()=>{resetNative();try{plan=cmbPlan(input());el('cmbExport').disabled=false;buttons();el('cmbStatus').textContent=cgUi('Cartesian plan ready; no mesh has been generated.','Plan cartesiano listo; no se ha generado malla.');draw()}catch(e){invalidate();el('cmbStatus').textContent=String(e.message)}};
  for(const id of ['cmbX','cmbY','cmbZ','cmbZones',...Array.from({length:6},(_,i)=>'cmbPatch'+i)])el(id).addEventListener('input',invalidate);
  el('cmbPreview').onclick=build;el('cmbNormal').onchange=draw;el('cmbLayer').onchange=draw;
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
  const cells=blocks.reduce((a,b)=>a+b.cells,0);if(!Number.isSafeInteger(cells))fail('Cell count overflow');return {vertices,blocks,zones,arcs,patches,scale,cells,sharedZoneFaces:[...top.values()].filter(a=>a.length===2&&blocks[a[0]].zone&&blocks[a[1]].zone&&blocks[a[0]].zone!==blocks[a[1]].zone).length,meshGenerated:false,interfaceVerified:false};
 }
 function native(source,object,classes,entry){const r=reader(source);r.expect('FoamFile');const h=r.dict();if(h.format!=='ascii'||h.object!==object||!classes.includes(h.class))fail('Expected ASCII '+object);const n=id(r.take());if(n>5000000)fail('Native list limit');r.expect('(');const a=[];for(let i=0;i<n;i++)a.push(entry(r));r.expect(')');if(r.peek()===';')r.take();if(r.peek()!==null)fail('Unexpected trailing data');return a}
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
  const faceMetric=metric==='faceArea'||metric==='nonOrthogonality';if(!faceMetric&&metric!=='cellVolume')fail('Unknown metric');
  const kind=faceMetric?'faceSet':'cellSet',limit=metric==='nonOrthogonality'?m.neighbour.length:faceMetric?m.faces.length:m.cells.length,values=[],invalid=[],cache=new Map();
  const cell=i=>{if(!cache.has(i)){try{cache.set(i,cellGeometry(m,i))}catch{cache.set(i,null)}}return cache.get(i)};
  for(let i=0;i<limit;i++){
   let v=null;if(metric==='cellVolume')v=cell(i)?.volume_m3;
   else {const p=m.faces[i].map(j=>m.points[j]),o=p[0];let a=[0,0,0];for(let j=1;j<p.length-1;j++)a=add(a,cross(sub(p[j],o),sub(p[j+1],o)));a=mul(a,.5);const area=norm(a);
    if(metric==='faceArea')v=area>0?area:null;
    else {const c=cell(m.owner[i]),n=cell(m.neighbour[i]);if(c&&n){const d=sub(n.centroid_m,c.centroid_m),den=area*norm(d);if(den>0&&Number.isFinite(den))v=Math.acos(Math.max(-1,Math.min(1,dot(a,d)/den)))*180/Math.PI}}
   }
   if(typeof v==='number'&&Number.isFinite(v))values.push({id:i,value:v});else invalid.push(i);
  }
  return {kind,values,invalid,eligible:limit,coverage:limit?values.length/limit:0,metric,unit:metric==='faceArea'?'m²':metric==='cellVolume'?'m³':'deg',method:'FoamLens triangulated polyhedral approximation; not native checkMesh'};
 }
 function metricThreshold(q,lo,hi){if(!Number.isFinite(lo)||!Number.isFinite(hi)||lo>hi)fail('Invalid inclusive threshold');return q.values.filter(x=>x.value>=lo&&x.value<=hi)}
 function fromNativeReport(r){
  if(!r||!['foamlens/native-cartesian-mesh/1','foamlens/native-gmsh-mesh/1'].includes(r.schema)||r.originalCaseModified!==false||r.meshGenerated!==true||r.generationExit!==0||r.exportError)fail('No complete generated mesh report');
  const f={};for(const n of ['points','faces','owner','neighbour','boundary']){const v=r.files?.['constant/polyMesh/'+n];if(typeof v!=='string'||!v)fail('Missing generated mesh '+n);f[n]=v}
  const m=poly(f);if(!Number.isSafeInteger(r.plannedCells)||m.cells.length!==r.plannedCells)fail('Generated cell count differs from input; inspect export separately');
  return m;
 }
 return {blockDict,poly,readSet,locate,patchMatch,qualityCSV,cellGeometry,geometricMetric,metricThreshold,fromNativeReport,edges,key};
})();
/* FOAMLENS_MESH_STUDIO_CORE_END */

function msMount(){
 const anchor=document.getElementById('cmbDesigner');if(!anchor||document.getElementById('msStudio'))return;
 const panel=document.createElement('details');panel.id='msStudio';panel.style.cssText='margin:12px 0;padding:12px;border:1px solid var(--line);border-radius:10px';
 const t=(a,b)=>cgEscape(cgUi(a,b));
 panel.innerHTML='<summary><b>Mesh Studio · '+t('Original geometry and native mesh','Geometría original y malla nativa')+'</b></summary><p class="cgNotice">'+t('Local read-only inspection. ASCII OpenFOAM files; unsupported syntax is rejected. Coordinates in meters; wireframe projection is not a mesh-quality certificate.','Inspección local de solo lectura. Archivos OpenFOAM ASCII; sintaxis no compatible se rechaza. Coordenadas en metros; la proyección no certifica calidad.')+'</p>'+
 '<div class="cgTools"><label>blockMeshDict <input type="file" id="msDict"></label><label>polyMesh A <input type="file" id="msFolderA" webkitdirectory multiple></label><label>polyMesh B <input type="file" id="msFolderB" webkitdirectory multiple></label></div>'+
 '<p id="msStatus" class="cgNotice" aria-live="polite"></p><div class="cgTools"><label>'+t('Source','Fuente')+' <select id="msMode"><option value="dict">blockMeshDict</option><option value="a">polyMesh A</option><option value="b">polyMesh B</option><option value="generated">'+t('Generated mesh','Malla generada')+'</option></select></label><label>'+t('Projection','Proyección')+' <select id="msProjection"><option>ISO</option><option>XY</option><option>XZ</option><option>YZ</option></select></label><label>'+t('Zone / patch / defect set','Zona / parche / conjunto de defectos')+' <select id="msGroup"></select></label></div>'+
 '<div class="cgTools"><label>'+t('ID type','Tipo de ID')+' <select id="msKind"><option value="cellSet">Cell / Block</option><option value="faceSet">Face</option><option value="pointSet">Point</option></select></label><label>ID <input id="msId" type="number" min="0" step="1" value="0" style="width:100px"></label><button class="btn soft" id="msLocate" type="button">'+t('Locate','Localizar')+'</button></div><div id="msSummary"></div><div id="msView"></div><p id="msSelection" class="cgNotice"></p>'+
 '<div class="cgTools"><label>'+t('Quality metric CSV (id,value)','CSV de métrica de calidad (id,value)')+' <input id="msQualityFile" type="file" accept=".csv"></label><label>'+t('Association','Asociación')+' <select id="msQualityKind"><option value="faceSet">Face</option><option value="cellSet">Cell</option><option value="pointSet">Point</option></select></label><label>'+t('Metric / units','Métrica / unidades')+' <input id="msQualityName" placeholder="non-orthogonality [deg]"></label><button class="btn soft" id="msQualityLoad" type="button">'+t('Load histogram','Cargar histograma')+'</button></div><p id="msQualityStatus" class="cgNotice"></p><div id="msQualityHistogram"></div>'+
 '<div class="cgTools"><label>'+t('Computed geometry','Geometría calculada')+' <select id="msComputed"><option value="cellVolume">Cell volume [m³]</option><option value="faceArea">Face area vector [m²]</option><option value="nonOrthogonality">Internal face non-orthogonality [deg]</option></select></label><button class="btn soft" id="msCompute" type="button">'+t('Compute and inspect','Calcular e inspeccionar')+'</button></div><p id="msComputedStatus" class="cgNotice"></p><div class="cgTools"><label>Min <input id="msLow" type="number" step="any"></label><label>Max <input id="msHigh" type="number" step="any"></label><button class="btn soft" id="msThreshold" disabled type="button">Threshold</button><button class="btn soft" id="msMetricExport" disabled type="button">CSV / JSON ZIP</button></div><p id="msThresholdStatus" class="cgNotice"></p>'+
 '<div class="cgTools"><label>Patch A <select id="msPatchA"></select></label><label>Patch B <select id="msPatchB"></select></label><button class="btn soft" id="msMatch" type="button">'+t('Compare exact interface','Comparar interfaz exacta')+'</button><button class="btn soft" id="msExport" type="button" disabled>'+t('Export comparison ZIP','Exportar comparación ZIP')+'</button></div><p id="msMatchResult" class="cgNotice"></p>';
 anchor.insertAdjacentElement('afterend',panel);
 const el=id=>panel.querySelector('#'+id),models={dict:null,a:null,b:null,generated:null},revision={dict:0,a:0,b:0};let selected=null,result=null,quality=null,qualityBin=null,qualityRevision=0,computed=null,threshold=null;
 const status=s=>{el('msStatus').textContent=s},resetMatch=()=>{result=null;el('msExport').disabled=true;el('msMatchResult').textContent=''};
 const opts=(select,items)=>{select.replaceChildren();for(const [v,l] of items){const o=document.createElement('option');o.value=v;o.textContent=l;select.append(o)}};
 const project=p=>{const m=el('msProjection').value;return m==='XY'?[p[0],p[1]]:m==='XZ'?[p[0],p[2]]:m==='YZ'?[p[2],p[1]]:[(p[0]-p[2])*.707,p[1]+(p[0]+p[2])*.408]};
 function clearComputed(){computed=null;threshold=null;for(const id of ['msComputedStatus','msThresholdStatus'])el(id).textContent='';el('msThreshold').disabled=el('msMetricExport').disabled=true}
 function clearQuality(){clearComputed();qualityRevision++;quality=null;qualityBin=null;el('msQualityHistogram').textContent='';el('msQualityStatus').textContent=''}
 function redraw(reset=false){
  const mode=el('msMode').value,obj=models[mode],isDict=mode==='dict';
  if(reset){clearQuality();selected=null;el('msSelection').textContent='';opts(el('msGroup'),[['all',cgUi('All','Todo')],...(obj?(isDict?Object.keys(obj.data.zones).map(n=>['z:'+n,n]):[...obj.data.patches.map(p=>['p:'+p.name,p.name+' ('+p.count+')']),...obj.sets.map(s=>['s:'+s.name,s.name+' ('+s.values.length+')'])]):[])])}
  el('msSummary').textContent='';el('msView').textContent='';if(!obj)return;
  const m=obj.data,group=el('msGroup').value,lines=[],marks=[],highlight=[];
  const face=(i,target)=>{const v=m.faces[i].map(j=>m.points[j]);target.push([...v,v[0]])};
  if(isDict){el('msSummary').textContent=obj.name+' · '+m.vertices.length+' vertices · '+m.blocks.length+' blocks · '+m.arcs.size+' arcs · '+m.cells+' planned cells · '+JSON.stringify(m.zones)+' · '+m.patches.map(p=>p.name+': '+p.type).join(', ');
   const drawBlock=(b,target)=>{for(const e of msCore.edges){const v=e.map(j=>b.vertices[j]),a=m.arcs.get(msCore.key(v));target.push(a?a.points:v.map(i=>m.vertices[i]))}};
   const seen=new Set();for(const b of m.blocks)if(group==='all'||group==='z:'+b.zone){for(const e of msCore.edges){const v=e.map(j=>b.vertices[j]),k=msCore.key(v);if(seen.has(k))continue;seen.add(k);lines.push(m.arcs.get(k)?.points||v.map(i=>m.vertices[i]))}}if(selected?.kind==='cellSet')drawBlock(m.blocks[selected.id],highlight);if(selected?.kind==='pointSet')marks.push(m.vertices[selected.id]);
  }else{el('msSummary').textContent=obj.name+' · '+m.points.length+' points · '+m.faces.length+' faces · '+m.cells.length+' cells · '+m.neighbour.length+' internal faces · '+m.patches.length+' patches · '+obj.sets.length+' native sets';
   const patch=m.patches.find(p=>'p:'+p.name===group),set=obj.sets.find(s=>'s:'+s.name===group);
   const ranges=patch?[patch]:m.patches;for(const p of ranges){const stride=Math.max(1,Math.ceil(p.count/Math.max(1,Math.floor(2400/ranges.length))));for(let i=p.start;i<p.start+p.count;i+=stride)face(i,lines)}
   if(set){const stride=Math.max(1,Math.ceil(set.values.length/3000));for(let i=0;i<set.values.length;i+=stride)marks.push(msCore.locate(m,set.kind,set.values[i]).point)}
   if(quality&&qualityBin!==null){const ids=quality.histogram[qualityBin].ids,stride=Math.max(1,Math.ceil(ids.length/3000));for(let i=0;i<ids.length;i+=stride)marks.push(msCore.locate(m,quality.kind,ids[i]).point)}
   if(computed&&threshold){const stride=Math.max(1,Math.ceil(threshold.length/3000));for(let i=0;i<threshold.length;i+=stride)marks.push(msCore.locate(m,computed.kind,threshold[i].id).point)}
   if(selected){const a=msCore.locate(m,selected.kind,selected.id);for(const i of a.faces)face(i,highlight);marks.push(a.point)}
  }
  const pts=[...lines.flat(),...highlight.flat(),...marks].map(project);if(!pts.length)return;let lo=[Infinity,Infinity],hi=[-Infinity,-Infinity];for(const p of pts)for(let i=0;i<2;i++){lo[i]=Math.min(lo[i],p[i]);hi[i]=Math.max(hi[i],p[i])}const scale=Math.min(580/(hi[0]-lo[0]||1),320/(hi[1]-lo[1]||1)),xy=p=>{const q=project(p);return [320+(q[0]-(lo[0]+hi[0])/2)*scale,180-(q[1]-(lo[1]+hi[1])/2)*scale]};
  const poly=(a,color,width)=>'<polyline points="'+a.map(p=>xy(p).join(',')).join(' ')+'" fill="none" stroke="'+color+'" stroke-width="'+width+'"/>';
  el('msView').innerHTML='<svg viewBox="0 0 640 360" style="width:100%;max-height:420px;background:#101b2c;border-radius:9px" aria-label="Mesh projection">'+lines.map(a=>poly(a,'#7795ac',.65)).join('')+highlight.map(a=>poly(a,'#ffb74d',2.5)).join('')+marks.map(p=>{const [x,y]=xy(p);return '<circle cx="'+x+'" cy="'+y+'" r="2.8" fill="#ffb74d"/>'}).join('')+'</svg><p class="cgNotice">'+t('Preview: native boundary faces sampled; orange = selected IDs / defect-set markers. Positions use vertex means, not true volume centroids.','Vista: muestreo de caras de borde; naranja = IDs elegidos / marcadores del conjunto. Posiciones por media de vértices, no centroides volumétricos.')+'</p>';
 }
 
 for(const id of ['msQualityFile','msQualityKind','msQualityName'])el(id).onchange=()=>{clearQuality();redraw()};
 el('msQualityLoad').onclick=async()=>{clearQuality();const token=qualityRevision,mode=el('msMode').value,obj=models[mode];try{const file=el('msQualityFile').files[0],name=el('msQualityName').value.trim(),kind=el('msQualityKind').value;if(mode==='dict'||!obj||!file||!name||file.size>48*1024*1024)throw Error('Select native mesh, metric name/units and CSV <=48 MiB');const q=msCore.qualityCSV(await file.text(),kind,obj.data);if(token!==qualityRevision||models[mode]!==obj||el('msMode').value!==mode)return;quality=q;el('msQualityStatus').textContent=obj.name+' · '+file.name+' · '+name+' · '+q.values.length+' IDs · '+(q.coverage*100).toFixed(2)+'% coverage · manually associated source, not verified by hash';const max=Math.max(1,...q.histogram.map(b=>b.ids.length));for(const [i,b] of q.histogram.entries()){const button=document.createElement('button');button.type='button';button.className='btn soft';button.style.cssText='display:flex;align-items:center;gap:8px;width:100%;margin:3px 0;text-align:left';const label=document.createElement('span');label.textContent=b.low.toPrecision(4)+' – '+b.high.toPrecision(4)+' · '+b.ids.length;label.style.minWidth='145px';const bar=document.createElement('span');bar.style.cssText='display:block;height:10px;background:#d6a248;border-radius:3px;width:'+(100*b.ids.length/max)+'%';button.append(label,bar);button.onclick=()=>{qualityBin=i;selected=null;el('msSelection').textContent=b.ids.length+' metric IDs in selected range; preview sampled at most 3000. '+(b.ids.length?'First ID '+b.ids[0]:'');if(b.ids.length){el('msKind').value=kind;el('msId').value=String(b.ids[0])}redraw()};el('msQualityHistogram').append(button)}}catch(e){if(token===qualityRevision)el('msQualityStatus').textContent=e.message}};
el('msComputed').onchange=()=>{clearComputed();redraw()};
 el('msCompute').onclick=()=>{clearQuality();try{const mode=el('msMode').value,obj=models[mode];if(mode==='dict'||!obj)throw Error('Select native region mesh');const q=msCore.geometricMetric(obj.data,el('msComputed').value);computed={...q,source:obj.name};el('msComputedStatus').textContent=q.method+' · '+q.values.length+'/'+q.eligible+' valid · '+q.invalid.length+' invalid · '+q.unit;if(q.values.length){let lo=Infinity,hi=-Infinity;for(const r of q.values){lo=Math.min(lo,r.value);hi=Math.max(hi,r.value)}el('msLow').value=String(lo);el('msHigh').value=String(hi);el('msThreshold').disabled=false;el('msMetricExport').disabled=false}redraw()}catch(e){el('msComputedStatus').textContent=e.message}};
 for(const id of ['msLow','msHigh'])el(id).oninput=()=>{threshold=null;el('msThresholdStatus').textContent='';redraw()};
 el('msThreshold').onclick=()=>{threshold=null;try{if(!computed||!el('msLow').value.trim()||!el('msHigh').value.trim())throw Error('Compute metric and enter both bounds');threshold=msCore.metricThreshold(computed,Number(el('msLow').value),Number(el('msHigh').value));selected=null;el('msThresholdStatus').textContent=threshold.length+' IDs selected · preview sampled at most 3000';if(threshold.length){el('msKind').value=computed.kind;el('msId').value=String(threshold[0].id)}}catch(e){el('msThresholdStatus').textContent=e.message}redraw()};
 el('msMetricExport').onclick=()=>{if(!computed)return;const {values,...meta}=computed,rows=threshold===null?values:threshold;cgDownloadZip('FoamLens-mesh-geometry.zip',cgStoreZip([{name:'metric.csv',data:'id,value\n'+rows.map(r=>r.id+','+r.value).join('\n')},{name:'provenance.json',data:JSON.stringify({...meta,selectedCount:rows.length,threshold:threshold===null?null:[Number(el('msLow').value),Number(el('msHigh').value)]},null,2)}]))};
 el('msMode').onchange=()=>redraw(true);el('msGroup').onchange=()=>{selected=null;el('msSelection').textContent='';redraw()};el('msProjection').onchange=()=>redraw();
 el('msLocate').onclick=()=>{try{const obj=models[el('msMode').value],kind=el('msKind').value,raw=el('msId').value;if(!obj||!/^\d+$/.test(raw))throw Error('Select source and integer ID');const id=Number(raw);let detail;if(el('msMode').value==='dict'){if(kind==='faceSet')throw Error('Block face ID is not a native face ID');const b=obj.data.blocks[id],p=obj.data.vertices[id];if(kind==='cellSet'&&!b||kind==='pointSet'&&!p)throw Error('ID out of range');detail=kind==='cellSet'?JSON.stringify(b):'XYZ [m] '+p.join(', ')}else{const a=msCore.locate(obj.data,kind,id);detail='XYZ vertex mean [m]: '+a.point.join(', ')+' · faces: '+a.faces.join(', ')+' · vertices: '+a.vertices.join(', ')}selected={kind,id};el('msSelection').textContent=obj.name+' · '+kind+' '+id+' · '+detail;redraw()}catch(e){selected=null;el('msSelection').textContent=e.message;redraw()}};
 el('msDict').onchange=async()=>{const token=++revision.dict;models.dict=null;el('msMode').value='dict';redraw(true);try{const file=el('msDict').files[0];if(!file||file.size>4*1024*1024)throw Error('Select blockMeshDict up to 4 MiB');const data=msCore.blockDict(await file.text());if(token!==revision.dict)return;models.dict={name:file.name,data};status(cgUi('Original dictionary inspected; no mesh generated.','Diccionario original inspeccionado; no se generó malla.'));redraw(true)}catch(e){if(token===revision.dict)status(e.message)}};
 async function loadMesh(slot,input){const token=++revision[slot];models[slot]=null;resetMatch();opts(el(slot==='a'?'msPatchA':'msPatchB'),[]);el('msMode').value=slot;redraw(true);try{
  const files=[...input.files],required=['points','faces','owner','neighbour','boundary'],groups=new Map();for(const file of files){const path=file.webkitRelativePath.split('/'),name=path.pop(),dir=path.join('/');if(required.includes(name)&&path.at(-1)==='polyMesh'){const g=groups.get(dir)||{};if(g[name])throw Error('Duplicate mesh file');g[name]=file;groups.set(dir,g)}}
  const complete=[...groups].filter(([,g])=>required.every(n=>g[n]));if(complete.length!==1)throw Error('Select exactly one complete region polyMesh folder (ASCII, uncompressed)');const [dir,g]=complete[0];const sf=files.filter(f=>f.webkitRelativePath.startsWith(dir+'/sets/')&&f.webkitRelativePath.split('/').length===dir.split('/').length+2);if(sf.length>128||[...Object.values(g),...sf].some(f=>f.size>96*1024*1024)||[...Object.values(g),...sf].reduce((n,f)=>n+f.size,0)>160*1024*1024)throw Error('Mesh/set memory limit');
  const texts={};for(const n of required)texts[n]=await g[n].text();const data=msCore.poly(texts),sets=[],errors=[];for(const file of sf){try{sets.push(msCore.readSet(await file.text(),file.name,data))}catch(e){errors.push(file.name+': '+e.message)}}
  if(token!==revision[slot])return;models[slot]={name:dir,data,sets};opts(el(slot==='a'?'msPatchA':'msPatchB'),data.patches.map(p=>[p.name,p.name]));el('msMode').value=slot;status('Loaded '+dir+' · '+sets.length+' sets; source association by same folder and IDs, not run hash. '+errors.join(' | '));redraw(true)
 }catch(e){if(token===revision[slot])status(e.message)}}
 window.FoamLensLoadGeneratedMesh=(r,label)=>{const data=msCore.fromNativeReport(r);models.generated={name:label+' · Foundation '+r.version+' · generated snapshot',data,sets:[]};el('msMode').value='generated';panel.open=true;redraw(true);status(cgUi('Generated mesh loaded from native output; original A/B retained.','Malla generada cargada desde salida nativa; A/B originales conservadas.')+' · checkMesh exit '+(r.checkMeshExit??'—'));panel.scrollIntoView({block:'nearest'})};
 el('msFolderA').onchange=()=>loadMesh('a',el('msFolderA'));el('msFolderB').onchange=()=>loadMesh('b',el('msFolderB'));
 el('msPatchA').onchange=resetMatch;el('msPatchB').onchange=resetMatch;
 el('msMatch').onclick=()=>{resetMatch();try{if(!models.a||!models.b)throw Error('Load two native region meshes');const a=el('msPatchA').value,b=el('msPatchB').value,x=msCore.patchMatch(models.a.data,a,models.b.data,b);result={sourceA:models.a.name,sourceB:models.b.name,patchA:a,patchB:b,...x};const {pairs,...summary}=result;el('msMatchResult').textContent=JSON.stringify(summary);el('msExport').disabled=false}catch(e){el('msMatchResult').textContent=e.message}};
 el('msExport').onclick=()=>{if(result)cgDownloadZip('FoamLens-interface-inspection.zip',cgStoreZip([{name:'interface.json',data:JSON.stringify(result,null,2)},{name:'pairs.csv',data:'faceA,faceB,normalCosine\n'+result.pairs.map(p=>p.join(',')).join('\n')}]))};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',msMount,{once:true});else msMount();
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
 panel.innerHTML='<summary><b>Gmsh · MSH 2.2 / 4.1 ASCII / HEX8</b></summary><p class="cgNotice">'+t('Original node, element and physical group IDs. Explicit coordinate unit. Optional separate native conversion.','IDs originales de nodos, elementos y grupos físicos. Unidad explícita. Conversión nativa opcional por separado.')+'</p><div class="cgTools"><input id="mgFile" type="file" accept=".msh"><label>'+t('Source units','Unidades de origen')+' <select id="mgUnit"><option value="">—</option><option>m</option><option>mm</option><option>cm</option></select></label><button class="btn primary" id="mgLoad" type="button">'+t('Inspect','Inspeccionar')+'</button></div><p id="mgStatus" class="cgNotice" aria-live="polite"></p><div id="mgGroups"></div><div class="cgTools"><label>'+t('Element ID','ID elemento')+' <input id="mgId" type="number" min="1" step="1"></label><button class="btn soft" id="mgLocate" type="button">'+t('Inspect element','Inspeccionar elemento')+'</button></div><p id="mgElement" class="cgNotice"></p><div id="mgView"></div><div class="cgTools"><label>Surface <select id="mgSurface"></select></label><label>Volume A <select id="mgA"></select></label><label>Volume B <select id="mgB"></select></label><button class="btn soft" id="mgMatch" type="button">'+t('Check shared HEX8 contact','Comprobar contacto HEX8 compartido')+'</button><button class="btn soft" id="mgExport" disabled type="button">ZIP</button></div><p id="mgResult" class="cgNotice"></p><div class="cgTools"><label>'+t('Contact selection','Selección de contacto')+' <select id="mgFilter"><option value="all">'+t('All','Todas')+'</option><option value="paired">'+t('Paired','Emparejadas')+'</option><option value="missing">'+t('Missing side','Sin pareja')+'</option><option value="ambiguous">'+t('Ambiguous','Ambiguas')+'</option><option value="invalid">'+t('Invalid area','Área inválida')+'</option></select></label><label>'+t('Projection','Proyección')+' <select id="mgProjection"><option>ISO</option><option>XY</option><option>XZ</option><option>YZ</option></select></label></div><div id="mgContactView"></div><p id="mgContactInfo" class="cgNotice"></p><div class="cgTools"><label>Foundation <select id="mgNativeVersion"><option>14</option><option>13</option></select></label><button class="btn primary" id="mgConvert" disabled type="button">gmshToFoam + checkMesh</button><button class="btn soft" id="mgCancel" disabled type="button">'+t('Cancel','Cancelar')+'</button><button class="btn soft" id="mgInspectNative" disabled type="button">'+t('Inspect native mesh','Inspeccionar malla nativa')+'</button><button class="btn soft" id="mgNativeExport" disabled type="button">'+t('Export conversion ZIP','Exportar conversión ZIP')+'</button></div><p class="cgNotice">'+t('Only QUAD4/HEX8 with a single physical group each. Canonical MSH2.2 in meters; physical aliases mapped explicitly. No native ID correspondence inferred.','Solo QUAD4/HEX8 con un grupo físico por elemento. MSH2.2 canónico en metros; alias físicos documentados. No se infiere correspondencia de IDs nativos.')+'</p><p id="mgNativeStatus" class="cgNotice" aria-live="polite"></p><pre id="mgNativeLogs" style="white-space:pre-wrap;max-height:260px;overflow:auto"></pre>';
 anchor.insertAdjacentElement('afterend',panel);const el=id=>panel.querySelector('#'+id);let model=null,result=null,rev=0,source=null,native=null,task=null,convertRev=0;
 const opts=(id,items)=>{el(id).replaceChildren();for(const [key,g] of items){const o=document.createElement('option');o.value=key;o.textContent=g.name+' ['+key+']';el(id).append(o)}};
 function clearMatch(){result=null;for(const id of ['mgResult','mgContactView','mgContactInfo'])el(id).textContent='';el('mgExport').disabled=true}
 function clear(){rev++;model=null;clearNative();source=null;clearMatch();for(const id of ['mgGroups','mgElement','mgView'])el(id).textContent='';for(const id of ['mgSurface','mgA','mgB'])opts(id,[])}
 el('mgFile').onchange=el('mgUnit').onchange=()=>{clear();el('mgStatus').textContent=cgUi('Select unit and Inspect.','Selecciona unidad e Inspeccionar.')};
 el('mgLoad').onclick=async()=>{clear();const token=rev;try{const file=el('mgFile').files[0],unit=el('mgUnit').value;if(!file||file.size>96*1024*1024||!unit)throw Error('Select ASCII MSH <= 96 MiB and explicit unit');el('mgStatus').textContent='Reading '+file.name;const data=mgCore.parse(await file.text(),unit);if(token!==rev)return;model=data;source=file.name;el('mgStatus').textContent=file.name+' · MSH '+data.version+' · '+data.points.size+' nodes · '+data.elements.size+' elements · '+unit+' → m';const table=document.createElement('table');for(const [k,g] of data.groups){const row=table.insertRow();for(const value of [k,g.name,g.count,JSON.stringify(g.types)])row.insertCell().textContent=String(value)}el('mgGroups').append(table);const a=[...data.groups].filter(([,g])=>g.dim===3&&g.count),b=[...data.groups].filter(([,g])=>g.dim===2&&g.count);opts('mgSurface',b);opts('mgA',a);opts('mgB',a);if(a.length>1)el('mgB').selectedIndex=1;nativeButtons()}catch(e){if(token===rev)el('mgStatus').textContent=e.message}};
 el('mgLocate').onclick=()=>{el('mgElement').textContent='';el('mgView').textContent='';try{if(!model||!/^\d+$/.test(el('mgId').value))throw Error('Select mesh and integer element ID');const e=model.elements.get(Number(el('mgId').value));if(!e)throw Error('Unknown element ID');const p=e.nodes.map(n=>model.points.get(n));el('mgElement').textContent=JSON.stringify(e)+' · XYZ [m] '+JSON.stringify(p);const points=p.map(a=>[(a[0]-a[2])*.707,a[1]+(a[0]+a[2])*.408]),lo=[Math.min(...points.map(a=>a[0])),Math.min(...points.map(a=>a[1]))],hi=[Math.max(...points.map(a=>a[0])),Math.max(...points.map(a=>a[1]))],s=Math.min(280/(hi[0]-lo[0]||1),170/(hi[1]-lo[1]||1)),xy=a=>[160+(a[0]-(lo[0]+hi[0])/2)*s,100-(a[1]-(lo[1]+hi[1])/2)*s],edges=e.type===5?msCore.edges:e.type===3?[[0,1],[1,2],[2,3],[3,0]]:e.type===2?[[0,1],[1,2],[2,0]]:[];el('mgView').innerHTML='<svg viewBox="0 0 320 200" style="max-width:420px;width:100%;background:#101b2c">'+edges.map(([i,j])=>'<polyline points="'+xy(points[i]).join(',')+' '+xy(points[j]).join(',')+'" fill="none" stroke="#ffb74d" stroke-width="2"/>').join('')+points.map(a=>{const [x,y]=xy(a);return '<circle cx="'+x+'" cy="'+y+'" r="3" fill="#dbe5ef"/>'}).join('')+'</svg>'}catch(e){el('mgElement').textContent=e.message}};
 function nativeButtons(){el('mgConvert').disabled=!!task||!model||!window.chrome?.webview?.postMessage;el('mgCancel').disabled=!task;el('mgInspectNative').disabled=!!task||!native?.report.meshGenerated||!Object.keys(native?.report.files||{}).length;el('mgNativeExport').disabled=!!task||!native}
 function clearNative(){convertRev++;if(task)task.cancel();native=null;el('mgNativeStatus').textContent='';el('mgNativeLogs').textContent='';nativeButtons()}
 el('mgNativeVersion').onchange=clearNative;el('mgCancel').onclick=()=>{if(task){task.cancel();el('mgNativeStatus').textContent=cgUi('Cancellation requested','Cancelación solicitada')}};
 el('mgConvert').onclick=async()=>{if(task||!model)return;let token;try{const canonical=mgCore.canonical(model),version=el('mgNativeVersion').value;clearNative();token=convertRev;task=flMeshNativeRequest('runGmshMesh',{version,msh:canonical.msh});nativeButtons();el('mgNativeStatus').textContent='gmshToFoam → checkMesh · '+canonical.volumes+' HEX8';const report=await task.promise;if(token!==convertRev)return;if(report?.schema!=='foamlens/native-gmsh-mesh/1'||report.originalCaseModified!==false||report.plannedCells!==canonical.volumes)throw Error('Unexpected conversion report');const {msh,...mapping}=canonical;native={report,mapping,source};el('mgNativeStatus').textContent='Foundation '+(report.version||'—')+' · gmshToFoam exit '+(report.generationExit??'—')+' · checkMesh exit '+(report.checkMeshExit??'—')+' · '+Object.keys(report.files||{}).length+' files · '+(report.exportError||'review logs');el('mgNativeLogs').textContent=[report.stderr,report.stdout,report.gmshLog,report.checkMeshLog].filter(Boolean).join('\n\n')}catch(e){if(token===undefined||token===convertRev)el('mgNativeStatus').textContent=e.message}finally{task=null;nativeButtons()}};
 el('mgInspectNative').onclick=()=>{try{window.FoamLensLoadGeneratedMesh(native.report,'gmshToFoam · '+native.source)}catch(e){el('mgNativeStatus').textContent=e.message}};
 el('mgNativeExport').onclick=()=>{if(!native)return;try{const {files,gmshLog,checkMeshLog,dictionary,...meta}=native.report,entries=[{name:'report.json',data:JSON.stringify({...meta,source:native.source,mapping:native.mapping},null,2)}];if(gmshLog)entries.push({name:'gmshToFoam.log',data:gmshLog});if(checkMeshLog)entries.push({name:'checkMesh.log',data:checkMeshLog});for(const [name,data] of Object.entries(files||{})){if(!/^constant\/polyMesh\/(points|faces|owner|neighbour|boundary|cellZones|faceZones|pointZones)$/.test(name)||typeof data!=='string')throw Error('Invalid mesh output');entries.push({name,data})}cgDownloadZip('FoamLens-gmsh-conversion.zip',cgStoreZip(entries))}catch(e){el('mgNativeStatus').textContent=e.message}};
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
