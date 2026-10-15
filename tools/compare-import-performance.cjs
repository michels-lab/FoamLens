#!/usr/bin/env node
'use strict';
// Compares two owner-exported, privacy-safe FoamLens import timing reports.
// No file paths, scientific values or assumed speedups are emitted.
const fs=require('node:fs');
const SCHEMA='foamlens-scientific-import-performance-v1';
const COUNTS=['fileCount','loadedSeries','caseCount'];
const STAGES=['derivedSeries','selectors','dataViews','firstVisibleWorkspace','diagnostics','audit'];
function nonNegative(value){
  if(value===null||value===undefined||value==='')return null;
  const n=Number(value);return Number.isFinite(n)&&n>=0?n:null
}
function requiredCount(data,key){
  const n=nonNegative(data?.[key]);
  if(n===null||!Number.isSafeInteger(n))throw new Error('Invalid '+key+' in FoamLens timing report');
  return n
}
function normalize(data){
  if(!data||data.schema!==SCHEMA)throw new Error('Expected an exported FoamLens scientific import performance v1 report');
  const counts=Object.fromEntries(COUNTS.map(k=>[k,requiredCount(data,k)]));
  const kindNames=['timeseries','profile','log','runlog','field','ignore','unknown'];
  const sourceKindCounts=Object.fromEntries(kindNames.map(k=>[k,nonNegative(data.sourceKindCounts?.[k])]));
  return {
    version:String(data.version||'unknown'),mode:String(data.mode||'unknown'),
    ...counts,sourceBytesKnown:nonNegative(data.sourceBytesKnown),sourceKindCounts,
    totalParseAndMetadataMs:nonNegative(data.totalParseAndMetadataMs),
    finalizeMs:nonNegative(data.finalizeMs),
    firstInteractiveMs:nonNegative(data.firstInteractiveMs),
    fullAuditMs:nonNegative(data.fullAuditMs),
    stageMs:Object.fromEntries(STAGES.map(k=>[k,nonNegative(data.stageMs?.[k])]))
  }
}
function compareMetric(cold,warm){
  return cold===null||warm===null?null:{
    initialMs:cold,repeatedMs:warm,deltaMs:Math.round((cold-warm)*1000)/1000,
    speedupX:warm>0?Math.round((cold/warm)*1000)/1000:null
  }
}
function compareReports(coldInput,warmInput){
  const cold=normalize(coldInput),warm=normalize(warmInput);
  for(const k of ['version','mode',...COUNTS]){
    if(cold[k]!==warm[k])throw new Error('Reports are not comparable: '+k+' differs');
  }
  if(cold.sourceBytesKnown!==null&&warm.sourceBytesKnown!==null&&
     cold.sourceBytesKnown!==warm.sourceBytesKnown)
    throw new Error('Reports are not comparable: known source bytes differ');
  for(const k of Object.keys(cold.sourceKindCounts)){
    const a=cold.sourceKindCounts[k],b=warm.sourceKindCounts[k];
    if(a!==null&&b!==null&&a!==b)
      throw new Error('Reports are not comparable: source kind '+k+' differs');
  }
  const keys=['totalParseAndMetadataMs','finalizeMs','firstInteractiveMs','fullAuditMs'];
  return {
    schema:'foamlens-import-comparison-v1',
    inputType:'two owner-exported FoamLens Desktop UI timing reports',
    version:cold.version,mode:cold.mode,fileCount:cold.fileCount,
    loadedSeries:cold.loadedSeries,caseCount:cold.caseCount,
    knownSourceBytes:cold.sourceBytesKnown??warm.sourceBytesKnown,
    datasetIdentityVerified:false,
    caution:'Privacy-safe timing reports cannot prove identical source content. Compare the SAME unchanged case and environment. FirstInteractiveMs is the existing UI-reported checkpoint, not a manually verified mouse-interaction latency. Synthetic CI fixtures do not establish owner-machine speedup.',
    metrics:Object.fromEntries(keys.map(k=>[k,compareMetric(cold[k],warm[k])])),
    stageMs:Object.fromEntries(STAGES.map(k=>[k,compareMetric(cold.stageMs[k],warm.stageMs[k])]))
  }
}
if(require.main===module){
  try{
    if(process.argv.length!==4)throw new Error('Usage: node tools/compare-import-performance.cjs first-run.json repeated-run.json');
    const [first,repeated]=process.argv.slice(2).map(p=>JSON.parse(fs.readFileSync(p,'utf8')));
    process.stdout.write(JSON.stringify(compareReports(first,repeated),null,2)+'\n')
  }catch(e){console.error('FoamLens import comparison: '+e.message);process.exitCode=1}
}
module.exports={normalize,compareReports};
