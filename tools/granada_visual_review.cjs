#!/usr/bin/env node
'use strict';
// Offline, exact-artifact FoamLens visual review. Captured !== visually approved.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),zlib=require('node:zlib'),{parseArgs}=require('node:util');
const MODES=['home','about','data','field','time-series','field-compare','analysis','review','live'];
const VARIANTS=['installed','portable'],SIZES=['wide','compact'];
const SHA64=/^[0-9a-f]{64}$/i,SHA40=/^[0-9a-f]{40}$/i;
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function inside(root,relative){
  if(typeof relative!=='string'||!relative||path.isAbsolute(relative)||relative.includes('\\')||relative.includes('\0'))throw Error('Unsafe image path');
  const normalized=path.posix.normalize(relative);
  if(normalized==='..'||normalized.startsWith('../'))throw Error('Traversal path');
  const base=fs.realpathSync(root),p=fs.realpathSync(path.resolve(root,normalized)),rel=path.relative(base,p);
  if(!rel||rel==='..'||rel.startsWith('..'+path.sep)||path.isAbsolute(rel))throw Error('Image outside manifest root');
  return p;
}

const CRC_TABLE=Array.from({length:256},(_,i)=>{
  let c=i;for(let k=0;k<8;k++)c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1);return c>>>0
});
function crc32(buffer){
  let crc=0xffffffff;
  for(const value of buffer)crc=CRC_TABLE[(crc^value)&255]^(crc>>>8);
  return(crc^0xffffffff)>>>0
}
function png(buffer){
  // G71: a PNG signature and spoofed IHDR are NOT a native Windows screenshot.
  // Verify every chunk's size and CRC, actual decompressed pixels, one complete
  // PNG stream, non-interlaced scanlines, and no bytes after IEND.
  const signature=Buffer.from([137,80,78,71,13,10,26,10]);
  if(!Buffer.isBuffer(buffer)||buffer.length<57||!buffer.subarray(0,8).equals(signature))
    throw Error('Invalid PNG signature');
  let pos=8,header=null,ended=false,seenData=false,compressed=0;
  const idats=[];
  while(pos<buffer.length){
    if(pos+12>buffer.length)throw Error('Truncated PNG chunk');
    const length=buffer.readUInt32BE(pos),kind=buffer.toString('ascii',pos+4,pos+8);
    if(length>25*1024*1024||length>buffer.length-pos-12)throw Error('Invalid PNG chunk length');
    const data=buffer.subarray(pos+8,pos+8+length),crc=buffer.readUInt32BE(pos+8+length);
    if(crc32(buffer.subarray(pos+4,pos+8+length))!==crc)throw Error('Invalid PNG CRC');
    if(!header&&kind!=='IHDR')throw Error('Missing first PNG IHDR');
    if(kind==='IHDR'){
      if(header||length!==13)throw Error('Invalid PNG IHDR');
      const width=data.readUInt32BE(0),height=data.readUInt32BE(4);
      const depth=data[8],color=data[9],compression=data[10],filter=data[11],interlace=data[12];
      if(!width||!height||width>16000||height>16000||width*height>16e6||
         depth!==8||![0,2,3,4,6].includes(color)||compression!==0||filter!==0||interlace!==0)
        throw Error('Invalid or unsupported PNG size/format');
      header={width,height,color};
    }else if(kind==='IDAT'){
      if(ended)throw Error('PNG data after end');
      compressed+=length;
      if(compressed>25*1024*1024)throw Error('PNG IDAT exceeds cap');
      seenData=true;idats.push(data)
    }else if(kind==='IEND'){
      if(length!==0||!seenData)throw Error('Incomplete PNG stream');
      ended=true;pos+=12;break
    }else if(!/^[A-Za-z]{4}$/.test(kind))throw Error('Unknown PNG chunk');
    pos+=length+12
  }
  if(!ended||pos!==buffer.length||!header)throw Error('Missing IEND or appended PNG bytes');
  const channels={0:1,2:3,3:1,4:2,6:4}[header.color];
  const row=header.width*channels+1,expected=row*header.height;
  if(expected>64*1024*1024)throw Error('Excessive PNG decoded pixels');
  let decoded;
  try{decoded=zlib.inflateSync(Buffer.concat(idats),{maxOutputLength:expected+1})}
  catch{throw Error('Invalid or oversized PNG compressed image')}
  if(decoded.length!==expected)throw Error('Missing PNG pixel scanlines');
  for(let y=0;y<header.height;y++)if(decoded[y*row]>4)throw Error('Invalid PNG scanline filter');
  return{width:header.width,height:header.height}
}

