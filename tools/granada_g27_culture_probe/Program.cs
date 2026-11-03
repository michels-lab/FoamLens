using System.Globalization;
using System.Text.Json;

if (args.Length != 1 || args[0] is not ("en-US" or "es-MX" or "fr-FR" or "de-DE"))
{
    Console.Error.WriteLine("G27 witness requires one explicit permitted Windows locale.");
    return 2;
}
var requested = args[0];
var actual = CultureInfo.CurrentCulture;
if (!string.Equals(actual.Name, requested, StringComparison.OrdinalIgnoreCase))
{
    Console.Error.WriteLine("G27 locale transition NOT effective in a new actual .NET process: requested=" +
        requested + ", got=" + actual.Name);
    return 3;
}
var scientific = new[] { "0.001", "9.8", "-1.2345e-6", "2.3412E+03" };
var expected = new[] { 0.001, 9.8, -1.2345e-6, 2341.2 };
for (var i = 0; i < scientific.Length; i++)
{
    if (!double.TryParse(scientific[i], NumberStyles.Float, CultureInfo.InvariantCulture, out var parsed) ||
        !double.IsFinite(parsed) ||
        Math.Abs(parsed - expected[i]) > Math.Max(1e-12, Math.Abs(expected[i]) * 1e-12))
    {
        Console.Error.WriteLine("G27 independent invariant parsing witness failed at index " + i);
        return 4;
    }
}
var usesComma = requested is "fr-FR" or "de-DE";
if (usesComma && actual.NumberFormat.NumberDecimalSeparator != ",")
{
    Console.Error.WriteLine("G27 comma-decimal OS culture was not actually activated");
    return 5;
}
if (usesComma && double.TryParse("9.8", NumberStyles.Float, actual, out _))
{
    Console.Error.WriteLine("G27 false-positive: expected current-culture 9.8 to be rejected in comma locale");
    return 6;
}
Console.WriteLine(JsonSerializer.Serialize(new
{
    schema = "foamlens/granada-g27-native-culture-witness/1",
    requestedCulture = requested,
    observedCulture = actual.Name,
    decimalSeparator = actual.NumberFormat.NumberDecimalSeparator,
    originalScientificTokens = scientific.Length,
    invariantDecimalNumbersParsed = true,
    localeWitnessWasNewProcess = true
}));
return 0;
