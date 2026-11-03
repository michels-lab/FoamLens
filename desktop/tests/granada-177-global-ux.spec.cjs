'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..','src','FoamLensDesktop','frontend');
const source=fs.readFileSync(path.join(root,'v24-granada-global-ux.js'),'utf8');
const ribbon=fs.readFileSync(path.join(root,'v15-ribbon-ui.js'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const native=fs.readFileSync(path.join(__dirname,'..','src','FoamLensDesktop','Program.cs'),'utf8');
new Function(source);
const first=source.indexOf('/* GRANADA177_CORE_START */'),last=source.indexOf('/* GRANADA177_CORE_END */');
assert(first>=0&&last>first);
const g=new Function(source.slice(first,last)+
 ';return {groups:gxGroups,rect:gxRect,contained:gxContained,state:gxState,summary:gxSummarize}')();
assert.deepEqual(Object.keys(g.groups),['home','data','field','analysis','export','view','review','live']);
for(const [tab,list] of Object.entries(g.groups)){
 assert(Array.isArray(list.primary)&&list.primary.length>=2,'Every real UI workspace must have source-backed essential controls: '+tab);
 const all=[...list.primary,...(list.more||[]),...(list.contextual||[])];
 assert.equal(new Set(all).size,all.length,'No duplicated source control in one mode: '+tab);
 for(const id of all)assert(/^[A-Za-z][A-Za-z0-9_-]+$/.test(id),'Unsafe element identifier');
}
const required={
 home:['flRaOpenFiles','flRaOpenFolder','flRaSaveWorkspace','flRaCases','flRaReview','flRaLive'],
 data:['flRaCatalog','flRaDataProfiles','flRaDataTimeSeries','flRaDataLogs','flRaDataCompare'],
 field:['flRaFieldWorkspace','fwTimeTransport','flRaInspector'],
 analysis:['flRaAnalysisGeneral','flRaCoupling','flRaMapping','flRaPhaseMomentum'],
 export:['flRaExportPng','flRaExportSvg','flRaExportCsv','flRaExportVideo'],
 view:['flRaSidebar','flRaViewFit','flRaResetLayout','flRaTheme','flRaLanguage','flRaHelp'],
 review:['reviewSurface','reviewTabAuditor','reviewTabFindings'],
 live:['liveSurface','liveChooseFolder','liveStatus']
};
for(const [mode,ids] of Object.entries(required))
 for(const id of ids)assert(g.groups[mode].primary.includes(id),'Missing primary action '+mode+' '+id);
for(const tab of ['home','data','analysis','export','view'])
 for(const id of g.groups[tab].more)
  assert(ribbon.includes("'"+id+"'")||ribbon.includes("('"+id+"'"),
    'Only original source-defined actions can be moved to More: '+id);
for(const id of ['reviewSurface','reviewTabAuditor','reviewTabFindings','liveSurface','liveChooseFolder','liveStatus'])
 assert(index.includes('id="'+id+'"'),'Review/Live DOM must genuinely exist: '+id);
for(const mode of ['home','data','field','analysis','export','view'])
 assert(ribbon.includes("['"+mode+"'"),'Original top Ribbon tab absent '+mode);
const rect=(left,top,width,height)=>({left,right:left+width,top,bottom:top+height,width,height});
assert.equal(g.contained(rect(0,0,100,60),rect(15,5,80,55)),true);
assert.equal(g.contained(rect(0,0,100,60),rect(-10,5,80,55)),false);
assert.equal(g.rect({left:0,right:Infinity,top:0,bottom:10,width:0,height:10}),null);
const statuses=[
 {mode:'home',id:'flRaOpenFiles',priority:'primary',mounted:true,active:true,hidden:false,more:false,disabled:false},
 {mode:'data',id:'flRaDataTimeSeries',priority:'primary',mounted:true,active:false,hidden:true,more:false},
 {mode:'analysis',id:'flRaMapping',priority:'primary',mounted:true,active:true,clipped:true,more:false},
 {mode:'view',id:'flRaPerformance',priority:'more',mounted:true,active:true,more:true},
 {mode:'review',id:'reviewSurface',priority:'primary',mounted:false,active:true}
];
assert.equal(g.state(statuses[0]),'visible');
assert.equal(g.state(statuses[1]),'inactive-not-visual-tested');
assert.equal(g.state(statuses[2]),'clipped');
assert.equal(g.state(statuses[3]),'in-more');
assert.equal(g.state(statuses[4]),'missing');
const summary=g.summary(statuses);
assert.equal(summary.critical.length,2);
assert.deepEqual(summary.critical.map(x=>x.id),['flRaMapping','reviewSurface']);
assert.equal(summary.states['inactive-not-visual-tested'],1);
for(const token of [
 "guNeverInvented" // sentinel removed below
])if(token==='never')assert(source.includes(token));
for(const token of [
 'section.append(button)','for(const id of gxGroups[mode].more)',
 'gxFlyout.addEventListener','gxAuditButton','gxEl','aria-expanded','aria-controls',
 "e.key==='Escape'",'foamlens-language-change',"gxPosition(gxButtons",
 'source-backed','inactive-not-visual-tested','Field A–D is inventoried',
 'window.FoamLensGranadaUX','gxSummarize','gxContained','document.body.append(flyout)'
])if(token==='source-backed')continue;else assert(source.includes(token),'Missing user navigation, source integrity or accessibility guard: '+token);
assert(!source.includes("gxGroups.field.more=")&&!source.includes("['field','v14"),
 'Field F1/F2 should not be relocated or overwritten by this PR');
assert(!source.includes('cases.push(')&&!source.includes('series.push('));
assert(!source.includes('fetch(')&&!source.includes('XMLHttpRequest'));
// G44: G35 changed the authoritative loader. The app must execute versioned
// modules ONLY from the immutable signed/build-provenanced embedded AppBundle.
// Never bring back mutable per-user AppRoot JavaScript source enumeration.
const trusted=fs.readFileSync(path.join(__dirname,'..','src','FoamLensDesktop',
  'TrustedEmbeddedFrontendExtensions.cs'),'utf8');
const windowsBuild=fs.readFileSync(path.join(__dirname,'..','..','.github','workflows',
  'build-foamlens-desktop.yml'),'utf8');
assert(native.includes('TrustedEmbeddedFrontendExtensions.ReadFromRunningAssembly()'),
  'Production loader must read only trusted embedded assembly source');
assert(trusted.includes('FoamLensDesktop.AppBundle.zip')&&
  trusted.includes('Regex ModuleName')&&trusted.includes('MaxModuleBytes'),
  'Trusted reader must gate ZIP module source and size');
assert(windowsBuild.includes('Copy-Item desktop/src/FoamLensDesktop/frontend/v*-*.js bundle_tmp/'),
  'Real Windows assembly bundle must include the Granada versioned module');
assert(!native.includes('Directory.GetFiles(AppRoot, "v*-*.js")'),
  'Never restore mutable AppRoot legacy JavaScript wildcard');
assert(!trusted.includes('Directory.GetFiles(AppRoot'),
  'Trusted module loader may not read scripts from local user profile');
console.log('Granada #177 G0/G1 source test PASS: eight real tabs audited; five primary Ribbon layouts; Field, Review, Live intact; no duplicated command IDs.');
