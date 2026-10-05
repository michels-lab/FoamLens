'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const file=path.join(__dirname,'..','src','FoamLensDesktop','frontend','v17-vector-analysis.js');
const source=fs.readFileSync(file,'utf8');
new Function(source);

const cut=source.indexOf('function fvaUpdateVectorMeta');
assert(cut>0,'Vector-analysis pure core boundary was not found.');
const core=source.slice(0,cut);

const controls=new Map();
function set(id,value,checked=false){controls.set(id,{value:String(value),checked:!!checked})}
global.document={getElementById:id=>controls.get(id)||null};
global.flUi=(en)=>en;
global.fvState={spatialHash:null};
global.fvClamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)));
global.fvFiniteRange=a=>{
  const v=(a||[]).map(Number).filter(Number.isFinite);
  if(!v.length)return{valid:false,min:NaN,max:NaN,mean:NaN,count:0};
  return{valid:true,min:Math.min(...v),max:Math.max(...v),mean:v.reduce((x,y)=>x+y,0)/v.length,count:v.length}
};
global.fvColorMap=(v,min,max)=>{
  const t=max>min?Math.max(0,Math.min(1,(v-min)/(max-min))):.5;
  return[t,0,1-t]
};
global.fvBuildSpatialHash=(centers,bmin,bmax,count)=>({buckets:new Map(Array.from({length:count},(_,i)=>['b'+i,[i]]))});

const api=new Function('document','flUi','fvState','fvClamp','fvFiniteRange','fvColorMap','fvBuildSpatialHash',
  core+';return {fvaRoi,fvaCellInRoi,fvaEligibleCells,fvaSelectCells,fvaMetrics,fvaBuildGlyphs};'
)(document,flUi,fvState,fvClamp,fvFiniteRange,fvColorMap,fvBuildSpatialHash);

const mesh={
  boundsMin:[0,0,0],boundsMax:[1,1,1],
  cellCenters:new Float32Array([
    .1,.5,.5,
    .35,.5,.5,
    .65,.5,.5,
    .9,.5,.5
  ])
};
const vectors=[[1,0,0],[2,0,0],[3,0,0],[4,0,0]];

function shaftLengths(result){
  const p=result.positions,out=[];
  for(let i=0;i<result.glyphCount;i++){
    const o=i*18;
    out.push(Math.hypot(p[o+3]-p[o],p[o+4]-p[o+1],p[o+5]-p[o+2]));
  }
  return out
}
function near(a,b,t=1e-6){assert(Math.abs(a-b)<=t,String(a)+' != '+String(b))}

set('fvVectorRoiEnabled','',true);
for(const pair of [
  ['fvVectorRoiX0',.5],['fvVectorRoiX1',1],
  ['fvVectorRoiY0',0],['fvVectorRoiY1',1],
  ['fvVectorRoiZ0',0],['fvVectorRoiZ1',1],
  ['fvVectorLengthMode','normalized']
])set(pair[0],pair[1]);

const roi=api.fvaRoi(mesh);
assert.deepEqual(roi.normalizedMin,[.5,0,0]);
assert.deepEqual(roi.normalizedMax,[1,1,1]);
assert.deepEqual(api.fvaEligibleCells(mesh,vectors,roi),[2,3],
  'ROI must exclude cells outside the selected normalized X range.');

const normalized=api.fvaBuildGlyphs(mesh,vectors,10,1);
assert.equal(normalized.lengthMode,'normalized');
assert.equal(normalized.eligible,2);
assert.deepEqual(normalized.cells,[2,3]);
const nlen=shaftLengths(normalized);
assert.equal(nlen.length,2);
near(nlen[0],nlen[1],1e-6);

set('fvVectorLengthMode','proportional');
const proportional=api.fvaBuildGlyphs(mesh,vectors,10,1);
assert.equal(proportional.lengthMode,'proportional');
const plen=shaftLengths(proportional);
assert(plen[1]>plen[0],
  'Magnitude-proportional glyphs must render the larger vector with a longer shaft.');

set('fvVectorRoiEnabled','',false);
const full=api.fvaBuildGlyphs(mesh,vectors,2,1);
assert.equal(full.eligible,4);
assert.equal(full.requested,2);
assert.equal(full.glyphCount,2);
assert(Number.isFinite(full.sampling.meanRatio));
assert(full.sampling.rangeCoverage>=0&&full.sampling.rangeCoverage<=1);

for(const token of [
  'sample mean / ROI mean','magnitude-range coverage',
  'fvVectorLengthMode','Magnitude-proportional','Normalized / equal length',
  'fvVectorRoiEnabled','Normalized ROI bounds',
  'fvProvenance','dims ','native/reconstructed field',
  'sourcePath','meshSnapshot','fvAssociationLabel'
]) assert(source.includes(token),'Missing vector/provenance product token: '+token);

console.log('FoamLens vector-analysis regression passed: ROI filtering, length semantics, sampling metrics and viewport provenance.');
