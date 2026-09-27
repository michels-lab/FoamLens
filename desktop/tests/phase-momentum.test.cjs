'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const frontend = path.join(__dirname, '..', 'src', 'FoamLensDesktop', 'frontend', 'index.html');
const html = fs.readFileSync(frontend, 'utf8');

const begin = '/* FOAMLENS_PHASE_MOMENTUM_CORE_START */';
const end = '/* FOAMLENS_PHASE_MOMENTUM_CORE_END */';
const a = html.indexOf(begin);
const b = html.indexOf(end, a);
assert(a >= 0 && b > a, 'Phase Change / Momentum core markers are missing.');

const core = html.slice(a, b + end.length);
const nl = String.fromCharCode(10);
const api = new Function(
  "function stripFoamComments(s){return String(s||'').replace(/\\/\\*[\\s\\S]*?\\*\\//g,'').replace(/\\/\\/.*$/gm,'')}" +
  nl + core + nl +
  'return {' +
  'pmVolumeFieldDescriptorFromPath,pmPhysicalMetadataDescriptorFromPath,pmParseFoamDictionaryEntries,' +
  'pmSuggestMappings,pmCapabilitiesFromMapping,pmParseOpenFOAMFieldText,pmComponentValues,' +
  'pmClassifyPhase,pmStats,pmLocalRatio,pmPearson,pmSpearman,pmParseFormula,pmFormulaIdentifiers,pmEvalFormula};'
)();

const near = (x, y, tol = 1e-9) => Math.abs(x - y) <= tol;
const passed = [];
function test(name, fn) { fn(); passed.push(name); }

test('reconstructed volume-field inventory', () => {
  const d = api.pmVolumeFieldDescriptorFromPath('Project/CaseA/5.0/U', 'Project/CaseA', 123);
  assert(d && d.time === 5 && d.name === 'U' && d.region === '' && d.partition === '');
});

test('regional volume-field inventory', () => {
  const d = api.pmVolumeFieldDescriptorFromPath('Project/CaseA/5.0/solid/T', 'Project/CaseA', 123);
  assert(d && d.region === 'solid' && d.name === 'T');
});

test('decomposed processor inventory', () => {
  const d = api.pmVolumeFieldDescriptorFromPath('Project/CaseA/processor3/5.041/fluid/alphaL', 'Project/CaseA', 123);
  assert(d && d.partition === 'processor3' && near(d.time, 5.041) && d.region === 'fluid' && d.name === 'alphaL');
});

test('polyMesh internals excluded', () => {
  assert.strictEqual(api.pmVolumeFieldDescriptorFromPath('Project/CaseA/5/polyMesh/points','Project/CaseA',1), null);
});

test('physical metadata indexing', () => {
  const d = api.pmPhysicalMetadataDescriptorFromPath('Project/CaseA/constant/thermophysicalProperties','Project/CaseA',100);
  assert(d && d.section === 'constant' && d.fileName === 'thermophysicalProperties');
});

test('simple and dimensioned metadata scalars', () => {
  const rows = api.pmParseFoamDictionaryEntries(
    'rho rho [1 -3 0 0 0 0 0] 7000;\\n' +
    'beta [0 0 0 -1 0 0 0] 1.2e-4;\\n' +
    'nOuterCorrectors 3;\\n',
    'constant/physicalProperties'
  );
  const rho = rows.find(x => x.key === 'rho');
  const beta = rows.find(x => x.key === 'beta');
  const n = rows.find(x => x.key === 'nOuterCorrectors');
  assert(rho && rho.value === 7000 && rho.dimensions === '[1 -3 0 0 0 0 0]' && rho.dimensionedName === 'rho');
  assert(beta && near(beta.value, 1.2e-4) && beta.dimensions === '[0 0 0 -1 0 0 0]');
  assert(n && n.value === 3);
});

test('capability-driven mapping suggestions', () => {
  const fields = ['T','U','p_rgh','alphaL','darcyAcceleration','buoyancyAcceleration'];
  const m = api.pmSuggestMappings(fields);
  assert(m.temperature === 'T' && m.velocity === 'U' && m.liquidFraction === 'alphaL');
  assert(m.darcyAcceleration === 'darcyAcceleration');
  const cap = api.pmCapabilitiesFromMapping(m, fields);
  assert(cap.phase && cap.momentum && cap.enabled);
});

const scalarText = `FoamFile
{
 format ascii;
 class volScalarField;
 object alphaL;
}
dimensions [0 0 0 0 0 0 0];
internalField nonuniform List<scalar>
5
(
0
0.03
0.4
0.96
1
)
;
boundaryField{}
`;

const vectorText = `FoamFile
{
 format ascii;
 class volVectorField;
 object U;
}
dimensions [0 1 -1 0 0 0 0];
internalField nonuniform List<vector>
5
(
(0 0 0)
(1 0 0)
(0 2 0)
(0 0 -3)
(1 2 2)
)
;
boundaryField{}
`;

