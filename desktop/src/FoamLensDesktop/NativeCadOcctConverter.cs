using System.Buffers.Binary;
using System.Diagnostics;
using System.Reflection;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace FoamLensDesktop;

/// <summary>
/// Optional real OCCT conversion using the existing FreeCADCmd installation
/// inside default WSL. Runs only a bundled Python script and a bounded BREP,
/// never commands, executable paths or scripts received from WebView2.
/// </summary>
internal static class NativeCadOcctConverter
{
    internal const int MaxCadBytes = 16 * 1024 * 1024;
    private const int MaxStlBytes = 16 * 1024 * 1024;
    private const int MaxTriangles = 300000;
    private const int MaxRegions = 24;
    private const string ScriptResource = "FoamLens.NativeCadOcctFreecad.py";
    private static readonly Regex RegionFile =
        new(@"^region_[0-9]{3}\.stl$", RegexOptions.CultureInvariant);

    private const string LaunchScript =
        "set -eu\n" +
        "if command -v FreeCADCmd >/dev/null 2>&1; then\n" +
        "  exec FreeCADCmd \"$1\"\n" +
        "fi\n" +
        "if command -v freecadcmd >/dev/null 2>&1; then\n" +
        "  exec freecadcmd \"$1\"\n" +
        "fi\n" +
        "echo 'FoamLens: FreeCADCmd not installed in the default WSL distribution.' >&2\n" +
        "exit 127\n";

    internal sealed record Region(
        string Name,
        int Triangles,
        int SizeBytes,
        double[] BoundsMm,
        double SurfaceAreaMm2,
        string StlBase64);
    internal sealed record Report(
        string Schema,
        string Engine,
        string Format,
        string CoordinateUnit,
        bool SourceUnitsVerified,
        bool OriginalObjectLabelsPreserved,
        bool OpenFoamCaseMutated,
        bool Converted,
        double DeflectionMm,
        int TotalTriangles,
        Region[] Regions,
        string Caveat);

    internal static string ValidateInput(string format, byte[] data, double deflectionMm)
    {
        if (format is not ("step" or "iges" or "brep"))
            throw new ArgumentException("Supported BREP formats are STEP, IGES and BREP only.");
        if (deflectionMm is not (0.2 or 0.5 or 1.0))
            throw new ArgumentException("Tessellation deflection must be 0.2, 0.5 or 1.0 mm.");
        if (data.Length < 80 || data.Length > MaxCadBytes)
            throw new ArgumentException("CAD input must be between 80 bytes and 16 MiB.");
        var head = Encoding.ASCII.GetString(data.AsSpan(0, Math.Min(data.Length, 2048)));
        bool recognised = format switch
        {
            "step" => head.Contains("ISO-10303-21;", StringComparison.OrdinalIgnoreCase),
            "iges" => Enumerable.Range(0, Math.Min(data.Length / 80, 20))
                .Any(n => data[n * 80 + 72] == (byte)'S'),
            "brep" => head.Contains("DBRep_DrawableShape", StringComparison.Ordinal) ||
                      head.Contains("CASCADE Topology", StringComparison.Ordinal),
            _ => false
        };
        if (!recognised)
            throw new ArgumentException("CAD file header is not consistent with the selected format.");
        return "source." + format;
    }

    private static int ValidateBinaryStl(byte[] data)
    {
        if (data.Length < 134 || data.Length > MaxStlBytes)
            throw new InvalidDataException("OCCT region binary STL size is invalid.");
        uint count = BinaryPrimitives.ReadUInt32LittleEndian(data.AsSpan(80, 4));
        if (count < 1 || count > MaxTriangles || 84L + 50L * count != data.Length)
            throw new InvalidDataException("OCCT region triangle count is inconsistent.");
        for (int i = 0; i < count; ++i)
        {
            int at = 84 + 50 * i;
            for (int k = 0; k < 12; k++)
            {
                float x = BinaryPrimitives.ReadSingleLittleEndian(data.AsSpan(at + k * 4, 4));
                if (!float.IsFinite(x))
                    throw new InvalidDataException("OCCT region contains non-finite STL coordinates.");
            }
        }
        return (int)count;
    }

