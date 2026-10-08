'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const root=path.join(__dirname,'..','src','FoamLensDesktop','frontend');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const plotSurfaces=read('v14-zy-plot-surfaces.js');
const field=read('v14-zz-field-workspace.js');
const fieldView=read('v14-field-view.js');
const ribbon=read('v15-ribbon-ui.js');
const activity=read('v20-activity-manager.js');
const analysisScope=read('v21-analysis-scope.js');
const compare=read('v14-z-field-compare.js');
const dataHtml=read('index.html');
const analysisModules=[
  'v13-flow-analysis.js','v13-numerical-performance.js','v13-physical-analysis.js',
  'v13-solidification-analysis.js','v13-spatial-differences.js','v13-temporal-alignment.js',
  'v13-thermal-analysis.js','v13-vector-fields.js','v14-energy-audit.js',
  'v14-experimental-validation.js','v14-momentum-mechanisms.js'
].map(read);

for(const src of [plotSurfaces,field,fieldView,ribbon,activity,analysisScope,compare,...analysisModules])new Function(src);

const passed=[];
function test(name,fn){fn();passed.push(name)}

test('3D and 3D comparison remain Field-owned across top-level section switches',()=>{
  assert(field.includes("fwAdoptFieldNode('fieldViewPanel','fw3DHost')"));
  assert(field.includes("fwAdoptFieldNode('fieldViewControls','fw3DControlsHost')"));
  // 3D Compare settings may initially be outside fieldViewControls, depending
  // on module installation order. Reparent the actual panel on startup AND entry.
  const compareAdoptions=field.split("fwAdoptFieldNode('fcPanel','fw3DControlsHost')").length-1;
  assert.equal(compareAdoptions,2,
    'Compare 3D configuration must enter the Field Inspector on bootstrap and on re-entry');
  const start=field.indexOf('function fwLeave()'),end=field.indexOf('function fwInstall()',start),leave=field.slice(start,end);
  assert(start>=0&&end>start,'fwLeave block missing.');
  assert(!leave.includes("fwRestore(document.getElementById('fieldViewPanel'))"));
  assert(!leave.includes("fwRestore(document.getElementById('fieldViewControls'))"));
  assert(compare.includes("document.getElementById('fieldViewControls')"),'3D Compare no longer mounts through the Field-owned inspector tree.');
});

test('plot controls and render surfaces have stable workspace ownership',()=>{
  assert(field.includes('function fwOwnCompanionControls'));
  assert(field.includes("'playbackGlobal','timeSeriesControls','profileControls','logControls'"));
  assert(field.includes("fwAdoptFieldNode(id,'fw2DControlsHost')"));
  assert(field.includes('function fwEnsureCompanionSurface'));
  assert(field.includes("FoamLensPlotSurfaces?.ensure?.('field',host)"));
  assert(field.includes("FoamLensPlotSurfaces?.activate?.('field',host,{restore:false})"));
  assert(!field.includes('fwRestoreCompanionNodes'),'Legacy shared-chart restore path still exists.');
  assert(!field.includes('appendChild(chart)'),'Field still reparents the 2D chart.');
  assert(!field.includes('function fwRemember('),'Legacy origin bookkeeping still exists.');
  for(const key of ['data','analysis','field'])assert(plotSurfaces.includes("'"+key+"'"),'Missing stable plot surface '+key+'.');
  assert(plotSurfaces.includes('flPlotSurfaceSwapCanonicalIds'),'Plot surfaces do not preserve the legacy renderer through canonical-ID switching.');
  assert(plotSurfaces.includes('bindPlotCanvasInteractions(canvas)'),'Cloned plot surfaces do not receive the shared interaction controller.');
});

test('top-level Ribbon exposes real scopes only',()=>{
  for(const removed of ['plots','compare'])
    assert(!new RegExp("\\['"+removed+"','[^']+','[^']+','[^']+'\\]").test(ribbon),'Fake top-level alias returned: '+removed);
  for(const kept of ['home','data','field','analysis','export','view'])
    assert(new RegExp("\\['"+kept+"','[^']+','[^']+','[^']+'\\]").test(ribbon),'Expected top-level scope missing: '+kept);
});

