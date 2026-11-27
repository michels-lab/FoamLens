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

const phase={...nc,phaseModels:'metal|phaseChangeSource|-|1400|1500|0.3|200000|6800|0.0001|100000|0.001|0.9|thermo|-|0 -9.81 0'};
for(const version of ['13','14']){
 const z=api.build({...phase,version}),d=file(z,'draft/constant/fvModels'),m=z.manifest.physics.phaseModels[0];
 assert.match(d,/type solidificationMelting;/);assert.match(d,/cellZone all;/);assert.match(d,/Tsol 1400;/);assert.match(d,/Tliq 1500;/);assert.match(d,/alpha1e 0.3;/);assert.match(d,/L 200000;/);assert.match(d,/g \(0 -9.81 0\);/);
 assert.strictEqual(m.phaseField,'phaseChangeSource:alpha1');assert.strictEqual(m.nativeExecutionVerified,false);
 assert.strictEqual(api.phasePreview(m,1399).alphaLiquid,0);assert.strictEqual(api.phasePreview(m,1500).alphaLiquid,1);
 assert.deepStrictEqual(api.phasePreview(m,1400).range,[0,0.3]);assert.strictEqual(api.phasePreview(m,1400).alphaLiquid,null);
 assert(Math.abs(api.phasePreview(m,1450).alphaLiquid-0.65)<1e-12);
 assert.deepStrictEqual(api.build(JSON.parse(file(z,'case-builder.json')).input),z);
 const sh=file(z,'execution/prepare-run.sh');assert(sh.includes('[[ "$WM_PROJECT_VERSION" == '+version+' ]]'));assert(sh.includes('cp -a -- "$src/0" "$src/constant" "$src/system" "$caseDir/"'));assert(sh.includes('[[ "$2" == --run ]]'));assert(sh.includes('foamRun -case "$caseDir"'));assert(!sh.includes('rm -rf'));assert(z.manifest.execution.requiredFiles.includes('constant/fvModels'));assert.strictEqual(z.manifest.execution.runtimeVerified,false);
}
const lookup=api.build({...phase,regions:'metal|fluid|incompressibleFluid',phaseModels:phase.phaseModels.replace('|thermo|-|','|lookup|700|').replace('|-|1400','|casting|1400')});
assert.match(file(lookup,'draft/constant/fvModels'),/Cp CpRef;\n    CpRef 700;/);
assert(lookup.manifest.execution.requiredFiles.includes('constant/polyMesh/cellZones'));
const iso=api.build({...phase,phaseModels:phase.phaseModels.replace('1400|1500|0.3','1400|1400|0')});
assert.deepStrictEqual(api.phasePreview(iso.manifest.physics.phaseModels[0],1400).range,[0,1]);
const badPhase=[
 {phaseModels:phase.phaseModels.replace('1400|1500','1501|1500')},{phaseModels:phase.phaseModels.replace('|0.3|','|1|')},
 {phaseModels:phase.phaseModels.replace('1500|0.3','1400|0.3')},{phaseModels:phase.phaseModels.replace('|200000|','|0|')},
 {phaseModels:phase.phaseModels.replace('|6800|','|-1|')},{phaseModels:phase.phaseModels.replace('|0.001|','|0|')},
 {phaseModels:phase.phaseModels.replace('|0.9|','|1.1|')},{phaseModels:phase.phaseModels.replace('|thermo|-|','|lookup|-|')},
 {phaseModels:phase.phaseModels.replace('|thermo|-|','|thermo|700|')},{phaseModels:phase.phaseModels.replace('0 -9.81 0','0 -9.81')},
 {phaseModels:phase.phaseModels.replace('phaseChangeSource','bad;foo')},{phaseModels:phase.phaseModels+'\n'+phase.phaseModels},
 {regions:'metal|solid|solid'}
];
for(const bad of badPhase)assert.throws(()=>api.build({...phase,...bad}));
assert.throws(()=>api.phasePreview(iso.manifest.physics.phaseModels[0],NaN));
const thermal14=api.build({...cht,version:'14',contactResistance:'metal|contactA|h|500|-\nmold|contactB|h|1000|-'});
assert.match(file(thermal14,'draft/0/metal/T'),/h uniform 500;/);
assert.strictEqual(thermal14.manifest.physics.contactResistance[0].resistance_m2K_W,0.002);
const thermal13=api.build({...cht,version:'13',contactResistance:'metal|contactA|layers|0.01 0.02|10 20\nmold|contactB|layers|0.01|10'});
assert.match(file(thermal13,'draft/0/metal/T'),/thicknessLayers \(0.01 0.02\);/);
assert.match(file(thermal13,'draft/0/metal/T'),/kappaLayers \(10 20\);/);
assert.strictEqual(thermal13.manifest.physics.contactResistance[0].equivalentH_W_m2K,500);
for(const v of ['metal|contactA|h|500|-','metal|contactA|h|0|-\nmold|contactB|h|1000|-','metal|contactA|layers|0.01|10\nmold|contactB|layers|0.01|10','metal|unknown|h|500|-\nmold|contactB|h|1000|-'])assert.throws(()=>api.build({...cht,contactResistance:v}));
assert.throws(()=>api.build({...cht,version:'13',contactResistance:'metal|contactA|layers|0.01 0.02|10\nmold|contactB|layers|0.01|10'}));
assert.match(file(thermal14,'execution/prepare-run.sh'),/for region in 'metal' 'mold'; do run_mesh/);
assert(thermal14.manifest.execution.requiredFiles.includes('constant/mold/polyMesh/boundary'));
const log=api.inspectRunLog('Time = 0.1\nSolving for fluid region metal\nGAMG: Solving for p_rgh, Initial residual = 0.97, Final residual = 0.02, No Iterations 4\nCourant Number mean: 0.1 max: 0.5\ndeltaT = 0.001\nTime = 0.2\nSolving for solid region mold\nPCG: Solving for e, Initial residual = 0.1, Final residual = 1e-7, No Iterations 3\nEnd\nFOAM FATAL ERROR\nFinal residual = nan\n');
assert.strictEqual(log.lastTime,0.2);assert.strictEqual(log.lastDeltaT,0.001);assert.strictEqual(log.timeSteps,2);assert.strictEqual(log.residualRows[1].region,'mold');assert.strictEqual(log.residualRows[0].initial,0.97);assert.strictEqual(log.courantRows[0].max,0.5);assert.strictEqual(log.fatalMarkers,1);assert.strictEqual(log.nonfiniteMarkers,1);assert.strictEqual(log.normalEndMarkers,1);assert.strictEqual(log.runSuccessVerified,false);
assert.throws(()=>api.inspectRunLog('x'.repeat(8*1024*1024+1)));
console.log('Physical/execution drafts: solidification, both contact versions, isolated script and local log evidence PASS');