    internal static void SelfTest()
    {
        var step = new byte[100];
        Encoding.ASCII.GetBytes("ISO-10303-21;").CopyTo(step, 0);
        if (ValidateInput("step", step, 0.5) != "source.step")
            throw new InvalidOperationException("STEP file identity validation failed.");
        var iges = new byte[80];
        iges[72] = (byte)'S';
        if (ValidateInput("iges", iges, 1.0) != "source.iges")
            throw new InvalidOperationException("IGES card-column validation failed.");
        var brep = new byte[90];
        Encoding.ASCII.GetBytes("DBRep_DrawableShape").CopyTo(brep, 0);
        if (ValidateInput("brep", brep, 0.2) != "source.brep")
            throw new InvalidOperationException("BREP signature validation failed.");
        static void RequireReject(Action action)
        {
            try { action(); }
            catch (ArgumentException) { return; }
            throw new InvalidOperationException("CAD importer accepted an invalid source.");
        }
        RequireReject(() => ValidateInput("stl", step, 0.5));
        RequireReject(() => ValidateInput("step", new byte[100], 0.5));
        RequireReject(() => ValidateInput("step", step, double.NaN));
        RequireReject(() => ValidateInput("step", step, 0.005));
        RequireReject(() => ValidateInput("step", new byte[MaxCadBytes + 1], 0.5));

        var stl = new byte[134];
        BinaryPrimitives.WriteUInt32LittleEndian(stl.AsSpan(80, 4), 1);
        if (ValidateBinaryStl(stl) != 1)
            throw new InvalidOperationException("OCCT STL validator rejected one triangle.");
        BinaryPrimitives.WriteUInt32LittleEndian(stl.AsSpan(80, 4), 2);
        try { ValidateBinaryStl(stl); throw new InvalidOperationException("Invalid STL accepted."); }
        catch (InvalidDataException) { }
        if (!LaunchScript.Contains("exec FreeCADCmd \"$1\"", StringComparison.Ordinal) ||
            LaunchScript.Contains("eval ", StringComparison.Ordinal))
            throw new InvalidOperationException("FreeCADCmd execution policy drifted.");
        if (Assembly.GetExecutingAssembly().GetManifestResourceStream(ScriptResource) is null)
            throw new InvalidOperationException("Actual FreeCAD OCCT script is missing from the installed executable.");
    }

