'use strict';
const assert=require('node:assert/strict');
const {compareReports,normalize}=require('../compare-import-performance.cjs');
const fixture=(overrides={})=>({
  schema:'foamlens-scientific-import-performance-v1',
  version:'1.8.3',mode:'indexed-fast',fileCount:3008,loadedSeries:14,caseCount:2,
  sourceBytesKnown:1250000,sourceKindCounts:{timeseries:3008,profile:0,log:0,runlog:0,field:0,ignore:0,unknown:0},
  totalParseAndMetadataMs:150000,finalizeMs:20000,firstInteractiveMs:184800,
  fullAuditMs:null,stageMs:{derivedSeries:500,selectors:1000,dataViews:700,firstVisibleWorkspace:3000,diagnostics:null,audit:null},
  ...overrides
});
const result=compareReports(fixture(),fixture({totalParseAndMetadataMs:73000,finalizeMs:8000,firstInteractiveMs:86000}));
assert.equal(result.schema,'foamlens-import-comparison-v1');
assert.equal(result.metrics.firstInteractiveMs.deltaMs,98800);
assert.equal(result.metrics.fullAuditMs,null,'Unrun audit cannot be called 0ms');
assert.equal(result.datasetIdentityVerified,false,'Timing-only evidence must not assert dataset identity');
assert(!JSON.stringify(result).includes('C:\\'),'Private paths must not be included');
for(const bad of [
  fixture({fileCount:3009}),fixture({loadedSeries:15}),fixture({caseCount:3}),
  fixture({sourceBytesKnown:1250001}),fixture({mode:'full'}),fixture({version:'1.8.2'}),
  fixture({sourceKindCounts:{timeseries:3007}})
])assert.throws(()=>compareReports(fixture(),bad),/not comparable/);
assert.equal(compareReports(fixture({firstInteractiveMs:null}),fixture()).metrics.firstInteractiveMs,null);
assert.equal(compareReports(fixture({firstInteractiveMs:0}),fixture({firstInteractiveMs:0})).metrics.firstInteractiveMs.speedupX,null);
assert.throws(()=>normalize({schema:'something-else'}),/Expected an exported/);
assert.throws(()=>normalize(fixture({fileCount:NaN})),/Invalid fileCount/);
console.log('Owner import report comparison: evidence, scope, nullable audit and mismatch rejection PASS');
