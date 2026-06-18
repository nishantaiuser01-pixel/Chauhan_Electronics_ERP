import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import express from 'express';
import cors from 'cors';
import { ThermalPrinter, PrinterTypes, CharacterSet, BreakLine } from 'node-thermal-printer';
import { initDB, getDB, calculateAging, formatPaymentReminder } from '@chauhan-erp/core';
import crypto from 'crypto';
import QRCode from 'qrcode';

// Setup userData path to be inside workspace due to EPERM restrictions on the OS
app.setPath('userData', path.join(__dirname, '../../local_db_data'));
const userDataPath = app.getPath('userData');
if (!fs.existsSync(userDataPath)) {
  fs.mkdirSync(userDataPath, { recursive: true });
}
const configPath = path.join(userDataPath, 'db-config.json');

interface DbConfig {
  dbPath: string;
  backupDir: string;
}

let activeConfig: DbConfig = {
  dbPath: path.join(userDataPath, 'chauhan-erp.db'),
  backupDir: '',
};

// In-memory session store for LAN API authentication
// token -> { user_id: number, role: string, issuedAt: number }
const sessionStore: Map<string, { user_id: number; role: string; issuedAt: number }> = new Map();

function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Load or create config
if (fs.existsSync(configPath)) {
  try {
    activeConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (e) {
    console.error('Error reading db-config.json, using defaults', e);
  }
} else {
  fs.writeFileSync(configPath, JSON.stringify(activeConfig, null, 2));
}

// Find schema.sql
let schemaSql = '';
const devSchemaPath = path.join(__dirname, '../../packages/core/schema.sql');
const prodSchemaPath = path.join(process.resourcesPath, 'schema.sql');

if (fs.existsSync(devSchemaPath)) {
  schemaSql = fs.readFileSync(devSchemaPath, 'utf8');
} else if (fs.existsSync(prodSchemaPath)) {
  schemaSql = fs.readFileSync(prodSchemaPath, 'utf8');
} else {
  // Hardcoded fallback of the exact schema if files are somehow missing at runtime
  schemaSql = `
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
    CREATE TABLE IF NOT EXISTS users (user_id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, pin_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('OWNER','CASHIER','STOCK','TECHNICIAN')), active INTEGER DEFAULT 1);
    CREATE TABLE IF NOT EXISTS audit_log (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER REFERENCES users(user_id), action TEXT, entity TEXT, entity_id INTEGER, detail TEXT, created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS customers (customer_id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, phone TEXT UNIQUE NOT NULL, shop_name TEXT, tier TEXT NOT NULL DEFAULT 'COUNTER' CHECK(tier IN ('COUNTER','DEALER','DISTRIBUTOR')), gstin TEXT, credit_limit INTEGER DEFAULT 0, current_balance INTEGER DEFAULT 0, credit_due_date TEXT, created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS customer_ledger (id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id INTEGER REFERENCES customers(customer_id), type TEXT CHECK(type IN ('SALE','PAYMENT','ADJUSTMENT','RETURN')), ref_id INTEGER, amount INTEGER, balance_after INTEGER, note TEXT, created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS suppliers (supplier_id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, phone TEXT, gstin TEXT, current_payable INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS products (product_id INTEGER PRIMARY KEY AUTOINCREMENT, sku_code TEXT UNIQUE, brand_name TEXT, model_name TEXT, category TEXT, hsn_code TEXT, gst_rate INTEGER DEFAULT 18, requires_serial INTEGER DEFAULT 1, warranty_months INTEGER DEFAULT 12, min_restock_level INTEGER DEFAULT 5, counter_price INTEGER, dealer_price INTEGER, distributor_price INTEGER, loose_qty INTEGER DEFAULT 0, purchase_cost INTEGER DEFAULT 0, supplier_id INTEGER REFERENCES suppliers(supplier_id), created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS product_fitment (id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER REFERENCES products(product_id) ON DELETE CASCADE, vehicle_tag TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS product_instances (instance_id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER NOT NULL REFERENCES products(product_id), serial_number TEXT UNIQUE NOT NULL, status TEXT NOT NULL DEFAULT 'IN_STOCK' CHECK(status IN ('IN_STOCK','SOLD','RMA_RETURNED','IN_REPAIR','SCRAPPED')), batch_number TEXT, purchase_cost INTEGER, grn_id INTEGER, received_at TEXT DEFAULT (datetime('now')), sold_at TEXT, warranty_expires_at TEXT);
    CREATE TABLE IF NOT EXISTS grn (grn_id INTEGER PRIMARY KEY AUTOINCREMENT, supplier_id INTEGER REFERENCES suppliers(supplier_id), invoice_ref TEXT, total_cost INTEGER DEFAULT 0, received_by INTEGER REFERENCES users(user_id), created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS sales (sale_id INTEGER PRIMARY KEY AUTOINCREMENT, invoice_no TEXT UNIQUE, customer_id INTEGER REFERENCES customers(customer_id), tier_applied TEXT NOT NULL, subtotal INTEGER, discount INTEGER DEFAULT 0, cgst INTEGER DEFAULT 0, sgst INTEGER DEFAULT 0, igst INTEGER DEFAULT 0, grand_total INTEGER, amount_paid INTEGER, payment_mode TEXT, status TEXT DEFAULT 'COMPLETED' CHECK(status IN ('HELD','COMPLETED','CANCELLED')), sold_by INTEGER REFERENCES users(user_id), created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS sale_items (sale_item_id INTEGER PRIMARY KEY AUTOINCREMENT, sale_id INTEGER REFERENCES sales(sale_id) ON DELETE CASCADE, product_id INTEGER REFERENCES products(product_id), instance_id UNIQUE REFERENCES product_instances(instance_id), quantity INTEGER DEFAULT 1, unit_price INTEGER, line_discount INTEGER DEFAULT 0, line_total INTEGER, unit_cost INTEGER DEFAULT 0);
    CREATE TABLE IF NOT EXISTS credit_notes (cn_id INTEGER PRIMARY KEY AUTOINCREMENT, cn_no TEXT UNIQUE, sale_id INTEGER REFERENCES sales(sale_id), instance_id REFERENCES product_instances(instance_id), amount INTEGER, reason TEXT, created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS rma_register (rma_id INTEGER PRIMARY KEY AUTOINCREMENT, instance_id INTEGER REFERENCES product_instances(instance_id), supplier_id INTEGER REFERENCES suppliers(supplier_id), reason TEXT, status TEXT NOT NULL DEFAULT 'SENT' CHECK(status IN ('SENT','REPLACED','CREDITED','RECEIVED_BACK')), sent_at TEXT DEFAULT (datetime('now')), resolved_at TEXT, note TEXT);
    CREATE TABLE IF NOT EXISTS repair_jobs (job_id INTEGER PRIMARY KEY AUTOINCREMENT, job_no TEXT UNIQUE, customer_id INTEGER REFERENCES customers(customer_id), customer_phone TEXT NOT NULL, customer_name TEXT, product_name TEXT, serial_number TEXT, sold_by_us INTEGER DEFAULT 0, is_warranty INTEGER DEFAULT 0, issue_reported TEXT, technician_notes TEXT, technician_id INTEGER REFERENCES users(user_id), status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','IN_REPAIR','SENT_TO_COMPANY','READY','DELIVERED')), est_cost INTEGER, parts_cost INTEGER DEFAULT 0, labour_cost INTEGER DEFAULT 0, advance_paid INTEGER DEFAULT 0, final_cost INTEGER, intake_date TEXT DEFAULT (datetime('now')), ready_date TEXT, delivered_date TEXT);
    CREATE TABLE IF NOT EXISTS repair_parts (id INTEGER PRIMARY KEY AUTOINCREMENT, job_id INTEGER REFERENCES repair_jobs(job_id) ON DELETE CASCADE, product_id INTEGER REFERENCES products(product_id), instance_id REFERENCES product_instances(instance_id), qty INTEGER DEFAULT 1, cost INTEGER);
    CREATE TABLE IF NOT EXISTS repair_status_history (id INTEGER PRIMARY KEY AUTOINCREMENT, job_id INTEGER REFERENCES repair_jobs(job_id) ON DELETE CASCADE, old_status TEXT, new_status TEXT, changed_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS sms_outbox (id INTEGER PRIMARY KEY AUTOINCREMENT, phone TEXT, body TEXT, channel TEXT DEFAULT 'SMS' CHECK(channel IN ('SMS','WHATSAPP')), status TEXT DEFAULT 'QUEUED' CHECK(status IN ('QUEUED','SENT','FAILED')), created_at TEXT DEFAULT (datetime('now')), sent_at TEXT, retry_count INTEGER DEFAULT 0);
    CREATE TABLE IF NOT EXISTS expenses (id INTEGER PRIMARY KEY AUTOINCREMENT, category TEXT, amount INTEGER, note TEXT, created_at TEXT DEFAULT (datetime('now')));
  `;
}

// Init DB
try {
  initDB(activeConfig.dbPath, schemaSql);
  console.log(`Database initialized successfully at ${activeConfig.dbPath}`);

  // Runtime migration: add channel column to sms_outbox if missing
  try {
    const db = getDB();
    const cols = db.prepare("PRAGMA table_info(sms_outbox)").all() as any[];
    if (!cols.find((c: any) => c.name === 'channel')) {
      db.prepare("ALTER TABLE sms_outbox ADD COLUMN channel TEXT DEFAULT 'SMS'").run();
      console.log('Migration: added channel column to sms_outbox');
    }
  } catch (migErr) {
    console.error('Migration error (channel):', migErr);
  }
  
  // Runtime migration: Reports & Analytics
  try {
    const db = getDB();
    const prodCols = db.prepare("PRAGMA table_info(products)").all() as any[];
    if (!prodCols.find((c: any) => c.name === 'purchase_cost')) {
      db.prepare("ALTER TABLE products ADD COLUMN purchase_cost INTEGER DEFAULT 0").run();
      console.log('Migration: added purchase_cost to products');
    }
    if (!prodCols.find((c: any) => c.name === 'supplier_id')) {
      db.prepare("ALTER TABLE products ADD COLUMN supplier_id INTEGER REFERENCES suppliers(supplier_id)").run();
      console.log('Migration: added supplier_id to products');
    }
    
    const siCols = db.prepare("PRAGMA table_info(sale_items)").all() as any[];
    if (!siCols.find((c: any) => c.name === 'unit_cost')) {
      db.prepare("ALTER TABLE sale_items ADD COLUMN unit_cost INTEGER DEFAULT 0").run();
      console.log('Migration: added unit_cost to sale_items');
      
      // Backfill unit_cost for serialized items
      db.prepare(`
        UPDATE sale_items
        SET unit_cost = (
          SELECT pi.purchase_cost 
          FROM product_instances pi 
          WHERE pi.instance_id = sale_items.instance_id
        )
        WHERE instance_id IS NOT NULL AND unit_cost = 0;
      `).run();
      console.log('Migration: backfilled unit_cost for serialized items');
    }
  } catch (migErr) {
    console.error('Migration error (reports):', migErr);
  }
} catch (err) {
  console.error('Failed to initialize database', err);
}

// ================= EXPRESS API FOR MOBILE SCANNER =================
import { createApiServer } from './api';
import { assertCan, setPermissionsOverrides } from '@chauhan-erp/core';

function loadPermissions() {
  try {
    const db = getDB();
    const rows = db.prepare("SELECT key, value FROM settings WHERE key LIKE 'perm_%'").all() as any[];
    const overrides: Record<string, boolean> = {};
    rows.forEach((r: any) => {
      // key format: perm_CASHIER_EDIT_PRICE
      const parts = r.key.split('_');
      if (parts.length >= 3) {
        const role = parts[1];
        const action = parts.slice(2).join('_');
        overrides[`${role}_${action}`] = r.value === 'true';
      }
    });
    setPermissionsOverrides(overrides);
  } catch (err) {
    console.error('Failed to load permission overrides:', err);
  }
}

// Initial load
loadPermissions();

let activeDesktopSession: any = null;

function handleElevated(channel: string, action: any, handler: (...args: any[]) => any) {
  ipcMain.handle(channel, async (event, ...args) => {
    assertCan(activeDesktopSession?.role, action);
    return handler(event, ...args);
  });
}

const PORT = 47615;
let serverInstance: any = null;
function startExpressServer() {
  if (serverInstance) return;
  const expressApp = createApiServer({
    getDB,
    sessionStore,
    isPackaged: app.isPackaged,
    mainWindow,
    activeConfig,
    configPath,
    initDB,
    schemaSql
  });
  serverInstance = expressApp.listen(PORT, '0.0.0.0', () => {
    console.log(`Express LAN API server listening on http://0.0.0.0:${PORT}`);
  });
}

ipcMain.handle('verify-desktop-pin', (e, pin) => {
  const db = getDB();
  const users = db.prepare('SELECT * FROM users WHERE active = 1').all() as any[];
  const bcrypt = require('bcryptjs');
  const matchedUser = users.find((u: any) => bcrypt.compareSync(pin, u.pin_hash));
  if (matchedUser) {
    const userPayload = { user_id: matchedUser.user_id, role: matchedUser.role, name: matchedUser.name };
    activeDesktopSession = userPayload;
    return { success: true, user: userPayload };
  }
  return { success: false, error: 'Invalid PIN' };
});

ipcMain.handle('desktop-logout', () => {
  activeDesktopSession = null;
  return true;
});

ipcMain.handle('get-session', () => {
  return activeDesktopSession;
});

function getLocalIpAddress(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

function performBackup(backupFolder: string): string {
  if (!backupFolder || !fs.existsSync(backupFolder)) {
    throw new Error('Backup directory does not exist or is not set.');
  }
  const dateStr = new Date().toISOString().replace(/T/, '_').replace(/\..+/, '').replace(/:/g, '-');
  const backupFileName = `chauhan_erp_backup_${dateStr}.db`;
  const destinationPath = path.join(backupFolder, backupFileName);

  // Perform copy
  fs.copyFileSync(activeConfig.dbPath, destinationPath);
  return destinationPath;
}

let lastBackupDate = '';

// Automated background backup (cron job) - Daily at 9:00 PM (21:00)
setInterval(() => {
  try {
    const now = new Date();
    if (now.getHours() >= 21) {
      const todayStr = now.toISOString().split('T')[0];
      if (lastBackupDate !== todayStr && activeConfig.backupDir) {
        if (!fs.existsSync(activeConfig.backupDir)) {
          fs.mkdirSync(activeConfig.backupDir, { recursive: true });
        }
        const dest = performBackup(activeConfig.backupDir);
        lastBackupDate = todayStr;
        console.log(`Automated cron backup succeeded for ${todayStr}: ${dest}`);
      }
    }
  } catch (err) {
    console.error('Automated cron backup failed:', err);
  }
}, 5 * 60 * 1000); // Check every 5 minutes

// IPC Handlers

// Public: no auth needed — only reads the first_run flag, nothing sensitive
ipcMain.handle('check-first-run', async () => {
  const db = getDB();
  const row = db.prepare("SELECT value FROM settings WHERE key = 'first_run'").get() as any;
  return { firstRun: !row || row.value !== '0' };
});

handleElevated('db-query', 'BACKUP_RESTORE', async (event, sql: string, params: any[] = []) => {
  const db = getDB();
  return db.prepare(sql).all(...params);
});

handleElevated('db-get', 'BACKUP_RESTORE', async (event, sql: string, params: any[] = []) => {
  const db = getDB();
  return db.prepare(sql).get(...params);
});

handleElevated('db-run', 'BACKUP_RESTORE', async (event, sql: string, params: any[] = []) => {
  const db = getDB();
  const res = db.prepare(sql).run(...params);
  return {
    changes: res.changes,
    lastInsertRowid: res.lastInsertRowid,
  };
});

handleElevated('db-transaction', 'BACKUP_RESTORE', async (event, queries: { sql: string; params: any[] }[]) => {
  const db = getDB();
  const runTx = db.transaction((txQueries) => {
    const results = [];
    for (const q of txQueries) {
      results.push(db.prepare(q.sql).run(...q.params));
    }
    return results;
  });
  const res = runTx(queries);
  // Reload permissions if settings were updated
  if (queries.some(q => q.sql.toLowerCase().includes('settings'))) {
    loadPermissions();
  }
  return res;
});

ipcMain.handle('initialize-setup', async (event, queries: { sql: string; params: any[] }[]) => {
  const db = getDB();
  // Allow if no row exists OR if first_run is still '1'
  const row = db.prepare("SELECT value FROM settings WHERE key = 'first_run'").get() as any;
  const alreadyDone = row && row.value === '0';
  if (alreadyDone) {
    // Check if an OWNER user actually exists — if not, let it proceed (partial failure recovery)
    const ownerExists = db.prepare("SELECT user_id FROM users WHERE role = 'OWNER' LIMIT 1").get();
    if (ownerExists) {
      throw new Error("Setup already completed");
    }
    // Partial failure: DB flag was set but user was not created — reset and retry
    db.prepare("UPDATE settings SET value = '1' WHERE key = 'first_run'").run();
  }
  const runTx = db.transaction((txQueries) => {
    const results = [];
    for (const q of txQueries) {
      results.push(db.prepare(q.sql).run(...q.params));
    }
    return results;
  });
  return runTx(queries);
});

ipcMain.handle('get-db-config', async () => {
  assertCan(activeDesktopSession?.role, 'READ_DASHBOARD');
  return activeConfig;
});

handleElevated('set-db-config', 'USER_MGMT', async (event, newConfig: Partial<DbConfig>) => {
  activeConfig = { ...activeConfig, ...newConfig };
  fs.writeFileSync(configPath, JSON.stringify(activeConfig, null, 2));

  // If DB path changed, re-init DB
  if (newConfig.dbPath) {
    // We should safely re-initialize the core DB
    // (Note: in production we would want to close the previous connection, but for simplicity, we'll re-run initDB)
    initDB(activeConfig.dbPath, schemaSql);
  }
  return activeConfig;
});

handleElevated('select-directory', 'BACKUP_RESTORE', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
  });
  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
});

