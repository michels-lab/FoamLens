'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const csproj=read('desktop/src/FoamLensDesktop/FoamLensDesktop.csproj');
const program=read('desktop/src/FoamLensDesktop/Program.cs');
const script=read('desktop/src/FoamLensDesktop/Developer/Audit.js');
const userInstaller=read('desktop/installer/FoamLens.iss');
const devInstaller=read('desktop/installer/FoamLensDeveloper.iss');
const builder=read('desktop/developer/build-developer.ps1');
new Function(script);
for(const pattern of [
  /AssemblyName Condition="'\$\(FoamLensDeveloper\)' == 'true'">FoamLensDeveloper<\/AssemblyName>/,
  /DefineConstants Condition="'\$\(FoamLensDeveloper\)' == 'true'"/,
  /EmbeddedResource Include="Developer\\Audit\.js"/,
  /ItemGroup Condition="'\$\(FoamLensDeveloper\)' == 'true'"/
])assert(pattern.test(csproj),'Developer variant is not compiled conditionally: '+pattern);
assert(!read('desktop/src/FoamLensDesktop/frontend/index.html').includes('FOAMLENS_DEVELOPER_AUDIT_V1'),
  'Normal FoamLens UI must not include Developer audit');
assert(!userInstaller.includes('FoamLensDeveloper'),'Public Setup must not install Developer binary');
assert(/#if FOAMLENS_DEVELOPER[\s\S]*AddScriptToExecuteOnDocumentCreatedAsync\(DeveloperAuditScript\(\)\)/.test(program),
  'Developer auditor must be injected natively, not activated with a query flag');
assert(program.includes('ProductDataFolder, "Desktop", "WebView2"'),'Developer profile isolation missing');
assert(program.includes('!StoreDistributionChannel && !DeveloperEdition'),'Developer must not install public updater automatically');
assert(/FoamLensDeveloper\.exe/.test(devInstaller)&&
  !devInstaller.includes('D60D5F20-3D55-4C0E-B8C5-4B7F0A5C9E21')&&
  devInstaller.includes('DefaultDirName={autopf}\\FoamLens Developer'),
  'Developer installer must coexist with separate AppId / folder');
assert(!builder.includes('upload-artifact')&&!builder.includes('gh release'),'Local developer build must not publish publicly');
assert(builder.includes('-p:FoamLensDeveloper=true')&&builder.includes('--developer-audit-self-test'));
assert(script.includes('FOAMLENS_DEVELOPER_AUDIT_V1'));
assert(!script.includes('fetch(')&&!script.includes('sendBeacon('),'No automatic audit exfiltration');
const listeners={};
const window={addEventListener:(name,fn)=>{listeners[name]=fn}};
const document={readyState:'loading',addEventListener:()=>{},querySelector:()=>null};
const context={
  window,document,location:{pathname:'/index.html'},navigator:{userAgent:'CI test agent'},
  innerWidth:1280,innerHeight:800,devicePixelRatio:1,performance:{getEntriesByType:()=>[]},
  URL,Date,RegExp,Object,Array,String,Set,Map,Math,Number,JSON,console
};
vm.runInNewContext(script,context,{timeout:2000});
const audit=window.__foamLensDeveloperAudit;
assert(audit,'Developer script must expose a bounded audit API');
audit.event('runtime-error','Unable to read C:\\Users\\Researcher\\private\\data.txt?token=abcsupersecret','error','browser',
  {stack:'http://foamlens.local/index.html?password=abcsecret'});
const snapshot=audit.snapshot();
assert.strictEqual(snapshot.edition,'FoamLens Developer');
assert.strictEqual(snapshot.checks.status,'not-inspected');
assert.strictEqual(snapshot.observedErrors.length,1);
const json=JSON.stringify(snapshot);
assert(!json.includes('Researcher')&&!json.includes('abcsupersecret')&&!json.includes('abcsecret'),
  'AI exports may not reveal user paths and credentials');
assert(audit.prompt().includes('AI debugging request'));
assert(audit.prompt().includes('No solver execution')||audit.prompt().includes('solver execution'),
  'Export must acknowledge diagnostic scope limitations');
