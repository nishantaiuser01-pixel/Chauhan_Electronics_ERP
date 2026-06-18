import assert from 'assert';
import Database from 'better-sqlite3';
import { createApiServer } from './apps/desktop/electron/api';
import { hashSync } from 'bcryptjs';

console.log("DB setup done");

// Setup mock DB
const dbPath = ':memory:';
const fs = require('fs');

const db = new Database(dbPath);
const schema = fs.readFileSync('./packages/core/schema.sql', 'utf8');
db.exec(schema);
console.log("Schema loaded");

// Seed DB
db.exec(`
  INSERT INTO users (name, pin_hash, role, active) VALUES 
  ('Admin User', '${hashSync('1111', 4)}', 'OWNER', 1),
  ('Sales Guy', '${hashSync('2222', 4)}', 'CASHIER', 1);

  INSERT INTO settings (key, value) VALUES 
  ('shop_name', 'Chauhan Electronics'), 
  ('state_code', '29'), 
  ('invoice_prefix', 'CE/26/'), 
  ('next_invoice_no', '1001');

  INSERT INTO customers (name, phone, tier) VALUES ('Counter', '0000', 'COUNTER');
  INSERT INTO customers (name, phone, tier) VALUES ('Dealer', '1111', 'DEALER');
  INSERT INTO customers (name, phone, tier) VALUES ('Distributor', '2222', 'DISTRIBUTOR');
  INSERT INTO customers (name, phone, tier, credit_limit, current_balance, credit_due_date) 
  VALUES ('Broke Guy', '3333', 'COUNTER', 5000, 5000, '2025-01-01');

  INSERT INTO products (sku_code, brand_name, model_name, requires_serial, purchase_cost, counter_price, dealer_price, distributor_price, loose_qty)
  VALUES ('SKU1', 'Samsung', 'TV', 1, 1000000, 1500000, 1400000, 1300000, 0),
         ('SKU2', 'Samsung', 'Loose Cable', 0, 1000, 1500, 1400, 1300, 50);

  INSERT INTO product_instances (product_id, serial_number, status, purchase_cost)
  VALUES (1, 'SN123', 'IN_STOCK', 1000000);
`);
console.log("DB seeded");

const sessionStore = new Map();
const app = createApiServer({
  getDB: () => db,
  sessionStore,
  isPackaged: true,
  initDB: () => {},
});

function mockRequest(app: any, method: string, url: string, headers: any = {}, body: any = {}) {
  return new Promise<any>((resolve) => {
    let responseStatus = 200;
    const req = {
      method, url, headers, body, query: {}, path: url.split('?')[0],
      connection: { remoteAddress: '127.0.0.1' }, on: () => {}
    };
    const res = {
      status: (code: number) => { responseStatus = code; return res; },
      json: (data: any) => resolve({ status: responseStatus, data }),
      send: (data: any) => resolve({ status: responseStatus, data }),
      setHeader: () => {}, end: () => resolve({ status: responseStatus, data: null })
    };
    app(req, res, (err: any) => {
      if (err) resolve({ status: 500, data: err.message });
      else resolve({ status: 404, data: 'Not found' });
    });
  });
}

async function request(method: string, path: string, token: string, body?: any) {
  const headers = { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) };
  return mockRequest(app, method, path, headers, body || {});
}

