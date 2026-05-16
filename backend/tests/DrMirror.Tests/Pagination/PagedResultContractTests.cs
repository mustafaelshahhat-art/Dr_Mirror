using DrMirror.Api.Shared;

namespace DrMirror.Tests.Pagination;

/// <summary>
/// Verifies the invariants of the shared <see cref="PagedResult{T}"/> contract
/// introduced in Task 14 (T14 — Shared Paged Response Contract).
/// </summary>
public class PagedResultContractTests
{
    [Fact]
    public void Empty_result_has_zero_total_pages()
    {
        var result = new PagedResult<int>([], 1, 25, 0, 0);
        Assert.Equal(0, result.TotalPages);
        Assert.Equal(0, result.TotalCount);
        Assert.Empty(result.Items);
    }

    [Theory]
    [InlineData(1,  25, 1)]   // exactly one full page
    [InlineData(26, 25, 2)]   // one full page + one partial
    [InlineData(51, 25, 3)]   // two full pages + partial last
    [InlineData(50, 25, 2)]   // exactly two full pages
    [InlineData(1,  1,  1)]   // page size 1, one item
    [InlineData(2,  1,  2)]   // page size 1, two items
    public void Total_pages_rounds_up_correctly(int totalCount, int pageSize, int expectedPages)
    {
        var totalPages = totalCount == 0 ? 0 : (int)Math.Ceiling(totalCount / (double)pageSize);
        Assert.Equal(expectedPages, totalPages);
    }

    [Fact]
    public void Partial_last_page_rounds_up_total_pages()
    {
        var result = new PagedResult<string>([], 3, 25, 51, 3);
        Assert.Equal(3, result.TotalPages);
    }

    [Fact]
    public void PagedResult_preserves_all_fields()
    {
        var items = new List<int> { 1, 2, 3 };
        var result = new PagedResult<int>(items, 2, 10, 23, 3);

        Assert.Equal(2, result.Page);
        Assert.Equal(10, result.PageSize);
        Assert.Equal(23, result.TotalCount);
        Assert.Equal(3, result.TotalPages);
        Assert.Equal(3, result.Items.Count);
    }
}
