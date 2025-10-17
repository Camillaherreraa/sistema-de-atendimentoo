import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env['DB_HOST'],
  user: process.env['DB_USER'],
  password: process.env['DB_PASSWORD'],
  database: process.env['DB_DATABASE'],
  waitForConnections: true,
  connectionLimit: Number(process.env['DB_CONNECTION_LIMIT'] ?? 10),
  namedPlaceholders: true,
  timezone: 'Z'
});

export default pool;
