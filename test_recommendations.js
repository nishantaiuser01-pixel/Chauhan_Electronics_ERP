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

// test_recommendations.ts
var import_better_sqlite3 = __toESM(require("better-sqlite3"));
var import_assert = __toESM(require("assert"));
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var SRC_DB = import_path.default.join(__dirname, "phase0.db");
var TEST_DB = import_path.default.join(__dirname, "test_recommendations.db");
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
function getRecommendations(cartProductIds) {
  if (cartProductIds.length === 0)
    return [];
  const placeholders = cartProductIds.map(() => "?").join(",");
  const query = `
    SELECT p.product_id, p.brand_name, p.model_name, p.sku_code, COUNT(DISTINCT si.sale_id) as frequency
    FROM sale_items si
    JOIN products p ON p.product_id = si.product_id
    WHERE si.sale_id IN (
      -- Get all sales that include any of the products currently in the cart
      SELECT sale_id FROM sale_items WHERE product_id IN (${placeholders})
    )
    AND si.product_id NOT IN (${placeholders}) -- Exclude the items already in the cart
    GROUP BY si.product_id
    ORDER BY frequency DESC
    LIMIT 3
  `;
  const results = db.prepare(query).all(...cartProductIds, ...cartProductIds);
  return results;
}
async function runTests() {
  console.log("--- PHASE 1: Checkout Recommendations Tests ---");
  try {
    const baseProduct = db.prepare(`SELECT product_id FROM sale_items LIMIT 1`).get();
    if (baseProduct) {
      const recs = getRecommendations([baseProduct.product_id]);
      const containsBase = recs.some((r) => r.product_id === baseProduct.product_id);
      import_assert.default.strictEqual(containsBase, false, "Recommendations should not include products already in the cart");
      if (recs.length > 1) {
        import_assert.default.ok(recs[0].frequency >= recs[1].frequency, "Recommendations must be sorted by frequency DESC");
      }
      report("Recommendations logic verification", true, `Generated ${recs.length} recommendations for base product ${baseProduct.product_id}`);
    } else {
      report("Recommendations logic verification", false, "No sales data found to test");
    }
  } catch (e) {
    report("Recommendations logic verification", false, e.message);
  }
}
runTests().catch(console.error);
