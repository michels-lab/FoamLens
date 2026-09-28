'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const base=path.join(__dirname,'..','src','FoamLensDesktop','frontend');
const index=fs.readFileSync(path.join(base,'index.html'),'utf8');
const generalFiles=[
  'v13-temporal-alignment.js',
  'v13-numerical-performance.js',
  'v13-physical-analysis.js',
  'v13-vector-fields.js',
  'v13-flow-analysis.js',
  'v13-solidification-analysis.js',
  'v13-thermal-analysis.js'
];
const passed=[];function test(name,fn){fn();passed.push(name)}

test('General Analysis has its own host and navigation',()=>{
  assert(index.includes('id="generalAnalysisTools"'));
  assert(index.includes('id="generalAnalysisModules"'));
  assert(index.includes('data-analysis="general" id="generalAnalysisNav"'));
  assert(index.includes("else if(kind==='general')"));
  assert(index.includes("document.querySelectorAll('.analysisSubBtn').forEach"));
});

test('General Analysis visibility is capability-driven',()=>{
  assert(index.includes('function refreshGeneralAnalysisHost(){'));
  assert(index.includes("host.style.display=visible?'':'none'"));
  assert(index.includes("nav.classList.toggle('pmHidden',!visible)"));
});

test('general v1.3 modules do not mount inside Difference',()=>{
  for(const file of generalFiles){
    const js=fs.readFileSync(path.join(base,file),'utf8');
    assert(js.includes("document.getElementById('generalAnalysisModules')"),file+' is not mounted in General Analysis.');
    assert(!js.includes("document.getElementById('differenceTools')"),file+' still mounts inside Difference.');
    assert(js.includes('refreshGeneralAnalysisHost'),file+' does not refresh General Analysis visibility.');
  }
});

test('Spatial Differences remains inside Difference',()=>{
  const js=fs.readFileSync(path.join(base,'v13-spatial-differences.js'),'utf8');
  assert(js.includes("document.getElementById('differenceTools')"));
  assert(!js.includes("document.getElementById('generalAnalysisModules')"));
});

test('General Analysis title is bilingual',()=>{
  assert(index.includes("'Análisis general':'General Analysis'"));
});


test('collapsed settings panel always exposes a restore handle above navigation',()=>{
  assert(index.includes('.sidebarToggle{position:absolute;z-index:360;'));
  assert(index.includes('.app.sidebarCollapsed .sidebarToggle{position:fixed;left:10px;top:50%;transform:translateY(-50%);z-index:460'));
  assert(index.includes("collapsed?'›':'‹'"));
  assert(index.includes("'Mostrar panel de ajustes':'Show settings panel'"));
});

test('Cases quick panel renders above navigation without viewport overflow',()=>{
  assert(index.includes('.top{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;min-height:72px;padding:10px 20px;border-bottom:1px solid var(--line);background:rgba(255,255,255,.90);backdrop-filter:blur(12px);position:relative;z-index:300;overflow:visible}'));
  assert(index.includes('.caseQuickPanel{position:absolute;right:0;top:calc(100% + 8px);z-index:420;'));
  assert(index.includes('max-height:min(420px,calc(100vh - 110px))'));
  assert(index.includes('.modeNavBar{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 14px;border-bottom:1px solid var(--line);background:var(--panel2);min-width:0;position:relative;z-index:120}'));
});

console.log('Analysis UI organization regression suite passed: '+passed.length+' checks.');
for(const name of passed)console.log('  ✓ '+name);
