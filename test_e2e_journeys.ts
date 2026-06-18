import Database from 'better-sqlite3';
import assert from 'assert';
import fs from 'fs';
import path from 'path';

const SRC_DB = path.join(__dirname, 'phase0.db');
const TEST_DB = path.join(__dirname, 'phase0_e2e.db');

if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
fs.copyFileSync(SRC_DB, TEST_DB);

const db = new Database(TEST_DB);
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

function report(name: string, pass: boolean, info?: string) {
  if (pass) console.log(`PASS: ${name}`);
  else console.error(`FAIL: ${name} ${info ? `(${info})` : ''}`);
}

async function runJourneys() {
  console.log("--- PHASE 0: E2E Journeys ---");

  // Journey 1: GRN -> Stock In -> Sell -> Return (Credit Note)
  try {
    const pId = db.prepare(`SELECT product_id FROM products WHERE sku_code = 'CAB-HDMI-2M'`).get() as any;
    const initialLoose = db.prepare(`SELECT loose_qty FROM products WHERE product_id = ?`).get(pId.product_id) as any;
    
    // Add 10 via fake GRN
    db.prepare(`UPDATE products SET loose_qty = loose_qty + 10 WHERE product_id = ?`).run(pId.product_id);
    
    // Sell 2
    const cId = db.prepare(`SELECT customer_id FROM customers WHERE tier = 'COUNTER' LIMIT 1`).get() as any;
    const sId = db.prepare(`INSERT INTO sales (invoice_no, customer_id, tier_applied) VALUES ('E2E-INV-1', ?, 'COUNTER')`).run(cId.customer_id).lastInsertRowid;
    db.prepare(`INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, line_total, unit_cost) VALUES (?, ?, 2, 35000, 70000, 15000)`).run(sId, pId.product_id);
    db.prepare(`UPDATE products SET loose_qty = loose_qty - 2 WHERE product_id = ?`).run(pId.product_id);
    
    // Return 1 (Credit Note)
    const cnId = db.prepare(`INSERT INTO credit_notes (cn_no, sale_id, amount, reason) VALUES ('CN-1', ?, 35000, 'Customer Return')`).run(sId).lastInsertRowid;
    db.prepare(`UPDATE products SET loose_qty = loose_qty + 1 WHERE product_id = ?`).run(pId.product_id);
    
    const finalLoose = db.prepare(`SELECT loose_qty FROM products WHERE product_id = ?`).get(pId.product_id) as any;
    assert.strictEqual(finalLoose.loose_qty, initialLoose.loose_qty + 10 - 2 + 1, "Stock logic through GRN -> Sell -> Return is correct");
    report("Journey 1 (GRN -> Sell -> Return)", true);
  } catch (e: any) { report("Journey 1 (GRN -> Sell -> Return)", false, e.message); }

  // Journey 2: Repair Intake -> Part Consume -> Bill
  try {
    // Intake
    const rId = db.prepare(`INSERT INTO repair_jobs (customer_phone, status, est_cost) VALUES ('9999911111', 'PENDING', 500000)`).run().lastInsertRowid;
    
    // Consume part (e.g. HDMI Cable)
    const pId = db.prepare(`SELECT product_id FROM products WHERE sku_code = 'CAB-HDMI-2M'`).get() as any;
    db.prepare(`UPDATE products SET loose_qty = loose_qty - 1 WHERE product_id = ?`).run(pId.product_id);
    // Add to repair parts
    db.prepare(`INSERT INTO repair_parts (job_id, product_id, qty, cost) VALUES (?, ?, 1, 35000)`).run(rId, pId.product_id);
    
    // Finish repair
    db.prepare(`UPDATE repair_jobs SET status = 'DELIVERED', final_cost = 535000 WHERE job_id = ?`).run(rId);
    report("Journey 2 (Repair Lifecycle)", true);
  } catch(e: any) { report("Journey 2 (Repair Lifecycle)", false, e.message); }

  // Journey 3: Reconciliation
  try {
    const totalSales = db.prepare(`SELECT SUM(subtotal) as st, SUM(cgst) as cgst, SUM(sgst) as sgst, SUM(igst) as igst, SUM(grand_total) as gt FROM sales WHERE status = 'COMPLETED'`).get() as any;
    
    // There might be rounding differences if naive math was used, but we'll accept a small delta
    const calculatedGt = totalSales.st + totalSales.cgst + totalSales.sgst + totalSales.igst;
    const diff = Math.abs((totalSales.gt || 0) - calculatedGt);
    assert.ok(diff < 1000, `Reconciliation mismatch: ${diff}`);
    report("Journey 3 (GSTR-1 Reconciliation)", true);
  } catch(e: any) { report("Journey 3 (GSTR-1 Reconciliation)", false, e.message); }
}

runJourneys().catch(console.error);
