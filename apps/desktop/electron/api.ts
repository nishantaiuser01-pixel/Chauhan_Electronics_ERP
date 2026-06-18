import express from 'express';
import cors from 'cors';
import os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { authorize, Role } from '../../../packages/core';

// Stage 2: in-memory override token store (TTL 5 min)
const overrideTokens = new Map<string, { admin_user_id: number; admin_name: string; expires: number; product_id?: number; final_price?: number; is_udhaar?: boolean; customer_id?: number; }>();
const tokenCleanupInterval = setInterval(() => { const now = Date.now(); overrideTokens.forEach((v, k) => { if (v.expires < now) overrideTokens.delete(k); }); }, 60_000);
if (tokenCleanupInterval.unref) tokenCleanupInterval.unref();

// Role-based max discount floor (pct)
function getMaxDiscountPct(role: string): number {
  if (role === 'OWNER') return 100;
  if (role === 'CASHIER') return 20;
  return 10; // SALESPERSON default
}

// Hub-side price floor — NEVER sent to client (cost + 5% min margin)
function getPriceFloor(product: any, instance: any): number {
  const cost = instance?.purchase_cost ?? product?.purchase_cost ?? 0;
  return Math.ceil(cost * 1.05);
}

// Strip purchase_cost/margin for non-SHOW_COST roles
function safeProd(product: any, role: string): any {
  if (!product) return product;
  if (authorize(role, 'SHOW_COST')) return product;
  const { purchase_cost, ...rest } = product;
  return rest;
}

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
        // Stage 2: strip cost for non-SHOW_COST roles
        res.json({ success: true, product: safeProd(product, req.session?.role), stock });
      } else {
        res.status(404).json({ success: false, error: 'Product not found' });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // PHASE 1: Feature 3 - Checkout Attach-Recommendations
  app.post('/api/sales/recommendations', requireRole('CHECKOUT'), (req: any, res: any) => {
    try {
      const db = getDB();
      const productIds: number[] = req.body.productIds || [];
      if (productIds.length === 0) {
        return res.json({ success: true, recommendations: [] });
      }

      const placeholders = productIds.map(() => '?').join(',');
      
      const query = `
        SELECT p.product_id, p.brand_name, p.model_name, p.sku_code, p.category, COUNT(DISTINCT si.sale_id) as frequency
        FROM sale_items si
        JOIN products p ON p.product_id = si.product_id
        WHERE si.sale_id IN (
          SELECT sale_id FROM sale_items WHERE product_id IN (${placeholders})
        )
        AND si.product_id NOT IN (${placeholders})
        GROUP BY si.product_id
        ORDER BY frequency DESC
        LIMIT 3
      `;
      
      // Need to pass the array of productIds twice (once for IN subquery, once for NOT IN)
      const results = db.prepare(query).all(...productIds, ...productIds);
      
      // Also fetch current pricing for recommendations (assuming counter tier for generic display)
      const recommendations = results.map((r: any) => {
        const fullProd = db.prepare(`SELECT counter_price FROM products WHERE product_id = ?`).get(r.product_id) as any;
        return {
          ...r,
          price: fullProd.counter_price
        };
      });

      res.json({ success: true, recommendations });
    } catch(err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Lookup by serial number (for mobile scan of individual unit)
  app.get('/api/products/serial/:serial', requireRole('READ_CATALOGUE'), (req: any, res: any) => {
    try {
      const db = getDB();
      const { serial } = req.params;
      const instance = db.prepare('SELECT * FROM product_instances WHERE serial_number = ?').get(serial) as any;
      if (!instance) return res.status(404).json({ success: false, error: 'Serial not found' });
      const product = db.prepare('SELECT * FROM products WHERE product_id = ?').get(instance.product_id) as any;
      if (!product) return res.status(404).json({ success: false, error: 'Product not found' });
      res.json({
        success: true,
        product: safeProd(product, req.session?.role),
        instance: { instance_id: instance.instance_id, serial_number: instance.serial_number, status: instance.status },
        stock: instance.status === 'IN_STOCK' ? 1 : 0
      });
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
        // Stage 2: strip cost
        res.json({ found: true, product: { ...safeProd(product, req.session?.role), fitment_tags: tags } });
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

  // List all customers (used by mobile customer selector)
  app.get('/api/customers', requireRole('READ_CUSTOMERS'), (req: any, res: any) => {
    try {
      const db = getDB();
      const customers = db.prepare('SELECT customer_id, name, phone, tier, gstin, credit_limit, current_balance, credit_due_date FROM customers ORDER BY name').all();
      res.json({ success: true, customers });
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

  // Stage 2+3: Hub-authoritative floor check — never reveals the floor to the client
  app.post('/api/sales/validate-price', requireRole('CHECKOUT'), (req: any, res: any) => {
    try {
      const { product_id, instance_id, final_price } = req.body;
      const role = req.session?.role;
      const db = getDB();
      const product = db.prepare('SELECT * FROM products WHERE product_id = ?').get(product_id) as any;
      if (!product) return res.status(404).json({ success: false, error: 'Product not found' });
      const instance = instance_id ? db.prepare('SELECT * FROM product_instances WHERE instance_id = ?').get(instance_id) as any : null;
      const tierPrice = product.counter_price || 0; // baseline; client sends the tier_price they expect
      const floor = getPriceFloor(product, instance);
      const maxDiscount = getMaxDiscountPct(role);
      const discountPct = tierPrice > 0 ? ((tierPrice - final_price) / tierPrice) * 100 : 0;
      const belowFloor = final_price < floor;
      const overMaxDiscount = discountPct > maxDiscount;
      const allowed = !belowFloor && !overMaxDiscount;
      // Never send floor or cost — only allowed/blocked + reason
      res.json({
        allowed,
        needs_override: !allowed,
        reason: belowFloor ? 'Price is below minimum margin floor' : overMaxDiscount ? `Discount exceeds your ${maxDiscount}% limit` : null
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Stage 3: Admin PIN override — validates & logs; returns a short-lived override token
  app.post('/api/sales/admin-override', requireRole('CHECKOUT'), (req: any, res: any) => {
    try {
      const { admin_pin, product_id, instance_id, final_price, note, override_type, customer_id } = req.body;
      const db = getDB();
      const bcrypt = require('bcryptjs');
      const crypto = require('crypto');
      // Find an OWNER or CASHIER user who matches the PIN
      const admins = db.prepare("SELECT * FROM users WHERE active = 1 AND role IN ('OWNER', 'CASHIER')").all() as any[];
      const admin = admins.find((u: any) => bcrypt.compareSync(admin_pin, u.pin_hash));
      if (!admin) return res.status(401).json({ success: false, error: 'Invalid admin PIN' });
      // Must be OWNER to override below-floor prices
      if (admin.role !== 'OWNER') {
        return res.status(403).json({ success: false, error: 'Only OWNER can authorize overrides' });
      }
      // Generate override token (5 min TTL)
      const token = crypto.randomBytes(16).toString('hex');
      
      if (override_type === 'UDHAAR') {
        overrideTokens.set(token, {
          admin_user_id: admin.user_id,
          admin_name: admin.name,
          expires: Date.now() + 5 * 60 * 1000,
          is_udhaar: true,
          customer_id
        });
        db.prepare(`INSERT INTO audit_log (user_id, action, entity, entity_id, detail) VALUES (?, 'UDHAAR_OVERRIDE', 'customer', ?, ?)`)
          .run(admin.user_id, customer_id, `Override by ${admin.name}: note=${note ?? ''}`);
      } else {
        overrideTokens.set(token, {
          admin_user_id: admin.user_id,
          admin_name: admin.name,
          expires: Date.now() + 5 * 60 * 1000,
          product_id,
          final_price
        });
        db.prepare(`INSERT INTO audit_log (user_id, action, entity, entity_id, detail) VALUES (?, 'PRICE_OVERRIDE', 'product', ?, ?)`)
          .run(admin.user_id, product_id, `Override by ${admin.name}: final_price=${final_price}, instance=${instance_id ?? 'loose'}, note=${note ?? ''}`);
      }
      res.json({ success: true, override_token: token, approved_by: admin.name });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/sales/checkout', requireRole('CHECKOUT'), (req: any, res: any) => {
    const { customer_id, tier_applied, cart, discount, payment_mode, amount_paid, udhaar_override_token, trade_in_discount, trade_in_desc } = req.body;
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
      const tradeInVal = trade_in_discount || 0;
      const grandTotal = Math.max(0, subtotal - discountVal - tradeInVal);

      if (payment_mode === 'UDHAAR') {
        if (customer.phone === '0000000000') return res.status(400).json({ success: false, error: 'Cannot sell on credit (Udhaar) to Counter Customer.' });
        
        let validUdhaarOverride = false;
        if (udhaar_override_token) {
          const tData = overrideTokens.get(udhaar_override_token);
          if (tData && tData.expires > Date.now() && tData.is_udhaar) {
            validUdhaarOverride = true;
          }
        }
        
        if (!validUdhaarOverride) {
          if (customer.credit_due_date && new Date(customer.credit_due_date) < new Date() && customer.current_balance > 0) return res.status(402).json({ success: false, error: `Customer has an overdue balance since ${customer.credit_due_date}.`, needs_override: true });
          const debt = grandTotal - (amount_paid || 0);
          if (customer.current_balance + debt > customer.credit_limit) return res.status(402).json({ success: false, error: 'Credit limit exceeded.', needs_override: true });
        }
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
            cgst, sgst, igst, grand_total, amount_paid, payment_mode, trade_in_discount, trade_in_desc, sold_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(invoiceNo, customer.customer_id, tier_applied || 'COUNTER', subtotal, discountVal, cgstTotal, sgstTotal, igstTotal, grandTotal, paidPaise, payment_mode, tradeInVal, trade_in_desc || null, userId);

        const saleId = saleRes.lastInsertRowid;

        if (tradeInVal > 0 && trade_in_desc) {
          db.prepare(
            `INSERT INTO trade_ins (sale_id, customer_id, item_desc, estimated_value, status) VALUES (?, ?, ?, ?, 'RECEIVED')`
          ).run(saleId, customer.customer_id, trade_in_desc, tradeInVal);
        }

        cart.forEach((item: any) => {
          if (item.instance_id) {
            const inst = db.prepare('SELECT * FROM product_instances WHERE instance_id = ?').get(item.instance_id) as any;
            if (!inst || inst.status !== 'IN_STOCK') {
              const err: any = new Error(`Serial ${item.instance_id} is not available (already sold or not in stock).`);
              err.statusCode = 409;
              throw err;
            }
            // Validate override token if price was flagged
            if (item.override_token) {
              const ov = overrideTokens.get(item.override_token);
              if (!ov || ov.expires < Date.now()) throw new Error(`Override token expired for item ${item.instance_id}`);
              overrideTokens.delete(item.override_token); // single-use
            }
            db.prepare(`INSERT INTO sale_items (sale_id, product_id, instance_id, quantity, unit_price, line_discount, line_total, unit_cost) VALUES (?, ?, ?, 1, ?, ?, ?, ?)`).run(saleId, item.product_id, item.instance_id, item.price, item.discount, (item.price - item.discount), inst.purchase_cost || 0);
            const prodRow = db.prepare('SELECT warranty_months FROM products WHERE product_id = ?').get(item.product_id) as any;
            const warrantyMonths = prodRow?.warranty_months ?? 12;
            db.prepare(`UPDATE product_instances SET status = 'SOLD', sold_at = datetime('now'), warranty_expires_at = datetime('now', '+' || ? || ' months') WHERE instance_id = ?`).run(warrantyMonths, item.instance_id);
          } else {
            const prodRow = db.prepare('SELECT loose_qty, purchase_cost FROM products WHERE product_id = ?').get(item.product_id) as any;
            if (!prodRow || prodRow.loose_qty < item.quantity) throw new Error(`Insufficient loose stock for product ID ${item.product_id}. Available: ${prodRow?.loose_qty || 0}`);
            if (item.override_token) {
              const ov = overrideTokens.get(item.override_token);
              if (!ov || ov.expires < Date.now()) throw new Error(`Override token expired for loose item ${item.product_id}`);
              overrideTokens.delete(item.override_token);
            }
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
      const status = err.statusCode === 409 ? 409 : 500;
      res.status(status).json({ success: false, error: err.message });
    }
  });

  // Print endpoint for Mobile
  app.post('/api/sales/:id/print', requireRole('CHECKOUT'), async (req: any, res: any) => {
    try {
      const db = getDB();
      const sale = db.prepare('SELECT * FROM sales WHERE sale_id = ?').get(req.params.id) as any;
      if (!sale) return res.status(404).json({ success: false, error: 'Sale not found.' });
      
      const { printReceipt } = require('./printer');
      // For now, fire and forget (it logs if it fails, we don't want to block the response if printer is offline)
      printReceipt(req.params.id, db).catch((e: any) => console.error('Print error:', e));
      
      res.json({ success: true, message: 'Print job dispatched' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // PHASE 2: Quotations
  app.post('/api/quotations', requireRole('CHECKOUT'), (req: any, res: any) => {
    const { customer_id, customer_name, customer_phone, items } = req.body;
    try {
      const db = getDB();
      
      let totalTaxable = 0, totalCgst = 0, totalSgst = 0, totalIgst = 0;
      const isIgst = false; // Simplified: intra-state
      
      for (const item of items) {
        totalTaxable += item.taxable_value;
        if (isIgst) {
          totalIgst += item.tax_amt;
        } else {
          totalCgst += Math.round(item.tax_amt / 2);
          totalSgst += Math.round(item.tax_amt / 2);
        }
      }
      
      const grandTotal = totalTaxable + totalCgst + totalSgst + totalIgst;
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 7); // Valid for 7 days
      
      const tx = db.transaction(() => {
        const qno = `QT-${Date.now()}`; // basic quotation numbering
        const insertQ = db.prepare(`
          INSERT INTO quotations (quotation_no, customer_id, customer_name, customer_phone, total_taxable, total_cgst, total_sgst, total_igst, grand_total, valid_until)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const info = insertQ.run(qno, customer_id, customer_name, customer_phone, totalTaxable, totalCgst, totalSgst, totalIgst, grandTotal, validUntil.toISOString());
        
        const qId = info.lastInsertRowid;
        const insertItem = db.prepare(`
          INSERT INTO quotation_items (quotation_id, product_id, quantity, unit_price, discount, tax_rate, taxable_value, cgst_amt, sgst_amt, igst_amt, total_amt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        for (const item of items) {
          const itemCgst = isIgst ? 0 : Math.round(item.tax_amt / 2);
          const itemSgst = isIgst ? 0 : Math.round(item.tax_amt / 2);
          const itemIgst = isIgst ? item.tax_amt : 0;
          insertItem.run(
            qId, item.product_id, item.quantity, item.price, item.discount, item.tax_rate,
            item.taxable_value, itemCgst, itemSgst, itemIgst, item.taxable_value + item.tax_amt
          );
        }
        
        return qId;
      });
      
      const qId = tx();
      res.json({ success: true, quotationId: qId });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.get('/api/quotations', requireRole('CHECKOUT'), (req: any, res: any) => {
    try {
      const db = getDB();
      const list = db.prepare(`SELECT * FROM quotations ORDER BY quotation_id DESC LIMIT 50`).all();
      res.json({ success: true, data: list });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
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

  // PHASE 1: Feature 1 - Owner Insight Dashboard
  app.get('/api/reports/insights', ownerOnly, (req: any, res: any) => {
    try {
      const db = getDB();
      // 1. Margin by Brand
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
        ORDER BY margin DESC
      `).all();

      // 2. Margin by Category
      const marginByCategory = db.prepare(`
        SELECT p.category, 
               SUM(si.line_total) as revenue, 
               SUM(si.line_total) - SUM(si.unit_cost * si.quantity) as margin
        FROM sale_items si
        JOIN sales s ON s.sale_id = si.sale_id
        JOIN products p ON p.product_id = si.product_id
        WHERE s.status = 'COMPLETED'
        GROUP BY p.category
        ORDER BY margin DESC
      `).all();

      // 3. Margin by Tier
      const marginByTier = db.prepare(`
        SELECT s.tier_applied, 
               SUM(si.line_total) as revenue, 
               SUM(si.line_total) - SUM(si.unit_cost * si.quantity) as margin
        FROM sale_items si
        JOIN sales s ON s.sale_id = si.sale_id
        WHERE s.status = 'COMPLETED'
        GROUP BY s.tier_applied
        ORDER BY margin DESC
      `).all();

      // 4. Best Movers (Top 5 products by quantity sold)
      const bestMovers = db.prepare(`
        SELECT p.brand_name, p.model_name, SUM(si.quantity) as qty_sold, SUM(si.line_total) as revenue
        FROM sale_items si
        JOIN sales s ON s.sale_id = si.sale_id
        JOIN products p ON p.product_id = si.product_id
        WHERE s.status = 'COMPLETED'
        GROUP BY p.product_id
        ORDER BY qty_sold DESC
        LIMIT 5
      `).all();

      // 5. Slow Movers (Products with 0 sales in last 30 days but IN_STOCK)
      const slowMovers = db.prepare(`
        SELECT p.brand_name, p.model_name, COUNT(pi.instance_id) as current_stock
        FROM products p
        JOIN product_instances pi ON pi.product_id = p.product_id
        WHERE pi.status = 'IN_STOCK'
        AND p.product_id NOT IN (
          SELECT product_id FROM sale_items si
          JOIN sales s ON s.sale_id = si.sale_id
          WHERE s.created_at >= date('now', '-30 days')
        )
        GROUP BY p.product_id
        ORDER BY current_stock DESC
        LIMIT 5
      `).all();

      // 6. Top Dealers (By Revenue)
      const topDealers = db.prepare(`
        SELECT c.name, SUM(s.grand_total) as total_revenue
        FROM sales s
        JOIN customers c ON s.customer_id = c.customer_id
        WHERE s.status = 'COMPLETED' AND s.tier_applied IN ('DEALER', 'DISTRIBUTOR')
        GROUP BY c.customer_id
        ORDER BY total_revenue DESC
        LIMIT 5
      `).all();

      // 7. Sales by Hour
      const salesByHour = db.prepare(`
        SELECT strftime('%H', created_at) as hour, SUM(grand_total) as revenue, COUNT(sale_id) as transactions
        FROM sales
        WHERE status = 'COMPLETED'
        GROUP BY hour
        ORDER BY hour ASC
      `).all();

      res.json({ success: true, insights: {
        marginByBrand, marginByCategory, marginByTier,
        bestMovers, slowMovers, topDealers, salesByHour
      }});
    } catch(err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // PHASE 1: Feature 2 - Smart Reorder Suggestions
  app.get('/api/reports/smart-reorder', ownerOnly, (req: any, res: any) => {
    try {
      const db = getDB();
      const targetDays = parseInt(req.query.days || '15', 10);
      
      const query = `
        WITH recent_sales AS (
          SELECT si.product_id, SUM(si.quantity) as sold_last_30_days
          FROM sale_items si
          JOIN sales s ON s.sale_id = si.sale_id
          WHERE s.status = 'COMPLETED' AND s.created_at >= date('now', '-30 days')
          GROUP BY si.product_id
        ),
        current_inventory AS (
          SELECT p.product_id, p.brand_name, p.model_name, p.sku_code, p.category,
                 (CASE WHEN p.requires_serial = 1 THEN (
                   SELECT COUNT(*) FROM product_instances pi WHERE pi.product_id = p.product_id AND pi.status = 'IN_STOCK'
                 ) ELSE p.loose_qty END) as current_stock,
                 p.min_restock_level
          FROM products p
        )
        SELECT ci.product_id, ci.brand_name, ci.model_name, ci.sku_code, ci.category, ci.current_stock,
               COALESCE(rs.sold_last_30_days, 0) as sold_last_30,
               ci.min_restock_level
        FROM current_inventory ci
        LEFT JOIN recent_sales rs ON ci.product_id = rs.product_id
      `;
      
      const results = db.prepare(query).all();
      const suggestions = [];
      
      for (const r of results as any[]) {
        const velocity = r.sold_last_30 / 30;
        const projectedDemand = velocity * targetDays;
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
      
      res.json({ success: true, suggestions: suggestions.sort((a, b) => b.suggested_order - a.suggested_order) });
    } catch(err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

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

  // ================= UPI ACCOUNTS =================
  app.get('/api/upi-accounts', requireRole('CHECKOUT'), (req: any, res: any) => {
    try {
      const db = getDB();
      const accounts = db.prepare('SELECT * FROM upi_accounts WHERE is_active = 1').all();
      // If no accounts exist yet, return a default mock for backward compatibility
      if (accounts.length === 0) {
        return res.json({ success: true, data: [{ id: 0, name: 'Default UPI', upi_id: 'default@upi' }] });
      }
      res.json({ success: true, data: accounts });
    } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
  });

  app.post('/api/upi-accounts', ownerOnly, (req: any, res: any) => {
    try {
      const { name, upi_id, merchant_code } = req.body;
      const db = getDB();
      db.prepare(`INSERT INTO upi_accounts (name, upi_id, merchant_code) VALUES (?, ?, ?)`).run(name, upi_id, merchant_code || null);
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
  });

  return app;
}