test('ASCII volScalarField parser', () => {
  const p = api.pmParseOpenFOAMFieldText(scalarText,'5/alphaL');
  assert(p.supported && p.kind === 'scalar' && p.count === 5 && near(p.values[2], .4));
});

test('ASCII volVectorField parser and components', () => {
  const p = api.pmParseOpenFOAMFieldText(vectorText,'5/U');
  const mag = api.pmComponentValues(p,'magnitude');
  const y = api.pmComponentValues(p,'y');
  assert(p.supported && p.kind === 'vector' && mag.values.length === 5 && near(mag.values[4],3) && y.values[2] === 2);
});

test('uniform field expansion', () => {
  const p = api.pmParseOpenFOAMFieldText('FoamFile{format ascii; class volScalarField; object rho;} internalField uniform 7000;','5/rho');
  const v = api.pmComponentValues(p,'value',4);
  assert(p.supported && p.uniform && v.values.length === 4 && v.values.every(x => x === 7000));
});

test('binary field rejected rather than guessed', () => {
  const p = api.pmParseOpenFOAMFieldText('FoamFile{format binary; class volScalarField; object T;} internalField nonuniform List<scalar> 3(','5/T');
  assert(!p.supported && p.reason === 'binary-format');
});

test('configurable phase classification', () => {
  assert.strictEqual(api.pmClassifyPhase(.99,.05,.95),'liquid');
  assert.strictEqual(api.pmClassifyPhase(.5,.05,.95),'mushy');
  assert.strictEqual(api.pmClassifyPhase(.01,.05,.95),'solid');
});

test('spatial statistics and percentiles', () => {
  const st = api.pmStats([0,1,2,3,4],10);
  assert(st.count === 5 && near(st.mean,2) && near(st.median,2));
  assert(near(st.p25,1) && near(st.p75,3) && near(st.p95,3.8) && near(st.fraction,.5));
});

test('local ratio excludes near-zero denominators', () => {
  const r = api.pmLocalRatio([2,4,6],[1,0,3],1e-12);
  assert(r.valid === 2 && r.invalid === 1 && near(r.values[0],2) && near(r.values[1],2));
});

test('Pearson and Spearman correlation', () => {
  assert(near(api.pmPearson([1,2,3,4],[2,4,6,8]),1));
  assert(near(api.pmSpearman([10,20,30,40],[7,9,11,13]),1));
});

test('derived-field formula parser and evaluator', () => {
  const ast = api.pmParseFormula('C*(1-alpha)^2/(alpha^3+q)');
  const ids = [...api.pmFormulaIdentifiers(ast)].sort();
  assert.strictEqual(ids.join(','),'C,alpha,q');
  const v = api.pmEvalFormula(ast,n => ({C:100,alpha:.5,q:.01})[n]);
  const expected = 100*Math.pow(.5,2)/(Math.pow(.5,3)+.01);
  assert(near(v,expected,1e-9));
});

test('formula functions', () => {
  const ast = api.pmParseFormula('abs(x)+sqrt(y)+pow(z,2)');
  assert(near(api.pmEvalFormula(ast,n => ({x:-2,y:9,z:4})[n]),21));
});

test('no project-specific analysis names', () => {
  for (const banned of ['QuickCup','B3','C3']) assert(!core.includes(banned), 'Found project-specific token: '+banned);
});

test('capability-gated UI exists', () => {
  for (const id of ['pmMappingNav','pmPhaseNav','fieldMappingTools','phaseMomentumTools','pmRunStats','pmRunRatio','pmRunScatter','pmRunEvolution','pmRunVerify','pmSummaryResult']) {
    assert(html.includes('id="'+id+'"'), 'Missing UI control '+id);
  }
  assert(html.includes('pmCaseCapabilities') && html.includes('pmRefreshCapabilityVisibility'));
});

test('Desktop reuses existing readText bridge', () => {
  assert(!html.includes('parseOpenFOAMField'));
  assert(html.includes("pmParseOpenFOAMFieldText(await record.file.text(),record.sourcePath)"));
});

test('derived physical rates are explicit and auditable', () => {
  assert(html.includes("formula='−dT/dt'"));
  assert(html.includes("formula='−dαL/dt'"));
  assert(html.includes("formula='dαS/dt'"));
  assert(html.includes('pmBracketForDerivative'));
});

test('units and dimensions are surfaced', () => {
  assert(html.includes('pmUnitFromDimensions'));
  assert(html.includes('Recognized unit'));
  assert(html.includes('Dimensions'));
});

test('workspace persistence includes field mapping', () => {
  assert(html.includes('phaseMomentum:pmWorkspaceState()'));
  assert(html.includes('pmRestoreWorkspaceState(payload.phaseMomentum)'));
});

test('legacy synchronized playback remains intact', () => {
  assert(html.includes('FOAMLENS_PROFILE_PLAYBACK_CORE_START'));
  assert(html.includes('profilePlaybackUsesGlobalClock'));
});

console.log('Phase Change / Momentum regression suite passed: ' + passed.length + ' checks.');
for (const name of passed) console.log('  ✓ ' + name);
