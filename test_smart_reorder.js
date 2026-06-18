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

// test_smart_reorder.ts
var import_better_sqlite3 = __toESM(require("better-sqlite3"));
var import_assert = __toESM(require("assert"));
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var SRC_DB = import_path.default.join(__dirname, "phase0.db");
var TEST_DB = import_path.default.join(__dirname, "test_smart_reorder.db");
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
function getSmartReorder(targetDays = 15) {
  const query = `
    WITH recent_sales AS (
      SELECT si.product_id, SUM(si.quantity) as sold_last_30_days
      FROM sale_items si
      JOIN sales s ON s.sale_id = si.sale_id
      WHERE s.status = 'COMPLETED' AND s.created_at >= date('now', '-30 days')
      GROUP BY si.product_id
    ),
    current_inventory AS (
      SELECT p.product_id, p.brand_name, p.model_name, p.sku_code,
             (CASE WHEN p.requires_serial = 1 THEN (
               SELECT COUNT(*) FROM product_instances pi WHERE pi.product_id = p.product_id AND pi.status = 'IN_STOCK'
             ) ELSE p.loose_qty END) as current_stock,
             p.min_restock_level
      FROM products p
    )
    SELECT ci.product_id, ci.brand_name, ci.model_name, ci.sku_code, ci.current_stock,
           COALESCE(rs.sold_last_30_days, 0) as sold_last_30,
           ci.min_restock_level
    FROM current_inventory ci
    LEFT JOIN recent_sales rs ON ci.product_id = rs.product_id
  `;
  const results = db.prepare(query).all();
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
  return suggestions.sort((a, b) => b.suggested_order - a.suggested_order);
}
async function runTests() {
  console.log("--- PHASE 1: Smart Reorder Tests ---");
  try {
    const suggestions = getSmartReorder(15);
    import_assert.default.ok(suggestions.length > 0, "Should generate some suggestions based on 250 seeded sales");
    const top = suggestions[0];
    const velocity = top.sold_last_30 / 30;
    const target = Math.max(velocity * 15, top.min_restock_level);
    const expectedReorder = Math.ceil(target - top.current_stock);
    import_assert.default.strictEqual(top.suggested_order, expectedReorder, "Suggested order math must match exactly");
    report("Smart reorder math verification", true, `Generated ${suggestions.length} suggestions`);
  } catch (e) {
    report("Smart reorder math verification", false, e.message);
  }
}
runTests().catch(console.error);
