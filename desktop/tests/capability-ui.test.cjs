'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const base=path.join(__dirname,'..','src','FoamLensDesktop','frontend');
const files={
  temporal:fs.readFileSync(path.join(base,'v13-temporal-alignment.js'),'utf8'),
  numerical:fs.readFileSync(path.join(base,'v13-numerical-performance.js'),'utf8'),
  physical:fs.readFileSync(path.join(base,'v13-physical-analysis.js'),'utf8'),
  vector:fs.readFileSync(path.join(base,'v13-vector-fields.js'),'utf8')
};
const checks=[
  ['temporal', "box.style.display=src.length>=2?'':'none'"],
  ['numerical', "box.style.display=ids.length?'':'none'"],
  ['physical', "box.style.display=sources.length?'':'none'"],
  ['vector', "box.style.display=groups.length?'':'none'"]
];
for(const [name,token] of checks)assert(files[name].includes(token),name+' module is not capability-gated.');
assert(!files.vector.includes("document.getElementById('paTools')||document.getElementById('differenceTools')"),'Vector tools must not be nested inside Physical Analysis.');
console.log('Capability-driven UI regression suite passed: '+checks.length+' modules hide irrelevant controls and remain independently visible.');
