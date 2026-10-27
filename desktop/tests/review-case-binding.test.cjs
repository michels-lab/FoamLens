'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');
const frontend=path.join(__dirname,'..','src','FoamLensDesktop','frontend');
const index=fs.readFileSync(path.join(frontend,'index.html'),'utf8');
const findingsExport=fs.readFileSync(path.join(frontend,'v22-findings-export.js'),'utf8');
const program=fs.readFileSync(path.join(__dirname,'..','src','FoamLensDesktop','Program.cs'),'utf8');
const linkPolicy=fs.readFileSync(path.join(__dirname,'..','src','FoamLensDesktop','ExternalNavigationPolicy.cs'),'utf8');
new Function(findingsExport);
const passed=[];function test(name,fn){fn();passed.push(name)}

test('Smart Import binds cases by stable source identity',()=>{
  for(const token of ['function candidateSourceKey(candidate)','function caseSourceKey(c)',"function existingCaseForCandidate(candidate,name='')",'c.sourceKey=candidateSourceKey(candidate)','plan[ci].caseId=c.id','const {name,files,caseId}=plan[ci],c=caseById(Number(caseId))']) assert(index.includes(token),'Missing stable identity token '+token);
  assert(!index.includes('const {name,files}=plan[ci],c=existingCaseByName(name)'));
});

test('Case Auditor re-resolves and stamps one caseId for all rendered audit blocks',()=>{
  assert(index.includes('function setReviewCaseContext(caseId,{syncGlobal=true}={})'));
  assert(index.includes('activeContextCaseId=c.id'));
  assert(index.includes('c=caseById(Number(c?.id));if(!c)return;'));
  assert(index.includes("$(id).dataset.caseId=String(c.id)"));
  assert(index.includes('const preferredAudit=activeContextCaseId!=null?caseById(Number(activeContextCaseId)):null'));
});

test('Review navigation uses the shared case-context binder',()=>{
  assert(index.includes("const c=setReviewCaseContext(Number($('auditCase').value))"));
  assert(index.includes('const c=setReviewCaseContext(Number(row.dataset.case))'));
  assert(index.includes('setReviewCaseContext(c.id);renderAuditCase(c)'));
});

test('Findings export builds an evidence-preserving assistant bundle',()=>{
  for(const token of [
    "schema:'FoamLens Findings Assistant Bundle'",
    'reviewInstructions:',
    'configuration:fxeClone',
    'runAudit:fxeClone',
    'outputCompleteness:fxeClone',
    'dataInventory:',
    'relatedEvidence:related',
    'measured:fxeFinite',
    'reference:fxeFinite'
  ])assert(findingsExport.includes(token),'Missing Findings evidence token: '+token);
});

test('Findings export exposes Markdown, JSON, ChatGPT and GitHub handoffs',()=>{
  for(const token of [
    'Assistant bundle (.md)','Raw evidence (.json)','Copy for ChatGPT','Create GitHub issue',
    "fxeOpen('https://chatgpt.com/')",
    'https://github.com/michels-lab/FoamLens/issues/new?title=',
    'FoamLensFindingsExport'
  ])assert(findingsExport.includes(token),'Missing Findings handoff token: '+token);
  assert(!findingsExport.includes('https://github.com/realmichelduarte/FoamLens/issues/new?title='),
    'Historical GitHub issue target must not reappear in the public handoff');
  assert(findingsExport.includes('Case names, local paths, physical samples'),
    'Public GitHub handoff must explicitly omit confidential research details');
});

test('Review external handoff delegates to the actual centralized HTTP(S) policy and truthful native launch',()=>{
  // Keep the original Findings UI handshake; assert the current production
  // security semantics rather than matching an obsolete inline parser string.
  assert(findingsExport.includes("foamLensNativeRequest('openExternal',{uri})"));
  assert(program.includes('case "openExternal":'));
  assert(program.includes('ExternalNavigationPolicy.TryExternalHttpUrl(uri, out var externalUrl)'));
  assert(program.includes('if (!OpenExternal(externalUrl))'));
  assert(program.includes('Only safe external HTTP(S) browser links are allowed.'));
  assert(program.includes('The system could not open this link.'));
  assert(program.includes('new ProcessStartInfo(externalUrl) { UseShellExecute = true }'));
  assert(!program.includes('new ProcessStartInfo(uri) { UseShellExecute = true }'));
  assert(linkPolicy.includes('uri.Scheme != Uri.UriSchemeHttps && uri.Scheme != Uri.UriSchemeHttp'));
  assert(linkPolicy.includes('uri.IsLoopback'));
  assert(linkPolicy.includes('uri.Host.Equals(LocalHost, StringComparison.OrdinalIgnoreCase)'));
});

console.log('Review case-binding regression suite passed: '+passed.length+' checks.');
for(const name of passed)console.log('  ✓ '+name);
