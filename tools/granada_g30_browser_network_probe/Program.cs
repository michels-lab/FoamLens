// G30 QA-only disposable Windows Chromium connectivity proof.
// Never read personal browser profiles, OpenFOAM cases, or store response bodies.
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;
using System.Windows.Forms;

namespace FoamLensG30BrowserNetworkProbe;
internal static class Program
{
    [STAThread]
    private static int Main(string[] args)
    {
        if (args.Length != 2 || (args[0] != "online" && args[0] != "offline"))
            return 2;
        if (Environment.GetEnvironmentVariable("GITHUB_ACTIONS") != "true" ||
            Environment.GetEnvironmentVariable("RUNNER_OS") != "Windows" ||
            Environment.GetEnvironmentVariable("RUNNER_ENVIRONMENT") != "github-hosted")
            return 2;
        var root = Path.GetFullPath(Environment.GetEnvironmentVariable("GITHUB_WORKSPACE") ?? "");
        var profile = Path.GetFullPath(args[1]);
        if (!profile.StartsWith(root.TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar,
                                StringComparison.OrdinalIgnoreCase))
            return 2;
        ApplicationConfiguration.Initialize();
        using var hardStop = new System.Threading.Timer(_ =>
        {
            Console.Error.WriteLine("G30 native Chromium probe timeout (no connectivity verdict)");
            Environment.Exit(3);
        }, null, TimeSpan.FromSeconds(85), System.Threading.Timeout.InfiniteTimeSpan);
        using var form = new NetworkProbeForm(args[0], profile);
        Application.Run(form);
        return form.Result;
    }
}
internal sealed class NetworkProbeForm : Form
{
    private readonly string _mode, _profile;
    private readonly WebView2 _view = new() { Dock = DockStyle.Fill };
    internal int Result { get; private set; } = 1;
    internal NetworkProbeForm(string mode, string profile)
    {
        _mode = mode; _profile = profile;
        Text = "FoamLens G30 disposable native Chromium QA";
        Width = 800; Height = 600;
        Controls.Add(_view);
    }
    protected override async void OnShown(EventArgs e)
    {
        base.OnShown(e);
        try
        {
            var environment = await CoreWebView2Environment.CreateAsync(null, _profile);
            await _view.EnsureCoreWebView2Async(environment);
            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(65));
            var nav = new TaskCompletionSource<CoreWebView2NavigationCompletedEventArgs>(
                TaskCreationOptions.RunContinuationsAsynchronously);
            void Done(object? _, CoreWebView2NavigationCompletedEventArgs args) => nav.TrySetResult(args);
            _view.CoreWebView2.NavigationCompleted += Done;
            try
            {
                // Only the owning project's PUBLIC GitHub releases endpoint.
                // A different nonce prevents accidentally accepting an old cached page.
                var url = "https://api.github.com/repos/michels-lab/FoamLens/releases/latest?g30=" +
                    Guid.NewGuid().ToString("N");
                _view.CoreWebView2.Navigate(url);
                var result = await nav.Task.WaitAsync(cts.Token);
                var expectedSuccess = _mode == "online";
                if (result.IsSuccess != expectedSuccess)
                    throw new InvalidOperationException("actual WebView2 connectivity contradicted firewall state");
                // A navigation failure (not an HTTP status code) is required for blocked proof.
                // Never inspect, upload or echo any page content.
                Console.WriteLine("G30 native Chromium " + _mode +
                    " verification PASS: actual network navigation " +
                    (result.IsSuccess ? "succeeded" : "blocked") + " (response body not inspected)");
                Result = 0;
            }
            finally { _view.CoreWebView2.NavigationCompleted -= Done; }
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine("G30 native browser network verification FAIL: category=" +
                                    ex.GetType().Name);
            Result = 1;
        }
        finally
        {
            if (!IsDisposed && IsHandleCreated)
                BeginInvoke(new Action(Close));
        }
    }
}
