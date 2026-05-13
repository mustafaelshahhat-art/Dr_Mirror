using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace DrMirror.Api.Shared.Slugs;

/// <summary>
/// Deterministic ASCII slug generator. Strips diacritics, drops non-ASCII
/// glyphs (Arabic, CJK, etc.), collapses whitespace + punctuation into single
/// hyphens, and lowercases the whole thing.
///
/// Designed to feed off the English product/category name. If you give it
/// pure non-ASCII input (e.g. Arabic only) you'll get an empty string back —
/// callers must validate that and fall back / surface an error.
/// </summary>
public static partial class SlugGenerator
{
    [GeneratedRegex(@"[^a-z0-9]+", RegexOptions.CultureInvariant)]
    private static partial Regex NonAlphanumeric();

    [GeneratedRegex(@"^-+|-+$", RegexOptions.CultureInvariant)]
    private static partial Regex EdgeHyphens();

    /// <summary>
    /// Produce a normalized slug from <paramref name="source"/>. Returns
    /// <see cref="string.Empty"/> when the input has no ASCII alphanumerics.
    /// </summary>
    public static string Slugify(string source)
    {
        if (string.IsNullOrWhiteSpace(source)) return string.Empty;

        // Decompose unicode then drop combining marks (é → e, etc.).
        var normalized = source.Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder(normalized.Length);
        foreach (var ch in normalized)
        {
            var category = CharUnicodeInfo.GetUnicodeCategory(ch);
            if (category == UnicodeCategory.NonSpacingMark) continue;
            sb.Append(ch);
        }

        var lowered = sb.ToString().ToLowerInvariant();

        // Replace any run of non-[a-z0-9] with a single hyphen, then trim.
        var hyphenated = NonAlphanumeric().Replace(lowered, "-");
        var trimmed = EdgeHyphens().Replace(hyphenated, string.Empty);

        return trimmed;
    }

    /// <summary>
    /// Make <paramref name="desired"/> unique against <paramref name="alreadyTaken"/>
    /// by appending "-2", "-3", … until a collision-free value is found.
    /// </summary>
    public static string MakeUnique(string desired, ISet<string> alreadyTaken)
    {
        if (!alreadyTaken.Contains(desired)) return desired;

        for (var i = 2; i < int.MaxValue; i++)
        {
            var candidate = $"{desired}-{i}";
            if (!alreadyTaken.Contains(candidate)) return candidate;
        }

        // Astronomically unlikely; appease the compiler.
        throw new InvalidOperationException("Could not allocate a unique slug.");
    }
}
