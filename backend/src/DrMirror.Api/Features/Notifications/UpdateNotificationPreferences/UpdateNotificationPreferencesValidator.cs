using FluentValidation;

namespace DrMirror.Api.Features.Notifications.UpdateNotificationPreferences;

public sealed class UpdateNotificationPreferencesValidator : AbstractValidator<UpdateNotificationPreferencesRequest>
{
    public UpdateNotificationPreferencesValidator()
    {
        RuleFor(x => x.WhatsAppEnabled).NotNull().WithMessage("Required");
    }
}
