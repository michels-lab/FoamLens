using System.IO.Compression;
using System.Reflection;
using System.Text;
using System.Text.RegularExpressions;

namespace FoamLensDesktop;

/// <summary>
/// The only authorized source of FoamLens versioned frontend JS is the ZIP embedded
/// in the running .NET assembly. Never read versioned JavaScript via a wildcard on
/// writable per-user AppRoot. No deletion, migration or WebView2 profile changes.
/// </summary>
internal static class TrustedEmbeddedFrontendExtensions
{
    private const string BundleResource = "FoamLensDesktop.AppBundle.zip";
    private const int MaxModuleCount = 256;
    private const long MaxModuleBytes = 8L * 1024 * 1024;
    private const long MaxTotalModuleBytes = 48L * 1024 * 1024;
    private const long MaxBundleBytes = 160L * 1024 * 1024;
    private static readonly Regex ModuleName = new(
        @"^v[0-9]+-[a-zA-Z0-9_-]+\.js$",
        RegexOptions.Compiled | RegexOptions.CultureInvariant);
    private static readonly UTF8Encoding StrictUtf8 = new(false, true);

    /// <summary>
    /// The returned text is extracted only from the signed/build-provenanced
    /// executable's embedded resource; disk-resident modules are never consulted.
    /// No arbitrary local filesystem path accepted.
    /// </summary>
    internal static string[] ReadFromRunningAssembly()
    {
        using var zipResource = Assembly.GetExecutingAssembly()
            .GetManifestResourceStream(BundleResource)
            ?? throw new InvalidDataException("Official embedded FoamLens frontend bundle is missing.");
        return ReadFromPackage(zipResource);
    }

    /// <summary>Pure fail-closed reader, callable by negative regressions with disposable ZIP fixtures.</summary>
    internal static string[] ReadFromPackage(Stream package)
    {
        ArgumentNullException.ThrowIfNull(package);
        using var archive = new ZipArchive(package, ZipArchiveMode.Read, leaveOpen: true);
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var selected = new List<ZipArchiveEntry>();
        foreach (var entry in archive.Entries)
        {
            var full = entry.FullName;
            if (string.IsNullOrEmpty(full) || full.Length > 512 ||
                full.Contains('\\') || full.StartsWith('/') ||
                full.Contains(':') || full.Split('/').Any(s => s is "." or ".." or "") &&
                    !full.EndsWith('/'))
                throw new InvalidDataException("Unsafe official frontend ZIP member path.");
            if (full.EndsWith('/')) continue;
            if (!seen.Add(full))
                throw new InvalidDataException("Duplicate or case-colliding official frontend ZIP member.");
            // Do not execute an archive symlink, even if its name resembles a JS module.
            if (((entry.ExternalAttributes >> 16) & 0xF000) == 0xA000)
                throw new InvalidDataException("ZIP symlinks are not trusted frontend source.");
            if (!ModuleName.IsMatch(full)) continue;
            if (entry.Length <= 0 || entry.Length > MaxModuleBytes)
                throw new InvalidDataException("Official frontend JS module exceeds source bounds.");
            selected.Add(entry);
            if (selected.Count > MaxModuleCount)
                throw new InvalidDataException("Too many official frontend JavaScript modules.");
        }

        if (selected.Count == 0)
            throw new InvalidDataException("Official FoamLens embedded frontend has no versioned JS modules.");

        // Mirror the original host's stable Windows ordinal-ignore-case ordering.
        selected.Sort((a, b) => StringComparer.OrdinalIgnoreCase.Compare(a.FullName, b.FullName));
        var sources = new string[selected.Count];
        long total = 0;
        for (var i = 0; i < selected.Count; i++)
        {
            var entry = selected[i];
            total = checked(total + entry.Length);
            if (total > MaxTotalModuleBytes)
                throw new InvalidDataException("Official frontend JavaScript exceeds total source budget.");
            using var input = entry.Open();
            using var memory = new MemoryStream((int)entry.Length);
            input.CopyTo(memory);
            if (memory.Length != entry.Length)
                throw new InvalidDataException("Incomplete official embedded frontend JS module.");
            var bytes = memory.ToArray();
            sources[i] = StrictUtf8.GetString(bytes).TrimStart('\uFEFF');
        }
        return sources;
    }
}
