using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace FoamLensDesktop;

internal sealed record FoamBoundaryPatchInfo(string Name, string Type, int StartFace, int NFaces);

internal sealed record FoamBoundaryFieldPatchInfo(
    string Name,
    string Type,
    bool HasExplicitValue,
    bool Uniform,
    double? UniformScalar,
    double[]? UniformComponents,
    double[]? ScalarValues,
    double[][]? ComponentValues,
    int? Count,
    int? DeclaredCount,
    string Reason);

internal static class OpenFoamBoundarySupport
{
    private static string StripComments(string text) =>
        Regex.Replace(
            Regex.Replace(text ?? "", @"/\*[\s\S]*?\*/", ""),
            @"//.*$", "", RegexOptions.Multiline);

    private static int FindMatching(string text, int openIndex, char open, char close)
    {
        var depth = 0;
        var quote = '\0';
        for (var i = openIndex; i < text.Length; i++)
        {
            var ch = text[i];
            if (quote != '\0')
            {
                if (ch == quote && (i == 0 || text[i - 1] != '\\')) quote = '\0';
                continue;
            }
            if (ch is '"' or '\'') { quote = ch; continue; }
            if (ch == open) depth++;
            else if (ch == close && --depth == 0) return i;
        }
        return -1;
    }

    private static int SkipSpace(string text, int i)
    {
        while (i < text.Length && (char.IsWhiteSpace(text[i]) || text[i] == ';')) i++;
        return i;
    }

    private static bool TryReadWord(string text, ref int i, out string word)
    {
        i = SkipSpace(text, i);
        if (i >= text.Length) { word = ""; return false; }
        if (text[i] == '"')
        {
            var end = i + 1;
            while (end < text.Length && (text[end] != '"' || text[end - 1] == '\\')) end++;
            if (end >= text.Length) { word = ""; return false; }
            word = text[(i + 1)..end];
            i = end + 1;
            return true;
        }
        var start = i;
        while (i < text.Length && !char.IsWhiteSpace(text[i]) && text[i] is not '{' and not '}' and not ';' and not '(' and not ')') i++;
        if (i <= start) { word = ""; return false; }
        word = text[start..i];
        return true;
    }

    private static List<(string Name, string Body)> ParseNamedBlocks(string body)
    {
        var outBlocks = new List<(string, string)>();
        var i = 0;
        while (i < body.Length)
        {
            i = SkipSpace(body, i);
            if (i >= body.Length) break;
            if (!TryReadWord(body, ref i, out var name)) { i++; continue; }
            i = SkipSpace(body, i);
            if (i >= body.Length || body[i] != '{')
            {
                while (i < body.Length && body[i] != ';' && body[i] != '\n') i++;
                continue;
            }
            var close = FindMatching(body, i, '{', '}');
            if (close < 0) break;
            outBlocks.Add((name, body[(i + 1)..close]));
            i = close + 1;
        }
        return outBlocks;
    }

    private static string EntryWord(string body, string key)
    {
        var m = Regex.Match(body, @"\b" + Regex.Escape(key) + @"\s+([^;\s]+)\s*;", RegexOptions.IgnoreCase);
        return m.Success ? m.Groups[1].Value.Trim().Trim('"') : "";
    }

    private static int? EntryInt(string body, string key)
    {
        var m = Regex.Match(body, @"\b" + Regex.Escape(key) + @"\s+([-+]?\d+)\s*;", RegexOptions.IgnoreCase);
        return m.Success && int.TryParse(m.Groups[1].Value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var v) ? v : null;
    }

