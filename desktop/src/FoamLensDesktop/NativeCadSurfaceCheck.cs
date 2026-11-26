using System.Buffers.Binary;
using System.Diagnostics;
using System.Text;

namespace FoamLensDesktop;

/// <summary>
/// Executes ONLY the allowlisted OpenFOAM surfaceCheck utility on an isolated
/// temporary STL, after an explicit click in the native CAD Surface Inspector.
/// No arbitrary executable/script/path is accepted from the WebView or written
/// back to the user's original OpenFOAM case.
/// </summary>
internal static class NativeCadSurfaceCheck
{
    internal const int MaxStlBytes = 4 * 1024 * 1024;
    private const int MaxLogCharacters = 24000;

    // Share the exact Foundation loader with native meshing, rather than
    // accepting whatever surfaceCheck happens to appear first in PATH.
    private static string WslScript => NativeCartesianMesh.FoundationLoader()+"""
        command -v surfaceCheck >/dev/null || exit 127
        cd "$(dirname "$1")"
        surfaceCheck -checkSelfIntersection "$1"
        """;

    internal sealed record Report(
        string Utility,
        string Runner,
        string Distribution,
        string RequestedVersion,
        bool Executed,
        int ExitCode,
        int TriangleCount,
        string Stdout,
        string Stderr,
        bool OutputTruncated,
        bool OpenFoamCaseMutated,
        string Caveat);

    internal sealed record ProcessOutput(int ExitCode, string Stdout, string Stderr, bool Truncated);

    internal static int ValidateBinaryStl(byte[] data)
    {
        if (data.Length < 134 || data.Length > MaxStlBytes)
            throw new ArgumentException("SurfaceCheck accepts a binary STL of 1 to 4 MiB maximum.");
        uint count = BinaryPrimitives.ReadUInt32LittleEndian(data.AsSpan(80, 4));
        if (count < 1 || 84L + 50L * count != data.Length)
            throw new ArgumentException("Binary STL triangle count or length is invalid.");
        for (int i = 0; i < count; i++)
        {
            int start = 84 + 50 * i;
            for (int k = 0; k < 12; k++)
            {
                float value = BinaryPrimitives.ReadSingleLittleEndian(data.AsSpan(start + k * 4, 4));
                if (!float.IsFinite(value))
                    throw new ArgumentException("Binary STL contains non-finite coordinates or normals.");
            }
        }
        return checked((int)count);
    }

    internal static void SelfTest()
    {
        var data = new byte[134];
        BinaryPrimitives.WriteUInt32LittleEndian(data.AsSpan(80, 4), 1);
        BinaryPrimitives.WriteSingleLittleEndian(data.AsSpan(84 + 12 + 12, 4), 1);
        if (ValidateBinaryStl(data) != 1)
            throw new InvalidOperationException("CAD binary STL gate incorrectly rejected a valid triangle.");

        data[80] = 2;
        bool rejected = false;
        try { ValidateBinaryStl(data); } catch (ArgumentException) { rejected = true; }
        if (!rejected) throw new InvalidOperationException("CAD binary STL gate accepted an invalid count.");
        data[80] = 1;

        BinaryPrimitives.WriteSingleLittleEndian(data.AsSpan(84, 4), float.NaN);
        rejected = false;
        try { ValidateBinaryStl(data); } catch (ArgumentException) { rejected = true; }
        if (!rejected) throw new InvalidOperationException("CAD binary STL gate accepted NaN.");

        if (!WslScript.Contains("surfaceCheck -checkSelfIntersection \"$1\"",
                StringComparison.Ordinal) ||
            WslScript.Contains("eval ", StringComparison.Ordinal) ||
            WslScript.Contains("snappyHexMesh -case", StringComparison.Ordinal))
            throw new InvalidOperationException("CAD WSL command allowlist drifted.");
    }

