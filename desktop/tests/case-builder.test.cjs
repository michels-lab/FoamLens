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
