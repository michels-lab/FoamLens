'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const file=path.join(__dirname,'..','src','FoamLensDesktop','frontend','v13-field-mapping.js');
const js=fs.readFileSync(file,'utf8');
const begin='/* FOAMLENS_FIELD_MAPPING_EXTENSION_CORE_START */',end='/* FOAMLENS_FIELD_MAPPING_EXTENSION_CORE_END */';
const a=js.indexOf(begin),b=js.indexOf(end,a);
assert(a>=0&&b>a,'Field Mapping extension core markers missing.');
const core=js.slice(a,b+end.length);
const api=new Function(core+'\nreturn {FM_EXTRA_ROLES,fmNormDimensions,fmDimensionCompatibility,fmNameScore,fmSuggestMappingsWithMetadata,fmRegionKey,fmMappingStorageKey,fmFilterDescriptorsByRegion};')();

const passed=[];function test(name,fn){fn();passed.push(name)}

test('all requested additional roles exist',()=>{
  const keys=api.FM_EXTRA_ROLES.map(r=>r.key);
  for(const key of ['enthalpy','courant','vorticity','thermalGradient','densityGradient'])assert(keys.includes(key),'Missing '+key);
});

test('name suggestions cover common OpenFOAM diagnostics',()=>{
  const roles=api.FM_EXTRA_ROLES;
  const d=[
    {name:'sensibleEnthalpy',dimensions:'[0 2 -2 0 0 0 0]'},
    {name:'CoCell',dimensions:'[0 0 0 0 0 0 0]'},
    {name:'vorticity',dimensions:'[0 0 -1 0 0 0 0]'},
    {name:'magGradT',dimensions:'[0 -1 0 1 0 0 0]'},
    {name:'gradRho',dimensions:'[1 -4 0 0 0 0 0]'}
  ];
  const m=api.fmSuggestMappingsWithMetadata(d,roles);
  assert.strictEqual(m.enthalpy,'sensibleEnthalpy');
  assert.strictEqual(m.courant,'CoCell');
  assert.strictEqual(m.vorticity,'vorticity');
  assert.strictEqual(m.thermalGradient,'magGradT');
  assert.strictEqual(m.densityGradient,'gradRho');
});

test('distinctive dimensions can support a suggestion',()=>{
  const roles=[
    {key:'temperature',patterns:[]},
    {key:'velocity',patterns:[]},
    {key:'density',patterns:[]},
    {key:'vorticity',patterns:[]},
    {key:'thermalGradient',patterns:[]},
    {key:'densityGradient',patterns:[]},
    {key:'userDefined',patterns:[]}
  ];
  const d=[
    {name:'fieldA',dimensions:'[0 0 0 1 0 0 0]'},
    {name:'fieldB',dimensions:'[0 1 -1 0 0 0 0]'},
    {name:'fieldC',dimensions:'[1 -3 0 0 0 0 0]'},
    {name:'fieldD',dimensions:'[0 0 -1 0 0 0 0]'},
    {name:'fieldE',dimensions:'[0 -1 0 1 0 0 0]'},
    {name:'fieldF',dimensions:'[1 -4 0 0 0 0 0]'}
  ];
  const m=api.fmSuggestMappingsWithMetadata(d,roles);
  assert.strictEqual(m.temperature,'fieldA');
  assert.strictEqual(m.velocity,'fieldB');
  assert.strictEqual(m.density,'fieldC');
  assert.strictEqual(m.vorticity,'fieldD');
  assert.strictEqual(m.thermalGradient,'fieldE');
  assert.strictEqual(m.densityGradient,'fieldF');
});

test('ambiguous dimensionless fields are not guessed as Courant',()=>{
  const m=api.fmSuggestMappingsWithMetadata([{name:'mystery',dimensions:'[0 0 0 0 0 0 0]'}],api.FM_EXTRA_ROLES);
  assert.strictEqual(m.courant,'');
});

test('enthalpy is name-driven because dimensions can overlap pressure-like quantities',()=>{
  const m=api.fmSuggestMappingsWithMetadata([{name:'mysteryEnergy',dimensions:'[0 2 -2 0 0 0 0]'}],api.FM_EXTRA_ROLES);
  assert.strictEqual(m.enthalpy,'');
});

test('mapping storage keys separate named regions',()=>{
  assert.strictEqual(api.fmMappingStorageKey('CaseA',''),'CaseA');
  assert.strictEqual(api.fmMappingStorageKey('CaseA','fluid'),'CaseA::region=fluid');
  assert.notStrictEqual(api.fmMappingStorageKey('CaseA','fluid'),api.fmMappingStorageKey('CaseA','solid'));
});

test('mapping descriptors can be filtered by region',()=>{
  const d=[{name:'T',region:'fluid'},{name:'T',region:'solid'},{name:'U',region:'fluid'}];
  assert.deepStrictEqual(api.fmFilterDescriptorsByRegion(d,'fluid').map(x=>x.name),['T','U']);
  assert.strictEqual(api.fmFilterDescriptorsByRegion(d,'solid').length,1);
});

test('region-aware mapping UI is explicit',()=>{
  for(const token of [
    'fmMappingRegion',
    'fmMappingForRegion',
    'fmSelectedAnalysisRegion',
    "active.closest?.('#pmMappingRows')",
    'Not enough compatible roles are mapped for this region yet.'
  ]) assert(js.includes(token),'Missing region-aware mapping token '+token);
});

test('capabilities are evaluated for the selected region',()=>{
  assert(js.includes('pmCaseCapabilities=function(c)'));
  assert(js.includes('pmUniqueFieldNames(c,region)'));
  assert(js.includes('pmCapabilitiesFromMapping(m,names)'));
  assert(js.includes('regional metadata'));
});

test('regional mapping keys remain workspace-persistable',()=>{
  const index=fs.readFileSync(path.join(__dirname,'..','src','FoamLensDesktop','frontend','index.html'),'utf8');
  assert(index.includes('mappings:[...pmFieldMappings.entries()]'));
  assert(index.includes('for(const [k,v] of x.mappings||[])pmFieldMappings.set(k,v||{})'));
});

test('extension mutates the existing generic mapping UI rather than creating project-specific mapping',()=>{
  assert(js.includes('PM_ROLE_DEFS.splice'));
  assert(js.includes('pmMappingForCase=function(c,regionOverride)'));
  assert(js.includes('pmRenderMapping'));
});

test('extension core is fixture agnostic',()=>{
  for(const banned of ['QuickCup','B3_reference','B6_adaptiveDt','C6_adaptiveDt','metal'])assert(!core.includes(banned),'Fixture leaked into mapping core: '+banned);
});

console.log('Expanded Field Mapping regression suite passed: '+passed.length+' checks.');
for(const name of passed)console.log('  ✓ '+name);
