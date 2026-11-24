// CAD-only Cartesian blockMesh designer. No case writes, native runs or invented interfaces.
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
/* FOAMLENS_BLOCKMESH_DESIGN_CORE_END */
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
    '<p id="cmbStatus" class="cgNotice" aria-live="polite"></p><div id="cmbView"></div>';
  anchor.insertAdjacentElement('afterend',panel);
  const el=id=>document.getElementById(id);let plan=null;
  const input=()=>({axes:['X','Y','Z'].map(a=>el('cmb'+a).value),patches:Array.from({length:6},(_,i)=>el('cmbPatch'+i).value.trim()),zones:el('cmbZones').value});
  const invalidate=()=>{plan=null;el('cmbExport').disabled=true;el('cmbView').textContent='';el('cmbStatus').textContent=cgUi('Inputs changed; rebuild plan.','Entradas modificadas; vuelve a generar el plan.')};
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
  const build=()=>{try{plan=cmbPlan(input());el('cmbExport').disabled=false;el('cmbStatus').textContent=cgUi('Cartesian plan ready; no mesh has been generated.','Plan cartesiano listo; no se ha generado malla.');draw()}catch(e){invalidate();el('cmbStatus').textContent=String(e.message)}};
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
window.FoamLensCartesianBlockMesh={plan:cmbPlan,dictionary:cmbDictionary,slice:cmbSlice};
