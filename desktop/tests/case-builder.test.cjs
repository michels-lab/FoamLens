'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const src=fs.readFileSync(path.join(__dirname,'../src/FoamLensDesktop/frontend/v25-case-builder.js'),'utf8');
new Function(src);
const a=src.indexOf('/* FOAMLENS_CASE_BUILDER_CORE_START */'),b=src.indexOf('/* FOAMLENS_CASE_BUILDER_CORE_END */');
const api=new Function(src.slice(a,b)+';return flCaseBuilder')();
const single={version:'13',mode:'single',endTime:'10',deltaT:'0.01',writeInterval:'1',regions:'metal|fluid|fluid',patches:'metal|wall1|wall\nmetal|frontBack|empty',fields:'metal|T|volScalarField|0 0 0 1 0 0 0|1600\nmetal|U|volVectorField|0 1 -1 0 0 0 0|0 0 0',boundaries:'metal|T|wall1|fixedValue|300\nmetal|T|frontBack|empty|-\nmetal|U|wall1|fixedValue|0 0 0\nmetal|U|frontBack|empty|-',materials:'metal|alloy|6820|700|25'};
const p=api.build(single),file=(p,n)=>p.entries.find(e=>e.name===n)?.data;
assert.match(file(p,'draft/system/controlDict'),/application foamRun;\nsolver fluid;/);
assert.match(file(p,'draft/0/T'),/dimensions \[0 0 0 1 0 0 0\];/);
assert.match(file(p,'draft/0/T'),/value uniform 300;/);
assert.match(file(p,'draft/0/U'),/internalField uniform \(0 0 0\);/);
assert.match(file(p,'draft/0/U'),/type empty;/);
assert.strictEqual(p.manifest.materials[0].density_kg_m3,6820);
assert.strictEqual(p.manifest.solverReady,false);assert.strictEqual(p.manifest.originalCaseModified,false);
assert.strictEqual(p.manifest.meshPatchInventoryVerified,false);assert.strictEqual(p.manifest.physicalModelValidated,false);
assert(!p.entries.some(e=>e.name.includes('physicalProperties')));
assert.deepStrictEqual(api.build(JSON.parse(file(p,'case-builder.json')).input),p);
const multi={...single,version:'14',mode:'multi',regions:single.regions+'\nmold|solid|solid',patches:single.patches+'\nmold|wall1|wall',fields:single.fields+'\nmold|T|volScalarField|0 0 0 1 0 0 0|300',boundaries:single.boundaries+'\nmold|T|wall1|zeroGradient|-'};
const m=api.build(multi);
assert.match(file(m,'draft/system/controlDict'),/application foamMultiRun;[\s\S]*metal fluid;[\s\S]*mold solid;/);
assert.match(file(m,'draft/0/metal/T'),/location "0\/metal";/);
assert.match(file(m,'draft/0/mold/T'),/internalField uniform 300;/);
assert(!file(m,'draft/0/T'));
const negatives=[
 {version:'2312'},{mode:'multi'},{endTime:'0'},{deltaT:'0x1'},{deltaT:'Infinity'},{deltaT:'11'},{writeInterval:'0'},
 {regions:'metal|fluid|fluid;system'},{regions:'CON|fluid|fluid'},{regions:'metal|bad|fluid'},
 {patches:single.patches+'\nmetal|WALL1|wall'},{patches:single.patches.replace('wall1','../escape')},
 {patches:single.patches.replace('wall','mappedWall')},{patches:single.patches.replace('metal','Metal')},
 {fields:single.fields.replace('1600','-1')},{fields:single.fields.replace('1 0 0 0|1600','0 0 0 0|1600')},
 {fields:single.fields.replace('0 0 0|','0 0|')},{fields:single.fields.replace('volVectorField','surfaceVectorField')},
 {boundaries:single.boundaries.split('\n').slice(0,3).join('\n')},
 {boundaries:single.boundaries+'\nmetal|T|wall1|zeroGradient|-'},
 {boundaries:single.boundaries.replace('empty|-','zeroGradient|-')},
 {boundaries:single.boundaries.replace('fixedValue|300','zeroGradient|300')},
 {boundaries:single.boundaries.replace('fixedValue|300','fixedValue|#include bad')},
 {materials:'metal|alloy|0|700|25'},{materials:'unknown|alloy|1|1|1'}
];
for(const bad of negatives)assert.throws(()=>api.build({...single,...bad}),JSON.stringify(bad));
assert.throws(()=>api.build({...multi,regions:multi.regions+'\nMETAL|solid|solid'}));
assert(src.includes("cgDownloadZip('FoamLens-case-draft.zip',cgStoreZip(current.entries))"));
assert(src.includes("if(token!==revision)return"));
console.log('Case Builder source: single/multi, scalar/vector, SI, complete BC coverage, safe paths, round-trip and '+(negatives.length+1)+' reject cases PASS');