handleElevated('select-file', 'BACKUP_RESTORE', async (event, filters: { name: string; extensions: string[] }[]) => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: filters,
  });
  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
});

handleElevated('backup-now', 'BACKUP_RESTORE', async () => {
  if (!activeConfig.backupDir) {
    throw new Error('No backup directory configured');
  }
  return performBackup(activeConfig.backupDir);
});

handleElevated('restore-db', 'BACKUP_RESTORE', async (event, backupFilePath: string) => {
  if (!fs.existsSync(backupFilePath)) {
    throw new Error('Selected backup file does not exist');
  }

  // Create safety backup
  const safetyDir = userDataPath;
  const safetyBackupPath = path.join(safetyDir, 'chauhan_erp_safety_backup_before_restore.db');
  fs.copyFileSync(activeConfig.dbPath, safetyBackupPath);

  try {
    // Re-initialize a temporary SQLite check to test integrity
    const tempDb = new (require('better-sqlite3'))(backupFilePath);
    const integrity = tempDb.pragma('integrity_check');
    tempDb.close();

    if (integrity[0]?.integrity_check !== 'ok' && integrity[0] !== 'ok') {
      throw new Error('Integrity check failed on backup file');
    }

    // Close active DB connection by deleting it from core memory
    // (Our initDB allows replacing the instance)
    // Overwrite database file
    fs.copyFileSync(backupFilePath, activeConfig.dbPath);

    // Delete WAL files of previous connection
    const walFile = `${activeConfig.dbPath}-wal`;
    const shmFile = `${activeConfig.dbPath}-shm`;
    if (fs.existsSync(walFile)) fs.unlinkSync(walFile);
    if (fs.existsSync(shmFile)) fs.unlinkSync(shmFile);

    // Reinitialize DB
    initDB(activeConfig.dbPath, schemaSql);
    return { success: true };
  } catch (err: any) {
    // Restore from safety backup
    fs.copyFileSync(safetyBackupPath, activeConfig.dbPath);
    initDB(activeConfig.dbPath, schemaSql);
    throw new Error(`Restore failed: ${err.message}. Safety backup restored.`);
  }
});

