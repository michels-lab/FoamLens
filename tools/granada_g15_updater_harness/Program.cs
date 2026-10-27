using FoamLensDesktop;
using System;
using System.IO;

const string installer = "FoamLens-Setup-v1.8.10.exe";
const string checksumFile = installer + ".sha256";
const string tag = "v1.8.10";
const string sha = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
var checks = 0;

void Accept(string label, Func<string> action, string expected)
{
    var got = action();
    if (!string.Equals(got, expected, StringComparison.OrdinalIgnoreCase))
        throw new Exception(label + ": unexpected accepted hash or URL. " + got);
    checks++;
    Console.WriteLine("PASS " + label);
}
void Reject(string label, Action action)
{
    try { action(); }
    catch (InvalidDataException)
    {
        checks++;
        Console.WriteLine("PASS reject " + label);
        return;
    }
    throw new Exception("FAILED to reject " + label);
}

Accept("checksum plain hash from exact named companion .sha256",
    () => UpdateAssetIntegrity.RequireExactSha256(sha, installer), sha);
Accept("GNU sha256sum two spaces",
    () => UpdateAssetIntegrity.RequireExactSha256(sha + "  " + installer + "\n", installer), sha);
Accept("GNU sha256sum binary marker",
    () => UpdateAssetIntegrity.RequireExactSha256(sha + " *" + installer + "\r\n", installer), sha);
Accept("UTF8 BOM and uppercase hash",
    () => UpdateAssetIntegrity.RequireExactSha256("\uFEFF" + sha.ToUpperInvariant() + "  " + installer, installer), sha);

Reject("wrong filename", () => UpdateAssetIntegrity.RequireExactSha256(sha + "  Other.exe", installer));
Reject("checksum line first hash for malicious file and later expected installer",
    () => UpdateAssetIntegrity.RequireExactSha256(sha + "  Malware.exe\n" + new string('a', 64) + "  " + installer, installer));
Reject("expected installer only in comment",
    () => UpdateAssetIntegrity.RequireExactSha256(sha + "  Malware.exe # " + installer, installer));
Reject("multiple valid entries", () => UpdateAssetIntegrity.RequireExactSha256(sha + "  " + installer +
    "\n" + new string('a', 64) + "  " + installer, installer));
Reject("missing SHA", () => UpdateAssetIntegrity.RequireExactSha256("SHA256 " + installer, installer));
Reject("partial hash", () => UpdateAssetIntegrity.RequireExactSha256(sha[..60] + "  " + installer, installer));
Reject("malformed digest", () => UpdateAssetIntegrity.RequireExactSha256(new string('z', 64) + "  " + installer, installer));
Reject("huge untrusted checksum", () => UpdateAssetIntegrity.RequireExactSha256(new string('x', 4097), installer));
Reject("embedded null byte", () => UpdateAssetIntegrity.RequireExactSha256(sha + "\0", installer));
Reject("path traversal in installer name", () => UpdateAssetIntegrity.RequireExactSha256(sha, "../" + installer));
Reject("checksum with directory path", () => UpdateAssetIntegrity.RequireExactSha256(sha + "  C:\\fake\\" + installer, installer));
Reject("checksum duplicate blank lines", () => UpdateAssetIntegrity.RequireExactSha256(sha + "\n\n" + sha, installer));
Reject("sha text plus untrusted prose", () => UpdateAssetIntegrity.RequireExactSha256(sha + "  " + installer + " # comment", installer));

const string goodInstallerUrl =
    "https://github.com/michels-lab/FoamLens/releases/download/" + tag + "/" + installer;
const string goodHashUrl = goodInstallerUrl + ".sha256";
Accept("official exact HTTPS installer path",
    () => UpdateAssetIntegrity.RequireOfficialReleaseAsset(goodInstallerUrl, tag, installer).AbsoluteUri,
    goodInstallerUrl);
Accept("official exact HTTPS checksum companion",
    () => UpdateAssetIntegrity.RequireOfficialReleaseAsset(goodHashUrl, tag, checksumFile).AbsoluteUri,
    goodHashUrl);
Reject("HTTP downgrade", () => UpdateAssetIntegrity.RequireOfficialReleaseAsset(
    goodInstallerUrl.Replace("https:", "http:", StringComparison.Ordinal), tag, installer));
Reject("unrelated repository", () => UpdateAssetIntegrity.RequireOfficialReleaseAsset(
    goodInstallerUrl.Replace("/FoamLens/", "/OtherRepo/", StringComparison.Ordinal), tag, installer));
Reject("lookalike subdomain", () => UpdateAssetIntegrity.RequireOfficialReleaseAsset(
    goodInstallerUrl.Replace("github.com", "github.com.evil.example", StringComparison.Ordinal), tag, installer));
Reject("other version asset", () => UpdateAssetIntegrity.RequireOfficialReleaseAsset(
    goodInstallerUrl.Replace("/v1.8.10/", "/v1.8.9/", StringComparison.Ordinal), tag, installer));
Reject("other binary", () => UpdateAssetIntegrity.RequireOfficialReleaseAsset(
    goodInstallerUrl.Replace(installer, "FoamLensDeveloper.exe", StringComparison.Ordinal), tag, installer));
Reject("fake query", () => UpdateAssetIntegrity.RequireOfficialReleaseAsset(
    goodInstallerUrl + "?alternate=1", tag, installer));
Reject("embedded account password", () => UpdateAssetIntegrity.RequireOfficialReleaseAsset(
    goodInstallerUrl.Replace("https://", "https://user:pass@", StringComparison.Ordinal), tag, installer));
Reject("nonstandard port", () => UpdateAssetIntegrity.RequireOfficialReleaseAsset(
    goodInstallerUrl.Replace("github.com/", "github.com:8443/", StringComparison.Ordinal), tag, installer));
Reject("URI fragment", () => UpdateAssetIntegrity.RequireOfficialReleaseAsset(
    goodInstallerUrl + "#other", tag, installer));

Console.WriteLine($"GRANADA G15 updater original C# source security invariants: {checks} passed.");
