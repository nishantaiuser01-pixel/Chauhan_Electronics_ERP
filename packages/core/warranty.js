"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateWarrantyExpiry = calculateWarrantyExpiry;
exports.checkWarranty = checkWarranty;
function calculateWarrantyExpiry(soldAtStr, warrantyMonths) {
    if (warrantyMonths <= 0)
        return soldAtStr;
    var date = new Date(soldAtStr);
    date.setMonth(date.getMonth() + warrantyMonths);
    return date.toISOString().slice(0, 19).replace('T', ' ');
}
function checkWarranty(serialNumber, db) {
    var _a, _b;
    // 1. Query the product instance
    var instance = db.prepare("\n    SELECT pi.*, p.brand_name, p.model_name\n    FROM product_instances pi\n    JOIN products p ON pi.product_id = p.product_id\n    WHERE pi.serial_number = ?\n  ").get(serialNumber);
    if (!instance) {
        return { found: false, sold_by_us: false, serial_number: serialNumber };
    }
    if (instance.status !== 'SOLD' || !instance.sold_at) {
        return {
            found: true,
            sold_by_us: true,
            serial_number: serialNumber,
            brand_name: instance.brand_name,
            model_name: instance.model_name,
            status: instance.status,
            warranty_valid: false,
        };
    }
    // 2. Find the associated sale and customer details
    var saleItem = db.prepare("\n    SELECT si.*, s.invoice_no, s.created_at as sale_date, c.name as customer_name\n    FROM sale_items si\n    JOIN sales s ON si.sale_id = s.sale_id\n    LEFT JOIN customers c ON s.customer_id = c.customer_id\n    WHERE si.instance_id = ?\n  ").get(instance.instance_id);
    var soldOn = instance.sold_at;
    var warrantyUntil = instance.warranty_expires_at;
    var now = new Date();
    var expiryDate = new Date(warrantyUntil);
    var warrantyValid = now <= expiryDate;
    return {
        found: true,
        sold_by_us: true,
        serial_number: serialNumber,
        brand_name: instance.brand_name,
        model_name: instance.model_name,
        sold_on: soldOn,
        warranty_until: warrantyUntil,
        warranty_valid: warrantyValid,
        invoice_no: (_a = saleItem === null || saleItem === void 0 ? void 0 : saleItem.invoice_no) !== null && _a !== void 0 ? _a : 'N/A',
        sold_to: (_b = saleItem === null || saleItem === void 0 ? void 0 : saleItem.customer_name) !== null && _b !== void 0 ? _b : 'Counter Customer',
        status: instance.status,
    };
}
