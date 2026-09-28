'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const file=path.join(__dirname,'..','src','FoamLensDesktop','frontend','v13-thermal-analysis.js');
const js=fs.readFileSync(file,'utf8');
const begin='/* FOAMLENS_THERMAL_ANALYSIS_CORE_START */',end='/* FOAMLENS_THERMAL_ANALYSIS_CORE_END */';
const a=js.indexOf(begin),b=js.indexOf(end,a);
assert(a>=0&&b>a,'Thermal analysis core markers missing.');
const core=js.slice(a,b+end.length);
const api=new Function(core+'\nreturn {thPairs,thDerivative,thIntegral,thWeightedStats,thIntervals,thAnalyzeTemperature,thRoleStatement};')();

const near=(x,y,t=1e-10)=>Math.abs(x-y)<=t*Math.max(1,Math.abs(x),Math.abs(y));
const passed=[];function test(name,fn){fn();passed.push(name)}

test('temperature derivative uses physical time on nonuniform grid',()=>{
  const d=api.thDerivative([0,.2,1.2],[100,99.6,97.6]);
  assert(d.y.every(v=>near(v,-2)));
});

test('cooling and heating are separated by sign',()=>{
  const a=api.thAnalyzeTemperature([0,1,2,4],[100,98,99,95],1e-12);
  assert(a.coolingRate.some(v=>v>0));
  assert(a.heatingRate.some(v=>v>0));
  assert(a.coolingIntegral>0);
  assert(a.heatingIntegral>0);
});

test('thermal means are weighted by physical coordinate/time',()=>{
  const s=api.thWeightedStats([0,.01,.02,10],[0,.01,.02,10]);
  assert(near(s.mean,5,1e-12));
});

test('sensible enthalpy cannot be described as total energy',()=>{
  const x=api.thRoleStatement('sensibleEnthalpy');
  assert(/Sensible enthalpy contribution only/i.test(x));
  assert(/do not label it total energy/i.test(x));
});

test('latent heat remains a separate contribution',()=>{
  const x=api.thRoleStatement('latentHeat');
  assert(/Latent-heat contribution only/i.test(x));
  assert(/separate from sensible energy/i.test(x));
});

test('heat flux warns that it is not energy by itself',()=>{
  const x=api.thRoleStatement('heatFlux');
  assert(/not energy unless integrated over area and time/i.test(x));
});

test('boundary power keeps source sign convention explicit',()=>{
  assert(/Sign convention must come from the source/i.test(api.thRoleStatement('boundaryPower')));
});

test('UI exposes explicit thermal roles',()=>{
  for(const label of ['Temperature','Thermal gradient','Heat flux','Energy flux','Sensible enthalpy','Latent heat','Boundary / interface power','User defined'])assert(js.includes(label),'Missing thermal role '+label);
});

test('thermal module forbids recalescence and total-energy inference',()=>{
  assert(js.includes('noRecalescenceInference:true'));
  assert(js.includes('noTotalEnergyInference:true'));
});

test('active case and region context is respected',()=>{
  assert(js.includes('seriesMatchesGlobalContext'));
});

test('fixture names never enter Thermal Analysis',()=>{
  for(const banned of ['QuickCup','B3_reference','B6_adaptiveDt','C6_adaptiveDt'])assert(!js.includes(banned),'Fixture leaked into Thermal Analysis: '+banned);
});

console.log('General Thermal Analysis regression suite passed: '+passed.length+' checks.');
for(const name of passed)console.log('  ✓ '+name);
