'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.join(__dirname,'..','src','FoamLensDesktop');
const program=fs.readFileSync(path.join(root,'Program.cs'),'utf8');
const tcModule=fs.readFileSync(path.join(root,'frontend','v24-thermocouple-xyz-mapping.js'),'utf8');
const existing=fs.readFileSync(path.join(root,'frontend','v14-experimental-validation.js'),'utf8');
const probe=fs.readFileSync(path.join(root,'frontend','v14-zz-field-workspace.js'),'utf8');
new Function(tcModule);
for(const token of ['Directory.GetFiles(AppRoot, "v*-*.js")','File.ReadAllText(path, Encoding.UTF8)'])
  assert(program.includes(token),'Native extension injector contract missing: '+token);
for(const token of ['function evParseTable(','function evAutoColumns(','function evCompareCurves('])
  assert(existing.includes(token),'Reuse existing experimental import and comparison core: '+token);
for(const token of ['field3d-probe-history','probePoint:[...probe.point]','sourcePath:\'derived:\'+key','fvLoadFrameData('])
  assert(probe.includes(token),'Real field sampled 3D Probe history must exist: '+token);
for(const token of ['generalAnalysisModules',"box.id='tcTools'","tcEl('tcImport').onclick",
 "tcEl('tcCalculate').onclick","tcEl('tcExportJson').onclick",
 "tcEl('tcExportCsv').onclick","tcInvalidate("])
  assert(tcModule.includes(token),'Thermocouple Analysis UI absent: '+token);
assert(tcModule.includes('tcActiveMesh(source)!==tcRuntime.mesh')&&tcModule.includes('series.includes(source)'),
 'Export must invalidate if real case mesh or sampled probe source changes after evaluation');
assert(!tcModule.includes('fetch(')&&!tcModule.includes('XMLHttpRequest'),'No uploads or case mutation in XYZ tool');
assert(!tcModule.includes('createTimeseries')&&!tcModule.includes('postProcessing/'+'metal'),
  'Do not generate fabricated OpenFOAM output');
console.log('Granada #152 source loader and scientific UI integration PASS.');
