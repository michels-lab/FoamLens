// G24 PRIVATE TEST HARNESS ONLY. No product app edits, no original user storage export.
// Run on disposable hosted Windows with the ACTUAL FoamLens origin and userData folder.
using System.Text.Json;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;
using System.Windows.Forms;

namespace FoamLensG24StorageProbe;

internal static class Program
{
    [STAThread]
    private static int Main(string[] args)
    {
        if (args.Length != 5 || !new[] { "write", "verify", "absent", "clear" }.Contains(args[0]) ||
            !new[] { "foamlens.local", "isolation.foamlens.local" }.Contains(args[4]))
        {
            Console.Error.WriteLine("G24 arguments: mode profile-directory original-installed-app-folder one-time-token origin");
            return 2;
        }
        if (Environment.GetEnvironmentVariable("GITHUB_ACTIONS") != "true" ||
            Environment.GetEnvironmentVariable("RUNNER_ENVIRONMENT") != "github-hosted" ||
            Environment.GetEnvironmentVariable("RUNNER_OS") != "Windows")
        {
            Console.Error.WriteLine("G24 only supports a disposable hosted Windows runner; never connect personal WebView2 profiles.");
            return 2;
        }
        var workspace = Environment.GetEnvironmentVariable("GITHUB_WORKSPACE");
        if (string.IsNullOrWhiteSpace(workspace))
            return 2;
        var profile = Path.GetFullPath(args[1]);
        var app = Path.GetFullPath(args[2]);
        var fullWorkspace = Path.GetFullPath(workspace).TrimEnd(Path.DirectorySeparatorChar);
        // Original userData is under disposable runner %LOCALAPPDATA%; never write to arbitrary dirs.
        var local = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData).TrimEnd(Path.DirectorySeparatorChar);
        if (!profile.StartsWith(local + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase) ||
            !app.StartsWith(fullWorkspace + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase) &&
            !app.StartsWith(local + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase) ||
            args[3].Length < 16 || args[3].Length > 150 ||
            !File.Exists(Path.Combine(app, "index.html")) ||
            new FileInfo(Path.Combine(app, "index.html")).Length < 100_000)
        {
            Console.Error.WriteLine("G24 failed closed: wrong profile, frontend, or synthetic probe identity.");
            return 2;
        }
        ApplicationConfiguration.Initialize();
        // Independent thread-pool deadline also terminates a frozen STA/WebView2 renderer.
        using var deadline = new System.Threading.Timer(_ => {
            Console.Error.WriteLine("G24 real WebView2 stage hard-timeout after 115 seconds");
            Environment.Exit(3);
        }, null, TimeSpan.FromSeconds(115), System.Threading.Timeout.InfiniteTimeSpan);
        using var form = new ProbeForm(args[0], profile, app, args[3], args[4]);
        Application.Run(form);
        return form.Result;
    }
}

internal sealed class ProbeForm : Form
{
    private readonly WebView2 _view = new() { Dock = DockStyle.Fill };
    private readonly System.Windows.Forms.Timer _watchdog = new() { Interval = 90000 };
    private readonly string _mode, _profile, _app, _token, _host;
    internal int Result { get; private set; } = 1;

    internal ProbeForm(string mode, string profile, string app, string token, string host)
    {
        _mode = mode; _profile = profile; _app = app; _token = token; _host = host;
        Text = "FoamLens storage persistence CI (no personal data)";
        Width = 960; Height = 700;
        StartPosition = FormStartPosition.CenterScreen;
        Controls.Add(_view);
        _watchdog.Tick += (_, _) => {
            _watchdog.Stop();
            Result = 1;
            Console.Error.WriteLine("G24 FAIL: real WebView2 browser stage exceeded 90 seconds without a verified answer");
            Close();
        };
        _watchdog.Start();
    }

