'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'src','FoamLensDesktop','frontend','v22-findings-export.js'),'utf8');

new Function(source);

const required=[
  "schema:'FoamLens Findings Assistant Bundle'",
  'schemaVersion:1',
  'generatedAt:new Date().toISOString()',
  "purpose:'Evidence-preserving handoff for technical review.",
  'reviewInstructions:[',
  'cases:(cases||[]).map(fxeCase)',
  'findings:findings.map((f,i)=>fxeFinding(f,i,caseMap))',
  'relatedEvidence:related',
  'configuration:fxeClone(c?.config||{})',
  'runAudit:fxeClone(c?.runAudit||{})',
  'outputCompleteness:fxeClone(outputs)',
  'dimensions:s?.field?.dimensions||s?.dimensions',
  'association:s?.field?.association||s?.association',
  'sourcePath:s?.sourcePath',
  'function fxeExportJson()',
  'function fxeExportMarkdown()',
  'async function fxeChatGPT()',
  'async function fxeGithub()',
  "https://chatgpt.com/",
  "https://github.com/realmichelduarte/FoamLens/issues/new?title=",
  "data-fxe=\"chatgpt\"",
  "data-fxe=\"github\"",
  "fxeAttach(title.closest('.surfaceCardHead'),'fxeWorkspace')",
  "fxeAttach(bar,'fxeReview')",
  'window.FoamLensFindingsExport='
];
for(const token of required)assert(source.includes(token),'Missing Findings handoff/provenance token: '+token);

for(const excluded of ["'t','y','values','scalarValues','componentValues','points','faces','cells','vertices'"]){
  assert(source.includes(excluded),'Findings export no longer excludes raw heavy numeric arrays.');
}

assert(source.includes('Distinguish evidence from inference'),
  'Assistant review instructions no longer require evidence/inference separation.');
assert(source.includes('missing configured output alone is not proof of solver failure'),
  'Findings export lost the no-fabricated-causality guard.');
assert(source.includes("downloadText(fxeFileStem()+'_findings_evidence.json'"),
  'Machine-readable evidence export filename contract changed.');
assert(source.includes("downloadText(fxeFileStem()+'_findings_assistant.md'"),
  'Assistant Markdown export filename contract changed.');

console.log('FoamLens Findings export passed: provenance bundle, Markdown/JSON, ChatGPT and GitHub handoffs are wired.');
