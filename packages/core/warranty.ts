import Database from 'better-sqlite3';

export function calculateWarrantyExpiry(soldAtStr: string, warrantyMonths: number): string {
  if (warrantyMonths <= 0) return soldAtStr;
  const date = new Date(soldAtStr);
  date.setMonth(date.getMonth() + warrantyMonths);
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

export interface WarrantyStatus {
  found: boolean;
  sold_by_us: boolean;
  serial_number: string;
  brand_name?: string;
  model_name?: string;
  sold_on?: string;
  warranty_until?: string;
  warranty_valid?: boolean;
  invoice_no?: string;
  sold_to?: string;
  status?: string;
}

export function checkWarranty(serialNumber: string, db: Database.Database): WarrantyStatus {
  // 1. Query the product instance
  const instance = db.prepare(`
    SELECT pi.*, p.brand_name, p.model_name
    FROM product_instances pi
    JOIN products p ON pi.product_id = p.product_id
    WHERE pi.serial_number = ?
  `).get(serialNumber) as any;

  if (!instance) {
    return { found: false, sold_by_us: false, serial_number: serialNumber };
  }

  if (instance.status !== 'SOLD' || !instance.sold_at) {
    return {
      found: true,
      sold_by_us: true,
      serial_number: serialNumber,
      brand_name: instance.brand_name,
      model_name: instance.model_name,
      status: instance.status,
      warranty_valid: false,
    };
  }

  // 2. Find the associated sale and customer details
  const saleItem = db.prepare(`
    SELECT si.*, s.invoice_no, s.created_at as sale_date, c.name as customer_name
    FROM sale_items si
    JOIN sales s ON si.sale_id = s.sale_id
    LEFT JOIN customers c ON s.customer_id = c.customer_id
    WHERE si.instance_id = ?
  `).get(instance.instance_id) as any;

  const soldOn = instance.sold_at;
  const warrantyUntil = instance.warranty_expires_at;
  
  const now = new Date();
  const expiryDate = new Date(warrantyUntil);
  const warrantyValid = now <= expiryDate;

  return {
    found: true,
    sold_by_us: true,
    serial_number: serialNumber,
    brand_name: instance.brand_name,
    model_name: instance.model_name,
    sold_on: soldOn,
    warranty_until: warrantyUntil,
    warranty_valid: warrantyValid,
    invoice_no: saleItem?.invoice_no ?? 'N/A',
    sold_to: saleItem?.customer_name ?? 'Counter Customer',
    status: instance.status,
  };
}
