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

function cgBinaryStl(triangles,scale,name){
  if(!Array.isArray(triangles)||!triangles.length||triangles.length>cgLimitTriangles)throw Error('Invalid triangle count for binary STL');
  if(!Number.isFinite(scale)||scale<=0)throw Error('Confirm positive source-to-meter scale');
  const data=new Uint8Array(84+50*triangles.length),view=new DataView(data.buffer);
  data.set(new TextEncoder().encode('FoamLens '+cgSafeName(name)).subarray(0,80));
  view.setUint32(80,triangles.length,true);
  triangles.forEach((tri,i)=>{
    if(!Array.isArray(tri.vertices)||tri.vertices.length!==3)throw Error('Invalid triangle');
    const v=tri.vertices.map(p=>p.map(x=>cgNumber(x)*scale));
    const n=cgCross(cgSub(v[1],v[0]),cgSub(v[2],v[0])),mag=cgNorm(n),normal=mag?n.map(x=>x/mag):[0,0,0];
    const base=84+i*50;
    const put=(at,x)=>{
      if(!Number.isFinite(x)||Math.abs(x)>3.402823466e38)throw Error('STL coordinate outside float32 range');
      view.setFloat32(base+at,x,true)
    };
    normal.forEach((x,k)=>put(k*4,x));
    v.forEach((p,j)=>p.forEach((x,k)=>put(12+j*12+k*4,x)));
    view.setUint16(base+48,0,true)
  });
  return data
}
function cgCrc32(bytes){
  let c=0xffffffff;
  for(const b of bytes){c^=b;for(let j=0;j<8;j++)c=(c>>>1)^((c&1)?0xedb88320:0)}
  return (c^0xffffffff)>>>0
}
function cgStoreZip(entries){
  if(!Array.isArray(entries)||!entries.length||entries.length>1001)throw Error('ZIP entry count outside 1–1001');
  const encoder=new TextEncoder(),seen=new Set(),rows=[];let size=22;
  for(const e of entries){
    const name=String(e.name||''),bytes=typeof e.data==='string'?encoder.encode(e.data):e.data;
    if(!name||name.includes('..')||name.includes('\\')||name.startsWith('/')||
       !/^[\x20-\x7e]+$/.test(name)||seen.has(name))throw Error('Unsafe or duplicate ZIP path');
    if(!(bytes instanceof Uint8Array))throw Error('Invalid ZIP data');
    const label=encoder.encode(name);seen.add(name);
    if(bytes.length>100*1024*1024)throw Error('ZIP entry exceeds 100 MiB');
    size+=76+2*label.length+bytes.length;
    if(size>128*1024*1024)throw Error('ZIP exceeds 128 MiB');
    rows.push({label,bytes,crc:cgCrc32(bytes)})
  }
  const output=new Uint8Array(size),view=new DataView(output.buffer);let pos=0;
  for(const row of rows){
    row.offset=pos;
    view.setUint32(pos,0x04034b50,true);view.setUint16(pos+4,20,true);
    view.setUint32(pos+14,row.crc,true);
    view.setUint32(pos+18,row.bytes.length,true);view.setUint32(pos+22,row.bytes.length,true);
    view.setUint16(pos+26,row.label.length,true);
    output.set(row.label,pos+30);output.set(row.bytes,pos+30+row.label.length);
    pos+=30+row.label.length+row.bytes.length
  }
  const directory=pos;
  for(const row of rows){
    view.setUint32(pos,0x02014b50,true);view.setUint16(pos+4,20,true);view.setUint16(pos+6,20,true);
    view.setUint32(pos+16,row.crc,true);
    view.setUint32(pos+20,row.bytes.length,true);view.setUint32(pos+24,row.bytes.length,true);
    view.setUint16(pos+28,row.label.length,true);view.setUint32(pos+42,row.offset,true);
    output.set(row.label,pos+46);pos+=46+row.label.length
  }
  view.setUint32(pos,0x06054b50,true);view.setUint16(pos+8,rows.length,true);
  view.setUint16(pos+10,rows.length,true);view.setUint32(pos+12,pos-directory,true);
  view.setUint32(pos+16,directory,true);
  if(pos+22!==size)throw Error('ZIP size mismatch');
  return output
}
function cgVisibleRegionBatch(models){
  const files=[],regions=[];let totalTriangles=0,topologyWarnings=0;
  for(let mi=0;mi<models.length;mi++){
    const m=models[mi];if(!m.visible)continue;
    const selected=[...m.partsVisible].filter(([,visible])=>visible);
    if(!selected.length)continue;
    const scale=cgUnitScale(m.unit);
    if(!scale)throw Error('Confirm the physical source units for EVERY visible region');
    for(let pi=0;pi<selected.length;pi++){
      const part=selected[pi][0],triangles=m.triangles.filter(t=>t.part===part);
      if(!triangles.length)continue;
      totalTriangles+=triangles.length;
      if(totalTriangles>300000||regions.length>=1000)throw Error('Batch geometry safety limit exceeded');
      const sum=cgSummary(triangles);
      const hasWarnings=!!(sum.boundaryEdges||sum.nonManifoldEdges||sum.orientationConflicts||sum.degenerate);
      if(hasWarnings)topologyWarnings++;
      const name='surfaces/model'+String(mi+1).padStart(3,'0')+
        '_region'+String(pi+1).padStart(3,'0')+'_'+cgSafeName(part).slice(0,40)+'.stl';
      files.push({name,data:cgBinaryStl(triangles,scale,part)});
      regions.push({sourceFile:m.name,sourceFormat:m.format,sourceBytes:m.bytes,part,outputFile:name,
        sourceUnitConfirmedByUser:m.unit,sourceToMeterScale:scale,outputCoordinates:'meters',
        boundsMeters:sum.bounds.size.map(x=>x*scale),areaSquareMeters:sum.area*scale*scale,
        sourceTopology:sum,topologyWarningsPresent:hasWarnings})
    }
  }
  if(!regions.length)throw Error('Select at least one visible named region');
  const manifest={schema:'foamlens/cad-batch-surfaces/1',regionCount:regions.length,
    triangleCount:totalTriangles,topologyWarnings,
    exportType:'individual binary STL triSurfaces in meters; NOT an OpenFOAM volume mesh',
    regions,openFoamCaseMutated:false,toolsExecuted:[],
    limitations:['STL/OBJ coordinates require user-confirmed units.',
      'Topology checks do not prove self-intersection-free geometry.',
      'The ZIP does not run surfaceCheck or create an OpenFOAM polyMesh.',
      'Destination geometry path depends on the verified OpenFOAM distribution.']};
  files.push({name:'manifest.json',data:JSON.stringify(manifest,null,2)+'\n'});
  return {files,manifest,topologyWarnings}
}

