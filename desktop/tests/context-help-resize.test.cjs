'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const root=path.join(__dirname,'..','src','FoamLensDesktop','frontend');
const resize=fs.readFileSync(path.join(root,'v18-context-help-resize.js'),'utf8');
const ux=fs.readFileSync(path.join(root,'v17-workspace-ux.js'),'utf8');
const ribbon=fs.readFileSync(path.join(root,'v15-ribbon-ui.js'),'utf8');

new Function(resize);
new Function(ux);
new Function(ribbon);

const passed=[];
function test(name,fn){fn();passed.push(name)}

test('Field Workspace has draggable splitters for 3D plot and controls',()=>{
  for(const token of [
    'uxSplitterA','uxSplitterB','role','separator','aria-orientation',
    'pointerdown','pointermove','pointerup','col-resize',
    '--ux3d','--uxplot','--uxcontrols'
  ])assert(resize.includes(token),'Missing splitter token: '+token);
});

test('splitter drag enforces minimum scientific workspace widths',()=>{
  for(const token of [
    'hrClamp(uxDrag.a+d,280,total-280)',
    'hrClamp(uxDrag.c-d,260,total-320)',
    'hrClamp(uxDrag.c-d,260,total-280)',
    "Math.max(280,Number(v.threeD))",
    "Math.max(280,Number(v.plot))",
    "Math.max(260,Number(v.controls))"
  ])assert(resize.includes(token),'Missing splitter width constraint: '+token);
});

test('panel sizes persist in the same Field Workspace UX state',()=>{
  for(const token of [
    "foamlens.fieldWorkspace.ux.v1",'current.panelSizes=hrSizes()',
    'panelSizes:window.FoamLensWorkspaceResize?.getSizes?.()',
    'hrLoadState().panelSizes','hrApplySizes(saved)',
    'FoamLensWorkspaceResize'
  ])assert(resize.includes(token)||ux.includes(token),'Missing panel-size persistence token: '+token);
});

test('responsive mode disables splitters rather than forcing desktop widths',()=>{
  for(const token of [
    "matchMedia('(max-width:1100px)').matches",
    '@media(max-width:1100px)',
    '.uxWorkspaceSplitter{display:none!important}',
    'grid-template-columns:1fr!important'
  ])assert(resize.includes(token),'Missing responsive splitter safeguard: '+token);
});

test('contextual help covers field compare export and view workflows',()=>{
  for(const token of [
    'hrHelpContent','Field Workspace','3D Compare','Scientific Export','View & Layout',
    'comparison status strip','Exact, Nearest or Interpolated',
    '3D panels are rerendered at requested export resolution',
    'View names are presentation labels'
  ])assert(resize.includes(token),'Missing contextual help token: '+token);
});

test('help overlay supports Ribbon invocation Escape close and question-mark shortcut',()=>{
  for(const token of [
    'hrHelpOverlay','aria-modal','hrHelpClose',"e.key==='Escape'","e.key==='?'",
    'FoamLensContextHelp','flRaHelp','Help','Ayuda'
  ])assert(resize.includes(token)||ribbon.includes(token),'Missing help interaction token: '+token);
});

test('View ribbon exposes view naming reset-layout and help controls together',()=>{
  for(const token of [
    'flRaViewNames','flRaResetLayout','flRaHelp',
    'FoamLensWorkspaceUx?.reset','FoamLensContextHelp?.open'
  ])assert(ribbon.includes(token),'Missing View ribbon UX token: '+token);
});

console.log('FoamLens contextual help / resizable workspace regression suite passed: '+passed.length+' checks.');
for(const name of passed)console.log('  ✓ '+name);
