import Database from 'better-sqlite3';
import assert from 'assert';
import fs from 'fs';
import path from 'path';

// Use the seed DB for realistic insight testing
const SRC_DB = path.join(__dirname, 'phase0.db');
const TEST_DB = path.join(__dirname, 'test_insights.db');

if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
fs.copyFileSync(SRC_DB, TEST_DB);

const db = new Database(TEST_DB);
db.pragma('foreign_keys = ON');

function report(name: string, pass: boolean, info?: string) {
  if (pass) console.log(`PASS: ${name}`);
  else console.error(`FAIL: ${name} ${info ? `(${info})` : ''}`);
}

// Emulate the authorize middleware behavior
function authorize(role: string, action: string) {
  const permissions: Record<string, string[]> = {
    'OWNER': ['VIEW_REPORTS', 'MANAGE_USERS', 'PRICE_OVERRIDE'],
    'CASHIER': ['CHECKOUT', 'ISSUE_CN'],
    'SALESPERSON': ['CHECKOUT', 'READ_CATALOGUE']
  };
  return permissions[role]?.includes(action) || false;
}

// Emulate the insight queries that will be built into the API
function getInsights() {
  // Margin by Brand
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

  // Insight 1: Security Gating
  try {
    assert.strictEqual(authorize('OWNER', 'VIEW_REPORTS'), true, "Owner should access insights");
    assert.strictEqual(authorize('SALESPERSON', 'VIEW_REPORTS'), false, "Salesperson should get 403 on insights");
    report("Insights Gated to OWNER only", true);
  } catch(e: any) { report("Insights Gated to OWNER only", false, e.message); }

  // Insight 2: Financial Reconciliation
  try {
    const insights = getInsights();
    
    // Calculate naive total margin from DB directly to reconcile against the grouped insight
    const rawTotal = db.prepare(`
      SELECT SUM(si.line_total) - SUM(si.unit_cost * si.quantity) as total_margin
      FROM sale_items si
      JOIN sales s ON s.sale_id = si.sale_id
      WHERE s.status = 'COMPLETED'
    `).get() as any;

    const groupedTotal = insights.marginByBrand.reduce((acc: number, row: any) => acc + row.margin, 0);

    assert.strictEqual(groupedTotal, rawTotal.total_margin, "Sum of margin by brand must exactly equal total raw margin");
    report("Insights figures reconcile to source rows", true);
  } catch(e: any) { report("Insights figures reconcile to source rows", false, e.message); }
}

runTests().catch(console.error);
