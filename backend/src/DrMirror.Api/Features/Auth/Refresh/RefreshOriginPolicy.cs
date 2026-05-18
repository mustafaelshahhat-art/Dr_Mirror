namespace DrMirror.Api.Features.Auth.Refresh;

/// <summary>
/// The three classifications a refresh request's <c>Origin</c> header can land in.
/// </summary>
public enum RefreshOriginVerdict
{
    Accept,
    Reject_MissingOrigin,
    Reject_UnknownOrigin,
}

/// <summary>
/// Pure-function evaluator for the refresh-endpoint Origin allowlist gate.
/// Reads the same allowlist consumed by CORS; rejects anything that does not
/// exact-match (case-insensitive, RFC 6454 scheme + host + port) one of the
/// configured origins.
/// </summary>
public static class RefreshOriginPolicy
{
    public static RefreshOriginVerdict Evaluate(string? originHeader, IReadOnlyCollection<string> allowlist)
    {
        if (string.IsNullOrWhiteSpace(originHeader))
        {
            return RefreshOriginVerdict.Reject_MissingOrigin;
        }

        if (allowlist.Count == 0)
        {
            return RefreshOriginVerdict.Reject_UnknownOrigin;
        }

        foreach (var allowed in allowlist)
        {
            if (string.IsNullOrWhiteSpace(allowed)) continue;
            if (string.Equals(allowed.TrimEnd('/'), originHeader.TrimEnd('/'), StringComparison.OrdinalIgnoreCase))
            {
                return RefreshOriginVerdict.Accept;
            }
        }

        return RefreshOriginVerdict.Reject_UnknownOrigin;
    }
}
