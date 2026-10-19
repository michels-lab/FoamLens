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
console.log('FoamLens Developer twin regression PASS: separate binary/profile, private build, audit privacy and bounded AI prompt export.');
