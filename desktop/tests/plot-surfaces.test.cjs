'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const base=path.join(__dirname,'..','src','FoamLensDesktop','frontend');
const index=fs.readFileSync(path.join(base,'index.html'),'utf8');
const surfaces=fs.readFileSync(path.join(base,'v14-zy-plot-surfaces.js'),'utf8');
const field=fs.readFileSync(path.join(base,'v14-zz-field-workspace.js'),'utf8');
const multipanel=fs.readFileSync(path.join(base,'v16-multipanel-export.js'),'utf8');

new Function(surfaces);
new Function(field);
new Function(multipanel);

const passed=[];
function test(name,fn){fn();passed.push(name)}

test('core plot interactions are reusable across canvases',()=>{
  for(const token of [
    'const plotCanvasInteractionBindings=new WeakSet()',
    'function bindPlotCanvasInteractions(canvas)',
    "canvas.addEventListener('pointerdown'",
    "canvas.addEventListener('mousemove'",
    "canvas.addEventListener('click'",
    "bindPlotCanvasInteractions($('canvas'))"
  ])assert(index.includes(token),'Missing reusable interaction token: '+token);
  assert(index.includes('ev.currentTarget.setPointerCapture?.(ev.pointerId)'));
  assert(index.includes('ev.currentTarget.releasePointerCapture?.(ev.pointerId)'));
});

test('Data Analysis and Field own distinct stable plot surfaces',()=>{
  for(const token of [
    "['data',{view:currentDataView||'timeseries'",
    "['analysis',{view:'timeseries'",
    "['field',{view:'profile'",
    "flPlotSurfaceEnsure('analysis',document.getElementById('chartViewport'))",
    "flPlotSurfaceEnsure(key,host=null)",
    "if(key==='field')host=host||document.getElementById('fw2DHost')"
  ])assert(surfaces.includes(token),'Missing stable surface token: '+token);
});

test('legacy renderer compatibility is implemented by active IDs, not DOM reparenting',()=>{
  for(const role of ['canvas','previewTools','previewBadge','clearPins','tooltip','canvasSelection','workspaceHint','empty'])
    assert(surfaces.includes("'"+role+"'"),'Canonical plot role missing: '+role);
  assert(surfaces.includes('function flPlotSurfaceSwapCanonicalIds(fromKey,toKey)'));
  assert(surfaces.includes("prev.id=role+'-'+fromKey"));
  assert(surfaces.includes('next.id=role'));
  assert(!surfaces.includes('position:fixed'),'Plot surface controller must not use a fixed overlay portal.');
  assert(!surfaces.includes('position:absolute'),'Plot surface controller must not use an absolute overlay portal.');
});

test('surface switches preserve view and pinned-point state',()=>{
  for(const token of [
    'function flPlotSurfaceCapture',
    'state.view=currentDataView',
    'state.pinned=(pinnedPoints||[]).map',
    'state.activeId=activeId',
    'function flPlotSurfaceRestore',
    'currentDataView=state.view',
    'pinnedPoints=(state.pinned||[]).map',
    'activeId=state.activeId'
  ])assert(surfaces.includes(token),'Missing plot state preservation token: '+token);
});

test('cloned surfaces keep the full interaction model',()=>{
  assert(surfaces.includes('bindPlotCanvasInteractions(canvas)'),'Cloned canvas is not bound to the shared interaction controller.');
  assert(surfaces.includes("clear.onclick=()=>"),'Cloned surface does not bind Clear pinned points.');
  assert(surfaces.includes('flPlotSurfaceTemplate.cloneNode(true)'),'Stable surfaces are not created from the same visual structure.');
  assert(surfaces.includes("document.dispatchEvent(new CustomEvent('foamlens-plot-surface-change'"),
    'Surface changes are not observable by other UI modules.');
});

test('Field no longer moves or restores the singleton chart',()=>{
  assert(field.includes('function fwEnsureCompanionSurface'));
  assert(field.includes("FoamLensPlotSurfaces?.ensure?.('field',host)"));
  assert(field.includes("FoamLensPlotSurfaces?.activate?.('field',host,{restore:false})"));
  assert(!field.includes('appendChild(chart)'),'Field still moves a chart node.');
  assert(!field.includes('fwRestoreCompanionNodes'),'Field still restores a shared chart node.');
  assert(!field.includes('function fwRemember('),'Field still tracks legacy DOM origins.');
  assert(!field.includes('function fwRestore('),'Field still exposes legacy DOM restore logic.');
  assert(!field.includes('function fwMove('),'Field still exposes legacy DOM move logic.');
});

test('exports continue through the canonical active canvas',()=>{
  assert(multipanel.includes("document.getElementById('canvas')"),
    'Multi-panel export no longer reads the canonical active plot surface.');
  assert(surfaces.includes("el.id=canonical?role:role+'-'+key"));
});

console.log('FoamLens stable 2D plot-surface regression suite passed: '+passed.length+' checks.');
for(const name of passed)console.log('  ✓ '+name);
