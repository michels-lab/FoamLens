'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const file=path.join(__dirname,'..','src','FoamLensDesktop','frontend','v13-vector-fields.js');
const js=fs.readFileSync(file,'utf8');
const begin='/* FOAMLENS_VECTOR_DERIVED_CORE_START */',end='/* FOAMLENS_VECTOR_DERIVED_CORE_END */';
const a=js.indexOf(begin),b=js.indexOf(end,a);
assert(a>=0&&b>a,'Vector core markers missing.');
const core=js.slice(a,b+end.length);
const api=new Function(core+'\nreturn {vdComponentDescriptor,vdFinitePairs,vdSampleLinear,vdAlignCoordinates,vdMagnitude};')();

const near=(x,y,t=1e-10)=>Math.abs(x-y)<=t*Math.max(1,Math.abs(x),Math.abs(y));
const passed=[];function test(name,fn){fn();passed.push(name)}

test('component names are generic',()=>{
  assert.deepStrictEqual(api.vdComponentDescriptor('vorticity_x'),{base:'vorticity',component:'x'});
  assert.deepStrictEqual(api.vdComponentDescriptor('heatFlux.y'),{base:'heatFlux',component:'y'});
  assert.deepStrictEqual(api.vdComponentDescriptor('accelerationZ'),{base:'acceleration',component:'z'});
  assert.deepStrictEqual(api.vdComponentDescriptor('Ux'),{base:'U',component:'x'});
});

test('magnitude uses all components',()=>{
  const m=api.vdMagnitude([[3,0],[4,0],[0,5]]);
  assert(near(m[0],5)&&near(m[1],5));
});

test('coordinate alignment never uses array index',()=>{
  const a={t:[0,1,2],y:[0,10,20]},b={t:[0,.5,1,1.5,2],y:[0,5,10,15,20]},c={t:[0,2],y:[0,20]};
  const q=api.vdAlignCoordinates([a,b,c],100);
  assert(q.valid);
  const i=q.grid.findIndex(x=>near(x,1.5));
  assert(i>=0&&near(q.values[0][i],15)&&near(q.values[2][i],15));
});

test('alignment clips to shared coordinate range',()=>{
  const q=api.vdAlignCoordinates([{t:[0,1,2],y:[0,1,2]},{t:[1,2,3],y:[1,2,3]},{t:[.5,1.5,2.5],y:[1,2,3]}],100);
  assert(q.valid&&near(q.start,1)&&near(q.end,2));
  assert(q.grid.every(x=>x>=1-1e-12&&x<=2+1e-12));
});

test('incompatible ranges do not extrapolate',()=>{
  const q=api.vdAlignCoordinates([{t:[0,1],y:[0,1]},{t:[2,3],y:[2,3]},{t:[4,5],y:[4,5]}],100);
  assert.strictEqual(q.valid,false);
});

test('UI explicitly supports arbitrary compatible X/Y/Z groups',()=>{
  for(const token of ['Generic Vector Fields','Any compatible X/Y/Z field can be combined','noIndexAlignment:true','noExtrapolation:true'])assert(js.includes(token),'Missing '+token);
});

test('vector core contains no specific field allowlist',()=>{
  for(const banned of ['QuickCup','B3_reference','B6_adaptiveDt','C6_adaptiveDt','phaseChangeDarcyAcceleration'])assert(!core.includes(banned),'Specific fixture/field leaked into vector core: '+banned);
});

console.log('Generic vector-field regression suite passed: '+passed.length+' checks.');
for(const name of passed)console.log('  ✓ '+name);
