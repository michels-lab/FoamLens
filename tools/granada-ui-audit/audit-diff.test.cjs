'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const {SCHEMA, index, compare} = require('./audit-diff.cjs');
const tool = path.join(__dirname, 'audit-diff.cjs');
const row = (mode, id, state = 'visible', active = mode === 'data', priority = 'primary') => ({
  mode, id, priority, mounted: state !== 'missing', active,
  more: state === 'in-more', conditional: state === 'conditional',
  hidden: state === 'hidden', clipped: state === 'clipped', disabled: state === 'disabled', state
});
function snapshot({data = [row('data', 'flRaCatalog')], field = [row('field', 'fvViewport', 'inactive-not-visual-tested', false)], width = 1280, dpi = 1.5, activeRibbon = 'data', activeAppMode = 'data'} = {}) {
  return {schema: SCHEMA, atUtc: '2026-10-20T00:00:00Z', viewport:{cssWidth:width,cssHeight:800,devicePixelRatio:dpi},
    activeRibbon, activeAppMode, evidence:{states:{visible:1},critical:[],byMode:{data,field}},
    path:'C:/PRIVATE/RESEARCH', error:'Bearer PRIVATE_TOKEN', case:'My unpublished experiment'};
}
function cli(before, after) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'foamlens-g5-'));
  try {
    const a = path.join(dir,'before.json'), b = path.join(dir,'after.json');
    fs.writeFileSync(a,JSON.stringify(before)); fs.writeFileSync(b,JSON.stringify(after));
    return spawnSync(process.execPath,[tool,a,b],{encoding:'utf8'});
  } finally {fs.rmSync(dir,{recursive:true,force:true});}
}
test('actual G0 byMode source schema is accepted and same control has stable key',()=>{
  const r=compare(snapshot(),snapshot());
  assert.equal(r.sourceSchema,SCHEMA);assert.equal(r.coverage.before,2);
  assert.equal(r.coverage.visuallyCompared,1);assert.equal(r.coverage.inactiveUnverified,1);
  assert.equal(r.regressions.length,0);
});
test('active primary visible -> hidden is confirmed regression',()=>{
  const r=compare(snapshot(),snapshot({data:[row('data','flRaCatalog','hidden')]}));
  assert.deepEqual(r.regressions.map(x=>x.to),['hidden']);
});
test('active clipped control is a regression and CLI returns code 2',()=>{
  const result=cli(snapshot(),snapshot({data:[row('data','flRaCatalog','clipped')]}));
  assert.equal(result.status,2);assert.equal(JSON.parse(result.stdout).regressions[0].to,'clipped');
});
test('primary hidden behind More is regression, secondary move stays review only',()=>{
  const first=snapshot({data:[row('data','flRaCatalog'),row('data','flRaClear','visible',true,'more')]});
  const second=snapshot({data:[row('data','flRaCatalog','in-more'),row('data','flRaClear','in-more',true,'more')]});
  const r=compare(first,second);assert.equal(r.regressions.length,1);assert.equal(r.reviewRequired.length,1);
});
test('disabled primary becomes regression; available again becomes improvement',()=>{
  const disabled=snapshot({data:[row('data','flRaCatalog','disabled')]});
  assert.equal(compare(snapshot(),disabled).regressions[0].to,'disabled');
  assert.equal(compare(disabled,snapshot()).improvements[0].to,'visible');
});
test('inactive visual states are never scored as visible regressions',()=>{
  const r=compare(snapshot(),snapshot({field:[row('field','fvViewport','missing',false)]}));
  assert.equal(r.regressions.length,0);assert.equal(r.reviewRequired.length,1);
});
test('control removed in active mode triggers code 2; inactive is manual review',()=>{
  const before=snapshot({data:[row('data','flRaCatalog'),row('data','flRaClear')]});
  const after=snapshot({data:[row('data','flRaCatalog')],field:[]});
  const r=compare(before,after);
  assert.equal(r.removed.length,1);assert.equal(r.reviewRequired.length,1);
  assert.equal(cli(before,after).status,2);
});
test('changed viewport width, DPI or active tab blocks comparison with exit 3',()=>{
  for(const candidate of [snapshot({width:1024}),snapshot({dpi:2}),snapshot({activeRibbon:'view'})]){
    assert.equal(compare(snapshot(),candidate).comparable,false);
    assert.equal(cli(snapshot(),candidate).status,3);
  }
});
test('real G0 missing/conditional states are recognized, not mistaken for hidden',()=>{
  const r=compare(snapshot(),snapshot({data:[row('data','flRaCatalog','conditional')]}));
  assert.equal(r.regressions[0].to,'conditional');
});
test('unexpected or mixed schema fails closed',()=>{
  assert.throws(()=>index({schema:'foobar',evidence:{}}),/Unsupported/);
  assert.throws(()=>compare(snapshot(),[{tab:'Data',id:'flRaCatalog'}]),/different audit schemas/);
});
test('malformed native evidence is rejected',()=>{
  const s=snapshot(); s.evidence.byMode.data[0].active='yes';
  assert.throws(()=>compare(s,s),/active\/mounted/);
});
test('duplicate mode/DOM identifiers are rejected, not silently overwritten',()=>{
  const s=snapshot({data:[row('data','flRaCatalog'),row('data','flRaCatalog')]});
  assert.throws(()=>index(s),/Duplicate control/);
});
test('malicious locator and invalid mode rejected without printing token',()=>{
  assert.throws(()=>index([{tab:'Data',id:'Bearer_PRIVATE_CREDENTIALS?'}]),/Invalid control ID/);
  assert.throws(()=>index([{tab:'unknown',id:'ok'}]),/Unknown FoamLens mode/);
});
test('private G0 fields do not leak into JSON output',()=>{
  const result=cli(snapshot(),snapshot());
  assert.equal(result.status,0);assert.doesNotMatch(result.stdout,/PRIVATE|RESEARCH|experiment|Bearer|atUtc/);
});
test('empty arrays and fake states cannot be reported as green',()=>{
  assert.throws(()=>index([]),/Empty audit/);
  assert.throws(()=>index(snapshot({data:[row('data','flRaCatalog','not-real')]})),/Unexpected state/);
});
test('legacy standalone control arrays remain usable without claiming installed G0 visual evidence',()=>{
  const a=[{tab:'Data',id:'load'},{tab:'Field',id:'camera'}];
  const b=[{tab:'Data',id:'load',hidden:true},{tab:'Field',id:'camera'}];
  const r=compare(a,b);
  assert.equal(r.sourceSchema,'legacy-control-array');assert.equal(r.regressions.length,1);
});
