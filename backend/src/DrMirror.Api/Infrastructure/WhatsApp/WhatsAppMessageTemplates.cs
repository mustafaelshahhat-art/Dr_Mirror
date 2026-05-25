using DrMirror.Api.Domain.Orders;

namespace DrMirror.Api.Infrastructure.WhatsApp;

public static class WhatsAppMessageTemplates
{
    public static string OrderConfirmation(string orderNumber) =>
        $"مرحباً! تم استلام طلبك #{orderNumber} بنجاح في Dr. Mirror. سنبدأ بمعالجته قريباً.";

    public static string OrderStatusChanged(string orderNumber, OrderStatus status) => status switch
    {
        OrderStatus.Confirmed => $"تم تأكيد طلبك #{orderNumber} في Dr. Mirror وهو الآن قيد المعالجة.",
        OrderStatus.Preparing => $"طلبك #{orderNumber} في Dr. Mirror قيد التجهيز الآن.",
        OrderStatus.Shipped => $"تم شحن طلبك #{orderNumber} من Dr. Mirror. سيصلك قريباً!",
        OrderStatus.Delivered => $"تم تسليم طلبك #{orderNumber} من Dr. Mirror. نتمنى أن ينال إعجابك!",
        OrderStatus.Cancelled => $"تم إلغاء طلبك #{orderNumber} في Dr. Mirror. للاستفسار تواصل معنا.",
        _ => $"تم تحديث حالة طلبك #{orderNumber} في Dr. Mirror إلى {status}.",
    };

    public static string ReturnCreated(string returnRef) =>
        $"تم استلام طلب الإرجاع الخاص بك رقم #{returnRef} في Dr. Mirror. سنراجعه قريباً.";

    public static string ReturnStatusChanged(string returnRef, ReturnStatus status) => status switch
    {
        ReturnStatus.Approved => $"تمت الموافقة على طلب الإرجاع #{returnRef} في Dr. Mirror.",
        ReturnStatus.Rejected => $"نأسف، تم رفض طلب الإرجاع #{returnRef} في Dr. Mirror.",
        ReturnStatus.Received => $"تم استلام المنتج المُعاد في Dr. Mirror بنجاح — الرقم #{returnRef}.",
        ReturnStatus.Completed => $"تم إتمام طلب الإرجاع #{returnRef} في Dr. Mirror بالكامل.",
        ReturnStatus.Requested => $"تم استلام طلب الإرجاع الخاص بك رقم #{returnRef} في Dr. Mirror. سنراجعه قريباً.",
        _ => $"تم تحديث طلب الإرجاع #{returnRef} في Dr. Mirror إلى {status}.",
    };
}
