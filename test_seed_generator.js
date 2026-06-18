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

// test_seed_generator.ts
var import_better_sqlite3 = __toESM(require("better-sqlite3"));
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var import_bcryptjs = require("bcryptjs");
var DB_PATH = import_path.default.join(__dirname, "phase0.db");
var SCHEMA_PATH = import_path.default.join(__dirname, "packages/core/schema.sql");
if (import_fs.default.existsSync(DB_PATH))
  import_fs.default.unlinkSync(DB_PATH);
var db = new import_better_sqlite3.default(DB_PATH);
db.pragma("foreign_keys = ON");
db.pragma("journal_mode = WAL");
var schemaSql = import_fs.default.readFileSync(SCHEMA_PATH, "utf8");
db.exec(schemaSql);
console.log("Schema loaded.");
db.exec(`
  INSERT INTO settings (key, value) VALUES 
  ('shop_name', 'Chauhan Electronics E2E'), 
  ('state_code', '29'), 
  ('invoice_prefix', 'CE/26/'), 
  ('next_invoice_no', '1001');

  INSERT INTO users (user_id, name, pin_hash, role) VALUES 
  (1, 'Admin', '${(0, import_bcryptjs.hashSync)("1111", 4)}', 'OWNER'),
  (2, 'Sales Desk 1', '${(0, import_bcryptjs.hashSync)("2222", 4)}', 'CASHIER'),
  (3, 'Mobile Scanner', '${(0, import_bcryptjs.hashSync)("3333", 4)}', 'CASHIER'),
  (4, 'Stock Room', '${(0, import_bcryptjs.hashSync)("4444", 4)}', 'STOCK'),
  (5, 'Repair Tech', '${(0, import_bcryptjs.hashSync)("5555", 4)}', 'TECHNICIAN');
`);
console.log("Settings and users seeded.");
var suppliers = [
  "Sony India Pvt Ltd",
  "Pioneer Auto Audio Hub",
  "JBL Harman Dist",
  "Generic Accessories Co"
];
var supplierIds = [];
var insertSupplier = db.prepare(`INSERT INTO suppliers (name, phone) VALUES (?, ?)`);
suppliers.forEach((name) => {
  supplierIds.push(insertSupplier.run(name, "9999900000").lastInsertRowid);
});
var insertCustomer = db.prepare(`INSERT INTO customers (name, phone, tier, gstin, credit_limit, current_balance, credit_due_date) VALUES (?, ?, ?, ?, ?, ?, ?)`);
var custCounterId = insertCustomer.run("Walk-in Customer", "0000000000", "COUNTER", null, 0, 0, null).lastInsertRowid;
var custDealer1Id = insertCustomer.run("Balaji Electronics", "9876543210", "DEALER", "29ABCDE1234F1Z5", 5e5, 1e4, null).lastInsertRowid;
var custDealer2Id = insertCustomer.run("Super Motors", "9876543211", "DEALER", "27ABCDE1234F1Z5", 2e5, 0, null).lastInsertRowid;
var custDistId = insertCustomer.run("Mega Distributors", "9876543212", "DISTRIBUTOR", "29ABCDE1234F1Z6", 1e6, 5e4, null).lastInsertRowid;
var custOverLimit = insertCustomer.run("Overlimit Dealer", "9876543213", "DEALER", null, 5e4, 6e4, "2030-01-01").lastInsertRowid;
var custOverDue = insertCustomer.run("Overdue Dealer", "9876543214", "DEALER", null, 1e5, 1e4, "2020-01-01").lastInsertRowid;
var customerIds = [custCounterId, custDealer1Id, custDealer2Id, custDistId];
var insertProduct = db.prepare(`
  INSERT INTO products (sku_code, brand_name, model_name, category, hsn_code, gst_rate, requires_serial, purchase_cost, counter_price, dealer_price, distributor_price, min_restock_level, loose_qty)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
var products = [
  // Car Audio
  { sku: "PIO-6977", brand: "Pioneer", model: "TS-A6977S 6x9 Speakers", cat: "Car Audio", hsn: "8518", gst: 18, serial: 1, cost: 25e4, cp: 35e4, dp: 28e4, dist: 26e4 },
  { sku: "SON-AX5500", brand: "Sony", model: "XAV-AX5500 Head Unit", cat: "Car Audio", hsn: "8527", gst: 18, serial: 1, cost: 2e6, cp: 25e5, dp: 22e5, dist: 21e5 },
  { sku: "JBL-ST3", brand: "JBL", model: 'Stage3 627 6.5" Speakers', cat: "Car Audio", hsn: "8518", gst: 18, serial: 1, cost: 18e4, cp: 24e4, dp: 2e5, dist: 19e4 },
  { sku: "ROC-P3D4", brand: "Rockford Fosgate", model: "P3D4-12 Subwoofer", cat: "Car Audio", hsn: "8518", gst: 18, serial: 1, cost: 12e5, cp: 16e5, dp: 135e4, dist: 125e4 },
  // TVs
  { sku: "SON-X90L-55", brand: "Sony", model: "Bravia 55X90L 4K LED", cat: "TV", hsn: "8528", gst: 28, serial: 1, cost: 9e6, cp: 11e6, dp: 98e5, dist: 95e5 },
  { sku: "SAM-Q90-65", brand: "Samsung", model: '65" QN90C Neo QLED', cat: "TV", hsn: "8528", gst: 28, serial: 1, cost: 14e6, cp: 16e6, dp: 15e6, dist: 145e5 },
  { sku: "LG-C3-42", brand: "LG", model: '42" C3 OLED', cat: "TV", hsn: "8528", gst: 28, serial: 1, cost: 7e6, cp: 85e5, dp: 75e5, dist: 72e5 },
  // Loose Accessories
  { sku: "CAB-HDMI-2M", brand: "Generic", model: "HDMI Cable 2M 4K", cat: "Accessory", hsn: "8544", gst: 18, serial: 0, cost: 15e3, cp: 35e3, dp: 2e4, dist: 18e3 },
  { sku: "FAS-SWFT", brand: "Generic", model: 'Swift 9" Fascia', cat: "Accessory", hsn: "8708", gst: 28, serial: 0, cost: 4e4, cp: 8e4, dp: 5e4, dist: 45e3 },
  { sku: "ISO-MARUTI", brand: "Generic", model: "Maruti ISO Harness", cat: "Accessory", hsn: "8544", gst: 18, serial: 0, cost: 8e3, cp: 25e3, dp: 12e3, dist: 1e4 }
];
var productIds = {};
products.forEach((p) => {
  const id = insertProduct.run(p.sku, p.brand, p.model, p.cat, p.hsn, p.gst, p.serial, p.cost, p.cp, p.dp, p.dist, 5, p.serial ? 0 : 500).lastInsertRowid;
  productIds[p.sku] = { id, ...p };
});
console.log("Products seeded.");
var insertSerial = db.prepare(`INSERT INTO product_instances (product_id, serial_number, status, purchase_cost) VALUES (?, ?, ?, ?)`);
var serialCounter = 1e3;
Object.values(productIds).forEach((p) => {
  if (p.serial) {
    for (let i = 0; i < 40; i++) {
      insertSerial.run(p.id, `SN-${p.sku}-${serialCounter++}`, "IN_STOCK", p.cost);
    }
  }
});
console.log("Instances seeded.");
var insertSale = db.prepare(`
  INSERT INTO sales (invoice_no, customer_id, sold_by, subtotal, discount, cgst, sgst, igst, grand_total, amount_paid, payment_mode, tier_applied, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
var insertSaleItem = db.prepare(`
  INSERT INTO sale_items (sale_id, product_id, instance_id, quantity, unit_price, line_discount, line_total, unit_cost)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);
var invNo = 1;
for (let i = 0; i < 250; i++) {
  const dateObj = new Date(Date.now() - Math.floor(Math.random() * 90) * 864e5);
  const dateStr = dateObj.toISOString().replace("T", " ").slice(0, 19);
  const isInterState = Math.random() > 0.8;
  const cId = isInterState ? custDealer2Id : customerIds[Math.floor(Math.random() * customerIds.length)];
  const cTier = cId === custCounterId ? "COUNTER" : cId === custDistId ? "DISTRIBUTOR" : "DEALER";
  const sId = insertSale.run(`CE/26/${invNo++}`, cId, 2, 0, 0, 0, 0, 0, 0, 0, Math.random() > 0.3 ? "UPI" : "CASH", cTier, dateStr).lastInsertRowid;
  let cartSubtotal = 0;
  let cartCgst = 0;
  let cartSgst = 0;
  let cartIgst = 0;
  const numItems = Math.floor(Math.random() * 3) + 1;
  const pKeys = Object.keys(productIds);
  for (let j = 0; j < numItems; j++) {
    const p = productIds[pKeys[Math.floor(Math.random() * pKeys.length)]];
    const qty = p.serial ? 1 : Math.floor(Math.random() * 5) + 1;
    let instId = null;
    if (p.serial) {
      const inst = db.prepare(`SELECT instance_id FROM product_instances WHERE product_id = ? AND status = 'IN_STOCK' LIMIT 1`).get(p.id);
      if (!inst)
        continue;
      instId = inst.instance_id;
      db.prepare(`UPDATE product_instances SET status = 'SOLD' WHERE instance_id = ?`).run(instId);
    } else {
      db.prepare(`UPDATE products SET loose_qty = loose_qty - ? WHERE product_id = ?`).run(qty, p.id);
    }
    const unitPrice = cTier === "COUNTER" ? p.cp : cTier === "DEALER" ? p.dp : p.dist;
    const lineTotal = unitPrice * qty;
    const taxable = Math.round(lineTotal / (1 + p.gst / 100));
    const gstAmt = lineTotal - taxable;
    const cgst = isInterState ? 0 : Math.round(gstAmt / 2);
    const sgst = isInterState ? 0 : Math.round(gstAmt / 2);
    const igst = isInterState ? gstAmt : 0;
    cartSubtotal += taxable;
    cartCgst += cgst;
    cartSgst += sgst;
    cartIgst += igst;
    insertSaleItem.run(sId, p.id, instId, qty, unitPrice, 0, lineTotal, p.cost);
  }
  const grandTotal = cartSubtotal + cartCgst + cartSgst + cartIgst;
  db.prepare(`UPDATE sales SET subtotal = ?, cgst = ?, sgst = ?, igst = ?, grand_total = ?, amount_paid = ? WHERE sale_id = ?`).run(cartSubtotal, cartCgst, cartSgst, cartIgst, grandTotal, grandTotal, sId);
}
console.log("250 Sales generated.");
console.log("DB Generation Complete!");
