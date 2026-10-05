'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const root=path.join(__dirname,'..','src','FoamLensDesktop','frontend');
const ux=fs.readFileSync(path.join(root,'v17-workspace-ux.js'),'utf8');
const ribbon=fs.readFileSync(path.join(root,'v15-ribbon-ui.js'),'utf8');

new Function(ux);
new Function(ribbon);

const passed=[];
function test(name,fn){fn();passed.push(name)}

test('Field Workspace persistence stores the layout and comparison presentation state',()=>{
  for(const token of [
    "foamlens.fieldWorkspace.ux.v1",'localStorage.getItem(uxWorkspaceKey)',
    'localStorage.setItem(uxWorkspaceKey','layout:','companion:','syncTime:',
    'compareEnabled:','viewCount:','differenceEnabled:','syncMode:',
    'camerasLinked:','visualsSynced:','names'
  ])assert(ux.includes(token),'Missing persistent workspace token: '+token);
});

test('saved workspace UX state restores layout, companion, comparison count and sync controls',()=>{
  for(const token of [
    "set('fwLayout',saved.layout)","set('fwCompanion',saved.companion)",
    "check('fwSyncTime',saved.syncTime)","check('fcLinkCameras',saved.camerasLinked)",
    "check('fcSyncVisuals',saved.visualsSynced)","set('fcSync',saved.syncMode)",
    "check('fcDifference',saved.differenceEnabled)","check('fcEnabled',true)",
    'while(2+fcExtraViews.length<target)fcExtraAdd()'
  ])assert(ux.includes(token),'Missing restore token: '+token);
});

test('views A through D can be named without replacing scientific case/field/time labels',()=>{
  for(const token of [
    "const uxDefaultNames={1:'A',2:'B',3:'C',4:'D'}",
    'uxViewName1','uxViewName2','uxViewName3','uxViewName4',
    'maxlength="28"','uxSetViewName','uxDecorateOne',
    'el.dataset.uxBase=base','el.dataset.uxRendered=rendered',
    "text===String(el.dataset.uxRendered||'')"
  ])assert(ux.includes(token),'Missing safe view-name token: '+token);
});

test('comparison status strip exposes time synchronization and scientific compatibility at a glance',()=>{
  for(const token of [
    'uxComparisonStatus','uxStatusPill','fcSameQuantity','fcCamerasLinked',
    'fcVisualsSynced',"document.getElementById('fcDifferenceMode')",
    "document.getElementById('fcSync')","sync?.interpolated",
    "Δt ","Matched","Different"
  ])assert(ux.includes(token),'Missing comparison-status token: '+token);
});

test('layout reset returns to a predictable split/profile synchronized workspace',()=>{
  for(const token of [
    'localStorage.removeItem(uxWorkspaceKey)',"set('fwLayout','split')",
    "set('fwCompanion','profile')","check('fwSyncTime',true)",
    "check('fcLinkCameras',true)","check('fcSyncVisuals',true)",
    "check('fcDifference',false)"
  ])assert(ux.includes(token),'Missing reset-layout token: '+token);
});

test('runtime hooks keep names/status current after comparison refreshes and view add/remove',()=>{
  for(const token of [
    'fcUpdateLabels.__uxPatched','fcExtraUpdateLabel.__uxPatched',
    'fcRefreshFrame.__uxPatched','fcExtraAdd.__uxPatched','fcExtraRemove.__uxPatched',
    'uxDecorateLabels();uxUpdateComparisonStatus();uxSave()'
  ])assert(ux.includes(token),'Missing runtime UX hook: '+token);
});

test('persistent layout tools are discoverable from the View ribbon',()=>{
  for(const token of [
    'flRaViewNames','View names','Nombres vistas','uxViewNamesPanel',
    'flRaResetLayout','Reset layout','Restablecer diseño','FoamLensWorkspaceUx?.reset'
  ])assert(ribbon.includes(token),'Missing ribbon persistent-layout token: '+token);
});

console.log('FoamLens persistent workspace UX regression suite passed: '+passed.length+' checks.');
for(const name of passed)console.log('  ✓ '+name);