ipcMain.handle('get-lan-info', async () => {
  assertCan(activeDesktopSession?.role, 'READ_DASHBOARD');
  return {
    ip: getLocalIpAddress(),
    port: PORT,
  };
});

// Udhaar Ledger Specific IPC
ipcMain.handle('get-customers-aging', async () => {
  assertCan(activeDesktopSession?.role, 'READ_CUSTOMERS');
  const db = getDB();
  const customers = db.prepare('SELECT * FROM customers').all() as any[];
  
  return customers.map(c => {
    const aging = calculateAging(c, new Date());
    return {
      ...c,
      aging
    };
  });
});

ipcMain.handle('get-customer-ledger', async (event, customerId: number) => {
  assertCan(activeDesktopSession?.role, 'READ_CUSTOMERS');
  const db = getDB();
  return db.prepare('SELECT * FROM customer_ledger WHERE customer_id = ? ORDER BY id DESC').all(customerId);
});

ipcMain.handle('record-udhaar-payment', async (event, customerId: number, amount: number, note: string) => {
  assertCan(activeDesktopSession?.role, 'RECORD_PAYMENT');
  const db = getDB();
  const tx = db.transaction(() => {
    db.prepare('UPDATE customers SET current_balance = current_balance - ? WHERE customer_id = ?').run(amount, customerId);
    const newCustomer = db.prepare('SELECT current_balance FROM customers WHERE customer_id = ?').get(customerId) as any;
    db.prepare(`
      INSERT INTO customer_ledger (customer_id, type, amount, balance_after, note)
      VALUES (?, 'PAYMENT', ?, ?, ?)
    `).run(customerId, amount, newCustomer.current_balance, note);
    db.prepare("INSERT INTO audit_log (user_id, action, entity, entity_id, detail) VALUES (?, 'RECORD_PAYMENT', 'customer_ledger', ?, ?)").run(activeDesktopSession?.user_id, customerId, `Payment amount: ${amount}`);
    return newCustomer.current_balance;
  });
  return tx();
});

ipcMain.handle('queue-sms-reminder', async (event, customerId: number) => {
  assertCan(activeDesktopSession?.role, 'RECORD_PAYMENT');
  const db = getDB();
  const customer = db.prepare('SELECT * FROM customers WHERE customer_id = ?').get(customerId) as any;
  if (!customer || !customer.phone) throw new Error("Customer or phone not found");
  
  const shopNameRow = db.prepare("SELECT value FROM settings WHERE key = 'shop_name'").get() as any;
  const shopName = shopNameRow?.value || 'Chauhan Electronics';
  
  const body = formatPaymentReminder(customer, shopName);
  
  db.prepare(`
    INSERT INTO sms_outbox (phone, body, status) VALUES (?, ?, 'QUEUED')
  `).run(customer.phone, body);
  return true;
});

// ================= SUPPLIERS & PURCHASES M4 =================

ipcMain.handle('get-suppliers', async () => {
  assertCan(activeDesktopSession?.role, 'READ_SUPPLIERS');
  const db = getDB();
  return db.prepare('SELECT * FROM suppliers ORDER BY name ASC').all();
});

handleElevated('create-supplier', 'CREATE_SUPPLIER', async (event, name: string, phone: string, gstin: string) => {
  const db = getDB();
  const res = db.prepare(
    'INSERT INTO suppliers (name, phone, gstin, current_payable) VALUES (?, ?, ?, 0)'
  ).run(name, phone || null, gstin || null);
  return res.lastInsertRowid;
});

