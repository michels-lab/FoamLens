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
  "https://github.com/michels-lab/FoamLens/issues/new?title=",
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


const coreEnd=source.indexOf('function fxeBundle(){');
assert(coreEnd>0,'original findings scientific extraction boundary absent');
const api=new Function('series','cases',source.slice(0,coreEnd)+'\nreturn {fxeFinite,fxeTimeRange,fxeFinding,fxeClone,fxeCaseId,fxeCase};')([],[]);

assert.strictEqual(api.fxeFinite(null),null,'missing measured value is not physical zero');
assert.strictEqual(api.fxeFinite('  '),null,'empty measurement is not physical zero');
assert.strictEqual(api.fxeFinite(false),null,'boolean false is not measured physical zero');
assert.strictEqual(api.fxeFinite('0x10'),null,'hex input is not OpenFOAM scientific dot decimal');
assert.strictEqual(api.fxeFinite('2,5'),null,'locale-comma input is not source dot decimal');
assert.strictEqual(api.fxeFinite(0),0,'actual measured zero must remain zero');
assert.strictEqual(api.fxeFinite(' -1.5E-3 '),-0.0015,'signed physical exponent must remain supported');
assert.strictEqual(api.fxeFinite(Infinity),null,'nonfinite measurement is not exportable');

const absent=api.fxeTimeRange({t:[null,'',false,'NaN'],profileTime:null});
assert.deepStrictEqual(absent,{min:null,max:null,count:0},'unknown source time is not a fabricated t=0');
const mixed=api.fxeTimeRange({t:[null,'0.5',1.5,'',0,false,'-1e-3'],profileTime:null});
assert.deepStrictEqual(mixed,{min:-0.001,max:1.5,count:4},'filter missing times and preserve real zero/time extent');
assert.deepStrictEqual(api.fxeTimeRange({t:[],profileTime:'2e-3'}),{min:0.002,max:0.002,count:1});

const many=Array(350000).fill(null);
many[0]=-1.25;many[many.length-1]=10.5;
assert.deepStrictEqual(api.fxeTimeRange({t:many}),{min:-1.25,max:10.5,count:2},
  'large scientific time history must not use spreading a huge array into Math.min/Math.max');

const finding=api.fxeFinding({caseId:8,time:null,measured:null,reference:false},0,new Map([[8,{name:'Case'}]]));
assert.strictEqual(finding.time,null,'missing finding time must stay unknown');
assert.strictEqual(finding.measured,null,'missing finding measurement must stay unknown');
assert.strictEqual(finding.reference,null,'false is not physical reference zero');

const shared={raw:'source-backed'};const sharedRefs=api.fxeClone({left:shared,right:shared});
assert.deepStrictEqual(sharedRefs,{left:{raw:'source-backed'},right:{raw:'source-backed'}},
  'shared noncircular scientific metadata must not be mislabeled as a circular reference');
const cyclic={id:'actual'};cyclic.self=cyclic;
assert.strictEqual(api.fxeClone(cyclic).self,'[circular]','actual cycles remain bounded');


assert.strictEqual(api.fxeCaseId(null),null,'unknown source case ID is not case 0');
assert.strictEqual(api.fxeCaseId(''),null);
assert.strictEqual(api.fxeCaseId(false),null);
assert.strictEqual(api.fxeCaseId(0),0,'real case 0 remains a valid identity');
assert.strictEqual(api.fxeCaseId('0008'),8,'string numeric case IDs retain numeric identity');
assert.strictEqual(api.fxeCaseId('9999999999999999999999999'),null,'unsafe case IDs must not collapse precision');
const privateCase=new Map([[0,{name:'Real zero case'}]]);
const unknownFinding=api.fxeFinding({caseId:null,title:'No association'},0,privateCase);
assert.strictEqual(unknownFinding.caseName,'','missing finding case ID must not inherit case zero');
assert.deepStrictEqual(unknownFinding.relatedEvidence,[],'missing case ID must not borrow unrelated source evidence');

