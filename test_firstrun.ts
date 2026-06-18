import assert from 'node:assert';
import Module from 'module';
import bcrypt from 'bcryptjs';
import fs from 'fs';

// ─── 1. Mock electron BEFORE importing anything (same pattern as test_security.ts) ─
const originalRequire = (Module as any).prototype.require;
const mockIpcHandlers = new Map<string, Function>();

(Module as any).prototype.require = function(request: string) {
  if (request === 'electron') {
    return {
      app: {
        get isPackaged() { return false; },
        getPath: (p: string) => '/tmp/erp-firstrun',
        on: () => {},
        whenReady: () => Promise.resolve()
      },
      ipcMain: {
        handle: (channel: string, listener: Function) => {
          mockIpcHandlers.set(channel, listener);
        },
        on: () => {}
      },
      BrowserWindow: class {
        webContents = { send: () => {} }
      }
    };
  }
  if (request === 'node-thermal-printer') {
    return {
      ThermalPrinter: class {},
      PrinterTypes: { EPSON: 1 },
      CharacterSet: { PC858_EURO: 1 }
    };
  }
  if (request.startsWith('@chauhan-erp/core/')) {
    const pkgPath = request.replace('@chauhan-erp/core/', 'packages/core/');
    return originalRequire.apply(this, [require('path').resolve(__dirname, pkgPath + '.js')]);
  }
  if (request.includes('packages/core')) {
    return originalRequire.apply(this, [require('path').resolve(__dirname, 'packages/core/index.js')]);
  }
  return originalRequire.apply(this, arguments);
};

// ─── 2. Delete stale DB file so we always start fresh ────────────────────────
// main.ts initializes a file-based DB at app.getPath('userData')/chauhan-erp.db
// We must wipe it before booting, otherwise a prior test run leaves first_run=0
const STALE_DB = '/tmp/erp-firstrun/chauhan-erp.db';
[STALE_DB, STALE_DB + '-shm', STALE_DB + '-wal'].forEach(f => {
  try { require('fs').unlinkSync(f); } catch (_) {}
});

// ─── 3. Boot main.ts — it will create + initialize the DB itself ──────────────
(process as any).resourcesPath = '/tmp/erp-firstrun';
require('./apps/desktop/electron/main');

// ─── 4. invoke helper ─────────────────────────────────────────────────────────
async function invoke(channel: string, ...args: any[]) {
  const handler = mockIpcHandlers.get(channel);
  if (!handler) throw new Error(`No IPC handler registered for: "${channel}"`);
  return handler({} as any, ...args);
}

// ─── 5. Test runner ───────────────────────────────────────────────────────────
const results: { name: string; status: string; detail?: string }[] = [];

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`PASS: ${name}`);
    results.push({ name, status: 'PASSED' });
  } catch (e: any) {
    console.log(`FAIL: ${name} — ${e.message}`);
    results.push({ name, status: 'FAILED', detail: e.message });
  }
}

// ─── 6. Tests ─────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n--- First-Run Wizard Test (owner=nishant, pin=1201) ---\n');

  await test('FR1 - check-first-run returns true on a fresh database', async () => {
    const res = await invoke('check-first-run');
    assert.strictEqual(res.firstRun, true, `Expected firstRun=true, got ${JSON.stringify(res)}`);
  });

  await test('FR2 - initialize-setup creates OWNER user and marks first_run=0', async () => {
    const salt = bcrypt.genSaltSync(10);
    const pinHash = bcrypt.hashSync('1201', salt);

    const queries = [
      { sql: "INSERT OR REPLACE INTO settings (key, value) VALUES ('first_run', '0')", params: [] },
      { sql: "INSERT OR REPLACE INTO settings (key, value) VALUES ('shop_name', ?)", params: ['Chauhan Electronics'] },
      { sql: "INSERT OR REPLACE INTO settings (key, value) VALUES ('address', ?)", params: ['12, SP Road, Bengaluru, Karnataka - 560002'] },
      { sql: "INSERT OR REPLACE INTO settings (key, value) VALUES ('gstin', ?)", params: ['29ABCDE1234F1Z5'] },
      { sql: "INSERT OR REPLACE INTO settings (key, value) VALUES ('state_code', ?)", params: ['29'] },
      { sql: "INSERT INTO users (name, pin_hash, role, active) VALUES (?, ?, 'OWNER', 1)", params: ['nishant', pinHash] },
      { sql: "INSERT OR IGNORE INTO customers (name, phone, tier, credit_limit, current_balance) VALUES ('Counter Customer', '0000000000', 'COUNTER', 0, 0)", params: [] },
    ];

    const result = await invoke('initialize-setup', queries);
    assert.ok(Array.isArray(result), 'Expected array of results from transaction');
  });

  await test('FR3 - check-first-run returns false after setup completes', async () => {
    const res = await invoke('check-first-run');
    assert.strictEqual(res.firstRun, false, `Expected firstRun=false, got ${JSON.stringify(res)}`);
  });

  await test('FR4 - initialize-setup is blocked after setup (idempotent guard)', async () => {
    let threw = false;
    try {
      await invoke('initialize-setup', []);
    } catch (e: any) {
      threw = true;
      assert.ok(e.message.includes('Setup already completed'), `Unexpected error: ${e.message}`);
    }
    assert.ok(threw, 'Expected "Setup already completed" error but none was thrown');
  });

  await test('FR5 - owner "nishant" can log in with correct PIN 1201', async () => {
    const res = await invoke('verify-desktop-pin', '1201');
    assert.strictEqual(res.success, true, `Login failed: ${res.error}`);
    assert.strictEqual(res.user.name, 'nishant', `Expected name "nishant", got "${res.user.name}"`);
    assert.strictEqual(res.user.role, 'OWNER', `Expected role OWNER, got "${res.user.role}"`);
  });

  await test('FR6 - wrong PIN 9999 is rejected', async () => {
    const res = await invoke('verify-desktop-pin', '9999');
    assert.strictEqual(res.success, false, 'Expected login failure for wrong PIN but got success');
  });

  await test('FR7 - wrong PIN 0000 is rejected', async () => {
    const res = await invoke('verify-desktop-pin', '0000');
    assert.strictEqual(res.success, false, 'Expected login failure for wrong PIN but got success');
  });

  // ─── Summary ─────────────────────────────────────────────────────────────────
  const passed = results.filter(r => r.status === 'PASSED').length;
  const failed = results.filter(r => r.status === 'FAILED').length;

  console.log('\n--- SUMMARY ---');
  results.forEach(r => console.log(`${r.status === 'PASSED' ? '✔' : '✘'} ${r.name}${r.detail ? ': ' + r.detail : ''}`));
  console.log(`\nResult: ${passed} passed, ${failed} failed.\n`);
  if (failed > 0) process.exit(1);
}

main().catch(err => { console.error(err); process.exit(1); });
