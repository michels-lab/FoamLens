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
    'fvRegionRenderLayers()',
    'fvRegionBuildLayer(',
    'fvRegionChoice(',
    'fvRegionExactTime(',
    'fvRegionGeometryAtTime('
  ])assert(field.includes(token),'Region scene invariant missing: '+token);
});
