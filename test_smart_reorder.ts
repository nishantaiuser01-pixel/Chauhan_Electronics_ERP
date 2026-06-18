import Database from 'better-sqlite3';
import assert from 'assert';
import fs from 'fs';
import path from 'path';

// Use the seed DB for testing
const SRC_DB = path.join(__dirname, 'phase0.db');
const TEST_DB = path.join(__dirname, 'test_smart_reorder.db');

if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
fs.copyFileSync(SRC_DB, TEST_DB);

const db = new Database(TEST_DB);
db.pragma('foreign_keys = ON');

function report(name: string, pass: boolean, info?: string) {
  if (pass) console.log(`PASS: ${name}`);
  else console.error(`FAIL: ${name} ${info ? `(${info})` : ''}`);
}

function getSmartReorder(targetDays: number = 15) {
  // Query to get recent sales velocity (last 30 days) and current stock
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
  
  for (const r of results as any[]) {
    // velocity per day
    const velocity = r.sold_last_30 / 30;
    // projected demand for target days
    const projectedDemand = velocity * targetDays;
    
    // Suggest reorder if current stock is less than demand OR less than min_restock_level
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

  // 1. Math and logic check
  try {
    const suggestions = getSmartReorder(15);
    
    // Let's assert on the results
    assert.ok(suggestions.length > 0, "Should generate some suggestions based on 250 seeded sales");
    
    // Pick the top suggestion to verify math
    const top = suggestions[0];
    const velocity = top.sold_last_30 / 30;
    const target = Math.max(velocity * 15, top.min_restock_level);
    const expectedReorder = Math.ceil(target - top.current_stock);
    
    assert.strictEqual(top.suggested_order, expectedReorder, "Suggested order math must match exactly");
    
    report("Smart reorder math verification", true, `Generated ${suggestions.length} suggestions`);
  } catch(e: any) { report("Smart reorder math verification", false, e.message); }
}

runTests().catch(console.error);