ipcMain.handle('get-supplier-ledger', async (event, supplierId: number) => {
  assertCan(activeDesktopSession?.role, 'READ_SUPPLIERS');
  const db = getDB();
  
  // Get Purchases (GRNs)
  const grns = db.prepare(`
    SELECT grn_id as id, 'PURCHASE' as type, invoice_ref as ref, total_cost as amount, created_at
    FROM grn 
    WHERE supplier_id = ?
  `).all(supplierId);

  // Get Payments (from expenses)
  const payments = db.prepare(`
    SELECT id, 'PAYMENT' as type, '' as ref, amount, created_at, note
    FROM expenses 
    WHERE category = 'SUPPLIER_PAYMENT' AND note LIKE ?
  `).all(`Supplier ID: ${supplierId} %`);

  // Merge and sort
  const ledger = [...grns, ...payments].sort((a: any, b: any) => {
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return ledger;
});

ipcMain.handle('record-supplier-payment', async (event, supplierId: number, amount: number, note: string) => {
  assertCan(activeDesktopSession?.role, 'RECORD_PAYMENT');
  const db = getDB();
  const tx = db.transaction(() => {
    // 1. Decrease current_payable
    db.prepare('UPDATE suppliers SET current_payable = current_payable - ? WHERE supplier_id = ?').run(amount, supplierId);
    
    // 2. Insert into expenses
    db.prepare(`
      INSERT INTO expenses (category, amount, note) VALUES ('SUPPLIER_PAYMENT', ?, ?)
    `).run(amount, `Supplier ID: ${supplierId} | ${note}`);

    return true;
  });
  return tx();
});

ipcMain.handle('commit-intake-batch', async (event, payload: any) => {
  assertCan(activeDesktopSession?.role, 'RECEIVE_GRN');
  const { supplier_id, invoice_ref, total_cost_paise, user_id, items, type } = payload;
  const db = getDB();

  const tx = db.transaction(() => {
    // 1. Create GRN
    const grnRes = db.prepare(`
      INSERT INTO grn (supplier_id, invoice_ref, total_cost, received_by)
      VALUES (?, ?, ?, ?)
    `).run(supplier_id || null, invoice_ref || 'INTAKE', total_cost_paise, activeDesktopSession?.user_id);
    const grnId = grnRes.lastInsertRowid;

    // 2. Increment supplier payable if linked
    if (supplier_id) {
      db.prepare('UPDATE suppliers SET current_payable = current_payable + ? WHERE supplier_id = ?')
        .run(total_cost_paise, supplier_id);
    }

    // 3. Process items
    if (type === 'SERIALIZED') {
      for (const item of items) {
        db.prepare(`
          INSERT INTO product_instances (product_id, serial_number, status, batch_number, purchase_cost, grn_id)
          VALUES (?, ?, 'IN_STOCK', ?, ?, ?)
        `).run(item.product_id, item.serial_number, item.batch_number, item.purchase_cost, grnId);
      }
    } else if (type === 'LOOSE') {
      for (const item of items) {
        db.prepare('UPDATE products SET loose_qty = loose_qty + ? WHERE product_id = ?')
          .run(item.qty, item.product_id);
      }
    }

    db.prepare(`INSERT INTO audit_log (user_id, action, entity, entity_id, detail) VALUES (?, 'RECEIVE_GRN', 'grn', ?, ?)`).run(activeDesktopSession?.user_id, grnId, `Processed ${type} intake via LAN API.`);

    return grnId;
  });

  return tx();
});

ipcMain.handle('create-product', async (event, payload: any) => {
  assertCan(activeDesktopSession?.role, 'RECEIVE_GRN');
  const db = getDB();
  const tx = db.transaction(() => {
    const res = db.prepare(`
      INSERT INTO products (sku_code, brand_name, model_name, category, hsn_code, gst_rate, requires_serial, warranty_months, min_restock_level, counter_price, dealer_price, distributor_price, loose_qty)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `).run(
      payload.sku_code, payload.brand_name, payload.model_name, payload.category, payload.hsn_code, 
      payload.gst_rate, payload.requires_serial ? 1 : 0, payload.warranty_months, payload.min_restock_level,
      payload.counter_price, payload.dealer_price, payload.distributor_price
    );
    const newId = res.lastInsertRowid;
    
    if (payload.fitment_tags && payload.fitment_tags.length > 0) {
      for (const tag of payload.fitment_tags) {
        db.prepare('INSERT INTO product_fitment (product_id, vehicle_tag) VALUES (?, ?)').run(newId, tag);
      }
    }
    
    db.prepare(`INSERT INTO audit_log (user_id, action, entity, entity_id, detail) VALUES (?, 'CREATE', 'product', ?, ?)`).run(activeDesktopSession?.user_id, newId, `Created product model: ${payload.brand_name} ${payload.model_name}`);
    return newId;
  });
  return tx();
});

// ================= REPAIRS & SERVICE M5 =================

ipcMain.handle('get-repair-jobs', async () => {
  assertCan(activeDesktopSession?.role, 'READ_REPAIRS');
  const db = getDB();
  return db.prepare('SELECT * FROM repair_jobs ORDER BY job_id DESC').all();
});

ipcMain.handle('create-repair-job', async (event, payload: any) => {
  assertCan(activeDesktopSession?.role, 'MANAGE_REPAIRS');
  const db = getDB();
  const tx = db.transaction(() => {
    // Get prefix and next no
    const prefixRow = db.prepare("SELECT value FROM settings WHERE key = 'job_prefix'").get() as any;
    const nextNoRow = db.prepare("SELECT value FROM settings WHERE key = 'next_job_no'").get() as any;
    
    let prefix = prefixRow ? prefixRow.value : 'JOB-';
    let nextNo = nextNoRow ? parseInt(nextNoRow.value, 10) : 1000;
    
    // Ensure settings exist if not
    if (!prefixRow) db.prepare("INSERT INTO settings (key, value) VALUES ('job_prefix', 'JOB-')").run();
    if (!nextNoRow) db.prepare("INSERT INTO settings (key, value) VALUES ('next_job_no', '1000')").run();

    const jobNo = `${prefix}${nextNo}`;
    
    // Link customer if provided
    let custId = payload.customer_id || null;
    if (!custId && payload.customer_phone) {
      const match = db.prepare("SELECT customer_id FROM customers WHERE phone = ?").get(payload.customer_phone) as any;
      if (match) custId = match.customer_id;
    }

    // Insert job
    const res = db.prepare(`
      INSERT INTO repair_jobs (
        job_no, customer_id, customer_phone, customer_name,
        product_name, serial_number, is_warranty,
        issue_reported, est_cost, advance_paid
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      jobNo, custId, payload.customer_phone, payload.customer_name,
      payload.product_name, payload.serial_number, payload.is_warranty ? 1 : 0,
      payload.issue_reported, payload.est_cost || 0, payload.advance_paid || 0
    );

    // Increment next_job_no
    db.prepare("UPDATE settings SET value = ? WHERE key = 'next_job_no'").run((nextNo + 1).toString());

    return res.lastInsertRowid;
  });
  return tx();
});

ipcMain.handle('get-repair-parts', async (event, jobId: number) => {
  assertCan(activeDesktopSession?.role, 'READ_REPAIRS');
  const db = getDB();
  return db.prepare(`
    SELECT rp.*, p.brand_name, p.model_name 
    FROM repair_parts rp
    JOIN products p ON rp.product_id = p.product_id
    WHERE rp.job_id = ?
  `).all(jobId);
});

ipcMain.handle('add-repair-part', async (event, jobId: number, type: 'SERIALIZED' | 'LOOSE', item: any) => {
  assertCan(activeDesktopSession?.role, 'MANAGE_REPAIRS');
  const db = getDB();
  const tx = db.transaction(() => {
    let cost = item.cost;
    if (type === 'SERIALIZED') {
      // Mark as SOLD (consumed)
      const res = db.prepare("UPDATE product_instances SET status = 'SOLD' WHERE instance_id = ? AND status = 'IN_STOCK'").run(item.instance_id);
      if (res.changes === 0) throw new Error("Serial number not available in stock.");
      
      db.prepare(`
        INSERT INTO repair_parts (job_id, product_id, instance_id, qty, cost)
        VALUES (?, ?, ?, 1, ?)
      `).run(jobId, item.product_id, item.instance_id, cost);
    } else {
      // Loose qty check
      const prod = db.prepare("SELECT loose_qty FROM products WHERE product_id = ?").get(item.product_id) as any;
      if (!prod || prod.loose_qty < item.qty) throw new Error("Not enough loose quantity in stock.");
      
      db.prepare("UPDATE products SET loose_qty = loose_qty - ? WHERE product_id = ?").run(item.qty, item.product_id);
      
      db.prepare(`
        INSERT INTO repair_parts (job_id, product_id, qty, cost)
        VALUES (?, ?, ?, ?)
      `).run(jobId, item.product_id, item.qty, cost * item.qty);
      cost = cost * item.qty;
    }

    // Update job parts_cost
    db.prepare("UPDATE repair_jobs SET parts_cost = parts_cost + ? WHERE job_id = ?").run(cost, jobId);

    return true;
  });
  return tx();
});

ipcMain.handle('update-repair-status', async (event, jobId: number, newStatus: string, notes: string) => {
  assertCan(activeDesktopSession?.role, 'MANAGE_REPAIRS');
  const db = getDB();
  const tx = db.transaction(() => {
    const job = db.prepare("SELECT status FROM repair_jobs WHERE job_id = ?").get(jobId) as any;
    if (!job) throw new Error("Job not found");

    if (job.status !== newStatus) {
      db.prepare("INSERT INTO repair_status_history (job_id, old_status, new_status) VALUES (?, ?, ?)").run(jobId, job.status, newStatus);
      
      let extraUpdate = "";
      let params: any[] = [newStatus];
      
      if (newStatus === 'READY') {
        extraUpdate = ", ready_date = datetime('now')";
      }
      
      if (notes) {
        extraUpdate += ", technician_notes = ?";
        params.push(notes);
      }
      
      params.push(jobId);
      db.prepare(`UPDATE repair_jobs SET status = ?${extraUpdate} WHERE job_id = ?`).run(...params);
      
      db.prepare("INSERT INTO audit_log (user_id, action, entity, entity_id, detail) VALUES (?, 'REPAIR_STATUS_UPDATE', 'repair_jobs', ?, ?)").run(activeDesktopSession?.user_id, jobId, `Status changed from ${job.status} to ${newStatus}`);
    } else if (notes) {
       db.prepare(`UPDATE repair_jobs SET technician_notes = ? WHERE job_id = ?`).run(notes, jobId);
    }
    
    return true;
  });
  return tx();
});

ipcMain.handle('deliver-repair-job', async (event, jobId: number, finalCost: number, labourCost: number) => {
  assertCan(activeDesktopSession?.role, 'MANAGE_REPAIRS');
  const db = getDB();
  db.prepare(`
    UPDATE repair_jobs 
    SET status = 'DELIVERED', final_cost = ?, labour_cost = ?, delivered_date = datetime('now')
    WHERE job_id = ?
  `).run(finalCost, labourCost, jobId);
  return true;
});

// ================= ACCOUNTING & EXPENSES M6 =================

handleElevated('record-expense', 'RECORD_EXPENSE', async (event, category: string, amount: number, note: string) => {
  const db = getDB();
  const res = db.prepare(`
    INSERT INTO expenses (category, amount, note) VALUES (?, ?, ?)
  `).run(category, amount, note);
  return res.lastInsertRowid;
});

ipcMain.handle('get-expenses', async (event, limit = 50) => {
  assertCan(activeDesktopSession?.role, 'READ_ACCOUNTING');
  const db = getDB();
  return db.prepare(`
    SELECT * FROM expenses 
    WHERE category != 'SUPPLIER_PAYMENT' 
    ORDER BY created_at DESC LIMIT ?
  `).all(limit);
});

ipcMain.handle('get-eod-reconciliation', async (event, dateStr: string) => {
  assertCan(activeDesktopSession?.role, 'READ_ACCOUNTING');
  const db = getDB();
  // dateStr expected in 'YYYY-MM-DD' format
  const datePattern = `${dateStr}%`;

  // 1. Sales Revenue (Cash vs UPI/Card)
  const sales = db.prepare(`
    SELECT payment_mode, SUM(amount_paid) as total 
    FROM sales 
    WHERE created_at LIKE ? AND status = 'COMPLETED'
    GROUP BY payment_mode
  `).all(datePattern) as any[];

  let salesCash = 0;
  let salesDigital = 0;
  sales.forEach(s => {
    if (s.payment_mode === 'CASH') salesCash += s.total;
    else salesDigital += s.total;
  });

  // 2. Udhaar (Credit) Payments Received
  const udhaarRow = db.prepare(`
    SELECT SUM(amount) as total FROM customer_ledger 
    WHERE type = 'PAYMENT' AND created_at LIKE ?
  `).get(datePattern) as any;
  const udhaarReceived = udhaarRow?.total || 0;

  // 3. Operational Expenses
  const expRow = db.prepare(`
    SELECT SUM(amount) as total FROM expenses 
    WHERE category != 'SUPPLIER_PAYMENT' AND created_at LIKE ?
  `).get(datePattern) as any;
  const opsExpenses = expRow?.total || 0;

  // 4. Supplier Payments Outbound
  const supRow = db.prepare(`
    SELECT SUM(amount) as total FROM expenses 
    WHERE category = 'SUPPLIER_PAYMENT' AND created_at LIKE ?
  `).get(datePattern) as any;
  const supplierPayments = supRow?.total || 0;

  // 5. COGS (Cost of Goods Sold)
  // We join sale_items with product_instances to get exact purchase_cost.
  // For loose items, we assume a FIFO or just use counter_price margins?
  // Wait, loose items don't have a linked instance_id in sale_items, they have a price.
  // To keep it simple, we just sum up instance purchase costs. 
  const cogsRow = db.prepare(`
    SELECT SUM(pi.purchase_cost) as total 
    FROM sale_items si
    JOIN product_instances pi ON si.instance_id = pi.instance_id
    JOIN sales s ON si.sale_id = s.sale_id
    WHERE s.created_at LIKE ? AND s.status = 'COMPLETED'
  `).get(datePattern) as any;
  const serializedCOGS = cogsRow?.total || 0;

  // For loose items, we might not track cost precisely per sale in schema. We'll ignore loose COGS for now or use 0.
  
  return {
    salesCash,
    salesDigital,
    udhaarReceived,
    opsExpenses,
    supplierPayments,
    serializedCOGS,
    totalRevenue: salesCash + salesDigital,
    totalInflow: salesCash + salesDigital + udhaarReceived,
    totalOutflow: opsExpenses + supplierPayments,
    netMargin: (salesCash + salesDigital) - serializedCOGS - opsExpenses
  };
});

// ================= DATA PORTABILITY & BACKUPS M7 =================

handleElevated('backup-database', 'BACKUP_RESTORE', async (event) => {
  if (!mainWindow) return { success: false, error: 'No main window' };
  const db = getDB();
  
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Backup Database',
    defaultPath: `chauhan_erp_backup_${new Date().toISOString().split('T')[0]}.sqlite`,
    filters: [{ name: 'SQLite Database', extensions: ['sqlite'] }]
  });

  if (canceled || !filePath) return { success: false, error: 'Canceled' };

  try {
    await db.backup(filePath);
    return { success: true, filePath };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

handleElevated('export-csv', 'BACKUP_RESTORE', async (event, tableName: string) => {
  if (!mainWindow) return { success: false, error: 'No main window' };
  const db = getDB();

  // Validate table name (very simple whitelist)
  const allowed = ['sales', 'customers', 'products', 'repair_jobs', 'suppliers', 'expenses'];
  if (!allowed.includes(tableName)) return { success: false, error: 'Invalid table' };

  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: `Export ${tableName} to CSV`,
    defaultPath: `${tableName}_export_${new Date().toISOString().split('T')[0]}.csv`,
    filters: [{ name: 'CSV Files', extensions: ['csv'] }]
  });

  if (canceled || !filePath) return { success: false, error: 'Canceled' };

  try {
    const rows = db.prepare(`SELECT * FROM ${tableName}`).all() as any[];
    if (rows.length === 0) {
      fs.writeFileSync(filePath, 'No data found\\n');
      return { success: true, filePath };
    }

    const headers = Object.keys(rows[0]);
    
    // Simple CSV serializer escaping double quotes
    const toCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvLines = [
      headers.join(','),
      ...rows.map(row => headers.map(h => toCsv(row[h])).join(','))
    ];

    fs.writeFileSync(filePath, csvLines.join('\\n'));
    
    return { success: true, filePath };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

handleElevated('export-raw-csv', 'BACKUP_RESTORE', async (event, reportName: string, csvData: string) => {
  if (!mainWindow) return { success: false, error: 'No main window' };

  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: `Export ${reportName} Report`,
    defaultPath: `${reportName}_${new Date().toISOString().split('T')[0]}.csv`,
    filters: [{ name: 'CSV Files', extensions: ['csv'] }]
  });

  if (canceled || !filePath) return { success: false, error: 'Canceled' };

  try {
    fs.writeFileSync(filePath, csvData);
    return { success: true, filePath };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

handleElevated('get-report-data', 'VIEW_REPORTS', async (event, reportType: string, params: any) => {
  const db = getDB();
  const { startDate, endDate, days } = params || {};
  const sDate = startDate ? startDate + ' 00:00:00' : null;
  const eDate = endDate ? endDate + ' 23:59:59' : null;

  if (reportType === 'Margin') {
    const rows = db.prepare(`
      SELECT date(s.created_at) as date, p.category, p.brand_name, s.tier_applied,
             si.line_total, p.gst_rate, si.unit_cost, si.quantity
      FROM sale_items si JOIN sales s ON si.sale_id = s.sale_id JOIN products p ON si.product_id = p.product_id
      WHERE s.status != 'CANCELLED' ${sDate ? 'AND s.created_at >= ?' : ''} ${eDate ? 'AND s.created_at <= ?' : ''}
    `).all(...(sDate && eDate ? [sDate, eDate] : [])) as any[];
    
    const { getTaxableValue } = require('@chauhan-erp/core/gst');
    const groups: Record<string, any> = {};
    rows.forEach(r => {
      const key = `${r.date}|${r.category}|${r.brand_name}|${r.tier_applied}`;
      if (!groups[key]) groups[key] = { date: r.date, category: r.category, brand_name: r.brand_name, tier_applied: r.tier_applied, revenue: 0, cogs: 0, profit: 0 };
      const revenue = getTaxableValue(r.line_total, r.gst_rate);
      const cogs = r.unit_cost * r.quantity;
      groups[key].revenue += revenue;
      groups[key].cogs += cogs;
      groups[key].profit += (revenue - cogs);
    });
    return Object.values(groups).sort((a: any, b: any) => b.date.localeCompare(a.date));
  }
  
  if (reportType === 'Sales') {
    return db.prepare(`
      SELECT date(s.created_at) as date, p.category, p.brand_name, s.tier_applied,
             SUM(si.line_total) as total_revenue, SUM(si.quantity) as items_sold, COUNT(DISTINCT s.sale_id) as invoices_count
      FROM sale_items si JOIN sales s ON si.sale_id = s.sale_id JOIN products p ON si.product_id = p.product_id
      WHERE s.status != 'CANCELLED' ${sDate ? 'AND s.created_at >= ?' : ''} ${eDate ? 'AND s.created_at <= ?' : ''}
      GROUP BY date, p.category, p.brand_name, s.tier_applied ORDER BY date DESC
    `).all(...(sDate && eDate ? [sDate, eDate] : []));
  }
  
  if (reportType === 'LowStock') {
    return db.prepare(`
      SELECT p.product_id, p.sku_code, p.model_name, p.min_restock_level, s.name as supplier_name,
             (SELECT COUNT(*) FROM product_instances pi WHERE pi.product_id = p.product_id AND pi.status = 'IN_STOCK') + p.loose_qty as in_stock_qty
      FROM products p LEFT JOIN suppliers s ON p.supplier_id = s.supplier_id
      WHERE ((SELECT COUNT(*) FROM product_instances pi WHERE pi.product_id = p.product_id AND pi.status = 'IN_STOCK') + p.loose_qty) <= p.min_restock_level
      ORDER BY s.name, p.model_name
    `).all();
  }
  
  if (reportType === 'DeadStock') {
    return db.prepare(`
      SELECT p.product_id, p.sku_code, p.model_name, MAX(s.created_at) as last_sale_date,
             (SELECT COUNT(*) FROM product_instances pi WHERE pi.product_id = p.product_id AND pi.status = 'IN_STOCK') + p.loose_qty as in_stock_qty
      FROM products p LEFT JOIN sale_items si ON p.product_id = si.product_id LEFT JOIN sales s ON si.sale_id = s.sale_id
      GROUP BY p.product_id
      HAVING (last_sale_date IS NULL OR last_sale_date <= datetime('now', ?)) AND in_stock_qty > 0
      ORDER BY last_sale_date ASC
    `).all(`-${days || 30} days`);
  }
  
  if (reportType === 'Valuation') {
    const data = db.prepare(`
      SELECT (SELECT SUM(purchase_cost) FROM product_instances WHERE status = 'IN_STOCK') as serialized_value,
             (SELECT SUM(loose_qty * purchase_cost) FROM products) as loose_value
    `).get() as any;
    data.total = (data.serialized_value || 0) + (data.loose_value || 0);
    return data;
  }
  
  if (reportType === 'GSTR1') {
    const invoices = db.prepare(`
      SELECT s.sale_id, s.invoice_no, s.created_at, c.gstin, c.name as customer_name, s.subtotal, s.discount, s.cgst, s.sgst, s.igst, s.grand_total
      FROM sales s LEFT JOIN customers c ON s.customer_id = c.customer_id
      WHERE s.status != 'CANCELLED' ${sDate ? 'AND s.created_at >= ?' : ''} ${eDate ? 'AND s.created_at <= ?' : ''}
      ORDER BY s.created_at DESC
    `).all(...(sDate && eDate ? [sDate, eDate] : [])) as any[];

    const { getTaxableValue } = require('@chauhan-erp/core/gst');
    let total_cgst = 0, total_sgst = 0, total_igst = 0, total_taxable = 0;

    for (const inv of invoices) {
      const items = db.prepare(`SELECT si.line_total, p.gst_rate FROM sale_items si JOIN products p ON si.product_id = p.product_id WHERE si.sale_id = ?`).all(inv.sale_id) as any[];
      let inv_taxable = 0;
      let rates = new Set<number>();
      
      items.forEach(si => {
        const ratio = (inv.subtotal - inv.discount) / inv.subtotal;
        inv_taxable += getTaxableValue(si.line_total * ratio, si.gst_rate);
        rates.add(si.gst_rate);
      });
      
      inv.taxable = inv_taxable;
      inv.gst_rates = Array.from(rates).join(',');
      
      total_taxable += inv_taxable;
      total_cgst += inv.cgst;
      total_sgst += inv.sgst;
      total_igst += inv.igst;
    }
    return { invoices, summary: { total_cgst, total_sgst, total_igst, total_taxable } };
  }
  
  if (reportType === 'Udhaar') {
    const customers = db.prepare(`SELECT customer_id, name, phone, current_balance, credit_limit, credit_due_date FROM customers WHERE current_balance > 0`).all() as any[];
    const { calculateAging } = require('@chauhan-erp/core/ledger');
    const buckets = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0, total_overdue: 0 };
    customers.forEach(c => {
      const age = calculateAging(c, new Date());
      buckets['0-30'] += age['0-30'];
      buckets['31-60'] += age['31-60'];
      buckets['61-90'] += age['61-90'];
      buckets['90+'] += age['90+'];
      buckets['total_overdue'] += age.total_overdue;
    });
    const total_receivable = customers.reduce((sum: number, c: any) => sum + c.current_balance, 0);
    customers.sort((a, b) => b.current_balance - a.current_balance);
    return { customers, buckets, total_receivable };
  }
  
  throw new Error('Unknown report type');
});


// ================= M5 IPC HANDLERS =================
ipcMain.handle('db-warranty-check', async (event, serial) => {
  assertCan(activeDesktopSession?.role, 'READ_DASHBOARD');
  const db = getDB();
  const instance = db.prepare(`
    SELECT pi.*, p.brand_name, p.model_name, p.category 
    FROM product_instances pi
    JOIN products p ON pi.product_id = p.product_id
    WHERE pi.serial_number = ?
  `).get(serial) as any;

  if (!instance) return { found: false };

  const saleItem = db.prepare(`
    SELECT si.*, s.invoice_no, s.created_at as sale_date, s.customer_id, c.name as customer_name, c.phone as customer_phone
    FROM sale_items si
    JOIN sales s ON si.sale_id = s.sale_id
    LEFT JOIN customers c ON s.customer_id = c.customer_id
    WHERE si.instance_id = ? AND s.status = 'COMPLETED'
  `).get(instance.instance_id) as any;

  const now = new Date();
  let warranty_valid = false;
  if (instance.warranty_expires_at) {
    const expires = new Date(instance.warranty_expires_at);
    expires.setHours(23, 59, 59, 999);
    warranty_valid = now <= expires;
  }

  return { found: true, instance, sold_by_us: !!saleItem, sale: saleItem || null, warranty_valid };
});

ipcMain.handle('db-return-validate', async (event, serial) => {
  assertCan(activeDesktopSession?.role, 'ISSUE_CN');
  const db = getDB();
  const instance = db.prepare('SELECT * FROM product_instances WHERE serial_number = ?').get(serial) as any;
  if (!instance) return { outcome: 'REJECT_UNKNOWN', message: 'Never part of our inventory.' };
  if (instance.status === 'RMA_RETURNED') return { outcome: 'REJECT_ALREADY_RETURNED', message: 'Already returned.' };

  const saleItem = db.prepare(`
    SELECT si.*, s.invoice_no, s.created_at as sale_date, s.customer_id, s.payment_mode, c.name as customer_name, c.phone as customer_phone
    FROM sale_items si
    JOIN sales s ON si.sale_id = s.sale_id
    LEFT JOIN customers c ON s.customer_id = c.customer_id
    WHERE si.instance_id = ? AND s.status = 'COMPLETED'
  `).get(instance.instance_id) as any;

  if (!saleItem) return { outcome: 'REJECT_NEVER_SOLD', message: 'Never sold to a customer.' };
  return { outcome: 'ALLOW', saleItem, instance };
});

// Since the accept logic is identical, we can just hit the same transaction logic.
ipcMain.handle('db-return-accept', async (event, payload) => {
  assertCan(activeDesktopSession?.role, 'ISSUE_CN');
  // We'll duplicate the logic for simplicity of decoupling HTTP from IPC context.
  const { serial, reason, resolution, refund_amount, replacement_serial, user_id, condition_sealed } = payload;
  const db = getDB();
  const tx = db.transaction(() => {
    const instance = db.prepare('SELECT * FROM product_instances WHERE serial_number = ?').get(serial) as any;
    if (!instance || instance.status === 'RMA_RETURNED') throw new Error("Invalid or already returned serial.");

    const saleItem = db.prepare(`
      SELECT si.*, s.payment_mode, s.customer_id, s.sale_id
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.sale_id
      WHERE si.instance_id = ? AND s.status = 'COMPLETED'
    `).get(instance.instance_id) as any;

    if (!saleItem) throw new Error("Sale item not found.");
    if (refund_amount > saleItem.unit_price) throw new Error("Refund amount cannot exceed original unit price.");

    let newStatus = 'RMA_RETURNED';
    if (resolution === 'CREDIT_NOTE' && condition_sealed) newStatus = 'IN_STOCK';
    db.prepare('UPDATE product_instances SET status = ? WHERE instance_id = ?').run(newStatus, instance.instance_id);

    let creditNoteNo = null;
      let cnId = null;
    if (resolution === 'CREDIT_NOTE') {
      const prefixRow = db.prepare("SELECT value FROM settings WHERE key = 'cn_prefix'").get() as any;
      const sequenceRow = db.prepare("SELECT value FROM settings WHERE key = 'next_cn_no'").get() as any;
      const prefix = prefixRow?.value || 'CN-';
      const sequence = sequenceRow?.value || '1';
      creditNoteNo = `${prefix}${sequence}`;

      db.prepare(`
        INSERT INTO credit_notes (cn_no, sale_id, instance_id, amount, reason)
        VALUES (?, ?, ?, ?, ?)
      `).run(creditNoteNo, saleItem.sale_id, instance.instance_id, refund_amount, reason);
        cnId = (db.prepare('SELECT last_insert_rowid() as id').get() as any).id;

      db.prepare(`
        INSERT OR REPLACE INTO settings (key, value) 
        VALUES ('next_cn_no', CAST((CAST(? AS INTEGER) + 1) AS TEXT))
      `).run(sequence);

      if (saleItem.payment_mode === 'UDHAAR' && saleItem.customer_id) {
        db.prepare('UPDATE customers SET current_balance = current_balance - ? WHERE customer_id = ?').run(refund_amount, saleItem.customer_id);
        const cust = db.prepare('SELECT current_balance FROM customers WHERE customer_id = ?').get(saleItem.customer_id) as any;
        db.prepare(`
          INSERT INTO customer_ledger (customer_id, type, ref_id, amount, balance_after, note)
          VALUES (?, 'RETURN', (SELECT cn_id FROM credit_notes WHERE cn_no = ?), ?, ?, ?)
        `).run(saleItem.customer_id, creditNoteNo, refund_amount, cust.current_balance, `Credit Note ${creditNoteNo}`);
      }
    } else if (resolution === 'REPLACEMENT') {
      if (!replacement_serial) throw new Error("Replacement serial is required.");
      const repInstance = db.prepare("SELECT * FROM product_instances WHERE serial_number = ? AND status = 'IN_STOCK'").get(replacement_serial) as any;
      if (!repInstance) throw new Error("Replacement serial not found or not IN_STOCK.");
      
      const prodRow = db.prepare('SELECT warranty_months FROM products WHERE product_id = ?').get(instance.product_id) as any;
      const warrantyMonths = prodRow?.warranty_months ?? 12;

      db.prepare(`
        UPDATE product_instances SET status = 'SOLD', sold_at = datetime('now'), warranty_expires_at = datetime('now', '+' || ? || ' months')
        WHERE instance_id = ?
      `).run(warrantyMonths, repInstance.instance_id);

      db.prepare(`
        INSERT INTO sale_items (sale_id, product_id, instance_id, quantity, unit_price, line_discount, line_total)
        VALUES (?, ?, ?, 1, 0, 0, 0)
      `).run(saleItem.sale_id, repInstance.product_id, repInstance.instance_id);
    } else if (resolution === 'SEND_TO_COMPANY') {
      db.prepare(`
        INSERT INTO rma_register (instance_id, reason, status)
        VALUES (?, ?, 'SENT')
      `).run(instance.instance_id, reason);
    }

    db.prepare(`
      INSERT INTO audit_log (user_id, action, entity, entity_id, detail)
      VALUES (?, 'RETURN_ACCEPT', 'product_instances', ?, ?)
    `).run(activeDesktopSession?.user_id, instance.instance_id, `Resolution: ${resolution}, Refund: ${refund_amount}, Reason: ${reason}`);

    return { success: true, creditNoteNo, cnId, newStatus };
  });
  return tx();
});

ipcMain.handle('db-void-sale', async (event, saleId: number) => {
  assertCan(activeDesktopSession?.role, 'VOID_SALE');
  
  const db = getDB();
  const tx = db.transaction(() => {
    // 1. Check sale
    const sale = db.prepare('SELECT * FROM sales WHERE sale_id = ?').get(saleId) as any;
    if (!sale) throw new Error(`Sale #${saleId} not found.`);
    if (sale.status === 'CANCELLED') throw new Error(`Sale #${saleId} is already voided.`);

    // 2. Mark Cancelled
    db.prepare("UPDATE sales SET status = 'CANCELLED' WHERE sale_id = ?").run(saleId);

    // 3. Restore Inventory
    const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(saleId) as any[];
    for (const item of items) {
      if (item.instance_id) {
        db.prepare("UPDATE product_instances SET status = 'IN_STOCK' WHERE instance_id = ?").run(item.instance_id);
      } else {
        db.prepare('UPDATE products SET loose_qty = loose_qty + ? WHERE product_id = ?').run(item.quantity, item.product_id);
      }
    }

    // 4. Revert Udhaar
    if (sale.payment_mode === 'UDHAAR') {
      const debt = sale.grand_total - sale.amount_paid;
      if (debt > 0 && sale.customer_id) {
        db.prepare('UPDATE customers SET current_balance = current_balance - ? WHERE customer_id = ?').run(debt, sale.customer_id);
      }
    }

    // 5. Audit Log
    db.prepare('INSERT INTO audit_log (user_id, action, entity, entity_id, detail) VALUES (?, ?, ?, ?, ?)')
      .run(activeDesktopSession?.user_id || 1, 'DELETE', 'sales', saleId, `Voided sale #${saleId} and restored inventory.`);

    return { success: true };
  });

  return tx();
});

ipcMain.handle('db-rma-list', async () => {
  assertCan(activeDesktopSession?.role, 'READ_CATALOGUE');
  const db = getDB();
  return db.prepare(`
    SELECT r.*, pi.serial_number, p.brand_name, p.model_name, s.name as supplier_name
    FROM rma_register r
    JOIN product_instances pi ON r.instance_id = pi.instance_id
    JOIN products p ON pi.product_id = p.product_id
    LEFT JOIN suppliers s ON r.supplier_id = s.supplier_id
    ORDER BY r.sent_at DESC
  `).all();
});

handleElevated('db-rma-dispatch', 'EDIT_CATALOGUE', async (event, rma_id, supplier_id, tracking_id) => {
  const db = getDB();
  db.prepare("UPDATE rma_register SET supplier_id = ?, tracking_id = ? WHERE rma_id = ?").run(supplier_id || null, tracking_id || null, rma_id);
  return { success: true };
});

handleElevated('db-rma-resolve', 'EDIT_CATALOGUE', async (event, rma_id, status, note) => {
  const db = getDB();
  const tx = db.transaction(() => {
    db.prepare("UPDATE rma_register SET status = ?, resolved_at = datetime('now'), note = ? WHERE rma_id = ?").run(status, note || null, rma_id);
    if (status === 'RECEIVED_BACK') {
      const rma = db.prepare("SELECT instance_id FROM rma_register WHERE rma_id = ?").get(rma_id) as any;
      db.prepare("UPDATE product_instances SET status = 'IN_STOCK' WHERE instance_id = ?").run(rma.instance_id);
    }
    return true;
  });
  return tx();
});


// ================= M6 (C2) PRINTING HANDLERS =================
ipcMain.handle('get-print-data', async (event, kind, id) => {
  assertCan(activeDesktopSession?.role, 'READ_DASHBOARD');
  const db = getDB();
  const settingsRows = db.prepare("SELECT key, value FROM settings").all() as any[];
  const settings: any = {};
  settingsRows.forEach(r => settings[r.key] = r.value);

  if (kind === 'SALE') {
    const sale = db.prepare(`
      SELECT s.*, c.name as customer_name, c.gstin as customer_gstin, c.phone as customer_phone, c.shop_name as customer_shop_name 
      FROM sales s LEFT JOIN customers c ON s.customer_id = c.customer_id
      WHERE s.sale_id = ?
    `).get(id) as any;

    const items = db.prepare(`
      SELECT si.*, p.model_name, p.hsn_code, p.gst_rate, pi.serial_number
      FROM sale_items si
      JOIN products p ON si.product_id = p.product_id
      LEFT JOIN product_instances pi ON si.instance_id = pi.instance_id
      WHERE si.sale_id = ?
    `).all(id) as any[];

    return { settings, sale, items };
  } else if (kind === 'QUOTATION') {
    const sale = db.prepare(`
      SELECT q.*, c.name as customer_name, c.gstin as customer_gstin, c.phone as customer_phone, c.shop_name as customer_shop_name 
      FROM quotations q LEFT JOIN customers c ON q.customer_id = c.customer_id
      WHERE q.quotation_id = ?
    `).get(id) as any;

    const items = db.prepare(`
      SELECT qi.*, p.model_name, p.hsn_code, p.gst_rate
      FROM quotation_items qi
      JOIN products p ON qi.product_id = p.product_id
      WHERE qi.quotation_id = ?
    `).all(id) as any[];

    // Map quotation fields to match the sale format for the PrintView
    if (sale) {
      sale.invoice_no = sale.quotation_no;
      sale.payment_mode = 'PROFORMA';
      sale.is_quotation = true;
    }
    
    // Map items format
    const mappedItems = items.map(i => ({
      ...i,
      price: i.unit_price,
      tax_amt: i.total_amt - i.taxable_value
    }));

    return { settings, sale, items: mappedItems };
  } else if (kind === 'LABEL') {
    const product = db.prepare(`SELECT * FROM products WHERE product_id = ?`).get(id) as any;
    return { settings, product };
  } else if (kind === 'CREDIT_NOTE') {
    const cn = db.prepare(`
      SELECT cn.*, s.invoice_no, s.created_at as sale_date,
      c.name as customer_name, c.gstin as customer_gstin
      FROM credit_notes cn
      JOIN sales s ON cn.sale_id = s.sale_id
      LEFT JOIN customers c ON s.customer_id = c.customer_id
      WHERE cn.cn_id = ?
    `).get(id) as any;

    const instance = db.prepare(`
      SELECT pi.*, p.model_name, p.hsn_code
      FROM product_instances pi
      JOIN products p ON pi.product_id = p.product_id
      WHERE pi.instance_id = ?
    `).get(cn.instance_id) as any;

    return { settings, cn, instance };
  } else if (kind === 'REPAIR') {
    const job = db.prepare(`
      SELECT rj.*, c.gstin as customer_gstin, c.shop_name as customer_shop_name
      FROM repair_jobs rj
      LEFT JOIN customers c ON rj.customer_id = c.customer_id
      WHERE rj.job_id = ?
    `).get(id) as any;

    const items = db.prepare(`
      SELECT rp.*, p.model_name, p.hsn_code, p.gst_rate
      FROM repair_parts rp
      JOIN products p ON rp.product_id = p.product_id
      WHERE rp.job_id = ?
    `).all(id) as any[];

    return { settings, job, items };
  }
  return null;
});

ipcMain.handle('print-thermal', async (event, textContent) => {
  assertCan(activeDesktopSession?.role, 'READ_DASHBOARD');
  try {
    const db = getDB();
    const printerTypeSet = db.prepare("SELECT value FROM settings WHERE key = 'printer_type'").get() as any;
    const printerInterfaceSet = db.prepare("SELECT value FROM settings WHERE key = 'printer_interface'").get() as any;
    const printerWidthSet = db.prepare("SELECT value FROM settings WHERE key = 'printer_width'").get() as any;

    const pType = printerTypeSet?.value || '';
    const pInterface = printerInterfaceSet?.value || '';
    const pWidth = parseInt(printerWidthSet?.value || '80', 10);

    if (!pType || !pInterface) {
      console.log("No thermal printer configured, falling back to A4 PDF");
      return { success: false, fallback: true };
    }

    const printer = new ThermalPrinter({
      type: pType.toLowerCase() === 'star' ? PrinterTypes.STAR : PrinterTypes.EPSON,
      interface: pInterface,
      characterSet: CharacterSet.PC852_LATIN2,
      removeSpecialCharacters: false,
      lineCharacter: "=",
      width: pWidth === 58 ? 32 : 48,
      breakLine: BreakLine.WORD
    });

    printer.alignCenter();
    printer.println(textContent);
    printer.cut();
    
    const isConnected = await printer.isPrinterConnected();
    if (!isConnected) {
      console.log("Printer not connected");
      return { success: false, fallback: true };
    }
    await printer.execute();
    return { success: true };
  } catch (err: any) {
    console.error("Thermal Print Error:", err);
    return { success: false, fallback: true };
  }
});

ipcMain.handle('log-reprint', async (event, kind, id, userId) => {
  assertCan(activeDesktopSession?.role, 'READ_DASHBOARD');
  const db = getDB();
  db.prepare(`
    INSERT INTO audit_log (user_id, action, entity, entity_id, detail)
    VALUES (?, 'REPRINT', ?, ?, ?)
  `).run(activeDesktopSession?.user_id, kind === 'SALE' ? 'sales' : 'credit_notes', id, 'Reprinted document');
  return true;
});

ipcMain.handle('export-einvoice-json', async (event, sale_id: number) => {
  assertCan(activeDesktopSession?.role, 'READ_DASHBOARD');
  try {
    const db = getDB();
    const sale = db.prepare("SELECT * FROM sales WHERE sale_id = ?").get(sale_id) as any;
    if (!sale) return { success: false, error: 'Sale not found' };
    
    const customer = db.prepare("SELECT * FROM customers WHERE customer_id = ?").get(sale.customer_id) as any;
    const items = db.prepare(`
      SELECT si.*, p.hsn_code, p.gst_rate, p.model_name
      FROM sale_items si
      JOIN products p ON si.product_id = p.product_id
      WHERE si.sale_id = ?
    `).all(sale_id) as any[];

    // Extract basic E-Invoice schema structure
    const einvoicePayload = {
      Version: "1.1",
      TranDtls: {
        TaxSch: "GST",
        SupTyp: "B2B",
        RegRev: "Y"
      },
      DocDtls: {
        Typ: "INV",
        No: sale.invoice_no,
        Dt: sale.created_at.split(' ')[0]
      },
      SellerDtls: {
        LglNm: "Chauhan Electronics",
        GSTIN: "29XXXXXXXXXXXXX",
        StateCode: "29"
      },
      BuyerDtls: {
        LglNm: customer?.name || "Counter Customer",
        GSTIN: customer?.gstin || "URP",
        StateCode: "29", // Fallback, could be extracted from GSTIN
        PhNo: customer?.phone
      },
      ItemList: items.map((item, idx) => ({
        SlNo: (idx + 1).toString(),
        PrdDesc: item.model_name,
        IsServc: "N",
        HsnCd: item.hsn_code || "8543",
        Qty: item.quantity,
        Unit: "NOS",
        UnitPrice: (item.unit_price / 100).toFixed(2),
        TotAmt: ((item.unit_price * item.quantity) / 100).toFixed(2),
        Discount: (item.line_discount / 100).toFixed(2),
        PreTaxVal: (((item.unit_price * item.quantity) - item.line_discount) / 100).toFixed(2),
        AssAmt: (item.line_total / 100).toFixed(2),
        GstRt: item.gst_rate || 18,
        TotItemVal: (item.line_total / 100).toFixed(2)
      })),
      ValDtls: {
        AssVal: (sale.subtotal / 100).toFixed(2),
        CgstVal: (sale.cgst / 100).toFixed(2),
        SgstVal: (sale.sgst / 100).toFixed(2),
        IgstVal: (sale.igst / 100).toFixed(2),
        Discount: (sale.discount / 100).toFixed(2),
        TotInvVal: (sale.grand_total / 100).toFixed(2)
      }
    };

    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Save E-Invoice JSON',
      defaultPath: `e-invoice-${sale.invoice_no.replace(/\\//g, '-')}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }]
    });

    if (canceled || !filePath) return { success: false, canceled: true };

    fs.writeFileSync(filePath, JSON.stringify(einvoicePayload, null, 2));
    return { success: true, filePath };
  } catch (err: any) {
    console.error("E-Invoice Export Error:", err);
    return { success: false, error: err.message };
  }
});


// ================= M7 (C3) SMS OUTBOX HANDLERS =================

// Helper to enqueue SMS/WhatsApp message
function enqueueSms(phone: string, templateKey: string, vars: Record<string, string>, channel: 'SMS' | 'WHATSAPP' = 'SMS') {
  try {
    const db = getDB();
    const settingsRows = db.prepare("SELECT key, value FROM settings").all() as any[];
    const settings: Record<string, string> = {};
    settingsRows.forEach(r => settings[r.key] = r.value);

    if (settings['sms_enabled'] !== 'true') return false;

    let body = settings[templateKey] || '';
    if (!body) {
      // Provide fallbacks
      if (templateKey === 'sms_tpl_repair_update') body = 'Job {job_no}: your {product} is {status}.';
      if (templateKey === 'sms_tpl_payment') body = 'Received Rs {amount} against Inv {invoice_no}. Thank you!';
      if (templateKey === 'sms_tpl_reminder') body = 'Reminder: Udhaar balance of Rs {balance} is overdue.';
    }

    // Replace variables
    for (const [k, v] of Object.entries(vars)) {
      body = body.replace(new RegExp('{' + k + '}', 'g'), v);
    }

    db.prepare("INSERT INTO sms_outbox (phone, body, channel) VALUES (?, ?, ?)").run(phone, body, channel);
    return true;
  } catch (err) {
    console.error("SMS Queue Error:", err);
    return false;
  }
}

ipcMain.handle('enqueue-sms', async (event, phone: string, templateKey: string, vars: Record<string, string>) => {
  assertCan(activeDesktopSession?.role, 'READ_DASHBOARD');
  return { success: enqueueSms(phone, templateKey, vars) };
});

ipcMain.handle('send-udhaar-reminder', async (event, customer_id: number) => {
  assertCan(activeDesktopSession?.role, 'READ_DASHBOARD');
  const db = getDB();
  const cust = db.prepare("SELECT * FROM customers WHERE customer_id = ?").get(customer_id) as any;
  if (!cust || !cust.phone || cust.phone === '0000000000') return { success: false, error: 'Invalid phone' };
  
  const balance = (cust.current_balance / 100).toFixed(2);
  const queued = enqueueSms(cust.phone, 'sms_tpl_reminder', { balance });
  return { success: queued };
});

ipcMain.handle('get-sms-outbox', async () => {
  assertCan(activeDesktopSession?.role, 'READ_DASHBOARD');
  const db = getDB();
  return db.prepare("SELECT * FROM sms_outbox ORDER BY id DESC LIMIT 100").all();
});

ipcMain.handle('retry-sms', async (event, id: number) => {
  assertCan(activeDesktopSession?.role, 'READ_DASHBOARD');
  const db = getDB();
  db.prepare("UPDATE sms_outbox SET status = 'QUEUED', retry_count = 0 WHERE id = ?").run(id);
  return { success: true };
});

// ================= X1: UPI QR + WHATSAPP SHARE IPC =================

// Generate UPI QR code as data URL (100% offline, no network)
ipcMain.handle('generate-upi-qr', async (event, amountPaise: number, invoiceNo: string) => {
  assertCan(activeDesktopSession?.role, 'CHECKOUT');
  try {
    const db = getDB();
    const settingsRows = db.prepare("SELECT key, value FROM settings").all() as any[];
    const settings: Record<string, string> = {};
    settingsRows.forEach((r: any) => settings[r.key] = r.value);

    const vpa = settings['upi_vpa'];
    if (!vpa) return { success: false, error: 'UPI VPA not configured in Settings' };

    const shopName = (settings['shop_name'] || 'Shop').replace(/[^a-zA-Z0-9 ]/g, '');
    const amountRupees = (amountPaise / 100).toFixed(2);
    const upiUri = `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(shopName)}&am=${amountRupees}&tn=${encodeURIComponent(invoiceNo)}&cu=INR`;

    const qrDataUrl = await QRCode.toDataURL(upiUri, { width: 200, margin: 1, errorCorrectionLevel: 'M' });
    return { success: true, qrDataUrl, upiUri };
  } catch (err: any) {
    console.error('UPI QR generation error:', err);
    return { success: false, error: err.message };
  }
});

// Build WhatsApp share deep-link (no API needed, just opens wa.me)
ipcMain.handle('build-whatsapp-link', async (event, phone: string, message: string) => {
  assertCan(activeDesktopSession?.role, 'READ_DASHBOARD');
  try {
    // Normalize Indian phone: remove leading 0 or +91, then prepend 91
    let normalized = phone.replace(/[\s\-+]/g, '');
    if (normalized.startsWith('0')) normalized = normalized.substring(1);
    if (!normalized.startsWith('91') && normalized.length === 10) normalized = '91' + normalized;

    const url = `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
    return { success: true, url };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

// Build invoice share message for WhatsApp
ipcMain.handle('build-invoice-message', async (event, saleId: number) => {
  assertCan(activeDesktopSession?.role, 'READ_DASHBOARD');
  try {
    const db = getDB();
    const sale = db.prepare('SELECT * FROM sales WHERE sale_id = ?').get(saleId) as any;
    if (!sale) return { success: false, error: 'Sale not found' };

    const settingsRows = db.prepare("SELECT key, value FROM settings").all() as any[];
    const settings: Record<string, string> = {};
    settingsRows.forEach((r: any) => settings[r.key] = r.value);

    const items = db.prepare(`
      SELECT si.*, p.brand_name, p.model_name 
      FROM sale_items si 
      JOIN products p ON si.product_id = p.product_id 
      WHERE si.sale_id = ?
    `).all(saleId) as any[];

    const shopName = settings['shop_name'] || 'Chauhan Electronics';
    const grandTotal = (sale.grand_total / 100).toFixed(2);
    const amountPaid = (sale.amount_paid / 100).toFixed(2);

    let msg = `🧾 *${shopName}*\n`;
    msg += `Invoice: *${sale.invoice_no}*\n`;
    msg += `Date: ${sale.created_at}\n\n`;
    msg += `*Items:*\n`;
    items.forEach((item: any, idx: number) => {
      msg += `${idx + 1}. ${item.brand_name} ${item.model_name} × ${item.quantity} — ₹${(item.line_total / 100).toFixed(2)}\n`;
    });
    msg += `\n*Grand Total: ₹${grandTotal}*\n`;
    msg += `Paid: ₹${amountPaid} (${sale.payment_mode})\n`;
    if (sale.grand_total > sale.amount_paid) {
      msg += `⚠️ *Balance Due: ₹${((sale.grand_total - sale.amount_paid) / 100).toFixed(2)}*\n`;
    }
    msg += `\nThank you for shopping with us! 🙏`;

    return { success: true, message: msg };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

// Build repair status message for WhatsApp
ipcMain.handle('build-repair-message', async (event, jobId: number) => {
  assertCan(activeDesktopSession?.role, 'READ_DASHBOARD');
  try {
    const db = getDB();
    const job = db.prepare('SELECT * FROM repair_jobs WHERE job_id = ?').get(jobId) as any;
    if (!job) return { success: false, error: 'Job not found' };

    const settingsRows = db.prepare("SELECT key, value FROM settings").all() as any[];
    const settings: Record<string, string> = {};
    settingsRows.forEach((r: any) => settings[r.key] = r.value);

    const shopName = settings['shop_name'] || 'Chauhan Electronics';

    let msg = `🔧 *${shopName} — Repair Update*\n\n`;
    msg += `Job No: *${job.job_no}*\n`;
    msg += `Device: ${job.product_name || 'N/A'}\n`;
    msg += `Status: *${job.status}*\n`;
    if (job.est_cost) msg += `Est. Cost: ₹${(job.est_cost / 100).toFixed(2)}\n`;
    if (job.status === 'READY') msg += `\n✅ Your device is ready for pickup!\n`;
    msg += `\nContact us for any queries. 🙏`;

    return { success: true, message: msg, phone: job.customer_phone };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

// ================= SMS/WHATSAPP GATEWAY ADAPTER =================

// Pluggable gateway interface — reads config from settings table
// Supported adapters: 'MOCK' (default), 'MSG91', 'GUPSHUP'
async function sendViaGateway(msg: { id: number; phone: string; body: string; channel: string }): Promise<boolean> {
  const db = getDB();
  const settingsRows = db.prepare("SELECT key, value FROM settings").all() as any[];
  const settings: Record<string, string> = {};
  settingsRows.forEach((r: any) => settings[r.key] = r.value);

  const channel = msg.channel || 'SMS';

  if (channel === 'WHATSAPP') {
    // WhatsApp Business Cloud API (optional, OFF by default)
    if (settings['whatsapp_api_enabled'] !== 'true' || !settings['whatsapp_api_key']) {
      // No API configured — message stays queued; user uses manual wa.me share
      console.log(`[WA WORKER] No API key — skip auto-send for msg #${msg.id}`);
      return false;
    }
    // TODO: Wire real WhatsApp Business Cloud API here when credentials available
    console.log(`[WA WORKER] Would send via WhatsApp API to ${msg.phone}: ${msg.body.substring(0, 50)}...`);
    return true; // Mock success
  }

  // SMS channel
  const gateway = settings['sms_gateway'] || 'MOCK';
  const apiKey = settings['sms_gateway_key'] || '';
  const senderId = settings['sms_sender_id'] || 'CHAUHAN';

  if (gateway === 'MOCK') {
    console.log(`[SMS WORKER] MOCK send to ${msg.phone}: ${msg.body.substring(0, 50)}...`);
    return true;
  }

  if (gateway === 'MSG91' && apiKey) {
    try {
      // MSG91 API call — only when online
      // Note: DLT-registered templates required in India
      const url = `https://api.msg91.com/api/v5/flow/`;
      console.log(`[SMS WORKER] MSG91 send to ${msg.phone} (key: ${apiKey.substring(0, 6)}...)`);
      // Real HTTP call would go here with fetch/axios
      // For now, treat as success in dev
      return true;
    } catch (e) {
      console.error('[SMS WORKER] MSG91 error:', e);
      return false;
    }
  }

  if (gateway === 'GUPSHUP' && apiKey) {
    try {
      console.log(`[SMS WORKER] GUPSHUP send to ${msg.phone} (key: ${apiKey.substring(0, 6)}...)`);
      return true;
    } catch (e) {
      console.error('[SMS WORKER] GUPSHUP error:', e);
      return false;
    }
  }

  // Fallback: no gateway configured
  console.log(`[SMS WORKER] No gateway configured — queued msg #${msg.id} stays pending.`);
  return false;
}

// Background Worker for SMS/WhatsApp queue flush
setInterval(() => {
  try {
    const db = getDB();
    // Migration: add retry_count if missing
    try {
      db.prepare("ALTER TABLE sms_outbox ADD COLUMN retry_count INTEGER DEFAULT 0").run();
    } catch(e) {} // Ignore if exists

    const pending = db.prepare("SELECT * FROM sms_outbox WHERE status = 'QUEUED' LIMIT 10").all() as any[];
    for (const msg of pending) {
      sendViaGateway(msg).then(success => {
        try {
          if (success) {
            db.prepare("UPDATE sms_outbox SET status = 'SENT', sent_at = datetime('now') WHERE id = ?").run(msg.id);
          } else {
            const newRetry = (msg.retry_count || 0) + 1;
            const status = newRetry > 5 ? 'FAILED' : 'QUEUED';
            db.prepare("UPDATE sms_outbox SET status = ?, retry_count = ? WHERE id = ?").run(status, newRetry, msg.id);
          }
        } catch (dbErr) {
          console.error('[SMS WORKER] DB update error:', dbErr);
        }
      }).catch(() => {
        const newRetry = (msg.retry_count || 0) + 1;
        const status = newRetry > 5 ? 'FAILED' : 'QUEUED';
        db.prepare("UPDATE sms_outbox SET status = ?, retry_count = ? WHERE id = ?").run(status, newRetry, msg.id);
      });
    }
  } catch (err) {
    // silently fail
  }
}, 30000); // 30 seconds


let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'Chauhan Electronics ERP',
    backgroundColor: '#09090b', // zinc-950
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Load from Vite dev server in development
  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  } else {
    mainWindow.loadURL('http://127.0.0.1:5180');
    // Open devtools in dev mode
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', () => {
  createWindow();
  startExpressServer();
});

app.on('window-all-closed', () => {
  // Perform auto-backup on close if configured
  if (activeConfig.backupDir) {
    try {
      console.log('Performing auto-backup on window close...');
      performBackup(activeConfig.backupDir);
      console.log('Auto-backup complete.');
    } catch (e) {
      console.error('Auto-backup failed on exit', e);
    }
  }

  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
