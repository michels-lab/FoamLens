'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const src=fs.readFileSync(path.join(__dirname,'../src/FoamLensDesktop/frontend/index.html'),'utf8');
const start=src.indexOf('/* FOAMLENS_LAZY_PROFILE_RETRY_START */'),end=src.indexOf('/* FOAMLENS_LAZY_PROFILE_RETRY_END */',start);
assert(start>0&&end>start,'Use actual production indexed-profile cleanup helper');
const code=src.slice(start,end);
const lazy=new Map(),cases=new Map([[11,{id:11,discovery:{lazyProfileFileCount:3}}],
  [22,{id:22,discovery:{lazyProfileFileCount:1}}]]);
const finalize=new Function('lazyProfileFilesByCase','caseById',
  code+';return finalizeLazyProfileSources')(lazy,id=>cases.get(id));
const file=(name)=>({name,webkitRelativePath:'Case11/postProcessing/probes/'+name});
const good=file('T.xy'),bad=file('bad.xy'),empty=file('empty.xy'),other=file('V.xy');
lazy.set(11,new Map([[good.webkitRelativePath,good],[bad.webkitRelativePath,bad],[empty.webkitRelativePath,empty]]));
lazy.set(22,new Map([[other.webkitRelativePath,other]]));
assert.equal(finalize(11,[good,bad,empty],new Set([good])),2,'Only successfully parsed measured profiles are consumed');
assert.deepEqual([...lazy.get(11).keys()], [bad.webkitRelativePath,empty.webkitRelativePath]);
assert.equal(cases.get(11).discovery.lazyProfileFileCount,2,'Pending index remains truthful');
assert.equal(finalize(22,[other],new Set([other])),0);
assert.equal(lazy.has(22),false,'Fully successful case no longer carries pending work');
const replacement=file('bad.xy');lazy.get(11).set(replacement.webkitRelativePath,replacement);
assert.equal(finalize(11,[bad],new Set([bad])),2,'Old in-flight file cannot delete newly indexed replacement');
assert.equal(finalize(11,[replacement,empty],new Set([replacement,empty])),0,'Later retry may finish remaining real files');
assert.equal(lazy.has(11),false);
assert.equal(cases.get(11).discovery.lazyProfileFileCount,0);
assert.equal(finalize(999,[bad],new Set([bad])),0,'Missing case should be no-op');
const loadBegin=src.indexOf('async function loadFiles('),loadEnd=src.indexOf('\nfunction ',loadBegin);
assert(loadBegin>=0&&loadEnd>loadBegin,'Real OpenFOAM loader must be present');
const loader=src.slice(loadBegin,loadEnd);
assert(loader.includes("const onFileResult=typeof options.onFileResult==='function'?options.onFileResult:null"),
  'Only opt-in hydration should pay per-file callback overhead');
assert(loader.includes("Array.isArray(r.series)&&r.series.length>0"),
  'Empty or failed parse cannot be counted as a valid scientific profile');
assert(loader.includes('if(onFileResult)onFileResult(r.file,valid)'),
  'Real parser reports each individual file, not just aggregate failure counts');
const hydStart=src.indexOf('async function hydrateLazyProfilesForContext()'),
  hydEnd=src.indexOf('async function parseAnyOpenFOAMFile',hydStart);
assert(hydStart>0&&hydEnd>hydStart);
const hyd=src.slice(hydStart,hydEnd);
assert(hyd.includes('finalizeLazyProfileSources(part.id,part.files,successful)'),
  'Hydration must keep failed files indexed');
assert(!hyd.includes('lazyProfileFilesByCase.delete(part.id)'),'Never drop entire case after partial failure');
assert(hyd.includes('files pending/retriable'),
  'Partial import status must be explicit and must not claim full completion');
assert(src.includes('id="dataCompareRetry"'),'Profiles case comparison must provide a direct retry control');
assert(src.includes("function selectedPendingProfiles()"),
  'Retry must count only selected cases, not unrelated OpenFOAM source files');
assert(src.includes("dataCompareRetry').disabled=!dataCompareState.active"),
  'Retry must be enabled only for active spatial-profile comparisons');
assert(src.includes("if(lazyProfileHydrationPromise)await lazyProfileHydrationPromise"),
  'Retry must wait for the current loader, not race and duplicate the same files');
assert(src.includes("if(selectedPendingProfiles())await hydrateLazyProfilesForContext()"),
  'Retry must process only source files remaining after previous load');
console.log('FoamLens indexed case profile retry: successful, failed, empty, stale replacement and later retry PASS');
