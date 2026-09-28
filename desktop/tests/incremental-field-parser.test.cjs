'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const index=fs.readFileSync(path.join(__dirname,'..','src','FoamLensDesktop','frontend','index.html'),'utf8');
const begin='/* FOAMLENS_INCREMENTAL_FIELD_CORE_START */',end='/* FOAMLENS_INCREMENTAL_FIELD_CORE_END */';
const a=index.indexOf(begin),b=index.indexOf(end,a);
assert(a>=0&&b>a,'Incremental field parser core markers missing.');
const core=index.slice(a,b+end.length);
const api=new Function(core+'\nreturn {PM_FIELD_NATIVE_THRESHOLD,PM_FIELD_HEAD_BYTES,PM_FIELD_CHUNK_BYTES,pmFieldKindFromClass,pmFieldComponentCount,pmLargeFieldState,pmParseLargeFieldValueLine,pmConsumeLargeFieldChunk,pmLargeFieldHeader};')();

const passed=[];function test(name,fn){fn();passed.push(name)}

test('scalar nonuniform values survive chunk boundaries',()=>{
  const st=api.pmLargeFieldState('scalar',5);
  api.pmConsumeLargeFieldChunk(st,'1\n2\n3',false);
  api.pmConsumeLargeFieldChunk(st,'\n4\n5\n)\n;',false);
  if(st.carry&&!st.done)api.pmParseLargeFieldValueLine(st.carry,st);
  assert.deepStrictEqual(st.values,[1,2,3,4,5]);
  assert.strictEqual(st.done,true);
});

test('vector nonuniform values survive chunk boundaries',()=>{
  const st=api.pmLargeFieldState('vector',3);
  api.pmConsumeLargeFieldChunk(st,'(1 2 3)\n(4 5',false);
  api.pmConsumeLargeFieldChunk(st,' 6)\n(7 8 9)\n',false);
  if(st.carry&&!st.done)api.pmParseLargeFieldValueLine(st.carry,st);
  assert.deepStrictEqual(st.values,[[1,2,3],[4,5,6],[7,8,9]]);
  assert.strictEqual(st.done,true);
});

test('tensor values survive chunk boundaries',()=>{
  const st=api.pmLargeFieldState('tensor',2);
  api.pmConsumeLargeFieldChunk(st,'(1 2 3 4 5 6 7 8',false);
  api.pmConsumeLargeFieldChunk(st,' 9)\n(9 8 7 6 5 4 3 2 1)\n',false);
  if(st.carry&&!st.done)api.pmParseLargeFieldValueLine(st.carry,st);
  assert.deepStrictEqual(st.values,[[1,2,3,4,5,6,7,8,9],[9,8,7,6,5,4,3,2,1]]);
  assert.strictEqual(st.done,true);
});

test('sphericalTensor values stream as one-component tuples',()=>{
  const st=api.pmLargeFieldState('sphericalTensor',3);
  api.pmConsumeLargeFieldChunk(st,'(1)\n(2)\n',false);
  api.pmConsumeLargeFieldChunk(st,'(3)\n',false);
  assert.deepStrictEqual(st.values,[[1],[2],[3]]);
  assert.strictEqual(st.done,true);
});

test('declaredCount prevents boundaryField numbers from being consumed',()=>{
  const st=api.pmLargeFieldState('scalar',2);
  api.pmConsumeLargeFieldChunk(st,'10\n20\n99\n100\n',false);
  assert.deepStrictEqual(st.values,[10,20]);
  assert.strictEqual(st.done,true);
});

test('explicit list close stops parsing even when count is unavailable',()=>{
  const st=api.pmLargeFieldState('scalar',0);
  api.pmConsumeLargeFieldChunk(st,'1\n2\n)\n99\n',false);
  assert.deepStrictEqual(st.values,[1,2]);
  assert.strictEqual(st.closed,true);
  assert.strictEqual(st.done,true);
});

test('header parser recognizes OpenFOAM scalar nonuniform metadata',()=>{
  const h=api.pmLargeFieldHeader('FoamFile\n{\n format ascii;\n class volScalarField;\n object T;\n}\ndimensions [0 0 0 1 0 0 0];\ninternalField nonuniform List<scalar>\n123\n(\n','case/0/T');
  assert.strictEqual(h.format,'ascii');
  assert.strictEqual(h.fieldClass,'volScalarField');
  assert.strictEqual(h.kind,'scalar');
  assert.strictEqual(h.declaredCount,123);
  assert(h.listStart>0);
});

test('header parser recognizes OpenFOAM vector nonuniform metadata',()=>{
  const h=api.pmLargeFieldHeader('FoamFile{ format ascii; class volVectorField; object U; }\ndimensions [0 1 -1 0 0 0 0];\ninternalField nonuniform List<vector> 9 (\n','case/0/U');
  assert.strictEqual(h.kind,'vector');
  assert.strictEqual(h.declaredCount,9);
});

test('header parser recognizes tensor family metadata',()=>{
  const tensor=api.pmLargeFieldHeader('FoamFile{ format ascii; class volTensorField; object gradU; }\ninternalField nonuniform List<tensor> 4 (\n','case/0/gradU');
  const symm=api.pmLargeFieldHeader('FoamFile{ format ascii; class volSymmTensorField; object R; }\ninternalField nonuniform List<symmTensor> 4 (\n','case/0/R');
  const spherical=api.pmLargeFieldHeader('FoamFile{ format ascii; class volSphericalTensorField; object K; }\ninternalField nonuniform List<sphericalTensor> 4 (\n','case/0/K');
  assert.strictEqual(tensor.kind,'tensor');assert.strictEqual(tensor.componentCount,9);
  assert.strictEqual(symm.kind,'symmTensor');assert.strictEqual(symm.componentCount,6);
  assert.strictEqual(spherical.kind,'sphericalTensor');assert.strictEqual(spherical.componentCount,1);
});

test('Desktop field chunks stay below native readSlice limit',()=>{
  assert.strictEqual(api.PM_FIELD_NATIVE_THRESHOLD,4*1024*1024);
  assert.strictEqual(api.PM_FIELD_HEAD_BYTES,512*1024);
  assert.strictEqual(api.PM_FIELD_CHUNK_BYTES,1024*1024);
  assert(api.PM_FIELD_CHUNK_BYTES<=4*1024*1024);
});

test('pmLoadRecord uses incremental parser only for large native files',()=>{
  const start=index.indexOf('async function pmLoadRecord(record){');
  const end=index.indexOf('async function pmLoadFieldSet',start);
  const body=index.slice(start,end);
  assert(body.includes('FOAMLENS_NATIVE&&record.file?._nativeToken'));
  assert(body.includes('await pmParseLargeOpenFOAMField(record.file,record.sourcePath)'));
  assert(body.includes('pmParseOpenFOAMFieldText(await record.file.text(),record.sourcePath)'));
});

test('large parser stops reading when state is done',()=>{
  const start=index.indexOf('async function pmParseLargeOpenFOAMField');
  const end=index.indexOf('function pmComponentValues',start);
  const body=index.slice(start,end);
  assert(body.includes('while(offset<size&&!state.done)'));
  assert(body.includes('declaredCount:meta.declaredCount'));
  assert(body.includes('bytesRead:offset'));
});

test('incremental field parser is fixture agnostic',()=>{
  for(const banned of ['QuickCup','B3_reference','B6_adaptiveDt','C6_adaptiveDt','metal'])assert(!core.includes(banned),'Fixture leaked into field parser core: '+banned);
});

console.log('Incremental OpenFOAM field parser regression suite passed: '+passed.length+' checks.');
for(const name of passed)console.log('  ✓ '+name);