// Only FoamLens' own uncompressed, CRC-checked ZIP STORE format is accepted.
// This does not silently import arbitrary compressed archives or project files.
function cgReadStoredZip(input){
  const bytes=input instanceof ArrayBuffer?new Uint8Array(input):
    ArrayBuffer.isView(input)?new Uint8Array(input.buffer,input.byteOffset,input.byteLength):null;
  if(!bytes||bytes.length<22||bytes.length>128*1024*1024)
    throw Error('Invalid ZIP archive size (limit 128 MiB)');
  const dv=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),end=bytes.length-22;
  if(dv.getUint32(end,true)!==0x06054b50||dv.getUint16(end+20,true)!==0)
    throw Error('Only FoamLens ZIP files without comments are supported');
  const count=dv.getUint16(end+10,true),directoryLength=dv.getUint32(end+12,true),
    directoryAt=dv.getUint32(end+16,true);
  if(count<2||count>1001||dv.getUint16(end+8,true)!==count||
     dv.getUint16(end+4,true)!==0||dv.getUint16(end+6,true)!==0||
     directoryAt> end||directoryLength> end-directoryAt||
     directoryAt+directoryLength!==end)
    throw Error('ZIP central directory is invalid or unsupported');
  const decoder=new TextDecoder('utf-8',{fatal:true}),seen=new Set(),files=[];
  let central=directoryAt,local=0;
  for(let i=0;i<count;i++){
    if(central+46>end||dv.getUint32(central,true)!==0x02014b50)
      throw Error('Missing or truncated ZIP central entry');
    const flags=dv.getUint16(central+8,true),method=dv.getUint16(central+10,true);
    const crc=dv.getUint32(central+16,true),size=dv.getUint32(central+20,true),
      unpacked=dv.getUint32(central+24,true),nameLength=dv.getUint16(central+28,true),
      extra=dv.getUint16(central+30,true),comment=dv.getUint16(central+32,true),
      localOffset=dv.getUint32(central+42,true);
    if(flags!==0||method!==0||size!==unpacked||size>100*1024*1024||
       extra!==0||comment!==0||localOffset!==local||nameLength<1||
       central+46+nameLength>end||local+30+nameLength>directoryAt)
      throw Error('Compressed or irregular ZIP entries are not supported');
    const name=decoder.decode(bytes.subarray(central+46,central+46+nameLength));
    if(!/^[\x20-\x7e]+$/.test(name)||name.startsWith('/')||
       name.includes('..')||name.includes('\\')||seen.has(name))
      throw Error('Unsafe or duplicated ZIP entry');
    seen.add(name);
    if(dv.getUint32(local,true)!==0x04034b50||
       dv.getUint16(local+6,true)!==0||dv.getUint16(local+8,true)!==0||
       dv.getUint32(local+14,true)!==crc||
       dv.getUint32(local+18,true)!==size||dv.getUint32(local+22,true)!==size||
       dv.getUint16(local+26,true)!==nameLength||dv.getUint16(local+28,true)!==0)
      throw Error('ZIP local header differs from central entry');
    const localName=decoder.decode(bytes.subarray(local+30,local+30+nameLength));
    if(localName!==name||size>directoryAt-(local+30+nameLength))
      throw Error('ZIP payload is truncated or mismatched');
    const data=bytes.subarray(local+30+nameLength,local+30+nameLength+size);
    if(cgCrc32(data)!==crc)throw Error('ZIP CRC-32 mismatch for '+name);
    files.push({name,data});
    local+=30+nameLength+size;
    central+=46+nameLength
  }
  if(central!==end||local!==directoryAt)
    throw Error('Unexpected ZIP content or byte offsets');
  return files
}
function cgRestoreRegionBatch(input){
  const files=cgReadStoredZip(input),byName=new Map(files.map(x=>[x.name,x.data]));
  if(!byName.has('manifest.json'))throw Error('FoamLens CAD package needs manifest.json');
  const manifestBytes=byName.get('manifest.json');
  if(manifestBytes.length>4*1024*1024)throw Error('CAD provenance manifest exceeds 4 MiB safety limit');
  const decoder=new TextDecoder('utf-8',{fatal:true});
  const manifest=JSON.parse(decoder.decode(manifestBytes));
  if(manifest?.schema!=='foamlens/cad-batch-surfaces/1'||!Array.isArray(manifest.regions)||
     manifest.regions.length<1||manifest.regions.length>1000||
     manifest.regionCount!==manifest.regions.length||
     manifest.openFoamCaseMutated!==false||
     manifest.regions.length+1!==files.length)
    throw Error('Invalid FoamLens CAD export manifest');
  const models=[];let triangleCount=0;const paths=new Set();
  for(const region of manifest.regions){
    const file=region?.outputFile,part=region?.part;
    if(typeof file!=='string'||!/^surfaces\/[a-zA-Z0-9_.-]+\.stl$/.test(file)||
       !byName.has(file)||paths.has(file)||typeof part!=='string'||
       !part.trim()||part.length>120||region.outputCoordinates!=='meters')
      throw Error('Invalid or duplicate region provenance in manifest');
    paths.add(file);
    const scale=cgUnitScale(region.sourceUnitConfirmedByUser);
    if(!scale||region.sourceToMeterScale!==scale)
      throw Error('Missing or conflicting original source units');
    const data=byName.get(file),parsed=cgParseStl(data.buffer.slice(
      data.byteOffset,data.byteOffset+data.byteLength),file);
    if(parsed.format!=='binary-stl')throw Error('FoamLens region must be binary STL');
    const count=parsed.triangles.length;
    if(region.sourceTopology?.triangles!==count)throw Error('Region triangle count differs from manifest');
    triangleCount+=count;
    if(triangleCount>300000)throw Error('CAD import exceeds 300000 triangle preview limit');
    // The archive contains coordinates already in meters. Retaining the
    // manifest's *original* source unit is provenance, never a second scaling.
    for(const triangle of parsed.triangles)triangle.part=part;
    const summary=cgSummary(parsed.triangles);
    if(!Array.isArray(region.boundsMeters)||region.boundsMeters.length!==3)
      throw Error('Region bounds missing from manifest');
    {
      for(let k=0;k<3;k++){
        const expected=Number(region.boundsMeters[k]);
        if(!Number.isFinite(expected)||Math.abs(summary.bounds.size[k]-expected)>
           Math.max(1e-7,Math.abs(expected)*1e-5))
          throw Error('Region dimensions differ from the manifest in meters')
      }
    }
    const originalArea=Number(region.areaSquareMeters),computedArea=summary.area;
    if(!Number.isFinite(originalArea)||originalArea<0||
       Math.abs(originalArea-computedArea)>Math.max(1e-9,Math.abs(originalArea)*2e-5))
      throw Error('Region surface area differs from the manifest in square meters');
    models.push({
      name:String(region.sourceFile||file).slice(0,180)+' / '+part,
      bytes:data.byteLength,format:'foamlens-zip-binary-stl',
      triangles:parsed.triangles,summary,
      partSummaries:new Map([[part,summary]]),
      partsVisible:new Map([[part,true]]),
      warnings:['Reimported from FoamLens ZIP. Coordinates are meters as declared in the export manifest; original '+region.sourceUnitConfirmedByUser+' units are provenance, not independently verified.'],
      unit:'m',visible:true,
      sourceProvenance:{sourceFile:String(region.sourceFile||''),part,
        originalUnit:region.sourceUnitConfirmedByUser,
        originalToMeterScale:scale,archivePath:file}
    })
  }
  if(manifest.triangleCount!==triangleCount)
    throw Error('Total region triangles differ from manifest');
  return {models,manifest}
}
/* FOAMLENS_CAD_CORE_END */

