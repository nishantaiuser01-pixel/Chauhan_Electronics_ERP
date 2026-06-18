const Database = require('better-sqlite3');
const db = new Database(':memory:');
db.exec('CREATE TABLE foo (id INTEGER)');
console.log('DB works');
