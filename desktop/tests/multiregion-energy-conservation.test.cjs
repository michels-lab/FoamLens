'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const source=fs.readFileSync(path.join(__dirname,'..','src','FoamLensDesktop','frontend','v24-multiregion-energy.js'),'utf8');
new Function(source);
const start=source.indexOf('/* FOAMLENS_MULTIREGION_ENERGY_CORE_START */'),end=source.indexOf('/* FOAMLENS_MULTIREGION_ENERGY_CORE_END */');
assert(start>=0&&end>start,'Energy accounting core must be independently testable');
const lib=new Function(source.slice(start,end)+';return{eval:mecEvaluate,source:mecSource,unit:mecUnit,pairs:mecPhysicalPairs,dimensions:mecDimensions,grid:mecTimeGrid}')();
const near=(a,b,tol=1e-9)=>assert(Math.abs(a-b)<tol,'Expected '+a+' == '+b);
const dimJ='[1 2 -2 0 0 0 0]',dimW='[1 2 -3 0 0 0 0]';
const mk=(region,unit,t,y,extra={})=>({
 caseId:19,region,sourcePath:'postProcessing/'+region+'/energy/'+unit+'.dat',field:'energy',unit,
 dimensions:unit==='J'?dimJ:dimW,t,y,...extra
});
const agree={interfaceSameSurfaceAndNormals:true,storageIsComplete:true,otherTermsComplete:true};
const input=(opts={})=>({
 caseId:19,regions:[
  {name:'metal',inventory:mk('metal','J',[0,1,3],[100,96,88]),
    interfaceFlux:mk('metal','W',[0,1,3],[4,4,4]),interfaceOrientation:1,extras:[]},
  {name:'mold',inventory:mk('mold','J',[0,1,3],[50,54,62]),
    interfaceFlux:mk('mold','W',[0,1,3],[-4,-4,-4]),interfaceOrientation:1,extras:[]}
 ],attestations:agree,...opts
});
const valid=lib.eval(input());
assert(valid.valid,valid.reason);assert.equal(valid.status,'conditional-audit');
near(valid.regions[0].deltaInventory,-12);near(valid.regions[0].intInterface,12);
near(valid.regions[0].residual,0);near(valid.regions[1].residual,0);
near(valid.interface.rmsPowerMismatch,0);near(valid.interface.integratedMismatch,0);
near(valid.system.residual,0);assert.strictEqual(valid.interfaceValidated,false);
assert.strictEqual(valid.noExtrapolation,true);assert.strictEqual(valid.noCaseMutation,true);
assert(valid.regions[0].provenance[0].sourcePath.includes('postProcessing'));
assert.deepStrictEqual(valid.grid,[0,1,3]);
assert.strictEqual(valid.regions[0].dimensions[0],'compatible');

const nonuniform=input();
nonuniform.regions[1].interfaceFlux=mk('mold','kW',[0,.5,2,3],[-.004,-.004,-.004,-.004],{dimensions:dimW});
const sync=lib.eval(nonuniform);assert(sync.valid,sync.reason);
near(sync.interface.integratedMismatch,0);near(sync.regions[1].residual,0);
assert(sync.regions.some(x=>x.interpolatedSamples>0));
assert(sync.grid.every(x=>x>=0&&x<=3));

const boundary=input();
boundary.regions[0].inventory=mk('metal','J',[0,3],[100,82]);
boundary.regions[0].extras=[{kind:'boundaryOut',series:mk('metal','W',[0,3],[2,2],{sourcePath:'postProcessing/metal/boundary/other.dat'}),orientation:1}];
const bal=lib.eval(boundary);assert(bal.valid,bal.reason);
near(bal.regions[0].intBoundary,6);near(bal.regions[0].residual,0);near(bal.system.residual,0);
const supply=input();
supply.regions[1].inventory=mk('mold','J',[0,3],[50,68]);
supply.regions[1].extras=[{kind:'sourceIn',series:mk('mold','W',[0,3],[2,2],{sourcePath:'postProcessing/mold/source/other.dat'}),orientation:1}];
const sup=lib.eval(supply);assert(sup.valid,sup.reason);
near(sup.regions[1].intSources,6);near(sup.regions[1].residual,0);

