"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateAging = calculateAging;
exports.isCustomerOverdue = isCustomerOverdue;
function calculateAging(customer, currentDate) {
    if (currentDate === void 0) { currentDate = new Date(); }
    var buckets = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0, total_overdue: 0 };
    if (customer.current_balance <= 0 || !customer.credit_due_date) {
        return buckets;
    }
    var dueDate = new Date(customer.credit_due_date);
    var diffTime = currentDate.getTime() - dueDate.getTime();
    var diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) {
        return buckets; // Not overdue yet
    }
    buckets.total_overdue = customer.current_balance;
    if (diffDays <= 30) {
        buckets['0-30'] = customer.current_balance;
    }
    else if (diffDays <= 60) {
        buckets['31-60'] = customer.current_balance;
    }
    else if (diffDays <= 90) {
        buckets['61-90'] = customer.current_balance;
    }
    else {
        buckets['90+'] = customer.current_balance;
    }
    return buckets;
}
function isCustomerOverdue(customer, currentDate) {
    if (currentDate === void 0) { currentDate = new Date(); }
    if (customer.current_balance <= 0 || !customer.credit_due_date)
        return false;
    var dueDate = new Date(customer.credit_due_date);
    return currentDate.getTime() > dueDate.getTime();
}
