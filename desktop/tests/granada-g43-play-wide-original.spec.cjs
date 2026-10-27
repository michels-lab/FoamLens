'use strict';
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),vm=require('node:vm');
const root=path.join(__dirname,'..','src','FoamLensDesktop','frontend');
const source=fs.readFileSync(path.join(root,'v33-granada-wide-play-cascade-guard.js'),'utf8');
const compact=fs.readFileSync(path.join(root,'v27-granada-compact-workbench.js'),'utf8');
const wide=fs.readFileSync(path.join(root,'v31-granada-wide-field-ribbon.js'),'utf8');
new Function(source);new Function(compact);new Function(wide);
const styles=[];
const play={
 textContent:'▶ Play ↻',
 clientWidth:68,scrollWidth:68,
 getBoundingClientRect:()=>({left:48,right:118.390625,width:70.390625,height:30}),
 getAttribute:k=>k==='aria-label'?'Play continuously in a loop':null
};
const transport={contains:x=>x===play};
const panel={classList:{contains:k=>k==='active'}};
const app={classList:{contains:k=>false}};
const body={classList:{contains:k=>['flRibbonReady','appMode-field'].includes(k)}};
const items={fwTimePlay:play,fwTimeTransport:transport,'flRibbonPanel-field':panel,appShell:app};
const doc={
 readyState:'complete',body,
 getElementById:id=>items[id]||null,
 createElement:tag=>{assert.equal(tag,'style');return{id:'',textContent:''}},
 head:{appendChild:el=>styles.push({id:el.id,css:el.textContent})}
};
const window={innerWidth:1140,innerHeight:900};
const ctx={document:doc,window,getComputedStyle:()=>({
 minWidth:'68px',maxWidth:'100%',width:'70.3906px',display:'inline-flex',
 flexShrink:'1',boxSizing:'border-box',fontSize:'12px'
})};
vm.runInNewContext(source,ctx);
assert.equal(styles.length,1,'Only one versioned original guard sheet may be installed');
assert.equal(styles[0].id,'flG16WidePlayCascadeGuard');
const audit=window.FoamLensGranadaG16.audit();
assert.equal(audit.active,true,'Failing 1140px original Field mode is eligible');
assert.equal(audit.result,'FAIL','Do not fake green status for actual 70px rendered Play');
assert.equal(audit.staleG7CompactClassAtWideWidth,false,'This failure MUST lack compact class');
assert.equal(audit.originalTransportContainsPlay,true);
assert.equal(audit.computedWidth,'70.3906px');
assert.equal(audit.computedMinWidth,'68px');
assert.equal(audit.computedFlexShrink,'1');
assert.equal(audit.nativeInstalledOrPhysicalDpiApproved,false);
const css=styles[0].css;
assert(css.startsWith('@media(min-width:1025px) and (max-width:1250px){'));
const rules=[...css.matchAll(/([^{}]+)\{([^{}]+)\}/g)].map(x=>({selector:x[1].trim(),body:x[2]}));
const target='#flRibbonPanel-field #fwTimeTransport #fwTimePlay';
const independent=rules.find(r=>r.selector===target);
assert(independent,'Previously broken 1140px noncompact Field needs its OWN rule independent of gfwCompact');
assert(/(?:^|;)min-width:112px!important(?:;|$)/.test(independent.body),
 'Original 70px Play must never be allowed at eligible wide Field width');
assert(/width:max-content!important/.test(independent.body));
assert(/max-width:none!important/.test(independent.body));
assert(/flex-shrink:0!important/.test(independent.body));
assert(!independent.selector.includes('gfwCompact'),'A stale compact-class gate recreates the original native miss');
// Regression against the original G16 guard, which only selected the compact state.
const prior=rules.filter(r=>r.selector.includes('gfwCompact')&&r.selector.includes('#fwTimePlay'));
assert.equal(prior.length,1,'Preserve the original G16 compact-state safeguard for regression');
assert(prior.every(r=>!app.classList.contains('gfwCompact')&&r.selector.includes('.gfwCompact')),
 'Earlier compact-only guard cannot apply to an original noncompact failure');
assert(compact.includes("'@media(max-width:1024px){'"),
 'Existing G22 compact rules MUST remain physically scoped');
assert(wide.includes("'body.flRibbonReady.appMode-field #flRibbonPanel-field #fwTimePlay{"),
 'G12 original 112px Play baseline must still exist');
// The scoped CSS selector names only the original Field host, original transport and original Play.
// It must NOT add a duplicate control or modify actual solver/rendering state.
assert(!source.includes('createElement(\'button\')'));
assert.equal(styles.length,1);
console.log('Granada G43 P0 original Play wide guard PASS: reproduces 70px noncompact failure, keeps fail-closed audit, and supplies class-independent 112px scoped correction.');
