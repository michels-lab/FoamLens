'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../src/FoamLensDesktop/frontend/v14-field-view.js'),'utf8');
function extract(name,next){
  const start=source.indexOf('function '+name+'('),end=source.indexOf('function '+next+'(',start);
  assert.ok(start>=0&&end>start,'Production functions missing: '+name+' / '+next);
  return source.slice(start,end);
}
const production=extract('fvRegionPhysicalCoordinate','fvRegionReleaseLayer');
const ctx={Number,String,Math};
vm.runInNewContext(production+'\nthis.union=fvRegionUnionBounds;',ctx);
test('actual physical region camera midpoint stays finite for large finite same-sign bounds',()=>{
  const mesh={boundsMin:[1e308,1e308,1e308],boundsMax:[1e308,1e308,1e308]};
  const b=ctx.union([mesh]);
  assert.ok(b);
  assert.deepEqual(Array.from(b.center),[1e308,1e308,1e308]);
  assert.equal(b.diagonal,1);
});
test('invalid coordinates cannot replace measured origin; actual zero remains valid',()=>{
  const missing={boundsMin:[null,false,''],boundsMax:[1,2,3]};
  const valid={boundsMin:[0,0,0],boundsMax:[2,4,6]};
  const b=ctx.union([missing,valid]);
  assert.deepEqual(Array.from(b.center),[1,2,3]);
});
