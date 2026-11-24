'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../src/FoamLensDesktop/frontend/v24-z-cad-blockmesh-designer.js'),'utf8');
new Function(src);
function core(name,variable){const a=src.indexOf('/* FOAMLENS_'+name+'_CORE_START */'),b=src.indexOf('/* FOAMLENS_'+name+'_CORE_END */');assert(a>=0&&b>a);return new Function(src.slice(a,b)+';return '+variable)()}
const ms=core('MESH_STUDIO','msCore'),mg=core('GMSH_INSPECTOR','mgCore');
const head=(object,cls)=>'FoamFile { format ascii; class '+cls+'; object '+object+'; }\n';
const verts='((0 0 0)(1 0 0)(1 1 0)(0 1 0)(0 0 1)(1 0 1)(1 1 1)(0 1 1))';
const d=head('blockMeshDict','dictionary')+'units [mm]; vertices '+verts+'; blocks (hex (0 1 2 3 4 5 6 7) metal (2 3 4) simpleGrading (1 ((1 1 2)(1 1 1)) 1)); edges (arc 0 1 (0.5 -0.5 0)); boundary (wall {type wall; faces ((0 3 2 1));}); mergePatchPairs ();';
const plan=ms.blockDict(d);assert.equal(plan.cells,24);assert.equal(plan.arcs.size,1);assert.equal(plan.vertices[1][0],.001);assert.equal(plan.zones.metal,24);assert.equal(plan.meshGenerated,false);const p=plan.arcs.values().next().value.points;assert(Math.abs(p[12][1]+.0005)<1e-12);assert.deepEqual(p[0],[0,0,0]);assert.deepEqual(p[24],[.001,0,0]);
for(const s of [d.replace('units [mm]','units [inch]'),d.replace('arc 0 1','spline 0 1'),d.replace('0.5 -0.5 0','0.5 0 0'),d.replace('0 1 2 3 4 5 6 7','0 1 2 3 4 5 6 9'),d+' #include "other"'])assert.throws(()=>ms.blockDict(s));
const cube={points:head('points','vectorField')+'8'+verts,faces:head('faces','faceList')+'6(4(0 3 2 1)4(4 5 6 7)4(0 1 5 4)4(1 2 6 5)4(2 3 7 6)4(3 0 4 7))',owner:head('owner','labelList')+'6(0 0 0 0 0 0)',neighbour:head('neighbour','labelList')+'0()',boundary:head('boundary','polyBoundaryMesh')+'1(wall { type wall; nFaces 6; startFace 0; })'};
const m=ms.poly(cube);assert.equal(m.cells.length,1);assert.deepEqual(ms.locate(m,'cellSet',0).point,[.5,.5,.5]);assert.equal(ms.readSet(head('badFaces','faceSet')+'1(3)','badFaces',m).values[0],3);
for(const s of ['1(6)','2(1 1)','2(1)'])assert.throws(()=>ms.readSet(head('badFaces','faceSet')+s,'badFaces',m));
assert.throws(()=>ms.poly({...cube,boundary:cube.boundary.replace('nFaces 6','nFaces 5')}));assert.throws(()=>ms.poly({...cube,points:cube.points.replace('format ascii','format binary')}));assert.throws(()=>ms.locate(m,'cellSet',1));
const reverse=ms.poly({...cube,faces:cube.faces.replace('4(0 3 2 1)','4(1 2 3 0)')});const match=ms.patchMatch(m,'wall',reverse,'wall');assert.equal(match.matched,6);assert.equal(match.opposite,1);assert.equal(match.interfaceVerified,false);assert.equal(ms.patchMatch(m,'wall',{...m,points:m.points.map(p=>[p[0]+2,p[1],p[2]])},'wall').matched,0);
const msh=['$MeshFormat','2.2 0 8','$EndMeshFormat','$PhysicalNames','3','3 101 "metal"','3 102 "mold"','2 201 "contact"','$EndPhysicalNames','$Nodes','12','1 0 0 0','2 1 0 0','3 1 1 0','4 0 1 0','5 0 0 1','6 1 0 1','7 1 1 1','8 0 1 1','9 2 0 0','10 2 1 0','11 2 0 1','12 2 1 1','$EndNodes','$Elements','3','1 5 2 101 1 1 2 3 4 5 6 7 8','2 5 2 102 2 2 9 10 3 6 11 12 7','3 3 2 201 3 2 3 7 6','$EndElements'].join('\n');
const mesh=mg.parse(msh,'mm');assert.equal(mesh.groups.get('3:101').types.HEX8,1);assert.equal(mesh.points.get(9)[0],.002);assert.equal(mesh.elements.get(2).entity,2);const contact=mg.contact(mesh,'2:201','3:101','3:102');assert.equal(contact.paired,1);assert.deepEqual(contact.rows[0],{surface:3,a:[1],b:[2]});assert.equal(contact.interfaceVerified,false);
for(const bad of [msh.replace('2.2 0 8','4.1 0 8'),msh.replace('2.2 0 8','2.2 1 8'),msh.replace('7 8\n2 5','7 99\n2 5'),msh.replace('1 5 2 101','1 17 2 101')])assert.throws(()=>mg.parse(bad,'mm'));
assert.throws(()=>mg.parse(msh,''));assert.throws(()=>mg.contact(mesh,'2:201','3:101','3:101'));const unmatched=mg.parse(msh.replace('3 3 2 201 3 2 3 7 6','3 3 2 201 3 1 4 8 5'),'mm');assert.equal(mg.contact(unmatched,'2:201','3:101','3:102').missingB,1);
console.log('Mesh Studio: curved plan, native topology/sets, patch identity and MSH2.2 HEX8 contact PASS');

