/* FoamLens CAD Surface Inspector: local, read-only STL/OBJ inspection.  Not a STEP or volume-mesh engine. */
/* FOAMLENS_CAD_CORE_START */
const cgLimitTriangles=200000;
function cgNumber(n){const v=Number(n);if(!Number.isFinite(v))throw new Error('Non-finite geometry coordinate');return v}
function cgVec(x,y,z){return [cgNumber(x),cgNumber(y),cgNumber(z)]}
function cgCross(a,b){return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]}
function cgSub(a,b){return [a[0]-b[0],a[1]-b[1],a[2]-b[2]]}
function cgDot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]}
function cgNorm(a){return Math.hypot(a[0],a[1],a[2])}
function cgSafeName(name){return String(name||'surface').replace(/[^a-zA-Z0-9_.-]/g,'_').slice(0,90)||'surface'}
function cgTriangle(a,b,c,part){return {vertices:[a,b,c],part:String(part||'surface').slice(0,120)}}
function cgParseStl(input,sourceName='surface.stl'){
  const b=input instanceof ArrayBuffer?input:(ArrayBuffer.isView(input)?input.buffer.slice(input.byteOffset,input.byteOffset+input.byteLength):null);
  if(!b||b.byteLength<15)throw new Error('STL file missing or too short');
  const view=new DataView(b);
  const bytes=new Uint8Array(b);
  const count=b.byteLength>=84?view.getUint32(80,true):0;
  let triangles=[],format='ascii-stl';
  if(b.byteLength>=84 && count>0 && 84+count*50===b.byteLength){
    if(count>cgLimitTriangles)throw new Error('Geometry exceeds triangle safety limit');
    format='binary-stl';
    for(let i=0;i<count;i++){
      const base=84+i*50,vertices=[];
      for(let j=0;j<3;j++)vertices.push(cgVec(view.getFloat32(base+12+j*12,true),view.getFloat32(base+16+j*12,true),view.getFloat32(base+20+j*12,true)));
      triangles.push(cgTriangle(vertices[0],vertices[1],vertices[2],sourceName.replace(/\.stl$/i,'')));
    }
  }else{
    const s=new TextDecoder('utf-8',{fatal:false}).decode(bytes);
    if(!/^\s*solid(?:\s|$)/i.test(s)||!/\bfacet\s+normal\b/i.test(s))throw new Error('Invalid/truncated STL or unrecognized binary STL length');
    let part=sourceName.replace(/\.stl$/i,''),verts=[],facets=0;
    for(const line of s.split(/\r?\n/)){
      const sol=/^\s*solid(?:\s+(.+))?\s*$/i.exec(line);
      if(sol&&sol[1]&&facets===0)part=sol[1].trim();
      const vertex=/^\s*vertex\s+(\S+)\s+(\S+)\s+(\S+)\s*$/i.exec(line);
      if(vertex){verts.push(cgVec(vertex[1],vertex[2],vertex[3]));if(verts.length>3)throw new Error('STL facet has too many vertices')}
      if(/^\s*endfacet\b/i.test(line)){
        if(verts.length!==3)throw new Error('STL facet must have exactly three vertices');
        triangles.push(cgTriangle(verts[0],verts[1],verts[2],part));verts=[];facets++;
        if(triangles.length>cgLimitTriangles)throw new Error('Geometry exceeds triangle safety limit');
      }
    }
    if(verts.length||!triangles.length||facets!==triangles.length)throw new Error('STL contains incomplete facets or no triangles');
  }
  return {format,triangles,sourceName}
}
function cgParseObj(text,sourceName='surface.obj'){
  if(typeof text!=='string'||text.length>32*1024*1024)throw new Error('OBJ missing or exceeds 32 MiB');
  const vertices=[],triangles=[],warnings=[],groups=new Set();
  let part=sourceName.replace(/\.obj$/i,''),faceCount=0;
  for(const raw of text.split(/\r?\n/)){
    const line=raw.trim();if(!line||line.startsWith('#'))continue;
    const parts=line.split(/\s+/),kind=parts[0];
    if(kind==='v'){
      if(parts.length<4)throw new Error('OBJ vertex lacks XYZ coordinates');
      vertices.push(cgVec(parts[1],parts[2],parts[3]));
    }else if(kind==='o'||kind==='g'){
      if(parts.length>1)part=parts.slice(1).join(' ').slice(0,120);
    }else if(kind==='f'){
      const refs=parts.slice(1);
      if(refs.length<3)throw new Error('OBJ face with fewer than three vertices');
      if(refs.length>3)warnings.push('Polygon fan triangulation assumes a simple convex polygon; verify shape in CAD.');
      const poly=refs.map(token=>{
        const rawIdx=token.split('/')[0],idx=Number(rawIdx);
        if(!/^-?\d+$/.test(rawIdx)||!idx||!Number.isSafeInteger(idx))throw new Error('Invalid OBJ face index');
        const n=idx>0?idx-1:vertices.length+idx;
        if(n<0||n>=vertices.length)throw new Error('OBJ face index outside vertex table');
        return vertices[n]
      });
      for(let j=1;j<poly.length-1;j++){
        triangles.push(cgTriangle(poly[0],poly[j],poly[j+1],part));
        if(triangles.length>cgLimitTriangles)throw new Error('Geometry exceeds triangle safety limit');
      }
      faceCount++;groups.add(part);
    }
  }
  if(!faceCount||!triangles.length)throw new Error('OBJ contains no supported polygon faces');
  return {format:'obj-surface',triangles,sourceName,warnings}
}
function cgSummary(triangles){
  if(!Array.isArray(triangles)||!triangles.length)throw new Error('No surface triangles');
  const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity],parts=new Map();
  for(const tri of triangles){for(const v of tri.vertices){for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],cgNumber(v[k]));hi[k]=Math.max(hi[k],v[k])}}parts.set(tri.part,(parts.get(tri.part)||0)+1)}
  const diagonal=cgNorm(cgSub(hi,lo)),tol=Math.max(diagonal*1e-9,1e-12);
  const pointKey=v=>v.map(x=>Math.round(x/tol)).join(',');
  const edges=new Map();let area=0,signedVolume=0,degenerate=0;
  for(const tri of triangles){
    const [a,b,c]=tri.vertices,normal=cgCross(cgSub(b,a),cgSub(c,a)),ar=cgNorm(normal)*.5;
    if(ar<=tol*tol){degenerate++;continue}
    area+=ar;signedVolume+=cgDot(a,cgCross(b,c))/6;
    const key=[pointKey(a),pointKey(b),pointKey(c)];
    for(let j=0;j<3;j++){
      const x=key[j],y=key[(j+1)%3],first=x<y?x:y,second=x<y?y:x,e=first+'|'+second;
      const info=edges.get(e)||{count:0,direction:0};
      info.count++;info.direction+=x<y?1:-1;edges.set(e,info);
    }
  }
  let boundaryEdges=0,nonManifoldEdges=0,orientationConflicts=0;
  for(const e of edges.values()){
    if(e.count===1)boundaryEdges++;
    if(e.count>2)nonManifoldEdges++;
    if(e.count===2&&e.direction!==0)orientationConflicts++;
  }
  const closed=degenerate===0&&boundaryEdges===0&&nonManifoldEdges===0&&orientationConflicts===0;
  return {triangles:triangles.length,parts:[...parts].map(([name,count])=>({name,count})),
    bounds:{min:lo,max:hi,size:hi.map((x,k)=>x-lo[k])},area,degenerate,
    boundaryEdges,nonManifoldEdges,orientationConflicts,closedWinding:closed,
    enclosedVolumeEstimate:closed?Math.abs(signedVolume):null,
    toleranceSourceUnits:tol,
    limitations:['Surface only: not an OpenFOAM polyMesh or proof of CFD-ready meshing.',
      'STL/OBJ coordinates have no independently verified physical unit.',
      'Edge checks use vertex welding tolerance; self-intersections and internal shell nesting are not certified.',
      'Volume is an orientation-based estimate only for closed, consistently wound triangle surfaces.']}
}
function cgMakeAsciiStl(triangles,name='surface',scale=1){
  if(!(scale>0&&Number.isFinite(scale)))throw new Error('Explicit positive unit scale required');
  const clean=cgSafeName(name),rows=['solid '+clean];
  for(const tri of triangles){
    const vv=tri.vertices.map(v=>v.map(x=>x*scale));
    const cross=cgCross(cgSub(vv[1],vv[0]),cgSub(vv[2],vv[0])),mag=cgNorm(cross),normal=mag?cross.map(x=>x/mag):[0,0,0];
    rows.push(' facet normal '+normal.join(' '),'  outer loop');
    for(const v of vv)rows.push('   vertex '+v.join(' '));
    rows.push('  endloop',' endfacet');
  }
  rows.push('endsolid '+clean);return rows.join('\n')+'\n'
}
function cgUnitScale(unit){return {m:1,mm:.001,cm:.01,in:.0254}[unit]||null}
/* FOAMLENS_CAD_CORE_END */

