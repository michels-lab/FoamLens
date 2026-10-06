'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const index=fs.readFileSync(path.join(__dirname,'..','src','FoamLensDesktop','frontend','index.html'),'utf8');

function sliceCore(begin,end){
  const a=index.indexOf(begin),b=index.indexOf(end,a);
  assert(a>=0&&b>a,'Missing parser core '+begin);
  return index.slice(a,b+end.length);
}
function tokenize(line){
  const out=[];let i=0;
  while(i<line.length){
    while(i<line.length&&/\s/.test(line[i]))i++;
    if(i>=line.length)break;
    if(line[i]==='('){
      let j=i+1,depth=1;
      while(j<line.length&&depth){if(line[j]==='(')depth++;if(line[j]===')')depth--;j++}
      out.push(line.slice(i,j));i=j
    }else{let j=i;while(j<line.length&&!/\s/.test(line[j]))j++;out.push(line.slice(i,j));i=j}
  }
  return out
}
function parseParen(s){return(s.match(/[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?/g)||[]).map(Number)}

const temporalCore=sliceCore('/* FOAMLENS_INCREMENTAL_TEMPORAL_CORE_START */','/* FOAMLENS_INCREMENTAL_TEMPORAL_CORE_END */');
const fieldCore=sliceCore('/* FOAMLENS_INCREMENTAL_FIELD_CORE_START */','/* FOAMLENS_INCREMENTAL_FIELD_CORE_END */');
const temporal=new Function('tokenize','parseParen',temporalCore+'\nreturn {flTemporalParseState,flParseTemporalLine,flConsumeTemporalChunk};')(tokenize,parseParen);
const field=new Function(fieldCore+'\nreturn {pmLargeFieldState,pmParseLargeFieldValueLine,pmConsumeLargeFieldChunk};')();

function feedChunks(state,text,consume){
  const widths=[65537,131071,32771,262147,98317];let offset=0,i=0;
  while(offset<text.length){
    const end=Math.min(text.length,offset+widths[i++%widths.length]);
    consume(state,text.slice(offset,end),false);offset=end;
    if(state.done)break;
  }
}

const passed=[];function test(name,fn){fn();passed.push(name)}

test('large temporal table keeps 160k rows exact across irregular chunks',()=>{
  const n=160000,rows=new Array(n);
  for(let i=0;i<n;i++)rows[i]=i+' '+(i%997)+'\n';
  const st=temporal.flTemporalParseState();
  feedChunks(st,rows.join(''),temporal.flConsumeTemporalChunk);
  if(st.carry)temporal.flParseTemporalLine(st.carry,st);
  assert.strictEqual(st.columns[0].t.length,n);
  assert.strictEqual(st.columns[0].y.length,n);
  assert.strictEqual(st.columns[0].t[0],0);
  assert.strictEqual(st.columns[0].t[n-1],n-1);
  assert.strictEqual(st.columns[0].y[123456],123456%997);
  assert(!('rows' in st),'Parser must not retain a duplicate row matrix');
});

test('large scalar field stops exactly at 220k declared values',()=>{
  const n=220000,rows=new Array(n+3);
  for(let i=0;i<n;i++)rows[i]=String(i%1009)+'\n';
  rows[n]='999999\n';rows[n+1]='888888\n';rows[n+2]=')\n';
  const st=field.pmLargeFieldState('scalar',n);
  feedChunks(st,rows.join(''),field.pmConsumeLargeFieldChunk);
  assert.strictEqual(st.done,true);
  assert.strictEqual(st.values.length,n);
  assert.strictEqual(st.values[0],0);
  assert.strictEqual(st.values[n-1],(n-1)%1009);
  assert(!st.values.includes(999999),'Values after declaredCount must not leak into the field');
});

test('large tensor field preserves 24k nine-component tuples',()=>{
  const n=24000,row='(1 2 3 4 5 6 7 8 9)\n',st=field.pmLargeFieldState('tensor',n);
  feedChunks(st,row.repeat(n),field.pmConsumeLargeFieldChunk);
  assert.strictEqual(st.done,true);
  assert.strictEqual(st.values.length,n);
  assert.deepStrictEqual(st.values[0],[1,2,3,4,5,6,7,8,9]);
  assert.deepStrictEqual(st.values[n-1],[1,2,3,4,5,6,7,8,9]);
});

test('64 interleaved field parser states remain isolated',()=>{
  const states=Array.from({length:64},()=>field.pmLargeFieldState('scalar',1000));
  for(let row=0;row<1000;row++){
    for(let i=0;i<states.length;i++)field.pmConsumeLargeFieldChunk(states[i],String(i*100000+row)+'\n',false);
  }
  for(let i=0;i<states.length;i++){
    const st=states[i];assert.strictEqual(st.done,true);assert.strictEqual(st.values.length,1000);
    assert.strictEqual(st.values[0],i*100000);assert.strictEqual(st.values[999],i*100000+999);
  }
});

test('32 interleaved temporal parser states remain isolated',()=>{
  const states=Array.from({length:32},()=>temporal.flTemporalParseState());
  for(let row=0;row<2000;row++){
    for(let i=0;i<states.length;i++)temporal.flConsumeTemporalChunk(states[i],row+' '+(i*10000+row)+'\n',false);
  }
  for(let i=0;i<states.length;i++){
    const st=states[i];assert.strictEqual(st.columns[0].t.length,2000);assert.strictEqual(st.columns[0].y.length,2000);
    assert.strictEqual(st.columns[0].y[0],i*10000);assert.strictEqual(st.columns[0].y[1999],i*10000+1999);
  }
});

test('observed case time range handles 250k values without argument-spread overflow',()=>{
  const match=index.match(/function observedCaseTimeRange\(caseId\)\{[^\n]+\}/);
  assert(match,'Missing observedCaseTimeRange implementation');
  const times=Array.from({length:250000},(_,i)=>i-125000);
  const observed=new Function('healthCaseIndex','series','datasetTypeOf',match[0]+'; return observedCaseTimeRange;')(
    ()=>null,
    [{caseId:7,kind:'timeseries',t:times}],
    s=>s.kind
  );
  const range=observed(7);
  assert.strictEqual(range.min,-125000);
  assert.strictEqual(range.max,124999);
  assert.strictEqual(range.count,250000);
});

test('safe min/max helper handles 300k finite values without call-stack expansion',()=>{
  const match=index.match(/function flSafeMinMax\(values,project=null\)\{[^\n]+\}/);
  assert(match,'Missing flSafeMinMax implementation');
  const safe=new Function(match[0]+'; return flSafeMinMax;')();
  const values=Array.from({length:300000},(_,i)=>i-150000);
  const range=safe(values);
  assert.deepStrictEqual(range,{min:-150000,max:149999,count:300000});
  const projected=safe([{v:-8},{v:3},{v:NaN}],x=>x.v);
  assert.deepStrictEqual(projected,{min:-8,max:3,count:2});
});

test('large data paths do not use argument-spread min/max',()=>{
  const banned=[
    'Math.max(...coordsRaw.map(Math.abs)','Math.min(...x)','Math.max(...x)','Math.min(...y)','Math.max(...y)',
    'Math.min(...xs)','Math.max(...xs)','Math.min(...ys)','Math.max(...ys)','Math.max(...initials)',
    'Math.max(...rows.map(r=>r.t))','Math.max(...vals)','Math.min(...positive)','Math.max(...positive)',
    'Math.min(...current.t)','Math.max(...current.t)'
  ];
  for(const token of banned)assert(!index.includes(token),'Large-data spread regression: '+token);
});

test('stress harness stays fixture agnostic',()=>{
  for(const banned of ['QuickCup','B3_reference','B6_adaptiveDt','C6_adaptiveDt'])assert(!temporalCore.includes(banned)&&!fieldCore.includes(banned));
});

console.log('Large-project incremental stress suite passed: '+passed.length+' checks.');
for(const name of passed)console.log('  ✓ '+name);
