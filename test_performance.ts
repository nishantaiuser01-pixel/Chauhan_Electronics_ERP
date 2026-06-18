import Database from 'better-sqlite3';
import assert from 'assert';
import fs from 'fs';
import path from 'path';

const SRC_DB = path.join(__dirname, 'phase0.db');
const TEST_DB = path.join(__dirname, 'phase0_perf.db');

if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
fs.copyFileSync(SRC_DB, TEST_DB);

const db = new Database(TEST_DB);
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

function report(name: string, pass: boolean, info?: string) {
  if (pass) console.log(`PASS: ${name}`);
  else console.error(`FAIL: ${name} ${info ? `(${info})` : ''}`);
}

async function runPerformance() {
  console.log("--- PHASE 0: Performance & Concurrency Tests ---");

  // 1. Search Latency
  const startSearch = performance.now();
  const searchResults = db.prepare(`SELECT * FROM products WHERE brand_name LIKE '%Sony%' OR category = 'Car Audio' LIMIT 50`).all();
  const searchTime = performance.now() - startSearch;
  assert.ok(searchResults.length > 0, "Should find results");
  report(`Search Latency (${Math.round(searchTime)}ms)`, searchTime < 50, "Expected < 50ms");

  // 2. Concurrency Race (N terminals trying to buy same Serial)
  const N = 10;
  // Get an IN_STOCK serial
  const target = db.prepare(`SELECT instance_id, product_id, purchase_cost FROM product_instances WHERE status = 'IN_STOCK' LIMIT 1`).get() as any;
  const cId = db.prepare(`SELECT customer_id FROM customers WHERE tier = 'COUNTER' LIMIT 1`).get() as any;

  // We simulate N concurrent checkouts via DB transactions to mimic the API hitting DB at the same time
  // Since better-sqlite3 is synchronous and runs in one thread, we can't truly do async races in SQLite via Node event loop, 
  // BUT we can test the `BEGIN IMMEDIATE` lock behavior if we simulate multi-process, OR just rely on UNIQUE constraint testing.
  // Actually, better-sqlite3 serializes. If two requests try to checkout the exact same instance, the first one updates it to SOLD.
  // The second one MUST fail because the checkout logic should check if it's still IN_STOCK.
  
  let successes = 0;
  let conflicts = 0;

  const checkoutTx = db.transaction((instId: number) => {
    // Read status
    const status = db.prepare(`SELECT status FROM product_instances WHERE instance_id = ?`).get(instId) as any;
    if (status.status !== 'IN_STOCK') {
      throw new Error("409 Conflict: ALREADY_SOLD");
    }
    // Update
    db.prepare(`UPDATE product_instances SET status = 'SOLD' WHERE instance_id = ?`).run(instId);
    // Create sale
    const sId = db.prepare(`INSERT INTO sales (invoice_no, customer_id, tier_applied) VALUES (?, ?, 'COUNTER')`).run(`PERF-${Math.random()}`, cId.customer_id).lastInsertRowid;
    db.prepare(`INSERT INTO sale_items (sale_id, product_id, instance_id, quantity, unit_price, line_total, unit_cost) VALUES (?, ?, ?, 1, 1000, 1000, 500)`).run(sId, target.product_id, instId);
  });

  for(let i=0; i<N; i++) {
    try {
      checkoutTx(target.instance_id);
      successes++;
    } catch(e: any) {
      if (e.message.includes("409 Conflict")) conflicts++;
      else throw e;
    }
  }

  assert.strictEqual(successes, 1, `Expected exactly 1 success, got ${successes}`);
  assert.strictEqual(conflicts, N - 1, `Expected ${N-1} conflicts, got ${conflicts}`);
  report(`Concurrency Race (${N} requests)`, true, `1 success, ${conflicts} conflicts`);

  // 3. Long-span report latency (Sum all sales over 3 months)
  const startReport = performance.now();
  const reportData = db.prepare(`SELECT SUM(grand_total) as gt, SUM(cgst) as cgst, SUM(sgst) as sgst, SUM(igst) as igst FROM sales WHERE created_at >= date('now', '-90 days')`).get();
  const reportTime = performance.now() - startReport;
  report(`Report Latency (${Math.round(reportTime)}ms)`, reportTime < 100, "Expected < 100ms");
}

runPerformance().catch(console.error);
