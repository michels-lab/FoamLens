#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const FILE='desktop/src/FoamLensDesktop/Program.cs';
const CALL='                await CaptureScientificWorkspaceEvidenceAsync();';
const ANCHOR='    private void MaterializeBundle()';
const GRAFT='                await CaptureGranadaExtraNativeTabsAsync();';
const METHOD="    // GRANADA G5: screenshots from actual native WebView2; no owner approval inferred.\n    private async Task CaptureGranadaExtraNativeTabsAsync()\n    {\n        if (Environment.GetEnvironmentVariable(\"FOAMLENS_GRANADA_G5_NATIVE\") != \"1\") return;\n        var dir = Environment.GetEnvironmentVariable(\"FOAMLENS_BRAND_EVIDENCE_DIR\");\n        if (string.IsNullOrWhiteSpace(dir))\n            throw new InvalidOperationException(\"G5 physical screenshot path missing\");\n        Directory.CreateDirectory(dir);\n        var tabs = new[] {\"time-series\",\"field-compare\",\"analysis\",\"review\",\"live\"};\n        var sizes = new[] {(Width:1140,Height:820,Name:\"wide\"),\n                           (Width:640,Height:900,Name:\"compact\")};\n        await _web.CoreWebView2.CallDevToolsProtocolMethodAsync(\"Page.enable\",\"{}\");\n        try\n        {\n            foreach (var size in sizes)\n            {\n                var vp = \"{\\\"width\\\":\" + size.Width + \",\\\"height\\\":\" + size.Height +\n                         \",\\\"deviceScaleFactor\\\":1,\\\"mobile\\\":false}\";\n                await _web.CoreWebView2.CallDevToolsProtocolMethodAsync(\n                    \"Emulation.setDeviceMetricsOverride\",vp);\n                await Task.Delay(180);\n                foreach (var tab in tabs)\n                {\n                    var js = \"\"\"\n                        (() => {\n                          const key=__G5_TAB__,el=id=>document.getElementById(id);\n                          const rect=x=>x?.getBoundingClientRect();\n                          try {\n                            if(key==='time-series'){\n                              el('modeData')?.click();el('timeSeriesTab')?.click();\n                            }else if(key==='field-compare'){\n                              el('flRibbonTab-field')?.click();\n                              window.FoamLensFieldWorkspace?.setLayout?.('split');\n                            }else if(key==='analysis')el('modeAnalysis')?.click();\n                            else if(key==='review')el('modeReview')?.click();\n                            else if(key==='live')el('modeLive')?.click();\n                            const mode=key==='time-series'?'data':key==='field-compare'?'field':key;\n                            const modeOk=document.body.classList.contains('appMode-'+mode);\n                            // Ribbon navigation hides the global .top h2.\n                            // Validate each actual workspace-owned title.\n                            const title=key==='time-series'?el('dataViewTitle'):\n                              key==='field-compare'?el('fwGrid'):\n                              key==='analysis'?el('analysisSubNav'):\n                              key==='review'?el('reviewTitle'):el('liveTitle');\n                            const titleOk=!!title&&rect(title)?.width>25&&\n                              rect(title)?.height>8&&\n                              (key==='field-compare'||!!title.textContent.trim())&&\n                              getComputedStyle(title).display!=='none'&&\n                              getComputedStyle(title).visibility!=='hidden';\n                            const splitOk=key!=='field-compare'||(\n                              el('fwGrid')?.classList.contains('layout-split')&&\n                              window.FoamLensFieldWorkspace?.getState?.().layout==='split'&&\n                              rect(el('fvCanvas'))?.width>100);\n                            const dataOk=key!=='time-series'||(\n                              el('timeSeriesTab')?.classList.contains('active')&&\n                              !el('timeSeriesTab')?.disabled);\n                            const canvas=rect(document.body);\n                            const viewportOk=canvas?.width>300&&canvas?.height>200;\n                            const ok=modeOk&&titleOk&&splitOk&&dataOk&&viewportOk;\n                            return{ok,key,modeOk,titleOk,splitOk,dataOk,viewportOk,\n                              realLoadedCaseContext:true,CFDValidationClaimed:false};\n                          }catch(error){return{ok:false,key,error:String(error)}}\n                        })()\n                        \"\"\".Replace(\"__G5_TAB__\",JsonSerializer.Serialize(tab));\n                    var result=await _web.CoreWebView2.ExecuteScriptAsync(js);\n                    using var measured=JsonDocument.Parse(result);\n                    if(!measured.RootElement.TryGetProperty(\"ok\",out var valid)||\n                       valid.ValueKind!=JsonValueKind.True)\n                        throw new InvalidOperationException(\n                            \"G5 real \"+tab+\"/\"+size.Name+\" native tab failed: \"+result);\n                    await Task.Delay(300);\n                    await CaptureCdpPngAsync(Path.Combine(dir,tab+\"-\"+size.Name+\".png\"));\n                    Log(\"Granada G5 original tab captured: \"+tab+\"/\"+size.Name+\" \"+result);\n                }\n            }\n        }\n        finally\n        {\n            await _web.CoreWebView2.CallDevToolsProtocolMethodAsync(\n                \"Emulation.clearDeviceMetricsOverride\",\"{}\");\n            await _web.CoreWebView2.ExecuteScriptAsync(\n                \"(()=>{document.getElementById('flRibbonTab-field')?.click();\"+\n                \"window.FoamLensFieldWorkspace?.setLayout?.('3d');return true})()\");\n        }\n        Log(\"Granada G5 five additional real tabs captured in wide and compact viewports.\");\n    }\n\n";

function integrate(original){
 if(original.includes('CaptureGranadaExtraNativeTabsAsync'))throw Error('G5 method already added');
 if(original.split(CALL).length!==2||original.split(ANCHOR).length!==2)throw Error('Unique source anchor missing');
 if(!original.includes('meshAuditSurfaceJson')||
    !original.includes('FoamLens real OpenFOAM View B metal+mold and metric XYZ smoke passed'))
   throw Error('Scientific Mesh Auditor or real Field F1 smoke missing');
 const merged=original.replace(CALL,CALL+'\n'+GRAFT).replace(ANCHOR,METHOD+ANCHOR);
 if(merged.split(GRAFT).length!==2)throw Error('New physical capture path not unique');
 return merged
}
function apply(root=process.cwd(),output=''){
 const target=path.join(root,FILE),original=fs.readFileSync(target,'utf8');
 const next=integrate(original),hash=x=>crypto.createHash('sha256').update(x).digest('hex');
 fs.writeFileSync(target,next);
 const m={schema:'FoamLens-Granada-G5-Real-Native-Capture-v1',
  input_sha256:hash(original),output_sha256:hash(next),
  screens:['time-series','field-compare','analysis','review','live'],
  viewports:['wide','compact'],distribution:['installed','portable'],
  expected_real_captures:20,owner_PRs_untouched:true,
  rc_created:false,release_authorized:false,scientific_calibration_verified:false,
  human_visual_approval:false};
 if(output){fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,JSON.stringify(m,null,2)+'\n')}
 return m
}
if(require.main===module)try{
 const output=process.argv.find(x=>x.startsWith('--report='))?.slice(9)||'';
 console.log(JSON.stringify(apply(process.cwd(),output)))
}catch(error){console.error('G5 source-bound native capture blocked: '+error.message);process.exitCode=2}
module.exports={FILE,CALL,ANCHOR,GRAFT,METHOD,integrate,apply};
