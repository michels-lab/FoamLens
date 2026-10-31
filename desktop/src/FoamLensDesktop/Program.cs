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
        if (args.Any(arg => string.Equals(arg, "--temporal-cache-self-test", StringComparison.OrdinalIgnoreCase)))
        {
            NativeTemporalCache.RunSelfTestAsync().GetAwaiter().GetResult();
            NativeCaseCatalog.RunSelfTestAsync().GetAwaiter().GetResult();
            FoamLensForm.RunTemporalRecordCacheSelfTestAsync().GetAwaiter().GetResult();
            FoamLensForm.RunFieldRecordCacheSelfTestAsync().GetAwaiter().GetResult();
            return;
        }
#if FOAMLENS_DEVELOPER
        if (args.Any(arg => string.Equals(arg, "--developer-audit-self-test", StringComparison.OrdinalIgnoreCase)))
        {
            FoamLensForm.ValidateDeveloperAuditResource();
            return;
        }
#endif
        ApplicationConfiguration.Initialize();
        var developerSmoke = args.Any(arg =>
            string.Equals(arg, "--developer-audit-smoke-test", StringComparison.OrdinalIgnoreCase));
        var smokeTest = args.Any(arg =>
            string.Equals(arg, "--smoke-test", StringComparison.OrdinalIgnoreCase));
        using var form = new FoamLensForm(smokeTest || developerSmoke, developerSmoke);
        Application.Run(form);
        if (smokeTest || developerSmoke)
            Environment.ExitCode = form.SmokeTestExitCode;
    }
}

internal sealed class FoamLensForm : Form
{
    private readonly WebView2 _web = new() { Dock = DockStyle.Fill };
    private readonly bool _smokeTest;
    private readonly bool _developerAuditSmoke;
    private readonly ConcurrentDictionary<string, string> _fileTokens = new(StringComparer.Ordinal);
    private readonly ConcurrentDictionary<string, CancellationTokenSource> _operations = new(StringComparer.Ordinal);
    private long _tokenSequence;
    private readonly JsonSerializerOptions _json = new(JsonSerializerDefaults.Web);
    private static readonly Uri LatestReleaseApi = new("https://api.github.com/repos/michels-lab/FoamLens/releases/latest");
    private static readonly HttpClient UpdateHttpClient = CreateUpdateHttpClient();
    private int _updateCheckInProgress;
#if FOAMLENS_DEVELOPER
    private const bool DeveloperEdition = true;
    private const string ProductDataFolder = "FoamLensDeveloper";
#else
    private const bool DeveloperEdition = false;
    private const string ProductDataFolder = "FoamLens";
#endif
#if FOAMLENS_DEVELOPER
    internal static string DeveloperAuditScript()
    {
        using var source = Assembly.GetExecutingAssembly().GetManifestResourceStream("FoamLensDesktop.Developer.Audit.js")
            ?? throw new InvalidOperationException("FoamLens Developer audit resource is missing.");
        using var reader = new StreamReader(source);
        var script = reader.ReadToEnd();
        if (!script.Contains("FOAMLENS_DEVELOPER_AUDIT_V1", StringComparison.Ordinal))
            throw new InvalidOperationException("FoamLens Developer audit resource identity failed.");
        return script;
    }

    internal static void ValidateDeveloperAuditResource()
    {
        var script = DeveloperAuditScript();
        if (script.Length < 4000 || !script.Contains("downloadDeveloperAudit", StringComparison.Ordinal))
            throw new InvalidOperationException("Developer audit must include local export tools.");
    }
#endif
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
        ProductDataFolder, "Desktop", DesktopVersionText, "app");

    public int SmokeTestExitCode { get; private set; }

    public FoamLensForm(bool smokeTest = false, bool developerAuditSmoke = false)
    {
        _smokeTest = smokeTest;
        _developerAuditSmoke = developerAuditSmoke;
        SmokeTestExitCode = smokeTest ? 1 : 0;
        Text = DeveloperEdition ? "FoamLens Developer · Diagnostic Edition" : "FoamLens Desktop";
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
            // G57: isolate ONLY opt-in private B13 numerical smoke user-data.
            // Normal Installed/Portable apps retain their original WebView2 path.
            // No user profiles are migrated, deleted, or reused for the witness.
            var originalWebView2Data = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                ProductDataFolder, "Desktop", "WebView2");
            var isolatedG56Smoke = _smokeTest && string.Equals(
                Environment.GetEnvironmentVariable("FOAMLENS_SMOKE_TIMESERIES_B13"),
                "1", StringComparison.Ordinal);
            var userData = isolatedG56Smoke
                ? Path.Combine(originalWebView2Data, "G56-PrivateNumericSmoke")
                : originalWebView2Data;
            Directory.CreateDirectory(userData);

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
            var environment = await CoreWebView2Environment.CreateAsync(null, userData, options);
            await _web.EnsureCoreWebView2Async(environment);

            _web.CoreWebView2.SetVirtualHostNameToFolderMapping(
                "foamlens.local", AppRoot, CoreWebView2HostResourceAccessKind.Allow);
            _web.CoreWebView2.Settings.AreDevToolsEnabled = true;
            _web.CoreWebView2.Settings.AreDefaultContextMenusEnabled = true;
            _web.CoreWebView2.Settings.IsStatusBarEnabled = false;
            _web.CoreWebView2.WebMessageReceived += OnWebMessageReceived;
#if FOAMLENS_DEVELOPER
            // Inject the developer-only auditor at document creation.
            // This assembly resource is not embedded in the normal FoamLens binary
            // or its shared scientific AppBundle.zip.
            await _web.CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync(DeveloperAuditScript());
