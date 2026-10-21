'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {compare,flatten}=require('./audit-diff.cjs');
test('detects hidden, clipped, disabled and lost controls',()=>{const a=[{tab:'Field',id:'time'},{tab:'Field',id:'legend'},{tab:'Data',id:'build'},{tab:'Live',id:'status'}];const b=[{tab:'Field',id:'time',hidden:true},{tab:'Field',id:'legend',clipped:true},{tab:'Data',id:'build',disabled:true}];const r=compare(a,b);assert.equal(r.regressions.length,3);assert.equal(r.removed.length,1);});
test('detects improvement and new controls',()=>{const r=compare([{tab:'Field',id:'camera',hidden:true}],[{tab:'Field',id:'camera'},{tab:'Field',id:'axes'}]);assert.equal(r.improvements.length,1);assert.equal(r.newControls.length,1);});
test('does not reveal raw text or private paths',()=>{const r=compare({path:'C:/private',controls:[{tab:'Data',id:'load',text:'PRIVATE'}]},{controls:[{tab:'Data',id:'load',message:'Bearer SECRET'}]});assert.doesNotMatch(JSON.stringify(r),/private|PRIVATE|SECRET|Bearer/);});
test('rejects duplicate locator keys',()=>assert.throws(()=>compare([{tab:'Data',id:'x'},{tab:'Data',id:'x'}],[]),/Duplicate/));
test('rejects unbounded nesting',()=>{let x={id:'ok'};for(let i=0;i<30;i++)x={inner:x};assert.throws(()=>flatten(x),/Maximum nesting/);});
