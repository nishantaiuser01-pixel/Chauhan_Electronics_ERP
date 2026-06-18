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

// test_performance.ts
var import_better_sqlite3 = __toESM(require("better-sqlite3"));
var import_assert = __toESM(require("assert"));
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var SRC_DB = import_path.default.join(__dirname, "phase0.db");
var TEST_DB = import_path.default.join(__dirname, "phase0_perf.db");
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
async function runPerformance() {
  console.log("--- PHASE 0: Performance & Concurrency Tests ---");
  const startSearch = performance.now();
  const searchResults = db.prepare(`SELECT * FROM products WHERE brand_name LIKE '%Sony%' OR category = 'Car Audio' LIMIT 50`).all();
  const searchTime = performance.now() - startSearch;
  import_assert.default.ok(searchResults.length > 0, "Should find results");
  report(`Search Latency (${Math.round(searchTime)}ms)`, searchTime < 50, "Expected < 50ms");
  const N = 10;
  const target = db.prepare(`SELECT instance_id, product_id, purchase_cost FROM product_instances WHERE status = 'IN_STOCK' LIMIT 1`).get();
  const cId = db.prepare(`SELECT customer_id FROM customers WHERE tier = 'COUNTER' LIMIT 1`).get();
  let successes = 0;
  let conflicts = 0;
  const checkoutTx = db.transaction((instId) => {
    const status = db.prepare(`SELECT status FROM product_instances WHERE instance_id = ?`).get(instId);
    if (status.status !== "IN_STOCK") {
      throw new Error("409 Conflict: ALREADY_SOLD");
    }
    db.prepare(`UPDATE product_instances SET status = 'SOLD' WHERE instance_id = ?`).run(instId);
    const sId = db.prepare(`INSERT INTO sales (invoice_no, customer_id, tier_applied) VALUES (?, ?, 'COUNTER')`).run(`PERF-${Math.random()}`, cId.customer_id).lastInsertRowid;
    db.prepare(`INSERT INTO sale_items (sale_id, product_id, instance_id, quantity, unit_price, line_total, unit_cost) VALUES (?, ?, ?, 1, 1000, 1000, 500)`).run(sId, target.product_id, instId);
  });
  for (let i = 0; i < N; i++) {
    try {
      checkoutTx(target.instance_id);
      successes++;
    } catch (e) {
      if (e.message.includes("409 Conflict"))
        conflicts++;
      else
        throw e;
    }
  }
  import_assert.default.strictEqual(successes, 1, `Expected exactly 1 success, got ${successes}`);
  import_assert.default.strictEqual(conflicts, N - 1, `Expected ${N - 1} conflicts, got ${conflicts}`);
  report(`Concurrency Race (${N} requests)`, true, `1 success, ${conflicts} conflicts`);
  const startReport = performance.now();
  const reportData = db.prepare(`SELECT SUM(grand_total) as gt, SUM(cgst) as cgst, SUM(sgst) as sgst, SUM(igst) as igst FROM sales WHERE created_at >= date('now', '-90 days')`).get();
  const reportTime = performance.now() - startReport;
  report(`Report Latency (${Math.round(reportTime)}ms)`, reportTime < 100, "Expected < 100ms");
}
runPerformance().catch(console.error);
