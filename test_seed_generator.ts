import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { hashSync } from 'bcryptjs';

const DB_PATH = path.join(__dirname, 'phase0.db');
const SCHEMA_PATH = path.join(__dirname, 'packages/core/schema.sql');

if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);

const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

const schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf8');
db.exec(schemaSql);

console.log("Schema loaded.");

db.exec(`
  INSERT INTO settings (key, value) VALUES 
  ('shop_name', 'Chauhan Electronics E2E'), 
  ('state_code', '29'), 
  ('invoice_prefix', 'CE/26/'), 
  ('next_invoice_no', '1001');

  INSERT INTO users (user_id, name, pin_hash, role) VALUES 
  (1, 'Admin', '${hashSync('1111', 4)}', 'OWNER'),
  (2, 'Sales Desk 1', '${hashSync('2222', 4)}', 'CASHIER'),
  (3, 'Mobile Scanner', '${hashSync('3333', 4)}', 'CASHIER'),
  (4, 'Stock Room', '${hashSync('4444', 4)}', 'STOCK'),
  (5, 'Repair Tech', '${hashSync('5555', 4)}', 'TECHNICIAN');
`);

console.log("Settings and users seeded.");

// Seed Suppliers
const suppliers = [
  "Sony India Pvt Ltd",
  "Pioneer Auto Audio Hub",
  "JBL Harman Dist",
  "Generic Accessories Co"
];
const supplierIds: number[] = [];
const insertSupplier = db.prepare(`INSERT INTO suppliers (name, phone) VALUES (?, ?)`);
suppliers.forEach(name => {
  supplierIds.push((insertSupplier.run(name, '9999900000').lastInsertRowid) as number);
});

// Seed Customers
const insertCustomer = db.prepare(`INSERT INTO customers (name, phone, tier, gstin, credit_limit, current_balance, credit_due_date) VALUES (?, ?, ?, ?, ?, ?, ?)`);
const custCounterId = insertCustomer.run('Walk-in Customer', '0000000000', 'COUNTER', null, 0, 0, null).lastInsertRowid;
const custDealer1Id = insertCustomer.run('Balaji Electronics', '9876543210', 'DEALER', '29ABCDE1234F1Z5', 500000, 10000, null).lastInsertRowid;
const custDealer2Id = insertCustomer.run('Super Motors', '9876543211', 'DEALER', '27ABCDE1234F1Z5', 200000, 0, null).lastInsertRowid; // inter-state
const custDistId = insertCustomer.run('Mega Distributors', '9876543212', 'DISTRIBUTOR', '29ABCDE1234F1Z6', 1000000, 50000, null).lastInsertRowid;
const custOverLimit = insertCustomer.run('Overlimit Dealer', '9876543213', 'DEALER', null, 50000, 60000, '2030-01-01').lastInsertRowid; // Over limit
const custOverDue = insertCustomer.run('Overdue Dealer', '9876543214', 'DEALER', null, 100000, 10000, '2020-01-01').lastInsertRowid; // Overdue

const customerIds = [custCounterId, custDealer1Id, custDealer2Id, custDistId];

