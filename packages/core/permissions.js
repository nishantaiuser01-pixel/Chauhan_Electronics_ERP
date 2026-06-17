"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACTIONS = exports.ROLES = void 0;
exports.authorize = authorize;
exports.assertCan = assertCan;
exports.ROLES = ['OWNER', 'CASHIER', 'STOCK', 'TECHNICIAN'];
exports.ACTIONS = [
    // Reads
    'READ_DASHBOARD', 'READ_CATALOGUE', 'READ_STOCK', 'READ_CUSTOMERS', 'READ_SUPPLIERS', 'READ_REPAIRS', 'READ_ACCOUNTING',
    // High sensitivity
    'EDIT_PRICE', 'OVERRIDE_CREDIT', 'VOID_SALE', 'REFUND_EDIT', 'BACKUP_RESTORE', 'USER_MGMT', 'EDIT_CATALOGUE', 'CREATE_SUPPLIER', 'RECORD_EXPENSE', 'VIEW_REPORTS',
    // Routine
    'CHECKOUT', 'RECEIVE_GRN', 'MANAGE_REPAIRS', 'RECORD_PAYMENT', 'ISSUE_CN'
];
function authorize(role, action) {
    if (!role)
        return false;
    // OWNER can do everything
    if (role === 'OWNER')
        return true;
    switch (action) {
        case 'EDIT_PRICE':
        case 'OVERRIDE_CREDIT':
        case 'VOID_SALE':
        case 'REFUND_EDIT':
        case 'BACKUP_RESTORE':
        case 'USER_MGMT':
        case 'VIEW_REPORTS':
            return false; // Only OWNER
        case 'EDIT_CATALOGUE':
            return role === 'STOCK';
        case 'CREATE_SUPPLIER':
            return role === 'CASHIER' || role === 'STOCK';
        case 'RECORD_EXPENSE':
        case 'RECORD_PAYMENT':
        case 'CHECKOUT':
        case 'ISSUE_CN':
            return role === 'CASHIER';
        case 'RECEIVE_GRN':
            return role === 'STOCK';
        case 'MANAGE_REPAIRS':
            return role === 'TECHNICIAN' || role === 'CASHIER';
        // READ permissions
        case 'READ_DASHBOARD': return true;
        case 'READ_CATALOGUE': return true;
        case 'READ_STOCK': return true;
        case 'READ_CUSTOMERS': return role === 'CASHIER';
        case 'READ_SUPPLIERS': return role === 'CASHIER' || role === 'STOCK';
        case 'READ_REPAIRS': return true;
        case 'READ_ACCOUNTING': return role === 'CASHIER';
        default:
            return false; // default deny
    }
}
function assertCan(role, action) {
    if (!authorize(role, action)) {
        throw new Error("Forbidden: Role ".concat(role || 'UNAUTHENTICATED', " is not allowed to perform ").concat(action));
    }
}
