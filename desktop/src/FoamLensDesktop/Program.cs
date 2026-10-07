using System.Buffers.Binary;
using System.Collections.Concurrent;
using System.Diagnostics;
using System.Globalization;
using System.IO.Compression;
using System.Reflection;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace FoamLensDesktop;

internal static class Program
{
    [STAThread]
    private static void Main(string[] args)
    {
        ApplicationConfiguration.Initialize();
        var smokeTest = args.Any(arg =>
            string.Equals(arg, "--smoke-test", StringComparison.OrdinalIgnoreCase));
        using var form = new FoamLensForm(smokeTest);
        Application.Run(form);
        if (smokeTest)
            Environment.ExitCode = form.SmokeTestExitCode;
    }
}

internal sealed class FoamLensForm : Form
{
    private readonly WebView2 _web = new() { Dock = DockStyle.Fill };
    private readonly bool _smokeTest;
    private readonly ConcurrentDictionary<string, string> _fileTokens = new(StringComparer.Ordinal);
    private readonly ConcurrentDictionary<string, CancellationTokenSource> _operations = new(StringComparer.Ordinal);
    private long _tokenSequence;
    private readonly JsonSerializerOptions _json = new(JsonSerializerDefaults.Web);
    private static readonly Uri LatestReleaseApi = new("https://api.github.com/repos/realmichelduarte/FoamLens/releases/latest");
    private static readonly HttpClient UpdateHttpClient = CreateUpdateHttpClient();
    private int _updateCheckInProgress;
#if FOAMLENS_STORE
    private const bool StoreDistributionChannel = true;
#else
    private const bool StoreDistributionChannel = false;
#endif
    private static string DesktopVersionText =>
        Assembly.GetExecutingAssembly().GetName().Version?.ToString(3)
        ?? throw new InvalidOperationException("FoamLens assembly version metadata is unavailable.");

