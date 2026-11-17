'use strict';
// Granada CAD F4: use the ORIGINAL OpenFOAM staging toolbar's edition choice,
// model-owned roles, disabled guards and real ZIP export action with no case IO.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','src','FoamLensDesktop',
  'frontend','v24-cad-surface-inspector.js'),'utf8');
const slice=(a,b)=>{const i=source.indexOf(a),j=source.indexOf(b,i+a.length);
  assert(i>=0&&j>i,'Missing original CAD function: '+a);return source.slice(i,j)};
const core=new Function(slice('/* FOAMLENS_CAD_CORE_START */',
  '/* FOAMLENS_CAD_CORE_END */')+
  ';return{prepare:cgOpenFoamPrepare,store:cgStoreZip,read:cgReadStoredZip,'+
  'summary:cgSummary,totals:cgVisiblePartTotals,scale:cgUnitScale}')();
const triangle=(part,x)=>({part,vertices:[[x,0,0],[x+1,0,0],[x,1,0]]});
const models=[
 {name:'Ladle / metal',format:'obj-surface',bytes:120,visible:true,unit:'mm',
  triangles:[triangle('metal',0),triangle('interface',2)],
  partsVisible:new Map([['metal',true],['interface',true]])},
 {name:'Mold / sand',format:'obj-surface',bytes:80,visible:true,unit:'cm',
  triangles:[triangle('mold',4)],partsVisible:new Map([['mold',true]])}
];
const target={value:''},button={disabled:true},preview={textContent:''},status=[];
const document={getElementById:id=>({
  cgOpenFoamTarget:target,cgExportOpenFoamPrep:button,cgOpenFoamPrepPreview:preview
})[id]||null};
let confirmations=0,permit=false,download=null;
const mockWindow={confirm:()=>{confirmations++;return permit}};
const api=new Function('document','window','cgUi','cgUnitScale','cgVisiblePartTotals',
  'cgOpenFoamPrepare','cgStoreZip','cgDownloadZip','cgShow','cgModelsInitial',
  slice('let cgModels=[]','const cgTreeOpen=')+
  ';cgModels.push(...cgModelsInitial);return{refresh:cgRefreshOpenFoamPrep,'+
  'setRole:cgOpenFoamSetRole,roles:cgOpenFoamRoleMap,'+
  'export:cgExportOpenFoamPrep,models:cgModels}')(
    document,mockWindow,en=>en,core.scale,core.totals,core.prepare,core.store,
    (name,bytes)=>{download={name,bytes}},message=>status.push(String(message)),models);
api.refresh();
assert.equal(button.disabled,true,'An unspecified OpenFOAM variant cannot produce a staged case');
assert(preview.textContent.includes('Choose your OpenFOAM edition'));
target.value='foundation13';api.refresh();
assert.equal(button.disabled,false,'Explicit edition and source units allow safe offline staging');
assert(preview.textContent.includes('constant/geometry'));
api.setRole(0,'metal','metal');
api.setRole(0,'interface','interface');
api.setRole(1,'mold','mold');
assert.equal(api.roles().get('0|interface'),'interface');
assert.equal(api.roles().get('1|mold'),'mold');
assert.equal(api.roles().get('0|metal'),'metal');
assert.throws(()=>api.setRole(0,'invalid part','wall'),/Invalid original/);
assert.throws(()=>api.setRole(1,'mold','made-up CFD zone'),/Invalid original/);
assert.equal(api.roles().size,3);
api.export();
assert.equal(download,null,'Topologically open original CAD surfaces require explicit user confirmation');
assert.equal(confirmations,1);
permit=true;api.export();
assert(download);
assert.equal(download.name,'FoamLens-OpenFOAM-foundation13-geometry-staging.zip');
let archive=core.read(download.bytes);
const decoder=new TextDecoder();
let manifest=JSON.parse(decoder.decode(archive.find(x=>x.name==='preparation.json').data));
assert.equal(manifest.regionCount,3);
assert.equal(manifest.rolesAssigned,3);
assert.deepEqual(manifest.regions.map(r=>r.regionRoleSelectedByUser),
  ['metal','interface','mold']);
assert(!manifest.installedOpenFoamVerified);
assert(archive.every(e=>!e.name.endsWith('blockMeshDict')&&!e.name.endsWith('snappyHexMeshDict')),
  'A staging archive must not silently overwrite runnable mesh dictionaries');
assert(status.at(-1).includes('NO mesh or case changes'));
assert.deepEqual(models.map(m=>m.unit),['mm','cm']);
assert.equal(models[0].triangles.length,2);
assert.equal(models[1].triangles.length,1);
target.value='openfoamcom';api.refresh();
assert.equal(button.disabled,false);
assert(preview.textContent.includes('constant/'+'tri'+'Surface'));
download=null;api.export();
assert(download&&download.name.includes('openfoamcom'));
archive=core.read(download.bytes);
manifest=JSON.parse(decoder.decode(archive.find(x=>x.name==='preparation.json').data));
assert.equal(manifest.geometryType,'triSurfaceMesh');
assert.equal(manifest.geometryDirectoryRelativeToCase,'constant/'+'tri'+'Surface');
models[1].unit='unknown';api.refresh();
assert.equal(button.disabled,true,'Missing a visible source unit must block staging');
download=null;api.export();
assert.equal(download,null,'Even manual invocation cannot bypass the original physical scale gate');
models[1].unit='cm';
models[1].visible=false;api.refresh();
assert.equal(button.disabled,false);
assert(preview.textContent.includes('2 selected visible CAD regions'));
download=null;api.export();
assert(download,'Hidden model with unknown units cannot prevent a valid visible-model staging');
assert.equal(JSON.parse(decoder.decode(core.read(download.bytes).find(e=>e.name==='preparation.json').data)).regionCount,2);
models[0].visible=false;api.refresh();
assert.equal(button.disabled,true);
download=null;api.export();
assert.equal(download,null,'Zero source regions cannot produce geometry from an empty assembly');
assert.equal(confirmations,4,'A confirmation is shown only when a valid export contains topology warnings');
console.log('PASS CAD F4 toolbar: distribution required, explicit roles per original model/part, topological consent, native ZIP download and no case/mesh mutation');
