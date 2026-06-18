"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// packages/core/db.ts
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
function seedDB(db2) {
  const insertSetting = db2.prepare("INSERT INTO settings (key, value) VALUES (?, ?)");
  insertSetting.run("first_run", "1");
  insertSetting.run("shop_name", "");
  insertSetting.run("address", "");
  insertSetting.run("gstin", "");
  insertSetting.run("state_code", "29");
  insertSetting.run("next_invoice_no", "1001");
  insertSetting.run("job_prefix", "JOB/26/");
  insertSetting.run("next_job_no", "2001");
  insertSetting.run("default_gst_rate", "18");
  insertSetting.run("currency", "INR");
  insertSetting.run("sms_enabled", "0");
  insertSetting.run("online_lookup", "0");
  const insertCustomer = db2.prepare(`
    INSERT INTO customers (name, phone, shop_name, tier, gstin, credit_limit, current_balance, credit_due_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertCustomer.run("Counter Customer", "0000000000", null, "COUNTER", null, 0, 0, null);
  insertCustomer.run("Abhishek Audio", "9876543210", "Abhishek Electronics", "DEALER", "29AAAPA1234B1Z0", 1e7, 45e5, "2026-07-16");
  insertCustomer.run("Pooja Car Accessories", "9123456789", "Pooja Accessories", "DEALER", null, 5e6, 0, null);
  insertCustomer.run("Sardar Distributors", "9988776655", "Sardar Audio Ltd", "DISTRIBUTOR", "29BBBBB5678C1Z1", 5e7, 0, null);
  const insertLedger = db2.prepare(`
    INSERT INTO customer_ledger (customer_id, type, ref_id, amount, balance_after, note)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertLedger.run(2, "SALE", 0, 45e5, 45e5, "Opening Balance");
  const insertProduct = db2.prepare(`
    INSERT INTO products (sku_code, brand_name, model_name, category, hsn_code, gst_rate, requires_serial, warranty_months, min_restock_level, counter_price, dealer_price, distributor_price, loose_qty)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertProduct.run("8809123456789", "Pioneer", "DMH-Z5290BT", "Car Audio", "8527", 18, 1, 12, 3, 285e4, 25e5, 23e5, 0);
  insertProduct.run("8809123456000", "Blaupunkt", "Key Largo 980", "Car Audio", "8527", 18, 1, 24, 2, 18e5, 16e5, 145e4, 0);
  insertProduct.run("4001234567890", "Dixon", "8-Gauge Power Cable", "Accessories", "8544", 18, 0, 0, 20, 15e3, 12e3, 1e4, 150);
  insertProduct.run("7890123456789", "Sony", "XM-N1004", "Car Audio", "8518", 18, 1, 12, 2, 95e4, 85e4, 8e5, 0);
  const insertFitment = db2.prepare("INSERT INTO product_fitment (product_id, vehicle_tag) VALUES (?, ?)");
  insertFitment.run(1, "Universal Double Din");
  insertFitment.run(1, "Creta 2024");
  insertFitment.run(1, "Swift 2023");
  insertFitment.run(2, "9 Inch Android");
  insertFitment.run(2, "Universal Fitment");
  insertFitment.run(4, "4 Channel Amplifier");
  const insertInstance = db2.prepare(`
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
  const insertGRN = db2.prepare(`
    INSERT INTO grn (grn_id, supplier_id, invoice_ref, total_cost, received_by)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertGRN.run(1, null, "INIT-STOCK", 87e5, 1);
  const insertRepair = db2.prepare(`
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
  const insertRepairHistory = db2.prepare(`
    INSERT INTO repair_status_history (job_id, old_status, new_status)
    VALUES (?, ?, ?)
  `);
  insertRepairHistory.run(1, "PENDING", "IN_REPAIR");
}
var import_better_sqlite3, dbInstance;
var init_db = __esm({
  "packages/core/db.ts"() {
    "use strict";
    import_better_sqlite3 = __toESM(require("better-sqlite3"));
    dbInstance = null;
  }
});

// packages/core/types.ts
var init_types = __esm({
  "packages/core/types.ts"() {
    "use strict";
  }
});

// packages/core/pricing.ts
var init_pricing = __esm({
  "packages/core/pricing.ts"() {
    "use strict";
  }
});

// packages/core/warranty.ts
var init_warranty = __esm({
  "packages/core/warranty.ts"() {
    "use strict";
  }
});

// packages/core/gst.ts
var init_gst = __esm({
  "packages/core/gst.ts"() {
    "use strict";
  }
});

// packages/core/intake.ts
var init_intake = __esm({
  "packages/core/intake.ts"() {
    "use strict";
  }
});

// packages/core/ledger.ts
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
var init_ledger = __esm({
  "packages/core/ledger.ts"() {
    "use strict";
  }
});

// packages/core/sms.ts
function formatPaymentReminder(customer, shopName) {
  const amountRs = (customer.current_balance / 100).toFixed(2);
  return `Dear ${customer.name}, your Udhaar balance of Rs.${amountRs} at ${shopName} is overdue. Please settle it at the earliest.`;
}
var init_sms = __esm({
  "packages/core/sms.ts"() {
    "use strict";
  }
});

// packages/core/permissions.ts
function setPermissionsOverrides(overrides) {
  globalOverrides = overrides;
}
function authorize(role, action, overrides) {
  if (!role)
    return false;
  if (role === "OWNER")
    return true;
  const activeOverrides = overrides || globalOverrides;
  const overrideKey = `${role}_${action}`;
  if (activeOverrides && activeOverrides[overrideKey] !== void 0) {
    return activeOverrides[overrideKey];
  }
  switch (action) {
    case "EDIT_PRICE":
    case "OVERRIDE_CREDIT":
    case "VOID_SALE":
    case "REFUND_EDIT":
    case "BACKUP_RESTORE":
    case "USER_MGMT":
    case "VIEW_REPORTS":
      return false;
    case "EDIT_CATALOGUE":
      return role === "STOCK";
    case "CREATE_SUPPLIER":
      return role === "CASHIER" || role === "STOCK";
    case "SHOW_COST":
      return false;
    case "RECORD_EXPENSE":
    case "RECORD_PAYMENT":
    case "ISSUE_CN":
      return role === "CASHIER";
    case "CHECKOUT":
      return role === "CASHIER" || role === "SALESPERSON";
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
      return role === "CASHIER" || role === "SALESPERSON";
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
function assertCan(role, action, overrides) {
  if (!authorize(role, action, overrides)) {
    throw new Error(`Unauthorized: Role ${role} cannot perform ${action}`);
  }
}
var globalOverrides;
var init_permissions = __esm({
  "packages/core/permissions.ts"() {
    "use strict";
    globalOverrides = {};
  }
});

// packages/core/index.ts
var init_core = __esm({
  "packages/core/index.ts"() {
    "use strict";
    init_types();
    init_db();
    init_pricing();
    init_warranty();
    init_gst();
    init_intake();
    init_ledger();
    init_sms();
    init_permissions();
  }
});

// packages/core/gst.js
var require_gst = __commonJS({
  "packages/core/gst.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.calculateGSTSplit = calculateGSTSplit;
    exports2.getTaxableValue = getTaxableValue;
    function calculateGSTSplit(taxableAmountPaise, gstRate, shopStateCode, customerGSTIN) {
      var customerStateCode = shopStateCode;
      if (customerGSTIN && customerGSTIN.trim().length >= 2) {
        var code = customerGSTIN.trim().substring(0, 2);
        if (/^\d+$/.test(code)) {
          customerStateCode = code;
        }
      }
      var totalTaxPaise = Math.round(taxableAmountPaise * gstRate / 100);
      if (customerStateCode === shopStateCode) {
        var halfTax = Math.round(totalTaxPaise / 2);
        return {
          cgst: halfTax,
          sgst: totalTaxPaise - halfTax,
          // handle odd-paise division correctly
          igst: 0
        };
      } else {
        return {
          cgst: 0,
          sgst: 0,
          igst: totalTaxPaise
        };
      }
    }
    function getTaxableValue(lineTotalPaise, gstRate) {
      return Math.round(lineTotalPaise / (1 + gstRate / 100));
    }
  }
});

// packages/core/ledger.js
var require_ledger = __commonJS({
  "packages/core/ledger.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.calculateAging = calculateAging2;
    exports2.isCustomerOverdue = isCustomerOverdue;
    function calculateAging2(customer, currentDate) {
      if (currentDate === void 0) {
        currentDate = /* @__PURE__ */ new Date();
      }
      var buckets = { "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0, total_overdue: 0 };
      if (customer.current_balance <= 0 || !customer.credit_due_date) {
        return buckets;
      }
      var dueDate = new Date(customer.credit_due_date);
      var diffTime = currentDate.getTime() - dueDate.getTime();
      var diffDays = Math.ceil(diffTime / (1e3 * 60 * 60 * 24));
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
    function isCustomerOverdue(customer, currentDate) {
      if (currentDate === void 0) {
        currentDate = /* @__PURE__ */ new Date();
      }
      if (customer.current_balance <= 0 || !customer.credit_due_date)
        return false;
      var dueDate = new Date(customer.credit_due_date);
      return currentDate.getTime() > dueDate.getTime();
    }
  }
});

// apps/desktop/electron/api.ts
function getMaxDiscountPct(role) {
  if (role === "OWNER")
    return 100;
  if (role === "CASHIER")
    return 20;
  return 10;
}
function getPriceFloor(product, instance) {
  const cost = instance?.purchase_cost ?? product?.purchase_cost ?? 0;
  return Math.ceil(cost * 1.05);
}
function safeProd(product, role) {
  if (!product)
    return product;
  if (authorize(role, "SHOW_COST"))
    return product;
  const { purchase_cost, ...rest } = product;
  return rest;
}
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
      const db2 = getDB2();
      const users = db2.prepare("SELECT * FROM users WHERE active = 1").all();
      const bcrypt = require("bcryptjs");
      const crypto = require("crypto");
      const matchedUser = users.find((u) => bcrypt.compareSync(pin, u.pin_hash));
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
      const db2 = getDB2();
      const sku = req.params.sku;
      const product = db2.prepare("SELECT * FROM products WHERE sku_code = ?").get(sku);
      if (product) {
        let stock = 0;
        if (product.requires_serial) {
          const row = db2.prepare("SELECT COUNT(*) as count FROM product_instances WHERE product_id = ? AND status = 'IN_STOCK'").get(product.product_id);
          stock = row.count;
        } else {
          stock = product.loose_qty || 0;
        }
        res.json({ success: true, product: safeProd(product, req.session?.role), stock });
      } else {
        res.status(404).json({ success: false, error: "Product not found" });
      }
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app2.post("/api/sales/recommendations", requireRole("CHECKOUT"), (req, res) => {
    try {
      const db2 = getDB2();
      const productIds = req.body.productIds || [];
      if (productIds.length === 0) {
        return res.json({ success: true, recommendations: [] });
      }
      const placeholders = productIds.map(() => "?").join(",");
      const query = `
        SELECT p.product_id, p.brand_name, p.model_name, p.sku_code, p.category, COUNT(DISTINCT si.sale_id) as frequency
        FROM sale_items si
        JOIN products p ON p.product_id = si.product_id
        WHERE si.sale_id IN (
          SELECT sale_id FROM sale_items WHERE product_id IN (${placeholders})
        )
        AND si.product_id NOT IN (${placeholders})
        GROUP BY si.product_id
        ORDER BY frequency DESC
        LIMIT 3
      `;
      const results = db2.prepare(query).all(...productIds, ...productIds);
      const recommendations = results.map((r) => {
        const fullProd = db2.prepare(`SELECT counter_price FROM products WHERE product_id = ?`).get(r.product_id);
        return {
          ...r,
          price: fullProd.counter_price
        };
      });
      res.json({ success: true, recommendations });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app2.get("/api/products/serial/:serial", requireRole("READ_CATALOGUE"), (req, res) => {
    try {
      const db2 = getDB2();
      const { serial } = req.params;
      const instance = db2.prepare("SELECT * FROM product_instances WHERE serial_number = ?").get(serial);
      if (!instance)
        return res.status(404).json({ success: false, error: "Serial not found" });
      const product = db2.prepare("SELECT * FROM products WHERE product_id = ?").get(instance.product_id);
      if (!product)
        return res.status(404).json({ success: false, error: "Product not found" });
      res.json({
        success: true,
        product: safeProd(product, req.session?.role),
        instance: { instance_id: instance.instance_id, serial_number: instance.serial_number, status: instance.status },
        stock: instance.status === "IN_STOCK" ? 1 : 0
      });
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
      const db2 = getDB2();
      const product = db2.prepare("SELECT * FROM products WHERE sku_code = ?").get(sku);
      if (product) {
        const tags = db2.prepare("SELECT vehicle_tag FROM product_fitment WHERE product_id = ?").all(product.product_id).map((row) => row.vehicle_tag);
        res.json({ found: true, product: { ...safeProd(product, req.session?.role), fitment_tags: tags } });
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
      const db2 = getDB2();
      const customer = db2.prepare("SELECT * FROM customers WHERE phone = ?").get(phone);
      if (customer) {
        res.json({ found: true, customer });
      } else {
        res.json({ found: false });
      }
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app2.get("/api/customers", requireRole("READ_CUSTOMERS"), (req, res) => {
    try {
      const db2 = getDB2();
      const customers = db2.prepare("SELECT customer_id, name, phone, tier, gstin, credit_limit, current_balance, credit_due_date FROM customers ORDER BY name").all();
      res.json({ success: true, customers });
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
      const db2 = getDB2();
      const result = db2.prepare(
        `INSERT INTO customers (name, phone, shop_name, tier, gstin, credit_limit, current_balance)
         VALUES (?, ?, ?, ?, ?, ?, 0)`
      ).run(name, phone, shop_name || null, tier || "COUNTER", gstin || null, credit_limit || 0);
      const newCustomer = db2.prepare("SELECT * FROM customers WHERE customer_id = ?").get(result.lastInsertRowid);
      res.json({ success: true, customer: newCustomer });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app2.get("/api/customers/:id/ledger", requireRole("READ_CUSTOMERS"), (req, res) => {
    const customerId = req.params.id;
    try {
      const db2 = getDB2();
      const customer = db2.prepare("SELECT * FROM customers WHERE customer_id = ?").get(customerId);
      if (!customer) {
        return res.status(404).json({ success: false, error: "Customer not found" });
      }
      const ledger = db2.prepare("SELECT * FROM customer_ledger WHERE customer_id = ? ORDER BY created_at DESC").all(customerId);
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
      const db2 = getDB2();
      const tx = db2.transaction(() => {
        db2.prepare(`UPDATE customers SET current_balance = current_balance - ? WHERE customer_id = ?`).run(amount, customerId);
        const newCustomer = db2.prepare("SELECT current_balance FROM customers WHERE customer_id = ?").get(customerId);
        db2.prepare(
          `INSERT INTO customer_ledger (customer_id, type, amount, balance_after, note)
           VALUES (?, 'PAYMENT', ?, ?, ?)`
        ).run(customerId, amount, newCustomer.current_balance, note || "Payment received");
        db2.prepare(`INSERT INTO audit_log (user_id, action, entity, entity_id, detail) VALUES (?, 'RECORD_PAYMENT', 'customer_ledger', ?, ?)`).run(userId, customerId, `Payment amount: ${amount}`);
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
      const db2 = getDB2();
      const sale = db2.prepare("SELECT * FROM sales WHERE invoice_no = ?").get(invoice_no);
      if (sale) {
        const items = db2.prepare(
          `SELECT si.*, p.brand_name, p.model_name, p.hsn_code, p.gst_rate, pi.serial_number
           FROM sale_items si
           JOIN products p ON si.product_id = p.product_id
           LEFT JOIN product_instances pi ON si.instance_id = pi.instance_id
           WHERE si.sale_id = ?`
        ).all(sale.sale_id);
        const customer = db2.prepare("SELECT * FROM customers WHERE customer_id = ?").get(sale.customer_id);
        res.json({ found: true, sale, items, customer });
      } else {
        res.json({ found: false });
      }
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app2.post("/api/sales/validate-price", requireRole("CHECKOUT"), (req, res) => {
    try {
      const { product_id, instance_id, final_price } = req.body;
      const role = req.session?.role;
      const db2 = getDB2();
      const product = db2.prepare("SELECT * FROM products WHERE product_id = ?").get(product_id);
      if (!product)
        return res.status(404).json({ success: false, error: "Product not found" });
      const instance = instance_id ? db2.prepare("SELECT * FROM product_instances WHERE instance_id = ?").get(instance_id) : null;
      const tierPrice = product.counter_price || 0;
      const floor = getPriceFloor(product, instance);
      const maxDiscount = getMaxDiscountPct(role);
      const discountPct = tierPrice > 0 ? (tierPrice - final_price) / tierPrice * 100 : 0;
      const belowFloor = final_price < floor;
      const overMaxDiscount = discountPct > maxDiscount;
      const allowed = !belowFloor && !overMaxDiscount;
      res.json({
        allowed,
        needs_override: !allowed,
        reason: belowFloor ? "Price is below minimum margin floor" : overMaxDiscount ? `Discount exceeds your ${maxDiscount}% limit` : null
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app2.post("/api/sales/admin-override", requireRole("CHECKOUT"), (req, res) => {
    try {
      const { admin_pin, product_id, instance_id, final_price, note, override_type, customer_id } = req.body;
      const db2 = getDB2();
      const bcrypt = require("bcryptjs");
      const crypto = require("crypto");
      const admins = db2.prepare("SELECT * FROM users WHERE active = 1 AND role IN ('OWNER', 'CASHIER')").all();
      const admin = admins.find((u) => bcrypt.compareSync(admin_pin, u.pin_hash));
      if (!admin)
        return res.status(401).json({ success: false, error: "Invalid admin PIN" });
      if (admin.role !== "OWNER") {
        return res.status(403).json({ success: false, error: "Only OWNER can authorize overrides" });
      }
      const token = crypto.randomBytes(16).toString("hex");
      if (override_type === "UDHAAR") {
        overrideTokens.set(token, {
          admin_user_id: admin.user_id,
          admin_name: admin.name,
          expires: Date.now() + 5 * 60 * 1e3,
          is_udhaar: true,
          customer_id
        });
        db2.prepare(`INSERT INTO audit_log (user_id, action, entity, entity_id, detail) VALUES (?, 'UDHAAR_OVERRIDE', 'customer', ?, ?)`).run(admin.user_id, customer_id, `Override by ${admin.name}: note=${note ?? ""}`);
      } else {
        overrideTokens.set(token, {
          admin_user_id: admin.user_id,
          admin_name: admin.name,
          expires: Date.now() + 5 * 60 * 1e3,
          product_id,
          final_price
        });
        db2.prepare(`INSERT INTO audit_log (user_id, action, entity, entity_id, detail) VALUES (?, 'PRICE_OVERRIDE', 'product', ?, ?)`).run(admin.user_id, product_id, `Override by ${admin.name}: final_price=${final_price}, instance=${instance_id ?? "loose"}, note=${note ?? ""}`);
      }
      res.json({ success: true, override_token: token, approved_by: admin.name });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app2.post("/api/sales/checkout", requireRole("CHECKOUT"), (req, res) => {
    const { customer_id, tier_applied, cart, discount, payment_mode, amount_paid, udhaar_override_token, trade_in_discount, trade_in_desc } = req.body;
    const userId = req.session.user_id;
    if (!cart || cart.length === 0) {
      return res.status(400).json({ success: false, error: "Cart is empty." });
    }
    try {
      const db2 = getDB2();
      const customer = db2.prepare("SELECT * FROM customers WHERE customer_id = ?").get(customer_id || 1);
      if (!customer)
        return res.status(400).json({ success: false, error: "Customer not found." });
      let subtotal = 0;
      cart.forEach((item) => {
        subtotal += (item.price - item.discount) * item.quantity;
      });
      const discountVal = discount || 0;
      const tradeInVal = trade_in_discount || 0;
      const grandTotal = Math.max(0, subtotal - discountVal - tradeInVal);
      if (payment_mode === "UDHAAR") {
        if (customer.phone === "0000000000")
          return res.status(400).json({ success: false, error: "Cannot sell on credit (Udhaar) to Counter Customer." });
        let validUdhaarOverride = false;
        if (udhaar_override_token) {
          const tData = overrideTokens.get(udhaar_override_token);
          if (tData && tData.expires > Date.now() && tData.is_udhaar) {
            validUdhaarOverride = true;
          }
        }
        if (!validUdhaarOverride) {
          if (customer.credit_due_date && new Date(customer.credit_due_date) < /* @__PURE__ */ new Date() && customer.current_balance > 0)
            return res.status(402).json({ success: false, error: `Customer has an overdue balance since ${customer.credit_due_date}.`, needs_override: true });
          const debt = grandTotal - (amount_paid || 0);
          if (customer.current_balance + debt > customer.credit_limit)
            return res.status(402).json({ success: false, error: "Credit limit exceeded.", needs_override: true });
        }
      }
      const shopStateRow = db2.prepare("SELECT value FROM settings WHERE key = 'state_code'").get();
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
        const prodRow = db2.prepare("SELECT gst_rate FROM products WHERE product_id = ?").get(item.product_id);
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
      const checkoutTx = db2.transaction(() => {
        const prefixRow = db2.prepare("SELECT value FROM settings WHERE key = 'invoice_prefix'").get();
        const sequenceRow = db2.prepare("SELECT value FROM settings WHERE key = 'next_invoice_no'").get();
        const prefix = prefixRow?.value || "CE/26/";
        const sequence = sequenceRow?.value || "1001";
        const invoiceNo = `${prefix}${sequence}`;
        const paidPaise = payment_mode === "UDHAAR" ? amount_paid || 0 : grandTotal;
        const saleRes = db2.prepare(
          `INSERT INTO sales (
            invoice_no, customer_id, tier_applied, subtotal, discount, 
            cgst, sgst, igst, grand_total, amount_paid, payment_mode, trade_in_discount, trade_in_desc, sold_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(invoiceNo, customer.customer_id, tier_applied || "COUNTER", subtotal, discountVal, cgstTotal, sgstTotal, igstTotal, grandTotal, paidPaise, payment_mode, tradeInVal, trade_in_desc || null, userId);
        const saleId = saleRes.lastInsertRowid;
        if (tradeInVal > 0 && trade_in_desc) {
          db2.prepare(
            `INSERT INTO trade_ins (sale_id, customer_id, item_desc, estimated_value, status) VALUES (?, ?, ?, ?, 'RECEIVED')`
          ).run(saleId, customer.customer_id, trade_in_desc, tradeInVal);
        }
        cart.forEach((item) => {
          if (item.instance_id) {
            const inst = db2.prepare("SELECT * FROM product_instances WHERE instance_id = ?").get(item.instance_id);
            if (!inst || inst.status !== "IN_STOCK") {
              const err = new Error(`Serial ${item.instance_id} is not available (already sold or not in stock).`);
              err.statusCode = 409;
              throw err;
            }
            if (item.override_token) {
              const ov = overrideTokens.get(item.override_token);
              if (!ov || ov.expires < Date.now())
                throw new Error(`Override token expired for item ${item.instance_id}`);
              overrideTokens.delete(item.override_token);
            }
            db2.prepare(`INSERT INTO sale_items (sale_id, product_id, instance_id, quantity, unit_price, line_discount, line_total, unit_cost) VALUES (?, ?, ?, 1, ?, ?, ?, ?)`).run(saleId, item.product_id, item.instance_id, item.price, item.discount, item.price - item.discount, inst.purchase_cost || 0);
            const prodRow = db2.prepare("SELECT warranty_months FROM products WHERE product_id = ?").get(item.product_id);
            const warrantyMonths = prodRow?.warranty_months ?? 12;
            db2.prepare(`UPDATE product_instances SET status = 'SOLD', sold_at = datetime('now'), warranty_expires_at = datetime('now', '+' || ? || ' months') WHERE instance_id = ?`).run(warrantyMonths, item.instance_id);
          } else {
            const prodRow = db2.prepare("SELECT loose_qty, purchase_cost FROM products WHERE product_id = ?").get(item.product_id);
            if (!prodRow || prodRow.loose_qty < item.quantity)
              throw new Error(`Insufficient loose stock for product ID ${item.product_id}. Available: ${prodRow?.loose_qty || 0}`);
            if (item.override_token) {
              const ov = overrideTokens.get(item.override_token);
              if (!ov || ov.expires < Date.now())
                throw new Error(`Override token expired for loose item ${item.product_id}`);
              overrideTokens.delete(item.override_token);
            }
            db2.prepare(`INSERT INTO sale_items (sale_id, product_id, instance_id, quantity, unit_price, line_discount, line_total, unit_cost) VALUES (?, ?, NULL, ?, ?, ?, ?, ?)`).run(saleId, item.product_id, item.quantity, item.price, item.discount, (item.price - item.discount) * item.quantity, prodRow.purchase_cost || 0);
            db2.prepare(`UPDATE products SET loose_qty = loose_qty - ? WHERE product_id = ?`).run(item.quantity, item.product_id);
          }
        });
        if (payment_mode === "UDHAAR") {
          const debtPaise = grandTotal - paidPaise;
          db2.prepare(`UPDATE customers SET current_balance = current_balance + ? WHERE customer_id = ?`).run(debtPaise, customer.customer_id);
          db2.prepare(`INSERT INTO customer_ledger (customer_id, type, ref_id, amount, balance_after, note) VALUES (?, 'SALE', ?, ?, (SELECT current_balance FROM customers WHERE customer_id = ?), ?)`).run(customer.customer_id, saleId, debtPaise, customer.customer_id, `Debited from invoice ${invoiceNo}`);
        }
        db2.prepare(`UPDATE settings SET value = CAST((CAST(value AS INTEGER) + 1) AS TEXT) WHERE key = 'next_invoice_no'`).run();
        db2.prepare(`INSERT INTO audit_log (user_id, action, entity, entity_id, detail) VALUES (?, 'CHECKOUT', 'sale', ?, ?)`).run(userId, saleId, `LAN API POS Checkout Completed. Invoice: ${invoiceNo}`);
        return { invoiceNo, saleId };
      });
      const txResult = checkoutTx();
      res.json({ success: true, ...txResult });
    } catch (err) {
      const status = err.statusCode === 409 ? 409 : 500;
      res.status(status).json({ success: false, error: err.message });
    }
  });
  app2.post("/api/sales/:id/print", requireRole("CHECKOUT"), async (req, res) => {
    try {
      const db2 = getDB2();
      const sale = db2.prepare("SELECT * FROM sales WHERE sale_id = ?").get(req.params.id);
      if (!sale)
        return res.status(404).json({ success: false, error: "Sale not found." });
      const { printReceipt } = require("./printer");
      printReceipt(req.params.id, db2).catch((e) => console.error("Print error:", e));
      res.json({ success: true, message: "Print job dispatched" });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app2.post("/api/quotations", requireRole("CHECKOUT"), (req, res) => {
    const { customer_id, customer_name, customer_phone, items } = req.body;
    try {
      const db2 = getDB2();
      let totalTaxable = 0, totalCgst = 0, totalSgst = 0, totalIgst = 0;
      const isIgst = false;
      for (const item of items) {
        totalTaxable += item.taxable_value;
        if (isIgst) {
          totalIgst += item.tax_amt;
        } else {
          totalCgst += Math.round(item.tax_amt / 2);
          totalSgst += Math.round(item.tax_amt / 2);
        }
      }
      const grandTotal = totalTaxable + totalCgst + totalSgst + totalIgst;
      const validUntil = /* @__PURE__ */ new Date();
      validUntil.setDate(validUntil.getDate() + 7);
      const tx = db2.transaction(() => {
        const qno = `QT-${Date.now()}`;
        const insertQ = db2.prepare(`
          INSERT INTO quotations (quotation_no, customer_id, customer_name, customer_phone, total_taxable, total_cgst, total_sgst, total_igst, grand_total, valid_until)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const info = insertQ.run(qno, customer_id, customer_name, customer_phone, totalTaxable, totalCgst, totalSgst, totalIgst, grandTotal, validUntil.toISOString());
        const qId2 = info.lastInsertRowid;
        const insertItem = db2.prepare(`
          INSERT INTO quotation_items (quotation_id, product_id, quantity, unit_price, discount, tax_rate, taxable_value, cgst_amt, sgst_amt, igst_amt, total_amt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const item of items) {
          const itemCgst = isIgst ? 0 : Math.round(item.tax_amt / 2);
          const itemSgst = isIgst ? 0 : Math.round(item.tax_amt / 2);
          const itemIgst = isIgst ? item.tax_amt : 0;
          insertItem.run(
            qId2,
            item.product_id,
            item.quantity,
            item.price,
            item.discount,
            item.tax_rate,
            item.taxable_value,
            itemCgst,
            itemSgst,
            itemIgst,
            item.taxable_value + item.tax_amt
          );
        }
        return qId2;
      });
      const qId = tx();
      res.json({ success: true, quotationId: qId });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  app2.get("/api/quotations", requireRole("CHECKOUT"), (req, res) => {
    try {
      const db2 = getDB2();
      const list = db2.prepare(`SELECT * FROM quotations ORDER BY quotation_id DESC LIMIT 50`).all();
      res.json({ success: true, data: list });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  if (!isPackaged) {
    app2.post("/api/dev/ipc", requireRole("BACKUP_RESTORE"), async (req, res) => {
      const { channel, args } = req.body;
      try {
        let result;
        const db2 = getDB2();
        if (channel === "db-query") {
          result = db2.prepare(args[0]).all(...args[1] || []);
        } else if (channel === "db-get") {
          result = db2.prepare(args[0]).get(...args[1] || []);
        } else if (channel === "db-run") {
          const runRes = db2.prepare(args[0]).run(...args[1] || []);
          result = { changes: runRes.changes, lastInsertRowid: runRes.lastInsertRowid };
        } else if (channel === "db-transaction") {
          const runTx = db2.transaction((txQueries) => {
            const results = [];
            for (const q of txQueries) {
              results.push(db2.prepare(q.sql).run(...q.params));
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
      const db2 = getDB2();
      const instance = db2.prepare(`SELECT pi.*, p.brand_name, p.model_name, p.category FROM product_instances pi JOIN products p ON pi.product_id = p.product_id WHERE pi.serial_number = ?`).get(serial);
      if (!instance)
        return res.json({ found: false });
      const saleItem = db2.prepare(`SELECT si.*, s.invoice_no, s.created_at as sale_date, s.customer_id, c.name as customer_name, c.phone as customer_phone FROM sale_items si JOIN sales s ON si.sale_id = s.sale_id LEFT JOIN customers c ON s.customer_id = c.customer_id WHERE si.instance_id = ? AND s.status = 'COMPLETED'`).get(instance.instance_id);
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
      const db2 = getDB2();
      const instance = db2.prepare("SELECT * FROM product_instances WHERE serial_number = ?").get(serial);
      if (!instance)
        return res.json({ outcome: "REJECT_UNKNOWN", message: "Never part of our inventory." });
      if (instance.status === "RMA_RETURNED")
        return res.json({ outcome: "REJECT_ALREADY_RETURNED", message: "This unit has already been returned (RMA_RETURNED)." });
      const saleItem = db2.prepare(`SELECT si.*, s.invoice_no, s.created_at as sale_date, s.customer_id, s.payment_mode, c.name as customer_name, c.phone as customer_phone FROM sale_items si JOIN sales s ON si.sale_id = s.sale_id LEFT JOIN customers c ON s.customer_id = c.customer_id WHERE si.instance_id = ? AND s.status = 'COMPLETED'`).get(instance.instance_id);
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
      const db2 = getDB2();
      const tx = db2.transaction(() => {
        const instance = db2.prepare("SELECT * FROM product_instances WHERE serial_number = ?").get(serial);
        if (!instance || instance.status === "RMA_RETURNED")
          throw new Error("Invalid or already returned serial.");
        const saleItem = db2.prepare(`SELECT si.*, s.payment_mode, s.customer_id, s.sale_id FROM sale_items si JOIN sales s ON si.sale_id = s.sale_id WHERE si.instance_id = ? AND s.status = 'COMPLETED'`).get(instance.instance_id);
        if (!saleItem)
          throw new Error("Sale item not found.");
        if (refund_amount > saleItem.unit_price)
          throw new Error("Refund amount cannot exceed original unit price.");
        let newStatus = "RMA_RETURNED";
        if (resolution === "CREDIT_NOTE" && condition_sealed)
          newStatus = "IN_STOCK";
        db2.prepare("UPDATE product_instances SET status = ? WHERE instance_id = ?").run(newStatus, instance.instance_id);
        let creditNoteNo = null;
        let cnId = null;
        if (resolution === "CREDIT_NOTE") {
          const prefixRow = db2.prepare("SELECT value FROM settings WHERE key = 'cn_prefix'").get();
          const sequenceRow = db2.prepare("SELECT value FROM settings WHERE key = 'next_cn_no'").get();
          const prefix = prefixRow?.value || "CN-";
          const sequence = sequenceRow?.value || "1";
          creditNoteNo = `${prefix}${sequence}`;
          db2.prepare(`INSERT INTO credit_notes (cn_no, sale_id, instance_id, amount, reason) VALUES (?, ?, ?, ?, ?)`).run(creditNoteNo, saleItem.sale_id, instance.instance_id, refund_amount, reason);
          cnId = db2.prepare("SELECT last_insert_rowid() as id").get().id;
          db2.prepare(`INSERT OR REPLACE INTO settings (key, value) VALUES ('next_cn_no', CAST((CAST(? AS INTEGER) + 1) AS TEXT))`).run(sequence);
          if (saleItem.payment_mode === "UDHAAR" && saleItem.customer_id) {
            db2.prepare("UPDATE customers SET current_balance = current_balance - ? WHERE customer_id = ?").run(refund_amount, saleItem.customer_id);
            const cust = db2.prepare("SELECT current_balance FROM customers WHERE customer_id = ?").get(saleItem.customer_id);
            db2.prepare(`INSERT INTO customer_ledger (customer_id, type, ref_id, amount, balance_after, note) VALUES (?, 'RETURN', (SELECT cn_id FROM credit_notes WHERE cn_no = ?), ?, ?, ?)`).run(saleItem.customer_id, creditNoteNo, refund_amount, cust.current_balance, `Credit Note ${creditNoteNo}`);
          }
        } else if (resolution === "REPLACEMENT") {
          if (!replacement_serial)
            throw new Error("Replacement serial is required.");
          const repInstance = db2.prepare("SELECT * FROM product_instances WHERE serial_number = ? AND status = 'IN_STOCK'").get(replacement_serial);
          if (!repInstance)
            throw new Error("Replacement serial not found or not IN_STOCK.");
          if (repInstance.product_id !== instance.product_id)
            throw new Error("Replacement must be of the same product.");
          const prodRow = db2.prepare("SELECT warranty_months FROM products WHERE product_id = ?").get(instance.product_id);
          const warrantyMonths = prodRow?.warranty_months ?? 12;
          db2.prepare(`UPDATE product_instances SET status = 'SOLD', sold_at = datetime('now'), warranty_expires_at = datetime('now', '+' || ? || ' months') WHERE instance_id = ?`).run(warrantyMonths, repInstance.instance_id);
          db2.prepare(`INSERT INTO sale_items (sale_id, product_id, instance_id, quantity, unit_price, line_discount, line_total) VALUES (?, ?, ?, 1, 0, 0, 0)`).run(saleItem.sale_id, repInstance.product_id, repInstance.instance_id);
        } else if (resolution === "SEND_TO_COMPANY") {
          db2.prepare(`INSERT INTO rma_register (instance_id, reason, status) VALUES (?, ?, 'SENT')`).run(instance.instance_id, reason);
        }
        db2.prepare(`INSERT INTO audit_log (user_id, action, entity, entity_id, detail) VALUES (?, 'RETURN_ACCEPT', 'product_instances', ?, ?)`).run(userId, instance.instance_id, `Resolution: ${resolution}, Refund: ${refund_amount}, Reason: ${reason}`);
        return { success: true, creditNoteNo, cnId, newStatus };
      });
      res.json(tx());
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  const ownerOnly = requireRole("VIEW_REPORTS");
  app2.get("/api/reports/insights", ownerOnly, (req, res) => {
    try {
      const db2 = getDB2();
      const marginByBrand = db2.prepare(`
        SELECT p.brand_name, 
               SUM(si.line_total) as revenue, 
               SUM(si.unit_cost * si.quantity) as cogs,
               SUM(si.line_total) - SUM(si.unit_cost * si.quantity) as margin
        FROM sale_items si
        JOIN sales s ON s.sale_id = si.sale_id
        JOIN products p ON p.product_id = si.product_id
        WHERE s.status = 'COMPLETED'
        GROUP BY p.brand_name
        ORDER BY margin DESC
      `).all();
      const marginByCategory = db2.prepare(`
        SELECT p.category, 
               SUM(si.line_total) as revenue, 
               SUM(si.line_total) - SUM(si.unit_cost * si.quantity) as margin
        FROM sale_items si
        JOIN sales s ON s.sale_id = si.sale_id
        JOIN products p ON p.product_id = si.product_id
        WHERE s.status = 'COMPLETED'
        GROUP BY p.category
        ORDER BY margin DESC
      `).all();
      const marginByTier = db2.prepare(`
        SELECT s.tier_applied, 
               SUM(si.line_total) as revenue, 
               SUM(si.line_total) - SUM(si.unit_cost * si.quantity) as margin
        FROM sale_items si
        JOIN sales s ON s.sale_id = si.sale_id
        WHERE s.status = 'COMPLETED'
        GROUP BY s.tier_applied
        ORDER BY margin DESC
      `).all();
      const bestMovers = db2.prepare(`
        SELECT p.brand_name, p.model_name, SUM(si.quantity) as qty_sold, SUM(si.line_total) as revenue
        FROM sale_items si
        JOIN sales s ON s.sale_id = si.sale_id
        JOIN products p ON p.product_id = si.product_id
        WHERE s.status = 'COMPLETED'
        GROUP BY p.product_id
        ORDER BY qty_sold DESC
        LIMIT 5
      `).all();
      const slowMovers = db2.prepare(`
        SELECT p.brand_name, p.model_name, COUNT(pi.instance_id) as current_stock
        FROM products p
        JOIN product_instances pi ON pi.product_id = p.product_id
        WHERE pi.status = 'IN_STOCK'
        AND p.product_id NOT IN (
          SELECT product_id FROM sale_items si
          JOIN sales s ON s.sale_id = si.sale_id
          WHERE s.created_at >= date('now', '-30 days')
        )
        GROUP BY p.product_id
        ORDER BY current_stock DESC
        LIMIT 5
      `).all();
      const topDealers = db2.prepare(`
        SELECT c.name, SUM(s.grand_total) as total_revenue
        FROM sales s
        JOIN customers c ON s.customer_id = c.customer_id
        WHERE s.status = 'COMPLETED' AND s.tier_applied IN ('DEALER', 'DISTRIBUTOR')
        GROUP BY c.customer_id
        ORDER BY total_revenue DESC
        LIMIT 5
      `).all();
      const salesByHour = db2.prepare(`
        SELECT strftime('%H', created_at) as hour, SUM(grand_total) as revenue, COUNT(sale_id) as transactions
        FROM sales
        WHERE status = 'COMPLETED'
        GROUP BY hour
        ORDER BY hour ASC
      `).all();
      res.json({ success: true, insights: {
        marginByBrand,
        marginByCategory,
        marginByTier,
        bestMovers,
        slowMovers,
        topDealers,
        salesByHour
      } });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app2.get("/api/reports/smart-reorder", ownerOnly, (req, res) => {
    try {
      const db2 = getDB2();
      const targetDays = parseInt(req.query.days || "15", 10);
      const query = `
        WITH recent_sales AS (
          SELECT si.product_id, SUM(si.quantity) as sold_last_30_days
          FROM sale_items si
          JOIN sales s ON s.sale_id = si.sale_id
          WHERE s.status = 'COMPLETED' AND s.created_at >= date('now', '-30 days')
          GROUP BY si.product_id
        ),
        current_inventory AS (
          SELECT p.product_id, p.brand_name, p.model_name, p.sku_code, p.category,
                 (CASE WHEN p.requires_serial = 1 THEN (
                   SELECT COUNT(*) FROM product_instances pi WHERE pi.product_id = p.product_id AND pi.status = 'IN_STOCK'
                 ) ELSE p.loose_qty END) as current_stock,
                 p.min_restock_level
          FROM products p
        )
        SELECT ci.product_id, ci.brand_name, ci.model_name, ci.sku_code, ci.category, ci.current_stock,
               COALESCE(rs.sold_last_30_days, 0) as sold_last_30,
               ci.min_restock_level
        FROM current_inventory ci
        LEFT JOIN recent_sales rs ON ci.product_id = rs.product_id
      `;
      const results = db2.prepare(query).all();
      const suggestions = [];
      for (const r of results) {
        const velocity = r.sold_last_30 / 30;
        const projectedDemand = velocity * targetDays;
        let targetStock = Math.max(projectedDemand, r.min_restock_level);
        if (r.current_stock < targetStock) {
          let suggestedOrder = Math.ceil(targetStock - r.current_stock);
          suggestions.push({
            ...r,
            velocity: velocity.toFixed(2),
            suggested_order: suggestedOrder,
            target_stock: Math.ceil(targetStock)
          });
        }
      }
      res.json({ success: true, suggestions: suggestions.sort((a, b) => b.suggested_order - a.suggested_order) });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app2.get("/api/reports/margin", ownerOnly, (req, res) => {
    const { startDate, endDate } = req.query;
    try {
      const db2 = getDB2();
      const query = `
        SELECT date(s.created_at) as date, p.category, p.brand_name, s.tier_applied,
               si.line_total, p.gst_rate, si.unit_cost, si.quantity
        FROM sale_items si
        JOIN sales s ON si.sale_id = s.sale_id
        JOIN products p ON si.product_id = p.product_id
        WHERE s.status != 'CANCELLED'
        ${startDate ? `AND s.created_at >= ?` : ""}
        ${endDate ? `AND s.created_at <= ?` : ""}
      `;
      const params = [];
      if (startDate)
        params.push(startDate + " 00:00:00");
      if (endDate)
        params.push(endDate + " 23:59:59");
      const rows = db2.prepare(query).all(...params);
      const { getTaxableValue } = require_gst();
      const groups = {};
      rows.forEach((r) => {
        const key = `${r.date}|${r.category}|${r.brand_name}|${r.tier_applied}`;
        if (!groups[key]) {
          groups[key] = { date: r.date, category: r.category, brand_name: r.brand_name, tier_applied: r.tier_applied, revenue: 0, cogs: 0, profit: 0 };
        }
        const revenue = getTaxableValue(r.line_total, r.gst_rate);
        const cogs = r.unit_cost * r.quantity;
        groups[key].revenue += revenue;
        groups[key].cogs += cogs;
        groups[key].profit += revenue - cogs;
      });
      const data = Object.values(groups).sort((a, b) => b.date.localeCompare(a.date));
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app2.get("/api/reports/sales", ownerOnly, (req, res) => {
    const { startDate, endDate } = req.query;
    try {
      const db2 = getDB2();
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
      res.json({ success: true, data: db2.prepare(query).all(...params) });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app2.get("/api/reports/low-stock", ownerOnly, (req, res) => {
    try {
      const db2 = getDB2();
      const data = db2.prepare(`
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
      const db2 = getDB2();
      const data = db2.prepare(`
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
      const db2 = getDB2();
      const data = db2.prepare(`
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
      const db2 = getDB2();
      const query = `
        SELECT s.sale_id, s.invoice_no, s.created_at, c.gstin, c.name as customer_name,
               s.subtotal, s.discount, s.cgst, s.sgst, s.igst, s.grand_total
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
      const invoices = db2.prepare(query).all(...params);
      const { getTaxableValue } = require_gst();
      let total_cgst = 0, total_sgst = 0, total_igst = 0, total_taxable = 0;
      for (const inv of invoices) {
        const items = db2.prepare(`SELECT si.line_total, p.gst_rate FROM sale_items si JOIN products p ON si.product_id = p.product_id WHERE si.sale_id = ?`).all(inv.sale_id);
        let inv_taxable = 0;
        let rates = /* @__PURE__ */ new Set();
        items.forEach((si) => {
          const ratio = (inv.subtotal - inv.discount) / inv.subtotal;
          const discountedLineTotal = si.line_total * ratio;
          inv_taxable += getTaxableValue(discountedLineTotal, si.gst_rate);
          rates.add(si.gst_rate);
        });
        inv.taxable = inv_taxable;
        inv.gst_rates = Array.from(rates).join(",");
        total_taxable += inv_taxable;
        total_cgst += inv.cgst;
        total_sgst += inv.sgst;
        total_igst += inv.igst;
      }
      res.json({
        success: true,
        data: { invoices, summary: { total_cgst, total_sgst, total_igst, total_taxable } }
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app2.get("/api/reports/udhaar", ownerOnly, (req, res) => {
    try {
      const db2 = getDB2();
      const customers = db2.prepare(`
        SELECT customer_id, name, phone, current_balance, credit_limit, credit_due_date
        FROM customers
        WHERE current_balance > 0
      `).all();
      const { calculateAging: calculateAging2 } = require_ledger();
      const buckets = { "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0, total_overdue: 0 };
      customers.forEach((c) => {
        const age = calculateAging2(c, /* @__PURE__ */ new Date());
        buckets["0-30"] += age["0-30"];
        buckets["31-60"] += age["31-60"];
        buckets["61-90"] += age["61-90"];
        buckets["90+"] += age["90+"];
        buckets["total_overdue"] += age.total_overdue;
      });
      const total_receivable = customers.reduce((sum, c) => sum + c.current_balance, 0);
      customers.sort((a, b) => b.current_balance - a.current_balance);
      res.json({ success: true, data: { customers, buckets, total_receivable } });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app2.get("/api/upi-accounts", requireRole("CHECKOUT"), (req, res) => {
    try {
      const db2 = getDB2();
      const accounts = db2.prepare("SELECT * FROM upi_accounts WHERE is_active = 1").all();
      if (accounts.length === 0) {
        return res.json({ success: true, data: [{ id: 0, name: "Default UPI", upi_id: "default@upi" }] });
      }
      res.json({ success: true, data: accounts });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app2.post("/api/upi-accounts", ownerOnly, (req, res) => {
    try {
      const { name, upi_id, merchant_code } = req.body;
      const db2 = getDB2();
      db2.prepare(`INSERT INTO upi_accounts (name, upi_id, merchant_code) VALUES (?, ?, ?)`).run(name, upi_id, merchant_code || null);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  return app2;
}
var import_express, import_cors, import_os, fs, overrideTokens, tokenCleanupInterval;
var init_api = __esm({
  "apps/desktop/electron/api.ts"() {
    "use strict";
    import_express = __toESM(require("express"));
    import_cors = __toESM(require("cors"));
    import_os = __toESM(require("os"));
    fs = __toESM(require("fs"));
    init_core();
    overrideTokens = /* @__PURE__ */ new Map();
    tokenCleanupInterval = setInterval(() => {
      const now = Date.now();
      overrideTokens.forEach((v, k) => {
        if (v.expires < now)
          overrideTokens.delete(k);
      });
    }, 6e4);
    if (tokenCleanupInterval.unref)
      tokenCleanupInterval.unref();
  }
});

// apps/desktop/electron/main.ts
var main_exports = {};
function loadPermissions() {
  try {
    const db2 = getDB();
    const rows = db2.prepare("SELECT key, value FROM settings WHERE key LIKE 'perm_%'").all();
    const overrides = {};
    rows.forEach((r) => {
      const parts = r.key.split("_");
      if (parts.length >= 3) {
        const role = parts[1];
        const action = parts.slice(2).join("_");
        overrides[`${role}_${action}`] = r.value === "true";
      }
    });
    setPermissionsOverrides(overrides);
  } catch (err) {
    console.error("Failed to load permission overrides:", err);
  }
}
function handleElevated(channel, action, handler) {
  import_electron.ipcMain.handle(channel, async (event, ...args) => {
    assertCan(activeDesktopSession?.role, action);
    return handler(event, ...args);
  });
}
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
function enqueueSms(phone, templateKey, vars, channel = "SMS") {
  try {
    const db2 = getDB();
    const settingsRows = db2.prepare("SELECT key, value FROM settings").all();
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
    db2.prepare("INSERT INTO sms_outbox (phone, body, channel) VALUES (?, ?, ?)").run(phone, body, channel);
    return true;
  } catch (err) {
    console.error("SMS Queue Error:", err);
    return false;
  }
}
async function sendViaGateway(msg) {
  const db2 = getDB();
  const settingsRows = db2.prepare("SELECT key, value FROM settings").all();
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
var import_electron, path, fs2, os2, import_node_thermal_printer, import_qrcode, userDataPath, configPath, activeConfig, sessionStore, schemaSql, devSchemaPath, prodSchemaPath, activeDesktopSession, PORT, serverInstance, lastBackupDate, mainWindow;
var init_main = __esm({
  "apps/desktop/electron/main.ts"() {
    "use strict";
    import_electron = require("electron");
    path = __toESM(require("path"));
    fs2 = __toESM(require("fs"));
    os2 = __toESM(require("os"));
    import_node_thermal_printer = require("node-thermal-printer");
    init_core();
    import_qrcode = __toESM(require("qrcode"));
    init_api();
    init_core();
    import_electron.app.setPath("userData", path.join(__dirname, "../../local_db_data"));
    userDataPath = import_electron.app.getPath("userData");
    if (!fs2.existsSync(userDataPath)) {
      fs2.mkdirSync(userDataPath, { recursive: true });
    }
    configPath = path.join(userDataPath, "db-config.json");
    activeConfig = {
      dbPath: path.join(userDataPath, "chauhan-erp.db"),
      backupDir: ""
    };
    sessionStore = /* @__PURE__ */ new Map();
    if (fs2.existsSync(configPath)) {
      try {
        activeConfig = JSON.parse(fs2.readFileSync(configPath, "utf8"));
      } catch (e) {
        console.error("Error reading db-config.json, using defaults", e);
      }
    } else {
      fs2.writeFileSync(configPath, JSON.stringify(activeConfig, null, 2));
    }
    schemaSql = "";
    devSchemaPath = path.join(__dirname, "../../packages/core/schema.sql");
    prodSchemaPath = path.join(process.resourcesPath, "schema.sql");
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
        const db2 = getDB();
        const cols = db2.prepare("PRAGMA table_info(sms_outbox)").all();
        if (!cols.find((c) => c.name === "channel")) {
          db2.prepare("ALTER TABLE sms_outbox ADD COLUMN channel TEXT DEFAULT 'SMS'").run();
          console.log("Migration: added channel column to sms_outbox");
        }
      } catch (migErr) {
        console.error("Migration error (channel):", migErr);
      }
      try {
        const db2 = getDB();
        const prodCols = db2.prepare("PRAGMA table_info(products)").all();
        if (!prodCols.find((c) => c.name === "purchase_cost")) {
          db2.prepare("ALTER TABLE products ADD COLUMN purchase_cost INTEGER DEFAULT 0").run();
          console.log("Migration: added purchase_cost to products");
        }
        if (!prodCols.find((c) => c.name === "supplier_id")) {
          db2.prepare("ALTER TABLE products ADD COLUMN supplier_id INTEGER REFERENCES suppliers(supplier_id)").run();
          console.log("Migration: added supplier_id to products");
        }
        const siCols = db2.prepare("PRAGMA table_info(sale_items)").all();
        if (!siCols.find((c) => c.name === "unit_cost")) {
          db2.prepare("ALTER TABLE sale_items ADD COLUMN unit_cost INTEGER DEFAULT 0").run();
          console.log("Migration: added unit_cost to sale_items");
          db2.prepare(`
        UPDATE sale_items
        SET unit_cost = (
          SELECT pi.purchase_cost 
          FROM product_instances pi 
          WHERE pi.instance_id = sale_items.instance_id
        )
        WHERE instance_id IS NOT NULL AND unit_cost = 0;
      `).run();
          console.log("Migration: backfilled unit_cost for serialized items");
        }
      } catch (migErr) {
        console.error("Migration error (reports):", migErr);
      }
    } catch (err) {
      console.error("Failed to initialize database", err);
    }
    loadPermissions();
    activeDesktopSession = null;
    PORT = 47615;
    serverInstance = null;
    import_electron.ipcMain.handle("verify-desktop-pin", (e, pin) => {
      const db2 = getDB();
      const users = db2.prepare("SELECT * FROM users WHERE active = 1").all();
      const bcrypt = require("bcryptjs");
      const matchedUser = users.find((u) => bcrypt.compareSync(pin, u.pin_hash));
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
    import_electron.ipcMain.handle("get-session", () => {
      return activeDesktopSession;
    });
    lastBackupDate = "";
    setInterval(() => {
      try {
        const now = /* @__PURE__ */ new Date();
        if (now.getHours() >= 21) {
          const todayStr = now.toISOString().split("T")[0];
          if (lastBackupDate !== todayStr && activeConfig.backupDir) {
            if (!fs2.existsSync(activeConfig.backupDir)) {
              fs2.mkdirSync(activeConfig.backupDir, { recursive: true });
            }
            const dest = performBackup(activeConfig.backupDir);
            lastBackupDate = todayStr;
            console.log(`Automated cron backup succeeded for ${todayStr}: ${dest}`);
          }
        }
      } catch (err) {
        console.error("Automated cron backup failed:", err);
      }
    }, 5 * 60 * 1e3);
    import_electron.ipcMain.handle("check-first-run", async () => {
      const db2 = getDB();
      const row = db2.prepare("SELECT value FROM settings WHERE key = 'first_run'").get();
      return { firstRun: !row || row.value !== "0" };
    });
    handleElevated("db-query", "BACKUP_RESTORE", async (event, sql, params = []) => {
      const db2 = getDB();
      return db2.prepare(sql).all(...params);
    });
    handleElevated("db-get", "BACKUP_RESTORE", async (event, sql, params = []) => {
      const db2 = getDB();
      return db2.prepare(sql).get(...params);
    });
    handleElevated("db-run", "BACKUP_RESTORE", async (event, sql, params = []) => {
      const db2 = getDB();
      const res = db2.prepare(sql).run(...params);
      return {
        changes: res.changes,
        lastInsertRowid: res.lastInsertRowid
      };
    });
    handleElevated("db-transaction", "BACKUP_RESTORE", async (event, queries) => {
      const db2 = getDB();
      const runTx = db2.transaction((txQueries) => {
        const results = [];
        for (const q of txQueries) {
          results.push(db2.prepare(q.sql).run(...q.params));
        }
        return results;
      });
      const res = runTx(queries);
      if (queries.some((q) => q.sql.toLowerCase().includes("settings"))) {
        loadPermissions();
      }
      return res;
    });
    import_electron.ipcMain.handle("initialize-setup", async (event, queries) => {
      const db2 = getDB();
      const row = db2.prepare("SELECT value FROM settings WHERE key = 'first_run'").get();
      const alreadyDone = row && row.value === "0";
      if (alreadyDone) {
        const ownerExists = db2.prepare("SELECT user_id FROM users WHERE role = 'OWNER' LIMIT 1").get();
        if (ownerExists) {
          throw new Error("Setup already completed");
        }
        db2.prepare("UPDATE settings SET value = '1' WHERE key = 'first_run'").run();
      }
      const runTx = db2.transaction((txQueries) => {
        const results = [];
        for (const q of txQueries) {
          results.push(db2.prepare(q.sql).run(...q.params));
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
      const db2 = getDB();
      const customers = db2.prepare("SELECT * FROM customers").all();
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
      const db2 = getDB();
      return db2.prepare("SELECT * FROM customer_ledger WHERE customer_id = ? ORDER BY id DESC").all(customerId);
    });
    import_electron.ipcMain.handle("record-udhaar-payment", async (event, customerId, amount, note) => {
      assertCan(activeDesktopSession?.role, "RECORD_PAYMENT");
      const db2 = getDB();
      const tx = db2.transaction(() => {
        db2.prepare("UPDATE customers SET current_balance = current_balance - ? WHERE customer_id = ?").run(amount, customerId);
        const newCustomer = db2.prepare("SELECT current_balance FROM customers WHERE customer_id = ?").get(customerId);
        db2.prepare(`
      INSERT INTO customer_ledger (customer_id, type, amount, balance_after, note)
      VALUES (?, 'PAYMENT', ?, ?, ?)
    `).run(customerId, amount, newCustomer.current_balance, note);
        db2.prepare("INSERT INTO audit_log (user_id, action, entity, entity_id, detail) VALUES (?, 'RECORD_PAYMENT', 'customer_ledger', ?, ?)").run(activeDesktopSession?.user_id, customerId, `Payment amount: ${amount}`);
        return newCustomer.current_balance;
      });
      return tx();
    });
    import_electron.ipcMain.handle("queue-sms-reminder", async (event, customerId) => {
      assertCan(activeDesktopSession?.role, "RECORD_PAYMENT");
      const db2 = getDB();
      const customer = db2.prepare("SELECT * FROM customers WHERE customer_id = ?").get(customerId);
      if (!customer || !customer.phone)
        throw new Error("Customer or phone not found");
      const shopNameRow = db2.prepare("SELECT value FROM settings WHERE key = 'shop_name'").get();
      const shopName = shopNameRow?.value || "Chauhan Electronics";
      const body = formatPaymentReminder(customer, shopName);
      db2.prepare(`
    INSERT INTO sms_outbox (phone, body, status) VALUES (?, ?, 'QUEUED')
  `).run(customer.phone, body);
      return true;
    });
    import_electron.ipcMain.handle("get-suppliers", async () => {
      assertCan(activeDesktopSession?.role, "READ_SUPPLIERS");
      const db2 = getDB();
      return db2.prepare("SELECT * FROM suppliers ORDER BY name ASC").all();
    });
    handleElevated("create-supplier", "CREATE_SUPPLIER", async (event, name, phone, gstin) => {
      const db2 = getDB();
      const res = db2.prepare(
        "INSERT INTO suppliers (name, phone, gstin, current_payable) VALUES (?, ?, ?, 0)"
      ).run(name, phone || null, gstin || null);
      return res.lastInsertRowid;
    });
    import_electron.ipcMain.handle("get-supplier-ledger", async (event, supplierId) => {
      assertCan(activeDesktopSession?.role, "READ_SUPPLIERS");
      const db2 = getDB();
      const grns = db2.prepare(`
    SELECT grn_id as id, 'PURCHASE' as type, invoice_ref as ref, total_cost as amount, created_at
    FROM grn 
    WHERE supplier_id = ?
  `).all(supplierId);
      const payments = db2.prepare(`
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
      const db2 = getDB();
      const tx = db2.transaction(() => {
        db2.prepare("UPDATE suppliers SET current_payable = current_payable - ? WHERE supplier_id = ?").run(amount, supplierId);
        db2.prepare(`
      INSERT INTO expenses (category, amount, note) VALUES ('SUPPLIER_PAYMENT', ?, ?)
    `).run(amount, `Supplier ID: ${supplierId} | ${note}`);
        return true;
      });
      return tx();
    });
    import_electron.ipcMain.handle("commit-intake-batch", async (event, payload) => {
      assertCan(activeDesktopSession?.role, "RECEIVE_GRN");
      const { supplier_id, invoice_ref, total_cost_paise, user_id, items, type } = payload;
      const db2 = getDB();
      const tx = db2.transaction(() => {
        const grnRes = db2.prepare(`
      INSERT INTO grn (supplier_id, invoice_ref, total_cost, received_by)
      VALUES (?, ?, ?, ?)
    `).run(supplier_id || null, invoice_ref || "INTAKE", total_cost_paise, activeDesktopSession?.user_id);
        const grnId = grnRes.lastInsertRowid;
        if (supplier_id) {
          db2.prepare("UPDATE suppliers SET current_payable = current_payable + ? WHERE supplier_id = ?").run(total_cost_paise, supplier_id);
        }
        if (type === "SERIALIZED") {
          for (const item of items) {
            db2.prepare(`
          INSERT INTO product_instances (product_id, serial_number, status, batch_number, purchase_cost, grn_id)
          VALUES (?, ?, 'IN_STOCK', ?, ?, ?)
        `).run(item.product_id, item.serial_number, item.batch_number, item.purchase_cost, grnId);
          }
        } else if (type === "LOOSE") {
          for (const item of items) {
            db2.prepare("UPDATE products SET loose_qty = loose_qty + ? WHERE product_id = ?").run(item.qty, item.product_id);
          }
        }
        db2.prepare(`INSERT INTO audit_log (user_id, action, entity, entity_id, detail) VALUES (?, 'RECEIVE_GRN', 'grn', ?, ?)`).run(activeDesktopSession?.user_id, grnId, `Processed ${type} intake via LAN API.`);
        return grnId;
      });
      return tx();
    });
    import_electron.ipcMain.handle("create-product", async (event, payload) => {
      assertCan(activeDesktopSession?.role, "RECEIVE_GRN");
      const db2 = getDB();
      const tx = db2.transaction(() => {
        const res = db2.prepare(`
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
            db2.prepare("INSERT INTO product_fitment (product_id, vehicle_tag) VALUES (?, ?)").run(newId, tag);
          }
        }
        db2.prepare(`INSERT INTO audit_log (user_id, action, entity, entity_id, detail) VALUES (?, 'CREATE', 'product', ?, ?)`).run(activeDesktopSession?.user_id, newId, `Created product model: ${payload.brand_name} ${payload.model_name}`);
        return newId;
      });
      return tx();
    });
    import_electron.ipcMain.handle("get-repair-jobs", async () => {
      assertCan(activeDesktopSession?.role, "READ_REPAIRS");
      const db2 = getDB();
      return db2.prepare("SELECT * FROM repair_jobs ORDER BY job_id DESC").all();
    });
    import_electron.ipcMain.handle("create-repair-job", async (event, payload) => {
      assertCan(activeDesktopSession?.role, "MANAGE_REPAIRS");
      const db2 = getDB();
      const tx = db2.transaction(() => {
        const prefixRow = db2.prepare("SELECT value FROM settings WHERE key = 'job_prefix'").get();
        const nextNoRow = db2.prepare("SELECT value FROM settings WHERE key = 'next_job_no'").get();
        let prefix = prefixRow ? prefixRow.value : "JOB-";
        let nextNo = nextNoRow ? parseInt(nextNoRow.value, 10) : 1e3;
        if (!prefixRow)
          db2.prepare("INSERT INTO settings (key, value) VALUES ('job_prefix', 'JOB-')").run();
        if (!nextNoRow)
          db2.prepare("INSERT INTO settings (key, value) VALUES ('next_job_no', '1000')").run();
        const jobNo = `${prefix}${nextNo}`;
        let custId = payload.customer_id || null;
        if (!custId && payload.customer_phone) {
          const match = db2.prepare("SELECT customer_id FROM customers WHERE phone = ?").get(payload.customer_phone);
          if (match)
            custId = match.customer_id;
        }
        const res = db2.prepare(`
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
        db2.prepare("UPDATE settings SET value = ? WHERE key = 'next_job_no'").run((nextNo + 1).toString());
        return res.lastInsertRowid;
      });
      return tx();
    });
    import_electron.ipcMain.handle("get-repair-parts", async (event, jobId) => {
      assertCan(activeDesktopSession?.role, "READ_REPAIRS");
      const db2 = getDB();
      return db2.prepare(`
    SELECT rp.*, p.brand_name, p.model_name 
    FROM repair_parts rp
    JOIN products p ON rp.product_id = p.product_id
    WHERE rp.job_id = ?
  `).all(jobId);
    });
    import_electron.ipcMain.handle("add-repair-part", async (event, jobId, type, item) => {
      assertCan(activeDesktopSession?.role, "MANAGE_REPAIRS");
      const db2 = getDB();
      const tx = db2.transaction(() => {
        let cost = item.cost;
        if (type === "SERIALIZED") {
          const res = db2.prepare("UPDATE product_instances SET status = 'SOLD' WHERE instance_id = ? AND status = 'IN_STOCK'").run(item.instance_id);
          if (res.changes === 0)
            throw new Error("Serial number not available in stock.");
          db2.prepare(`
        INSERT INTO repair_parts (job_id, product_id, instance_id, qty, cost)
        VALUES (?, ?, ?, 1, ?)
      `).run(jobId, item.product_id, item.instance_id, cost);
        } else {
          const prod = db2.prepare("SELECT loose_qty FROM products WHERE product_id = ?").get(item.product_id);
          if (!prod || prod.loose_qty < item.qty)
            throw new Error("Not enough loose quantity in stock.");
          db2.prepare("UPDATE products SET loose_qty = loose_qty - ? WHERE product_id = ?").run(item.qty, item.product_id);
          db2.prepare(`
        INSERT INTO repair_parts (job_id, product_id, qty, cost)
        VALUES (?, ?, ?, ?)
      `).run(jobId, item.product_id, item.qty, cost * item.qty);
          cost = cost * item.qty;
        }
        db2.prepare("UPDATE repair_jobs SET parts_cost = parts_cost + ? WHERE job_id = ?").run(cost, jobId);
        return true;
      });
      return tx();
    });
    import_electron.ipcMain.handle("update-repair-status", async (event, jobId, newStatus, notes) => {
      assertCan(activeDesktopSession?.role, "MANAGE_REPAIRS");
      const db2 = getDB();
      const tx = db2.transaction(() => {
        const job = db2.prepare("SELECT status FROM repair_jobs WHERE job_id = ?").get(jobId);
        if (!job)
          throw new Error("Job not found");
        if (job.status !== newStatus) {
          db2.prepare("INSERT INTO repair_status_history (job_id, old_status, new_status) VALUES (?, ?, ?)").run(jobId, job.status, newStatus);
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
          db2.prepare(`UPDATE repair_jobs SET status = ?${extraUpdate} WHERE job_id = ?`).run(...params);
          db2.prepare("INSERT INTO audit_log (user_id, action, entity, entity_id, detail) VALUES (?, 'REPAIR_STATUS_UPDATE', 'repair_jobs', ?, ?)").run(activeDesktopSession?.user_id, jobId, `Status changed from ${job.status} to ${newStatus}`);
        } else if (notes) {
          db2.prepare(`UPDATE repair_jobs SET technician_notes = ? WHERE job_id = ?`).run(notes, jobId);
        }
        return true;
      });
      return tx();
    });
    import_electron.ipcMain.handle("deliver-repair-job", async (event, jobId, finalCost, labourCost) => {
      assertCan(activeDesktopSession?.role, "MANAGE_REPAIRS");
      const db2 = getDB();
      db2.prepare(`
    UPDATE repair_jobs 
    SET status = 'DELIVERED', final_cost = ?, labour_cost = ?, delivered_date = datetime('now')
    WHERE job_id = ?
  `).run(finalCost, labourCost, jobId);
      return true;
    });
    handleElevated("record-expense", "RECORD_EXPENSE", async (event, category, amount, note) => {
      const db2 = getDB();
      const res = db2.prepare(`
    INSERT INTO expenses (category, amount, note) VALUES (?, ?, ?)
  `).run(category, amount, note);
      return res.lastInsertRowid;
    });
    import_electron.ipcMain.handle("get-expenses", async (event, limit = 50) => {
      assertCan(activeDesktopSession?.role, "READ_ACCOUNTING");
      const db2 = getDB();
      return db2.prepare(`
    SELECT * FROM expenses 
    WHERE category != 'SUPPLIER_PAYMENT' 
    ORDER BY created_at DESC LIMIT ?
  `).all(limit);
    });
    import_electron.ipcMain.handle("get-eod-reconciliation", async (event, dateStr) => {
      assertCan(activeDesktopSession?.role, "READ_ACCOUNTING");
      const db2 = getDB();
      const datePattern = `${dateStr}%`;
      const sales = db2.prepare(`
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
      const udhaarRow = db2.prepare(`
    SELECT SUM(amount) as total FROM customer_ledger 
    WHERE type = 'PAYMENT' AND created_at LIKE ?
  `).get(datePattern);
      const udhaarReceived = udhaarRow?.total || 0;
      const expRow = db2.prepare(`
    SELECT SUM(amount) as total FROM expenses 
    WHERE category != 'SUPPLIER_PAYMENT' AND created_at LIKE ?
  `).get(datePattern);
      const opsExpenses = expRow?.total || 0;
      const supRow = db2.prepare(`
    SELECT SUM(amount) as total FROM expenses 
    WHERE category = 'SUPPLIER_PAYMENT' AND created_at LIKE ?
  `).get(datePattern);
      const supplierPayments = supRow?.total || 0;
      const cogsRow = db2.prepare(`
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
      const db2 = getDB();
      const { canceled, filePath } = await import_electron.dialog.showSaveDialog(mainWindow, {
        title: "Backup Database",
        defaultPath: `chauhan_erp_backup_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.sqlite`,
        filters: [{ name: "SQLite Database", extensions: ["sqlite"] }]
      });
      if (canceled || !filePath)
        return { success: false, error: "Canceled" };
      try {
        await db2.backup(filePath);
        return { success: true, filePath };
      } catch (err) {
        return { success: false, error: err.message };
      }
    });
    handleElevated("export-csv", "BACKUP_RESTORE", async (event, tableName) => {
      if (!mainWindow)
        return { success: false, error: "No main window" };
      const db2 = getDB();
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
        const rows = db2.prepare(`SELECT * FROM ${tableName}`).all();
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
    handleElevated("get-report-data", "VIEW_REPORTS", async (event, reportType, params) => {
      const db2 = getDB();
      const { startDate, endDate, days } = params || {};
      const sDate = startDate ? startDate + " 00:00:00" : null;
      const eDate = endDate ? endDate + " 23:59:59" : null;
      if (reportType === "Margin") {
        const rows = db2.prepare(`
      SELECT date(s.created_at) as date, p.category, p.brand_name, s.tier_applied,
             si.line_total, p.gst_rate, si.unit_cost, si.quantity
      FROM sale_items si JOIN sales s ON si.sale_id = s.sale_id JOIN products p ON si.product_id = p.product_id
      WHERE s.status != 'CANCELLED' ${sDate ? "AND s.created_at >= ?" : ""} ${eDate ? "AND s.created_at <= ?" : ""}
    `).all(...sDate && eDate ? [sDate, eDate] : []);
        const { getTaxableValue } = require_gst();
        const groups = {};
        rows.forEach((r) => {
          const key = `${r.date}|${r.category}|${r.brand_name}|${r.tier_applied}`;
          if (!groups[key])
            groups[key] = { date: r.date, category: r.category, brand_name: r.brand_name, tier_applied: r.tier_applied, revenue: 0, cogs: 0, profit: 0 };
          const revenue = getTaxableValue(r.line_total, r.gst_rate);
          const cogs = r.unit_cost * r.quantity;
          groups[key].revenue += revenue;
          groups[key].cogs += cogs;
          groups[key].profit += revenue - cogs;
        });
        return Object.values(groups).sort((a, b) => b.date.localeCompare(a.date));
      }
      if (reportType === "Sales") {
        return db2.prepare(`
      SELECT date(s.created_at) as date, p.category, p.brand_name, s.tier_applied,
             SUM(si.line_total) as total_revenue, SUM(si.quantity) as items_sold, COUNT(DISTINCT s.sale_id) as invoices_count
      FROM sale_items si JOIN sales s ON si.sale_id = s.sale_id JOIN products p ON si.product_id = p.product_id
      WHERE s.status != 'CANCELLED' ${sDate ? "AND s.created_at >= ?" : ""} ${eDate ? "AND s.created_at <= ?" : ""}
      GROUP BY date, p.category, p.brand_name, s.tier_applied ORDER BY date DESC
    `).all(...sDate && eDate ? [sDate, eDate] : []);
      }
      if (reportType === "LowStock") {
        return db2.prepare(`
      SELECT p.product_id, p.sku_code, p.model_name, p.min_restock_level, s.name as supplier_name,
             (SELECT COUNT(*) FROM product_instances pi WHERE pi.product_id = p.product_id AND pi.status = 'IN_STOCK') + p.loose_qty as in_stock_qty
      FROM products p LEFT JOIN suppliers s ON p.supplier_id = s.supplier_id
      WHERE ((SELECT COUNT(*) FROM product_instances pi WHERE pi.product_id = p.product_id AND pi.status = 'IN_STOCK') + p.loose_qty) <= p.min_restock_level
      ORDER BY s.name, p.model_name
    `).all();
      }
      if (reportType === "DeadStock") {
        return db2.prepare(`
      SELECT p.product_id, p.sku_code, p.model_name, MAX(s.created_at) as last_sale_date,
             (SELECT COUNT(*) FROM product_instances pi WHERE pi.product_id = p.product_id AND pi.status = 'IN_STOCK') + p.loose_qty as in_stock_qty
      FROM products p LEFT JOIN sale_items si ON p.product_id = si.product_id LEFT JOIN sales s ON si.sale_id = s.sale_id
      GROUP BY p.product_id
      HAVING (last_sale_date IS NULL OR last_sale_date <= datetime('now', ?)) AND in_stock_qty > 0
      ORDER BY last_sale_date ASC
    `).all(`-${days || 30} days`);
      }
      if (reportType === "Valuation") {
        const data = db2.prepare(`
      SELECT (SELECT SUM(purchase_cost) FROM product_instances WHERE status = 'IN_STOCK') as serialized_value,
             (SELECT SUM(loose_qty * purchase_cost) FROM products) as loose_value
    `).get();
        data.total = (data.serialized_value || 0) + (data.loose_value || 0);
        return data;
      }
      if (reportType === "GSTR1") {
        const invoices = db2.prepare(`
      SELECT s.sale_id, s.invoice_no, s.created_at, c.gstin, c.name as customer_name, s.subtotal, s.discount, s.cgst, s.sgst, s.igst, s.grand_total
      FROM sales s LEFT JOIN customers c ON s.customer_id = c.customer_id
      WHERE s.status != 'CANCELLED' ${sDate ? "AND s.created_at >= ?" : ""} ${eDate ? "AND s.created_at <= ?" : ""}
      ORDER BY s.created_at DESC
    `).all(...sDate && eDate ? [sDate, eDate] : []);
        const { getTaxableValue } = require_gst();
        let total_cgst = 0, total_sgst = 0, total_igst = 0, total_taxable = 0;
        for (const inv of invoices) {
          const items = db2.prepare(`SELECT si.line_total, p.gst_rate FROM sale_items si JOIN products p ON si.product_id = p.product_id WHERE si.sale_id = ?`).all(inv.sale_id);
          let inv_taxable = 0;
          let rates = /* @__PURE__ */ new Set();
          items.forEach((si) => {
            const ratio = (inv.subtotal - inv.discount) / inv.subtotal;
            inv_taxable += getTaxableValue(si.line_total * ratio, si.gst_rate);
            rates.add(si.gst_rate);
          });
          inv.taxable = inv_taxable;
          inv.gst_rates = Array.from(rates).join(",");
          total_taxable += inv_taxable;
          total_cgst += inv.cgst;
          total_sgst += inv.sgst;
          total_igst += inv.igst;
        }
        return { invoices, summary: { total_cgst, total_sgst, total_igst, total_taxable } };
      }
      if (reportType === "Udhaar") {
        const customers = db2.prepare(`SELECT customer_id, name, phone, current_balance, credit_limit, credit_due_date FROM customers WHERE current_balance > 0`).all();
        const { calculateAging: calculateAging2 } = require_ledger();
        const buckets = { "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0, total_overdue: 0 };
        customers.forEach((c) => {
          const age = calculateAging2(c, /* @__PURE__ */ new Date());
          buckets["0-30"] += age["0-30"];
          buckets["31-60"] += age["31-60"];
          buckets["61-90"] += age["61-90"];
          buckets["90+"] += age["90+"];
          buckets["total_overdue"] += age.total_overdue;
        });
        const total_receivable = customers.reduce((sum, c) => sum + c.current_balance, 0);
        customers.sort((a, b) => b.current_balance - a.current_balance);
        return { customers, buckets, total_receivable };
      }
      throw new Error("Unknown report type");
    });
    import_electron.ipcMain.handle("db-warranty-check", async (event, serial) => {
      assertCan(activeDesktopSession?.role, "READ_DASHBOARD");
      const db2 = getDB();
      const instance = db2.prepare(`
    SELECT pi.*, p.brand_name, p.model_name, p.category 
    FROM product_instances pi
    JOIN products p ON pi.product_id = p.product_id
    WHERE pi.serial_number = ?
  `).get(serial);
      if (!instance)
        return { found: false };
      const saleItem = db2.prepare(`
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
      const db2 = getDB();
      const instance = db2.prepare("SELECT * FROM product_instances WHERE serial_number = ?").get(serial);
      if (!instance)
        return { outcome: "REJECT_UNKNOWN", message: "Never part of our inventory." };
      if (instance.status === "RMA_RETURNED")
        return { outcome: "REJECT_ALREADY_RETURNED", message: "Already returned." };
      const saleItem = db2.prepare(`
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
      const db2 = getDB();
      const tx = db2.transaction(() => {
        const instance = db2.prepare("SELECT * FROM product_instances WHERE serial_number = ?").get(serial);
        if (!instance || instance.status === "RMA_RETURNED")
          throw new Error("Invalid or already returned serial.");
        const saleItem = db2.prepare(`
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
        db2.prepare("UPDATE product_instances SET status = ? WHERE instance_id = ?").run(newStatus, instance.instance_id);
        let creditNoteNo = null;
        let cnId = null;
        if (resolution === "CREDIT_NOTE") {
          const prefixRow = db2.prepare("SELECT value FROM settings WHERE key = 'cn_prefix'").get();
          const sequenceRow = db2.prepare("SELECT value FROM settings WHERE key = 'next_cn_no'").get();
          const prefix = prefixRow?.value || "CN-";
          const sequence = sequenceRow?.value || "1";
          creditNoteNo = `${prefix}${sequence}`;
          db2.prepare(`
        INSERT INTO credit_notes (cn_no, sale_id, instance_id, amount, reason)
        VALUES (?, ?, ?, ?, ?)
      `).run(creditNoteNo, saleItem.sale_id, instance.instance_id, refund_amount, reason);
          cnId = db2.prepare("SELECT last_insert_rowid() as id").get().id;
          db2.prepare(`
        INSERT OR REPLACE INTO settings (key, value) 
        VALUES ('next_cn_no', CAST((CAST(? AS INTEGER) + 1) AS TEXT))
      `).run(sequence);
          if (saleItem.payment_mode === "UDHAAR" && saleItem.customer_id) {
            db2.prepare("UPDATE customers SET current_balance = current_balance - ? WHERE customer_id = ?").run(refund_amount, saleItem.customer_id);
            const cust = db2.prepare("SELECT current_balance FROM customers WHERE customer_id = ?").get(saleItem.customer_id);
            db2.prepare(`
          INSERT INTO customer_ledger (customer_id, type, ref_id, amount, balance_after, note)
          VALUES (?, 'RETURN', (SELECT cn_id FROM credit_notes WHERE cn_no = ?), ?, ?, ?)
        `).run(saleItem.customer_id, creditNoteNo, refund_amount, cust.current_balance, `Credit Note ${creditNoteNo}`);
          }
        } else if (resolution === "REPLACEMENT") {
          if (!replacement_serial)
            throw new Error("Replacement serial is required.");
          const repInstance = db2.prepare("SELECT * FROM product_instances WHERE serial_number = ? AND status = 'IN_STOCK'").get(replacement_serial);
          if (!repInstance)
            throw new Error("Replacement serial not found or not IN_STOCK.");
          const prodRow = db2.prepare("SELECT warranty_months FROM products WHERE product_id = ?").get(instance.product_id);
          const warrantyMonths = prodRow?.warranty_months ?? 12;
          db2.prepare(`
        UPDATE product_instances SET status = 'SOLD', sold_at = datetime('now'), warranty_expires_at = datetime('now', '+' || ? || ' months')
        WHERE instance_id = ?
      `).run(warrantyMonths, repInstance.instance_id);
          db2.prepare(`
        INSERT INTO sale_items (sale_id, product_id, instance_id, quantity, unit_price, line_discount, line_total)
        VALUES (?, ?, ?, 1, 0, 0, 0)
      `).run(saleItem.sale_id, repInstance.product_id, repInstance.instance_id);
        } else if (resolution === "SEND_TO_COMPANY") {
          db2.prepare(`
        INSERT INTO rma_register (instance_id, reason, status)
        VALUES (?, ?, 'SENT')
      `).run(instance.instance_id, reason);
        }
        db2.prepare(`
      INSERT INTO audit_log (user_id, action, entity, entity_id, detail)
      VALUES (?, 'RETURN_ACCEPT', 'product_instances', ?, ?)
    `).run(activeDesktopSession?.user_id, instance.instance_id, `Resolution: ${resolution}, Refund: ${refund_amount}, Reason: ${reason}`);
        return { success: true, creditNoteNo, cnId, newStatus };
      });
      return tx();
    });
    import_electron.ipcMain.handle("db-void-sale", async (event, saleId) => {
      assertCan(activeDesktopSession?.role, "VOID_SALE");
      const db2 = getDB();
      const tx = db2.transaction(() => {
        const sale = db2.prepare("SELECT * FROM sales WHERE sale_id = ?").get(saleId);
        if (!sale)
          throw new Error(`Sale #${saleId} not found.`);
        if (sale.status === "CANCELLED")
          throw new Error(`Sale #${saleId} is already voided.`);
        db2.prepare("UPDATE sales SET status = 'CANCELLED' WHERE sale_id = ?").run(saleId);
        const items = db2.prepare("SELECT * FROM sale_items WHERE sale_id = ?").all(saleId);
        for (const item of items) {
          if (item.instance_id) {
            db2.prepare("UPDATE product_instances SET status = 'IN_STOCK' WHERE instance_id = ?").run(item.instance_id);
          } else {
            db2.prepare("UPDATE products SET loose_qty = loose_qty + ? WHERE product_id = ?").run(item.quantity, item.product_id);
          }
        }
        if (sale.payment_mode === "UDHAAR") {
          const debt = sale.grand_total - sale.amount_paid;
          if (debt > 0 && sale.customer_id) {
            db2.prepare("UPDATE customers SET current_balance = current_balance - ? WHERE customer_id = ?").run(debt, sale.customer_id);
          }
        }
        db2.prepare("INSERT INTO audit_log (user_id, action, entity, entity_id, detail) VALUES (?, ?, ?, ?, ?)").run(activeDesktopSession?.user_id || 1, "DELETE", "sales", saleId, `Voided sale #${saleId} and restored inventory.`);
        return { success: true };
      });
      return tx();
    });
    import_electron.ipcMain.handle("db-rma-list", async () => {
      assertCan(activeDesktopSession?.role, "READ_CATALOGUE");
      const db2 = getDB();
      return db2.prepare(`
    SELECT r.*, pi.serial_number, p.brand_name, p.model_name, s.name as supplier_name
    FROM rma_register r
    JOIN product_instances pi ON r.instance_id = pi.instance_id
    JOIN products p ON pi.product_id = p.product_id
    LEFT JOIN suppliers s ON r.supplier_id = s.supplier_id
    ORDER BY r.sent_at DESC
  `).all();
    });
    handleElevated("db-rma-dispatch", "EDIT_CATALOGUE", async (event, rma_id, supplier_id, tracking_id) => {
      const db2 = getDB();
      db2.prepare("UPDATE rma_register SET supplier_id = ?, tracking_id = ? WHERE rma_id = ?").run(supplier_id || null, tracking_id || null, rma_id);
      return { success: true };
    });
    handleElevated("db-rma-resolve", "EDIT_CATALOGUE", async (event, rma_id, status, note) => {
      const db2 = getDB();
      const tx = db2.transaction(() => {
        db2.prepare("UPDATE rma_register SET status = ?, resolved_at = datetime('now'), note = ? WHERE rma_id = ?").run(status, note || null, rma_id);
        if (status === "RECEIVED_BACK") {
          const rma = db2.prepare("SELECT instance_id FROM rma_register WHERE rma_id = ?").get(rma_id);
          db2.prepare("UPDATE product_instances SET status = 'IN_STOCK' WHERE instance_id = ?").run(rma.instance_id);
        }
        return true;
      });
      return tx();
    });
    import_electron.ipcMain.handle("get-print-data", async (event, kind, id) => {
      assertCan(activeDesktopSession?.role, "READ_DASHBOARD");
      const db2 = getDB();
      const settingsRows = db2.prepare("SELECT key, value FROM settings").all();
      const settings = {};
      settingsRows.forEach((r) => settings[r.key] = r.value);
      if (kind === "SALE") {
        const sale = db2.prepare(`
      SELECT s.*, c.name as customer_name, c.gstin as customer_gstin, c.phone as customer_phone, c.shop_name as customer_shop_name 
      FROM sales s LEFT JOIN customers c ON s.customer_id = c.customer_id
      WHERE s.sale_id = ?
    `).get(id);
        const items = db2.prepare(`
      SELECT si.*, p.model_name, p.hsn_code, p.gst_rate, pi.serial_number
      FROM sale_items si
      JOIN products p ON si.product_id = p.product_id
      LEFT JOIN product_instances pi ON si.instance_id = pi.instance_id
      WHERE si.sale_id = ?
    `).all(id);
        return { settings, sale, items };
      } else if (kind === "QUOTATION") {
        const sale = db2.prepare(`
      SELECT q.*, c.name as customer_name, c.gstin as customer_gstin, c.phone as customer_phone, c.shop_name as customer_shop_name 
      FROM quotations q LEFT JOIN customers c ON q.customer_id = c.customer_id
      WHERE q.quotation_id = ?
    `).get(id);
        const items = db2.prepare(`
      SELECT qi.*, p.model_name, p.hsn_code, p.gst_rate
      FROM quotation_items qi
      JOIN products p ON qi.product_id = p.product_id
      WHERE qi.quotation_id = ?
    `).all(id);
        if (sale) {
          sale.invoice_no = sale.quotation_no;
          sale.payment_mode = "PROFORMA";
          sale.is_quotation = true;
        }
        const mappedItems = items.map((i) => ({
          ...i,
          price: i.unit_price,
          tax_amt: i.total_amt - i.taxable_value
        }));
        return { settings, sale, items: mappedItems };
      } else if (kind === "LABEL") {
        const product = db2.prepare(`SELECT * FROM products WHERE product_id = ?`).get(id);
        return { settings, product };
      } else if (kind === "CREDIT_NOTE") {
        const cn = db2.prepare(`
      SELECT cn.*, s.invoice_no, s.created_at as sale_date,
      c.name as customer_name, c.gstin as customer_gstin
      FROM credit_notes cn
      JOIN sales s ON cn.sale_id = s.sale_id
      LEFT JOIN customers c ON s.customer_id = c.customer_id
      WHERE cn.cn_id = ?
    `).get(id);
        const instance = db2.prepare(`
      SELECT pi.*, p.model_name, p.hsn_code
      FROM product_instances pi
      JOIN products p ON pi.product_id = p.product_id
      WHERE pi.instance_id = ?
    `).get(cn.instance_id);
        return { settings, cn, instance };
      } else if (kind === "REPAIR") {
        const job = db2.prepare(`
      SELECT rj.*, c.gstin as customer_gstin, c.shop_name as customer_shop_name
      FROM repair_jobs rj
      LEFT JOIN customers c ON rj.customer_id = c.customer_id
      WHERE rj.job_id = ?
    `).get(id);
        const items = db2.prepare(`
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
        const db2 = getDB();
        const printerTypeSet = db2.prepare("SELECT value FROM settings WHERE key = 'printer_type'").get();
        const printerInterfaceSet = db2.prepare("SELECT value FROM settings WHERE key = 'printer_interface'").get();
        const printerWidthSet = db2.prepare("SELECT value FROM settings WHERE key = 'printer_width'").get();
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
      const db2 = getDB();
      db2.prepare(`
    INSERT INTO audit_log (user_id, action, entity, entity_id, detail)
    VALUES (?, 'REPRINT', ?, ?, ?)
  `).run(activeDesktopSession?.user_id, kind === "SALE" ? "sales" : "credit_notes", id, "Reprinted document");
      return true;
    });
    import_electron.ipcMain.handle("export-einvoice-json", async (event, sale_id) => {
      assertCan(activeDesktopSession?.role, "READ_DASHBOARD");
      try {
        const db2 = getDB();
        const sale = db2.prepare("SELECT * FROM sales WHERE sale_id = ?").get(sale_id);
        if (!sale)
          return { success: false, error: "Sale not found" };
        const customer = db2.prepare("SELECT * FROM customers WHERE customer_id = ?").get(sale.customer_id);
        const items = db2.prepare(`
      SELECT si.*, p.hsn_code, p.gst_rate, p.model_name
      FROM sale_items si
      JOIN products p ON si.product_id = p.product_id
      WHERE si.sale_id = ?
    `).all(sale_id);
        const einvoicePayload = {
          Version: "1.1",
          TranDtls: {
            TaxSch: "GST",
            SupTyp: "B2B",
            RegRev: "Y"
          },
          DocDtls: {
            Typ: "INV",
            No: sale.invoice_no,
            Dt: sale.created_at.split(" ")[0]
          },
          SellerDtls: {
            LglNm: "Chauhan Electronics",
            GSTIN: "29XXXXXXXXXXXXX",
            StateCode: "29"
          },
          BuyerDtls: {
            LglNm: customer?.name || "Counter Customer",
            GSTIN: customer?.gstin || "URP",
            StateCode: "29",
            // Fallback, could be extracted from GSTIN
            PhNo: customer?.phone
          },
          ItemList: items.map((item, idx) => ({
            SlNo: (idx + 1).toString(),
            PrdDesc: item.model_name,
            IsServc: "N",
            HsnCd: item.hsn_code || "8543",
            Qty: item.quantity,
            Unit: "NOS",
            UnitPrice: (item.unit_price / 100).toFixed(2),
            TotAmt: (item.unit_price * item.quantity / 100).toFixed(2),
            Discount: (item.line_discount / 100).toFixed(2),
            PreTaxVal: ((item.unit_price * item.quantity - item.line_discount) / 100).toFixed(2),
            AssAmt: (item.line_total / 100).toFixed(2),
            GstRt: item.gst_rate || 18,
            TotItemVal: (item.line_total / 100).toFixed(2)
          })),
          ValDtls: {
            AssVal: (sale.subtotal / 100).toFixed(2),
            CgstVal: (sale.cgst / 100).toFixed(2),
            SgstVal: (sale.sgst / 100).toFixed(2),
            IgstVal: (sale.igst / 100).toFixed(2),
            Discount: (sale.discount / 100).toFixed(2),
            TotInvVal: (sale.grand_total / 100).toFixed(2)
          }
        };
        const { canceled, filePath } = await import_electron.dialog.showSaveDialog({
          title: "Save E-Invoice JSON",
          defaultPath: `e-invoice-${sale.invoice_no.replace(/\\/ / g, "-")}.json`,
          filters: [{ name: "JSON", extensions: ["json"] }]
        });
        if (canceled || !filePath)
          return { success: false, canceled: true };
        fs2.writeFileSync(filePath, JSON.stringify(einvoicePayload, null, 2));
        return { success: true, filePath };
      } catch (err) {
        console.error("E-Invoice Export Error:", err);
        return { success: false, error: err.message };
      }
    });
    import_electron.ipcMain.handle("enqueue-sms", async (event, phone, templateKey, vars) => {
      assertCan(activeDesktopSession?.role, "READ_DASHBOARD");
      return { success: enqueueSms(phone, templateKey, vars) };
    });
    import_electron.ipcMain.handle("send-udhaar-reminder", async (event, customer_id) => {
      assertCan(activeDesktopSession?.role, "READ_DASHBOARD");
      const db2 = getDB();
      const cust = db2.prepare("SELECT * FROM customers WHERE customer_id = ?").get(customer_id);
      if (!cust || !cust.phone || cust.phone === "0000000000")
        return { success: false, error: "Invalid phone" };
      const balance = (cust.current_balance / 100).toFixed(2);
      const queued = enqueueSms(cust.phone, "sms_tpl_reminder", { balance });
      return { success: queued };
    });
    import_electron.ipcMain.handle("get-sms-outbox", async () => {
      assertCan(activeDesktopSession?.role, "READ_DASHBOARD");
      const db2 = getDB();
      return db2.prepare("SELECT * FROM sms_outbox ORDER BY id DESC LIMIT 100").all();
    });
    import_electron.ipcMain.handle("retry-sms", async (event, id) => {
      assertCan(activeDesktopSession?.role, "READ_DASHBOARD");
      const db2 = getDB();
      db2.prepare("UPDATE sms_outbox SET status = 'QUEUED', retry_count = 0 WHERE id = ?").run(id);
      return { success: true };
    });
    import_electron.ipcMain.handle("generate-upi-qr", async (event, amountPaise, invoiceNo) => {
      assertCan(activeDesktopSession?.role, "CHECKOUT");
      try {
        const db2 = getDB();
        const settingsRows = db2.prepare("SELECT key, value FROM settings").all();
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
        const db2 = getDB();
        const sale = db2.prepare("SELECT * FROM sales WHERE sale_id = ?").get(saleId);
        if (!sale)
          return { success: false, error: "Sale not found" };
        const settingsRows = db2.prepare("SELECT key, value FROM settings").all();
        const settings = {};
        settingsRows.forEach((r) => settings[r.key] = r.value);
        const items = db2.prepare(`
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
        const db2 = getDB();
        const job = db2.prepare("SELECT * FROM repair_jobs WHERE job_id = ?").get(jobId);
        if (!job)
          return { success: false, error: "Job not found" };
        const settingsRows = db2.prepare("SELECT key, value FROM settings").all();
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
    setInterval(() => {
      try {
        const db2 = getDB();
        try {
          db2.prepare("ALTER TABLE sms_outbox ADD COLUMN retry_count INTEGER DEFAULT 0").run();
        } catch (e) {
        }
        const pending = db2.prepare("SELECT * FROM sms_outbox WHERE status = 'QUEUED' LIMIT 10").all();
        for (const msg of pending) {
          sendViaGateway(msg).then((success) => {
            try {
              if (success) {
                db2.prepare("UPDATE sms_outbox SET status = 'SENT', sent_at = datetime('now') WHERE id = ?").run(msg.id);
              } else {
                const newRetry = (msg.retry_count || 0) + 1;
                const status = newRetry > 5 ? "FAILED" : "QUEUED";
                db2.prepare("UPDATE sms_outbox SET status = ?, retry_count = ? WHERE id = ?").run(status, newRetry, msg.id);
              }
            } catch (dbErr) {
              console.error("[SMS WORKER] DB update error:", dbErr);
            }
          }).catch(() => {
            const newRetry = (msg.retry_count || 0) + 1;
            const status = newRetry > 5 ? "FAILED" : "QUEUED";
            db2.prepare("UPDATE sms_outbox SET status = ?, retry_count = ? WHERE id = ?").run(status, newRetry, msg.id);
          });
        }
      } catch (err) {
      }
    }, 3e4);
    mainWindow = null;
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
  }
});

// test_phase4.ts
var import_node_assert = __toESM(require("node:assert"));
var import_module = __toESM(require("module"));
var import_fs = __toESM(require("fs"));
init_db();
var originalRequire = import_module.default.prototype.require;
var mockIpcHandlers = /* @__PURE__ */ new Map();
import_module.default.prototype.require = function(request) {
  if (request === "electron") {
    return {
      app: {
        get isPackaged() {
          return false;
        },
        getPath: () => "/tmp/erp",
        on: () => {
        },
        whenReady: () => Promise.resolve()
      },
      ipcMain: {
        handle: (channel, listener) => {
          mockIpcHandlers.set(channel, listener);
        },
        on: () => {
        }
      },
      BrowserWindow: class {
        webContents = { send: () => {
        } };
      }
    };
  }
  if (request === "node-thermal-printer") {
    return {
      ThermalPrinter: class {
      },
      PrinterTypes: { EPSON: 1 },
      CharacterSet: { PC858_EURO: 1 }
    };
  }
  return originalRequire.apply(this, arguments);
};
process.env.TEST_DB = "test_phase4.db";
if (import_fs.default.existsSync(process.env.TEST_DB))
  import_fs.default.unlinkSync(process.env.TEST_DB);
initDB(process.env.TEST_DB);
var db = getDB();
init_main();
async function runTests() {
  console.log("--- STARTING PHASE 4 TESTS ---");
  let failures = 0;
  const verifyPin = mockIpcHandlers.get("verify-desktop-pin");
  const dbTransaction = mockIpcHandlers.get("db-transaction");
  const voidSale = mockIpcHandlers.get("db-void-sale");
  const returnAccept = mockIpcHandlers.get("db-return-accept");
  const hash = require("bcryptjs").hashSync("1234", 10);
  db.prepare("DELETE FROM users").run();
  db.prepare("INSERT INTO users (user_id, name, pin_hash, role) VALUES (1, 'Owner', ?, 'OWNER')").run(hash);
  db.prepare("INSERT INTO users (user_id, name, pin_hash, role) VALUES (2, 'Cashier', ?, 'CASHIER')").run(hash);
  const prodId = db.prepare("INSERT INTO products (brand_name, model_name, category, counter_price, dealer_price, distributor_price) VALUES ('A', 'B', 'C', 1000, 900, 800)").run().lastInsertRowid;
  db.prepare("INSERT INTO product_instances (product_id, serial_number, status) VALUES (?, 'SN123', 'IN_STOCK')").run(prodId);
  const looseProdId = db.prepare("INSERT INTO products (brand_name, model_name, category, counter_price, dealer_price, distributor_price, is_serialized, loose_qty) VALUES ('X', 'Y', 'Z', 100, 90, 80, 0, 10)").run().lastInsertRowid;
  const custId = db.prepare("INSERT INTO customers (name, phone, current_balance) VALUES ('Cust', '1234567890', 0)").run().lastInsertRowid;
  try {
    console.log("[TEST] OVERRIDE-ENFORCE & PERM-RUNTIME");
    await verifyPin(null, "1234");
    const hash0 = require("bcryptjs").hashSync("0000", 10);
    db.prepare('UPDATE users SET pin_hash = ? WHERE role = "CASHIER"').run(hash0);
    const loginRes = await verifyPin(null, "0000");
    import_node_assert.default.strictEqual(loginRes.user.role, "CASHIER");
    let threw = false;
    try {
      await voidSale(null, 999);
    } catch (e) {
      (0, import_node_assert.default)(e.message.includes("Unauthorized"), "Expected Unauthorized");
      threw = true;
    }
    (0, import_node_assert.default)(threw, "Cashier should not void sale without override");
    threw = false;
    try {
      await returnAccept(null, {});
    } catch (e) {
      (0, import_node_assert.default)(e.message.includes("Unauthorized"), "Expected Unauthorized");
      threw = true;
    }
    (0, import_node_assert.default)(threw, "Cashier should not issue CN without override");
    await dbTransaction(null, [
      { sql: "INSERT INTO settings (key, value) VALUES ('perm_CASHIER_VOID_SALE', 'true')", params: [] },
      { sql: "INSERT INTO settings (key, value) VALUES ('perm_CASHIER_ISSUE_CN', 'true')", params: [] }
    ]);
    threw = false;
    try {
      await voidSale(null, 999);
    } catch (e) {
      if (e.message.includes("not found"))
        threw = true;
      if (e.message.includes("Unauthorized"))
        throw new Error("Still unauthorized after override!");
    }
    (0, import_node_assert.default)(threw, "Should bypass Unauthorized and hit not found");
    console.log("\u2705 OVERRIDE-ENFORCE & PERM-RUNTIME Passed");
  } catch (e) {
    console.error("\u274C OVERRIDE-ENFORCE Failed", e);
    failures++;
  }
  try {
    console.log("[TEST] VOID-ATOMIC");
    await verifyPin(null, "1234");
    const inst = db.prepare("SELECT * FROM product_instances WHERE serial_number='SN123'").get();
    db.prepare("UPDATE product_instances SET status = 'SOLD' WHERE instance_id = ?").run(inst.instance_id);
    db.prepare("UPDATE products SET loose_qty = 9 WHERE product_id = ?").run(looseProdId);
    const saleId = db.prepare("INSERT INTO sales (invoice_no, customer_id, tier_applied, grand_total, amount_paid, payment_mode, status) VALUES ('INV1', ?, 'COUNTER', 1100, 500, 'UDHAAR', 'COMPLETED')").run(custId).lastInsertRowid;
    db.prepare("INSERT INTO sale_items (sale_id, product_id, instance_id, quantity, unit_price) VALUES (?, ?, ?, 1, 1000)").run(saleId, prodId, inst.instance_id);
    db.prepare("INSERT INTO sale_items (sale_id, product_id, instance_id, quantity, unit_price) VALUES (?, ?, NULL, 1, 100)").run(saleId, looseProdId);
    db.prepare("UPDATE customers SET current_balance = 600 WHERE customer_id = ?").run(custId);
    await voidSale(null, saleId);
    const updatedSale = db.prepare("SELECT status FROM sales WHERE sale_id = ?").get(saleId);
    import_node_assert.default.strictEqual(updatedSale.status, "CANCELLED");
    const updatedInst = db.prepare("SELECT status FROM product_instances WHERE instance_id = ?").get(inst.instance_id);
    import_node_assert.default.strictEqual(updatedInst.status, "IN_STOCK", "Serial should be restored to IN_STOCK");
    const updatedLoose = db.prepare("SELECT loose_qty FROM products WHERE product_id = ?").get(looseProdId);
    import_node_assert.default.strictEqual(updatedLoose.loose_qty, 10, "Loose quantity should be restored to 10");
    const updatedCust = db.prepare("SELECT current_balance FROM customers WHERE customer_id = ?").get(custId);
    import_node_assert.default.strictEqual(updatedCust.current_balance, 0, "Customer balance should be reverted");
    const logs = db.prepare("SELECT * FROM audit_log WHERE entity = 'sales' AND entity_id = ? AND action = 'DELETE'").all(saleId);
    import_node_assert.default.strictEqual(logs.length, 1, "Audit log should be created");
    console.log("\u2705 VOID-ATOMIC Passed");
  } catch (e) {
    console.error("\u274C VOID-ATOMIC Failed", e);
    failures++;
  }
  if (failures === 0) {
    console.log("ALL PHASE 4 TESTS PASSED.");
  } else {
    console.error(`FAILED ${failures} PHASE 4 TESTS.`);
  }
}
runTests();
