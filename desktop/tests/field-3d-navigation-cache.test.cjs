'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const frontend=path.join(__dirname,'..','src','FoamLensDesktop','frontend');
const native=fs.readFileSync(path.join(__dirname,'..','src','FoamLensDesktop','Program.cs'),'utf8');
const gpu=fs.readFileSync(path.join(__dirname,'..','..','tools','capture_loaded_gpu_evidence.ps1'),'utf8');
const ribbon=fs.readFileSync(path.join(frontend,'v15-ribbon-ui.js'),'utf8');
const field=fs.readFileSync(path.join(frontend,'v14-zz-field-workspace.js'),'utf8');
const ux=fs.readFileSync(path.join(frontend,'v17-workspace-ux.js'),'utf8');
for(const src of [ribbon,field,ux])new Function(src);
for(const preset of ['Iso','Front','Back','Left','Right','Top','Bottom']){
  assert(ribbon.includes('flRaQuick'+preset),'Missing direct camera direction '+preset);
  assert(ribbon.includes('flRaCamera'+preset),'Missing full camera direction '+preset);
}
for(const id of ['flRaFieldProfile','flRaFieldTimeSeries','flRaFieldLogs','flRaSplit'])
  assert(!ribbon.includes("flRibbonActionHtml('"+id+"'"),'Field still advertises Data-owned plot '+id);
for(const view of ['profile','timeseries','log','split'])
  assert(!field.includes('data-fw-view="'+view+'"'),'Field still exposes Data-owned view '+view);
assert(ribbon.includes('body.flRibbonReady.appMode-field .fwWorkspaceBar{display:none!important}'),'Actual class-based navigation leak is not fixed');
assert(!ribbon.includes('body.flRibbonReady.appMode-field #fwWorkspaceBar{display:none!important}'));
assert(field.includes("view='3d';fwState.view=view;"),'Legacy Field view state not constrained');
assert(field.includes("details.id='fwDataFieldHistories'")&&field.includes("dataHost.appendChild(details)"),
  'OpenFOAM-derived time series builder must be owned by Data, not hidden with the Field companion');
assert(field.includes("activeAppMode!=='data'||currentDataView!=='timeseries'"),
  '3D-field histories must be generated only inside Data Time Series');
assert(field.includes("fwBuildFieldHistories")&&field.includes("fwBuildFieldTimeSeries().catch("),
  'Scientific histories must remain available via explicit Build, not auto-parse on selector changes');
assert(!field.includes("fw2DControlsHost')?.prepend(root)"),
  'Field 3D still owns the scientific history builder');
assert(ux.includes("FoamLensFieldWorkspace?.setView?.('3d')"),'Imported legacy Field state is not constrained');
assert(ribbon.includes('function flRibbonPlaceCachePopover()'));
assert(ribbon.includes("const popup=advanced.querySelector('.flRibbonCachePopover')"));
assert(ribbon.includes('width:auto!important;max-width:none!important'),'Compact camera labels will be squeezed to obsolete 29px icons');
assert(ribbon.includes('position:fixed;z-index:950'),'Frame-cache UI can still grow the constrained Ribbon row');
assert(ribbon.includes('flRibbonCachePopover .flRibbonCacheField select{width:100%'));
assert(ribbon.includes('flRibbonBind(\'flRaAnalysisTimeResult\',()=>flRibbonOpenDataView(\'timeseries\'))'));
assert(ribbon.includes('flRibbonBind(\'flRaAnalysisProfileResult\',()=>flRibbonOpenDataView(\'profile\'))'));
console.log('Field-only 3D nav, seven unique camera shortcuts and anchored cache popover contracts passed.');

assert(native.includes('field-failed-{size.Name}.png'),'Failed real Field smoke must preserve rendered UI screenshot evidence');
assert(gpu.includes('Sanitized native Field smoke diagnostics'),'Premature Field exit must not be masked by GPU readiness-wait exception');

assert(native.includes("'flRaDataProfiles','flRaDataTimeSeries','flRaDataLogs','flRaDataCompare'"),
  'Native packaged smoke must require Data-owned plot navigation, not removed Field companion buttons');
assert(native.includes('contextRejectsLegacyProfile')&&native.includes("internalTabs.length===1&&internalTabs[0]==='3d'"),
  'Native packaged smoke must reject legacy Field profile and require exactly one 3D tab');
assert(!native.includes('contextVisibleProfile')&&!native.includes("'flRaFieldProfile','flRaFieldTimeSeries'"),
  'Native packaged smoke still requires removed Field 2D tabs');

assert(ribbon.includes('@media(max-width:1460px){#flRibbonPanel-field .flRibbonQuickCameraGroup .flRibbonLabel{display:none!important}'),
  'Laptop quick camera toolbar must remain one row; complete named presets stay in Camera subbar');
assert(native.includes('innerWidth<=1460?28:43')&&native.includes("el.getAttribute('aria-label')===label?.textContent"),
  'Packaged UI must test actual responsive camera sizing and readable accessible names');