const quality=ms.qualityCSV('id,value\n0,10\n2,35\n4,80','faceSet',m,4);
assert.equal(quality.coverage,.5);assert.equal(quality.histogram.flatMap(x=>x.ids).length,3);assert.deepEqual(quality.histogram.at(-1).ids,[4]);assert.equal(quality.sourceBindingVerified,false);
for(const bad of ['id,value\n6,1','id,value\n0,1\n0,2','id,value\n1,NaN','id,value\n1,Infinity'])assert.throws(()=>ms.qualityCSV(bad,'faceSet',m));
const flat=ms.qualityCSV('id,value\n0,10\n1,10','faceSet',m);assert.equal(flat.histogram.length,1);assert.deepEqual(flat.histogram[0].ids,[0,1]);
const start=src.indexOf('/* FOAMLENS_CAD_MEASURE_CORE_START */'),end=src.indexOf('/* FOAMLENS_CAD_MEASURE_CORE_END */');
const distance=new Function(src.slice(start,end)+';return cmDistance')();assert.equal(distance([0,0,0],[.003,.004,0]).distance_m,.005);assert.throws(()=>distance([0,0,NaN],[1,2,3]));
console.log('Quality histogram and CAD measurement PASS');

const geo=ms.cellGeometry(m,0);assert(Math.abs(geo.volume_m3-1)<1e-12);assert(geo.centroid_m.every(x=>Math.abs(x-.5)<1e-12));
const area=ms.geometricMetric(m,'faceArea');assert.equal(area.values.length,6);assert(area.values.every(r=>r.value===1));assert.equal(ms.metricThreshold(area,1,1).length,6);assert.equal(ms.metricThreshold(area,0,.5).length,0);assert.throws(()=>ms.metricThreshold(area,2,1));
assert.deepEqual(ms.geometricMetric({...m,cells:[[0,1,2,3,4]]},'cellVolume').invalid,[0]);
assert.deepEqual(ms.geometricMetric(m,'nonOrthogonality').values,[]);
const two={points:[...m.points,[2,0,0],[2,1,0],[2,0,1],[2,1,1]],faces:[[1,2,6,5],m.faces[0],m.faces[1],m.faces[2],m.faces[4],m.faces[5],[1,2,9,8],[5,10,11,6],[1,8,10,5],[8,9,11,10],[2,6,11,9]],owner:[0,0,0,0,0,0,1,1,1,1,1],neighbour:[1],cells:[[0,1,2,3,4,5],[0,6,7,8,9,10]]};
const orth=ms.geometricMetric(two,'nonOrthogonality');assert.equal(orth.values.length,1);assert(Math.abs(orth.values[0].value)<1e-6);
console.log('Computed native geometry and threshold PASS');

