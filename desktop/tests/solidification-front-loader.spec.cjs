'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.join(__dirname,'..','src','FoamLensDesktop');
const native=fs.readFileSync(path.join(root,'Program.cs'),'utf8');
const front=path.join(root,'frontend');
const source=fs.readFileSync(path.join(front,'v24-solidification-front-proxy.js'),'utf8');
const iso=fs.readFileSync(path.join(front,'v14-isosurface.js'),'utf8');
const field=fs.readFileSync(path.join(front,'v14-field-view.js'),'utf8');
const solid=fs.readFileSync(path.join(front,'v13-solidification-analysis.js'),'utf8');
new Function(source);
for(const token of ['Directory.GetFiles(AppRoot, "v*-*.js")','File.ReadAllText(path, Encoding.UTF8)'])
  assert(native.includes(token),'Windows packaging must load isolated front proxy module '+token);
for(const token of ['function fvBuildIsoSurfaceGeometry(','function fvIsoTetra('])
  assert(iso.includes(token),'Field iso-surface reconstruction remains separate, not replaced '+token);
for(const token of ['function fvCellFaces(','function fvMeshFacePoints(','function fvFieldGroups(',
  'async function fvLoadFrameData(','fvResolveFieldMeshLayout(','fvCombinePartitionMeshes('])
  assert(field.includes(token),'Existing real polyMesh/field source parser required '+token);
assert(solid.includes('function saAnalyzePhaseSignal('),'Existing phase time-signal analysis must remain independent');
for(const token of ["el.id='pfPanel'","id=\"pfCase\"","id=\"pfRegion\"","id=\"pfAlpha\"",
  "id=\"pfIso\"","id=\"pfAxis\"","id=\"pfExport\"","id=\"pfExportCsv\"",
  "id=\"pfPlot\"","function pfRun()","function pfExport(","sourceFrames",
  "pfGeomCache","geometryGuarantee","fvLoadFrameData(c,g,region,t,'value'","pfSnapshot(",
  "window.FoamLensSolidificationFrontProxy","automaticRecalescence:false"])
  assert(source.includes(token),'Missing scientific read-only controls '+token);
assert(!source.includes('fetch(')&&!source.includes('XMLHttpRequest'),'Source mesh must never upload research data');
assert(!source.includes('series.push(')&&!source.includes('cases.push('),'Original OpenFOAM cases cannot be mutated by front proxy');
console.log('Granada #153 native extension, OpenFOAM mesh/phase parser reuse, source-only export and UI contracts PASS.');
