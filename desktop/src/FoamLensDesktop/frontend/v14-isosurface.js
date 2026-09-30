/* FoamLens Desktop v1.4.1 — reconstructed 3D iso-surfaces for Field View. */

/* FOAMLENS_ISOSURFACE_CORE_START */
function fvIsoPointKey(p,tol){
  const s=Math.max(Number(tol)||1e-12,1e-15);return p.map(v=>Math.round(Number(v)/s)).join(',')
}
function fvIsoUniquePoint(list,p,tol){
  const key=fvIsoPointKey(p,tol);if(list.some(q=>q.key===key))return;list.push({p:[...p],key})
}
function fvIsoTriangleArea(a,b,c){
  const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];
  return .5*Math.hypot(uy*vz-uz*vy,uz*vx-ux*vz,ux*vy-uy*vx)
}
function fvIsoOrderPolygon(hits,tol){
  if(hits.length<=3)return hits;
  const center=[0,0,0];for(const h of hits)for(let a=0;a<3;a++)center[a]+=h.p[a]/hits.length;
  let normal=null;
  for(let i=0;i<hits.length&&!normal;i++)for(let j=i+1;j<hits.length&&!normal;j++)for(let k=j+1;k<hits.length&&!normal;k++){
    const a=hits[i].p,b=hits[j].p,c=hits[k].p,u=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],v=[c[0]-a[0],c[1]-a[1],c[2]-a[2]],n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],l=Math.hypot(...n);
    if(l>tol)normal=n.map(x=>x/l)
  }
  if(!normal)return hits;
  let u=hits[0].p.map((v,i)=>v-center[i]),ul=Math.hypot(...u);if(ul<=tol){u=hits[1].p.map((v,i)=>v-center[i]);ul=Math.hypot(...u)}if(ul<=tol)return hits;u=u.map(x=>x/ul);
  const v=[normal[1]*u[2]-normal[2]*u[1],normal[2]*u[0]-normal[0]*u[2],normal[0]*u[1]-normal[1]*u[0]];
  return [...hits].sort((a,b)=>{
    const da=a.p.map((x,i)=>x-center[i]),db=b.p.map((x,i)=>x-center[i]);
    return Math.atan2(da[0]*v[0]+da[1]*v[1]+da[2]*v[2],da[0]*u[0]+da[1]*u[1]+da[2]*u[2])-Math.atan2(db[0]*v[0]+db[1]*v[1]+db[2]*v[2],db[0]*u[0]+db[1]*u[1]+db[2]*u[2])
  })
}
function fvIsoTetra(vertices,values,isoValue,tol=1e-12){
  const iso=Number(isoValue);if(!Number.isFinite(iso)||vertices?.length!==4||values?.length!==4)return[];
  const edges=[[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]],hits=[];
  for(const [ia,ib] of edges){
    const a=vertices[ia],b=vertices[ib],va=Number(values[ia]),vb=Number(values[ib]);if(!Number.isFinite(va)||!Number.isFinite(vb))continue;
    const da=va-iso,db=vb-iso,za=Math.abs(da)<=tol,zb=Math.abs(db)<=tol;
    if(za)fvIsoUniquePoint(hits,a,tol);if(zb)fvIsoUniquePoint(hits,b,tol);
    if(!za&&!zb&&da*db<0){const f=(iso-va)/(vb-va),p=[a[0]+f*(b[0]-a[0]),a[1]+f*(b[1]-a[1]),a[2]+f*(b[2]-a[2])];fvIsoUniquePoint(hits,p,tol)}
  }
  if(hits.length<3)return[];const ordered=fvIsoOrderPolygon(hits,tol),out=[];
  for(let i=1;i<ordered.length-1;i++){const tri=[ordered[0].p,ordered[i].p,ordered[i+1].p];if(fvIsoTriangleArea(...tri)>tol*tol)out.push(tri)}
  return out
}
function fvBuildPointIsoSurfaceGeometry(mesh,pointValues,isoValue){
  const iso=Number(isoValue),min=mesh?.boundsMin||[0,0,0],max=mesh?.boundsMax||[1,1,1],diag=Math.hypot(max[0]-min[0],max[1]-min[1],max[2]-min[2])||1,tol=diag*1e-9;
  if(!Number.isFinite(iso))return{isoValue:iso,positions:new Float32Array(),triangleCount:0,interpolation:'invalid iso value'};
  const centerValues=fvPointFieldCellValues(mesh,pointValues),cellFaces=fvCellFaces(mesh),pts=mesh?.points||[],centers=mesh?.cellCenters||[],positions=[],seen=new Set();
  for(let c=0;c<cellFaces.length;c++){
    const cv=Number(centerValues[c]),center=[Number(centers[3*c]),Number(centers[3*c+1]),Number(centers[3*c+2])];if(!Number.isFinite(cv)||!center.every(Number.isFinite))continue;
    for(const fi of cellFaces[c]){
      const face=fvMeshFacePoints(mesh,fi);if(face.length<3)continue;const p0=face[0];
      for(let j=1;j<face.length-1;j++){
        const ids=[p0,face[j],face[j+1]],vertices=[center,...ids.map(pi=>[Number(pts[3*pi]),Number(pts[3*pi+1]),Number(pts[3*pi+2])])],vals=[cv,...ids.map(pi=>Number(pointValues?.[pi]))];
        for(const tri of fvIsoTetra(vertices,vals,iso,tol)){
          const key=tri.map(p=>fvIsoPointKey(p,tol)).sort().join('|');if(seen.has(key))continue;seen.add(key);positions.push(...tri[0],...tri[1],...tri[2])
        }
      }
    }
  }
  return{isoValue:iso,positions:new Float32Array(positions),triangleCount:positions.length/9,interpolation:'point-field vertices + affine cell-centre reconstruction + marching tetrahedra'}
}
function fvBuildIsoSurfaceGeometry(mesh,cellValues,isoValue){
  const iso=Number(isoValue),min=mesh?.boundsMin||[0,0,0],max=mesh?.boundsMax||[1,1,1],diag=Math.hypot(max[0]-min[0],max[1]-min[1],max[2]-min[2])||1,tol=diag*1e-9;
  if(!Number.isFinite(iso))return{isoValue:iso,positions:new Float32Array(),triangleCount:0,interpolation:'invalid iso value'};
  const pointValues=fvPointValuesFromCells(mesh,cellValues),cellFaces=fvCellFaces(mesh),pts=mesh?.points||[],centers=mesh?.cellCenters||[],positions=[],seen=new Set();
  for(let c=0;c<cellFaces.length;c++){
    const cv=Number(cellValues?.[c]),center=[Number(centers[3*c]),Number(centers[3*c+1]),Number(centers[3*c+2])];if(!Number.isFinite(cv)||!center.every(Number.isFinite))continue;
    for(const fi of cellFaces[c]){
      const face=fvMeshFacePoints(mesh,fi);if(face.length<3)continue;const p0=face[0];
      for(let j=1;j<face.length-1;j++){
        const ids=[p0,face[j],face[j+1]],vertices=[center,...ids.map(pi=>[Number(pts[3*pi]),Number(pts[3*pi+1]),Number(pts[3*pi+2])])],vals=[cv,...ids.map(pi=>Number(pointValues[pi]))];
        for(const tri of fvIsoTetra(vertices,vals,iso,tol)){
          const key=tri.map(p=>fvIsoPointKey(p,tol)).sort().join('|');if(seen.has(key))continue;seen.add(key);
          positions.push(...tri[0],...tri[1],...tri[2])
        }
      }
    }
  }
  return{isoValue:iso,positions:new Float32Array(positions),triangleCount:positions.length/9,interpolation:'cell-to-point inverse-distance + cell-centre tetrahedralization + marching tetrahedra'}
}
/* FOAMLENS_ISOSURFACE_CORE_END */

