const fs = require('fs');
let content = fs.readFileSync('apps/desktop/electron/main.ts', 'utf-8');

const replacements = [
  ['db-query', 'BACKUP_RESTORE'],
  ['db-get', 'BACKUP_RESTORE'],
  ['db-run', 'BACKUP_RESTORE'],
  ['db-transaction', 'BACKUP_RESTORE'],
  ['select-directory', 'BACKUP_RESTORE'],
  ['select-file', 'BACKUP_RESTORE'],
  ['backup-now', 'BACKUP_RESTORE'],
  ['restore-db', 'BACKUP_RESTORE'],
  ['backup-database', 'BACKUP_RESTORE'],
  ['export-csv', 'BACKUP_RESTORE'],
  ['set-db-config', 'USER_MGMT'],
  ['db-rma-resolve', 'EDIT_CATALOGUE'],
  ['create-supplier', 'CREATE_SUPPLIER'],
  ['record-expense', 'RECORD_EXPENSE']
];

for (const [channel, role] of replacements) {
  const regex = new RegExp(`ipcMain\\.handle\\('${channel}', async \\(([^)]*)\\) => \\{\\n\\s*assertCan\\(activeDesktopSession\\?\\.role, '${role}'\\);`);
  content = content.replace(regex, `handleElevated('${channel}', '${role}', async ($1) => {`);
}

fs.writeFileSync('apps/desktop/electron/main.ts', content);
console.log('Refactored main.ts successfully!');