#endif
            _web.CoreWebView2.NewWindowRequested += (_, e) =>
            {
                // The browser owns ONLY the secure local FoamLens origin.
                // Windows ShellExecute must never receive WebView2 custom schemes.
                e.Handled = true;
                OpenExternal(e.Uri);
            };
            _web.CoreWebView2.NavigationStarting += (_, e) =>
            {
                if (!ExternalNavigationPolicy.IsInternalNavigation(e.Uri))
                {
                    // Cancel all unrecognized navigation, even file:, ms-*,
                    // javascript:, about:, HTTP-local host and invalid URLs.
                    e.Cancel = true;
                    OpenExternal(e.Uri);
                }
            };
            _web.CoreWebView2.ProcessFailed += (_, e) =>
            {
                Log($"WebView2 process failed: {e.ProcessFailedKind}");
#if FOAMLENS_DEVELOPER
                try
                {
                    _web.CoreWebView2.PostWebMessageAsJson(
                        JsonSerializer.Serialize(new { type = "developerHostEvent", kind = "renderer-failure",
                            message = $"WebView2 process failed: {e.ProcessFailedKind}" }));
                }
                catch (Exception) { /* A failed renderer may not accept messages. */ }
#endif
            };

            if (_smokeTest)
            {
#if FOAMLENS_DEVELOPER
                if (_developerAuditSmoke) await RunDeveloperAuditSmokeAsync();
                else await RunSmokeTestAsync();
#else
                await RunSmokeTestAsync();
#endif
            }
            else
            {
                var channelQuery = StoreDistributionChannel ? "&store=1" : "";
                _web.CoreWebView2.Navigate("https://foamlens.local/index.html?desktop=1" + channelQuery);
                if (!StoreDistributionChannel && !DeveloperEdition)
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


    // Generated ONLY from the actual running packaged WebView2 surface.
    // Screenshots are evidence for independent review, never automatic approval.
    private async Task CaptureRenderedBrandEvidenceAsync()
    {
        var root = Environment.GetEnvironmentVariable("FOAMLENS_BRAND_EVIDENCE_DIR");
        if (string.IsNullOrWhiteSpace(root)) return;
        Directory.CreateDirectory(root);
        await _web.CoreWebView2.CallDevToolsProtocolMethodAsync("Page.enable", "{}");
        try
        {
            foreach (var size in new[] { (Width: 1140, Height: 820, Name: "wide"), (Width: 640, Height: 900, Name: "compact") })
            {
                var metrics = $"{{\"width\":{size.Width},\"height\":{size.Height},\"deviceScaleFactor\":1,\"mobile\":false}}";
                await _web.CoreWebView2.CallDevToolsProtocolMethodAsync("Emulation.setDeviceMetricsOverride", metrics);
                await Task.Delay(160);
                var home = await _web.CoreWebView2.ExecuteScriptAsync(
                    "(()=>{const t=document.getElementById('launchTitle'),m=document.getElementById('launchOfficialLogo');const a=t?.getBoundingClientRect(),b=m?.getBoundingClientRect();return{ok:!!t&&!!m&&a.width>90&&b.width>65&&m.naturalWidth>0,viewport:innerWidth,title:a?.width,mark:b?.width}})()");
                if (!JsonDocument.Parse(home).RootElement.GetProperty("ok").GetBoolean())
                    throw new InvalidOperationException("Rendered Home identity is invalid in " + size.Name + ": " + home);
                await CaptureCdpPngAsync(Path.Combine(root, $"home-{size.Name}.png"));

                var about = await _web.CoreWebView2.ExecuteScriptAsync(
                    """
                    (() => {
                      const opener=document.getElementById('aboutDeveloperBtn');
                      opener?.click();
                      const overlay=document.getElementById('aboutDeveloperOverlay');
                      const shell=overlay?.querySelector('.aboutShell');
                      if(shell)shell.scrollTop=0;
                      const portrait=document.getElementById('aboutPortraitImg');
                      const studio=document.getElementById('aboutMichelsLabLogo');
                      const product=document.getElementById('aboutOfficialLogo');
                      const author=document.querySelector('.aboutName');
                      const slogan=document.getElementById('aboutBrandTag');
                      const links=[...document.querySelectorAll('#aboutDeveloperOverlay .aboutSocial')];
                      const box=x=>x?.getBoundingClientRect();
                      const visible=x=>{const r=box(x);return !!r&&r.width>30&&r.height>15};
                      const inInitialViewport=x=>{
                        const r=box(x),c=box(shell);
                        return visible(x)&&!!c&&r.top>=c.top-2&&r.bottom<=c.bottom+2&&r.left>=c.left-2&&r.right<=c.right+2;
                      };
                      const expected=['Instagram','Facebook','LinkedIn','GitHub','Email'];
                      const checks={
                        overlayOpen:!!overlay?.classList.contains('open'),
                        shellVisible:visible(shell),
                        portraitVisible:visible(portrait)&&!!portrait?.complete&&portrait.naturalWidth>0,
                        studioVisible:visible(studio)&&!!studio?.complete&&studio.naturalWidth>0,
                        productVisible:visible(product)&&!!product?.complete&&product.naturalWidth>0,
                        authorVisible:visible(author),
                        sloganVisible:visible(slogan)&&slogan.textContent.trim()==='TOOLS WITH IDENTITY.',
                        networkCount:links.length===5,
                        iconAndNetworkNames:links.every((link,i)=>link.textContent.includes(expected[i])&&visible(link.querySelector('.aboutIcon'))),
                        socialsVisibleWithoutScroll:links.every(inInitialViewport),
                        pairedIdentityVisible:[portrait,product,studio].every(inInitialViewport),
                        socialLinksInitiallyVisible:(()=>{
                          const socialList=overlay?.querySelector('.aboutSocials');
                          const outer=box(shell),inner=box(socialList);
                          return !!outer&&!!inner&&inner.width>0&&inner.height>0&&
                            inner.top>=outer.top&&inner.bottom<=outer.bottom-3;
                        })()
                      };
                      return {ok:Object.values(checks).every(Boolean),checks,
                        viewport:innerWidth,portrait:box(portrait)?.width,studio:box(studio)?.width,
                        product:box(product)?.width,slogan:slogan?.textContent,
                        scrollHeight:shell?.scrollHeight,clientHeight:shell?.clientHeight};
                    })()
                    """);
                if (!JsonDocument.Parse(about).RootElement.GetProperty("ok").GetBoolean())
                    throw new InvalidOperationException("Rendered About product/author/studio/social hierarchy failed in " + size.Name + ": " + about);
                Log("FoamLens real About bounds and identity passed: " + about);
                await Task.Delay(100);
                await CaptureCdpPngAsync(Path.Combine(root, $"about-{size.Name}.png"));
                var bottom = await _web.CoreWebView2.ExecuteScriptAsync(
                    """
                    (()=>{
                      const shell=document.querySelector('#aboutDeveloperOverlay .aboutShell');
                      if(shell)shell.scrollTop=shell.scrollHeight;
                      const socials=document.querySelector('#aboutDeveloperOverlay .aboutSocials');
                      const sr=socials?.getBoundingClientRect(),cr=shell?.getBoundingClientRect();
                      return {ok:!!shell&&!!socials&&sr.width>100&&sr.height>40&&
                        sr.top<cr.bottom&&sr.bottom>cr.top,scrollTop:shell?.scrollTop};
                    })()
                    """);
                if (!JsonDocument.Parse(bottom).RootElement.GetProperty("ok").GetBoolean())
                    throw new InvalidOperationException("About socials are not reachable by scrolling in " + size.Name + ": " + bottom);
                await Task.Delay(130);
                await CaptureCdpPngAsync(Path.Combine(root, $"about-{size.Name}-bottom.png"));
                var closed = await _web.CoreWebView2.ExecuteScriptAsync(
                    "(()=>{document.getElementById('aboutDeveloperClose')?.click();return !document.getElementById('aboutDeveloperOverlay')?.classList.contains('open')})()");
                if (!string.Equals(closed.Trim(), "true", StringComparison.OrdinalIgnoreCase))
                    throw new InvalidOperationException("About Close did not work in " + size.Name);
            }
        }
        finally
        {
            await _web.CoreWebView2.CallDevToolsProtocolMethodAsync("Emulation.clearDeviceMetricsOverride", "{}");
        }
        Log("FoamLens rendered Home/About evidence captured and verified across wide/compact viewports.");
    }


    // Scientific rendered-evidence contract: capture the actual imported
    // QuickCup Data/Field workspaces from portable AND installed WebView2.
    // Toolbars must allocate real layout space rather than mask the 3D canvas.
    private async Task CaptureScientificWorkspaceEvidenceAsync()
    {
        var root = Environment.GetEnvironmentVariable("FOAMLENS_BRAND_EVIDENCE_DIR");
        if (string.IsNullOrWhiteSpace(root)) return;
        Directory.CreateDirectory(root);
        await _web.CoreWebView2.CallDevToolsProtocolMethodAsync("Page.enable", "{}");
        try
        {
            foreach (var size in new[] { (Width: 1140, Height: 820, Name: "wide"), (Width: 640, Height: 900, Name: "compact") })
            {
                var metrics = $"{{\"width\":{size.Width},\"height\":{size.Height},\"deviceScaleFactor\":1,\"mobile\":false}}";
                await _web.CoreWebView2.CallDevToolsProtocolMethodAsync("Emulation.setDeviceMetricsOverride", metrics);
                var fieldState = await _web.CoreWebView2.ExecuteScriptAsync(
                    """
                    (() => {
                      try {
                      document.getElementById('flRibbonTab-field')?.click();
                      // The physical-region controls are in the real Field
                      // inspector. Open it rather than asserting that a
                      // deliberately collapsed inspector has visible legends.
                      window.FoamLensFieldWorkspace?.setInspector?.(true);
                      // Camera controls are deliberately docked in the Ribbon's
                      // expandable shelf, NOT over the scientific 3D viewport.
                      // Exercise the actual Camera button before measuring it.
                      const cameraTab=document.querySelector('#flFieldContextTabs [data-fl-subbar="camera"]');
                      if(cameraTab&&!cameraTab.classList.contains('active'))cameraTab.click();
                      const canvas=document.getElementById('fvCanvas');
                      const shelf=document.getElementById('flFieldContextShelf');
                      const ribbon=document.getElementById('flRibbon');
                      const tools=shelf?.querySelector('.fvViewTools');
                      const panel=document.getElementById('fieldViewPanel');
                      const physical=window.FoamLensRegionScene?.state?.();
                      const probe=document.getElementById('fvProbeRegion');
                      // Validate an actual measured secondary OpenFOAM field:
                      // its own inspector colormap/legend must reflect the same
                      // physical time, while the primary colormap stays unchanged.
                      const secondary=[...(physical?.layers||[])].find(([,layer])=>layer?.colored);
                      const measuredLayer=secondary?.[1],secondaryName=secondary?.[0];
                      const regionRow=[...document.querySelectorAll('#fvMultiRegionRows [data-fv-region-row]')]
                        .find(el=>el.dataset.fvRegionRow===secondaryName);
                      const regionPalette=regionRow?.querySelector('[data-fv-region-palette]');
                      const regionLegend=regionRow?.querySelector('.fvRegionLegend');
                      const colorBar=regionLegend?.querySelector('.fvRegionLegendBar');
                      const primaryPalette=document.getElementById('fvPalette');
                      const primaryPaletteBefore=primaryPalette?.value;
                      const regionLegendMeasured=!!secondary&&!!regionRow&&!!regionPalette&&!!colorBar&&
                        colorBar.getBoundingClientRect().width>70&&
                        regionLegend.textContent.includes(measuredLayer.field)&&
                        Number.isFinite(measuredLayer.sourceTime)&&
                        Number.isFinite(measuredLayer.paintRange?.min)&&
                        Number.isFinite(measuredLayer.paintRange?.max)&&
                        !measuredLayer.geometryOnly;
                      let independentRegionPalette=false;
                      if(regionLegendMeasured){
                        const before=regionPalette.value,next=before==='turbo'?'coolwarm':'turbo';
                        regionPalette.value=next;
                        regionPalette.dispatchEvent(new Event('change',{bubbles:true}));
                        const updated=physical.layers.get(secondaryName);
                        independentRegionPalette=updated?.palette===next&&
                          primaryPalette?.value===primaryPaletteBefore&&
                          !!regionRow.querySelector('.fvRegionLegendBar')?.style.backgroundImage.includes('linear-gradient');
                        // The evidence screenshot keeps the originally selected
                        // physical color map after exercising live GPU recoloring.
                        regionPalette.value=before;
                        regionPalette.dispatchEvent(new Event('change',{bubbles:true}));
                      }
                      const rect=x=>x?.getBoundingClientRect();
                      const a=rect(canvas),b=rect(tools),v=rect(panel);
                      const overlap=a&&b?Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*
                        Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)):Infinity;
                      const primary=window.FoamLensFieldView?.getVideoDescriptor?.();
                      const clock=document.getElementById('fwTimeReadout');
                      const timeSlider=document.getElementById('fwTimeSlider');
                      const loadedTime=window.FoamLensFieldWorkspace?.timeController?.current?.()??NaN;
                      const fieldPhysicalTime=primary?.time;
                      // The native host must observe the rendered UI rather
                      // than call internal frontend formatter functions. Extract
                      // the actually displayed numeric physical time from the
                      // visible readout, and cross-check independent frame data.
                      const readoutText=clock?.textContent||'';
                      const shown=/^\s*t\s*=\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)\s*s\s*$/.exec(readoutText);
                      const displayedTime=shown?Number(shown[1]):NaN;
                      const clockRect=clock?.getBoundingClientRect();
                      const physicalFrameMatches=Number.isFinite(fieldPhysicalTime)&&Number.isFinite(loadedTime)&&
                        Math.abs(loadedTime-fieldPhysicalTime)<1e-9;
                      const displayedTimeMatches=Number.isFinite(displayedTime)&&Number.isFinite(loadedTime)&&
                        Math.abs(displayedTime-loadedTime)<=1e-6*Math.max(1,Math.abs(loadedTime));
                      const clockAriaMatches=timeSlider?.getAttribute('aria-valuetext')===readoutText;
                      const clockVisible=!!clockRect&&clockRect.width>30&&clockRect.height>12;
                      const clockMatchesRealFrame=Number.isFinite(fieldPhysicalTime)&&
                        Number.isFinite(loadedTime)&&Number.isFinite(displayedTime)&&
                        Math.abs(loadedTime-fieldPhysicalTime)<1e-9&&
                        Math.abs(displayedTime-loadedTime)<=1e-6*Math.max(1,Math.abs(loadedTime))&&
                        timeSlider?.getAttribute('aria-valuetext')===readoutText&&
                        clockRect?.width>30&&clockRect?.height>12;
                      const timelineEvidence=clockMatchesRealFrame;
                      const hasField=!!primary?.range?.valid;
                      // User-reported installed-WebView2 regressions: 7 distinguishable
                      // camera presets, no duplicate 2D Field bar, no vertical Play,
                      // and a cache panel that does not grow the command row.
                      const names=['Iso','Front','Back','Left','Right','Top','Bottom'];
                      const quick=names.map(name=>document.getElementById('flRaQuick'+name));
                      const distinctCameras=quick.every(Boolean)&&
                        new Set(quick.map(el=>el.querySelector('svg')?.innerHTML)).size===7;
                      const cameraNamesReadable=innerWidth<=1200?(()=>{
                        // Camera shelf is active here: assert the full named
                        // physical-axis presets instead of duplicate quick icons.
                        const menu=tools?.querySelector('.fvNavPresets');
                        const wasOpen=!!menu?.open;if(menu)menu.open=true;
                        const items=[...(menu?.querySelectorAll('[data-fv-view]')||[])];
                        const good=items.length===7&&items.every(el=>{
                          const r=el.getBoundingClientRect();
                          return r.width>=60&&getComputedStyle(el).display!=='none'&&
                            /X|Y|Z/.test(el.textContent||'')&&!!el.getAttribute('aria-label')
                        });
                        if(menu)menu.open=wasOpen;
                        return good
                      })():quick.every(el=>{
                        const label=el?.querySelector('.flRibbonLabel'),rect=el?.getBoundingClientRect();
                        const named=!!el?.getAttribute('title')&&!!el?.getAttribute('aria-label')&&
                          el.getAttribute('aria-label').startsWith(label?.textContent||'__missing__');
                        return named&&!!rect&&rect.width>=55&&
                          getComputedStyle(label).display!=='none'&&label.getBoundingClientRect().width>=20
                      });
                      const internalBar=document.querySelector('#fieldSurface .fwWorkspaceBar');
                      const fieldNavHidden=!!internalBar&&getComputedStyle(internalBar).display==='none'&&
                        window.FoamLensFieldWorkspace?.getState?.().view==='3d';
                      const playRect=document.getElementById('fwTimePlay')?.getBoundingClientRect();
                      const playButton=document.getElementById('fwTimePlay');
                      // G41: attribution only. Preserve the original binary Play gate,
                      // source time checks, visible strings and app layout unchanged.
                      // Only primitive booleans/pixels are exported to the test-only
                      // sanitized evidence; never transfer raw WebView2 text.
                      const playComputed=playButton?getComputedStyle(playButton):null;
                      const playLabelReady=!!playButton&&/Play|Reproducir/.test(playButton.textContent||'');
                      const playPauseLabel=!!playButton&&/Pause|Pausa/.test(playButton.textContent||'');
                      const playLoopAriaReady=!!playButton&&/(loop|bucle)/i.test(playButton.getAttribute('aria-label')||'');
                      const playTransportContainsPlay=!!document.getElementById('fwTimeTransport')?.contains(playButton);
                      const playCompactClassAtWide=innerWidth>=1025&&!!document.getElementById('appShell')?.classList.contains('gfwCompact');
                      const playNotCollapsed=!!playRect&&playRect.width>=100&&playRect.height>=28&&
                        playButton.scrollWidth<=playButton.clientWidth+2&&
                        /Play|Reproducir/.test(playButton.textContent||'')&&
                        /(loop|bucle)/i.test(playButton.getAttribute('aria-label')||'');
                      const cache=document.getElementById('flRibbonCacheAdvanced');
                      if(cache)cache.open=true;
                      if(typeof flRibbonPlaceCachePopover==='function')flRibbonPlaceCachePopover();
                      const popup=cache?.querySelector('.flRibbonCachePopover');
                      const popupRect=popup?.getBoundingClientRect();
                      const selectorRect=document.getElementById('fvCacheLimit')?.getBoundingClientRect();
                      const cachePopoverValid=!!cache?.open&&!!popupRect&&
                        getComputedStyle(popup).display==='grid'&&popupRect.width>=200&&
                        popupRect.left>=0&&popupRect.right<=innerWidth+1&&
                        !!selectorRect&&selectorRect.width>=80&&
                        selectorRect.left>=popupRect.left&&selectorRect.right<=popupRect.right+1;
                      if(cache)cache.open=false;
                      const cameraDocked=!!cameraTab&&cameraTab.classList.contains('active')&&
                        !!shelf&&!shelf.classList.contains('hidden')&&
                        ribbon?.contains(shelf)&&shelf.contains(tools)&&tools?.contains(probe);
                      const ok=!!canvas&&!!tools&&!!panel&&!!probe&&cameraDocked&&
                        !!a&&a.width>180&&a.height>180&&!!b&&b.width>130&&b.height>20&&
                        b.right>0&&b.left<innerWidth&&b.bottom>0&&b.top<innerHeight&&
                        !!v&&v.width>180&&overlap<1&&hasField&&
                        physical?.layers?.size>0&&regionLegendMeasured&&independentRegionPalette&&
                        clockMatchesRealFrame&&distinctCameras&&cameraNamesReadable&&fieldNavHidden&&
                        playNotCollapsed&&cachePopoverValid;
                      return {ok,viewport:innerWidth,canvasWidth:a?.width,canvasHeight:a?.height,
                        regionLegendMeasured,independentRegionPalette,region:secondaryName,
                        regionTime:measuredLayer?.sourceTime,regionPalette:regionPalette?.value,
                        cameraDocked,distinctCameras,cameraNamesReadable,fieldNavHidden,playNotCollapsed,cachePopoverValid,
                        // QA-only primitive measurements for intermittent original Play failures.
                        playWidth:playRect?.width,playHeight:playRect?.height,
                        playLeft:playRect?.left,playRight:playRect?.right,
                        playClientWidth:playButton?.clientWidth,playScrollWidth:playButton?.scrollWidth,
                        playComputedWidth:playComputed?Number.parseFloat(playComputed.width):null,
                        playMinWidthAtLeast100:!!playComputed&&Number.parseFloat(playComputed.minWidth)>=100,
                        playLabelReady,playPauseLabel,playLoopAriaReady,playTransportContainsPlay,
                        playCompactClassAtWide,
                        playG12StylesheetPresent:!!document.getElementById('flG12WideFieldRibbonStyle'),
                        playG16StylesheetPresent:!!document.getElementById('flG16WidePlayCascadeGuard'),
                        playG7StylesheetPresent:!!document.getElementById('gfwG7Style'),
                        toolbarHeight:b?.height,toolbarWidth:b?.width,
                        toolbarLeft:b?.left,toolbarRight:b?.right,toolbarCanvasOverlap:overlap,
                        shelfScrollLeft:shelf?.scrollLeft,shelfScrollWidth:shelf?.scrollWidth,
                        shelfClientWidth:shelf?.clientWidth,
                        primaryField:primary?.fieldName||'',primaryTime:primary?.time,
                        clockMatchesRealFrame,physicalFrameMatches,displayedTimeMatches,clockAriaMatches,clockVisible,
                        clockWidth:clockRect?.width,clockHeight:clockRect?.height,
                        clockAriaText:timeSlider?.getAttribute('aria-valuetext'),clockText:clock?.textContent,displayedClockTime:displayedTime,activeClockTime:loadedTime,
                        secondaryRegions:physical?.layers?.size||0,probeRegions:probe?.options?.length||0};
                      }catch(error){
                        return {ok:false,stage:'native-field-wide-compact',error:String(error?.message||error),
                          stack:String(error?.stack||''),timeFn:typeof fwTimeCurrent,
                          exportedTimeFn:typeof window.FoamLensFieldWorkspace?.timeController?.current};
                      }
                    })()
                    """);
                if (fieldState == "null" || string.IsNullOrWhiteSpace(fieldState))
                    throw new InvalidOperationException("Native Field UI JavaScript evaluation returned null in " + size.Name +
                        "; inspect WebView2 runtime JavaScript syntax/errors: " + fieldState);
                if (!JsonDocument.Parse(fieldState).RootElement.GetProperty("ok").GetBoolean())
                {
                    // A failed renderer contract must leave real pixels for
                    // debugging, not just an early process death in GPU capture.
                    try { await CaptureCdpPngAsync(Path.Combine(root, $"field-failed-{size.Name}.png")); }
                    catch (Exception captureError) { Log("Failed Field evidence screenshot: " + captureError.Message); }
                    throw new InvalidOperationException("Real Field toolbar/canvas geometry or physical region evidence failed in " + size.Name + ": " + fieldState);
                }
                await Task.Delay(180);
                await CaptureCdpPngAsync(Path.Combine(root, $"field-{size.Name}.png"));

                var dataState = await _web.CoreWebView2.ExecuteScriptAsync(
                    """
                    (() => {
                      document.getElementById('flRibbonTab-data')?.click();
                      const panel=document.getElementById('fieldViewPanel');
                      const compare=document.getElementById('flDataComparisonCard');
                      const tools=['flRaDataTimeSeries','flRaDataProfiles','flRaDataLogs','flRaCatalog','flRaDataCompare'];
                      const own=tools.every(id=>!!document.getElementById(id));
                      const fieldRect=panel?.getBoundingClientRect();
                      const fieldHidden=!fieldRect||fieldRect.width<1||getComputedStyle(panel).display==='none';
                      const chart=document.getElementById('chartViewport');
                      const rect=chart?.getBoundingClientRect();
                      const ok=own&&!!compare&&!!chart&&!!rect&&rect.width>180&&
                        fieldHidden&&!chart.contains(panel);
                      return {ok,viewport:innerWidth,dataTools:tools.length,fieldHidden,
                        chartWidth:rect?.width,chartHeight:rect?.height,comparisonCard:!!compare};
                    })()
                    """);
                if (!JsonDocument.Parse(dataState).RootElement.GetProperty("ok").GetBoolean())
                    throw new InvalidOperationException("Real Data scientific 2D surface evidence failed in " + size.Name + ": " + dataState);
                await Task.Delay(140);
                await CaptureCdpPngAsync(Path.Combine(root, $"data-{size.Name}.png"));
                Log("FoamLens real Data/Field screenshot geometry passed: field=" + fieldState + " data=" + dataState);
                // GRANADA G58: inspect the actual native Data > Time Series workspace
                // with the original private B13 imported (not a synthetic DOM).
                // Only primitive booleans are retained; the real screenshot stays
                // inside the disposable Windows QA runner, never uploaded.
                var t2Geometry = await _web.CoreWebView2.ExecuteScriptAsync(
                    """
                    (() => {
                      document.getElementById('flRaDataTimeSeries')?.click();
                      const el=id=>document.getElementById(id);
                      const panel=el('timeSeriesControls');
                      const existing=el('gr176ExistingCard'),history=el('gr176HistoryCard');
                      const first=el('fwTsCase1'),region=el('fwTsRegion1'),
                        variable=el('fwTsField1'),component=el('fwTsComponent1');
                      const secondary=el('fwTsCase2'),enable2=el('fwTsEnable2');
                      const build=el('fwBuildFieldHistories'),cancel=el('gr176Cancel');
                      const chart=el('chartViewport'),catalog=el('tsdSourceFieldCount');
                      const rect=node=>node?.getBoundingClientRect();
                      const visible=node=>{
                        const r=rect(node),style=node?getComputedStyle(node):null;
                        return !!r&&r.width>0&&r.height>0&&
                          style.display!=='none'&&style.visibility!=='hidden';
                      };
                      const historyRect=rect(history),existingRect=rect(existing),
                        chartRect=rect(chart),buildRect=rect(build);
                      const visibleSources=!!first&&!!region&&!!variable&&!!component&&
                        !!secondary&&!!enable2&&
                        [first,region,variable,component,secondary,enable2].every(visible);
                      const realOriginalField=!!variable&&
                        Array.from(variable.options||[]).some(option=>option.value==='T');
                      const originalCatalog=!!catalog&&/OpenFOAM/.test(catalog.textContent||'');
                      const noHorizontalOverflow=!!history&&
                        history.scrollWidth<=history.clientWidth+3&&
                        (!panel||panel.scrollWidth<=panel.clientWidth+3);
                      const properSurfaces=!!history&&!!existing&&
                        history.contains(build)&&history.contains(cancel)&&
                        existing.contains(el('timeSeriesVariable'));
                      const ok=!!panel&&visible(panel)&&
                        visible(panel)&&
                        properSurfaces&&visible(history)&&visible(existing)&&
                        visible(build)&&visible(cancel)&&visible(chart)&&
                        visibleSources&&realOriginalField&&originalCatalog&&
                        buildRect.width>=90&&chartRect.width>180&&
                        historyRect.width>180&&existingRect.width>180&&
                        noHorizontalOverflow&&!!cancel.disabled;
                      return{ok,timeSeriesDataView:visible(panel),
                        properSurfaces,visibleSources,realOriginalField,
                        originalCatalog,noHorizontalOverflow,buildVisible:visible(build),
                        cancelVisible:visible(cancel),chartVisible:visible(chart),
                        cancelIdleDisabled:!!cancel?.disabled,
                        sourcePanels:document.querySelectorAll('#gr176HistoryCard .fwTsSeries').length,
                        chartWideEnough:!!chartRect&&chartRect.width>180,
                        historyWideEnough:!!historyRect&&historyRect.width>180};
                    })()
                    """);
                using var t2Checked = JsonDocument.Parse(t2Geometry);
                if (!t2Checked.RootElement.GetProperty("ok").GetBoolean())
                {
                    // G59: source/private OpenFOAM values stay out of public CI logs.
                    // Report only allowlisted rendered-DOM booleans and source slot count,
                    // so the actual native failing condition is independently diagnosable.
                    var safeKeys = new[] { "timeSeriesDataView", "properSurfaces",
                        "visibleSources", "realOriginalField", "originalCatalog",
                        "noHorizontalOverflow", "buildVisible", "cancelVisible",
                        "chartVisible", "cancelIdleDisabled", "chartWideEnough",
                        "historyWideEnough" };
                    var safeBits = new List<string>();
                    foreach (var key in safeKeys)
                    {
                        if (t2Checked.RootElement.TryGetProperty(key, out var bit) &&
                            (bit.ValueKind == JsonValueKind.True || bit.ValueKind == JsonValueKind.False))
                            safeBits.Add(key + "=" + bit.GetBoolean().ToString().ToLowerInvariant());
                    }
                    if (t2Checked.RootElement.TryGetProperty("sourcePanels", out var slots) &&
                        slots.ValueKind == JsonValueKind.Number && slots.TryGetInt32(out var slotCount) &&
                        slotCount >= 0 && slotCount <= 2)
                        safeBits.Add("sourcePanels=" + slotCount);
                    throw new InvalidOperationException(
                        "G58 actual packaged Time Series controls/layout contract failed at " +
                        size.Name + " (source values withheld); sanitized visual checks: " + string.Join("; ", safeBits));
                }
                await Task.Delay(150);
                await CaptureCdpPngAsync(Path.Combine(root, $"time-series-{size.Name}.png"));
                Log("G58 original native B13 Time Series layout and source-controls passed at " +
                    size.Name + ": original chart, real T field, two slots, Build and Cancel visible.");
                // G72: record additional genuine workspace screenshots only
                // after real QuickCup source/time/regions and G58 have passed.
                await CaptureGranadaG72NativeTabsAsync(root, size.Name);
            }
        }
        finally
        {
            await _web.CoreWebView2.CallDevToolsProtocolMethodAsync("Emulation.clearDeviceMetricsOverride", "{}");
            await _web.CoreWebView2.ExecuteScriptAsync("document.getElementById('flRibbonTab-field')?.click()");
        }
    }


    // G72: actual packaged original B13 Windows runtime, never a mock screenshot.
    // Analysis/Review/Live are real source-owned workspaces; Field Compare
    // requires the original TWO A/B 3D canvases, not a 3D+2D split proxy.
    // This audit is at CSS wide/compact only. It never claims physical OS DPI,
    // scientific accuracy, 36/36 human review or a release authorization.
    private async Task CaptureGranadaG72NativeTabsAsync(string root, string sizeName)
    {
        var tabs = new[] { "field-compare", "analysis", "review", "live" };
        try
        {
            foreach (var tab in tabs)
            {
                var js = """
                    (() => {
                      const key=__G72_TAB__,el=id=>document.getElementById(id);
                      const visible=node=>{
                        const r=node?.getBoundingClientRect(),s=node?getComputedStyle(node):null;
                        return !!r&&r.width>25&&r.height>8&&s?.display!=='none'&&
                          s?.visibility!=='hidden'&&!node?.classList.contains('hidden');
                      };
                      try{
                        if(key==='field-compare'){
                          el('flRibbonTab-field')?.click();
                          window.FoamLensFieldWorkspace?.setLayout?.('3d');
                          const check=el('fcEnabled');
                          if(check&&!check.checked){
                            check.checked=true;check.dispatchEvent(new Event('change',{bubbles:true}));
                          }
                        }else if(key==='analysis'){
                          el('flRibbonTab-analysis')?.click();
                        }else{
                          el('flRibbonTab-home')?.click();
                          el(key==='review'?'flRaReview':'flRaLive')?.click();
                        }
                        const mode=key==='field-compare'?'field':key;
                        const modeOk=!!document.body.classList.contains('appMode-'+mode)&&
                          typeof activeAppMode!=='undefined'&&activeAppMode===mode;
                        const nav=key==='field-compare'?el('flRibbonTab-field'):
                          key==='analysis'?el('flRibbonTab-analysis'):
                          el(key==='review'?'flRaReview':'flRaLive');
                        const navOk=!!nav&&!nav.disabled;
                        const panel=key==='field-compare'?el('fieldViewPanel'):
                          key==='analysis'?el('flRibbonPanel-analysis'):
                          el(key==='review'?'reviewSurface':'liveSurface');
                        const panelRect=panel?.getBoundingClientRect();
                        const panelOk=visible(panel)&&panelRect.width>100&&panelRect.height>90;
                        const first=key==='field-compare'?el('fcViewGrid')?.querySelector('.fvViewport:not(.fcViewport)'):
                          key==='analysis'?el('flRibbonTab-analysis'):
                          el(key==='review'?'reviewTitle':'liveTitle');
                        const secondary=key==='field-compare'?el('fcViewport'):
                          key==='analysis'?el('flRibbonPanel-analysis'):
                          el(key==='review'?'reviewTabAuditor':'liveChooseFolder');
                        const controlsOk=visible(first)&&visible(secondary);
                        const actualCompare=key!=='field-compare'||(
                          el('fcEnabled')?.checked===true&&
                          window.FoamLensFieldCompare?.isEnabled?.()===true&&
                          panel?.classList.contains('fcCompareMode')&&
                          !secondary?.classList.contains('hidden')&&
                          visible(el('fvCanvas'))&&visible(el('fcCanvas'))&&
                          el('fvCanvas').getBoundingClientRect().width>100&&
                          el('fcCanvas').getBoundingClientRect().width>100);
                        return {ok:modeOk&&navOk&&panelOk&&controlsOk&&actualCompare,
                          modeOk,navOk,panelOk,controlsOk,actualCompare};
                      }catch{
                        // No private DOM text, case paths, simulation numbers,
                        // original scientific fields or JS exception strings.
                        return{ok:false,modeOk:false,navOk:false,panelOk:false,
                          controlsOk:false,actualCompare:false}
                      }
                    })()
                    """.Replace("__G72_TAB__", JsonSerializer.Serialize(tab));
                var result = await _web.CoreWebView2.ExecuteScriptAsync(js);
                using var report = JsonDocument.Parse(result);
                var state = report.RootElement;
                var keys = new[] { "modeOk", "navOk", "panelOk", "controlsOk", "actualCompare" };
                var checks = keys.Select(key =>
                    key + "=" + (state.TryGetProperty(key, out var bit) &&
                        bit.ValueKind == JsonValueKind.True).ToString().ToLowerInvariant());
                if (!state.TryGetProperty("ok", out var ok) || ok.ValueKind != JsonValueKind.True)
                    throw new InvalidOperationException(
                        "G72 original native " + tab + "/" + sizeName +
                        " did not satisfy visible workspace/3D comparison contract; " +
                        string.Join("; ", checks));
                // Native host screenshot; never generate or copy substitute
                // panel images and never store a synthetic runtime fallback.
                await Task.Delay(220);
                await CaptureCdpPngAsync(Path.Combine(root, $"{tab}-{sizeName}.png"));
                Log("G72 native original QuickCup workspace screenshot captured: " + tab + "/" + sizeName);
            }
        }
        finally
        {
            await _web.CoreWebView2.ExecuteScriptAsync(
                "(()=>{const c=document.getElementById('fcEnabled');" +
                "if(c?.checked){c.checked=false;c.dispatchEvent(new Event('change',{bubbles:true}))}" +
                "document.getElementById('flRibbonTab-field')?.click();return true})()");
        }
    }

    private async Task CaptureCdpPngAsync(string fullPath)
    {
        var response = await _web.CoreWebView2.CallDevToolsProtocolMethodAsync(
            "Page.captureScreenshot", "{\"format\":\"png\",\"captureBeyondViewport\":false}");
        using var json = JsonDocument.Parse(response);
        var png = Convert.FromBase64String(json.RootElement.GetProperty("data").GetString() ?? "");
        if (png.Length < 10_000) throw new InvalidOperationException("Rendered branding PNG evidence is unexpectedly small: " + fullPath);
        await File.WriteAllBytesAsync(fullPath, png);
    }

#if FOAMLENS_DEVELOPER
    // Real packaged WebView2 proof: Developer overlay must exist in the
    // independently compiled app. A static bundle check cannot prove that.
    private async Task RunDeveloperAuditSmokeAsync()
    {
        var complete = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);
        void NavDone(object? _, CoreWebView2NavigationCompletedEventArgs e)
        {
            complete.TrySetResult(e.IsSuccess);
        }
        _web.CoreWebView2.NavigationCompleted += NavDone;
        try
        {
            _web.CoreWebView2.Navigate("https://foamlens.local/index.html?desktop=1");
            if (!await complete.Task.WaitAsync(TimeSpan.FromSeconds(35)))
                throw new InvalidOperationException("Developer audit WebView2 navigation failed.");
            await Task.Delay(350);
            var report = await _web.CoreWebView2.ExecuteScriptAsync(
                """
                (() => {
                  const audit=window.__foamLensDeveloperAudit;
                  const button=document.getElementById('flDeveloperAuditToggle');
                  const panel=document.getElementById('flDeveloperAuditPanel');
                  if(!audit||!button||!panel)return {ok:false,reason:'Developer panel is missing'};
                  button.click();
                  audit.event('developer-smoke','Sanitized developer audit smoke event','info','self-test');
                  const section=document.getElementById('launchTitle')||document.getElementById('flRibbon');
                  const selected=section?audit.chooseElement(section):null;
                  const input=document.getElementById('fldaComment');
                  if(input)input.value='Developer smoke: verify this exact section stays linked to its comment.';
                  document.getElementById('fldaSave')?.click();
                  const check=audit.runChecks(),prompt=audit.prompt(),json=audit.snapshot();
                  const note=json.sectionAnnotations?.[0];
                  return {ok:panel.classList.contains('open')&&
                    typeof audit.downloadDeveloperAudit==='function'&&
                    !!document.getElementById('fldaPick')&&
                    selected?.selector===note?.selector&&
                    note?.comment==='Developer smoke: verify this exact section stays linked to its comment.'&&
                    prompt.includes('DOM target selector: '+note.selector)&&
                    prompt.includes(note.comment)&&
                    prompt.includes('AI debugging request')&&
                    json.observedErrors.some(e=>e.kind==='developer-smoke')&&
                    check.status!=='not-inspected',
                    panel:panel.classList.contains('open'),errorCount:json.observedErrors.length,
                    annotations:json.sectionAnnotations?.length,annotationSection:note?.section,
                    status:check.status};
                })()
                """);
            using var json = JsonDocument.Parse(report);
            if (!json.RootElement.TryGetProperty("ok", out var ok) || !ok.GetBoolean())
                throw new InvalidOperationException("FoamLens Developer real WebView2 smoke failed: " + report);
            SmokeTestExitCode = 0;
            Log("Developer edition real WebView2 audit and sanitized prompt smoke passed: " + report);
            BeginInvoke(Close);
        }
        finally
        {
            _web.CoreWebView2.NavigationCompleted -= NavDone;
        }
    }