    internal static async Task<Report> RunAsync(string base64, CancellationToken cancellationToken,string version="14",string? requestedDistribution=null)
    {
        if (string.IsNullOrWhiteSpace(base64) ||
            base64.Length > ((MaxStlBytes + 2) / 3 * 4) + 8)
            throw new ArgumentException("SurfaceCheck requires a bounded binary STL payload.");

        byte[] data;
        try { data = Convert.FromBase64String(base64); }
        catch (FormatException) { throw new ArgumentException("Invalid binary STL transfer encoding."); }
        var triangleCount = ValidateBinaryStl(data);
        if(version is not ("13" or "14"))throw new ArgumentException("Select Foundation OpenFOAM 13 or 14.");

        var wsl = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.System), "wsl.exe");
        if (!File.Exists(wsl))
            throw new NotSupportedException(
                "WSL is not installed. OpenFOAM surfaceCheck requires an installed default WSL distribution.");

        var distribution=NativeCartesianMesh.ResolveDistribution(requestedDistribution,NativeCartesianMesh.InstalledDistributions());
        var directory = Path.Combine(Path.GetTempPath(), "foamlens-cad-check-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(directory);
        try
        {
            var file = Path.Combine(directory, "surface.stl");
            await File.WriteAllBytesAsync(file, data, cancellationToken);

            // Translate via WSL's own wslpath, not guessed /mnt/c or shell quoting.
            var translation = await RunProcessAsync(wsl, directory,
                NativeCartesianMesh.WslArgs(distribution,"wslpath","-a",file), TimeSpan.FromSeconds(15),
                cancellationToken);
            var linuxPath = translation.Stdout.Trim();
            if (translation.ExitCode != 0 || !linuxPath.StartsWith("/", StringComparison.Ordinal) ||
                linuxPath.Contains('\n') || linuxPath.Contains('\r'))
                throw new NotSupportedException(
                    "Selected WSL distribution or Windows-to-WSL file mapping is unavailable.");

            var result = await RunProcessAsync(wsl, directory,
                NativeCartesianMesh.WslArgs(distribution,"/bin/bash","-lc",WslScript,
                    "foamlens-cad-surfacecheck",linuxPath,version),
                TimeSpan.FromSeconds(75), cancellationToken);

            string Clean(string message) =>
                message.Replace(linuxPath, "<temporary FoamLens STL>", StringComparison.Ordinal)
                    .Replace(file, "<temporary FoamLens STL>", StringComparison.OrdinalIgnoreCase)
                    .Replace(directory, "<temporary FoamLens directory>", StringComparison.OrdinalIgnoreCase);

            return new Report(
                Utility: "surfaceCheck -checkSelfIntersection",
                Runner: "Selected WSL distribution (Foundation OpenFOAM)",
                Distribution: distribution,
                RequestedVersion: version,
                Executed: result.ExitCode != 127,
                ExitCode: result.ExitCode,
                TriangleCount: triangleCount,
                Stdout: Clean(result.Stdout),
                Stderr: Clean(result.Stderr),
                OutputTruncated: result.Truncated,
                OpenFoamCaseMutated: false,
                Caveat: "Execution/exit code is not a CFD-ready geometry certificate. " +
                    "Only a temporary STL copy was passed to surfaceCheck; examine the actual tool output.");
        }
        finally
        {
            // The source case and imported STL are never touched.
            try { Directory.Delete(directory, recursive: true); } catch (IOException) { }
            catch (UnauthorizedAccessException) { }
        }
    }

    internal static async Task<ProcessOutput> RunProcessAsync(
        string executable, string workingDirectory, string[] arguments,
        TimeSpan timeout, CancellationToken cancellationToken)
    {
        var start = new ProcessStartInfo(executable)
        {
            WorkingDirectory = workingDirectory,
            UseShellExecute = false,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            CreateNoWindow = true
        };
        foreach (var arg in arguments) start.ArgumentList.Add(arg);
        using var process = Process.Start(start)
            ?? throw new NotSupportedException("Default WSL distribution could not be started.");
        using var deadline = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        deadline.CancelAfter(timeout);
        var output = ReadBoundedAsync(process.StandardOutput, deadline.Token);
        var errors = ReadBoundedAsync(process.StandardError, deadline.Token);
        try
        {
            await process.WaitForExitAsync(deadline.Token);
            var stdout = await output;
            var stderr = await errors;
            return new ProcessOutput(process.ExitCode, stdout.Text, stderr.Text,
                stdout.Truncated || stderr.Truncated);
        }
        catch (OperationCanceledException)
        {
            try { if (!process.HasExited) process.Kill(entireProcessTree: true); }
            catch (InvalidOperationException) { }
            catch (System.ComponentModel.Win32Exception) { }
            cancellationToken.ThrowIfCancellationRequested();
            throw new TimeoutException("Native WSL operation timed out; original case was not modified.");
        }
    }

    private static async Task<(string Text, bool Truncated)> ReadBoundedAsync(
        StreamReader reader, CancellationToken cancellationToken)
    {
        var builder = new StringBuilder();
        var buffer = new char[2048];
        bool truncated = false;
        int read;
        while ((read = await reader.ReadAsync(buffer.AsMemory(), cancellationToken)) > 0)
        {
            var remaining = MaxLogCharacters - builder.Length;
            if (remaining > 0) builder.Append(buffer, 0, Math.Min(read, remaining));
            if (read > remaining) truncated = true;
        }
        return (builder.ToString(), truncated);
    }
}
