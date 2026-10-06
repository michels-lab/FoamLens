'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const root=path.join(__dirname,'..','src','FoamLensDesktop','frontend');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const field=read('v14-zz-field-workspace.js');
const ribbon=read('v15-ribbon-ui.js');
const activity=read('v20-activity-manager.js');
const analysisScope=read('v21-analysis-scope.js');
const compare=read('v14-z-field-compare.js');
const analysisModules=[
  'v13-flow-analysis.js','v13-numerical-performance.js','v13-physical-analysis.js',
  'v13-solidification-analysis.js','v13-spatial-differences.js','v13-temporal-alignment.js',
  'v13-thermal-analysis.js','v13-vector-fields.js','v14-energy-audit.js',
  'v14-experimental-validation.js','v14-momentum-mechanisms.js'
].map(read);

for(const src of [field,ribbon,activity,analysisScope,compare,...analysisModules])new Function(src);

const passed=[];
function test(name,fn){fn();passed.push(name)}

test('3D and 3D comparison remain Field-owned across top-level section switches',()=>{
  assert(field.includes("fwAdoptFieldNode('fieldViewPanel','fw3DHost')"));
  assert(field.includes("fwAdoptFieldNode('fieldViewControls','fw3DControlsHost')"));
  const start=field.indexOf('function fwLeave()'),end=field.indexOf('function fwInstall()',start),leave=field.slice(start,end);
  assert(start>=0&&end>start,'fwLeave block missing.');
  assert(!leave.includes("fwRestore(document.getElementById('fieldViewPanel'))"));
  assert(!leave.includes("fwRestore(document.getElementById('fieldViewControls'))"));
  assert(compare.includes("document.getElementById('fieldViewControls')"),'3D Compare no longer mounts through the Field-owned inspector tree.');
});

test('plot control trees remain Field-owned instead of leaking back into Data',()=>{
  assert(field.includes('function fwOwnCompanionControls'));
  assert(field.includes("'playbackGlobal','timeSeriesControls','profileControls','logControls'"));
  assert(field.includes("fwAdoptFieldNode(id,'fw2DControlsHost')"));
  const start=field.indexOf('function fwRestoreCompanionNodes()'),end=field.indexOf('function fwCompanionTitle',start),restore=field.slice(start,end);
  for(const id of ['profileControls','timeSeriesControls','logControls','playbackGlobal'])
    assert(!restore.includes(id),'Compatibility restore reintroduced '+id+' into legacy Data ownership.');
  assert(restore.includes("#fw2DHost .chartwrap"),'Shared chart compatibility bridge was removed before a dedicated Field renderer exists.');
});

test('top-level Ribbon exposes real scopes only',()=>{
  for(const removed of ['plots','compare'])
    assert(!new RegExp("\\['"+removed+"','[^']+','[^']+','[^']+'\\]").test(ribbon),'Fake top-level alias returned: '+removed);
  for(const kept of ['home','data','field','analysis','export','view'])
    assert(new RegExp("\\['"+kept+"','[^']+','[^']+','[^']+'\\]").test(ribbon),'Expected top-level scope missing: '+kept);
});

test('Difference labels distinguish 2D curve differences from strict 3D field differences',()=>{
  assert(ribbon.includes("'2D Curve Δ','Δ de curvas 2D'"));
  assert(ribbon.includes("['differenceTitle','2D Curve Difference','Diferencia de curvas 2D']"));
  assert(ribbon.includes("['createDifference','Create 2D Δ curve','Crear curva Δ 2D']"));
  assert(ribbon.includes("'Strict 3D Δ','Δ 3D estricta'"));
  assert(compare.includes('Show 3D difference'));
});

test('Analysis modules fail closed to owned hosts instead of document.body',()=>{
  for(const src of analysisModules){
    assert(!src.includes('||document.body'),'Analysis module still falls back to document.body.');
    assert(!src.includes('|| document.body'),'Analysis module still falls back to document.body.');
  }
  assert(analysisScope.includes("id='flAnalysisOwnedHost'")||analysisScope.includes('id="flAnalysisOwnedHost"')||analysisScope.includes("id=\"flAnalysisOwnedHost\""));
});

test('activity ownership prevents compact progress from competing with detailed overlays',()=>{
  assert(activity.includes('flActivityOverlayOpen'));
  assert(activity.includes('activityToast.flActivitySuppressed{display:none!important}'));
  assert(activity.includes("'scanOverlay'"));
});

console.log('FoamLens v1.6 section-ownership / anti-leak regression suite passed: '+passed.length+' checks.');
for(const name of passed)console.log('  ✓ '+name);
