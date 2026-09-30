'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const program=fs.readFileSync(path.join(__dirname,'..','src','FoamLensDesktop','Program.cs'),'utf8');
const ui=fs.readFileSync(path.join(__dirname,'..','src','FoamLensDesktop','frontend','v13-performance-controls.js'),'utf8');
const workflow=fs.readFileSync(path.join(__dirname,'..','..','.github','workflows','build-foamlens-desktop.yml'),'utf8');

const passed=[];function test(name,fn){fn();passed.push(name)}

test('Desktop remains background-safe',()=>{
  for(const flag of [
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows',
    '--disable-features=CalculateNativeWinOcclusion'
  ]) assert(program.includes(flag),'Missing Chromium background flag '+flag);
});

test('native operations have cancellable registry',()=>{
  assert(program.includes('ConcurrentDictionary<string, CancellationTokenSource> _operations'));
  assert(program.includes('BeginOperation(string requestId)'));
  assert(program.includes('EndOperation(string requestId, CancellationTokenSource source)'));
});

test('native bridge supports explicit cancellation',()=>{
  assert(program.includes('case "cancelOperation"'));
  assert(program.includes('HandleCancelOperation(root, requestId)'));
  assert(program.includes('targetRequestId'));
  assert(program.includes('operation.Cancel()'));
});

test('folder enumeration checks cancellation repeatedly',()=>{
  assert(program.includes('EnumerateFolder(rootPath, rootName, requestId, operation.Token)'));
  assert(program.includes('private void EnumerateFolder(string rootPath, string rootName, string requestId, CancellationToken cancellationToken)'));
  const count=(program.match(/cancellationToken\.ThrowIfCancellationRequested\(\)/g)||[]).length;
  assert(count>=3,'Folder enumeration should check cancellation in directory and file loops.');
  assert(program.includes('catch (OperationCanceledException)'));
  assert(program.includes('type = "folderCancelled"'));
});

test('foamLog batch cancellation reaches worker tasks',()=>{
  assert(program.includes('CancellationToken = operation.Token'));
  assert(program.includes('catch (OperationCanceledException)'));
  assert(program.includes('type = "operationCancelled"'));
  assert(program.includes('type = "operationStart"'));
  assert(program.includes('type = "operationProgress"'));
  assert(program.includes('type = "operationComplete"'));
});

test('foamLog reader checks cancellation per line',()=>{
  assert(program.includes('ct.ThrowIfCancellationRequested()'));
});

test('large temporal files have a cancellable native streaming parser',()=>{
  assert(program.includes('case "parseTemporalFile"'));
  assert(program.includes('HandleTemporalFileAsync(root, requestId)'));
  assert(program.includes('ParseTemporalFileAsync(path, requestId, operation.Token)'));
  assert(program.includes('private async Task<TemporalParseResult> ParseTemporalFileAsync'));
  assert(program.includes('await reader.ReadLineAsync(ct)'));
  assert(program.includes('type = "operationProgress", requestId, operation = "temporalFile"'));
  assert(program.includes('completedBytes'));
  assert(program.includes('totalBytes'));
});

test('native temporal parser preserves vector magnitudes and probe metadata',()=>{
  assert(program.includes('SplitTemporalTokens(line)'));
  assert(program.includes('TryParseTemporalValue(tokens[j], out var value)'));
  assert(program.includes('Math.Sqrt(sum)'));
  assert(program.includes('ParseProbeHeader(line)'));
  assert(program.includes('new Dictionary<int, string>()'));
});

test('UI displays progress and sends cancel request',()=>{
  for(const token of [
    'nativeOperationHud','folderProgress','operationProgress',
    "type:'cancelOperation'","targetRequestId:pcActiveRequest",
    'Cancelling…'
  ]) assert(ui.includes(token),'Missing performance control token '+token);
});

test('cancellation does not modify OpenFOAM case files',()=>{
  assert(!program.includes('File.WriteAllTextAsync(path'));
  assert(!program.includes('File.Delete(path'));
  assert(!program.includes('Directory.Delete(rootPath'));
});

test('runtime smoke verifies JavaScript keeps progressing while minimized',()=>{
  for(const token of [
    'window.__foamLensBackgroundTicks=0',
    'WindowState = FormWindowState.Minimized',
    'FoamLens background execution stalled while minimized',
    'FoamLens minimized-window background smoke passed'
  ]) assert(program.includes(token),'Missing minimized background smoke token '+token);
});

test('runtime visual smoke checks overflow and captures a rendered PNG',()=>{
  for(const token of [
    "page:horizontal-overflow",
    "content-clipped",
    "outside-viewport",
    "CapturePreviewAsync",
    "FOAMLENS_SMOKE_SCREENSHOT",
    "FoamLens visual smoke screenshot is unexpectedly small"
  ]) assert(program.includes(token),'Missing runtime visual smoke token '+token);
});

test('runtime smoke exercises v1.4.4 3D multi-view and video primitives inside WebView2',()=>{
  for(const token of [
    'FoamLens v1.4.4 3D runtime UI smoke passed',
    "'fcExtra'+id+'Viewport'",
    "'fcExtra'+id+'Canvas'",
    "primaryCanvasPosition",
    "fieldCanvasPosition",
    "rangeModes",
    "cameraPresetCount",
    "MediaRecorder",
    "captureStream",
    "window.__foamLensVideoSmokeResult=null",
    "videoSmokeDeadline.Elapsed < TimeSpan.FromSeconds(8)",
    "window.__foamLensVideoSmokeResult",
    "FoamLens WebView2 video runtime smoke passed"
  ]) assert(program.includes(token),'Missing v1.4.4 runtime-smoke token '+token);
});

