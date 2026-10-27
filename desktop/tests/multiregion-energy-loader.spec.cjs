'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..','src','FoamLensDesktop');
const file=path.join(root,'frontend','v24-multiregion-energy.js');
const app=fs.readFileSync(file,'utf8'),program=fs.readFileSync(path.join(root,'Program.cs'),'utf8');
const workflow=fs.readFileSync(path.join(__dirname,'..','..','.github','workflows','build-foamlens-desktop.yml'),'utf8');
const existing=fs.readFileSync(path.join(root,'frontend','v14-energy-audit.js'),'utf8');
new Function(app);
assert(app.includes("panel.id='mecPanel'"),'A dedicated Analysis panel must mount');
assert(app.includes("host=mecEl('paTools')"),'Energy inspector belongs only in scientific Analysis');
assert(app.includes("window.FoamLensMultiregionEnergy"),'Public introspection entry missing');
// The production G32 security fix must be allowed to limit extension loading
// to trusted embedded bundle files rather than arbitrary stale AppRoot matches.
assert(program.includes('MaterializeBundle()'),'Native host must materialize the embedded original bundle');

assert(workflow.includes('Copy-Item desktop/src/FoamLensDesktop/frontend/v*-*.js bundle_tmp/'),
 'Actual Windows bundle must contain the new scientific file');
assert('v14-energy-audit.js'.localeCompare('v24-multiregion-energy.js')<0,'Existing reduction metadata must mount before companion module');
for(const token of ['function eaCaseSeries(','function eaDescriptor(','window.FoamLensEnergyAudit'])
 assert(existing.includes(token),'Existing source-backed Energy Auditor integration missing '+token);
for(const id of ['mecCase','mecRegion','mecConfirmInterface','mecConfirmStorage','mecConfirmCoverage',
  'mecExportJson','mecExportCsv','mecCalculate','mecRefresh','mecResult'])
 assert(app.includes(id),'Missing energy UI contract '+id);
assert(app.includes("mecEl('mecExportJson').disabled=false"),'Explicit JSON export enabling missing');
assert(app.includes("mecEl('mecExportCsv').disabled=false"),'Explicit CSV export enabling missing');
assert(app.includes("mecInvalidate()"),'Stale result invalidation missing');
assert(!app.includes('fetch(')&&!app.includes('XMLHttpRequest'),'Energy accounting cannot upload case data');
console.log('Granada #151 module injection + scoped Analysis UI/CSV/JSON safety contract PASS.');
