'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const frontend = path.join(__dirname, '..', 'src', 'FoamLensDesktop', 'frontend', 'index.html');
const html = fs.readFileSync(frontend, 'utf8');
const begin = '/* FOAMLENS_DISCOVERY_MODEL_CORE_START */';
const end = '/* FOAMLENS_DISCOVERY_MODEL_CORE_END */';
const a = html.indexOf(begin);
const b = html.indexOf(end, a);
assert(a >= 0 && b > a, 'General discovery core markers are missing.');

const core = html.slice(a, b + end.length);
const api = new Function(core + '\nreturn {' +
  'flNormPath,flTimeSegment,flFieldKindFromClass,flFieldStorageFromClass,flBoundarySummary,flParseFoamFieldHeader,' +
  'flVolumeFieldDescriptorFromPath,flDictionaryDescriptorFromPath,flLogDescriptorFromPath,flPostProcessingDescriptorFromPath,' +
  'flClassifyPostProcessingSample,flBuildCaseDiscoveryModel};')();

const passed = [];
function test(name, fn) { fn(); passed.push(name); }
function fake(p, size = 100) { return {webkitRelativePath:p,name:p.split('/').at(-1),size}; }

test('generic scalar/vector/tensor class discovery', () => {
  assert.strictEqual(api.flFieldKindFromClass('volScalarField'),'scalar');
  assert.strictEqual(api.flFieldKindFromClass('surfaceVectorField'),'vector');
  assert.strictEqual(api.flFieldKindFromClass('volTensorField'),'tensor');
  assert.strictEqual(api.flFieldKindFromClass('volSymmTensorField'),'symmTensor');
  assert.strictEqual(api.flFieldKindFromClass('volSphericalTensorField'),'sphericalTensor');
  assert.strictEqual(api.flFieldStorageFromClass('surfaceVectorField'),'surface');
  assert.strictEqual(api.flFieldStorageFromClass('pointScalarField'),'point');
});

test('field header, dimensions and boundaries', () => {
  const text = [
    'FoamFile { format ascii; class volVectorField; location "0"; object velocityAnyName; }',
    'dimensions [0 1 -1 0 0 0 0];',
    'internalField uniform (0 0 0);',
    'boundaryField { wallA { type noSlip; } symmetryA { type symmetryPlane; } }'
  ].join('\n');
  const h = api.flParseFoamFieldHeader(text,'Case/0/regionA/velocityAnyName');
  assert.strictEqual(h.kind,'vector');
  assert.strictEqual(h.storage,'volume');
  assert.strictEqual(h.object,'velocityAnyName');
  assert.strictEqual(h.dimensions,'[0 1 -1 0 0 0 0]');
  assert(h.boundaries.some(x=>x.name==='wallA'&&x.type==='noSlip'));
  assert(h.boundaries.some(x=>x.name==='symmetryA'&&x.type==='symmetryPlane'));
});

test('default, regional and decomposed field paths', () => {
  const root='Project/Case';
  let d=api.flVolumeFieldDescriptorFromPath(root+'/2.5/Twhatever',root);
  assert(d&&d.region===''&&d.time===2.5&&d.name==='Twhatever');
  d=api.flVolumeFieldDescriptorFromPath(root+'/2.5/fluidA/Uwhatever',root);
  assert(d&&d.region==='fluidA'&&d.name==='Uwhatever');
  d=api.flVolumeFieldDescriptorFromPath(root+'/processor12/2.5/fluidA/Uwhatever',root);
  assert(d&&d.partition==='processor12'&&d.region==='fluidA');
});

test('dictionary scope never creates fake nested region', () => {
  const root='Project/Case';
  const files=[
    fake(root+'/0/fluidA/T'),fake(root+'/0/solidB/T'),
    fake(root+'/constant/fluidA/physicalProperties'),
    fake(root+'/constant/fluidA/materials/materialOne'),
    fake(root+'/constant/solidB/materials/materialTwo'),
    fake(root+'/system/controlDict')
  ];
  const m=api.flBuildCaseDiscoveryModel(files,root);
  assert.deepStrictEqual(m.regions,['fluidA','solidB']);
  assert.strictEqual(m.dictionaries.find(x=>x.name==='materialOne').region,'fluidA');
  assert.strictEqual(m.dictionaries.find(x=>x.name==='materialTwo').region,'solidB');
});

test('run logs and foamLog directory are structural', () => {
  const root='Project/Case';
  assert.strictEqual(api.flLogDescriptorFromPath(root+'/log.customSolver',root).kind,'runLog');
  assert.strictEqual(api.flLogDescriptorFromPath(root+'/logs/pFinalRes_0',root).kind,'foamLog');
});

