'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.resolve(__dirname,'../desktop/src/FoamLensDesktop/frontend/v27-granada-compact-workbench.js'),'utf8');
function actualStyle(){
  const from=source.indexOf('function style(){'),to=source.indexOf('function install(){');
  assert(from>0&&to>from,'original G7 function style ownership not found');
  const snippet=source.slice(from,to);const appended=[];
  vm.runInNewContext('const byId=()=>null;'+snippet+'\nstyle();',{
    document:{createElement:tag=>({tagName:tag,textContent:'',id:''}),head:{append:tag=>appended.push(tag)}}
  },{timeout:1500});
  assert.equal(appended.length,1,'original G7 style must be installed once');
  return appended[0].textContent;
}
function declarationRules(css){
  const out=[],stack=[];let cursor=0,match;
  const re=/([^{}]+)\{|}/g;
  while((match=re.exec(css))){
    if(match[0]==='}'){assert(stack.length>0,'invalid unmatched G7 CSS close brace');stack.pop();continue;}
    const selector=match[1].trim();
    if(!selector)throw Error('empty selector');
    if(!selector.startsWith('@'))out.push({selector,media:stack.filter(s=>s.startsWith('@media'))});
    stack.push(selector);cursor=re.lastIndex;
  }
  assert.equal(stack.length,0,'original source styles must have balanced media braces');
  return out;
}
function ruleApplies(rule,width){
  return rule.media.every(m=>!(/max-width:(\d+)px/.test(m))||width<=Number(m.match(/max-width:(\d+)px/)[1]));
}
test('G22: EVERY original G7 compact selector is physically gated at 1024 CSS px',()=>{
  const rules=declarationRules(actualStyle()).filter(r=>r.selector.includes('.gfwCompact'));
  assert(rules.length>=20,'original G7 scientific UI rules unexpectedly absent');
  for(const rule of rules){
    assert(rule.media.includes('@media(max-width:1024px)'), 'compact CSS outside real breakpoint: '+rule.selector);
    assert.equal(ruleApplies(rule,480),true,'compact screen lost original rule');
    assert.equal(ruleApplies(rule,1140),false,'actual original P0 wide Field regression possible');
    assert.equal(ruleApplies(rule,1250),false,'laptop must stay wide');
  }
  assert(rules.some(r=>r.selector.includes('#fwTimePlay')&&r.media.includes('@media(max-width:1024px)')));
  assert(rules.some(r=>r.selector.includes('#workspace')));
});
test('G22: 1024 compact boundary exact; 1025 never executes CSS even with stale G7 JS class',()=>{
 const r=declarationRules(actualStyle()).find(q=>q.selector.includes('#fwTimePlay'));
 assert(r);for(const width of [320,640,1024])assert.equal(ruleApplies(r,width),true);
 for(const width of [1025,1140,1200,1250,1920])assert.equal(ruleApplies(r,width),false);
});
test('G22: fail closed if original rule escapes into an unscoped style block',()=>{
 const css=actualStyle()+"\nbody.appMode-field .app.gfwCompact #fwTimePlay{min-width:68px!important}";
 const rules=declarationRules(css).filter(r=>r.selector.includes('.gfwCompact'));
 assert(rules.some(r=>!r.media.includes('@media(max-width:1024px)')),'unsafe source should be detected');
});
test('G22: desktop controls, compact overlays and scientific JS are left intact',()=>{
 const css=actualStyle();
 const rules=declarationRules(css);
 assert(rules.some(r=>r.selector.includes('.gfwTrigger')&&r.media.length===0),'normal hidden trigger remains styled');
 assert(rules.some(r=>r.selector.includes('.gfwBackdrop')&&r.media.length===0),'normal overlay defaults stay safe');
 assert(source.includes("window.addEventListener('resize',sync)"));
 assert(source.includes("compactBreakpoint.addEventListener('change',sync)"));
 assert(!source.includes('document.getElementById(\'fwTimePlay\').style'));
 assert(!source.includes('setAppMode('));
});