function fvIsoUi(en,es){try{return flUi(en,es)}catch{return en}}
function fvIsoFmt(v){try{return fvFmt(v)}catch{return Number.isFinite(Number(v))?String(v):'—'}}
function fvIsoColors(vertexCount,iso,range,palette){
  const rgb=fvColorMap(iso,range?.min,range?.max,palette||'viridis'),out=new Float32Array(Math.max(0,vertexCount)*3);
  for(let i=0;i<vertexCount;i++){out[3*i]=rgb[0];out[3*i+1]=rgb[1];out[3*i+2]=rgb[2]}return out
}
function fvUpdateIso(range=null){
  const r=fvState.renderer,mesh=fvState.mesh,enabled=!!document.getElementById('fvIso')?.checked,meta=document.getElementById('fvIsoMeta');
  if(!r||!mesh)return;
  if(String(fvState.fieldStorage||'volume')==='surface'){r.isoCount=0;fvState.isoGeometry=null;if(meta)meta.textContent=fvIsoUi('Iso-surface is unavailable for face-associated surface fields because FoamLens does not silently reconstruct face data into a volume field.','La iso-superficie no está disponible para campos de superficie asociados a caras porque FoamLens no reconstruye silenciosamente datos de cara como campo volumétrico.');fvRender();return}
  if(!enabled||!fvState.fieldValues){r.isoCount=0;fvState.isoGeometry=null;if(meta)meta.textContent=fvIsoUi('Enable the iso-surface to reconstruct a constant-value surface inside the mesh.','Activa la iso-superficie para reconstruir una superficie de valor constante dentro de la malla.');fvRender();return}
  const iso=Number(document.getElementById('fvIsoValue')?.value),displayRange=range||fvState.lockedRange||fvFiniteRange(fvState.fieldValues),palette=document.getElementById('fvPalette')?.value||'viridis';
  if(!Number.isFinite(iso)){r.isoCount=0;if(meta)meta.textContent=fvIsoUi('Enter a finite iso value.','Introduce un valor iso finito.');fvRender();return}
  if(displayRange?.valid&&(iso<displayRange.min||iso>displayRange.max)){r.isoCount=0;fvState.isoGeometry=null;if(meta)meta.textContent=fvIsoUi('Iso value is outside the current field range: ','El valor iso está fuera del rango actual del campo: ')+fvIsoFmt(displayRange.min)+' – '+fvIsoFmt(displayRange.max);fvRender();return}
  const pointAssoc=String(fvState.fieldStorage||'volume')==='point',geom=pointAssoc?fvBuildPointIsoSurfaceGeometry(mesh,fvState.fieldValues,iso):fvBuildIsoSurfaceGeometry(mesh,fvState.fieldValues,iso);fvState.isoGeometry=geom;fvUploadBuffer(r,'isoPos',geom.positions,r.gl.DYNAMIC_DRAW);fvUploadBuffer(r,'isoColor',fvIsoColors(geom.positions.length/3,iso,displayRange,palette),r.gl.DYNAMIC_DRAW);r.isoCount=geom.positions.length/3;
  if(meta)meta.textContent='φ = '+fvIsoFmt(iso)+' · '+geom.triangleCount.toLocaleString()+' '+fvIsoUi('triangles','triángulos')+' · '+(pointAssoc?fvIsoUi('marching tetrahedra on point-field reconstruction','marching tetrahedra sobre reconstrucción de campo de puntos'):fvIsoUi('marching tetrahedra on reconstructed cell-centred data','marching tetrahedra sobre datos reconstruidos desde centros de celda'));
  fvRender()
}
function fvIsoSetMidrange(){
  if(!fvState.fieldValues)return;const range=fvFiniteRange(fvState.fieldValues);if(!range.valid)return;const input=document.getElementById('fvIsoValue');if(input){input.value=String((range.min+range.max)/2);fvUpdateIso(range)}
}
function fvInstallIsoUi(){
  if(document.getElementById('fvIsoPanel'))return true;
  const slice=document.getElementById('fvSlice')?.closest('details');if(!slice)return false;
  const box=document.createElement('details');box.className='analysisExt';box.id='fvIsoPanel';box.open=true;
  box.innerHTML='<summary class="analysisExtHead"><strong data-fl-en="Iso-surface / contour" data-fl-es="Iso-superficie / contorno">Iso-surface / contour</strong><span class="badge">φ = const</span></summary><div class="extSectionBody">'+
    '<div class="fvChecks"><label class="inlineCheck"><input id="fvIso" type="checkbox"> <span data-fl-en="Show iso-surface" data-fl-es="Mostrar iso-superficie">Show iso-surface</span></label></div>'+
    '<div class="row2"><div class="field"><label data-fl-en="Iso value" data-fl-es="Valor iso">Iso value</label><input id="fvIsoValue" type="number" step="any" value="0.5"></div><div class="field"><label data-fl-en="Opacity" data-fl-es="Opacidad">Opacity</label><input id="fvIsoOpacity" type="range" min=".05" max="1" step=".05" value=".88"></div></div>'+
    '<button class="btn soft" id="fvIsoMidrange" type="button" data-fl-en="Use current midrange" data-fl-es="Usar punto medio actual">Use current midrange</button>'+
    '<div class="smallnote" id="fvIsoMeta" data-fl-en="For liquid fraction, φ = 0.5 is a useful mid-front contour; for temperature, enter the desired isotherm explicitly." data-fl-es="Para fracción líquida, φ = 0.5 es un contorno útil del frente medio; para temperatura, introduce explícitamente la isoterma deseada.">For liquid fraction, φ = 0.5 is a useful mid-front contour; for temperature, enter the desired isotherm explicitly.</div>'+
    '</div>';
  slice.insertAdjacentElement('afterend',box);try{flApplyBilingualText(box)}catch{}
  document.getElementById('fvIso').addEventListener('change',()=>fvUpdateIso());
  document.getElementById('fvIsoValue').addEventListener('input',()=>fvUpdateIso());
  document.getElementById('fvIsoOpacity').addEventListener('input',fvRender);
  document.getElementById('fvIsoMidrange').addEventListener('click',fvIsoSetMidrange);
  return true
}
function fvInstallIso(){
  const mount=()=>fvInstallIsoUi();
  if(!mount()){const retry=()=>{if(mount())return;requestAnimationFrame(retry)};requestAnimationFrame(retry)}
  document.addEventListener('foamlens-language-change',()=>{const p=document.getElementById('fvIsoPanel');if(p)try{flApplyBilingualText(p)}catch{};fvUpdateIso()});
}
fvInstallIso();
window.FoamLensIsoSurface={fvIsoTetra,fvBuildIsoSurfaceGeometry,fvBuildPointIsoSurfaceGeometry,fvUpdateIso};
