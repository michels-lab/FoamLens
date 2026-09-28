'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const index=fs.readFileSync(path.join(__dirname,'..','src','FoamLensDesktop','frontend','index.html'),'utf8');

const start=index.indexOf('function pmParseDimensions(dim){');
const end=index.indexOf('function pmFieldDimensionInfo',start);
assert(start>=0&&end>start,'Dimension/unit core was not found.');
const core=index.slice(start,end);
const api=new Function(core+'\nreturn {pmParseDimensions,pmDimensionsString,pmDerivativeDimensions,pmUnitFromDimensions};')();

const passed=[];function test(name,fn){fn();passed.push(name)}

test('specific enthalpy dimensions map to J/kg',()=>{
  assert.strictEqual(api.pmUnitFromDimensions('[0 2 -2 0 0 0 0]'),'J/kg');
});

test('surface heat flux dimensions map to W/m²',()=>{
  assert.strictEqual(api.pmUnitFromDimensions('[1 0 -3 0 0 0 0]'),'W/m²');
});

test('thermal gradient dimensions map to K/m',()=>{
  assert.strictEqual(api.pmUnitFromDimensions('[0 -1 0 1 0 0 0]'),'K/m');
});

test('density gradient dimensions map to kg/m⁴',()=>{
  assert.strictEqual(api.pmUnitFromDimensions('[1 -4 0 0 0 0 0]'),'kg/m⁴');
});

test('kinematic viscosity dimensions map to m²/s',()=>{
  assert.strictEqual(api.pmUnitFromDimensions('[0 2 -1 0 0 0 0]'),'m²/s');
});

test('thermal conductivity dimensions map to W/(m·K)',()=>{
  assert.strictEqual(api.pmUnitFromDimensions('[1 1 -3 -1 0 0 0]'),'W/(m·K)');
});

test('unknown dimensions remain unlabeled',()=>{
  assert.strictEqual(api.pmUnitFromDimensions('[2 7 -4 3 0 0 0]'),'');
});

test('time derivative shifts OpenFOAM time exponent',()=>{
  assert.strictEqual(api.pmDerivativeDimensions('[0 0 0 1 0 0 0]'),'[0 0 -1 1 0 0 0]');
});

test('Data Catalog preserves raw dimensions and adds recognized unit',()=>{
  assert(index.includes('<th id="catalogColDimensions">Dimensions / SI unit</th>'));
  assert(index.includes("r.dimensions&&pmUnitFromDimensions(r.dimensions)?'<small>'+esc(pmUnitFromDimensions(r.dimensions))+'</small>':''"));
});

test('Data Catalog dimension header is bilingual',()=>{
  assert(index.includes("'Dimensiones / unidad SI':'Dimensions / SI unit'"));
});

console.log('Dimensions / SI unit regression suite passed: '+passed.length+' checks.');
for(const name of passed)console.log('  ✓ '+name);