// Seed Products (Realistic Indian Market Electronics)
const insertProduct = db.prepare(`
  INSERT INTO products (sku_code, brand_name, model_name, category, hsn_code, gst_rate, requires_serial, purchase_cost, counter_price, dealer_price, distributor_price, min_restock_level, loose_qty)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const products = [
  // Car Audio
  { sku: 'PIO-6977', brand: 'Pioneer', model: 'TS-A6977S 6x9 Speakers', cat: 'Car Audio', hsn: '8518', gst: 18, serial: 1, cost: 250000, cp: 350000, dp: 280000, dist: 260000 },
  { sku: 'SON-AX5500', brand: 'Sony', model: 'XAV-AX5500 Head Unit', cat: 'Car Audio', hsn: '8527', gst: 18, serial: 1, cost: 2000000, cp: 2500000, dp: 2200000, dist: 2100000 },
  { sku: 'JBL-ST3', brand: 'JBL', model: 'Stage3 627 6.5" Speakers', cat: 'Car Audio', hsn: '8518', gst: 18, serial: 1, cost: 180000, cp: 240000, dp: 200000, dist: 190000 },
  { sku: 'ROC-P3D4', brand: 'Rockford Fosgate', model: 'P3D4-12 Subwoofer', cat: 'Car Audio', hsn: '8518', gst: 18, serial: 1, cost: 1200000, cp: 1600000, dp: 1350000, dist: 1250000 },
  // TVs
  { sku: 'SON-X90L-55', brand: 'Sony', model: 'Bravia 55X90L 4K LED', cat: 'TV', hsn: '8528', gst: 28, serial: 1, cost: 9000000, cp: 11000000, dp: 9800000, dist: 9500000 },
  { sku: 'SAM-Q90-65', brand: 'Samsung', model: '65" QN90C Neo QLED', cat: 'TV', hsn: '8528', gst: 28, serial: 1, cost: 14000000, cp: 16000000, dp: 15000000, dist: 14500000 },
  { sku: 'LG-C3-42', brand: 'LG', model: '42" C3 OLED', cat: 'TV', hsn: '8528', gst: 28, serial: 1, cost: 7000000, cp: 8500000, dp: 7500000, dist: 7200000 },
  // Loose Accessories
  { sku: 'CAB-HDMI-2M', brand: 'Generic', model: 'HDMI Cable 2M 4K', cat: 'Accessory', hsn: '8544', gst: 18, serial: 0, cost: 15000, cp: 35000, dp: 20000, dist: 18000 },
  { sku: 'FAS-SWFT', brand: 'Generic', model: 'Swift 9" Fascia', cat: 'Accessory', hsn: '8708', gst: 28, serial: 0, cost: 40000, cp: 80000, dp: 50000, dist: 45000 },
  { sku: 'ISO-MARUTI', brand: 'Generic', model: 'Maruti ISO Harness', cat: 'Accessory', hsn: '8544', gst: 18, serial: 0, cost: 8000, cp: 25000, dp: 12000, dist: 10000 },
];

const productIds: any = {};
products.forEach(p => {
  const id = insertProduct.run(p.sku, p.brand, p.model, p.cat, p.hsn, p.gst, p.serial, p.cost, p.cp, p.dp, p.dist, 5, p.serial ? 0 : 500).lastInsertRowid;
  productIds[p.sku] = { id, ...p };
});

console.log("Products seeded.");

// Seed Serials
const insertSerial = db.prepare(`INSERT INTO product_instances (product_id, serial_number, status, purchase_cost) VALUES (?, ?, ?, ?)`);
let serialCounter = 1000;
Object.values(productIds).forEach((p: any) => {
  if (p.serial) {
    // Add 40 serials for each product
    for (let i = 0; i < 40; i++) {
      insertSerial.run(p.id, `SN-${p.sku}-${serialCounter++}`, 'IN_STOCK', p.cost);
    }
  }
});

console.log("Instances seeded.");

// Seed Sales (Generate 250 past sales)
const insertSale = db.prepare(`
  INSERT INTO sales (invoice_no, customer_id, sold_by, subtotal, discount, cgst, sgst, igst, grand_total, amount_paid, payment_mode, tier_applied, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const insertSaleItem = db.prepare(`
  INSERT INTO sale_items (sale_id, product_id, instance_id, quantity, unit_price, line_discount, line_total, unit_cost)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

let invNo = 1;

for (let i = 0; i < 250; i++) {
  // Random past date within 90 days
  const dateObj = new Date(Date.now() - Math.floor(Math.random() * 90) * 86400000);
  const dateStr = dateObj.toISOString().replace('T', ' ').slice(0, 19);
  
  const isInterState = Math.random() > 0.8; // 20% interstate
  const cId = isInterState ? custDealer2Id : customerIds[Math.floor(Math.random() * customerIds.length)];
  const cTier = cId === custCounterId ? 'COUNTER' : (cId === custDistId ? 'DISTRIBUTOR' : 'DEALER');
  
  const sId = insertSale.run(`CE/26/${invNo++}`, cId, 2, 0, 0, 0, 0, 0, 0, 0, Math.random() > 0.3 ? 'UPI' : 'CASH', cTier, dateStr).lastInsertRowid;
  
  let cartSubtotal = 0;
  let cartCgst = 0;
  let cartSgst = 0;
  let cartIgst = 0;

  // Pick 1-3 random items
  const numItems = Math.floor(Math.random() * 3) + 1;
  const pKeys = Object.keys(productIds);
  for (let j = 0; j < numItems; j++) {
    const p = productIds[pKeys[Math.floor(Math.random() * pKeys.length)]];
    const qty = p.serial ? 1 : Math.floor(Math.random() * 5) + 1;
    let instId = null;
    if (p.serial) {
      // Find an IN_STOCK serial
      const inst = db.prepare(`SELECT instance_id FROM product_instances WHERE product_id = ? AND status = 'IN_STOCK' LIMIT 1`).get(p.id) as any;
      if (!inst) continue; // Out of stock
      instId = inst.instance_id;
      db.prepare(`UPDATE product_instances SET status = 'SOLD' WHERE instance_id = ?`).run(instId);
    } else {
      db.prepare(`UPDATE products SET loose_qty = loose_qty - ? WHERE product_id = ?`).run(qty, p.id);
    }
    
    const unitPrice = cTier === 'COUNTER' ? p.cp : (cTier === 'DEALER' ? p.dp : p.dist);
    const lineTotal = unitPrice * qty;
    
    // Calculate naive GST
    const taxable = Math.round(lineTotal / (1 + p.gst / 100));
    const gstAmt = lineTotal - taxable;
    const cgst = isInterState ? 0 : Math.round(gstAmt / 2);
    const sgst = isInterState ? 0 : Math.round(gstAmt / 2);
    const igst = isInterState ? gstAmt : 0;
    
    cartSubtotal += taxable;
    cartCgst += cgst;
    cartSgst += sgst;
    cartIgst += igst;

    insertSaleItem.run(sId, p.id, instId, qty, unitPrice, 0, lineTotal, p.cost);
  }
  
  const grandTotal = cartSubtotal + cartCgst + cartSgst + cartIgst;
  db.prepare(`UPDATE sales SET subtotal = ?, cgst = ?, sgst = ?, igst = ?, grand_total = ?, amount_paid = ? WHERE sale_id = ?`).run(cartSubtotal, cartCgst, cartSgst, cartIgst, grandTotal, grandTotal, sId);
}

console.log("250 Sales generated.");

console.log("DB Generation Complete!");
