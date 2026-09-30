'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const base=path.join(__dirname,'..','src','FoamLensDesktop','frontend');
const files={
  temporal:fs.readFileSync(path.join(base,'v13-temporal-alignment.js'),'utf8'),
  numerical:fs.readFileSync(path.join(base,'v13-numerical-performance.js'),'utf8'),
  physical:fs.readFileSync(path.join(base,'v13-physical-analysis.js'),'utf8'),
  vector:fs.readFileSync(path.join(base,'v13-vector-fields.js'),'utf8'),
  flow:fs.readFileSync(path.join(base,'v13-flow-analysis.js'),'utf8'),
  solidification:fs.readFileSync(path.join(base,'v13-solidification-analysis.js'),'utf8'),
  thermal:fs.readFileSync(path.join(base,'v13-thermal-analysis.js'),'utf8')
};

const alwaysVisible=[
  ['temporal',"box.style.display=''"],
  ['numerical',"box.style.display=''"],
  ['vector',"box.style.display=''"]
];
for(const [name,token] of alwaysVisible){
  assert(files[name].includes(token),name+' capability panel should remain visible.');
  assert(files[name].includes('flSetIssue'),name+' must explain missing/incompatible capability instead of silently hiding.');
}

const contextual=[
  ['physical',"box.style.display=(sources.length||profiles.length)?'':'none'"],
  ['flow',"box.style.display=src.length?'':'none'"],
  ['solidification',"box.style.display=src.length?'':'none'"],
  ['thermal',"box.style.display=src.length?'':'none'"]
];
for(const [name,token] of contextual)assert(files[name].includes(token),name+' contextual module gating changed unexpectedly.');

assert(!files.vector.includes("document.getElementById('paTools')||document.getElementById('differenceTools')"),'Vector tools must not be nested inside Physical Analysis.');
console.log('Capability-driven UI regression suite passed: always-visible capability tools diagnose gaps; contextual domain modules gate only when irrelevant.');
