'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const script=fs.readFileSync(path.join(__dirname,'..','src','FoamLensDesktop','frontend','v24-cad-surface-inspector.js'),'utf8');
new Function(script);
const start=script.indexOf('/* FOAMLENS_CAD_CORE_START */'),end=script.indexOf('/* FOAMLENS_CAD_CORE_END */',start);
assert(start>=0&&end>start,'CAD parser testable core must be present');
const {parseStl,parseObj,summary,exportAsciiStl,unitScale}=
  new Function(script.slice(start,end)+';return{parseStl:cgParseStl,parseObj:cgParseObj,summary:cgSummary,exportAsciiStl:cgMakeAsciiStl,unitScale:cgUnitScale}')();

const tri=parseObj('v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n','test.obj');
assert.strictEqual(tri.triangles.length,1);
const triangleSummary=summary(tri.triangles);
assert.strictEqual(triangleSummary.boundaryEdges,3);
assert.strictEqual(triangleSummary.closedWinding,false);
assert.strictEqual(triangleSummary.area,.5);
assert.strictEqual(triangleSummary.enclosedVolumeEstimate,null);

const tet=[
'v 0 0 0','v 1 0 0','v 0 1 0','v 0 0 1',
'o shell-a','f 1 3 2','f 1 2 4','f 1 4 3','f 2 3 4'
].join('\n');
const obj=parseObj(tet,'tetra.obj'),metrics=summary(obj.triangles);
assert.deepStrictEqual(metrics.parts,[{name:'shell-a',count:4}]);
assert.strictEqual(metrics.boundaryEdges,0);
assert.strictEqual(metrics.nonManifoldEdges,0);
assert.strictEqual(metrics.orientationConflicts,0);
assert.strictEqual(metrics.closedWinding,true);
assert(Math.abs(metrics.enclosedVolumeEstimate-1/6)<1e-12,'enclosed volume is an estimate for a known tetrahedron');
assert.deepStrictEqual(metrics.bounds.size,[1,1,1]);

const reversed=parseObj(tet.replace('f 2 3 4','f 2 4 3'));
assert(summary(reversed.triangles).orientationConflicts>0,'reversed winding is detected');
assert.strictEqual(summary(reversed.triangles).enclosedVolumeEstimate,null,'no volume claims from inconsistent winding');

const twoParts=parseObj('v 0 0 0\nv 1 0 0\nv 0 1 0\no metal\nf 1 2 3\ng mold\nf -3 -2 -1','multi.obj');
assert.deepStrictEqual(summary(twoParts.triangles).parts.map(p=>p.name),['metal','mold']);
assert.throws(()=>parseObj('v 0 0 0\nf 1 1 4'),/outside vertex/);
assert.throws(()=>parseObj('v 0 0 0\nv 1 0 0\nv 0 1 0\nf 0 1 2'),/Invalid OBJ face/);
assert.throws(()=>parseObj('v NaN 0 0\nf 1 1 1'),/Non-finite/);
assert.throws(()=>parseObj('v 0 0 0\nv 1 0 0\nv 0 1 0'),/no supported polygon/);

const stl=exportAsciiStl(tri.triangles,'triangle',.001);
const result=parseStl(new TextEncoder().encode(stl).buffer,'test.stl');
assert.strictEqual(result.format,'ascii-stl');
assert.strictEqual(result.triangles.length,1);
assert(Math.abs(result.triangles[0].vertices[1][0]-.001)<1e-12);
assert.throws(()=>parseStl(new TextEncoder().encode('not a mesh').buffer),/too short|Invalid/);
assert.throws(()=>parseStl(new TextEncoder().encode('solid s\n facet normal 0 0 1\nendfacet\nendsolid s').buffer),/exactly three/);

