using System;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;

namespace FoamLensDesktop;

/// <summary>
/// Fail-closed release checksum and asset URL identity. Does not download, launch
/// or trust a release merely because an unrelated 64-character hash appears.
/// </summary>
internal static class UpdateAssetIntegrity
{
    private static readonly Regex HashOnly = new(
        @"\A([0-9a-fA-F]{64})\z", RegexOptions.CultureInvariant);

    private static readonly Regex HashWithFilename = new(
        @"\A([0-9a-fA-F]{64})[ \t]+(\*?)([^\r\n]+)\z",
        RegexOptions.CultureInvariant);

    internal static string RequireExactSha256(string checksumText, string expectedInstallerName)
    {
        if (string.IsNullOrWhiteSpace(expectedInstallerName) ||
            !IsSafeSingleFilename(expectedInstallerName))
            throw new InvalidDataException("The expected update installer filename is invalid.");
        if (checksumText is null || checksumText.Length is < 64 or > 4096 ||
            checksumText.IndexOf('\0') >= 0)
            throw new InvalidDataException("The installer checksum manifest is missing or oversized.");

        var text = checksumText.Trim('\uFEFF', ' ', '\t', '\r', '\n');
        var rows = text.Split('\n', StringSplitOptions.None);
        if (rows.Length != 1)
            throw new InvalidDataException("The installer checksum must contain exactly one entry.");
        var line = rows[0].TrimEnd('\r');
        var hashOnly = HashOnly.Match(line);
        if (hashOnly.Success) return hashOnly.Groups[1].Value.ToUpperInvariant();

        var matched = HashWithFilename.Match(line);
        if (!matched.Success ||
            !string.Equals(matched.Groups[3].Value, expectedInstallerName, StringComparison.Ordinal))
            throw new InvalidDataException("The checksum does not identify exactly the expected installer.");
        return matched.Groups[1].Value.ToUpperInvariant();
    }

    internal static Uri RequireOfficialReleaseAsset(string url, string tag, string expectedAssetName)
    {
        if (!IsSafeSingleFilename(expectedAssetName) ||
            string.IsNullOrWhiteSpace(tag) ||
            !Uri.TryCreate(url, UriKind.Absolute, out var uri) ||
            uri.Scheme != Uri.UriSchemeHttps || !uri.IsDefaultPort ||
            !string.Equals(uri.Host, "github.com", StringComparison.OrdinalIgnoreCase) ||
            !string.IsNullOrEmpty(uri.UserInfo) ||
            !string.IsNullOrEmpty(uri.Query) ||
            !string.IsNullOrEmpty(uri.Fragment))
            throw new InvalidDataException("FoamLens update asset must originate from the official HTTPS GitHub release.");

        var segments = uri.AbsolutePath.Split('/', StringSplitOptions.RemoveEmptyEntries)
            .Select(Uri.UnescapeDataString).ToArray();
        if (segments.Length != 6 ||
            segments[0] != "michels-lab" || segments[1] != "FoamLens" ||
            segments[2] != "releases" || segments[3] != "download" ||
            segments[4] != tag || segments[5] != expectedAssetName)
            throw new InvalidDataException("FoamLens update asset URL does not match its exact release identity.");
        return uri;
    }

    private static bool IsSafeSingleFilename(string name) =>
        name is not "." and not ".." &&
        name.Length is > 0 and < 255 &&
        name.IndexOfAny(Path.GetInvalidFileNameChars()) < 0 &&
        name.IndexOf('/') < 0 && name.IndexOf('\\') < 0 &&
        name.IndexOf(':') < 0 &&
        name == Path.GetFileName(name);
}