test('packaged runtime requires an independent View 2 legend and visible secondary Probe marker',()=>{
  for(const token of [
    'window.__foamLensSecondaryVisualSmokeResult=null',
    "document.getElementById('fcLegend')",
    'legendVisible',
    'legendText',
    'window.FoamLensFieldProbe?.fpSetEnabled?.(true)',
    "document.getElementById('fcProbeMarker')",
    'markerVisible',
    'probeEnabled',
    'secondaryField',
    'FoamLens View 2 legend/Probe runtime smoke failed',
    'FoamLens synchronized View 2 legend/Probe smoke passed'
  ])assert(program.includes(token),'Missing View 2 legend/Probe runtime-smoke token '+token);
});

test('packaged Windows smoke uses a real B13 fixture plus distinct complete case identities to exercise 3D case switching',()=>{
  for(const token of [
    'window.__foamLensSmokeImportNativeRefs=async function(refs,options={})',
    'await runProjectScan(files)',
    'await importSelectedAsCases()',
    "setDataView('field3d')",
    'selectSmokeCase',
    "caseSel.dispatchEvent(new Event('change',{bubbles:true}))",
    'while(performance.now()-started<30000)',
    'initialCaseId',
    'switchedCaseId',
    'caseSwitchChanged',
    'rendererCaseId',
    'readyCaseCount',
    'BuildSmokeNativeFileRefs',
    'FOAMLENS_SMOKE_OPENFOAM_CASE',
    'FOAMLENS_SMOKE_MIN_CASES',
    'FOAMLENS_SMOKE_INITIAL_CASE',
    'FOAMLENS_SMOKE_SWITCH_CASE',
    'FOAMLENS_SMOKE_REGION',
    'FOAMLENS_SMOKE_FIELD',
    'FOAMLENS_SMOKE_TIME',
    'FOAMLENS_SMOKE_MIN_FIELD_SPAN',
    'span:Number(range?.max)-Number(range?.min)',
    "legendText:document.getElementById('fvLegend')?.innerText||''",
    'fieldWorkspaceActive',
    'companionChartMounted',
    'surfaceVertices',
    'glError',
    'FoamLens 3D case selector did not switch the rendered case',
    'FoamLens real OpenFOAM packaged runtime smoke passed'
  ])assert(program.includes(token),'Missing real multi-case packaged runtime token '+token);
  assert(program.includes('if (_smokeTest)'),'Real-case import helper is not smoke-gated.');
  for(const token of [
    'Prepare Windows-safe multi-case 3D runtime fixture',
    'Upload Windows-safe multi-case 3D runtime fixture',
    'QuickCup-MultiCase-Windows-runtime',
    'Download Windows-safe multi-case 3D runtime fixture',
    'multi-case-runtime-windows',
    'SmokeCase_A',
    'SmokeCase_B',
    'SmokeCase_C',
    'B13_prghPressure_airGapOF14',
    'case identities backed by complete B13',
    'invalid = re.compile',
    "$env:FOAMLENS_SMOKE_MIN_CASES='4'",
    "$env:FOAMLENS_SMOKE_INITIAL_CASE='SmokeCase_A'",
    "$env:FOAMLENS_SMOKE_SWITCH_CASE='B13_prghPressure_airGapOF14'",
    "$env:FOAMLENS_SMOKE_REGION='metal'",
    "$env:FOAMLENS_SMOKE_FIELD='T'",
    "$env:FOAMLENS_SMOKE_TIME='9.8'",
    "$env:FOAMLENS_SMOKE_MIN_FIELD_SPAN='1'",
    'WaitForExit(180000)'
  ])assert(workflow.includes(token),'Missing Windows V12/V13 smoke workflow token '+token);
  assert(!workflow.includes('Checkout private B13 runtime fixture'),'Windows must not git-checkout QuickCup paths that are invalid on NTFS.');
  const fixtureEnvUses=(workflow.match(/FOAMLENS_SMOKE_OPENFOAM_CASE/g)||[]).length;
  assert(fixtureEnvUses>=2,'Multi-case runtime fixture must be supplied to portable and installed smoke tests.');
});

test('Windows artifacts preserve successful runtime evidence logs and rendered screenshots',()=>{
  for(const token of [
    'FoamLens-Portable-smoke.log','FoamLens-Installed-smoke.log',
    'FoamLens-Portable-smoke.png','FoamLens-Installed-smoke.png',
    "Select-String -Pattern '3D runtime UI smoke passed|video runtime smoke passed|real OpenFOAM packaged runtime smoke passed|Windows smoke test passed'",
    "throw 'FoamLens portable smoke log was not created.'",
    "throw 'FoamLens installed smoke log was not created.'"
  ])assert(workflow.includes(token),'Missing packaged runtime evidence token '+token);
});

test('scientific scanner yields are independent of render frames',()=>{
  const index=fs.readFileSync(path.join(__dirname,'..','src','FoamLensDesktop','frontend','index.html'),'utf8');
  assert(index.includes('function backgroundWorkYield(delay=0)'));
  assert(index.includes("globalThis.scheduler?.postTask"));
  assert(index.includes('function scannerYield(){return backgroundWorkYield(0)}'));
  assert(index.includes('function scanTick(){return backgroundWorkYield(35)}'));
  assert(!index.includes('function scannerYield(){return new Promise(resolve=>requestAnimationFrame'));
  assert(!index.includes('function scanTick(){return new Promise(r=>requestAnimationFrame'));
});

console.log('Native performance/cancellation regression suite passed: '+passed.length+' checks.');
for(const name of passed)console.log('  ✓ '+name);
