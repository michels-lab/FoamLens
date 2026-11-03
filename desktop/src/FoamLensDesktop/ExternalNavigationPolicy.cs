using System;

namespace FoamLensDesktop;

/// <summary>
/// Security boundary between untrusted WebView2 URLs and Windows ShellExecute.
/// Only public HTTP(S) links may launch the default browser. FoamLens's own
/// secure virtual host is handled entirely inside the embedded WebView2.
/// This file has no network access, no process launches and is testable
/// without installing a browser or downloading a research case.
/// </summary>
internal static class ExternalNavigationPolicy
{
    private const string LocalHost = "foamlens.local";

    internal static bool IsInternalNavigation(string? address)
    {
        if (!Uri.TryCreate(address, UriKind.Absolute, out var uri))
            return false;

        return uri.Scheme.Equals(Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase)
            && uri.Host.Equals(LocalHost, StringComparison.OrdinalIgnoreCase)
            && uri.Port == 443
            && string.IsNullOrEmpty(uri.UserInfo)
            && !uri.IsFile;
    }

    internal static bool TryExternalHttpUrl(string? address, out string normalized)
    {
        normalized = "";
        if (string.IsNullOrWhiteSpace(address) ||
            !Uri.TryCreate(address, UriKind.Absolute, out var uri))
            return false;

        if (uri.Scheme != Uri.UriSchemeHttps && uri.Scheme != Uri.UriSchemeHttp)
            return false;

        // The internal Foamlens origin must never be opened by ShellExecute,
        // even when an attacker supplies an unsafe http:// variant.
        if (uri.Host.Equals(LocalHost, StringComparison.OrdinalIgnoreCase))
            return false;

        if (uri.HostNameType is UriHostNameType.Unknown or UriHostNameType.Basic ||
            !string.IsNullOrEmpty(uri.UserInfo) ||
            uri.IsFile || uri.IsLoopback ||
            uri.Host.EndsWith(".local", StringComparison.OrdinalIgnoreCase))
            return false;

        // Do not send raw user-supplied paths, custom protocols or relative
        // strings to Windows shell URL protocol handlers.
        normalized = uri.AbsoluteUri;
        return true;
    }
}
