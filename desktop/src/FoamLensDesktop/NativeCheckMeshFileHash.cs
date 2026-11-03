// FoamLens Granada #150: byte-exact local OpenFOAM mesh file provenance.
// Restricted to already imported native file tokens by the calling WebView2
// bridge. Never accepts an arbitrary path from frontend input. Never publishes
// raw bytes, paths, usernames or a CFD/mesh quality certification.
using System.Security.Cryptography;

namespace FoamLensDesktop;

internal static class NativeCheckMeshFileHash
{
    internal const long MaxBytes = 24L * 1024 * 1024;
    private static readonly string[] Names = { "points", "faces", "owner", "neighbour", "boundary" };

    internal sealed record HashResult(string Sha256, long Bytes, string Provenance);

    internal static async Task<HashResult> HashSelectedAsync(string path, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(path))
            throw new InvalidOperationException("Missing registered local polyMesh file.");
        var full = Path.GetFullPath(path);
        var fileName = Path.GetFileName(full);
        var meshDir = Path.GetDirectoryName(full);
        var regionDir = meshDir is null ? null : Path.GetDirectoryName(meshDir);
        var constantDir = regionDir is null ? null : Path.GetDirectoryName(regionDir);
        if (!Names.Contains(fileName, StringComparer.Ordinal) ||
            !string.Equals(Path.GetFileName(meshDir), "polyMesh", StringComparison.Ordinal) ||
            !string.Equals(Path.GetFileName(constantDir), "constant", StringComparison.Ordinal))
            throw new InvalidOperationException("Not an original constant/<region>/polyMesh file.");

        var info = new FileInfo(full);
        if (!info.Exists || info.Length > MaxBytes)
            throw new InvalidOperationException("Original polyMesh file is missing or exceeds local hash limit.");
        var length = info.Length;
        var lastWrite = info.LastWriteTimeUtc;
        // Read/sha256 the ORIGINAL BYTES; Encoding.UTF8 is prohibited here.
        // FileShare.Read refuses concurrent Windows write access during hashing.
        await using var stream = new FileStream(
            full, FileMode.Open, FileAccess.Read, FileShare.Read,
            bufferSize: 64 * 1024, useAsync: true);
        if (stream.Length != length)
            throw new InvalidOperationException("Original polyMesh file changed before hashing.");
        var digest = await SHA256.HashDataAsync(stream, ct);
        info.Refresh();
        if (stream.Position != length || stream.Length != length ||
            info.Length != length || info.LastWriteTimeUtc != lastWrite)
            throw new InvalidOperationException("Original polyMesh file changed during hashing.");
        return new HashResult(Convert.ToHexString(digest).ToLowerInvariant(),
            length, "original-raw-native-file-sha256");
    }

    internal static async Task RunSelfTestAsync()
    {
        var root = Path.Combine(Path.GetTempPath(),
            "foamlens-g150-original-bytes-" + Guid.NewGuid().ToString("N"));
        var mesh = Path.Combine(root, "constant", "syntheticRegion", "polyMesh");
        Directory.CreateDirectory(mesh);
        try
        {
            var points = Path.Combine(mesh, "points");
            var original = new byte[] { 0, 0xFF, 0x80, 0xFE, 0x0A, 0x00, 0x20, 0xC3, 0x28 };
            await File.WriteAllBytesAsync(points, original);
            var exact = Convert.ToHexString(SHA256.HashData(original)).ToLowerInvariant();
            var first = await HashSelectedAsync(points);
            if (first.Sha256 != exact || first.Bytes != original.Length ||
                first.Provenance != "original-raw-native-file-sha256")
                throw new InvalidOperationException("Original binary source SHA-256 mismatch.");
            var modified = original.ToArray();
            modified[1] ^= 0x01;
            await File.WriteAllBytesAsync(points, modified);
            var second = await HashSelectedAsync(points);
            if (second.Sha256 == first.Sha256)
                throw new InvalidOperationException("Changed source must change SHA-256.");

            foreach (var wrong in new[] {
                Path.Combine(mesh, "foreign.txt"),
                Path.Combine(root, "random", "polyMesh", "points"),
            })
            {
                var rejected = false;
                try { await HashSelectedAsync(wrong); }
                catch (InvalidOperationException) { rejected = true; }
                if (!rejected)
                    throw new InvalidOperationException("Non-original polyMesh file was accepted.");
            }

            var tooLarge = Path.Combine(mesh, "faces");
            await using (var stream = new FileStream(tooLarge, FileMode.CreateNew))
                stream.SetLength(MaxBytes + 1);
            var largeRejected = false;
            try { await HashSelectedAsync(tooLarge); }
            catch (InvalidOperationException) { largeRejected = true; }
            if (!largeRejected)
                throw new InvalidOperationException("PolyMesh source hash size limit failed.");
        }
        finally
        {
            try { Directory.Delete(root, recursive: true); } catch { }
        }
    }
}
