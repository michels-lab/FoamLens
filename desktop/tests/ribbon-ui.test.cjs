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
  'flRaExportPng','flRaTheme'
]) assert(source.includes(id),'Missing v1.6 Ribbon action: '+id);

assert(source.includes("flRibbonContextNeeded"),'Context scope policy is missing.');
assert(source.includes("activeAppMode==='data'||activeAppMode==='analysis'"),
  'Data/Analysis must retain the shared Project/Case/Region context.');
assert(source.includes("['profile','timeseries','log','split'].includes(state.view)"),
  'Field context must appear only for plot/log/split views that consume shared context.');
assert(source.includes("foamlens-field-view-change"),
  'Ribbon does not listen for internal Field tab scope changes.');
assert(source.includes("flRibbonContextHost.hidden{display:none!important}"),
  'Context host cannot be hidden in pure 3D focus.');
assert(source.includes("globalContextBar"),
  'Project/Case/Region state presentation was deleted instead of scoped.');

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

assert(source.includes("body.flRibbonReady #modeNavBar{display:none!important}"),
  'Legacy mode navigation may only be hidden after the Ribbon mounts.');
assert(source.includes("body.flRibbonReady .top .tools{display:none!important}"));
assert(source.includes('window.FoamLensRibbon'));

console.log('FoamLens v1.6 Ribbon/context/activity scope audit passed:',tabs.length,'top-level tabs.');