async function runTests() {
  console.log("Starting Mobile Flow Tests...");
  
  try {
    // 1. Get tokens
    let res: any = await request('POST', '/api/auth/login', '', { pin: '1111' });
    const ownerToken = res.data.token;
    
    res = await request('POST', '/api/auth/login', '', { pin: '2222' });
    const salespersonToken = res.data.token;
    
    // MT-COST
    res = await request('GET', '/api/products/serial/SN123', ownerToken);
    assert.ok(res.data.product.purchase_cost !== undefined, "OWNER should see purchase_cost");
    
    res = await request('GET', '/api/products/serial/SN123', salespersonToken);
    assert.ok(res.data.product.purchase_cost === undefined, "SALESPERSON should NOT see purchase_cost");
    console.log("MT-COST: PASS");

    // MT-FLOOR
    // Try to sell below floor (floor is 1000000 * 1.05 = 1050000)
    res = await request('POST', '/api/sales/validate-price', salespersonToken, {
      product_id: 1, instance_id: 1, final_price: 1040000
    });
    assert.strictEqual(res.data.allowed, false, "Should reject below floor");
    console.log("MT-FLOOR: PASS");

    // MT-DISCOUNT
    res = await request('POST', '/api/sales/validate-price', salespersonToken, {
      product_id: 1, instance_id: 1, final_price: 1250000
    });
    if (!res.data.allowed) console.error("validate-price returned false! Res:", res);
    assert.strictEqual(res.data.allowed, true, "Should allow above floor and within discount");
    console.log("MT-DISCOUNT: PASS");

    // Generate override token via Admin
    res = await request('POST', '/api/sales/admin-override', ownerToken, {
      admin_pin: '1111', product_id: 1, instance_id: 1, final_price: 1040000, note: 'Override'
    });
    const overrideToken = res.data.override_token;
    assert.ok(overrideToken, "Should generate override token");
    
    const auditRow = db.prepare("SELECT * FROM audit_log WHERE action = 'PRICE_OVERRIDE'").get() as any;
    assert.strictEqual(auditRow.user_id, 1, "Audit log must show Admin ID");

    // Checkout with override
    res = await request('POST', '/api/sales/checkout', salespersonToken, {
      customer_id: 1, tier_applied: 'COUNTER', payment_mode: 'CASH',
      cart: [{ product_id: 1, instance_id: 1, quantity: 1, price: 1500000, discount: 460000, override_token: overrideToken }]
    });
    assert.strictEqual(res.data.success, true, "Checkout should succeed with override");
    
    const saleRow = db.prepare("SELECT * FROM sales").get() as any;
    assert.strictEqual(saleRow.sold_by, 2, "MT-ATTRIB: Sale should be attributed to Salesperson (ID: 2)");

    console.log("MT-ATTRIB: PASS");

    // MT-DOUBLESELL
    res = await request('POST', '/api/sales/checkout', salespersonToken, {
      customer_id: 1, tier_applied: 'COUNTER', payment_mode: 'CASH',
      cart: [{ product_id: 1, instance_id: 1, quantity: 1, price: 1500000, discount: 0 }]
    });
    if (res.status !== 409) console.error("DOUBLESELL FAILED. Res:", res);
    assert.strictEqual(res.status, 409, "Second checkout of same serial must return 409");
    console.log("MT-DOUBLESELL: PASS");

    // MT-TOTALS
    res = await request('GET', '/api/reports/margin', salespersonToken);
    assert.strictEqual(res.status, 403, "SALESPERSON should get 403 on reports");
    console.log("MT-TOTALS: PASS");

    // NEW MT-TIER
    res = await request('POST', '/api/sales/checkout', salespersonToken, {
      customer_id: 2, tier_applied: 'DEALER', payment_mode: 'CASH',
      cart: [{ product_id: 2, instance_id: null, quantity: 1, price: 1400, discount: 0 }]
    });
    assert.strictEqual(res.data.success, true, "Should allow DEALER price checkout");
    const tierRow = db.prepare("SELECT * FROM sales WHERE sale_id = ?").get(res.data.saleId) as any;
    assert.strictEqual(tierRow.tier_applied, 'DEALER', "Tier should be DEALER");
    console.log("MT-TIER: PASS");

    // NEW MT-UDHAAR
    res = await request('POST', '/api/sales/checkout', salespersonToken, {
      customer_id: 4, tier_applied: 'COUNTER', payment_mode: 'UDHAAR',
      cart: [{ product_id: 2, instance_id: null, quantity: 1, price: 1500, discount: 0 }]
    });
    if (res.status !== 402) {
      console.error(res.data);
    }
    assert.strictEqual(res.status, 402, "Should block overdue/over-limit Udhaar sale");

    res = await request('POST', '/api/sales/admin-override', ownerToken, {
      admin_pin: '1111', override_type: 'UDHAAR', customer_id: 4, note: 'MT Test'
    });
    const udhaarToken = res.data.override_token;
    assert.ok(udhaarToken, "Should generate Udhaar override token");

    const auditUdhaar = db.prepare("SELECT * FROM audit_log WHERE action = 'UDHAAR_OVERRIDE'").get() as any;
    assert.strictEqual(auditUdhaar.user_id, 1, "Audit log must show Admin ID for Udhaar override");

    res = await request('POST', '/api/sales/checkout', salespersonToken, {
      customer_id: 4, tier_applied: 'COUNTER', payment_mode: 'UDHAAR', udhaar_override_token: udhaarToken,
      cart: [{ product_id: 2, instance_id: null, quantity: 1, price: 1500, discount: 0 }]
    });
    assert.strictEqual(res.data.success, true, "Should succeed with Udhaar override token");
    console.log("MT-UDHAAR: PASS");

  } catch (e: any) {
    console.error("TEST FAILED:", e.message);
    process.exit(1);
  }
}

runTests();
