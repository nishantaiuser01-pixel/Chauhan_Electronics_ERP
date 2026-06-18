PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- ---------- Settings (shop profile, tax, numbering, printer) ----------
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
); -- rows: shop_name, address, gstin, state_code, invoice_prefix, next_invoice_no,
   -- job_prefix, next_job_no, default_gst_rate, currency, sms_enabled, online_lookup

-- ---------- Users / roles (offline PIN auth) ----------

CREATE TABLE IF NOT EXISTS users (
  user_id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  pin_hash TEXT NOT NULL,                 -- bcrypt
  role TEXT NOT NULL CHECK(role IN ('OWNER','CASHIER','STOCK','TECHNICIAN')),
  active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(user_id),
  action TEXT, entity TEXT, entity_id INTEGER,
  detail TEXT, created_at TEXT DEFAULT (datetime('now'))
);

-- ---------- Customers (tiers + Udhaar ledger) ----------
CREATE TABLE IF NOT EXISTS customers (
  customer_id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  shop_name TEXT,
  tier TEXT NOT NULL DEFAULT 'COUNTER' CHECK(tier IN ('COUNTER','DEALER','DISTRIBUTOR')),
  gstin TEXT,
  credit_limit INTEGER DEFAULT 0,         -- paise
  current_balance INTEGER DEFAULT 0,      -- paise, +ve = owes us
  credit_due_date TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS customer_ledger (             -- every credit movement (statement source)
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER REFERENCES customers(customer_id),
  type TEXT CHECK(type IN ('SALE','PAYMENT','ADJUSTMENT','RETURN')),
  ref_id INTEGER, amount INTEGER, balance_after INTEGER,
  note TEXT, created_at TEXT DEFAULT (datetime('now'))
);

-- ---------- Suppliers + payables ----------
CREATE TABLE IF NOT EXISTS suppliers (
  supplier_id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL, phone TEXT, gstin TEXT,
  current_payable INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now'))
);

-- ---------- Products (catalogue / model master) ----------
CREATE TABLE IF NOT EXISTS products (
  product_id INTEGER PRIMARY KEY AUTOINCREMENT,
  sku_code TEXT UNIQUE,                    -- the scanned barcode / printed SKU
  brand_name TEXT, model_name TEXT,
  category TEXT,
  hsn_code TEXT,                           -- for GST invoice
  gst_rate INTEGER DEFAULT 18,             -- %
  requires_serial INTEGER DEFAULT 1,       -- 0 for wires/screws/fuses
  warranty_months INTEGER DEFAULT 12,
  min_restock_level INTEGER DEFAULT 5,
  counter_price INTEGER, dealer_price INTEGER, distributor_price INTEGER,  -- paise
  loose_qty INTEGER DEFAULT 0,             -- on-hand qty for NON-serial items
  purchase_cost INTEGER DEFAULT 0,
  supplier_id INTEGER REFERENCES suppliers(supplier_id),
  created_at TEXT DEFAULT (datetime('now'))
);

-- ---------- Fitment (replaces Postgres TEXT[]; supports fast "Creta 2024" search) ----------
CREATE TABLE IF NOT EXISTS product_fitment (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER REFERENCES products(product_id) ON DELETE CASCADE,
  vehicle_tag TEXT NOT NULL                -- 'Creta 2024','Universal Double Din'
);
CREATE INDEX IF NOT EXISTS idx_fitment_tag ON product_fitment(vehicle_tag);

-- ---------- Product instances (serialised physical units) ----------
CREATE TABLE IF NOT EXISTS product_instances (
  instance_id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(product_id),
  serial_number TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'IN_STOCK'
    CHECK(status IN ('IN_STOCK','SOLD','RMA_RETURNED','IN_REPAIR','SCRAPPED')),
  batch_number TEXT, purchase_cost INTEGER,   -- paise
  grn_id INTEGER, received_at TEXT DEFAULT (datetime('now')),
  sold_at TEXT, warranty_expires_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_inst_serial ON product_instances(serial_number);
CREATE INDEX IF NOT EXISTS idx_inst_status ON product_instances(status);

-- ---------- Goods Received Notes (intake batches) ----------
CREATE TABLE IF NOT EXISTS grn (
  grn_id INTEGER PRIMARY KEY AUTOINCREMENT,
  supplier_id INTEGER REFERENCES suppliers(supplier_id),
  invoice_ref TEXT, total_cost INTEGER DEFAULT 0,
  received_by INTEGER REFERENCES users(user_id),
  created_at TEXT DEFAULT (datetime('now'))
);

-- ---------- Sales ----------
CREATE TABLE IF NOT EXISTS sales (
  sale_id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_no TEXT UNIQUE,
  customer_id INTEGER REFERENCES customers(customer_id),
  tier_applied TEXT NOT NULL,
  subtotal INTEGER, discount INTEGER DEFAULT 0,
  cgst INTEGER DEFAULT 0, sgst INTEGER DEFAULT 0, igst INTEGER DEFAULT 0,
  grand_total INTEGER, amount_paid INTEGER, payment_mode TEXT,
  trade_in_discount INTEGER DEFAULT 0,
  trade_in_desc TEXT,
  status TEXT DEFAULT 'COMPLETED' CHECK(status IN ('HELD','COMPLETED','CANCELLED')),
  sold_by INTEGER REFERENCES users(user_id),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sale_items (
  sale_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_id INTEGER REFERENCES sales(sale_id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(product_id),
  instance_id INTEGER UNIQUE REFERENCES product_instances(instance_id), -- NULL for loose
  quantity INTEGER DEFAULT 1,
  unit_price INTEGER, line_discount INTEGER DEFAULT 0, line_total INTEGER,
  unit_cost INTEGER DEFAULT 0
);

-- ---------- Returns / credit notes ----------
CREATE TABLE IF NOT EXISTS credit_notes (
  cn_id INTEGER PRIMARY KEY AUTOINCREMENT,
  cn_no TEXT UNIQUE, sale_id INTEGER REFERENCES sales(sale_id),
  instance_id INTEGER REFERENCES product_instances(instance_id),
  amount INTEGER, reason TEXT, created_at TEXT DEFAULT (datetime('now'))
);

-- ---------- RMA / Send to Company ----------
CREATE TABLE IF NOT EXISTS rma_register (
  rma_id INTEGER PRIMARY KEY AUTOINCREMENT,
  instance_id INTEGER REFERENCES product_instances(instance_id),
  supplier_id INTEGER REFERENCES suppliers(supplier_id),
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'SENT'
    CHECK(status IN ('SENT','REPLACED','CREDITED','RECEIVED_BACK')),
  sent_at TEXT DEFAULT (datetime('now')),
  resolved_at TEXT, note TEXT,
  tracking_id TEXT
);

-- ---------- Trade-Ins ----------
CREATE TABLE IF NOT EXISTS trade_ins (
  trade_in_id INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_id INTEGER REFERENCES sales(sale_id),
  customer_id INTEGER REFERENCES customers(customer_id),
  item_desc TEXT NOT NULL,
  condition TEXT,
  estimated_value INTEGER NOT NULL, -- paise
  status TEXT DEFAULT 'RECEIVED' CHECK(status IN ('RECEIVED','REFURBISHED','SOLD','SCRAPPED')),
  created_at TEXT DEFAULT (datetime('now'))
);

-- ---------- Repair / service ----------
CREATE TABLE IF NOT EXISTS repair_jobs (
  job_id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_no TEXT UNIQUE,
  customer_id INTEGER REFERENCES customers(customer_id),
  customer_phone TEXT NOT NULL, customer_name TEXT,
  product_name TEXT, serial_number TEXT, sold_by_us INTEGER DEFAULT 0,
  is_warranty INTEGER DEFAULT 0,
  issue_reported TEXT, technician_notes TEXT,
  technician_id INTEGER REFERENCES users(user_id),
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK(status IN ('PENDING','IN_REPAIR','SENT_TO_COMPANY','READY','DELIVERED')),
  est_cost INTEGER, parts_cost INTEGER DEFAULT 0, labour_cost INTEGER DEFAULT 0,
  advance_paid INTEGER DEFAULT 0, final_cost INTEGER,
  intake_date TEXT DEFAULT (datetime('now')), ready_date TEXT, delivered_date TEXT
);

CREATE TABLE IF NOT EXISTS repair_parts (                -- consumes inventory
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER REFERENCES repair_jobs(job_id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(product_id),
  instance_id INTEGER REFERENCES product_instances(instance_id),
  qty INTEGER DEFAULT 1, cost INTEGER
);

CREATE TABLE IF NOT EXISTS repair_status_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER REFERENCES repair_jobs(job_id) ON DELETE CASCADE,
  old_status TEXT, new_status TEXT,
  changed_at TEXT DEFAULT (datetime('now'))
);

-- ---------- Outbound SMS queue (offline; flushes when a gateway is reachable) ----------
CREATE TABLE IF NOT EXISTS sms_outbox (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT,
  body TEXT,
  channel TEXT DEFAULT 'SMS' CHECK (channel IN ('SMS','WHATSAPP')),
  status TEXT DEFAULT 'QUEUED' CHECK(status IN ('QUEUED','SENT','FAILED')),
  created_at TEXT DEFAULT (datetime('now')),
  sent_at TEXT,
  retry_count INTEGER DEFAULT 0
);

-- ---------- Expenses (light day-book) ----------
CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT, amount INTEGER, note TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ---------- UPI Accounts (for dynamic QR generation) ----------
CREATE TABLE IF NOT EXISTS upi_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,           -- e.g. "SBI Current", "HDFC Savings"
  upi_id TEXT NOT NULL UNIQUE,  -- e.g. "shop@sbi"
  merchant_code TEXT,           -- Optional MCC (Merchant Category Code)
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ---------- Quotations (Proforma Invoices) ----------
CREATE TABLE IF NOT EXISTS quotations (
  quotation_id INTEGER PRIMARY KEY AUTOINCREMENT,
  quotation_no TEXT UNIQUE,
  customer_id INTEGER REFERENCES customers(customer_id),
  customer_name TEXT,
  customer_phone TEXT,
  total_taxable INTEGER,
  total_cgst INTEGER,
  total_sgst INTEGER,
  total_igst INTEGER,
  grand_total INTEGER,
  status TEXT DEFAULT 'DRAFT' CHECK(status IN ('DRAFT', 'CONVERTED', 'EXPIRED')),
  created_at TEXT DEFAULT (datetime('now')),
  valid_until TEXT
);

CREATE TABLE IF NOT EXISTS quotation_items (
  item_id INTEGER PRIMARY KEY AUTOINCREMENT,
  quotation_id INTEGER REFERENCES quotations(quotation_id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(product_id),
  quantity INTEGER,
  unit_price INTEGER,
  discount INTEGER DEFAULT 0,
  tax_rate INTEGER,
  taxable_value INTEGER,
  cgst_amt INTEGER,
  sgst_amt INTEGER,
  igst_amt INTEGER,
  total_amt INTEGER
);
