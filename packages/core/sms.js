"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatPaymentReminder = formatPaymentReminder;
function formatPaymentReminder(customer, shopName) {
    var amountRs = (customer.current_balance / 100).toFixed(2);
    return "Dear ".concat(customer.name, ", your Udhaar balance of Rs.").concat(amountRs, " at ").concat(shopName, " is overdue. Please settle it at the earliest.");
}
