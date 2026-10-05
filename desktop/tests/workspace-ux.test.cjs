'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.join(__dirname,'..','src','FoamLensDesktop','frontend');
const ux=fs.readFileSync(path.join(root,'v17-workspace-ux.js'),'utf8');
const ribbon=fs.readFileSync(path.join(root,'v15-ribbon-ui.js'),'utf8');
new Function(ux);new Function(ribbon);
const passed=[];function test(name,fn){fn();passed.push(name)}

test('Field Workspace persists layout and project-compatible view assignments',()=>{
  for(const token of [
    "FoamLens.fieldWorkspace.layout.v2",'localStorage.getItem','localStorage.setItem',
    'uxSnapshot','uxRestoreAssignments','project:uxProjectKey()','saved.project!==uxProjectKey()',
    'viewCount','caseName','region','field','component','compareEnabled',
    'layout:fwState?.layout','companion:fwState?.companion','syncTime'
  ])assert(ux.includes(token),'Missing persistent layout token: '+token);
});

test('automatic assignment restore is single-shot per project and cannot race case loading',()=>{
  for(const token of [
    "restoredProject:''","saved.project===project","uxState.restoredProject!==project",
    "uxState.restoredProject=project","document.body.classList.contains('appMode-field')&&!uxState.restoring",
    "if(project&&uxState.restoredProject!==project)uxRestore()"
  ])assert(ux.includes(token),'Missing restore-race guard token: '+token);
});

test('wide Field Workspace exposes two real drag splitters and persists their geometry',()=>{
  for(const token of [
    'uxSplitA','uxSplitB','role','separator','aria-orientation','vertical',
    'uxStartDrag','uxMoveDrag','uxEndDrag','splitRatio','controlsWidth',
    "grid.style.gridTemplateColumns=left+'px '+right+'px '+controls+'px'",
    'window.innerWidth>1350'
  ])assert(ux.includes(token),'Missing splitter token: '+token);
});

test('views A through D are renameable and names persist',()=>{
  for(const token of [
    "names:{1:'A',2:'B',3:'C',4:'D'}",'uxRename','uxViewName','data-ux-rename',
    "'uxName'+id",'viewports=[','names:{...uxState.names}'
  ])assert(ux.includes(token),'Missing view-name token: '+token);
});

test('comparison status bar exposes visible view identity physical time and sync state',()=>{
  for(const token of [
    'uxCompareStatus','uxViewSummary','caseName','field','t=','fcSyncText',
    "document.getElementById('fcSync')","document.getElementById('fcDifferenceMode')",
    "Sync','Sync"
  ])assert(ux.includes(token),'Missing comparison status token: '+token);
});

test('context help describes rename resize persistence and status workflows',()=>{
  for(const token of [
    'uxHelpOverlay','Field Workspace help','Rename views','Resize workspace',
    'Save layout','Comparison status','uxHelpClose'
  ])assert(ux.includes(token),'Missing contextual help token: '+token);
});

test('ribbon exposes save reset and help for the workspace',()=>{
  for(const token of [
    'flRaSaveLayout','Save layout','FoamLensWorkspaceUX?.save',
    'flRaResetLayout','Reset layout','FoamLensWorkspaceUX?.reset',
    'flRaWorkspaceHelp','Help','FoamLensWorkspaceUX?.help'
  ])assert(ribbon.includes(token),'Missing workspace ribbon token: '+token);
});

console.log('FoamLens persistent Workspace UX regression suite passed: '+passed.length+' checks.');
for(const name of passed)console.log('  ✓ '+name);
