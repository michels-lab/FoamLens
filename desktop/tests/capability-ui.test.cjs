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

for(const name of ['physical','flow','solidification','thermal']){
  assert(files[name].includes("box.style.display=''"),name+' domain analysis panel should remain visible.');
  assert(files[name].includes('flSetIssue'),name+' must explain missing source data instead of silently hiding.');
}
assert(files.physical.includes("gb.style.display=''"),'Physical Analysis spatial-gradient block must remain visible.');

assert(!files.vector.includes("document.getElementById('paTools')||document.getElementById('differenceTools')"),'Vector tools must not be nested inside Physical Analysis.');
console.log('Capability-driven UI regression suite passed: all seven analysis modules remain visible and diagnose missing capabilities/inputs.');