    internal static async Task<Report> ConvertAsync(
        string format, string base64, double deflectionMm, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(base64) ||
            base64.Length > ((MaxCadBytes + 2) / 3 * 4) + 8)
            throw new ArgumentException("CAD input exceeds the 16 MiB WebView transfer limit.");
        byte[] input;
        try { input = Convert.FromBase64String(base64); }
        catch (FormatException) { throw new ArgumentException("CAD input is not valid base64."); }
        string name = ValidateInput(format, input, deflectionMm);
        string wsl = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.System), "wsl.exe");
        if (!File.Exists(wsl))
            throw new NotSupportedException("WSL is required. No OCCT conversion was performed.");

        string directory = Path.Combine(Path.GetTempPath(), "foamlens-occt-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(directory);
        try
        {
            string sourceFile = Path.Combine(directory, name);
            string scriptFile = Path.Combine(directory, "convert.py");
            await File.WriteAllBytesAsync(sourceFile, input, cancellationToken);
            await File.WriteAllTextAsync(Path.Combine(directory, "settings.json"),
                JsonSerializer.Serialize(new { deflectionMm }), cancellationToken);
            using (var script = Assembly.GetExecutingAssembly()
                       .GetManifestResourceStream(ScriptResource)
                   ?? throw new InvalidOperationException("Bundled OCCT conversion script not found."))
            await using (var destination = new FileStream(scriptFile, FileMode.CreateNew,
                             FileAccess.Write, FileShare.None))
                await script.CopyToAsync(destination, cancellationToken);

            var translated = await RunProcessAsync(wsl, directory,
                new[] { "--exec", "wslpath", "-a", scriptFile },
                TimeSpan.FromSeconds(15), cancellationToken);
            string linuxScript = translated.Out.Trim();
            if (translated.ExitCode != 0 ||
                !linuxScript.StartsWith("/", StringComparison.Ordinal) ||
                linuxScript.Contains('\n') || linuxScript.Contains('\r'))
                throw new NotSupportedException("Default WSL distribution cannot map temporary CAD files.");

            var process = await RunProcessAsync(wsl, directory,
                new[] { "--exec", "/bin/bash", "-lc", LaunchScript,
                    "foamlens-occt", linuxScript }, TimeSpan.FromSeconds(90), cancellationToken);
            if (process.ExitCode == 127)
                throw new NotSupportedException(
                    "FreeCADCmd/OpenCascade is not installed in default WSL. No geometry was converted.");
            if (process.ExitCode != 0)
                throw new InvalidDataException(
                    "Installed FreeCAD/OCCT could not import or tessellate this CAD file.");
            string manifestFile = Path.Combine(directory, "conversion.json");
            var info = new FileInfo(manifestFile);
            if (!info.Exists || info.Length is < 100 or > 256000)
                throw new InvalidDataException("FreeCAD did not produce a bounded conversion manifest.");
            using var json = JsonDocument.Parse(await File.ReadAllTextAsync(manifestFile, cancellationToken));
            var root = json.RootElement;
            if (root.GetProperty("schema").GetString() != "foamlens/native-occt-conversion/1" ||
                root.GetProperty("engine").GetString() != "FreeCAD/OpenCascade" ||
                root.GetProperty("sourceFormat").GetString() != format ||
                root.GetProperty("freecadInternalCoordinateUnit").GetString() != "mm" ||
                root.GetProperty("sourceUnitsIndependentlyVerified").GetBoolean() ||
                root.GetProperty("sourceObjectLabelsPreserved").GetBoolean() ||
                root.GetProperty("originalCaseModified").GetBoolean() ||
                root.GetProperty("deflectionMm").GetDouble() != deflectionMm)
                throw new InvalidDataException("OCCT converter returned an inconsistent scientific provenance.");

            var entries = root.GetProperty("regions");
            if (entries.ValueKind != JsonValueKind.Array ||
                entries.GetArrayLength() is < 1 or > MaxRegions)
                throw new InvalidDataException("OCCT returned too many or no geometric regions.");

            var regions = new List<Region>(entries.GetArrayLength());
            var seen = new HashSet<string>(StringComparer.Ordinal);
            int totalTriangles = 0;
            foreach (var entry in entries.EnumerateArray())
            {
                cancellationToken.ThrowIfCancellationRequested();
                var file = entry.GetProperty("file").GetString() ?? "";
                var regionName = entry.GetProperty("name").GetString() ?? "";
                if (!RegionFile.IsMatch(file) || !seen.Add(file) ||
                    regionName.Length is < 1 or > 80 ||
                    !Regex.IsMatch(regionName, @"^(solid|surface)_[0-9]{3}$"))
                    throw new InvalidDataException("OCCT region identity is invalid.");
                var bytes = await File.ReadAllBytesAsync(Path.Combine(directory, file), cancellationToken);
                int count = ValidateBinaryStl(bytes);
                if (count != entry.GetProperty("triangles").GetInt32() ||
                    bytes.Length != entry.GetProperty("sizeBytes").GetInt32())
                    throw new InvalidDataException("OCCT returned a mismatched region STL.");
                totalTriangles = checked(totalTriangles + count);
                if (totalTriangles > MaxTriangles)
                    throw new InvalidDataException("OCCT exceeded the 300000-triangle CAD preview limit.");
                var bounds = entry.GetProperty("boundsMm")
                    .EnumerateArray().Select(e => e.GetDouble()).ToArray();
                var area = entry.GetProperty("surfaceAreaMm2").GetDouble();
                if (bounds.Length != 3 || bounds.Any(v => !double.IsFinite(v) || v < 0) ||
                    !double.IsFinite(area) || area < 0)
                    throw new InvalidDataException("OCCT returned invalid SI dimensions or area.");
                regions.Add(new Region(regionName, count, bytes.Length, bounds, area,
                    Convert.ToBase64String(bytes)));
            }
            if (totalTriangles != root.GetProperty("totalTriangles").GetInt32())
                throw new InvalidDataException("OCCT total triangle count differs from actual STL data.");
            return new Report("foamlens/native-occt-conversion/1",
                "FreeCAD/OpenCascade", format, "mm", false, false, false, true,
                deflectionMm, totalTriangles, regions.ToArray(),
                "Real FreeCAD/OCCT BREP tessellation, not CFD meshing. " +
                "Internal FreeCAD coordinates are millimeters; verify dimensions and source units. " +
                "Original STEP/IGES part labels are not preserved; region names reflect ordinal solids. " +
                "No OpenFOAM case was modified.");
        }
        finally
        {
            try { Directory.Delete(directory, recursive: true); }
            catch (IOException) { }
            catch (UnauthorizedAccessException) { }
        }
    }

    private sealed record ProcessOutput(int ExitCode, string Out);
    private static async Task<ProcessOutput> RunProcessAsync(
        string executable, string workingDirectory, string[] arguments,
        TimeSpan timeout, CancellationToken cancellationToken)
    {
        var psi = new ProcessStartInfo(executable)
        {
            WorkingDirectory = workingDirectory,
            UseShellExecute = false,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            CreateNoWindow = true
        };
        foreach (string arg in arguments) psi.ArgumentList.Add(arg);
        using var process = Process.Start(psi)
            ?? throw new NotSupportedException("Default WSL distribution could not start.");
        using var deadline = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        deadline.CancelAfter(timeout);
        async Task<string> Drain(StreamReader reader)
        {
            var builder = new StringBuilder();
            var buffer = new char[2048];
            int n;
            while ((n = await reader.ReadAsync(buffer.AsMemory(), deadline.Token)) > 0)
                if (builder.Length < 8000)
                    builder.Append(buffer, 0, Math.Min(n, 8000 - builder.Length));
            return builder.ToString();
        }
        var output = Drain(process.StandardOutput);
        var error = Drain(process.StandardError);
        try
        {
            await process.WaitForExitAsync(deadline.Token);
            string outText = await output;
            await error; // Consume stderr to avoid blocking FreeCAD's OS pipe.
            return new ProcessOutput(process.ExitCode, outText);
        }
        catch (OperationCanceledException)
        {
            try { if (!process.HasExited) process.Kill(entireProcessTree: true); }
            catch (InvalidOperationException) { }
            catch (System.ComponentModel.Win32Exception) { }
            cancellationToken.ThrowIfCancellationRequested();
            throw new TimeoutException("FreeCAD/OCCT conversion timed out; original case unchanged.");
        }
    }
}