// Same-defect regression: partial/empty source fields must NEVER fabricate related scientific evidence.
const associated=new Function('series','cases',source.slice(0,coreEnd)+
  '\nreturn {fxeFinding,fxeCase};')([
    {caseId:8,name:'Temperature',field:{canonical:'temperature',raw:'T'},sourcePath:'correct/T'},
    {caseId:8,name:'Tangent',field:{canonical:'Tangent'},sourcePath:'wrong/substr'},
    {caseId:8,name:'',field:{},sourcePath:'wrong/empty-field'},
    {caseId:9,name:'T',field:{raw:'T'},sourcePath:'wrong/other-case'},
    {caseId:null,name:'T',field:{raw:'T'},sourcePath:'wrong/no-case'}
  ],[]);
const realAlias=associated.fxeFinding({caseId:8,field:'T'},0,new Map([[8,{name:'Measured case'}]]));
assert.deepStrictEqual(realAlias.relatedEvidence.map(x=>x.sourcePath),['correct/T'],
  'only same-case original/canonical field aliases may be attached as related evidence');
const noPartial=associated.fxeFinding({caseId:8,field:'Tempera'},0,new Map([[8,{name:'Measured case'}]]));
assert.deepStrictEqual(noPartial.relatedEvidence,[],
  'a prefix is not evidence that a scientific source field is the requested field');
const caseWide=associated.fxeFinding({caseId:8},0,new Map([[8,{name:'Measured case'}]]));
assert.strictEqual(caseWide.relatedEvidence.length,3,
  'field-free case-level findings still retain same-case inventory without other cases');

const bodyStart=source.indexOf('function fxeGithubCounts('),bodyEnd=source.indexOf('\nasync function fxeGithub()',bodyStart);
assert(bodyStart>=0&&bodyEnd>bodyStart,'original GitHub handoff privacy function missing');
const github=new Function(source.slice(bodyStart,bodyEnd)+'\nreturn {fxeGithubCounts,fxeGithubBody};')();
const dangerous={
  workspace:{name:'PRIVATE_CASE_EXAMPLE_DO_NOT_SEND'},
  generatedBy:'SECRET_BUILD_MARKER',
  cases:[{rootPath:'C:\\PRIVATE_CASE_SECRET'}],
  findings:[
    {severity:'FAIL',caseName:'PRIVATE_CASE_EXAMPLE_DO_NOT_SEND',field:'CONFIDENTIAL_FIELD_NAME',
      title:'SECRET_FINDING_TITLE',detail:'C:\\PRIVATE_CASE_SECRET',measured:123.5},
    {severity:'WARNING',detail:'SECRET_FINDING_TITLE'},
    {severity:'NOTICE'}, {severity:'INFO'}
  ]
};
assert.deepStrictEqual(github.fxeGithubCounts(dangerous),{FAIL:1,WARNING:1,NOTICE:1,INFO:1,OTHER:0});
const publicBody=github.fxeGithubBody(dangerous);
for(const secret of ['PRIVATE_CASE_EXAMPLE_DO_NOT_SEND','CONFIDENTIAL_FIELD_NAME','SECRET_FINDING_TITLE',
  'PRIVATE_CASE_SECRET','SECRET_BUILD_MARKER','123.5'])assert(!publicBody.includes(secret),
  'public GitHub issue must not transmit private scientific source data: '+secret);
assert(publicBody.includes('1 FAIL')&&publicBody.includes('1 WARNING'),
  'public issue still contains useful aggregate diagnostic summary');
assert(publicBody.includes('intentionally excluded'),
  'public issue must explain why detailed research evidence is absent');
assert(source.includes('https://github.com/michels-lab/FoamLens/issues/new?title='),
  'new issues must target canonical FoamLens repository');
assert(!source.includes('https://github.com/realmichelduarte/FoamLens/issues/new?title='),
  'legacy repository path may redirect or lead the owner to the wrong issue destination');

console.log('FoamLens Findings export passed: provenance bundle, Markdown/JSON, ChatGPT and GitHub handoffs are wired.');
