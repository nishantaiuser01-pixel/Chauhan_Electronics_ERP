import assert from 'node:assert';
import Module from 'module';
import fs from 'fs';

// 1. Mock electron before importing anything
const originalRequire = (Module as any).prototype.require;
const mockIpcHandlers = new Map<string, Function>();

(Module as any).prototype.require = function(request: string) {
  if (request === 'electron') {
    return {
      app: { 
        get isPackaged() { return false; },
        getPath: () => '/tmp/erp',
        getAppPath: () => '/tmp/erp',
        setPath: () => {},
        on: () => {},
        whenReady: () => Promise.resolve()
      },
      ipcMain: {
        handle: (channel: string, listener: Function) => {
          mockIpcHandlers.set(channel, listener);
        },
        on: () => {}
      },
      BrowserWindow: class { 
        webContents = { send: () => {} }
      }
    };
  }
  if (request === 'node-thermal-printer') {
    return {
      ThermalPrinter: class {},
      PrinterTypes: { EPSON: 1 },
      CharacterSet: { PC858_EURO: 1 }
    };
  }
  return originalRequire.apply(this, arguments);
};

// 2. Init DB and load main.ts
import { getDB, initDB } from './packages/core/db';
import { setPermissionsOverrides } from './packages/core/permissions';

// Force temp db
process.env.TEST_DB = 'test_phase4.db';
if (fs.existsSync(process.env.TEST_DB)) fs.unlinkSync(process.env.TEST_DB);

const schema = fs.readFileSync('./packages/core/schema.sql', 'utf8');
initDB(process.env.TEST_DB, schema);
const db = getDB();

// We must manually require main to register IPC
(process as any).resourcesPath = '/tmp/erp';
require('./apps/desktop/electron/main');

