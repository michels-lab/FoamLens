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

    // Fixed shell program, never interpolated with WebView input.
    // The default WSL distribution is used; no package installs are performed.
    private const string WslScript =
        "set -eu\n" +
        "if ! command -v surfaceCheck >/dev/null 2>&1; then\n" +
        "  for profile in /opt/openfoam14/etc/bashrc /opt/openfoam13/etc/bashrc " +
        "/usr/lib/openfoam/openfoam14/etc/bashrc /usr/lib/openfoam/openfoam13/etc/bashrc " +
        "\"$HOME/OpenFOAM/OpenFOAM-14/etc/bashrc\" \"$HOME/OpenFOAM/OpenFOAM-13/etc/bashrc\"; do\n" +
        "    if [ -r \"$profile\" ]; then\n" +
        "      . \"$profile\" >/dev/null 2>&1 || true\n" +
        "      if command -v surfaceCheck >/dev/null 2>&1; then break; fi\n" +
        "    fi\n" +
        "  done\n" +
        "fi\n" +
        "if ! command -v surfaceCheck >/dev/null 2>&1; then\n" +
        "  echo 'FoamLens: OpenFOAM surfaceCheck is unavailable in the default WSL distribution.' >&2\n" +
        "  exit 127\n" +
        "fi\n" +
        "cd \"$(dirname \"$1\")\"\n" +
        "surfaceCheck -checkSelfIntersection \"$1\"\n";

    internal sealed record Report(
        string Utility,
        string Runner,
        bool Executed,
        int ExitCode,
        int TriangleCount,
        string Stdout,
        string Stderr,
        bool OutputTruncated,
        bool OpenFoamCaseMutated,
        string Caveat);

    private sealed record ProcessOutput(int ExitCode, string Stdout, string Stderr, bool Truncated);

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
            WslScript.Contains("snappyHexMesh", StringComparison.Ordinal))
            throw new InvalidOperationException("CAD WSL command allowlist drifted.");
    }

    internal static async Task<Report> RunAsync(string base64, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(base64) ||
            base64.Length > ((MaxStlBytes + 2) / 3 * 4) + 8)
            throw new ArgumentException("SurfaceCheck requires a bounded binary STL payload.");

        byte[] data;
        try { data = Convert.FromBase64String(base64); }
        catch (FormatException) { throw new ArgumentException("Invalid binary STL transfer encoding."); }
        var triangleCount = ValidateBinaryStl(data);

        var wsl = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.System), "wsl.exe");
        if (!File.Exists(wsl))
            throw new NotSupportedException(
                "WSL is not installed. OpenFOAM surfaceCheck requires an installed default WSL distribution.");

        var directory = Path.Combine(Path.GetTempPath(), "foamlens-cad-check-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(directory);
        try
        {
            var file = Path.Combine(directory, "surface.stl");
            await File.WriteAllBytesAsync(file, data, cancellationToken);

            // Translate via WSL's own wslpath, not guessed /mnt/c or shell quoting.
            var translation = await RunProcessAsync(wsl, directory,
                new[] { "--exec", "wslpath", "-a", file }, TimeSpan.FromSeconds(15),
                cancellationToken);
            var linuxPath = translation.Stdout.Trim();
            if (translation.ExitCode != 0 || !linuxPath.StartsWith('/', StringComparison.Ordinal) ||
                linuxPath.Contains('\n') || linuxPath.Contains('\r'))
                throw new NotSupportedException(
                    "Default WSL distribution or Windows-to-WSL file mapping is unavailable.");

            var result = await RunProcessAsync(wsl, directory,
                new[] { "--exec", "/bin/bash", "-lc", WslScript,
                    "foamlens-cad-surfacecheck", linuxPath },
                TimeSpan.FromSeconds(75), cancellationToken);

            string Clean(string message) =>
                message.Replace(linuxPath, "<temporary FoamLens STL>", StringComparison.Ordinal)
                    .Replace(file, "<temporary FoamLens STL>", StringComparison.OrdinalIgnoreCase)
                    .Replace(directory, "<temporary FoamLens directory>", StringComparison.OrdinalIgnoreCase);

            return new Report(
                Utility: "surfaceCheck -checkSelfIntersection",
                Runner: "Default WSL distribution (local OpenFOAM)",
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

    private static async Task<ProcessOutput> RunProcessAsync(
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
            throw new TimeoutException("surfaceCheck timed out; original case was not modified.");
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
