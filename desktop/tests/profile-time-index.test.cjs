'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'..','src','FoamLensDesktop','frontend','index.html'),'utf8');
const a=html.indexOf('/* FOAMLENS_PROFILE_TIME_INDEX_START */');
const b=html.indexOf('/* FOAMLENS_PROFILE_TIME_INDEX_END */',a);
assert.ok(a>=0&&b>a,'Missing production physical-time lookup');
const equal=(a,b)=>{
  a=Number(a);b=Number(b);
  if(!Number.isFinite(a)||!Number.isFinite(b))return false;
  return Math.abs(a-b)<=Math.max(1e-7,Math.max(Math.abs(a),Math.abs(b),1)*1e-8);
};
const lookup=new Function('profileTimeEqual',
  html.slice(a,b)+';return profileFirstSamplesForTimes')(equal);
const legacy=(profiles,times)=>times.map(t=>profiles.find(s=>equal(s.profileTime,t))||null);
const check=(profiles,times,name)=>assert.deepStrictEqual(
  lookup(profiles,times),legacy(profiles,times),name);
const profile=(t,label)=>({profileTime:t,profileTimeLabel:label});
const regular=Array.from({length:3008},(_,i)=>profile(i*0.25,'time-'+i));
const regularTimes=regular.map(p=>p.profileTime);
check(regular,regularTimes,'3,008 physical-time labels must match the original search exactly');
const shuffled=[profile(1.00000001,'earliest near match'),profile(1,'later exact match'),
  profile(1.00000003,'third near match'),profile(0,'zero'),profile(-4,'negative')];
check(shuffled,[-4,0,1,1.00000004,0.99999999,10],'Tolerance and original input-order priority');
check([profile(1e8,'high magnitude'),profile(1e8+0.3,'high near')],[1e8+0.2,1e8],
  'Floating point tolerance at large physical times');
check([profile(NaN,'bad'),profile(Infinity,'bad'),profile(2,'valid')],[2,Infinity,NaN],
  'Never invent profile samples at nonfinite time');
check([],[], 'Empty profile timelines');
assert(html.includes('const samples=commonClock?[]:profileFirstSamplesForTimes(profiles,times)'),
  'Shared two-field/multi-case clock must bypass per-file source labels');
console.log('3,008-time indexed profile labels match original scientific tolerance and first-match precedence PASS');