    public static (FoamBoundaryPatchInfo[] Patches, string Status) ParseMeshBoundary(byte[]? data)
    {
        if (data is null || data.Length == 0) return (Array.Empty<FoamBoundaryPatchInfo>(), "not-provided");
        var text = StripComments(Encoding.Latin1.GetString(data));
        var foam = text.IndexOf("FoamFile", StringComparison.OrdinalIgnoreCase);
        var start = 0;
        if (foam >= 0)
        {
            var brace = text.IndexOf('{', foam);
            var close = brace >= 0 ? FindMatching(text, brace, '{', '}') : -1;
            if (close >= 0) start = close + 1;
        }
        var tail = text[start..];
        var countMatch = Regex.Match(tail, @"(?:^|\s)(\d+)\s*\(", RegexOptions.Multiline);
        if (!countMatch.Success) return (Array.Empty<FoamBoundaryPatchInfo>(), "boundary-list-header-not-found");
        if (!int.TryParse(countMatch.Groups[1].Value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var declared) || declared < 0)
            return (Array.Empty<FoamBoundaryPatchInfo>(), "boundary-list-count-invalid");
        var open = start + countMatch.Index + countMatch.Value.LastIndexOf('(');
        var closeList = FindMatching(text, open, '(', ')');
        if (closeList < 0) return (Array.Empty<FoamBoundaryPatchInfo>(), "boundary-list-close-not-found");
        var blocks = ParseNamedBlocks(text[(open + 1)..closeList]);
        var patches = new List<FoamBoundaryPatchInfo>();
        foreach (var (name, body) in blocks)
        {
            var nFaces = EntryInt(body, "nFaces");
            var startFace = EntryInt(body, "startFace");
            if (!nFaces.HasValue || !startFace.HasValue || nFaces.Value < 0 || startFace.Value < 0)
                return (Array.Empty<FoamBoundaryPatchInfo>(), "boundary-patch-range-invalid:" + name);
            patches.Add(new FoamBoundaryPatchInfo(name, EntryWord(body, "type"), startFace.Value, nFaces.Value));
        }
        if (patches.Count != declared)
            return (Array.Empty<FoamBoundaryPatchInfo>(), $"boundary-patch-count-mismatch:{patches.Count}/{declared}");
        return (patches.ToArray(), "ok");
    }

