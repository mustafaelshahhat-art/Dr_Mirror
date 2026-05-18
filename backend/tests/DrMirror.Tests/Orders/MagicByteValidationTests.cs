using DrMirror.Api.Shared;

namespace DrMirror.Tests.Orders;

/// <summary>
/// Verifies the magic-byte lookup table used by <c>UploadPaymentProofEndpoint</c>
/// to prevent content-type spoofing.
///
/// These are pure data tests — they document the expected byte signatures for each
/// supported MIME type without calling into the endpoint itself.
/// </summary>
public class MagicByteValidationTests
{
    private static readonly Dictionary<string, byte[]> MagicBytes =
        new(StringComparer.OrdinalIgnoreCase)
        {
            { "image/jpeg",      new byte[] { 0xFF, 0xD8, 0xFF } },
            { "image/png",       new byte[] { 0x89, 0x50, 0x4E, 0x47 } },
            { "image/webp",      new byte[] { 0x52, 0x49, 0x46, 0x46 } },
        };

    private static bool ValidateHeader(byte[] fileHeader, string contentType)
    {
        // HEIC/HEIF use a complex ISOBMFF container; skip magic-byte check.
        if (contentType.Equals("image/heic", StringComparison.OrdinalIgnoreCase) ||
            contentType.Equals("image/heif", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        if (!MagicBytes.TryGetValue(contentType, out var magic)) return false;
        if (fileHeader.Length < magic.Length) return false;
        return fileHeader.Take(magic.Length).SequenceEqual(magic);
    }

    // ── Valid signatures ─────────────────────────────────────────────────────

    [Fact]
    public void JPEG_magic_bytes_are_correct()
    {
        var header = new byte[] { 0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10 };
        Assert.True(ValidateHeader(header, "image/jpeg"));
    }

    [Fact]
    public void PNG_magic_bytes_are_correct()
    {
        var header = new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A };
        Assert.True(ValidateHeader(header, "image/png"));
    }

    [Fact]
    public void WebP_magic_bytes_are_correct()
    {
        // WebP starts with RIFF....WEBP but we only check the 4-byte RIFF header.
        var header = new byte[] { 0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00 };
        Assert.True(ValidateHeader(header, "image/webp"));
    }

    [Fact]
    public void PDF_content_type_is_not_supported()
    {
        var header = new byte[] { 0x25, 0x50, 0x44, 0x46, 0x2D };  // %PDF-
        Assert.False(ValidateHeader(header, "application/pdf"));
    }

    [Fact]
    public void HEIC_skips_magic_byte_check_and_passes()
    {
        // HEIC has no simple fixed signature; we allow it through unconditionally.
        Assert.True(ValidateHeader(Array.Empty<byte>(), "image/heic"));
        Assert.True(ValidateHeader(Array.Empty<byte>(), "image/heif"));
    }

    // ── Invalid signatures / spoofing ────────────────────────────────────────

    [Fact]
    public void PNG_header_with_jpeg_content_type_is_rejected()
    {
        var pngHeader = new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A };
        Assert.False(ValidateHeader(pngHeader, "image/jpeg"));
    }

    [Fact]
    public void JPEG_header_with_pdf_content_type_is_rejected()
    {
        var jpegHeader = new byte[] { 0xFF, 0xD8, 0xFF };
        Assert.False(ValidateHeader(jpegHeader, "application/pdf"));
    }

    [Fact]
    public void Text_file_with_image_jpeg_content_type_is_rejected()
    {
        var textHeader = System.Text.Encoding.ASCII.GetBytes("Hello, world!");
        Assert.False(ValidateHeader(textHeader, "image/jpeg"));
    }

    [Fact]
    public void Truncated_header_is_rejected()
    {
        var truncated = new byte[] { 0xFF }; // too short for JPEG (needs 3 bytes)
        Assert.False(ValidateHeader(truncated, "image/jpeg"));
    }

    [Fact]
    public void Unknown_content_type_is_rejected()
    {
        var someBytes = new byte[] { 0x01, 0x02, 0x03, 0x04 };
        Assert.False(ValidateHeader(someBytes, "application/octet-stream"));
    }

    // ── PrefixedStream integration ────────────────────────────────────────────

    [Fact]
    public async Task PrefixedStream_reads_prefix_then_inner_stream_seamlessly()
    {
        var prefix = new byte[] { 0xFF, 0xD8, 0xFF };
        var body = "EXIF data here..."u8.ToArray();
        using var inner = new MemoryStream(body);
        using var combined = new PrefixedStream(prefix, inner);

        var buffer = new byte[prefix.Length + body.Length];
        var totalRead = await combined.ReadAsync(buffer);

        Assert.Equal(prefix.Length + body.Length, totalRead);
        Assert.Equal(prefix, buffer[..prefix.Length]);
        Assert.Equal(body, buffer[prefix.Length..]);
    }

    [Fact]
    public async Task PrefixedStream_partial_reads_work_correctly()
    {
        var prefix = new byte[] { 0x89, 0x50, 0x4E, 0x47 };
        var body = new byte[] { 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D };
        using var inner = new MemoryStream(body);
        using var combined = new PrefixedStream(prefix, inner);

        // Read only a few bytes at a time
        var first = new byte[3];
        var n1 = combined.Read(first, 0, 3);
        Assert.Equal(3, n1);
        Assert.Equal(new byte[] { 0x89, 0x50, 0x4E }, first);

        var second = new byte[5];
        var n2 = combined.Read(second, 0, 5);
        Assert.Equal(5, n2);
        Assert.Equal(new byte[] { 0x47, 0x0D, 0x0A, 0x1A, 0x0A }, second);
    }

    [Fact]
    public async Task PrefixedStream_with_empty_prefix_passes_through()
    {
        var body = "hello"u8.ToArray();
        using var inner = new MemoryStream(body);
        using var combined = new PrefixedStream([], inner);

        var buffer = new byte[5];
        var n = await combined.ReadAsync(buffer);
        Assert.Equal(5, n);
        Assert.Equal("hello"u8.ToArray(), buffer);
    }
}
