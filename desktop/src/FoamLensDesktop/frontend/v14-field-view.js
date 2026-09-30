/* FoamLens Desktop v1.4.0 — OpenFOAM mesh/field visualization and streamline playback. */

/* FOAMLENS_FIELD_VIEW_CORE_START */
function fvNormPath(v){return String(v||'').replace(/\\/g,'/').replace(/\/+/g,'/').replace(/^\/|\/$/g,'')}
function fvClamp(v,a,b){v=Number(v);return Number.isFinite(v)?Math.max(a,Math.min(b,v)):a}
function fvTimeEqual(a,b){a=Number(a);b=Number(b);return Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=Math.max(1e-10,Math.max(Math.abs(a),Math.abs(b),1)*1e-10)}
function fvNearestTime(values,target){
  const a=[...new Set((values||[]).map(Number).filter(Number.isFinite))].sort((x,y)=>x-y);target=Number(target);
  if(!a.length||!Number.isFinite(target))return NaN;let best=a[0],d=Math.abs(best-target);
  for(let i=1;i<a.length;i++){const nd=Math.abs(a[i]-target);if(nd<d){best=a[i];d=nd}}return best
}
function fvAdvanceIndex(index,delta,length){
  length=Math.max(0,Math.floor(Number(length)||0));if(!length)return-1;
  return Math.max(0,Math.min(length-1,Math.floor(Number(index)||0)+(Math.sign(Number(delta))||0)))
}
function fvMeshDescriptor(file,rootPath){
  const path=fvNormPath(file?.webkitRelativePath||file?.path||file?.name||''),root=fvNormPath(rootPath);
  if(!root||!path.startsWith(root+'/'))return null;
  const rel=path.slice(root.length+1).split('/').filter(Boolean),pi=rel.findIndex(x=>x==='polyMesh');
  if(pi<1||pi!==rel.length-2)return null;
  const name=rel.at(-1);if(!['points','faces','owner','neighbour','boundary'].includes(name))return null;
  let region='',time=null,source='';
  if(rel[0]==='constant'){region=rel.slice(1,pi).join('/');source='constant'}
  else if(/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?$/i.test(rel[0])){time=Number(rel[0]);if(!Number.isFinite(time))return null;region=rel.slice(1,pi).join('/');source='time'}
  else return null;
  return{region,name,time,timeLabel:time==null?'constant':rel[0],source,sourcePath:path,size:Number(file?.size)||0,file}
}
function fvBuildMeshInventory(files,rootPath){
  const groups=new Map(),required=['points','faces','owner','neighbour'];
  for(const file of files||[]){
    const d=fvMeshDescriptor(file,rootPath);if(!d)continue;
    if(!groups.has(d.region))groups.set(d.region,{region:d.region,constant:{files:{},sourcePaths:{}},events:new Map()});
    const g=groups.get(d.region);
    if(d.source==='constant'){g.constant.files[d.name]=file;g.constant.sourcePaths[d.name]=d.sourcePath}
    else{
      if(!g.events.has(d.time))g.events.set(d.time,{time:d.time,timeLabel:d.timeLabel,files:{},sourcePaths:{}});
      const e=g.events.get(d.time);e.files[d.name]=file;e.sourcePaths[d.name]=d.sourcePath
    }
  }
  const out=[];
  for(const raw of groups.values()){
    const baseFiles={...raw.constant.files},baseSourcePaths={...raw.constant.sourcePaths},baseComplete=required.every(k=>!!baseFiles[k]);
    let stateFiles={...baseFiles},statePaths={...baseSourcePaths};const snapshots=[];
    for(const e of [...raw.events.values()].sort((a,b)=>a.time-b.time)){
      const changed=Object.keys(e.files);stateFiles={...stateFiles,...e.files};statePaths={...statePaths,...e.sourcePaths};
      if(required.every(k=>!!stateFiles[k]))snapshots.push({region:raw.region,time:e.time,timeLabel:e.timeLabel,files:{...stateFiles},sourcePaths:{...statePaths},complete:true,dynamic:true,changed})
    }
    const reference=baseComplete?{region:raw.region,time:null,timeLabel:'constant',files:{...baseFiles},sourcePaths:{...baseSourcePaths},complete:true,dynamic:false,changed:[]}:snapshots[0]||null;
    out.push({region:raw.region,files:reference?{...reference.files}:{...baseFiles},sourcePaths:reference?{...reference.sourcePaths}:{...baseSourcePaths},complete:!!reference,baseComplete,baseFiles,baseSourcePaths,snapshots,dynamic:snapshots.length>0,dynamicTimes:snapshots.map(x=>x.time)})
  }
  return out.sort((a,b)=>a.region.localeCompare(b.region,undefined,{numeric:true,sensitivity:'base'}))
}
function fvMeshSnapshotForTime(group,target){
  if(!group?.complete)return null;target=Number(target);
  let chosen=group.baseComplete?{region:group.region,time:null,timeLabel:'constant',files:{...(group.baseFiles||{})},sourcePaths:{...(group.baseSourcePaths||{})},complete:true,dynamic:false,changed:[]}:null;
  const snapshots=[...(group.snapshots||[])].sort((a,b)=>a.time-b.time);
  if(!Number.isFinite(target))return chosen||snapshots[0]||null;
  for(const snap of snapshots){if(snap.time<target||fvTimeEqual(snap.time,target))chosen=snap;else break}
  return chosen
}
function fvStripComments(text){return String(text||'').replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/.*$/gm,'')}
function fvFoamFormat(text){const s=fvStripComments(text),m=s.match(/\bformat\s+([^;\s]+)\s*;/i);return m?m[1]:'ascii'}
function fvFindMatching(text,openIndex,open='(',close=')'){
  let depth=0,quote='';for(let i=openIndex;i<text.length;i++){const ch=text[i];
    if(quote){if(ch===quote&&text[i-1]!=='\\')quote='';continue}
    if(ch==='"'||ch==="'"){quote=ch;continue}
    if(ch===open)depth++;else if(ch===close&&--depth===0)return i
  }return-1
}
function fvExtractList(text){
  const clean=fvStripComments(text),format=fvFoamFormat(clean);if(String(format).toLowerCase()!=='ascii')return{ok:false,reason:'binary-format',format};
  let start=0,fi=clean.search(/\bFoamFile\b/i);
  if(fi>=0){const b=clean.indexOf('{',fi),e=b>=0?fvFindMatching(clean,b,'{','}'):-1;if(e>=0)start=e+1}
  const tail=clean.slice(start),m=/(?:^|\s)(\d+)\s*\(/m.exec(tail);if(!m)return{ok:false,reason:'list-header-not-found',format};
  const declared=Number(m[1]),open=start+m.index+m[0].lastIndexOf('('),close=fvFindMatching(clean,open,'(',')');
  if(close<0)return{ok:false,reason:'list-close-not-found',format};
  return{ok:true,format,declared,body:clean.slice(open+1,close)}
}
function fvParsePointsText(text){
  const l=fvExtractList(text);if(!l.ok)return l;const num='[-+]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][-+]?\\d+)?',re=new RegExp('\\(\\s*('+num+')\\s+('+num+')\\s+('+num+')\\s*\\)','g');
  const points=[];let m;while((m=re.exec(l.body)))points.push(Number(m[1]),Number(m[2]),Number(m[3]));
  return points.length===l.declared*3?{ok:true,format:l.format,points,count:l.declared}:{ok:false,reason:'point-count-mismatch',format:l.format}
}
function fvParseFacesText(text){
  const l=fvExtractList(text);if(!l.ok)return l;const faces=[],re=/(\d+)\s*\(([^()]*)\)/g;let m;
  while((m=re.exec(l.body))){const n=Number(m[1]),a=(m[2].match(/[-+]?\d+/g)||[]).map(Number);if(a.length!==n)return{ok:false,reason:'face-size-mismatch',format:l.format};faces.push(a)}
  return faces.length===l.declared?{ok:true,format:l.format,faces,count:l.declared}:{ok:false,reason:'face-count-mismatch',format:l.format}
}
function fvParseLabelsText(text){
  const l=fvExtractList(text);if(!l.ok)return l;const labels=(l.body.match(/[-+]?\d+/g)||[]).map(Number);
  return labels.length===l.declared?{ok:true,format:l.format,labels,count:l.declared}:{ok:false,reason:'label-count-mismatch',format:l.format}
}
function fvPolyhedralCellCenters(points,faces,owners,neighbours,cellCount){
  const cellFaces=Array.from({length:cellCount},()=>[]);
  for(let fi=0;fi<faces.length;fi++){
    const o=Number(owners[fi]);if(o>=0&&o<cellCount)cellFaces[o].push(fi);
    if(fi<neighbours.length){const n=Number(neighbours[fi]);if(n>=0&&n<cellCount)cellFaces[n].push(fi)}
  }
  const centers=new Array(cellCount*3).fill(0);let fallbackCount=0;
  for(let cell=0;cell<cellCount;cell++){
    const refs=cellFaces[cell];if(!refs.length){fallbackCount++;continue}
    let rx=0,ry=0,rz=0,validFaces=0;
    for(const fi of refs){
      const face=faces[fi];if(!face.length)continue;let fx=0,fy=0,fz=0;
      for(const pi of face){fx+=Number(points[3*pi]);fy+=Number(points[3*pi+1]);fz+=Number(points[3*pi+2])}
      rx+=fx/face.length;ry+=fy/face.length;rz+=fz/face.length;validFaces++
    }
    if(!validFaces){fallbackCount++;continue}rx/=validFaces;ry/=validFaces;rz/=validFaces;
    let volume6=0,absVolume6=0,wx=0,wy=0,wz=0;
    for(const fi of refs){
      const face=faces[fi];if(face.length<3)continue;let fx=0,fy=0,fz=0;
      for(const pi of face){fx+=Number(points[3*pi]);fy+=Number(points[3*pi+1]);fz+=Number(points[3*pi+2])}
      fx/=face.length;fy/=face.length;fz/=face.length;const ownerSide=Number(owners[fi])===cell;
      for(let j=0;j<face.length;j++){
        let ia=face[j],ib=face[(j+1)%face.length];if(!ownerSide)[ia,ib]=[ib,ia];
        const ax=fx-rx,ay=fy-ry,az=fz-rz,bx=Number(points[3*ia])-rx,by=Number(points[3*ia+1])-ry,bz=Number(points[3*ia+2])-rz,cx=Number(points[3*ib])-rx,cy=Number(points[3*ib+1])-ry,cz=Number(points[3*ib+2])-rz;
        const crossX=by*cz-bz*cy,crossY=bz*cx-bx*cz,crossZ=bx*cy-by*cx,v6=ax*crossX+ay*crossY+az*crossZ;if(!Number.isFinite(v6)||Math.abs(v6)<=Number.EPSILON)continue;
        const tcx=(rx+fx+Number(points[3*ia])+Number(points[3*ib]))*.25,tcy=(ry+fy+Number(points[3*ia+1])+Number(points[3*ib+1]))*.25,tcz=(rz+fz+Number(points[3*ia+2])+Number(points[3*ib+2]))*.25;
        volume6+=v6;absVolume6+=Math.abs(v6);wx+=v6*tcx;wy+=v6*tcy;wz+=v6*tcz
      }
    }
    if(Number.isFinite(volume6)&&Number.isFinite(absVolume6)&&absVolume6>0&&Math.abs(volume6)>absVolume6*1e-12){centers[3*cell]=wx/volume6;centers[3*cell+1]=wy/volume6;centers[3*cell+2]=wz/volume6}
    else{centers[3*cell]=rx;centers[3*cell+1]=ry;centers[3*cell+2]=rz;fallbackCount++}
  }
  return{centers,fallbackCount}
}
function fvBuildMeshFromTexts(pointsText,facesText,ownerText,neighbourText){
  const P=fvParsePointsText(pointsText),F=fvParseFacesText(facesText),O=fvParseLabelsText(ownerText),N=fvParseLabelsText(neighbourText);
  for(const x of [P,F,O,N])if(!x.ok)return{supported:false,reason:x.reason||'parse-failed',format:x.format||''};
  if(F.faces.length!==O.labels.length)return{supported:false,reason:'owner-face-count-mismatch',format:'ascii'};
  if(N.labels.length>F.faces.length)return{supported:false,reason:'neighbour-face-count-mismatch',format:'ascii'};
  const pointCount=P.count,faces=F.faces,owners=O.labels,neighbours=N.labels;
  let maxCell=-1;for(const v of owners)maxCell=Math.max(maxCell,v);for(const v of neighbours)maxCell=Math.max(maxCell,v);
  const cellCount=maxCell+1;if(cellCount<=0)return{supported:false,reason:'no-cells',format:'ascii'};
  const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
  for(let i=0;i<pointCount;i++)for(let a=0;a<3;a++){const v=P.points[3*i+a];min[a]=Math.min(min[a],v);max[a]=Math.max(max[a],v)}
  const centroid=fvPolyhedralCellCenters(P.points,faces,owners,neighbours,cellCount);
  const centers=centroid.centers;
  const triangles=[],surfaceOwners=[],edges=[],edgeSet=new Set(),internalFaceCount=neighbours.length;
  for(let fi=internalFaceCount;fi<faces.length;fi++){
    const face=faces[fi];
    for(let j=0;j<face.length;j++){const a=face[j],b=face[(j+1)%face.length],lo=Math.min(a,b),hi=Math.max(a,b),k=lo+':'+hi;if(!edgeSet.has(k)){edgeSet.add(k);edges.push(lo,hi)}}
    for(let j=1;j<face.length-1;j++){triangles.push(face[0],face[j],face[j+1]);surfaceOwners.push(owners[fi])}
  }
  const faceOffsets=[0],facePoints=[];for(const face of faces){facePoints.push(...face);faceOffsets.push(facePoints.length)}
  return{supported:true,reason:'',format:'ascii',points:P.points,surfaceTriangles:triangles,surfaceOwners,surfaceEdges:edges,cellCenters:centers,faceOffsets,facePoints,owners:[...owners],neighbours:[...neighbours],pointCount,faceCount:faces.length,internalFaceCount,boundaryFaceCount:faces.length-internalFaceCount,cellCount,boundsMin:min,boundsMax:max,cellCenterMethod:centroid.fallbackCount?'volume-weighted-polyhedral-with-mean-face-fallback:'+centroid.fallbackCount:'volume-weighted-polyhedral'}
}
function fvPaletteStops(name){
  if(name==='coolwarm')return[[0,[0.231,0.298,0.753]],[.5,[.865,.865,.865]],[1,[.706,.016,.15]]];
  if(name==='turbo')return[[0,[.19,.071,.232]],[.2,[.16,.49,.86]],[.4,[.11,.82,.55]],[.6,[.72,.91,.18]],[.8,[.98,.54,.09]],[1,[.48,.016,.011]]];
  return[[0,[.267,.005,.329]],[.25,[.23,.322,.545]],[.5,[.128,.567,.551]],[.75,[.369,.789,.383]],[1,[.993,.906,.144]]]
}
function fvColorMap(value,min,max,palette='viridis'){
  value=Number(value);min=Number(min);max=Number(max);let t=(Number.isFinite(value)&&Number.isFinite(min)&&Number.isFinite(max)&&max>min)?(value-min)/(max-min):.5;t=fvClamp(t,0,1);
  const s=fvPaletteStops(palette);let a=s[0],b=s.at(-1);for(let i=1;i<s.length;i++)if(t<=s[i][0]){a=s[i-1];b=s[i];break}
  const f=b[0]===a[0]?0:(t-a[0])/(b[0]-a[0]);return a[1].map((v,i)=>v+(b[1][i]-v)*f)
}
function fvLegendGradient(name){
  return 'linear-gradient(90deg,'+fvPaletteStops(name).map(([at,rgb])=>'rgb('+rgb.map(v=>Math.round(v*255)).join(',')+') '+Math.round(at*100)+'%').join(',')+')'
}
function fvFiniteRange(values){
  let min=Infinity,max=-Infinity,sum=0,n=0;for(const raw of values||[]){const v=Number(raw);if(!Number.isFinite(v))continue;min=Math.min(min,v);max=Math.max(max,v);sum+=v;n++}
  return n?{valid:true,min,max,mean:sum/n,count:n}:{valid:false,min:NaN,max:NaN,mean:NaN,count:0}
}
function fvVecLen(v){return Math.hypot(Number(v?.[0])||0,Number(v?.[1])||0,Number(v?.[2])||0)}
function fvInsideBounds(p,min,max,pad=0){for(let i=0;i<3;i++)if(p[i]<min[i]-pad||p[i]>max[i]+pad)return false;return true}
function fvBuildSpatialHash(centers,boundsMin,boundsMax,cellCount){
  const n=Math.max(1,Number(cellCount)||Math.floor((centers?.length||0)/3)),base=fvClamp(Math.round(Math.cbrt(n)/1.7),4,40),dims=[base,base,base],span=boundsMax.map((v,i)=>Math.max(0,Number(v)-Number(boundsMin[i])));
  const maxSpan=Math.max(...span,1e-30);for(let a=0;a<3;a++)if(span[a]<maxSpan*1e-9)dims[a]=1;
  const buckets=new Map(),key=(ix,iy,iz)=>ix+'|'+iy+'|'+iz,coord=(p,a)=>dims[a]===1?0:fvClamp(Math.floor((p[a]-boundsMin[a])/Math.max(span[a],1e-30)*dims[a]),0,dims[a]-1);
  for(let i=0;i<n;i++){const p=[Number(centers[3*i]),Number(centers[3*i+1]),Number(centers[3*i+2])];if(!p.every(Number.isFinite))continue;const k=key(coord(p,0),coord(p,1),coord(p,2));if(!buckets.has(k))buckets.set(k,[]);buckets.get(k).push(i)}
  const bucketSize=Math.hypot(...span.map((s,a)=>dims[a]>0?s/dims[a]:s))||maxSpan/Math.max(base,1);
  return{buckets,dims,span,boundsMin:[...boundsMin],boundsMax:[...boundsMax],bucketSize,key,coord}
}
function fvSampleVector(hash,centers,vectors,p){
  if(!hash||!fvInsideBounds(p,hash.boundsMin,hash.boundsMax,hash.bucketSize*.8))return null;
  const c=[hash.coord(p,0),hash.coord(p,1),hash.coord(p,2)],cand=[];
  for(let radius=0;radius<=2&&!cand.length;radius++)for(let dz=-radius;dz<=radius;dz++)for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){
    const ix=c[0]+dx,iy=c[1]+dy,iz=c[2]+dz;if(ix<0||iy<0||iz<0||ix>=hash.dims[0]||iy>=hash.dims[1]||iz>=hash.dims[2])continue;
    const arr=hash.buckets.get(hash.key(ix,iy,iz));if(arr)cand.push(...arr)
  }
  if(!cand.length)return null;
  const nearest=cand.map(i=>{const dx=centers[3*i]-p[0],dy=centers[3*i+1]-p[1],dz=centers[3*i+2]-p[2];return{i,d2:dx*dx+dy*dy+dz*dz}}).sort((a,b)=>a.d2-b.d2).slice(0,8);
  if(!nearest.length||Math.sqrt(nearest[0].d2)>hash.bucketSize*4.5)return null;
  let wsum=0,x=0,y=0,z=0;
  for(const q of nearest){const v=vectors[q.i];if(!Array.isArray(v)||v.length<3)continue;const vx=Number(v[0]),vy=Number(v[1]),vz=Number(v[2]);if(![vx,vy,vz].every(Number.isFinite))continue;const w=1/Math.max(q.d2,1e-18);wsum+=w;x+=w*vx;y+=w*vy;z+=w*vz}
  return wsum>0?[x/wsum,y/wsum,z/wsum]:null
}
function fvSeedPlane(boundsMin,boundsMax,axis='x',count=16,position=.5){
  count=Math.max(1,Math.min(64,Math.round(Number(count)||16)));position=fvClamp(position,0,1);const ai={x:0,y:1,z:2}[axis]??0,other=[0,1,2].filter(x=>x!==ai),n=Math.ceil(Math.sqrt(count)),out=[];
  const pos=boundsMin[ai]+(boundsMax[ai]-boundsMin[ai])*position;
  for(let j=0;j<n&&out.length<count;j++)for(let i=0;i<n&&out.length<count;i++){const p=[0,0,0];p[ai]=pos;for(let k=0;k<2;k++){const a=other[k],q=(k===0?i:j),f=n===1?.5:.08+.84*q/(n-1);p[a]=boundsMin[a]+(boundsMax[a]-boundsMin[a])*f}out.push(p)}
  return out
}
function fvIntegrateStreamline(seed,hash,centers,vectors,boundsMin,boundsMax,direction=1,step=null,maxSteps=180){
  const diag=Math.hypot(boundsMax[0]-boundsMin[0],boundsMax[1]-boundsMin[1],boundsMax[2]-boundsMin[2])||1,h=Number(step)>0?Number(step):diag/220,p=[...seed],out=[{p:[...p],speed:0}],dir=Math.sign(direction)||1;
  for(let k=0;k<maxSteps;k++){
    const v1=fvSampleVector(hash,centers,vectors,p);if(!v1)break;const s1=fvVecLen(v1);if(!(s1>1e-14))break;
    const u1=v1.map(x=>x/s1),mid=p.map((x,a)=>x+dir*.5*h*u1[a]),v2=fvSampleVector(hash,centers,vectors,mid);if(!v2)break;const s2=fvVecLen(v2);if(!(s2>1e-14))break;
    const u2=v2.map(x=>x/s2),next=p.map((x,a)=>x+dir*h*u2[a]);if(!fvInsideBounds(next,boundsMin,boundsMax,h*.25))break;
    p[0]=next[0];p[1]=next[1];p[2]=next[2];out.push({p:[...p],speed:s2})
  }return out
}
function fvCombineStreamline(seed,hash,centers,vectors,boundsMin,boundsMax){
  const back=fvIntegrateStreamline(seed,hash,centers,vectors,boundsMin,boundsMax,-1).reverse(),fwd=fvIntegrateStreamline(seed,hash,centers,vectors,boundsMin,boundsMax,1);
  return back.slice(0,-1).concat(fwd)
}
function fvMeshFacePoints(mesh,faceIndex){
  const o=mesh?.faceOffsets||[],p=mesh?.facePoints||[],a=Number(o[faceIndex]),b=Number(o[faceIndex+1]);return Number.isInteger(a)&&Number.isInteger(b)&&a>=0&&b>=a?p.slice(a,b):[]
}
function fvCellFaces(mesh){
  if(mesh?._cellFaces)return mesh._cellFaces;const n=Number(mesh?.cellCount)||0,out=Array.from({length:n},()=>[]),owners=mesh?.owners||[],neighbours=mesh?.neighbours||[];
  for(let fi=0;fi<owners.length;fi++){const a=Number(owners[fi]);if(a>=0&&a<n)out[a].push(fi);if(fi<neighbours.length){const b=Number(neighbours[fi]);if(b>=0&&b<n)out[b].push(fi)}}
  if(mesh)mesh._cellFaces=out;return out
}
function fvPointCells(mesh){
  if(mesh?._pointCells)return mesh._pointCells;const n=Number(mesh?.pointCount)||Math.floor((mesh?.points?.length||0)/3),sets=Array.from({length:n},()=>new Set()),owners=mesh?.owners||[],neighbours=mesh?.neighbours||[];
  for(let fi=0;fi<owners.length;fi++){const cells=[Number(owners[fi]),fi<neighbours.length?Number(neighbours[fi]):-1],fp=fvMeshFacePoints(mesh,fi);for(const pi of fp)if(pi>=0&&pi<n)for(const c of cells)if(c>=0&&c<(mesh?.cellCount||0))sets[pi].add(c)}
  const out=sets.map(x=>[...x]);if(mesh)mesh._pointCells=out;return out
}
function fvPointValuesFromCells(mesh,cellValues){
  const pts=mesh?.points||[],centers=mesh?.cellCenters||[],adj=fvPointCells(mesh),out=new Array(adj.length).fill(NaN);
  for(let pi=0;pi<adj.length;pi++){let sum=0,wsum=0,exact=NaN;const px=Number(pts[3*pi]),py=Number(pts[3*pi+1]),pz=Number(pts[3*pi+2]);
    for(const c of adj[pi]){const v=Number(cellValues?.[c]);if(!Number.isFinite(v))continue;const dx=px-Number(centers[3*c]),dy=py-Number(centers[3*c+1]),dz=pz-Number(centers[3*c+2]),d2=dx*dx+dy*dy+dz*dz;if(d2<=1e-30){exact=v;break}const w=1/Math.sqrt(d2);sum+=w*v;wsum+=w}
    out[pi]=Number.isFinite(exact)?exact:(wsum>0?sum/wsum:NaN)
  }return out
}
function fvUniqueSlicePoint(list,p,value,tol){
  for(const q of list){const dx=q.p[0]-p[0],dy=q.p[1]-p[1],dz=q.p[2]-p[2];if(dx*dx+dy*dy+dz*dz<=tol*tol){if(Number.isFinite(value)&&!Number.isFinite(q.value))q.value=value;return}}
  list.push({p:[...p],value})
}
function fvSliceTetra(vertices,values,axis,coord,tol){
  const edges=[[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]],hits=[];
  for(const [ia,ib] of edges){const a=vertices[ia],b=vertices[ib],va=Number(values[ia]),vb=Number(values[ib]),da=a[axis]-coord,db=b[axis]-coord,za=Math.abs(da)<=tol,zb=Math.abs(db)<=tol;
    if(za)fvUniqueSlicePoint(hits,a,va,tol);if(zb)fvUniqueSlicePoint(hits,b,vb,tol);
    if(!za&&!zb&&da*db<0){const f=da/(da-db),p=[a[0]+f*(b[0]-a[0]),a[1]+f*(b[1]-a[1]),a[2]+f*(b[2]-a[2])],v=Number.isFinite(va)&&Number.isFinite(vb)?va+f*(vb-va):NaN;fvUniqueSlicePoint(hits,p,v,tol)}
  }
  if(hits.length<3)return[];const other=[0,1,2].filter(a=>a!==axis),centroid=[0,0,0];for(const h of hits)for(let a=0;a<3;a++)centroid[a]+=h.p[a]/hits.length;
  hits.sort((a,b)=>Math.atan2(a.p[other[1]]-centroid[other[1]],a.p[other[0]]-centroid[other[0]])-Math.atan2(b.p[other[1]]-centroid[other[1]],b.p[other[0]]-centroid[other[0]]));
  const out=[];for(let i=1;i<hits.length-1;i++)out.push([hits[0],hits[i],hits[i+1]]);return out
}
function fvBuildSliceGeometry(mesh,cellValues,axis='x',position=.5){
  const ai={x:0,y:1,z:2}[axis]??0,min=mesh?.boundsMin||[0,0,0],max=mesh?.boundsMax||[1,1,1],pos=fvClamp(Number(position),0,1),coord=Number(min[ai])+(Number(max[ai])-Number(min[ai]))*pos,diag=Math.hypot(max[0]-min[0],max[1]-min[1],max[2]-min[2])||1,tol=diag*1e-9;
  const pointValues=fvPointValuesFromCells(mesh,cellValues),cellFaces=fvCellFaces(mesh),pts=mesh?.points||[],centers=mesh?.cellCenters||[],positions=[],values=[];
  for(let c=0;c<cellFaces.length;c++){const cv=Number(cellValues?.[c]);if(!Number.isFinite(cv))continue;const center=[Number(centers[3*c]),Number(centers[3*c+1]),Number(centers[3*c+2])];if(!center.every(Number.isFinite))continue;
    for(const fi of cellFaces[c]){const face=fvMeshFacePoints(mesh,fi);if(face.length<3)continue;const p0=face[0];for(let j=1;j<face.length-1;j++){const ids=[p0,face[j],face[j+1]],vertices=[center,...ids.map(pi=>[Number(pts[3*pi]),Number(pts[3*pi+1]),Number(pts[3*pi+2])])],vals=[cv,...ids.map(pi=>Number(pointValues[pi]))];
      for(const tri of fvSliceTetra(vertices,vals,ai,coord,tol))for(const h of tri){positions.push(...h.p);values.push(h.value)}
    }}
  }
  return{axis,axisIndex:ai,position:pos,coordinate:coord,positions:new Float32Array(positions),values:new Float64Array(values),triangleCount:positions.length/9,interpolation:'cell-to-point inverse-distance + cell-centre tetrahedralization'}
}
function fvCaseViewAvailable(caseObj){
  const meshes=(caseObj?.meshInventory||[]).filter(g=>g?.complete),fields=caseObj?.discoveryModel?.fields||[];
  return meshes.some(mesh=>fields.some(f=>String(f?.region||'')===String(mesh?.region||'')&&f?.storage==='volume'&&['scalar','vector'].includes(String(f?.kind||''))&&Array.isArray(f?.times)&&f.times.length))
}
function fvAvailability(caseObj=null){
  const all=Array.isArray(cases)?cases:[],c=caseObj||all.find(fvCaseViewAvailable)||all[0]||null;
  if(!c)return{ready:false,caseObj:null,reason:flUi('Load an OpenFOAM case to use 3D Field View.','Carga un caso OpenFOAM para usar la Vista 3D de campos.'),meshRegions:[],fieldRegions:[]};
  const meshes=(c.meshInventory||[]).filter(g=>g?.complete),fields=(c.discoveryModel?.fields||[]).filter(f=>f?.storage==='volume'&&['scalar','vector'].includes(String(f?.kind||''))&&Array.isArray(f?.times)&&f.times.length);
  const meshRegions=[...new Set(meshes.map(g=>String(g.region||'')))],fieldRegions=[...new Set(fields.map(g=>String(g.region||'')))],shared=meshRegions.filter(r=>fieldRegions.includes(r));
  if(shared.length)return{ready:true,caseObj:c,reason:flUi('3D mesh and transient volume fields are ready.','La malla 3D y los campos volumétricos transitorios están listos.'),meshRegions,fieldRegions,sharedRegions:shared};
  if(!meshes.length&&fields.length)return{ready:false,caseObj:c,reason:flUi('No complete constant/polyMesh was detected (points, faces, owner, neighbour).','No se detectó un constant/polyMesh completo (points, faces, owner, neighbour).'),meshRegions,fieldRegions};
  if(meshes.length&&!fields.length)return{ready:false,caseObj:c,reason:flUi('A mesh was detected, but no transient volume scalar/vector fields are available for it.','Se detectó una malla, pero no hay campos volumétricos escalares/vectoriales transitorios disponibles para ella.'),meshRegions,fieldRegions};
  if(meshes.length&&fields.length)return{ready:false,caseObj:c,reason:flUi('Mesh and volume fields were detected, but not in the same region.','Se detectaron malla y campos volumétricos, pero no en la misma región.'),meshRegions,fieldRegions};
  return{ready:false,caseObj:c,reason:flUi('No complete polyMesh or compatible transient volume fields were detected.','No se detectó un polyMesh completo ni campos volumétricos transitorios compatibles.'),meshRegions,fieldRegions};
}
/* FOAMLENS_FIELD_VIEW_CORE_END */