function cgUi(en,es){try{return typeof flUi==='function'?flUi(en,es):en}catch{return en}}
function cgEscape(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
let cgModels=[],cgYaw=.55,cgPitch=-.4,cgZoom=1,cgActive=false;
function cgDownload(name,data,mime){
  if(typeof downloadText==='function'){downloadText(name,data,mime);return}
  const u=URL.createObjectURL(new Blob([data],{type:mime})),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),2500)
}
function cgShow(msg){const el=document.getElementById('cgStatus');if(el)el.textContent=msg}
function cgDownloadZip(name,bytes){
  const url=URL.createObjectURL(new Blob([bytes],{type:'application/zip'}));
  const a=document.createElement('a');a.href=url;a.download=name;
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),2500)
}

let cgNativeCheckBusy=false,cgNativeCheckCancel=null,cgLastNativeCheck=null,cgNativeSeq=0;
function cgNativeCheckAvailable(){
  return !!(window.chrome?.webview?.postMessage&&window.chrome?.webview?.addEventListener)
}
function cgBytesToBase64(bytes){
  if(!(bytes instanceof Uint8Array)||bytes.length>4*1024*1024)
    throw Error('Native surfaceCheck supports at most 4 MiB of binary STL.');
  let text='';
  for(let i=0;i<bytes.length;i+=8192)
    text+=String.fromCharCode(...bytes.subarray(i,i+8192));
  return btoa(text)
}
function cgNativeSurfaceCheckRequest(bytes){
  if(!cgNativeCheckAvailable())throw Error(
    cgUi('Native Windows WebView2 is required for WSL surfaceCheck.',
      'Se requiere WebView2 nativo de Windows para surfaceCheck en WSL.'));
  const webview=window.chrome.webview,requestId='cad_check_'+Date.now()+'_'+(++cgNativeSeq);
  let listener=null,timer=null,settled=false;
  const cancel=()=>{
    if(settled)return;
    webview.postMessage({type:'cancelOperation',requestId:requestId+'_cancel',
      targetRequestId:requestId})
  };
  const promise=new Promise((resolve,reject)=>{
    const finish=(error,result)=>{
      if(settled)return;settled=true;
      if(timer!==null)clearTimeout(timer);
      if(listener)webview.removeEventListener('message',listener);
      if(error)reject(error);else resolve(result)
    };
    listener=e=>{
      const r=e?.data;
      if(r?.type!=='nativeReply'||r.requestId!==requestId)return;
      if(r.ok)finish(null,r.data);
      else finish(new Error(String(r.error||'Native surfaceCheck failed')))
    };
    webview.addEventListener('message',listener);
    timer=setTimeout(()=>{
      cancel();
      finish(new Error('Native surfaceCheck did not respond before timeout.'));
    },110000);
    try{
      webview.postMessage({
        type:'runCadSurfaceCheck',requestId,stlBase64:cgBytesToBase64(bytes)
      })
    }catch(error){finish(error)}
  });
  return {promise,cancel}
}
function cgNativeSelectedSurface(prepareBytes=true){
  const key=String(document.getElementById('cgPart')?.value||''),sep=key.indexOf('|');
  if(sep<0)throw Error('Choose a native CAD named region first');
  const i=Number(key.slice(0,sep)),part=key.slice(sep+1),model=cgModels[i];
  if(!model||!model.visible||!model.partsVisible.get(part))
    throw Error('Choose a visible region in the original CAD inventory');
  const scale=cgUnitScale(model.unit);
  if(!scale)throw Error('Confirm the physical source unit before running surfaceCheck');
  const count=model.partSummaries.get(part)?.triangles||0;
  if(!count)throw Error('Selected surface has no source triangles');
  if(!prepareBytes)return {model,part,triangles:count,scale};
  const tris=model.triangles.filter(t=>t.part===part);
  return {model,part,bytes:cgBinaryStl(tris,scale,part),triangles:tris.length,scale}
}
function cgRefreshNativeCheck(){
  const run=document.getElementById('cgSurfaceCheckRun'),
    cancel=document.getElementById('cgSurfaceCheckCancel'),
    exportBtn=document.getElementById('cgSurfaceCheckExport');
  if(!run)return;
  let available=false;
  try{const s=cgNativeSelectedSurface(false);available=84+s.triangles*50<=4*1024*1024}catch{}
  run.disabled=cgNativeCheckBusy||!cgNativeCheckAvailable()||!available;
  run.title=!cgNativeCheckAvailable()?
    cgUi('Requires native FoamLens for Windows, WSL and installed OpenFOAM.',
       'Requiere FoamLens nativo en Windows, WSL y OpenFOAM instalado.'):
    cgUi('Run the installed OpenFOAM surfaceCheck on a temporary selected STL (max 4 MiB).',
       'Ejecutar surfaceCheck instalado en una copia STL temporal seleccionada (máx. 4 MiB).');
  if(cancel)cancel.disabled=!cgNativeCheckBusy;
  if(exportBtn)exportBtn.disabled=!cgLastNativeCheck
}
async function cgRunNativeSurfaceCheck(){
  if(cgNativeCheckBusy)return;
  const output=document.getElementById('cgSurfaceCheckOutput');
  let selected;
  try{selected=cgNativeSelectedSurface()}catch(err){
    cgShow(String(err?.message||err));return
  }
  cgNativeCheckBusy=true;cgLastNativeCheck=null;
  cgRefreshNativeCheck();
  if(output)output.textContent=cgUi(
    'Running installed surfaceCheck in default WSL on a temporary STL. The original OpenFOAM case is not written.',
    'Ejecutando surfaceCheck instalado en WSL predeterminado sobre un STL temporal. No se escribe en el caso OpenFOAM.');
  try{
    const task=cgNativeSurfaceCheckRequest(selected.bytes);
    cgNativeCheckCancel=task.cancel;
    const report=await task.promise;
    if(!report||report.utility!=='surfaceCheck -checkSelfIntersection')
      throw Error('Unrecognized native surfaceCheck report');
    cgLastNativeCheck={
      schema:'foamlens/cad-native-surfacecheck/1',
      sourceFile:selected.model.name,part:selected.part,
      sourceUnitConfirmedByUser:selected.model.unit,
      sourceToMeterScale:selected.scale,triangleCount:selected.triangles,
      openFoamCaseMutated:false,checkedAt:new Date().toISOString(),
      native:report
    };
    if(output)output.textContent=[
      report.executed?
        cgUi('OpenFOAM surfaceCheck executed; review output (not CFD certification).',
             'Se ejecutó surfaceCheck; revisa el resultado (NO es certificación CFD).'):
        cgUi('OpenFOAM surfaceCheck was NOT executed in the default WSL distribution.',
             'NO se ejecutó surfaceCheck en la distribución WSL predeterminada.'),
      'Exit code: '+report.exitCode,
      'Surface: '+selected.model.name+' / '+selected.part+' · '+selected.triangles+' triangles',
      'Original units: '+selected.model.unit+' → meters',
      report.outputTruncated?'Output truncated to a safe limit.':'',
      '--- stdout ---',String(report.stdout||''),
      '--- stderr ---',String(report.stderr||'')
    ].filter(Boolean).join('\n');
    cgShow(report.executed?
      cgUi('Native surfaceCheck completed. Review and export the real solver output.',
           'Terminó surfaceCheck nativo. Revisa y exporta la salida real.'):
      cgUi('surfaceCheck unavailable in default WSL. Check installation.',
           'surfaceCheck no disponible en WSL predeterminado. Revisa la instalación.'))
  }catch(err){
    if(output)output.textContent=cgUi('Native surfaceCheck unavailable or cancelled: ',
      'surfaceCheck nativo no disponible o cancelado: ')+String(err?.message||err);
    cgShow(cgUi('No surfaceCheck result; original case unchanged.',
      'Sin resultado de surfaceCheck; caso original sin cambios.'))
  }finally{
    cgNativeCheckBusy=false;cgNativeCheckCancel=null;cgRefreshNativeCheck()
  }
}
function cgExportNativeCheckReport(){
  if(!cgLastNativeCheck)return;
  cgDownload('FoamLens-surfaceCheck-report.json',
    JSON.stringify(cgLastNativeCheck,null,2),'application/json')
}

