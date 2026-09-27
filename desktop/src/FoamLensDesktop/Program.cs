using System.Collections.Concurrent;
using System.Diagnostics;
using System.Globalization;
using System.IO.Compression;
using System.Reflection;
using System.Text;
using System.Text.Json;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace FoamLensDesktop;

internal static class Program
{
    [STAThread]
    private static void Main()
    {
        ApplicationConfiguration.Initialize();
        Application.Run(new FoamLensForm());
    }
}

internal sealed class FoamLensForm : Form
{
    private readonly WebView2 _web = new() { Dock = DockStyle.Fill };
    private readonly ConcurrentDictionary<string, string> _fileTokens = new(StringComparer.Ordinal);
    private long _tokenSequence;
    private readonly JsonSerializerOptions _json = new(JsonSerializerDefaults.Web);
    private string AppRoot => Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
        "FoamLens", "Desktop", "1.3.0", "app");

    public FoamLensForm()
    {
        Text = "FoamLens Desktop";
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

            _web.CoreWebView2.Navigate("https://foamlens.local/index.html?desktop=1");
        }
        catch (Exception ex)
        {
            Log(ex.ToString());
            MessageBox.Show(this, ex.ToString(), "FoamLens Desktop failed to start",
                MessageBoxButtons.OK, MessageBoxIcon.Error);
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
        var extensionPath = Path.Combine(AppRoot, "v13-temporal-alignment.js");
        if (!File.Exists(extensionPath)) return;

        var html = File.ReadAllText(indexPath, Encoding.UTF8);
        var extension = File.ReadAllText(extensionPath, Encoding.UTF8);
        const string iifeClose = "})();";
        var insertionPoint = html.LastIndexOf(iifeClose, StringComparison.Ordinal);
        if (insertionPoint < 0)
            throw new InvalidOperationException("FoamLens frontend IIFE closing marker was not found.");

        // The extension is deliberately injected inside the existing frontend IIFE.
        // This lets it reuse the current series/case model without exposing that model
        // globally or duplicating scientific state in the native host.
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

        try
        {
            await Task.Run(() => EnumerateFolder(rootPath, rootName, requestId));
        }
        catch (Exception ex)
        {
            Log(ex.ToString());
            Post(new { type = "folderError", requestId, error = ex.Message });
        }
    }

    private void EnumerateFolder(string rootPath, string rootName, string requestId)
    {
        var stack = new Stack<string>();
        stack.Push(rootPath);
        var chunk = new List<NativeFileRef>(250);
        long files = 0, folders = 0;
        var nextProgress = Stopwatch.StartNew();

        while (stack.Count > 0)
        {
            var dir = stack.Pop();
            folders++;
            try
            {
                foreach (var sub in Directory.EnumerateDirectories(dir)) stack.Push(sub);
                foreach (var path in Directory.EnumerateFiles(dir))
                {
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

        var results = new ConcurrentBag<LogParseResult>();
        await Parallel.ForEachAsync(items,
            new ParallelOptions { MaxDegreeOfParallelism = Math.Max(2, Environment.ProcessorCount - 1) },
            async (item, ct) =>
            {
                try
                {
                    var result = await ParseFoamLogAsync(ResolveToken(item.Token), item.Index, ct);
                    results.Add(result);
                }
                catch (Exception ex)
                {
                    results.Add(new LogParseResult(item.Index, Array.Empty<double>(), Array.Empty<double>(), ex.Message));
                }
            });

        Reply(requestId, true, new { results = results.OrderBy(x => x.Index).ToArray() }, null);
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
    private sealed record LogBatchItem(string Token, int Index);
    private sealed record LogParseResult(int Index, double[] T, double[] Y, string? Error);
}