function boundary(region,patch,nbr,other,faces=12){
 return '/* source boundary */\nFoamFile { format ascii; class polyBoundaryMesh; location "constant/'+region+'/polyMesh"; object boundary; }\n1\n(\n'+patch+' { type mappedWall; inGroups 1(wall); nFaces '+faces+'; startFace 100; neighbourRegion '+nbr+'; neighbourPatch '+other+'; }\n)';
}
const aText=boundary('metal','contactA','mold','contactB'),bText=boundary('mold','contactB','metal','contactA',15);
const cht={...multi,patches:'metal|contactA|mappedWall\nmold|contactB|mappedWall',fields:'metal|T|volScalarField|0 0 0 1 0 0 0|1600\nmold|T|volScalarField|0 0 0 1 0 0 0|300',boundaries:'metal|T|contactA|coupledTemperature|1600\nmold|T|contactB|coupledTemperature|300',boundarySources:[{region:'metal',text:aText},{region:'mold',text:bText}],materialTables:'metal|1000|7000|500|20\nmetal|1600|6800|700|30\nmold|300|2000|1000|1\nmold|900|1900|1300|2'};
const q=api.build(cht);
assert.strictEqual(q.manifest.thermalInterfaces.length,2);
assert.strictEqual(q.manifest.allDeclaredPatchInventoriesMatched,true);
assert.strictEqual(q.manifest.meshPatchInventoryVerified,false);
assert.strictEqual(q.manifest.thermalInterfaces[0].geometryVerified,false);
assert.strictEqual(q.manifest.thermalInterfaces[0].neighbourFaces,15);
assert.match(file(q,'draft/0/metal/T'),/type coupledTemperature;\n        value uniform 1600;/);
assert.match(file(q,'draft/0/mold/T'),/type coupledTemperature;\n        value uniform 300;/);
assert.strictEqual(file(q,'material-data/metal.csv'),'T_K,rho_kg_m3,Cp_J_kg_K,k_W_m_K\n1000,7000,500,20\n1600,6800,700,30\n');
assert.deepStrictEqual(api.materialAt(q.manifest.materialTables[0],1300),{T_K:1300,rho_kg_m3:6900,Cp_J_kg_K:600,k_W_m_K:25});
assert.strictEqual(api.materialAt(q.manifest.materialTables[0],1600).Cp_J_kg_K,700);
assert.deepStrictEqual(api.build(JSON.parse(file(q,'case-builder.json')).input),q);
for(const version of ['13','14'])assert.match(file(api.build({...cht,version}),'draft/0/metal/T'),/type coupledTemperature;/);
const badCht=[
 {boundarySources:[]},
 {boundarySources:cht.boundarySources.slice(0,1)},
 {boundarySources:[...cht.boundarySources,{region:'metal',text:aText}]},
 {boundarySources:[{region:'metal',text:aText.replace('constant/metal/','constant/mold/')},cht.boundarySources[1]]},
 {boundarySources:[{region:'metal',text:aText.replace('neighbourPatch contactB','neighbourPatch absent')},cht.boundarySources[1]]},
 {boundarySources:[{region:'metal',text:aText.replace('nFaces 12','nFaces 0')},cht.boundarySources[1]]},
 {boundarySources:[{region:'metal',text:aText.replace('format ascii','format binary')},cht.boundarySources[1]]},
 {boundarySources:[{region:'metal',text:aText.replace('startFace 100','startFace 100; startFace 100')},cht.boundarySources[1]]},
 {boundarySources:[{region:'metal',text:aText+'\n#include "bad"'},cht.boundarySources[1]]},
 {patches:cht.patches.replace('contactA','ContactA')},
 {patches:cht.patches.replace('mappedWall','wall')},
 {boundaries:cht.boundaries.replace('coupledTemperature|1600','fixedValue|1600')},
 {boundaries:cht.boundaries.replace('coupledTemperature|1600','coupledTemperature|-1')},
 {fields:cht.fields.replace('metal|T|','metal|P|'),boundaries:cht.boundaries.replace('metal|T|','metal|P|')},
 {materialTables:cht.materialTables.replace('1600|6800','1000|6800')},
 {materialTables:cht.materialTables.replace('500|20','0|20')},
 {materialTables:'metal|1000|7000|500|20'},
 {materialTables:cht.materialTables.replace('metal','unknown')}
];
for(const bad of badCht)assert.throws(()=>api.build({...cht,...bad}),JSON.stringify(bad));
for(const t of [999,1601,NaN])assert.throws(()=>api.materialAt(q.manifest.materialTables[0],t));
const simple='FoamFile { format ascii; class polyBoundaryMesh; object boundary; } 2 ( a { type wall; nFaces 4; startFace 20; } b { type patch; nFaces 2; startFace 24; } )';
assert.strictEqual(api.parseBoundary(simple,'metal','single').patches.length,2);
assert.throws(()=>api.parseBoundary(simple.replace('startFace 24','startFace 25'),'metal','single'));
console.log('Case Builder thermal extension: actual-source parser, reciprocal mappings, SI table preview, round trip and '+(badCht.length+4)+' negative fixtures PASS');