// Linux CI: exercise the exact generated shell program against mock OpenFOAM
// commands. This tests isolation and control flow, not native CFD.
if(typeof process!=='undefined'&&process.platform==='linux'){
 const os=require('os'),cp=require('child_process'),crypto=require('crypto');
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'foamlens-cb-test-')),owned=[];
 try{
  const caseDir=path.join(tmp,'trusted case'),bin=path.join(tmp,'bin');
  fs.mkdirSync(bin,{recursive:true});
  const p=api.build({...phase,version:'14'}),script=path.join(tmp,'prepare-run.sh');
  fs.writeFileSync(script,file(p,'execution/prepare-run.sh'));
  for(const rel of p.manifest.execution.requiredFiles){const dest=path.join(caseDir,rel);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,'original fixture\n')}
  const digest=()=>crypto.createHash('sha256').update(p.manifest.execution.requiredFiles.map(rel=>fs.readFileSync(path.join(caseDir,rel),'utf8')).join('\n')).digest('hex');
  const before=digest();
  const mock=(name,body)=>fs.writeFileSync(path.join(bin,name),'#!/usr/bin/env bash\nset -e\n'+body+'\n',{mode:0o700});
  mock('foamDictionary','if [[ "$*" == *"-entry application"* ]]; then echo foamRun; fi');
  mock('checkMesh','echo "Mesh OK."');
  mock('foamRun','printf "changed in isolated case\\n" > 0/T; echo "Time = 1"; echo End');
  const env={...process.env,WM_PROJECT_VERSION:'14',PATH:bin+':'+process.env.PATH};
  const syntax=cp.spawnSync('bash',['-n',script],{encoding:'utf8'});assert.strictEqual(syntax.status,0,syntax.stderr);
  const execute=(args,extra={})=>{
   const r=cp.spawnSync('bash',[script,...args],{encoding:'utf8',env:{...env,...extra},timeout:10000});
   const m=/Isolated case: (\/tmp\/foamlens-run\.[A-Za-z0-9]+)\/case/.exec(r.stdout||'');if(m)owned.push(m[1]);return {r,work:m?.[1]}
  };
  const check=execute([caseDir,'--check']);assert.strictEqual(check.r.status,0,check.r.stderr);assert(!fs.existsSync(path.join(check.work,'logs','solver.log')));assert.strictEqual(digest(),before);
  const run=execute([caseDir,'--run']);assert.strictEqual(run.r.status,0,run.r.stderr);assert.match(fs.readFileSync(path.join(run.work,'case','0','T'),'utf8'),/changed in isolated case/);assert.strictEqual(digest(),before);
  assert.strictEqual(fs.readFileSync(path.join(run.work,'logs','pipeline-exit-code.txt'),'utf8').trim(),'0');
  assert.notStrictEqual(execute([caseDir,'--run'],{WM_PROJECT_VERSION:'13'}).r.status,0);
  mock('checkMesh','echo "failed mesh"; exit 0');
  const reject=execute([caseDir,'--run']);assert.notStrictEqual(reject.r.status,0);assert(!fs.existsSync(path.join(reject.work,'logs','solver.log')));
  mock('checkMesh','echo "Mesh OK."');mock('foamRun','exit 7');
  const failed=execute([caseDir,'--run']);assert.strictEqual(failed.r.status,7);
  fs.symlinkSync(path.join(caseDir,'0','T'),path.join(caseDir,'0','linked'));
  assert.notStrictEqual(execute([caseDir,'--run']).r.status,0);
  assert.strictEqual(digest(),before);
  console.log('Exact generated Bash helper: mock Linux syntax, isolated check/run, failure and symlink rejection PASS');
 }finally{
  for(const d of owned)fs.rmSync(d,{recursive:true,force:true});
  fs.rmSync(tmp,{recursive:true,force:true})
 }
}

