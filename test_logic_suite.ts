import { calculateGSTSplit, getTaxableValue } from './packages/core/gst';
import { resolvePrice } from './packages/core/pricing';
import { calculateAging, isCustomerOverdue } from './packages/core/ledger';
import { calculateWarrantyExpiry } from './packages/core/warranty';
import { formatPaymentReminder } from './packages/core/sms';
import { lookupProductBySku, addSerialToStock, addLooseStock } from './packages/core/intake';
import { Product, Customer } from './packages/core/types';
import * as assert from 'assert';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';
const BLUE = '\x1b[34m';

console.log(`${BLUE}--- Chauhan Electronics ERP Business Logic Test Suite ---${RESET}\n`);

const results: { name: string; status: 'PASSED' | 'FAILED'; error?: string }[] = [];

function test(name: string, fn: () => void) {
  try {
    fn();
    results.push({ name, status: 'PASSED' });
    console.log(`${GREEN}PASS:${RESET} ${name}`);
  } catch (err: any) {
    results.push({ name, status: 'FAILED', error: err.message });
    console.log(`${RED}FAIL:${RESET} ${name}\n     -> ${err.stack}`);
  }
}

// ------------------ TEST 1: GST CALCULATIONS ------------------
test('GST: calculateGSTSplit for intra-state (Karnataka to Karnataka)', () => {
  // Shop is 29, customer is 29
  const split = calculateGSTSplit(100000, 18, '29', '29ABCDE1234F1Z5');
  assert.strictEqual(split.cgst, 9000); // 9% of 100,000 paise = 9000 paise
  assert.strictEqual(split.sgst, 9000);
  assert.strictEqual(split.igst, 0);
});

test('GST: calculateGSTSplit for inter-state (Karnataka to Maharashtra)', () => {
  // Shop is 29, customer GSTIN starts with 27
  const split = calculateGSTSplit(100000, 18, '29', '27ABCDE1234F1Z5');
  assert.strictEqual(split.cgst, 0);
  assert.strictEqual(split.sgst, 0);
  assert.strictEqual(split.igst, 18000); // 18% of 100,000 paise = 18000 paise
});

test('GST: getTaxableValue reverse calculation', () => {
  const taxable = getTaxableValue(11800, 18); // 118 Rs total at 18% GST -> 100 Rs taxable
  assert.strictEqual(taxable, 10000);
});

// ------------------ TEST 2: PRICING RESOLUTION ------------------
test('Pricing: resolvePrice tier pricing', () => {
  const mockProduct: Product = {
    product_id: 1,
    sku_code: '123456',
    brand_name: 'Pioneer',
    model_name: 'DMH',
    category: 'Audio',
    hsn_code: '8527',
    gst_rate: 18,
    requires_serial: 1,
    warranty_months: 12,
    min_restock_level: 5,
    counter_price: 150000,
    dealer_price: 120000,
    distributor_price: 100000,
    loose_qty: 0,
    created_at: '',
  };

  assert.strictEqual(resolvePrice(mockProduct, 'COUNTER'), 150000);
  assert.strictEqual(resolvePrice(mockProduct, 'DEALER'), 120000);
  assert.strictEqual(resolvePrice(mockProduct, 'DISTRIBUTOR'), 100000);
});

// ------------------ TEST 3: UDHAAR AGING & LEDGER ------------------
test('Ledger: calculateAging aging bucket 0-30 days overdue', () => {
  const mockCustomer: Customer = {
    customer_id: 1,
    name: 'Dealer One',
    phone: '9876543210',
    tier: 'DEALER',
    current_balance: 500000, // 5000 Rs
    credit_limit: 1000000,
    credit_due_date: '2026-06-01',
    created_at: '',
  };

  const currentDate = new Date('2026-06-15'); // 14 days overdue
  const buckets = calculateAging(mockCustomer, currentDate);
  
  assert.strictEqual(buckets.total_overdue, 500000);
  assert.strictEqual(buckets['0-30'], 500000);
  assert.strictEqual(buckets['31-60'], 0);
  assert.strictEqual(buckets['61-90'], 0);
  assert.strictEqual(buckets['90+'], 0);
});

test('Ledger: calculateAging aging bucket 90+ days overdue', () => {
  const mockCustomer: Customer = {
    customer_id: 1,
    name: 'Dealer One',
    phone: '9876543210',
    tier: 'DEALER',
    current_balance: 750000, // 7500 Rs
    credit_limit: 1000000,
    credit_due_date: '2026-02-01',
    created_at: '',
  };

  const currentDate = new Date('2026-06-15'); // 134 days overdue
  const buckets = calculateAging(mockCustomer, currentDate);
  
  assert.strictEqual(buckets.total_overdue, 750000);
  assert.strictEqual(buckets['0-30'], 0);
  assert.strictEqual(buckets['90+'], 750000);
});

