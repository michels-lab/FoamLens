'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const root=path.join(__dirname,'..','src','FoamLensDesktop','frontend');
const ux=fs.readFileSync(path.join(root,'v17-workspace-layout.js'),'utf8');
const compare=fs.readFileSync(path.join(root,'v14-z-field-compare.js'),'utf8');
const ribbon=fs.readFileSync(path.join(root,'v15-ribbon-ui.js'),'utf8');
const multi=fs.readFileSync(path.join(root,'v16-multipanel-export.js'),'utf8');

new Function(ux);
new Function(compare);
new Function(ribbon);
new Function(multi);

const passed=[];
function test(name,fn){fn();passed.push(name)}

test('Field Workspace persists layout, companion, widths, groups and view names',()=>{
  for(const token of [
    "foamlens.fieldWorkspace.layout.v2",'localStorage.getItem','localStorage.setItem',
    "layout:document.getElementById('fwLayout')","companion:document.getElementById('fwCompanion')",
    "syncTime:document.getElementById('fwSyncTime')","--wl-left-px","--wl-controls-px",
    "document.querySelectorAll('#fwGrid .fwControlGroup')",'viewNames:names',
    'FoamLensFieldCompare?.setViewName','FoamLensWorkspaceUX'
  ])assert(ux.includes(token),'Missing persistent-layout token: '+token);
});

test('desktop splitters support pointer and keyboard resizing with bounded widths',()=>{
  for(const token of [
    "data-wl-splitter",'role','separator','aria-orientation','vertical',
    "pointerdown","pointermove","pointerup","ArrowLeft","ArrowRight",
    'wlClamp(controls,280','wlClamp(left,320','wlDragging','wlRenderSoon'
  ])assert(ux.includes(token),'Missing splitter token: '+token);
});

test('contextual help is available in Field Workspace and Ribbon',()=>{
  for(const token of [
    'wlHelpOverlay','wlCurrentContext','Streamlines are active','Scientific comparison',
    '3D Spatial Profile','Reset saved layout','openHelp:wlOpenHelp'
  ])assert(ux.includes(token),'Missing contextual-help token: '+token);
  for(const token of ['flRaFieldHelp','Help','FoamLensWorkspaceUX?.openHelp'])
    assert(ribbon.includes(token),'Missing Ribbon help token: '+token);
});

test('comparison view names survive redraws and expose a public naming API',()=>{
  for(const token of [
    'fcViewNames','fcViewDisplayName','fcSetViewName','fcGetViewNames',
    'fcPrimaryName','fcCompareName',"fcExtra'+id+'Name",
    'getViewNames:fcGetViewNames','setViewName:fcSetViewName',
    'name:fcViewDisplayName(1)','name:fcViewDisplayName(2)'
  ])assert(compare.includes(token),'Missing viewport naming token: '+token);
});

test('comparison status bar exposes synchronization and compatibility state',()=>{
  for(const token of [
    'fcComparisonStatus','fcUpdateComparisonStatus','fcStatusChip',
    "fcUi('Time','Tiempo')","fcUi('Quantity','Cantidad')","fcUi('Mesh','Malla')",
    "fcCamerasLinked()","fcVisualsSynced()",'fcMeshesEquivalent(fvState.mesh,fcState.mesh)'
  ])assert(compare.includes(token),'Missing comparison-status token: '+token);
});

test('multipanel export prefers custom viewport names while preserving case identity',()=>{
  assert(multi.includes("d.viewName||d.caseName||d.key"),'Multipanel export does not use custom viewport names.');
  assert(multi.includes("d.viewName&&d.caseName?' — '+d.caseName:''"),'Multipanel export no longer preserves the underlying case name.');
});

console.log('FoamLens persistent-layout / comparison-UX regression suite passed: '+passed.length+' checks.');
for(const name of passed)console.log('  ✓ '+name);
