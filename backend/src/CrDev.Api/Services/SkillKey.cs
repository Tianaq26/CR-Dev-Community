using System.Text;

namespace CrDev.Api.Services;

/// <summary>
/// Skills are matched through a normalized key so "Músico", "musico" and " MÚSICO " are the same thing.
/// Done with an explicit map so it behaves the same with or without ICU in the runtime image.
/// </summary>
public static class SkillKey
{
    public const int MaxLength = 40;

    private const string From = "áàäâãåéèëêíìïîóòöôõúùüûñç";
    private const string To   = "aaaaaaeeeeiiiiooooouuuunc";

    public static string Of(string name)
    {
        var sb = new StringBuilder(name.Length);
        var lastWasSpace = true;
        foreach (var raw in name.Trim().ToLowerInvariant())
        {
            var ch = raw;
            var idx = From.IndexOf(ch);
            if (idx >= 0) ch = To[idx];

            if (char.IsWhiteSpace(ch))
            {
                if (!lastWasSpace) sb.Append(' ');
                lastWasSpace = true;
            }
            else
            {
                sb.Append(ch);
                lastWasSpace = false;
            }
        }
        return sb.ToString().TrimEnd();
    }

    /// <summary>Cleans a free-form list: trims, drops empties/duplicates/control chars and over-long entries.</summary>
    public static List<(string Key, string Name)> Clean(IEnumerable<string>? names, int max = 20)
    {
        var result = new List<(string, string)>();
        var seen = new HashSet<string>();
        foreach (var raw in names ?? [])
        {
            var name = CollapseSpaces(raw);
            if (name.Length is 0 or > MaxLength) continue;
            if (name.Any(char.IsControl)) continue;
            var key = Of(name);
            if (key.Length == 0 || !seen.Add(key)) continue;
            result.Add((key, name));
            if (result.Count >= max) break;
        }
        return result;
    }

    public static string CollapseSpaces(string? value) =>
        string.Join(' ', (value ?? "").Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries));
}
