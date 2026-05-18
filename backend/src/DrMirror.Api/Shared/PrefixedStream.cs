namespace DrMirror.Api.Shared;

/// <summary>
/// Wraps a byte-array prefix followed by an inner stream into a single
/// contiguous read-only <see cref="Stream"/>. Used to read only the file
/// header for magic-byte validation, then stream the complete content
/// (header + body) to the storage service without buffering the whole file.
/// </summary>
public sealed class PrefixedStream : Stream
{
    private readonly byte[] _prefix;
    private int _prefixOffset;
    private readonly Stream _inner;
    private bool _disposed;

    public PrefixedStream(byte[] prefix, Stream inner)
    {
        _prefix = prefix;
        _inner = inner;
    }

    public override bool CanRead => true;
    public override bool CanSeek => false;
    public override bool CanWrite => false;
    public override long Length
    {
        get
        {
            if (_inner.CanSeek)
            {
                return _prefix.Length + (_inner.Length - _inner.Position);
            }
            // The inner stream does not support seeking, so total length is
            // unknown. Callers that need Length (e.g. some test fakes) must
            // pass a seekable inner stream, or avoid accessing Length.
            throw new NotSupportedException();
        }
    }
    public override long Position
    {
        get => throw new NotSupportedException();
        set => throw new NotSupportedException();
    }

    public override void Flush() { }

    public override int Read(byte[] buffer, int offset, int count)
    {
        var total = 0;
        if (_prefixOffset < _prefix.Length)
        {
            var remaining = _prefix.Length - _prefixOffset;
            var take = Math.Min(remaining, count);
            Buffer.BlockCopy(_prefix, _prefixOffset, buffer, offset, take);
            _prefixOffset += take;
            total += take;
            offset += take;
            count -= take;
        }

        if (count > 0)
        {
            total += _inner.Read(buffer, offset, count);
        }

        return total;
    }

    public override long Seek(long offset, SeekOrigin origin) =>
        throw new NotSupportedException();

    public override void SetLength(long value) =>
        throw new NotSupportedException();

    public override void Write(byte[] buffer, int offset, int count) =>
        throw new NotSupportedException();

    protected override void Dispose(bool disposing)
    {
        if (!_disposed)
        {
            if (disposing)
            {
                _inner.Dispose();
            }
            _disposed = true;
        }
        base.Dispose(disposing);
    }
}
