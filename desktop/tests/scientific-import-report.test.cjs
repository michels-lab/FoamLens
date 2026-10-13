'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),vm=require('vm');
const html=fs.readFileSync(path.join(__dirname,'..','src','FoamLensDesktop','frontend','index.html'),'utf8');
const start=html.indexOf('let flImportPerformance=null;');
const end=html.indexOf('function flNeedsFastScientificImport(',start);
assert(start>=0&&end>start,'Live owner import report implementation missing');
const downloads=[];
const ctx={
  document:{documentElement:{dataset:{foamLensDesktopVersion:'1.8.2'}}},
  cases:[{id:1,name:'CONFIDENTIAL_PATIENT_OR_CASE_NAME',rootPath:'C:\\private\\secret\\case'}],
  performance:{memory:{usedJSHeapSize:1245,jsHeapSizeLimit:50000}},
  downloadText:(name,text,type)=>downloads.push({name,text,type}),
  console:{warn:()=>{}}
};
vm.createContext(ctx);
vm.runInContext(html.slice(start,end)+';globalThis.performanceReport=flSanitizedImportPerformanceReport;globalThis.exportReport=flExportImportPerformanceReport',ctx,{timeout:1000});
assert.strictEqual(ctx.performanceReport(),null,'No import means no invented report');
assert.strictEqual(ctx.exportReport(),false,'Do not download a fake performance report');
vm.runInContext(`flImportPerformance={
  fileCount:3008,loadedSeries:2000,mode:'indexed-fast',fileParseAndMetadataMs:120000,
  totalMs:36000,endToEndMs:185000,auditMs:null,
  stageMs:{derivedSeries:900,selectors:60,dataViews:210,firstVisibleWorkspace:22},
  privatePath:'C:\\\\private\\\\secret',caseName:'CONFIDENTIAL_PATIENT_OR_CASE_NAME',
  filename:'Confidential-data.csv',scientificField:[1,2,3]
}`,ctx);
const result=ctx.performanceReport();
assert.strictEqual(result.fileCount,3008);
assert.strictEqual(result.mode,'indexed-fast');
assert.strictEqual(result.totalParseAndMetadataMs,120000);
assert.strictEqual(result.firstInteractiveMs,185000);
assert.strictEqual(result.fullAuditMs,null,'An unfinished audit may not appear completed');
assert.strictEqual(result.stageMs.firstVisibleWorkspace,22);
assert.strictEqual(result.stageMs.audit,null);
assert.strictEqual(result.webViewJsHeapBytes,1245);
assert(ctx.exportReport(),'Explicit export should download exactly one report');
assert.strictEqual(downloads.length,1);
assert.strictEqual(downloads[0].name,'FoamLens_import_performance.json');
assert.strictEqual(downloads[0].type,'application/json');
const json=JSON.parse(downloads[0].text);
assert.strictEqual(json.version,'1.8.2');
assert.strictEqual(json.schema,'foamlens-scientific-import-performance-v1');
for(const secret of ['CONFIDENTIAL','secret','scientificField','filename','rootPath','privatePath']){
  assert(!downloads[0].text.includes(secret),'Do not export private case content: '+secret);
}
assert(html.includes('id="readyPerformanceReport"'),'Real Ready overlay must expose an export control');
assert(html.includes("addEventListener('click',flExportImportPerformanceReport)"),
  'Ready export button must trigger a working export, not an inert decoration');
console.log('Scientific import report export PASS: real timings, missing-audit null, private data excluded and user button wired');
