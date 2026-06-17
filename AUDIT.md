# AUDIT.md — Chauhan Electronics ERP
**Read-only audit. No code was changed.**
**Audited:** `/Users/nishantsingh/Chauhan_Electronics_ERP_Draft`

---

## 0. STUB / SMELL SCAN

| File | Line | Smell |
|---|---|---|
| `src/views/Returns.tsx` | 55 | `user_id: 1 // TODO: from active auth` — hardcoded |
| `src/views/Dashboard.tsx` | 71 | `// Fetch audit logs or mock/actual log entries` — incomplete |
| `src/main.tsx` | 7 | `Injecting browser-to-express IPC mock` — dev mock, production risk |
| `electron/main.ts` | 1505–1509 | `print-thermal` IPC only does `console.log` — no real printer driver |
| `PrintView.tsx` | 107–110 | Per-line GST uses `default_gst_rate` fallback; comment: "Read from item in a real scenario" |
| `PrintView.tsx` | 38 | `numToWords` returns `"Rupees 5000.00"` not proper words |
| `electron/main.ts` | 1201–1213 | Comment: "For loose items… We'll ignore loose COGS for now or use 0" |
| `index.html` | 11–74 | Full mock electronAPI injected as test scaffold — left in source |
| `electron/main.ts` | 1595 | `const success = true` — SMS delivery always mocked successful |

---

## 1. GROUND TRUTH LISTS

### 1a. SQLite Tables (`packages/core/schema.sql`)

| Table | Col Count | Notes |
|---|---|---|
| settings | 2 | key, value |
| users | 5 | PIN bcrypt; roles: OWNER/CASHIER/STOCK/TECHNICIAN |
| audit_log | 7 | |
| customers | 10 | credit_limit, current_balance in INTEGER paise |
| customer_ledger | 8 | type: SALE/PAYMENT/ADJUSTMENT/RETURN |
| suppliers | 6 | current_payable in paise |
| products | 15 | counter/dealer/distributor_price in paise; requires_serial flag |
| product_fitment | 3 | vehicle_tag indexed |
| product_instances | 10 | purchase_cost in paise; warranty_expires_at |
| grn | 6 | total_cost in paise |
| sales | 15 | cgst/sgst/igst separate columns |
| sale_items | 7 | unit_price, line_total in paise |
| credit_notes | 7 | amount in paise |
| rma_register | 8 | status: SENT/REPLACED/CREDITED/RECEIVED_BACK |
| repair_jobs | 20 | parts_cost, labour_cost, advance_paid, final_cost in paise |
| repair_parts | 6 | |
| repair_status_history | 5 | |
| sms_outbox | 7 | retry_count present in schema.sql but MISSING in main.ts hardcoded fallback |
| expenses | 5 | |

**All 19 required tables exist. No missing tables.**

### 1b. Express Routes (Port **47615** — NOT 3005)

| Method | Path | Auth |
|---|---|---|
| GET | `/api/ping` | ❌ None |
| GET | `/api/health` | ❌ None |
| POST | `/api/auth/login` | ❌ None (is the auth endpoint) |
| GET | `/api/products/:sku` | ❌ None |
| GET | `/api/products/lookup/:sku` | ❌ None |
| POST | `/api/cart/push` | ❌ None |
| GET | `/api/customers/lookup/:phone` | ❌ None |
| POST | `/api/customers` | ❌ None |
| GET | `/api/customers/:id/ledger` | ❌ None |
| POST | `/api/customers/:id/payment` | ❌ None |
| GET | `/api/sales/invoice/:invoice_no` | ❌ None |
| POST | `/api/sales/checkout` | ❌ None |
| POST | `/api/dev/ipc` | ❌ None — **exposes raw SQL to entire LAN** |
| GET | `/api/warranty/:serial` | ❌ None |
| POST | `/api/returns/validate` | ❌ None |
| POST | `/api/returns/accept` | ❌ None |

**0 out of 16 routes have any auth check.**

### 1c. IPC Channels (ipcMain.handle — 42 total)