const fvState={
  meshCache:new Map(),mesh:null,caseId:null,region:'',fieldName:'',time:NaN,component:'value',
  fieldValues:null,fieldParsed:null,vectorName:'',vectorValues:null,vectorTime:NaN,
  lockedRange:null,frameSeq:0,playing:false,timer:null,renderer:null,meshSnapshot:null,meshCacheKey:'',camera:{yaw:.72,pitch:.42,distance:2.8,target:[0,0,0]},
  drag:null,streamlines:[],spatialHash:null,sliceGeometry:null,lastStatus:''
};

function fvEsc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function fvFmt(v){v=Number(v);if(!Number.isFinite(v))return'—';const a=Math.abs(v);return a!==0&&(a<1e-4||a>=1e5)?v.toExponential(4):v.toLocaleString(undefined,{maximumSignificantDigits:7})}
function fvCase(){return caseById(Number(document.getElementById('fvCase')?.value||fvState.caseId))}
function fvMeshes(c){return (c?.meshInventory||[]).filter(g=>g.complete)}
function fvMeshForRegion(c,region){return fvMeshes(c).find(g=>String(g.region||'')===String(region||''))}
function fvFieldGroups(c,region='',kind=null){
  return (c?.discoveryModel?.fields||[]).filter(g=>String(g.region||'')===String(region||'')&&g.storage==='volume'&&(!kind||g.kind===kind)&&Array.isArray(g.times)&&g.times.length)
}
function fvCurrentFieldGroup(){const c=fvCase(),r=document.getElementById('fvRegion')?.value||'',name=document.getElementById('fvField')?.value||'';return fvFieldGroups(c,r).find(g=>g.name===name)}
function fvVectorGroup(){const c=fvCase(),r=document.getElementById('fvRegion')?.value||'',name=document.getElementById('fvVector')?.value||'';return fvFieldGroups(c,r,'vector').find(g=>g.name===name)}
function fvMeshCacheKey(c,g){return[String(c?.id??''),g?.region||'',g?.time??'constant',g?.sourcePaths?.points||'',g?.sourcePaths?.faces||'',g?.sourcePaths?.owner||'',g?.sourcePaths?.neighbour||''].join('|')}
function fvNormalizeNativeMesh(data){
  return{
    supported:!!data?.supported,reason:String(data?.reason||''),format:String(data?.format||''),
    points:(data?.points||[]).map(Number),surfaceTriangles:(data?.surfaceTriangles||[]).map(Number),surfaceOwners:(data?.surfaceOwners||[]).map(Number),surfaceEdges:(data?.surfaceEdges||[]).map(Number),
    cellCenters:(data?.cellCenters||[]).map(Number),faceOffsets:(data?.faceOffsets||[]).map(Number),facePoints:(data?.facePoints||[]).map(Number),owners:(data?.owners||[]).map(Number),neighbours:(data?.neighbours||[]).map(Number),
    pointCount:Number(data?.pointCount)||0,faceCount:Number(data?.faceCount)||0,internalFaceCount:Number(data?.internalFaceCount)||0,boundaryFaceCount:Number(data?.boundaryFaceCount)||0,
    cellCount:Number(data?.cellCount)||0,boundsMin:(data?.boundsMin||[]).map(Number),boundsMax:(data?.boundsMax||[]).map(Number),cellCenterMethod:String(data?.cellCenterMethod||''),sourceBytes:Number(data?.sourceBytes)||0
  }
}
async function fvLoadMesh(c,g){
  if(!c||!g?.complete)throw new Error(flUi('No complete polyMesh state is available for this region/time.','No hay un estado polyMesh completo disponible para esta región/tiempo.'));
  const key=fvMeshCacheKey(c,g);if(fvState.meshCache.has(key))return fvState.meshCache.get(key);
  let mesh;const files=g.files||{},native=FOAMLENS_NATIVE&&['points','faces','owner','neighbour'].every(k=>files[k]?._nativeToken);
  if(native){
    const op=foamLensNativeOperation('parseOpenFOAMMesh',{
      pointsToken:files.points._nativeToken,facesToken:files.faces._nativeToken,ownerToken:files.owner._nativeToken,neighbourToken:files.neighbour._nativeToken
    },m=>{const done=Number(m.completedBytes)||0,total=Number(m.totalBytes)||0;if(total>0)updateAppActivity(flUi('Reading OpenFOAM mesh','Leyendo malla OpenFOAM'),`${Math.min(100,100*done/total).toFixed(0)}% · ${done.toLocaleString()} / ${total.toLocaleString()} bytes`)});
    mesh=fvNormalizeNativeMesh(await op.promise)
  }else{
    const [pt,ft,ot,nt]=await Promise.all([files.points.text(),files.faces.text(),files.owner.text(),files.neighbour.text()]);mesh=fvBuildMeshFromTexts(pt,ft,ot,nt)
  }
  if(!mesh?.supported)throw new Error(flUi('Mesh could not be parsed: ','No se pudo interpretar la malla: ')+(mesh?.reason||'unknown'));
  mesh.meshTime=g.time==null?null:Number(g.time);mesh.meshTimeLabel=g.timeLabel||'constant';mesh.dynamicMesh=!!g.dynamic;mesh.changedMeshFiles=[...(g.changed||[])];
  fvState.meshCache.set(key,mesh);return mesh
}
async function fvEnsureMeshForTime(c,group,time,{resetCamera=false}={}){
  const snap=fvMeshSnapshotForTime(group,time);if(!snap)throw new Error(flUi('No mesh state exists at or before this field time.','No existe un estado de malla en este tiempo de campo o antes.'));
  const key=fvMeshCacheKey(c,snap);if(fvState.mesh&&fvState.meshCacheKey===key){fvState.meshSnapshot=snap;return fvState.mesh}
  const mesh=await fvLoadMesh(c,snap);fvState.mesh=mesh;fvState.meshSnapshot=snap;fvState.meshCacheKey=key;fvUpdateMeshBuffers(mesh,resetCamera);
  return mesh
}
function fvMeshStateLabel(){
  const snap=fvState.meshSnapshot;if(!snap)return'';
  return snap.time==null?flUi('mesh: constant','malla: constant'):`${flUi('mesh','malla')}: t=${fvFmt(snap.time)} s`
}

