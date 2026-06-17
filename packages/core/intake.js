"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.lookupProductBySku = lookupProductBySku;
exports.createGRN = createGRN;
exports.addSerialToStock = addSerialToStock;
exports.addLooseStock = addLooseStock;
function lookupProductBySku(skuCode, db) {
    var product = db.prepare('SELECT * FROM products WHERE sku_code = ?').get(skuCode);
    if (!product)
        return null;
    var tags = db.prepare('SELECT vehicle_tag FROM product_fitment WHERE product_id = ?')
        .all(product.product_id)
        .map(function (row) { return row.vehicle_tag; });
    return __assign(__assign({}, product), { fitment_tags: tags });
}
function createGRN(supplierId, invoiceRef, totalCost, // paise
receivedBy, db) {
    var stmt = db.prepare("\n    INSERT INTO grn (supplier_id, invoice_ref, total_cost, received_by)\n    VALUES (?, ?, ?, ?)\n  ");
    var result = stmt.run(supplierId, invoiceRef, totalCost, receivedBy);
    return result.lastInsertRowid;
}
function addSerialToStock(productId, serialNumber, batchNumber, purchaseCost, // paise
grnId, db) {
    // Check if serial already exists
    var existing = db.prepare('SELECT * FROM product_instances WHERE serial_number = ?').get(serialNumber);
    if (existing) {
        throw new Error("Serial number '".concat(serialNumber, "' already exists in the system."));
    }
    var stmt = db.prepare("\n    INSERT INTO product_instances (product_id, serial_number, status, batch_number, purchase_cost, grn_id)\n    VALUES (?, ?, 'IN_STOCK', ?, ?, ?)\n  ");
    var result = stmt.run(productId, serialNumber, batchNumber, purchaseCost, grnId);
    var instanceId = result.lastInsertRowid;
    return {
        instance_id: instanceId,
        product_id: productId,
        serial_number: serialNumber,
        status: 'IN_STOCK',
        batch_number: batchNumber,
        purchase_cost: purchaseCost,
        grn_id: grnId,
    };
}
function addLooseStock(productId, qty, db) {
    if (qty <= 0)
        throw new Error('Quantity must be greater than zero');
    var stmt = db.prepare("\n    UPDATE products \n    SET loose_qty = loose_qty + ?\n    WHERE product_id = ?\n  ");
    stmt.run(qty, productId);
}