async function runTests() {
  console.log('--- STARTING PHASE 4 TESTS ---');
  let failures = 0;

  // Helpers
  const verifyPin = mockIpcHandlers.get('verify-desktop-pin');
  const dbTransaction = mockIpcHandlers.get('db-transaction');
  const voidSale = mockIpcHandlers.get('db-void-sale');
  const returnAccept = mockIpcHandlers.get('db-return-accept');
  
  const hash = require('bcryptjs').hashSync('1234', 10);
  
  // Create users
  db.prepare('DELETE FROM users').run();
  db.prepare("INSERT INTO users (user_id, name, pin_hash, role) VALUES (1, 'Owner', ?, 'OWNER')").run(hash);
  db.prepare("INSERT INTO users (user_id, name, pin_hash, role) VALUES (2, 'Cashier', ?, 'CASHIER')").run(hash);
  
  // Setup products & customer
  const prodId = db.prepare("INSERT INTO products (brand_name, model_name, category, counter_price, dealer_price, distributor_price) VALUES ('A', 'B', 'C', 1000, 900, 800)").run().lastInsertRowid;
  db.prepare("INSERT INTO product_instances (product_id, serial_number, status) VALUES (?, 'SN123', 'IN_STOCK')").run(prodId);
  const looseProdId = db.prepare("INSERT INTO products (brand_name, model_name, category, counter_price, dealer_price, distributor_price, requires_serial, loose_qty) VALUES ('X', 'Y', 'Z', 100, 90, 80, 0, 10)").run().lastInsertRowid;
  const custId = db.prepare("INSERT INTO customers (name, phone, current_balance) VALUES ('Cust', '1234567890', 0)").run().lastInsertRowid;
  
  // ==============================================
  // 1. OVERRIDE-ENFORCE & PERM-RUNTIME
  // ==============================================
  try {
    console.log('[TEST] OVERRIDE-ENFORCE & PERM-RUNTIME');
    await verifyPin(null, '1234'); // Sets session to first user matching '1234' (Owner)
    // Wait, verifyPin matches first. Let's make Cashier pin '0000'
    const hash0 = require('bcryptjs').hashSync('0000', 10);
    db.prepare('UPDATE users SET pin_hash = ? WHERE role = "CASHIER"').run(hash0);
    
    // Login Cashier
    const loginRes = await verifyPin(null, '0000');
    assert.strictEqual(loginRes.user.role, 'CASHIER');

    // Default: no override, VOID_SALE is blocked
    let threw = false;
    try {
      await voidSale(null, 999);
    } catch(e: any) {
      console.log('Got error:', e.message);
      assert(e.message.includes('Unauthorized'), 'Expected Unauthorized');
      threw = true;
    }
    assert(threw, 'Cashier should not void sale without override');

    // Set permission override in DB via db-transaction (which triggers reload)
    await verifyPin(null, '1234'); // Switch to Owner to edit settings
    await dbTransaction(null, [
      { sql: "INSERT INTO settings (key, value) VALUES ('perm_CASHIER_VOID_SALE', 'true')", params: [] }
    ]);
    await verifyPin(null, '0000'); // Switch back to Cashier

    // Now Void should throw "not found", NOT "Unauthorized"
    threw = false;
    try {
      await voidSale(null, 999);
    } catch(e: any) {
      if (e.message.includes('not found')) threw = true;
      if (e.message.includes('Unauthorized')) throw new Error('Still unauthorized after override!');
    }
    assert(threw, 'Should bypass Unauthorized and hit not found');

    console.log('✅ OVERRIDE-ENFORCE & PERM-RUNTIME Passed');
  } catch(e: any) {
    console.error('❌ OVERRIDE-ENFORCE Failed', e);
    failures++;
  }

  // ==============================================
  // 2. VOID-ATOMIC
  // ==============================================
  try {
    console.log('[TEST] VOID-ATOMIC');
    // Login Owner
    await verifyPin(null, '1234');

    // Create a sale to void
    const inst = db.prepare("SELECT * FROM product_instances WHERE serial_number='SN123'").get() as any;
    db.prepare("UPDATE product_instances SET status = 'SOLD' WHERE instance_id = ?").run(inst.instance_id);
    db.prepare("UPDATE products SET loose_qty = 9 WHERE product_id = ?").run(looseProdId); // Deduct 1
    
    // Udhaar sale
    const saleId = db.prepare("INSERT INTO sales (invoice_no, customer_id, tier_applied, grand_total, amount_paid, payment_mode, status) VALUES ('INV1', ?, 'COUNTER', 1100, 500, 'UDHAAR', 'COMPLETED')").run(custId).lastInsertRowid;
    // Add items
    db.prepare("INSERT INTO sale_items (sale_id, product_id, instance_id, quantity, unit_price) VALUES (?, ?, ?, 1, 1000)").run(saleId, prodId, inst.instance_id);
    db.prepare("INSERT INTO sale_items (sale_id, product_id, instance_id, quantity, unit_price) VALUES (?, ?, NULL, 1, 100)").run(saleId, looseProdId);
    
    // Update customer udhaar
    db.prepare("UPDATE customers SET current_balance = 600 WHERE customer_id = ?").run(custId);

    // Void the sale!
    await voidSale(null, saleId);

    // Verify
    const updatedSale = db.prepare("SELECT status FROM sales WHERE sale_id = ?").get(saleId) as any;
    assert.strictEqual(updatedSale.status, 'CANCELLED');

    const updatedInst = db.prepare("SELECT status FROM product_instances WHERE instance_id = ?").get(inst.instance_id) as any;
    assert.strictEqual(updatedInst.status, 'IN_STOCK', 'Serial should be restored to IN_STOCK');

    const updatedLoose = db.prepare("SELECT loose_qty FROM products WHERE product_id = ?").get(looseProdId) as any;
    assert.strictEqual(updatedLoose.loose_qty, 10, 'Loose quantity should be restored to 10');

    const updatedCust = db.prepare("SELECT current_balance FROM customers WHERE customer_id = ?").get(custId) as any;
    assert.strictEqual(updatedCust.current_balance, 0, 'Customer balance should be reverted');

    const logs = db.prepare("SELECT * FROM audit_log WHERE entity = 'sales' AND entity_id = ? AND action = 'DELETE'").all(saleId);
    assert.strictEqual(logs.length, 1, 'Audit log should be created');

    console.log('✅ VOID-ATOMIC Passed');
  } catch(e: any) {
    console.error('❌ VOID-ATOMIC Failed', e);
    failures++;
  }
  
  if (failures === 0) {
    console.log('ALL PHASE 4 TESTS PASSED.');
  } else {
    console.error(`FAILED ${failures} PHASE 4 TESTS.`);
  }
}

runTests();
