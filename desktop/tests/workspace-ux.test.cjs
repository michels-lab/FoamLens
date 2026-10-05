'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const root=path.join(__dirname,'..','src','FoamLensDesktop','frontend');
const ux=fs.readFileSync(path.join(root,'v17-workspace-ux.js'),'utf8');
const field=fs.readFileSync(path.join(root,'v14-zz-field-workspace.js'),'utf8');
const ribbon=fs.readFileSync(path.join(root,'v15-ribbon-ui.js'),'utf8');

new Function(ux);new Function(field);new Function(ribbon);

const passed=[];
function test(name,fn){fn();passed.push(name)}

test('Field Workspace persists v2 view state instead of obsolete permanent split state',()=>{
  for(const token of [
    "foamlens.fieldWorkspace.ux.v2",'schema:2','view:','companion:',
    'compareEnabled:','viewCount:','differenceEnabled:','syncMode:',
    'camerasLinked:','visualsSynced:','names'
  ])assert(ux.includes(token),'Missing persistent workspace token: '+token);
  assert(!ux.includes("foamlens.fieldWorkspace.ux.v1"),'Old workspace state schema is still active.');
});

test('saved workspace state restores active Field tab and optional Split companion',()=>{
  for(const token of [
    "set('fwCompanion',saved.companion)",
    "FoamLensFieldWorkspace?.setView?.(saved.view||saved.layout||'3d')",
    "check('fcLinkCameras',saved.camerasLinked)",
    "check('fcSyncVisuals',saved.visualsSynced)",
    "set('fcSync',saved.syncMode)",
    "check('fcDifference',saved.differenceEnabled)",
    "while(2+fcExtraViews.length<target)fcExtraAdd()"
  ])assert(ux.includes(token),'Missing restore token: '+token);
});

test('layout reset returns to a single 3D view',()=>{
  for(const token of [
    'localStorage.removeItem(uxWorkspaceKey)',
    "set('fwCompanion','profile')",
    "FoamLensFieldWorkspace?.setView?.('3d')",
    "check('fcLinkCameras',true)",
    "check('fcSyncVisuals',true)",
    "check('fcDifference',false)"
  ])assert(ux.includes(token),'Missing v1.6 reset token: '+token);
  assert(!ux.includes("set('fwLayout','split')"),'Reset still forces Split.');
});

test('Field workspace exposes one central tab model and explicit Split',()=>{
  for(const token of [
    'id="fwViewTabs"','data-fw-view="3d"','data-fw-view="profile"',
    'data-fw-view="timeseries"','data-fw-view="log"','data-fw-view="split"',
    "fwState={active:false,companion:'profile',layout:'3d',view:'3d'",
    "fwActivateView(view)","fwGrid.layout-3d .fwPlotCard{display:none}",
    "fwGrid.layout-plot .fw3DCard{display:none}",
    "fwGrid.layout-split"
  ])assert(field.includes(token),'Missing central-view token: '+token);
});

test('Inspector is a floating drawer rather than a permanent grid column',()=>{
  for(const token of [
    'fwControlsDrawer','position:fixed','fwSetInspector',
    "fwControlsDrawer hidden","aria-hidden"
  ])assert(field.includes(token),'Missing floating Inspector token: '+token);
  assert(!field.includes('grid-template-columns:minmax(0,1fr) 340px'),
    '3D focus still reserves a permanent controls column.');
});

test('one global Field time transport replaces visible per-view primary playback',()=>{
  for(const token of [
    'id="fwTimeTransport"','id="fwTimePlay"','id="fwTimeSlider"',
    'id="fwTimeSpeed"','fwTimePlay','fwTimeStop','fwTimeLoadIndex',
    'body.appMode-field .fvTimeline',
    'body.appMode-field #profileTimeline',
    'body.appMode-field #playbackGlobal'
  ])assert(field.includes(token),'Missing unified time transport token: '+token);
});

test('views A through D keep presentation names without replacing scientific labels',()=>{
  for(const token of [
    "const uxDefaultNames={1:'A',2:'B',3:'C',4:'D'}",
    "'uxViewName'+i","'uxViewNameRow'+i",
    'maxlength="28"','uxSetViewName','uxDecorateOne',
    'el.dataset.uxBase=base','el.dataset.uxRendered=rendered'
  ])assert(ux.includes(token),'Missing safe view-name token: '+token);
});

test('comparison status remains synchronized after the workspace refactor',()=>{
  for(const token of [
    'uxComparisonStatus','fcSameQuantity','fcCamerasLinked','fcVisualsSynced',
    "document.getElementById('fcDifferenceMode')",
    "document.getElementById('fcSync')","sync?.interpolated"
  ])assert(ux.includes(token),'Missing comparison-status token: '+token);
});

console.log('FoamLens v1.6 persistent workspace UX regression suite passed: '+passed.length+' checks.');
for(const name of passed)console.log('  ✓ '+name);
