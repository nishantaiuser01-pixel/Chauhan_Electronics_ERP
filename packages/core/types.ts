export interface User {
  user_id?: number;
  name: string;
  pin_hash: string;
  role: 'OWNER' | 'CASHIER' | 'STOCK' | 'TECHNICIAN';
  active: number; // 0 or 1
}

export interface AuditLog {
  id?: number;
  user_id: number;
  action: string;
  entity: string;
  entity_id: number;
  detail: string;
  created_at?: string;
}

export interface Customer {
  customer_id?: number;
  name: string;
  phone: string;
  shop_name?: string;
  tier: 'COUNTER' | 'DEALER' | 'DISTRIBUTOR';
  gstin?: string;
  credit_limit: number; // paise
  current_balance: number; // paise
  credit_due_date?: string;
  created_at?: string;
}

export interface CustomerLedger {
  id?: number;
  customer_id: number;
  type: 'SALE' | 'PAYMENT' | 'ADJUSTMENT' | 'RETURN';
  ref_id?: number;
  amount: number; // paise
  balance_after: number; // paise
  note?: string;
  created_at?: string;
}

export interface Supplier {
  supplier_id?: number;
  name: string;
  phone?: string;
  gstin?: string;
  current_payable: number; // paise
  created_at?: string;
}

export interface Product {
  product_id?: number;
  sku_code: string;
  brand_name?: string;
  model_name?: string;
  category?: string;
  hsn_code?: string;
  gst_rate: number; // default 18
  requires_serial: number; // 0 or 1
  warranty_months: number; // default 12
  min_restock_level: number;
  counter_price?: number; // paise
  dealer_price?: number; // paise
  distributor_price?: number; // paise
  loose_qty: number;
  created_at?: string;
  // UI helper for fitment tags list
  fitment_tags?: string[];
}

export interface ProductFitment {
  id?: number;
  product_id: number;
  vehicle_tag: string;
}

export interface ProductInstance {
  instance_id?: number;
  product_id: number;
  serial_number: string;
  status: 'IN_STOCK' | 'SOLD' | 'RMA_RETURNED' | 'IN_REPAIR' | 'SCRAPPED';
  batch_number?: string;
  purchase_cost?: number; // paise
  grn_id?: number;
  received_at?: string;
  sold_at?: string;
  warranty_expires_at?: string;
}

export interface GRN {
  grn_id?: number;
  supplier_id?: number;
  invoice_ref?: string;
  total_cost: number; // paise
  received_by: number;
  created_at?: string;
}

export interface Sale {
  sale_id?: number;
  invoice_no: string;
  customer_id: number;
  tier_applied: 'COUNTER' | 'DEALER' | 'DISTRIBUTOR';
  subtotal: number; // paise
  discount: number; // paise
  cgst: number; // paise
  sgst: number; // paise
  igst: number; // paise
  grand_total: number; // paise
  amount_paid: number; // paise
  payment_mode: string;
  status: 'HELD' | 'COMPLETED' | 'CANCELLED';
  sold_by: number;
  created_at?: string;
}

export interface SaleItem {
  sale_item_id?: number;
  sale_id: number;
  product_id: number;
  instance_id?: number; // null for loose items
  quantity: number;
  unit_price: number; // paise
  line_discount: number; // paise
  line_total: number; // paise
}

export interface CreditNote {
  cn_id?: number;
  cn_no: string;
  sale_id: number;
  instance_id?: number;
  amount: number; // paise
  reason?: string;
  created_at?: string;
}

export interface RepairJob {
  job_id?: number;
  job_no: string;
  customer_id?: number;
  customer_phone: string;
  customer_name?: string;
  product_name?: string;
  serial_number?: string;
  sold_by_us: number; // 0 or 1
  is_warranty: number; // 0 or 1
  issue_reported?: string;
  technician_notes?: string;
  technician_id?: number;
  status: 'PENDING' | 'IN_REPAIR' | 'SENT_TO_COMPANY' | 'READY' | 'DELIVERED';
  est_cost?: number; // paise
  parts_cost: number; // paise
  labour_cost: number; // paise
  advance_paid: number; // paise
  final_cost?: number; // paise
  intake_date?: string;
  ready_date?: string;
  delivered_date?: string;
}

export interface RepairPart {
  id?: number;
  job_id: number;
  product_id: number;
  instance_id?: number;
  qty: number;
  cost: number; // paise
}

export interface RepairStatusHistory {
  id?: number;
  job_id: number;
  old_status?: string;
  new_status: string;
  changed_at?: string;
}

export interface SMSOutbox {
  id?: number;
  phone: string;
  body: string;
  status: 'QUEUED' | 'SENT' | 'FAILED';
  created_at?: string;
  sent_at?: string;
}

export interface Expense {
  id?: number;
  category: string;
  amount: number; // paise
  note?: string;
  created_at?: string;
}

export interface Settings {
  shop_name?: string;
  address?: string;
  gstin?: string;
  state_code?: string;
  invoice_prefix?: string;
  next_invoice_no?: string;
  job_prefix?: string;
  next_job_no?: string;
  default_gst_rate?: string;
  currency?: string;
  sms_enabled?: string;
  online_lookup?: string;
  backup_dir?: string;
}
