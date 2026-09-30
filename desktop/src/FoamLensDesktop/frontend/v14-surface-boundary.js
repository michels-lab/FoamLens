/* FoamLens Desktop v1.4.1 — explicit surface-field boundary-patch mapping. */

/* FOAMLENS_SURFACE_BOUNDARY_CORE_START */
function fsbStripComments(text){return String(text||'').replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/.*$/gm,'')}
function fsbFindMatching(text,openIndex,open='{',close='}'){
  let depth=0,quote='';for(let i=openIndex;i<text.length;i++){const ch=text[i];
    if(quote){if(ch===quote&&text[i-1]!=='\\')quote='';continue}
    if(ch==='"'||ch==="'"){quote=ch;continue}
    if(ch===open)depth++;else if(ch===close&&--depth===0)return i
  }return-1
}
function fsbNamedBlock(text,name){
  const clean=fsbStripComments(text),safe=String(name).replace(/[^A-Za-z0-9_.:+-]/g,''),m=new RegExp('\\b'+safe+'\\s*\\{','i').exec(clean);if(!m)return null;
  const open=clean.indexOf('{',m.index),close=open>=0?fsbFindMatching(clean,open,'{','}'):-1;return close>=0?clean.slice(open+1,close):null
}
function fsbTopLevelBlocks(body){
  const s=String(body||''),out=[];let i=0;
  while(i<s.length){
    while(i<s.length&&/[\s;]/.test(s[i]))i++;
    if(i>=s.length)break;
    if(s[i]==='#'){while(i<s.length&&s[i]!='\n')i++;continue}
    const m=/^[A-Za-z_][A-Za-z0-9_.:+-]*/.exec(s.slice(i));if(!m){i++;continue}
    const name=m[0];i+=name.length;while(i<s.length&&/\s/.test(s[i]))i++;
    if(s[i]!=='{'){while(i<s.length&&s[i]!==';'&&s[i]!=='\n')i++;continue}
    const open=i,close=fsbFindMatching(s,open,'{','}');if(close<0)break;
    out.push({name,body:s.slice(open+1,close)});i=close+1
  }
  return out
}
function fsbParseBoundaryMesh(text){
  const clean=fsbStripComments(text);let start=0,fi=clean.search(/\bFoamFile\b/i);
  if(fi>=0){const b=clean.indexOf('{',fi),e=b>=0?fsbFindMatching(clean,b,'{','}'):-1;if(e>=0)start=e+1}
  const tail=clean.slice(start),m=/(?:^|\s)(\d+)\s*\(/m.exec(tail);if(!m)return{ok:false,reason:'boundary-list-header-not-found',patches:[]};
  const declared=Number(m[1]),open=start+m.index+m[0].lastIndexOf('('),close=fsbFindMatching(clean,open,'(',')');if(close<0)return{ok:false,reason:'boundary-list-close-not-found',patches:[]};
  const patches=fsbTopLevelBlocks(clean.slice(open+1,close)).map(p=>{
    const n=(p.body.match(/\bnFaces\s+(\d+)\s*;/i)||[])[1],st=(p.body.match(/\bstartFace\s+(\d+)\s*;/i)||[])[1],type=(p.body.match(/\btype\s+([^;\s]+)\s*;/i)||[])[1]||'';
    return{name:p.name,type,nFaces:n==null?NaN:Number(n),startFace:st==null?NaN:Number(st)}
  });
  if(patches.length!==declared)return{ok:false,reason:'boundary-patch-count-mismatch',declared,patches};
  if(patches.some(p=>!Number.isInteger(p.nFaces)||p.nFaces<0||!Number.isInteger(p.startFace)||p.startFace<0))return{ok:false,reason:'boundary-patch-range-invalid',declared,patches};
  return{ok:true,reason:'',declared,patches}
}
function fsbParseTuple(text,count){
  let s=String(text||'').trim();if(s.startsWith('(')&&s.endsWith(')'))s=s.slice(1,-1).trim();
  const a=s.split(/\s+/).filter(Boolean).map(Number);return a.length===count&&a.every(Number.isFinite)?a:null
}
function fsbParseScalar(text){const m=String(text||'').trim().match(/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?$/);return m?Number(m[0]):NaN}
function fsbExplicitPatchValue(body,kind){
  const s=String(body||''),components=kind==='vector'?3:kind==='scalar'?1:0;if(!components)return{explicit:false,reason:'unsupported-kind'};
  const uniform=/\bvalue\s+uniform\s+([^;]+)\s*;/i.exec(s);
  if(uniform){
    const value=kind==='scalar'?fsbParseScalar(uniform[1]):fsbParseTuple(uniform[1],components);
    if(kind==='scalar'?Number.isFinite(value):Array.isArray(value))return{explicit:true,mode:'uniform',value};
    return{explicit:false,reason:'uniform-value-not-numeric'}
  }
  const non=/\bvalue\s+nonuniform\s+(?:List<\s*(?:scalar|vector)\s*>|[^\s]+)\s+(\d+)\s*\(/i.exec(s);
  if(!non)return{explicit:false,reason:'no-explicit-value'};
  const declared=Number(non[1]),open=non.index+non[0].lastIndexOf('('),close=fsbFindMatching(s,open,'(',')');if(close<0)return{explicit:false,reason:'nonuniform-list-close-not-found',declared};
  const bodyText=s.slice(open+1,close),values=[];
  if(kind==='scalar'){
    for(const m of bodyText.matchAll(/[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?/g))values.push(Number(m[0]))
  }else{
    for(const m of bodyText.matchAll(/\([^()]*\)/g)){const v=fsbParseTuple(m[0],3);if(v)values.push(v)}
  }
  return values.length===declared?{explicit:true,mode:'nonuniform',declared,values}:{explicit:false,reason:'nonuniform-value-count-mismatch',declared,count:values.length}
}
function fsbParseBoundaryField(text,kind){
  const block=fsbNamedBlock(text,'boundaryField');if(block==null)return{ok:false,reason:'boundaryField-not-found',patches:{}};
  const patches={};for(const p of fsbTopLevelBlocks(block))patches[p.name]={name:p.name,...fsbExplicitPatchValue(p.body,kind)};
  return{ok:true,reason:'',patches}
}
function fsbComponentValue(value,kind,component='value'){
  if(kind==='scalar')return Number(value);
  if(kind!=='vector'||!Array.isArray(value)||value.length<3)return NaN;
  const a=value.map(Number);if(!a.slice(0,3).every(Number.isFinite))return NaN;
  if(component==='x')return a[0];if(component==='y')return a[1];if(component==='z')return a[2];
  return Math.hypot(a[0],a[1],a[2])
}
function fsbExpandBoundaryFaces(meshPatches,fieldPatches,kind,component='value',faceCount=Infinity){
  const values=new Map(),coverage=[];let explicitFaces=0,totalFaces=0;
  for(const patch of meshPatches||[]){
    totalFaces+=Number(patch.nFaces)||0;const fp=fieldPatches?.[patch.name],row={name:patch.name,type:patch.type||'',startFace:patch.startFace,nFaces:patch.nFaces,explicit:false,reason:fp?.reason||'patch-not-present'};
    if(!fp?.explicit){coverage.push(row);continue}
    if(fp.mode==='nonuniform'&&fp.values.length!==patch.nFaces){row.reason='patch-value-count-mismatch';coverage.push(row);continue}
    let ok=true;
    for(let i=0;i<patch.nFaces;i++){
      const face=patch.startFace+i;if(face<0||face>=faceCount){ok=false;continue}
      const raw=fp.mode==='uniform'?fp.value:fp.values[i],v=fsbComponentValue(raw,kind,component);if(!Number.isFinite(v)){ok=false;continue}
      values.set(face,v);explicitFaces++
    }
    row.explicit=ok;row.reason=ok?'':'component-or-face-invalid';coverage.push(row)
  }
  return{values,coverage,explicitFaces,totalFaces,fraction:totalFaces?explicitFaces/totalFaces:0}
}
/* FOAMLENS_SURFACE_BOUNDARY_CORE_END */

function fsbUi(en,es){try{return flUi(en,es)}catch{return en}}
const fsbCache=new Map();
async function fsbReadTail(file,startHint=0){
  if(!file)return'';const size=Math.max(0,Number(file.size)||0);
  if(!file._nativeToken||size<=8*1024*1024)return await file.text();
  let start=Math.max(0,Math.min(size,Number(startHint)||0)-1024*1024),chunks=[];
  for(let offset=start;offset<size;offset+=4*1024*1024){const end=Math.min(size,offset+4*1024*1024);chunks.push(await file.slice(offset,end).text());if(chunks.length%4===0)await scannerYield()}
  let text=chunks.join('');
  if(!/\bboundaryField\s*\{/i.test(text)&&start>0){
    chunks=[];for(let offset=0;offset<start;offset+=4*1024*1024){const end=Math.min(start,offset+4*1024*1024);chunks.push(await file.slice(offset,end).text());if(chunks.length%4===0)await scannerYield()}
    text=chunks.join('')+text
  }
  return text
}
async function fvLoadMeshBoundaryPatches(file){
  if(!file)return[];const key='mesh|'+String(file.webkitRelativePath||file.name||'')+'|'+String(file.lastModified||0)+'|'+String(file.size||0);
  if(fsbCache.has(key))return fsbCache.get(key);
  try{const parsed=fsbParseBoundaryMesh(await file.text()),patches=parsed.ok?parsed.patches:[];fsbCache.set(key,patches);return patches}catch{return[]}
}
function fsbFieldRecord(group,time,parsed){
  const rows=group?.records||[],path=String(parsed?.sourcePath||'');
  if(path){const exact=rows.find(r=>String(r.sourcePath||'')===path);if(exact?.file)return exact}
  const matches=rows.filter(r=>fvTimeEqual(Number(r.time),Number(time))),preferred=matches.find(r=>!r.partition&&r.file);
  return preferred||(matches.length===1?matches[0]:null)
}
async function fvLoadSurfaceBoundaryValues(group,time,parsed,component,mesh){
  if(!mesh?.boundaryPatches?.length)return{values:new Map(),coverage:[],explicitFaces:0,totalFaces:Number(mesh?.boundaryFaceCount)||0,fraction:0,reason:'mesh-boundary-metadata-unavailable'};
  const record=fsbFieldRecord(group,time,parsed),file=record?.file;if(!file)return{values:new Map(),coverage:[],explicitFaces:0,totalFaces:Number(mesh?.boundaryFaceCount)||0,fraction:0,reason:'field-file-unavailable'};
  const key=['field',record.sourcePath||file.webkitRelativePath||file.name,file.lastModified||0,component].join('|');if(fsbCache.has(key))return fsbCache.get(key);
  try{
    const text=await fsbReadTail(file,parsed?.loadMeta?.bytesRead||0),field=fsbParseBoundaryField(text,String(parsed?.kind||group?.kind||''));
    const result=field.ok?fsbExpandBoundaryFaces(mesh.boundaryPatches,field.patches,String(parsed?.kind||group?.kind||''),component,mesh.faceCount):{values:new Map(),coverage:[],explicitFaces:0,totalFaces:Number(mesh?.boundaryFaceCount)||0,fraction:0,reason:field.reason};
    fsbCache.set(key,result);return result
  }catch(e){return{values:new Map(),coverage:[],explicitFaces:0,totalFaces:Number(mesh?.boundaryFaceCount)||0,fraction:0,reason:String(e?.message||e)}}
}
function fvBuildExplicitBoundaryFaceBuffers(mesh,boundary){
  const pts=mesh?.points||[],positions=[],triangleFaces=[],values=[];
  if(!boundary?.values?.size)return{positions:new Float32Array(),triangleFaces,values:new Float64Array()};
  for(const [fi,v] of boundary.values.entries()){
    const face=fvMeshFacePoints(mesh,Number(fi));if(face.length<3)continue;const p0=face[0];
    for(let j=1;j<face.length-1;j++){for(const pi of [p0,face[j],face[j+1]])positions.push(Number(pts[3*pi])||0,Number(pts[3*pi+1])||0,Number(pts[3*pi+2])||0);triangleFaces.push(Number(fi));values.push(v,v,v)}
  }
  return{positions:new Float32Array(positions),triangleFaces,values:new Float64Array(values)}
}
function fvUpdateExplicitBoundaryBuffers(range,palette){
  const r=fvState.renderer,mesh=fvState.mesh,boundary=fvState.surfaceBoundary;if(!r||!mesh)return;
  r.boundaryFieldCount=0;if(fvState.fieldStorage!=='surface'||!boundary?.values?.size)return;
  const g=fvBuildExplicitBoundaryFaceBuffers(mesh,boundary);fvState.surfaceBoundaryGeometry=g;
  fvUploadBuffer(r,'boundaryFieldPos',g.positions,r.gl.DYNAMIC_DRAW);const colors=new Float32Array(g.values.length*3);
  for(let i=0;i<g.values.length;i++){const rgb=fvColorMap(g.values[i],range.min,range.max,palette);colors[3*i]=rgb[0];colors[3*i+1]=rgb[1];colors[3*i+2]=rgb[2]}
  fvUploadBuffer(r,'boundaryFieldColor',colors,r.gl.DYNAMIC_DRAW);r.boundaryFieldCount=g.positions.length/3
}
window.FoamLensSurfaceBoundary={fsbParseBoundaryMesh,fsbParseBoundaryField,fsbExpandBoundaryFaces,fsbComponentValue};
