const fs = require('fs');
const file = 'apps/desktop/electron/main.ts';
let code = fs.readFileSync(file, 'utf8');

const map = {
  "db-query": "BACKUP_RESTORE",
  "db-get": "BACKUP_RESTORE",
  "db-run": "BACKUP_RESTORE",
  "db-transaction": "BACKUP_RESTORE",
  "get-db-config": "READ_DASHBOARD",
  "set-db-config": "USER_MGMT",
  "select-directory": "BACKUP_RESTORE",
  "select-file": "BACKUP_RESTORE",
  "backup-now": "BACKUP_RESTORE",
  "restore-db": "BACKUP_RESTORE",
  "get-lan-info": "READ_DASHBOARD",
  "get-customers-aging": "READ_CUSTOMERS",
  "get-customer-ledger": "READ_CUSTOMERS",
  "record-udhaar-payment": "RECORD_PAYMENT",
  "queue-sms-reminder": "RECORD_PAYMENT",
  "get-suppliers": "READ_SUPPLIERS",
  "create-supplier": "CREATE_SUPPLIER",
  "get-supplier-ledger": "READ_SUPPLIERS",
  "record-supplier-payment": "RECORD_PAYMENT",
  "commit-intake-batch": "RECEIVE_GRN",
  "get-repair-jobs": "READ_REPAIRS",
  "create-repair-job": "MANAGE_REPAIRS",
  "get-repair-parts": "READ_REPAIRS",
  "add-repair-part": "MANAGE_REPAIRS",
  "update-repair-status": "MANAGE_REPAIRS",
  "deliver-repair-job": "MANAGE_REPAIRS",
  "record-expense": "RECORD_EXPENSE",
  "get-expenses": "READ_ACCOUNTING",
  "get-eod-reconciliation": "READ_ACCOUNTING",
  "backup-database": "BACKUP_RESTORE",
  "export-csv": "BACKUP_RESTORE",
  "db-warranty-check": "READ_DASHBOARD",
  "db-return-validate": "ISSUE_CN",
  "db-return-accept": "ISSUE_CN",
  "db-rma-list": "READ_CATALOGUE",
  "db-rma-resolve": "EDIT_CATALOGUE",
  "get-print-data": "READ_DASHBOARD",
  "print-thermal": "READ_DASHBOARD",
  "log-reprint": "READ_DASHBOARD",
  "enqueue-sms": "READ_DASHBOARD",
  "send-udhaar-reminder": "READ_DASHBOARD",
  "get-sms-outbox": "READ_DASHBOARD",
  "retry-sms": "READ_DASHBOARD",
  "generate-upi-qr": "CHECKOUT",
  "build-whatsapp-link": "READ_DASHBOARD",
  "build-invoice-message": "READ_DASHBOARD",
  "build-repair-message": "READ_DASHBOARD"
};

for (const [channel, action] of Object.entries(map)) {
  const regex = new RegExp(`ipcMain\\.handle\\('${channel}',\\s*(async\\s*)?\\(([^)]*)\\)\\s*=>\\s*\\{`, 'g');
  code = code.replace(regex, `ipcMain.handle('${channel}', $1($2) => {\n  assertCan(activeDesktopSession?.role, '${action}');`);
}

fs.writeFileSync(file, code);
console.log('Injection done');