test('legacy Field navigation cannot reappear beside the Ribbon',()=>{
  assert(!field.includes('createdModeButton'),'Field workspace still contains legacy mode-button creation logic.');
  assert(!field.includes("b.id='modeField'"),'Field workspace still creates modeField.');
  assert(!fieldView.includes("tab.id='fieldViewTab'"),'Field View still creates a Data dataset tab.');
  assert(!fieldView.includes("document.getElementById('fieldViewTab')"),'Field View still depends on the retired dataset tab.');
  assert(!fieldView.includes("setDataView=function(mode){if(mode==='field3d'"),'Field View still patches Data navigation for 3D.');
  assert(!field.includes("setDataView=function(mode){if(mode==='field3d'"),'Field workspace still aliases 3D through Data navigation.');
  assert(!fieldView.includes("setDataView('field3d')"),'Field View still enters 3D through Data.');
  assert(ribbon.includes("document.getElementById('modeField')?.remove()"),'Ribbon does not remove the base legacy Field button.');
  assert(!ribbon.includes("flRibbonClick('modeField')"),'Ribbon still uses modeField as a fallback.');
});

test('Difference labels distinguish 2D curve differences from strict 3D field differences',()=>{
  assert(ribbon.includes("'2D Curve Δ','Δ de curvas 2D'"));
  assert(ribbon.includes("['differenceTitle','2D Curve Difference','Diferencia de curvas 2D']"));
  assert(ribbon.includes("['createDifference','Create 2D Δ curve','Crear curva Δ 2D']"));
  assert(ribbon.includes("'Strict 3D Δ','Δ 3D estricta'"));
  assert(compare.includes('Show 3D difference'));
});

test('Analysis result creation is navigation-neutral',()=>{
  for(const src of analysisModules){
    assert(!src.includes("setDataView('timeseries')"),'Analysis module still silently switches to Time Series.');
    assert(!src.includes("setDataView('profile')"),'Analysis module still silently switches to Spatial Profile.');
  }
  assert(ribbon.includes('flRaAnalysisTimeResult'),'Explicit Time Series result action is missing.');
  assert(ribbon.includes('flRaAnalysisProfileResult'),'Explicit Spatial Profile result action is missing.');
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

test('Field mounts directly into a Field-owned staging host, never Data',()=>{
  assert(fieldView.includes("fieldRoot.dataset.foamlensOwner='field'"));
  assert(fieldView.includes("document.body.appendChild(fieldRoot)"));
  assert(fieldView.includes("fieldRoot.insertAdjacentHTML('beforeend',fvUiHtml())"));
  assert(fieldView.includes("fieldRoot.insertAdjacentHTML('beforeend',fvPanelHtml())"));
  assert(!fieldView.includes("controlsAnchor.insertAdjacentHTML('afterend',fvUiHtml())"));
  assert(!fieldView.includes("viewport.insertAdjacentHTML('beforeend',fvPanelHtml())"));
  assert(field.includes("fwAdoptFieldNode('fieldViewControls','fw3DControlsHost')"));
  assert(compare.includes("const controls=document.getElementById('fieldViewControls')"));
});

test('2D comparison belongs to Data; Analysis cannot reclaim 3D or 2D data controls',()=>{
  assert(analysisScope.includes("dataCompare.dataset.foamlensOwner='data'"));
  assert(analysisScope.includes("dataCompareHost.appendChild(difference)"));
  assert(analysisScope.includes("id='flDataComparisonHost'")||analysisScope.includes('id="flDataComparisonHost"'));
  const advanced=analysisScope.match(/const ordered=\[([^\]]+)\]/)?.[1]||'';
  assert(!advanced.includes('differenceTools'),'2D comparisons must not be owned by Analysis');
  assert(dataHtml.includes("function openAnalysisModule(kind)"));
  assert(/if\(kind==='difference'\)\s*\{\s*setAppMode\('data'\);/.test(dataHtml),
    '2D difference must switch to the canonical Data workspace.');
});

test('Data results preserve time-series, horizontal/vertical profiles, logs and catalog',()=>{
  for(const id of ['timeSeriesTab','profileTab','logTab','catalogTab','profileLine','profileTime','logFamily','timeSeriesVariable','compareHeights'])
    assert(dataHtml.includes('id="'+id+'"'),'Missing Data 2D control '+id);
  for(const action of ['flRaDataTimeSeries','flRaDataProfiles','flRaDataLogs','flRaCatalog','flRaDataCompare'])
    assert(ribbon.includes(action),'Missing Data Ribbon access to '+action);
  assert(ribbon.includes("flRibbonBind('flRaDataCompare',()=>flRibbonOpenData2DCompare())"));
});
