'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const p=path.join(__dirname,'..','src','FoamLensDesktop','frontend','v24-physics-evidence-explorer.js');
const source=fs.readFileSync(p,'utf8');new Function(source);
const first=source.indexOf('/* FOAMLENS_PHYSICS_EXPLORER_CORE_START */'),last=source.indexOf('/* FOAMLENS_PHYSICS_EXPLORER_CORE_END */');
assert(first>=0&&last>first,'Science core must be testable separately from UI');
const api=new Function(source.slice(first,last)+
 ';return {descriptors:peDescriptors,validate:peValidate,assemble:peAssemble,finite:peFinite,unique:peUniqueSorted}')();
const records=[
 {name:'alphaL',time:0,region:'metal',sourcePath:'case/0/metal/alphaL',partition:'',size:300},
 {name:'alphaL',time:1,region:'metal',sourcePath:'case/1/metal/alphaL',partition:'',size:300},
 {name:'U',time:0,region:'metal',sourcePath:'case/0/metal/U',partition:'',size:300},
 {name:'U',time:1,region:'metal',sourcePath:'case/1/metal/U',partition:'',size:300},
 {name:'darcyForce',time:0,region:'metal',sourcePath:'case/0/metal/darcyForce',partition:''},
 {name:'T',time:0,region:'metal',sourcePath:'case/0/metal/T',partition:''},
 {name:'T',time:1,region:'metal',sourcePath:'case/1/metal/T',partition:''},
 {name:'T',time:1,region:'mold',sourcePath:'case/1/mold/T',partition:''}
];
const c={id:43,name:'General OpenFOAM Case',volumeFieldInventory:records,
 discoveryModel:{fields:[
   {name:'alphaL',region:'metal',kind:'scalar',dimensions:'[0 0 0 0 0 0 0]'},
   {name:'U',region:'metal',kind:'vector',dimensions:'[0 1 -1 0 0 0 0]'},
   {name:'darcyForce',region:'metal',kind:'vector',dimensions:'[0 1 -2 0 0 0 0]'},
   {name:'T',region:'metal',kind:'scalar',dimensions:'[0 0 0 1 0 0 0]'},
   {name:'T',region:'mold',kind:'scalar',dimensions:'[0 0 0 1 0 0 0]'}
 ]}};
const map={liquidFraction:'alphaL',temperature:'T',velocity:'U',darcyAcceleration:'darcyForce'};
const all=api.descriptors(c,'metal','field',map),phase=api.descriptors(c,'metal','phase',map),
 momentum=api.descriptors(c,'metal','momentum',map);
assert.deepStrictEqual(all.map(x=>x.name),['alphaL','darcyForce','T','U'].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})));
assert(phase.some(x=>x.name==='alphaL'));assert(phase.some(x=>x.name==='T'));
assert(!phase.some(x=>x.name==='U'));
assert(momentum.some(x=>x.name==='U'));assert(momentum.some(x=>x.name==='darcyForce'));
assert(!momentum.some(x=>x.name==='T'));
assert.deepStrictEqual(api.descriptors(c,'mold','field',map).map(x=>x.name),['T']);
const T=all.find(x=>x.name==='T'),U=all.find(x=>x.name==='U'),alpha=all.find(x=>x.name==='alphaL');
assert.equal(T.kinds[0],'scalar');assert.equal(T.dimensions[0],'[0 0 0 1 0 0 0]');
assert.deepStrictEqual(T.times,[0,1]);
assert(T.sources.includes('case/0/metal/T'));
const cfg={caseId:43,caseName:c.name,type:'phase',field:'T',region:'metal',
 component:'value',subset:'mushy',low:.05,high:.95,statistic:'median'};