function fvMat4Mul(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++){let s=0;for(let k=0;k<4;k++)s+=a[k*4+r]*b[c*4+k];o[c*4+r]=s}return o}
function fvPerspective(fovy,aspect,near,far){const f=1/Math.tan(fovy/2),nf=1/(near-far);return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0])}
function fvLookAt(eye,center,up){
  let zx=eye[0]-center[0],zy=eye[1]-center[1],zz=eye[2]-center[2],zl=Math.hypot(zx,zy,zz)||1;zx/=zl;zy/=zl;zz/=zl;
  let xx=up[1]*zz-up[2]*zy,xy=up[2]*zx-up[0]*zz,xz=up[0]*zy-up[1]*zx,xl=Math.hypot(xx,xy,xz)||1;xx/=xl;xy/=xl;xz/=xl;
  const yx=zy*xz-zz*xy,yy=zz*xx-zx*xz,yz=zx*xy-zy*xx;
  return new Float32Array([xx,yx,zx,0,xy,yy,zy,0,xz,yz,zz,0,-(xx*eye[0]+xy*eye[1]+xz*eye[2]),-(yx*eye[0]+yy*eye[1]+yz*eye[2]),-(zx*eye[0]+zy*eye[1]+zz*eye[2]),1])
}
function fvCompile(gl,type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s)||'Shader compilation failed');return s}
function fvProgram(gl,vs,fs){const p=gl.createProgram();gl.attachShader(p,fvCompile(gl,gl.VERTEX_SHADER,vs));gl.attachShader(p,fvCompile(gl,gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p)||'Shader link failed');return p}
function fvCreateRenderer(canvas){
  const gl=canvas.getContext('webgl2',{antialias:true,alpha:true,preserveDrawingBuffer:true})||canvas.getContext('webgl',{antialias:true,alpha:true,preserveDrawingBuffer:true});
  if(!gl)throw new Error(flUi('WebGL is unavailable on this system.','WebGL no está disponible en este sistema.'));
  const program=fvProgram(gl,'attribute vec3 aPos; attribute vec3 aColor; uniform mat4 uMVP; varying vec3 vColor; void main(){vColor=aColor;gl_Position=uMVP*vec4(aPos,1.0);}','precision mediump float; varying vec3 vColor; uniform float uOpacity; void main(){gl_FragColor=vec4(vColor,uOpacity);}');
  return{gl,program,pos:gl.getAttribLocation(program,'aPos'),color:gl.getAttribLocation(program,'aColor'),mvp:gl.getUniformLocation(program,'uMVP'),opacity:gl.getUniformLocation(program,'uOpacity'),surfacePos:null,surfaceColor:null,surfaceCount:0,edgePos:null,edgeColor:null,edgeCount:0,slicePos:null,sliceColor:null,sliceCount:0,isoPos:null,isoColor:null,isoCount:0,vectorPos:null,vectorColor:null,vectorCount:0,linePos:null,lineColor:null,lineCount:0,probePos:null,probeColor:null,probeCount:0}
}
function fvUploadBuffer(r,key,data,usage){const gl=r.gl;if(r[key])gl.deleteBuffer(r[key]);const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,data,usage||gl.STATIC_DRAW);r[key]=b}
function fvBuildSurfaceBuffers(mesh){
  const tri=mesh.surfaceTriangles||[],pts=mesh.points||[],pos=new Float32Array(tri.length*3);
  for(let v=0;v<tri.length;v++){const pi=tri[v];pos[3*v]=Number(pts[3*pi])||0;pos[3*v+1]=Number(pts[3*pi+1])||0;pos[3*v+2]=Number(pts[3*pi+2])||0}
  const edges=mesh.surfaceEdges||[],ep=new Float32Array(edges.length*3);
  for(let i=0;i<edges.length;i++){const pi=edges[i];ep[3*i]=Number(pts[3*pi])||0;ep[3*i+1]=Number(pts[3*pi+1])||0;ep[3*i+2]=Number(pts[3*pi+2])||0}
  return{surfacePositions:pos,edgePositions:ep}
}
function fvSurfaceColors(mesh,values,min,max,palette){
  const owners=mesh.surfaceOwners||[],out=new Float32Array(owners.length*9);
  for(let ti=0;ti<owners.length;ti++){const rgb=fvColorMap(values?.[owners[ti]],min,max,palette);for(let v=0;v<3;v++){const base=(ti*3+v)*3;out[base]=rgb[0];out[base+1]=rgb[1];out[base+2]=rgb[2]}}
  return out
}
function fvConstantColors(vertexCount,rgb){const out=new Float32Array(vertexCount*3);for(let i=0;i<vertexCount;i++){out[3*i]=rgb[0];out[3*i+1]=rgb[1];out[3*i+2]=rgb[2]}return out}
function fvCameraReset(){
  const m=fvState.mesh;if(!m)return;const min=m.boundsMin,max=m.boundsMax,center=min.map((v,i)=>(v+max[i])/2),diag=Math.hypot(max[0]-min[0],max[1]-min[1],max[2]-min[2])||1;
  fvState.camera={yaw:.72,pitch:.42,distance:diag*1.65,target:center};fvRender()
}
function fvMvp(canvas){
  const c=fvState.camera,d=Math.max(1e-12,c.distance),cp=Math.cos(c.pitch),eye=[c.target[0]+d*cp*Math.sin(c.yaw),c.target[1]+d*Math.sin(c.pitch),c.target[2]+d*cp*Math.cos(c.yaw)];
  const near=Math.max(d/1000,1e-8),far=Math.max(d*20,near*100),proj=fvPerspective(Math.PI/4,Math.max(1,canvas.width)/Math.max(1,canvas.height),near,far),view=fvLookAt(eye,c.target,[0,1,0]);return fvMat4Mul(proj,view)
}
function fvBindDraw(r,posBuffer,colorBuffer,count,mode,opacity){
  if(!posBuffer||!colorBuffer||!count)return;const gl=r.gl;gl.bindBuffer(gl.ARRAY_BUFFER,posBuffer);gl.enableVertexAttribArray(r.pos);gl.vertexAttribPointer(r.pos,3,gl.FLOAT,false,0,0);
  gl.bindBuffer(gl.ARRAY_BUFFER,colorBuffer);gl.enableVertexAttribArray(r.color);gl.vertexAttribPointer(r.color,3,gl.FLOAT,false,0,0);gl.uniform1f(r.opacity,opacity);gl.drawArrays(mode,0,count)
}
function fvSliceColors(values,range,palette){
  const out=new Float32Array((values?.length||0)*3);for(let i=0;i<(values?.length||0);i++){const rgb=fvColorMap(values[i],range.min,range.max,palette);out[3*i]=rgb[0];out[3*i+1]=rgb[1];out[3*i+2]=rgb[2]}return out
}
function fvUpdateSlice(range=null){
  const r=fvState.renderer,mesh=fvState.mesh,enabled=!!document.getElementById('fvSlice')?.checked;if(!r||!mesh){return}
  if(!enabled||!fvState.fieldValues){r.sliceCount=0;fvState.sliceGeometry=null;const meta=document.getElementById('fvSliceMeta');if(meta)meta.textContent=flUi('Enable the slice to inspect the reconstructed interior field.','Activa el corte para inspeccionar el campo interior reconstruido.');fvRender();return}
  const axis=document.getElementById('fvSliceAxis')?.value||'x',position=Number(document.getElementById('fvSlicePosition')?.value)||0,displayRange=range||fvState.lockedRange||fvFiniteRange(fvState.fieldValues),palette=document.getElementById('fvPalette')?.value||'viridis',geom=fvBuildSliceGeometry(mesh,fvState.fieldValues,axis,position);
  fvState.sliceGeometry=geom;fvUploadBuffer(r,'slicePos',geom.positions,r.gl.DYNAMIC_DRAW);fvUploadBuffer(r,'sliceColor',fvSliceColors(geom.values,displayRange,palette),r.gl.DYNAMIC_DRAW);r.sliceCount=geom.positions.length/3;
  const meta=document.getElementById('fvSliceMeta');if(meta)meta.textContent=`${axis.toUpperCase()} = ${fvFmt(geom.coordinate)} · ${geom.triangleCount.toLocaleString()} ${flUi('triangles','triángulos')} · ${flUi('cell-centred reconstruction','reconstrucción desde centros de celda')}`;
  fvRender()
}
function fvRender(){
  const r=fvState.renderer,canvas=document.getElementById('fvCanvas');if(!r||!canvas)return;const gl=r.gl,rect=canvas.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1),w=Math.max(2,Math.round(rect.width*dpr)),h=Math.max(2,Math.round(rect.height*dpr));
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}gl.viewport(0,0,w,h);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.useProgram(r.program);gl.uniformMatrix4fv(r.mvp,false,fvMvp(canvas));
  const showSurface=document.getElementById('fvSurface')?.checked!==false,showEdges=document.getElementById('fvEdges')?.checked!==false,showSlice=!!document.getElementById('fvSlice')?.checked,showIso=!!document.getElementById('fvIso')?.checked,opacity=fvClamp(document.getElementById('fvOpacity')?.value??.92,.05,1),sliceOpacity=fvClamp(document.getElementById('fvSliceOpacity')?.value??.96,.05,1),isoOpacity=fvClamp(document.getElementById('fvIsoOpacity')?.value??.88,.05,1),interiorActive=showSlice||showIso;
  if(showSurface){gl.depthMask(!interiorActive);fvBindDraw(r,r.surfacePos,r.surfaceColor,r.surfaceCount,gl.TRIANGLES,interiorActive?Math.min(opacity,.28):opacity);gl.depthMask(true)}
  if(showSlice){gl.depthFunc(gl.LEQUAL);fvBindDraw(r,r.slicePos,r.sliceColor,r.sliceCount,gl.TRIANGLES,sliceOpacity)}
  if(showIso){gl.depthFunc(gl.LEQUAL);fvBindDraw(r,r.isoPos,r.isoColor,r.isoCount,gl.TRIANGLES,isoOpacity)}
  if(showEdges){gl.depthFunc(gl.LEQUAL);fvBindDraw(r,r.edgePos,r.edgeColor,r.edgeCount,gl.LINES,Math.min(1,opacity+.08))}
  if(document.getElementById('fvVectors')?.checked)fvBindDraw(r,r.vectorPos,r.vectorColor,r.vectorCount,gl.LINES,1);
  if(document.getElementById('fvStreamlines')?.checked)fvBindDraw(r,r.linePos,r.lineColor,r.lineCount,gl.LINES,1);
  if(r.probeCount){gl.depthFunc(gl.LEQUAL);fvBindDraw(r,r.probePos,r.probeColor,r.probeCount,gl.LINES,1)}
}
function fvUpdateMeshBuffers(mesh,resetCamera=true){
  const canvas=document.getElementById('fvCanvas');if(!fvState.renderer)fvState.renderer=fvCreateRenderer(canvas);const r=fvState.renderer,b=fvBuildSurfaceBuffers(mesh);
  fvUploadBuffer(r,'surfacePos',b.surfacePositions);r.surfaceCount=b.surfacePositions.length/3;fvUploadBuffer(r,'edgePos',b.edgePositions);r.edgeCount=b.edgePositions.length/3;
  fvUploadBuffer(r,'edgeColor',fvConstantColors(r.edgeCount,[.12,.16,.22]));fvUploadBuffer(r,'surfaceColor',fvConstantColors(r.surfaceCount,[.4,.55,.7]));r.sliceCount=0;r.isoCount=0;r.probeCount=0;fvState.sliceGeometry=null;fvState.isoGeometry=null;if(typeof fpClear==='function')fpClear();
  fvState.spatialHash=fvBuildSpatialHash(mesh.cellCenters,mesh.boundsMin,mesh.boundsMax,mesh.cellCount);if(resetCamera)fvCameraReset();else fvRender()
}
function fvUpdateSurfaceColors(values,range){
  const r=fvState.renderer,m=fvState.mesh;if(!r||!m||!range?.valid&&!(Number.isFinite(range?.min)&&Number.isFinite(range?.max)))return;const palette=document.getElementById('fvPalette')?.value||'viridis';
  fvUploadBuffer(r,'surfaceColor',fvSurfaceColors(m,values,range.min,range.max,palette),r.gl.DYNAMIC_DRAW);fvRender()
}
function fvSetStatus(text,error=false){fvState.lastStatus=String(text||'');const e=document.getElementById('fvStatus');if(e){e.textContent=fvState.lastStatus;e.classList.toggle('error',!!error)}}
function fvSetStats(mesh,range,parsed){
  const e=document.getElementById('fvStats');if(!e)return;const unit=parsed?.dimensions&&typeof pmUnitFromDimensions==='function'?pmUnitFromDimensions(parsed.dimensions):'';
  e.innerHTML=`<div><span>${flUi('Cells','Celdas')}</span><b>${Number(mesh?.cellCount||0).toLocaleString()}</b></div><div><span>${flUi('Surface triangles','Triángulos de superficie')}</span><b>${Number((mesh?.surfaceOwners||[]).length).toLocaleString()}</b></div><div><span>Min</span><b>${fvFmt(range?.min)}${unit?' '+fvEsc(unit):''}</b></div><div><span>Max</span><b>${fvFmt(range?.max)}${unit?' '+fvEsc(unit):''}</b></div><div><span>${flUi('Mean','Media')}</span><b>${fvFmt(range?.mean)}${unit?' '+fvEsc(unit):''}</b></div>`
}
function fvLegend(range,parsed){
  const e=document.getElementById('fvLegend');if(!e)return;const unit=parsed?.dimensions&&typeof pmUnitFromDimensions==='function'?pmUnitFromDimensions(parsed.dimensions):'',palette=document.getElementById('fvPalette')?.value||'viridis';
  e.innerHTML=`<div class="fvLegendTitle">${fvEsc(parsed?.object||fvState.fieldName||'Field')}${unit?` <span>[${fvEsc(unit)}]</span>`:''}</div><div class="fvLegendBar" style="background:${fvEsc(fvLegendGradient(palette))}"></div><div class="fvLegendTicks"><span>${fvFmt(range?.min)}</span><span>${fvFmt((range?.min+range?.max)/2)}</span><span>${fvFmt(range?.max)}</span></div>`
}
function fvPickFieldPart(set){const exact=(set||[]).find(x=>!x.partition);if(exact)return exact;return (set||[]).length===1?set[0]:null}
function fvFieldComponents(group){return group?.kind==='vector'?[{v:'magnitude',t:flUi('Magnitude','Magnitud')},{v:'x',t:'X'},{v:'y',t:'Y'},{v:'z',t:'Z'}]:[{v:'value',t:flUi('Value','Valor')}]}
async function fvLoadFrame(index=null){
  const c=fvCase(),region=document.getElementById('fvRegion')?.value||'',g=fvCurrentFieldGroup(),meshGroup=fvMeshForRegion(c,region);if(!c||!g||!meshGroup)return;
  if(typeof fpClear==='function')fpClear();
  const times=(g.times||[]).map(Number).filter(Number.isFinite).sort((a,b)=>a-b),slider=document.getElementById('fvTimeSlider');let i=index==null?Number(slider?.value)||0:Number(index);i=Math.max(0,Math.min(times.length-1,Math.round(i)));if(slider){slider.max=String(Math.max(0,times.length-1));slider.value=String(i)}
  const time=times[i],seq=++fvState.frameSeq;fvSetStatus(`${flUi('Loading','Cargando')} ${g.name} · t=${fvFmt(time)} s…`);
  const mesh=await fvEnsureMeshForTime(c,meshGroup,time,{resetCamera:false});if(seq!==fvState.frameSeq)return;
  const set=await pmLoadFieldSet(c.id,g.name,time,region);if(seq!==fvState.frameSeq)return;const parsed=fvPickFieldPart(set);
  if(!parsed)throw new Error(flUi('Field is decomposed across multiple processor partitions. Reconstruct the case before 3D visualization.','El campo está descompuesto en múltiples particiones processor. Reconstruye el caso antes de la visualización 3D.'));
  const component=document.getElementById('fvComponent')?.value||'value',vals=pmComponentValues(parsed,component,mesh.cellCount);
  if(!vals.ok||vals.values.length!==mesh.cellCount)throw new Error(`${flUi('Field/mesh cell-count mismatch','No coincide el número de celdas del campo y la malla')}: ${vals.values.length} vs ${mesh.cellCount}`);
  const range=fvFiniteRange(vals.values);if(!range.valid)throw new Error(flUi('The selected field has no finite values.','El campo seleccionado no tiene valores finitos.'));
  const lock=document.getElementById('fvLockRange')?.checked;if(lock&&!fvState.lockedRange)fvState.lockedRange={valid:true,min:range.min,max:range.max};if(!lock)fvState.lockedRange=null;
  const displayRange=fvState.lockedRange||range;fvState.fieldName=g.name;fvState.time=time;fvState.component=component;fvState.fieldValues=vals.values;fvState.fieldParsed=parsed;
  fvUpdateSurfaceColors(vals.values,displayRange);fvUpdateSlice(displayRange);if(typeof fvUpdateIso==='function')fvUpdateIso(displayRange);fvSetStats(mesh,range,parsed);fvLegend(displayRange,parsed);const read=document.getElementById('fvTimeReadout');if(read)read.textContent=`t = ${fvFmt(time)} s · ${i+1}/${times.length}${fvMeshStateLabel()?' · '+fvMeshStateLabel():''}`;
  await fvUpdateStreamlines(time,seq);if(seq!==fvState.frameSeq)return;fvSetStatus(`${c.name} · ${region||flUi('default region','región predeterminada')} · ${g.name} · t=${fvFmt(time)} s${fvMeshStateLabel()?' · '+fvMeshStateLabel():''}`)
}
function fvVectorArray(parsed,count){
  if(!parsed?.supported||parsed.kind!=='vector')return null;if(parsed.uniform){const v=(parsed.uniformValue||[]).map(Number);return v.length===3?Array.from({length:count},()=>v.slice()):null}
  const a=(parsed.values||[]).map(v=>(v||[]).map(Number));return a.length===count&&a.every(v=>v.length>=3&&v.slice(0,3).every(Number.isFinite))?a:null
}
function fvBuildLineBuffers(lines,range){
  const positions=[],colors=[],palette='turbo';for(const line of lines||[])for(let i=1;i<line.length;i++){for(const q of [line[i-1],line[i]]){positions.push(...q.p);const rgb=fvColorMap(q.speed,range.min,range.max,palette);colors.push(...rgb)}}
  return{positions:new Float32Array(positions),colors:new Float32Array(colors)}
}
function fvBuildVectorGlyphBuffers(mesh,vectors,maxGlyphs=260){
  const centers=mesh?.cellCenters||[],count=Math.min(Math.floor(centers.length/3),vectors?.length||0),diag=Math.hypot(mesh.boundsMax[0]-mesh.boundsMin[0],mesh.boundsMax[1]-mesh.boundsMin[1],mesh.boundsMax[2]-mesh.boundsMin[2])||1;
  const mags=new Array(count);for(let i=0;i<count;i++){const v=vectors[i]||[];mags[i]=Math.hypot(Number(v[0]),Number(v[1]),Number(v[2]))}
  const range=fvFiniteRange(mags),stride=Math.max(1,Math.ceil(count/Math.max(1,maxGlyphs))),positions=[],colors=[];
  for(let ci=0;ci<count;ci+=stride){
    const v=vectors[ci]||[],mag=mags[ci];if(!(mag>1e-14)||!v.every(Number.isFinite))continue;
    const u=[v[0]/mag,v[1]/mag,v[2]/mag],norm=range.valid&&range.max>range.min?(mag-range.min)/(range.max-range.min):1,len=diag*(.018+.035*fvClamp(norm,0,1));
    const p=[centers[3*ci],centers[3*ci+1],centers[3*ci+2]],q=[p[0]+u[0]*len,p[1]+u[1]*len,p[2]+u[2]*len];
    const ref=Math.abs(u[2])<.86?[0,0,1]:[0,1,0],cross=[u[1]*ref[2]-u[2]*ref[1],u[2]*ref[0]-u[0]*ref[2],u[0]*ref[1]-u[1]*ref[0]],cl=Math.hypot(...cross)||1,perp=cross.map(x=>x/cl);
    const head=len*.28,wing=len*.11,base=[q[0]-u[0]*head,q[1]-u[1]*head,q[2]-u[2]*head],left=[base[0]+perp[0]*wing,base[1]+perp[1]*wing,base[2]+perp[2]*wing],right=[base[0]-perp[0]*wing,base[1]-perp[1]*wing,base[2]-perp[2]*wing],rgb=fvColorMap(mag,range.min,range.max,'turbo');
    for(const seg of [[p,q],[q,left],[q,right]])for(const point of seg){positions.push(...point);colors.push(...rgb)}
  }
  return{positions:new Float32Array(positions),colors:new Float32Array(colors),range}
}
async function fvUpdateStreamlines(time,seq=fvState.frameSeq){
  const showStreamlines=!!document.getElementById('fvStreamlines')?.checked,showVectors=!!document.getElementById('fvVectors')?.checked,mesh=fvState.mesh,r=fvState.renderer;if(!r||!mesh)return;
  if(!showStreamlines&&!showVectors){r.lineCount=0;r.vectorCount=0;fvRender();return}
  const c=fvCase(),region=document.getElementById('fvRegion')?.value||'',g=fvVectorGroup();if(!c||!g){r.lineCount=0;r.vectorCount=0;fvRender();return}
  const vt=fvNearestTime(g.times,time);if(!Number.isFinite(vt))return;const set=await pmLoadFieldSet(c.id,g.name,vt,region);if(seq!==fvState.frameSeq)return;const parsed=fvPickFieldPart(set);if(!parsed)return;
  const vectors=fvVectorArray(parsed,mesh.cellCount);if(!vectors)throw new Error(flUi('The selected vector field does not match the mesh cell count.','El campo vectorial seleccionado no coincide con el número de celdas de la malla.'));
  fvState.vectorValues=vectors;fvState.vectorName=g.name;fvState.vectorTime=vt;

  if(showVectors){
    const glyphs=fvBuildVectorGlyphBuffers(mesh,vectors,280);fvUploadBuffer(r,'vectorPos',glyphs.positions,r.gl.DYNAMIC_DRAW);fvUploadBuffer(r,'vectorColor',glyphs.colors,r.gl.DYNAMIC_DRAW);r.vectorCount=glyphs.positions.length/3
  }else r.vectorCount=0;

  let lines=[];
  if(showStreamlines){
    const axis=document.getElementById('fvSeedAxis')?.value||'x',seedCount=Number(document.getElementById('fvSeedCount')?.value)||16,pos=Number(document.getElementById('fvSeedPosition')?.value)||.5,seeds=fvSeedPlane(mesh.boundsMin,mesh.boundsMax,axis,seedCount,pos);
    for(const seed of seeds){const line=fvCombineStreamline(seed,fvState.spatialHash,mesh.cellCenters,vectors,mesh.boundsMin,mesh.boundsMax);if(line.length>2)lines.push(line)}
    const speeds=lines.flatMap(l=>l.map(q=>q.speed)),range=fvFiniteRange(speeds),b=fvBuildLineBuffers(lines,range.valid?range:{min:0,max:1});fvUploadBuffer(r,'linePos',b.positions,r.gl.DYNAMIC_DRAW);fvUploadBuffer(r,'lineColor',b.colors,r.gl.DYNAMIC_DRAW);r.lineCount=b.positions.length/3
  }else r.lineCount=0;
  fvState.streamlines=lines;fvRender();const meta=document.getElementById('fvStreamMeta');if(meta){const parts=[];if(showVectors)parts.push(Math.round(r.vectorCount/6)+' '+flUi('vector glyphs','glyphs vectoriales'));if(showStreamlines)parts.push(lines.length+' '+flUi('streamlines','líneas de corriente'));meta.textContent=parts.join(' · ')+' · '+g.name+' @ '+fvFmt(vt)+' s'}
}
function fvStopPlayback(){fvState.playing=false;if(fvState.timer){clearTimeout(fvState.timer);fvState.timer=null}const b=document.getElementById('fvPlay');if(b)b.textContent='▶ '+flUi('Play','Reproducir')}
function fvSchedulePlayback(){
  fvStopPlayback();fvState.playing=true;const b=document.getElementById('fvPlay');if(b)b.textContent='⏸ '+flUi('Pause','Pausa');
  const tick=async()=>{if(!fvState.playing)return;const s=document.getElementById('fvTimeSlider'),n=Number(s?.max)||0,i=Number(s?.value)||0,next=i>=n?0:i+1;try{await fvLoadFrame(next)}catch(e){fvSetStatus(String(e?.message||e),true);fvStopPlayback();return}if(fvState.playing){const speed=Math.max(.1,Number(document.getElementById('fvSpeed')?.value)||1);fvState.timer=setTimeout(tick,Math.max(40,500/speed))}};tick()
}
function fvInstallCamera(){
  const canvas=document.getElementById('fvCanvas');if(!canvas||canvas.dataset.fvCamera)return;canvas.dataset.fvCamera='1';
  canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture?.(e.pointerId);fvState.drag={x:e.clientX,y:e.clientY,yaw:fvState.camera.yaw,pitch:fvState.camera.pitch}});
  canvas.addEventListener('pointermove',e=>{if(!fvState.drag)return;fvState.camera.yaw=fvState.drag.yaw+(e.clientX-fvState.drag.x)*.008;fvState.camera.pitch=fvClamp(fvState.drag.pitch+(e.clientY-fvState.drag.y)*.008,-1.48,1.48);fvRender()});
  const end=()=>{fvState.drag=null};canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);
  canvas.addEventListener('wheel',e=>{e.preventDefault();fvState.camera.distance*=Math.exp(e.deltaY*.001);fvState.camera.distance=Math.max(1e-10,fvState.camera.distance);fvRender()},{passive:false});canvas.addEventListener('dblclick',fvCameraReset)
}
function fvRefreshSelectors(preserve=true){
  const caseSel=document.getElementById('fvCase');if(!caseSel)return;const allCases=Array.isArray(cases)?cases:[],oldCase=preserve?caseSel.value:'';
  caseSel.innerHTML=allCases.map(c=>`<option value="${c.id}">${fvEsc(c.name)}${fvCaseViewAvailable(c)?' · 3D ready':''}</option>`).join('');
  if(oldCase&&allCases.some(c=>String(c.id)===oldCase))caseSel.value=oldCase;
  else if(activeContextCaseId!=null&&allCases.some(c=>Number(c.id)===Number(activeContextCaseId)))caseSel.value=String(activeContextCaseId);
  else{const firstReady=allCases.find(fvCaseViewAvailable);if(firstReady)caseSel.value=String(firstReady.id)}
  const c=fvCase(),regionSel=document.getElementById('fvRegion'),oldRegion=preserve?regionSel.value:'',meshRegions=fvMeshes(c).map(g=>String(g.region||''));
  regionSel.innerHTML=meshRegions.length?meshRegions.map(r=>`<option value="${fvEsc(r)}">${fvEsc(r||flUi('Default region','Región predeterminada'))}</option>`).join(''):'<option value="">—</option>';
  if(meshRegions.includes(oldRegion))regionSel.value=oldRegion;else if(activeContextRegion&&meshRegions.includes(activeContextRegion))regionSel.value=activeContextRegion;
  const region=regionSel.value||'',fieldSel=document.getElementById('fvField'),oldField=preserve?fieldSel.value:'',groups=fvFieldGroups(c,region).filter(g=>['scalar','vector'].includes(g.kind));
  fieldSel.innerHTML=groups.length?groups.map(g=>`<option value="${fvEsc(g.name)}">${fvEsc(g.name)} · ${fvEsc(g.kind)}</option>`).join(''):'<option value="">—</option>';if(groups.some(g=>g.name===oldField))fieldSel.value=oldField;
  const g=fvCurrentFieldGroup(),comp=document.getElementById('fvComponent'),oldComp=comp.value;comp.innerHTML=fvFieldComponents(g).map(o=>`<option value="${o.v}">${fvEsc(o.t)}</option>`).join('');if([...comp.options].some(o=>o.value===oldComp))comp.value=oldComp;
  const vectorSel=document.getElementById('fvVector'),oldVector=vectorSel.value,vg=fvFieldGroups(c,region,'vector');vectorSel.innerHTML=vg.length?vg.map(g=>`<option value="${fvEsc(g.name)}">${fvEsc(g.name)}</option>`).join(''):'<option value="">—</option>';if(vg.some(g=>g.name===oldVector))vectorSel.value=oldVector;
  const times=g?.times||[],slider=document.getElementById('fvTimeSlider');slider.max=String(Math.max(0,times.length-1));if(Number(slider.value)>Number(slider.max))slider.value=slider.max;
  const readyCases=allCases.filter(fvCaseViewAvailable),tab=document.getElementById('fieldViewTab'),count=document.getElementById('fieldViewCount');if(tab){tab.disabled=false;tab.title=readyCases.length?flUi('Open 3D Field View','Abrir Vista 3D de campos'):flUi('Open Field View to see what data is missing','Abre Vista de campos para ver qué datos faltan')}if(count)count.textContent=String(readyCases.length);
  const availability=fvAvailability(c),status=document.getElementById('fvStatus');if(status&&!availability.ready){status.textContent=availability.reason;status.classList.add('error')}
}
async function fvLoadSelection(){
  fvStopPlayback();fvState.lockedRange=null;fvRefreshSelectors(true);const c=fvCase(),availability=fvAvailability(c),region=document.getElementById('fvRegion')?.value||'',g=fvMeshForRegion(c,region),fg=fvCurrentFieldGroup();
  if(!availability.ready||!c||!g||!fg){fvState.mesh=null;fvState.meshSnapshot=null;fvState.meshCacheKey='';fvSetStatus(availability.reason,true);fvSetStats(null,null,null);const legend=document.getElementById('fvLegend');if(legend)legend.innerHTML='<div class="fvLegendTitle">'+fvEsc(flUi('3D data unavailable','Datos 3D no disponibles'))+'</div>';fvRender();return}
  try{const firstTime=(fg.times||[]).map(Number).filter(Number.isFinite).sort((a,b)=>a-b)[0];fvSetStatus(flUi('Loading mesh…','Cargando malla…'));fvState.caseId=c.id;fvState.region=region;await fvEnsureMeshForTime(c,g,firstTime,{resetCamera:true});await fvLoadFrame(0)}catch(e){console.error(e);fvSetStatus(String(e?.message||e),true)}
}
function fvSyncComponent(){
  const g=fvCurrentFieldGroup(),comp=document.getElementById('fvComponent'),old=comp.value;comp.innerHTML=fvFieldComponents(g).map(o=>`<option value="${o.v}">${fvEsc(o.t)}</option>`).join('');if([...comp.options].some(o=>o.value===old))comp.value=old;
  const s=document.getElementById('fvTimeSlider');s.max=String(Math.max(0,(g?.times?.length||1)-1));s.value='0';fvState.lockedRange=null;fvLoadFrame(0).catch(e=>fvSetStatus(String(e?.message||e),true))
}
function fvUiHtml(){
  return`<div class="fieldViewControls hidden" id="fieldViewControls">
    <div class="analysisTitle"><strong data-fl-en="3D Field View" data-fl-es="Vista 3D de campos">3D Field View</strong><span class="badge">OpenFOAM polyMesh</span></div>
    <div class="row2"><div class="field"><label data-fl-en="Case" data-fl-es="Caso">Case</label><select id="fvCase"></select></div><div class="field"><label data-fl-en="Region" data-fl-es="Región">Region</label><select id="fvRegion"></select></div></div>
    <div class="row2"><div class="field"><label data-fl-en="Color by" data-fl-es="Colorear por">Color by</label><select id="fvField"></select></div><div class="field"><label data-fl-en="Component" data-fl-es="Componente">Component</label><select id="fvComponent"></select></div></div>
    <div class="field"><label data-fl-en="Colormap" data-fl-es="Mapa de color">Colormap</label><select id="fvPalette"><option value="viridis">Viridis</option><option value="turbo">Turbo</option><option value="coolwarm">Cool–warm</option></select></div>
    <div class="fvChecks"><label class="inlineCheck"><input id="fvSurface" type="checkbox" checked> <span data-fl-en="Surface" data-fl-es="Superficie">Surface</span></label><label class="inlineCheck"><input id="fvEdges" type="checkbox" checked> <span data-fl-en="Mesh edges" data-fl-es="Aristas de malla">Mesh edges</span></label><label class="inlineCheck"><input id="fvLockRange" type="checkbox"> <span data-fl-en="Lock color range" data-fl-es="Bloquear rango de color">Lock color range</span></label></div>
    <div class="field"><label data-fl-en="Surface opacity" data-fl-es="Opacidad de superficie">Surface opacity</label><input id="fvOpacity" type="range" min=".05" max="1" step=".05" value=".92"></div>
    <div class="fvTimeline"><input id="fvTimeSlider" type="range" min="0" max="0" step="1" value="0"><div class="fvTimelineActions"><button class="btn tiny" id="fvPrev" type="button">‹</button><button class="btn soft" id="fvPlay" type="button">▶ Play</button><button class="btn tiny" id="fvNext" type="button">›</button><select id="fvSpeed"><option value=".25">0.25×</option><option value=".5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option><option value="4">4×</option></select></div><div class="smallnote" id="fvTimeReadout">t = —</div></div>
    <details class="analysisExt" open><summary class="analysisExtHead"><strong data-fl-en="Interior slice" data-fl-es="Corte interior">Interior slice</strong><span class="badge">polyMesh</span></summary><div class="extSectionBody">
      <div class="fvChecks"><label class="inlineCheck"><input id="fvSlice" type="checkbox"> <span data-fl-en="Show slice" data-fl-es="Mostrar corte">Show slice</span></label></div>
      <div class="row2"><div class="field"><label data-fl-en="Plane normal" data-fl-es="Normal del plano">Plane normal</label><select id="fvSliceAxis"><option value="x">X</option><option value="y">Y</option><option value="z">Z</option></select></div><div class="field"><label data-fl-en="Slice opacity" data-fl-es="Opacidad del corte">Slice opacity</label><input id="fvSliceOpacity" type="range" min=".05" max="1" step=".05" value=".96"></div></div>
      <div class="field"><label data-fl-en="Plane position" data-fl-es="Posición del plano">Plane position</label><input id="fvSlicePosition" type="range" min=".001" max=".999" step=".005" value=".5"></div>
      <div class="smallnote" id="fvSliceMeta" data-fl-en="Values are reconstructed from cell-centred fields using adjacent-cell interpolation and cell tetrahedralization; results are not claimed to be bit-identical to ParaView/VTK." data-fl-es="Los valores se reconstruyen desde campos centrados en celdas mediante interpolación de celdas adyacentes y tetraedrización; no se afirma equivalencia bit a bit con ParaView/VTK.">Values are reconstructed from cell-centred fields using adjacent-cell interpolation and cell tetrahedralization; results are not claimed to be bit-identical to ParaView/VTK.</div>
    </div></details>
    <details class="analysisExt" open><summary class="analysisExtHead"><strong data-fl-en="Vector field visualization" data-fl-es="Visualización de campo vectorial">Vector field visualization</strong><span class="badge">U(x,t)</span></summary><div class="extSectionBody">
      <div class="fvChecks"><label class="inlineCheck"><input id="fvVectors" type="checkbox"> <span data-fl-en="Vectors" data-fl-es="Vectores">Vectors</span></label><label class="inlineCheck"><input id="fvStreamlines" type="checkbox"> <span data-fl-en="Streamlines" data-fl-es="Líneas de corriente">Streamlines</span></label></div>
      <div class="field"><label data-fl-en="Vector field" data-fl-es="Campo vectorial">Vector field</label><select id="fvVector"></select></div>
      <div class="row2"><div class="field"><label data-fl-en="Seed plane normal" data-fl-es="Normal del plano de semillas">Seed plane normal</label><select id="fvSeedAxis"><option value="x">X</option><option value="y">Y</option><option value="z">Z</option></select></div><div class="field"><label data-fl-en="Seeds" data-fl-es="Semillas">Seeds</label><input id="fvSeedCount" type="number" min="1" max="64" step="1" value="16"></div></div>
      <div class="field"><label data-fl-en="Seed plane position" data-fl-es="Posición del plano de semillas">Seed plane position</label><input id="fvSeedPosition" type="range" min="0" max="1" step=".02" value=".5"></div>
      <div class="smallnote" id="fvStreamMeta" data-fl-en="Streamlines are integrated from the instantaneous cell-centered vector field." data-fl-es="Las líneas de corriente se integran a partir del campo vectorial instantáneo centrado en celdas.">Streamlines are integrated from the instantaneous cell-centered vector field.</div>
    </div></details>
    <div class="extStatus" id="fvStatus"></div>
  </div>`
}
function fvPanelHtml(){
  return`<div class="fieldViewPanel" id="fieldViewPanel">
    <div class="fvViewport"><canvas id="fvCanvas" aria-label="3D OpenFOAM field visualization"></canvas><div class="fvLegend" id="fvLegend"></div><div class="fvViewTools"><button class="btn tiny" id="fvResetCamera" type="button" data-fl-en="Reset camera" data-fl-es="Restablecer cámara">Reset camera</button></div></div>
    <div class="fvStats" id="fvStats"></div>
    <div class="smallnote fvHelp" data-fl-en="Drag to orbit · mouse wheel to zoom · double-click to reset camera." data-fl-es="Arrastra para orbitar · rueda del mouse para zoom · doble clic para restablecer cámara.">Drag to orbit · mouse wheel to zoom · double-click to reset camera.</div>
  </div>`
}
function fvCss(){
  return`.fieldViewPanel{display:none;min-height:560px;padding:12px}.fieldViewPanel.active{display:block}.workspace.fvMode{grid-template-columns:minmax(0,1fr)}.workspace.fvMode #seriesPanel{display:none}.fvViewport{position:relative;min-height:500px;border:1px solid var(--line);border-radius:16px;overflow:hidden;background:radial-gradient(circle at 50% 42%,rgba(40,64,90,.23),rgba(5,13,23,.96) 68%)}#fvCanvas{display:block;width:100%;height:500px;touch-action:none;cursor:grab}#fvCanvas:active{cursor:grabbing}.fvLegend{position:absolute;right:14px;bottom:14px;width:min(240px,42%);padding:10px;border:1px solid var(--line);border-radius:12px;background:color-mix(in srgb,var(--panel) 88%,transparent);backdrop-filter:blur(8px);font-size:10px}.fvLegendTitle{font-weight:700;margin-bottom:7px;overflow:hidden;text-overflow:ellipsis}.fvLegendTitle span{color:var(--muted);font-weight:500}.fvLegendBar{height:12px;border-radius:999px;background:linear-gradient(90deg,rgb(68,1,84),rgb(59,82,139),rgb(33,145,140),rgb(94,201,98),rgb(253,231,37))}.fvLegendTicks{display:flex;justify-content:space-between;gap:4px;margin-top:5px;color:var(--muted)}.fvViewTools{position:absolute;left:12px;top:12px}.fvStats{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin-top:10px}.fvStats>div{padding:8px 10px;border:1px solid var(--line);border-radius:10px;background:var(--panel2);min-width:0}.fvStats span{display:block;color:var(--muted);font-size:9px}.fvStats b{display:block;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.fvHelp{margin-top:8px}.fvChecks{display:flex;gap:10px;flex-wrap:wrap;margin:8px 0}.fvTimeline{margin:9px 0 12px}.fvTimeline>input[type=range]{width:100%}.fvTimelineActions{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:6px}.fvTimelineActions select{width:auto;min-width:72px}.fvStatus.error{color:#d85b65}.fieldViewControls input[type=range]{width:100%}@media(max-width:780px){.fvStats{grid-template-columns:repeat(2,minmax(0,1fr))}.fvViewport,#fvCanvas{min-height:420px;height:420px}.fvLegend{width:min(220px,55%)}}`
}
function fvInstallUi(){
  if(document.getElementById('fieldViewTab'))return true;const tabs=document.querySelector('.datasetTabs'),catalog=document.getElementById('catalogTab');if(!tabs||!catalog)return false;
  const tab=document.createElement('button');tab.className='datasetTab';tab.id='fieldViewTab';tab.type='button';tab.disabled=false;tab.innerHTML='<span id="fieldViewTabLabel" data-fl-en="Field View" data-fl-es="Vista de campos">Field View</span><span class="datasetTabCount" id="fieldViewCount">0</span>';catalog.insertAdjacentElement('afterend',tab);
  document.getElementById('catalogControls')?.insertAdjacentHTML('afterend',fvUiHtml());document.getElementById('chartViewport')?.insertAdjacentHTML('beforeend',fvPanelHtml());
  const style=document.createElement('style');style.id='fvStyles';style.textContent=fvCss();document.head.appendChild(style);flApplyBilingualText(document);tab.onclick=()=>setDataView('field3d');fvInstallCamera();
  document.getElementById('fvCase').onchange=()=>{fvRefreshSelectors(false);fvLoadSelection()};document.getElementById('fvRegion').onchange=()=>{fvRefreshSelectors(true);fvLoadSelection()};document.getElementById('fvField').onchange=()=>fvSyncComponent();
  document.getElementById('fvComponent').onchange=()=>{fvState.lockedRange=null;fvLoadFrame().catch(e=>fvSetStatus(String(e?.message||e),true))};
  document.getElementById('fvPalette').onchange=()=>{const range=fvState.lockedRange||fvFiniteRange(fvState.fieldValues);if(fvState.fieldValues&&range.valid){fvUpdateSurfaceColors(fvState.fieldValues,range);fvUpdateSlice(range);if(typeof fvUpdateIso==='function')fvUpdateIso(range);fvLegend(range,fvState.fieldParsed)}};
  document.getElementById('fvSurface').onchange=fvRender;document.getElementById('fvEdges').onchange=fvRender;document.getElementById('fvOpacity').oninput=fvRender;
  document.getElementById('fvLockRange').onchange=e=>{fvState.lockedRange=e.target.checked?fvFiniteRange(fvState.fieldValues):null;if(fvState.fieldValues){const r=fvState.lockedRange||fvFiniteRange(fvState.fieldValues);fvUpdateSurfaceColors(fvState.fieldValues,r);fvUpdateSlice(r);if(typeof fvUpdateIso==='function')fvUpdateIso(r);fvLegend(r,fvState.fieldParsed)}};
  document.getElementById('fvTimeSlider').oninput=e=>{fvStopPlayback();fvLoadFrame(Number(e.target.value)).catch(err=>fvSetStatus(String(err?.message||err),true))};
  document.getElementById('fvPrev').onclick=()=>{fvStopPlayback();const s=document.getElementById('fvTimeSlider');fvLoadFrame(fvAdvanceIndex(s.value,-1,Number(s.max)+1)).catch(e=>fvSetStatus(String(e?.message||e),true))};
  document.getElementById('fvNext').onclick=()=>{fvStopPlayback();const s=document.getElementById('fvTimeSlider');fvLoadFrame(fvAdvanceIndex(s.value,1,Number(s.max)+1)).catch(e=>fvSetStatus(String(e?.message||e),true))};
  document.getElementById('fvPlay').onclick=()=>fvState.playing?fvStopPlayback():fvSchedulePlayback();document.getElementById('fvResetCamera').onclick=fvCameraReset;
  document.getElementById('fvSlice').onchange=()=>fvUpdateSlice();
  document.getElementById('fvSliceAxis').onchange=()=>fvUpdateSlice();
  document.getElementById('fvSlicePosition').oninput=()=>fvUpdateSlice();
  document.getElementById('fvSliceOpacity').oninput=fvRender;
  for(const id of ['fvVectors','fvStreamlines','fvVector','fvSeedAxis','fvSeedCount','fvSeedPosition'])document.getElementById(id).addEventListener(id==='fvSeedPosition'?'input':'change',()=>fvUpdateStreamlines(fvState.time).catch(e=>fvSetStatus(String(e?.message||e),true)));
  if(typeof ResizeObserver!=='undefined')new ResizeObserver(()=>fvRender()).observe(document.getElementById('fvCanvas'));
  const goData=document.getElementById('workspaceGoData'),actions=goData?.parentElement;if(actions&&!document.getElementById('workspaceGoFieldView')){const q=document.createElement('button');q.className='btn';q.id='workspaceGoFieldView';q.type='button';q.setAttribute('data-fl-en','Open 3D Field View');q.setAttribute('data-fl-es','Abrir Vista 3D');q.textContent=flUi('Open 3D Field View','Abrir Vista 3D');q.onclick=()=>{try{setAppMode('data')}catch{}setDataView('field3d')};goData.insertAdjacentElement('afterend',q);flApplyBilingualText(q)}
  return true
}
function fvShow(){
  fvInstallUi();fvRefreshSelectors(true);currentDataView='field3d';stopAllPlayback();document.querySelectorAll('.datasetTab').forEach(x=>x.classList.toggle('active',x.id==='fieldViewTab'));
  for(const id of ['timeSeriesControls','profileControls','logControls','catalogControls','playbackGlobal'])document.getElementById(id)?.classList.add('hidden');document.getElementById('fieldViewControls')?.classList.remove('hidden');document.querySelector('#chartViewport .chartwrap')?.classList.add('hidden');document.getElementById('dataCatalogPanel')?.classList.remove('active');document.getElementById('dataCatalogPanel')?.classList.add('hidden');
  document.getElementById('fieldViewPanel')?.classList.add('active');document.getElementById('workspace')?.classList.add('fvMode');const pt=document.getElementById('plotTitle');if(pt)pt.textContent=flUi('3D OpenFOAM Field View','Vista 3D de campos OpenFOAM');const pi=document.getElementById('plotInfo');if(pi)pi.textContent=flUi('Mesh + transient fields','Malla + campos transitorios');setTimeout(()=>fvLoadSelection(),0)
}
function fvHide(){
  fvStopPlayback();document.getElementById('fieldViewControls')?.classList.add('hidden');document.getElementById('fieldViewPanel')?.classList.remove('active');document.getElementById('workspace')?.classList.remove('fvMode');document.querySelector('#chartViewport .chartwrap')?.classList.remove('hidden');document.getElementById('dataCatalogPanel')?.classList.remove('hidden')
}
function fvApplyBuildIdentity(){
  const overlay=document.getElementById('versionOverlay');if(!overlay)return;
  for(const block of overlay.querySelectorAll('.detailBlock')){
    const label=String(block.querySelector('span')?.textContent||'').trim().toLowerCase();
    if(label==='version'){const detail=block.querySelector('div');if(detail)detail.textContent='Desktop v1.4.1'}
  }
}
function fvInstallIntegration(){
  fvApplyBuildIdentity();
  const mount=()=>{if(!fvInstallUi())return false;fvRefreshSelectors(false);return true};
  mount();
  if(!document.getElementById('fieldViewTab')){
    const retry=()=>{if(mount())return;requestAnimationFrame(retry)};requestAnimationFrame(retry)
  }
  const prevApply=applyCandidateMetadata;applyCandidateMetadata=async function(c,candidate){const x=await prevApply.apply(this,arguments);c.meshInventory=fvBuildMeshInventory(candidate?.allFiles||[],c?.rootPath||'');c.discovery={...(c.discovery||{}),hasMesh:c.meshInventory.some(g=>g.complete),meshRegions:c.meshInventory.filter(g=>g.complete).map(g=>g.region||'')};setTimeout(()=>{mount();fvRefreshSelectors(true)},0);return x};
  const prevSet=setDataView;setDataView=function(mode){if(mode==='field3d'){fvShow();return}if(currentDataView==='field3d'){fvHide();currentDataView='catalog'}return prevSet.apply(this,arguments)};
  try{const prevRefresh=refreshDatasetControls;refreshDatasetControls=function(...args){const x=prevRefresh.apply(this,args);setTimeout(()=>{mount();fvRefreshSelectors(true)},0);return x}}catch{}
  document.addEventListener('foamlens-language-change',()=>{const c=document.getElementById('fieldViewControls'),p=document.getElementById('fieldViewPanel'),q=document.getElementById('workspaceGoFieldView');if(c)flApplyBilingualText(c);if(p)flApplyBilingualText(p);if(q)flApplyBilingualText(q);if(currentDataView==='field3d')fvRefreshSelectors(true)});
  window.FoamLensFieldView={fvBuildMeshInventory,fvBuildMeshFromTexts,fvNearestTime,fvAdvanceIndex,fvColorMap,fvSeedPlane,fvIntegrateStreamline,fvCaseViewAvailable,fvAvailability}
}
fvInstallIntegration();
