import Database from 'better-sqlite3';
import { Product, ProductInstance } from './types';

export function lookupProductBySku(skuCode: string, db: Database.Database): (Product & { fitment_tags?: string[] }) | null {
  const product = db.prepare('SELECT * FROM products WHERE sku_code = ?').get(skuCode) as any;
  if (!product) return null;

  const tags = db.prepare('SELECT vehicle_tag FROM product_fitment WHERE product_id = ?')
    .all(product.product_id)
    .map((row: any) => row.vehicle_tag);

  return {
    ...product,
    fitment_tags: tags,
  };
}

export function createGRN(
  supplierId: number | null,
  invoiceRef: string,
  totalCost: number, // paise
  receivedBy: number,
  db: Database.Database
): number {
  const stmt = db.prepare(`
    INSERT INTO grn (supplier_id, invoice_ref, total_cost, received_by)
    VALUES (?, ?, ?, ?)
  `);
  const result = stmt.run(supplierId, invoiceRef, totalCost, receivedBy);
  return result.lastInsertRowid as number;
}

export function addSerialToStock(
  productId: number,
  serialNumber: string,
  batchNumber: string,
  purchaseCost: number, // paise
  grnId: number,
  db: Database.Database
): ProductInstance {
  // Check if serial already exists
  const existing = db.prepare('SELECT * FROM product_instances WHERE serial_number = ?').get(serialNumber);
  if (existing) {
    throw new Error(`Serial number '${serialNumber}' already exists in the system.`);
  }

  const stmt = db.prepare(`
    INSERT INTO product_instances (product_id, serial_number, status, batch_number, purchase_cost, grn_id)
    VALUES (?, ?, 'IN_STOCK', ?, ?, ?)
  `);
  const result = stmt.run(productId, serialNumber, batchNumber, purchaseCost, grnId);
  const instanceId = result.lastInsertRowid as number;

  return {
    instance_id: instanceId,
    product_id: productId,
    serial_number: serialNumber,
    status: 'IN_STOCK',
    batch_number: batchNumber,
    purchase_cost: purchaseCost,
    grn_id: grnId,
  };
}

export function addLooseStock(
  productId: number,
  qty: number,
  db: Database.Database
) {
  if (qty <= 0) throw new Error('Quantity must be greater than zero');
  
  const stmt = db.prepare(`
    UPDATE products 
    SET loose_qty = loose_qty + ?
    WHERE product_id = ?
  `);
  stmt.run(qty, productId);
}
