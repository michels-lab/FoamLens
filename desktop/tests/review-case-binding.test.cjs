'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');
const index=fs.readFileSync(path.join(__dirname,'..','src','FoamLensDesktop','frontend','index.html'),'utf8');
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

console.log('Review case-binding regression suite passed: '+passed.length+' checks.');
for(const name of passed)console.log('  ✓ '+name);
