// db.js
const mysql = require('mysql2');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',            // your MySQL username
  password: '',            // your MySQL password
  database: 'fuel_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Export both callback and promise APIs
module.exports = pool;
module.exports.promise = pool.promise();