#endif

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
            // The Mesh & Geometry Auditor is a public scientific report
            // inspector, separate from the private Developer software auditor.
            // Confirm that the *packaged* frontend loaded it into WebView2.
            var meshAuditSurfaceJson = await _web.CoreWebView2.ExecuteScriptAsync(
                """
                (() => {
                  const api=window.FoamLensMeshAuditor;
                  const panel=document.getElementById('maPanel');
                  if(!api||!panel)return{ok:false,reason:'Mesh report inspector is not mounted'};
                  const report=api.parse([
                    'Exec : checkMesh -allTopology -allGeometry',
                    'Mesh stats',
                    ' points: 4',
                    ' faces: 4',
                    ' cells: 1',
                    'Mesh OK.'
                  ].join('\n'),'CI-smoke-checkMesh.log');
                  const ok=report.recognized&&report.status==='reported-ok'&&
                    report.metrics.cells.value===1&&
                    report.metrics.minVolume.value===null&&
                    panel.querySelector('#maAnalyze')!==null&&
                    panel.querySelector('#maExport')!==null;
                  return{ok,status:report.status,cellCount:report.metrics.cells.value,
                    missingVolume:report.metrics.minVolume.status};
                })()
                """);
            using (var auditJson = JsonDocument.Parse(meshAuditSurfaceJson))
            {
                if (!auditJson.RootElement.TryGetProperty("ok", out var ok) || !ok.GetBoolean())
                    throw new InvalidOperationException(
                        "FoamLens scientific checkMesh inspector packaged WebView2 smoke failed: " +
                        meshAuditSurfaceJson);
            }
            Log("FoamLens checkMesh scientific report inspector WebView2 smoke passed: " +
                meshAuditSurfaceJson);


            // Confirm the CAD surface inspector is usable inside the real packaged WebView2.
            // STL surfaces have no implied physical units, and are not volume meshes.
            var cadSurfaceJson = await _web.CoreWebView2.ExecuteScriptAsync(
                """
                (() => {
                  const api=window.FoamLensCadSurface,launch=document.getElementById('cgLaunch'),
                    nav=document.getElementById('cgNav'),
                    panel=document.getElementById('cgShell'),canvas=document.getElementById('cgCanvas');
                  if(!api||!launch||!nav||!panel||!canvas)return{ok:false,reason:'CAD inspector not mounted'};
                  const obj=api.parseObj('v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3','native-smoke.obj');
                  const sum=api.summarize(obj.triangles);
                  const ascii=api.exportAsciiStl(obj.triangles,'native-smoke',.001);
                  const stl=api.parseStl(new TextEncoder().encode(ascii).buffer,'native-smoke.stl');
                  const exportBtn=document.getElementById('cgExportStl');
                  nav.click();
                  const opened=!panel.hidden&&canvas.getBoundingClientRect().width>200;
                  panel.querySelector('#cgClose')?.click();
                  const closed=panel.hidden;
                  const ok=opened&&closed&&sum.triangles===1&&sum.boundaryEdges===3&&
                    sum.enclosedVolumeEstimate===null&&sum.bounds.size[0]===1&&
                    stl.triangles.length===1&&api.unitScale('unknown')===null&&
                    exportBtn?.disabled===true;
                  return{ok,format:stl.format,triangles:sum.triangles,unitUnconfirmed:exportBtn?.disabled};
                })()
                """);
            using (var cadJson = JsonDocument.Parse(cadSurfaceJson))
            {
                if (!cadJson.RootElement.TryGetProperty("ok", out var ok) || !ok.GetBoolean())
                    throw new InvalidOperationException(
                        "FoamLens CAD surface packaged WebView2 smoke failed: " + cadSurfaceJson);
            }
            Log("FoamLens CAD STL/OBJ WebView2 smoke passed: " + cadSurfaceJson);

            // Granada #154: the actual packaged WebView2 must expose scientific
            // observable comparison, without pretending that 2D/3D meshes match.
            var equivalentObservableJson = await _web.CoreWebView2.ExecuteScriptAsync(
                """
                (() => {
                  const api=window.FoamLensEquivalentObservables, panel=document.getElementById('eoPanel');
                  if(!api||!panel)return{ok:false,reason:'2D/3D comparator did not mount'};
                  const sample=(caseId,unit,y)=>({
                    datasetType:'timeseries',caseId,caseName:'CI '+caseId,
                    sourcePath:'postProcessing/probes/0/T',field:{canonical:'T',unit,dimensions:'[0 0 0 1 0 0 0]'},
                    t:[0,1,2],y
                  });
                  const r=api.compare(sample(1,'K',[300,310,320]),sample(2,'K',[301,311,321]),{
                    observable:'matched test temperature',basis:'physical-point',
                    mapping:'CI synthetic matching physical location metadata only',
                    confirmed:true
                  });
                  const denied=api.compare(sample(1,'K',[300,310,320]),sample(2,'W',[1,2,3]),{
                    observable:'invalid physical units',basis:'physical-point',
                    mapping:'CI synthetic location equivalence guard',
                    confirmed:true
                  });
                  const open=panel.querySelector('#eoCalculate')!==null&&
                    panel.querySelector('#eoSource2d')!==null&&
                    panel.querySelector('#eoSource3d')!==null;
                  return{ok:open&&r.valid&&r.metrics.n===3&&
                    Math.abs(r.metrics.bias3dMinus2d-1)<1e-10&&
                    r.methods.noFieldSubtraction===true&&r.methods.noExtrapolation===true&&
                    denied.valid===false,
                    mounted:open,valid:r.valid,points:r.metrics?.n||0,invalidRejected:!denied.valid};
                })()
                """);
            using (var observableJson = JsonDocument.Parse(equivalentObservableJson))
            {
                if (!observableJson.RootElement.TryGetProperty("ok", out var ok) || !ok.GetBoolean())
                    throw new InvalidOperationException(
                        "FoamLens Granada equivalent-observables native WebView2 smoke failed: " +
                        equivalentObservableJson);
            }
            Log("FoamLens Granada equivalent-observables WebView2 smoke passed: " +
                equivalentObservableJson);

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

            // A loaded SVG is not visual acceptance. Validate the actual WebView2
            // computed geometry and text contrast in both supported color schemes.
            var launchBrandVisualJson = await _web.CoreWebView2.ExecuteScriptAsync(
                """
                (()=>{
                  const screen=document.getElementById('launchScreen');
                  const mark=document.getElementById('launchOfficialLogo');
                  const title=document.getElementById('launchTitle');
                  const subtitle=document.getElementById('launchSubtitle');
                  const eyebrow=document.getElementById('launchEyebrow');
                  const identity=document.querySelector('#launchScreen .launchIdentity');
                  const hero=document.querySelector('#launchScreen .launchHero');
                  const brand=document.querySelector('#launchScreen .launchMark');
                  const description=document.getElementById('launchCopy');
                  const actionRow=document.querySelector('#launchScreen .launchActions');
                  const privacy=document.querySelector('#launchScreen .launchPrivacy');
                  const capabilities=document.querySelector('#launchScreen .launchCapabilities');
                  const actions=['launchFolder','launchFiles','launchWorkspace'].map(id=>document.getElementById(id));
                  const rgb=v=>{const m=String(v||'').match(/rgba?\((\d+)[, ]+(\d+)[, ]+(\d+)/);return m?[Number(m[1]),Number(m[2]),Number(m[3])]:null};
                  const lum=c=>{if(!c)return 0;const a=c.map(x=>{const n=x/255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4});return a[0]*.2126+a[1]*.7152+a[2]*.0722};
                  const contrast=(a,b)=>{const x=lum(a),y=lum(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
                  const originalDark=document.body.classList.contains('dark');
                  const measure=dark=>{
                    document.body.classList.toggle('dark',dark);
                    const ir=mark?.getBoundingClientRect(),tr=title?.getBoundingClientRect();
                    const br=brand?.getBoundingClientRect(),er=eyebrow?.getBoundingClientRect(),hr=hero?.getBoundingClientRect();
                    const minLogo=Math.min(240,Math.max(180,innerWidth*.18));
                    const centerOf=r=>r?(r.left+r.right)/2:NaN;
                    const drift=[brand,eyebrow,title,subtitle,description,actionRow,privacy,capabilities].map(el=>Math.abs(centerOf(el?.getBoundingClientRect())-centerOf(hr)));
                    const centered=drift.every(d=>Number.isFinite(d)&&d<=12);
                    const base=dark?[7,17,29]:[247,251,255];
                    const texts=[title,subtitle,eyebrow].map(el=>contrast(rgb(getComputedStyle(el).color),base));
                    return{
                      theme:dark?'dark':'light',
                      markWidth:Number(ir?.width||0),markHeight:Number(ir?.height||0),centerDrift:drift,
                      titleWidth:Number(tr?.width||0),
                      contrast:texts,
                      pass:!!screen&&!!identity&&!!hero&&!!brand&&!!mark&&!!title&&
                        mark.complete&&mark.naturalWidth>0&&
                        mark.getAttribute('src')==='assets/branding/official-mark.svg'&&
                        Number(ir?.width||0)>=minLogo&&Number(ir?.height||0)>=105&&centered&&
                        Number(tr?.width||0)>100&&
                        Number(ir?.bottom||0)<=Number(er?.top||0)+2&&
                        texts.every(v=>v>=4.5)&&
                        actions.every(el=>el&&el.getBoundingClientRect().width>0)&&
                        document.querySelectorAll('#launchScreen h1').length===1&&
                        identity.contains(title)&&identity.contains(mark)
                    }
                  };
                  let themes;
                  try{themes=[measure(true),measure(false)]}
                  finally{document.body.classList.toggle('dark',originalDark)}
                  return{ok:themes.every(x=>x.pass),themes,viewport:{width:innerWidth,height:innerHeight}};
                })()
                """);
            using (var launchBrandVisual = JsonDocument.Parse(launchBrandVisualJson))
            {
                if (!launchBrandVisual.RootElement.TryGetProperty("ok", out var visualOk) || !visualOk.GetBoolean())
                    throw new InvalidOperationException(
                        $"FoamLens rendered launch brand geometry/contrast is invalid: {launchBrandVisualJson}");
            }
            Log($"FoamLens visual launch contract passed (computed WebView2 dark/light): {launchBrandVisualJson}");

            // Capture the actual launch surface before navigating to scientific
            // workspace smoke. This is candidate-SHA evidence for visual review.
            var launchScreenshotPath = Environment.GetEnvironmentVariable("FOAMLENS_SMOKE_LAUNCH_SCREENSHOT");
            if (!string.IsNullOrWhiteSpace(launchScreenshotPath))
            {
                var fullPath = Path.GetFullPath(launchScreenshotPath);
                var folder = Path.GetDirectoryName(fullPath);
                if (!string.IsNullOrWhiteSpace(folder)) Directory.CreateDirectory(folder);
                await using (var imageFile = new FileStream(fullPath, FileMode.Create, FileAccess.Write, FileShare.None))
                {
                    await _web.CoreWebView2.CapturePreviewAsync(
                        CoreWebView2CapturePreviewImageFormat.Png, imageFile);
                    await imageFile.FlushAsync();
                }
                if (new FileInfo(fullPath).Length < 10_000)
                    throw new InvalidOperationException("FoamLens rendered launch screenshot is missing or unexpectedly small.");
                Log($"FoamLens rendered launch screenshot captured for visual review: {fullPath}");
            }



            await CaptureRenderedBrandEvidenceAsync();

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

            // Native product separation contract: Data owns only 2D time series,
            // spatial profiles, solver logs, catalog and curve differences.
            // Field is initialized outside the Data subtree, not CSS-hidden there.
            var dataOwnershipJson = await _web.CoreWebView2.ExecuteScriptAsync(
                """
                (()=>{
                  try {
                  // Drive the exact same Ribbon navigation a user can click. The
                  // app's setAppMode is intentionally private inside its IIFE.
                  const activate=key=>{
                    const button=document.getElementById('flRibbonTab-'+key);
                    if(!button)throw new Error('Missing Ribbon tab: '+key);
                    button.click();
                  };
                  const fieldControls=document.getElementById('fieldViewControls');
                  const fieldPanel=document.getElementById('fieldViewPanel');
                  const fieldCompare=document.getElementById('fcPanel');
                  const originalRoot=document.getElementById('flFieldBootstrapHost');
                  const loadCard=document.getElementById('countBadge')?.closest('.card');
                  const dataCompareCard=document.getElementById('flDataComparisonCard');
                  const dataCompareHost=document.getElementById('flDataComparisonHost');
                  const dataDifference=document.getElementById('differenceTools');
                  const analysisCard=document.getElementById('flAnalysisInspectorCard');
                  const checks={
                    fieldOwnedRoot:!!originalRoot&&originalRoot.dataset.foamlensOwner==='field',
                    fieldControlsNotInsideData:!!fieldControls&&!loadCard?.contains(fieldControls),
                    fieldCanvasNotInsideData:!!fieldPanel&&!document.getElementById('chartViewport')?.contains(fieldPanel),
                    fieldCompareNotInsideData:!!fieldCompare&&!loadCard?.contains(fieldCompare),
                    dataDifferenceOwnedByData:!!dataCompareCard&&dataCompareCard.dataset.foamlensOwner==='data'&&!!dataCompareHost&&dataCompareHost.contains(dataDifference),
                    dataDifferenceNotInsideAnalysis:!!analysisCard&&!analysisCard.contains(dataDifference),
                    profileControlsPreserved:!!document.getElementById('profileLine')&&!!document.getElementById('profileTime'),
                    logControlsPreserved:!!document.getElementById('logFamily'),
                    timeSeriesControlsPreserved:!!document.getElementById('timeSeriesVariable'),
                    secondTimeSeriesVariablePreserved:!!document.getElementById('timeSeriesVariable2'),
                    dataNavigationComplete:['flRaDataTimeSeries','flRaDataProfiles','flRaDataLogs','flRaCatalog','flRaDataCompare'].every(id=>!!document.getElementById(id))
                  };
                  activate('data');
                  const afterData={
                    loadUnchanged:!!loadCard&&!loadCard.contains(fieldControls)&&!loadCard.contains(fieldCompare),
                    chartUnchanged:!document.getElementById('chartViewport')?.contains(fieldPanel),
                    dataCompareExists:!!document.getElementById('flDataComparisonCard')
                  };
                  activate('field');
                  const fieldHost=document.getElementById('fw3DControlsHost');
                  const fieldCanvasHost=document.getElementById('fw3DHost');
                  const afterField={
                    controlsInField:!!fieldHost&&fieldHost.contains(fieldControls),
                    canvasInField:!!fieldCanvasHost&&fieldCanvasHost.contains(fieldPanel),
                    compareInField:!!fieldHost&&fieldHost.contains(fieldCompare)
                  };
                  activate('data');
                  const afterReturn={
                    controlsStillField:!!fieldHost&&fieldHost.contains(fieldControls)&&!loadCard.contains(fieldControls),
                    canvasStillField:!!fieldCanvasHost&&fieldCanvasHost.contains(fieldPanel),
                    compareStillField:!!fieldHost&&fieldHost.contains(fieldCompare)&&!loadCard.contains(fieldCompare),
                    data2DStillData:!!dataCompareHost&&dataCompareHost.contains(dataDifference)
                  };
                  activate('home');
                  return {pass:[...Object.values(checks),...Object.values(afterData),...Object.values(afterField),...Object.values(afterReturn)].every(Boolean),
                    checks,afterData,afterField,afterReturn};
                  } catch (error) {
                    return {pass:false,error:String(error?.message||error),stack:String(error?.stack||''),
                      currentMode:typeof activeAppMode==='string'?activeAppMode:null,
                      documentReady:document.readyState,
                      fieldRoot:!!document.getElementById('flFieldBootstrapHost'),
                      fieldSurface:!!document.getElementById('fieldSurface'),
                      ribbonReady:document.body.classList.contains('flRibbonReady')};
                  }
                })()
                """);
            using (var dataOwnership = JsonDocument.Parse(dataOwnershipJson))
            {
                if (dataOwnership.RootElement.ValueKind != JsonValueKind.Object ||
                    !dataOwnership.RootElement.TryGetProperty("pass", out var ownershipPassed) || !ownershipPassed.GetBoolean())
                    throw new InvalidOperationException(
                        $"FoamLens Data 2D vs Field 3D ownership smoke failed: {dataOwnershipJson}");
            }
            Log($"FoamLens Data/Field lifecycle and plotting navigation ownership verified: {dataOwnershipJson}");

            var ribbonUiJson = await _web.CoreWebView2.ExecuteScriptAsync(
                """
                (()=>{
                  const tabs=['home','data','field','analysis','export','view'];
                  const missingTabs=tabs.filter(x=>!document.getElementById('flRibbonTab-'+x)||!document.getElementById('flRibbonPanel-'+x));
                  const requiredActions=['flRaOpenFolder','flRaCases','flRaCatalog','flRaDataProfiles','flRaDataTimeSeries','flRaDataLogs','flRaDataCompare','flRaFieldWorkspace','flRaInspector','flRaProbe','flRaDifference','flRaCompare3D','flRaExportPng','flRaTheme','aboutDeveloperBtn','flGlobalUpdates',...['Iso','Front','Back','Left','Right','Top','Bottom'].map(name=>'flRaQuick'+name)];
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
                  // A persisted or legacy Profile request must not resurrect Data plots in Field.
                  window.FoamLensFieldWorkspace?.setView?.('profile');
                  const contextRejectsLegacyProfile=!!contextHost&&getComputedStyle(contextHost).display==='none'&&
                    window.FoamLensFieldWorkspace?.getState?.().view==='3d'&&
                    internalTabs.length===1&&internalTabs[0]==='3d';
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
                    contextRejectsLegacyProfile,
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
                    !root.TryGetProperty("contextRejectsLegacyProfile", out var contextRejectsLegacyProfileNode) || !contextRejectsLegacyProfileNode.GetBoolean())
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

            // Run real WebView2 geometry/interaction checks for the compact
            // Field command surface: responsive wrapping is valid, overlap is not.
            // A green static test is not visual acceptance.
            var fieldCompactUiJson = await _web.CoreWebView2.ExecuteScriptAsync(
                """
                (()=>{
                  document.getElementById('flRibbonTab-field')?.click();
                  const ribbon=document.getElementById('flRibbonPanel-field');
                  const shelf=document.getElementById('flFieldContextShelf');
                  const tabs=document.getElementById('flFieldContextTabs');
                  const caseHost=document.getElementById('fw3DViewCases');
                  const a=document.getElementById('fvCase'),b=document.getElementById('fcCase');
                  const secondary=document.getElementById('fcViewport');
                  const compare=document.getElementById('fcEnabled');
                  const compareRuntimeEnabled=window.FoamLensFieldCompare?.isEnabled?.();
                  const tools=document.querySelector('.fvViewTools');
                  const bounds=ribbon?.getBoundingClientRect();
                  const checks={
                    fieldActive:document.body.classList.contains('appMode-field'),
                    nonOverlappingRows:(()=>{
                      if(!ribbon||!bounds)return false;
                      const parts=[...ribbon.children].filter(el=>{
                        const r=el.getBoundingClientRect();
                        return getComputedStyle(el).display!=='none'&&r.width>0&&r.height>0
                      });
                      const inside=parts.every(el=>{const r=el.getBoundingClientRect();return r.left>=bounds.left-2&&r.right<=bounds.right+2&&r.top>=bounds.top-2&&r.bottom<=bounds.bottom+2});
                      const overlap=(a,b)=>Math.min(a.right,b.right)-Math.max(a.left,b.left)>2&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>2;
                      return inside&&parts.every((el,i)=>parts.slice(i+1).every(other=>!overlap(el.getBoundingClientRect(),other.getBoundingClientRect())))
                    })(),
                    noClippedPrimaryRow:!!ribbon&&ribbon.scrollWidth<=ribbon.clientWidth+8,
                    subbarsInitiallyClosed:!!shelf&&shelf.classList.contains('hidden'),
                    caseSelectorsIndependent:!!caseHost&&caseHost.contains(a)&&caseHost.contains(b)&&a!==b,
                    addViewVisible:(()=>{const el=document.getElementById('fwAdd3DViewVisible');return !!el&&el.getBoundingClientRect().width>65&&getComputedStyle(el).display!=='none'})(),
                    importCaseVisible:(()=>{const el=document.getElementById('fwImport3DCase');return !!el&&el.getBoundingClientRect().width>65&&getComputedStyle(el).display!=='none'})(),
                    primaryViewPropertyVisible:(()=>{const el=document.querySelector('#fcViewGrid [data-fc-toolbar="A"] [data-fc-bind="Field"]');return !!el&&el.getBoundingClientRect().width>60})(),
                    primaryViewZoomVisible:(()=>{const bar=document.querySelector('#fcViewGrid [data-fc-toolbar="A"]');return !!bar&&['in','out'].every(dir=>bar.querySelector('[data-fc-zoom="'+dir+'"]')?.getBoundingClientRect().width>=28)&&!!bar.querySelector('.fcMoveHandle[draggable="true"]')})(),
                    caseCanCompareItself:!!a&&!!b&&[...b.options].some(opt=>opt.value===a.value),
                    primarySelectorVisible:!!a&&a.getBoundingClientRect().width>30,
                    compareOffByDefault:!!compare&&!compare.checked&&compareRuntimeEnabled===false,
                    secondaryCaseHidden:!!b&&getComputedStyle(b.closest('.row2')).display==='none',
                    secondaryCanvasHidden:!!secondary&&getComputedStyle(secondary).display==='none',
                    cameraControlsDocked:!!tools&&tools.parentElement===shelf,
                    subbarsPresent:!!tabs&&tabs.querySelectorAll('button[data-fl-subbar]').length===3
                  };
                  const cameraTab=tabs?.querySelector('[data-fl-subbar="camera"]');
                  cameraTab?.click();
                  const iso=document.getElementById('flRaCameraIso'),front=document.getElementById('flRaCameraFront');
                  checks.cameraOpens=!!shelf&&!shelf.classList.contains('hidden')&&shelf.classList.contains('flCameraToolsActive');
                  checks.presetsVisible=!!iso&&!!front&&iso.getBoundingClientRect().width>=20&&front.getBoundingClientRect().width>=20;
                  // When compact, seven labeled camera presets must be reachable
                  // through the Camera subbar even if quick actions are hidden.
                  const namedMenu=shelf?.querySelector('.fvNavPresets');
                  if(namedMenu)namedMenu.open=true;
                  const namedPresets=[...(namedMenu?.querySelectorAll('[data-fv-view]')||[])];
                  checks.namedCameraMenu=!!namedMenu&&namedPresets.length===7&&
                    namedPresets.every(button=>/X|Y|Z/.test(button.textContent||'')&&
                      button.getBoundingClientRect().width>=60&&
                      getComputedStyle(button).display!=='none');
                  if(namedMenu)namedMenu.open=false;
                  cameraTab?.click();
                  checks.cameraCloses=!!shelf&&shelf.classList.contains('hidden');
                  return{ok:Object.values(checks).every(Boolean),checks,compareChecked:!!compare?.checked,compareRuntimeEnabled,compareUserRequested:window.FoamLensFieldWorkspace?.getState?.().compareUserRequested===true,ribbonHeight:bounds?.height||0,
                    ribbonWidth:ribbon?.clientWidth||0,ribbonScrollWidth:ribbon?.scrollWidth||0};
                })()
                """);
            using (var compactField = JsonDocument.Parse(fieldCompactUiJson))
            {
                if (!compactField.RootElement.TryGetProperty("ok", out var compactOk) || !compactOk.GetBoolean())
                    throw new InvalidOperationException(
                        $"FoamLens compact Field Ribbon/per-view selector runtime contract failed: {fieldCompactUiJson}");
            }
            Log($"FoamLens compact Field Ribbon and independent case selector smoke passed: {fieldCompactUiJson}");

            // Native geometry regression: the full-window chrome must NEVER resize
            // with the settings sidebar. Long comparison labels and values must live
            // beneath the WebGL scene, without overlapping its legend or geometry.
            var fieldShellGeometryJson = await _web.CoreWebView2.ExecuteScriptAsync(
                """
                (()=>{
                  document.getElementById('flRibbonTab-field')?.click();
                  const bar=document.getElementById('flRibbon'),header=document.querySelector('.main>.top'),
                    sidebar=document.querySelector('.sidebar'),toggle=document.getElementById('sidebarToggle'),
                    app=document.getElementById('appShell');
                  const rect=el=>el?.getBoundingClientRect();
                  const before=rect(bar),head=rect(header),side=rect(sidebar);
                  const checks={
                    fullWidthRibbon:!!before&&Math.abs(before.left)<2&&Math.abs(before.width-innerWidth)<3,
                    fullWidthHeader:!!head&&Math.abs(head.left)<2&&Math.abs(head.width-innerWidth)<3,
                    persistentProductHeader:(()=>{
                      const icon=document.getElementById('globalOfficialLogo'),
                        name=document.querySelector('.flGlobalProductName'),
                        about=document.getElementById('aboutDeveloperBtn'),
                        updates=document.getElementById('flGlobalUpdates');
                      return !!head&&[icon,name,about,updates].every(el=>{
                        const b=rect(el);return !!b&&b.width>=20&&b.height>=20&&
                          b.left>=head.left-2&&b.right<=head.right+2&&
                          b.top>=head.top-2&&b.bottom<=head.bottom+2
                      })&&name?.textContent?.trim()==='FoamLens'&&
                        !!about?.textContent?.trim()&&!!updates?.textContent?.trim()
                    })(),
                    controlsOutsideScientificCanvas:(()=>{
                      const viewport=document.querySelector('#fieldViewPanel .fvViewport'),
                        tools=document.querySelector('#flFieldContextShelf .fvViewTools'),
                        shelf=document.getElementById('flFieldContextShelf'),
                        ribbon=document.getElementById('flRibbon');
                      return !!viewport&&!!tools&&!!shelf&&!!ribbon&&
                        shelf.contains(tools)&&ribbon.contains(shelf)&&
                        !viewport.contains(tools)&&
                        !!document.getElementById('fvProbeMode')&&
                        !!document.getElementById('fvProbeClear')&&
                        tools.contains(document.getElementById('fvProbeMode'))&&
                        tools.contains(document.getElementById('fvProbeClear'))
                    })(),
                    sidebarBelowRibbon:!!side&&!!before&&side.top>=before.bottom-3,
                    sidebarNotOverHeader:!!side&&!!head&&side.top>=head.bottom-3,
                    chromeMeasured:!!app&&parseFloat(app.style.getPropertyValue('--flRibbonHeight'))>=60,
                    directCameraViews:(()=>{
                      // A compact 1024px ribbon intentionally moves duplicate
                      // quick camera actions into the labeled Camera shelf.
                      // Test actual reachability, not a hidden duplicate icon.
                      if(innerWidth>1200)return ['flRaQuickIso','flRaQuickFront','flRaQuickTop','flRaQuickRight'].every(id=>{
                        const el=document.getElementById(id),b=rect(el);
                        return !!el&&!!b&&b.width>=55&&getComputedStyle(el).display!=='none'&&
                          el.querySelector('.flRibbonLabel')?.getBoundingClientRect().width>=20
                      });
                      const tab=document.querySelector('#flFieldContextTabs [data-fl-subbar="camera"]');
                      if(!tab)return false;
                      const wasActive=tab.classList.contains('active');
                      if(!wasActive)tab.click();
                      const menu=document.querySelector('#flFieldContextShelf .fvNavPresets');
                      const previouslyOpen=!!menu?.open;if(menu)menu.open=true;
                      const views=[...(menu?.querySelectorAll('[data-fv-view]')||[])];
                      const valid=views.length===7&&views.every(button=>{
                        const b=rect(button);
                        return !!b&&b.width>=60&&getComputedStyle(button).display!=='none'&&
                          /X|Y|Z/.test(button.textContent||'')&&!!button.getAttribute('aria-label')
                      });
                      if(menu)menu.open=previouslyOpen;
                      if(!wasActive)tab.click();
                      return valid
                    })(),
                    typographyUniform:['flRaQuickIso','flRaQuickTop','flRaFieldWorkspace'].every(id=>{
                      const label=document.querySelector('#'+id+' .flRibbonLabel');
                      return !!label&&getComputedStyle(label).fontSize==='10px'
                    })
                  };
                  if(toggle){toggle.click();const after=rect(bar),product=rect(document.querySelector('.flGlobalIdentity')),
                    aboutRect=rect(document.getElementById('aboutDeveloperBtn')),
                    updatesRect=rect(document.getElementById('flGlobalUpdates'));
                    checks.sidebarToggleDoesNotResizeRibbon=!!after&&Math.abs(after.width-before.width)<3;
                    checks.sidebarCollapsePreservesBrandAndUtilities=!!app?.classList.contains('sidebarCollapsed')&&
                      !!product&&product.width>80&&!!aboutRect&&aboutRect.width>30&&
                      !!updatesRect&&updatesRect.width>30&&aboutRect.right<=innerWidth+2&&updatesRect.right<=innerWidth+2;
                    toggle.click()
                  }else {checks.sidebarToggleDoesNotResizeRibbon=false;checks.sidebarCollapsePreservesBrandAndUtilities=false;}

                  const compareToggle=document.getElementById('fcEnabled');
                  const originalCompare=!!compareToggle?.checked;
                  if(compareToggle){compareToggle.checked=true;compareToggle.dispatchEvent(new Event('change',{bubbles:true}))}
                  const label=document.getElementById('fcCompareLabel'),
                    secondary=document.getElementById('fcViewport'),
                    primary=document.getElementById('fcPrimaryLabel'),
                    extras=[3,4].map(id=>document.getElementById('fcExtra'+id+'Viewport'));
                  checks.all3DViewportsComposed=[secondary,primary?.closest('.fcComposedViewport'),...extras.filter(Boolean)]
                    .every(v=>!!v?.querySelector('.fcViewportScene')&&!!v.querySelector('.fcViewportCaption'));
                  checks.captionOwnsCompareLabel=label?.parentElement?.classList.contains('fcViewportCaption')===true;
                  checks.actualSecondViewVisible=!!secondary&&rect(secondary)?.width>=240&&getComputedStyle(secondary).display!=='none';
                  const sRect=rect(secondary?.querySelector('.fcViewportScene')),
                    caption=rect(secondary?.querySelector('.fcViewportCaption'));
                  checks.captionBelowScene=!!sRect&&!!caption&&caption.top>=sRect.bottom-2;
                  if(label){
                    const original=label.textContent;
                    label.textContent='B14_topFixedFlux_explicitRef /10/mold/T · exact · '
                      +'cases_controlled_buoyancy/'.repeat(7)+'t=10 seconds';
                    const lr=rect(label),cr=rect(label.parentElement),sr=rect(secondary?.querySelector('.fcViewportScene'));
                    checks.longLabelWrapsBelowScene=!!lr&&!!cr&&!!sr&&lr.top>=sr.bottom-2&&lr.right<=cr.right+3&&
                      getComputedStyle(label).overflowWrap==='anywhere';
                    label.textContent=original
                  }else checks.longLabelWrapsBelowScene=false;
                  const statsStyle=document.getElementById('fcStyles');
                  checks.responsiveNumericStats=!!statsStyle&&statsStyle.textContent.includes(
                    '.fcStatsCells{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))')&&
                    statsStyle.textContent.includes('overflow-wrap:anywhere;font-variant-numeric:tabular-nums');
                  const stats=document.getElementById('fcStatsGrid');
                  if(stats){
                    const originalHtml=stats.innerHTML,hidden=stats.classList.contains('hidden');
                    stats.classList.remove('hidden');
                    stats.innerHTML='<div class="fcStatsCard"><div class="fcStatsTitle">B14_topFixedFlux_explicitRef · T · mold</div><div class="fcStatsCells">'+
                      Array.from({length:7},(_,i)=>'<div><span>'+['Cells','Association','Min','Max','Δ','Mean','Selected'][i]+
                        '</span><b>1.416753420123456789e+12 kelvin per second</b></div>').join('')+
                      '</div></div><div class="fcStatsCard"><div class="fcStatsTitle">A · long case ID</div><div class="fcStatsCells">'+
                      '<div><span>Min</span><b>0.0000123456789012345 kelvin</b></div></div></div>';
                    const cells=[...stats.querySelectorAll('.fcStatsCells')];
                    checks.longStatsNoOverflow=stats.scrollWidth<=stats.clientWidth+3&&cells.every(grid=>{
                      const vals=[...grid.querySelectorAll('b')];return grid.scrollWidth<=grid.clientWidth+3&&
                        vals.every(val=>val.scrollWidth<=val.clientWidth+3)
                    });
                    stats.innerHTML=originalHtml;stats.classList.toggle('hidden',hidden)
                  }else checks.longStatsNoOverflow=false;
                  if(compareToggle){compareToggle.checked=originalCompare;compareToggle.dispatchEvent(new Event('change',{bubbles:true}))}
                  document.getElementById('flRibbonTab-data')?.click();
                  const loadCard=document.getElementById('countBadge')?.closest('.card');
                  checks.dataOwnsNo3D=!!loadCard&&!loadCard.contains(document.getElementById('fcPanel'))&&
                    !loadCard.contains(document.getElementById('fvAnimationPanel'));
                  checks.dataHasNativeTools=['flRaCatalog','flRaDataProfiles','flRaDataTimeSeries','flRaDataLogs','flRaDataCompare']
                    .every(id=>document.getElementById(id)?.getBoundingClientRect().width>=20);
                  document.getElementById('flRibbonTab-field')?.click();
                  return{ok:Object.values(checks).every(Boolean),checks,
                    headerHeight:head?.height||0,ribbonHeight:before?.height||0,
                    sidebarTop:side?.top||0,sidebarWidth:side?.width||0};
                })()
                """);
            using (var fieldShell = JsonDocument.Parse(fieldShellGeometryJson))
            {
                if (!fieldShell.RootElement.TryGetProperty("ok", out var fieldOk) || !fieldOk.GetBoolean())
                    throw new InvalidOperationException(
                        $"FoamLens field shell and compare long-label geometry failed: {fieldShellGeometryJson}");
            }
            Log($"FoamLens full-width Field shell and long-label scene/caption geometry smoke passed: {fieldShellGeometryJson}");

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
                    'fvAxisGizmo','fvProjectionOrtho','fvProjectionPerspective',
                    'fvShowDimensions','fvPhysicalAxes','fvMeshDimensions',
                    'fvMeasureTool','fvMeasureClear','fvMeasureInfo',
                    'fvRegionScaleDock','fvSecondaryScaleLegends',
                    'fvRangeMode','fvCacheLimit','fcEnabled','fcAddView',
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

                // Sample both our native host and the real WebView2 environment.
                // GetProcessInfos() belongs to the WebView2 user-data folder and
                // excludes Crashpad. Values are resident *process* memory, NOT
                // driver graphics-card VRAM or total machine memory.
                (long WorkingBytes, long PrivateBytes, int Observed, int Unreadable)
                    SampleWebView2Resident()
                {
                    var seen = new HashSet<int>();
                    long working = 0, privateBytes = 0;
                    var observed = 0;
                    var unreadable = 0;
                    foreach (var info in _web.CoreWebView2.Environment.GetProcessInfos())
                    {
                        if (!seen.Add(info.ProcessId)) continue;
                        try
                        {
                            using var process = System.Diagnostics.Process.GetProcessById(info.ProcessId);
                            process.Refresh();
                            working = checked(working + process.WorkingSet64);
                            privateBytes = checked(privateBytes + process.PrivateMemorySize64);
                            observed++;
                        }
                        catch (ArgumentException) { unreadable++; }
                        catch (InvalidOperationException) { unreadable++; }
                        catch (System.ComponentModel.Win32Exception) { unreadable++; }
                    }
                    return (working, privateBytes, observed, unreadable);
                }

                using var baselineHost = System.Diagnostics.Process.GetCurrentProcess();
                baselineHost.Refresh();
                var smokeHostWorkingSetBefore = baselineHost.WorkingSet64;
                var smokeHostPrivateBytesBefore = baselineHost.PrivateMemorySize64;
                var smokeWebViewBefore = SampleWebView2Resident();
                if (smokeWebViewBefore.Observed == 0)
                    throw new InvalidOperationException(
                        "Real WebView2 memory baseline unavailable; cannot infer full FoamLENS memory from host alone.");
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
                var expectedPhysicalRegions = (Environment.GetEnvironmentVariable("FOAMLENS_SMOKE_EXPECT_REGIONS") ?? "")
                    .Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
                var minimumFieldSpanText =
                    Environment.GetEnvironmentVariable("FOAMLENS_SMOKE_MIN_FIELD_SPAN") ?? "";
                var minimumCasesText =
                    Environment.GetEnvironmentVariable("FOAMLENS_SMOKE_MIN_CASES") ?? "";
                var initialCaseName =
                    Environment.GetEnvironmentVariable("FOAMLENS_SMOKE_INITIAL_CASE") ?? "";
                var switchCaseName =
                    Environment.GetEnvironmentVariable("FOAMLENS_SMOKE_SWITCH_CASE") ?? "";
                var asymmetricCaseName =
                    Environment.GetEnvironmentVariable("FOAMLENS_SMOKE_ASYMMETRIC_CASE") ?? "";
                var refsJson = JsonSerializer.Serialize(smokeRefs, _json);
                var optionsJson = JsonSerializer.Serialize(
                    new {
                        region = preferredRegion,
                        field = preferredField,
                        time = preferredTime,
                        expectedRegions = expectedPhysicalRegions,
                        initialCase = initialCaseName,
                        switchCase = switchCaseName,
                        asymmetricCase = asymmetricCaseName
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
                    if (expectedPhysicalRegions.Length > 1)
                    {
                        if (!data.TryGetProperty("physicalScene", out var physicalScene) ||
                            physicalScene.ValueKind != JsonValueKind.Object ||
                            !physicalScene.TryGetProperty("ok", out var physicalOk) || !physicalOk.GetBoolean() ||
                            !physicalScene.TryGetProperty("oneCanvas", out var sameCanvas) || !sameCanvas.GetBoolean() ||
                            !physicalScene.TryGetProperty("glError", out var compositeGlError) || compositeGlError.GetInt32() != 0 ||
                            !physicalScene.TryGetProperty("secondaryCount", out var compositeCount) ||
                            compositeCount.GetInt32() != expectedPhysicalRegions.Length - 1)
                            throw new InvalidOperationException(
                                $"FoamLens real physical multiregion scene did not render together: {realCaseJson}");
                        if (!physicalScene.TryGetProperty("transparentPixelProof", out var pixelProof) ||
                            pixelProof.ValueKind != JsonValueKind.Object ||
                            !pixelProof.TryGetProperty("ok", out var pixelOk) || !pixelOk.GetBoolean())
                            throw new InvalidOperationException(
                                $"FoamLens real WebGL alpha pixel-composition regression failed: {realCaseJson}");
                        Log($"FoamLens real OpenFOAM physical multiregion WebGL smoke passed: {physicalScene}");
                        if (!string.IsNullOrWhiteSpace(asymmetricCaseName))
                        {
                            if (!physicalScene.TryGetProperty("asymmetric", out var asymmetric) ||
                                asymmetric.ValueKind != JsonValueKind.Object ||
                                !asymmetric.TryGetProperty("ok", out var unevenOk) || !unevenOk.GetBoolean())
                                throw new InvalidOperationException(
                                    $"FoamLens on-disk asymmetric OpenFOAM physical-time case failed: {realCaseJson}");
                            Log($"FoamLens real on-disk asymmetric region-time smoke passed: {asymmetric}");
                        }

                        // Exercise real mold/metal face/cell associations through
                        // the installed UI's region-specific Probe selector.
                        var regionProbeJson = await _web.CoreWebView2.ExecuteScriptAsync(
                            """
                            (() => {
                              try {
                              const scene=window.FoamLensRegionScene?.state?.();
                              const probe=window.FoamLensFieldProbe;
                              const target=document.getElementById('fvProbeRegion');
                              const name=scene?.layers?.keys?.().next?.().value;
                              const layer=name!=null?scene.layers.get(name):null;
                              if(!layer||!probe?.fpRenderedPick||!target||!layer.fieldValues?.length)
                                return {ok:false,error:'Region Probe controls or measured OpenFOAM layer unavailable'};
                              // Reuse the exact CPU triangles already uploaded to this region's WebGL layer.
                              const shapes=layer.probePositions;
                              if(!shapes?.length)return {ok:false,error:'Measured layer has no preserved pickable triangles'};
                              const vector=(a,b)=>a.map((v,i)=>v-b[i]);
                              const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
                              let ray=null;
                              for(let i=0;i+8<shapes.length&&i<1800;i+=9){
                                const a=[...shapes.slice(i,i+3)],b=[...shapes.slice(i+3,i+6)],c=[...shapes.slice(i+6,i+9)];
                                const n=cross(vector(b,a),vector(c,a)),len=Math.hypot(...n);
                                if(!Number.isFinite(len)||len<1e-14)continue;
                                const unit=n.map(v=>v/len),ctr=a.map((v,k)=>(v+b[k]+c[k])/3),
                                  scale=Math.max(1e-5,Math.hypot(...layer.mesh.boundsMax.map((v,k)=>v-layer.mesh.boundsMin[k])));
                                ray={origin:ctr.map((v,k)=>v+unit[k]*scale),dir:unit.map(v=>-v)};break;
                              }
                              if(!ray)return {ok:false,error:'No nondegenerate physical triangles to probe'};
                              const original=target.value;
                              let hit;
                              try{target.value='region:'+name;hit=probe.fpRenderedPick(ray)}
                              finally{target.value=original}
                              const observed=hit?.cell!=null?Number(layer.fieldValues[hit.cell]):
                                hit?.face!=null?Number(layer.fieldValues[hit.face]):NaN;
                              const ok=!!hit&&hit.region===name&&hit.fieldName===layer.field&&
                                hit.caseId!=null&&String(hit.caseId)===String(scene.caseId)&&
                                Number.isFinite(hit.value)&&Number.isFinite(observed)&&
                                Math.abs(hit.value-observed)<=Math.max(1e-9,Math.abs(observed)*1e-8)&&
                                Number.isFinite(Number(hit.time))&&Number.isFinite(Number(layer.time))&&
                                Math.abs(Number(hit.time)-Number(layer.time))<=
                                  Math.max(1e-8,Math.abs(Number(layer.time))*1e-8);
                              return {ok,region:name,field:hit?.fieldName,storage:hit?.storage,
                                cell:hit?.cell,face:hit?.face,measuredValue:hit?.value,
                                sourceValue:observed,time:hit?.time,caseId:hit?.caseId,
                                selectorPresent:[...target.options].some(o=>o.value==='region:'+name)};
                              } catch (error) {
                                return {ok:false,error:String(error?.stack||error),stage:'real-region-probe'};
                              }
                            })()
                            """);
                        using (var measuredProbe = JsonDocument.Parse(regionProbeJson))
                        {
                            var probeData = measuredProbe.RootElement;
                            if (probeData.ValueKind != JsonValueKind.Object ||
                                !probeData.TryGetProperty("ok", out var probeOk) || !probeOk.GetBoolean() ||
                                !probeData.TryGetProperty("selectorPresent", out var probeSelector) ||
                                !probeSelector.GetBoolean())
                                throw new InvalidOperationException(
                                    $"FoamLens measured multiregion Probe failed: {regionProbeJson}");
                        }
                        Log("FoamLens exact physical-region Probe smoke passed: " + regionProbeJson);
                    }
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
                        string.IsNullOrWhiteSpace(plotSurfaceFieldOwnerBeforeNode.GetString()) ||
                        !data.TryGetProperty("plotSurfaceDataActive", out var plotSurfaceDataActiveNode) ||
                        !plotSurfaceDataActiveNode.GetBoolean() ||
                        !data.TryGetProperty("plotSurfaceAnalysisActive", out var plotSurfaceAnalysisActiveNode) ||
                        !plotSurfaceAnalysisActiveNode.GetBoolean() ||
                        !data.TryGetProperty("plotSurfaceDataRestored", out var plotSurfaceDataRestoredNode) ||
                        !plotSurfaceDataRestoredNode.GetBoolean() ||
                        !data.TryGetProperty("plotSurfaceFieldRestored", out var plotSurfaceFieldRestoredNode) ||
                        !plotSurfaceFieldRestoredNode.GetBoolean() ||
                        !data.TryGetProperty("plotSurfaceFieldDataPlotBlocked", out var plotSurfaceFieldPlotCapturedNode) ||
                        !plotSurfaceFieldPlotCapturedNode.GetBoolean() ||
                        !data.TryGetProperty("plotSurfaceDataAfterFieldRoundTrip", out var plotSurfaceDataAfterFieldRoundTripNode) ||
                        !plotSurfaceDataAfterFieldRoundTripNode.GetBoolean() ||
                        !data.TryGetProperty("plotSurfaceField3DRestored", out var plotSurfaceFieldPlotRestoredNode) ||
                        !plotSurfaceFieldPlotRestoredNode.GetBoolean() ||
                        !data.TryGetProperty("plotSurfaceError", out var plotSurfaceErrorNode) ||
                        !string.IsNullOrWhiteSpace(plotSurfaceErrorNode.GetString()))
                        throw new InvalidOperationException(
                            $"FoamLens stable Data / Analysis / Field plot-surface runtime smoke failed: {realCaseJson}");

                    if (!data.TryGetProperty("sessionSavedFresh", out var sessionSavedFreshNode) ||
                        !sessionSavedFreshNode.GetBoolean() ||
                        !data.TryGetProperty("sessionReplayApiPresent", out var sessionReplayApiNode) ||
                        !sessionReplayApiNode.GetBoolean() ||
                        !data.TryGetProperty("sessionStoredFieldSelectionPresent", out var sessionSelectionNode) ||
                        !sessionSelectionNode.GetBoolean() ||
                        !data.TryGetProperty("sessionRestored", out var sessionRestoredNode) ||
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
                            "FoamLens cross-session state round-trip smoke failed; sanitized " +
                            "savedFresh=" +
                            (data.TryGetProperty("sessionSavedFresh", out var saveFlag) &&
                             saveFlag.ValueKind == JsonValueKind.True).ToString().ToLowerInvariant() +
                            "; replayApiPresent=" +
                            (data.TryGetProperty("sessionReplayApiPresent", out var replayApiFlag) &&
                             replayApiFlag.ValueKind == JsonValueKind.True).ToString().ToLowerInvariant() +
                            "; savedDataViewEqualsRestored=" +
                            (data.TryGetProperty("sessionStoredDataView", out var savedView) &&
                             data.TryGetProperty("sessionRestoredDataView", out var restoredView) &&
                             savedView.ValueKind == JsonValueKind.String &&
                             restoredView.ValueKind == JsonValueKind.String &&
                             string.Equals(savedView.GetString(), restoredView.GetString(), StringComparison.Ordinal)
                            ).ToString().ToLowerInvariant() +
                            "; savedCatalog=" +
                            (data.TryGetProperty("sessionStoredDataView", out var storedCatalogNode) &&
                             storedCatalogNode.ValueKind == JsonValueKind.String &&
                             string.Equals(storedCatalogNode.GetString(), "catalog", StringComparison.Ordinal)
                            ).ToString().ToLowerInvariant() +
                            "; restoredCatalog=" +
                            (data.TryGetProperty("sessionRestoredDataView", out var restoredCatalogNode) &&
                             restoredCatalogNode.ValueKind == JsonValueKind.String &&
                             string.Equals(restoredCatalogNode.GetString(), "catalog", StringComparison.Ordinal)
                            ).ToString().ToLowerInvariant() +
                            "; restoredTimeSeries=" +
                            (data.TryGetProperty("sessionRestoredDataView", out var restoredTimeseriesNode) &&
                             restoredTimeseriesNode.ValueKind == JsonValueKind.String &&
                             string.Equals(restoredTimeseriesNode.GetString(), "timeseries", StringComparison.Ordinal)
                            ).ToString().ToLowerInvariant() +
                            "; replayApplied=" +
                            (data.TryGetProperty("sessionReplayStatus", out var replayAppliedNode) &&
                             replayAppliedNode.ValueKind == JsonValueKind.String &&
                             string.Equals(replayAppliedNode.GetString(), "applied", StringComparison.Ordinal)
                            ).ToString().ToLowerInvariant() +
                            "; replaySuperseded=" +
                            (data.TryGetProperty("sessionReplayStatus", out var replaySupersededNode) &&
                             replaySupersededNode.ValueKind == JsonValueKind.String &&
                             string.Equals(replaySupersededNode.GetString(), "superseded", StringComparison.Ordinal)
                            ).ToString().ToLowerInvariant() +
                            "; replayModeChanged=" +
                            (data.TryGetProperty("sessionReplayStatus", out var replayModeNode) &&
                             replayModeNode.ValueKind == JsonValueKind.String &&
                             string.Equals(replayModeNode.GetString(), "mode-changed", StringComparison.Ordinal)
                            ).ToString().ToLowerInvariant() +
                            "; replayNoField=" +
                            (data.TryGetProperty("sessionReplayStatus", out var replayNoFieldNode) &&
                             replayNoFieldNode.ValueKind == JsonValueKind.String &&
                             (string.Equals(replayNoFieldNode.GetString(), "no-field", StringComparison.Ordinal) ||
                              string.Equals(replayNoFieldNode.GetString(), "applied-no-field", StringComparison.Ordinal))
                            ).ToString().ToLowerInvariant() +
                            "; replayPending=" +
                            (data.TryGetProperty("sessionReplayStatus", out var replayPendingNode) &&
                             replayPendingNode.ValueKind == JsonValueKind.String &&
                             string.Equals(replayPendingNode.GetString(), "pending", StringComparison.Ordinal)
                            ).ToString().ToLowerInvariant() +
                            "; replayNoPlots=" +
                            (data.TryGetProperty("sessionReplayStatus", out var replayNoPlotsNode) &&
                             replayNoPlotsNode.ValueKind == JsonValueKind.String &&
                             string.Equals(replayNoPlotsNode.GetString(), "no-plots", StringComparison.Ordinal)
                            ).ToString().ToLowerInvariant() +
                            "; replayUnavailable=" +
                            (!data.TryGetProperty("sessionReplayStatus", out var replayUnavailableNode) ||
                             replayUnavailableNode.ValueKind != JsonValueKind.String ||
                             string.Equals(replayUnavailableNode.GetString(), "unavailable", StringComparison.Ordinal)
                            ).ToString().ToLowerInvariant() +
                            "; fieldSelectionPresent=" +
                            (data.TryGetProperty("sessionStoredFieldSelectionPresent", out var selectionNode) &&
                             selectionNode.ValueKind == JsonValueKind.True
                            ).ToString().ToLowerInvariant() +
                            "; restoredModeField=" +
                            (data.TryGetProperty("sessionRestoredMode", out var fieldModeNode) &&
                             fieldModeNode.ValueKind == JsonValueKind.String &&
                             string.Equals(fieldModeNode.GetString(), "field", StringComparison.Ordinal)
                            ).ToString().ToLowerInvariant());

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

                if (expectedPhysicalRegions.Length > 1)
                {
                    var evidence = Environment.GetEnvironmentVariable("FOAMLENS_BRAND_EVIDENCE_DIR");
                    if (!string.IsNullOrWhiteSpace(evidence))
                    {
                        Directory.CreateDirectory(evidence);
                        await Task.Delay(150);
                        var compositePng = Path.Combine(evidence, "field-real-multiregion.png");
                        await CaptureCdpPngAsync(compositePng);
                        Log($"FoamLens real two-region Field screenshot: {compositePng}");
                    }
                }

                // Real resident-memory observation after importing actual B13
                // metal/mold. Sum host + WebView2 processes from this WebView2
                // user-data folder; never mislabel the sum as GPU VRAM.
                using (var host = System.Diagnostics.Process.GetCurrentProcess())
                {
                    host.Refresh();
                    var afterWeb = SampleWebView2Resident();
                    if (afterWeb.Observed == 0)
                        throw new InvalidOperationException(
                            "Real WebView2 processes not measurable after OpenFOAM import.");
                    var totalBefore = checked(smokeHostWorkingSetBefore + smokeWebViewBefore.WorkingBytes);
                    var totalAfter = checked(host.WorkingSet64 + afterWeb.WorkingBytes);
                    var report = new
                    {
                        scope = "Windows host + WebView2 user-data-folder resident process memory; crashpad and GPU driver VRAM excluded",
                        nativeFixture = "actual imported OpenFOAM QuickCup metal/mold",
                        residentWorkingSetBeforeBytes = totalBefore,
                        residentWorkingSetAfterBytes = totalAfter,
                        residentWorkingSetDeltaBytes = totalAfter - totalBefore,
                        privateBytesBefore = checked(smokeHostPrivateBytesBefore + smokeWebViewBefore.PrivateBytes),
                        privateBytesAfter = checked(host.PrivateMemorySize64 + afterWeb.PrivateBytes),
                        hostWorkingSetBeforeBytes = smokeHostWorkingSetBefore,
                        hostWorkingSetAfterBytes = host.WorkingSet64,
                        hostPeakWorkingSetBytes = host.PeakWorkingSet64,
                        webView2WorkingSetBeforeBytes = smokeWebViewBefore.WorkingBytes,
                        webView2WorkingSetAfterBytes = afterWeb.WorkingBytes,
                        webView2ProcessesBefore = smokeWebViewBefore.Observed,
                        webView2ProcessesAfter = afterWeb.Observed,
                        webView2UnreadableBefore = smokeWebViewBefore.Unreadable,
                        webView2UnreadableAfter = afterWeb.Unreadable,
                        includesGpuDriverVram = false
                    };
                    Log($"FoamLens real OpenFOAM process memory: {JsonSerializer.Serialize(report, _json)}");
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
                        const afterFirstSwap={primary:String(document.getElementById('fvCase')?.value||''),comparison:String(document.getElementById('fcCase')?.value||'')};
                        const swapApplied=firstSwap===true&&
                          String(document.getElementById('fvCase')?.value||'')===comparisonCaseBeforeSwap&&
                          String(document.getElementById('fcCase')?.value||'')===primaryCaseBeforeSwap;
                        const secondSwap=await api.swapPrimaryCompare();
                        const afterSecondSwap={primary:String(document.getElementById('fvCase')?.value||''),comparison:String(document.getElementById('fcCase')?.value||'')};
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
                          firstSwap,
                          secondSwap,
                          primaryCaseBeforeSwap,
                          comparisonCaseBeforeSwap,
                          afterFirstSwap,
                          afterSecondSwap,
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
                await CaptureScientificWorkspaceEvidenceAsync();

                // G56 original native B13 source numerical validation: private CI only.
                if (string.Equals(Environment.GetEnvironmentVariable("FOAMLENS_SMOKE_TIMESERIES_B13"),
                        "1", StringComparison.Ordinal))
                {
                    await _web.CoreWebView2.ExecuteScriptAsync("window.__foamLensB13TwoRegionTimeseriesResult=null;");
                    await _web.CoreWebView2.ExecuteScriptAsync(
                        """
                        (async()=>{
                         let stage='init',chosen=[];
                         const result={ok:false};
                         try{
                          const bridge=window.__foamLensB13NumericBridge;
                          if(!bridge)throw Error('original field history smoke-only bridge missing');
                          const {fwBuildFieldTimeSeries,fvLoadFrameData,fwRefreshFieldTsSlot,fwPhysicalTimes,
                            fwEnsureFieldTsControls,fwFieldTsCase,fwFieldTsRegion,fwFieldTsGroup,
                            fwFieldTsSourceKey,setAppMode,setDataView}=bridge;
                          const cases=bridge.caseList(),series=bridge.seriesList();
                          if(typeof fwBuildFieldTimeSeries!=='function'||typeof fvLoadFrameData!=='function')throw Error('original field history missing');
                          stage='select';
                          const c=(cases||[]).find(x=>String(x?.name||'').includes('B13_prghPressure_airGapOF14'));
                          if(!c?.discoveryModel)throw Error('original B13 case missing');
                          setAppMode('data');setDataView('timeseries');
                          if(!fwEnsureFieldTsControls())throw Error('original history controls missing');
                          document.getElementById('fwDataFieldHistories').open=true;
                          document.getElementById('fwTsEnable2').checked=true;
                          for(const [slot,region] of [[1,'metal'],[2,'mold']]){
                           const el=id=>document.getElementById(id+slot);
                           el('fwTsSource').value='global';fwRefreshFieldTsSlot(slot,false);
                           el('fwTsCase').value=String(c.id);fwRefreshFieldTsSlot(slot,true);
                           el('fwTsRegion').value=region;fwRefreshFieldTsSlot(slot,true);
                           el('fwTsField').value='T';fwRefreshFieldTsSlot(slot,true);
                           el('fwTsComponent').value='value';el('fwTsStat').value='mean';
                           const found=fwFieldTsCase(slot),r=fwFieldTsRegion(slot),g=fwFieldTsGroup(slot);
                           if(String(found?.id)!==String(c.id)||r!==region||g?.name!=='T'||g.kind!=='scalar'||g.storage!=='volume')throw Error('B13 region T source not selected');
                           chosen.push({c:found,r,g,original:g.times});
                          }
                          if(chosen[0].g===chosen[1].g)throw Error('two physical field sources not independent');
                          stage='physical-times';
                          const ta=fwPhysicalTimes(chosen[0].g.times),tb=fwPhysicalTimes(chosen[1].g.times);
                          const common=ta.filter(t=>tb.includes(t));
                          if(common.length<2)throw Error('B13 requires two common original physical times');
                          const times=[...new Set([common[0],common[Math.floor((common.length-1)/2)],common[common.length-1]])];
                          stage='original-generator';
                          try{
                           for(const item of chosen)item.g.times=times.slice();
                           await fwBuildFieldTimeSeries();
                           const built=chosen.map(item=>(series||[]).find(s=>s.fieldHistoryKey===fwFieldTsSourceKey(item.c,item.r,item.g,'value','mean')&&s.visible===true));
                           if(built.some(s=>!s))throw Error('original two-source commit missing');
                           stage='source-recompute';
                           let matched=0,numericCells=0;
                           for(let i=0;i<2;i++){
                            const item=chosen[i],curve=built[i],ev=curve.fieldHistoryEvidence;
                            if(String(curve.caseId)!==String(item.c.id)||curve.location!==item.r||ev?.region!==item.r||!ev.verifiedDimensions||
                               ev?.sourceKind!=='global'||ev?.statistic!=='mean'||ev.temporalInterpolation!==false||
                               ev.originalTimeCount!==times.length||ev.finiteSampleCount!==times.length||
                               curve.t.length!==times.length||curve.y.length!==times.length||curve.t.some((t,j)=>t!==times[j]))
                              throw Error('original B13 source or physical-time provenance mismatch');
                            for(let j=0;j<times.length;j++){
                             const frame=await fvLoadFrameData(item.c,item.g,item.r,times[j],'value',{includeBoundary:false});
                             if(!frame?.range?.valid||!frame.fieldValues||!frame.parsed?.dimensions)throw Error('actual source frame not verified');
                             let sum=0,count=0;
                             for(const raw of frame.fieldValues){const value=Number(raw);if(Number.isFinite(value)){sum+=value;count++}}
                             if(!count)throw Error('source has no finite cells');
                             numericCells+=count;
                             const reference=sum/count,actual=Number(curve.y[j]);
                             if(!Number.isFinite(actual)||Math.abs(actual-reference)>Math.max(1e-7,Math.abs(reference)*1e-9))
                              throw Error('original generated mean differs from source cell arithmetic');
                             matched++;
                            }
                           }
                           if(matched!==2*times.length||numericCells<matched||
                              !built[0].y.some((v,j)=>Math.abs(v-built[1].y[j])>1e-7))
                             throw Error('independent metal/mold original values were not distinguished');
                           Object.assign(result,{ok:true,caseAndRegionsVerified:true,originalNumericAgreement:true,
                             sampledPhysicalTimes:times.length,independentSourceFrames:matched,noInterpolation:true,
                             originalSourceValuesUploaded:false});
                          }finally{for(const item of chosen)item.g.times=item.original}
                         }catch(e){Object.assign(result,{ok:false,stage,reason:String(e?.message||e).slice(0,140)})}
                         window.__foamLensB13TwoRegionTimeseriesResult=result;
                        })();
                        """);
                    string checkedJson = "null";
                    var checkDeadline = Stopwatch.StartNew();
                    while (checkDeadline.Elapsed < TimeSpan.FromSeconds(180))
                    {
                        await Task.Delay(180);
                        checkedJson = await _web.CoreWebView2.ExecuteScriptAsync(
                            "window.__foamLensB13TwoRegionTimeseriesResult");
                        if (!string.Equals(checkedJson.Trim(), "null", StringComparison.OrdinalIgnoreCase) &&
                            !string.Equals(checkedJson.Trim(), "undefined", StringComparison.OrdinalIgnoreCase))
                            break;
                    }
                    using (var checkDoc = JsonDocument.Parse(checkedJson))
                    {
                        var proof = checkDoc.RootElement;
                        bool yes(string key) => proof.TryGetProperty(key, out var p) &&
                            p.ValueKind == JsonValueKind.True;
                        bool minimum(string key, int lower) => proof.TryGetProperty(key, out var p) &&
                            p.ValueKind == JsonValueKind.Number && p.TryGetInt32(out int n) && n >= lower;
                        if (!yes("ok") || !yes("caseAndRegionsVerified") ||
                            !yes("originalNumericAgreement") || !yes("noInterpolation") ||
                            !minimum("sampledPhysicalTimes", 2) || !minimum("independentSourceFrames", 4) ||
                            !proof.TryGetProperty("originalSourceValuesUploaded", out var upload) ||
                            upload.ValueKind != JsonValueKind.False)
                        {
                            // Fixed enums only: never leak private source paths or cell values.
                            var stageRaw = proof.TryGetProperty("stage", out var st) &&
                                st.ValueKind == JsonValueKind.String ? st.GetString() : "";
                            var stageSafe = stageRaw switch
                            {
                                "init" => "init",
                                "select" => "select",
                                "physical-times" => "physical-times",
                                "original-generator" => "original-generator",
                                "source-recompute" => "source-recompute",
                                _ => "unknown"
                            };
                            var reasonRaw = proof.TryGetProperty("reason", out var rs) &&
                                rs.ValueKind == JsonValueKind.String ? rs.GetString() : "";
                            var reasonCode = reasonRaw switch
                            {
                                "original field history missing" => "missing-source-generator",
                                "original field history smoke-only bridge missing" => "missing-smoke-bridge",
                                "original B13 case missing" => "missing-b13-case",
                                "original history controls missing" => "missing-controls",
                                "B13 region T source not selected" => "source-selector",
                                "two physical field sources not independent" => "region-alias",
                                "B13 requires two common original physical times" => "insufficient-times",
                                "original two-source commit missing" => "history-commit",
                                "original B13 source or physical-time provenance mismatch" => "history-provenance",
                                "actual source frame not verified" => "invalid-source-frame",
                                "source has no finite cells" => "nonfinite-source",
                                "original generated mean differs from source cell arithmetic" => "mean-disagreement",
                                "independent metal/mold original values were not distinguished" => "no-regional-difference",
                                _ => "unclassified"
                            };
                            Log("G56 SAFE FAIL stage=" + stageSafe + " code=" + reasonCode);
                            throw new InvalidOperationException("G56 original B13 numerical validation failed, safe stage " + stageSafe + ".");
                        }
                    }
                    Log("FoamLens original B13 two-region Time Series numeric smoke passed: physical time and original source cells independently reduced, no private scientific values exported.");
                    await _web.CoreWebView2.ExecuteScriptAsync("delete window.__foamLensB13TwoRegionTimeseriesResult;");
                }


                // Optional CI handshake: keep the actual rendered metal/mold case
                // alive while the parent runner samples GPU Process Memory counters.
                // Never describe those process counters as graphics-card total VRAM.
                var readyFile = Environment.GetEnvironmentVariable("FOAMLENS_SMOKE_GPU_READY_FILE");
                if (!string.IsNullOrWhiteSpace(readyFile))
                {
                    var readyPath = Path.GetFullPath(readyFile);
                    var ackPath = readyPath + ".ack";
                    var readyDirectory = Path.GetDirectoryName(readyPath);
                    if (!string.IsNullOrWhiteSpace(readyDirectory))
                        Directory.CreateDirectory(readyDirectory);
                    if (File.Exists(readyPath) || File.Exists(ackPath))
                        throw new InvalidOperationException("Stale loaded-GPU smoke handshake marker detected.");
                    var marker = new
                    {
                        schema = "foamlens-loaded-openfoam-gpu-ready-v1",
                        hostPid = Environment.ProcessId,
                        sourceSha = Environment.GetEnvironmentVariable("FOAMLENS_SMOKE_SOURCE_SHA") ?? "",
                        caseRoot = fullCasePath,
                        observedUtc = DateTime.UtcNow.ToString("o", CultureInfo.InvariantCulture),
                        phase = "real OpenFOAM physical region data loaded and rendered"
                    };
                    // A readiness file must only become visible after its JSON
                    // is fully written; the CI watcher must never parse a partial file.
                    var stagingPath = readyPath + ".writing." + Environment.ProcessId;
                    await File.WriteAllTextAsync(stagingPath, JsonSerializer.Serialize(marker));
                    File.Move(stagingPath, readyPath);
                    var gpuDeadline = Stopwatch.StartNew();
                    while (!File.Exists(ackPath))
                    {
                        if (gpuDeadline.Elapsed > TimeSpan.FromSeconds(45))
                            throw new InvalidOperationException("Loaded OpenFOAM GPU counter sampler did not acknowledge the actual rendered case.");
                        await Task.Delay(200);
                    }
                    var acknowledgment = await File.ReadAllTextAsync(ackPath);
                    if (!string.Equals(acknowledgment.Trim(), "sampled", StringComparison.Ordinal))
                        throw new InvalidOperationException("Loaded GPU counter sampler returned an invalid acknowledgment.");
                    File.Delete(ackPath);
                    File.Delete(readyPath);
                    Log("FoamLens real rendered OpenFOAM GPU counter sampling handshake completed.");
                }
            }

            // Verify continued background progress, not an exact 50 ms cadence.
            // Windows WebView2 legitimately coalesces/throttles hidden timers
            // after a long real-case GPU smoke. At least one executed callback
            // proves progress; requiring five in 1.5 s is a false failure.
            await _web.CoreWebView2.ExecuteScriptAsync(
                "window.__foamLensBackgroundTicks=0;window.__foamLensBackgroundTimer=setInterval(()=>window.__foamLensBackgroundTicks++,50);");
            WindowState = FormWindowState.Minimized;
            await Task.Delay(1500);
            var backgroundTicksJson = await _web.CoreWebView2.ExecuteScriptAsync(
                "window.__foamLensBackgroundTicks");
            WindowState = FormWindowState.Normal;
            Activate();
            if (!int.TryParse(backgroundTicksJson.Trim('"'), NumberStyles.Integer,
                    CultureInfo.InvariantCulture, out var backgroundTicks) || backgroundTicks < 1)
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
        // G35: only authoritative embedded original AppBundle JavaScript is executable.
        // Never enumerate mutable per-user AppRoot v*-*.js residues after ZIP extraction.
        var bundledExtensions = TrustedEmbeddedFrontendExtensions.ReadFromRunningAssembly();

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
        var extension = string.Join(Environment.NewLine, bundledExtensions);
        // G56: bridge ONLY while the exact native --smoke-test has explicitly
        // opted in to the original private B13 numerical test. Never export the
        // main IIFE's source model or parsing functions to regular user sessions.
        if (_smokeTest && string.Equals(Environment.GetEnvironmentVariable(
                "FOAMLENS_SMOKE_TIMESERIES_B13"), "1", StringComparison.Ordinal))
        {
            extension += Environment.NewLine + """
window.__foamLensB13NumericBridge={
  caseList:()=>cases,seriesList:()=>series,
  fwBuildFieldTimeSeries,fvLoadFrameData,fwRefreshFieldTsSlot,fwPhysicalTimes,
  fwEnsureFieldTsControls,fwFieldTsCase,fwFieldTsRegion,fwFieldTsGroup,
  fwFieldTsSourceKey,setAppMode,setDataView
};
""";
        }
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
    const fieldRestored=window.FoamLensFieldWorkspace?.getState?.().view==='3d'&&
      window.FoamLensFieldWorkspace?.getState?.().layout==='3d';
    // Legacy Field plot views must not hijack Data's independent plot context.
    // Field stays physically 3D even if an imported workspace asks for Time Series.
    const dataViewBeforeLegacyRequest=String(currentDataView||'');
    window.FoamLensFieldWorkspace?.setView?.('timeseries');
    const blockedDataPlot=window.FoamLensFieldWorkspace?.getState?.().view==='3d'&&
      window.FoamLensFieldWorkspace?.getState?.().layout==='3d'&&
      String(currentDataView||'')===dataViewBeforeLegacyRequest;
    setAppMode('data');
    const dataAfterFieldRoundTrip=ps.active?.()==='data'&&owner()==='data'&&String(currentDataView||'')===requestedDataView;
    setAppMode('field');
    const field3DRestored=ps.active?.()==='data'&&owner()==='data'&&
      window.FoamLensFieldWorkspace?.getState?.().view==='3d'&&
      window.FoamLensFieldWorkspace?.getState?.().layout==='3d'&&
      String(currentDataView||'')===requestedDataView;
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
      blockedDataPlot,
      dataAfterFieldRoundTrip,
      field3DRestored,
      dataViewBeforeLegacyRequest,
      requestedDataView
    };
  }catch(e){
    plotSurfaceError=String(e?.stack||e);
    try{setAppMode('field')}catch{}
  }
  let sessionSmoke=null,sessionSmokeError='';
  let sessionSavedFresh=false,sessionReplayApiPresent=false,sessionSavedFieldSelectionPresent=false;
  try{
    const ss=window.FoamLensSessionState,ctx=window.FoamLensContextStore,ps=window.FoamLensPlotSurfaces;
    if(!ss||!ctx||!ps)throw new Error('Session persistence APIs are incomplete.');
    sessionReplayApiPresent=typeof ss.replayStatus==='function';
    if(!sessionReplayApiPresent)throw new Error('Current packaged session replay API is missing.');
    ctx.set({caseId:Number(switchedCase.id),region:String(fvState.region||'')},{source:'session-smoke',apply:false});
    window.FoamLensFieldWorkspace?.setInspector?.(true);
    setAppMode('field');
    // G68: never read an OLD WebView2 localStorage snapshot after a guarded
    // save returned false while the original Field restoration was active.
    // Wait for the real stored-session restore and boundedly retry the
    // original public save API; do not bypass its source-state guards.
    if(typeof ss.whenRestored==='function')await ss.whenRestored();
    for(let attempt=0;attempt<50&&!sessionSavedFresh;attempt++){
      sessionSavedFresh=ss.save()===true;
      if(!sessionSavedFresh)await new Promise(resolve=>setTimeout(resolve,100));
    }
    if(!sessionSavedFresh)throw new Error('Guarded session save could not settle before native persistence QA.');
    const stored=ss.load();
    sessionSavedFieldSelectionPresent=!!(stored&&Object.prototype.hasOwnProperty.call(stored,'fieldSelection'));
    if(!stored||!sessionSavedFieldSelectionPresent)
      throw new Error('Fresh session snapshot is missing the original Field selection.');
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
      // Only a bounded replay-decision enum; never export cases, paths or values.
      sessionReplayStatus:String(ss.replayStatus?.()||'unavailable'),
      sessionStoredFieldSelectionPresent:!!stored?.fieldSelection,
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
  // True installed-runtime scientific acceptance: assert the SAME imported
  // OpenFOAM case renders physical solid/mold regions together, not 2 case views.
  // This check is smoke-only and uses actual native OpenFOAM field/mesh parsers.
  let physicalScene=null;
  if(Array.isArray(options.expectedRegions)&&options.expectedRegions.length>1){
    const c=fvCase(),api=window.FoamLensRegionScene,expected=options.expectedRegions.map(String);
    if(!api||!c)throw new Error('Physical-region scene API or imported case missing');
    const discovered=api.regionNames(c),primary=String(document.getElementById('fvRegion')?.value||'');
    if(expected.some(name=>!discovered.includes(name)))
      throw new Error('OpenFOAM physical-region inventory mismatch: '+JSON.stringify({expected,discovered}));
    if(!expected.includes(primary))throw new Error('The loaded primary region is not in the real physical-region fixture: '+primary);
    for(const region of expected)fvRegionChoice(c,region).visible=true;
    await api.load(c,fvState.time);
    fvCameraFitCurrent();fvRender();
    const scene=api.state(),gl=fvState.renderer?.gl,canvas=document.getElementById('fvCanvas');
    const secondary=expected.filter(name=>name!==primary).map(name=>{
      const layer=scene.layers.get(name);
      return{name,field:layer?.field||'',storage:layer?.storage||'',colored:layer?.colored===true,
        exactTime:layer?fvTimeEqual(layer.time,fvState.time):false,
        time:Number(layer?.time),cells:Number(layer?.mesh?.cellCount||0),
        surfaceVertices:Number(layer?.surfaceCount||0),sameWebGL:!!gl&&layer?.gl===gl,
        distinctMesh:!!layer?.mesh&&layer.mesh!==fvState.mesh,
        validRange:!!layer?.range?.valid,status:String(layer?.status||'')}
    });
    const primaryCells=Number(fvState.mesh?.cellCount||0);
    const frameTime=Number(fvState.time);
    const initialGpu=api.gpuPayloadStats?.();
    const loaded=secondary.every(s=>s.colored&&s.field==='T'&&s.exactTime&&s.cells>0&&
      s.surfaceVertices>0&&s.sameWebGL&&s.distinctMesh&&s.validRange);
    physicalScene={expected,discovered,primary,primaryCells,frameTime,secondary,
      oneCanvas:!!canvas&&(canvas.getContext('webgl2')===gl||canvas.getContext('webgl')===gl),
      secondaryCount:scene.layers.size,glError:gl?gl.getError():-1,
      secondaryGpuPayloadBytes:Number(initialGpu?.payloadBytes||0),
      secondaryGpuRegions:Number(initialGpu?.regionCount||0),
      ok:loaded&&secondary.length===expected.length-1&&scene.layers.size===expected.length-1&&
        initialGpu?.regionCount===expected.length-1&&Number(initialGpu?.payloadBytes)>0&&
        primaryCells>0&&!!fvState.fieldValues?.length&&
        !!canvas&&(canvas.getContext('webgl2')===gl||canvas.getContext('webgl')===gl)};
    if(!physicalScene.ok)throw new Error('Real multiregion scene failed: '+JSON.stringify(physicalScene));
    // Pixel-backed native WebView2 check: a real offscreen GPU canvas draws
    // two overlapping physical-region triangles in deliberately WRONG input
    // order. The production global triangle sorter must reorder them before
    // alpha blending. This is a controlled graphics fixture, not OpenFOAM
    // measurement data and not proof of per-fragment order-independent OIT.
    let transparentPixelProof=null;
    {
      const offscreen=document.createElement('canvas');offscreen.width=32;offscreen.height=32;
      const ctx=offscreen.getContext('webgl',{alpha:false,antialias:false,preserveDrawingBuffer:true});
      if(!ctx)throw new Error('Native WebView2 offscreen WebGL pixel-composition proof unavailable');
      const triangle=z=>new Float32Array([-.9,-.9,z,.9,-.9,z,0,.9,z]);
      const color=(red,blue)=>new Float32Array([red,0,blue,red,0,blue,red,0,blue]);
      const ordered=fvTransparentTriangleSort([
        {key:'0-metal',positions:triangle(.5),colors:color(1,0),count:3,alpha:.5},
        {key:'1-mold',positions:triangle(-.5),colors:color(0,1),count:3,alpha:.5}
      ],{target:[0,0,0],distance:5,pitch:0,yaw:0});
      if(ordered?.triangles!==2)throw new Error('Global transparent triangle ordering failed for overlap fixture');
      const p=fvProgram(ctx,
        'attribute vec3 aPos;attribute vec3 aColor;attribute float aAlpha;varying vec3 vColor;varying float vAlpha;void main(){vColor=aColor;vAlpha=aAlpha;gl_Position=vec4(aPos,1.0);}',
        'precision mediump float;varying vec3 vColor;varying float vAlpha;void main(){gl_FragColor=vec4(vColor,vAlpha);}');
      ctx.viewport(0,0,32,32);ctx.clearColor(0,0,0,1);ctx.clear(ctx.COLOR_BUFFER_BIT);
      ctx.disable(ctx.DEPTH_TEST);ctx.enable(ctx.BLEND);
      ctx.blendFunc(ctx.SRC_ALPHA,ctx.ONE_MINUS_SRC_ALPHA);ctx.useProgram(p);
      const buffers=[];
      try{
        for(const [name,values,parts] of [
          ['aPos',ordered.positions,3],['aColor',ordered.colors,3],['aAlpha',ordered.alpha,1]]){
          const buffer=ctx.createBuffer(),loc=ctx.getAttribLocation(p,name);
          if(!buffer||loc<0)throw new Error('Offscreen WebGL attribute unavailable: '+name);
          buffers.push(buffer);ctx.bindBuffer(ctx.ARRAY_BUFFER,buffer);
          ctx.bufferData(ctx.ARRAY_BUFFER,values,ctx.STATIC_DRAW);
          ctx.enableVertexAttribArray(loc);ctx.vertexAttribPointer(loc,parts,ctx.FLOAT,false,0,0)
        }
        ctx.drawArrays(ctx.TRIANGLES,0,6);
        const pixel=new Uint8Array(4);
        ctx.readPixels(16,16,1,1,ctx.RGBA,ctx.UNSIGNED_BYTE,pixel);
        const error=ctx.getError();
        // Far blue 50% then near red 50%, over opaque black:
        // expected RGB ~= [128,0,64] with a reasonable 8-bit GPU tolerance.
        transparentPixelProof={
          ok:error===0&&Math.abs(pixel[0]-128)<=12&&pixel[1]<=12&&
            Math.abs(pixel[2]-64)<=12&&pixel[3]===255,
          rgba:Array.from(pixel),expectedRgb:[128,0,64],glError:error,
          triangles:ordered.triangles,scope:'controlled offscreen WebGL alpha overlap; not per-pixel OIT'
        };
        if(!transparentPixelProof.ok)
          throw new Error('Native GPU transparent overlap pixel mismatch: '+JSON.stringify(transparentPixelProof))
      }finally{
        for(const buffer of buffers)ctx.deleteBuffer(buffer);
        ctx.deleteProgram(p)
      }
    }
    physicalScene.transparentPixelProof=transparentPixelProof;
    const alphaBatch=fvState.renderer?.transparentBatch;
    const batchActive=fvState.renderer?.transparentBatchLastActive===true;
    physicalScene.transparentBatch={active:batchActive,
      sortedTriangles:batchActive?Number(alphaBatch?.lastTriangles||0):0,
      scratchPayloadBytes:batchActive?Number(alphaBatch?.lastPayloadBytes||0):0,
      scope:'sorted upload payload, not graphics-driver VRAM'};
    const weightedRenderer=fvState.renderer?.weightedOit;
    physicalScene.weightedOit={
      active:fvState.renderer?.weightedOitLastActive===true,
      mode:weightedRenderer?.mode||'not-active',
      scratchBytes:Number(weightedRenderer?.scratchBytes||0),
      floatColorSupported:!!gl?.getExtension?.('EXT_color_buffer_float'),
      floatBlendSupported:!!gl?.getExtension?.('EXT_float_blend'),
      disabledReason:String(fvState.renderer?.weightedOitDisabled||''),
      scope:'real imported OpenFOAM WebGL render, weighted approximate per-fragment; not exact OIT or driver VRAM'
    };
    if(physicalScene.weightedOit.active&&physicalScene.transparentBatch.active)
      throw new Error('Scientific 3D frame declared two mutually exclusive transparency modes active');
    // Native pixel-backed order-independence evidence: two synthetic triangles
    // CROSS in physical Z while sharing exactly the same projected XY. One
    // triangle is nearer on the left; the other is nearer on the right. Swap
    // physical source draw order and compare both pixel positions. The actual
    // production weighted WebGL2 path (not a reimplemented mock) is exercised.
    let weightedCrossedPixelProof={supported:false,ok:false,
      reason:'Offscreen WebGL2/float blend not available',
      scope:'controlled crossed synthetic triangles, not OpenFOAM measurement or exact OIT'};
    {
      const off=document.createElement('canvas');off.width=64;off.height=64;
      const gpu=off.getContext('webgl2',{antialias:false,alpha:true,preserveDrawingBuffer:true});
      if(gpu&&gpu.getExtension('EXT_color_buffer_float')&&gpu.getExtension('EXT_float_blend')){
        const savedCamera=fvState.camera,savedStorage=fvState.fieldStorage;
        const savedLayers=fvRegionScene.layers,savedChoices=fvRegionScene.choices;
        const buffers=[];
        let testRenderer=null,baseProgram=null;
        try{
          fvState.camera={target:[0,0,0],distance:5,yaw:0,pitch:0};
          fvState.fieldStorage='volume';
          const vertex='attribute vec3 aPos;attribute vec3 aColor;uniform mat4 uMVP;varying vec3 vColor;void main(){vColor=aColor;gl_Position=uMVP*vec4(aPos,1.0);}';
          baseProgram=fvProgram(gpu,vertex,
            'precision mediump float;varying vec3 vColor;void main(){gl_FragColor=vec4(vColor,1.0);}');
          const buffer=data=>{
            const b=gpu.createBuffer();if(!b)throw new Error('Crossed OIT test GPU buffer unavailable');
            buffers.push(b);gpu.bindBuffer(gpu.ARRAY_BUFFER,b);
            gpu.bufferData(gpu.ARRAY_BUFFER,data,gpu.STATIC_DRAW);return b
          };
          const verts=z=>new Float32Array([-1,-1,z[0],1,-1,z[1],0,1,z[2]]);
          const colors=(red,blue)=>new Float32Array([red,0,blue,red,0,blue,red,0,blue]);
          const redPos=buffer(verts([-.5,.5,.5])),bluePos=buffer(verts([.5,-.5,-.5]));
          const redCol=buffer(colors(1,0)),blueCol=buffer(colors(0,1));
          testRenderer={gl:gpu,program:baseProgram,mvp:gpu.getUniformLocation(baseProgram,'uMVP'),
            surfacePos:redPos,surfaceColor:redCol,surfaceCount:3};
          const second={gl:gpu,surfacePos:bluePos,surfaceColor:blueCol,surfaceCount:3,faceFieldCount:0};
          fvRegionScene.layers=new Map([['crossed-second',second]]);
          fvRegionScene.choices=new Map([['crossed-second',{visible:true,opacity:.5}]]);
          gpu.enable(gpu.BLEND);
          const opts={primaryVisible:true,showSurface:true,showSlice:false,showIso:false,
            opacity:.5,interiorActive:false};
          const sample=(x,y)=>{
            const px=new Uint8Array(4);
            gpu.readPixels(x,y,1,1,gpu.RGBA,gpu.UNSIGNED_BYTE,px);
            return Array.from(px)
          };
          const draw=(redFirst)=>{
            testRenderer.surfacePos=redFirst?redPos:bluePos;
            testRenderer.surfaceColor=redFirst?redCol:blueCol;
            second.surfacePos=redFirst?bluePos:redPos;
            second.surfaceColor=redFirst?blueCol:redCol;
            gpu.bindFramebuffer(gpu.FRAMEBUFFER,null);
            gpu.viewport(0,0,64,64);gpu.clearColor(0,0,0,0);
            gpu.clear(gpu.COLOR_BUFFER_BIT|gpu.DEPTH_BUFFER_BIT);
            if(!fvDrawWeightedOit(testRenderer,opts,off))
              throw new Error('Native crossed WebGL2 weighted path did not activate: '+
                String(testRenderer.weightedOitDisabled||'unknown'));
            return[sample(24,24),sample(40,24)]
          };
          const first=draw(true),reversed=draw(false);
          const maxDiff=Math.max(...first.flatMap((a,i)=>a.map((v,j)=>
            Math.abs(v-reversed[i][j]))));
          const nonBlank=first.every(a=>a[3]>0&&a[0]>10&&a[2]>10);
          const error=gpu.getError();
          weightedCrossedPixelProof={supported:true,ok:maxDiff<=8&&nonBlank&&error===0,
            first,reversed,maxDiff,nonBlank,glError:error,
            crossing:'left blue near / right red near; alpha=0.5 each',
            scope:'real WebGL2 offscreen raster of crossed synthetic surfaces using production weighted OIT; approximate not exact'};
          if(!weightedCrossedPixelProof.ok)
            throw new Error('Native crossed weighted OIT pixel mismatch: '+
              JSON.stringify(weightedCrossedPixelProof))
        }finally{
          fvState.camera=savedCamera;fvState.fieldStorage=savedStorage;
          fvRegionScene.layers=savedLayers;fvRegionScene.choices=savedChoices;
          if(testRenderer)fvWeightedOitRelease(testRenderer);
          for(const buffer of buffers)gpu.deleteBuffer(buffer);
          if(baseProgram)gpu.deleteProgram(baseProgram);
          fvRender()
        }
      }
    }
    physicalScene.weightedCrossedPixelProof=weightedCrossedPixelProof;
    if(physicalScene.weightedOit.active&&!weightedCrossedPixelProof.supported)
      throw new Error('Active native weighted OIT must not skip its crossed-surface pixel acceptance fixture');
    // In the real imported OpenFOAM metal/mold WebGL context, draw both
    // measured physical surfaces fully opaque. Their shared interface may
    // contain coincident raster depths. The temporary tie-bias must never
    // remain enabled during transparent passes, probes or later frames.
    const mainAlpha=document.getElementById('fvOpacity');
    const moldName=expected.find(name=>name!==primary);
    const moldChoice=fvRegionChoice(c,moldName);
    if(!mainAlpha||!moldChoice)throw new Error('Opaque interface smoke controls unavailable');
    const savedMainAlpha=mainAlpha.value,savedMoldAlpha=moldChoice.opacity;
    let opaqueDepth=null;
    try{
      mainAlpha.value='1';moldChoice.opacity=1;fvRender();
      opaqueDepth={surfaceEnabled:!!document.getElementById('fvSurface')?.checked,
        regionCount:api.state().layers.size,allOpaque:!!mainAlpha&&moldChoice.opacity===1,
        polygonOffsetEnabled:gl.isEnabled(gl.POLYGON_OFFSET_FILL),
        polygonOffsetFactor:gl.getParameter(gl.POLYGON_OFFSET_FACTOR),
        polygonOffsetUnits:gl.getParameter(gl.POLYGON_OFFSET_UNITS),
        webglError:gl.getError()};
      if(!opaqueDepth.surfaceEnabled||!opaqueDepth.allOpaque||
        opaqueDepth.regionCount!==expected.length-1||
        opaqueDepth.polygonOffsetEnabled||opaqueDepth.polygonOffsetFactor!==0||
        opaqueDepth.polygonOffsetUnits!==0||opaqueDepth.webglError!==0)
        throw new Error('Real OpenFOAM opaque interface raster state leak: '+JSON.stringify(opaqueDepth))
    }finally{
      mainAlpha.value=savedMainAlpha;moldChoice.opacity=savedMoldAlpha;fvRender()
    }
    physicalScene.opaqueInterfaceDepthPolicy=opaqueDepth;
    // Native scientific negative fixture: use the ACTUAL imported OpenFOAM
    // geometry while temporarily restricting the discovery metadata to times
    // truly present in this same region (excluding this frame). No field
    // values or synthetic physical time are ever introduced.
    const missingRegion=expected.find(name=>name!==primary);
    const selectedGroup=(c.discoveryModel?.fields||[]).find(g=>
      String(g?.region||'')===missingRegion&&g?.name==='T'&&Array.isArray(g.times));
    if(!selectedGroup)throw new Error('Real OpenFOAM secondary T group unavailable for missing-frame test');
    const originalTimes=selectedGroup.times;
    let missingFrame=null;
    try{
      selectedGroup.times=originalTimes.filter(raw=>{
        const valid=api.physicalTime(raw);
        return Number.isFinite(valid)&&!fvTimeEqual(valid,fvState.time)
      });
      await api.load(c,fvState.time);
      const unavailable=api.state().layers.get(missingRegion);
      const row=[...(document.getElementById('fvMultiRegionRows')?.querySelectorAll('[data-fv-region-row]')||[])]
        .find(el=>el.dataset.fvRegionRow===missingRegion);
      const legend=row?.querySelector('.fvRegionLegend');
      const hasScale=!!legend?.querySelector('.fvRegionLegendBar');
      const explicitMissing=!!legend&&/Geometry only|Solo geometría/i.test(legend.textContent||'');
      missingFrame={region:missingRegion,legendPresent:!!legend,explicitMissing,
        sourceTime:unavailable?.sourceTime??null,
        geometryOnly:unavailable?.geometryOnly===true,
        measuredColors:unavailable?.colored===true,
        cellCount:Number(unavailable?.mesh?.cellCount||0),
        sameWebGL:unavailable?.gl===gl,hasScale,
        remainingTimes:selectedGroup.times.map(api.physicalTime),
        originalTimes:originalTimes.map(api.physicalTime)};
      if(!missingFrame.geometryOnly||missingFrame.measuredColors||missingFrame.sourceTime!==null||
        !(missingFrame.cellCount>0)||!missingFrame.sameWebGL||hasScale||!missingFrame.explicitMissing)
        throw new Error('Real geometry-only physical frame contract failed: '+JSON.stringify(missingFrame))
    }finally{
      selectedGroup.times=originalTimes;
      await api.load(c,fvState.time)
    }
    const restored=api.state().layers.get(missingRegion),restoredGpu=api.gpuPayloadStats?.();
    missingFrame.restoredMeasured=!!restored?.fieldValues?.length&&restored.geometryOnly===false&&
      fvTimeEqual(restored.sourceTime,fvState.time);
    missingFrame.restoredGpuPayloadBytes=Number(restoredGpu?.payloadBytes||0);
    missingFrame.restoredGpuRegions=Number(restoredGpu?.regionCount||0);
    // Repeated measured → missing → measured frames must not accumulate
    // extra WebGL uploads. Both passes retain the same physical geometry.
    if(!missingFrame.restoredMeasured||
      missingFrame.restoredGpuRegions!==physicalScene.secondaryGpuRegions||
      missingFrame.restoredGpuPayloadBytes!==physicalScene.secondaryGpuPayloadBytes)
      throw new Error('Real measured region or GPU payload not restored after missing-frame test: '+JSON.stringify(missingFrame));
    physicalScene.missingFrame=missingFrame;
    if(options.asymmetricCase){
      // A fifth independent copy of the REAL QuickCup case omits the actual
      // 9.8/mold/T file on disk while retaining 0/mold/T and 9.8/metal/T.
      // Validate discovery, physical time, geometry, legend and restoration
      // in the real packaged native frontend without manufacturing values.
      const previous={caseName:String(fvCase()?.name||''),region:primary,
        field:String(document.getElementById('fvField')?.value||''),time:frameTime};
      let asymmetric=null;
      try{
        await selectSmokeCase(options.asymmetricCase);
        const c2=fvCase();
        const regionControl=document.getElementById('fvRegion');
        if(regionControl.value!==primary){regionControl.value=primary;fvRefreshSelectors(true)}
        const fieldControl=document.getElementById('fvField');
        fieldControl.value='T';fvState.fieldName='T';
        await fvLoadSelection();
        const metalGroup=fvFieldGroups(c2,primary,null,'any').find(g=>g.name==='T');
        const moldName=expected.find(name=>name!==primary);
        const moldGroup=fvFieldGroups(c2,moldName,null,'any').find(g=>g.name==='T');
        const metalTimes=(metalGroup?.times||[]).map(api.physicalTime).filter(Number.isFinite);
        const moldTimes=(moldGroup?.times||[]).map(api.physicalTime).filter(Number.isFinite);
        const targetIndex=(metalGroup?.times||[]).findIndex(t=>
          fvTimeEqual(api.physicalTime(t),previous.time));
        if(targetIndex<0||!moldTimes.length||moldTimes.some(t=>fvTimeEqual(t,previous.time))||
          !metalTimes.some(t=>fvTimeEqual(t,previous.time)))
          throw new Error('Asymmetric on-disk OpenFOAM T discovery is inconsistent: '+
            JSON.stringify({metalTimes,moldTimes,targetTime:previous.time}));
        await fvLoadFrame(targetIndex);
        await api.load(c2,fvState.time);
        const layer=api.state().layers.get(moldName),sameGl=fvState.renderer?.gl;
        const row=[...(document.getElementById('fvMultiRegionRows')?.querySelectorAll('[data-fv-region-row]')||[])]
          .find(el=>el.dataset.fvRegionRow===moldName);
        const legend=row?.querySelector('.fvRegionLegend');
        const noScale=!legend?.querySelector('.fvRegionLegendBar');
        const notice=!!legend&&/Geometry only|Solo geometría/i.test(legend.textContent||'');
        asymmetric={ok:!!layer&&layer.geometryOnly===true&&layer.sourceTime===null&&
          !layer.colored&&layer.gl===sameGl&&layer.mesh?.cellCount>0&&
          !!fvState.fieldValues?.length&&fvTimeEqual(fvState.time,previous.time)&&
          noScale&&notice&&api.gpuPayloadStats().regionCount===1,
          caseName:String(c2.name||''),metalTimes,moldTimes,targetTime:previous.time,
          moldGeometryOnly:layer?.geometryOnly===true,moldMeasuredTime:layer?.sourceTime??null,
          moldCells:Number(layer?.mesh?.cellCount||0),sameWebGL:layer?.gl===sameGl,
          noScale,notice,secondaryGpuPayloadBytes:api.gpuPayloadStats().payloadBytes};
        if(!asymmetric.ok)throw new Error('Actual on-disk asymmetric metal/mold scene failed: '+JSON.stringify(asymmetric))
      }finally{
        // Don't leave the test itself switched away from the owner's real
        // B13 scene; downstream native probe/case assertions still apply.
        await selectSmokeCase(previous.caseName);
        const regionControl=document.getElementById('fvRegion');
        if(regionControl.value!==previous.region){regionControl.value=previous.region;fvRefreshSelectors(true)}
        const fieldControl=document.getElementById('fvField');
        fieldControl.value=previous.field;fvState.fieldName=previous.field;
        await fvLoadSelection();
        const restoredTimes=fvCurrentFieldGroup()?.times||[];
        const restoreIndex=restoredTimes.findIndex(t=>fvTimeEqual(api.physicalTime(t),previous.time));
        if(restoreIndex<0)throw new Error('Could not restore real selected OpenFOAM physical frame');
        await fvLoadFrame(restoreIndex);await api.load(fvCase(),fvState.time)
      }
      physicalScene.asymmetric=asymmetric
    }
  }
  const range=fvFiniteRange(fvState.fieldValues);
  const gl=fvState.renderer?.gl||null,performanceStats=window.FoamLensPerformance?.stats?.()||null;
  return{
    physicalScene,
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
    plotSurfaceFieldDataPlotBlocked:!!plotSurfaceSmoke?.blockedDataPlot,
    plotSurfaceDataAfterFieldRoundTrip:!!plotSurfaceSmoke?.dataAfterFieldRoundTrip,
    plotSurfaceField3DRestored:!!plotSurfaceSmoke?.field3DRestored,
    plotSurfaceLegacyViewRequest:plotSurfaceSmoke?'timeseries':'',
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
    // These bounded flags must be EXPORTED by the native smoke JSON; keeping
    // them only in sessionSmoke previously caused false diagnostic negatives.
    sessionReplayStatus:String(sessionSmoke?.sessionReplayStatus||'unavailable'),
    sessionSavedFresh,
    sessionReplayApiPresent,
    sessionStoredFieldSelectionPresent:sessionSavedFieldSelectionPresent,
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
        if (DeveloperEdition)
        {
            if (userInitiated)
                MessageBox.Show(this,
                    "FoamLens Developer is updated only by rebuilding the private developer edition.",
                    "FoamLens Developer", MessageBoxButtons.OK, MessageBoxIcon.Information);
            return;
        }
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
            ? htmlNode.GetString() ?? "https://github.com/michels-lab/FoamLens/releases"
            : "https://github.com/michels-lab/FoamLens/releases";
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
        var officialInstallerUrl = UpdateAssetIntegrity.RequireOfficialReleaseAsset(
            release.InstallerUrl!, release.Tag, release.InstallerName);
        var officialChecksumUrl = UpdateAssetIntegrity.RequireOfficialReleaseAsset(
            release.ChecksumUrl!, release.Tag, release.InstallerName + ".sha256");
        await DownloadUpdateFileAsync(officialInstallerUrl.AbsoluteUri, installerPath);
        await DownloadUpdateFileAsync(officialChecksumUrl.AbsoluteUri, checksumPath);

        var checksumInfo = new FileInfo(checksumPath);
        if (checksumInfo.Length is < 64 or > 4096)
            throw new InvalidDataException("FoamLens update checksum exceeds the permitted manifest size.");
        var checksumText = await File.ReadAllTextAsync(checksumPath, Encoding.ASCII);
        var expectedHash = UpdateAssetIntegrity.RequireExactSha256(checksumText, release.InstallerName);

        await using var installerStream = File.OpenRead(installerPath);
        var actualHash = Convert.ToHexString(await SHA256.HashDataAsync(installerStream));
        if (!string.Equals(expectedHash, actualHash, StringComparison.OrdinalIgnoreCase))
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
                    if (DeveloperEdition)
                    {
                        MessageBox.Show(this, "Developer builds are updated only by private recompilation.",
                            "FoamLens Developer", MessageBoxButtons.OK, MessageBoxIcon.Information);
                        break;
                    }
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
        var catalogFiles = new List<NativeCaseCatalog.Entry>();
        var catalogDirs = new List<NativeCaseCatalog.DirectoryEntry>();
        bool complete = true;
        var nextProgress = Stopwatch.StartNew();
        var scanClock = Stopwatch.StartNew();
        long scannedBytes = 0;

        while (stack.Count > 0)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var dir = stack.Pop();
            folders++;
            try
            {
                catalogDirs.Add(new NativeCaseCatalog.DirectoryEntry(
                    Path.GetRelativePath(rootPath, dir).Replace('\\', '/'),
                    new DirectoryInfo(dir).LastWriteTimeUtc.Ticks));
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
                    var exists = info.Exists;
                    if (!exists) complete = false;
                    var size = exists ? info.Length : 0;
                    var modifiedUtc = exists ? info.LastWriteTimeUtc : DateTime.MinValue;
                    scannedBytes = size >= long.MaxValue - scannedBytes ? long.MaxValue : scannedBytes + size;
                    catalogFiles.Add(NativeCaseCatalog.FileEntry(relative, size, modifiedUtc.Ticks));
                    chunk.Add(new NativeFileRef(
                        token,
                        info.Name,
                        $"{rootName}/{relative}",
                        size,
                        exists ? new DateTimeOffset(modifiedUtc).ToUnixTimeMilliseconds() : 0));

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
            catch (UnauthorizedAccessException ex) { complete = false; Log($"Skipped {dir}: {ex.Message}"); }
            catch (IOException ex) { complete = false; Log($"Skipped {dir}: {ex.Message}"); }
        }

        if (chunk.Count > 0) Post(new { type = "folderChunk", requestId, files = chunk.ToArray() });
        cancellationToken.ThrowIfCancellationRequested();
        var enumerationMilliseconds = scanClock.ElapsedMilliseconds;
        // The scientific folder is ready as soon as its complete listing has arrived.
        // Persisting an optional structural catalog must never hold the first plot hostage.
        Post(new {
            type = "folderComplete", requestId, folderName = rootName, files, folders,
            catalogStatus = "deferred", sourceBytes = scannedBytes, partial = !complete,
            enumerationMilliseconds
        });

        try
        {
            // A fresh listing and all actual data reads remain authoritative; this
            // local checkpoint never supplies numerical values or field dimensions.
            var checkpoint = NativeCaseCatalog.CommitAsync(rootPath, catalogFiles, catalogDirs,
                complete, cancellationToken).GetAwaiter().GetResult();
            Log($"Native inventory: {checkpoint.Status}; scan={enumerationMilliseconds}ms; " +
                $"checkpoint={scanClock.ElapsedMilliseconds - enumerationMilliseconds}ms");
        }
        catch (OperationCanceledException)
        {
            // Cancellation after folderComplete may skip optional catalog persistence,
            // but must not retract the already delivered, valid file listing.
        }
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
            var result = await Task.Run(
                () => NativeTemporalCache.GetOrParseAsync(
                    path, ct => ParseTemporalFileAsync(path, requestId, ct), operation.Token),
                operation.Token);
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
                return await NativeTemporalCache.GetOrParseAsync(
                    path, async ct =>
                    {
                        var parsed = await ParseOpenFoamFieldAsync(path, requestId, ct).ConfigureAwait(false);
                        if (parsed.Supported && string.Equals(parsed.Format, "ascii", StringComparison.OrdinalIgnoreCase))
                        {
                            var boundaryPatches = await OpenFoamBoundarySupport.ReadFieldBoundaryPatchesAsync(
                                path, parsed.Kind, ct).ConfigureAwait(false);
                            parsed = parsed with { BoundaryPatches = boundaryPatches };
                        }
                        // Cache only complete, supported field results. Unsupported or
                        // unclosed native fields always re-enter the regular parser.
                        return parsed;
                    }, operation.Token, cacheKind: "field",
                    cacheEligible: result => result.Supported && result.Closed
                        && string.Equals(result.Format, "ascii", StringComparison.OrdinalIgnoreCase))
                    .ConfigureAwait(false);
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
        if (!ExternalNavigationPolicy.TryExternalHttpUrl(uri, out var externalUrl))
        {
            Reply(requestId, false, null, "Only safe external HTTP(S) browser links are allowed.");
            return;
        }
        if (!OpenExternal(externalUrl))
        {
            Reply(requestId, false, null, "The system could not open this link.");
            return;
        }
        Reply(requestId, true, new { uri = externalUrl }, null);
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

    private static bool OpenExternal(string? uri)
    {
        // Last-resort defense for ALL callers: WebView2, About links,
        // update links and the native JS bridge, not only click handlers.
        if (!ExternalNavigationPolicy.TryExternalHttpUrl(uri, out var externalUrl))
            return false;
        try
        {
            Process.Start(new ProcessStartInfo(externalUrl) { UseShellExecute = true });
            return true;
        }
        catch { return false; /* Never crash FoamLens if the OS browser is unavailable. */ }
    }

    private static void Log(string message)
    {
        try
        {
            var dir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), ProductDataFolder, "Desktop");
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
    // Verify exact serialization of the production native parser's private record
    // (not just a public test DTO), including IEEE special values and probe keys.
    internal static async Task RunTemporalRecordCacheSelfTestAsync()
    {
        var folder = Path.Combine(Path.GetTempPath(), "FoamLens-parser-cache-record-" + Guid.NewGuid().ToString("N"));
        var source = Path.Combine(folder, "raw-probe-values");
        var cache = Path.Combine(folder, "local-cache");
        Directory.CreateDirectory(folder);
        try
        {
            await File.WriteAllBytesAsync(source, new byte[] { 10, 20, 30 });
            var count = 0;
            Task<TemporalParseResult> Parse(CancellationToken ct)
            {
                ct.ThrowIfCancellationRequested();
                count++;
                return Task.FromResult(new TemporalParseResult(
                    new[] { new TemporalColumn(
                        new[] { 0.0, 0.25, 0.50 },
                        new[] { double.NaN, -7.25e-10, double.PositiveInfinity }) },
                    new Dictionary<int, string> { [0] = "(0 0 0)", [7] = "(0.01 0 0)" },
                    "# Probe 7 (0.01 0 0)", 3L));
            }

            var first = await NativeTemporalCache.GetOrParseAsync(source, Parse,
                CancellationToken.None, cache, minSourceBytes: 0);
            var second = await NativeTemporalCache.GetOrParseAsync(source, Parse,
                CancellationToken.None, cache, minSourceBytes: 0);
            if (count != 1 || first.Columns.Length != 1 || second.Columns.Length != 1 ||
                second.Columns[0].T.Length != 3 || second.Columns[0].T[2] != 0.50 ||
                !double.IsNaN(second.Columns[0].Y[0]) ||
                second.Columns[0].Y[1] != -7.25e-10 ||
                !double.IsPositiveInfinity(second.Columns[0].Y[2]) ||
                second.Probes.Count != 2 || second.Probes[7] != "(0.01 0 0)" ||
                second.Head != "# Probe 7 (0.01 0 0)" || second.SourceBytes != 3)
                throw new InvalidOperationException("Actual native scientific temporal record did not round-trip exactly through the persistent cache.");
        }
        finally
        {
            try { Directory.Delete(folder, recursive: true); } catch (IOException) { }
        }
    }

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
    internal static async Task RunFieldRecordCacheSelfTestAsync()
    {
        var folder = Path.Combine(Path.GetTempPath(), "FoamLens-field-cache-record-" + Guid.NewGuid().ToString("N"));
        var source = Path.Combine(folder, "time-0.5", "T");
        var cache = Path.Combine(folder, "local-cache");
        Directory.CreateDirectory(Path.GetDirectoryName(source)!);
        try
        {
            await File.WriteAllBytesAsync(source, new byte[] { 11, 22, 33 });
            var count = 0;
            Task<OpenFoamFieldParseResult> Parse(CancellationToken ct)
            {
                ct.ThrowIfCancellationRequested();
                count++;
                var record = OpenFoamFieldParseResult.FromUniformScalar(
                    "ascii", "volScalarField", "T", "[0 0 0 1 0 0 0]", 273.15, 3, 3);
                return Task.FromResult(record with
                {
                    Uniform = false, UniformScalar = null,
                    ScalarValues = new[] { 273.15, double.NaN, 315.125 },
                    Count = 3, DeclaredCount = 3, Closed = true
                });
            }

            var first = await NativeTemporalCache.GetOrParseAsync(source, Parse,
                CancellationToken.None, cache, minSourceBytes: 0, cacheKind: "field",
                cacheEligible: r => r.Supported && r.Closed);
            var second = await NativeTemporalCache.GetOrParseAsync(source, Parse,
                CancellationToken.None, cache, minSourceBytes: 0, cacheKind: "field",
                cacheEligible: r => r.Supported && r.Closed);
            if (count != 1 || !first.Supported || !second.Supported || !second.Closed ||
                second.FieldClass != "volScalarField" || second.Object != "T" ||
                second.Dimensions != "[0 0 0 1 0 0 0]" ||
                second.ScalarValues?.Length != 3 || second.ScalarValues[0] != 273.15 ||
                !double.IsNaN(second.ScalarValues[1]) || second.ScalarValues[2] != 315.125 ||
                second.Count != 3 || second.DeclaredCount != 3 ||
                second.SourceBytes != 3 || second.BytesRead != 3)
                throw new InvalidOperationException("Actual native 2D scalar OpenFOAM field did not round-trip exactly through a valid persistent cache.");
        }
        finally
        {
            try { Directory.Delete(folder, recursive: true); } catch (IOException) { }
        }
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
