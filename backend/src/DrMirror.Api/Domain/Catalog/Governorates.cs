namespace DrMirror.Api.Domain.Catalog;

/// <summary>
/// Canonical registry of the 27 Egyptian governorates. We store the ASCII
/// slug (e.g. <c>"cairo"</c>) in <c>ShippingAddress.Governorate</c> rather
/// than an integer enum so DB rows and JSON payloads remain human-readable.
///
/// Localised display names are looked up on the SPA via i18n keys derived
/// from the slug (e.g. <c>governorates.cairo</c>). The bilingual labels
/// below are mirrored on both sides — keep them in sync.
/// </summary>
public static class Governorates
{
    /// <summary>One canonical governorate entry.</summary>
    public sealed record Entry(string Slug, string NameEn, string NameAr);

    public static readonly IReadOnlyList<Entry> All = new Entry[]
    {
        new("alexandria",   "Alexandria",    "الإسكندرية"),
        new("aswan",        "Aswan",         "أسوان"),
        new("asyut",        "Asyut",         "أسيوط"),
        new("beheira",      "Beheira",       "البحيرة"),
        new("beni-suef",    "Beni Suef",     "بني سويف"),
        new("cairo",        "Cairo",         "القاهرة"),
        new("dakahlia",     "Dakahlia",      "الدقهلية"),
        new("damietta",     "Damietta",      "دمياط"),
        new("faiyum",       "Faiyum",        "الفيوم"),
        new("gharbia",      "Gharbia",       "الغربية"),
        new("giza",         "Giza",          "الجيزة"),
        new("ismailia",     "Ismailia",      "الإسماعيلية"),
        new("kafr-el-sheikh","Kafr el-Sheikh","كفر الشيخ"),
        new("luxor",        "Luxor",         "الأقصر"),
        new("matruh",       "Matruh",        "مطروح"),
        new("minya",        "Minya",         "المنيا"),
        new("monufia",      "Monufia",       "المنوفية"),
        new("new-valley",   "New Valley",    "الوادي الجديد"),
        new("north-sinai",  "North Sinai",   "شمال سيناء"),
        new("port-said",    "Port Said",     "بورسعيد"),
        new("qalyubia",     "Qalyubia",      "القليوبية"),
        new("qena",         "Qena",          "قنا"),
        new("red-sea",      "Red Sea",       "البحر الأحمر"),
        new("sharqia",      "Sharqia",       "الشرقية"),
        new("sohag",        "Sohag",         "سوهاج"),
        new("south-sinai",  "South Sinai",   "جنوب سيناء"),
        new("suez",         "Suez",          "السويس"),
    };

    private static readonly HashSet<string> SlugSet =
        All.Select(e => e.Slug).ToHashSet(StringComparer.OrdinalIgnoreCase);

    /// <summary>True if <paramref name="slug"/> is one of the 27 canonical slugs (case-insensitive).</summary>
    public static bool IsValid(string? slug) =>
        !string.IsNullOrWhiteSpace(slug) && SlugSet.Contains(slug);

    /// <summary>
    /// Resolve a persisted or legacy free-text governorate value to the
    /// canonical slug. Accepts slugs plus English/Arabic display names so older
    /// saved addresses can still checkout when they match a known governorate.
    /// </summary>
    public static string? TryResolveSlug(string? input)
    {
        if (string.IsNullOrWhiteSpace(input)) return null;

        var trimmed = input.Trim();
        if (SlugSet.TryGetValue(trimmed, out var canonical)) return canonical;

        var key = NormalizeLookupKey(trimmed);
        foreach (var entry in All)
        {
            if (NormalizeLookupKey(entry.Slug) == key ||
                NormalizeLookupKey(entry.NameEn) == key ||
                NormalizeLookupKey(entry.NameAr) == key)
            {
                return entry.Slug;
            }
        }

        return null;
    }

    /// <summary>
    /// Normalize input to the canonical lowercase slug if recognised, otherwise
    /// return the trimmed input unchanged. Lets us migrate the locked-in
    /// validator without breaking existing free-text rows.
    /// </summary>
    public static string Normalize(string? input)
    {
        if (string.IsNullOrWhiteSpace(input)) return string.Empty;
        var trimmed = input.Trim();
        return SlugSet.TryGetValue(trimmed, out var canonical) ? canonical : trimmed;
    }

    private static string NormalizeLookupKey(string value) =>
        new(value
            .Trim()
            .ToLowerInvariant()
            .Where(c => !char.IsWhiteSpace(c) && c is not '-' and not '_' and not '.')
            .ToArray());
}
