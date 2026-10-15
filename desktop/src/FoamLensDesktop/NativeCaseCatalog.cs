using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace FoamLensDesktop;

// Structural checkpoint only. Never supplies OpenFOAM field values or dimensions.
internal static class NativeCaseCatalog
{
    const string Magic = "FoamLens-Case-Inventory-v1";
    const int MaxItems = 500_000, MaxBytes = 64 * 1024 * 1024;
    internal sealed record Entry(string Path, long Bytes, long ModifiedTicks, string Category);
    internal sealed record DirectoryEntry(string Path, long ModifiedTicks);
    private sealed record Snapshot(string RootHash, Entry[] Files, DirectoryEntry[] Directories);
    private sealed record Envelope(string Magic, string Sha256, string Payload);
    internal sealed record Result(string Status, int FileCount, int DirectoryCount, long SourceBytes);
    static string CacheRoot => Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
        "FoamLens", "Desktop", "ScientificCache", "case-inventory-v1");
    static string HashRoot(string root) => Convert.ToHexString(SHA256.HashData(
        Encoding.UTF8.GetBytes(Path.GetFullPath(root).ToUpperInvariant())));
    internal static string CatalogPath(string root, string cacheRoot)
    {
        var hash = HashRoot(root);
        return Path.Combine(cacheRoot, hash[..2], hash + ".flci");
    }
    internal static Entry FileEntry(string relative, long bytes, long ticks)
    {
        var path = relative.Replace('\\', '/');
        var segments = path.Split('/', StringSplitOptions.RemoveEmptyEntries);
        var kind = "other";
        if (segments.Any(s => s.Equals("postProcessing", StringComparison.OrdinalIgnoreCase)))
            kind = "postProcessing";
        else if (segments.Length > 0 && (segments[0].Equals("system", StringComparison.OrdinalIgnoreCase) ||
                 segments[0].Equals("constant", StringComparison.OrdinalIgnoreCase)))
            kind = "dictionaryCandidate";
        else if (segments.Length > 0 && (segments[0].Equals("logs", StringComparison.OrdinalIgnoreCase) ||
                 segments[0].StartsWith("log.", StringComparison.OrdinalIgnoreCase)))
            kind = "logCandidate";
        else
        {
            // Only a physical-time directory at the case root (or immediately below
            // processorN in a decomposed case) identifies a time field. An unrelated
            // numeric subfolder must not fabricate time metadata.
            var timeIndex = segments.Length > 1 && segments[0].StartsWith("processor", StringComparison.OrdinalIgnoreCase)
                && int.TryParse(segments[0]["processor".Length..], NumberStyles.None,
                    CultureInfo.InvariantCulture, out _) ? 1 : 0;
            if (segments.Length > timeIndex + 1 &&
                double.TryParse(segments[timeIndex], NumberStyles.Float,
                    CultureInfo.InvariantCulture, out var time) && double.IsFinite(time))
                kind = "timeFieldCandidate";
        }
        // Categories reflect paths only; no physical header or field class is inferred.
        return new Entry(path, Math.Max(0, bytes), ticks, kind);
    }
    internal static async Task<Result> CommitAsync(
        string root, IReadOnlyList<Entry> files, IReadOnlyList<DirectoryEntry> directories,
        bool complete, CancellationToken ct, string? cacheRoot = null)
    {
        ct.ThrowIfCancellationRequested();
        long bytes = 0;
        foreach (var f in files)
        {
            ct.ThrowIfCancellationRequested();
            bytes = f.Bytes >= long.MaxValue - bytes ? long.MaxValue : bytes + f.Bytes;
        }
        Result R(string state) => new(state, files.Count, directories.Count, bytes);
        if (!complete) return R("partial-not-cached");
        if (files.Count + (long)directories.Count > MaxItems) return R("too-large-not-cached");
        if (Environment.GetEnvironmentVariable("FOAMLENS_DISABLE_CASE_CATALOG") == "1")
            return R("disabled");
        try
        {
            var snapshot = new Snapshot(HashRoot(root),
                files.OrderBy(x => x.Path, StringComparer.Ordinal).ThenBy(x => x.Bytes)
                     .ThenBy(x => x.ModifiedTicks).ToArray(),
                directories.OrderBy(x => x.Path, StringComparer.Ordinal)
                           .ThenBy(x => x.ModifiedTicks).ToArray());
            var payload = JsonSerializer.Serialize(snapshot);
            if (Encoding.UTF8.GetByteCount(payload) > MaxBytes) return R("too-large-not-cached");
            var digest = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(payload)));
            var path = CatalogPath(root, cacheRoot ?? CacheRoot);
            if (File.Exists(path))
            {
                try
                {
                    if (new FileInfo(path).Length is > 0 and < (MaxBytes * 2L))
                    {
                        var saved = JsonSerializer.Deserialize<Envelope>(
                            await File.ReadAllTextAsync(path, ct));
                        if (saved?.Magic == Magic && saved.Sha256 == digest &&
                            saved.Payload == payload &&
                            Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(saved.Payload))) == digest)
                            return R("verified-identical");
                    }
                }
                catch (OperationCanceledException) { throw; }
                catch (Exception e) when (e is IOException or UnauthorizedAccessException or JsonException)
                {
                    // Corrupted previous catalog is never trusted or used to read research data.
                }
            }
            Directory.CreateDirectory(Path.GetDirectoryName(path)!);
            var staging = path + "." + Guid.NewGuid().ToString("N") + ".tmp";
            try
            {
                await File.WriteAllTextAsync(staging,
                    JsonSerializer.Serialize(new Envelope(Magic, digest, payload)), ct);
                ct.ThrowIfCancellationRequested();
                File.Move(staging, path, overwrite: true);
            }
            finally
            {
                try { if (File.Exists(staging)) File.Delete(staging); }
                catch (IOException) { }
            }
            return R("recorded");
        }
        catch (OperationCanceledException) { throw; }
        catch (Exception e) when (e is IOException or UnauthorizedAccessException or JsonException or ArgumentException)
        {
            return R("unavailable"); // Never block a real scientific source scan for metadata cache I/O.
        }
    }

    internal static async Task RunSelfTestAsync()
    {
        var temp = Path.Combine(Path.GetTempPath(), "FoamLens-case-catalog-" + Guid.NewGuid().ToString("N"));
        var root = Path.Combine(temp, "case");
        var cache = Path.Combine(temp, "catalog");
        Directory.CreateDirectory(Path.Combine(root, "0", "metal"));
        try
        {
            var file = Path.Combine(root, "0", "metal", "T");
            await File.WriteAllTextAsync(file, "FoamFile { class volScalarField; }");
            Entry Record()
            {
                var f = new FileInfo(file);
                return FileEntry("0/metal/T", f.Length, f.LastWriteTimeUtc.Ticks);
            }
            if (FileEntry("0/metal/T", 1, 1).Category != "timeFieldCandidate" ||
                FileEntry("processor12/0.025/T", 1, 1).Category != "timeFieldCandidate" ||
                FileEntry("processor12/-1.5/region/T", 1, 1).Category != "timeFieldCandidate" ||
                FileEntry("misc/2026/T", 1, 1).Category == "timeFieldCandidate" ||
                FileEntry("processorNote/0/T", 1, 1).Category == "timeFieldCandidate" ||
                FileEntry("constant/2026/table", 1, 1).Category != "dictionaryCandidate")
                throw new Exception("Physical-time path classification regression");
            var dirs = new[] { new DirectoryEntry(".", Directory.GetLastWriteTimeUtc(root).Ticks) };
            var files = new[] { Record() };
            if ((await CommitAsync(root, files, dirs, true, CancellationToken.None, cache)).Status != "recorded" ||
                (await CommitAsync(root, files, dirs, true, CancellationToken.None, cache)).Status != "verified-identical")
                throw new Exception("Cold/warm catalog checkpoint failed");
            var dest = CatalogPath(root, cache);
            await File.WriteAllTextAsync(dest, "{bad json");
            if ((await CommitAsync(root, files, dirs, true, CancellationToken.None, cache)).Status != "recorded")
                throw new Exception("Corrupted checkpoint accepted");
            await File.AppendAllTextAsync(file, " changed");
            if ((await CommitAsync(root, new[] { Record() }, dirs, true, CancellationToken.None, cache)).Status != "recorded")
                throw new Exception("Changed file size did not invalidate catalog");
            var previous = await File.ReadAllTextAsync(dest);
            if ((await CommitAsync(root, files, dirs, false, CancellationToken.None, cache)).Status != "partial-not-cached" ||
                await File.ReadAllTextAsync(dest) != previous)
                throw new Exception("Incomplete folder scan destroyed complete catalog");
            var huge = Enumerable.Range(0, 10_000)
                .Select(i => FileEntry($"postProcessing/probes/{i}/T.xy", 120, i)).ToArray();
            if ((await CommitAsync(root, huge, dirs, true, CancellationToken.None, cache)).FileCount != 10_000 ||
                (await CommitAsync(root, huge, dirs, true, CancellationToken.None, cache)).Status != "verified-identical")
                throw new Exception("10k structural catalog stress failed");
            using var cts = new CancellationTokenSource();
            cts.Cancel();
            try { await CommitAsync(root, huge, dirs, true, cts.Token, cache);
                  throw new Exception("Cancellation ignored"); }
            catch (OperationCanceledException) { }
            Console.WriteLine("FoamLens native case catalog integrity: cold, warm, corrupted, modified, partial, 10k, cancelled PASS");
        }
        finally
        {
            try { Directory.Delete(temp, recursive: true); } catch (IOException) { }
        }
    }
}
