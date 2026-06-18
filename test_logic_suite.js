"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// packages/core/gst.ts
function calculateGSTSplit(taxableAmountPaise, gstRate, shopStateCode, customerGSTIN) {
  let customerStateCode = shopStateCode;
  if (customerGSTIN && customerGSTIN.trim().length >= 2) {
    const code = customerGSTIN.trim().substring(0, 2);
    if (/^\d+$/.test(code)) {
      customerStateCode = code;
    }
  }
  const totalTaxPaise = Math.round(taxableAmountPaise * gstRate / 100);
  if (customerStateCode === shopStateCode) {
    const halfTax = Math.round(totalTaxPaise / 2);
    return {
      cgst: halfTax,
      sgst: totalTaxPaise - halfTax,
      // handle odd-paise division correctly
      igst: 0
    };
  } else {
    return {
      cgst: 0,
      sgst: 0,
      igst: totalTaxPaise
    };
  }
}
function getTaxableValue(lineTotalPaise, gstRate) {
  return Math.round(lineTotalPaise / (1 + gstRate / 100));
}

// packages/core/pricing.ts
function resolvePrice(product, tier) {
  const counterPrice = product.counter_price ?? 0;
  const dealerPrice = product.dealer_price ?? counterPrice;
  const distributorPrice = product.distributor_price ?? dealerPrice;
  if (tier === "DISTRIBUTOR") {
    return distributorPrice;
  } else if (tier === "DEALER") {
    return dealerPrice;
  } else {
    return counterPrice;
  }
}

