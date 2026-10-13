using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.IO;

namespace FoamLensDesktop;

internal sealed partial class FoamLensForm
{
    // v1 is deliberately independent of app release versions: a cache survives upgrades
    // only while the scientific parser schema and all source bytes are unchanged.
    private const string TemporalCacheSchema = "foamlens-native-temporal-binary-v1";
    private const long MaxTemporalCacheFileBytes = 512L * 1024 * 1024;
    private static readonly SemaphoreSlim TemporalCacheIo = new(6, 6);

    private static string TemporalCachePath(string sourcePath)
    {
        var normalized = Path.GetFullPath(sourcePath).ToUpperInvariant();
        var key = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(normalized))).ToLowerInvariant();
        return Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "FoamLens", "Desktop", "scientific-cache", "temporal-v1",
            key[..2], key + ".fltc");
    }

    private static async Task<string> HashExactSourceAsync(string path, CancellationToken ct)
    {
        await using var stream = new FileStream(path, FileMode.Open, FileAccess.Read,
            FileShare.ReadWrite, bufferSize: 131072, useAsync: true);
        return Convert.ToHexString(await SHA256.HashDataAsync(stream, ct));
    }

    private static bool StableSource(string path, long length, long timestampTicks)
    {
        var info = new FileInfo(path);
        return info.Exists && info.Length == length &&
               info.LastWriteTimeUtc.Ticks == timestampTicks;
    }

    private async Task<(TemporalParseResult Result, bool Hit)> ParseTemporalFileCachedAsync(
        string path, string requestId, CancellationToken ct)
    {
        if (Environment.GetEnvironmentVariable("FOAMLENS_DISABLE_TEMPORAL_CACHE") == "1")
            return (await ParseTemporalFileAsync(path, requestId, ct), false);
        var info = new FileInfo(path);
        var length = info.Length;
        var ticks = info.LastWriteTimeUtc.Ticks;
        if (length > MaxTemporalCacheFileBytes || length <= 0)
            return (await ParseTemporalFileAsync(path, requestId, ct), false);

        // Fully hashing the source on EVERY hit is intentional: exact scientific
        // provenance matters more than a faster but potentially stale mtime-only hit.
        // Reading source bytes to hash is linear I/O; caching saves parsing work.
        string sourceHash;
        await TemporalCacheIo.WaitAsync(ct);
        try { sourceHash = await HashExactSourceAsync(path, ct); }
        finally { TemporalCacheIo.Release(); }
        if (!StableSource(path, length, ticks))
            return (await ParseTemporalFileAsync(path, requestId, ct), false);

        var cachePath = TemporalCachePath(path);
        try
        {
            var cached = await Task.Run(
                () => TryReadTemporalCache(cachePath, sourceHash, length, ct), ct);
            if (cached is not null && StableSource(path, length, ticks))
                return (cached, true);
        }
        catch (OperationCanceledException) { throw; }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException
            or InvalidDataException or ArgumentException)
        {
            // Corrupt or unavailable caches are not evidence. Parse the actual source.
        }

        var parsed = await ParseTemporalFileAsync(path, requestId, ct);
        if (!StableSource(path, length, ticks)) return (parsed, false);
        // Detect a live OpenFOAM writer that changed bytes while we parsed.
        string afterHash;
        await TemporalCacheIo.WaitAsync(ct);
        try { afterHash = await HashExactSourceAsync(path, ct); }
        finally { TemporalCacheIo.Release(); }
        if (!string.Equals(sourceHash, afterHash, StringComparison.Ordinal))
            return (parsed, false);
        if (!StableSource(path, length, ticks)) return (parsed, false);

        try
        {
            await Task.Run(() => TryWriteTemporalCache(cachePath, sourceHash, length, parsed, ct), ct);
        }
        catch (OperationCanceledException) { throw; }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException
            or InvalidDataException or ArgumentException)
        {
            // Cache is always optional. The freshly parsed scientific data is valid.
        }
        return (parsed, false);
    }

    private static TemporalParseResult? TryReadTemporalCache(
        string cachePath, string sourceHash, long sourceLength, CancellationToken ct)
    {
        var digestPath = cachePath + ".sha256";
        if (!File.Exists(cachePath) || !File.Exists(digestPath)) return null;
        var info = new FileInfo(cachePath);
        if (info.Length <= 0 || info.Length > MaxTemporalCacheFileBytes) return null;
        using var stream = new FileStream(cachePath, FileMode.Open, FileAccess.Read,
            FileShare.Read, bufferSize: 131072);
        var expected = File.ReadAllText(digestPath, Encoding.ASCII).Trim();
        if (expected.Length != 64) return null;
        var actual = SHA256.HashData(stream);
        var supplied = Convert.FromHexString(expected);
        if (!CryptographicOperations.FixedTimeEquals(actual, supplied)) return null;
        stream.Position = 0;
        using var reader = new BinaryReader(stream, Encoding.UTF8, leaveOpen: true);
        if (reader.ReadString() != TemporalCacheSchema ||
            !string.Equals(reader.ReadString(), sourceHash, StringComparison.Ordinal) ||
            reader.ReadInt64() != sourceLength) return null;

        var probeCount = reader.ReadInt32();
        if (probeCount < 0 || probeCount > 100_000) return null;
        var probes = new Dictionary<int, string>();
        for (var i = 0; i < probeCount; i++)
        {
            ct.ThrowIfCancellationRequested();
            var probe = reader.ReadInt32();
            var location = reader.ReadString();
            if (!probes.TryAdd(probe, location)) return null;
        }
        var count = reader.ReadInt32();
        if (count < 0 || count > 16_384) return null;
        var columns = new TemporalColumn[count];
        long points = 0;
        for (var i = 0; i < count; i++)
        {
            ct.ThrowIfCancellationRequested();
            var size = reader.ReadInt32();
            if (size < 0 || size > 20_000_000) return null;
            points += size;
            if (points > 30_000_000) return null;
            var t = new double[size];
            var y = new double[size];
            for (var j = 0; j < size; j++) t[j] = reader.ReadDouble();
            for (var j = 0; j < size; j++) y[j] = reader.ReadDouble();
            columns[i] = new TemporalColumn(t, y);
        }
        var head = reader.ReadString();
        if (head.Length > 128 * 1024 || stream.Position != stream.Length) return null;
        return new TemporalParseResult(columns, probes, head, sourceLength);
    }

    private static void TryWriteTemporalCache(
        string cachePath, string sourceHash, long sourceLength,
        TemporalParseResult result, CancellationToken ct)
    {
        var dir = Path.GetDirectoryName(cachePath)!;
        Directory.CreateDirectory(dir);
        var staged = cachePath + "." + Guid.NewGuid().ToString("N", CultureInfo.InvariantCulture) + ".tmp";
        var stageChecksum = staged + ".sha256";
        try
        {
            using (var stream = new FileStream(staged, FileMode.CreateNew, FileAccess.Write,
                       FileShare.None, bufferSize: 131072))
            using (var writer = new BinaryWriter(stream, Encoding.UTF8, leaveOpen: true))
            {
                writer.Write(TemporalCacheSchema);
                writer.Write(sourceHash);
                writer.Write(sourceLength);
                writer.Write(result.Probes.Count);
                foreach (var (index, location) in result.Probes.OrderBy(x => x.Key))
                {
                    ct.ThrowIfCancellationRequested();
                    writer.Write(index);
                    writer.Write(location);
                }
                writer.Write(result.Columns.Length);
                foreach (var col in result.Columns)
                {
                    ct.ThrowIfCancellationRequested();
                    if (col.T.Length != col.Y.Length) return;
                    writer.Write(col.T.Length);
                    foreach (var time in col.T) writer.Write(time);
                    foreach (var value in col.Y) writer.Write(value);
                }
                writer.Write(result.Head);
                writer.Flush();
                if (stream.Length > MaxTemporalCacheFileBytes) return;
            }
            ct.ThrowIfCancellationRequested();
            string hash;
            using (var stream = File.OpenRead(staged))
                hash = Convert.ToHexString(SHA256.HashData(stream));
            File.WriteAllText(stageChecksum, hash, Encoding.ASCII);
            ct.ThrowIfCancellationRequested();
            File.Move(staged, cachePath, overwrite: true);
            File.Move(stageChecksum, cachePath + ".sha256", overwrite: true);
        }
        finally
        {
            try { File.Delete(staged); } catch (IOException) { }
            try { File.Delete(stageChecksum); } catch (IOException) { }
        }
    }

    // Runs in the real installed/portable Windows smoke, on actual native code.
    // Same-length and timestamp-preserving mutations must invalidate cache hits.
    private async Task RunTemporalCacheSelfTestAsync()
    {
        var source = Path.Combine(Path.GetTempPath(), "foamlens-cache-" +
            Guid.NewGuid().ToString("N", CultureInfo.InvariantCulture) + ".dat");
        var cache = TemporalCachePath(source);
        try
        {
            await File.WriteAllTextAsync(source, "# Probe 0 (0 0 0)\n0 10\n1 20\n2 30\n");
            var originalTime = File.GetLastWriteTimeUtc(source);
            var (cold, coldHit) = await ParseTemporalFileCachedAsync(source, "cache-self-test", CancellationToken.None);
            var (warm, warmHit) = await ParseTemporalFileCachedAsync(source, "cache-self-test", CancellationToken.None);
            if (coldHit || !warmHit || cold.Columns.Length != 1 || warm.Columns.Length != 1 ||
                warm.Columns[0].Y[2] != 30)
                throw new InvalidOperationException("Scientific temporal cache cold/warm identity regression");

            // Preserve size and mtime deliberately: mtime-only caching is unsafe.
            await File.WriteAllTextAsync(source, "# Probe 0 (0 0 0)\n0 10\n1 20\n2 90\n");
            File.SetLastWriteTimeUtc(source, originalTime);
            var (changed, changedHit) = await ParseTemporalFileCachedAsync(source, "cache-self-test", CancellationToken.None);
            if (changedHit || changed.Columns[0].Y[2] != 90)
                throw new InvalidOperationException("Scientific cache reused stale same-size/time content");

            await File.AppendAllTextAsync(cache, "tampered");
            var (recovered, corruptHit) = await ParseTemporalFileCachedAsync(source, "cache-self-test", CancellationToken.None);
            if (corruptHit || recovered.Columns[0].Y[2] != 90)
                throw new InvalidOperationException("Corrupt scientific cache was not rejected");
        }
        finally
        {
            try { File.Delete(source); } catch { }
            try { File.Delete(cache); } catch { }
            try { File.Delete(cache + ".sha256"); } catch { }
        }
    }
}