function cgExportVisibleBatch(){
  try{
    const batch=cgVisibleRegionBatch(cgModels);
    if(batch.topologyWarnings&&!window.confirm(
      batch.topologyWarnings+' named regions have topology warnings. Export unvalidated surfaces anyway?'))return;
    cgDownloadZip('FoamLens-triSurfaces-visible.zip',cgStoreZip(batch.files));
    cgShow(cgUi('Exported ','Exportadas ')+batch.manifest.regionCount+
      cgUi(' separate STL regions and provenance in one local ZIP (NOT a volume mesh).',
        ' regiones STL separadas y su procedencia en un ZIP local (NO una malla volumétrica).'))
  }catch(err){
    cgShow(cgUi('Batch export blocked: ','Exportación por lotes bloqueada: ')+String(err?.message||err))
  }
}
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
  el.querySelectorAll('[data-cg-show]').forEach(ch=>ch.addEventListener('change',()=>{cgModels[Number(ch.dataset.cgShow)].visible=ch.checked;cgRefreshExport();cgDraw()}));
  el.querySelectorAll('[data-cg-part]').forEach(ch=>ch.addEventListener('change',()=>{
    const key=ch.dataset.cgPart,sep=key.indexOf('|'),i=Number(key.slice(0,sep)),part=key.slice(sep+1),m=cgModels[i];
    if(m)m.partsVisible.set(part,ch.checked);cgRefreshExport();cgDraw()
  }));
  el.querySelectorAll('[data-cg-unit]').forEach(sel=>sel.addEventListener('change',()=>{
    const m=cgModels[Number(sel.dataset.cgUnit)];if(!m)return;
    m.unit=sel.value;cgRenderInventory()
  }));
  cgRefreshExport();cgDraw()
}
function cgRefreshExport(){
  const select=document.getElementById('cgPart'),exportBtn=document.getElementById('cgExportStl'),batchBtn=document.getElementById('cgExportBatch');
  if(!select||!exportBtn)return;
  const old=select.value,parts=[];
  cgModels.forEach((m,i)=>m.summary.parts.forEach(p=>parts.push({key:i+'|'+p.name,label:m.name+' / '+p.name+' ('+p.count+')'})));
  select.innerHTML=parts.map(p=>'<option value="'+cgEscape(p.key)+'">'+cgEscape(p.label)+'</option>').join('');
  if(parts.some(p=>p.key===old))select.value=old;
  const key=String(select.value||''),index=Number(key.split('|')[0]),model=cgModels[index],scale=cgUnitScale(model?.unit);
  exportBtn.disabled=!parts.length||!scale;
  cgRefreshNativeCheck();
  if(batchBtn){
    const chosen=cgModels.filter(m=>m.visible).flatMap(m=>
      [...m.partsVisible].filter(([,shown])=>shown).map(([part])=>({model:m,part})));
    batchBtn.disabled=!chosen.length||chosen.some(({model})=>!cgUnitScale(model.unit));
    batchBtn.title=batchBtn.disabled?
      cgUi('Select visible regions and confirm every source unit.',
        'Selecciona regiones visibles y confirma todas las unidades originales.'):
      cgUi('Separate binary STL per visible region, with manifest, in one ZIP.',
        'STL binario independiente por región visible con manifiesto en un ZIP.')
  }
  const note=document.getElementById('cgUnitWarning');
  if(note)note.textContent=scale?
    cgUi('Selected source coordinate unit explicitly mapped to meters. Verify dimensions before using OpenFOAM.','Unidad de origen seleccionada; conversión a metros. Comprueba las dimensiones antes de usar OpenFOAM.'):
    cgUi('Unknown STL/OBJ source units: export is disabled until you explicitly confirm units.','Unidades STL/OBJ desconocidas: exportación desactivada hasta confirmar unidades.')
}
function cgPrepareSurface(result,name,bytes){
  const sum=cgSummary(result.triangles),byPart=new Map();
  for(const tri of result.triangles){
    if(!byPart.has(tri.part))byPart.set(tri.part,[]);
    byPart.get(tri.part).push(tri)
  }
  if(byPart.size>1000)throw Error('Geometry exceeds named-part safety limit (1000)');
  return {name,bytes,format:result.format,triangles:result.triangles,summary:sum,
    partSummaries:new Map([...byPart].map(([key,subset])=>[key,cgSummary(subset)])),
    partsVisible:new Map([...byPart.keys()].map(key=>[key,true])),
    warnings:result.warnings||[],unit:'unknown',visible:true}
}
let cgBrepImportBusy=false,cgBrepCancel=null,cgBrepCancelled=false,cgBrepSeq=0;
function cgBrepEncoded(bytes){
  if(!(bytes instanceof Uint8Array)||bytes.length<80||bytes.length>16*1024*1024)
    throw Error('STEP/IGES/BREP input exceeds 16 MiB or is empty.');
  let raw='';
  for(let i=0;i<bytes.length;i+=8192)
    raw+=String.fromCharCode(...bytes.subarray(i,i+8192));
  return btoa(raw)
}
function cgBrepDecoded(text){
  if(typeof text!=='string'||text.length<180||text.length>Math.ceil(16*1024*1024/3)*4+16)
    throw Error('Native OCCT STL is outside the supported size.');
  const raw=atob(text),bytes=new Uint8Array(raw.length);
  for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
  return bytes
}
function cgBrepRequest(bytes,format,deflectionMm){
  if(!['step','iges','brep'].includes(format)||![0.2,0.5,1].includes(deflectionMm))
    throw Error('Unsupported CAD format or tessellation deflection.');
  if(!cgNativeCheckAvailable())throw Error(cgUi(
    'Native FoamLens Windows/WebView2 is required for installed FreeCADCmd in WSL.',
    'Se requiere FoamLens nativo en Windows/WebView2 y FreeCADCmd instalado en WSL.'));
  const webview=window.chrome.webview,requestId='cad_occt_'+Date.now()+'_'+(++cgBrepSeq);
  let listener=null,timer=null,settled=false;
  const cancel=()=>{
    if(settled)return;
    webview.postMessage({type:'cancelOperation',requestId:requestId+'_cancel',
      targetRequestId:requestId})
  };
  const promise=new Promise((resolve,reject)=>{
    const done=(error,data)=>{
      if(settled)return;
      settled=true;
      if(timer!==null)clearTimeout(timer);
      if(listener)webview.removeEventListener('message',listener);
      if(error)reject(error);else resolve(data)
    };
    listener=e=>{
      const reply=e?.data;
      if(reply?.type!=='nativeReply'||reply.requestId!==requestId)return;
      if(reply.ok)done(null,reply.data);
      else done(new Error(String(reply.error||'FreeCAD OCCT conversion failed')))
    };
    webview.addEventListener('message',listener);
    timer=setTimeout(()=>{
      cancel();
      done(new Error('FreeCAD/OCCT conversion timed out; no original CAD was changed.'));
    },125000);
    try{
      webview.postMessage({type:'convertCadBrep',requestId,format,deflectionMm,
        cadBase64:cgBrepEncoded(bytes)})
    }catch(err){done(err)}
  });
  return {promise,cancel}
}
// The native host and the complete assembly both permit 300,000 triangles.
// Do not silently impose a smaller per-solid limit in the browser.
function cgBrepRegionTriangleCountOk(n){
  return Number.isInteger(n)&&n>=1&&n<=300000
}
function cgBrepModels(report,sourceFile,sourceBytes,format){
  if(report?.schema!=='foamlens/native-occt-conversion/1'||
     report.engine!=='FreeCAD/OpenCascade'||report.converted!==true||
     report.coordinateUnit!=='mm'||report.sourceUnitsVerified!==false||
     report.originalObjectLabelsPreserved!==false||report.openFoamCaseMutated!==false||
     report.format!==format||!Array.isArray(report.regions)||
     report.regions.length<1||report.regions.length>24)
    throw Error('Invalid FreeCAD/OCCT native conversion provenance.');
  const models=[];let total=0;const names=new Set();
  for(const region of report.regions){
    if(typeof region.name!=='string'||!/^(solid|surface)_[0-9]{3}$/.test(region.name)||
       names.has(region.name)||!Number.isInteger(region.triangles)||
       !cgBrepRegionTriangleCountOk(region.triangles))
      throw Error('Invalid native OCCT solid identity or triangle count.');
    names.add(region.name);
    const bytes=cgBrepDecoded(region.stlBase64);
    if(bytes.length!==region.sizeBytes||bytes.length!==84+50*region.triangles)
      throw Error('Native OCCT STL length does not match reported triangle count.');
    const parsed=cgParseStl(bytes.buffer,region.name+'.stl');
    if(parsed.format!=='binary-stl'||parsed.triangles.length!==region.triangles)
      throw Error('Native OCCT STL payload is not a valid binary tessellation.');
    for(const triangle of parsed.triangles)triangle.part=region.name;
    total+=parsed.triangles.length;
    if(total>300000)throw Error('Native OCCT result exceeds CAD preview capacity.');
    const model=cgPrepareSurface(parsed,sourceFile+' / '+region.name,bytes.length);
    model.format='freecad-occt-'+format;
    model.unit='unknown'; // Require explicit physical confirmation before SI export/analysis.
    model.warnings.push(cgUi(
      'Real FreeCAD/OpenCascade tessellation. Coordinates are FreeCAD internal millimeters. Check dimensions and explicitly confirm mm before exporting. Original STEP/IGES assembly labels were not preserved.',
      'Triangulación real de FreeCAD/OpenCascade. Coordenadas internas de FreeCAD en milímetros. Revisa dimensiones y confirma mm antes de exportar. No se conservaron los nombres originales del ensamblaje.'));
    model.sourceProvenance={
      engine:report.engine,sourceFile,sourceFormat:format,sourceBytes,
      freecadInternalUnit:'mm',sourceUnitsVerified:false,
      originalObjectLabelsPreserved:false,generatedSolidName:region.name,
      reportedBoundsMm:region.boundsMm,reportedAreaMm2:region.surfaceAreaMm2,
      deflectionMm:report.deflectionMm,
      openFoamCaseMutated:false
    };
    models.push(model)
  }
  if(total!==report.totalTriangles)
    throw Error('Native OCCT total triangle count differs from imported surfaces.');
  return models
}
async function cgConvertBrepFile(file,format){
  const deflection=Number(document.getElementById('cgCadDeflection')?.value||0.5);
  const bytes=new Uint8Array(await file.arrayBuffer());
  if(cgBrepCancelled)throw Error('CAD import cancelled before native conversion.');
  const task=cgBrepRequest(bytes,format,deflection);
  cgBrepCancel=task.cancel;
  cgShow(cgUi('Running installed FreeCAD/OCCT on a temporary BREP copy; no case modifications.',
    'Ejecutando FreeCAD/OCCT instalado sobre una copia BREP temporal; sin modificar el caso.'));
  try{
    const report=await task.promise;
    if(cgBrepCancelled)throw Error('CAD conversion cancelled.');
    return cgBrepModels(report,file.name,file.size,format)
  }finally{cgBrepCancel=null}
}
function cgCancelBrepImport(){
  cgBrepCancelled=true;
  if(cgBrepCancel)cgBrepCancel()
}

