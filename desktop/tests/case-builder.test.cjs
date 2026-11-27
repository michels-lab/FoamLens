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

const solid={...single,regions:'mold|solid|solid',patches:'mold|wall1|wall',fields:'mold|T|volScalarField|0 0 0 1 0 0 0|300',boundaries:'mold|T|wall1|zeroGradient|-',materials:'',solidProperties:'mold|2000|1000|1|50|0'};
for(const version of ['13','14']){
 const out=api.build({...solid,version}),d=file(out,'draft/constant/physicalProperties');
 assert.match(d,/type heSolidThermo;/);assert.match(d,/transport constIsoSolid;/);
 assert.match(d,/thermo eConst;/);assert.match(d,/energy sensibleInternalEnergy;/);
 assert.match(d,/Cv 1000;/);assert(!/\bCp\b/.test(d));
 assert.strictEqual(out.manifest.nativeConstantSolidDrafts[0].nativeExecutionVerified,false);
}
const mixed=api.build({...cht,materialTables:cht.materialTables.split('\n').filter(x=>x.startsWith('metal')).join('\n'),solidProperties:'mold|2000|1000|1|50|-10'});
assert.match(file(mixed,'draft/constant/mold/physicalProperties'),/hf -10;/);
assert(!file(mixed,'draft/constant/metal/physicalProperties'));
const badSolid=[
 {...solid,solidProperties:'mold|2000|0|1|50|0'},
 {...solid,solidProperties:'mold|2000|1000|1|0|0'},
 {...solid,solidProperties:'mold|2000|1000|1|50|#include'},
 {...solid,regions:'mold|fluid|fluid'},
 {...solid,regions:'mold|solid|fluid'},
 {...solid,materialTables:'mold|300|2000|1000|1\nmold|400|1900|1100|2'},
 {...solid,materials:'mold|sand|1900|1000|1'},
 {...solid,solidProperties:solid.solidProperties+'\n'+solid.solidProperties}
];
for(const bad of badSolid)assert.throws(()=>api.build(bad));
console.log('Constant solid physicalProperties template: both versions, region paths, explicit Cv, conflict rejection and 8 negatives PASS');

const nc={...single,schemes:'metal|Euler|Gauss linear|Gauss linear corrected|linear|corrected',divSchemes:'metal|div(phi,U)|Gauss upwind\nmetal|div(((rho*nuEff)*dev2(T(grad(U)))))|Gauss linear',linearSolvers:'metal|p_rgh|GAMG|symGaussSeidel|1e-7|0.01|0\nmetal|U|PBiCGStab|DILU|1e-7|0.1|0\nmetal|rho|diagonal|-|-|-|-',pimple:'metal|5|2|1|yes',relaxation:'metal|equations|U|0.7',residualControl:'metal|p_rgh|1e-6|0',adaptiveTime:'on',maxCo:'0.5',maxDeltaT:'0.1'};
for(const version of ['13','14']){
 const n=api.build({...nc,version}),fs=file(n,'draft/system/fvSchemes'),sol=file(n,'draft/system/fvSolution'),ctrl=file(n,'draft/system/controlDict');
 assert.match(fs,/default Euler;/);assert.match(fs,/div\(phi,U\) Gauss upwind;/);assert.match(fs,/default none;/);
 assert.match(sol,/p_rghFinal\s*\{[\s\S]*?relTol 0;/);assert.match(sol,/preconditioner DILU;/);assert.match(sol,/rhoFinal\s*\{\s*solver diagonal;\s*\}/);
 assert.match(sol,/nOuterCorrectors 5;/);assert.match(sol,/nCorrectors 2;/);assert.match(sol,/outerCorrectorResidualControl/);assert.match(sol,/U 0.7;/);
 assert.match(ctrl,/adjustTimeStep yes;\nmaxCo 0.5;\nmaxDeltaT 0.1;/);assert.match(ctrl,/writeControl adjustableRunTime;/);
 assert.strictEqual(n.manifest.numerics.nativeExecutionVerified,false);assert.strictEqual(n.manifest.solverReady,false);
 assert.deepStrictEqual(api.build(JSON.parse(file(n,'case-builder.json')).input),n);
}
const nm={...multi,schemes:nc.schemes+'\nmold|backward|Gauss linear|Gauss linear corrected|linear|corrected',divSchemes:nc.divSchemes,linearSolvers:nc.linearSolvers+'\nmold|e|PCG|DIC|1e-8|0.1|0',pimple:'@global|7|-|-|-\nmetal|-|3|2|yes\nmold|-|-|1|-',relaxation:nc.relaxation,residualControl:nc.residualControl};
const nn=api.build(nm);
assert.match(file(nn,'draft/system/fvSolution'),/nOuterCorrectors 7;/);
assert.match(file(nn,'draft/system/metal/fvSolution'),/nCorrectors 3;/);
assert.match(file(nn,'draft/system/mold/fvSolution'),/nNonOrthogonalCorrectors 1;/);
assert(!file(nn,'draft/system/mold/fvSolution').includes('momentumPredictor'));
assert.match(file(nn,'draft/system/mold/fvSolution'),/eFinal/);
assert(!file(nn,'draft/system/metal/fvSolution').includes('nOuterCorrectors'));
assert(!file(nn,'draft/system/fvSchemes'));
assert(!file(p,'draft/system/fvSolution'));
const badNumerics=[
 {schemes:''},{pimple:''},{linearSolvers:''},{schemes:nc.schemes.replace('Euler','Euler; #include bad')},
 {schemes:nc.schemes.replace('Euler','steadyState')},{divSchemes:'metal|div(phi,U));|Gauss linear'},
 {divSchemes:'metal|div(phi,U)|Gauss unknown'},{divSchemes:nc.divSchemes+'\nmetal|div(phi,U)|Gauss linear'},
 {linearSolvers:nc.linearSolvers.replace('GAMG|symGaussSeidel','PCG|DILU')},
 {linearSolvers:nc.linearSolvers.replace('1e-7','0')},{linearSolvers:nc.linearSolvers.replace('0.01','1.1')},
 {linearSolvers:nc.linearSolvers.replace('rho|diagonal|-|-|-|-','rho|diagonal|-|1e-5|-|-')},
 {linearSolvers:nc.linearSolvers.replace('p_rgh|GAMG','p_rghFinal|GAMG')},
 {linearSolvers:nc.linearSolvers.replace('p_rgh|GAMG','p_rghFINAL|GAMG')},
 {pimple:'metal|0|2|1|yes'},{pimple:'metal|5|2.5|1|yes'},{pimple:'metal|5|2|-1|yes'},
 {relaxation:'metal|equations|u|0.7'},{relaxation:'metal|equations|U|0'},
 {residualControl:'metal|rho|1e-6|0'},{residualControl:'metal|unknown|1e-6|0'},
 {maxCo:'0'},{maxDeltaT:'0.001'},{maxDeltaT:'11'},{adaptiveTime:'off'}
];
for(const bad of badNumerics)assert.throws(()=>api.build({...nc,...bad}),JSON.stringify(bad));
for(const bad of [{pimple:nm.pimple.replace('@global|7|-|-|-\n','')},{pimple:nm.pimple.replace('mold|-|-|1|-','mold|-|2|1|yes')},{pimple:nm.pimple.replace('metal|-|3','metal|4|3')},{schemes:nc.schemes}])assert.throws(()=>api.build({...nm,...bad}));
console.log('Numerical configuration: Foundation 13/14, regional solvers/schemes, PIMPLE, adaptive time and '+(badNumerics.length+4)+' negative fixtures PASS');