const fluid={...phase,materials:'',fluidProperties:'metal|6800|700|0.006|0.2|55|0'};
for(const version of ['13','14']){
 const z=api.build({...fluid,version}),d=file(z,'draft/constant/physicalProperties');
 assert.match(d,/type heRhoThermo;/);assert.match(d,/thermo hConst;/);assert.match(d,/energy sensibleEnthalpy;/);
 assert.match(d,/mu 0.006; Pr 0.2;/);assert.match(file(z,'draft/constant/momentumTransport'),/simulationType laminar;/);
 assert(Math.abs(z.manifest.nativeConstantFluidDrafts[0].impliedK_W_m_K-21)<1e-10);
 assert(z.manifest.execution.requiredFiles.includes('constant/momentumTransport'));assert.strictEqual(z.manifest.solverReady,false)
}
for(const bad of [{fluidProperties:'metal|6800|700|0|0.2|55|0'},{fluidProperties:'metal|6800|700|0.006|0|55|0'},{regions:'metal|fluid|incompressibleFluid'},{materials:'metal|alloy|6800|700|50'},{materialTables:'metal|1000|6800|700|21\nmetal|1500|6700|750|22'}])assert.throws(()=>api.build({...fluid,...bad}));
const residual=(t,region,v)=>'Time = '+t+'\n'+(region?'Solving for fluid region '+region+'\n':'')+'GAMG: Solving for p_rgh, Initial residual = '+v+', Final residual = 0.001, No Iterations 4\n';
const aa=api.inspectRunLog(residual(1,'metal',0.8)+residual(1,'metal',0.5)+residual(2,'metal',0.2)+residual(3,null,0.7));
const bb=api.inspectRunLog(residual(1,'metal',0.4)+residual(3,'metal',0.1));
const cmp=api.compareRunLogs(aa,bb,{region:'metal',field:'p_rgh',metric:'initial'});
assert.strictEqual(cmp.matched,1);assert.strictEqual(cmp.onlyA,1);assert.strictEqual(cmp.onlyB,1);
assert.strictEqual(cmp.duplicateTimesA,1);assert.strictEqual(cmp.rows[0].A,0.5);assert.strictEqual(cmp.rows[0].B,0.4);
assert.strictEqual(cmp.rows[1].B,null);assert.strictEqual(cmp.rows[2].A,null);assert.strictEqual(cmp.rows[2].delta_B_minus_A,null);
assert.strictEqual(cmp.physicalEquivalenceVerified,false);assert.match(api.comparisonCsv(cmp),/2,0.2,,\n3,,0.1,/);
assert.strictEqual(api.residualSelections(aa,bb).length,2);
assert.throws(()=>api.compareRunLogs(api.inspectRunLog(residual(2,'metal',0.5)+residual(1,'metal',0.1)),bb,{region:'metal',field:'p_rgh',metric:'initial'}));
assert.throws(()=>api.compareRunLogs({...aa,truncated:true},bb,{region:'metal',field:'p_rgh',metric:'initial'}));
assert.throws(()=>api.compareRunLogs(aa,bb,{region:'metal',field:'p_rgh',metric:'unknown'}));
console.log('Constant fluid native draft and A/B source-preserving comparison PASS');