async function cgImport(){
  if(cgBrepImportBusy)return;
  const input=document.getElementById('cgFiles'),files=[...(input?.files||[])];
  if(!files.length)return;
  if(files.length>12){cgShow('Limit: 12 geometry files per import.');return}
  const button=document.getElementById('cgImport'),cancel=document.getElementById('cgCadCancelImport');
  let added=0,errors=[];
  cgBrepImportBusy=true;cgBrepCancelled=false;
  if(button)button.disabled=true;
  if(cancel)cancel.disabled=false;
  try{
    for(const file of files){
      if(cgBrepCancelled)break;
      try{
        const ext=file.name.split('.').pop().toLowerCase();
        const brep=['step','stp','iges','igs','brep'].includes(ext),
          format=ext==='stp'?'step':ext==='igs'?'iges':ext;
        const max=ext==='zip'?128*1024*1024:brep?16*1024*1024:32*1024*1024;
        if(file.size>max)throw Error('Geometry input exceeds '+(max/1024/1024)+' MiB limit');
        let prepared;
        if(brep){
          prepared=await cgConvertBrepFile(file,format);
        }else if(ext==='zip'){
          prepared=cgRestoreRegionBatch(await file.arrayBuffer()).models
        }else{
          const result=ext==='stl'?cgParseStl(await file.arrayBuffer(),file.name):
            ext==='obj'?cgParseObj(await file.text(),file.name):null;
          if(!result)throw Error('Supported: STL, OBJ, FoamLens ZIP and STEP/IGES/BREP with installed FreeCADCmd');
          prepared=[cgPrepareSurface(result,file.name,file.size)]
        }
        if(cgBrepCancelled)break;
        const current=cgModels.reduce((n,m)=>n+m.triangles.length,0);
        const incoming=prepared.reduce((n,m)=>n+m.triangles.length,0);
        if(current+incoming>300000||cgModels.length+prepared.length>1000)
          throw Error('Combined geometry exceeds 300000 triangles or 1000 named surfaces');
        // The COMPLETE native conversion is validated before any region is appended.
        cgModels.push(...prepared);
        added+=prepared.length
      }catch(e){errors.push(file.name+': '+String(e?.message||e))}
      if(cgBrepCancelled)break;
      await new Promise(resolve=>setTimeout(resolve,0))
    }
    cgRenderInventory();
    cgShow(cgUi('Imported ','Importadas ')+added+
      cgUi(' surfaces from ',' superficies de ')+files.length+
      cgUi(' input files. ',' archivos de entrada. ')+
      (cgBrepCancelled?cgUi('Conversion cancelled. ','Conversión cancelada. '):'')+
      errors.join(' | '))
  }finally{
    cgBrepImportBusy=false;cgBrepCancel=null;
    if(button)button.disabled=false;
    if(cancel)cancel.disabled=true;
    input.value=''
  }
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
  const active=cgModels.filter(m=>m.visible&&[...m.partsVisible.values()].some(Boolean)),
    total=active.reduce((n,m)=>n+[...m.partsVisible].reduce((k,[part,visible])=>k+(visible?(m.partSummaries.get(part)?.triangles||0):0),0),0);
  if(!total){ctx.fillStyle='#bdcbdc';ctx.font='15px sans-serif';ctx.fillText('Import STL/OBJ to inspect surface geometry',20,34);return}
  const physical=active.every(m=>cgUnitScale(m.unit)!==null);
  if(active.length>1&&!physical){
    ctx.fillStyle='#d6e7f1';ctx.font='15px sans-serif';
    ctx.fillText('Confirm units for EACH visible file before overlaying geometries.',20,40);
    ctx.fillText('Geometry from different unknown coordinate systems cannot be compared.',20,65);
    return
  }
  const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
  for(const m of active)for(const [part,visible] of m.partsVisible){
    if(!visible)continue;const b=m.partSummaries.get(part)?.bounds;if(!b)continue;
    const factor=physical?cgUnitScale(m.unit):1;
    for(let i=0;i<3;i++){min[i]=Math.min(min[i],b.min[i]*factor);max[i]=Math.max(max[i],b.max[i]*factor)}
  }
  const bounds={min,max,size:max.map((v,i)=>v-min[i])},mid=min.map((x,i)=>(x+max[i])/2);
  const size=Math.max(...bounds.size,1e-12),scale=Math.min(w*.76,h*.76)/size*cgZoom;
  const rotate=(v,factor)=>{
    const x=v[0]*factor-mid[0],y=v[1]*factor-mid[1],z=v[2]*factor-mid[2],
      cy=Math.cos(cgYaw),sy=Math.sin(cgYaw),cp=Math.cos(cgPitch),sp=Math.sin(cgPitch);
    const a=cy*x+sy*z,b=-sy*x+cy*z;
    return [w/2+scale*a,h/2-scale*(cp*y-sp*b),sp*y+cp*b]
  };
  const step=Math.max(1,Math.ceil(total/2800)),polys=[];
  let ordinal=0;
  for(const model of active)for(const tri of model.triangles){
    if(!model.partsVisible.get(tri.part))continue;
    if((ordinal++%step)!==0)continue;
    const factor=physical?cgUnitScale(model.unit):1;
    const p=tri.vertices.map(v=>rotate(v,factor));
    polys.push({p,z:(p[0][2]+p[1][2]+p[2][2])/3})
  }
  polys.sort((a,b)=>a.z-b.z);
  for(const {p} of polys){ctx.beginPath();ctx.moveTo(p[0][0],p[0][1]);ctx.lineTo(p[1][0],p[1][1]);ctx.lineTo(p[2][0],p[2][1]);ctx.closePath();ctx.fillStyle='rgba(65,170,205,.27)';ctx.fill();ctx.strokeStyle='rgba(121,209,243,.44)';ctx.lineWidth=.6;ctx.stroke()}
  ctx.font='12px sans-serif';ctx.fillStyle='#d6e7f1';
  const b=bounds.size;ctx.fillText('X '+b[0].toPrecision(5)+'   Y '+b[1].toPrecision(5)+'   Z '+b[2].toPrecision(5)+'  ('+(physical?'meters':'unverified source coordinates')+')',16,24);
  ctx.fillText('Surface preview · '+polys.length+' / '+total+' triangles displayed · selected visible parts only · not an OpenFOAM volume mesh',16,h-15)
}
function cgInstall(){
  if(document.getElementById('cgShell'))return;
  const anchor=document.getElementById('dataImportMore')||document.getElementById('datasetModeBlock');if(!anchor)return;
  const launch=document.createElement('button');launch.id='cgLaunch';launch.type='button';launch.className='btn soft';launch.textContent='CAD & Geometry · STEP/IGES/STL';launch.style.cssText='width:100%;margin:6px 0 10px';anchor.insertAdjacentElement('afterend',launch);
  const nav=document.createElement('button');nav.id='cgNav';nav.type='button';nav.className='modeNavBtn';nav.textContent='CAD';
  document.getElementById('modeData')?.insertAdjacentElement('afterend',nav);
  const sheet=document.createElement('section');sheet.id='cgShell';sheet.hidden=true;sheet.setAttribute('role','dialog');sheet.setAttribute('aria-modal','true');sheet.setAttribute('aria-label','CAD & Geometry');
  const css=document.createElement('style');css.textContent=
    '#cgShell[hidden]{display:none!important}#cgShell{position:fixed;inset:0;z-index:12000;background:rgba(5,12,23,.96);color:#eaf1fc;overflow:auto;padding:18px;box-sizing:border-box}' +
    '#cgShell *{box-sizing:border-box}#cgShell .cgInner{max-width:1180px;margin:0 auto;display:grid;gap:12px}#cgShell .cgHeader{display:flex;align-items:center;justify-content:space-between;gap:12px}' +
    '#cgShell .cgTools{display:flex;gap:9px;flex-wrap:wrap;align-items:center}#cgShell .cgTools label{font-size:12px}#cgShell button,#cgShell select,#cgShell input{min-height:34px}' +
    '#cgShell #cgCanvas{display:block;width:100%;height:min(55vh,520px);min-height:260px;border:1px solid #3b5578;border-radius:12px;touch-action:none;cursor:grab}' +
    '#cgShell .cgItem{padding:11px;border:1px solid #37526e;border-radius:9px;margin:7px 0;font-size:12px;line-height:1.6}' +
    '#cgShell .cgNotice{font-size:12px;color:#c8d6e9}#cgShell select{max-width:300px;min-width:120px}#cgShell button{cursor:pointer}' +
    '#cgShell #cgSurfaceCheckOutput{white-space:pre-wrap;overflow-wrap:anywhere;max-height:270px;overflow:auto;border:1px solid #37526e;border-radius:9px;padding:11px;background:#101b2c;color:#d6e7f1;font-size:11px}';
  document.head.appendChild(css);
  sheet.innerHTML='<div class="cgInner"><div class="cgHeader"><div><h2>CAD & Geometry — Surface Inspector</h2><p class="cgNotice">STL/OBJ/ZIP import is local. STEP/IGES/BREP uses real FreeCAD/OpenCascade when FreeCADCmd is installed in default WSL; verify source dimensions/units. No OpenFOAM case is modified.</p></div><button class="btn" id="cgClose" type="button">Close</button></div>'+
    '<div class="cgTools"><label>Import STL/OBJ/ZIP/STEP/IGES/BREP <input id="cgFiles" type="file" multiple accept=".stl,.obj,.zip,.stp,.step,.iges,.igs,.brep"></label><button class="btn primary" id="cgImport" type="button">Import and inspect</button><label>OCCT tessellation (mm) <select id="cgCadDeflection"><option value="0.2">Fine 0.2</option><option value="0.5" selected>Standard 0.5</option><option value="1">Coarse 1.0</option></select></label><button class="btn soft" id="cgCadCancelImport" disabled type="button">Cancel CAD import</button>'+
    '<button class="btn" data-cg-view="iso">Isometric</button><button class="btn" data-cg-view="top">Top</button><button class="btn" data-cg-view="front">Front</button><button class="btn" data-cg-view="side">Right</button><button class="btn" data-cg-view="fit">Fit</button></div>'+
    '<canvas id="cgCanvas" aria-label="Rotatable 3D surface projection; drag to orbit, wheel to zoom"></canvas>'+
    '<div id="cgStatus" class="cgNotice" aria-live="polite">Choose STL, OBJ, FoamLens ZIP or STEP/IGES/BREP. CAD BREP requires native Windows and installed FreeCADCmd in default WSL. Imported FreeCAD coordinates are millimeters but MUST be confirmed before SI export.</div>'+
    '<div id="cgInventory" aria-label="Imported surface parts"></div>'+
    '<div class="cgTools">'+
    '<label>Named part <select id="cgPart"></select></label><button id="cgExportStl" class="btn primary" disabled type="button">Export named STL in meters + manifest</button>'+
    '<button id="cgExportBatch" class="btn primary" type="button" disabled>Export visible regions · ZIP (binary STL + manifest)</button></div>'+
    '<p id="cgUnitWarning" class="cgNotice"></p>'+
    '<div class="cgTools"><button id="cgSurfaceCheckRun" class="btn primary" type="button" disabled>Run real OpenFOAM surfaceCheck (WSL)</button>'+
    '<button id="cgSurfaceCheckCancel" class="btn soft" type="button" disabled>Cancel check</button>'+
    '<button id="cgSurfaceCheckExport" class="btn soft" type="button" disabled>Export actual check report JSON</button></div>'+
    '<pre id="cgSurfaceCheckOutput" aria-live="polite" class="cgNotice">Requires OpenFOAM installed in the default WSL distribution. Only an explicitly selected, unit-confirmed STL is checked.</pre>'+
    '<p class="cgNotice">Triangulated geometry is not a volumetric mesh. STEP/IGES conversion uses the installed OpenCascade kernel ONLY when available, and original assembly labels may be lost. surfaceCheck is an optional separate native action; no checkMesh, snappyHexMesh or CFD solver is run. Keep the original source file.</p></div>';
  document.body.appendChild(sheet);
  let cgReturnFocus=launch;
  const open=e=>{cgReturnFocus=e?.currentTarget||launch;cgActive=true;sheet.hidden=false;nav.classList.add('active');cgDraw();document.getElementById('cgClose').focus()};
  launch.onclick=open;nav.onclick=open;
  const close=()=>{sheet.hidden=true;cgActive=false;nav.classList.remove('active');cgReturnFocus.focus()};
  document.getElementById('cgClose').onclick=close;
  document.addEventListener('keydown',e=>{if(cgActive&&e.key==='Escape')close()});
  document.getElementById('cgImport').onclick=()=>void cgImport();
  document.getElementById('cgCadCancelImport').onclick=cgCancelBrepImport;
  document.getElementById('cgExportStl').onclick=cgExport;
  document.getElementById('cgExportBatch').onclick=cgExportVisibleBatch;
  document.getElementById('cgSurfaceCheckRun').onclick=()=>void cgRunNativeSurfaceCheck();
  document.getElementById('cgSurfaceCheckCancel').onclick=()=>cgNativeCheckCancel?.();
  document.getElementById('cgSurfaceCheckExport').onclick=cgExportNativeCheckReport;
  document.getElementById('cgPart').addEventListener('change',()=>{cgRefreshExport();cgRefreshNativeCheck()});
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
window.FoamLensCadSurface={parseStl:cgParseStl,parseObj:cgParseObj,summarize:cgSummary,exportAsciiStl:cgMakeAsciiStl,exportBinaryStl:cgBinaryStl,batchVisibleRegions:cgVisibleRegionBatch,packZip:cgStoreZip,readStoredZip:cgReadStoredZip,restoreRegionBatch:cgRestoreRegionBatch,unitScale:cgUnitScale};
