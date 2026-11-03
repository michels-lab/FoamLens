using System;
using FoamLensDesktop;

namespace G25ExternalNavigationHarness;

internal static class Program
{
    private static int _checked;
    private static void Check(bool actual, bool expected, string url, string mode)
    {
        _checked++;
        if(actual != expected)
            throw new InvalidOperationException($"G25 {mode} unexpectedly {(actual ? "allowed" : "denied")} the URI class: {url}");
    }

    private static int Main()
    {
        try
        {
            foreach(var url in new[]
            {
                "https://foamlens.local/index.html?desktop=1",
                "https://FOAMLENS.local/another/path",
                "https://foamlens.local:443/index.html",
                "https://foamlens.local/#field"
            })
            {
                Check(ExternalNavigationPolicy.IsInternalNavigation(url), true, url, "internal");
                Check(ExternalNavigationPolicy.TryExternalHttpUrl(url, out _), false, url, "external");
            }

            foreach(var url in new[]
            {
                "http://foamlens.local/",
                "https://foamlens.local:8443/",
                "https://admin@foamlens.local/",
                "file:///C:/Windows/System32/calc.exe",
                "ms-settings:privacy",
                "ms-msdt:/id/PCWDiagnostic",
                "shell:AppsFolder",
                "javascript:alert(1)",
                "data:text/html,hello",
                "about:blank",
                "mailto:test@example.com",
                "ftp://example.com/test",
                "C:\\Windows\\System32\\calc.exe",
                "\\\\server\\share\\malware.exe",
                "https://localhost:443/",
                "http://127.0.0.1/",
                "https://[::1]/",
                "https://user:pass@github.com/",
                "https://foamlens.local.evil.local/",
                "http://example.local/",
                "https:///",
                "https://",
                "//github.com/test",
                ""
            })
            {
                Check(ExternalNavigationPolicy.IsInternalNavigation(url), false, url, "internal");
                Check(ExternalNavigationPolicy.TryExternalHttpUrl(url, out _), false, url, "external");
            }

            foreach(var url in new[]
            {
                "https://github.com/michels-lab/FoamLens",
                "https://www.instagram.com/realmichelduarte/",
                "https://www.facebook.com/realmichelduarte",
                "https://www.linkedin.com/in/realmichelduart/",
                "http://www.example.com/",
                "https://example.com/?x=1#section",
                "https://foamlens.local.evil.example/"
            })
            {
                Check(ExternalNavigationPolicy.IsInternalNavigation(url), false, url, "internal");
                Check(ExternalNavigationPolicy.TryExternalHttpUrl(url, out var normalized), true, url, "external");
                if (!normalized.StartsWith("http://", StringComparison.OrdinalIgnoreCase)
                    && !normalized.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
                    throw new InvalidOperationException("G25 returned nonbrowser URL");
                if(!Uri.TryCreate(normalized, UriKind.Absolute, out _))
                    throw new InvalidOperationException("G25 returned malformed browser URL");
            }
            Console.WriteLine($"G25 PASS {_checked} actual desktop shell navigation policy checks, including bad schemes, local host, loopback and official social links.");
            return 0;
        }
        catch(Exception exception)
        {
            Console.Error.WriteLine(exception.Message);
            return 1;
        }
    }
}
