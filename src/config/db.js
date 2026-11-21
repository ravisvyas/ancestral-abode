import mysql from 'mysql2/promise';
import { config } from './index.js';

/**
 * A single shared connection pool. Overlapping date ranges are NOT allowed to
 * double-book a room, so every write path that touches inventory runs inside a
 * transaction with the appropriate row locks (SELECT ... FOR UPDATE).
 */
export const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  waitForConnections: true,
  connectionLimit: config.db.connectionLimit,
  queueLimit: 0,
  charset: 'utf8mb4_unicode_ci',
  timezone: 'Z',
  dateStrings: ['DATE'],
  namedPlaceholders: false,
});

/** Run a query and return the rows. */
export async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

/** Run a query and return the first row (or null). */
export async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows.length ? rows[0] : null;
}

/**
 * Execute `work` inside a transaction, committing on success and rolling
 * back on any thrown error. The connection is always released.
 */
export async function withTransaction(work) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    try {
      await connection.rollback();
    } catch {
      /* the connection is already unusable; the pool will discard it */
    }
    throw error;
  } finally {
    connection.release();
  }
}

/** Verify the database is reachable; used on boot and by the health endpoint. */
export async function pingDatabase() {
  const row = await queryOne('SELECT 1 AS ok');
  return row?.ok === 1;
}

export async function closePool() {
  await pool.end();
}
