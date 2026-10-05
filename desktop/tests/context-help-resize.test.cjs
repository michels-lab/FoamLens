'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const root=path.join(__dirname,'..','src','FoamLensDesktop','frontend');
const resize=fs.readFileSync(path.join(root,'v18-context-help-resize.js'),'utf8');
const ux=fs.readFileSync(path.join(root,'v17-workspace-ux.js'),'utf8');
const ribbon=fs.readFileSync(path.join(root,'v15-ribbon-ui.js'),'utf8');

new Function(resize);new Function(ux);new Function(ribbon);

const passed=[];
function test(name,fn){fn();passed.push(name)}

test('only explicit Split receives a draggable divider',()=>{
  for(const token of [
    'uxSplitterA','role','separator','aria-orientation',
    "g.classList.contains('layout-split')",'pointerdown','pointermove','pointerup',
    '--ux3d','--uxplot'
  ])assert(resize.includes(token),'Missing Split divider token: '+token);
  assert(!resize.includes('uxSplitterB'),'Obsolete plot/controls divider still exists.');
  assert(!resize.includes('--uxcontrols'),'Inspector width is still encoded as a grid column.');
});

test('3D focus has no splitter or controls column',()=>{
  assert(resize.includes(".fwGrid.uxResizable:not(.layout-split)>#uxSplitterA{display:none}"));
  assert(resize.includes('grid-template-areas:"threeD splitA plot"'));
  assert(!resize.includes('grid-template-areas:"threeD splitA plot splitB controls"'));
});

test('splitter drag keeps both scientific panes usable',()=>{
  for(const token of [
    'hrClamp(uxDrag.a+d,280,total-280)',
    'Math.max(280,Number(v.threeD))',
    'Math.max(280,Number(v.plot))'
  ])assert(resize.includes(token),'Missing Split minimum-width safeguard: '+token);
});

test('panel sizes use the v2 workspace persistence state',()=>{
  for(const token of [
    "foamlens.fieldWorkspace.ux.v2",'current.panelSizes=hrSizes()',
    'hrLoadState().panelSizes','hrApplySizes(saved)','FoamLensWorkspaceResize'
  ])assert(resize.includes(token)||ux.includes(token),'Missing panel-size persistence token: '+token);
});

test('narrow layouts collapse Split vertically instead of forcing desktop widths',()=>{
  for(const token of [
    "matchMedia('(max-width:900px)').matches",
    '@media(max-width:900px)',
    '.uxWorkspaceSplitter{display:none!important}',
    'grid-template-columns:1fr!important'
  ])assert(resize.includes(token),'Missing responsive Split safeguard: '+token);
});

test('contextual help describes the new tabbed Field model',()=>{
  for(const token of [
    'Field Workspace','internal tabs','Split is opt-in','Physical-time playback is shared',
    'Inspector','3D focus uses the full central workspace'
  ])assert(resize.includes(token),'Missing v1.6 help token: '+token);
});

test('help remains available from the View Ribbon',()=>{
  for(const token of [
    'hrHelpOverlay','aria-modal','hrHelpClose',"e.key==='Escape'","e.key==='?'",
    'FoamLensContextHelp','flRaHelp','Help','Ayuda'
  ])assert(resize.includes(token)||ribbon.includes(token),'Missing help interaction token: '+token);
});

console.log('FoamLens v1.6 contextual help / Split resizing regression suite passed: '+passed.length+' checks.');
for(const name of passed)console.log('  ✓ '+name);
