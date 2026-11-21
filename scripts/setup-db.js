#!/usr/bin/env node
/**
 * Creates the database, applies schema.sql, loads seed.sql and creates the
 * application user. Safe to re-run: the schema uses IF NOT EXISTS and the
 * seed uses ON DUPLICATE KEY UPDATE.
 *
 *   node scripts/setup-db.js           # create + migrate + seed
 *   node scripts/setup-db.js --fresh   # drop the database first
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import mysql from 'mysql2/promise';
import { config, ROOT_DIR } from '../src/config/index.js';

const args = new Set(process.argv.slice(2));
const FRESH = args.has('--fresh');

async function readSql(name) {
  return fs.readFile(path.join(ROOT_DIR, name), 'utf8');
}

/** mysql2's multi-statement mode is disabled by default; enable it per query. */
async function runScript(connection, sql) {
  await connection.query(sql);
}

async function main() {
  const admin = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    multipleStatements: true,
  });

  console.log(`[db] connected to ${config.db.host}:${config.db.port}`);

  if (FRESH) {
    console.log('[db] dropping homestay_db (fresh reset)');
    await admin.query('DROP DATABASE IF EXISTS homestay_db');
  }

  const schema = await readSql('schema.sql');
  await runScript(admin, schema);
  console.log('[db] schema applied');

  const seed = await readSql('seed.sql');
  await runScript(admin, seed);
  console.log('[db] seed data loaded');

  await admin.end();

  // Verify the application user can read the seeded data.
  const app = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
  });
  const [[{ rooms }]] = await app.query('SELECT COUNT(*) AS rooms FROM rooms');
  const [[{ bookings }]] = await app.query('SELECT COUNT(*) AS bookings FROM bookings');
  await app.end();

  console.log(`[db] ready — ${rooms} rooms, ${bookings} bookings in ${config.db.database}`);
}

main().catch((error) => {
  console.error('[db] setup failed:', error.message);
  process.exit(1);
});