const msh41=['$MeshFormat','4.1 0 8','$EndMeshFormat','$PhysicalNames','4','3 101 "metal"','3 102 "mold"','2 201 "contact"','2 202 "interface alias"','$EndPhysicalNames','$Entities','0 0 1 2','3 1 0 0 1 1 1 2 201 202 0','1 0 0 0 1 1 1 1 101 0','2 1 0 0 2 1 1 1 102 0','$EndEntities','$Nodes','2 12 10 120','3 1 0 8','10 20 30 40 50 60 70 80','0 0 0','1 0 0','1 1 0','0 1 0','0 0 1','1 0 1','1 1 1','0 1 1','3 2 0 4','90 100 110 120','2 0 0','2 1 0','2 0 1','2 1 1','$EndNodes','$Elements','3 3 1001 3003','3 1 5 1','1001 10 20 30 40 50 60 70 80','3 2 5 1','2002 20 90 100 30 60 110 120 70','2 3 3 1','3003 20 30 70 60','$EndElements'].join('\n');
const g41=mg.parse(msh41,'mm');assert.equal(g41.version,'4.1');assert.equal(g41.points.size,12);assert.equal(g41.elements.size,3);assert.deepEqual(g41.elements.get(3003).physicalTags,[201,202]);assert.equal(g41.groups.get('2:202').count,1);assert.deepEqual(g41.points.get(120),[.002,.001,.001]);
const c41=mg.contact(g41,'2:202','3:101','3:102');assert.equal(c41.paired,1);assert.equal(c41.areaCoverage,1);assert(Math.abs(c41.pairedAreaVectorMagnitude_m2-1e-6)<1e-15);assert.deepEqual(c41.rows[0],{surface:3003,a:[1001],b:[2002]});assert.equal(c41.interfaceVerified,false);
for(const bad of [msh41.replace('4.1 0 8','4.1 1 8'),msh41.replace('2 12 10 120','2 12 10 121'),msh41.replace('3003 20 30 70 60','3003 20 30 999 60'),msh41.replace('90 100 110 120','90 100 110 80'),msh41.replace('2 3 3 1','2 4 3 1')])assert.throws(()=>mg.parse(bad,'mm'));
const overlap=mg.parse(msh41.replace('2 1 0 0 2 1 1 1 102 0','2 1 0 0 2 1 1 2 101 102 0'),'mm');assert.throws(()=>mg.contact(overlap,'2:201','3:101','3:102'));
const noEntities=mg.parse(msh41.replace(/\$Entities[\s\S]*?\$EndEntities\n/,''),'mm');assert.equal(noEntities.groups.get('3:0').count,2);assert.equal(noEntities.groups.get('3:101').count,0);
console.log('Gmsh 4.1 sparse IDs, multiple physical tags, contact area and invalid cases PASS');

const normalized=mg.canonical(mesh);assert.equal(normalized.volumes,2);assert.equal(normalized.coordinates,'m');assert.equal(normalized.mapping.length,3);assert(normalized.msh.includes('9 0.002 0 0'));assert(normalized.msh.includes('"fl_3_101"'));assert.equal(normalized.nativeIdMappingVerified,false);
const roundtrip=mg.parse(normalized.msh,'m');assert.deepEqual(roundtrip.points.get(9),mesh.points.get(9));assert.equal(roundtrip.elements.size,3);assert.equal(mg.contact(roundtrip,'2:1','3:2','3:3').paired,1);
assert.throws(()=>mg.canonical(g41));const single=mg.parse(msh41.replace('2 201 202 0','1 201 0'),'mm');const normalized41=mg.canonical(single);assert.equal(normalized41.volumes,2);assert.equal(normalized41.sourceVersion,'4.1');assert.equal(mg.parse(normalized41.msh,'m').elements.get(1001).type,5);assert.throws(()=>mg.canonical(noEntities));
const receipt={schema:'foamlens/native-gmsh-mesh/1',originalCaseModified:false,meshGenerated:true,generationExit:0,plannedCells:1,files:Object.fromEntries(Object.entries(cube).map(([k,v])=>['constant/polyMesh/'+k,v]))};assert.equal(ms.fromNativeReport(receipt).cells.length,1);assert.equal(ms.fromNativeReport({...receipt,schema:'foamlens/native-cartesian-mesh/1'}).faces.length,6);
for(const bad of [{generationExit:1},{plannedCells:2},{exportError:'limit'},{files:{}},{originalCaseModified:true}])assert.throws(()=>ms.fromNativeReport({...receipt,...bad}));
console.log('Native Gmsh normalization and generated snapshot gates PASS');