`db-query`, `db-get`, `db-run`, `db-transaction`, `get-db-config`, `set-db-config`, `select-directory`, `select-file`, `backup-now`, `restore-db`, `get-lan-info`, `get-customers-aging`, `get-customer-ledger`, `record-udhaar-payment`, `queue-sms-reminder`, `get-suppliers`, `create-supplier`, `get-supplier-ledger`, `record-supplier-payment`, `commit-intake-batch`, `get-repair-jobs`, `create-repair-job`, `get-repair-parts`, `add-repair-part`, `update-repair-status`, `deliver-repair-job`, `record-expense`, `get-expenses`, `get-eod-reconciliation`, `backup-database`, `export-csv`, `db-warranty-check`, `db-return-validate`, `db-return-accept`, `db-rma-list`, `db-rma-resolve`, `get-print-data`, `print-thermal`, `log-reprint`, `enqueue-sms`, `send-udhaar-reminder`, `get-sms-outbox`, `retry-sms`

**0 of 42 IPC handlers check role or PIN.**

### 1d. Desktop Renderer Views (14 total)

`Dashboard`, `Sales (F2)`, `StockIn (F3)`, `Catalogue`, `Settings (F5)`, `Customers (F7)`, `Suppliers (F8)`, `Repairs (F9)`, `Accounting (F10)`, `Warranty (F11)`, `Returns (F12)`, `RMARegister`, `Outbox`, `PrintView`

### 1e. Mobile App Views (2 total)

`Config.tsx` (LAN pairing), `Scanner.tsx` (barcode scan + cart beam)

### 1f. Stack Versions

| Package | Version |
|---|---|
| Electron | ^30.0.1 |
| React | ^18.2.0 |
| Vite (desktop) | ^5.1.4 |
| Vite (mobile) | ^8.0.12 |
| TypeScript (desktop) | ^5.3.3 |
| TypeScript (mobile) | ~6.0.2 |
| @capacitor/core | ^8.4.0 |
| @capacitor/android | ^8.4.0 |
| @capacitor-community/barcode-scanner | ^4.0.1 |
| esbuild | ^0.20.1 |
| electron-builder | ^24.13.3 |

---

## 2. CHECKLIST

### A. Architecture & Infrastructure

| Item | Status | Evidence | Note |
|---|---|---|---|
| Monorepo: packages/core, apps/desktop, apps/mobile | ✅ DONE | All 3 dirs present | `packages/ui` exists but is empty |
| better-sqlite3 + WAL + transactions | ✅ DONE | `schema.sql:2`; `db.transaction()` used for all mutations | |
| electron-builder `.exe` / `.dmg` | 🟡 PARTIAL | `package.json` has `mac: dmg`, `win: nsis` configs | No built artifact confirmed |
| Capacitor Android APK | 🟡 PARTIAL | `build:android` script + `android/` dir present | APK not confirmed; Java env issues in prior sessions |

### B. Database Schema

| Item | Status | Evidence |
|---|---|---|
| All 19 tables exist | ✅ DONE | All in `schema.sql` |
| Monetary columns INTEGER paise | ✅ DONE | `credit_limit INTEGER -- paise`; `counter_price INTEGER` etc. |
| `retry_count` in hardcoded fallback | ❌ MISSING | `schema.sql:184` has it; `main.ts:63` fallback string omits it |

### C. Catalogue

| Item | Status | Evidence |
|---|---|---|
| Product CRUD | ✅ DONE | `Catalogue.tsx:handleSaveProduct`, `handleDeleteProduct` |
| Serialized vs loose flag | ✅ DONE | `requires_serial` toggle in form; affects stock count display |
| HSN code | ✅ DONE | Field in form, stored in DB |
| Per-product GST rate | ✅ DONE | Select 5/12/18/28%; stored in `products.gst_rate` |
| Three tier prices | ✅ DONE | counter/dealer/distributor price fields |
| Fitment tags stored | ✅ DONE | `product_fitment` table; batch insert via `db-transaction` |

### D. Stock In

| Item | Status | Evidence |
|---|---|---|
| Scan loop | ✅ DONE | `StockIn.tsx` barcode input |
| Duplicate serial prevention | ✅ DONE | `UNIQUE` constraint on `serial_number`; INSERT throws on duplicate |
| GRN + supplier link | ✅ DONE | `commit-intake-batch` creates GRN, links supplier, increments payable |
| Thermal label for non-barcoded | ❌ MISSING | No label print path in StockIn; `print-thermal` is console.log stub |