    private string AppRoot => Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
        "FoamLens", "Desktop", DesktopVersionText, "app");

    public int SmokeTestExitCode { get; private set; }

    public FoamLensForm(bool smokeTest = false)
    {
        _smokeTest = smokeTest;
        SmokeTestExitCode = smokeTest ? 1 : 0;
        Text = "FoamLens Desktop";
        var executableIcon = System.Drawing.Icon.ExtractAssociatedIcon(Application.ExecutablePath);
        if (executableIcon is not null) Icon = executableIcon;
        StartPosition = FormStartPosition.CenterScreen;
        WindowState = FormWindowState.Maximized;
        MinimumSize = new Size(1120, 720);
        BackColor = Color.FromArgb(8, 17, 28);
        Controls.Add(_web);
        Shown += async (_, _) => await InitializeAsync();
    }

    private async Task InitializeAsync()
    {
        try
        {
            MaterializeBundle();
            ApplyFrontendExtensions();
            ValidateMaterializedFrontend();
            Directory.CreateDirectory(Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "FoamLens", "Desktop", "WebView2"));

            // These Chromium switches are intentional: FoamLens performs long scientific
            // analyses and must not be throttled merely because its window is minimized,
            // occluded, or another application has focus.
            var options = new CoreWebView2EnvironmentOptions
            {
                AdditionalBrowserArguments = string.Join(' ', new[]
                {
                    "--disable-background-timer-throttling",
                    "--disable-renderer-backgrounding",
                    "--disable-backgrounding-occluded-windows",
                    "--disable-features=CalculateNativeWinOcclusion"
                })
            };
            var userData = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "FoamLens", "Desktop", "WebView2");
            var environment = await CoreWebView2Environment.CreateAsync(null, userData, options);
            await _web.EnsureCoreWebView2Async(environment);

            _web.CoreWebView2.SetVirtualHostNameToFolderMapping(
                "foamlens.local", AppRoot, CoreWebView2HostResourceAccessKind.Allow);
            _web.CoreWebView2.Settings.AreDevToolsEnabled = true;
            _web.CoreWebView2.Settings.AreDefaultContextMenusEnabled = true;
            _web.CoreWebView2.Settings.IsStatusBarEnabled = false;
            _web.CoreWebView2.WebMessageReceived += OnWebMessageReceived;
            _web.CoreWebView2.NewWindowRequested += (_, e) =>
            {
                e.Handled = true;
                OpenExternal(e.Uri);
            };
            _web.CoreWebView2.NavigationStarting += (_, e) =>
            {
                if (Uri.TryCreate(e.Uri, UriKind.Absolute, out var uri) &&
                    !string.Equals(uri.Host, "foamlens.local", StringComparison.OrdinalIgnoreCase) &&
                    uri.Scheme is "http" or "https")
                {
                    e.Cancel = true;
                    OpenExternal(e.Uri);
                }
            };
            _web.CoreWebView2.ProcessFailed += (_, e) =>
                Log($"WebView2 process failed: {e.ProcessFailedKind}");

            if (_smokeTest)
            {
                await RunSmokeTestAsync();
            }
            else
            {
                var channelQuery = StoreDistributionChannel ? "&store=1" : "";
                _web.CoreWebView2.Navigate("https://foamlens.local/index.html?desktop=1" + channelQuery);
                if (!StoreDistributionChannel)
                    _ = CheckForUpdatesAsync(userInitiated: false);
            }
        }
        catch (Exception ex)
        {
            Log(ex.ToString());
            if (_smokeTest)
            {
                SmokeTestExitCode = 1;
                BeginInvoke(Close);
                return;
            }
            MessageBox.Show(this, ex.ToString(), "FoamLens Desktop failed to start",
                MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }

    private async Task RunSmokeTestAsync()
    {
        RunBinaryMeshParserSelfTest();
        await RunFoamLogParserSelfTestAsync();

        var smokeUrl = "https://foamlens.local/index.html?desktop=1&smoke=1" +
            (StoreDistributionChannel ? "&store=1" : "");
        var completion = new TaskCompletionSource<CoreWebView2NavigationCompletedEventArgs>(
            TaskCreationOptions.RunContinuationsAsynchronously);
        ulong? smokeNavigationId = null;

        void OnSmokeNavigationStarting(object? sender, CoreWebView2NavigationStartingEventArgs e)
        {
            if (string.Equals(e.Uri, smokeUrl, StringComparison.OrdinalIgnoreCase))
            {
                smokeNavigationId = e.NavigationId;
                Log($"FoamLens smoke navigation started: id={e.NavigationId}; uri={e.Uri}");
            }
        }

        void OnNavigationCompleted(object? sender, CoreWebView2NavigationCompletedEventArgs e)
        {
            if (smokeNavigationId.HasValue && e.NavigationId == smokeNavigationId.Value)
                completion.TrySetResult(e);
        }

        _web.CoreWebView2.NavigationStarting += OnSmokeNavigationStarting;
        _web.CoreWebView2.NavigationCompleted += OnNavigationCompleted;
        int? indexStatusCode = null;
        string indexReasonPhrase = "";
        string indexContentType = "";
        string indexContentLength = "";
        void OnWebResourceResponseReceived(object? sender, CoreWebView2WebResourceResponseReceivedEventArgs e)
        {
            if (Uri.TryCreate(e.Request.Uri, UriKind.Absolute, out var uri) &&
                string.Equals(uri.Host, "foamlens.local", StringComparison.OrdinalIgnoreCase) &&
                string.Equals(uri.AbsolutePath, "/index.html", StringComparison.OrdinalIgnoreCase))
            {
                indexStatusCode = e.Response.StatusCode;
                indexReasonPhrase = e.Response.ReasonPhrase ?? "";
                try { indexContentType = e.Response.Headers.GetHeader("Content-Type") ?? ""; } catch { }
                try { indexContentLength = e.Response.Headers.GetHeader("Content-Length") ?? ""; } catch { }
            }
        }
        _web.CoreWebView2.WebResourceResponseReceived += OnWebResourceResponseReceived;
        try
        {
            _web.CoreWebView2.Navigate(smokeUrl);

            var finished = await Task.WhenAny(
                completion.Task,
                Task.Delay(TimeSpan.FromSeconds(30)));
            if (finished != completion.Task)
                throw new TimeoutException(
                    $"FoamLens smoke test timed out while waiting for the requested navigation id; expected={smokeNavigationId?.ToString() ?? "not-started"}; source={_web.CoreWebView2.Source}");

            var navigation = await completion.Task;
            if (!navigation.IsSuccess)
                throw new InvalidOperationException(
                    $"FoamLens smoke-test navigation failed: {navigation.WebErrorStatus}");

            var readyState = await _web.CoreWebView2.ExecuteScriptAsync("document.readyState");
            if (!readyState.Contains("complete", StringComparison.OrdinalIgnoreCase))
                throw new InvalidOperationException(
                    $"FoamLens frontend did not reach document.readyState=complete: {readyState}");

            if (indexStatusCode.HasValue)
                Log($"FoamLens index response: status={indexStatusCode.Value}; reason={indexReasonPhrase}; contentType={indexContentType}; contentLength={indexContentLength}");
            else
                Log("FoamLens index response: no WebResourceResponseReceived event captured.");

            string launchStateJson = "{}";
            var launchDeadline = Stopwatch.StartNew();
            var launchVisible = false;
            while (launchDeadline.Elapsed < TimeSpan.FromSeconds(10))
            {
                launchStateJson = await _web.CoreWebView2.ExecuteScriptAsync(
                    "(()=>{const title=document.getElementById('launchTitle'),body=document.body;" +
                    "const titleStyle=title?getComputedStyle(title):null,bodyStyle=body?getComputedStyle(body):null;" +
                    "const rect=title?.getBoundingClientRect?.();" +
                    "const titleText=title?.textContent?.trim()||'';" +
                    "const titleVisible=!!title&&titleText.includes('FoamLens')&&titleStyle?.display!=='none'&&titleStyle?.visibility!=='hidden'&&Number(rect?.width||0)>0&&Number(rect?.height||0)>0;" +
                    "const outer=document.documentElement?.outerHTML||'';" +
                    "return {titleText,titleVisible,titleDisplay:titleStyle?.display||'',titleVisibility:titleStyle?.visibility||'',titleWidth:Number(rect?.width||0),titleHeight:Number(rect?.height||0),bodyDisplay:bodyStyle?.display||'',bodyVisibility:bodyStyle?.visibility||'',bodyClasses:body?.className||'',bodyTextHasFoamLens:!!body?.innerText?.includes('FoamLens'),bodyTextLength:Number(body?.innerText?.length||0),documentTitle:document.title||'',headHtmlLength:Number(document.head?.innerHTML?.length||0),bodyHtmlLength:Number(body?.innerHTML?.length||0),outerHtmlLength:Number(outer.length||0),outerHtmlPrefix:outer.slice(0,240),readyState:document.readyState,href:location.href};})()");
                using (var launchState = JsonDocument.Parse(launchStateJson))
                {
                    var root = launchState.RootElement;
                    launchVisible = root.TryGetProperty("titleVisible", out var visibleNode) && visibleNode.GetBoolean();
                }
                if (launchVisible) break;
                await Task.Delay(100);
            }
            if (!launchVisible)
                throw new InvalidOperationException(
                    $"FoamLens launch surface was not visibly rendered after navigation: {launchStateJson}");
            Log($"FoamLens launch surface smoke passed: {launchStateJson}");

            var hasBridge = await _web.CoreWebView2.ExecuteScriptAsync(
                "typeof window.chrome?.webview?.postMessage === 'function'");
            if (!string.Equals(hasBridge.Trim(), "true", StringComparison.OrdinalIgnoreCase))
                throw new InvalidOperationException("FoamLens WebView2 native bridge is unavailable.");

            string brandingStateJson = "{}";
            var brandingDeadline = Stopwatch.StartNew();
            var officialBrandingReady = false;
            while (brandingDeadline.Elapsed < TimeSpan.FromSeconds(10))
            {
                brandingStateJson = await _web.CoreWebView2.ExecuteScriptAsync(
                    "(()=>{const ids=['launchOfficialLogo','sidebarOfficialLogo','aboutOfficialLogo','aboutPortraitImg','aboutMichelsLabLogo'];" +
                    "const assets=ids.map(id=>{const img=document.getElementById(id);return{id,exists:!!img,isImage:img instanceof HTMLImageElement,src:img?.getAttribute?.('src')||'',complete:!!img?.complete,naturalWidth:Number(img?.naturalWidth||0),naturalHeight:Number(img?.naturalHeight||0)}});" +
                    "const legacyCount=document.querySelectorAll('.foamLensLogoSvg').length;" +
                    "return{ready:assets.every(x=>x.exists&&x.isImage&&x.complete&&x.naturalWidth>0&&x.naturalHeight>0)&&legacyCount===0,legacyCount,assets};})()");
                using (var brandingState = JsonDocument.Parse(brandingStateJson))
                {
                    var root = brandingState.RootElement;
                    officialBrandingReady =
                        root.TryGetProperty("ready", out var readyNode) &&
                        readyNode.GetBoolean();
                }
                if (officialBrandingReady) break;
                await Task.Delay(100);
            }
            if (!officialBrandingReady)
                throw new InvalidOperationException(
                    $"FoamLens official local brand assets did not render on launch/sidebar/About: {brandingStateJson}");
            Log($"FoamLens official branding smoke passed: {brandingStateJson}");

            // Extension integration smoke: Field View must mount through the v1.6
            // Ribbon + Field surface contract. Legacy mode/data-tab navigation
            // must not survive as a second route into the same workspace.
            var fieldViewUiJson = await _web.CoreWebView2.ExecuteScriptAsync(
                "(()=>{const ribbon=document.getElementById('flRibbonTab-field');const controls=document.getElementById('fieldViewControls');const panel=document.getElementById('fieldViewPanel');const surface=document.getElementById('fieldSurface');return {ribbon:!!ribbon,controls:!!controls,panel:!!panel,surface:!!surface,ribbonDisabled:!!ribbon?.disabled,ribbonText:ribbon?.textContent?.trim()||'',ribbonDisplay:ribbon?getComputedStyle(ribbon).display:'',legacyFieldButtonAbsent:!document.getElementById('modeField'),legacyFieldDatasetTabAbsent:!document.getElementById('fieldViewTab')}})()");
            using (var fieldViewUi = JsonDocument.Parse(fieldViewUiJson))
            {
                var root = fieldViewUi.RootElement;
                var mounted =
                    root.TryGetProperty("controls", out var controlsNode) && controlsNode.GetBoolean() &&
                    root.TryGetProperty("panel", out var panelNode) && panelNode.GetBoolean() &&
                    root.TryGetProperty("surface", out var surfaceNode) && surfaceNode.GetBoolean();
                var topLevelMounted =
                    root.TryGetProperty("ribbon", out var ribbonNode) && ribbonNode.GetBoolean() &&
                    root.TryGetProperty("ribbonDisabled", out var ribbonDisabledNode) && !ribbonDisabledNode.GetBoolean() &&
                    root.TryGetProperty("ribbonText", out var ribbonTextNode) &&
                    !string.IsNullOrWhiteSpace(ribbonTextNode.GetString()) &&
                    root.TryGetProperty("ribbonDisplay", out var ribbonDisplayNode) &&
                    !string.Equals(ribbonDisplayNode.GetString(), "none", StringComparison.OrdinalIgnoreCase) &&
                    root.TryGetProperty("legacyFieldButtonAbsent", out var legacyFieldButtonAbsentNode) &&
                    legacyFieldButtonAbsentNode.GetBoolean() &&
                    root.TryGetProperty("legacyFieldDatasetTabAbsent", out var legacyFieldDatasetTabAbsentNode) &&
                    legacyFieldDatasetTabAbsentNode.GetBoolean();
                if (!mounted || !topLevelMounted)
                    throw new InvalidOperationException(
                        $"FoamLens v1.6 Field Ribbon/surface did not mount cleanly: {fieldViewUiJson}");
            }

            var ribbonUiJson = await _web.CoreWebView2.ExecuteScriptAsync(
                """
                (()=>{
                  const tabs=['home','data','field','analysis','export','view'];
                  const missingTabs=tabs.filter(x=>!document.getElementById('flRibbonTab-'+x)||!document.getElementById('flRibbonPanel-'+x));
                  const requiredActions=['flRaOpenFolder','flRaCases','flRaCatalog','flRaFieldWorkspace','flRaFieldProfile','flRaFieldTimeSeries','flRaFieldLogs','flRaSplit','flRaInspector','flRaProbe','flRaDifference','flRaCompare3D','flRaExportPng','flRaTheme',...(new URLSearchParams(location.search).get('store')==='1'?[]:['flRaCheckUpdates'])];
                  const missingActions=requiredActions.filter(id=>!document.getElementById(id));
                  const ribbon=document.getElementById('flRibbon');
                  const labels=[...document.querySelectorAll('#flRibbon .flRibbonLabel')];
                  const icons=[...document.querySelectorAll('#flRibbon .flRibbonIcon')];
                  const actions=[...document.querySelectorAll('#flRibbon .flRibbonAction')];
                  const ribbonTabs=[...document.querySelectorAll('#flRibbon .flRibbonTab')];
                  const actionHierarchyComplete=actions.length>0&&actions.every(a=>!!a.querySelector('.flRibbonIcon')&&!!a.querySelector('.flRibbonLabel'));
                  const tabHierarchyComplete=ribbonTabs.length===tabs.length&&ribbonTabs.every(t=>!!t.querySelector('.flRibbonIcon')&&!!t.querySelector('span'));
                  document.getElementById('flRibbonTab-field')?.click();
                  const fieldTabActive=document.getElementById('flRibbonTab-field')?.classList.contains('active')===true;
                  const fieldPanelActive=document.getElementById('flRibbonPanel-field')?.classList.contains('active')===true;
                  const fieldMode=document.body.classList.contains('appMode-field');
                  const internalTabs=[...document.querySelectorAll('#fwViewTabs [data-fw-view]')].map(x=>x.dataset.fwView);
                  const workspaceView=window.FoamLensFieldWorkspace?.getState?.().view||'';
                  const contextHost=document.getElementById('flRibbonContextHost');
                  const timeTransportInRibbon=document.getElementById('fwTimeTransport')?.parentElement?.id==='flRibbonTimeHost';
                  const contextHidden3D=!!contextHost&&getComputedStyle(contextHost).display==='none';
                  document.querySelector('#fwViewTabs [data-fw-view="profile"]')?.click();
                  const contextVisibleProfile=!!contextHost&&getComputedStyle(contextHost).display!=='none';
                  document.querySelector('#fwViewTabs [data-fw-view="3d"]')?.click();
                  document.getElementById('flRibbonTab-home')?.click();
                  document.getElementById('flRaCases')?.click();
                  const casePanel=document.getElementById('caseQuickPanel');
                  const casePanelParent=casePanel?.parentElement?.id||'';
                  const casePanelOpen=!!casePanel&&!casePanel.classList.contains('hidden');
                  casePanel?.classList.add('hidden');
                  return {
                    ribbon:!!ribbon,
                    api:typeof window.FoamLensRibbon?.selectTab==='function',
                    updateApi:typeof window.FoamLensAutoUpdate?.check==='function',
                    missingTabs,
                    missingActions,
                    tabCount:ribbonTabs.length,
                    actionCount:actions.length,
                    labelCount:labels.length,
                    iconCount:icons.length,
                    actionHierarchyComplete,
                    tabHierarchyComplete,
                    fieldTabActive,
                    fieldPanelActive,
                    fieldMode,
                    legacyNavHidden:document.getElementById('modeNavBar')?getComputedStyle(document.getElementById('modeNavBar')).display==='none':false,
                    legacyToolsHidden:document.querySelector('.top .tools')?getComputedStyle(document.querySelector('.top .tools')).display==='none':false,
                    contextPreserved:document.getElementById('globalContextBar')?.parentElement?.id==='flRibbonContextHost',
                    timeTransportInRibbon,
                    contextHidden3D,
                    contextVisibleProfile,
                    internalTabs,
                    workspaceView,
                    casePanelParent,
                    casePanelOpen
                  };
                })()
                """);
            using (var ribbonUi = JsonDocument.Parse(ribbonUiJson))
            {
                var root = ribbonUi.RootElement;
                if (!root.TryGetProperty("ribbon", out var ribbonNode) || !ribbonNode.GetBoolean() ||
                    !root.TryGetProperty("api", out var apiNode) || !apiNode.GetBoolean() ||
                    !root.TryGetProperty("updateApi", out var updateApiNode) || !updateApiNode.GetBoolean() ||
                    !root.TryGetProperty("timeTransportInRibbon", out var timeTransportInRibbonNode) || !timeTransportInRibbonNode.GetBoolean() ||
                    !root.TryGetProperty("contextHidden3D", out var contextHidden3DNode) || !contextHidden3DNode.GetBoolean() ||
                    !root.TryGetProperty("contextVisibleProfile", out var contextVisibleProfileNode) || !contextVisibleProfileNode.GetBoolean())
                    throw new InvalidOperationException(
                        $"FoamLens ribbon did not mount: {ribbonUiJson}");
                foreach (var property in new[] { "missingTabs", "missingActions" })
                    if (root.TryGetProperty(property, out var missing) &&
                        missing.ValueKind == JsonValueKind.Array && missing.GetArrayLength() > 0)
                        throw new InvalidOperationException(
                            $"FoamLens ribbon is incomplete ({property}): {ribbonUiJson}");
                if (!root.TryGetProperty("tabCount", out var tabCount) || tabCount.GetInt32() != 6 ||
                    !root.TryGetProperty("actionCount", out var actionCount) || actionCount.GetInt32() <= 0 ||
                    !root.TryGetProperty("actionHierarchyComplete", out var actionHierarchyComplete) || !actionHierarchyComplete.GetBoolean() ||
                    !root.TryGetProperty("tabHierarchyComplete", out var tabHierarchyComplete) || !tabHierarchyComplete.GetBoolean())
                    throw new InvalidOperationException(
                        $"FoamLens ribbon icon/label hierarchy is incomplete: {ribbonUiJson}");
                foreach (var property in new[] { "fieldTabActive", "fieldPanelActive", "fieldMode",
                                                  "legacyNavHidden", "legacyToolsHidden", "contextPreserved",
                                                  "casePanelOpen" })
                    if (!root.TryGetProperty(property, out var ok) || !ok.GetBoolean())
                        throw new InvalidOperationException(
                            $"FoamLens ribbon runtime behavior failed ({property}): {ribbonUiJson}");
                if (!root.TryGetProperty("casePanelParent", out var casePanelParent) ||
                    !string.Equals(casePanelParent.GetString(), "flRibbon", StringComparison.Ordinal))
                    throw new InvalidOperationException(
                        $"FoamLens ribbon Cases menu was not re-homed correctly: {ribbonUiJson}");
            }
            Log($"FoamLens ribbon runtime UI smoke passed: {ribbonUiJson}");

            var duplicateIdsJson = await _web.CoreWebView2.ExecuteScriptAsync(
                "(()=>{const ids=[...document.querySelectorAll('[id]')].map(x=>x.id);return [...new Set(ids.filter((id,i)=>ids.indexOf(id)!==i))]})()");
            using (var duplicateIds = JsonDocument.Parse(duplicateIdsJson))
            {
                if (duplicateIds.RootElement.ValueKind == JsonValueKind.Array &&
                    duplicateIds.RootElement.GetArrayLength() > 0)
                    throw new InvalidOperationException(
                        $"FoamLens rendered duplicate DOM ids: {duplicateIdsJson}");
            }

            var visualSanityJson = await _web.CoreWebView2.ExecuteScriptAsync(
                "(()=>{const ids=['launchTitle','launchFolder','launchFiles','launchWorkspace'];const bad=[];for(const id of ids){const e=document.getElementById(id);if(!e){bad.push(id+':missing');continue;}const r=e.getBoundingClientRect();const cs=getComputedStyle(e);if(r.width<20||r.height<12||cs.display==='none'||cs.visibility==='hidden'){bad.push(id+':not-visible');continue;}if(r.left<-1||r.right>innerWidth+1)bad.push(id+':outside-viewport');const interactive=/^(BUTTON|SELECT|INPUT)$/.test(e.tagName)||e.classList.contains('btn');if(interactive&&(e.scrollWidth>e.clientWidth+2||e.scrollHeight>e.clientHeight+2))bad.push(id+':content-clipped');}const root=document.documentElement;if(root.scrollWidth>innerWidth+2)bad.push('page:horizontal-overflow');return {bad,width:innerWidth,height:innerHeight,scrollWidth:root.scrollWidth,bodyText:(document.body?.innerText||'').length}})()");
            using (var visualSanity = JsonDocument.Parse(visualSanityJson))
            {
                var root = visualSanity.RootElement;
                if (root.TryGetProperty("bad", out var bad) &&
                    bad.ValueKind == JsonValueKind.Array && bad.GetArrayLength() > 0)
                    throw new InvalidOperationException(
                        $"FoamLens launch UI visual sanity failed: {visualSanityJson}");
                if (!root.TryGetProperty("bodyText", out var bodyText) || bodyText.GetInt32() < 100)
                    throw new InvalidOperationException("FoamLens launch UI rendered insufficient visible content.");
            }

            // Runtime 3D UI smoke: exercise mounted controls in WebView2 rather than
            // relying only on source-text assertions.
            var fieldViewRuntimeJson = await _web.CoreWebView2.ExecuteScriptAsync(
                """
                (()=>{
                  const required=[
                    'fvCanvas','fvOrbitMode','fvPanMode','fvZoomMode','fvFitCamera','fvResetCamera',
                    'fvAxisGizmo','fvRangeMode','fvCacheLimit','fcEnabled','fcAddView',
                    'fvAnimationPanel','fvVideoExport','fvVideoResolution','fvVideoFormat',
                    'fcSwapCases','fcDifferenceMode','fcPrimaryTimeBadge','fcCompareTimeBadge',
                    'meDialog','ppPanel','uxViewNamesPanel','uxComparisonStatus','uxSplitterA','hrHelpOverlay'
                  ];
                  const missing=required.filter(id=>!document.getElementById(id));
                  const primaryCanvas=document.getElementById('canvas');
                  const fieldCanvas=document.getElementById('fvCanvas');
                  const add=document.getElementById('fcAddView');
                  if(add){add.click();add.click();}
                  const extraViews=[3,4].map(id=>({
                    id,
                    viewport:!!document.getElementById('fcExtra'+id+'Viewport'),
                    canvas:!!document.getElementById('fcExtra'+id+'Canvas'),
                    controls:!!document.getElementById('fcExtra'+id+'Controls')
                  }));
                  const ids=[...document.querySelectorAll('[id]')].map(x=>x.id);
                  const duplicateIds=[...new Set(ids.filter((id,i)=>ids.indexOf(id)!==i))];
                  document.querySelector('[data-fv-view="front"]')?.click();
                  document.getElementById('fvPanMode')?.click();
                  document.getElementById('fvOrbitMode')?.click();
                  return {
                    missing,
                    extraViews,
                    duplicateIds,
                    primaryCanvasPosition:primaryCanvas?getComputedStyle(primaryCanvas).position:'',
                    fieldCanvasPosition:fieldCanvas?getComputedStyle(fieldCanvas).position:'',
                    animationApi:typeof window.FoamLensAnimationExport?.descriptorList==='function',
                    compareApi:typeof window.FoamLensFieldCompare?.getVideoDescriptors==='function',
                    fieldApi:typeof window.FoamLensFieldView?.getVideoDescriptor==='function',
                    multipanelApi:typeof window.FoamLensMultiPanelExport?.compose==='function',
                    performanceApi:typeof window.FoamLensPerformance?.stats==='function',
                    workspaceUxApi:typeof window.FoamLensWorkspaceUx?.getState==='function'&&typeof window.FoamLensWorkspaceUx?.setViewName==='function',
                    workspaceResizeApi:typeof window.FoamLensWorkspaceResize?.getSizes==='function'&&typeof window.FoamLensWorkspaceResize?.resetSizes==='function',
                    contextualHelpApi:typeof window.FoamLensContextHelp?.open==='function'&&typeof window.FoamLensContextHelp?.close==='function',
                    workspaceSplitterCount:document.querySelectorAll('.uxWorkspaceSplitter').length,
                    advancedCompareApi:['fcTimeBracket','fcResolveTime','fcInterpolateValues','fcDifferenceValues','fcDifferenceRange','swapPrimaryCompare'].every(k=>typeof window.FoamLensFieldCompare?.[k]==='function'),
                    interpolationSmoke:window.FoamLensFieldCompare?.fcResolveTime?.([0,1],.25,'interpolate')||null,
                    percentDifferenceSmoke:Number(window.FoamLensFieldCompare?.fcDifferenceValues?.([10],[8],'percent')?.[0]),
                    syncModes:[...document.querySelectorAll('#fcSync option')].map(x=>x.value),
                    differenceModes:[...document.querySelectorAll('#fcDifferenceMode option')].map(x=>x.value),
                    extraTimeBadges:[3,4].map(id=>!!document.getElementById('fcExtra'+id+'TimeBadge')),
                    rangeModes:[...document.querySelectorAll('#fvRangeMode option')].map(x=>x.value),
                    cameraPresetCount:document.querySelectorAll('[data-fv-view]').length
                  };
                })()
                """);
            using (var fieldViewRuntime = JsonDocument.Parse(fieldViewRuntimeJson))
            {
                var root = fieldViewRuntime.RootElement;
                if (root.TryGetProperty("missing", out var missing) &&
                    missing.ValueKind == JsonValueKind.Array && missing.GetArrayLength() > 0)
                    throw new InvalidOperationException(
                        $"FoamLens v{DesktopVersionText} 3D runtime controls are missing: {fieldViewRuntimeJson}");
                if (!root.TryGetProperty("extraViews", out var extraViews) ||
                    extraViews.ValueKind != JsonValueKind.Array || extraViews.GetArrayLength() != 2 ||
                    extraViews.EnumerateArray().Any(v =>
                        !v.TryGetProperty("viewport", out var viewport) || !viewport.GetBoolean() ||
                        !v.TryGetProperty("canvas", out var canvas) || !canvas.GetBoolean() ||
                        !v.TryGetProperty("controls", out var controls) || !controls.GetBoolean()))
                    throw new InvalidOperationException(
                        $"FoamLens synchronized View 3/4 runtime mount failed: {fieldViewRuntimeJson}");
                if (root.TryGetProperty("duplicateIds", out var duplicateIdsAfterViews) &&
                    duplicateIdsAfterViews.ValueKind == JsonValueKind.Array &&
                    duplicateIdsAfterViews.GetArrayLength() > 0)
                    throw new InvalidOperationException(
                        $"FoamLens multi-view created duplicate DOM ids: {fieldViewRuntimeJson}");
                if (!root.TryGetProperty("primaryCanvasPosition", out var primaryPosition) ||
                    !string.Equals(primaryPosition.GetString(), "absolute", StringComparison.OrdinalIgnoreCase))
                    throw new InvalidOperationException(
                        $"FoamLens primary 2D canvas lost its scoped absolute layout: {fieldViewRuntimeJson}");
                if (!root.TryGetProperty("fieldCanvasPosition", out var fieldPosition) ||
                    string.Equals(fieldPosition.GetString(), "absolute", StringComparison.OrdinalIgnoreCase))
                    throw new InvalidOperationException(
                        $"FoamLens 3D canvas is still inheriting the global absolute-canvas defect: {fieldViewRuntimeJson}");
                foreach (var property in new[] { "animationApi", "compareApi", "fieldApi",
                                                  "multipanelApi", "performanceApi", "workspaceUxApi",
                                                  "workspaceResizeApi", "contextualHelpApi", "advancedCompareApi" })
                    if (!root.TryGetProperty(property, out var apiNode) || !apiNode.GetBoolean())
                        throw new InvalidOperationException(
                            $"FoamLens 3D runtime API missing ({property}): {fieldViewRuntimeJson}");
                if (!root.TryGetProperty("workspaceSplitterCount", out var splitterCount) ||
                    splitterCount.GetInt32() != 1)
                    throw new InvalidOperationException(
                        $"FoamLens Field Workspace splitters did not mount correctly: {fieldViewRuntimeJson}");
                if (!root.TryGetProperty("rangeModes", out var rangeModes) ||
                    rangeModes.ValueKind != JsonValueKind.Array ||
                    !new[] { "current", "global", "manual" }.All(expected =>
                        rangeModes.EnumerateArray().Any(x =>
                            string.Equals(x.GetString(), expected, StringComparison.OrdinalIgnoreCase))))
                    throw new InvalidOperationException(
                        $"FoamLens scientific color-range modes are incomplete: {fieldViewRuntimeJson}");
                if (!root.TryGetProperty("syncModes", out var syncModes) ||
                    syncModes.ValueKind != JsonValueKind.Array ||
                    !new[] { "exact", "nearest", "interpolate" }.All(expected =>
                        syncModes.EnumerateArray().Any(x =>
                            string.Equals(x.GetString(), expected, StringComparison.OrdinalIgnoreCase))))
                    throw new InvalidOperationException(
                        $"FoamLens physical-time sync modes are incomplete: {fieldViewRuntimeJson}");
                if (!root.TryGetProperty("differenceModes", out var differenceModes) ||
                    differenceModes.ValueKind != JsonValueKind.Array ||
                    !new[] { "signed", "absolute", "percent" }.All(expected =>
                        differenceModes.EnumerateArray().Any(x =>
                            string.Equals(x.GetString(), expected, StringComparison.OrdinalIgnoreCase))))
                    throw new InvalidOperationException(
                        $"FoamLens 3D difference modes are incomplete: {fieldViewRuntimeJson}");
                if (!root.TryGetProperty("interpolationSmoke", out var interpolationSmoke) ||
                    !interpolationSmoke.TryGetProperty("ok", out var interpolationOk) ||
                    !interpolationOk.GetBoolean() ||
                    !interpolationSmoke.TryGetProperty("interpolated", out var interpolatedNode) ||
                    !interpolatedNode.GetBoolean() ||
                    !interpolationSmoke.TryGetProperty("weight", out var interpolationWeight) ||
                    Math.Abs(interpolationWeight.GetDouble() - 0.25) > 1e-12 ||
                    !root.TryGetProperty("percentDifferenceSmoke", out var percentDifferenceSmoke) ||
                    Math.Abs(percentDifferenceSmoke.GetDouble() - 20.0) > 1e-12)
                    throw new InvalidOperationException(
                        $"FoamLens interpolation/difference runtime math failed: {fieldViewRuntimeJson}");
                if (!root.TryGetProperty("extraTimeBadges", out var extraTimeBadges) ||
                    extraTimeBadges.ValueKind != JsonValueKind.Array ||
                    extraTimeBadges.GetArrayLength() != 2 ||
                    extraTimeBadges.EnumerateArray().Any(x => !x.GetBoolean()))
                    throw new InvalidOperationException(
                        $"FoamLens per-viewport time badges did not mount: {fieldViewRuntimeJson}");
                if (!root.TryGetProperty("cameraPresetCount", out var presetCount) ||
                    presetCount.GetInt32() < 7)
                    throw new InvalidOperationException(
                        $"FoamLens standard camera presets did not mount: {fieldViewRuntimeJson}");
            }
            Log($"FoamLens v{DesktopVersionText} 3D runtime UI smoke passed: {fieldViewRuntimeJson}");

            // Exercise the actual WebView2 recording primitives used by FoamLens video export.
            // ExecuteScriptAsync serializes an unresolved JavaScript Promise as {}, so the
            // async encoder writes its final result to a global slot that C# polls explicitly.
            await _web.CoreWebView2.ExecuteScriptAsync(
                """
                window.__foamLensVideoSmokeResult=null;
                (async()=>{
                  try{
                    if(typeof MediaRecorder==='undefined'){window.__foamLensVideoSmokeResult={ok:false,reason:'MediaRecorder unavailable'};return}
                    if(typeof HTMLCanvasElement.prototype.captureStream!=='function'){window.__foamLensVideoSmokeResult={ok:false,reason:'captureStream unavailable'};return}
                    const candidates=['video/mp4;codecs=avc1','video/mp4','video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'];
                    const mime=candidates.find(x=>{try{return MediaRecorder.isTypeSupported(x)}catch{return false}})||'';
                    const canvas=document.createElement('canvas');canvas.width=160;canvas.height=90;
                    const ctx=canvas.getContext('2d'),stream=canvas.captureStream(12),chunks=[];
                    let recorder;
                    try{recorder=mime?new MediaRecorder(stream,{mimeType:mime}):new MediaRecorder(stream)}
                    catch(e){stream.getTracks().forEach(t=>t.stop());window.__foamLensVideoSmokeResult={ok:false,reason:String(e)};return}
                    const stopped=new Promise((resolve,reject)=>{
                      recorder.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data)};
                      recorder.onstop=resolve;
                      recorder.onerror=e=>reject(e.error||new Error('MediaRecorder runtime smoke error'));
                    });
                    recorder.start(50);
                    for(let i=0;i<5;i++){
                      ctx.clearRect(0,0,160,90);
                      ctx.fillStyle='rgb('+(30+i*35)+','+(70+i*20)+','+(120+i*15)+')';
                      ctx.fillRect(0,0,160,90);
                      await new Promise(r=>setTimeout(r,90));
                    }
                    recorder.stop();await stopped;stream.getTracks().forEach(t=>t.stop());
                    const blob=new Blob(chunks,{type:recorder.mimeType||mime||'video/webm'});
                    window.__foamLensVideoSmokeResult={ok:blob.size>0,size:blob.size,mime:recorder.mimeType||mime||blob.type,chunks:chunks.length};
                  }catch(e){
                    window.__foamLensVideoSmokeResult={ok:false,reason:String(e?.stack||e)};
                  }
                })();
                """);

            string videoRuntimeJson = "null";
            var videoSmokeDeadline = Stopwatch.StartNew();
            while (videoSmokeDeadline.Elapsed < TimeSpan.FromSeconds(8))
            {
                await Task.Delay(100);
                videoRuntimeJson = await _web.CoreWebView2.ExecuteScriptAsync(
                    "window.__foamLensVideoSmokeResult");
                if (!string.Equals(videoRuntimeJson.Trim(), "null", StringComparison.OrdinalIgnoreCase) &&
                    !string.Equals(videoRuntimeJson.Trim(), "undefined", StringComparison.OrdinalIgnoreCase) &&
                    !string.Equals(videoRuntimeJson.Trim(), "{}", StringComparison.Ordinal))
                    break;
            }
            using (var videoRuntime = JsonDocument.Parse(videoRuntimeJson))
            {
                var root = videoRuntime.RootElement;
                if (!root.TryGetProperty("ok", out var ok) || !ok.GetBoolean() ||
                    !root.TryGetProperty("size", out var size) || size.GetInt64() <= 0)
                    throw new InvalidOperationException(
                        $"FoamLens WebView2 video-encoding runtime smoke failed: {videoRuntimeJson}");
            }
            await _web.CoreWebView2.ExecuteScriptAsync(
                "delete window.__foamLensVideoSmokeResult;");
            Log($"FoamLens WebView2 video runtime smoke passed: {videoRuntimeJson}");

            var smokeCasePath = Environment.GetEnvironmentVariable("FOAMLENS_SMOKE_OPENFOAM_CASE");
            if (!string.IsNullOrWhiteSpace(smokeCasePath))
            {
                var fullCasePath = Path.GetFullPath(smokeCasePath);
                if (!Directory.Exists(fullCasePath))
                    throw new InvalidOperationException(
                        $"FoamLens real-case smoke folder does not exist: {fullCasePath}");

                var smokeRefs = BuildSmokeNativeFileRefs(fullCasePath);
                if (smokeRefs.Count < 4)
                    throw new InvalidOperationException(
                        $"FoamLens real-case smoke folder contained too few files: {smokeRefs.Count}");

                var preferredRegion =
                    Environment.GetEnvironmentVariable("FOAMLENS_SMOKE_REGION") ?? "";
                var preferredField =
                    Environment.GetEnvironmentVariable("FOAMLENS_SMOKE_FIELD") ?? "";
                var preferredTime =
                    Environment.GetEnvironmentVariable("FOAMLENS_SMOKE_TIME") ?? "";
                var minimumFieldSpanText =
                    Environment.GetEnvironmentVariable("FOAMLENS_SMOKE_MIN_FIELD_SPAN") ?? "";
                var minimumCasesText =
                    Environment.GetEnvironmentVariable("FOAMLENS_SMOKE_MIN_CASES") ?? "";
                var initialCaseName =
                    Environment.GetEnvironmentVariable("FOAMLENS_SMOKE_INITIAL_CASE") ?? "";
                var switchCaseName =
                    Environment.GetEnvironmentVariable("FOAMLENS_SMOKE_SWITCH_CASE") ?? "";
                var refsJson = JsonSerializer.Serialize(smokeRefs, _json);
                var optionsJson = JsonSerializer.Serialize(
                    new {
                        region = preferredRegion,
                        field = preferredField,
                        time = preferredTime,
                        initialCase = initialCaseName,
                        switchCase = switchCaseName
                    }, _json);

                await _web.CoreWebView2.ExecuteScriptAsync(
                    "window.__foamLensRealCaseSmokeResult=null;");
                var launchRealCaseScript =
                    "(async()=>{try{" +
                    "const helper=window.__foamLensSmokeImportNativeRefs;" +
                    "if(typeof helper!=='function')throw new Error('Smoke import helper unavailable');" +
                    $"const data=await helper({refsJson},{optionsJson});" +
                    "window.__foamLensRealCaseSmokeResult={ok:true,data};" +
                    "}catch(e){window.__foamLensRealCaseSmokeResult={ok:false,error:String(e?.stack||e)};}})();";
                await _web.CoreWebView2.ExecuteScriptAsync(launchRealCaseScript);

                string realCaseJson = "null";
                var realCaseDeadline = Stopwatch.StartNew();
                while (realCaseDeadline.Elapsed < TimeSpan.FromSeconds(120))
                {
                    await Task.Delay(150);
                    realCaseJson = await _web.CoreWebView2.ExecuteScriptAsync(
                        "window.__foamLensRealCaseSmokeResult");
                    if (!string.Equals(realCaseJson.Trim(), "null", StringComparison.OrdinalIgnoreCase) &&
                        !string.Equals(realCaseJson.Trim(), "undefined", StringComparison.OrdinalIgnoreCase) &&
                        !string.Equals(realCaseJson.Trim(), "{}", StringComparison.Ordinal))
                        break;
                }

                using (var realCaseResult = JsonDocument.Parse(realCaseJson))
                {
                    var root = realCaseResult.RootElement;
                    if (!root.TryGetProperty("ok", out var ok) || !ok.GetBoolean())
                        throw new InvalidOperationException(
                            $"FoamLens real OpenFOAM runtime smoke failed: {realCaseJson}");
                    if (!root.TryGetProperty("data", out var data))
                        throw new InvalidOperationException(
                            $"FoamLens real OpenFOAM runtime smoke returned no data: {realCaseJson}");
                    if (!data.TryGetProperty("ready", out var ready) || !ready.GetBoolean() ||
                        !data.TryGetProperty("cells", out var cells) || cells.GetInt32() <= 0 ||
                        !data.TryGetProperty("values", out var values) || values.GetInt32() <= 0 ||
                        !data.TryGetProperty("finiteRange", out var finiteRange) || !finiteRange.GetBoolean() ||
                        !data.TryGetProperty("surfaceVertices", out var surfaceVertices) ||
                            surfaceVertices.GetInt32() <= 0 ||
                        !data.TryGetProperty("webgl", out var webgl) || !webgl.GetBoolean() ||
                        !data.TryGetProperty("glError", out var glError) || glError.GetInt32() != 0)
                        throw new InvalidOperationException(
                            $"FoamLens real OpenFOAM 3D frame did not render safely: {realCaseJson}");

                    if (!data.TryGetProperty("fieldWorkspaceActive", out var workspaceActiveNode) ||
                        !workspaceActiveNode.GetBoolean() ||
                        !data.TryGetProperty("field3DHostMounted", out var field3DHostNode) ||
                        !field3DHostNode.GetBoolean() ||
                        !data.TryGetProperty("workspaceView", out var workspaceViewNode) ||
                        !string.Equals(workspaceViewNode.GetString(), "3d", StringComparison.Ordinal) ||
                        !data.TryGetProperty("plotHiddenIn3D", out var plotHiddenNode) ||
                        !plotHiddenNode.GetBoolean() ||
                        !data.TryGetProperty("inspectorHidden", out var inspectorHiddenNode) ||
                        !inspectorHiddenNode.GetBoolean())
                        throw new InvalidOperationException(
                            $"FoamLens Field workspace did not start in a true single-view 3D focus state: {realCaseJson}");
                    if (!data.TryGetProperty("plotSurfaceCount", out var plotSurfaceCountNode) ||
                        plotSurfaceCountNode.GetInt32() != 3 ||
                        !data.TryGetProperty("plotSurfaceParentsStable", out var plotSurfaceParentsStableNode) ||
                        !plotSurfaceParentsStableNode.GetBoolean() ||
                        !data.TryGetProperty("plotSurfaceDataParent", out var plotSurfaceDataParentNode) ||
                        !string.Equals(plotSurfaceDataParentNode.GetString(), "chartViewport", StringComparison.Ordinal) ||
                        !data.TryGetProperty("plotSurfaceAnalysisParent", out var plotSurfaceAnalysisParentNode) ||
                        !string.Equals(plotSurfaceAnalysisParentNode.GetString(), "chartViewport", StringComparison.Ordinal) ||
                        !data.TryGetProperty("plotSurfaceFieldParent", out var plotSurfaceFieldParentNode) ||
                        !string.Equals(plotSurfaceFieldParentNode.GetString(), "fw2DHost", StringComparison.Ordinal) ||
                        !data.TryGetProperty("plotSurfaceFieldOwnerBefore", out var plotSurfaceFieldOwnerBeforeNode) ||
                        !string.Equals(plotSurfaceFieldOwnerBeforeNode.GetString(), "field", StringComparison.Ordinal) ||
                        !data.TryGetProperty("plotSurfaceDataActive", out var plotSurfaceDataActiveNode) ||
                        !plotSurfaceDataActiveNode.GetBoolean() ||
                        !data.TryGetProperty("plotSurfaceAnalysisActive", out var plotSurfaceAnalysisActiveNode) ||
                        !plotSurfaceAnalysisActiveNode.GetBoolean() ||
                        !data.TryGetProperty("plotSurfaceDataRestored", out var plotSurfaceDataRestoredNode) ||
                        !plotSurfaceDataRestoredNode.GetBoolean() ||
                        !data.TryGetProperty("plotSurfaceFieldRestored", out var plotSurfaceFieldRestoredNode) ||
                        !plotSurfaceFieldRestoredNode.GetBoolean() ||
                        !data.TryGetProperty("plotSurfaceError", out var plotSurfaceErrorNode) ||
                        !string.IsNullOrWhiteSpace(plotSurfaceErrorNode.GetString()))
                        throw new InvalidOperationException(
                            $"FoamLens stable Data / Analysis / Field plot-surface runtime smoke failed: {realCaseJson}");

                    if (!data.TryGetProperty("sessionRestored", out var sessionRestoredNode) ||
                        !sessionRestoredNode.GetBoolean() ||
                        !data.TryGetProperty("sessionStoredSchema", out var sessionStoredSchemaNode) ||
                        sessionStoredSchemaNode.GetInt32() != 1 ||
                        !data.TryGetProperty("sessionStoredMode", out var sessionStoredModeNode) ||
                        !string.Equals(sessionStoredModeNode.GetString(), "field", StringComparison.Ordinal) ||
                        !data.TryGetProperty("sessionRestoredMode", out var sessionRestoredModeNode) ||
                        !string.Equals(sessionRestoredModeNode.GetString(), "field", StringComparison.Ordinal) ||
                        !data.TryGetProperty("sessionStoredRoot", out var sessionStoredRootNode) ||
                        !data.TryGetProperty("sessionExpectedRoot", out var sessionExpectedRootNode) ||
                        !string.Equals(sessionStoredRootNode.GetString(), sessionExpectedRootNode.GetString(), StringComparison.Ordinal) ||
                        !data.TryGetProperty("sessionRestoredCaseId", out var sessionRestoredCaseIdNode) ||
                        !data.TryGetProperty("sessionExpectedCaseId", out var sessionExpectedCaseIdNode) ||
                        sessionRestoredCaseIdNode.GetInt32() != sessionExpectedCaseIdNode.GetInt32() ||
                        !data.TryGetProperty("sessionStoredRegion", out var sessionStoredRegionNode) ||
                        !data.TryGetProperty("sessionRestoredRegion", out var sessionRestoredRegionNode) ||
                        !string.Equals(sessionStoredRegionNode.GetString(), sessionRestoredRegionNode.GetString(), StringComparison.Ordinal) ||
                        !data.TryGetProperty("sessionStoredDataView", out var sessionStoredDataViewNode) ||
                        !data.TryGetProperty("sessionRestoredDataView", out var sessionRestoredDataViewNode) ||
                        !string.Equals(sessionStoredDataViewNode.GetString(), sessionRestoredDataViewNode.GetString(), StringComparison.Ordinal) ||
                        !data.TryGetProperty("sessionInspectorRestored", out var sessionInspectorRestoredNode) ||
                        !sessionInspectorRestoredNode.GetBoolean() ||
                        !data.TryGetProperty("sessionFieldViewRestored", out var sessionFieldViewRestoredNode) ||
                        !sessionFieldViewRestoredNode.GetBoolean() ||
                        !data.TryGetProperty("sessionFieldCompanionRestored", out var sessionFieldCompanionRestoredNode) ||
                        !sessionFieldCompanionRestoredNode.GetBoolean() ||
                        !data.TryGetProperty("sessionSmokeError", out var sessionSmokeErrorNode) ||
                        !string.IsNullOrWhiteSpace(sessionSmokeErrorNode.GetString()))
                        throw new InvalidOperationException(
                            $"FoamLens cross-session state round-trip smoke failed: {realCaseJson}");

                    if (!data.TryGetProperty("fieldRibbonVisible", out var fieldRibbonVisibleNode) ||
                        !fieldRibbonVisibleNode.GetBoolean() ||
                        !data.TryGetProperty("fieldRibbonText", out var fieldRibbonTextNode) ||
                        string.IsNullOrWhiteSpace(fieldRibbonTextNode.GetString()) ||
                        !data.TryGetProperty("legacyFieldButtonAbsent", out var legacyFieldButtonAbsentNode) ||
                        !legacyFieldButtonAbsentNode.GetBoolean() ||
                        !data.TryGetProperty("legacyFieldDatasetTabAbsent", out var legacyFieldDatasetTabAbsentNode) ||
                        !legacyFieldDatasetTabAbsentNode.GetBoolean() ||
                        !data.TryGetProperty("legacyFieldModeHidden", out var legacyFieldModeHiddenNode) ||
                        !legacyFieldModeHiddenNode.GetBoolean())
                        throw new InvalidOperationException(
                            $"FoamLens v1.6 Field Ribbon navigation / legacy-nav retirement failed after case import: {realCaseJson}");

                    if (!data.TryGetProperty("streamlineSeed400", out var streamlineSeed400Node) ||
                        streamlineSeed400Node.GetInt32() != 400 ||
                        !data.TryGetProperty("advancedStreamlineControls", out var advancedStreamlineControlsNode) ||
                        !advancedStreamlineControlsNode.GetBoolean())
                        throw new InvalidOperationException(
                            $"FoamLens advanced streamline runtime controls are incomplete: {realCaseJson}");
                    if (!data.TryGetProperty("multiViewControlSet", out var multiViewControlSetNode) ||
                        !multiViewControlSetNode.GetBoolean())
                        throw new InvalidOperationException(
                            $"FoamLens linked/independent multi-view controls are incomplete: {realCaseJson}");
                    if (!data.TryGetProperty("performancePanelMounted", out var performancePanelMounted) ||
                        !performancePanelMounted.GetBoolean() ||
                        !data.TryGetProperty("performanceLoads", out var performanceLoads) ||
                        performanceLoads.GetInt32() < 1 ||
                        !data.TryGetProperty("performanceLastMs", out var performanceLastMs) ||
                        !double.IsFinite(performanceLastMs.GetDouble()) ||
                        performanceLastMs.GetDouble() < 0 ||
                        !data.TryGetProperty("performanceAvgMs", out var performanceAvgMs) ||
                        !double.IsFinite(performanceAvgMs.GetDouble()) ||
                        performanceAvgMs.GetDouble() < 0)
                        throw new InvalidOperationException(
                            $"FoamLens progressive-performance telemetry runtime smoke failed: {realCaseJson}");
                    if (!data.TryGetProperty("performanceBenchmarkSchema", out var performanceBenchmarkSchema) ||
                        !string.Equals(performanceBenchmarkSchema.GetString(), "foamlens-performance-ab-v1", StringComparison.Ordinal) ||
                        !data.TryGetProperty("performanceBenchmarkFinite", out var performanceBenchmarkFinite) ||
                        !performanceBenchmarkFinite.GetBoolean() ||
                        !data.TryGetProperty("performanceBenchmarkFrames", out var performanceBenchmarkFrames) ||
                        performanceBenchmarkFrames.GetInt32() != 3 ||
                        !data.TryGetProperty("performanceBenchmarkRounds", out var performanceBenchmarkRounds) ||
                        performanceBenchmarkRounds.GetInt32() != 2 ||
                        !data.TryGetProperty("performanceBaselineCount", out var performanceBaselineCount) ||
                        performanceBaselineCount.GetInt32() != 6 ||
                        !data.TryGetProperty("performanceOptimizedCount", out var performanceOptimizedCount) ||
                        performanceOptimizedCount.GetInt32() != 6 ||
                        !data.TryGetProperty("performanceBaselineMean", out var performanceBaselineMean) ||
                        !double.IsFinite(performanceBaselineMean.GetDouble()) ||
                        performanceBaselineMean.GetDouble() <= 0 ||
                        !data.TryGetProperty("performanceOptimizedMean", out var performanceOptimizedMean) ||
                        !double.IsFinite(performanceOptimizedMean.GetDouble()) ||
                        performanceOptimizedMean.GetDouble() <= 0 ||
                        !data.TryGetProperty("performanceSpeedupFactor", out var performanceSpeedupFactor) ||
                        !double.IsFinite(performanceSpeedupFactor.GetDouble()) ||
                        performanceSpeedupFactor.GetDouble() <= 0 ||
                        !data.TryGetProperty("performanceBenchmarkError", out var performanceBenchmarkError) ||
                        !string.IsNullOrWhiteSpace(performanceBenchmarkError.GetString()))
                        throw new InvalidOperationException(
                            $"FoamLens controlled performance A/B benchmark smoke failed: {realCaseJson}");
                    if (!data.TryGetProperty("profile3DPoints", out var profile3DPointsNode) ||
                        profile3DPointsNode.GetInt32() < 20 ||
                        !data.TryGetProperty("profile3DFinite", out var profile3DFiniteNode) ||
                        profile3DFiniteNode.GetInt32() != profile3DPointsNode.GetInt32() ||
                        !data.TryGetProperty("profile3DDerivedKind", out var profile3DKindNode) ||
                        !string.Equals(profile3DKindNode.GetString(), "field3d_line_profile", StringComparison.Ordinal) ||
                        !data.TryGetProperty("profile3DLineLength", out var profile3DLineLengthNode) ||
                        !double.IsFinite(profile3DLineLengthNode.GetDouble()) ||
                        profile3DLineLengthNode.GetDouble() <= 0)
                        throw new InvalidOperationException(
                            $"FoamLens 3D-defined Spatial Profile runtime smoke failed: {realCaseJson}");

                    if (!string.IsNullOrWhiteSpace(minimumCasesText) &&
                        int.TryParse(minimumCasesText, NumberStyles.Integer,
                            CultureInfo.InvariantCulture, out var minimumCases))
                    {
                        if (!data.TryGetProperty("caseCount", out var caseCountNode) ||
                            caseCountNode.GetInt32() < minimumCases ||
                            !data.TryGetProperty("readyCaseCount", out var readyCaseCountNode) ||
                            readyCaseCountNode.GetInt32() < minimumCases)
                            throw new InvalidOperationException(
                                $"FoamLens multi-case smoke imported fewer than {minimumCases} 3D-ready cases: {realCaseJson}");
                    }
                    if (!string.IsNullOrWhiteSpace(initialCaseName) &&
                        !string.IsNullOrWhiteSpace(switchCaseName))
                    {
                        if (!data.TryGetProperty("initialCaseName", out var initialCaseNode) ||
                            !string.Equals(initialCaseNode.GetString(), initialCaseName, StringComparison.Ordinal) ||
                            !data.TryGetProperty("switchedCaseName", out var switchedCaseNode) ||
                            !string.Equals(switchedCaseNode.GetString(), switchCaseName, StringComparison.Ordinal) ||
                            !data.TryGetProperty("caseSwitchChanged", out var changedNode) ||
                            !changedNode.GetBoolean() ||
                            !data.TryGetProperty("rendererCaseId", out var rendererCaseNode) ||
                            !data.TryGetProperty("switchedCaseId", out var switchedCaseIdNode) ||
                            rendererCaseNode.GetInt32() != switchedCaseIdNode.GetInt32())
                            throw new InvalidOperationException(
                                $"FoamLens 3D case selector did not switch the rendered case from '{initialCaseName}' to '{switchCaseName}': {realCaseJson}");
                    }

                    if (!string.IsNullOrWhiteSpace(preferredRegion) &&
                        (!data.TryGetProperty("region", out var regionNode) ||
                         !string.Equals(regionNode.GetString(), preferredRegion,
                             StringComparison.Ordinal)))
                        throw new InvalidOperationException(
                            $"FoamLens real-case smoke did not select requested region '{preferredRegion}': {realCaseJson}");
                    if (!string.IsNullOrWhiteSpace(preferredField) &&
                        (!data.TryGetProperty("field", out var fieldNode) ||
                         !string.Equals(fieldNode.GetString(), preferredField,
                             StringComparison.Ordinal)))
                        throw new InvalidOperationException(
                            $"FoamLens real-case smoke did not select requested field '{preferredField}': {realCaseJson}");
                    if (!string.IsNullOrWhiteSpace(preferredTime) &&
                        double.TryParse(preferredTime, NumberStyles.Float,
                            CultureInfo.InvariantCulture, out var requestedTimeValue))
                    {
                        if (!data.TryGetProperty("time", out var timeNode) ||
                            Math.Abs(timeNode.GetDouble() - requestedTimeValue) > 1e-9)
                            throw new InvalidOperationException(
                                $"FoamLens real-case smoke did not load requested physical time '{preferredTime}': {realCaseJson}");
                    }
                    if (!string.IsNullOrWhiteSpace(minimumFieldSpanText) &&
                        double.TryParse(minimumFieldSpanText, NumberStyles.Float,
                            CultureInfo.InvariantCulture, out var minimumFieldSpan))
                    {
                        if (!data.TryGetProperty("span", out var spanNode) ||
                            !double.IsFinite(spanNode.GetDouble()) ||
                            spanNode.GetDouble() < minimumFieldSpan)
                            throw new InvalidOperationException(
                                $"FoamLens real-case smoke field span is below the required {minimumFieldSpanText}: {realCaseJson}");
                    }
                }

                // Validate the exact multi-view defects reported by the user:
                // View 2 must render its own scientific legend, and Probe must
                // produce a visible marker inside the secondary viewport.
                await _web.CoreWebView2.ExecuteScriptAsync(
                    """
                    window.__foamLensSecondaryVisualSmokeResult=null;
                    (async()=>{
                      try{
                        const api=window.FoamLensFieldCompare;
                        if(typeof api?.fcRefreshFrame!=='function'||typeof api?.getProbeDescriptors!=='function'||typeof api?.getVideoDescriptors!=='function'||typeof api?.getViewStates!=='function')
                          throw new Error('Synchronized 3D comparison public runtime API is unavailable.');

                        const enabled=document.getElementById('fcEnabled');
                        if(!enabled)throw new Error('Synchronized View 2 control is unavailable.');
                        if(!enabled.checked){
                          enabled.checked=true;
                          enabled.dispatchEvent(new Event('change',{bubbles:true}));
                        }
                        await api.fcRefreshFrame();

                        const caseSel=document.getElementById('fcCase');
                        const primaryCaseId=String(document.getElementById('fvCase')?.value||'');
                        const differentCase=[...(caseSel?.options||[])].find(o=>String(o.value)!==primaryCaseId);
                        if(!differentCase)throw new Error('No distinct View 2 case is available in the multi-case smoke fixture.');
                        caseSel.value=differentCase.value;
                        caseSel.dispatchEvent(new Event('change',{bubbles:true}));
                        await api.fcRefreshFrame();

                        const expectedCaseId=String(differentCase.value);
                        const expectedCaseName=(differentCase.textContent||'').trim();
                        let view2=(api.getVideoDescriptors()||[]).find(x=>x.key==='view2');
                        const casePersisted=String(caseSel.value)===expectedCaseId&&
                          String(view2?.caseName||'')===expectedCaseName;

                        if(typeof api?.copyPrimarySettingsToCompare!=='function'||typeof api?.swapPrimaryCompare!=='function')
                          throw new Error('Copy/Swap comparison runtime API is unavailable.');
                        const primaryRegion=String(document.getElementById('fvRegion')?.value||'');
                        const primaryField=String(document.getElementById('fvField')?.value||'');
                        const primaryComponent=String(document.getElementById('fvComponent')?.value||'value');
                        await api.copyPrimarySettingsToCompare();
                        const copySettingsApplied=
                          String(document.getElementById('fcRegion')?.value||'')===primaryRegion&&
                          String(document.getElementById('fcField')?.value||'')===primaryField&&
                          String(document.getElementById('fcComponent')?.value||'value')===primaryComponent;

                        const fieldSel=document.getElementById('fcField');
                        const differentField=[...(fieldSel?.options||[])].find(o=>String(o.value)!==primaryField);
                        if(differentField){
                          fieldSel.value=differentField.value;
                          fieldSel.dispatchEvent(new Event('change',{bubbles:true}));
                          await api.fcRefreshFrame();
                        }
                        view2=(api.getVideoDescriptors()||[]).find(x=>x.key==='view2');

                        const multiApi=window.FoamLensMultiPanelExport;
                        if(typeof multiApi?.compose!=='function'||typeof multiApi?.getSources!=='function')
                          throw new Error('Multi-panel export runtime API is unavailable.');
                        const multiSources=multiApi.getSources();
                        const primaryExportSource=multiSources.find(x=>x.key==='primary');
                        if(!primaryExportSource||typeof multiApi?.renderSource!=='function')throw new Error('High-resolution 3D export source/runtime API is unavailable.');
                        const primaryCanvas=document.getElementById(primaryExportSource.canvasId);
                        const primaryWidthBefore=Number(primaryCanvas?.width||0),primaryHeightBefore=Number(primaryCanvas?.height||0);
                        const hiResPrimary=await multiApi.renderSource(primaryExportSource,1800,1200);
                        const hiRes3DWidth=Number(hiResPrimary?.width||0),hiRes3DHeight=Number(hiResPrimary?.height||0);
                        const primaryRestored=Number(primaryCanvas?.width||0)===primaryWidthBefore&&Number(primaryCanvas?.height||0)===primaryHeightBefore;
                        const hiResMeta=multiApi.getLastHiRes?.()||null;
                        const highResRerendered=!!hiResMeta?.rerendered&&Number(hiResMeta?.width)===1800&&Number(hiResMeta?.height)===1200;
                        const multiResult=await multiApi.compose(multiSources.filter(x=>x.key==='primary'||x.key==='view2').slice(0,2));
                        const multiPanelSourceCount=multiResult?.sources?.length||0;
                        const multiPanelWidth=Number(multiResult?.canvas?.width||0);
                        const multiPanelHeight=Number(multiResult?.canvas?.height||0);
                        const multiPanelPixels=multiPanelWidth*multiPanelHeight;

                        const canvas=document.getElementById('fcCanvas');
                        if(!canvas)throw new Error('View 2 canvas is unavailable.');
                        const linkCameras=document.getElementById('fcLinkCameras');
                        const syncVisuals=document.getElementById('fcSyncVisuals');
                        if(!linkCameras||!syncVisuals)throw new Error('Independent View 2 controls are unavailable.');
                        linkCameras.checked=false;
                        linkCameras.dispatchEvent(new Event('change',{bubbles:true}));
                        await new Promise(resolve=>requestAnimationFrame(resolve));
                        const stateBefore=api.getViewStates()||[];
                        const cameraBefore=stateBefore.find(v=>v.id==='view2')?.camera;
                        const primaryDistanceBefore=Number(stateBefore.find(v=>v.id==='view1')?.camera?.distance);
                        canvas.dispatchEvent(new WheelEvent('wheel',{bubbles:true,cancelable:true,deltaY:140}));
                        await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
                        const stateAfter=api.getViewStates()||[];
                        const cameraAfter=stateAfter.find(v=>v.id==='view2')?.camera;
                        const primaryDistanceAfter=Number(stateAfter.find(v=>v.id==='view1')?.camera?.distance);
                        const independentCameraChanged=Number.isFinite(Number(cameraBefore?.distance))&&Number.isFinite(Number(cameraAfter?.distance))&&Math.abs(Number(cameraAfter.distance)-Number(cameraBefore.distance))>1e-12;
                        const primaryCameraUnaffected=Number.isFinite(primaryDistanceBefore)&&Number.isFinite(primaryDistanceAfter)&&Math.abs(primaryDistanceAfter-primaryDistanceBefore)<=Math.max(1,Math.abs(primaryDistanceBefore))*1e-12;

                        syncVisuals.checked=false;
                        syncVisuals.dispatchEvent(new Event('change',{bubbles:true}));
                        const view2Opacity=document.getElementById('fcView2Opacity');
                        if(!view2Opacity)throw new Error('View 2 independent opacity control is unavailable.');
                        const primaryOpacity=Number(document.getElementById('fvOpacity')?.value);
                        view2Opacity.value='.55';
                        view2Opacity.dispatchEvent(new Event('input',{bubbles:true}));
                        await new Promise(resolve=>requestAnimationFrame(resolve));
                        const view2Visual=(api.getViewStates()||[]).find(v=>v.id==='view2')?.visual;
                        const independentVisualApplied=Math.abs(Number(view2Visual?.opacity)-.55)<1e-9&&(!Number.isFinite(primaryOpacity)||Math.abs(primaryOpacity-.55)>1e-9);

                        const legend=document.getElementById('fcLegend');
                        const legendStyle=legend?getComputedStyle(legend):null;
                        const legendRect=legend?.getBoundingClientRect();
                        const legendText=legend?.innerText?.trim()||'';
                        const legendVisible=!!legend&&
                          !legend.classList.contains('hidden')&&
                          legendStyle?.display!=='none'&&legendStyle?.visibility!=='hidden'&&
                          Number(legendRect?.width)>0&&Number(legendRect?.height)>0&&
                          legendText.length>0;

                        window.FoamLensFieldProbe?.fpSetEnabled?.(true);
                        if(!canvas)throw new Error('View 2 canvas is unavailable for Probe smoke.');
                        const attempts=[[.50,.50],[.45,.50],[.55,.50],[.50,.45],[.50,.55],[.40,.40],[.60,.40],[.40,.60],[.60,.60],[.35,.50],[.65,.50]];
                        let probeDescriptor=null;
                        for(const [fx,fy] of attempts){
                          const rect=canvas.getBoundingClientRect();
                          const x=rect.left+rect.width*fx,y=rect.top+rect.height*fy;
                          canvas.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:x,clientY:y,button:0}));
                          await new Promise(resolve=>requestAnimationFrame(resolve));
                          probeDescriptor=(api.getProbeDescriptors()||[]).find(p=>p.id==='view2')||null;
                          if(probeDescriptor)break;
                        }
                        await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));

                        const marker=document.getElementById('fcProbeMarker');
                        const markerStyle=marker?getComputedStyle(marker):null;
                        const markerRect=marker?.getBoundingClientRect();
                        const markerVisible=!!marker&&
                          !marker.classList.contains('hidden')&&
                          markerStyle?.display!=='none'&&markerStyle?.visibility!=='hidden'&&
                          Number(markerRect?.width)>0&&Number(markerRect?.height)>0;
                        const selectedStats=document.getElementById('fcStatsGrid')?.innerText?.trim()||'';

                        const primaryCaseBeforeSwap=String(document.getElementById('fvCase')?.value||'');
                        const comparisonCaseBeforeSwap=String(document.getElementById('fcCase')?.value||'');
                        const firstSwap=await api.swapPrimaryCompare();
                        const swapApplied=firstSwap===true&&
                          String(document.getElementById('fvCase')?.value||'')===comparisonCaseBeforeSwap&&
                          String(document.getElementById('fcCase')?.value||'')===primaryCaseBeforeSwap;
                        const secondSwap=await api.swapPrimaryCompare();
                        const swapRestored=secondSwap===true&&
                          String(document.getElementById('fvCase')?.value||'')===primaryCaseBeforeSwap&&
                          String(document.getElementById('fcCase')?.value||'')===comparisonCaseBeforeSwap;

                        window.__foamLensSecondaryVisualSmokeResult={
                          ok:true,
                          view2Enabled:!!enabled.checked&&!!view2,
                          casePersisted,
                          copySettingsApplied,
                          swapApplied,
                          swapRestored,
                          expectedCase:expectedCaseName,
                          secondaryCase:view2?.caseName||'',
                          secondaryField:view2?.fieldName||'',
                          secondaryComponent:view2?.component||'',
                          usedDifferentField:!!differentField,
                          multiPanelSourceCount,
                          hiRes3DWidth,
                          hiRes3DHeight,
                          highResRerendered,
                          primaryRestored,
                          multiPanelWidth,
                          multiPanelHeight,
                          multiPanelPixels,
                          independentCameraChanged,
                          primaryCameraUnaffected,
                          independentVisualApplied,
                          linkedCameras:!!linkCameras.checked,
                          syncedVisuals:!!syncVisuals.checked,
                          legendVisible,
                          legendText,
                          probeEnabled:!!window.FoamLensFieldProbe?.isEnabled?.(),
                          probeDescriptorFound:!!probeDescriptor,
                          probeValue:Number(probeDescriptor?.value),
                          markerVisible,
                          markerWidth:Number(markerRect?.width)||0,
                          markerHeight:Number(markerRect?.height)||0,
                          selectedStats
                        };
                      }catch(e){
                        window.__foamLensSecondaryVisualSmokeResult={ok:false,error:String(e?.stack||e)};
                      }
                    })();
                    """);

                string secondaryVisualJson = "null";
                var secondaryVisualDeadline = Stopwatch.StartNew();
                while (secondaryVisualDeadline.Elapsed < TimeSpan.FromSeconds(60))
                {
                    await Task.Delay(120);
                    secondaryVisualJson = await _web.CoreWebView2.ExecuteScriptAsync(
                        "window.__foamLensSecondaryVisualSmokeResult");
                    if (!string.Equals(secondaryVisualJson.Trim(), "null", StringComparison.OrdinalIgnoreCase) &&
                        !string.Equals(secondaryVisualJson.Trim(), "undefined", StringComparison.OrdinalIgnoreCase) &&
                        !string.Equals(secondaryVisualJson.Trim(), "{}", StringComparison.Ordinal))
                        break;
                }
                using (var secondaryVisual = JsonDocument.Parse(secondaryVisualJson))
                {
                    var root = secondaryVisual.RootElement;
                    if (!root.TryGetProperty("ok", out var ok) || !ok.GetBoolean() ||
                        !root.TryGetProperty("view2Enabled", out var view2Enabled) || !view2Enabled.GetBoolean() ||
                        !root.TryGetProperty("casePersisted", out var casePersisted) || !casePersisted.GetBoolean() ||
                        !root.TryGetProperty("secondaryCase", out var secondaryCase) ||
                            string.IsNullOrWhiteSpace(secondaryCase.GetString()) ||
                        !root.TryGetProperty("secondaryField", out var secondaryField) ||
                            string.IsNullOrWhiteSpace(secondaryField.GetString()) ||
                        !root.TryGetProperty("copySettingsApplied", out var copySettingsApplied) || !copySettingsApplied.GetBoolean() ||
                        !root.TryGetProperty("swapApplied", out var swapApplied) || !swapApplied.GetBoolean() ||
                        !root.TryGetProperty("swapRestored", out var swapRestored) || !swapRestored.GetBoolean() ||
                        !root.TryGetProperty("multiPanelSourceCount", out var multiPanelSourceCount) || multiPanelSourceCount.GetInt32() < 2 ||
                        !root.TryGetProperty("hiRes3DWidth", out var hiRes3DWidth) || hiRes3DWidth.GetInt32() != 1800 ||
                        !root.TryGetProperty("hiRes3DHeight", out var hiRes3DHeight) || hiRes3DHeight.GetInt32() != 1200 ||
                        !root.TryGetProperty("highResRerendered", out var highResRerendered) || !highResRerendered.GetBoolean() ||
                        !root.TryGetProperty("primaryRestored", out var primaryRestored) || !primaryRestored.GetBoolean() ||
                        !root.TryGetProperty("multiPanelWidth", out var multiPanelWidth) || multiPanelWidth.GetInt32() != 2400 ||
                        !root.TryGetProperty("multiPanelHeight", out var multiPanelHeight) || multiPanelHeight.GetInt32() != 1600 ||
                        !root.TryGetProperty("multiPanelPixels", out var multiPanelPixels) || multiPanelPixels.GetInt64() != 3_840_000 ||
                        !root.TryGetProperty("independentCameraChanged", out var independentCameraChanged) || !independentCameraChanged.GetBoolean() ||
                        !root.TryGetProperty("primaryCameraUnaffected", out var primaryCameraUnaffected) || !primaryCameraUnaffected.GetBoolean() ||
                        !root.TryGetProperty("independentVisualApplied", out var independentVisualApplied) || !independentVisualApplied.GetBoolean() ||
                        !root.TryGetProperty("legendVisible", out var legendVisible) || !legendVisible.GetBoolean() ||
                        !root.TryGetProperty("legendText", out var legendText) ||
                            string.IsNullOrWhiteSpace(legendText.GetString()) ||
                        !root.TryGetProperty("probeEnabled", out var probeEnabled) || !probeEnabled.GetBoolean() ||
                        !root.TryGetProperty("probeDescriptorFound", out var probeDescriptorFound) ||
                            !probeDescriptorFound.GetBoolean() ||
                        !root.TryGetProperty("markerVisible", out var markerVisible) || !markerVisible.GetBoolean())
                        throw new InvalidOperationException(
                            $"FoamLens View 2 case/legend/Probe runtime smoke failed: {secondaryVisualJson}");
                }
                Log($"FoamLens synchronized View 2 legend/Probe smoke passed: {secondaryVisualJson}");
                await _web.CoreWebView2.ExecuteScriptAsync(
                    "delete window.__foamLensSecondaryVisualSmokeResult;");

                await _web.CoreWebView2.ExecuteScriptAsync(
                    "delete window.__foamLensRealCaseSmokeResult;");
                Log($"FoamLens real OpenFOAM packaged runtime smoke passed: {realCaseJson}");
            }

            // Verify that JavaScript work continues while the native window is minimized.
            await _web.CoreWebView2.ExecuteScriptAsync(
                "window.__foamLensBackgroundTicks=0;window.__foamLensBackgroundTimer=setInterval(()=>window.__foamLensBackgroundTicks++,50);");
            WindowState = FormWindowState.Minimized;
            await Task.Delay(1500);
            var backgroundTicksJson = await _web.CoreWebView2.ExecuteScriptAsync(
                "window.__foamLensBackgroundTicks");
            WindowState = FormWindowState.Normal;
            Activate();
            if (!int.TryParse(backgroundTicksJson.Trim('"'), NumberStyles.Integer,
                    CultureInfo.InvariantCulture, out var backgroundTicks) || backgroundTicks < 5)
                throw new InvalidOperationException(
                    $"FoamLens background execution stalled while minimized: {backgroundTicksJson}");
            await _web.CoreWebView2.ExecuteScriptAsync(
                "clearInterval(window.__foamLensBackgroundTimer);delete window.__foamLensBackgroundTimer;");
            Log($"FoamLens minimized-window background smoke passed: {backgroundTicks} ticks.");

            await Task.Delay(250);
            var screenshotPath = Environment.GetEnvironmentVariable("FOAMLENS_SMOKE_SCREENSHOT");
            if (!string.IsNullOrWhiteSpace(screenshotPath))
            {
                var fullScreenshotPath = Path.GetFullPath(screenshotPath);
                var screenshotDir = Path.GetDirectoryName(fullScreenshotPath);
                if (!string.IsNullOrWhiteSpace(screenshotDir))
                    Directory.CreateDirectory(screenshotDir);
                await using (var screenshot = new FileStream(
                    fullScreenshotPath, FileMode.Create, FileAccess.Write, FileShare.None))
                {
                    await _web.CoreWebView2.CapturePreviewAsync(
                        CoreWebView2CapturePreviewImageFormat.Png, screenshot);
                    await screenshot.FlushAsync();
                }
                var screenshotBytes = new FileInfo(fullScreenshotPath).Length;
                if (screenshotBytes < 10_000)
                    throw new InvalidOperationException(
                        $"FoamLens visual smoke screenshot is unexpectedly small: {screenshotBytes} bytes.");
                Log($"FoamLens visual smoke screenshot: {fullScreenshotPath} ({screenshotBytes} bytes)");
            }

            SmokeTestExitCode = 0;
            Log("FoamLens Windows smoke test passed.");
            BeginInvoke(Close);
        }
        finally
        {
            _web.CoreWebView2.NavigationStarting -= OnSmokeNavigationStarting;
            _web.CoreWebView2.NavigationCompleted -= OnNavigationCompleted;
            _web.CoreWebView2.WebResourceResponseReceived -= OnWebResourceResponseReceived;
        }
    }

    private void MaterializeBundle()
    {
        Directory.CreateDirectory(AppRoot);
        using var stream = Assembly.GetExecutingAssembly()
            .GetManifestResourceStream("FoamLensDesktop.AppBundle.zip")
            ?? throw new InvalidOperationException("Embedded FoamLens AppBundle.zip was not found.");
        ZipFile.ExtractToDirectory(stream, AppRoot, overwriteFiles: true);
        MaterializeBrandAssets();
    }

    private void MaterializeBrandAssets()
    {
        var brandingDir = Path.Combine(AppRoot, "assets", "branding");
        Directory.CreateDirectory(brandingDir);
        var assembly = Assembly.GetExecutingAssembly();
        foreach (var asset in new[]
        {
            (Resource: "FoamLensDesktop.Branding.official-app-icon.svg", File: "official-app-icon.svg"),
            (Resource: "FoamLensDesktop.Branding.official-mark.svg", File: "official-mark.svg"),
            (Resource: "FoamLensDesktop.Branding.official-lockup.svg", File: "official-lockup.svg")
        })
        {
            using var input = assembly.GetManifestResourceStream(asset.Resource)
                ?? throw new InvalidOperationException($"Embedded FoamLens brand asset was not found: {asset.Resource}");
            using var output = File.Create(Path.Combine(brandingDir, asset.File));
            input.CopyTo(output);
        }
    }

    private void ValidateMaterializedFrontend()
    {
        var indexPath = Path.Combine(AppRoot, "index.html");
        if (!File.Exists(indexPath))
            throw new InvalidOperationException($"FoamLens materialized frontend is missing: {indexPath}");

        var info = new FileInfo(indexPath);
        var html = File.ReadAllText(indexPath, Encoding.UTF8);
        if (info.Length < 100_000 ||
            !html.Contains("<body class=\"dark appMode-workspace\">", StringComparison.Ordinal) ||
            !html.Contains("id=\"launchTitle\">FoamLens</h1>", StringComparison.Ordinal) ||
            !html.Contains("const FOAMLENS_NATIVE=", StringComparison.Ordinal) ||
            Regex.IsMatch(html, @"<html[^>]*\sdata-desktop-version(?:\s|=|>)", RegexOptions.IgnoreCase))
            throw new InvalidOperationException(
                $"FoamLens materialized frontend is incomplete: path={indexPath}; bytes={info.Length}; body={html.Contains("<body", StringComparison.OrdinalIgnoreCase)}; launch={html.Contains("id=\"launchTitle\">FoamLens</h1>", StringComparison.Ordinal)}; native={html.Contains("const FOAMLENS_NATIVE=", StringComparison.Ordinal)}");

        foreach (var relativeAsset in new[]
        {
            Path.Combine("assets", "branding", "official-lockup.svg"),
            Path.Combine("assets", "branding", "official-mark.svg"),
            Path.Combine("assets", "branding", "michel-duarte-avatar.jpg"),
            Path.Combine("assets", "branding", "michels-lab", "official-lockup.png")
        })
        {
            var assetPath = Path.Combine(AppRoot, relativeAsset);
            if (!File.Exists(assetPath) || new FileInfo(assetPath).Length <= 0)
                throw new InvalidOperationException(
                    $"FoamLens materialized brand asset is missing or empty: {assetPath}");
        }

        using var sha = SHA256.Create();
        using var stream = File.OpenRead(indexPath);
        var hash = Convert.ToHexString(sha.ComputeHash(stream)).ToLowerInvariant();
        Log($"FoamLens materialized frontend validated: path={indexPath}; bytes={info.Length}; sha256={hash}");
    }

    private void ApplyFrontendExtensions()
    {
        var indexPath = Path.Combine(AppRoot, "index.html");
        var extensionPaths = Directory.GetFiles(AppRoot, "v*-*.js")
            .OrderBy(path => path, StringComparer.OrdinalIgnoreCase)
            .ToArray();
        if (extensionPaths.Length == 0) return;

        var html = File.ReadAllText(indexPath, Encoding.UTF8);
        // Bind the packaged frontend to the assembly version without depending on a historical source-version replacement.
        var desktopVersion = DesktopVersionText;
        html = html.Replace(
            "<html lang=\"en\">",
            $"<html lang=\"en\" data-foamlens-desktop-version=\"{desktopVersion}\">",
            StringComparison.Ordinal);
        const string mainIifeMarker = "const FOAMLENS_NATIVE=";
        const string iifeClose = "})();";
        var mainMarker = html.IndexOf(mainIifeMarker, StringComparison.Ordinal);
        if (mainMarker < 0)
            throw new InvalidOperationException("FoamLens main frontend IIFE marker was not found.");

        // Scope the search to the script element that owns FOAMLENS_NATIVE.
        // That script contains an inner helper IIFE as well as the main FoamLens
        // IIFE, while later script elements contain independent UI such as About.
        // The correct injection point is therefore the LAST IIFE close before
        // this script element ends.
        var scriptClose = html.IndexOf("</script>", mainMarker, StringComparison.OrdinalIgnoreCase);
        if (scriptClose < 0)
            throw new InvalidOperationException("FoamLens main frontend script closing tag was not found.");

        var insertionPoint = html.LastIndexOf(iifeClose, scriptClose, StringComparison.Ordinal);
        if (insertionPoint < mainMarker)
            throw new InvalidOperationException("FoamLens main frontend IIFE closing marker was not found in its script.");

        // Versioned modules are injected inside the main frontend IIFE so they
        // share the live case/series model without exporting private state.
        var extension = string.Join(Environment.NewLine,
            extensionPaths.Select(path => File.ReadAllText(path, Encoding.UTF8)));
        if (_smokeTest)
        {
            extension += Environment.NewLine + """
window.__foamLensSmokeImportNativeRefs=async function(refs,options={}){
  const files=(refs||[]).map(ref=>new FoamLensNativeFile(ref));
  if(!files.length)throw new Error('Smoke OpenFOAM folder contains no files.');
  await runProjectScan(files);
  if(!pendingScanCandidates.length)throw new Error('Smoke OpenFOAM scan detected no cases.');
  openSmartImport(pendingScanCandidates);
  await importSelectedAsCases();
  setOverlayOpen('readyOverlay',false);
  setOverlayOpen('scanOverlay',false);
  try{setAppMode('field')}catch{}
  fvRefreshSelectors(false);
  const caseSel=document.getElementById('fvCase');
  const selectSmokeCase=async name=>{
    if(!name)return {id:Number(fvState.caseId),name:fvCase()?.name||''};
    const target=(cases||[]).find(c=>String(c.name)===String(name));
    if(!target)throw new Error('Requested smoke case is unavailable: '+name);
    caseSel.value=String(target.id);
    await fvHandleCaseChange();
    if(Number(fvState.caseId)!==Number(target.id)||String(fvCase()?.name||'')!==String(target.name))
      throw new Error('Field View case switch did not bind renderer to '+name);
    return{id:Number(target.id),name:String(target.name)};
  };
  const initialCase=await selectSmokeCase(options.initialCase||'');
  const switchedCase=options.switchCase?await selectSmokeCase(options.switchCase):initialCase;
  const regionSel=document.getElementById('fvRegion');
  if(options.region&&regionSel){
    const availableRegions=[...regionSel.options].map(o=>o.value);
    if(!availableRegions.includes(options.region))
      throw new Error('Requested smoke region is unavailable: '+options.region+'; available: '+availableRegions.join(', '));
    regionSel.value=options.region;
    fvRefreshSelectors(true);
  }
  const fieldSel=document.getElementById('fvField');
  if(options.field&&fieldSel){
    const availableFields=[...fieldSel.options].map(o=>o.value);
    if(!availableFields.includes(options.field))
      throw new Error('Requested smoke field is unavailable: '+options.field+'; available: '+availableFields.join(', '));
    fieldSel.value=options.field;
    // Programmatic smoke selection has no DOM onchange event. Keep the loaded
    // Field View state aligned so selector remount preservation does not
    // restore the previous field before fvLoadSelection() consumes the request.
    fvState.fieldName=options.field;
  }
  await fvLoadSelection();
  const requestedTime=Number(options.time);
  if(Number.isFinite(requestedTime)){
    const group=fvCurrentFieldGroup(),times=(group?.times||[]).map(Number).filter(Number.isFinite).sort((a,b)=>a-b);
    if(!times.length)throw new Error('Smoke field exposes no physical times.');
    let bestIndex=0,bestDistance=Infinity;
    for(let i=0;i<times.length;i++){const d=Math.abs(times[i]-requestedTime);if(d<bestDistance){bestDistance=d;bestIndex=i}}
    await fvLoadFrame(bestIndex);
  }
  fvCameraPreset('iso');
  fvRender();
  let plotSurfaceSmoke=null,plotSurfaceError='';
  try{
    const ps=window.FoamLensPlotSurfaces;
    if(!ps)throw new Error('PlotSurfaceController unavailable');
    const dataSurface=ps.surface?.('data'),analysisSurface=ps.surface?.('analysis'),fieldPlotSurface=ps.surface?.('field');
    if(!dataSurface||!analysisSurface||!fieldPlotSurface)throw new Error('Stable Data / Analysis / Field plot surfaces are incomplete');
    const parentsBefore={
      data:dataSurface.parentElement?.id||'',
      analysis:analysisSurface.parentElement?.id||'',
      field:fieldPlotSurface.parentElement?.id||''
    };
    const owner=()=>document.getElementById('canvas')?.closest?.('[data-fl-plot-surface]')?.dataset?.flPlotSurface||'';
    const fieldOwnerBefore=owner();

    setAppMode('data');
    if((cases||[]).some(c=>c?.discoveryModel))setDataView('catalog');else setDataView('timeseries');
    const requestedDataView=String(currentDataView||'');
    const dataActive=ps.active?.()==='data'&&owner()==='data';

    setAppMode('analysis');
    setDataView('timeseries');
    const analysisActive=ps.active?.()==='analysis'&&owner()==='analysis';

    setAppMode('data');
    const dataRestored=ps.active?.()==='data'&&owner()==='data'&&String(currentDataView||'')===requestedDataView;

    setAppMode('field');
    const fieldRestored=ps.active?.()==='field'&&owner()==='field';
    const parentsAfter={
      data:dataSurface.parentElement?.id||'',
      analysis:analysisSurface.parentElement?.id||'',
      field:fieldPlotSurface.parentElement?.id||''
    };
    plotSurfaceSmoke={
      surfaceCount:['data','analysis','field'].filter(k=>!!ps.surface?.(k)).length,
      parentsStable:parentsBefore.data===parentsAfter.data&&parentsBefore.analysis===parentsAfter.analysis&&parentsBefore.field===parentsAfter.field,
      dataParent:parentsAfter.data,
      analysisParent:parentsAfter.analysis,
      fieldParent:parentsAfter.field,
      fieldOwnerBefore,
      dataActive,
      analysisActive,
      dataRestored,
      fieldRestored,
      requestedDataView
    };
  }catch(e){
    plotSurfaceError=String(e?.stack||e);
    try{setAppMode('field')}catch{}
  }
  let sessionSmoke=null,sessionSmokeError='';
  try{
    const ss=window.FoamLensSessionState,ctx=window.FoamLensContextStore,ps=window.FoamLensPlotSurfaces;
    if(!ss||!ctx||!ps)throw new Error('Session persistence APIs are incomplete.');
    ctx.set({caseId:Number(switchedCase.id),region:String(fvState.region||'')},{source:'session-smoke',apply:false});
    window.FoamLensFieldWorkspace?.setInspector?.(true);
    setAppMode('field');
    ss.save();
    const stored=ss.load();
    if(!stored)throw new Error('Session state was not written to localStorage.');
    const storedDataView=String(stored?.plots?.surfaces?.data?.view||'');
    const storedRoot=String(stored?.context?.caseRoot||'');
    const expectedRoot=String(caseById(Number(switchedCase.id))?.rootPath||'');

    window.FoamLensFieldWorkspace?.setInspector?.(false);
    ctx.set({caseId:null,region:''},{source:'session-smoke-mutate',apply:false});
    setAppMode('data');
    setDataView('timeseries');
    setAppMode('analysis');
    setDataView('timeseries');

    const restored=ss.restoreSnapshot(stored,{force:true});
    if(typeof ss.whenRestored==='function')await ss.whenRestored();
    const restoredContext=ctx.get?.()||{};
    const fieldState=window.FoamLensFieldWorkspace?.getState?.()||{};
    sessionSmoke={
      restored:!!restored,
      storedSchema:Number(stored.schema||0),
      storedMode:String(stored.activeMode||''),
      restoredMode:String(activeAppMode||''),
      storedRoot,
      expectedRoot,
      restoredCaseId:Number(restoredContext.caseId),
      expectedCaseId:Number(switchedCase.id),
      storedRegion:String(stored?.context?.region||''),
      restoredRegion:String(restoredContext.region||''),
      storedDataView,
      restoredDataView:String(ps.state?.('data')?.view||''),
      inspectorRestored:fieldState.inspector===true,
      fieldViewRestored:String(fieldState.view||'')===String(stored?.field?.view||''),
      fieldCompanionRestored:String(fieldState.companion||'')===String(stored?.field?.companion||'')
    };
  }catch(e){
    sessionSmokeError=String(e?.stack||e);
    try{setAppMode('field')}catch{}
  }
  // The persistence smoke intentionally opens/restores the Inspector. Reset the
  // workspace before evaluating the final 3D-focus invariant so the smoke
  // harness does not leak its own test state into the product-state assertion.
  try{
    setAppMode('field');
    window.FoamLensFieldWorkspace?.setView?.('3d');
    window.FoamLensFieldWorkspace?.setInspector?.(false);
  }catch{}
  const streamlineSeed400=typeof fvSeedPlane==='function'&&fvState.mesh?fvSeedPlane(fvState.mesh.boundsMin,fvState.mesh.boundsMax,'x',400,.5).length:0;
  const advancedStreamlineControls=['fvSeedMode','fvSeedCount','fvSeedPatch','fvStreamDirection','fvStreamStepPct','fvStreamMaxSteps','fvStreamMaxLengthPct'].every(id=>!!document.getElementById(id));
  const multiViewControlSet=['fcLinkCameras','fcResyncCameras','fcFitAll','fcSyncVisuals','fcView2Palette','fcView2Opacity'].every(id=>!!document.getElementById(id));
  let runtimeProfile=null,runtimeProfileError='';
  try{
    const centers=fvState.mesh?.cellCenters||[],n=Number(fvState.mesh?.cellCount)||0;
    if(n>1&&centers.length>=n*3&&typeof window.FoamLensFieldWorkspace?.set3DProfileLine==='function'){
      const a=[Number(centers[0]),Number(centers[1]),Number(centers[2])],j=3*(n-1),b=[Number(centers[j]),Number(centers[j+1]),Number(centers[j+2])];
      runtimeProfile=window.FoamLensFieldWorkspace.set3DProfileLine(a,b,{select:false});
    }
  }catch(e){runtimeProfileError=String(e?.stack||e)}
  let performanceBenchmark=null,performanceBenchmarkError='';
  try{
    if(typeof window.FoamLensPerformance?.runBenchmark==='function')performanceBenchmark=await window.FoamLensPerformance.runBenchmark({frames:3,rounds:2,settleMs:100});
  }catch(e){performanceBenchmarkError=String(e?.stack||e)}
  const range=fvFiniteRange(fvState.fieldValues);
  const gl=fvState.renderer?.gl||null,performanceStats=window.FoamLensPerformance?.stats?.()||null;
  return{
    performanceBenchmarkSchema:String(performanceBenchmark?.schema||''),
    performanceBenchmarkFinite:!!performanceBenchmark?.finite,
    performanceBenchmarkFrames:Number(performanceBenchmark?.frames||0),
    performanceBenchmarkRounds:Number(performanceBenchmark?.rounds||0),
    performanceBaselineCount:Number(performanceBenchmark?.baseline?.count||0),
    performanceOptimizedCount:Number(performanceBenchmark?.optimized?.count||0),
    performanceBaselineMean:Number(performanceBenchmark?.baseline?.mean),
    performanceOptimizedMean:Number(performanceBenchmark?.optimized?.mean),
    performanceBaselineMedian:Number(performanceBenchmark?.baseline?.median),
    performanceOptimizedMedian:Number(performanceBenchmark?.optimized?.median),
    performanceBaselineP95:Number(performanceBenchmark?.baseline?.p95),
    performanceOptimizedP95:Number(performanceBenchmark?.optimized?.p95),
    performanceSpeedupFactor:Number(performanceBenchmark?.speedupFactor),
    performancePercentChange:Number(performanceBenchmark?.percentChange),
    performanceBenchmarkError,
    plotSurfaceCount:Number(plotSurfaceSmoke?.surfaceCount||0),
    plotSurfaceParentsStable:!!plotSurfaceSmoke?.parentsStable,
    plotSurfaceDataParent:String(plotSurfaceSmoke?.dataParent||''),
    plotSurfaceAnalysisParent:String(plotSurfaceSmoke?.analysisParent||''),
    plotSurfaceFieldParent:String(plotSurfaceSmoke?.fieldParent||''),
    plotSurfaceFieldOwnerBefore:String(plotSurfaceSmoke?.fieldOwnerBefore||''),
    plotSurfaceDataActive:!!plotSurfaceSmoke?.dataActive,
    plotSurfaceAnalysisActive:!!plotSurfaceSmoke?.analysisActive,
    plotSurfaceDataRestored:!!plotSurfaceSmoke?.dataRestored,
    plotSurfaceFieldRestored:!!plotSurfaceSmoke?.fieldRestored,
    plotSurfaceRequestedDataView:String(plotSurfaceSmoke?.requestedDataView||''),
    plotSurfaceError,
    sessionRestored:!!sessionSmoke?.restored,
    sessionStoredSchema:Number(sessionSmoke?.storedSchema||0),
    sessionStoredMode:String(sessionSmoke?.storedMode||''),
    sessionRestoredMode:String(sessionSmoke?.restoredMode||''),
    sessionStoredRoot:String(sessionSmoke?.storedRoot||''),
    sessionExpectedRoot:String(sessionSmoke?.expectedRoot||''),
    sessionRestoredCaseId:Number(sessionSmoke?.restoredCaseId),
    sessionExpectedCaseId:Number(sessionSmoke?.expectedCaseId),
    sessionStoredRegion:String(sessionSmoke?.storedRegion||''),
    sessionRestoredRegion:String(sessionSmoke?.restoredRegion||''),
    sessionStoredDataView:String(sessionSmoke?.storedDataView||''),
    sessionRestoredDataView:String(sessionSmoke?.restoredDataView||''),
    sessionInspectorRestored:!!sessionSmoke?.inspectorRestored,
    sessionFieldViewRestored:!!sessionSmoke?.fieldViewRestored,
    sessionFieldCompanionRestored:!!sessionSmoke?.fieldCompanionRestored,
    sessionSmokeError,
    performanceLoads:Number(performanceStats?.loads||0),
    performanceLastMs:Number(performanceStats?.lastMs||0),
    performanceAvgMs:Number(performanceStats?.avgMs||0),
    performanceCacheEntries:Number(performanceStats?.cache?.entries||0),
    performancePanelMounted:!!document.getElementById('ppPanel'),
    streamlineSeed400,
    advancedStreamlineControls,
    multiViewControlSet,
    profile3DPoints:Number(runtimeProfile?.t?.length||0),
    profile3DFinite:Number(runtimeProfile?.y?.filter?.(Number.isFinite)?.length||0),
    profile3DDerivedKind:String(runtimeProfile?.derivedKind||''),
    profile3DLineLength:Number(runtimeProfile?.t?.at?.(-1)||0),
    profile3DError:runtimeProfileError,
    caseCount:cases.length,
    readyCaseCount:(cases||[]).filter(fvCaseViewAvailable).length,
    initialCaseId:Number(initialCase?.id),
    initialCaseName:String(initialCase?.name||''),
    switchedCaseId:Number(switchedCase?.id),
    switchedCaseName:String(switchedCase?.name||''),
    caseSwitchChanged:Number(initialCase?.id)!==Number(switchedCase?.id),
    caseName:fvCase()?.name||'',
    rendererCaseId:Number(fvState.caseId),
    ready:!!fvCaseViewAvailable(fvCase()),
    region:fvState.region||'',
    field:fvState.fieldName||'',
    storage:fvState.fieldStorage||'',
    time:Number(fvState.time),
    cells:Number(fvState.mesh?.cellCount||0),
    points:Number(fvState.mesh?.pointCount||0),
    values:Number(fvState.fieldValues?.length||0),
    finiteRange:!!range?.valid,
    min:Number(range?.min),
    max:Number(range?.max),
    span:Number(range?.max)-Number(range?.min),
    legendText:document.getElementById('fvLegend')?.innerText||'',
    surfaceVertices:Number(fvState.renderer?.surfaceCount||0),
    webgl:!!gl,
    glError:gl?Number(gl.getError()):-1,
    fieldWorkspaceActive:document.body.classList.contains('appMode-field'),
    fieldWorkspaceTitle:document.getElementById('fwTitle')?.textContent?.trim()||'',
    field3DHostMounted:document.getElementById('fieldViewPanel')?.parentElement?.id==='fw3DHost',
    workspaceView:window.FoamLensFieldWorkspace?.getState?.().view||'',
    companionMode:document.getElementById('fwCompanion')?.value||'',
    companionTitle:document.getElementById('fwPlotTitle')?.textContent?.trim()||'',
    companionChartMounted:!!document.querySelector('#fw2DHost .chartwrap'),
    plotHiddenIn3D:(()=>{const e=document.querySelector('.fwPlotCard');return !!e&&getComputedStyle(e).display==='none'})(),
    inspectorHidden:(()=>{const e=document.getElementById('fwControlsDrawer');return !!e&&e.classList.contains('hidden')})(),
    legacyFieldButtonAbsent:!document.getElementById('modeField'),
    legacyFieldDatasetTabAbsent:!document.getElementById('fieldViewTab'),
    fieldRibbonText:document.querySelector('#flRibbonTab-field span')?.textContent?.trim()||'',
    fieldRibbonVisible:(()=>{const e=document.getElementById('flRibbonTab-field');if(!e)return false;const s=getComputedStyle(e);return s.display!=='none'&&s.visibility!=='hidden'&&e.getBoundingClientRect().width>0&&e.getBoundingClientRect().height>0})(),
    legacyFieldModeHidden:(()=>{const nav=document.getElementById('modeNavBar');return !!nav&&getComputedStyle(nav).display==='none'})(),
    status:document.getElementById('fvStatus')?.textContent||''
  };
};
""";
        }
        html = html.Insert(insertionPoint, Environment.NewLine + extension + Environment.NewLine);
        File.WriteAllText(indexPath, html, new UTF8Encoding(encoderShouldEmitUTF8Identifier: false));
    }


    private static HttpClient CreateUpdateHttpClient()
    {
        var client = new HttpClient { Timeout = TimeSpan.FromMinutes(5) };
        client.DefaultRequestHeaders.UserAgent.ParseAdd("FoamLensDesktop-Updater/1.0");
        client.DefaultRequestHeaders.Accept.ParseAdd("application/vnd.github+json");
        client.DefaultRequestHeaders.Add("X-GitHub-Api-Version", "2022-11-28");
        return client;
    }

    private async Task CheckForUpdatesAsync(bool userInitiated)
    {
        if (Interlocked.Exchange(ref _updateCheckInProgress, 1) != 0)
        {
            if (userInitiated)
                MessageBox.Show(this, "FoamLens is already checking for updates.",
                    "FoamLens updates", MessageBoxButtons.OK, MessageBoxIcon.Information);
            return;
        }

        try
        {
            var release = await GetLatestReleaseAsync();
            var current = Assembly.GetExecutingAssembly().GetName().Version ?? new Version(0, 0);
            if (release.Version.CompareTo(current) <= 0)
            {
                if (userInitiated)
                    MessageBox.Show(this,
                        $"FoamLens is up to date.\n\nInstalled: v{current.Major}.{current.Minor}.{Math.Max(0, current.Build)}",
                        "FoamLens updates", MessageBoxButtons.OK, MessageBoxIcon.Information);
                return;
            }

            if (string.IsNullOrWhiteSpace(release.InstallerUrl) ||
                string.IsNullOrWhiteSpace(release.ChecksumUrl))
            {
                if (userInitiated)
                {
                    var open = MessageBox.Show(this,
                        $"FoamLens {release.Tag} is available, but its verified installer package is incomplete.\n\nOpen the GitHub release page?",
                        "FoamLens update available", MessageBoxButtons.YesNo, MessageBoxIcon.Warning);
                    if (open == DialogResult.Yes) OpenExternal(release.HtmlUrl);
                }
                else
                {
                    Log($"Update {release.Tag} detected without installer/checksum assets.");
                }
                return;
            }

            var currentText = $"v{current.Major}.{current.Minor}.{Math.Max(0, current.Build)}";
            var answer = MessageBox.Show(this,
                $"A newer FoamLens release is available.\n\nInstalled: {currentText}\nAvailable: {release.Tag}\n\nDownload, verify and start the installer now?",
                "FoamLens update available", MessageBoxButtons.YesNo, MessageBoxIcon.Information);
            if (answer != DialogResult.Yes) return;

            UseWaitCursor = true;
            try
            {
                await DownloadVerifyAndLaunchUpdateAsync(release);
            }
            finally
            {
                if (!IsDisposed) UseWaitCursor = false;
            }
        }
        catch (Exception ex)
        {
            Log($"Automatic update check failed: {ex}");
            if (userInitiated)
                MessageBox.Show(this,
                    $"FoamLens could not check for updates.\n\n{ex.Message}",
                    "FoamLens updates", MessageBoxButtons.OK, MessageBoxIcon.Warning);
        }
        finally
        {
            Interlocked.Exchange(ref _updateCheckInProgress, 0);
        }
    }

    private static async Task<UpdateReleaseInfo> GetLatestReleaseAsync()
    {
        using var response = await UpdateHttpClient.GetAsync(
            LatestReleaseApi, HttpCompletionOption.ResponseHeadersRead);
        response.EnsureSuccessStatusCode();
        await using var stream = await response.Content.ReadAsStreamAsync();
        using var doc = await JsonDocument.ParseAsync(stream);
        var root = doc.RootElement;
        var tag = root.TryGetProperty("tag_name", out var tagNode) ? tagNode.GetString() ?? "" : "";
        if (!TryParseReleaseVersion(tag, out var version))
            throw new InvalidOperationException($"GitHub returned an invalid FoamLens release tag: {tag}");

        var htmlUrl = root.TryGetProperty("html_url", out var htmlNode)
            ? htmlNode.GetString() ?? "https://github.com/realmichelduarte/FoamLens/releases"
            : "https://github.com/realmichelduarte/FoamLens/releases";
        var normalized = $"{version.Major}.{version.Minor}.{Math.Max(0, version.Build)}";
        var installerName = $"FoamLens-Setup-v{normalized}.exe";
        var checksumName = installerName + ".sha256";
        string? installerUrl = null, checksumUrl = null;

        if (root.TryGetProperty("assets", out var assets) && assets.ValueKind == JsonValueKind.Array)
        {
            foreach (var asset in assets.EnumerateArray())
            {
                var name = asset.TryGetProperty("name", out var nameNode) ? nameNode.GetString() ?? "" : "";
                var url = asset.TryGetProperty("browser_download_url", out var urlNode) ? urlNode.GetString() : null;
                if (string.Equals(name, installerName, StringComparison.OrdinalIgnoreCase)) installerUrl = url;
                if (string.Equals(name, checksumName, StringComparison.OrdinalIgnoreCase)) checksumUrl = url;
            }
        }

        return new UpdateReleaseInfo(version, tag, htmlUrl, installerName, installerUrl, checksumUrl);
    }

    private static bool TryParseReleaseVersion(string tag, out Version version)
    {
        version = new Version(0, 0);
        if (string.IsNullOrWhiteSpace(tag)) return false;
        var text = tag.Trim();
        if (text.StartsWith('v') || text.StartsWith('V')) text = text[1..];
        var dash = text.IndexOf('-');
        if (dash >= 0) text = text[..dash];
        if (!Version.TryParse(text, out var parsed) || parsed is null) return false;
        version = parsed;
        return true;
    }

    private async Task DownloadVerifyAndLaunchUpdateAsync(UpdateReleaseInfo release)
    {
        var safeTag = Regex.Replace(release.Tag, @"[^A-Za-z0-9._-]", "_");
        var updateDir = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "FoamLens", "Desktop", "Updates", safeTag);
        Directory.CreateDirectory(updateDir);

        var installerPath = Path.Combine(updateDir, release.InstallerName);
        var checksumPath = installerPath + ".sha256";
        await DownloadUpdateFileAsync(release.InstallerUrl!, installerPath);
        await DownloadUpdateFileAsync(release.ChecksumUrl!, checksumPath);

        var checksumText = await File.ReadAllTextAsync(checksumPath, Encoding.ASCII);
        if (!checksumText.Contains(release.InstallerName, StringComparison.OrdinalIgnoreCase))
            throw new InvalidDataException("The update checksum does not identify the downloaded installer.");
        var match = Regex.Match(checksumText, @"\b[a-fA-F0-9]{64}\b");
        if (!match.Success)
            throw new InvalidDataException("The update checksum file does not contain a valid SHA-256 hash.");

        await using var installerStream = File.OpenRead(installerPath);
        var actualHash = Convert.ToHexString(await SHA256.HashDataAsync(installerStream));
        if (!string.Equals(match.Value, actualHash, StringComparison.OrdinalIgnoreCase))
            throw new InvalidDataException("FoamLens update verification failed: installer SHA-256 does not match.");

        Log($"Verified FoamLens update {release.Tag}: {actualHash.ToLowerInvariant()}");
        var process = Process.Start(new ProcessStartInfo(installerPath)
        {
            UseShellExecute = true,
            Arguments = "/SP-"
        });
        if (process is null)
            throw new InvalidOperationException("The verified FoamLens installer could not be started.");

        BeginInvoke(new Action(Close));
    }

    private static async Task DownloadUpdateFileAsync(string url, string path)
    {
        using var response = await UpdateHttpClient.GetAsync(
            url, HttpCompletionOption.ResponseHeadersRead);
        response.EnsureSuccessStatusCode();
        await using var source = await response.Content.ReadAsStreamAsync();
        await using var destination = new FileStream(
            path, FileMode.Create, FileAccess.Write, FileShare.None, 1024 * 128, useAsync: true);
        await source.CopyToAsync(destination);
    }

    private async void OnWebMessageReceived(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
    {
        string requestId = "";
        try
        {
            using var doc = JsonDocument.Parse(e.WebMessageAsJson);
            var root = doc.RootElement;
            var type = root.TryGetProperty("type", out var typeNode) ? typeNode.GetString() ?? "" : "";
            requestId = root.TryGetProperty("requestId", out var idNode) ? idNode.GetString() ?? "" : "";
            switch (type)
            {
                case "pickFolder":
                    await PickAndEnumerateFolderAsync(requestId);
                    break;
                case "readText":
                    await HandleReadTextAsync(root, requestId);
                    break;
                case "readSlice":
                    await HandleReadSliceAsync(root, requestId);
                    break;
                case "parseFoamLogBatch":
                    await HandleFoamLogBatchAsync(root, requestId);
                    break;
                case "parseTemporalFile":
                    await HandleTemporalFileAsync(root, requestId);
                    break;
                case "parseOpenFOAMField":
                    await HandleOpenFoamFieldAsync(root, requestId);
                    break;
                case "parseOpenFOAMMesh":
                    await HandleOpenFoamMeshAsync(root, requestId);
                    break;
                case "cancelOperation":
                    HandleCancelOperation(root, requestId);
                    break;
                case "checkForUpdates":
                    if (StoreDistributionChannel)
                    {
                        MessageBox.Show(this,
                            "This edition is installed and updated through Microsoft Store.",
                            "FoamLens updates", MessageBoxButtons.OK, MessageBoxIcon.Information);
                        break;
                    }
                    await CheckForUpdatesAsync(userInitiated: true);
                    break;
                case "openExternal":
                    HandleOpenExternal(root, requestId);
                    break;
                default:
                    Reply(requestId, false, null, $"Unknown native request: {type}");
                    break;
            }
        }
        catch (Exception ex)
        {
            Log(ex.ToString());
            if (!string.IsNullOrWhiteSpace(requestId)) Reply(requestId, false, null, ex.Message);
        }
    }

    private List<NativeFileRef> BuildSmokeNativeFileRefs(string rootPath)
    {
        var root = Path.GetFullPath(rootPath);
        var rootName = new DirectoryInfo(root).Name;
        _fileTokens.Clear();
        Interlocked.Exchange(ref _tokenSequence, 0);
        var refs = new List<NativeFileRef>();
        foreach (var path in Directory.EnumerateFiles(root, "*", SearchOption.AllDirectories)
                     .OrderBy(path => path, StringComparer.OrdinalIgnoreCase))
        {
            var token = $"f{Interlocked.Increment(ref _tokenSequence):x}";
            _fileTokens[token] = path;
            var info = new FileInfo(path);
            var relative = Path.GetRelativePath(root, path).Replace('\\', '/');
            refs.Add(new NativeFileRef(
                token,
                info.Name,
                $"{rootName}/{relative}",
                info.Exists ? info.Length : 0,
                info.Exists
                    ? new DateTimeOffset(info.LastWriteTimeUtc).ToUnixTimeMilliseconds()
                    : 0));
        }
        return refs;
    }

    private async Task PickAndEnumerateFolderAsync(string requestId)
    {
        using var dialog = new FolderBrowserDialog
        {
            Description = "Choose the folder containing your OpenFOAM cases",
            UseDescriptionForTitle = true,
            ShowNewFolderButton = false
        };
        if (dialog.ShowDialog(this) != DialogResult.OK || string.IsNullOrWhiteSpace(dialog.SelectedPath))
        {
            Post(new { type = "folderCancelled", requestId });
            return;
        }

        var rootPath = Path.GetFullPath(dialog.SelectedPath);
        var rootName = new DirectoryInfo(rootPath).Name;
        _fileTokens.Clear();
        Interlocked.Exchange(ref _tokenSequence, 0);
        Post(new { type = "folderStart", requestId, folderName = rootName });

        var operation = BeginOperation(requestId);
        try
        {
            await Task.Run(() => EnumerateFolder(rootPath, rootName, requestId, operation.Token), operation.Token);
        }
        catch (OperationCanceledException)
        {
            Post(new { type = "folderCancelled", requestId, folderName = rootName });
        }
        catch (Exception ex)
        {
            Log(ex.ToString());
            Post(new { type = "folderError", requestId, error = ex.Message });
        }
        finally
        {
            EndOperation(requestId, operation);
        }
    }

    private void EnumerateFolder(string rootPath, string rootName, string requestId, CancellationToken cancellationToken)
    {
        var stack = new Stack<string>();
        stack.Push(rootPath);
        var chunk = new List<NativeFileRef>(250);
        long files = 0, folders = 0;
        var nextProgress = Stopwatch.StartNew();

        while (stack.Count > 0)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var dir = stack.Pop();
            folders++;
            try
            {
                foreach (var sub in Directory.EnumerateDirectories(dir))
                {
                    cancellationToken.ThrowIfCancellationRequested();
                    stack.Push(sub);
                }
                foreach (var path in Directory.EnumerateFiles(dir))
                {
                    cancellationToken.ThrowIfCancellationRequested();
                    files++;
                    var token = $"f{Interlocked.Increment(ref _tokenSequence):x}";
                    _fileTokens[token] = path;
                    var info = new FileInfo(path);
                    var relative = Path.GetRelativePath(rootPath, path).Replace('\\', '/');
                    chunk.Add(new NativeFileRef(
                        token,
                        info.Name,
                        $"{rootName}/{relative}",
                        info.Exists ? info.Length : 0,
                        info.Exists ? new DateTimeOffset(info.LastWriteTimeUtc).ToUnixTimeMilliseconds() : 0));

                    if (chunk.Count >= 250)
                    {
                        Post(new { type = "folderChunk", requestId, files = chunk.ToArray() });
                        chunk.Clear();
                    }
                    if (files == 1 || files % 100 == 0 || nextProgress.ElapsedMilliseconds >= 120)
                    {
                        nextProgress.Restart();
                        Post(new { type = "folderProgress", requestId, folderName = rootName, files, folders });
                    }
                }
            }
            catch (UnauthorizedAccessException ex) { Log($"Skipped {dir}: {ex.Message}"); }
            catch (IOException ex) { Log($"Skipped {dir}: {ex.Message}"); }
        }

        if (chunk.Count > 0) Post(new { type = "folderChunk", requestId, files = chunk.ToArray() });
        Post(new { type = "folderComplete", requestId, folderName = rootName, files, folders });
    }

    private async Task HandleReadTextAsync(JsonElement root, string requestId)
    {
        var token = RequiredString(root, "token");
        var path = ResolveToken(token);
        var text = await File.ReadAllTextAsync(path, Encoding.UTF8);
        Reply(requestId, true, text, null);
    }

    private async Task HandleReadSliceAsync(JsonElement root, string requestId)
    {
        var token = RequiredString(root, "token");
        var path = ResolveToken(token);
        var start = root.TryGetProperty("start", out var s) && s.TryGetInt64(out var sv) ? Math.Max(0, sv) : 0;
        var length = root.TryGetProperty("length", out var l) && l.TryGetInt32(out var lv) ? Math.Clamp(lv, 0, 4 * 1024 * 1024) : 65536;
        await using var fs = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite,
            bufferSize: 65536, useAsync: true);
        if (start > fs.Length) start = fs.Length;
        fs.Seek(start, SeekOrigin.Begin);
        var remaining = (int)Math.Min(length, fs.Length - start);
        var buffer = new byte[remaining];
        var read = 0;
        while (read < remaining)
        {
            var n = await fs.ReadAsync(buffer.AsMemory(read, remaining - read));
            if (n <= 0) break;
            read += n;
        }
        Reply(requestId, true, Encoding.UTF8.GetString(buffer, 0, read), null);
    }

    private async Task HandleTemporalFileAsync(JsonElement root, string requestId)
    {
        var token = RequiredString(root, "token");
        var path = ResolveToken(token);
        var operation = BeginOperation(requestId);
        var completedBytes = 0L;
        var totalBytes = new FileInfo(path).Length;
        Post(new { type = "operationStart", requestId, operation = "temporalFile", completedBytes, totalBytes });

        try
        {
            var result = await ParseTemporalFileAsync(path, requestId, operation.Token);
            completedBytes = totalBytes;
            Reply(requestId, true, result, null);
            Post(new { type = "operationComplete", requestId, operation = "temporalFile", completedBytes, totalBytes });
        }
        catch (OperationCanceledException)
        {
            Reply(requestId, false, null, "Operation cancelled.");
            Post(new { type = "operationCancelled", requestId, operation = "temporalFile", completedBytes, totalBytes });
        }
        finally
        {
            EndOperation(requestId, operation);
        }
    }

    private async Task<TemporalParseResult> ParseTemporalFileAsync(string path, string requestId, CancellationToken ct)
    {
        const int headLimit = 128 * 1024;
        var columns = new List<(List<double> T, List<double> Y)>();
        var probes = new Dictionary<int, string>();
        var head = new StringBuilder(Math.Min(headLimit, 16 * 1024));
        var totalBytes = new FileInfo(path).Length;
        var nextProgress = Stopwatch.StartNew();

        await using var stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite,
            bufferSize: 65536, useAsync: true);
        using var reader = new StreamReader(stream, Encoding.UTF8, detectEncodingFromByteOrderMarks: true, bufferSize: 65536);

        while (!reader.EndOfStream)
        {
            ct.ThrowIfCancellationRequested();
            var raw = await reader.ReadLineAsync(ct) ?? "";
            if (head.Length < headLimit)
            {
                var take = Math.Min(raw.Length + 1, headLimit - head.Length);
                if (take > 0)
                {
                    var fragment = raw + Environment.NewLine;
                    head.Append(fragment.AsSpan(0, Math.Min(take, fragment.Length)));
                }
            }

            var line = raw.Trim();
            if (line.Length == 0) continue;
            if (line.StartsWith('#'))
            {
                var probe = ParseProbeHeader(line);
                if (probe is not null) probes[probe.Value.Index] = probe.Value.Location;
            }
            else
            {
                var tokens = SplitTemporalTokens(line);
                if (tokens.Count >= 2 &&
                    double.TryParse(tokens[0], NumberStyles.Float, CultureInfo.InvariantCulture, out var time))
                {
                    for (var j = 1; j < tokens.Count; j++)
                    {
                        if (!TryParseTemporalValue(tokens[j], out var value)) continue;
                        while (columns.Count < j) columns.Add((new List<double>(), new List<double>()));
                        columns[j - 1].T.Add(time);
                        columns[j - 1].Y.Add(value);
                    }
                }
            }

            if (nextProgress.ElapsedMilliseconds >= 120)
            {
                nextProgress.Restart();
                var completedBytes = Math.Min(stream.Position, totalBytes);
                Post(new { type = "operationProgress", requestId, operation = "temporalFile", completedBytes, totalBytes });
            }
        }

        ct.ThrowIfCancellationRequested();
        var resultColumns = columns
            .Select(x => new TemporalColumn(x.T.ToArray(), x.Y.ToArray()))
            .ToArray();
        return new TemporalParseResult(resultColumns, probes, head.ToString(), totalBytes);
    }

    private static (int Index, string Location)? ParseProbeHeader(string line)
    {
        var text = line.AsSpan().Trim();
        if (!text.StartsWith("#", StringComparison.Ordinal)) return null;
        text = text[1..].TrimStart();
        if (!text.StartsWith("Probe", StringComparison.OrdinalIgnoreCase)) return null;
        text = text[5..].TrimStart();
        var i = 0;
        while (i < text.Length && char.IsDigit(text[i])) i++;
        if (i == 0 || !int.TryParse(text[..i], NumberStyles.Integer, CultureInfo.InvariantCulture, out var index))
            return null;
        return (index, text[i..].Trim().ToString());
    }

    private static List<string> SplitTemporalTokens(string line)
    {
        var tokens = new List<string>();
        var i = 0;
        while (i < line.Length)
        {
            while (i < line.Length && char.IsWhiteSpace(line[i])) i++;
            if (i >= line.Length) break;
            if (line[i] == '(')
            {
                var start = i++;
                var depth = 1;
                while (i < line.Length && depth > 0)
                {
                    if (line[i] == '(') depth++;
                    else if (line[i] == ')') depth--;
                    i++;
                }
                tokens.Add(line[start..i]);
            }
            else
            {
                var start = i;
                while (i < line.Length && !char.IsWhiteSpace(line[i])) i++;
                tokens.Add(line[start..i]);
            }
        }
        return tokens;
    }

    private static bool TryParseTemporalValue(string token, out double value)
    {
        if (double.TryParse(token, NumberStyles.Float, CultureInfo.InvariantCulture, out value))
            return true;

        var text = token.AsSpan().Trim();
        if (text.Length >= 2 && text[0] == '(' && text[^1] == ')')
        {
            var inner = text[1..^1].ToString();
            var parts = inner.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries);
            var sum = 0.0;
            var count = 0;
            foreach (var part in parts)
            {
                if (!double.TryParse(part, NumberStyles.Float, CultureInfo.InvariantCulture, out var component))
                    continue;
                sum += component * component;
                count++;
            }
            if (count > 0)
            {
                value = Math.Sqrt(sum);
                return true;
            }
        }

        value = double.NaN;
        return false;
    }

    private const string FoamMeshNumberPattern = @"[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?";

    private static void RunBinaryMeshParserSelfTest()
    {
        static byte[] Header(string className, string objectName)
        {
            var text =
                "FoamFile\n{\n" +
                "    version 2.0;\n" +
                "    format binary;\n" +
                "    class " + className + ";\n" +
                "    arch \"LSB;label=32;scalar=64\";\n" +
                "    object " + objectName + ";\n" +
                "}\n";
            return Encoding.ASCII.GetBytes(text);
        }

        static void WriteLabelList(MemoryStream ms, IReadOnlyList<int> values)
        {
            var prefix = Encoding.ASCII.GetBytes("\n" + values.Count.ToString(CultureInfo.InvariantCulture) + "\n");
            ms.Write(prefix);
            Span<byte> raw = stackalloc byte[4];
            foreach (var value in values)
            {
                BinaryPrimitives.WriteInt32LittleEndian(raw, value);
                ms.Write(raw);
            }
        }

        static byte[] LabelsFile(string className, string objectName, IReadOnlyList<int> values)
        {
            using var ms = new MemoryStream();
            ms.Write(Header(className, objectName));
            WriteLabelList(ms, values);
            return ms.ToArray();
        }

        static byte[] PointsFile(IReadOnlyList<double> values)
        {
            using var ms = new MemoryStream();
            ms.Write(Header("vectorField", "points"));
            var prefix = Encoding.ASCII.GetBytes("\n" + (values.Count / 3).ToString(CultureInfo.InvariantCulture) + "\n");
            ms.Write(prefix);
            Span<byte> raw = stackalloc byte[8];
            foreach (var value in values)
            {
                BinaryPrimitives.WriteInt64LittleEndian(raw, BitConverter.DoubleToInt64Bits(value));
                ms.Write(raw);
            }
            return ms.ToArray();
        }

        static byte[] FacesFile(IReadOnlyList<int> offsets, IReadOnlyList<int> elements)
        {
            using var ms = new MemoryStream();
            ms.Write(Header("faceCompactList", "faces"));
            WriteLabelList(ms, offsets);
            WriteLabelList(ms, elements);
            return ms.ToArray();
        }

        var points = PointsFile(new double[]
        {
            0,0,0, 1,0,0, 1,1,0, 0,1,0,
            0,0,1, 1,0,1, 1,1,1, 0,1,1
        });
        var faceOffsets = new[] { 0,4,8,12,16,20,24 };
        var facePoints = new[]
        {
            0,3,2,1, 4,5,6,7, 0,1,5,4,
            1,2,6,5, 2,3,7,6, 3,0,4,7
        };
        var faces = FacesFile(faceOffsets, facePoints);
        var owner = LabelsFile("labelList", "owner", new[] { 0,0,0,0,0,0 });
        var neighbour = LabelsFile("labelList", "neighbour", Array.Empty<int>());
        var totalBytes = (long)points.Length + faces.Length + owner.Length + neighbour.Length;

        var result = ParseOpenFoamMeshBytes(
            points, faces, owner, neighbour, null, totalBytes, CancellationToken.None);
        if (!result.Supported)
            throw new InvalidOperationException("Binary polyMesh self-test failed: " + result.Reason);
        if (result.PointCount != 8 || result.FaceCount != 6 || result.CellCount != 1)
            throw new InvalidOperationException(
                $"Binary polyMesh self-test topology mismatch: points={result.PointCount}, faces={result.FaceCount}, cells={result.CellCount}");
        if (result.CellCenters.Length != 3 ||
            Math.Abs(result.CellCenters[0] - 0.5) > 1e-12 ||
            Math.Abs(result.CellCenters[1] - 0.5) > 1e-12 ||
            Math.Abs(result.CellCenters[2] - 0.5) > 1e-12)
            throw new InvalidOperationException(
                "Binary polyMesh self-test centroid mismatch: " +
                string.Join(",", result.CellCenters.Select(v => v.ToString("G17", CultureInfo.InvariantCulture))));
        if (!result.Format.StartsWith("binary", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Binary polyMesh self-test did not report binary format.");
    }

    private async Task HandleOpenFoamMeshAsync(JsonElement root, string requestId)
    {
        var pointsPath = ResolveToken(RequiredString(root, "pointsToken"));
        var facesPath = ResolveToken(RequiredString(root, "facesToken"));
        var ownerPath = ResolveToken(RequiredString(root, "ownerToken"));
        var neighbourPath = ResolveToken(RequiredString(root, "neighbourToken"));
        string? boundaryPath = null;
        if (root.TryGetProperty("boundaryToken", out var boundaryNode) &&
            boundaryNode.ValueKind == JsonValueKind.String &&
            !string.IsNullOrWhiteSpace(boundaryNode.GetString()))
            boundaryPath = ResolveToken(boundaryNode.GetString()!);

        var paths = new List<string> { pointsPath, facesPath, ownerPath, neighbourPath };
        if (boundaryPath is not null) paths.Add(boundaryPath);

        var operation = BeginOperation(requestId);
        var totalBytes = paths.Sum(path => new FileInfo(path).Length);
        long completedBytes = 0;
        Post(new { type = "operationStart", requestId, operation = "openFoamMesh", completedBytes, totalBytes });

        try
        {
            var data = new byte[paths.Count][];
            for (var i = 0; i < paths.Count; i++)
            {
                operation.Token.ThrowIfCancellationRequested();
                data[i] = await File.ReadAllBytesAsync(paths[i], operation.Token);
                completedBytes += data[i].LongLength;
                Post(new { type = "operationProgress", requestId, operation = "openFoamMesh", completedBytes, totalBytes });
            }

            var boundaryData = boundaryPath is null ? null : data[^1];
            var result = await Task.Run(
                () => ParseOpenFoamMeshBytes(data[0], data[1], data[2], data[3], boundaryData, totalBytes, operation.Token),
                operation.Token);
            Reply(requestId, true, result, null);
            Post(new { type = "operationComplete", requestId, operation = "openFoamMesh", completedBytes = totalBytes, totalBytes });
        }
        catch (OperationCanceledException)
        {
            Reply(requestId, false, null, "Operation cancelled.");
            Post(new { type = "operationCancelled", requestId, operation = "openFoamMesh", completedBytes, totalBytes });
        }
        finally
        {
            EndOperation(requestId, operation);
        }
    }

    private sealed record FoamMeshFileHeader(
        string Format, string ClassName, bool LittleEndian, int LabelBytes, int ScalarBytes,
        bool ArchitectureAssumed, int HeaderEnd);

    private static OpenFoamMeshParseResult ParseOpenFoamMeshBytes(
        byte[] pointsData, byte[] facesData, byte[] ownerData, byte[] neighbourData, byte[]? boundaryData,
        long sourceBytes, CancellationToken ct)
    {
        var pointHeader = ParseFoamMeshFileHeader(pointsData, out var pointHeaderReason);
        if (pointHeader is null) return OpenFoamMeshParseResult.Unsupported(pointHeaderReason, "", sourceBytes);
        var faceHeader = ParseFoamMeshFileHeader(facesData, out var faceHeaderReason);
        if (faceHeader is null) return OpenFoamMeshParseResult.Unsupported(faceHeaderReason, "", sourceBytes);
        var ownerHeader = ParseFoamMeshFileHeader(ownerData, out var ownerHeaderReason);
        if (ownerHeader is null) return OpenFoamMeshParseResult.Unsupported(ownerHeaderReason, "", sourceBytes);
        var neighbourHeader = ParseFoamMeshFileHeader(neighbourData, out var neighbourHeaderReason);
        if (neighbourHeader is null) return OpenFoamMeshParseResult.Unsupported(neighbourHeaderReason, "", sourceBytes);

        var allAscii = new[] { pointHeader, faceHeader, ownerHeader, neighbourHeader }
            .All(h => string.Equals(h.Format, "ascii", StringComparison.OrdinalIgnoreCase));
        if (allAscii)
        {
            return ParseOpenFoamMeshTexts(
                Encoding.UTF8.GetString(pointsData), Encoding.UTF8.GetString(facesData),
                Encoding.UTF8.GetString(ownerData), Encoding.UTF8.GetString(neighbourData),
                boundaryData, sourceBytes, ct);
        }

        var pointList = ParseFoamMeshPointsBytes(pointsData, pointHeader, ct, out var pointReason);
        if (pointList is null) return OpenFoamMeshParseResult.Unsupported(pointReason, pointHeader.Format, sourceBytes);
        var faces = ParseFoamMeshFacesBytes(facesData, faceHeader, ct, out var faceReason);
        if (faces is null) return OpenFoamMeshParseResult.Unsupported(faceReason, faceHeader.Format, sourceBytes);
        var owners = ParseFoamMeshLabelsBytes(ownerData, ownerHeader, ct, out var ownerReason);
        if (owners is null) return OpenFoamMeshParseResult.Unsupported(ownerReason, ownerHeader.Format, sourceBytes);
        var neighbours = ParseFoamMeshLabelsBytes(neighbourData, neighbourHeader, ct, out var neighbourReason);
        if (neighbours is null) return OpenFoamMeshParseResult.Unsupported(neighbourReason, neighbourHeader.Format, sourceBytes);

        var assumed = new[] { pointHeader, faceHeader, ownerHeader, neighbourHeader }.Any(h => h.ArchitectureAssumed);
        var format = assumed ? "binary-lsb-label32-scalar64-assumed" : "binary";
        var (boundaryPatches, boundaryStatus) = OpenFoamBoundarySupport.ParseMeshBoundary(boundaryData);
        return BuildOpenFoamMeshResult(pointList, faces, owners, neighbours, format, sourceBytes, ct, boundaryPatches, boundaryStatus);
    }

    private static OpenFoamMeshParseResult ParseOpenFoamMeshTexts(
        string pointsText, string facesText, string ownerText, string neighbourText, byte[]? boundaryData,
        long sourceBytes, CancellationToken ct)
    {
        var pointList = ParseFoamMeshPoints(pointsText, ct, out var pointFormat, out var pointReason);
        if (pointList is null)
            return OpenFoamMeshParseResult.Unsupported(pointReason, pointFormat, sourceBytes);

        var faces = ParseFoamMeshFaces(facesText, ct, out var faceFormat, out var faceReason);
        if (faces is null)
            return OpenFoamMeshParseResult.Unsupported(faceReason, faceFormat, sourceBytes);

        var owners = ParseFoamMeshLabels(ownerText, ct, out var ownerFormat, out var ownerReason);
        if (owners is null)
            return OpenFoamMeshParseResult.Unsupported(ownerReason, ownerFormat, sourceBytes);

        var neighbours = ParseFoamMeshLabels(neighbourText, ct, out var neighbourFormat, out var neighbourReason);
        if (neighbours is null)
            return OpenFoamMeshParseResult.Unsupported(neighbourReason, neighbourFormat, sourceBytes);

        var (boundaryPatches, boundaryStatus) = OpenFoamBoundarySupport.ParseMeshBoundary(boundaryData);
        return BuildOpenFoamMeshResult(pointList, faces, owners, neighbours, "ascii", sourceBytes, ct, boundaryPatches, boundaryStatus);
    }

    private static OpenFoamMeshParseResult BuildOpenFoamMeshResult(
        double[] pointList, int[][] faces, int[] owners, int[] neighbours,
        string meshFormat, long sourceBytes, CancellationToken ct,
        FoamBoundaryPatchInfo[]? boundaryPatches = null, string boundaryPatchStatus = "not-provided")
    {
        if (faces.Length != owners.Length)
            return OpenFoamMeshParseResult.Unsupported("owner-face-count-mismatch", meshFormat, sourceBytes);
        if (neighbours.Length > faces.Length)
            return OpenFoamMeshParseResult.Unsupported("neighbour-face-count-mismatch", meshFormat, sourceBytes);

        var maxCell = -1;
        foreach (var v in owners) maxCell = Math.Max(maxCell, v);
        foreach (var v in neighbours) maxCell = Math.Max(maxCell, v);
        var cellCount = maxCell + 1;
        if (cellCount <= 0)
            return OpenFoamMeshParseResult.Unsupported("no-cells", meshFormat, sourceBytes);

        var pointCount = pointList.Length / 3;
        var boundsMin = new[] { double.PositiveInfinity, double.PositiveInfinity, double.PositiveInfinity };
        var boundsMax = new[] { double.NegativeInfinity, double.NegativeInfinity, double.NegativeInfinity };
        for (var i = 0; i < pointCount; i++)
        {
            ct.ThrowIfCancellationRequested();
            for (var axis = 0; axis < 3; axis++)
            {
                var value = pointList[3 * i + axis];
                boundsMin[axis] = Math.Min(boundsMin[axis], value);
                boundsMax[axis] = Math.Max(boundsMax[axis], value);
            }
        }

        for (var faceIndex = 0; faceIndex < faces.Length; faceIndex++)
        {
            foreach (var pointIndex in faces[faceIndex])
            {
                if (pointIndex < 0 || pointIndex >= pointCount)
                    return OpenFoamMeshParseResult.Unsupported("face-point-index-out-of-range", meshFormat, sourceBytes);
            }
        }

        var cellCenters = ComputePolyhedralCellCenters(
            pointList, faces, owners, neighbours, cellCount, ct, out var centroidFallbackCount);
        var cellCenterMethod = centroidFallbackCount == 0
            ? "volume-weighted-polyhedral"
            : $"volume-weighted-polyhedral-with-mean-face-fallback:{centroidFallbackCount}";

        var triangles = new List<int>();
        var triangleOwners = new List<int>();
        var triangleFaces = new List<int>();
        var edgeSet = new HashSet<ulong>();
        var edges = new List<int>();
        var internalFaceCount = neighbours.Length;
        for (var faceIndex = internalFaceCount; faceIndex < faces.Length; faceIndex++)
        {
            if ((faceIndex & 1023) == 0) ct.ThrowIfCancellationRequested();
            var face = faces[faceIndex];
            if (face.Length < 2) continue;
            for (var j = 0; j < face.Length; j++)
            {
                var a = face[j];
                var b = face[(j + 1) % face.Length];
                var lo = Math.Min(a, b);
                var hi = Math.Max(a, b);
                var key = ((ulong)(uint)lo << 32) | (uint)hi;
                if (edgeSet.Add(key))
                {
                    edges.Add(lo);
                    edges.Add(hi);
                }
            }
            if (face.Length < 3) continue;
            for (var j = 1; j < face.Length - 1; j++)
            {
                triangles.Add(face[0]);
                triangles.Add(face[j]);
                triangles.Add(face[j + 1]);
                triangleOwners.Add(owners[faceIndex]);
                triangleFaces.Add(faceIndex);
            }
        }

        var faceOffsets = new int[faces.Length + 1];
        var flattenedFacePoints = new List<int>(faces.Sum(face => face.Length));
        for (var faceIndex = 0; faceIndex < faces.Length; faceIndex++)
        {
            faceOffsets[faceIndex] = flattenedFacePoints.Count;
            flattenedFacePoints.AddRange(faces[faceIndex]);
        }
        faceOffsets[faces.Length] = flattenedFacePoints.Count;

        var patchList = boundaryPatches ?? Array.Empty<FoamBoundaryPatchInfo>();
        if (patchList.Length > 0)
        {
            var used = new bool[Math.Max(0, faces.Length - internalFaceCount)];
            foreach (var patch in patchList)
            {
                if (patch.StartFace < internalFaceCount || patch.NFaces < 0 || patch.StartFace + patch.NFaces > faces.Length)
                {
                    patchList = Array.Empty<FoamBoundaryPatchInfo>();
                    boundaryPatchStatus = "boundary-patch-face-range-invalid";
                    break;
                }
                for (var face = patch.StartFace; face < patch.StartFace + patch.NFaces; face++)
                {
                    var local = face - internalFaceCount;
                    if (local < 0 || local >= used.Length || used[local])
                    {
                        patchList = Array.Empty<FoamBoundaryPatchInfo>();
                        boundaryPatchStatus = "boundary-patch-overlap-invalid";
                        break;
                    }
                    used[local] = true;
                }
                if (patchList.Length == 0) break;
            }
            if (patchList.Length > 0 && used.Any(v => !v))
            {
                patchList = Array.Empty<FoamBoundaryPatchInfo>();
                boundaryPatchStatus = "boundary-patch-coverage-incomplete";
            }
        }

        return new OpenFoamMeshParseResult(
            true, "", meshFormat,
            pointList, triangles.ToArray(), triangleOwners.ToArray(), edges.ToArray(), cellCenters,
            faceOffsets, flattenedFacePoints.ToArray(), owners, neighbours,
            pointCount, faces.Length, internalFaceCount, faces.Length - internalFaceCount, cellCount,
            boundsMin, boundsMax, cellCenterMethod, sourceBytes)
        {
            SurfaceTriangleFaces = triangleFaces.ToArray(),
            BoundaryPatches = patchList,
            BoundaryPatchStatus = boundaryPatchStatus
        };
    }

    private static FoamMeshFileHeader? ParseFoamMeshFileHeader(byte[] data, out string reason)
    {
        reason = "";
        if (data.Length == 0) { reason = "empty-mesh-file"; return null; }
        var prefixLength = Math.Min(data.Length, 256 * 1024);
        var text = Encoding.Latin1.GetString(data, 0, prefixLength);
        var foamIndex = text.IndexOf("FoamFile", StringComparison.OrdinalIgnoreCase);
        if (foamIndex < 0) { reason = "foam-header-not-found"; return null; }
        var open = text.IndexOf('{', foamIndex);
        if (open < 0) { reason = "foam-header-open-not-found"; return null; }
        var close = FindMatchingDelimiter(text, open, '{', '}');
        if (close < 0) { reason = "foam-header-close-not-found"; return null; }
        var header = text.Substring(foamIndex, close - foamIndex + 1);

        static string HeaderEntry(string source, string key)
        {
            var m = Regex.Match(source, @"\b" + Regex.Escape(key) + @"\s+([^;\s]+)\s*;",
                RegexOptions.IgnoreCase);
            return m.Success ? m.Groups[1].Value.Trim().Trim('"') : "";
        }

        var format = HeaderEntry(header, "format");
        if (string.IsNullOrWhiteSpace(format)) format = "ascii";
        var className = HeaderEntry(header, "class");

        var littleEndian = true;
        var labelBytes = 4;
        var scalarBytes = 8;
        var assumed = false;
        if (string.Equals(format, "binary", StringComparison.OrdinalIgnoreCase))
        {
            var quotedArch = Regex.Match(header, @"\barch\s+""([^""]+)""\s*;", RegexOptions.IgnoreCase);
            var plainArch = quotedArch.Success
                ? quotedArch.Groups[1].Value
                : HeaderEntry(header, "arch");

            if (string.IsNullOrWhiteSpace(plainArch))
            {
                // OpenFOAM Foundation files historically omit arch from many
                // headers. The overwhelmingly common ABI is LSB,label=32,
                // scalar=64; expose the assumption in the returned format.
                assumed = true;
            }
            else
            {
                var parts = plainArch.Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
                if (parts.Length > 0)
                {
                    if (parts[0].Equals("LSB", StringComparison.OrdinalIgnoreCase)) littleEndian = true;
                    else if (parts[0].Equals("MSB", StringComparison.OrdinalIgnoreCase)) littleEndian = false;
                    else { reason = "binary-arch-endianness-unsupported"; return null; }
                }
                foreach (var part in parts.Skip(1))
                {
                    var kv = part.Split('=', 2, StringSplitOptions.TrimEntries);
                    if (kv.Length != 2 || !int.TryParse(kv[1], NumberStyles.Integer, CultureInfo.InvariantCulture, out var bits))
                        continue;
                    if (kv[0].Equals("label", StringComparison.OrdinalIgnoreCase))
                    {
                        if (bits is not (32 or 64)) { reason = "binary-label-size-unsupported"; return null; }
                        labelBytes = bits / 8;
                    }
                    else if (kv[0].Equals("scalar", StringComparison.OrdinalIgnoreCase))
                    {
                        if (bits is not (32 or 64)) { reason = "binary-scalar-size-unsupported"; return null; }
                        scalarBytes = bits / 8;
                    }
                }
            }
        }

        return new FoamMeshFileHeader(
            format.ToLowerInvariant(), className, littleEndian, labelBytes, scalarBytes, assumed, close + 1);
    }

    private static void SkipFoamBinaryTrivia(byte[] data, ref int pos)
    {
        while (pos < data.Length)
        {
            var b = data[pos];
            if (b is (byte)' ' or (byte)'\t' or (byte)'\r' or (byte)'\n') { pos++; continue; }
            if (b == (byte)'/' && pos + 1 < data.Length && data[pos + 1] == (byte)'/')
            {
                pos += 2;
                while (pos < data.Length && data[pos] != (byte)'\n') pos++;
                continue;
            }
            if (b == (byte)'/' && pos + 1 < data.Length && data[pos + 1] == (byte)'*')
            {
                pos += 2;
                while (pos + 1 < data.Length && !(data[pos] == (byte)'*' && data[pos + 1] == (byte)'/')) pos++;
                if (pos + 1 < data.Length) pos += 2;
                continue;
            }
            break;
        }
    }

    private static bool TryLocateBinaryList(
        byte[] data, int start, out int count, out int payloadOffset, out string reason)
    {
        count = 0; payloadOffset = 0; reason = "";
        var pos = Math.Clamp(start, 0, data.Length);
        SkipFoamBinaryTrivia(data, ref pos);
        var begin = pos;
        while (pos < data.Length && data[pos] >= (byte)'0' && data[pos] <= (byte)'9') pos++;
        if (pos == begin ||
            !int.TryParse(Encoding.ASCII.GetString(data, begin, pos - begin),
                NumberStyles.Integer, CultureInfo.InvariantCulture, out count) || count < 0)
        {
            reason = "binary-list-count-not-found";
            return false;
        }
        while (pos < data.Length && data[pos] is (byte)' ' or (byte)'\t') pos++;
        if (pos < data.Length && data[pos] == (byte)'\r') pos++;
        if (pos >= data.Length || data[pos] != (byte)'\n')
        {
            reason = "binary-list-line-end-not-found";
            return false;
        }
        payloadOffset = pos + 1;
        return true;
    }

    private static bool TryReadBinaryLabel(
        ReadOnlySpan<byte> bytes, int labelBytes, bool littleEndian, out int value)
    {
        value = 0;
        if (labelBytes == 4)
        {
            value = littleEndian
                ? BinaryPrimitives.ReadInt32LittleEndian(bytes)
                : BinaryPrimitives.ReadInt32BigEndian(bytes);
            return true;
        }
        if (labelBytes == 8)
        {
            var v = littleEndian
                ? BinaryPrimitives.ReadInt64LittleEndian(bytes)
                : BinaryPrimitives.ReadInt64BigEndian(bytes);
            if (v < int.MinValue || v > int.MaxValue) return false;
            value = (int)v;
            return true;
        }
        return false;
    }

    private static bool TryReadBinaryScalar(
        ReadOnlySpan<byte> bytes, int scalarBytes, bool littleEndian, out double value)
    {
        value = double.NaN;
        if (scalarBytes == 4)
        {
            var bits = littleEndian
                ? BinaryPrimitives.ReadInt32LittleEndian(bytes)
                : BinaryPrimitives.ReadInt32BigEndian(bytes);
            value = BitConverter.Int32BitsToSingle(bits);
            return double.IsFinite(value);
        }
        if (scalarBytes == 8)
        {
            var bits = littleEndian
                ? BinaryPrimitives.ReadInt64LittleEndian(bytes)
                : BinaryPrimitives.ReadInt64BigEndian(bytes);
            value = BitConverter.Int64BitsToDouble(bits);
            return double.IsFinite(value);
        }
        return false;
    }

    private static double[]? ParseFoamMeshPointsBytes(
        byte[] data, FoamMeshFileHeader header, CancellationToken ct, out string reason)
    {
        reason = "";
        if (header.Format == "ascii")
            return ParseFoamMeshPoints(Encoding.UTF8.GetString(data), ct, out _, out reason);
        if (header.Format != "binary") { reason = "mesh-format-unsupported"; return null; }

        if (!TryLocateBinaryList(data, header.HeaderEnd, out var count, out var payload, out reason))
            return null;
        var itemBytes = checked(3 * header.ScalarBytes);
        var needed = (long)count * itemBytes;
        if (payload + needed > data.LongLength) { reason = "binary-points-truncated"; return null; }
        var values = new double[count * 3];
        for (var i = 0; i < count; i++)
        {
            if ((i & 2047) == 0) ct.ThrowIfCancellationRequested();
            for (var axis = 0; axis < 3; axis++)
            {
                var at = payload + i * itemBytes + axis * header.ScalarBytes;
                if (!TryReadBinaryScalar(
                    data.AsSpan(at, header.ScalarBytes), header.ScalarBytes, header.LittleEndian,
                    out values[3 * i + axis]))
                {
                    reason = "binary-point-value-invalid";
                    return null;
                }
            }
        }
        return values;
    }

    private static int[]? ParseFoamMeshLabelsBytes(
        byte[] data, FoamMeshFileHeader header, CancellationToken ct, out string reason)
    {
        reason = "";
        if (header.Format == "ascii")
            return ParseFoamMeshLabels(Encoding.UTF8.GetString(data), ct, out _, out reason);
        if (header.Format != "binary") { reason = "mesh-format-unsupported"; return null; }

        if (!TryLocateBinaryList(data, header.HeaderEnd, out var count, out var payload, out reason))
            return null;
        var needed = (long)count * header.LabelBytes;
        if (payload + needed > data.LongLength) { reason = "binary-label-list-truncated"; return null; }
        var values = new int[count];
        for (var i = 0; i < count; i++)
        {
            if ((i & 4095) == 0) ct.ThrowIfCancellationRequested();
            var at = payload + i * header.LabelBytes;
            if (!TryReadBinaryLabel(data.AsSpan(at, header.LabelBytes), header.LabelBytes, header.LittleEndian, out values[i]))
            {
                reason = "binary-label-out-of-range";
                return null;
            }
        }
        return values;
    }

    private static int[][]? ParseFoamMeshFacesBytes(
        byte[] data, FoamMeshFileHeader header, CancellationToken ct, out string reason)
    {
        reason = "";
        if (header.Format == "ascii")
            return ParseFoamMeshFaces(Encoding.UTF8.GetString(data), ct, out _, out reason);
        if (header.Format != "binary") { reason = "mesh-format-unsupported"; return null; }
        if (!header.ClassName.Equals("faceCompactList", StringComparison.OrdinalIgnoreCase))
        {
            reason = "binary-face-class-unsupported:" + (string.IsNullOrWhiteSpace(header.ClassName) ? "unknown" : header.ClassName);
            return null;
        }

        if (!TryLocateBinaryList(data, header.HeaderEnd, out var offsetCount, out var offsetPayload, out reason))
            return null;
        var offsetBytes = (long)offsetCount * header.LabelBytes;
        if (offsetPayload + offsetBytes > data.LongLength) { reason = "binary-face-offsets-truncated"; return null; }
        var offsets = new int[offsetCount];
        for (var i = 0; i < offsetCount; i++)
        {
            if ((i & 4095) == 0) ct.ThrowIfCancellationRequested();
            var at = offsetPayload + i * header.LabelBytes;
            if (!TryReadBinaryLabel(data.AsSpan(at, header.LabelBytes), header.LabelBytes, header.LittleEndian, out offsets[i]))
            {
                reason = "binary-face-offset-out-of-range";
                return null;
            }
        }

        var secondStart = checked((int)(offsetPayload + offsetBytes));
        if (!TryLocateBinaryList(data, secondStart, out var elemCount, out var elemPayload, out reason))
            return null;
        var elemBytes = (long)elemCount * header.LabelBytes;
        if (elemPayload + elemBytes > data.LongLength) { reason = "binary-face-labels-truncated"; return null; }
        var elems = new int[elemCount];
        for (var i = 0; i < elemCount; i++)
        {
            if ((i & 8191) == 0) ct.ThrowIfCancellationRequested();
            var at = elemPayload + i * header.LabelBytes;
            if (!TryReadBinaryLabel(data.AsSpan(at, header.LabelBytes), header.LabelBytes, header.LittleEndian, out elems[i]))
            {
                reason = "binary-face-label-out-of-range";
                return null;
            }
        }

        if (offsets.Length == 0)
        {
            if (elems.Length != 0) { reason = "binary-face-empty-offsets-with-elements"; return null; }
            return Array.Empty<int[]>();
        }
        if (offsets[0] != 0 || offsets[^1] != elems.Length)
        {
            reason = "binary-face-offset-range-mismatch";
            return null;
        }
        var faces = new int[offsets.Length - 1][];
        for (var i = 0; i < faces.Length; i++)
        {
            if (offsets[i] < 0 || offsets[i + 1] < offsets[i] || offsets[i + 1] > elems.Length)
            {
                reason = "binary-face-offset-order-invalid";
                return null;
            }
            var n = offsets[i + 1] - offsets[i];
            faces[i] = new int[n];
            Array.Copy(elems, offsets[i], faces[i], 0, n);
        }
        return faces;
    }

    private static double[] ComputePolyhedralCellCenters(
        double[] points, int[][] faces, int[] owners, int[] neighbours, int cellCount,
        CancellationToken ct, out int fallbackCount)
    {
        var cellFaces = new List<int>[cellCount];
        for (var cell = 0; cell < cellCount; cell++) cellFaces[cell] = new List<int>();
        for (var faceIndex = 0; faceIndex < faces.Length; faceIndex++)
        {
            if ((faceIndex & 2047) == 0) ct.ThrowIfCancellationRequested();
            var owner = owners[faceIndex];
            if (owner >= 0 && owner < cellCount) cellFaces[owner].Add(faceIndex);
            if (faceIndex < neighbours.Length)
            {
                var neighbour = neighbours[faceIndex];
                if (neighbour >= 0 && neighbour < cellCount) cellFaces[neighbour].Add(faceIndex);
            }
        }

        var centers = new double[cellCount * 3];
        fallbackCount = 0;
        for (var cell = 0; cell < cellCount; cell++)
        {
            if ((cell & 1023) == 0) ct.ThrowIfCancellationRequested();
            var refs = cellFaces[cell];
            if (refs.Count == 0) { fallbackCount++; continue; }

            // Stable local origin: arithmetic mean of incident face centres.
            double rx = 0, ry = 0, rz = 0;
            var validFaces = 0;
            foreach (var faceIndex in refs)
            {
                var face = faces[faceIndex];
                if (face.Length == 0) continue;
                double fx = 0, fy = 0, fz = 0;
                foreach (var pointIndex in face)
                {
                    fx += points[3 * pointIndex];
                    fy += points[3 * pointIndex + 1];
                    fz += points[3 * pointIndex + 2];
                }
                rx += fx / face.Length;
                ry += fy / face.Length;
                rz += fz / face.Length;
                validFaces++;
            }
            if (validFaces == 0) { fallbackCount++; continue; }
            rx /= validFaces; ry /= validFaces; rz /= validFaces;

            double volume6 = 0, absVolume6 = 0;
            double wx = 0, wy = 0, wz = 0;
            foreach (var faceIndex in refs)
            {
                var face = faces[faceIndex];
                if (face.Length < 3) continue;

                // Fan around the face centre. For neighbour cells the stored
                // OpenFOAM face orientation is inward, so reverse each edge.
                double fx = 0, fy = 0, fz = 0;
                foreach (var pointIndex in face)
                {
                    fx += points[3 * pointIndex];
                    fy += points[3 * pointIndex + 1];
                    fz += points[3 * pointIndex + 2];
                }
                fx /= face.Length; fy /= face.Length; fz /= face.Length;
                var ownerSide = owners[faceIndex] == cell;

                for (var j = 0; j < face.Length; j++)
                {
                    var ia = face[j];
                    var ib = face[(j + 1) % face.Length];
                    if (!ownerSide) (ia, ib) = (ib, ia);

                    var ax = fx - rx; var ay = fy - ry; var az = fz - rz;
                    var bx = points[3 * ia] - rx; var by = points[3 * ia + 1] - ry; var bz = points[3 * ia + 2] - rz;
                    var cx = points[3 * ib] - rx; var cy = points[3 * ib + 1] - ry; var cz = points[3 * ib + 2] - rz;
                    var crossX = by * cz - bz * cy;
                    var crossY = bz * cx - bx * cz;
                    var crossZ = bx * cy - by * cx;
                    var v6 = ax * crossX + ay * crossY + az * crossZ;
                    if (!double.IsFinite(v6) || Math.Abs(v6) <= double.Epsilon) continue;

                    var tcx = (rx + fx + points[3 * ia] + points[3 * ib]) * 0.25;
                    var tcy = (ry + fy + points[3 * ia + 1] + points[3 * ib + 1]) * 0.25;
                    var tcz = (rz + fz + points[3 * ia + 2] + points[3 * ib + 2]) * 0.25;
                    volume6 += v6;
                    absVolume6 += Math.Abs(v6);
                    wx += v6 * tcx;
                    wy += v6 * tcy;
                    wz += v6 * tcz;
                }
            }

            var usable = double.IsFinite(volume6) && double.IsFinite(absVolume6) &&
                         absVolume6 > 0 && Math.Abs(volume6) > absVolume6 * 1e-12;
            if (usable)
            {
                centers[3 * cell] = wx / volume6;
                centers[3 * cell + 1] = wy / volume6;
                centers[3 * cell + 2] = wz / volume6;
            }
            else
            {
                centers[3 * cell] = rx;
                centers[3 * cell + 1] = ry;
                centers[3 * cell + 2] = rz;
                fallbackCount++;
            }
        }
        return centers;
    }

    private static double[]? ParseFoamMeshPoints(
        string text, CancellationToken ct, out string format, out string reason)
    {
        if (!TryExtractFoamMeshList(text, out var declared, out var body, out format, out reason))
            return null;
        if (!string.Equals(format, "ascii", StringComparison.OrdinalIgnoreCase))
        {
            reason = "binary-format";
            return null;
        }

        var pattern = @"\(\s*(" + FoamMeshNumberPattern + @")\s+(" + FoamMeshNumberPattern +
                      @")\s+(" + FoamMeshNumberPattern + @")\s*\)";
        var matches = Regex.Matches(body, pattern);
        if (matches.Count != declared)
        {
            reason = "point-count-mismatch";
            return null;
        }

        var values = new double[declared * 3];
        for (var i = 0; i < matches.Count; i++)
        {
            if ((i & 2047) == 0) ct.ThrowIfCancellationRequested();
            for (var axis = 0; axis < 3; axis++)
            {
                if (!double.TryParse(matches[i].Groups[axis + 1].Value, NumberStyles.Float,
                    CultureInfo.InvariantCulture, out values[3 * i + axis]))
                {
                    reason = "invalid-point-value";
                    return null;
                }
            }
        }
        reason = "";
        return values;
    }

    private static int[][]? ParseFoamMeshFaces(
        string text, CancellationToken ct, out string format, out string reason)
    {
        if (!TryExtractFoamMeshList(text, out var declared, out var body, out format, out reason))
            return null;
        if (!string.Equals(format, "ascii", StringComparison.OrdinalIgnoreCase))
        {
            reason = "binary-format";
            return null;
        }

        var matches = Regex.Matches(body, @"(?m)(\d+)\s*\(([^()]*)\)");
        if (matches.Count != declared)
        {
            reason = "face-count-mismatch";
            return null;
        }

        var faces = new int[declared][];
        for (var i = 0; i < matches.Count; i++)
        {
            if ((i & 1023) == 0) ct.ThrowIfCancellationRequested();
            if (!int.TryParse(matches[i].Groups[1].Value, NumberStyles.Integer,
                CultureInfo.InvariantCulture, out var expected))
            {
                reason = "invalid-face-size";
                return null;
            }
            var labels = Regex.Matches(matches[i].Groups[2].Value, @"[-+]?\d+")
                .Select(match => int.Parse(match.Value, CultureInfo.InvariantCulture)).ToArray();
            if (labels.Length != expected)
            {
                reason = "face-size-mismatch";
                return null;
            }
            faces[i] = labels;
        }
        reason = "";
        return faces;
    }

    private static int[]? ParseFoamMeshLabels(
        string text, CancellationToken ct, out string format, out string reason)
    {
        if (!TryExtractFoamMeshList(text, out var declared, out var body, out format, out reason))
            return null;
        if (!string.Equals(format, "ascii", StringComparison.OrdinalIgnoreCase))
        {
            reason = "binary-format";
            return null;
        }

        var matches = Regex.Matches(body, @"[-+]?\d+");
        if (matches.Count != declared)
        {
            reason = "label-count-mismatch";
            return null;
        }
        var labels = new int[declared];
        for (var i = 0; i < matches.Count; i++)
        {
            if ((i & 4095) == 0) ct.ThrowIfCancellationRequested();
            if (!int.TryParse(matches[i].Value, NumberStyles.Integer, CultureInfo.InvariantCulture, out labels[i]))
            {
                reason = "invalid-label";
                return null;
            }
        }
        reason = "";
        return labels;
    }

    private static bool TryExtractFoamMeshList(
        string text, out int declaredCount, out string body, out string format, out string reason)
    {
        declaredCount = 0;
        body = "";
        reason = "";
        var clean = Regex.Replace(StringOrEmpty(text), @"/\*[\s\S]*?\*/", "");
        clean = Regex.Replace(clean, @"//.*$", "", RegexOptions.Multiline);
        format = FoamHeaderValue(clean, "format") ?? "ascii";
        if (!string.Equals(format, "ascii", StringComparison.OrdinalIgnoreCase))
        {
            reason = "binary-format";
            return false;
        }

        var searchStart = 0;
        var foamIndex = clean.IndexOf("FoamFile", StringComparison.OrdinalIgnoreCase);
        if (foamIndex >= 0)
        {
            var brace = clean.IndexOf('{', foamIndex);
            if (brace >= 0)
            {
                var closeBrace = FindMatchingDelimiter(clean, brace, '{', '}');
                if (closeBrace >= 0) searchStart = closeBrace + 1;
            }
        }

        var tail = clean[searchStart..];
        var countMatch = Regex.Match(tail, @"(?m)(?:^|\s)(\d+)\s*\(");
        if (!countMatch.Success ||
            !int.TryParse(countMatch.Groups[1].Value, NumberStyles.Integer,
                CultureInfo.InvariantCulture, out declaredCount))
        {
            reason = "list-header-not-found";
            return false;
        }

        var openRelative = countMatch.Index + countMatch.Value.LastIndexOf('(');
        var open = searchStart + openRelative;
        var close = FindMatchingDelimiter(clean, open, '(', ')');
        if (close < 0)
        {
            reason = "list-close-not-found";
            return false;
        }
        body = clean[(open + 1)..close];
        return true;
    }

    private static int FindMatchingDelimiter(string text, int openIndex, char open, char close)
    {
        var depth = 0;
        var quote = '\0';
        for (var i = openIndex; i < text.Length; i++)
        {
            var ch = text[i];
            if (quote != '\0')
            {
                if (ch == quote && (i == 0 || text[i - 1] != '\\')) quote = '\0';
                continue;
            }
            if (ch is '"' or '\'') { quote = ch; continue; }
            if (ch == open) depth++;
            else if (ch == close && --depth == 0) return i;
        }
        return -1;
    }

    private static string StringOrEmpty(string? value) => value ?? "";

    private async Task HandleOpenFoamFieldAsync(JsonElement root, string requestId)
    {
        var token = RequiredString(root, "token");
        var path = ResolveToken(token);
        var operation = BeginOperation(requestId);
        var totalBytes = new FileInfo(path).Length;
        Post(new { type = "operationStart", requestId, operation = "openFoamField", completedBytes = 0L, totalBytes });

        try
        {
            // Field parsing can be CPU-heavy even when file reads themselves are asynchronous.
            // Keep parsing and boundary decoding off the WinForms/WebView UI thread so camera,
            // opacity and other visual controls remain responsive while a new timestep loads.
            var result = await Task.Run(async () =>
            {
                var parsed = await ParseOpenFoamFieldAsync(path, requestId, operation.Token).ConfigureAwait(false);
                if (parsed.Supported && string.Equals(parsed.Format, "ascii", StringComparison.OrdinalIgnoreCase))
                {
                    var boundaryPatches = await OpenFoamBoundarySupport.ReadFieldBoundaryPatchesAsync(
                        path, parsed.Kind, operation.Token).ConfigureAwait(false);
                    parsed = parsed with { BoundaryPatches = boundaryPatches };
                }
                return parsed;
            }, operation.Token);
            Reply(requestId, true, result, null);
            Post(new { type = "operationComplete", requestId, operation = "openFoamField", completedBytes = result.BytesRead, totalBytes });
        }
        catch (OperationCanceledException)
        {
            Reply(requestId, false, null, "Operation cancelled.");
            Post(new { type = "operationCancelled", requestId, operation = "openFoamField", completedBytes = 0L, totalBytes });
        }
        finally
        {
            EndOperation(requestId, operation);
        }
    }

    private async Task<OpenFoamFieldParseResult> ParseOpenFoamFieldAsync(string path, string requestId, CancellationToken ct)
    {
        const int prefixLimit = 512 * 1024;
        var totalBytes = new FileInfo(path).Length;
        var prefix = new StringBuilder(Math.Min(prefixLimit, 32 * 1024));
        var scalarValues = new List<double>();
        var componentValues = new List<double[]>();
        var nextProgress = Stopwatch.StartNew();
        string format = "ascii", fieldClass = "", objectName = Path.GetFileName(path), dimensions = "", kind = "unknown";
        int? declaredCount = null;
        var valuesStarted = false;
        var closed = false;

        await using var stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite,
            bufferSize: 65536, useAsync: true);
        using var reader = new StreamReader(stream, Encoding.UTF8, detectEncodingFromByteOrderMarks: true, bufferSize: 65536);

        while (!reader.EndOfStream)
        {
            ct.ThrowIfCancellationRequested();
            var raw = await reader.ReadLineAsync(ct) ?? "";
            var line = raw.Trim();

            if (!valuesStarted)
            {
                if (prefix.Length < prefixLimit)
                {
                    var fragment = raw + Environment.NewLine;
                    var take = Math.Min(fragment.Length, prefixLimit - prefix.Length);
                    if (take > 0) prefix.Append(fragment.AsSpan(0, take));
                }

                var text = prefix.ToString();
                format = FoamHeaderValue(text, "format") ?? format;
                fieldClass = FoamHeaderValue(text, "class") ?? fieldClass;
                objectName = FoamHeaderValue(text, "object") ?? objectName;
                dimensions = Regex.Match(text, @"\bdimensions\s+(\[[^\]]+\])\s*;", RegexOptions.IgnoreCase).Groups[1].Value is { Length: > 0 } dims ? dims : dimensions;
                kind = fieldClass.Contains("sphericalTensorField", StringComparison.OrdinalIgnoreCase) ? "sphericalTensor"
                    : fieldClass.Contains("symmTensorField", StringComparison.OrdinalIgnoreCase) ? "symmTensor"
                    : fieldClass.Contains("tensorField", StringComparison.OrdinalIgnoreCase) ? "tensor"
                    : fieldClass.Contains("vectorField", StringComparison.OrdinalIgnoreCase) ? "vector"
                    : fieldClass.Contains("scalarField", StringComparison.OrdinalIgnoreCase) ? "scalar" : "unknown";

                if (format.Equals("binary", StringComparison.OrdinalIgnoreCase))
                    return OpenFoamFieldParseResult.Unsupported("binary-format", format, fieldClass, objectName, dimensions, kind, totalBytes, stream.Position);

                if (kind == "unknown" && !string.IsNullOrWhiteSpace(fieldClass) &&
                    Regex.IsMatch(text, @"\binternalField\b", RegexOptions.IgnoreCase))
                    return OpenFoamFieldParseResult.Unsupported("unsupported-field-class", format, fieldClass, objectName, dimensions, kind, totalBytes, stream.Position);

                var uniform = Regex.Match(text, @"\binternalField\s+uniform\s+([^;]+)\s*;", RegexOptions.IgnoreCase | RegexOptions.Singleline);
                if (uniform.Success)
                {
                    var valueText = uniform.Groups[1].Value.Trim();
                    if (kind == "scalar" && double.TryParse(valueText, NumberStyles.Float, CultureInfo.InvariantCulture, out var scalar))
                        return OpenFoamFieldParseResult.FromUniformScalar(format, fieldClass, objectName, dimensions, scalar, totalBytes, stream.Position);
                    var componentCount = OpenFoamFieldComponentCount(kind);
                    if (kind != "scalar" && componentCount > 0 && TryParseComponentTuple(valueText, componentCount, out var components))
                        return OpenFoamFieldParseResult.FromUniformComponents(format, fieldClass, objectName, dimensions, kind, components, totalBytes, stream.Position);
                    var reason = kind == "vector" ? "invalid-uniform-vector"
                        : kind == "scalar" ? "invalid-uniform-value" : "invalid-uniform-components";
                    return OpenFoamFieldParseResult.Unsupported(reason, format, fieldClass, objectName, dimensions, kind, totalBytes, stream.Position);
                }

                var nonuniform = Regex.Match(text,
                    @"\binternalField\s+nonuniform\s+(?:List<\s*(?:scalar|vector|tensor|symmTensor|sphericalTensor)\s*>|[^\s]+)\s+(\d+)\s*\(",
                    RegexOptions.IgnoreCase | RegexOptions.Singleline);
                if (nonuniform.Success)
                {
                    declaredCount = int.TryParse(nonuniform.Groups[1].Value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var count) ? count : null;
                    valuesStarted = true;
                    var remainder = text[(nonuniform.Index + nonuniform.Length)..];
                    foreach (var valueLine in remainder.Split(new[] { "\r\n", "\n" }, StringSplitOptions.None))
                    {
                        if (ParseOpenFoamFieldValueLine(valueLine, kind, declaredCount, scalarValues, componentValues, out closed))
                            break;
                    }
                    prefix.Clear();
                }
                else if (prefix.Length >= prefixLimit)
                {
                    return OpenFoamFieldParseResult.Unsupported("internalField-header-too-large", format, fieldClass, objectName, dimensions, kind, totalBytes, stream.Position);
                }
            }
            else
            {
                ParseOpenFoamFieldValueLine(line, kind, declaredCount, scalarValues, componentValues, out closed);
            }

            var parsedCount = kind == "scalar" ? scalarValues.Count : componentValues.Count;
            if (valuesStarted && ((declaredCount.HasValue && parsedCount >= declaredCount.Value) || closed))
                break;

            if (nextProgress.ElapsedMilliseconds >= 120)
            {
                nextProgress.Restart();
                Post(new { type = "operationProgress", requestId, operation = "openFoamField", completedBytes = Math.Min(stream.Position, totalBytes), totalBytes });
            }
        }

        ct.ThrowIfCancellationRequested();
        var bytesRead = Math.Min(stream.Position, totalBytes);
        var countParsed = kind == "scalar" ? scalarValues.Count : componentValues.Count;
        if (countParsed == 0)
        {
            var reason = kind == "scalar" ? "no-scalar-values"
                : kind == "vector" ? "no-vector-values" : "no-component-values";
            return OpenFoamFieldParseResult.Unsupported(reason, format, fieldClass, objectName, dimensions, kind, totalBytes, bytesRead);
        }

        if (declaredCount.HasValue)
        {
            if (kind != "scalar" && componentValues.Count > declaredCount.Value)
                componentValues.RemoveRange(declaredCount.Value, componentValues.Count - declaredCount.Value);
            if (kind == "scalar" && scalarValues.Count > declaredCount.Value)
                scalarValues.RemoveRange(declaredCount.Value, scalarValues.Count - declaredCount.Value);
        }

        var vectorPayload = kind == "vector" ? componentValues.ToArray() : null;
        var genericPayload = kind is "tensor" or "symmTensor" or "sphericalTensor" ? componentValues.ToArray() : null;
        return new OpenFoamFieldParseResult(
            true, "", format, fieldClass, objectName, dimensions, kind, false,
            null, null,
            kind == "scalar" ? scalarValues.ToArray() : null,
            vectorPayload,
            null, genericPayload, OpenFoamFieldComponentCount(kind),
            kind == "scalar" ? scalarValues.Count : componentValues.Count,
            declaredCount, totalBytes, bytesRead, closed);
    }

    private static string? FoamHeaderValue(string text, string key)
    {
        var match = Regex.Match(text, $@"\b{Regex.Escape(key)}\s+([^;\s]+)\s*;", RegexOptions.IgnoreCase);
        return match.Success ? match.Groups[1].Value : null;
    }

    private static bool ParseOpenFoamFieldValueLine(
        string raw, string kind, int? declaredCount,
        List<double> scalarValues, List<double[]> componentValues, out bool closed)
    {
        closed = false;
        var line = Regex.Replace(raw ?? "", @"//.*$", "").Trim();
        if (line.Length == 0) return false;
        if (Regex.IsMatch(line, @"^\)\s*;?"))
        {
            closed = true;
            return true;
        }

        if (kind == "scalar")
        {
            foreach (Match match in Regex.Matches(line, @"[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?"))
            {
                if (double.TryParse(match.Value, NumberStyles.Float, CultureInfo.InvariantCulture, out var value))
                    scalarValues.Add(value);
                if (declaredCount.HasValue && scalarValues.Count >= declaredCount.Value) return true;
            }
            return false;
        }

        var expected = OpenFoamFieldComponentCount(kind);
        if (expected <= 0) return false;
        var foundTuple = false;
        foreach (Match match in Regex.Matches(line, @"\([^()]*\)"))
        {
            foundTuple = true;
            if (!TryParseComponentTuple(match.Value, expected, out var components))
                continue;
            componentValues.Add(components);
            if (declaredCount.HasValue && componentValues.Count >= declaredCount.Value) return true;
        }

        if (kind == "sphericalTensor" && !foundTuple)
        {
            foreach (Match match in Regex.Matches(line, @"[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?"))
            {
                if (double.TryParse(match.Value, NumberStyles.Float, CultureInfo.InvariantCulture, out var value))
                    componentValues.Add(new[] { value });
                if (declaredCount.HasValue && componentValues.Count >= declaredCount.Value) return true;
            }
        }
        return false;
    }

    private static int OpenFoamFieldComponentCount(string kind) => kind switch
    {
        "scalar" => 1,
        "vector" => 3,
        "tensor" => 9,
        "symmTensor" => 6,
        "sphericalTensor" => 1,
        _ => 0
    };

    private static bool TryParseComponentTuple(string text, int expectedCount, out double[] components)
    {
        var valueText = (text ?? "").Trim();
        if (valueText.Length >= 2 && valueText[0] == '(' && valueText[^1] == ')')
            valueText = valueText[1..^1].Trim();
        var parts = valueText.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length != expectedCount)
        {
            components = Array.Empty<double>();
            return false;
        }
        components = new double[expectedCount];
        for (var i = 0; i < expectedCount; i++)
        {
            if (!double.TryParse(parts[i], NumberStyles.Float, CultureInfo.InvariantCulture, out components[i]))
            {
                components = Array.Empty<double>();
                return false;
            }
        }
        return true;
    }

    private async Task HandleFoamLogBatchAsync(JsonElement root, string requestId)
    {
        var items = new List<LogBatchItem>();
        if (root.TryGetProperty("items", out var arr) && arr.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in arr.EnumerateArray())
            {
                var token = RequiredString(item, "token");
                var index = item.TryGetProperty("index", out var i) && i.TryGetInt32(out var iv) ? iv : items.Count;
                items.Add(new LogBatchItem(token, index));
            }
        }

        var operation = BeginOperation(requestId);
        var results = new ConcurrentBag<LogParseResult>();
        var completed = 0;
        Post(new { type = "operationStart", requestId, operation = "foamLogBatch", total = items.Count });
        try
        {
            await Parallel.ForEachAsync(items,
                new ParallelOptions
                {
                    MaxDegreeOfParallelism = Math.Max(2, Environment.ProcessorCount - 1),
                    CancellationToken = operation.Token
                },
                async (item, ct) =>
                {
                    try
                    {
                        var result = await ParseFoamLogAsync(ResolveToken(item.Token), item.Index, ct);
                        results.Add(result);
                    }
                    catch (OperationCanceledException)
                    {
                        throw;
                    }
                    catch (Exception ex)
                    {
                        results.Add(new LogParseResult(item.Index, Array.Empty<double>(), Array.Empty<double>(), ex.Message));
                    }
                    finally
                    {
                        if (!operation.IsCancellationRequested)
                        {
                            var done = Interlocked.Increment(ref completed);
                            Post(new { type = "operationProgress", requestId, operation = "foamLogBatch", completed = done, total = items.Count });
                        }
                    }
                });

            Reply(requestId, true, new { results = results.OrderBy(x => x.Index).ToArray() }, null);
            Post(new { type = "operationComplete", requestId, operation = "foamLogBatch", completed, total = items.Count });
        }
        catch (OperationCanceledException)
        {
            Reply(requestId, false, null, "Operation cancelled.");
            Post(new { type = "operationCancelled", requestId, operation = "foamLogBatch", completed, total = items.Count });
        }
        finally
        {
            EndOperation(requestId, operation);
        }
    }

    private CancellationTokenSource BeginOperation(string requestId)
    {
        if (string.IsNullOrWhiteSpace(requestId))
            throw new ArgumentException("A requestId is required for cancellable operations.");

        var source = new CancellationTokenSource();
        if (_operations.TryGetValue(requestId, out var previous))
        {
            previous.Cancel();
            previous.Dispose();
            _operations.TryRemove(requestId, out _);
        }
        if (!_operations.TryAdd(requestId, source))
        {
            source.Dispose();
            throw new InvalidOperationException($"Could not register native operation {requestId}.");
        }
        return source;
    }

    private void EndOperation(string requestId, CancellationTokenSource source)
    {
        if (_operations.TryGetValue(requestId, out var current) && ReferenceEquals(current, source))
            _operations.TryRemove(requestId, out _);
        source.Dispose();
    }

    private void HandleOpenExternal(JsonElement root, string requestId)
    {
        var uri = RequiredString(root, "uri");
        if (!Uri.TryCreate(uri, UriKind.Absolute, out var parsed) ||
            (parsed.Scheme != Uri.UriSchemeHttps && parsed.Scheme != Uri.UriSchemeHttp))
        {
            Reply(requestId, false, null, "Only http/https external links are allowed.");
            return;
        }
        OpenExternal(parsed.ToString());
        Reply(requestId, true, new { uri = parsed.ToString() }, null);
    }

    private void HandleCancelOperation(JsonElement root, string requestId)
    {
        var targetRequestId = RequiredString(root, "targetRequestId");
        if (_operations.TryGetValue(targetRequestId, out var operation))
        {
            operation.Cancel();
            Reply(requestId, true, new { targetRequestId, cancelled = true }, null);
        }
        else
        {
            Reply(requestId, false, null, $"Operation is no longer active: {targetRequestId}");
        }
    }

    private static async Task<LogParseResult> ParseFoamLogAsync(string path, int index, CancellationToken ct)
    {
        var t = new List<double>();
        var y = new List<double>();
        await using var stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite,
            bufferSize: 65536, useAsync: true);
        using var reader = new StreamReader(stream, Encoding.UTF8, detectEncodingFromByteOrderMarks: true, bufferSize: 65536);
        while (!reader.EndOfStream)
        {
            ct.ThrowIfCancellationRequested();
            var line = await reader.ReadLineAsync(ct);
            if (string.IsNullOrWhiteSpace(line)) continue;
            line = line.Trim();
            if (line.StartsWith('#')) continue;
            var split = FirstTwoTokens(line);
            if (split is null) continue;
            if (TryParseFoamLogNumber(split.Value.First, out var tx) &&
                TryParseFoamLogNumber(split.Value.Second, out var vy))
            {
                t.Add(tx); y.Add(vy);
            }
        }
        return new LogParseResult(index, t.ToArray(), y.ToArray(), null);
    }

    private static bool TryParseFoamLogNumber(string token, out double value)
    {
        value = double.NaN;
        if (string.IsNullOrWhiteSpace(token)) return false;

        // OpenFOAM foamLog output can append unit text directly to a numeric
        // token (for example "0.001s"). Match the same leading numeric grammar
        // used by the JavaScript parser so Desktop and browser ingestion agree.
        var match = Regex.Match(
            token.Trim(),
            @"^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?");
        return match.Success &&
            double.TryParse(match.Value, NumberStyles.Float, CultureInfo.InvariantCulture, out value);
    }

    private static async Task RunFoamLogParserSelfTestAsync()
    {
        var tempPath = Path.Combine(
            Path.GetTempPath(),
            $"foamlens-foamlog-smoke-{Guid.NewGuid():N}.dat");
        try
        {
            // This mirrors the actual B13 foamLog format used by OpenFOAM:
            // simulation time carries a trailing "s" suffix.
            await File.WriteAllTextAsync(
                tempPath,
                "0.001s\t0.0062232\n0.002s\t0.0207126\n",
                Encoding.UTF8);

            var parsed = await ParseFoamLogAsync(tempPath, -1, CancellationToken.None);
            if (parsed.T.Length != 2 || parsed.Y.Length != 2 ||
                Math.Abs(parsed.T[0] - 0.001) > 1e-12 ||
                Math.Abs(parsed.T[1] - 0.002) > 1e-12 ||
                Math.Abs(parsed.Y[0] - 0.0062232) > 1e-12 ||
                Math.Abs(parsed.Y[1] - 0.0207126) > 1e-12)
            {
                throw new InvalidOperationException(
                    "Native foamLog self-test failed to parse OpenFOAM time tokens with unit suffixes.");
            }
        }
        finally
        {
            try { if (File.Exists(tempPath)) File.Delete(tempPath); }
            catch { /* Smoke-test cleanup must not hide parser failures. */ }
        }
    }

    private static (string First, string Second)? FirstTwoTokens(string line)
    {
        var i = 0;
        while (i < line.Length && char.IsWhiteSpace(line[i])) i++;
        var a = i;
        while (i < line.Length && !char.IsWhiteSpace(line[i])) i++;
        if (i <= a) return null;
        var first = line[a..i];
        while (i < line.Length && char.IsWhiteSpace(line[i])) i++;
        var b = i;
        while (i < line.Length && !char.IsWhiteSpace(line[i])) i++;
        if (i <= b) return null;
        return (first, line[b..i]);
    }

    private string ResolveToken(string token) =>
        _fileTokens.TryGetValue(token, out var path)
            ? path
            : throw new FileNotFoundException($"Unknown or expired native file token: {token}");

    private static string RequiredString(JsonElement root, string name) =>
        root.TryGetProperty(name, out var node) && !string.IsNullOrWhiteSpace(node.GetString())
            ? node.GetString()!
            : throw new ArgumentException($"Missing {name}");

    private void Reply(string requestId, bool ok, object? data, string? error) =>
        Post(new { type = "nativeReply", requestId, ok, data, error });

    private void Post(object payload)
    {
        var json = JsonSerializer.Serialize(payload, _json);
        if (IsDisposed) return;
        if (InvokeRequired) BeginInvoke(new Action(() => _web.CoreWebView2?.PostWebMessageAsJson(json)));
        else _web.CoreWebView2?.PostWebMessageAsJson(json);
    }

    private static void OpenExternal(string? uri)
    {
        if (string.IsNullOrWhiteSpace(uri)) return;
        try { Process.Start(new ProcessStartInfo(uri) { UseShellExecute = true }); }
        catch { /* External navigation should never crash FoamLens. */ }
    }

    private static void Log(string message)
    {
        try
        {
            var dir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "FoamLens", "Desktop");
            Directory.CreateDirectory(dir);
            File.AppendAllText(Path.Combine(dir, "foamlens-desktop.log"),
                $"[{DateTimeOffset.Now:O}] {message}{Environment.NewLine}");
        }
        catch { }
    }

    private sealed record UpdateReleaseInfo(
        Version Version, string Tag, string HtmlUrl, string InstallerName, string? InstallerUrl, string? ChecksumUrl);
    private sealed record NativeFileRef(string Token, string Name, string RelativePath, long Size, long LastModified);
    private sealed record TemporalColumn(double[] T, double[] Y);
    private sealed record TemporalParseResult(TemporalColumn[] Columns, Dictionary<int, string> Probes, string Head, long SourceBytes);
    private sealed record OpenFoamFieldParseResult(
        bool Supported, string Reason, string Format, string FieldClass, string Object, string Dimensions, string Kind,
        bool Uniform, double? UniformScalar, double[]? UniformVector, double[]? ScalarValues, double[][]? VectorValues,
        double[]? UniformComponents, double[][]? ComponentValues, int? ComponentCount,
        int? Count, int? DeclaredCount, long SourceBytes, long BytesRead, bool Closed)
    {
        public static OpenFoamFieldParseResult Unsupported(string reason, string format, string fieldClass, string objectName, string dimensions, string kind, long sourceBytes, long bytesRead) =>
            new(false, reason, format, fieldClass, objectName, dimensions, kind, false, null, null, null, null, null, null, OpenFoamFieldComponentCount(kind), null, null, sourceBytes, bytesRead, false);
        public static OpenFoamFieldParseResult FromUniformScalar(string format, string fieldClass, string objectName, string dimensions, double value, long sourceBytes, long bytesRead) =>
            new(true, "", format, fieldClass, objectName, dimensions, "scalar", true, value, null, null, null, null, null, 1, null, null, sourceBytes, bytesRead, false);
        public static OpenFoamFieldParseResult FromUniformComponents(string format, string fieldClass, string objectName, string dimensions, string kind, double[] value, long sourceBytes, long bytesRead) =>
            new(true, "", format, fieldClass, objectName, dimensions, kind, true, null,
                kind == "vector" ? value : null, null, null,
                kind == "vector" ? null : value, null, value.Length,
                null, null, sourceBytes, bytesRead, false);

        public FoamBoundaryFieldPatchInfo[] BoundaryPatches { get; init; } = Array.Empty<FoamBoundaryFieldPatchInfo>();
    }
    private sealed record OpenFoamMeshParseResult(
        bool Supported, string Reason, string Format,
        double[] Points, int[] SurfaceTriangles, int[] SurfaceOwners, int[] SurfaceEdges, double[] CellCenters,
        int[] FaceOffsets, int[] FacePoints, int[] Owners, int[] Neighbours,
        int PointCount, int FaceCount, int InternalFaceCount, int BoundaryFaceCount, int CellCount,
        double[] BoundsMin, double[] BoundsMax, string CellCenterMethod, long SourceBytes)
    {
        public static OpenFoamMeshParseResult Unsupported(string reason, string format, long sourceBytes) =>
            new(false, reason, format, Array.Empty<double>(), Array.Empty<int>(), Array.Empty<int>(),
                Array.Empty<int>(), Array.Empty<double>(),
                Array.Empty<int>(), Array.Empty<int>(), Array.Empty<int>(), Array.Empty<int>(),
                0, 0, 0, 0, 0,
                Array.Empty<double>(), Array.Empty<double>(), "", sourceBytes);

        public int[] SurfaceTriangleFaces { get; init; } = Array.Empty<int>();
        public FoamBoundaryPatchInfo[] BoundaryPatches { get; init; } = Array.Empty<FoamBoundaryPatchInfo>();
        public string BoundaryPatchStatus { get; init; } = "not-provided";
    }

    private sealed record LogBatchItem(string Token, int Index);
    private sealed record LogParseResult(int Index, double[] T, double[] Y, string? Error);
}
