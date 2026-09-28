'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const frontend=path.join(__dirname,'..','src','FoamLensDesktop','frontend');
const read=name=>fs.readFileSync(path.join(frontend,name),'utf8');
const index=read('index.html');
const modules=[
  'v13-flow-analysis.js',
  'v13-numerical-performance.js',
  'v13-performance-controls.js',
  'v13-physical-analysis.js',
  'v13-solidification-analysis.js',
  'v13-spatial-differences.js',
  'v13-temporal-alignment.js',
  'v13-thermal-analysis.js',
  'v13-vector-fields.js'
];
const src=Object.fromEntries(modules.map(name=>[name,read(name)]));
const passed=[];const test=(name,fn)=>{fn();passed.push(name)};

test('core bilingual helpers and live language event are present',()=>{
  assert(index.includes("function flUi(en,es)"));
  assert(index.includes("function flApplyBilingualText(root=document)"));
  assert(index.includes("foamlens-language-change"));
  assert(index.includes("Monitorear ejecución"));
  assert(index.includes("VISTA PREVIA DE EXPORTACIÓN"));
  assert(index.includes("Todas las variables"));
  assert(index.includes("No se pudieron guardar los valores predeterminados del navegador."));
});

test('Spanish review/health presentation never exposes internal English state codes directly',()=>{
  assert(index.includes("function reviewStateLabel(v)"));
  assert(index.includes("function reviewText(value)"));
  assert(index.includes("function reviewCategoryLabel(key"));
  assert(index.includes("reviewStateLabel(wh.state)"));
  assert(index.includes("reviewText(wh.reason)"));
  assert(index.includes("reviewCategoryLabel(x.key,x.label)"));
  assert(index.includes("reviewStateLabel(h.runStatus)"));
});

test('v1.3 analysis modules support live bilingual rerendering',()=>{
  for(const [name,text] of Object.entries(src)){
    assert(text.includes('foamlens-language-change'),name+' must react to live language changes');
    if(name!=='v13-performance-controls.js')assert(text.includes('data-fl-es='),name+' must expose Spanish UI copy');
  }
});

test('major v1.3 modules contain Spanish user-facing copy',()=>{
  const required={
    'v13-flow-analysis.js':['Análisis de flujo','Analizar señal de flujo'],
    'v13-numerical-performance.js':['Rendimiento numérico','Tiempo físico [s]'],
    'v13-physical-analysis.js':['Análisis físico general','Balance de energía / potencia'],
    'v13-solidification-analysis.js':['Análisis de solidificación','Crear tasas de solidificación + refusión'],
    'v13-spatial-differences.js':['Comparación cuantitativa espacial','Comparar perfiles'],
    'v13-temporal-alignment.js':['Alineación temporal','Alinear + comparar'],
    'v13-thermal-analysis.js':['Análisis térmico','Analizar señal térmica'],
    'v13-vector-fields.js':['Campos vectoriales genéricos','Agregar magnitud']
  };
  for(const [name,needles] of Object.entries(required))for(const needle of needles)assert(src[name].includes(needle),name+' missing '+needle);
});

test('layout hardening prevents common Spanish-label overflow regressions',()=>{
  assert(index.includes('.row2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}'));
  assert(index.includes('.row3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}'));
  assert(index.includes('white-space:normal;line-height:1.25;min-width:0;overflow-wrap:anywhere'));
  assert(index.includes('.field{margin-bottom:9px;min-width:0}'));
  assert(!index.includes('.row2{display:grid;grid-template-columns:1fr 1fr;gap:8px}'));
});

test('known Spanish copy regressions stay removed',()=>{
  for(const banned of [
    'workspace de análisis de OpenFOAM',
    'revisa findings basados en evidencia',
    "'Watch Run','Watch Run'",
    "'Leyendo metadata'",
    "'Finalizando workspace'",
    "'Workspace listo'",
    "'Sin findings visibles.'"
  ])assert(!index.includes(banned),'Regression returned: '+banned);
  assert(index.includes("paper:'Artículo'"),'Spanish Paper label must stay translated.');
});

console.log('Bilingual/UX regression suite passed: '+passed.length+' checks.');
for(const name of passed)console.log('  ✓ '+name);
