'use strict';
// G41: fail-closed checks on the ORIGINAL source, never fake native-run success.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {test}=require('node:test');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'desktop/src/FoamLensDesktop/Program.cs'),'utf8');
const qa=fs.readFileSync(path.join(root,'tools/granada_g37_real_b13_play_stress.ps1'),'utf8');
function gate(s,p){
  assert.match(s,/const playNotCollapsed=!!playRect&&playRect\.width>=100&&playRect\.height>=28&&/,'native original 100x28px Play gate unchanged');
  assert.match(s,/playButton\.scrollWidth<=playButton\.clientWidth\+2/,'original visible Play text must fit');
  assert.match(s,/\/Play\|Reproducir\/\.test\(playButton\.textContent\|\|''\)/,'no false Play label allowance');
  assert.match(s,/\/\(loop\|bucle\)\/i\.test\(playButton\.getAttribute\('aria-label'\)\|\|''\)/,'original loop accessibility remains checked');
  assert.match(s,/throw new InvalidOperationException\("Real Field toolbar\/canvas geometry or physical region evidence failed/,'original science and layout must fail closed');
  for(const k of ['playWidth','playHeight','playLeft','playRight','playClientWidth','playScrollWidth','playComputedWidth']){
    assert.match(s,new RegExp(k+':'),'return genuine original Chromium pixel value: '+k);
    assert.match(p,new RegExp("'"+k+"'"),'sanitized numeric allowlist must name: '+k);
  }
  for(const k of ['playMinWidthAtLeast100','playLabelReady','playPauseLabel','playLoopAriaReady','playTransportContainsPlay','playCompactClassAtWide','playG12StylesheetPresent','playG16StylesheetPresent','playG7StylesheetPresent']){
    assert.match(s,new RegExp(k+':|\\b'+k+'[,}]'),'original in-memory boolean required: '+k);
    assert.match(p,new RegExp("'"+k+"'"),'sanitized boolean allowlist must name: '+k);
  }
  assert.match(p,/\$state\[\$key\] -eq \$true/,'only boolean whitelist');
  assert.match(p,/\$state\[\$key\] -is \[ValueType\]/,'numeric values only');
  assert.match(p,/\[double\]::IsFinite/,'never emit NaN/Infinity metrics');
  assert.match(p,/\$script:failureEvidence=Safe-FailureEvidence \$rawFailure \$variant \$n/,'capture precisely failing native cycle');
  assert.match(p,/Native-Smoke \$installedExe 'installed' \$n/,'retain original 3x Installed');
  assert.match(p,/Native-Smoke \$exe 'portable' \$n/,'retain original 3x Portable');
  assert.doesNotMatch(p,/Write-(?:Host|Output)\s+\$(?:rawFailure|nativeLog|raw)\b/,'no raw scientific/user logs in public runner output');
}
test('original production Play/CFD contract intact and attribution metrics strictly sanitized',()=>gate(source,qa));
test('negative: lowering original Play minimum is rejected',()=>{
  assert.throws(()=>gate(source.replace('playRect.width>=100','playRect.width>=68'),qa),/100x28px/);
});
test('negative: missing original rendering measurement is rejected',()=>{
  assert.throws(()=>gate(source.replace('playComputedWidth:playComputed?','lostComputedWidth:playComputed?'),qa),/playComputedWidth/);
});
test('negative: leaked non-finite pixel measurements are rejected',()=>{
  assert.throws(()=>gate(source,qa.replace('[double]::IsFinite','[double]::IsNaN')),/NaN\/Infinity/);
});
test('negative: sanitization must run in failing native cycle',()=>{
  assert.throws(()=>gate(source,qa.replace('$script:failureEvidence=Safe-FailureEvidence $rawFailure $variant $n','Write-Host overlooked')),/failing native cycle/);
});
