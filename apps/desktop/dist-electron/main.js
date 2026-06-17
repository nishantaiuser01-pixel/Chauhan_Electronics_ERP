"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// electron/main.ts
var import_electron = require("electron");
var path = __toESM(require("path"));
var fs2 = __toESM(require("fs"));
var os2 = __toESM(require("os"));
var import_node_thermal_printer = require("node-thermal-printer");

// ../../packages/core/db.ts
var import_better_sqlite3 = __toESM(require("better-sqlite3"));
var bcrypt = __toESM(require("bcryptjs"));
var dbInstance = null;
function getDB() {
  if (!dbInstance) {
    throw new Error("Database not initialized. Call initDB(dbPath, schemaSql) first.");
  }
  return dbInstance;
}
function initDB(dbPath, schemaSql2) {
  if (dbInstance) {
    return dbInstance;
  }
  dbInstance = new import_better_sqlite3.default(dbPath);
  dbInstance.pragma("foreign_keys = ON");
  dbInstance.pragma("journal_mode = WAL");
  const tableCheck = dbInstance.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='settings'").get();
  if (!tableCheck) {
    dbInstance.exec(schemaSql2);
    seedDB(dbInstance);
  }
  return dbInstance;
}
function seedDB(db) {
  const insertSetting = db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)");
  insertSetting.run("first_run", "0");
  insertSetting.run("shop_name", "Chauhan Electronics");
  insertSetting.run("address", "12, SP Road, Bengaluru, Karnataka - 560002");
  insertSetting.run("gstin", "29ABCDE1234F1Z5");
  insertSetting.run("state_code", "29");
  insertSetting.run("invoice_prefix", "CE/26/");
  insertSetting.run("next_invoice_no", "1001");
  insertSetting.run("job_prefix", "JOB/26/");
  insertSetting.run("next_job_no", "2001");
  insertSetting.run("default_gst_rate", "18");
  insertSetting.run("currency", "INR");
  insertSetting.run("sms_enabled", "0");
  insertSetting.run("online_lookup", "0");
  const insertUser = db.prepare("INSERT INTO users (name, pin_hash, role, active) VALUES (?, ?, ?, 1)");
  const ownerPinHash = bcrypt.hashSync("1234", 10);
  const cashierPinHash = bcrypt.hashSync("5678", 10);
  const techPinHash = bcrypt.hashSync("9012", 10);
  insertUser.run("Nishant Chauhan", ownerPinHash, "OWNER");
  insertUser.run("SP Road Cashier", cashierPinHash, "CASHIER");
  insertUser.run("Repair Tech", techPinHash, "TECHNICIAN");
  const insertCustomer = db.prepare(`
    INSERT INTO customers (name, phone, shop_name, tier, gstin, credit_limit, current_balance, credit_due_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertCustomer.run("Counter Customer", "0000000000", null, "COUNTER", null, 0, 0, null);
  insertCustomer.run("Abhishek Audio", "9876543210", "Abhishek Electronics", "DEALER", "29AAAPA1234B1Z0", 1e7, 45e5, "2026-07-16");
  insertCustomer.run("Pooja Car Accessories", "9123456789", "Pooja Accessories", "DEALER", null, 5e6, 0, null);
  insertCustomer.run("Sardar Distributors", "9988776655", "Sardar Audio Ltd", "DISTRIBUTOR", "29BBBBB5678C1Z1", 5e7, 0, null);
  const insertLedger = db.prepare(`
    INSERT INTO customer_ledger (customer_id, type, ref_id, amount, balance_after, note)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertLedger.run(2, "SALE", 0, 45e5, 45e5, "Opening Balance");
  const insertProduct = db.prepare(`
    INSERT INTO products (sku_code, brand_name, model_name, category, hsn_code, gst_rate, requires_serial, warranty_months, min_restock_level, counter_price, dealer_price, distributor_price, loose_qty)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertProduct.run("8809123456789", "Pioneer", "DMH-Z5290BT", "Car Audio", "8527", 18, 1, 12, 3, 285e4, 25e5, 23e5, 0);
  insertProduct.run("8809123456000", "Blaupunkt", "Key Largo 980", "Car Audio", "8527", 18, 1, 24, 2, 18e5, 16e5, 145e4, 0);
  insertProduct.run("4001234567890", "Dixon", "8-Gauge Power Cable", "Accessories", "8544", 18, 0, 0, 20, 15e3, 12e3, 1e4, 150);
  insertProduct.run("7890123456789", "Sony", "XM-N1004", "Car Audio", "8518", 18, 1, 12, 2, 95e4, 85e4, 8e5, 0);
  const insertFitment = db.prepare("INSERT INTO product_fitment (product_id, vehicle_tag) VALUES (?, ?)");
  insertFitment.run(1, "Universal Double Din");
  insertFitment.run(1, "Creta 2024");
  insertFitment.run(1, "Swift 2023");
  insertFitment.run(2, "9 Inch Android");
  insertFitment.run(2, "Universal Fitment");
  insertFitment.run(4, "4 Channel Amplifier");
  const insertInstance = db.prepare(`
    INSERT INTO product_instances (product_id, serial_number, status, batch_number, purchase_cost, grn_id, sold_at, warranty_expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertInstance.run(1, "PIO-DMH-1001", "IN_STOCK", "B1", 19e5, 1, null, null);
  insertInstance.run(1, "PIO-DMH-1002", "IN_STOCK", "B1", 19e5, 1, null, null);
  insertInstance.run(1, "PIO-DMH-1003", "IN_STOCK", "B1", 19e5, 1, null, null);
  insertInstance.run(2, "BP-KL-9801", "IN_STOCK", "B2", 12e5, 1, null, null);
  insertInstance.run(2, "BP-KL-9802", "IN_STOCK", "B2", 12e5, 1, null, null);
  insertInstance.run(4, "SONY-AMP-2001", "IN_STOCK", "B3", 6e5, 1, null, null);
  insertInstance.run(4, "SONY-AMP-2002", "SOLD", "B3", 6e5, 1, "2026-06-01 12:00:00", "2027-06-01 12:00:00");
  const insertGRN = db.prepare(`
    INSERT INTO grn (grn_id, supplier_id, invoice_ref, total_cost, received_by)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertGRN.run(1, null, "INIT-STOCK", 87e5, 1);
  const insertRepair = db.prepare(`
    INSERT INTO repair_jobs (job_no, customer_id, customer_phone, customer_name, product_name, serial_number, sold_by_us, is_warranty, issue_reported, technician_notes, technician_id, status, est_cost, parts_cost, labour_cost, advance_paid, final_cost, ready_date, delivered_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertRepair.run(
    "JOB/26/2001",
    2,
    // Abhishek Audio
    "9876543210",
    "Abhishek Audio",
    "Sony XM-N1004 Amplifier",
    "SONY-AMP-2002",
    1,
    1,
    "Channel 3/4 no output",
    "Checking pre-amp stage transistors",
    3,
    // Repair Tech
    "IN_REPAIR",
    15e4,
    0,
    0,
    0,
    0,
    null,
    null
  );
  const insertRepairHistory = db.prepare(`
    INSERT INTO repair_status_history (job_id, old_status, new_status)
    VALUES (?, ?, ?)
  `);
  insertRepairHistory.run(1, "PENDING", "IN_REPAIR");
}

// ../../packages/core/ledger.ts
function calculateAging(customer, currentDate = /* @__PURE__ */ new Date()) {
  const buckets = { "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0, total_overdue: 0 };
  if (customer.current_balance <= 0 || !customer.credit_due_date) {
    return buckets;
  }
  const dueDate = new Date(customer.credit_due_date);
  const diffTime = currentDate.getTime() - dueDate.getTime();
  const diffDays = Math.ceil(diffTime / (1e3 * 60 * 60 * 24));
  if (diffDays <= 0) {
    return buckets;
  }
  buckets.total_overdue = customer.current_balance;
  if (diffDays <= 30) {
    buckets["0-30"] = customer.current_balance;
  } else if (diffDays <= 60) {
    buckets["31-60"] = customer.current_balance;
  } else if (diffDays <= 90) {
    buckets["61-90"] = customer.current_balance;
  } else {
    buckets["90+"] = customer.current_balance;
  }
  return buckets;
}

// ../../packages/core/sms.ts
function formatPaymentReminder(customer, shopName) {
  const amountRs = (customer.current_balance / 100).toFixed(2);
  return `Dear ${customer.name}, your Udhaar balance of Rs.${amountRs} at ${shopName} is overdue. Please settle it at the earliest.`;
}

// ../../packages/core/permissions.ts
function authorize(role, action) {
  if (!role)
    return false;
  if (role === "OWNER")
    return true;
  switch (action) {
    case "EDIT_PRICE":
    case "OVERRIDE_CREDIT":
    case "VOID_SALE":
    case "REFUND_EDIT":
    case "BACKUP_RESTORE":
    case "USER_MGMT":
      return false;
    case "EDIT_CATALOGUE":
      return role === "STOCK";
    case "CREATE_SUPPLIER":
      return role === "CASHIER" || role === "STOCK";
    case "RECORD_EXPENSE":
    case "RECORD_PAYMENT":
    case "CHECKOUT":
    case "ISSUE_CN":
      return role === "CASHIER";
    case "RECEIVE_GRN":
      return role === "STOCK";
    case "MANAGE_REPAIRS":
      return role === "TECHNICIAN" || role === "CASHIER";
    case "READ_DASHBOARD":
      return true;
    case "READ_CATALOGUE":
      return true;
    case "READ_STOCK":
      return true;
    case "READ_CUSTOMERS":
      return role === "CASHIER";
    case "READ_SUPPLIERS":
      return role === "CASHIER" || role === "STOCK";
    case "READ_REPAIRS":
      return true;
    case "READ_ACCOUNTING":
      return role === "CASHIER";
    default:
      return false;
  }
}
function assertCan(role, action) {
  if (!authorize(role, action)) {
    throw new Error(`Forbidden: Role ${role || "UNAUTHENTICATED"} is not allowed to perform ${action}`);
  }
}

// electron/main.ts
var import_qrcode = __toESM(require("qrcode"));

// electron/api.ts
var import_express = __toESM(require("express"));
var import_cors = __toESM(require("cors"));
var import_os = __toESM(require("os"));
var fs = __toESM(require("fs"));
function createApiServer(options) {
  const { getDB: getDB2, sessionStore: sessionStore2, isPackaged, mainWindow: mainWindow2, activeConfig: activeConfig2, configPath: configPath2, initDB: initDB2, schemaSql: schemaSql2 } = options;
  const app2 = (0, import_express.default)();
  app2.use((0, import_cors.default)());
  app2.use(import_express.default.json());
  function authMiddleware(req, res, next) {
    const openPaths = ["/api/ping", "/api/health", "/api/auth/login"];
    if (openPaths.includes(req.path))
      return next();
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, error: "Missing or invalid Authorization header" });
    }
    const token = authHeader.substring("Bearer ".length).trim();
    const session = sessionStore2.get(token);
    if (!session) {
      return res.status(401).json({ success: false, error: "Invalid or expired token" });
    }
    req.session = session;
    next();
  }
  function requireRole(action) {
    return (req, res, next) => {
      const role = req.session?.role;
      if (!authorize(role, action)) {
        return res.status(403).json({ success: false, error: `Forbidden: Role ${role} cannot perform ${action}` });
      }
      next();
    };
  }
  app2.use(authMiddleware);
  app2.get("/api/ping", (req, res) => {
    res.json({ status: "ok", server: "Chauhan ERP Desktop" });
  });
  app2.get("/api/health", (req, res) => {
    res.json({ status: "ok", shopName: "Chauhan Electronics", online: true });
  });
  app2.post("/api/auth/login", (req, res) => {
    const { pin } = req.body;
    try {
      const db = getDB2();
      const users = db.prepare("SELECT * FROM users WHERE active = 1").all();
      const bcrypt2 = require("bcryptjs");
      const crypto = require("crypto");
      const matchedUser = users.find((u) => bcrypt2.compareSync(pin, u.pin_hash));
      if (matchedUser) {
        const token = crypto.randomBytes(32).toString("hex");
        sessionStore2.set(token, { user_id: matchedUser.user_id, role: matchedUser.role, issuedAt: Date.now() });
        res.json({
          success: true,
          token,
          user: {
            user_id: matchedUser.user_id,
            name: matchedUser.name,
            role: matchedUser.role
          }
        });
      } else {
        res.status(401).json({ success: false, error: "Invalid PIN" });
      }
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app2.get("/api/products/:sku", requireRole("READ_CATALOGUE"), (req, res) => {
    try {
      const db = getDB2();
      const sku = req.params.sku;
      const product = db.prepare("SELECT * FROM products WHERE sku_code = ?").get(sku);
      if (product) {
        let stock = 0;
        if (product.requires_serial) {
          const row = db.prepare("SELECT COUNT(*) as count FROM product_instances WHERE product_id = ? AND status = 'IN_STOCK'").get(product.product_id);
          stock = row.count;
        } else {
          stock = product.loose_qty || 0;
        }
        res.json({ success: true, product, stock });
      } else {
        res.status(404).json({ success: false, error: "Product not found" });
      }
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app2.post("/api/cart/push", requireRole("CHECKOUT"), (req, res) => {
    try {
      const { cart } = req.body;
      if (!cart || !Array.isArray(cart)) {
        return res.status(400).json({ success: false, error: "Invalid cart payload" });
      }
      if (mainWindow2) {
        mainWindow2.webContents.send("mobile-cart-received", cart);
        res.json({ success: true, message: "Cart beamed to Desktop POS" });
      } else {
        res.status(500).json({ success: false, error: "Desktop UI not active" });
      }
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app2.get("/api/products/lookup/:sku", requireRole("READ_CATALOGUE"), (req, res) => {
    const { sku } = req.params;
    try {
      const db = getDB2();
      const product = db.prepare("SELECT * FROM products WHERE sku_code = ?").get(sku);
      if (product) {
        const tags = db.prepare("SELECT vehicle_tag FROM product_fitment WHERE product_id = ?").all(product.product_id).map((row) => row.vehicle_tag);
        res.json({ found: true, product: { ...product, fitment_tags: tags } });
      } else {
        res.json({ found: false });
      }
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app2.get("/api/customers/lookup/:phone", requireRole("READ_CUSTOMERS"), (req, res) => {
    const { phone } = req.params;
    try {
      const db = getDB2();
      const customer = db.prepare("SELECT * FROM customers WHERE phone = ?").get(phone);
      if (customer) {
        res.json({ found: true, customer });
      } else {
        res.json({ found: false });
      }
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app2.post("/api/customers", requireRole("READ_CUSTOMERS"), (req, res) => {
    const { name, phone, shop_name, tier, gstin, credit_limit } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ success: false, error: "Name and Phone are required." });
    }
    try {
      const db = getDB2();
      const result = db.prepare(
        `INSERT INTO customers (name, phone, shop_name, tier, gstin, credit_limit, current_balance)
         VALUES (?, ?, ?, ?, ?, ?, 0)`
      ).run(name, phone, shop_name || null, tier || "COUNTER", gstin || null, credit_limit || 0);
      const newCustomer = db.prepare("SELECT * FROM customers WHERE customer_id = ?").get(result.lastInsertRowid);
      res.json({ success: true, customer: newCustomer });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app2.get("/api/customers/:id/ledger", requireRole("READ_CUSTOMERS"), (req, res) => {
    const customerId = req.params.id;
    try {
      const db = getDB2();
      const customer = db.prepare("SELECT * FROM customers WHERE customer_id = ?").get(customerId);
      if (!customer) {
        return res.status(404).json({ success: false, error: "Customer not found" });
      }
      const ledger = db.prepare("SELECT * FROM customer_ledger WHERE customer_id = ? ORDER BY created_at DESC").all(customerId);
      res.json({ success: true, customer, ledger });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app2.post("/api/customers/:id/payment", requireRole("RECORD_PAYMENT"), (req, res) => {
    const customerId = req.params.id;
    const { amount, note } = req.body;
    const userId = req.session.user_id;
    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ success: false, error: "Valid payment amount required" });
    }
    try {
      const db = getDB2();
      const tx = db.transaction(() => {
        db.prepare(`UPDATE customers SET current_balance = current_balance - ? WHERE customer_id = ?`).run(amount, customerId);
        const newCustomer = db.prepare("SELECT current_balance FROM customers WHERE customer_id = ?").get(customerId);
        db.prepare(
          `INSERT INTO customer_ledger (customer_id, type, amount, balance_after, note)
           VALUES (?, 'PAYMENT', ?, ?, ?)`
        ).run(customerId, amount, newCustomer.current_balance, note || "Payment received");
        db.prepare(`INSERT INTO audit_log (user_id, action, entity, entity_id, detail) VALUES (?, 'RECORD_PAYMENT', 'customer_ledger', ?, ?)`).run(userId, customerId, `Payment amount: ${amount}`);
        return newCustomer.current_balance;
      });
      const newBalance = tx();
      res.json({ success: true, newBalance });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app2.get("/api/sales/invoice/:invoice_no", requireRole("READ_DASHBOARD"), (req, res) => {
    const invoice_no = decodeURIComponent(req.params.invoice_no);
    try {
      const db = getDB2();
      const sale = db.prepare("SELECT * FROM sales WHERE invoice_no = ?").get(invoice_no);
      if (sale) {
        const items = db.prepare(
          `SELECT si.*, p.brand_name, p.model_name, p.hsn_code, p.gst_rate, pi.serial_number
           FROM sale_items si
           JOIN products p ON si.product_id = p.product_id
           LEFT JOIN product_instances pi ON si.instance_id = pi.instance_id
           WHERE si.sale_id = ?`
        ).all(sale.sale_id);
        const customer = db.prepare("SELECT * FROM customers WHERE customer_id = ?").get(sale.customer_id);
        res.json({ found: true, sale, items, customer });
      } else {
        res.json({ found: false });
      }
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app2.post("/api/sales/checkout", requireRole("CHECKOUT"), (req, res) => {
    const { customer_id, tier_applied, cart, discount, payment_mode, amount_paid } = req.body;
    const userId = req.session.user_id;
    if (!cart || cart.length === 0) {
      return res.status(400).json({ success: false, error: "Cart is empty." });
    }
    try {
      const db = getDB2();
      const customer = db.prepare("SELECT * FROM customers WHERE customer_id = ?").get(customer_id || 1);
      if (!customer)
        return res.status(400).json({ success: false, error: "Customer not found." });
      let subtotal = 0;
      cart.forEach((item) => {
        subtotal += (item.price - item.discount) * item.quantity;
      });
      const discountVal = discount || 0;
      const grandTotal = Math.max(0, subtotal - discountVal);
      if (payment_mode === "UDHAAR") {
        if (customer.phone === "0000000000")
          return res.status(400).json({ success: false, error: "Cannot sell on credit (Udhaar) to Counter Customer." });
        if (customer.credit_due_date && new Date(customer.credit_due_date) < /* @__PURE__ */ new Date() && customer.current_balance > 0)
          return res.status(400).json({ success: false, error: `Customer has an overdue balance since ${customer.credit_due_date}.` });
        const debt = grandTotal - (amount_paid || 0);
        if (customer.current_balance + debt > customer.credit_limit)
          return res.status(400).json({ success: false, error: "Credit limit exceeded." });
      }
      const shopStateRow = db.prepare("SELECT value FROM settings WHERE key = 'state_code'").get();
      const shopState = shopStateRow?.value || "29";
      let customerState = shopState;
      if (customer.gstin && customer.gstin.trim().length >= 2) {
        const code = customer.gstin.trim().substring(0, 2);
        if (/^\d+$/.test(code))
          customerState = code;
      }
      const isIntraState = customerState === shopState;
      let cgstTotal = 0, sgstTotal = 0, igstTotal = 0;
      cart.forEach((item) => {
        const lineTotal = (item.price - item.discount) * item.quantity;
        const proportion = subtotal > 0 ? lineTotal / subtotal : 0;
        const lineTaxable = Math.round(lineTotal - discountVal * proportion);
        const prodRow = db.prepare("SELECT gst_rate FROM products WHERE product_id = ?").get(item.product_id);
        const rate = prodRow?.gst_rate ?? 18;
        const taxableValue = Math.round(lineTaxable / (1 + rate / 100));
        const taxAmount = lineTaxable - taxableValue;
        if (isIntraState) {
          const half = Math.round(taxAmount / 2);
          cgstTotal += half;
          sgstTotal += taxAmount - half;
        } else
          igstTotal += taxAmount;
      });
      const checkoutTx = db.transaction(() => {
        const prefixRow = db.prepare("SELECT value FROM settings WHERE key = 'invoice_prefix'").get();
        const sequenceRow = db.prepare("SELECT value FROM settings WHERE key = 'next_invoice_no'").get();
        const prefix = prefixRow?.value || "CE/26/";
        const sequence = sequenceRow?.value || "1001";
        const invoiceNo = `${prefix}${sequence}`;
        const paidPaise = payment_mode === "UDHAAR" ? amount_paid || 0 : grandTotal;
        const saleRes = db.prepare(
          `INSERT INTO sales (
            invoice_no, customer_id, tier_applied, subtotal, discount, 
            cgst, sgst, igst, grand_total, amount_paid, payment_mode, sold_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(invoiceNo, customer.customer_id, tier_applied || "COUNTER", subtotal, discountVal, cgstTotal, sgstTotal, igstTotal, grandTotal, paidPaise, payment_mode, userId);
        const saleId = saleRes.lastInsertRowid;
        cart.forEach((item) => {
          if (item.instance_id) {
            const inst = db.prepare("SELECT * FROM product_instances WHERE instance_id = ?").get(item.instance_id);
            if (!inst || inst.status !== "IN_STOCK")
              throw new Error(`Serial instance ${item.instance_id} is not in stock.`);
            db.prepare(`INSERT INTO sale_items (sale_id, product_id, instance_id, quantity, unit_price, line_discount, line_total, unit_cost) VALUES (?, ?, ?, 1, ?, ?, ?, ?)`).run(saleId, item.product_id, item.instance_id, item.price, item.discount, item.price - item.discount, inst.purchase_cost || 0);
            const prodRow = db.prepare("SELECT warranty_months FROM products WHERE product_id = ?").get(item.product_id);
            const warrantyMonths = prodRow?.warranty_months ?? 12;
            db.prepare(`UPDATE product_instances SET status = 'SOLD', sold_at = datetime('now'), warranty_expires_at = datetime('now', '+' || ? || ' months') WHERE instance_id = ?`).run(warrantyMonths, item.instance_id);
          } else {
            const prodRow = db.prepare("SELECT loose_qty, purchase_cost FROM products WHERE product_id = ?").get(item.product_id);
            if (!prodRow || prodRow.loose_qty < item.quantity)
              throw new Error(`Insufficient loose stock for product ID ${item.product_id}. Available: ${prodRow?.loose_qty || 0}`);
            db.prepare(`INSERT INTO sale_items (sale_id, product_id, instance_id, quantity, unit_price, line_discount, line_total, unit_cost) VALUES (?, ?, NULL, ?, ?, ?, ?, ?)`).run(saleId, item.product_id, item.quantity, item.price, item.discount, (item.price - item.discount) * item.quantity, prodRow.purchase_cost || 0);
            db.prepare(`UPDATE products SET loose_qty = loose_qty - ? WHERE product_id = ?`).run(item.quantity, item.product_id);
          }
        });
        if (payment_mode === "UDHAAR") {
          const debtPaise = grandTotal - paidPaise;
          db.prepare(`UPDATE customers SET current_balance = current_balance + ? WHERE customer_id = ?`).run(debtPaise, customer.customer_id);
          db.prepare(`INSERT INTO customer_ledger (customer_id, type, ref_id, amount, balance_after, note) VALUES (?, 'SALE', ?, ?, (SELECT current_balance FROM customers WHERE customer_id = ?), ?)`).run(customer.customer_id, saleId, debtPaise, customer.customer_id, `Debited from invoice ${invoiceNo}`);
        }
        db.prepare(`UPDATE settings SET value = CAST((CAST(value AS INTEGER) + 1) AS TEXT) WHERE key = 'next_invoice_no'`).run();
        db.prepare(`INSERT INTO audit_log (user_id, action, entity, entity_id, detail) VALUES (?, 'CHECKOUT', 'sale', ?, ?)`).run(userId, saleId, `LAN API POS Checkout Completed. Invoice: ${invoiceNo}`);
        return { invoiceNo, saleId };
      });
      const txResult = checkoutTx();
      res.json({ success: true, ...txResult });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  if (!isPackaged) {
    app2.post("/api/dev/ipc", requireRole("BACKUP_RESTORE"), async (req, res) => {
      const { channel, args } = req.body;
      try {
        let result;
        const db = getDB2();
        if (channel === "db-query") {
          result = db.prepare(args[0]).all(...args[1] || []);
        } else if (channel === "db-get") {
          result = db.prepare(args[0]).get(...args[1] || []);
        } else if (channel === "db-run") {
          const runRes = db.prepare(args[0]).run(...args[1] || []);
          result = { changes: runRes.changes, lastInsertRowid: runRes.lastInsertRowid };
        } else if (channel === "db-transaction") {
          const runTx = db.transaction((txQueries) => {
            const results = [];
            for (const q of txQueries) {
              results.push(db.prepare(q.sql).run(...q.params));
            }
            return results;
          });
          result = runTx(args[0]);
        } else if (channel === "get-db-config") {
          result = activeConfig2;
        } else if (channel === "set-db-config") {
          if (activeConfig2) {
            Object.assign(activeConfig2, args[0]);
            if (configPath2)
              fs.writeFileSync(configPath2, JSON.stringify(activeConfig2, null, 2));
            if (args[0].dbPath && initDB2 && schemaSql2) {
              initDB2(args[0].dbPath, schemaSql2);
            }
          }
          result = activeConfig2;
        } else if (channel === "get-lan-info") {
          const interfaces = import_os.default.networkInterfaces();
          let ip = "127.0.0.1";
          for (const name of Object.keys(interfaces)) {
            for (const iface of interfaces[name] || []) {
              if (iface.family === "IPv4" && !iface.internal)
                ip = iface.address;
            }
          }
          result = { ip, port: 47615 };
        } else {
          return res.status(400).json({ error: `Unknown channel ${channel}` });
        }
        res.json(result);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });
  }
  app2.get("/api/warranty/:serial", requireRole("READ_DASHBOARD"), (req, res) => {
    const { serial } = req.params;
    try {
      const db = getDB2();
      const instance = db.prepare(`SELECT pi.*, p.brand_name, p.model_name, p.category FROM product_instances pi JOIN products p ON pi.product_id = p.product_id WHERE pi.serial_number = ?`).get(serial);
      if (!instance)
        return res.json({ found: false });
      const saleItem = db.prepare(`SELECT si.*, s.invoice_no, s.created_at as sale_date, s.customer_id, c.name as customer_name, c.phone as customer_phone FROM sale_items si JOIN sales s ON si.sale_id = s.sale_id LEFT JOIN customers c ON s.customer_id = c.customer_id WHERE si.instance_id = ? AND s.status = 'COMPLETED'`).get(instance.instance_id);
      const now = /* @__PURE__ */ new Date();
      let warranty_valid = false;
      if (instance.warranty_expires_at) {
        const expires = new Date(instance.warranty_expires_at);
        expires.setHours(23, 59, 59, 999);
        warranty_valid = now <= expires;
      }
      return res.json({ found: true, instance, sold_by_us: !!saleItem, sale: saleItem || null, warranty_valid });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });
  app2.post("/api/returns/validate", requireRole("ISSUE_CN"), (req, res) => {
    const { serial } = req.body;
    try {
      const db = getDB2();
      const instance = db.prepare("SELECT * FROM product_instances WHERE serial_number = ?").get(serial);
      if (!instance)
        return res.json({ outcome: "REJECT_UNKNOWN", message: "Never part of our inventory." });
      if (instance.status === "RMA_RETURNED")
        return res.json({ outcome: "REJECT_ALREADY_RETURNED", message: "This unit has already been returned (RMA_RETURNED)." });
      const saleItem = db.prepare(`SELECT si.*, s.invoice_no, s.created_at as sale_date, s.customer_id, s.payment_mode, c.name as customer_name, c.phone as customer_phone FROM sale_items si JOIN sales s ON si.sale_id = s.sale_id LEFT JOIN customers c ON s.customer_id = c.customer_id WHERE si.instance_id = ? AND s.status = 'COMPLETED'`).get(instance.instance_id);
      if (!saleItem)
        return res.json({ outcome: "REJECT_NEVER_SOLD", message: "In stock registry but never sold to a customer." });
      return res.json({ outcome: "ALLOW", saleItem, instance });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });
  app2.post("/api/returns/accept", requireRole("ISSUE_CN"), (req, res) => {
    const { serial, reason, resolution, refund_amount, replacement_serial, condition_sealed } = req.body;
    const userId = req.session.user_id;
    try {
      const db = getDB2();
      const tx = db.transaction(() => {
        const instance = db.prepare("SELECT * FROM product_instances WHERE serial_number = ?").get(serial);
        if (!instance || instance.status === "RMA_RETURNED")
          throw new Error("Invalid or already returned serial.");
        const saleItem = db.prepare(`SELECT si.*, s.payment_mode, s.customer_id, s.sale_id FROM sale_items si JOIN sales s ON si.sale_id = s.sale_id WHERE si.instance_id = ? AND s.status = 'COMPLETED'`).get(instance.instance_id);
        if (!saleItem)
          throw new Error("Sale item not found.");
        if (refund_amount > saleItem.unit_price)
          throw new Error("Refund amount cannot exceed original unit price.");
        let newStatus = "RMA_RETURNED";
        if (resolution === "CREDIT_NOTE" && condition_sealed)
          newStatus = "IN_STOCK";
        db.prepare("UPDATE product_instances SET status = ? WHERE instance_id = ?").run(newStatus, instance.instance_id);
        let creditNoteNo = null;
        let cnId = null;
        if (resolution === "CREDIT_NOTE") {
          const prefixRow = db.prepare("SELECT value FROM settings WHERE key = 'cn_prefix'").get();
          const sequenceRow = db.prepare("SELECT value FROM settings WHERE key = 'next_cn_no'").get();
          const prefix = prefixRow?.value || "CN-";
          const sequence = sequenceRow?.value || "1";
          creditNoteNo = `${prefix}${sequence}`;
          db.prepare(`INSERT INTO credit_notes (cn_no, sale_id, instance_id, amount, reason) VALUES (?, ?, ?, ?, ?)`).run(creditNoteNo, saleItem.sale_id, instance.instance_id, refund_amount, reason);
          cnId = db.prepare("SELECT last_insert_rowid() as id").get().id;
          db.prepare(`INSERT OR REPLACE INTO settings (key, value) VALUES ('next_cn_no', CAST((CAST(? AS INTEGER) + 1) AS TEXT))`).run(sequence);
          if (saleItem.payment_mode === "UDHAAR" && saleItem.customer_id) {
            db.prepare("UPDATE customers SET current_balance = current_balance - ? WHERE customer_id = ?").run(refund_amount, saleItem.customer_id);
            const cust = db.prepare("SELECT current_balance FROM customers WHERE customer_id = ?").get(saleItem.customer_id);
            db.prepare(`INSERT INTO customer_ledger (customer_id, type, ref_id, amount, balance_after, note) VALUES (?, 'RETURN', (SELECT cn_id FROM credit_notes WHERE cn_no = ?), ?, ?, ?)`).run(saleItem.customer_id, creditNoteNo, refund_amount, cust.current_balance, `Credit Note ${creditNoteNo}`);
          }
        } else if (resolution === "REPLACEMENT") {
          if (!replacement_serial)
            throw new Error("Replacement serial is required.");
          const repInstance = db.prepare("SELECT * FROM product_instances WHERE serial_number = ? AND status = 'IN_STOCK'").get(replacement_serial);
          if (!repInstance)
            throw new Error("Replacement serial not found or not IN_STOCK.");
          if (repInstance.product_id !== instance.product_id)
            throw new Error("Replacement must be of the same product.");
          const prodRow = db.prepare("SELECT warranty_months FROM products WHERE product_id = ?").get(instance.product_id);
          const warrantyMonths = prodRow?.warranty_months ?? 12;
          db.prepare(`UPDATE product_instances SET status = 'SOLD', sold_at = datetime('now'), warranty_expires_at = datetime('now', '+' || ? || ' months') WHERE instance_id = ?`).run(warrantyMonths, repInstance.instance_id);
          db.prepare(`INSERT INTO sale_items (sale_id, product_id, instance_id, quantity, unit_price, line_discount, line_total) VALUES (?, ?, ?, 1, 0, 0, 0)`).run(saleItem.sale_id, repInstance.product_id, repInstance.instance_id);
        } else if (resolution === "SEND_TO_COMPANY") {
          db.prepare(`INSERT INTO rma_register (instance_id, reason, status) VALUES (?, ?, 'SENT')`).run(instance.instance_id, reason);
        }
        db.prepare(`INSERT INTO audit_log (user_id, action, entity, entity_id, detail) VALUES (?, 'RETURN_ACCEPT', 'product_instances', ?, ?)`).run(userId, instance.instance_id, `Resolution: ${resolution}, Refund: ${refund_amount}, Reason: ${reason}`);
        return { success: true, creditNoteNo, cnId, newStatus };
      });
      res.json(tx());
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  const ownerOnly = requireRole("BACKUP_RESTORE");
  app2.get("/api/reports/margin", ownerOnly, (req, res) => {
    const { startDate, endDate } = req.query;
    try {
      const db = getDB2();
      const query = `
        SELECT date(s.created_at) as date, p.category, p.brand_name, s.tier_applied,
               SUM(si.line_total) as revenue,
               SUM(si.unit_cost * si.quantity) as cogs,
               SUM(si.line_total - (si.unit_cost * si.quantity)) as profit
        FROM sale_items si
        JOIN sales s ON si.sale_id = s.sale_id
        JOIN products p ON si.product_id = p.product_id
        WHERE s.status != 'CANCELLED'
        ${startDate ? `AND s.created_at >= ?` : ""}
        ${endDate ? `AND s.created_at <= ?` : ""}
        GROUP BY date, p.category, p.brand_name, s.tier_applied
        ORDER BY date DESC
      `;
      const params = [];
      if (startDate)
        params.push(startDate + " 00:00:00");
      if (endDate)
        params.push(endDate + " 23:59:59");
      res.json({ success: true, data: db.prepare(query).all(...params) });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app2.get("/api/reports/sales", ownerOnly, (req, res) => {
    const { startDate, endDate } = req.query;
    try {
      const db = getDB2();
      const query = `
        SELECT date(s.created_at) as date, p.category, p.brand_name, s.tier_applied,
               SUM(si.line_total) as total_revenue,
               SUM(si.quantity) as items_sold,
               COUNT(DISTINCT s.sale_id) as invoices_count
        FROM sale_items si
        JOIN sales s ON si.sale_id = s.sale_id
        JOIN products p ON si.product_id = p.product_id
        WHERE s.status != 'CANCELLED'
        ${startDate ? `AND s.created_at >= ?` : ""}
        ${endDate ? `AND s.created_at <= ?` : ""}
        GROUP BY date, p.category, p.brand_name, s.tier_applied
        ORDER BY date DESC
      `;
      const params = [];
      if (startDate)
        params.push(startDate + " 00:00:00");
      if (endDate)
        params.push(endDate + " 23:59:59");
      res.json({ success: true, data: db.prepare(query).all(...params) });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app2.get("/api/reports/low-stock", ownerOnly, (req, res) => {
    try {
      const db = getDB2();
      const data = db.prepare(`
        SELECT p.product_id, p.sku_code, p.model_name, p.min_restock_level,
               s.name as supplier_name,
               (SELECT COUNT(*) FROM product_instances pi WHERE pi.product_id = p.product_id AND pi.status = 'IN_STOCK') + p.loose_qty as in_stock_qty
        FROM products p
        LEFT JOIN suppliers s ON p.supplier_id = s.supplier_id
        WHERE ((SELECT COUNT(*) FROM product_instances pi WHERE pi.product_id = p.product_id AND pi.status = 'IN_STOCK') + p.loose_qty) <= p.min_restock_level
        ORDER BY s.name, p.model_name
      `).all();
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app2.get("/api/reports/dead-stock", ownerOnly, (req, res) => {
    const days = parseInt(req.query.days || "30", 10);
    try {
      const db = getDB2();
      const data = db.prepare(`
        SELECT p.product_id, p.sku_code, p.model_name,
               MAX(s.created_at) as last_sale_date,
               (SELECT COUNT(*) FROM product_instances pi WHERE pi.product_id = p.product_id AND pi.status = 'IN_STOCK') + p.loose_qty as in_stock_qty
        FROM products p
        LEFT JOIN sale_items si ON p.product_id = si.product_id
        LEFT JOIN sales s ON si.sale_id = s.sale_id
        GROUP BY p.product_id
        HAVING (last_sale_date IS NULL OR last_sale_date <= datetime('now', ?))
           AND in_stock_qty > 0
        ORDER BY last_sale_date ASC
      `).all(`-${days} days`);
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app2.get("/api/reports/valuation", ownerOnly, (req, res) => {
    try {
      const db = getDB2();
      const data = db.prepare(`
        SELECT 
          (SELECT SUM(purchase_cost) FROM product_instances WHERE status = 'IN_STOCK') as serialized_value,
          (SELECT SUM(loose_qty * purchase_cost) FROM products) as loose_value
      `).get();
      const total = (data.serialized_value || 0) + (data.loose_value || 0);
      res.json({ success: true, data: { ...data, total_value: total } });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app2.get("/api/reports/gstr1", ownerOnly, (req, res) => {
    const { startDate, endDate } = req.query;
    try {
      const db = getDB2();
      const query = `
        SELECT s.sale_id, s.invoice_no, s.created_at, c.gstin, c.name as customer_name,
               s.subtotal, s.discount, s.cgst, s.sgst, s.igst, s.grand_total,
               (SELECT GROUP_CONCAT(DISTINCT p.gst_rate) FROM sale_items si JOIN products p ON si.product_id = p.product_id WHERE si.sale_id = s.sale_id) as gst_rates
        FROM sales s
        LEFT JOIN customers c ON s.customer_id = c.customer_id
        WHERE s.status != 'CANCELLED'
        ${startDate ? `AND s.created_at >= ?` : ""}
        ${endDate ? `AND s.created_at <= ?` : ""}
        ORDER BY s.created_at DESC
      `;
      const params = [];
      if (startDate)
        params.push(startDate + " 00:00:00");
      if (endDate)
        params.push(endDate + " 23:59:59");
      const invoices = db.prepare(query).all(...params);
      let total_cgst = 0, total_sgst = 0, total_igst = 0;
      invoices.forEach((inv) => {
        total_cgst += inv.cgst;
        total_sgst += inv.sgst;
        total_igst += inv.igst;
      });
      res.json({
        success: true,
        data: {
          invoices,
          summary: {
            total_cgst,
            total_sgst,
            total_igst,
            total_taxable: invoices.reduce((sum, i) => sum + (i.grand_total - i.cgst - i.sgst - i.igst), 0)
          }
        }
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app2.get("/api/reports/udhaar", ownerOnly, (req, res) => {
    try {
      const db = getDB2();
      const customers = db.prepare(`
        SELECT customer_id, name, phone, current_balance, credit_limit, credit_due_date
        FROM customers
        WHERE current_balance > 0
        ORDER BY current_balance DESC
      `).all();
      const total_receivable = customers.reduce((sum, c) => sum + c.current_balance, 0);
      res.json({ success: true, data: { customers, total_receivable } });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  return app2;
}

// electron/main.ts
var userDataPath = import_electron.app.getPath("userData");
var configPath = path.join(userDataPath, "db-config.json");
var activeConfig = {
  dbPath: path.join(userDataPath, "chauhan-erp.db"),
  backupDir: ""
};
var sessionStore = /* @__PURE__ */ new Map();
if (fs2.existsSync(configPath)) {
  try {
    activeConfig = JSON.parse(fs2.readFileSync(configPath, "utf8"));
  } catch (e) {
    console.error("Error reading db-config.json, using defaults", e);
  }
} else {
  fs2.writeFileSync(configPath, JSON.stringify(activeConfig, null, 2));
}
var schemaSql = "";
var devSchemaPath = path.join(__dirname, "../../packages/core/schema.sql");
var prodSchemaPath = path.join(process.resourcesPath, "schema.sql");
if (fs2.existsSync(devSchemaPath)) {
  schemaSql = fs2.readFileSync(devSchemaPath, "utf8");
} else if (fs2.existsSync(prodSchemaPath)) {
  schemaSql = fs2.readFileSync(prodSchemaPath, "utf8");
} else {
  schemaSql = `
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
    CREATE TABLE IF NOT EXISTS users (user_id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, pin_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('OWNER','CASHIER','STOCK','TECHNICIAN')), active INTEGER DEFAULT 1);
    CREATE TABLE IF NOT EXISTS audit_log (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER REFERENCES users(user_id), action TEXT, entity TEXT, entity_id INTEGER, detail TEXT, created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS customers (customer_id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, phone TEXT UNIQUE NOT NULL, shop_name TEXT, tier TEXT NOT NULL DEFAULT 'COUNTER' CHECK(tier IN ('COUNTER','DEALER','DISTRIBUTOR')), gstin TEXT, credit_limit INTEGER DEFAULT 0, current_balance INTEGER DEFAULT 0, credit_due_date TEXT, created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS customer_ledger (id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id INTEGER REFERENCES customers(customer_id), type TEXT CHECK(type IN ('SALE','PAYMENT','ADJUSTMENT','RETURN')), ref_id INTEGER, amount INTEGER, balance_after INTEGER, note TEXT, created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS suppliers (supplier_id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, phone TEXT, gstin TEXT, current_payable INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS products (product_id INTEGER PRIMARY KEY AUTOINCREMENT, sku_code TEXT UNIQUE, brand_name TEXT, model_name TEXT, category TEXT, hsn_code TEXT, gst_rate INTEGER DEFAULT 18, requires_serial INTEGER DEFAULT 1, warranty_months INTEGER DEFAULT 12, min_restock_level INTEGER DEFAULT 5, counter_price INTEGER, dealer_price INTEGER, distributor_price INTEGER, loose_qty INTEGER DEFAULT 0, purchase_cost INTEGER DEFAULT 0, supplier_id INTEGER REFERENCES suppliers(supplier_id), created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS product_fitment (id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER REFERENCES products(product_id) ON DELETE CASCADE, vehicle_tag TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS product_instances (instance_id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER NOT NULL REFERENCES products(product_id), serial_number TEXT UNIQUE NOT NULL, status TEXT NOT NULL DEFAULT 'IN_STOCK' CHECK(status IN ('IN_STOCK','SOLD','RMA_RETURNED','IN_REPAIR','SCRAPPED')), batch_number TEXT, purchase_cost INTEGER, grn_id INTEGER, received_at TEXT DEFAULT (datetime('now')), sold_at TEXT, warranty_expires_at TEXT);
    CREATE TABLE IF NOT EXISTS grn (grn_id INTEGER PRIMARY KEY AUTOINCREMENT, supplier_id INTEGER REFERENCES suppliers(supplier_id), invoice_ref TEXT, total_cost INTEGER DEFAULT 0, received_by INTEGER REFERENCES users(user_id), created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS sales (sale_id INTEGER PRIMARY KEY AUTOINCREMENT, invoice_no TEXT UNIQUE, customer_id INTEGER REFERENCES customers(customer_id), tier_applied TEXT NOT NULL, subtotal INTEGER, discount INTEGER DEFAULT 0, cgst INTEGER DEFAULT 0, sgst INTEGER DEFAULT 0, igst INTEGER DEFAULT 0, grand_total INTEGER, amount_paid INTEGER, payment_mode TEXT, status TEXT DEFAULT 'COMPLETED' CHECK(status IN ('HELD','COMPLETED','CANCELLED')), sold_by INTEGER REFERENCES users(user_id), created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS sale_items (sale_item_id INTEGER PRIMARY KEY AUTOINCREMENT, sale_id INTEGER REFERENCES sales(sale_id) ON DELETE CASCADE, product_id INTEGER REFERENCES products(product_id), instance_id UNIQUE REFERENCES product_instances(instance_id), quantity INTEGER DEFAULT 1, unit_price INTEGER, line_discount INTEGER DEFAULT 0, line_total INTEGER, unit_cost INTEGER DEFAULT 0);
    CREATE TABLE IF NOT EXISTS credit_notes (cn_id INTEGER PRIMARY KEY AUTOINCREMENT, cn_no TEXT UNIQUE, sale_id INTEGER REFERENCES sales(sale_id), instance_id REFERENCES product_instances(instance_id), amount INTEGER, reason TEXT, created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS rma_register (rma_id INTEGER PRIMARY KEY AUTOINCREMENT, instance_id INTEGER REFERENCES product_instances(instance_id), supplier_id INTEGER REFERENCES suppliers(supplier_id), reason TEXT, status TEXT NOT NULL DEFAULT 'SENT' CHECK(status IN ('SENT','REPLACED','CREDITED','RECEIVED_BACK')), sent_at TEXT DEFAULT (datetime('now')), resolved_at TEXT, note TEXT);
    CREATE TABLE IF NOT EXISTS repair_jobs (job_id INTEGER PRIMARY KEY AUTOINCREMENT, job_no TEXT UNIQUE, customer_id INTEGER REFERENCES customers(customer_id), customer_phone TEXT NOT NULL, customer_name TEXT, product_name TEXT, serial_number TEXT, sold_by_us INTEGER DEFAULT 0, is_warranty INTEGER DEFAULT 0, issue_reported TEXT, technician_notes TEXT, technician_id INTEGER REFERENCES users(user_id), status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','IN_REPAIR','SENT_TO_COMPANY','READY','DELIVERED')), est_cost INTEGER, parts_cost INTEGER DEFAULT 0, labour_cost INTEGER DEFAULT 0, advance_paid INTEGER DEFAULT 0, final_cost INTEGER, intake_date TEXT DEFAULT (datetime('now')), ready_date TEXT, delivered_date TEXT);
    CREATE TABLE IF NOT EXISTS repair_parts (id INTEGER PRIMARY KEY AUTOINCREMENT, job_id INTEGER REFERENCES repair_jobs(job_id) ON DELETE CASCADE, product_id INTEGER REFERENCES products(product_id), instance_id REFERENCES product_instances(instance_id), qty INTEGER DEFAULT 1, cost INTEGER);
    CREATE TABLE IF NOT EXISTS repair_status_history (id INTEGER PRIMARY KEY AUTOINCREMENT, job_id INTEGER REFERENCES repair_jobs(job_id) ON DELETE CASCADE, old_status TEXT, new_status TEXT, changed_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS sms_outbox (id INTEGER PRIMARY KEY AUTOINCREMENT, phone TEXT, body TEXT, channel TEXT DEFAULT 'SMS' CHECK(channel IN ('SMS','WHATSAPP')), status TEXT DEFAULT 'QUEUED' CHECK(status IN ('QUEUED','SENT','FAILED')), created_at TEXT DEFAULT (datetime('now')), sent_at TEXT, retry_count INTEGER DEFAULT 0);
    CREATE TABLE IF NOT EXISTS expenses (id INTEGER PRIMARY KEY AUTOINCREMENT, category TEXT, amount INTEGER, note TEXT, created_at TEXT DEFAULT (datetime('now')));
  `;
}
try {
  initDB(activeConfig.dbPath, schemaSql);
  console.log(`Database initialized successfully at ${activeConfig.dbPath}`);
  try {
    const db = getDB();
    const cols = db.prepare("PRAGMA table_info(sms_outbox)").all();
    if (!cols.find((c) => c.name === "channel")) {
      db.prepare("ALTER TABLE sms_outbox ADD COLUMN channel TEXT DEFAULT 'SMS'").run();
      console.log("Migration: added channel column to sms_outbox");
    }
  } catch (migErr) {
    console.error("Migration error (channel):", migErr);
  }
  try {
    const db = getDB();
    const prodCols = db.prepare("PRAGMA table_info(products)").all();
    if (!prodCols.find((c) => c.name === "purchase_cost")) {
      db.prepare("ALTER TABLE products ADD COLUMN purchase_cost INTEGER DEFAULT 0").run();
      console.log("Migration: added purchase_cost to products");
    }
    if (!prodCols.find((c) => c.name === "supplier_id")) {
      db.prepare("ALTER TABLE products ADD COLUMN supplier_id INTEGER REFERENCES suppliers(supplier_id)").run();
      console.log("Migration: added supplier_id to products");
    }
    const siCols = db.prepare("PRAGMA table_info(sale_items)").all();
    if (!siCols.find((c) => c.name === "unit_cost")) {
      db.prepare("ALTER TABLE sale_items ADD COLUMN unit_cost INTEGER DEFAULT 0").run();
      console.log("Migration: added unit_cost to sale_items");
    }
  } catch (migErr) {
    console.error("Migration error (reports):", migErr);
  }
} catch (err) {
  console.error("Failed to initialize database", err);
}
var activeDesktopSession = null;
function handleElevated(channel, action, handler) {
  import_electron.ipcMain.handle(channel, async (event, ...args) => {
    assertCan(activeDesktopSession?.role, action);
    return handler(event, ...args);
  });
}
var PORT = 47615;
var serverInstance = null;
function startExpressServer() {
  if (serverInstance)
    return;
  const expressApp = createApiServer({
    getDB,
    sessionStore,
    isPackaged: import_electron.app.isPackaged,
    mainWindow,
    activeConfig,
    configPath,
    initDB,
    schemaSql
  });
  serverInstance = expressApp.listen(PORT, "0.0.0.0", () => {
    console.log(`Express LAN API server listening on http://0.0.0.0:${PORT}`);
  });
}
import_electron.ipcMain.handle("verify-desktop-pin", (e, pin) => {
  const db = getDB();
  const users = db.prepare("SELECT * FROM users WHERE active = 1").all();
  const bcrypt2 = require("bcryptjs");
  const matchedUser = users.find((u) => bcrypt2.compareSync(pin, u.pin_hash));
  if (matchedUser) {
    const userPayload = { user_id: matchedUser.user_id, role: matchedUser.role, name: matchedUser.name };
    activeDesktopSession = userPayload;
    return { success: true, user: userPayload };
  }
  return { success: false, error: "Invalid PIN" };
});
import_electron.ipcMain.handle("desktop-logout", () => {
  activeDesktopSession = null;
  return true;
});
function getLocalIpAddress() {
  const interfaces = os2.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "127.0.0.1";
}
function performBackup(backupFolder) {
  if (!backupFolder || !fs2.existsSync(backupFolder)) {
    throw new Error("Backup directory does not exist or is not set.");
  }
  const dateStr = (/* @__PURE__ */ new Date()).toISOString().replace(/T/, "_").replace(/\..+/, "").replace(/:/g, "-");
  const backupFileName = `chauhan_erp_backup_${dateStr}.db`;
  const destinationPath = path.join(backupFolder, backupFileName);
  fs2.copyFileSync(activeConfig.dbPath, destinationPath);
  return destinationPath;
}
handleElevated("db-query", "BACKUP_RESTORE", async (event, sql, params = []) => {
  const db = getDB();
  return db.prepare(sql).all(...params);
});
handleElevated("db-get", "BACKUP_RESTORE", async (event, sql, params = []) => {
  const db = getDB();
  return db.prepare(sql).get(...params);
});
handleElevated("db-run", "BACKUP_RESTORE", async (event, sql, params = []) => {
  const db = getDB();
  const res = db.prepare(sql).run(...params);
  return {
    changes: res.changes,
    lastInsertRowid: res.lastInsertRowid
  };
});
handleElevated("db-transaction", "BACKUP_RESTORE", async (event, queries) => {
  const db = getDB();
  const runTx = db.transaction((txQueries) => {
    const results = [];
    for (const q of txQueries) {
      results.push(db.prepare(q.sql).run(...q.params));
    }
    return results;
  });
  return runTx(queries);
});
import_electron.ipcMain.handle("get-db-config", async () => {
  assertCan(activeDesktopSession?.role, "READ_DASHBOARD");
  return activeConfig;
});
handleElevated("set-db-config", "USER_MGMT", async (event, newConfig) => {
  activeConfig = { ...activeConfig, ...newConfig };
  fs2.writeFileSync(configPath, JSON.stringify(activeConfig, null, 2));
  if (newConfig.dbPath) {
    initDB(activeConfig.dbPath, schemaSql);
  }
  return activeConfig;
});
handleElevated("select-directory", "BACKUP_RESTORE", async () => {
  const result = await import_electron.dialog.showOpenDialog({
    properties: ["openDirectory"]
  });
  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
});
handleElevated("select-file", "BACKUP_RESTORE", async (event, filters) => {
  const result = await import_electron.dialog.showOpenDialog({
    properties: ["openFile"],
    filters
  });
  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
});
handleElevated("backup-now", "BACKUP_RESTORE", async () => {
  if (!activeConfig.backupDir) {
    throw new Error("No backup directory configured");
  }
  return performBackup(activeConfig.backupDir);
});
handleElevated("restore-db", "BACKUP_RESTORE", async (event, backupFilePath) => {
  if (!fs2.existsSync(backupFilePath)) {
    throw new Error("Selected backup file does not exist");
  }
  const safetyDir = userDataPath;
  const safetyBackupPath = path.join(safetyDir, "chauhan_erp_safety_backup_before_restore.db");
  fs2.copyFileSync(activeConfig.dbPath, safetyBackupPath);
  try {
    const tempDb = new (require("better-sqlite3"))(backupFilePath);
    const integrity = tempDb.pragma("integrity_check");
    tempDb.close();
    if (integrity[0]?.integrity_check !== "ok" && integrity[0] !== "ok") {
      throw new Error("Integrity check failed on backup file");
    }
    fs2.copyFileSync(backupFilePath, activeConfig.dbPath);
    const walFile = `${activeConfig.dbPath}-wal`;
    const shmFile = `${activeConfig.dbPath}-shm`;
    if (fs2.existsSync(walFile))
      fs2.unlinkSync(walFile);
    if (fs2.existsSync(shmFile))
      fs2.unlinkSync(shmFile);
    initDB(activeConfig.dbPath, schemaSql);
    return { success: true };
  } catch (err) {
    fs2.copyFileSync(safetyBackupPath, activeConfig.dbPath);
    initDB(activeConfig.dbPath, schemaSql);
    throw new Error(`Restore failed: ${err.message}. Safety backup restored.`);
  }
});
import_electron.ipcMain.handle("get-lan-info", async () => {
  assertCan(activeDesktopSession?.role, "READ_DASHBOARD");
  return {
    ip: getLocalIpAddress(),
    port: PORT
  };
});
import_electron.ipcMain.handle("get-customers-aging", async () => {
  assertCan(activeDesktopSession?.role, "READ_CUSTOMERS");
  const db = getDB();
  const customers = db.prepare("SELECT * FROM customers").all();
  return customers.map((c) => {
    const aging = calculateAging(c, /* @__PURE__ */ new Date());
    return {
      ...c,
      aging
    };
  });
});
import_electron.ipcMain.handle("get-customer-ledger", async (event, customerId) => {
  assertCan(activeDesktopSession?.role, "READ_CUSTOMERS");
  const db = getDB();
  return db.prepare("SELECT * FROM customer_ledger WHERE customer_id = ? ORDER BY id DESC").all(customerId);
});
import_electron.ipcMain.handle("record-udhaar-payment", async (event, customerId, amount, note) => {
  assertCan(activeDesktopSession?.role, "RECORD_PAYMENT");
  const db = getDB();
  const tx = db.transaction(() => {
    db.prepare("UPDATE customers SET current_balance = current_balance - ? WHERE customer_id = ?").run(amount, customerId);
    const newCustomer = db.prepare("SELECT current_balance FROM customers WHERE customer_id = ?").get(customerId);
    db.prepare(`
      INSERT INTO customer_ledger (customer_id, type, amount, balance_after, note)
      VALUES (?, 'PAYMENT', ?, ?, ?)
    `).run(customerId, amount, newCustomer.current_balance, note);
    db.prepare("INSERT INTO audit_log (user_id, action, entity, entity_id, detail) VALUES (?, 'RECORD_PAYMENT', 'customer_ledger', ?, ?)").run(activeDesktopSession?.user_id, customerId, `Payment amount: ${amount}`);
    return newCustomer.current_balance;
  });
  return tx();
});
import_electron.ipcMain.handle("queue-sms-reminder", async (event, customerId) => {
  assertCan(activeDesktopSession?.role, "RECORD_PAYMENT");
  const db = getDB();
  const customer = db.prepare("SELECT * FROM customers WHERE customer_id = ?").get(customerId);
  if (!customer || !customer.phone)
    throw new Error("Customer or phone not found");
  const shopNameRow = db.prepare("SELECT value FROM settings WHERE key = 'shop_name'").get();
  const shopName = shopNameRow?.value || "Chauhan Electronics";
  const body = formatPaymentReminder(customer, shopName);
  db.prepare(`
    INSERT INTO sms_outbox (phone, body, status) VALUES (?, ?, 'QUEUED')
  `).run(customer.phone, body);
  return true;
});
import_electron.ipcMain.handle("get-suppliers", async () => {
  assertCan(activeDesktopSession?.role, "READ_SUPPLIERS");
  const db = getDB();
  return db.prepare("SELECT * FROM suppliers ORDER BY name ASC").all();
});
handleElevated("create-supplier", "CREATE_SUPPLIER", async (event, name, phone, gstin) => {
  const db = getDB();
  const res = db.prepare(
    "INSERT INTO suppliers (name, phone, gstin, current_payable) VALUES (?, ?, ?, 0)"
  ).run(name, phone || null, gstin || null);
  return res.lastInsertRowid;
});
import_electron.ipcMain.handle("get-supplier-ledger", async (event, supplierId) => {
  assertCan(activeDesktopSession?.role, "READ_SUPPLIERS");
  const db = getDB();
  const grns = db.prepare(`
    SELECT grn_id as id, 'PURCHASE' as type, invoice_ref as ref, total_cost as amount, created_at
    FROM grn 
    WHERE supplier_id = ?
  `).all(supplierId);
  const payments = db.prepare(`
    SELECT id, 'PAYMENT' as type, '' as ref, amount, created_at, note
    FROM expenses 
    WHERE category = 'SUPPLIER_PAYMENT' AND note LIKE ?
  `).all(`Supplier ID: ${supplierId} %`);
  const ledger = [...grns, ...payments].sort((a, b) => {
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
  return ledger;
});
import_electron.ipcMain.handle("record-supplier-payment", async (event, supplierId, amount, note) => {
  assertCan(activeDesktopSession?.role, "RECORD_PAYMENT");
  const db = getDB();
  const tx = db.transaction(() => {
    db.prepare("UPDATE suppliers SET current_payable = current_payable - ? WHERE supplier_id = ?").run(amount, supplierId);
    db.prepare(`
      INSERT INTO expenses (category, amount, note) VALUES ('SUPPLIER_PAYMENT', ?, ?)
    `).run(amount, `Supplier ID: ${supplierId} | ${note}`);
    return true;
  });
  return tx();
});
import_electron.ipcMain.handle("commit-intake-batch", async (event, payload) => {
  assertCan(activeDesktopSession?.role, "RECEIVE_GRN");
  const { supplier_id, invoice_ref, total_cost_paise, user_id, items, type } = payload;
  const db = getDB();
  const tx = db.transaction(() => {
    const grnRes = db.prepare(`
      INSERT INTO grn (supplier_id, invoice_ref, total_cost, received_by)
      VALUES (?, ?, ?, ?)
    `).run(supplier_id || null, invoice_ref || "INTAKE", total_cost_paise, activeDesktopSession?.user_id);
    const grnId = grnRes.lastInsertRowid;
    if (supplier_id) {
      db.prepare("UPDATE suppliers SET current_payable = current_payable + ? WHERE supplier_id = ?").run(total_cost_paise, supplier_id);
    }
    if (type === "SERIALIZED") {
      for (const item of items) {
        db.prepare(`
          INSERT INTO product_instances (product_id, serial_number, status, batch_number, purchase_cost, grn_id)
          VALUES (?, ?, 'IN_STOCK', ?, ?, ?)
        `).run(item.product_id, item.serial_number, item.batch_number, item.purchase_cost, grnId);
      }
    } else if (type === "LOOSE") {
      for (const item of items) {
        db.prepare("UPDATE products SET loose_qty = loose_qty + ? WHERE product_id = ?").run(item.qty, item.product_id);
      }
    }
    db.prepare(`INSERT INTO audit_log (user_id, action, entity, entity_id, detail) VALUES (?, 'RECEIVE_GRN', 'grn', ?, ?)`).run(activeDesktopSession?.user_id, grnId, `Processed ${type} intake via LAN API.`);
    return grnId;
  });
  return tx();
});
import_electron.ipcMain.handle("create-product", async (event, payload) => {
  assertCan(activeDesktopSession?.role, "RECEIVE_GRN");
  const db = getDB();
  const tx = db.transaction(() => {
    const res = db.prepare(`
      INSERT INTO products (sku_code, brand_name, model_name, category, hsn_code, gst_rate, requires_serial, warranty_months, min_restock_level, counter_price, dealer_price, distributor_price, loose_qty)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `).run(
      payload.sku_code,
      payload.brand_name,
      payload.model_name,
      payload.category,
      payload.hsn_code,
      payload.gst_rate,
      payload.requires_serial ? 1 : 0,
      payload.warranty_months,
      payload.min_restock_level,
      payload.counter_price,
      payload.dealer_price,
      payload.distributor_price
    );
    const newId = res.lastInsertRowid;
    if (payload.fitment_tags && payload.fitment_tags.length > 0) {
      for (const tag of payload.fitment_tags) {
        db.prepare("INSERT INTO product_fitment (product_id, vehicle_tag) VALUES (?, ?)").run(newId, tag);
      }
    }
    db.prepare(`INSERT INTO audit_log (user_id, action, entity, entity_id, detail) VALUES (?, 'CREATE', 'product', ?, ?)`).run(activeDesktopSession?.user_id, newId, `Created product model: ${payload.brand_name} ${payload.model_name}`);
    return newId;
  });
  return tx();
});
import_electron.ipcMain.handle("get-repair-jobs", async () => {
  assertCan(activeDesktopSession?.role, "READ_REPAIRS");
  const db = getDB();
  return db.prepare("SELECT * FROM repair_jobs ORDER BY job_id DESC").all();
});
import_electron.ipcMain.handle("create-repair-job", async (event, payload) => {
  assertCan(activeDesktopSession?.role, "MANAGE_REPAIRS");
  const db = getDB();
  const tx = db.transaction(() => {
    const prefixRow = db.prepare("SELECT value FROM settings WHERE key = 'job_prefix'").get();
    const nextNoRow = db.prepare("SELECT value FROM settings WHERE key = 'next_job_no'").get();
    let prefix = prefixRow ? prefixRow.value : "JOB-";
    let nextNo = nextNoRow ? parseInt(nextNoRow.value, 10) : 1e3;
    if (!prefixRow)
      db.prepare("INSERT INTO settings (key, value) VALUES ('job_prefix', 'JOB-')").run();
    if (!nextNoRow)
      db.prepare("INSERT INTO settings (key, value) VALUES ('next_job_no', '1000')").run();
    const jobNo = `${prefix}${nextNo}`;
    let custId = payload.customer_id || null;
    if (!custId && payload.customer_phone) {
      const match = db.prepare("SELECT customer_id FROM customers WHERE phone = ?").get(payload.customer_phone);
      if (match)
        custId = match.customer_id;
    }
    const res = db.prepare(`
      INSERT INTO repair_jobs (
        job_no, customer_id, customer_phone, customer_name,
        product_name, serial_number, is_warranty,
        issue_reported, est_cost, advance_paid
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      jobNo,
      custId,
      payload.customer_phone,
      payload.customer_name,
      payload.product_name,
      payload.serial_number,
      payload.is_warranty ? 1 : 0,
      payload.issue_reported,
      payload.est_cost || 0,
      payload.advance_paid || 0
    );
    db.prepare("UPDATE settings SET value = ? WHERE key = 'next_job_no'").run((nextNo + 1).toString());
    return res.lastInsertRowid;
  });
  return tx();
});
import_electron.ipcMain.handle("get-repair-parts", async (event, jobId) => {
  assertCan(activeDesktopSession?.role, "READ_REPAIRS");
  const db = getDB();
  return db.prepare(`
    SELECT rp.*, p.brand_name, p.model_name 
    FROM repair_parts rp
    JOIN products p ON rp.product_id = p.product_id
    WHERE rp.job_id = ?
  `).all(jobId);
});
import_electron.ipcMain.handle("add-repair-part", async (event, jobId, type, item) => {
  assertCan(activeDesktopSession?.role, "MANAGE_REPAIRS");
  const db = getDB();
  const tx = db.transaction(() => {
    let cost = item.cost;
    if (type === "SERIALIZED") {
      const res = db.prepare("UPDATE product_instances SET status = 'SOLD' WHERE instance_id = ? AND status = 'IN_STOCK'").run(item.instance_id);
      if (res.changes === 0)
        throw new Error("Serial number not available in stock.");
      db.prepare(`
        INSERT INTO repair_parts (job_id, product_id, instance_id, qty, cost)
        VALUES (?, ?, ?, 1, ?)
      `).run(jobId, item.product_id, item.instance_id, cost);
    } else {
      const prod = db.prepare("SELECT loose_qty FROM products WHERE product_id = ?").get(item.product_id);
      if (!prod || prod.loose_qty < item.qty)
        throw new Error("Not enough loose quantity in stock.");
      db.prepare("UPDATE products SET loose_qty = loose_qty - ? WHERE product_id = ?").run(item.qty, item.product_id);
      db.prepare(`
        INSERT INTO repair_parts (job_id, product_id, qty, cost)
        VALUES (?, ?, ?, ?)
      `).run(jobId, item.product_id, item.qty, cost * item.qty);
      cost = cost * item.qty;
    }
    db.prepare("UPDATE repair_jobs SET parts_cost = parts_cost + ? WHERE job_id = ?").run(cost, jobId);
    return true;
  });
  return tx();
});
import_electron.ipcMain.handle("update-repair-status", async (event, jobId, newStatus, notes) => {
  assertCan(activeDesktopSession?.role, "MANAGE_REPAIRS");
  const db = getDB();
  const tx = db.transaction(() => {
    const job = db.prepare("SELECT status FROM repair_jobs WHERE job_id = ?").get(jobId);
    if (!job)
      throw new Error("Job not found");
    if (job.status !== newStatus) {
      db.prepare("INSERT INTO repair_status_history (job_id, old_status, new_status) VALUES (?, ?, ?)").run(jobId, job.status, newStatus);
      let extraUpdate = "";
      let params = [newStatus];
      if (newStatus === "READY") {
        extraUpdate = ", ready_date = datetime('now')";
      }
      if (notes) {
        extraUpdate += ", technician_notes = ?";
        params.push(notes);
      }
      params.push(jobId);
      db.prepare(`UPDATE repair_jobs SET status = ?${extraUpdate} WHERE job_id = ?`).run(...params);
      db.prepare("INSERT INTO audit_log (user_id, action, entity, entity_id, detail) VALUES (?, 'REPAIR_STATUS_UPDATE', 'repair_jobs', ?, ?)").run(activeDesktopSession?.user_id, jobId, `Status changed from ${job.status} to ${newStatus}`);
    } else if (notes) {
      db.prepare(`UPDATE repair_jobs SET technician_notes = ? WHERE job_id = ?`).run(notes, jobId);
    }
    return true;
  });
  return tx();
});
import_electron.ipcMain.handle("deliver-repair-job", async (event, jobId, finalCost, labourCost) => {
  assertCan(activeDesktopSession?.role, "MANAGE_REPAIRS");
  const db = getDB();
  db.prepare(`
    UPDATE repair_jobs 
    SET status = 'DELIVERED', final_cost = ?, labour_cost = ?, delivered_date = datetime('now')
    WHERE job_id = ?
  `).run(finalCost, labourCost, jobId);
  return true;
});
handleElevated("record-expense", "RECORD_EXPENSE", async (event, category, amount, note) => {
  const db = getDB();
  const res = db.prepare(`
    INSERT INTO expenses (category, amount, note) VALUES (?, ?, ?)
  `).run(category, amount, note);
  return res.lastInsertRowid;
});
import_electron.ipcMain.handle("get-expenses", async (event, limit = 50) => {
  assertCan(activeDesktopSession?.role, "READ_ACCOUNTING");
  const db = getDB();
  return db.prepare(`
    SELECT * FROM expenses 
    WHERE category != 'SUPPLIER_PAYMENT' 
    ORDER BY created_at DESC LIMIT ?
  `).all(limit);
});
import_electron.ipcMain.handle("get-eod-reconciliation", async (event, dateStr) => {
  assertCan(activeDesktopSession?.role, "READ_ACCOUNTING");
  const db = getDB();
  const datePattern = `${dateStr}%`;
  const sales = db.prepare(`
    SELECT payment_mode, SUM(amount_paid) as total 
    FROM sales 
    WHERE created_at LIKE ? AND status = 'COMPLETED'
    GROUP BY payment_mode
  `).all(datePattern);
  let salesCash = 0;
  let salesDigital = 0;
  sales.forEach((s) => {
    if (s.payment_mode === "CASH")
      salesCash += s.total;
    else
      salesDigital += s.total;
  });
  const udhaarRow = db.prepare(`
    SELECT SUM(amount) as total FROM customer_ledger 
    WHERE type = 'PAYMENT' AND created_at LIKE ?
  `).get(datePattern);
  const udhaarReceived = udhaarRow?.total || 0;
  const expRow = db.prepare(`
    SELECT SUM(amount) as total FROM expenses 
    WHERE category != 'SUPPLIER_PAYMENT' AND created_at LIKE ?
  `).get(datePattern);
  const opsExpenses = expRow?.total || 0;
  const supRow = db.prepare(`
    SELECT SUM(amount) as total FROM expenses 
    WHERE category = 'SUPPLIER_PAYMENT' AND created_at LIKE ?
  `).get(datePattern);
  const supplierPayments = supRow?.total || 0;
  const cogsRow = db.prepare(`
    SELECT SUM(pi.purchase_cost) as total 
    FROM sale_items si
    JOIN product_instances pi ON si.instance_id = pi.instance_id
    JOIN sales s ON si.sale_id = s.sale_id
    WHERE s.created_at LIKE ? AND s.status = 'COMPLETED'
  `).get(datePattern);
  const serializedCOGS = cogsRow?.total || 0;
  return {
    salesCash,
    salesDigital,
    udhaarReceived,
    opsExpenses,
    supplierPayments,
    serializedCOGS,
    totalRevenue: salesCash + salesDigital,
    totalInflow: salesCash + salesDigital + udhaarReceived,
    totalOutflow: opsExpenses + supplierPayments,
    netMargin: salesCash + salesDigital - serializedCOGS - opsExpenses
  };
});
handleElevated("backup-database", "BACKUP_RESTORE", async (event) => {
  if (!mainWindow)
    return { success: false, error: "No main window" };
  const db = getDB();
  const { canceled, filePath } = await import_electron.dialog.showSaveDialog(mainWindow, {
    title: "Backup Database",
    defaultPath: `chauhan_erp_backup_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.sqlite`,
    filters: [{ name: "SQLite Database", extensions: ["sqlite"] }]
  });
  if (canceled || !filePath)
    return { success: false, error: "Canceled" };
  try {
    await db.backup(filePath);
    return { success: true, filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});
handleElevated("export-csv", "BACKUP_RESTORE", async (event, tableName) => {
  if (!mainWindow)
    return { success: false, error: "No main window" };
  const db = getDB();
  const allowed = ["sales", "customers", "products", "repair_jobs", "suppliers", "expenses"];
  if (!allowed.includes(tableName))
    return { success: false, error: "Invalid table" };
  const { canceled, filePath } = await import_electron.dialog.showSaveDialog(mainWindow, {
    title: `Export ${tableName} to CSV`,
    defaultPath: `${tableName}_export_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.csv`,
    filters: [{ name: "CSV Files", extensions: ["csv"] }]
  });
  if (canceled || !filePath)
    return { success: false, error: "Canceled" };
  try {
    const rows = db.prepare(`SELECT * FROM ${tableName}`).all();
    if (rows.length === 0) {
      fs2.writeFileSync(filePath, "No data found\\n");
      return { success: true, filePath };
    }
    const headers = Object.keys(rows[0]);
    const toCsv = (val) => {
      if (val === null || val === void 0)
        return '""';
      const str = String(val);
      if (str.includes(",") || str.includes('"') || str.includes("\\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };
    const csvLines = [
      headers.join(","),
      ...rows.map((row) => headers.map((h) => toCsv(row[h])).join(","))
    ];
    fs2.writeFileSync(filePath, csvLines.join("\\n"));
    return { success: true, filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});
handleElevated("export-raw-csv", "BACKUP_RESTORE", async (event, reportName, csvData) => {
  if (!mainWindow)
    return { success: false, error: "No main window" };
  const { canceled, filePath } = await import_electron.dialog.showSaveDialog(mainWindow, {
    title: `Export ${reportName} Report`,
    defaultPath: `${reportName}_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.csv`,
    filters: [{ name: "CSV Files", extensions: ["csv"] }]
  });
  if (canceled || !filePath)
    return { success: false, error: "Canceled" };
  try {
    fs2.writeFileSync(filePath, csvData);
    return { success: true, filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});
import_electron.ipcMain.handle("db-warranty-check", async (event, serial) => {
  assertCan(activeDesktopSession?.role, "READ_DASHBOARD");
  const db = getDB();
  const instance = db.prepare(`
    SELECT pi.*, p.brand_name, p.model_name, p.category 
    FROM product_instances pi
    JOIN products p ON pi.product_id = p.product_id
    WHERE pi.serial_number = ?
  `).get(serial);
  if (!instance)
    return { found: false };
  const saleItem = db.prepare(`
    SELECT si.*, s.invoice_no, s.created_at as sale_date, s.customer_id, c.name as customer_name, c.phone as customer_phone
    FROM sale_items si
    JOIN sales s ON si.sale_id = s.sale_id
    LEFT JOIN customers c ON s.customer_id = c.customer_id
    WHERE si.instance_id = ? AND s.status = 'COMPLETED'
  `).get(instance.instance_id);
  const now = /* @__PURE__ */ new Date();
  let warranty_valid = false;
  if (instance.warranty_expires_at) {
    const expires = new Date(instance.warranty_expires_at);
    expires.setHours(23, 59, 59, 999);
    warranty_valid = now <= expires;
  }
  return { found: true, instance, sold_by_us: !!saleItem, sale: saleItem || null, warranty_valid };
});
import_electron.ipcMain.handle("db-return-validate", async (event, serial) => {
  assertCan(activeDesktopSession?.role, "ISSUE_CN");
  const db = getDB();
  const instance = db.prepare("SELECT * FROM product_instances WHERE serial_number = ?").get(serial);
  if (!instance)
    return { outcome: "REJECT_UNKNOWN", message: "Never part of our inventory." };
  if (instance.status === "RMA_RETURNED")
    return { outcome: "REJECT_ALREADY_RETURNED", message: "Already returned." };
  const saleItem = db.prepare(`
    SELECT si.*, s.invoice_no, s.created_at as sale_date, s.customer_id, s.payment_mode, c.name as customer_name, c.phone as customer_phone
    FROM sale_items si
    JOIN sales s ON si.sale_id = s.sale_id
    LEFT JOIN customers c ON s.customer_id = c.customer_id
    WHERE si.instance_id = ? AND s.status = 'COMPLETED'
  `).get(instance.instance_id);
  if (!saleItem)
    return { outcome: "REJECT_NEVER_SOLD", message: "Never sold to a customer." };
  return { outcome: "ALLOW", saleItem, instance };
});
import_electron.ipcMain.handle("db-return-accept", async (event, payload) => {
  assertCan(activeDesktopSession?.role, "ISSUE_CN");
  const { serial, reason, resolution, refund_amount, replacement_serial, user_id, condition_sealed } = payload;
  const db = getDB();
  const tx = db.transaction(() => {
    const instance = db.prepare("SELECT * FROM product_instances WHERE serial_number = ?").get(serial);
    if (!instance || instance.status === "RMA_RETURNED")
      throw new Error("Invalid or already returned serial.");
    const saleItem = db.prepare(`
      SELECT si.*, s.payment_mode, s.customer_id, s.sale_id
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.sale_id
      WHERE si.instance_id = ? AND s.status = 'COMPLETED'
    `).get(instance.instance_id);
    if (!saleItem)
      throw new Error("Sale item not found.");
    if (refund_amount > saleItem.unit_price)
      throw new Error("Refund amount cannot exceed original unit price.");
    let newStatus = "RMA_RETURNED";
    if (resolution === "CREDIT_NOTE" && condition_sealed)
      newStatus = "IN_STOCK";
    db.prepare("UPDATE product_instances SET status = ? WHERE instance_id = ?").run(newStatus, instance.instance_id);
    let creditNoteNo = null;
    let cnId = null;
    if (resolution === "CREDIT_NOTE") {
      const prefixRow = db.prepare("SELECT value FROM settings WHERE key = 'cn_prefix'").get();
      const sequenceRow = db.prepare("SELECT value FROM settings WHERE key = 'next_cn_no'").get();
      const prefix = prefixRow?.value || "CN-";
      const sequence = sequenceRow?.value || "1";
      creditNoteNo = `${prefix}${sequence}`;
      db.prepare(`
        INSERT INTO credit_notes (cn_no, sale_id, instance_id, amount, reason)
        VALUES (?, ?, ?, ?, ?)
      `).run(creditNoteNo, saleItem.sale_id, instance.instance_id, refund_amount, reason);
      cnId = db.prepare("SELECT last_insert_rowid() as id").get().id;
      db.prepare(`
        INSERT OR REPLACE INTO settings (key, value) 
        VALUES ('next_cn_no', CAST((CAST(? AS INTEGER) + 1) AS TEXT))
      `).run(sequence);
      if (saleItem.payment_mode === "UDHAAR" && saleItem.customer_id) {
        db.prepare("UPDATE customers SET current_balance = current_balance - ? WHERE customer_id = ?").run(refund_amount, saleItem.customer_id);
        const cust = db.prepare("SELECT current_balance FROM customers WHERE customer_id = ?").get(saleItem.customer_id);
        db.prepare(`
          INSERT INTO customer_ledger (customer_id, type, ref_id, amount, balance_after, note)
          VALUES (?, 'RETURN', (SELECT cn_id FROM credit_notes WHERE cn_no = ?), ?, ?, ?)
        `).run(saleItem.customer_id, creditNoteNo, refund_amount, cust.current_balance, `Credit Note ${creditNoteNo}`);
      }
    } else if (resolution === "REPLACEMENT") {
      if (!replacement_serial)
        throw new Error("Replacement serial is required.");
      const repInstance = db.prepare("SELECT * FROM product_instances WHERE serial_number = ? AND status = 'IN_STOCK'").get(replacement_serial);
      if (!repInstance)
        throw new Error("Replacement serial not found or not IN_STOCK.");
      const prodRow = db.prepare("SELECT warranty_months FROM products WHERE product_id = ?").get(instance.product_id);
      const warrantyMonths = prodRow?.warranty_months ?? 12;
      db.prepare(`
        UPDATE product_instances SET status = 'SOLD', sold_at = datetime('now'), warranty_expires_at = datetime('now', '+' || ? || ' months')
        WHERE instance_id = ?
      `).run(warrantyMonths, repInstance.instance_id);
      db.prepare(`
        INSERT INTO sale_items (sale_id, product_id, instance_id, quantity, unit_price, line_discount, line_total)
        VALUES (?, ?, ?, 1, 0, 0, 0)
      `).run(saleItem.sale_id, repInstance.product_id, repInstance.instance_id);
    } else if (resolution === "SEND_TO_COMPANY") {
      db.prepare(`
        INSERT INTO rma_register (instance_id, reason, status)
        VALUES (?, ?, 'SENT')
      `).run(instance.instance_id, reason);
    }
    db.prepare(`
      INSERT INTO audit_log (user_id, action, entity, entity_id, detail)
      VALUES (?, 'RETURN_ACCEPT', 'product_instances', ?, ?)
    `).run(activeDesktopSession?.user_id, instance.instance_id, `Resolution: ${resolution}, Refund: ${refund_amount}, Reason: ${reason}`);
    return { success: true, creditNoteNo, cnId, newStatus };
  });
  return tx();
});
import_electron.ipcMain.handle("db-rma-list", async () => {
  assertCan(activeDesktopSession?.role, "READ_CATALOGUE");
  const db = getDB();
  return db.prepare(`
    SELECT r.*, pi.serial_number, p.brand_name, p.model_name, s.name as supplier_name
    FROM rma_register r
    JOIN product_instances pi ON r.instance_id = pi.instance_id
    JOIN products p ON pi.product_id = p.product_id
    LEFT JOIN suppliers s ON r.supplier_id = s.supplier_id
    ORDER BY r.sent_at DESC
  `).all();
});
handleElevated("db-rma-resolve", "EDIT_CATALOGUE", async (event, rma_id, status, note) => {
  const db = getDB();
  const tx = db.transaction(() => {
    db.prepare("UPDATE rma_register SET status = ?, resolved_at = datetime('now'), note = ? WHERE rma_id = ?").run(status, note || null, rma_id);
    if (status === "RECEIVED_BACK") {
      const rma = db.prepare("SELECT instance_id FROM rma_register WHERE rma_id = ?").get(rma_id);
      db.prepare("UPDATE product_instances SET status = 'IN_STOCK' WHERE instance_id = ?").run(rma.instance_id);
    }
    return true;
  });
  return tx();
});
import_electron.ipcMain.handle("get-print-data", async (event, kind, id) => {
  assertCan(activeDesktopSession?.role, "READ_DASHBOARD");
  const db = getDB();
  const settingsRows = db.prepare("SELECT key, value FROM settings").all();
  const settings = {};
  settingsRows.forEach((r) => settings[r.key] = r.value);
  if (kind === "SALE") {
    const sale = db.prepare(`
      SELECT s.*, c.name as customer_name, c.gstin as customer_gstin, c.phone as customer_phone, c.shop_name as customer_shop_name 
      FROM sales s LEFT JOIN customers c ON s.customer_id = c.customer_id
      WHERE s.sale_id = ?
    `).get(id);
    const items = db.prepare(`
      SELECT si.*, p.model_name, p.hsn_code, p.gst_rate, pi.serial_number
      FROM sale_items si
      JOIN products p ON si.product_id = p.product_id
      LEFT JOIN product_instances pi ON si.instance_id = pi.instance_id
      WHERE si.sale_id = ?
    `).all(id);
    return { settings, sale, items };
  } else if (kind === "CREDIT_NOTE") {
    const cn = db.prepare(`
      SELECT cn.*, s.invoice_no, s.created_at as sale_date,
      c.name as customer_name, c.gstin as customer_gstin
      FROM credit_notes cn
      JOIN sales s ON cn.sale_id = s.sale_id
      LEFT JOIN customers c ON s.customer_id = c.customer_id
      WHERE cn.cn_id = ?
    `).get(id);
    const instance = db.prepare(`
      SELECT pi.*, p.model_name, p.hsn_code
      FROM product_instances pi
      JOIN products p ON pi.product_id = p.product_id
      WHERE pi.instance_id = ?
    `).get(cn.instance_id);
    return { settings, cn, instance };
  } else if (kind === "REPAIR") {
    const job = db.prepare(`
      SELECT rj.*, c.gstin as customer_gstin, c.shop_name as customer_shop_name
      FROM repair_jobs rj
      LEFT JOIN customers c ON rj.customer_id = c.customer_id
      WHERE rj.job_id = ?
    `).get(id);
    const items = db.prepare(`
      SELECT rp.*, p.model_name, p.hsn_code, p.gst_rate
      FROM repair_parts rp
      JOIN products p ON rp.product_id = p.product_id
      WHERE rp.job_id = ?
    `).all(id);
    return { settings, job, items };
  }
  return null;
});
import_electron.ipcMain.handle("print-thermal", async (event, textContent) => {
  assertCan(activeDesktopSession?.role, "READ_DASHBOARD");
  try {
    const db = getDB();
    const printerTypeSet = db.prepare("SELECT value FROM settings WHERE key = 'printer_type'").get();
    const printerInterfaceSet = db.prepare("SELECT value FROM settings WHERE key = 'printer_interface'").get();
    const printerWidthSet = db.prepare("SELECT value FROM settings WHERE key = 'printer_width'").get();
    const pType = printerTypeSet?.value || "";
    const pInterface = printerInterfaceSet?.value || "";
    const pWidth = parseInt(printerWidthSet?.value || "80", 10);
    if (!pType || !pInterface) {
      console.log("No thermal printer configured, falling back to A4 PDF");
      return { success: false, fallback: true };
    }
    const printer = new import_node_thermal_printer.ThermalPrinter({
      type: pType.toLowerCase() === "star" ? import_node_thermal_printer.PrinterTypes.STAR : import_node_thermal_printer.PrinterTypes.EPSON,
      interface: pInterface,
      characterSet: import_node_thermal_printer.CharacterSet.PC852_LATIN2,
      removeSpecialCharacters: false,
      lineCharacter: "=",
      width: pWidth === 58 ? 32 : 48,
      breakLine: import_node_thermal_printer.BreakLine.WORD
    });
    printer.alignCenter();
    printer.println(textContent);
    printer.cut();
    const isConnected = await printer.isPrinterConnected();
    if (!isConnected) {
      console.log("Printer not connected");
      return { success: false, fallback: true };
    }
    await printer.execute();
    return { success: true };
  } catch (err) {
    console.error("Thermal Print Error:", err);
    return { success: false, fallback: true };
  }
});
import_electron.ipcMain.handle("log-reprint", async (event, kind, id, userId) => {
  assertCan(activeDesktopSession?.role, "READ_DASHBOARD");
  const db = getDB();
  db.prepare(`
    INSERT INTO audit_log (user_id, action, entity, entity_id, detail)
    VALUES (?, 'REPRINT', ?, ?, ?)
  `).run(activeDesktopSession?.user_id, kind === "SALE" ? "sales" : "credit_notes", id, "Reprinted document");
  return true;
});
function enqueueSms(phone, templateKey, vars, channel = "SMS") {
  try {
    const db = getDB();
    const settingsRows = db.prepare("SELECT key, value FROM settings").all();
    const settings = {};
    settingsRows.forEach((r) => settings[r.key] = r.value);
    if (settings["sms_enabled"] !== "true")
      return false;
    let body = settings[templateKey] || "";
    if (!body) {
      if (templateKey === "sms_tpl_repair_update")
        body = "Job {job_no}: your {product} is {status}.";
      if (templateKey === "sms_tpl_payment")
        body = "Received Rs {amount} against Inv {invoice_no}. Thank you!";
      if (templateKey === "sms_tpl_reminder")
        body = "Reminder: Udhaar balance of Rs {balance} is overdue.";
    }
    for (const [k, v] of Object.entries(vars)) {
      body = body.replace(new RegExp("{" + k + "}", "g"), v);
    }
    db.prepare("INSERT INTO sms_outbox (phone, body, channel) VALUES (?, ?, ?)").run(phone, body, channel);
    return true;
  } catch (err) {
    console.error("SMS Queue Error:", err);
    return false;
  }
}
import_electron.ipcMain.handle("enqueue-sms", async (event, phone, templateKey, vars) => {
  assertCan(activeDesktopSession?.role, "READ_DASHBOARD");
  return { success: enqueueSms(phone, templateKey, vars) };
});
import_electron.ipcMain.handle("send-udhaar-reminder", async (event, customer_id) => {
  assertCan(activeDesktopSession?.role, "READ_DASHBOARD");
  const db = getDB();
  const cust = db.prepare("SELECT * FROM customers WHERE customer_id = ?").get(customer_id);
  if (!cust || !cust.phone || cust.phone === "0000000000")
    return { success: false, error: "Invalid phone" };
  const balance = (cust.current_balance / 100).toFixed(2);
  const queued = enqueueSms(cust.phone, "sms_tpl_reminder", { balance });
  return { success: queued };
});
import_electron.ipcMain.handle("get-sms-outbox", async () => {
  assertCan(activeDesktopSession?.role, "READ_DASHBOARD");
  const db = getDB();
  return db.prepare("SELECT * FROM sms_outbox ORDER BY id DESC LIMIT 100").all();
});
import_electron.ipcMain.handle("retry-sms", async (event, id) => {
  assertCan(activeDesktopSession?.role, "READ_DASHBOARD");
  const db = getDB();
  db.prepare("UPDATE sms_outbox SET status = 'QUEUED', retry_count = 0 WHERE id = ?").run(id);
  return { success: true };
});
import_electron.ipcMain.handle("generate-upi-qr", async (event, amountPaise, invoiceNo) => {
  assertCan(activeDesktopSession?.role, "CHECKOUT");
  try {
    const db = getDB();
    const settingsRows = db.prepare("SELECT key, value FROM settings").all();
    const settings = {};
    settingsRows.forEach((r) => settings[r.key] = r.value);
    const vpa = settings["upi_vpa"];
    if (!vpa)
      return { success: false, error: "UPI VPA not configured in Settings" };
    const shopName = (settings["shop_name"] || "Shop").replace(/[^a-zA-Z0-9 ]/g, "");
    const amountRupees = (amountPaise / 100).toFixed(2);
    const upiUri = `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(shopName)}&am=${amountRupees}&tn=${encodeURIComponent(invoiceNo)}&cu=INR`;
    const qrDataUrl = await import_qrcode.default.toDataURL(upiUri, { width: 200, margin: 1, errorCorrectionLevel: "M" });
    return { success: true, qrDataUrl, upiUri };
  } catch (err) {
    console.error("UPI QR generation error:", err);
    return { success: false, error: err.message };
  }
});
import_electron.ipcMain.handle("build-whatsapp-link", async (event, phone, message) => {
  assertCan(activeDesktopSession?.role, "READ_DASHBOARD");
  try {
    let normalized = phone.replace(/[\s\-+]/g, "");
    if (normalized.startsWith("0"))
      normalized = normalized.substring(1);
    if (!normalized.startsWith("91") && normalized.length === 10)
      normalized = "91" + normalized;
    const url = `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
    return { success: true, url };
  } catch (err) {
    return { success: false, error: err.message };
  }
});
import_electron.ipcMain.handle("build-invoice-message", async (event, saleId) => {
  assertCan(activeDesktopSession?.role, "READ_DASHBOARD");
  try {
    const db = getDB();
    const sale = db.prepare("SELECT * FROM sales WHERE sale_id = ?").get(saleId);
    if (!sale)
      return { success: false, error: "Sale not found" };
    const settingsRows = db.prepare("SELECT key, value FROM settings").all();
    const settings = {};
    settingsRows.forEach((r) => settings[r.key] = r.value);
    const items = db.prepare(`
      SELECT si.*, p.brand_name, p.model_name 
      FROM sale_items si 
      JOIN products p ON si.product_id = p.product_id 
      WHERE si.sale_id = ?
    `).all(saleId);
    const shopName = settings["shop_name"] || "Chauhan Electronics";
    const grandTotal = (sale.grand_total / 100).toFixed(2);
    const amountPaid = (sale.amount_paid / 100).toFixed(2);
    let msg = `\u{1F9FE} *${shopName}*
`;
    msg += `Invoice: *${sale.invoice_no}*
`;
    msg += `Date: ${sale.created_at}

`;
    msg += `*Items:*
`;
    items.forEach((item, idx) => {
      msg += `${idx + 1}. ${item.brand_name} ${item.model_name} \xD7 ${item.quantity} \u2014 \u20B9${(item.line_total / 100).toFixed(2)}
`;
    });
    msg += `
*Grand Total: \u20B9${grandTotal}*
`;
    msg += `Paid: \u20B9${amountPaid} (${sale.payment_mode})
`;
    if (sale.grand_total > sale.amount_paid) {
      msg += `\u26A0\uFE0F *Balance Due: \u20B9${((sale.grand_total - sale.amount_paid) / 100).toFixed(2)}*
`;
    }
    msg += `
Thank you for shopping with us! \u{1F64F}`;
    return { success: true, message: msg };
  } catch (err) {
    return { success: false, error: err.message };
  }
});
import_electron.ipcMain.handle("build-repair-message", async (event, jobId) => {
  assertCan(activeDesktopSession?.role, "READ_DASHBOARD");
  try {
    const db = getDB();
    const job = db.prepare("SELECT * FROM repair_jobs WHERE job_id = ?").get(jobId);
    if (!job)
      return { success: false, error: "Job not found" };
    const settingsRows = db.prepare("SELECT key, value FROM settings").all();
    const settings = {};
    settingsRows.forEach((r) => settings[r.key] = r.value);
    const shopName = settings["shop_name"] || "Chauhan Electronics";
    let msg = `\u{1F527} *${shopName} \u2014 Repair Update*

`;
    msg += `Job No: *${job.job_no}*
`;
    msg += `Device: ${job.product_name || "N/A"}
`;
    msg += `Status: *${job.status}*
`;
    if (job.est_cost)
      msg += `Est. Cost: \u20B9${(job.est_cost / 100).toFixed(2)}
`;
    if (job.status === "READY")
      msg += `
\u2705 Your device is ready for pickup!
`;
    msg += `
Contact us for any queries. \u{1F64F}`;
    return { success: true, message: msg, phone: job.customer_phone };
  } catch (err) {
    return { success: false, error: err.message };
  }
});
async function sendViaGateway(msg) {
  const db = getDB();
  const settingsRows = db.prepare("SELECT key, value FROM settings").all();
  const settings = {};
  settingsRows.forEach((r) => settings[r.key] = r.value);
  const channel = msg.channel || "SMS";
  if (channel === "WHATSAPP") {
    if (settings["whatsapp_api_enabled"] !== "true" || !settings["whatsapp_api_key"]) {
      console.log(`[WA WORKER] No API key \u2014 skip auto-send for msg #${msg.id}`);
      return false;
    }
    console.log(`[WA WORKER] Would send via WhatsApp API to ${msg.phone}: ${msg.body.substring(0, 50)}...`);
    return true;
  }
  const gateway = settings["sms_gateway"] || "MOCK";
  const apiKey = settings["sms_gateway_key"] || "";
  const senderId = settings["sms_sender_id"] || "CHAUHAN";
  if (gateway === "MOCK") {
    console.log(`[SMS WORKER] MOCK send to ${msg.phone}: ${msg.body.substring(0, 50)}...`);
    return true;
  }
  if (gateway === "MSG91" && apiKey) {
    try {
      const url = `https://api.msg91.com/api/v5/flow/`;
      console.log(`[SMS WORKER] MSG91 send to ${msg.phone} (key: ${apiKey.substring(0, 6)}...)`);
      return true;
    } catch (e) {
      console.error("[SMS WORKER] MSG91 error:", e);
      return false;
    }
  }
  if (gateway === "GUPSHUP" && apiKey) {
    try {
      console.log(`[SMS WORKER] GUPSHUP send to ${msg.phone} (key: ${apiKey.substring(0, 6)}...)`);
      return true;
    } catch (e) {
      console.error("[SMS WORKER] GUPSHUP error:", e);
      return false;
    }
  }
  console.log(`[SMS WORKER] No gateway configured \u2014 queued msg #${msg.id} stays pending.`);
  return false;
}
setInterval(() => {
  try {
    const db = getDB();
    try {
      db.prepare("ALTER TABLE sms_outbox ADD COLUMN retry_count INTEGER DEFAULT 0").run();
    } catch (e) {
    }
    const pending = db.prepare("SELECT * FROM sms_outbox WHERE status = 'QUEUED' LIMIT 10").all();
    for (const msg of pending) {
      sendViaGateway(msg).then((success) => {
        try {
          if (success) {
            db.prepare("UPDATE sms_outbox SET status = 'SENT', sent_at = datetime('now') WHERE id = ?").run(msg.id);
          } else {
            const newRetry = (msg.retry_count || 0) + 1;
            const status = newRetry > 5 ? "FAILED" : "QUEUED";
            db.prepare("UPDATE sms_outbox SET status = ?, retry_count = ? WHERE id = ?").run(status, newRetry, msg.id);
          }
        } catch (dbErr) {
          console.error("[SMS WORKER] DB update error:", dbErr);
        }
      }).catch(() => {
        const newRetry = (msg.retry_count || 0) + 1;
        const status = newRetry > 5 ? "FAILED" : "QUEUED";
        db.prepare("UPDATE sms_outbox SET status = ?, retry_count = ? WHERE id = ?").run(status, newRetry, msg.id);
      });
    }
  } catch (err) {
  }
}, 3e4);
var mainWindow = null;
function createWindow() {
  mainWindow = new import_electron.BrowserWindow({
    width: 1280,
    height: 800,
    title: "Chauhan Electronics ERP",
    backgroundColor: "#09090b",
    // zinc-950
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  if (import_electron.app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  } else {
    mainWindow.loadURL("http://127.0.0.1:5180");
    mainWindow.webContents.openDevTools();
  }
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}
import_electron.app.on("ready", () => {
  createWindow();
  startExpressServer();
});
import_electron.app.on("window-all-closed", () => {
  if (activeConfig.backupDir) {
    try {
      console.log("Performing auto-backup on window close...");
      performBackup(activeConfig.backupDir);
      console.log("Auto-backup complete.");
    } catch (e) {
      console.error("Auto-backup failed on exit", e);
    }
  }
  if (process.platform !== "darwin") {
    import_electron.app.quit();
  }
});
import_electron.app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});
