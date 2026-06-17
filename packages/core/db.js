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
exports.getDB = getDB;
exports.initDB = initDB;
var better_sqlite3_1 = __importDefault(require("better-sqlite3"));
var bcrypt = __importStar(require("bcryptjs"));
var dbInstance = null;
function getDB() {
    if (!dbInstance) {
        throw new Error('Database not initialized. Call initDB(dbPath, schemaSql) first.');
    }
    return dbInstance;
}
function initDB(dbPath, schemaSql) {
    if (dbInstance) {
        return dbInstance;
    }
    dbInstance = new better_sqlite3_1.default(dbPath);
    dbInstance.pragma('foreign_keys = ON');
    dbInstance.pragma('journal_mode = WAL');
    // Check if the settings table exists
    var tableCheck = dbInstance.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='settings'").get();
    if (!tableCheck) {
        dbInstance.exec(schemaSql);
        seedDB(dbInstance);
    }
    return dbInstance;
}
function seedDB(db) {
    var insertSetting = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
    // Seed settings
    insertSetting.run('first_run', '0'); // Wizard completed
    insertSetting.run('shop_name', 'Chauhan Electronics');
    insertSetting.run('address', '12, SP Road, Bengaluru, Karnataka - 560002');
    insertSetting.run('gstin', '29ABCDE1234F1Z5');
    insertSetting.run('state_code', '29'); // Karnataka
    insertSetting.run('invoice_prefix', 'CE/26/');
    insertSetting.run('next_invoice_no', '1001');
    insertSetting.run('job_prefix', 'JOB/26/');
    insertSetting.run('next_job_no', '2001');
    insertSetting.run('default_gst_rate', '18');
    insertSetting.run('currency', 'INR');
    insertSetting.run('sms_enabled', '0');
    insertSetting.run('online_lookup', '0');
    // Seed Users
    var insertUser = db.prepare('INSERT INTO users (name, pin_hash, role, active) VALUES (?, ?, ?, 1)');
    var ownerPinHash = bcrypt.hashSync('1234', 10);
    var cashierPinHash = bcrypt.hashSync('5678', 10);
    var techPinHash = bcrypt.hashSync('9012', 10);
    insertUser.run('Nishant Chauhan', ownerPinHash, 'OWNER');
    insertUser.run('SP Road Cashier', cashierPinHash, 'CASHIER');
    insertUser.run('Repair Tech', techPinHash, 'TECHNICIAN');
    // Seed Customers
    var insertCustomer = db.prepare("\n    INSERT INTO customers (name, phone, shop_name, tier, gstin, credit_limit, current_balance, credit_due_date)\n    VALUES (?, ?, ?, ?, ?, ?, ?, ?)\n  ");
    insertCustomer.run('Counter Customer', '0000000000', null, 'COUNTER', null, 0, 0, null);
    insertCustomer.run('Abhishek Audio', '9876543210', 'Abhishek Electronics', 'DEALER', '29AAAPA1234B1Z0', 10000000, 4500000, '2026-07-16'); // owes us 45,000 paise (450 Rs? Wait, 45,000 paise is 450 Rs, wait - 4500000 paise is 45,000 Rs. Let's make it 4500000 paise = 45,000 Rs).
    insertCustomer.run('Pooja Car Accessories', '9123456789', 'Pooja Accessories', 'DEALER', null, 5000000, 0, null);
    insertCustomer.run('Sardar Distributors', '9988776655', 'Sardar Audio Ltd', 'DISTRIBUTOR', '29BBBBB5678C1Z1', 50000000, 0, null);
    // Seed Customer Ledger for Abhishek Audio (customer_id = 2)
    var insertLedger = db.prepare("\n    INSERT INTO customer_ledger (customer_id, type, ref_id, amount, balance_after, note)\n    VALUES (?, ?, ?, ?, ?, ?)\n  ");
    insertLedger.run(2, 'SALE', 0, 4500000, 4500000, 'Opening Balance');
    // Seed Products
    var insertProduct = db.prepare("\n    INSERT INTO products (sku_code, brand_name, model_name, category, hsn_code, gst_rate, requires_serial, warranty_months, min_restock_level, counter_price, dealer_price, distributor_price, loose_qty)\n    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\n  ");
    insertProduct.run('8809123456789', 'Pioneer', 'DMH-Z5290BT', 'Car Audio', '8527', 18, 1, 12, 3, 2850000, 2500000, 2300000, 0); // product_id = 1
    insertProduct.run('8809123456000', 'Blaupunkt', 'Key Largo 980', 'Car Audio', '8527', 18, 1, 24, 2, 1800000, 1600000, 1450000, 0); // product_id = 2
    insertProduct.run('4001234567890', 'Dixon', '8-Gauge Power Cable', 'Accessories', '8544', 18, 0, 0, 20, 15000, 12000, 10000, 150); // product_id = 3
    insertProduct.run('7890123456789', 'Sony', 'XM-N1004', 'Car Audio', '8518', 18, 1, 12, 2, 950000, 850000, 800000, 0); // product_id = 4
    // Seed Product Fitment Tags
    var insertFitment = db.prepare('INSERT INTO product_fitment (product_id, vehicle_tag) VALUES (?, ?)');
    insertFitment.run(1, 'Universal Double Din');
    insertFitment.run(1, 'Creta 2024');
    insertFitment.run(1, 'Swift 2023');
    insertFitment.run(2, '9 Inch Android');
    insertFitment.run(2, 'Universal Fitment');
    insertFitment.run(4, '4 Channel Amplifier');
    // Seed Product Instances
    var insertInstance = db.prepare("\n    INSERT INTO product_instances (product_id, serial_number, status, batch_number, purchase_cost, grn_id, sold_at, warranty_expires_at)\n    VALUES (?, ?, ?, ?, ?, ?, ?, ?)\n  ");
    insertInstance.run(1, 'PIO-DMH-1001', 'IN_STOCK', 'B1', 1900000, 1, null, null);
    insertInstance.run(1, 'PIO-DMH-1002', 'IN_STOCK', 'B1', 1900000, 1, null, null);
    insertInstance.run(1, 'PIO-DMH-1003', 'IN_STOCK', 'B1', 1900000, 1, null, null);
    insertInstance.run(2, 'BP-KL-9801', 'IN_STOCK', 'B2', 1200000, 1, null, null);
    insertInstance.run(2, 'BP-KL-9802', 'IN_STOCK', 'B2', 1200000, 1, null, null);
    insertInstance.run(4, 'SONY-AMP-2001', 'IN_STOCK', 'B3', 600000, 1, null, null);
    // Sold Sony amplifier
    insertInstance.run(4, 'SONY-AMP-2002', 'SOLD', 'B3', 600000, 1, '2026-06-01 12:00:00', '2027-06-01 12:00:00');
    // Seed GRN
    var insertGRN = db.prepare("\n    INSERT INTO grn (grn_id, supplier_id, invoice_ref, total_cost, received_by)\n    VALUES (?, ?, ?, ?, ?)\n  ");
    insertGRN.run(1, null, 'INIT-STOCK', 8700000, 1);
    // Seed Repair Job
    var insertRepair = db.prepare("\n    INSERT INTO repair_jobs (job_no, customer_id, customer_phone, customer_name, product_name, serial_number, sold_by_us, is_warranty, issue_reported, technician_notes, technician_id, status, est_cost, parts_cost, labour_cost, advance_paid, final_cost, ready_date, delivered_date)\n    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\n  ");
    insertRepair.run('JOB/26/2001', 2, // Abhishek Audio
    '9876543210', 'Abhishek Audio', 'Sony XM-N1004 Amplifier', 'SONY-AMP-2002', 1, 1, 'Channel 3/4 no output', 'Checking pre-amp stage transistors', 3, // Repair Tech
    'IN_REPAIR', 150000, 0, 0, 0, 0, null, null);
    // Seed Repair Status History
    var insertRepairHistory = db.prepare("\n    INSERT INTO repair_status_history (job_id, old_status, new_status)\n    VALUES (?, ?, ?)\n  ");
    insertRepairHistory.run(1, 'PENDING', 'IN_REPAIR');
}
