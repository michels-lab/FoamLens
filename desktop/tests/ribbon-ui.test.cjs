'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const repoRoot=path.join(__dirname,'..','..');
const frontend=path.join(repoRoot,'desktop','src','FoamLensDesktop','frontend');
const source=fs.readFileSync(path.join(frontend,'v15-ribbon-ui.js'),'utf8');
const workspace=fs.readFileSync(path.join(frontend,'v14-zz-field-workspace.js'),'utf8');
const activity=fs.readFileSync(path.join(frontend,'v20-activity-manager.js'),'utf8');

new Function(source);new Function(workspace);new Function(activity);

const tabs=['home','data','field','analysis','export','view'];
for(const tab of tabs){
  const tuplePattern=new RegExp("\\['"+tab+"','[^']+','[^']+','[^']+'\\]");
  assert(tuplePattern.test(source),"Ribbon tab definition missing: "+tab);
}
for(const removed of ['plots','compare'])
  assert(!new RegExp("\\['"+removed+"','[^']+','[^']+','[^']+'\\]").test(source),
    "Obsolete top-level alias tab still present: "+removed);

for(const id of [
  'flRaCatalog','flRaFieldWorkspace','flRaFieldProfile','flRaFieldTimeSeries','flRaFieldLogs',
  'flRaSplit','flRaInspector','flRaProbe','flRaCompare3D','flRaCompareDifference',
  'flRaAnalysisTimeResult','flRaAnalysisProfileResult','flRaExportPng','flRaTheme'
]) assert(source.includes(id),'Missing v1.6 Ribbon action: '+id);

assert(source.includes("flRibbonBind('flRaAnalysisTimeResult',()=>flRibbonSetLayout('timeseries'))"),
  'Analysis has no explicit Time Series result handoff.');
assert(source.includes("flRibbonBind('flRaAnalysisProfileResult',()=>flRibbonSetLayout('profile'))"),
  'Analysis has no explicit Spatial Profile result handoff.');
assert(source.includes("flRibbonContextNeeded"),'Context scope policy is missing.');
assert(source.includes("activeAppMode==='analysis'"),
  'Analysis must retain the shared Project/Case/Region context.');
assert(source.includes("activeAppMode==='data')return typeof currentDataView==='string'&&currentDataView!=='catalog'"),
  'Catalog must not duplicate its own Case/Region filters with the shared context bar.');
assert(source.includes("['profile','timeseries','log','split'].includes(state.view)"),
  'Field context must appear only for plot/log/split views that consume shared context.');
assert(source.includes("foamlens-field-view-change"),
  'Ribbon does not listen for internal Field tab scope changes.');
assert(source.includes('function flRibbonUpdateFieldScope'),
  'Field Ribbon does not scope 3D-only actions to 3D/Split.');
assert(source.includes('function flRibbonMountFieldTimeTransport'),
  'Global physical-time transport is not mounted into the Field Ribbon.');
assert(source.includes("host.appendChild(transport)"),
  'Field Ribbon creates a second time controller instead of reusing the global transport.');
assert(source.includes('flRibbonTimeHost'),
  'Field Ribbon has no physical-time transport host.');
assert(source.includes("document.getElementById('fvCacheLimit')"),
  'Field Ribbon does not mount the canonical frame-cache selector beside playback.');
assert(source.includes("document.getElementById('fvCacheReadout')"),
  'Field Ribbon does not mount the canonical cache readout beside playback.');
assert(source.includes("cacheField.parentElement!==advanced"),
  'Frame-cache control is copied instead of moved as the canonical control.');
assert(source.includes('function flRibbonMountFieldOptions'),
  'Field Ribbon does not own contextual Split options.');
assert(source.includes("document.getElementById('fwSplitChooser')"),
  'Split second-pane chooser is not available from the Field Ribbon.');
assert(source.includes("#flRibbonPanel-field.active{flex-wrap:wrap"),
  'Field Ribbon does not wrap its command groups.');
assert(source.includes("#flRibbonPanel-field.active{flex-wrap:wrap;align-content:flex-start;overflow-x:hidden"),
  'Field Ribbon can regress to a horizontal scrollbar.');
assert(source.includes("body.flRibbonReady.appMode-field #fwWorkspaceBar{display:none!important}"),
  'Duplicated internal Field navigation remains visible under the Ribbon.');
for(const id of ['flRaProbe','flRaSlice','flRaVectors','flRaStreamlines','flRaCompare3D','flRaLinkCameras'])
  assert(source.includes(id),'Expected scoped Field action missing: '+id);
assert(source.includes("view==='3d'||view==='split'"),
  '3D-only Ribbon actions are not tied to 3D/Split view state.');
assert(source.includes("flRibbonContextHost.hidden{display:none!important}"),
  'Context host cannot be hidden in pure 3D focus.');
assert(source.includes("globalContextBar"),
  'Project/Case/Region state presentation was deleted instead of scoped.');
assert(source.includes('body.flRibbonReady.appMode-data .datasetTabs'),
  'Legacy Data view tabs are still competing with the Field internal tabs.');
assert(source.includes('body.flRibbonReady.appMode-analysis .datasetTabs'),
  'Legacy Data view tabs are still visible in Analysis.');

assert(workspace.includes('data-fw-view="3d"'));
assert(workspace.includes('data-fw-view="profile"'));
assert(workspace.includes('data-fw-view="timeseries"'));
assert(workspace.includes('data-fw-view="log"'));
assert(workspace.includes('data-fw-view="split"'));
assert(workspace.includes("foamlens-field-view-change"),
  'Field tabs do not publish scope changes.');

assert(activity.includes('flActivityOverlayOpen'));
assert(activity.includes('activityToast.flActivitySuppressed{display:none!important}'),
  'Activity toast is not suppressed while a detailed overlay owns progress.');
assert(activity.includes("'scanOverlay'"),
  'Scanner overlay is not part of the unified activity policy.');

assert(source.includes("document.getElementById('modeField')?.remove()"),
  'Legacy Field mode button is not retired after Ribbon installation.');
assert(!source.includes("flRibbonClick('modeField')"),
  'Field Ribbon still falls back to the retired legacy mode button.');
assert(source.includes("body.flRibbonReady #modeNavBar{display:none!important}"),
  'Legacy mode navigation may only be hidden after the Ribbon mounts.');
assert(source.includes("body.flRibbonReady .top .tools{display:none!important}"));
assert(source.includes('window.FoamLensRibbon'));

console.log('FoamLens v1.6 Ribbon/context/activity scope audit passed:',tabs.length,'top-level tabs.');

assert(source.includes('function flRibbonFieldSubbars')&&source.includes("shelf.classList.toggle('hidden',!enabled)"),'One-at-a-time contextual 3D subbars are missing.');
assert(source.includes('.flRibbonTimeGroup{min-width:340px')&&source.includes('flRibbonCacheAdvanced'),'Field ribbon must be compact and cache configuration collapsible.');
assert(!source.includes("flRibbonActionHtml('flRaAbout'"),'About must not disappear when the Home ribbon tab is not active.');
assert(source.includes("document.getElementById('fcEnabled')?.checked")&&source.includes("setInspector?.(true)"),'Compare must reveal explicit second-view controls.');
