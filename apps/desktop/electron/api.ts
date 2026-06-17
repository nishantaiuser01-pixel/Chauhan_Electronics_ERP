import express from 'express';
import cors from 'cors';
import os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { authorize, Role } from '../../../packages/core';

export function createApiServer(options: {
  getDB: () => any;
  sessionStore: Map<string, any>;
  isPackaged: boolean;
  mainWindow?: any;
  activeConfig?: any;
  configPath?: string;
  initDB?: (path: string, schema: string) => void;
  schemaSql?: string;
}) {
  const { getDB, sessionStore, isPackaged, mainWindow, activeConfig, configPath, initDB, schemaSql } = options;
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Authentication middleware
  function authMiddleware(req: any, res: any, next: any) {
    const openPaths = ['/api/ping', '/api/health', '/api/auth/login'];
    if (openPaths.includes(req.path)) return next();
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Missing or invalid Authorization header' });
    }
    const token = authHeader.substring('Bearer '.length).trim();
    const session = sessionStore.get(token);
    if (!session) {
      return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }
    req.session = session;
    next();
  }

  function requireRole(action: any) {
    return (req: any, res: any, next: any) => {
      const role = req.session?.role;
      if (!authorize(role, action)) {
        return res.status(403).json({ success: false, error: `Forbidden: Role ${role} cannot perform ${action}` });
      }
      next();
    };
  }

  app.use(authMiddleware);

  app.get('/api/ping', (req, res) => {
    res.json({ status: 'ok', server: 'Chauhan ERP Desktop' });
  });

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', shopName: 'Chauhan Electronics', online: true });
  });

  app.post('/api/auth/login', (req, res) => {
    const { pin } = req.body;
    try {
      const db = getDB();
      const users = db.prepare('SELECT * FROM users WHERE active = 1').all() as any[];
      const bcrypt = require('bcryptjs');
      const crypto = require('crypto');
      const matchedUser = users.find((u: any) => bcrypt.compareSync(pin, u.pin_hash));
      if (matchedUser) {
        const token = crypto.randomBytes(32).toString('hex');
        sessionStore.set(token, { user_id: matchedUser.user_id, role: matchedUser.role, issuedAt: Date.now() });
        res.json({
          success: true,
          token,
          user: {
            user_id: matchedUser.user_id,
            name: matchedUser.name,
            role: matchedUser.role
          }
        });
      } else {
        res.status(401).json({ success: false, error: 'Invalid PIN' });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/products/:sku', requireRole('READ_CATALOGUE'), (req: any, res: any) => {
    try {
      const db = getDB();
      const sku = req.params.sku;
      const product = db.prepare('SELECT * FROM products WHERE sku_code = ?').get(sku) as any;
      if (product) {
        let stock = 0;
        if (product.requires_serial) {
          const row = db.prepare("SELECT COUNT(*) as count FROM product_instances WHERE product_id = ? AND status = 'IN_STOCK'").get(product.product_id) as any;
          stock = row.count;
        } else {
          stock = product.loose_qty || 0;
        }
        res.json({ success: true, product, stock });
      } else {
        res.status(404).json({ success: false, error: 'Product not found' });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/cart/push', requireRole('CHECKOUT'), (req: any, res: any) => {
    try {
      const { cart } = req.body;
      if (!cart || !Array.isArray(cart)) {
        return res.status(400).json({ success: false, error: 'Invalid cart payload' });
      }
      if (mainWindow) {
        mainWindow.webContents.send('mobile-cart-received', cart);
        res.json({ success: true, message: 'Cart beamed to Desktop POS' });
      } else {
        res.status(500).json({ success: false, error: 'Desktop UI not active' });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/products/lookup/:sku', requireRole('READ_CATALOGUE'), (req: any, res: any) => {
    const { sku } = req.params;
    try {
      const db = getDB();
      const product = db.prepare('SELECT * FROM products WHERE sku_code = ?').get(sku) as any;
      if (product) {
        const tags = db.prepare('SELECT vehicle_tag FROM product_fitment WHERE product_id = ?')
          .all(product.product_id)
          .map((row: any) => row.vehicle_tag);
        res.json({ found: true, product: { ...product, fitment_tags: tags } });
      } else {
        res.json({ found: false });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/customers/lookup/:phone', requireRole('READ_CUSTOMERS'), (req: any, res: any) => {
    const { phone } = req.params;
    try {
      const db = getDB();
      const customer = db.prepare('SELECT * FROM customers WHERE phone = ?').get(phone) as any;
      if (customer) {
        res.json({ found: true, customer });
      } else {
        res.json({ found: false });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/customers', requireRole('READ_CUSTOMERS'), (req: any, res: any) => {
    const { name, phone, shop_name, tier, gstin, credit_limit } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ success: false, error: 'Name and Phone are required.' });
    }
    try {
      const db = getDB();
      const result = db.prepare(
        `INSERT INTO customers (name, phone, shop_name, tier, gstin, credit_limit, current_balance)
         VALUES (?, ?, ?, ?, ?, ?, 0)`
      ).run(name, phone, shop_name || null, tier || 'COUNTER', gstin || null, credit_limit || 0);

      const newCustomer = db.prepare('SELECT * FROM customers WHERE customer_id = ?').get(result.lastInsertRowid);
      res.json({ success: true, customer: newCustomer });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/customers/:id/ledger', requireRole('READ_CUSTOMERS'), (req: any, res: any) => {
    const customerId = req.params.id;
    try {
      const db = getDB();
      const customer = db.prepare('SELECT * FROM customers WHERE customer_id = ?').get(customerId);
      if (!customer) {
        return res.status(404).json({ success: false, error: 'Customer not found' });
      }
      const ledger = db.prepare('SELECT * FROM customer_ledger WHERE customer_id = ? ORDER BY created_at DESC').all(customerId);
      res.json({ success: true, customer, ledger });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/customers/:id/payment', requireRole('RECORD_PAYMENT'), (req: any, res: any) => {
    const customerId = req.params.id;
    const { amount, note } = req.body;
    const userId = req.session.user_id;
    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Valid payment amount required' });
    }
    try {
      const db = getDB();
      const tx = db.transaction(() => {
        db.prepare(`UPDATE customers SET current_balance = current_balance - ? WHERE customer_id = ?`).run(amount, customerId);
        const newCustomer = db.prepare('SELECT current_balance FROM customers WHERE customer_id = ?').get(customerId) as any;
        db.prepare(
          `INSERT INTO customer_ledger (customer_id, type, amount, balance_after, note)
           VALUES (?, 'PAYMENT', ?, ?, ?)`
        ).run(customerId, amount, newCustomer.current_balance, note || 'Payment received');
        
        db.prepare(`INSERT INTO audit_log (user_id, action, entity, entity_id, detail) VALUES (?, 'RECORD_PAYMENT', 'customer_ledger', ?, ?)`).run(userId, customerId, `Payment amount: ${amount}`);

        return newCustomer.current_balance;
      });
      const newBalance = tx();
      res.json({ success: true, newBalance });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/sales/invoice/:invoice_no', requireRole('READ_DASHBOARD'), (req: any, res: any) => {
    const invoice_no = decodeURIComponent(req.params.invoice_no);
    try {
      const db = getDB();
      const sale = db.prepare('SELECT * FROM sales WHERE invoice_no = ?').get(invoice_no) as any;
      if (sale) {
        const items = db.prepare(
          `SELECT si.*, p.brand_name, p.model_name, p.hsn_code, p.gst_rate, pi.serial_number
           FROM sale_items si
           JOIN products p ON si.product_id = p.product_id
           LEFT JOIN product_instances pi ON si.instance_id = pi.instance_id
           WHERE si.sale_id = ?`
        ).all(sale.sale_id);
        const customer = db.prepare('SELECT * FROM customers WHERE customer_id = ?').get(sale.customer_id);
        res.json({ found: true, sale, items, customer });
      } else {
        res.json({ found: false });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/sales/checkout', requireRole('CHECKOUT'), (req: any, res: any) => {
    const { customer_id, tier_applied, cart, discount, payment_mode, amount_paid } = req.body;
    const userId = req.session.user_id;
    if (!cart || cart.length === 0) {
      return res.status(400).json({ success: false, error: 'Cart is empty.' });
    }
    try {
      const db = getDB();
      const customer = db.prepare('SELECT * FROM customers WHERE customer_id = ?').get(customer_id || 1) as any;
      if (!customer) return res.status(400).json({ success: false, error: 'Customer not found.' });

      let subtotal = 0;
      cart.forEach((item: any) => {
        subtotal += (item.price - item.discount) * item.quantity;
      });
      const discountVal = discount || 0;
      const grandTotal = Math.max(0, subtotal - discountVal);

      if (payment_mode === 'UDHAAR') {
        if (customer.phone === '0000000000') return res.status(400).json({ success: false, error: 'Cannot sell on credit (Udhaar) to Counter Customer.' });
        if (customer.credit_due_date && new Date(customer.credit_due_date) < new Date() && customer.current_balance > 0) return res.status(400).json({ success: false, error: `Customer has an overdue balance since ${customer.credit_due_date}.` });
        const debt = grandTotal - (amount_paid || 0);
        if (customer.current_balance + debt > customer.credit_limit) return res.status(400).json({ success: false, error: 'Credit limit exceeded.' });
      }

      const shopStateRow = db.prepare("SELECT value FROM settings WHERE key = 'state_code'").get() as any;
      const shopState = shopStateRow?.value || '29';
      let customerState = shopState;
      if (customer.gstin && customer.gstin.trim().length >= 2) {
        const code = customer.gstin.trim().substring(0, 2);
        if (/^\d+$/.test(code)) customerState = code;
      }
      const isIntraState = customerState === shopState;
      let cgstTotal = 0, sgstTotal = 0, igstTotal = 0;

      cart.forEach((item: any) => {
        const lineTotal = (item.price - item.discount) * item.quantity;
        const proportion = subtotal > 0 ? lineTotal / subtotal : 0;
        const lineTaxable = Math.round(lineTotal - (discountVal * proportion));
        const prodRow = db.prepare('SELECT gst_rate FROM products WHERE product_id = ?').get(item.product_id) as any;
        const rate = prodRow?.gst_rate ?? 18;
        const taxableValue = Math.round(lineTaxable / (1 + rate / 100));
        const taxAmount = lineTaxable - taxableValue;
        if (isIntraState) {
          const half = Math.round(taxAmount / 2);
          cgstTotal += half;
          sgstTotal += (taxAmount - half);
        } else igstTotal += taxAmount;
      });

      const checkoutTx = db.transaction(() => {
        const prefixRow = db.prepare("SELECT value FROM settings WHERE key = 'invoice_prefix'").get() as any;
        const sequenceRow = db.prepare("SELECT value FROM settings WHERE key = 'next_invoice_no'").get() as any;
        const prefix = prefixRow?.value || 'CE/26/';
        const sequence = sequenceRow?.value || '1001';
        const invoiceNo = `${prefix}${sequence}`;

        const paidPaise = payment_mode === 'UDHAAR' ? (amount_paid || 0) : grandTotal;
        const saleRes = db.prepare(
          `INSERT INTO sales (
            invoice_no, customer_id, tier_applied, subtotal, discount, 
            cgst, sgst, igst, grand_total, amount_paid, payment_mode, sold_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(invoiceNo, customer.customer_id, tier_applied || 'COUNTER', subtotal, discountVal, cgstTotal, sgstTotal, igstTotal, grandTotal, paidPaise, payment_mode, userId);

        const saleId = saleRes.lastInsertRowid;

        cart.forEach((item: any) => {
          if (item.instance_id) {
            const inst = db.prepare('SELECT * FROM product_instances WHERE instance_id = ?').get(item.instance_id) as any;
            if (!inst || inst.status !== 'IN_STOCK') throw new Error(`Serial instance ${item.instance_id} is not in stock.`);
            db.prepare(`INSERT INTO sale_items (sale_id, product_id, instance_id, quantity, unit_price, line_discount, line_total, unit_cost) VALUES (?, ?, ?, 1, ?, ?, ?, ?)`).run(saleId, item.product_id, item.instance_id, item.price, item.discount, (item.price - item.discount), inst.purchase_cost || 0);
            const prodRow = db.prepare('SELECT warranty_months FROM products WHERE product_id = ?').get(item.product_id) as any;
            const warrantyMonths = prodRow?.warranty_months ?? 12;
            db.prepare(`UPDATE product_instances SET status = 'SOLD', sold_at = datetime('now'), warranty_expires_at = datetime('now', '+' || ? || ' months') WHERE instance_id = ?`).run(warrantyMonths, item.instance_id);
          } else {
            const prodRow = db.prepare('SELECT loose_qty, purchase_cost FROM products WHERE product_id = ?').get(item.product_id) as any;
            if (!prodRow || prodRow.loose_qty < item.quantity) throw new Error(`Insufficient loose stock for product ID ${item.product_id}. Available: ${prodRow?.loose_qty || 0}`);
            db.prepare(`INSERT INTO sale_items (sale_id, product_id, instance_id, quantity, unit_price, line_discount, line_total, unit_cost) VALUES (?, ?, NULL, ?, ?, ?, ?, ?)`).run(saleId, item.product_id, item.quantity, item.price, item.discount, (item.price - item.discount) * item.quantity, prodRow.purchase_cost || 0);
            db.prepare(`UPDATE products SET loose_qty = loose_qty - ? WHERE product_id = ?`).run(item.quantity, item.product_id);
          }
        });

        if (payment_mode === 'UDHAAR') {
          const debtPaise = grandTotal - paidPaise;
          db.prepare(`UPDATE customers SET current_balance = current_balance + ? WHERE customer_id = ?`).run(debtPaise, customer.customer_id);
          db.prepare(`INSERT INTO customer_ledger (customer_id, type, ref_id, amount, balance_after, note) VALUES (?, 'SALE', ?, ?, (SELECT current_balance FROM customers WHERE customer_id = ?), ?)`).run(customer.customer_id, saleId, debtPaise, customer.customer_id, `Debited from invoice ${invoiceNo}`);
        }

        db.prepare(`UPDATE settings SET value = CAST((CAST(value AS INTEGER) + 1) AS TEXT) WHERE key = 'next_invoice_no'`).run();
        db.prepare(`INSERT INTO audit_log (user_id, action, entity, entity_id, detail) VALUES (?, 'CHECKOUT', 'sale', ?, ?)`).run(userId, saleId, `LAN API POS Checkout Completed. Invoice: ${invoiceNo}`);

        return { invoiceNo, saleId };
      });

      const txResult = checkoutTx();
      res.json({ success: true, ...txResult });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  if (!isPackaged) {
    app.post('/api/dev/ipc', requireRole('BACKUP_RESTORE'), async (req: any, res: any) => {
      const { channel, args } = req.body;
      try {
        let result;
        const db = getDB();
        if (channel === 'db-query') {
          result = db.prepare(args[0]).all(...(args[1] || []));
        } else if (channel === 'db-get') {
          result = db.prepare(args[0]).get(...(args[1] || []));
        } else if (channel === 'db-run') {
          const runRes = db.prepare(args[0]).run(...(args[1] || []));
          result = { changes: runRes.changes, lastInsertRowid: runRes.lastInsertRowid };
        } else if (channel === 'db-transaction') {
          const runTx = db.transaction((txQueries: any) => {
            const results = [];
            for (const q of txQueries) {
              results.push(db.prepare(q.sql).run(...q.params));
            }
            return results;
          });
          result = runTx(args[0]);
        } else if (channel === 'get-db-config') {
          result = activeConfig;
        } else if (channel === 'set-db-config') {
          if (activeConfig) {
            Object.assign(activeConfig, args[0]);
            if (configPath) fs.writeFileSync(configPath, JSON.stringify(activeConfig, null, 2));
            if (args[0].dbPath && initDB && schemaSql) {
              initDB(args[0].dbPath, schemaSql);
            }
          }
          result = activeConfig;
        } else if (channel === 'get-lan-info') {
          const interfaces = os.networkInterfaces();
          let ip = '127.0.0.1';
          for (const name of Object.keys(interfaces)) {
            for (const iface of interfaces[name] || []) {
              if (iface.family === 'IPv4' && !iface.internal) ip = iface.address;
            }
          }
          result = { ip, port: 47615 };
        } else {
          return res.status(400).json({ error: `Unknown channel ${channel}` });
        }
        res.json(result);
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    });
  }

  app.get('/api/warranty/:serial', requireRole('READ_DASHBOARD'), (req: any, res: any) => {
    const { serial } = req.params;
    try {
      const db = getDB();
      const instance = db.prepare(`SELECT pi.*, p.brand_name, p.model_name, p.category FROM product_instances pi JOIN products p ON pi.product_id = p.product_id WHERE pi.serial_number = ?`).get(serial) as any;
      if (!instance) return res.json({ found: false });
      const saleItem = db.prepare(`SELECT si.*, s.invoice_no, s.created_at as sale_date, s.customer_id, c.name as customer_name, c.phone as customer_phone FROM sale_items si JOIN sales s ON si.sale_id = s.sale_id LEFT JOIN customers c ON s.customer_id = c.customer_id WHERE si.instance_id = ? AND s.status = 'COMPLETED'`).get(instance.instance_id) as any;
      const now = new Date();
      let warranty_valid = false;
      if (instance.warranty_expires_at) {
        const expires = new Date(instance.warranty_expires_at);
        expires.setHours(23, 59, 59, 999);
        warranty_valid = now <= expires;
      }
      return res.json({ found: true, instance, sold_by_us: !!saleItem, sale: saleItem || null, warranty_valid });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/returns/validate', requireRole('ISSUE_CN'), (req: any, res: any) => {
    const { serial } = req.body;
    try {
      const db = getDB();
      const instance = db.prepare('SELECT * FROM product_instances WHERE serial_number = ?').get(serial) as any;
      if (!instance) return res.json({ outcome: 'REJECT_UNKNOWN', message: 'Never part of our inventory.' });
      if (instance.status === 'RMA_RETURNED') return res.json({ outcome: 'REJECT_ALREADY_RETURNED', message: 'This unit has already been returned (RMA_RETURNED).' });
      const saleItem = db.prepare(`SELECT si.*, s.invoice_no, s.created_at as sale_date, s.customer_id, s.payment_mode, c.name as customer_name, c.phone as customer_phone FROM sale_items si JOIN sales s ON si.sale_id = s.sale_id LEFT JOIN customers c ON s.customer_id = c.customer_id WHERE si.instance_id = ? AND s.status = 'COMPLETED'`).get(instance.instance_id) as any;
      if (!saleItem) return res.json({ outcome: 'REJECT_NEVER_SOLD', message: 'In stock registry but never sold to a customer.' });
      return res.json({ outcome: 'ALLOW', saleItem, instance });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/returns/accept', requireRole('ISSUE_CN'), (req: any, res: any) => {
    const { serial, reason, resolution, refund_amount, replacement_serial, condition_sealed } = req.body;
    const userId = req.session.user_id;
    try {
      const db = getDB();
      const tx = db.transaction(() => {
        const instance = db.prepare('SELECT * FROM product_instances WHERE serial_number = ?').get(serial) as any;
        if (!instance || instance.status === 'RMA_RETURNED') throw new Error("Invalid or already returned serial.");
        const saleItem = db.prepare(`SELECT si.*, s.payment_mode, s.customer_id, s.sale_id FROM sale_items si JOIN sales s ON si.sale_id = s.sale_id WHERE si.instance_id = ? AND s.status = 'COMPLETED'`).get(instance.instance_id) as any;
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
          db.prepare(`INSERT INTO credit_notes (cn_no, sale_id, instance_id, amount, reason) VALUES (?, ?, ?, ?, ?)`).run(creditNoteNo, saleItem.sale_id, instance.instance_id, refund_amount, reason);
          cnId = (db.prepare('SELECT last_insert_rowid() as id').get() as any).id;
          db.prepare(`INSERT OR REPLACE INTO settings (key, value) VALUES ('next_cn_no', CAST((CAST(? AS INTEGER) + 1) AS TEXT))`).run(sequence);
          if (saleItem.payment_mode === 'UDHAAR' && saleItem.customer_id) {
            db.prepare('UPDATE customers SET current_balance = current_balance - ? WHERE customer_id = ?').run(refund_amount, saleItem.customer_id);
            const cust = db.prepare('SELECT current_balance FROM customers WHERE customer_id = ?').get(saleItem.customer_id) as any;
            db.prepare(`INSERT INTO customer_ledger (customer_id, type, ref_id, amount, balance_after, note) VALUES (?, 'RETURN', (SELECT cn_id FROM credit_notes WHERE cn_no = ?), ?, ?, ?)`).run(saleItem.customer_id, creditNoteNo, refund_amount, cust.current_balance, `Credit Note ${creditNoteNo}`);
          }
        } else if (resolution === 'REPLACEMENT') {
          if (!replacement_serial) throw new Error("Replacement serial is required.");
          const repInstance = db.prepare("SELECT * FROM product_instances WHERE serial_number = ? AND status = 'IN_STOCK'").get(replacement_serial) as any;
          if (!repInstance) throw new Error("Replacement serial not found or not IN_STOCK.");
          if (repInstance.product_id !== instance.product_id) throw new Error("Replacement must be of the same product.");
          const prodRow = db.prepare('SELECT warranty_months FROM products WHERE product_id = ?').get(instance.product_id) as any;
          const warrantyMonths = prodRow?.warranty_months ?? 12;
          db.prepare(`UPDATE product_instances SET status = 'SOLD', sold_at = datetime('now'), warranty_expires_at = datetime('now', '+' || ? || ' months') WHERE instance_id = ?`).run(warrantyMonths, repInstance.instance_id);
          db.prepare(`INSERT INTO sale_items (sale_id, product_id, instance_id, quantity, unit_price, line_discount, line_total) VALUES (?, ?, ?, 1, 0, 0, 0)`).run(saleItem.sale_id, repInstance.product_id, repInstance.instance_id);
        } else if (resolution === 'SEND_TO_COMPANY') {
          db.prepare(`INSERT INTO rma_register (instance_id, reason, status) VALUES (?, ?, 'SENT')`).run(instance.instance_id, reason);
        }

        db.prepare(`INSERT INTO audit_log (user_id, action, entity, entity_id, detail) VALUES (?, 'RETURN_ACCEPT', 'product_instances', ?, ?)`).run(userId, instance.instance_id, `Resolution: ${resolution}, Refund: ${refund_amount}, Reason: ${reason}`);

        return { success: true, creditNoteNo, cnId, newStatus };
      });
      res.json(tx());
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ================= REPORTS & ANALYTICS (OWNER ONLY) =================
  const ownerOnly = requireRole('VIEW_REPORTS');

  app.get('/api/reports/margin', ownerOnly, (req: any, res: any) => {
    const { startDate, endDate } = req.query;
    try {
      const db = getDB();
      const query = `
        SELECT date(s.created_at) as date, p.category, p.brand_name, s.tier_applied,
               si.line_total, p.gst_rate, si.unit_cost, si.quantity
        FROM sale_items si
        JOIN sales s ON si.sale_id = s.sale_id
        JOIN products p ON si.product_id = p.product_id
        WHERE s.status != 'CANCELLED'
        ${startDate ? `AND s.created_at >= ?` : ''}
        ${endDate ? `AND s.created_at <= ?` : ''}
      `;
      const params = [];
      if (startDate) params.push(startDate + ' 00:00:00');
      if (endDate) params.push(endDate + ' 23:59:59');
      
      const rows = db.prepare(query).all(...params) as any[];
      const { getTaxableValue } = require('@chauhan-erp/core/gst');
      
      const groups: Record<string, any> = {};
      rows.forEach(r => {
        const key = `${r.date}|${r.category}|${r.brand_name}|${r.tier_applied}`;
        if (!groups[key]) {
          groups[key] = { date: r.date, category: r.category, brand_name: r.brand_name, tier_applied: r.tier_applied, revenue: 0, cogs: 0, profit: 0 };
        }
        const revenue = getTaxableValue(r.line_total, r.gst_rate);
        const cogs = r.unit_cost * r.quantity;
        groups[key].revenue += revenue;
        groups[key].cogs += cogs;
        groups[key].profit += (revenue - cogs);
      });
      
      const data = Object.values(groups).sort((a: any, b: any) => b.date.localeCompare(a.date));
      res.json({ success: true, data });
    } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
  });

  app.get('/api/reports/sales', ownerOnly, (req: any, res: any) => {
    const { startDate, endDate } = req.query;
    try {
      const db = getDB();
      const query = `
        SELECT date(s.created_at) as date, p.category, p.brand_name, s.tier_applied,
               SUM(si.line_total) as total_revenue,
               SUM(si.quantity) as items_sold,
               COUNT(DISTINCT s.sale_id) as invoices_count
        FROM sale_items si
        JOIN sales s ON si.sale_id = s.sale_id
        JOIN products p ON si.product_id = p.product_id
        WHERE s.status != 'CANCELLED'
        ${startDate ? `AND s.created_at >= ?` : ''}
        ${endDate ? `AND s.created_at <= ?` : ''}
        GROUP BY date, p.category, p.brand_name, s.tier_applied
        ORDER BY date DESC
      `;
      const params = [];
      if (startDate) params.push(startDate + ' 00:00:00');
      if (endDate) params.push(endDate + ' 23:59:59');
      res.json({ success: true, data: db.prepare(query).all(...params) });
    } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
  });

  app.get('/api/reports/low-stock', ownerOnly, (req: any, res: any) => {
    try {
      const db = getDB();
      const data = db.prepare(`
        SELECT p.product_id, p.sku_code, p.model_name, p.min_restock_level,
               s.name as supplier_name,
               (SELECT COUNT(*) FROM product_instances pi WHERE pi.product_id = p.product_id AND pi.status = 'IN_STOCK') + p.loose_qty as in_stock_qty
        FROM products p
        LEFT JOIN suppliers s ON p.supplier_id = s.supplier_id
        WHERE ((SELECT COUNT(*) FROM product_instances pi WHERE pi.product_id = p.product_id AND pi.status = 'IN_STOCK') + p.loose_qty) <= p.min_restock_level
        ORDER BY s.name, p.model_name
      `).all();
      res.json({ success: true, data });
    } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
  });

  app.get('/api/reports/dead-stock', ownerOnly, (req: any, res: any) => {
    const days = parseInt(req.query.days || '30', 10);
    try {
      const db = getDB();
      const data = db.prepare(`
        SELECT p.product_id, p.sku_code, p.model_name,
               MAX(s.created_at) as last_sale_date,
               (SELECT COUNT(*) FROM product_instances pi WHERE pi.product_id = p.product_id AND pi.status = 'IN_STOCK') + p.loose_qty as in_stock_qty
        FROM products p
        LEFT JOIN sale_items si ON p.product_id = si.product_id
        LEFT JOIN sales s ON si.sale_id = s.sale_id
        GROUP BY p.product_id
        HAVING (last_sale_date IS NULL OR last_sale_date <= datetime('now', ?))
           AND in_stock_qty > 0
        ORDER BY last_sale_date ASC
      `).all(`-${days} days`);
      res.json({ success: true, data });
    } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
  });

  app.get('/api/reports/valuation', ownerOnly, (req: any, res: any) => {
    try {
      const db = getDB();
      const data = db.prepare(`
        SELECT 
          (SELECT SUM(purchase_cost) FROM product_instances WHERE status = 'IN_STOCK') as serialized_value,
          (SELECT SUM(loose_qty * purchase_cost) FROM products) as loose_value
      `).get() as any;
      const total = (data.serialized_value || 0) + (data.loose_value || 0);
      res.json({ success: true, data: { ...data, total_value: total } });
    } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
  });

  app.get('/api/reports/gstr1', ownerOnly, (req: any, res: any) => {
    const { startDate, endDate } = req.query;
    try {
      const db = getDB();
      const query = `
        SELECT s.sale_id, s.invoice_no, s.created_at, c.gstin, c.name as customer_name,
               s.subtotal, s.discount, s.cgst, s.sgst, s.igst, s.grand_total
        FROM sales s
        LEFT JOIN customers c ON s.customer_id = c.customer_id
        WHERE s.status != 'CANCELLED'
        ${startDate ? `AND s.created_at >= ?` : ''}
        ${endDate ? `AND s.created_at <= ?` : ''}
        ORDER BY s.created_at DESC
      `;
      const params = [];
      if (startDate) params.push(startDate + ' 00:00:00');
      if (endDate) params.push(endDate + ' 23:59:59');
      const invoices = db.prepare(query).all(...params) as any[];

      const { getTaxableValue } = require('@chauhan-erp/core/gst');
      let total_cgst = 0, total_sgst = 0, total_igst = 0, total_taxable = 0;

      for (const inv of invoices) {
        const items = db.prepare(`SELECT si.line_total, p.gst_rate FROM sale_items si JOIN products p ON si.product_id = p.product_id WHERE si.sale_id = ?`).all(inv.sale_id) as any[];
        let inv_taxable = 0;
        let rates = new Set<number>();
        
        items.forEach(si => {
          // If invoice has discount, proportion it? The logic suite says: "getTaxableValue(lineTotal, rate)"
          // To keep it simple, we use the line total. But discount lowers taxable value.
          // The instruction: "Derive GSTR-1 taxable value with the existing tested getTaxableValue reverse-calc... do not ad-hoc subtract tax."
          const ratio = (inv.subtotal - inv.discount) / inv.subtotal;
          const discountedLineTotal = si.line_total * ratio;
          inv_taxable += getTaxableValue(discountedLineTotal, si.gst_rate);
          rates.add(si.gst_rate);
        });
        
        inv.taxable = inv_taxable;
        inv.gst_rates = Array.from(rates).join(',');
        
        total_taxable += inv_taxable;
        total_cgst += inv.cgst;
        total_sgst += inv.sgst;
        total_igst += inv.igst;
      }

      res.json({ 
        success: true, 
        data: { invoices, summary: { total_cgst, total_sgst, total_igst, total_taxable } } 
      });
    } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
  });

  app.get('/api/reports/udhaar', ownerOnly, (req: any, res: any) => {
    try {
      const db = getDB();
      const customers = db.prepare(`
        SELECT customer_id, name, phone, current_balance, credit_limit, credit_due_date
        FROM customers
        WHERE current_balance > 0
      `).all() as any[];
      
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
      
      // Sort descending by current_balance
      customers.sort((a, b) => b.current_balance - a.current_balance);
      
      res.json({ success: true, data: { customers, buckets, total_receivable } });
    } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
  });

  return app;
}
