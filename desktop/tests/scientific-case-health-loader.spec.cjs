'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.join(__dirname,'..','src','FoamLensDesktop'),front=path.join(root,'frontend');
const source=fs.readFileSync(path.join(front,'v24-scientific-case-health.js'),'utf8');
const base=fs.readFileSync(path.join(front,'index.html'),'utf8');
const mesh=fs.readFileSync(path.join(front,'v20-mesh-quality-audit.js'),'utf8');
const coupling=fs.readFileSync(path.join(front,'v14-coupling-audit.js'),'utf8');
const energy=fs.readFileSync(path.join(front,'v14-energy-audit.js'),'utf8');
const native=fs.readFileSync(path.join(root,'Program.cs'),'utf8');
new Function(source);
for(const token of ['Directory.GetFiles(AppRoot, "v*-*.js")','File.ReadAllText(path, Encoding.UTF8)'])
 assert(native.includes(token),'native bundle does not load independent JS extension '+token);
for(const token of ['function caseLogSeries','function buildHealthAnalysisIndexProgressive','function flEnrichCaseDiscoveryModel',
 'function foamLogDescriptor','function pressureMapping','function couplingRows','function datasetTypeOf'])
 assert(base.includes(token),'Existing sourced health data path absent '+token);
for(const [name,module,key] of [
 ['mesh',mesh,'maPureCheckMesh'],['coupling',coupling,'caAudit'],['energy',energy,'eaRun']]){
 assert(module.includes(key),'Reuse existing scientific '+name+' audit instead of duplicating parser')
}
for(const t of ["panel.id='chPanel'","document.getElementById('generalAnalysisModules')",
 "id=\"chCase\"","id=\"chRuntimeFile\"","id=\"chMeshFile\"",
 "id=\"chAudit\"","id=\"chExport\"","chInvalidate",
 "reportBindingsVerifiedToCase:false","sourceContext:",
 "chBound.model","chBound.logs"])
 assert(source.includes(t),'UI/source integrity contract missing '+t);
assert(source.includes("no generic numerical pass threshold inferred"),'Source-bound maxCo only');
assert(!source.includes('fetch(')&&!source.includes('XMLHttpRequest'),'Scientific report must not upload raw research data');
console.log('Granada #155 native frontend extension and reuse-of-existing-auditors contract PASS.');
