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
Object.defineProperty(exports, "__esModule", { value: true });
var gst_1 = require("./packages/core/gst");
var pricing_1 = require("./packages/core/pricing");
var ledger_1 = require("./packages/core/ledger");
var warranty_1 = require("./packages/core/warranty");
var sms_1 = require("./packages/core/sms");
var intake_1 = require("./packages/core/intake");
var assert = __importStar(require("assert"));
var GREEN = '\x1b[32m';
var RED = '\x1b[31m';
var RESET = '\x1b[0m';
var BLUE = '\x1b[34m';
console.log("".concat(BLUE, "--- Chauhan Electronics ERP Business Logic Test Suite ---").concat(RESET, "\n"));
var results = [];
function test(name, fn) {
    try {
        fn();
        results.push({ name: name, status: 'PASSED' });
        console.log("".concat(GREEN, "PASS:").concat(RESET, " ").concat(name));
    }
    catch (err) {
        results.push({ name: name, status: 'FAILED', error: err.message });
        console.log("".concat(RED, "FAIL:").concat(RESET, " ").concat(name, "\n     -> ").concat(err.stack));
    }
}
// ------------------ TEST 1: GST CALCULATIONS ------------------
test('GST: calculateGSTSplit for intra-state (Karnataka to Karnataka)', function () {
    // Shop is 29, customer is 29
    var split = (0, gst_1.calculateGSTSplit)(100000, 18, '29', '29ABCDE1234F1Z5');
    assert.strictEqual(split.cgst, 9000); // 9% of 100,000 paise = 9000 paise
    assert.strictEqual(split.sgst, 9000);
    assert.strictEqual(split.igst, 0);
});
test('GST: calculateGSTSplit for inter-state (Karnataka to Maharashtra)', function () {
    // Shop is 29, customer GSTIN starts with 27
    var split = (0, gst_1.calculateGSTSplit)(100000, 18, '29', '27ABCDE1234F1Z5');
    assert.strictEqual(split.cgst, 0);
    assert.strictEqual(split.sgst, 0);
    assert.strictEqual(split.igst, 18000); // 18% of 100,000 paise = 18000 paise
});
test('GST: getTaxableValue reverse calculation', function () {
    var taxable = (0, gst_1.getTaxableValue)(11800, 18); // 118 Rs total at 18% GST -> 100 Rs taxable
    assert.strictEqual(taxable, 10000);
});
// ------------------ TEST 2: PRICING RESOLUTION ------------------
test('Pricing: resolvePrice tier pricing', function () {
    var mockProduct = {
        product_id: 1,
        sku_code: '123456',
        brand_name: 'Pioneer',
        model_name: 'DMH',
        category: 'Audio',
        hsn_code: '8527',
        gst_rate: 18,
        requires_serial: 1,
        warranty_months: 12,
        min_restock_level: 5,
        counter_price: 150000,
        dealer_price: 120000,
        distributor_price: 100000,
        loose_qty: 0,
        created_at: '',
    };
    assert.strictEqual((0, pricing_1.resolvePrice)(mockProduct, 'COUNTER'), 150000);
    assert.strictEqual((0, pricing_1.resolvePrice)(mockProduct, 'DEALER'), 120000);
    assert.strictEqual((0, pricing_1.resolvePrice)(mockProduct, 'DISTRIBUTOR'), 100000);
});
// ------------------ TEST 3: UDHAAR AGING & LEDGER ------------------
test('Ledger: calculateAging aging bucket 0-30 days overdue', function () {
    var mockCustomer = {
        customer_id: 1,
        name: 'Dealer One',
        phone: '9876543210',
        tier: 'DEALER',
        current_balance: 500000, // 5000 Rs
        credit_limit: 1000000,
        credit_due_date: '2026-06-01',
        created_at: '',
    };
    var currentDate = new Date('2026-06-15'); // 14 days overdue
    var buckets = (0, ledger_1.calculateAging)(mockCustomer, currentDate);
    assert.strictEqual(buckets.total_overdue, 500000);
    assert.strictEqual(buckets['0-30'], 500000);
    assert.strictEqual(buckets['31-60'], 0);
    assert.strictEqual(buckets['61-90'], 0);
    assert.strictEqual(buckets['90+'], 0);
});
test('Ledger: calculateAging aging bucket 90+ days overdue', function () {
    var mockCustomer = {
        customer_id: 1,
        name: 'Dealer One',
        phone: '9876543210',
        tier: 'DEALER',
        current_balance: 750000, // 7500 Rs
        credit_limit: 1000000,
        credit_due_date: '2026-02-01',
        created_at: '',
    };
    var currentDate = new Date('2026-06-15'); // 134 days overdue
    var buckets = (0, ledger_1.calculateAging)(mockCustomer, currentDate);
    assert.strictEqual(buckets.total_overdue, 750000);
    assert.strictEqual(buckets['0-30'], 0);
    assert.strictEqual(buckets['90+'], 750000);
});
test('Ledger: isCustomerOverdue status verification', function () {
    var mockCustomer = {
        customer_id: 1,
        name: 'Dealer One',
        phone: '9876543210',
        tier: 'DEALER',
        current_balance: 500000,
        credit_limit: 1000000,
        credit_due_date: '2026-06-10',
        created_at: '',
    };
    assert.strictEqual((0, ledger_1.isCustomerOverdue)(mockCustomer, new Date('2026-06-05')), false);
    assert.strictEqual((0, ledger_1.isCustomerOverdue)(mockCustomer, new Date('2026-06-15')), true);
});
// ------------------ TEST 4: WARRANTY CALCULATIONS ------------------
test('Warranty: calculateWarrantyExpiry date math', function () {
    var soldAt = '2026-01-01 12:00:00';
    var expires = (0, warranty_1.calculateWarrantyExpiry)(soldAt, 12);
    assert.strictEqual(expires.substring(0, 10), '2027-01-01');
});
// ------------------ TEST 5: SMS TEMPLATES FORMATTING ------------------
test('SMS: formatPaymentReminder templates', function () {
    var mockCustomer = {
        customer_id: 1,
        name: 'Ravi',
        phone: '9876543210',
        tier: 'DEALER',
        current_balance: 250000, // 2,500.00 Rs
        credit_limit: 1000000,
        credit_due_date: '2026-06-01',
        created_at: '',
    };
    var reminderMsg = (0, sms_1.formatPaymentReminder)(mockCustomer, 'Chauhan Electronics');
    assert.strictEqual(reminderMsg, 'Dear Ravi, your Udhaar balance of Rs.2500.00 at Chauhan Electronics is overdue. Please settle it at the earliest.');
});
// ------------------ TEST 6: MOCK DATABASE INTEGRATION TESTS ------------------
var MockDB = /** @class */ (function () {
    function MockDB() {
        this.queries = [];
    }
    MockDB.prototype.prepare = function (sql) {
        var _this = this;
        return {
            get: function () {
                var params = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    params[_i] = arguments[_i];
                }
                _this.queries.push({ sql: sql, params: params });
                if (sql.includes('FROM products WHERE sku_code')) {
                    if (params[0] === '123456') {
                        return { product_id: 42, sku_code: '123456', brand_name: 'Sony' };
                    }
                    return null;
                }
                if (sql.includes('SELECT * FROM product_instances WHERE serial_number')) {
                    if (params[0] === 'DUP-SERIAL') {
                        return { instance_id: 99 };
                    }
                    return null;
                }
                return null;
            },
            all: function () {
                var params = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    params[_i] = arguments[_i];
                }
                _this.queries.push({ sql: sql, params: params });
                if (sql.includes('SELECT vehicle_tag FROM product_fitment')) {
                    return [{ vehicle_tag: 'Creta' }, { vehicle_tag: 'Universal' }];
                }
                return [];
            },
            run: function () {
                var params = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    params[_i] = arguments[_i];
                }
                _this.queries.push({ sql: sql, params: params });
                return { lastInsertRowid: 101, changes: 1 };
            }
        };
    };
    return MockDB;
}());
test('MockDB: lookupProductBySku fetches tags', function () {
    var db = new MockDB();
    var result = (0, intake_1.lookupProductBySku)('123456', db);
    assert.ok(result);
    assert.strictEqual(result.product_id, 42);
    assert.deepStrictEqual(result.fitment_tags, ['Creta', 'Universal']);
    // Verify correct SQL prepared statements were called
    assert.ok(db.queries[0].sql.includes('FROM products WHERE sku_code'));
    assert.ok(db.queries[1].sql.includes('SELECT vehicle_tag FROM product_fitment'));
});
test('MockDB: addSerialToStock creates unit entry', function () {
    var db = new MockDB();
    var instance = (0, intake_1.addSerialToStock)(10, 'SN-XYZ-99', 'B1', 1500000, 5, db);
    assert.strictEqual(instance.instance_id, 101);
    assert.strictEqual(instance.serial_number, 'SN-XYZ-99');
    assert.strictEqual(instance.status, 'IN_STOCK');
    // Verify correct insert query was executed
    var insertQuery = db.queries.find(function (q) { return q.sql.includes('INSERT INTO product_instances'); });
    assert.ok(insertQuery);
    assert.deepStrictEqual(insertQuery.params, [10, 'SN-XYZ-99', 'B1', 1500000, 5]);
});
test('MockDB: addSerialToStock throws on duplicate serial number', function () {
    var db = new MockDB();
    assert.throws(function () {
        (0, intake_1.addSerialToStock)(10, 'DUP-SERIAL', 'B1', 1500000, 5, db);
    }, /already exists/);
});
test('MockDB: addLooseStock increments products loose_qty', function () {
    var db = new MockDB();
    (0, intake_1.addLooseStock)(15, 50, db);
    var updateQuery = db.queries.find(function (q) { return q.sql.includes('UPDATE products'); });
    assert.ok(updateQuery);
    assert.deepStrictEqual(updateQuery.params, [50, 15]);
});
console.log('\n--- TESTING SUMMARY ---');
console.table(results.map(function (r) { return ({ Test: r.name, Status: r.status }); }));
var failed = results.filter(function (r) { return r.status === 'FAILED'; });
if (failed.length > 0) {
    console.log("\n".concat(RED, "\u2718 Testing completed with ").concat(failed.length, " failures.").concat(RESET));
    process.exit(1);
}
else {
    console.log("\n".concat(GREEN, "\u2714 All business logic and mock DB integration tests passed successfully!").concat(RESET));
    process.exit(0);
}