    protected override async void OnShown(EventArgs e)
    {
        base.OnShown(e);
        try
        {
            var environment = await CoreWebView2Environment.CreateAsync(null, _profile);
            await _view.EnsureCoreWebView2Async(environment);
            _view.CoreWebView2.SetVirtualHostNameToFolderMapping(_host, _app, CoreWebView2HostResourceAccessKind.Allow);
            var nav = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);
            void OnNavigation(object? sender, CoreWebView2NavigationCompletedEventArgs args) => nav.TrySetResult(args.IsSuccess);
            _view.CoreWebView2.NavigationCompleted += OnNavigation;
            try
            {
                _view.CoreWebView2.Navigate("https://" + _host + "/index.html?desktop=1");
                if (!await nav.Task.WaitAsync(TimeSpan.FromSeconds(55)))
                    throw new InvalidOperationException("Real FoamLens virtual-host navigation failed");
            }
            finally { _view.CoreWebView2.NavigationCompleted -= OnNavigation; }
            var loaded = await _view.CoreWebView2.ExecuteScriptAsync(
                "(()=>({origin:location.origin,loaded:document.readyState==='complete',title:document.title,hasIndexedDb:!!indexedDB}))()");
            using(var check = JsonDocument.Parse(loaded))
            {
                var v = check.RootElement;
                if (v.GetProperty("origin").GetString() != "https://" + _host ||
                    !v.GetProperty("loaded").GetBoolean() ||
                    !v.GetProperty("hasIndexedDb").GetBoolean() ||
                    !(v.GetProperty("title").GetString() ?? "").Contains("FoamLens", StringComparison.OrdinalIgnoreCase))
                    throw new InvalidOperationException("Actual FoamLens WebView2 origin and loaded original frontend not proven");
            }
            var input = JsonSerializer.Serialize(new { mode = _mode, token = _token });
            string script = """
(async () => {
  'use strict';
  const opt = __OPTIONS__;
  const key = '__foamlens_granada_g24_storage_probe_v1';
  const databaseName = '__foamlens_granada_g24_idb_v1';
  function wait(request) {
    return new Promise((resolve,reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('native IndexedDB request rejected'));
    });
  }
  async function existingDb() {
    if (!('databases' in indexedDB)) throw Error('Cannot safely inspect existing IDB databases');
    const all=await indexedDB.databases();
    if (!all.some(d => d.name===databaseName)) return null;
    return await wait(indexedDB.open(databaseName));
  }
  async function read(db) {
    if (!db || !db.objectStoreNames.contains('sentinels')) return null;
    const tx=db.transaction('sentinels','readonly');
    return (await wait(tx.objectStore('sentinels').get('g24'))) ?? null;
  }
  async function write(db) {
    const tx=db.transaction('sentinels','readwrite');
    const finished=new Promise((resolve,reject)=>{
      tx.oncomplete=()=>resolve(true);
      tx.onerror=()=>reject(Error('IndexedDB physical transaction failed'));
      tx.onabort=()=>reject(Error('IndexedDB physical transaction aborted'));
    });
    tx.objectStore('sentinels').put(opt.token,'g24');
    await finished;
  }
  try {
    if (!location.protocol.startsWith('https:')) throw Error('Not FoamLens secure local host');
    if (opt.mode==='write') {
      localStorage.setItem(key,opt.token);
      const request=indexedDB.open(databaseName,1);
      request.onupgradeneeded=()=>request.result.createObjectStore('sentinels');
      const db=await wait(request);
      try { await write(db); } finally { db.close(); }
    }
    if (opt.mode==='clear') {
      localStorage.removeItem(key);
      const old=await existingDb();
      if (old) old.close();
      await wait(indexedDB.deleteDatabase(databaseName));
    }
    const local=localStorage.getItem(key);
    const db=await existingDb();
    let actual=null;
    try { actual=await read(db); } finally { if(db)db.close(); }
    const expected=opt.mode==='write'||opt.mode==='verify'?opt.token:null;
    return {ok:local===expected && actual===expected,origin:location.origin,
       localPresent:local!==null,indexedDbPresent:actual!==null,
       mode:opt.mode,storageMatches:local===actual};
  } catch (err) {
    return {ok:false,mode:opt.mode,reason:String(err?.message||err).slice(0,120)};
  }
})()
""".Replace("__OPTIONS__", input, StringComparison.Ordinal);
            var output = await _view.CoreWebView2.ExecuteScriptAsync(script);
            using var result = JsonDocument.Parse(output);
            var data = result.RootElement;
            if (data.ValueKind != JsonValueKind.Object || !data.TryGetProperty("ok", out var ok) || !ok.GetBoolean() ||
                data.GetProperty("origin").GetString() != "https://" + _host)
                throw new InvalidOperationException("Actual native WebView2 storage state mismatched " + _mode);
            Console.WriteLine("G24 native WebView2 " + _mode +
                " PASS: original FoamLens frontend + real origin localStorage + IndexedDB; no stored values exposed.");
            Result = 0;
        }
        catch (Exception error)
        {
            Console.Error.WriteLine("G24 FAIL stage=" + _mode + " category=" + error.GetType().Name);
            Result = 1;
        }
        finally
        {
            _watchdog.Stop();
            if (!IsDisposed && IsHandleCreated)
                BeginInvoke(new Action(Close));
        }
    }
}
