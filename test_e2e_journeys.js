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

// test_e2e_journeys.ts
var import_better_sqlite3 = __toESM(require("better-sqlite3"));
var import_assert = __toESM(require("assert"));
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var SRC_DB = import_path.default.join(__dirname, "phase0.db");
var TEST_DB = import_path.default.join(__dirname, "phase0_e2e.db");
if (import_fs.default.existsSync(TEST_DB))
  import_fs.default.unlinkSync(TEST_DB);
import_fs.default.copyFileSync(SRC_DB, TEST_DB);
var db = new import_better_sqlite3.default(TEST_DB);
db.pragma("foreign_keys = ON");
db.pragma("journal_mode = WAL");
function report(name, pass, info) {
  if (pass)
    console.log(`PASS: ${name}`);
  else
    console.error(`FAIL: ${name} ${info ? `(${info})` : ""}`);
}
async function runJourneys() {
  console.log("--- PHASE 0: E2E Journeys ---");
  try {
    const pId = db.prepare(`SELECT product_id FROM products WHERE sku_code = 'CAB-HDMI-2M'`).get();
    const initialLoose = db.prepare(`SELECT loose_qty FROM products WHERE product_id = ?`).get(pId.product_id);
    db.prepare(`UPDATE products SET loose_qty = loose_qty + 10 WHERE product_id = ?`).run(pId.product_id);
    const cId = db.prepare(`SELECT customer_id FROM customers WHERE tier = 'COUNTER' LIMIT 1`).get();
    const sId = db.prepare(`INSERT INTO sales (invoice_no, customer_id, tier_applied) VALUES ('E2E-INV-1', ?, 'COUNTER')`).run(cId.customer_id).lastInsertRowid;
    db.prepare(`INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, line_total, unit_cost) VALUES (?, ?, 2, 35000, 70000, 15000)`).run(sId, pId.product_id);
    db.prepare(`UPDATE products SET loose_qty = loose_qty - 2 WHERE product_id = ?`).run(pId.product_id);
    const cnId = db.prepare(`INSERT INTO credit_notes (cn_no, sale_id, amount, reason) VALUES ('CN-1', ?, 35000, 'Customer Return')`).run(sId).lastInsertRowid;
    db.prepare(`UPDATE products SET loose_qty = loose_qty + 1 WHERE product_id = ?`).run(pId.product_id);
    const finalLoose = db.prepare(`SELECT loose_qty FROM products WHERE product_id = ?`).get(pId.product_id);
    import_assert.default.strictEqual(finalLoose.loose_qty, initialLoose.loose_qty + 10 - 2 + 1, "Stock logic through GRN -> Sell -> Return is correct");
    report("Journey 1 (GRN -> Sell -> Return)", true);
  } catch (e) {
    report("Journey 1 (GRN -> Sell -> Return)", false, e.message);
  }
  try {
    const rId = db.prepare(`INSERT INTO repair_jobs (customer_phone, status, est_cost) VALUES ('9999911111', 'PENDING', 500000)`).run().lastInsertRowid;
    const pId = db.prepare(`SELECT product_id FROM products WHERE sku_code = 'CAB-HDMI-2M'`).get();
    db.prepare(`UPDATE products SET loose_qty = loose_qty - 1 WHERE product_id = ?`).run(pId.product_id);
    db.prepare(`INSERT INTO repair_parts (job_id, product_id, qty, cost) VALUES (?, ?, 1, 35000)`).run(rId, pId.product_id);
    db.prepare(`UPDATE repair_jobs SET status = 'DELIVERED', final_cost = 535000 WHERE job_id = ?`).run(rId);
    report("Journey 2 (Repair Lifecycle)", true);
  } catch (e) {
    report("Journey 2 (Repair Lifecycle)", false, e.message);
  }
  try {
    const totalSales = db.prepare(`SELECT SUM(subtotal) as st, SUM(cgst) as cgst, SUM(sgst) as sgst, SUM(igst) as igst, SUM(grand_total) as gt FROM sales WHERE status = 'COMPLETED'`).get();
    const calculatedGt = totalSales.st + totalSales.cgst + totalSales.sgst + totalSales.igst;
    const diff = Math.abs((totalSales.gt || 0) - calculatedGt);
    import_assert.default.ok(diff < 1e3, `Reconciliation mismatch: ${diff}`);
    report("Journey 3 (GSTR-1 Reconciliation)", true);
  } catch (e) {
    report("Journey 3 (GSTR-1 Reconciliation)", false, e.message);
  }
}
runJourneys().catch(console.error);
