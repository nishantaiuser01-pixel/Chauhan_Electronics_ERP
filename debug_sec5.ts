import { createApiServer } from './apps/desktop/electron/api';
import { getDB, initDB } from './packages/core/db';
import { authorize } from './packages/core/permissions';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as http from 'http';

function mockRequest(app: any, method: string, url: string, headers: any = {}, body: any = null): Promise<{status: number, body: any}> {
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const port = (server.address() as any).port;
      const req = http.request({
        hostname: '127.0.0.1',
        port,
        path: url,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          server.close();
          let parsed;
          try { parsed = JSON.parse(data); } catch { parsed = data; }
          resolve({ status: res.statusCode || 500, body: parsed });
        });
      });
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  });
}

const sessionStore = new Map();
const dbPath = '/tmp/erp/debug-erp.db';
const schema = fs.readFileSync('./packages/core/schema.sql', 'utf8');
initDB(dbPath, schema);
const db = getDB();

const appDev = createApiServer({
  getDB: () => getDB(),
  sessionStore,
  isPackaged: false
});

async function run() {
  db.prepare('DELETE FROM users').run();
  const newOwnerId = db.prepare(`INSERT INTO users (name, role, pin_hash) VALUES ('Sec5 Owner', 'OWNER', ?)`).run(bcrypt.hashSync('5555', 10)).lastInsertRowid;
  const newCashierId = db.prepare(`INSERT INTO users (name, role, pin_hash) VALUES ('Sec5 Cashier', 'CASHIER', ?)`).run(bcrypt.hashSync('6666', 10)).lastInsertRowid;
  
  const rOwnerLogin = await mockRequest(appDev, 'POST', '/api/auth/login', {}, { pin: '5555' });
  console.log('Owner login:', rOwnerLogin.body);
  const oToken = rOwnerLogin.body.token;
  
  const rCashierLogin = await mockRequest(appDev, 'POST', '/api/auth/login', {}, { pin: '6666' });
  console.log('Cashier login:', rCashierLogin.body);
  const cToken = rCashierLogin.body.token;
  
  const rDevCashier = await mockRequest(appDev, 'POST', '/api/dev/ipc', { authorization: `Bearer ${cToken}` }, { channel: 'get-db-config' });
  console.log('Cashier dev ipc:', rDevCashier.status, rDevCashier.body);
}

run();