### E. POS / Checkout

| Item | Status | Evidence |
|---|---|---|
| Scan SKU + serial into cart | ✅ DONE | `Sales.tsx` scan → product lookup → serial picker modal |
| Tier price auto-resolve | ✅ DONE | `Sales.tsx` reads `activeCustomer.tier` → selects correct price column |
| CGST/SGST vs IGST split | ✅ DONE | `main.ts:331–364` compares customer GSTIN state prefix to shop state |
| Cash/UPI/Udhaar modes | ✅ DONE | `paymentMode` state; Udhaar checks credit limit + due date |
| Atomic checkout transaction | ✅ DONE | `main.ts:366` single `db.transaction()` — serials flipped, warranty frozen, ledger written, invoice seq incremented |

### F. Fitment Search Screen

| Item | Status | Evidence |
|---|---|---|
| Dedicated screen: type vehicle → matching products | ❌ MISSING | No `Fitment.tsx` or nav route. Tags are client-side searchable inside Catalogue list only — not a standalone screen |

### G. Warranty Checker

| Item | Status | Evidence |
|---|---|---|
| Scan serial → full warranty readout | ✅ DONE | `Warranty.tsx` + `db-warranty-check` IPC (`main.ts:1301`) |

### H. Returns / RMA / Credit Notes

| Item | Status | Evidence |
|---|---|---|
| 3 validate outcomes | ✅ DONE | `db-return-validate`: REJECT_UNKNOWN / REJECT_NEVER_SOLD / ALLOW |
| Credit notes issued | ✅ DONE | Auto-numbered CN-xxx; inserted to `credit_notes` |
| Ledger reversal on Udhaar returns | ✅ DONE | `main.ts:1392–1399` — balance reduced, RETURN ledger row inserted |
| Replacement serial swap | ✅ DONE | `main.ts:1400–1416` |
| rma_register | ✅ DONE | SEND_TO_COMPANY path inserts to rma_register |
| Defective → RMA_RETURNED (not auto-restocked) | ✅ DONE | Default `newStatus='RMA_RETURNED'`; only sealed CREDIT_NOTE path restocks |

### I. Customers

| Item | Status | Evidence |
|---|---|---|
| CRUD | 🟡 PARTIAL | Create + list + payment done. No Edit or Delete UI in `Customers.tsx` |
| Aging buckets | ✅ DONE | `calculateAging` in `packages/core/ledger.ts`; used in IPC |
| Overdue red flag | ✅ DONE | `Customers.tsx` renders red badge when overdue |
| Payment-receipt flow + PAYMENT ledger row | ✅ DONE | `record-udhaar-payment` IPC |

### J. Suppliers

| Item | Status | Evidence |
|---|---|---|
| CRUD | 🟡 PARTIAL | Create + list done. No Edit or Delete UI |
| Payables tracking | ✅ DONE | `current_payable` incremented on GRN |
| GRN linkage | ✅ DONE | `main.ts:975–978` |
| Payables ledger | 🟡 PARTIAL | No dedicated ledger table; reconstructed from `expenses` with category `SUPPLIER_PAYMENT` |

### K. Repairs

| Item | Status | Evidence |
|---|---|---|
| Status pipeline | ✅ DONE | `repair_jobs.status` CHECK + `update-repair-status` IPC |
| JOB-XXXX numbering | ✅ DONE | Auto-generated from settings sequence |
| Advance deposit | ✅ DONE | `advance_paid` column captured on intake |
| Parts consumption deducts stock + adds to bill | ✅ DONE | `add-repair-part` IPC (`main.ts:1062`) |
| Warranty vs paid | ✅ DONE | `is_warranty` column |

### L. Auto-SMS

| Item | Status | Evidence |
|---|---|---|
| sms_outbox table | ✅ DONE | `schema.sql:179` |
| Trigger on repair status change | ✅ DONE | `update-repair-status` calls `enqueueSms` only when status actually changes |
| Trigger on payment | ✅ DONE | `Sales.tsx` + `Customers.tsx` call `enqueue-sms` |
| Trigger on overdue reminder | ✅ DONE | `send-udhaar-reminder` IPC |
| Offline queue + flush when online | 🟡 PARTIAL | `setInterval` 30s worker exists; stub success; no real gateway; no online-detection |
| Provider stub | ✅ DONE | `main.ts:1595` `const success = true` |
| Editable templates in settings | ✅ DONE | `Settings.tsx` SMS template textareas |
| One-message-per-status-change dedupe | ✅ DONE | Status change guard in `update-repair-status` |