const mismatch=input();
mismatch.regions[1].interfaceFlux.y=[-4,-3,-2];
const bad=lib.eval(mismatch);assert(bad.valid);
assert(bad.interface.rmsPowerMismatch>0);
assert(bad.interface.maxAbsPowerMismatch>0);
assert(bad.interface.integratedMismatch!==0);
assert(bad.regions[1].residual!==0);
const inverted=input();
inverted.regions[1].interfaceFlux.y=[4,4,4];
inverted.regions[1].interfaceOrientation=-1;
const rev=lib.eval(inverted);assert(rev.valid);near(rev.interface.integratedMismatch,0);
for(const key of Object.keys(agree)){
  const a=input({attestations:{...agree,[key]:false}});
  const v=lib.eval(a);assert.strictEqual(v.valid,false,'Missing attestation '+key);
  assert(v.missing.length>=1);assert.strictEqual(v.interfaceValidated,false);
}
const rejects=[
 {name:'wrong case',fn:x=>x.regions[0].inventory.caseId=999},
 {name:'wrong region',fn:x=>x.regions[0].inventory.region='other'},
 {name:'same region twice',fn:x=>x.regions[1].name='metal'},
 {name:'no interface flux',fn:x=>x.regions[1].interfaceFlux=null},
 {name:'unweighted specific energy',fn:x=>x.regions[0].inventory.unit='J/kg'},
 {name:'area flux not integrated',fn:x=>x.regions[0].interfaceFlux.unit='W/m2'},
 {name:'contradicting dimensions',fn:x=>x.regions[0].interfaceFlux.dimensions=dimJ},
 {name:'corrupt dimensions',fn:x=>x.regions[0].interfaceFlux.dimensions='[1 invalid]'},
 {name:'blank path',fn:x=>x.regions[0].inventory.sourcePath=''},
 {name:'duplicate source',fn:x=>x.regions[0].extras=[{kind:'boundaryOut',series:x.regions[0].interfaceFlux,orientation:1}]},
 {name:'derived input',fn:x=>x.regions[0].inventory.derived=true},
 {name:'ambiguous orientation',fn:x=>x.regions[1].interfaceOrientation=0},
 {name:'no shared time',fn:x=>x.regions[1].interfaceFlux.t=[5,8,9]},
 {name:'nulls cannot be zero',fn:x=>x.regions[0].interfaceFlux.y=[null,null,null]},
 {name:'unknown role',fn:x=>x.regions[0].extras=[{kind:'bad',series:mk('metal','W',[0,3],[2,2]),orientation:1}]}
];
for(const r of rejects){
 const x=input();r.fn(x);const v=lib.eval(x);
 assert(!v.valid,r.name+' unexpectedly accepted');assert(v.status==='not-evaluated',r.name)
}
const missingDims=input();
missingDims.regions[0].inventory.dimensions='';
const caution=lib.eval(missingDims);assert(caution.valid);
assert(caution.warnings.some(s=>s.includes('dimensional exponents missing')));
assert.strictEqual(lib.unit('kJ').factor,1000);
assert.strictEqual(lib.unit('MW').factor,1e6);
assert.strictEqual(lib.unit('W/m²'),null);
assert.strictEqual(lib.dimensions(dimW,'W'),'compatible');
assert.strictEqual(lib.dimensions(dimJ,'W'),'incompatible');
assert.strictEqual(lib.dimensions('','J'),'missing');
assert.deepStrictEqual(lib.pairs({t:[0,1,null,'',3],y:[0,'0',7,8,6]}),[[0,0],[1,0],[3,6]]);
for(const req of [
 "panel.id='mecPanel'","mecConfirmInterface","mecConfirmCoverage","mecConfirmStorage",
 
 "mecExportJson","mecExportCsv","eaCaseSeries","eaDescriptor",
 "mecInvalidate","interfaceValidated:false","noCaseMutation:true",
 "window.FoamLensMultiregionEnergy"
])assert(source.includes(req),'Missing executable UI/physical-provenance contract: '+req);
for(const banned of ['QuickCup','metalTop','metalMold','B14_','C14_'])
  assert(!source.includes(banned),'Fixture-specific implementation leaked: '+banned);
console.log('Granada #151 multi-region conservation PASS: nonuniform grid, interface cancellation, sources/boundaries, units, provenance, invalid/rejected cases and UI export.');
