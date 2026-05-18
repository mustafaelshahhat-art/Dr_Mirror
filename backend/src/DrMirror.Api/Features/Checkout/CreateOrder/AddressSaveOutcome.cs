using System.Text.Json;
using System.Text.Json.Serialization;

namespace DrMirror.Api.Features.Checkout.CreateOrder;

/// <summary>
/// Three-state classification of whether the buyer's inline shipping address
/// was persisted to their address book during checkout. Serialised as a
/// snake-case string on the wire (<c>"not_requested"</c>, <c>"saved"</c>,
/// <c>"skipped_book_full"</c>). See <c>contracts/checkout-response.md</c>.
/// </summary>
[JsonConverter(typeof(AddressSaveOutcomeJsonConverter))]
public enum AddressSaveOutcome
{
    NotRequested = 0,
    Saved = 1,
    SkippedBookFull = 2,
}

public sealed class AddressSaveOutcomeJsonConverter : JsonConverter<AddressSaveOutcome>
{
    public override AddressSaveOutcome Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        return reader.GetString() switch
        {
            "not_requested" => AddressSaveOutcome.NotRequested,
            "saved" => AddressSaveOutcome.Saved,
            "skipped_book_full" => AddressSaveOutcome.SkippedBookFull,
            _ => throw new JsonException($"Unknown addressSaveOutcome value: '{reader.GetString()}'"),
        };
    }

    public override void Write(Utf8JsonWriter writer, AddressSaveOutcome value, JsonSerializerOptions options)
    {
        writer.WriteStringValue(value switch
        {
            AddressSaveOutcome.NotRequested => "not_requested",
            AddressSaveOutcome.Saved => "saved",
            AddressSaveOutcome.SkippedBookFull => "skipped_book_full",
            _ => throw new JsonException($"Unknown addressSaveOutcome value: {value}"),
        });
    }
}