function checkArtifact(filename,expected){
  if(!filename)return{state:'not-checked'};
  if(!SHA64.test(String(expected||'')))return{state:'invalid'};
  const actual=digest(fs.readFileSync(filename));
  return actual.toLowerCase()===String(expected).toLowerCase()?{state:'verified'}:{state:'invalid'};
}
function audit(manifest,options={}){
  const root=options.root||process.cwd(),issues=[],captured=new Map(),pictures=[],seen=new Map();
  function issue(level,code,detail){issues.push({level,code,detail:String(detail)})}
  if(manifest?.schema!=='michelslab-rendered-ui-v1')issue('error','schema','Unrecognized source manifest');
  if(!SHA40.test(manifest?.source_commit||''))issue('error','source','Invalid commit');
  if(options.sha&&String(options.sha).toLowerCase()!==String(manifest.source_commit).toLowerCase())issue('error','stale','Different candidate HEAD');
  const installHash=manifest?.artifact_sha256?.windows,portableHash=manifest?.portable_artifact_sha256?.windows;
  if(!SHA64.test(installHash||''))issue('error','installed-hash','Missing installer hash');
  if(!SHA64.test(portableHash||''))issue('error','portable-hash','Missing portable hash');
  const artifactChecks={installed:checkArtifact(options.setup,installHash),portable:checkArtifact(options.portable,portableHash)};
  for(const [v,result] of Object.entries(artifactChecks))if(result.state==='invalid')issue('error','artifact-mismatch',v);
  if(!Array.isArray(manifest?.screenshots))issue('error','missing-list','No screenshots array');
  for(const [i,shot] of (Array.isArray(manifest?.screenshots)?manifest.screenshots:[]).entries()){
    const v=String(shot?.runtime_variant||''),s=String(shot?.surface||''),size=String(shot?.viewport||'');
    if(!VARIANTS.includes(v)||!SIZES.includes(size)||!MODES.includes(s)){
      // About scrolled view and measured field-multiregion are supplemental,
      // not proof that another workspace was captured.
      continue;
    }
    if(shot.platform!=='windows'||!SHA64.test(shot.sha256||'')||
      shot.candidate_artifact_sha256!== (v==='installed'?installHash:portableHash)){
      issue('error','source-binding','Invalid screenshot identity '+i);continue;
    }
    let bytes,measured;
    try{
      const file=inside(root,shot.path);
      if(fs.statSync(file).size>25*1024*1024)throw Error('PNG too large');
      bytes=fs.readFileSync(file);measured=png(bytes);
      if(digest(bytes).toLowerCase()!==shot.sha256.toLowerCase())throw Error('Screenshot SHA-256 mismatch');
      if(measured.width!==shot.width||measured.height!==shot.height)throw Error('Screenshot dimensions mismatch');
      // Only actual host capture methods produced by make_visual_evidence.py
      // qualify, and a tiny fake PNG must never satisfy a 36-slot matrix.
      const requiredMethod=v==='installed'?'installed-windows-desktop':'running-desktop-app';
      if(shot.capture_method!==requiredMethod)throw Error('Not an original native Windows capture');
      const minWidth=size==='wide'?960:540;
      if(measured.width<minWidth||measured.height<400)throw Error('Screenshot too small for original viewport');
    }catch(e){issue('error','invalid-png',i+': '+e.message);continue}
    const key=[v,size,s].join('|');
    if(captured.has(key)){issue('error','duplicate-slot',key);continue}
    const hash=digest(bytes),earlier=seen.get(hash);
    if(earlier&&earlier!==s)issue('error','same-image-different-tabs',earlier+' and '+s);
    seen.set(hash,s);captured.set(key,true);
    pictures.push({variant:v,surface:s,viewport:size,sha256:hash,width:measured.width,height:measured.height,bytes});
  }
  const coverage=MODES.map(surface=>{
    const cells=VARIANTS.flatMap(variant=>SIZES.map(viewport=>({
      variant,viewport,state:captured.has([variant,viewport,surface].join('|'))?'captured-not-reviewed':'missing'
    })));
    return{surface,cells,complete:cells.every(c=>c.state==='captured-not-reviewed')};
  });
  const missing=coverage.filter(x=>!x.complete).map(x=>x.surface);
  const status=issues.some(x=>x.level==='error')?'INVALID':missing.length?'INCOMPLETE':'REQUIRES_HUMAN_REVIEW';
  return{
    schema:'foamlens-granada-g5-review-v1',source_commit:manifest?.source_commit||null,
    status,human_approved:false,artifact_checks:artifactChecks,
    captured_slots:captured.size,required_slots:MODES.length*VARIANTS.length*SIZES.length,
    missing_surfaces:missing,issues,coverage,pictures,
    limitations:[
      'Capture evidence is not visual approval or proof of an operable control.',
      'Two CSS viewports do not certify Windows high-DPI 125–200%.',
      'Missing Time Series, A–D, Analysis, Review and Live screenshots stay explicitly unverified.',
      'No scientific validity or read-only import is asserted by this report.'
    ]
  };
}
function render(report){
  const cells=report.coverage.map(x=>'<tr><th>'+esc(x.surface)+'</th>'+
    x.cells.map(c=>'<td class="'+(c.state==='missing'?'bad':'good')+'">'+(c.state==='missing'?'NOT CAPTURED':'CAPTURED · REVIEW REQUIRED')+'</td>').join('')+'</tr>').join('');
  const images=report.pictures.map(p=>'<article><b>'+esc(p.surface)+' · '+esc(p.variant)+' · '+esc(p.viewport)+'</b>'+
    '<small>'+p.width+'×'+p.height+' · SHA '+esc(p.sha256.slice(0,16))+'…</small>'+
    '<img loading="lazy" alt="'+esc(p.surface)+'" src="data:image/png;base64,'+p.bytes.toString('base64')+'"></article>').join('');
  return '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
    '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; img-src data:; style-src &#39;unsafe-inline&#39;;">'+
    '<title>FoamLens · Granada Visual G5</title><style>'+
    'body{max-width:1500px;margin:auto;padding:25px;background:#121b28;color:#edf2f7;font:14px system-ui}p,li,small{color:#bcc9db;line-height:1.5}'+
    'h1{font-size:24px}table{border-collapse:collapse;width:100%;font-size:11px}th,td{border:1px solid #394a60;padding:9px;text-align:left}'+
    'th{min-width:130px}.good{color:#85e5bd}.bad{color:#ffd09a}.gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,430px),1fr));gap:16px}'+
    'article{padding:12px;background:#1a2839;border:1px solid #394a60;border-radius:11px;min-width:0}article img{display:block;width:100%;margin-top:8px}'+
    'small{display:block;margin-top:4px}section{margin-top:30px}code{overflow-wrap:anywhere}@media(max-width:730px){body{padding:12px}table{display:block;overflow-x:auto}}</style></head><body>'+
    '<h1>FoamLens / Operación Granada · G5</h1><p><b>'+esc(report.status)+'</b> · '+report.captured_slots+'/'+report.required_slots+' capturas requeridas · SHA <code>'+
    esc(report.source_commit)+'</code></p><p>Revisión local únicamente. Sin aprobación estética automática, sin publicación.</p>'+
    '<section><h2>Matriz obligatoria de todas las pestañas</h2><table><thead><tr><th>Pantalla</th>'+
    VARIANTS.flatMap(v=>SIZES.map(w=>'<th>'+v+' / '+w+'</th>')).join('')+'</tr></thead><tbody>'+cells+'</tbody></table></section>'+
    '<section><h2>Capturas originales para revisión humana</h2><div class="gallery">'+images+'</div></section>'+
    '<section><h2>Limitaciones / faltantes</h2><ul>'+report.issues.map(i=>'<li>'+esc(i.level)+' · '+esc(i.code)+' · '+esc(i.detail)+'</li>').join('')+
    report.limitations.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul></section></body></html>';
}
function main(argv=process.argv.slice(2)){
  const {values}=parseArgs({args:argv,options:{manifest:{type:'string'},output:{type:'string'},json:{type:'string'},sha:{type:'string'},setup:{type:'string'},portable:{type:'string'},strict:{type:'boolean'}}});
  if(!values.manifest||!values.output)throw Error('Required: --manifest and --output');
  const filename=path.resolve(values.manifest);
  const manifest=JSON.parse(fs.readFileSync(filename,'utf8'));
  const result=audit(manifest,{root:path.dirname(filename),sha:values.sha,setup:values.setup,portable:values.portable});
  fs.mkdirSync(path.dirname(path.resolve(values.output)),{recursive:true});
  fs.writeFileSync(values.output,render(result),'utf8');
  if(values.json)fs.writeFileSync(values.json,JSON.stringify({...result,pictures:result.pictures.map(({bytes,...rest})=>rest)},null,2)+'\n','utf8');
  process.stdout.write(JSON.stringify({status:result.status,captured:result.captured_slots,required:result.required_slots,missing:result.missing_surfaces})+'\n');
  return result.status==='INVALID'?2:(values.strict&&result.status!=='REQUIRES_HUMAN_REVIEW'?3:0);
}
if(require.main===module){try{process.exitCode=main()}catch(e){console.error(e.message);process.exitCode=2}}
module.exports={audit,render,inside,png,main,MODES,VARIANTS,SIZES};
