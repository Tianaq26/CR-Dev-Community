using System.Text.RegularExpressions;

namespace CrDev.Api.Services;

/// <summary>Only http(s) links and our own uploaded media may be stored; blocks javascript:, data: and friends.</summary>
public static partial class UrlRules
{
    [GeneratedRegex("^/api/media/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$")]
    private static partial Regex OwnMedia();

    public static bool IsHttp(string? value) =>
        Uri.TryCreate(value, UriKind.Absolute, out var uri)
        && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps)
        && !string.IsNullOrEmpty(uri.Host);

    public static bool IsOwnMedia(string? value) => value is not null && OwnMedia().IsMatch(value);

    public static bool IsImage(string? value) => IsHttp(value) || IsOwnMedia(value);

    /// <summary>Returns null for empty input, the trimmed value if valid, or sets <paramref name="error"/>.</summary>
    public static string? OptionalHttp(string? value, out bool error)
    {
        error = false;
        var trimmed = value?.Trim();
        if (string.IsNullOrEmpty(trimmed)) return null;
        if (!IsHttp(trimmed)) error = true;
        return trimmed;
    }

    public static string? Blank(string? value)
    {
        var collapsed = SkillKey.CollapseSpaces(value);
        return collapsed.Length == 0 ? null : collapsed;
    }
}
