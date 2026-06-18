import Database from 'better-sqlite3';
import assert from 'assert';
import fs from 'fs';
import path from 'path';

const SRC_DB = path.join(__dirname, 'phase0.db');
const TEST_DB = path.join(__dirname, 'test_recommendations.db');

if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
fs.copyFileSync(SRC_DB, TEST_DB);

const db = new Database(TEST_DB);
db.pragma('foreign_keys = ON');

function report(name: string, pass: boolean, info?: string) {
  if (pass) console.log(`PASS: ${name}`);
  else console.error(`FAIL: ${name} ${info ? `(${info})` : ''}`);
}

function getRecommendations(cartProductIds: number[]) {
  if (cartProductIds.length === 0) return [];
  
  // Find other products that were bought in the same sales as the products currently in cart
  const placeholders = cartProductIds.map(() => '?').join(',');
  
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

  // 1. Math and logic check
  try {
    // Pick a random product that has been sold to use as the base
    const baseProduct = db.prepare(`SELECT product_id FROM sale_items LIMIT 1`).get() as any;
    
    if (baseProduct) {
      const recs = getRecommendations([baseProduct.product_id]) as any[];
      
      // Ensure we don't recommend the base product itself
      const containsBase = recs.some(r => r.product_id === baseProduct.product_id);
      assert.strictEqual(containsBase, false, "Recommendations should not include products already in the cart");
      
      // Ensure they are ordered by frequency
      if (recs.length > 1) {
        assert.ok(recs[0].frequency >= recs[1].frequency, "Recommendations must be sorted by frequency DESC");
      }
      
      report("Recommendations logic verification", true, `Generated ${recs.length} recommendations for base product ${baseProduct.product_id}`);
    } else {
      report("Recommendations logic verification", false, "No sales data found to test");
    }
  } catch(e: any) { report("Recommendations logic verification", false, e.message); }
}

runTests().catch(console.error);
