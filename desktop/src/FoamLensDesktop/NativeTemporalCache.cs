using System.Diagnostics;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace FoamLensDesktop;

/// <summary>
/// Private, per-user, content-verified cache for parsed OpenFOAM temporal results.
/// Never treats size, timestamp or a file path as proof that scientific values match.
/// The source SHA-256 AND the cached payload SHA-256 are checked before reuse.
/// </summary>
internal static class NativeTemporalCache
{
    private const string Magic = "FoamLens-Temporal-Cache-v1";
    private const long MinSourceBytes = 256 * 1024;
    private const long MaxSourceBytes = 64L * 1024 * 1024;
    private const int MaxPayloadBytes = 256 * 1024 * 1024;
    private const long MaxCacheBytes = 1024L * 1024 * 1024;
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        NumberHandling = JsonNumberHandling.AllowNamedFloatingPointLiterals
    };

    private static string DefaultRoot =>
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "FoamLens", "Desktop", "ScientificCache", "temporal-v1");

    internal static async Task<T> GetOrParseAsync<T>(
        string sourcePath, Func<CancellationToken, Task<T>> parse, CancellationToken ct,
        string? cacheRoot = null, long minSourceBytes = MinSourceBytes)
    {
        ArgumentNullException.ThrowIfNull(parse);
        var fullPath = Path.GetFullPath(sourcePath);
        if (Environment.GetEnvironmentVariable("FOAMLENS_DISABLE_TEMPORAL_CACHE") == "1")
            return await parse(ct);

        var info = new FileInfo(fullPath);
        if (!info.Exists || info.Length < minSourceBytes || info.Length > MaxSourceBytes)
            return await parse(ct);

        var length = info.Length;
        var modified = info.LastWriteTimeUtc.Ticks;
        var signature = await GetSourceShaAsync(fullPath, ct);
        info.Refresh();
        if (!info.Exists || info.Length != length || info.LastWriteTimeUtc.Ticks != modified)
            throw new IOException("The OpenFOAM source changed during checksum verification. Retry importing.");

        var root = cacheRoot ?? DefaultRoot;
        var key = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(
            fullPath.ToUpperInvariant())));
        var cachePath = Path.Combine(root, key[..2], key + ".fltc");

        try
        {
            var cached = await TryReadAsync<T>(cachePath, length, modified, signature, ct);
            if (cached.Ok)
            {
                Trace.WriteLine("[FoamLens temporal cache] verified hit");
                return cached.Value!;
            }
        }
        catch (OperationCanceledException) { throw; }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or JsonException or InvalidDataException)
        {
            Trace.WriteLine("[FoamLens temporal cache] invalid cache discarded");
        }

        ct.ThrowIfCancellationRequested();
        var result = await parse(ct);
        // The solver may be appending to its time-series file while a user imports.
        // Never cache (or claim stable provenance for) a moving source.
        info.Refresh();
        if (!info.Exists || info.Length != length || info.LastWriteTimeUtc.Ticks != modified ||
            !string.Equals(signature, await GetSourceShaAsync(fullPath, ct), StringComparison.Ordinal))
            throw new IOException("The OpenFOAM source changed while parsing. Retry after the solver finishes writing.");

        try
        {
            var payload = JsonSerializer.SerializeToUtf8Bytes(result, JsonOptions);
            if (payload.Length <= MaxPayloadBytes)
            {
                await WriteAsync(cachePath, length, modified, signature, payload, ct);
                Trace.WriteLine("[FoamLens temporal cache] verified miss; stored parsed data");
            }
        }
        catch (OperationCanceledException) { throw; }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or JsonException or NotSupportedException)
        {
            // Caching is an optimization, not a prerequisite for scientific parsing.
            Trace.WriteLine("[FoamLens temporal cache] unavailable: " + ex.GetType().Name);
        }
        return result;
    }

    private static async Task<string> GetSourceShaAsync(string path, CancellationToken ct)
    {
        await using var stream = new FileStream(path, FileMode.Open, FileAccess.Read,
            FileShare.ReadWrite, 128 * 1024, FileOptions.Asynchronous | FileOptions.SequentialScan);
        using var sha = SHA256.Create();
        var bytes = await sha.ComputeHashAsync(stream, ct);
        return Convert.ToHexString(bytes);
    }

    private static async Task<(bool Ok, T? Value)> TryReadAsync<T>(
        string cachePath, long length, long modified, string signature, CancellationToken ct)
    {
        if (!File.Exists(cachePath)) return (false, default);
        var cacheInfo = new FileInfo(cachePath);
        if (cacheInfo.Length < 64 || cacheInfo.Length > MaxPayloadBytes + 4096L)
            return (false, default);
        var raw = await File.ReadAllBytesAsync(cachePath, ct);
        using var memory = new MemoryStream(raw, writable: false);
        using var reader = new BinaryReader(memory, Encoding.UTF8, leaveOpen: true);
        if (reader.ReadString() != Magic || reader.ReadInt64() != length ||
            reader.ReadInt64() != modified || reader.ReadString() != signature)
            return (false, default);
        var declaredDigest = reader.ReadString();
        var payloadLength = reader.ReadInt32();
        if (payloadLength <= 0 || payloadLength > MaxPayloadBytes ||
            memory.Length - memory.Position != payloadLength) return (false, default);
        var payload = reader.ReadBytes(payloadLength);
        if (payload.Length != payloadLength ||
            !string.Equals(Convert.ToHexString(SHA256.HashData(payload)), declaredDigest,
                StringComparison.Ordinal))
            return (false, default);
        var parsed = JsonSerializer.Deserialize<T>(payload, JsonOptions);
        if (parsed is null) return (false, default);
        // Cache content is verifiable and parseable, not just an existing file.
        return (true, parsed);
    }

    private static async Task WriteAsync(
        string cachePath, long length, long modified, string signature, byte[] payload, CancellationToken ct)
    {
        var folder = Path.GetDirectoryName(cachePath)!;
        Directory.CreateDirectory(folder);
        using var memory = new MemoryStream();
        using (var writer = new BinaryWriter(memory, Encoding.UTF8, leaveOpen: true))
        {
            writer.Write(Magic);
            writer.Write(length);
            writer.Write(modified);
            writer.Write(signature);
            writer.Write(Convert.ToHexString(SHA256.HashData(payload)));
            writer.Write(payload.Length);
            writer.Write(payload);
        }

        var staging = cachePath + "." + Guid.NewGuid().ToString("N") + ".tmp";
        try
        {
            await File.WriteAllBytesAsync(staging, memory.ToArray(), ct);
            File.Move(staging, cachePath, overwrite: true);
            TrimCacheBestEffort(Path.GetDirectoryName(folder)!);
        }
        finally
        {
            try { if (File.Exists(staging)) File.Delete(staging); } catch (IOException) { }
        }
    }

    private static void TrimCacheBestEffort(string root)
    {
        try
        {
            var files = new DirectoryInfo(root).EnumerateFiles("*.fltc", SearchOption.AllDirectories)
                .OrderByDescending(f => f.LastWriteTimeUtc).ToArray();
            long total = 0;
            foreach (var file in files)
            {
                total += file.Length;
                if (total > MaxCacheBytes) file.Delete();
            }
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            // Read-only / removable media never prevent parsing.
        }
    }

    private sealed record CacheSelfTestPayload(double[] Values, string Provenance);

    internal static async Task RunSelfTestAsync()
    {
        var directory = Path.Combine(Path.GetTempPath(), "FoamLens-temporal-cache-test-" + Guid.NewGuid().ToString("N"));
        var root = Path.Combine(directory, "cache");
        var source = Path.Combine(directory, "case-probes.dat");
        var previous = Environment.GetEnvironmentVariable("FOAMLENS_DISABLE_TEMPORAL_CACHE");
        Directory.CreateDirectory(directory);
        try
        {
            Environment.SetEnvironmentVariable("FOAMLENS_DISABLE_TEMPORAL_CACHE", null);
            var bytes = new byte[32_768];
            bytes[1] = 3;
            await File.WriteAllBytesAsync(source, bytes);
            var parseCount = 0;

            async Task<CacheSelfTestPayload> Parse(CancellationToken ct)
            {
                parseCount++;
                var data = await File.ReadAllBytesAsync(source, ct);
                return new CacheSelfTestPayload(new double[] { data[1], double.NaN, double.PositiveInfinity },
                    "probe:physical-position");
            }

            var first = await GetOrParseAsync(source, Parse, CancellationToken.None, root, 0);
            if (parseCount != 1 || first.Values[0] != 3)
                throw new InvalidOperationException("Cold scientific cache parse failed.");
            var second = await GetOrParseAsync(source, Parse, CancellationToken.None, root, 0);
            if (parseCount != 1 || second.Values[0] != 3 ||
                !double.IsNaN(second.Values[1]) || !double.IsPositiveInfinity(second.Values[2]))
                throw new InvalidOperationException("Warm scientific cache was not reused exactly, including nonfinite values.");

            // A solver may replace a file without changing its length or mtime.
            // The cache MUST still invalidate via full source SHA-256.
            var stamp = File.GetLastWriteTimeUtc(source);
            bytes[1] = 7;
            await File.WriteAllBytesAsync(source, bytes);
            File.SetLastWriteTimeUtc(source, stamp);
            var modified = await GetOrParseAsync(source, Parse, CancellationToken.None, root, 0);
            if (parseCount != 2 || modified.Values[0] != 7)
                throw new InvalidOperationException("Changed source reused stale scientific values.");

            // Corrupt/torn cache data should fall back to a freshly parsed source.
            var key = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(
                Path.GetFullPath(source).ToUpperInvariant())));
            var cachedPath = Path.Combine(root, key[..2], key + ".fltc");
            await File.WriteAllBytesAsync(cachedPath, new byte[] { 0x42, 0x41, 0x44 });
            var restored = await GetOrParseAsync(source, Parse, CancellationToken.None, root, 0);
            if (parseCount != 3 || restored.Values[0] != 7)
                throw new InvalidOperationException("Corrupt cache data was not discarded safely.");

            using var cancel = new CancellationTokenSource();
            cancel.Cancel();
            try
            {
                await GetOrParseAsync(source, Parse, cancel.Token, root, 0);
                throw new InvalidOperationException("Cache ignored cancellation.");
            }
            catch (OperationCanceledException) { }

            Console.WriteLine("FoamLens native scientific temporal cache: cold, warm, same-size/mtime mutation, corrupt payload and cancellation PASS");
        }
        finally
        {
            Environment.SetEnvironmentVariable("FOAMLENS_DISABLE_TEMPORAL_CACHE", previous);
            try { Directory.Delete(directory, recursive: true); } catch (IOException) { }
        }
    }
}
