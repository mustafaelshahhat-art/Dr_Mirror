using DrMirror.Api.Features.Inquiries.Submit;

namespace DrMirror.Api.Features.Inquiries;

public static class InquiryEndpoints
{
    public static IEndpointRouteBuilder MapInquiryEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/inquiries").WithTags("Inquiries");
        group.MapSubmitInquiry();
        return app;
    }
}