for(let i=0;i<275;i++)audit.event('synthetic-test','incident '+i,'warning','test');
assert(audit.snapshot().observedErrors.length<=200,'Audit must cap captured incident history');
assert(!script.includes('case.data')&&!script.includes('file.contents'));

// Persistent user-authored pinpoint annotations survive app reload in the
// isolated Developer profile. The AI export must preserve both DOM location
// and the full typed comment, without exposing original local user paths.
const memoryStore=new Map();
const storage={getItem:k=>memoryStore.get(k)||null,setItem:(k,v)=>memoryStore.set(k,v)};
const boot=()=>{
  const win={localStorage:storage,addEventListener:()=>{}};
  const doc={readyState:'loading',addEventListener:()=>{},querySelector:()=>null};
  vm.runInNewContext(script,{
    window:win,document:doc,location:{pathname:'/index.html'},
    navigator:{userAgent:'CI Developer regression'},innerWidth:1340,
    innerHeight:900,devicePixelRatio:1,
    performance:{getEntriesByType:()=>[]},URL,Date,RegExp,Object,Array,String,
    Set,Map,Math,Number,JSON,console
  },{timeout:2000});
  return win.__foamLensDeveloperAudit
};
const author=boot();
const target={
  nodeType:1,id:'fcExtra3Viewport',tagName:'DIV',parentElement:null,
  getAttribute:k=>k==='id'?'fcExtra3Viewport':null,
  closest(){return this},
  querySelector:()=>null,
  getBoundingClientRect:()=>({x:36,y:152,width:635,height:504})
};
const locationInfo=author.targetFromElement(target,{x:36+635*.25,y:152+504*.75});
assert.strictEqual(locationInfo.point.x,.25,'Pinpoint location must retain horizontal fractional click position');
assert.strictEqual(locationInfo.point.y,.75,'Pinpoint location must retain vertical fractional click position');
assert.strictEqual(locationInfo.section,'fcExtra3Viewport');
assert(locationInfo.selector.includes('fcExtra3Viewport'),'Precise panel selector must be recorded');
const message='View C mold must be visible beside the metal; the X dimensions are missing. This comment must survive restart.';
const note=author.saveAnnotation(locationInfo,message);
assert(note.id&&note.createdAt);
assert.strictEqual(author.snapshot().sectionAnnotations.length,1);
const reloaded=boot();
const restored=reloaded.snapshot().sectionAnnotations;
assert.strictEqual(restored.length,1,'Developer notes must persist across WebView2 navigation/restarts');
assert.strictEqual(restored[0].comment,message);
assert.strictEqual(restored[0].section,'fcExtra3Viewport');
assert.strictEqual(restored[0].selector,locationInfo.selector);
assert.strictEqual(restored[0].point.x,.25,'Precise click location must persist');
assert(reloaded.prompt().includes('Selected point within element'),'AI prompt must include precise relative pin position');
assert(reloaded.prompt().includes(message),'AI prompt must include developer-authored comment');
assert(reloaded.prompt().includes('DOM target selector'),'AI prompt must include exact section location');
const longer='The Field A/B region selector is inconsistent: '+('x'.repeat(1700));
reloaded.saveAnnotation(locationInfo,longer,note.id);
assert.strictEqual(reloaded.annotationsSnapshot().length,1,'Editing must update existing annotation');
assert.strictEqual(reloaded.snapshot().sectionAnnotations[0].comment.length,1700+('The Field A/B region selector is inconsistent: '.length));
const secrets=reloaded.saveAnnotation(locationInfo,'Do not share C:\\Users\\SensitiveOwner\\private\\case with token=verysecret');
assert(!reloaded.prompt().includes('SensitiveOwner'),'Prompt must redact local paths in explicit comments');
assert(!reloaded.prompt().includes('verysecret'),'Prompt must redact obvious token assignments in comments');
assert(reloaded.removeAnnotation(secrets.id),'Developer must be able to delete a note');
assert.strictEqual(boot().snapshot().sectionAnnotations.length,1,'Deletion must persist across restarts');

console.log('FoamLens Developer twin regression PASS: separate binary/profile, private build, audit privacy and bounded AI prompt export.');