test('Ledger: isCustomerOverdue status verification', () => {
  const mockCustomer: Customer = {
    customer_id: 1,
    name: 'Dealer One',
    phone: '9876543210',
    tier: 'DEALER',
    current_balance: 500000,
    credit_limit: 1000000,
    credit_due_date: '2026-06-10',
    created_at: '',
  };

  assert.strictEqual(isCustomerOverdue(mockCustomer, new Date('2026-06-05')), false);
  assert.strictEqual(isCustomerOverdue(mockCustomer, new Date('2026-06-15')), true);
});

// ------------------ TEST 4: WARRANTY CALCULATIONS ------------------
test('Warranty: calculateWarrantyExpiry date math', () => {
  const soldAt = '2026-01-01 12:00:00';
  const expires = calculateWarrantyExpiry(soldAt, 12);
  assert.strictEqual(expires.substring(0, 10), '2027-01-01');
});

// ------------------ TEST 5: SMS TEMPLATES FORMATTING ------------------
test('SMS: formatPaymentReminder templates', () => {
  const mockCustomer: Customer = {
    customer_id: 1,
    name: 'Ravi',
    phone: '9876543210',
    tier: 'DEALER',
    current_balance: 250000, // 2,500.00 Rs
    credit_limit: 1000000,
    credit_due_date: '2026-06-01',
    created_at: '',
  };
  const reminderMsg = formatPaymentReminder(mockCustomer, 'Chauhan Electronics');
  assert.strictEqual(reminderMsg, 'Dear Ravi, your Udhaar balance of Rs.2500.00 at Chauhan Electronics is overdue. Please settle it at the earliest.');
});

// ------------------ TEST 6: MOCK DATABASE INTEGRATION TESTS ------------------
class MockDB {
  queries: { sql: string; params: any[] }[] = [];
  prepare(sql: string) {
    return {
      get: (...params: any[]) => {
        this.queries.push({ sql, params });
        if (sql.includes('FROM products WHERE sku_code')) {
          if (params[0] === '123456') {
            return { product_id: 42, sku_code: '123456', brand_name: 'Sony' };
          }
          return null;
        }
        if (sql.includes('SELECT * FROM product_instances WHERE serial_number')) {
          if (params[0] === 'DUP-SERIAL') {
            return { instance_id: 99 };
          }
          return null;
        }
        return null;
      },
      all: (...params: any[]) => {
        this.queries.push({ sql, params });
        if (sql.includes('SELECT vehicle_tag FROM product_fitment')) {
          return [{ vehicle_tag: 'Creta' }, { vehicle_tag: 'Universal' }];
        }
        return [];
      },
      run: (...params: any[]) => {
        this.queries.push({ sql, params });
        return { lastInsertRowid: 101, changes: 1 };
      }
    };
  }
}

test('MockDB: lookupProductBySku fetches tags', () => {
  const db = new MockDB() as any;
  const result = lookupProductBySku('123456', db);
  assert.ok(result);
  assert.strictEqual(result.product_id, 42);
  assert.deepStrictEqual(result.fitment_tags, ['Creta', 'Universal']);
  
  // Verify correct SQL prepared statements were called
  assert.ok(db.queries[0].sql.includes('FROM products WHERE sku_code'));
  assert.ok(db.queries[1].sql.includes('SELECT vehicle_tag FROM product_fitment'));
});

test('MockDB: addSerialToStock creates unit entry', () => {
  const db = new MockDB() as any;
  const instance = addSerialToStock(10, 'SN-XYZ-99', 'B1', 1500000, 5, db);
  assert.strictEqual(instance.instance_id, 101);
  assert.strictEqual(instance.serial_number, 'SN-XYZ-99');
  assert.strictEqual(instance.status, 'IN_STOCK');
  
  // Verify correct insert query was executed
  const insertQuery = db.queries.find((q: any) => q.sql.includes('INSERT INTO product_instances'));
  assert.ok(insertQuery);
  assert.deepStrictEqual(insertQuery.params, [10, 'SN-XYZ-99', 'B1', 1500000, 5]);
});

test('MockDB: addSerialToStock throws on duplicate serial number', () => {
  const db = new MockDB() as any;
  assert.throws(() => {
    addSerialToStock(10, 'DUP-SERIAL', 'B1', 1500000, 5, db);
  }, /already exists/);
});

test('MockDB: addLooseStock increments products loose_qty', () => {
  const db = new MockDB() as any;
  addLooseStock(15, 50, db);
  
  const updateQuery = db.queries.find((q: any) => q.sql.includes('UPDATE products'));
  assert.ok(updateQuery);
  assert.deepStrictEqual(updateQuery.params, [50, 15]);
});

console.log('\n--- TESTING SUMMARY ---');
console.table(results.map(r => ({ Test: r.name, Status: r.status })));

const failed = results.filter(r => r.status === 'FAILED');
if (failed.length > 0) {
  console.log(`\n${RED}✘ Testing completed with ${failed.length} failures.${RESET}`);
  process.exit(1);
} else {
  console.log(`\n${GREEN}✔ All business logic and mock DB integration tests passed successfully!${RESET}`);
  process.exit(0);
}
