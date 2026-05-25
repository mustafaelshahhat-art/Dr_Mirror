export function renderTemplate(template, data = {}) {
  switch (template) {
    case 'orderConfirmation':
      return `مرحباً! تم استلام طلبك #${data.orderNumber} بنجاح في Dr. Mirror. سنبدأ بمعالجته قريباً.`;
    case 'orderStatusChanged':
      return orderStatusChanged(data.orderNumber, data.status);
    case 'returnCreated':
      return `تم استلام طلب الإرجاع الخاص بك رقم #${data.returnRef} في Dr. Mirror. سنراجعه قريباً.`;
    case 'returnStatusChanged':
      return returnStatusChanged(data.returnRef, data.status);
    default: {
      const err = new Error('unknown_template');
      err.statusCode = 400;
      throw err;
    }
  }
}

function orderStatusChanged(orderNumber, status) {
  switch (status) {
    case 'Confirmed': return `تم تأكيد طلبك #${orderNumber} في Dr. Mirror وهو الآن قيد المعالجة.`;
    case 'Preparing': return `طلبك #${orderNumber} في Dr. Mirror قيد التجهيز الآن.`;
    case 'Shipped': return `تم شحن طلبك #${orderNumber} من Dr. Mirror. سيصلك قريباً!`;
    case 'Delivered': return `تم تسليم طلبك #${orderNumber} من Dr. Mirror. نتمنى أن ينال إعجابك!`;
    case 'Cancelled': return `تم إلغاء طلبك #${orderNumber} في Dr. Mirror. للاستفسار تواصل معنا.`;
    default: return `تم تحديث حالة طلبك #${orderNumber} في Dr. Mirror.`;
  }
}

function returnStatusChanged(returnRef, status) {
  switch (status) {
    case 'Approved': return `تمت الموافقة على طلب الإرجاع #${returnRef} في Dr. Mirror.`;
    case 'Rejected': return `نأسف، تم رفض طلب الإرجاع #${returnRef} في Dr. Mirror.`;
    case 'Received': return `تم استلام المنتج المُعاد في Dr. Mirror بنجاح — الرقم #${returnRef}.`;
    case 'Completed': return `تم إتمام طلب الإرجاع #${returnRef} في Dr. Mirror بالكامل.`;
    default: return `تم تحديث طلب الإرجاع #${returnRef} في Dr. Mirror.`;
  }
}
