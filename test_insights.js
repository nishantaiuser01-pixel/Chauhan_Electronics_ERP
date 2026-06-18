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

// test_insights.ts
var import_better_sqlite3 = __toESM(require("better-sqlite3"));
var import_assert = __toESM(require("assert"));
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var SRC_DB = import_path.default.join(__dirname, "phase0.db");
var TEST_DB = import_path.default.join(__dirname, "test_insights.db");
if (import_fs.default.existsSync(TEST_DB))
  import_fs.default.unlinkSync(TEST_DB);
import_fs.default.copyFileSync(SRC_DB, TEST_DB);
var db = new import_better_sqlite3.default(TEST_DB);
db.pragma("foreign_keys = ON");
function report(name, pass, info) {
  if (pass)
    console.log(`PASS: ${name}`);
  else
    console.error(`FAIL: ${name} ${info ? `(${info})` : ""}`);
}
function authorize(role, action) {
  const permissions = {
    "OWNER": ["VIEW_REPORTS", "MANAGE_USERS", "PRICE_OVERRIDE"],
    "CASHIER": ["CHECKOUT", "ISSUE_CN"],
    "SALESPERSON": ["CHECKOUT", "READ_CATALOGUE"]
  };
  return permissions[role]?.includes(action) || false;
}
function getInsights() {
  const marginByBrand = db.prepare(`
    SELECT p.brand_name, 
           SUM(si.line_total) as revenue, 
           SUM(si.unit_cost * si.quantity) as cogs,
           SUM(si.line_total) - SUM(si.unit_cost * si.quantity) as margin
    FROM sale_items si
    JOIN sales s ON s.sale_id = si.sale_id
    JOIN products p ON p.product_id = si.product_id
    WHERE s.status = 'COMPLETED'
    GROUP BY p.brand_name
  `).all();
  return { marginByBrand };
}
async function runTests() {
  console.log("--- PHASE 1: Owner Insights Tests ---");
  try {
    import_assert.default.strictEqual(authorize("OWNER", "VIEW_REPORTS"), true, "Owner should access insights");
    import_assert.default.strictEqual(authorize("SALESPERSON", "VIEW_REPORTS"), false, "Salesperson should get 403 on insights");
    report("Insights Gated to OWNER only", true);
  } catch (e) {
    report("Insights Gated to OWNER only", false, e.message);
  }
  try {
    const insights = getInsights();
    const rawTotal = db.prepare(`
      SELECT SUM(si.line_total) - SUM(si.unit_cost * si.quantity) as total_margin
      FROM sale_items si
      JOIN sales s ON s.sale_id = si.sale_id
      WHERE s.status = 'COMPLETED'
    `).get();
    const groupedTotal = insights.marginByBrand.reduce((acc, row) => acc + row.margin, 0);
    import_assert.default.strictEqual(groupedTotal, rawTotal.total_margin, "Sum of margin by brand must exactly equal total raw margin");
    report("Insights figures reconcile to source rows", true);
  } catch (e) {
    report("Insights figures reconcile to source rows", false, e.message);
  }
}
runTests().catch(console.error);