function cgUi(en,es){try{return typeof flUi==='function'?flUi(en,es):en}catch{return en}}
function cgEscape(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
let cgModels=[],cgYaw=.55,cgPitch=-.4,cgZoom=1,cgActive=false;
function cgDownload(name,data,mime){
  if(typeof downloadText==='function'){downloadText(name,data,mime);return}
  const u=URL.createObjectURL(new Blob([data],{type:mime})),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),2500)
}
function cgShow(msg){const el=document.getElementById('cgStatus');if(el)el.textContent=msg}
function cgRenderInventory(){
  const el=document.getElementById('cgInventory');if(!el)return;
  if(!cgModels.length){el.textContent=cgUi('No surfaces imported.','Sin superficies importadas.');return}
  el.innerHTML=cgModels.map((m,i)=>{
    const sum=m.summary,fmt=x=>Number(x).toPrecision(5),unit=m.unit||'unknown';
    return '<div class="cgItem"><label><input type="checkbox" data-cg-show="'+i+'" '+(m.visible?'checked':'')+'> <strong>'+cgEscape(m.name)+'</strong></label>'+
      '<div>'+cgEscape(m.format)+' · '+sum.triangles+' triangles · '+sum.parts.length+' named parts</div>'+
      '<label>Source coordinate unit (this file): <select data-cg-unit="'+i+'">'+
      [['unknown','Unknown / not confirmed'],['m','Meters'],['mm','Millimeters'],['cm','Centimeters'],['in','Inches']].map(x=>'<option value="'+x[0]+'" '+(x[0]===unit?'selected':'')+'>'+x[1]+'</option>').join('')+'</select></label>'+
      '<div>X '+fmt(sum.bounds.size[0])+' · Y '+fmt(sum.bounds.size[1])+' · Z '+fmt(sum.bounds.size[2])+' ['+cgEscape(unit)+'] · area '+fmt(sum.area)+' ['+cgEscape(unit)+'²]</div>'+
      '<div>'+cgEscape(sum.closedWinding?'Closed/oriented edge test passed (self-intersections not checked)':'Open, inconsistent or degenerate surface')+
      ' · boundary edges '+sum.boundaryEdges+' · nonmanifold '+sum.nonManifoldEdges+' · winding conflicts '+sum.orientationConflicts+' · degenerate '+sum.degenerate+'</div>'+
      '<div>Volume estimate: '+(sum.enclosedVolumeEstimate===null?'unavailable':fmt(sum.enclosedVolumeEstimate)+' ['+cgEscape(unit)+'³]')+'</div>'+
      '<div class="cgParts">Visible named parts: '+sum.parts.map(p=>'<label style="margin:4px 12px 4px 0;display:inline-flex;gap:5px;align-items:center"><input type="checkbox" data-cg-part="'+i+'|'+cgEscape(p.name)+'" '+(m.partsVisible.get(p.name)?'checked':'')+'> '+cgEscape(p.name)+' ('+p.count+')</label>').join('')+'</div>'+
      (m.warnings.length?'<div>'+cgEscape(m.warnings.join('; '))+'</div>':'')+'</div>'
  }).join('');
  el.querySelectorAll('[data-cg-show]').forEach(ch=>ch.addEventListener('change',()=>{cgModels[Number(ch.dataset.cgShow)].visible=ch.checked;cgDraw()}));
  el.querySelectorAll('[data-cg-part]').forEach(ch=>ch.addEventListener('change',()=>{
    const key=ch.dataset.cgPart,sep=key.indexOf('|'),i=Number(key.slice(0,sep)),part=key.slice(sep+1),m=cgModels[i];
    if(m)m.partsVisible.set(part,ch.checked);cgDraw()
  }));
  el.querySelectorAll('[data-cg-unit]').forEach(sel=>sel.addEventListener('change',()=>{
    const m=cgModels[Number(sel.dataset.cgUnit)];if(!m)return;
    m.unit=sel.value;cgRenderInventory()
  }));
  cgRefreshExport();cgDraw()
}
function cgRefreshExport(){
  const select=document.getElementById('cgPart'),exportBtn=document.getElementById('cgExportStl');
  if(!select||!exportBtn)return;
  const old=select.value,parts=[];
  cgModels.forEach((m,i)=>m.summary.parts.forEach(p=>parts.push({key:i+'|'+p.name,label:m.name+' / '+p.name+' ('+p.count+')'})));
  select.innerHTML=parts.map(p=>'<option value="'+cgEscape(p.key)+'">'+cgEscape(p.label)+'</option>').join('');
  if(parts.some(p=>p.key===old))select.value=old;
  const key=String(select.value||''),index=Number(key.split('|')[0]),model=cgModels[index],scale=cgUnitScale(model?.unit);
  exportBtn.disabled=!parts.length||!scale;
  const note=document.getElementById('cgUnitWarning');
  if(note)note.textContent=scale?
    cgUi('Selected source coordinate unit explicitly mapped to meters. Verify dimensions before using OpenFOAM.','Unidad de origen seleccionada; conversión a metros. Comprueba las dimensiones antes de usar OpenFOAM.'):
    cgUi('Unknown STL/OBJ source units: export is disabled until you explicitly confirm units.','Unidades STL/OBJ desconocidas: exportación desactivada hasta confirmar unidades.')
}
async function cgImport(){
  const input=document.getElementById('cgFiles'),files=[...(input?.files||[])];
  if(!files.length)return;
  if(files.length>12){cgShow('Limit: 12 geometry files per import.');return}
  let added=0,errors=[];
  for(const f of files){
    try{
      if(f.size>32*1024*1024)throw new Error('32 MiB file safety limit');
      const ext=f.name.split('.').pop().toLowerCase();
      if(['step','stp','iges','igs','brep'].includes(ext))throw new Error('B-rep CAD requires a verified OCCT kernel; conversion has NOT been performed');
      const result=ext==='stl'?cgParseStl(await f.arrayBuffer(),f.name):ext==='obj'?cgParseObj(await f.text(),f.name):null;
      if(!result)throw new Error('Supported in this preview: STL and OBJ');
      if(cgModels.reduce((n,m)=>n+m.triangles.length,0)+result.triangles.length>300000)throw new Error('Combined imported geometry exceeds 300,000-triangle interactive preview limit');
      const sum=cgSummary(result.triangles),byPart=new Map();
      for(const tri of result.triangles){if(!byPart.has(tri.part))byPart.set(tri.part,[]);byPart.get(tri.part).push(tri)}
      if(byPart.size>1000)throw new Error('Geometry exceeds named-part safety limit (1000)');
      const partSummaries=new Map([...byPart].map(([name,subset])=>[name,cgSummary(subset)])),
        partsVisible=new Map([...byPart.keys()].map(name=>[name,true]));
      cgModels.push({name:f.name,bytes:f.size,format:result.format,triangles:result.triangles,summary:sum,
        partSummaries,partsVisible,warnings:result.warnings||[],unit:'unknown',visible:true});
      added++;
    }catch(e){errors.push(f.name+': '+String(e?.message||e))}
    // Relinquish the UI turn during large batches.
    await new Promise(resolve=>setTimeout(resolve,0))
  }
  cgRenderInventory();cgShow(cgUi('Imported ','Importados ')+added+' / '+files.length+'. '+errors.join(' | '));input.value=''
}
function cgExport(){
  const key=String(document.getElementById('cgPart')?.value||''),sep=key.indexOf('|'),index=Number(key.slice(0,sep)),part=key.slice(sep+1);
  const unit=cgModels[index]?.unit,scale=cgUnitScale(unit);
  if(sep<0||!scale||!cgModels[index]){cgShow('Confirm source units and choose a named part.');return}
  const model=cgModels[index],subset=model.triangles.filter(t=>t.part===part),sum=cgSummary(subset),name=cgSafeName(part);
  if(sum.degenerate||sum.nonManifoldEdges||sum.boundaryEdges||sum.orientationConflicts){
    if(!window.confirm('This surface has topology warnings. Export as an unvalidated triSurface anyway?'))return
  }
  const manifest={schema:'foamlens/cad-surface-export/1',sourceFile:model.name,sourceFormat:model.format,sourceBytes:model.bytes,
    part,exportFile:name+'.stl',exportType:'ASCII STL triangulated surface (NOT volume mesh)',sourceUnitConfirmedByUser:unit,
    sourceToMeterScale:scale,outputCoordinates:'meters',sourceMetrics:sum,
    openFoamCaseMutated:false,toolsExecuted:[],limitations:sum.limitations,generatedAt:new Date().toISOString()};
  cgDownload(name+'.stl',cgMakeAsciiStl(subset,name,scale),'model/stl');
  cgDownload(name+'.manifest.json',JSON.stringify(manifest,null,2),'application/json');
  cgShow('Exported named surface + provenance manifest locally. Run surfaceCheck/meshing separately after choosing your OpenFOAM version.')
}
function cgDraw(){
  const canvas=document.getElementById('cgCanvas');if(!canvas)return;
  const w=canvas.clientWidth||720,h=canvas.clientHeight||440,dpr=Math.min(2,window.devicePixelRatio||1);
  if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=w*dpr;canvas.height=h*dpr}
  const ctx=canvas.getContext('2d');if(!ctx)return;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
  ctx.fillStyle='#101b2c';ctx.fillRect(0,0,w,h);
  const active=cgModels.filter(m=>m.visible),
    total=active.reduce((n,m)=>n+[...m.partsVisible].reduce((k,[part,visible])=>k+(visible?(m.partSummaries.get(part)?.triangles||0):0),0),0);
  if(!total){ctx.fillStyle='#bdcbdc';ctx.font='15px sans-serif';ctx.fillText('Import STL/OBJ to inspect surface geometry',20,34);return}
  const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
  for(const m of active)for(const [part,visible] of m.partsVisible){
    if(!visible)continue;const b=m.partSummaries.get(part)?.bounds;if(!b)continue;
    for(let i=0;i<3;i++){min[i]=Math.min(min[i],b.min[i]);max[i]=Math.max(max[i],b.max[i])}
  }
  const bounds={min,max,size:max.map((v,i)=>v-min[i])},mid=min.map((x,i)=>(x+max[i])/2);
  const size=Math.max(...bounds.size,1e-12),scale=Math.min(w*.76,h*.76)/size*cgZoom;
  const rotate=v=>{
    const x=v[0]-mid[0],y=v[1]-mid[1],z=v[2]-mid[2],
      cy=Math.cos(cgYaw),sy=Math.sin(cgYaw),cp=Math.cos(cgPitch),sp=Math.sin(cgPitch);
    const a=cy*x+sy*z,b=-sy*x+cy*z;
    return [w/2+scale*a,h/2-scale*(cp*y-sp*b),sp*y+cp*b]
  };
  const step=Math.max(1,Math.ceil(total/2800)),polys=[];
  let ordinal=0;
  for(const model of active)for(const tri of model.triangles){
    if(!model.partsVisible.get(tri.part))continue;
    if((ordinal++%step)!==0)continue;
    const p=tri.vertices.map(rotate);
    polys.push({p,z:(p[0][2]+p[1][2]+p[2][2])/3})
  }
  polys.sort((a,b)=>a.z-b.z);
  for(const {p} of polys){ctx.beginPath();ctx.moveTo(p[0][0],p[0][1]);ctx.lineTo(p[1][0],p[1][1]);ctx.lineTo(p[2][0],p[2][1]);ctx.closePath();ctx.fillStyle='rgba(65,170,205,.27)';ctx.fill();ctx.strokeStyle='rgba(121,209,243,.44)';ctx.lineWidth=.6;ctx.stroke()}
  ctx.font='12px sans-serif';ctx.fillStyle='#d6e7f1';
  const b=bounds.size;ctx.fillText('X '+b[0].toPrecision(5)+'   Y '+b[1].toPrecision(5)+'   Z '+b[2].toPrecision(5)+'  (unverified source units)',16,24);
  ctx.fillText('Surface preview · '+polys.length+' / '+total+' triangles displayed · selected visible parts only · not an OpenFOAM volume mesh',16,h-15)
}
function cgInstall(){
  if(document.getElementById('cgShell'))return;
  const anchor=document.getElementById('dataImportMore')||document.getElementById('datasetModeBlock');if(!anchor)return;
  const launch=document.createElement('button');launch.id='cgLaunch';launch.type='button';launch.className='btn soft';launch.textContent='CAD & Geometry · STL/OBJ';launch.style.cssText='width:100%;margin:6px 0 10px';anchor.insertAdjacentElement('afterend',launch);
  const sheet=document.createElement('section');sheet.id='cgShell';sheet.hidden=true;sheet.setAttribute('role','dialog');sheet.setAttribute('aria-modal','true');sheet.setAttribute('aria-label','CAD & Geometry');
  const css=document.createElement('style');css.textContent=
    '#cgShell[hidden]{display:none!important}#cgShell{position:fixed;inset:0;z-index:12000;background:rgba(5,12,23,.96);color:#eaf1fc;overflow:auto;padding:18px;box-sizing:border-box}' +
    '#cgShell *{box-sizing:border-box}#cgShell .cgInner{max-width:1180px;margin:0 auto;display:grid;gap:12px}#cgShell .cgHeader{display:flex;align-items:center;justify-content:space-between;gap:12px}' +
    '#cgShell .cgTools{display:flex;gap:9px;flex-wrap:wrap;align-items:center}#cgShell .cgTools label{font-size:12px}#cgShell button,#cgShell select,#cgShell input{min-height:34px}' +
    '#cgShell #cgCanvas{display:block;width:100%;height:min(55vh,520px);min-height:260px;border:1px solid #3b5578;border-radius:12px;touch-action:none;cursor:grab}' +
    '#cgShell .cgItem{padding:11px;border:1px solid #37526e;border-radius:9px;margin:7px 0;font-size:12px;line-height:1.6}' +
    '#cgShell .cgNotice{font-size:12px;color:#c8d6e9}#cgShell select{max-width:300px;min-width:120px}#cgShell button{cursor:pointer}';
  document.head.appendChild(css);
  sheet.innerHTML='<div class="cgInner"><div class="cgHeader"><div><h2>CAD & Geometry — Surface Inspector</h2><p class="cgNotice">Local STL/OBJ surface inspection only. STEP/IGES/BREP conversion requires a verified CAD kernel. No OpenFOAM case is modified.</p></div><button class="btn" id="cgClose" type="button">Close</button></div>'+
    '<div class="cgTools"><label>Import local STL/OBJ <input id="cgFiles" type="file" multiple accept=".stl,.obj,.stp,.step,.iges,.igs,.brep"></label><button class="btn primary" id="cgImport" type="button">Inspect surfaces</button>'+
    '<button class="btn" data-cg-view="iso">Isometric</button><button class="btn" data-cg-view="top">Top</button><button class="btn" data-cg-view="front">Front</button><button class="btn" data-cg-view="side">Right</button><button class="btn" data-cg-view="fit">Fit</button></div>'+
    '<canvas id="cgCanvas" aria-label="Rotatable 3D surface projection; drag to orbit, wheel to zoom"></canvas>'+
    '<div id="cgStatus" class="cgNotice" aria-live="polite">Choose STL or OBJ from your computer.</div>'+
    '<div id="cgInventory" aria-label="Imported surface parts"></div>'+
    '<div class="cgTools">'+
    '<label>Named part <select id="cgPart"></select></label><button id="cgExportStl" class="btn primary" disabled type="button">Export named STL in meters + manifest</button></div>'+
    '<p id="cgUnitWarning" class="cgNotice"></p>'+
    '<p class="cgNotice">Triangulated geometry is not a volumetric mesh; the importer does not execute surfaceCheck, checkMesh, blockMesh, snappyHexMesh or a CFD solver. Edge checks do not prove self-intersection-free CAD. Keep the original file.</p></div>';
  document.body.appendChild(sheet);
  launch.onclick=()=>{cgActive=true;sheet.hidden=false;cgDraw();document.getElementById('cgClose').focus()};
  const close=()=>{sheet.hidden=true;cgActive=false;launch.focus()};
  document.getElementById('cgClose').onclick=close;
  document.addEventListener('keydown',e=>{if(cgActive&&e.key==='Escape')close()});
  document.getElementById('cgImport').onclick=()=>void cgImport();
  document.getElementById('cgExportStl').onclick=cgExport;
  document.getElementById('cgPart').addEventListener('change',cgRefreshExport);
  sheet.querySelectorAll('[data-cg-view]').forEach(b=>b.onclick=()=>{
    const v=b.dataset.cgView;if(v==='iso'){cgYaw=.55;cgPitch=-.4}else if(v==='top'){cgYaw=0;cgPitch=-Math.PI/2}else if(v==='front'){cgYaw=0;cgPitch=0}else if(v==='side'){cgYaw=Math.PI/2;cgPitch=0}else cgZoom=1;cgDraw()
  });
  const canvas=document.getElementById('cgCanvas');let down=null;
  canvas.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY,yaw:cgYaw,pitch:cgPitch};canvas.setPointerCapture(e.pointerId)});
  canvas.addEventListener('pointermove',e=>{if(!down)return;cgYaw=down.yaw+(e.clientX-down.x)*.007;cgPitch=Math.max(-Math.PI/2,Math.min(Math.PI/2,down.pitch+(e.clientY-down.y)*.007));cgDraw()});
  canvas.addEventListener('pointerup',()=>down=null);canvas.addEventListener('pointercancel',()=>down=null);
  canvas.addEventListener('wheel',e=>{e.preventDefault();cgZoom=Math.max(.1,Math.min(16,cgZoom*(e.deltaY>0?.9:1.1)));cgDraw()},{passive:false});
  window.addEventListener('resize',()=>{if(cgActive)cgDraw()});
  cgRefreshExport()
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',cgInstall,{once:true});else cgInstall();
window.FoamLensCadSurface={parseStl:cgParseStl,parseObj:cgParseObj,summarize:cgSummary,exportAsciiStl:cgMakeAsciiStl,unitScale:cgUnitScale};
