using DrMirror.Api.Domain.Orders;

namespace DrMirror.Api.Infrastructure.WhatsApp;

public static class WhatsAppMessageTemplates
{
    private static readonly Dictionary<(string EventType, string Status), string> _templates = new()
    {
        [("OrderConfirmation", "")] = "مرحباً! تم استلام طلبك #{0} بنجاح في Dr. Mirror. سنبدأ بمعالجته قريباً.",
        [("OrderStatusChanged", "Confirmed")] = "تم تأكيد طلبك #{0} في Dr. Mirror وهو الآن قيد المعالجة.",
        [("OrderStatusChanged", "Preparing")] = "طلبك #{0} في Dr. Mirror قيد التجهيز الآن.",
        [("OrderStatusChanged", "Shipped")] = "تم شحن طلبك #{0} من Dr. Mirror. سيصلك قريباً!",
        [("OrderStatusChanged", "Delivered")] = "تم تسليم طلبك #{0} من Dr. Mirror. نتمنى أن ينال إعجابك!",
        [("OrderStatusChanged", "Cancelled")] = "تم إلغاء طلبك #{0} في Dr. Mirror. للاستفسار تواصل معنا.",
        [("ReturnCreated", "")] = "تم استلام طلب الإرجاع الخاص بك رقم #{0} في Dr. Mirror. سنراجعه قريباً.",
        [("ReturnStatusChanged", "Approved")] = "تمت الموافقة على طلب الإرجاع #{0} في Dr. Mirror.",
        [("ReturnStatusChanged", "Rejected")] = "نأسف، تم رفض طلب الإرجاع #{0} في Dr. Mirror.",
        [("ReturnStatusChanged", "Received")] = "تم استلام المنتج المُعاد في Dr. Mirror بنجاح — الرقم #{0}.",
        [("ReturnStatusChanged", "Completed")] = "تم إتمام طلب الإرجاع #{0} في Dr. Mirror بالكامل.",
        [("ReturnStatusChanged", "Requested")] = "تم استلام طلب الإرجاع الخاص بك رقم #{0} في Dr. Mirror. سنراجعه قريباً.",
    };

    public static string OrderConfirmation(string orderNumber) =>
        _templates.TryGetValue(("OrderConfirmation", ""), out var t)
            ? string.Format(t, orderNumber)
            : $"تم استلام طلبك #{orderNumber} بنجاح في Dr. Mirror.";

    public static string OrderStatusChanged(string orderNumber, OrderStatus status) =>
        _templates.TryGetValue(("OrderStatusChanged", status.ToString()), out var template)
            ? string.Format(template, orderNumber)
            : $"تم تحديث حالة طلبك #{orderNumber} في Dr. Mirror إلى {status}.";

    public static string ReturnCreated(string returnRef) =>
        _templates.TryGetValue(("ReturnCreated", ""), out var t)
            ? string.Format(t, returnRef)
            : $"تم استلام طلب الإرجاع رقم #{returnRef} في Dr. Mirror.";

    public static string ReturnStatusChanged(string returnRef, ReturnStatus status) =>
        _templates.TryGetValue(("ReturnStatusChanged", status.ToString()), out var template)
            ? string.Format(template, returnRef)
            : $"تم تحديث طلب الإرجاع #{returnRef} في Dr. Mirror إلى {status}.";
}