// A binary STL's 80-byte header can legitimately start with "solid".
const binary=new ArrayBuffer(84+50),b=new Uint8Array(binary),dv=new DataView(binary);
b.set(Buffer.from('solid binary header'));dv.setUint32(80,1,true);
[[0,0,0],[1,0,0],[0,1,0]].forEach((p,k)=>p.forEach((v,j)=>dv.setFloat32(84+12+k*12+j*4,v,true)));
const parsedBinary=parseStl(binary,'binary.stl');
assert.strictEqual(parsedBinary.format,'binary-stl');
assert.strictEqual(parsedBinary.triangles.length,1);
assert.strictEqual(summary(parsedBinary.triangles).area,.5);
dv.setFloat32(84+12,Number.NaN,true);
assert.throws(()=>parseStl(binary),/Non-finite/);
assert.strictEqual(unitScale('mm'),.001);
assert.strictEqual(unitScale('m'),1);
assert.strictEqual(unitScale('in'),.0254);
assert.strictEqual(unitScale('unknown'),null,'Never guess STL/OBJ units');
assert.throws(()=>exportAsciiStl(tri.triangles,'unconfirmed',0),/Explicit positive/);
assert(!script.includes('constant/triSurface'),'Do not silently assume an OpenFOAM distribution path');
for(const s of ['data-cg-part','data-cg-unit','partsVisible','partSummaries','unit:\'unknown\'','id="cgFiles"','id="cgCanvas"','data-cg-view="top"','cgUnitWarning','cgUnitScale','sourceUnitConfirmedByUser','openFoamCaseMutated:false','FOAMLENS_CAD_CORE_END'])
  assert(script.includes(s),'CAD provenance/UI contract missing '+s);

// Batch export is an actual standalone, offline ZIP of per-region binary STL surfaces.
const {binaryStl,batchRegions,storeZip,crc32}=
 new Function(script.slice(start,end)+
   ';return {binaryStl:cgBinaryStl,batchRegions:cgVisibleRegionBatch,storeZip:cgStoreZip,crc32:cgCrc32}')();
assert.equal(crc32(new TextEncoder().encode('123456789')),0xcbf43926,'ZIP CRC-32 canonical check');
const metal=parseObj('v 0 0 0\nv 1000 0 0\nv 0 1000 0\ng metal\nf 1 2 3','metal.obj'),
 mold=parseObj('v 0 0 0\nv 100 0 0\nv 0 100 0\ng mold\nf 1 2 3','mold.obj'),
 disabled=parseObj('v 0 0 0\nv 1 0 0\nv 0 1 0\ng hidden\nf 1 2 3','hidden.obj');
