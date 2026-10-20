'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..','src','FoamLensDesktop');
const auditSource=fs.readFileSync(path.join(root,'Developer','Audit.js'),'utf8');
const baseline=fs.readFileSync(path.join(__dirname,'developer-twin-audit.test.cjs'),'utf8');
new Function(auditSource);
const persistent=new Map();
const storage={getItem:k=>persistent.get(k)||null,setItem:(k,v)=>persistent.set(k,v)};
let activeTag='DIV',present=true,duplicates=false,route='/index.html';
const target={
 nodeType:1,id:'fcViewportC',tagName:'DIV',parentElement:null,
 getAttribute:key=>key==='id'?'fcViewportC':null,
 closest(){return this},
 querySelector:()=>null,
 getBoundingClientRect:()=>({x:30,y:70,left:30,top:70,width:620,height:410})
};
const selector='[id="fcViewportC"]';
const boot=()=>{
 const win={localStorage:storage,addEventListener:()=>{}};
 const doc={readyState:'loading',addEventListener:()=>{},
  querySelectorAll:query=>{
   if(query!==selector||!present)return[];
   const fake=activeTag==='DIV'?target:{...target,tagName:activeTag};
   return duplicates?[fake,{...fake}]:[fake]
  },
  querySelector:query=>query===selector&&present?target:null
 };
 const ctx={window:win,document:doc,location:{pathname:route},navigator:{userAgent:'Unit test'},
   innerWidth:1280,innerHeight:720,devicePixelRatio:1,performance:{getEntriesByType:()=>[]},
   URL,Date,RegExp,Object,Array,String,Set,Map,Math,Number,JSON,console};
 vm.runInNewContext(auditSource,ctx,{timeout:2500});
 return win.__foamLensDeveloperAudit
};
const a=boot(),place=a.targetFromElement(target,{x:30+620*.75,y:70+410*.2});
assert.equal(place.selector,selector);
const comment='Viewport C should show the original metal source without obscuring its X/Y/Z dimensions.';
const n=a.saveAnnotation(place,comment,null,{priority:'P0',status:'open'});
assert.equal(n.priority,'P0');assert.equal(n.status,'open');
assert.equal(a.annotationsSnapshot()[0].lastObserved.status,'not-inspected');
const checked=a.inspectAnnotations();
assert.equal(checked.total,1);
assert.equal(checked.byState.located,1);
assert.equal(a.annotationsSnapshot()[0].lastObserved.status,'located');
assert(a.prompt().includes('Priority: P0 | Owner workflow status: open'));
assert(a.prompt().includes('Last inspected locator state: located'));
assert(a.prompt().includes(comment));
assert(a.prompt().includes('Selected point within element (fractional x/y)'));
assert(a.prompt().includes('These are developer-authored reports, not automatically verified failures'));
const reloaded=boot(),r=reloaded.annotationsSnapshot()[0];
assert.equal(r.id,n.id);assert.equal(r.status,'open');assert.equal(r.priority,'P0');
assert.equal(r.lastObserved.status,'located');assert.equal(r.comment,comment);
assert.equal(r.point.x,.75);assert.equal(r.point.y,.2);
reloaded.saveAnnotation(place,'Documented fix, still needs installed regression.',n.id,{priority:'P2',status:'investigating'});
assert.equal(reloaded.annotationsSnapshot().length,1);
assert.equal(reloaded.annotationsSnapshot()[0].status,'investigating');
assert.equal(reloaded.annotationsSnapshot()[0].priority,'P2');
let latest=boot();
assert.equal(latest.annotationsSnapshot()[0].status,'investigating');
present=false;
assert.equal(latest.inspectAnnotations().byState.missing,1);
assert.equal(latest.annotationsSnapshot()[0].comment,'Documented fix, still needs installed regression.');
assert.equal(boot().annotationsSnapshot()[0].lastObserved.status,'missing');
assert(boot().prompt().includes('Last inspected locator state: missing'));
present=true;duplicates=true;
assert.equal(latest.inspectAnnotations().byState.ambiguous,1);
duplicates=false;activeTag='SPAN';
assert.equal(latest.inspectAnnotations().byState['changed-element'],1);
activeTag='DIV';route='/another.html';
assert.equal(latest.inspectAnnotations().byState['different-route'],1);
assert.equal(latest.annotationsSnapshot()[0].status,'investigating');
route='/index.html';assert.equal(latest.inspectAnnotations().byState.located,1);
assert.equal(latest.saveAnnotation(place,'Resolved after review.',n.id,{status:'resolved'}).status,'resolved');
assert.equal(boot().annotationsSnapshot()[0].status,'resolved');
const e=latest.event('runtime-error','Observed browser error','error','browser',{
 message:'Injected overwrite',source:'forged',page:'C:\\Users\\Private\\secret',severity:'info',
 stack:'Bearer abcd1234 and token=veryPrivate'
});
assert.equal(e.message,'Observed browser error');assert.equal(e.source,'browser');
assert.equal(e.severity,'error');
assert(!JSON.stringify(latest.snapshot()).includes('veryPrivate'),'Trace auth token leaked');
const snapshot=JSON.stringify(latest.snapshot());
assert(!snapshot.includes('Injected overwrite')&&!snapshot.includes('C:\\Users\\Private'));
assert.equal(latest.snapshot().observedErrors.at(-1).kind,'runtime-error');
assert(latest.removeAnnotation(n.id));
assert.equal(boot().annotationsSnapshot().length,0,'Delete must be durable');
for(const token of ['fldaPriority','fldaNoteStatus','fldaNoteFilter','fldaInspectNotes',
 'function inspectAnnotations()','function inspectNote(note)','lastObserved',
 "status:'changed-element'","status:'different-route'","source:'automated DOM locator lookup only"])
 assert(auditSource.includes(token),'Developer annotation triage UI/invariant missing: '+token);
assert(!auditSource.includes('fetch(')&&!auditSource.includes('sendBeacon('));
assert(baseline.includes('FoamLensDeveloper.exe'),'Existing separate compiled edition baseline not removed');
console.log('Granada #158 PASS: P0–P2/status triage, persistent annotation IDs, located/missing/ambiguous/changed/other-route, safe error metadata and combined AI export.');