### M. Accounting

| Item | Status | Evidence |
|---|---|---|
| Expense day-book | ✅ DONE | `Accounting.tsx` + `record-expense` IPC |
| EOD cash reconciliation | ✅ DONE | `get-eod-reconciliation` IPC aggregates sales + udhaar + expenses + COGS |
| COGS for loose items | ❌ MISSING | `main.ts:1213` explicitly excludes loose COGS |
| Sales summaries by month/category/brand/tier | ❌ MISSING | Only single-date EOD; no dimensional breakdown |
| Low-stock reorder list | 🟡 PARTIAL | Catalogue shows red badge; no dedicated report screen |
| Dead/slow movers | ❌ MISSING | No report |
| Stock valuation | ❌ MISSING | No report |
| GSTR-1 GST summary | ❌ MISSING | No report |
| Excel/PDF report export | ❌ MISSING | Only raw CSV table dump (`export-csv` IPC) |

### N. Roles / Permissions / Audit

| Item | Status | Evidence |
|---|---|---|
| PIN login | ✅ DONE | Wizard creates bcrypt owner PIN; `/api/auth/login` validates |
| Role schema | ✅ DONE | `users.role` CHECK (OWNER/CASHIER/STOCK/TECHNICIAN) |
| Permission checks server-side (IPC + Express) | ❌ MISSING | **Zero IPC handlers or Express routes check role/PIN.** `user_id: 1` hardcoded in Returns.tsx |
| audit_log written on sensitive actions | 🟡 PARTIAL | Checkout, reprint, product CRUD, return-accept log. Repair updates, payments do NOT log |
| Lock screen / auto-logout | ❌ MISSING | No lock screen component or idle timer anywhere |

### O. LAN API Security

| Item | Status | Evidence |
|---|---|---|
| Every :47615 route behind auth | ❌ MISSING | **0/16 routes authenticated.** `/api/dev/ipc` accepts raw `db-run` / `db-transaction` SQL from any LAN device — critical vulnerability |

### P. Reports / Analytics

| Item | Status | Evidence |
|---|---|---|
| Profit margin via purchase_cost | 🟡 PARTIAL | EOD uses purchase_cost for serialized only; loose = 0 |
| Sales summaries by dimension | ❌ MISSING | None |
| Low-stock reorder list | 🟡 PARTIAL | Catalogue badge only |
| Dead/slow movers | ❌ MISSING | None |
| Stock valuation | ❌ MISSING | None |
| GSTR-1 GST summary | ❌ MISSING | None |
| Excel/PDF export | ❌ MISSING | CSV raw dump only |

### Q. Printing

| Item | Status | Evidence |
|---|---|---|
| Thermal ESC/POS receipt | 🟡 PARTIAL | `printUtils.ts` generates text correctly; `print-thermal` IPC is `console.log` stub — no driver |
| A4 GST tax invoice | 🟡 PARTIAL | `PrintView.tsx` renders layout; per-line GST rate ignored; `numToWords` is stub; CGST/SGST always shown regardless of state |
| Reprint DUPLICATE watermark | ✅ DONE | `PrintView.tsx:50` |
| Single print component for sale + credit note + repair | 🟡 PARTIAL | SALE + CREDIT_NOTE handled; **repair bill printing absent** |

### R. Data Portability

| Item | Status | Evidence |
|---|---|---|
| CSV export: sales/customers/products | ✅ DONE | `export-csv` IPC whitelist includes: sales, customers, products, repair_jobs, suppliers, expenses |

### S. Backups

| Item | Status | Evidence |
|---|---|---|
| SQLite backup API | ✅ DONE | `backup-database` uses `db.backup()`; `backup-now` uses `fs.copyFileSync` |
| Manual backup | ✅ DONE | Settings button → save dialog |
| Scheduled/automatic backup | ❌ MISSING | No interval or cron; manual only |
| Restore path | ✅ DONE | `restore-db` IPC: integrity check + safety snapshot before overwrite |

