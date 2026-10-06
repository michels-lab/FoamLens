'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const base=path.join(__dirname,'..','src','FoamLensDesktop','frontend');
const mr=fs.readFileSync(path.join(base,'v13-multiregion-context.js'),'utf8');
const temporal=fs.readFileSync(path.join(base,'v13-temporal-alignment.js'),'utf8');
const physical=fs.readFileSync(path.join(base,'v13-physical-analysis.js'),'utf8');
const numerical=fs.readFileSync(path.join(base,'v13-numerical-performance.js'),'utf8');
const vector=fs.readFileSync(path.join(base,'v13-vector-fields.js'),'utf8');
const index=fs.readFileSync(path.join(base,'index.html'),'utf8');

const begin='/* FOAMLENS_MULTI_REGION_CORE_START */',end='/* FOAMLENS_MULTI_REGION_CORE_END */';
const a=mr.indexOf(begin),b=mr.indexOf(end,a);
assert(a>=0&&b>a,'Multi-region core markers missing.');
const core=mr.slice(a,b+end.length);
const api=new Function(core+'\nreturn {mrNormalizePath,mrKnownRegions,mrSeriesRegionFromMetadata,mrRegionsForContext};')();

const passed=[];function test(name,fn){fn();passed.push(name)}

test('explicit series region beats path inference',()=>{
  const c={discoveryModel:{regions:['fluid','solid']}};
  const s={region:'solid',sourcePath:'Case/postProcessing/fluid/probe/T'};
  assert.strictEqual(api.mrSeriesRegionFromMetadata(s,c),'solid');
});

test('field region metadata is accepted',()=>{
  const c={discovery:{regions:['regionA','regionB']}};
  const s={field:{region:'regionB'},sourcePath:'ambiguous/path'};
  assert.strictEqual(api.mrSeriesRegionFromMetadata(s,c),'regionB');
});

test('path inference uses discovered regions only',()=>{
  const c={discoveryModel:{regions:['air','wall']}};
  assert.strictEqual(api.mrSeriesRegionFromMetadata({sourcePath:'Case/postProcessing/air/probe/T'},c),'air');
  assert.strictEqual(api.mrSeriesRegionFromMetadata({sourcePath:'Case/postProcessing/unknown/probe/T'},c),'');
});

test('single-region cases have safe fallback',()=>{
  const c={discoveryModel:{regions:['fluid']}};
  assert.strictEqual(api.mrSeriesRegionFromMetadata({sourcePath:'Case/postProcessing/probe/T'},c),'fluid');
});

test('All cases exposes union of discovered regions',()=>{
  const cases=[
    {id:1,discoveryModel:{regions:['fluid','solid']}},
    {id:2,discovery:{regions:['gas','solid']}}
  ];
  assert.deepStrictEqual(api.mrRegionsForContext(cases,null),['fluid','gas','solid']);
});

test('selected case exposes only that case regions',()=>{
  const cases=[
    {id:1,discoveryModel:{regions:['fluid','solid']}},
    {id:2,discovery:{regions:['gas']}}
  ];
  assert.deepStrictEqual(api.mrRegionsForContext(cases,2),['gas']);
});

test('base application has global Case and Region context',()=>{
  for(const token of ['globalCaseSelect','globalRegionSelect','seriesMatchesGlobalContext','activeContextRegion'])assert(index.includes(token),'Missing base multi-region token '+token);
});

test('v1.6 context state is exposed independently from selector presentation',()=>{
  for(const token of [
    'function mrContextSnapshot()',
    'function mrSetContext(next={},options={})',
    'function mrRenderContextPresentation()',
    'function mrContextFromPresentation()',
    'window.FoamLensContextStore',
    'get:mrContextSnapshot',
    "source:'presentation'",
    "'foamlens-context-change'"
  ])assert(mr.includes(token),'Missing context-store token '+token);
  const matcherStart=mr.indexOf('seriesMatchesGlobalContext=function(s)');
  const matcherEnd=mr.indexOf('refreshGlobalContext=mrRenderContextPresentation',matcherStart);
  assert(matcherStart>=0&&matcherEnd>matcherStart,'Context-aware matcher override missing.');
  const matcher=mr.slice(matcherStart,matcherEnd);
  assert(matcher.includes('mrContextSnapshot()'),'Series filtering does not read the context store.');
  assert(!matcher.includes('globalCaseSelect')&&!matcher.includes('globalRegionSelect'),
    'Series filtering is still coupled to selector DOM.');
});

test('context effects are non-reentrant and avoid duplicate Review refresh',()=>{
  for(const token of [
    'let mrApplyingContextEffects=false',
    'if(mrApplyingContextEffects)return false',
    'mrApplyingContextEffects=true',
    'finally{mrApplyingContextEffects=false}',
    'apply:mrApplyContextEffects',
    'applying:()=>mrApplyingContextEffects'
  ])assert(mr.includes(token),'Missing context reentrancy guard token '+token);
  const start=mr.indexOf('function mrApplyContextEffects()'),end=mr.indexOf('function mrSetContext',start),body=mr.slice(start,end);
  assert(start>=0&&end>start,'Context effects block missing.');
  assert(body.includes('refreshDatasetControls()'),'Context effects no longer refresh dependent controls.');
  assert(!body.includes('refreshWorkspaceReview()'),'Context effects still duplicate the Review refresh already owned by refreshDatasetControls.');
});

test('new v1.3 analyses obey global context',()=>{
  for(const [name,src] of [['temporal',temporal],['physical',physical],['numerical',numerical],['vector',vector]]){
    assert(src.includes('seriesMatchesGlobalContext'),name+' analysis ignores active case/region context.');
  }
});

test('multi-region extension does not hardcode region names',()=>{
  for(const banned of ['metal','region0','mold','fluidRegion','QuickCup'])assert(!core.includes(banned),'Hardcoded region leaked into multi-region core: '+banned);
});

console.log('Multi-region analysis regression suite passed: '+passed.length+' checks.');
for(const name of passed)console.log('  ✓ '+name);
