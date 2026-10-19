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
for(const s of ['id="cgFiles"','id="cgCanvas"','data-cg-view="top"','cgUnitWarning','cgUnitScale','sourceUnitConfirmedByUser','openFoamCaseMutated:false','FOAMLENS_CAD_CORE_END'])
  assert(script.includes(s),'CAD provenance/UI contract missing '+s);
console.log('FoamLens CAD surface PASS: OBJ groups/negative indices, closed/open topology, winding, ASCII/binary STL, units and export.');
