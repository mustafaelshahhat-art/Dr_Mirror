using DrMirror.Api.Shared.Slugs;

namespace DrMirror.Tests.Catalog;

public class SlugGeneratorTests
{
    [Theory]
    [InlineData("Hello World", "hello-world")]
    [InlineData("  Trimmed  spaces  ", "trimmed-spaces")]
    [InlineData("Multiple---Dashes", "multiple-dashes")]
    [InlineData("Café résumé", "cafe-resume")] // diacritics stripped
    [InlineData("Philips IntelliVue MX800 Patient Monitor", "philips-intellivue-mx800-patient-monitor")]
    [InlineData("Already-kebab-case", "already-kebab-case")]
    [InlineData("Numbers 123 stay 456", "numbers-123-stay-456")]
    [InlineData("!!@@##$$ symbols only $$", "symbols-only")]
    public void Slugify_normalizes_to_ascii_kebab_case(string input, string expected)
    {
        Assert.Equal(expected, SlugGenerator.Slugify(input));
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("جهاز موجات فوق صوتية")] // pure Arabic — no ASCII alphanumerics
    [InlineData("!!!@@@###")]
    public void Slugify_returns_empty_when_no_ascii_alphanumerics(string input)
    {
        Assert.Equal(string.Empty, SlugGenerator.Slugify(input));
    }

    [Fact]
    public void MakeUnique_returns_input_when_not_taken()
    {
        var taken = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        var result = SlugGenerator.MakeUnique("hello-world", taken);

        Assert.Equal("hello-world", result);
    }

    [Fact]
    public void MakeUnique_appends_2_on_first_collision()
    {
        var taken = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "hello-world" };

        Assert.Equal("hello-world-2", SlugGenerator.MakeUnique("hello-world", taken));
    }

    [Fact]
    public void MakeUnique_increments_until_free()
    {
        var taken = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "x", "x-2", "x-3", "x-4",
        };

        Assert.Equal("x-5", SlugGenerator.MakeUnique("x", taken));
    }

    [Fact]
    public void MakeUnique_collision_check_is_case_insensitive()
    {
        var taken = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "Hello-World" };

        // Even though our slugifier emits lowercase, the helper must be tolerant
        // because callers may seed the set with mixed-case entries from a DB.
        Assert.Equal("hello-world-2", SlugGenerator.MakeUnique("hello-world", taken));
    }
}
