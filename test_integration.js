"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var better_sqlite3_1 = __importDefault(require("better-sqlite3"));
var fs = __importStar(require("fs"));
var path = __importStar(require("path"));
var GREEN = '\x1b[32m';
var RED = '\x1b[31m';
var RESET = '\x1b[0m';
var BLUE = '\x1b[34m';
console.log("".concat(BLUE, "--- Chauhan Electronics ERP Integration Suite ---").concat(RESET, "\n"));
var DB_PATH = path.join(__dirname, 'test_integration.db');
var SCHEMA_PATH = path.join(__dirname, 'packages/core/schema.sql');
if (fs.existsSync(DB_PATH))
    fs.unlinkSync(DB_PATH);
var db = new better_sqlite3_1.default(DB_PATH);
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');
// Load Schema
var schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf8');
db.exec(schemaSql);
// Seed Data
db.prepare("INSERT INTO settings (key, value) VALUES ('shop_name', 'Chauhan Electronics'), ('state_code', '29'), ('invoice_prefix', 'CE/26/'), ('next_invoice_no', '1001')").run();
db.prepare("INSERT INTO users (user_id, name, pin_hash, role) VALUES (1, 'Test User', 'hash', 'CASHIER')").run();
db.prepare("INSERT INTO customers (customer_id, name, phone, tier, gstin) VALUES (1, 'Intra State Cust', '9999999991', 'COUNTER', '29ABCDE1234F1Z5')").run();
db.prepare("INSERT INTO customers (customer_id, name, phone, tier, gstin) VALUES (2, 'Inter State Cust', '9999999992', 'COUNTER', '27ABCDE1234F1Z5')").run();
db.prepare("INSERT INTO customers (customer_id, name, phone, tier, credit_limit, current_balance) VALUES (3, 'Udhaar Cust', '9999999993', 'DEALER', 100000, 0)").run();
db.prepare("INSERT INTO products (product_id, sku_code, brand_name, model_name, gst_rate, warranty_months, requires_serial, min_restock_level, purchase_cost) VALUES (1, '123', 'Sony', 'Amp', 18, 12, 1, 5, 0)").run();
db.prepare("INSERT INTO products (product_id, sku_code, brand_name, model_name, gst_rate, loose_qty, requires_serial, purchase_cost) VALUES (2, '124', 'Wire', '10m', 18, 50, 0, 100)").run();
db.prepare("INSERT INTO product_instances (instance_id, product_id, serial_number, status, purchase_cost) VALUES (1, 1, 'SN-001', 'IN_STOCK', 8000)").run();
db.prepare("INSERT INTO product_instances (instance_id, product_id, serial_number, status, purchase_cost) VALUES (2, 1, 'SN-002', 'IN_STOCK', 8000)").run();
var passed = 0;
var failed = 0;
function runTest(name, fn) {
    try {
        fn();
        console.log("".concat(GREEN, "PASS:").concat(RESET, " ").concat(name));
        passed++;
    }
    catch (e) {
        console.log("".concat(RED, "FAIL:").concat(RESET, " ").concat(name, "\n   -> ").concat(e.message));
        failed++;
    }
}
// Reusable checkout logic (similar to main.ts) to test DB features
function doCheckout(customerId, cart, paymentMode, amountPaid) {
    var checkoutTx = db.transaction(function () {
        var customer = db.prepare('SELECT * FROM customers WHERE customer_id = ?').get(customerId);
        var subtotal = 0;
        cart.forEach(function (i) { return subtotal += i.price * i.qty; });
        var grandTotal = subtotal;
        // Tax Split
        var shopState = '29';
        var customerState = shopState;
        if (customer.gstin && customer.gstin.trim().length >= 2) {
            customerState = customer.gstin.substring(0, 2);
        }
        var isIntraState = customerState === shopState;
        var cgstTotal = 0, sgstTotal = 0, igstTotal = 0;
        cart.forEach(function (item) {
            var lineTotal = item.price * item.qty;
            var rate = 18;
            var taxableValue = Math.round(lineTotal / (1 + rate / 100));
            var taxAmount = lineTotal - taxableValue;
            if (isIntraState) {
                cgstTotal += Math.round(taxAmount / 2);
                sgstTotal += (taxAmount - Math.round(taxAmount / 2));
            }
            else {
                igstTotal += taxAmount;
            }
        });
        var sequenceRow = db.prepare("SELECT value FROM settings WHERE key = 'next_invoice_no'").get();
        var invoiceNo = "CE/26/".concat(sequenceRow.value);
        var saleRes = db.prepare("\n      INSERT INTO sales (invoice_no, customer_id, tier_applied, subtotal, cgst, sgst, igst, grand_total, amount_paid, payment_mode, sold_by)\n      VALUES (?, ?, 'COUNTER', ?, ?, ?, ?, ?, ?, ?, 1)\n    ").run(invoiceNo, customerId, subtotal, cgstTotal, sgstTotal, igstTotal, grandTotal, amountPaid, paymentMode);
        var saleId = saleRes.lastInsertRowid;
        cart.forEach(function (item) {
            if (item.instance_id) {
                var inst = db.prepare('SELECT purchase_cost FROM product_instances WHERE instance_id = ?').get(item.instance_id);
                db.prepare("INSERT INTO sale_items (sale_id, product_id, instance_id, quantity, unit_price, line_total, unit_cost) VALUES (?, ?, ?, 1, ?, ?, ?)").run(saleId, item.product_id, item.instance_id, item.price, item.price, (inst === null || inst === void 0 ? void 0 : inst.purchase_cost) || 0);
                db.prepare("UPDATE product_instances SET status = 'SOLD', warranty_expires_at = datetime('now', '+12 months') WHERE instance_id = ?").run(item.instance_id);
            }
            else {
                var prod = db.prepare('SELECT purchase_cost FROM products WHERE product_id = ?').get(item.product_id);
                db.prepare("INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, line_total, unit_cost) VALUES (?, ?, ?, ?, ?, ?)").run(saleId, item.product_id, item.qty, item.price, item.price * item.qty, (prod === null || prod === void 0 ? void 0 : prod.purchase_cost) || 0);
            }
        });
        if (paymentMode === 'UDHAAR') {
            var debt = grandTotal - amountPaid;
            db.prepare("UPDATE customers SET current_balance = current_balance + ? WHERE customer_id = ?").run(debt, customerId);
            db.prepare("INSERT INTO customer_ledger (customer_id, type, ref_id, amount, balance_after) VALUES (?, 'SALE', ?, ?, (SELECT current_balance FROM customers WHERE customer_id = ?))").run(customerId, saleId, debt, customerId);
        }
        db.prepare("UPDATE settings SET value = CAST((CAST(value AS INTEGER) + 1) AS TEXT) WHERE key = 'next_invoice_no'").run();
        return saleId;
    });
    return checkoutTx();
}
runTest('B1 - Checkout transaction commits', function () {
    var saleId = doCheckout(3, [{ product_id: 1, instance_id: 1, price: 11800, qty: 1 }], 'UDHAAR', 0);
    var inst = db.prepare("SELECT status, warranty_expires_at FROM product_instances WHERE instance_id = 1").get();
    if (inst.status !== 'SOLD' || !inst.warranty_expires_at)
        throw new Error("Serial not marked SOLD or warranty not set");
    var ledger = db.prepare("SELECT * FROM customer_ledger WHERE customer_id = 3 AND type = 'SALE'").get();
    if (!ledger || ledger.amount !== 11800)
        throw new Error("Customer ledger not written correctly");
    var seq = db.prepare("SELECT value FROM settings WHERE key = 'next_invoice_no'").get();
    if (seq.value !== '1002')
        throw new Error("Invoice sequence not incremented");
});
runTest('B2 - Checkout rolls back atomically', function () {
    var beforeSeq = db.prepare("SELECT value FROM settings WHERE key = 'next_invoice_no'").get().value;
    try {
        doCheckout(1, [
            { product_id: 1, instance_id: 2, price: 11800, qty: 1 },
            { product_id: 1, instance_id: 1, price: 11800, qty: 1 } // Instance 1 is already sold (UNIQUE constraint fails)
        ], 'CASH', 23600);
        throw new Error("Should have failed");
    }
    catch (e) {
        if (e.message === "Should have failed")
            throw e;
        // Assert rolled back
        var inst = db.prepare("SELECT status FROM product_instances WHERE instance_id = 2").get();
        if (inst.status !== 'IN_STOCK')
            throw new Error("Serial 2 was not rolled back to IN_STOCK");
        var afterSeq = db.prepare("SELECT value FROM settings WHERE key = 'next_invoice_no'").get().value;
        if (afterSeq !== beforeSeq)
            throw new Error("Invoice sequence incremented during failed transaction");
    }
});
runTest('B3 - Real UNIQUE constraint', function () {
    try {
        db.prepare("INSERT INTO product_instances (product_id, serial_number) VALUES (1, 'SN-002')").run();
        throw new Error("Should have failed");
    }
    catch (e) {
        if (e.message === "Should have failed")
            throw e;
        if (!e.message.includes('UNIQUE constraint failed'))
            throw new Error("Unexpected error: ".concat(e.message));
    }
});
runTest('B4 - Persisted GST split', function () {
    var saleIdIntra = doCheckout(1, [{ product_id: 2, price: 11800, qty: 1 }], 'CASH', 11800);
    var intra = db.prepare("SELECT cgst, sgst, igst FROM sales WHERE sale_id = ?").get(saleIdIntra);
    if (intra.igst !== 0 || intra.cgst === 0 || intra.sgst === 0)
        throw new Error("Intra-state split wrong");
    var saleIdInter = doCheckout(2, [{ product_id: 2, price: 11800, qty: 1 }], 'CASH', 11800);
    var inter = db.prepare("SELECT cgst, sgst, igst FROM sales WHERE sale_id = ?").get(saleIdInter);
    if (inter.igst === 0 || inter.cgst !== 0 || inter.sgst !== 0)
        throw new Error("Inter-state split wrong");
});
runTest('B5 - Print render data and numToWords verification', function () {
    var interSale = db.prepare("SELECT * FROM sales WHERE customer_id = 2").get();
    if (interSale.igst === 0)
        throw new Error("Inter-state sale IGST should be > 0");
    var intraSale = db.prepare("SELECT * FROM sales WHERE customer_id = 1").get();
    if (intraSale.cgst === 0)
        throw new Error("Intra-state sale CGST should be > 0");
    var items = db.prepare("\n    SELECT si.*, p.gst_rate FROM sale_items si JOIN products p ON si.product_id = p.product_id WHERE si.sale_id = ?\n  ").all(interSale.sale_id);
    if (items[0].gst_rate !== 18)
        throw new Error("Per-line gst_rate not fetched correctly");
    var numToWords = function (numInPaise) {
        var amount = numInPaise / 100;
        var rupees = Math.floor(amount);
        var paise = Math.round((amount - rupees) * 100);
        var a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
        var b = ['', '', 'Twenty ', 'Thirty ', 'Forty ', 'Fifty ', 'Sixty ', 'Seventy ', 'Eighty ', 'Ninety '];
        var inWords = function (n) {
            if (n === 0)
                return '';
            var s = ('000000000' + n).slice(-9);
            var match = s.match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
            if (!match)
                return '';
            var str = '';
            str += parseInt(match[1]) !== 0 ? (a[Number(match[1])] || b[match[1][0]] + a[match[1][1]]) + 'Crore ' : '';
            str += parseInt(match[2]) !== 0 ? (a[Number(match[2])] || b[match[2][0]] + a[match[2][1]]) + 'Lakh ' : '';
            str += parseInt(match[3]) !== 0 ? (a[Number(match[3])] || b[match[3][0]] + a[match[3][1]]) + 'Thousand ' : '';
            str += parseInt(match[4]) !== 0 ? (a[Number(match[4])] || b[match[4][0]] + a[match[4][1]]) + 'Hundred ' : '';
            str += parseInt(match[5]) !== 0 ? (a[Number(match[5])] || b[match[5][0]] + a[match[5][1]]) : '';
            return str.trim();
        };
        var result = '';
        if (rupees > 0)
            result += inWords(rupees) + ' Rupees';
        if (paise > 0) {
            if (rupees > 0)
                result += ' and ';
            result += inWords(paise) + ' Paise';
        }
        if (result === '')
            return 'Zero Rupees Only';
        return result + ' Only';
    };
    if (numToWords(500000) !== 'Five Thousand Rupees Only')
        throw new Error("numToWords 500000: ".concat(numToWords(500000)));
    if (numToWords(11850) !== 'One Hundred Eighteen Rupees and Fifty Paise Only')
        throw new Error("numToWords 11850: ".concat(numToWords(11850)));
    if (numToWords(0) !== 'Zero Rupees Only')
        throw new Error("numToWords 0: ".concat(numToWords(0)));
});
// --- REPORTS R1-R5 TESTS ---
runTest('R1 - GST reconciliation', function () {
    var invoices = db.prepare("SELECT * FROM sales WHERE status != 'CANCELLED'").all();
    var totalCgst = 0, totalSgst = 0, totalIgst = 0;
    invoices.forEach(function (i) { totalCgst += i.cgst; totalSgst += i.sgst; totalIgst += i.igst; });
    var rawSum = db.prepare("SELECT SUM(cgst) as c, SUM(sgst) as s, SUM(igst) as i FROM sales WHERE status != 'CANCELLED'").get();
    if (totalCgst !== (rawSum.c || 0))
        throw new Error("CGST mismatch");
    if (totalSgst !== (rawSum.s || 0))
        throw new Error("SGST mismatch");
    if (totalIgst !== (rawSum.i || 0))
        throw new Error("IGST mismatch");
});
runTest('R2 - Margin math', function () {
    var marginData = db.prepare("\n    SELECT SUM(si.line_total) as revenue,\n           SUM(si.unit_cost * si.quantity) as cogs,\n           SUM(si.line_total - (si.unit_cost * si.quantity)) as profit\n    FROM sale_items si JOIN sales s ON si.sale_id = s.sale_id WHERE s.status != 'CANCELLED'\n  ").get();
    var testItem = db.prepare("SELECT unit_cost FROM sale_items LIMIT 1").get();
    if (testItem.unit_cost === 0 && marginData.revenue > 0)
        throw new Error("unit_cost was not captured");
    if (marginData.revenue - marginData.cogs !== marginData.profit)
        throw new Error("Margin math failed");
});
runTest('R3 - Low-stock', function () {
    var lowStock = db.prepare("\n    SELECT p.product_id, ((SELECT COUNT(*) FROM product_instances pi WHERE pi.product_id = p.product_id AND pi.status = 'IN_STOCK') + p.loose_qty) as in_stock_qty\n    FROM products p\n    WHERE ((SELECT COUNT(*) FROM product_instances pi WHERE pi.product_id = p.product_id AND pi.status = 'IN_STOCK') + p.loose_qty) <= p.min_restock_level\n  ").all();
    var prod1 = lowStock.find(function (p) { return p.product_id === 1; });
    if (!prod1 || prod1.in_stock_qty !== 1)
        throw new Error("Product 1 should be low stock with qty 1");
    var prod2 = lowStock.find(function (p) { return p.product_id === 2; });
    if (prod2)
        throw new Error("Product 2 should NOT be low stock");
});
runTest('R4 - Stock valuation', function () {
    var valuation = db.prepare("\n    SELECT \n      (SELECT SUM(purchase_cost) FROM product_instances WHERE status = 'IN_STOCK') as serialized_value,\n      (SELECT SUM(loose_qty * purchase_cost) FROM products) as loose_value\n  ").get();
    if (valuation.serialized_value !== 8000)
        throw new Error("Serialized value expected 8000, got ".concat(valuation.serialized_value));
    if (valuation.loose_value !== 5000)
        throw new Error("Loose value expected 5000, got ".concat(valuation.loose_value));
});
runTest('R5 - Date filter', function () {
    db.prepare("INSERT INTO sales (invoice_no, customer_id, tier_applied, subtotal, grand_total, created_at) VALUES ('OLD-1', 1, 'COUNTER', 100, 100, '2020-01-01 10:00:00')").run();
    var startDate = '2021-01-01 00:00:00';
    var endDate = '2029-12-31 23:59:59';
    var salesInRange = db.prepare("SELECT COUNT(*) as c FROM sales WHERE created_at >= ? AND created_at <= ?").get(startDate, endDate);
    var allSales = db.prepare("SELECT COUNT(*) as c FROM sales").get();
    if (salesInRange.c === allSales.c)
        throw new Error("Date filter did not exclude the old sale");
});
// Cleanup
db.close();
if (fs.existsSync(DB_PATH))
    fs.unlinkSync(DB_PATH);
console.log("\n".concat(passed === 10 ? GREEN : RED, "Result: ").concat(passed, "/10 passed.").concat(RESET));
process.exit(failed > 0 ? 1 : 0);