const models=[
 {name:'metal.obj',format:'obj-surface',bytes:47,triangles:metal.triangles,
  partsVisible:new Map([['metal',true]]),unit:'mm',visible:true},
 {name:'mold.obj',format:'obj-surface',bytes:46,triangles:mold.triangles,
  partsVisible:new Map([['mold',true]]),unit:'cm',visible:true},
 {name:'hidden.obj',format:'obj-surface',bytes:47,triangles:disabled.triangles,
  partsVisible:new Map([['hidden',false]]),unit:'unknown',visible:true}
];
assert.throws(()=>binaryStl(metal.triangles,0,'bad'),/Confirm/);
const actual=binaryStl(metal.triangles,.001,'metal');
assert.equal(actual.byteLength,134,'binary STL has 84 bytes header + 50 per triangle');
const actualParsed=parseStl(actual.buffer,'round-trip.stl');
assert.equal(actualParsed.format,'binary-stl');
assert(Math.abs(actualParsed.triangles[0].vertices[1][0]-1)<1e-6,'millimeters converted to meters');
assert.throws(()=>binaryStl([{vertices:[[Infinity,0,0],[0,1,0],[0,0,1]]}],1,'bad'),/Non-finite/);
const batch=batchRegions(models);
assert.equal(batch.manifest.schema,'foamlens/cad-batch-surfaces/1');
assert.equal(batch.manifest.regionCount,2);
assert.equal(batch.manifest.triangleCount,2);
assert.equal(batch.topologyWarnings,2,'open triangle surfaces require user confirmation');
assert.equal(batch.files.length,3,'two separate binary regions and manifest');
assert(batch.files[0].name.startsWith('surfaces/model001_region001_'));
assert(batch.files[1].name.startsWith('surfaces/model002_region001_'));
assert(batch.files.every(e=>e.name!=='surfaces/hidden.stl'));
assert.equal(batch.manifest.regions[0].sourceUnitConfirmedByUser,'mm');
assert.equal(batch.manifest.regions[1].sourceUnitConfirmedByUser,'cm');
assert.equal(batch.manifest.regions[0].sourceToMeterScale,.001);
assert.equal(batch.manifest.regions[1].sourceToMeterScale,.01);
assert.deepEqual(batch.manifest.regions[0].boundsMeters,[1,1,0]);
assert.equal(batch.manifest.openFoamCaseMutated,false);
assert.deepEqual(batch.manifest.toolsExecuted,[]);
assert.equal(batch.manifest.regions[0].outputFile,batch.files[0].name);
const batchArchive=storeZip(batch.files),dvZip=new DataView(batchArchive.buffer);
assert.equal(dvZip.getUint32(batchArchive.length-22,true),0x06054b50,'standard ZIP end header');
assert.equal(dvZip.getUint16(batchArchive.length-12,true),3,'3 central-directory entries');
let byteOffset=0;
const extracted=new Map(),decoder=new TextDecoder();
for(let i=0;i<batch.files.length;i++){
 assert.equal(dvZip.getUint32(byteOffset,true),0x04034b50,'ZIP local header');
 assert.equal(dvZip.getUint16(byteOffset+8,true),0,'ZIP STORE mode: offline and uncompressed');
 const length=dvZip.getUint32(byteOffset+18,true),n=dvZip.getUint16(byteOffset+26,true);
 const name=decoder.decode(batchArchive.slice(byteOffset+30,byteOffset+30+n));
 const payload=batchArchive.slice(byteOffset+30+n,byteOffset+30+n+length);
 assert.equal(dvZip.getUint32(byteOffset+14,true),crc32(payload),'ZIP CRC per file');
 assert.equal(name,batch.files[i].name,'archive order preserves region naming');
 extracted.set(name,payload);
 byteOffset+=30+n+length
}
assert.equal(dvZip.getUint32(byteOffset,true),0x02014b50,'valid central directory begins');
const restored=JSON.parse(decoder.decode(extracted.get('manifest.json')));
assert.equal(restored.regions.length,2,'manifest is inside archive');
assert.equal(restored.regions[0].outputFile,batch.files[0].name);
const firstZipStl=parseStl(extracted.get(batch.files[0].name).buffer,'metal.stl');
const secondZipStl=parseStl(extracted.get(batch.files[1].name).buffer,'mold.stl');
assert(Math.abs(firstZipStl.triangles[0].vertices[1][0]-1)<1e-6);
assert(Math.abs(secondZipStl.triangles[0].vertices[1][0]-1)<1e-6);
assert.throws(()=>batchRegions([{...models[0],unit:'unknown'}]),/Confirm/);
assert.throws(()=>batchRegions(models.map(m=>({...m,visible:false}))),/Select at least/);
assert.throws(()=>storeZip([{name:'../traversal.stl',data:new Uint8Array([1])}]),/Unsafe/);
assert.throws(()=>storeZip([{name:'same.stl',data:new Uint8Array([1])},{name:'same.stl',data:new Uint8Array([2])}]),/Unsafe/);
assert(script.includes('id="cgExportBatch"'),'native CAD viewer has one-click visible regions ZIP control');
assert(script.includes("document.getElementById('cgExportBatch').onclick=cgExportVisibleBatch"),
 'original CAD UI binds the real batch exporter');

console.log('FoamLens CAD surface PASS: OBJ groups/negative indices, closed/open topology, winding, ASCII/binary STL, units and export.');
