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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var electron_1 = require("electron");
var path = __importStar(require("path"));
var fs = __importStar(require("fs"));
var os = __importStar(require("os"));
var node_thermal_printer_1 = require("node-thermal-printer");
var core_1 = require("@chauhan-erp/core");
var crypto_1 = __importDefault(require("crypto"));
var qrcode_1 = __importDefault(require("qrcode"));
// Paths & config
var userDataPath = electron_1.app.getPath('userData');
var configPath = path.join(userDataPath, 'db-config.json');
var activeConfig = {
    dbPath: path.join(userDataPath, 'chauhan-erp.db'),
    backupDir: '',
};
// In-memory session store for LAN API authentication
// token -> { user_id: number, role: string, issuedAt: number }
var sessionStore = new Map();
function generateSessionToken() {
    return crypto_1.default.randomBytes(32).toString('hex');
}
// Load or create config
if (fs.existsSync(configPath)) {
    try {
        activeConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
    catch (e) {
        console.error('Error reading db-config.json, using defaults', e);
    }
}
else {
    fs.writeFileSync(configPath, JSON.stringify(activeConfig, null, 2));
}
// Find schema.sql
var schemaSql = '';
var devSchemaPath = path.join(__dirname, '../../packages/core/schema.sql');
var prodSchemaPath = path.join(process.resourcesPath, 'schema.sql');
if (fs.existsSync(devSchemaPath)) {
    schemaSql = fs.readFileSync(devSchemaPath, 'utf8');
}
else if (fs.existsSync(prodSchemaPath)) {
    schemaSql = fs.readFileSync(prodSchemaPath, 'utf8');
}
else {
    // Hardcoded fallback of the exact schema if files are somehow missing at runtime
    schemaSql = "\n    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);\n    CREATE TABLE IF NOT EXISTS users (user_id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, pin_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('OWNER','CASHIER','STOCK','TECHNICIAN')), active INTEGER DEFAULT 1);\n    CREATE TABLE IF NOT EXISTS audit_log (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER REFERENCES users(user_id), action TEXT, entity TEXT, entity_id INTEGER, detail TEXT, created_at TEXT DEFAULT (datetime('now')));\n    CREATE TABLE IF NOT EXISTS customers (customer_id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, phone TEXT UNIQUE NOT NULL, shop_name TEXT, tier TEXT NOT NULL DEFAULT 'COUNTER' CHECK(tier IN ('COUNTER','DEALER','DISTRIBUTOR')), gstin TEXT, credit_limit INTEGER DEFAULT 0, current_balance INTEGER DEFAULT 0, credit_due_date TEXT, created_at TEXT DEFAULT (datetime('now')));\n    CREATE TABLE IF NOT EXISTS customer_ledger (id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id INTEGER REFERENCES customers(customer_id), type TEXT CHECK(type IN ('SALE','PAYMENT','ADJUSTMENT','RETURN')), ref_id INTEGER, amount INTEGER, balance_after INTEGER, note TEXT, created_at TEXT DEFAULT (datetime('now')));\n    CREATE TABLE IF NOT EXISTS suppliers (supplier_id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, phone TEXT, gstin TEXT, current_payable INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')));\n    CREATE TABLE IF NOT EXISTS products (product_id INTEGER PRIMARY KEY AUTOINCREMENT, sku_code TEXT UNIQUE, brand_name TEXT, model_name TEXT, category TEXT, hsn_code TEXT, gst_rate INTEGER DEFAULT 18, requires_serial INTEGER DEFAULT 1, warranty_months INTEGER DEFAULT 12, min_restock_level INTEGER DEFAULT 5, counter_price INTEGER, dealer_price INTEGER, distributor_price INTEGER, loose_qty INTEGER DEFAULT 0, purchase_cost INTEGER DEFAULT 0, supplier_id INTEGER REFERENCES suppliers(supplier_id), created_at TEXT DEFAULT (datetime('now')));\n    CREATE TABLE IF NOT EXISTS product_fitment (id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER REFERENCES products(product_id) ON DELETE CASCADE, vehicle_tag TEXT NOT NULL);\n    CREATE TABLE IF NOT EXISTS product_instances (instance_id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER NOT NULL REFERENCES products(product_id), serial_number TEXT UNIQUE NOT NULL, status TEXT NOT NULL DEFAULT 'IN_STOCK' CHECK(status IN ('IN_STOCK','SOLD','RMA_RETURNED','IN_REPAIR','SCRAPPED')), batch_number TEXT, purchase_cost INTEGER, grn_id INTEGER, received_at TEXT DEFAULT (datetime('now')), sold_at TEXT, warranty_expires_at TEXT);\n    CREATE TABLE IF NOT EXISTS grn (grn_id INTEGER PRIMARY KEY AUTOINCREMENT, supplier_id INTEGER REFERENCES suppliers(supplier_id), invoice_ref TEXT, total_cost INTEGER DEFAULT 0, received_by INTEGER REFERENCES users(user_id), created_at TEXT DEFAULT (datetime('now')));\n    CREATE TABLE IF NOT EXISTS sales (sale_id INTEGER PRIMARY KEY AUTOINCREMENT, invoice_no TEXT UNIQUE, customer_id INTEGER REFERENCES customers(customer_id), tier_applied TEXT NOT NULL, subtotal INTEGER, discount INTEGER DEFAULT 0, cgst INTEGER DEFAULT 0, sgst INTEGER DEFAULT 0, igst INTEGER DEFAULT 0, grand_total INTEGER, amount_paid INTEGER, payment_mode TEXT, status TEXT DEFAULT 'COMPLETED' CHECK(status IN ('HELD','COMPLETED','CANCELLED')), sold_by INTEGER REFERENCES users(user_id), created_at TEXT DEFAULT (datetime('now')));\n    CREATE TABLE IF NOT EXISTS sale_items (sale_item_id INTEGER PRIMARY KEY AUTOINCREMENT, sale_id INTEGER REFERENCES sales(sale_id) ON DELETE CASCADE, product_id INTEGER REFERENCES products(product_id), instance_id UNIQUE REFERENCES product_instances(instance_id), quantity INTEGER DEFAULT 1, unit_price INTEGER, line_discount INTEGER DEFAULT 0, line_total INTEGER, unit_cost INTEGER DEFAULT 0);\n    CREATE TABLE IF NOT EXISTS credit_notes (cn_id INTEGER PRIMARY KEY AUTOINCREMENT, cn_no TEXT UNIQUE, sale_id INTEGER REFERENCES sales(sale_id), instance_id REFERENCES product_instances(instance_id), amount INTEGER, reason TEXT, created_at TEXT DEFAULT (datetime('now')));\n    CREATE TABLE IF NOT EXISTS rma_register (rma_id INTEGER PRIMARY KEY AUTOINCREMENT, instance_id INTEGER REFERENCES product_instances(instance_id), supplier_id INTEGER REFERENCES suppliers(supplier_id), reason TEXT, status TEXT NOT NULL DEFAULT 'SENT' CHECK(status IN ('SENT','REPLACED','CREDITED','RECEIVED_BACK')), sent_at TEXT DEFAULT (datetime('now')), resolved_at TEXT, note TEXT);\n    CREATE TABLE IF NOT EXISTS repair_jobs (job_id INTEGER PRIMARY KEY AUTOINCREMENT, job_no TEXT UNIQUE, customer_id INTEGER REFERENCES customers(customer_id), customer_phone TEXT NOT NULL, customer_name TEXT, product_name TEXT, serial_number TEXT, sold_by_us INTEGER DEFAULT 0, is_warranty INTEGER DEFAULT 0, issue_reported TEXT, technician_notes TEXT, technician_id INTEGER REFERENCES users(user_id), status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','IN_REPAIR','SENT_TO_COMPANY','READY','DELIVERED')), est_cost INTEGER, parts_cost INTEGER DEFAULT 0, labour_cost INTEGER DEFAULT 0, advance_paid INTEGER DEFAULT 0, final_cost INTEGER, intake_date TEXT DEFAULT (datetime('now')), ready_date TEXT, delivered_date TEXT);\n    CREATE TABLE IF NOT EXISTS repair_parts (id INTEGER PRIMARY KEY AUTOINCREMENT, job_id INTEGER REFERENCES repair_jobs(job_id) ON DELETE CASCADE, product_id INTEGER REFERENCES products(product_id), instance_id REFERENCES product_instances(instance_id), qty INTEGER DEFAULT 1, cost INTEGER);\n    CREATE TABLE IF NOT EXISTS repair_status_history (id INTEGER PRIMARY KEY AUTOINCREMENT, job_id INTEGER REFERENCES repair_jobs(job_id) ON DELETE CASCADE, old_status TEXT, new_status TEXT, changed_at TEXT DEFAULT (datetime('now')));\n    CREATE TABLE IF NOT EXISTS sms_outbox (id INTEGER PRIMARY KEY AUTOINCREMENT, phone TEXT, body TEXT, channel TEXT DEFAULT 'SMS' CHECK(channel IN ('SMS','WHATSAPP')), status TEXT DEFAULT 'QUEUED' CHECK(status IN ('QUEUED','SENT','FAILED')), created_at TEXT DEFAULT (datetime('now')), sent_at TEXT, retry_count INTEGER DEFAULT 0);\n    CREATE TABLE IF NOT EXISTS expenses (id INTEGER PRIMARY KEY AUTOINCREMENT, category TEXT, amount INTEGER, note TEXT, created_at TEXT DEFAULT (datetime('now')));\n  ";
}
// Init DB
try {
    (0, core_1.initDB)(activeConfig.dbPath, schemaSql);
    console.log("Database initialized successfully at ".concat(activeConfig.dbPath));
    // Runtime migration: add channel column to sms_outbox if missing
    try {
        var db = (0, core_1.getDB)();
        var cols = db.prepare("PRAGMA table_info(sms_outbox)").all();
        if (!cols.find(function (c) { return c.name === 'channel'; })) {
            db.prepare("ALTER TABLE sms_outbox ADD COLUMN channel TEXT DEFAULT 'SMS'").run();
            console.log('Migration: added channel column to sms_outbox');
        }
    }
    catch (migErr) {
        console.error('Migration error (channel):', migErr);
    }
    // Runtime migration: Reports & Analytics
    try {
        var db = (0, core_1.getDB)();
        var prodCols = db.prepare("PRAGMA table_info(products)").all();
        if (!prodCols.find(function (c) { return c.name === 'purchase_cost'; })) {
            db.prepare("ALTER TABLE products ADD COLUMN purchase_cost INTEGER DEFAULT 0").run();
            console.log('Migration: added purchase_cost to products');
        }
        if (!prodCols.find(function (c) { return c.name === 'supplier_id'; })) {
            db.prepare("ALTER TABLE products ADD COLUMN supplier_id INTEGER REFERENCES suppliers(supplier_id)").run();
            console.log('Migration: added supplier_id to products');
        }
        var siCols = db.prepare("PRAGMA table_info(sale_items)").all();
        if (!siCols.find(function (c) { return c.name === 'unit_cost'; })) {
            db.prepare("ALTER TABLE sale_items ADD COLUMN unit_cost INTEGER DEFAULT 0").run();
            console.log('Migration: added unit_cost to sale_items');
            // Backfill unit_cost for serialized items
            db.prepare("\n        UPDATE sale_items\n        SET unit_cost = (\n          SELECT pi.purchase_cost \n          FROM product_instances pi \n          WHERE pi.instance_id = sale_items.instance_id\n        )\n        WHERE instance_id IS NOT NULL AND unit_cost = 0;\n      ").run();
            console.log('Migration: backfilled unit_cost for serialized items');
        }
    }
    catch (migErr) {
        console.error('Migration error (reports):', migErr);
    }
}
catch (err) {
    console.error('Failed to initialize database', err);
}
// ================= EXPRESS API FOR MOBILE SCANNER =================
var api_1 = require("./api");
var core_2 = require("@chauhan-erp/core");
var activeDesktopSession = null;
function handleElevated(channel, action, handler) {
    var _this = this;
    electron_1.ipcMain.handle(channel, function (event) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                (0, core_2.assertCan)(activeDesktopSession === null || activeDesktopSession === void 0 ? void 0 : activeDesktopSession.role, action);
                return [2 /*return*/, handler.apply(void 0, __spreadArray([event], args, false))];
            });
        });
    });
}
var PORT = 47615;
var serverInstance = null;
function startExpressServer() {
    if (serverInstance)
        return;
    var expressApp = (0, api_1.createApiServer)({
        getDB: core_1.getDB,
        sessionStore: sessionStore,
        isPackaged: electron_1.app.isPackaged,
        mainWindow: mainWindow,
        activeConfig: activeConfig,
        configPath: configPath,
        initDB: core_1.initDB,
        schemaSql: schemaSql
    });
    serverInstance = expressApp.listen(PORT, '0.0.0.0', function () {
        console.log("Express LAN API server listening on http://0.0.0.0:".concat(PORT));
    });
}
electron_1.ipcMain.handle('verify-desktop-pin', function (e, pin) {
    var db = (0, core_1.getDB)();
    var users = db.prepare('SELECT * FROM users WHERE active = 1').all();
    var bcrypt = require('bcryptjs');
    var matchedUser = users.find(function (u) { return bcrypt.compareSync(pin, u.pin_hash); });
    if (matchedUser) {
        var userPayload = { user_id: matchedUser.user_id, role: matchedUser.role, name: matchedUser.name };
        activeDesktopSession = userPayload;
        return { success: true, user: userPayload };
    }
    return { success: false, error: 'Invalid PIN' };
});
electron_1.ipcMain.handle('desktop-logout', function () {
    activeDesktopSession = null;
    return true;
});
function getLocalIpAddress() {
    var interfaces = os.networkInterfaces();
    for (var _i = 0, _a = Object.keys(interfaces); _i < _a.length; _i++) {
        var name_1 = _a[_i];
        for (var _b = 0, _c = interfaces[name_1] || []; _b < _c.length; _b++) {
            var iface = _c[_b];
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return '127.0.0.1';
}
function performBackup(backupFolder) {
    if (!backupFolder || !fs.existsSync(backupFolder)) {
        throw new Error('Backup directory does not exist or is not set.');
    }
    var dateStr = new Date().toISOString().replace(/T/, '_').replace(/\..+/, '').replace(/:/g, '-');
    var backupFileName = "chauhan_erp_backup_".concat(dateStr, ".db");
    var destinationPath = path.join(backupFolder, backupFileName);
    // Perform copy
    fs.copyFileSync(activeConfig.dbPath, destinationPath);
    return destinationPath;
}
// IPC Handlers
handleElevated('db-query', 'BACKUP_RESTORE', function (event_1, sql_1) {
    var args_1 = [];
    for (var _i = 2; _i < arguments.length; _i++) {
        args_1[_i - 2] = arguments[_i];
    }
    return __awaiter(void 0, __spreadArray([event_1, sql_1], args_1, true), void 0, function (event, sql, params) {
        var db;
        var _a;
        if (params === void 0) { params = []; }
        return __generator(this, function (_b) {
            db = (0, core_1.getDB)();
            return [2 /*return*/, (_a = db.prepare(sql)).all.apply(_a, params)];
        });
    });
});
handleElevated('db-get', 'BACKUP_RESTORE', function (event_1, sql_1) {
    var args_1 = [];
    for (var _i = 2; _i < arguments.length; _i++) {
        args_1[_i - 2] = arguments[_i];
    }
    return __awaiter(void 0, __spreadArray([event_1, sql_1], args_1, true), void 0, function (event, sql, params) {
        var db;
        var _a;
        if (params === void 0) { params = []; }
        return __generator(this, function (_b) {
            db = (0, core_1.getDB)();
            return [2 /*return*/, (_a = db.prepare(sql)).get.apply(_a, params)];
        });
    });
});
handleElevated('db-run', 'BACKUP_RESTORE', function (event_1, sql_1) {
    var args_1 = [];
    for (var _i = 2; _i < arguments.length; _i++) {
        args_1[_i - 2] = arguments[_i];
    }
    return __awaiter(void 0, __spreadArray([event_1, sql_1], args_1, true), void 0, function (event, sql, params) {
        var db, res;
        var _a;
        if (params === void 0) { params = []; }
        return __generator(this, function (_b) {
            db = (0, core_1.getDB)();
            res = (_a = db.prepare(sql)).run.apply(_a, params);
            return [2 /*return*/, {
                    changes: res.changes,
                    lastInsertRowid: res.lastInsertRowid,
                }];
        });
    });
});
handleElevated('db-transaction', 'BACKUP_RESTORE', function (event, queries) { return __awaiter(void 0, void 0, void 0, function () {
    var db, runTx;
    return __generator(this, function (_a) {
        db = (0, core_1.getDB)();
        runTx = db.transaction(function (txQueries) {
            var _a;
            var results = [];
            for (var _i = 0, txQueries_1 = txQueries; _i < txQueries_1.length; _i++) {
                var q = txQueries_1[_i];
                results.push((_a = db.prepare(q.sql)).run.apply(_a, q.params));
            }
            return results;
        });
        return [2 /*return*/, runTx(queries)];
    });
}); });
electron_1.ipcMain.handle('get-db-config', function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        (0, core_2.assertCan)(activeDesktopSession === null || activeDesktopSession === void 0 ? void 0 : activeDesktopSession.role, 'READ_DASHBOARD');
        return [2 /*return*/, activeConfig];
    });
}); });
handleElevated('set-db-config', 'USER_MGMT', function (event, newConfig) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        activeConfig = __assign(__assign({}, activeConfig), newConfig);
        fs.writeFileSync(configPath, JSON.stringify(activeConfig, null, 2));
        // If DB path changed, re-init DB
        if (newConfig.dbPath) {
            // We should safely re-initialize the core DB
            // (Note: in production we would want to close the previous connection, but for simplicity, we'll re-run initDB)
            (0, core_1.initDB)(activeConfig.dbPath, schemaSql);
        }
        return [2 /*return*/, activeConfig];
    });
}); });
handleElevated('select-directory', 'BACKUP_RESTORE', function () { return __awaiter(void 0, void 0, void 0, function () {
    var result;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, electron_1.dialog.showOpenDialog({
                    properties: ['openDirectory'],
                })];
            case 1:
                result = _a.sent();
                if (result.canceled || result.filePaths.length === 0) {
                    return [2 /*return*/, null];
                }
                return [2 /*return*/, result.filePaths[0]];
        }
    });
}); });
handleElevated('select-file', 'BACKUP_RESTORE', function (event, filters) { return __awaiter(void 0, void 0, void 0, function () {
    var result;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, electron_1.dialog.showOpenDialog({
                    properties: ['openFile'],
                    filters: filters,
                })];
            case 1:
                result = _a.sent();
                if (result.canceled || result.filePaths.length === 0) {
                    return [2 /*return*/, null];
                }
                return [2 /*return*/, result.filePaths[0]];
        }
    });
}); });
handleElevated('backup-now', 'BACKUP_RESTORE', function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        if (!activeConfig.backupDir) {
            throw new Error('No backup directory configured');
        }
        return [2 /*return*/, performBackup(activeConfig.backupDir)];
    });
}); });
handleElevated('restore-db', 'BACKUP_RESTORE', function (event, backupFilePath) { return __awaiter(void 0, void 0, void 0, function () {
    var safetyDir, safetyBackupPath, tempDb, integrity, walFile, shmFile;
    var _a;
    return __generator(this, function (_b) {
        if (!fs.existsSync(backupFilePath)) {
            throw new Error('Selected backup file does not exist');
        }
        safetyDir = userDataPath;
        safetyBackupPath = path.join(safetyDir, 'chauhan_erp_safety_backup_before_restore.db');
        fs.copyFileSync(activeConfig.dbPath, safetyBackupPath);
        try {
            tempDb = new (require('better-sqlite3'))(backupFilePath);
            integrity = tempDb.pragma('integrity_check');
            tempDb.close();
            if (((_a = integrity[0]) === null || _a === void 0 ? void 0 : _a.integrity_check) !== 'ok' && integrity[0] !== 'ok') {
                throw new Error('Integrity check failed on backup file');
            }
            // Close active DB connection by deleting it from core memory
            // (Our initDB allows replacing the instance)
            // Overwrite database file
            fs.copyFileSync(backupFilePath, activeConfig.dbPath);
            walFile = "".concat(activeConfig.dbPath, "-wal");
            shmFile = "".concat(activeConfig.dbPath, "-shm");
            if (fs.existsSync(walFile))
                fs.unlinkSync(walFile);
            if (fs.existsSync(shmFile))
                fs.unlinkSync(shmFile);
            // Reinitialize DB
            (0, core_1.initDB)(activeConfig.dbPath, schemaSql);
            return [2 /*return*/, { success: true }];
        }
        catch (err) {
            // Restore from safety backup
            fs.copyFileSync(safetyBackupPath, activeConfig.dbPath);
            (0, core_1.initDB)(activeConfig.dbPath, schemaSql);
            throw new Error("Restore failed: ".concat(err.message, ". Safety backup restored."));
        }
        return [2 /*return*/];
    });
}); });
electron_1.ipcMain.handle('get-lan-info', function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        (0, core_2.assertCan)(activeDesktopSession === null || activeDesktopSession === void 0 ? void 0 : activeDesktopSession.role, 'READ_DASHBOARD');
        return [2 /*return*/, {
                ip: getLocalIpAddress(),
                port: PORT,
            }];
    });
}); });
// Udhaar Ledger Specific IPC
electron_1.ipcMain.handle('get-customers-aging', function () { return __awaiter(void 0, void 0, void 0, function () {
    var db, customers;
    return __generator(this, function (_a) {
        (0, core_2.assertCan)(activeDesktopSession === null || activeDesktopSession === void 0 ? void 0 : activeDesktopSession.role, 'READ_CUSTOMERS');
        db = (0, core_1.getDB)();
        customers = db.prepare('SELECT * FROM customers').all();
        return [2 /*return*/, customers.map(function (c) {
                var aging = (0, core_1.calculateAging)(c, new Date());
                return __assign(__assign({}, c), { aging: aging });
            })];
    });
}); });
electron_1.ipcMain.handle('get-customer-ledger', function (event, customerId) { return __awaiter(void 0, void 0, void 0, function () {
    var db;
    return __generator(this, function (_a) {
        (0, core_2.assertCan)(activeDesktopSession === null || activeDesktopSession === void 0 ? void 0 : activeDesktopSession.role, 'READ_CUSTOMERS');
        db = (0, core_1.getDB)();
        return [2 /*return*/, db.prepare('SELECT * FROM customer_ledger WHERE customer_id = ? ORDER BY id DESC').all(customerId)];
    });
}); });
electron_1.ipcMain.handle('record-udhaar-payment', function (event, customerId, amount, note) { return __awaiter(void 0, void 0, void 0, function () {
    var db, tx;
    return __generator(this, function (_a) {
        (0, core_2.assertCan)(activeDesktopSession === null || activeDesktopSession === void 0 ? void 0 : activeDesktopSession.role, 'RECORD_PAYMENT');
        db = (0, core_1.getDB)();
        tx = db.transaction(function () {
            db.prepare('UPDATE customers SET current_balance = current_balance - ? WHERE customer_id = ?').run(amount, customerId);
            var newCustomer = db.prepare('SELECT current_balance FROM customers WHERE customer_id = ?').get(customerId);
            db.prepare("\n      INSERT INTO customer_ledger (customer_id, type, amount, balance_after, note)\n      VALUES (?, 'PAYMENT', ?, ?, ?)\n    ").run(customerId, amount, newCustomer.current_balance, note);
            db.prepare("INSERT INTO audit_log (user_id, action, entity, entity_id, detail) VALUES (?, 'RECORD_PAYMENT', 'customer_ledger', ?, ?)").run(activeDesktopSession === null || activeDesktopSession === void 0 ? void 0 : activeDesktopSession.user_id, customerId, "Payment amount: ".concat(amount));
            return newCustomer.current_balance;
        });
        return [2 /*return*/, tx()];
    });
}); });
electron_1.ipcMain.handle('queue-sms-reminder', function (event, customerId) { return __awaiter(void 0, void 0, void 0, function () {
    var db, customer, shopNameRow, shopName, body;
    return __generator(this, function (_a) {
        (0, core_2.assertCan)(activeDesktopSession === null || activeDesktopSession === void 0 ? void 0 : activeDesktopSession.role, 'RECORD_PAYMENT');
        db = (0, core_1.getDB)();
        customer = db.prepare('SELECT * FROM customers WHERE customer_id = ?').get(customerId);
        if (!customer || !customer.phone)
            throw new Error("Customer or phone not found");
        shopNameRow = db.prepare("SELECT value FROM settings WHERE key = 'shop_name'").get();
        shopName = (shopNameRow === null || shopNameRow === void 0 ? void 0 : shopNameRow.value) || 'Chauhan Electronics';
        body = (0, core_1.formatPaymentReminder)(customer, shopName);
        db.prepare("\n    INSERT INTO sms_outbox (phone, body, status) VALUES (?, ?, 'QUEUED')\n  ").run(customer.phone, body);
        return [2 /*return*/, true];
    });
}); });
// ================= SUPPLIERS & PURCHASES M4 =================
electron_1.ipcMain.handle('get-suppliers', function () { return __awaiter(void 0, void 0, void 0, function () {
    var db;
    return __generator(this, function (_a) {
        (0, core_2.assertCan)(activeDesktopSession === null || activeDesktopSession === void 0 ? void 0 : activeDesktopSession.role, 'READ_SUPPLIERS');
        db = (0, core_1.getDB)();
        return [2 /*return*/, db.prepare('SELECT * FROM suppliers ORDER BY name ASC').all()];
    });
}); });
handleElevated('create-supplier', 'CREATE_SUPPLIER', function (event, name, phone, gstin) { return __awaiter(void 0, void 0, void 0, function () {
    var db, res;
    return __generator(this, function (_a) {
        db = (0, core_1.getDB)();
        res = db.prepare('INSERT INTO suppliers (name, phone, gstin, current_payable) VALUES (?, ?, ?, 0)').run(name, phone || null, gstin || null);
        return [2 /*return*/, res.lastInsertRowid];
    });
}); });
electron_1.ipcMain.handle('get-supplier-ledger', function (event, supplierId) { return __awaiter(void 0, void 0, void 0, function () {
    var db, grns, payments, ledger;
    return __generator(this, function (_a) {
        (0, core_2.assertCan)(activeDesktopSession === null || activeDesktopSession === void 0 ? void 0 : activeDesktopSession.role, 'READ_SUPPLIERS');
        db = (0, core_1.getDB)();
        grns = db.prepare("\n    SELECT grn_id as id, 'PURCHASE' as type, invoice_ref as ref, total_cost as amount, created_at\n    FROM grn \n    WHERE supplier_id = ?\n  ").all(supplierId);
        payments = db.prepare("\n    SELECT id, 'PAYMENT' as type, '' as ref, amount, created_at, note\n    FROM expenses \n    WHERE category = 'SUPPLIER_PAYMENT' AND note LIKE ?\n  ").all("Supplier ID: ".concat(supplierId, " %"));
        ledger = __spreadArray(__spreadArray([], grns, true), payments, true).sort(function (a, b) {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        return [2 /*return*/, ledger];
    });
}); });
electron_1.ipcMain.handle('record-supplier-payment', function (event, supplierId, amount, note) { return __awaiter(void 0, void 0, void 0, function () {
    var db, tx;
    return __generator(this, function (_a) {
        (0, core_2.assertCan)(activeDesktopSession === null || activeDesktopSession === void 0 ? void 0 : activeDesktopSession.role, 'RECORD_PAYMENT');
        db = (0, core_1.getDB)();
        tx = db.transaction(function () {
            // 1. Decrease current_payable
            db.prepare('UPDATE suppliers SET current_payable = current_payable - ? WHERE supplier_id = ?').run(amount, supplierId);
            // 2. Insert into expenses
            db.prepare("\n      INSERT INTO expenses (category, amount, note) VALUES ('SUPPLIER_PAYMENT', ?, ?)\n    ").run(amount, "Supplier ID: ".concat(supplierId, " | ").concat(note));
            return true;
        });
        return [2 /*return*/, tx()];
    });
}); });
electron_1.ipcMain.handle('commit-intake-batch', function (event, payload) { return __awaiter(void 0, void 0, void 0, function () {
    var supplier_id, invoice_ref, total_cost_paise, user_id, items, type, db, tx;
    return __generator(this, function (_a) {
        (0, core_2.assertCan)(activeDesktopSession === null || activeDesktopSession === void 0 ? void 0 : activeDesktopSession.role, 'RECEIVE_GRN');
        supplier_id = payload.supplier_id, invoice_ref = payload.invoice_ref, total_cost_paise = payload.total_cost_paise, user_id = payload.user_id, items = payload.items, type = payload.type;
        db = (0, core_1.getDB)();
        tx = db.transaction(function () {
            // 1. Create GRN
            var grnRes = db.prepare("\n      INSERT INTO grn (supplier_id, invoice_ref, total_cost, received_by)\n      VALUES (?, ?, ?, ?)\n    ").run(supplier_id || null, invoice_ref || 'INTAKE', total_cost_paise, activeDesktopSession === null || activeDesktopSession === void 0 ? void 0 : activeDesktopSession.user_id);
            var grnId = grnRes.lastInsertRowid;
            // 2. Increment supplier payable if linked
            if (supplier_id) {
                db.prepare('UPDATE suppliers SET current_payable = current_payable + ? WHERE supplier_id = ?')
                    .run(total_cost_paise, supplier_id);
            }
            // 3. Process items
            if (type === 'SERIALIZED') {
                for (var _i = 0, items_1 = items; _i < items_1.length; _i++) {
                    var item = items_1[_i];
                    db.prepare("\n          INSERT INTO product_instances (product_id, serial_number, status, batch_number, purchase_cost, grn_id)\n          VALUES (?, ?, 'IN_STOCK', ?, ?, ?)\n        ").run(item.product_id, item.serial_number, item.batch_number, item.purchase_cost, grnId);
                }
            }
            else if (type === 'LOOSE') {
                for (var _a = 0, items_2 = items; _a < items_2.length; _a++) {
                    var item = items_2[_a];
                    db.prepare('UPDATE products SET loose_qty = loose_qty + ? WHERE product_id = ?')
                        .run(item.qty, item.product_id);
                }
            }
            db.prepare("INSERT INTO audit_log (user_id, action, entity, entity_id, detail) VALUES (?, 'RECEIVE_GRN', 'grn', ?, ?)").run(activeDesktopSession === null || activeDesktopSession === void 0 ? void 0 : activeDesktopSession.user_id, grnId, "Processed ".concat(type, " intake via LAN API."));
            return grnId;
        });
        return [2 /*return*/, tx()];
    });
}); });
electron_1.ipcMain.handle('create-product', function (event, payload) { return __awaiter(void 0, void 0, void 0, function () {
    var db, tx;
    return __generator(this, function (_a) {
        (0, core_2.assertCan)(activeDesktopSession === null || activeDesktopSession === void 0 ? void 0 : activeDesktopSession.role, 'RECEIVE_GRN');
        db = (0, core_1.getDB)();
        tx = db.transaction(function () {
            var res = db.prepare("\n      INSERT INTO products (sku_code, brand_name, model_name, category, hsn_code, gst_rate, requires_serial, warranty_months, min_restock_level, counter_price, dealer_price, distributor_price, loose_qty)\n      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)\n    ").run(payload.sku_code, payload.brand_name, payload.model_name, payload.category, payload.hsn_code, payload.gst_rate, payload.requires_serial ? 1 : 0, payload.warranty_months, payload.min_restock_level, payload.counter_price, payload.dealer_price, payload.distributor_price);
            var newId = res.lastInsertRowid;
            if (payload.fitment_tags && payload.fitment_tags.length > 0) {
                for (var _i = 0, _a = payload.fitment_tags; _i < _a.length; _i++) {
                    var tag = _a[_i];
                    db.prepare('INSERT INTO product_fitment (product_id, vehicle_tag) VALUES (?, ?)').run(newId, tag);
                }
            }
            db.prepare("INSERT INTO audit_log (user_id, action, entity, entity_id, detail) VALUES (?, 'CREATE', 'product', ?, ?)").run(activeDesktopSession === null || activeDesktopSession === void 0 ? void 0 : activeDesktopSession.user_id, newId, "Created product model: ".concat(payload.brand_name, " ").concat(payload.model_name));
            return newId;
        });
        return [2 /*return*/, tx()];
    });
}); });
// ================= REPAIRS & SERVICE M5 =================
electron_1.ipcMain.handle('get-repair-jobs', function () { return __awaiter(void 0, void 0, void 0, function () {
    var db;
    return __generator(this, function (_a) {
        (0, core_2.assertCan)(activeDesktopSession === null || activeDesktopSession === void 0 ? void 0 : activeDesktopSession.role, 'READ_REPAIRS');
        db = (0, core_1.getDB)();
        return [2 /*return*/, db.prepare('SELECT * FROM repair_jobs ORDER BY job_id DESC').all()];
    });
}); });
electron_1.ipcMain.handle('create-repair-job', function (event, payload) { return __awaiter(void 0, void 0, void 0, function () {
    var db, tx;
    return __generator(this, function (_a) {
        (0, core_2.assertCan)(activeDesktopSession === null || activeDesktopSession === void 0 ? void 0 : activeDesktopSession.role, 'MANAGE_REPAIRS');
        db = (0, core_1.getDB)();
        tx = db.transaction(function () {
            // Get prefix and next no
            var prefixRow = db.prepare("SELECT value FROM settings WHERE key = 'job_prefix'").get();
            var nextNoRow = db.prepare("SELECT value FROM settings WHERE key = 'next_job_no'").get();
            var prefix = prefixRow ? prefixRow.value : 'JOB-';
            var nextNo = nextNoRow ? parseInt(nextNoRow.value, 10) : 1000;
            // Ensure settings exist if not
            if (!prefixRow)
                db.prepare("INSERT INTO settings (key, value) VALUES ('job_prefix', 'JOB-')").run();
            if (!nextNoRow)
                db.prepare("INSERT INTO settings (key, value) VALUES ('next_job_no', '1000')").run();
            var jobNo = "".concat(prefix).concat(nextNo);
            // Link customer if provided
            var custId = payload.customer_id || null;
            if (!custId && payload.customer_phone) {
                var match = db.prepare("SELECT customer_id FROM customers WHERE phone = ?").get(payload.customer_phone);
                if (match)
                    custId = match.customer_id;
            }
            // Insert job
            var res = db.prepare("\n      INSERT INTO repair_jobs (\n        job_no, customer_id, customer_phone, customer_name,\n        product_name, serial_number, is_warranty,\n        issue_reported, est_cost, advance_paid\n      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\n    ").run(jobNo, custId, payload.customer_phone, payload.customer_name, payload.product_name, payload.serial_number, payload.is_warranty ? 1 : 0, payload.issue_reported, payload.est_cost || 0, payload.advance_paid || 0);
            // Increment next_job_no
            db.prepare("UPDATE settings SET value = ? WHERE key = 'next_job_no'").run((nextNo + 1).toString());
            return res.lastInsertRowid;
        });
        return [2 /*return*/, tx()];
    });
}); });
electron_1.ipcMain.handle('get-repair-parts', function (event, jobId) { return __awaiter(void 0, void 0, void 0, function () {
    var db;
    return __generator(this, function (_a) {
        (0, core_2.assertCan)(activeDesktopSession === null || activeDesktopSession === void 0 ? void 0 : activeDesktopSession.role, 'READ_REPAIRS');
        db = (0, core_1.getDB)();
        return [2 /*return*/, db.prepare("\n    SELECT rp.*, p.brand_name, p.model_name \n    FROM repair_parts rp\n    JOIN products p ON rp.product_id = p.product_id\n    WHERE rp.job_id = ?\n  ").all(jobId)];
    });
}); });
electron_1.ipcMain.handle('add-repair-part', function (event, jobId, type, item) { return __awaiter(void 0, void 0, void 0, function () {
    var db, tx;
    return __generator(this, function (_a) {
        (0, core_2.assertCan)(activeDesktopSession === null || activeDesktopSession === void 0 ? void 0 : activeDesktopSession.role, 'MANAGE_REPAIRS');
        db = (0, core_1.getDB)();
        tx = db.transaction(function () {
            var cost = item.cost;
            if (type === 'SERIALIZED') {
                // Mark as SOLD (consumed)
                var res = db.prepare("UPDATE product_instances SET status = 'SOLD' WHERE instance_id = ? AND status = 'IN_STOCK'").run(item.instance_id);
                if (res.changes === 0)
                    throw new Error("Serial number not available in stock.");
                db.prepare("\n        INSERT INTO repair_parts (job_id, product_id, instance_id, qty, cost)\n        VALUES (?, ?, ?, 1, ?)\n      ").run(jobId, item.product_id, item.instance_id, cost);
            }
            else {
                // Loose qty check
                var prod = db.prepare("SELECT loose_qty FROM products WHERE product_id = ?").get(item.product_id);
                if (!prod || prod.loose_qty < item.qty)
                    throw new Error("Not enough loose quantity in stock.");
                db.prepare("UPDATE products SET loose_qty = loose_qty - ? WHERE product_id = ?").run(item.qty, item.product_id);
                db.prepare("\n        INSERT INTO repair_parts (job_id, product_id, qty, cost)\n        VALUES (?, ?, ?, ?)\n      ").run(jobId, item.product_id, item.qty, cost * item.qty);
                cost = cost * item.qty;
            }
            // Update job parts_cost
            db.prepare("UPDATE repair_jobs SET parts_cost = parts_cost + ? WHERE job_id = ?").run(cost, jobId);
            return true;
        });
        return [2 /*return*/, tx()];
    });
}); });
electron_1.ipcMain.handle('update-repair-status', function (event, jobId, newStatus, notes) { return __awaiter(void 0, void 0, void 0, function () {
    var db, tx;
    return __generator(this, function (_a) {
        (0, core_2.assertCan)(activeDesktopSession === null || activeDesktopSession === void 0 ? void 0 : activeDesktopSession.role, 'MANAGE_REPAIRS');
        db = (0, core_1.getDB)();
        tx = db.transaction(function () {
            var _a;
            var job = db.prepare("SELECT status FROM repair_jobs WHERE job_id = ?").get(jobId);
            if (!job)
                throw new Error("Job not found");
            if (job.status !== newStatus) {
                db.prepare("INSERT INTO repair_status_history (job_id, old_status, new_status) VALUES (?, ?, ?)").run(jobId, job.status, newStatus);
                var extraUpdate = "";
                var params = [newStatus];
                if (newStatus === 'READY') {
                    extraUpdate = ", ready_date = datetime('now')";
                }
                if (notes) {
                    extraUpdate += ", technician_notes = ?";
                    params.push(notes);
                }
                params.push(jobId);
                (_a = db.prepare("UPDATE repair_jobs SET status = ?".concat(extraUpdate, " WHERE job_id = ?"))).run.apply(_a, params);
                db.prepare("INSERT INTO audit_log (user_id, action, entity, entity_id, detail) VALUES (?, 'REPAIR_STATUS_UPDATE', 'repair_jobs', ?, ?)").run(activeDesktopSession === null || activeDesktopSession === void 0 ? void 0 : activeDesktopSession.user_id, jobId, "Status changed from ".concat(job.status, " to ").concat(newStatus));
            }
            else if (notes) {
                db.prepare("UPDATE repair_jobs SET technician_notes = ? WHERE job_id = ?").run(notes, jobId);
            }
            return true;
        });
        return [2 /*return*/, tx()];
    });
}); });
electron_1.ipcMain.handle('deliver-repair-job', function (event, jobId, finalCost, labourCost) { return __awaiter(void 0, void 0, void 0, function () {
    var db;
    return __generator(this, function (_a) {
        (0, core_2.assertCan)(activeDesktopSession === null || activeDesktopSession === void 0 ? void 0 : activeDesktopSession.role, 'MANAGE_REPAIRS');
        db = (0, core_1.getDB)();
        db.prepare("\n    UPDATE repair_jobs \n    SET status = 'DELIVERED', final_cost = ?, labour_cost = ?, delivered_date = datetime('now')\n    WHERE job_id = ?\n  ").run(finalCost, labourCost, jobId);
        return [2 /*return*/, true];
    });
}); });
// ================= ACCOUNTING & EXPENSES M6 =================
handleElevated('record-expense', 'RECORD_EXPENSE', function (event, category, amount, note) { return __awaiter(void 0, void 0, void 0, function () {
    var db, res;
    return __generator(this, function (_a) {
        db = (0, core_1.getDB)();
        res = db.prepare("\n    INSERT INTO expenses (category, amount, note) VALUES (?, ?, ?)\n  ").run(category, amount, note);
        return [2 /*return*/, res.lastInsertRowid];
    });
}); });
electron_1.ipcMain.handle('get-expenses', function (event_1) {
    var args_1 = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        args_1[_i - 1] = arguments[_i];
    }
    return __awaiter(void 0, __spreadArray([event_1], args_1, true), void 0, function (event, limit) {
        var db;
        if (limit === void 0) { limit = 50; }
        return __generator(this, function (_a) {
            (0, core_2.assertCan)(activeDesktopSession === null || activeDesktopSession === void 0 ? void 0 : activeDesktopSession.role, 'READ_ACCOUNTING');
            db = (0, core_1.getDB)();
            return [2 /*return*/, db.prepare("\n    SELECT * FROM expenses \n    WHERE category != 'SUPPLIER_PAYMENT' \n    ORDER BY created_at DESC LIMIT ?\n  ").all(limit)];
        });
    });
});
electron_1.ipcMain.handle('get-eod-reconciliation', function (event, dateStr) { return __awaiter(void 0, void 0, void 0, function () {
    var db, datePattern, sales, salesCash, salesDigital, udhaarRow, udhaarReceived, expRow, opsExpenses, supRow, supplierPayments, cogsRow, serializedCOGS;
    return __generator(this, function (_a) {
        (0, core_2.assertCan)(activeDesktopSession === null || activeDesktopSession === void 0 ? void 0 : activeDesktopSession.role, 'READ_ACCOUNTING');
        db = (0, core_1.getDB)();
        datePattern = "".concat(dateStr, "%");
        sales = db.prepare("\n    SELECT payment_mode, SUM(amount_paid) as total \n    FROM sales \n    WHERE created_at LIKE ? AND status = 'COMPLETED'\n    GROUP BY payment_mode\n  ").all(datePattern);
        salesCash = 0;
        salesDigital = 0;
        sales.forEach(function (s) {
            if (s.payment_mode === 'CASH')
                salesCash += s.total;
            else
                salesDigital += s.total;
        });
        udhaarRow = db.prepare("\n    SELECT SUM(amount) as total FROM customer_ledger \n    WHERE type = 'PAYMENT' AND created_at LIKE ?\n  ").get(datePattern);
        udhaarReceived = (udhaarRow === null || udhaarRow === void 0 ? void 0 : udhaarRow.total) || 0;
        expRow = db.prepare("\n    SELECT SUM(amount) as total FROM expenses \n    WHERE category != 'SUPPLIER_PAYMENT' AND created_at LIKE ?\n  ").get(datePattern);
        opsExpenses = (expRow === null || expRow === void 0 ? void 0 : expRow.total) || 0;
        supRow = db.prepare("\n    SELECT SUM(amount) as total FROM expenses \n    WHERE category = 'SUPPLIER_PAYMENT' AND created_at LIKE ?\n  ").get(datePattern);
        supplierPayments = (supRow === null || supRow === void 0 ? void 0 : supRow.total) || 0;
        cogsRow = db.prepare("\n    SELECT SUM(pi.purchase_cost) as total \n    FROM sale_items si\n    JOIN product_instances pi ON si.instance_id = pi.instance_id\n    JOIN sales s ON si.sale_id = s.sale_id\n    WHERE s.created_at LIKE ? AND s.status = 'COMPLETED'\n  ").get(datePattern);
        serializedCOGS = (cogsRow === null || cogsRow === void 0 ? void 0 : cogsRow.total) || 0;
        // For loose items, we might not track cost precisely per sale in schema. We'll ignore loose COGS for now or use 0.
        return [2 /*return*/, {
                salesCash: salesCash,
                salesDigital: salesDigital,
                udhaarReceived: udhaarReceived,
                opsExpenses: opsExpenses,
                supplierPayments: supplierPayments,
                serializedCOGS: serializedCOGS,
                totalRevenue: salesCash + salesDigital,
                totalInflow: salesCash + salesDigital + udhaarReceived,
                totalOutflow: opsExpenses + supplierPayments,
                netMargin: (salesCash + salesDigital) - serializedCOGS - opsExpenses
            }];
    });
}); });
// ================= DATA PORTABILITY & BACKUPS M7 =================
handleElevated('backup-database', 'BACKUP_RESTORE', function (event) { return __awaiter(void 0, void 0, void 0, function () {
    var db, _a, canceled, filePath, err_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                if (!mainWindow)
                    return [2 /*return*/, { success: false, error: 'No main window' }];
                db = (0, core_1.getDB)();
                return [4 /*yield*/, electron_1.dialog.showSaveDialog(mainWindow, {
                        title: 'Backup Database',
                        defaultPath: "chauhan_erp_backup_".concat(new Date().toISOString().split('T')[0], ".sqlite"),
                        filters: [{ name: 'SQLite Database', extensions: ['sqlite'] }]
                    })];
            case 1:
                _a = _b.sent(), canceled = _a.canceled, filePath = _a.filePath;
                if (canceled || !filePath)
                    return [2 /*return*/, { success: false, error: 'Canceled' }];
                _b.label = 2;
            case 2:
                _b.trys.push([2, 4, , 5]);
                return [4 /*yield*/, db.backup(filePath)];
            case 3:
                _b.sent();
                return [2 /*return*/, { success: true, filePath: filePath }];
            case 4:
                err_1 = _b.sent();
                return [2 /*return*/, { success: false, error: err_1.message }];
            case 5: return [2 /*return*/];
        }
    });
}); });
handleElevated('export-csv', 'BACKUP_RESTORE', function (event, tableName) { return __awaiter(void 0, void 0, void 0, function () {
    var db, allowed, _a, canceled, filePath, rows, headers_1, toCsv_1, csvLines;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                if (!mainWindow)
                    return [2 /*return*/, { success: false, error: 'No main window' }];
                db = (0, core_1.getDB)();
                allowed = ['sales', 'customers', 'products', 'repair_jobs', 'suppliers', 'expenses'];
                if (!allowed.includes(tableName))
                    return [2 /*return*/, { success: false, error: 'Invalid table' }];
                return [4 /*yield*/, electron_1.dialog.showSaveDialog(mainWindow, {
                        title: "Export ".concat(tableName, " to CSV"),
                        defaultPath: "".concat(tableName, "_export_").concat(new Date().toISOString().split('T')[0], ".csv"),
                        filters: [{ name: 'CSV Files', extensions: ['csv'] }]
                    })];
            case 1:
                _a = _b.sent(), canceled = _a.canceled, filePath = _a.filePath;
                if (canceled || !filePath)
                    return [2 /*return*/, { success: false, error: 'Canceled' }];
                try {
                    rows = db.prepare("SELECT * FROM ".concat(tableName)).all();
                    if (rows.length === 0) {
                        fs.writeFileSync(filePath, 'No data found\\n');
                        return [2 /*return*/, { success: true, filePath: filePath }];
                    }
                    headers_1 = Object.keys(rows[0]);
                    toCsv_1 = function (val) {
                        if (val === null || val === undefined)
                            return '""';
                        var str = String(val);
                        if (str.includes(',') || str.includes('"') || str.includes('\\n')) {
                            return "\"".concat(str.replace(/"/g, '""'), "\"");
                        }
                        return str;
                    };
                    csvLines = __spreadArray([
                        headers_1.join(',')
                    ], rows.map(function (row) { return headers_1.map(function (h) { return toCsv_1(row[h]); }).join(','); }), true);
                    fs.writeFileSync(filePath, csvLines.join('\\n'));
                    return [2 /*return*/, { success: true, filePath: filePath }];
                }
                catch (err) {
                    return [2 /*return*/, { success: false, error: err.message }];
                }
                return [2 /*return*/];
        }
    });
}); });
handleElevated('export-raw-csv', 'BACKUP_RESTORE', function (event, reportName, csvData) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, canceled, filePath;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                if (!mainWindow)
                    return [2 /*return*/, { success: false, error: 'No main window' }];
                return [4 /*yield*/, electron_1.dialog.showSaveDialog(mainWindow, {
                        title: "Export ".concat(reportName, " Report"),
                        defaultPath: "".concat(reportName, "_").concat(new Date().toISOString().split('T')[0], ".csv"),
                        filters: [{ name: 'CSV Files', extensions: ['csv'] }]
                    })];
            case 1:
                _a = _b.sent(), canceled = _a.canceled, filePath = _a.filePath;
                if (canceled || !filePath)
                    return [2 /*return*/, { success: false, error: 'Canceled' }];
                try {
                    fs.writeFileSync(filePath, csvData);
                    return [2 /*return*/, { success: true, filePath: filePath }];
                }
                catch (err) {
                    return [2 /*return*/, { success: false, error: err.message }];
                }
                return [2 /*return*/];
        }
    });
}); });
handleElevated('get-report-data', 'VIEW_REPORTS', function (event, reportType, params) { return __awaiter(void 0, void 0, void 0, function () {
    var db, _a, startDate, endDate, days, sDate, eDate, rows, getTaxableValue_1, groups_1, data, invoices, getTaxableValue_2, total_cgst, total_sgst, total_igst, total_taxable, _loop_1, _i, invoices_1, inv, customers, calculateAging_1, buckets_1, total_receivable;
    var _b, _c, _d;
    return __generator(this, function (_e) {
        db = (0, core_1.getDB)();
        _a = params || {}, startDate = _a.startDate, endDate = _a.endDate, days = _a.days;
        sDate = startDate ? startDate + ' 00:00:00' : null;
        eDate = endDate ? endDate + ' 23:59:59' : null;
        if (reportType === 'Margin') {
            rows = (_b = db.prepare("\n      SELECT date(s.created_at) as date, p.category, p.brand_name, s.tier_applied,\n             si.line_total, p.gst_rate, si.unit_cost, si.quantity\n      FROM sale_items si JOIN sales s ON si.sale_id = s.sale_id JOIN products p ON si.product_id = p.product_id\n      WHERE s.status != 'CANCELLED' ".concat(sDate ? 'AND s.created_at >= ?' : '', " ").concat(eDate ? 'AND s.created_at <= ?' : '', "\n    "))).all.apply(_b, (sDate && eDate ? [sDate, eDate] : []));
            getTaxableValue_1 = require('@chauhan-erp/core/gst').getTaxableValue;
            groups_1 = {};
            rows.forEach(function (r) {
                var key = "".concat(r.date, "|").concat(r.category, "|").concat(r.brand_name, "|").concat(r.tier_applied);
                if (!groups_1[key])
                    groups_1[key] = { date: r.date, category: r.category, brand_name: r.brand_name, tier_applied: r.tier_applied, revenue: 0, cogs: 0, profit: 0 };
                var revenue = getTaxableValue_1(r.line_total, r.gst_rate);
                var cogs = r.unit_cost * r.quantity;
                groups_1[key].revenue += revenue;
                groups_1[key].cogs += cogs;
                groups_1[key].profit += (revenue - cogs);
            });
            return [2 /*return*/, Object.values(groups_1).sort(function (a, b) { return b.date.localeCompare(a.date); })];
        }
        if (reportType === 'Sales') {
            return [2 /*return*/, (_c = db.prepare("\n      SELECT date(s.created_at) as date, p.category, p.brand_name, s.tier_applied,\n             SUM(si.line_total) as total_revenue, SUM(si.quantity) as items_sold, COUNT(DISTINCT s.sale_id) as invoices_count\n      FROM sale_items si JOIN sales s ON si.sale_id = s.sale_id JOIN products p ON si.product_id = p.product_id\n      WHERE s.status != 'CANCELLED' ".concat(sDate ? 'AND s.created_at >= ?' : '', " ").concat(eDate ? 'AND s.created_at <= ?' : '', "\n      GROUP BY date, p.category, p.brand_name, s.tier_applied ORDER BY date DESC\n    "))).all.apply(_c, (sDate && eDate ? [sDate, eDate] : []))];
        }
        if (reportType === 'LowStock') {
            return [2 /*return*/, db.prepare("\n      SELECT p.product_id, p.sku_code, p.model_name, p.min_restock_level, s.name as supplier_name,\n             (SELECT COUNT(*) FROM product_instances pi WHERE pi.product_id = p.product_id AND pi.status = 'IN_STOCK') + p.loose_qty as in_stock_qty\n      FROM products p LEFT JOIN suppliers s ON p.supplier_id = s.supplier_id\n      WHERE ((SELECT COUNT(*) FROM product_instances pi WHERE pi.product_id = p.product_id AND pi.status = 'IN_STOCK') + p.loose_qty) <= p.min_restock_level\n      ORDER BY s.name, p.model_name\n    ").all()];
        }
        if (reportType === 'DeadStock') {
            return [2 /*return*/, db.prepare("\n      SELECT p.product_id, p.sku_code, p.model_name, MAX(s.created_at) as last_sale_date,\n             (SELECT COUNT(*) FROM product_instances pi WHERE pi.product_id = p.product_id AND pi.status = 'IN_STOCK') + p.loose_qty as in_stock_qty\n      FROM products p LEFT JOIN sale_items si ON p.product_id = si.product_id LEFT JOIN sales s ON si.sale_id = s.sale_id\n      GROUP BY p.product_id\n      HAVING (last_sale_date IS NULL OR last_sale_date <= datetime('now', ?)) AND in_stock_qty > 0\n      ORDER BY last_sale_date ASC\n    ").all("-".concat(days || 30, " days"))];
        }
        if (reportType === 'Valuation') {
            data = db.prepare("\n      SELECT (SELECT SUM(purchase_cost) FROM product_instances WHERE status = 'IN_STOCK') as serialized_value,\n             (SELECT SUM(loose_qty * purchase_cost) FROM products) as loose_value\n    ").get();
            data.total = (data.serialized_value || 0) + (data.loose_value || 0);
            return [2 /*return*/, data];
        }
        if (reportType === 'GSTR1') {
            invoices = (_d = db.prepare("\n      SELECT s.sale_id, s.invoice_no, s.created_at, c.gstin, c.name as customer_name, s.subtotal, s.discount, s.cgst, s.sgst, s.igst, s.grand_total\n      FROM sales s LEFT JOIN customers c ON s.customer_id = c.customer_id\n      WHERE s.status != 'CANCELLED' ".concat(sDate ? 'AND s.created_at >= ?' : '', " ").concat(eDate ? 'AND s.created_at <= ?' : '', "\n      ORDER BY s.created_at DESC\n    "))).all.apply(_d, (sDate && eDate ? [sDate, eDate] : []));
            getTaxableValue_2 = require('@chauhan-erp/core/gst').getTaxableValue;
            total_cgst = 0, total_sgst = 0, total_igst = 0, total_taxable = 0;
            _loop_1 = function (inv) {
                var items = db.prepare("SELECT si.line_total, p.gst_rate FROM sale_items si JOIN products p ON si.product_id = p.product_id WHERE si.sale_id = ?").all(inv.sale_id);
                var inv_taxable = 0;
                var rates = new Set();
                items.forEach(function (si) {
                    var ratio = (inv.subtotal - inv.discount) / inv.subtotal;
                    inv_taxable += getTaxableValue_2(si.line_total * ratio, si.gst_rate);
                    rates.add(si.gst_rate);
                });
                inv.taxable = inv_taxable;
                inv.gst_rates = Array.from(rates).join(',');
                total_taxable += inv_taxable;
                total_cgst += inv.cgst;
                total_sgst += inv.sgst;
                total_igst += inv.igst;
            };
            for (_i = 0, invoices_1 = invoices; _i < invoices_1.length; _i++) {
                inv = invoices_1[_i];
                _loop_1(inv);
            }
            return [2 /*return*/, { invoices: invoices, summary: { total_cgst: total_cgst, total_sgst: total_sgst, total_igst: total_igst, total_taxable: total_taxable } }];
        }
        if (reportType === 'Udhaar') {
            customers = db.prepare("SELECT customer_id, name, phone, current_balance, credit_limit, credit_due_date FROM customers WHERE current_balance > 0").all();
            calculateAging_1 = require('@chauhan-erp/core/ledger').calculateAging;
            buckets_1 = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0, total_overdue: 0 };
            customers.forEach(function (c) {
                var age = calculateAging_1(c, new Date());
                buckets_1['0-30'] += age['0-30'];
                buckets_1['31-60'] += age['31-60'];
                buckets_1['61-90'] += age['61-90'];
                buckets_1['90+'] += age['90+'];
                buckets_1['total_overdue'] += age.total_overdue;
            });
            total_receivable = customers.reduce(function (sum, c) { return sum + c.current_balance; }, 0);
            customers.sort(function (a, b) { return b.current_balance - a.current_balance; });
            return [2 /*return*/, { customers: customers, buckets: buckets_1, total_receivable: total_receivable }];
        }
        throw new Error('Unknown report type');
    });
}); });
// ================= M5 IPC HANDLERS =================
electron_1.ipcMain.handle('db-warranty-check', function (event, serial) { return __awaiter(void 0, void 0, void 0, function () {
    var db, instance, saleItem, now, warranty_valid, expires;
    return __generator(this, function (_a) {
        (0, core_2.assertCan)(activeDesktopSession === null || activeDesktopSession === void 0 ? void 0 : activeDesktopSession.role, 'READ_DASHBOARD');
        db = (0, core_1.getDB)();
        instance = db.prepare("\n    SELECT pi.*, p.brand_name, p.model_name, p.category \n    FROM product_instances pi\n    JOIN products p ON pi.product_id = p.product_id\n    WHERE pi.serial_number = ?\n  ").get(serial);
        if (!instance)
            return [2 /*return*/, { found: false }];
        saleItem = db.prepare("\n    SELECT si.*, s.invoice_no, s.created_at as sale_date, s.customer_id, c.name as customer_name, c.phone as customer_phone\n    FROM sale_items si\n    JOIN sales s ON si.sale_id = s.sale_id\n    LEFT JOIN customers c ON s.customer_id = c.customer_id\n    WHERE si.instance_id = ? AND s.status = 'COMPLETED'\n  ").get(instance.instance_id);
        now = new Date();
        warranty_valid = false;
        if (instance.warranty_expires_at) {
            expires = new Date(instance.warranty_expires_at);
            expires.setHours(23, 59, 59, 999);
            warranty_valid = now <= expires;
        }
        return [2 /*return*/, { found: true, instance: instance, sold_by_us: !!saleItem, sale: saleItem || null, warranty_valid: warranty_valid }];
    });
}); });
electron_1.ipcMain.handle('db-return-validate', function (event, serial) { return __awaiter(void 0, void 0, void 0, function () {
    var db, instance, saleItem;
    return __generator(this, function (_a) {
        (0, core_2.assertCan)(activeDesktopSession === null || activeDesktopSession === void 0 ? void 0 : activeDesktopSession.role, 'ISSUE_CN');
        db = (0, core_1.getDB)();
        instance = db.prepare('SELECT * FROM product_instances WHERE serial_number = ?').get(serial);
        if (!instance)
            return [2 /*return*/, { outcome: 'REJECT_UNKNOWN', message: 'Never part of our inventory.' }];
        if (instance.status === 'RMA_RETURNED')
            return [2 /*return*/, { outcome: 'REJECT_ALREADY_RETURNED', message: 'Already returned.' }];
        saleItem = db.prepare("\n    SELECT si.*, s.invoice_no, s.created_at as sale_date, s.customer_id, s.payment_mode, c.name as customer_name, c.phone as customer_phone\n    FROM sale_items si\n    JOIN sales s ON si.sale_id = s.sale_id\n    LEFT JOIN customers c ON s.customer_id = c.customer_id\n    WHERE si.instance_id = ? AND s.status = 'COMPLETED'\n  ").get(instance.instance_id);
        if (!saleItem)
            return [2 /*return*/, { outcome: 'REJECT_NEVER_SOLD', message: 'Never sold to a customer.' }];
        return [2 /*return*/, { outcome: 'ALLOW', saleItem: saleItem, instance: instance }];
    });
}); });
// Since the accept logic is identical, we can just hit the same transaction logic.
electron_1.ipcMain.handle('db-return-accept', function (event, payload) { return __awaiter(void 0, void 0, void 0, function () {
    var serial, reason, resolution, refund_amount, replacement_serial, user_id, condition_sealed, db, tx;
    return __generator(this, function (_a) {
        (0, core_2.assertCan)(activeDesktopSession === null || activeDesktopSession === void 0 ? void 0 : activeDesktopSession.role, 'ISSUE_CN');
        serial = payload.serial, reason = payload.reason, resolution = payload.resolution, refund_amount = payload.refund_amount, replacement_serial = payload.replacement_serial, user_id = payload.user_id, condition_sealed = payload.condition_sealed;
        db = (0, core_1.getDB)();
        tx = db.transaction(function () {
            var _a;
            var instance = db.prepare('SELECT * FROM product_instances WHERE serial_number = ?').get(serial);
            if (!instance || instance.status === 'RMA_RETURNED')
                throw new Error("Invalid or already returned serial.");
            var saleItem = db.prepare("\n      SELECT si.*, s.payment_mode, s.customer_id, s.sale_id\n      FROM sale_items si\n      JOIN sales s ON si.sale_id = s.sale_id\n      WHERE si.instance_id = ? AND s.status = 'COMPLETED'\n    ").get(instance.instance_id);
            if (!saleItem)
                throw new Error("Sale item not found.");
            if (refund_amount > saleItem.unit_price)
                throw new Error("Refund amount cannot exceed original unit price.");
            var newStatus = 'RMA_RETURNED';
            if (resolution === 'CREDIT_NOTE' && condition_sealed)
                newStatus = 'IN_STOCK';
            db.prepare('UPDATE product_instances SET status = ? WHERE instance_id = ?').run(newStatus, instance.instance_id);
            var creditNoteNo = null;
            var cnId = null;
            if (resolution === 'CREDIT_NOTE') {
                var prefixRow = db.prepare("SELECT value FROM settings WHERE key = 'cn_prefix'").get();
                var sequenceRow = db.prepare("SELECT value FROM settings WHERE key = 'next_cn_no'").get();
                var prefix = (prefixRow === null || prefixRow === void 0 ? void 0 : prefixRow.value) || 'CN-';
                var sequence = (sequenceRow === null || sequenceRow === void 0 ? void 0 : sequenceRow.value) || '1';
                creditNoteNo = "".concat(prefix).concat(sequence);
                db.prepare("\n        INSERT INTO credit_notes (cn_no, sale_id, instance_id, amount, reason)\n        VALUES (?, ?, ?, ?, ?)\n      ").run(creditNoteNo, saleItem.sale_id, instance.instance_id, refund_amount, reason);
                cnId = db.prepare('SELECT last_insert_rowid() as id').get().id;
                db.prepare("\n        INSERT OR REPLACE INTO settings (key, value) \n        VALUES ('next_cn_no', CAST((CAST(? AS INTEGER) + 1) AS TEXT))\n      ").run(sequence);
                if (saleItem.payment_mode === 'UDHAAR' && saleItem.customer_id) {
                    db.prepare('UPDATE customers SET current_balance = current_balance - ? WHERE customer_id = ?').run(refund_amount, saleItem.customer_id);
                    var cust = db.prepare('SELECT current_balance FROM customers WHERE customer_id = ?').get(saleItem.customer_id);
                    db.prepare("\n          INSERT INTO customer_ledger (customer_id, type, ref_id, amount, balance_after, note)\n          VALUES (?, 'RETURN', (SELECT cn_id FROM credit_notes WHERE cn_no = ?), ?, ?, ?)\n        ").run(saleItem.customer_id, creditNoteNo, refund_amount, cust.current_balance, "Credit Note ".concat(creditNoteNo));
                }
            }
            else if (resolution === 'REPLACEMENT') {
                if (!replacement_serial)
                    throw new Error("Replacement serial is required.");
                var repInstance = db.prepare("SELECT * FROM product_instances WHERE serial_number = ? AND status = 'IN_STOCK'").get(replacement_serial);
                if (!repInstance)
                    throw new Error("Replacement serial not found or not IN_STOCK.");
                var prodRow = db.prepare('SELECT warranty_months FROM products WHERE product_id = ?').get(instance.product_id);
                var warrantyMonths = (_a = prodRow === null || prodRow === void 0 ? void 0 : prodRow.warranty_months) !== null && _a !== void 0 ? _a : 12;
                db.prepare("\n        UPDATE product_instances SET status = 'SOLD', sold_at = datetime('now'), warranty_expires_at = datetime('now', '+' || ? || ' months')\n        WHERE instance_id = ?\n      ").run(warrantyMonths, repInstance.instance_id);
                db.prepare("\n        INSERT INTO sale_items (sale_id, product_id, instance_id, quantity, unit_price, line_discount, line_total)\n        VALUES (?, ?, ?, 1, 0, 0, 0)\n      ").run(saleItem.sale_id, repInstance.product_id, repInstance.instance_id);
            }
            else if (resolution === 'SEND_TO_COMPANY') {
                db.prepare("\n        INSERT INTO rma_register (instance_id, reason, status)\n        VALUES (?, ?, 'SENT')\n      ").run(instance.instance_id, reason);
            }
            db.prepare("\n      INSERT INTO audit_log (user_id, action, entity, entity_id, detail)\n      VALUES (?, 'RETURN_ACCEPT', 'product_instances', ?, ?)\n    ").run(activeDesktopSession === null || activeDesktopSession === void 0 ? void 0 : activeDesktopSession.user_id, instance.instance_id, "Resolution: ".concat(resolution, ", Refund: ").concat(refund_amount, ", Reason: ").concat(reason));
            return { success: true, creditNoteNo: creditNoteNo, cnId: cnId, newStatus: newStatus };
        });
        return [2 /*return*/, tx()];
    });
}); });
electron_1.ipcMain.handle('db-rma-list', function () { return __awaiter(void 0, void 0, void 0, function () {
    var db;
    return __generator(this, function (_a) {
        (0, core_2.assertCan)(activeDesktopSession === null || activeDesktopSession === void 0 ? void 0 : activeDesktopSession.role, 'READ_CATALOGUE');
        db = (0, core_1.getDB)();
        return [2 /*return*/, db.prepare("\n    SELECT r.*, pi.serial_number, p.brand_name, p.model_name, s.name as supplier_name\n    FROM rma_register r\n    JOIN product_instances pi ON r.instance_id = pi.instance_id\n    JOIN products p ON pi.product_id = p.product_id\n    LEFT JOIN suppliers s ON r.supplier_id = s.supplier_id\n    ORDER BY r.sent_at DESC\n  ").all()];
    });
}); });
handleElevated('db-rma-resolve', 'EDIT_CATALOGUE', function (event, rma_id, status, note) { return __awaiter(void 0, void 0, void 0, function () {
    var db, tx;
    return __generator(this, function (_a) {
        db = (0, core_1.getDB)();
        tx = db.transaction(function () {
            db.prepare("UPDATE rma_register SET status = ?, resolved_at = datetime('now'), note = ? WHERE rma_id = ?").run(status, note || null, rma_id);
            if (status === 'RECEIVED_BACK') {
                var rma = db.prepare("SELECT instance_id FROM rma_register WHERE rma_id = ?").get(rma_id);
                db.prepare("UPDATE product_instances SET status = 'IN_STOCK' WHERE instance_id = ?").run(rma.instance_id);
            }
            return true;
        });
        return [2 /*return*/, tx()];
    });
}); });
// ================= M6 (C2) PRINTING HANDLERS =================
electron_1.ipcMain.handle('get-print-data', function (event, kind, id) { return __awaiter(void 0, void 0, void 0, function () {
    var db, settingsRows, settings, sale, items, cn, instance, job, items;
    return __generator(this, function (_a) {
        (0, core_2.assertCan)(activeDesktopSession === null || activeDesktopSession === void 0 ? void 0 : activeDesktopSession.role, 'READ_DASHBOARD');
        db = (0, core_1.getDB)();
        settingsRows = db.prepare("SELECT key, value FROM settings").all();
        settings = {};
        settingsRows.forEach(function (r) { return settings[r.key] = r.value; });
        if (kind === 'SALE') {
            sale = db.prepare("\n      SELECT s.*, c.name as customer_name, c.gstin as customer_gstin, c.phone as customer_phone, c.shop_name as customer_shop_name \n      FROM sales s LEFT JOIN customers c ON s.customer_id = c.customer_id\n      WHERE s.sale_id = ?\n    ").get(id);
            items = db.prepare("\n      SELECT si.*, p.model_name, p.hsn_code, p.gst_rate, pi.serial_number\n      FROM sale_items si\n      JOIN products p ON si.product_id = p.product_id\n      LEFT JOIN product_instances pi ON si.instance_id = pi.instance_id\n      WHERE si.sale_id = ?\n    ").all(id);
            return [2 /*return*/, { settings: settings, sale: sale, items: items }];
        }
        else if (kind === 'CREDIT_NOTE') {
            cn = db.prepare("\n      SELECT cn.*, s.invoice_no, s.created_at as sale_date,\n      c.name as customer_name, c.gstin as customer_gstin\n      FROM credit_notes cn\n      JOIN sales s ON cn.sale_id = s.sale_id\n      LEFT JOIN customers c ON s.customer_id = c.customer_id\n      WHERE cn.cn_id = ?\n    ").get(id);
            instance = db.prepare("\n      SELECT pi.*, p.model_name, p.hsn_code\n      FROM product_instances pi\n      JOIN products p ON pi.product_id = p.product_id\n      WHERE pi.instance_id = ?\n    ").get(cn.instance_id);
            return [2 /*return*/, { settings: settings, cn: cn, instance: instance }];
        }
        else if (kind === 'REPAIR') {
            job = db.prepare("\n      SELECT rj.*, c.gstin as customer_gstin, c.shop_name as customer_shop_name\n      FROM repair_jobs rj\n      LEFT JOIN customers c ON rj.customer_id = c.customer_id\n      WHERE rj.job_id = ?\n    ").get(id);
            items = db.prepare("\n      SELECT rp.*, p.model_name, p.hsn_code, p.gst_rate\n      FROM repair_parts rp\n      JOIN products p ON rp.product_id = p.product_id\n      WHERE rp.job_id = ?\n    ").all(id);
            return [2 /*return*/, { settings: settings, job: job, items: items }];
        }
        return [2 /*return*/, null];
    });
}); });
electron_1.ipcMain.handle('print-thermal', function (event, textContent) { return __awaiter(void 0, void 0, void 0, function () {
    var db, printerTypeSet, printerInterfaceSet, printerWidthSet, pType, pInterface, pWidth, printer, isConnected, err_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                (0, core_2.assertCan)(activeDesktopSession === null || activeDesktopSession === void 0 ? void 0 : activeDesktopSession.role, 'READ_DASHBOARD');
                _a.label = 1;
            case 1:
                _a.trys.push([1, 4, , 5]);
                db = (0, core_1.getDB)();
                printerTypeSet = db.prepare("SELECT value FROM settings WHERE key = 'printer_type'").get();
                printerInterfaceSet = db.prepare("SELECT value FROM settings WHERE key = 'printer_interface'").get();
                printerWidthSet = db.prepare("SELECT value FROM settings WHERE key = 'printer_width'").get();
                pType = (printerTypeSet === null || printerTypeSet === void 0 ? void 0 : printerTypeSet.value) || '';
                pInterface = (printerInterfaceSet === null || printerInterfaceSet === void 0 ? void 0 : printerInterfaceSet.value) || '';
                pWidth = parseInt((printerWidthSet === null || printerWidthSet === void 0 ? void 0 : printerWidthSet.value) || '80', 10);
                if (!pType || !pInterface) {
                    console.log("No thermal printer configured, falling back to A4 PDF");
                    return [2 /*return*/, { success: false, fallback: true }];
                }
                printer = new node_thermal_printer_1.ThermalPrinter({
                    type: pType.toLowerCase() === 'star' ? node_thermal_printer_1.PrinterTypes.STAR : node_thermal_printer_1.PrinterTypes.EPSON,
                    interface: pInterface,
                    characterSet: node_thermal_printer_1.CharacterSet.PC852_LATIN2,
                    removeSpecialCharacters: false,
                    lineCharacter: "=",
                    width: pWidth === 58 ? 32 : 48,
                    breakLine: node_thermal_printer_1.BreakLine.WORD
                });
                printer.alignCenter();
                printer.println(textContent);
                printer.cut();
                return [4 /*yield*/, printer.isPrinterConnected()];
            case 2:
                isConnected = _a.sent();
                if (!isConnected) {
                    console.log("Printer not connected");
                    return [2 /*return*/, { success: false, fallback: true }];
                }
                return [4 /*yield*/, printer.execute()];
            case 3:
                _a.sent();
                return [2 /*return*/, { success: true }];
            case 4:
                err_2 = _a.sent();
                console.error("Thermal Print Error:", err_2);
                return [2 /*return*/, { success: false, fallback: true }];
            case 5: return [2 /*return*/];
        }
    });
}); });
electron_1.ipcMain.handle('log-reprint', function (event, kind, id, userId) { return __awaiter(void 0, void 0, void 0, function () {
    var db;
    return __generator(this, function (_a) {
        (0, core_2.assertCan)(activeDesktopSession === null || activeDesktopSession === void 0 ? void 0 : activeDesktopSession.role, 'READ_DASHBOARD');
        db = (0, core_1.getDB)();
        db.prepare("\n    INSERT INTO audit_log (user_id, action, entity, entity_id, detail)\n    VALUES (?, 'REPRINT', ?, ?, ?)\n  ").run(activeDesktopSession === null || activeDesktopSession === void 0 ? void 0 : activeDesktopSession.user_id, kind === 'SALE' ? 'sales' : 'credit_notes', id, 'Reprinted document');
        return [2 /*return*/, true];
    });
}); });
// ================= M7 (C3) SMS OUTBOX HANDLERS =================
// Helper to enqueue SMS/WhatsApp message
function enqueueSms(phone, templateKey, vars, channel) {
    if (channel === void 0) { channel = 'SMS'; }
    try {
        var db = (0, core_1.getDB)();
        var settingsRows = db.prepare("SELECT key, value FROM settings").all();
        var settings_1 = {};
        settingsRows.forEach(function (r) { return settings_1[r.key] = r.value; });
        if (settings_1['sms_enabled'] !== 'true')
            return false;
        var body = settings_1[templateKey] || '';
        if (!body) {
            // Provide fallbacks
            if (templateKey === 'sms_tpl_repair_update')
                body = 'Job {job_no}: your {product} is {status}.';
            if (templateKey === 'sms_tpl_payment')
                body = 'Received Rs {amount} against Inv {invoice_no}. Thank you!';
            if (templateKey === 'sms_tpl_reminder')
                body = 'Reminder: Udhaar balance of Rs {balance} is overdue.';
        }
        // Replace variables
        for (var _i = 0, _a = Object.entries(vars); _i < _a.length; _i++) {
            var _b = _a[_i], k = _b[0], v = _b[1];
            body = body.replace(new RegExp('{' + k + '}', 'g'), v);
        }
        db.prepare("INSERT INTO sms_outbox (phone, body, channel) VALUES (?, ?, ?)").run(phone, body, channel);
        return true;
    }
    catch (err) {
        console.error("SMS Queue Error:", err);
        return false;
    }
}
electron_1.ipcMain.handle('enqueue-sms', function (event, phone, templateKey, vars) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        (0, core_2.assertCan)(activeDesktopSession === null || activeDesktopSession === void 0 ? void 0 : activeDesktopSession.role, 'READ_DASHBOARD');
        return [2 /*return*/, { success: enqueueSms(phone, templateKey, vars) }];
    });
}); });
electron_1.ipcMain.handle('send-udhaar-reminder', function (event, customer_id) { return __awaiter(void 0, void 0, void 0, function () {
    var db, cust, balance, queued;
    return __generator(this, function (_a) {
        (0, core_2.assertCan)(activeDesktopSession === null || activeDesktopSession === void 0 ? void 0 : activeDesktopSession.role, 'READ_DASHBOARD');
        db = (0, core_1.getDB)();
        cust = db.prepare("SELECT * FROM customers WHERE customer_id = ?").get(customer_id);
        if (!cust || !cust.phone || cust.phone === '0000000000')
            return [2 /*return*/, { success: false, error: 'Invalid phone' }];
        balance = (cust.current_balance / 100).toFixed(2);
        queued = enqueueSms(cust.phone, 'sms_tpl_reminder', { balance: balance });
        return [2 /*return*/, { success: queued }];
    });
}); });
electron_1.ipcMain.handle('get-sms-outbox', function () { return __awaiter(void 0, void 0, void 0, function () {
    var db;
    return __generator(this, function (_a) {
        (0, core_2.assertCan)(activeDesktopSession === null || activeDesktopSession === void 0 ? void 0 : activeDesktopSession.role, 'READ_DASHBOARD');
        db = (0, core_1.getDB)();
        return [2 /*return*/, db.prepare("SELECT * FROM sms_outbox ORDER BY id DESC LIMIT 100").all()];
    });
}); });
electron_1.ipcMain.handle('retry-sms', function (event, id) { return __awaiter(void 0, void 0, void 0, function () {
    var db;
    return __generator(this, function (_a) {
        (0, core_2.assertCan)(activeDesktopSession === null || activeDesktopSession === void 0 ? void 0 : activeDesktopSession.role, 'READ_DASHBOARD');
        db = (0, core_1.getDB)();
        db.prepare("UPDATE sms_outbox SET status = 'QUEUED', retry_count = 0 WHERE id = ?").run(id);
        return [2 /*return*/, { success: true }];
    });
}); });
// ================= X1: UPI QR + WHATSAPP SHARE IPC =================
// Generate UPI QR code as data URL (100% offline, no network)
electron_1.ipcMain.handle('generate-upi-qr', function (event, amountPaise, invoiceNo) { return __awaiter(void 0, void 0, void 0, function () {
    var db, settingsRows, settings_2, vpa, shopName, amountRupees, upiUri, qrDataUrl, err_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                (0, core_2.assertCan)(activeDesktopSession === null || activeDesktopSession === void 0 ? void 0 : activeDesktopSession.role, 'CHECKOUT');
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                db = (0, core_1.getDB)();
                settingsRows = db.prepare("SELECT key, value FROM settings").all();
                settings_2 = {};
                settingsRows.forEach(function (r) { return settings_2[r.key] = r.value; });
                vpa = settings_2['upi_vpa'];
                if (!vpa)
                    return [2 /*return*/, { success: false, error: 'UPI VPA not configured in Settings' }];
                shopName = (settings_2['shop_name'] || 'Shop').replace(/[^a-zA-Z0-9 ]/g, '');
                amountRupees = (amountPaise / 100).toFixed(2);
                upiUri = "upi://pay?pa=".concat(encodeURIComponent(vpa), "&pn=").concat(encodeURIComponent(shopName), "&am=").concat(amountRupees, "&tn=").concat(encodeURIComponent(invoiceNo), "&cu=INR");
                return [4 /*yield*/, qrcode_1.default.toDataURL(upiUri, { width: 200, margin: 1, errorCorrectionLevel: 'M' })];
            case 2:
                qrDataUrl = _a.sent();
                return [2 /*return*/, { success: true, qrDataUrl: qrDataUrl, upiUri: upiUri }];
            case 3:
                err_3 = _a.sent();
                console.error('UPI QR generation error:', err_3);
                return [2 /*return*/, { success: false, error: err_3.message }];
            case 4: return [2 /*return*/];
        }
    });
}); });
// Build WhatsApp share deep-link (no API needed, just opens wa.me)
electron_1.ipcMain.handle('build-whatsapp-link', function (event, phone, message) { return __awaiter(void 0, void 0, void 0, function () {
    var normalized, url;
    return __generator(this, function (_a) {
        (0, core_2.assertCan)(activeDesktopSession === null || activeDesktopSession === void 0 ? void 0 : activeDesktopSession.role, 'READ_DASHBOARD');
        try {
            normalized = phone.replace(/[\s\-+]/g, '');
            if (normalized.startsWith('0'))
                normalized = normalized.substring(1);
            if (!normalized.startsWith('91') && normalized.length === 10)
                normalized = '91' + normalized;
            url = "https://wa.me/".concat(normalized, "?text=").concat(encodeURIComponent(message));
            return [2 /*return*/, { success: true, url: url }];
        }
        catch (err) {
            return [2 /*return*/, { success: false, error: err.message }];
        }
        return [2 /*return*/];
    });
}); });
// Build invoice share message for WhatsApp
electron_1.ipcMain.handle('build-invoice-message', function (event, saleId) { return __awaiter(void 0, void 0, void 0, function () {
    var db, sale, settingsRows, settings_3, items, shopName, grandTotal, amountPaid, msg_1;
    return __generator(this, function (_a) {
        (0, core_2.assertCan)(activeDesktopSession === null || activeDesktopSession === void 0 ? void 0 : activeDesktopSession.role, 'READ_DASHBOARD');
        try {
            db = (0, core_1.getDB)();
            sale = db.prepare('SELECT * FROM sales WHERE sale_id = ?').get(saleId);
            if (!sale)
                return [2 /*return*/, { success: false, error: 'Sale not found' }];
            settingsRows = db.prepare("SELECT key, value FROM settings").all();
            settings_3 = {};
            settingsRows.forEach(function (r) { return settings_3[r.key] = r.value; });
            items = db.prepare("\n      SELECT si.*, p.brand_name, p.model_name \n      FROM sale_items si \n      JOIN products p ON si.product_id = p.product_id \n      WHERE si.sale_id = ?\n    ").all(saleId);
            shopName = settings_3['shop_name'] || 'Chauhan Electronics';
            grandTotal = (sale.grand_total / 100).toFixed(2);
            amountPaid = (sale.amount_paid / 100).toFixed(2);
            msg_1 = "\uD83E\uDDFE *".concat(shopName, "*\n");
            msg_1 += "Invoice: *".concat(sale.invoice_no, "*\n");
            msg_1 += "Date: ".concat(sale.created_at, "\n\n");
            msg_1 += "*Items:*\n";
            items.forEach(function (item, idx) {
                msg_1 += "".concat(idx + 1, ". ").concat(item.brand_name, " ").concat(item.model_name, " \u00D7 ").concat(item.quantity, " \u2014 \u20B9").concat((item.line_total / 100).toFixed(2), "\n");
            });
            msg_1 += "\n*Grand Total: \u20B9".concat(grandTotal, "*\n");
            msg_1 += "Paid: \u20B9".concat(amountPaid, " (").concat(sale.payment_mode, ")\n");
            if (sale.grand_total > sale.amount_paid) {
                msg_1 += "\u26A0\uFE0F *Balance Due: \u20B9".concat(((sale.grand_total - sale.amount_paid) / 100).toFixed(2), "*\n");
            }
            msg_1 += "\nThank you for shopping with us! \uD83D\uDE4F";
            return [2 /*return*/, { success: true, message: msg_1 }];
        }
        catch (err) {
            return [2 /*return*/, { success: false, error: err.message }];
        }
        return [2 /*return*/];
    });
}); });
// Build repair status message for WhatsApp
electron_1.ipcMain.handle('build-repair-message', function (event, jobId) { return __awaiter(void 0, void 0, void 0, function () {
    var db, job, settingsRows, settings_4, shopName, msg;
    return __generator(this, function (_a) {
        (0, core_2.assertCan)(activeDesktopSession === null || activeDesktopSession === void 0 ? void 0 : activeDesktopSession.role, 'READ_DASHBOARD');
        try {
            db = (0, core_1.getDB)();
            job = db.prepare('SELECT * FROM repair_jobs WHERE job_id = ?').get(jobId);
            if (!job)
                return [2 /*return*/, { success: false, error: 'Job not found' }];
            settingsRows = db.prepare("SELECT key, value FROM settings").all();
            settings_4 = {};
            settingsRows.forEach(function (r) { return settings_4[r.key] = r.value; });
            shopName = settings_4['shop_name'] || 'Chauhan Electronics';
            msg = "\uD83D\uDD27 *".concat(shopName, " \u2014 Repair Update*\n\n");
            msg += "Job No: *".concat(job.job_no, "*\n");
            msg += "Device: ".concat(job.product_name || 'N/A', "\n");
            msg += "Status: *".concat(job.status, "*\n");
            if (job.est_cost)
                msg += "Est. Cost: \u20B9".concat((job.est_cost / 100).toFixed(2), "\n");
            if (job.status === 'READY')
                msg += "\n\u2705 Your device is ready for pickup!\n";
            msg += "\nContact us for any queries. \uD83D\uDE4F";
            return [2 /*return*/, { success: true, message: msg, phone: job.customer_phone }];
        }
        catch (err) {
            return [2 /*return*/, { success: false, error: err.message }];
        }
        return [2 /*return*/];
    });
}); });
// ================= SMS/WHATSAPP GATEWAY ADAPTER =================
// Pluggable gateway interface — reads config from settings table
// Supported adapters: 'MOCK' (default), 'MSG91', 'GUPSHUP'
function sendViaGateway(msg) {
    return __awaiter(this, void 0, void 0, function () {
        var db, settingsRows, settings, channel, gateway, apiKey, senderId, url;
        return __generator(this, function (_a) {
            db = (0, core_1.getDB)();
            settingsRows = db.prepare("SELECT key, value FROM settings").all();
            settings = {};
            settingsRows.forEach(function (r) { return settings[r.key] = r.value; });
            channel = msg.channel || 'SMS';
            if (channel === 'WHATSAPP') {
                // WhatsApp Business Cloud API (optional, OFF by default)
                if (settings['whatsapp_api_enabled'] !== 'true' || !settings['whatsapp_api_key']) {
                    // No API configured — message stays queued; user uses manual wa.me share
                    console.log("[WA WORKER] No API key \u2014 skip auto-send for msg #".concat(msg.id));
                    return [2 /*return*/, false];
                }
                // TODO: Wire real WhatsApp Business Cloud API here when credentials available
                console.log("[WA WORKER] Would send via WhatsApp API to ".concat(msg.phone, ": ").concat(msg.body.substring(0, 50), "..."));
                return [2 /*return*/, true]; // Mock success
            }
            gateway = settings['sms_gateway'] || 'MOCK';
            apiKey = settings['sms_gateway_key'] || '';
            senderId = settings['sms_sender_id'] || 'CHAUHAN';
            if (gateway === 'MOCK') {
                console.log("[SMS WORKER] MOCK send to ".concat(msg.phone, ": ").concat(msg.body.substring(0, 50), "..."));
                return [2 /*return*/, true];
            }
            if (gateway === 'MSG91' && apiKey) {
                try {
                    url = "https://api.msg91.com/api/v5/flow/";
                    console.log("[SMS WORKER] MSG91 send to ".concat(msg.phone, " (key: ").concat(apiKey.substring(0, 6), "...)"));
                    // Real HTTP call would go here with fetch/axios
                    // For now, treat as success in dev
                    return [2 /*return*/, true];
                }
                catch (e) {
                    console.error('[SMS WORKER] MSG91 error:', e);
                    return [2 /*return*/, false];
                }
            }
            if (gateway === 'GUPSHUP' && apiKey) {
                try {
                    console.log("[SMS WORKER] GUPSHUP send to ".concat(msg.phone, " (key: ").concat(apiKey.substring(0, 6), "...)"));
                    return [2 /*return*/, true];
                }
                catch (e) {
                    console.error('[SMS WORKER] GUPSHUP error:', e);
                    return [2 /*return*/, false];
                }
            }
            // Fallback: no gateway configured
            console.log("[SMS WORKER] No gateway configured \u2014 queued msg #".concat(msg.id, " stays pending."));
            return [2 /*return*/, false];
        });
    });
}
// Background Worker for SMS/WhatsApp queue flush
setInterval(function () {
    try {
        var db_1 = (0, core_1.getDB)();
        // Migration: add retry_count if missing
        try {
            db_1.prepare("ALTER TABLE sms_outbox ADD COLUMN retry_count INTEGER DEFAULT 0").run();
        }
        catch (e) { } // Ignore if exists
        var pending = db_1.prepare("SELECT * FROM sms_outbox WHERE status = 'QUEUED' LIMIT 10").all();
        var _loop_2 = function (msg) {
            sendViaGateway(msg).then(function (success) {
                try {
                    if (success) {
                        db_1.prepare("UPDATE sms_outbox SET status = 'SENT', sent_at = datetime('now') WHERE id = ?").run(msg.id);
                    }
                    else {
                        var newRetry = (msg.retry_count || 0) + 1;
                        var status_1 = newRetry > 5 ? 'FAILED' : 'QUEUED';
                        db_1.prepare("UPDATE sms_outbox SET status = ?, retry_count = ? WHERE id = ?").run(status_1, newRetry, msg.id);
                    }
                }
                catch (dbErr) {
                    console.error('[SMS WORKER] DB update error:', dbErr);
                }
            }).catch(function () {
                var newRetry = (msg.retry_count || 0) + 1;
                var status = newRetry > 5 ? 'FAILED' : 'QUEUED';
                db_1.prepare("UPDATE sms_outbox SET status = ?, retry_count = ? WHERE id = ?").run(status, newRetry, msg.id);
            });
        };
        for (var _i = 0, pending_1 = pending; _i < pending_1.length; _i++) {
            var msg = pending_1[_i];
            _loop_2(msg);
        }
    }
    catch (err) {
        // silently fail
    }
}, 30000); // 30 seconds
var mainWindow = null;
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1280,
        height: 800,
        title: 'Chauhan Electronics ERP',
        backgroundColor: '#09090b', // zinc-950
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });
    // Load from Vite dev server in development
    if (electron_1.app.isPackaged) {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
    else {
        mainWindow.loadURL('http://127.0.0.1:5180');
        // Open devtools in dev mode
        mainWindow.webContents.openDevTools();
    }
    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}
electron_1.app.on('ready', function () {
    createWindow();
    startExpressServer();
});
electron_1.app.on('window-all-closed', function () {
    // Perform auto-backup on close if configured
    if (activeConfig.backupDir) {
        try {
            console.log('Performing auto-backup on window close...');
            performBackup(activeConfig.backupDir);
            console.log('Auto-backup complete.');
        }
        catch (e) {
            console.error('Auto-backup failed on exit', e);
        }
    }
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
electron_1.app.on('activate', function () {
    if (mainWindow === null) {
        createWindow();
    }
});