### T. Mobile App

| Item | Status | Evidence |
|---|---|---|
| LAN pairing / IP config | ✅ DONE | `Config.tsx` saves IP to localStorage; pings `/api/health` |
| Camera barcode scan | ✅ DONE | `@capacitor-community/barcode-scanner` in `Scanner.tsx` |
| Beam to desk cart handoff | ✅ DONE | POST `/api/cart/push` → mainWindow broadcasts `mobile-cart-received` |
| No local DB on mobile | ✅ DONE | No SQLite / IndexedDB; all data via LAN API |

### U. Packaging

| Item | Status | Evidence |
|---|---|---|
| Desktop installer configured | 🟡 PARTIAL | electron-builder in package.json; no confirmed build artifact |
| Android APK | 🟡 PARTIAL | `build:android` script + `android/` dir; APK not confirmed |

---

## 3. SPEC DISCREPANCIES

| Spec Assumption | Actual |
|---|---|
| Express LAN API on **port 3005** | **Port 47615** (`main.ts:79`) |
| Money as INTEGER paise | ✅ Correct |
| Offline Electron + React desktop | ✅ Correct |
| better-sqlite3 single source of truth | ✅ Correct |
| Capacitor Android thin client, no local DB | ✅ Correct |

---

## 4. GAP TABLE — Ranked by Live-Shop Impact

| Priority | Item | Status | What closes it |
|---|---|---|---|
| 🔴 1 | **All 16 LAN routes unauthenticated** | ❌ | Add Bearer token middleware; issue token at pairing; mobile attaches token |
| 🔴 2 | **All 42 IPC handlers no role check** | ❌ | Store active session in main process; gate sensitive handlers by role |
| 🔴 3 | **`/api/dev/ipc` raw SQL on LAN** | ❌ | Remove or guard with `app.isPackaged` check |
| 🔴 4 | **Lock screen / auto-logout** | ❌ | Idle timer + PIN modal overlay in App.tsx |
| 🟠 5 | **Thermal printer: console.log stub only** | 🟡 | Implement node-escpos or raw USB/serial send in `print-thermal` |
| 🟠 6 | **Repair bill printing absent** | ❌ | Add `REPAIR` branch to `get-print-data` + `PrintView.tsx` |
| 🟠 7 | **PrintView: per-line GST wrong; numToWords stub** | 🟡 | Read `gst_rate` from product JOIN; implement Indian number-to-words |
| 🟠 8 | **GSTR-1 GST summary report** | ❌ | New screen aggregating cgst/sgst/igst by HSN + period |
| 🟠 9 | **Sales analytics (month/category/brand/tier)** | ❌ | New reporting screen with parameterized IPC queries |
| 🟡 10 | **Fitment search screen** | ❌ | New view querying `product_fitment` by vehicle_tag; ~2h |
| 🟡 11 | **Scheduled automatic backups** | ❌ | `setInterval` in main.ts calling existing `performBackup()` |
| 🟡 12 | **Customer Edit/Delete UI** | 🟡 | Add edit modal + IPC run to `Customers.tsx` |
| 🟡 13 | **Supplier Edit/Delete UI** | 🟡 | Same pattern as Catalogue |
| 🟡 14 | **Thermal label printing for Stock In** | ❌ | Print path + real driver in StockIn view |
| 🟡 15 | **Loose item COGS excluded from P&L** | 🟡 | Schema change to track loose purchase cost per sale_item |
| 🟡 16 | **Stock valuation report** | ❌ | `SUM(purchase_cost)` by product for IN_STOCK instances |
| 🟡 17 | **Dead/slow movers report** | ❌ | Products with 0 sales in N days query |
| 🟡 18 | **Android APK unconfirmed** | 🟡 | Resolve Java/Gradle env; run `build:android` |
| 🟡 19 | **audit_log gaps: repairs + payments** | 🟡 | Add `audit_log` inserts in `update-repair-status` and `record-udhaar-payment` |
| ⚪ 20 | **`retry_count` missing from main.ts hardcoded fallback** | 🟡 | Append column to fallback string at `main.ts:63` |

---
*AUDIT.md — Generated from direct source-file inspection. No README text or memory used.*