assert(api.validate(cfg,T,alpha).ok);
assert(api.validate({...cfg,subset:'whole'},T,null).ok);
const fail=[
 [{...cfg,field:'U'},T,alpha,'field'],
 [{...cfg,component:'x'},T,alpha,'Scalar'],
 [{...cfg,low:.8,high:.3},T,alpha,'threshold'],
 [{...cfg,type:'fluid'},T,alpha,'analysis'],
 [{...cfg,statistic:'p100'},T,alpha,'statistic'],
 [{...cfg,subset:'mushy'},T,null,'alphaL'],
 [{...cfg,component:'value'},U,alpha,'field'],
 [{...cfg,field:'U',component:'value'},U,alpha,'Vector']
];
for(const [conf,desc,al,reason] of fail){const x=api.validate(conf,desc,al);assert(!x.ok,reason+' should be rejected')}
const alphaBroken={...alpha,dimensions:['[0 0 0 1 0 0 0]']};
assert(!api.validate(cfg,T,alphaBroken).ok,'Dimensioned phase scalar cannot serve as fraction');
const badKinds={...T,kinds:['scalar','vector']};assert(!api.validate(cfg,badKinds,alpha).ok);
function stats(vals,total){
  const s=vals.slice().sort((a,b)=>a-b),n=vals.length,quant=q=>{
    const t=(n-1)*q,lo=Math.floor(t),hi=Math.ceil(t);return s[lo]+(s[hi]-s[lo])*(t-lo)
  };
  return{count:n,mean:vals.reduce((a,b)=>a+b,0)/n,median:quant(.5),
    min:s[0],max:s.at(-1),p5:quant(.05),p25:quant(.25),p75:quant(.75),p95:quant(.95),
    std:0,fraction:total===null?NaN:n/total}
}
const obs=[
 {time:0,ok:true,values:[300,310,320,330],total:4,countKnown:true,
  sources:['case/0/metal/T'],issues:[]},
 {time:1,ok:true,values:[320,330,340,350],total:4,countKnown:true,
  sources:['case/1/metal/T'],issues:[]}
];
const r=api.assemble({...cfg,subset:'whole'},T,obs,stats);
assert(r.ok);assert.deepStrictEqual(r.rows.map(x=>x.value),[315,335]);
assert.equal(r.completion,'sourced-evidence');assert.equal(r.noExtrapolation,true);
assert.equal(r.sourceBacked,true);assert.equal(r.interpretation.status,'not-provided');
assert.deepStrictEqual(r.rows.map(x=>x.timeS),[0,1]);
assert.deepStrictEqual(r.rows[0].sources,['case/0/metal/T']);
assert.equal(r.rows[0].totalCells,4);
const incomplete=api.assemble({...cfg,subset:'whole'},T,[
 obs[0],{time:1,ok:false,reason:'source field missing'}],stats);
assert(incomplete.ok&&incomplete.completion==='partial-evidence');
assert.equal(incomplete.rows.length,1);
assert.equal(incomplete.excluded.length,1);
const invalidCell=api.assemble({...cfg,subset:'whole'},T,[
 obs[0],{...obs[1],values:[320,330,null,350]}],stats);
assert(invalidCell.ok&&invalidCell.excluded.length===1,'Incomplete measurements must not become zeros');
const unknownCount=api.assemble({...cfg,subset:'whole',statistic:'mean'},T,
 [{...obs[0],countKnown:false,total:null}],stats);
assert(unknownCount.ok);assert.equal(unknownCount.rows[0].totalCells,null);
assert.equal(unknownCount.rows[0].nCells,null);
const corrupt=api.assemble({...cfg,subset:'whole'},T,
 [{...obs[0],time:2}],stats);
assert(!corrupt.ok,'Unknown time cannot silently become a sampled time');
const duplicate=api.assemble({...cfg,subset:'whole'},T,[obs[0],obs[0]],stats);
assert(!duplicate.ok,'Repeated physical time is ambiguous');
assert(Number.isNaN(api.finite('')));
assert(Number.isNaN(api.finite(null)));
assert.deepStrictEqual(api.unique([2,'1',1,NaN,0]),[0,1,2]);
for(const token of ["id='pePanel'","id=\"peCase\"","id=\"peType\"","id=\"peRegion\"",
 'id="peField"','id="peComponent"','id="peStatistic"','id="pePlot"','id="peExport"',
 'pmLoadFieldSet(c.id','pmAlignedComponents(','pmFilterByPhase(',
 "noExtrapolation:true","noAutomaticPhysicsInference:true","window.FoamLensPhysicsEvidenceExplorer"])
 assert(source.includes(token),'Required source-backed UI/scientific control missing '+token);
for(const forbidden of ['QuickCup','B14','C14','thermalAlphaMetal'])
 assert(!source.includes(forbidden),'Thesis-specific field name leaked into general product '+forbidden);
console.log('Granada #156 PASS: real metadata, phase/momentum selection, region separation, physical-time provenance, strict cell count, unavailable samples and no fake conclusions.');
