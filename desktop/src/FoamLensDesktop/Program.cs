using System.Collections.Concurrent;
using System.Diagnostics;
using System.Globalization;
using System.IO.Compression;
using System.Reflection;
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
    private string AppRoot => Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
        "FoamLens", "Desktop", "1.4.1", "app");

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
                await RunSmokeTestAsync();
            else
                _web.CoreWebView2.Navigate("https://foamlens.local/index.html?desktop=1");
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
        var completion = new TaskCompletionSource<CoreWebView2NavigationCompletedEventArgs>(
            TaskCreationOptions.RunContinuationsAsynchronously);

        void OnNavigationCompleted(object? sender, CoreWebView2NavigationCompletedEventArgs e) =>
            completion.TrySetResult(e);

        _web.CoreWebView2.NavigationCompleted += OnNavigationCompleted;
        try
        {
            _web.CoreWebView2.Navigate("https://foamlens.local/index.html?desktop=1&smoke=1");

            var finished = await Task.WhenAny(
                completion.Task,
                Task.Delay(TimeSpan.FromSeconds(30)));
            if (finished != completion.Task)
                throw new TimeoutException("FoamLens smoke test timed out while loading the embedded frontend.");

            var navigation = await completion.Task;
            if (!navigation.IsSuccess)
                throw new InvalidOperationException(
                    $"FoamLens smoke-test navigation failed: {navigation.WebErrorStatus}");

            var readyState = await _web.CoreWebView2.ExecuteScriptAsync("document.readyState");
            if (!readyState.Contains("complete", StringComparison.OrdinalIgnoreCase))
                throw new InvalidOperationException(
                    $"FoamLens frontend did not reach document.readyState=complete: {readyState}");

            var hasRoot = await _web.CoreWebView2.ExecuteScriptAsync(
                "Boolean(document.body && document.body.innerText && document.body.innerText.includes('FoamLens'))");
            if (!string.Equals(hasRoot.Trim(), "true", StringComparison.OrdinalIgnoreCase))
                throw new InvalidOperationException("FoamLens frontend content was not visible after navigation.");

            var hasBridge = await _web.CoreWebView2.ExecuteScriptAsync(
                "typeof window.chrome?.webview?.postMessage === 'function'");
            if (!string.Equals(hasBridge.Trim(), "true", StringComparison.OrdinalIgnoreCase))
                throw new InvalidOperationException("FoamLens WebView2 native bridge is unavailable.");

            // Extension integration smoke: v14 Field View must actually mount
            // into the rendered Data View. Syntax-only validation cannot catch
            // an extension injected into the wrong lexical IIFE.
            var fieldViewUiJson = await _web.CoreWebView2.ExecuteScriptAsync(
                "(()=>{const tab=document.getElementById('fieldViewTab');const controls=document.getElementById('fieldViewControls');const panel=document.getElementById('fieldViewPanel');return {tab:!!tab,controls:!!controls,panel:!!panel,disabled:!!tab?.disabled,hiddenClass:!!tab?.classList.contains('hidden'),inlineDisplay:tab?.style?.display||'',text:tab?.innerText||''}})()");
            using (var fieldViewUi = JsonDocument.Parse(fieldViewUiJson))
            {
                var root = fieldViewUi.RootElement;
                var mounted =
                    root.TryGetProperty("tab", out var tabNode) && tabNode.GetBoolean() &&
                    root.TryGetProperty("controls", out var controlsNode) && controlsNode.GetBoolean() &&
                    root.TryGetProperty("panel", out var panelNode) && panelNode.GetBoolean();
                var enabled =
                    root.TryGetProperty("disabled", out var disabledNode) && !disabledNode.GetBoolean();
                var locallyVisible =
                    root.TryGetProperty("hiddenClass", out var hiddenNode) && !hiddenNode.GetBoolean() &&
                    root.TryGetProperty("inlineDisplay", out var inlineDisplayNode) &&
                    !string.Equals(inlineDisplayNode.GetString(), "none", StringComparison.OrdinalIgnoreCase);
                if (!mounted || !enabled || !locallyVisible)
                    throw new InvalidOperationException(
                        $"FoamLens Field View extension did not mount enabled/discoverable: {fieldViewUiJson}");
            }

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
            _web.CoreWebView2.NavigationCompleted -= OnNavigationCompleted;
        }
    }

    private void MaterializeBundle()
    {
        Directory.CreateDirectory(AppRoot);
        using var stream = Assembly.GetExecutingAssembly()
            .GetManifestResourceStream("FoamLensDesktop.AppBundle.zip")
            ?? throw new InvalidOperationException("Embedded FoamLens AppBundle.zip was not found.");
        ZipFile.ExtractToDirectory(stream, AppRoot, overwriteFiles: true);
    }

    private void ApplyFrontendExtensions()
    {
        var indexPath = Path.Combine(AppRoot, "index.html");
        var extensionPaths = Directory.GetFiles(AppRoot, "v*-*.js")
            .OrderBy(path => path, StringComparer.OrdinalIgnoreCase)
            .ToArray();
        if (extensionPaths.Length == 0) return;

        var html = File.ReadAllText(indexPath, Encoding.UTF8);
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
        html = html.Insert(insertionPoint, Environment.NewLine + extension + Environment.NewLine);
        File.WriteAllText(indexPath, html, new UTF8Encoding(encoderShouldEmitUTF8Identifier: false));
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

    private async Task HandleOpenFoamMeshAsync(JsonElement root, string requestId)
    {
        var paths = new[]
        {
            ResolveToken(RequiredString(root, "pointsToken")),
            ResolveToken(RequiredString(root, "facesToken")),
            ResolveToken(RequiredString(root, "ownerToken")),
            ResolveToken(RequiredString(root, "neighbourToken"))
        };
        var operation = BeginOperation(requestId);
        var totalBytes = paths.Sum(path => new FileInfo(path).Length);
        long completedBytes = 0;
        Post(new { type = "operationStart", requestId, operation = "openFoamMesh", completedBytes, totalBytes });

        try
        {
            var texts = new string[paths.Length];
            for (var i = 0; i < paths.Length; i++)
            {
                operation.Token.ThrowIfCancellationRequested();
                texts[i] = await File.ReadAllTextAsync(paths[i], Encoding.UTF8, operation.Token);
                completedBytes += new FileInfo(paths[i]).Length;
                Post(new { type = "operationProgress", requestId, operation = "openFoamMesh", completedBytes, totalBytes });
            }

            var result = await Task.Run(
                () => ParseOpenFoamMeshTexts(texts[0], texts[1], texts[2], texts[3], totalBytes, operation.Token),
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

    private static OpenFoamMeshParseResult ParseOpenFoamMeshTexts(
        string pointsText, string facesText, string ownerText, string neighbourText,
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

        var formats = new[] { pointFormat, faceFormat, ownerFormat, neighbourFormat };
        if (formats.Any(format => !string.Equals(format, "ascii", StringComparison.OrdinalIgnoreCase)))
            return OpenFoamMeshParseResult.Unsupported("binary-format", string.Join(",", formats.Distinct()), sourceBytes);
        if (faces.Length != owners.Length)
            return OpenFoamMeshParseResult.Unsupported("owner-face-count-mismatch", "ascii", sourceBytes);
        if (neighbours.Length > faces.Length)
            return OpenFoamMeshParseResult.Unsupported("neighbour-face-count-mismatch", "ascii", sourceBytes);

        var maxCell = -1;
        foreach (var v in owners) maxCell = Math.Max(maxCell, v);
        foreach (var v in neighbours) maxCell = Math.Max(maxCell, v);
        var cellCount = maxCell + 1;
        if (cellCount <= 0)
            return OpenFoamMeshParseResult.Unsupported("no-cells", "ascii", sourceBytes);

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

        // OpenFOAM stores internal-face point ordering with the face normal
        // pointing from owner to neighbour; boundary-face normals point out of
        // the domain. Use that orientation to integrate each closed polyhedral
        // cell into signed tetrahedra and obtain a volume-weighted centroid.
        // A mean-face-centre reference is used only as a numerically stable
        // local origin and as an explicit fallback for degenerate cells.
        var cellCenters = ComputePolyhedralCellCenters(
            pointList, faces, owners, neighbours, cellCount, ct, out var centroidFallbackCount);
        var cellCenterMethod = centroidFallbackCount == 0
            ? "volume-weighted-polyhedral"
            : $"volume-weighted-polyhedral-with-mean-face-fallback:{centroidFallbackCount}";

        var triangles = new List<int>();
        var triangleOwners = new List<int>();
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

        return new OpenFoamMeshParseResult(
            true, "", "ascii",
            pointList, triangles.ToArray(), triangleOwners.ToArray(), edges.ToArray(), cellCenters,
            faceOffsets, flattenedFacePoints.ToArray(), owners, neighbours,
            pointCount, faces.Length, internalFaceCount, faces.Length - internalFaceCount, cellCount,
            boundsMin, boundsMax, cellCenterMethod, sourceBytes);
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
            var result = await ParseOpenFoamFieldAsync(path, requestId, operation.Token);
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
            if (double.TryParse(split.Value.First, NumberStyles.Float, CultureInfo.InvariantCulture, out var tx) &&
                double.TryParse(split.Value.Second, NumberStyles.Float, CultureInfo.InvariantCulture, out var vy))
            {
                t.Add(tx); y.Add(vy);
            }
        }
        return new LogParseResult(index, t.ToArray(), y.ToArray(), null);
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
    }

    private sealed record LogBatchItem(string Token, int Index);
    private sealed record LogParseResult(int Index, double[] T, double[] Y, string? Error);
}