// packages/core/ledger.ts
function calculateAging(customer, currentDate = /* @__PURE__ */ new Date()) {
  const buckets = { "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0, total_overdue: 0 };
  if (customer.current_balance <= 0 || !customer.credit_due_date) {
    return buckets;
  }
  const dueDate = new Date(customer.credit_due_date);
  const diffTime = currentDate.getTime() - dueDate.getTime();
  const diffDays = Math.ceil(diffTime / (1e3 * 60 * 60 * 24));
  if (diffDays <= 0) {
    return buckets;
  }
  buckets.total_overdue = customer.current_balance;
  if (diffDays <= 30) {
    buckets["0-30"] = customer.current_balance;
  } else if (diffDays <= 60) {
    buckets["31-60"] = customer.current_balance;
  } else if (diffDays <= 90) {
    buckets["61-90"] = customer.current_balance;
  } else {
    buckets["90+"] = customer.current_balance;
  }
  return buckets;
}
function isCustomerOverdue(customer, currentDate = /* @__PURE__ */ new Date()) {
  if (customer.current_balance <= 0 || !customer.credit_due_date)
    return false;
  const dueDate = new Date(customer.credit_due_date);
  return currentDate.getTime() > dueDate.getTime();
}

// packages/core/warranty.ts
function calculateWarrantyExpiry(soldAtStr, warrantyMonths) {
  if (warrantyMonths <= 0)
    return soldAtStr;
  const date = new Date(soldAtStr);
  date.setMonth(date.getMonth() + warrantyMonths);
  return date.toISOString().slice(0, 19).replace("T", " ");
}

// packages/core/sms.ts
function formatPaymentReminder(customer, shopName) {
  const amountRs = (customer.current_balance / 100).toFixed(2);
  return `Dear ${customer.name}, your Udhaar balance of Rs.${amountRs} at ${shopName} is overdue. Please settle it at the earliest.`;
}

// packages/core/intake.ts
function lookupProductBySku(skuCode, db) {
  const product = db.prepare("SELECT * FROM products WHERE sku_code = ?").get(skuCode);
  if (!product)
    return null;
  const tags = db.prepare("SELECT vehicle_tag FROM product_fitment WHERE product_id = ?").all(product.product_id).map((row) => row.vehicle_tag);
  return {
    ...product,
    fitment_tags: tags
  };
}
function addSerialToStock(productId, serialNumber, batchNumber, purchaseCost, grnId, db) {
  const existing = db.prepare("SELECT * FROM product_instances WHERE serial_number = ?").get(serialNumber);
  if (existing) {
    throw new Error(`Serial number '${serialNumber}' already exists in the system.`);
  }
  const stmt = db.prepare(`
    INSERT INTO product_instances (product_id, serial_number, status, batch_number, purchase_cost, grn_id)
    VALUES (?, ?, 'IN_STOCK', ?, ?, ?)
  `);
  const result = stmt.run(productId, serialNumber, batchNumber, purchaseCost, grnId);
  const instanceId = result.lastInsertRowid;
  return {
    instance_id: instanceId,
    product_id: productId,
    serial_number: serialNumber,
    status: "IN_STOCK",
    batch_number: batchNumber,
    purchase_cost: purchaseCost,
    grn_id: grnId
  };
}
function addLooseStock(productId, qty, db) {
  if (qty <= 0)
    throw new Error("Quantity must be greater than zero");
  const stmt = db.prepare(`
    UPDATE products 
    SET loose_qty = loose_qty + ?
    WHERE product_id = ?
  `);
  stmt.run(qty, productId);
}

// test_logic_suite.ts
var assert = __toESM(require("assert"));
var GREEN = "\x1B[32m";
var RED = "\x1B[31m";
var RESET = "\x1B[0m";
var BLUE = "\x1B[34m";
console.log(`${BLUE}--- Chauhan Electronics ERP Business Logic Test Suite ---${RESET}
`);
var results = [];
function test(name, fn) {
  try {
    fn();
    results.push({ name, status: "PASSED" });
    console.log(`${GREEN}PASS:${RESET} ${name}`);
  } catch (err) {
    results.push({ name, status: "FAILED", error: err.message });
    console.log(`${RED}FAIL:${RESET} ${name}
     -> ${err.stack}`);
  }
}
test("GST: calculateGSTSplit for intra-state (Karnataka to Karnataka)", () => {
  const split = calculateGSTSplit(1e5, 18, "29", "29ABCDE1234F1Z5");
  assert.strictEqual(split.cgst, 9e3);
  assert.strictEqual(split.sgst, 9e3);
  assert.strictEqual(split.igst, 0);
});
test("GST: calculateGSTSplit for inter-state (Karnataka to Maharashtra)", () => {
  const split = calculateGSTSplit(1e5, 18, "29", "27ABCDE1234F1Z5");
  assert.strictEqual(split.cgst, 0);
  assert.strictEqual(split.sgst, 0);
  assert.strictEqual(split.igst, 18e3);
});
test("GST: getTaxableValue reverse calculation", () => {
  const taxable = getTaxableValue(11800, 18);
  assert.strictEqual(taxable, 1e4);
});
test("Pricing: resolvePrice tier pricing", () => {
  const mockProduct = {
    product_id: 1,
    sku_code: "123456",
    brand_name: "Pioneer",
    model_name: "DMH",
    category: "Audio",
    hsn_code: "8527",
    gst_rate: 18,
    requires_serial: 1,
    warranty_months: 12,
    min_restock_level: 5,
    counter_price: 15e4,
    dealer_price: 12e4,
    distributor_price: 1e5,
    loose_qty: 0,
    created_at: ""
  };
  assert.strictEqual(resolvePrice(mockProduct, "COUNTER"), 15e4);
  assert.strictEqual(resolvePrice(mockProduct, "DEALER"), 12e4);
  assert.strictEqual(resolvePrice(mockProduct, "DISTRIBUTOR"), 1e5);
});
test("Ledger: calculateAging aging bucket 0-30 days overdue", () => {
  const mockCustomer = {
    customer_id: 1,
    name: "Dealer One",
    phone: "9876543210",
    tier: "DEALER",
    current_balance: 5e5,
    // 5000 Rs
    credit_limit: 1e6,
    credit_due_date: "2026-06-01",
    created_at: ""
  };
  const currentDate = /* @__PURE__ */ new Date("2026-06-15");
  const buckets = calculateAging(mockCustomer, currentDate);
  assert.strictEqual(buckets.total_overdue, 5e5);
  assert.strictEqual(buckets["0-30"], 5e5);
  assert.strictEqual(buckets["31-60"], 0);
  assert.strictEqual(buckets["61-90"], 0);
  assert.strictEqual(buckets["90+"], 0);
});
test("Ledger: calculateAging aging bucket 90+ days overdue", () => {
  const mockCustomer = {
    customer_id: 1,
    name: "Dealer One",
    phone: "9876543210",
    tier: "DEALER",
    current_balance: 75e4,
    // 7500 Rs
    credit_limit: 1e6,
    credit_due_date: "2026-02-01",
    created_at: ""
  };
  const currentDate = /* @__PURE__ */ new Date("2026-06-15");
  const buckets = calculateAging(mockCustomer, currentDate);
  assert.strictEqual(buckets.total_overdue, 75e4);
  assert.strictEqual(buckets["0-30"], 0);
  assert.strictEqual(buckets["90+"], 75e4);
});
test("Ledger: isCustomerOverdue status verification", () => {
  const mockCustomer = {
    customer_id: 1,
    name: "Dealer One",
    phone: "9876543210",
    tier: "DEALER",
    current_balance: 5e5,
    credit_limit: 1e6,
    credit_due_date: "2026-06-10",
    created_at: ""
  };
  assert.strictEqual(isCustomerOverdue(mockCustomer, /* @__PURE__ */ new Date("2026-06-05")), false);
  assert.strictEqual(isCustomerOverdue(mockCustomer, /* @__PURE__ */ new Date("2026-06-15")), true);
});
test("Warranty: calculateWarrantyExpiry date math", () => {
  const soldAt = "2026-01-01 12:00:00";
  const expires = calculateWarrantyExpiry(soldAt, 12);
  assert.strictEqual(expires.substring(0, 10), "2027-01-01");
});
test("SMS: formatPaymentReminder templates", () => {
  const mockCustomer = {
    customer_id: 1,
    name: "Ravi",
    phone: "9876543210",
    tier: "DEALER",
    current_balance: 25e4,
    // 2,500.00 Rs
    credit_limit: 1e6,
    credit_due_date: "2026-06-01",
    created_at: ""
  };
  const reminderMsg = formatPaymentReminder(mockCustomer, "Chauhan Electronics");
  assert.strictEqual(reminderMsg, "Dear Ravi, your Udhaar balance of Rs.2500.00 at Chauhan Electronics is overdue. Please settle it at the earliest.");
});
var MockDB = class {
  queries = [];
  prepare(sql) {
    return {
      get: (...params) => {
        this.queries.push({ sql, params });
        if (sql.includes("FROM products WHERE sku_code")) {
          if (params[0] === "123456") {
            return { product_id: 42, sku_code: "123456", brand_name: "Sony" };
          }
          return null;
        }
        if (sql.includes("SELECT * FROM product_instances WHERE serial_number")) {
          if (params[0] === "DUP-SERIAL") {
            return { instance_id: 99 };
          }
          return null;
        }
        return null;
      },
      all: (...params) => {
        this.queries.push({ sql, params });
        if (sql.includes("SELECT vehicle_tag FROM product_fitment")) {
          return [{ vehicle_tag: "Creta" }, { vehicle_tag: "Universal" }];
        }
        return [];
      },
      run: (...params) => {
        this.queries.push({ sql, params });
        return { lastInsertRowid: 101, changes: 1 };
      }
    };
  }
};
test("MockDB: lookupProductBySku fetches tags", () => {
  const db = new MockDB();
  const result = lookupProductBySku("123456", db);
  assert.ok(result);
  assert.strictEqual(result.product_id, 42);
  assert.deepStrictEqual(result.fitment_tags, ["Creta", "Universal"]);
  assert.ok(db.queries[0].sql.includes("FROM products WHERE sku_code"));
  assert.ok(db.queries[1].sql.includes("SELECT vehicle_tag FROM product_fitment"));
});
test("MockDB: addSerialToStock creates unit entry", () => {
  const db = new MockDB();
  const instance = addSerialToStock(10, "SN-XYZ-99", "B1", 15e5, 5, db);
  assert.strictEqual(instance.instance_id, 101);
  assert.strictEqual(instance.serial_number, "SN-XYZ-99");
  assert.strictEqual(instance.status, "IN_STOCK");
  const insertQuery = db.queries.find((q) => q.sql.includes("INSERT INTO product_instances"));
  assert.ok(insertQuery);
  assert.deepStrictEqual(insertQuery.params, [10, "SN-XYZ-99", "B1", 15e5, 5]);
});
test("MockDB: addSerialToStock throws on duplicate serial number", () => {
  const db = new MockDB();
  assert.throws(() => {
    addSerialToStock(10, "DUP-SERIAL", "B1", 15e5, 5, db);
  }, /already exists/);
});
test("MockDB: addLooseStock increments products loose_qty", () => {
  const db = new MockDB();
  addLooseStock(15, 50, db);
  const updateQuery = db.queries.find((q) => q.sql.includes("UPDATE products"));
  assert.ok(updateQuery);
  assert.deepStrictEqual(updateQuery.params, [50, 15]);
});
console.log("\n--- TESTING SUMMARY ---");
console.table(results.map((r) => ({ Test: r.name, Status: r.status })));
var failed = results.filter((r) => r.status === "FAILED");
if (failed.length > 0) {
  console.log(`
${RED}\u2718 Testing completed with ${failed.length} failures.${RESET}`);
  process.exit(1);
} else {
  console.log(`
${GREEN}\u2714 All business logic and mock DB integration tests passed successfully!${RESET}`);
  process.exit(0);
}
