'use strict';

// Scientific release invariant: two physical OpenFOAM regions share a single
// runtime WebGL scene and their measurements must refer to the same timestep.
const fs=require('fs');
const path=require('path');
const assert=require('assert');
const {test}=require('node:test');
const root=path.join(__dirname,'..');
const field=fs.readFileSync(path.join(root,'src/FoamLensDesktop/frontend/v14-field-view.js'),'utf8');
const native=fs.readFileSync(path.join(root,'src/FoamLensDesktop/Program.cs'),'utf8');

test('actual installed and portable Field wide/compact screenshots assert measured timeline readout',()=>{
  const start=native.indexOf('private async Task CaptureScientificWorkspaceEvidenceAsync()');
  const end=native.indexOf('private async Task CaptureCdpPngAsync(',start);
  assert(start>=0&&end>start,'Native WebView2 rendered Field evidence was not found');
  const capture=native.slice(start,end);
  for(const token of [
    "document.getElementById('fwTimeReadout')",
    "document.getElementById('fwTimeSlider')",
    "window.FoamLensFieldWorkspace?.timeController?.current?.()",
    'Math.abs(loadedTime-fieldPhysicalTime)<1e-9',
    'const displayedTime=shown?Number(shown[1]):NaN',
    'Math.abs(displayedTime-loadedTime)<=1e-6',
    "timeSlider?.getAttribute('aria-valuetext')===readoutText",
    'clockMatchesRealFrame;',
    'field-{size.Name}.png'
  ])assert(capture.includes(token),'Missing real packaged UI timeline evidence: '+token);
});



test('multiregion candidate retains exact-frame native evidence contract',()=>{
  for(const token of [
    'field-real-multiregion.png',
    "s.field==='T'&&s.exactTime&&s.cells>0",
    'layer?.gl===gl',
    'FoamLens real OpenFOAM physical multiregion WebGL smoke passed'
  ])assert(native.includes(token),'Native real-case contract missing: '+token);
});

test('physical regions stay independently visible and editable in one scene',()=>{
  for(const token of [
    "fvRegionRenderLayers('opaque')",
    "fvRegionRenderLayers('transparent'",
    "const sorted=[...fvRegionScene.layers].filter(",
    "sorted.sort((a,b)=>layerDepth(b[1])-layerDepth(a[1])",
    'fvRegionBuildLayer(',
    'fvRegionChoice(',
    'fvRegionExactTime(',
    'fvRegionGeometryAtTime('
  ])assert(field.includes(token),'Region scene invariant missing: '+token);
});
