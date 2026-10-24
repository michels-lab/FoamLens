// QA-only original FoamLens local WebView2-origin storage witness.
// This harness does not inject code into the shipped app or inspect private case data.
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace FoamLensG33LocalOriginWitness;

internal static class Program
{
    [STAThread]
    private static int Main(string[] args)
    {
        if (args.Length != 4 ||
            Environment.GetEnvironmentVariable("GITHUB_ACTIONS") != "true" ||
            Environment.GetEnvironmentVariable("RUNNER_OS") != "Windows" ||
            Environment.GetEnvironmentVariable("RUNNER_ENVIRONMENT") != "github-hosted")
            return 2;
        var root = Path.GetFullPath(args[0]);
        var profile = Path.GetFullPath(args[1]);
        var local = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        var expectedRoot = Path.GetFullPath(Path.Combine(local, "FoamLens", "Desktop", "1.8.10", "app"));
        var expectedProfile = Path.GetFullPath(Path.Combine(local, "FoamLens", "Desktop", "WebView2"));
        if (!root.Equals(expectedRoot, StringComparison.OrdinalIgnoreCase) ||
            !profile.Equals(expectedProfile, StringComparison.OrdinalIgnoreCase) ||
            !Regex.IsMatch(args[2], @"^foamlens:g33:[a-f0-9]{32}$", RegexOptions.CultureInvariant) ||
            !(args[3] == "absent" || args[3] == "clear" || Regex.IsMatch(args[3], @"^[a-f0-9]{32}$")))
            return 2;
        ApplicationConfiguration.Initialize();
        using var timeout = new System.Threading.Timer(_ =>
        {
            Console.Error.WriteLine("G33 genuine Chromium readback timeout");
            Environment.Exit(3);
        }, null, TimeSpan.FromSeconds(70), System.Threading.Timeout.InfiniteTimeSpan);
        using var f = new WitnessForm(root, profile, args[2], args[3]);
        Application.Run(f);
        return f.Result;
    }
}

internal sealed class WitnessForm : Form
{
    private readonly string _root, _profile, _key, _expected;
    private readonly WebView2 _web = new() { Dock = DockStyle.Fill };
    internal int Result { get; private set; } = 1;

    internal WitnessForm(string root, string profile, string key, string expected)
    {
        _root = root; _profile = profile; _key = key; _expected = expected;
        Width = 640; Height = 480; Text = "G33 disposable original WebView2 origin witness";
        Controls.Add(_web);
    }
    protected override async void OnShown(EventArgs e)
    {
        base.OnShown(e);
        try
        {
            // A private QA readback page on the ORIGINAL foamlens.local mapped origin.
            // It reads synthetic marker storage without executing original test extension.
            var page = Path.Combine(_root, "g33-readback-only.html");
            File.WriteAllText(page, "<!doctype html><meta charset=\"utf-8\"><title>G33 local readback only</title>");
            var env = await CoreWebView2Environment.CreateAsync(null, _profile);
            await _web.EnsureCoreWebView2Async(env);
            _web.CoreWebView2.SetVirtualHostNameToFolderMapping(
                "foamlens.local", _root, CoreWebView2HostResourceAccessKind.Allow);
            var tcs = new TaskCompletionSource<CoreWebView2NavigationCompletedEventArgs>(
                TaskCreationOptions.RunContinuationsAsynchronously);
            void Done(object? _, CoreWebView2NavigationCompletedEventArgs e) => tcs.TrySetResult(e);
            _web.CoreWebView2.NavigationCompleted += Done;
            try
            {
                _web.CoreWebView2.Navigate("https://foamlens.local/g33-readback-only.html");
                var navigation = await tcs.Task.WaitAsync(TimeSpan.FromSeconds(35));
                if (!navigation.IsSuccess)
                    throw new InvalidOperationException("genuine Chromium same-origin readback navigation failed");
                var actualJson = await _web.CoreWebView2.ExecuteScriptAsync(
                    "window.localStorage.getItem(" + JsonSerializer.Serialize(_key) + ")");
                var actual = JsonSerializer.Deserialize<string?>(actualJson);
                if (_expected == "clear")
                {
                    var cleared = await _web.CoreWebView2.ExecuteScriptAsync(
                        "window.localStorage.removeItem(" + JsonSerializer.Serialize(_key) +
                        ");window.localStorage.getItem(" + JsonSerializer.Serialize(_key) + ")");
                    if (cleared.Trim() != "null")
                        throw new InvalidOperationException("G33 isolated marker key not cleared");
                    Console.WriteLine("G33 genuine WebView2 original profile synthetic key CLEAR PASS");
                }
                else if (_expected == "absent" && actual is null)
                    Console.WriteLine("G33 genuine WebView2 original profile marker ABSENT PASS");
                else if (_expected != "absent" && actual == _expected)
                    Console.WriteLine("G33 genuine WebView2 original profile marker PRESENT PASS: original FoamLens extension executed");
                else
                    throw new InvalidOperationException("G33 marker did not match expected source state");
                Result = 0;
            }
            finally { _web.CoreWebView2.NavigationCompleted -= Done; }
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine("G33 actual Chromium same-origin witness FAILED: " + ex.GetType().Name);
            Result = 1;
        }
        finally
        {
            if (!IsDisposed && IsHandleCreated) BeginInvoke(new Action(Close));
        }
    }
}
