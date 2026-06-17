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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApiServer = createApiServer;
var express_1 = __importDefault(require("express"));
var cors_1 = __importDefault(require("cors"));
var os_1 = __importDefault(require("os"));
var fs = __importStar(require("fs"));
var core_1 = require("../../../packages/core");
function createApiServer(options) {
    var _this = this;
    var getDB = options.getDB, sessionStore = options.sessionStore, isPackaged = options.isPackaged, mainWindow = options.mainWindow, activeConfig = options.activeConfig, configPath = options.configPath, initDB = options.initDB, schemaSql = options.schemaSql;
    var app = (0, express_1.default)();
    app.use((0, cors_1.default)());
    app.use(express_1.default.json());
    // Authentication middleware
    function authMiddleware(req, res, next) {
        var openPaths = ['/api/ping', '/api/health', '/api/auth/login'];
        if (openPaths.includes(req.path))
            return next();
        var authHeader = req.headers['authorization'];
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, error: 'Missing or invalid Authorization header' });
        }
        var token = authHeader.substring('Bearer '.length).trim();
        var session = sessionStore.get(token);
        if (!session) {
            return res.status(401).json({ success: false, error: 'Invalid or expired token' });
        }
        req.session = session;
        next();
    }
    function requireRole(action) {
        return function (req, res, next) {
            var _a;
            var role = (_a = req.session) === null || _a === void 0 ? void 0 : _a.role;
            if (!(0, core_1.authorize)(role, action)) {
                return res.status(403).json({ success: false, error: "Forbidden: Role ".concat(role, " cannot perform ").concat(action) });
            }
            next();
        };
    }
    app.use(authMiddleware);
    app.get('/api/ping', function (req, res) {
        res.json({ status: 'ok', server: 'Chauhan ERP Desktop' });
    });
    app.get('/api/health', function (req, res) {
        res.json({ status: 'ok', shopName: 'Chauhan Electronics', online: true });
    });
    app.post('/api/auth/login', function (req, res) {
        var pin = req.body.pin;
        try {
            var db = getDB();
            var users = db.prepare('SELECT * FROM users WHERE active = 1').all();
            var bcrypt_1 = require('bcryptjs');
            var crypto_1 = require('crypto');
            var matchedUser = users.find(function (u) { return bcrypt_1.compareSync(pin, u.pin_hash); });
            if (matchedUser) {
                var token = crypto_1.randomBytes(32).toString('hex');
                sessionStore.set(token, { user_id: matchedUser.user_id, role: matchedUser.role, issuedAt: Date.now() });
                res.json({
                    success: true,
                    token: token,
                    user: {
                        user_id: matchedUser.user_id,
                        name: matchedUser.name,
                        role: matchedUser.role
                    }
                });
            }
            else {
                res.status(401).json({ success: false, error: 'Invalid PIN' });
            }
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    });
    app.get('/api/products/:sku', requireRole('READ_CATALOGUE'), function (req, res) {
        try {
            var db = getDB();
            var sku = req.params.sku;
            var product = db.prepare('SELECT * FROM products WHERE sku_code = ?').get(sku);
            if (product) {
                var stock = 0;
                if (product.requires_serial) {
                    var row = db.prepare("SELECT COUNT(*) as count FROM product_instances WHERE product_id = ? AND status = 'IN_STOCK'").get(product.product_id);
                    stock = row.count;
                }
                else {
                    stock = product.loose_qty || 0;
                }
                res.json({ success: true, product: product, stock: stock });
            }
            else {
                res.status(404).json({ success: false, error: 'Product not found' });
            }
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    });
    app.post('/api/cart/push', requireRole('CHECKOUT'), function (req, res) {
        try {
            var cart = req.body.cart;
            if (!cart || !Array.isArray(cart)) {
                return res.status(400).json({ success: false, error: 'Invalid cart payload' });
            }
            if (mainWindow) {
                mainWindow.webContents.send('mobile-cart-received', cart);
                res.json({ success: true, message: 'Cart beamed to Desktop POS' });
            }
            else {
                res.status(500).json({ success: false, error: 'Desktop UI not active' });
            }
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    });
    app.get('/api/products/lookup/:sku', requireRole('READ_CATALOGUE'), function (req, res) {
        var sku = req.params.sku;
        try {
            var db = getDB();
            var product = db.prepare('SELECT * FROM products WHERE sku_code = ?').get(sku);
            if (product) {
                var tags = db.prepare('SELECT vehicle_tag FROM product_fitment WHERE product_id = ?')
                    .all(product.product_id)
                    .map(function (row) { return row.vehicle_tag; });
                res.json({ found: true, product: __assign(__assign({}, product), { fitment_tags: tags }) });
            }
            else {
                res.json({ found: false });
            }
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    });
    app.get('/api/customers/lookup/:phone', requireRole('READ_CUSTOMERS'), function (req, res) {
        var phone = req.params.phone;
        try {
            var db = getDB();
            var customer = db.prepare('SELECT * FROM customers WHERE phone = ?').get(phone);
            if (customer) {
                res.json({ found: true, customer: customer });
            }
            else {
                res.json({ found: false });
            }
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    });
    app.post('/api/customers', requireRole('READ_CUSTOMERS'), function (req, res) {
        var _a = req.body, name = _a.name, phone = _a.phone, shop_name = _a.shop_name, tier = _a.tier, gstin = _a.gstin, credit_limit = _a.credit_limit;
        if (!name || !phone) {
            return res.status(400).json({ success: false, error: 'Name and Phone are required.' });
        }
        try {
            var db = getDB();
            var result = db.prepare("INSERT INTO customers (name, phone, shop_name, tier, gstin, credit_limit, current_balance)\n         VALUES (?, ?, ?, ?, ?, ?, 0)").run(name, phone, shop_name || null, tier || 'COUNTER', gstin || null, credit_limit || 0);
            var newCustomer = db.prepare('SELECT * FROM customers WHERE customer_id = ?').get(result.lastInsertRowid);
            res.json({ success: true, customer: newCustomer });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    });
    app.get('/api/customers/:id/ledger', requireRole('READ_CUSTOMERS'), function (req, res) {
        var customerId = req.params.id;
        try {
            var db = getDB();
            var customer = db.prepare('SELECT * FROM customers WHERE customer_id = ?').get(customerId);
            if (!customer) {
                return res.status(404).json({ success: false, error: 'Customer not found' });
            }
            var ledger = db.prepare('SELECT * FROM customer_ledger WHERE customer_id = ? ORDER BY created_at DESC').all(customerId);
            res.json({ success: true, customer: customer, ledger: ledger });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    });
    app.post('/api/customers/:id/payment', requireRole('RECORD_PAYMENT'), function (req, res) {
        var customerId = req.params.id;
        var _a = req.body, amount = _a.amount, note = _a.note;
        var userId = req.session.user_id;
        if (!amount || isNaN(amount) || amount <= 0) {
            return res.status(400).json({ success: false, error: 'Valid payment amount required' });
        }
        try {
            var db_1 = getDB();
            var tx = db_1.transaction(function () {
                db_1.prepare("UPDATE customers SET current_balance = current_balance - ? WHERE customer_id = ?").run(amount, customerId);
                var newCustomer = db_1.prepare('SELECT current_balance FROM customers WHERE customer_id = ?').get(customerId);
                db_1.prepare("INSERT INTO customer_ledger (customer_id, type, amount, balance_after, note)\n           VALUES (?, 'PAYMENT', ?, ?, ?)").run(customerId, amount, newCustomer.current_balance, note || 'Payment received');
                db_1.prepare("INSERT INTO audit_log (user_id, action, entity, entity_id, detail) VALUES (?, 'RECORD_PAYMENT', 'customer_ledger', ?, ?)").run(userId, customerId, "Payment amount: ".concat(amount));
                return newCustomer.current_balance;
            });
            var newBalance = tx();
            res.json({ success: true, newBalance: newBalance });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    });
    app.get('/api/sales/invoice/:invoice_no', requireRole('READ_DASHBOARD'), function (req, res) {
        var invoice_no = decodeURIComponent(req.params.invoice_no);
        try {
            var db = getDB();
            var sale = db.prepare('SELECT * FROM sales WHERE invoice_no = ?').get(invoice_no);
            if (sale) {
                var items = db.prepare("SELECT si.*, p.brand_name, p.model_name, p.hsn_code, p.gst_rate, pi.serial_number\n           FROM sale_items si\n           JOIN products p ON si.product_id = p.product_id\n           LEFT JOIN product_instances pi ON si.instance_id = pi.instance_id\n           WHERE si.sale_id = ?").all(sale.sale_id);
                var customer = db.prepare('SELECT * FROM customers WHERE customer_id = ?').get(sale.customer_id);
                res.json({ found: true, sale: sale, items: items, customer: customer });
            }
            else {
                res.json({ found: false });
            }
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    });
    app.post('/api/sales/checkout', requireRole('CHECKOUT'), function (req, res) {
        var _a = req.body, customer_id = _a.customer_id, tier_applied = _a.tier_applied, cart = _a.cart, discount = _a.discount, payment_mode = _a.payment_mode, amount_paid = _a.amount_paid;
        var userId = req.session.user_id;
        if (!cart || cart.length === 0) {
            return res.status(400).json({ success: false, error: 'Cart is empty.' });
        }
        try {
            var db_2 = getDB();
            var customer_1 = db_2.prepare('SELECT * FROM customers WHERE customer_id = ?').get(customer_id || 1);
            if (!customer_1)
                return res.status(400).json({ success: false, error: 'Customer not found.' });
            var subtotal_1 = 0;
            cart.forEach(function (item) {
                subtotal_1 += (item.price - item.discount) * item.quantity;
            });
            var discountVal_1 = discount || 0;
            var grandTotal_1 = Math.max(0, subtotal_1 - discountVal_1);
            if (payment_mode === 'UDHAAR') {
                if (customer_1.phone === '0000000000')
                    return res.status(400).json({ success: false, error: 'Cannot sell on credit (Udhaar) to Counter Customer.' });
                if (customer_1.credit_due_date && new Date(customer_1.credit_due_date) < new Date() && customer_1.current_balance > 0)
                    return res.status(400).json({ success: false, error: "Customer has an overdue balance since ".concat(customer_1.credit_due_date, ".") });
                var debt = grandTotal_1 - (amount_paid || 0);
                if (customer_1.current_balance + debt > customer_1.credit_limit)
                    return res.status(400).json({ success: false, error: 'Credit limit exceeded.' });
            }
            var shopStateRow = db_2.prepare("SELECT value FROM settings WHERE key = 'state_code'").get();
            var shopState = (shopStateRow === null || shopStateRow === void 0 ? void 0 : shopStateRow.value) || '29';
            var customerState = shopState;
            if (customer_1.gstin && customer_1.gstin.trim().length >= 2) {
                var code = customer_1.gstin.trim().substring(0, 2);
                if (/^\d+$/.test(code))
                    customerState = code;
            }
            var isIntraState_1 = customerState === shopState;
            var cgstTotal_1 = 0, sgstTotal_1 = 0, igstTotal_1 = 0;
            cart.forEach(function (item) {
                var _a;
                var lineTotal = (item.price - item.discount) * item.quantity;
                var proportion = subtotal_1 > 0 ? lineTotal / subtotal_1 : 0;
                var lineTaxable = Math.round(lineTotal - (discountVal_1 * proportion));
                var prodRow = db_2.prepare('SELECT gst_rate FROM products WHERE product_id = ?').get(item.product_id);
                var rate = (_a = prodRow === null || prodRow === void 0 ? void 0 : prodRow.gst_rate) !== null && _a !== void 0 ? _a : 18;
                var taxableValue = Math.round(lineTaxable / (1 + rate / 100));
                var taxAmount = lineTaxable - taxableValue;
                if (isIntraState_1) {
                    var half = Math.round(taxAmount / 2);
                    cgstTotal_1 += half;
                    sgstTotal_1 += (taxAmount - half);
                }
                else
                    igstTotal_1 += taxAmount;
            });
            var checkoutTx = db_2.transaction(function () {
                var prefixRow = db_2.prepare("SELECT value FROM settings WHERE key = 'invoice_prefix'").get();
                var sequenceRow = db_2.prepare("SELECT value FROM settings WHERE key = 'next_invoice_no'").get();
                var prefix = (prefixRow === null || prefixRow === void 0 ? void 0 : prefixRow.value) || 'CE/26/';
                var sequence = (sequenceRow === null || sequenceRow === void 0 ? void 0 : sequenceRow.value) || '1001';
                var invoiceNo = "".concat(prefix).concat(sequence);
                var paidPaise = payment_mode === 'UDHAAR' ? (amount_paid || 0) : grandTotal_1;
                var saleRes = db_2.prepare("INSERT INTO sales (\n            invoice_no, customer_id, tier_applied, subtotal, discount, \n            cgst, sgst, igst, grand_total, amount_paid, payment_mode, sold_by\n          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(invoiceNo, customer_1.customer_id, tier_applied || 'COUNTER', subtotal_1, discountVal_1, cgstTotal_1, sgstTotal_1, igstTotal_1, grandTotal_1, paidPaise, payment_mode, userId);
                var saleId = saleRes.lastInsertRowid;
                cart.forEach(function (item) {
                    var _a;
                    if (item.instance_id) {
                        var inst = db_2.prepare('SELECT * FROM product_instances WHERE instance_id = ?').get(item.instance_id);
                        if (!inst || inst.status !== 'IN_STOCK')
                            throw new Error("Serial instance ".concat(item.instance_id, " is not in stock."));
                        db_2.prepare("INSERT INTO sale_items (sale_id, product_id, instance_id, quantity, unit_price, line_discount, line_total, unit_cost) VALUES (?, ?, ?, 1, ?, ?, ?, ?)").run(saleId, item.product_id, item.instance_id, item.price, item.discount, (item.price - item.discount), inst.purchase_cost || 0);
                        var prodRow = db_2.prepare('SELECT warranty_months FROM products WHERE product_id = ?').get(item.product_id);
                        var warrantyMonths = (_a = prodRow === null || prodRow === void 0 ? void 0 : prodRow.warranty_months) !== null && _a !== void 0 ? _a : 12;
                        db_2.prepare("UPDATE product_instances SET status = 'SOLD', sold_at = datetime('now'), warranty_expires_at = datetime('now', '+' || ? || ' months') WHERE instance_id = ?").run(warrantyMonths, item.instance_id);
                    }
                    else {
                        var prodRow = db_2.prepare('SELECT loose_qty, purchase_cost FROM products WHERE product_id = ?').get(item.product_id);
                        if (!prodRow || prodRow.loose_qty < item.quantity)
                            throw new Error("Insufficient loose stock for product ID ".concat(item.product_id, ". Available: ").concat((prodRow === null || prodRow === void 0 ? void 0 : prodRow.loose_qty) || 0));
                        db_2.prepare("INSERT INTO sale_items (sale_id, product_id, instance_id, quantity, unit_price, line_discount, line_total, unit_cost) VALUES (?, ?, NULL, ?, ?, ?, ?, ?)").run(saleId, item.product_id, item.quantity, item.price, item.discount, (item.price - item.discount) * item.quantity, prodRow.purchase_cost || 0);
                        db_2.prepare("UPDATE products SET loose_qty = loose_qty - ? WHERE product_id = ?").run(item.quantity, item.product_id);
                    }
                });
                if (payment_mode === 'UDHAAR') {
                    var debtPaise = grandTotal_1 - paidPaise;
                    db_2.prepare("UPDATE customers SET current_balance = current_balance + ? WHERE customer_id = ?").run(debtPaise, customer_1.customer_id);
                    db_2.prepare("INSERT INTO customer_ledger (customer_id, type, ref_id, amount, balance_after, note) VALUES (?, 'SALE', ?, ?, (SELECT current_balance FROM customers WHERE customer_id = ?), ?)").run(customer_1.customer_id, saleId, debtPaise, customer_1.customer_id, "Debited from invoice ".concat(invoiceNo));
                }
                db_2.prepare("UPDATE settings SET value = CAST((CAST(value AS INTEGER) + 1) AS TEXT) WHERE key = 'next_invoice_no'").run();
                db_2.prepare("INSERT INTO audit_log (user_id, action, entity, entity_id, detail) VALUES (?, 'CHECKOUT', 'sale', ?, ?)").run(userId, saleId, "LAN API POS Checkout Completed. Invoice: ".concat(invoiceNo));
                return { invoiceNo: invoiceNo, saleId: saleId };
            });
            var txResult = checkoutTx();
            res.json(__assign({ success: true }, txResult));
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    });
    if (!isPackaged) {
        app.post('/api/dev/ipc', requireRole('BACKUP_RESTORE'), function (req, res) { return __awaiter(_this, void 0, void 0, function () {
            var _a, channel, args, result, db_3, runRes, runTx, interfaces, ip, _i, _b, name_1, _c, _d, iface;
            var _e, _f, _g;
            return __generator(this, function (_h) {
                _a = req.body, channel = _a.channel, args = _a.args;
                try {
                    result = void 0;
                    db_3 = getDB();
                    if (channel === 'db-query') {
                        result = (_e = db_3.prepare(args[0])).all.apply(_e, (args[1] || []));
                    }
                    else if (channel === 'db-get') {
                        result = (_f = db_3.prepare(args[0])).get.apply(_f, (args[1] || []));
                    }
                    else if (channel === 'db-run') {
                        runRes = (_g = db_3.prepare(args[0])).run.apply(_g, (args[1] || []));
                        result = { changes: runRes.changes, lastInsertRowid: runRes.lastInsertRowid };
                    }
                    else if (channel === 'db-transaction') {
                        runTx = db_3.transaction(function (txQueries) {
                            var _a;
                            var results = [];
                            for (var _i = 0, txQueries_1 = txQueries; _i < txQueries_1.length; _i++) {
                                var q = txQueries_1[_i];
                                results.push((_a = db_3.prepare(q.sql)).run.apply(_a, q.params));
                            }
                            return results;
                        });
                        result = runTx(args[0]);
                    }
                    else if (channel === 'get-db-config') {
                        result = activeConfig;
                    }
                    else if (channel === 'set-db-config') {
                        if (activeConfig) {
                            Object.assign(activeConfig, args[0]);
                            if (configPath)
                                fs.writeFileSync(configPath, JSON.stringify(activeConfig, null, 2));
                            if (args[0].dbPath && initDB && schemaSql) {
                                initDB(args[0].dbPath, schemaSql);
                            }
                        }
                        result = activeConfig;
                    }
                    else if (channel === 'get-lan-info') {
                        interfaces = os_1.default.networkInterfaces();
                        ip = '127.0.0.1';
                        for (_i = 0, _b = Object.keys(interfaces); _i < _b.length; _i++) {
                            name_1 = _b[_i];
                            for (_c = 0, _d = interfaces[name_1] || []; _c < _d.length; _c++) {
                                iface = _d[_c];
                                if (iface.family === 'IPv4' && !iface.internal)
                                    ip = iface.address;
                            }
                        }
                        result = { ip: ip, port: 47615 };
                    }
                    else {
                        return [2 /*return*/, res.status(400).json({ error: "Unknown channel ".concat(channel) })];
                    }
                    res.json(result);
                }
                catch (err) {
                    res.status(500).json({ error: err.message });
                }
                return [2 /*return*/];
            });
        }); });
    }
    app.get('/api/warranty/:serial', requireRole('READ_DASHBOARD'), function (req, res) {
        var serial = req.params.serial;
        try {
            var db = getDB();
            var instance = db.prepare("SELECT pi.*, p.brand_name, p.model_name, p.category FROM product_instances pi JOIN products p ON pi.product_id = p.product_id WHERE pi.serial_number = ?").get(serial);
            if (!instance)
                return res.json({ found: false });
            var saleItem = db.prepare("SELECT si.*, s.invoice_no, s.created_at as sale_date, s.customer_id, c.name as customer_name, c.phone as customer_phone FROM sale_items si JOIN sales s ON si.sale_id = s.sale_id LEFT JOIN customers c ON s.customer_id = c.customer_id WHERE si.instance_id = ? AND s.status = 'COMPLETED'").get(instance.instance_id);
            var now = new Date();
            var warranty_valid = false;
            if (instance.warranty_expires_at) {
                var expires = new Date(instance.warranty_expires_at);
                expires.setHours(23, 59, 59, 999);
                warranty_valid = now <= expires;
            }
            return res.json({ found: true, instance: instance, sold_by_us: !!saleItem, sale: saleItem || null, warranty_valid: warranty_valid });
        }
        catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    });
    app.post('/api/returns/validate', requireRole('ISSUE_CN'), function (req, res) {
        var serial = req.body.serial;
        try {
            var db = getDB();
            var instance = db.prepare('SELECT * FROM product_instances WHERE serial_number = ?').get(serial);
            if (!instance)
                return res.json({ outcome: 'REJECT_UNKNOWN', message: 'Never part of our inventory.' });
            if (instance.status === 'RMA_RETURNED')
                return res.json({ outcome: 'REJECT_ALREADY_RETURNED', message: 'This unit has already been returned (RMA_RETURNED).' });
            var saleItem = db.prepare("SELECT si.*, s.invoice_no, s.created_at as sale_date, s.customer_id, s.payment_mode, c.name as customer_name, c.phone as customer_phone FROM sale_items si JOIN sales s ON si.sale_id = s.sale_id LEFT JOIN customers c ON s.customer_id = c.customer_id WHERE si.instance_id = ? AND s.status = 'COMPLETED'").get(instance.instance_id);
            if (!saleItem)
                return res.json({ outcome: 'REJECT_NEVER_SOLD', message: 'In stock registry but never sold to a customer.' });
            return res.json({ outcome: 'ALLOW', saleItem: saleItem, instance: instance });
        }
        catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    });
    app.post('/api/returns/accept', requireRole('ISSUE_CN'), function (req, res) {
        var _a = req.body, serial = _a.serial, reason = _a.reason, resolution = _a.resolution, refund_amount = _a.refund_amount, replacement_serial = _a.replacement_serial, condition_sealed = _a.condition_sealed;
        var userId = req.session.user_id;
        try {
            var db_4 = getDB();
            var tx = db_4.transaction(function () {
                var _a;
                var instance = db_4.prepare('SELECT * FROM product_instances WHERE serial_number = ?').get(serial);
                if (!instance || instance.status === 'RMA_RETURNED')
                    throw new Error("Invalid or already returned serial.");
                var saleItem = db_4.prepare("SELECT si.*, s.payment_mode, s.customer_id, s.sale_id FROM sale_items si JOIN sales s ON si.sale_id = s.sale_id WHERE si.instance_id = ? AND s.status = 'COMPLETED'").get(instance.instance_id);
                if (!saleItem)
                    throw new Error("Sale item not found.");
                if (refund_amount > saleItem.unit_price)
                    throw new Error("Refund amount cannot exceed original unit price.");
                var newStatus = 'RMA_RETURNED';
                if (resolution === 'CREDIT_NOTE' && condition_sealed)
                    newStatus = 'IN_STOCK';
                db_4.prepare('UPDATE product_instances SET status = ? WHERE instance_id = ?').run(newStatus, instance.instance_id);
                var creditNoteNo = null;
                var cnId = null;
                if (resolution === 'CREDIT_NOTE') {
                    var prefixRow = db_4.prepare("SELECT value FROM settings WHERE key = 'cn_prefix'").get();
                    var sequenceRow = db_4.prepare("SELECT value FROM settings WHERE key = 'next_cn_no'").get();
                    var prefix = (prefixRow === null || prefixRow === void 0 ? void 0 : prefixRow.value) || 'CN-';
                    var sequence = (sequenceRow === null || sequenceRow === void 0 ? void 0 : sequenceRow.value) || '1';
                    creditNoteNo = "".concat(prefix).concat(sequence);
                    db_4.prepare("INSERT INTO credit_notes (cn_no, sale_id, instance_id, amount, reason) VALUES (?, ?, ?, ?, ?)").run(creditNoteNo, saleItem.sale_id, instance.instance_id, refund_amount, reason);
                    cnId = db_4.prepare('SELECT last_insert_rowid() as id').get().id;
                    db_4.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('next_cn_no', CAST((CAST(? AS INTEGER) + 1) AS TEXT))").run(sequence);
                    if (saleItem.payment_mode === 'UDHAAR' && saleItem.customer_id) {
                        db_4.prepare('UPDATE customers SET current_balance = current_balance - ? WHERE customer_id = ?').run(refund_amount, saleItem.customer_id);
                        var cust = db_4.prepare('SELECT current_balance FROM customers WHERE customer_id = ?').get(saleItem.customer_id);
                        db_4.prepare("INSERT INTO customer_ledger (customer_id, type, ref_id, amount, balance_after, note) VALUES (?, 'RETURN', (SELECT cn_id FROM credit_notes WHERE cn_no = ?), ?, ?, ?)").run(saleItem.customer_id, creditNoteNo, refund_amount, cust.current_balance, "Credit Note ".concat(creditNoteNo));
                    }
                }
                else if (resolution === 'REPLACEMENT') {
                    if (!replacement_serial)
                        throw new Error("Replacement serial is required.");
                    var repInstance = db_4.prepare("SELECT * FROM product_instances WHERE serial_number = ? AND status = 'IN_STOCK'").get(replacement_serial);
                    if (!repInstance)
                        throw new Error("Replacement serial not found or not IN_STOCK.");
                    if (repInstance.product_id !== instance.product_id)
                        throw new Error("Replacement must be of the same product.");
                    var prodRow = db_4.prepare('SELECT warranty_months FROM products WHERE product_id = ?').get(instance.product_id);
                    var warrantyMonths = (_a = prodRow === null || prodRow === void 0 ? void 0 : prodRow.warranty_months) !== null && _a !== void 0 ? _a : 12;
                    db_4.prepare("UPDATE product_instances SET status = 'SOLD', sold_at = datetime('now'), warranty_expires_at = datetime('now', '+' || ? || ' months') WHERE instance_id = ?").run(warrantyMonths, repInstance.instance_id);
                    db_4.prepare("INSERT INTO sale_items (sale_id, product_id, instance_id, quantity, unit_price, line_discount, line_total) VALUES (?, ?, ?, 1, 0, 0, 0)").run(saleItem.sale_id, repInstance.product_id, repInstance.instance_id);
                }
                else if (resolution === 'SEND_TO_COMPANY') {
                    db_4.prepare("INSERT INTO rma_register (instance_id, reason, status) VALUES (?, ?, 'SENT')").run(instance.instance_id, reason);
                }
                db_4.prepare("INSERT INTO audit_log (user_id, action, entity, entity_id, detail) VALUES (?, 'RETURN_ACCEPT', 'product_instances', ?, ?)").run(userId, instance.instance_id, "Resolution: ".concat(resolution, ", Refund: ").concat(refund_amount, ", Reason: ").concat(reason));
                return { success: true, creditNoteNo: creditNoteNo, cnId: cnId, newStatus: newStatus };
            });
            res.json(tx());
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    });
    // ================= REPORTS & ANALYTICS (OWNER ONLY) =================
    var ownerOnly = requireRole('VIEW_REPORTS');
    app.get('/api/reports/margin', ownerOnly, function (req, res) {
        var _a;
        var _b = req.query, startDate = _b.startDate, endDate = _b.endDate;
        try {
            var db = getDB();
            var query = "\n        SELECT date(s.created_at) as date, p.category, p.brand_name, s.tier_applied,\n               si.line_total, p.gst_rate, si.unit_cost, si.quantity\n        FROM sale_items si\n        JOIN sales s ON si.sale_id = s.sale_id\n        JOIN products p ON si.product_id = p.product_id\n        WHERE s.status != 'CANCELLED'\n        ".concat(startDate ? "AND s.created_at >= ?" : '', "\n        ").concat(endDate ? "AND s.created_at <= ?" : '', "\n      ");
            var params = [];
            if (startDate)
                params.push(startDate + ' 00:00:00');
            if (endDate)
                params.push(endDate + ' 23:59:59');
            var rows = (_a = db.prepare(query)).all.apply(_a, params);
            var getTaxableValue_1 = require('@chauhan-erp/core/gst').getTaxableValue;
            var groups_1 = {};
            rows.forEach(function (r) {
                var key = "".concat(r.date, "|").concat(r.category, "|").concat(r.brand_name, "|").concat(r.tier_applied);
                if (!groups_1[key]) {
                    groups_1[key] = { date: r.date, category: r.category, brand_name: r.brand_name, tier_applied: r.tier_applied, revenue: 0, cogs: 0, profit: 0 };
                }
                var revenue = getTaxableValue_1(r.line_total, r.gst_rate);
                var cogs = r.unit_cost * r.quantity;
                groups_1[key].revenue += revenue;
                groups_1[key].cogs += cogs;
                groups_1[key].profit += (revenue - cogs);
            });
            var data = Object.values(groups_1).sort(function (a, b) { return b.date.localeCompare(a.date); });
            res.json({ success: true, data: data });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    });
    app.get('/api/reports/sales', ownerOnly, function (req, res) {
        var _a;
        var _b = req.query, startDate = _b.startDate, endDate = _b.endDate;
        try {
            var db = getDB();
            var query = "\n        SELECT date(s.created_at) as date, p.category, p.brand_name, s.tier_applied,\n               SUM(si.line_total) as total_revenue,\n               SUM(si.quantity) as items_sold,\n               COUNT(DISTINCT s.sale_id) as invoices_count\n        FROM sale_items si\n        JOIN sales s ON si.sale_id = s.sale_id\n        JOIN products p ON si.product_id = p.product_id\n        WHERE s.status != 'CANCELLED'\n        ".concat(startDate ? "AND s.created_at >= ?" : '', "\n        ").concat(endDate ? "AND s.created_at <= ?" : '', "\n        GROUP BY date, p.category, p.brand_name, s.tier_applied\n        ORDER BY date DESC\n      ");
            var params = [];
            if (startDate)
                params.push(startDate + ' 00:00:00');
            if (endDate)
                params.push(endDate + ' 23:59:59');
            res.json({ success: true, data: (_a = db.prepare(query)).all.apply(_a, params) });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    });
    app.get('/api/reports/low-stock', ownerOnly, function (req, res) {
        try {
            var db = getDB();
            var data = db.prepare("\n        SELECT p.product_id, p.sku_code, p.model_name, p.min_restock_level,\n               s.name as supplier_name,\n               (SELECT COUNT(*) FROM product_instances pi WHERE pi.product_id = p.product_id AND pi.status = 'IN_STOCK') + p.loose_qty as in_stock_qty\n        FROM products p\n        LEFT JOIN suppliers s ON p.supplier_id = s.supplier_id\n        WHERE ((SELECT COUNT(*) FROM product_instances pi WHERE pi.product_id = p.product_id AND pi.status = 'IN_STOCK') + p.loose_qty) <= p.min_restock_level\n        ORDER BY s.name, p.model_name\n      ").all();
            res.json({ success: true, data: data });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    });
    app.get('/api/reports/dead-stock', ownerOnly, function (req, res) {
        var days = parseInt(req.query.days || '30', 10);
        try {
            var db = getDB();
            var data = db.prepare("\n        SELECT p.product_id, p.sku_code, p.model_name,\n               MAX(s.created_at) as last_sale_date,\n               (SELECT COUNT(*) FROM product_instances pi WHERE pi.product_id = p.product_id AND pi.status = 'IN_STOCK') + p.loose_qty as in_stock_qty\n        FROM products p\n        LEFT JOIN sale_items si ON p.product_id = si.product_id\n        LEFT JOIN sales s ON si.sale_id = s.sale_id\n        GROUP BY p.product_id\n        HAVING (last_sale_date IS NULL OR last_sale_date <= datetime('now', ?))\n           AND in_stock_qty > 0\n        ORDER BY last_sale_date ASC\n      ").all("-".concat(days, " days"));
            res.json({ success: true, data: data });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    });
    app.get('/api/reports/valuation', ownerOnly, function (req, res) {
        try {
            var db = getDB();
            var data = db.prepare("\n        SELECT \n          (SELECT SUM(purchase_cost) FROM product_instances WHERE status = 'IN_STOCK') as serialized_value,\n          (SELECT SUM(loose_qty * purchase_cost) FROM products) as loose_value\n      ").get();
            var total = (data.serialized_value || 0) + (data.loose_value || 0);
            res.json({ success: true, data: __assign(__assign({}, data), { total_value: total }) });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    });
    app.get('/api/reports/gstr1', ownerOnly, function (req, res) {
        var _a;
        var _b = req.query, startDate = _b.startDate, endDate = _b.endDate;
        try {
            var db = getDB();
            var query = "\n        SELECT s.sale_id, s.invoice_no, s.created_at, c.gstin, c.name as customer_name,\n               s.subtotal, s.discount, s.cgst, s.sgst, s.igst, s.grand_total\n        FROM sales s\n        LEFT JOIN customers c ON s.customer_id = c.customer_id\n        WHERE s.status != 'CANCELLED'\n        ".concat(startDate ? "AND s.created_at >= ?" : '', "\n        ").concat(endDate ? "AND s.created_at <= ?" : '', "\n        ORDER BY s.created_at DESC\n      ");
            var params = [];
            if (startDate)
                params.push(startDate + ' 00:00:00');
            if (endDate)
                params.push(endDate + ' 23:59:59');
            var invoices = (_a = db.prepare(query)).all.apply(_a, params);
            var getTaxableValue_2 = require('@chauhan-erp/core/gst').getTaxableValue;
            var total_cgst = 0, total_sgst = 0, total_igst = 0, total_taxable = 0;
            var _loop_1 = function (inv) {
                var items = db.prepare("SELECT si.line_total, p.gst_rate FROM sale_items si JOIN products p ON si.product_id = p.product_id WHERE si.sale_id = ?").all(inv.sale_id);
                var inv_taxable = 0;
                var rates = new Set();
                items.forEach(function (si) {
                    // If invoice has discount, proportion it? The logic suite says: "getTaxableValue(lineTotal, rate)"
                    // To keep it simple, we use the line total. But discount lowers taxable value.
                    // The instruction: "Derive GSTR-1 taxable value with the existing tested getTaxableValue reverse-calc... do not ad-hoc subtract tax."
                    var ratio = (inv.subtotal - inv.discount) / inv.subtotal;
                    var discountedLineTotal = si.line_total * ratio;
                    inv_taxable += getTaxableValue_2(discountedLineTotal, si.gst_rate);
                    rates.add(si.gst_rate);
                });
                inv.taxable = inv_taxable;
                inv.gst_rates = Array.from(rates).join(',');
                total_taxable += inv_taxable;
                total_cgst += inv.cgst;
                total_sgst += inv.sgst;
                total_igst += inv.igst;
            };
            for (var _i = 0, invoices_1 = invoices; _i < invoices_1.length; _i++) {
                var inv = invoices_1[_i];
                _loop_1(inv);
            }
            res.json({
                success: true,
                data: { invoices: invoices, summary: { total_cgst: total_cgst, total_sgst: total_sgst, total_igst: total_igst, total_taxable: total_taxable } }
            });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    });
    app.get('/api/reports/udhaar', ownerOnly, function (req, res) {
        try {
            var db = getDB();
            var customers = db.prepare("\n        SELECT customer_id, name, phone, current_balance, credit_limit, credit_due_date\n        FROM customers\n        WHERE current_balance > 0\n      ").all();
            var calculateAging_1 = require('@chauhan-erp/core/ledger').calculateAging;
            var buckets_1 = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0, total_overdue: 0 };
            customers.forEach(function (c) {
                var age = calculateAging_1(c, new Date());
                buckets_1['0-30'] += age['0-30'];
                buckets_1['31-60'] += age['31-60'];
                buckets_1['61-90'] += age['61-90'];
                buckets_1['90+'] += age['90+'];
                buckets_1['total_overdue'] += age.total_overdue;
            });
            var total_receivable = customers.reduce(function (sum, c) { return sum + c.current_balance; }, 0);
            // Sort descending by current_balance
            customers.sort(function (a, b) { return b.current_balance - a.current_balance; });
            res.json({ success: true, data: { customers: customers, buckets: buckets_1, total_receivable: total_receivable } });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    });
    return app;
}