test('postProcessing path discovers arbitrary output names', () => {
  const root='Project/Case';
  const d=api.flPostProcessingDescriptorFromPath(root+'/postProcessing/fluidA/arbitraryFunction/1.25/output.dat',root);
  assert(d&&d.time===1.25&&d.prefixSegments.join('/')==='fluidA/arbitraryFunction'&&d.fileName==='output.dat');
});

test('probe classification uses content, not function-object name', () => {
  const p=api.flClassifyPostProcessingSample('# Probe 0 (0 0 0)\n# Time 0\n0 42\n1 43\n','anything.dat');
  assert.strictEqual(p.kind,'probe');assert(p.temporal);
});

test('sampled set classification uses spatial file structure', () => {
  const p=api.flClassifyPostProcessingSample('# x U_x U_y U_z T\n0 1 2 3 4\n1 2 3 4 5\n','line_anything.xy');
  assert.strictEqual(p.kind,'sampledSet');assert(p.spatial);assert(p.columns.includes('x'));
});

test('volFieldValue-like volume reduction is structural', () => {
  const p=api.flClassifyPostProcessingSample('# Selection : all\n# Cells : 20\n# Volume : 2e-5\n# Time volAverage(phi)\n0 1\n1 2\n','result.dat');
  assert.strictEqual(p.kind,'volumeReduction');assert(/volAverage/.test(p.reduction));
});

test('surfaceFieldValue-like reduction is structural', () => {
  const p=api.flClassifyPostProcessingSample('# Selection : patch wall\n# Faces : 20\n# Area : 0.5\n# Time areaIntegrate(q)\n0 1\n1 2\n','result.dat');
  assert.strictEqual(p.kind,'surfaceReduction');
});

test('arbitrary numeric tables remain discoverable', () => {
  const p=api.flClassifyPostProcessingSample('# Time customA customB\n0 1 2\n1 3 4\n','custom.out');
  assert.strictEqual(p.kind,'tabular');assert(p.temporal);
});

test('malformed or incomplete postProcessing degrades to unknown', () => {
  const p=api.flClassifyPostProcessingSample('# Time maybeField\nthis row is incomplete\n','broken.dat');
  assert.strictEqual(p.kind,'unknown');
  assert.strictEqual(p.temporal,false);
  assert.strictEqual(p.spatial,false);
});

test('missing optional outputs do not create synthetic data', () => {
  const root='Project/Case';
  const m=api.flBuildCaseDiscoveryModel([
    fake(root+'/0/regionOne/T'),
    fake(root+'/system/controlDict')
  ],root);
  assert.strictEqual(m.postProcessing.length,0);
  assert.strictEqual(m.logs.length,0);
  assert(m.fields.some(x=>x.name==='T'));
  assert(!m.fields.some(x=>x.name==='missingField'));
});


test('general project model aggregates real concepts without field allowlist', () => {
  const root='Project/Case';
  const m=api.flBuildCaseDiscoveryModel([
    fake(root+'/0/regionOne/arbitraryScalar'),
    fake(root+'/1.25/regionOne/arbitraryScalar'),
    fake(root+'/0/regionTwo/arbitraryVector'),
    fake(root+'/postProcessing/regionOne/randomSampler/1.25/a.xy'),
    fake(root+'/logs/randomResidual_0'),
    fake(root+'/system/controlDict')
  ],root);
  assert.deepStrictEqual(m.regions,['regionOne','regionTwo']);
  assert.deepStrictEqual(m.timeDirectories,[0,1.25]);
  assert(m.fields.some(x=>x.name==='arbitraryScalar')&&m.fields.some(x=>x.name==='arbitraryVector'));
  assert(m.postProcessing.length===1&&m.logs.length===1&&m.dictionaries.length===1);
});

test('Data Catalog is explicit and non-auto-plotting', () => {
  for (const id of ['catalogTab','catalogControls','dataCatalogPanel','catalogTableBody']) assert(html.includes('id="'+id+'"'), 'Missing '+id);
  assert(html.includes("setDataView('catalog')"));
  assert(html.includes('Nothing is plotted until you explicitly choose it.'));
});

test('existing major modules are preserved', () => {
  assert(html.includes('FOAMLENS_PROFILE_PLAYBACK_CORE_START'));
  assert(html.includes('FOAMLENS_PHASE_MOMENTUM_CORE_START'));
  assert(html.includes('parseOpenFOAMRunLogRecords'));
});

test('product discovery core has no development-fixture names', () => {
  for (const banned of ['QuickCup','B3_reference','B6_adaptiveDt','C6_adaptiveDt']) {
    assert(!core.includes(banned), 'Fixture leaked into product core: '+banned);
  }
});

console.log('General OpenFOAM discovery regression suite passed: '+passed.length+' checks.');
for (const name of passed) console.log('  ✓ '+name);