    public static async Task<FoamBoundaryFieldPatchInfo[]> ReadFieldBoundaryPatchesAsync(
        string path, string kind, CancellationToken ct)
    {
        var captured = new StringBuilder();
        var found = false;
        var opened = false;
        var depth = 0;
        await using var stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite,
            bufferSize: 65536, useAsync: true);
        using var reader = new StreamReader(stream, Encoding.UTF8, detectEncodingFromByteOrderMarks: true, bufferSize: 65536);
        while (!reader.EndOfStream)
        {
            ct.ThrowIfCancellationRequested();
            var raw = await reader.ReadLineAsync(ct) ?? "";
            if (!found)
            {
                var at = raw.IndexOf("boundaryField", StringComparison.Ordinal);
                if (at < 0) continue;
                found = true;
                raw = raw[at..];
            }
            captured.AppendLine(raw);
            var line = StripComments(raw);
            for (var i = 0; i < line.Length; i++)
            {
                if (line[i] == '{') { depth++; opened = true; }
                else if (line[i] == '}' && opened) depth--;
            }
            if (opened && depth <= 0) break;
            if (captured.Length > 64 * 1024 * 1024)
                return Array.Empty<FoamBoundaryFieldPatchInfo>();
        }
        if (!found) return Array.Empty<FoamBoundaryFieldPatchInfo>();
        return ParseFieldBoundary(captured.ToString(), kind);
    }

    public static FoamBoundaryFieldPatchInfo[] ParseFieldBoundary(string text, string kind)
    {
        var clean = StripComments(text);
        var marker = Regex.Match(clean, @"\bboundaryField\b", RegexOptions.IgnoreCase);
        if (!marker.Success) return Array.Empty<FoamBoundaryFieldPatchInfo>();
        var open = clean.IndexOf('{', marker.Index + marker.Length);
        if (open < 0) return Array.Empty<FoamBoundaryFieldPatchInfo>();
        var close = FindMatching(clean, open, '{', '}');
        if (close < 0) return Array.Empty<FoamBoundaryFieldPatchInfo>();
        var patches = new List<FoamBoundaryFieldPatchInfo>();
        foreach (var (name, body) in ParseNamedBlocks(clean[(open + 1)..close]))
            patches.Add(ParseFieldPatch(name, body, kind));
        return patches.ToArray();
    }

    private static FoamBoundaryFieldPatchInfo ParseFieldPatch(string name, string body, string kind)
    {
        var type = EntryWord(body, "type");
        var uniform = Regex.Match(body, @"\bvalue\s+uniform\s+([^;]+)\s*;", RegexOptions.IgnoreCase | RegexOptions.Singleline);
        if (uniform.Success)
        {
            var valueText = uniform.Groups[1].Value.Trim();
            if (kind == "scalar" && double.TryParse(valueText, NumberStyles.Float, CultureInfo.InvariantCulture, out var scalar))
                return new(name, type, true, true, scalar, null, null, null, null, null, "");
            var count = ComponentCount(kind);
            if (count > 0 && TryParseComponents(valueText, count, out var components))
                return new(name, type, true, true, null, components, null, null, null, null, "");
            return new(name, type, false, true, null, null, null, null, null, null, "invalid-uniform-value");
        }

        var nonuniform = Regex.Match(body,
            @"\bvalue\s+nonuniform\s+(?:List<\s*(?:scalar|vector|tensor|symmTensor|sphericalTensor)\s*>|[^\s]+)\s+(\d+)\s*\(",
            RegexOptions.IgnoreCase | RegexOptions.Singleline);
        if (nonuniform.Success)
        {
            if (!int.TryParse(nonuniform.Groups[1].Value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var declared) || declared < 0)
                return new(name, type, false, false, null, null, null, null, null, null, "invalid-nonuniform-count");
            var openList = nonuniform.Index + nonuniform.Value.LastIndexOf('(');
            var closeList = FindMatching(body, openList, '(', ')');
            if (closeList < 0)
                return new(name, type, false, false, null, null, null, null, null, declared, "nonuniform-list-close-not-found");
            var listBody = body[(openList + 1)..closeList];
            if (kind == "scalar")
            {
                var values = Regex.Matches(listBody, @"[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?")
                    .Select(m => double.Parse(m.Value, CultureInfo.InvariantCulture)).ToArray();
                if (values.Length != declared)
                    return new(name, type, false, false, null, null, values, null, values.Length, declared, "nonuniform-count-mismatch");
                return new(name, type, true, false, null, null, values, null, values.Length, declared, "");
            }
            var componentCount = ComponentCount(kind);
            if (componentCount <= 0)
                return new(name, type, false, false, null, null, null, null, null, declared, "unsupported-field-kind");
            var tuples = new List<double[]>();
            foreach (Match tuple in Regex.Matches(listBody, @"\([^()]*\)"))
                if (TryParseComponents(tuple.Value, componentCount, out var components)) tuples.Add(components);
            if (tuples.Count != declared)
                return new(name, type, false, false, null, null, null, tuples.ToArray(), tuples.Count, declared, "nonuniform-count-mismatch");
            return new(name, type, true, false, null, null, null, tuples.ToArray(), tuples.Count, declared, "");
        }

        return new(name, type, false, false, null, null, null, null, null, null, "no-explicit-value");
    }

    private static int ComponentCount(string kind) => kind switch
    {
        "scalar" => 1,
        "vector" => 3,
        "tensor" => 9,
        "symmTensor" => 6,
        "sphericalTensor" => 1,
        _ => 0
    };

    private static bool TryParseComponents(string text, int expected, out double[] values)
    {
        var s = (text ?? "").Trim();
        if (s.Length >= 2 && s[0] == '(' && s[^1] == ')') s = s[1..^1].Trim();
        var parts = s.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length != expected) { values = Array.Empty<double>(); return false; }
        values = new double[expected];
        for (var i = 0; i < expected; i++)
            if (!double.TryParse(parts[i], NumberStyles.Float, CultureInfo.InvariantCulture, out values[i]))
            { values = Array.Empty<double>(); return false; }
        return true;
    }
}
