'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/FoamLensDesktop/frontend/v24-solidification-front-proxy.js'),'utf8');
const a=source.indexOf('/* FOAMLENS_FRONT_PROXY_CORE_START */'),b=source.indexOf('/* FOAMLENS_FRONT_PROXY_CORE_END */');
assert(a>=0&&b>a);
const api=new Function(source.slice(a,b)+';return{snapshot:pfSnapshot,evolution:pfEvolution,window:pfSourceTimeWindow};')();
const mesh={owners:[],neighbours:[]};
const geometry={ok:true,cells:1,cellVolumes:[1],totalVolumeM3:1,faceAreas:[],faceCentroids:[]};
const cfg=(role,time=0)=>({time,low:.05,high:.95,iso:.5,axis:'x',region:'metal',meshIdentity:7,
  dimensions:'[0 0 0 0 0 0 0]',role});
test('physically declared original alphaS converts exactly to alphaL',()=>{
 const a=api.snapshot(mesh,geometry,[.8],cfg('solidFraction'));
 const b=api.snapshot(mesh,geometry,[.2],cfg('liquidFraction'));
 assert.equal(a.ok,true);assert.equal(b.ok,true);
 assert(Math.abs(a.volumeWeightedLiquidFraction-.2)<1e-12);
 assert.deepStrictEqual(a.volumesM3,b.volumesM3);
 assert.deepStrictEqual(a.fractions,b.fractions);
 assert.equal(a.sourceRole,'solidFraction');
 assert.equal(a.normalization,'alphaL=1-alphaS');
});
test('no default role can infer physical meaning from OpenFOAM alpha1',()=>{
 for(const role of [undefined,null,'','alpha1','temperature','unverified']){
  const result=api.snapshot(mesh,geometry,[.2],cfg(role));
  assert.equal(result.ok,false);
  assert.match(result.reason,/role/i)
 }
});
test('invalid solid source fractions reject instead of clipping or inventing',()=>{
 for(const v of [null,undefined,NaN,-.01,1.01,Infinity]){
  assert.equal(api.snapshot(mesh,geometry,[v],cfg('solidFraction')).ok,false)
 }
 assert.equal(api.snapshot(mesh,geometry,[.2],{...cfg('solidFraction'),
   dimensions:'[0 0 0 1 0 0 0]'}).ok,false);
});
test('source role change forbids pretending apparent movement is comparable',()=>{
 const a=api.snapshot(mesh,geometry,[.2],cfg('liquidFraction',0));
 const b=api.snapshot(mesh,geometry,[.8],cfg('solidFraction',1));
 const r=api.evolution([a,b],[0,1]);
 assert.equal(r.ok,true);
 assert.equal(r.rows[1].velocityStatus,'not-comparable-geometry-or-region');
 assert.equal(r.rows[1].frontCentroidVelocityProxyMPerS,null);
});
test('explicit original time selection respects sorted distinct physical times',()=>{
 const w=api.window([9.8,0,'1.5',1.5,5,4,8],'1','4');
 assert.equal(w.ok,true);
 assert.deepStrictEqual(w.times,[1.5,4,5]);
 assert.equal(w.sourceTimesAvailable,6);
 assert.equal(w.explicitlyExcludedTimes,3);
 assert.equal(w.fromIndex,1);assert.equal(w.toExclusive,4);
});
test('120-frame window is bounded and never silently sampled',()=>{
 const values=Array.from({length:200},(_,i)=>i/10);
 assert.equal(api.window(values,0,120).ok,true);
 assert.equal(api.window(values,80,200).ok,true);
 for(const [from,to] of [[0,121],[-1,10],[0,201],[40,40],[100,99],[0,1.5],['abc',10]]){
  const w=api.window(values,from,to);
  assert.equal(w.ok,false,'Invalid index window accepted: '+[from,to]);
  assert.equal(w.times.length,0);
 }
});
test('bad physical time labels do not disappear silently',()=>{
 for(const times of [[0,NaN,1],[0,''],[null,1],[0,Infinity,1],[]]){
  assert.equal(api.window(times,0,1).ok,false);
 }
});
test('original source UI keeps role confirmation, time indices and export bound to calculation',()=>{
 for(const fragment of ['id="pfRole"','id="pfFrom"','id="pfTo"',
  'pfSourceTimeWindow(g.times,from,to,120)',
  "pfEl('pfConfirmAlpha').checked=false",
  'params.role!==b.role','pfNumber(params.from)!==b.fromIndex',
  'pfNumber(params.to)!==b.toExclusive','!params.phaseRoleConfirmed',
  "sourceSemanticEvidence:'user-confirmed'",
  "fieldRole:{originalRole:role",'alphaL=1-alphaS',
  'id="pfCancel"','automaticRecalescence:false']){
  assert(source.includes(fragment),'Missing source evidence contract '+fragment)
 }
 assert(!source.includes('Directory.GetFiles(AppRoot, "v*-*.js")'));
});
